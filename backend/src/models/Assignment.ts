import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export type AssignmentStatus = 'active' | 'cancelled';

/** A quiz given to a class with a deadline. */
export interface IAssignment extends Document {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  quizId: Types.ObjectId;
  assignedBy: Types.ObjectId;
  /** When students can start (defaults to creation time) */
  openAt: Date;
  dueAt: Date;
  /** After the deadline: false = locked, true = still playable but flagged "late" */
  allowLate: boolean;
  note?: string;
  status: AssignmentStatus;
  /** Throttles the teacher's "remind pending students" button */
  lastRemindedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'ClassGroup', required: true, index: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    openAt: { type: Date, default: Date.now },
    dueAt: { type: Date, required: true },
    allowLate: { type: Boolean, default: false },
    note: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
    lastRemindedAt: { type: Date },
  },
  { timestamps: true }
);

assignmentSchema.index({ classId: 1, status: 1, dueAt: 1 });

export const Assignment: Model<IAssignment> =
  (mongoose.models.Assignment as Model<IAssignment>) ||
  mongoose.model<IAssignment>('Assignment', assignmentSchema);
