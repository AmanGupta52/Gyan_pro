import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as attemptService from '../services/attempt.service.js';

const attemptId = (req: Request) => req.params.id as string;

export const start = asyncHandler(async (req: Request, res: Response) => {
  const data = await attemptService.startAttempt(req.user!, req.body);
  res.status(data.resumed ? 200 : 201).json({ success: true, data });
});

export const state = asyncHandler(async (req: Request, res: Response) => {
  const data = await attemptService.getAttemptState(req.user!, attemptId(req));
  res.status(200).json({ success: true, data });
});

export const answer = asyncHandler(async (req: Request, res: Response) => {
  const data = await attemptService.submitAnswer(
    req.user!,
    attemptId(req),
    req.body.questionId,
    req.body.selectedOptions
  );
  res.status(200).json({ success: true, data });
});

export const finish = asyncHandler(async (req: Request, res: Response) => {
  const data = await attemptService.finishAttempt(req.user!, attemptId(req));
  res.status(200).json({ success: true, data });
});

export const result = asyncHandler(async (req: Request, res: Response) => {
  const data = await attemptService.getAttemptResult(req.user!, attemptId(req));
  res.status(200).json({ success: true, data });
});

export const history = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '15', 10) || 15));
  const data = await attemptService.listMyAttempts(req.user!, page, limit);
  res.status(200).json({ success: true, data: data.attempts, meta: data.meta });
});

export const stats = asyncHandler(async (req: Request, res: Response) => {
  const data = await attemptService.getMyStats(req.user!);
  res.status(200).json({ success: true, data });
});

export const activity = asyncHandler(async (req: Request, res: Response) => {
  const data = await attemptService.getMyActivity(req.user!);
  res.status(200).json({ success: true, data });
});
