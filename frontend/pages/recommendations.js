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
  controlsRow: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' },
  button: { padding: '8px 16px', fontSize: '13px', fontWeight: '500', backgroundColor: '#FFD700', color: '#000000', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.2s' },
  filterInput: { padding: '8px 12px', fontSize: '13px', backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '4px', color: '#FFFFFF', transition: 'border-color 0.2s' },
  gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginBottom: '32px' },
  productCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '16px', transition: 'border-color 0.2s', cursor: 'pointer' },
  productCardHover: { borderColor: '#FFD700' },
  productASIN: { fontSize: '11px', color: '#666666', fontFamily: 'monospace', marginBottom: '4px' },
  productTitle: { fontSize: '14px', fontWeight: '600', marginBottom: '12px', lineHeight: '1.4' },
  productMeta: { fontSize: '12px', color: '#999999', marginBottom: '8px' },
  badge: { display: 'inline-block', padding: '4px 8px', fontSize: '11px', fontWeight: '600', borderRadius: '4px', marginRight: '8px', marginBottom: '8px' },
  badgeLow: { backgroundColor: '#1E4620', color: '#90EE90' },
  badgeMedium: { backgroundColor: '#4D3E1F', color: '#FFD700' },
  badgeHigh: { backgroundColor: '#5D1F1F', color: '#FF6B6B' },
  metric: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', padding: '8px 0', borderTop: '1px solid #1E1E1E' },
  metricLabel: { color: '#999999' },
  metricValue: { fontWeight: '600', color: '#FFFFFF' },
  analyzeButton: { width: '100%', padding: '8px 12px', marginTop: '12px', fontSize: '12px', fontWeight: '500', backgroundColor: '#FFD700', color: '#000000', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'background-color 0.2s' },
  tableContainer: { overflowX: 'auto', marginBottom: '32px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thead: { backgroundColor: '#111111', borderBottom: '2px solid #1E1E1E' },
  th: { padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#FFFFFF', fontSize: '12px' },
  td: { padding: '12px 16px', borderBottom: '1px solid #1E1E1E', color: '#CCCCCC' },
  oppCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', marginBottom: '16px', transition: 'border-color 0.2s' },
  oppHeader: { fontSize: '16px', fontWeight: '600', marginBottom: '16px' },
  oppMetrics: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' },
  oppMetricBox: { backgroundColor: '#0A0A0A', padding: '12px', borderRadius: '4px', border: '1px solid #1E1E1E' },
  oppLabel: { fontSize: '11px', color: '#666666', marginBottom: '4px' },
  oppValue: { fontSize: '18px', fontWeight: '700', color: '#FFD700' },
  gaugeContainer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
  gaugeLabel: { fontSize: '12px', color: '#999999' },
  gaugeBar: { flex: 1, height: '8px', backgroundColor: '#1E1E1E', borderRadius: '4px', margin: '0 12px', overflow: 'hidden' },
  gaugeFill: { height: '100%', backgroundColor: '#FFD700', transition: 'width 0.2s' },
  alertCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '16px', marginBottom: '12px', display: 'flex', gap: '12px' },
  alertIcon: { fontSize: '18px', flexShrink: 0, marginTop: '2px' },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: '13px', fontWeight: '600', marginBottom: '4px' },
  alertMessage: { fontSize: '12px', color: '#999999', marginBottom: '12px', lineHeight: '1.4' },
  alertActions: { display: 'flex', gap: '8px' },
  alertButton: { padding: '6px 12px', fontSize: '11px', fontWeight: '500', backgroundColor: '#FFD700', color: '#000000', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  alertDismiss: { padding: '6px 12px', fontSize: '11px', fontWeight: '500', backgroundColor: '#1E1E1E', color: '#999999', border: '1px solid #1E1E1E', borderRadius: '4px', cursor: 'pointer' },
  priorityCritical: { color: '#FF6B6B' },
  priorityHigh: { color: '#FFD700' },
  priorityMedium: { color: '#FFA500' },
  priorityLow: { color: '#90EE90' },
  noData: { padding: '48px 32px', textAlign: 'center', color: '#666666' },
  spinnerAnimation: `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `,
};

const mockProducts = [
  { asin: 'B0D1234567', title: 'Ergonomic Wireless Mouse with USB Receiver', category: 'Electronics', roi: 42, competition: 'High', demand: 78, verdict: 'Good Opportunity' },
  { asin: 'B0D2345678', title: 'Stainless Steel Water Bottle 32oz', category: 'Sports & Outdoors', roi: 35, competition: 'Medium', demand: 62, verdict: 'Moderate' },
  { asin: 'B0D3456789', title: 'LED Desk Lamp with USB Charging Port', category: 'Home & Kitchen', roi: 28, competition: 'High', demand: 71, verdict: 'Moderate' },
  { asin: 'B0D4567890', title: 'Bamboo Cutting Board Set 3 Piece', category: 'Home & Kitchen', roi: 38, competition: 'Low', demand: 55, verdict: 'Strong Opportunity' },
  { asin: 'B0D5678901', title: 'Bluetooth 5.0 Wireless Earbuds', category: 'Electronics', roi: 45, competition: 'High', demand: 85, verdict: 'Excellent' },
  { asin: 'B0D6789012', title: 'Yoga Mat Non-Slip with Carrying Strap', category: 'Sports & Outdoors', roi: 32, competition: 'Medium', demand: 68, verdict: 'Good Opportunity' },
];

