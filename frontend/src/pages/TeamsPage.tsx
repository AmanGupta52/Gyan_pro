import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Crown,
  UserPlus,
  LogOut,
  Trash2,
  Check,
  X,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlayerSearchModal } from '@/components/teams/PlayerSearchModal';
import api from '@/config/api';

interface TeamMemberData {
  _id: string;
  userId: string;
  name: string;
  photo?: string;
  educationLevel: string;
  city?: string;
  role: 'leader' | 'member';
  joinedAt: string;
}

interface TeamData {
  _id: string;
  name: string;
  description?: string;
  category: string;
  size: 2 | 4 | 6;
  leaderId: string;
  currentMemberCount: number;
  members: TeamMemberData[];
}

interface InvitationData {
  _id: string;
  teamId: {
    _id: string;
    name: string;
    category: string;
    size: number;
    currentMemberCount: number;
  };
  senderId: {
    _id: string;
    name: string;
    photo?: string;
    educationLevel: string;
  };
  expiresAt: string;
  createdAt: string;
}

export function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [invitations, setInvitations] = useState<InvitationData[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeInviteTeam, setActiveInviteTeam] = useState<TeamData | null>(null);

  // Form for team creation
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name: '',
      description: '',
      category: user?.educationLevel || 'Class 10',
      size: 4,
    },
  });

  const fetchSquadsAndInvites = async () => {
    try {
      setLoading(true);
      const [teamsRes, invitesRes] = await Promise.all([
        api.get('/teams/my'),
        api.get('/invitations/my'),
      ]);
      setTeams(teamsRes.data.data || []);
      setInvitations(invitesRes.data.data || []);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to load squads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSquadsAndInvites();
  }, []);

  const onCreateTeamSubmit = async (data: any) => {
    try {
      await api.post('/teams', {
        ...data,
        size: Number(data.size),
      });
      toast.success('Squad created successfully!');
      setIsCreateOpen(false);
      reset();
      fetchSquadsAndInvites();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Failed to create squad.';
      toast.error(msg);
    }
  };

  const handleAcceptInvite = async (invitationId: string) => {
    try {
      await api.post(`/invitations/${invitationId}/accept`);
      toast.success('Squad invitation accepted!');
      fetchSquadsAndInvites();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Could not join squad.';
      toast.error(msg);
    }
  };

  const handleRejectInvite = async (invitationId: string) => {
    try {
      await api.post(`/invitations/${invitationId}/reject`);
      toast.info('Invitation declined.');
      fetchSquadsAndInvites();
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to leave this squad?')) return;
    try {
      await api.post(`/teams/${teamId}/leave`);
      toast.success('You have left the squad.');
      fetchSquadsAndInvites();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Failed to leave squad.';
      toast.error(msg);
    }
  };

  const handleDisbandTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to disband this squad? This cannot be undone.')) return;
    try {
      await api.delete(`/teams/${teamId}`);
      toast.success('Squad disbanded.');
      fetchSquadsAndInvites();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Cannot disband squad.';
      toast.error(msg);
    }
  };

  const handleRemoveMember = async (teamId: string, memberId: string) => {
    if (!confirm('Remove this player from the squad?')) return;
    try {
      await api.post(`/teams/${teamId}/members/${memberId}/remove`);
      toast.success('Member removed.');
      fetchSquadsAndInvites();
    } catch (err: unknown) {
      toast.error('Failed to remove player');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white">
            Squad Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build squads of 2, 4, or 6 players to compete in multi-player championships.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          size="md"
        >
          Create New Squad
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-squads" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="my-squads" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>My Squads</span>
            {teams.length > 0 && (
              <Badge variant="info" size="sm" className="ml-1">
                {teams.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>Invitations</span>
            {invitations.length > 0 && (
              <Badge variant="warning" size="sm" className="ml-1">
                {invitations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── MY SQUADS TAB ────────────────────────────────────────── */}
        <TabsContent value="my-squads">
          {teams.length === 0 && !loading ? (
            <EmptyState
              icon={Users}
              title="You haven't joined a team yet."
              description="Create a squad or search for one to join with your peers."
              actionLabel="Create Squad"
              onAction={() => setIsCreateOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {teams.map((team) => {
                const isLeader = team.leaderId === user?._id;
                const emptySlotsCount = Math.max(0, team.size - team.members.length);

                return (
                  <Card
                    key={team._id}
                    className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      {/* Top squad bar */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold font-display text-slate-900 dark:text-white">
                              {team.name}
                            </h3>
                            {isLeader && (
                              <span title="Squad Leader" className="inline-flex text-amber-500">
                                <Crown className="w-4 h-4 fill-amber-500" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Category: <span className="font-semibold text-brand-blue">{team.category}</span> • League size: {team.size} Players
                          </p>
                        </div>

                        <Badge
                          variant={team.members.length === team.size ? 'success' : 'warning'}
                        >
                          {team.members.length === team.size
                            ? 'Ready to Compete'
                            : `${team.members.length} of ${team.size} members`}
                        </Badge>
                      </div>

                      {team.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                          {team.description}
                        </p>
                      )}

                      {/* Progress bar */}
                      <div className="mt-4 space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Squad Capacity</span>
                          <span>{team.members.length} / {team.size}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-brand-blue rounded-full transition-all duration-300"
                            style={{
                              width: `${(team.members.length / team.size) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Member Slot Visualizer */}
                      <div className="mt-5 space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Squad Lineup
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {/* Filled member slots */}
                          {team.members.map((member) => (
                            <div
                              key={member.userId}
                              className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Avatar name={member.name} src={member.photo} size="sm" />
                                <div className="truncate text-left">
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {member.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 capitalize">
                                    {member.role}
                                  </p>
                                </div>
                              </div>

                              {isLeader && member.role !== 'leader' && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(team._id, member.userId)}
                                  className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                                  title="Remove member"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Empty invite slots */}
                          {Array.from({ length: emptySlotsCount }).map((_, idx) => (
                            <button
                              key={`empty-${idx}`}
                              type="button"
                              onClick={() => {
                                if (isLeader) {
                                  setActiveInviteTeam(team);
                                } else {
                                  toast.info('Only the squad leader can invite players.');
                                }
                              }}
                              className="p-2.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-blue/50 dark:hover:border-brand-blue/50 flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-brand-blue transition-colors group cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                              <span>{isLeader ? 'Invite' : 'Open Slot'}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Squad card footer actions */}
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      {isLeader ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setActiveInviteTeam(team)}
                            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                            disabled={team.members.length >= team.size}
                          >
                            Invite Players
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDisbandTeam(team._id)}
                            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          >
                            Disband
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-slate-400">
                            Member since {new Date(team.members.find(m => m.userId === user?._id)?.joinedAt || '').toLocaleDateString('en-IN')}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLeaveTeam(team._id)}
                            className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            leftIcon={<LogOut className="w-3.5 h-3.5" />}
                          >
                            Leave Squad
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── RECEIVED INVITATIONS TAB ──────────────────────────────── */}
        <TabsContent value="invitations">
          {invitations.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="You're all caught up."
              description="You have no pending squad invitations at the moment."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invitations.map((inv) => (
                <Card
                  key={inv._id}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={inv.senderId?.name} src={inv.senderId?.photo} size="lg" />
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {inv.teamId?.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Invited by <span className="font-semibold text-slate-700 dark:text-slate-300">{inv.senderId?.name}</span>
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="info" size="sm">
                          {inv.teamId?.category}
                        </Badge>
                        <span className="text-[11px] text-slate-400">
                          {inv.teamId?.currentMemberCount} / {inv.teamId?.size} players
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvite(inv._id)}
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRejectInvite(inv._id)}
                      className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      Decline
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── CREATE SQUAD MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create a New Squad"
        description="Assemble your team for multiplayer quiz competitions."
      >
        <form onSubmit={handleSubmit(onCreateTeamSubmit)} className="space-y-4 pt-2">
          <Input
            label="Squad Name"
            placeholder="e.g. Aryabhata Scholars"
            required
            {...register('name', { required: true, minLength: 2, maxLength: 50 })}
          />

          <Input
            label="Description (Optional)"
            placeholder="What brings your squad together?"
            {...register('description')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Education Category" {...register('category')}>
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

            <Select label="Squad Size" {...register('size')}>
              <option value={2}>2 Players (Duo)</option>
              <option value={4}>4 Players (Standard)</option>
              <option value={6}>6 Players (Mega Squad)</option>
            </Select>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create Squad
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── PLAYER SEARCH MODAL ───────────────────────────────────── */}
      {activeInviteTeam && (
        <PlayerSearchModal
          isOpen={!!activeInviteTeam}
          onClose={() => setActiveInviteTeam(null)}
          teamId={activeInviteTeam._id}
          category={activeInviteTeam.category}
          onInviteSent={() => fetchSquadsAndInvites()}
        />
      )}
    </div>
  );
}
