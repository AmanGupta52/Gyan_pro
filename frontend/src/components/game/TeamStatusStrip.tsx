import { Check, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import type { GameMember } from '@/types';

interface TeamStatusStripProps {
  members: GameMember[];
  currentUserId?: string;
}

export function TeamStatusStrip({ members, currentUserId }: TeamStatusStripProps) {
  return (
    <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Squad Real-Time Status ({members.length})
        </span>
        <span className="text-[10px] text-slate-400 font-medium">
          Authoritative Sync Active
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {members.map((member) => {
          const isMe = member.userId === currentUserId;
          const isAnswered = member.status === 'answered';
          const isThinking = member.status === 'thinking';
          const isReady = member.status === 'ready';
          const isDisconnected = member.status === 'disconnected';

          return (
            <div
              key={member.userId}
              className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
                isMe
                  ? 'border-brand-blue/40 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-brand-blue/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40'
              }`}
            >
              <div className="relative">
                <Avatar
                  src={member.avatar}
                  name={member.name}
                  size="sm"
                  className="w-8 h-8 rounded-lg"
                />
                {member.role === 'leader' && (
                  <span
                    className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 shadow-sm"
                    title="Squad Leader"
                  >
                    <ShieldCheck className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {member.name}
                  </p>
                  {isMe && (
                    <span className="text-[10px] font-bold text-brand-blue">
                      (You)
                    </span>
                  )}
                </div>

                <div className="mt-0.5">
                  {isAnswered && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Answered</span>
                    </span>
                  )}
                  {isThinking && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 animate-pulse">
                      <Clock className="w-3 h-3" />
                      <span>Thinking...</span>
                    </span>
                  )}
                  {isReady && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                      <Check className="w-3 h-3" />
                      <span>Ready</span>
                    </span>
                  )}
                  {isDisconnected && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Offline</span>
                    </span>
                  )}
                  {member.status === 'connected' && (
                    <span className="text-[10px] font-medium text-slate-400">
                      Connected
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
