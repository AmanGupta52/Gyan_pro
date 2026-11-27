import mongoose from 'mongoose';
import { ClassGroup, type IClassGroup } from '../models/ClassGroup.js';
import { ClassMember } from '../models/ClassMember.js';
import { Assignment, type IAssignment } from '../models/Assignment.js';
import { Quiz } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { canManageContent, isModerator } from '../utils/roles.js';
import { generateJoinCode } from '../utils/joinCode.js';
import { logAudit } from './audit.service.js';
import { createNotification } from './notification.service.js';
import { logger } from '../utils/logger.js';
import type { AuthPayload } from '../types/index.js';

const REMIND_COOLDOWN_MS = 60 * 60 * 1000; // once per hour per assignment

// ─── Pure helpers (unit-tested) ───────────────────────────────

export type AssignmentProgressStatus =
  | 'upcoming'
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'submitted_late'
  | 'overdue';

/** Where a single student stands on a single assignment. */
export function deriveAssignmentStatus(input: {
  now: Date;
  openAt: Date;
  dueAt: Date;
  hasFinished: boolean;
  finishedLate: boolean;
  hasInProgress: boolean;
}): AssignmentProgressStatus {
  if (input.hasFinished) return input.finishedLate ? 'submitted_late' : 'submitted';
  if (input.now < input.openAt) return 'upcoming';
  if (input.hasInProgress) return 'in_progress';
  if (input.now > input.dueAt) return 'overdue';
  return 'not_started';
}

export interface AttemptLite {
  userId: string;
  status: 'in_progress' | 'finished';
  totalScore: number;
  accuracy: number;
  passed: boolean;
  isLate: boolean;
  finishedAt?: Date;
  _id: string;
}

/** Best finished attempt (highest score; ties: earlier finish) plus an in-progress flag. */
export function summariseStudentAttempts(attempts: AttemptLite[]) {
  const finished = attempts
    .filter((a) => a.status === 'finished')
    .sort(
      (a, b) =>
        b.totalScore - a.totalScore ||
        new Date(a.finishedAt ?? 0).getTime() - new Date(b.finishedAt ?? 0).getTime()
    );
  const inProgress = attempts.find((a) => a.status === 'in_progress');
  return { best: finished[0], inProgress, attemptCount: attempts.length };
}

// ─── Permission helpers ───────────────────────────────────────

function assertId(id: string, what = 'Item') {
  if (!mongoose.isValidObjectId(id)) throw AppError.notFound(`${what} not found`);
}

async function loadManageableClass(actor: AuthPayload, classId: string): Promise<IClassGroup> {
  assertId(classId, 'Class');
  const cls = await ClassGroup.findById(classId);
  if (!cls) throw AppError.notFound('Class not found');
  if (!canManageContent(actor, cls.ownerId.toString())) {
    throw AppError.forbidden('You can only manage your own classes.');
  }
  return cls;
}

async function loadManageableAssignment(actor: AuthPayload, assignmentId: string) {
  assertId(assignmentId, 'Assignment');
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw AppError.notFound('Assignment not found');
  const cls = await loadManageableClass(actor, assignment.classId.toString());
  return { assignment, cls };
}

async function uniqueClassCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = generateJoinCode(6);
    if (!(await ClassGroup.exists({ joinCode: code }))) return code;
  }
  throw AppError.internal('Could not generate a unique class code. Please try again.');
}

// ─── Classes (teacher side) ───────────────────────────────────

export async function createClass(
  actor: AuthPayload,
  input: { name: string; description?: string },
  ipAddress?: string
) {
  const cls = await ClassGroup.create({
    name: input.name,
    description: input.description,
    ownerId: actor.userId,
    joinCode: await uniqueClassCode(),
  });

  await logAudit({
    userId: actor.userId,
    action: 'CLASS_CREATE',
    entityType: 'ClassGroup',
    entityId: cls._id.toString(),
    details: { name: cls.name },
    ipAddress,
  });
  return cls;
}

