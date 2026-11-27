import crypto from 'node:crypto';
import mongoose, { type Types } from 'mongoose';
import { Quiz } from '../models/Quiz.js';
import {
  QuizAttempt,
  type IQuizAttempt,
  type IAttemptAnswer,
} from '../models/QuizAttempt.js';
import { Question, type IQuestion } from '../models/Question.js';
import { Competition } from '../models/Competition.js';
import { Assignment } from '../models/Assignment.js';
import { CompetitionQuestion } from '../models/CompetitionQuestion.js';
import { AppError } from '../utils/AppError.js';
import { seededShuffle } from '../utils/shuffle.js';
import { canManageContent } from '../utils/roles.js';
import { gradeAnswer, summariseAttempt } from './grading.service.js';
import { getSharedAuthorIds } from './question.service.js';
import { resolveAssignmentForStart } from './class.service.js';
import { issueQuizCertificateForAttempt } from './certificate.service.js';
import { QuizCertificate } from '../models/QuizCertificate.js';
import { logger } from '../utils/logger.js';
import type { AuthPayload } from '../types/index.js';

/** Network latency allowance when checking the server-side deadline */
export const ATTEMPT_GRACE_MS = 1500;

type PracticeInput = {
  mode: 'practice';
  educationLevel: string;
  subjectId?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  count: number;
  timePerQuestionSeconds?: number;
};
type QuizInput = { mode?: 'quiz'; quizId: string; joinCode?: string; assignmentId?: string };
export type StartAttemptInput = PracticeInput | QuizInput;

// ─── Start ────────────────────────────────────────────────────

export async function startAttempt(actor: AuthPayload, input: StartAttemptInput) {
  return input.mode === 'practice' ? startPractice(actor, input) : startQuiz(actor, input);
}

async function startQuiz(actor: AuthPayload, input: QuizInput) {
  const quiz = await Quiz.findById(input.quizId);
  if (!quiz) throw AppError.notFound('Quiz not found');

  const isManager = canManageContent(actor, quiz.createdBy.toString());

  // Starting from a class assignment grants access (even to a private quiz) and replaces
  // the quiz's own open/close window with the assignment's deadline.
  let assignmentLink: { assignmentId: Types.ObjectId; isLate: boolean } | null = null;
  if (input.assignmentId) {
    if (quiz.status !== 'published') throw AppError.badRequest('This quiz is not available right now.');
    const { assignment, isLate } = await resolveAssignmentForStart(actor.userId, input.assignmentId, input.quizId);
    assignmentLink = { assignmentId: assignment._id, isLate };
  } else if (!isManager) {
    // Owner / admin can test-play their own quiz in any state; students only published ones.
    if (quiz.status !== 'published') throw AppError.notFound('Quiz not found');
    if (quiz.visibility === 'unlisted' && input.joinCode?.trim().toUpperCase() !== quiz.joinCode) {
      throw AppError.forbidden('This quiz needs a join code.');
    }
    const now = new Date();
    if (quiz.startAt && now < quiz.startAt) {
      throw AppError.badRequest(`This quiz opens on ${quiz.startAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.`);
    }
    if (quiz.endAt && now > quiz.endAt) {
      throw AppError.badRequest('This quiz has closed.');
    }
  }

  // Resume instead of starting a second run
  const running = await QuizAttempt.findOne({ userId: actor.userId, quizId: quiz._id, status: 'in_progress' });
  if (running) {
    // A run started outside the assignment now counts towards it
    if (assignmentLink && !running.assignmentId) {
      running.assignmentId = assignmentLink.assignmentId;
      running.isLate = running.startedAt > (await dueDateOf(assignmentLink.assignmentId));
      await running.save();
    }
    return { attemptId: running._id.toString(), resumed: true };
  }

  if (!isManager && quiz.maxAttempts > 0) {
    const used = await QuizAttempt.countDocuments({ userId: actor.userId, quizId: quiz._id });
    if (used >= quiz.maxAttempts) {
      throw AppError.badRequest(`You have used all ${quiz.maxAttempts} attempt(s) for this quiz.`);
    }
  }

  const questions = await Question.find({ _id: { $in: quiz.questionIds } }).select('points').lean();
  const known = new Map(questions.map((q) => [q._id.toString(), q]));
  let order = quiz.questionIds.filter((id) => known.has(id.toString()));
  if (order.length === 0) throw AppError.badRequest('This quiz has no questions yet.');

  const attemptId = new mongoose.Types.ObjectId();
  if (quiz.shuffleQuestions) {
    order = seededShuffle(order, attemptId.toString());
  }

  const attempt = await QuizAttempt.create({
    _id: attemptId,
    userId: actor.userId,
    quizId: quiz._id,
    assignmentId: assignmentLink?.assignmentId,
    isLate: assignmentLink?.isLate ?? false,
    mode: 'quiz',
    title: quiz.title,
    category: quiz.category,
    questionIds: order,
    maxScore: order.reduce((sum, id) => sum + (known.get(id.toString())?.points ?? 0), 0),
    config: {
      showAnswers: quiz.showAnswers,
      passPercent: quiz.passPercent,
      speedBonusMax: quiz.speedBonusMax,
      penaltyWrong: quiz.penaltyWrong,
      shuffleOptions: quiz.shuffleOptions,
      timePerQuestionSeconds: quiz.timePerQuestionSeconds,
    },
  });

  return { attemptId: attempt._id.toString(), resumed: false };
}

