import mongoose, { Schema, type Model, type Document } from 'mongoose';

export interface ICounter extends Document {
  name: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

export const Counter: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>('Counter', counterSchema);

/**
 * Atomic counter generator for sequence numbers
 */
export async function getNextSequence(name: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return counter.seq;
}

/**
 * Format certificate identifier: <PREFIX>-YYYY-NNNNNN
 *  - competitions: GYAN26-2026-000001   (counter key unchanged: certificate_2026)
 *  - quizzes:      GYAN26Q-2026-000001  (own counter, so the two sequences never mix)
 */
export async function generateCertificateId(
  year = new Date().getFullYear(),
  prefix = 'GYAN26'
): Promise<string> {
  const counterKey = prefix === 'GYAN26' ? `certificate_${year}` : `certificate_${prefix}_${year}`;
  const seq = await getNextSequence(counterKey);
  const paddedSeq = seq.toString().padStart(6, '0');
  return `${prefix}-${year}-${paddedSeq}`;
}
