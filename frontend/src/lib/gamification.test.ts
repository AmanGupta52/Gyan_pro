import { describe, it, expect } from 'vitest';
import {
  computeStreak,
  computeProgress,
  computeAchievements,
  computeLongestStreak,
  computeSoloBadges,
  newlyUnlocked,
  playedToday,
  recentDays,
  soloAsPlayed,
  soloAsScores,
} from './gamification';
import type { SoloActivity } from '@/types';

const day = (iso: string) => ({ playedAt: iso });
// 2026-11-25 12:00 IST
const NOW = new Date('2026-11-25T06:30:00Z').getTime();

describe('computeStreak', () => {
  it('is 0 with no history', () => expect(computeStreak([], NOW)).toBe(0));
  it('counts consecutive IST days including today', () => {
    expect(computeStreak([day('2026-11-25T01:00:00Z'), day('2026-11-24T10:00:00Z'), day('2026-11-23T10:00:00Z')], NOW)).toBe(3);
  });
  it('keeps the streak alive when the last match was yesterday', () => {
    expect(computeStreak([day('2026-11-24T10:00:00Z'), day('2026-11-23T10:00:00Z')], NOW)).toBe(2);
  });
  it('breaks after a missed day', () => {
    expect(computeStreak([day('2026-11-22T10:00:00Z')], NOW)).toBe(0);
  });
});

describe('computeProgress', () => {
  it('derives level and progress from total score', () => {
    const p = computeProgress([{ playerScore: 400 }, { playerScore: 350 }]);
    expect(p.xp).toBe(750);
    expect(p.level).toBe(2);
    expect(p.levelProgress).toBeCloseTo(0.5);
  });
});

describe('computeAchievements', () => {
  it('unlocks nothing for a brand-new player', () => {
    expect(computeAchievements([], 0, 0).every((a) => !a.unlocked)).toBe(true);
  });
});

const solo = (over: Partial<SoloActivity> = {}): SoloActivity => ({
  _id: 'a',
  mode: 'quiz',
  finishedAt: '2026-11-25T01:00:00Z',
  totalScore: 100,
  maxScore: 400,
  accuracy: 0.5,
  correctCount: 2,
  totalQuestions: 4,
  passed: false,
  ...over,
});

describe('solo streaks reuse the match streak rules', () => {
  it('counts solo days and match days together', () => {
    const matches = [{ playedAt: '2026-11-24T10:00:00Z' }];
    const soloDays = soloAsPlayed([solo({ finishedAt: '2026-11-25T01:00:00Z' }), solo({ finishedAt: '2026-11-23T10:00:00Z' })]);
    expect(computeStreak([...matches, ...soloDays], NOW)).toBe(3);
  });
  it('solo-only play keeps a streak and feeds XP', () => {
    expect(computeStreak(soloAsPlayed([solo({ finishedAt: '2026-11-24T10:00:00Z' })]), NOW)).toBe(1);
    expect(computeProgress(soloAsScores([solo({ totalScore: 300 }), solo({ totalScore: 250 })])).xp).toBe(550);
  });
  it('finds the longest run even after it was broken', () => {
    const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-10', '2026-11-11'].map((d) => ({ playedAt: `${d}T10:00:00Z` }));
    expect(computeLongestStreak(days)).toBe(4);
    expect(computeLongestStreak([])).toBe(0);
  });
  it('knows whether you already played today (IST)', () => {
    expect(playedToday([{ playedAt: '2026-11-25T01:00:00Z' }], NOW)).toBe(true);
    expect(playedToday([{ playedAt: '2026-11-24T10:00:00Z' }], NOW)).toBe(false);
  });
});

describe('computeSoloBadges', () => {
  const byId = (b: ReturnType<typeof computeSoloBadges>, id: string) => b.find((x) => x.id === id)!;

  it('unlocks nothing for a brand-new player', () => {
    expect(computeSoloBadges([], 0).every((b) => !b.unlocked && b.progress === 0)).toBe(true);
  });
  it('first solo, quiz passer and flawless', () => {
    const badges = computeSoloBadges([solo({ passed: true, correctCount: 5, totalQuestions: 5, accuracy: 1 })], 1);
    expect(byId(badges, 'solo_first').unlocked).toBe(true);
    expect(byId(badges, 'solo_pass').unlocked).toBe(true);
    expect(byId(badges, 'solo_flawless').unlocked).toBe(true);
    expect(byId(badges, 'solo_scholar').progress).toBeCloseTo(0.2);
  });
  it('flawless needs at least 5 questions', () => {
    expect(byId(computeSoloBadges([solo({ correctCount: 3, totalQuestions: 3 })], 1), 'solo_flawless').unlocked).toBe(false);
  });
  it('practice rounds and correct answers add up', () => {
    const rounds = Array.from({ length: 10 }, (_, i) => solo({ _id: String(i), mode: 'practice', correctCount: 10 }));
    const badges = computeSoloBadges(rounds, 1);
    expect(byId(badges, 'solo_practice10').unlocked).toBe(true);
    expect(byId(badges, 'solo_century').unlocked).toBe(true);
    expect(byId(badges, 'solo_pass').unlocked).toBe(false); // practice never counts as a quiz pass
  });
  it('streak badges use the best streak ever, not just the current one', () => {
    expect(byId(computeSoloBadges([], 0, 7), 'streak7').unlocked).toBe(true);
    expect(byId(computeSoloBadges([], 3, 3), 'streak7').progress).toBeCloseTo(3 / 7);
    expect(byId(computeSoloBadges([], 0, 30), 'streak30').unlocked).toBe(true);
  });
  it('lists only the badges that are new after an attempt', () => {
    const before = computeSoloBadges([], 0);
    const after = computeSoloBadges([solo({ passed: true })], 1);
    expect(newlyUnlocked(before, after).map((b) => b.id).sort()).toEqual(['solo_first', 'solo_pass']);
    expect(newlyUnlocked(after, after)).toEqual([]);
  });
});

describe('recentDays', () => {
  it('marks the days with activity, oldest first and today last', () => {
    const days = recentDays([{ playedAt: '2026-11-25T01:00:00Z' }, { playedAt: '2026-11-23T10:00:00Z' }], 7, NOW);
    expect(days).toHaveLength(7);
    expect(days[6]).toBe(true); // today (25th)
    expect(days[5]).toBe(false); // 24th
    expect(days[4]).toBe(true); // 23rd
    expect(days.filter(Boolean)).toHaveLength(2);
  });
});
