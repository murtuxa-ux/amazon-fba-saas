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

export default function AuditLog() {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    filterActivities();
  }, [activities, dateFilter, actionFilter]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API}/activity`, { headers: authHeader() });

      if (res.ok) {
        const data = await res.json();
        setActivities(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to load audit log');
      }
    } catch (e) {
      console.error('Failed to fetch activities:', e);
      setError('Error loading audit log');
    } finally {
      setLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = activities;

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoffDate = now;

      if (dateFilter === 'today') {
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateFilter === 'week') {
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateFilter === 'month') {
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      filtered = filtered.filter((a) => new Date(a.timestamp) >= cutoffDate);
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter((a) => a.action === actionFilter);
    }

    setFilteredActivities(filtered);
    setCurrentPage(1);
  };

  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);

  const getActionColor = (action) => {
    if (action?.includes('create') || action?.includes('add')) return T.green;
    if (action?.includes('delete') || action?.includes('remove')) return T.red;
    if (action?.includes('update') || action?.includes('edit')) return T.blue;
    return T.yellow;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: T.bg }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', maxHeight: '100vh' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: T.text, marginBottom: '8px' }}>
          Audit Log
        </h1>
        <p style={{ fontSize: '14px', color: T.textSec, marginBottom: '40px' }}>
          Activity history and system events
        </p>

        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ fontSize: '12px', color: T.textSec, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Date Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: '6px',
                padding: '10px 12px',
                color: T.text,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: T.textSec, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: '6px',
                padding: '10px 12px',
                color: T.text,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
            </select>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: T.red + '20', border: `1px solid ${T.red}`, borderRadius: '8px', padding: '16px', marginBottom: '24px', color: T.red }}>
            {error}
          </div>
        )}

        {/* Activities Table */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: T.text }}>
              Activities ({filteredActivities.length})
            </h2>
            <button
              onClick={fetchActivities}
              style={{
                backgroundColor: 'transparent',
                border: `1px solid ${T.border}`,
                color: T.textSec,
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = T.border;
                e.currentTarget.style.color = T.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = T.textSec;
              }}
            >
              ⟳ Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textSec }}>
              Loading audit log...
            </div>
          ) : paginatedActivities.length > 0 ? (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <th style={{ textAlign: 'left', padding: '12px 0', color: T.textSec, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                      Time
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 0', color: T.textSec, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                      User
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 0', color: T.textSec, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                      Action
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 0', color: T.textSec, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                      Detail
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 0', color: T.textSec, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                      Target
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedActivities.map((activity, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: '12px 0', color: T.text, fontSize: '13px' }}>
                        {new Date(activity.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 0', color: T.text, fontSize: '13px' }}>
                        {activity.user}
                      </td>
                      <td style={{ padding: '12px 0', fontSize: '13px' }}>
                        <span style={{
                          backgroundColor: getActionColor(activity.action) + '20',
                          color: getActionColor(activity.action),
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}>
                          {activity.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 0', color: T.textSec, fontSize: '13px' }}>
                        {activity.detail}
                      </td>
                      <td style={{ padding: '12px 0', color: T.textSec, fontSize: '13px' }}>
                        {activity.target}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${T.border}` }}>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={{
                      backgroundColor: currentPage === 1 ? T.border : 'transparent',
                      border: `1px solid ${T.border}`,
                      color: currentPage === 1 ? T.textMut : T.text,
                      borderRadius: '4px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      cursor: currentPage === 1 ? 'default' : 'pointer',
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ color: T.textSec, fontSize: '12px' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      backgroundColor: currentPage === totalPages ? T.border : 'transparent',
                      border: `1px solid ${T.border}`,
                      color: currentPage === totalPages ? T.textMut : T.text,
                      borderRadius: '4px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      cursor: currentPage === totalPages ? 'default' : 'pointer',
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textSec }}>
              No activities found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
