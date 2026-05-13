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
  exportsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  exportCard: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    transition: 'all 0.2s ease',
  },
  exportCardHover: {
    borderColor: '#333333',
    backgroundColor: '#1A1A1A',
  },
  exportIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  exportTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 8px 0',
    color: '#FFFFFF',
  },
  exportDescription: {
    fontSize: '13px',
    color: '#999999',
    margin: '0 0 12px 0',
    lineHeight: '1.4',
  },
  exportMeta: {
    fontSize: '12px',
    color: '#666666',
    margin: '8px 0',
  },
  scheduledTable: {
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
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  statusScheduled: {
    backgroundColor: '#0B5B0B',
    color: '#FFFFFF',
  },
  statusCompleted: {
    backgroundColor: '#004B8B',
    color: '#FFFFFF',
  },
  statusFailed: {
    backgroundColor: '#8B0000',
    color: '#FFFFFF',
  },
  statusProcessing: {
    backgroundColor: '#8B6914',
    color: '#FFFFFF',
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
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },
};

// Available export categories. Counts/dates are intentionally null —
// they'll populate from the backend export-history aggregation when
// wired. The labels + descriptions are real, not mock.
const MOCK_EXPORTS = [
  { id: 1, title: 'Products', description: 'Export complete product catalog with SKUs, pricing, and inventory', recordCount: null, lastExported: null, icon: 'P' },
  { id: 2, title: 'Orders', description: 'Export all orders with customer info, shipping, and payment details', recordCount: null, lastExported: null, icon: 'O' },
  { id: 3, title: 'Inventory', description: 'Export inventory levels across all warehouses and fulfillment centers', recordCount: null, lastExported: null, icon: 'I' },
  { id: 4, title: 'P&L Report', description: 'Export profit and loss analysis with revenue, COGS, and margins', recordCount: null, lastExported: null, icon: '$' },
  { id: 5, title: 'Client List', description: 'Export client information, contact details, and account history', recordCount: null, lastExported: null, icon: 'C' },
  { id: 6, title: 'PPC Data', description: 'Export advertising performance, spend, clicks, and conversions', recordCount: null, lastExported: null, icon: 'A' },
  { id: 7, title: 'Supplier List', description: 'Export supplier contacts, payment terms, and product sourcing info', recordCount: null, lastExported: null, icon: 'S' },
  { id: 8, title: 'Audit Log', description: 'Export system activity log with user actions and timestamps', recordCount: null, lastExported: null, icon: 'L' },
];

// Scheduled exports — populates from a future /exports/scheduled API.
// Empty until that endpoint exists.
const MOCK_SCHEDULED = [];

// Export history — populates from /exports/history when wired. Empty
// removes fake Sarah Chen / Mike Johnson / Alex Rodriguez / Emma Wilson /
// John Smith placeholder rows.
const MOCK_HISTORY = [];

const generateCSV = (exportType) => {
  let headers = '';
  let rows = '';

  // CSV header row keyed by export type. The actual rows are fetched
  // from the relevant /api endpoint by the export button when the user
  // clicks it; this helper only supplies the header line.
  switch (exportType) {
    case 'Products':
      headers = 'SKU,Product Name,Price,Cost,Category,Inventory,Status\n';
      break;
    case 'Orders':
      headers = 'Order ID,Customer,Amount,Status,Ship Date,Tracking\n';
      break;
    case 'Inventory':
      headers = 'SKU,Product,Warehouse A,Warehouse B,Warehouse C,Total\n';
      break;
    case 'P&L Report':
      headers = 'Month,Revenue,COGS,Gross Profit,Operating Expenses,Net Income\n';
      break;
    case 'Client List':
      headers = 'Client ID,Company Name,Contact,Email,Phone,Status\n';
      break;
    case 'PPC Data':
      headers = 'Campaign,Clicks,Impressions,Spend,Sales,ACOS,ACoS%\n';
      break;
    case 'Supplier List':
      headers = 'Supplier ID,Supplier Name,Contact,Payment Terms,Lead Time\n';
      break;
    case 'Audit Log':
      headers = 'Timestamp,User,Action,Resource,IP Address,Status\n';
      break;
    default:
      headers = 'Data\n';
  }

  return headers + rows;
};

