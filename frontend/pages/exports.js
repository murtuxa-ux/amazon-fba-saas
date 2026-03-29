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

const MOCK_EXPORTS = [
  {
    id: 1,
    title: 'Products',
    description: 'Export complete product catalog with SKUs, pricing, and inventory',
    recordCount: 1247,
    lastExported: '2026-03-28',
    icon: '📦',
  },
  {
    id: 2,
    title: 'Orders',
    description: 'Export all orders with customer info, shipping, and payment details',
    recordCount: 5842,
    lastExported: '2026-03-29',
    icon: '📋',
  },
  {
    id: 3,
    title: 'Inventory',
    description: 'Export inventory levels across all warehouses and fulfillment centers',
    recordCount: 1247,
    lastExported: '2026-03-30',
    icon: '📊',
  },
  {
    id: 4,
    title: 'P&L Report',
    description: 'Export profit and loss analysis with revenue, COGS, and margins',
    recordCount: 156,
    lastExported: '2026-03-25',
    icon: '💰',
  },
  {
    id: 5,
    title: 'Client List',
    description: 'Export client information, contact details, and account history',
    recordCount: 89,
    lastExported: '2026-03-27',
    icon: '👥',
  },
  {
    id: 6,
    title: 'PPC Data',
    description: 'Export advertising performance, spend, clicks, and conversions',
    recordCount: 2156,
    lastExported: '2026-03-30',
    icon: '📈',
  },
  {
    id: 7,
    title: 'Supplier List',
    description: 'Export supplier contacts, payment terms, and product sourcing info',
    recordCount: 42,
    lastExported: '2026-03-22',
    icon: '🏭',
  },
  {
    id: 8,
    title: 'Audit Log',
    description: 'Export system activity log with user actions and timestamps',
    recordCount: 12890,
    lastExported: '2026-03-30',
    icon: '🔍',
  },
];

const MOCK_SCHEDULED = [
  {
    id: 1,
    name: 'Daily Product Sync',
    format: 'CSV',
    frequency: 'Daily',
    destination: 'Email',
    lastRun: '2026-03-30 08:00 AM',
    nextRun: '2026-03-31 08:00 AM',
    status: 'Scheduled',
  },
  {
    id: 2,
    name: 'Weekly Sales Report',
    format: 'CSV',
    frequency: 'Weekly',
    destination: 'Google Drive',
    lastRun: '2026-03-23 09:00 AM',
    nextRun: '2026-03-31 09:00 AM',
    status: 'Scheduled',
  },
  {
    id: 3,
    name: 'Monthly Financial Summary',
    format: 'CSV',
    frequency: 'Monthly',
    destination: 'Email',
    lastRun: '2026-03-01 10:00 AM',
    nextRun: '2026-04-01 10:00 AM',
    status: 'Scheduled',
  },
];

const MOCK_HISTORY = [
  {
    id: 1,
    fileName: 'products_export_20260330.csv',
    type: 'Products',
    size: '2.4 MB',
    exportedBy: 'Sarah Chen',
    date: '2026-03-30 14:32 PM',
    status: 'Completed',
  },
  {
    id: 2,
    fileName: 'orders_export_20260330.csv',
    type: 'Orders',
    size: '5.1 MB',
    exportedBy: 'Mike Johnson',
    date: '2026-03-30 12:15 PM',
    status: 'Completed',
  },
  {
    id: 3,
    fileName: 'ppc_data_export_20260330.csv',
    type: 'PPC Data',
    size: '1.8 MB',
    exportedBy: 'Alex Rodriguez',
    date: '2026-03-30 10:45 AM',
    status: 'Completed',
  },
  {
    id: 4,
    fileName: 'inventory_sync_20260329.csv',
    type: 'Inventory',
    size: '3.2 MB',
    exportedBy: 'Emma Wilson',
    date: '2026-03-29 16:20 PM',
    status: 'Completed',
  },
  {
    id: 5,
    fileName: 'audit_log_export_20260329.csv',
    type: 'Audit Log',
    size: '4.7 MB',
    exportedBy: 'John Smith',
    date: '2026-03-29 09:00 AM',
    status: 'Failed',
  },
];

