import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service.js';
import { logger } from '../utils/logger.js';
import type { IUser, TokenPair, PublicUser } from '../types/index.js';
import type { RegisterInput } from '../validators/auth.validator.js';

// ─── Helper: calculate age from DOB ──────────────────────────
function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// ─── Helper: generate token pair for a user ──────────────────
function generateTokens(user: IUser): TokenPair {
  const payload = { userId: user._id.toString(), role: user.role };
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Register a new user account.
 *
 * - Checks for duplicate email/phone
 * - Hashes password with argon2
 * - Enforces guardian fields for minors
 * - Sends verification email
 * - Returns token pair and public user
 */
export async function register(
  data: RegisterInput
): Promise<{ tokens: TokenPair; user: PublicUser }> {
  // Check for existing email
  const existingEmail = await User.findOne({ email: data.email });
  if (existingEmail) {
    throw AppError.conflict('An account with this email already exists');
  }

  // Check for existing phone
  if (data.phone) {
    const existingPhone = await User.findOne({ phone: data.phone });
    if (existingPhone) {
      throw AppError.conflict('An account with this phone number already exists');
    }
  }

  // Hash password
  const hashedPassword = await hashPassword(data.password);

  // Calculate minor status
  const dob = new Date(data.dateOfBirth);
  const age = calculateAge(dob);
  const isMinor = age < 18;

  // Build user document
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');

  const userData: Partial<IUser> = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    password: hashedPassword,
    dateOfBirth: dob,
    educationLevel: data.educationLevel,
    institution: data.institution,
    city: data.city,
    state: data.state,
    country: data.country,
    emailVerificationToken: crypto
      .createHash('sha256')
      .update(emailVerificationToken)
      .digest('hex'),
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  };

  // Guardian fields for minors
  if (isMinor) {
    if (!data.guardianName || !data.guardianPhone || !data.guardianEmail) {
      throw AppError.badRequest(
        'Guardian name, phone, and email are required for users under 18'
      );
    }
    userData.guardianName = data.guardianName;
    userData.guardianPhone = data.guardianPhone;
    userData.guardianEmail = data.guardianEmail;
    userData.guardianConsentAt = new Date();
  }

  const user = await User.create(userData);

  // Generate tokens
  const tokens = generateTokens(user);

  // Save refresh token to user
  user.refreshToken = tokens.refreshToken;
  await user.save();

  // Send verification email (non-blocking — don't fail registration if email fails)
  sendVerificationEmail(user, emailVerificationToken).catch((err) => {
    logger.error({ err, userId: user._id }, 'Failed to send verification email');
  });

  logger.info({ userId: user._id, email: user.email }, 'User registered');

  return { tokens, user: user.toPublicJSON() };
}

/**
 * Authenticate a user by email or phone + password.
 *
 * Returns token pair and public user data.
 */
export async function login(
  identifier: string,
  password: string
): Promise<{ tokens: TokenPair; user: PublicUser }> {
  // Determine whether identifier is email or phone
  const trimmed = identifier.trim();
  const isEmail = trimmed.includes('@');
  const query = isEmail ? { email: trimmed.toLowerCase() } : { phone: trimmed };

  const user = await User.findOne(query).select('+password');
  if (!user) {
    throw AppError.unauthorized('Invalid email or password');
  }

  // Verify password FIRST so that account state is never revealed to someone
  // who does not know the password.
  const isMatch = await verifyPassword(user.password, password).catch(() => false);
  if (!isMatch) {
    throw AppError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw AppError.forbidden('Account is deactivated. Contact support.');
  }

  // Generate tokens
  const tokens = generateTokens(user);

  // Save refresh token and update last login
  user.refreshToken = tokens.refreshToken;
  user.lastLoginAt = new Date();
  await user.save();

  logger.info({ userId: user._id }, 'User logged in');

  return { tokens, user: user.toPublicJSON() };
}

/**
 * Refresh the token pair using a valid refresh token.
 * Implements token rotation: old refresh token is replaced.
 */
export async function refreshTokens(
  token: string
): Promise<{ tokens: TokenPair; user: PublicUser }> {
  // Verify the refresh token
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  // Find user and check stored refresh token matches
  const user = await User.findById(payload.userId).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    // Potential token reuse attack — clear all tokens
    if (user) {
      user.refreshToken = undefined;
      await user.save();
      logger.warn({ userId: user._id }, '⚠️ Refresh token reuse detected — tokens cleared');
    }
    throw AppError.unauthorized('Invalid refresh token — please log in again');
  }

  if (!user.isActive) {
    throw AppError.forbidden('Account is deactivated');
  }

  // Rotate tokens
  const newTokens = generateTokens(user);
  user.refreshToken = newTokens.refreshToken;
  await user.save();

  return { tokens: newTokens, user: user.toPublicJSON() };
}

/**
 * Log out by clearing the user's refresh token.
 */
export async function logout(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
  logger.info({ userId }, 'User logged out');
}

/**
 * Get the authenticated user's public profile.
 */
export async function getMe(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  return user.toPublicJSON();
}

/**
 * Verify a user's email address using the token sent during registration.
 */
export async function verifyEmail(token: string): Promise<void> {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    throw AppError.badRequest('Invalid or expired verification token');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  logger.info({ userId: user._id }, 'Email verified');
}

/**
 * Initiate password reset by generating a reset token and sending email.
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() });

  // Don't reveal whether the email exists — always return success
  if (!user) {
    logger.info({ email }, 'Password reset requested for non-existent email');
    return;
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  // Send reset email
  try {
    await sendPasswordResetEmail(user, resetToken);
  } catch (err) {
    // Clear the token if email fails
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    logger.error({ err, userId: user._id }, 'Failed to send password reset email');
    throw AppError.internal('Failed to send password reset email');
  }

  logger.info({ userId: user._id }, 'Password reset email sent');
}

/**
 * Reset password using the token from the reset email.
 * Clears all refresh tokens to force re-login on all devices.
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires +refreshToken');

  if (!user) {
    throw AppError.badRequest('Invalid or expired reset token');
  }

  // Hash new password and save
  user.password = await hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken = undefined; // force re-login everywhere
  await user.save();

  logger.info({ userId: user._id }, 'Password reset successfully');
}
