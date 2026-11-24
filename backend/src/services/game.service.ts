import mongoose, { type Types } from 'mongoose';
import { GameSession, type IGameSession, type GameSessionStatus } from '../models/GameSession.js';
import { PlayerAnswer, type IPlayerAnswer } from '../models/PlayerAnswer.js';
import { Competition, type ICompetition } from '../models/Competition.js';
import { CompetitionRegistration } from '../models/CompetitionRegistration.js';
import { Team, type ITeam } from '../models/Team.js';
import { TeamMember } from '../models/TeamMember.js';
import { Question, type IQuestion } from '../models/Question.js';
import { CompetitionQuestion } from '../models/CompetitionQuestion.js';
import { calculateMultipleCorrectScore } from './question.service.js';
import { recordSessionResults } from './result.service.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

/** Grace latency period in milliseconds for server deadline checks */
export const LATENCY_GRACE_MS = 1500;

export async function getOrCreateSession(
  competitionId: string,
  teamId: string,
  userId: string
): Promise<IGameSession> {
  // 1. Verify user is in the team
  const membership = await TeamMember.findOne({ teamId, userId });
  if (!membership) {
    throw AppError.forbidden('You are not a member of this team.');
  }

  // 2. Verify competition
  const competition = await Competition.findById(competitionId);
  if (!competition) {
    throw AppError.notFound('Competition not found.');
  }

  if (competition.status !== 'Live') {
    throw AppError.badRequest(`Competition is not currently Live (Status: ${competition.status}).`);
  }

  // 3. Verify team registration
  const registration = await CompetitionRegistration.findOne({
    competitionId,
    teamId,
    status: 'confirmed',
  });
  if (!registration) {
    throw AppError.badRequest('Team is not registered for this competition.');
  }

  // 4. Verify member limit
  const memberCount = await TeamMember.countDocuments({ teamId });
  if (memberCount !== competition.allowedTeamSize) {
    throw AppError.badRequest(
      `Team must have exactly ${competition.allowedTeamSize} members to participate (Current: ${memberCount}).`
    );
  }

  // 5. Check existing GameSession
  const existingSession = await GameSession.findOne({ competitionId, teamId });
  if (existingSession) {
    if (existingSession.status === 'finished') {
      throw AppError.badRequest('This game is no longer available.');
    }
    return existingSession;
  }

  // 6. Select Questions for the session
  let questionIds: Types.ObjectId[] = [];

  // Try competition fixed questions first
  const compQuestions = await CompetitionQuestion.find({ competitionId })
    .sort({ order: 1 })
    .lean();

  if (compQuestions.length > 0) {
    questionIds = compQuestions.map((cq) => cq.questionId as Types.ObjectId);
  } else {
    // Pick questions matching category
    const available = await Question.find({
      educationLevel: competition.category,
      status: 'published',
    })
      .limit(competition.numberOfQuestions || 10)
      .select('_id')
      .lean();

    questionIds = available.map((q) => q._id as Types.ObjectId);
  }

  if (questionIds.length === 0) {
    throw AppError.badRequest('No published questions are available for this competition category.');
  }

  // 7. Create Session
  const session = await GameSession.create({
    competitionId,
    teamId,
    status: 'waiting',
    currentQuestionIndex: 0,
    questionIds,
    connectedPlayers: [userId],
    readyPlayers: [],
  });

  return session;
}

export async function getSession(sessionId: string, userId: string) {
  const session = await GameSession.findById(sessionId)
    .populate<{ competitionId: ICompetition }>('competitionId')
    .populate<{ teamId: ITeam }>('teamId');

  if (!session) {
    throw AppError.notFound('Game session not found.');
  }

  const membership = await TeamMember.findOne({
    teamId: session.teamId._id,
    userId,
  });

  if (!membership) {
    throw AppError.forbidden('You are not authorized to view this game session.');
  }

  // Get all members of the team
  const members = await TeamMember.find({ teamId: session.teamId._id })
    .populate<{ userId: { _id: Types.ObjectId; name: string; avatar?: string } }>('userId', 'name avatar')
    .lean();

  return {
    session,
    membership,
    members: members.map((m) => ({
      userId: m.userId._id.toString(),
      name: m.userId.name,
      avatar: m.userId.avatar,
      role: m.role,
    })),
  };
}

export async function startSession(sessionId: string, userId: string): Promise<IGameSession> {
  const session = await GameSession.findById(sessionId);
  if (!session) {
    throw AppError.notFound('Game session not found.');
  }

  if (session.status !== 'waiting') {
    throw AppError.badRequest(`Cannot start game in status: ${session.status}`);
  }

  // Only the leader can start
  const membership = await TeamMember.findOne({
    teamId: session.teamId,
    userId,
    role: 'leader',
  });

  if (!membership) {
    throw AppError.forbidden('Only the team leader can start the tournament.');
  }

  session.status = 'starting';
  session.startedAt = new Date();
  await session.save();

  return session;
}

