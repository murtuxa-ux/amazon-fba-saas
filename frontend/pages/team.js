'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";
const token = () => typeof window !== "undefined" ? localStorage.getItem("ecomera_token") : null;
const authHeader = () => ({ headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" } });

export default function Team() {
  const [team, setTeam] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'viewer' });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    fetchTeam();
    getCurrentUser();
  }, []);

  const fetchTeam = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/users`, authHeader());
      if (!res.ok) throw new Error('Failed to fetch team');
      const data = await res.json();
      setTeam(Array.isArray(data) ? data : data.users || []);
    } catch (err) {
      setError(err.message);
      setTeam([]);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUser = async () => {
    try {
      const res = await fetch(`${API_URL}/users/me`, authHeader());
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      }
    } catch (err) {
      console.error('Failed to get current user:', err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        ...authHeader(),
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to add team member');

      const newMember = await res.json();
      setTeam([...team, newMember]);
      setFormData({ name: '', email: '', role: 'viewer' });
      setShowAddForm(false);
      setSuccessMessage('Team member added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    setRemovingId(userId);
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        ...authHeader()
      });

      if (!res.ok) throw new Error('Failed to remove team member');

      setTeam(team.filter(m => m.id !== userId));
      setSuccessMessage('Team member removed');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingId(null);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'owner':
        return { bg: '#FFD700', text: '#000' };
      case 'admin':
        return { bg: '#A855F7', text: '#FFF' };
      case 'manager':
        return { bg: '#3B82F6', text: '#FFF' };
      case 'viewer':
      default:
        return { bg: '#6B7280', text: '#FFF' };
    }
  };

  const isAdminOrOwner = currentUser && (currentUser.role === 'admin' || currentUser.role === 'owner');

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0A0A" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ color: "#FFFFFF", fontSize: "2.5rem", fontWeight: 800 }}>
            Team Management
          </h1>
          {isAdminOrOwner && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                background: "#FFD700",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                padding: "0.6rem 1.2rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = "#FFC500"}
              onMouseLeave={(e) => e.target.style.background = "#FFD700"}
            >
              + Add Team Member
            </button>
          )}
        </div>

        {error && (
          <div style={{
            background: "#EF4444",
            color: "#FFF",
            padding: "1rem",
            borderRadius: "12px",
            marginBottom: "2rem"
          }}>
            Error: {error}
          </div>
        )}

        {successMessage && (
          <div style={{
            background: "#10B981",
            color: "#FFF",
            padding: "1rem",
            borderRadius: "12px",
            marginBottom: "2rem"
          }}>
            {successMessage}
          </div>
        )}

        {/* Add Team Member Form */}
        {showAddForm && isAdminOrOwner && (
          <div style={{
            background: "#111111",
            border: "1px solid #1E1E1E",
            borderRadius: "12px",
            padding: "2rem",
            marginBottom: "2rem"
          }}>
            <h3 style={{ color: "#FFD700", fontSize: "1.3rem", fontWeight: 700, marginBottom: "1.5rem" }}>
              Add New Team Member
            </h3>
            <form onSubmit={handleAddMember} style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={{ color: "#888", fontSize: "0.85rem", display: "block", marginBottom: "0.5rem" }}>
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: "100%",
                    background: "#0A0A0A",
                    border: "1px solid #1E1E1E",
                    borderRadius: "8px",
                    padding: "0.8rem",
                    color: "#FFFFFF",
                    fontSize: "1rem",
                    boxSizing: "border-box"
                  }}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label style={{ color: "#888", fontSize: "0.85rem", display: "block", marginBottom: "0.5rem" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: "100%",
                    background: "#0A0A0A",
                    border: "1px solid #1E1E1E",
                    borderRadius: "8px",
                    padding: "0.8rem",
                    color: "#FFFFFF",
                    fontSize: "1rem",
                    boxSizing: "border-box"
                  }}
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label style={{ color: "#888", fontSize: "0.85rem", display: "block", marginBottom: "0.5rem" }}>
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{
                    width: "100%",
                    background: "#0A0A0A",
                    border: "1px solid #1E1E1E",
                    borderRadius: "8px",
                    padding: "0.8rem",
                    color: "#FFFFFF",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                    cursor: "pointer"
                  }}
                >
                  <option value="viewer">Viewer (Read-only)</option>
                  <option value="manager">Manager (Limited edit)</option>
                  <option value="admin">Admin (Full access)</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: "#FFD700",
                    color: "#000",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.6rem 1.2rem",
                    fontWeight: 700,
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                    transition: "all 0.3s ease"
                  }}
                >
                  {submitting ? 'Adding...' : 'Add Member'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{
                    background: "transparent",
                    color: "#888",
                    border: "1px solid #1E1E1E",
                    borderRadius: "8px",
                    padding: "0.6rem 1.2rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = "#FFD700";
                    e.target.style.color = "#FFD700";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = "#1E1E1E";
                    e.target.style.color = "#888";
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Team Members Grid */}
        <section>
          <h2 style={{ color: "#FFD700", fontSize: "1.3rem", marginBottom: "1.5rem", fontWeight: 700 }}>
            Team Members ({team.length})
          </h2>

          {loading ? (
            <div style={{ color: "#888", textAlign: "center", padding: "2rem" }}>Loading team members...</div>
          ) : team.length === 0 ? (
            <div style={{
              background: "#111111",
              border: "1px solid #1E1E1E",
              borderRadius: "12px",
              padding: "2rem",
              textAlign: "center",
              color: "#888"
            }}>
              No team members yet. {isAdminOrOwner && 'Click "Add Team Member" to get started.'}
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1.5rem"
            }}>
              {team.map((member) => {
                const roleBadge = getRoleBadgeColor(member.role);
                const isCurrentUser = currentUser && currentUser.id === member.id;

                return (
                  <div
                    key={member.id}
                    style={{
                      background: "#111111",
                      border: isCurrentUser ? "2px solid #FFD700" : "1px solid #1E1E1E",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentUser) e.currentTarget.style.borderColor = "#FFD700";
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentUser) e.currentTarget.style.borderColor = "#1E1E1E";
                    }}
                  >
                    {/* Avatar Placeholder */}
                    <div style={{
                      width: "60px",
                      height: "60px",
                      background: "linear-gradient(135deg, #FFD700, #FFA500)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "1rem",
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      color: "#000"
                    }}>
                      {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                    </div>

                    {/* Member Info */}
                    <h3 style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "0.3rem", fontSize: "1.1rem" }}>
                      {member.name}
                      {isCurrentUser && <span style={{ color: "#FFD700", marginLeft: "0.5rem", fontSize: "0.85rem" }}>(You)</span>}
                    </h3>

                    <p style={{ color: "#888", fontSize: "0.9rem", marginBottom: "1rem", wordBreak: "break-all" }}>
                      {member.email}
                    </p>

                    {/* Role Badge */}
                    <div style={{
                      display: "inline-block",
                      background: roleBadge.bg,
                      color: roleBadge.text,
                      padding: "0.4rem 0.8rem",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      marginBottom: "1rem"
                    }}>
                      {member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : 'Viewer'}
                    </div>

                    {/* Joined Date */}
                    <p style={{ color: "#666", fontSize: "0.85rem", marginBottom: "1rem" }}>
                      Joined {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Recently'}
                    </p>

                    {/* Remove Button - only for admins/owners, not for current user */}
                    {isAdminOrOwner && !isCurrentUser && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingId === member.id}
                        style={{
                          width: "100%",
                          background: "#EF4444",
                          color: "#FFF",
                          border: "none",
                          borderRadius: "8px",
                          padding: "0.6rem",
                          fontWeight: 600,
                          cursor: removingId === member.id ? "not-allowed" : "pointer",
                          opacity: removingId === member.id ? 0.7 : 1,
                          transition: "all 0.3s ease"
                        }}
                        onMouseEnter={(e) => {
                          if (removingId !== member.id) e.target.style.background = "#DC2626";
                        }}
                        onMouseLeave={(e) => {
                          if (removingId !== member.id) e.target.style.background = "#EF4444";
                        }}
                      >
                        {removingId === member.id ? 'Removing...' : 'Remove'}
                      </button>
                    )}

                    {isCurrentUser && (
                      <div style={{
                        width: "100%",
                        background: "#1E1E1E",
                        color: "#888",
                        border: "1px solid #1E1E1E",
                        borderRadius: "8px",
                        padding: "0.6rem",
                        textAlign: "center",
                        fontWeight: 600,
                        fontSize: "0.9rem"
                      }}>
                        Your Account
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Team Statistics Footer */}
        {!loading && team.length > 0 && (
          <section style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid #1E1E1E" }}>
            <h3 style={{ color: "#FFD700", fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>Team Statistics</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
              <div style={{
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "12px",
                padding: "1rem",
                textAlign: "center"
              }}>
                <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Total Members</p>
                <p style={{ color: "#FFFFFF", fontSize: "1.8rem", fontWeight: 800 }}>{team.length}</p>
              </div>
              <div style={{
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "12px",
                padding: "1rem",
                textAlign: "center"
              }}>
                <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Admins</p>
                <p style={{ color: "#A855F7", fontSize: "1.8rem", fontWeight: 800 }}>
                  {team.filter(m => m.role === 'admin').length}
                </p>
              </div>
              <div style={{
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "12px",
                padding: "1rem",
                textAlign: "center"
              }}>
                <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Managers</p>
                <p style={{ color: "#3B82F6", fontSize: "1.8rem", fontWeight: 800 }}>
                  {team.filter(m => m.role === 'manager').length}
                </p>
              </div>
              <div style={{
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "12px",
                padding: "1rem",
                textAlign: "center"
              }}>
                <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Viewers</p>
                <p style={{ color: "#6B7280", fontSize: "1.8rem", fontWeight: 800 }}>
                  {team.filter(m => m.role === 'viewer').length}
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
