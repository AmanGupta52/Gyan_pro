import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Trophy,
  Users,
  Clock,
  ShieldCheck,
  CheckCircle,
  Play,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGameSocket } from '@/hooks/useGameSocket';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import api from '@/config/api';

interface SessionData {
  session: {
    _id: string;
    status: string;
    competitionId: {
      _id: string;
      name: string;
      category: string;
      numberOfQuestions: number;
      timePerQuestionSeconds: number;
      allowedTeamSize: number;
      status: string;
    };
    teamId: {
      _id: string;
      name: string;
      category: string;
    };
  };
  membership: {
    role: 'leader' | 'member';
  };
}

export function GameLobbyPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    sessionStatus,
    members,
    countdown,
    toggleReady,
    startGame,
  } = useGameSocket(sessionId);

  // Fetch initial session payload
  useEffect(() => {
    if (!sessionId) return;
    const fetchSessionInfo = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/game/session/${sessionId}`);
        setData(res.data.data);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load tournament lobby.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionInfo();
  }, [sessionId, navigate]);

  // Navigate to arena when question becomes active
  useEffect(() => {
    if (sessionStatus === 'question_active' && sessionId) {
      navigate(`/game/${sessionId}`);
    }
  }, [sessionStatus, sessionId, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Connecting to tournament lobby...</p>
      </div>
    );
  }

  if (!data) return null;

  const { session, membership } = data;
  const isLeader = membership.role === 'leader';
  const myMember = members.find((m) => m.userId === user?._id);
  const isMyReady = myMember?.status === 'ready';

  const readyCount = members.filter((m) => m.status === 'ready').length;
  const canStart = isLeader && members.length === session.competitionId.allowedTeamSize;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-200 relative pb-12">
      {/* ── 3-2-1 STARTING COUNTDOWN OVERLAY ────────────────────────── */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-md flex flex-col items-center justify-center text-white">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-gold mb-2">
            Tournament Starting In
          </p>
          <div className="text-8xl font-black font-display text-white animate-bounce">
            {countdown}
          </div>
          <p className="text-xs text-slate-300 mt-4">Syncing question engines with server...</p>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-brand-blue rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <Badge variant="warning" size="md" className="font-semibold">
            {session.competitionId.category}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-blue-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Server Authoritative Session</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold font-display leading-tight">
          {session.competitionId.name}
        </h1>

        <p className="text-sm text-blue-100/90 mt-1">
          Squad Arena: <span className="font-bold text-white">{session.teamId.name}</span>
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-brand-gold" />
            <div>
              <p className="text-[10px] uppercase text-blue-200">Questions</p>
              <p className="font-bold text-sm">{session.competitionId.numberOfQuestions} Qs</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-gold" />
            <div>
              <p className="text-[10px] uppercase text-blue-200">Time / Question</p>
              <p className="font-bold text-sm">{session.competitionId.timePerQuestionSeconds}s</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-gold" />
            <div>
              <p className="text-[10px] uppercase text-blue-200">Squad Requirement</p>
              <p className="font-bold text-sm">{session.competitionId.allowedTeamSize} Players</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-gold" />
            <div>
              <p className="text-[10px] uppercase text-blue-200">Status</p>
              <p className="font-bold text-sm text-emerald-300">Live for Play</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Squad Members & Ready Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Squad Roster */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-blue" />
              <span>Squad Check-In</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {readyCount} of {session.competitionId.allowedTeamSize} ready
            </span>
          </div>

          <div className="space-y-2.5">
            {members.map((member) => {
              const isMe = member.userId === user?._id;
              const isReady = member.status === 'ready';
              const isLeaderMember = member.role === 'leader';

              return (
                <div
                  key={member.userId}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    isReady
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar
                        src={member.avatar}
                        name={member.name}
                        size="md"
                        className="w-10 h-10 rounded-xl"
                      />
                      {isLeaderMember && (
                        <span
                          className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5"
                          title="Squad Leader"
                        >
                          <ShieldCheck className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">
                          {member.name}
                        </p>
                        {isMe && (
                          <span className="text-[10px] font-bold text-brand-blue bg-blue-100 dark:bg-blue-950 px-1.5 py-0.5 rounded-md">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 capitalize">
                        {isLeaderMember ? 'Squad Leader' : 'Team Member'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isReady ? (
                      <Badge variant="success" size="sm" className="gap-1 font-semibold">
                        <CheckCircle className="w-3 h-3" />
                        Ready
                      </Badge>
                    ) : member.status === 'disconnected' ? (
                      <Badge variant="error" size="sm">
                        Offline
                      </Badge>
                    ) : (
                      <Badge variant="default" size="sm">
                        Connecting...
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Button
              variant={isMyReady ? 'secondary' : 'primary'}
              size="lg"
              className="w-full sm:w-auto"
              onClick={toggleReady}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              {isMyReady ? 'Cancel Ready' : 'I Am Ready'}
            </Button>

            {isLeader && (
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={startGame}
                disabled={!canStart}
                leftIcon={<Play className="w-4 h-4 fill-current" />}
              >
                Start Tournament Now
              </Button>
            )}
          </div>

          {isLeader && !canStart && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>
                All {session.competitionId.allowedTeamSize} squad members must join before you can start.
              </span>
            </p>
          )}
        </div>

        {/* Tournament Rules Card */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-brand-gold" />
            <span>Rules of Play</span>
          </h2>

          <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                Individual Accountability
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Every player submits their own answers. The squad leader cannot answer on your behalf.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                First Submission Locked
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Answers are immediately locked upon selection and cannot be changed.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                Speed Bonus
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Correct answers submitted faster earn an additional server-recorded speed bonus.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                Single Device Policy
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Logging in from another browser will supersede and disconnect your session immediately.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
