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

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [health, setHealth] = useState(null);
  const [settings, setSettings] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'viewer' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(null);

  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('ecomera_user') : null;
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        if (parsedUser.role !== 'owner' && parsedUser.role !== 'admin') {
          setError('Access Denied: Only owners and admins can view this page.');
          setLoading(false);
          return;
        }
      } catch (e) {
        setError('Failed to load user data');
        setLoading(false);
        return;
      }
    } else {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersRes, healthRes, settingsRes] = await Promise.all([
        fetch(`${API}/users`, { headers: authHeader() }),
        fetch(`${API}/system/health`, { headers: authHeader() }),
        fetch(`${API}/settings`, { headers: authHeader() }),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }
    } catch (e) {
      console.error('Failed to fetch admin data:', e);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    if (!inviteForm.email) {
      setInviteError('Email is required');
      return;
    }

    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({
          email: inviteForm.email,
          role: inviteForm.role,
        }),
      });

      if (res.ok) {
        setInviteSuccess(`Invitation sent to ${inviteForm.email}`);
        setInviteForm({ email: '', role: 'viewer' });
        fetchData();
      } else {
        const data = await res.json();
        setInviteError(data.message || 'Failed to send invitation');
      }
    } catch (e) {
      console.error('Failed to send invitation:', e);
      setInviteError('Error sending invitation');
    }
  };

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: T.bg }}>
        <Sidebar />
        <div style={{ flex: 1, padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: T.red, fontSize: '18px' }}>
            {error || 'Access Denied'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: T.bg }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', maxHeight: '100vh' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: T.text, marginBottom: '8px' }}>
          Admin Panel
        </h1>
        <p style={{ fontSize: '14px', color: T.textSec, marginBottom: '40px' }}>
          Manage users, system health, and organization settings
        </p>

        {error && !loading && (
          <div style={{ backgroundColor: T.red + '20', border: `1px solid ${T.red}`, borderRadius: '8px', padding: '16px', marginBottom: '24px', color: T.red }}>
            {error}
          </div>
        )}

        {/* System Health */}
        {health && (
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: T.text, marginBottom: '16px' }}>
              System Health
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: T.textSec, marginBottom: '8px' }}>Status</div>
                <div style={{ fontSize: '14px', color: health.status === 'healthy' ? T.green : T.red, fontWeight: 600 }}>
                  {health.status || 'Unknown'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: T.textSec, marginBottom: '8px' }}>Uptime</div>
                <div style={{ fontSize: '14px', color: T.text, fontWeight: 600 }}>
                  {health.uptime ? `${Math.floor(health.uptime / 3600)}h` : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: T.textSec, marginBottom: '8px' }}>Last Check</div>
                <div style={{ fontSize: '14px', color: T.text, fontWeight: 600 }}>
                  {health.lastCheck ? new Date(health.lastCheck).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Organization Settings */}
        {settings && (
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: T.text, marginBottom: '16px' }}>
              Organization Settings
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: T.textSec, marginBottom: '8px' }}>Organization Name</div>
                <div style={{ fontSize: '14px', color: T.text, fontWeight: 600 }}>
                  {settings.orgName || 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: T.textSec, marginBottom: '8px' }}>Plan</div>
                <div style={{ fontSize: '14px', color: T.yellow, fontWeight: 600, textTransform: 'capitalize' }}>
                  {settings.plan || 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: T.textSec, marginBottom: '8px' }}>Members</div>
                <div style={{ fontSize: '14px', color: T.text, fontWeight: 600 }}>
                  {settings.memberCount || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: T.textSec, marginBottom: '8px' }}>Created</div>
                <div style={{ fontSize: '14px', color: T.text, fontWeight: 600 }}>
                  {settings.createdAt ? new Date(settings.createdAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invite User Form */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: T.text, marginBottom: '16px' }}>
            Invite Team Member
          </h2>
          <form onSubmit={handleInviteSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: T.textSec, display: 'block', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="user@example.com"
                style={{
                  width: '100%',
                  backgroundColor: '#0A0A0A',
                  border: `1px solid ${T.border}`,
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: T.text,
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: T.textSec, display: 'block', marginBottom: '6px' }}>
                Role
              </label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                style={{
                  backgroundColor: '#0A0A0A',
                  border: `1px solid ${T.border}`,
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: T.text,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="viewer">Viewer</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              style={{
                backgroundColor: T.yellow,
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 24px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Send Invitation
            </button>
          </form>
          {inviteError && (
            <div style={{ color: T.red, fontSize: '12px', marginTop: '12px' }}>
              {inviteError}
            </div>
          )}
          {inviteSuccess && (
            <div style={{ color: T.green, fontSize: '12px', marginTop: '12px' }}>
              {inviteSuccess}
            </div>
          )}
        </div>

        {/* Users Table */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px', overflowX: 'auto' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: T.text, marginBottom: '16px' }}>
            Team Members ({users.length})
          </h2>
          {users.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: T.textSec, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Name
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: T.textSec, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Email
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: T.textSec, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Role
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: T.textSec, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: T.textSec, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '12px 0', color: T.text, fontSize: '14px' }}>
                      {u.name}
                    </td>
                    <td style={{ padding: '12px 0', color: T.textSec, fontSize: '14px' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: '14px' }}>
                      <span style={{
                        display: 'inline-block',
                        backgroundColor:
                          u.role === 'owner' ? T.yellow + '30' :
                          u.role === 'admin' ? T.blue + '30' :
                          u.role === 'manager' ? T.green + '30' :
                          T.textMut + '30',
                        color:
                          u.role === 'owner' ? T.yellow :
                          u.role === 'admin' ? T.blue :
                          u.role === 'manager' ? T.green :
                          T.textMut,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 0', color: u.active ? T.green : T.textMut, fontSize: '14px' }}>
                      {u.active ? 'Active' : 'Inactive'}
                    </td>
                    <td style={{ padding: '12px 0', color: T.textSec, fontSize: '14px' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textSec }}>
              No users found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
