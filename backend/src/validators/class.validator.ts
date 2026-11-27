import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createClassSchema = z.object({
  name: z.string().trim().min(2, 'Class name must be at least 2 characters').max(80),
  description: z.string().trim().max(500).optional(),
});

export const updateClassSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(500).nullable(),
    status: z.enum(['active', 'archived']),
  })
  .partial();

export const addMembersSchema = z.object({
  emails: z
    .array(z.string().trim().toLowerCase().email('Invalid email address'))
    .min(1, 'Add at least one email')
    .max(200, 'Add at most 200 students at a time'),
});

export const joinClassSchema = z.object({
  code: z.string().trim().min(4, 'Enter the class code').max(12),
});

export const createAssignmentSchema = z
  .object({
    quizId: objectId,
    dueAt: z.coerce.date(),
    openAt: z.coerce.date().optional().nullable(),
    allowLate: z.boolean().default(false),
    note: z.string().trim().max(500).optional(),
  })
  .refine((d) => !d.openAt || d.dueAt > d.openAt, {
    message: 'The deadline must be after the opening time',
    path: ['dueAt'],
  });

export const updateAssignmentSchema = z
  .object({
    dueAt: z.coerce.date(),
    openAt: z.coerce.date(),
    allowLate: z.boolean(),
    note: z.string().trim().max(500).nullable(),
  })
  .partial();