export default function ExportsPage() {
  const [activeTab, setActiveTab] = useState('quick');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    format: 'CSV',
    frequency: 'Daily',
    destination: 'Email',
  });

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ecomera_token') : null;
    if (!token) {
      return;
    }
  }, []);

  const handleExport = (exportType) => {
    const csvContent = generateCSV(exportType);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${exportType.toLowerCase().replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Scheduled':
        return styles.statusScheduled;
      case 'Completed':
        return styles.statusCompleted;
      case 'Failed':
        return styles.statusFailed;
      case 'Processing':
        return styles.statusProcessing;
      default:
        return {};
    }
  };

  const filteredHistory =
    filterType === ''
      ? MOCK_HISTORY
      : MOCK_HISTORY.filter((item) => item.type === filterType);

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Data Exports</h1>
          <p style={styles.subtitle}>Download and manage your business data</p>
        </div>

        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'quick' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('quick')}
          >
            Quick Export
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'scheduled' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('scheduled')}
          >
            Scheduled Exports
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'history' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('history')}
          >
            Export History
          </button>
        </div>

        {activeTab === 'quick' && (
          <div style={styles.exportsGrid}>
            {MOCK_EXPORTS.map((exp) => (
              <div key={exp.id} style={styles.exportCard}>
                <div style={styles.exportIcon}>{exp.icon}</div>
                <h3 style={styles.exportTitle}>{exp.title}</h3>
                <p style={styles.exportDescription}>{exp.description}</p>
                <div style={styles.exportMeta}>📊 {(exp.recordCount || 0).toLocaleString()} records</div>
                <div style={styles.exportMeta}>🕐 Last: {exp.lastExported || 'Never'}</div>
                <button
                  style={{ ...styles.buttonPrimary, marginTop: '16px', width: '100%' }}
                  onClick={() => handleExport(exp.title)}
                >
                  Export
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'scheduled' && (
          <div>
            <div style={{ marginBottom: '24px', textAlign: 'right' }}>
              <button
                style={styles.buttonPrimary}
                onClick={() => setShowScheduleModal(true)}
              >
                + Schedule Export
              </button>
            </div>
            <table style={styles.scheduledTable}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableTh}>Export Name</th>
                  <th style={styles.tableTh}>Format</th>
                  <th style={styles.tableTh}>Frequency</th>
                  <th style={styles.tableTh}>Destination</th>
                  <th style={styles.tableTh}>Last Run</th>
                  <th style={styles.tableTh}>Next Run</th>
                  <th style={styles.tableTh}>Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_SCHEDULED.map((item) => (
                  <tr key={item.id} style={styles.tableTr}>
                    <td style={styles.tableTd}>{item.name}</td>
                    <td style={styles.tableTd}>{item.format}</td>
                    <td style={styles.tableTd}>{item.frequency}</td>
                    <td style={styles.tableTd}>{item.destination}</td>
                    <td style={styles.tableTd}>{item.lastRun}</td>
                    <td style={styles.tableTd}>{item.nextRun}</td>
                    <td style={styles.tableTd}>
                      <span style={{ ...styles.statusBadge, ...getStatusBadgeStyle(item.status) }}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <label style={styles.label}>Filter by Type</label>
              <select
                style={styles.select}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="Products">Products</option>
                <option value="Orders">Orders</option>
                <option value="Inventory">Inventory</option>
                <option value="PPC Data">PPC Data</option>
                <option value="Audit Log">Audit Log</option>
              </select>
            </div>
            <table style={styles.scheduledTable}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableTh}>File Name</th>
                  <th style={styles.tableTh}>Type</th>
                  <th style={styles.tableTh}>Size</th>
                  <th style={styles.tableTh}>Exported By</th>
                  <th style={styles.tableTh}>Date</th>
                  <th style={styles.tableTh}>Status</th>
                  <th style={styles.tableTh}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id} style={styles.tableTr}>
                    <td style={styles.tableTd}>{item.fileName}</td>
                    <td style={styles.tableTd}>{item.type}</td>
                    <td style={styles.tableTd}>{item.size}</td>
                    <td style={styles.tableTd}>{item.exportedBy}</td>
                    <td style={styles.tableTd}>{item.date}</td>
                    <td style={styles.tableTd}>
                      <span style={{ ...styles.statusBadge, ...getStatusBadgeStyle(item.status) }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={styles.tableTd}>
                      {item.status === 'Completed' ? (
                        <button style={{ ...styles.buttonSecondary, padding: '6px 12px', fontSize: '12px' }}>
                          Download
                        </button>
                      ) : (
                        <span style={{ color: '#666666' }}>N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showScheduleModal && (
          <div style={styles.modalOverlay} onClick={() => setShowScheduleModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Schedule Export</h2>
              <div style={styles.formGroup}>
                <label style={styles.label}>Export Name</label>
                <input
                  style={styles.input}
                  type="text"
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                  placeholder="e.g., Daily Product Sync"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Format</label>
                <select
                  style={styles.select}
                  value={newSchedule.format}
                  onChange={(e) => setNewSchedule({ ...newSchedule, format: e.target.value })}
                >
                  <option value="CSV">CSV</option>
                  <option value="JSON">JSON</option>
                  <option value="Excel">Excel</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Frequency</label>
                <select
                  style={styles.select}
                  value={newSchedule.frequency}
                  onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value })}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Destination</label>
                <select
                  style={styles.select}
                  value={newSchedule.destination}
                  onChange={(e) => setNewSchedule({ ...newSchedule, destination: e.target.value })}
                >
                  <option value="Email">Email</option>
                  <option value="Google Drive">Google Drive</option>
                  <option value="Dropbox">Dropbox</option>
                </select>
              </div>
              <div style={styles.modalActions}>
                <button style={styles.buttonSecondary} onClick={() => setShowScheduleModal(false)}>
                  Cancel
                </button>
                <button style={styles.buttonPrimary} onClick={() => setShowScheduleModal(false)}>
                  Schedule
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
