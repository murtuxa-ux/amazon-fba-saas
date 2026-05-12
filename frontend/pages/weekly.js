import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
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
  weekSelector: {
    display: 'flex', alignItems: 'center', gap: '12px',
    marginBottom: '24px', flexWrap: 'wrap',
  },
  weekButton: {
    backgroundColor: '#1E1E1E', color: '#FFFFFF', border: 'none',
    borderRadius: '4px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px',
  },
  weekDisplay: { fontSize: '14px', fontWeight: 600, minWidth: '260px' },
  sectionHeader: {
    fontSize: '18px', fontWeight: 700, marginBottom: '12px', marginTop: '24px',
    color: '#FFD000',
  },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px', marginBottom: '24px',
  },
  kpiCard: {
    backgroundColor: '#111111', border: '1px solid #1E1E1E',
    borderRadius: '8px', padding: '20px',
  },
  kpiValue: { fontSize: '26px', fontWeight: 700, color: '#FFD000', marginBottom: '4px' },
  kpiLabel: { fontSize: '12px', color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.5px' },
  kpiNote: { fontSize: '11px', color: '#606060', marginTop: '8px' },
  leaderRow: {
    display: 'grid', gridTemplateColumns: '32px 1fr auto auto',
    gap: '12px', alignItems: 'center', padding: '10px 12px',
    borderRadius: '6px', backgroundColor: '#0A0A0A', marginBottom: '6px',
    fontSize: '14px',
  },
  rank: { fontWeight: 700, color: '#FFD000' },
  card: {
    backgroundColor: '#111111', border: '1px solid #1E1E1E',
    borderRadius: '8px', padding: '20px', marginBottom: '24px',
  },
};

