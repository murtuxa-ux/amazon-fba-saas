import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const styles = {
  outerContainer: { display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' },
  container: { flex: 1, marginLeft: '250px', padding: '32px', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  header: { marginBottom: '32px' },
  title: { fontSize: '32px', fontWeight: '700', marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: '#999999' },
  tabContainer: { display: 'flex', gap: '16px', marginBottom: '32px', borderBottom: '1px solid #1E1E1E', paddingBottom: '16px' },
  tab: { padding: '8px 16px', fontSize: '14px', fontWeight: '500', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#999999', transition: 'color 0.2s' },
  tabActive: { color: '#FFD700', borderBottom: '2px solid #FFD700', paddingBottom: '14px' },
  button: { padding: '8px 16px', fontSize: '13px', fontWeight: '500', backgroundColor: '#FFD700', color: '#000000', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.2s' },
  controlsRow: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' },
  filterInput: { padding: '8px 12px', fontSize: '13px', backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '4px', color: '#FFFFFF' },
  categoryCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '16px', marginBottom: '12px', transition: 'border-color 0.2s' },
  categoryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  categoryTitle: { fontSize: '14px', fontWeight: '600' },
  trend: { fontSize: '12px', fontWeight: '500' },
  trendUp: { color: '#90EE90' },
  trendDown: { color: '#FF6B6B' },
  trendFlat: { color: '#FFD700' },
  categoryMetrics: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' },
  metricBox: { backgroundColor: '#0A0A0A', padding: '8px', borderRadius: '4px', border: '1px solid #1E1E1E' },
  metricLabel: { fontSize: '11px', color: '#666666', marginBottom: '4px' },
  metricValue: { fontSize: '14px', fontWeight: '600', color: '#FFFFFF' },
  chartContainer: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '24px', marginBottom: '32px' },
  chartTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '20px' },
  barChart: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '200px', gap: '8px', marginBottom: '16px' },
  barItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  bar: { width: '100%', backgroundColor: '#FFD700', borderRadius: '4px 4px 0 0', transition: 'background-color 0.2s', cursor: 'pointer' },
  barLabel: { fontSize: '11px', color: '#999999', marginTop: '8px', textAlign: 'center', maxWidth: '100%' },
  tableContainer: { overflowX: 'auto', marginBottom: '32px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thead: { backgroundColor: '#111111', borderBottom: '2px solid #1E1E1E' },
  th: { padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#FFFFFF', fontSize: '12px' },
  td: { padding: '12px 16px', borderBottom: '1px solid #1E1E1E', color: '#CCCCCC' },
  trHover: { backgroundColor: '#1A1A1A' },
  trendArrow: { fontSize: '12px', marginLeft: '4px' },
  lineChartContainer: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '24px', marginBottom: '32px', minHeight: '300px' },
  priceHistogram: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '24px', marginBottom: '32px' },
  histogramBars: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '200px', gap: '4px', marginBottom: '16px' },
  histogramBar: { flex: 1, backgroundColor: '#FFD700', borderRadius: '4px 4px 0 0', transition: 'background-color 0.2s', cursor: 'pointer', minHeight: '4px' },
  priceDistLabel: { fontSize: '11px', color: '#999999', marginTop: '4px', textAlign: 'center' },
  noData: { padding: '48px 32px', textAlign: 'center', color: '#666666' },
};

// Mock arrays zeroed during the 2026-05-12 mock-data purge. Real data
// loads from /market/overview, /market/trends, /market/category/{cat}.
const mockCategories = [];
const mockKeywords = [];
const mockPriceData = [];

