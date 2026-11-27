import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useAuth } from '@/hooks/useAuth';
import api from '@/config/api';

interface QuestionItem {
  _id: string;
  text: string;
  type: string;
  difficulty: string;
  educationLevel: string;
  points: number;
  timeLimit: number;
  status: string;
  correctAnswers?: string[];
  createdBy?: string;
  options: Array<{ id: string; text: string }>;
  subjectId?: { name: string; code: string };
}

interface SubjectOption {
  _id: string;
  name: string;
  code: string;
}

export function AdminQuestionsPage() {
  const { user } = useAuth();
  const isModerator = user?.role === 'admin' || user?.role === 'superAdmin';
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [onlyMine, setOnlyMine] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form
  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: {
      text: '',
      type: 'single_choice',
      difficulty: 'medium',
      educationLevel: 'Class 10',
      subjectId: '',
      status: 'published',
      points: 100,
      timeLimit: 30,
      explanation: '',
      options: [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ],
      correctAnswers: ['A'],
    },
  });

  const selectedType = watch('type');
  const correctAnswers = watch('correctAnswers') || [];

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/questions', {
        params: {
          educationLevel: filterLevel !== 'all' ? filterLevel : undefined,
          difficulty: filterDifficulty !== 'all' ? filterDifficulty : undefined,
          type: filterType !== 'all' ? filterType : undefined,
          mine: onlyMine ? 'true' : undefined,
          limit: 50,
        },
      });
      setQuestions(data.data || []);
    } catch (err: unknown) {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [filterLevel, filterDifficulty, filterType, onlyMine]);

  // Subjects are required by the API; the form had no way to pick one before
  useEffect(() => {
    api
      .get('/categories/subjects')
      .then(({ data }) => setSubjects(data.data || []))
      .catch(() => toast.error('Could not load subjects'));
  }, []);

  const onCreateQuestionSubmit = async (formData: any) => {
    try {
      await api.post('/questions', {
        ...formData,
        points: Number(formData.points),
        timeLimit: Number(formData.timeLimit),
      });

      toast.success('Question added to Question Bank!');
      setIsCreateOpen(false);
      reset();
      fetchQuestions();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Failed to create question.';
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.delete(`/questions/${id}`);
      toast.success('Question removed.');
      fetchQuestions();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Cannot delete question.';
      toast.error(msg);
    }
  };

  const toggleCorrectAnswer = (optionId: string) => {
    if (selectedType === 'single_choice' || selectedType === 'true_false') {
      setValue('correctAnswers', [optionId]);
    } else {
      if (correctAnswers.includes(optionId)) {
        setValue(
          'correctAnswers',
          correctAnswers.filter((a) => a !== optionId)
        );
      } else {
        setValue('correctAnswers', [...correctAnswers, optionId]);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white">
            Question Bank
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Curate quiz questions across difficulty tiers and educational categories. Teachers see their own questions plus the shared bank.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          size="md"
        >
          Add New Question
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-44">
          <Select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
          >
            <option value="all">All Categories</option>
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
        </div>

        <div className="w-40">
          <Select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="expert">Expert</option>
          </Select>
        </div>

        <div className="w-44">
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Question Types</option>
            <option value="single_choice">Single Choice</option>
            <option value="multiple_correct">Multiple Correct</option>
            <option value="true_false">True / False</option>
            <option value="image_question">Image Question</option>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Only my questions
        </label>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Question</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Difficulty</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Correct Answer</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-600 dark:text-slate-400">
                Loading question bank...
              </TableCell>
            </TableRow>
          ) : questions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-600 dark:text-slate-400">
                No questions found. Click "Add Question" to curate questions.
              </TableCell>
            </TableRow>
          ) : (
            questions.map((q) => (
            <TableRow key={q._id}>
              <TableCell className="max-w-xs truncate font-medium text-slate-900 dark:text-white">
                {q.text}
              </TableCell>
              <TableCell>
                <Badge variant="info" size="sm">
                  {q.educationLevel}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    q.difficulty === 'easy'
                      ? 'success'
                      : q.difficulty === 'medium'
                      ? 'info'
                      : q.difficulty === 'hard'
                      ? 'warning'
                      : 'default'
                  }
                  size="sm"
                  className="capitalize"
                >
                  {q.difficulty}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-slate-500 capitalize">
                {q.type.replace('_', ' ')}
              </TableCell>
              <TableCell className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {q.correctAnswers?.join(', ') || 'Protected'}
              </TableCell>
              <TableCell>
                {(isModerator || q.createdBy === user?._id) ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(q._id)}
                    className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5"
                    aria-label="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                ) : (
                  <span className="text-[11px] text-slate-500">Shared</span>
                )}
              </TableCell>
            </TableRow>
          )))}
        </TableBody>
      </Table>

      {/* ── CREATE QUESTION MODAL ────────────────────────────────── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Question to Bank"
        description="Craft questions with answers, points, and timers."
      >
        <form onSubmit={handleSubmit(onCreateQuestionSubmit)} className="space-y-4 pt-2">
          <Input
            label="Question Text"
            placeholder="e.g. Which planetary body has the highest surface temperature?"
            required
            {...register('text', { required: true, minLength: 3 })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Subject" required {...register('subjectId', { required: true })}>
              <option value="">Select subject…</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </Select>

            <Select label="Visibility" {...register('status')}>
              <option value="published">Published (usable everywhere)</option>
              <option value="draft">Draft (only in my quizzes)</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label="Question Type" {...register('type')}>
              <option value="single_choice">Single Choice</option>
              <option value="multiple_correct">Multiple Correct</option>
              <option value="true_false">True / False</option>
              <option value="image_question">Image Question</option>
            </Select>

            <Select label="Category" {...register('educationLevel')}>
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

            <Select label="Difficulty" {...register('difficulty')}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </Select>
          </div>

          {/* Options Section */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Options & Correct Answer Selection (Click letter to toggle correct)
            </label>

            {['A', 'B', 'C', 'D'].map((optId, idx) => {
              const isCorrect = correctAnswers.includes(optId);

              return (
                <div key={optId} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCorrectAnswer(optId)}
                    className={`w-8 h-9 rounded-xl font-bold text-xs flex items-center justify-center border transition-all ${
                      isCorrect
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                    title="Toggle correct answer"
                  >
                    {optId}
                  </button>
                  <input
                    type="text"
                    placeholder={`Option ${optId} text...`}
                    required
                    {...register(`options.${idx}.text` as any, { required: true })}
                    className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 glass text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Points"
              type="number"
              defaultValue={100}
              {...register('points')}
            />
            <Input
              label="Time Limit (Seconds)"
              type="number"
              defaultValue={30}
              {...register('timeLimit')}
            />
          </div>

          <Input
            label="Post-Question Explanation"
            placeholder="Explains why this answer is correct after the timer expires..."
            {...register('explanation')}
          />

          <div className="pt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save Question
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