export async function listManagedClasses(actor: AuthPayload, scope: 'mine' | 'all' = 'mine') {
  const filter: Record<string, unknown> = {};
  if (!(scope === 'all' && isModerator(actor.role))) filter.ownerId = actor.userId;

  const classes = await ClassGroup.find(filter).populate('ownerId', 'name').sort({ updatedAt: -1 }).lean();
  const ids = classes.map((c) => c._id);

  const [members, assignments] = await Promise.all([
    ClassMember.find({ classId: { $in: ids } }).select('classId').lean(),
    Assignment.find({ classId: { $in: ids }, status: 'active' }).select('classId dueAt').lean(),
  ]);
  const memberCount = new Map<string, number>();
  for (const m of members) memberCount.set(m.classId.toString(), (memberCount.get(m.classId.toString()) ?? 0) + 1);
  const now = Date.now();
  const active = new Map<string, number>();
  const open = new Map<string, number>();
  for (const a of assignments) {
    const k = a.classId.toString();
    active.set(k, (active.get(k) ?? 0) + 1);
    if (a.dueAt.getTime() >= now) open.set(k, (open.get(k) ?? 0) + 1);
  }

  return classes.map((c: any) => ({
    _id: c._id.toString(),
    name: c.name,
    description: c.description,
    status: c.status,
    joinCode: c.joinCode,
    owner: { _id: c.ownerId._id.toString(), name: c.ownerId.name },
    memberCount: memberCount.get(c._id.toString()) ?? 0,
    assignmentCount: active.get(c._id.toString()) ?? 0,
    openAssignmentCount: open.get(c._id.toString()) ?? 0,
    createdAt: c.createdAt,
  }));
}

export async function getClassDetail(actor: AuthPayload, classId: string) {
  const cls = await loadManageableClass(actor, classId);

  const [members, assignments] = await Promise.all([
    ClassMember.find({ classId: cls._id })
      .populate('userId', 'name email educationLevel institution')
      .sort({ joinedAt: 1 })
      .lean(),
    Assignment.find({ classId: cls._id }).sort({ dueAt: -1 }).lean(),
  ]);

  const quizzes = await Quiz.find({ _id: { $in: assignments.map((a) => a.quizId) } })
    .select('title category')
    .lean();
  const quizOf = new Map(quizzes.map((q) => [q._id.toString(), q]));

  const attempts = await QuizAttempt.find({
    assignmentId: { $in: assignments.map((a) => a._id) },
    status: 'finished',
  })
    .select('assignmentId userId')
    .lean();
  const submitted = new Map<string, Set<string>>();
  for (const at of attempts) {
    const k = at.assignmentId!.toString();
    if (!submitted.has(k)) submitted.set(k, new Set());
    submitted.get(k)!.add(at.userId.toString());
  }

  const memberIds = new Set(members.map((m: any) => m.userId?._id?.toString()));
  return {
    class: {
      _id: cls._id.toString(),
      name: cls.name,
      description: cls.description,
      status: cls.status,
      joinCode: cls.joinCode,
      ownerId: cls.ownerId.toString(),
    },
    members: members
      .filter((m: any) => m.userId)
      .map((m: any) => ({
        userId: m.userId._id.toString(),
        name: m.userId.name,
        email: m.userId.email,
        educationLevel: m.userId.educationLevel,
        institution: m.userId.institution,
        joinedAt: m.joinedAt,
      })),
    assignments: assignments.map((a) => {
      const done = submitted.get(a._id.toString());
      // Only count students who are still in the class
      const submittedCount = done ? Array.from(done).filter((u) => memberIds.has(u)).length : 0;
      return {
        _id: a._id.toString(),
        quizId: a.quizId.toString(),
        quizTitle: quizOf.get(a.quizId.toString())?.title ?? '(quiz removed)',
        category: quizOf.get(a.quizId.toString())?.category,
        openAt: a.openAt,
        dueAt: a.dueAt,
        allowLate: a.allowLate,
        note: a.note,
        status: a.status,
        memberCount: members.length,
        submittedCount,
      };
    }),
  };
}

