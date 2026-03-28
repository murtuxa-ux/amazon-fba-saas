import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

const FBAShipmentsPage = () => {
  const router = useRouter();
  const [shipments, setShipments] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [formData, setFormData] = useState({
    shipment_name: '',
    destination_fc: 'PHX6',
    shipping_method: 'SPD',
    carrier: '',
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
    try {
      setLoading(true);
      const token = localStorage.getItem('ecomera_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [shipmentsRes, dashboardRes] = await Promise.all([
        fetch(`${API_URL}/fba-shipments/`, { headers }),
        fetch(`${API_URL}/fba-shipments/dashboard`, { headers }),
      ]);

      if (!shipmentsRes.ok || !dashboardRes.ok) throw new Error('Failed to fetch data');

      const shipmentsData = await shipmentsRes.json();
      const dashboardData = await dashboardRes.json();

      setShipments(Array.isArray(shipmentsData) ? shipmentsData : shipmentsData.shipments || []);
      setDashboard(dashboardData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('ecomera_token');
      const res = await fetch(`${API_URL}/fba-shipments/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to create shipment');

      setFormData({ shipment_name: '', destination_fc: 'PHX6', shipping_method: 'SPD', carrier: '' });
      setShowCreateForm(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      draft: '#888888',
      ready: '#2196F3',
      shipped: '#FFC107',
      in_transit: '#FF9800',
      received: '#00C853',
      closed: '#888888',
    };
    return colors[status] || '#888888';
  };

  const filteredShipments = shipments.filter((s) => {
    if (filter === 'All') return true;
    const statusMap = {
      'Draft': 'draft',
      'Shipped': 'shipped',
      'In Transit': 'in_transit',
      'Received': 'received',
    };
    return s.status === statusMap[filter];
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFFFFF', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0', color: '#FFFFFF' }}>FBA Shipment Planner</h1>
          <p style={{ margin: '0', color: '#888888', fontSize: '14px' }}>Plan and track FBA shipments to fulfillment centers</p>
        </div>

        {/* Dashboard Stats */}
        {dashboard && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
              <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Shipments</p>
              <p style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: '#FFD700' }}>{dashboard.total_shipments || 0}</p>
            </div>
            <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
              <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>In Transit</p>
              <p style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: '#FF9800' }}>{dashboard.in_transit || 0}</p>
            </div>
            <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
              <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Awaiting Receipt</p>
              <p style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: '#2196F3' }}>{dashboard.awaiting_receipt || 0}</p>
            </div>
            <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
              <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Units This Month</p>
              <p style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: '#00C853' }}>{dashboard.units_shipped_this_month || 0}</p>
            </div>
            <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
              <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Receipt Time</p>
              <p style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: '#FFD700' }}>{dashboard.avg_receipt_time || 0} days</p>
            </div>
          </div>
        )}

        {/* Create Shipment Button */}
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
            {showCreateForm ? 'Cancel' : '+ Create Shipment'}
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>New Shipment</h3>
            <form onSubmit={handleCreateShipment} style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#FFFFFF' }}>Shipment Name</label>
                <input
                  type="text"
                  value={formData.shipment_name}
                  onChange={(e) => setFormData({ ...formData, shipment_name: e.target.value })}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#FFFFFF' }}>Destination FC</label>
                  <select
                    value={formData.destination_fc}
                    onChange={(e) => setFormData({ ...formData, destination_fc: e.target.value })}
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
                  >
                    <option value="PHX6">PHX6</option>
                    <option value="ONT8">ONT8</option>
                    <option value="SBD2">SBD2</option>
                    <option value="IND9">IND9</option>
                    <option value="BFI4">BFI4</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#FFFFFF' }}>Shipping Method</label>
                  <select
                    value={formData.shipping_method}
                    onChange={(e) => setFormData({ ...formData, shipping_method: e.target.value })}
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
                  >
                    <option value="SPD">SPD (Small Parcel)</option>
                    <option value="LTL">LTL (Less Than Truckload)</option>
                    <option value="FTL">FTL (Full Truckload)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#FFFFFF' }}>Carrier</label>
                  <input
                    type="text"
                    value={formData.carrier}
                    onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                    placeholder="e.g., UPS, FedEx, XPO"
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
                Create Shipment
              </button>
            </form>
          </div>
        )}

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #1E1E1E', paddingBottom: '12px' }}>
          {['All', 'Draft', 'Shipped', 'In Transit', 'Received'].map((tab) => (
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
            Loading shipments...
          </div>
        )}

        {/* Shipments Table */}
        {!loading && (
          <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E1E1E', backgroundColor: '#0A0A0A' }}>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Destination</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Units</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Boxes</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ship Date</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tracking</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#888888', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#888888' }}>
                      No shipments found
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((shipment) => (
                    <tr key={shipment.id} style={{ borderBottom: '1px solid #1E1E1E', hover: { backgroundColor: '#1a1a1a' } }}>
                      <td style={{ padding: '16px', color: '#FFFFFF' }}>{shipment.shipment_name}</td>
                      <td style={{ padding: '16px', color: '#FFFFFF' }}>{shipment.destination_fc}</td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            backgroundColor: getStatusBadgeColor(shipment.status),
                            color: shipment.status === 'shipped' ? '#000000' : '#FFFFFF',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'inline-block',
                          }}
                        >
                          {shipment.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: '#FFFFFF' }}>{shipment.units || 0}</td>
                      <td style={{ padding: '16px', color: '#FFFFFF' }}>{shipment.boxes || 0}</td>
                      <td style={{ padding: '16px', color: '#888888' }}>{shipment.ship_date || '-'}</td>
                      <td style={{ padding: '16px', color: '#888888', fontFamily: 'monospace', fontSize: '12px' }}>{shipment.tracking_number || '-'}</td>
                      <td style={{ padding: '16px' }}>
                        <button
                          onClick={() => setSelectedShipment(shipment)}
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
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Selected Shipment Detail */}
        {selectedShipment && (
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
                <h2 style={{ margin: '0', fontSize: '20px', fontWeight: '700' }}>{selectedShipment.shipment_name}</h2>
                <button
                  onClick={() => setSelectedShipment(null)}
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
                  <p style={{ margin: '0 0 4px 0', color: '#888888', fontSize: '12px' }}>Destination</p>
                  <p style={{ margin: '0', color: '#FFFFFF', fontSize: '14px', fontWeight: '500' }}>{selectedShipment.destination_fc}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#888888', fontSize: '12px' }}>Status</p>
                  <p style={{ margin: '0', color: '#FFFFFF', fontSize: '14px', fontWeight: '500' }}>{selectedShipment.status}</p>
                </div>
              </div>

              {selectedShipment.items && Array.isArray(selectedShipment.items) && selectedShipment.items.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#FFD700' }}>Items</h3>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {selectedShipment.items.map((item, idx) => (
                      <div key={idx} style={{ backgroundColor: '#0A0A0A', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                        <p style={{ margin: '0 0 4px 0', color: '#FFFFFF' }}>ASIN: {item.asin}</p>
                        <p style={{ margin: '0 0 4px 0', color: '#888888' }}>SKU: {item.sku} | Qty: {item.quantity} | Cases: {item.cases}</p>
                        <p style={{ margin: '0', color: '#888888' }}>Prep: {item.prep_type}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedShipment(null)}
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

export default FBAShipmentsPage;
