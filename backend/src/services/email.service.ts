import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { IUser } from '../types/index.js';

/**
 * Email delivery via the EmailJS REST API (server-side).
 *
 * EmailJS setup (one-time):
 *  1. Create an Email Service  -> EMAILJS_SERVICE_ID
 *  2. Create ONE generic template -> EMAILJS_TEMPLATE_ID  (see README for the template body)
 *  3. Account > General > Public Key  -> EMAILJS_PUBLIC_KEY
 *  4. Account > Security: enable "Allow EmailJS API for non-browser applications"
 *     and copy the Private Key -> EMAILJS_PRIVATE_KEY
 *
 * The template must use these variables:
 *   {{to_email}} (To field), {{to_name}}, {{subject}}, {{{html_content}}} (triple braces = unescaped HTML)
 */

const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';
const REQUEST_TIMEOUT_MS = 15_000;

/** Escape user-supplied text before embedding it in HTML emails. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isEmailJsConfigured(): boolean {
  return Boolean(
    env.EMAILJS_SERVICE_ID &&
      env.EMAILJS_TEMPLATE_ID &&
      env.EMAILJS_PUBLIC_KEY &&
      env.EMAILJS_PRIVATE_KEY
  );
}

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

/**
 * Send an email through EmailJS.
 * - development/test or EmailJS not configured: logs the email instead of sending.
 * - production: throws on failure so callers can decide how to react.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, toName, subject, html } = options;

  if (env.NODE_ENV === 'test' || (env.NODE_ENV === 'development' && !isEmailJsConfigured())) {
    logger.info({ to, subject, htmlLength: html.length }, '📧 [DEV] Email would be sent (EmailJS not used)');
    return;
  }

  if (!isEmailJsConfigured()) {
    throw new Error('EmailJS is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(EMAILJS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        service_id: env.EMAILJS_SERVICE_ID,
        template_id: env.EMAILJS_TEMPLATE_ID,
        user_id: env.EMAILJS_PUBLIC_KEY,
        accessToken: env.EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: to,
          to_name: toName ?? to,
          from_name: env.EMAIL_FROM_NAME,
          subject,
          html_content: html,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`EmailJS responded ${response.status}: ${body.slice(0, 200)}`);
    }

    logger.info({ to, subject }, '📧 Email sent via EmailJS');
  } finally {
    clearTimeout(timeout);
  }
}

function layout(title: string, bodyHtml: string, buttonLabel: string, buttonUrl: string, color: string, footer: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: #2563eb; margin: 0;">GYAN-26</h1>
      </div>
      <div style="background: #f8fafc; border-radius: 8px; padding: 30px;">
        <h2 style="color: #1e293b; margin-top: 0;">${title}</h2>
        ${bodyHtml}
        <div style="text-align: center; padding: 20px 0;">
          <a href="${buttonUrl}"
             style="display: inline-block; background: ${color}; color: #ffffff; padding: 12px 32px;
                    border-radius: 6px; text-decoration: none; font-weight: bold;">
            ${buttonLabel}
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px;">If the button doesn't work, copy this link into your browser:<br>${buttonUrl}</p>
        <p style="color: #64748b; font-size: 12px;">${footer}</p>
      </div>
    </div>`;
}

/** Send a verification email with a tokenised link. */
export async function sendVerificationEmail(user: IUser, token: string): Promise<void> {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
  const html = layout(
    'Verify your email address',
    `<p style="color: #475569;">Hi <strong>${esc(user.name)}</strong>,</p>
     <p style="color: #475569;">Thank you for registering on GYAN-26! Please confirm your email address to register for competitions.</p>`,
    'Verify Email',
    verifyUrl,
    '#2563eb',
    "This link expires in 24 hours. If you didn't create an account, you can safely ignore this email."
  );
  await sendEmail({ to: user.email, toName: user.name, subject: 'Verify your email — GYAN-26', html });
}

/** Send a password reset email with a tokenised link. */
export async function sendPasswordResetEmail(user: IUser, token: string): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const html = layout(
    'Reset your password',
    `<p style="color: #475569;">Hi <strong>${esc(user.name)}</strong>,</p>
     <p style="color: #475569;">You requested a password reset. Click the button below to set a new password.</p>`,
    'Reset Password',
    resetUrl,
    '#dc2626',
    "This link expires in 1 hour and can be used once. If you didn't request a reset, please ignore this email."
  );
  await sendEmail({ to: user.email, toName: user.name, subject: 'Password reset — GYAN-26', html });
}

/** Invite a newly added teacher to set their password (reuses the password-reset page). */
export async function sendTeacherInviteEmail(user: IUser, token: string, invitedBy: string): Promise<void> {
  const setupUrl = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const html = layout(
    'Welcome to GYAN-26',
    `<p style="color: #475569;">Hi <strong>${esc(user.name)}</strong>,</p>
     <p style="color: #475569;"><strong>${esc(invitedBy)}</strong> added you as a <strong>Teacher</strong> on GYAN-26. You can create quizzes for students and see how they perform.</p>
     <p style="color: #475569;">Set your password to get started.</p>`,
    'Set My Password',
    setupUrl,
    '#2563eb',
    'This link expires in 48 hours and can be used once. After setting your password, log in with this email address.'
  );
  await sendEmail({ to: user.email, toName: user.name, subject: 'You have been added as a teacher — GYAN-26', html });
}
