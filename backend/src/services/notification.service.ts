import mongoose from 'mongoose';
import { Notification, type NotificationType } from '../models/Notification.js';
import { getIO, getSocketId } from '../socket/index.js';
import { logger } from '../utils/logger.js';

interface CreateNotificationParams {
  receiverId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  const notification = await Notification.create({
    receiverId: params.receiverId,
    title: params.title,
    message: params.message,
    type: params.type,
    link: params.link,
    metadata: params.metadata,
  });

  // Socket push if user is connected
  try {
    const socketId = getSocketId(params.receiverId.toString());
    if (socketId) {
      const io = getIO();
      io.to(socketId).emit('notification', {
        _id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link,
        createdAt: notification.createdAt.toISOString(),
      } as any);
    }
  } catch (err) {
    logger.debug({ err }, 'Could not push real-time notification via socket');
  }

  return notification;
}

export async function getUserNotifications(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ receiverId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ receiverId: userId }),
    Notification.countDocuments({ receiverId: userId, isRead: false }),
  ]);

  return {
    notifications,
    unreadCount,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function markAsRead(notificationId: string, userId: string) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, receiverId: userId },
    { isRead: true },
    { new: true }
  );
}

export async function markAllAsRead(userId: string) {
  return Notification.updateMany(
    { receiverId: userId, isRead: false },
    { isRead: true }
  );
}
