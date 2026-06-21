'use client';

/**
 * GigWheels - Notification Badge Component
 * Weekly car rentals for gig drivers
 *
 * Real-time notification badge with unread count.
 * Connects to WebSocket for live updates.
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useNotificationWebSocket, WebSocketNotification } from '@/hooks/useNotificationWebSocket';
import { useToast } from '@/components/ui/Toast';

interface NotificationBadgeProps {
  className?: string;
  showLabel?: boolean;
  iconClassName?: string;
}

export function NotificationBadge({
  className = '',
  showLabel = false,
  iconClassName = 'w-5 h-5',
}: NotificationBadgeProps) {
  const toast = useToast();
  const {
    isConnected,
    unreadCount,
    latestNotification,
    clearLatestNotification,
    setOnNotification,
  } = useNotificationWebSocket();

  const [showPulse, setShowPulse] = useState(false);

  // Handle new notification received
  const handleNewNotification = useCallback(
    (notification: WebSocketNotification) => {
      // Show toast for new notifications
      if (notification.priority === 'urgent') {
        toast.error(notification.title, notification.message, { duration: 10000 });
      } else {
        toast.info(notification.title, notification.message, { duration: 5000 });
      }

      // Show pulse animation on badge
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 2000);
    },
    [toast]
  );

  // Set up notification callback
  useEffect(() => {
    setOnNotification(handleNewNotification);
    return () => setOnNotification(null);
  }, [handleNewNotification, setOnNotification]);

  // Clear latest notification when processed
  useEffect(() => {
    if (latestNotification) {
      clearLatestNotification();
    }
  }, [latestNotification, clearLatestNotification]);

  return (
    <Link
      href="/notifications"
      className={`relative inline-flex items-center gap-1 text-gray-300 hover:text-gold transition-colors ${className}`}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      {/* Bell Icon */}
      <div className="relative">
        <svg
          className={iconClassName}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-xs font-bold text-white bg-red-500 rounded-full ${
              showPulse ? 'animate-pulse' : ''
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Connection indicator dot */}
        {isConnected && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-charcoal" />
        )}
      </div>

      {/* Optional Label */}
      {showLabel && <span className="text-sm">Notifications</span>}
    </Link>
  );
}

export default NotificationBadge;
