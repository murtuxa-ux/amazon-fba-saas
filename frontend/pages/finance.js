import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';

export default function Finance() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState('pl-statements');
  const [plStatements, setPlStatements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPLForm, setShowPLForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    fetchClients();
    if (currentTab === 'dashboard') {
      fetchDashboard();
    } else if (currentTab === 'pl-statements') {
      fetchPLStatements();
    } else if (currentTab === 'invoices') {
      fetchInvoices();
    } else if (currentTab === 'cash-flow') {
      fetchCashFlow();
    }
  }, [currentTab]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setClients(data);
        if (data.length > 0) setSelectedClient(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchPLStatements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClient) params.append('client_id', selectedClient);
      const response = await fetch(`/api/finance/pl-statements?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPlStatements(data);
        setError('');
      } else {
        setError('Failed to fetch P&L statements');
      }
    } catch (err) {
      setError('Error fetching P&L statements');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClient) params.append('client_id', selectedClient);
      const response = await fetch(`/api/finance/invoices?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
        setError('');
      } else {
        setError('Failed to fetch invoices');
      }
    } catch (err) {
      setError('Error fetching invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchCashFlow = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClient) params.append('client_id', selectedClient);
      const response = await fetch(`/api/finance/cash-flow?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCashFlow(data);
        setError('');
      } else {
        setError('Failed to fetch cash flow data');
      }
    } catch (err) {
      setError('Error fetching cash flow data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/finance/dashboard', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
        setError('');
      } else {
        setError('Failed to fetch dashboard data');
      }
    } catch (err) {
      setError('Error fetching dashboard');
    } finally {
      setLoading(false);
    }
  };

  const createPLStatement = async (formData) => {
    try {
      const response = await fetch('/api/finance/pl-statements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowPLForm(false);
        fetchPLStatements();
      } else {
        setError('Failed to create P&L statement');
      }
    } catch (err) {
      setError('Error creating P&L statement');
    }
  };

  const createInvoice = async (formData) => {
    try {
      const response = await fetch('/api/finance/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowInvoiceForm(false);
        fetchInvoices();
      } else {
        setError('Failed to create invoice');
      }
    } catch (err) {
      setError('Error creating invoice');
    }
  };

  const markInvoiceSent = async (invoiceId) => {
    try {
      const response = await fetch(`/api/finance/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        fetchInvoices();
      }
    } catch (err) {
      setError('Error updating invoice');
    }
  };

  const markInvoicePaid = async (invoiceId, paymentMethod) => {
    try {
      const response = await fetch(`/api/finance/invoices/${invoiceId}/paid?payment_method=${paymentMethod}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        fetchInvoices();
      }
    } catch (err) {
      setError('Error updating invoice');
    }
  };

  const generateCashFlowProjection = async () => {
    if (!selectedClient) {
      setError('Please select a client');
      return;
    }
    try {
      const response = await fetch(`/api/finance/cash-flow/project?client_id=${selectedClient}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        fetchCashFlow();
      }
    } catch (err) {
      setError('Error generating projection');
    }
  };

  const getStatusBadgeStyle = (status) => {
    const baseStyle = {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase'
    };

    const statusColors = {
      draft: { backgroundColor: '#444', color: '#aaa' },
      reviewed: { backgroundColor: '#555', color: '#bbb' },
      approved: { backgroundColor: '#2a4a2a', color: '#6eff6e' },
      finalized: { backgroundColor: '#1a4a1a', color: '#4eff4e' },
      sent: { backgroundColor: '#1a3a5a', color: '#6ab8ff' },
      paid: { backgroundColor: '#1a4a2a', color: '#6eff6e' },
      overdue: { backgroundColor: '#5a1a1a', color: '#ff6b6b' },
      cancelled: { backgroundColor: '#5a1a1a', color: '#ff6b6b' }
    };

    return { ...baseStyle, ...(statusColors[status] || statusColors.draft) };
  };

  const containerStyle = {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#0A0A0A'
  };

  const mainStyle = {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#0A0A0A'
  };

  const headerStyle = {
    backgroundColor: '#111111',
    borderBottom: '1px solid #1E1E1E',
    padding: '24px',
    position: 'sticky',
    top: 0,
    zIndex: 10
  };

  const titleStyle = {
    fontSize: '28px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '16px'
  };

  const tabsContainerStyle = {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid #1E1E1E',
    paddingBottom: '0'
  };

  const tabStyle = (isActive) => ({
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: isActive ? '3px solid #FFD700' : '3px solid transparent',
    color: isActive ? '#FFD700' : '#888',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  });

  const contentStyle = {
    padding: '24px'
  };

  const selectStyle = {
    backgroundColor: '#1E1E1E',
    border: '1px solid #333',
    color: '#fff',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  };

  const buttonStyle = (variant = 'primary') => ({
    padding: '10px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: variant === 'primary' ? '#FFD700' : '#333',
    color: variant === 'primary' ? '#000' : '#fff'
  });

  const cardStyle = {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px'
  };

  const statCardStyle = {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    minWidth: '200px'
  };

  const statLabelStyle = {
    color: '#888',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: '8px'
  };

  const statValueStyle = {
    fontSize: '28px',
    fontWeight: '700',
    color: '#FFD700'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    overflow: 'hidden'
  };

  const thStyle = {
    backgroundColor: '#0A0A0A',
    color: '#888',
    padding: '12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    borderBottom: '1px solid #1E1E1E',
    textTransform: 'uppercase'
  };

  const tdStyle = {
    padding: '12px',
    borderBottom: '1px solid #1E1E1E',
    color: '#ccc',
    fontSize: '14px'
  };

  const formStyle = {
    ...cardStyle,
    marginTop: '16px'
  };

  const inputStyle = {
    backgroundColor: '#1E1E1E',
    border: '1px solid #333',
    color: '#fff',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '12px',
    width: '100%',
    boxSizing: 'border-box'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  };

  // P&L Statements Tab
  const renderPLTab = () => (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <select
          value={selectedClient}
          onChange={(e) => {
            setSelectedClient(e.target.value);
            setSelectedStatement(null);
          }}
          style={selectStyle}
        >
          <option value="">Select Client</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          style={selectStyle}
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
        </select>
        <button
          onClick={() => setShowPLForm(!showPLForm)}
          style={buttonStyle('primary')}
        >
          + Create P&L
        </button>
      </div>

      {showPLForm && (
        <PLFormComponent
          clients={clients}
          onSubmit={createPLStatement}
          onCancel={() => setShowPLForm(false)}
          formStyle={formStyle}
          inputStyle={inputStyle}
          buttonStyle={buttonStyle}
        />
      )}

      {selectedStatement ? (
        <PLDetailComponent
          statement={selectedStatement}
          onBack={() => setSelectedStatement(null)}
          cardStyle={cardStyle}
          buttonStyle={buttonStyle}
        />
      ) : (
        <div>
          {plStatements.length > 0 ? (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Period</th>
                  <th style={thStyle}>Net Revenue</th>
                  <th style={thStyle}>Gross Profit</th>
                  <th style={thStyle}>Net Profit</th>
                  <th style={thStyle}>Margin %</th>
                  <th style={thStyle}>ACoS %</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {plStatements.map(stmt => (
                  <tr key={stmt.id}>
                    <td style={tdStyle}>{new Date(stmt.period_start).toLocaleDateString()} - {new Date(stmt.period_end).toLocaleDateString()}</td>
                    <td style={tdStyle}>${stmt.net_revenue.toFixed(2)}</td>
                    <td style={{ ...tdStyle, color: stmt.gross_profit >= 0 ? '#6eff6e' : '#ff6b6b' }}>
                      ${stmt.gross_profit.toFixed(2)}
                    </td>
                    <td style={{ ...tdStyle, color: stmt.net_profit >= 0 ? '#6eff6e' : '#ff6b6b' }}>
                      ${stmt.net_profit.toFixed(2)}
                    </td>
                    <td style={tdStyle}>{stmt.margin_pct.toFixed(1)}%</td>
                    <td style={tdStyle}>{stmt.acos_pct.toFixed(1)}%</td>
                    <td style={tdStyle}>
                      <span style={getStatusBadgeStyle(stmt.status)}>
                        {stmt.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => setSelectedStatement(stmt)}
                        style={{ ...buttonStyle('secondary'), padding: '6px 12px', fontSize: '12px' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ ...cardStyle, textAlign: 'center', color: '#888' }}>
              No P&L statements found. Create one to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Invoices Tab
  const renderInvoicesTab = () => (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <select
          value={selectedClient}
          onChange={(e) => {
            setSelectedClient(e.target.value);
            setSelectedInvoice(null);
          }}
          style={selectStyle}
        >
          <option value="">All Clients</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowInvoiceForm(!showInvoiceForm)}
          style={buttonStyle('primary')}
        >
          + Create Invoice
        </button>
      </div>

      {showInvoiceForm && (
        <InvoiceFormComponent
          clients={clients}
          onSubmit={createInvoice}
          onCancel={() => setShowInvoiceForm(false)}
          formStyle={formStyle}
          inputStyle={inputStyle}
          buttonStyle={buttonStyle}
        />
      )}

      {selectedInvoice ? (
        <InvoiceDetailComponent
          invoice={selectedInvoice}
          onBack={() => setSelectedInvoice(null)}
          onMarkSent={markInvoiceSent}
          onMarkPaid={markInvoicePaid}
          cardStyle={cardStyle}
          buttonStyle={buttonStyle}
        />
      ) : (
        <div>
          {invoices.length > 0 ? (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Invoice #</th>
                  <th style={thStyle}>Client</th>
                  <th style={thStyle}>Issue Date</th>
                  <th style={thStyle}>Due Date</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={tdStyle}>{inv.invoice_number}</td>
                    <td style={tdStyle}>Client {inv.client_id}</td>
                    <td style={tdStyle}>{new Date(inv.issue_date).toLocaleDateString()}</td>
                    <td style={tdStyle}>{new Date(inv.due_date).toLocaleDateString()}</td>
                    <td style={tdStyle}>${inv.total.toFixed(2)}</td>
                    <td style={tdStyle}>
                      <span style={getStatusBadgeStyle(inv.status)}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        style={{ ...buttonStyle('secondary'), padding: '6px 12px', fontSize: '12px' }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ ...cardStyle, textAlign: 'center', color: '#888' }}>
              No invoices found.
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Cash Flow Tab
  const renderCashFlowTab = () => (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          style={selectStyle}
        >
          <option value="">Select Client</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
        <button
          onClick={generateCashFlowProjection}
          style={buttonStyle('primary')}
        >
          + Generate Projection
        </button>
      </div>

      {cashFlow.length > 0 ? (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Period</th>
              <th style={thStyle}>Projected Revenue</th>
              <th style={thStyle}>Projected Expenses</th>
              <th style={thStyle}>Projected Profit</th>
              <th style={thStyle}>Actual Revenue</th>
              <th style={thStyle}>Actual Expenses</th>
              <th style={thStyle}>Actual Profit</th>
              <th style={thStyle}>Variance</th>
            </tr>
          </thead>
          <tbody>
            {cashFlow.map(cf => (
              <tr key={cf.id}>
                <td style={tdStyle}>{new Date(cf.period_start).toLocaleDateString()} - {new Date(cf.period_end).toLocaleDateString()}</td>
                <td style={tdStyle}>${cf.projected_revenue.toFixed(2)}</td>
                <td style={tdStyle}>${cf.projected_expenses.toFixed(2)}</td>
                <td style={{ ...tdStyle, color: cf.projected_profit >= 0 ? '#6eff6e' : '#ff6b6b' }}>
                  ${cf.projected_profit.toFixed(2)}
                </td>
                <td style={tdStyle}>{cf.actual_revenue ? `$${cf.actual_revenue.toFixed(2)}` : '-'}</td>
                <td style={tdStyle}>{cf.actual_expenses ? `$${cf.actual_expenses.toFixed(2)}` : '-'}</td>
                <td style={tdStyle}>{cf.actual_profit ? `$${cf.actual_profit.toFixed(2)}` : '-'}</td>
                <td style={{
                  ...tdStyle,
                  color: cf.variance_pct > 0 ? '#6eff6e' : cf.variance_pct < 0 ? '#ff6b6b' : '#888'
                }}>
                  {cf.variance_pct ? `${cf.variance_pct.toFixed(1)}%` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#888' }}>
          No cash flow projections. Generate one to get started.
        </div>
      )}
    </div>
  );

  // Dashboard Tab
  const renderDashboardTab = () => (
    <div>
      {dashboard ? (
        <div>
          <div style={gridStyle}>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Total Revenue</div>
              <div style={statValueStyle}>${dashboard.total_revenue.toFixed(0)}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Total Profit</div>
              <div style={{ ...statValueStyle, color: dashboard.total_profit >= 0 ? '#6eff6e' : '#ff6b6b' }}>
                ${dashboard.total_profit.toFixed(0)}
              </div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Outstanding Invoices</div>
              <div style={statValueStyle}>${dashboard.outstanding_invoices_amount.toFixed(0)}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Avg Margin</div>
              <div style={statValueStyle}>{dashboard.avg_margin_pct.toFixed(1)}%</div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFD700', marginBottom: '16px' }}>
              Monthly Trends (Last 6 Months)
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '200px' }}>
              {dashboard.monthly_trends.length > 0 ? (
                dashboard.monthly_trends.map((trend, idx) => {
                  const maxRevenue = Math.max(...dashboard.monthly_trends.map(t => t.revenue));
                  const revenueHeight = (trend.revenue / maxRevenue) * 100;
                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <div style={{
                        width: '100%',
                        height: `${revenueHeight}%`,
                        backgroundColor: '#FFD700',
                        borderRadius: '4px 4px 0 0',
                        marginBottom: '8px'
                      }}></div>
                      <div style={{ fontSize: '11px', color: '#888', textAlign: 'center', width: '100%' }}>
                        {trend.month}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: '#888', textAlign: 'center', width: '100%' }}>No data</div>
              )}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFD700', marginBottom: '16px' }}>
              Top 5 Clients by Revenue
            </div>
            {dashboard.top_clients.length > 0 ? (
              dashboard.top_clients.map((client, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #1E1E1E' }}>
                  <span style={{ color: '#ccc' }}>Client {client.client_id}</span>
                  <span style={{ color: '#FFD700', fontWeight: '600' }}>${client.revenue.toFixed(0)}</span>
                </div>
              ))
            ) : (
              <div style={{ color: '#888' }}>No client data</div>
            )}
          </div>

          {dashboard.overdue_invoices.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#ff6b6b', marginBottom: '16px' }}>
                Overdue Invoices Alert
              </div>
              {dashboard.overdue_invoices.map((inv, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #1E1E1E', color: '#ff6b6b' }}>
                  <span>{inv.invoice_number} - ${inv.total.toFixed(2)}</span>
                  <span style={{ fontSize: '12px' }}>Due: {new Date(inv.due_date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#888' }}>
          Loading dashboard data...
        </div>
      )}
    </div>
  );

  return (
    <div style={containerStyle}>
      <Sidebar />
      <main style={mainStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>Financial & P&L</div>
          <div style={tabsContainerStyle}>
            <button
              style={tabStyle(currentTab === 'pl-statements')}
              onClick={() => setCurrentTab('pl-statements')}
            >
              P&L Statements
            </button>
            <button
              style={tabStyle(currentTab === 'invoices')}
              onClick={() => setCurrentTab('invoices')}
            >
              Invoices
            </button>
            <button
              style={tabStyle(currentTab === 'cash-flow')}
              onClick={() => setCurrentTab('cash-flow')}
            >
              Cash Flow
            </button>
            <button
              style={tabStyle(currentTab === 'dashboard')}
              onClick={() => setCurrentTab('dashboard')}
            >
              Dashboard
            </button>
          </div>
        </div>

        <div style={contentStyle}>
          {error && (
            <div style={{ ...cardStyle, backgroundColor: '#5a1a1a', borderColor: '#ff6b6b', color: '#ff6b6b', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {loading && (
            <div style={{ ...cardStyle, textAlign: 'center', color: '#888' }}>
              Loading...
            </div>
          )}

          {!loading && (
            <>
              {currentTab === 'pl-statements' && renderPLTab()}
              {currentTab === 'invoices' && renderInvoicesTab()}
              {currentTab === 'cash-flow' && renderCashFlowTab()}
              {currentTab === 'dashboard' && renderDashboardTab()}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// P&L Form Component
function PLFormComponent({ clients, onSubmit, onCancel, formStyle, inputStyle, buttonStyle }) {
  const [formData, setFormData] = useState({
    client_id: '',
    period_type: 'monthly',
    period_start: '',
    period_end: '',
    gross_revenue: 0,
    refunds: 0,
    cogs: 0,
    fba_fees: 0,
    referral_fees: 0,
    ppc_spend: 0,
    other_ad_spend: 0,
    storage_fees: 0,
    prep_fees: 0,
    shipping_inbound: 0,
    other_expenses: 0,
    agency_fee: 0,
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('_') && !name.includes('date') ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      period_start: new Date(formData.period_start).toISOString(),
      period_end: new Date(formData.period_end).toISOString()
    });
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <select
          name="client_id"
          value={formData.client_id}
          onChange={handleChange}
          style={inputStyle}
          required
        >
          <option value="">Select Client</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          name="period_type"
          value={formData.period_type}
          onChange={handleChange}
          style={inputStyle}
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
        </select>
        <input
          type="date"
          name="period_start"
          value={formData.period_start}
          onChange={handleChange}
          style={inputStyle}
          required
        />
        <input
          type="date"
          name="period_end"
          value={formData.period_end}
          onChange={handleChange}
          style={inputStyle}
          required
        />
      </div>

      <div style={{ fontSize: '12px', fontWeight: '600', color: '#FFD700', textTransform: 'uppercase', marginTop: '16px', marginBottom: '8px' }}>
        Revenue
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <input
          type="number"
          name="gross_revenue"
          placeholder="Gross Revenue"
          value={formData.gross_revenue}
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          type="number"
          name="refunds"
          placeholder="Refunds"
          value={formData.refunds}
          onChange={handleChange}
          style={inputStyle}
        />
      </div>

      <div style={{ fontSize: '12px', fontWeight: '600', color: '#FFD700', textTransform: 'uppercase', marginTop: '16px', marginBottom: '8px' }}>
        Costs & Expenses
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <input
          type="number"
          name="cogs"
          placeholder="COGS"
          value={formData.cogs}
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          type="number"
          name="fba_fees"
          placeholder="FBA Fees"
          value={formData.fba_fees}
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          type="number"
          name="referral_fees"
          placeholder="Referral Fees"
          value={formData.referral_fees}
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          type="number"
          name="ppc_spend"
          placeholder="PPC Spend"
          value={formData.ppc_spend}
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          type="number"
          name="other_ad_spend"
          placeholder="Other Ad Spend"
          value={formData.other_ad_spend}
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          type="number"
          name="storage_fees"
          placeholder="Storage Fees"
          value={formData.storage_fees}
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          type="number"
          name="prep_fees"
          placeholder="Prep Fees"
          value={formData.prep_fees}
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          type="number"
          name="shipping_inbound"
          placeholder="Shipping Inbound"
          value={formData.shipping_inbound}
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          type="number"
          name="other_expenses"
          placeholder="Other Expenses"
          value={formData.other_expenses}
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          type="number"
          name="agency_fee"
          placeholder="Agency Fee"
          value={formData.agency_fee}
          onChange={handleChange}
          style={inputStyle}
        />
      </div>

      <input
        type="text"
        name="notes"
        placeholder="Notes"
        value={formData.notes}
        onChange={handleChange}
        style={inputStyle}
      />

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={buttonStyle('secondary')}
        >
          Cancel
        </button>
        <button
          type="submit"
          style={buttonStyle('primary')}
        >
          Create P&L
        </button>
      </div>
    </form>
  );
}

// P&L Detail Component
function PLDetailComponent({ statement, onBack, cardStyle, buttonStyle }) {
  return (
    <div>
      <button onClick={onBack} style={{ ...buttonStyle('secondary'), marginBottom: '16px' }}>
        Back to List
      </button>

      <div style={cardStyle}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFD700', marginBottom: '16px' }}>
          Period: {new Date(statement.period_start).toLocaleDateString()} - {new Date(statement.period_end).toLocaleDateString()}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>
              Revenue
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1E1E1E', marginBottom: '8px' }}>
              <span style={{ color: '#ccc' }}>Gross Revenue</span>
              <span style={{ color: '#FFD700', fontWeight: '600' }}>${statement.gross_revenue.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1E1E1E', marginBottom: '8px' }}>
              <span style={{ color: '#ccc' }}>Refunds</span>
              <span style={{ color: '#ff6b6b' }}>-${statement.refunds.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', paddingTop: '8px', borderBottom: '1px solid #1E1E1E', marginBottom: '8px' }}>
              <span style={{ color: '#fff', fontWeight: '600' }}>Net Revenue</span>
              <span style={{ color: '#FFD700', fontWeight: '600', fontSize: '16px' }}>${statement.net_revenue.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>
              Costs
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1E1E1E', marginBottom: '8px' }}>
              <span style={{ color: '#ccc' }}>COGS</span>
              <span>${statement.cogs.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1E1E1E', marginBottom: '8px' }}>
              <span style={{ color: '#ccc' }}>FBA Fees</span>
              <span>${statement.fba_fees.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1E1E1E', marginBottom: '8px' }}>
              <span style={{ color: '#ccc' }}>Referral Fees</span>
              <span>${statement.referral_fees.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1E1E1E', marginBottom: '8px' }}>
              <span style={{ color: '#ccc' }}>PPC Spend</span>
              <span>${statement.ppc_spend.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1E1E1E', marginBottom: '8px' }}>
              <span style={{ color: '#ccc' }}>Storage</span>
              <span>${statement.storage_fees.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1E1E1E', marginBottom: '8px' }}>
              <span style={{ color: '#ccc' }}>Agency Fee</span>
              <span>${statement.agency_fee.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Gross Profit</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: statement.gross_profit >= 0 ? '#6eff6e' : '#ff6b6b' }}>
              ${statement.gross_profit.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Net Profit</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: statement.net_profit >= 0 ? '#6eff6e' : '#ff6b6b' }}>
              ${statement.net_profit.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Margin %</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFD700' }}>
              {statement.margin_pct.toFixed(1)}%
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>ACoS %</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFD700' }}>
              {statement.acos_pct.toFixed(1)}%
            </div>
          </div>
        </div>

        {statement.notes && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#0A0A0A', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Notes</div>
            <div style={{ color: '#ccc' }}>{statement.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Invoice Form Component
function InvoiceFormComponent({ clients, onSubmit, onCancel, formStyle, inputStyle, buttonStyle }) {
  const [formData, setFormData] = useState({
    client_id: '',
    issue_date: '',
    due_date: '',
    subtotal: 0,
    tax_amount: 0,
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('amount') || name.includes('subtotal') ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      issue_date: new Date(formData.issue_date).toISOString(),
      due_date: new Date(formData.due_date).toISOString()
    });
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <select
          name="client_id"
          value={formData.client_id}
          onChange={handleChange}
          style={inputStyle}
          required
        >
          <option value="">Select Client</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          type="date"
          name="issue_date"
          value={formData.issue_date}
          onChange={handleChange}
          style={inputStyle}
          required
        />
        <input
          type="date"
          name="due_date"
          value={formData.due_date}
          onChange={handleChange}
          style={inputStyle}
          required
        />
        <input
          type="number"
          name="subtotal"
          placeholder="Subtotal"
          value={formData.subtotal}
          onChange={handleChange}
          style={inputStyle}
          required
        />
        <input
          type="number"
          name="tax_amount"
          placeholder="Tax Amount"
          value={formData.tax_amount}
          onChange={handleChange}
          style={inputStyle}
        />
      </div>
      <input
        type="text"
        name="notes"
        placeholder="Invoice Notes"
        value={formData.notes}
        onChange={handleChange}
        style={inputStyle}
      />
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={buttonStyle('secondary')}
        >
          Cancel
        </button>
        <button
          type="submit"
          style={buttonStyle('primary')}
        >
          Create Invoice
        </button>
      </div>
    </form>
  );
}

// Invoice Detail Component
function InvoiceDetailComponent({ invoice, onBack, onMarkSent, onMarkPaid, cardStyle, buttonStyle }) {
  const [paymentMethod, setPaymentMethod] = useState('');

  return (
    <div>
      <button onClick={onBack} style={{ ...buttonStyle('secondary'), marginBottom: '16px' }}>
        Back to List
      </button>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFD700', marginBottom: '4px' }}>
              Invoice {invoice.invoice_number}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              Issued: {new Date(invoice.issue_date).toLocaleDateString()}
            </div>
          </div>
          <span style={{
            display: 'inline-block',
            padding: '8px 16px',
            borderRadius: '4px',
            backgroundColor: invoice.status === 'paid' ? '#1a4a2a' : '#1a3a5a',
            color: invoice.status === 'paid' ? '#6eff6e' : '#6ab8ff',
            fontWeight: '600',
            fontSize: '12px'
          }}>
            {invoice.status.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', borderBottom: '1px solid #1E1E1E', paddingBottom: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Due Date</div>
            <div style={{ color: '#ccc', fontSize: '16px' }}>{new Date(invoice.due_date).toLocaleDateString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Amount Due</div>
            <div style={{ color: '#FFD700', fontSize: '20px', fontWeight: '600' }}>${invoice.total.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Subtotal</div>
            <div style={{ color: '#ccc' }}>${invoice.subtotal.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Tax</div>
            <div style={{ color: '#ccc' }}>${invoice.tax_amount.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {invoice.status === 'draft' && (
            <button
              onClick={() => onMarkSent(invoice.id)}
              style={buttonStyle('primary')}
            >
              Mark Sent
            </button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'draft') && (
            <>
              <input
                type="text"
                placeholder="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ flex: 1, ...buttonStyle('secondary'), backgroundColor: '#1E1E1E', padding: '10px 12px', color: '#fff' }}
              />
              <button
                onClick={() => onMarkPaid(invoice.id, paymentMethod)}
                style={buttonStyle('primary')}
              >
                Mark Paid
              </button>
            </>
          )}
        </div>

        {invoice.notes && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#0A0A0A', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Notes</div>
            <div style={{ color: '#ccc' }}>{invoice.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}
