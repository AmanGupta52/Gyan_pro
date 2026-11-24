import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as teamService from '../services/team.service.js';
import * as joinRequestService from '../services/joinRequest.service.js';

export const createTeam = asyncHandler(async (req: Request, res: Response) => {
  const team = await teamService.createTeam(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: team });
});

export const getMyTeams = asyncHandler(async (req: Request, res: Response) => {
  const teams = await teamService.getUserTeams(req.user!.userId);
  res.status(200).json({ success: true, data: teams });
});

export const getTeamById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const team = await teamService.getTeamById(id);
  res.status(200).json({ success: true, data: team });
});

export const updateTeam = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const updated = await teamService.updateTeam(id, req.user!.userId, req.body);
  res.status(200).json({ success: true, data: updated });
});

export const disbandTeam = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await teamService.disbandTeam(id, req.user!.userId);
  res.status(200).json({ success: true, data: result });
});

export const leaveTeam = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await teamService.leaveTeam(id, req.user!.userId);
  res.status(200).json({ success: true, data: result });
});

export const transferLeadership = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { newLeaderId } = req.body;
  const result = await teamService.transferLeadership(
    id,
    req.user!.userId,
    newLeaderId
  );
  res.status(200).json({ success: true, data: result });
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const memberId = req.params.memberId as string;
  const result = await teamService.removeMember(
    id,
    req.user!.userId,
    memberId
  );
  res.status(200).json({ success: true, data: result });
});

export const requestToJoin = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await joinRequestService.createJoinRequest(
    req.user!.userId,
    id,
    req.body.message
  );
  res.status(201).json({ success: true, data: result });
});

export const getTeamJoinRequests = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const requests = await joinRequestService.getTeamJoinRequests(
    id,
    req.user!.userId
  );
  res.status(200).json({ success: true, data: requests });
});

export const acceptJoinRequest = asyncHandler(async (req: Request, res: Response) => {
  const requestId = req.params.requestId as string;
  const result = await joinRequestService.acceptJoinRequest(
    requestId,
    req.user!.userId
  );
  res.status(200).json({ success: true, data: result });
});

export const rejectJoinRequest = asyncHandler(async (req: Request, res: Response) => {
  const requestId = req.params.requestId as string;
  const result = await joinRequestService.rejectJoinRequest(
    requestId,
    req.user!.userId
  );
  res.status(200).json({ success: true, data: result });
});
