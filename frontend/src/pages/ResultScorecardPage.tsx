import { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Trophy,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Users,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import api from '@/config/api';
import type { TournamentResult, PlayerResultSummary } from '@/types';

interface DetailedQuestionReview {
  questionIndex: number;
  text: string;
  type: string;
  options: Array<{ id: string; text: string }>;
  points: number;
  correctAnswers?: string[];
  explanation?: string;
  answers: Array<{
    userId: string;
    selectedOptions: string[];
    isCorrect: boolean;
    scoreAwarded: number;
    speedBonusAwarded: number;
    timeTakenSeconds: number;
  }>;
}

export function ResultScorecardPage() {
  const [searchParams] = useSearchParams();
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const targetId = routeId || searchParams.get('session');

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [players, setPlayers] = useState<PlayerResultSummary[]>([]);
  const [questions, setQuestions] = useState<DetailedQuestionReview[]>([]);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  useEffect(() => {
    if (!targetId) {
      toast.error('No tournament session or result specified');
      navigate('/dashboard');
      return;
    }

    const fetchResult = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/results/${targetId}`);
        setResult(data.data.result);
        setPlayers(data.data.playerResults || []);
        setQuestions(data.data.questionsReview || []);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load tournament scorecard');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [targetId, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Calculating verified scorecard...</p>
      </div>
    );
  }

  if (!result) return null;

  const rank = result.rank;
  const podiumStyles =
    rank === 1
      ? 'from-amber-400 via-amber-300 to-yellow-500 text-slate-900 border-amber-300 shadow-amber-500/20'
      : rank === 2
      ? 'from-slate-300 via-slate-200 to-slate-400 text-slate-900 border-slate-300'
      : rank === 3
      ? 'from-amber-700 via-amber-600 to-yellow-800 text-white border-amber-600'
      : 'from-brand-blue to-blue-600 text-white border-blue-500';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in-50 duration-200 pb-16">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/leaderboard?competitionId=${result.competitionId._id}`)}
          leftIcon={<Trophy className="w-4 h-4 text-amber-500" />}
        >
          View Tournament Leaderboard
        </Button>
      </div>

      {/* ── HEADER SCORECARD BANNER ─────────────────────────────────── */}
      <div className="glass rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning">{result.competitionId.category}</Badge>
              {result.isProvisional ? (
                <Badge variant="info">Provisional Rank</Badge>
              ) : (
                <Badge variant="success">Final Certified Rank</Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white">
              {result.competitionId.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500">
              Squad: <strong className="text-slate-900 dark:text-white">{result.teamId.name}</strong> • Completed in{' '}
              {result.totalDurationSeconds}s
            </p>
          </div>

          {/* Rank Badge / Trophy */}
          <div
            className={`flex flex-col items-center justify-center p-5 rounded-3xl bg-gradient-to-tr border shadow-lg min-w-[140px] text-center ${podiumStyles}`}
          >
            <Trophy className="w-8 h-8 mb-1 drop-shadow" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              Tournament Rank
            </span>
            <span className="text-3xl sm:text-4xl font-black font-display mt-0.5">
              #{rank}
            </span>
            {result.isProvisional && (
              <span className="text-[9px] font-semibold opacity-75 mt-0.5">
                (Subject to final matches)
              </span>
            )}
          </div>
        </div>

        {/* 4 Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center">
            <p className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Total Squad Score</p>
            <p className="text-2xl font-black font-display text-brand-blue mt-1">
              {result.totalScore}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center">
            <p className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Squad Accuracy</p>
            <p className="text-2xl font-black font-display text-emerald-500 mt-1">
              {Math.round(result.accuracy * 100)}%
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center">
            <p className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Correct Answers</p>
            <p className="text-2xl font-black font-display text-purple-500 mt-1">
              {result.correctCount}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center">
            <p className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Total Duration</p>
            <p className="text-2xl font-black font-display text-slate-700 dark:text-slate-200 mt-1">
              {result.totalDurationSeconds}s
            </p>
          </div>
        </div>
      </div>

      {/* ── SQUAD PLAYER BREAKDOWN ───────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-blue" />
          <span>Squad Member Performance</span>
        </h2>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Correct</TableHead>
              <TableHead>Accuracy</TableHead>
              <TableHead>Avg Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((p) => (
              <TableRow key={p.userId}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar src={p.avatar} name={p.name} size="sm" className="w-8 h-8 rounded-lg" />
                    <div>
                      <p className="font-semibold text-xs text-slate-900 dark:text-white">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400">Player ID: {p.userId.slice(-6)}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-bold text-sm text-brand-blue">
                  {p.playerScore} pts
                </TableCell>
                <TableCell className="text-xs">
                  {p.correctCount} / {p.correctCount + p.incorrectCount + p.unansweredCount}
                </TableCell>
                <TableCell>
                  <Badge variant={p.accuracy >= 0.75 ? 'success' : 'info'} size="sm">
                    {Math.round(p.accuracy * 100)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-mono text-slate-500">
                  {p.avgResponseTime}s
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── QUESTION-BY-QUESTION REVIEW ──────────────────────────────── */}
      {questions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-500" />
              <span>Question Review & Explanations</span>
            </h2>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {questions.length} Questions Evaluated
            </span>
          </div>

          <div className="space-y-3">
            {questions.map((q) => {
              const isOpen = expandedQuestion === q.questionIndex;

              return (
                <div
                  key={q.questionIndex}
                  className="glass rounded-2xl overflow-hidden transition-all shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedQuestion(isOpen ? null : q.questionIndex)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400">
                        Q{q.questionIndex}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-md sm:max-w-xl">
                        {q.text}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="default" size="sm">
                        {q.points} pts
                      </Badge>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-5 border-t border-slate-100 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-950/20 text-xs">
                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options.map((opt) => {
                          const isCorrect = q.correctAnswers?.includes(opt.id);

                          return (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-semibold'
                                  : 'glass border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {opt.id}
                              </span>
                              <span>{opt.text}</span>
                              {isCorrect && (
                                <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900 text-slate-700 dark:text-slate-300">
                          <p className="font-bold text-brand-blue mb-1 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Official Explanation
                          </p>
                          <p className="leading-relaxed">{q.explanation}</p>
                        </div>
                      )}

                      {/* Squad Submissions */}
                      <div className="pt-2">
                        <p className="font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Squad Submissions
                        </p>
                        <div className="space-y-1.5">
                          {q.answers.map((ans) => {
                            const playerObj = players.find((p) => p.userId === ans.userId);
                            return (
                              <div
                                key={ans.userId}
                                className="flex items-center justify-between p-2 rounded-lg glass"
                              >
                                <span className="font-medium text-slate-900 dark:text-white">
                                  {playerObj?.name || 'Player'}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-slate-600 dark:text-slate-400">
                                    Picked: [{ans.selectedOptions.join(', ')}]
                                  </span>
                                  {ans.isCorrect ? (
                                    <Badge variant="success" size="sm">
                                      +{ans.scoreAwarded} pts ({ans.timeTakenSeconds}s)
                                    </Badge>
                                  ) : (
                                    <Badge variant="error" size="sm">
                                      0 pts ({ans.timeTakenSeconds}s)
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