const mockNiches = [
  { niche: 'Sustainable Kitchen Products', growth: 42, searchVolume: 28000, density: 'Medium', entryCost: 2400, score: 85 },
  { niche: 'Smart Home Pet Accessories', growth: 67, searchVolume: 15600, density: 'Low', entryCost: 1800, score: 92 },
  { niche: 'Eco-Friendly Fitness Gear', growth: 38, searchVolume: 22400, density: 'Medium', entryCost: 3200, score: 79 },
  { niche: 'Minimalist Workspace Organizers', growth: 55, searchVolume: 18900, density: 'Low', entryCost: 1500, score: 88 },
  { niche: 'Premium Pet Grooming Tools', growth: 33, searchVolume: 12200, density: 'High', entryCost: 2800, score: 71 },
  { niche: 'Smart Water Bottle Trackers', growth: 71, searchVolume: 31200, density: 'High', entryCost: 4500, score: 83 },
  { niche: 'Ergonomic Mobile Phone Accessories', growth: 28, searchVolume: 26800, density: 'High', entryCost: 1200, score: 65 },
  { niche: 'Wireless Charging Home Decor', growth: 49, searchVolume: 19400, density: 'Medium', entryCost: 2000, score: 81 },
  { niche: 'Compact Travel Fitness Equipment', growth: 44, searchVolume: 20100, density: 'Medium', entryCost: 2600, score: 77 },
  { niche: 'AI-Compatible Pet Camera Systems', growth: 89, searchVolume: 8900, density: 'Low', entryCost: 6800, score: 94 },
];

const mockAlerts = [
  { id: 1, type: 'restock', priority: 'Critical', title: 'Low Inventory Alert', message: 'Product B0D1234567 inventory dropping rapidly. Recommend restocking within 7 days to avoid stockout.' },
  { id: 2, type: 'price', priority: 'High', title: 'Price Optimization Opportunity', message: 'Competitor reduced price by $2.50. Your position weakening. Recommend price adjustment to $24.99.' },
  { id: 3, type: 'ppc', priority: 'Medium', title: 'PPC Bid Adjustment Needed', message: 'Your ACoS increased to 18%. Consider reducing bid by 5% or improving ad creative.' },
  { id: 4, type: 'competitor', priority: 'High', title: 'New Competitor Detected', message: 'New seller entered B0D5678901 market. Has 50+ reviews already. Monitor closely.' },
  { id: 5, type: 'restock', priority: 'Medium', title: 'Seasonal Restocking Alert', message: 'Demand expected to increase 40% in April. Plan inventory increase now.' },
];

