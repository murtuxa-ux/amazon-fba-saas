import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Sidebar from '../components/Sidebar';

const BASE_URL = 'https://amazon-fba-saas-production.up.railway.app';

const styles = {
  outerContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    color: 'white',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  container: {
    flex: 1,
    marginLeft: '250px',
    padding: '32px',
  },
  header: {
    marginBottom: '30px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: 0,
    marginBottom: '5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#999',
    margin: 0,
  },
  tabsContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    borderBottom: '1px solid #1E1E1E',
  },
  tab: {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#999',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#FFD700',
    borderBottomColor: '#FFD700',
  },
  card: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  },
  button: {
    backgroundColor: '#FFD700',
    color: '#000',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    color: '#999',
    border: '1px solid #1E1E1E',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
    marginBottom: '20px',
  },
  kpiCard: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
  },
  kpiLabel: {
    fontSize: '12px',
    color: '#999',
    marginBottom: '10px',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#FFD700',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  th: {
    backgroundColor: '#0A0A0A',
    padding: '12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#999',
    borderBottom: '1px solid #1E1E1E',
    textTransform: 'uppercase',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #1E1E1E',
    fontSize: '13px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '30px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '5px',
    color: '#999',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  badgePaid: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: '#22C55E',
  },
  badgePending: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    color: '#EAB308',
  },
  badgeOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#EF4444',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#EF4444',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '15px',
    fontSize: '13px',
  },
  successBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    color: '#22C55E',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '15px',
    fontSize: '13px',
  },
  loading: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid #FFD700',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666',
  },
  emptyStateIcon: {
    fontSize: '48px',
    marginBottom: '15px',
  },
  selector: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  actionBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
};

const API_HEADERS = {
  'Content-Type': 'application/json',
};

const getAuthHeaders = () => {
  if (typeof window === 'undefined') return API_HEADERS;
  const token = localStorage.getItem('ecomera_token');
  return {
    ...API_HEADERS,
    Authorization: `Bearer ${token}`,
  };
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value || 0);
};

const fetchAPI = async (endpoint) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API fetch error:', error);
    return null;
  }
};

const postAPI = async (endpoint, data) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API post error:', error);
    return null;
  }
};

