import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { WifiOff } from 'lucide-react';

export function NativeAppManager() {
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // ── 1. Status Bar & Splash Screen Styling ───────────────
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#0A192F' }).catch(() => {});
      SplashScreen.hide().catch(() => {});
    }

    // ── 2. Network Status Monitor ────────────────────────────
    Network.getStatus().then((status) => {
      setIsOffline(!status.connected);
    });

    const networkListener = Network.addListener('networkStatusChange', (status) => {
      setIsOffline(!status.connected);
    });

    // ── 3. Deep Linking (App Links & Custom URL Scheme) ──────
    const appUrlListener = CapApp.addListener('appUrlOpen', (event) => {
      try {
        const url = new URL(event.url);
        // Match /verify-certificate/:id
        if (url.pathname.startsWith('/verify-certificate')) {
          navigate(url.pathname);
        } else if (url.host === 'verify-certificate') {
          // Custom scheme gyan26://verify-certificate/:id
          navigate(`/verify-certificate${url.pathname}`);
        }
      } catch {
        // Ignored
      }
    });

    // ── 4. Hardware Back Button Handling ─────────────────────
    const backButtonListener = CapApp.addListener('backButton', ({ canGoBack }) => {
      // If player is in an active live game session, prompt before leaving
      if (window.location.pathname.startsWith('/game/')) {
        const confirmLeave = window.confirm(
          'A live tournament game is currently in progress. Are you sure you want to leave the game arena?'
        );
        if (!confirmLeave) {
          return;
        }
      }

      if (canGoBack) {
        window.history.back();
      } else {
        // At dashboard / auth screen, exit app
        CapApp.exitApp();
      }
    });

    return () => {
      networkListener.then((sub) => sub.remove()).catch(() => {});
      appUrlListener.then((sub) => sub.remove()).catch(() => {});
      backButtonListener.then((sub) => sub.remove()).catch(() => {});
    };
  }, [navigate]);

  return (
    <>
      {/* Offline Connectivity Alert Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-rose-600 text-white px-4 py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top-full duration-300">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>No internet connection. Waiting for network reconnection...</span>
        </div>
      )}
    </>
  );
}
export default NativeAppManager;
