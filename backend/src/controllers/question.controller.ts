import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as questionService from '../services/question.service.js';

export const createQuestion = asyncHandler(async (req: Request, res: Response) => {
  const question = await questionService.createQuestion(
    req.user!.userId,
    req.body,
    req.ip
  );
  res.status(201).json({ success: true, data: question });
});

export const getQuestionBank = asyncHandler(async (req: Request, res: Response) => {
  const result = await questionService.getQuestionBank(
    {
      educationLevel: req.query.educationLevel as string | undefined,
      subjectId: req.query.subjectId as string | undefined,
      difficulty: req.query.difficulty as string | undefined,
      type: req.query.type as string | undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      mine: req.query.mine === 'true',
      page: parseInt((req.query.page as string) || '1', 10),
      limit: Math.min(100, parseInt((req.query.limit as string) || '20', 10)),
    },
    req.user!
  );
  res.status(200).json({ success: true, data: result.questions, meta: result.meta });
});

export const getQuestionById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const question = await questionService.getQuestionById(id, req.user!);
  res.status(200).json({ success: true, data: question });
});

export const updateQuestion = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const updated = await questionService.updateQuestion(
    id,
    req.user!,
    req.body,
    req.ip
  );
  res.status(200).json({ success: true, data: updated });
});

export const deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await questionService.deleteQuestion(id, req.user!, req.ip);
  res.status(200).json({ success: true, data: result });
});
