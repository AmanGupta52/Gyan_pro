import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as classService from '../services/class.service.js';

const id = (req: Request) => req.params.id as string;
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });

// ── Classes ──
export const createClass = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.createClass(req.user!, req.body, req.ip), 201));

export const listMine = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.listManagedClasses(req.user!, req.query.scope === 'all' ? 'all' : 'mine')));

export const getClass = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.getClassDetail(req.user!, id(req))));

export const updateClass = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.updateClass(req.user!, id(req), req.body)));

export const deleteClass = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.deleteClass(req.user!, id(req), req.ip)));

export const regenerateCode = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.regenerateClassCode(req.user!, id(req))));

export const addMembers = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.addMembersByEmail(req.user!, id(req), req.body.emails)));

export const removeMember = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.removeMember(req.user!, id(req), req.params.userId as string)));

// ── Student side ──
export const join = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.joinClass(req.user!, req.body.code)));

export const leave = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.leaveClass(req.user!, id(req))));

export const listJoined = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.listJoinedClasses(req.user!)));

// ── Assignments ──
export const createAssignment = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.createAssignment(req.user!, id(req), req.body, req.ip), 201));

export const updateAssignment = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.updateAssignment(req.user!, id(req), req.body)));

export const removeAssignment = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.removeAssignment(req.user!, id(req), req.ip)));

export const assignmentProgress = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.getAssignmentProgress(req.user!, id(req))));

export const remind = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.remindPending(req.user!, id(req))));

export const myAssignments = asyncHandler(async (req: Request, res: Response) =>
  ok(res, await classService.listMyAssignments(req.user!)));
