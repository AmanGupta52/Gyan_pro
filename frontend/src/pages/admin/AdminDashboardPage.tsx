import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Trophy,
  HelpCircle,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/config/api';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalTeams: number;
  activeTeams: number;
  totalCompetitions: number;
  liveCompetitions: number;
  completedCompetitions: number;
  totalQuestions: number;
  certificatesIssued: number;
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/admin/stats');
        setStats(data.data);
      } catch (err: unknown) {
        console.error('Failed to load admin stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Total Registered Users',
      value: stats?.totalUsers || 0,
      subtext: `${stats?.activeUsers || 0} active scholars`,
      icon: Users,
      color: 'text-brand-blue bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: 'Squads Formed',
      value: stats?.totalTeams || 0,
      subtext: `${stats?.activeTeams || 0} ready to compete`,
      icon: Users,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: 'Championships',
      value: stats?.totalCompetitions || 0,
      subtext: `${stats?.liveCompetitions || 0} Live Now`,
      icon: Trophy,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40',
    },
    {
      label: 'Questions in Bank',
      value: stats?.totalQuestions || 0,
      subtext: 'Across all education levels',
      icon: HelpCircle,
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40',
    },
  ];

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-medium text-slate-400">Loading admin overview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white">
            Admin Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            System overview, tournament operations, and question curation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/admin/competitions')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Competition
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate('/admin/questions')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Question
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <h3 className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white mt-1">
                  {stat.value}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{stat.subtext}</p>
              </div>

              <div className={`p-3 rounded-2xl ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Competition Lifecycle
              </h4>
              <p className="text-xs text-slate-400">
                Open registrations, advance matches, or archive.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => navigate('/admin/competitions')}
          >
            Manage Competitions →
          </Button>
        </Card>

        <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Question Bank
              </h4>
              <p className="text-xs text-slate-400">
                Curate single, multiple-correct, and image questions.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => navigate('/admin/questions')}
          >
            Open Question Bank →
          </Button>
        </Card>

        <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Audit Trail
              </h4>
              <p className="text-xs text-slate-400">
                Track all administrative actions with IP stamps.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => navigate('/admin/audit-logs')}
          >
            View Audit Logs →
          </Button>
        </Card>
      </div>
    </div>
  );
}
