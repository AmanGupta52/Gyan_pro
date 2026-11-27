import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, GraduationCap, Mail, Plus, UserCheck, UserX } from 'lucide-react';
import api from '@/config/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { apiError, copyText } from '@/lib/quiz';
import type { TeacherRow } from '@/types';

interface CreateResult {
  teacher: { name: string; email: string };
  emailSent: boolean;
  setupLink?: string;
}

const EMPTY = { name: '', email: '', phone: '', institution: '' };

export function AdminTeachersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [created, setCreated] = useState<CreateResult | null>(null);

  const { data: teachers, isLoading } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: async () => (await api.get('/admin/teachers')).data.data as TeacherRow[],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-teachers'] });

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post('/admin/teachers', {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          institution: form.institution.trim() || undefined,
        })
      ).data.data as CreateResult,
    onSuccess: (res) => {
      setCreated(res);
      setForm(EMPTY);
      refresh();
    },
    onError: (e) => toast.error(apiError(e, 'Could not add the teacher.')),
  });

  const resend = useMutation({
    mutationFn: async (id: string) => (await api.post(`/admin/teachers/${id}/resend-invite`)).data.data as { setupLink?: string },
    onSuccess: (res) => {
      toast.success('Invite sent again');
      if (res.setupLink) console.info('Dev setup link:', res.setupLink);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const toggleActive = useMutation({
    mutationFn: async (t: TeacherRow) => api.patch(`/admin/users/${t._id}/status`, { isActive: !t.isActive }),
    onSuccess: (_d, t) => {
      toast.success(t.isActive ? 'Teacher disabled' : 'Teacher enabled');
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const close = () => {
    setOpen(false);
    setCreated(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">Teachers</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Teachers create their own questions and quizzes for students and see the results. Only a super admin can add them.
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Add teacher</Button>
      </div>

      {isLoading ? (
        <Skeleton variant="rectangular" height={200} />
      ) : teachers && teachers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher</TableHead>
              <TableHead>Institution</TableHead>
              <TableHead>Quizzes</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((t) => (
              <TableRow key={t._id}>
                <TableCell>
                  <p className="font-semibold text-slate-900 dark:text-white">{t.name}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{t.email}</p>
                </TableCell>
                <TableCell className="text-xs">{t.institution || '—'}</TableCell>
                <TableCell className="text-xs">{t.publishedQuizCount} live · {t.quizCount} total</TableCell>
                <TableCell className="text-xs">
                  {t.lastLoginAt ? new Date(t.lastLoginAt).toLocaleDateString() : <Badge variant="warning" size="sm">Invite pending</Badge>}
                </TableCell>
                <TableCell>
                  <Badge variant={t.isActive ? 'success' : 'error'} size="sm">{t.isActive ? 'Active' : 'Disabled'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {!t.lastLoginAt && (
                      <Button size="sm" variant="secondary" leftIcon={<Mail className="h-3.5 w-3.5" />} loading={resend.isPending && resend.variables === t._id} onClick={() => resend.mutate(t._id)}>
                        Resend
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className={t.isActive ? 'text-rose-600' : 'text-emerald-600'}
                      aria-label={t.isActive ? `Disable ${t.name}` : `Enable ${t.name}`}
                      onClick={() => toggleActive.mutate(t)}
                    >
                      {t.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="No teachers yet"
          description="Add a teacher and they get an email to set their password and start building quizzes."
          actionLabel="Add your first teacher"
          onAction={() => setOpen(true)}
        />
      )}

      <Modal isOpen={open} onClose={close} title={created ? 'Teacher added' : 'Add a teacher'} description={created ? undefined : 'They will get an email with a link to set their own password.'}>
        {created ? (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {created.emailSent ? (
                <>An invite was sent to <strong>{created.teacher.email}</strong>. The link works for 48 hours.</>
              ) : (
                <>The account for <strong>{created.teacher.name}</strong> was created, but the email could not be sent. Use “Resend” on the list in a moment.</>
              )}
            </p>
            {created.setupLink && (
              <div className="space-y-2 rounded-2xl bg-amber-400/15 p-3 text-xs text-slate-800 dark:text-slate-100">
                <p className="font-semibold">Development only: setup link</p>
                <p className="break-all font-mono">{created.setupLink}</p>
                <Button size="sm" variant="secondary" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={async () => ((await copyText(created.setupLink!)) ? toast.success('Link copied') : toast.error('Could not copy'))}>
                  Copy link
                </Button>
              </div>
            )}
            <div className="flex justify-end"><Button onClick={close}>Done</Button></div>
          </div>
        ) : (
          <form
            className="space-y-4 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Phone (optional)" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label="School / institution (optional)" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
              <Button type="submit" loading={create.isPending}>Send invite</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
