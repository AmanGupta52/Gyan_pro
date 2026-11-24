import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(50),
  description: z.string().max(300).optional(),
  category: z.string().min(1, 'Category is required'),
  size: z.union([z.literal(2), z.literal(4), z.literal(6)], {
    errorMap: () => ({ message: 'Team size must be 2, 4, or 6' }),
  }),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(50).optional(),
  description: z.string().max(300).optional(),
});
