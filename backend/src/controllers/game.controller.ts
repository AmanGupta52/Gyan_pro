import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  getOrCreateSession,
  getSession,
  finishSession,
} from '../services/game.service.js';
import { GameSession } from '../models/GameSession.js';
import { PlayerAnswer } from '../models/PlayerAnswer.js';
import { TeamMember } from '../models/TeamMember.js';
import { AppError } from '../utils/AppError.js';

const createSessionSchema = z.object({
  competitionId: z.string().min(1, 'Competition ID is required'),
  teamId: z.string().min(1, 'Team ID is required'),
});

export async function createOrGetSessionHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const validated = createSessionSchema.parse(req.body);
    const session = await getOrCreateSession(
      validated.competitionId,
      validated.teamId,
      req.user!.userId
    );

    res.status(200).json({
      status: 'success',
      data: session,
    });
  } catch (err) {
    next(err);
  }
}

export async function getSessionHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.params.id as string;
    const sessionData = await getSession(id, req.user!.userId);

    res.status(200).json({
      status: 'success',
      data: sessionData,
    });
  } catch (err) {
    next(err);
  }
}

export async function getSessionResultsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.params.id as string;
    const session = await GameSession.findById(id)
      .populate('competitionId', 'name category scoringConfig')
      .populate('teamId', 'name category');

    if (!session) {
      throw AppError.notFound('Game session not found.');
    }

    if (session.status !== 'finished') {
      throw AppError.badRequest('Game session is not yet completed.');
    }

    // Verify user membership
    const membership = await TeamMember.findOne({
      teamId: session.teamId._id,
      userId: req.user!.userId,
    });

    if (!membership && req.user!.role === 'player') {
      throw AppError.forbidden('You are not authorized to view results for this team.');
    }

    // Get all player answers
    const answers = await PlayerAnswer.find({ gameSessionId: session._id })
      .populate('userId', 'name avatar')
      .populate('questionId', 'text type points options')
      .lean();

    // Group by player
    const playerSummaries: Record<string, {
      userId: string;
      name: string;
      avatar?: string;
      totalScore: number;
      correctCount: number;
      incorrectCount: number;
      totalQuestions: number;
      avgResponseTime: number;
      answers: typeof answers;
    }> = {};

    for (const a of answers as any[]) {
      const uId = a.userId._id.toString();
      if (!playerSummaries[uId]) {
        playerSummaries[uId] = {
          userId: uId,
          name: a.userId.name,
          avatar: a.userId.avatar,
          totalScore: 0,
          correctCount: 0,
          incorrectCount: 0,
          totalQuestions: 0,
          avgResponseTime: 0,
          answers: [],
        };
      }

      playerSummaries[uId].totalScore += a.scoreAwarded || 0;
      if (a.isCorrect) playerSummaries[uId].correctCount++;
      else playerSummaries[uId].incorrectCount++;
      playerSummaries[uId].totalQuestions++;
      playerSummaries[uId].answers.push(a);
    }

    // Compute averages
    for (const p of Object.values(playerSummaries)) {
      const sumTime = p.answers.reduce((acc, curr) => acc + (curr.timeTakenSeconds || 0), 0);
      p.avgResponseTime = p.totalQuestions > 0 ? Number((sumTime / p.totalQuestions).toFixed(2)) : 0;
    }

    const teamScore = Object.values(playerSummaries).reduce((acc, curr) => acc + curr.totalScore, 0);

    res.status(200).json({
      status: 'success',
      data: {
        session,
        teamScore,
        totalQuestions: session.questionIds.length,
        durationSeconds: session.totalDurationSeconds,
        players: Object.values(playerSummaries),
      },
    });
  } catch (err) {
    next(err);
  }
}