export async function updateClass(
  actor: AuthPayload,
  classId: string,
  updates: { name?: string; description?: string | null; status?: 'active' | 'archived' }
) {
  const cls = await loadManageableClass(actor, classId);
  if (updates.name !== undefined) cls.name = updates.name;
  if (updates.description !== undefined) cls.description = updates.description ?? undefined;
  if (updates.status !== undefined) cls.status = updates.status;
  await cls.save();
  return cls;
}

export async function deleteClass(actor: AuthPayload, classId: string, ipAddress?: string) {
  const cls = await loadManageableClass(actor, classId);
  if (await Assignment.exists({ classId: cls._id })) {
    throw AppError.badRequest('This class has assignments. Archive it instead of deleting.');
  }
  await ClassMember.deleteMany({ classId: cls._id });
  await cls.deleteOne();

  await logAudit({
    userId: actor.userId,
    action: 'CLASS_DELETE',
    entityType: 'ClassGroup',
    entityId: classId,
    details: { name: cls.name },
    ipAddress,
  });
  return { message: 'Class deleted' };
}

export async function regenerateClassCode(actor: AuthPayload, classId: string) {
  const cls = await loadManageableClass(actor, classId);
  cls.joinCode = await uniqueClassCode();
  await cls.save();
  return { joinCode: cls.joinCode };
}

export async function addMembersByEmail(actor: AuthPayload, classId: string, emails: string[]) {
  const cls = await loadManageableClass(actor, classId);
  const unique = Array.from(new Set(emails));

  const users = await User.find({ email: { $in: unique } }).select('email role isActive').lean();
  const byEmail = new Map(users.map((u) => [u.email, u]));

  const result = { added: [] as string[], alreadyIn: [] as string[], notFound: [] as string[], notStudent: [] as string[] };
  for (const email of unique) {
    const user = byEmail.get(email);
    if (!user) {
      result.notFound.push(email);
    } else if (user.role !== 'player' || !user.isActive) {
      result.notStudent.push(email);
    } else {
      try {
        await ClassMember.create({ classId: cls._id, userId: user._id, addedBy: actor.userId });
        result.added.push(email);
      } catch (err: any) {
        if (err?.code === 11000) result.alreadyIn.push(email);
        else throw err;
      }
    }
  }
  return result;
}

export async function removeMember(actor: AuthPayload, classId: string, userId: string) {
  const cls = await loadManageableClass(actor, classId);
  assertId(userId, 'Student');
  const res = await ClassMember.deleteOne({ classId: cls._id, userId });
  if (res.deletedCount === 0) throw AppError.notFound('That student is not in this class.');
  return { message: 'Student removed' };
}

// ─── Classes (student side) ───────────────────────────────────

export async function joinClass(actor: AuthPayload, code: string) {
  if (actor.role !== 'player') {
    throw AppError.forbidden('Only student accounts can join a class.');
  }
  const cls = await ClassGroup.findOne({ joinCode: code.trim().toUpperCase(), status: 'active' })
    .populate('ownerId', 'name')
    .lean();
  if (!cls) throw AppError.notFound('No class found for that code. Check the code with your teacher.');

  try {
    await ClassMember.create({ classId: cls._id, userId: actor.userId, addedBy: 'self' });
  } catch (err: any) {
    if (err?.code !== 11000) throw err; // already a member is fine
  }
  return { _id: cls._id.toString(), name: cls.name, teacherName: (cls.ownerId as any).name };
}

export async function leaveClass(actor: AuthPayload, classId: string) {
  assertId(classId, 'Class');
  await ClassMember.deleteOne({ classId, userId: actor.userId });
  return { message: 'You left the class' };
}

