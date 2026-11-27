import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Dumbbell, Play } from 'lucide-react';
import api from '@/config/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { EDUCATION_LEVELS, apiError } from '@/lib/quiz';
import type { SubjectRef } from '@/types';

export function PracticeSetupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [level, setLevel] = useState(user?.educationLevel || 'Class 10');
  const [subjectId, setSubjectId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [count, setCount] = useState(10);
  const [seconds, setSeconds] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (user?.educationLevel) setLevel(user.educationLevel);
  }, [user?.educationLevel]);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => (await api.get('/categories/subjects')).data.data as SubjectRef[],
  });

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStarting(true);
      const { data } = await api.post('/solo/start', {
        mode: 'practice',
        educationLevel: level,
        subjectId: subjectId || undefined,
        difficulty: difficulty || undefined,
        count,
        timePerQuestionSeconds: seconds ? Number(seconds) : undefined,
      });
      navigate(`/solo/${data.data.attemptId}`);
    } catch (err) {
      toast.error(apiError(err, 'Could not start practice.'));
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link to="/quizzes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Quizzes
      </Link>

      <Card className="space-y-6 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            <Dumbbell className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">Practice mode</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">Pick what you want to work on. You see the answer after every question.</p>
          </div>
        </div>

        <form onSubmit={start} className="space-y-4">
          <Select label="Level" value={level} onChange={(e) => setLevel(e.target.value)}>
            {EDUCATION_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </Select>
          <Select label="Subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Any subject</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="">Mixed</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </Select>
            <Select label="Questions" value={String(count)} onChange={(e) => setCount(Number(e.target.value))}>
              {[5, 10, 15, 20, 30].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
            <Select label="Time each" value={seconds} onChange={(e) => setSeconds(e.target.value)}>
              <option value="">Default</option>
              {[15, 30, 45, 60, 120].map((n) => (
                <option key={n} value={n}>{n} seconds</option>
              ))}
            </Select>
          </div>
          <Button type="submit" size="lg" fullWidth loading={starting} leftIcon={<Play className="h-5 w-5" />}>
            Start practice
          </Button>
        </form>
      </Card>
    </div>
  );
}
