import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const REFRESH_TOKEN_KEY = 'gyan26_refresh_token';

/**
 * Retrieve stored refresh token on native platform (or null on web).
 */
export async function getStoredRefreshToken(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
      return value || null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Persist or remove refresh token securely on native platform.
 */
export async function setStoredRefreshToken(token: string | null): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      if (token) {
        await Preferences.set({ key: REFRESH_TOKEN_KEY, value: token });
      } else {
        await Preferences.remove({ key: REFRESH_TOKEN_KEY });
      }
    } catch (err) {
      console.warn('Failed to persist refresh token to native preferences:', err);
    }
  }
}
