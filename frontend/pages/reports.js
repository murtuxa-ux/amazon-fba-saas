import { useState, useEffect } from 'react';
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
  headerTitle: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  headerSubtitle: {
    fontSize: '14px',
    color: '#A0A0A0',
  },
  tabsContainer: {
    display: 'flex',
    gap: '16px',
    borderBottom: '1px solid #1E1E1E',
    marginBottom: '32px',
    overflowX: 'auto',
  },
  tab: {
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#A0A0A0',
    border: 'none',
    backgroundColor: 'transparent',
    borderBottom: '2px solid transparent',
    transition: 'all 0.3s ease',
  },
  tabActive: {
    color: '#FFD700',
    borderBottom: '2px solid #FFD700',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  card: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  cardHover: {
    backgroundColor: '#1A1A1A',
    borderColor: '#FFD700',
  },
  cardIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  cardDescription: {
    fontSize: '12px',
    color: '#A0A0A0',
    marginBottom: '12px',
    lineHeight: '1.5',
  },
  cardMeta: {
    fontSize: '11px',
    color: '#707070',
    marginBottom: '12px',
  },
  button: {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: '#FFD700',
    color: '#000',
  },
  buttonHover: {
    backgroundColor: '#FFF000',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    border: '1px solid #1E1E1E',
    color: '#FFFFFF',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  tableHeader: {
    backgroundColor: '#111111',
    borderBottom: '1px solid #1E1E1E',
    textAlign: 'left',
  },
  tableHeaderCell: {
    padding: '12px 16px',
    fontWeight: '600',
    color: '#A0A0A0',
  },
  tableRow: {
    borderBottom: '1px solid #1E1E1E',
    transition: 'background-color 0.3s ease',
  },
  tableRowHover: {
    backgroundColor: '#111111',
  },
  tableCell: {
    padding: '12px 16px',
    color: '#FFFFFF',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  badgeReady: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#22C55E',
  },
  badgeGenerating: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    color: '#EAB308',
  },
  badgeFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#EF4444',
  },
  badgeScheduled: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3B82F6',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  iconButton: {
    padding: '6px 10px',
    fontSize: '12px',
    border: '1px solid #1E1E1E',
    backgroundColor: 'transparent',
    color: '#A0A0A0',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  iconButtonHover: {
    borderColor: '#FFD700',
    color: '#FFD700',
  },
  modal: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '1000',
  },
  modalContent: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '32px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '6px',
    color: '#A0A0A0',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '13px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '13px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '13px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    minHeight: '100px',
    resize: 'vertical',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    justifyContent: 'flex-end',
  },
  closeButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#A0A0A0',
    fontSize: '24px',
    cursor: 'pointer',
  },
  listItem: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemDetails: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '4px',
  },
  listItemMeta: {
    fontSize: '12px',
    color: '#A0A0A0',
  },
  listItemActions: {
    display: 'flex',
    gap: '8px',
  },
  toggle: {
    width: '40px',
    height: '24px',
    backgroundColor: '#1E1E1E',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.3s ease',
  },
  toggleActive: {
    backgroundColor: '#FFD700',
  },
  toggleSwitch: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    transition: 'left 0.3s ease',
  },
  toggleSwitchActive: {
    left: '18px',
  },
  dragHandle: {
    cursor: 'grab',
    color: '#A0A0A0',
    marginRight: '8px',
    fontSize: '16px',
  },
  moduleBlock: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleBlockSelected: {
    borderColor: '#FFD700',
  },
  bulkActions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '16px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#A0A0A0',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#FFD700',
  },
};

