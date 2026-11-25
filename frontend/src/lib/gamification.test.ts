import { describe, it, expect } from 'vitest';
import { computeStreak, computeProgress, computeAchievements } from './gamification';

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
