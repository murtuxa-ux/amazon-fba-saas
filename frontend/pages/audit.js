import React, { useState, useEffect } from 'react';
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
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#999999',
    margin: '0',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#999999',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '600',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#FFD700',
    margin: '0',
  },
  filterBar: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#CCCCCC',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    backgroundColor: '#1A1A1A',
    border: '1px solid #1E1E1E',
    borderRadius: '4px',
    color: '#FFFFFF',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    backgroundColor: '#1A1A1A',
    border: '1px solid #1E1E1E',
    borderRadius: '4px',
    color: '#FFFFFF',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  buttonPrimary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#FFD700',
    color: '#000000',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  auditTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '24px',
  },
  tableHeader: {
    backgroundColor: '#111111',
    borderBottom: '1px solid #1E1E1E',
  },
  tableTh: {
    padding: '16px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#FFD700',
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tableTd: {
    padding: '16px',
    fontSize: '13px',
    color: '#CCCCCC',
    borderBottom: '1px solid #1E1E1E',
  },
  tableTr: {
    transition: 'background-color 0.2s ease',
    cursor: 'pointer',
  },
  severityBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  severityInfo: {
    backgroundColor: '#004B8B',
    color: '#FFFFFF',
  },
  severityWarning: {
    backgroundColor: '#8B6914',
    color: '#FFFFFF',
  },
  severityCritical: {
    backgroundColor: '#8B0000',
    color: '#FFFFFF',
  },
  expandedRow: {
    backgroundColor: '#1A1A1A',
    padding: '20px',
    borderLeft: '3px solid #FFD700',
  },
  expandedContent: {
    fontSize: '12px',
    fontFamily: 'monospace',
    backgroundColor: '#0A0A0A',
    padding: '12px',
    borderRadius: '4px',
    color: '#999999',
    maxHeight: '300px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '24px',
    padding: '16px 0',
    borderTop: '1px solid #1E1E1E',
  },
  paginationButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
    border: '1px solid #333333',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  paginationInfo: {
    fontSize: '13px',
    color: '#999999',
  },
};

