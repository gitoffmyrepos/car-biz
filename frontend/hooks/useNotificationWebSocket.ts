'use client';

/**
 * Weekly Vehicle Leasing Platform - WebSocket Notifications Hook
 * Salvage-to-Lux Fleet Management
 *
 * Custom React hook for real-time notifications via WebSocket.
 * Handles connection, reconnection, and message processing.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { apiWebSocketBaseUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';

// WebSocket URL - uses same host as API but with ws:// protocol
const WS_BASE_URL = apiWebSocketBaseUrl();

// Notification data from WebSocket
export interface WebSocketNotification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  priority: string;
  action_url: string | null;
  action_label: string | null;
  created_at: string;
  is_read: boolean;
}

// Message types from server
interface NotificationMessage {
  type: 'notification';
  data: WebSocketNotification;
}

interface NotificationCountMessage {
  type: 'notification_count';
  data: { unread_count: number };
}

interface PingMessage {
  type: 'ping';
  data: { timestamp: string };
}

type WebSocketMessage = NotificationMessage | NotificationCountMessage | PingMessage;

// Hook state
interface NotificationWebSocketState {
  isConnected: boolean;
  unreadCount: number;
  latestNotification: WebSocketNotification | null;
  error: string | null;
}

// Reconnection settings
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useNotificationWebSocket() {
  const { token, isAuthenticated } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<NotificationWebSocketState>({
    isConnected: false,
    unreadCount: 0,
    latestNotification: null,
    error: null,
  });

  // Callbacks for external listeners
  const onNotificationRef = useRef<((notification: WebSocketNotification) => void) | null>(null);
  const onUnreadCountChangeRef = useRef<((count: number) => void) | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const wsUrl = `${WS_BASE_URL}/ws/notifications?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] Connected to notifications');
        reconnectAttemptsRef.current = 0;
        setState((prev) => ({ ...prev, isConnected: true, error: null }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'notification':
              setState((prev) => ({
                ...prev,
                latestNotification: message.data,
              }));
              onNotificationRef.current?.(message.data);
              break;

            case 'notification_count':
              setState((prev) => ({
                ...prev,
                unreadCount: message.data.unread_count,
              }));
              onUnreadCountChangeRef.current?.(message.data.unread_count);
              break;

            case 'ping':
              // Respond with pong
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'pong' }));
              }
              break;

            default:
              console.log('[WebSocket] Unknown message type:', message);
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setState((prev) => ({ ...prev, error: 'WebSocket connection error' }));
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        setState((prev) => ({ ...prev, isConnected: false }));
        wsRef.current = null;

        // Attempt reconnection if not a clean close
        if (event.code !== 1000 && event.code !== 1008) {
          scheduleReconnect();
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WebSocket] Failed to connect:', err);
      setState((prev) => ({ ...prev, error: 'Failed to connect to WebSocket' }));
      scheduleReconnect();
    }
  }, [token]);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.log('[WebSocket] Max reconnection attempts reached');
      setState((prev) => ({ ...prev, error: 'Unable to connect. Please refresh the page.' }));
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttemptsRef.current);
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      connect();
    }, delay);
  }, [connect]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setState((prev) => ({ ...prev, isConnected: false }));
  }, []);

  // Mark notification as read via WebSocket
  const markAsRead = useCallback((notificationId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'mark_read',
          data: { notification_id: notificationId },
        })
      );
    }
  }, []);

  // Mark all notifications as read via WebSocket
  const markAllAsRead = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'mark_all_read' }));
    }
  }, []);

  // Set callbacks for notifications
  const setOnNotification = useCallback(
    (callback: ((notification: WebSocketNotification) => void) | null) => {
      onNotificationRef.current = callback;
    },
    []
  );

  const setOnUnreadCountChange = useCallback(
    (callback: ((count: number) => void) | null) => {
      onUnreadCountChangeRef.current = callback;
    },
    []
  );

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, token, connect, disconnect]);

  // Clear latest notification after it's been handled
  const clearLatestNotification = useCallback(() => {
    setState((prev) => ({ ...prev, latestNotification: null }));
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    setOnNotification,
    setOnUnreadCountChange,
    clearLatestNotification,
  };
}

export default useNotificationWebSocket;
