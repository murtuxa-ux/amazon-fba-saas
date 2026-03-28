import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

const colors = {
  bg: '#0A0A0A',
  card: '#111111',
  border: '#1E1E1E',
  accent: '#FFD700',
  text: '#FFFFFF',
  secText: '#888888',
  success: '#00C853',
  warning: '#FFC107',
  error: '#FF5252',
  info: '#2196F3',
};

const roleColors = {
  owner: '#FFD700',
  admin: '#2196F3',
  manager: '#00C853',
  viewer: '#888888',
};

const rolePermissions = {
  owner: ['All Permissions', 'Manage Users', 'View Reports', 'Edit Settings', 'Billing'],
  admin: ['Manage Users', 'View Reports', 'Edit Settings', 'View Billing'],
  manager: ['View Reports', 'Manage Team Data', 'Assign Tasks'],
  viewer: ['View Reports', 'View Data'],
};

export default function UserManagement() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [roles, setRoles] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'viewer',
  });

  useEffect(() => {
    const token = localStorage.getItem('ecomera_token');
    const userStr = localStorage.getItem('ecomera_user');
    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      setCurrentUser(user);

      if (user.role !== 'owner' && user.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      fetchData();
    } catch (err) {
      router.push('/login');
    }
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ecomera_token');
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      // Fetch each endpoint individually so one failure does not break the page
      const safeFetch = async (url) => {
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) return null;
          return await res.json();
        } catch { return null; }
      };

      const [usersData, statsData, rolesData, activityData] = await Promise.all([
        safeFetch(`${API_URL}/user-management/users`),
        safeFetch(`${API_URL}/user-management/stats`),
        safeFetch(`${API_URL}/user-management/roles`),
        safeFetch(`${API_URL}/user-management/activity`),
      ]);

      setUsers(usersData && Array.isArray(usersData.users) ? usersData.users : []);
      setStats(statsData ? {
        totalUsers: statsData.total_users || statsData.totalUsers || 0,
        activeUsers: statsData.active_users || statsData.activeUsers || 0,
        byRole: statsData.users_by_role || statsData.byRole || {},
      } : null);
      setRoles(rolesData && Array.isArray(rolesData) ? rolesData : []);
      setActivity(activityData && Array.isArray(activityData.activities) ? activityData.activities : []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteForm.name || !inviteForm.email || !inviteForm.username || !inviteForm.password) {
      alert('Please fill all fields');
      return;
    }

    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${API_URL}/user-management/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      if (!response.ok) throw new Error('Failed to invite user');
      await fetchData();
      setShowInviteForm(false);
      setInviteForm({ name: '', email: '', username: '', password: '', role: 'viewer' });
    } catch (err) {
      alert('Error inviting user: ' + err.message);
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${API_URL}/user-management/users/${userId}/toggle-active`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to toggle user status');
      await fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const getAvailableRoles = () => {
    if (currentUser?.role === 'owner') {
      return ['owner', 'admin', 'manager', 'viewer'];
    }
    return ['manager', 'viewer'];
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.bg }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem' }}>
          <div style={{ color: colors.text }}>Loading...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.bg }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem' }}>
          <div style={{ color: colors.error }}>Error: {error}</div>
          <button
            onClick={fetchData}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: colors.accent,
              color: colors.bg,
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Retry
          </button>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.bg }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '2rem', color: colors.text }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>User Management</h1>
          <p style={{ color: colors.secText, margin: '0.5rem 0 0 0' }}>
            Manage team access and permissions
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '0.75rem',
                padding: '1.5rem',
                textAlign: 'center',
              }}
            >
              <h4 style={{ margin: 0, color: colors.secText, fontSize: '0.9rem' }}>TOTAL USERS</h4>
              <p style={{ margin: '0.75rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>
                {stats.totalUsers}
              </p>
            </div>
            <div
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '0.75rem',
                padding: '1.5rem',
                textAlign: 'center',
              }}
            >
              <h4 style={{ margin: 0, color: colors.secText, fontSize: '0.9rem' }}>ACTIVE</h4>
              <p style={{ margin: '0.75rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: colors.success }}>
                {stats.activeUsers}
              </p>
            </div>
            <div
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '0.75rem',
                padding: '1.5rem',
                textAlign: 'center',
              }}
            >
              <h4 style={{ margin: 0, color: colors.secText, fontSize: '0.9rem' }}>BY ROLE</h4>
              <div style={{ margin: '1rem 0 0 0', fontSize: '0.85rem' }}>
                {stats.byRole && Object.entries(stats.byRole).map(([role, count]) => (
                  <div key={role} style={{ color: colors.secText, marginBottom: '0.35rem' }}>
                    {role}: <span style={{ color: roleColors[role] || colors.text, fontWeight: 'bold' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Invite User Button */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: colors.accent,
              color: colors.bg,
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {showInviteForm ? 'Cancel' : '+ Invite User'}
          </button>
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <div
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: '0.75rem',
              padding: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Invite New User</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Full Name"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                style={{
                  padding: '0.75rem',
                  backgroundColor: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.5rem',
                }}
              />
              <input
                type="email"
                placeholder="Email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                style={{
                  padding: '0.75rem',
                  backgroundColor: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.5rem',
                }}
              />
              <input
                type="text"
                placeholder="Username"
                value={inviteForm.username}
                onChange={(e) => setInviteForm({ ...inviteForm, username: e.target.value })}
                style={{
                  padding: '0.75rem',
                  backgroundColor: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.5rem',
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={inviteForm.password}
                onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                style={{
                  padding: '0.75rem',
                  backgroundColor: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.5rem',
                }}
              />
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                style={{
                  padding: '0.75rem',
                  backgroundColor: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.5rem',
                }}
              >
                {getAvailableRoles().map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleInviteUser}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: colors.success,
                color: colors.bg,
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Send Invite
            </button>
          </div>
        )}

        {/* Users Table */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Team Members</h2>
          {Array.isArray(users) && users.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  backgroundColor: colors.card,
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Name
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Email
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Role
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Status
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Created
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '1rem', color: colors.text }}>{user.name}</td>
                      <td style={{ padding: '1rem', color: colors.text }}>{user.email}</td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            padding: '0.35rem 0.75rem',
                            backgroundColor: roleColors[user.role] || colors.secText,
                            color: user.role === 'owner' ? colors.bg : colors.text,
                            borderRadius: '0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                          }}
                        >
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            padding: '0.35rem 0.75rem',
                            backgroundColor: user.is_active ? colors.success : colors.error,
                            color: colors.bg,
                            borderRadius: '0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                          }}
                        >
                          {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: colors.secText, fontSize: '0.9rem' }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            style={{
                              padding: '0.35rem 0.75rem',
                              backgroundColor: colors.info,
                              color: colors.bg,
                              border: 'none',
                              borderRadius: '0.35rem',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(user.id)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              backgroundColor: user.is_active ? colors.error : colors.success,
                              color: colors.bg,
                              border: 'none',
                              borderRadius: '0.35rem',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                            }}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            style={{
                              padding: '0.35rem 0.75rem',
                              backgroundColor: colors.warning,
                              color: colors.bg,
                              border: 'none',
                              borderRadius: '0.35rem',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                            }}
                          >
                            Reset Pass
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '0.75rem',
                padding: '2rem',
                textAlign: 'center',
                color: colors.secText,
              }}
            >
              No team members yet
            </div>
          )}
        </div>

        {/* Role Permissions */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Role Permissions</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {Object.entries(rolePermissions).map(([role, permissions]) => (
              <div
                key={role}
                style={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    marginBottom: '1rem',
                    color: roleColors[role] || colors.text,
                    fontSize: '1rem',
                  }}
                >
                  {role.toUpperCase()}
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  {Array.isArray(permissions) &&
                    permissions.map((perm, idx) => (
                      <li key={idx} style={{ color: colors.secText, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        {perm}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Recent Activity</h2>
          {Array.isArray(activity) && activity.length > 0 ? (
            <div
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '0.75rem',
                padding: '1.5rem',
              }}
            >
              {activity.map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1rem',
                    borderBottom: idx < activity.length - 1 ? `1px solid ${colors.border}` : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, color: colors.text, fontWeight: '500' }}>{log.action}</p>
                    <p style={{ margin: '0.25rem 0 0 0', color: colors.secText, fontSize: '0.85rem' }}>
                      {log.user} • {log.description}
                    </p>
                  </div>
                  <p style={{ margin: 0, color: colors.secText, fontSize: '0.85rem' }}>{log.timestamp}</p>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '0.75rem',
                padding: '2rem',
                textAlign: 'center',
                color: colors.secText,
              }}
            >
              No activity yet
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
