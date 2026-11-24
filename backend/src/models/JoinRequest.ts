import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export type JoinRequestStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled';

export interface IJoinRequest extends Document {
  _id: Types.ObjectId;
  teamId: Types.ObjectId;
  userId: Types.ObjectId;
  message?: string;
  status: JoinRequestStatus;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const joinRequestSchema = new Schema<IJoinRequest>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: [200, 'Message cannot exceed 200 characters'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected', 'Cancelled'],
      default: 'Pending',
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate pending requests from the same user to the same team
joinRequestSchema.index(
  { teamId: 1, userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'Pending' },
  }
);

joinRequestSchema.index({ teamId: 1, status: 1 });
joinRequestSchema.index({ userId: 1, status: 1 });

export const JoinRequest: Model<IJoinRequest> = mongoose.model<IJoinRequest>(
  'JoinRequest',
  joinRequestSchema
);
