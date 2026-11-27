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
import type { SoloActivity, UserMatchHistoryItem } from '@/types';

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

// ─── Solo play: daily streaks & badges ──────────────────────────────────────
// Same rules as matches, fed with real finished quiz / practice attempts.
// Streak and XP are COMBINED with match history, so playing either one keeps the flame alive.

/** Solo attempts shaped like match history, so computeStreak / computeProgress can be reused as-is. */
export function soloAsPlayed(activity: Pick<SoloActivity, 'finishedAt'>[]): { playedAt: string }[] {
  return activity.map((a) => ({ playedAt: a.finishedAt }));
}

export function soloAsScores(activity: Pick<SoloActivity, 'totalScore'>[]): { playerScore: number }[] {
  return activity.map((a) => ({ playerScore: a.totalScore }));
}

/** Longest run of consecutive IST days with at least one played match or solo attempt. */
export function computeLongestStreak(history: { playedAt: string }[]): number {
  const keys = Array.from(
    new Set(
      history
        .map((h) => new Date(h.playedAt).getTime())
        .filter((t) => !Number.isNaN(t))
        .map(istDayKey)
    )
  ).sort();

  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const key of keys) {
    const day = Date.parse(`${key}T00:00:00Z`);
    run = prev !== null && day - prev === DAY_MS ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/** Has the player already done something today (IST)? Drives the "keep your streak" nudge. */
export function playedToday(history: { playedAt: string }[], now = Date.now()): boolean {
  const today = istDayKey(now);
  return history.some((h) => {
    const t = new Date(h.playedAt).getTime();
    return !Number.isNaN(t) && istDayKey(t) === today;
  });
}

export interface SoloBadge {
  id: string;
  title: string;
  hint: string;
  unlocked: boolean;
  /** 0..1 progress towards unlocking (for the progress ring / bar) */
  progress: number;
}

export function computeSoloBadges(activity: SoloActivity[], streak: number, longestStreak = streak): SoloBadge[] {
  const quizPasses = activity.filter((a) => a.mode === 'quiz' && a.passed).length;
  const practiceRounds = activity.filter((a) => a.mode === 'practice').length;
  const correctTotal = activity.reduce((sum, a) => sum + (a.correctCount || 0), 0);
  const flawless = activity.some((a) => a.totalQuestions >= 5 && a.correctCount === a.totalQuestions);
  const best = Math.max(streak, longestStreak);

  const ratio = (value: number, goal: number) => Math.min(1, value / goal);
  return [
    { id: 'solo_first', title: 'First Solo', hint: 'Finish your first quiz or practice round', unlocked: activity.length >= 1, progress: ratio(activity.length, 1) },
    { id: 'solo_pass', title: 'Quiz Passer', hint: 'Pass a quiz', unlocked: quizPasses >= 1, progress: ratio(quizPasses, 1) },
    { id: 'solo_scholar', title: 'Scholar', hint: 'Pass 5 quizzes', unlocked: quizPasses >= 5, progress: ratio(quizPasses, 5) },
    { id: 'solo_flawless', title: 'Flawless', hint: 'Score 100% on a quiz of 5+ questions', unlocked: flawless, progress: flawless ? 1 : 0 },
    { id: 'solo_practice10', title: 'Practice Pro', hint: 'Finish 10 practice rounds', unlocked: practiceRounds >= 10, progress: ratio(practiceRounds, 10) },
    { id: 'solo_century', title: 'Century', hint: 'Answer 100 questions correctly', unlocked: correctTotal >= 100, progress: ratio(correctTotal, 100) },
    { id: 'streak7', title: 'Week Warrior', hint: 'Keep a 7-day streak', unlocked: best >= 7, progress: ratio(best, 7) },
    { id: 'streak30', title: 'Unstoppable', hint: 'Keep a 30-day streak', unlocked: best >= 30, progress: ratio(best, 30) },
  ];
}

/** Badges that are unlocked in `after` but were not in `before` - for the "you earned…" moment. */
export function newlyUnlocked<T extends { id: string; unlocked: boolean }>(before: T[], after: T[]): T[] {
  const had = new Set(before.filter((b) => b.unlocked).map((b) => b.id));
  return after.filter((b) => b.unlocked && !had.has(b.id));
}

/** Which of the last `count` IST days (oldest first, today last) had any activity. */
export function recentDays(history: { playedAt: string }[], count = 7, now = Date.now()): boolean[] {
  const active = new Set(
    history
      .map((h) => new Date(h.playedAt).getTime())
      .filter((t) => !Number.isNaN(t))
      .map(istDayKey)
  );
  return Array.from({ length: count }, (_, i) => active.has(istDayKey(now - (count - 1 - i) * DAY_MS)));
}
