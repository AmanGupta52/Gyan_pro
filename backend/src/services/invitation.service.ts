import mongoose from 'mongoose';
import { Invitation, type IInvitation } from '../models/Invitation.js';
import { Team } from '../models/Team.js';
import { TeamMember } from '../models/TeamMember.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { createNotification } from './notification.service.js';

export async function sendInvitation(leaderId: string, teamId: string, receiverId: string) {
  if (leaderId === receiverId) {
    throw AppError.badRequest('You cannot invite yourself');
  }

  const team = await Team.findById(teamId);
  if (!team || team.status === 'disbanded') {
    throw AppError.notFound('Team not found');
  }

  if (team.leaderId.toString() !== leaderId) {
    throw AppError.forbidden('Only the team leader can send invitations');
  }

  // Check if team is already full
  if (team.currentMemberCount >= team.size) {
    throw AppError.badRequest('This team has reached its player limit.');
  }

  const receiver = await User.findById(receiverId);
  if (!receiver || !receiver.isActive) {
    throw AppError.notFound('Player not found or inactive');
  }

  // Check category match
  if (receiver.educationLevel !== team.category) {
    throw AppError.badRequest(
      `Player is in category "${receiver.educationLevel}", but team requires "${team.category}".`
    );
  }

  // Check if player is already a member of this team
  const existingMember = await TeamMember.findOne({ teamId: team._id, userId: receiverId });
  if (existingMember) {
    throw AppError.conflict('This player is already a member of this squad');
  }

  // Check for existing pending invitation (with exact error copy required)
  const existingInvite = await Invitation.findOne({
    teamId: team._id,
    receiverId,
    status: 'Pending',
    expiresAt: { $gt: new Date() },
  });

  if (existingInvite) {
    throw AppError.conflict('This player already has a pending invitation.');
  }

  const invitation = await Invitation.create({
    teamId: team._id,
    senderId: leaderId,
    receiverId,
    status: 'Pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  // Notify the invited player
  await createNotification({
    receiverId,
    title: 'Squad Invitation',
    message: `You have been invited to join squad "${team.name}" (${team.category}).`,
    type: 'invite',
    link: '/teams',
    metadata: { teamId: team._id.toString(), invitationId: invitation._id.toString() },
  });

  return invitation;
}

export async function acceptInvitation(invitationId: string, userId: string) {
  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    throw AppError.notFound('Invitation not found');
  }

  if (invitation.receiverId.toString() !== userId) {
    throw AppError.forbidden('This invitation was sent to another player');
  }

  // Check if expired
  if (invitation.status === 'Pending' && invitation.expiresAt < new Date()) {
    invitation.status = 'Expired';
    await invitation.save();
    throw AppError.badRequest('This invitation has expired.');
  }

  if (invitation.status !== 'Pending') {
    throw AppError.badRequest(`Invitation is already ${invitation.status.toLowerCase()}`);
  }

  const team = await Team.findById(invitation.teamId);
  if (!team || team.status === 'disbanded') {
    throw AppError.badRequest('The squad no longer exists');
  }

  // Check already member
  const existingMember = await TeamMember.findOne({
    teamId: team._id,
    userId,
  });
  if (existingMember) {
    invitation.status = 'Accepted';
    await invitation.save();
    return { message: 'You are already a member of this squad' };
  }

  // Atomic member limit check and increment
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

  // Add member
  await TeamMember.create({
    teamId: team._id,
    userId,
    role: 'member',
    joinedAt: new Date(),
  });

  invitation.status = 'Accepted';
  invitation.respondedAt = new Date();
  await invitation.save();

  // Notify team leader
  const user = await User.findById(userId).select('name');
  await createNotification({
    receiverId: team.leaderId,
    title: 'Invitation Accepted',
    message: `${user?.name || 'A player'} accepted your invitation and joined "${team.name}"!`,
    type: 'accept',
    link: '/teams',
  });

  return { message: `Successfully joined ${team.name}`, teamId: team._id };
}

export async function rejectInvitation(invitationId: string, userId: string) {
  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    throw AppError.notFound('Invitation not found');
  }

  if (invitation.receiverId.toString() !== userId) {
    throw AppError.forbidden('This invitation was sent to another player');
  }

  if (invitation.status !== 'Pending') {
    throw AppError.badRequest(`Invitation is already ${invitation.status.toLowerCase()}`);
  }

  invitation.status = 'Rejected';
  invitation.respondedAt = new Date();
  await invitation.save();

  const team = await Team.findById(invitation.teamId);
  if (team) {
    const user = await User.findById(userId).select('name');
    await createNotification({
      receiverId: team.leaderId,
      title: 'Invitation Declined',
      message: `${user?.name || 'A player'} declined the invitation to join "${team.name}".`,
      type: 'reject',
    });
  }

  return { message: 'Invitation declined' };
}

export async function cancelInvitation(invitationId: string, leaderId: string) {
  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    throw AppError.notFound('Invitation not found');
  }

  const team = await Team.findById(invitation.teamId);
  if (!team || team.leaderId.toString() !== leaderId) {
    throw AppError.forbidden('Only the team leader can cancel this invitation');
  }

  if (invitation.status !== 'Pending') {
    throw AppError.badRequest('Only pending invitations can be cancelled');
  }

  invitation.status = 'Cancelled';
  invitation.respondedAt = new Date();
  await invitation.save();

  return { message: 'Invitation cancelled' };
}

export async function getMyInvitations(userId: string) {
  // Mark expired invitations lazily
  await Invitation.updateMany(
    {
      receiverId: userId,
      status: 'Pending',
      expiresAt: { $lt: new Date() },
    },
    { status: 'Expired' }
  );

  const invitations = await Invitation.find({
    receiverId: userId,
    status: 'Pending',
  })
    .populate('teamId', 'name category size currentMemberCount')
    .populate('senderId', 'name photo educationLevel')
    .sort({ createdAt: -1 })
    .lean();

  return invitations;
}

export async function getTeamInvitations(teamId: string, leaderId: string) {
  const team = await Team.findById(teamId);
  if (!team || team.leaderId.toString() !== leaderId) {
    throw AppError.forbidden('Only the team leader can view team invitations');
  }

  return Invitation.find({ teamId })
    .populate('receiverId', 'name email photo educationLevel city')
    .sort({ createdAt: -1 })
    .lean();
}
