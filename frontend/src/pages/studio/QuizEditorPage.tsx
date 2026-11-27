import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowLeft, ArrowUp, BarChart3, Copy, Plus, RefreshCw, Search, X } from 'lucide-react';
import api from '@/config/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EDUCATION_LEVELS, apiError, copyText, isoToLocalInput, localInputToIso } from '@/lib/quiz';
import type { BankQuestion, Quiz, QuizInput, QuizStatus, ShowAnswersMode, SubjectRef } from '@/types';

interface FormState {
  title: string;
  description: string;
  category: string;
  subjectId: string;
  visibility: 'public' | 'unlisted';
  showAnswers: ShowAnswersMode;
  passPercent: number;
  timePerQuestionSeconds: string; // '' = use each question's own timer
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  speedBonusMax: number;
  penaltyWrong: number;
  certificateEnabled: boolean;
  startAt: string;
  endAt: string;
}

const EMPTY: FormState = {
  title: '',
  description: '',
  category: 'Class 10',
  subjectId: '',
  visibility: 'public',
  showAnswers: 'after_each',
  passPercent: 40,
  timePerQuestionSeconds: '',
  maxAttempts: 0,
  shuffleQuestions: false,
  shuffleOptions: false,
  speedBonusMax: 0,
  penaltyWrong: 0,
  certificateEnabled: true,
  startAt: '',
  endAt: '',
};

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-900/[0.03] p-3 dark:bg-white/5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 rounded" />
      <span>
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
        {hint && <span className="block text-xs text-slate-600 dark:text-slate-300">{hint}</span>}
      </span>
    </label>
  );
}

