import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Users,
  User,
  Clock,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import api from '@/config/api';

interface CompetitionItem {
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
  status: 'Registration Open' | 'Registration Closed' | 'Live' | 'Completed';
  registrationCount?: number;
}

export function CompetitionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/competitions', {
          params: {
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
          },
        });
        setCompetitions(data.data || []);
      } catch (err: unknown) {
        console.error('Failed to load competitions', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitions();
  }, [selectedCategory, selectedStatus]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Registration Open':
        return 'warning';
      case 'Live':
        return 'success';
      case 'Completed':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white">
            Quiz Championships
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse all-India competitions from Junior KG to PhD level.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-44">
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {user?.educationLevel && (
                <option value={user.educationLevel}>
                  My Grade ({user.educationLevel})
                </option>
              )}
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

          <div className="w-44">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Registration Open">Registration Open</option>
              <option value="Live">Live Arena</option>
              <option value="Completed">Completed</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid of Competitions */}
      {competitions.length === 0 && !loading ? (
        <EmptyState
          icon={Trophy}
          title="No Competitions Found"
          description="There are currently no competitions matching your selected category filters."
          actionLabel="Clear Filters"
          onAction={() => {
            setSelectedCategory('all');
            setSelectedStatus('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitions.map((comp) => {
            const isLive = comp.status === 'Live';
            const isRegistrationOpen = comp.status === 'Registration Open';
            const totalDurationMinutes = Math.round(
              (comp.numberOfQuestions * comp.timePerQuestionSeconds) / 60
            );

            return (
              <Card
                key={comp._id}
                className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Top status bar */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Badge variant={getStatusBadgeVariant(comp.status)}>
                      {comp.status}
                    </Badge>
                    <Badge variant="info" size="sm">
                      {comp.category}
                    </Badge>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white line-clamp-1">
                    {comp.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {comp.description}
                  </p>

                  {/* Metadata Chips */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      {comp.participationMode === 'individual' ? (
                        <User className="w-4 h-4 text-brand-blue" />
                      ) : (
                        <Users className="w-4 h-4 text-brand-blue" />
                      )}
                      <span>
                        {comp.participationMode === 'individual'
                          ? 'Solo (1 Player)'
                          : `Squad (${comp.allowedTeamSize} Players)`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      <span>{comp.numberOfQuestions} Qs (~{totalDurationMinutes}m)</span>
                    </div>
                  </div>

                  {/* Start Date / IST schedule */}
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Starts:{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {new Date(comp.startAt).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        IST
                      </span>
                    </span>
                  </div>
                </div>

                {/* Card CTA Footer */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  {isLive ? (
                    <Button
                      fullWidth
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      onClick={() => navigate(`/lobby?competitionId=${comp._id}`)}
                    >
                      Enter Live Match
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="secondary"
                      onClick={() => navigate(`/competitions/${comp._id}`)}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      {isRegistrationOpen ? 'View & Register' : 'View Details'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
