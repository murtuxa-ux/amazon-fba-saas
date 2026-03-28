import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

const colors = {
  bg: '#0A0A0A',
  card: '#111111',
  border: '#1E1E1E',
  accent: '#FFD700',
  text: '#FFFFFF',
  secText: '#888888',
  success: '#00C853',
  warning: '#FFC107',
  error: '#FF5252',
  info: '#2196F3',
};

export default function AccountHealth() {
  const router = useRouter();
  const [overview, setOverview] = useState(null);
  const [violations, setViolations] = useState([]);
  const [benchmarks, setBenchmarks] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showViolationForm, setShowViolationForm] = useState(false);
  const [violationForm, setViolationForm] = useState({
    type: '',
    severity: 'medium',
    description: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('ecomera_token');
    const user = localStorage.getItem('ecomera_user');
    if (!token || !user) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ecomera_token');
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const safeFetch = async (url) => { try { const r = await fetch(url, { headers }); if (!r.ok) return null; return await r.json(); } catch(e) { return null; } };

      const [overviewData, violationsData, benchmarksData, alertsData] = await Promise.all([
        safeFetch(`${API_URL}/account-health/overview`),
        safeFetch(`${API_URL}/account-health/violations`),
        safeFetch(`${API_URL}/account-health/benchmarks`),
        safeFetch(`${API_URL}/account-health/alerts`),
      ]);

      setOverview(overviewData || {});
      setViolations(violationsData && Array.isArray(violationsData.violations) ? violationsData.violations : []);
      setBenchmarks(benchmarksData || {});
      setAlerts(alertsData && Array.isArray(alertsData.alerts) ? alertsData.alerts : []);
      setError(null)
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogViolation = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${API_URL}/account-health/violations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(violationForm),
      });
      if (!response.ok) throw new Error('Failed to log violation');
      await fetchData();
      setShowViolationForm(false);
      setViolationForm({ type: '', severity: 'medium', description: '' });
    } catch (err) {
      alert('Error logging violation: ' + err.message);
    }
  };

  const getHealthColor = (score) => {
    if (score > 80) return colors.success;
    if (score >= 50) return colors.warning;
    return colors.error;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return colors.error;
      case 'high':
        return colors.warning;
      case 'medium':
        return colors.info;
      default:
        return colors.success;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.bg }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem' }}>
          <div style={{ color: colors.text }}>Loading...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.bg }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem' }}>
          <div style={{ color: colors.error }}>Error: {error}</div>
          <button
            onClick={fetchData}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: colors.accent,
              color: colors.bg,
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Retry
          </button>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.bg }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '2rem', color: colors.text }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Account Health Monitor</h1>
          <p style={{ color: colors.secText, margin: '0.5rem 0 0 0' }}>
            Track seller account health and suspension risk
          </p>
        </div>

        {/* Alerts Section */}
        {Array.isArray(alerts) && alerts.length > 0 && (
          <div
            style={{
              backgroundColor: '#2D1B1B',
              border: `1px solid ${colors.error}`,
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '2rem',
            }}
          >
            <h3 style={{ marginTop: 0, color: colors.error, fontSize: '0.95rem' }}>URGENT ALERTS</h3>
            {alerts.map((alert, idx) => (
              <div key={idx} style={{ color: colors.text, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                • {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Health Score Card */}
        {overview && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '0.75rem',
                padding: '1.5rem',
                textAlign: 'center',
              }}
            >
              <h3 style={{ marginTop: 0, color: colors.secText, fontSize: '0.9rem' }}>HEALTH SCORE</h3>
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: getHealthColor(overview.healthScore),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '1rem auto',
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  color: colors.bg,
                }}
              >
                {overview.healthScore}
              </div>
              <p style={{ color: colors.text, margin: '0.5rem 0', fontSize: '0.95rem' }}>
                Status: <span style={{ color: getHealthColor(overview.healthScore) }}>{overview.status}</span>
              </p>
            </div>

            {/* Risk Assessment Card */}
            <div
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '0.75rem',
                padding: '1.5rem',
              }}
            >
              <h3 style={{ marginTop: 0, color: colors.secText, fontSize: '0.9rem' }}>RISK ASSESSMENT</h3>
              <div
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  backgroundColor: getSeverityColor(overview.riskLevel),
                  color: colors.bg,
                  borderRadius: '0.35rem',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {(overview.riskLevel || "N/A").toUpperCase()}
              </div>
              <p style={{ color: colors.text, margin: '0.5rem 0', fontWeight: 'bold' }}>
                Risk Score: {overview.riskScore}%
              </p>
              <div style={{ fontSize: '0.9rem', color: colors.secText }}>
                {Array.isArray(overview.riskFactors) &&
                  (overview.riskFactors || []).map((factor, idx) => (
                    <div key={idx} style={{ marginBottom: '0.35rem' }}>
                      • {factor}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        {benchmarks && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            {[
              {
                label: 'Order Defect Rate',
                current: benchmarks.odr?.current,
                target: benchmarks.odr?.target,
                critical: benchmarks.odr?.critical,
              },
              {
                label: 'Late Shipment Rate',
                current: benchmarks.lsr?.current,
                target: benchmarks.lsr?.target,
                critical: benchmarks.lsr?.critical,
              },
              {
                label: 'Valid Tracking Rate',
                current: benchmarks.vtr?.current,
                target: benchmarks.vtr?.target,
                critical: benchmarks.vtr?.critical,
              },
              {
                label: 'IP Complaints',
                current: benchmarks.ipComplaints?.current,
                target: benchmarks.ipComplaints?.target,
                critical: benchmarks.ipComplaints?.critical,
              },
              {
                label: 'Listing Violations',
                current: benchmarks.listingViolations?.current,
                target: benchmarks.listingViolations?.target,
                critical: benchmarks.listingViolations?.critical,
              },
              {
                label: 'Stranded Inventory',
                current: benchmarks.strandedInventory?.current,
                target: benchmarks.strandedInventory?.target,
                critical: benchmarks.strandedInventory?.critical,
              },
            ].map((metric, idx) => {
              const getStatus = () => {
                if (metric.current > metric.critical) return { color: colors.error, text: 'FAIL' };
                if (metric.current > metric.target) return { color: colors.warning, text: 'WARNING' };
                return { color: colors.success, text: 'PASS' };
              };
              const status = getStatus();
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '0.75rem',
                    padding: '1rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <h4 style={{ margin: 0, color: colors.secText, fontSize: '0.85rem' }}>{metric.label}</h4>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: status.color,
                        color: colors.bg,
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {status.text}
                    </span>
                  </div>
                  <p style={{ margin: '0.5rem 0', color: colors.text, fontWeight: 'bold' }}>
                    {metric.current}
                  </p>
                  <div style={{ fontSize: '0.8rem', color: colors.secText }}>
                    <div>Target: {metric.target}</div>
                    <div>Critical: {metric.critical}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Violations Section */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Violations</h2>
            <button
              onClick={() => setShowViolationForm(!showViolationForm)}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: colors.accent,
                color: colors.bg,
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {showViolationForm ? 'Cancel' : 'Log Violation'}
            </button>
          </div>

          {showViolationForm && (
            <div
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '0.75rem',
                padding: '1.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Violation Type"
                  value={violationForm.type}
                  onChange={(e) => setViolationForm({ ...violationForm, type: e.target.value })}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '0.5rem',
                  }}
                />
                <select
                  value={violationForm.severity}
                  onChange={(e) => setViolationForm({ ...violationForm, severity: e.target.value })}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '0.5rem',
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <textarea
                placeholder="Description"
                value={violationForm.description}
                onChange={(e) => setViolationForm({ ...violationForm, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.5rem',
                  marginTop: '1rem',
                  minHeight: '80px',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={handleLogViolation}
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: colors.success,
                  color: colors.bg,
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Submit
              </button>
            </div>
          )}

          {Array.isArray(violations) && violations.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  backgroundColor: colors.card,
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Type
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Severity
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Status
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Description
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: colors.secText, fontWeight: 'bold' }}>
                      Deadline
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '1rem', color: colors.text }}>{v.type}</td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            padding: '0.35rem 0.75rem',
                            backgroundColor: getSeverityColor(v.severity),
                            color: colors.bg,
                            borderRadius: '0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                          }}
                        >
                          {(v.severity || "N/A").toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            padding: '0.35rem 0.75rem',
                            backgroundColor:
                              v.status === 'open'
                                ? colors.error
                                : v.status === 'resolved'
                                  ? colors.success
                                  : colors.info,
                            color: colors.bg,
                            borderRadius: '0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                          }}
                        >
                          {(v.status || "N/A").toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: colors.text, fontSize: '0.9rem' }}>{v.description}</td>
                      <td
                        style={{
                          padding: '1rem',
                          color: v.daysUntilDeadline < 7 ? colors.error : colors.text,
                          fontWeight: v.daysUntilDeadline < 7 ? 'bold' : 'normal',
                        }}
                      >
                        {v.deadline} ({v.daysUntilDeadline}d)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '0.75rem',
                padding: '2rem',
                textAlign: 'center',
                color: colors.secText,
              }}
            >
              No violations found. Great job!
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