export default function RecommendationsPage() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [niches, setNiches] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('');
  const [minROI, setMinROI] = useState('');
  const [competition, setCompetition] = useState('');
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  useEffect(() => {
    const token = localStorage.getItem('ecomera_token');
    if (token) {
      setProducts(Array.isArray(mockProducts) ? mockProducts : []);
      setNiches(Array.isArray(mockNiches) ? mockNiches : []);
      setAlerts(Array.isArray(mockAlerts) ? mockAlerts : []);
    }
  }, []);

  const filteredProducts = products.filter(p => {
    const categoryMatch = !category || p.category.includes(category);
    const roiMatch = !minROI || p.roi >= parseInt(minROI);
    const competitionMatch = !competition || p.competition === competition;
    return categoryMatch && roiMatch && competitionMatch;
  });

  const getCompetitionBadge = (level) => {
    const badgeStyle = level === 'Low' ? styles.badgeLow : level === 'Medium' ? styles.badgeMedium : styles.badgeHigh;
    return <span style={{ ...styles.badge, ...badgeStyle }}>{level}</span>;
  };

  const getPriorityIcon = (priority) => {
    const icons = { Critical: '🚨', High: '⚠️', Medium: '⚡', Low: 'ℹ️' };
    return icons[priority] || 'ℹ️';
  };

  const getPriorityColor = (priority) => {
    const colors = { Critical: styles.priorityCritical, High: styles.priorityHigh, Medium: styles.priorityMedium, Low: styles.priorityLow };
    return colors[priority] || styles.priorityLow;
  };

  const handleDismissAlert = (id) => {
    setDismissedAlerts(new Set([...dismissedAlerts, id]));
  };

  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setProducts(Array.isArray(mockProducts) ? mockProducts : []);
      setLoading(false);
    }, 1000);
  };

  const handleAnalyze = (asin) => {
    console.log('Analyzing product:', asin);
  };

  const renderProductRecommendations = () => (
    <div>
      <div style={styles.controlsRow}>
        <input style={styles.filterInput} placeholder="Filter by category..." value={category} onChange={(e) => setCategory(e.target.value)} />
        <input style={styles.filterInput} type="number" placeholder="Min ROI %" value={minROI} onChange={(e) => setMinROI(e.target.value)} />
        <select style={styles.filterInput} value={competition} onChange={(e) => setCompetition(e.target.value)}>
          <option value="">All Competition Levels</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <button style={styles.button} onClick={handleRefresh}>{loading ? 'Refreshing...' : 'Refresh'}</button>
      </div>
      {filteredProducts.length > 0 ? (
        <div style={styles.gridContainer}>
          {filteredProducts.map(product => (
            <div key={product.asin} style={styles.productCard}>
              <div style={styles.productASIN}>ASIN: {product.asin}</div>
              <div style={styles.productTitle}>{product.title}</div>
              <div style={styles.productMeta}>{product.category}</div>
              <div>{getCompetitionBadge(product.competition)}</div>
              <div style={styles.metric}>
                <span style={styles.metricLabel}>Estimated ROI</span>
                <span style={styles.metricValue}>{product.roi}%</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.metricLabel}>Demand Score</span>
                <span style={styles.metricValue}>{product.demand}/100</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.metricLabel}>Verdict</span>
                <span style={{ color: '#90EE90' }}>{product.verdict}</span>
              </div>
              <button style={styles.analyzeButton} onClick={() => handleAnalyze(product.asin)}>Analyze Product</button>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.noData}>No products match your filters</div>
      )}
    </div>
  );

  const renderMarketOpportunities = () => (
    <div>
      <div style={styles.controlsRow}>
        <button style={styles.button} onClick={handleRefresh}>{loading ? 'Refreshing...' : 'Refresh Opportunities'}</button>
      </div>
      {niches.length > 0 ? (
        <div>
          {niches.map((niche, idx) => (
            <div key={idx} style={styles.oppCard}>
              <div style={styles.oppHeader}>{niche.niche}</div>
              <div style={styles.oppMetrics}>
                <div style={styles.oppMetricBox}>
                  <div style={styles.oppLabel}>Growth Rate</div>
                  <div style={styles.oppValue}>{niche.growth}%</div>
                </div>
                <div style={styles.oppMetricBox}>
                  <div style={styles.oppLabel}>Monthly Search Volume</div>
                  <div style={styles.oppValue}>{niche.searchVolume.toLocaleString()}</div>
                </div>
                <div style={styles.oppMetricBox}>
                  <div style={styles.oppLabel}>Entry Cost</div>
                  <div style={styles.oppValue}>${niche.entryCost}</div>
                </div>
                <div style={styles.oppMetricBox}>
                  <div style={styles.oppLabel}>Competition Density</div>
                  <div style={styles.oppValue}>{niche.density}</div>
                </div>
              </div>
              <div style={styles.gaugeContainer}>
                <span style={styles.gaugeLabel}>Opportunity Score</span>
                <div style={styles.gaugeBar}>
                  <div style={{ ...styles.gaugeFill, width: `${niche.score}%` }}></div>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#FFD700', minWidth: '40px' }}>{niche.score}/100</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.noData}>No opportunities data available</div>
      )}
    </div>
  );

  const renderSmartAlerts = () => (
    <div>
      <div style={styles.controlsRow}>
        <span style={{ fontSize: '13px', color: '#999999' }}>{visibleAlerts.length} active alerts</span>
      </div>
      {visibleAlerts.length > 0 ? (
        <div>
          {visibleAlerts.map(alert => (
            <div key={alert.id} style={styles.alertCard}>
              <div style={{ ...styles.alertIcon, ...getPriorityColor(alert.priority) }}>
                {getPriorityIcon(alert.priority)}
              </div>
              <div style={styles.alertContent}>
                <div style={{ ...styles.alertTitle, ...getPriorityColor(alert.priority) }}>
                  [{alert.priority}] {alert.title}
                </div>
                <div style={styles.alertMessage}>{alert.message}</div>
                <div style={styles.alertActions}>
                  <button style={styles.alertButton}>Take Action</button>
                  <button style={styles.alertDismiss} onClick={() => handleDismissAlert(alert.id)}>Dismiss</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.noData}>No active alerts</div>
      )}
    </div>
  );

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>AI Picks & Recommendations</h1>
          <p style={styles.subtitle}>AI-powered insights and recommendations for your business</p>
        </div>

        <div style={styles.tabContainer}>
          <button style={{ ...styles.tab, ...(activeTab === 'products' ? styles.tabActive : {}) }} onClick={() => setActiveTab('products')}>
            Product Recommendations
          </button>
          <button style={{ ...styles.tab, ...(activeTab === 'opportunities' ? styles.tabActive : {}) }} onClick={() => setActiveTab('opportunities')}>
            Market Opportunities
          </button>
          <button style={{ ...styles.tab, ...(activeTab === 'alerts' ? styles.tabActive : {}) }} onClick={() => setActiveTab('alerts')}>
            Smart Alerts
          </button>
        </div>

        {activeTab === 'products' && renderProductRecommendations()}
        {activeTab === 'opportunities' && renderMarketOpportunities()}
        {activeTab === 'alerts' && renderSmartAlerts()}
      </div>
    </div>
  );
}
