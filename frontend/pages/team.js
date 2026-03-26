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

const getRoleColor = (role) => {
  switch (role) {
    case 'owner':
      return { bg: T.yellow + '20', text: T.yellow };
    case 'admin':
      return { bg: T.blue + '20', text: T.blue };
    case 'manager':
      return { bg: T.green + '20', text: T.green };
    default:
      return { bg: T.textMut + '20', text: T.textMut };
  }
};

export default function TeamManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'viewer' });
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(null);

  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('ecomera_user') : null;
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }

    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API}/users`, { headers: authHeader() });

      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to load team members');
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
      setError('Error loading team members');
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
        fetchUsers();
      } else {
        const data = await res.json();
        setInviteError(data.message || 'Failed to send invitation');
      }
    } catch (e) {
      console.error('Failed to send invitation:', e);
      setInviteError('Error sending invitation');
    }
  };

  const isAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: T.bg }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', maxHeight: '100vh' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: T.text, marginBottom: '8px' }}>
          Team Management
        </h1>
        <p style={{ fontSize: '14px', color: T.textSec, marginBottom: '40px' }}>
          Manage your team members and collaborators
        </p>

        {error && !loading && (
          <div style={{ backgroundColor: T.red + '20', border: `1px solid ${T.red}`, borderRadius: '8px', padding: '16px', marginBottom: '24px', color: T.red }}>
            {error}
          </div>
        )}

        {/* Invite Form (only for admin/owner) */}
        {isAdmin && (
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: T.text, marginBottom: '16px' }}>
              Invite Team Member
            </h2>
            <form onSubmit={handleInviteSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: T.textSec, display: 'block', marginBottom: '6px', fontWeight: 600 }}>
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
                <label style={{ fontSize: '12px', color: T.textSec, display: 'block', marginBottom: '6px', fontWeight: 600 }}>
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
        )}

        {/* Team Members Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textSec }}>
            Loading team members...
          </div>
        ) : users.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {users.map((user) => {
              const roleColor = getRoleColor(user.role);
              return (
                <div
                  key={user.id}
                  style={{
                    backgroundColor: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: '8px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = T.yellow;
                    e.currentTarget.style.boxShadow = `0 0 0 1px ${T.yellow}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = T.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: T.yellow,
                      color: '#000',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '18px',
                      flexShrink: 0,
                    }}>
                      {user.avatar || user.name?.[0] || 'U'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: T.text }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: '12px', color: T.textSec, marginTop: '2px' }}>
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      backgroundColor: roleColor.bg,
                      color: roleColor.text,
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}>
                      {user.role}
                    </span>
                    <span style={{
                      display: 'inline-block',
                      backgroundColor: user.active ? T.green + '20' : T.textMut + '20',
                      color: user.active ? T.green : T.textMut,
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: T.textMut, paddingTop: '8px', borderTop: `1px solid ${T.border}` }}>
                    Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '40px', textAlign: 'center', color: T.textSec }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>
              No team members yet
            </div>
            <div style={{ fontSize: '14px' }}>
              {isAdmin ? 'Invite your first team member using the form above.' : 'Waiting for admin to invite team members.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
