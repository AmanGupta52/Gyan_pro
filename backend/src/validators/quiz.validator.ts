import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const quizFields = {
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().min(1, 'Category is required'),
  subjectId: objectId.optional().nullable(),
  questionIds: z.array(objectId).max(100, 'A quiz can have at most 100 questions'),
  visibility: z.enum(['public', 'unlisted']),
  timePerQuestionSeconds: z.number().int().min(5).max(300).optional().nullable(),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  maxAttempts: z.number().int().min(0).max(100),
  passPercent: z.number().int().min(0).max(100),
  showAnswers: z.enum(['after_each', 'after_finish', 'never']),
  speedBonusMax: z.number().int().min(0).max(500),
  penaltyWrong: z.number().int().min(0).max(500),
  certificateEnabled: z.boolean(),
  startAt: z.coerce.date().optional().nullable(),
  endAt: z.coerce.date().optional().nullable(),
};

export const createQuizSchema = z
  .object({
    ...quizFields,
    questionIds: quizFields.questionIds.default([]),
    visibility: quizFields.visibility.default('public'),
    shuffleQuestions: quizFields.shuffleQuestions.default(false),
    shuffleOptions: quizFields.shuffleOptions.default(false),
    maxAttempts: quizFields.maxAttempts.default(0),
    passPercent: quizFields.passPercent.default(40),
    showAnswers: quizFields.showAnswers.default('after_each'),
    speedBonusMax: quizFields.speedBonusMax.default(0),
    penaltyWrong: quizFields.penaltyWrong.default(0),
    certificateEnabled: quizFields.certificateEnabled.default(true),
  })
  .refine((d) => !d.startAt || !d.endAt || d.endAt > d.startAt, {
    message: 'End time must be after start time',
    path: ['endAt'],
  });

export const updateQuizSchema = z
  .object(quizFields)
  .partial()
  .refine((d) => !d.startAt || !d.endAt || d.endAt > d.startAt, {
    message: 'End time must be after start time',
    path: ['endAt'],
  });

export const quizStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
});

export const startAttemptSchema = z.union([
  z.object({
    mode: z.literal('quiz').default('quiz'),
    quizId: objectId,
    joinCode: z.string().trim().max(12).optional(),
    assignmentId: objectId.optional(),
  }),
  z.object({
    mode: z.literal('practice'),
    educationLevel: z.string().trim().min(1),
    subjectId: objectId.optional(),
    difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
    count: z.number().int().min(3).max(30).default(10),
    timePerQuestionSeconds: z.number().int().min(5).max(300).optional(),
  }),
]);

export const submitAnswerSchema = z.object({
  questionId: objectId,
  selectedOptions: z.array(z.string().min(1).max(10)).max(10),
});

export const createTeacherSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: z
    .string()
    .trim()
    .regex(/^(\+91)?[6-9]\d{9}$/, 'Invalid Indian phone number')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  institution: z.string().trim().max(150).optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(['player', 'teacher', 'admin', 'superAdmin']),
});
