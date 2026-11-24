import mongoose, { Schema, type Model } from 'mongoose';
import type { IUser, PublicUser } from '../types/index.js';

// ─── Schema ───────────────────────────────────────────────────
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must be at most 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // never returned by default
    },
    role: {
      type: String,
      enum: {
        values: ['player', 'admin', 'superAdmin'] as const,
        message: '{VALUE} is not a valid role',
      },
      default: 'player',
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    educationLevel: {
      type: String,
      required: [true, 'Education level is required'],
    },
    institution: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String, default: 'India' },
    photo: { type: String }, // Cloudinary URL

    // Email verification
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    // Password reset
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // Refresh token (single-device; rotate on each refresh)
    refreshToken: { type: String, select: false },

    // Guardian info (for minors)
    guardianName: { type: String },
    guardianPhone: { type: String },
    guardianEmail: { type: String },
    guardianConsentAt: { type: Date },

    // Status
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: isMinor ─────────────────────────────────────────
userSchema.virtual('isMinor').get(function (this: IUser): boolean {
  if (!this.dateOfBirth) return false;
  const today = new Date();
  const dob = new Date(this.dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age < 18;
});

// ─── Indexes ──────────────────────────────────────────────────
// email unique index is created by { unique: true } on the field
// phone unique sparse index is created by { unique: true, sparse: true } on the field
userSchema.index({ role: 1 });
userSchema.index({ isEmailVerified: 1 });

// ─── Instance Method: toPublicJSON ────────────────────────────
userSchema.methods.toPublicJSON = function (this: IUser): PublicUser {
  return {
    _id: this._id.toString(),
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    dateOfBirth: this.dateOfBirth.toISOString(),
    educationLevel: this.educationLevel,
    institution: this.institution,
    city: this.city,
    state: this.state,
    country: this.country,
    photo: this.photo,
    isEmailVerified: this.isEmailVerified,
    isMinor: this.isMinor,
    guardianName: this.guardianName,
    guardianPhone: this.guardianPhone,
    guardianEmail: this.guardianEmail,
    guardianConsentAt: this.guardianConsentAt?.toISOString(),
    isActive: this.isActive,
    lastLoginAt: this.lastLoginAt?.toISOString(),
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

// ─── Export ───────────────────────────────────────────────────
export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
