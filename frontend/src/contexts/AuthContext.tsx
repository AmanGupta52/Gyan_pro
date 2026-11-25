import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import api, { setAccessToken } from '@/config/api';
import { connectSocket, disconnectSocket } from '@/config/socket';
import { getStoredRefreshToken, setStoredRefreshToken } from '@/lib/storage';
import type { AuthPayload, RegisterData, User } from '@/types';

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  /* Helper: persist token to in-memory ref + axios store */
  const storeToken = useCallback((token: string | null) => {
    tokenRef.current = token;
    setAccessToken(token);
  }, []);

  /* ── Refresh session on mount ────────────── */

  // Refresh tokens rotate on every use. React 18 StrictMode runs effects twice in dev,
  // which would fire two refreshes with the same token and trip reuse-detection (logging
  // the user out). Share a single in-flight request instead.
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const refreshUser = useCallback((): Promise<void> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const run = (async () => {
    try {
      const storedRefreshToken = await getStoredRefreshToken();
      const payload = storedRefreshToken ? { refreshToken: storedRefreshToken } : {};

      const { data } = await api.post<{
        data: AuthPayload & { refreshToken?: string };
      }>('/auth/refresh-token', payload);

      const { user: freshUser, accessToken, refreshToken } = data.data;

      if (refreshToken) {
        await setStoredRefreshToken(refreshToken);
      }

      storeToken(accessToken);
      setUser(freshUser);
      connectSocket(accessToken);
    } catch {
      // No valid refresh token / cookie — user is not logged in
      storeToken(null);
      await setStoredRefreshToken(null);
      setUser(null);
      disconnectSocket();
    }
    })().finally(() => {
      refreshInFlight.current = null;
    });
    refreshInFlight.current = run;
    return run;
  }, [storeToken]);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  /* ── Login ───────────────────────────────── */

  const login = useCallback(
    async (identifier: string, password: string) => {
      const { data } = await api.post<{
        data: AuthPayload & { refreshToken?: string };
      }>('/auth/login', {
        identifier,
        password,
      });

      const { user: loggedIn, accessToken, refreshToken } = data.data;

      if (refreshToken) {
        await setStoredRefreshToken(refreshToken);
      }

      storeToken(accessToken);
      setUser(loggedIn);
      connectSocket(accessToken);
    },
    [storeToken]
  );

  /* ── Register ────────────────────────────── */

  const register = useCallback(
    async (payload: RegisterData) => {
      const { data } = await api.post<{
        data: AuthPayload & { refreshToken?: string };
      }>('/auth/register', payload);

      const { user: newUser, accessToken, refreshToken } = data.data;

      if (refreshToken) {
        await setStoredRefreshToken(refreshToken);
      }

      storeToken(accessToken);
      setUser(newUser);
      connectSocket(accessToken);
    },
    [storeToken]
  );

  /* ── Logout ──────────────────────────────── */

  const logout = useCallback(async () => {
    try {
      const storedRefreshToken = await getStoredRefreshToken();
      await api.post('/auth/logout', storedRefreshToken ? { refreshToken: storedRefreshToken } : {});
    } catch {
      // Best-effort; clear client state regardless
    } finally {
      storeToken(null);
      await setStoredRefreshToken(null);
      setUser(null);
      disconnectSocket();
    }
  }, [storeToken]);

  /* ── Context value (memoised) ────────────── */

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
