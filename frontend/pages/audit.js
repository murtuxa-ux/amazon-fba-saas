import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import DataTable from '../components/DataTable';
import api from '../lib/api';

const styles = {
  outerContainer: { display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' },
  container: {
    flex: 1, marginLeft: '250px', padding: '32px',
    color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  header: { marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: 700, marginBottom: '4px' },
  subtitle: { fontSize: '14px', color: '#A0A0A0' },
  filterBar: {
    backgroundColor: '#111111', border: '1px solid #1E1E1E',
    borderRadius: '8px', padding: '16px', marginBottom: '16px',
    display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end',
  },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' },
  label: {
    fontSize: '12px', color: '#A0A0A0', textTransform: 'uppercase',
    letterSpacing: '0.5px', fontWeight: 500,
  },
  input: {
    padding: '8px 12px', backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E', borderRadius: '6px',
    color: '#FFFFFF', fontSize: '14px',
  },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px', marginBottom: '20px',
  },
  kpiCard: {
    backgroundColor: '#111111', border: '1px solid #1E1E1E',
    borderRadius: '8px', padding: '14px',
  },
  kpiLabel: {
    fontSize: '11px', color: '#A0A0A0', fontWeight: 500,
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  kpiValue: { fontSize: '22px', fontWeight: 700, color: '#FFD000', marginTop: '4px' },
};

function severityFor(action) {
  const a = String(action || '').toLowerCase();
  if (a.includes('delete') || a.includes('cancel') || a.includes('fail')) return 'warn';
  if (a.includes('purge') || a.includes('admin')) return 'critical';
  return 'info';
}

function SeverityBadge({ severity }) {
  const palette = {
    critical: { bg: 'rgba(255, 68, 68, 0.2)', fg: '#FF4444' },
    warn: { bg: 'rgba(255, 184, 0, 0.2)', fg: '#FFB800' },
    info: { bg: 'rgba(68, 187, 187, 0.2)', fg: '#68C0E0' },
  }[severity] || { bg: '#1E1E1E', fg: '#A0A0A0' };
  return (
    <span
      style={{
        display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
        fontSize: '11px', fontWeight: 600,
        backgroundColor: palette.bg, color: palette.fg,
      }}
    >
      {severity}
    </span>
  );
}

export default function AuditPage() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('days', String(days));
      params.set('page_size', '100');
      if (actionFilter) params.set('action', actionFilter);
      if (resourceFilter) params.set('resource_type', resourceFilter);
      const res = await api.get(`/api/audit-logs?${params.toString()}`);
      const data = res?.data || {};
      const list = Array.isArray(data.entries) ? data.entries : [];
      setEntries(list);
      setTotal(Number(data.total) || list.length);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load audit logs.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [days, actionFilter, resourceFilter]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const totalEntries = total;
  const criticalCount = entries.filter((e) => severityFor(e.action) === 'critical').length;
  const warnCount = entries.filter((e) => severityFor(e.action) === 'warn').length;
  const uniqueUsers = new Set(entries.map((e) => e.userId).filter(Boolean)).size;

  const columns = [
    {
      key: 'createdAt',
      label: 'When',
      sortable: true,
      render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleString() : '—',
    },
    {
      key: 'userId',
      label: 'User',
      render: (r) => r.userId ? `user_${r.userId}` : '—',
    },
    { key: 'action', label: 'Action', sortable: true },
    { key: 'resourceType', label: 'Resource', sortable: true },
    {
      key: 'resourceId',
      label: 'Resource ID',
      render: (r) => r.resourceId || '—',
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (r) => <SeverityBadge severity={severityFor(r.action)} />,
    },
    { key: 'ip', label: 'IP', render: (r) => r.ip || '—' },
  ];

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>Audit Log</div>
          <div style={styles.subtitle}>State-changing actions across the organization</div>
        </div>

        {error && <ErrorBanner message={error} title="Couldn't load audit logs" onRetry={refetch} />}

        <div style={styles.filterBar}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Window (days)</label>
            <select
              style={styles.input}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={1}>Last day</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Action</label>
            <input
              type="text"
              style={styles.input}
              placeholder="e.g., client.delete"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Resource</label>
            <input
              type="text"
              style={styles.input}
              placeholder="e.g., client"
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton type="table" rows={6} />
        ) : entries.length === 0 ? (
          <EmptyState
            entity="audit_event"
            title="No audit events in this window"
            message="Audit events appear here as users create / update / delete resources, run admin actions, or trigger system events. Widen the window or clear the filters if you expected events."
          />
        ) : (
          <>
            <div style={styles.kpiGrid}>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Events shown</div>
                <div style={styles.kpiValue}>{entries.length}</div>
              </div>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Total in window</div>
                <div style={styles.kpiValue}>{totalEntries}</div>
              </div>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Critical</div>
                <div style={{ ...styles.kpiValue, color: '#FF4444' }}>{criticalCount}</div>
              </div>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Warnings</div>
                <div style={{ ...styles.kpiValue, color: '#FFB800' }}>{warnCount}</div>
              </div>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Active Users</div>
                <div style={styles.kpiValue}>{uniqueUsers}</div>
              </div>
            </div>
            <DataTable
              columns={columns}
              rows={entries}
              rowKey="id"
              searchableFields={['action', 'resourceType', 'resourceId', 'ip']}
              pageSize={50}
            />
          </>
        )}
      </div>
    </div>
  );
}
