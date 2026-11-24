import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthPayload } from '../types/index.js';

/**
 * Generate a short-lived access token.
 * @param payload - userId and role to encode
 */
export function generateAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

/**
 * Generate a long-lived refresh token.
 * @param payload - userId and role to encode
 */
export function generateRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

/**
 * Verify an access token and return the decoded payload.
 * Throws if the token is invalid or expired.
 */
export function verifyAccessToken(token: string): AuthPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
}

/**
 * Verify a refresh token and return the decoded payload.
 * Throws if the token is invalid or expired.
 */
export function verifyRefreshToken(token: string): AuthPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthPayload;
}
