import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Sidebar from '../components/Sidebar';

const COLORS = {
  bg: '#0A0A0A',
  card: '#111111',
  border: '#1E1E1E',
  accent: '#FFD700',
  text: '#FFFFFF',
  textSec: '#888888',
  green: '#22C55E',
  red: '#EF4444',
  blue: '#3B82F6',
  purple: '#8B5CF6',
};

export default function PortalAdmin() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    email: '',
    name: '',
    password: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

  useEffect(() => {
    loadUsers();
    loadClients();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/portal/users`);
      if (!response.ok) throw new Error('Failed to load users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Load users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await fetch(`${apiBase}/clients`);
      if (!response.ok) throw new Error('Failed to load clients');
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Load clients error:', error);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const url = editingId ? `${apiBase}/portal/users/${editingId}` : `${apiBase}/portal/users`;
      const method = editingId ? 'PUT' : 'POST';

      const payload = editingId
        ? { name: formData.name, email: formData.email }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save user');

      setSuccessMessage(editingId ? 'User updated successfully' : 'User created successfully');
      setTimeout(() => setSuccessMessage(''), 3000);

      setFormData({ clientId: '', email: '', name: '', password: '' });
      setShowCreateForm(false);
      setEditingId(null);
      loadUsers();
    } catch (error) {
      setFormError(error.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingId(user.id);
    setFormData({
      clientId: user.clientId || '',
      email: user.email,
      name: user.name,
      password: '',
    });
    setShowCreateForm(true);
  };

  const handleRevokeUser = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this user?')) return;

    try {
      const response = await fetch(`${apiBase}/portal/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to revoke user');

      setSuccessMessage('User revoked successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadUsers();
    } catch (error) {
      console.error('Revoke error:', error);
    }
  };

  const handleOpenResetModal = (userId) => {
    setResetUserId(userId);
    setResetPassword('');
    setResetError('');
    setShowResetModal(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);

    try {
      const response = await fetch(`${apiBase}/portal/users/${resetUserId}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPassword }),
      });

      if (!response.ok) throw new Error('Failed to reset password');

      setSuccessMessage('Password reset successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowResetModal(false);
      loadUsers();
    } catch (error) {
      setResetError(error.message || 'Reset failed');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingId(null);
    setFormData({ clientId: '', email: '', name: '', password: '' });
    setFormError('');
  };

  return (
    <>
      <Head>
        <title>Client Portal Management - Ecomera</title>
      </Head>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: COLORS.bg }}>
        <Sidebar />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Page Header */}
          <div style={{
            backgroundColor: COLORS.card,
            borderBottom: `1px solid ${COLORS.border}`,
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: COLORS.text,
              margin: 0,
            }}>
              Client Portal Management
            </h1>
            <button
              onClick={() => {
                setShowCreateForm(true);
                setEditingId(null);
                setFormData({ clientId: '', email: '', name: '', password: '' });
              }}
              style={{
                padding: '10px 16px',
                backgroundColor: COLORS.accent,
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              + Create Portal Access
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div style={{
              margin: '16px 24px',
              padding: '12px 16px',
              backgroundColor: `${COLORS.green}20`,
              border: `1px solid ${COLORS.green}`,
              color: COLORS.green,
              borderRadius: '6px',
              fontSize: '13px',
            }}>
              {successMessage}
            </div>
          )}

          {/* Create Form */}
          {showCreateForm && (
            <div style={{
              margin: '16px 24px',
              padding: '20px',
              backgroundColor: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '8px',
            }}>
              <h2 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: COLORS.text,
                marginTop: 0,
                marginBottom: '16px',
              }}>
                {editingId ? 'Edit Portal User' : 'Create New Portal User'}
              </h2>

              <form onSubmit={handleCreateUser}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  {!editingId && (
                    <div>
                      <label style={{
                        display: 'block',
                        color: COLORS.text,
                        fontSize: '13px',
                        fontWeight: '500',
                        marginBottom: '6px',
                      }}>
                        Client *
                      </label>
                      <select
                        name="clientId"
                        value={formData.clientId}
                        onChange={handleFormChange}
                        required={!editingId}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: COLORS.bg,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: '6px',
                          color: COLORS.text,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="">Select a client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label style={{
                      display: 'block',
                      color: COLORS.text,
                      fontSize: '13px',
                      fontWeight: '500',
                      marginBottom: '6px',
                    }}>
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="User name"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '6px',
                        color: COLORS.text,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      color: COLORS.text,
                      fontSize: '13px',
                      fontWeight: '500',
                      marginBottom: '6px',
                    }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      placeholder="user@example.com"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '6px',
                        color: COLORS.text,
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {!editingId && (
                    <div>
                      <label style={{
                        display: 'block',
                        color: COLORS.text,
                        fontSize: '13px',
                        fontWeight: '500',
                        marginBottom: '6px',
                      }}>
                        Password *
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleFormChange}
                        placeholder="••••••••"
                        required={!editingId}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: COLORS.bg,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: '6px',
                          color: COLORS.text,
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}
                </div>

                {formError && (
                  <div style={{
                    backgroundColor: `${COLORS.red}20`,
                    border: `1px solid ${COLORS.red}`,
                    color: COLORS.red,
                    padding: '10px 12px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '13px',
                  }}>
                    {formError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit"
                    disabled={formLoading}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: formLoading ? COLORS.textSec : COLORS.accent,
                      color: '#000',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: formLoading ? 'not-allowed' : 'pointer',
                      opacity: formLoading ? 0.6 : 1,
                    }}
                  >
                    {formLoading ? 'Saving...' : editingId ? 'Update User' : 'Create User'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: 'transparent',
                      color: COLORS.textSec,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users Table */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ color: COLORS.textSec, textAlign: 'center', padding: '40px' }}>Loading users...</div>
            ) : users.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px',
                }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      {['Name', 'Email', 'Client Name', 'Status', 'Last Login', 'Actions'].map((header) => (
                        <th
                          key={header}
                          style={{
                            padding: '12px',
                            textAlign: 'left',
                            color: COLORS.textSec,
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, idx) => (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: `1px solid ${COLORS.border}`,
                          backgroundColor: idx % 2 === 0 ? 'transparent' : `${COLORS.card}80`,
                        }}
                      >
                        <td style={{ padding: '12px', color: COLORS.text }}>{user.name}</td>
                        <td style={{ padding: '12px', color: COLORS.accent }}>{user.email}</td>
                        <td style={{ padding: '12px', color: COLORS.text }}>{user.clientName}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor: user.active ? `${COLORS.green}20` : `${COLORS.red}20`,
                            color: user.active ? COLORS.green : COLORS.red,
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                          }}>
                            {user.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: COLORS.textSec }}>
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleEditUser(user)}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: COLORS.blue,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleOpenResetModal(user.id)}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: COLORS.purple,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              Reset Pwd
                            </button>
                            <button
                              onClick={() => handleRevokeUser(user.id)}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: COLORS.red,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer',
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
              <div style={{ color: COLORS.textSec, textAlign: 'center', padding: '40px' }}>No portal users found</div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div style={{
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
        }}>
          <div style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: COLORS.text,
              marginTop: 0,
              marginBottom: '16px',
            }}>
              Reset Password
            </h2>

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  color: COLORS.text,
                  fontSize: '13px',
                  fontWeight: '500',
                  marginBottom: '6px',
                }}>
                  New Password *
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    color: COLORS.text,
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {resetError && (
                <div style={{
                  backgroundColor: `${COLORS.red}20`,
                  border: `1px solid ${COLORS.red}`,
                  color: COLORS.red,
                  padding: '10px 12px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '13px',
                }}>
                  {resetError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: 'transparent',
                    color: COLORS.textSec,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: resetLoading ? COLORS.textSec : COLORS.accent,
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: resetLoading ? 'not-allowed' : 'pointer',
                    opacity: resetLoading ? 0.6 : 1,
                  }}
                >
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
