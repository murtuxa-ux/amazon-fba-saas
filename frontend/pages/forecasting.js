import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const styles = {
  outerContainer: { display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' },
  container: { flex: 1, marginLeft: '250px', padding: '32px', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  header: { marginBottom: '24px' },
  title: { fontSize: '32px', fontWeight: '700', marginBottom: '8px', color: '#FFFFFF' },
  subtitle: { fontSize: '14px', color: '#999999' },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' },
  statCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '6px', padding: '14px 16px', borderBottom: '2px solid #FFD000' },
  statLabel: { fontSize: '11px', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
  statValue: { fontSize: '22px', fontWeight: '700', color: '#FFFFFF' },
  statValueGold: { fontSize: '22px', fontWeight: '700', color: '#FFD000' },

  card: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', marginBottom: '24px', overflow: 'hidden' },
  cardTitle: { padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#FFFFFF', backgroundColor: '#1A1A1A', borderBottom: '2px solid #FFD000', textTransform: 'uppercase', letterSpacing: '0.5px' },

  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thead: { backgroundColor: '#1A1A1A', borderBottom: '2px solid #FFD000' },
  th: { padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: '#FFFFFF', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
  td: { padding: '10px 12px', borderBottom: '1px solid #1E1E1E', color: '#CCCCCC', verticalAlign: 'middle' },
  tdNum: { padding: '10px 12px', borderBottom: '1px solid #1E1E1E', color: '#CCCCCC', textAlign: 'right', whiteSpace: 'nowrap' },

  asinLink: { color: '#FFD000', textDecoration: 'none', fontFamily: 'monospace', fontSize: '12px' },

  badge: { display: 'inline-block', padding: '3px 9px', fontSize: '11px', fontWeight: '700', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  badgeHigh: { backgroundColor: '#1E4620', color: '#90EE90' },
  badgeMedium: { backgroundColor: '#4D3E1F', color: '#FFD000' },
  badgeLow: { backgroundColor: '#2A1E1E', color: '#FF8888' },

  errorBanner: { padding: '12px 16px', backgroundColor: '#2A1E1E', border: '1px solid #5D1F1F', borderRadius: '6px', color: '#FF8888', fontSize: '13px', marginBottom: '16px' },
  noData: { padding: '48px 32px', textAlign: 'center', color: '#666666', fontSize: '14px' },

  buttonPrimary: { padding: '8px 16px', fontSize: '12px', fontWeight: '600', backgroundColor: '#FFD000', color: '#1A1A1A', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  buttonDisabled: { opacity: 0.5, cursor: 'not-allowed' },

  searchBar: { display: 'flex', gap: '10px', alignItems: 'center', padding: '16px' },
  input: { flex: 1, padding: '8px 10px', fontSize: '13px', backgroundColor: '#FFFDE7', color: '#1565C0', border: '1px solid #1E1E1E', borderRadius: '4px' },

  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px' },
  detailCard: { backgroundColor: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '6px', padding: '12px' },
  detailLabel: { fontSize: '11px', color: '#999999', textTransform: 'uppercase', marginBottom: '4px' },
  detailValue: { fontSize: '18px', fontWeight: '700', color: '#FFFFFF' },
};

const CONFIDENCE_BADGE = {
  high: styles.badgeHigh,
  medium: styles.badgeMedium,
  low: styles.badgeLow,
};

const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ecomera_token');
};

const urgencyColor = (days) => {
  if (days >= 999) return '#90EE90';
  if (days < 14) return '#FF8888';
  if (days < 30) return '#FFD000';
  return '#CCCCCC';
};

export default function ForecastingPage() {
  const [items, setItems] = useState([]);
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [singleAsin, setSingleAsin] = useState('');
  const [singleResult, setSingleResult] = useState(null);
  const [singleLoading, setSingleLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError('Not signed in.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/forecasting/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || `Forecast dashboard failed (${res.status}).`);
        setItems([]);
      } else {
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotalAnalyzed(data.total_skus_analyzed || 0);
        setTotalFailed(data.total_skus_failed || 0);
      }
    } catch (e) {
      setError(e.message || 'Forecast dashboard failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  const runSingleForecast = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError('Not signed in.');
      return;
    }
    const asin = (singleAsin || '').trim().toUpperCase();
    if (!asin) {
      setError('Enter an ASIN to forecast.');
      return;
    }
    setSingleLoading(true);
    setError('');
    setSingleResult(null);
    try {
      const res = await fetch(`${BASE_URL}/forecasting/asin/${encodeURIComponent(asin)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || `Forecast failed (${res.status}).`);
      } else {
        setSingleResult(data);
      }
    } catch (e) {
      setError(e.message || 'Forecast failed.');
    } finally {
      setSingleLoading(false);
    }
  }, [singleAsin]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const urgentCount = items.filter((i) => (i.days_until_reorder || 999) < 14).length;
  const totalReorderQty = items.reduce((s, i) => s + (i.reorder_qty || 0), 0);

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Reorder Forecast</h1>
          <p style={styles.subtitle}>
            30/60/90-day demand forecast + reorder priorities. Confidence depends on available Keepa history.
          </p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>SKUs Analyzed</div>
            <div style={styles.statValue}>{(totalAnalyzed || 0).toLocaleString()}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Failed</div>
            <div style={styles.statValue}>{(totalFailed || 0).toLocaleString()}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Urgent (&lt;14d)</div>
            <div style={styles.statValueGold}>{(urgentCount || 0).toLocaleString()}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Reorder Units</div>
            <div style={styles.statValue}>{(totalReorderQty || 0).toLocaleString()}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Single-ASIN Forecast</div>
          <div style={styles.searchBar}>
            <input
              type="text"
              placeholder="B0XXXXXXXX"
              value={singleAsin}
              onChange={(e) => setSingleAsin(e.target.value)}
              style={styles.input}
            />
            <button
              onClick={runSingleForecast}
              disabled={singleLoading}
              style={{ ...styles.buttonPrimary, ...(singleLoading ? styles.buttonDisabled : {}) }}
            >
              {singleLoading ? 'Forecasting…' : 'Forecast'}
            </button>
          </div>
          {singleResult && (
            <div style={styles.detailGrid}>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>30-Day</div>
                <div style={styles.detailValue}>{(singleResult.forecast_30d || 0).toLocaleString()}</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>60-Day</div>
                <div style={styles.detailValue}>{(singleResult.forecast_60d || 0).toLocaleString()}</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>90-Day</div>
                <div style={styles.detailValue}>{(singleResult.forecast_90d || 0).toLocaleString()}</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Reorder Qty</div>
                <div style={styles.detailValue}>{(singleResult.reorder_qty || 0).toLocaleString()}</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Reorder Date</div>
                <div style={styles.detailValue}>{singleResult.reorder_date || '—'}</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>{singleResult.label === 'trend estimate' ? 'Trend Estimate' : 'Forecast'} · {singleResult.method}</div>
                <div style={styles.detailValue}>
                  <span style={{ ...styles.badge, ...(CONFIDENCE_BADGE[singleResult.confidence] || styles.badgeLow) }}>
                    {singleResult.confidence}
                  </span>
                  {singleResult.q4_boost_applied && (
                    <span style={{ ...styles.badge, ...styles.badgeMedium, marginLeft: '8px' }}>Q4 boost</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Reorder Priorities</div>
          <div style={styles.tableContainer}>
            {loading ? (
              <div style={styles.noData}>Loading forecast…</div>
            ) : items.length === 0 ? (
              <div style={styles.noData}>No products to forecast yet. Add ASINs in the Products module.</div>
            ) : (
              <table style={styles.table}>
                <thead style={styles.thead}>
                  <tr>
                    <th style={styles.th}>ASIN</th>
                    <th style={styles.th}>Title</th>
                    <th style={styles.th}>Method</th>
                    <th style={styles.th}>Confidence</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Days to Reorder</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Reorder Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.asin}>
                      <td style={styles.td}>
                        <a
                          href={`https://www.amazon.com/dp/${row.asin}`}
                          target="_blank"
                          rel="noreferrer"
                          style={styles.asinLink}
                        >
                          {row.asin}
                        </a>
                      </td>
                      <td style={styles.td}>{row.title || '—'}</td>
                      <td style={styles.td}>{row.method}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, ...(CONFIDENCE_BADGE[row.confidence] || styles.badgeLow) }}>
                          {row.confidence}
                        </span>
                      </td>
                      <td style={{ ...styles.tdNum, color: urgencyColor(row.days_until_reorder) }}>
                        {row.days_until_reorder >= 999 ? 'OK' : `${row.days_until_reorder}d`}
                      </td>
                      <td style={styles.tdNum}>{(row.reorder_qty || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
