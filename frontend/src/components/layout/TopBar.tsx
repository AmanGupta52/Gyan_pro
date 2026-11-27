import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell, GraduationCap, History, LogOut, Moon, Shield, Sparkles, Sun, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const links = [
  { to: '/dashboard', label: 'Home' },
  { to: '/competitions', label: 'Compete' },
  { to: '/quizzes', label: 'Quizzes' },
  { to: '/teams', label: 'Teams' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/certificates', label: 'Certificates' },
];

/**
 * Floating transparent glass top bar. On phones only the brand + actions show
 * (primary navigation moves to the floating bottom bar).
 */
export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadCount();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const isAdmin = user?.role === 'admin' || user?.role === 'superAdmin';
  const isStaff = isAdmin || user?.role === 'teacher';

  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('gyan_theme', next ? 'dark' : 'light');
    setIsDark(next);
  };

  const iconBtn =
    'relative grid h-11 w-11 place-items-center rounded-full text-slate-700 dark:text-slate-200 ' +
    'hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-electric-500/60';

  return (
    <header className="sticky top-[env(safe-area-inset-top)] z-40 px-3 pt-3 sm:px-6">
      <div className="glass-nav mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 rounded-full pl-3 pr-2">
        <Link to="/dashboard" className="flex items-center gap-2.5 rounded-full pr-2 outline-none focus-visible:ring-2 focus-visible:ring-electric-500/60">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-electric-400 to-electric-600 font-display text-lg font-extrabold text-white shadow-md">
            G
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-navy-900 dark:text-white">
            GYAN<span className="text-electric-500">-26</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-electric-500/60',
                  isActive
                    ? 'bg-electric-500 text-white shadow'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/10'
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button type="button" onClick={toggleTheme} className={iconBtn} aria-label="Toggle dark mode">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <Link to="/notifications" className={iconBtn} aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}>
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white dark:ring-navy-900">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>

          {user && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="ml-1 rounded-full p-0.5 outline-none ring-2 ring-transparent transition hover:ring-electric-500/50 focus-visible:ring-electric-500"
                  aria-label="Account menu"
                >
                  <Avatar name={user.name} src={user.photo} size="sm" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={10}
                  className="glass-nav z-50 w-60 rounded-3xl p-2 text-sm"
                >
                  <div className="px-3 py-2">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{user.name}</p>
                    <p className="truncate text-xs text-slate-600 dark:text-slate-300">{user.email}</p>
                    <div className="mt-1.5 flex gap-1.5">
                      <Badge variant="info" size="sm">{user.educationLevel}</Badge>
                      {user.role !== 'player' && <Badge variant="warning" size="sm">{user.role}</Badge>}
                    </div>
                  </div>
                  <DropdownMenu.Separator className="my-1 h-px bg-slate-900/10 dark:bg-white/10" />
                  {[
                    { to: '/profile', label: 'My Profile', Icon: UserIcon },
                    { to: '/history', label: 'Match History', Icon: History },
                    { to: '/support', label: 'Support GYAN-26', Icon: Sparkles },
                    ...(isStaff ? [{ to: '/studio', label: 'Quiz Studio', Icon: GraduationCap }] : []),
                    ...(isAdmin ? [{ to: '/admin', label: 'Admin Panel', Icon: Shield }] : []),
                  ].map(({ to, label, Icon }) => (
                    <DropdownMenu.Item key={to} asChild>
                      <Link to={to} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-2xl px-3 text-slate-800 outline-none data-[highlighted]:bg-electric-500/10 dark:text-slate-100">
                        <Icon className="h-4 w-4 text-electric-500" />
                        {label}
                      </Link>
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Separator className="my-1 h-px bg-slate-900/10 dark:bg-white/10" />
                  <DropdownMenu.Item
                    onSelect={async () => {
                      await logout();
                      navigate('/auth');
                    }}
                    className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-2xl px-3 text-rose-700 outline-none data-[highlighted]:bg-rose-500/10 dark:text-rose-300"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
      </div>
    </header>
  );
}
