import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export type NotificationType =
  | 'invite'
  | 'request'
  | 'accept'
  | 'reject'
  | 'registration'
  | 'competition'
  | 'result'
  | 'certificate'
  | 'assignment'
  | 'announcement';

export interface INotification extends Document {
  _id: Types.ObjectId;
  receiverId: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'invite',
        'request',
        'accept',
        'reject',
        'registration',
        'competition',
        'result',
        'certificate',
        'assignment',
        'announcement',
      ],
      default: 'announcement',
    },
    link: {
      type: String,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Required composite index for fast notification fetching & count
notificationSchema.index({ receiverId: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  notificationSchema
);
