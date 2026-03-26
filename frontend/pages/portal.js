import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const COLORS = {
  bg: '#0A0A0A',
  card: '#111111',
  border: '#1E1E1E',
  accent: '#FFD700',
  text: '#FFFFFF',
  textSec: '#888888',
  green: '#22C55E',
  red: '#EF4444',
  blue: '#3B82F6',
  purple: '#8B5CF6',
};

export default function ClientPortal() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [pnlData, setPnlData] = useState([]);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [selectedPnlMonth, setSelectedPnlMonth] = useState(null);
  const [pnlDetail, setPnlDetail] = useState(null);
  const [pnlDetailLoading, setPnlDetailLoading] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('ecomera_portal_token');
    const storedClientName = localStorage.getItem('ecomera_portal_client_name');
    if (token && storedClientName) {
      setIsLoggedIn(true);
      setClientName(storedClientName);
      loadDashboard();
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const response = await fetch(`${apiBase}/portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      localStorage.setItem('ecomera_portal_token', data.token);
      localStorage.setItem('ecomera_portal_client_name', data.clientName);
      setIsLoggedIn(true);
      setClientName(data.clientName);
      setLoginEmail('');
      setLoginPassword('');
      loadDashboard();
    } catch (error) {
      setLoginError(error.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ecomera_portal_token');
    localStorage.removeItem('ecomera_portal_client_name');
    setIsLoggedIn(false);
    setClientName('');
    setActiveTab('overview');
  };

  const loadDashboard = async () => {
    setDashboardLoading(true);
    try {
      const token = localStorage.getItem('ecomera_portal_token');
      const response = await fetch(`${apiBase}/portal/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load dashboard');
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const token = localStorage.getItem('ecomera_portal_token');
      const response = await fetch(`${apiBase}/portal/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Products error:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const token = localStorage.getItem('ecomera_portal_token');
      const response = await fetch(`${apiBase}/portal/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load orders');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Orders error:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadPnL = async () => {
    setPnlLoading(true);
    try {
      const token = localStorage.getItem('ecomera_portal_token');
      const response = await fetch(`${apiBase}/portal/pnl`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load P&L data');
      const data = await response.json();
      setPnlData(data);
    } catch (error) {
      console.error('P&L error:', error);
    } finally {
      setPnlLoading(false);
    }
  };

  const loadActivity = async () => {
    setActivityLoading(true);
    try {
      const token = localStorage.getItem('ecomera_portal_token');
      const response = await fetch(`${apiBase}/portal/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load activity');
      const data = await response.json();
      setActivity(data);
    } catch (error) {
      console.error('Activity error:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const loadPnLDetail = async (month) => {
    setPnlDetailLoading(true);
    try {
      const token = localStorage.getItem('ecomera_portal_token');
      const response = await fetch(`${apiBase}/portal/pnl/${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load P&L detail');
      const data = await response.json();
      setPnlDetail(data);
      setSelectedPnlMonth(month);
    } catch (error) {
      console.error('P&L detail error:', error);
    } finally {
      setPnlDetailLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedPnlMonth(null);
    setPnlDetail(null);

    if (tab === 'overview' && !dashboardData) loadDashboard();
    if (tab === 'products' && products.length === 0) loadProducts();
    if (tab === 'orders' && orders.length === 0) loadOrders();
    if (tab === 'pnl' && pnlData.length === 0) loadPnL();
    if (tab === 'activity' && activity.length === 0) loadActivity();
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: COLORS.bg, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: COLORS.text, fontSize: '16px' }}>Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <Head>
          <title>Ecomera Client Portal</title>
        </Head>
        <div style={{ backgroundColor: COLORS.bg, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: COLORS.accent, marginBottom: '10px' }}>
                ECOMERA
              </div>
              <div style={{ color: COLORS.textSec, fontSize: '14px' }}>Client Portal</div>
            </div>

            <div style={{
              backgroundColor: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '8px',
              padding: '30px',
            }}>
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: COLORS.text, marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '6px',
                      color: COLORS.text,
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', color: COLORS.text, marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '6px',
                      color: COLORS.text,
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {loginError && (
                  <div style={{
                    backgroundColor: `${COLORS.red}20`,
                    border: `1px solid ${COLORS.red}`,
                    color: COLORS.red,
                    padding: '10px 12px',
                    borderRadius: '6px',
                    marginBottom: '20px',
                    fontSize: '13px',
                  }}>
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: loginLoading ? COLORS.textSec : COLORS.accent,
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: loginLoading ? 'not-allowed' : 'pointer',
                    opacity: loginLoading ? 0.6 : 1,
                  }}>
                  {loginLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px', color: COLORS.textSec, fontSize: '13px' }}>
              Need help? Contact support@ecomera.io
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Client Portal - Ecomera</title>
      </Head>
      <div style={{ backgroundColor: COLORS.bg, minHeight: '100vh', color: COLORS.text }}>
        {/* Header */}
        <div style={{
          backgroundColor: COLORS.card,
          borderBottom: `1px solid ${COLORS.border}`,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: COLORS.accent }}>ECOMERA</div>
            <div style={{ color: COLORS.textSec, fontSize: '14px' }}>|</div>
            <div style={{ color: COLORS.text, fontSize: '14px' }}>{clientName}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
              color: COLORS.textSec,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = COLORS.accent;
              e.target.style.color = COLORS.accent;
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = COLORS.border;
              e.target.style.color = COLORS.textSec;
            }}
          >
            Log Out
          </button>
        </div>

        {/* Welcome Section */}
        <div style={{ padding: '24px', borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '8px', margin: 0 }}>
              Welcome back, {clientName.split(' ')[0]}
            </h1>
            <p style={{ color: COLORS.textSec, fontSize: '14px', margin: 0 }}>
              Here's an overview of your account activity and performance.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
          {/* KPI Cards */}
          {activeTab === 'overview' && (
            <>
              {dashboardLoading ? (
                <div style={{ color: COLORS.textSec, textAlign: 'center', padding: '40px' }}>Loading dashboard...</div>
              ) : dashboardData ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '16px',
                  marginBottom: '32px',
                }}>
                  {[
                    { label: 'Active Products', value: dashboardData.activeProducts || 0, unit: '' },
                    { label: 'Monthly Revenue', value: `$${(dashboardData.monthlyRevenue || 0).toLocaleString()}`, unit: '' },
                    { label: 'Monthly Profit', value: `$${(dashboardData.monthlyProfit || 0).toLocaleString()}`, unit: '' },
                    { label: 'Active Orders', value: dashboardData.activeOrders || 0, unit: '' },
                  ].map((kpi, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '8px',
                        padding: '20px',
                      }}
                    >
                      <div style={{ color: COLORS.textSec, fontSize: '13px', marginBottom: '8px' }}>
                        {kpi.label}
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: '600', color: COLORS.accent }}>
                        {kpi.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            borderBottom: `1px solid ${COLORS.border}`,
            overflowX: 'auto',
          }}>
            {['overview', 'products', 'orders', 'pnl', 'activity'].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? `2px solid ${COLORS.accent}` : '2px solid transparent',
                  color: activeTab === tab ? COLORS.accent : COLORS.textSec,
                  fontSize: '14px',
                  fontWeight: activeTab === tab ? '600' : '400',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Products Tab */}
          {activeTab === 'products' && (
            <>
              {productsLoading ? (
                <div style={{ color: COLORS.textSec, textAlign: 'center', padding: '40px' }}>Loading products...</div>
              ) : products.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px',
                  }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                        {['ASIN', 'Title', 'Status', 'Cost', 'Sell Price', 'ROI%'].map((header) => (
                          <th
                            key={header}
                            style={{
                              padding: '12px',
                              textAlign: 'left',
                              color: COLORS.textSec,
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                            }}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: `1px solid ${COLORS.border}`,
                            backgroundColor: idx % 2 === 0 ? 'transparent' : `${COLORS.card}80`,
                          }}
                        >
                          <td style={{ padding: '12px', color: COLORS.accent }}>{product.asin}</td>
                          <td style={{ padding: '12px', color: COLORS.text }}>{product.title}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 8px',
                              backgroundColor: product.status === 'Active' ? `${COLORS.green}20` : `${COLORS.textSec}20`,
                              color: product.status === 'Active' ? COLORS.green : COLORS.textSec,
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}>
                              {product.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: COLORS.text }}>${product.cost}</td>
                          <td style={{ padding: '12px', color: COLORS.text }}>${product.sellPrice}</td>
                          <td style={{ padding: '12px', color: COLORS.green }}>{product.roi}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: COLORS.textSec, textAlign: 'center', padding: '40px' }}>No products found</div>
              )}
            </>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <>
              {ordersLoading ? (
                <div style={{ color: COLORS.textSec, textAlign: 'center', padding: '40px' }}>Loading orders...</div>
              ) : orders.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px',
                  }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                        {['PO#', 'Status', 'Items', 'Total Cost', 'Order Date'].map((header) => (
                          <th
                            key={header}
                            style={{
                              padding: '12px',
                              textAlign: 'left',
                              color: COLORS.textSec,
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                            }}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: `1px solid ${COLORS.border}`,
                            backgroundColor: idx % 2 === 0 ? 'transparent' : `${COLORS.card}80`,
                          }}
                        >
                          <td style={{ padding: '12px', color: COLORS.accent }}>{order.poNumber}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 8px',
                              backgroundColor: order.status === 'Completed' ? `${COLORS.green}20` : `${COLORS.blue}20`,
                              color: order.status === 'Completed' ? COLORS.green : COLORS.blue,
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}>
                              {order.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: COLORS.text }}>{order.items}</td>
                          <td style={{ padding: '12px', color: COLORS.text }}>${order.totalCost}</td>
                          <td style={{ padding: '12px', color: COLORS.textSec }}>{order.orderDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: COLORS.textSec, textAlign: 'center', padding: '40px' }}>No orders found</div>
              )}
            </>
          )}

          {/* P&L Tab */}
          {activeTab === 'pnl' && (
            <>
              {selectedPnlMonth ? (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <button
                      onClick={() => {
                        setSelectedPnlMonth(null);
                        setPnlDetail(null);
                      }}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'transparent',
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.textSec,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      ← Back to P&L
                    </button>
                  </div>
                  {pnlDetailLoading ? (
                    <div style={{ color: COLORS.textSec, textAlign: 'center', padding: '40px' }}>Loading details...</div>
                  ) : pnlDetail ? (
                    <div style={{
                      backgroundColor: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '8px',
                      padding: '20px',
                    }}>
                      <h2 style={{ marginTop: 0, color: COLORS.text, fontSize: '18px' }}>P&L Detail - {selectedPnlMonth}</h2>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
                        {[
                          { label: 'Revenue', value: `$${(pnlDetail.revenue || 0).toLocaleString()}` },
                          { label: 'COGS', value: `$${(pnlDetail.cogs || 0).toLocaleString()}` },
                          { label: 'Gross Profit', value: `$${(pnlDetail.grossProfit || 0).toLocaleString()}` },
                          { label: 'Operating Expenses', value: `$${(pnlDetail.opex || 0).toLocaleString()}` },
                          { label: 'Net Profit', value: `$${(pnlDetail.netProfit || 0).toLocaleString()}` },
                          { label: 'Margin%', value: `${pnlDetail.margin || 0}%` },
                        ].map((item, idx) => (
                          <div key={idx}>
                            <div style={{ color: COLORS.textSec, fontSize: '13px', marginBottom: '4px' }}>
                              {item.label}
                            </div>
                            <div style={{ color: COLORS.accent, fontSize: '20px', fontWeight: '600' }}>
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  {pnlLoading ? (
                    <div style={{ color: COLORS.textSec, textAlign: 'center', padding: '40px' }}>Loading P&L data...</div>
                  ) : pnlData.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '14px',
                      }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                            {['Month', 'Revenue', 'COGS', 'Net Profit', 'Margin%', 'Action'].map((header) => (
                              <th
                                key={header}
                                style={{
                                  padding: '12px',
                                  textAlign: 'left',
                                  color: COLORS.textSec,
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pnlData.map((item, idx) => (
                            <tr
                              key={idx}
                              style={{
                                borderBottom: `1px solid ${COLORS.border}`,
                                backgroundColor: idx % 2 === 0 ? 'transparent' : `${COLORS.card}80`,
                              }}
                            >
                              <td style={{ padding: '12px', color: COLORS.text }}>{item.month}</td>
                              <td style={{ padding: '12px', color: COLORS.text }}>${item.revenue}</td>
                              <td style={{ padding: '12px', color: COLORS.text }}>${item.cogs}</td>
                              <td style={{ padding: '12px', color: COLORS.green }}>${item.netProfit}</td>
                              <td style={{ padding: '12px', color: COLORS.accent }}>{item.margin}%</td>
                              <td style={{ padding: '12px' }}>
                                <button
                                  onClick={() => loadPnLDetail(item.month)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: COLORS.blue,
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ color: COLORS.textSec, textAlign: 'center', padding: '40px' }}>No P&L data found</div>
                  )}
                </>
              )}
            </>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <>
              {activityLoading ? (
                <div style={{ color: COLORS.textSec, textAlign: 'center', padding: '40px' }}>Loading activity...</div>
              ) : activity.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activity.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '6px',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                        <div>
                          <div style={{ color: COLORS.text, fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                            {item.title}
                          </div>
                          <div style={{ color: COLORS.textSec, fontSize: '13px' }}>
                            {item.description}
                          </div>
                        </div>
                        <div style={{ color: COLORS.textSec, fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {item.timestamp}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: COLORS.textSec, textAlign: 'center', padding: '40px' }}>No activity found</div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
