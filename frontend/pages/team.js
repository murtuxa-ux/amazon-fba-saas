import { useState, useEffect } from 'react';
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
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#999999',
  },
  tabsContainer: {
    display: 'flex',
    gap: '24px',
    borderBottom: '1px solid #1E1E1E',
    marginBottom: '32px',
  },
  tab: {
    padding: '12px 0',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666666',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#FFD700',
    borderBottomColor: '#FFD700',
  },
  // Team Members Tab
  membersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  memberCard: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  memberHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#FFD700',
    color: '#0A0A0A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '16px',
    flexShrink: 0,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '4px',
  },
  memberEmail: {
    fontSize: '12px',
    color: '#999999',
    marginBottom: '4px',
  },
  memberMeta: {
    fontSize: '12px',
    color: '#666666',
  },
  statusBadge: {
    display: 'inline-block',
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '4px',
    marginTop: '8px',
  },
  statusActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    color: '#4CAF50',
  },
  statusInactive: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    color: '#F44336',
  },
  memberActions: {
    display: 'flex',
    gap: '8px',
  },
  buttonSmall: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '12px',
    border: '1px solid #1E1E1E',
    borderRadius: '4px',
    backgroundColor: '#111111',
    color: '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonSmallHover: {
    backgroundColor: '#1E1E1E',
    borderColor: '#FFD700',
  },
  buttonPrimary: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#FFD700',
    color: '#0A0A0A',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonPrimaryHover: {
    backgroundColor: '#FFC107',
    transform: 'translateY(-1px)',
  },
  buttonDanger: {
    padding: '8px 12px',
    fontSize: '12px',
    border: '1px solid #F44336',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: '#F44336',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  // Filters
  filterBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  searchInput: {
    flex: 1,
    padding: '10px 14px',
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
  },
  selectInput: {
    padding: '10px 14px',
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
    cursor: 'pointer',
  },
  // Modal
  modalOverlay: {
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
  modal: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '32px',
    maxWidth: '500px',
    width: '90%',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '6px',
    color: '#CCCCCC',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '4px',
    color: '#FFFFFF',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  // Roles & Permissions Tab
  rolesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  roleCard: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '24px',
  },
  roleCardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '20px',
  },
  permissionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #1E1E1E',
    fontSize: '13px',
  },
  permissionRow_last: {
    borderBottom: 'none',
  },
  toggle: {
    width: '40px',
    height: '24px',
    borderRadius: '12px',
    backgroundColor: '#1E1E1E',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.2s',
    border: 'none',
    padding: 0,
  },
  toggleEnabled: {
    backgroundColor: '#FFD700',
  },
  toggleDot: {
    position: 'absolute',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
    top: '2px',
    left: '2px',
    transition: 'left 0.2s',
  },
  toggleDotEnabled: {
    left: '18px',
  },
  // Activity Log Tab
  timeline: {
    marginTop: '20px',
  },
  timelineEntry: {
    display: 'flex',
    gap: '16px',
    padding: '16px',
    marginBottom: '12px',
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    alignItems: 'flex-start',
  },
  timelineAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#FFD700',
    color: '#0A0A0A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '14px',
    flexShrink: 0,
  },
  timelineContent: {
    flex: 1,
  },
  timelineAction: {
    fontSize: '14px',
    marginBottom: '4px',
  },
  timelineTimestamp: {
    fontSize: '12px',
    color: '#999999',
  },
  actionBadge: {
    display: 'inline-block',
    fontSize: '10px',
    padding: '4px 8px',
    borderRadius: '3px',
    marginRight: '8px',
    marginTop: '8px',
  },
  actionCreate: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    color: '#4CAF50',
  },
  actionUpdate: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    color: '#2196F3',
  },
  actionDelete: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    color: '#F44336',
  },
  actionLogin: {
    backgroundColor: 'rgba(158, 158, 158, 0.2)',
    color: '#9E9E9E',
  },
  // Performance Tab
  performanceGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '24px',
    marginTop: '20px',
  },
  topPerformerCard: {
    backgroundColor: '#111111',
    border: '2px solid #FFD700',
    borderRadius: '8px',
    padding: '24px',
    textAlign: 'center',
  },
  topPerformerLabel: {
    fontSize: '12px',
    color: '#FFD700',
    fontWeight: '600',
    marginBottom: '12px',
    textTransform: 'uppercase',
  },
  topPerformerName: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  topPerformerScore: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: '16px',
  },
  topPerformerStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  statItem: {
    fontSize: '12px',
    padding: '8px',
    backgroundColor: '#0A0A0A',
    borderRadius: '4px',
  },
  chartContainer: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '24px',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '20px',
  },
  dateRangeSelector: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  dateRangeBtn: {
    padding: '8px 14px',
    fontSize: '12px',
    border: '1px solid #1E1E1E',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: '#666666',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dateRangeBtnActive: {
    backgroundColor: '#FFD700',
    color: '#0A0A0A',
    fontWeight: '600',
    borderColor: '#FFD700',
  },
};

