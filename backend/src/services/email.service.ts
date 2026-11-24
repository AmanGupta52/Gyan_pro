import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { IUser } from '../types/index.js';

/**
 * Send an email. In development mode, logs the email to console instead.
 * In production, uses the configured SMTP transport.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
    logger.info(
      { to, subject, htmlLength: html.length },
      '📧 [DEV] Email would be sent'
    );
    logger.debug({ to, subject, html }, '📧 [DEV] Email content');
    return;
  }

  // Production transport — configure with your SMTP/transactional email provider
  const transport = nodemailer.createTransport({
    // Generic SMTP config — replace with your provider (SES, SendGrid, etc.)
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: env.EMAIL_FROM,
      pass: env.EMAIL_PROVIDER_KEY,
    },
  });

  await transport.sendMail({
    from: `"GYAN-26" <${env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  });

  logger.info({ to, subject }, '📧 Email sent successfully');
}

/**
 * Send a verification email with a tokenised link.
 */
export async function sendVerificationEmail(
  user: IUser,
  token: string
): Promise<void> {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: #2563eb;">GYAN-26</h1>
      </div>
      <div style="background: #f8fafc; border-radius: 8px; padding: 30px;">
        <h2 style="color: #1e293b;">Verify your email address</h2>
        <p style="color: #475569;">Hi <strong>${user.name}</strong>,</p>
        <p style="color: #475569;">
          Thank you for registering on GYAN-26! Please click the button below to verify your email address.
        </p>
        <div style="text-align: center; padding: 20px 0;">
          <a href="${verifyUrl}"
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px;
                    border-radius: 6px; text-decoration: none; font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">
          This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    </body>
    </html>
  `;

  await sendEmail(user.email, 'Verify your email — GYAN-26', html);
}

/**
 * Send a password reset email with a tokenised link.
 */
export async function sendPasswordResetEmail(
  user: IUser,
  token: string
): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: #2563eb;">GYAN-26</h1>
      </div>
      <div style="background: #f8fafc; border-radius: 8px; padding: 30px;">
        <h2 style="color: #1e293b;">Reset your password</h2>
        <p style="color: #475569;">Hi <strong>${user.name}</strong>,</p>
        <p style="color: #475569;">
          You requested a password reset. Click the button below to set a new password.
        </p>
        <div style="text-align: center; padding: 20px 0;">
          <a href="${resetUrl}"
             style="display: inline-block; background: #dc2626; color: white; padding: 12px 32px;
                    border-radius: 6px; text-decoration: none; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">
          This link expires in 1 hour. If you didn't request a reset, please ignore this email.
        </p>
      </div>
    </body>
    </html>
  `;

  await sendEmail(user.email, 'Password reset — GYAN-26', html);
}
