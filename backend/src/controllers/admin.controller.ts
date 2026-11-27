import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as adminService from '../services/admin.service.js';
import * as auditService from '../services/audit.service.js';

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await adminService.getDashboardStats();
  res.status(200).json({ success: true, data: stats });
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.getUsersList({
    search: req.query.search as string | undefined,
    role: req.query.role as string | undefined,
    educationLevel: req.query.educationLevel as string | undefined,
    page: parseInt((req.query.page as string) || '1', 10),
    limit: parseInt((req.query.limit as string) || '20', 10),
  });
  res.status(200).json({ success: true, data: result.users, meta: result.meta });
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { role } = req.body;
  const updated = await adminService.updateUserRole(
    req.user!.userId,
    id,
    role,
    req.ip
  );
  res.status(200).json({ success: true, data: updated });
});

export const toggleUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { isActive } = req.body;
  const result = await adminService.toggleUserStatus(
    req.user!.userId,
    id,
    isActive,
    req.ip
  );
  res.status(200).json({ success: true, data: result });
});

export const createCompetition = asyncHandler(async (req: Request, res: Response) => {
  const comp = await adminService.createAdminCompetition(
    req.user!.userId,
    req.body,
    req.ip
  );
  res.status(201).json({ success: true, data: comp });
});

export const updateCompetition = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const comp = await adminService.updateAdminCompetition(
    req.user!.userId,
    id,
    req.body,
    req.ip
  );
  res.status(200).json({ success: true, data: comp });
});

export const updateCompetitionStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;
  const comp = await adminService.updateCompetitionStatus(
    req.user!.userId,
    id,
    status,
    req.ip
  );
  res.status(200).json({ success: true, data: comp });
});

export const assignQuestions = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { questionIds } = req.body;
  const result = await adminService.assignQuestionsToCompetition(
    req.user!.userId,
    id,
    questionIds,
    req.ip
  );
  res.status(200).json({ success: true, data: result });
});

export const getCompetitionQuestions = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const questions = await adminService.getCompetitionQuestions(id);
  res.status(200).json({ success: true, data: questions });
});

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '50', 10);
  const entityType = req.query.entityType as string | undefined;

  const result = await auditService.getAuditLogs(page, limit, entityType);
  res.status(200).json({ success: true, data: result.logs, meta: result.meta });
});

export const createTeacher = asyncHandler(async (req: Request, res: Response) => {
  const data = await adminService.createTeacher(req.user!.userId, req.body, req.ip);
  res.status(201).json({ success: true, data });
});

export const listTeachers = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.listTeachers();
  res.status(200).json({ success: true, data });
});

export const resendTeacherInvite = asyncHandler(async (req: Request, res: Response) => {
  const data = await adminService.resendTeacherInvite(req.user!.userId, req.params.id as string, req.ip);
  res.status(200).json({ success: true, data });
});
