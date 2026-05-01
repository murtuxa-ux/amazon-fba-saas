import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const styles = {
  outerContainer: { display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' },
  container: { flex: 1, marginLeft: '250px', padding: '32px', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  header: { marginBottom: '24px' },
  title: { fontSize: '32px', fontWeight: '700', marginBottom: '8px', color: '#FFFFFF' },
  subtitle: { fontSize: '14px', color: '#999999' },

  // Stats strip
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' },
  statCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '6px', padding: '14px 16px', borderBottom: '2px solid #FFD000' },
  statLabel: { fontSize: '11px', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
  statValue: { fontSize: '22px', fontWeight: '700', color: '#FFFFFF' },
  statValueGold: { fontSize: '22px', fontWeight: '700', color: '#FFD000' },

  // Filter card
  card: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', marginBottom: '24px', overflow: 'hidden' },
  cardTitle: { padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#FFFFFF', backgroundColor: '#1A1A1A', borderBottom: '2px solid #FFD000', textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardBody: { padding: '16px' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px' },
  fieldLabel: { fontSize: '11px', color: '#999999', marginBottom: '4px', display: 'block' },
  input: { width: '100%', padding: '8px 10px', fontSize: '13px', backgroundColor: '#FFFDE7', color: '#1565C0', border: '1px solid #1E1E1E', borderRadius: '4px', boxSizing: 'border-box' },
  select: { width: '100%', padding: '8px 10px', fontSize: '13px', backgroundColor: '#FFFDE7', color: '#1565C0', border: '1px solid #1E1E1E', borderRadius: '4px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px', fontSize: '13px', backgroundColor: '#FFFDE7', color: '#1565C0', border: '1px solid #1E1E1E', borderRadius: '4px', boxSizing: 'border-box', fontFamily: 'monospace', minHeight: '90px', resize: 'vertical' },
  buttonRow: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
  buttonPrimary: { padding: '9px 18px', fontSize: '13px', fontWeight: '600', backgroundColor: '#FFD000', color: '#1A1A1A', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  buttonSecondary: { padding: '9px 14px', fontSize: '13px', fontWeight: '500', backgroundColor: '#1E1E1E', color: '#CCCCCC', border: '1px solid #2A2A2A', borderRadius: '6px', cursor: 'pointer' },
  buttonDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  hint: { fontSize: '11px', color: '#666666', marginLeft: '8px' },

  // Table
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thead: { backgroundColor: '#1A1A1A', borderBottom: '2px solid #FFD000' },
  th: { padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: '#FFFFFF', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
  td: { padding: '10px 12px', borderBottom: '1px solid #1E1E1E', color: '#CCCCCC', verticalAlign: 'middle' },
  tdNum: { padding: '10px 12px', borderBottom: '1px solid #1E1E1E', color: '#CCCCCC', textAlign: 'right', whiteSpace: 'nowrap' },
  totalRow: { backgroundColor: '#1A1A1A', color: '#FFD000', fontWeight: '700' },

  // Tier badges
  tierBadge: { display: 'inline-block', padding: '3px 9px', fontSize: '11px', fontWeight: '700', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tierHot: { backgroundColor: '#4D3E1F', color: '#FFD000' },
  tierWarm: { backgroundColor: '#1E4620', color: '#90EE90' },
  tierCool: { backgroundColor: '#1E2A3A', color: '#5DADE2' },
  tierSkip: { backgroundColor: '#2A1E1E', color: '#FF8888' },

  estimatedBadge: { display: 'inline-block', padding: '2px 6px', fontSize: '10px', fontWeight: '600', borderRadius: '3px', backgroundColor: '#2A2A2A', color: '#999999', marginLeft: '6px' },

  asinLink: { color: '#FFD000', textDecoration: 'none', fontFamily: 'monospace', fontSize: '12px' },
  scoreCell: { fontWeight: '600', color: '#FFFFFF' },

  errorBanner: { padding: '12px 16px', backgroundColor: '#2A1E1E', border: '1px solid #5D1F1F', borderRadius: '6px', color: '#FF8888', fontSize: '13px', marginBottom: '16px' },
  noData: { padding: '48px 32px', textAlign: 'center', color: '#666666', fontSize: '14px' },
};

const TIER_STYLE = {
  Hot: styles.tierHot,
  Warm: styles.tierWarm,
  Cool: styles.tierCool,
  Skip: styles.tierSkip,
};

const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ecomera_token');
};

const getUserRole = () => {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('ecomera_user');
    if (!raw) return '';
    const u = JSON.parse(raw);
    return (u && u.role) || '';
  } catch (e) {
    return '';
  }
};

export default function ProductRadarPage() {
  const [role, setRole] = useState('');
  const [categories, setCategories] = useState([]);
  const [results, setResults] = useState([]);
  const [tierCounts, setTierCounts] = useState({ Hot: 0, Warm: 0, Cool: 0, Skip: 0 });
  const [source, setSource] = useState('scout_db');
  const [tokensConsumed, setTokensConsumed] = useState(null);
  const [budget, setBudget] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [error, setError] = useState('');

  const [filterCategory, setFilterCategory] = useState('');
  const [bsrMax, setBsrMax] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [fbaSellersMax, setFbaSellersMax] = useState('');
  const [minComposite, setMinComposite] = useState('');
  const [defaultCost, setDefaultCost] = useState('');

  const [liveAsins, setLiveAsins] = useState('');
  const [liveCost, setLiveCost] = useState('');
  const [liveDomain, setLiveDomain] = useState(1);

  const isAdmin = role === 'owner' || role === 'admin';

  useEffect(() => {
    setRole(getUserRole());
  }, []);

  const loadCategories = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/product-radar/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (e) {
      // Categories are non-critical — silent fail keeps the filter usable as a free-text override
    }
  }, []);

  const runScan = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError('Not signed in.');
      return;
    }
    setScanLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set('category', filterCategory);
      if (bsrMax) params.set('bsr_max', bsrMax);
      if (priceMin) params.set('price_min', priceMin);
      if (priceMax) params.set('price_max', priceMax);
      if (fbaSellersMax) params.set('fba_sellers_max', fbaSellersMax);
      if (minComposite) params.set('min_composite', minComposite);
      if (defaultCost) params.set('default_cost', defaultCost);
      params.set('limit', '100');

      const res = await fetch(`${BASE_URL}/product-radar/scan?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) {
        setError(data.detail || data.error);
        setResults([]);
      } else {
        setResults(Array.isArray(data.data) ? data.data : []);
        setTierCounts(data.tier_counts || { Hot: 0, Warm: 0, Cool: 0, Skip: 0 });
        setSource(data.source || 'scout_db');
        setTokensConsumed(null);
        setBudget(null);
      }
    } catch (e) {
      setError(e.message || 'Scan failed.');
    } finally {
      setScanLoading(false);
    }
  }, [filterCategory, bsrMax, priceMin, priceMax, fbaSellersMax, minComposite, defaultCost]);

  const runLiveScan = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError('Not signed in.');
      return;
    }
    const asins = liveAsins
      .split(/[\s,]+/)
      .map((a) => a.trim().toUpperCase())
      .filter((a) => a.length > 0);
    if (asins.length === 0) {
      setError('Paste at least one ASIN to run a live scan.');
      return;
    }
    setLiveLoading(true);
    setError('');
    try {
      const body = {
        asins,
        domain: Number(liveDomain) || 1,
        cost_per_unit: liveCost ? Number(liveCost) : null,
        filters: {
          category: filterCategory || null,
          bsr_max: bsrMax ? Number(bsrMax) : null,
          price_min: priceMin ? Number(priceMin) : null,
          price_max: priceMax ? Number(priceMax) : null,
          fba_sellers_max: fbaSellersMax ? Number(fbaSellersMax) : null,
          min_composite: minComposite ? Number(minComposite) : null,
        },
      };
      const res = await fetch(`${BASE_URL}/product-radar/live-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || `Live scan failed (${res.status}).`);
      } else {
        setResults(Array.isArray(data.data) ? data.data : []);
        setTierCounts(data.tier_counts || { Hot: 0, Warm: 0, Cool: 0, Skip: 0 });
        setSource(data.source || 'keepa_live');
        setTokensConsumed(data.tokens_consumed_estimate ?? null);
        setBudget(data.budget ?? null);
      }
    } catch (e) {
      setError(e.message || 'Live scan failed.');
    } finally {
      setLiveLoading(false);
    }
  }, [liveAsins, liveCost, liveDomain, filterCategory, bsrMax, priceMin, priceMax, fbaSellersMax, minComposite]);

  useEffect(() => {
    loadCategories();
    runScan();
    // intentional: only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avgComposite = results.length
    ? Math.round((results.reduce((s, r) => s + (r.composite || 0), 0) / results.length) * 10) / 10
    : 0;

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Product Radar</h1>
          <p style={styles.subtitle}>
            Opportunity scanner — composite score blends velocity, competition, and margin.
            Source: <strong style={{ color: '#FFD000' }}>{source === 'keepa_live' ? 'Keepa (live)' : 'Scout DB'}</strong>
            {tokensConsumed != null && budget != null && (
              <span style={styles.hint}>
                · ~{tokensConsumed} Keepa tokens used (budget {budget})
              </span>
            )}
          </p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Results</div>
            <div style={styles.statValue}>{(results.length || 0).toLocaleString()}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Hot</div>
            <div style={styles.statValueGold}>{(tierCounts.Hot || 0).toLocaleString()}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Warm</div>
            <div style={styles.statValue}>{(tierCounts.Warm || 0).toLocaleString()}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Cool</div>
            <div style={styles.statValue}>{(tierCounts.Cool || 0).toLocaleString()}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Avg Composite</div>
            <div style={styles.statValue}>{(avgComposite || 0).toLocaleString()}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Filters</div>
          <div style={styles.cardBody}>
            <div style={styles.filterGrid}>
              <div>
                <label style={styles.fieldLabel}>Category</label>
                <select style={styles.select} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="">All categories</option>
                  {Array.isArray(categories) && categories.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({(c.count || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={styles.fieldLabel}>BSR max</label>
                <input style={styles.input} type="number" min="0" value={bsrMax} onChange={(e) => setBsrMax(e.target.value)} placeholder="e.g. 50000" />
              </div>
              <div>
                <label style={styles.fieldLabel}>Price min ($)</label>
                <input style={styles.input} type="number" min="0" step="0.01" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
              </div>
              <div>
                <label style={styles.fieldLabel}>Price max ($)</label>
                <input style={styles.input} type="number" min="0" step="0.01" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
              </div>
              <div>
                <label style={styles.fieldLabel}>FBA sellers max</label>
                <input style={styles.input} type="number" min="0" value={fbaSellersMax} onChange={(e) => setFbaSellersMax(e.target.value)} placeholder="e.g. 10" />
              </div>
              <div>
                <label style={styles.fieldLabel}>Min composite</label>
                <input style={styles.input} type="number" min="0" max="100" value={minComposite} onChange={(e) => setMinComposite(e.target.value)} placeholder="0-100" />
              </div>
              <div>
                <label style={styles.fieldLabel}>Default cost ($)</label>
                <input style={styles.input} type="number" min="0" step="0.01" value={defaultCost} onChange={(e) => setDefaultCost(e.target.value)} placeholder="for margin score" />
              </div>
            </div>
            <div style={styles.buttonRow}>
              <button
                style={{ ...styles.buttonPrimary, ...(scanLoading ? styles.buttonDisabled : {}) }}
                onClick={runScan}
                disabled={scanLoading}
              >
                {scanLoading ? 'Scanning…' : 'Scan'}
              </button>
              <span style={styles.hint}>Scans existing scout data — no Keepa cost.</span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>Live Scan (Keepa) — Admin</div>
            <div style={styles.cardBody}>
              <label style={styles.fieldLabel}>ASINs (one per line, or comma/space separated — max 50)</label>
              <textarea
                style={styles.textarea}
                value={liveAsins}
                onChange={(e) => setLiveAsins(e.target.value)}
                placeholder="B08N5WRWNW&#10;B0D1234567"
              />
              <div style={styles.filterGrid}>
                <div>
                  <label style={styles.fieldLabel}>Cost per unit ($, optional)</label>
                  <input style={styles.input} type="number" min="0" step="0.01" value={liveCost} onChange={(e) => setLiveCost(e.target.value)} />
                </div>
                <div>
                  <label style={styles.fieldLabel}>Marketplace domain</label>
                  <select style={styles.select} value={liveDomain} onChange={(e) => setLiveDomain(e.target.value)}>
                    <option value="1">US</option>
                    <option value="2">UK</option>
                    <option value="3">DE</option>
                    <option value="4">FR</option>
                    <option value="5">JP</option>
                    <option value="6">CA</option>
                  </select>
                </div>
              </div>
              <div style={styles.buttonRow}>
                <button
                  style={{ ...styles.buttonPrimary, ...(liveLoading ? styles.buttonDisabled : {}) }}
                  onClick={runLiveScan}
                  disabled={liveLoading}
                >
                  {liveLoading ? 'Fetching from Keepa…' : 'Run Live Scan'}
                </button>
                <span style={styles.hint}>Each ASIN ≈ 6 Keepa tokens. Filters above apply post-fetch.</span>
              </div>
            </div>
          </div>
        )}

        <div style={styles.card}>
          <div style={styles.cardTitle}>Ranked Opportunities</div>
          {results.length === 0 ? (
            <div style={styles.noData}>
              {scanLoading ? 'Scanning…' : 'No results. Adjust filters or run a Live Scan to pull fresh Keepa data.'}
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead style={styles.thead}>
                  <tr>
                    <th style={styles.th}>ASIN</th>
                    <th style={styles.th}>Title</th>
                    <th style={styles.th}>Category</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>BSR</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Mo. Sales</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Price</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>FBA Sellers</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Velocity</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Compete</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Margin</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Composite</th>
                    <th style={styles.th}>Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.asin}>
                      <td style={styles.td}>
                        <a href={r.amazon_url} target="_blank" rel="noreferrer" style={styles.asinLink}>{r.asin}</a>
                      </td>
                      <td style={{ ...styles.td, maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.title || ''}>
                        {r.title || '—'}
                      </td>
                      <td style={styles.td}>{r.category || '—'}</td>
                      <td style={styles.tdNum}>{(r.bsr || 0).toLocaleString()}</td>
                      <td style={styles.tdNum}>{(r.monthly_sales || 0).toLocaleString()}</td>
                      <td style={styles.tdNum}>${(r.current_price || 0).toLocaleString()}</td>
                      <td style={styles.tdNum}>{(r.fba_sellers || 0).toLocaleString()}</td>
                      <td style={styles.tdNum}>{(r.velocity_score || 0).toLocaleString()}</td>
                      <td style={styles.tdNum}>{(r.competition_score || 0).toLocaleString()}</td>
                      <td style={styles.tdNum}>
                        {(r.margin_score || 0).toLocaleString()}
                        {r.margin_estimated && <span style={styles.estimatedBadge} title="Margin estimated from price volatility because no COGS was provided">est.</span>}
                      </td>
                      <td style={{ ...styles.tdNum, ...styles.scoreCell }}>{(r.composite || 0).toLocaleString()}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.tierBadge, ...(TIER_STYLE[r.tier] || styles.tierSkip) }}>{r.tier}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