// Mock arrays zeroed during the 2026-05-12 mock-data purge.
// Real data flows from /users (members), /api/audit-logs (audit log
// per team member), and /dwm/leaderboard (performance) once those
// fetches are wired below. Until then, page renders empty.
const mockMembers = [];
const mockAuditLogs = [];
const mockPerformance = [];

// Role permission templates
const rolePermissions = {
  Owner: {
    Dashboard: { View: true, Edit: true },
    Products: { View: true, Add: true, Edit: true, Delete: true },
    Finance: { View: true, Create: true, Export: true },
    PPC: { View: true, Manage: true },
    Settings: { View: true, Modify: true },
    Users: { View: true, Invite: true, Manage: true },
    Clients: { View: true, Add: true, Manage: true },
  },
  Admin: {
    Dashboard: { View: true, Edit: true },
    Products: { View: true, Add: true, Edit: true, Delete: false },
    Finance: { View: true, Create: true, Export: true },
    PPC: { View: true, Manage: true },
    Settings: { View: true, Modify: false },
    Users: { View: true, Invite: true, Manage: false },
    Clients: { View: true, Add: true, Manage: true },
  },
  Manager: {
    Dashboard: { View: true, Edit: false },
    Products: { View: true, Add: true, Edit: true, Delete: false },
    Finance: { View: true, Create: false, Export: false },
    PPC: { View: true, Manage: false },
    Settings: { View: false, Modify: false },
    Users: { View: true, Invite: false, Manage: false },
    Clients: { View: true, Add: false, Manage: false },
  },
  Analyst: {
    Dashboard: { View: true, Edit: false },
    Products: { View: true, Add: false, Edit: false, Delete: false },
    Finance: { View: true, Create: false, Export: false },
    PPC: { View: true, Manage: false },
    Settings: { View: false, Modify: false },
    Users: { View: false, Invite: false, Manage: false },
    Clients: { View: true, Add: false, Manage: false },
  },
  Viewer: {
    Dashboard: { View: true, Edit: false },
    Products: { View: true, Add: false, Edit: false, Delete: false },
    Finance: { View: true, Create: false, Export: false },
    PPC: { View: true, Manage: false },
    Settings: { View: false, Modify: false },
    Users: { View: false, Invite: false, Manage: false },
    Clients: { View: true, Add: false, Manage: false },
  },
};

