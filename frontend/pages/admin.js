import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#999999',
    margin: '0',
  },
  tabContainer: {
    display: 'flex',
    borderBottom: '1px solid #1E1E1E',
    marginBottom: '32px',
    gap: '2px',
  },
  tab: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666666',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s ease',
    position: 'relative',
    bottom: '-1px',
  },
  tabActive: {
    color: '#FFD700',
    borderBottom: '2px solid #FFD700',
  },
  contentSection: {
    animation: 'fadeIn 0.3s ease',
  },
  card: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#1A1A1A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    padding: '20px',
  },
  statLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#999999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#FFD700',
  },
  statSubtext: {
    fontSize: '12px',
    color: '#666666',
    marginTop: '8px',
  },
  healthIndicators: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  healthItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#1A1A1A',
    borderRadius: '6px',
    border: '1px solid #1E1E1E',
  },
  statusIndicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#00DD00',
  },
  statusIndicatorOffline: {
    backgroundColor: '#FF4444',
  },
  statusText: {
    fontSize: '13px',
    color: '#E0E0E0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    borderBottom: '2px solid #1E1E1E',
  },
  tableHeaderCell: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#999999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    backgroundColor: '#0A0A0A',
  },
  tableRow: {
    borderBottom: '1px solid #1E1E1E',
    transition: 'background-color 0.2s ease',
  },
  tableRowHover: {
    backgroundColor: '#1A1A1A',
  },
  tableCell: {
    padding: '14px 16px',
    fontSize: '13px',
    color: '#E0E0E0',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  badgeActive: {
    backgroundColor: '#1B3F1B',
    color: '#6BFF9F',
  },
  badgeInactive: {
    backgroundColor: '#3F1B1B',
    color: '#FF6B6B',
  },
  badgeInvited: {
    backgroundColor: '#3F2F1B',
    color: '#FFD700',
  },
  button: {
    padding: '8px 14px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#FFD700',
    color: '#0A0A0A',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginRight: '8px',
  },
  buttonSecondary: {
    backgroundColor: '#1E1E1E',
    color: '#E0E0E0',
  },
  buttonSmall: {
    padding: '6px 10px',
    fontSize: '11px',
  },
  roleMatrix: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  roleMatrixHeader: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#999999',
    backgroundColor: '#0A0A0A',
    borderRight: '1px solid #1E1E1E',
    borderBottom: '2px solid #1E1E1E',
  },
  roleMatrixCell: {
    padding: '12px',
    textAlign: 'center',
    borderRight: '1px solid #1E1E1E',
    borderBottom: '1px solid #1E1E1E',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#FFD700',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    backgroundColor: '#1A1A1A',
    border: '1px solid #1E1E1E',
    borderRadius: '4px',
    color: '#FFFFFF',
    boxSizing: 'border-box',
    marginBottom: '12px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    backgroundColor: '#1A1A1A',
    border: '1px solid #1E1E1E',
    borderRadius: '4px',
    color: '#FFFFFF',
    boxSizing: 'border-box',
    marginBottom: '12px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '12px',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '32px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: '20px',
  },
  modalClose: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    color: '#999999',
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#999999',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#2B1111',
    border: '1px solid #664444',
    borderRadius: '6px',
    color: '#FF6B6B',
    fontSize: '13px',
    marginBottom: '16px',
  },
  activityLog: {
    fontSize: '13px',
  },
  logEntry: {
    padding: '12px 0',
    borderBottom: '1px solid #1E1E1E',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logAction: {
    color: '#FFD700',
    fontWeight: '600',
  },
  logUser: {
    color: '#E0E0E0',
  },
  logTime: {
    color: '#666666',
    fontSize: '12px',
    marginTop: '4px',
  },
  filterContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },
  styleSheet: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
};

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dashboard state
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    activeSessions: 0,
    storageUsed: '0 GB',
    apiCallsToday: 0,
    backendStatus: 'online',
    dbStatus: 'online',
    rateLimit: '95%',
    recentActivity: [],
  });

  // User Management state
  const [users, setUsers] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Viewer');

  // Roles & Permissions state
  const [roles, setRoles] = useState([
    'Owner',
    'Admin',
    'Manager',
    'Viewer',
  ]);
  const [permissions, setPermissions] = useState([
    'View Dashboard',
    'Manage Clients',
    'Edit Products',
    'Run PPC',
    'Manage Finance',
    'Admin Settings',
    'View Reports',
    'Export Data',
  ]);
  const [rolePermissions, setRolePermissions] = useState({
    Owner: permissions.reduce((acc, p) => ({ ...acc, [p]: true }), {}),
    Admin: {
      'View Dashboard': true,
      'Manage Clients': true,
      'Edit Products': true,
      'Run PPC': true,
      'Manage Finance': true,
      'Admin Settings': true,
      'View Reports': true,
      'Export Data': true,
    },
    Manager: {
      'View Dashboard': true,
      'Manage Clients': true,
      'Edit Products': true,
      'Run PPC': true,
      'Manage Finance': false,
      'Admin Settings': false,
      'View Reports': true,
      'Export Data': true,
    },
    Viewer: {
      'View Dashboard': true,
      'Manage Clients': false,
      'Edit Products': false,
      'Run PPC': false,
      'Manage Finance': false,
      'Admin Settings': false,
      'View Reports': true,
      'Export Data': false,
    },
  });

  // System Settings state
  const [settings, setSettings] = useState({
    companyName: 'Your Company',
    defaultCurrency: 'USD',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    maintenanceMode: false,
    dataRetention: 90,
    apiRateLimit: 1000,
  });

  // Audit Log state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilters, setAuditFilters] = useState({
    user: '',
    actionType: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('ecomera_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDashboardData();
    fetchUsers();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      setError('');
      setLoading(true);
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/admin/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setDashboardData(prev => ({
          ...prev,
          ...data,
        }));
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail || !inviteRole) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/admin/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (response.ok) {
        setInviteEmail('');
        setInviteRole('Viewer');
        setShowInviteModal(false);
        fetchUsers();
      }
    } catch (err) {
      setError('Error inviting user');
    }
  };

  const handlePermissionToggle = (role, permission) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: !prev[role][permission],
      },
    }));
  };

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const token = localStorage.getItem('ecomera_token');
      const params = new URLSearchParams();
      if (auditFilters.user) params.append('user', auditFilters.user);
      if (auditFilters.actionType) params.append('actionType', auditFilters.actionType);
      if (auditFilters.dateFrom) params.append('dateFrom', auditFilters.dateFrom);
      if (auditFilters.dateTo) params.append('dateTo', auditFilters.dateTo);

      const response = await fetch(`${BASE_URL}/api/audit-logs?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <style>{styles.styleSheet}</style>
      <div style={styles.outerContainer}>
        <Sidebar />
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>Admin Panel</h1>
            <p style={styles.subtitle}>Manage your FBA platform</p>
          </div>

          <div style={styles.tabContainer}>
            {['Dashboard', 'User Management', 'Roles & Permissions', 'System Settings', 'Audit Log'].map(
              (tabName) => (
                <button
                  key={tabName}
                  style={{
                    ...styles.tab,
                    ...(activeTab === tabName.toLowerCase().replace(/\s+/g, '-') ? styles.tabActive : {}),
                  }}
                  onClick={() => {
                    const newTab = tabName.toLowerCase().replace(/\s+/g, '-');
                    setActiveTab(newTab);
                    if (newTab === 'audit-log') {
                      fetchAuditLogs();
                    }
                  }}
                >
                  {tabName}
                </button>
              )
            )}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div style={styles.contentSection}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>System Statistics</h2>
                <div style={styles.statsGrid}>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Total Users</div>
                    <div style={styles.statValue}>{dashboardData.totalUsers}</div>
                    <div style={styles.statSubtext}>Active accounts</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Active Sessions</div>
                    <div style={styles.statValue}>{dashboardData.activeSessions}</div>
                    <div style={styles.statSubtext}>Right now</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Storage Used</div>
                    <div style={styles.statValue}>{dashboardData.storageUsed}</div>
                    <div style={styles.statSubtext}>Out of 100 GB</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>API Calls Today</div>
                    <div style={styles.statValue}>{dashboardData.apiCallsToday}</div>
                    <div style={styles.statSubtext}>Last 24 hours</div>
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>System Health</h2>
                <div style={styles.healthIndicators}>
                  <div style={styles.healthItem}>
                    <div
                      style={{
                        ...styles.statusIndicator,
                        ...(dashboardData.backendStatus !== 'online' ? styles.statusIndicatorOffline : {}),
                      }}
                    />
                    <div>
                      <div style={styles.statusText}>Backend Status</div>
                      <div style={styles.logTime}>{dashboardData.backendStatus}</div>
                    </div>
                  </div>
                  <div style={styles.healthItem}>
                    <div
                      style={{
                        ...styles.statusIndicator,
                        ...(dashboardData.dbStatus !== 'online' ? styles.statusIndicatorOffline : {}),
                      }}
                    />
                    <div>
                      <div style={styles.statusText}>Database Status</div>
                      <div style={styles.logTime}>{dashboardData.dbStatus}</div>
                    </div>
                  </div>
                  <div style={styles.healthItem}>
                    <div style={styles.statusIndicator} />
                    <div>
                      <div style={styles.statusText}>API Rate Limit</div>
                      <div style={styles.logTime}>{dashboardData.rateLimit}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Recent Activity</h2>
                <div style={styles.activityLog}>
                  {dashboardData.recentActivity && dashboardData.recentActivity.length > 0 ? (
                    dashboardData.recentActivity.slice(0, 20).map((activity, idx) => (
                      <div key={idx} style={styles.logEntry}>
                        <div>
                          <div>
                            <span style={styles.logUser}>{activity.user}</span>
                            <span style={styles.logAction}> {activity.action}</span>
                          </div>
                          <div style={styles.logTime}>{activity.timestamp || 'Just now'}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#666666' }}>No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* USER MANAGEMENT TAB */}
          {activeTab === 'user-management' && (
            <div style={styles.contentSection}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>
                  <span>Users</span>
                  <button
                    style={styles.button}
                    onClick={() => setShowInviteModal(true)}
                  >
                    + Invite User
                  </button>
                </h2>
                <table style={styles.table}>
                  <thead style={styles.tableHeader}>
                    <tr>
                      <th style={styles.tableHeaderCell}>Name</th>
                      <th style={styles.tableHeaderCell}>Email</th>
                      <th style={styles.tableHeaderCell}>Role</th>
                      <th style={styles.tableHeaderCell}>Department</th>
                      <th style={styles.tableHeaderCell}>Status</th>
                      <th style={styles.tableHeaderCell}>Last Login</th>
                      <th style={styles.tableHeaderCell}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users && users.length > 0 ? (
                      users.map((user, idx) => (
                        <tr key={idx} style={styles.tableRow}>
                          <td style={styles.tableCell}>{user.name || 'N/A'}</td>
                          <td style={styles.tableCell}>{user.email}</td>
                          <td style={styles.tableCell}>{user.role || 'Viewer'}</td>
                          <td style={styles.tableCell}>{user.department || '-'}</td>
                          <td style={styles.tableCell}>
                            <span
                              style={{
                                ...styles.badge,
                                ...(user.status === 'Active'
                                  ? styles.badgeActive
                                  : user.status === 'Suspended'
                                    ? styles.badgeInactive
                                    : styles.badgeInvited),
                              }}
                            >
                              {user.status || 'Active'}
                            </span>
                          </td>
                          <td style={styles.tableCell}>{user.lastLogin || 'Never'}</td>
                          <td style={styles.tableCell}>
                            <button style={{ ...styles.button, ...styles.buttonSmall }}>
                              Edit
                            </button>
                            {user.status === 'Active' ? (
                              <button
                                style={{
                                  ...styles.button,
                                  ...styles.buttonSecondary,
                                  ...styles.buttonSmall,
                                }}
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                style={{
                                  ...styles.button,
                                  ...styles.buttonSecondary,
                                  ...styles.buttonSmall,
                                }}
                              >
                                Reactivate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ ...styles.tableCell, textAlign: 'center', color: '#666666' }}>
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ROLES & PERMISSIONS TAB */}
          {activeTab === 'roles-permissions' && (
            <div style={styles.contentSection}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>
                  <span>Role Permissions Matrix</span>
                  <button style={styles.button}>+ Create Custom Role</button>
                </h2>
                <table style={styles.roleMatrix}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.roleMatrixHeader, width: '140px' }}>Role</th>
                      {permissions.map((perm) => (
                        <th key={perm} style={styles.roleMatrixHeader}>
                          {perm}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role}>
                        <td style={{ ...styles.roleMatrixCell, textAlign: 'left', fontWeight: '600' }}>
                          {role}
                        </td>
                        {permissions.map((perm) => (
                          <td key={`${role}-${perm}`} style={styles.roleMatrixCell}>
                            <input
                              type="checkbox"
                              style={styles.checkbox}
                              checked={rolePermissions[role]?.[perm] || false}
                              onChange={() => handlePermissionToggle(role, perm)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SYSTEM SETTINGS TAB */}
          {activeTab === 'system-settings' && (
            <div style={styles.contentSection}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Company Settings</h2>
                <input
                  type="text"
                  placeholder="Company Name"
                  value={settings.companyName}
                  onChange={(e) => handleSettingChange('companyName', e.target.value)}
                  style={styles.input}
                />
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#999999', display: 'block', marginBottom: '8px' }}>
                    Logo Upload
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    style={{
                      ...styles.input,
                      backgroundColor: '#1A1A1A',
                      border: '2px dashed #1E1E1E',
                      padding: '20px 12px',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Regional Settings</h2>
                <div style={styles.formRow}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#999999', display: 'block', marginBottom: '6px' }}>
                      Default Currency
                    </label>
                    <select
                      value={settings.defaultCurrency}
                      onChange={(e) => handleSettingChange('defaultCurrency', e.target.value)}
                      style={styles.select}
                    >
                      <option>USD</option>
                      <option>GBP</option>
                      <option>EUR</option>
                      <option>PKR</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#999999', display: 'block', marginBottom: '6px' }}>
                      Timezone
                    </label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => handleSettingChange('timezone', e.target.value)}
                      style={styles.select}
                    >
                      <option>UTC</option>
                      <option>EST</option>
                      <option>CST</option>
                      <option>PST</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#999999', display: 'block', marginBottom: '6px' }}>
                    Date Format
                  </label>
                  <select
                    value={settings.dateFormat}
                    onChange={(e) => handleSettingChange('dateFormat', e.target.value)}
                    style={styles.select}
                  >
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>API Configuration</h2>
                <div>
                  <label style={{ fontSize: '12px', color: '#999999', display: 'block', marginBottom: '6px' }}>
                    Rate Limit (requests/hour)
                  </label>
                  <input
                    type="number"
                    value={settings.apiRateLimit}
                    onChange={(e) => handleSettingChange('apiRateLimit', parseInt(e.target.value))}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>System Management</h2>
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                    style={styles.checkbox}
                  />
                  <label style={{ color: '#E0E0E0' }}>Enable Maintenance Mode</label>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#999999', display: 'block', marginBottom: '6px' }}>
                    Data Retention Period (days)
                  </label>
                  <input
                    type="number"
                    value={settings.dataRetention}
                    onChange={(e) => handleSettingChange('dataRetention', parseInt(e.target.value))}
                    style={styles.input}
                  />
                </div>
              </div>

              <button style={{ ...styles.button, marginTop: '20px' }}>Save Settings</button>
            </div>
          )}

          {/* AUDIT LOG TAB */}
          {activeTab === 'audit-log' && (
            <div style={styles.contentSection}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Audit Log Filters</h2>
                <div style={styles.filterContainer}>
                  <input
                    type="text"
                    placeholder="Filter by user..."
                    value={auditFilters.user}
                    onChange={(e) => setAuditFilters({ ...auditFilters, user: e.target.value })}
                    style={styles.input}
                  />
                  <select
                    value={auditFilters.actionType}
                    onChange={(e) => setAuditFilters({ ...auditFilters, actionType: e.target.value })}
                    style={styles.select}
                  >
                    <option value="">All Actions</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                  </select>
                  <input
                    type="date"
                    value={auditFilters.dateFrom}
                    onChange={(e) => setAuditFilters({ ...auditFilters, dateFrom: e.target.value })}
                    style={styles.input}
                  />
                  <input
                    type="date"
                    value={auditFilters.dateTo}
                    onChange={(e) => setAuditFilters({ ...auditFilters, dateTo: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <button style={styles.button} onClick={fetchAuditLogs}>
                  Apply Filters
                </button>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Audit Trail</h2>
                {auditLoading ? (
                  <div style={styles.loading}>Loading audit logs...</div>
                ) : (
                  <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                      <tr>
                        <th style={styles.tableHeaderCell}>Timestamp</th>
                        <th style={styles.tableHeaderCell}>User</th>
                        <th style={styles.tableHeaderCell}>Action</th>
                        <th style={styles.tableHeaderCell}>Resource</th>
                        <th style={styles.tableHeaderCell}>IP Address</th>
                        <th style={styles.tableHeaderCell}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs && auditLogs.length > 0 ? (
                        auditLogs.map((log, idx) => (
                          <tr key={idx} style={styles.tableRow}>
                            <td style={styles.tableCell}>{log.timestamp || 'N/A'}</td>
                            <td style={styles.tableCell}>{log.user || 'N/A'}</td>
                            <td style={styles.tableCell}>
                              <span style={styles.logAction}>{log.action || 'N/A'}</span>
                            </td>
                            <td style={styles.tableCell}>{log.resource || '-'}</td>
                            <td style={styles.tableCell}>{log.ipAddress || 'N/A'}</td>
                            <td style={styles.tableCell}>{log.details || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ ...styles.tableCell, textAlign: 'center', color: '#666666' }}>
                            No audit logs found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* INVITE USER MODAL */}
          {showInviteModal && (
            <div style={styles.modal} onClick={() => setShowInviteModal(false)}>
              <div
                style={styles.modalContent}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 style={styles.modalTitle}>Invite User</h2>
                <input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  style={styles.input}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={styles.select}
                >
                  <option>Owner</option>
                  <option>Admin</option>
                  <option>Manager</option>
                  <option>Viewer</option>
                </select>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={styles.button} onClick={handleInviteUser}>
                    Send Invite
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.buttonSecondary }}
                    onClick={() => setShowInviteModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