/**
 * Practice draws random questions from the OFFICIAL bank (written by admins).
 * Teacher-written questions are excluded so a teacher's private exam can never be
 * seen through practice, and so are questions fixed into a competition that has not finished.
 */
async function startPractice(actor: AuthPayload, input: PracticeInput) {
  // Practice always starts fresh; unfinished runs stay resumable from "My attempts".
  const sharedIds = await getSharedAuthorIds();
  const activeComps = await Competition.find({ status: { $nin: ['Completed', 'Archived'] } }).select('_id').lean();
  const reserved = await CompetitionQuestion.find({ competitionId: { $in: activeComps.map((c) => c._id) } })
    .select('questionId')
    .lean();

  const match: Record<string, unknown> = {
    status: 'published',
    educationLevel: input.educationLevel,
    createdBy: { $in: sharedIds },
    _id: { $nin: reserved.map((r) => r.questionId) },
  };
  if (input.subjectId) match.subjectId = new mongoose.Types.ObjectId(input.subjectId);
  if (input.difficulty) match.difficulty = input.difficulty;

  // Pull only ids + points of the matching pool, then pick at random in memory.
  const pool = await Question.find(match).select('points').lean();
  const picked = seededShuffle(pool, crypto.randomUUID()).slice(0, input.count);
  if (picked.length === 0) {
    throw AppError.badRequest('No practice questions match those filters yet. Try another subject or level.');
  }

  const attempt = await QuizAttempt.create({
    userId: actor.userId,
    mode: 'practice',
    title: `Practice · ${input.educationLevel}`,
    category: input.educationLevel,
    questionIds: picked.map((q) => q._id),
    maxScore: picked.reduce((sum, q) => sum + q.points, 0),
    config: {
      showAnswers: 'after_each',
      passPercent: 40,
      speedBonusMax: 0,
      penaltyWrong: 0,
      shuffleOptions: true,
      timePerQuestionSeconds: input.timePerQuestionSeconds,
    },
  });

  return { attemptId: attempt._id.toString(), resumed: false };
}

async function dueDateOf(assignmentId: Types.ObjectId): Promise<Date> {
  const a = await Assignment.findById(assignmentId).select('dueAt').lean();
  return a?.dueAt ?? new Date(8640000000000000);
}

// ─── Play ─────────────────────────────────────────────────────

async function loadOwnAttempt(actor: AuthPayload, attemptId: string): Promise<IQuizAttempt> {
  if (!mongoose.isValidObjectId(attemptId)) throw AppError.notFound('Attempt not found');
  const attempt = await QuizAttempt.findById(attemptId);
  // 404 (not 403) so nobody can probe other people's attempt ids
  if (!attempt || attempt.userId.toString() !== actor.userId) throw AppError.notFound('Attempt not found');
  return attempt;
}

function timeLimitFor(attempt: IQuizAttempt, question: Pick<IQuestion, 'timeLimit'>): number {
  return attempt.config.timePerQuestionSeconds || question.timeLimit || 30;
}

function clientQuestion(attempt: IQuizAttempt, q: IQuestion, timeLimit: number) {
  const options = attempt.config.shuffleOptions
    ? seededShuffle(q.options, `${attempt._id.toString()}:${q._id.toString()}`)
    : q.options;
  // correctAnswers / explanation are select:false and never loaded here
  return {
    _id: q._id.toString(),
    text: q.text,
    type: q.type,
    options: options.map((o) => ({ id: o.id, text: o.text })),
    points: q.points,
    image: q.image,
    timeLimit,
  };
}

