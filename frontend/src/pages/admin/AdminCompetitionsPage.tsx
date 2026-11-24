import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Plus,
  Play,
  CheckCircle,
  Archive,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import api from '@/config/api';

interface CompetitionRow {
  _id: string;
  name: string;
  category: string;
  status: 'Draft' | 'Registration Open' | 'Registration Closed' | 'Live' | 'Completed' | 'Archived';
  participationMode: 'individual' | 'team';
  allowedTeamSize: number;
  numberOfQuestions: number;
  timePerQuestionSeconds: number;
  startAt: string;
}

interface QuestionOptionItem {
  _id: string;
  text: string;
  difficulty: string;
  educationLevel: string;
}

export function AdminCompetitionsPage() {
  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Assign Questions Modal
  const [assignComp, setAssignComp] = useState<CompetitionRow | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<QuestionOptionItem[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name: '',
      description: '',
      category: 'Class 10',
      participationMode: 'team',
      allowedTeamSize: 4,
      numberOfQuestions: 20,
      timePerQuestionSeconds: 30,
      startAt: '',
      registrationDeadline: '',
    },
  });

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/competitions', {
        params: { status: 'all' },
      });
      setCompetitions(data.data || []);
    } catch (err: unknown) {
      toast.error('Failed to load competitions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const handleStatusTransition = async (competitionId: string, nextStatus: string) => {
    try {
      await api.patch(`/admin/competitions/${competitionId}/status`, {
        status: nextStatus,
      });
      toast.success(`Competition advanced to ${nextStatus}!`);
      fetchCompetitions();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Status transition failed.';
      toast.error(msg);
    }
  };

  const onCreateSubmit = async (formData: any) => {
    try {
      const start = new Date(formData.startAt);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const deadline = new Date(formData.registrationDeadline);

      await api.post('/admin/competitions', {
        ...formData,
        allowedTeamSize: Number(formData.allowedTeamSize),
        numberOfQuestions: Number(formData.numberOfQuestions),
        timePerQuestionSeconds: Number(formData.timePerQuestionSeconds),
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        registrationDeadline: deadline.toISOString(),
        scoringConfig: {
          basePoints: 100,
          speedBonusMax: 50,
          penaltyWrong: 0,
        },
      });

      toast.success('Competition created in Draft status!');
      setIsCreateOpen(false);
      reset();
      fetchCompetitions();
    } catch (err: unknown) {
      toast.error('Failed to create competition');
    }
  };

  const openAssignModal = async (comp: CompetitionRow) => {
    setAssignComp(comp);
    try {
      const [bankRes, assignedRes] = await Promise.all([
        api.get('/questions', { params: { educationLevel: comp.category, limit: 100 } }),
        api.get(`/admin/competitions/${comp._id}/questions`),
      ]);
      setAvailableQuestions(bankRes.data.data || []);
      const assignedIds = (assignedRes.data.data || []).map((q: any) => q.questionId?._id || q.questionId);
      setSelectedQuestionIds(assignedIds);
    } catch (err: unknown) {
      toast.error('Failed to load questions for assignment');
    }
  };

  const handleAssignSubmit = async () => {
    if (!assignComp) return;
    try {
      setAssigning(true);
      await api.post(`/admin/competitions/${assignComp._id}/questions`, {
        questionIds: selectedQuestionIds,
      });
      toast.success(`Attached ${selectedQuestionIds.length} questions to competition!`);
      setAssignComp(null);
      fetchCompetitions();
    } catch (err: unknown) {
      toast.error('Failed to attach questions');
    } finally {
      setAssigning(false);
    }
  };

  const toggleQuestionSelection = (qId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white">
            Competition Lifecycle
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create competitions, transition tournament statuses, and link question batches.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          size="md"
        >
          Create Competition
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Championship</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Questions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                Loading competitions...
              </TableCell>
            </TableRow>
          ) : competitions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                No competitions found. Create one above!
              </TableCell>
            </TableRow>
          ) : (
            competitions.map((comp) => (
            <TableRow key={comp._id}>
              <TableCell className="font-semibold text-slate-900 dark:text-white">
                {comp.name}
              </TableCell>
              <TableCell>
                <Badge variant="info">{comp.category}</Badge>
              </TableCell>
              <TableCell className="text-xs">
                {comp.participationMode === 'individual'
                  ? 'Solo'
                  : `Squad of ${comp.allowedTeamSize}`}
              </TableCell>
              <TableCell className="text-xs">
                {comp.numberOfQuestions} Qs ({comp.timePerQuestionSeconds}s each)
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    comp.status === 'Live'
                      ? 'success'
                      : comp.status === 'Registration Open'
                      ? 'warning'
                      : comp.status === 'Completed'
                      ? 'info'
                      : 'default'
                  }
                >
                  {comp.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Status transition controls */}
                  {comp.status === 'Draft' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatusTransition(comp._id, 'Registration Open')}
                    >
                      Open Registration
                    </Button>
                  )}
                  {comp.status === 'Registration Open' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatusTransition(comp._id, 'Registration Closed')}
                    >
                      Close Registration
                    </Button>
                  )}
                  {comp.status === 'Registration Closed' && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleStatusTransition(comp._id, 'Live')}
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                    >
                      Start Match Live
                    </Button>
                  )}
                  {comp.status === 'Live' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatusTransition(comp._id, 'Completed')}
                      leftIcon={<CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                    >
                      Finish Match
                    </Button>
                  )}
                  {comp.status === 'Completed' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStatusTransition(comp._id, 'Archived')}
                      leftIcon={<Archive className="w-3.5 h-3.5" />}
                    >
                      Archive
                    </Button>
                  )}

                  {/* Assign Questions */}
                  {['Draft', 'Registration Open', 'Registration Closed'].includes(comp.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openAssignModal(comp)}
                      leftIcon={<Layers className="w-3.5 h-3.5 text-brand-blue" />}
                    >
                      Questions
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )))}
        </TableBody>
      </Table>

      {/* ── CREATE COMPETITION MODAL ─────────────────────────────── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Competition Track"
        description="Configure championship parameters and eligibility rules."
      >
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4 pt-2">
          <Input
            label="Championship Name"
            placeholder="e.g. All-India Physics Olympiad 2026"
            required
            {...register('name', { required: true })}
          />

          <Input
            label="Description"
            placeholder="Brief overview of the competition topics..."
            required
            {...register('description', { required: true })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Education Category" {...register('category')}>
              <option value="Junior KG">Junior KG</option>
              <option value="Senior KG">Senior KG</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={`Class ${i + 1}`}>
                  Class {i + 1}
                </option>
              ))}
              <option value="Undergraduate">Undergraduate</option>
              <option value="Postgraduate">Postgraduate</option>
              <option value="PhD">PhD</option>
            </Select>

            <Select label="Participation Mode" {...register('participationMode')}>
              <option value="team">Team Match</option>
              <option value="individual">Individual Solo</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label="Allowed Squad Size" {...register('allowedTeamSize')}>
              <option value={1}>1 Player (Solo)</option>
              <option value={2}>2 Players (Duo)</option>
              <option value={4}>4 Players (Standard)</option>
              <option value={6}>6 Players (Mega Squad)</option>
            </Select>

            <Input
              label="No. of Questions"
              type="number"
              defaultValue={20}
              {...register('numberOfQuestions')}
            />

            <Input
              label="Time per Q (s)"
              type="number"
              defaultValue={30}
              {...register('timePerQuestionSeconds')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Start Date & Time (IST)"
              type="datetime-local"
              required
              {...register('startAt', { required: true })}
            />
            <Input
              label="Registration Deadline (IST)"
              type="datetime-local"
              required
              {...register('registrationDeadline', { required: true })}
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create Draft
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── ASSIGN QUESTIONS MODAL ───────────────────────────────── */}
      {assignComp && (
        <Modal
          isOpen={!!assignComp}
          onClose={() => setAssignComp(null)}
          title={`Assign Questions to ${assignComp.name}`}
          description={`Selected ${selectedQuestionIds.length} questions from ${assignComp.category} bank.`}
        >
          <div className="space-y-4 pt-2">
            <div className="max-h-80 overflow-y-auto space-y-2 divide-y divide-slate-100 dark:divide-slate-800">
              {availableQuestions.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  No questions found in question bank for {assignComp.category}. Please add questions to the bank first.
                </p>
              ) : (
                availableQuestions.map((q) => {
                  const isSelected = selectedQuestionIds.includes(q._id);
                  return (
                    <div
                      key={q._id}
                      onClick={() => toggleQuestionSelection(q._id)}
                      className={`pt-2.5 pb-2.5 flex items-center justify-between gap-3 px-3 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 text-brand-blue'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex-1 truncate">
                        <p className="text-xs font-semibold truncate">{q.text}</p>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {q.difficulty}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                      />
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setAssignComp(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignSubmit}
                loading={assigning}
              >
                Save Question Batch
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
