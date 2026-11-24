import mongoose from 'mongoose';
import { Team, type TeamSize } from '../models/Team.js';
import { TeamMember } from '../models/TeamMember.js';
import { CompetitionRegistration } from '../models/CompetitionRegistration.js';
import { Competition } from '../models/Competition.js';
import { AppError } from '../utils/AppError.js';
import { createNotification } from './notification.service.js';

export interface CreateTeamData {
  name: string;
  description?: string;
  category: string;
  size: TeamSize;
}

export async function createTeam(leaderId: string, data: CreateTeamData) {
  if (![2, 4, 6].includes(data.size)) {
    throw AppError.badRequest('Team size must be 2, 4, or 6 players');
  }

  // Check unique team name per category
  const existingTeam = await Team.findOne({
    name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
    category: data.category,
    status: 'active',
  });

  if (existingTeam) {
    throw AppError.conflict(
      `A team with the name "${data.name}" already exists in the ${data.category} category.`
    );
  }

  // Start Mongoose session for atomic creation
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [team] = await Team.create(
      [
        {
          name: data.name.trim(),
          description: data.description?.trim(),
          category: data.category,
          size: data.size,
          leaderId,
          currentMemberCount: 1,
          status: 'active',
        },
      ],
      { session }
    );

    await TeamMember.create(
      [
        {
          teamId: team._id,
          userId: leaderId,
          role: 'leader',
          joinedAt: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return getTeamById(team._id.toString());
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function getTeamById(teamId: string) {
  const team = await Team.findById(teamId).lean();
  if (!team || team.status === 'disbanded') {
    throw AppError.notFound('Team not found');
  }

  const members = await TeamMember.find({ teamId: team._id })
    .populate('userId', 'name email phone photo educationLevel city state country')
    .lean();

  return {
    ...team,
    members: members.map((m: any) => ({
      _id: m._id.toString(),
      userId: m.userId?._id?.toString(),
      name: m.userId?.name,
      email: m.userId?.email,
      phone: m.userId?.phone,
      photo: m.userId?.photo,
      educationLevel: m.userId?.educationLevel,
      city: m.userId?.city,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  };
}

export async function getUserTeams(userId: string) {
  // Find all teams where user is a member
  const memberships = await TeamMember.find({ userId }).select('teamId role').lean();
  const teamIds = memberships.map((m) => m.teamId);

  const teams = await Team.find({
    _id: { $in: teamIds },
    status: 'active',
  })
    .sort({ updatedAt: -1 })
    .lean();

  const results = await Promise.all(
    teams.map(async (t) => {
      const members = await TeamMember.find({ teamId: t._id })
        .populate('userId', 'name photo educationLevel city')
        .lean();

      return {
        ...t,
        members: members.map((m: any) => ({
          _id: m._id.toString(),
          userId: m.userId?._id?.toString(),
          name: m.userId?.name,
          photo: m.userId?.photo,
          educationLevel: m.userId?.educationLevel,
          city: m.userId?.city,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
      };
    })
  );

  return results;
}

export async function updateTeam(
  teamId: string,
  userId: string,
  updates: { name?: string; description?: string }
) {
  const team = await Team.findById(teamId);
  if (!team || team.status === 'disbanded') {
    throw AppError.notFound('Team not found');
  }

  if (team.leaderId.toString() !== userId) {
    throw AppError.forbidden('Only the team leader can update team settings');
  }

  if (updates.name && updates.name.trim() !== team.name) {
    const existing = await Team.findOne({
      _id: { $ne: team._id },
      name: { $regex: new RegExp(`^${updates.name.trim()}$`, 'i') },
      category: team.category,
      status: 'active',
    });
    if (existing) {
      throw AppError.conflict(
        `A team with the name "${updates.name}" already exists in this category.`
      );
    }
    team.name = updates.name.trim();
  }

  if (updates.description !== undefined) {
    team.description = updates.description.trim();
  }

  await team.save();
  return getTeamById(teamId);
}

export async function disbandTeam(teamId: string, userId: string) {
  const team = await Team.findById(teamId);
  if (!team || team.status === 'disbanded') {
    throw AppError.notFound('Team not found');
  }

  if (team.leaderId.toString() !== userId) {
    throw AppError.forbidden('Only the team leader can disband the team');
  }

  // Check if team is registered in a Live competition
  const liveRegistrations = await CompetitionRegistration.find({
    teamId: team._id,
    status: 'confirmed',
  }).populate('competitionId');

  const hasLiveCompetition = liveRegistrations.some(
    (reg: any) => reg.competitionId?.status === 'Live'
  );

  if (hasLiveCompetition) {
    throw AppError.badRequest(
      'Cannot disband team while participating in an ongoing Live competition.'
    );
  }

  team.status = 'disbanded';
  await team.save();

  // Notify members
  const members = await TeamMember.find({ teamId: team._id, userId: { $ne: userId } });
  for (const m of members) {
    await createNotification({
      receiverId: m.userId,
      title: 'Squad Disbanded',
      message: `The squad "${team.name}" has been disbanded by the leader.`,
      type: 'announcement',
    });
  }

  await TeamMember.deleteMany({ teamId: team._id });
  return { message: 'Team disbanded successfully' };
}

export async function leaveTeam(teamId: string, userId: string) {
  const team = await Team.findById(teamId);
  if (!team || team.status === 'disbanded') {
    throw AppError.notFound('Team not found');
  }

  if (team.leaderId.toString() === userId) {
    throw AppError.badRequest(
      'Team leader cannot leave. Transfer leadership or disband the team instead.'
    );
  }

  // Check if live game in progress
  const liveRegistrations = await CompetitionRegistration.find({
    teamId: team._id,
    status: 'confirmed',
  }).populate('competitionId');

  const hasLive = liveRegistrations.some((r: any) => r.competitionId?.status === 'Live');
  if (hasLive) {
    throw AppError.badRequest('You cannot leave a team during a live competition game.');
  }

  const membership = await TeamMember.findOneAndDelete({ teamId: team._id, userId });
  if (!membership) {
    throw AppError.notFound("You haven't joined a team yet.");
  }

  // Decrement count atomically
  await Team.findByIdAndUpdate(team._id, { $inc: { currentMemberCount: -1 } });

  // Notify leader
  await createNotification({
    receiverId: team.leaderId,
    title: 'Squad Member Left',
    message: `A member has left squad "${team.name}".`,
    type: 'announcement',
    link: `/teams`,
  });

  return { message: 'Successfully left the team' };
}

export async function transferLeadership(teamId: string, currentLeaderId: string, newLeaderId: string) {
  const team = await Team.findById(teamId);
  if (!team || team.status === 'disbanded') {
    throw AppError.notFound('Team not found');
  }

  if (team.leaderId.toString() !== currentLeaderId) {
    throw AppError.forbidden('Only the current leader can transfer leadership');
  }

  if (currentLeaderId === newLeaderId) {
    throw AppError.badRequest('You are already the team leader');
  }

  const targetMember = await TeamMember.findOne({ teamId: team._id, userId: newLeaderId });
  if (!targetMember) {
    throw AppError.badRequest('Selected player is not a member of this team');
  }

  // Switch roles
  await TeamMember.updateOne({ teamId: team._id, userId: currentLeaderId }, { role: 'member' });
  await TeamMember.updateOne({ teamId: team._id, userId: newLeaderId }, { role: 'leader' });

  team.leaderId = new mongoose.Types.ObjectId(newLeaderId);
  await team.save();

  await createNotification({
    receiverId: newLeaderId,
    title: 'Leadership Transferred',
    message: `You are now the team leader of "${team.name}"!`,
    type: 'accept',
    link: `/teams`,
  });

  return getTeamById(teamId);
}

export async function removeMember(teamId: string, leaderId: string, targetUserId: string) {
  const team = await Team.findById(teamId);
  if (!team || team.status === 'disbanded') {
    throw AppError.notFound('Team not found');
  }

  if (team.leaderId.toString() !== leaderId) {
    throw AppError.forbidden('Only the team leader can remove members');
  }

  if (leaderId === targetUserId) {
    throw AppError.badRequest('Leader cannot remove themselves');
  }

  // Check live game
  const liveRegistrations = await CompetitionRegistration.find({
    teamId: team._id,
    status: 'confirmed',
  }).populate('competitionId');

  const hasLive = liveRegistrations.some((r: any) => r.competitionId?.status === 'Live');
  if (hasLive) {
    throw AppError.badRequest('Cannot remove members during a live competition.');
  }

  const deleted = await TeamMember.findOneAndDelete({ teamId: team._id, userId: targetUserId });
  if (!deleted) {
    throw AppError.notFound('Member not found in team');
  }

  await Team.findByIdAndUpdate(team._id, { $inc: { currentMemberCount: -1 } });

  await createNotification({
    receiverId: targetUserId,
    title: 'Removed from Squad',
    message: `You have been removed from "${team.name}".`,
    type: 'reject',
    link: `/teams`,
  });

  return getTeamById(teamId);
}
