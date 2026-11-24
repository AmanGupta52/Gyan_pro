import { Router, type Request, type Response } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import teamRoutes from './team.routes.js';
import invitationRoutes from './invitation.routes.js';
import competitionRoutes from './competition.routes.js';
import categoryRoutes from './category.routes.js';
import notificationRoutes from './notification.routes.js';
import questionRoutes from './question.routes.js';
import adminRoutes from './admin.routes.js';
import gameRoutes from './game.routes.js';
import resultRoutes from './result.routes.js';
import certificateRoutes from './certificate.routes.js';
import donationRoutes from './donation.routes.js';

const router = Router();

/**
 * GET /api/health
 * Basic health check endpoint.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount modular sub-routers
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/teams', teamRoutes);
router.use('/invitations', invitationRoutes);
router.use('/competitions', competitionRoutes);
router.use('/categories', categoryRoutes);
router.use('/notifications', notificationRoutes);
router.use('/questions', questionRoutes);
router.use('/admin', adminRoutes);
router.use('/game', gameRoutes);
router.use('/results', resultRoutes);
router.use('/certificates', certificateRoutes);
router.use('/donations', donationRoutes);

export default router;
