import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import api from '@/config/api';

interface AuditLogRow {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userId?: { name: string; email: string; role: string };
  createdAt: string;
}

export function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/audit-logs', {
        params: {
          entityType: entityFilter !== 'all' ? entityFilter : undefined,
          page,
          limit: 25,
        },
      });
      setLogs(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (err: unknown) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, entityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white">
            System Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tamper-evident record of all administrative operations, status changes, and configurations.
          </p>
        </div>

        <div className="w-48">
          <Select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Entities</option>
            <option value="Competition">Competition</option>
            <option value="Question">Question</option>
            <option value="User">User</option>
            <option value="DonationSettings">DonationSettings</option>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp (IST)</TableHead>
            <TableHead>Admin User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target Entity</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                Loading audit records...
              </TableCell>
            </TableRow>
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                No audit entries found.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
            <TableRow key={log._id}>
              <TableCell className="text-xs text-slate-500">
                {new Date(log.createdAt).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </TableCell>
              <TableCell>
                <p className="font-semibold text-xs text-slate-900 dark:text-white">
                  {log.userId?.name || 'System / Seed'}
                </p>
                <p className="text-[10px] text-slate-400">{log.userId?.email}</p>
              </TableCell>
              <TableCell>
                <Badge variant="info" size="sm" className="font-mono text-[10px]">
                  {log.action}
                </Badge>
              </TableCell>
              <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {log.entityType}
              </TableCell>
              <TableCell className="text-xs font-mono text-slate-400">
                {log.ipAddress || '127.0.0.1'}
              </TableCell>
              <TableCell className="max-w-xs truncate text-[11px] font-mono text-slate-500">
                {JSON.stringify(log.details || {})}
              </TableCell>
            </TableRow>
          )))}
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
