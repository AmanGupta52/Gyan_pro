import { Quiz, type IQuiz, type QuizStatus } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { Question } from '../models/Question.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { canManageContent, isModerator } from '../utils/roles.js';
import { generateJoinCode } from '../utils/joinCode.js';
import { logAudit } from './audit.service.js';
import { getSharedAuthorIds } from './question.service.js';
import type { AuthPayload } from '../types/index.js';

async function uniqueJoinCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = generateJoinCode();
    if (!(await Quiz.exists({ joinCode: code }))) return code;
  }
  throw AppError.internal('Could not generate a unique join code. Please try again.');
}

export interface QuizInput {
  title: string;
  description?: string;
  category: string;
  subjectId?: string | null;
  questionIds: string[];
  visibility: 'public' | 'unlisted';
  timePerQuestionSeconds?: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  maxAttempts: number;
  passPercent: number;
  showAnswers: 'after_each' | 'after_finish' | 'never';
  speedBonusMax: number;
  penaltyWrong: number;
  certificateEnabled: boolean;
  startAt?: Date | null;
  endAt?: Date | null;
}

// ─── Permission helpers ───────────────────────────────────────

/** Loads a quiz the actor may edit (owner, or admin/superAdmin). */
export async function loadManageableQuiz(actor: AuthPayload, quizId: string): Promise<IQuiz> {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw AppError.notFound('Quiz not found');
  if (!canManageContent(actor, quiz.createdBy.toString())) {
    throw AppError.forbidden('You can only manage quizzes you created.');
  }
  return quiz;
}

/**
 * Teachers may only use their own questions or the admin-curated shared bank.
 * (Another teacher's private questions - e.g. an exam - must never leak into your quiz.)
 */
async function assertQuestionsUsable(actor: AuthPayload, questionIds: string[]) {
  if (questionIds.length === 0) return;
  if (new Set(questionIds).size !== questionIds.length) {
    throw AppError.badRequest('The same question was added more than once.');
  }

  const found = await Question.find({ _id: { $in: questionIds } }).select('createdBy').lean();
  if (found.length !== questionIds.length) {
    throw AppError.badRequest('One or more selected questions no longer exist.');
  }

  if (!isModerator(actor.role)) {
    const shared = new Set((await getSharedAuthorIds()).map((id) => id.toString()));
    for (const q of found) {
      const owner = q.createdBy.toString();
      if (owner !== actor.userId && !shared.has(owner)) {
        throw AppError.forbidden('You can only add your own questions or the shared question bank.');
      }
    }
  }
}

// ─── CRUD ─────────────────────────────────────────────────────

export async function createQuiz(actor: AuthPayload, input: QuizInput, ipAddress?: string) {
  await assertQuestionsUsable(actor, input.questionIds);

  const quiz = await Quiz.create({
    ...normalise(input),
    createdBy: actor.userId,
    joinCode: await uniqueJoinCode(),
    status: 'draft',
  });

  await logAudit({
    userId: actor.userId,
    action: 'QUIZ_CREATE',
    entityType: 'Quiz',
    entityId: quiz._id.toString(),
    details: { title: quiz.title, category: quiz.category },
    ipAddress,
  });

  return quiz;
}

export async function updateQuiz(
  actor: AuthPayload,
  quizId: string,
  updates: Partial<QuizInput>,
  ipAddress?: string
) {
  const quiz = await loadManageableQuiz(actor, quizId);

  if (updates.questionIds) {
    await assertQuestionsUsable(actor, updates.questionIds);
    if (quiz.status === 'published' && updates.questionIds.length === 0) {
      throw AppError.badRequest('A published quiz needs at least one question. Unpublish it first.');
    }
  }

  Object.assign(quiz, normalise(updates));
  await quiz.save();

  await logAudit({
    userId: actor.userId,
    action: 'QUIZ_UPDATE',
    entityType: 'Quiz',
    entityId: quizId,
    details: { fields: Object.keys(updates) },
    ipAddress,
  });

  return quiz;
}

export async function setQuizStatus(
  actor: AuthPayload,
  quizId: string,
  status: QuizStatus,
  ipAddress?: string
) {
  const quiz = await loadManageableQuiz(actor, quizId);

  if (status === 'published' && quiz.questionIds.length === 0) {
    throw AppError.badRequest('Add at least one question before publishing.');
  }
  const previous = quiz.status;
  quiz.status = status;
  await quiz.save();

  await logAudit({
    userId: actor.userId,
    action: 'QUIZ_STATUS_CHANGE',
    entityType: 'Quiz',
    entityId: quizId,
    details: { previous, status },
    ipAddress,
  });

  return quiz;
}

