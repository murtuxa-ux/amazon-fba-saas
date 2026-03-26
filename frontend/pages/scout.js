import { useState, useEffect, useRef, Component } from 'react';
import Sidebar from '../components/Sidebar';

/* ── Error Boundary (prevents full page crash) ─────────────────────────── */
class ScoutErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#EF4444', background: '#111', borderRadius: '12px', margin: '1rem' }}>
          <h3 style={{ marginBottom: '8px' }}>Something went wrong rendering scout data.</h3>
          <p style={{ color: '#888', fontSize: '13px' }}>{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '12px', background: '#FFD700', color: '#000', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 700 }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

const token = () => typeof window !== "undefined" ? localStorage.getItem("ecomera_token") : null;
const authHeader = () => ({
  headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" }
});

/* ── Safe number helpers (prevent crashes on unexpected types) ──────────── */
const safeNum = (v) => { const n = Number(v); return isNaN(n) ? null : n; };
const safeFix = (v, d) => { const n = safeNum(v); return n != null ? n.toFixed(d) : 'N/A'; };
const safeLoc = (v) => { const n = safeNum(v); return n != null ? n.toLocaleString() : 'N/A'; };

/* ── Score Gauge SVG ─────────────────────────────────────────────────────── */
function ScoreGauge({ score, size = 180 }) {
  const radius = (size - 20) / 2;
  const circumference = Math.PI * radius; // half-circle
  const pct = Math.min(100, Math.max(0, score || 0)) / 100;
  const offset = circumference * (1 - pct);
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#FFD700' : '#EF4444';

  return (
    <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
      {/* Background arc */}
      <path
        d={`M 10,${size / 2 + 10} A ${radius},${radius} 0 0 1 ${size - 10},${size / 2 + 10}`}
        fill="none" stroke="#1E1E1E" strokeWidth="12" strokeLinecap="round"
      />
      {/* Score arc */}
      <path
        d={`M 10,${size / 2 + 10} A ${radius},${radius} 0 0 1 ${size - 10},${size / 2 + 10}`}
        fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      {/* Score text */}
      <text x={size / 2} y={size / 2} textAnchor="middle" fill={color}
        fontSize="36" fontWeight="800">{score != null ? score : '—'}</text>
      <text x={size / 2} y={size / 2 + 22} textAnchor="middle" fill="#888"
        fontSize="13" fontWeight="500">FBA SCORE</text>
    </svg>
  );
}

/* ── Dimension Bar ───────────────────────────────────────────────────────── */
function DimensionBar({ label, value, max }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = pct >= 75 ? '#10B981' : pct >= 50 ? '#FFD700' : '#EF4444';
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#CCC', fontSize: '13px' }}>{label}</span>
        <span style={{ color, fontSize: '13px', fontWeight: 700 }}>{value}/{max}</span>
      </div>
      <div style={{ width: '100%', height: '8px', background: '#1E1E1E', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color,
          borderRadius: '4px', transition: 'width 0.8s ease'
        }} />
      </div>
    </div>
  );
}

