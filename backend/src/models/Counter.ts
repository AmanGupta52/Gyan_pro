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
 * Format certificate identifier: GYAN26-YYYY-NNNNNN
 * e.g. GYAN26-2026-000001
 */
export async function generateCertificateId(year = new Date().getFullYear()): Promise<string> {
  const counterKey = `certificate_${year}`;
  const seq = await getNextSequence(counterKey);
  const paddedSeq = seq.toString().padStart(6, '0');
  return `GYAN26-${year}-${paddedSeq}`;
}
