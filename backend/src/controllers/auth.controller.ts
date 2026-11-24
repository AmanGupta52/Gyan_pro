import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/auth.service.js';
import { env } from '../config/env.js';

/** Cookie options for refresh token */
const REFRESH_COOKIE_NAME = 'refreshToken';

function getRefreshCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
} {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

/**
 * POST /api/auth/register
 * Register a new user account.
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { tokens, user } = await authService.register(req.body);

  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, getRefreshCookieOptions());

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please verify your email.',
    data: {
      accessToken: tokens.accessToken,
      user,
    },
  });
});

/**
 * POST /api/auth/login
 * Authenticate and return tokens.
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  const { tokens, user } = await authService.login(identifier, password);

  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, getRefreshCookieOptions());

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken, // Returned for native mobile secure storage
      user,
    },
  });
});

/**
 * POST /api/auth/refresh-token
 * Refresh the token pair using the refresh token cookie.
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  // Try cookie first, then body
  const token: string | undefined =
    req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

  if (!token) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Refresh token is required',
      },
    });
    return;
  }

  const tokens = await authService.refreshTokens(token);

  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, getRefreshCookieOptions());

  res.status(200).json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken, // For native mobile token rotation
    },
  });
});

/**
 * POST /api/auth/logout
 * Clear refresh token and cookie.
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.user!.userId);

  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user's profile.
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.userId);

  res.status(200).json({
    success: true,
    data: { user },
  });
});

/**
 * POST /api/auth/verify-email
 * Verify user's email address.
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.body.token);

  res.status(200).json({
    success: true,
    message: 'Email verified successfully',
  });
});

/**
 * POST /api/auth/forgot-password
 * Send password reset email.
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);

  // Always return success to prevent email enumeration
  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a reset link has been sent',
  });
});

/**
 * POST /api/auth/reset-password
 * Reset password using the token from the email.
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.password);

  res.status(200).json({
    success: true,
    message: 'Password reset successful. Please log in with your new password.',
  });
});
