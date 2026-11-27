import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, CalendarClock, ClipboardCheck, GraduationCap, Play, RotateCcw, Users } from 'lucide-react';
import api from '@/config/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { ASSIGNMENT_STATUS_LABEL, apiError, dueLabel, percent } from '@/lib/quiz';
import type { AssignmentStatus, JoinedClass, MyAssignment } from '@/types';

export const ASSIGNMENTS_KEY = ['assignments-mine'] as const;

const STATUS_VARIANT: Record<AssignmentStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  upcoming: 'default',
  not_started: 'info',
  in_progress: 'warning',
  submitted: 'success',
  submitted_late: 'warning',
  overdue: 'error',
};

function AssignmentCard({ a }: { a: MyAssignment }) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const done = a.status === 'submitted' || a.status === 'submitted_late';
  const due = dueLabel(a.dueAt);

  const start = async () => {
    try {
      setStarting(true);
      const { data } = await api.post('/solo/start', { quizId: a.quizId, assignmentId: a._id });
      navigate(`/solo/${data.data.attemptId}`);
    } catch (err) {
      toast.error(apiError(err, 'Could not start this quiz.'));
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card className="flex flex-col justify-between gap-4 p-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={STATUS_VARIANT[a.status]} size="sm">{ASSIGNMENT_STATUS_LABEL[a.status]}</Badge>
          <Badge variant="info" size="sm">{a.className}</Badge>
          {a.certificateEnabled && (
            <Badge size="sm" className="gap-1"><Award className="h-3 w-3" aria-hidden /> Certificate</Badge>
          )}
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">{a.quizTitle}</h3>
          {a.teacherName && <p className="text-xs text-slate-600 dark:text-slate-300">Assigned by {a.teacherName}</p>}
        </div>
        {a.note && <p className="rounded-xl bg-slate-900/[0.04] px-3 py-2 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-200">“{a.note}”</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          <span>{a.questionCount} questions</span>
          <span>Pass mark {a.passPercent}%</span>
          {a.timePerQuestionSeconds && <span>{a.timePerQuestionSeconds}s each</span>}
        </div>
        <p
          className={cn(
            'inline-flex items-center gap-1.5 text-sm font-semibold',
            done ? 'text-slate-600 dark:text-slate-300' : due.overdue ? 'text-rose-600 dark:text-rose-400' : due.soon ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'
          )}
        >
          <CalendarClock className="h-4 w-4" aria-hidden />
          {done ? `Deadline ${new Date(a.dueAt).toLocaleString()}` : due.text}
          {!done && due.overdue && a.allowLate && <span className="font-normal">· late work accepted</span>}
        </p>
        {done && a.score !== null && (
          <p className="text-sm text-slate-800 dark:text-slate-100">
            Your best: <strong>{a.score} pts</strong> · {percent(a.accuracy)} ·{' '}
            {a.passed ? <span className="font-semibold text-emerald-600 dark:text-emerald-400">Passed</span> : <span className="font-semibold">Not passed yet</span>}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {a.inProgressAttemptId ? (
          <Button leftIcon={<Play className="h-4 w-4" />} onClick={() => navigate(`/solo/${a.inProgressAttemptId}`)}>Resume</Button>
        ) : a.canStart ? (
          <Button loading={starting} leftIcon={done ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />} variant={done ? 'secondary' : 'primary'} onClick={start}>
            {done ? 'Try again' : 'Start'}
          </Button>
        ) : !done ? (
          <Button disabled>{a.status === 'upcoming' ? `Opens ${new Date(a.openAt).toLocaleString()}` : !a.quizPublished ? 'Not available' : 'Closed'}</Button>
        ) : null}
        {a.resultAttemptId && (
          <Link to={`/solo/${a.resultAttemptId}/result`} className="glass inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-4 text-sm font-bold text-slate-800 dark:text-slate-100">
            <ClipboardCheck className="h-4 w-4" aria-hidden /> View result
          </Link>
        )}
      </div>
    </Card>
  );
}

export function AssignedTab() {
  const qc = useQueryClient();
  const [code, setCode] = useState('');

  const { data: assignments, isLoading } = useQuery({
    queryKey: ASSIGNMENTS_KEY,
    queryFn: async () => (await api.get('/assignments/mine')).data.data as MyAssignment[],
  });
  const { data: classes = [] } = useQuery({
    queryKey: ['classes-joined'],
    queryFn: async () => (await api.get('/classes/joined')).data.data as JoinedClass[],
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ASSIGNMENTS_KEY });
    qc.invalidateQueries({ queryKey: ['classes-joined'] });
  };

  const join = useMutation({
    mutationFn: async () => (await api.post('/classes/join', { code: code.trim() })).data.data as { name: string; teacherName: string },
    onSuccess: (res) => {
      toast.success(`You joined ${res.name}${res.teacherName ? ` (${res.teacherName})` : ''}`);
      setCode('');
      refresh();
    },
    onError: (e) => toast.error(apiError(e, 'Could not join that class.')),
  });

  const leave = useMutation({
    mutationFn: async (id: string) => api.post(`/classes/${id}/leave`),
    onSuccess: () => {
      toast.success('You left the class');
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-electric-500/15 text-electric-600 dark:text-sky-200">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Join a class</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">Your teacher gives you a code. Quizzes they assign show up here.</p>
          </div>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim().length < 4) {
              toast.error('Enter the class code from your teacher.');
              return;
            }
            join.mutate();
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={12}
            placeholder="CLASS CODE"
            aria-label="Class code"
            className="glass h-11 min-w-0 flex-1 rounded-2xl px-4 font-mono text-sm uppercase tracking-widest outline-none focus:ring-2 focus:ring-electric-500"
          />
          <Button type="submit" loading={join.isPending}>Join</Button>
        </form>

        {classes.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1" aria-label="My classes">
            {classes.map((c) => (
              <li key={c._id} className="flex items-center gap-2 rounded-xl bg-slate-900/[0.05] py-1.5 pl-3 pr-1.5 text-sm dark:bg-white/10">
                <Users className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                <span className="font-semibold text-slate-900 dark:text-white">{c.name}</span>
                {c.teacherName && <span className="text-xs text-slate-600 dark:text-slate-300">· {c.teacherName}</span>}
                <button
                  type="button"
                  onClick={() => window.confirm(`Leave ${c.name}? You will no longer see its quizzes.`) && leave.mutate(c._id)}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-500/10"
                  aria-label={`Leave ${c.name}`}
                >
                  Leave
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => <Skeleton key={i} variant="rectangular" height={220} />)}
        </div>
      ) : assignments && assignments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {assignments.map((a) => <AssignmentCard key={a._id} a={a} />)}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title={classes.length ? 'Nothing assigned right now' : 'No classes yet'}
          description={classes.length ? 'When a teacher gives your class a quiz with a deadline, it appears here.' : 'Join a class with the code from your teacher to see assigned quizzes.'}
        />
      )}
    </div>
  );
}
