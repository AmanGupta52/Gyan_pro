import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';
import type { CertificateStatus } from './Certificate.js';

/**
 * Certificate for passing a teacher's quiz.
 * Kept in its own collection so the competition certificate indexes stay untouched;
 * it shares the ID generator, PDF design, verification page and download route.
 */
export interface IQuizCertificate extends Document {
  _id: Types.ObjectId;
  certificateId: string;
  userId: Types.ObjectId;
  quizId: Types.ObjectId;
  attemptId: Types.ObjectId;
  // Snapshots, so the certificate never changes if the quiz is edited or deleted later
  quizTitle: string;
  category: string;
  issuerName: string;
  score: number;
  maxScore: number;
  accuracy: number;
  passPercent: number;
  qrCodeUrl: string;
  status: CertificateStatus;
  issuedAt: Date;
}

const quizCertificateSchema = new Schema<IQuizCertificate>(
  {
    certificateId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    attemptId: { type: Schema.Types.ObjectId, ref: 'QuizAttempt', required: true },
    quizTitle: { type: String, required: true },
    category: { type: String, required: true },
    issuerName: { type: String, required: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    passPercent: { type: Number, required: true },
    qrCodeUrl: { type: String, required: true },
    status: { type: String, enum: ['generating', 'issued', 'revoked'], default: 'issued' },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// One certificate per student per quiz
quizCertificateSchema.index({ quizId: 1, userId: 1 }, { unique: true });

export const QuizCertificate: Model<IQuizCertificate> =
  (mongoose.models.QuizCertificate as Model<IQuizCertificate>) ||
  mongoose.model<IQuizCertificate>('QuizCertificate', quizCertificateSchema);
