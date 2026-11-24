import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export interface ISubject extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  categories: Types.ObjectId[]; // Associated education levels
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

subjectSchema.index({ code: 1 }, { unique: true });
subjectSchema.index({ isActive: 1 });

export const Subject: Model<ISubject> = mongoose.model<ISubject>('Subject', subjectSchema);
