import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as competitionService from '../services/competition.service.js';

export const getCompetitions = asyncHandler(async (req: Request, res: Response) => {
  const result = await competitionService.getCompetitions({
    category: req.query.category as string | undefined,
    status: req.query.status as string | undefined,
    participationMode: req.query.mode as string | undefined,
    page: parseInt((req.query.page as string) || '1', 10),
    limit: parseInt((req.query.limit as string) || '12', 10),
  });
  res.status(200).json({ success: true, data: result.competitions, meta: result.meta });
});

export const getCompetitionById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const competition = await competitionService.getCompetitionById(id);
  res.status(200).json({ success: true, data: competition });
});

export const registerForCompetition = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { teamId } = req.body;
  const registration = await competitionService.registerForCompetition(
    id,
    req.user!.userId,
    teamId
  );
  res.status(201).json({ success: true, data: registration });
});

export const getUserRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const registrations = await competitionService.getUserRegistrations(req.user!.userId);
  res.status(200).json({ success: true, data: registrations });
});
