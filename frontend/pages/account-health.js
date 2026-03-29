import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const AccountHealthPage = () => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [healthData, setHealthData] = useState({
    overallHealthScore: 85,
    riskScore: 0,
    activeListings: 0,
    suspendedAsins: 0,
    orderDefectRate: 0,
    lateShipmentRate: 0,
    prefulfillmentCancelRate: 0,
    validTrackingRate: 0,
    clients: []
  });

  // Fetch metrics on mount
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('ecomera_token');

        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        const response = await fetch(`${BASE_URL}/system/metrics`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Process API response with safe fallbacks
        setHealthData({
          overallHealthScore: data.overall_health_score || 85,
          riskScore: (data.risk_score || 0),
          activeListings: data.active_listings || 0,
          suspendedAsins: data.suspended_asins || 0,
          orderDefectRate: (data.order_defect_rate || 0),
          lateShipmentRate: (data.late_shipment_rate || 0),
          prefulfillmentCancelRate: (data.prefulfillment_cancel_rate || 0),
          validTrackingRate: (data.valid_tracking_rate || 95),
          clients: data.clients || []
        });

        setError(null);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError(err.message);
        // Keep default values on error
        setHealthData({
          overallHealthScore: 85,
          riskScore: 0,
          activeListings: 0,
          suspendedAsins: 0,
          orderDefectRate: 0,
          lateShipmentRate: 0,
          prefulfillmentCancelRate: 0,
          validTrackingRate: 95,
          clients: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  // Determine color for health score
  const getHealthScoreColor = (score) => {
    if (score >= 80) return '#4CAF50'; // Green
    if (score >= 50) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  // Determine metric status
  const getMetricStatus = (value, target) => {
    if (value <= target) return { status: 'pass', color: '#4CAF50' };
    if (value <= target * 1.5) return { status: 'warning', color: '#FFC107' };
    return { status: 'fail', color: '#F44336' };
  };

  // Get risk score level
  const getRiskLevel = (score) => {
    if (score < 33) return 'Low';
    if (score < 66) return 'Medium';
    return 'High';
  };

  // Get risk color
  const getRiskColor = (score) => {
    if (score < 33) return '#4CAF50'; // Green
    if (score < 66) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#0A0A0A'
    },
    sidebar: {
      width: '250px'
    },
    mainContent: {
      flex: 1,
      padding: '40px',
      overflowY: 'auto'
    },
    header: {
      marginBottom: '40px'
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      color: '#FFFFFF',
      margin: '0 0 10px 0',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    subtitle: {
      fontSize: '14px',
      color: '#888888',
      margin: '0',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    topCardsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '40px'
    },
    card: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '12px',
      padding: '24px',
      boxSizing: 'border-box'
    },
    cardLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#888888',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '12px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    cardValue: {
      fontSize: '36px',
      fontWeight: '700',
      color: '#FFFFFF',
      margin: '0',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    cardValueSmall: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#FFFFFF',
      margin: '0',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    riskBadge: {
      display: 'inline-block',
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      marginTop: '8px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    metricsSection: {
      marginBottom: '40px'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: '20px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    metricsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px'
    },
    metricCard: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '12px',
      padding: '24px',
      boxSizing: 'border-box'
    },
    metricLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: '16px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    metricValueContainer: {
      marginBottom: '16px'
    },
    metricValue: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#FFFFFF',
      margin: '0 0 4px 0',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    metricTarget: {
      fontSize: '12px',
      color: '#888888',
      margin: '0',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    statusBadge: {
      display: 'inline-block',
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      color: '#FFFFFF',
      textTransform: 'uppercase',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    tableContainer: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '12px',
      overflow: 'hidden'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    tableHeader: {
      backgroundColor: '#1E1E1E',
      borderBottom: '1px solid #1E1E1E'
    },
    tableHeaderCell: {
      padding: '16px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: '#888888',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    tableRow: {
      borderBottom: '1px solid #1E1E1E'
    },
    tableRowHover: {
      backgroundColor: '#1A1A1A'
    },
    tableCell: {
      padding: '16px',
      fontSize: '13px',
      color: '#CCCCCC'
    },
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '500px'
    },
    loadingText: {
      fontSize: '16px',
      color: '#888888',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    errorContainer: {
      backgroundColor: '#111111',
      border: '1px solid #F44336',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '20px'
    },
    errorText: {
      color: '#F44336',
      fontSize: '14px',
      margin: '0',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px',
      color: '#888888'
    },
    emptyStateText: {
      fontSize: '14px',
      margin: '0',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }
  };

  const orderDefectStatus = getMetricStatus(healthData.orderDefectRate, 1);
  const lateShipmentStatus = getMetricStatus(healthData.lateShipmentRate, 4);
  const cancelRateStatus = getMetricStatus(healthData.prefulfillmentCancelRate, 2.5);
  const trackingStatus = healthData.validTrackingRate >= 95
    ? { status: 'pass', color: '#4CAF50' }
    : healthData.validTrackingRate >= 90
    ? { status: 'warning', color: '#FFC107' }
    : { status: 'fail', color: '#F44336' };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <Sidebar />
      </div>

      <div style={styles.mainContent}>
        <div style={styles.header}>
          <h1 style={styles.title}>Account Health Dashboard</h1>
          <p style={styles.subtitle}>Monitor your seller account metrics and performance</p>
        </div>

        {error && (
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>Warning: {error}. Displaying default values.</p>
          </div>
        )}

        {loading ? (
          <div style={styles.loadingContainer}>
            <p style={styles.loadingText}>Loading metrics...</p>
          </div>
        ) : (
          <>
            {/* Top Cards Row */}
            <div style={styles.topCardsContainer}>
              {/* Overall Health Score */}
              <div style={styles.card}>
                <div style={styles.cardLabel}>Overall Health Score</div>
                <p style={{
                  ...styles.cardValue,
                  color: getHealthScoreColor(healthData.overallHealthScore)
                }}>
                  {(healthData.overallHealthScore || 85).toFixed(0)}
                </p>
                <p style={styles.cardLabel}>Out of 100</p>
              </div>

              {/* Risk Score */}
              <div style={styles.card}>
                <div style={styles.cardLabel}>Risk Score</div>
                <p style={{
                  ...styles.cardValue,
                  color: getRiskColor(healthData.riskScore)
                }}>
                  {(healthData.riskScore || 0).toFixed(1)}%
                </p>
                <div style={{
                  ...styles.riskBadge,
                  backgroundColor: getRiskColor(healthData.riskScore) + '20',
                  color: getRiskColor(healthData.riskScore)
                }}>
                  {getRiskLevel(healthData.riskScore)}
                </div>
              </div>

              {/* Active Listings */}
              <div style={styles.card}>
                <div style={styles.cardLabel}>Active Listings</div>
                <p style={styles.cardValue}>
                  {(healthData.activeListings || 0).toLocaleString()}
                </p>
                <p style={styles.cardLabel}>ASIN count</p>
              </div>

              {/* Suspended ASINs */}
              <div style={styles.card}>
                <div style={styles.cardLabel}>Suspended ASINs</div>
                <p style={{
                  ...styles.cardValueSmall,
                  color: (healthData.suspendedAsins || 0) > 0 ? '#F44336' : '#4CAF50'
                }}>
                  {(healthData.suspendedAsins || 0).toLocaleString()}
                </p>
                <p style={styles.cardLabel}>Requires attention</p>
              </div>
            </div>

            {/* Health Metrics Section */}
            <div style={styles.metricsSection}>
              <h2 style={styles.sectionTitle}>Performance Metrics</h2>
              <div style={styles.metricsGrid}>

                {/* Order Defect Rate */}
                <div style={styles.metricCard}>
                  <div style={styles.metricLabel}>Order Defect Rate</div>
                  <div style={styles.metricValueContainer}>
                    <p style={styles.metricValue}>
                      {(healthData.orderDefectRate || 0).toFixed(2)}%
                    </p>
                    <p style={styles.metricTarget}>Target: &lt; 1%</p>
                  </div>
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: orderDefectStatus.color + '30',
                    color: orderDefectStatus.color
                  }}>
                    {orderDefectStatus.status}
                  </div>
                </div>

                {/* Late Shipment Rate */}
                <div style={styles.metricCard}>
                  <div style={styles.metricLabel}>Late Shipment Rate</div>
                  <div style={styles.metricValueContainer}>
                    <p style={styles.metricValue}>
                      {(healthData.lateShipmentRate || 0).toFixed(2)}%
                    </p>
                    <p style={styles.metricTarget}>Target: &lt; 4%</p>
                  </div>
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: lateShipmentStatus.color + '30',
                    color: lateShipmentStatus.color
                  }}>
                    {lateShipmentStatus.status}
                  </div>
                </div>

                {/* Pre-fulfillment Cancel Rate */}
                <div style={styles.metricCard}>
                  <div style={styles.metricLabel}>Pre-fulfillment Cancel Rate</div>
                  <div style={styles.metricValueContainer}>
                    <p style={styles.metricValue}>
                      {(healthData.prefulfillmentCancelRate || 0).toFixed(2)}%
                    </p>
                    <p style={styles.metricTarget}>Target: &lt; 2.5%</p>
                  </div>
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: cancelRateStatus.color + '30',
                    color: cancelRateStatus.color
                  }}>
                    {cancelRateStatus.status}
                  </div>
                </div>

                {/* Valid Tracking Rate */}
                <div style={styles.metricCard}>
                  <div style={styles.metricLabel}>Valid Tracking Rate</div>
                  <div style={styles.metricValueContainer}>
                    <p style={styles.metricValue}>
                      {(healthData.validTrackingRate || 95).toFixed(2)}%
                    </p>
                    <p style={styles.metricTarget}>Target: &gt; 95%</p>
                  </div>
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: trackingStatus.color + '30',
                    color: trackingStatus.color
                  }}>
                    {trackingStatus.status}
                  </div>
                </div>

              </div>
            </div>

            {/* Client Breakdown Table */}
            <div style={styles.metricsSection}>
              <h2 style={styles.sectionTitle}>Client-Level Breakdown</h2>
              <div style={styles.tableContainer}>
                {healthData.clients && healthData.clients.length > 0 ? (
                  <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                      <tr>
                        <th style={styles.tableHeaderCell}>Client Name</th>
                        <th style={styles.tableHeaderCell}>Health Score</th>
                        <th style={styles.tableHeaderCell}>Active Listings</th>
                        <th style={styles.tableHeaderCell}>Issues</th>
                        <th style={styles.tableHeaderCell}>Last Checked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthData.clients.map((client, index) => (
                        <tr key={index} style={styles.tableRow}>
                          <td style={styles.tableCell}>
                            {client.name || 'Unknown'}
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{ color: getHealthScoreColor(client.health_score || 85) }}>
                              {(client.health_score || 85).toFixed(0)}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            {(client.active_listings || 0).toLocaleString()}
                          </td>
                          <td style={styles.tableCell}>
                            {(client.issues || 0) > 0 ? (
                              <span style={{ color: '#F44336' }}>
                                {client.issues} issue{client.issues !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span style={{ color: '#4CAF50' }}>None</span>
                            )}
                          </td>
                          <td style={styles.tableCell}>
                            {client.last_checked ? new Date(client.last_checked).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={styles.emptyState}>
                    <p style={styles.emptyStateText}>No client data available</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AccountHealthPage;
