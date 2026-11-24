import { Router } from 'express';
import * as donationController from '../controllers/donation.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Public endpoints
router.get('/settings', donationController.getSettings);
router.get('/qr', donationController.getCustomQr);

// Admin-guarded settings update
router.put(
  '/admin/settings',
  authenticate,
  authorize('admin', 'superAdmin'),
  donationController.updateSettings
);

export default router;
