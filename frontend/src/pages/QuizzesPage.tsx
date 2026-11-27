import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight,
  BookOpen,
  Clock,
  Dumbbell,
  KeyRound,
  Play,
  Search,
  Target,
  Trophy,
} from 'lucide-react';
import api from '@/config/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/utils';
import { EDUCATION_LEVELS, apiError, percent } from '@/lib/quiz';
import { AssignedTab, ASSIGNMENTS_KEY } from '@/components/quiz/AssignedTab';
import { BadgeGrid, StreakCard, useDailyProgress } from '@/components/quiz/SoloProgress';
import type { MyAssignment } from '@/types';
import type { Quiz, SoloHistoryItem, SoloStats } from '@/types';

type Tab = 'assigned' | 'browse' | 'attempts';

function QuizCard({ quiz }: { quiz: Quiz }) {
  const inProgress = quiz.my?.inProgressAttemptId;
  return (
    <Link
      to={`/quizzes/${quiz._id}`}
      className="glass group flex h-full flex-col justify-between gap-4 rounded-3xl p-5 outline-none transition-all hover:-translate-y-1 hover:shadow-lifted focus-visible:ring-2 focus-visible:ring-electric-500"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="info" size="sm">{quiz.category}</Badge>
          {quiz.subject && <Badge size="sm">{quiz.subject.name}</Badge>}
          {inProgress && <Badge variant="warning" size="sm">In progress</Badge>}
        </div>
        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">{quiz.title}</h3>
        {quiz.description && (
          <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{quiz.description}</p>
        )}
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" aria-hidden /> {quiz.questionCount} questions</span>
          {quiz.timePerQuestionSeconds && (
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden /> {quiz.timePerQuestionSeconds}s each</span>
          )}
          {quiz.my?.bestAccuracy != null && (
            <span className="inline-flex items-center gap-1"><Trophy className="h-3.5 w-3.5" aria-hidden /> Best {percent(quiz.my.bestAccuracy)}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">by {quiz.createdBy?.name ?? 'GYAN team'}</span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-electric-600 dark:text-sky-200">
            {inProgress ? 'Resume' : quiz.my?.attempts ? 'Play again' : 'Play'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

function BrowseTab() {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quizzes', category, submittedSearch, page],
    queryFn: async () => {
      const res = await api.get('/quizzes', {
        params: {
          category: category !== 'all' ? category : undefined,
          search: submittedSearch || undefined,
          page,
          limit: 12,
        },
      });
      return { quizzes: res.data.data as Quiz[], totalPages: (res.data.meta?.totalPages as number) || 1 };
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSubmittedSearch(search.trim());
          }}
        >
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quizzes…"
            aria-label="Search quizzes"
            className="glass h-11 w-full rounded-2xl pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-electric-500"
          />
        </form>
        <div className="sm:w-52">
          <Select
            aria-label="Filter by level"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All levels</option>
            {EDUCATION_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} variant="rectangular" height={190} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState icon={BookOpen} title="Could not load quizzes" description="Check your connection and try again." />
      ) : data && data.quizzes.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.quizzes.map((q) => (
              <QuizCard key={q._id} quiz={q} />
            ))}
          </div>
          <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No quizzes here yet"
          description="Teachers are adding quizzes all the time. In the meantime, try Practice mode."
        />
      )}
    </div>
  );
}

