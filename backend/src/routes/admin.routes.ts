import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as adminController from '../controllers/admin.controller.js';
import { validate } from '../middleware/validate.js';
import { createTeacherSchema, updateRoleSchema } from '../validators/quiz.validator.js';
import * as donationController from '../controllers/donation.controller.js';

const router = Router();

// Strict admin authentication & authorization guard
router.use(authenticate, authorize('admin', 'superAdmin'));

// Dashboard stats
router.get('/stats', adminController.getStats);

// Users management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/role', authorize('superAdmin'), validate(updateRoleSchema), adminController.updateUserRole);

// Teachers: only a superAdmin can add or invite them
router.get('/teachers', adminController.listTeachers);
router.post('/teachers', authorize('superAdmin'), validate(createTeacherSchema), adminController.createTeacher);
router.post('/teachers/:id/resend-invite', authorize('superAdmin'), adminController.resendTeacherInvite);
router.patch('/users/:id/status', adminController.toggleUserStatus);

// Competitions management
router.post('/competitions', adminController.createCompetition);
router.patch('/competitions/:id', adminController.updateCompetition);
router.patch('/competitions/:id/status', adminController.updateCompetitionStatus);
router.post('/competitions/:id/questions', adminController.assignQuestions);
router.get('/competitions/:id/questions', adminController.getCompetitionQuestions);

// Audit logs
router.get('/audit-logs', adminController.getAuditLogs);

// Donation settings
router.get('/donations/settings', donationController.getSettings);
router.put('/donations/settings', donationController.updateSettings);

export default router;
