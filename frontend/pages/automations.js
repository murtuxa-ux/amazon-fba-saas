import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';

export default function AutomationsPage() {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

function getAuthHeaders() {
  if (typeof window !== "undefined") {
    const tk = localStorage.getItem("ecomera_token");
    if (tk) return { "Authorization": "Bearer " + tk, "Content-Type": "application/json" };
  }
  return { "Content-Type": "application/json" };
}

  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'dwm_daily_summary',
    schedule: '0 18 * * *',
    recipients: [],
    config: {},
    description: '',
  });

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRule, setFilterRule] = useState('all');

  // Fetch rules, templates, and logs
  useEffect(() => {
    fetchRules();
    fetchTemplates();
    fetchLogs();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch(`${apiBase}/automation/rules`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch rules');
      const data = await res.json();
      setRules(Array.isArray(data) ? data : data.rules || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${apiBase}/automation/templates`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : data.templates || []);
    } catch (err) {
      console.error('Templates fetch error:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${apiBase}/automation/logs`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : data.logs || []);
    } catch (err) {
      console.error('Logs fetch error:', err);
    }
  };

  const handleOpenModal = (template = null) => {
    if (template) {
      setFormData({
        name: '',
        type: template.type,
        schedule: template.default_schedule || '0 18 * * *',
        recipients: [],
        config: template.config || {},
        description: '',
      });
    } else {
      setFormData({
        name: '',
        type: 'dwm_daily_summary',
        schedule: '0 18 * * *',
        recipients: [],
        config: {},
        description: '',
      });
    }
    setEditingRule(null);
    setShowModal(true);
  };

  const handleEditRule = (rule) => {
    setFormData({
      name: rule.name,
      type: rule.type,
      schedule: rule.schedule,
      recipients: rule.recipients || [],
      config: rule.config || {},
      description: rule.description || '',
    });
    setEditingRule(rule.id);
    setShowModal(true);
  };

  const handleSaveRule = async () => {
    if (!formData.name.trim()) {
      setError('Rule name is required');
      return;
    }

    try {
      const method = editingRule ? 'PUT' : 'POST';
      const url = editingRule
        ? `${apiBase}/automation/rules/${editingRule}`
        : `${apiBase}/automation/rules`;

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to save rule');
      setShowModal(false);
      fetchRules();
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const res = await fetch(`${apiBase}/automation/rules/${ruleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error('Failed to delete rule');
      fetchRules();
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleRule = async (ruleId, currentStatus) => {
    try {
      const res = await fetch(`${apiBase}/automation/rules/${ruleId}/toggle`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ enabled: !currentStatus }),
      });

      if (!res.ok) throw new Error('Failed to toggle rule');
      fetchRules();
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRunNow = async (ruleId) => {
    try {
      const res = await fetch(`${apiBase}/automation/rules/${ruleId}/run-now`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error('Failed to run rule');
      fetchRules();
      fetchLogs();
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      dwm_daily_summary: 'Daily Summary',
      kpi_progress_alert: 'KPI Alert',
      reorder_alert: 'Reorder Alert',
      monthly_client_report: 'Monthly Report',
    };
    return labels[type] || type;
  };

  const getCronPreview = (cron) => {
    // BUG-30: backend returns automation rules with null cron for
    // event-triggered (non-scheduled) rules. The old `cron.split(...)`
    // threw inside a .map and crashed the whole page.
    if (!cron) return 'No schedule';
    const parts = cron.split(' ');
    if (parts.length !== 5) return 'Custom schedule';

    const [minute, hour] = parts;
    if (minute === '0' && hour !== '*') {
      return `Every day at ${hour}:00`;
    }
    if (minute !== '*' && hour !== '*') {
      const meridiem = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === '0' ? '12' : hour;
      return `Every day at ${displayHour}:${minute.padStart(2, '0')} ${meridiem}`;
    }
    return cron;
  };

  const getTypeColor = (type) => {
    const colors = {
      dwm_daily_summary: '#3B82F6',
      kpi_progress_alert: '#FCD34D',
      reorder_alert: '#FB923C',
      monthly_client_report: '#8B5CF6',
    };
    return colors[type] || '#888888';
  };

  const getTypeIcon = (type) => {
    const icons = {
      dwm_daily_summary: '✉️',
      kpi_progress_alert: '🎯',
      reorder_alert: '📦',
      monthly_client_report: '📄',
    };
    return icons[type] || '⚙️';
  };

  const filteredLogs = logs.filter((log) => {
    if (filterRule !== 'all' && log.rule_id !== filterRule) return false;
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    return true;
  });

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
    },
    main: {
      flex: 1,
      padding: '32px',
      color: '#FFFFFF',
      overflowY: 'auto',
    },
    header: {
      marginBottom: '32px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      marginBottom: '8px',
    },
    description: {
      color: '#888888',
      fontSize: '14px',
      marginBottom: '16px',
    },
    headerControls: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
    },
    button: {
      padding: '10px 16px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    buttonPrimary: {
      backgroundColor: '#FFD700',
      color: '#0A0A0A',
    },
    buttonSecondary: {
      backgroundColor: '#1E1E1E',
      color: '#FFFFFF',
      border: '1px solid #2A2A2A',
    },
    buttonDanger: {
      backgroundColor: '#EF4444',
      color: '#FFFFFF',
    },
    section: {
      marginBottom: '32px',
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '16px',
      color: '#FFFFFF',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '16px',
    },
    card: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '10px',
      padding: '16px',
      transition: 'all 0.2s',
    },
    cardHover: {
      borderColor: '#2A2A2A',
    },
    templateCard: {
      cursor: 'pointer',
    },
    ruleCard: {
      display: 'flex',
      flexDirection: 'column',
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '12px',
    },
    cardTitle: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '4px',
    },
    cardMeta: {
      fontSize: '13px',
      color: '#888888',
      marginBottom: '12px',
    },
    badge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
    },
    badgeBlue: {
      backgroundColor: '#1E3A8A',
      color: '#3B82F6',
    },
    badgeYellow: {
      backgroundColor: '#78350F',
      color: '#FCD34D',
    },
    badgeOrange: {
      backgroundColor: '#7C2D12',
      color: '#FB923C',
    },
    badgePurple: {
      backgroundColor: '#4C1D95',
      color: '#8B5CF6',
    },
    badgeGreen: {
      backgroundColor: '#022C22',
      color: '#22C55E',
    },
    badgeRed: {
      backgroundColor: '#7F1D1D',
      color: '#EF4444',
    },
    cardActions: {
      display: 'flex',
      gap: '8px',
      marginTop: '12px',
      flexWrap: 'wrap',
    },
    smallButton: {
      padding: '6px 10px',
      fontSize: '12px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'all 0.2s',
    },
    smallButtonSecondary: {
      backgroundColor: '#1E1E1E',
      color: '#FFFFFF',
      border: '1px solid #2A2A2A',
    },
    smallButtonGreen: {
      backgroundColor: '#1B7B3A',
      color: '#22C55E',
      border: 'none',
    },
    smallButtonRed: {
      backgroundColor: '#7F1D1D',
      color: '#EF4444',
      border: 'none',
    },
    toggle: {
      width: '44px',
      height: '24px',
      borderRadius: '12px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: '#1E1E1E',
    },
    toggleActive: {
      backgroundColor: '#22C55E',
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '12px',
      padding: '24px',
      width: '90%',
      maxWidth: '500px',
      maxHeight: '90vh',
      overflowY: 'auto',
    },
    formGroup: {
      marginBottom: '16px',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
      marginBottom: '6px',
      color: '#FFFFFF',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      backgroundColor: '#0A0A0A',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      color: '#FFFFFF',
      fontSize: '14px',
      boxSizing: 'border-box',
      transition: 'all 0.2s',
    },
    inputFocus: {
      borderColor: '#FFD700',
      outline: 'none',
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      backgroundColor: '#0A0A0A',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      color: '#FFFFFF',
      fontSize: '14px',
      cursor: 'pointer',
      boxSizing: 'border-box',
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      backgroundColor: '#0A0A0A',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      color: '#FFFFFF',
      fontSize: '14px',
      boxSizing: 'border-box',
      minHeight: '100px',
      fontFamily: 'inherit',
      resize: 'vertical',
    },
    recipientInput: {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px',
    },
    recipientTag: {
      display: 'inline-block',
      backgroundColor: '#1E1E1E',
      color: '#FFFFFF',
      padding: '6px 10px',
      borderRadius: '6px',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    modalActions: {
      display: 'flex',
      gap: '12px',
      marginTop: '24px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px',
    },
    tableHeader: {
      backgroundColor: '#0A0A0A',
      borderBottom: '1px solid #1E1E1E',
    },
    tableHeaderCell: {
      padding: '12px',
      textAlign: 'left',
      fontWeight: '600',
      color: '#888888',
    },
    tableRow: {
      borderBottom: '1px solid #1E1E1E',
    },
    tableCell: {
      padding: '12px',
      color: '#FFFFFF',
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#888888',
    },
    emptyStateIcon: {
      fontSize: '48px',
      marginBottom: '16px',
    },
    errorAlert: {
      backgroundColor: '#7F1D1D',
      border: '1px solid #EF4444',
      color: '#EF4444',
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '16px',
      fontSize: '13px',
    },
  };

  return (
    <div style={styles.container}>
      <Sidebar />
      <main style={styles.main}>
        {error && <div style={styles.errorAlert}>{error}</div>}

        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Automations</h1>
          <p style={styles.description}>
            Set up automated alerts, reports, and summaries
          </p>
          <div style={styles.headerControls}>
            <button
              style={{ ...styles.button, ...styles.buttonPrimary }}
              onClick={() => handleOpenModal()}
            >
              + Create Rule
            </button>
            {rules.length > 0 && (
              <button
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={() => setShowTemplates(!showTemplates)}
              >
                {showTemplates ? '✓ Templates' : 'Templates'}
              </button>
            )}
            {rules.length > 0 && (
              <button
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={() => setShowLogs(!showLogs)}
              >
                {showLogs ? '✓ Logs' : 'View Logs'}
              </button>
            )}
          </div>
        </div>

        {/* Templates Section */}
        {(showTemplates || rules.length === 0) && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              {rules.length === 0
                ? 'Get started with templates'
                : 'Templates'}
            </h2>
            <div style={styles.grid}>
              {templates.map((template) => (
                <div
                  key={template.id}
                  style={{
                    ...styles.card,
                    ...styles.templateCard,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2A2A2A';
                    e.currentTarget.style.backgroundColor = '#1A1A1A';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1E1E1E';
                    e.currentTarget.style.backgroundColor = '#111111';
                  }}
                >
                  <div style={{ marginBottom: '12px', fontSize: '28px' }}>
                    {getTypeIcon(template.type)}
                  </div>
                  <div style={styles.cardTitle}>{template.name}</div>
                  <div style={styles.cardMeta}>{template.description}</div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#888888',
                      marginBottom: '12px',
                    }}
                  >
                    Default: {getCronPreview(template.default_schedule)}
                  </div>
                  <button
                    style={{ ...styles.button, ...styles.buttonSecondary }}
                    onClick={() => handleOpenModal(template)}
                  >
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Rules Section */}
        {rules.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Active Rules ({rules.length})</h2>
            <div style={styles.grid}>
              {rules.map((rule) => (
                <div key={rule.id} style={{ ...styles.card, ...styles.ruleCard }}>
                  <div style={styles.cardHeader}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.cardTitle}>{rule.name}</div>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor: getTypeColor(rule.type),
                          opacity: 0.2,
                          color: getTypeColor(rule.type),
                        }}
                      >
                        {getTypeLabel(rule.type)}
                      </span>
                    </div>
                    <button
                      style={{
                        ...styles.toggle,
                        ...(rule.enabled ? styles.toggleActive : {}),
                      }}
                      onClick={() => handleToggleRule(rule.id, rule.enabled)}
                      title={rule.enabled ? 'Disable' : 'Enable'}
                    />
                  </div>

                  <div style={styles.cardMeta}>
                    📅 {getCronPreview(rule.schedule)}
                  </div>
                  {rule.last_run && (
                    <div style={styles.cardMeta}>
                      Last run: {new Date(rule.last_run).toLocaleDateString()}{' '}
                      {new Date(rule.last_run).toLocaleTimeString()}
                    </div>
                  )}

                  <div style={styles.cardActions}>
                    <button
                      style={{ ...styles.smallButton, ...styles.smallButtonGreen }}
                      onClick={() => handleRunNow(rule.id)}
                    >
                      ▶ Run Now
                    </button>
                    <button
                      style={{ ...styles.smallButton, ...styles.smallButtonSecondary }}
                      onClick={() => handleEditRule(rule)}
                    >
                      Edit
                    </button>
                    <button
                      style={{ ...styles.smallButton, ...styles.smallButtonSecondary }}
                      onClick={() => setShowLogs(true)}
                    >
                      Logs
                    </button>
                    <button
                      style={{ ...styles.smallButton, ...styles.smallButtonRed }}
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && rules.length === 0 && templates.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyStateIcon}>⚙️</div>
            <p>No automations yet</p>
            <p style={{ fontSize: '12px' }}>
              Create your first rule to get started
            </p>
          </div>
        )}

        {/* Logs Section */}
        {showLogs && rules.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Execution Logs</h2>

            <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
              <select
                style={styles.select}
                value={filterRule}
                onChange={(e) => setFilterRule(e.target.value)}
              >
                <option value="all">All Rules</option>
                {rules.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.name}
                  </option>
                ))}
              </select>

              <select
                style={styles.select}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>

            {filteredLogs.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead style={styles.tableHeader}>
                    <tr>
                      <th style={styles.tableHeaderCell}>Rule</th>
                      <th style={styles.tableHeaderCell}>Status</th>
                      <th style={styles.tableHeaderCell}>Message</th>
                      <th style={styles.tableHeaderCell}>Recipients</th>
                      <th style={styles.tableHeaderCell}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, idx) => (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.tableCell}>
                          {log.rule_name || 'Unknown'}
                        </td>
                        <td style={styles.tableCell}>
                          <span
                            style={{
                              ...styles.badge,
                              ...(log.status === 'success'
                                ? styles.badgeGreen
                                : log.status === 'failed'
                                ? styles.badgeRed
                                : styles.badgeYellow),
                            }}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td style={styles.tableCell}>{log.message || '-'}</td>
                        <td style={styles.tableCell}>
                          {log.recipients?.length > 0
                            ? log.recipients.slice(0, 2).join(', ') +
                              (log.recipients.length > 2
                                ? ` +${log.recipients.length - 2}`
                                : '')
                            : '-'}
                        </td>
                        <td style={styles.tableCell}>
                          {new Date(log.timestamp).toLocaleDateString()}{' '}
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p>No logs to display</p>
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div style={styles.modal} onClick={() => setShowModal(false)}>
            <div
              style={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ ...styles.title, marginBottom: '20px' }}>
                {editingRule ? 'Edit Rule' : 'Create Rule'}
              </h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>Rule Name *</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="e.g., Daily KPI Summary"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Type *</label>
                <select
                  style={styles.select}
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                >
                  <option value="dwm_daily_summary">Daily Summary</option>
                  <option value="kpi_progress_alert">KPI Progress Alert</option>
                  <option value="reorder_alert">Reorder Alert</option>
                  <option value="monthly_client_report">
                    Monthly Client Report
                  </option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Schedule (Cron) *</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="0 18 * * *"
                  value={formData.schedule}
                  onChange={(e) =>
                    setFormData({ ...formData, schedule: e.target.value })
                  }
                />
                <div style={{ fontSize: '12px', color: '#888888', marginTop: '6px' }}>
                  {getCronPreview(formData.schedule)}
                </div>
              </div>

              {formData.type === 'kpi_progress_alert' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Threshold (%)</label>
                  <input
                    type="number"
                    style={styles.input}
                    placeholder="80"
                    value={formData.config.threshold || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, threshold: e.target.value },
                      })
                    }
                  />
                </div>
              )}

              {formData.type === 'reorder_alert' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Days Threshold</label>
                  <input
                    type="number"
                    style={styles.input}
                    placeholder="7"
                    value={formData.config.days_threshold || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, days_threshold: e.target.value },
                      })
                    }
                  />
                </div>
              )}

              {formData.type === 'monthly_client_report' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <input
                      type="checkbox"
                      style={{ marginRight: '8px' }}
                      checked={formData.config.include_charts || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: {
                            ...formData.config,
                            include_charts: e.target.checked,
                          },
                        })
                      }
                    />
                    Include Charts
                  </label>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Recipients</label>
                <div style={styles.recipientInput}>
                  <input
                    type="email"
                    style={{ ...styles.input, flex: 1 }}
                    placeholder="name@example.com"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        const email = e.target.value.trim();
                        if (!formData.recipients.includes(email)) {
                          setFormData({
                            ...formData,
                            recipients: [...formData.recipients, email],
                          });
                        }
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
                <div>
                  {formData.recipients.map((email, idx) => (
                    <span key={idx} style={styles.recipientTag}>
                      {email}
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#888888',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            recipients: formData.recipients.filter(
                              (_, i) => i !== idx
                            ),
                          })
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  style={styles.textarea}
                  placeholder="Add notes about this rule..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  style={{ ...styles.button, ...styles.buttonSecondary, flex: 1 }}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  style={{ ...styles.button, ...styles.buttonPrimary, flex: 1 }}
                  onClick={handleSaveRule}
                >
                  {editingRule ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
