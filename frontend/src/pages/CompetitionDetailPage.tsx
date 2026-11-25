import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Trophy,
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Award,
  ArrowLeft,
  Play,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import api from '@/config/api';

interface CompetitionDetail {
  _id: string;
  name: string;
  description: string;
  category: string;
  startAt: string;
  endAt: string;
  registrationDeadline: string;
  participationMode: 'individual' | 'team';
  allowedTeamSize: 1 | 2 | 4 | 6;
  numberOfQuestions: number;
  timePerQuestionSeconds: number;
  scoringConfig: {
    basePoints: number;
    speedBonusMax: number;
    penaltyWrong: number;
  };
  tieBreakRules: string;
  rulesText?: string;
  status: 'Registration Open' | 'Registration Closed' | 'Live' | 'Completed';
  registrationCount?: number;
}

interface UserTeamItem {
  _id: string;
  name: string;
  category: string;
  size: number;
  currentMemberCount: number;
  leaderId: string;
}

export function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [competition, setCompetition] = useState<CompetitionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [myTeams, setMyTeams] = useState<UserTeamItem[]>([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [registering, setRegistering] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [registeredTeamId, setRegisteredTeamId] = useState<string | null>(null);
  const [enteringLobby, setEnteringLobby] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [compRes, teamsRes, regRes] = await Promise.all([
          api.get(`/competitions/${id}`),
          user ? api.get('/teams/my') : Promise.resolve({ data: { data: [] } }),
          user ? api.get('/competitions/my/registrations') : Promise.resolve({ data: { data: [] } }),
        ]);

        setCompetition(compRes.data.data);
        setMyTeams(teamsRes.data.data || []);

        const foundReg = (regRes.data.data || []).find(
          (r: any) => r.competitionId?._id === id || r.competitionId === id
        );
        setAlreadyRegistered(!!foundReg);
        if (foundReg) {
          setRegisteredTeamId(foundReg.teamId?._id || foundReg.teamId);
        }
      } catch (err: unknown) {
        toast.error('Failed to load competition details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, user]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mx-auto" />
        <p className="mt-3 text-sm text-slate-500">Loading competition...</p>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-bold">Competition not found</h2>
        <Button className="mt-4" onClick={() => navigate('/competitions')}>
          Back to Competitions
        </Button>
      </div>
    );
  }

  // Eligible squads: matching category + member count equals required size + user is leader
  const eligibleSquads = myTeams.filter(
    (t) =>
      t.category === competition.category &&
      t.currentMemberCount === competition.allowedTeamSize &&
      t.size === competition.allowedTeamSize &&
      t.leaderId === user?._id
  );

  const handleRegisterConfirm = async () => {
    try {
      setRegistering(true);

      await api.post(`/competitions/${competition._id}/register`, {
        teamId: competition.participationMode === 'team' ? selectedTeamId : undefined,
      });

      toast.success('Registration confirmed! Check your notifications.');
      setAlreadyRegistered(true);
      setIsRegisterOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Registration failed.';
      toast.error(msg);
    } finally {
      setRegistering(false);
    }
  };

  const handleEnterLobby = async () => {
    if (!registeredTeamId && competition.participationMode === 'team') {
      toast.error('Registered squad could not be determined.');
      return;
    }
    try {
      setEnteringLobby(true);
      const res = await api.post('/game/session', {
        competitionId: competition._id,
        teamId: registeredTeamId || myTeams[0]?._id,
      });
      navigate(`/lobby/${res.data.data._id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to enter match lobby');
    } finally {
      setEnteringLobby(false);
    }
  };

  const isRegistrationOpen = competition.status === 'Registration Open';
  const isLive = competition.status === 'Live';
  const totalMinutes = Math.round(
    (competition.numberOfQuestions * competition.timePerQuestionSeconds) / 60
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in-50 duration-200">
      <Link
        to="/competitions"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Competitions
      </Link>

      {/* Main Overview Card */}
      <Card className="p-6 sm:p-8 glass rounded-3xl shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="warning">{competition.status}</Badge>
              <Badge variant="info">{competition.category}</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white">
              {competition.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {alreadyRegistered ? (
              isLive ? (
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                  onClick={handleEnterLobby}
                  loading={enteringLobby}
                  leftIcon={<Play className="w-4 h-4 fill-current" />}
                >
                  Enter Match Lobby
                </Button>
              ) : (
                <Badge variant="success" className="py-2 px-4 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Squad Registered
                </Badge>
              )
            ) : isRegistrationOpen ? (
              <Button
                size="lg"
                onClick={() => setIsRegisterOpen(true)}
              >
                Register for Match
              </Button>
            ) : (
              <Button size="lg" disabled>
                Registration Closed
              </Button>
            )}
          </div>
        </div>

        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          {competition.description}
        </p>

        {/* Competition Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
            <Users className="w-5 h-5 text-brand-blue mx-auto mb-1" />
            <p className="text-xs text-slate-600 dark:text-slate-400">Participation</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {competition.participationMode === 'individual'
                ? 'Solo Player'
                : `Squad of ${competition.allowedTeamSize}`}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
            <Clock className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-xs text-slate-600 dark:text-slate-400">Time per Q</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {competition.timePerQuestionSeconds}s (~{totalMinutes} min)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
            <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-xs text-slate-600 dark:text-slate-400">Questions</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {competition.numberOfQuestions} Qs
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
            <Award className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xs text-slate-600 dark:text-slate-400">Certificates</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              QR Verifiable
            </p>
          </div>
        </div>

        {/* Schedule box in IST */}
        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Calendar className="w-4 h-4 text-brand-blue" />
            <span>
              <strong>Match Time (IST):</strong>{' '}
              {new Date(competition.startAt).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>

          <div className="text-rose-600 dark:text-rose-400 font-medium">
            Deadline:{' '}
            {new Date(competition.registrationDeadline).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </div>
        </div>

        {/* Rules & Guidelines */}
        <div className="space-y-3 pt-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Competition Rules & Scoring
          </h3>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside">
            <li>
              Base Points: <span className="font-semibold text-brand-blue">{competition.scoringConfig?.basePoints || 100}</span> points per correct answer.
            </li>
            <li>
              Speed Bonus: Up to <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{competition.scoringConfig?.speedBonusMax || 50}</span> points rewarded for faster submissions.
            </li>
            <li>
              Tie-Breaker Rule: Server-authoritative resolution based on <span className="font-semibold capitalize">{competition.tieBreakRules}</span>.
            </li>
            <li>
              Every player must answer independently from their own device.
            </li>
            <li>
              An official QR-verifiable certificate will be issued upon competition completion.
            </li>
          </ul>
        </div>
      </Card>

      {/* ── REGISTRATION MODAL ───────────────────────────────────── */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Register Squad for Competition"
        description={competition.name}
      >
        <div className="space-y-4 pt-2">
          {competition.participationMode === 'individual' ? (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              This is a solo competition. You will participate independently under the category <strong>{competition.category}</strong>.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                This competition requires a complete squad of exactly <strong>{competition.allowedTeamSize} players</strong> in category <strong>{competition.category}</strong>.
              </p>

              {eligibleSquads.length > 0 ? (
                <div>
                  <Select
                    label="Select Your Eligible Squad"
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                  >
                    <option value="">-- Choose Squad --</option>
                    {eligibleSquads.map((sq) => (
                      <option key={sq._id} value={sq._id}>
                        {sq.name} ({sq.currentMemberCount} / {sq.size} Members)
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>No Eligible Squads Ready</span>
                  </div>
                  <p>
                    You do not lead any squads with exactly {competition.allowedTeamSize} verified members in the "{competition.category}" category.
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    onClick={() => {
                      setIsRegisterOpen(false);
                      navigate('/teams');
                    }}
                  >
                    Go to Squads to Invite Players
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsRegisterOpen(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={handleRegisterConfirm}
              loading={registering}
              disabled={
                competition.participationMode === 'team' && !selectedTeamId
              }
            >
              Confirm Registration
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
