import { z } from 'zod';

/**
 * Strong password regex: at least one uppercase, one lowercase, one digit, one special char.
 */
const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;

/**
 * Indian phone format: optional +91, then 10 digits starting with 6-9.
 */
const indianPhoneRegex = /^(\+91)?[6-9]\d{9}$/;

/**
 * Helper: calculate age from a date of birth string or Date object.
 */
export function calculateAge(dob: string | Date): number {
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// ─── Register ─────────────────────────────────────────────────
export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be at most 100 characters'),
    email: z.string().trim().email('Invalid email address').toLowerCase(),
    phone: z.string().regex(indianPhoneRegex, 'Invalid Indian phone number'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        strongPasswordRegex,
        'Password must include uppercase, lowercase, number, and special character'
      ),
    confirmPassword: z.string(),
    dateOfBirth: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format')
      .refine(
        (val) => new Date(val) < new Date(),
        'Date of birth must be in the past'
      ),
    educationLevel: z.string().min(1, 'Education level is required'),
    institution: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().default('India'),
    guardianName: z.string().optional(),
    guardianPhone: z
      .string()
      .regex(indianPhoneRegex, 'Invalid guardian phone number')
      .optional(),
    guardianEmail: z.string().email('Invalid guardian email').optional(),
    guardianConsent: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .superRefine((data, ctx) => {
    const age = calculateAge(data.dateOfBirth);
    const isMinor = age < 18;

    if (isMinor) {
      if (!data.guardianName || data.guardianName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Guardian name is required for users under 18',
          path: ['guardianName'],
        });
      }
      if (!data.guardianPhone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Guardian phone is required for users under 18',
          path: ['guardianPhone'],
        });
      }
      if (!data.guardianEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Guardian email is required for users under 18',
          path: ['guardianEmail'],
        });
      }
      if (data.guardianConsent !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Guardian consent is required for users under 18',
          path: ['guardianConsent'],
        });
      }
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Login ────────────────────────────────────────────────────
export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Email or phone is required')
    .refine(
      (val) =>
        z.string().email().safeParse(val).success ||
        indianPhoneRegex.test(val),
      'Must be a valid email or Indian phone number'
    ),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Forgot Password ─────────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ─── Reset Password ──────────────────────────────────────────
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        strongPasswordRegex,
        'Password must include uppercase, lowercase, number, and special character'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ─── Verify Email ─────────────────────────────────────────────
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
