import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as quizService from '../services/quiz.service.js';

const page = (v: unknown, d = 1) => Math.max(1, parseInt((v as string) || String(d), 10) || d);
const limit = (v: unknown, d = 12) => Math.min(100, Math.max(1, parseInt((v as string) || String(d), 10) || d));
const id = (req: Request) => req.params.id as string;

export const listQuizzes = asyncHandler(async (req: Request, res: Response) => {
  const result = await quizService.listPublicQuizzes(req.user!, {
    category: req.query.category as string | undefined,
    subjectId: req.query.subjectId as string | undefined,
    search: req.query.search as string | undefined,
    page: page(req.query.page),
    limit: limit(req.query.limit),
  });
  res.status(200).json({ success: true, data: result.quizzes, meta: result.meta });
});

export const listMyQuizzes = asyncHandler(async (req: Request, res: Response) => {
  const scope = req.query.scope === 'all' ? 'all' : 'mine';
  const data = await quizService.listManagedQuizzes(req.user!, scope);
  res.status(200).json({ success: true, data });
});

export const getByJoinCode = asyncHandler(async (req: Request, res: Response) => {
  const data = await quizService.getQuizByJoinCode(req.user!, req.params.code as string);
  res.status(200).json({ success: true, data });
});

export const getQuiz = asyncHandler(async (req: Request, res: Response) => {
  const data = await quizService.getQuizById(req.user!, id(req));
  res.status(200).json({ success: true, data });
});

export const createQuiz = asyncHandler(async (req: Request, res: Response) => {
  const quiz = await quizService.createQuiz(req.user!, req.body, req.ip);
  res.status(201).json({ success: true, data: quiz });
});

export const updateQuiz = asyncHandler(async (req: Request, res: Response) => {
  const quiz = await quizService.updateQuiz(req.user!, id(req), req.body, req.ip);
  res.status(200).json({ success: true, data: quiz });
});

export const setStatus = asyncHandler(async (req: Request, res: Response) => {
  const quiz = await quizService.setQuizStatus(req.user!, id(req), req.body.status, req.ip);
  res.status(200).json({ success: true, data: quiz });
});

export const deleteQuiz = asyncHandler(async (req: Request, res: Response) => {
  const data = await quizService.deleteQuiz(req.user!, id(req), req.ip);
  res.status(200).json({ success: true, data });
});

export const getQuestions = asyncHandler(async (req: Request, res: Response) => {
  const data = await quizService.getQuizQuestions(req.user!, id(req));
  res.status(200).json({ success: true, data });
});

export const getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  // Only for quizzes the caller is allowed to see
  await quizService.getQuizById(req.user!, id(req));
  const data = await quizService.getQuizLeaderboard(id(req));
  res.status(200).json({ success: true, data });
});

export const getAttempts = asyncHandler(async (req: Request, res: Response) => {
  const result = await quizService.getQuizAttempts(req.user!, id(req), page(req.query.page), limit(req.query.limit, 20));
  res.status(200).json({ success: true, data: result.attempts, meta: result.meta });
});

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const data = await quizService.getQuizAnalytics(req.user!, id(req));
  res.status(200).json({ success: true, data });
});