// Report template catalog. Categories are real (the backend supports each
// of these via /reports/executive, /reports/weekly-summary, /report_generator
// templates). lastGenerated is intentionally null until /reports/saved
// returns the actual most-recent generation per template per org.
const reportTemplates = [
  { id: 1, icon: '📊', title: 'Monthly P&L', description: 'Comprehensive profit and loss statement', lastGenerated: null },
  { id: 2, icon: '📈', title: 'Weekly Performance', description: 'Sales, orders, and revenue trends', lastGenerated: null },
  { id: 3, icon: '📦', title: 'Inventory Health', description: 'Stock levels and inventory metrics', lastGenerated: null },
  { id: 4, icon: '🎯', title: 'PPC Campaign Summary', description: 'Ad spend, ACOS, and campaign performance', lastGenerated: null },
  { id: 5, icon: '👥', title: 'Client Overview', description: 'Account summary and client metrics', lastGenerated: null },
  { id: 6, icon: '🛍️', title: 'Product Analysis', description: 'Top products and performance breakdown', lastGenerated: null },
  { id: 7, icon: '🚚', title: 'Supplier Report', description: 'Supplier performance and costs', lastGenerated: null },
  { id: 8, icon: '💰', title: 'Cash Flow Statement', description: 'Cash in and outflows analysis', lastGenerated: null },
];

// Generated-report history and schedule list — populate from
// /reports/saved and /reports/scheduled when those endpoints ship.
// Until then, empty (instead of fake "February P&L by John Doe" rows
// every customer sees).
const generatedReportsMock = [];
const scheduledReportsMock = [];

