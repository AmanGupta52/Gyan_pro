import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 GYAN-26. Kaun Banega Gyanwan Vivekvan Gunwan.</p>
          <p className="flex items-center gap-2">
            <span>Junior KG se PhD Tak</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">India-First Edition (IST)</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
