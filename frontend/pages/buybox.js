import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

export default function BuyBoxTracker() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [trackedAsins, setTrackedAsins] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [newAsin, setNewAsin] = useState('');
  const [isAddingAsin, setIsAddingAsin] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Auth check on mount
  useEffect(() => {
    const token = localStorage.getItem('ecomera_token');
    const user = localStorage.getItem('ecomera_user');

    if (!token || !user) {
      router.push('/login');
      return;
    }

    setIsAuthenticated(true);
  }, [router]);

  // Fetch all data
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('ecomera_token');

        // Fetch analytics
        const analyticsRes = await fetch(`${API_URL}/buybox/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (analyticsRes.ok) {
          setAnalytics(await analyticsRes.json());
        }

        // Fetch tracked ASINs
        const asinsRes = await fetch(`${API_URL}/buybox/tracked`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (asinsRes.ok) {
          const data = await asinsRes.json();
          setTrackedAsins(Array.isArray(data) ? data : []);
        } else {
          setTrackedAsins([]);
        }

        // Fetch alerts
        const alertsRes = await fetch(`${API_URL}/buybox/alerts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (alertsRes.ok) {
          const data = await alertsRes.json();
          setAlerts(Array.isArray(data) ? data : []);
        } else {
          setAlerts([]);
        }
      } catch (err) {
        setError('Failed to load buy box data. Please try again.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  const handleAddAsin = async () => {
    if (!newAsin.trim()) {
      setError('Please enter a valid ASIN');
      return;
    }

    try {
      setIsAddingAsin(true);
      setError(null);
      const token = localStorage.getItem('ecomera_token');

      const res = await fetch(`${API_URL}/buybox/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ asin: newAsin.toUpperCase() })
      });

      if (res.ok) {
        setSuccessMessage(`Successfully tracking ASIN ${newAsin.toUpperCase()}`);
        setNewAsin('');
        // Refresh tracked ASINs
        const asinsRes = await fetch(`${API_URL}/buybox/tracked`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (asinsRes.ok) {
          const data = await asinsRes.json();
          setTrackedAsins(Array.isArray(data) ? data : []);
        }
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to track ASIN');
      }
    } catch (err) {
      setError('Error tracking ASIN. Please try again.');
      console.error('Error:', err);
    } finally {
      setIsAddingAsin(false);
    }
  };

  const handleRemoveAsin = async (asin) => {
    if (!confirm(`Remove ASIN ${asin} from tracking?`)) return;

    try {
      const token = localStorage.getItem('ecomera_token');
      const res = await fetch(`${API_URL}/buybox/tracked/${asin}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setTrackedAsins(trackedAsins.filter(item => item.asin !== asin));
        setSuccessMessage(`Removed ASIN ${asin} from tracking`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError('Failed to remove ASIN');
      console.error('Error:', err);
    }
  };

  const handleMarkAlertRead = async (alertId) => {
    try {
      const token = localStorage.getItem('ecomera_token');
      await fetch(`${API_URL}/buybox/alerts/${alertId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Error marking alert as read:', err);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' }}>
      <Sidebar />
      {/* BUG-33 Sprint 2: marginLeft offsets the position:fixed Sidebar. */}
      <main style={{ flex: 1, marginLeft: '250px', padding: '24px', overflowY: 'auto', backgroundColor: '#0A0A0A' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#FFFFFF', margin: '0 0 8px 0' }}>
            Buy Box Tracker
          </h1>
          <p style={{ fontSize: '14px', color: '#888888', margin: 0 }}>
            Monitor buy box status across all your wholesale ASINs
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            backgroundColor: '#FF5252',
            color: '#FFFFFF',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
        {successMessage && (
          <div style={{
            backgroundColor: '#00C853',
            color: '#FFFFFF',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {successMessage}
          </div>
        )}

        {loading ? (
          <div style={{ color: '#888888', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
            Loading buy box data...
          </div>
        ) : (
          <>
            {/* Analytics Row */}
            {analytics && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '32px'
              }}>
                <div style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <p style={{ fontSize: '12px', color: '#888888', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                    Overall Win Rate
                  </p>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFD700', margin: 0 }}>
                    {analytics.winRate || 0}%
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <p style={{ fontSize: '12px', color: '#888888', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                    Total Tracked
                  </p>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFFFFF', margin: 0 }}>
                    {analytics.totalTracked || 0}
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <p style={{ fontSize: '12px', color: '#888888', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                    Currently Winning
                  </p>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#00C853', margin: 0 }}>
                    {analytics.currentlyWinning || 0}
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <p style={{ fontSize: '12px', color: '#888888', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                    Currently Losing
                  </p>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#FF5252', margin: 0 }}>
                    {analytics.currentlyLosing || 0}
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <p style={{ fontSize: '12px', color: '#888888', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                    Suppressed
                  </p>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFC107', margin: 0 }}>
                    {analytics.suppressed || 0}
                  </p>
                </div>
              </div>
            )}

            {/* Track New ASIN Section */}
            <div style={{
              backgroundColor: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '32px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#FFFFFF', margin: '0 0 16px 0' }}>
                Track New ASIN
              </h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#888888',
                    marginBottom: '8px',
                    textTransform: 'uppercase'
                  }}>
                    ASIN
                  </label>
                  <input
                    type="text"
                    value={newAsin}
                    onChange={(e) => setNewAsin(e.target.value)}
                    placeholder="Enter ASIN (e.g., B0ABC123XY)"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddAsin()}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #1E1E1E',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button
                  onClick={handleAddAsin}
                  disabled={isAddingAsin}
                  style={{
                    backgroundColor: '#FFD700',
                    color: '#0A0A0A',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: isAddingAsin ? 'not-allowed' : 'pointer',
                    opacity: isAddingAsin ? 0.6 : 1
                  }}
                >
                  {isAddingAsin ? 'Adding...' : 'Add ASIN'}
                </button>
              </div>
            </div>

            {/* Tracked ASINs Table */}
            <div style={{
              backgroundColor: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '32px'
            }}>
              <div style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#FFFFFF', margin: '0 0 16px 0' }}>
                  Tracked ASINs
                </h3>
              </div>
              {Array.isArray(trackedAsins) && trackedAsins.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ borderTop: '1px solid #1E1E1E', borderBottom: '1px solid #1E1E1E' }}>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 20px',
                          color: '#888888',
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase'
                        }}>ASIN</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 20px',
                          color: '#888888',
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase'
                        }}>Product Title</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 20px',
                          color: '#888888',
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase'
                        }}>Our Price</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 20px',
                          color: '#888888',
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase'
                        }}>BB Price</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 20px',
                          color: '#888888',
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase'
                        }}>BB Winner</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 20px',
                          color: '#888888',
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase'
                        }}>Win Rate</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 20px',
                          color: '#888888',
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase'
                        }}>Status</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 20px',
                          color: '#888888',
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase'
                        }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trackedAsins.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #1E1E1E' }}>
                          <td style={{ padding: '12px 20px', color: '#FFFFFF' }}>
                            {item.asin}
                          </td>
                          <td style={{ padding: '12px 20px', color: '#FFFFFF', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.productTitle || '-'}
                          </td>
                          <td style={{ padding: '12px 20px', color: '#FFFFFF' }}>
                            {item.ourPrice ? `$${parseFloat(item.ourPrice).toFixed(2)}` : '-'}
                          </td>
                          <td style={{ padding: '12px 20px', color: '#FFFFFF' }}>
                            {item.bbPrice ? `$${parseFloat(item.bbPrice).toFixed(2)}` : '-'}
                          </td>
                          <td style={{ padding: '12px 20px', color: '#FFFFFF' }}>
                            {item.bbWinner || '-'}
                          </td>
                          <td style={{ padding: '12px 20px', color: '#FFFFFF' }}>
                            {item.winRate || 0}%
                          </td>
                          <td style={{ padding: '12px 20px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: item.status === 'winning' ? '#00C853' : item.status === 'losing' ? '#FF5252' : '#FFC107',
                              color: '#FFFFFF'
                            }}>
                              {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Unknown'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 20px' }}>
                            <button
                              onClick={() => router.push(`/buybox/${item.asin}`)}
                              style={{
                                backgroundColor: 'transparent',
                                color: '#FFD700',
                                border: '1px solid #FFD700',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                marginRight: '8px'
                              }}
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleRemoveAsin(item.asin)}
                              style={{
                                backgroundColor: 'transparent',
                                color: '#FF5252',
                                border: '1px solid #FF5252',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#888888',
                  fontSize: '14px'
                }}>
                  No ASINs being tracked yet. Add one to get started.
                </div>
              )}
            </div>

            {/* Alerts Section */}
            {Array.isArray(alerts) && alerts.length > 0 && (
              <div style={{
                backgroundColor: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#FFFFFF', margin: '0 0 16px 0' }}>
                  Buy Box Alerts
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {alerts.map((alert) => (
                    <div key={alert.id} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px',
                      backgroundColor: '#0A0A0A',
                      borderRadius: '6px',
                      border: '1px solid #1E1E1E'
                    }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#FFFFFF',
                        backgroundColor: alert.severity === 'critical' ? '#FF5252' : alert.severity === 'warning' ? '#FFC107' : '#2196F3',
                        whiteSpace: 'nowrap',
                        marginTop: '2px'
                      }}>
                        {alert.severity ? alert.severity.toUpperCase() : 'INFO'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: '#FFFFFF', fontSize: '14px', margin: '0 0 4px 0' }}>
                          {alert.message}
                        </p>
                        <p style={{ color: '#888888', fontSize: '12px', margin: 0 }}>
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleMarkAlertRead(alert.id)}
                        style={{
                          backgroundColor: 'transparent',
                          color: '#888888',
                          border: '1px solid #1E1E1E',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Mark Read
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
