import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  const { pathname } = useLocation();
  // The live game screen is distraction-free: no site navigation at all.
  const isGameScreen = pathname.startsWith('/game/');

  return (
    <div className="app-bg flex flex-col">
      {!isGameScreen && <TopBar />}
      <main
        className={
          isGameScreen
            ? 'flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4'
            : // extra bottom padding so content clears the floating bottom bar on phones
              'flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-32 md:pb-10'
        }
      >
        <Outlet />
      </main>
      {!isGameScreen && (
        <footer className="hidden md:block px-6 pb-6 text-center text-xs text-slate-600 dark:text-slate-400">
          © 2026 GYAN-26 · Kaun Banega Gyanwan Vivekvan Gunwan · Junior KG se PhD Tak
        </footer>
      )}
      {!isGameScreen && <BottomNav />}
    </div>
  );
}
