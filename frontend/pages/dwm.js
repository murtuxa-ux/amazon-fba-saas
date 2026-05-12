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
  tabsContainer: {
    display: 'flex', gap: '8px', borderBottom: '1px solid #1E1E1E',
    marginBottom: '24px', overflowX: 'auto',
  },
  tab: {
    padding: '12px 20px', backgroundColor: 'transparent', border: 'none',
    color: '#A0A0A0', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
    borderBottom: '2px solid transparent', whiteSpace: 'nowrap',
  },
  tabActive: { color: '#FFD000', borderBottomColor: '#FFD000' },
  card: {
    backgroundColor: '#111111', border: '1px solid #1E1E1E',
    borderRadius: '8px', padding: '20px', marginBottom: '16px',
  },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px', marginBottom: '20px',
  },
  kpiCard: {
    backgroundColor: '#111111', border: '1px solid #1E1E1E',
    borderRadius: '8px', padding: '16px',
  },
  kpiLabel: {
    fontSize: '12px', color: '#A0A0A0', fontWeight: 500, marginBottom: '6px',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  kpiValue: { fontSize: '24px', fontWeight: 700, color: '#FFD000' },
  noticeCard: {
    backgroundColor: '#111111', border: '1px solid #1E1E1E',
    borderRadius: '8px', padding: '32px 24px', textAlign: 'center',
    color: '#FFFFFF',
  },
};

function DailyLogsTab({ logs, loading, error, onRefetch }) {
  if (loading) return <LoadingSkeleton type="table" rows={5} />;
  if (error) {
    return <ErrorBanner message={error} title="Couldn't load daily logs" onRetry={onRefetch} />;
  }
  if (!logs || logs.length === 0) {
    return (
      <EmptyState
        entity="report"
        title="No daily logs yet"
        message="Daily reports submitted via the DWM module appear here. They aggregate into the weekly summary and leaderboard."
      />
    );
  }

  const columns = [
    { key: 'logDate', label: 'Date', sortable: true },
    { key: 'roleType', label: 'Role' },
    {
      key: 'productsHunted',
      label: 'Products',
      align: 'right',
      sortable: true,
      render: (r) => Number(r.productsHunted) || 0,
    },
    {
      key: 'brandsContacted',
      label: 'Brands',
      align: 'right',
      sortable: true,
      render: (r) => Number(r.brandsContacted) || 0,
    },
    { key: 'notes', label: 'Notes', render: (r) => (r.notes || '').slice(0, 80) },
  ];

  return (
    <DataTable
      columns={columns}
      rows={logs}
      rowKey="id"
      searchableFields={['logDate', 'roleType', 'notes']}
      pageSize={25}
    />
  );
}

function DashboardTab({ dashboard, loading, error, onRefetch }) {
  if (loading) return <LoadingSkeleton type="full" />;
  if (error) {
    return <ErrorBanner message={error} title="Couldn't load DWM dashboard" onRetry={onRefetch} />;
  }
  if (!dashboard) return <EmptyState entity="report" />;

  const totals = dashboard.totals || dashboard || {};
  return (
    <div>
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Products Hunted</div>
          <div style={styles.kpiValue}>{Number(totals.productsHunted) || 0}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Brands Contacted</div>
          <div style={styles.kpiValue}>{Number(totals.brandsContacted) || 0}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Approvals</div>
          <div style={styles.kpiValue}>{Number(totals.approvals) || 0}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Submissions</div>
          <div style={styles.kpiValue}>{Number(totals.submissions) || 0}</div>
        </div>
      </div>
    </div>
  );
}

function LeaderboardTab({ leaderboard, loading, error, onRefetch }) {
  if (loading) return <LoadingSkeleton type="table" rows={6} />;
  if (error) {
    return <ErrorBanner message={error} title="Couldn't load leaderboard" onRetry={onRefetch} />;
  }
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <EmptyState
        entity="report"
        title="No leaderboard data yet"
        message="Once managers submit daily DWM reports, top performers will rank here by approved + purchased + profitable products."
      />
    );
  }

  const columns = [
    { key: 'manager', label: 'Manager', sortable: true },
    { key: 'approved', label: 'Approved', align: 'right', sortable: true },
    { key: 'purchased', label: 'Purchased', align: 'right', sortable: true },
    { key: 'profitable', label: 'Profitable', align: 'right', sortable: true },
    {
      key: 'revenue',
      label: 'Revenue',
      align: 'right',
      sortable: true,
      render: (r) => (Number(r.revenue) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
    },
    { key: 'score', label: 'Score', align: 'right', sortable: true },
  ];

  return (
    <DataTable
      columns={columns}
      rows={leaderboard}
      rowKey="manager"
      searchableFields={['manager']}
      pageSize={25}
    />
  );
}

function SubmitTabPlaceholder() {
  return (
    <div style={styles.noticeCard}>
      <h3 style={{ margin: 0, marginBottom: '8px', color: '#FFD000' }}>
        Daily submission UI — coming next
      </h3>
      <p style={{ maxWidth: '480px', margin: '0 auto', color: '#A0A0A0', lineHeight: 1.5 }}>
        The backend <code style={{ color: '#FFD000' }}>POST /dwm/daily</code> expects a
        structured payload (role, products with ASIN/title/brand, brands contacted, notes).
        The legacy free-form checklist + accomplishments / challenges flow doesn't map cleanly
        to that schema — a structured submit form is the follow-up PR.
      </p>
    </div>
  );
}

export default function DWMPage() {
  const [activeTab, setActiveTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsRes, dashRes, leaderRes] = await Promise.allSettled([
        api.get('/dwm/daily'),
        api.get('/dwm/dashboard'),
        api.get('/dwm/leaderboard'),
      ]);

      if (logsRes.status === 'fulfilled') {
        const ldata = logsRes.value?.data;
        const list = Array.isArray(ldata) ? ldata : Array.isArray(ldata?.logs) ? ldata.logs : [];
        setLogs(list);
      } else {
        setLogs([]);
      }

      if (dashRes.status === 'fulfilled') {
        setDashboard(dashRes.value?.data || null);
      } else {
        setDashboard(null);
      }

      if (leaderRes.status === 'fulfilled') {
        const ldata = leaderRes.value?.data;
        const list = Array.isArray(ldata)
          ? ldata
          : Array.isArray(ldata?.leaderboard)
            ? ldata.leaderboard
            : [];
        setLeaderboard(list);
      } else {
        setLeaderboard([]);
      }
    } catch (e) {
      setError(e?.message || 'Failed to load DWM data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const tabs = [
    { id: 'logs', label: 'Daily Logs' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'submit', label: 'Submit Daily' },
  ];

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>DWM Reporting</div>
          <div style={styles.subtitle}>Daily / Weekly / Monthly logs, dashboard, and leaderboard</div>
        </div>

        <div style={styles.tabsContainer}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              style={{ ...styles.tab, ...(activeTab === t.id ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'logs' && (
          <DailyLogsTab logs={logs} loading={loading} error={error} onRefetch={fetchAll} />
        )}
        {activeTab === 'dashboard' && (
          <DashboardTab dashboard={dashboard} loading={loading} error={error} onRefetch={fetchAll} />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardTab
            leaderboard={leaderboard}
            loading={loading}
            error={error}
            onRefetch={fetchAll}
          />
        )}
        {activeTab === 'submit' && <SubmitTabPlaceholder />}
      </div>
    </div>
  );
}
