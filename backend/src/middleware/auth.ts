import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import type { UserRole } from '../types/index.js';

/**
 * Authentication middleware.
 * Extracts the JWT from the Authorization header, verifies it,
 * and attaches the decoded payload to req.user.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Missing or malformed authorization header'));
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(AppError.unauthorized('No token provided'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    return next(AppError.unauthorized('Invalid or expired access token'));
  }
}

/**
 * Authorization middleware factory.
 * Checks that the authenticated user's role is in the allowed list.
 *
 * @param roles - Roles allowed to access the route
 *
 * Usage: router.get('/admin', authenticate, authorize('admin', 'superAdmin'), handler)
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
}
