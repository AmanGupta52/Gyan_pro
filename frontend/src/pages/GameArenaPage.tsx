import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Trophy,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGameSocket } from '@/hooks/useGameSocket';
import { CircularTimer } from '@/components/game/CircularTimer';
import { TeamStatusStrip } from '@/components/game/TeamStatusStrip';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';

export function GameArenaPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    sessionStatus,
    members,
    currentQuestionIndex,
    totalQuestions,
    currentQuestion,
    remainingSeconds,
    selectedOptions,
    isAnswerLocked,
    questionEndedData,
    finishedData,
    teamScore,
    submitAnswer,
  } = useGameSocket(sessionId);

  const [localSelections, setLocalSelections] = useState<string[]>([]);

  // Keep screen awake during live quiz tournament on native mobile devices
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      KeepAwake.keepAwake().catch(() => {});
    }
    return () => {
      if (Capacitor.isNativePlatform()) {
        KeepAwake.allowSleep().catch(() => {});
      }
    };
  }, []);

  // Reset local selections when a new question arrives
  useEffect(() => {
    setLocalSelections([]);
  }, [currentQuestionIndex]);

  // Handle option selection toggle
  const handleSelectOption = useCallback(
    (optionId: string) => {
      if (isAnswerLocked || sessionStatus !== 'question_active') return;

      if (currentQuestion?.type === 'multiple_correct') {
        // Multi-select toggle
        setLocalSelections((prev) =>
          prev.includes(optionId)
            ? prev.filter((id) => id !== optionId)
            : [...prev, optionId]
        );
      } else {
        // Single choice selection
        setLocalSelections([optionId]);
      }
    },
    [isAnswerLocked, sessionStatus, currentQuestion]
  );

  // Handle locking in the answer
  const handleLockAnswer = useCallback(() => {
    if (
      !currentQuestion ||
      localSelections.length === 0 ||
      isAnswerLocked ||
      sessionStatus !== 'question_active'
    ) {
      return;
    }
    submitAnswer(currentQuestion._id, localSelections);
  }, [currentQuestion, localSelections, isAnswerLocked, sessionStatus, submitAnswer]);

  // Keyboard shortcut listener (1-4, A-D, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnswerLocked || sessionStatus !== 'question_active' || !currentQuestion) return;

      const key = e.key.toUpperCase();
      const optionMap: Record<string, number> = {
        '1': 0,
        A: 0,
        '2': 1,
        B: 1,
        '3': 2,
        C: 2,
        '4': 3,
        D: 3,
      };

      if (key in optionMap) {
        const index = optionMap[key];
        if (currentQuestion.options[index]) {
          handleSelectOption(currentQuestion.options[index].id);
        }
      } else if (e.key === 'Enter') {
        handleLockAnswer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswerLocked, sessionStatus, currentQuestion, handleSelectOption, handleLockAnswer]);

  // Redirect to lobby if still waiting
  useEffect(() => {
    if (sessionStatus === 'waiting' && sessionId) {
      navigate(`/lobby/${sessionId}`);
    }
  }, [sessionStatus, sessionId, navigate]);

  // ─── FINAL SCREEN: TOURNAMENT FINISHED ─────────────────────────────
  if (sessionStatus === 'finished' && finishedData) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 text-center space-y-6 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-gradient-to-tr from-brand-gold to-amber-300 rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl shadow-amber-500/20">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <Badge variant="warning" size="md">
            Tournament Complete
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-slate-900 dark:text-white">
            Tournament Concluded!
          </h1>
          <p className="text-sm text-slate-500">
            Great performance! All questions have been evaluated server-side.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl">
            <p className="text-[10px] uppercase font-bold text-slate-400">Squad Score</p>
            <p className="text-2xl font-black font-display text-brand-blue mt-1">
              {finishedData.totalScore}
            </p>
          </Card>

          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl">
            <p className="text-[10px] uppercase font-bold text-slate-400">Accuracy</p>
            <p className="text-2xl font-black font-display text-emerald-500 mt-1">
              {Math.round(finishedData.accuracy * 100)}%
            </p>
          </Card>

          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl">
            <p className="text-[10px] uppercase font-bold text-slate-400">Correct Qs</p>
            <p className="text-2xl font-black font-display text-purple-500 mt-1">
              {finishedData.correctCount}
            </p>
          </Card>

          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl">
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Duration</p>
            <p className="text-2xl font-black font-display text-slate-700 dark:text-slate-200 mt-1">
              {finishedData.durationSeconds}s
            </p>
          </Card>
        </div>

        <div className="pt-4 flex justify-center gap-3">
          <Button
            size="lg"
            onClick={() => navigate('/dashboard')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ─── WAITING FOR QUESTION OR ENGINE ────────────────────────────────
  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading next tournament question...</p>
      </div>
    );
  }

  const isClosed = sessionStatus === 'question_closed' && questionEndedData !== null;
  const myAnswerSummary = questionEndedData?.playerAnswers.find((a) => a.userId === user?._id);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-200 pb-12">
      {/* ── TOP ARENA BAR: PROGRESS, SCORE, TIMER ───────────────────── */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-brand-blue font-bold">
            Q{currentQuestionIndex + 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <Badge variant="info" size="sm">
                {currentQuestion.points} pts
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 capitalize">
              {currentQuestion.type.replace('_', ' ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Squad Score</span>
            <p className="text-lg font-black font-display text-brand-blue">{teamScore}</p>
          </div>

          <CircularTimer
            totalSeconds={currentQuestion.timeLimit}
            remainingSeconds={remainingSeconds}
            size={68}
            strokeWidth={5}
          />
        </div>
      </div>

      {/* ── QUESTION CARD ───────────────────────────────────────────── */}
      <Card className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
        {/* Optional Question Image */}
        {currentQuestion.image && (
          <div className="rounded-2xl overflow-hidden max-h-72 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
            <img
              src={currentQuestion.image}
              alt="Question illustration"
              className="max-h-72 w-auto object-contain"
            />
          </div>
        )}

        {/* Question Text */}
        <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white leading-relaxed">
          {currentQuestion.text}
        </h2>

        {/* Option Tiles (A, B, C, D) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          {currentQuestion.options.map((opt, idx) => {
            const isSelected = isAnswerLocked
              ? selectedOptions.includes(opt.id)
              : localSelections.includes(opt.id);

            const isCorrect = isClosed && questionEndedData.correctAnswers.includes(opt.id);
            const isWrongSelection = isClosed && isSelected && !isCorrect;

            let tileClasses =
              'border-slate-200 dark:border-slate-800 hover:border-brand-blue/60 hover:bg-slate-50 dark:hover:bg-slate-800/50';

            if (isClosed) {
              if (isCorrect) {
                tileClasses = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20';
              } else if (isWrongSelection) {
                tileClasses = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
              }
            } else if (isSelected) {
              tileClasses = 'border-brand-blue bg-blue-50/70 dark:bg-blue-950/40 text-slate-900 dark:text-white ring-2 ring-brand-blue/30 shadow-sm';
            }

            return (
              <button
                key={opt.id}
                type="button"
                disabled={isAnswerLocked || isClosed}
                onClick={() => handleSelectOption(opt.id)}
                className={`flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all relative ${tileClasses}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                    isCorrect
                      ? 'bg-emerald-600 text-white'
                      : isWrongSelection
                      ? 'bg-rose-600 text-white'
                      : isSelected
                      ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {opt.id}
                </div>

                <span className="flex-1 text-sm font-medium leading-snug">
                  {opt.text}
                </span>

                <span className="text-[10px] font-mono text-slate-400 opacity-60">
                  [{idx + 1}]
                </span>

                {isCorrect && (
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 absolute right-3" />
                )}
                {isWrongSelection && (
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 absolute right-3" />
                )}
              </button>
            );
          })}
        </div>

        {/* Lock Answer Action Bar */}
        {!isClosed && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-400">
              {isAnswerLocked ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Your answer is submitted and locked. Awaiting teammates...
                </span>
              ) : (
                <span>
                  Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">1-4</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">A-D</kbd> to select, then click Lock In.
                </span>
              )}
            </div>

            <Button
              size="md"
              disabled={isAnswerLocked || localSelections.length === 0}
              onClick={handleLockAnswer}
              leftIcon={<Zap className="w-4 h-4 fill-current" />}
            >
              {isAnswerLocked ? 'Answer Locked' : 'Lock In Answer (Enter)'}
            </Button>
          </div>
        )}

        {/* ── QUESTION REVEAL ACCORDION / EXPLANATION ────────────────── */}
        {isClosed && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {myAnswerSummary?.isCorrect ? (
                  <Badge variant="success" size="md" className="gap-1 font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Correct! +{myAnswerSummary.scoreAwarded} pts
                  </Badge>
                ) : (
                  <Badge variant="error" size="md" className="gap-1 font-bold">
                    <XCircle className="w-3.5 h-3.5" />
                    Incorrect (0 pts)
                  </Badge>
                )}
                {myAnswerSummary?.speedBonusAwarded ? (
                  <Badge variant="warning" size="sm" className="font-bold">
                    ⚡ +{myAnswerSummary.speedBonusAwarded} Speed Bonus
                  </Badge>
                ) : null}
              </div>

              <span className="text-xs font-semibold text-slate-400">
                Next question preparing...
              </span>
            </div>

            {questionEndedData.explanation && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                  <HelpCircle className="w-3.5 h-3.5 text-brand-blue" />
                  Explanation
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {questionEndedData.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── TEAM REAL-TIME STATUS STRIP ─────────────────────────────── */}
      <TeamStatusStrip members={members} currentUserId={user?._id} />
    </div>
  );
}
