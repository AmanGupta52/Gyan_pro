import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, BarChart3, CalendarClock, Copy, Pencil, Plus, RefreshCw, Trash2, UserMinus, UserPlus } from 'lucide-react';
import api from '@/config/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiError, copyText, dueLabel, isoToLocalInput, localInputToIso } from '@/lib/quiz';
import { cn } from '@/lib/utils';
import type { AddMembersResult, ClassAssignmentRow, ClassDetail, ManagedQuiz } from '@/types';

/** Tomorrow 6 pm local - a sensible default deadline. */
function defaultDue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return isoToLocalInput(d.toISOString());
}

interface AssignForm {
  quizId: string;
  dueAt: string;
  openAt: string;
  allowLate: boolean;
  note: string;
}

function AssignmentFormFields({
  form,
  setForm,
  quizzes,
  lockQuiz,
}: {
  form: AssignForm;
  setForm: (f: AssignForm) => void;
  quizzes?: ManagedQuiz[];
  lockQuiz?: boolean;
}) {
  return (
    <>
      {!lockQuiz && (
        <Select label="Quiz" required value={form.quizId} onChange={(e) => setForm({ ...form, quizId: e.target.value })}>
          <option value="">Choose a published quiz…</option>
          {(quizzes ?? []).map((q) => (
            <option key={q._id} value={q._id}>{q.title} ({q.questionCount} questions)</option>
          ))}
        </Select>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Deadline" type="datetime-local" required value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
        <Input label="Opens (optional)" type="datetime-local" value={form.openAt} onChange={(e) => setForm({ ...form, openAt: e.target.value })} helperText="Blank = right away" />
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-900/[0.03] p-3 dark:bg-white/5">
        <input type="checkbox" checked={form.allowLate} onChange={(e) => setForm({ ...form, allowLate: e.target.checked })} className="mt-1 h-4 w-4 rounded" />
        <span>
          <span className="block text-sm font-semibold text-slate-900 dark:text-white">Accept late work</span>
          <span className="block text-xs text-slate-600 dark:text-slate-300">After the deadline students can still play, and you see it marked “late”.</span>
        </span>
      </label>
      <Input label="Note for students (optional)" value={form.note} maxLength={500} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Revise chapter 3 first" />
    </>
  );
}

export function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignForm>({ quizId: '', dueAt: defaultDue(), openAt: '', allowLate: false, note: '' });
  const [editing, setEditing] = useState<ClassAssignmentRow | null>(null);
  const [editForm, setEditForm] = useState<AssignForm>({ quizId: '', dueAt: '', openAt: '', allowLate: false, note: '' });
  const [emails, setEmails] = useState('');
  const [addResult, setAddResult] = useState<AddMembersResult | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const key = ['studio-class', id];
  const { data, isLoading, isError, error } = useQuery({
    queryKey: key,
    queryFn: async () => (await api.get(`/classes/${id}`)).data.data as ClassDetail,
    retry: false,
  });
  const { data: quizzes } = useQuery({
    queryKey: ['studio-quizzes', 'mine'],
    queryFn: async () => (await api.get('/quizzes/mine', { params: { scope: 'mine' } })).data.data as ManagedQuiz[],
    enabled: assignOpen,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['studio-classes'] });
  };

  const assign = useMutation({
    mutationFn: async () =>
      api.post(`/classes/${id}/assignments`, {
        quizId: assignForm.quizId,
        dueAt: localInputToIso(assignForm.dueAt),
        openAt: localInputToIso(assignForm.openAt),
        allowLate: assignForm.allowLate,
        note: assignForm.note.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Quiz assigned. Your students have been notified.');
      setAssignOpen(false);
      setAssignForm({ quizId: '', dueAt: defaultDue(), openAt: '', allowLate: false, note: '' });
      refresh();
    },
    onError: (e) => toast.error(apiError(e, 'Could not assign the quiz.')),
  });

  const saveEdit = useMutation({
    mutationFn: async () =>
      api.patch(`/assignments/${editing!._id}`, {
        dueAt: localInputToIso(editForm.dueAt),
        openAt: localInputToIso(editForm.openAt) ?? undefined,
        allowLate: editForm.allowLate,
        note: editForm.note.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Assignment updated');
      setEditing(null);
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const removeAssignment = useMutation({
    mutationFn: async (aId: string) => (await api.delete(`/assignments/${aId}`)).data.data as { outcome: string },
    onSuccess: (res) => {
      toast.success(res.outcome === 'cancelled' ? 'Assignment cancelled (results are kept)' : 'Assignment removed');
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const addMembers = useMutation({
    mutationFn: async () => {
      const list = emails.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
      return (await api.post(`/classes/${id}/members`, { emails: list })).data.data as AddMembersResult;
    },
    onSuccess: (res) => {
      setAddResult(res);
      if (res.added.length) {
        toast.success(`${res.added.length} student${res.added.length > 1 ? 's' : ''} added`);
        setEmails('');
      }
      refresh();
    },
    onError: (e) => toast.error(apiError(e, 'Could not add students.')),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => api.delete(`/classes/${id}/members/${userId}`),
    onSuccess: () => {
      toast.success('Student removed');
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const regenerate = useMutation({
    mutationFn: async () => api.post(`/classes/${id}/regenerate-code`),
    onSuccess: () => {
      toast.success('New class code created. The old one no longer works.');
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const patchClass = useMutation({
    mutationFn: async (body: Record<string, unknown>) => api.patch(`/classes/${id}`, body),
    onSuccess: () => {
      setRenameOpen(false);
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const deleteClass = useMutation({
    mutationFn: async () => api.delete(`/classes/${id}`),
    onSuccess: () => {
      toast.success('Class deleted');
      qc.invalidateQueries({ queryKey: ['studio-classes'] });
      navigate('/studio/classes', { replace: true });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  if (isLoading) return <Skeleton variant="rectangular" height={360} />;
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <EmptyState icon={UserMinus} title="Class unavailable" description={apiError(error, 'You can only open your own classes.')} />
        <Link to="/studio/classes" className="text-sm font-semibold text-electric-600 dark:text-sky-200">← Back to classes</Link>
      </div>
    );
  }

  const { class: cls, members, assignments } = data;
  const archived = cls.status === 'archived';
  const publishedQuizzes = (quizzes ?? []).filter((q) => q.status === 'published');
  const hasAssignments = assignments.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <Link to="/studio/classes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Classes
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
            {cls.name} {archived && <Badge>Archived</Badge>}
          </h1>
          {cls.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{cls.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => { setNameDraft(cls.name); setRenameOpen(true); }}>Rename</Button>
          <Button variant="secondary" onClick={() => patchClass.mutate({ status: archived ? 'active' : 'archived' })}>{archived ? 'Unarchive' : 'Archive'}</Button>
          {!hasAssignments && (
            <Button variant="ghost" className="text-rose-600" aria-label="Delete class" onClick={() => window.confirm(`Delete “${cls.name}”?`) && deleteClass.mutate()}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Class code · students type this to join</p>
          <p className="font-mono text-2xl font-extrabold tracking-[0.3em] text-slate-900 dark:text-white">{cls.joinCode}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<Copy className="h-4 w-4" />} onClick={async () => ((await copyText(cls.joinCode)) ? toast.success('Class code copied') : toast.error('Could not copy'))}>Copy</Button>
          <Button variant="ghost" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => window.confirm('Make a new code? The old code stops working (students already in the class stay).') && regenerate.mutate()}>New code</Button>
        </div>
      </Card>

      {/* ── Assignments ── */}
      <section className="space-y-3" aria-labelledby="asg-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="asg-title" className="font-display text-xl font-bold text-slate-900 dark:text-white">Assignments</h2>
          <Button leftIcon={<Plus className="h-4 w-4" />} disabled={archived} onClick={() => setAssignOpen(true)}>Assign a quiz</Button>
        </div>
        {hasAssignments ? (
          <ul className="space-y-3">
            {assignments.map((a) => {
              const due = dueLabel(a.dueAt);
              const cancelled = a.status === 'cancelled';
              const pct = a.memberCount ? Math.round((a.submittedCount / a.memberCount) * 100) : 0;
              return (
                <li key={a._id}>
                  <Card className={cn('space-y-3 p-4', cancelled && 'opacity-60')}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display text-lg font-bold text-slate-900 dark:text-white">{a.quizTitle}</p>
                        <p className={cn('inline-flex items-center gap-1.5 text-sm font-semibold', cancelled ? 'text-slate-500' : due.overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200')}>
                          <CalendarClock className="h-4 w-4" aria-hidden />
                          {new Date(a.dueAt).toLocaleString()} · {cancelled ? 'Cancelled' : due.text}
                          {a.allowLate && !cancelled && <Badge size="sm">Late OK</Badge>}
                        </p>
                      </div>
                      {!cancelled && (
                        <div className="flex flex-wrap gap-2">
                          <Link to={`/studio/assignments/${a._id}`} className="glass inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                            <BarChart3 className="h-3.5 w-3.5" aria-hidden /> Progress
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Pencil className="h-3.5 w-3.5" />}
                            onClick={() => {
                              setEditing(a);
                              setEditForm({ quizId: a.quizId, dueAt: isoToLocalInput(a.dueAt), openAt: isoToLocalInput(a.openAt), allowLate: a.allowLate, note: a.note ?? '' });
                            }}
                          >
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="text-rose-600" aria-label={`Remove ${a.quizTitle}`} onClick={() => window.confirm(`Remove “${a.quizTitle}” from this class?`) && removeAssignment.mutate(a._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {!cancelled && (
                      <div className="space-y-1">
                        <div
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={pct}
                          aria-label={`${a.quizTitle} submissions`}
                          className="h-2 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10"
                        >
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{a.submittedCount} of {a.memberCount} students submitted</p>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={CalendarClock} title="Nothing assigned yet" description="Assign a published quiz with a deadline. Students are notified and see it in their Assigned tab." />
        )}
      </section>

      {/* ── Students ── */}
      <section className="space-y-3" aria-labelledby="stu-title">
        <h2 id="stu-title" className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Students <span className="text-base font-semibold text-slate-500">({members.length})</span>
        </h2>
        <Card className="space-y-3 p-4">
          <label htmlFor="add-emails" className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Add students by email</label>
          <textarea
            id="add-emails"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            rows={3}
            placeholder="asha@example.com, ben@example.com (they need a GYAN-26 student account)"
            className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-electric-500"
          />
          <div className="flex justify-end">
            <Button leftIcon={<UserPlus className="h-4 w-4" />} loading={addMembers.isPending} disabled={!emails.trim() || archived} onClick={() => addMembers.mutate()}>Add students</Button>
          </div>
          {addResult && (
            <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-200" aria-live="polite">
              {addResult.added.length > 0 && <li>✓ Added: {addResult.added.join(', ')}</li>}
              {addResult.alreadyIn.length > 0 && <li>Already in the class: {addResult.alreadyIn.join(', ')}</li>}
              {addResult.notFound.length > 0 && <li className="text-amber-700 dark:text-amber-300">No account found: {addResult.notFound.join(', ')}. Ask them to sign up, or share the class code.</li>}
              {addResult.notStudent.length > 0 && <li className="text-amber-700 dark:text-amber-300">Not a student account: {addResult.notStudent.join(', ')}</li>}
            </ul>
          )}
        </Card>

        {members.length > 0 ? (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-3 bg-white/50 px-4 py-3 dark:bg-white/[0.03]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{m.name}</p>
                  <p className="truncate text-xs text-slate-600 dark:text-slate-300">{m.email}{m.educationLevel ? ` · ${m.educationLevel}` : ''}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-rose-600" aria-label={`Remove ${m.name}`} onClick={() => window.confirm(`Remove ${m.name} from this class?`) && removeMember.mutate(m.userId)}>
                  <UserMinus className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            No students yet. Share the class code <strong className="font-mono">{cls.joinCode}</strong>, or add them by email above.
          </p>
        )}
      </section>

      {/* ── Modals ── */}
      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title="Assign a quiz" description="Students in this class are notified right away.">
        <form
          className="space-y-4 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!assignForm.quizId) return toast.error('Choose a quiz first.');
            assign.mutate();
          }}
        >
          {quizzes && publishedQuizzes.length === 0 ? (
            <p className="rounded-2xl bg-amber-400/15 p-3 text-sm text-slate-800 dark:text-slate-100">
              You have no published quizzes yet. <Link to="/studio" className="font-semibold underline">Publish one first</Link>, then come back.
            </p>
          ) : (
            <AssignmentFormFields form={assignForm} setForm={setAssignForm} quizzes={publishedQuizzes} />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button type="submit" loading={assign.isPending} disabled={publishedQuizzes.length === 0}>Assign</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit assignment" description={editing?.quizTitle}>
        <form
          className="space-y-4 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveEdit.mutate();
          }}
        >
          <AssignmentFormFields form={editForm} setForm={setEditForm} lockQuiz />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" loading={saveEdit.isPending}>Save changes</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={renameOpen} onClose={() => setRenameOpen(false)} title="Rename class">
        <form
          className="space-y-4 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            patchClass.mutate({ name: nameDraft.trim() });
          }}
        >
          <Input label="Class name" required value={nameDraft} maxLength={80} onChange={(e) => setNameDraft(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button type="submit" loading={patchClass.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
