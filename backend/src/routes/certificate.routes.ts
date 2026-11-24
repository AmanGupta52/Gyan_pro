import { Router } from 'express';
import {
  verifyCertificateHandler,
  getUserCertificatesHandler,
  downloadCertificatePDFHandler,
  adminIssueCertificatesHandler,
} from '../controllers/certificate.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// ── Public Routes (NO AUTH REQUIRED) ─────────────────────────
router.get('/verify/:certificateId', verifyCertificateHandler);
router.get('/download/:certificateId', downloadCertificatePDFHandler);

// ── Protected Routes ─────────────────────────────────────────
router.use(authenticate);

// Player Certificates
router.get('/my', getUserCertificatesHandler);

// Admin Manual Bulk Issue
router.post(
  '/issue/:competitionId',
  authorize('admin', 'superAdmin'),
  adminIssueCertificatesHandler
);

export default router;
