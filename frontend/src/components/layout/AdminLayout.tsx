import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Trophy,
  HelpCircle,
  Users,
  ShieldCheck,
  FileText,
  GraduationCap,
  ClipboardList,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/Badge';

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  /** Custom "is this the active page" check; defaults to prefix match */
  match?: (pathname: string) => boolean;
}

/**
 * One layout, two workspaces:
 *  - mode="admin":  /admin/*   (admin + superAdmin) competitions, users, audit
 *  - mode="studio": /studio/*  (teacher + admin + superAdmin) quizzes & questions
 */
export function AdminLayout({ mode = 'admin' }: { mode?: 'admin' | 'studio' }) {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSuperAdmin = user?.role === 'superAdmin';
  const isModerator = user?.role === 'admin' || isSuperAdmin;

  const adminItems: NavItem[] = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard, match: (p) => p === '/admin' },
    { label: 'Competitions', path: '/admin/competitions', icon: Trophy },
    { label: 'Question Bank', path: '/admin/questions', icon: HelpCircle },
    { label: 'Quizzes', path: '/studio', icon: ClipboardList, match: () => false },
    ...(isSuperAdmin ? [{ label: 'Teachers', path: '/admin/teachers', icon: GraduationCap }] : []),
    { label: 'Users & Roles', path: '/admin/users', icon: Users },
    { label: 'Audit Trail', path: '/admin/audit-logs', icon: FileText },
  ];

  const studioItems: NavItem[] = [
    {
      label: isModerator ? 'All Quizzes' : 'My Quizzes',
      path: '/studio',
      icon: ClipboardList,
      match: (p) => p === '/studio' || p.startsWith('/studio/quizzes'),
    },
    {
      label: 'Classes',
      path: '/studio/classes',
      icon: GraduationCap,
      match: (p) => p.startsWith('/studio/classes') || p.startsWith('/studio/assignments'),
    },
    { label: 'Question Bank', path: '/studio/questions', icon: HelpCircle },
    ...(isModerator ? [{ label: 'Admin Panel', path: '/admin', icon: ShieldCheck, match: () => false }] : []),
  ];

  const navItems = mode === 'admin' ? adminItems : studioItems;
  const roleLabel = mode === 'admin' ? 'Admin' : user?.role === 'teacher' ? 'Teacher' : 'Studio';
  const subtitle = mode === 'admin' ? 'Control Center' : 'Quiz Studio';

  return (
    <div className="app-bg flex">
      {/* ── DESKTOP SIDEBAR ────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-navy-900 border-r border-slate-200 dark:border-slate-800 p-5 justify-between">
        <div className="space-y-6">
          {/* Logo / Admin Header */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
              G
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold font-display text-slate-900 dark:text-white">
                  GYAN-26
                </span>
                <Badge variant="warning" size="sm">
                  {roleLabel}
                </Badge>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">{subtitle}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.match
                ? item.match(location.pathname)
                : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: User & Return to Portal */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="px-2 py-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {user?.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-blue" />
              <span className="text-[11px] text-slate-600 dark:text-slate-400 capitalize">
                {user?.role} Access
              </span>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Student App</span>
          </Link>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <div className="lg:hidden h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-navy-900/80 backdrop-blur-md px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="font-bold font-display text-slate-900 dark:text-white">
              GYAN-26 {roleLabel}
            </span>
          </div>

          <Link
            to="/dashboard"
            className="text-xs text-brand-blue font-semibold hover:underline"
          >
            Exit to App →
          </Link>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="lg:hidden bg-white dark:bg-navy-900 border-b border-slate-200 dark:border-slate-800 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Content Container */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