export async function advanceToQuestion(
  sessionId: string,
  questionIndex: number
): Promise<{
  session: IGameSession;
  question: IQuestion;
  timeLimit: number;
  deadline: Date;
}> {
  const session = await GameSession.findById(sessionId);
  if (!session) {
    throw AppError.notFound('Game session not found.');
  }

  if (questionIndex >= session.questionIds.length) {
    throw AppError.badRequest('Question index out of bounds.');
  }

  const questionId = session.questionIds[questionIndex];
  // Note: we do NOT select correctAnswers or explanation for client!
  const question = await Question.findById(questionId);
  if (!question) {
    throw AppError.notFound('Question not found.');
  }

  // Check for competition override
  const compQuestion = await CompetitionQuestion.findOne({
    competitionId: session.competitionId,
    questionId,
  });

  const timeLimit = compQuestion?.timeLimitOverride || question.timeLimit || 30;
  const now = new Date();
  const deadline = new Date(now.getTime() + timeLimit * 1000);

  session.currentQuestionIndex = questionIndex;
  session.status = 'question_active';
  session.questionStartedAt = now;
  session.questionDeadline = deadline;
  await session.save();

  return {
    session,
    question,
    timeLimit,
    deadline,
  };
}

export async function submitAnswer(
  sessionId: string,
  userId: string,
  questionId: string,
  selectedOptions: string[]
): Promise<{
  answer: IPlayerAnswer;
  allPlayersAnswered: boolean;
}> {
  const session = await GameSession.findById(sessionId);
  if (!session) {
    throw AppError.notFound('Game session not found.');
  }

  if (session.status !== 'question_active') {
    throw AppError.badRequest('Question is not currently active for answers.');
  }

  const currentQId = session.questionIds[session.currentQuestionIndex]?.toString();
  if (currentQId !== questionId) {
    throw AppError.badRequest('Question ID does not match current active question.');
  }

  // Check if answer already submitted
  const existing = await PlayerAnswer.findOne({
    gameSessionId: session._id,
    userId,
    questionId,
  });

  if (existing) {
    throw AppError.badRequest('You have already submitted an answer for this question.');
  }

  const now = new Date();
  const deadlineMs = session.questionDeadline ? session.questionDeadline.getTime() : 0;
  const isLate = now.getTime() > deadlineMs + LATENCY_GRACE_MS;

  if (isLate) {
    throw AppError.badRequest('Time limit exceeded. Your answer could not be accepted.');
  }

  // Fetch question with correct answers
  const question = await Question.findById(questionId).select('+correctAnswers +explanation');
  if (!question) {
    throw AppError.notFound('Question not found.');
  }

  // Fetch competition scoring
  const competition = await Competition.findById(session.competitionId);
  const scoringConfig = competition?.scoringConfig || {
    basePoints: 100,
    speedBonusMax: 50,
    penaltyWrong: 0,
  };

  const startedAtMs = session.questionStartedAt ? session.questionStartedAt.getTime() : now.getTime();
  const timeTakenSeconds = Math.max(0.1, Number(((now.getTime() - startedAtMs) / 1000).toFixed(2)));

  // Calculate score & correctness
  let isCorrect = false;
  let scoreAwarded = 0;
  let speedBonusAwarded = 0;

  if (question.type === 'multiple_correct') {
    const rawScore = calculateMultipleCorrectScore(
      selectedOptions,
      question.correctAnswers,
      question.points || scoringConfig.basePoints,
      false, // all or nothing
      scoringConfig.penaltyWrong
    );
    isCorrect = rawScore > 0;
    scoreAwarded = rawScore;
  } else {
    // Single choice, true/false, image question
    const correctAns = question.correctAnswers[0];
    isCorrect = selectedOptions.length === 1 && selectedOptions[0] === correctAns;
    if (isCorrect) {
      scoreAwarded = question.points || scoringConfig.basePoints;
    } else {
      scoreAwarded = scoringConfig.penaltyWrong || 0;
    }
  }

  // Calculate speed bonus if correct
  if (isCorrect && scoringConfig.speedBonusMax > 0 && question.timeLimit > 0) {
    const timeRatio = Math.max(0, (question.timeLimit - timeTakenSeconds) / question.timeLimit);
    speedBonusAwarded = Math.round(scoringConfig.speedBonusMax * timeRatio);
    scoreAwarded += speedBonusAwarded;
  }

  const answer = await PlayerAnswer.create({
    gameSessionId: session._id,
    userId,
    questionId,
    selectedOptions,
    submittedAt: now,
    timeTakenSeconds,
    isCorrect,
    scoreAwarded,
    speedBonusAwarded,
    isLate,
  });

  // Check if all team members answered
  const teamMemberCount = await TeamMember.countDocuments({ teamId: session.teamId });
  const totalAnswers = await PlayerAnswer.countDocuments({
    gameSessionId: session._id,
    questionId,
  });

  const allPlayersAnswered = totalAnswers >= teamMemberCount;

  return {
    answer,
    allPlayersAnswered,
  };
}

