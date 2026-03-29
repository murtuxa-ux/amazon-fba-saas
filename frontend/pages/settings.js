import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const styles = {
  outerContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
  },
  container: {
    flex: 1,
    marginLeft: '250px',
    padding: '32px',
    color: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  pageHeader: {
    marginBottom: '32px',
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: '700',
    margin: '0 0 8px 0',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#888888',
    margin: '0',
  },
  tabsContainer: {
    display: 'flex',
    gap: '12px',
    borderBottom: '1px solid #1E1E1E',
    marginBottom: '32px',
    overflowX: 'auto',
  },
  tab: {
    padding: '12px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#888888',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    borderBottom: '2px solid transparent',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    color: '#FFD700',
    borderBottom: '2px solid #FFD700',
  },
  tabContent: {
    animation: 'fadeIn 0.3s ease',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#FFFFFF',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 0.3s ease',
  },
  inputFocus: {
    borderColor: '#FFD700',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    minHeight: '100px',
    resize: 'vertical',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  button: {
    padding: '10px 24px',
    backgroundColor: '#FFD700',
    color: '#000000',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  buttonHover: {
    backgroundColor: '#FFC700',
    transform: 'translateY(-2px)',
  },
  buttonSecondary: {
    padding: '10px 24px',
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  buttonSecondaryHover: {
    borderColor: '#FFD700',
    color: '#FFD700',
  },
  buttonDanger: {
    padding: '10px 24px',
    backgroundColor: '#FF4444',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#111111',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  statusDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  statusDisconnected: {
    backgroundColor: '#FF4444',
  },
  switchContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#111111',
    borderRadius: '6px',
    marginBottom: '12px',
  },
  toggleSwitch: {
    width: '50px',
    height: '28px',
    backgroundColor: '#1E1E1E',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.3s ease',
  },
  toggleSwitchActive: {
    backgroundColor: '#FFD700',
  },
  toggleSlider: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '24px',
    height: '24px',
    backgroundColor: '#FFFFFF',
    borderRadius: '50%',
    transition: 'all 0.3s ease',
  },
  toggleSliderActive: {
    left: '24px',
  },
  sessionItem: {
    padding: '12px 16px',
    backgroundColor: '#111111',
    borderRadius: '6px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionBrowser: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: '4px',
  },
  sessionMeta: {
    fontSize: '12px',
    color: '#888888',
  },
  sessionCurrent: {
    backgroundColor: '#1A1A1A',
    borderLeft: '3px solid #FFD700',
    paddingLeft: '13px',
  },
  profilePictureUpload: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
  },
  profilePicturePreview: {
    width: '80px',
    height: '80px',
    borderRadius: '8px',
    backgroundColor: '#1E1E1E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#888888',
    fontSize: '12px',
    overflow: 'hidden',
  },
  profilePictureImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  fileInput: {
    display: 'none',
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: '9999',
    animation: 'slideIn 0.3s ease',
  },
  toastSuccess: {
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
  },
  toastError: {
    backgroundColor: '#FF4444',
    color: '#FFFFFF',
  },
  apiKeyContainer: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  apiKeyDisplay: {
    flex: 1,
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#888888',
    fontSize: '13px',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
  },
  thresholdInputGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '16px',
  },
  loadingSpinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid #1E1E1E',
    borderTop: '2px solid #FFD700',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Profile state
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    timezone: 'UTC',
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);

  // Amazon API state
  const [amazonForm, setAmazonForm] = useState({
    sellerId: '',
    marketplace: 'US',
    accessKey: '',
    secretKey: '',
    refreshToken: '',
    lwaClientId: '',
    lwaClientSecret: '',
  });
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  // Notifications state
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailOrderAlerts: true,
    emailInventoryAlerts: true,
    emailPriceChanges: false,
    emailWeeklyDigest: true,
    inAppOrderAlerts: true,
    inAppInventoryAlerts: true,
    inAppPriceChanges: true,
    inAppWeeklyDigest: false,
    lowStockDays: 7,
    priceDropPercent: 5,
    roiMinimum: 15,
  });

  // Appearance state
  const [appearancePrefs, setAppearancePrefs] = useState({
    theme: 'dark',
    sidebarPosition: 'left',
    compactMode: false,
    dashboardLayout: 'grid',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
  });

  // Security state
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [activeSessions, setActiveSessions] = useState([
    {
      id: '1',
      browser: 'Chrome on macOS',
      ip: '192.168.1.100',
      lastActive: '2026-03-29 14:30:00',
      current: true,
    },
    {
      id: '2',
      browser: 'Safari on iPhone',
      ip: '192.168.1.101',
      lastActive: '2026-03-28 10:15:00',
      current: false,
    },
    {
      id: '3',
      browser: 'Firefox on Linux',
      ip: '192.168.1.102',
      lastActive: '2026-03-27 09:45:00',
      current: false,
    },
  ]);
  const [apiKey, setApiKey] = useState('sk_live_abc123def456ghi789jkl');
  const [showApiKey, setShowApiKey] = useState(false);

  // Initialize on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('ecomera_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      loadSettings();
    }
  }, []);

  // Load user settings
  const loadSettings = async () => {
    try {
      // Load profile
      const profileRes = await fetch(`${BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfileForm({
          name: profileData.name || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          timezone: profileData.timezone || 'UTC',
        });
      }

      // Load notification preferences
      const savedNotifPrefs = localStorage.getItem('ecomera_notification_prefs');
      if (savedNotifPrefs) {
        setNotificationPrefs(JSON.parse(savedNotifPrefs));
      }

      // Load appearance preferences
      const savedAppearancePrefs = localStorage.getItem('ecomera_appearance_prefs');
      if (savedAppearancePrefs) {
        setAppearancePrefs(JSON.parse(savedAppearancePrefs));
      }

      // Load Amazon API status
      const amazonRes = await fetch(`${BASE_URL}/amazon/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (amazonRes.ok) {
        const amazonData = await amazonRes.json();
        setConnectionStatus(amazonData.connected ? 'connected' : 'disconnected');
        setLastSync(amazonData.lastSync);
        setAmazonForm((prev) => ({
          ...prev,
          sellerId: amazonData.sellerId || '',
          marketplace: amazonData.marketplace || 'US',
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Profile tab handlers
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePicturePreview(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const payload = {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        timezone: profileForm.timezone,
      };

      const response = await fetch(`${BASE_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showToast('Profile updated successfully', 'success');
      } else {
        showToast('Failed to update profile', 'error');
      }
    } catch (error) {
      showToast('Error saving profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Amazon API handlers
  const handleAmazonChange = (e) => {
    const { name, value } = e.target;
    setAmazonForm((prev) => ({ ...prev, [name]: value }));
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/amazon/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(amazonForm),
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus('connected');
        setLastSync(new Date().toISOString());
        showToast('Amazon connection successful', 'success');
      } else {
        setConnectionStatus('disconnected');
        showToast('Amazon connection failed', 'error');
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      showToast('Error testing connection', 'error');
    } finally {
      setLoading(false);
    }
  };

  const syncNow = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/amazon/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setLastSync(new Date().toISOString());
        showToast('Sync started successfully', 'success');
      } else {
        showToast('Sync failed', 'error');
      }
    } catch (error) {
      showToast('Error starting sync', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Notification handlers
  const handleNotificationChange = (field, value) => {
    const updatedPrefs = { ...notificationPrefs, [field]: value };
    setNotificationPrefs(updatedPrefs);
  };

  const saveNotifications = () => {
    localStorage.setItem('ecomera_notification_prefs', JSON.stringify(notificationPrefs));
    showToast('Notification preferences saved', 'success');
  };

  // Appearance handlers
  const handleAppearanceChange = (field, value) => {
    const updatedPrefs = { ...appearancePrefs, [field]: value };
    setAppearancePrefs(updatedPrefs);
  };

  const saveAppearance = () => {
    localStorage.setItem('ecomera_appearance_prefs', JSON.stringify(appearancePrefs));
    showToast('Appearance preferences saved', 'success');
  };

  // Security handlers
  const handleSecurityChange = (e) => {
    const { name, value } = e.target;
    setSecurityForm((prev) => ({ ...prev, [name]: value }));
  };

  const changePassword = async () => {
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/users/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: securityForm.currentPassword,
          newPassword: securityForm.newPassword,
        }),
      });

      if (response.ok) {
        setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        showToast('Password changed successfully', 'success');
      } else {
        showToast('Failed to change password', 'error');
      }
    } catch (error) {
      showToast('Error changing password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleTwoFactor = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/users/2fa-toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setTwoFactorEnabled(!twoFactorEnabled);
        showToast(
          `Two-factor authentication ${!twoFactorEnabled ? 'enabled' : 'disabled'}`,
          'success'
        );
      } else {
        showToast('Failed to toggle two-factor authentication', 'error');
      }
    } catch (error) {
      showToast('Error toggling two-factor authentication', 'error');
    } finally {
      setLoading(false);
    }
  };

  const signOutAllDevices = async () => {
    if (!confirm('Are you sure? You will be signed out on all devices.')) return;

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/users/sign-out-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        localStorage.removeItem('ecomera_token');
        showToast('Signed out from all devices', 'success');
        setTimeout(() => (window.location.href = '/login'), 2000);
      } else {
        showToast('Failed to sign out from all devices', 'error');
      }
    } catch (error) {
      showToast('Error signing out', 'error');
    } finally {
      setLoading(false);
    }
  };

  const regenerateApiKey = async () => {
    if (!confirm('This will invalidate your current API key. Continue?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/users/regenerate-api-key`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setApiKey(data.apiKey);
        showToast('API key regenerated successfully', 'success');
      } else {
        showToast('Failed to regenerate API key', 'error');
      }
    } catch (error) {
      showToast('Error regenerating API key', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    showToast('API key copied to clipboard', 'success');
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.outerContainer}>
        <Sidebar />
        <div style={styles.container}>
          <div style={styles.pageHeader}>
            <h1 style={styles.pageTitle}>Settings</h1>
          </div>
          <div style={styles.card}>
            <p style={{ textAlign: 'center', color: '#888888' }}>
              Please log in to access settings.
            </p>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                style={{ ...styles.button }}
                onClick={() => (window.location.href = '/login')}
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Settings</h1>
          <p style={styles.pageSubtitle}>Manage your account and preferences</p>
        </div>

        <div style={styles.tabsContainer}>
          {['profile', 'amazon', 'notifications', 'appearance', 'security'].map((tab) => (
            <button
              key={tab}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div style={styles.tabContent}>
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div>
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Profile Picture</h2>
                <div style={styles.card}>
                  <div style={styles.profilePictureUpload}>
                    <div style={styles.profilePicturePreview}>
                      {profilePicturePreview ? (
                        <img
                          src={profilePicturePreview}
                          alt="Profile"
                          style={styles.profilePictureImage}
                        />
                      ) : (
                        <span>No image</span>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        style={styles.fileInput}
                        id="profilePictureInput"
                        onChange={handleProfilePictureChange}
                      />
                      <label
                        htmlFor="profilePictureInput"
                        style={{
                          ...styles.button,
                          display: 'inline-block',
                          cursor: 'pointer',
                          marginRight: '12px',
                        }}
                      >
                        Upload Image
                      </label>
                      {profilePicturePreview && (
                        <button
                          style={styles.buttonSecondary}
                          onClick={() => {
                            setProfilePicture(null);
                            setProfilePicturePreview(null);
                          }}
                        >
                          Remove
                        </button>
                      )}
                      <p style={{ fontSize: '12px', color: '#888888', marginTop: '8px' }}>
                        JPG, PNG or GIF (max. 5 MB)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Personal Information</h2>
                <div style={styles.card}>
                  <div style={styles.twoColumnGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Full Name</label>
                      <input
                        type="text"
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileChange}
                        style={styles.input}
                        placeholder="John Doe"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={profileForm.email}
                        onChange={handleProfileChange}
                        style={styles.input}
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div style={styles.twoColumnGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={profileForm.phone}
                        onChange={handleProfileChange}
                        style={styles.input}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Timezone</label>
                      <select
                        name="timezone"
                        value={profileForm.timezone}
                        onChange={handleProfileChange}
                        style={styles.select}
                      >
                        <option>UTC</option>
                        <option>EST</option>
                        <option>CST</option>
                        <option>MST</option>
                        <option>PST</option>
                        <option>GMT</option>
                        <option>CET</option>
                        <option>IST</option>
                        <option>JST</option>
                        <option>AEST</option>
                      </select>
                    </div>
                  </div>

                  <div style={styles.buttonGroup}>
                    <button
                      style={styles.button}
                      onClick={saveProfile}
                      disabled={loading}
                    >
                      {loading ? <span style={styles.loadingSpinner} /> : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AMAZON API TAB */}
          {activeTab === 'amazon' && (
            <div>
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Connection Status</h2>
                <div style={styles.card}>
                  <div style={styles.statusIndicator}>
                    <div
                      style={{
                        ...styles.statusDot,
                        ...(connectionStatus === 'connected'
                          ? styles.statusConnected
                          : styles.statusDisconnected),
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>
                        {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
                      </div>
                      {lastSync && (
                        <div style={{ fontSize: '12px', color: '#888888' }}>
                          Last sync: {new Date(lastSync).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={styles.buttonGroup}>
                    <button
                      style={styles.button}
                      onClick={testConnection}
                      disabled={loading}
                    >
                      {loading ? <span style={styles.loadingSpinner} /> : 'Test Connection'}
                    </button>
                    <button
                      style={styles.button}
                      onClick={syncNow}
                      disabled={loading || connectionStatus !== 'connected'}
                    >
                      {loading ? <span style={styles.loadingSpinner} /> : 'Sync Now'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>SP-API Configuration</h2>
                <div style={styles.card}>
                  <div style={styles.twoColumnGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Seller ID</label>
                      <input
                        type="text"
                        name="sellerId"
                        value={amazonForm.sellerId}
                        onChange={handleAmazonChange}
                        style={styles.input}
                        placeholder="AXXXXXXXXXXXXX"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Marketplace</label>
                      <select
                        name="marketplace"
                        value={amazonForm.marketplace}
                        onChange={handleAmazonChange}
                        style={styles.select}
                      >
                        <option>US</option>
                        <option>CA</option>
                        <option>UK</option>
                        <option>DE</option>
                        <option>FR</option>
                        <option>IT</option>
                        <option>ES</option>
                        <option>JP</option>
                        <option>AU</option>
                      </select>
                    </div>
                  </div>

                  <div style={styles.twoColumnGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Access Key</label>
                      <input
                        type="password"
                        name="accessKey"
                        value={amazonForm.accessKey}
                        onChange={handleAmazonChange}
                        style={styles.input}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Secret Key</label>
                      <input
                        type="password"
                        name="secretKey"
                        value={amazonForm.secretKey}
                        onChange={handleAmazonChange}
                        style={styles.input}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Refresh Token</label>
                    <input
                      type="password"
                      name="refreshToken"
                      value={amazonForm.refreshToken}
                      onChange={handleAmazonChange}
                      style={styles.input}
                      placeholder="••••••••••••••••"
                    />
                  </div>

                  <div style={styles.twoColumnGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>LWA Client ID</label>
                      <input
                        type="text"
                        name="lwaClientId"
                        value={amazonForm.lwaClientId}
                        onChange={handleAmazonChange}
                        style={styles.input}
                        placeholder="amzn1.application-oa2-client.xxxxxxx"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>LWA Client Secret</label>
                      <input
                        type="password"
                        name="lwaClientSecret"
                        value={amazonForm.lwaClientSecret}
                        onChange={handleAmazonChange}
                        style={styles.input}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div>
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Email Notifications</h2>
                <div style={styles.card}>
                  {[
                    {
                      field: 'emailOrderAlerts',
                      label: 'Order Alerts',
                      desc: 'Get notified when orders arrive',
                    },
                    {
                      field: 'emailInventoryAlerts',
                      label: 'Inventory Alerts',
                      desc: 'Alerts when inventory is low',
                    },
                    {
                      field: 'emailPriceChanges',
                      label: 'Price Changes',
                      desc: 'Notifications for price fluctuations',
                    },
                    {
                      field: 'emailWeeklyDigest',
                      label: 'Weekly Digest',
                      desc: 'Summary of weekly performance',
                    },
                  ].map((item) => (
                    <div key={item.field} style={styles.switchContainer}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '12px', color: '#888888' }}>{item.desc}</div>
                      </div>
                      <button
                        style={{
                          ...styles.toggleSwitch,
                          ...(notificationPrefs[item.field] ? styles.toggleSwitchActive : {}),
                        }}
                        onClick={() =>
                          handleNotificationChange(item.field, !notificationPrefs[item.field])
                        }
                      >
                        <div
                          style={{
                            ...styles.toggleSlider,
                            ...(notificationPrefs[item.field] ? styles.toggleSliderActive : {}),
                          }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>In-App Notifications</h2>
                <div style={styles.card}>
                  {[
                    {
                      field: 'inAppOrderAlerts',
                      label: 'Order Alerts',
                      desc: 'Get notified when orders arrive',
                    },
                    {
                      field: 'inAppInventoryAlerts',
                      label: 'Inventory Alerts',
                      desc: 'Alerts when inventory is low',
                    },
                    {
                      field: 'inAppPriceChanges',
                      label: 'Price Changes',
                      desc: 'Notifications for price fluctuations',
                    },
                    {
                      field: 'inAppWeeklyDigest',
                      label: 'Weekly Digest',
                      desc: 'Summary of weekly performance',
                    },
                  ].map((item) => (
                    <div key={item.field} style={styles.switchContainer}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '12px', color: '#888888' }}>{item.desc}</div>
                      </div>
                      <button
                        style={{
                          ...styles.toggleSwitch,
                          ...(notificationPrefs[item.field] ? styles.toggleSwitchActive : {}),
                        }}
                        onClick={() =>
                          handleNotificationChange(item.field, !notificationPrefs[item.field])
                        }
                      >
                        <div
                          style={{
                            ...styles.toggleSlider,
                            ...(notificationPrefs[item.field] ? styles.toggleSliderActive : {}),
                          }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Alert Thresholds</h2>
                <div style={styles.card}>
                  <div style={styles.thresholdInputGroup}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Low Stock Days</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={notificationPrefs.lowStockDays}
                        onChange={(e) =>
                          handleNotificationChange('lowStockDays', parseInt(e.target.value))
                        }
                        style={styles.input}
                      />
                      <p style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>
                        Days until stock runs out
                      </p>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Price Drop %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={notificationPrefs.priceDropPercent}
                        onChange={(e) =>
                          handleNotificationChange('priceDropPercent', parseFloat(e.target.value))
                        }
                        style={styles.input}
                      />
                      <p style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>
                        Percentage drop threshold
                      </p>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>ROI Minimum %</label>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        step="1"
                        value={notificationPrefs.roiMinimum}
                        onChange={(e) =>
                          handleNotificationChange('roiMinimum', parseInt(e.target.value))
                        }
                        style={styles.input}
                      />
                      <p style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>
                        Minimum ROI percentage
                      </p>
                    </div>
                  </div>

                  <div style={styles.buttonGroup}>
                    <button style={styles.button} onClick={saveNotifications}>
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <div>
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Display Preferences</h2>
                <div style={styles.card}>
                  <div style={styles.twoColumnGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Theme</label>
                      <select
                        value={appearancePrefs.theme}
                        onChange={(e) => handleAppearanceChange('theme', e.target.value)}
                        style={styles.select}
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="system">System</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Sidebar Position</label>
                      <select
                        value={appearancePrefs.sidebarPosition}
                        onChange={(e) =>
                          handleAppearanceChange('sidebarPosition', e.target.value)
                        }
                        style={styles.select}
                      >
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>

                  <div style={styles.twoColumnGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Dashboard Layout</label>
                      <select
                        value={appearancePrefs.dashboardLayout}
                        onChange={(e) =>
                          handleAppearanceChange('dashboardLayout', e.target.value)
                        }
                        style={styles.select}
                      >
                        <option value="grid">Grid</option>
                        <option value="list">List</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>&nbsp;</label>
                      <div style={styles.switchContainer}>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>Compact Mode</div>
                        <button
                          style={{
                            ...styles.toggleSwitch,
                            ...(appearancePrefs.compactMode ? styles.toggleSwitchActive : {}),
                          }}
                          onClick={() =>
                            handleAppearanceChange('compactMode', !appearancePrefs.compactMode)
                          }
                        >
                          <div
                            style={{
                              ...styles.toggleSlider,
                              ...(appearancePrefs.compactMode ? styles.toggleSliderActive : {}),
                            }}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Regional Settings</h2>
                <div style={styles.card}>
                  <div style={styles.twoColumnGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Currency</label>
                      <select
                        value={appearancePrefs.currency}
                        onChange={(e) => handleAppearanceChange('currency', e.target.value)}
                        style={styles.select}
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Date Format</label>
                      <select
                        value={appearancePrefs.dateFormat}
                        onChange={(e) => handleAppearanceChange('dateFormat', e.target.value)}
                        style={styles.select}
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>

                  <div style={styles.buttonGroup}>
                    <button style={styles.button} onClick={saveAppearance}>
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div>
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Password & Authentication</h2>
                <div style={styles.card}>
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
                      Change Password
                    </h3>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Current Password</label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={securityForm.currentPassword}
                        onChange={handleSecurityChange}
                        style={styles.input}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div style={styles.twoColumnGrid}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>New Password</label>
                        <input
                          type="password"
                          name="newPassword"
                          value={securityForm.newPassword}
                          onChange={handleSecurityChange}
                          style={styles.input}
                          placeholder="••••••••••••••••"
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Confirm Password</label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={securityForm.confirmPassword}
                          onChange={handleSecurityChange}
                          style={styles.input}
                          placeholder="••••••••••••••••"
                        />
                      </div>
                    </div>
                    <div style={styles.buttonGroup}>
                      <button
                        style={styles.button}
                        onClick={changePassword}
                        disabled={loading}
                      >
                        {loading ? <span style={styles.loadingSpinner} /> : 'Change Password'}
                      </button>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #1E1E1E', paddingTop: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
                      Two-Factor Authentication
                    </h3>
                    <div style={styles.switchContainer}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>
                          Enable 2FA
                        </div>
                        <div style={{ fontSize: '12px', color: '#888888' }}>
                          Add an extra layer of security
                        </div>
                      </div>
                      <button
                        style={{
                          ...styles.toggleSwitch,
                          ...(twoFactorEnabled ? styles.toggleSwitchActive : {}),
                        }}
                        onClick={toggleTwoFactor}
                        disabled={loading}
                      >
                        <div
                          style={{
                            ...styles.toggleSlider,
                            ...(twoFactorEnabled ? styles.toggleSliderActive : {}),
                          }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Active Sessions</h2>
                <div style={styles.card}>
                  <p style={{ fontSize: '12px', color: '#888888', marginBottom: '16px' }}>
                    Manage your active sessions across devices
                  </p>
                  {activeSessions.map((session) => (
                    <div
                      key={session.id}
                      style={{
                        ...styles.sessionItem,
                        ...(session.current ? styles.sessionCurrent : {}),
                      }}
                    >
                      <div style={styles.sessionInfo}>
                        <div style={styles.sessionBrowser}>{session.browser}</div>
                        <div style={styles.sessionMeta}>
                          IP: {session.ip} • Last active: {session.lastActive}
                          {session.current && <span> • Current session</span>}
                        </div>
                      </div>
                      {!session.current && (
                        <button style={styles.buttonSecondary}>Sign out</button>
                      )}
                    </div>
                  ))}

                  <div style={{ marginTop: '20px' }}>
                    <button
                      style={styles.buttonDanger}
                      onClick={signOutAllDevices}
                      disabled={loading}
                    >
                      {loading ? <span style={styles.loadingSpinner} /> : 'Sign Out All Devices'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>API Keys</h2>
                <div style={styles.card}>
                  <p style={{ fontSize: '12px', color: '#888888', marginBottom: '16px' }}>
                    Your API key for programmatic access. Keep it secret!
                  </p>
                  <div style={styles.apiKeyContainer}>
                    <div style={styles.apiKeyDisplay}>
                      {showApiKey ? apiKey : apiKey.substring(0, 8) + '•••••••••••••••'}
                    </div>
                    <button
                      style={styles.buttonSecondary}
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                    <button style={styles.buttonSecondary} onClick={copyApiKey}>
                      Copy
                    </button>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <button
                      style={styles.buttonDanger}
                      onClick={regenerateApiKey}
                      disabled={loading}
                    >
                      {loading ? <span style={styles.loadingSpinner} /> : 'Regenerate Key'}
                    </button>
                    <p style={{ fontSize: '12px', color: '#FF6666', marginTop: '8px' }}>
                      Warning: This will invalidate your current API key immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TOAST NOTIFICATIONS */}
        {toast && (
          <div
            style={{
              ...styles.toast,
              ...(toast.type === 'success' ? styles.toastSuccess : styles.toastError),
            }}
          >
            {toast.message}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #FFD700;
          outline: none;
          box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.1);
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
