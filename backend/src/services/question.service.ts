import mongoose from 'mongoose';
import { Question, type IQuestion, type QuestionType, type QuestionDifficulty } from '../models/Question.js';
import { CompetitionQuestion } from '../models/CompetitionQuestion.js';
import { Quiz } from '../models/Quiz.js';
import { User } from '../models/User.js';
import { canManageContent, isModerator } from '../utils/roles.js';
import type { AuthPayload } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { logAudit } from './audit.service.js';

export interface CreateQuestionInput {
  text: string;
  type: QuestionType;
  options: Array<{ id: string; text: string }>;
  correctAnswers: string[];
  explanation?: string;
  subjectId: string;
  difficulty: QuestionDifficulty;
  educationLevel: string;
  points?: number;
  timeLimit?: number;
  image?: string;
  status?: 'draft' | 'published';
  tags?: string[];
}

export interface QuestionBankFilterParams {
  educationLevel?: string;
  subjectId?: string;
  difficulty?: string;
  type?: string;
  status?: string;
  search?: string;
  /** Only questions created by the requesting user */
  mine?: boolean;
  page?: number;
  limit?: number;
}

/** Ids of admins/superAdmins: their questions form the shared, curated bank. */
export async function getSharedAuthorIds() {
  return User.find({ role: { $in: ['admin', 'superAdmin'] } }).distinct('_id');
}

export async function createQuestion(adminId: string, data: CreateQuestionInput, ipAddress?: string) {
  // Validate correct answers exist in options
  const optionIds = new Set(data.options.map((o) => o.id));
  for (const ans of data.correctAnswers) {
    if (!optionIds.has(ans)) {
      throw AppError.badRequest(`Correct answer option "${ans}" does not exist in options list.`);
    }
  }

  // Type-specific validations
  if (data.type === 'single_choice' || data.type === 'true_false') {
    if (data.correctAnswers.length !== 1) {
      throw AppError.badRequest(`${data.type} must have exactly 1 correct answer.`);
    }
  }

  const question = await Question.create({
    ...data,
    points: data.points || 100,
    timeLimit: data.timeLimit || 30,
    status: data.status || 'published',
    createdBy: adminId,
  });

  await logAudit({
    userId: adminId,
    action: 'QUESTION_CREATE',
    entityType: 'Question',
    entityId: question._id.toString(),
    details: { text: data.text, educationLevel: data.educationLevel, type: data.type },
    ipAddress,
  });

  return question;
}

/**
 * Question bank listing for STAFF (teacher / admin / superAdmin).
 * - admin/superAdmin: whole bank
 * - teacher: own questions + the shared bank written by admins
 * Players never use this; they only receive questions through a running game/attempt.
 */
