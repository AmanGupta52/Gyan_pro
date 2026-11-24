import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as notificationService from '../services/notification.service.js';

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '20', 10);

  const result = await notificationService.getUserNotifications(
    req.user!.userId,
    page,
    limit
  );

  res.status(200).json({
    success: true,
    data: result.notifications,
    unreadCount: result.unreadCount,
    meta: result.meta,
  });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const updated = await notificationService.markAsRead(
    id,
    req.user!.userId
  );
  res.status(200).json({ success: true, data: updated });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAllAsRead(req.user!.userId);
  res.status(200).json({ success: true, message: "You're all caught up." });
});
