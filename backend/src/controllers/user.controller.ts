import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as userService from '../services/user.service.js';
import { AppError } from '../utils/AppError.js';

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await userService.getUserProfile(req.user!.userId);
  res.status(200).json({ success: true, data: profile });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const updated = await userService.updateUserProfile(req.user!.userId, req.body);
  res.status(200).json({ success: true, data: updated });
});

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw AppError.badRequest('No image file provided');
  }
  const result = await userService.uploadAvatar(
    req.user!.userId,
    req.file.buffer,
    req.file.mimetype
  );
  res.status(200).json({ success: true, data: result });
});

export const searchPlayers = asyncHandler(async (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  const competitionId = req.query.competitionId as string | undefined;
  const category = req.query.category as string | undefined;
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '10', 10);

  const result = await userService.searchPlayers({
    query,
    competitionId,
    category,
    page,
    limit,
    currentUserId: req.user!.userId,
  });

  res.status(200).json({ success: true, data: result.players, meta: result.meta });
});