const generateCSV = (exportType) => {
  let headers = '';
  let rows = '';

  switch (exportType) {
    case 'Products':
      headers = 'SKU,Product Name,Price,Cost,Category,Inventory,Status\n';
      rows =
        'SKU001,Wireless Headphones,79.99,25.00,Electronics,245,Active\n' +
        'SKU002,Phone Case,19.99,5.00,Accessories,1200,Active\n' +
        'SKU003,USB Cable,9.99,2.00,Accessories,3400,Active\n' +
        'SKU004,Screen Protector,14.99,3.50,Accessories,890,Active\n' +
        'SKU005,Portable Charger,34.99,12.00,Electronics,567,Active\n';
      break;
    case 'Orders':
      headers = 'Order ID,Customer,Amount,Status,Ship Date,Tracking\n';
      rows =
        'ORD001,John Doe,79.99,Shipped,2026-03-28,AMZN123456\n' +
        'ORD002,Jane Smith,105.98,Delivered,2026-03-27,AMZN123457\n' +
        'ORD003,Bob Johnson,34.99,Processing,2026-03-30,Pending\n' +
        'ORD004,Alice Williams,144.97,Shipped,2026-03-29,AMZN123458\n' +
        'ORD005,Charlie Brown,19.99,Delivered,2026-03-25,AMZN123459\n';
      break;
    case 'Inventory':
      headers = 'SKU,Product,Warehouse A,Warehouse B,Warehouse C,Total\n';
      rows =
        'SKU001,Wireless Headphones,100,75,70,245\n' +
        'SKU002,Phone Case,400,400,400,1200\n' +
        'SKU003,USB Cable,1000,1200,1200,3400\n' +
        'SKU004,Screen Protector,300,300,290,890\n' +
        'SKU005,Portable Charger,200,180,187,567\n';
      break;
    case 'P&L Report':
      headers = 'Month,Revenue,COGS,Gross Profit,Operating Expenses,Net Income\n';
      rows =
        'January 2026,45000,18000,27000,8000,19000\n' +
        'February 2026,52000,21000,31000,9000,22000\n' +
        'March 2026,58000,23000,35000,10000,25000\n';
      break;
    case 'Client List':
      headers = 'Client ID,Company Name,Contact,Email,Phone,Status\n';
      rows =
        'CLT001,Acme Corp,John Smith,john@acme.com,555-0101,Active\n' +
        'CLT002,Tech Solutions,Sarah Chen,sarah@tech.com,555-0102,Active\n' +
        'CLT003,Global Retail,Mike Johnson,mike@retail.com,555-0103,Active\n';
      break;
    case 'PPC Data':
      headers = 'Campaign,Clicks,Impressions,Spend,Sales,ACOS,ACoS%\n';
      rows =
        'Summer Sale,1200,45000,3600,8500,0.42,42%\n' +
        'Spring Promo,890,35000,2500,6200,0.40,40%\n' +
        'Brand Awareness,650,50000,2000,3500,0.57,57%\n';
      break;
    case 'Supplier List':
      headers = 'Supplier ID,Supplier Name,Contact,Payment Terms,Lead Time\n';
      rows =
        'SUP001,Electronics Import,contact@ei.com,Net 30,14 days\n' +
        'SUP002,Asia Logistics,sales@asia.com,Net 60,21 days\n' +
        'SUP003,Premium Materials,info@premium.com,Net 45,10 days\n';
      break;
    case 'Audit Log':
      headers = 'Timestamp,User,Action,Resource,IP Address,Status\n';
      rows =
        '2026-03-30 10:15:32,Sarah Chen,Update,Product SKU001,192.168.1.1,Success\n' +
        '2026-03-30 09:45:18,Mike Johnson,Login,User Account,192.168.1.2,Success\n' +
        '2026-03-30 08:20:05,Alex Rodriguez,Create,Order,192.168.1.3,Success\n';
      break;
    default:
      headers = 'Data\n';
      rows = 'Sample data\n';
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
                <div style={styles.exportMeta}>📊 {exp.recordCount.toLocaleString()} records</div>
                <div style={styles.exportMeta}>🕐 Last: {exp.lastExported}</div>
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
