import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as questionController from '../controllers/question.controller.js';
import {
  createQuestionSchema,
  updateQuestionSchema,
} from '../validators/question.validator.js';

const router = Router();

// The question bank (with correct answers) is for staff only. Players receive questions
// exclusively through a running game or quiz attempt, never by browsing the bank.
router.use(authenticate, authorize('teacher', 'admin', 'superAdmin'));

router.get('/', questionController.getQuestionBank);
router.get('/:id', questionController.getQuestionById);

// Create: any staff role. Update/delete: owner or admin (enforced in the service).
router.post(
  '/',
  validate(createQuestionSchema),
  questionController.createQuestion
);

router.patch(
  '/:id',
  validate(updateQuestionSchema),
  questionController.updateQuestion
);

router.delete(
  '/:id',
  questionController.deleteQuestion
);

export default router;
