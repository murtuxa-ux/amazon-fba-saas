import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [actionType, setActionType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const token = typeof window !== 'undefined' ? localStorage.getItem('ecomera_token') : null;

  // Fetch users for username resolution
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${BASE_URL}/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : []);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        setUsers([]);
      }
    };

    if (token) {
      fetchUsers();
    }
  }, [token]);

  // Fetch audit logs
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${BASE_URL}/system/audit-log`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setLogs(Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : []);
        } else {
          setError('Failed to fetch audit logs');
        }
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError('Error loading audit logs');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchLogs();
    }
  }, [token]);

  // Robust date parsing function
  const parseDate = (dateValue) => {
    if (!dateValue) return null;

    // Try multiple formats
    const formats = [
      dateValue, // ISO string or standard format
      new Date(dateValue),
    ];

    for (const format of formats) {
      const parsed = new Date(format);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return null;
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const parsed = parseDate(timestamp);
    if (parsed && !isNaN(parsed.getTime())) {
      return parsed.toLocaleString();
    }
    return 'N/A';
  };

  // Get username from user_id
  const getUsernameFromId = (userId, fallbackName) => {
    if (!userId) return fallbackName || 'System';
    const user = users.find((u) => u.id === userId || u.user_id === userId);
    if (user) {
      return user.name || user.username || user.email || fallbackName || 'Unknown';
    }
    return fallbackName || 'Unknown';
  };

  // Get action badge color
  const getActionBadgeColor = (action) => {
    const actionLower = action ? action.toLowerCase() : '';
    if (actionLower.includes('create')) return '#00C853';
    if (actionLower.includes('delete')) return '#D32F2F';
    if (actionLower.includes('update')) return '#1E90FF';
    if (actionLower.includes('login')) return '#00BCD4';
    if (actionLower.includes('logout')) return '#FF6F00';
    if (actionLower.includes('view')) return '#7B68EE';
    if (actionLower.includes('export')) return '#009688';
    if (actionLower.includes('import')) return '#FF5722';
    return '#9E9E9E';
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const logDetail = (log.detail || log.description || '').toLowerCase();
    const logAction = (log.action || '').toLowerCase();
    const logUserId = log.user_id || log.userid;
    const logTimestamp = parseDate(log.created_at || log.timestamp || log.date);

    // Search text filter
    if (searchText && !logDetail.includes(searchText.toLowerCase())) {
      return false;
    }

    // User filter
    if (selectedUser && logUserId !== selectedUser) {
      return false;
    }

    // Action type filter
    if (actionType && !logAction.includes(actionType.toLowerCase())) {
      return false;
    }

    // Date range filter
    if (fromDate) {
      const from = new Date(fromDate);
      if (logTimestamp && logTimestamp < from) {
        return false;
      }
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      if (logTimestamp && logTimestamp > to) {
        return false;
      }
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedUser('');
    setActionType('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No logs to export');
      return;
    }

    const headers = ['Timestamp', 'User', 'Action', 'Detail'];
    const rows = filteredLogs.map((log) => [
      formatTimestamp(log.created_at || log.timestamp || log.date),
      getUsernameFromId(log.user_id, log.user_name || log.username),
      log.action || 'N/A',
      log.detail || log.description || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const styles = {
    container: {
      display: 'flex',
      backgroundColor: '#0A0A0A',
      minHeight: '100vh',
      color: '#FFFFFF',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    mainContent: {
      marginLeft: '250px',
      flex: 1,
      padding: '40px',
    },
    header: {
      marginBottom: '40px',
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      marginBottom: '8px',
      color: '#FFD700',
    },
    subtitle: {
      fontSize: '14px',
      color: '#999999',
      marginBottom: '0',
    },
    filterRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto auto',
      gap: '16px',
      marginBottom: '32px',
      alignItems: 'flex-end',
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
    },
    filterLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#FFD700',
      marginBottom: '6px',
      textTransform: 'uppercase',
    },
    input: {
      padding: '10px 12px',
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '6px',
      color: '#FFFFFF',
      fontSize: '14px',
      fontFamily: 'inherit',
    },
    select: {
      padding: '10px 12px',
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '6px',
      color: '#FFFFFF',
      fontSize: '14px',
      fontFamily: 'inherit',
      cursor: 'pointer',
    },
    button: {
      padding: '10px 16px',
      backgroundColor: '#FFD700',
      border: 'none',
      borderRadius: '6px',
      color: '#000000',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    secondaryButton: {
      padding: '10px 16px',
      backgroundColor: '#1E1E1E',
      border: '1px solid #2E2E2E',
      borderRadius: '6px',
      color: '#FFFFFF',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '32px',
    },
    tableHeader: {
      backgroundColor: '#111111',
      borderBottom: '2px solid #1E1E1E',
    },
    th: {
      padding: '16px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: '#FFD700',
      textTransform: 'uppercase',
      borderBottom: '1px solid #1E1E1E',
    },
    td: {
      padding: '14px 16px',
      fontSize: '14px',
      borderBottom: '1px solid #1E1E1E',
    },
    tableRow: {
      backgroundColor: '#0A0A0A',
    },
    tableRowHover: {
      backgroundColor: '#111111',
    },
    badge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    pagination: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '24px',
      fontSize: '13px',
      color: '#999999',
    },
    paginationControls: {
      display: 'flex',
      gap: '8px',
    },
    paginationButton: {
      padding: '6px 10px',
      backgroundColor: '#1E1E1E',
      border: '1px solid #2E2E2E',
      borderRadius: '4px',
      color: '#FFFFFF',
      cursor: 'pointer',
      fontSize: '12px',
    },
    paginationButtonDisabled: {
      opacity: '0.5',
      cursor: 'not-allowed',
    },
    errorMessage: {
      padding: '16px',
      backgroundColor: '#D32F2F',
      borderRadius: '6px',
      marginBottom: '24px',
      color: '#FFFFFF',
      fontSize: '14px',
    },
    loadingMessage: {
      padding: '24px',
      backgroundColor: '#111111',
      borderRadius: '6px',
      textAlign: 'center',
      color: '#999999',
    },
    emptyMessage: {
      padding: '24px',
      backgroundColor: '#111111',
      borderRadius: '6px',
      textAlign: 'center',
      color: '#999999',
    },
  };

  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <h1 style={styles.title}>Audit Log Viewer</h1>
          <p style={styles.subtitle}>Track all system activities and user actions</p>
        </div>

        {error && <div style={styles.errorMessage}>{error}</div>}

        <div style={styles.filterRow}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Search</label>
            <input
              type="text"
              placeholder="Search by detail..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>User</label>
            <select
              value={selectedUser}
              onChange={(e) => {
                setSelectedUser(e.target.value);
                setCurrentPage(1);
              }}
              style={styles.select}
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id || user.user_id} value={user.id || user.user_id}>
                  {user.name || user.username || user.email || 'Unknown'}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Action Type</label>
            <select
              value={actionType}
              onChange={(e) => {
                setActionType(e.target.value);
                setCurrentPage(1);
              }}
              style={styles.select}
            >
              <option value="">All</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="view">View</option>
              <option value="export">Export</option>
              <option value="import">Import</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              style={styles.input}
            />
          </div>

          <div style={styles.buttonGroup}>
            <button
              onClick={handleExportCSV}
              style={styles.button}
              onMouseOver={(e) => (e.target.style.opacity = '0.9')}
              onMouseOut={(e) => (e.target.style.opacity = '1')}
            >
              Export CSV
            </button>
            <button
              onClick={handleClearFilters}
              style={styles.secondaryButton}
              onMouseOver={(e) => (e.target.style.backgroundColor = '#2E2E2E')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#1E1E1E')}
            >
              Clear
            </button>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingMessage}>Loading audit logs...</div>
        ) : paginatedLogs.length === 0 ? (
          <div style={styles.emptyMessage}>
            {filteredLogs.length === 0 ? 'No audit logs found' : 'No more logs'}
          </div>
        ) : (
          <>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.th}>Timestamp</th>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log, index) => (
                  <tr
                    key={index}
                    style={styles.tableRow}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#111111')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0A0A0A')}
                  >
                    <td style={styles.td}>{formatTimestamp(log.created_at || log.timestamp || log.date)}</td>
                    <td style={styles.td}>
                      {getUsernameFromId(log.user_id, log.user_name || log.username)}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor: getActionBadgeColor(log.action),
                          color: '#FFFFFF',
                        }}
                      >
                        {log.action || 'N/A'}
                      </span>
                    </td>
                    <td style={styles.td}>{log.detail || log.description || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.pagination}>
              <span>
                Showing {startIndex + 1} to {Math.min(endIndex, filteredLogs.length)} of{' '}
                {filteredLogs.length} logs
              </span>
              <div style={styles.paginationControls}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{
                    ...styles.paginationButton,
                    ...(currentPage === 1 ? styles.paginationButtonDisabled : {}),
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '12px' }}>
                  Page {currentPage} of {totalPages || 1}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  style={{
                    ...styles.paginationButton,
                    ...(currentPage === totalPages || totalPages === 0
                      ? styles.paginationButtonDisabled
                      : {}),
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
