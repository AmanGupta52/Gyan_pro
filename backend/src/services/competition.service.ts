import mongoose from 'mongoose';
import { Competition, type ICompetition } from '../models/Competition.js';
import { CompetitionRegistration } from '../models/CompetitionRegistration.js';
import { Team } from '../models/Team.js';
import { TeamMember } from '../models/TeamMember.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { createNotification } from './notification.service.js';

export interface CompetitionFilterParams {
  category?: string;
  status?: string;
  participationMode?: string;
  page?: number;
  limit?: number;
}

export async function getCompetitions(params: CompetitionFilterParams) {
  const { category, status, participationMode, page = 1, limit = 12 } = params;

  const filter: Record<string, unknown> = {};

  if (category && category !== 'all') {
    filter.category = category;
  }

  if (status && status !== 'all') {
    filter.status = status;
  } else {
    // Hide Drafts from public listing
    filter.status = { $ne: 'Draft' };
  }

  if (participationMode && participationMode !== 'all') {
    filter.participationMode = participationMode;
  }

  const skip = (page - 1) * limit;

  const [competitions, total] = await Promise.all([
    Competition.find(filter)
      .sort({ startAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Competition.countDocuments(filter),
  ]);

  return {
    competitions,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCompetitionById(competitionId: string) {
  const competition = await Competition.findById(competitionId).lean();
  if (!competition) {
    throw AppError.notFound('Competition not found');
  }

  // Count registered teams
  const registrationCount = await CompetitionRegistration.countDocuments({
    competitionId: competition._id,
    status: 'confirmed',
  });

  return {
    ...competition,
    registrationCount,
  };
}

export async function registerForCompetition(
  competitionId: string,
  userId: string,
  teamId?: string
) {
  const competition = await Competition.findById(competitionId);
  if (!competition) {
    throw AppError.notFound('Competition not found');
  }

  // Check competition status
  if (competition.status !== 'Registration Open') {
    throw AppError.badRequest(
      `Registration is not currently open for this competition (Status: ${competition.status}).`
    );
  }

  // Check registration deadline
  if (new Date() > competition.registrationDeadline) {
    throw AppError.badRequest('The registration deadline for this competition has passed.');
  }

  const registeringUser = await User.findById(userId);
  if (!registeringUser) {
    throw AppError.notFound('User not found');
  }

  // Unverified users cannot register for competitions
  if (!registeringUser.isEmailVerified) {
    throw AppError.forbidden(
      'Please verify your email address before registering for competitions.'
    );
  }

  let finalTeamId: mongoose.Types.ObjectId;
  let memberUserIds: mongoose.Types.ObjectId[];

  if (competition.participationMode === 'individual') {
    // Individual competition: run as a team of 1 so the game engine has a single code path
    // Find or create a personal solo team
    let soloTeam = await Team.findOne({
      leaderId: registeringUser._id,
      size: 2, // will be treated as single player
      name: `${registeringUser.name} (Solo)`,
      category: competition.category,
      status: 'active',
    });

    if (!soloTeam) {
      soloTeam = await Team.create({
        name: `${registeringUser.name} (Solo)`,
        category: competition.category,
        size: 2,
        leaderId: registeringUser._id,
        currentMemberCount: 1,
        status: 'active',
      });

      await TeamMember.create({
        teamId: soloTeam._id,
        userId: registeringUser._id,
        role: 'leader',
      });
    }

    finalTeamId = soloTeam._id;
    memberUserIds = [registeringUser._id];
  } else {
    // Team competition
    if (!teamId) {
      throw AppError.badRequest('Team ID is required for team competitions');
    }

    const team = await Team.findById(teamId);
    if (!team || team.status === 'disbanded') {
      throw AppError.notFound('Team not found');
    }

    if (team.leaderId.toString() !== userId) {
      throw AppError.forbidden('Only the team leader can register the team for a competition');
    }

    // A team can register only if its member count equals the competition's allowedTeamSize
    if (team.currentMemberCount !== competition.allowedTeamSize || team.size !== competition.allowedTeamSize) {
      throw AppError.badRequest(
        `This team has ${team.currentMemberCount} members (capacity ${team.size}), but this competition requires exactly ${competition.allowedTeamSize} members.`
      );
    }

    // Category check
    if (team.category !== competition.category) {
      throw AppError.badRequest(
        `Squad category "${team.category}" does not match competition category "${competition.category}".`
      );
    }

    // Fetch all members
    const members = await TeamMember.find({ teamId: team._id }).populate('userId');
    memberUserIds = members.map((m: any) => m.userId._id);

    // Verify all members
    for (const m of members as any) {
      if (!m.userId.isEmailVerified) {
        throw AppError.badRequest(
          `Team member ${m.userId.name} has not verified their email address yet.`
        );
      }
    }

    finalTeamId = team._id;
  }

  // Check: A player can be in only one team per competition
  const existingRegistrations = await CompetitionRegistration.find({
    competitionId: competition._id,
    memberUserIds: { $in: memberUserIds },
    status: 'confirmed',
  }).populate('memberUserIds', 'name');

  if (existingRegistrations.length > 0) {
    const conflictingUsers = existingRegistrations.flatMap((r: any) =>
      r.memberUserIds
        .filter((u: any) => memberUserIds.some((m) => m.equals(u._id)))
        .map((u: any) => u.name)
    );
    throw AppError.conflict(
      `Player(s) already registered in another squad for this competition: ${Array.from(
        new Set(conflictingUsers)
      ).join(', ')}`
    );
  }

  // Max teams limit check
  if (competition.maxTeams) {
    const count = await CompetitionRegistration.countDocuments({
      competitionId: competition._id,
      status: 'confirmed',
    });
    if (count >= competition.maxTeams) {
      throw AppError.badRequest('This competition has reached its maximum team capacity.');
    }
  }

  const registration = await CompetitionRegistration.create({
    competitionId: competition._id,
    teamId: finalTeamId,
    registeredBy: registeringUser._id,
    memberUserIds,
    status: 'confirmed',
    registeredAt: new Date(),
  });

  // Notify all team members
  for (const mId of memberUserIds) {
    await createNotification({
      receiverId: mId,
      title: 'Competition Registration Confirmed',
      message: `Your squad is registered for "${competition.name}"! Match starts at ${new Date(
        competition.startAt
      ).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.`,
      type: 'registration',
      link: `/competitions/${competition._id.toString()}`,
    });
  }

  return registration;
}

export async function getUserRegistrations(userId: string) {
  const registrations = await CompetitionRegistration.find({
    memberUserIds: userId,
    status: 'confirmed',
  })
    .populate('competitionId')
    .populate('teamId')
    .sort({ registeredAt: -1 })
    .lean();

  return registrations;
}
