import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext';

/**
 * Convenience hook for accessing the auth context.
 * Throws if used outside of `<AuthProvider>`.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