export function QuizEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [selected, setSelected] = useState<BankQuestion[]>([]);
  const [status, setStatus] = useState<QuizStatus>('draft');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [bankLevel, setBankLevel] = useState('all');
  const [onlyMine, setOnlyMine] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => (await api.get('/categories/subjects')).data.data as SubjectRef[],
  });

  const { data: bank, isFetching: bankLoading, refetch: refetchBank } = useQuery({
    queryKey: ['bank', search, bankLevel, onlyMine],
    queryFn: async () =>
      (
        await api.get('/questions', {
          params: {
            search: search.trim() || undefined,
            educationLevel: bankLevel !== 'all' ? bankLevel : undefined,
            mine: onlyMine ? 'true' : undefined,
            limit: 30,
          },
        })
      ).data.data as BankQuestion[],
  });

  // Load an existing quiz
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const [quizRes, qRes] = await Promise.all([api.get(`/quizzes/${id}`), api.get(`/quizzes/${id}/questions`)]);
        if (cancelled) return;
        const q = quizRes.data.data as Quiz;
        setForm({
          title: q.title,
          description: q.description ?? '',
          category: q.category,
          subjectId: q.subject?._id ?? '',
          visibility: q.visibility,
          showAnswers: q.showAnswers,
          passPercent: q.passPercent,
          timePerQuestionSeconds: q.timePerQuestionSeconds ? String(q.timePerQuestionSeconds) : '',
          maxAttempts: q.maxAttempts,
          shuffleQuestions: q.shuffleQuestions,
          shuffleOptions: q.shuffleOptions,
          speedBonusMax: q.speedBonusMax,
          penaltyWrong: q.penaltyWrong,
          certificateEnabled: q.certificateEnabled !== false,
          startAt: isoToLocalInput(q.startAt),
          endAt: isoToLocalInput(q.endAt),
        });
        setStatus(q.status);
        setJoinCode(q.joinCode ?? '');
        setSelected(qRes.data.data as BankQuestion[]);
      } catch (err) {
        toast.error(apiError(err, 'Could not load this quiz.'));
        navigate('/studio', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const selectedIds = new Set(selected.map((q) => q._id));
  const totalPoints = selected.reduce((s, q) => s + q.points, 0);

  const move = (index: number, dir: -1 | 1) =>
    setSelected((list) => {
      const next = [...list];
      const target = index + dir;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target] as BankQuestion, next[index] as BankQuestion];
      return next;
    });

  const buildPayload = (): QuizInput | null => {
    if (form.title.trim().length < 3) {
      toast.error('Give your quiz a title (at least 3 characters).');
      return null;
    }
    if (form.startAt && form.endAt && new Date(form.endAt) <= new Date(form.startAt)) {
      toast.error('The closing time must be after the opening time.');
      return null;
    }
    return {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      subjectId: form.subjectId || null,
      questionIds: selected.map((q) => q._id),
      visibility: form.visibility,
      timePerQuestionSeconds: form.timePerQuestionSeconds ? Number(form.timePerQuestionSeconds) : null,
      shuffleQuestions: form.shuffleQuestions,
      shuffleOptions: form.shuffleOptions,
      maxAttempts: Number(form.maxAttempts) || 0,
      passPercent: Number(form.passPercent) || 0,
      showAnswers: form.showAnswers,
      speedBonusMax: Number(form.speedBonusMax) || 0,
      penaltyWrong: Number(form.penaltyWrong) || 0,
      certificateEnabled: form.certificateEnabled,
      startAt: localInputToIso(form.startAt),
      endAt: localInputToIso(form.endAt),
    };
  };

  /** Saves (create or update). Returns the quiz id, or null if it failed. */
  const save = async (): Promise<string | null> => {
    const payload = buildPayload();
    if (!payload) return null;
    try {
      setSaving(true);
      if (isNew) {
        const { data } = await api.post('/quizzes', payload);
        return data.data._id as string;
      }
      await api.patch(`/quizzes/${id}`, payload);
      return id!;
    } catch (err) {
      toast.error(apiError(err, 'Could not save the quiz.'));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    const savedId = await save();
    if (!savedId) return;
    toast.success('Quiz saved');
    if (isNew) navigate(`/studio/quizzes/${savedId}`, { replace: true });
  };

  const onPublish = async () => {
    if (selected.length === 0) {
      toast.error('Add at least one question before publishing.');
      return;
    }
    const savedId = await save();
    if (!savedId) return;
    try {
      await api.patch(`/quizzes/${savedId}/status`, { status: 'published' });
      toast.success('Quiz is live. Share the join code with your students!');
      if (isNew) navigate(`/studio/quizzes/${savedId}`, { replace: true });
      else setStatus('published');
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  const onUnpublish = async () => {
    try {
      await api.patch(`/quizzes/${id}/status`, { status: 'draft' });
      setStatus('draft');
      toast.success('Quiz moved back to draft');
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  if (loading) return <Skeleton variant="rectangular" height={420} />;

  const shareLink = joinCode ? `${window.location.origin}/quizzes/join/${joinCode}` : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <Link to="/studio" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden /> My quizzes
          </Link>
          <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
            {isNew ? 'New quiz' : 'Edit quiz'}
            {!isNew && <Badge variant={status === 'published' ? 'success' : 'warning'} className="capitalize">{status}</Badge>}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isNew && (
            <Link to={`/studio/quizzes/${id}/results`} className="glass inline-flex h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <BarChart3 className="h-4 w-4" aria-hidden /> Results
            </Link>
          )}
          <Button variant="secondary" loading={saving} onClick={onSave}>Save</Button>
          {status === 'published' ? (
            <Button variant="ghost" onClick={onUnpublish}>Unpublish</Button>
          ) : (
            <Button loading={saving} onClick={onPublish}>Save & publish</Button>
          )}
        </div>
      </div>

      {!isNew && joinCode && (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Join code</p>
            <p className="font-mono text-2xl font-extrabold tracking-[0.3em] text-slate-900 dark:text-white">{joinCode}</p>
          </div>
          <Button
            variant="secondary"
            leftIcon={<Copy className="h-4 w-4" />}
            onClick={async () => ((await copyText(shareLink)) ? toast.success('Student link copied') : toast.error('Could not copy the link'))}
          >
            Copy student link
          </Button>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Settings ─────────────────────────────── */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="space-y-4 p-5">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Basics</h2>
            <Input label="Title" value={form.title} maxLength={120} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Algebra — Chapter 3 test" />
            <div className="space-y-1.5">
              <label htmlFor="quiz-desc" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Description (optional)</label>
              <textarea
                id="quiz-desc"
                value={form.description}
                maxLength={1000}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-electric-500"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Select label="Level" value={form.category} onChange={(e) => set('category', e.target.value)}>
                {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
              <Select label="Subject" value={form.subjectId} onChange={(e) => set('subjectId', e.target.value)}>
                <option value="">No subject</option>
                {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </Select>
            </div>
            <Select
              label="Who can find it"
              value={form.visibility}
              onChange={(e) => set('visibility', e.target.value as FormState['visibility'])}
              helperText={form.visibility === 'unlisted' ? 'Only students with the join code can play.' : 'Listed for every student.'}
            >
              <option value="public">Everyone (listed in Quizzes)</option>
              <option value="unlisted">Private (join code only)</option>
            </Select>
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Rules</h2>
            <Select label="Show correct answers" value={form.showAnswers} onChange={(e) => set('showAnswers', e.target.value as ShowAnswersMode)}>
              <option value="after_each">After every question (learning)</option>
              <option value="after_finish">When the quiz ends</option>
              <option value="never">Never — exam mode</option>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Pass mark %" type="number" min={0} max={100} value={form.passPercent} onChange={(e) => set('passPercent', Number(e.target.value))} />
              <Input label="Attempts allowed" type="number" min={0} max={100} value={form.maxAttempts} onChange={(e) => set('maxAttempts', Number(e.target.value))} helperText="0 = unlimited" />
              <Input label="Seconds per question" type="number" min={5} max={300} value={form.timePerQuestionSeconds} onChange={(e) => set('timePerQuestionSeconds', e.target.value)} helperText="Blank = each question’s own timer" />
              <Input label="Speed bonus (max)" type="number" min={0} max={500} value={form.speedBonusMax} onChange={(e) => set('speedBonusMax', Number(e.target.value))} />
              <Input label="Wrong-answer penalty" type="number" min={0} max={500} value={form.penaltyWrong} onChange={(e) => set('penaltyWrong', Number(e.target.value))} />
            </div>
            <Toggle label="Shuffle questions" hint="Every student gets a different order." checked={form.shuffleQuestions} onChange={(v) => set('shuffleQuestions', v)} />
            <Toggle label="Shuffle answer options" hint="Makes copying from a neighbour harder." checked={form.shuffleOptions} onChange={(v) => set('shuffleOptions', v)} />
            <Toggle
              label="Award a certificate when students pass"
              hint="A verifiable PDF with your name as issuer. Given once per student, only when the pass mark is reached."
              checked={form.certificateEnabled}
              onChange={(v) => set('certificateEnabled', v)}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Input label="Opens (optional)" type="datetime-local" value={form.startAt} onChange={(e) => set('startAt', e.target.value)} />
              <Input label="Closes (optional)" type="datetime-local" value={form.endAt} onChange={(e) => set('endAt', e.target.value)} />
            </div>
          </Card>
        </div>

        {/* ── Questions ────────────────────────────── */}
        <div className="space-y-4 lg:col-span-3">
          <Card className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Quiz questions <span className="text-slate-500">({selected.length})</span>
              </h2>
              <span className="text-xs text-slate-600 dark:text-slate-300">{totalPoints} points total</span>
            </div>
            {selected.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                No questions yet. Add some from the bank below.
              </p>
            ) : (
              <ol className="space-y-2">
                {selected.map((q, i) => (
                  <li key={q._id} className="flex items-center gap-2 rounded-2xl bg-slate-900/[0.04] p-3 dark:bg-white/5">
                    <span className="w-6 shrink-0 text-center text-sm font-bold text-slate-500">{i + 1}</span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-white" title={q.text}>{q.text}</p>
                    <div className="flex shrink-0 items-center">
                      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-900/10 disabled:opacity-30 dark:text-slate-300"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" aria-label="Move down" disabled={i === selected.length - 1} onClick={() => move(i, 1)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-900/10 disabled:opacity-30 dark:text-slate-300"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" aria-label="Remove question" onClick={() => setSelected((l) => l.filter((x) => x._id !== q._id))} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-500/10"><X className="h-4 w-4" /></button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Add from the question bank</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => refetchBank()}>Refresh</Button>
                <a href="/studio/questions" target="_blank" rel="noreferrer" className="glass inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  <Plus className="h-3.5 w-3.5" aria-hidden /> Write a new question
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search questions…"
                  aria-label="Search questions"
                  className="glass h-10 w-full rounded-xl pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-electric-500"
                />
              </div>
              <div className="sm:w-44">
                <Select aria-label="Filter by level" value={bankLevel} onChange={(e) => setBankLevel(e.target.value)}>
                  <option value="all">All levels</option>
                  {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </Select>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="h-4 w-4 rounded" />
                Only mine
              </label>
            </div>

            {bankLoading && !bank ? (
              <Skeleton variant="rectangular" height={120} />
            ) : bank && bank.length > 0 ? (
              <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {bank.map((q) => {
                  const added = selectedIds.has(q._id);
                  return (
                    <li key={q._id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white" title={q.text}>{q.text}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge variant="info" size="sm">{q.educationLevel}</Badge>
                          <Badge size="sm" className="capitalize">{q.difficulty}</Badge>
                          <Badge size="sm">{q.points} pts</Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={added ? 'ghost' : 'secondary'}
                        disabled={added}
                        onClick={() => setSelected((l) => [...l, q])}
                      >
                        {added ? 'Added' : 'Add'}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-300">No questions match. Try a different search, or write a new question.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
