import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getStoredRefreshToken, setStoredRefreshToken } from '@/lib/storage';

/* ─────────────────────────────────────────────
 * Axios instance for the GYAN-26 API.
 *
 * • Base URL from env var (falls back to /api for proxy).
 * • Access token kept **in memory only** — never in localStorage.
 * • Platform-aware: On native platforms, uses stored refresh
 *   token in request body. On web, relies on httpOnly cookies.
 * • 401 responses trigger a silent token refresh, then retry.
 * ───────────────────────────────────────────── */

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly refresh cookie on web
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000, // Render free tier cold starts can take ~50s
});

// ── In-memory token store ─────────────────────

let accessToken: string | null = null;

/** Set the in-memory access token (called after login / refresh). */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Get the current in-memory access token. */
export function getAccessToken(): string | null {
  return accessToken;
}

// ── Request interceptor: attach Bearer token ──

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Response interceptor: handle 401 & refresh ─

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only intercept 401s that haven't already been retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't retry the refresh endpoint itself
    if (originalRequest.url?.includes('/auth/refresh-token')) {
      setAccessToken(null);
      await setStoredRefreshToken(null);
      return Promise.reject(error);
    }

    // If a refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise<string | null>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const storedRefreshToken = await getStoredRefreshToken();
      const payload = storedRefreshToken ? { refreshToken: storedRefreshToken } : {};

      const { data } = await axios.post<{
        data: { accessToken: string; refreshToken?: string };
      }>(
        `${BASE_URL}/auth/refresh-token`,
        payload,
        { withCredentials: true }
      );

      const newToken = data.data.accessToken;
      if (data.data.refreshToken) {
        await setStoredRefreshToken(data.data.refreshToken);
      }
      setAccessToken(newToken);
      processQueue(null, newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      setAccessToken(null);
      await setStoredRefreshToken(null);

      // Redirect to auth page on refresh failure
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
