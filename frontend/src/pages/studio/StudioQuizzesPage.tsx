import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BarChart3, ClipboardList, Copy, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import api from '@/config/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiError, copyText, percent } from '@/lib/quiz';
import type { ManagedQuiz, QuizStatus } from '@/types';

const STATUS_VARIANT: Record<QuizStatus, 'success' | 'warning' | 'default'> = {
  published: 'success',
  draft: 'warning',
  archived: 'default',
};

export function StudioQuizzesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isModerator = user?.role === 'admin' || user?.role === 'superAdmin';
  const [showAll, setShowAll] = useState(isModerator);

  const scope = isModerator && showAll ? 'all' : 'mine';
  const { data: quizzes, isLoading } = useQuery({
    queryKey: ['studio-quizzes', scope],
    queryFn: async () => (await api.get('/quizzes/mine', { params: { scope } })).data.data as ManagedQuiz[],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['studio-quizzes'] });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QuizStatus }) => api.patch(`/quizzes/${id}/status`, { status }),
    onSuccess: (_d, v) => {
      toast.success(v.status === 'published' ? 'Quiz is live for students' : v.status === 'archived' ? 'Quiz archived' : 'Quiz moved back to draft');
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/quizzes/${id}`),
    onSuccess: () => {
      toast.success('Quiz deleted');
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const testPlay = async (id: string) => {
    try {
      const { data } = await api.post('/solo/start', { quizId: id });
      navigate(`/solo/${data.data.attemptId}`);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const copyCode = async (code: string) => {
    if (await copyText(code)) toast.success(`Join code ${code} copied`);
    else toast.error('Could not copy. Select the code and copy it manually.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
            {isModerator && showAll ? 'All quizzes' : 'My quizzes'}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Build quizzes, share the join code with your class, and see exactly where students struggle.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isModerator && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-4 w-4 rounded" />
              Show everyone’s quizzes
            </label>
          )}
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/studio/quizzes/new')}>
            New quiz
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={200} />)}
        </div>
      ) : quizzes && quizzes.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {quizzes.map((q) => {
            const mine = q.createdBy?._id === user?._id;
            return (
              <Card key={q._id} className="flex flex-col justify-between gap-4 p-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={STATUS_VARIANT[q.status]} size="sm" className="capitalize">{q.status}</Badge>
                    <Badge variant="info" size="sm">{q.category}</Badge>
                    {q.visibility === 'unlisted' && <Badge size="sm">Private</Badge>}
                    {!mine && q.createdBy?.name && <Badge size="sm">by {q.createdBy.name}</Badge>}
                  </div>
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">{q.title}</h2>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    {[
                      ['Questions', q.questionCount],
                      ['Players', q.playerCount],
                      ['Avg accuracy', percent(q.avgAccuracy)],
                    ].map(([label, value]) => (
                      <div key={label as string} className="rounded-xl bg-slate-900/[0.04] py-2 dark:bg-white/5">
                        <p className="font-display text-lg font-extrabold text-slate-900 dark:text-white">{value}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">{label}</p>
                      </div>
                    ))}
                  </div>
                  {q.joinCode && (
                    <button
                      type="button"
                      onClick={() => copyCode(q.joinCode!)}
                      className="inline-flex items-center gap-2 rounded-xl bg-electric-500/10 px-3 py-1.5 font-mono text-sm font-bold tracking-widest text-electric-700 hover:bg-electric-500/20 dark:text-sky-200"
                      aria-label={`Copy join code ${q.joinCode}`}
                    >
                      {q.joinCode} <Copy className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link to={`/studio/quizzes/${q._id}`} className="glass inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                  </Link>
                  <Link to={`/studio/quizzes/${q._id}/results`} className="glass inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <BarChart3 className="h-3.5 w-3.5" aria-hidden /> Results
                  </Link>
                  {q.questionCount > 0 && (
                    <Button size="sm" variant="ghost" leftIcon={<Play className="h-3.5 w-3.5" />} onClick={() => testPlay(q._id)}>
                      Test play
                    </Button>
                  )}
                  {q.status === 'published' ? (
                    <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: q._id, status: 'draft' })}>Unpublish</Button>
                  ) : (
                    <Button size="sm" onClick={() => setStatus.mutate({ id: q._id, status: 'published' })} disabled={q.questionCount === 0}>Publish</Button>
                  )}
                  {q.status !== 'archived' && q.attemptCount > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: q._id, status: 'archived' })}>Archive</Button>
                  )}
                  {q.attemptCount === 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600"
                      aria-label={`Delete ${q.title}`}
                      onClick={() => window.confirm(`Delete “${q.title}”? This cannot be undone.`) && remove.mutate(q._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No quizzes yet"
          description="Create your first quiz in a few minutes. Pick questions from the shared bank or write your own."
          actionLabel="Create a quiz"
          onAction={() => navigate('/studio/quizzes/new')}
        />
      )}
    </div>
  );
}
