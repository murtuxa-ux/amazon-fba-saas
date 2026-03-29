import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Viewer' });
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'Viewer' });

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const rolePermissions = {
    Owner: ['Full access', 'Manage users', 'Edit settings', 'Delete workspace'],
    Admin: ['Manage users', 'Edit settings', 'View reports', 'Create campaigns'],
    Manager: ['Create campaigns', 'View reports', 'Edit own campaigns', 'Manage team members'],
    Viewer: ['View reports', 'View campaigns', 'Download data'],
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ecomera_token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch(`${BASE_URL}/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      const usersList = Array.isArray(data) ? data : (data?.users || []);
      setUsers(usersList);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/users/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteForm),
      });

      if (!response.ok) {
        throw new Error('Failed to invite user');
      }

      setInviteForm({ name: '', email: '', role: 'Viewer' });
      setShowInviteModal(false);
      fetchUsers();
    } catch (err) {
      console.error('Error inviting user:', err);
      alert('Error inviting user: ' + err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      setEditingUser(null);
      setEditForm({ name: '', email: '', role: 'Viewer' });
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      alert('Error updating user: ' + err.message);
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this user?')) return;

    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove user');
      }

      fetchUsers();
    } catch (err) {
      console.error('Error removing user:', err);
      alert('Error removing user: ' + err.message);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'Viewer',
    });
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
    section: {
      marginBottom: '40px',
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '15px',
      color: '#FFD700',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '30px',
    },
    tableHeader: {
      backgroundColor: '#111111',
      borderBottom: '2px solid #1E1E1E',
      padding: '12px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: '#AAA',
      textTransform: 'uppercase',
    },
    tableRow: {
      borderBottom: '1px solid #1E1E1E',
    },
    tableCell: {
      padding: '12px',
      fontSize: '14px',
      color: '#FFF',
    },
    badge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: '#1E1E1E',
    },
    badgeOwner: {
      backgroundColor: '#FFD700',
      color: '#0A0A0A',
    },
    badgeAdmin: {
      backgroundColor: '#EF4444',
      color: '#FFF',
    },
    badgeManager: {
      backgroundColor: '#3B82F6',
      color: '#FFF',
    },
    badgeViewer: {
      backgroundColor: '#6B7280',
      color: '#FFF',
    },
    statusBadge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: '#22C55E',
      color: '#0A0A0A',
    },
    actionButton: {
      backgroundColor: 'transparent',
      border: '1px solid #1E1E1E',
      color: '#FFD700',
      padding: '6px 12px',
      marginRight: '8px',
      borderRadius: '4px',
      fontSize: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    removeButton: {
      color: '#EF4444',
    },
    permissionsList: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
    },
    roleGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
    },
    roleCard: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '16px',
    },
    roleCardTitle: {
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '12px',
      color: '#FFD700',
    },
    permissionItem: {
      fontSize: '13px',
      color: '#AAA',
      marginBottom: '8px',
      paddingLeft: '16px',
      position: 'relative',
    },
    permissionItemBefore: {
      position: 'absolute',
      left: 0,
      content: '"✓"',
      color: '#22C55E',
      fontWeight: 'bold',
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '30px',
      width: '90%',
      maxWidth: '400px',
      maxHeight: '90vh',
      overflowY: 'auto',
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '20px',
      color: '#FFD700',
    },
    formGroup: {
      marginBottom: '15px',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
      marginBottom: '6px',
      color: '#AAA',
    },
    input: {
      width: '100%',
      padding: '10px',
      backgroundColor: '#0A0A0A',
      border: '1px solid #1E1E1E',
      borderRadius: '4px',
      color: '#FFF',
      fontSize: '14px',
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '10px',
      backgroundColor: '#0A0A0A',
      border: '1px solid #1E1E1E',
      borderRadius: '4px',
      color: '#FFF',
      fontSize: '14px',
      boxSizing: 'border-box',
    },
    formActions: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '20px',
    },
    submitButton: {
      backgroundColor: '#FFD700',
      color: '#0A0A0A',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    cancelButton: {
      backgroundColor: 'transparent',
      border: '1px solid #1E1E1E',
      color: '#AAA',
      padding: '10px 20px',
      borderRadius: '4px',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    loadingState: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#666',
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#666',
      backgroundColor: '#111111',
      borderRadius: '8px',
      border: '1px solid #1E1E1E',
    },
  };

  const getBadgeStyle = (role) => {
    const baseStyle = styles.badge;
    switch (role) {
      case 'Owner':
        return { ...baseStyle, ...styles.badgeOwner };
      case 'Admin':
        return { ...baseStyle, ...styles.badgeAdmin };
      case 'Manager':
        return { ...baseStyle, ...styles.badgeManager };
      case 'Viewer':
        return { ...baseStyle, ...styles.badgeViewer };
      default:
        return baseStyle;
    }
  };

  return (
    <div style={styles.container}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>User Management</h1>
          <button
            style={styles.button}
            onClick={() => setShowInviteModal(true)}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#FFC700')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#FFD700')}
          >
            + Invite User
          </button>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Team Members</h2>
          {loading ? (
            <div style={styles.loadingState}>Loading team members...</div>
          ) : error ? (
            <div style={styles.emptyState}>
              <p>Error: {error}</p>
            </div>
          ) : users.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No team members yet. Invite someone to get started!</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableRow}>
                  <th style={styles.tableHeader}>Name</th>
                  <th style={styles.tableHeader}>Email</th>
                  <th style={styles.tableHeader}>Role</th>
                  <th style={styles.tableHeader}>Status</th>
                  <th style={styles.tableHeader}>Joined Date</th>
                  <th style={styles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>{user.name || 'N/A'}</td>
                    <td style={styles.tableCell}>{user.email}</td>
                    <td style={styles.tableCell}>
                      <span style={getBadgeStyle(user.role || 'Viewer')}>
                        {user.role || 'Viewer'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={styles.statusBadge}>Active</span>
                    </td>
                    <td style={styles.tableCell}>
                      {user.joinedDate
                        ? new Date(user.joinedDate).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td style={styles.tableCell}>
                      <button
                        style={styles.actionButton}
                        onClick={() => handleEditClick(user)}
                        onMouseEnter={(e) => (e.target.backgroundColor = '#1E1E1E')}
                        onMouseLeave={(e) => (e.target.backgroundColor = 'transparent')}
                      >
                        Edit
                      </button>
                      <button
                        style={{ ...styles.actionButton, ...styles.removeButton }}
                        onClick={() => handleRemoveUser(user.id)}
                        onMouseEnter={(e) => (e.target.backgroundColor = '#1E1E1E')}
                        onMouseLeave={(e) => (e.target.backgroundColor = 'transparent')}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Role Permissions</h2>
          <div style={styles.roleGrid}>
            {Object.entries(rolePermissions).map(([role, permissions]) => (
              <div key={role} style={styles.roleCard}>
                <div style={styles.roleCardTitle}>{role}</div>
                <div>
                  {permissions.map((permission, idx) => (
                    <div key={idx} style={styles.permissionItem}>
                      <span style={styles.permissionItemBefore}>✓ </span>
                      {permission}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {showInviteModal && (
        <div style={styles.modal} onClick={() => setShowInviteModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Invite User</h2>
            <form onSubmit={handleInviteSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="User name"
                  value={inviteForm.name}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  style={styles.input}
                  placeholder="user@example.com"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Role</label>
                <select
                  style={styles.select}
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, role: e.target.value })
                  }
                >
                  <option value="Viewer">Viewer</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                  <option value="Owner">Owner</option>
                </select>
              </div>
              <div style={styles.formActions}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setShowInviteModal(false)}
                  onMouseEnter={(e) => (e.target.backgroundColor = '#1E1E1E')}
                  onMouseLeave={(e) => (e.target.backgroundColor = 'transparent')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                  onMouseEnter={(e) => (e.target.backgroundColor = '#FFC700')}
                  onMouseLeave={(e) => (e.target.backgroundColor = '#FFD700')}
                >
                  Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div style={styles.modal} onClick={() => setEditingUser(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Edit User</h2>
            <form onSubmit={handleEditSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="User name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  style={styles.input}
                  placeholder="user@example.com"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Role</label>
                <select
                  style={styles.select}
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                >
                  <option value="Viewer">Viewer</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                  <option value="Owner">Owner</option>
                </select>
              </div>
              <div style={styles.formActions}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setEditingUser(null)}
                  onMouseEnter={(e) => (e.target.backgroundColor = '#1E1E1E')}
                  onMouseLeave={(e) => (e.target.backgroundColor = 'transparent')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                  onMouseEnter={(e) => (e.target.backgroundColor = '#FFC700')}
                  onMouseLeave={(e) => (e.target.backgroundColor = '#FFD700')}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