export async function closeCurrentQuestion(sessionId: string): Promise<{
  session: IGameSession;
  question: IQuestion;
  correctAnswers: string[];
  explanation?: string;
  playerAnswers: Array<{
    userId: string;
    selectedOptions: string[];
    isCorrect: boolean;
    scoreAwarded: number;
    speedBonusAwarded: number;
    timeTakenSeconds: number;
  }>;
  teamScoreSoFar: number;
  isLastQuestion: boolean;
}> {
  const session = await GameSession.findById(sessionId);
  if (!session) {
    throw AppError.notFound('Game session not found.');
  }

  session.status = 'question_closed';
  await session.save();

  const currentQId = session.questionIds[session.currentQuestionIndex];
  const question = await Question.findById(currentQId).select('+correctAnswers +explanation');
  if (!question) {
    throw AppError.notFound('Question not found.');
  }

  const answers = await PlayerAnswer.find({
    gameSessionId: session._id,
    questionId: currentQId,
  }).lean();

  const allSessionAnswers = await PlayerAnswer.find({
    gameSessionId: session._id,
  }).lean();

  const teamScoreSoFar = allSessionAnswers.reduce((sum, a) => sum + (a.scoreAwarded || 0), 0);
  const isLastQuestion = session.currentQuestionIndex + 1 >= session.questionIds.length;

  return {
    session,
    question,
    correctAnswers: question.correctAnswers,
    explanation: question.explanation,
    playerAnswers: answers.map((a) => ({
      userId: a.userId.toString(),
      selectedOptions: a.selectedOptions,
      isCorrect: a.isCorrect,
      scoreAwarded: a.scoreAwarded,
      speedBonusAwarded: a.speedBonusAwarded,
      timeTakenSeconds: a.timeTakenSeconds,
    })),
    teamScoreSoFar,
    isLastQuestion,
  };
}

export async function finishSession(sessionId: string): Promise<{
  session: IGameSession;
  totalScore: number;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
}> {
  const session = await GameSession.findById(sessionId);
  if (!session) {
    throw AppError.notFound('Game session not found.');
  }

  session.status = 'finished';
  session.finishedAt = new Date();
  const startMs = session.startedAt ? session.startedAt.getTime() : session.createdAt.getTime();
  const durationSeconds = Math.max(1, Math.round((session.finishedAt.getTime() - startMs) / 1000));
  session.totalDurationSeconds = durationSeconds;
  await session.save();

  // Persist official Result & PlayerResult records and recompute tournament ranks
  try {
    await recordSessionResults(sessionId);
  } catch (err) {
    logger.error({ err, sessionId }, 'Failed to record official session results');
  }

  const allAnswers = await PlayerAnswer.find({ gameSessionId: session._id }).lean();
  const totalScore = allAnswers.reduce((sum, a) => sum + (a.scoreAwarded || 0), 0);
  const correctCount = allAnswers.filter((a) => a.isCorrect).length;

  const teamSize = await TeamMember.countDocuments({ teamId: session.teamId });
  const totalPossibleAnswers = session.questionIds.length * Math.max(1, teamSize);
  const accuracy = totalPossibleAnswers > 0 ? Number((correctCount / totalPossibleAnswers).toFixed(4)) : 0;

  return {
    session,
    totalScore,
    accuracy,
    correctCount,
    totalQuestions: session.questionIds.length,
    durationSeconds,
  };
}

/**
 * Rehydrate active timers on server startup to handle restarts or free-tier sleep.
 */
export async function rehydrateActiveSessions(
  onQuestionTimeout: (sessionId: string) => Promise<void>
) {
  try {
    const activeSessions = await GameSession.find({
      status: 'question_active',
    });

    const now = Date.now();
    for (const session of activeSessions) {
      if (!session.questionDeadline) continue;
      const remainingMs = session.questionDeadline.getTime() - now;

      if (remainingMs <= 0) {
        // Deadline passed while server was down: immediately trigger question timeout
        logger.info({ sessionId: session._id }, 'Rehydrating expired question session');
        await onQuestionTimeout(session._id.toString());
      } else {
        // Schedule timer for remaining duration
        logger.info(
          { sessionId: session._id, remainingMs },
          'Rehydrating active question timer'
        );
        setTimeout(() => {
          onQuestionTimeout(session._id.toString()).catch((err) =>
            logger.error({ err, sessionId: session._id }, 'Error during rehydrated timer execution')
          );
        }, remainingMs);
      }
    }
  } catch (err) {
    logger.error({ err }, 'Failed to rehydrate active game sessions');
  }
}
