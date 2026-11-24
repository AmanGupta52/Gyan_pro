import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Category } from '../models/Category.js';

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await Category.find({ isActive: true })
    .sort({ order: 1 })
    .lean();
  res.status(200).json({ success: true, data: categories });
});
