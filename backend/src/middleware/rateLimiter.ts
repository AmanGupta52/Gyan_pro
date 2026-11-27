import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Auth routes limiter: 10 requests per 15-minute window.
 * Protects login/register from brute-force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again after 15 minutes',
    },
  },
});

/**
 * General API limiter: 100 requests per 15-minute window.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  // Solo quizzes make many small requests; they have their own per-student limiter below
  skip: (req) => req.path.startsWith('/solo'),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later',
    },
  },
});

/**
 * Strict limiter: 5 requests per 15-minute window.
 * For sensitive operations like forgot-password.
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again after 15 minutes',
    },
  },
});

/**
 * Solo play limiter: 400 requests per 15 minutes PER STUDENT (not per IP).
 * A 20-question quiz uses ~45 requests, and a whole classroom often shares one school
 * Wi-Fi IP, so an IP-based limit would lock out everyone after a handful of students.
 */
function perUserKey(req: Request): string {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      return `user:${verifyAccessToken(header.slice(7)).userId}`;
    } catch {
      /* invalid token: fall back to IP and let authenticate() reject it */
    }
  }
  return `ip:${req.ip ?? 'unknown'}`;
}

export const soloLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  keyGenerator: perUserKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'You are going a bit too fast. Please wait a moment and try again.',
    },
  },
});
