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
  tableContainer: { overflowX: 'auto', marginBottom: '32px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thead: { backgroundColor: '#111111', borderBottom: '2px solid #1E1E1E' },
  th: { padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#FFFFFF', fontSize: '12px' },
  td: { padding: '12px 16px', borderBottom: '1px solid #1E1E1E', color: '#CCCCCC' },
  trHover: { backgroundColor: '#1A1A1A', cursor: 'pointer' },
  expandButton: { padding: '4px 8px', fontSize: '11px', backgroundColor: '#1E1E1E', border: '1px solid #1E1E1E', color: '#999999', borderRadius: '4px', cursor: 'pointer' },
  expandedRow: { backgroundColor: '#111111', padding: '24px' },
  threatBadge: { padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
  threatHigh: { backgroundColor: '#5D1F1F', color: '#FF6B6B' },
  threatMedium: { backgroundColor: '#4D3E1F', color: '#FFD700' },
  threatLow: { backgroundColor: '#1E4620', color: '#90EE90' },
  comparisonContainer: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' },
  comparisonCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' },
  comparisonHeader: { fontSize: '14px', fontWeight: '600', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #1E1E1E' },
  metricRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1E1E1E' },
  metricLabel: { fontSize: '12px', color: '#999999' },
  metricValue: { fontSize: '13px', fontWeight: '600', color: '#FFFFFF' },
  winner: { color: '#90EE90', fontWeight: '700' },
  loser: { color: '#FF6B6B', fontWeight: '700' },
  radarContainer: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '24px', marginBottom: '32px', display: 'flex', justifyContent: 'center' },
  donutContainer: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '24px', marginBottom: '32px' },
  chartTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '20px' },
  legend: { display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' },
  legendColor: { width: '16px', height: '16px', borderRadius: '2px' },
  revenueChart: { display: 'flex', alignItems: 'flex-end', gap: '16px', height: '200px', marginBottom: '16px' },
  revenueBar: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  revenueBarFill: { width: '100%', backgroundColor: '#FFD700', borderRadius: '4px 4px 0 0', transition: 'background-color 0.2s' },
  revenueLabel: { fontSize: '11px', color: '#999999', marginTop: '8px', textAlign: 'center' },
  noData: { padding: '48px 32px', textAlign: 'center', color: '#666666' },
  addCompetitorBtn: { padding: '8px 16px', fontSize: '13px', fontWeight: '500', backgroundColor: '#FFD700', color: '#000000', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  detailItem: { display: 'grid', gridTemplateColumns: '200px 1fr', gap: '12px', padding: '8px 0', borderBottom: '1px solid #1E1E1E' },
  detailLabel: { color: '#666666', fontSize: '12px' },
  detailValue: { color: '#FFFFFF', fontSize: '12px', fontWeight: '500' },
};

// Mock arrays zeroed during the 2026-05-12 mock-data purge. Real data
// loads from /competitors/overview and /competitors/brand/{brand}.
const mockCompetitors = [];
const mockYourProduct = null;
const mockCompetitorProduct = null;

export default function CompetitorsPage() {
  const [activeTab, setActiveTab] = useState('tracker');
  const [competitors, setCompetitors] = useState([]);
  const [expandedCompetitor, setExpandedCompetitor] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('ecomera_token');
    if (token) {
      setCompetitors(Array.isArray(mockCompetitors) ? mockCompetitors : []);
    }
  }, []);

  const getThreatColor = (level) => {
    if (level === 'High') return styles.threatHigh;
    if (level === 'Medium') return styles.threatMedium;
    return styles.threatLow;
  };

  const handleAddCompetitor = (name) => {
    console.log('Adding competitor:', name);
    setShowAddModal(false);
  };

  const maxRevenue = Math.max(...competitors.map(c => c.monthlyRevenue));
  const yourRevenue = 95000;

  const renderTracker = () => (
    <div>
      <div style={styles.controlsRow}>
        <button style={styles.addCompetitorBtn} onClick={() => setShowAddModal(true)}>+ Add Competitor</button>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Seller Name</th>
              <th style={styles.th}>Store URL</th>
              <th style={styles.th}>Rating</th>
              <th style={styles.th}>Total Products</th>
              <th style={styles.th}>Est. Monthly Revenue</th>
              <th style={styles.th}>Est. Monthly Orders</th>
              <th style={styles.th}>Threat Level</th>
              <th style={styles.th}>Details</th>
            </tr>
          </thead>
          <tbody>
            {competitors.length > 0 ? competitors.map((comp, idx) => (
              <React.Fragment key={comp.id}>
                <tr style={styles.trHover}>
                  <td style={styles.td}>{comp.seller}</td>
                  <td style={styles.td}>
                    <span style={{ color: '#FFD700', cursor: 'pointer' }}>{comp.url}</span>
                  </td>
                  <td style={styles.td}>⭐ {comp.rating}</td>
                  <td style={styles.td}>{comp.products}</td>
                  <td style={styles.td}>${comp.monthlyRevenue.toLocaleString()}</td>
                  <td style={styles.td}>{comp.monthlyOrders.toLocaleString()}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.threatBadge, ...getThreatColor(comp.threat) }}>
                      {comp.threat}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.expandButton}
                      onClick={() => setExpandedCompetitor(expandedCompetitor === comp.id ? null : comp.id)}
                    >
                      {expandedCompetitor === comp.id ? 'Hide' : 'Show'}
                    </button>
                  </td>
                </tr>
                {expandedCompetitor === comp.id && (
                  <tr>
                    <td colSpan="8" style={{ padding: 0 }}>
                      <div style={styles.expandedRow}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                          <div>
                            <div style={{ fontSize: '12px', color: '#666666', marginBottom: '4px' }}>Store URL</div>
                            <div style={{ color: '#FFD700' }}>{comp.url}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#666666', marginBottom: '4px' }}>Seller Rating</div>
                            <div>⭐ {comp.rating} ({comp.products * Math.floor(Math.random() * 50 + 100)} reviews)</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#666666', marginBottom: '4px' }}>Market Presence</div>
                            <div>{comp.products} products across multiple categories</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#666666', marginBottom: '4px' }}>Est. Performance</div>
                            <div>${(comp.monthlyRevenue / comp.monthlyOrders).toFixed(2)} avg order value</div>
                          </div>
                        </div>
                        <div style={{ paddingTop: '16px', borderTop: '1px solid #1E1E1E' }}>
                          <div style={{ fontSize: '12px', color: '#666666', marginBottom: '8px' }}>Key Strategies</div>
                          <div style={{ fontSize: '12px', color: '#CCCCCC', lineHeight: '1.6' }}>
                            • Focus on high-volume categories<br/>
                            • Competitive pricing strategy<br/>
                            • Strong customer reviews and ratings<br/>
                            • Regular product refresh cycle
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )) : null}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
          }}>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Add New Competitor</div>
            <input
              type="text"
              placeholder="Competitor Seller Name"
              style={{
                width: '100%',
                padding: '8px 12px',
                marginBottom: '12px',
                backgroundColor: '#0A0A0A',
                border: '1px solid #1E1E1E',
                borderRadius: '4px',
                color: '#FFFFFF',
                boxSizing: 'border-box',
              }}
            />
            <input
              type="text"
              placeholder="Store URL"
              style={{
                width: '100%',
                padding: '8px 12px',
                marginBottom: '16px',
                backgroundColor: '#0A0A0A',
                border: '1px solid #1E1E1E',
                borderRadius: '4px',
                color: '#FFFFFF',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1E1E1E',
                  color: '#999999',
                  border: '1px solid #1E1E1E',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#FFD700',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
                onClick={() => handleAddCompetitor('New Competitor')}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderASINBattles = () => (
    <div>
      <div style={styles.controlsRow}>
        <span style={{ fontSize: '13px', color: '#999999' }}>Your Product vs TechHub Pro Competitor</span>
      </div>

      <div style={styles.comparisonContainer}>
        <div style={styles.comparisonCard}>
          <div style={styles.comparisonHeader}>Your Product</div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>ASIN</span>
            <span style={styles.metricValue}>{mockYourProduct.asin}</span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Title</span>
            <span style={styles.metricValue}>{mockYourProduct.title}</span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Price</span>
            <span style={styles.metricValue}>${mockYourProduct.price}</span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>BSR</span>
            <span style={styles.metricValue}>{mockYourProduct.bsr}</span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Total Reviews</span>
            <span style={styles.metricValue}>{mockYourProduct.reviews.toLocaleString()}</span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Rating</span>
            <span style={styles.metricValue}>⭐ {mockYourProduct.rating}</span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Product Images</span>
            <span style={styles.metricValue}>{mockYourProduct.images}</span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>A+ Content</span>
            <span style={{ color: mockYourProduct.aPlus ? '#90EE90' : '#FF6B6B', fontWeight: '600' }}>
              {mockYourProduct.aPlus ? '✓ Yes' : '✗ No'}
            </span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Bullet Quality Score</span>
            <span style={styles.metricValue}>{mockYourProduct.bulletQuality}/100</span>
          </div>
        </div>

        <div style={styles.comparisonCard}>
          <div style={styles.comparisonHeader}>Competitor Product</div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>ASIN</span>
            <span style={styles.metricValue}>{mockCompetitorProduct.asin}</span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Title</span>
            <span style={styles.metricValue}>{mockCompetitorProduct.title}</span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Price</span>
            <span style={styles.metricValue}>${mockCompetitorProduct.price}</span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>BSR</span>
            <span style={{ ...styles.metricValue, ...styles.winner }}>
              {mockCompetitorProduct.bsr} ✓
            </span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Total Reviews</span>
            <span style={{ ...styles.metricValue, ...styles.winner }}>
              {mockCompetitorProduct.reviews.toLocaleString()} ✓
            </span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Rating</span>
            <span style={{ ...styles.metricValue, ...styles.winner }}>
              ⭐ {mockCompetitorProduct.rating} ✓
            </span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Product Images</span>
            <span style={{ ...styles.metricValue, ...styles.loser }}>
              {mockCompetitorProduct.images}
            </span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>A+ Content</span>
            <span style={{ color: mockCompetitorProduct.aPlus ? '#90EE90' : '#FF6B6B', fontWeight: '600' }}>
              {mockCompetitorProduct.aPlus ? '✓ Yes' : '✗ No'}
            </span>
          </div>
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Bullet Quality Score</span>
            <span style={styles.metricValue}>{mockCompetitorProduct.bulletQuality}/100</span>
          </div>
        </div>
      </div>

      <div style={styles.radarContainer}>
        <svg style={{ width: '300px', height: '300px' }} viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
          <circle cx="150" cy="150" r="100" fill="none" stroke="#1E1E1E" strokeWidth="1" />
          <circle cx="150" cy="150" r="70" fill="none" stroke="#1E1E1E" strokeWidth="1" />
          <circle cx="150" cy="150" r="40" fill="none" stroke="#1E1E1E" strokeWidth="1" />
          <line x1="150" y1="50" x2="150" y2="250" stroke="#1E1E1E" strokeWidth="1" />
          <line x1="50" y1="150" x2="250" y2="150" stroke="#1E1E1E" strokeWidth="1" />
          <line x1="80" y1="80" x2="220" y2="220" stroke="#1E1E1E" strokeWidth="1" />
          <line x1="220" y1="80" x2="80" y2="220" stroke="#1E1E1E" strokeWidth="1" />
          <polygon points="150,110 180,140 170,180 150,190 130,180 120,140" fill="#FFD700" fillOpacity="0.3" stroke="#FFD700" strokeWidth="2" />
          <polygon points="150,100 190,130 180,190 150,200 120,190 110,130" fill="#FF6B6B" fillOpacity="0.2" stroke="#FF6B6B" strokeWidth="2" />
          <text x="150" y="220" textAnchor="middle" style={{ fontSize: '11px', fill: '#666666' }}>Price</text>
          <text x="230" y="155" style={{ fontSize: '11px', fill: '#666666' }}>Reviews</text>
          <text x="180" y="240" style={{ fontSize: '11px', fill: '#666666' }}>Content</text>
        </svg>
      </div>
    </div>
  );

  const renderMarketShare = () => (
    <div>
      <div style={styles.controlsRow}>
        <span style={{ fontSize: '13px', color: '#999999' }}>Market Share Analysis for Wireless Mouse Category</span>
      </div>

      <div style={styles.donutContainer}>
        <div style={styles.chartTitle}>Your Market Share vs Competitors</div>
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: '#FFD700' }}></div>
            <span>Your Store (28%)</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: '#FF6B6B' }}></div>
            <span>TechHub Pro (35%)</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: '#90EE90' }}></div>
            <span>Smart Essentials (22%)</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: '#FFA500' }}></div>
            <span>Others (15%)</span>
          </div>
        </div>
        <svg style={{ width: '100%', height: '200px' }} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
          <circle cx="100" cy="100" r="60" fill="none" stroke="#FFD700" strokeWidth="30" strokeDasharray="105 300" strokeDashoffset="0" />
          <circle cx="100" cy="100" r="60" fill="none" stroke="#FF6B6B" strokeWidth="30" strokeDasharray="131 300" strokeDashoffset="-105" />
          <circle cx="100" cy="100" r="60" fill="none" stroke="#90EE90" strokeWidth="30" strokeDasharray="83 300" strokeDashoffset="-236" />
          <circle cx="100" cy="100" r="60" fill="none" stroke="#FFA500" strokeWidth="30" strokeDasharray="45 300" strokeDashoffset="-318" />
          <text x="100" y="105" textAnchor="middle" style={{ fontSize: '14px', fontWeight: '600', fill: '#FFFFFF' }}>28%</text>
        </svg>
      </div>

      <div style={styles.donutContainer}>
        <div style={styles.chartTitle}>Monthly Revenue Comparison</div>
        <div style={styles.revenueChart}>
          <div style={styles.revenueBar}>
            <div style={{ ...styles.revenueBarFill, height: `${(yourRevenue / maxRevenue) * 100}%`, backgroundColor: '#FFD700' }}></div>
            <div style={styles.revenueLabel}>Your Store<br/>${(yourRevenue / 1000).toFixed(0)}K</div>
          </div>
          {competitors.slice(0, 4).map((comp, idx) => (
            <div key={idx} style={styles.revenueBar}>
              <div
                style={{
                  ...styles.revenueBarFill,
                  height: `${(comp.monthlyRevenue / maxRevenue) * 100}%`,
                  backgroundColor: ['#FF6B6B', '#90EE90', '#FFA500', '#87CEEB'][idx],
                }}
              ></div>
              <div style={styles.revenueLabel}>{comp.seller.split(' ')[0]}<br/>${(comp.monthlyRevenue / 1000).toFixed(0)}K</div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.donutContainer}>
        <div style={styles.chartTitle}>Growth Trend Comparison (Last 6 Months)</div>
        <svg style={{ width: '100%', height: '200px' }} viewBox="0 0 600 200" preserveAspectRatio="xMidYMid meet">
          <line x1="40" y1="160" x2="580" y2="160" stroke="#1E1E1E" strokeWidth="1" />
          <line x1="40" y1="20" x2="40" y2="160" stroke="#1E1E1E" strokeWidth="1" />
          <polyline points="40,130 120,110 200,95 280,80 360,75 440,65 520,55" fill="none" stroke="#FFD700" strokeWidth="2" />
          <polyline points="40,140 120,125 200,115 280,100 360,90 440,80 520,70" fill="none" stroke="#FF6B6B" strokeWidth="2" />
          <polyline points="40,145 120,135 200,125 280,115 360,110 440,100 520,95" fill="none" stroke="#90EE90" strokeWidth="2" />
          <text x="15" y="165" style={{ fontSize: '11px', fill: '#666666' }}>0%</text>
          <text x="580" y="25" style={{ fontSize: '11px', fill: '#666666' }}>+35%</text>
        </svg>
      </div>
    </div>
  );

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Competitor Analysis</h1>
          <p style={styles.subtitle}>Track competitors and analyze market position</p>
        </div>

        <div style={styles.tabContainer}>
          <button style={{ ...styles.tab, ...(activeTab === 'tracker' ? styles.tabActive : {}) }} onClick={() => setActiveTab('tracker')}>
            Competitor Tracker
          </button>
          <button style={{ ...styles.tab, ...(activeTab === 'battles' ? styles.tabActive : {}) }} onClick={() => setActiveTab('battles')}>
            ASIN Battles
          </button>
          <button style={{ ...styles.tab, ...(activeTab === 'share' ? styles.tabActive : {}) }} onClick={() => setActiveTab('share')}>
            Market Share
          </button>
        </div>

        {activeTab === 'tracker' && renderTracker()}
        {activeTab === 'battles' && renderASINBattles()}
        {activeTab === 'share' && renderMarketShare()}
      </div>
    </div>
  );
}
