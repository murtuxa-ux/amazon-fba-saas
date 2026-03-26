import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const ClientPnL = () => {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

  // State
  const [activeTab, setActiveTab] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState('2026-03');
  const [selectedClient, setSelectedClient] = useState('');
  const [clients, setClients] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [clientDetail, setClientDetail] = useState(null);
  const [trendsData, setTrendsData] = useState({ revenue: [], byClient: [], margin: [] });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    month: '2026-03',
    revenue: '',
    cogs: '',
    fba_fees: '',
    referral_fees: '',
    ad_spend: '',
    other_expenses: '',
    units_sold: '',
    orders_count: '',
    active_asins: '',
    notes: ''
  });

  // Fetch clients on mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyOverview();
    } else if (activeTab === 'client' && selectedClient) {
      fetchClientDetail();
    } else if (activeTab === 'trends') {
      fetchTrends();
    }
  }, [activeTab, selectedMonth, selectedClient]);

  const fetchClients = async () => {
    try {
      const res = await fetch(`${apiBase}/clients`);
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
      if (data?.length > 0) {
        setSelectedClient(data[0].id || data[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch clients', err);
    }
  };

  const fetchMonthlyOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/client-pnl/monthly-overview?month=${selectedMonth}`);
      const data = await res.json();
      setMonthlyData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch monthly overview', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/client-pnl/client/${selectedClient}/summary`);
      const data = await res.json();
      setClientDetail(data || {});
    } catch (err) {
      console.error('Failed to fetch client detail', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/client-pnl/trends`);
      const data = await res.json();
      setTrendsData(data || { revenue: [], byClient: [], margin: [] });
    } catch (err) {
      console.error('Failed to fetch trends', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    const numValue = ['revenue', 'cogs', 'fba_fees', 'referral_fees', 'ad_spend', 'other_expenses', 'units_sold', 'orders_count', 'active_asins'].includes(name)
      ? parseFloat(value) || 0
      : value;
    setFormData(prev => ({ ...prev, [name]: numValue }));
  };

  const calculatePnL = () => {
    const revenue = parseFloat(formData.revenue) || 0;
    const cogs = parseFloat(formData.cogs) || 0;
    const fbaFees = parseFloat(formData.fba_fees) || 0;
    const refFees = parseFloat(formData.referral_fees) || 0;
    const adSpend = parseFloat(formData.ad_spend) || 0;
    const otherExp = parseFloat(formData.other_expenses) || 0;

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - fbaFees - refFees - adSpend - otherExp;
    const margin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0;

    return { grossProfit: grossProfit.toFixed(2), netProfit: netProfit.toFixed(2), margin };
  };

  const handleSavePnL = async () => {
    try {
      const payload = {
        ...formData,
        revenue: parseFloat(formData.revenue) || 0,
        cogs: parseFloat(formData.cogs) || 0,
        fba_fees: parseFloat(formData.fba_fees) || 0,
        referral_fees: parseFloat(formData.referral_fees) || 0,
        ad_spend: parseFloat(formData.ad_spend) || 0,
        other_expenses: parseFloat(formData.other_expenses) || 0,
        units_sold: parseInt(formData.units_sold) || 0,
        orders_count: parseInt(formData.orders_count) || 0,
        active_asins: parseInt(formData.active_asins) || 0
      };

      const res = await fetch(`${apiBase}/client-pnl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({
          client_id: '',
          month: '2026-03',
          revenue: '',
          cogs: '',
          fba_fees: '',
          referral_fees: '',
          ad_spend: '',
          other_expenses: '',
          units_sold: '',
          orders_count: '',
          active_asins: '',
          notes: ''
        });
        if (activeTab === 'monthly') {
          fetchMonthlyOverview();
        } else if (activeTab === 'client') {
          fetchClientDetail();
        }
      }
    } catch (err) {
      console.error('Failed to save P&L', err);
    }
  };

  const openAddModal = () => {
    setFormData({
      client_id: clients[0]?.id || clients[0]?._id || '',
      month: selectedMonth,
      revenue: '',
      cogs: '',
      fba_fees: '',
      referral_fees: '',
      ad_spend: '',
      other_expenses: '',
      units_sold: '',
      orders_count: '',
      active_asins: '',
      notes: ''
    });
    setShowModal(true);
  };

  const { grossProfit, netProfit, margin } = calculatePnL();
  const clientName = clients.find(c => (c.id || c._id) === formData.client_id)?.name || '';
  const selectedClientName = clients.find(c => (c.id || c._id) === selectedClient)?.name || '';

  // Container styles
  const containerStyle = {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    color: '#FFFFFF',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  };

  const contentStyle = {
    flex: 1,
    padding: '32px',
    overflowY: 'auto'
  };

  const headerStyle = {
    marginBottom: '32px'
  };

  const titleStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '8px'
  };

  const subtitleStyle = {
    color: '#888888',
    fontSize: '14px'
  };

  const tabsStyle = {
    display: 'flex',
    gap: '16px',
    marginBottom: '32px',
    borderBottom: '1px solid #1E1E1E',
    paddingBottom: '16px'
  };

  const tabStyle = (isActive) => ({
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: isActive ? 'bold' : 'normal',
    cursor: 'pointer',
    color: isActive ? '#FFD700' : '#888888',
    borderBottom: isActive ? '2px solid #FFD700' : 'none',
    marginBottom: '-17px',
    backgroundColor: 'transparent',
    border: 'none'
  });

  const controlsStyle = {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    alignItems: 'center'
  };

  const selectStyle = {
    padding: '10px 12px',
    backgroundColor: '#111111',
    color: '#FFFFFF',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  };

  const buttonStyle = {
    padding: '10px 20px',
    backgroundColor: '#FFD700',
    color: '#0A0A0A',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '16px',
    backgroundColor: '#111111',
    borderRadius: '6px',
    overflow: 'hidden'
  };

  const thStyle = {
    padding: '12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#888888',
    borderBottom: '1px solid #1E1E1E',
    backgroundColor: '#0A0A0A'
  };

  const tdStyle = {
    padding: '12px',
    borderBottom: '1px solid #1E1E1E',
    fontSize: '14px'
  };

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const modalContentStyle = {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '32px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto'
  };

  const modalTitleStyle = {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '24px'
  };

  const formGroupStyle = {
    marginBottom: '16px'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    color: '#888888'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    color: '#FFFFFF',
    border: '1px solid #1E1E1E',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  };

  const summaryStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  };

  const cardStyle = {
    backgroundColor: '#111111',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #1E1E1E'
  };

  const cardLabelStyle = {
    color: '#888888',
    fontSize: '12px',
    marginBottom: '8px'
  };

  const cardValueStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#FFD700'
  };

  const chartContainerStyle = {
    backgroundColor: '#111111',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #1E1E1E',
    marginBottom: '24px'
  };

  const loadingStyle = {
    padding: '32px',
    textAlign: 'center',
    color: '#888888'
  };

  return (
    <div style={containerStyle}>
      <Sidebar />
      <div style={contentStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Client P&L</h1>
          <p style={subtitleStyle}>Profit & Loss Analysis for All Clients</p>
        </div>

        {/* Tabs */}
        <div style={tabsStyle}>
          <button
            style={tabStyle(activeTab === 'monthly')}
            onClick={() => setActiveTab('monthly')}
          >
            Monthly Overview
          </button>
          <button
            style={tabStyle(activeTab === 'client')}
            onClick={() => setActiveTab('client')}
          >
            Client Detail
          </button>
          <button
            style={tabStyle(activeTab === 'trends')}
            onClick={() => setActiveTab('trends')}
          >
            Trends
          </button>
        </div>

        {/* Monthly Overview Tab */}
        {activeTab === 'monthly' && (
          <div>
            <div style={controlsStyle}>
              <label style={labelStyle}>
                Month:
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ ...inputStyle, width: '150px', marginLeft: '8px' }}
                />
              </label>
              <button style={buttonStyle} onClick={openAddModal}>
                + Add P&L
              </button>
            </div>

            {loading ? (
              <div style={loadingStyle}>Loading...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={{ backgroundColor: '#0A0A0A' }}>
                      <th style={thStyle}>Client Name</th>
                      <th style={thStyle}>Revenue</th>
                      <th style={thStyle}>COGS</th>
                      <th style={thStyle}>FBA Fees</th>
                      <th style={thStyle}>Ad Spend</th>
                      <th style={thStyle}>Other Exp</th>
                      <th style={thStyle}>Gross Profit</th>
                      <th style={thStyle}>Net Profit</th>
                      <th style={thStyle}>Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((row, idx) => (
                      <tr key={idx}>
                        <td style={tdStyle}>{row.client_name || 'N/A'}</td>
                        <td style={tdStyle}>${(row.revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                        <td style={tdStyle}>${(row.cogs || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                        <td style={tdStyle}>${(row.fba_fees || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                        <td style={tdStyle}>${(row.ad_spend || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                        <td style={tdStyle}>${(row.other_expenses || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                        <td style={tdStyle}>${(row.gross_profit || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                        <td style={{ ...tdStyle, color: (row.net_profit || 0) >= 0 ? '#22C55E' : '#EF4444', fontWeight: 'bold' }}>
                          ${(row.net_profit || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td style={tdStyle}>{(row.margin_percent || 0).toFixed(2)}%</td>
                      </tr>
                    ))}
                    {monthlyData.length > 0 && (
                      <tr style={{ backgroundColor: '#1E1E1E', fontWeight: 'bold' }}>
                        <td style={{ ...tdStyle, color: '#FFD700' }}>TOTALS</td>
                        <td style={{ ...tdStyle, color: '#FFD700' }}>
                          ${(monthlyData.reduce((sum, r) => sum + (r.revenue || 0), 0)).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ ...tdStyle, color: '#FFD700' }}>
                          ${(monthlyData.reduce((sum, r) => sum + (r.cogs || 0), 0)).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ ...tdStyle, color: '#FFD700' }}>
                          ${(monthlyData.reduce((sum, r) => sum + (r.fba_fees || 0), 0)).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ ...tdStyle, color: '#FFD700' }}>
                          ${(monthlyData.reduce((sum, r) => sum + (r.ad_spend || 0), 0)).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ ...tdStyle, color: '#FFD700' }}>
                          ${(monthlyData.reduce((sum, r) => sum + (r.other_expenses || 0), 0)).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ ...tdStyle, color: '#FFD700' }}>
                          ${(monthlyData.reduce((sum, r) => sum + (r.gross_profit || 0), 0)).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ ...tdStyle, color: '#FFD700' }}>
                          ${(monthlyData.reduce((sum, r) => sum + (r.net_profit || 0), 0)).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td style={tdStyle} />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Client Detail Tab */}
        {activeTab === 'client' && (
          <div>
            <div style={controlsStyle}>
              <label style={labelStyle}>
                Client:
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  style={{ ...selectStyle, marginLeft: '8px' }}
                >
                  {clients.map(client => (
                    <option key={client.id || client._id} value={client.id || client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {loading ? (
              <div style={loadingStyle}>Loading...</div>
            ) : clientDetail ? (
              <div>
                {/* Summary Cards */}
                <div style={summaryStyle}>
                  <div style={cardStyle}>
                    <div style={cardLabelStyle}>Total Revenue</div>
                    <div style={cardValueStyle}>
                      ${(clientDetail.total_revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div style={cardStyle}>
                    <div style={cardLabelStyle}>Total Profit</div>
                    <div style={{ ...cardValueStyle, color: (clientDetail.total_profit || 0) >= 0 ? '#22C55E' : '#EF4444' }}>
                      ${(clientDetail.total_profit || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div style={cardStyle}>
                    <div style={cardLabelStyle}>Avg Margin</div>
                    <div style={cardValueStyle}>{(clientDetail.avg_margin || 0).toFixed(2)}%</div>
                  </div>
                  <div style={cardStyle}>
                    <div style={cardLabelStyle}>Best Month</div>
                    <div style={cardValueStyle}>{clientDetail.best_month || 'N/A'}</div>
                  </div>
                </div>

                {/* Monthly History Table */}
                <h3 style={{ marginTop: '32px', marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
                  Monthly History - {selectedClientName}
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={{ backgroundColor: '#0A0A0A' }}>
                        <th style={thStyle}>Month</th>
                        <th style={thStyle}>Revenue</th>
                        <th style={thStyle}>COGS</th>
                        <th style={thStyle}>FBA Fees</th>
                        <th style={thStyle}>Ad Spend</th>
                        <th style={thStyle}>Other Exp</th>
                        <th style={thStyle}>Gross Profit</th>
                        <th style={thStyle}>Net Profit</th>
                        <th style={thStyle}>Margin %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(clientDetail.monthly_history || []).map((row, idx) => (
                        <tr key={idx}>
                          <td style={tdStyle}>{row.month || 'N/A'}</td>
                          <td style={tdStyle}>${(row.revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                          <td style={tdStyle}>${(row.cogs || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                          <td style={tdStyle}>${(row.fba_fees || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                          <td style={tdStyle}>${(row.ad_spend || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                          <td style={tdStyle}>${(row.other_expenses || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                          <td style={tdStyle}>${(row.gross_profit || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                          <td style={{ ...tdStyle, color: (row.net_profit || 0) >= 0 ? '#22C55E' : '#EF4444', fontWeight: 'bold' }}>
                            ${(row.net_profit || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </td>
                          <td style={tdStyle}>{(row.margin_percent || 0).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Per-Product Line Items */}
                {(clientDetail.product_line_items || []).length > 0 && (
                  <div>
                    <h3 style={{ marginTop: '32px', marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
                      Per-Product Details
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={tableStyle}>
                        <thead>
                          <tr style={{ backgroundColor: '#0A0A0A' }}>
                            <th style={thStyle}>ASIN</th>
                            <th style={thStyle}>Product Name</th>
                            <th style={thStyle}>Revenue</th>
                            <th style={thStyle}>Units Sold</th>
                            <th style={thStyle}>Profit</th>
                            <th style={thStyle}>Margin %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientDetail.product_line_items.map((item, idx) => (
                            <tr key={idx}>
                              <td style={tdStyle}>{item.asin || 'N/A'}</td>
                              <td style={tdStyle}>{item.product_name || 'N/A'}</td>
                              <td style={tdStyle}>${(item.revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                              <td style={tdStyle}>{item.units_sold || 0}</td>
                              <td style={{ ...tdStyle, color: (item.profit || 0) >= 0 ? '#22C55E' : '#EF4444' }}>
                                ${(item.profit || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                              </td>
                              <td style={tdStyle}>{(item.margin_percent || 0).toFixed(2)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={loadingStyle}>No data available</div>
            )}
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div>
            {loading ? (
              <div style={loadingStyle}>Loading...</div>
            ) : (
              <div>
                {/* Revenue vs Profit Chart */}
                {trendsData.revenue && trendsData.revenue.length > 0 && (
                  <div style={chartContainerStyle}>
                    <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
                      Revenue vs Profit Over Time
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trendsData.revenue}>
                        <XAxis dataKey="month" stroke="#888888" />
                        <YAxis stroke="#888888" />
                        <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #1E1E1E', color: '#FFFFFF' }} />
                        <Legend />
                        <Area type="monotone" dataKey="revenue" stroke="#FFD700" fill="#FFD700" fillOpacity={0.3} />
                        <Area type="monotone" dataKey="profit" stroke="#22C55E" fill="#22C55E" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Revenue by Client Chart */}
                {trendsData.byClient && trendsData.byClient.length > 0 && (
                  <div style={chartContainerStyle}>
                    <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
                      Revenue by Client (Last 6 Months)
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={trendsData.byClient}>
                        <XAxis dataKey="month" stroke="#888888" />
                        <YAxis stroke="#888888" />
                        <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #1E1E1E', color: '#FFFFFF' }} />
                        <Legend />
                        {Array.from(new Set(trendsData.byClient.flatMap(d => Object.keys(d).filter(k => k !== 'month')))).map((client, idx) => (
                          <Bar key={idx} dataKey={client} stackId="a" fill={['#FFD700', '#3B82F6', '#8B5CF6', '#22C55E', '#EF4444', '#FF9500'][idx % 6]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Margin Trend Chart */}
                {trendsData.margin && trendsData.margin.length > 0 && (
                  <div style={chartContainerStyle}>
                    <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
                      Profit Margin Trend
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendsData.margin}>
                        <XAxis dataKey="month" stroke="#888888" />
                        <YAxis stroke="#888888" />
                        <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #1E1E1E', color: '#FFFFFF' }} />
                        <Legend />
                        <Line type="monotone" dataKey="margin" stroke="#3B82F6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add/Edit P&L Modal */}
        {showModal && (
          <div style={modalStyle} onClick={() => setShowModal(false)}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
              <h2 style={modalTitleStyle}>Add P&L Record</h2>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Client</label>
                <select
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleFormChange}
                  style={selectStyle}
                >
                  <option value="">Select Client</option>
                  {clients.map(client => (
                    <option key={client.id || client._id} value={client.id || client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Month (YYYY-MM)</label>
                <input
                  type="month"
                  name="month"
                  value={formData.month}
                  onChange={handleFormChange}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Revenue</label>
                  <input
                    type="number"
                    name="revenue"
                    value={formData.revenue}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>COGS</label>
                  <input
                    type="number"
                    name="cogs"
                    value={formData.cogs}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>FBA Fees</label>
                  <input
                    type="number"
                    name="fba_fees"
                    value={formData.fba_fees}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Referral Fees</label>
                  <input
                    type="number"
                    name="referral_fees"
                    value={formData.referral_fees}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Ad Spend</label>
                  <input
                    type="number"
                    name="ad_spend"
                    value={formData.ad_spend}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Other Expenses</label>
                  <input
                    type="number"
                    name="other_expenses"
                    value={formData.other_expenses}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Units Sold</label>
                  <input
                    type="number"
                    name="units_sold"
                    value={formData.units_sold}
                    onChange={handleFormChange}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Orders Count</label>
                  <input
                    type="number"
                    name="orders_count"
                    value={formData.orders_count}
                    onChange={handleFormChange}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Active ASINs</label>
                  <input
                    type="number"
                    name="active_asins"
                    value={formData.active_asins}
                    onChange={handleFormChange}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  placeholder="Add any notes..."
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              {/* Computed Fields */}
              <div style={{ backgroundColor: '#0A0A0A', padding: '16px', borderRadius: '4px', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={cardLabelStyle}>Gross Profit</div>
                    <div style={cardValueStyle}>${parseFloat(grossProfit).toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div style={cardLabelStyle}>Net Profit</div>
                    <div style={{ ...cardValueStyle, color: parseFloat(netProfit) >= 0 ? '#22C55E' : '#EF4444' }}>
                      ${parseFloat(netProfit).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div style={cardLabelStyle}>Margin %</div>
                    <div style={cardValueStyle}>{margin}%</div>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#1E1E1E',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePnL}
                  style={buttonStyle}
                >
                  Save P&L
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientPnL;
