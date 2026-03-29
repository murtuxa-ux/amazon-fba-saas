import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const styles = {
  outerContainer: { display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' },
  container: { flex: 1, marginLeft: '250px', padding: '32px', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  header: { marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '700', marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: '#999999', marginBottom: '24px' },
  weekSelector: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' },
  weekButton: { backgroundColor: '#1E1E1E', color: '#FFFFFF', border: 'none', borderRadius: '4px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' },
  weekDisplay: { fontSize: '14px', fontWeight: '600', minWidth: '250px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' },
  kpiCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' },
  kpiValue: { fontSize: '28px', fontWeight: '700', color: '#FFD700', marginBottom: '8px' },
  kpiLabel: { fontSize: '12px', color: '#999999', textTransform: 'uppercase', marginBottom: '8px' },
  kpiChange: { fontSize: '12px', fontWeight: '600' },
  sectionHeader: { fontSize: '18px', fontWeight: '700', marginBottom: '16px', marginTop: '32px' },
  card: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', marginBottom: '24px' },
  section: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' },
  bulletList: { list: 'none', padding: 0, margin: 0 },
  bulletItem: { fontSize: '14px', marginBottom: '12px', paddingLeft: '20px', position: 'relative' },
  metric: { display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#0A0A0A', borderRadius: '6px', marginBottom: '8px', fontSize: '14px' },
  metricLabel: { color: '#999999' },
  metricValue: { fontWeight: '600', color: '#FFD700' },
  blocker: { padding: '12px', backgroundColor: '#3D1F2B', borderLeft: '3px solid #F87171', borderRadius: '4px', marginBottom: '8px', fontSize: '13px' },
  nextStep: { padding: '12px', backgroundColor: '#1F2B3D', borderLeft: '3px solid #3B82F6', borderRadius: '4px', marginBottom: '8px', fontSize: '13px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { backgroundColor: '#0A0A0A', borderBottom: '1px solid #1E1E1E' },
  tableHeaderCell: { padding: '12px', textAlign: 'left', fontSize: '12px', color: '#999999', fontWeight: '600', textTransform: 'uppercase' },
  tableRow: { borderBottom: '1px solid #1E1E1E' },
  tableCell: { padding: '12px', fontSize: '14px' },
  priorityBadge: { display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
  priorityHigh: { backgroundColor: '#3D1F2B', color: '#F87171' },
  priorityMedium: { backgroundColor: '#3D2B1F', color: '#FBBF24' },
  priorityLow: { backgroundColor: '#1F3D2B', color: '#10B981' },
  statusBadge: { display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
  statusDone: { backgroundColor: '#1F3D2B', color: '#10B981' },
  statusInProgress: { backgroundColor: '#1E2B3D', color: '#3B82F6' },
  statusPending: { backgroundColor: '#2B1F1F', color: '#9CA3AF' },
  chartContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' },
  chart: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' },
  chartTitle: { fontSize: '14px', fontWeight: '600', marginBottom: '16px' },
  chartBar: { display: 'flex', alignItems: 'flex-end', height: '200px', gap: '8px', justifyContent: 'space-around' },
  bar: { flex: 1, backgroundColor: '#FFD700', borderRadius: '4px 4px 0 0', transition: 'all 0.2s' },
  barLabel: { fontSize: '11px', color: '#999999', marginTop: '4px', textAlign: 'center' },
  button: { backgroundColor: '#FFD700', color: '#000000', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', marginTop: '24px' },
};

export default function WeeklyReportPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date().toISOString().split('T')[0]);
  const [actionItems, setActionItems] = useState([
    { id: 1, task: 'Scale AMIRA Vitamin C Serum campaign', assignedTo: 'John', priority: 'High', dueDate: '2026-04-02', status: 'In Progress' },
    { id: 2, task: 'Complete market research for Q2 launches', assignedTo: 'Sarah', priority: 'High', dueDate: '2026-03-31', status: 'Pending' },
    { id: 3, task: 'Update competitor pricing analysis', assignedTo: 'Mike', priority: 'Medium', dueDate: '2026-04-03', status: 'Done' },
    { id: 4, task: 'Review supplier quotes for Desk Out expansion', assignedTo: 'Alex', priority: 'Medium', dueDate: '2026-04-04', status: 'In Progress' },
    { id: 5, task: 'Prepare brand registry documents', assignedTo: 'Jessica', priority: 'High', dueDate: '2026-04-01', status: 'Pending' },
    { id: 6, task: 'Optimize PPC budget allocation', assignedTo: 'John', priority: 'Medium', dueDate: '2026-04-05', status: 'In Progress' },
    { id: 7, task: 'Analyze customer feedback and ratings', assignedTo: 'Sarah', priority: 'Low', dueDate: '2026-04-06', status: 'Pending' },
    { id: 8, task: 'Schedule supplier call for next inventory', assignedTo: 'Mike', priority: 'Low', dueDate: '2026-04-07', status: 'Done' },
  ]);

  useEffect(() => {
    const token = localStorage.getItem('ecomera_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
  }, []);

  const getWeekRange = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return { start: monday, end: sunday, label: `${monday.toLocaleDateString()} - ${sunday.toLocaleDateString()}` };
  };

  const handlePrevWeek = () => {
    const date = new Date(currentWeek);
    date.setDate(date.getDate() - 7);
    setCurrentWeek(date.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const date = new Date(currentWeek);
    date.setDate(date.getDate() + 7);
    setCurrentWeek(date.toISOString().split('T')[0]);
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'High':
        return styles.priorityHigh;
      case 'Medium':
        return styles.priorityMedium;
      case 'Low':
        return styles.priorityLow;
      default:
        return styles.priorityMedium;
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Done':
        return styles.statusDone;
      case 'In Progress':
        return styles.statusInProgress;
      case 'Pending':
        return styles.statusPending;
      default:
        return styles.statusPending;
    }
  };

  const weekRange = getWeekRange(currentWeek);

  const handleExportReport = () => {
    const reportData = {
      week: weekRange.label,
      executiveSummary: {
        revenue: '$52,340',
        profit: '$21,840',
        orders: '1,820',
        roi: '41.7%',
        newProducts: '2',
        activePromos: '5',
      },
      actionItems: actionItems,
      timestamp: new Date().toISOString(),
    };

    const csvContent = [
      ['Weekly Report Generated:', new Date().toLocaleString()],
      ['Week Of:', weekRange.label],
      [],
      ['EXECUTIVE SUMMARY'],
      ['Metric', 'Value'],
      ['Revenue', '$52,340'],
      ['Profit', '$21,840'],
      ['Orders', '1,820'],
      ['ROI', '41.7%'],
      ['New Products', '2'],
      ['Active Promotions', '5'],
      [],
      ['ACTION ITEMS'],
      ['Task', 'Assigned To', 'Priority', 'Due Date', 'Status'],
      ...actionItems.map(item => [item.task, item.assignedTo, item.priority, item.dueDate, item.status]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `weekly_report_${currentWeek}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Weekly Report</h1>
          <p style={styles.subtitle}>Comprehensive weekly performance and action items</p>
        </div>

        <div style={styles.weekSelector}>
          <button style={styles.weekButton} onClick={handlePrevWeek}>← Previous</button>
          <div style={styles.weekDisplay}>Week of {weekRange.label}</div>
          <button style={styles.weekButton} onClick={handleNextWeek}>Next →</button>
        </div>

        <div style={{ ...styles.sectionHeader, marginTop: '0' }}>Executive Summary</div>
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiValue}>$52,340</div>
            <div style={styles.kpiLabel}>Revenue</div>
            <div style={{ ...styles.kpiChange, color: '#10B981' }}>↑ 18% vs prev week</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiValue}>$21,840</div>
            <div style={styles.kpiLabel}>Profit</div>
            <div style={{ ...styles.kpiChange, color: '#10B981' }}>↑ 22% vs prev week</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiValue}>1,820</div>
            <div style={styles.kpiLabel}>Orders</div>
            <div style={{ ...styles.kpiChange, color: '#10B981' }}>↑ 14% vs prev week</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiValue}>41.7%</div>
            <div style={styles.kpiLabel}>ROI</div>
            <div style={{ ...styles.kpiChange, color: '#10B981' }}>↑ 3.2% vs prev week</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiValue}>2</div>
            <div style={styles.kpiLabel}>New Products</div>
            <div style={{ ...styles.kpiChange, color: '#3B82F6' }}>→ 0 change</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiValue}>5</div>
            <div style={styles.kpiLabel}>Active Promos</div>
            <div style={{ ...styles.kpiChange, color: '#10B981' }}>↑ 2 new promos</div>
          </div>
        </div>

        <div style={styles.sectionHeader}>Department Updates</div>

        <div style={styles.section}>
          <div style={styles.card}>
            <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Wholesale</div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Highlights</div>
              <ul style={styles.bulletList}>
                <li style={styles.bulletItem}>Secured Costco shelving for AMIRA line</li>
                <li style={styles.bulletItem}>Negotiated 12% volume discount with supplier</li>
              </ul>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Metrics</div>
              <div style={styles.metric}><span style={styles.metricLabel}>B2B Revenue</span><span style={styles.metricValue}>$18,240</span></div>
              <div style={styles.metric}><span style={styles.metricLabel}>Wholesale Orders</span><span style={styles.metricValue}>14</span></div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Blockers</div>
              <div style={styles.blocker}>Waiting on Costco contract execution</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Next Steps</div>
              <div style={styles.nextStep}>Follow up with Costco legal team by Friday</div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Private Label</div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Highlights</div>
              <ul style={styles.bulletList}>
                <li style={styles.bulletItem}>Launched 2 new SKUs (Retinol + Hydrating Mask)</li>
                <li style={styles.bulletItem}>Brand registry approved for Deck Out</li>
              </ul>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Metrics</div>
              <div style={styles.metric}><span style={styles.metricLabel}>PL Revenue</span><span style={styles.metricValue}>$28,450</span></div>
              <div style={styles.metric}><span style={styles.metricLabel}>Launch Success Rate</span><span style={styles.metricValue}>87%</span></div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Blockers</div>
              <div style={styles.blocker}>Shipping delay on Bamboo Organizer (5 days late)</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Next Steps</div>
              <div style={styles.nextStep}>Contact freight forwarder to expedite shipment</div>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.card}>
            <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>PPC & Advertising</div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Highlights</div>
              <ul style={styles.bulletList}>
                <li style={styles.bulletItem}>ACOS decreased to 14.5% (best in 6 months)</li>
                <li style={styles.bulletItem}>New keyword clusters driving 23% more traffic</li>
              </ul>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Metrics</div>
              <div style={styles.metric}><span style={styles.metricLabel}>Ad Spend</span><span style={styles.metricValue}>$8,920</span></div>
              <div style={styles.metric}><span style={styles.metricLabel}>ACOS</span><span style={styles.metricValue}>14.5%</span></div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Blockers</div>
              <div style={styles.blocker}>Amazon API rate limits slowing daily sync</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Next Steps</div>
              <div style={styles.nextStep}>Implement caching layer to reduce API calls</div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Operations</div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Highlights</div>
              <ul style={styles.bulletList}>
                <li style={styles.bulletItem}>Inventory accuracy improved to 99.2%</li>
                <li style={styles.bulletItem}>Return rate reduced to 2.8% from 3.1%</li>
              </ul>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Metrics</div>
              <div style={styles.metric}><span style={styles.metricLabel}>Fulfillment Rate</span><span style={styles.metricValue}>98.4%</span></div>
              <div style={styles.metric}><span style={styles.metricLabel}>Return Rate</span><span style={styles.metricValue}>2.8%</span></div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Blockers</div>
              <div style={styles.blocker}>Warehouse space constraints for Q2 inventory</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' }}>Next Steps</div>
              <div style={styles.nextStep}>Get quotes from 3 additional fulfillment centers</div>
            </div>
          </div>
        </div>

        <div style={styles.sectionHeader}>Action Items</div>
        <div style={styles.card}>
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                <th style={styles.tableHeaderCell}>Task</th>
                <th style={styles.tableHeaderCell}>Assigned To</th>
                <th style={styles.tableHeaderCell}>Priority</th>
                <th style={styles.tableHeaderCell}>Due Date</th>
                <th style={styles.tableHeaderCell}>Status</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(actionItems) ? actionItems.map(item => (
                <tr key={item.id} style={styles.tableRow}>
                  <td style={styles.tableCell}>{item.task}</td>
                  <td style={styles.tableCell}>{item.assignedTo}</td>
                  <td style={styles.tableCell}><span style={{ ...styles.priorityBadge, ...getPriorityStyle(item.priority) }}>{item.priority}</span></td>
                  <td style={styles.tableCell}>{item.dueDate}</td>
                  <td style={styles.tableCell}><span style={{ ...styles.statusBadge, ...getStatusStyle(item.status) }}>{item.status}</span></td>
                </tr>
              )) : null}
            </tbody>
          </table>
        </div>

        <div style={styles.sectionHeader}>Charts & Performance</div>
        <div style={styles.chartContainer}>
          <div style={styles.chart}>
            <div style={styles.chartTitle}>Revenue: This Week vs Last Week</div>
            <div style={styles.chartBar}>
              <div style={{ flex: 1 }}>
                <div style={{ ...styles.bar, height: '140px' }}></div>
                <div style={styles.barLabel}>Last Week</div>
                <div style={{ fontSize: '10px', color: '#FFD700', marginTop: '2px' }}>$44.3K</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...styles.bar, height: '160px' }}></div>
                <div style={styles.barLabel}>This Week</div>
                <div style={{ fontSize: '10px', color: '#FFD700', marginTop: '2px' }}>$52.3K</div>
              </div>
            </div>
          </div>

          <div style={styles.chart}>
            <div style={styles.chartTitle}>Orders by Day</div>
            <div style={styles.chartBar}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                const orders = [230, 260, 245, 280, 310, 340, 155];
                return (
                  <div key={day} style={{ flex: 1 }}>
                    <div style={{ ...styles.bar, height: `${(orders[i] / 340) * 180}px` }}></div>
                    <div style={styles.barLabel}>{day}</div>
                    <div style={{ fontSize: '10px', color: '#FFD700', marginTop: '2px' }}>{orders[i]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button style={styles.button} onClick={handleExportReport}>
              Generate & Export Report
            </button>
          </div>
          <div style={{ fontSize: '12px', color: '#666666' }}>
            Report generates CSV with all sections and metrics
          </div>
        </div>
      </div>
    </div>
  );
}
