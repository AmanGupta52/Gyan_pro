/**
 * Pagination helper.
 * Parses query params into safe, bounded pagination values.
 */

/** Default pagination settings */
const DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
  sort: Record<string, 1 | -1>;
}

/**
 * Parse pagination parameters from request query.
 *
 * @param query - Express req.query object
 * @returns Bounded pagination values ready for Mongoose .skip().limit().sort()
 *
 * Supported query params:
 *   page   - Page number (1-based, default 1)
 *   limit  - Items per page (default 20, max 100)
 *   sort   - Sort field (prefix with - for descending, e.g. "-createdAt")
 */
export function parsePagination(
  query: Record<string, unknown>
): PaginationResult {
  // Parse page
  let page = Number(query.page);
  if (!Number.isFinite(page) || page < 1) {
    page = DEFAULTS.PAGE;
  }
  page = Math.floor(page);

  // Parse limit with upper bound
  let limit = Number(query.limit);
  if (!Number.isFinite(limit) || limit < 1) {
    limit = DEFAULTS.LIMIT;
  }
  limit = Math.min(Math.floor(limit), DEFAULTS.MAX_LIMIT);

  // Calculate skip
  const skip = (page - 1) * limit;

  // Parse sort — supports "-fieldName" for descending
  const sort: Record<string, 1 | -1> = {};
  if (typeof query.sort === 'string' && query.sort.trim()) {
    const fields = query.sort.split(',');
    for (const field of fields) {
      const trimmed = field.trim();
      if (trimmed.startsWith('-')) {
        sort[trimmed.slice(1)] = -1;
      } else {
        sort[trimmed] = 1;
      }
    }
  } else {
    // Default sort: newest first
    sort['createdAt'] = -1;
  }

  return { page, limit, skip, sort };
}