/** Records the current question as unanswered once its deadline has truly passed. */
async function expireIfOverdue(attempt: IQuizAttempt): Promise<IQuizAttempt> {
  if (
    attempt.status !== 'in_progress' ||
    !attempt.questionDeadline ||
    Date.now() <= attempt.questionDeadline.getTime() + ATTEMPT_GRACE_MS
  ) {
    return attempt;
  }
  const questionId = attempt.questionIds[attempt.currentIndex];
  if (!questionId) return attempt;

  const limit = attempt.config.timePerQuestionSeconds
    ? attempt.config.timePerQuestionSeconds
    : ((await Question.findById(questionId).select('timeLimit').lean())?.timeLimit ?? 30);

  const answer: IAttemptAnswer = {
    questionId,
    selectedOptions: [],
    isCorrect: false,
    scoreAwarded: 0,
    speedBonusAwarded: 0,
    timeTakenSeconds: limit,
    unanswered: true,
    answeredAt: new Date(),
  };
  return (await recordAnswer(attempt, answer)) ?? (await QuizAttempt.findById(attempt._id)) ?? attempt;
}

/**
 * Atomically appends an answer and moves to the next question.
 * The currentIndex filter makes a double-click / replayed request a no-op instead of a double score.
 */
async function recordAnswer(attempt: IQuizAttempt, answer: IAttemptAnswer): Promise<IQuizAttempt | null> {
  const updated = await QuizAttempt.findOneAndUpdate(
    { _id: attempt._id, status: 'in_progress', currentIndex: attempt.currentIndex },
    {
      $push: { answers: answer },
      $inc: { currentIndex: 1 },
      $set: { questionStartedAt: null, questionDeadline: null },
    },
    { new: true }
  );
  if (!updated) return null;
  if (updated.currentIndex >= updated.questionIds.length) {
    return finalise(updated);
  }
  return updated;
}

async function finalise(attempt: IQuizAttempt): Promise<IQuizAttempt> {
  const totals = summariseAttempt(attempt.answers, attempt.questionIds.length, attempt.config.passPercent);
  const done = await QuizAttempt.findOneAndUpdate(
    { _id: attempt._id, status: 'in_progress' },
    { $set: { ...totals, status: 'finished', finishedAt: new Date(), questionStartedAt: null, questionDeadline: null } },
    { new: true }
  );

  // Only the call that actually closed the attempt issues the certificate
  if (done && done.passed && done.mode === 'quiz') {
    try {
      await issueQuizCertificateForAttempt(done._id.toString());
    } catch (err) {
      // A certificate problem must never block the student from seeing their result
      logger.error({ err, attemptId: done._id.toString() }, 'Could not issue quiz certificate');
    }
  }
  return done ?? (await QuizAttempt.findById(attempt._id)) ?? attempt;
}

/**
 * Current state of an attempt. The first call for a question starts its timer on the server,
 * so refreshing the page never resets or extends the countdown.
 */
export async function getAttemptState(actor: AuthPayload, attemptId: string) {
  let attempt = await loadOwnAttempt(actor, attemptId);
  attempt = await expireIfOverdue(attempt);

  const base = {
    attemptId: attempt._id.toString(),
    mode: attempt.mode,
    title: attempt.title,
    status: attempt.status,
    total: attempt.questionIds.length,
    answered: attempt.answers.length,
    serverNow: new Date().toISOString(),
  };

  if (attempt.status === 'finished') {
    return { ...base, current: null };
  }

  const q = await Question.findById(attempt.questionIds[attempt.currentIndex]);
  if (!q) {
    // The question was removed after the attempt began - skip it rather than trap the player
    const skipped = await recordAnswer(attempt, {
      questionId: attempt.questionIds[attempt.currentIndex] as Types.ObjectId,
      selectedOptions: [],
      isCorrect: false,
      scoreAwarded: 0,
      speedBonusAwarded: 0,
      timeTakenSeconds: 0,
      unanswered: true,
      answeredAt: new Date(),
    });
    return getAttemptState(actor, skipped ? attempt._id.toString() : attemptId);
  }

  const limit = timeLimitFor(attempt, q);

  if (!attempt.questionStartedAt) {
    const now = new Date();
    // Only the first caller wins, so two tabs can't restart the clock
    await QuizAttempt.updateOne(
      { _id: attempt._id, questionStartedAt: null, status: 'in_progress' },
      { $set: { questionStartedAt: now, questionDeadline: new Date(now.getTime() + limit * 1000) } }
    );
    attempt = (await QuizAttempt.findById(attempt._id)) ?? attempt;
  }

  return {
    ...base,
    current: {
      index: attempt.currentIndex,
      question: clientQuestion(attempt, q, limit),
      startedAt: attempt.questionStartedAt,
      deadline: attempt.questionDeadline,
    },
  };
}

