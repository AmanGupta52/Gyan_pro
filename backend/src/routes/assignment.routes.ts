import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as c from '../controllers/class.controller.js';
import { updateAssignmentSchema } from '../validators/class.validator.js';

const router = Router();
const staff = authorize('teacher', 'admin', 'superAdmin');

router.use(authenticate);

// Student: everything assigned to me
router.get('/mine', c.myAssignments);

// Staff: manage one assignment (ownership is enforced in the service)
router.get('/:id/progress', staff, c.assignmentProgress);
router.patch('/:id', staff, validate(updateAssignmentSchema), c.updateAssignment);
router.delete('/:id', staff, c.removeAssignment);
router.post('/:id/remind', staff, c.remind);

export default router;
