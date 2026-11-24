import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as questionController from '../controllers/question.controller.js';
import {
  createQuestionSchema,
  updateQuestionSchema,
} from '../validators/question.validator.js';

const router = Router();

// Authenticated players can fetch questions during games, but admins can manage bank
router.use(authenticate);

router.get('/', questionController.getQuestionBank);
router.get('/:id', questionController.getQuestionById);

// Admin-only CRUD operations
router.post(
  '/',
  authorize('admin', 'superAdmin'),
  validate(createQuestionSchema),
  questionController.createQuestion
);

router.patch(
  '/:id',
  authorize('admin', 'superAdmin'),
  validate(updateQuestionSchema),
  questionController.updateQuestion
);

router.delete(
  '/:id',
  authorize('admin', 'superAdmin'),
  questionController.deleteQuestion
);

export default router;
