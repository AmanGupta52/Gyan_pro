import { useQuery } from '@tanstack/react-query';
import api from '@/config/api';
import { useAuth } from '@/hooks/useAuth';

/** Real unread-notification count, refreshed every 60s while the tab is visible. */
export function useUnreadCount(): number {
  const { isAuthenticated } = useAuth();
  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await api.get('/notifications', { params: { limit: 1 } });
      return (res.data?.unreadCount as number | undefined) ?? 0;
    },
  });
  return data ?? 0;
}
