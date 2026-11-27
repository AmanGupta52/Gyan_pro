import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export type ClassStatus = 'active' | 'archived';

/** A class / group of students managed by a teacher (like a Google Classroom). */
export interface IClassGroup extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  ownerId: Types.ObjectId;
  /** Students type this to join the class themselves */
  joinCode: string;
  status: ClassStatus;
  createdAt: Date;
  updatedAt: Date;
}

const classGroupSchema = new Schema<IClassGroup>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    joinCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true }
);

export const ClassGroup: Model<IClassGroup> =
  (mongoose.models.ClassGroup as Model<IClassGroup>) ||
  mongoose.model<IClassGroup>('ClassGroup', classGroupSchema);
