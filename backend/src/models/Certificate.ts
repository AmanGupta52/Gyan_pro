import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export type CertificateStatus = 'generating' | 'issued' | 'revoked';

export interface ICertificate extends Document {
  _id: Types.ObjectId;
  certificateId: string;
  userId: Types.ObjectId;
  competitionId: Types.ObjectId;
  teamId: Types.ObjectId;
  rank: number;
  score: number;
  accuracy: number;
  pdfUrl?: string;
  qrCodeUrl: string;
  status: CertificateStatus;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<ICertificate>(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
      index: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    rank: {
      type: Number,
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    accuracy: {
      type: Number,
      required: true,
    },
    pdfUrl: {
      type: String,
    },
    qrCodeUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['generating', 'issued', 'revoked'],
      default: 'generating',
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

certificateSchema.index({ competitionId: 1, userId: 1 }, { unique: true });
certificateSchema.index({ userId: 1, createdAt: -1 });

export const Certificate: Model<ICertificate> =
  mongoose.models.Certificate ||
  mongoose.model<ICertificate>('Certificate', certificateSchema);
