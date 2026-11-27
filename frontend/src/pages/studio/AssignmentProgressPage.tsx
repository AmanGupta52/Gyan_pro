import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, BellRing, CalendarClock, CheckCircle2, Clock, Download, Hourglass, Users } from 'lucide-react';
import api from '@/config/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { ASSIGNMENT_STATUS_LABEL, apiError, downloadCsv, dueLabel, percent } from '@/lib/quiz';
import type { AssignmentProgress, AssignmentStatus } from '@/types';

const STATUS_VARIANT: Record<AssignmentStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  upcoming: 'default',
  not_started: 'info',
  in_progress: 'warning',
  submitted: 'success',
  submitted_late: 'warning',
  overdue: 'error',
};

export function AssignmentProgressPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const key = ['assignment-progress', id];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: key,
    queryFn: async () => (await api.get(`/assignments/${id}/progress`)).data.data as AssignmentProgress,
    retry: false,
    refetchInterval: 60_000, // keeps the board fresh while students are working
  });

  const remind = useMutation({
    mutationFn: async () => (await api.post(`/assignments/${id}/remind`)).data.data as { reminded: number },
    onSuccess: (res) => {
      toast.success(`Reminder sent to ${res.reminded} student${res.reminded === 1 ? '' : 's'}`);
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(apiError(e, 'Could not send reminders.')),
  });

  if (isLoading) return <Skeleton variant="rectangular" height={360} />;
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <EmptyState icon={Users} title="Progress unavailable" description={apiError(error, 'You can only view your own assignments.')} />
        <Link to="/studio/classes" className="text-sm font-semibold text-electric-600 dark:text-sky-200">← Back to classes</Link>
      </div>
    );
  }

  const { assignment: a, summary: s, rows } = data;
  const due = dueLabel(a.dueAt);
  const tiles = [
    { icon: Users, label: 'Students', value: s.students },
    { icon: CheckCircle2, label: 'Submitted', value: `${s.submitted}/${s.students}` },
    { icon: Hourglass, label: 'Still to do', value: s.pending + s.inProgress },
    { icon: Clock, label: 'Overdue', value: s.overdue },
    { icon: CheckCircle2, label: 'Avg accuracy', value: s.submitted ? percent(s.avgAccuracy) : '—' },
    { icon: CheckCircle2, label: 'Passed', value: `${s.passed}/${s.submitted}` },
  ];

  const exportCsv = () =>
    downloadCsv(
      `${a.className}-${a.quizTitle}-progress.csv`,
      ['Student', 'Email', 'Status', 'Attempts', 'Best score', 'Accuracy %', 'Passed', 'Finished at'],
      rows.map((r) => [
        r.name,
        r.email,
        ASSIGNMENT_STATUS_LABEL[r.status],
        r.attempts,
        r.score ?? '',
        r.accuracy == null ? '' : Math.round(r.accuracy * 100),
        r.passed == null ? '' : r.passed ? 'Yes' : 'No',
        r.finishedAt ?? '',
      ])
    );

  const toDo = s.pending + s.inProgress;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <Link to={`/studio/classes/${a.classId}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden /> {a.className}
          </Link>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">{a.quizTitle}</h1>
          <p className="mt-1 inline-flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <CalendarClock className="h-4 w-4" aria-hidden />
            Deadline {new Date(a.dueAt).toLocaleString()} · <span className={due.overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : 'font-semibold'}>{due.text}</span>
            {a.allowLate && <Badge size="sm">Late work accepted</Badge>}
            {a.status === 'cancelled' && <Badge variant="error" size="sm">Cancelled</Badge>}
          </p>
          {a.note && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">“{a.note}”</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} disabled={rows.length === 0} onClick={exportCsv}>CSV</Button>
          <Button leftIcon={<BellRing className="h-4 w-4" />} loading={remind.isPending} disabled={toDo === 0 || a.status !== 'active'} onClick={() => remind.mutate()}>
            Remind {toDo > 0 ? `${toDo} student${toDo === 1 ? '' : 's'}` : 'students'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {tiles.map(({ icon: Icon, label, value }) => (
          <Card key={label} className="flex flex-col items-center gap-1 p-4 text-center">
            <Icon className="h-5 w-5 text-electric-600 dark:text-sky-200" aria-hidden />
            <p className="font-display text-xl font-extrabold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">{label}</p>
          </Card>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Users} title="No students in this class yet" description="Add students or share the class code, and they will show up here." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Best score</TableHead>
              <TableHead>Accuracy</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Finished</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.userId}>
                <TableCell>
                  <p className="font-semibold text-slate-900 dark:text-white">{r.name}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{r.email}</p>
                </TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[r.status]} size="sm">{ASSIGNMENT_STATUS_LABEL[r.status]}</Badge></TableCell>
                <TableCell className="font-bold">{r.score ?? '—'}</TableCell>
                <TableCell>{r.accuracy == null ? '—' : percent(r.accuracy)}</TableCell>
                <TableCell>{r.passed == null ? '—' : <Badge variant={r.passed ? 'success' : 'default'} size="sm">{r.passed ? 'Passed' : 'Not passed'}</Badge>}</TableCell>
                <TableCell className="text-xs">{r.finishedAt ? new Date(r.finishedAt).toLocaleString() : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
