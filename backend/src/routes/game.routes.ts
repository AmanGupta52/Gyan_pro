import { Router } from 'express';
import {
  createOrGetSessionHandler,
  getSessionHandler,
  getSessionResultsHandler,
} from '../controllers/game.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All game endpoints require active JWT authentication
router.use(authenticate);

router.post('/session', createOrGetSessionHandler);
router.get('/session/:id', getSessionHandler);
router.get('/session/:id/results', getSessionResultsHandler);

export default router;
