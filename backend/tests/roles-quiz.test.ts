import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { canManageContent, isContentCreator, isModerator } from '../src/utils/roles.js';
import { gradeAnswer, summariseAttempt } from '../src/services/grading.service.js';
import { seededShuffle } from '../src/utils/shuffle.js';
import { createQuizSchema, startAttemptSchema, createTeacherSchema } from '../src/validators/quiz.validator.js';

const tokenFor = (role: 'player' | 'teacher' | 'admin' | 'superAdmin') =>
  `Bearer ${generateAccessToken({ userId: '64b000000000000000000001', role })}`;

describe('Role helpers', () => {
  it('knows who can create content and who moderates', () => {
    expect(isContentCreator('teacher')).toBe(true);
    expect(isContentCreator('player')).toBe(false);
    expect(isModerator('admin')).toBe(true);
    expect(isModerator('teacher')).toBe(false);
  });

  it('lets owners and moderators manage content, nobody else', () => {
    expect(canManageContent({ userId: 'a', role: 'teacher' }, 'a')).toBe(true);
    expect(canManageContent({ userId: 'a', role: 'teacher' }, 'b')).toBe(false);
    expect(canManageContent({ userId: 'x', role: 'admin' }, 'b')).toBe(true);
    expect(canManageContent({ userId: 'x', role: 'superAdmin' }, 'b')).toBe(true);
    expect(canManageContent({ userId: 'a', role: 'player' }, 'a')).toBe(false);
  });
});

describe('Route guards (no database needed)', () => {
  it('requires login for quizzes and solo play', async () => {
    expect((await request(app).get('/api/quizzes')).status).toBe(401);
    expect((await request(app).post('/api/solo/start').send({})).status).toBe(401);
  });

  it('only a superAdmin can add teachers', async () => {
    const body = { name: 'Tina', email: 'tina@example.com' };
    for (const role of ['player', 'teacher', 'admin'] as const) {
      const res = await request(app).post('/api/admin/teachers').set('Authorization', tokenFor(role)).send(body);
      expect(res.status).toBe(403);
    }
  });

  it('students cannot create quizzes, browse the question bank or see /mine', async () => {
    const auth = tokenFor('player');
    expect((await request(app).post('/api/quizzes').set('Authorization', auth).send({})).status).toBe(403);
    expect((await request(app).get('/api/quizzes/mine').set('Authorization', auth)).status).toBe(403);
    expect((await request(app).get('/api/questions').set('Authorization', auth)).status).toBe(403);
  });

  it('teachers cannot reach admin-only areas', async () => {
    const auth = tokenFor('teacher');
    expect((await request(app).get('/api/admin/users').set('Authorization', auth)).status).toBe(403);
    expect((await request(app).get('/api/admin/audit-logs').set('Authorization', auth)).status).toBe(403);
  });
});

describe('Grading', () => {
  const single = { type: 'single_choice', correctAnswers: ['A'], points: 100 };
  const multi = { type: 'multiple_correct', correctAnswers: ['A', 'B'], points: 100 };
  const cfg = { speedBonusMax: 0, penaltyWrong: 0 };

  it('scores single-choice answers', () => {
    expect(gradeAnswer(single, ['A'], 5, 20, cfg)).toMatchObject({ isCorrect: true, scoreAwarded: 100 });
    expect(gradeAnswer(single, ['B'], 5, 20, cfg)).toMatchObject({ isCorrect: false, scoreAwarded: 0 });
  });

  it('multiple-correct is all-or-nothing', () => {
    expect(gradeAnswer(multi, ['A', 'B'], 5, 20, cfg).isCorrect).toBe(true);
    expect(gradeAnswer(multi, ['B', 'A'], 5, 20, cfg).isCorrect).toBe(true);
    expect(gradeAnswer(multi, ['A'], 5, 20, cfg).isCorrect).toBe(false);
    expect(gradeAnswer(multi, ['A', 'B', 'C'], 5, 20, cfg).isCorrect).toBe(false);
  });

  it('never penalises a skipped question', () => {
    expect(gradeAnswer(single, [], 20, 20, { speedBonusMax: 50, penaltyWrong: 25 }).scoreAwarded).toBe(0);
  });

  it('applies wrong-answer penalty and speed bonus only where due', () => {
    const c = { speedBonusMax: 50, penaltyWrong: 25 };
    expect(gradeAnswer(single, ['B'], 5, 20, c).scoreAwarded).toBe(-25);
    expect(gradeAnswer(single, ['A'], 0, 20, c).scoreAwarded).toBe(150);
    expect(gradeAnswer(single, ['A'], 10, 20, c).scoreAwarded).toBe(125);
    expect(gradeAnswer(single, ['A'], 20, 20, c).scoreAwarded).toBe(100);
  });

  it('summarises an attempt and never goes below zero', () => {
    const answers = [
      { isCorrect: true, scoreAwarded: 100, timeTakenSeconds: 4 },
      { isCorrect: false, scoreAwarded: -25, timeTakenSeconds: 6 },
    ];
    expect(summariseAttempt(answers, 4, 25)).toMatchObject({ totalScore: 75, correctCount: 1, accuracy: 0.25, passed: true, durationSeconds: 10 });
    expect(summariseAttempt([{ isCorrect: false, scoreAwarded: -50, timeTakenSeconds: 1 }], 1, 40).totalScore).toBe(0);
  });
});

describe('seededShuffle', () => {
  const items = ['A', 'B', 'C', 'D', 'E', 'F'];
  it('is stable for the same seed and keeps every item', () => {
    expect(seededShuffle(items, 'seed-1')).toEqual(seededShuffle(items, 'seed-1'));
    expect([...seededShuffle(items, 'seed-1')].sort()).toEqual(items);
  });
  it('does not mutate the input and differs across seeds', () => {
    const copy = [...items];
    seededShuffle(items, 'x');
    expect(items).toEqual(copy);
    const orders = new Set(['a', 'b', 'c', 'd', 'e'].map((s) => seededShuffle(items, s).join('')));
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('Validators', () => {
  it('fills quiz defaults and rejects a bad window', () => {
    const ok = createQuizSchema.parse({ title: 'Algebra', category: 'Class 10' });
    expect(ok).toMatchObject({ visibility: 'public', passPercent: 40, showAnswers: 'after_each', questionIds: [] });
    expect(() => createQuizSchema.parse({ title: 'Algebra', category: 'Class 10', startAt: '2026-02-02', endAt: '2026-02-01' })).toThrow();
  });
  it('accepts quiz and practice starts, rejects nonsense', () => {
    expect(startAttemptSchema.safeParse({ quizId: '64b000000000000000000001' }).success).toBe(true);
    expect(startAttemptSchema.safeParse({ mode: 'practice', educationLevel: 'Class 10' }).success).toBe(true);
    expect(startAttemptSchema.safeParse({ mode: 'practice', educationLevel: 'Class 10', count: 999 }).success).toBe(false);
    expect(startAttemptSchema.safeParse({ quizId: 'nope' }).success).toBe(false);
  });
  it('validates teacher invites', () => {
    expect(createTeacherSchema.safeParse({ name: 'Tina', email: 'TINA@Example.com' }).success).toBe(true);
    expect(createTeacherSchema.safeParse({ name: 'T', email: 'bad' }).success).toBe(false);
  });
});
