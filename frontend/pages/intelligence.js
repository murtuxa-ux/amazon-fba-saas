import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const COLORS = {
  bg: '#0A0A0A',
  card: '#111111',
  border: '#1E1E1E',
  accent: '#FFD700',
  text: '#FFFFFF',
  textSec: '#888888',
  green: '#22C55E',
  red: '#EF4444',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  orange: '#F59E0B',
};

const SEVERITY_COLORS = {
  critical: COLORS.red,
  high: COLORS.orange,
  medium: '#FBBF24',
  low: COLORS.blue,
};

export default function Intelligence() {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [risks, setRisks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Tab 2 state - Opportunities
  const [minScore, setMinScore] = useState(0);

  // Tab 3 state - Risks
  const [riskFilter, setRiskFilter] = useState('all');

  // Tab 4 state - Alerts
  const [alertTypeFilter, setAlertTypeFilter] = useState('all');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState('all');
  const [alertReadFilter, setAlertReadFilter] = useState('all');

  // Tab 5 state - Score Product
  const [asinInput, setAsinInput] = useState('');
  const [scoringResult, setScoringResult] = useState(null);
  const [scoringLoading, setScoringLoading] = useState(false);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/intelligence/dashboard`);
      const data = await res.json();
      setDashboardData(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error(err);
    }
    setLoading(false);
  }, [apiBase]);

  // Fetch opportunities
  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/intelligence/opportunities?min_score=${minScore}`);
      const data = await res.json();
      setOpportunities(Array.isArray(data) ? data : data.opportunities || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch opportunities');
      console.error(err);
    }
    setLoading(false);
  }, [apiBase, minScore]);

  // Fetch risks
  const fetchRisks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/intelligence/risks`);
      const data = await res.json();
      setRisks(Array.isArray(data) ? data : data.risks || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch risks');
      console.error(err);
    }
    setLoading(false);
  }, [apiBase]);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/intelligence/alerts`);
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : data.alerts || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch alerts');
      console.error(err);
    }
    setLoading(false);
  }, [apiBase]);

  // Fetch recent scores
  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/intelligence/scores`);
      const data = await res.json();
      setScores(Array.isArray(data) ? data : data.scores || []);
    } catch (err) {
      console.error('Failed to fetch scores:', err);
    }
  }, [apiBase]);

  // Tab switching - fetch data on demand
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
    } else if (activeTab === 'opportunities') {
      fetchOpportunities();
    } else if (activeTab === 'risks') {
      fetchRisks();
    } else if (activeTab === 'alerts') {
      fetchAlerts();
    } else if (activeTab === 'score') {
      fetchScores();
    }
  }, [activeTab, minScore, fetchDashboard, fetchOpportunities, fetchRisks, fetchAlerts, fetchScores]);

  // Mark alert as read
  const markAlertRead = async (alertId) => {
    try {
      await fetch(`${apiBase}/intelligence/alerts/${alertId}/read`, { method: 'PUT' });
      fetchAlerts();
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  // Dismiss alert
  const dismissAlert = async (alertId) => {
    try {
      await fetch(`${apiBase}/intelligence/alerts/${alertId}/dismiss`, { method: 'PUT' });
      fetchAlerts();
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    }
  };

  // Mark all alerts as read
  const markAllAlertsRead = async () => {
    try {
      await fetch(`${apiBase}/intelligence/alerts/read-all`, { method: 'PUT' });
      fetchAlerts();
    } catch (err) {
      console.error('Failed to mark all alerts as read:', err);
    }
  };

  // Score a product
  const scoreProduct = async () => {
    if (!asinInput.trim()) {
      setError('Please enter an ASIN');
      return;
    }
    setScoringLoading(true);
    try {
      const res = await fetch(`${apiBase}/intelligence/score/${asinInput.trim()}`);
      const data = await res.json();
      setScoringResult(data);
      setAsinInput('');
      setError('');
      fetchScores();
    } catch (err) {
      setError('Failed to score product. Check ASIN and try again.');
      console.error(err);
    }
    setScoringLoading(false);
  };

  const tabStyle = {
    padding: '24px',
    color: COLORS.text,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: COLORS.bg }}>
      <Sidebar />

      <main style={{ flex: 1, overflow: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: `1px solid ${COLORS.border}` }}>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '600' }}>Intelligence Hub</h1>
          <p style={{ margin: '8px 0 0 0', color: COLORS.textSec }}>
            AI-powered insights for FBA wholesale opportunities
          </p>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: `1px solid ${COLORS.border}`,
            backgroundColor: COLORS.card,
            paddingLeft: '24px',
          }}
        >
          {['Dashboard', 'Opportunities', 'Risks', 'Alerts', 'Score Product'].map((label, idx) => {
            const tabKey = label.toLowerCase().replace(' ', '');
            const isActive = activeTab === tabKey;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(tabKey)}
                style={{
                  padding: '16px 20px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: isActive ? COLORS.accent : COLORS.textSec,
                  borderBottom: isActive ? `2px solid ${COLORS.accent}` : 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: isActive ? '600' : '400',
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              margin: '16px 24px',
              padding: '12px 16px',
              backgroundColor: '#1F0F0F',
              border: `1px solid ${COLORS.red}`,
              borderRadius: '6px',
              color: COLORS.red,
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div style={tabStyle}>
            {loading && <p style={{ color: COLORS.textSec }}>Loading...</p>}
            {dashboardData && !loading && (
              <>
                {/* Stats Bar */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '32px',
                  }}
                >
                  {[
                    { label: 'Total Alerts', value: dashboardData.totalAlerts || 0, color: COLORS.red },
                    { label: 'Opportunities Found', value: dashboardData.opportunitiesFound || 0, color: COLORS.green },
                    { label: 'Risks Flagged', value: dashboardData.risksFlagged || 0, color: COLORS.orange },
                    { label: 'Products Scored', value: dashboardData.productsScored || 0, color: COLORS.blue },
                  ].map((stat, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '8px',
                        padding: '20px',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '12px', color: COLORS.textSec, textTransform: 'uppercase' }}>
                        {stat.label}
                      </p>
                      <p
                        style={{
                          margin: '8px 0 0 0',
                          fontSize: '28px',
                          fontWeight: '700',
                          color: stat.color,
                        }}
                      >
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Top Opportunities */}
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Top Opportunities</h2>
                  <div
                    style={{
                      backgroundColor: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '8px',
                      padding: '20px',
                    }}
                  >
                    {dashboardData.topOpportunities && dashboardData.topOpportunities.length > 0 ? (
                      dashboardData.topOpportunities.slice(0, 5).map((opp, idx) => (
                        <div key={idx} style={{ marginBottom: idx < 4 ? '16px' : 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <p style={{ margin: 0, fontSize: '14px' }}>{opp.title || opp.asin}</p>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: COLORS.accent }}>
                              {opp.score}
                            </p>
                          </div>
                          <div
                            style={{
                              height: '6px',
                              backgroundColor: COLORS.border,
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${Math.min(opp.score, 100)}%`,
                                backgroundColor: COLORS.accent,
                              }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: COLORS.textSec }}>No opportunities yet</p>
                    )}
                  </div>
                </div>

                {/* Active Alerts */}
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Active Alerts</h2>
                  <div
                    style={{
                      backgroundColor: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '8px',
                      padding: '20px',
                    }}
                  >
                    {dashboardData.activeAlerts && dashboardData.activeAlerts.length > 0 ? (
                      dashboardData.activeAlerts.map((alert, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 0',
                            borderBottom: idx < dashboardData.activeAlerts.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '14px' }}>{alert.title}</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: COLORS.textSec }}>
                              {alert.type}
                            </p>
                          </div>
                          <span
                            style={{
                              padding: '4px 8px',
                              backgroundColor: SEVERITY_COLORS[alert.severity] || COLORS.blue,
                              color: COLORS.bg,
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                            }}
                          >
                            {alert.severity}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: COLORS.textSec }}>No active alerts</p>
                    )}
                  </div>
                </div>

                {/* Risk Summary */}
                <div style={{}}>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Risk Summary</h2>
                  <div
                    style={{
                      backgroundColor: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '8px',
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    {dashboardData.riskSummary && dashboardData.riskSummary.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={dashboardData.riskSummary}
                            dataKey="count"
                            nameKey="level"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                          >
                            {dashboardData.riskSummary.map((entry, idx) => (
                              <Cell
                                key={idx}
                                fill={
                                  entry.level === 'high'
                                    ? COLORS.red
                                    : entry.level === 'medium'
                                    ? COLORS.orange
                                    : entry.level === 'low'
                                    ? COLORS.blue
                                    : COLORS.green
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p style={{ color: COLORS.textSec }}>No risk data</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* OPPORTUNITIES TAB */}
        {activeTab === 'opportunities' && (
          <div style={tabStyle}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Minimum Score: {minScore}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => setMinScore(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  backgroundColor: COLORS.border,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
            </div>

            {loading && <p style={{ color: COLORS.textSec }}>Loading opportunities...</p>}

            {!loading && opportunities.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px',
                }}
              >
                {opportunities.map((opp, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '8px',
                      padding: '20px',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '12px', color: COLORS.textSec }}>ASIN</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: '600' }}>{opp.asin}</p>

                    <p style={{ margin: '12px 0 4px 0', fontSize: '12px', color: COLORS.textSec }}>TITLE</p>
                    <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>{opp.title || 'N/A'}</p>

                    <p style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: COLORS.accent }}>
                      {opp.score}
                    </p>

                    <p style={{ margin: '16px 0 8px 0', fontSize: '11px', color: COLORS.textSec, textTransform: 'uppercase' }}>
                      Score Breakdown
                    </p>
                    {[
                      { label: 'Opportunity', value: opp.opportunityScore, color: COLORS.accent },
                      { label: 'Demand', value: opp.demandScore, color: COLORS.green },
                      { label: 'Competition', value: opp.competitionScore, color: COLORS.blue },
                      { label: 'Risk', value: opp.riskScore, color: COLORS.red },
                    ].map((score, si) => (
                      <div key={si} style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px' }}>{score.label}</span>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: score.color }}>
                            {score.value || 0}
                          </span>
                        </div>
                        <div
                          style={{
                            height: '4px',
                            backgroundColor: COLORS.border,
                            borderRadius: '2px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(score.value || 0, 100)}%`,
                              backgroundColor: score.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {!loading && opportunities.length === 0 && (
              <p style={{ color: COLORS.textSec }}>No opportunities found with current filters</p>
            )}
          </div>
        )}

        {/* RISKS TAB */}
        {activeTab === 'risks' && (
          <div style={tabStyle}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Filter by Severity
              </label>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Risks</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {loading && <p style={{ color: COLORS.textSec }}>Loading risks...</p>}

            {!loading && risks.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px',
                }}
              >
                {risks
                  .filter((risk) => riskFilter === 'all' || risk.severity === riskFilter)
                  .map((risk, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '8px',
                        padding: '20px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            backgroundColor: SEVERITY_COLORS[risk.severity] || COLORS.blue,
                            color: COLORS.bg,
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                          }}
                        >
                          {risk.severity}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: COLORS.textSec }}>ASIN</p>
                      <p style={{ margin: '4px 0 12px 0', fontSize: '14px', fontWeight: '600' }}>{risk.asin}</p>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: COLORS.textSec }}>
                        {risk.description}
                      </p>
                      {risk.relatedData && (
                        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: COLORS.border, borderRadius: '4px' }}>
                          <p style={{ margin: 0, fontSize: '12px' }}>{risk.relatedData}</p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {!loading && risks.length === 0 && (
              <p style={{ color: COLORS.textSec }}>No risks found</p>
            )}
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div style={tabStyle}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px',
                marginBottom: '24px',
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500' }}>
                  TYPE
                </label>
                <select
                  value={alertTypeFilter}
                  onChange={(e) => setAlertTypeFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="price_drop">Price Drop</option>
                  <option value="inventory">Inventory</option>
                  <option value="competition">Competition</option>
                  <option value="compliance">Compliance</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500' }}>
                  SEVERITY
                </label>
                <select
                  value={alertSeverityFilter}
                  onChange={(e) => setAlertSeverityFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500' }}>
                  STATUS
                </label>
                <select
                  value={alertReadFilter}
                  onChange={(e) => setAlertReadFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
              </div>
            </div>

            {alerts.length > 0 && (
              <button
                onClick={markAllAlertsRead}
                style={{
                  marginBottom: '16px',
                  padding: '8px 16px',
                  backgroundColor: COLORS.accent,
                  color: COLORS.bg,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Mark All Read
              </button>
            )}

            {loading && <p style={{ color: COLORS.textSec }}>Loading alerts...</p>}

            {!loading && alerts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {alerts
                  .filter(
                    (alert) =>
                      (alertTypeFilter === 'all' || alert.type === alertTypeFilter) &&
                      (alertSeverityFilter === 'all' || alert.severity === alertSeverityFilter) &&
                      (alertReadFilter === 'all' || (alertReadFilter === 'unread' ? !alert.read : alert.read))
                  )
                  .map((alert, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '8px',
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              backgroundColor: SEVERITY_COLORS[alert.severity] || COLORS.blue,
                              color: COLORS.bg,
                              borderRadius: '3px',
                              fontSize: '10px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                            }}
                          >
                            {alert.severity}
                          </span>
                          <span
                            style={{
                              padding: '2px 6px',
                              backgroundColor: COLORS.border,
                              color: COLORS.textSec,
                              borderRadius: '3px',
                              fontSize: '10px',
                              textTransform: 'uppercase',
                            }}
                          >
                            {alert.type}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0', fontSize: '14px', fontWeight: '500' }}>{alert.title}</p>
                        <p style={{ margin: '4px 0 8px 0', fontSize: '12px', color: COLORS.textSec }}>
                          {alert.description}
                        </p>
                        <p style={{ margin: 0, fontSize: '11px', color: COLORS.textSec }}>
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                        {!alert.read && (
                          <button
                            onClick={() => markAlertRead(alert.id)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: COLORS.blue,
                              color: COLORS.text,
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: COLORS.border,
                            color: COLORS.textSec,
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {!loading && alerts.length === 0 && (
              <p style={{ color: COLORS.textSec }}>No alerts</p>
            )}
          </div>
        )}

        {/* SCORE PRODUCT TAB */}
        {activeTab === 'scoreproduct' && (
          <div style={tabStyle}>
            {/* Score Input */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Score a Product</h2>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <input
                  type="text"
                  value={asinInput}
                  onChange={(e) => setAsinInput(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && scoreProduct()}
                  placeholder="Enter ASIN (e.g., B00ABC123XYZ)"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    backgroundColor: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                <button
                  onClick={scoreProduct}
                  disabled={scoringLoading}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: scoringLoading ? COLORS.textSec : COLORS.accent,
                    color: COLORS.bg,
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: scoringLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {scoringLoading ? 'Scoring...' : 'Score'}
                </button>
              </div>
            </div>

            {/* Scoring Result */}
            {scoringResult && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Scoring Result</h2>
                <div
                  style={{
                    backgroundColor: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '8px',
                    padding: '24px',
                  }}
                >
                  {/* Overall Score */}
                  <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: COLORS.textSec, textTransform: 'uppercase' }}>
                      Overall Score
                    </p>
                    <p
                      style={{
                        margin: '12px 0',
                        fontSize: '56px',
                        fontWeight: '700',
                        color:
                          scoringResult.overallScore >= 75
                            ? COLORS.green
                            : scoringResult.overallScore >= 50
                            ? COLORS.orange
                            : COLORS.red,
                      }}
                    >
                      {scoringResult.overallScore}
                    </p>
                  </div>

                  {/* Sub Scores */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {[
                      { label: 'Opportunity', key: 'opportunityScore', color: COLORS.accent, weight: '35%' },
                      { label: 'Demand', key: 'demandScore', color: COLORS.green, weight: '30%' },
                      { label: 'Competition', key: 'competitionScore', color: COLORS.blue, weight: '20%' },
                      { label: 'Risk (Inverse)', key: 'riskScore', color: COLORS.red, weight: '15%' },
                    ].map((score, idx) => (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '500' }}>
                            {score.label} <span style={{ color: COLORS.textSec }}>({score.weight})</span>
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: score.color }}>
                            {scoringResult[score.key] || 0}
                          </span>
                        </div>
                        <div
                          style={{
                            height: '8px',
                            backgroundColor: COLORS.border,
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(scoringResult[score.key] || 0, 100)}%`,
                              backgroundColor: score.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Scoring Factors */}
                  {scoringResult.factors && scoringResult.factors.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Scoring Factors</h3>
                      <div style={{ backgroundColor: COLORS.bg, borderRadius: '6px', padding: '12px' }}>
                        {scoringResult.factors.map((factor, idx) => (
                          <div key={idx} style={{ padding: '8px 0', fontSize: '12px' }}>
                            <span style={{ color: COLORS.textSec }}>{factor.name}:</span>{' '}
                            <span style={{ color: COLORS.text, fontWeight: '500' }}>{factor.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recently Scored */}
            {scores.length > 0 && (
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Recently Scored</h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {scores.slice(0, 6).map((score, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '8px',
                        padding: '16px',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '12px', color: COLORS.textSec }}>ASIN</p>
                      <p style={{ margin: '4px 0 12px 0', fontSize: '14px', fontWeight: '600' }}>{score.asin}</p>
                      <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: COLORS.accent }}>
                        {score.score || score.overallScore}
                      </p>
                      <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: COLORS.textSec }}>
                        {new Date(score.scoredAt || score.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