const availableModules = [
  { id: 1, name: 'Revenue Chart', icon: '📊' },
  { id: 2, name: 'Profit Table', icon: '💹' },
  { id: 3, name: 'Inventory Status', icon: '📦' },
  { id: 4, name: 'PPC Metrics', icon: '🎯' },
  { id: 5, name: 'Top Products', icon: '⭐' },
  { id: 6, name: 'Client Summary', icon: '👥' },
  { id: 7, name: 'Order History', icon: '📋' },
  { id: 8, name: 'Expense Breakdown', icon: '💰' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('templates');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedReports, setSelectedReports] = useState(new Set());
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedModules, setSelectedModules] = useState([]);
  const [customReportName, setCustomReportName] = useState('');
  const [customReportDesc, setCustomReportDesc] = useState('');
  const [builderModalOpen, setBuilderModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    dateFrom: '',
    dateTo: '',
    client: '',
    format: 'PDF',
    recipients: '',
  });

  const [scheduleFormData, setScheduleFormData] = useState({
    reportType: '',
    frequency: 'Weekly',
    dayOfWeek: 'Monday',
    time: '09:00',
    recipients: '',
    format: 'PDF',
  });

  const handleGenerateClick = (template) => {
    setSelectedTemplate(template);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedTemplate(null);
    setFormData({ dateFrom: '', dateTo: '', client: '', format: 'PDF', recipients: '' });
  };

  const handleScheduleModalClose = () => {
    setScheduleModalOpen(false);
    setScheduleFormData({ reportType: '', frequency: 'Weekly', dayOfWeek: 'Monday', time: '09:00', recipients: '', format: 'PDF' });
  };

  const handleBuilderModalClose = () => {
    setBuilderModalOpen(false);
    setSelectedModules([]);
    setCustomReportName('');
    setCustomReportDesc('');
  };

  const handleReportCheckbox = (reportId) => {
    const newSelected = new Set(selectedReports);
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId);
    } else {
      newSelected.add(reportId);
    }
    setSelectedReports(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedReports.size === generatedReportsMock.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(generatedReportsMock.map(r => r.id)));
    }
  };

  const handleAddModule = (module) => {
    if (!selectedModules.find(m => m.id === module.id)) {
      setSelectedModules([...selectedModules, module]);
    }
  };

  const handleRemoveModule = (moduleId) => {
    setSelectedModules(selectedModules.filter(m => m.id !== moduleId));
  };

  const handleMoveModule = (index, direction) => {
    const newModules = [...selectedModules];
    if (direction === 'up' && index > 0) {
      [newModules[index], newModules[index - 1]] = [newModules[index - 1], newModules[index]];
    } else if (direction === 'down' && index < newModules.length - 1) {
      [newModules[index], newModules[index + 1]] = [newModules[index + 1], newModules[index]];
    }
    setSelectedModules(newModules);
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Ready':
        return { ...styles.statusBadge, ...styles.badgeReady };
      case 'Generating':
        return { ...styles.statusBadge, ...styles.badgeGenerating };
      case 'Failed':
        return { ...styles.statusBadge, ...styles.badgeFailed };
      case 'Scheduled':
        return { ...styles.statusBadge, ...styles.badgeScheduled };
      default:
        return { ...styles.statusBadge };
    }
  };

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          {/* BUG-28 Sprint 3: was <div>; bumped to <h1> for a11y / SEO. */}
          <h1 style={{ ...styles.headerTitle, margin: 0 }}>Reports</h1>
          <div style={styles.headerSubtitle}>Generate, schedule, and manage business reports</div>
        </div>

        <div style={styles.tabsContainer}>
          {['templates', 'generated', 'scheduled', 'builder'].map((tab) => (
            <button
              key={tab}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'templates' && 'Report Templates'}
              {tab === 'generated' && 'Generated Reports'}
              {tab === 'scheduled' && 'Scheduled Reports'}
              {tab === 'builder' && 'Custom Builder'}
            </button>
          ))}
        </div>

        {activeTab === 'templates' && (
          <div>
            <div style={styles.grid}>
              {reportTemplates.map((template) => (
                <div
                  key={template.id}
                  style={styles.card}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = styles.cardHover.backgroundColor;
                    e.currentTarget.style.borderColor = styles.cardHover.borderColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = styles.card.backgroundColor;
                    e.currentTarget.style.borderColor = styles.card.borderColor || '#1E1E1E';
                  }}
                >
                  <div style={styles.cardIcon}>{template.icon}</div>
                  <div style={styles.cardTitle}>{template.title}</div>
                  <div style={styles.cardDescription}>{template.description}</div>
                  <div style={styles.cardMeta}>Last generated: {template.lastGenerated}</div>
                  <button
                    style={styles.button}
                    onClick={() => handleGenerateClick(template)}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = styles.buttonHover.backgroundColor;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = styles.button.backgroundColor;
                    }}
                  >
                    Generate
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'generated' && (
          <div>
            <div style={styles.bulkActions}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={selectedReports.size === generatedReportsMock.length && selectedReports.size > 0}
                  onChange={handleSelectAll}
                />
                <span style={{ fontSize: '13px' }}>
                  {selectedReports.size > 0 ? `${selectedReports.size} selected` : 'Select all'}
                </span>
              </label>
              {selectedReports.size > 0 && (
                <>
                  <button style={{ ...styles.button, ...styles.secondaryButton }}>
                    📥 Download All ({selectedReports.size})
                  </button>
                  <button style={{ ...styles.button, ...styles.secondaryButton }}>
                    🗑️ Delete Selected
                  </button>
                </>
              )}
            </div>

            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={{ ...styles.tableHeaderCell, width: '40px' }}>
                    <input
                      type="checkbox"
                      style={styles.checkbox}
                      checked={selectedReports.size === generatedReportsMock.length && selectedReports.size > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={styles.tableHeaderCell}>Report Name</th>
                  <th style={styles.tableHeaderCell}>Type</th>
                  <th style={styles.tableHeaderCell}>Date Range</th>
                  <th style={styles.tableHeaderCell}>Generated By</th>
                  <th style={styles.tableHeaderCell}>Status</th>
                  <th style={styles.tableHeaderCell}>Created At</th>
                  <th style={styles.tableHeaderCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {generatedReportsMock.map((report) => (
                  <tr
                    key={report.id}
                    style={styles.tableRow}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = styles.tableRowHover.backgroundColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={styles.tableCell}>
                      <input
                        type="checkbox"
                        style={styles.checkbox}
                        checked={selectedReports.has(report.id)}
                        onChange={() => handleReportCheckbox(report.id)}
                      />
                    </td>
                    <td style={styles.tableCell}>{report.name}</td>
                    <td style={styles.tableCell}>{report.type}</td>
                    <td style={styles.tableCell}>{report.dateRange}</td>
                    <td style={styles.tableCell}>{report.generatedBy}</td>
                    <td style={styles.tableCell}>
                      <div style={getStatusBadgeStyle(report.status)}>{report.status}</div>
                    </td>
                    <td style={styles.tableCell}>{report.createdAt}</td>
                    <td style={styles.tableCell}>
                      <div style={styles.actionButtons}>
                        <button style={styles.iconButton} title="Download">📥</button>
                        <button style={styles.iconButton} title="Share">🔗</button>
                        <button style={styles.iconButton} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'scheduled' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <button
                style={styles.button}
                onClick={() => setScheduleModalOpen(true)}
              >
                + Create Schedule
              </button>
            </div>

            {scheduledReportsMock.map((schedule) => (
              <div key={schedule.id} style={styles.listItem}>
                <div style={styles.listItemDetails}>
                  <div style={styles.listItemTitle}>{schedule.type}</div>
                  <div style={styles.listItemMeta}>
                    Frequency: {schedule.frequency} • Next Run: {schedule.nextRun} • Recipients: {schedule.recipients}
                  </div>
                </div>
                <div style={styles.listItemActions}>
                  <button
                    style={{
                      ...styles.toggle,
                      ...(schedule.active ? styles.toggleActive : {}),
                    }}
                  >
                    <div
                      style={{
                        ...styles.toggleSwitch,
                        ...(schedule.active ? styles.toggleSwitchActive : {}),
                      }}
                    />
                  </button>
                  <button style={styles.iconButton}>✏️</button>
                  <button style={styles.iconButton}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'builder' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <button
                style={styles.button}
                onClick={() => setBuilderModalOpen(true)}
              >
                + Start New Custom Report
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Available Modules</div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {availableModules.map((module) => (
                    <button
                      key={module.id}
                      style={{
                        ...styles.card,
                        textAlign: 'left',
                        padding: '12px',
                        cursor: 'pointer',
                        marginBottom: '0',
                      }}
                      onClick={() => handleAddModule(module)}
                    >
                      <span style={{ fontSize: '18px', marginRight: '8px' }}>{module.icon}</span>
                      {module.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Selected Modules</div>
                {selectedModules.length === 0 ? (
                  <div style={{ ...styles.card, color: '#707070', textAlign: 'center', padding: '32px' }}>
                    Click modules on the left to add them
                  </div>
                ) : (
                  <div>
                    {selectedModules.map((module, index) => (
                      <div key={module.id} style={styles.moduleBlock}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={styles.dragHandle}>⋮⋮</span>
                          <span style={{ fontSize: '18px', marginRight: '8px' }}>{module.icon}</span>
                          {module.name}
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            style={styles.iconButton}
                            onClick={() => handleMoveModule(index, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </button>
                          <button
                            style={styles.iconButton}
                            onClick={() => handleMoveModule(index, 'down')}
                            disabled={index === selectedModules.length - 1}
                          >
                            ↓
                          </button>
                          <button
                            style={styles.iconButton}
                            onClick={() => handleRemoveModule(module.id)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {modalOpen && (
          <div style={styles.modal} onClick={handleModalClose}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button style={styles.closeButton} onClick={handleModalClose}>✕</button>
              <div style={styles.modalTitle}>Generate {selectedTemplate?.title}</div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Date From</label>
                <input
                  type="date"
                  style={styles.input}
                  value={formData.dateFrom}
                  onChange={(e) => setFormData({ ...formData, dateFrom: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Date To</label>
                <input
                  type="date"
                  style={styles.input}
                  value={formData.dateTo}
                  onChange={(e) => setFormData({ ...formData, dateTo: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Client</label>
                <select
                  style={styles.select}
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                >
                  <option value="">Select a client</option>
                  <option value="all">All Clients</option>
                  <option value="client1">Client 1</option>
                  <option value="client2">Client 2</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Format</label>
                <select
                  style={styles.select}
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                >
                  <option value="PDF">PDF</option>
                  <option value="CSV">CSV</option>
                  <option value="Excel">Excel</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email Recipients (comma-separated)</label>
                <input
                  type="email"
                  style={styles.input}
                  placeholder="user@example.com, other@example.com"
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                />
              </div>

              <div style={styles.modalButtons}>
                <button style={{ ...styles.button, ...styles.secondaryButton }} onClick={handleModalClose}>
                  Cancel
                </button>
                <button style={styles.button}>Generate Report</button>
              </div>
            </div>
          </div>
        )}

        {scheduleModalOpen && (
          <div style={styles.modal} onClick={handleScheduleModalClose}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button style={styles.closeButton} onClick={handleScheduleModalClose}>✕</button>
              <div style={styles.modalTitle}>Create Report Schedule</div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Report Type</label>
                <select
                  style={styles.select}
                  value={scheduleFormData.reportType}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, reportType: e.target.value })}
                >
                  <option value="">Select a report type</option>
                  {reportTemplates.map((t) => (
                    <option key={t.id} value={t.title}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Frequency</label>
                <select
                  style={styles.select}
                  value={scheduleFormData.frequency}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, frequency: e.target.value })}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                </select>
              </div>

              {scheduleFormData.frequency === 'Weekly' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Day of Week</label>
                  <select
                    style={styles.select}
                    value={scheduleFormData.dayOfWeek}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, dayOfWeek: e.target.value })}
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Time (24h format)</label>
                <input
                  type="time"
                  style={styles.input}
                  value={scheduleFormData.time}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, time: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email Recipients (comma-separated)</label>
                <input
                  type="email"
                  style={styles.input}
                  placeholder="user@example.com, other@example.com"
                  value={scheduleFormData.recipients}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, recipients: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Format</label>
                <select
                  style={styles.select}
                  value={scheduleFormData.format}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, format: e.target.value })}
                >
                  <option value="PDF">PDF</option>
                  <option value="CSV">CSV</option>
                  <option value="Excel">Excel</option>
                </select>
              </div>

              <div style={styles.modalButtons}>
                <button style={{ ...styles.button, ...styles.secondaryButton }} onClick={handleScheduleModalClose}>
                  Cancel
                </button>
                <button style={styles.button}>Create Schedule</button>
              </div>
            </div>
          </div>
        )}

        {builderModalOpen && (
          <div style={styles.modal} onClick={handleBuilderModalClose}>
            <div style={{ ...styles.modalContent, maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
              <button style={styles.closeButton} onClick={handleBuilderModalClose}>✕</button>
              <div style={styles.modalTitle}>Save Custom Report</div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Report Name</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="e.g., Q1 Sales Dashboard"
                  value={customReportName}
                  onChange={(e) => setCustomReportName(e.target.value)}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  style={styles.textarea}
                  placeholder="Describe what this report shows..."
                  value={customReportDesc}
                  onChange={(e) => setCustomReportDesc(e.target.value)}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Selected Modules ({selectedModules.length})</label>
                <div style={{ ...styles.card, maxHeight: '150px', overflowY: 'auto' }}>
                  {selectedModules.length === 0 ? (
                    <div style={{ color: '#707070', fontSize: '12px' }}>No modules selected</div>
                  ) : (
                    selectedModules.map((m) => (
                      <div key={m.id} style={{ padding: '6px 0', fontSize: '13px' }}>
                        {m.icon} {m.name}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={styles.modalButtons}>
                <button style={{ ...styles.button, ...styles.secondaryButton }} onClick={handleBuilderModalClose}>
                  Cancel
                </button>
                <button style={styles.button}>Preview</button>
                <button style={styles.button}>Save Template</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