const MOCK_AUDIT_LOGS = [
  {
    id: 1,
    timestamp: '2026-03-30 14:32:15',
    user: 'Sarah Chen',
    action: 'Update',
    resource: 'Product',
    details: 'Updated product SKU-001 price from $79.99 to $89.99',
    ipAddress: '192.168.1.100',
    severity: 'Info',
  },
  {
    id: 2,
    timestamp: '2026-03-30 14:20:42',
    user: 'Mike Johnson',
    action: 'Create',
    resource: 'Order',
    details: 'Created new order ORD-2847 for customer John Doe',
    ipAddress: '192.168.1.101',
    severity: 'Info',
  },
  {
    id: 3,
    timestamp: '2026-03-30 13:55:08',
    user: 'Alex Rodriguez',
    action: 'Delete',
    resource: 'PPC Campaign',
    details: 'Deleted inactive PPC campaign "Spring Sale 2024"',
    ipAddress: '192.168.1.102',
    severity: 'Warning',
  },
  {
    id: 4,
    timestamp: '2026-03-30 13:40:20',
    user: 'Emma Wilson',
    action: 'Export',
    resource: 'Orders',
    details: 'Exported 5842 order records to CSV file',
    ipAddress: '192.168.1.103',
    severity: 'Info',
  },
  {
    id: 5,
    timestamp: '2026-03-30 13:15:33',
    user: 'John Smith',
    action: 'Settings Change',
    resource: 'Account',
    details: 'Changed FBA restock threshold from 20 to 15 units',
    ipAddress: '192.168.1.104',
    severity: 'Info',
  },
  {
    id: 6,
    timestamp: '2026-03-30 12:50:45',
    user: 'Sarah Chen',
    action: 'Login',
    resource: 'User Account',
    details: 'User login successful',
    ipAddress: '203.45.67.89',
    severity: 'Info',
  },
  {
    id: 7,
    timestamp: '2026-03-30 12:30:12',
    user: 'Mike Johnson',
    action: 'Update',
    resource: 'Client',
    details: 'Updated client profile for Acme Corp with new contact info',
    ipAddress: '192.168.1.105',
    severity: 'Info',
  },
  {
    id: 8,
    timestamp: '2026-03-30 12:10:55',
    user: 'Unknown',
    action: 'Login',
    resource: 'User Account',
    details: 'Failed login attempt with invalid credentials',
    ipAddress: '203.45.67.90',
    severity: 'Critical',
  },
  {
    id: 9,
    timestamp: '2026-03-30 11:45:30',
    user: 'Alex Rodriguez',
    action: 'Create',
    resource: 'Automation Rule',
    details: 'Created new automation rule: Send notification on high ACOS',
    ipAddress: '192.168.1.106',
    severity: 'Info',
  },
  {
    id: 10,
    timestamp: '2026-03-30 11:20:17',
    user: 'Emma Wilson',
    action: 'Update',
    resource: 'Inventory',
    details: 'Adjusted inventory for SKU-003 by -500 units',
    ipAddress: '192.168.1.107',
    severity: 'Warning',
  },
  {
    id: 11,
    timestamp: '2026-03-30 10:55:44',
    user: 'Sarah Chen',
    action: 'Delete',
    resource: 'Product',
    details: 'Deleted discontinued product SKU-099 from catalog',
    ipAddress: '192.168.1.108',
    severity: 'Warning',
  },
  {
    id: 12,
    timestamp: '2026-03-30 10:30:22',
    user: 'John Smith',
    action: 'Export',
    resource: 'Audit Log',
    details: 'Exported audit log entries from last 30 days',
    ipAddress: '192.168.1.109',
    severity: 'Info',
  },
  {
    id: 13,
    timestamp: '2026-03-30 10:15:11',
    user: 'Mike Johnson',
    action: 'Settings Change',
    resource: 'Team Settings',
    details: 'Updated team notification preferences',
    ipAddress: '192.168.1.110',
    severity: 'Info',
  },
  {
    id: 14,
    timestamp: '2026-03-30 09:50:33',
    user: 'Alex Rodriguez',
    action: 'Update',
    resource: 'PPC Campaign',
    details: 'Updated daily budget for campaign from $50 to $75',
    ipAddress: '192.168.1.111',
    severity: 'Info',
  },
  {
    id: 15,
    timestamp: '2026-03-30 09:25:55',
    user: 'Emma Wilson',
    action: 'Create',
    resource: 'Task',
    details: 'Created task: Review supplier contracts for Q2',
    ipAddress: '192.168.1.112',
    severity: 'Info',
  },
  {
    id: 16,
    timestamp: '2026-03-29 16:40:18',
    user: 'Sarah Chen',
    action: 'Login',
    resource: 'User Account',
    details: 'User login successful',
    ipAddress: '203.45.67.91',
    severity: 'Info',
  },
  {
    id: 17,
    timestamp: '2026-03-29 15:30:42',
    user: 'Mike Johnson',
    action: 'Update',
    resource: 'Order',
    details: 'Updated order ORD-2845 status from Processing to Shipped',
    ipAddress: '192.168.1.113',
    severity: 'Info',
  },
  {
    id: 18,
    timestamp: '2026-03-29 14:15:09',
    user: 'John Smith',
    action: 'Delete',
    resource: 'User',
    details: 'Removed inactive user account: jane.doe@example.com',
    ipAddress: '192.168.1.114',
    severity: 'Critical',
  },
  {
    id: 19,
    timestamp: '2026-03-29 13:20:33',
    user: 'Alex Rodriguez',
    action: 'Create',
    resource: 'Report',
    details: 'Generated monthly PPC performance report',
    ipAddress: '192.168.1.115',
    severity: 'Info',
  },
  {
    id: 20,
    timestamp: '2026-03-29 12:10:55',
    user: 'Emma Wilson',
    action: 'Export',
    resource: 'Inventory',
    details: 'Exported inventory snapshot with 1247 products',
    ipAddress: '192.168.1.116',
    severity: 'Info',
  },
  {
    id: 21,
    timestamp: '2026-03-29 11:45:20',
    user: 'Sarah Chen',
    action: 'Update',
    resource: 'Settings',
    details: 'Updated tax configuration for sales regions',
    ipAddress: '192.168.1.117',
    severity: 'Warning',
  },
  {
    id: 22,
    timestamp: '2026-03-29 10:30:44',
    user: 'Mike Johnson',
    action: 'Create',
    resource: 'Supplier',
    details: 'Added new supplier: XYZ Electronics Co.',
    ipAddress: '192.168.1.118',
    severity: 'Info',
  },
  {
    id: 23,
    timestamp: '2026-03-29 09:15:18',
    user: 'John Smith',
    action: 'Login',
    resource: 'User Account',
    details: 'User login successful',
    ipAddress: '203.45.67.92',
    severity: 'Info',
  },
  {
    id: 24,
    timestamp: '2026-03-28 16:50:33',
    user: 'Alex Rodriguez',
    action: 'Update',
    resource: 'Workflow',
    details: 'Updated workflow status: New Client Onboarding',
    ipAddress: '192.168.1.119',
    severity: 'Info',
  },
  {
    id: 25,
    timestamp: '2026-03-28 15:30:09',
    user: 'Emma Wilson',
    action: 'Delete',
    resource: 'Task',
    details: 'Deleted completed task: Review Q1 inventory',
    ipAddress: '192.168.1.120',
    severity: 'Info',
  },
  {
    id: 26,
    timestamp: '2026-03-28 14:20:42',
    user: 'Sarah Chen',
    action: 'Export',
    resource: 'Products',
    details: 'Exported product catalog with 1247 items',
    ipAddress: '192.168.1.121',
    severity: 'Info',
  },
  {
    id: 27,
    timestamp: '2026-03-28 13:10:15',
    user: 'Mike Johnson',
    action: 'Update',
    resource: 'Client',
    details: 'Updated subscription level for Tech Solutions Inc.',
    ipAddress: '192.168.1.122',
    severity: 'Info',
  },
  {
    id: 28,
    timestamp: '2026-03-28 12:00:33',
    user: 'John Smith',
    action: 'Create',
    resource: 'Report',
    details: 'Generated monthly financial summary report',
    ipAddress: '192.168.1.123',
    severity: 'Info',
  },
  {
    id: 29,
    timestamp: '2026-03-28 11:15:44',
    user: 'Alex Rodriguez',
    action: 'Login',
    resource: 'User Account',
    details: 'User login successful',
    ipAddress: '203.45.67.93',
    severity: 'Info',
  },
  {
    id: 30,
    timestamp: '2026-03-28 10:30:20',
    user: 'Emma Wilson',
    action: 'Settings Change',
    resource: 'Account',
    details: 'Updated email notification preferences',
    ipAddress: '192.168.1.124',
    severity: 'Info',
  },
];

