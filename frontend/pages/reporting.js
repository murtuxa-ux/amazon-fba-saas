import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const styles = {
  outerContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
  },
  container: {
    flex: 1,
    marginLeft: '250px',
    padding: '32px',
    color: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#999999',
    margin: '0',
  },
  tabsContainer: {
    display: 'flex',
    gap: '16px',
    marginBottom: '32px',
    borderBottom: '1px solid #1E1E1E',
  },
  tab: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    color: '#999999',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    color: '#FFD700',
    borderBottomColor: '#FFD700',
  },
  buttonPrimary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#FFD700',
    color: '#000000',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buttonSecondary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
    border: '1px solid #333333',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#999999',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '600',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#FFD700',
    margin: '0',
  },
  chartContainer: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '32px',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#FFFFFF',
    margin: '0 0 20px 0',
  },
  barChart: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
    height: '300px',
    justifyContent: 'space-around',
  },
  barColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: '100%',
    backgroundColor: '#FFD700',
    borderRadius: '4px 4px 0 0',
    marginBottom: '8px',
    transition: 'all 0.2s ease',
  },
  barLabel: {
    fontSize: '11px',
    color: '#999999',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '32px',
  },
  stepTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#FFD700',
    margin: '0 0 16px 0',
    paddingBottom: '12px',
    borderBottom: '1px solid #1E1E1E',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#CCCCCC',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    backgroundColor: '#1A1A1A',
    border: '1px solid #1E1E1E',
    borderRadius: '4px',
    color: '#FFFFFF',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    backgroundColor: '#1A1A1A',
    border: '1px solid #1E1E1E',
    borderRadius: '4px',
    color: '#FFFFFF',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  checkboxGroup: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    color: '#CCCCCC',
    cursor: 'pointer',
  },
  checkbox: {
    marginRight: '8px',
    cursor: 'pointer',
  },
  reportGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  reportCard: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    transition: 'all 0.2s ease',
  },
  reportTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 12px 0',
    color: '#FFFFFF',
  },
  reportMeta: {
    fontSize: '12px',
    color: '#999999',
    margin: '6px 0',
  },
  reportActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
  },
  smallButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
    border: '1px solid #333333',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flex: 1,
  },
  recipientsTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#111111',
    borderBottom: '1px solid #1E1E1E',
  },
  tableTh: {
    padding: '16px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#FFD700',
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tableTd: {
    padding: '16px',
    fontSize: '13px',
    color: '#CCCCCC',
    borderBottom: '1px solid #1E1E1E',
  },
  tableTr: {
    transition: 'background-color 0.2s ease',
  },
  frequencyBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '4px',
    backgroundColor: '#1E1E1E',
    color: '#FFD700',
    textTransform: 'uppercase',
  },
  modalOverlay: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '1000',
  },
  modalContent: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '32px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    margin: '0 0 24px 0',
    color: '#FFFFFF',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },
};

const MOCK_REPORTS = [
  {
    id: 1,
    name: 'Q1 Sales Summary',
    type: 'Sales',
    lastGenerated: '2026-03-28',
    frequency: 'Monthly',
    owner: 'Sarah Chen',
  },
  {
    id: 2,
    name: 'PPC Performance Report',
    type: 'Advertising',
    lastGenerated: '2026-03-30',
    frequency: 'Weekly',
    owner: 'Alex Rodriguez',
  },
  {
    id: 3,
    name: 'Inventory Analysis',
    type: 'Inventory',
    lastGenerated: '2026-03-27',
    frequency: 'Monthly',
    owner: 'Emma Wilson',
  },
  {
    id: 4,
    name: 'Customer Acquisition Cost',
    type: 'Finance',
    lastGenerated: '2026-03-25',
    frequency: 'Monthly',
    owner: 'John Smith',
  },
];

const MOCK_RECIPIENTS = [
  {
    id: 1,
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    subscribedReports: 'Q1 Sales Summary, Inventory Analysis',
    frequency: 'Weekly',
    lastSent: '2026-03-30',
  },
  {
    id: 2,
    name: 'Mike Johnson',
    email: 'mike@example.com',
    subscribedReports: 'PPC Performance Report',
    frequency: 'Daily',
    lastSent: '2026-03-30',
  },
  {
    id: 3,
    name: 'Alex Rodriguez',
    email: 'alex@example.com',
    subscribedReports: 'All Reports',
    frequency: 'Daily',
    lastSent: '2026-03-30',
  },
  {
    id: 4,
    name: 'Emma Wilson',
    email: 'emma@example.com',
    subscribedReports: 'Inventory Analysis, Customer Acquisition Cost',
    frequency: 'Weekly',
    lastSent: '2026-03-29',
  },
];

