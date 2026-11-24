import type { Request, Response, NextFunction } from 'express';

/**
 * Custom NoSQL injection sanitizer middleware.
 *
 * Recursively traverses req.body, req.query, and req.params to:
 *  - Remove object keys starting with '$'
 *  - Remove object keys containing '.'
 *  - Strip '$' operator patterns from string values
 *
 * This is a defence-in-depth measure — always use parameterised queries too.
 */
export function sanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query) as typeof req.query;
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params) as typeof req.params;
  }
  next();
}

/**
 * Recursively sanitize a value.
 * - Arrays: sanitize each element
 * - Objects: drop dangerous keys, recurse into remaining values
 * - Strings: strip MongoDB operator patterns like "$gt", "$ne", etc.
 * - Other primitives: pass through unchanged
 */
function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // Sanitize strings — strip $ operators
  if (typeof value === 'string') {
    // Remove any occurrence of MongoDB operators like $gt, $ne, $or, etc.
    return value.replace(/\$(?:gt|gte|lt|lte|ne|eq|in|nin|or|and|not|nor|regex|where|exists|type|mod|all|size|elemMatch)\b/gi, '');
  }

  // Sanitize arrays
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  // Sanitize objects
  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // Skip keys starting with '$' (NoSQL injection operator)
      if (key.startsWith('$')) {
        continue;
      }
      // Skip keys containing '.' (field path traversal)
      if (key.includes('.')) {
        continue;
      }
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }

  // Primitives (number, boolean) — pass through
  return value;
}