// Horizontal Bar Chart Component
function PerformanceChart({ data, metric, label }) {
  const maxValue = Math.max(...data.map((d) => d[metric]));
  const chartHeight = data.length * 50 + 40;

  return (
    <svg width="100%" height={chartHeight} viewBox={`0 0 600 ${chartHeight}`} style={{ marginBottom: '24px' }}>
      {/* Title */}
      <text x="10" y="25" fontSize="14" fontWeight="600" fill="#FFFFFF">
        {label}
      </text>

      {/* Bars */}
      {data.map((item, idx) => {
        const barWidth = (item[metric] / maxValue) * 450;
        const yPos = 50 + idx * 50;
        return (
          <g key={idx}>
            {/* Background bar */}
            <rect x="150" y={yPos} width="450" height="30" fill="#1E1E1E" rx="4" />
            {/* Data bar */}
            <rect x="150" y={yPos} width={barWidth} height="30" fill="#FFD700" rx="4" />
            {/* Name label */}
            <text x="10" y={yPos + 20} fontSize="12" fill="#CCCCCC" textAnchor="start">
              {item.name.split(' ')[0]}
            </text>
            {/* Value label */}
            <text x={160 + barWidth} y={yPos + 20} fontSize="12" fill="#0A0A0A" fontWeight="600">
              {item[metric].toLocaleString()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState(mockMembers);
  const [filteredMembers, setFilteredMembers] = useState(mockMembers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Manager', department: 'Wholesale' });
  const [auditLogs, setAuditLogs] = useState(mockAuditLogs);
  const [logFilter, setLogFilter] = useState('All');
  const [performance, setPerformance] = useState(mockPerformance);
  const [dateRange, setDateRange] = useState('month');
  const [localPermissions, setLocalPermissions] = useState(rolePermissions);

  // Fetch team members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const token = localStorage.getItem('ecomera_token');
        const response = await fetch(`${BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setMembers(data);
          setFilteredMembers(data);
        }
      } catch (error) {
        console.error('Failed to fetch members:', error);
        // Use mock data on failure
      }
    };

    if (activeTab === 'members') {
      fetchMembers();
    }
  }, [activeTab]);

  // Fetch audit logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('ecomera_token');
        const response = await fetch(`${BASE_URL}/api/audit-logs?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setAuditLogs(data);
        }
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        // Use mock data on failure
      }
    };

    if (activeTab === 'activity') {
      fetchLogs();
    }
  }, [activeTab]);

  // Filter members
  useEffect(() => {
    let filtered = members;

    if (searchTerm) {
      filtered = filtered.filter(
        (m) => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'All') {
      filtered = filtered.filter((m) => m.role === roleFilter);
    }

    setFilteredMembers(filtered);
  }, [searchTerm, roleFilter, members]);

  // Filter activity logs
  const filteredLogs = logFilter === 'All' ? auditLogs : auditLogs.filter((log) => log.type === logFilter);

  // Get action badge style
  const getActionBadgeStyle = (type) => {
    switch (type) {
      case 'Create':
        return styles.actionCreate;
      case 'Update':
        return styles.actionUpdate;
      case 'Delete':
        return styles.actionDelete;
      case 'Login':
        return styles.actionLogin;
      default:
        return styles.actionLogin;
    }
  };

  // Handle invite
  const handleInvite = () => {
    if (inviteForm.name && inviteForm.email) {
      const newMember = {
        id: members.length + 1,
        ...inviteForm,
        avatar: inviteForm.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase(),
        status: 'Active',
        lastActive: new Date().toLocaleString(),
      };
      setMembers([...members, newMember]);
      setInviteForm({ name: '', email: '', role: 'Manager', department: 'Wholesale' });
      setShowInviteModal(false);
    }
  };

  // Toggle permission
  const togglePermission = (role, area, permission) => {
    const newPerms = { ...localPermissions };
    newPerms[role][area][permission] = !newPerms[role][area][permission];
    setLocalPermissions(newPerms);
    localStorage.setItem('teamPermissions', JSON.stringify(newPerms));
  };

  // Find top performer
  const topPerformer = performance.reduce((prev, current) => (current.tasksCompleted > prev.tasksCompleted ? current : prev));

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.title}>Team Management</div>
          <div style={styles.subtitle}>Manage team members, roles, permissions, and performance</div>
        </div>

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'members' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('members')}
          >
            Team Members
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'roles' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('roles')}
          >
            Roles & Permissions
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'activity' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('activity')}
          >
            Activity Log
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'performance' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
        </div>

        {/* Tab: Team Members */}
        {activeTab === 'members' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={styles.filterBar}>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.searchInput}
                />
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={styles.selectInput}>
                  <option>All Roles</option>
                  <option>Owner</option>
                  <option>Admin</option>
                  <option>Manager</option>
                  <option>Analyst</option>
                  <option>Viewer</option>
                </select>
              </div>
              <button
                style={{ ...styles.buttonPrimary }}
                onMouseEnter={(e) => Object.assign(e.target.style, styles.buttonPrimaryHover)}
                onMouseLeave={(e) => Object.assign(e.target.style, styles.buttonPrimary)}
                onClick={() => setShowInviteModal(true)}
              >
                + Invite Member
              </button>
            </div>

            <div style={styles.membersGrid}>
              {filteredMembers.map((member) => (
                <div key={member.id} style={styles.memberCard}>
                  <div style={styles.memberHeader}>
                    <div style={styles.avatar}>{member.avatar}</div>
                    <div style={styles.memberInfo}>
                      <div style={styles.memberName}>{member.name}</div>
                      <div style={styles.memberEmail}>{member.email}</div>
                      <div style={styles.memberMeta}>{member.role}</div>
                    </div>
                  </div>
                  <div style={styles.memberMeta}>Department: {member.department}</div>
                  <div style={{ ...styles.statusBadge, ...(member.status === 'Active' ? styles.statusActive : styles.statusInactive) }}>
                    {member.status}
                  </div>
                  <div style={styles.memberMeta}>Last active: {member.lastActive}</div>
                  <div style={styles.memberActions}>
                    <button style={styles.buttonSmall} onMouseEnter={(e) => Object.assign(e.target.style, styles.buttonSmallHover)} onMouseLeave={(e) => Object.assign(e.target.style, styles.buttonSmall)}>
                      Edit
                    </button>
                    <button style={styles.buttonDanger}>Deactivate</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
              <div style={styles.modalOverlay} onClick={() => setShowInviteModal(false)}>
                <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                  <div style={styles.modalTitle}>Invite Team Member</div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Full Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email Address</label>
                    <input
                      type="email"
                      placeholder="john@company.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Role</label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                      style={styles.input}
                    >
                      <option>Owner</option>
                      <option>Admin</option>
                      <option>Manager</option>
                      <option>Analyst</option>
                      <option>Viewer</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Department</label>
                    <select
                      value={inviteForm.department}
                      onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                      style={styles.input}
                    >
                      <option>Wholesale</option>
                      <option>Private Label</option>
                      <option>PPC</option>
                      <option>Finance</option>
                      <option>Operations</option>
                    </select>
                  </div>
                  <div style={styles.modalActions}>
                    <button style={{ ...styles.buttonSmall, flex: 1 }} onClick={() => setShowInviteModal(false)}>
                      Cancel
                    </button>
                    <button
                      style={{ ...styles.buttonPrimary, flex: 1 }}
                      onMouseEnter={(e) => Object.assign(e.target.style, styles.buttonPrimaryHover)}
                      onMouseLeave={(e) => Object.assign(e.target.style, styles.buttonPrimary)}
                      onClick={handleInvite}
                    >
                      Send Invite
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Roles & Permissions */}
        {activeTab === 'roles' && (
          <div>
            <button
              style={{ ...styles.buttonPrimary, marginBottom: '24px' }}
              onMouseEnter={(e) => Object.assign(e.target.style, styles.buttonPrimaryHover)}
              onMouseLeave={(e) => Object.assign(e.target.style, styles.buttonPrimary)}
            >
              + Create Custom Role
            </button>

            <div style={styles.rolesGrid}>
              {Object.entries(localPermissions).map(([roleName, permissions]) => (
                <div key={roleName} style={styles.roleCard}>
                  <div style={styles.roleCardTitle}>{roleName}</div>
                  {Object.entries(permissions).map(([area, perms], areaIdx) => (
                    <div key={area}>
                      {Object.entries(perms).map(([permission, enabled], permIdx) => (
                        <div
                          key={permission}
                          style={{
                            ...styles.permissionRow,
                            ...(areaIdx === Object.keys(permissions).length - 1 && permIdx === Object.keys(perms).length - 1
                              ? styles.permissionRow_last
                              : {}),
                          }}
                        >
                          <span>
                            {area} - {permission}
                          </span>
                          <button
                            style={{ ...styles.toggle, ...(enabled ? styles.toggleEnabled : {}) }}
                            onClick={() => togglePermission(roleName, area, permission)}
                          >
                            <div style={{ ...styles.toggleDot, ...(enabled ? styles.toggleDotEnabled : {}) }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Activity Log */}
        {activeTab === 'activity' && (
          <div>
            <div style={styles.filterBar}>
              <select value={logFilter} onChange={(e) => setLogFilter(e.target.value)} style={styles.selectInput}>
                <option>All Actions</option>
                <option>Create</option>
                <option>Update</option>
                <option>Delete</option>
                <option>Login</option>
              </select>
            </div>

            <div style={styles.timeline}>
              {filteredLogs.map((log) => (
                <div key={log.id} style={styles.timelineEntry}>
                  <div style={styles.timelineAvatar}>{log.avatar}</div>
                  <div style={styles.timelineContent}>
                    <div style={styles.timelineAction}>
                      <strong>{log.user}</strong> {log.action}
                    </div>
                    <div style={styles.timelineTimestamp}>
                      Resource: {log.resource} · {log.timestamp}
                    </div>
                    <div style={{ ...styles.actionBadge, ...getActionBadgeStyle(log.type) }}>{log.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Performance */}
        {activeTab === 'performance' && (
          <div>
            <div style={styles.dateRangeSelector}>
              <button
                style={{ ...styles.dateRangeBtn, ...(dateRange === 'week' ? styles.dateRangeBtnActive : {}) }}
                onClick={() => setDateRange('week')}
              >
                This Week
              </button>
              <button
                style={{ ...styles.dateRangeBtn, ...(dateRange === 'month' ? styles.dateRangeBtnActive : {}) }}
                onClick={() => setDateRange('month')}
              >
                This Month
              </button>
              <button
                style={{ ...styles.dateRangeBtn, ...(dateRange === 'quarter' ? styles.dateRangeBtnActive : {}) }}
                onClick={() => setDateRange('quarter')}
              >
                This Quarter
              </button>
            </div>

            <div style={styles.performanceGrid}>
              {/* Top Performer Card */}
              <div style={styles.topPerformerCard}>
                <div style={styles.topPerformerLabel}>Top Performer</div>
                <div style={styles.topPerformerName}>{topPerformer.name}</div>
                <div style={styles.topPerformerScore}>{topPerformer.tasksCompleted}</div>
                <div style={{ fontSize: '12px', color: '#999999', marginBottom: '16px' }}>Tasks Completed</div>
                <div style={styles.topPerformerStats}>
                  <div style={styles.statItem}>Products Scouted: {topPerformer.scoutedProducts}</div>
                  <div style={styles.statItem}>Orders Processed: {topPerformer.ordersProcessed}</div>
                  <div style={styles.statItem}>Revenue Managed: ${(topPerformer.revenueManaged / 1000).toFixed(0)}K</div>
                </div>
              </div>

              {/* Charts */}
              <div>
                <div style={styles.chartContainer}>
                  <div style={styles.chartTitle}>Tasks Completed</div>
                  <PerformanceChart data={performance} metric="tasksCompleted" label="" />
                </div>

                <div style={{ ...styles.chartContainer, marginTop: '20px' }}>
                  <div style={styles.chartTitle}>Revenue Managed</div>
                  <PerformanceChart data={performance} metric="revenueManaged" label="" />
                </div>

                <div style={{ ...styles.chartContainer, marginTop: '20px' }}>
                  <div style={styles.chartTitle}>Orders Processed</div>
                  <PerformanceChart data={performance} metric="ordersProcessed" label="" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
