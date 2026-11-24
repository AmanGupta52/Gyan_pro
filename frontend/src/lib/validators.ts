import { z } from 'zod';

/* ─────────────────────────────────────────────
 * Client-side Zod schemas
 * Mirror backend validation for instant UX feedback.
 * ───────────────────────────────────────────── */

// ── Helpers ───────────────────────────────────

const phoneRegex = /^\+?[1-9]\d{7,14}$/;

const passwordRules = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must include an uppercase letter')
  .regex(/[a-z]/, 'Must include a lowercase letter')
  .regex(/[0-9]/, 'Must include a number')
  .regex(/[^A-Za-z0-9]/, 'Must include a special character');

// ── Login ─────────────────────────────────────

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Email or phone is required')
    .refine(
      (val) => {
        // Accept a valid email OR a valid phone number
        const isEmail = z.string().email().safeParse(val).success;
        const isPhone = phoneRegex.test(val.replace(/[\s\-()]/g, ''));
        return isEmail || isPhone;
      },
      { message: 'Enter a valid email or phone number' },
    ),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// ── Registration Step 1: Account ──────────────

export const registerStep1Schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Enter a valid email address'),
    phone: z
      .string()
      .min(1, 'Phone number is required')
      .refine((val) => phoneRegex.test(val.replace(/[\s\-()]/g, '')), {
        message: 'Enter a valid phone number',
      }),
    password: passwordRules,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterStep1Values = z.infer<typeof registerStep1Schema>;

// ── Registration Step 2: Personal ─────────────

export const registerStep2Schema = z
  .object({
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    country: z.string().min(1, 'Country is required'),
    // Guardian fields (required if minor, optional otherwise)
    guardianName: z.string().optional(),
    guardianPhone: z.string().optional(),
    guardianEmail: z.string().optional(),
    guardianConsent: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Determine if user is a minor
    const dob = new Date(data.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      if (!data.guardianName || data.guardianName.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Guardian name is required for minors',
          path: ['guardianName'],
        });
      }
      if (!data.guardianPhone || !phoneRegex.test(data.guardianPhone.replace(/[\s\-()]/g, ''))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Valid guardian phone is required',
          path: ['guardianPhone'],
        });
      }
      if (!data.guardianEmail || !z.string().email().safeParse(data.guardianEmail).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Valid guardian email is required',
          path: ['guardianEmail'],
        });
      }
      if (!data.guardianConsent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Guardian consent is required under the DPDP Act',
          path: ['guardianConsent'],
        });
      }
    }
  });

export type RegisterStep2Values = z.infer<typeof registerStep2Schema>;

// ── Registration Step 3: Education ────────────

export const registerStep3Schema = z.object({
  educationLevel: z.string().min(1, 'Education level is required'),
  institution: z.string().min(2, 'Institution name is required'),
});

export type RegisterStep3Values = z.infer<typeof registerStep3Schema>;

// ── Combined registration (for final submit) ──

export const registerSchema = registerStep1Schema
  .and(registerStep2Schema)
  .and(registerStep3Schema);

export type RegisterFormValues = z.infer<typeof registerSchema>;

// ── Forgot / Reset Password ───────────────────

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordRules,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
