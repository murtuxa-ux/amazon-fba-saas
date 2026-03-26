import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

const T = {
  bg: '#0A0A0A',
  card: '#111111',
  border: '#1E1E1E',
  yellow: '#FFD700',
  text: '#FFFFFF',
  textSec: '#888888',
  textMut: '#444444',
  green: '#22C55E',
  red: '#EF4444',
  blue: '#3B82F6',
};

const authHeader = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ecomera_token') : null;
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'info':
      return 'ℹ️';
    case 'warning':
      return '⚠️';
    case 'error':
      return '❌';
    case 'success':
      return '✅';
    case 'alert':
      return '🔔';
    default:
      return '📧';
  }
};

const getNotificationColor = (type) => {
  switch (type) {
    case 'error':
      return T.red;
    case 'warning':
      return T.yellow;
    case 'success':
      return T.green;
    case 'info':
      return T.blue;
    default:
      return T.textSec;
  }
};

export default function NotificationsCenter() {
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/notifications/`, {
        headers: authHeader(),
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to load notifications');
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
      setError('Error loading notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await fetch(`${API}/notifications/preferences`, {
        headers: authHeader(),
      });

      if (res.ok) {
        const data = await res.json();
        setPreferences(data);
      }
    } catch (e) {
      console.error('Failed to fetch preferences:', e);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      const res = await fetch(`${API}/notifications/acknowledge/${id}`, {
        method: 'POST',
        headers: authHeader(),
      });

      if (res.ok) {
        setNotifications(notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ));
      }
    } catch (e) {
      console.error('Failed to acknowledge notification:', e);
    }
  };

  const handlePreferenceChange = async (key, value) => {
    try {
      setPrefsLoading(true);
      const newPrefs = { ...preferences, [key]: value };

      const res = await fetch(`${API}/notifications/preferences`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify(newPrefs),
      });

      if (res.ok) {
        setPreferences(newPrefs);
      }
    } catch (e) {
      console.error('Failed to update preferences:', e);
    } finally {
      setPrefsLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: T.bg }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', maxHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: T.text, margin: 0 }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <div style={{ fontSize: '14px', color: T.textSec, marginTop: '8px' }}>
                {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowPrefs(!showPrefs)}
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${T.border}`,
              color: T.text,
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = T.border;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ⚙️ Preferences
          </button>
        </div>
        <p style={{ fontSize: '14px', color: T.textSec, marginBottom: '40px' }}>
          Stay updated with important alerts and notifications
        </p>

        {error && (
          <div style={{ backgroundColor: T.red + '20', border: `1px solid ${T.red}`, borderRadius: '8px', padding: '16px', marginBottom: '24px', color: T.red }}>
            {error}
          </div>
        )}

        {/* Preferences Panel */}
        {showPrefs && preferences && (
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: T.text, marginBottom: '16px' }}>
              Notification Preferences
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {[
                { key: 'emailNotifications', label: 'Email Notifications' },
                { key: 'pushNotifications', label: 'Push Notifications' },
                { key: 'alertsEnabled', label: 'Alerts Enabled' },
                { key: 'weeklyDigest', label: 'Weekly Digest' },
              ].map((pref) => (
                <label key={pref.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={preferences[pref.key] || false}
                    onChange={(e) => handlePreferenceChange(pref.key, e.target.checked)}
                    disabled={prefsLoading}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: T.text }}>
                    {pref.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: T.text, marginBottom: '16px' }}>
            Recent Notifications
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textSec }}>
              Loading notifications...
            </div>
          ) : notifications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    backgroundColor: notification.read ? 'transparent' : T.border,
                    border: `1px solid ${T.border}`,
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!notification.read) {
                      e.currentTarget.style.borderColor = T.yellow;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = T.border;
                  }}
                >
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: T.text }}>
                        {notification.title}
                      </div>
                      <div style={{ fontSize: '12px', color: T.textMut, whiteSpace: 'nowrap', marginLeft: '16px' }}>
                        {new Date(notification.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: T.textSec, marginBottom: '8px', lineHeight: 1.4 }}>
                      {notification.message}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: getNotificationColor(notification.type) + '20',
                        color: getNotificationColor(notification.type),
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}>
                        {notification.type}
                      </span>
                      {!notification.read && (
                        <button
                          onClick={() => handleAcknowledge(notification.id)}
                          style={{
                            backgroundColor: 'transparent',
                            border: `1px solid ${T.textSec}`,
                            color: T.textSec,
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = T.textSec;
                            e.currentTarget.style.color = T.bg;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = T.textSec;
                          }}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textSec }}>
              No notifications yet. You're all caught up!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
