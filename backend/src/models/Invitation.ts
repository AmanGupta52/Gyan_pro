import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export type InvitationStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Expired' | 'Cancelled';

export interface IInvitation extends Document {
  _id: Types.ObjectId;
  teamId: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  status: InvitationStatus;
  expiresAt: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected', 'Expired', 'Cancelled'],
      default: 'Pending',
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days auto-expiry
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate pending invitations to the same player for the same team
invitationSchema.index(
  { teamId: 1, receiverId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'Pending' },
  }
);

invitationSchema.index({ receiverId: 1, status: 1 });
invitationSchema.index({ expiresAt: 1 });

export const Invitation: Model<IInvitation> = mongoose.model<IInvitation>(
  'Invitation',
  invitationSchema
);