export default function MarketPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [categories, setCategories] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [priceData, setPriceData] = useState([]);

  // Fetch real market data from the backend. The market_analyzer module
  // exposes /market/overview (categories + bsr / price / reviews / growth)
  // and /market/trends (keywords + price comparisons). Each runs through
  // Keepa data per-org so two orgs see different numbers when both have
  // scout history; empty state otherwise.
  useEffect(() => {
    const token = localStorage.getItem('ecomera_token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.allSettled([
      fetch(`${BASE_URL}/market/overview`, { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${BASE_URL}/market/trends`, { headers }).then((r) => (r.ok ? r.json() : null)),
    ]).then(([overviewRes, trendsRes]) => {
      if (overviewRes.status === 'fulfilled' && overviewRes.value) {
        const d = overviewRes.value;
        setCategories(Array.isArray(d?.categories) ? d.categories : Array.isArray(d) ? d : []);
        setPriceData(Array.isArray(d?.priceData) ? d.priceData : []);
      }
      if (trendsRes.status === 'fulfilled' && trendsRes.value) {
        const d = trendsRes.value;
        setKeywords(Array.isArray(d?.keywords) ? d.keywords : Array.isArray(d) ? d : []);
      }
    });
  }, []);

  const getTrendIcon = (trend) => {
    if (trend === 'up') return '📈';
    if (trend === 'down') return '📉';
    return '→';
  };

  const getTrendColor = (trend) => {
    if (trend === 'up') return styles.trendUp;
    if (trend === 'down') return styles.trendDown;
    return styles.trendFlat;
  };

  const maxBSR = Math.max(...categories.map(c => c.bsr));
  const maxVolume = Math.max(...keywords.map(k => k.volume));

  const renderOverview = () => (
    <div>
      <div style={styles.controlsRow}>
        <span style={{ fontSize: '13px', color: '#999999' }}>Top 10 Categories by Performance</span>
      </div>
      {categories.length > 0 ? (
        <div>
          {categories.map((cat, idx) => (
            <div key={idx} style={styles.categoryCard}>
              <div style={styles.categoryHeader}>
                <span style={styles.categoryTitle}>{cat.name}</span>
                <span style={{ ...styles.trend, ...getTrendColor(cat.growth > 15 ? 'up' : cat.growth < 5 ? 'down' : 'stable') }}>
                  {getTrendIcon(cat.growth > 15 ? 'up' : cat.growth < 5 ? 'down' : 'stable')} {cat.growth}% growth
                </span>
              </div>
              <div style={styles.categoryMetrics}>
                <div style={styles.metricBox}>
                  <div style={styles.metricLabel}>Avg BSR</div>
                  <div style={styles.metricValue}>{cat.bsr.toLocaleString()}</div>
                </div>
                <div style={styles.metricBox}>
                  <div style={styles.metricLabel}>Avg Price</div>
                  <div style={styles.metricValue}>${cat.price.toFixed(2)}</div>
                </div>
                <div style={styles.metricBox}>
                  <div style={styles.metricLabel}>Avg Reviews</div>
                  <div style={styles.metricValue}>⭐ {cat.reviews}</div>
                </div>
                <div style={styles.metricBox}>
                  <div style={styles.metricLabel}>Competition</div>
                  <div style={{ ...styles.metricValue, color: cat.competition === 'High' ? '#FF6B6B' : '#FFD700' }}>{cat.competition}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.noData}>No category data available</div>
      )}

      <div style={styles.chartContainer}>
        <div style={styles.chartTitle}>Market Size by Category</div>
        <div style={styles.barChart}>
          {categories.map((cat, idx) => (
            <div key={idx} style={styles.barItem}>
              <div style={{ ...styles.bar, height: `${(cat.bsr / maxBSR) * 100}%`, opacity: 0.7 + (0.3 * Math.random()) }}></div>
              <div style={styles.barLabel}>{cat.name.split(' ')[0]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTrendAnalysis = () => (
    <div>
      <div style={styles.controlsRow}>
        <span style={{ fontSize: '13px', color: '#999999' }}>Top Keywords Trending Over Last 12 Months</span>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Keyword</th>
              <th style={styles.th}>Search Volume</th>
              <th style={styles.th}>Trend</th>
              <th style={styles.th}>YoY Change</th>
              <th style={styles.th}>Seasonality</th>
            </tr>
          </thead>
          <tbody>
            {keywords.length > 0 ? keywords.map((kw, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : '#0A0A0A' }}>
                <td style={styles.td}>{kw.keyword}</td>
                <td style={styles.td}>{kw.volume.toLocaleString()}</td>
                <td style={{ ...styles.td, ...getTrendColor(kw.trend) }}>
                  {getTrendIcon(kw.trend)} {kw.trend}
                  <span style={styles.trendArrow}></span>
                </td>
                <td style={{ ...styles.td, ...getTrendColor(kw.change > 10 ? 'up' : kw.change < 0 ? 'down' : 'stable') }}>
                  {kw.change > 0 ? '+' : ''}{kw.change}%
                </td>
                <td style={styles.td}>{kw.seasonality}</td>
              </tr>
            )) : null}
          </tbody>
        </table>
      </div>

      <div style={styles.lineChartContainer}>
        <div style={styles.chartTitle}>Top 5 Keyword Trends (12 Months)</div>
        <svg style={{ width: '100%', height: '250px' }} viewBox="0 0 800 250" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#FFD700', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#FFD700', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <line x1="40" y1="210" x2="780" y2="210" stroke="#1E1E1E" strokeWidth="1" />
          <line x1="40" y1="20" x2="40" y2="210" stroke="#1E1E1E" strokeWidth="1" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={`trend-${i}`}>
              <polyline
                points={`${50 + i * 140},${180 - (30 + Math.sin(i * 0.5) * 20)} ${100 + i * 140},${160 - (25 + Math.sin(i * 0.6) * 22)} ${150 + i * 140},${140 - (35 + Math.sin(i * 0.7) * 25)}`}
                fill="none"
                stroke={`hsl(${45 + i * 8}, 100%, 50%)`}
                strokeWidth="2"
              />
            </g>
          ))}
          <text x="20" y="220" style={{ fontSize: '11px', color: '#666666', fill: '#666666' }}>Jan</text>
          <text x="750" y="220" style={{ fontSize: '11px', color: '#666666', fill: '#666666' }}>Dec</text>
        </svg>
      </div>
    </div>
  );

  const renderPriceIntelligence = () => (
    <div>
      <div style={styles.controlsRow}>
        <span style={{ fontSize: '13px', color: '#999999' }}>Your Price vs Market Competitors</span>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Product (ASIN)</th>
              <th style={styles.th}>Your Price</th>
              <th style={styles.th}>Avg Competitor</th>
              <th style={styles.th}>Lowest Price</th>
              <th style={styles.th}>Position</th>
              <th style={styles.th}>Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {priceData.length > 0 ? priceData.map((item, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : '#0A0A0A' }}>
                <td style={styles.td}>
                  <div style={{ fontSize: '11px', color: '#666666', marginBottom: '2px' }}>{item.asin}</div>
                  <div>{item.product}</div>
                </td>
                <td style={{ ...styles.td, color: '#90EE90', fontWeight: '600' }}>${item.yourPrice.toFixed(2)}</td>
                <td style={styles.td}>${item.avgCompetitor.toFixed(2)}</td>
                <td style={styles.td}>${item.lowestPrice.toFixed(2)}</td>
                <td style={styles.td}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    backgroundColor: item.position === 'Excellent' ? '#1E4620' : item.position === 'Good' ? '#4D3E1F' : '#1E1E1E',
                    color: item.position === 'Excellent' ? '#90EE90' : item.position === 'Good' ? '#FFD700' : '#999999'
                  }}>
                    {item.position}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    backgroundColor: '#4D3E1F',
                    color: '#FFD700'
                  }}>
                    {item.action}
                  </span>
                </td>
              </tr>
            )) : null}
          </tbody>
        </table>
      </div>

      <div style={styles.priceHistogram}>
        <div style={styles.chartTitle}>Price Distribution Across Top 5 Products</div>
        <div style={styles.histogramBars}>
          {[10, 15, 20, 25, 30, 35, 40].map((price, idx) => (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ ...styles.histogramBar, height: `${Math.random() * 100}%` }}></div>
              <div style={styles.priceDistLabel}>${price}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Market Intelligence</h1>
          <p style={styles.subtitle}>Real-time market trends and competitive insights</p>
        </div>

        <div style={styles.tabContainer}>
          <button style={{ ...styles.tab, ...(activeTab === 'overview' ? styles.tabActive : {}) }} onClick={() => setActiveTab('overview')}>
            Market Overview
          </button>
          <button style={{ ...styles.tab, ...(activeTab === 'trends' ? styles.tabActive : {}) }} onClick={() => setActiveTab('trends')}>
            Trend Analysis
          </button>
          <button style={{ ...styles.tab, ...(activeTab === 'price' ? styles.tabActive : {}) }} onClick={() => setActiveTab('price')}>
            Price Intelligence
          </button>
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'trends' && renderTrendAnalysis()}
        {activeTab === 'price' && renderPriceIntelligence()}
      </div>
    </div>
  );
}
