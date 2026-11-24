import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as teamController from '../controllers/team.controller.js';
import { createTeamSchema, updateTeamSchema } from '../validators/team.validator.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createTeamSchema), teamController.createTeam);
router.get('/my', teamController.getMyTeams);
router.get('/:id', teamController.getTeamById);
router.patch('/:id', validate(updateTeamSchema), teamController.updateTeam);
router.delete('/:id', teamController.disbandTeam);
router.post('/:id/leave', teamController.leaveTeam);
router.post('/:id/transfer-leadership', teamController.transferLeadership);
router.post('/:id/members/:memberId/remove', teamController.removeMember);

// Join requests
router.post('/:id/join-request', teamController.requestToJoin);
router.get('/:id/join-requests', teamController.getTeamJoinRequests);
router.post('/:id/join-requests/:requestId/accept', teamController.acceptJoinRequest);
router.post('/:id/join-requests/:requestId/reject', teamController.rejectJoinRequest);

export default router;
