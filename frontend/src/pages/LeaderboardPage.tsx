import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Trophy,
  Download,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import api from '@/config/api';
import type { LeaderboardRow } from '@/types';

interface CompetitionOption {
  _id: string;
  name: string;
  category: string;
  status: string;
}

export function LeaderboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superAdmin';

  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>(
    searchParams.get('competitionId') || ''
  );

  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [compInfo, setCompInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 1. Fetch available competitions
  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const { data } = await api.get('/competitions', {
          params: { limit: 100 },
        });
        const list = data.data || [];
        setCompetitions(list);

        if (!selectedCompId && list.length > 0) {
          setSelectedCompId(list[0]._id);
        }
      } catch (err: unknown) {
        toast.error('Failed to load tournaments list');
      }
    };

    fetchCompetitions();
  }, []);

  // 2. Fetch Leaderboard for selected tournament
  useEffect(() => {
    if (!selectedCompId) return;

    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/results/leaderboard/${selectedCompId}`, {
          params: { page, limit: 25 },
        });

        setLeaderboard(data.data || []);
        setCompInfo(data.competition || null);
        setTotalPages(data.meta?.totalPages || 1);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [selectedCompId, page]);

  // Handle CSV Export
  const handleExportCSV = async () => {
    if (!selectedCompId) return;
    try {
      setExporting(true);
      const response = await api.get(`/results/export/${selectedCompId}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leaderboard-${selectedCompId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Leaderboard CSV exported successfully!');
    } catch (err: any) {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in-50 duration-200 pb-16">
      {/* Header and Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-7 h-7 text-brand-gold" />
              <span>Official Leaderboard</span>
            </h1>
            {compInfo?.isProvisional && (
              <Badge variant="warning" size="sm">
                Provisional
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time tournament rankings evaluated server-side with verified tie-breaker rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-56 sm:w-64">
            <Select
              value={selectedCompId}
              onChange={(e) => {
                setSelectedCompId(e.target.value);
                setSearchParams({ competitionId: e.target.value });
                setPage(1);
              }}
            >
              {competitions.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.category})
                </option>
              ))}
            </Select>
          </div>

          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              loading={exporting}
              onClick={handleExportCSV}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* ── TOP 3 PODIUM VISUALIZATION ─────────────────────────────────── */}
      {!loading && topThree.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* #2 Place (Silver) */}
          {topThree[1] && (
            <Card className="p-5 rounded-3xl bg-gradient-to-b from-slate-100 to-white dark:from-slate-800/60 dark:to-slate-900 border-slate-300 dark:border-slate-700 text-center space-y-3 relative overflow-hidden order-2 sm:order-1 sm:mt-6 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-slate-300 text-slate-800 font-black text-lg mx-auto flex items-center justify-center shadow">
                2
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                  {topThree[1].teamId.name}
                </h3>
                <p className="text-xs text-slate-400">{topThree[1].teamId.category}</p>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-around text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Score</p>
                  <p className="font-bold text-slate-900 dark:text-white text-base">
                    {topThree[1].totalScore}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Accuracy</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                    {Math.round(topThree[1].accuracy * 100)}%
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* #1 Place (Gold Winner) */}
          {topThree[0] && (
            <Card className="p-6 rounded-3xl bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900 border-amber-300 dark:border-amber-700/60 text-center space-y-3 relative overflow-hidden order-1 sm:order-2 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/30">
              <div className="absolute top-2 right-2">
                <Sparkles className="w-5 h-5 text-brand-gold animate-pulse" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-900 font-black text-xl mx-auto flex items-center justify-center shadow-md">
                1
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white truncate">
                  {topThree[0].teamId.name}
                </h3>
                <p className="text-xs text-brand-gold font-semibold">Tournament Champion</p>
              </div>
              <div className="pt-2 border-t border-amber-200 dark:border-amber-900 flex justify-around text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Squad Score</p>
                  <p className="font-black text-brand-blue text-lg">
                    {topThree[0].totalScore}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Accuracy</p>
                  <p className="font-black text-emerald-600 dark:text-emerald-400 text-lg">
                    {Math.round(topThree[0].accuracy * 100)}%
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* #3 Place (Bronze) */}
          {topThree[2] && (
            <Card className="p-5 rounded-3xl bg-gradient-to-b from-amber-900/10 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-800/40 text-center space-y-3 relative overflow-hidden order-3 sm:order-3 sm:mt-8 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-amber-700 text-white font-black text-lg mx-auto flex items-center justify-center shadow">
                3
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                  {topThree[2].teamId.name}
                </h3>
                <p className="text-xs text-slate-400">{topThree[2].teamId.category}</p>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-around text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Score</p>
                  <p className="font-bold text-slate-900 dark:text-white text-base">
                    {topThree[2].totalScore}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Accuracy</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                    {Math.round(topThree[2].accuracy * 100)}%
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── FULL LEADERBOARD TABLE ───────────────────────────────────── */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Squad</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Accuracy</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                Loading official leaderboard...
              </TableCell>
            </TableRow>
          ) : leaderboard.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                No match results recorded yet for this competition.
              </TableCell>
            </TableRow>
          ) : (
            leaderboard.map((row) => (
              <TableRow key={row._id}>
                <TableCell>
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs ${
                      row.rank === 1
                        ? 'bg-amber-400 text-slate-900'
                        : row.rank === 2
                        ? 'bg-slate-300 text-slate-900'
                        : row.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    #{row.rank}
                  </span>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      {row.teamId.name}
                    </p>
                    <p className="text-[10px] text-slate-400">{row.teamId.category}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center -space-x-1.5">
                    {row.members.map((m) => (
                      <Avatar
                        key={m.userId}
                        src={m.avatar}
                        name={m.name}
                        size="sm"
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900"
                        title={m.name}
                      />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="font-extrabold text-sm text-brand-blue">
                  {row.totalScore}
                </TableCell>
                <TableCell>
                  <Badge variant={row.accuracy >= 0.75 ? 'success' : 'info'} size="sm">
                    {Math.round(row.accuracy * 100)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-mono text-slate-500">
                  {row.totalDurationSeconds}s
                </TableCell>
                <TableCell>
                  {row.isProvisional ? (
                    <Badge variant="warning" size="sm">
                      Provisional
                    </Badge>
                  ) : (
                    <Badge variant="success" size="sm">
                      Final
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