export async function submitAnswer(
  actor: AuthPayload,
  attemptId: string,
  questionId: string,
  selectedOptions: string[]
) {
  let attempt = await loadOwnAttempt(actor, attemptId);
  attempt = await expireIfOverdue(attempt);

  if (attempt.status === 'finished') {
    throw AppError.badRequest('This attempt is already finished.');
  }
  if (attempt.questionIds[attempt.currentIndex]?.toString() !== questionId) {
    throw AppError.conflict('That question is no longer active. Reload to continue.');
  }
  if (!attempt.questionStartedAt || !attempt.questionDeadline) {
    throw AppError.badRequest('Question has not been served yet.');
  }

  const question = await Question.findById(questionId).select('+correctAnswers +explanation');
  if (!question) throw AppError.notFound('Question not found');

  const validIds = new Set(question.options.map((o) => o.id));
  if (selectedOptions.some((id) => !validIds.has(id))) {
    throw AppError.badRequest('Selected option does not belong to this question.');
  }
  if (question.type !== 'multiple_correct' && selectedOptions.length > 1) {
    throw AppError.badRequest('Only one option can be selected for this question.');
  }

  const limit = timeLimitFor(attempt, question);
  const elapsed = (Date.now() - attempt.questionStartedAt.getTime()) / 1000;
  const timeTaken = Math.min(limit, Math.max(0.1, Number(elapsed.toFixed(2))));

  const grade = gradeAnswer(question, selectedOptions, timeTaken, limit, attempt.config);
  const answer: IAttemptAnswer = {
    questionId: question._id,
    selectedOptions: Array.from(new Set(selectedOptions)),
    isCorrect: grade.isCorrect,
    scoreAwarded: grade.scoreAwarded,
    speedBonusAwarded: grade.speedBonusAwarded,
    timeTakenSeconds: timeTaken,
    unanswered: selectedOptions.length === 0,
    answeredAt: new Date(),
  };

  const updated = await recordAnswer(attempt, answer);
  if (!updated) throw AppError.conflict('This question was already answered.');

  const reveal = attempt.config.showAnswers === 'after_each';
  return {
    recorded: true,
    finished: updated.status === 'finished',
    feedback: reveal
      ? {
          isCorrect: grade.isCorrect,
          scoreAwarded: grade.scoreAwarded,
          speedBonusAwarded: grade.speedBonusAwarded,
          correctAnswers: question.correctAnswers,
          explanation: question.explanation,
        }
      : null,
    progress: { answered: updated.answers.length, total: updated.questionIds.length },
  };
}

/** Player ends the attempt early; unplayed questions count as unanswered. */
export async function finishAttempt(actor: AuthPayload, attemptId: string) {
  const attempt = await loadOwnAttempt(actor, attemptId);
  if (attempt.status === 'finished') return { finished: true };
  await finalise(attempt);
  return { finished: true };
}

// ─── Review & history ─────────────────────────────────────────

export async function getAttemptResult(actor: AuthPayload, attemptId: string) {
  const attempt = await loadOwnAttempt(actor, attemptId);
  if (attempt.status !== 'finished') {
    throw AppError.badRequest('Finish the attempt to see your result.');
  }

  const certificate =
    attempt.mode === 'quiz' && attempt.passed && attempt.quizId
      ? await QuizCertificate.findOne({ quizId: attempt.quizId, userId: attempt.userId })
          .select('certificateId status')
          .lean()
      : null;

  const summary = {
    attemptId: attempt._id.toString(),
    quizId: attempt.quizId?.toString() ?? null,
    assignmentId: attempt.assignmentId?.toString() ?? null,
    late: attempt.isLate,
    certificate: certificate ? { certificateId: certificate.certificateId, status: certificate.status } : null,
    mode: attempt.mode,
    title: attempt.title,
    category: attempt.category,
    totalScore: attempt.totalScore,
    maxScore: attempt.maxScore,
    correctCount: attempt.correctCount,
    totalQuestions: attempt.questionIds.length,
    unansweredCount: attempt.questionIds.length - attempt.answers.filter((a) => !a.unanswered).length,
    accuracy: attempt.accuracy,
    passed: attempt.passed,
    passPercent: attempt.config.passPercent,
    durationSeconds: attempt.durationSeconds,
    finishedAt: attempt.finishedAt,
    showAnswers: attempt.config.showAnswers,
  };

  // Exam mode: score only, no per-question review
  if (attempt.config.showAnswers === 'never') {
    return { ...summary, review: null };
  }

  const questions = await Question.find({ _id: { $in: attempt.questionIds } })
    .select('+correctAnswers +explanation')
    .lean();
  const byId = new Map(questions.map((q) => [q._id.toString(), q]));
  const answerOf = new Map(attempt.answers.map((a) => [a.questionId.toString(), a]));

  const review = attempt.questionIds.map((id, i) => {
    const q = byId.get(id.toString());
    const a = answerOf.get(id.toString());
    return {
      order: i + 1,
      questionId: id.toString(),
      text: q?.text ?? '(question removed)',
      type: q?.type,
      image: q?.image,
      options: q?.options ?? [],
      correctAnswers: q?.correctAnswers ?? [],
      explanation: q?.explanation,
      selectedOptions: a?.selectedOptions ?? [],
      isCorrect: a?.isCorrect ?? false,
      unanswered: a ? a.unanswered : true,
      scoreAwarded: a?.scoreAwarded ?? 0,
      timeTakenSeconds: a?.timeTakenSeconds ?? 0,
    };
  });

  return { ...summary, review };
}

