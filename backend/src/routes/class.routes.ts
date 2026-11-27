import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as c from '../controllers/class.controller.js';
import {
  addMembersSchema,
  createAssignmentSchema,
  createClassSchema,
  joinClassSchema,
  updateClassSchema,
} from '../validators/class.validator.js';

const router = Router();
const staff = authorize('teacher', 'admin', 'superAdmin');

router.use(authenticate);

// ── Student side (declared before /:id so "joined" is not read as an id) ──
router.post('/join', validate(joinClassSchema), c.join);
router.get('/joined', c.listJoined);
router.post('/:id/leave', c.leave);

// ── Staff: classes (ownership is enforced in the service) ──
router.get('/mine', staff, c.listMine);
router.post('/', staff, validate(createClassSchema), c.createClass);
router.get('/:id', staff, c.getClass);
router.patch('/:id', staff, validate(updateClassSchema), c.updateClass);
router.delete('/:id', staff, c.deleteClass);
router.post('/:id/regenerate-code', staff, c.regenerateCode);
router.post('/:id/members', staff, validate(addMembersSchema), c.addMembers);
router.delete('/:id/members/:userId', staff, c.removeMember);
router.post('/:id/assignments', staff, validate(createAssignmentSchema), c.createAssignment);

export default router;
