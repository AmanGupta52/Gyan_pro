import type { Request, Response, NextFunction } from 'express';
import {
  getLeaderboard,
  getUserHistory,
  getDetailedResult,
  exportCompetitionResultsCSV,
} from '../services/result.service.js';

export async function getLeaderboardHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const competitionId = req.params.competitionId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const data = await getLeaderboard(competitionId, page, limit);

    res.status(200).json({
      status: 'success',
      data: data.leaderboard,
      competition: data.competition,
      meta: data.meta,
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const data = await getUserHistory(req.user!.userId, page, limit);

    res.status(200).json({
      status: 'success',
      data: data.history,
      meta: data.meta,
    });
  } catch (err) {
    next(err);
  }
}

export async function getDetailedResultHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.params.id as string;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superAdmin';

    const data = await getDetailedResult(id, req.user!.userId, isAdmin);

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function exportCompetitionCSVHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const competitionId = req.params.competitionId as string;
    const csvContent = await exportCompetitionResultsCSV(competitionId);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="gyan26-results-${competitionId}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}
