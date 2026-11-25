import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight,
  History,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import api from '@/config/api';
import type { UserMatchHistoryItem } from '@/types';

export function MatchHistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<UserMatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/results/history', {
          params: { page, limit: 15 },
        });

        setHistory(data.data || []);
        setTotalPages(data.meta?.totalPages || 1);
      } catch (err: any) {
        toast.error('Failed to load match history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [page]);

  const totalMatches = history.length;
  const avgAccuracy =
    totalMatches > 0
      ? Math.round(
          (history.reduce((sum, h) => sum + h.accuracy, 0) / totalMatches) * 100
        )
      : 0;
  const totalScoreEarned = history.reduce((sum, h) => sum + h.playerScore, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in-50 duration-200 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-7 h-7 text-brand-blue" />
            <span>My Tournament History</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Personal record of all completed competitions, scorecards, and verifiable achievements.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/competitions')}
        >
          Explore Live Tournaments
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 glass rounded-2xl shadow-sm text-center">
          <p className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Matches Played</p>
          <p className="text-2xl font-black font-display text-slate-900 dark:text-white mt-1">
            {totalMatches}
          </p>
        </Card>

        <Card className="p-5 glass rounded-2xl shadow-sm text-center">
          <p className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Average Accuracy</p>
          <p className="text-2xl font-black font-display text-emerald-500 mt-1">
            {avgAccuracy}%
          </p>
        </Card>

        <Card className="p-5 glass rounded-2xl shadow-sm text-center">
          <p className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Total Points Won</p>
          <p className="text-2xl font-black font-display text-brand-blue mt-1">
            {totalScoreEarned} pts
          </p>
        </Card>
      </div>

      {/* History Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tournament</TableHead>
            <TableHead>Squad</TableHead>
            <TableHead>Rank</TableHead>
            <TableHead>Player Score</TableHead>
            <TableHead>Accuracy</TableHead>
            <TableHead>Played Date (IST)</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-slate-600 dark:text-slate-400">
                Loading tournament record...
              </TableCell>
            </TableRow>
          ) : history.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-slate-600 dark:text-slate-400">
                You haven't participated in any tournaments yet. Join a live match!
              </TableCell>
            </TableRow>
          ) : (
            history.map((item) => (
              <TableRow key={item._id}>
                <TableCell>
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white">
                      {item.competition.name}
                    </p>
                    <Badge variant="info" size="sm" className="mt-0.5">
                      {item.competition.category}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {item.team.name}
                </TableCell>
                <TableCell>
                  <span className="font-extrabold text-xs font-display">
                    {typeof item.rank === 'number' ? `#${item.rank}` : item.rank}
                  </span>
                  {item.isProvisional && (
                    <span className="block text-[9px] text-amber-500 font-medium">
                      (Provisional)
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-bold text-xs text-brand-blue">
                  {item.playerScore} pts
                </TableCell>
                <TableCell>
                  <Badge variant={item.accuracy >= 0.75 ? 'success' : 'info'} size="sm">
                    {Math.round(item.accuracy * 100)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {new Date(item.playedAt).toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/results?session=${item.gameSessionId}`)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Scorecard
                  </Button>
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
