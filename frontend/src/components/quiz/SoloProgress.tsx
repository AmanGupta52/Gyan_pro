import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  Dumbbell,
  Flame,
  GraduationCap,
  Lock,
  Play,
  Sparkles,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import api from '@/config/api';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
  computeLongestStreak,
  computeProgress,
  computeSoloBadges,
  computeStreak,
  playedToday,
  recentDays,
  soloAsPlayed,
  soloAsScores,
  type SoloBadge,
} from '@/lib/gamification';
import type { SoloActivity, UserMatchHistoryItem } from '@/types';

export const soloBadgeIcons: Record<string, LucideIcon> = {
  solo_first: Play,
  solo_pass: BadgeCheck,
  solo_scholar: GraduationCap,
  solo_flawless: Sparkles,
  solo_practice10: Dumbbell,
  solo_century: Target,
  streak7: Flame,
  streak30: Zap,
};

/**
 * One place that turns real history (competition matches + solo attempts) into
 * streak, XP and badges, using the same gamification code everywhere.
 */
export function useDailyProgress(opts: { fresh?: boolean } = {}) {
  const historyQ = useQuery({
    queryKey: ['dashboard', 'history'],
    queryFn: async () =>
      ((await api.get('/results/history', { params: { limit: 50 } })).data.data ?? []) as UserMatchHistoryItem[],
  });
  const activityQ = useQuery({
    queryKey: ['solo-activity'],
    queryFn: async () => ((await api.get('/solo/activity')).data.data ?? []) as SoloActivity[],
    // After finishing a quiz the cached copy is out of date
    refetchOnMount: opts.fresh ? 'always' : true,
    staleTime: opts.fresh ? 0 : 30_000,
  });

  const matches = historyQ.data;
  const activity = activityQ.data;

  const value = useMemo(() => {
    const m = matches ?? [];
    const a = activity ?? [];
    const played = [...m, ...soloAsPlayed(a)];
    const streak = computeStreak(played);
    const longest = computeLongestStreak(played);
    return {
      matches: m,
      activity: a,
      played,
      streak,
      longest,
      today: playedToday(played),
      days: recentDays(played, 7),
      progress: computeProgress([...m, ...soloAsScores(a)]),
      badges: computeSoloBadges(a, streak, longest),
    };
  }, [matches, activity]);

  return { ...value, isLoading: activityQ.isLoading || historyQ.isLoading };
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function StreakCard({
  streak,
  longest,
  today,
  days,
  className,
}: {
  streak: number;
  longest: number;
  today: boolean;
  days: boolean[];
  className?: string;
}) {
  const message =
    streak === 0
      ? 'Finish a quiz or practice round to start your streak.'
      : today
      ? 'You played today. See you tomorrow to keep it going!'
      : 'Play today to keep your streak alive.';

  // Label the 7 dots with the real weekday of each day
  const labels = days.map((_, i) => DAY_LETTERS[(new Date(Date.now() - (days.length - 1 - i) * 86400000).getDay() + 6) % 7]);

  return (
    <Card className={cn('flex flex-col gap-4 p-5 sm:flex-row sm:items-center', className)}>
      <div className="flex items-center gap-4">
        <span className={cn('grid h-16 w-16 shrink-0 place-items-center rounded-3xl', streak > 0 ? 'bg-orange-500/15' : 'bg-slate-900/5 dark:bg-white/10')}>
          <Flame className={cn('h-9 w-9', streak > 0 ? 'animate-flame text-orange-500' : 'text-slate-400')} aria-hidden />
        </span>
        <div>
          <p className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">
            {streak} <span className="text-base font-bold">day{streak === 1 ? '' : 's'}</span>
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Best streak: {longest} day{longest === 1 ? '' : 's'}</p>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-sm text-slate-700 dark:text-slate-200">{message}</p>
        <ol className="flex gap-1.5" aria-label="Last 7 days">
          {days.map((on, i) => (
            <li key={i} className="flex flex-col items-center gap-1">
              <span
                className={cn('grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold', on ? 'bg-orange-500 text-white' : 'bg-slate-900/10 text-slate-500 dark:bg-white/10')}
                aria-label={on ? 'Played' : 'Not played'}
              >
                {on ? <Flame className="h-3.5 w-3.5" aria-hidden /> : ''}
              </span>
              <span className={cn('text-[10px]', i === days.length - 1 ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500')}>{labels[i]}</span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

export function BadgeGrid({ badges, className }: { badges: SoloBadge[]; className?: string }) {
  return (
    <ul className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', className)}>
      {badges.map((b) => {
        const Icon = soloBadgeIcons[b.id] ?? BadgeCheck;
        return (
          <li
            key={b.id}
            className={cn(
              'flex flex-col items-center gap-2 rounded-2xl p-4 text-center',
              b.unlocked ? 'bg-amber-400/15 ring-1 ring-amber-400/50' : 'bg-slate-900/[0.04] dark:bg-white/5'
            )}
          >
            <span className={cn('grid h-11 w-11 place-items-center rounded-2xl', b.unlocked ? 'bg-amber-400 text-slate-900' : 'bg-slate-900/10 text-slate-500 dark:bg-white/10')}>
              {b.unlocked ? <Icon className="h-5 w-5" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{b.title}</p>
            <p className="text-[11px] leading-snug text-slate-600 dark:text-slate-300">{b.hint}</p>
            {!b.unlocked && (
              <div
                role="progressbar"
                aria-label={`${b.title} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(b.progress * 100)}
                className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10"
              >
                <div className="h-full rounded-full bg-electric-500" style={{ width: `${Math.round(b.progress * 100)}%` }} />
              </div>
            )}
            <span className="sr-only">{b.unlocked ? 'Unlocked' : 'Locked'}</span>
          </li>
        );
      })}
    </ul>
  );
}
