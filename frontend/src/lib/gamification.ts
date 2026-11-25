/**
 * Gamification derived ONLY from real match history (no invented data).
 *
 *  - XP        = total of the player's own score across matches
 *  - Level     = 1 + floor(XP / XP_PER_LEVEL)
 *  - Streak    = consecutive calendar days (IST) with at least one played match,
 *                counted back from today (or yesterday, so the streak is not lost
 *                before the player has had a chance to play today)
 *  - Achievements are unlocked purely from history / team membership
 */
import type { UserMatchHistoryItem } from '@/types';

export const XP_PER_LEVEL = 500;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** yyyy-mm-dd key of a timestamp in IST */
function istDayKey(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function computeStreak(history: Pick<UserMatchHistoryItem, 'playedAt'>[], now = Date.now()): number {
  const days = new Set(
    history
      .map((h) => new Date(h.playedAt).getTime())
      .filter((t) => !Number.isNaN(t))
      .map(istDayKey)
  );
  if (days.size === 0) return 0;

  let cursor = now;
  if (!days.has(istDayKey(cursor))) {
    cursor -= DAY_MS; // allow "played yesterday" to keep the streak alive
    if (!days.has(istDayKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(istDayKey(cursor))) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

export interface Progress {
  xp: number;
  level: number;
  xpIntoLevel: number;
  levelProgress: number; // 0..1
}

export function computeProgress(history: Pick<UserMatchHistoryItem, 'playerScore'>[]): Progress {
  const xp = history.reduce((sum, h) => sum + (Number(h.playerScore) || 0), 0);
  const level = 1 + Math.floor(xp / XP_PER_LEVEL);
  const xpIntoLevel = xp % XP_PER_LEVEL;
  return { xp, level, xpIntoLevel, levelProgress: xpIntoLevel / XP_PER_LEVEL };
}

export interface Achievement {
  id: string;
  title: string;
  hint: string;
  unlocked: boolean;
}

export function computeAchievements(
  history: UserMatchHistoryItem[],
  streak: number,
  teamCount: number
): Achievement[] {
  const numericRanks = history.map((h) => Number(h.rank)).filter((r) => Number.isFinite(r) && r > 0);
  return [
    { id: 'first', title: 'First Match', hint: 'Play your first match', unlocked: history.length >= 1 },
    { id: 'sharp', title: 'Sharp Mind', hint: 'Reach 90% accuracy in a match', unlocked: history.some((h) => h.accuracy >= 0.9) },
    { id: 'perfect', title: 'Perfect Score', hint: 'Answer every question correctly', unlocked: history.some((h) => h.totalQuestions > 0 && h.correctCount === h.totalQuestions) },
    { id: 'podium', title: 'Podium', hint: 'Finish in the top 3', unlocked: numericRanks.some((r) => r <= 3) },
    { id: 'team', title: 'Team Player', hint: 'Join a team', unlocked: teamCount > 0 },
    { id: 'streak3', title: 'On Fire', hint: 'Reach a 3-day streak', unlocked: streak >= 3 },
    { id: 'veteran', title: 'Veteran', hint: 'Play 5 matches', unlocked: history.length >= 5 },
  ];
}