export async function listMyAttempts(actor: AuthPayload, page = 1, limit = 15) {
  const filter = { userId: actor.userId };
  const [attempts, total] = await Promise.all([
    QuizAttempt.find(filter)
      .select('quizId mode title category status totalScore maxScore accuracy passed currentIndex questionIds createdAt finishedAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    QuizAttempt.countDocuments(filter),
  ]);

  return {
    attempts: attempts.map((a) => ({
      _id: a._id.toString(),
      quizId: a.quizId?.toString() ?? null,
      mode: a.mode,
      title: a.title,
      category: a.category,
      status: a.status,
      totalScore: a.totalScore,
      maxScore: a.maxScore,
      accuracy: a.accuracy,
      passed: a.passed,
      progress: { answered: a.currentIndex, total: a.questionIds.length },
      createdAt: a.createdAt,
      finishedAt: a.finishedAt,
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getMyStats(actor: AuthPayload) {
  const userId = new mongoose.Types.ObjectId(actor.userId);
  const [agg, passRows, recent, topAttempt] = await Promise.all([
    QuizAttempt.aggregate([
      { $match: { userId, status: 'finished' } },
      {
        $group: {
          _id: null,
          attempts: { $sum: 1 },
          accSum: { $sum: '$accuracy' },
          totalScore: { $sum: '$totalScore' },
          correct: { $sum: '$correctCount' },
        },
      },
    ]),
    QuizAttempt.aggregate([
      { $match: { userId, status: 'finished', mode: 'quiz' } },
      { $group: { _id: '$passed', n: { $sum: 1 } } },
    ]),
    QuizAttempt.find({ userId, status: 'finished' })
      .select('title accuracy totalScore finishedAt')
      .sort({ finishedAt: -1 })
      .limit(10)
      .lean(),
    QuizAttempt.findOne({ userId, status: 'finished' }).sort({ totalScore: -1 }).select('totalScore').lean(),
  ]);

  const s = agg[0];
  return {
    attempts: s?.attempts ?? 0,
    avgAccuracy: s ? Number((s.accSum / s.attempts).toFixed(4)) : 0,
    bestScore: topAttempt?.totalScore ?? 0,
    totalScore: s?.totalScore ?? 0,
    correctAnswers: s?.correct ?? 0,
    passed: passRows.find((r) => r._id === true)?.n ?? 0,
    recent: recent.reverse().map((r) => ({
      title: r.title,
      accuracy: r.accuracy,
      totalScore: r.totalScore,
      finishedAt: r.finishedAt,
    })),
  };
}

/**
 * Raw history for streaks and badges. The client derives streak / XP / badges from this with
 * the same gamification code it already uses for competition matches.
 */
export async function getMyActivity(actor: AuthPayload, limit = 500) {
  const attempts = await QuizAttempt.find({ userId: actor.userId, status: 'finished' })
    .select('mode totalScore maxScore accuracy correctCount questionIds passed finishedAt')
    .sort({ finishedAt: -1 })
    .limit(limit)
    .lean();

  return attempts.map((a) => ({
    _id: a._id.toString(),
    mode: a.mode,
    finishedAt: a.finishedAt,
    totalScore: a.totalScore,
    maxScore: a.maxScore,
    accuracy: a.accuracy,
    correctCount: a.correctCount,
    totalQuestions: a.questionIds.length,
    passed: a.passed,
  }));
}
