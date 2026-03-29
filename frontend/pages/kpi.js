import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const styles = {
  outerContainer: { display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' },
  container: { flex: 1, marginLeft: '250px', padding: '32px', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  pageTitle: { fontSize: '32px', fontWeight: '600', marginBottom: '24px' },
  sectionTitle: { fontSize: '18px', fontWeight: '600', marginTop: '32px', marginBottom: '16px', color: '#FFFFFF' },

  // KPI Cards
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' },
  kpiCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s ease', ':hover': { borderColor: '#FFD700' } },
  kpiLabel: { fontSize: '12px', color: '#AAAAAA', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  kpiValue: { fontSize: '32px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' },
  kpiTrend: { fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' },
  trendUp: { color: '#4ADE80' },
  trendDown: { color: '#EF4444' },

  // Timeframe Selector
  timeframeContainer: { display: 'flex', gap: '8px', marginBottom: '32px', alignItems: 'center' },
  timeframeBtn: (active) => ({
    padding: '8px 16px',
    backgroundColor: active ? '#FFD700' : '#111111',
    color: active ? '#000000' : '#FFFFFF',
    border: active ? 'none' : '1px solid #1E1E1E',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: active ? '600' : '500',
    transition: 'all 0.2s ease'
  }),
  dateRangeInput: { padding: '8px 12px', backgroundColor: '#111111', color: '#FFFFFF', border: '1px solid #1E1E1E', borderRadius: '6px', fontSize: '13px' },

  // Charts
  chartSection: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' },
  chartCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' },
  chartTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: '#FFFFFF' },

  // Scorecard Table
  tableCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', marginBottom: '32px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '1px solid #1E1E1E', fontSize: '12px', fontWeight: '600', color: '#AAAAAA', textTransform: 'uppercase' },
  td: { padding: '12px', borderBottom: '1px solid #1E1E1E', fontSize: '14px', color: '#FFFFFF' },
  statusBadge: (status) => {
    let bgColor = '#FFD700';
    let textColor = '#000000';
    if (status === 'On Track') { bgColor = '#4ADE80'; textColor = '#000000'; }
    else if (status === 'At Risk') { bgColor = '#FBBF24'; textColor = '#000000'; }
    else if (status === 'Behind') { bgColor = '#EF4444'; textColor = '#FFFFFF'; }
    return { backgroundColor: bgColor, color: textColor, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', display: 'inline-block' };
  },

  // Department Scores
  departmentGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' },
  departmentCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', textAlign: 'center' },
  departmentName: { fontSize: '14px', fontWeight: '600', marginTop: '16px', color: '#FFFFFF' },
  departmentScore: { fontSize: '24px', fontWeight: '700', color: '#FFD700', marginTop: '8px' },
};

export default function KPIPage() {
  const [timeframe, setTimeframe] = useState('30D');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [kpiData, setKpiData] = useState(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('ecomera_token') : '';
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token) {
      fetchKPIData();
    }
  }, [timeframe, token]);

  const fetchKPIData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/kpi?timeframe=${timeframe}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setKpiData(data);
      }
    } catch (error) {
      console.error('Error fetching KPI data:', error);
    }
    setLoading(false);
  };

  const mockKPICards = [
    { label: 'Revenue', value: '$145,230', trend: '+12.5%', isUp: true },
    { label: 'Profit', value: '$32,450', trend: '+8.2%', isUp: true },
    { label: 'Orders', value: '2,340', trend: '-2.1%', isUp: false },
    { label: 'Units Sold', value: '8,923', trend: '+18.7%', isUp: true },
    { label: 'ROI %', value: '312%', trend: '+5.3%', isUp: true },
    { label: 'ACOS %', value: '28.4%', trend: '-3.2%', isUp: true },
  ];

  const mockMetrics = [
    { metric: 'ACOS', target: '25%', actual: '28.4%', status: 'At Risk', trend: '+3.4%' },
    { metric: 'TACoS', target: '35%', actual: '32.1%', status: 'On Track', trend: '-1.2%' },
    { metric: 'BSR Average', target: '#5000', actual: '#4,230', status: 'On Track', trend: '+15%' },
    { metric: 'Return Rate', target: '2%', actual: '2.3%', status: 'At Risk', trend: '+0.3%' },
    { metric: 'Buy Box %', target: '95%', actual: '91.2%', status: 'Behind', trend: '-3.8%' },
    { metric: 'Session Rate', target: '3.5%', actual: '3.2%', status: 'At Risk', trend: '-0.3%' },
    { metric: 'Conversion Rate', target: '8%', actual: '7.4%', status: 'On Track', trend: '-0.6%' },
    { metric: 'Gross Margin', target: '45%', actual: '43.2%', status: 'At Risk', trend: '-1.8%' },
    { metric: 'Ad Spend', target: '$8000', actual: '$8,450', status: 'At Risk', trend: '+5.6%' },
    { metric: 'Inventory Turnover', target: '4.5x', actual: '4.2x', status: 'At Risk', trend: '-6.7%' },
    { metric: 'Net Profit Margin', target: '22%', actual: '19.8%', status: 'Behind', trend: '-2.2%' },
    { metric: 'Customer Satisfaction', target: '4.8', actual: '4.6', status: 'On Track', trend: '-0.2' },
  ];

  const mockDepartmentScores = [
    { name: 'Wholesale', score: 87 },
    { name: 'PL', score: 76 },
    { name: 'PPC', score: 92 },
    { name: 'Operations', score: 81 },
  ];

  const departmentScoreTotal = mockDepartmentScores.reduce((sum, d) => sum + d.score, 0) / mockDepartmentScores.length;

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <h1 style={styles.pageTitle}>KPI Dashboard</h1>

        {/* Timeframe Selector */}
        <div style={styles.timeframeContainer}>
          <span style={{ fontSize: '13px', color: '#AAAAAA', marginRight: '8px' }}>Timeframe:</span>
          {['7D', '30D', '90D', 'YTD'].map((tf) => (
            <button
              key={tf}
              style={styles.timeframeBtn(timeframe === tf)}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
          <span style={{ marginLeft: '16px', fontSize: '13px', color: '#AAAAAA' }}>Custom:</span>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            style={{ ...styles.dateRangeInput, marginLeft: '8px' }}
          />
          <span style={{ margin: '0 8px', color: '#AAAAAA' }}>to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            style={styles.dateRangeInput}
          />
        </div>

        {/* KPI Cards */}
        <div style={styles.kpiGrid}>
          {mockKPICards.map((kpi, idx) => (
            <div key={idx} style={styles.kpiCard}>
              <div style={styles.kpiLabel}>{kpi.label}</div>
              <div style={styles.kpiValue}>
                {kpi.value}
                <span style={kpi.isUp ? styles.trendUp : styles.trendDown}>
                  {kpi.isUp ? '↑' : '↓'} {kpi.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div style={styles.chartSection}>
          {/* Revenue vs Profit Chart */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Revenue vs Profit Trend</h3>
            <svg width="100%" height="250" viewBox="0 0 400 250" style={{ backgroundColor: '#0A0A0A', borderRadius: '6px' }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFD700" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="profitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g>
                {/* Grid lines */}
                {[0, 50, 100, 150, 200].map((y) => (
                  <line key={`hline-${y}`} x1="40" y1={y} x2="390" y2={y} stroke="#1E1E1E" strokeWidth="1" />
                ))}
                {[0, 50, 100, 150, 200, 250, 300, 350, 400].map((x) => (
                  <line key={`vline-${x}`} x1={x} y1="0" x2={x} y2="200" stroke="#1E1E1E" strokeWidth="1" />
                ))}

                {/* Revenue line (gold) */}
                <polyline
                  points="40,160 70,140 100,130 130,110 160,95 190,85 220,75 250,80 280,70 310,60 340,55 370,50"
                  stroke="#FFD700"
                  strokeWidth="2"
                  fill="url(#revenueGradient)"
                />

                {/* Profit line (green) */}
                <polyline
                  points="40,180 70,170 100,155 130,145 160,130 190,120 220,110 250,115 280,105 310,95 340,90 370,85"
                  stroke="#4ADE80"
                  strokeWidth="2"
                  fill="url(#profitGradient)"
                />

                {/* Data points */}
                {[40, 70, 100, 130, 160, 190, 220, 250, 280, 310, 340, 370].map((x, i) => (
                  <circle key={`rev-dot-${i}`} cx={x} cy={[160, 140, 130, 110, 95, 85, 75, 80, 70, 60, 55, 50][i]} r="3" fill="#FFD700" />
                ))}
                {[40, 70, 100, 130, 160, 190, 220, 250, 280, 310, 340, 370].map((x, i) => (
                  <circle key={`prof-dot-${i}`} cx={x} cy={[180, 170, 155, 145, 130, 120, 110, 115, 105, 95, 90, 85][i]} r="3" fill="#4ADE80" />
                ))}

                {/* Axes */}
                <line x1="40" y1="200" x2="390" y2="200" stroke="#1E1E1E" strokeWidth="1" />
                <line x1="40" y1="0" x2="40" y2="200" stroke="#1E1E1E" strokeWidth="1" />

                {/* Legend */}
                <circle cx="260" cy="15" r="3" fill="#FFD700" />
                <text x="270" y="20" fontSize="11" fill="#AAAAAA">Revenue</text>
                <circle cx="340" cy="15" r="3" fill="#4ADE80" />
                <text x="350" y="20" fontSize="11" fill="#AAAAAA">Profit</text>
              </g>
            </svg>
          </div>

          {/* Orders Per Day Chart */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Orders Per Day</h3>
            <svg width="100%" height="250" viewBox="0 0 400 250" style={{ backgroundColor: '#0A0A0A', borderRadius: '6px' }}>
              <defs>
                <linearGradient id="ordersGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFD700" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#FFD700" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <g>
                {/* Grid lines */}
                {[0, 50, 100, 150, 200].map((y) => (
                  <line key={`hline-${y}`} x1="40" y1={y} x2="390" y2={y} stroke="#1E1E1E" strokeWidth="1" />
                ))}
                {/* Bars */}
                {[45, 60, 55, 75, 85, 70, 65, 80, 90, 72, 68, 78].map((height, i) => {
                  const x = 50 + i * 28;
                  const y = 200 - height;
                  return (
                    <g key={`bar-${i}`}>
                      <rect x={x} y={y} width="22" height={height} fill="#FFD700" opacity="0.8" rx="3" />
                      <text x={x + 11} y="220" fontSize="10" fill="#AAAAAA" textAnchor="middle">{i + 1}</text>
                    </g>
                  );
                })}
                {/* Axes */}
                <line x1="40" y1="200" x2="390" y2="200" stroke="#1E1E1E" strokeWidth="1" />
                <line x1="40" y1="0" x2="40" y2="200" stroke="#1E1E1E" strokeWidth="1" />
              </g>
            </svg>
          </div>
        </div>

        {/* Category Performance Chart */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Category Performance</h3>
          <svg width="100%" height="180" viewBox="0 0 500 180" style={{ backgroundColor: '#0A0A0A', borderRadius: '6px' }}>
            <g>
              {/* Electronics */}
              <text x="10" y="25" fontSize="12" fill="#AAAAAA" fontWeight="500">Electronics</text>
              <rect x="150" y="12" width="280" height="20" fill="#111111" stroke="#1E1E1E" strokeWidth="1" rx="4" />
              <rect x="150" y="12" width={280 * 0.85} height="20" fill="#FFD700" rx="4" />
              <text x="450" y="27" fontSize="12" fill="#AAAAAA" fontWeight="600">85%</text>

              {/* Home & Garden */}
              <text x="10" y="70" fontSize="12" fill="#AAAAAA" fontWeight="500">Home & Garden</text>
              <rect x="150" y="57" width="280" height="20" fill="#111111" stroke="#1E1E1E" strokeWidth="1" rx="4" />
              <rect x="150" y="57" width={280 * 0.72} height="20" fill="#FFD700" rx="4" />
              <text x="450" y="72" fontSize="12" fill="#AAAAAA" fontWeight="600">72%</text>

              {/* Sports & Outdoors */}
              <text x="10" y="115" fontSize="12" fill="#AAAAAA" fontWeight="500">Sports & Outdoors</text>
              <rect x="150" y="102" width="280" height="20" fill="#111111" stroke="#1E1E1E" strokeWidth="1" rx="4" />
              <rect x="150" y="102" width={280 * 0.65} height="20" fill="#FFD700" rx="4" />
              <text x="450" y="117" fontSize="12" fill="#AAAAAA" fontWeight="600">65%</text>

              {/* Beauty & Personal Care */}
              <text x="10" y="160" fontSize="12" fill="#AAAAAA" fontWeight="500">Beauty & Care</text>
              <rect x="150" y="147" width="280" height="20" fill="#111111" stroke="#1E1E1E" strokeWidth="1" rx="4" />
              <rect x="150" y="147" width={280 * 0.78} height="20" fill="#FFD700" rx="4" />
              <text x="450" y="162" fontSize="12" fill="#AAAAAA" fontWeight="600">78%</text>
            </g>
          </svg>
        </div>

        {/* ROI by Client Donut Chart */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>ROI by Client</h3>
          <svg width="100%" height="220" viewBox="0 0 400 220" style={{ backgroundColor: '#0A0A0A', borderRadius: '6px' }}>
            <g>
              {/* Donut segments */}
              <circle cx="120" cy="100" r="60" fill="none" stroke="#FFD700" strokeWidth="20" strokeDasharray="113.1 376.99" strokeDashoffset="0" />
              <circle cx="120" cy="100" r="60" fill="none" stroke="#4ADE80" strokeWidth="20" strokeDasharray="94.25 376.99" strokeDashoffset="-113.1" />
              <circle cx="120" cy="100" r="60" fill="none" stroke="#3B82F6" strokeWidth="20" strokeDasharray="88.8 376.99" strokeDashoffset="-207.35" />
              <circle cx="120" cy="100" r="60" fill="none" stroke="#F59E0B" strokeWidth="20" strokeDasharray="80.84 376.99" strokeDashoffset="-296.15" />

              {/* Center circle */}
              <circle cx="120" cy="100" r="35" fill="#0A0A0A" />
              <text x="120" y="105" fontSize="20" fontWeight="700" fill="#FFD700" textAnchor="middle">312%</text>

              {/* Legend */}
              <rect x="220" y="20" width="12" height="12" fill="#FFD700" rx="2" />
              <text x="240" y="28" fontSize="12" fill="#AAAAAA">Client A (30%)</text>

              <rect x="220" y="45" width="12" height="12" fill="#4ADE80" rx="2" />
              <text x="240" y="53" fontSize="12" fill="#AAAAAA">Client B (25%)</text>

              <rect x="220" y="70" width="12" height="12" fill="#3B82F6" rx="2" />
              <text x="240" y="78" fontSize="12" fill="#AAAAAA">Client C (24%)</text>

              <rect x="220" y="95" width="12" height="12" fill="#F59E0B" rx="2" />
              <text x="240" y="103" fontSize="12" fill="#AAAAAA">Client D (21%)</text>

              <text x="220" y="140" fontSize="11" fill="#AAAAAA">Total ROI: $145.2K</text>
              <text x="220" y="160" fontSize="11" fill="#AAAAAA">Avg per Client: $36.3K</text>
            </g>
          </svg>
        </div>

        {/* Scorecard Metrics Table */}
        <div style={styles.tableCard}>
          <h2 style={styles.sectionTitle}>Performance Scorecard</h2>
          <table style={styles.table}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1E1E1E' }}>
                <th style={styles.th}>Metric</th>
                <th style={styles.th}>Target</th>
                <th style={styles.th}>Actual</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {mockMetrics.map((m, idx) => (
                <tr key={idx} style={{ ':hover': { backgroundColor: '#1A1A1A' } }}>
                  <td style={styles.td}>{m.metric}</td>
                  <td style={styles.td}>{m.target}</td>
                  <td style={styles.td}>{m.actual}</td>
                  <td style={styles.td}>
                    <span style={styles.statusBadge(m.status)}>{m.status}</span>
                  </td>
                  <td style={{ ...styles.td, color: m.trend.startsWith('+') ? '#EF4444' : '#4ADE80' }}>
                    {m.trend.startsWith('+') ? '↓' : '↑'} {m.trend}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Department Scores */}
        <h2 style={styles.sectionTitle}>Department Performance Scores</h2>
        <div style={styles.departmentGrid}>
          {mockDepartmentScores.map((dept, idx) => {
            const circumference = 2 * Math.PI * 45;
            const strokeDashoffset = circumference - (dept.score / 100) * circumference;
            return (
              <div key={idx} style={styles.departmentCard}>
                <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto' }}>
                  <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                    {/* Background circle */}
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#1E1E1E" strokeWidth="8" />
                    {/* Progress circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="45"
                      fill="none"
                      stroke="#FFD700"
                      strokeWidth="8"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      style={{ transition: 'all 0.3s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFD700' }}>{dept.score}</div>
                    <div style={{ fontSize: '10px', color: '#AAAAAA' }}>/ 100</div>
                  </div>
                </div>
                <div style={styles.departmentName}>{dept.name}</div>
                <div style={styles.departmentScore}>{dept.score}%</div>
              </div>
            );
          })}
        </div>

        {/* Overall Score */}
        <div style={{ ...styles.chartCard, marginTop: '32px', textAlign: 'center' }}>
          <h3 style={styles.chartTitle}>Overall Performance Score</h3>
          <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto' }}>
            <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="100" cy="100" r="80" fill="none" stroke="#1E1E1E" strokeWidth="12" />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#FFD700"
                strokeWidth="12"
                strokeDasharray={`${(departmentScoreTotal / 100) * 502.65} 502.65`}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: '700', color: '#FFD700' }}>{Math.round(departmentScoreTotal)}</div>
              <div style={{ fontSize: '14px', color: '#AAAAAA' }}>/ 100</div>
            </div>
          </div>
          <p style={{ marginTop: '20px', color: '#AAAAAA', fontSize: '14px' }}>Based on Wholesale, PL, PPC, and Operations performance</p>
        </div>
      </div>
    </div>
  );
}
