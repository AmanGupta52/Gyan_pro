import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle2, Flag, Lightbulb, XCircle } from 'lucide-react';
import api from '@/config/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { CircularTimer } from '@/components/game/CircularTimer';
import { cn } from '@/lib/utils';
import { apiError } from '@/lib/quiz';
import type { SoloAnswerResponse, SoloState } from '@/types';

type Phase = 'answering' | 'submitting' | 'feedback';

export function SoloPlayPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<SoloState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>('answering');
  const [feedback, setFeedback] = useState<SoloAnswerResponse | null>(null);
  const [remaining, setRemaining] = useState(0);

  // Server clock offset so a wrong device clock can't change the countdown
  const offsetRef = useRef(0);
  const deadlineRef = useRef(0);
  const timeUpFiredRef = useRef(false);
  const selectedRef = useRef<string[]>([]);
  selectedRef.current = selected;

  const goToResult = useCallback(() => navigate(`/solo/${attemptId}/result`, { replace: true }), [navigate, attemptId]);

  const loadState = useCallback(async () => {
    try {
      const { data } = await api.get(`/solo/attempts/${attemptId}`);
      const next = data.data as SoloState;
      if (next.status === 'finished' || !next.current) {
        goToResult();
        return;
      }
      offsetRef.current = new Date(next.serverNow).getTime() - Date.now();
      deadlineRef.current = new Date(next.current.deadline).getTime();
      timeUpFiredRef.current = false;
      setState(next);
      setSelected([]);
      setFeedback(null);
      setPhase('answering');
      setLoadError(null);
    } catch (err) {
      setLoadError(apiError(err, 'Could not load this quiz.'));
    }
  }, [attemptId, goToResult]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const questionId = state?.current?.question._id;

  const submit = useCallback(
    async (picked: string[]) => {
      if (!questionId) return;
      setPhase('submitting');
      try {
        const { data } = await api.post(`/solo/attempts/${attemptId}/answer`, {
          questionId,
          selectedOptions: picked,
        });
        const res = data.data as SoloAnswerResponse;
        if (res.feedback) {
          setFeedback(res);
          setPhase('feedback');
        } else if (res.finished) {
          goToResult();
        } else {
          await loadState();
        }
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 409 || status === 400) {
          // Time ran out on the server or the question moved on - just resync
          toast.info('Time was up for that question.');
          await loadState();
        } else {
          toast.error(apiError(err, 'Could not save your answer. Check your connection.'));
          setPhase('answering');
        }
      }
    },
    [attemptId, questionId, goToResult, loadState]
  );

  // Countdown. When it reaches zero we submit whatever is selected (possibly nothing).
  useEffect(() => {
    if (!state?.current || phase !== 'answering') return;
    const tick = () => {
      const msLeft = deadlineRef.current - (Date.now() + offsetRef.current);
      const secs = Math.max(0, Math.ceil(msLeft / 1000));
      setRemaining(secs);
      if (msLeft <= 0 && !timeUpFiredRef.current) {
        timeUpFiredRef.current = true;
        submit(selectedRef.current);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [state, phase, submit]);

  const toggle = (optionId: string) => {
    if (phase !== 'answering' || !state?.current) return;
    const multi = state.current.question.type === 'multiple_correct';
    setSelected((prev) =>
      multi ? (prev.includes(optionId) ? prev.filter((x) => x !== optionId) : [...prev, optionId]) : [optionId]
    );
  };

  const finishEarly = async () => {
    if (!window.confirm('Finish now? Questions you have not answered will count as skipped.')) return;
    try {
      await api.post(`/solo/attempts/${attemptId}/finish`);
      goToResult();
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <EmptyState icon={Flag} title="We could not open this quiz" description={loadError} />
        <Link to="/quizzes" className="inline-flex text-sm font-semibold text-electric-600 dark:text-sky-200">
          ← Back to quizzes
        </Link>
      </div>
    );
  }

  if (!state?.current) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton variant="rectangular" height={80} />
        <Skeleton variant="rectangular" height={300} />
      </div>
    );
  }

  const { question, index } = state.current;
  const isMulti = question.type === 'multiple_correct';
  const inFeedback = phase === 'feedback' && feedback?.feedback;
  const progress = Math.round((state.answered / state.total) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{state.title}</p>
            <p className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
              Question {index + 1} <span className="text-slate-500">of {state.total}</span>
            </p>
          </div>
          <CircularTimer totalSeconds={question.timeLimit} remainingSeconds={remaining} size={64} strokeWidth={6} />
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Quiz progress"
          className="h-2 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10"
        >
          <div className="h-full rounded-full bg-electric-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Card className="space-y-5 p-5 sm:p-7">
        <div>
          <h1 className="font-display text-xl font-bold leading-snug text-slate-900 dark:text-white sm:text-2xl">{question.text}</h1>
          {isMulti && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Select all that apply.</p>}
        </div>
        {question.image && (
          <img src={question.image} alt="" className="max-h-64 w-full rounded-2xl object-contain" />
        )}

        <div className="space-y-3" role={isMulti ? 'group' : 'radiogroup'} aria-label="Answer options">
          {question.options.map((opt, i) => {
            const isSelected = selected.includes(opt.id);
            const correct = inFeedback ? feedback!.feedback!.correctAnswers.includes(opt.id) : false;
            const wrongPick = inFeedback && isSelected && !correct;
            return (
              <button
                key={opt.id}
                type="button"
                role={isMulti ? 'checkbox' : 'radio'}
                aria-checked={isSelected}
                disabled={phase !== 'answering'}
                onClick={() => toggle(opt.id)}
                className={cn(
                  'flex min-h-[56px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-base font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-500',
                  !inFeedback && !isSelected && 'border-slate-200 bg-white/60 text-slate-800 hover:border-electric-400 dark:border-slate-700 dark:bg-white/5 dark:text-slate-100',
                  !inFeedback && isSelected && 'border-electric-500 bg-electric-500/10 text-slate-900 dark:text-white',
                  inFeedback && correct && 'border-emerald-500 bg-emerald-500/10 text-slate-900 dark:text-white',
                  wrongPick && 'border-rose-500 bg-rose-500/10 text-slate-900 dark:text-white',
                  inFeedback && !correct && !wrongPick && 'border-slate-200 opacity-60 dark:border-slate-700'
                )}
              >
                <span
                  className={cn(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold',
                    isSelected ? 'bg-electric-500 text-white' : 'bg-slate-900/10 text-slate-700 dark:bg-white/10 dark:text-slate-200',
                    inFeedback && correct && 'bg-emerald-500 text-white',
                    wrongPick && 'bg-rose-500 text-white'
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt.text}</span>
                {inFeedback && correct && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Correct answer" />}
                {wrongPick && <XCircle className="h-5 w-5 shrink-0 text-rose-600" aria-label="Your answer was wrong" />}
              </button>
            );
          })}
        </div>

        {inFeedback ? (
          <div className="space-y-4" aria-live="polite">
            <div
              className={cn(
                'rounded-2xl px-4 py-3 text-sm font-semibold',
                feedback!.feedback!.isCorrect
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-500/15 text-rose-800 dark:text-rose-300'
              )}
            >
              {feedback!.feedback!.isCorrect
                ? `Correct! +${feedback!.feedback!.scoreAwarded} points`
                : feedback!.feedback!.scoreAwarded < 0
                ? `Not quite. ${feedback!.feedback!.scoreAwarded} points`
                : selected.length === 0
                ? 'Time ran out on this one.'
                : 'Not quite — see the right answer above.'}
            </div>
            {feedback!.feedback!.explanation && (
              <p className="flex gap-2 text-sm text-slate-700 dark:text-slate-200">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                {feedback!.feedback!.explanation}
              </p>
            )}
            <Button
              size="lg"
              fullWidth
              rightIcon={<ArrowRight className="h-5 w-5" />}
              onClick={() => (feedback!.finished ? goToResult() : loadState())}
              autoFocus
            >
              {feedback!.finished ? 'See my results' : 'Next question'}
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            fullWidth
            loading={phase === 'submitting'}
            disabled={selected.length === 0}
            onClick={() => {
              timeUpFiredRef.current = true;
              submit(selected);
            }}
          >
            Lock in answer
          </Button>
        )}
      </Card>

      <div className="text-center">
        <button type="button" onClick={finishEarly} className="text-sm font-semibold text-slate-600 underline-offset-4 hover:underline dark:text-slate-300">
          Finish early
        </button>
      </div>
    </div>
  );
}
