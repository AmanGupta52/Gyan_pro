import { NavLink } from 'react-router-dom';
import { Home, Swords, Trophy, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/dashboard', label: 'Home', Icon: Home },
  { to: '/competitions', label: 'Compete', Icon: Swords },
  { to: '/teams', label: 'Teams', Icon: Users },
  { to: '/leaderboard', label: 'Ranks', Icon: Trophy },
  { to: '/profile', label: 'Profile', Icon: User },
];

/** Floating glass bottom navigation — phones/tablets only (hidden from `md` up). */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden pointer-events-none"
    >
      <ul className="glass-nav pointer-events-auto flex w-full max-w-md items-center justify-between rounded-full p-1.5">
        {items.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-bold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-electric-500/60',
                  isActive
                    ? 'bg-gradient-to-b from-electric-400 to-electric-600 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-300'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} aria-hidden />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
