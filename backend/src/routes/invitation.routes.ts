import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as invitationController from '../controllers/invitation.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', invitationController.sendInvitation);
router.get('/my', invitationController.getMyInvitations);
router.get('/team/:teamId', invitationController.getTeamInvitations);
router.post('/:id/accept', invitationController.acceptInvitation);
router.post('/:id/reject', invitationController.rejectInvitation);
router.post('/:id/cancel', invitationController.cancelInvitation);

export default router;
