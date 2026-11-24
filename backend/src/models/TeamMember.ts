import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export type TeamMemberRole = 'leader' | 'member';

export interface ITeamMember extends Document {
  _id: Types.ObjectId;
  teamId: Types.ObjectId;
  userId: Types.ObjectId;
  role: TeamMemberRole;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const teamMemberSchema = new Schema<ITeamMember>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team ID is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    role: {
      type: String,
      enum: ['leader', 'member'],
      default: 'member',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// A user can only belong to a specific team once
teamMemberSchema.index({ teamId: 1, userId: 1 }, { unique: true });
teamMemberSchema.index({ userId: 1 });
teamMemberSchema.index({ teamId: 1 });

export const TeamMember: Model<ITeamMember> = mongoose.model<ITeamMember>(
  'TeamMember',
  teamMemberSchema
);
