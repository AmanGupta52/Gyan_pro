import { z } from 'zod';

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const createQuestionSchema = z.object({
  text: z.string().min(3, 'Question text must be at least 3 characters'),
  type: z.enum(['single_choice', 'multiple_correct', 'true_false', 'image_question']),
  options: z.array(optionSchema).min(2, 'At least 2 options are required'),
  correctAnswers: z.array(z.string()).min(1, 'At least one correct answer must be provided'),
  explanation: z.string().optional(),
  subjectId: z.string().min(1, 'Subject is required'),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  educationLevel: z.string().min(1, 'Education level category is required'),
  points: z.number().int().positive().optional(),
  timeLimit: z.number().int().min(5).max(300).optional(),
  image: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateQuestionSchema = createQuestionSchema.partial();
