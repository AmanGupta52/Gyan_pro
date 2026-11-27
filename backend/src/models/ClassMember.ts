import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export interface IClassMember extends Document {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  userId: Types.ObjectId;
  /** 'self' = joined with the class code, otherwise the teacher who added them */
  addedBy: 'self' | Types.ObjectId;
  joinedAt: Date;
}

const classMemberSchema = new Schema<IClassMember>({
  classId: { type: Schema.Types.ObjectId, ref: 'ClassGroup', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  addedBy: { type: Schema.Types.Mixed, default: 'self' },
  joinedAt: { type: Date, default: Date.now },
});

// A student can be in a class only once
classMemberSchema.index({ classId: 1, userId: 1 }, { unique: true });

export const ClassMember: Model<IClassMember> =
  (mongoose.models.ClassMember as Model<IClassMember>) ||
  mongoose.model<IClassMember>('ClassMember', classMemberSchema);
