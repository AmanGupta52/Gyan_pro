import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as competitionController from '../controllers/competition.controller.js';

const router = Router();

// Public routes
router.get('/', competitionController.getCompetitions);
router.get('/:id', competitionController.getCompetitionById);

// Protected registration routes
router.post('/:id/register', authenticate, competitionController.registerForCompetition);
router.get('/my/registrations', authenticate, competitionController.getUserRegistrations);

export default router;
