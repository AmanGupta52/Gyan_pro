/**
 * Custom application error with structured error metadata.
 * All expected/operational errors should use this class.
 */
export class AppError extends Error {
  /** HTTP status code */
  public readonly statusCode: number;

  /** Machine-readable error code (e.g. 'VALIDATION_ERROR', 'NOT_FOUND') */
  public readonly code: string;

  /** Whether this is an expected (operational) error vs a programmer bug */
  public readonly isOperational: boolean;

  /** Optional structured error details (e.g. field-level validation errors) */
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  // ─── Factory methods ────────────────────────────────────────

  /** 400 Bad Request */
  static badRequest(message = 'Bad request', details?: unknown): AppError {
    return new AppError(message, 400, 'BAD_REQUEST', true, details);
  }

  /** 401 Unauthorized */
  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  /** 403 Forbidden */
  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  /** 404 Not Found */
  static notFound(message = 'Resource not found'): AppError {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  /** 409 Conflict (duplicate resource, etc.) */
  static conflict(message = 'Resource already exists'): AppError {
    return new AppError(message, 409, 'CONFLICT');
  }

  /** 500 Internal Server Error */
  static internal(message = 'Internal server error'): AppError {
    return new AppError(message, 500, 'INTERNAL_ERROR', false);
  }
}