function AttemptsTab() {
  const daily = useDailyProgress();
  const { data: stats } = useQuery({
    queryKey: ['solo-stats'],
    queryFn: async () => (await api.get('/solo/stats')).data.data as SoloStats,
  });
  const { data: history, isLoading } = useQuery({
    queryKey: ['solo-history'],
    queryFn: async () => (await api.get('/solo/history', { params: { limit: 30 } })).data.data as SoloHistoryItem[],
  });

  return (
    <div className="space-y-5">
      <StreakCard streak={daily.streak} longest={daily.longest} today={daily.today} days={daily.days} />

      {stats && stats.attempts > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Quizzes finished', value: stats.attempts, icon: Play },
            { label: 'Average accuracy', value: percent(stats.avgAccuracy), icon: Target },
            { label: 'Best score', value: stats.bestScore, icon: Trophy },
            { label: 'Correct answers', value: stats.correctAnswers, icon: BookOpen },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-electric-500/15 text-electric-600 dark:text-sky-200">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-display text-xl font-extrabold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <Skeleton variant="rectangular" height={160} />
      ) : history && history.length > 0 ? (
        <ul className="space-y-3">
          {history.map((a) => {
            const done = a.status === 'finished';
            return (
              <li key={a._id}>
                <Link
                  to={done ? `/solo/${a._id}/result` : `/solo/${a._id}`}
                  className="glass flex items-center justify-between gap-3 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lifted"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{a.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {new Date(a.createdAt).toLocaleDateString()} · {a.mode === 'practice' ? 'Practice' : 'Quiz'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {done ? (
                      <>
                        <span className="font-display text-lg font-extrabold text-slate-900 dark:text-white">{a.totalScore}</span>
                        <Badge variant={a.passed ? 'success' : 'default'} size="sm">{percent(a.accuracy)}</Badge>
                      </>
                    ) : (
                      <Badge variant="warning" size="sm">
                        Resume · {a.progress.answered}/{a.progress.total}
                      </Badge>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={Play} title="No attempts yet" description="Play a quiz or start a practice round and your history shows up here." />
      )}

      <section className="space-y-3" aria-labelledby="badges-title">
        <h2 id="badges-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Badges <span className="text-sm font-semibold text-slate-500">({daily.badges.filter((b) => b.unlocked).length}/{daily.badges.length})</span>
        </h2>
        <BadgeGrid badges={daily.badges} />
      </section>
    </div>
  );
}

export function QuizzesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initial = params.get('tab');
  const [tab, setTabState] = useState<Tab>(initial === 'assigned' || initial === 'attempts' ? initial : 'browse');
  const setTab = (t: Tab) => {
    setTabState(t);
    setParams(t === 'browse' ? {} : { tab: t }, { replace: true });
  };
  const [code, setCode] = useState('');

  // Same query the Assigned tab uses, so the badge count costs nothing extra
  const { data: assignments } = useQuery({
    queryKey: ASSIGNMENTS_KEY,
    queryFn: async () => (await api.get('/assignments/mine')).data.data as MyAssignment[],
  });
  const dueCount = (assignments ?? []).filter((a) => a.status !== 'submitted' && a.status !== 'submitted_late').length;
  const [joining, setJoining] = useState(false);

  const joinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      toast.error('Enter the code your teacher gave you.');
      return;
    }
    try {
      setJoining(true);
      await api.get(`/quizzes/join/${encodeURIComponent(clean)}`);
      navigate(`/quizzes/join/${encodeURIComponent(clean)}`);
    } catch (err) {
      toast.error(apiError(err, 'No quiz found for that code.'));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="gradient-electric relative overflow-hidden rounded-[28px] p-6 text-white shadow-lifted sm:p-10">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Play on your own</h1>
        <p className="mt-2 max-w-xl text-white/90">
          Take a teacher’s quiz, join a class with a code, or sharpen your skills in practice mode — no team needed.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-electric-500/15 text-electric-600 dark:text-sky-200">
              <KeyRound className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Have a code?</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">Join your teacher’s private quiz.</p>
            </div>
          </div>
          <form onSubmit={joinByCode} className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={12}
              placeholder="e.g. K7M2QX"
              aria-label="Quiz join code"
              className="glass h-11 min-w-0 flex-1 rounded-2xl px-4 font-mono text-sm uppercase tracking-widest outline-none focus:ring-2 focus:ring-electric-500"
            />
            <Button type="submit" loading={joining}>Join</Button>
          </form>
        </Card>

        <Card className="flex flex-col justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <Dumbbell className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Practice mode</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">Random questions from the official bank, your level, your pace.</p>
            </div>
          </div>
          <Link
            to="/practice"
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-emerald-500/10 px-4 text-sm font-bold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
          >
            Start practising <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Card>
      </section>

      <div role="tablist" aria-label="Quiz sections" className="flex gap-2">
        {([['assigned', 'Assigned'], ['browse', 'Browse quizzes'], ['attempts', 'My attempts']] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              'min-h-[44px] rounded-2xl px-5 text-sm font-bold transition-all',
              tab === id
                ? 'bg-electric-500 text-white shadow-md'
                : 'glass text-slate-700 hover:bg-electric-500/10 dark:text-slate-200'
            )}
          >
            {label}
            {id === 'assigned' && dueCount > 0 && (
              <span className="ml-2 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] text-white" aria-label={`${dueCount} to do`}>{dueCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'assigned' ? <AssignedTab /> : tab === 'browse' ? <BrowseTab /> : <AttemptsTab />}
    </div>
  );
}