export async function listJoinedClasses(actor: AuthPayload) {
  const memberships = await ClassMember.find({ userId: actor.userId }).select('classId joinedAt').lean();
  const classes = await ClassGroup.find({ _id: { $in: memberships.map((m) => m.classId) }, status: 'active' })
    .populate('ownerId', 'name')
    .lean();
  return classes.map((c: any) => ({
    _id: c._id.toString(),
    name: c.name,
    description: c.description,
    teacherName: c.ownerId?.name,
  }));
}

// ─── Assignments ──────────────────────────────────────────────

export async function createAssignment(
  actor: AuthPayload,
  classId: string,
  input: { quizId: string; dueAt: Date; openAt?: Date | null; allowLate: boolean; note?: string },
  ipAddress?: string
) {
  const cls = await loadManageableClass(actor, classId);
  if (cls.status !== 'active') throw AppError.badRequest('This class is archived.');

  const now = new Date();
  const openAt = input.openAt ?? now;
  if (input.dueAt <= now) throw AppError.badRequest('The deadline must be in the future.');
  if (input.dueAt <= openAt) throw AppError.badRequest('The deadline must be after the opening time.');

  assertId(input.quizId, 'Quiz');
  const quiz = await Quiz.findById(input.quizId).select('title createdBy status visibility').lean();
  if (!quiz) throw AppError.notFound('Quiz not found');
  if (quiz.status !== 'published') throw AppError.badRequest('Publish the quiz before assigning it.');
  // Own quizzes (or anything, for admins), plus any public quiz
  const allowed = canManageContent(actor, quiz.createdBy.toString()) || quiz.visibility === 'public';
  if (!allowed) throw AppError.forbidden('You can only assign your own quizzes or public quizzes.');

  if (await Assignment.exists({ classId: cls._id, quizId: quiz._id, status: 'active' })) {
    throw AppError.conflict('This quiz is already assigned to the class. Edit its deadline instead.');
  }

  const assignment = await Assignment.create({
    classId: cls._id,
    quizId: quiz._id,
    assignedBy: actor.userId,
    openAt,
    dueAt: input.dueAt,
    allowLate: input.allowLate,
    note: input.note,
  });

  await logAudit({
    userId: actor.userId,
    action: 'ASSIGNMENT_CREATE',
    entityType: 'Assignment',
    entityId: assignment._id.toString(),
    details: { classId, quizId: input.quizId, dueAt: input.dueAt },
    ipAddress,
  });

  // Tell the students (best effort, never blocks the teacher)
  const members = await ClassMember.find({ classId: cls._id }).select('userId').lean();
  const due = input.dueAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  await notifyMany(
    members.map((m) => m.userId.toString()),
    {
      title: `New quiz for ${cls.name}`,
      message: `"${quiz.title}" is due ${due} IST.`,
      link: '/quizzes?tab=assigned',
      metadata: { assignmentId: assignment._id.toString() },
    }
  );

  return assignment;
}

async function notifyMany(
  userIds: string[],
  payload: { title: string; message: string; link: string; metadata?: Record<string, unknown> }
) {
  for (let i = 0; i < userIds.length; i += 20) {
    const batch = userIds.slice(i, i + 20);
    const results = await Promise.allSettled(
      batch.map((id) => createNotification({ receiverId: id, type: 'assignment', ...payload }))
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed) logger.warn({ failed }, 'Some assignment notifications could not be created');
  }
}

