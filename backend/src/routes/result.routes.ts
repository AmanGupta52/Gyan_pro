import { Router } from 'express';
import {
  getLeaderboardHandler,
  getUserHistoryHandler,
  getDetailedResultHandler,
  exportCompetitionCSVHandler,
} from '../controllers/result.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Public / Authenticated Leaderboard
router.get('/leaderboard/:competitionId', getLeaderboardHandler);

// Protected routes
router.use(authenticate);

// Player Match History
router.get('/history', getUserHistoryHandler);

// Detailed Result Scorecard
router.get('/:id', getDetailedResultHandler);

// Admin CSV Export
router.get(
  '/export/:competitionId',
  authorize('admin', 'superAdmin'),
  exportCompetitionCSVHandler
);

export default router;
