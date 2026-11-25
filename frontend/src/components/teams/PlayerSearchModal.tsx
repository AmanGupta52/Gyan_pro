import { useState, useEffect } from 'react';
import { Search, UserPlus, Check, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import api from '@/config/api';

interface PlayerResult {
  _id: string;
  name: string;
  photo?: string;
  educationLevel: string;
  city?: string;
  state?: string;
  email?: string;
  phone?: string;
  isMinor: boolean;
}

interface PlayerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  category: string;
  competitionId?: string;
  onInviteSent?: () => void;
}

export function PlayerSearchModal({
  isOpen,
  onClose,
  teamId,
  category,
  competitionId,
  onInviteSent,
}: PlayerSearchModalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [invitedIds, setInvitedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/users/search', {
          params: {
            q: query.trim(),
            category,
            competitionId,
          },
        });
        setResults(data.data || []);
      } catch (err: unknown) {
        console.error('Failed to search players', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, category, competitionId]);

  const handleInvite = async (playerId: string) => {
    try {
      await api.post('/invitations', {
        teamId,
        receiverId: playerId,
      });

      setInvitedIds((prev) => ({ ...prev, [playerId]: true }));
      toast.success('Invitation sent to player!');
      onInviteSent?.();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Failed to send invitation.';
      toast.error(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Players to Squad"
      description={`Search registered scholars in the ${category} category.`}
    >
      <div className="space-y-4 pt-2">
        {/* Search input field */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type player name, email, or phone (min 2 chars)..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            autoFocus
          />
          {loading && (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400 animate-spin" />
          )}
        </div>

        {/* Results Container */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
          {query.trim().length >= 2 && !loading && results.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No matching players found in this category.
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="py-8 text-center text-xs text-slate-600 dark:text-slate-500">
              Type at least 2 characters to search by name or contact.
            </div>
          )}

          {results.map((player) => {
            const isInvited = invitedIds[player._id];

            return (
              <div
                key={player._id}
                className="pt-2 pb-2 first:pt-0 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={player.name} src={player.photo} size="md" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {player.name}
                      </h4>
                      {player.isMinor && (
                        <span title="DPDP Verified Minor" className="inline-flex">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{player.educationLevel}</span>
                      {player.city && <span>• {player.city}</span>}
                    </div>
                    {player.email && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-500">
                        {player.email}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={isInvited ? 'secondary' : 'primary'}
                  disabled={isInvited}
                  onClick={() => handleInvite(player._id)}
                  leftIcon={
                    isInvited ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )
                  }
                >
                  {isInvited ? 'Invited' : 'Invite'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