export async function updateAssignment(
  actor: AuthPayload,
  assignmentId: string,
  updates: { dueAt?: Date; openAt?: Date; allowLate?: boolean; note?: string | null }
) {
  const { assignment } = await loadManageableAssignment(actor, assignmentId);
  if (assignment.status === 'cancelled') throw AppError.badRequest('This assignment was cancelled.');

  const openAt = updates.openAt ?? assignment.openAt;
  const dueAt = updates.dueAt ?? assignment.dueAt;
  if (dueAt <= openAt) throw AppError.badRequest('The deadline must be after the opening time.');

  assignment.openAt = openAt;
  assignment.dueAt = dueAt;
  if (updates.allowLate !== undefined) assignment.allowLate = updates.allowLate;
  if (updates.note !== undefined) assignment.note = updates.note ?? undefined;
  await assignment.save();
  return assignment;
}

export async function removeAssignment(actor: AuthPayload, assignmentId: string, ipAddress?: string) {
  const { assignment } = await loadManageableAssignment(actor, assignmentId);

  const hasAttempts = await QuizAttempt.exists({ assignmentId: assignment._id });
  let outcome: 'deleted' | 'cancelled';
  if (hasAttempts) {
    // Keep the history students and the teacher may still need
    assignment.status = 'cancelled';
    await assignment.save();
    outcome = 'cancelled';
  } else {
    await assignment.deleteOne();
    outcome = 'deleted';
  }

  await logAudit({
    userId: actor.userId,
    action: 'ASSIGNMENT_REMOVE',
    entityType: 'Assignment',
    entityId: assignmentId,
    details: { outcome },
    ipAddress,
  });
  return { outcome };
}

export async function getAssignmentProgress(actor: AuthPayload, assignmentId: string) {
  const { assignment, cls } = await loadManageableAssignment(actor, assignmentId);
  const quiz = await Quiz.findById(assignment.quizId).select('title category passPercent').lean();

  const members = await ClassMember.find({ classId: cls._id })
    .populate('userId', 'name email educationLevel')
    .lean();
  const attempts = await QuizAttempt.find({ assignmentId: assignment._id })
    .select('userId status totalScore accuracy passed isLate finishedAt')
    .lean();

  const byUser = new Map<string, AttemptLite[]>();
  for (const a of attempts) {
    const k = a.userId.toString();
    const row: AttemptLite = {
      userId: k,
      status: a.status,
      totalScore: a.totalScore,
      accuracy: a.accuracy,
      passed: a.passed,
      isLate: a.isLate,
      finishedAt: a.finishedAt,
      _id: a._id.toString(),
    };
    byUser.set(k, [...(byUser.get(k) ?? []), row]);
  }

  const now = new Date();
  const rows = members
    .filter((m: any) => m.userId)
    .map((m: any) => {
      const uid = m.userId._id.toString();
      const s = summariseStudentAttempts(byUser.get(uid) ?? []);
      const status = deriveAssignmentStatus({
        now,
        openAt: assignment.openAt,
        dueAt: assignment.dueAt,
        hasFinished: !!s.best,
        finishedLate: !!s.best?.isLate,
        hasInProgress: !!s.inProgress,
      });
      return {
        userId: uid,
        name: m.userId.name,
        email: m.userId.email,
        educationLevel: m.userId.educationLevel,
        status,
        attempts: s.attemptCount,
        score: s.best?.totalScore ?? null,
        accuracy: s.best?.accuracy ?? null,
        passed: s.best ? s.best.passed : null,
        finishedAt: s.best?.finishedAt ?? null,
      };
    });

  const order: Record<string, number> = { overdue: 0, not_started: 1, upcoming: 1, in_progress: 2, submitted_late: 3, submitted: 4 };
  rows.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.name.localeCompare(b.name));

  const done = rows.filter((r) => r.status === 'submitted' || r.status === 'submitted_late');
  const sumAcc = done.reduce((t, r) => t + (r.accuracy ?? 0), 0);
  const sumScore = done.reduce((t, r) => t + (r.score ?? 0), 0);

  return {
    assignment: {
      _id: assignment._id.toString(),
      classId: cls._id.toString(),
      className: cls.name,
      quizId: assignment.quizId.toString(),
      quizTitle: quiz?.title ?? '(quiz removed)',
      category: quiz?.category,
      passPercent: quiz?.passPercent,
      openAt: assignment.openAt,
      dueAt: assignment.dueAt,
      allowLate: assignment.allowLate,
      note: assignment.note,
      status: assignment.status,
      lastRemindedAt: assignment.lastRemindedAt ?? null,
    },
    summary: {
      students: rows.length,
      submitted: done.length,
      late: rows.filter((r) => r.status === 'submitted_late').length,
      inProgress: rows.filter((r) => r.status === 'in_progress').length,
      pending: rows.filter((r) => ['not_started', 'overdue', 'upcoming'].includes(r.status)).length,
      overdue: rows.filter((r) => r.status === 'overdue').length,
      passed: done.filter((r) => r.passed).length,
      avgScore: done.length ? Math.round(sumScore / done.length) : 0,
      avgAccuracy: done.length ? Number((sumAcc / done.length).toFixed(4)) : 0,
    },
    rows,
  };
}