export async function getQuestionBank(params: QuestionBankFilterParams, actor: AuthPayload) {
  const { educationLevel, subjectId, difficulty, type, status, search, mine, page = 1, limit = 20 } = params;

  const filter: Record<string, unknown> = {};

  if (educationLevel && educationLevel !== 'all') {
    filter.educationLevel = educationLevel;
  }
  if (subjectId && subjectId !== 'all') {
    filter.subjectId = subjectId;
  }
  if (difficulty && difficulty !== 'all') {
    filter.difficulty = difficulty;
  }
  if (type && type !== 'all') {
    filter.type = type;
  }
  if (status && status !== 'all') {
    filter.status = status;
  }
  if (search && search.trim()) {
    filter.text = { $regex: new RegExp(escapeRegex(search.trim()), 'i') };
  }

  if (mine) {
    filter.createdBy = actor.userId;
  } else if (!isModerator(actor.role)) {
    const sharedIds = await getSharedAuthorIds();
    filter.$or = [{ createdBy: actor.userId }, { createdBy: { $in: sharedIds } }];
  }

  const skip = (page - 1) * limit;

  const [questions, total] = await Promise.all([
    Question.find(filter)
      .select('+correctAnswers +explanation')
      .populate('subjectId', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Question.countDocuments(filter),
  ]);

  return {
    questions,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getQuestionById(questionId: string, actor: AuthPayload) {
  const question = await Question.findById(questionId)
    .select('+correctAnswers +explanation')
    .populate('subjectId', 'name code')
    .lean();

  if (!question) {
    throw AppError.notFound('Question not found');
  }

  if (!isModerator(actor.role) && question.createdBy.toString() !== actor.userId) {
    const sharedIds = (await getSharedAuthorIds()).map((id) => id.toString());
    if (!sharedIds.includes(question.createdBy.toString())) {
      throw AppError.forbidden('You do not have access to this question.');
    }
  }

  return question;
}

export async function updateQuestion(
  questionId: string,
  actor: AuthPayload,
  updates: Partial<CreateQuestionInput>,
  ipAddress?: string
) {
  const adminId = actor.userId;
  const question = await Question.findById(questionId).select('+correctAnswers +explanation');
  if (!question) {
    throw AppError.notFound('Question not found');
  }
  if (!canManageContent(actor, question.createdBy.toString())) {
    throw AppError.forbidden('You can only edit questions you created.');
  }

  if (updates.options) {
    question.options = updates.options;
  }
  if (updates.correctAnswers) {
    question.correctAnswers = updates.correctAnswers;
  }
  if (updates.text) question.text = updates.text.trim();
  if (updates.type) question.type = updates.type;
  if (updates.explanation !== undefined) question.explanation = updates.explanation;
  if (updates.subjectId) question.subjectId = new mongoose.Types.ObjectId(updates.subjectId);
  if (updates.difficulty) question.difficulty = updates.difficulty;
  if (updates.educationLevel) question.educationLevel = updates.educationLevel;
  if (updates.points !== undefined) question.points = updates.points;
  if (updates.timeLimit !== undefined) question.timeLimit = updates.timeLimit;
  if (updates.image !== undefined) question.image = updates.image;
  if (updates.status) question.status = updates.status;
  if (updates.tags) question.tags = updates.tags;

  await question.save();

  await logAudit({
    userId: adminId,
    action: 'QUESTION_UPDATE',
    entityType: 'Question',
    entityId: question._id.toString(),
    details: { updates },
    ipAddress,
  });

  return Question.findById(questionId).select('+correctAnswers +explanation').lean();
}

export async function deleteQuestion(questionId: string, actor: AuthPayload, ipAddress?: string) {
  const adminId = actor.userId;
  const existing = await Question.findById(questionId).select('createdBy');
  if (!existing) {
    throw AppError.notFound('Question not found');
  }
  if (!canManageContent(actor, existing.createdBy.toString())) {
    throw AppError.forbidden('You can only delete questions you created.');
  }

  const isUsed = await CompetitionQuestion.findOne({ questionId });
  if (isUsed) {
    throw AppError.badRequest(
      'Cannot delete question because it is attached to an existing competition.'
    );
  }
  const usedInQuiz = await Quiz.exists({ questionIds: questionId });
  if (usedInQuiz) {
    throw AppError.badRequest(
      'Cannot delete question because it is used in a quiz. Remove it from the quiz first.'
    );
  }

  const question = await Question.findByIdAndDelete(questionId);
  if (!question) {
    throw AppError.notFound('Question not found');
  }

  await logAudit({
    userId: adminId,
    action: 'QUESTION_DELETE',
    entityType: 'Question',
    entityId: questionId,
    details: { text: question.text },
    ipAddress,
  });

  return { message: 'Question deleted successfully' };
}

/**
 * Multiple-correct scoring evaluation engine
 *
 * @param selectedAnswers - Option IDs chosen by player
 * @param correctAnswers - True option IDs
 * @param basePoints - Total points for question
 * @param partialCredit - Whether partial scoring is enabled (default: false = all-or-nothing)
 * @param penalty - Penalty for selecting wrong option
 */
export function calculateMultipleCorrectScore(
  selectedAnswers: string[],
  correctAnswers: string[],
  basePoints = 100,
  partialCredit = false,
  penalty = 0
): number {
  if (!selectedAnswers || selectedAnswers.length === 0) return 0;

  const correctSet = new Set(correctAnswers);
  const selectedSet = new Set(selectedAnswers);

  if (!partialCredit) {
    // All-or-nothing: size must match and all selected must be correct
    if (selectedSet.size !== correctSet.size) return 0;
    for (const ans of selectedAnswers) {
      if (!correctSet.has(ans)) return 0;
    }
    return basePoints;
  }

  // Partial credit formula
  let correctHits = 0;
  let wrongHits = 0;

  for (const ans of selectedAnswers) {
    if (correctSet.has(ans)) {
      correctHits++;
    } else {
      wrongHits++;
    }
  }

  const earnedFraction = correctHits / correctAnswers.length;
  const score = earnedFraction * basePoints - wrongHits * penalty;
  return Math.max(0, Math.round(score));
}
