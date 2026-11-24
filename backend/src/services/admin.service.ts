import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Team } from '../models/Team.js';
import { Competition, isValidTransition, type CompetitionStatus } from '../models/Competition.js';
import { CompetitionQuestion } from '../models/CompetitionQuestion.js';
import { Question } from '../models/Question.js';
import { AppError } from '../utils/AppError.js';
import { logAudit } from './audit.service.js';
import { finalizeCompetitionRanks } from './result.service.js';
import { issueCertificatesForCompetition } from './certificate.service.js';
import type { UserRole } from '../types/index.js';

export async function getDashboardStats() {
  const [
    totalUsers,
    activeUsers,
    totalTeams,
    activeTeams,
    totalCompetitions,
    liveCompetitions,
    completedCompetitions,
    totalQuestions,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    Team.countDocuments(),
    Team.countDocuments({ status: 'active' }),
    Competition.countDocuments(),
    Competition.countDocuments({ status: 'Live' }),
    Competition.countDocuments({ status: 'Completed' }),
    Question.countDocuments({ status: 'published' }),
  ]);

  return {
    totalUsers,
    activeUsers,
    totalTeams,
    activeTeams,
    totalCompetitions,
    liveCompetitions,
    completedCompetitions,
    totalQuestions,
    certificatesIssued: 0, // In Phase 6 will count real certificates
  };
}

export async function getUsersList(params: {
  search?: string;
  role?: string;
  educationLevel?: string;
  page?: number;
  limit?: number;
}) {
  const { search, role, educationLevel, page = 1, limit = 20 } = params;

  const filter: Record<string, unknown> = {};

  if (role && role !== 'all') {
    filter.role = role;
  }
  if (educationLevel && educationLevel !== 'all') {
    filter.educationLevel = educationLevel;
  }
  if (search && search.trim()) {
    const rx = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: search.trim() }];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email phone role educationLevel institution city state country isEmailVerified isActive lastLoginAt createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateUserRole(
  superAdminId: string,
  targetUserId: string,
  newRole: UserRole,
  ipAddress?: string
) {
  const superAdmin = await User.findById(superAdminId);
  if (!superAdmin || superAdmin.role !== 'superAdmin') {
    throw AppError.forbidden('Only superAdmin can change user roles.');
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  const oldRole = user.role;
  user.role = newRole;
  await user.save();

  await logAudit({
    userId: superAdminId,
    action: 'USER_ROLE_CHANGE',
    entityType: 'User',
    entityId: targetUserId,
    details: { oldRole, newRole, targetEmail: user.email },
    ipAddress,
  });

  return user.toPublicJSON();
}

export async function toggleUserStatus(
  adminId: string,
  targetUserId: string,
  isActive: boolean,
  ipAddress?: string
) {
  if (adminId === targetUserId) {
    throw AppError.badRequest('You cannot disable your own admin account.');
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  user.isActive = isActive;
  await user.save();

  await logAudit({
    userId: adminId,
    action: isActive ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
    entityType: 'User',
    entityId: targetUserId,
    details: { targetEmail: user.email, isActive },
    ipAddress,
  });

  return { message: `User status updated to ${isActive ? 'active' : 'inactive'}` };
}

export async function createAdminCompetition(
  adminId: string,
  data: any,
  ipAddress?: string
) {
  const comp = await Competition.create({
    ...data,
    status: 'Draft',
  });

  await logAudit({
    userId: adminId,
    action: 'COMPETITION_CREATE',
    entityType: 'Competition',
    entityId: comp._id.toString(),
    details: { name: comp.name, category: comp.category },
    ipAddress,
  });

  return comp;
}

export async function updateAdminCompetition(
  adminId: string,
  competitionId: string,
  updates: any,
  ipAddress?: string
) {
  const comp = await Competition.findById(competitionId);
  if (!comp) {
    throw AppError.notFound('Competition not found');
  }

  Object.assign(comp, updates);
  await comp.save();

  await logAudit({
    userId: adminId,
    action: 'COMPETITION_UPDATE',
    entityType: 'Competition',
    entityId: competitionId,
    details: updates,
    ipAddress,
  });

  return comp;
}

export async function updateCompetitionStatus(
  adminId: string,
  competitionId: string,
  newStatus: CompetitionStatus,
  ipAddress?: string
) {
  const comp = await Competition.findById(competitionId);
  if (!comp) {
    throw AppError.notFound('Competition not found');
  }

  if (!isValidTransition(comp.status, newStatus)) {
    throw AppError.badRequest(
      `Invalid competition status transition from "${comp.status}" to "${newStatus}".`
    );
  }

  const previousStatus = comp.status;
  comp.status = newStatus;
  await comp.save();

  if (newStatus === 'Completed') {
    await finalizeCompetitionRanks(competitionId);
    // Asynchronously issue official PDF certificates for all participating players
    issueCertificatesForCompetition(competitionId).catch((err) =>
      console.error('Error generating certificates upon tournament completion:', err)
    );
  }

  await logAudit({
    userId: adminId,
    action: 'COMPETITION_STATUS_TRANSITION',
    entityType: 'Competition',
    entityId: competitionId,
    details: { previousStatus, newStatus },
    ipAddress,
  });

  return comp;
}

export async function assignQuestionsToCompetition(
  adminId: string,
  competitionId: string,
  questionIds: string[],
  ipAddress?: string
) {
  const comp = await Competition.findById(competitionId);
  if (!comp) {
    throw AppError.notFound('Competition not found');
  }

  // Clear existing questions for competition
  await CompetitionQuestion.deleteMany({ competitionId: comp._id });

  // Bulk insert
  const docs = questionIds.map((qId, idx) => ({
    competitionId: comp._id,
    questionId: new mongoose.Types.ObjectId(qId),
    order: idx + 1,
  }));

  await CompetitionQuestion.insertMany(docs);

  comp.numberOfQuestions = questionIds.length;
  await comp.save();

  await logAudit({
    userId: adminId,
    action: 'COMPETITION_QUESTIONS_ASSIGN',
    entityType: 'Competition',
    entityId: competitionId,
    details: { questionCount: questionIds.length },
    ipAddress,
  });

  return { message: `Assigned ${questionIds.length} questions to competition`, count: questionIds.length };
}

export async function getCompetitionQuestions(competitionId: string) {
  const list = await CompetitionQuestion.find({ competitionId })
    .populate({
      path: 'questionId',
      select: '+correctAnswers +explanation',
      populate: { path: 'subjectId', select: 'name code' },
    })
    .sort({ order: 1 })
    .lean();

  return list;
}
