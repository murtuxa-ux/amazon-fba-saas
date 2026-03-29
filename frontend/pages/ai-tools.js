import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

export default function AITools() {
  const [activeTab, setActiveTab] = useState('insights');
  const [insights, setInsights] = useState([]);
  const [watches, setWatches] = useState([]);
  const [optimizations, setOptimizations] = useState([]);
  const [rules, setRules] = useState([]);
  const [dashboard, setDashboard] = useState({
    insights: { total: 0, unread: 0 },
    competitor_watch: { total_active: 0, active_alerts: 0 },
    automation: { total_rules: 0, active_rules: 0 },
    listing_optimization: { total: 0, pending: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [filterImpact, setFilterImpact] = useState('all');
  const [filterInsightType, setFilterInsightType] = useState('all');
  const [queryInput, setQueryInput] = useState('');
  const [queryResults, setQueryResults] = useState(null);

  // Listing optimizer form state
  const [optForm, setOptForm] = useState({
    asin: '',
    title: '',
    bullets: ['', '', '', '', ''],
    backendKeywords: '',
    clientId: 1,
  });

  // Competitor watch form state
  const [watchForm, setWatchForm] = useState({
    clientId: 1,
    ourAsin: '',
    competitorAsin: '',
    competitorBrand: '',
    competitorPrice: '',
    ourPrice: '',
  });

  // Automation rule form state
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    triggerType: 'schedule',
    triggerConfig: {},
    actionType: 'alert',
    actionConfig: {},
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboard();
    fetchAllData();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai-tools/dashboard`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [insightsRes, watchesRes, optimizationsRes, rulesRes] = await Promise.all([
        fetch(`${API_BASE}/ai-tools/insights`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}` },
        }),
        fetch(`${API_BASE}/ai-tools/competitor-watch`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}` },
        }),
        fetch(`${API_BASE}/ai-tools/listing-optimizations`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}` },
        }),
        fetch(`${API_BASE}/ai-tools/automation-rules`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}` },
        }),
      ]);

      if (insightsRes.ok) setInsights(await insightsRes.json());
      if (watchesRes.ok) setWatches(await watchesRes.json());
      if (optimizationsRes.ok) setOptimizations(await optimizationsRes.json());
      if (rulesRes.ok) setRules(await rulesRes.json());
    } catch (error) {
      console.error('Data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai-tools/insights/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}`,
        },
        body: JSON.stringify({ client_id: selectedClient || 1 }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchAllData();
        await fetchDashboard();
      }
    } catch (error) {
      console.error('Generate insights error:', error);
    }
  };

  const handleMarkInsightRead = async (insightId) => {
    try {
      const res = await fetch(`${API_BASE}/ai-tools/insights/${insightId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}`,
        },
      });
      if (res.ok) {
        await fetchAllData();
        await fetchDashboard();
      }
    } catch (error) {
      console.error('Mark read error:', error);
    }
  };

  const handleMarkInsightActed = async (insightId) => {
    try {
      const res = await fetch(`${API_BASE}/ai-tools/insights/${insightId}/act`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}`,
        },
      });
      if (res.ok) {
        await fetchAllData();
        await fetchDashboard();
      }
    } catch (error) {
      console.error('Mark acted error:', error);
    }
  };

  const handleOptimizeListing = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai-tools/optimize-listing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}`,
        },
        body: JSON.stringify({
          client_id: optForm.clientId,
          asin: optForm.asin,
          title: optForm.title,
          bullets: optForm.bullets.filter(b => b.trim()),
          backend_keywords: optForm.backendKeywords,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setOptimizations([data, ...optimizations]);
        setOptForm({
          asin: '',
          title: '',
          bullets: ['', '', '', '', ''],
          backendKeywords: '',
          clientId: 1,
        });
        await fetchDashboard();
      }
    } catch (error) {
      console.error('Optimization error:', error);
    }
  };

  const handleCreateWatch = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai-tools/competitor-watch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}`,
        },
        body: JSON.stringify({
          client_id: parseInt(watchForm.clientId),
          our_asin: watchForm.ourAsin,
          competitor_asin: watchForm.competitorAsin,
          competitor_brand: watchForm.competitorBrand,
          competitor_price: parseFloat(watchForm.competitorPrice),
          our_price: parseFloat(watchForm.ourPrice),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWatches([data, ...watches]);
        setWatchForm({
          clientId: 1,
          ourAsin: '',
          competitorAsin: '',
          competitorBrand: '',
          competitorPrice: '',
          ourPrice: '',
        });
        await fetchDashboard();
      }
    } catch (error) {
      console.error('Watch creation error:', error);
    }
  };

  const handleCreateRule = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai-tools/automation-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}`,
        },
        body: JSON.stringify({
          name: ruleForm.name,
          description: ruleForm.description,
          trigger_type: ruleForm.triggerType,
          trigger_config: ruleForm.triggerConfig,
          action_type: ruleForm.actionType,
          action_config: ruleForm.actionConfig,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRules([data, ...rules]);
        setRuleForm({
          name: '',
          description: '',
          triggerType: 'schedule',
          triggerConfig: {},
          actionType: 'alert',
          actionConfig: {},
        });
        await fetchDashboard();
      }
    } catch (error) {
      console.error('Rule creation error:', error);
    }
  };

  const handleQuery = async () => {
    if (!queryInput.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/ai-tools/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ecomera_token')}`,
        },
        body: JSON.stringify({ query_text: queryInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setQueryResults(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Query error:', error);
    }
  };

  const getImpactColor = (level) => {
    const colors = {
      low: '#888888',
      medium: '#4A9EFF',
      high: '#FFD700',
      critical: '#FF4444',
    };
    return colors[level] || '#888888';
  };

  const getImpactBg = (level) => {
    const colors = {
      low: 'rgba(136, 136, 136, 0.1)',
      medium: 'rgba(74, 158, 255, 0.1)',
      high: 'rgba(255, 215, 0, 0.1)',
      critical: 'rgba(255, 68, 68, 0.1)',
    };
    return colors[level] || 'rgba(136, 136, 136, 0.1)';
  };

  const getInsightIcon = (type) => {
    const icons = {
      ppc_optimization: '📊',
      inventory_alert: '📦',
      price_suggestion: '💰',
      listing_improvement: '✏️',
      competitor_threat: '⚠️',
      growth_opportunity: '🚀',
    };
    return icons[type] || '💡';
  };

  // Filter insights
  const filteredInsights = insights.filter((insight) => {
    if (filterInsightType !== 'all' && insight.insight_type !== filterInsightType)
      return false;
    if (filterImpact !== 'all' && insight.impact_level !== filterImpact) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A' }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          padding: '40px',
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ color: '#FFFFFF', fontSize: '32px', marginBottom: '8px' }}>
            AI & Automation Tools
          </h1>
          <p style={{ color: '#888888', fontSize: '14px' }}>
            Optimize listings, monitor competitors, and automate your workflow
          </p>
        </div>

        {/* Dashboard Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              background: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '8px',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px' }}>
              Unread Insights
            </div>
            <div style={{ fontSize: '28px', color: '#FFD700', fontWeight: 'bold' }}>
              {dashboard.insights.unread}
            </div>
            <div style={{ fontSize: '12px', color: '#666666', marginTop: '4px' }}>
              of {dashboard.insights.total} total
            </div>
          </div>

          <div
            style={{
              background: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '8px',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px' }}>
              Active Competitor Watches
            </div>
            <div style={{ fontSize: '28px', color: '#FFD700', fontWeight: 'bold' }}>
              {dashboard.competitor_watch.active_alerts}
            </div>
            <div style={{ fontSize: '12px', color: '#666666', marginTop: '4px' }}>
              alerts active
            </div>
          </div>

          <div
            style={{
              background: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '8px',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px' }}>
              Active Automation Rules
            </div>
            <div style={{ fontSize: '28px', color: '#FFD700', fontWeight: 'bold' }}>
              {dashboard.automation.active_rules}
            </div>
            <div style={{ fontSize: '12px', color: '#666666', marginTop: '4px' }}>
              of {dashboard.automation.total_rules} total
            </div>
          </div>

          <div
            style={{
              background: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '8px',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px' }}>
              Pending Optimizations
            </div>
            <div style={{ fontSize: '28px', color: '#FFD700', fontWeight: 'bold' }}>
              {dashboard.listing_optimization.pending}
            </div>
            <div style={{ fontSize: '12px', color: '#666666', marginTop: '4px' }}>
              to review
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            borderBottom: '1px solid #1E1E1E',
            marginBottom: '32px',
            overflowX: 'auto',
          }}
        >
          {['insights', 'optimizer', 'competitor', 'automation', 'query'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 20px',
                background: activeTab === tab ? '#111111' : 'transparent',
                border: activeTab === tab ? '1px solid #FFD700' : 'none',
                borderBottom: activeTab === tab ? '2px solid #FFD700' : '1px solid #1E1E1E',
                color: activeTab === tab ? '#FFD700' : '#888888',
                fontSize: '14px',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
            >
              {tab === 'insights' && '📊 AI Insights'}
              {tab === 'optimizer' && '✏️ Listing Optimizer'}
              {tab === 'competitor' && '👁️ Competitor Watch'}
              {tab === 'automation' && '⚙️ Automation Rules'}
              {tab === 'query' && '💬 Ask AI'}
            </button>
          ))}
        </div>

        {/* AI INSIGHTS TAB */}
        {activeTab === 'insights' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', gap: '12px' }}>
                <select
                  value={filterInsightType}
                  onChange={(e) => setFilterInsightType(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    background: '#111111',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="ppc_optimization">PPC Optimization</option>
                  <option value="inventory_alert">Inventory Alert</option>
                  <option value="price_suggestion">Price Suggestion</option>
                  <option value="listing_improvement">Listing Improvement</option>
                  <option value="competitor_threat">Competitor Threat</option>
                  <option value="growth_opportunity">Growth Opportunity</option>
                </select>

                <select
                  value={filterImpact}
                  onChange={(e) => setFilterImpact(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    background: '#111111',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                >
                  <option value="all">All Impact Levels</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <button
                onClick={handleGenerateInsights}
                style={{
                  padding: '10px 20px',
                  background: '#FFD700',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
              >
                🔄 Generate Insights
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredInsights.length === 0 ? (
                <div
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: '#111111',
                    border: '1px solid #1E1E1E',
                    borderRadius: '8px',
                    color: '#666666',
                  }}
                >
                  No insights available. Click "Generate Insights" to create some.
                </div>
              ) : (
                filteredInsights.map((insight) => (
                  <div
                    key={insight.id}
                    style={{
                      background: '#111111',
                      border: '1px solid #1E1E1E',
                      borderRadius: '8px',
                      padding: '20px',
                      opacity: insight.is_read ? 0.7 : 1,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>
                          {getInsightIcon(insight.insight_type)}
                        </span>
                        <div>
                          <h3 style={{ color: '#FFFFFF', fontSize: '14px', marginBottom: '4px' }}>
                            {insight.title}
                          </h3>
                          <p style={{ color: '#888888', fontSize: '12px', margin: 0 }}>
                            {insight.description}
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          background: getImpactBg(insight.impact_level),
                          border: `1px solid ${getImpactColor(insight.impact_level)}`,
                          color: getImpactColor(insight.impact_level),
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {insight.impact_level.toUpperCase()}
                      </div>
                    </div>

                    <div
                      style={{
                        background: '#0A0A0A',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '12px',
                        borderLeft: '3px solid #FFD700',
                      }}
                    >
                      <div style={{ color: '#FFD700', fontSize: '11px', fontWeight: 'bold' }}>
                        RECOMMENDED ACTION
                      </div>
                      <p style={{ color: '#CCCCCC', fontSize: '12px', margin: '4px 0 0 0' }}>
                        {insight.recommended_action}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!insight.is_read && (
                        <button
                          onClick={() => handleMarkInsightRead(insight.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#1E1E1E',
                            border: '1px solid #666666',
                            color: '#CCCCCC',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                          }}
                        >
                          ✓ Mark Read
                        </button>
                      )}
                      {!insight.is_acted && (
                        <button
                          onClick={() => handleMarkInsightActed(insight.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#FFD700',
                            color: '#0A0A0A',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                          }}
                        >
                          ⚡ Act on This
                        </button>
                      )}
                      {insight.is_acted && (
                        <div
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(76, 175, 80, 0.1)',
                            border: '1px solid #4CAF50',
                            color: '#4CAF50',
                            borderRadius: '4px',
                            fontSize: '11px',
                          }}
                        >
                          ✓ Acted
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* LISTING OPTIMIZER TAB */}
        {activeTab === 'optimizer' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Input Form */}
            <div
              style={{
                background: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '24px',
              }}
            >
              <h3 style={{ color: '#FFFFFF', fontSize: '14px', marginBottom: '16px' }}>
                Submit Listing for Optimization
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#888888', fontSize: '12px', display: 'block' }}>
                  ASIN
                </label>
                <input
                  type="text"
                  value={optForm.asin}
                  onChange={(e) => setOptForm({ ...optForm, asin: e.target.value })}
                  placeholder="B00XXXXXX"
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginTop: '4px',
                    background: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#888888', fontSize: '12px', display: 'block' }}>
                  Title
                </label>
                <input
                  type="text"
                  value={optForm.title}
                  onChange={(e) => setOptForm({ ...optForm, title: e.target.value })}
                  placeholder="Current product title"
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginTop: '4px',
                    background: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#888888', fontSize: '12px', display: 'block' }}>
                  Bullet Points
                </label>
                {optForm.bullets.map((bullet, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={bullet}
                    onChange={(e) => {
                      const newBullets = [...optForm.bullets];
                      newBullets[idx] = e.target.value;
                      setOptForm({ ...optForm, bullets: newBullets });
                    }}
                    placeholder={`Bullet ${idx + 1}`}
                    style={{
                      width: '100%',
                      padding: '8px',
                      marginTop: '4px',
                      marginBottom: '4px',
                      background: '#0A0A0A',
                      border: '1px solid #1E1E1E',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                ))}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#888888', fontSize: '12px', display: 'block' }}>
                  Backend Keywords (comma-separated)
                </label>
                <textarea
                  value={optForm.backendKeywords}
                  onChange={(e) => setOptForm({ ...optForm, backendKeywords: e.target.value })}
                  placeholder="keyword1, keyword2, keyword3"
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginTop: '4px',
                    background: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    minHeight: '60px',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <button
                onClick={handleOptimizeListing}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#FFD700',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
              >
                🚀 Optimize Listing
              </button>
            </div>

            {/* Results */}
            <div>
              <h3 style={{ color: '#FFFFFF', fontSize: '14px', marginBottom: '16px' }}>
                Recent Optimizations
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {optimizations.length === 0 ? (
                  <div
                    style={{
                      padding: '20px',
                      textAlign: 'center',
                      background: '#111111',
                      border: '1px solid #1E1E1E',
                      borderRadius: '8px',
                      color: '#666666',
                      fontSize: '12px',
                    }}
                  >
                    No optimizations yet
                  </div>
                ) : (
                  optimizations.slice(0, 3).map((opt) => (
                    <div
                      key={opt.id}
                      style={{
                        background: '#111111',
                        border: '1px solid #1E1E1E',
                        borderRadius: '8px',
                        padding: '16px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '8px',
                        }}
                      >
                        <div>
                          <div style={{ color: '#FFD700', fontSize: '11px', fontWeight: 'bold' }}>
                            {opt.asin}
                          </div>
                          <div style={{ color: '#CCCCCC', fontSize: '12px', marginTop: '2px' }}>
                            {opt.original_title.substring(0, 40)}...
                          </div>
                        </div>
                        <div
                          style={{
                            background:
                              opt.optimization_status === 'applied' ? '#4CAF50' : '#FFD700',
                            color: opt.optimization_status === 'applied' ? '#FFFFFF' : '#0A0A0A',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                          }}
                        >
                          {opt.optimization_status.toUpperCase()}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          fontSize: '11px',
                        }}
                      >
                        <div>
                          <div style={{ color: '#888888' }}>Before</div>
                          <div style={{ color: '#CCCCCC', fontWeight: 'bold' }}>
                            {opt.keyword_score_before.toFixed(0)} pts
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#888888' }}>After</div>
                          <div style={{ color: '#FFD700', fontWeight: 'bold' }}>
                            {opt.keyword_score_after.toFixed(0)} pts
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* COMPETITOR WATCH TAB */}
        {activeTab === 'competitor' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Add Watch Form */}
            <div
              style={{
                background: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '24px',
              }}
            >
              <h3 style={{ color: '#FFFFFF', fontSize: '14px', marginBottom: '16px' }}>
                Add Competitor Watch
              </h3>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: '#888888', fontSize: '12px', display: 'block' }}>
                  Our ASIN
                </label>
                <input
                  type="text"
                  value={watchForm.ourAsin}
                  onChange={(e) => setWatchForm({ ...watchForm, ourAsin: e.target.value })}
                  placeholder="B00XXXXXX"
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginTop: '4px',
                    background: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: '#888888', fontSize: '12px', display: 'block' }}>
                  Competitor ASIN
                </label>
                <input
                  type="text"
                  value={watchForm.competitorAsin}
                  onChange={(e) => setWatchForm({ ...watchForm, competitorAsin: e.target.value })}
                  placeholder="B00XXXXXX"
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginTop: '4px',
                    background: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: '#888888', fontSize: '12px', display: 'block' }}>
                  Competitor Brand
                </label>
                <input
                  type="text"
                  value={watchForm.competitorBrand}
                  onChange={(e) => setWatchForm({ ...watchForm, competitorBrand: e.target.value })}
                  placeholder="Brand Name"
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginTop: '4px',
                    background: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ color: '#888888', fontSize: '12px', display: 'block' }}>
                    Their Price
                  </label>
                  <input
                    type="number"
                    value={watchForm.competitorPrice}
                    onChange={(e) => setWatchForm({ ...watchForm, competitorPrice: e.target.value })}
                    placeholder="29.99"
                    style={{
                      width: '100%',
                      padding: '8px',
                      marginTop: '4px',
                      background: '#0A0A0A',
                      border: '1px solid #1E1E1E',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ color: '#888888', fontSize: '12px', display: 'block' }}>
                    Our Price
                  </label>
                  <input
                    type="number"
                    value={watchForm.ourPrice}
                    onChange={(e) => setWatchForm({ ...watchForm, ourPrice: e.target.value })}
                    placeholder="34.99"
                    style={{
                      width: '100%',
                      padding: '8px',
                      marginTop: '4px',
                      background: '#0A0A0A',
                      border: '1px solid #1E1E1E',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleCreateWatch}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#FFD700',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  marginTop: '8px',
                }}
              >
                👁️ Start Watching
              </button>
            </div>

            {/* Watches Table */}
            <div>
              <h3 style={{ color: '#FFFFFF', fontSize: '14px', marginBottom: '16px' }}>
                Active Watches ({watches.length})
              </h3>
              <div
                style={{
                  background: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                {watches.length === 0 ? (
                  <div
                    style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: '#666666',
                      fontSize: '12px',
                    }}
                  >
                    No competitor watches yet
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '11px',
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: '1px solid #1E1E1E',
                            background: '#0A0A0A',
                          }}
                        >
                          <th
                            style={{
                              padding: '8px',
                              textAlign: 'left',
                              color: '#888888',
                              fontWeight: 'bold',
                            }}
                          >
                            Our ASIN
                          </th>
                          <th
                            style={{
                              padding: '8px',
                              textAlign: 'left',
                              color: '#888888',
                              fontWeight: 'bold',
                            }}
                          >
                            Competitor Brand
                          </th>
                          <th
                            style={{
                              padding: '8px',
                              textAlign: 'center',
                              color: '#888888',
                              fontWeight: 'bold',
                            }}
                          >
                            Price Diff
                          </th>
                          <th
                            style={{
                              padding: '8px',
                              textAlign: 'center',
                              color: '#888888',
                              fontWeight: 'bold',
                            }}
                          >
                            Alert
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {watches.map((watch) => (
                          <tr
                            key={watch.id}
                            style={{
                              borderBottom: '1px solid #1E1E1E',
                              background: watch.alert_type ? '#1a1a1a' : '#111111',
                            }}
                          >
                            <td style={{ padding: '8px', color: '#FFD700' }}>
                              {watch.our_asin}
                            </td>
                            <td style={{ padding: '8px', color: '#CCCCCC' }}>
                              {watch.competitor_brand}
                            </td>
                            <td
                              style={{
                                padding: '8px',
                                textAlign: 'center',
                                color:
                                  watch.price_diff_pct < 0
                                    ? '#FF6B6B'
                                    : watch.price_diff_pct > 0
                                      ? '#4CAF50'
                                      : '#888888',
                                fontWeight: 'bold',
                              }}
                            >
                              {watch.price_diff_pct > 0 ? '+' : ''}
                              {watch.price_diff_pct.toFixed(1)}%
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              {watch.alert_type ? (
                                <span
                                  style={{
                                    background: 'rgba(255, 68, 68, 0.1)',
                                    color: '#FF4444',
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  {watch.alert_type.replace('_', ' ').toUpperCase()}
                                </span>
                              ) : (
                                <span style={{ color: '#666666' }}>—</span>
                              )}
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
        )}

        {/* AUTOMATION RULES TAB */}
        {activeTab === 'automation' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Create Rule Form */}
            <div
              style={{
                background: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '24px',
              }}
            >
              <h3 style={{ color: '#FFFFFF', fontSize: '14px', marginBottom: '16px' }}>
                Create Automation Rule
              </h3>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: '#888888', fontSize: '12px', display: 'block' }}>
                  Rule Name
                </label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  placeholder="e.g., High ACoS Alert"
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginTop: '4px',
                    background: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: '#888888', fontSize: '12px', display: 'block' }}>
                  Description
                </label>
                <textarea
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  placeholder="What does this rule do?"
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginTop: '4px',
                    background: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    minHeight: '50px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ color: '#888888', fontSize: '12px', display: 'block' }}>
                    Trigger Type
                  </label>
                  <select
                    value={ruleForm.triggerType}
                    onChange={(e) => setRuleForm({ ...ruleForm, triggerType: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      marginTop: '4px',
                      background: '#0A0A0A',
                      border: '1px solid #1E1E1E',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="schedule">Schedule</option>
                    <option value="threshold">Threshold</option>
                    <option value="event">Event</option>
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ color: '#888888', fontSize: '12px', display: 'block' }}>
                    Action Type
                  </label>
                  <select
                    value={ruleForm.actionType}
                    onChange={(e) => setRuleForm({ ...ruleForm, actionType: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      marginTop: '4px',
                      background: '#0A0A0A',
                      border: '1px solid #1E1E1E',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="alert">Alert</option>
                    <option value="report">Report</option>
                    <option value="email">Email</option>
                    <option value="task_create">Create Task</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleCreateRule}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#FFD700',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  marginTop: '8px',
                }}
              >
                ⚙️ Create Rule
              </button>
            </div>

            {/* Rules List */}
            <div>
              <h3 style={{ color: '#FFFFFF', fontSize: '14px', marginBottom: '16px' }}>
                Active Rules ({rules.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rules.length === 0 ? (
                  <div
                    style={{
                      padding: '20px',
                      textAlign: 'center',
                      background: '#111111',
                      border: '1px solid #1E1E1E',
                      borderRadius: '8px',
                      color: '#666666',
                      fontSize: '12px',
                    }}
                  >
                    No automation rules yet
                  </div>
                ) : (
                  rules.map((rule) => (
                    <div
                      key={rule.id}
                      style={{
                        background: '#111111',
                        border: '1px solid #1E1E1E',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '8px',
                        }}
                      >
                        <div>
                          <div style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 'bold' }}>
                            {rule.name}
                          </div>
                          <div style={{ color: '#888888', fontSize: '10px', marginTop: '2px' }}>
                            {rule.description}
                          </div>
                        </div>
                        <div
                          style={{
                            background: rule.is_active ? '#4CAF50' : '#666666',
                            color: '#FFFFFF',
                            padding: '3px 8px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                          }}
                        >
                          {rule.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          fontSize: '10px',
                          marginBottom: '8px',
                        }}
                      >
                        <div>
                          <div style={{ color: '#888888' }}>Trigger</div>
                          <div style={{ color: '#CCCCCC' }}>
                            {rule.trigger_type.toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#888888' }}>Action</div>
                          <div style={{ color: '#CCCCCC' }}>
                            {rule.action_type.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '9px', color: '#666666' }}>
                        Triggered {rule.trigger_count} times
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ASK AI TAB */}
        {activeTab === 'query' && (
          <div>
            <div
              style={{
                background: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px',
              }}
            >
              <h3 style={{ color: '#FFFFFF', fontSize: '14px', marginBottom: '12px' }}>
                Example Queries
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                {[
                  'Show clients with ACoS > 30%',
                  'Low stock items',
                  'Top performing keywords',
                  'Competitor price changes',
                ].map((query) => (
                  <button
                    key={query}
                    onClick={() => {
                      setQueryInput(query);
                      setTimeout(() => {
                        const tempInput = query;
                        setQueryInput(tempInput);
                        handleQuery();
                      }, 50);
                    }}
                    style={{
                      padding: '8px 12px',
                      background: '#0A0A0A',
                      border: '1px solid #1E1E1E',
                      borderRadius: '6px',
                      color: '#FFD700',
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                    }}
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>

            {/* Query Input */}
            <div
              style={{
                background: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
                  placeholder="Ask me anything about your business..."
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                />
                <button
                  onClick={handleQuery}
                  style={{
                    padding: '12px 20px',
                    background: '#FFD700',
                    color: '#0A0A0A',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                >
                  🔍 Search
                </button>
              </div>
            </div>

            {/* Query Results */}
            {queryResults && (
              <div
                style={{
                  background: '#111111',
                  border: '1px solid #FFD700',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px',
                  }}
                >
                  <div>
                    <h3 style={{ color: '#FFD700', fontSize: '12px', margin: 0, marginBottom: '4px' }}>
                      PARSED INTENT
                    </h3>
                    <p style={{ color: '#CCCCCC', fontSize: '12px', margin: 0 }}>
                      {queryResults.parsed_intent}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    background: '#0A0A0A',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    borderLeft: '3px solid #FFD700',
                  }}
                >
                  <div style={{ color: '#FFD700', fontSize: '11px', fontWeight: 'bold' }}>
                    RESULTS SUMMARY
                  </div>
                  <p style={{ color: '#CCCCCC', fontSize: '12px', margin: '4px 0 0 0' }}>
                    {queryResults.summary}
                  </p>
                </div>

                <div>
                  <div style={{ color: '#FFD700', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
                    RESULTS ({queryResults.results.length})
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '8px',
                    }}
                  >
                    {queryResults.results.map((result, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#1E1E1E',
                          padding: '8px',
                          borderRadius: '4px',
                          border: '1px solid #2E2E2E',
                        }}
                      >
                        <div style={{ color: '#888888', fontSize: '10px' }}>
                          {result.name}
                        </div>
                        <div
                          style={{
                            color: '#FFD700',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            marginTop: '4px',
                          }}
                        >
                          {result.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
