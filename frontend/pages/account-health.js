import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AccountHealth() {
  const [healthData, setHealthData] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAccountHealth();
  }, []);

  const fetchAccountHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('ecomera_token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Fetch account health data
      try {
        const healthResponse = await fetch(`${BASE_URL}/account-health`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (healthResponse.ok) {
          const data = await healthResponse.json();
          setHealthData(data);
        }
      } catch (err) {
        console.error('Health data fetch error:', err);
      }

      // Fetch performance metrics
      try {
        const perfResponse = await fetch(`${BASE_URL}/account-health/metrics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (perfResponse.ok) {
          const data = await perfResponse.json();
          setPerformanceMetrics(data);
        }
      } catch (err) {
        console.error('Performance metrics fetch error:', err);
      }

      // Fetch timeline data
      try {
        const timelineResponse = await fetch(`${BASE_URL}/account-health/timeline`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (timelineResponse.ok) {
          const data = await timelineResponse.json();
          setTimeline(data);
        }
      } catch (err) {
        console.error('Timeline fetch error:', err);
      }

      setLoading(false);
    } catch (err) {
      console.error('Account health fetch error:', err);
      setError('Failed to load account health data');
      setLoading(false);
    }
  };

  // Generate alerts based on data
  useEffect(() => {
    const generatedAlerts = [];

    if (healthData) {
      const odr = healthData.orderDefectRate ?? 0.5;
      const lsr = healthData.lateShipmentRate ?? 2;
      const vtr = healthData.validTrackingRate ?? 97;

      if (odr > 1) {
        generatedAlerts.push({
          id: 'odr',
          level: odr > 2 ? 'critical' : 'warning',
          title: 'Order Defect Rate High',
          message: 'Order Defect Rate is approaching or exceeding threshold. Review recent orders for quality issues.',
        });
      }

      if (lsr > 4) {
        generatedAlerts.push({
          id: 'lsr',
          level: lsr > 5 ? 'critical' : 'warning',
          title: 'Late Shipment Rate Elevated',
          message: 'Late Shipment Rate is above target. Improve fulfillment processing speed.',
        });
      }

      if (vtr < 95) {
        generatedAlerts.push({
          id: 'vtr',
          level: vtr < 90 ? 'critical' : 'warning',
          title: 'Valid Tracking Rate Low',
          message: 'Valid Tracking Rate is below 95%. Ensure all shipments have valid tracking.',
        });
      }
    }

    if (performanceMetrics) {
      const violations = performanceMetrics.policyViolations ?? 0;
      const negFeedback = performanceMetrics.negativeFeedback ?? 0;

      if (violations > 0) {
        generatedAlerts.push({
          id: 'violations',
          level: 'critical',
          title: 'Policy Violations Detected',
          message: `You have ${violations} policy violation(s). Review and address immediately.`,
        });
      }

      if (negFeedback > 5) {
        generatedAlerts.push({
          id: 'feedback',
          level: 'warning',
          title: 'Increased Negative Feedback',
          message: `Recent negative feedback (${negFeedback} in last 30 days). Investigate root causes.`,
        });
      }
    }

    setAlerts(generatedAlerts);
  }, [healthData, performanceMetrics]);

  const getHealthScore = () => {
    if (!healthData) return 95;
    return healthData.overallScore ?? 95;
  };

  const getHealthColor = (score) => {
    if (score >= 90) return '#10B981';
    if (score >= 70) return '#FBBF24';
    return '#EF4444';
  };

  const getMetricColor = (actual, target, isInverse = false) => {
    if (isInverse) {
      if (actual >= target) return '#10B981';
      if (actual >= target * 0.9) return '#FBBF24';
      return '#EF4444';
    } else {
      if (actual <= target) return '#10B981';
      if (actual <= target * 1.15) return '#FBBF24';
      return '#EF4444';
    }
  };

  const CircularProgressBar = ({ percentage, size = 200 }) => {
    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const color = getHealthColor(percentage);

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1E1E1E"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease', transform: 'rotate(-90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="48"
          fontWeight="bold"
          fill={color}
        >
          {percentage.toFixed(0)}%
        </text>
      </svg>
    );
  };

  const SimpleProgressBar = ({ actual, target, unit, isInverse = false }) => {
    let percentage = isInverse ? (actual / target) * 100 : ((target - actual) / target) * 100;
    percentage = Math.min(100, Math.max(0, percentage));
    const color = getMetricColor(actual, target, isInverse);

    return (
      <div style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: '#CCCCCC' }}>
            {actual.toFixed(1)}{unit} / {target.toFixed(1)}{unit}
          </span>
          <span style={{ fontSize: '12px', color: '#888888' }}>
            {percentage.toFixed(0)}%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#1E1E1E',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${percentage}%`,
              backgroundColor: color,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
    );
  };

  const MetricCard = ({ title, actual, target, unit, isInverse = false }) => {
    const color = getMetricColor(actual, target, isInverse);
    return (
      <div
        style={{
          backgroundColor: '#111111',
          border: `1px solid #1E1E1E`,
          borderRadius: '8px',
          padding: '20px',
          color: '#FFFFFF',
        }}
      >
        <div style={{ fontSize: '14px', color: '#888888', marginBottom: '8px' }}>
          {title}
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color, marginBottom: '4px' }}>
          {actual.toFixed(1)}{unit}
        </div>
        <div style={{ fontSize: '12px', color: '#666666' }}>Target: {target.toFixed(1)}{unit}</div>
        <SimpleProgressBar actual={actual} target={target} unit={unit} isInverse={isInverse} />
      </div>
    );
  };

  const PerformanceMetricCard = ({ title, value, unit, icon, trend }) => {
    return (
      <div
        style={{
          backgroundColor: '#111111',
          border: `1px solid #1E1E1E`,
          borderRadius: '8px',
          padding: '20px',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px' }}>
              {title}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFFFFF' }}>
              {typeof value === 'number' ? (unit ? value.toFixed(1) : value) : value}
              {unit}
            </div>
          </div>
          {trend && (
            <div style={{ fontSize: '20px', color: trend > 0 ? '#10B981' : '#EF4444' }}>
              {trend > 0 ? '↑' : '↓'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const AlertCard = ({ alert }) => {
    const bgColor =
      alert.level === 'critical' ? '#7F1D1D' : alert.level === 'warning' ? '#78350F' : '#1E3A8A';
    const borderColor =
      alert.level === 'critical' ? '#EF4444' : alert.level === 'warning' ? '#FBBF24' : '#3B82F6';
    const badgeColor =
      alert.level === 'critical' ? '#EF4444' : alert.level === 'warning' ? '#FBBF24' : '#3B82F6';

    return (
      <div
        style={{
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '12px',
          color: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div
            style={{
              backgroundColor: badgeColor,
              color: '#FFFFFF',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
          >
            {alert.level.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
              {alert.title}
            </div>
            <div style={{ fontSize: '13px', color: '#DDDDDD' }}>
              {alert.message}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TimelineMonth = ({ month, status }) => {
    let dotColor = '#10B981';
    if (status === 'warning') dotColor = '#FBBF24';
    if (status === 'critical') dotColor = '#EF4444';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: dotColor,
            border: `2px solid ${dotColor}`,
          }}
        />
        <div style={{ fontSize: '11px', color: '#888888', textAlign: 'center' }}>
          {month}
        </div>
      </div>
    );
  };

  if (!healthData && !loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFFFFF' }}>
        <Sidebar />
        <div style={{ flex: 1, marginLeft: '250px', padding: '32px' }}>
          <div style={{ textAlign: 'center', marginTop: '48px', color: '#888888' }}>
            No account health data available. Please try again.
          </div>
        </div>
      </div>
    );
  }

  const odr = healthData?.orderDefectRate ?? 0.5;
  const lsr = healthData?.lateShipmentRate ?? 2;
  const vtr = healthData?.validTrackingRate ?? 97;
  const crt = healthData?.customerResponseTime ?? 18;

  const perfData = performanceMetrics ?? {};
  const buyBox = perfData.buyBoxPercentage ?? 85;
  const feedback = perfData.customerFeedbackScore ?? 4.5;
  const returnRate = perfData.returnRate ?? 3.2;
  const azClaims = perfData.azGuaranteeClaims ?? 2;
  const negFeedback = perfData.negativeFeedback ?? 3;
  const violations = perfData.policyViolations ?? 0;

  const timelineData = timeline ?? [
    { month: 'Sep', status: 'good' },
    { month: 'Oct', status: 'good' },
    { month: 'Nov', status: 'warning' },
    { month: 'Dec', status: 'good' },
    { month: 'Jan', status: 'good' },
    { month: 'Feb', status: 'good' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFFFFF' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: '250px', padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>
            Account Health
          </h1>
          <p style={{ color: '#888888', margin: 0 }}>Monitor your FBA account metrics and performance</p>
        </div>

        {/* Overall Health Score */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px' }}>
            Overall Health Score
          </h2>
          <div
            style={{
              backgroundColor: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '8px',
              padding: '40px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <CircularProgressBar percentage={getHealthScore()} size={220} />
          </div>
        </div>

        {/* Key Metrics */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px' }}>
            Key Performance Metrics
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            <MetricCard title="Order Defect Rate" actual={odr} target={1} unit="%" isInverse={false} />
            <MetricCard
              title="Late Shipment Rate"
              actual={lsr}
              target={4}
              unit="%"
              isInverse={false}
            />
            <MetricCard
              title="Valid Tracking Rate"
              actual={vtr}
              target={95}
              unit="%"
              isInverse={true}
            />
            <MetricCard
              title="Customer Response Time"
              actual={crt}
              target={24}
              unit="h"
              isInverse={false}
            />
          </div>
        </div>

        {/* Performance Metrics Grid */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px' }}>
            Performance Metrics
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
            }}
          >
            <PerformanceMetricCard title="Buy Box Percentage" value={buyBox} unit="%" trend={0.5} />
            <PerformanceMetricCard
              title="Customer Feedback Score"
              value={feedback}
              unit=" / 5"
              trend={0.1}
            />
            <PerformanceMetricCard title="Return Rate" value={returnRate} unit="%" trend={-0.2} />
            <PerformanceMetricCard
              title="A-Z Guarantee Claims"
              value={azClaims}
              unit=""
              trend={-0.3}
            />
            <PerformanceMetricCard
              title="Negative Feedback (30d)"
              value={negFeedback}
              unit=""
              trend={0}
            />
            <PerformanceMetricCard
              title="Policy Violations"
              value={violations}
              unit=""
              trend={violations > 0 ? 1 : 0}
            />
          </div>
        </div>

        {/* Account Status Timeline */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px' }}>
            Account Standing History (6 Months)
          </h2>
          <div
            style={{
              backgroundColor: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '8px',
              padding: '32px',
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'flex-start',
            }}
          >
            {Array.isArray(timelineData) &&
              timelineData.map((item, idx) => (
                <TimelineMonth
                  key={idx}
                  month={item.month}
                  status={item.status || 'good'}
                />
              ))}
          </div>
        </div>

        {/* Alerts & Recommendations */}
        {alerts.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px' }}>
              Alerts & Recommendations
            </h2>
            <div>
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        )}

        {/* No Alerts Message */}
        {alerts.length === 0 && (
          <div style={{ marginBottom: '48px' }}>
            <div
              style={{
                backgroundColor: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '32px',
                textAlign: 'center',
                color: '#10B981',
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                ✓ All Metrics Healthy
              </div>
              <p style={{ color: '#888888', margin: 0 }}>
                No alerts. Your account is performing within healthy parameters.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
