import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as invitationService from '../services/invitation.service.js';

export const sendInvitation = asyncHandler(async (req: Request, res: Response) => {
  const { teamId, receiverId } = req.body;
  const invitation = await invitationService.sendInvitation(
    req.user!.userId,
    teamId,
    receiverId
  );
  res.status(201).json({ success: true, data: invitation });
});

export const getMyInvitations = asyncHandler(async (req: Request, res: Response) => {
  const invitations = await invitationService.getMyInvitations(req.user!.userId);
  res.status(200).json({ success: true, data: invitations });
});

export const getTeamInvitations = asyncHandler(async (req: Request, res: Response) => {
  const teamId = req.params.teamId as string;
  const invitations = await invitationService.getTeamInvitations(
    teamId,
    req.user!.userId
  );
  res.status(200).json({ success: true, data: invitations });
});

export const acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await invitationService.acceptInvitation(
    id,
    req.user!.userId
  );
  res.status(200).json({ success: true, data: result });
});

export const rejectInvitation = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await invitationService.rejectInvitation(
    id,
    req.user!.userId
  );
  res.status(200).json({ success: true, data: result });
});

export const cancelInvitation = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await invitationService.cancelInvitation(
    id,
    req.user!.userId
  );
  res.status(200).json({ success: true, data: result });
});
