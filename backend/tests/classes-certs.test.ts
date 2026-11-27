import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { deriveAssignmentStatus, summariseStudentAttempts, type AttemptLite } from '../src/services/class.service.js';
import { createCertificatePDFBuffer } from '../src/services/certificate.service.js';
import { createAssignmentSchema, addMembersSchema, joinClassSchema } from '../src/validators/class.validator.js';
import { generateJoinCode } from '../src/utils/joinCode.js';

const tokenFor = (role: 'player' | 'teacher' | 'admin' | 'superAdmin') =>
  `Bearer ${generateAccessToken({ userId: '64b000000000000000000001', role })}`;

const HOUR = 3600_000;
const now = new Date('2026-11-27T10:00:00Z');
const base = {
  now,
  openAt: new Date(now.getTime() - 2 * HOUR),
  dueAt: new Date(now.getTime() + 2 * HOUR),
  hasFinished: false,
  finishedLate: false,
  hasInProgress: false,
};

describe('deriveAssignmentStatus', () => {
  it('not started before the deadline', () => expect(deriveAssignmentStatus(base)).toBe('not_started'));
  it('upcoming before it opens', () =>
    expect(deriveAssignmentStatus({ ...base, openAt: new Date(now.getTime() + HOUR) })).toBe('upcoming'));
  it('in progress wins over overdue', () =>
    expect(deriveAssignmentStatus({ ...base, hasInProgress: true, dueAt: new Date(now.getTime() - HOUR) })).toBe('in_progress'));
  it('overdue after the deadline with nothing done', () =>
    expect(deriveAssignmentStatus({ ...base, dueAt: new Date(now.getTime() - HOUR) })).toBe('overdue'));
  it('submitted, on time or late', () => {
    expect(deriveAssignmentStatus({ ...base, hasFinished: true })).toBe('submitted');
    expect(deriveAssignmentStatus({ ...base, hasFinished: true, finishedLate: true })).toBe('submitted_late');
  });
});

describe('summariseStudentAttempts', () => {
  const at = (over: Partial<AttemptLite>): AttemptLite => ({
    _id: 'x', userId: 'u', status: 'finished', totalScore: 0, accuracy: 0, passed: false, isLate: false, ...over,
  });

  it('picks the highest score, earliest finish on a tie', () => {
    const s = summariseStudentAttempts([
      at({ _id: 'a', totalScore: 100, finishedAt: new Date('2026-01-01') }),
      at({ _id: 'b', totalScore: 300, finishedAt: new Date('2026-01-03') }),
      at({ _id: 'c', totalScore: 300, finishedAt: new Date('2026-01-02') }),
    ]);
    expect(s.best?._id).toBe('c');
    expect(s.attemptCount).toBe(3);
  });

  it('reports an in-progress attempt separately', () => {
    const s = summariseStudentAttempts([at({ _id: 'p', status: 'in_progress' })]);
    expect(s.best).toBeUndefined();
    expect(s.inProgress?._id).toBe('p');
  });
});

describe('Validators', () => {
  const quizId = '64b000000000000000000001';
  it('requires a deadline after the opening time', () => {
    expect(createAssignmentSchema.safeParse({ quizId, dueAt: '2026-12-02T10:00:00Z' }).success).toBe(true);
    expect(
      createAssignmentSchema.safeParse({ quizId, dueAt: '2026-12-02T10:00:00Z', openAt: '2026-12-03T10:00:00Z' }).success
    ).toBe(false);
    expect(createAssignmentSchema.safeParse({ quizId, dueAt: 'not a date' }).success).toBe(false);
  });
  it('limits and normalises student emails', () => {
    expect(addMembersSchema.parse({ emails: ['ASHA@Example.com'] }).emails).toEqual(['asha@example.com']);
    expect(addMembersSchema.safeParse({ emails: [] }).success).toBe(false);
    expect(addMembersSchema.safeParse({ emails: ['nope'] }).success).toBe(false);
  });
  it('needs a class code', () => {
    expect(joinClassSchema.safeParse({ code: 'AB' }).success).toBe(false);
    expect(joinClassSchema.safeParse({ code: 'K7M2QX' }).success).toBe(true);
  });
  it('join codes are 6 readable characters', () => {
    for (let i = 0; i < 50; i++) expect(generateJoinCode(6)).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
});

describe('Route guards (no database needed)', () => {
  it('students cannot create classes or assign quizzes', async () => {
    const auth = tokenFor('player');
    expect((await request(app).post('/api/classes').set('Authorization', auth).send({ name: 'Hack' })).status).toBe(403);
    expect((await request(app).get('/api/classes/mine').set('Authorization', auth)).status).toBe(403);
    expect((await request(app).get('/api/assignments/64b000000000000000000001/progress').set('Authorization', auth)).status).toBe(403);
    expect((await request(app).post('/api/assignments/64b000000000000000000001/remind').set('Authorization', auth)).status).toBe(403);
  });
  it('everything needs a login', async () => {
    expect((await request(app).get('/api/classes/joined')).status).toBe(401);
    expect((await request(app).get('/api/assignments/mine')).status).toBe(401);
    expect((await request(app).get('/api/solo/activity')).status).toBe(401);
  });
  it('joining a class validates the code before touching the database', async () => {
    const res = await request(app).post('/api/classes/join').set('Authorization', tokenFor('player')).send({ code: 'A' });
    expect(res.status).toBe(400);
  });
});

describe('Quiz certificate PDF', () => {
  const payload = {
    certificateId: 'GYAN26Q-2026-000001', recipientName: 'Asha Verma', competitionName: 'Fractions Test', category: 'Class 10',
    teamName: 'Individual', rank: 0, score: 300, maxScore: 400, accuracy: 0.75, issuedAt: new Date(),
    verificationUrl: 'https://example.com/verify-certificate/GYAN26Q-2026-000001',
  };
  it('renders a valid PDF for quiz and competition designs', async () => {
    const quiz = await createCertificatePDFBuffer({ ...payload, kind: 'quiz', issuerName: 'Tina Teacher' });
    const comp = await createCertificatePDFBuffer({ ...payload, kind: 'competition' });
    for (const buf of [quiz, comp]) {
      expect(buf.subarray(0, 4).toString()).toBe('%PDF');
      expect(buf.length).toBeGreaterThan(2000);
    }
  });
});
