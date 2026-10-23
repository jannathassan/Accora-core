import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/api';
import type { Notification } from '../../types';
import { fmtDate } from '../../utils/format';
import {
  BellOff,
  CheckCheck,

  TrendingDown,
  TrendingUp,
  DollarSign,
  Sparkles,
  Info,
  Filter,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

const TYPE_CONFIG: Record<
  string,
  { icon: React.FC<{ className?: string }>; bg: string; text: string; label: string }
> = {
  overdue_invoice: {
    icon: DollarSign,
    bg: 'bg-rose-500/10 border-rose-500/20',
    text: 'text-rose-500',
    label: 'Overdue Invoice',
  },
  cashflow_warning: {
    icon: TrendingDown,
    bg: 'bg-rose-500/10 border-rose-500/20',
    text: 'text-rose-500',
    label: 'Cash Runway Warning',
  },
  expense_spike: {
    icon: TrendingUp,
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-500',
    label: 'Spend Anomaly',
  },
  revenue_milestone: {
    icon: TrendingUp,
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-500',
    label: 'Revenue Milestone',
  },
  insight: {
    icon: Sparkles,
    bg: 'bg-purple-500/10 border-purple-500/20',
    text: 'text-purple-500',
    label: 'AI Recommendation',
  },
  general: {
    icon: Info,
    bg: 'bg-[var(--bg-secondary)] border-[var(--border-default)]',
    text: 'text-[var(--text-secondary)]',
    label: 'System Notification',
  },
};

const SEVERITY_BORDER: Record<string, string> = {
  high: 'border-l-4 border-l-rose-500',
  medium: 'border-l-4 border-l-amber-500',
  low: 'border-l-4 border-l-indigo-500',
};

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setError(null);
      const res = await getNotifications();
      setNotifications(res);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      setError(err?.response?.data?.detail || 'Failed to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleItemClick = async (notif: Notification) => {
    if (!notif.read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      try {
        await markNotificationRead(notif.id);
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
    if (notif.action_url) {
      navigate(notif.action_url);
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      loadNotifications();
    }
  };

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Notifications & Risk Alerts
            </h1>
            {unreadCount > 0 ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {unreadCount} Unread
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                All Caught Up
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Real-time financial telemetry alerts, overdue accounts receivable, and cash runway watchpoints
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-xs font-semibold transition-colors"
            >
              <CheckCheck className="w-4 h-4 text-emerald-500" />
              Mark All Read
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors disabled:opacity-50"
            title="Check for new alerts"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadNotifications}
            className="text-xs font-bold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-[var(--text-muted)]" />
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            filter === 'all'
              ? 'bg-[var(--brand-primary)] text-white shadow-sm'
              : 'border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            filter === 'unread'
              ? 'bg-[var(--brand-primary)] text-white shadow-sm'
              : 'border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Syncing workspace risk alerts...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8">
          <BellOff className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications recorded'}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
            {filter === 'unread'
              ? 'You have reviewed all outstanding financial alerts. Normal operating telemetry continues.'
              : 'As your business creates transactions and invoices, automated alerts and runway notices will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.general;
            const Icon = cfg.icon;
            const borderStyle = SEVERITY_BORDER[n.severity] ?? 'border-l-4 border-l-[var(--border-default)]';

            return (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--brand-border)] hover:bg-[var(--bg-card-hover)] transition-all cursor-pointer shadow-sm flex items-start justify-between gap-4 ${borderStyle} ${
                  n.read ? 'opacity-70' : 'bg-[var(--bg-card)]'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.bg}`}
                  >
                    <Icon className={`w-4 h-4 ${cfg.text}`} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[var(--text-primary)] line-clamp-1">
                        {n.title}
                      </h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)] flex-shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                      {n.message}
                    </p>

                    <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                      <span className="capitalize font-medium">{cfg.label}</span>
                      <span>•</span>
                      <span>{fmtDate(n.created_at)}</span>
                      <span>•</span>
                      <span
                        className={`capitalize font-semibold ${
                          n.severity === 'high'
                            ? 'text-rose-500'
                            : n.severity === 'medium'
                            ? 'text-amber-500'
                            : 'text-indigo-500'
                        }`}
                      >
                        {n.severity} Priority
                      </span>
                    </div>
                  </div>
                </div>

                {n.action_url && (
                  <div className="flex items-center text-xs font-semibold text-[var(--brand-primary)] flex-shrink-0 self-center">
                    <span className="hidden sm:inline mr-1">Resolve</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
