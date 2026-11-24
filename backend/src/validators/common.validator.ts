import { z } from 'zod';

/**
 * Validates a MongoDB ObjectId string (24-char hex).
 */
export const mongoIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

/**
 * Validates pagination query params.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sort: z.string().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