const CHART_DATA = [
  { week: 'Week 1', reports: 24 },
  { week: 'Week 2', reports: 32 },
  { week: 'Week 3', reports: 28 },
  { week: 'Week 4', reports: 41 },
  { week: 'Week 5', reports: 35 },
  { week: 'Week 6', reports: 48 },
  { week: 'Week 7', reports: 45 },
  { week: 'Week 8', reports: 52 },
];

const maxReports = Math.max(...CHART_DATA.map((d) => d.reports));

export default function ReportingPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [step, setStep] = useState(1);
  const [selectedDataSource, setSelectedDataSource] = useState('Products');
  const [selectedMetrics, setSelectedMetrics] = useState(['Product Name', 'SKU']);
  const [selectedFormat, setSelectedFormat] = useState('Table');
  const [showAddRecipientModal, setShowAddRecipientModal] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    name: '',
    email: '',
    frequency: 'Weekly',
  });

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ecomera_token') : null;
    if (!token) {
      return;
    }
  }, []);

  const handleMetricToggle = (metric) => {
    if (selectedMetrics.includes(metric)) {
      setSelectedMetrics(selectedMetrics.filter((m) => m !== metric));
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  const METRIC_OPTIONS = {
    Products: ['Product Name', 'SKU', 'Price', 'Cost', 'Category', 'Inventory'],
    Orders: ['Order ID', 'Customer', 'Amount', 'Status', 'Ship Date', 'Tracking'],
    Inventory: ['SKU', 'Product', 'Warehouse A', 'Warehouse B', 'Warehouse C', 'Total'],
    PPC: ['Campaign', 'Clicks', 'Impressions', 'Spend', 'Sales', 'ACOS'],
    Finance: ['Month', 'Revenue', 'COGS', 'Gross Profit', 'Net Income'],
    Clients: ['Client ID', 'Company', 'Contact', 'Email', 'Status'],
  };

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Reporting Dashboard</h1>
          <p style={styles.subtitle}>Create, manage, and distribute business reports</p>
        </div>

        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'overview' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'builder' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('builder')}
          >
            Report Builder
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'library' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('library')}
          >
            Report Library
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'distribution' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('distribution')}
          >
            Distribution
          </button>
        </div>

        {activeTab === 'overview' && (
          <div>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Reports Generated (This Month)</p>
                <p style={styles.statValue}>45</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Scheduled Reports</p>
                <p style={styles.statValue}>12</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Pending Reviews</p>
                <p style={styles.statValue}>3</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Export Volume</p>
                <p style={styles.statValue}>2.4 GB</p>
              </div>
            </div>

            <div style={styles.chartContainer}>
              <h3 style={styles.chartTitle}>Reports Generated Per Week</h3>
              <div style={styles.barChart}>
                {CHART_DATA.map((data) => (
                  <div key={data.week} style={styles.barColumn}>
                    <div
                      style={{
                        ...styles.bar,
                        height: `${(data.reports / maxReports) * 100}%`,
                      }}
                    />
                    <span style={styles.barLabel}>{data.week}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'builder' && (
          <div>
            {step === 1 && (
              <div style={styles.formContainer}>
                <h3 style={styles.stepTitle}>Step 1: Select Data Source</h3>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Choose Data Source</label>
                  <select
                    style={styles.select}
                    value={selectedDataSource}
                    onChange={(e) => {
                      setSelectedDataSource(e.target.value);
                      setSelectedMetrics([]);
                    }}
                  >
                    <option value="Products">Products</option>
                    <option value="Orders">Orders</option>
                    <option value="Inventory">Inventory</option>
                    <option value="PPC">PPC</option>
                    <option value="Finance">Finance</option>
                    <option value="Clients">Clients</option>
                  </select>
                </div>
                <button style={styles.buttonPrimary} onClick={() => setStep(2)}>
                  Next →
                </button>
              </div>
            )}

            {step === 2 && (
              <div style={styles.formContainer}>
                <h3 style={styles.stepTitle}>Step 2: Select Metrics/Columns</h3>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Available Columns</label>
                  <div style={styles.checkboxGroup}>
                    {(METRIC_OPTIONS[selectedDataSource] || []).map((metric) => (
                      <label key={metric} style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          style={styles.checkbox}
                          checked={selectedMetrics.includes(metric)}
                          onChange={() => handleMetricToggle(metric)}
                        />
                        {metric}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={styles.buttonSecondary} onClick={() => setStep(1)}>
                    ← Back
                  </button>
                  <button style={styles.buttonPrimary} onClick={() => setStep(3)}>
                    Next →
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={styles.formContainer}>
                <h3 style={styles.stepTitle}>Step 3: Set Filters</h3>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Date Range</label>
                  <input style={styles.input} type="date" placeholder="Start date" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Client Filter</label>
                  <select style={styles.select}>
                    <option value="">All Clients</option>
                    <option value="acme">Acme Corp</option>
                    <option value="tech">Tech Solutions</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Category Filter</label>
                  <select style={styles.select}>
                    <option value="">All Categories</option>
                    <option value="electronics">Electronics</option>
                    <option value="accessories">Accessories</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={styles.buttonSecondary} onClick={() => setStep(2)}>
                    ← Back
                  </button>
                  <button style={styles.buttonPrimary} onClick={() => setStep(4)}>
                    Next →
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div style={styles.formContainer}>
                <h3 style={styles.stepTitle}>Step 4: Choose Format</h3>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Report Format</label>
                  <select
                    style={styles.select}
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                  >
                    <option value="Table">Table</option>
                    <option value="Chart">Chart</option>
                    <option value="PDF">PDF</option>
                    <option value="CSV">CSV</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={styles.buttonSecondary} onClick={() => setStep(3)}>
                    ← Back
                  </button>
                  <button style={styles.buttonPrimary} onClick={() => setStep(5)}>
                    Next →
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div style={styles.formContainer}>
                <h3 style={styles.stepTitle}>Step 5: Preview & Generate</h3>
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ color: '#999999', fontSize: '13px' }}>
                    <strong>Data Source:</strong> {selectedDataSource}
                  </p>
                  <p style={{ color: '#999999', fontSize: '13px' }}>
                    <strong>Columns:</strong> {selectedMetrics.join(', ')}
                  </p>
                  <p style={{ color: '#999999', fontSize: '13px' }}>
                    <strong>Format:</strong> {selectedFormat}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={styles.buttonSecondary} onClick={() => setStep(4)}>
                    ← Back
                  </button>
                  <button style={styles.buttonPrimary} onClick={() => setStep(1)}>
                    Generate Report
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'library' && (
          <div style={styles.reportGrid}>
            {MOCK_REPORTS.map((report) => (
              <div key={report.id} style={styles.reportCard}>
                <h3 style={styles.reportTitle}>{report.name}</h3>
                <div style={styles.reportMeta}>📊 Type: {report.type}</div>
                <div style={styles.reportMeta}>📅 Last: {report.lastGenerated}</div>
                <div style={styles.reportMeta}>🔄 Frequency: {report.frequency}</div>
                <div style={styles.reportMeta}>👤 Owner: {report.owner}</div>
                <div style={styles.reportActions}>
                  <button style={styles.smallButton}>Open</button>
                  <button style={styles.smallButton}>Edit</button>
                  <button style={styles.smallButton}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'distribution' && (
          <div>
            <div style={{ marginBottom: '24px', textAlign: 'right' }}>
              <button
                style={styles.buttonPrimary}
                onClick={() => setShowAddRecipientModal(true)}
              >
                + Add Recipient
              </button>
            </div>
            <table style={styles.recipientsTable}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableTh}>Name</th>
                  <th style={styles.tableTh}>Email</th>
                  <th style={styles.tableTh}>Subscribed Reports</th>
                  <th style={styles.tableTh}>Frequency</th>
                  <th style={styles.tableTh}>Last Sent</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_RECIPIENTS.map((recipient) => (
                  <tr key={recipient.id} style={styles.tableTr}>
                    <td style={styles.tableTd}>{recipient.name}</td>
                    <td style={styles.tableTd}>{recipient.email}</td>
                    <td style={styles.tableTd}>{recipient.subscribedReports}</td>
                    <td style={styles.tableTd}>
                      <span style={styles.frequencyBadge}>{recipient.frequency}</span>
                    </td>
                    <td style={styles.tableTd}>{recipient.lastSent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showAddRecipientModal && (
          <div style={styles.modalOverlay} onClick={() => setShowAddRecipientModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Add Report Recipient</h2>
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name</label>
                <input
                  style={styles.input}
                  type="text"
                  value={newRecipient.name}
                  onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  style={styles.input}
                  type="email"
                  value={newRecipient.email}
                  onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Report Frequency</label>
                <select
                  style={styles.select}
                  value={newRecipient.frequency}
                  onChange={(e) => setNewRecipient({ ...newRecipient, frequency: e.target.value })}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              <div style={styles.modalActions}>
                <button
                  style={styles.buttonSecondary}
                  onClick={() => setShowAddRecipientModal(false)}
                >
                  Cancel
                </button>
                <button
                  style={styles.buttonPrimary}
                  onClick={() => setShowAddRecipientModal(false)}
                >
                  Add Recipient
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
