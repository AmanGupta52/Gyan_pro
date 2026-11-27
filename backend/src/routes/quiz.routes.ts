import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as quizController from '../controllers/quiz.controller.js';
import {
  createQuizSchema,
  updateQuizSchema,
  quizStatusSchema,
} from '../validators/quiz.validator.js';

const router = Router();
const staff = authorize('teacher', 'admin', 'superAdmin');

router.use(authenticate);

// ── Everyone logged in (students + staff) ──
router.get('/', quizController.listQuizzes);
router.get('/join/:code', quizController.getByJoinCode);

// ── Staff: manage quizzes (declared before /:id so "mine" is not read as an id) ──
router.get('/mine', staff, quizController.listMyQuizzes);
router.post('/', staff, validate(createQuizSchema), quizController.createQuiz);

router.get('/:id', quizController.getQuiz);
router.get('/:id/leaderboard', quizController.getLeaderboard);

// Owner / admin only (ownership is enforced inside the service)
router.patch('/:id', staff, validate(updateQuizSchema), quizController.updateQuiz);
router.patch('/:id/status', staff, validate(quizStatusSchema), quizController.setStatus);
router.delete('/:id', staff, quizController.deleteQuiz);
router.get('/:id/questions', staff, quizController.getQuestions);
router.get('/:id/attempts', staff, quizController.getAttempts);
router.get('/:id/analytics', staff, quizController.getAnalytics);

export default router;
