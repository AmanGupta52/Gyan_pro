import type { Document, Types } from 'mongoose';

// ─── User Roles ───────────────────────────────────────────────
export type UserRole = 'player' | 'admin' | 'superAdmin';

// ─── User Interface ───────────────────────────────────────────
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  dateOfBirth: Date;
  educationLevel: string;
  institution?: string;
  city?: string;
  state?: string;
  country: string;
  photo?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshToken?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianConsentAt?: Date;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  /** Virtual: true if user is under 18 */
  isMinor: boolean;

  /** Return user object without sensitive fields */
  toPublicJSON(): PublicUser;
}

// ─── Public User (no secrets) ─────────────────────────────────
export interface PublicUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  dateOfBirth: string;
  educationLevel: string;
  institution?: string;
  city?: string;
  state?: string;
  country: string;
  photo?: string;
  isEmailVerified: boolean;
  isMinor: boolean;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianConsentAt?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────
export interface AuthPayload {
  userId: string;
  role: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── Pagination ───────────────────────────────────────────────
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
}

// ─── Standard API Response ────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ─── Category ─────────────────────────────────────────────────
export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Express Request Augmentation ─────────────────────────────
declare global {
  namespace Express {
    interface Request {
      /** Authenticated user payload — set by auth middleware */
      user?: AuthPayload;
    }
  }
}
