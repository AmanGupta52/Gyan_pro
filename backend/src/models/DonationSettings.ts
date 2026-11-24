import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IBankDetails {
  accountNumber: string;
  ifsc: string;
  bankName: string;
  branch: string;
  accountHolder: string;
}

export interface IDonationSettings extends Document {
  _id: Types.ObjectId;
  upiId: string;
  payeeName: string;
  suggestedAmounts: number[];
  notes: string;
  bankDetails: IBankDetails;
  taxExemptionNote?: string;
  isActive: boolean;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bankDetailsSchema = new Schema<IBankDetails>(
  {
    accountNumber: {
      type: String,
      required: true,
      default: '98765432101234',
      trim: true,
    },
    ifsc: {
      type: String,
      required: true,
      default: 'SBIN0001234',
      trim: true,
      uppercase: true,
    },
    bankName: {
      type: String,
      required: true,
      default: 'State Bank of India',
      trim: true,
    },
    branch: {
      type: String,
      required: true,
      default: 'New Delhi Main Branch',
      trim: true,
    },
    accountHolder: {
      type: String,
      required: true,
      default: 'GYAN-26 Educational Trust',
      trim: true,
    },
  },
  { _id: false }
);

const donationSettingsSchema = new Schema<IDonationSettings>(
  {
    upiId: {
      type: String,
      required: [true, 'UPI ID is required'],
      default: 'gyan26@upi',
      trim: true,
    },
    payeeName: {
      type: String,
      required: [true, 'Payee name is required'],
      default: 'GYAN-26 Educational Trust',
      trim: true,
    },
    suggestedAmounts: {
      type: [Number],
      default: [101, 251, 501, 1100, 2100],
      validate: {
        validator: (arr: number[]) => Array.isArray(arr) && arr.length > 0 && arr.every((n) => n > 0),
        message: 'Suggested amounts must be positive numbers',
      },
    },
    notes: {
      type: String,
      default: 'Shagun for student prize fund',
      trim: true,
    },
    bankDetails: {
      type: bankDetailsSchema,
      default: () => ({}),
    },
    taxExemptionNote: {
      type: String,
      default: 'Donations are utilized 100% towards student scholarships, prizes, and quiz operations.',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const DonationSettings: Model<IDonationSettings> =
  mongoose.models.DonationSettings ||
  mongoose.model<IDonationSettings>('DonationSettings', donationSettingsSchema);
