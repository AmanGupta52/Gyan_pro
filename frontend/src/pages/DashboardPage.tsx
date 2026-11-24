import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  BookOpen,
  Users,
  Gamepad2,
  Trophy,
  Award,
  Heart,
  UserCircle,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface FeatureCardItem {
  number: string;
  title: string;
  description: string;
  icon: typeof ClipboardList;
  route: string;
  status: 'Ready' | 'Action needed' | 'Locked' | 'Completed';
  statusVariant: 'info' | 'warning' | 'default' | 'success';
  lockReason?: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Cards data
  const featureCards: FeatureCardItem[] = [
    {
      number: '01',
      title: 'Registration',
      description: 'Register for upcoming individual & team competitions.',
      icon: ClipboardList,
      route: '/competitions',
      status: 'Ready',
      statusVariant: 'info',
    },
    {
      number: '02',
      title: 'Instructions',
      description: 'Rules, scoring breakdown, time limits & tie-breakers.',
      icon: BookOpen,
      route: '/instructions',
      status: 'Ready',
      statusVariant: 'info',
    },
    {
      number: '03',
      title: 'Teams',
      description: 'Form squads of 2, 4, or 6, invite players & manage requests.',
      icon: Users,
      route: '/teams',
      status: 'Action needed',
      statusVariant: 'warning',
    },
    {
      number: '04',
      title: 'Multiplayer Game',
      description: 'Authoritative real-time multiplayer buzzer & quiz arena.',
      icon: Gamepad2,
      route: '/lobby',
      status: 'Locked',
      statusVariant: 'default',
      lockReason: 'Join a registered team when competition is Live.',
    },
    {
      number: '05',
      title: 'Leaderboard & Results',
      description: 'Official rankings, squad analytics, accuracy & match history.',
      icon: Trophy,
      route: '/leaderboard',
      status: 'Ready',
      statusVariant: 'success',
    },
    {
      number: '06',
      title: 'Verifiable Certificates',
      description: 'Download verified, tamper-proof participation credentials & QR codes.',
      icon: Award,
      route: '/certificates',
      status: 'Ready',
      statusVariant: 'success',
    },
    {
      number: '07',
      title: 'Donation',
      description: 'Support student prizes, technology & organizing costs.',
      icon: Heart,
      route: '/support',
      status: 'Ready',
      statusVariant: 'success',
    },
    {
      number: '08',
      title: 'Profile',
      description: 'Manage personal details, education level & guardian info.',
      icon: UserCircle,
      route: '/profile',
      status: 'Ready',
      statusVariant: 'info',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* ── HERO BANNER ────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-900 via-navy-700 to-brand-blue text-white p-6 sm:p-10 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-sky-200 border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Welcome, {user?.name || 'Participant'}!</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display">
            GYAN<span className="text-blue-400">-26</span>
          </h1>

          <p className="text-lg sm:text-xl font-medium text-sky-100">
            "Kaun Banega Gyanwan Vivekvan Gunwan"
          </p>

          <p className="text-xs sm:text-sm text-sky-200/80 max-w-xl">
            A state-of-the-art multiplayer quiz arena designed for scholars from Junior KG to PhD. Prepare your squads, sharpen your knowledge, and compete for excellence.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="bg-white text-navy-900 hover:bg-sky-50 shadow-lg font-semibold"
              onClick={() => navigate('/competitions')}
              rightIcon={<ArrowRight className="w-4 h-4 text-brand-blue" />}
            >
              Browse Competitions
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="text-white hover:bg-white/10 border border-white/20"
              onClick={() => navigate('/teams')}
            >
              Manage My Team
            </Button>
          </div>
        </div>
      </section>

      {/* ── STATUS & UPCOMING WIDGETS ──────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming competition countdown card */}
        <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-blue" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Upcoming Arena Match
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                GYAN-26 All-India Championship
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Category: <span className="font-medium text-slate-700 dark:text-slate-300">{user?.educationLevel || 'All Grades'}</span> • Mode: Team of 4
              </p>
            </div>
            <Badge variant="warning">Registration Open</Badge>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Starts in <span className="font-semibold text-slate-900 dark:text-white">3 days, 14 hours (IST)</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/competitions')}
            >
              View Details
            </Button>
          </div>
        </Card>

        {/* Your team summary card */}
        <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Squad Status
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Squad Overview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You are registered as a player in category <span className="font-semibold text-brand-blue">{user?.educationLevel}</span>.
              </p>
            </div>
            <Badge variant="info">Solo Player</Badge>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Create or join a squad to participate in 4-player team events.
            </span>
            <Button
              size="sm"
              onClick={() => navigate('/teams')}
            >
              Find Squad
            </Button>
          </div>
        </Card>
      </section>

      {/* ── 8 NUMBERED FEATURE CARDS GRID ──────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
            Competition Arena Hub
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access game facilities, team management, verified credentials, and instructions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featureCards.map((card) => {
            const Icon = card.icon;
            const isLocked = card.status === 'Locked';

            return (
              <div
                key={card.number}
                onClick={() => {
                  if (!isLocked) {
                    navigate(card.route);
                  }
                }}
                className={`relative group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                  isLocked
                    ? 'opacity-80 cursor-not-allowed'
                    : 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-brand-blue/30'
                }`}
              >
                {/* Large Faded Number in Background */}
                <span className="absolute -top-3 -right-2 text-6xl font-black text-slate-100 dark:text-slate-800/40 select-none pointer-events-none group-hover:text-brand-blue/10 transition-colors">
                  {card.number}
                </span>

                {/* Card Top: Icon & Badge */}
                <div className="relative z-10 flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge variant={card.statusVariant} size="sm">
                    {card.status}
                  </Badge>
                </div>

                {/* Card Middle: Title & Description */}
                <div className="relative z-10 space-y-1">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-brand-blue transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Card Bottom: Lock Reason or Action Link */}
                <div className="relative z-10 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  {isLocked ? (
                    <span className="text-slate-400 dark:text-slate-500 italic">
                      🔒 {card.lockReason}
                    </span>
                  ) : (
                    <span className="font-semibold text-brand-blue dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Open Module <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
