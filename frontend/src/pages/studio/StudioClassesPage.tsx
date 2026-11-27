import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Copy, GraduationCap, Plus, Users } from 'lucide-react';
import api from '@/config/api';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiError, copyText } from '@/lib/quiz';
import type { ClassSummary } from '@/types';

export function StudioClassesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isModerator = user?.role === 'admin' || user?.role === 'superAdmin';
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const scope = isModerator && showAll ? 'all' : 'mine';
  const { data: classes, isLoading } = useQuery({
    queryKey: ['studio-classes', scope],
    queryFn: async () => (await api.get('/classes/mine', { params: { scope } })).data.data as ClassSummary[],
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/classes', { name: name.trim(), description: description.trim() || undefined })).data.data,
    onSuccess: () => {
      toast.success('Class created. Share its code with your students.');
      setOpen(false);
      setName('');
      setDescription('');
      qc.invalidateQueries({ queryKey: ['studio-classes'] });
    },
    onError: (e) => toast.error(apiError(e, 'Could not create the class.')),
  });

  const copyCode = async (code: string) => {
    if (await copyText(code)) toast.success(`Class code ${code} copied`);
    else toast.error('Could not copy. Select the code and copy it manually.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">Classes</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Group your students, give them a quiz with a deadline, and see who has finished.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isModerator && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-4 w-4 rounded" />
              Show everyone’s classes
            </label>
          )}
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>New class</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => <Skeleton key={i} variant="rectangular" height={170} />)}
        </div>
      ) : classes && classes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.map((c) => (
            <Card key={c._id} className="flex flex-col justify-between gap-4 p-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {c.status === 'archived' && <Badge size="sm">Archived</Badge>}
                  {c.owner._id !== user?._id && <Badge size="sm">by {c.owner.name}</Badge>}
                </div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">{c.name}</h2>
                {c.description && <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{c.description}</p>}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
                  <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden /> {c.memberCount} student{c.memberCount === 1 ? '' : 's'}</span>
                  <span>{c.openAssignmentCount} open assignment{c.openAssignmentCount === 1 ? '' : 's'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyCode(c.joinCode)}
                  className="inline-flex items-center gap-2 rounded-xl bg-electric-500/10 px-3 py-1.5 font-mono text-sm font-bold tracking-widest text-electric-700 hover:bg-electric-500/20 dark:text-sky-200"
                  aria-label={`Copy class code ${c.joinCode}`}
                >
                  {c.joinCode} <Copy className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <Link to={`/studio/classes/${c._id}`} className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-2xl bg-electric-500 px-4 text-sm font-bold text-white hover:bg-electric-600">
                Open class <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="No classes yet"
          description="Create a class, share its code, and students can join in seconds. Then assign them a quiz with a deadline."
          actionLabel="Create your first class"
          onAction={() => setOpen(true)}
        />
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="New class" description="Students join with the class code you get after creating it.">
        <form
          className="space-y-4 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Input label="Class name" required value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Class 10-A Maths" />
          <Input label="Description (optional)" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create class</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
