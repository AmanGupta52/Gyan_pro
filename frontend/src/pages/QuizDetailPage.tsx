import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, CalendarClock, Clock, Eye, Medal, Play, RotateCcw, Target, Trophy } from 'lucide-react';
import api from '@/config/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SHOW_ANSWERS_LABEL, apiError, formatDuration, percent } from '@/lib/quiz';
import type { Quiz, QuizLeaderboardRow } from '@/types';

/** Handles both /quizzes/:id (public catalogue) and /quizzes/join/:code (private quiz). */
export function QuizDetailPage() {
  const { id, code } = useParams<{ id?: string; code?: string }>();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const { data: quiz, isLoading, isError, error } = useQuery({
    queryKey: ['quiz', id ?? `code:${code}`],
    queryFn: async () => {
      const url = code ? `/quizzes/join/${encodeURIComponent(code)}` : `/quizzes/${id}`;
      return (await api.get(url)).data.data as Quiz;
    },
    retry: false,
  });

  const showBoard = !!quiz && (quiz.visibility === 'public' || quiz.canManage);
  const { data: board } = useQuery({
    queryKey: ['quiz-board', quiz?._id],
    enabled: showBoard,
    queryFn: async () => (await api.get(`/quizzes/${quiz!._id}/leaderboard`)).data.data as QuizLeaderboardRow[],
  });

  const start = async () => {
    if (!quiz) return;
    try {
      setStarting(true);
      const { data } = await api.post('/solo/start', { quizId: quiz._id, joinCode: code });
      navigate(`/solo/${data.data.attemptId}`);
    } catch (err) {
      toast.error(apiError(err, 'Could not start this quiz.'));
    } finally {
      setStarting(false);
    }
  };

  if (isLoading) return <Skeleton variant="rectangular" height={320} />;

  if (isError || !quiz) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <EmptyState
          icon={BookOpen}
          title="Quiz not found"
          description={apiError(error, 'This quiz may be private, closed or removed.')}
        />
        <Link to="/quizzes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-electric-600 dark:text-sky-200">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to quizzes
        </Link>
      </div>
    );
  }

  const attemptsLeft = quiz.maxAttempts > 0 ? Math.max(0, quiz.maxAttempts - (quiz.my?.attempts ?? 0)) : null;
  const resumeId = quiz.my?.inProgressAttemptId;
  const outOfAttempts = attemptsLeft === 0 && !resumeId && !quiz.canManage;
  const facts = [
    { icon: BookOpen, label: `${quiz.questionCount} questions` },
    { icon: Clock, label: quiz.timePerQuestionSeconds ? `${quiz.timePerQuestionSeconds}s per question` : 'Timer set per question' },
    { icon: Target, label: `Pass mark ${quiz.passPercent}%` },
    { icon: Eye, label: SHOW_ANSWERS_LABEL[quiz.showAnswers] },
    { icon: RotateCcw, label: quiz.maxAttempts > 0 ? `${quiz.maxAttempts} attempt${quiz.maxAttempts > 1 ? 's' : ''} allowed` : 'Unlimited attempts' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/quizzes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All quizzes
      </Link>

      <Card className="space-y-5 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="info">{quiz.category}</Badge>
          {quiz.subject && <Badge>{quiz.subject.name}</Badge>}
          {quiz.status !== 'published' && <Badge variant="warning">Preview · {quiz.status}</Badge>}
          {quiz.visibility === 'unlisted' && <Badge>Private</Badge>}
        </div>
        <div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{quiz.title}</h1>
          {quiz.createdBy?.name && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Created by {quiz.createdBy.name}</p>}
        </div>
        {quiz.description && <p className="text-slate-700 dark:text-slate-200">{quiz.description}</p>}

        <ul className="grid gap-2 sm:grid-cols-2">
          {facts.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <Icon className="h-4 w-4 shrink-0 text-electric-600 dark:text-sky-200" aria-hidden /> {label}
            </li>
          ))}
          {quiz.endAt && (
            <li className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <CalendarClock className="h-4 w-4 shrink-0 text-electric-600 dark:text-sky-200" aria-hidden />
              Closes {new Date(quiz.endAt).toLocaleString()}
            </li>
          )}
        </ul>

        {quiz.my && quiz.my.attempts > 0 && (
          <p className="rounded-2xl bg-electric-500/10 px-4 py-3 text-sm text-slate-800 dark:text-slate-100">
            You have played this {quiz.my.attempts} time{quiz.my.attempts > 1 ? 's' : ''}. Best score <strong>{quiz.my.bestScore ?? 0}</strong>
            {quiz.my.bestAccuracy != null && <> · best accuracy <strong>{percent(quiz.my.bestAccuracy)}</strong></>}.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {resumeId ? (
            <Button size="lg" leftIcon={<Play className="h-5 w-5" />} onClick={() => navigate(`/solo/${resumeId}`)}>
              Resume quiz
            </Button>
          ) : (
            <Button size="lg" loading={starting} disabled={outOfAttempts} leftIcon={<Play className="h-5 w-5" />} onClick={start}>
              {quiz.my?.attempts ? 'Play again' : 'Start quiz'}
            </Button>
          )}
          {attemptsLeft !== null && !resumeId && (
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {attemptsLeft > 0 ? `${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} left` : 'No attempts left'}
            </span>
          )}
        </div>
      </Card>

      {showBoard && (
        <Card className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-slate-900 dark:text-white">
            <Trophy className="h-5 w-5 text-amber-500" aria-hidden /> Top scores
          </h2>
          {board && board.length > 0 ? (
            <ol className="space-y-2">
              {board.slice(0, 10).map((row) => (
                <li key={row.userId} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900/[0.03] px-4 py-2.5 dark:bg-white/5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-electric-500/15 text-sm font-bold text-electric-700 dark:text-sky-200">
                      {row.rank <= 3 ? <Medal className="h-4 w-4" aria-label={`Rank ${row.rank}`} /> : row.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{row.name}</p>
                      {row.institution && <p className="truncate text-xs text-slate-600 dark:text-slate-300">{row.institution}</p>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display font-extrabold text-slate-900 dark:text-white">{row.totalScore}</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">{percent(row.accuracy)} · {formatDuration(row.durationSeconds)}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">Nobody has finished this quiz yet. Be the first on the board!</p>
          )}
        </Card>
      )}
    </div>
  );
}
