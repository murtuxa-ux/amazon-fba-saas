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
  pageHeader: { marginBottom: '24px' },
  pageTitle: { fontSize: '28px', fontWeight: 700, marginBottom: '4px' },
  subtitle: { fontSize: '14px', color: '#A0A0A0' },
  podiumContainer: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px', marginBottom: '24px',
  },
  podiumCard: (rank) => ({
    backgroundColor: '#111111',
    border: `1px solid ${rank === 1 ? '#FFD000' : '#1E1E1E'}`,
    borderRadius: '8px', padding: '20px',
    textAlign: 'center',
    transform: rank === 1 ? 'scale(1.05)' : 'scale(1)',
    transition: 'transform 0.2s',
  }),
  podiumRank: { fontSize: '22px', marginBottom: '8px' },
  podiumName: { fontSize: '15px', fontWeight: 600, marginBottom: '4px' },
  podiumScore: { fontSize: '24px', fontWeight: 700, color: '#FFD000' },
  podiumDetail: { fontSize: '12px', color: '#A0A0A0', marginTop: '4px' },
};

function rankBadge(rank) {
  if (rank === 1) return '#1';
  if (rank === 2) return '#2';
  if (rank === 3) return '#3';
  return `#${rank}`;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/leaderboard');
      const data = res?.data || {};
      const list = Array.isArray(data) ? data : Array.isArray(data.leaderboard) ? data.leaderboard : [];
      setRows(list);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load leaderboard.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const podium = rows.slice(0, 3);

  const columns = [
    {
      key: 'rank',
      label: 'Rank',
      sortable: true,
      render: (r) => rankBadge(rows.indexOf(r) + 1),
    },
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
    {
      key: 'profit',
      label: 'Profit',
      align: 'right',
      sortable: true,
      render: (r) => (Number(r.profit) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
    },
    { key: 'score', label: 'Score', align: 'right', sortable: true },
  ];

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <div style={styles.pageTitle}>Team Leaderboard</div>
          <div style={styles.subtitle}>Ranked by approved + purchased + profitable products from weekly reports</div>
        </div>

        {error && <ErrorBanner message={error} title="Couldn't load leaderboard" onRetry={refetch} />}

        {loading ? (
          <LoadingSkeleton type="full" />
        ) : rows.length === 0 ? (
          <EmptyState
            entity="report"
            title="No leaderboard data yet"
            message="Managers ranked by approved + purchased + profitable products appear here once weekly reports are submitted. Submit a weekly report on /weekly to start scoring."
          />
        ) : (
          <>
            {podium.length > 0 && (
              <div style={styles.podiumContainer}>
                {podium.map((p, i) => (
                  <div key={p.manager || i} style={styles.podiumCard(i + 1)}>
                    <div style={styles.podiumRank}>{i === 0 ? '#1' : i === 1 ? '#2' : '#3'}</div>
                    <div style={styles.podiumName}>{p.manager || 'Unknown'}</div>
                    <div style={styles.podiumScore}>{Number(p.score) || 0} pts</div>
                    <div style={styles.podiumDetail}>
                      {Number(p.approved) || 0} approved · {Number(p.purchased) || 0} purchased
                    </div>
                    <div style={styles.podiumDetail}>
                      Revenue: {(Number(p.revenue) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <DataTable
              columns={columns}
              rows={rows}
              rowKey="manager"
              searchableFields={['manager']}
              pageSize={50}
            />
          </>
        )}
      </div>
    </div>
  );
}
