import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarClock,
  ClipboardList,
  Crown,
  Dumbbell,
  Flame,
  Gamepad2,
  GraduationCap,
  Heart,
  Lock,
  Medal,
  Sparkles,
  Star,
  Target,
  Trophy,
  UserCircle,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import api from '@/config/api';
import { useAuth } from '@/hooks/useAuth';
import { Mascot } from '@/components/brand/Mascot';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { XP_PER_LEVEL, computeAchievements } from '@/lib/gamification';
import { soloBadgeIcons, useDailyProgress } from '@/components/quiz/SoloProgress';
import { dueLabel } from '@/lib/quiz';
import type { Competition, MyAssignment } from '@/types';

interface SquadSummary {
  _id: string;
  name: string;
  size: number;
  members: unknown[];
}

const achievementIcons: Record<string, LucideIcon> = {
  first: Star,
  sharp: Target,
  perfect: Zap,
  podium: Medal,
  team: Users,
  streak3: Flame,
  veteran: Crown,
};

/** Re-renders every 30s so the countdown stays fresh without a heavy timer. */
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatCountdown(target: number, now: number): string {
  const diff = target - now;
  if (diff <= 0) return 'now';
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const formatIST = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

export function DashboardPage() {
  const { user } = useAuth();
  const now = useNow();

  // Match history + solo quiz/practice activity, combined into one streak, XP and badge set
  const daily = useDailyProgress();
  const assignmentsQ = useQuery({
    queryKey: ['assignments-mine'],
    queryFn: async () => ((await api.get('/assignments/mine')).data.data ?? []) as MyAssignment[],
  });
  const teamsQ = useQuery({
    queryKey: ['dashboard', 'teams'],
    queryFn: async () => ((await api.get('/teams/my')).data.data ?? []) as SquadSummary[],
  });
  const compsQ = useQuery({
    queryKey: ['dashboard', 'competitions'],
    queryFn: async () => ((await api.get('/competitions')).data.data ?? []) as Competition[],
  });

  const history = daily.matches;
  const teams = teamsQ.data ?? [];

  const streak = daily.streak;
  const progress = daily.progress;
  const soloBadges = daily.badges;
  const achievements = useMemo(
    () => computeAchievements(history, streak, teams.length),
    [history, streak, teams.length]
  );
  const unlockedCount =
    achievements.filter((a) => a.unlocked).length + soloBadges.filter((b) => b.unlocked).length;
  const totalBadges = achievements.length + soloBadges.length;
  const todo = (assignmentsQ.data ?? []).filter((a) => a.status !== 'submitted' && a.status !== 'submitted_late');
  const nextDue = [...todo].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0];
  const avgAccuracy = history.length
    ? Math.round((history.reduce((s, h) => s + h.accuracy, 0) / history.length) * 100)
    : null;

  const liveComp = compsQ.data?.find((c) => c.status === 'Live');
  const openComp = compsQ.data
    ?.filter((c) => c.status === 'Registration Open')
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
  const featured = liveComp ?? openComp;

  const cta = liveComp
    ? { label: 'Open Lobby', to: `/competitions/${liveComp._id}` }
    : openComp
      ? { label: 'Register', to: `/competitions/${openComp._id}` }
      : history.length
        ? { label: 'View Result', to: '/history' }
        : { label: 'Browse Competitions', to: '/competitions' };

  const firstName = user?.name?.split(' ')[0] ?? 'Champion';

  const tiles: Array<{
    n: string; title: string; desc: string; Icon: LucideIcon; to: string;
    status: string; variant: 'info' | 'warning' | 'default' | 'success'; locked?: string;
  }> = [
    { n: '01', title: 'Registration', desc: 'Join an upcoming individual or team competition.', Icon: ClipboardList, to: '/competitions', status: openComp ? 'Open now' : 'Browse', variant: openComp ? 'success' : 'info' },
    { n: '02', title: 'Instructions', desc: 'Rules, scoring, time limits and tie-breakers.', Icon: BookOpen, to: '/instructions', status: 'Read', variant: 'info' },
    { n: '03', title: 'Teams', desc: 'Build a squad of 2, 4 or 6 and invite players.', Icon: Users, to: '/teams', status: teams.length ? 'Ready' : 'Action needed', variant: teams.length ? 'success' : 'warning' },
    { n: '04', title: 'Multiplayer Game', desc: 'Real-time quiz arena with synchronized questions.', Icon: Gamepad2, to: liveComp ? `/competitions/${liveComp._id}` : '/competitions', status: liveComp ? 'Live' : 'Locked', variant: liveComp ? 'success' : 'default', locked: liveComp ? undefined : 'Opens when a competition you joined goes Live.' },
    { n: '05', title: 'Results', desc: 'Rankings, accuracy and per-question review.', Icon: Trophy, to: '/leaderboard', status: history.length ? 'Ready' : 'No results yet', variant: history.length ? 'success' : 'default' },
    { n: '06', title: 'Certificates', desc: 'Download verifiable certificates with QR codes.', Icon: Award, to: '/certificates', status: 'Ready', variant: 'success' },
    { n: '07', title: 'Donation', desc: 'Support prizes, technology and student participation.', Icon: Heart, to: '/support', status: 'Ready', variant: 'info' },
    { n: '08', title: 'Profile', desc: 'Personal details, education and guardian info.', Icon: UserCircle, to: '/profile', status: 'Ready', variant: 'info' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Hero ───────────────────────────────────────── */}
      <section className="gradient-electric relative overflow-hidden rounded-[28px] p-6 text-white shadow-lifted sm:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-sky-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden />
              Namaste, {firstName}!
            </span>
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
              GYAN<span className="text-sky-300">-26</span>
            </h1>
            <p className="text-lg font-semibold text-sky-100 sm:text-xl">Kaun Banega Gyanwan Vivekvan Gunwan</p>
            <p className="text-sm font-semibold uppercase tracking-widest text-sky-300">Junior KG se PhD Tak</p>
            <Link
              to={cta.to}
              className="btn-3d inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-6 font-bold text-navy-900 outline-none focus-visible:ring-4 focus-visible:ring-white/50"
              style={{ boxShadow: '0 4px 0 0 rgba(148,180,255,0.9)' }}
            >
              {cta.label}
              <ArrowRight className="h-4 w-4 text-electric-600" aria-hidden />
            </Link>
          </div>
          <Mascot className="mx-auto h-40 w-40 animate-float sm:h-52 sm:w-52" />
        </div>
      </section>

      {/* ── Learning progress: streak · XP · stats ─────── */}
      <section aria-label="Your progress" className="grid gap-4 md:grid-cols-3">
        <Card className="flex items-center gap-4">
          <span className={cn('grid h-16 w-16 shrink-0 place-items-center rounded-3xl', streak > 0 ? 'bg-orange-500/15' : 'bg-slate-900/5 dark:bg-white/10')}>
            <Flame className={cn('h-9 w-9', streak > 0 ? 'animate-flame text-orange-500' : 'text-slate-400')} aria-hidden />
          </span>
          <div>
            {daily.isLoading ? <Skeleton width={80} height={32} /> : (
              <p className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">
                {streak} <span className="text-base font-bold">day{streak === 1 ? '' : 's'}</span>
              </p>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {streak > 0
                ? daily.today
                  ? 'Daily streak — played today, nice!'
                  : 'Daily streak — play today to keep it burning!'
                : 'Play a match or finish a quiz to start your streak.'}
            </p>
          </div>
        </Card>

        <Card className="space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-electric-500 font-display font-extrabold text-white">
                {progress.level}
              </span>
              <div>
                <p className="font-display font-bold text-slate-900 dark:text-white">Level {progress.level}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{progress.xp} XP earned (match + quiz points)</p>
              </div>
            </div>
            <Badge variant="info">{progress.xpIntoLevel}/{XP_PER_LEVEL} XP</Badge>
          </div>
          <div
            role="progressbar"
            aria-label="Progress to next level"
            aria-valuemin={0}
            aria-valuemax={XP_PER_LEVEL}
            aria-valuenow={progress.xpIntoLevel}
            className="h-4 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-electric-400 to-emerald-400 transition-all duration-700"
              style={{ width: `${Math.max(progress.levelProgress * 100, history.length ? 4 : 0)}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 pt-1 text-center">
            {[
              { label: 'Matches', value: history.length },
              { label: 'Avg accuracy', value: avgAccuracy === null ? '—' : `${avgAccuracy}%` },
              { label: 'Badges', value: `${unlockedCount}/${totalBadges}` },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-900/5 py-2 dark:bg-white/5">
                <p className="font-display text-xl font-extrabold text-slate-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* ── Next competition + squad ───────────────────── */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <CalendarClock className="h-4 w-4 text-electric-500" aria-hidden />
            {liveComp ? 'Live now' : 'Upcoming competition'}
          </div>
          {compsQ.isLoading ? (
            <div className="space-y-2"><Skeleton height={24} width="70%" /><Skeleton /></div>
          ) : featured ? (
            <>
              <div className="space-y-1">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">{featured.name}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {featured.participationMode === 'team' ? `Team of ${featured.allowedTeamSize}` : 'Individual'} ·{' '}
                  {featured.numberOfQuestions} questions · {formatIST(featured.startAt)} IST
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {liveComp ? 'Happening right now' : <>Starts in <strong>{formatCountdown(new Date(featured.startAt).getTime(), now)}</strong></>}
                </p>
                <Link to={`/competitions/${featured._id}`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border-2 border-electric-500/70 px-4 text-sm font-bold text-electric-600 hover:bg-electric-500/10 dark:text-sky-200">
                  Details <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">No competition is open for registration right now. New ones will appear here.</p>
          )}
        </Card>

        <Card className="flex flex-col justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <Users className="h-4 w-4 text-emerald-600" aria-hidden />
            Your team
          </div>
          {teamsQ.isLoading ? (
            <div className="space-y-2"><Skeleton height={24} width="60%" /><Skeleton /></div>
          ) : teams.length ? (
            <ul className="space-y-2">
              {teams.slice(0, 2).map((t) => (
                <li key={t._id} className="flex items-center justify-between gap-3">
                  <span className="truncate font-display font-bold text-slate-900 dark:text-white">{t.name}</span>
                  <Badge variant={t.members.length === t.size ? 'success' : 'warning'}>
                    {t.members.length} of {t.size} members
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">You haven&apos;t joined a team yet.</p>
          )}
          <Link to="/teams" className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-electric-500/10 px-4 text-sm font-bold text-electric-600 hover:bg-electric-500/20 dark:text-sky-200">
            {teams.length ? 'Manage teams' : 'Create or join a team'} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Card>
      </section>

      {/* ── Achievements ───────────────────────────────── */}
      <section aria-labelledby="ach-title" className="space-y-3">
        <h2 id="ach-title" className="font-display text-xl font-extrabold text-slate-900 dark:text-white">Achievements</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {achievements.map((a) => {
            const Icon = achievementIcons[a.id] ?? Star;
            return (
              <li
                key={a.id}
                title={a.hint}
                className={cn(
                  'glass flex flex-col items-center gap-2 rounded-3xl p-3 text-center',
                  a.unlocked ? 'animate-pop' : 'opacity-70'
                )}
              >
                <span className={cn('grid h-12 w-12 place-items-center rounded-2xl', a.unlocked ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-navy-900 shadow-md' : 'bg-slate-900/10 text-slate-500 dark:bg-white/10 dark:text-slate-400')}>
                  {a.unlocked ? <Icon className="h-6 w-6" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{a.title}</span>
                <span className="text-[11px] leading-tight text-slate-600 dark:text-slate-300">{a.unlocked ? 'Unlocked' : a.hint}</span>
              </li>
            );
          })}
          {soloBadges.map((b) => {
            const Icon = soloBadgeIcons[b.id] ?? Star;
            return (
              <li
                key={b.id}
                title={b.hint}
                className={cn(
                  'glass flex flex-col items-center gap-2 rounded-3xl p-3 text-center',
                  b.unlocked ? 'animate-pop' : 'opacity-70'
                )}
              >
                <span className={cn('grid h-12 w-12 place-items-center rounded-2xl', b.unlocked ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-navy-900 shadow-md' : 'bg-slate-900/10 text-slate-500 dark:bg-white/10 dark:text-slate-400')}>
                  {b.unlocked ? <Icon className="h-6 w-6" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{b.title}</span>
                <span className="text-[11px] leading-tight text-slate-600 dark:text-slate-300">{b.unlocked ? 'Unlocked' : b.hint}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Play on your own ───────────────────────────── */}
      <section aria-labelledby="solo-title" className="space-y-3">
        <h2 id="solo-title" className="font-display text-xl font-extrabold text-slate-900 dark:text-white">Play on your own</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {todo.length > 0 && nextDue && (
            <Link to="/quizzes?tab=assigned" className="glass group flex items-center gap-4 rounded-3xl p-5 outline-none transition-all hover:-translate-y-1 hover:shadow-lifted focus-visible:ring-2 focus-visible:ring-electric-500 md:col-span-2">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-300">
                <ClipboardList className="h-7 w-7" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {todo.length} quiz{todo.length === 1 ? '' : 'zes'} assigned to you
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Next: <strong>{nextDue.quizTitle}</strong> · {dueLabel(nextDue.dueAt).text.toLowerCase()}
                </p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-rose-600 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          )}
          <Link to="/quizzes" className="glass group flex items-center gap-4 rounded-3xl p-5 outline-none transition-all hover:-translate-y-1 hover:shadow-lifted focus-visible:ring-2 focus-visible:ring-electric-500">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-electric-500/15 text-electric-600 dark:text-sky-200">
              <ClipboardList className="h-7 w-7" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Teacher quizzes</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">Browse quizzes or join your class with a code.</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-electric-600 transition-transform group-hover:translate-x-1 dark:text-sky-200" aria-hidden />
          </Link>
          <Link to="/practice" className="glass group flex items-center gap-4 rounded-3xl p-5 outline-none transition-all hover:-translate-y-1 hover:shadow-lifted focus-visible:ring-2 focus-visible:ring-electric-500">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <Dumbbell className="h-7 w-7" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Practice mode</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">Random questions for your level. No team, no waiting.</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-emerald-600 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
          {user && ['teacher', 'admin', 'superAdmin'].includes(user.role) && (
            <Link to="/studio" className="glass group flex items-center gap-4 rounded-3xl p-5 outline-none transition-all hover:-translate-y-1 hover:shadow-lifted focus-visible:ring-2 focus-visible:ring-electric-500 md:col-span-2">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-400/20 text-amber-700 dark:text-amber-300">
                <GraduationCap className="h-7 w-7" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Quiz Studio</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">Create quizzes for your students and see how they do.</p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-amber-600 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          )}
        </div>
      </section>

      {/* ── 8 numbered modules ─────────────────────────── */}
      <section aria-labelledby="hub-title" className="space-y-3">
        <h2 id="hub-title" className="font-display text-xl font-extrabold text-slate-900 dark:text-white">Competition hub</h2>
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {tiles.map(({ n, title, desc, Icon, to, status, variant, locked }) => {
            const body = (
              <>
                <span aria-hidden className="pointer-events-none absolute -right-1 -top-3 select-none font-display text-6xl font-black text-slate-900/[0.06] dark:text-white/[0.07]">{n}</span>
                <div className="relative mb-4 flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-electric-500/15 text-electric-600 transition-transform group-hover:scale-110 group-hover:-rotate-6 dark:text-sky-200">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <Badge variant={variant} size="sm">{status}</Badge>
                </div>
                <h3 className="relative font-display text-base font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="relative mt-1 text-sm text-slate-600 dark:text-slate-300">{desc}</p>
                {locked && (
                  <p className="relative mt-3 flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {locked}
                  </p>
                )}
              </>
            );
            const base = 'glass group relative block overflow-hidden rounded-3xl p-5 outline-none transition-all duration-200';
            return locked ? (
              <div key={n} aria-disabled="true" className={cn(base, 'opacity-80')}>{body}</div>
            ) : (
              <Link key={n} to={to} className={cn(base, 'hover:-translate-y-1 hover:shadow-lifted focus-visible:ring-2 focus-visible:ring-electric-500')}>
                {body}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
