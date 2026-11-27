import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { soloLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import * as solo from '../controllers/solo.controller.js';
import { startAttemptSchema, submitAnswerSchema } from '../validators/quiz.validator.js';

const router = Router();

// Solo play (quizzes + practice) - open to every logged-in role
router.use(soloLimiter, authenticate);

router.post('/start', validate(startAttemptSchema), solo.start);
router.get('/history', solo.history);
router.get('/stats', solo.stats);
router.get('/activity', solo.activity);
router.get('/attempts/:id', solo.state);
router.post('/attempts/:id/answer', validate(submitAnswerSchema), solo.answer);
router.post('/attempts/:id/finish', solo.finish);
router.get('/attempts/:id/result', solo.result);

export default router;
