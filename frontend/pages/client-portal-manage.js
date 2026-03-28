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

// Mock clients data
const mockClients = [
  { id: '1', name: 'Acme Corp' },
  { id: '2', name: 'Global Ventures Inc' },
  { id: '3', name: 'Tech Solutions Ltd' },
  { id: '4', name: 'Premium Retail Group' },
  { id: '5', name: 'E-Commerce Plus' },
];

// Mock messages data
const mockMessages = [
  {
    id: 1,
    subject: 'Question about inventory reports',
    sender: 'john@acmecorp.com',
    date: '2026-03-28 14:32',
    read: false,
  },
  {
    id: 2,
    subject: 'Request for Q2 financial summary',
    sender: 'sarah@globalventures.com',
    date: '2026-03-27 11:15',
    read: false,
  },
  {
    id: 3,
    subject: 'Permission request for new team member',
    sender: 'admin@techsolutions.com',
    date: '2026-03-26 09:48',
    read: true,
  },
  {
    id: 4,
    subject: 'Portal access issue resolved',
    sender: 'support@premiumretail.com',
    date: '2026-03-25 16:22',
    read: true,
  },
  {
    id: 5,
    subject: 'Thank you for the dashboard update',
    sender: 'ops@ecommerceplus.com',
    date: '2026-03-24 13:05',
    read: true,
  },
];