export async function deleteQuiz(actor: AuthPayload, quizId: string, ipAddress?: string) {
  const quiz = await loadManageableQuiz(actor, quizId);

  if (await QuizAttempt.exists({ quizId: quiz._id })) {
    throw AppError.badRequest(
      'Students have already played this quiz, so it cannot be deleted. Archive it instead.'
    );
  }
  await quiz.deleteOne();

  await logAudit({
    userId: actor.userId,
    action: 'QUIZ_DELETE',
    entityType: 'Quiz',
    entityId: quizId,
    details: { title: quiz.title },
    ipAddress,
  });

  return { message: 'Quiz deleted' };
}

function normalise(input: Partial<QuizInput>) {
  const out: Record<string, unknown> = { ...input };
  // null from the client means "clear this optional field"
  for (const key of ['subjectId', 'timePerQuestionSeconds', 'startAt', 'endAt'] as const) {
    if (key in input && input[key] === null) {
      out[key] = undefined;
    }
  }
  return out;
}

// ─── Reading ──────────────────────────────────────────────────

interface ListParams {
  category?: string;
  subjectId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** What every logged-in student can see about a quiz (never the join code or answers). */
async function toPublicQuiz(quiz: any, userId?: string) {
  const base = {
    _id: quiz._id.toString(),
    title: quiz.title,
    description: quiz.description,
    category: quiz.category,
    subject: quiz.subjectId && typeof quiz.subjectId === 'object' ? quiz.subjectId : undefined,
    status: quiz.status,
    visibility: quiz.visibility,
    questionCount: quiz.questionIds?.length ?? 0,
    timePerQuestionSeconds: quiz.timePerQuestionSeconds ?? null,
    maxAttempts: quiz.maxAttempts,
    passPercent: quiz.passPercent,
    showAnswers: quiz.showAnswers,
    shuffleQuestions: quiz.shuffleQuestions,
    shuffleOptions: quiz.shuffleOptions,
    speedBonusMax: quiz.speedBonusMax,
    penaltyWrong: quiz.penaltyWrong,
    certificateEnabled: quiz.certificateEnabled !== false,
    startAt: quiz.startAt ?? null,
    endAt: quiz.endAt ?? null,
    createdAt: quiz.createdAt,
    createdBy:
      quiz.createdBy && typeof quiz.createdBy === 'object' && 'name' in quiz.createdBy
        ? { _id: quiz.createdBy._id.toString(), name: quiz.createdBy.name }
        : { _id: quiz.createdBy?.toString() },
  };

  if (!userId) return base;

  const mine = await QuizAttempt.find({ quizId: quiz._id, userId })
    .select('status totalScore accuracy createdAt')
    .sort({ createdAt: -1 })
    .lean();
  const finished = mine.filter((a) => a.status === 'finished');
  const inProgress = mine.find((a) => a.status === 'in_progress');

  return {
    ...base,
    my: {
      attempts: mine.length,
      bestScore: finished.length ? Math.max(...finished.map((a) => a.totalScore)) : null,
      bestAccuracy: finished.length ? Math.max(...finished.map((a) => a.accuracy)) : null,
      inProgressAttemptId: inProgress ? inProgress._id.toString() : null,
    },
  };
}

/** Public catalogue of published, public quizzes that are currently open. */
export async function listPublicQuizzes(actor: AuthPayload, params: ListParams) {
  const { category, subjectId, search, page = 1, limit = 12 } = params;
  const now = new Date();

  const filter: Record<string, unknown> = {
    status: 'published',
    visibility: 'public',
    $and: [
      { $or: [{ startAt: { $exists: false } }, { startAt: null }, { startAt: { $lte: now } }] },
      { $or: [{ endAt: { $exists: false } }, { endAt: null }, { endAt: { $gte: now } }] },
    ],
  };
  if (category && category !== 'all') filter.category = category;
  if (subjectId && subjectId !== 'all') filter.subjectId = subjectId;
  if (search && search.trim()) filter.title = { $regex: new RegExp(escapeRegex(search.trim()), 'i') };

  const [quizzes, total] = await Promise.all([
    Quiz.find(filter)
      .select('-joinCode')
      .populate('subjectId', 'name code')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Quiz.countDocuments(filter),
  ]);

  const data = await Promise.all(quizzes.map((q) => toPublicQuiz(q, actor.userId)));
  return { quizzes: data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

/** Quizzes created by the actor. Admins can pass scope=all to oversee every quiz. */
export async function listManagedQuizzes(actor: AuthPayload, scope: 'mine' | 'all' = 'mine') {
  const filter: Record<string, unknown> = {};
  if (!(scope === 'all' && isModerator(actor.role))) {
    filter.createdBy = actor.userId;
  }

  const quizzes = await Quiz.find(filter)
    .populate('subjectId', 'name code')
    .populate('createdBy', 'name')
    .sort({ updatedAt: -1 })
    .lean();

  const ids = quizzes.map((q) => q._id);
  // One bucket per (quiz, player); folded below into attempts / distinct players / avg accuracy
  const buckets = await QuizAttempt.aggregate([
    { $match: { quizId: { $in: ids }, status: 'finished' } },
    { $group: { _id: { quiz: '$quizId', user: '$userId' }, n: { $sum: 1 }, accSum: { $sum: '$accuracy' } } },
  ]);
  const byQuiz = new Map<string, { attempts: number; players: number; accSum: number }>();
  for (const b of buckets) {
    const key = b._id.quiz.toString();
    const row = byQuiz.get(key) ?? { attempts: 0, players: 0, accSum: 0 };
    row.attempts += b.n;
    row.players += 1;
    row.accSum += b.accSum;
    byQuiz.set(key, row);
  }

  return quizzes.map((q: any) => {
    const c = byQuiz.get(q._id.toString());
    return {
      ...q,
      questionCount: q.questionIds?.length ?? 0,
      attemptCount: c?.attempts ?? 0,
      playerCount: c?.players ?? 0,
      avgAccuracy: c ? Number((c.accSum / c.attempts).toFixed(4)) : null,
    };
  });
}

export async function getQuizById(actor: AuthPayload, quizId: string) {
  const quiz = await Quiz.findById(quizId)
    .populate('subjectId', 'name code')
    .populate('createdBy', 'name')
    .lean();
  if (!quiz) throw AppError.notFound('Quiz not found');

  const ownerId = (quiz.createdBy as any)._id.toString();
  const canManage = canManageContent(actor, ownerId);

  if (!canManage && (quiz.status !== 'published' || quiz.visibility === 'unlisted')) {
    // Unlisted quizzes are only reachable through their join code
    throw AppError.notFound('Quiz not found');
  }

  const data = await toPublicQuiz(quiz, actor.userId);
  return canManage
    ? { ...data, canManage: true, joinCode: quiz.joinCode, questionIds: quiz.questionIds.map((q) => q.toString()) }
    : { ...data, canManage: false };
}

export async function getQuizByJoinCode(actor: AuthPayload, code: string) {
  const quiz = await Quiz.findOne({ joinCode: code.trim().toUpperCase(), status: 'published' })
    .populate('subjectId', 'name code')
    .populate('createdBy', 'name')
    .lean();
  if (!quiz) throw AppError.notFound('No quiz found for that code. Check the code and try again.');
  return toPublicQuiz(quiz, actor.userId);
}

/** Full questions (with answers) of a quiz, in order - for the editor and for the owner. */
export async function getQuizQuestions(actor: AuthPayload, quizId: string) {
  const quiz = await loadManageableQuiz(actor, quizId);
  const questions = await Question.find({ _id: { $in: quiz.questionIds } })
    .select('+correctAnswers +explanation')
    .populate('subjectId', 'name code')
    .lean();
  const byId = new Map(questions.map((q) => [q._id.toString(), q]));
  return quiz.questionIds.map((id) => byId.get(id.toString())).filter(Boolean);
}

// ─── Results for teachers & students ──────────────────────────

export async function getQuizLeaderboard(quizId: string, limit = 20) {
  const quiz = await Quiz.findById(quizId).select('createdBy status').lean();
  if (!quiz) throw AppError.notFound('Quiz not found');

  // Best attempt per player: highest score, ties broken by the faster run.
  const attempts = await QuizAttempt.find({
    quizId: quiz._id,
    status: 'finished',
    userId: { $ne: quiz.createdBy }, // the teacher's own test runs don't count
  })
    .select('userId totalScore accuracy durationSeconds')
    .sort({ totalScore: -1, durationSeconds: 1 })
    .limit(2000)
    .lean();

  const best = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) {
    const key = a.userId.toString();
    if (!best.has(key)) best.set(key, a);
  }
  const top = Array.from(best.values()).slice(0, limit);

  const users = await User.find({ _id: { $in: top.map((t) => t.userId) } })
    .select('name photo educationLevel institution')
    .lean();
  const nameOf = new Map(users.map((u) => [u._id.toString(), u]));

  return top.map((r, i) => {
    const u = nameOf.get(r.userId.toString());
    return {
      rank: i + 1,
      userId: r.userId.toString(),
      name: u?.name ?? 'Player',
      photo: u?.photo,
      institution: u?.institution,
      totalScore: r.totalScore,
      accuracy: r.accuracy,
      durationSeconds: r.durationSeconds,
    };
  });
}

export async function getQuizAttempts(actor: AuthPayload, quizId: string, page = 1, limit = 20) {
  const quiz = await loadManageableQuiz(actor, quizId);
  const filter = { quizId: quiz._id, status: 'finished', userId: { $ne: quiz.createdBy } };

  const [attempts, total] = await Promise.all([
    QuizAttempt.find(filter)
      .populate('userId', 'name email educationLevel institution')
      .select('userId totalScore maxScore correctCount accuracy passed durationSeconds finishedAt')
      .sort({ finishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    QuizAttempt.countDocuments(filter),
  ]);

  return { attempts, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getQuizAnalytics(actor: AuthPayload, quizId: string) {
  const quiz = await loadManageableQuiz(actor, quizId);
  const match = { quizId: quiz._id, status: 'finished', userId: { $ne: quiz.createdBy } };

  const [playerRows, passRows, perQuestionRows, topAttempt] = await Promise.all([
    // One row per player; folded below (keeps the pipeline portable across Mongo-compatible servers)
    QuizAttempt.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$userId',
          n: { $sum: 1 },
          scoreSum: { $sum: '$totalScore' },
          accSum: { $sum: '$accuracy' },
          durSum: { $sum: '$durationSeconds' },
        },
      },
    ]),
    QuizAttempt.aggregate([{ $match: match }, { $group: { _id: '$passed', n: { $sum: 1 } } }]),
    QuizAttempt.aggregate([
      { $match: match },
      { $unwind: '$answers' },
      {
        $group: {
          _id: {
            q: '$answers.questionId',
            correct: '$answers.isCorrect',
            skipped: '$answers.unanswered',
          },
          n: { $sum: 1 },
          timeSum: { $sum: '$answers.timeTakenSeconds' },
        },
      },
    ]),
    QuizAttempt.findOne(match).sort({ totalScore: -1 }).select('totalScore').lean(),
  ]);

  const attemptsTotal = playerRows.reduce((t, r) => t + r.n, 0);
  const sum = (key: 'scoreSum' | 'accSum' | 'durSum') => playerRows.reduce((t, r) => t + r[key], 0);
  const s = attemptsTotal
    ? {
        attempts: attemptsTotal,
        players: playerRows.length,
        avgScore: sum('scoreSum') / attemptsTotal,
        avgAccuracy: sum('accSum') / attemptsTotal,
        avgDuration: sum('durSum') / attemptsTotal,
        bestScore: topAttempt?.totalScore ?? 0,
      }
    : undefined;
  const passedCount = passRows.find((r) => r._id === true)?.n ?? 0;

  // Fold the (question, correct, skipped) buckets into one row per question
  const stats = new Map<string, { responses: number; correct: number; skipped: number; timeSum: number }>();
  for (const r of perQuestionRows) {
    const key = r._id.q.toString();
    const row = stats.get(key) ?? { responses: 0, correct: 0, skipped: 0, timeSum: 0 };
    row.responses += r.n;
    row.timeSum += r.timeSum;
    if (r._id.correct) row.correct += r.n;
    if (r._id.skipped) row.skipped += r.n;
    stats.set(key, row);
  }

  const questions = await Question.find({ _id: { $in: quiz.questionIds } }).select('text difficulty points').lean();

  return {
    summary: {
      attempts: s?.attempts ?? 0,
      players: s?.players ?? 0,
      avgScore: s ? Math.round(s.avgScore) : 0,
      avgAccuracy: s ? Number(s.avgAccuracy.toFixed(4)) : 0,
      avgDurationSeconds: s ? Math.round(s.avgDuration) : 0,
      passRate: s && s.attempts ? Number((passedCount / s.attempts).toFixed(4)) : 0,
      bestScore: s?.bestScore ?? 0,
    },
    // Hardest questions first - exactly what a teacher wants to revise in class
    questions: quiz.questionIds
      .map((id, index) => {
        const q = questions.find((x) => x._id.toString() === id.toString());
        const st = stats.get(id.toString());
        const responses = st?.responses ?? 0;
        return {
          questionId: id.toString(),
          order: index + 1,
          text: q?.text ?? '(question removed)',
          difficulty: q?.difficulty,
          responses,
          skipped: st?.skipped ?? 0,
          correct: st?.correct ?? 0,
          correctRate: responses ? Number(((st?.correct ?? 0) / responses).toFixed(4)) : null,
          avgTimeSeconds: st && responses ? Number((st.timeSum / responses).toFixed(1)) : null,
        };
      })
      .sort((a, b) => (a.correctRate ?? 2) - (b.correctRate ?? 2)),
  };
}
