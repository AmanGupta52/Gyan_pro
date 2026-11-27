import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Search,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import api from '@/config/api';

interface UserRow {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'player' | 'teacher' | 'admin' | 'superAdmin';
  educationLevel?: string;
  institution?: string;
  city?: string;
  state?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Role edit modal
  const [roleModalUser, setRoleModalUser] = useState<UserRow | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRow['role']>('player');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/users', {
        params: {
          search: search.trim() || undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          page,
          limit: 15,
        },
      });
      setUsers(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (err: unknown) {
      toast.error('Failed to load user list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleToggleStatus = async (user: UserRow) => {
    if (user._id === currentUser?._id) {
      toast.error('You cannot disable your own admin account.');
      return;
    }

    try {
      await api.patch(`/admin/users/${user._id}/status`, {
        isActive: !user.isActive,
      });
      toast.success(`User ${user.isActive ? 'disabled' : 'enabled'}`);
      fetchUsers();
    } catch (err: unknown) {
      toast.error('Failed to update user status');
    }
  };

  const handleRoleUpdate = async () => {
    if (!roleModalUser) return;
    try {
      await api.patch(`/admin/users/${roleModalUser._id}/role`, {
        role: selectedRole,
      });
      toast.success(`Updated ${roleModalUser.name}'s role to ${selectedRole}`);
      setRoleModalUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Failed to update role.';
      toast.error(msg);
    }
  };

  const isSuperAdmin = currentUser?.role === 'superAdmin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white">
            Users & Role Permissions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse participants, manage statuses, and grant administrative privileges.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 glass text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </form>

        <div className="w-full sm:w-48">
          <Select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Roles</option>
            <option value="player">Player</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
            <option value="superAdmin">Super Admin</option>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-600 dark:text-slate-400">
                Loading users...
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-600 dark:text-slate-400">
                No users found matching search criteria.
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => (
            <TableRow key={u._id}>
              <TableCell>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {u.name}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Joined {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                <p>{u.email}</p>
                {u.phone && <p className="text-slate-600 dark:text-slate-400">{u.phone}</p>}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    u.role === 'superAdmin'
                      ? 'warning'
                      : u.role === 'admin'
                      ? 'info'
                      : u.role === 'teacher'
                      ? 'success'
                      : 'default'
                  }
                  size="sm"
                  className="capitalize"
                >
                  {u.role}
                </Badge>
              </TableCell>
              <TableCell>
                {u.educationLevel ? (
                  <Badge variant="info" size="sm">
                    {u.educationLevel}
                  </Badge>
                ) : (
                  <span className="text-xs text-slate-500">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={u.isActive ? 'success' : 'error'}
                  size="sm"
                >
                  {u.isActive ? 'Active' : 'Disabled'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  {/* Change Role (superAdmin only) */}
                  {isSuperAdmin && u._id !== currentUser?._id && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setRoleModalUser(u);
                        setSelectedRole(u.role);
                      }}
                    >
                      Role
                    </Button>
                  )}

                  {/* Toggle Active status */}
                  <Button
                    size="sm"
                    variant={u.isActive ? 'ghost' : 'secondary'}
                    onClick={() => handleToggleStatus(u)}
                    className={u.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600'}
                    title={u.isActive ? 'Disable user' : 'Enable user'}
                  >
                    {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  </Button>
                </div>
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

      {/* ── CHANGE ROLE MODAL (SuperAdmin Only) ────────────────────── */}
      {roleModalUser && (
        <Modal
          isOpen={!!roleModalUser}
          onClose={() => setRoleModalUser(null)}
          title={`Update Role for ${roleModalUser.name}`}
          description={`Current email: ${roleModalUser.email}`}
        >
          <div className="space-y-4 pt-2">
            <Select
              label="Select New System Role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
            >
              <option value="player">Player (Default user)</option>
              <option value="teacher">Teacher (Create quizzes for students)</option>
              <option value="admin">Admin (Manage competitions & questions)</option>
              <option value="superAdmin">Super Admin (Full root access)</option>
            </Select>

            <div className="pt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setRoleModalUser(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleRoleUpdate}>
                Save Role Change
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
