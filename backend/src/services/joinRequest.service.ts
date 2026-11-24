import { JoinRequest } from '../models/JoinRequest.js';
import { Team } from '../models/Team.js';
import { TeamMember } from '../models/TeamMember.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { createNotification } from './notification.service.js';

export async function createJoinRequest(userId: string, teamId: string, message?: string) {
  const team = await Team.findById(teamId);
  if (!team || team.status === 'disbanded') {
    throw AppError.notFound('Team not found');
  }

  if (team.currentMemberCount >= team.size) {
    throw AppError.badRequest('This team has reached its player limit.');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  if (user.educationLevel !== team.category) {
    throw AppError.badRequest(
      `Your category (${user.educationLevel}) does not match the squad's category (${team.category}).`
    );
  }

  const existingMember = await TeamMember.findOne({ teamId: team._id, userId });
  if (existingMember) {
    throw AppError.conflict('You are already a member of this squad');
  }

  const existingRequest = await JoinRequest.findOne({
    teamId: team._id,
    userId,
    status: 'Pending',
  });
  if (existingRequest) {
    throw AppError.conflict('You already have a pending join request for this squad.');
  }

  const request = await JoinRequest.create({
    teamId: team._id,
    userId,
    message: message?.trim(),
    status: 'Pending',
  });

  // Notify team leader
  await createNotification({
    receiverId: team.leaderId,
    title: 'Squad Join Request',
    message: `${user.name} has requested to join your squad "${team.name}".`,
    type: 'request',
    link: '/teams',
    metadata: { teamId: team._id.toString(), requestId: request._id.toString() },
  });

  return request;
}

export async function acceptJoinRequest(requestId: string, leaderId: string) {
  const request = await JoinRequest.findById(requestId);
  if (!request) {
    throw AppError.notFound('Join request not found');
  }

  const team = await Team.findById(request.teamId);
  if (!team || team.status === 'disbanded') {
    throw AppError.notFound('Team not found');
  }

  if (team.leaderId.toString() !== leaderId) {
    throw AppError.forbidden('Only the team leader can accept join requests');
  }

  if (request.status !== 'Pending') {
    throw AppError.badRequest(`Join request is already ${request.status.toLowerCase()}`);
  }

  // Atomic member count check & increment
  const updatedTeam = await Team.findOneAndUpdate(
    {
      _id: team._id,
      currentMemberCount: { $lt: team.size },
      status: 'active',
    },
    {
      $inc: { currentMemberCount: 1 },
    },
    { new: true }
  );

  if (!updatedTeam) {
    throw AppError.badRequest('This team has reached its player limit.');
  }

  await TeamMember.create({
    teamId: team._id,
    userId: request.userId,
    role: 'member',
    joinedAt: new Date(),
  });

  request.status = 'Accepted';
  request.respondedAt = new Date();
  await request.save();

  // Notify accepted user
  await createNotification({
    receiverId: request.userId,
    title: 'Join Request Accepted',
    message: `Your request to join "${team.name}" has been accepted!`,
    type: 'accept',
    link: '/teams',
  });

  return { message: 'Member accepted successfully', teamId: team._id };
}

export async function rejectJoinRequest(requestId: string, leaderId: string) {
  const request = await JoinRequest.findById(requestId);
  if (!request) {
    throw AppError.notFound('Join request not found');
  }

  const team = await Team.findById(request.teamId);
  if (!team || team.leaderId.toString() !== leaderId) {
    throw AppError.forbidden('Only the team leader can reject join requests');
  }

  if (request.status !== 'Pending') {
    throw AppError.badRequest(`Join request is already ${request.status.toLowerCase()}`);
  }

  request.status = 'Rejected';
  request.respondedAt = new Date();
  await request.save();

  // Notify rejected user
  await createNotification({
    receiverId: request.userId,
    title: 'Join Request Declined',
    message: `Your request to join "${team.name}" was declined.`,
    type: 'reject',
    link: '/teams',
  });

  return { message: 'Join request declined' };
}

export async function getTeamJoinRequests(teamId: string, leaderId: string) {
  const team = await Team.findById(teamId);
  if (!team || team.leaderId.toString() !== leaderId) {
    throw AppError.forbidden('Only the team leader can view join requests');
  }

  return JoinRequest.find({ teamId, status: 'Pending' })
    .populate('userId', 'name email photo educationLevel city')
    .sort({ createdAt: -1 })
    .lean();
}
