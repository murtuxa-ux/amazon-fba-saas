import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

const FBMOrdersPage = () => {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showShipForm, setShowShipForm] = useState(false);
  const [shipFormData, setShipFormData] = useState({ carrier: '', tracking_number: '' });
  const [formData, setFormData] = useState({
    amazon_order_id: '',
    buyer_name: '',
    buyer_address: '',
    ship_by_date: '',
    items: [{ asin: '', qty: '', price: '' }],
  });

  useEffect(() => {
    const token = localStorage.getItem('ecomera_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('ecomera_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    const safeFetch = async (url) => {
      try { const r = await fetch(url, { headers }); if (!r.ok) return null; return await r.json(); }
      catch(e) { return null; }
    };

    const [ordersData, dashboardData, pendingData] = await Promise.all([
      safeFetch(`${API_URL}/fbm-orders/`),
      safeFetch(`${API_URL}/fbm-orders/dashboard/metrics`),
      safeFetch(`${API_URL}/fbm-orders/pending`),
    ]);

    setOrders(ordersData && Array.isArray(ordersData.orders) ? ordersData.orders : ordersData && Array.isArray(ordersData) ? ordersData : []);
    setDashboard(dashboardData || {});
    setPendingOrders(pendingData && Array.isArray(pendingData.orders) ? pendingData.orders : pendingData && Array.isArray(pendingData) ? pendingData : []);
    setError(null);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('ecomera_token');
      const res = await fetch(`${API_URL}/fbm-orders/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to create order');

      setFormData({
        amazon_order_id: '',
        buyer_name: '',
        buyer_address: '',
        ship_by_date: '',
        items: [{ asin: '', qty: '', price: '' }],
      });
      setShowCreateForm(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleShipOrder = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      const token = localStorage.getItem('ecomera_token');
      const res = await fetch(`${API_URL}/fbm-orders/${selectedOrder.id}/ship`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shipFormData),
      });

      if (!res.ok) throw new Error('Failed to ship order');

      setShipFormData({ carrier: '', tracking_number: '' });
      setShowShipForm(false);
      setSelectedOrder(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: '#FFC107',
      processing: '#2196F3',
      shipped: '#00C853',
      delivered: '#00C853',
      returned: '#FF5252',
      cancelled: '#888888',
    };
    return colors[status] || '#888888';
  };

  const getStatusBadgeTextColor = (status) => {
    return status === 'shipped' || status === 'processing' ? '#000000' : '#FFFFFF';
  };

  const isOverdue = (shipByDate) => {
    if (!shipByDate) return false;
    return new Date(shipByDate) < new Date();
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'All') return true;
    const statusMap = {
      'Pending': 'pending',
      'Shipped': 'shipped',
      'Delivered': 'delivered',
      'Returns': 'returned',
    };
    return o.status === statusMap[filter];
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFFFFF', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0', color: '#FFFFFF' }}>FBM Order Manager</h1>
          <p style={{ margin: '0', color: '#888888', fontSize: '14px' }}>Manage merchant-fulfilled orders and track fulfillment performance</p>
        </div>

        {/* Dashboard Stats */}
        {dashboard && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Orders</p>
                <p style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: '#FFD700' }}>{dashboard.total_orders || 0}</p>
              </div>
              <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Action</p>
                <p style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: (dashboard.pending_count || 0) > 0 ? '#FF5252' : '#00C853' }}>
                  {dashboard.pending_count || 0}
                </p>
              </div>
              <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shipped Today</p>
                <p style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: '#00C853' }}>{dashboard.shipped_today || 0}</p>
              </div>
              <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>On-Time Delivery</p>
                <p style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: '#FFD700' }}>{dashboard.on_time_delivery_pct || 0}%</p>
              </div>
              <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Late Shipments</p>
                <p style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: (dashboard.late_shipments || 0) > 0 ? '#FF5252' : '#00C853' }}>
                  {dashboard.late_shipments || 0}
                </p>
              </div>
              <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Return Rate</p>
                <p style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: '#FFD700' }}>{dashboard.return_rate_pct || 0}%</p>
              </div>
            </div>

            {/* Performance Health Bar */}
            <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', marginBottom: '32px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888888' }}>Performance Health</h3>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ margin: '0', color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>Order Defect Rate (ODR)</p>
                    <p style={{ margin: '0', color: '#888888', fontSize: '13px' }}>{dashboard.odr || 0}%</p>
                  </div>
                  <div style={{ backgroundColor: '#0A0A0A', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min((dashboard.odr || 0), 100)}%`,
                        backgroundColor: (dashboard.odr || 0) <= 2 ? '#00C853' : (dashboard.odr || 0) <= 5 ? '#FFC107' : '#FF5252',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ margin: '0', color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>Late Shipment Rate</p>
                    <p style={{ margin: '0', color: '#888888', fontSize: '13px' }}>{dashboard.late_shipment_rate || 0}%</p>
                  </div>
                  <div style={{ backgroundColor: '#0A0A0A', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min((dashboard.late_shipment_rate || 0), 100)}%`,
                        backgroundColor: (dashboard.late_shipment_rate || 0) <= 5 ? '#00C853' : (dashboard.late_shipment_rate || 0) <= 10 ? '#FFC107' : '#FF5252',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ margin: '0', color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>Valid Tracking Rate</p>
                    <p style={{ margin: '0', color: '#888888', fontSize: '13px' }}>{dashboard.valid_tracking_rate || 0}%</p>
                  </div>
                  <div style={{ backgroundColor: '#0A0A0A', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min((dashboard.valid_tracking_rate || 0), 100)}%`,
                        backgroundColor: (dashboard.valid_tracking_rate || 0) >= 95 ? '#00C853' : (dashboard.valid_tracking_rate || 0) >= 85 ? '#FFC107' : '#FF5252',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Order Button */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              backgroundColor: '#FFD700',
              color: '#0A0A0A',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#FFC700')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#FFD700')}
          >
            {showCreateForm ? 'Cancel' : '+ New Order'}
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Create New Order</h3>
            <form onSubmit={handleCreateOrder} style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#FFFFFF' }}>Amazon Order ID</label>
                <input
                  type="text"
                  value={formData.amazon_order_id}
                  onChange={(e) => setFormData({ ...formData, amazon_order_id: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#FFFFFF' }}>Buyer Name</label>
                  <input
                    type="text"
                    value={formData.buyer_name}
                    onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #1E1E1E',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#FFFFFF' }}>Ship By Date</label>
                  <input
                    type="date"
                    value={formData.ship_by_date}
                    onChange={(e) => setFormData({ ...formData, ship_by_date: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #1E1E1E',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#FFFFFF' }}>Buyer Address</label>
                <textarea
                  value={formData.buyer_address}
                  onChange={(e) => setFormData({ ...formData, buyer_address: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    minHeight: '80px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                  rows="3"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#FFFFFF', fontWeight: '500' }}>Items</label>
                {formData.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      placeholder="ASIN"
                      value={item.asin}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[idx].asin = e.target.value;
                        setFormData({ ...formData, items: newItems });
                      }}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#0A0A0A',
                        border: '1px solid #1E1E1E',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[idx].qty = e.target.value;
                        setFormData({ ...formData, items: newItems });
                      }}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#0A0A0A',
                        border: '1px solid #1E1E1E',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[idx].price = e.target.value;
                        setFormData({ ...formData, items: newItems });
                      }}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#0A0A0A',
                        border: '1px solid #1E1E1E',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                style={{
                  backgroundColor: '#FFD700',
                  color: '#0A0A0A',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#FFC700')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#FFD700')}
              >
                Create Order
              </button>
            </form>
          </div>
        )}

        {/* Pending Orders Section */}
        {pendingOrders.length > 0 && (
          <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#FFD700' }}>Pending Orders ({pendingOrders.length})</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  style={{
                    backgroundColor: '#0A0A0A',
                    border: `1px solid ${isOverdue(order.ship_by_date) ? '#FF5252' : '#1E1E1E'}`,
                    borderRadius: '6px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#FFD700')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = isOverdue(order.ship_by_date) ? '#FF5252' : '#1E1E1E')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: '0 0 4px 0', color: '#FFFFFF', fontWeight: '600' }}>{order.amazon_order_id}</p>
                      <p style={{ margin: '0', color: '#888888', fontSize: '13px' }}>{order.buyer_name}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: '0 0 4px 0', color: isOverdue(order.ship_by_date) ? '#FF5252' : '#FFD700', fontWeight: '600' }}>
                        Ship by: {new Date(order.ship_by_date).toLocaleDateString()}
                      </p>
                      <p style={{ margin: '0', color: '#888888', fontSize: '13px' }}>Items: {order.items_count || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #1E1E1E', paddingBottom: '12px' }}>
          {['All', 'Pending', 'Shipped', 'Delivered', 'Returns'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                backgroundColor: 'transparent',
                color: filter === tab ? '#FFD700' : '#888888',
                border: 'none',
                padding: '8px 12px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                borderBottom: filter === tab ? '2px solid #FFD700' : 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => !filter.includes(tab) && (e.target.style.color = '#FFFFFF')}
              onMouseLeave={(e) => !filter.includes(tab) && (e.target.style.color = '#888888')}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div style={{ backgroundColor: '#FF5252', color: '#FFFFFF', padding: '16px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>
            Error: {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888888' }}>
            Loading orders...
          </div>
        )}

        {/* Orders Table */}
        {!loading && (
          <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E1E1E', backgroundColor: '#0A0A0A' }}>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order ID</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Buyer</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ship By</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tracking</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#888888' }}>
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} style={{ borderBottom: '1px solid #1E1E1E' }}>
                      <td style={{ padding: '16px', color: '#FFFFFF', fontFamily: 'monospace', fontSize: '12px' }}>{order.amazon_order_id}</td>
                      <td style={{ padding: '16px', color: '#FFFFFF' }}>{order.buyer_name}</td>
                      <td style={{ padding: '16px', color: '#FFFFFF' }}>{order.items_count || 0}</td>
                      <td style={{ padding: '16px', color: '#FFD700', fontWeight: '600' }}>${order.total || '0.00'}</td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            backgroundColor: getStatusBadgeColor(order.status),
                            color: getStatusBadgeTextColor(order.status),
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'inline-block',
                          }}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: isOverdue(order.ship_by_date) ? '#FF5252' : '#888888', fontWeight: isOverdue(order.ship_by_date) ? '600' : '400' }}>
                        {order.ship_by_date ? new Date(order.ship_by_date).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '16px', color: '#888888', fontFamily: 'monospace', fontSize: '12px' }}>{order.tracking_number || '-'}</td>
                      <td style={{ padding: '16px' }}>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowShipForm(order.status === 'pending');
                          }}
                          style={{
                            backgroundColor: 'transparent',
                            color: '#2196F3',
                            border: 'none',
                            padding: '4px 8px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          {order.status === 'pending' ? 'Ship' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div style={{
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
          }}>
            <div style={{
              backgroundColor: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '8px',
              padding: '32px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: '0', fontSize: '20px', fontWeight: '700' }}>{selectedOrder.amazon_order_id}</h2>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setShowShipForm(false);
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#888888',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#888888', fontSize: '12px' }}>Buyer</p>
                  <p style={{ margin: '0', color: '#FFFFFF', fontSize: '14px', fontWeight: '500' }}>{selectedOrder.buyer_name}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#888888', fontSize: '12px' }}>Status</p>
                  <p style={{ margin: '0', color: '#FFFFFF', fontSize: '14px', fontWeight: '500' }}>{selectedOrder.status}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#888888', fontSize: '12px' }}>Total</p>
                  <p style={{ margin: '0', color: '#FFD700', fontSize: '14px', fontWeight: '600' }}>${selectedOrder.total || '0.00'}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#888888', fontSize: '12px' }}>Ship By</p>
                  <p style={{ margin: '0', color: isOverdue(selectedOrder.ship_by_date) ? '#FF5252' : '#FFFFFF', fontSize: '14px', fontWeight: '500' }}>
                    {selectedOrder.ship_by_date ? new Date(selectedOrder.ship_by_date).toLocaleDateString() : '-'}
                  </p>
                </div>
              </div>

              {selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#FFD700' }}>Items</h3>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} style={{ backgroundColor: '#0A0A0A', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                        <p style={{ margin: '0 0 4px 0', color: '#FFFFFF' }}>ASIN: {item.asin}</p>
                        <p style={{ margin: '0', color: '#888888' }}>Qty: {item.qty} x ${item.price}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ship Form */}
              {showShipForm && selectedOrder.status === 'pending' && (
                <form onSubmit={handleShipOrder} style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#0A0A0A', borderRadius: '6px', display: 'grid', gap: '12px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#FFD700' }}>Ship Order</h4>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#FFFFFF' }}>Carrier</label>
                    <input
                      type="text"
                      value={shipFormData.carrier}
                      onChange={(e) => setShipFormData({ ...shipFormData, carrier: e.target.value })}
                      placeholder="e.g., UPS, FedEx"
                      required
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        backgroundColor: '#111111',
                        border: '1px solid #1E1E1E',
                        borderRadius: '4px',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#FFFFFF' }}>Tracking Number</label>
                    <input
                      type="text"
                      value={shipFormData.tracking_number}
                      onChange={(e) => setShipFormData({ ...shipFormData, tracking_number: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        backgroundColor: '#111111',
                        border: '1px solid #1E1E1E',
                        borderRadius: '4px',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#FFD700',
                      color: '#0A0A0A',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Confirm Shipment
                  </button>
                </form>
              )}

              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setShowShipForm(false);
                }}
                style={{
                  width: '100%',
                  backgroundColor: '#FFD700',
                  color: '#0A0A0A',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#FFC700')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#FFD700')}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FBMOrdersPage;
