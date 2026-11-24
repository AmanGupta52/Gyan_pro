import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Global Express error handler.
 * Normalises all error types into the standard API error shape:
 *   { error: { code, message, details? } }
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ── Zod Validation Error → 400 ─────────────────────────────
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    });
    return;
  }

  // ── AppError (our own operational errors) ──────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // ── Mongoose ValidationError → 400 ────────────────────────
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    });
    return;
  }

  // ── Mongoose CastError (invalid ObjectId, etc.) → 400 ─────
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      error: {
        code: 'CAST_ERROR',
        message: `Invalid value for ${err.path}: ${err.value}`,
      },
    });
    return;
  }

  // ── MongoDB duplicate key error (code 11000) → 409 ────────
  if (isDuplicateKeyError(err)) {
    const field = extractDuplicateField(err);
    res.status(409).json({
      error: {
        code: 'DUPLICATE_KEY',
        message: `A record with this ${field} already exists`,
      },
    });
    return;
  }

  // ── JWT errors → 401 ──────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
      },
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired',
      },
    });
    return;
  }

  // ── Unknown / unexpected errors ────────────────────────────
  logger.error({ err }, 'Unhandled error');

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message:
        env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message || 'An unexpected error occurred',
      ...(env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────

interface MongoServerError extends Error {
  code?: number;
  keyPattern?: Record<string, number>;
}

function isDuplicateKeyError(err: Error): err is MongoServerError {
  return (err as MongoServerError).code === 11000;
}

function extractDuplicateField(err: MongoServerError): string {
  if (err.keyPattern) {
    return Object.keys(err.keyPattern).join(', ');
  }
  // Fallback: try to parse from message
  const match = err.message.match(/index:\s+(\w+)/);
  return match ? match[1] : 'field';
}