function MoneyOrZero({ value }) {
  const n = Number(value) || 0;
  return <>{n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</>;
}

function formatWeekRange(dateStr) {
  // Returns ISO Monday-Sunday string for a given calendar date.
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return { start: null, end: null, label: '—' };
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return {
    start: monday,
    end: sunday,
    label: `${monday.toLocaleDateString()} - ${sunday.toLocaleDateString()}`,
  };
}

export default function WeeklyReportPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date().toISOString().split('T')[0]);
  const [kpis, setKpis] = useState({ revenue: 0, profit: 0, orders: 0, products: 0 });
  const [trends, setTrends] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const weekRange = formatWeekRange(currentWeek);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendsRes, leaderRes, productsRes] = await Promise.allSettled([
        api.get('/client-pnl/trends'),
        api.get('/dwm/leaderboard'),
        api.get('/products-pipeline'),
      ]);

      // Trends drive revenue/profit KPIs (sum of latest month, which is the
      // closest proxy to "this week" until a weekly aggregation endpoint exists).
      let trendList = [];
      if (trendsRes.status === 'fulfilled') {
        const tdata = trendsRes.value?.data || {};
        trendList = Array.isArray(tdata) ? tdata : Array.isArray(tdata.trends) ? tdata.trends : [];
      }
      setTrends(trendList);

      const latestTrend = trendList[trendList.length - 1] || {};
      const totalRevenue = trendList.reduce((s, t) => s + (Number(t.revenue || t.total_revenue) || 0), 0);
      const totalProfit = trendList.reduce(
        (s, t) => s + (Number(t.netProfit || t.net_profit || t.profit) || 0),
        0,
      );

      // Leaderboard for the "Top Performers" section.
      let leaderList = [];
      if (leaderRes.status === 'fulfilled') {
        const ldata = leaderRes.value?.data || {};
        leaderList = Array.isArray(ldata)
          ? ldata
          : Array.isArray(ldata.leaderboard)
            ? ldata.leaderboard
            : [];
      }
      setLeaderboard(leaderList);

      // Product count (proxy for "products in pipeline this week").
      let productsCount = 0;
      if (productsRes.status === 'fulfilled') {
        const pdata = productsRes.value?.data || {};
        const list = Array.isArray(pdata) ? pdata : Array.isArray(pdata.products) ? pdata.products : [];
        productsCount = list.length;
      }

      setKpis({
        revenue: Number(latestTrend.revenue || latestTrend.total_revenue) || 0,
        profit: Number(latestTrend.netProfit || latestTrend.net_profit || latestTrend.profit) || 0,
        orders: 0, // No orders endpoint yet — placeholder.
        products: productsCount,
        revenueAllTime: totalRevenue,
        profitAllTime: totalProfit,
      });
    } catch (e) {
      setError(e?.message || 'Failed to load weekly summary.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handlePrevWeek = () => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() - 7);
    setCurrentWeek(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + 7);
    setCurrentWeek(d.toISOString().split('T')[0]);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Week', weekRange.label],
      [],
      ['Metric', 'Value'],
      ['Revenue (latest month)', kpis.revenue],
      ['Profit (latest month)', kpis.profit],
      ['Products in pipeline', kpis.products],
      ['Revenue (all-time)', kpis.revenueAllTime],
      ['Profit (all-time)', kpis.profitAllTime],
      [],
      ['Leaderboard'],
      ['Manager', 'Approved', 'Purchased', 'Revenue', 'Profit', 'Score'],
      ...leaderboard.map((l) => [l.manager, l.approved, l.purchased, l.revenue, l.profit, l.score]),
    ]
      .map((row) => row.map((c) => `"${c}"`).join(','))
      .join('\n');

    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly_report_${currentWeek}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>Weekly Summary</div>
          <div style={styles.subtitle}>Org-wide performance for the selected week</div>
        </div>

        <div style={styles.weekSelector}>
          <button type="button" style={styles.weekButton} onClick={handlePrevWeek}>
            ← Previous
          </button>
          <div style={styles.weekDisplay}>Week of {weekRange.label}</div>
          <button type="button" style={styles.weekButton} onClick={handleNextWeek}>
            Next →
          </button>
          <button
            type="button"
            style={{ ...styles.weekButton, marginLeft: 'auto', backgroundColor: '#FFD000', color: '#1A1A1A', fontWeight: 600 }}
            onClick={handleExportCSV}
          >
            Export CSV
          </button>
        </div>

        {error && <ErrorBanner message={error} title="Couldn't load weekly summary" onRetry={fetchAll} />}

        {loading ? (
          <LoadingSkeleton type="full" />
        ) : (
          <>
            <div style={styles.sectionHeader}>Top-line KPIs</div>
            <div style={styles.kpiGrid}>
              <div style={styles.kpiCard}>
                <div style={styles.kpiValue}>
                  <MoneyOrZero value={kpis.revenue} />
                </div>
                <div style={styles.kpiLabel}>Revenue (latest month)</div>
                <div style={styles.kpiNote}>From /client-pnl/trends — most recent month</div>
              </div>
              <div style={styles.kpiCard}>
                <div style={styles.kpiValue}>
                  <MoneyOrZero value={kpis.profit} />
                </div>
                <div style={styles.kpiLabel}>Profit (latest month)</div>
                <div style={styles.kpiNote}>Net of fees + COGS + ad spend</div>
              </div>
              <div style={styles.kpiCard}>
                <div style={styles.kpiValue}>{kpis.products}</div>
                <div style={styles.kpiLabel}>Products in Pipeline</div>
                <div style={styles.kpiNote}>From /products-pipeline</div>
              </div>
              <div style={styles.kpiCard}>
                <div style={styles.kpiValue}>{leaderboard.length}</div>
                <div style={styles.kpiLabel}>Active Managers</div>
                <div style={styles.kpiNote}>Reported in DWM this period</div>
              </div>
            </div>

            <div style={styles.sectionHeader}>Top Performers</div>
            {leaderboard.length === 0 ? (
              <EmptyState
                entity="report"
                title="No DWM activity yet"
                message="Once managers submit their daily reports under /dwm, top performers will rank here by approved + purchased + profitable products."
                compact
              />
            ) : (
              <div style={styles.card}>
                {leaderboard.slice(0, 10).map((row, idx) => (
                  <div key={row.manager || idx} style={styles.leaderRow}>
                    <div style={styles.rank}>#{idx + 1}</div>
                    <div style={{ fontWeight: 500 }}>{row.manager || 'Unknown'}</div>
                    <div style={{ color: '#A0A0A0', fontSize: '13px' }}>
                      {row.approved || 0} approved · {row.purchased || 0} purchased
                    </div>
                    <div style={{ color: '#FFD000', fontWeight: 600 }}>{row.score || 0} pts</div>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.sectionHeader}>Department Updates</div>
            <div
              style={{
                backgroundColor: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '32px 24px',
                textAlign: 'center',
                color: '#FFFFFF',
                marginBottom: '24px',
              }}
            >
              <h3 style={{ margin: 0, marginBottom: '8px', color: '#FFD000' }}>
                Department highlights / blockers — pending backend
              </h3>
              <p style={{ maxWidth: '480px', margin: '0 auto', color: '#A0A0A0', lineHeight: 1.5 }}>
                Wholesale, Private Label, PPC, and Operations status boards need a
                {' '}<code style={{ color: '#FFD000' }}>weekly_summaries</code> or
                {' '}<code style={{ color: '#FFD000' }}>weekly_department_updates</code> table
                — tracked in <code style={{ color: '#FFD000' }}>docs/design-questions.md #7</code>.
              </p>
            </div>

            <div style={styles.sectionHeader}>Action Items</div>
            <div
              style={{
                backgroundColor: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '32px 24px',
                textAlign: 'center',
                color: '#FFFFFF',
              }}
            >
              <h3 style={{ margin: 0, marginBottom: '8px', color: '#FFD000' }}>
                Action items — pending backend
              </h3>
              <p style={{ maxWidth: '480px', margin: '0 auto', color: '#A0A0A0', lineHeight: 1.5 }}>
                Per-assignee weekly tasks with priority + due-date need a
                {' '}<code style={{ color: '#FFD000' }}>weekly_action_items</code> table
                — same design question (#7). Distinct from DWMDailyLogs and audit_logs.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
