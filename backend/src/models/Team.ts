import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export type TeamSize = 2 | 4 | 6;

export interface ITeam extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  category: string; // e.g. "Class 10", "Undergraduate", etc.
  size: TeamSize;
  leaderId: Types.ObjectId;
  currentMemberCount: number;
  status: 'active' | 'disbanded';
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [2, 'Team name must be at least 2 characters'],
      maxlength: [50, 'Team name cannot exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    category: {
      type: String,
      required: [true, 'Team category is required'],
      trim: true,
    },
    size: {
      type: Number,
      enum: [2, 4, 6],
      required: [true, 'Team size must be 2, 4, or 6'],
    },
    leaderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Leader is required'],
    },
    currentMemberCount: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ['active', 'disbanded'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Unique team name per category
teamSchema.index({ name: 1, category: 1 }, { unique: true });
teamSchema.index({ leaderId: 1 });
teamSchema.index({ category: 1 });
teamSchema.index({ status: 1 });

export const Team: Model<ITeam> = mongoose.model<ITeam>('Team', teamSchema);
