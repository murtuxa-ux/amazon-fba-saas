import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [connected, setConnected] = useState(false);

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch(`${BASE_URL}/notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      const notificationsList = Array.isArray(data) ? data : (data?.notifications || []);
      setNotifications(notificationsList);
      setConnected(true);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const pollInterval = setInterval(fetchNotifications, 30000);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      await fetch(`${BASE_URL}/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('ecomera_token');
      await fetch(`${BASE_URL}/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const dismissNotification = async (id) => {
    try {
      const token = localStorage.getItem('ecomera_token');
      await fetch(`${BASE_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error dismissing notification:', err);
    }
  };

  const getFilteredNotifications = () => {
    if (filter === 'Unread') {
      return notifications.filter(n => !n.read);
    }
    if (filter === 'Read') {
      return notifications.filter(n => n.read);
    }
    return notifications;
  };

  const filteredNotifications = getFilteredNotifications();

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
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
    } catch (e) {
      return '';
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      order: '📦',
      message: '💬',
      alert: '⚠️',
      success: '✅',
      info: 'ℹ️',
    };
    return icons[type] || '🔔';
  };

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
      color: '#FFFFFF',
    },
    main: {
      flex: 1,
      marginLeft: 250,
      padding: '30px',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      paddingBottom: '20px',
      borderBottom: '1px solid #1E1E1E',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      margin: 0,
    },
    statusIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
    },
    statusDot: {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: connected ? '#22C55E' : '#EF4444',
    },
    button: {
      backgroundColor: '#FFD700',
      color: '#0A0A0A',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    filterTabs: {
      display: 'flex',
      gap: '15px',
      marginBottom: '25px',
      paddingBottom: '15px',
      borderBottom: '1px solid #1E1E1E',
    },
    filterTab: {
      padding: '8px 0',
      backgroundColor: 'transparent',
      border: 'none',
      color: '#888',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      borderBottom: '2px solid transparent',
    },
    filterTabActive: {
      color: '#FFD700',
      borderBottomColor: '#FFD700',
    },
    notificationCard: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      display: 'flex',
      gap: '16px',
      alignItems: 'flex-start',
    },
    notificationIcon: {
      fontSize: '24px',
      flexShrink: 0,
    },
    notificationContent: {
      flex: 1,
    },
    notificationTitle: {
      fontSize: '15px',
      fontWeight: '600',
      marginBottom: '4px',
      color: '#FFFFFF',
    },
    notificationMessage: {
      fontSize: '14px',
      color: '#AAAAAA',
      marginBottom: '8px',
    },
    notificationTimestamp: {
      fontSize: '12px',
      color: '#666',
      marginBottom: '10px',
    },
    notificationActions: {
      display: 'flex',
      gap: '10px',
    },
    smallButton: {
      backgroundColor: 'transparent',
      border: '1px solid #1E1E1E',
      color: '#FFD700',
      padding: '6px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    notificationBadge: {
      display: 'inline-block',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: '#FFD700',
      marginLeft: '8px',
      flexShrink: 0,
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#666',
    },
    emptyStateIcon: {
      fontSize: '48px',
      marginBottom: '16px',
    },
    emptyStateText: {
      fontSize: '16px',
      marginBottom: '8px',
    },
    loadingState: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#666',
    },
  };

  return (
    <div style={styles.container}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Notifications</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={styles.statusIndicator}>
              <div style={styles.statusDot}></div>
              <span>{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <button
              style={styles.button}
              onClick={markAllRead}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#FFC700')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#FFD700')}
            >
              Mark All Read
            </button>
          </div>
        </div>

        <div style={styles.filterTabs}>
          {['All', 'Unread', 'Read'].map((f) => (
            <button
              key={f}
              style={{
                ...styles.filterTab,
                ...(filter === f ? styles.filterTabActive : {}),
              }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={styles.loadingState}>Loading notifications...</div>
        ) : error ? (
          <div style={styles.loadingState}>
            <p>Error: {error}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyStateIcon}>🔔</div>
            <p style={styles.emptyStateText}>No notifications yet</p>
          </div>
        ) : (
          <div>
            {filteredNotifications.map((notif) => (
              <div key={notif.id} style={styles.notificationCard}>
                <div style={styles.notificationIcon}>
                  {getNotificationIcon(notif.type)}
                </div>
                <div style={styles.notificationContent}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <h3 style={styles.notificationTitle}>{notif.title}</h3>
                    {!notif.read && <div style={styles.notificationBadge}></div>}
                  </div>
                  <p style={styles.notificationMessage}>{notif.message}</p>
                  <div style={styles.notificationTimestamp}>
                    {formatTimestamp(notif.createdAt || notif.timestamp)}
                  </div>
                  <div style={styles.notificationActions}>
                    {!notif.read && (
                      <button
                        style={styles.smallButton}
                        onClick={() => markAsRead(notif.id)}
                        onMouseEnter={(e) => (e.target.backgroundColor = '#1E1E1E')}
                        onMouseLeave={(e) => (e.target.backgroundColor = 'transparent')}
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      style={styles.smallButton}
                      onClick={() => dismissNotification(notif.id)}
                      onMouseEnter={(e) => (e.target.backgroundColor = '#1E1E1E')}
                      onMouseLeave={(e) => (e.target.backgroundColor = 'transparent')}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
