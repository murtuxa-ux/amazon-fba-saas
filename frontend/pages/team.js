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
  const [formData, setFormData] = useState({ username: '', password: '', name: '', email: '', role: 'manager' });
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
      if (res.ok) setCurrentUser(await res.json());
    } catch (err) {
      console.error('Failed to get current user:', err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.name || !formData.email) {
      setError('All fields are required');
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to add team member');
      }
      setFormData({ username: '', password: '', name: '', email: '', role: 'manager' });
      setShowAddForm(false);
      setSuccessMessage('Team member added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchTeam();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Are you sure you want to permanently remove this team member?')) return;
    setRemovingId(userId);
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        ...authHeader()
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to remove');
      }
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
      case 'owner': return { bg: '#FFD700', text: '#000' };
      case 'admin': return { bg: '#A855F7', text: '#FFF' };
      case 'manager': return { bg: '#3B82F6', text: '#FFF' };
      case 'viewer': default: return { bg: '#6B7280', text: '#FFF' };
    }
  };

  const isAdminOrOwner = currentUser && (currentUser.role === 'admin' || currentUser.role === 'owner');

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0A0A" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ color: "#FFFFFF", fontSize: "2rem", fontWeight: 800, margin: 0 }}>Team Management</h1>
          <p style={{ color: "#888", marginTop: "4px" }}>Manage your team members and collaborators</p>
        </div>

        {error && (
          <div style={{ background: "#EF444420", border: "1px solid #EF4444", color: "#EF4444", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
            {error}
            <button onClick={() => setError('')} style={{ float: "right", background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontWeight: 700 }}>X</button>
          </div>
        )}

        {successMessage && (
          <div style={{ background: "#22C55E20", border: "1px solid #22C55E", color: "#22C55E", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
            {successMessage}
          </div>
        )}

        {/* Add Team Member Button + Form */}
        {isAdminOrOwner && (
          <div style={{ marginBottom: "24px" }}>
            {!showAddForm ? (
              <button onClick={() => setShowAddForm(true)}
                style={{ background: "#FFD700", color: "#000", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
                + Add Team Member
              </button>
            ) : (
              <div style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: "12px", padding: "24px" }}>
                <h3 style={{ color: "#FFD700", fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>Add New Team Member</h3>
                <form onSubmit={handleAddMember}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                    <div>
                      <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "4px" }}>Full Name</label>
                      <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                        style={S.input} placeholder="e.g. Bilal Qureshi" required />
                    </div>
                    <div>
                      <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "4px" }}>Email</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                        style={S.input} placeholder="e.g. bilal@ecomera.us" required />
                    </div>
                    <div>
                      <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "4px" }}>Username</label>
                      <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                        style={S.input} placeholder="e.g. bilal" required />
                    </div>
                    <div>
                      <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "4px" }}>Password</label>
                      <input type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                        style={S.input} placeholder="e.g. Manager@123" required />
                    </div>
                  </div>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "4px" }}>Role</label>
                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} style={S.input}>
                      <option value="viewer">Viewer</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button type="submit" disabled={submitting}
                      style={{ background: "#FFD700", color: "#000", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
                      {submitting ? 'Adding...' : 'Add Member'}
                    </button>
                    <button type="button" onClick={() => setShowAddForm(false)}
                      style={{ background: "transparent", color: "#888", border: "1px solid #333", borderRadius: "8px", padding: "10px 20px", fontWeight: 600, cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Team Members Grid */}
        {loading ? (
          <div style={{ color: "#888", textAlign: "center", padding: "40px" }}>Loading team...</div>
        ) : team.length === 0 ? (
          <div style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: "12px", padding: "40px", textAlign: "center", color: "#666" }}>
            No team members found.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {team.map((member) => {
              const roleBadge = getRoleBadgeColor(member.role);
              const isCurrentUser = currentUser && currentUser.id === member.id;
              const isActive = member.is_active !== false; // default true if not returned

              return (
                <div key={member.id}
                  style={{
                    background: "#111", border: isCurrentUser ? "2px solid #FFD700" : "1px solid #1E1E1E",
                    borderRadius: "12px", padding: "20px", transition: "border-color 0.2s",
                    opacity: isActive ? 1 : 0.5,
                  }}>

                  {/* Avatar */}
                  <div style={{
                    width: "52px", height: "52px", background: "linear-gradient(135deg, #FFD700, #F59E0B)",
                    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: "12px", fontSize: "20px", fontWeight: 800, color: "#000"
                  }}>
                    {member.avatar || (member.name ? member.name[0].toUpperCase() : 'U')}
                  </div>

                  {/* Name + Email */}
                  <h3 style={{ color: "#FFF", fontWeight: 700, marginBottom: "2px", fontSize: "16px", margin: "0 0 2px" }}>
                    {member.name}
                    {isCurrentUser && <span style={{ color: "#FFD700", marginLeft: "8px", fontSize: "12px" }}>(You)</span>}
                  </h3>
                  <p style={{ color: "#888", fontSize: "13px", marginBottom: "12px", wordBreak: "break-all", margin: "0 0 12px" }}>
                    {member.email}
                  </p>

                  {/* Role + Status Badges */}
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                    <span style={{
                      background: roleBadge.bg, color: roleBadge.text,
                      padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700,
                    }}>
                      {member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : 'Viewer'}
                    </span>
                    <span style={{
                      background: isActive ? "#22C55E" : "#EF4444",
                      color: "#FFF",
                      padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700,
                    }}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Joined Date */}
                  <p style={{ color: "#555", fontSize: "12px", margin: "0 0 12px" }}>
                    Joined {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}
                  </p>

                  {/* Actions */}
                  {isAdminOrOwner && !isCurrentUser && member.role !== 'owner' && (
                    <button onClick={() => handleRemoveMember(member.id)} disabled={removingId === member.id}
                      style={{
                        width: "100%", background: "transparent", color: "#EF4444",
                        border: "1px solid #EF4444", borderRadius: "8px", padding: "8px",
                        fontWeight: 600, cursor: "pointer", fontSize: "13px",
                        opacity: removingId === member.id ? 0.5 : 1,
                      }}>
                      {removingId === member.id ? 'Removing...' : 'Remove Member'}
                    </button>
                  )}

                  {isCurrentUser && (
                    <div style={{
                      width: "100%", background: "#1A1A1A", color: "#FFD700",
                      border: "1px solid #333", borderRadius: "8px", padding: "8px",
                      textAlign: "center", fontWeight: 600, fontSize: "13px", boxSizing: "border-box",
                    }}>
                      Your Account
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Team Stats */}
        {!loading && team.length > 0 && (
          <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid #1E1E1E" }}>
            <h3 style={{ color: "#FFD700", fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>Team Overview</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
              {[
                { label: "Total", value: team.length, color: "#FFD700" },
                { label: "Active", value: team.filter(m => m.is_active !== false).length, color: "#22C55E" },
                { label: "Admins", value: team.filter(m => m.role === 'admin' || m.role === 'owner').length, color: "#A855F7" },
                { label: "Managers", value: team.filter(m => m.role === 'manager').length, color: "#3B82F6" },
              ].map((stat, i) => (
                <div key={i} style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                  <div style={{ color: stat.color, fontSize: "28px", fontWeight: 800 }}>{stat.value}</div>
                  <div style={{ color: "#888", fontSize: "12px" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const S = {
  input: {
    width: "100%", background: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: "8px",
    padding: "10px 12px", color: "#FFF", fontSize: "14px", boxSizing: "border-box",
  },
};
