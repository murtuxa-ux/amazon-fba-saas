import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const InventoryPage = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [clientId, setClientId] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [storageFees, setStorageFees] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize with client ID from query params or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const cId = urlParams.get('client_id') || localStorage.getItem('selectedClientId') || 1;
    setClientId(Number(cId));
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    if (!clientId) return;
    fetchDashboard();
  }, [clientId, activeTab]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventory/dashboard?client_id=${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventory/items?client_id=${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setInventoryItems(data);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventory/alerts?client_id=${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventory/shipments?client_id=${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setShipments(data);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageFees = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventory/storage-fees?client_id=${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setStorageFees(data);
      }
    } catch (error) {
      console.error('Error fetching storage fees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clientId) return;
    if (activeTab === 'inventory') fetchInventoryItems();
    else if (activeTab === 'alerts') fetchAlerts();
    else if (activeTab === 'shipments') fetchShipments();
    else if (activeTab === 'storage') fetchStorageFees();
  }, [activeTab, clientId]);

  const getDaysOfStockColor = (days) => {
    if (days < 7) return '#EF4444';
    if (days < 14) return '#FBBF24';
    if (days < 30) return '#FFD700';
    return '#10B981';
  };

  const getStatusColor = (status) => {
    if (status === 'healthy') return '#10B981';
    if (status === 'low') return '#FFD700';
    if (status === 'critical') return '#FBBF24';
    if (status === 'out_of_stock') return '#EF4444';
    if (status === 'overstock') return '#3B82F6';
    return '#9CA3AF';
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical') return '🔴';
    if (severity === 'warning') return '🟡';
    return '🔵';
  };

  const markAlertRead = async (alertId) => {
    try {
      const response = await fetch(`/api/inventory/alerts/${alertId}/read`, { method: 'PUT' });
      if (response.ok) {
        setAlerts(alerts.map(a => a.id === alertId ? { ...a, is_read: true } : a));
      }
    } catch (error) {
      console.error('Error marking alert read:', error);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      const response = await fetch(`/api/inventory/alerts/${alertId}/resolve`, { method: 'PUT' });
      if (response.ok) {
        setAlerts(alerts.filter(a => a.id !== alertId));
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFFFFF' }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: '250px', padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>Inventory & Restock</h1>
          <p style={{ color: '#9CA3AF', marginBottom: '24px' }}>Manage your Amazon FBA inventory, alerts, and shipments</p>
        </div>

        {/* Dashboard Stats */}
        {dashboard && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '16px' }}>
              <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px' }}>Total SKUs</p>
              <p style={{ fontSize: '28px', fontWeight: 'bold' }}>{dashboard.total_skus}</p>
            </div>
            <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '16px' }}>
              <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px' }}>Healthy</p>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#10B981' }}>{dashboard.healthy_count}</p>
            </div>
            <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '16px' }}>
              <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px' }}>Low Stock</p>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFD700' }}>{dashboard.low_stock_count}</p>
            </div>
            <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '16px' }}>
              <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px' }}>Critical</p>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#FBBF24' }}>{dashboard.critical_count}</p>
            </div>
            <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '16px' }}>
              <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px' }}>Out of Stock</p>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#EF4444' }}>{dashboard.out_of_stock_count}</p>
            </div>
            <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '16px' }}>
              <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px' }}>Monthly Storage Fee</p>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFD700' }}>${dashboard.total_storage_fee_monthly.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1E1E1E', marginBottom: '24px' }}>
          {['inventory', 'alerts', 'shipments', 'storage'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: activeTab === tab ? '#FFD700' : '#9CA3AF',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #FFD700' : 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                transition: 'all 0.3s ease'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading && <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '32px' }}>Loading...</p>}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && !loading && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }}>ASIN</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }}>SKU</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }}>Title</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }}>Fulfillable</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }}>Inbound</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }}>Daily Velocity</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }}>Days of Stock</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }}>Reorder Point</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventoryItems.map(item => {
                  const daysOfStock = item.daily_velocity > 0 ? item.fulfillable_qty / item.daily_velocity : 0;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #1E1E1E' }}>
                      <td style={{ padding: '12px', fontSize: '12px' }}>{item.asin}</td>
                      <td style={{ padding: '12px', fontSize: '12px' }}>{item.sku}</td>
                      <td style={{ padding: '12px', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product_title}</td>
                      <td style={{ padding: '12px', fontSize: '12px' }}>{item.fulfillable_qty}</td>
                      <td style={{ padding: '12px', fontSize: '12px' }}>{item.inbound_qty}</td>
                      <td style={{ padding: '12px', fontSize: '12px' }}>{item.daily_velocity.toFixed(2)}</td>
                      <td style={{ padding: '12px', fontSize: '12px', color: getDaysOfStockColor(daysOfStock), fontWeight: 'bold' }}>
                        {daysOfStock.toFixed(1)} days
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px' }}>{item.reorder_point}</td>
                      <td style={{ padding: '12px', fontSize: '12px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          backgroundColor: getStatusColor(item.restock_status),
                          color: '#000000',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          textTransform: 'capitalize'
                        }}>
                          {item.restock_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {inventoryItems.length === 0 && <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px' }}>No inventory items found</p>}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && !loading && (
          <div>
            {alerts.map(alert => (
              <div
                key={alert.id}
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: alert.is_read ? 0.7 : 1
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{getSeverityIcon(alert.severity)}</span>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      backgroundColor: alert.severity === 'critical' ? '#EF4444' : alert.severity === 'warning' ? '#FFD700' : '#3B82F6',
                      color: '#000000',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>
                      {alert.severity}
                    </span>
                    <span style={{ color: '#9CA3AF', fontSize: '12px' }}>
                      {new Date(alert.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', marginBottom: '4px' }}>{alert.message}</p>
                  <p style={{ color: '#9CA3AF', fontSize: '12px' }}>Type: {alert.alert_type}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!alert.is_read && (
                    <button
                      onClick={() => markAlertRead(alert.id)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#1E1E1E',
                        color: '#FFD700',
                        border: '1px solid #FFD700',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#FFD700',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
            {alerts.length === 0 && <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px' }}>No active alerts</p>}
          </div>
        )}

        {/* Inbound Shipments Tab */}
        {activeTab === 'shipments' && !loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
            {shipments.map(shipment => {
              const statuses = ['working', 'shipped', 'in_transit', 'delivered', 'checked_in', 'receiving', 'closed'];
              const currentStatusIndex = statuses.indexOf(shipment.status);
              return (
                <div
                  key={shipment.id}
                  style={{
                    backgroundColor: '#111111',
                    border: '1px solid #1E1E1E',
                    borderRadius: '8px',
                    padding: '16px'
                  }}
                >
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>{shipment.shipment_name}</h3>

                  {/* Status Timeline */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                      {statuses.map((status, idx) => (
                        <div
                          key={status}
                          style={{
                            flex: 1,
                            height: '6px',
                            backgroundColor: idx <= currentStatusIndex ? '#FFD700' : '#1E1E1E',
                            borderRadius: '3px'
                          }}
                        />
                      ))}
                    </div>
                    <p style={{ color: '#9CA3AF', fontSize: '12px' }}>
                      {shipment.status.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '4px' }}>Qty Shipped</p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{shipment.quantity_shipped}</p>
                    </div>
                    <div>
                      <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '4px' }}>Qty Received</p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{shipment.quantity_received}</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '4px' }}>Destination FC</p>
                      <p style={{ fontSize: '14px' }}>{shipment.destination_fc}</p>
                    </div>
                    <div>
                      <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '4px' }}>Carrier</p>
                      <p style={{ fontSize: '14px' }}>{shipment.carrier || 'N/A'}</p>
                    </div>
                  </div>

                  {shipment.tracking && (
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '4px' }}>Tracking</p>
                      <p style={{ fontSize: '14px', color: '#FFD700', wordBreak: 'break-all' }}>{shipment.tracking}</p>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid #1E1E1E', paddingTop: '12px' }}>
                    <div>
                      <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '4px' }}>Ship Date</p>
                      <p style={{ fontSize: '12px' }}>
                        {shipment.ship_date ? new Date(shipment.ship_date).toLocaleDateString() : 'TBD'}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '4px' }}>Expected Date</p>
                      <p style={{ fontSize: '12px' }}>
                        {shipment.expected_date ? new Date(shipment.expected_date).toLocaleDateString() : 'TBD'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {shipments.length === 0 && <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px' }}>No inbound shipments</p>}
          </div>
        )}

        {/* Storage Fees Tab */}
        {activeTab === 'storage' && !loading && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }}>ASIN</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }}>Age (Days)</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }}>Monthly Fee</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }}>LTS Fee</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }}>3-Mo Projected</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }}>Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {storageFees.map(fee => (
                  <tr key={fee.id} style={{ borderBottom: '1px solid #1E1E1E' }}>
                    <td style={{ padding: '12px', fontSize: '12px' }}>{fee.asin}</td>
                    <td style={{ padding: '12px', fontSize: '12px' }}>{fee.current_age_days}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#FFD700', fontWeight: 'bold' }}>
                      ${fee.monthly_storage_fee.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: fee.long_term_storage_fee > 0 ? '#EF4444' : '#9CA3AF' }}>
                      ${fee.long_term_storage_fee.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#FFD700', fontWeight: 'bold' }}>
                      ${fee.projected_3mo_fee.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        backgroundColor: fee.recommended_action === 'liquidate' ? '#EF4444' :
                                         fee.recommended_action === 'remove' ? '#FBBF24' :
                                         fee.recommended_action === 'promote' ? '#10B981' :
                                         '#3B82F6',
                        color: fee.recommended_action === 'remove' || fee.recommended_action === 'liquidate' ? '#FFFFFF' : '#000000',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textTransform: 'capitalize'
                      }}>
                        {fee.recommended_action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {storageFees.length === 0 && <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px' }}>No storage fee data</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPage;
