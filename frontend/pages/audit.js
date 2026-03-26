import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';

export default function AuditLogViewer() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersDropdown, setUsersDropdown] = useState([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';
  const LOGS_PER_PAGE = 20;

  // Theme colors
  const colors = {
    bg: '#0A0A0A',
    card: '#111111',
    border: '#1E1E1E',
    accent: '#FFD700',
    text: '#FFFFFF',
    textSec: '#888888',
    success: '#00C853',
    warning: '#FFC107',
    error: '#FF5252',
    info: '#2196F3'
  };

  // Action type colors
  const actionColors = {
    create: colors.success,
    update: colors.info,
    delete: colors.error,
    login: colors.accent,
    logout: colors.textSec,
    view: colors.info,
    export: colors.warning,
    import: colors.warning
  };

  // Check authentication
  useEffect(() => {
    const userData = localStorage.getItem('ecomera_user');
    const token = localStorage.getItem('ecomera_token');

    if (!userData || !token) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  // Fetch activity logs
  const fetchActivityLogs = async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem('ecomera_token');
      const res = await fetch(`${API_URL}/activity`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data.logs || data || []);

        // Extract unique users for dropdown
        const uniqueUsers = [...new Set(data.logs?.map(log => log.user) || [])];
        setUsersDropdown(uniqueUsers);

        setError(null);
      } else if (res.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to fetch audit logs');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchActivityLogs();
    }
  }, [user]);

  // Filter and search logs
  const filteredLogs = activityLogs.filter(log => {
    // Filter by user
    if (selectedUser !== 'all' && log.user !== selectedUser) {
      return false;
    }

    // Filter by action type
    if (selectedAction !== 'all' && !log.action?.includes(selectedAction)) {
      return false;
    }

    // Filter by date range
    const logDate = new Date(log.timestamp);
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (logDate < fromDate) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (logDate > toDate) return false;
    }

    // Search by text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const searchableText = `${log.action} ${log.detail || ''} ${log.user || ''}`.toLowerCase();
      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * LOGS_PER_PAGE,
    currentPage * LOGS_PER_PAGE
  );

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUser, selectedAction, dateFrom, dateTo, searchText]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No logs to export');
      return;
    }

    const headers = ['Timestamp', 'User', 'Action', 'Detail'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.user || 'Unknown',
      log.action || 'N/A',
      log.detail || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getActionColor = (action) => {
    const actionLower = action?.toLowerCase() || '';
    for (const [key, color] of Object.entries(actionColors)) {
      if (actionLower.includes(key)) {
        return color;
      }
    }
    return colors.textSec;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.bg }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ color: colors.text, fontSize: '32px', fontWeight: '700', margin: 0 }}>
              Audit Log Viewer
            </h1>
            <p style={{ color: colors.textSec, fontSize: '14px', marginTop: '8px' }}>
              View and filter system activity logs
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: colors.error + '20',
              border: `1px solid ${colors.error}`,
              color: colors.error,
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* Filters Section */}
          <div style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              {/* Search */}
              <div>
                <label style={{ color: colors.textSec, fontSize: '12px', display: 'block', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '500' }}>
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search action or detail..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    color: colors.text,
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* User Filter */}
              <div>
                <label style={{ color: colors.textSec, fontSize: '12px', display: 'block', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '500' }}>
                  User
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    color: colors.text,
                    fontSize: '14px'
                  }}
                >
                  <option value="all">All Users</option>
                  {usersDropdown.map(user => (
                    <option key={user} value={user}>{user}</option>
                  ))}
                </select>
              </div>

              {/* Action Filter */}
              <div>
                <label style={{ color: colors.textSec, fontSize: '12px', display: 'block', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '500' }}>
                  Action Type
                </label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    color: colors.text,
                    fontSize: '14px'
                  }}
                >
                  <option value="all">All Actions</option>
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

              {/* Date From */}
              <div>
                <label style={{ color: colors.textSec, fontSize: '12px', display: 'block', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '500' }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    color: colors.text,
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Date To */}
              <div>
                <label style={{ color: colors.textSec, fontSize: '12px', display: 'block', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '500' }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    color: colors.text,
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Export Button */}
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  onClick={handleExportCSV}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: colors.accent,
                    color: colors.bg,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Export to CSV
                </button>
              </div>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSelectedUser('all');
                setSelectedAction('all');
                setDateFrom('');
                setDateTo('');
                setSearchText('');
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: 'transparent',
                color: colors.textSec,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Clear Filters
            </button>
          </div>

          {/* Results Summary */}
          <div style={{ marginBottom: '16px', color: colors.textSec, fontSize: '14px' }}>
            Showing {paginatedLogs.length > 0 ? (currentPage - 1) * LOGS_PER_PAGE + 1 : 0} to {Math.min(currentPage * LOGS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length} logs
          </div>

          {/* Logs Table */}
          {loading ? (
            <div style={{ color: colors.textSec, textAlign: 'center', padding: '40px' }}>
              Loading audit logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              color: colors.textSec
            }}>
              No audit logs found matching your filters
            </div>
          ) : (
            <>
              <div style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.textSec, fontWeight: '500', width: '200px' }}>
                        Timestamp
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.textSec, fontWeight: '500', width: '150px' }}>
                        User
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.textSec, fontWeight: '500', width: '120px' }}>
                        Action
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.textSec, fontWeight: '500' }}>
                        Detail
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '12px 16px', color: colors.textSec, fontSize: '13px', fontFamily: 'monospace' }}>
                          {formatDate(log.timestamp)}
                        </td>
                        <td style={{ padding: '12px 16px', color: colors.text, fontWeight: '500' }}>
                          {log.user || 'Unknown'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: getActionColor(log.action) + '20',
                            color: getActionColor(log.action),
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            {log.action || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: colors.textSec }}>
                          {log.detail || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '24px'
                }}>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: currentPage === 1 ? colors.border : colors.accent,
                      color: currentPage === 1 ? colors.textSec : colors.bg,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage === 1 ? 'default' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Previous
                  </button>

                  <div style={{ color: colors.textSec, fontSize: '14px' }}>
                    Page {currentPage} of {totalPages}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: currentPage === totalPages ? colors.border : colors.accent,
                      color: currentPage === totalPages ? colors.textSec : colors.bg,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage === totalPages ? 'default' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