export default function ClientPortalManage() {
  const router = useRouter();
  const [portalUsers, setPortalUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [messages, setMessages] = useState(mockMessages);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    client: '',
    email: '',
    password: '',
    permissions: {
      viewPandL: true,
      viewInventory: true,
      viewReports: true,
      canMessage: true,
    },
  });

  useEffect(() => {
    const token = localStorage.getItem('ecomera_token');
    const user = localStorage.getItem('ecomera_user');
    if (!token || !user) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ecomera_token');
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const portalRes = await fetch(`${API_URL}/client-portal-ext/portal-users`, { headers });

      if (!portalRes.ok) {
        throw new Error('Failed to fetch portal users');
      }

      const portalData = await portalRes.json();
      setPortalUsers(Array.isArray(portalData.portalUsers) ? portalData.portalUsers : []);

      // Calculate stats
      const active = portalData.portalUsers?.filter((u) => u.status === 'active').length || 0;
      const inactive = portalData.portalUsers?.filter((u) => u.status === 'inactive').length || 0;

      setStats({
        totalPortalUsers: portalData.portalUsers?.length || 0,
        activePortalUsers: active,
        inactivePortalUsers: inactive,
      });

      setError(null);
    } catch (err) {
      setError(err.message);
      // Set default stats on error
      setStats({
        totalPortalUsers: 0,
        activePortalUsers: 0,
        inactivePortalUsers: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccess = async () => {
    if (!createForm.client || !createForm.email || !createForm.password) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${API_URL}/client-portal-ext/create-access`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (!response.ok) throw new Error('Failed to create portal access');
      await fetchData();
      setShowCreateForm(false);
      setCreateForm({
        client: '',
        email: '',
        password: '',
        permissions: {
          viewPandL: true,
          viewInventory: true,
          viewReports: true,
          canMessage: true,
        },
      });
    } catch (err) {
      alert('Error creating access: ' + err.message);
    }
  };

  const togglePermission = (permission) => {
    setCreateForm({
      ...createForm,
      permissions: {
        ...createForm.permissions,
        [permission]: !createForm.permissions[permission],
      },
    });
  };

  const getPermissionIcons = (user) => {
    const icons = [];
    if (user.permissions?.viewPandL) icons.push('💰');
    if (user.permissions?.viewInventory) icons.push('📦');
    if (user.permissions?.viewReports) icons.push('📊');
    if (user.permissions?.canMessage) icons.push('💬');
    return icons;
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.bg }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '2rem', color: colors.text }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Client Portal Management</h1>
          <p style={{ color: colors.secText, margin: '0.5rem 0 0 0' }}>
            Manage external client access to their dashboards
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              backgroundColor: '#2D1B1B',
              border: `1px solid ${colors.error}`,
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1.5rem',
              color: colors.error,
            }}
          >
            {error}
          </div>
        )}

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
              <h4 style={{ margin: 0, color: colors.secText, fontSize: '0.9rem' }}>TOTAL PORTAL USERS</h4>
              <p style={{ margin: '0.75rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>
                {stats.totalPortalUsers}
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
                {stats.activePortalUsers}
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
              <h4 style={{ margin: 0, color: colors.secText, fontSize: '0.9rem' }}>INACTIVE</h4>
              <p style={{ margin: '0.75rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: colors.error }}>
                {stats.inactivePortalUsers}
              </p>
            </div>
          </div>
        )}

        {/* Create Portal Access Button */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
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
            {showCreateForm ? 'Cancel' : '+ Create Portal Access'}
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: '0.75rem',
              padding: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Create Portal Access</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <select
                value={createForm.client}
                onChange={(e) => setCreateForm({ ...createForm, client: e.target.value })}
                style={{
                  padding: '0.75rem',
                  backgroundColor: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.5rem',
                }}
              >
                <option value="">Select Client</option>
                {mockClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <input
                type="email"
                placeholder="Email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
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
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                style={{
                  padding: '0.75rem',
                  backgroundColor: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.5rem',
                }}
              />
            </div>

            {/* Permissions Checkboxes */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${colors.border}` }}>
              <h4 style={{ margin: '0 0 1rem 0', color: colors.secText }}>Permissions</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {[
                  { key: 'viewPandL', label: 'View P&L' },
                  { key: 'viewInventory', label: 'View Inventory' },
                  { key: 'viewReports', label: 'View Reports' },
                  { key: 'canMessage', label: 'Can Message' },
                ].map((perm) => (
                  <label
                    key={perm.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      color: colors.text,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={createForm.permissions[perm.key]}
                      onChange={() => togglePermission(perm.key)}
                      style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                    />
                    {perm.label}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateAccess}
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
              Create Access
            </button>
          </div>
        )}

        {/* Portal Users Table */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Portal Users</h2>
          {Array.isArray(portalUsers) && portalUsers.length > 0 ? (
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
                      Client Name
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Email
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Status
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Permissions
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Last Login
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {portalUsers.map((user) => (
                    <tr key={user.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '1rem', color: colors.text, fontWeight: '500' }}>{user.clientName}</td>
                      <td style={{ padding: '1rem', color: colors.text }}>{user.email}</td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            padding: '0.35rem 0.75rem',
                            backgroundColor: user.status === 'active' ? colors.success : colors.error,
                            color: colors.bg,
                            borderRadius: '0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                          }}
                        >
                          {user.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '1.25rem' }}>
                        {getPermissionIcons(user).map((icon, idx) => (
                          <span key={idx} style={{ marginRight: '0.5rem' }}>
                            {icon}
                          </span>
                        ))}
                      </td>
                      <td style={{ padding: '1rem', color: colors.secText, fontSize: '0.9rem' }}>
                        {user.lastLogin || 'Never'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                            Edit Perms
                          </button>
                          <button
                            style={{
                              padding: '0.35rem 0.75rem',
                              backgroundColor: colors.error,
                              color: colors.bg,
                              border: 'none',
                              borderRadius: '0.35rem',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                            }}
                          >
                            Revoke
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
              No portal users created yet
            </div>
          )}
        </div>

        {/* Messages Section */}
        <div>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Client Messages</h2>
          {Array.isArray(messages) && messages.length > 0 ? (
            <div
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '0.75rem',
                padding: 0,
                overflow: 'hidden',
              }}
            >
              {messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  style={{
                    padding: '1rem',
                    borderBottom: idx < messages.length - 1 ? `1px solid ${colors.border}` : 'none',
                    backgroundColor: !msg.read ? '#1A1A2E' : colors.card,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                        <p
                          style={{
                            margin: 0,
                            color: colors.text,
                            fontWeight: !msg.read ? 'bold' : 'normal',
                          }}
                        >
                          {msg.subject}
                        </p>
                        {!msg.read && (
                          <span
                            style={{
                              padding: '0.2rem 0.6rem',
                              backgroundColor: colors.info,
                              color: colors.bg,
                              borderRadius: '0.25rem',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                            }}
                          >
                            NEW
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '0.35rem 0 0 0', color: colors.secText, fontSize: '0.9rem' }}>
                        From: {msg.sender}
                      </p>
                    </div>
                    <p style={{ margin: 0, color: colors.secText, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {msg.date}
                    </p>
                  </div>
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
              No messages
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
