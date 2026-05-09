import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://amazon-fba-saas-production.up.railway.app';

export default function ActivityLogPage() {
  const { token, user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ resource_type: '', days: 30, action: '' });

  const isAdminOrOwner = user?.role === 'owner' || user?.role === 'admin';

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ days: String(filter.days) });
      if (filter.resource_type) params.set('resource_type', filter.resource_type);
      if (filter.action) params.set('action', filter.action);
      const r = await fetch(`${API_URL}/api/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 403) {
        setError('Audit log access requires Owner or Admin role.');
        setEntries([]);
        setTotal(0);
        return;
      }
      if (!r.ok) {
        setError(`Failed to load audit logs (${r.status}).`);
        return;
      }
      const data = await r.json();
      setEntries(Array.isArray(data?.entries) ? data.entries : []);
      setTotal(data?.total || 0);
    } catch (e) {
      setError('Network error loading audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAdminOrOwner) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filter.resource_type, filter.days, filter.action]);

  if (!isAdminOrOwner) {
    return (
      <div style={S.page}>
        <h1 style={S.h1}>Activity Log</h1>
        <p style={S.errorBox}>Audit log access requires Owner or Admin role.</p>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Activity Log</h1>
      <p style={S.subtitle}>
        State-changing actions across your organization. Retention varies by plan.
      </p>

      <div style={S.filterRow}>
        <select
          value={filter.resource_type}
          onChange={(e) => setFilter({ ...filter, resource_type: e.target.value })}
          style={S.select}
        >
          <option value="">All resources</option>
          <option value="client">Clients</option>
          <option value="user">Users</option>
          <option value="billing">Billing</option>
        </select>
        <select
          value={filter.days}
          onChange={(e) => setFilter({ ...filter, days: parseInt(e.target.value, 10) })}
          style={S.select}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 180 days</option>
          <option value={365}>Last year</option>
        </select>
        <input
          type="text"
          placeholder="Filter by action (e.g. client.create)"
          value={filter.action}
          onChange={(e) => setFilter({ ...filter, action: e.target.value })}
          style={S.input}
        />
        <button onClick={load} style={S.button}>Refresh</button>
      </div>

      {error && <p style={S.errorBox}>{error}</p>}

      {loading ? (
        <p style={{ color: '#CCC' }}>Loading...</p>
      ) : (
        <>
          <p style={S.totalLine}>{total} entr{total === 1 ? 'y' : 'ies'} in window.</p>
          <table style={S.table}>
            <thead>
              <tr style={S.thRow}>
                <th style={S.th}>Time (UTC)</th>
                <th style={S.th}>User</th>
                <th style={S.th}>Action</th>
                <th style={S.th}>Resource</th>
                <th style={S.th}>IP</th>
                <th style={S.th}>Request ID</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...S.td, color: '#999' }}>
                    No activity in the selected window.
                  </td>
                </tr>
              )}
              {entries.map((e, i) => (
                <tr key={e.id} style={i % 2 === 0 ? S.trEven : S.trOdd}>
                  <td style={S.td}>{e.created_at ? new Date(e.created_at).toISOString().replace('T', ' ').slice(0, 19) : '—'}</td>
                  <td style={S.td}>{e.user_id ?? '—'}</td>
                  <td style={S.td}>{e.action}</td>
                  <td style={S.td}>
                    {e.resource_type}
                    {e.resource_id ? ` #${e.resource_id}` : ''}
                  </td>
                  <td style={S.td}>{e.ip || '—'}</td>
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11 }}>
                    {e.request_id || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

const S = {
  page: {
    padding: 32,
    background: '#1A1A1A',
    minHeight: '100vh',
    color: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  h1: {
    color: '#FFD000',
    borderBottom: '3px solid #FFD000',
    paddingBottom: 8,
    margin: '0 0 8px 0',
  },
  subtitle: { color: '#999', margin: '0 0 24px 0' },
  filterRow: { display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  select: {
    padding: 8,
    background: '#222',
    color: '#FFFFFF',
    border: '1px solid #555',
    borderRadius: 4,
    minWidth: 160,
  },
  input: {
    padding: 8,
    background: '#222',
    color: '#FFFFFF',
    border: '1px solid #555',
    borderRadius: 4,
    minWidth: 240,
    flex: 1,
  },
  button: {
    padding: '8px 16px',
    background: '#FFD000',
    color: '#1A1A1A',
    border: 'none',
    borderRadius: 4,
    fontWeight: 600,
    cursor: 'pointer',
  },
  totalLine: { color: '#999', fontSize: 13, marginBottom: 8 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#222', borderRadius: 4 },
  thRow: { background: '#FFD000', color: '#1A1A1A' },
  th: { padding: '12px 8px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase' },
  td: { padding: '12px 8px', textAlign: 'left', borderBottom: '1px solid #333', fontSize: 13 },
  trEven: { background: '#222' },
  trOdd: { background: '#1A1A1A' },
  errorBox: {
    background: '#3a1a1a',
    color: '#ff8888',
    padding: 12,
    borderRadius: 4,
    border: '1px solid #663333',
  },
};