/** Nudge students who have not submitted yet (in-app notification). Once per hour. */
export async function remindPending(actor: AuthPayload, assignmentId: string) {
  const { assignment, cls } = await loadManageableAssignment(actor, assignmentId);
  if (assignment.status !== 'active') throw AppError.badRequest('This assignment was cancelled.');

  if (assignment.lastRemindedAt && Date.now() - assignment.lastRemindedAt.getTime() < REMIND_COOLDOWN_MS) {
    throw new AppError('You already sent a reminder recently. Please try again in an hour.', 429, 'RATE_LIMIT_EXCEEDED');
  }

  const [members, finished, quiz] = await Promise.all([
    ClassMember.find({ classId: cls._id }).select('userId').lean(),
    QuizAttempt.find({ assignmentId: assignment._id, status: 'finished' }).select('userId').lean(),
    Quiz.findById(assignment.quizId).select('title').lean(),
  ]);
  const doneIds = new Set(finished.map((a) => a.userId.toString()));
  const pending = members.map((m) => m.userId.toString()).filter((id) => !doneIds.has(id));

  const due = assignment.dueAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  await notifyMany(pending, {
    title: 'Reminder: quiz not done yet',
    message: `"${quiz?.title ?? 'Your quiz'}" for ${cls.name} is due ${due} IST.`,
    link: '/quizzes?tab=assigned',
    metadata: { assignmentId: assignment._id.toString() },
  });

  assignment.lastRemindedAt = new Date();
  await assignment.save();
  return { reminded: pending.length };
}

// ─── Student: my assignments ──────────────────────────────────