function PnLStatementsTab() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [pnlStatements, setPnlStatements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadPnLStatements();
    }
  }, [selectedClient]);

  const loadClients = async () => {
    // BUG-10: /clients returns {count, clients: [...]} via the global
    // camelCase fetch transformer (snake → camel: {count, clients}),
    // NOT a flat array. The old `Array.isArray(data) ? data : []`
    // always evaluated to [] so the modal dropdown was empty.
    const data = await fetchAPI('/clients');
    const list = Array.isArray(data?.clients)
      ? data.clients
      : (Array.isArray(data) ? data : []);
    setClients(list);
    if (list.length > 0) setSelectedClient(list[0].id);
  };

  const loadPnLStatements = async () => {
    if (!selectedClient) return;
    setLoading(true);
    const data = await fetchAPI(`/client-pnl?client_id=${selectedClient}`);
    setPnlStatements(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleCreatePnL = async (formData) => {
    setLoading(true);
    setError('');
    setSuccess('');

    // BUG-11: month + year must be sent as integers (the backend now
    // validates ge/le bounds via Pydantic). The <input type="number">
    // surfaces strings — parseInt before sending so a user who types
    // "5" doesn't produce {month: "5", year: 5} server-side.
    const payload = {
      client_id: selectedClient,
      period: formData.period,
      month: parseInt(formData.month, 10),
      year: parseInt(formData.year, 10),
      revenue: parseFloat(formData.revenue) || 0,
      cogs: parseFloat(formData.cogs) || 0,
      ad_spend: parseFloat(formData.adSpend) || 0,
      fba_fees: parseFloat(formData.fbaFees) || 0,
      other_expenses: parseFloat(formData.otherExpenses) || 0,
    };

    const result = await postAPI('/client-pnl', payload);
    setLoading(false);

    if (result) {
      setSuccess('P&L Statement created successfully');
      setShowModal(false);
      loadPnLStatements();
    } else {
      setError('Failed to create P&L Statement');
    }
  };

  const exportCSV = () => {
    if (pnlStatements.length === 0) {
      setError('No data to export');
      return;
    }

    const headers = ['Period', 'Revenue', 'COGS', 'Gross Profit', 'Ad Spend', 'FBA Fees', 'Other Expenses', 'Net Profit', 'Margin %'];
    const rows = pnlStatements.map(stmt => [
      stmt.period || 'N/A',
      stmt.revenue || 0,
      stmt.cogs || 0,
      (stmt.revenue - stmt.cogs) || 0,
      stmt.ad_spend || 0,
      stmt.fba_fees || 0,
      stmt.other_expenses || 0,
      ((stmt.revenue - stmt.cogs - stmt.ad_spend - stmt.fba_fees - stmt.other_expenses) || 0),
      (((stmt.revenue - stmt.cogs - stmt.ad_spend - stmt.fba_fees - stmt.other_expenses) / stmt.revenue * 100) || 0).toFixed(2) + '%',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pnl-statements.csv';
    a.click();
  };

  return (
    <div>
      {error && <div style={styles.errorBanner}>{error}</div>}
      {success && <div style={styles.successBanner}>{success}</div>}

      <div style={styles.selector}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={styles.label}>Client</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            style={styles.select}
          >
            <option value="">Select a client</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={styles.label}>Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={styles.select}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-end' }}>
          <button
            onClick={() => setShowModal(true)}
            style={styles.button}
          >
            + Create P&L
          </button>
          <button
            onClick={exportCSV}
            style={styles.buttonSecondary}
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={styles.loading}></div>
          </div>
        </div>
      ) : pnlStatements.length === 0 ? (
        <div style={styles.card}>
          <div style={styles.emptyState}>
            <div style={styles.emptyStateIcon}>📊</div>
            <p>No P&L statements found. Create one to get started.</p>
          </div>
        </div>
      ) : (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Period</th>
                <th style={styles.th}>Revenue</th>
                <th style={styles.th}>COGS</th>
                <th style={styles.th}>Gross Profit</th>
                <th style={styles.th}>Ad Spend</th>
                <th style={styles.th}>FBA Fees</th>
                <th style={styles.th}>Other Expenses</th>
                <th style={styles.th}>Net Profit</th>
                <th style={styles.th}>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {pnlStatements.map((stmt, idx) => {
                const grossProfit = (stmt.revenue || 0) - (stmt.cogs || 0);
                const netProfit = grossProfit - (stmt.ad_spend || 0) - (stmt.fba_fees || 0) - (stmt.other_expenses || 0);
                const margin = stmt.revenue ? ((netProfit / stmt.revenue) * 100).toFixed(2) : 0;

                return (
                  <tr key={idx}>
                    <td style={styles.td}>{stmt.period || 'N/A'}</td>
                    <td style={styles.td}>{formatCurrency(stmt.revenue)}</td>
                    <td style={styles.td}>{formatCurrency(stmt.cogs)}</td>
                    <td style={styles.td}>{formatCurrency(grossProfit)}</td>
                    <td style={styles.td}>{formatCurrency(stmt.ad_spend)}</td>
                    <td style={styles.td}>{formatCurrency(stmt.fba_fees)}</td>
                    <td style={styles.td}>{formatCurrency(stmt.other_expenses)}</td>
                    <td style={{ ...styles.td, color: netProfit >= 0 ? '#22C55E' : '#EF4444', fontWeight: 'bold' }}>
                      {formatCurrency(netProfit)}
                    </td>
                    <td style={{ ...styles.td, color: margin >= 0 ? '#22C55E' : '#EF4444', fontWeight: 'bold' }}>
                      {margin}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CreatePnLModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreatePnL}
          period={period}
        />
      )}
    </div>
  );
}

function CreatePnLModal({ onClose, onSubmit, period }) {
  const [formData, setFormData] = useState({
    period,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    revenue: 0,
    cogs: 0,
    adSpend: 0,
    fbaFees: 0,
    otherExpenses: 0,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'period' ? value : (name === 'month' || name === 'year' ? parseInt(value) : parseFloat(value) || 0),
    }));
  };

  const grossProfit = formData.revenue - formData.cogs;
  const netProfit = grossProfit - formData.adSpend - formData.fbaFees - formData.otherExpenses;
  const margin = formData.revenue ? ((netProfit / formData.revenue) * 100).toFixed(2) : 0;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h2 style={styles.modalTitle}>Create P&L Statement</h2>

        <div style={styles.formGroup}>
          <label style={styles.label}>Period</label>
          <select
            name="period"
            value={formData.period}
            onChange={handleChange}
            style={styles.select}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Month</label>
            <input
              type="number"
              name="month"
              min="1"
              max="12"
              value={formData.month}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Year</label>
            <input
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Revenue</label>
          <input
            type="number"
            name="revenue"
            step="0.01"
            value={formData.revenue}
            onChange={handleChange}
            style={styles.input}
            placeholder="0.00"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>COGS (Cost of Goods Sold)</label>
          <input
            type="number"
            name="cogs"
            step="0.01"
            value={formData.cogs}
            onChange={handleChange}
            style={styles.input}
            placeholder="0.00"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Ad Spend</label>
          <input
            type="number"
            name="adSpend"
            step="0.01"
            value={formData.adSpend}
            onChange={handleChange}
            style={styles.input}
            placeholder="0.00"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>FBA Fees</label>
          <input
            type="number"
            name="fbaFees"
            step="0.01"
            value={formData.fbaFees}
            onChange={handleChange}
            style={styles.input}
            placeholder="0.00"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Other Expenses</label>
          <input
            type="number"
            name="otherExpenses"
            step="0.01"
            value={formData.otherExpenses}
            onChange={handleChange}
            style={styles.input}
            placeholder="0.00"
          />
        </div>

        <div style={{ ...styles.card, backgroundColor: '#0A0A0A', marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px' }}>GROSS PROFIT</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FFD700' }}>
                {formatCurrency(grossProfit)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px' }}>NET PROFIT</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: netProfit >= 0 ? '#22C55E' : '#EF4444' }}>
                {formatCurrency(netProfit)}
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px' }}>MARGIN %</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: margin >= 0 ? '#22C55E' : '#EF4444' }}>
                {margin}%
              </div>
            </div>
          </div>
        </div>

        <div style={styles.formActions}>
          <button
            onClick={() => onSubmit(formData)}
            style={{ ...styles.button, flex: 1 }}
          >
            Save P&L
          </button>
          <button
            onClick={onClose}
            style={{ ...styles.buttonSecondary, flex: 1 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoicesTab() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    const data = await fetchAPI('/invoices');
    setInvoices(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const getStatusBadge = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'paid') return { ...styles.badge, ...styles.badgePaid };
    if (statusLower === 'pending') return { ...styles.badge, ...styles.badgePending };
    if (statusLower === 'overdue') return { ...styles.badge, ...styles.badgeOverdue };
    return { ...styles.badge, backgroundColor: '#333', color: '#999' };
  };

  return (
    <div>
      <div style={styles.actionBar}>
        <button style={styles.button}>+ Create Invoice</button>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={styles.loading}></div>
          </div>
        </div>
      ) : invoices.length === 0 ? (
        <div style={styles.card}>
          <div style={styles.emptyState}>
            <div style={styles.emptyStateIcon}>📄</div>
            <p>No invoices found.</p>
          </div>
        </div>
      ) : (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Invoice #</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice, idx) => (
                <tr key={idx}>
                  <td style={styles.td}>{invoice.invoice_number || 'N/A'}</td>
                  <td style={styles.td}>{invoice.client_name || 'N/A'}</td>
                  <td style={styles.td}>{formatCurrency(invoice.amount)}</td>
                  <td style={styles.td}>
                    <span style={getStatusBadge(invoice.status)}>
                      {invoice.status || 'Unknown'}
                    </span>
                  </td>
                  <td style={styles.td}>{invoice.due_date || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CashFlowTab() {
  const [pnlData, setPnlData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCashFlowData();
  }, []);

  const loadCashFlowData = async () => {
    setLoading(true);
    const data = await fetchAPI('/client-pnl');
    setPnlData(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const aggregateCashFlow = () => {
    const months = {};
    pnlData.forEach(stmt => {
      const month = stmt.period || 'Unknown';
      if (!months[month]) {
        months[month] = { in: 0, out: 0 };
      }
      months[month].in += stmt.revenue || 0;
      months[month].out += (stmt.cogs || 0) + (stmt.ad_spend || 0) + (stmt.fba_fees || 0) + (stmt.other_expenses || 0);
    });
    return months;
  };

  const cashFlow = aggregateCashFlow();
  const monthLabels = Object.keys(cashFlow).sort();

  const totalIn = monthLabels.reduce((sum, month) => sum + (cashFlow[month].in || 0), 0);
  const totalOut = monthLabels.reduce((sum, month) => sum + (cashFlow[month].out || 0), 0);
  const netFlow = totalIn - totalOut;

  const maxValue = Math.max(...monthLabels.map(m => Math.max(cashFlow[m].in, cashFlow[m].out)), 1);
  const chartHeight = 300;
  const barWidth = monthLabels.length > 0 ? Math.min(40, 400 / (monthLabels.length * 2)) : 40;

  return (
    <div>
      {loading ? (
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={styles.loading}></div>
          </div>
        </div>
      ) : (
        <>
          <div style={styles.grid}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>Total Cash In</div>
              <div style={styles.kpiValue}>{formatCurrency(totalIn)}</div>
            </div>
            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>Total Cash Out</div>
              <div style={{ ...styles.kpiValue, color: '#EF4444' }}>
                {formatCurrency(totalOut)}
              </div>
            </div>
            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>Net Cash Flow</div>
              <div style={{ ...styles.kpiValue, color: netFlow >= 0 ? '#22C55E' : '#EF4444' }}>
                {formatCurrency(netFlow)}
              </div>
            </div>
          </div>

          {monthLabels.length === 0 ? (
            <div style={styles.card}>
              <div style={styles.emptyState}>
                <div style={styles.emptyStateIcon}>📈</div>
                <p>No cash flow data available. Create P&L statements to view cash flow.</p>
              </div>
            </div>
          ) : (
            <div style={styles.card}>
              <svg viewBox={`0 0 ${600} ${chartHeight + 80}`} style={{ width: '100%', height: 'auto' }}>
                {/* Y-axis */}
                <line x1="50" y1="20" x2="50" y2={chartHeight + 20} stroke="#1E1E1E" strokeWidth="2" />
                {/* X-axis */}
                <line x1="50" y1={chartHeight + 20} x2="580" y2={chartHeight + 20} stroke="#1E1E1E" strokeWidth="2" />

                {/* Y-axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const value = maxValue * ratio;
                  const y = chartHeight + 20 - (ratio * chartHeight);
                  return (
                    <g key={`y-${idx}`}>
                      <text x="40" y={y + 5} textAnchor="end" fontSize="11" fill="#666">
                        ${(value / 1000).toFixed(0)}k
                      </text>
                      {idx > 0 && <line x1="45" y1={y} x2="580" y2={y} stroke="#1E1E1E" strokeWidth="1" strokeDasharray="4" />}
                    </g>
                  );
                })}

                {/* Bars */}
                {monthLabels.map((month, idx) => {
                  const spacing = (530 / monthLabels.length);
                  const x = 55 + idx * spacing + spacing / 2 - barWidth;

                  const inHeight = (cashFlow[month].in / maxValue) * chartHeight;
                  const outHeight = (cashFlow[month].out / maxValue) * chartHeight;

                  return (
                    <g key={`bar-${idx}`}>
                      {/* Cash In (Green) */}
                      <rect
                        x={x}
                        y={chartHeight + 20 - inHeight}
                        width={barWidth}
                        height={inHeight}
                        fill="#22C55E"
                        opacity="0.8"
                      />
                      {/* Cash Out (Red) */}
                      <rect
                        x={x + barWidth + 5}
                        y={chartHeight + 20 - outHeight}
                        width={barWidth}
                        height={outHeight}
                        fill="#EF4444"
                        opacity="0.8"
                      />
                      {/* X-axis label */}
                      <text
                        x={x + barWidth}
                        y={chartHeight + 40}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#666"
                      >
                        {month.substring(0, 3)}
                      </text>
                    </g>
                  );
                })}

                {/* Legend */}
                <g>
                  <rect x="60" y={chartHeight + 60} width="12" height="12" fill="#22C55E" />
                  <text x="78" y={chartHeight + 70} fontSize="11" fill="#999">
                    Cash In
                  </text>

                  <rect x="180" y={chartHeight + 60} width="12" height="12" fill="#EF4444" />
                  <text x="198" y={chartHeight + 70} fontSize="11" fill="#999">
                    Cash Out
                  </text>
                </g>
              </svg>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DashboardTab() {
  const [pnlData, setPnlData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const data = await fetchAPI('/client-pnl');
    setPnlData(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const calculateKPIs = () => {
    const totalRevenue = pnlData.reduce((sum, stmt) => sum + (stmt.revenue || 0), 0);
    const totalExpenses = pnlData.reduce((sum, stmt) => {
      return sum + (stmt.cogs || 0) + (stmt.ad_spend || 0) + (stmt.fba_fees || 0) + (stmt.other_expenses || 0);
    }, 0);
    const netProfit = totalRevenue - totalExpenses;
    const avgMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0;

    return { totalRevenue, totalExpenses, netProfit, avgMargin };
  };

  const getTopClientsByRevenue = () => {
    const clientRevenue = {};
    pnlData.forEach(stmt => {
      const clientId = stmt.client_id || 'Unknown';
      const clientName = stmt.client_name || clientId;
      if (!clientRevenue[clientId]) {
        clientRevenue[clientId] = { name: clientName, revenue: 0 };
      }
      clientRevenue[clientId].revenue += stmt.revenue || 0;
    });

    return Object.values(clientRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const getExpenseBreakdown = () => {
    const breakdown = {
      cogs: 0,
      adSpend: 0,
      fbaFees: 0,
      otherExpenses: 0,
    };

    pnlData.forEach(stmt => {
      breakdown.cogs += stmt.cogs || 0;
      breakdown.adSpend += stmt.ad_spend || 0;
      breakdown.fbaFees += stmt.fba_fees || 0;
      breakdown.otherExpenses += stmt.other_expenses || 0;
    });

    return breakdown;
  };

  const getMonthlyProfitTrend = () => {
    const trends = {};
    pnlData.forEach(stmt => {
      const month = stmt.period || 'Unknown';
      if (!trends[month]) {
        trends[month] = 0;
      }
      trends[month] += (stmt.revenue || 0) - (stmt.cogs || 0) - (stmt.ad_spend || 0) - (stmt.fba_fees || 0) - (stmt.other_expenses || 0);
    });

    return Object.entries(trends)
      .sort()
      .slice(-6)
      .map(([month, profit]) => ({ month, profit }));
  };

  const kpis = calculateKPIs();
  const topClients = getTopClientsByRevenue();
  const expenseBreakdown = getExpenseBreakdown();
  const profitTrend = getMonthlyProfitTrend();

  const totalExpenses = expenseBreakdown.cogs + expenseBreakdown.adSpend + expenseBreakdown.fbaFees + expenseBreakdown.otherExpenses;

  return (
    <div>
      {loading ? (
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={styles.loading}></div>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={styles.grid}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>Total Revenue</div>
              <div style={styles.kpiValue}>{formatCurrency(kpis.totalRevenue)}</div>
            </div>
            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>Total Expenses</div>
              <div style={{ ...styles.kpiValue, color: '#EF4444' }}>
                {formatCurrency(kpis.totalExpenses)}
              </div>
            </div>
            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>Net Profit</div>
              <div style={{ ...styles.kpiValue, color: kpis.netProfit >= 0 ? '#22C55E' : '#EF4444' }}>
                {formatCurrency(kpis.netProfit)}
              </div>
            </div>
            <div style={styles.kpiCard}>
              <div style={styles.kpiLabel}>Avg Margin</div>
              <div style={{ ...styles.kpiValue, color: kpis.avgMargin >= 0 ? '#22C55E' : '#EF4444' }}>
                {kpis.avgMargin}%
              </div>
            </div>
          </div>

          {/* Revenue by Client */}
          {topClients.length > 0 && (
            <div style={styles.card}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '16px', fontWeight: '600' }}>
                Revenue by Client (Top 5)
              </h3>
              <svg viewBox="0 0 600 250" style={{ width: '100%', height: 'auto' }}>
                {topClients.map((client, idx) => {
                  const maxRevenue = Math.max(...topClients.map(c => c.revenue), 1);
                  const y = 30 + idx * 40;
                  const barLength = (client.revenue / maxRevenue) * 400;
                  const color = ['#FFD700', '#22C55E', '#3B82F6', '#EF4444', '#8B5CF6'][idx];

                  return (
                    <g key={`client-${idx}`}>
                      <text x="20" y={y + 15} fontSize="12" fill="#999">
                        {client.name.substring(0, 20)}
                      </text>
                      <rect x="150" y={y} width={barLength} height="25" fill={color} opacity="0.8" />
                      <text x={155 + barLength} y={y + 17} fontSize="11" fill="#FFF" fontWeight="bold">
                        {formatCurrency(client.revenue)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

          {/* Expense Breakdown Donut Chart */}
          {totalExpenses > 0 && (
            <div style={styles.card}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '16px', fontWeight: '600' }}>
                Expense Breakdown
              </h3>
              <svg viewBox="0 0 400 250" style={{ width: '100%', height: 'auto' }}>
                {(() => {
                  const cx = 100;
                  const cy = 100;
                  const outerRadius = 80;
                  const innerRadius = 50;

                  const expenses = [
                    { label: 'COGS', value: expenseBreakdown.cogs, color: '#3B82F6' },
                    { label: 'Ad Spend', value: expenseBreakdown.adSpend, color: '#EF4444' },
                    { label: 'FBA Fees', value: expenseBreakdown.fbaFees, color: '#8B5CF6' },
                    { label: 'Other', value: expenseBreakdown.otherExpenses, color: '#FFD700' },
                  ];

                  let currentAngle = -Math.PI / 2;
                  const elements = [];

                  expenses.forEach((exp, idx) => {
                    const sliceAngle = (exp.value / totalExpenses) * 2 * Math.PI;
                    const endAngle = currentAngle + sliceAngle;

                    const startX = cx + Math.cos(currentAngle) * outerRadius;
                    const startY = cy + Math.sin(currentAngle) * outerRadius;
                    const endX = cx + Math.cos(endAngle) * outerRadius;
                    const endY = cy + Math.sin(endAngle) * outerRadius;

                    const innerStartX = cx + Math.cos(currentAngle) * innerRadius;
                    const innerStartY = cy + Math.sin(currentAngle) * innerRadius;
                    const innerEndX = cx + Math.cos(endAngle) * innerRadius;
                    const innerEndY = cy + Math.sin(endAngle) * innerRadius;

                    const largeArc = sliceAngle > Math.PI ? 1 : 0;

                    const pathData = [
                      `M ${startX} ${startY}`,
                      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endX} ${endY}`,
                      `L ${innerEndX} ${innerEndY}`,
                      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStartX} ${innerStartY}`,
                      'Z',
                    ].join(' ');

                    elements.push(
                      <path key={`slice-${idx}`} d={pathData} fill={exp.color} opacity="0.8" />
                    );

                    const labelAngle = currentAngle + sliceAngle / 2;
                    const labelRadius = (outerRadius + innerRadius) / 2;
                    const labelX = cx + Math.cos(labelAngle) * labelRadius;
                    const labelY = cy + Math.sin(labelAngle) * labelRadius;

                    if (exp.value > 0) {
                      elements.push(
                        <text
                          key={`label-${idx}`}
                          x={labelX}
                          y={labelY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="11"
                          fontWeight="bold"
                          fill="#000"
                        >
                          {((exp.value / totalExpenses) * 100).toFixed(0)}%
                        </text>
                      );
                    }

                    currentAngle = endAngle;
                  });

                  // Legend
                  expenses.forEach((exp, idx) => {
                    elements.push(
                      <g key={`legend-${idx}`}>
                        <rect x="250" y={30 + idx * 30} width="12" height="12" fill={exp.color} opacity="0.8" />
                        <text x="270" y={41 + idx * 30} fontSize="12" fill="#999">
                          {exp.label}: {formatCurrency(exp.value)}
                        </text>
                      </g>
                    );
                  });

                  return elements;
                })()}
              </svg>
            </div>
          )}

          {/* Monthly Profit Trend */}
          {profitTrend.length > 0 && (
            <div style={styles.card}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '16px', fontWeight: '600' }}>
                Monthly Profit Trend (Last 6 Months)
              </h3>
              <svg viewBox="0 0 600 300" style={{ width: '100%', height: 'auto' }}>
                {/* Axes */}
                <line x1="50" y1="20" x2="50" y2="250" stroke="#1E1E1E" strokeWidth="2" />
                <line x1="50" y1="250" x2="580" y2="250" stroke="#1E1E1E" strokeWidth="2" />

                {/* Y-axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const maxProfit = Math.max(...profitTrend.map(p => p.profit), 1);
                  const value = maxProfit * ratio;
                  const y = 250 - ratio * 230;
                  return (
                    <g key={`y-${idx}`}>
                      <text x="40" y={y + 5} textAnchor="end" fontSize="11" fill="#666">
                        ${(value / 1000).toFixed(0)}k
                      </text>
                      {idx > 0 && <line x1="45" y1={y} x2="580" y2={y} stroke="#1E1E1E" strokeWidth="1" strokeDasharray="4" />}
                    </g>
                  );
                })}

                {/* Line chart */}
                {(() => {
                  const maxProfit = Math.max(...profitTrend.map(p => p.profit), 1);
                  const points = profitTrend.map((item, idx) => {
                    const x = 70 + (idx / (profitTrend.length - 1 || 1)) * 500;
                    const y = 250 - (item.profit / maxProfit) * 230;
                    return { x, y, ...item };
                  });

                  const pathData = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                  return (
                    <>
                      <path d={pathData} stroke="#FFD700" strokeWidth="3" fill="none" />
                      {points.map((p, idx) => (
                        <circle
                          key={`point-${idx}`}
                          cx={p.x}
                          cy={p.y}
                          r="4"
                          fill="#FFD700"
                        />
                      ))}
                      {points.map((p, idx) => (
                        <text
                          key={`label-${idx}`}
                          x={p.x}
                          y="270"
                          textAnchor="middle"
                          fontSize="11"
                          fill="#666"
                        >
                          {p.month.substring(0, 3)}
                        </text>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('pnl');

  return (
    <>
      <Head>
        <title>Financial & P&L | Ecomera</title>
        <meta name="description" content="Financial dashboard and P&L statements" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={styles.outerContainer}>
        <Sidebar />
        <div style={styles.container}>
        {/* Add animation styles */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          input:focus,
          select:focus {
            outline: none;
            border-color: #FFD700 !important;
          }

          button:hover {
            opacity: 0.9;
          }

          button:active {
            opacity: 0.8;
          }

          table tbody tr:hover {
            background-color: rgba(255, 215, 0, 0.05);
          }
        `}</style>

        <div style={styles.header}>
          <h1 style={styles.title}>Financial & P&L</h1>
          <p style={styles.subtitle}>Manage invoices, cash flow, and profitability</p>
        </div>

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          {[
            { id: 'pnl', label: 'P&L Statements' },
            { id: 'invoices', label: 'Invoices' },
            { id: 'cashflow', label: 'Cash Flow' },
            { id: 'dashboard', label: 'Dashboard' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'pnl' && <PnLStatementsTab />}
        {activeTab === 'invoices' && <InvoicesTab />}
        {activeTab === 'cashflow' && <CashFlowTab />}
        {activeTab === 'dashboard' && <DashboardTab />}
        </div>
      </div>
    </>
  );
}
