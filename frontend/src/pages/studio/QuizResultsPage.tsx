import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Clock, Download, Target, Users } from 'lucide-react';
import api from '@/config/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { apiError, csvCell, formatDuration, percent } from '@/lib/quiz';
import type { Quiz, QuizAnalytics, QuizAttemptRow } from '@/types';

export function QuizResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const { data: quiz } = useQuery({
    queryKey: ['quiz', id],
    queryFn: async () => (await api.get(`/quizzes/${id}`)).data.data as Quiz,
  });

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['quiz-analytics', id],
    queryFn: async () => (await api.get(`/quizzes/${id}/analytics`)).data.data as QuizAnalytics,
    retry: false,
  });

  const { data: attempts } = useQuery({
    queryKey: ['quiz-attempts', id, page],
    queryFn: async () => {
      const res = await api.get(`/quizzes/${id}/attempts`, { params: { page, limit: 15 } });
      return { rows: res.data.data as QuizAttemptRow[], totalPages: (res.data.meta?.totalPages as number) || 1 };
    },
  });

  const exportCsv = async () => {
    try {
      setExporting(true);
      const all: QuizAttemptRow[] = [];
      for (let p = 1; p <= 20; p++) {
        const res = await api.get(`/quizzes/${id}/attempts`, { params: { page: p, limit: 100 } });
        all.push(...(res.data.data as QuizAttemptRow[]));
        if (p >= (res.data.meta?.totalPages ?? 1)) break;
      }
      const header = ['Name', 'Email', 'Level', 'Institution', 'Score', 'Max score', 'Correct', 'Accuracy %', 'Passed', 'Time (s)', 'Finished at'];
      const lines = all.map((a) =>
        [
          a.userId?.name,
          a.userId?.email,
          a.userId?.educationLevel,
          a.userId?.institution,
          a.totalScore,
          a.maxScore,
          a.correctCount,
          Math.round(a.accuracy * 100),
          a.passed ? 'Yes' : 'No',
          a.durationSeconds,
          a.finishedAt,
        ]
          .map(csvCell)
          .join(',')
      );
      const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(quiz?.title ?? 'quiz').replace(/[^\w-]+/g, '_')}-results.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(apiError(err, 'Could not export results.'));
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) return <Skeleton variant="rectangular" height={360} />;

  if (error || !analytics) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <EmptyState icon={Users} title="Results unavailable" description={apiError(error, 'You can only view results for your own quizzes.')} />
        <Link to="/studio" className="text-sm font-semibold text-electric-600 dark:text-sky-200">← Back to quizzes</Link>
      </div>
    );
  }

  const s = analytics.summary;
  const tiles = [
    { icon: Users, label: 'Students', value: s.players },
    { icon: CheckCircle2, label: 'Attempts', value: s.attempts },
    { icon: Target, label: 'Avg accuracy', value: percent(s.avgAccuracy) },
    { icon: Target, label: 'Pass rate', value: percent(s.passRate) },
    { icon: Clock, label: 'Avg time', value: formatDuration(s.avgDurationSeconds) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <Link to="/studio" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Quizzes
          </Link>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">{quiz?.title ?? 'Quiz'} · results</h1>
        </div>
        <Button variant="secondary" loading={exporting} disabled={s.attempts === 0} leftIcon={<Download className="h-4 w-4" />} onClick={exportCsv}>
          Download CSV
        </Button>
      </div>

      {s.attempts === 0 ? (
        <EmptyState icon={Users} title="No student has finished this quiz yet" description="Share the join code or publish the quiz. Your own test plays are not counted." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {tiles.map(({ icon: Icon, label, value }) => (
              <Card key={label} className="flex flex-col items-center gap-1 p-4 text-center">
                <Icon className="h-5 w-5 text-electric-600 dark:text-sky-200" aria-hidden />
                <p className="font-display text-xl font-extrabold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{label}</p>
              </Card>
            ))}
          </div>

          <Card className="space-y-4 p-5">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Question difficulty</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">Hardest first — the best topics to revisit in class.</p>
            </div>
            <ul className="space-y-3">
              {analytics.questions.map((q) => {
                const rate = q.correctRate;
                const tone = rate == null ? 'bg-slate-400' : rate < 0.4 ? 'bg-rose-500' : rate < 0.7 ? 'bg-amber-500' : 'bg-emerald-500';
                return (
                  <li key={q.questionId} className="space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm font-medium text-slate-900 dark:text-white">
                        <span className="text-slate-500">Q{q.order}.</span> {q.text}
                      </p>
                      <span className="shrink-0 text-sm font-bold text-slate-900 dark:text-white">{percent(rate)}</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round((rate ?? 0) * 100)}
                      aria-label={`Q${q.order} correct rate`}
                      className="h-2 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10"
                    >
                      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.round((rate ?? 0) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {q.correct}/{q.responses} correct · {q.skipped} skipped{q.avgTimeSeconds != null && ` · avg ${q.avgTimeSeconds}s`}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Card>

          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Every attempt</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Finished</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(attempts?.rows ?? []).map((a) => (
                  <TableRow key={a._id}>
                    <TableCell>
                      <p className="font-semibold text-slate-900 dark:text-white">{a.userId?.name ?? 'Student'}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">{a.userId?.email}</p>
                    </TableCell>
                    <TableCell className="font-bold">{a.totalScore}<span className="font-normal text-slate-500">/{a.maxScore}</span></TableCell>
                    <TableCell>{percent(a.accuracy)}</TableCell>
                    <TableCell>{formatDuration(a.durationSeconds)}</TableCell>
                    <TableCell><Badge variant={a.passed ? 'success' : 'default'} size="sm">{a.passed ? 'Passed' : 'Not passed'}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(a.finishedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination currentPage={page} totalPages={attempts?.totalPages ?? 1} onPageChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}