export async function listMyAssignments(actor: AuthPayload) {
  const memberships = await ClassMember.find({ userId: actor.userId }).select('classId').lean();
  const classIds = memberships.map((m) => m.classId);
  if (classIds.length === 0) return [];

  const [classes, assignments] = await Promise.all([
    ClassGroup.find({ _id: { $in: classIds }, status: 'active' }).populate('ownerId', 'name').lean(),
    Assignment.find({ classId: { $in: classIds }, status: 'active' }).lean(),
  ]);
  const classOf = new Map(classes.map((c: any) => [c._id.toString(), c]));

  const [quizzes, attempts] = await Promise.all([
    Quiz.find({ _id: { $in: assignments.map((a) => a.quizId) } })
      .select('title category questionCount questionIds status passPercent certificateEnabled maxAttempts timePerQuestionSeconds')
      .lean(),
    QuizAttempt.find({ userId: actor.userId, quizId: { $in: assignments.map((a) => a.quizId) } })
      .select('quizId assignmentId status totalScore accuracy passed isLate finishedAt')
      .lean(),
  ]);
  const quizOf = new Map(quizzes.map((q) => [q._id.toString(), q]));

  const now = new Date();
  const rows = assignments
    .filter((a) => classOf.has(a.classId.toString()) && quizOf.has(a.quizId.toString()))
    .map((a) => {
      const quiz: any = quizOf.get(a.quizId.toString());
      const cls: any = classOf.get(a.classId.toString());
      const mine = attempts.filter((t) => t.assignmentId?.toString() === a._id.toString());
      const allForQuiz = attempts.filter((t) => t.quizId?.toString() === a.quizId.toString());
      const s = summariseStudentAttempts(
        mine.map((t) => ({
          userId: actor.userId,
          status: t.status,
          totalScore: t.totalScore,
          accuracy: t.accuracy,
          passed: t.passed,
          isLate: t.isLate,
          finishedAt: t.finishedAt,
          _id: t._id.toString(),
        }))
      );
      const status = deriveAssignmentStatus({
        now,
        openAt: a.openAt,
        dueAt: a.dueAt,
        hasFinished: !!s.best,
        finishedLate: !!s.best?.isLate,
        hasInProgress: !!s.inProgress,
      });
      const attemptsLeft = quiz.maxAttempts > 0 ? Math.max(0, quiz.maxAttempts - allForQuiz.length) : null;
      const windowOpen = now >= a.openAt && (now <= a.dueAt || a.allowLate);
      return {
        _id: a._id.toString(),
        quizId: a.quizId.toString(),
        quizTitle: quiz.title,
        category: quiz.category,
        questionCount: quiz.questionIds?.length ?? 0,
        passPercent: quiz.passPercent,
        certificateEnabled: quiz.certificateEnabled !== false,
        timePerQuestionSeconds: quiz.timePerQuestionSeconds ?? null,
        quizPublished: quiz.status === 'published',
        className: cls.name,
        teacherName: cls.ownerId?.name,
        openAt: a.openAt,
        dueAt: a.dueAt,
        allowLate: a.allowLate,
        note: a.note,
        status,
        score: s.best?.totalScore ?? null,
        accuracy: s.best?.accuracy ?? null,
        passed: s.best ? s.best.passed : null,
        resultAttemptId: s.best?._id ?? null,
        inProgressAttemptId: s.inProgress?._id ?? null,
        attemptsLeft,
        // Can the student press Start/Resume right now?
        canStart:
          quiz.status === 'published' &&
          (!!s.inProgress || (windowOpen && (attemptsLeft === null || attemptsLeft > 0))) &&
          !(s.best && !s.inProgress && now > a.dueAt && !a.allowLate),
      };
    });

  // Open work first (soonest deadline on top), finished work last
  const rank = (r: (typeof rows)[number]) => (r.status === 'submitted' || r.status === 'submitted_late' ? 1 : 0);
  rows.sort((x, y) => rank(x) - rank(y) || new Date(x.dueAt).getTime() - new Date(y.dueAt).getTime());
  return rows;
}

// ─── Used by the attempt engine ───────────────────────────────

/** Checks a student may start a quiz through an assignment right now. */
export async function resolveAssignmentForStart(
  userId: string,
  assignmentId: string,
  quizId: string
): Promise<{ assignment: IAssignment; isLate: boolean }> {
  assertId(assignmentId, 'Assignment');
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment || assignment.status !== 'active' || assignment.quizId.toString() !== quizId) {
    throw AppError.notFound('Assignment not found');
  }
  const cls = await ClassGroup.findById(assignment.classId).select('status').lean();
  if (!cls || cls.status !== 'active') throw AppError.badRequest('This class is archived.');
  if (!(await ClassMember.exists({ classId: assignment.classId, userId }))) {
    throw AppError.forbidden('You are not in this class.');
  }

  const now = new Date();
  if (now < assignment.openAt) {
    throw AppError.badRequest(
      `This assignment opens on ${assignment.openAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.`
    );
  }
  if (now > assignment.dueAt && !assignment.allowLate) {
    throw AppError.badRequest('The deadline for this assignment has passed.');
  }
  return { assignment, isLate: now > assignment.dueAt };
}