export default function AuditPage() {
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ecomera_token') : null;
    if (!token) {
      return;
    }
  }, []);

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'Info':
        return styles.severityInfo;
      case 'Warning':
        return styles.severityWarning;
      case 'Critical':
        return styles.severityCritical;
      default:
        return {};
    }
  };

  const filteredLogs = MOCK_AUDIT_LOGS.filter((log) => {
    const matchesUser = userFilter === '' || log.user === userFilter;
    const matchesAction = actionFilter === '' || log.action === actionFilter;
    const matchesResource = resourceFilter === '' || log.resource === resourceFilter;
    const matchesSeverity = severityFilter === '' || log.severity === severityFilter;
    return matchesUser && matchesAction && matchesResource && matchesSeverity;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const uniqueUsers = Array.from(new Set(MOCK_AUDIT_LOGS.map((log) => log.user)));
  const uniqueActions = Array.from(new Set(MOCK_AUDIT_LOGS.map((log) => log.action)));
  const uniqueResources = Array.from(new Set(MOCK_AUDIT_LOGS.map((log) => log.resource)));

  const handleExportLog = () => {
    let csvContent = 'Timestamp,User,Action,Resource,Details,IP Address,Severity\n';
    filteredLogs.forEach((log) => {
      csvContent += `"${log.timestamp}","${log.user}","${log.action}","${log.resource}","${log.details}","${log.ipAddress}","${log.severity}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Audit Log</h1>
          <p style={styles.subtitle}>Track all system activities and user actions</p>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Total Events (Today)</p>
            <p style={styles.statValue}>247</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Users Active</p>
            <p style={styles.statValue}>12</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Critical Events</p>
            <p style={styles.statValue}>2</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Avg Response Time</p>
            <p style={styles.statValue}>82ms</p>
          </div>
        </div>

        <div style={styles.filterBar}>
          <div>
            <label style={styles.label}>User</label>
            <select
              style={styles.select}
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Users</option>
              {uniqueUsers.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={styles.label}>Action Type</label>
            <select
              style={styles.select}
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={styles.label}>Resource Type</label>
            <select
              style={styles.select}
              value={resourceFilter}
              onChange={(e) => {
                setResourceFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Resources</option>
              {uniqueResources.map((resource) => (
                <option key={resource} value={resource}>
                  {resource}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={styles.label}>Severity</label>
            <select
              style={styles.select}
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Levels</option>
              <option value="Info">Info</option>
              <option value="Warning">Warning</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button style={styles.buttonPrimary} onClick={handleExportLog}>
              📥 Export Log
            </button>
          </div>
        </div>

        <table style={styles.auditTable}>
          <thead style={styles.tableHeader}>
            <tr>
              <th style={styles.tableTh}>Timestamp</th>
              <th style={styles.tableTh}>User</th>
              <th style={styles.tableTh}>Action</th>
              <th style={styles.tableTh}>Resource</th>
              <th style={styles.tableTh}>Details</th>
              <th style={styles.tableTh}>IP Address</th>
              <th style={styles.tableTh}>Severity</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map((log) => (
              <React.Fragment key={log.id}>
                <tr
                  style={styles.tableTr}
                  onClick={() =>
                    setExpandedId(expandedId === log.id ? null : log.id)
                  }
                >
                  <td style={styles.tableTd}>{log.timestamp}</td>
                  <td style={styles.tableTd}>{log.user}</td>
                  <td style={styles.tableTd}>{log.action}</td>
                  <td style={styles.tableTd}>{log.resource}</td>
                  <td style={styles.tableTd}>{log.details.substring(0, 40)}...</td>
                  <td style={styles.tableTd}>{log.ipAddress}</td>
                  <td style={styles.tableTd}>
                    <span
                      style={{
                        ...styles.severityBadge,
                        ...getSeverityStyle(log.severity),
                      }}
                    >
                      {log.severity}
                    </span>
                  </td>
                </tr>
                {expandedId === log.id && (
                  <tr>
                    <td colSpan="7" style={styles.expandedRow}>
                      <strong>Full Details:</strong>
                      <div style={styles.expandedContent}>
                        {JSON.stringify(log, null, 2)}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        <div style={styles.pagination}>
          <button
            style={styles.paginationButton}
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          <span style={styles.paginationInfo}>
            Page {currentPage} of {totalPages} ({filteredLogs.length} total events)
          </span>
          <button
            style={styles.paginationButton}
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
