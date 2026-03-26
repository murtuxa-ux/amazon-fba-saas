'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

const EVENT_TYPES = {
  price_alert: { label: 'Price Alert', color: '#ff6b6b', bgColor: '#3d1616' },
  stock_alert: { label: 'Stock Alert', color: '#ffa94d', bgColor: '#3d2a15' },
  bsr_change: { label: 'BSR Change', color: '#4dabf7', bgColor: '#1a2d4d' },
  scout_complete: { label: 'Scout Complete', color: '#51cf66', bgColor: '#1d3d1f' },
  report_ready: { label: 'Report Ready', color: '#b197fc', bgColor: '#2d1d3d' },
  system_message: { label: 'System', color: '#FFD700', bgColor: '#3d3d1a' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [error, setError] = useState(null);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);

  // Fetch notification history on mount
  useEffect(() => {
    const fetchNotificationHistory = async () => {
      try {
        const token = localStorage.getItem('ecomera_token');
        if (!token) return;

        const response = await fetch(`${API_URL}/notifications/recent`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setNotificationHistory(data.notifications || []);
          // Also add to main notifications if empty
          if (notifications.length === 0 && data.notifications) {
            setNotifications(data.notifications.slice(0, 10));
          }
        }
      } catch (err) {
        console.error('Failed to fetch notification history:', err);
      }
    };

    fetchNotificationHistory();
  }, []);

  // WebSocket connection effect
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const token = localStorage.getItem('ecomera_token');
        if (!token) {
          setError('Authentication required for real-time notifications');
          return;
        }

        setConnectionStatus('connecting');

        // Convert HTTP/HTTPS to WS/WSS
        const wsUrl = new URL(API_URL);
        const protocol = wsUrl.protocol === 'https:' ? 'wss' : 'ws';
        const wsUri = `${protocol}://${wsUrl.host}/ws/${token}`;

        wsRef.current = new WebSocket(wsUri);

        wsRef.current.onopen = () => {
          setConnectionStatus('connected');
          setError(null);
          reconnectAttemptsRef.current = 0;
        };

        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            handleNewNotification(message);
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        wsRef.current.onerror = (event) => {
          console.error('WebSocket error:', event);
          setConnectionStatus('disconnected');
          setError('WebSocket connection error');
        };

        wsRef.current.onclose = () => {
          setConnectionStatus('disconnected');
          attemptReconnect();
        };
      } catch (err) {
        console.error('WebSocket connection failed:', err);
        setError('Failed to establish real-time connection');
        setConnectionStatus('disconnected');
        attemptReconnect();
      }
    };

    const attemptReconnect = () => {
      // Exponential backoff: 2s, 4s, 8s, 16s, max 60s
      const baseDelay = 2000;
      const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), 60000);
      reconnectAttemptsRef.current++;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, delay);
    };

    connectWebSocket();

    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const handleNewNotification = (message) => {
    const notification = {
      id: `${Date.now()}_${Math.random()}`,
      type: message.event_type || 'system_message',
      title: message.title || 'Notification',
      message: message.message || '',
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [notification, ...prev]);
  };

  const dismissNotification = (notificationId) => {
    setNotifications((prev) =>
      prev.filter((n) => n.id !== notificationId)
    );
  };

  const markAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#51cf66';
      case 'connecting':
        return '#ffa94d';
      case 'disconnected':
        return '#ff6b6b';
      default:
        return '#888';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
    },
    mainContent: {
      flex: 1,
      marginLeft: '250px',
      padding: '40px',
      overflowY: 'auto',
    },
    pageHeader: {
      marginBottom: '30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerLeft: {
      flex: 1,
    },
    title: {
      color: '#FFFFFF',
      fontSize: '32px',
      fontWeight: 'bold',
      margin: '0 0 8px 0',
    },
    subtitle: {
      color: '#888',
      fontSize: '14px',
      margin: '0',
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    statusIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '6px',
    },
    statusDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: getConnectionStatusColor(),
    },
    statusText: {
      color: getConnectionStatusColor(),
      fontSize: '12px',
      fontWeight: '600',
    },
    markAllButton: {
      padding: '8px 16px',
      backgroundColor: '#FFD700',
      color: '#0A0A0A',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    markAllButtonHover: {
      backgroundColor: '#FFE44D',
      transform: 'translateY(-2px)',
    },
    errorMessage: {
      backgroundColor: '#3d1616',
      color: '#ff6b6b',
      padding: '12px 16px',
      borderRadius: '6px',
      marginBottom: '20px',
      border: '1px solid #7a2a2a',
      fontSize: '14px',
    },
    notificationsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    notificationCard: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      gap: '12px',
      transition: 'all 0.2s ease',
    },
    notificationCardHover: {
      borderColor: '#FFD700',
      backgroundColor: '#141414',
    },
    eventBadge: {
      padding: '6px 12px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '600',
      whiteSpace: 'nowrap',
      height: 'fit-content',
    },
    notificationContent: {
      flex: 1,
      minWidth: 0,
    },
    notificationTitle: {
      color: '#FFFFFF',
      fontSize: '15px',
      fontWeight: '600',
      marginBottom: '4px',
    },
    notificationMessage: {
      color: '#888',
      fontSize: '13px',
      lineHeight: '1.4',
      marginBottom: '8px',
    },
    notificationTimestamp: {
      color: '#666',
      fontSize: '12px',
    },
    dismissButton: {
      padding: '6px 10px',
      backgroundColor: 'transparent',
      color: '#666',
      border: '1px solid #1E1E1E',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      transition: 'all 0.2s ease',
    },
    dismissButtonHover: {
      color: '#ff6b6b',
      borderColor: '#ff6b6b',
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#888',
    },
    emptyStateIcon: {
      fontSize: '48px',
      marginBottom: '16px',
    },
    emptyStateText: {
      fontSize: '16px',
      marginBottom: '8px',
    },
    emptyStateSubtext: {
      fontSize: '13px',
      color: '#666',
    },
  };

  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainContent}>
        <div style={styles.pageHeader}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>Notifications</h1>
            <p style={styles.subtitle}>
              Real-time alerts and updates for your FBA business
            </p>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.statusIndicator}>
              <div style={styles.statusDot}></div>
              <span style={styles.statusText}>{getConnectionStatusText()}</span>
            </div>
            {notifications.length > 0 && (
              <button
                style={styles.markAllButton}
                onClick={markAllRead}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#FFE44D';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#FFD700';
                  e.target.style.transform = 'none';
                }}
              >
                Mark All Read
              </button>
            )}
          </div>
        </div>

        {error && connectionStatus === 'disconnected' && (
          <div style={styles.errorMessage}>
            <strong>Connection Error:</strong> {error}. Attempting to reconnect...
          </div>
        )}

        {notifications.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyStateIcon}>🔔</div>
            <p style={styles.emptyStateText}>No notifications yet</p>
            <p style={styles.emptyStateSubtext}>
              {connectionStatus === 'connected'
                ? 'Notifications will appear here when you receive alerts'
                : 'Waiting for real-time connection...'}
            </p>
          </div>
        ) : (
          <div style={styles.notificationsList}>
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onDismiss={dismissNotification}
                styles={styles}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationCard({ notification, onDismiss, styles }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isDismissHovered, setIsDismissHovered] = React.useState(false);

  const eventInfo = EVENT_TYPES[notification.type] || EVENT_TYPES.system_message;

  const getRelativeTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      style={{
        ...styles.notificationCard,
        ...(isHovered && styles.notificationCardHover),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          ...styles.eventBadge,
          backgroundColor: eventInfo.bgColor,
          color: eventInfo.color,
        }}
      >
        {eventInfo.label}
      </div>

      <div style={styles.notificationContent}>
        <div style={styles.notificationTitle}>{notification.title}</div>
        <div style={styles.notificationMessage}>{notification.message}</div>
        <div style={styles.notificationTimestamp}>
          {getRelativeTime(notification.timestamp)}
        </div>
      </div>

      <button
        style={{
          ...styles.dismissButton,
          ...(isDismissHovered && styles.dismissButtonHover),
        }}
        onClick={() => onDismiss(notification.id)}
        onMouseEnter={() => setIsDismissHovered(true)}
        onMouseLeave={() => setIsDismissHovered(false)}
      >
        ✕
      </button>
    </div>
  );
}
