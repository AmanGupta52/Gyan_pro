import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, CheckCircle2, Clock, Download, Flag, Flame, Lightbulb, RotateCcw, SkipForward, Sparkles, Target, Trophy, XCircle } from 'lucide-react';
import api from '@/config/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { apiError, formatDuration, percent } from '@/lib/quiz';
import { downloadOrShareCertificate } from '@/lib/certificateMobile';
import { useDailyProgress } from '@/components/quiz/SoloProgress';
import { computeLongestStreak, computeSoloBadges, computeStreak, newlyUnlocked, soloAsPlayed } from '@/lib/gamification';
import type { SoloResult } from '@/types';

export function SoloResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();

  const { data: r, isLoading, error } = useQuery({
    queryKey: ['solo-result', attemptId],
    queryFn: async () => (await api.get(`/solo/attempts/${attemptId}/result`)).data.data as SoloResult,
    retry: false,
  });

  const daily = useDailyProgress({ fresh: true });

  // "You just earned…" only makes sense right after finishing, not when re-opening an old result
  const moment = useMemo(() => {
    if (!r || daily.isLoading || !r.finishedAt) return null;
    if (Date.now() - new Date(r.finishedAt).getTime() > 10 * 60 * 1000) return null;
    const before = daily.activity.filter((a) => a._id !== r.attemptId);
    const playedBefore = [...daily.matches, ...soloAsPlayed(before)];
    const streakBefore = computeStreak(playedBefore);
    const badgesBefore = computeSoloBadges(before, streakBefore, computeLongestStreak(playedBefore));
    return {
      streakBefore,
      extended: daily.streak > streakBefore,
      fresh: newlyUnlocked(badgesBefore, daily.badges),
    };
  }, [r, daily]);

  if (isLoading) return <Skeleton variant="rectangular" height={360} />;

  if (error || !r) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <EmptyState icon={Flag} title="No result to show" description={apiError(error, 'This attempt is not finished yet.')} />
        <Link to={`/solo/${attemptId}`} className="text-sm font-semibold text-electric-600 dark:text-sky-200">Continue the quiz →</Link>
      </div>
    );
  }

  const tiles = [
    { icon: Target, label: 'Accuracy', value: percent(r.accuracy) },
    { icon: CheckCircle2, label: 'Correct', value: `${r.correctCount}/${r.totalQuestions}` },
    { icon: SkipForward, label: 'Skipped', value: r.unansweredCount },
    { icon: Clock, label: 'Time', value: formatDuration(r.durationSeconds) },
  ];
  const isPractice = r.mode === 'practice';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="gradient-electric rounded-[28px] p-6 text-center text-white shadow-lifted sm:p-10">
        <Trophy className="mx-auto h-10 w-10" aria-hidden />
        <p className="mt-3 text-sm font-semibold uppercase tracking-widest text-white/80">{r.title}</p>
        <p className="mt-2 font-display text-6xl font-black">{r.totalScore}</p>
        <p className="text-white/80">points</p>
        {!isPractice && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Badge variant={r.passed ? 'success' : 'warning'} size="md">
              {r.passed ? `Passed · pass mark ${r.passPercent}%` : `Not passed yet · pass mark ${r.passPercent}%`}
            </Badge>
            {r.late && <Badge variant="warning" size="md">Submitted after the deadline</Badge>}
          </div>
        )}
      </section>

      {r.certificate && (
        <Card className="flex flex-col gap-4 border-2 border-amber-300/80 bg-[#FCF9F2] p-5 dark:bg-slate-900 sm:flex-row sm:items-center">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-400 text-slate-900">
            <Award className="h-7 w-7" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">You earned a certificate!</h2>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Verifiable with a QR code. ID <span className="font-mono">{r.certificate.certificateId}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              leftIcon={<Download className="h-4 w-4" />}
              onClick={async () => {
                try {
                  await downloadOrShareCertificate(r.certificate!.certificateId, `GYAN-26 Certificate - ${r.title}`);
                } catch {
                  toast.error('Could not download the certificate');
                }
              }}
            >
              Download PDF
            </Button>
            <Link to="/certificates" className="glass inline-flex min-h-[44px] items-center rounded-2xl px-4 text-sm font-bold text-slate-800 dark:text-slate-100">
              My certificates
            </Link>
          </div>
        </Card>
      )}

      {moment && (daily.streak > 0 || moment.fresh.length > 0) && (
        <Card className="space-y-3 p-5" aria-live="polite">
          {daily.streak > 0 && (
            <p className="flex items-center gap-2 font-display text-lg font-extrabold text-slate-900 dark:text-white">
              <Flame className="h-6 w-6 animate-flame text-orange-500" aria-hidden />
              {daily.streak}-day streak
              {moment.extended && <Badge variant="success" size="sm">Extended today!</Badge>}
            </p>
          )}
          {moment.fresh.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                <Sparkles className="h-4 w-4 text-amber-500" aria-hidden /> New badge{moment.fresh.length > 1 ? 's' : ''} unlocked
              </p>
              <ul className="flex flex-wrap gap-2">
                {moment.fresh.map((b) => (
                  <li key={b.id} className="rounded-xl bg-amber-400/20 px-3 py-1.5 text-sm font-semibold text-slate-900 ring-1 ring-amber-400/60 dark:text-white">
                    {b.title}
                    <span className="ml-2 text-xs font-normal text-slate-600 dark:text-slate-300">{b.hint}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(({ icon: Icon, label, value }) => (
          <Card key={label} className="flex flex-col items-center gap-1 p-4 text-center">
            <Icon className="h-5 w-5 text-electric-600 dark:text-sky-200" aria-hidden />
            <p className="font-display text-xl font-extrabold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">{label}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to={isPractice || !r.quizId ? '/practice' : `/quizzes/${r.quizId}`}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-electric-500 px-5 text-sm font-bold text-white shadow-md hover:bg-electric-600"
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> {isPractice ? 'Practise again' : 'Play again'}
        </Link>
        <Link to="/quizzes" className="glass inline-flex min-h-[44px] items-center rounded-2xl px-5 text-sm font-bold text-slate-800 dark:text-slate-100">
          More quizzes
        </Link>
      </div>

      {r.review === null ? (
        <Card className="p-6 text-center text-sm text-slate-700 dark:text-slate-200">
          This quiz is in exam mode, so the correct answers stay hidden. Ask your teacher to go over it with you.
        </Card>
      ) : (
        <section className="space-y-4" aria-label="Question review">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Review your answers</h2>
          {r.review.map((q) => (
            <Card key={q.questionId} className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-900 dark:text-white">
                  <span className="text-slate-500">{q.order}.</span> {q.text}
                </p>
                {q.unanswered ? (
                  <Badge size="sm">Skipped</Badge>
                ) : q.isCorrect ? (
                  <Badge variant="success" size="sm">+{q.scoreAwarded}</Badge>
                ) : (
                  <Badge variant="error" size="sm">Wrong</Badge>
                )}
              </div>
              <ul className="space-y-2">
                {q.options.map((o, i) => {
                  const correct = q.correctAnswers.includes(o.id);
                  const picked = q.selectedOptions.includes(o.id);
                  return (
                    <li
                      key={o.id}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm',
                        correct && 'border-emerald-500/60 bg-emerald-500/10',
                        picked && !correct && 'border-rose-500/60 bg-rose-500/10',
                        !correct && !picked && 'border-transparent bg-slate-900/[0.03] dark:bg-white/5'
                      )}
                    >
                      <span className="font-bold text-slate-500">{String.fromCharCode(65 + i)}</span>
                      <span className="flex-1 text-slate-800 dark:text-slate-100">{o.text}</span>
                      {correct && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Correct answer" />}
                      {picked && !correct && <XCircle className="h-4 w-4 text-rose-600" aria-label="Your answer" />}
                    </li>
                  );
                })}
              </ul>
              {q.explanation && (
                <p className="flex gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden /> {q.explanation}
                </p>
              )}
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