/* ── Verdict Badge ───────────────────────────────────────────────────────── */
function VerdictBadge({ verdict }) {
  const cfg = {
    Winner: { bg: '#10B981', text: '#FFF', icon: '✓', desc: 'Strong buy signal — this product meets all key FBA criteria.' },
    Maybe:  { bg: '#FFD700', text: '#000', icon: '?', desc: 'Proceed with caution — test with a small order first.' },
    Skip:   { bg: '#EF4444', text: '#FFF', icon: '✗', desc: 'Not recommended — high risk or low profitability.' },
  }[verdict] || { bg: '#555', text: '#FFF', icon: '—', desc: '' };

  return (
    <div style={{
      background: `${cfg.bg}15`, border: `2px solid ${cfg.bg}`, borderRadius: '12px',
      padding: '20px', textAlign: 'center'
    }}>
      <div style={{
        width: '56px', height: '56px', borderRadius: '50%', background: cfg.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 12px', fontSize: '28px', color: cfg.text, fontWeight: 800
      }}>{cfg.icon}</div>
      <div style={{ color: cfg.bg, fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>{verdict}</div>
      <div style={{ color: '#AAA', fontSize: '13px', lineHeight: '1.5' }}>{cfg.desc}</div>
    </div>
  );
}

/* ── Main Scout Page ─────────────────────────────────────────────────────── */
export default function Scout() {
  // Form state
  const [asin, setAsin] = useState('');
  const [domain, setDomain] = useState(1);
  const [costPrice, setCostPrice] = useState('');
  const [shippingCost, setShippingCost] = useState('');

  // Lookup state
  const [lookupData, setLookupData] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // Scout state
  const [scoutResult, setScoutResult] = useState(null);
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutError, setScoutError] = useState('');

  // History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Bulk
  const [bulkAsins, setBulkAsins] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);

  // Active tab
  const [tab, setTab] = useState('single'); // single | bulk | history

  const resultRef = useRef(null);

  useEffect(() => { fetchHistory(); }, []);

  /* ── Fetch History ──────────────────────────────────────────────────── */
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_URL}/scout`, authHeader());
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      setHistory(data.results || []);
    } catch (err) {
      console.error('History error:', err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  /* ── ASIN Lookup (Keepa) ────────────────────────────────────────────── */
  const handleLookup = async () => {
    if (!asin.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupData(null);
    setScoutResult(null);
    try {
      const res = await fetch(`${API_URL}/scout/lookup`, {
        method: 'POST',
        ...authHeader(),
        body: JSON.stringify({ asin: asin.trim().toUpperCase(), domain }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Lookup failed');
      }
      const data = await res.json();
      setLookupData(data);
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setLookupLoading(false);
    }
  };

  /* ── Scout Product (Save to DB) ─────────────────────────────────────── */
  const handleScout = async () => {
    if (!lookupData) return;
    setScoutLoading(true);
    setScoutError('');
    try {
      const body = {
        asin: lookupData.asin,
        domain,
      };
      if (costPrice) body.cost_price = parseFloat(costPrice);
      if (shippingCost) body.shipping_cost = parseFloat(shippingCost);

      const res = await fetch(`${API_URL}/scout`, {
        method: 'POST',
        ...authHeader(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Scout failed');
      }
      const data = await res.json();
      setScoutResult(data);
      fetchHistory(); // refresh history
      // Scroll to results
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (err) {
      setScoutError(err.message);
    } finally {
      setScoutLoading(false);
    }
  };

  /* ── Bulk Scout ─────────────────────────────────────────────────────── */
  const handleBulk = async () => {
    const asins = bulkAsins.split(/[\n,]+/).map(a => a.trim().toUpperCase()).filter(Boolean);
    if (asins.length === 0) return;
    setBulkLoading(true);
    setBulkResults(null);
    try {
      const res = await fetch(`${API_URL}/scout/bulk`, {
        method: 'POST',
        ...authHeader(),
        body: JSON.stringify({ asins, domain }),
      });
      if (!res.ok) throw new Error('Bulk scout failed');
      const data = await res.json();
      setBulkResults(data);
      fetchHistory();
    } catch (err) {
      console.error('Bulk error:', err);
    } finally {
      setBulkLoading(false);
    }
  };

  const getVerdictColor = (v) => v === 'Winner' ? '#10B981' : v === 'Maybe' ? '#FFD700' : '#EF4444';
  const getScoreColor = (s) => s >= 80 ? '#10B981' : s >= 60 ? '#FFD700' : '#EF4444';

  const domains = [
    { value: 1, label: 'Amazon.com (US)' },
    { value: 2, label: 'Amazon.co.uk (UK)' },
    { value: 3, label: 'Amazon.de (DE)' },
    { value: 4, label: 'Amazon.fr (FR)' },
    { value: 5, label: 'Amazon.co.jp (JP)' },
    { value: 6, label: 'Amazon.ca (CA)' },
    { value: 9, label: 'Amazon.in (IN)' },
    { value: 10, label: 'Amazon.it (IT)' },
    { value: 11, label: 'Amazon.es (ES)' },
  ];

  /* ── Styles ─────────────────────────────────────────────────────────── */
  const cardStyle = {
    background: '#111111', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '1.5rem',
  };
  const inputStyle = {
    background: '#0A0A0A', border: '1px solid #1E1E1E', color: '#FFF', borderRadius: '8px',
    padding: '10px 14px', fontSize: '14px', width: '100%', outline: 'none',
  };
  const btnPrimary = {
    background: '#FFD700', color: '#000', border: 'none', borderRadius: '8px',
    padding: '12px 24px', fontWeight: 700, cursor: 'pointer', fontSize: '14px',
    transition: 'all 0.2s ease',
  };
  const btnSecondary = {
    background: 'transparent', color: '#FFD700', border: '1px solid #FFD700', borderRadius: '8px',
    padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: '13px',
  };
  const tabStyle = (active) => ({
    padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600,
    fontSize: '14px', transition: 'all 0.2s ease',
    background: active ? '#FFD700' : '#1E1E1E',
    color: active ? '#000' : '#888',
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0A0A" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem", maxWidth: '1200px' }}>
      <ScoutErrorBoundary>
        <h1 style={{ color: "#FFFFFF", marginBottom: "0.5rem", fontSize: "2rem", fontWeight: 800 }}>
          FBA Product Scout
        </h1>
        <p style={{ color: '#888', marginBottom: '1.5rem', fontSize: '14px' }}>
          Enter an ASIN to auto-fetch product data from Keepa and get AI-powered FBA analysis
        </p>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem' }}>
          <button style={tabStyle(tab === 'single')} onClick={() => setTab('single')}>Single Scout</button>
          <button style={tabStyle(tab === 'bulk')} onClick={() => setTab('bulk')}>Bulk Scout</button>
          <button style={tabStyle(tab === 'history')} onClick={() => setTab('history')}>Scout History</button>
        </div>

        {/* ═══════════ SINGLE SCOUT TAB ═══════════ */}
        {tab === 'single' && (
          <>
            {/* ASIN Input Section */}
            <div style={cardStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>ASIN</label>
                  <input
                    style={inputStyle}
                    placeholder="Enter ASIN (e.g. B08N5WRWNW)"
                    value={asin}
                    onChange={(e) => setAsin(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  />
                </div>
                <div>
                  <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Marketplace</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer', minWidth: '180px' }}
                    value={domain}
                    onChange={(e) => setDomain(parseInt(e.target.value))}
                  >
                    {domains.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  style={{ ...btnPrimary, opacity: lookupLoading || !asin.trim() ? 0.6 : 1 }}
                  onClick={handleLookup}
                  disabled={lookupLoading || !asin.trim()}
                >
                  {lookupLoading ? 'Looking up...' : 'Lookup ASIN'}
                </button>
              </div>

              {lookupError && (
                <div style={{
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#EF4444', padding: '10px 14px', borderRadius: '8px', marginTop: '12px', fontSize: '13px'
                }}>
                  {lookupError}
                </div>
              )}
            </div>

            {/* Auto-populated Product Data */}
            {lookupData && (
              <div style={{ ...cardStyle, marginTop: '1rem' }}>
                <h3 style={{ color: '#FFD700', fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>
                  Product Data (from Keepa)
                </h3>

                {/* Title + Brand */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: '#FFF', fontSize: '15px', fontWeight: 600, lineHeight: '1.4' }}>
                    {lookupData.title || 'N/A'}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {lookupData.brand && (
                      <span style={{ background: '#1E1E1E', color: '#CCC', padding: '3px 10px', borderRadius: '6px', fontSize: '12px' }}>
                        {lookupData.brand}
                      </span>
                    )}
                    {lookupData.category && (
                      <span style={{ background: '#1E1E1E', color: '#CCC', padding: '3px 10px', borderRadius: '6px', fontSize: '12px' }}>
                        {lookupData.category}
                      </span>
                    )}
                    <a
                      href={lookupData.amazon_url || `https://www.amazon.com/dp/${lookupData.asin}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: '#FFD700', fontSize: '12px', textDecoration: 'underline' }}
                    >
                      View on Amazon
                    </a>
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '12px', marginBottom: '16px'
                }}>
                  {(() => { const fs = safeNum(lookupData.fba_sellers); const pv = safeNum(lookupData.price_volatility_pct); return [
                    { label: 'BSR', value: safeLoc(lookupData.bsr), color: '#FFF' },
                    { label: 'Monthly Sales', value: safeLoc(lookupData.monthly_sales), color: '#10B981' },
                    { label: 'Current Price', value: safeNum(lookupData.current_price) != null ? `$${safeFix(lookupData.current_price, 2)}` : 'N/A', color: '#FFF' },
                    { label: 'FBA Sellers', value: fs != null ? fs : 'N/A', color: fs != null && fs <= 3 ? '#10B981' : fs != null && fs <= 6 ? '#FFD700' : '#EF4444' },
                    { label: 'Total Sellers', value: safeNum(lookupData.total_sellers) != null ? lookupData.total_sellers : 'N/A', color: '#FFF' },
                    { label: 'Reviews', value: safeLoc(lookupData.reviews), color: '#FFF' },
                    { label: 'Rating', value: safeNum(lookupData.rating) != null ? `${lookupData.rating} ★` : 'N/A', color: '#FFD700' },
                    { label: 'Price Volatility', value: pv != null ? `${safeFix(lookupData.price_volatility_pct, 1)}%` : 'N/A', color: pv != null && pv <= 10 ? '#10B981' : '#EF4444' },
                  ]; })().map((s, i) => (
                    <div key={i} style={{ background: '#0A0A0A', borderRadius: '8px', padding: '12px' }}>
                      <span style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '4px' }}>{s.label}</span>
                      <span style={{ color: s.color, fontSize: '16px', fontWeight: 700 }}>{s.value}</span>
                    </div>
                  ))}
                </div>

                {/* Price History */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px'
                }}>
                  <div style={{ background: '#0A0A0A', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <span style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '4px' }}>90-Day Avg</span>
                    <span style={{ color: '#FFF', fontSize: '16px', fontWeight: 700 }}>
                      {safeNum(lookupData.avg_price_90d) != null ? `$${safeFix(lookupData.avg_price_90d, 2)}` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ background: '#0A0A0A', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <span style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '4px' }}>90-Day Min</span>
                    <span style={{ color: '#EF4444', fontSize: '16px', fontWeight: 700 }}>
                      {safeNum(lookupData.min_price_90d) != null ? `$${safeFix(lookupData.min_price_90d, 2)}` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ background: '#0A0A0A', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <span style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '4px' }}>90-Day Max</span>
                    <span style={{ color: '#10B981', fontSize: '16px', fontWeight: 700 }}>
                      {safeNum(lookupData.max_price_90d) != null ? `$${safeFix(lookupData.max_price_90d, 2)}` : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Pre-computed Score Preview */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
                  padding: '16px', background: '#0A0A0A', borderRadius: '8px', marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <ScoreGauge score={lookupData.fba_score} size={160} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <VerdictBadge verdict={lookupData.verdict || 'Skip'} />
                  </div>
                </div>

                {/* Score Breakdown */}
                {lookupData.score_breakdown && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ color: '#CCC', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
                      Score Breakdown
                    </h4>
                    <DimensionBar label="BSR Rank" value={lookupData.score_breakdown.bsr || 0} max={30} />
                    <DimensionBar label="Sales Velocity" value={lookupData.score_breakdown.sales_velocity || 0} max={20} />
                    <DimensionBar label="Price Stability" value={lookupData.score_breakdown.price_stability || 0} max={20} />
                    <DimensionBar label="Competition" value={lookupData.score_breakdown.competition || 0} max={20} />
                    <DimensionBar label="Price Point" value={lookupData.score_breakdown.price_point || 0} max={10} />
                  </div>
                )}

                {/* Cost + Shipping Inputs for Profit Calc */}
                <div style={{
                  padding: '16px', background: '#0A0A0A', borderRadius: '8px', marginBottom: '16px'
                }}>
                  <h4 style={{ color: '#FFD700', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
                    Profit Calculator (optional)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Cost Price ($)</label>
                      <input style={inputStyle} type="number" step="0.01" placeholder="e.g. 8.50"
                        value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Shipping Cost ($)</label>
                      <input style={inputStyle} type="number" step="0.01" placeholder="e.g. 2.00"
                        value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
                    </div>
                  </div>

                  {/* Show profit preview from lookup data if available */}
                  {safeNum(lookupData.net_profit) != null && (
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '12px'
                    }}>
                      {[
                        { label: 'Referral Fee', val: `$${safeFix(lookupData.referral_fee || 0, 2)}`, c: '#EF4444' },
                        { label: 'Total Fees', val: `$${safeFix(lookupData.total_fees || 0, 2)}`, c: '#EF4444' },
                        { label: 'Net Profit', val: `$${safeFix(lookupData.net_profit || 0, 2)}`, c: safeNum(lookupData.net_profit) > 0 ? '#10B981' : '#EF4444' },
                        { label: 'ROI', val: `${safeFix(lookupData.roi_pct || 0, 1)}%`, c: safeNum(lookupData.roi_pct) >= 30 ? '#10B981' : safeNum(lookupData.roi_pct) >= 15 ? '#FFD700' : '#EF4444' },
                      ].map((m, i) => (
                        <div key={i} style={{ background: '#111111', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                          <span style={{ color: '#888', fontSize: '10px', display: 'block', marginBottom: '2px' }}>{m.label}</span>
                          <span style={{ color: m.c, fontSize: '15px', fontWeight: 700 }}>{m.val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Scout Button */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    style={{ ...btnPrimary, flex: 1, padding: '14px', fontSize: '16px', opacity: scoutLoading ? 0.6 : 1 }}
                    onClick={handleScout}
                    disabled={scoutLoading}
                  >
                    {scoutLoading ? 'Scouting...' : 'Scout Product — Save & Analyze'}
                  </button>
                  <button
                    style={btnSecondary}
                    onClick={() => { setLookupData(null); setScoutResult(null); setAsin(''); setCostPrice(''); setShippingCost(''); }}
                  >
                    Clear
                  </button>
                </div>

                {scoutError && (
                  <div style={{
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#EF4444', padding: '10px 14px', borderRadius: '8px', marginTop: '12px', fontSize: '13px'
                  }}>
                    {scoutError}
                  </div>
                )}
              </div>
            )}

            {/* Scout Result (after saving) */}
            {scoutResult && (
              <div ref={resultRef} style={{ ...cardStyle, marginTop: '1rem', borderColor: '#FFD700' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%', background: '#10B981'
                  }} />
                  <h3 style={{ color: '#10B981', fontSize: '15px', fontWeight: 700, margin: 0 }}>
                    Product Scouted & Saved Successfully
                  </h3>
                </div>
                <p style={{ color: '#888', fontSize: '13px' }}>
                  This product has been saved to your scout history. ASIN: <span style={{ color: '#FFD700' }}>{scoutResult.asin || lookupData?.asin}</span>
                  {scoutResult.fba_score != null && (
                    <> — Score: <span style={{ color: getScoreColor(scoutResult.fba_score), fontWeight: 700 }}>{scoutResult.fba_score}</span></>
                  )}
                  {scoutResult.verdict && (
                    <> — Verdict: <span style={{ color: getVerdictColor(scoutResult.verdict), fontWeight: 700 }}>{scoutResult.verdict}</span></>
                  )}
                </p>
              </div>
            )}
          </>
        )}

        {/* ═══════════ BULK SCOUT TAB ═══════════ */}
        {tab === 'bulk' && (
          <div style={cardStyle}>
            <h3 style={{ color: '#FFD700', fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
              Bulk Scout
            </h3>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '12px' }}>
              Enter multiple ASINs (one per line or comma-separated) to scout them all at once.
            </p>
            <textarea
              style={{ ...inputStyle, height: '120px', resize: 'vertical', fontFamily: 'monospace' }}
              placeholder={"B08N5WRWNW\nB09XYZ1234\nB07ABC5678"}
              value={bulkAsins}
              onChange={(e) => setBulkAsins(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'center' }}>
              <div>
                <label style={{ color: '#888', fontSize: '11px', marginRight: '8px' }}>Marketplace:</label>
                <select
                  style={{ ...inputStyle, width: 'auto', display: 'inline-block', minWidth: '160px' }}
                  value={domain} onChange={(e) => setDomain(parseInt(e.target.value))}
                >
                  {domains.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <button
                style={{ ...btnPrimary, opacity: bulkLoading ? 0.6 : 1 }}
                onClick={handleBulk}
                disabled={bulkLoading}
              >
                {bulkLoading ? 'Scouting...' : 'Scout All'}
              </button>
            </div>

            {bulkResults && (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ color: '#10B981', fontSize: '13px' }}>
                    Scouted: {bulkResults.scouted || 0}
                  </span>
                  {bulkResults.errors?.length > 0 && (
                    <span style={{ color: '#EF4444', fontSize: '13px' }}>
                      Errors: {bulkResults.errors.length}
                    </span>
                  )}
                </div>
                {bulkResults.results && bulkResults.results.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', color: '#FFF', fontSize: '13px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                          <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>ASIN</th>
                          <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Title</th>
                          <th style={{ textAlign: 'right', padding: '10px', color: '#888' }}>Price</th>
                          <th style={{ textAlign: 'right', padding: '10px', color: '#888' }}>Sales</th>
                          <th style={{ textAlign: 'right', padding: '10px', color: '#888' }}>Score</th>
                          <th style={{ textAlign: 'center', padding: '10px', color: '#888' }}>Verdict</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkResults.results.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #1E1E1E' }}>
                            <td style={{ padding: '10px', fontWeight: 600 }}>{r.asin}</td>
                            <td style={{ padding: '10px', color: '#BBB', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.title || '-'}
                            </td>
                            <td style={{ textAlign: 'right', padding: '10px' }}>
                              {safeNum(r.current_price) != null ? `$${safeFix(r.current_price, 2)}` : 'N/A'}
                            </td>
                            <td style={{ textAlign: 'right', padding: '10px', color: '#10B981' }}>
                              {safeLoc(r.monthly_sales || 0)}
                            </td>
                            <td style={{ textAlign: 'right', padding: '10px', color: getScoreColor(safeNum(r.fba_score) || 0), fontWeight: 700 }}>
                              {safeNum(r.fba_score) != null ? r.fba_score : '-'}
                            </td>
                            <td style={{ textAlign: 'center', padding: '10px' }}>
                              <span style={{
                                background: getVerdictColor(r.verdict), padding: '3px 10px', borderRadius: '12px',
                                fontSize: '11px', fontWeight: 700, color: r.verdict === 'Maybe' ? '#000' : '#FFF'
                              }}>
                                {r.verdict || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ HISTORY TAB ═══════════ */}
        {tab === 'history' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#FFD700', fontSize: '15px', fontWeight: 700, margin: 0 }}>
                Scout History
              </h3>
              <button style={btnSecondary} onClick={fetchHistory}>
                Refresh
              </button>
            </div>

            {historyLoading ? (
              <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>Loading history...</div>
            ) : history.length === 0 ? (
              <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
                No scouted products yet. Use Single Scout or Bulk Scout to get started.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', color: '#FFF', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                      <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>ASIN</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Title</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Brand</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Category</th>
                      <th style={{ textAlign: 'right', padding: '10px', color: '#888' }}>BSR</th>
                      <th style={{ textAlign: 'right', padding: '10px', color: '#888' }}>Sales</th>
                      <th style={{ textAlign: 'right', padding: '10px', color: '#888' }}>Price</th>
                      <th style={{ textAlign: 'right', padding: '10px', color: '#888' }}>Score</th>
                      <th style={{ textAlign: 'center', padding: '10px', color: '#888' }}>Verdict</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: '#888' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1E1E1E' }}>
                        <td style={{ padding: '10px', fontWeight: 600 }}>
                          <a href={`https://www.amazon.com/dp/${item.asin}`} target="_blank" rel="noopener noreferrer"
                            style={{ color: '#FFD700', textDecoration: 'none' }}>
                            {item.asin}
                          </a>
                        </td>
                        <td style={{ padding: '10px', color: '#BBB', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title || '-'}
                        </td>
                        <td style={{ padding: '10px', color: '#BBB' }}>{item.brand || '-'}</td>
                        <td style={{ padding: '10px', color: '#BBB' }}>{item.category || '-'}</td>
                        <td style={{ textAlign: 'right', padding: '10px' }}>
                          {safeLoc(item.bsr) !== 'N/A' ? safeLoc(item.bsr) : '-'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px', color: '#10B981' }}>
                          {safeLoc(item.monthly_sales) !== 'N/A' ? safeLoc(item.monthly_sales) : '-'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px' }}>
                          {safeNum(item.current_price) != null ? `$${safeFix(item.current_price, 2)}` : 'N/A'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px', color: getScoreColor(safeNum(item.fba_score) || 0), fontWeight: 700 }}>
                          {safeNum(item.fba_score) != null ? item.fba_score : '-'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px' }}>
                          <span style={{
                            background: getVerdictColor(item.verdict), padding: '3px 10px', borderRadius: '12px',
                            fontSize: '11px', fontWeight: 700, color: item.verdict === 'Maybe' ? '#000' : '#FFF'
                          }}>
                            {item.verdict || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: '#888', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </ScoutErrorBoundary>
      </main>
    </div>
  );
}
