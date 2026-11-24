import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bell,
  Mail,
  UserPlus,
  CheckCircle,
  XCircle,
  Trophy,
  Award,
  Sparkles,
  Check,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import api from '@/config/api';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/notifications');
      setNotifications(data.data || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("You're all caught up.");
    } catch (err: unknown) {
      toast.error('Failed to mark all as read');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'invite':
        return <Mail className="w-4 h-4 text-brand-blue" />;
      case 'request':
        return <UserPlus className="w-4 h-4 text-amber-500" />;
      case 'accept':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'reject':
        return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'registration':
      case 'competition':
        return <Trophy className="w-4 h-4 text-blue-500" />;
      case 'certificate':
        return <Award className="w-4 h-4 text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="warning">{unreadCount} New</Badge>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time updates regarding squad invitations, match countdowns, and results.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleMarkAllAsRead}
            leftIcon={<Check className="w-3.5 h-3.5" />}
          >
            Mark All Read
          </Button>
        )}
      </div>

      {notifications.length === 0 && !loading ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up."
          description="You have no notifications at this time."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n._id}
              className={`p-4 rounded-2xl border transition-colors flex items-start justify-between gap-4 ${
                !n.isRead
                  ? 'bg-blue-50/40 dark:bg-blue-950/20 border-brand-blue/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xs mt-0.5">
                  {getTypeIcon(n.type)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {n.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-[10px] text-slate-400">
                      {new Date(n.createdAt).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    {n.link && (
                      <Link
                        to={n.link}
                        className="text-[11px] font-semibold text-brand-blue hover:underline"
                      >
                        View Details →
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => handleMarkAsRead(n._id)}
                  className="text-xs text-slate-400 hover:text-brand-blue p-1"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
