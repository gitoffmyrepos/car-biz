'use client';

/**
 * GigWheels - Customer Notifications Center
 * Weekly car rentals for gig drivers
 *
 * Displays customer notifications with read/unread status.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useNotificationWebSocket, WebSocketNotification } from '@/hooks/useNotificationWebSocket';
import { apiBaseUrl } from '@/lib/api';

const API_BASE_URL = apiBaseUrl();

interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  action_label: string | null;
  created_at: string;
}

interface NotificationListResponse {
  notifications: Notification[];
  total_count: number;
  unread_count: number;
}

// Map notification types to icons and colors
const notificationStyles: Record<string, { icon: string; color: string }> = {
  welcome: { icon: '👋', color: 'bg-blue-100 text-blue-600' },
  insurance_pending: { icon: '📄', color: 'bg-amber-100 text-amber-600' },
  insurance_approved: { icon: '✅', color: 'bg-green-100 text-green-600' },
  insurance_rejected: { icon: '❌', color: 'bg-red-100 text-red-600' },
  insurance_expiring: { icon: '⚠️', color: 'bg-amber-100 text-amber-600' },
  vehicle_request_received: { icon: '🚗', color: 'bg-blue-100 text-blue-600' },
  vehicle_request_approved: { icon: '✅', color: 'bg-green-100 text-green-600' },
  vehicle_assigned: { icon: '🎉', color: 'bg-green-100 text-green-600' },
  payment_due_reminder: { icon: '💰', color: 'bg-amber-100 text-amber-600' },
  payment_overdue: { icon: '🚨', color: 'bg-red-100 text-red-600' },
  payment_received: { icon: '💳', color: 'bg-blue-100 text-blue-600' },
  payment_verified: { icon: '✅', color: 'bg-green-100 text-green-600' },
  payment_rejected: { icon: '❌', color: 'bg-red-100 text-red-600' },
  general_info: { icon: 'ℹ️', color: 'bg-gray-100 text-gray-600' },
  default: { icon: '🔔', color: 'bg-gray-100 text-gray-600' },
};

// Priority badges
const priorityBadges: Record<string, string> = {
  urgent: 'bg-red-500 text-white',
  high: 'bg-amber-500 text-white',
  normal: 'bg-gray-200 text-gray-700',
  low: 'bg-gray-100 text-gray-500',
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  const isLoggingOut = useRef(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // WebSocket for real-time updates
  const {
    isConnected: wsConnected,
    unreadCount: wsUnreadCount,
    setOnNotification,
    setOnUnreadCountChange,
    markAsRead: wsMarkAsRead,
    markAllAsRead: wsMarkAllAsRead,
  } = useNotificationWebSocket();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoggingOut.current) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Handle new notifications from WebSocket
  const handleNewNotification = useCallback((wsNotification: WebSocketNotification) => {
    // Convert WebSocket notification to local notification format
    const newNotification: Notification = {
      id: wsNotification.id,
      notification_type: wsNotification.notification_type,
      title: wsNotification.title,
      message: wsNotification.message,
      priority: wsNotification.priority,
      is_read: wsNotification.is_read,
      read_at: null,
      action_url: wsNotification.action_url,
      action_label: wsNotification.action_label,
      created_at: wsNotification.created_at,
    };

    // Add to the beginning of the list (newest first)
    setNotifications((prev) => [newNotification, ...prev]);
    setTotalCount((prev) => prev + 1);
  }, []);

  // Handle unread count updates from WebSocket
  const handleUnreadCountChange = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  // Set up WebSocket callbacks
  useEffect(() => {
    setOnNotification(handleNewNotification);
    setOnUnreadCountChange(handleUnreadCountChange);
    return () => {
      setOnNotification(null);
      setOnUnreadCountChange(null);
    };
  }, [handleNewNotification, handleUnreadCountChange, setOnNotification, setOnUnreadCountChange]);

  // Sync WebSocket unread count on initial connection
  useEffect(() => {
    if (wsConnected && wsUnreadCount !== undefined) {
      setUnreadCount(wsUnreadCount);
    }
  }, [wsConnected, wsUnreadCount]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    setIsLoadingData(true);
    setError(null);

    try {
      const url = new URL(`${API_BASE_URL}/customer/notifications`);
      if (filter === 'unread') {
        url.searchParams.set('unread_only', 'true');
      }

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data: NotificationListResponse = await response.json();
        setNotifications(data.notifications);
        setTotalCount(data.total_count);
        setUnreadCount(data.unread_count);
      } else {
        setError('Failed to load notifications');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoadingData(false);
    }
  }, [token, filter]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchNotifications();
    }
  }, [isAuthenticated, token, fetchNotifications]);

  // Mark notification as read
  const markAsRead = async (notificationId: number) => {
    if (!token) return;

    // Also notify via WebSocket for real-time sync
    wsMarkAsRead(notificationId);

    try {
      const response = await fetch(
        `${API_BASE_URL}/customer/notifications/${notificationId}/read`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read');
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!token) return;

    // Also notify via WebSocket for real-time sync
    wsMarkAllAsRead();

    try {
      const response = await fetch(`${API_BASE_URL}/customer/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read');
    }
  };

  // Handle logout
  const handleLogout = () => {
    isLoggingOut.current = true;
    logout();
    router.push('/');
  };

  // Get style for notification type
  const getNotificationStyle = (type: string) => {
    return notificationStyles[type] || notificationStyles.default;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Loading state
  if (isLoading || (!isAuthenticated && !isLoggingOut.current)) {
    return (
      <div className="min-h-screen bg-luxury-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
          <p className="mt-4 text-charcoal/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-cream">
      {/* Header */}
      <header className="bg-charcoal text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-gold">FX</span>
              <span className="text-white font-semibold">Weekly</span>
            </Link>

            <nav className="flex items-center gap-6">
              <Link href="/dashboard" className="text-white/80 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link
                href="/notifications"
                className="text-gold hover:text-gold/80 transition-colors font-medium"
              >
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <span className="text-white/60">
                Welcome, {user?.name || user?.email || 'Customer'}
              </span>
              <button
                onClick={handleLogout}
                className="text-white/80 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-charcoal">Notifications</h1>
              {/* Real-time connection indicator */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                  wsConnected
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
                title={wsConnected ? 'Real-time updates active' : 'Connecting...'}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`}
                />
                {wsConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <p className="text-charcoal/60 mt-1">
              {totalCount === 0
                ? 'No notifications yet'
                : `${unreadCount} unread of ${totalCount} total`}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Filter Buttons */}
            <div className="flex bg-white rounded-lg shadow-sm">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-gold text-white'
                    : 'text-charcoal/70 hover:bg-gray-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                  filter === 'unread'
                    ? 'bg-gold text-white'
                    : 'text-charcoal/70 hover:bg-gray-100'
                }`}
              >
                Unread
              </button>
            </div>

            {/* Mark All Read Button */}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 text-sm font-medium text-gold hover:text-gold/80 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoadingData && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto"></div>
            <p className="mt-4 text-charcoal/60">Loading notifications...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingData && notifications.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-xl font-semibold text-charcoal mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-charcoal/60">
              {filter === 'unread'
                ? "You're all caught up!"
                : "We'll notify you about important updates here."}
            </p>
            {filter === 'unread' && totalCount > 0 && (
              <button
                onClick={() => setFilter('all')}
                className="mt-4 text-gold hover:text-gold/80 font-medium"
              >
                View all notifications
              </button>
            )}
          </div>
        )}

        {/* Notifications List */}
        {!isLoadingData && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const style = getNotificationStyle(notification.notification_type);

              return (
                <div
                  key={notification.id}
                  className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md ${
                    !notification.is_read ? 'border-l-4 border-gold' : ''
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${style.color}`}
                      >
                        {style.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3
                              className={`text-lg font-semibold ${
                                notification.is_read ? 'text-charcoal/80' : 'text-charcoal'
                              }`}
                            >
                              {notification.title}
                              {notification.priority !== 'normal' && (
                                <span
                                  className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    priorityBadges[notification.priority]
                                  }`}
                                >
                                  {notification.priority === 'urgent' ? 'Urgent' : 'High Priority'}
                                </span>
                              )}
                            </h3>
                            <p
                              className={`mt-1 ${
                                notification.is_read ? 'text-charcoal/50' : 'text-charcoal/70'
                              }`}
                            >
                              {notification.message}
                            </p>
                          </div>

                          <span className="text-sm text-charcoal/50 whitespace-nowrap">
                            {formatDate(notification.created_at)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 flex items-center gap-4">
                          {notification.action_url && notification.action_label && (
                            <Link
                              href={notification.action_url}
                              onClick={() => !notification.is_read && markAsRead(notification.id)}
                              className="inline-flex items-center px-4 py-2 bg-gold text-white text-sm font-medium rounded-lg hover:bg-gold/90 transition-colors"
                            >
                              {notification.action_label}
                            </Link>
                          )}

                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-sm text-charcoal/50 hover:text-charcoal/70 transition-colors"
                            >
                              Mark as read
                            </button>
                          )}

                          {notification.is_read && notification.read_at && (
                            <span className="text-xs text-charcoal/40">
                              Read {formatDate(notification.read_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <div className="w-3 h-3 bg-gold rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Back to Dashboard Link */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="text-gold hover:text-gold/80 font-medium transition-colors"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-charcoal text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gold font-bold">FX</span>
              <span className="font-semibold">Weekly</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/60">
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/gps-disclosure" className="hover:text-white transition-colors">
                GPS Disclosure
              </Link>
            </div>

            <div className="text-sm text-white/40">
              &copy; {new Date().getFullYear()} GigWheels. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
