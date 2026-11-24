import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Which part of the request to validate.
 */
type ValidationSource = 'body' | 'query' | 'params';

/**
 * Express middleware factory that validates a request property against a Zod schema.
 *
 * @param schema - Zod schema to validate against
 * @param source - Which part of the request to validate (default: 'body')
 *
 * On success, replaces the request property with the parsed (typed, stripped) value.
 * On failure, returns a 400 response with structured error details.
 */
export function validate(schema: ZodSchema, source: ValidationSource = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source];
    const result = schema.safeParse(data);

    if (!result.success) {
      const details = formatZodError(result.error);

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
        },
      });
      return;
    }

    // Replace with parsed (cleaned) data
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}

/**
 * Transform ZodError into a human-readable array of field errors.
 */
function formatZodError(error: ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}
