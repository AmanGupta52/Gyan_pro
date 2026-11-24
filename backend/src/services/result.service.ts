import { Result, type IResult } from '../models/Result.js';
import { PlayerResult, type IPlayerResult } from '../models/PlayerResult.js';
import { GameSession } from '../models/GameSession.js';
import { Competition } from '../models/Competition.js';
import { TeamMember } from '../models/TeamMember.js';
import { PlayerAnswer } from '../models/PlayerAnswer.js';
import { Question } from '../models/Question.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export async function recordSessionResults(sessionId: string): Promise<{
  result: IResult;
  playerResults: IPlayerResult[];
}> {
  const session = await GameSession.findById(sessionId);
  if (!session) {
    throw AppError.notFound('Game session not found.');
  }

  const competition = await Competition.findById(session.competitionId);
  if (!competition) {
    throw AppError.notFound('Competition not found.');
  }

  const teamMembers = await TeamMember.find({ teamId: session.teamId });
  const allAnswers = await PlayerAnswer.find({ gameSessionId: session._id });

  const totalQuestions = session.questionIds.length;
  const teamSize = Math.max(1, teamMembers.length);

  // 1. Calculate and save PlayerResults
  const playerResults: IPlayerResult[] = [];
  let teamCorrectCount = 0;
  let teamTotalScore = 0;

  for (const member of teamMembers) {
    const memberAnswers = allAnswers.filter(
      (a) => a.userId.toString() === member.userId.toString()
    );

    const playerScore = memberAnswers.reduce((sum, a) => sum + (a.scoreAwarded || 0), 0);
    const correctCount = memberAnswers.filter((a) => a.isCorrect).length;
    const incorrectCount = memberAnswers.filter((a) => !a.isCorrect && !a.isLate).length;
    const unansweredCount = Math.max(0, totalQuestions - memberAnswers.length);
    const accuracy = totalQuestions > 0 ? Number((correctCount / totalQuestions).toFixed(4)) : 0;

    const totalTime = memberAnswers.reduce((sum, a) => sum + (a.timeTakenSeconds || 0), 0);
    const avgResponseTime =
      memberAnswers.length > 0 ? Number((totalTime / memberAnswers.length).toFixed(2)) : 0;

    teamCorrectCount += correctCount;
    teamTotalScore += playerScore;

    // Upsert PlayerResult
    const pr = await PlayerResult.findOneAndUpdate(
      { competitionId: session.competitionId, userId: member.userId },
      {
        resultId: session._id, // temporarily set to session id, updated after result created
        competitionId: session.competitionId,
        teamId: session.teamId,
        userId: member.userId,
        gameSessionId: session._id,
        playerScore,
        correctCount,
        incorrectCount,
        unansweredCount,
        accuracy,
        avgResponseTime,
        submittedAt: session.finishedAt || new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    playerResults.push(pr);
  }

  const totalPossibleAnswers = totalQuestions * teamSize;
  const teamAccuracy =
    totalPossibleAnswers > 0 ? Number((teamCorrectCount / totalPossibleAnswers).toFixed(4)) : 0;

  const isProvisional = competition.status !== 'Completed';

  // 2. Upsert Result
  const result = await Result.findOneAndUpdate(
    { competitionId: session.competitionId, teamId: session.teamId },
    {
      competitionId: session.competitionId,
      teamId: session.teamId,
      gameSessionId: session._id,
      totalScore: teamTotalScore,
      accuracy: teamAccuracy,
      correctCount: teamCorrectCount,
      incorrectCount: allAnswers.filter((a) => !a.isCorrect && !a.isLate).length,
      unansweredCount: Math.max(0, totalPossibleAnswers - allAnswers.length),
      totalQuestions,
      totalDurationSeconds: session.totalDurationSeconds || 0,
      isProvisional,
      submittedAt: session.finishedAt || new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Update resultId on player results
  await PlayerResult.updateMany(
    { gameSessionId: session._id },
    { resultId: result._id }
  );

  // 3. Recalculate ranks server-side
  await recalculateRanks(session.competitionId.toString());

  return { result, playerResults };
}

/**
 * Server-authoritative leaderboard rank computation with admin-configured tie-break rules.
 */
export async function recalculateRanks(competitionId: string): Promise<void> {
  const competition = await Competition.findById(competitionId);
  if (!competition) return;

  const tieBreakRule = competition.tieBreakRules || 'fastestTime';

  const results = await Result.find({ competitionId });
  if (results.length === 0) return;

  // Multi-tier comparator:
  // 1. Primary: Score DESC
  // 2. Secondary: Configured tie-breaker
  // 3. Fallback: Submission timestamp ASC
  results.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }

    if (tieBreakRule === 'fastestTime') {
      if (a.totalDurationSeconds !== b.totalDurationSeconds) {
        return a.totalDurationSeconds - b.totalDurationSeconds;
      }
    } else if (tieBreakRule === 'accuracy') {
      if (b.accuracy !== a.accuracy) {
        return b.accuracy - a.accuracy;
      }
    } else if (tieBreakRule === 'submissionOrder') {
      if (a.submittedAt.getTime() !== b.submittedAt.getTime()) {
        return a.submittedAt.getTime() - b.submittedAt.getTime();
      }
    }

    // Default tie-breaker: earliest submission
    return a.submittedAt.getTime() - b.submittedAt.getTime();
  });

  // Assign 1-based ranks
  for (let i = 0; i < results.length; i++) {
    results[i].rank = i + 1;
    await results[i].save();
  }

  logger.info({ competitionId, totalResults: results.length }, 'Ranks recalculated successfully');
}

/**
 * Finalize ranks when tournament moves to 'Completed' status.
 */
export async function finalizeCompetitionRanks(competitionId: string): Promise<void> {
  await recalculateRanks(competitionId);
  await Result.updateMany({ competitionId }, { isProvisional: false });
  logger.info({ competitionId }, 'Competition ranks marked final');
}

/**
 * Fetch leaderboard for a competition with pagination and populated squads.
 */
export async function getLeaderboard(
  competitionId: string,
  page = 1,
  limit = 50
) {
  const competition = await Competition.findById(competitionId);
  if (!competition) {
    throw AppError.notFound('Competition not found.');
  }

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    Result.find({ competitionId })
      .sort({ rank: 1 })
      .skip(skip)
      .limit(limit)
      .populate('teamId', 'name category')
      .lean(),
    Result.countDocuments({ competitionId }),
  ]);

  // Attach team members to each leaderboard row
  const enrichedResults = await Promise.all(
    results.map(async (r: any) => {
      const members = await TeamMember.find({ teamId: r.teamId?._id })
        .populate('userId', 'name avatar')
        .lean();

      return {
        ...r,
        members: members.map((m: any) => ({
          userId: m.userId?._id?.toString(),
          name: m.userId?.name,
          avatar: m.userId?.avatar,
          role: m.role,
        })),
      };
    })
  );

  return {
    competition: {
      _id: competition._id,
      name: competition.name,
      category: competition.category,
      status: competition.status,
      tieBreakRules: competition.tieBreakRules,
      isProvisional: competition.status !== 'Completed',
    },
    leaderboard: enrichedResults,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Fetch user match history across all competitions.
 */
export async function getUserHistory(
  userId: string,
  page = 1,
  limit = 20
) {
  const skip = (page - 1) * limit;

  const [playerResults, total] = await Promise.all([
    PlayerResult.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('competitionId', 'name category status startAt endAt')
      .populate('teamId', 'name category')
      .populate('resultId', 'rank totalScore accuracy isProvisional')
      .lean(),
    PlayerResult.countDocuments({ userId }),
  ]);

  return {
    history: playerResults.map((pr: any) => ({
      _id: pr._id,
      gameSessionId: pr.gameSessionId,
      competition: pr.competitionId,
      team: pr.teamId,
      rank: pr.resultId?.rank || '-',
      teamScore: pr.resultId?.totalScore || 0,
      playerScore: pr.playerScore,
      accuracy: pr.accuracy,
      correctCount: pr.correctCount,
      totalQuestions: pr.correctCount + pr.incorrectCount + pr.unansweredCount,
      avgResponseTime: pr.avgResponseTime,
      isProvisional: pr.resultId?.isProvisional ?? true,
      playedAt: pr.submittedAt,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Fetch detailed result scorecard with player breakdown and question review.
 */
export async function getDetailedResult(
  sessionIdOrResultId: string,
  userId: string,
  isAdmin = false
) {
  let result = await Result.findOne({ gameSessionId: sessionIdOrResultId })
    .populate('competitionId', 'name category status numberOfQuestions timePerQuestionSeconds tieBreakRules')
    .populate('teamId', 'name category');

  if (!result) {
    result = await Result.findById(sessionIdOrResultId)
      .populate('competitionId', 'name category status numberOfQuestions timePerQuestionSeconds tieBreakRules')
      .populate('teamId', 'name category');
  }

  if (!result) {
    throw AppError.notFound('Tournament result not found.');
  }

  const membership = await TeamMember.findOne({
    teamId: result.teamId._id,
    userId,
  });

  if (!membership && !isAdmin) {
    throw AppError.forbidden('You are not authorized to view this result scorecard.');
  }

  // Get player results
  const playerResults = await PlayerResult.find({
    resultId: result._id,
  })
    .populate('userId', 'name avatar')
    .lean();

  // Question review: fetch questions and player answers
  const session = await GameSession.findById(result.gameSessionId);
  const comp = result.competitionId as any;

  // Reveal correct answers only if competition is completed or if user is admin or if session is finished
  const revealAnswers = comp.status === 'Completed' || isAdmin || session?.status === 'finished';

  let questionsReview: any[] = [];
  if (session && session.questionIds.length > 0) {
    const projection = revealAnswers ? '+correctAnswers +explanation' : '';
    const questions = await Question.find({
      _id: { $in: session.questionIds },
    })
      .select(projection)
      .lean();

    const answers = await PlayerAnswer.find({
      gameSessionId: session._id,
    }).lean();

    // Map questions in tournament order
    questionsReview = session.questionIds.map((qId: any, idx: number) => {
      const q = questions.find((item) => item._id.toString() === qId.toString());
      const qAnswers = answers.filter((a) => a.questionId.toString() === qId.toString());

      return {
        questionIndex: idx + 1,
        text: q?.text || 'Question',
        type: q?.type,
        options: q?.options,
        points: q?.points,
        correctAnswers: revealAnswers ? q?.correctAnswers : undefined,
        explanation: revealAnswers ? q?.explanation : undefined,
        answers: qAnswers.map((ans) => ({
          userId: ans.userId.toString(),
          selectedOptions: ans.selectedOptions,
          isCorrect: ans.isCorrect,
          scoreAwarded: ans.scoreAwarded,
          speedBonusAwarded: ans.speedBonusAwarded,
          timeTakenSeconds: ans.timeTakenSeconds,
        })),
      };
    });
  }

  return {
    result,
    playerResults: playerResults.map((pr: any) => ({
      userId: pr.userId?._id?.toString(),
      name: pr.userId?.name,
      avatar: pr.userId?.avatar,
      playerScore: pr.playerScore,
      correctCount: pr.correctCount,
      incorrectCount: pr.incorrectCount,
      unansweredCount: pr.unansweredCount,
      accuracy: pr.accuracy,
      avgResponseTime: pr.avgResponseTime,
    })),
    questionsReview,
  };
}

/**
 * Generate CSV export for tournament administrators.
 */
export async function exportCompetitionResultsCSV(competitionId: string): Promise<string> {
  const competition = await Competition.findById(competitionId);
  if (!competition) {
    throw AppError.notFound('Competition not found.');
  }

  const results = await Result.find({ competitionId })
    .sort({ rank: 1 })
    .populate('teamId', 'name category')
    .lean();

  const headers = [
    'Rank',
    'Squad Name',
    'Category',
    'Total Score',
    'Accuracy (%)',
    'Correct Qs',
    'Duration (s)',
    'Status',
    'Submitted At (IST)',
    'Squad Members',
  ];

  const rows: string[] = [headers.join(',')];

  for (const r of results as any[]) {
    const members = await TeamMember.find({ teamId: r.teamId?._id })
      .populate('userId', 'name email phone')
      .lean();

    const memberNames = members.map((m: any) => m.userId?.name || 'Unknown').join('; ');

    const istTime = new Date(r.submittedAt).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
    });

    const row = [
      r.rank,
      `"${(r.teamId?.name || '').replace(/"/g, '""')}"`,
      `"${r.teamId?.category || ''}"`,
      r.totalScore,
      (r.accuracy * 100).toFixed(1),
      r.correctCount,
      r.totalDurationSeconds,
      r.isProvisional ? 'Provisional' : 'Final',
      `"${istTime}"`,
      `"${memberNames.replace(/"/g, '""')}"`,
    ];

    rows.push(row.join(','));
  }

  return rows.join('\n');
}
