import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'sku', direction: 'asc' });
  const [alerts, setAlerts] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [storageData, setStorageData] = useState(null);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [shipmentForm, setShipmentForm] = useState({ sku: '', quantity: '', destination: '' });

  // Fetch inventory data
  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('ecomera_token');
        const response = await fetch(`${BASE_URL}/inventory`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
        setInventory(items);
        setFilteredInventory(items);
        generateAlerts(items);
        generateStorageData(items);
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
        setError('Failed to load inventory data. Using empty data.');
        setInventory([]);
        setFilteredInventory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  // Fetch shipments data
  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const token = localStorage.getItem('ecomera_token');
        let response = await fetch(`${BASE_URL}/inventory/shipments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          response = await fetch(`${BASE_URL}/fba-shipments`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        }

        if (response.ok) {
          const data = await response.json();
          const items = Array.isArray(data) ? data : Array.isArray(data.shipments) ? data.shipments : [];
          setShipments(items);
        }
      } catch (err) {
        console.error('Failed to fetch shipments:', err);
        setShipments([]);
      }
    };

    fetchShipments();
  }, []);

  // Generate alerts based on inventory
  const generateAlerts = (items) => {
    if (!Array.isArray(items)) return;

    const newAlerts = [];
    const seen = new Set();

    items.forEach((item) => {
      const fulfillable = item.fulfillable || 0;
      const daysOfStock = item.daysOfStock || 0;
      const dailyVelocity = item.dailyVelocity || 0;
      const sku = item.sku || 'Unknown';

      // Low stock alert
      if (daysOfStock < 14 && daysOfStock > 0 && !seen.has(`low_${sku}`)) {
        newAlerts.push({
          id: `low_${sku}`,
          type: 'LOW_STOCK',
          priority: 'warning',
          message: `Reorder ${sku} - only ${daysOfStock} days of stock remaining`,
          sku,
        });
        seen.add(`low_${sku}`);
      }

      // Out of stock alert
      if (fulfillable === 0 && !seen.has(`oos_${sku}`)) {
        newAlerts.push({
          id: `oos_${sku}`,
          type: 'OUT_OF_STOCK',
          priority: 'critical',
          message: `URGENT: ${sku} is out of stock`,
          sku,
        });
        seen.add(`oos_${sku}`);
      }

      // Overstock alert
      if (daysOfStock > 90 && !seen.has(`overstock_${sku}`)) {
        newAlerts.push({
          id: `overstock_${sku}`,
          type: 'OVERSTOCK',
          priority: 'info',
          message: `Consider removing ${sku} - ${daysOfStock} days of stock`,
          sku,
        });
        seen.add(`overstock_${sku}`);
      }

      // Slow moving alert
      if (dailyVelocity < 1 && dailyVelocity >= 0 && !seen.has(`slow_${sku}`)) {
        newAlerts.push({
          id: `slow_${sku}`,
          type: 'SLOW_MOVING',
          priority: 'info',
          message: `${sku} selling less than 1 unit/day`,
          sku,
        });
        seen.add(`slow_${sku}`);
      }
    });

    setAlerts(newAlerts);
  };

  // Generate storage data
  const generateStorageData = (items) => {
    if (!Array.isArray(items)) return;

    let standardSize = 0;
    let oversize = 0;
    let hazmat = 0;
    let totalQty = 0;

    items.forEach((item) => {
      const qty = item.fulfillable || 0;
      totalQty += qty;

      if (item.storageType === 'hazmat') {
        hazmat += qty;
      } else if (item.storageType === 'oversize') {
        oversize += qty;
      } else {
        standardSize += qty;
      }
    });

    const total = standardSize + oversize + hazmat || 1;
    const standardPct = Math.round((standardSize / total) * 100);
    const oversizePct = Math.round((oversize / total) * 100);
    const hazmatPct = Math.round((hazmat / total) * 100);

    // Estimate monthly storage fees
    const standardFee = standardSize * 0.87; // $0.87 per unit
    const oversizeFee = oversize * 2.01; // $2.01 per unit
    const hazmatFee = hazmat * 3.50; // $3.50 per unit (estimated)
    const totalFee = standardFee + oversizeFee + hazmatFee;

    setStorageData({
      standard: { qty: standardSize, pct: standardPct },
      oversize: { qty: oversize, pct: oversizePct },
      hazmat: { qty: hazmat, pct: hazmatPct },
      totalQty,
      monthlyFee: totalFee,
    });
  };

  // Handle search
  useEffect(() => {
    if (!Array.isArray(inventory)) return;

    const filtered = inventory.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (item.sku && item.sku.toLowerCase().includes(searchLower)) ||
        (item.asin && item.asin.toLowerCase().includes(searchLower)) ||
        (item.title && item.title.toLowerCase().includes(searchLower))
      );
    });

    setFilteredInventory(filtered);
  }, [searchTerm, inventory]);

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort inventory
  const sortedInventory = [...filteredInventory].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;

    if (typeof aValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
  });

  // Export CSV
  const exportCSV = () => {
    if (!Array.isArray(filteredInventory) || filteredInventory.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['ASIN', 'SKU', 'Title', 'Fulfillable', 'Inbound', 'Daily Velocity', 'Days of Stock', 'Reorder Point', 'Status'];
    const rows = filteredInventory.map((item) => [
      item.asin || '',
      item.sku || '',
      item.title || '',
      item.fulfillable || 0,
      item.inbound || 0,
      item.dailyVelocity || 0,
      item.daysOfStock || 0,
      item.reorderPoint || 0,
      getStatus(item),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Get status
  const getStatus = (item) => {
    const fulfillable = item.fulfillable || 0;
    const daysOfStock = item.daysOfStock || 0;

    if (fulfillable === 0) return 'Out of Stock';
    if (daysOfStock < 14) return 'Low Stock';
    if (daysOfStock > 90) return 'Overstock';
    return 'In Stock';
  };

  // Get status color
  const getStatusColor = (item) => {
    const status = getStatus(item);
    if (status === 'Out of Stock') return '#FF4444';
    if (status === 'Low Stock') return '#FFB800';
    if (status === 'Overstock') return '#4488FF';
    return '#44BB44';
  };

  // Get days of stock color
  const getDaysOfStockColor = (daysOfStock) => {
    if (daysOfStock > 30) return '#44BB44';
    if (daysOfStock >= 15) return '#FFB800';
    return '#FF4444';
  };

  // Dismiss alert
  const dismissAlert = (id) => {
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  // Dismiss all alerts
  const dismissAllAlerts = () => {
    setAlerts([]);
  };

  // Handle shipment form
  const handleShipmentSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/inventory/shipments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sku: shipmentForm.sku,
          quantity: parseInt(shipmentForm.quantity, 10),
          destination: shipmentForm.destination,
        }),
      });

      if (response.ok) {
        setShowShipmentModal(false);
        setShipmentForm({ sku: '', quantity: '', destination: '' });
        // Refresh shipments
        const data = await response.json();
        setShipments([...shipments, data]);
      }
    } catch (err) {
      console.error('Failed to create shipment:', err);
    }
  };

  // Container styles
  const containerStyle = {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    color: '#FFFFFF',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  const mainStyle = {
    flex: 1,
    marginLeft: '250px',
    padding: '32px',
  };

  const headerStyle = {
    marginBottom: '32px',
  };

  const titleStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '24px',
  };

  const tabsStyle = {
    display: 'flex',
    gap: '16px',
    borderBottom: '1px solid #1E1E1E',
    marginBottom: '24px',
  };

  const tabStyle = (isActive) => ({
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    color: isActive ? '#FFD700' : '#AAAAAA',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: isActive ? 'bold' : 'normal',
    borderBottom: isActive ? '2px solid #FFD700' : '2px solid transparent',
    transition: 'all 0.2s',
  });

  const tabBadgeStyle = {
    marginLeft: '8px',
    fontSize: '12px',
    backgroundColor: '#FF4444',
    color: '#FFFFFF',
    padding: '2px 6px',
    borderRadius: '4px',
  };

  const summaryCardStyle = {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    flex: 1,
    minWidth: '200px',
  };

  const summaryCardsContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  };

  const summaryLabelStyle = {
    fontSize: '12px',
    color: '#888888',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const summaryValueStyle = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#FFD700',
  };

  const searchContainerStyle = {
    marginBottom: '20px',
  };

  const searchInputStyle = {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '16px',
  };

  const tableHeaderStyle = {
    backgroundColor: '#111111',
    borderBottom: '1px solid #1E1E1E',
    textAlign: 'left',
    padding: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#AAAAAA',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const tableRowStyle = {
    borderBottom: '1px solid #1E1E1E',
  };

  const tableCellStyle = {
    padding: '12px',
    fontSize: '13px',
    color: '#CCCCCC',
  };

  const badgeStyle = (bgColor) => ({
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: bgColor,
    color: '#FFFFFF',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  });

  const buttonStyle = {
    padding: '10px 16px',
    backgroundColor: '#FFD700',
    color: '#000000',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    marginTop: '16px',
    transition: 'all 0.2s',
  };

  const smallButtonStyle = {
    padding: '6px 12px',
    backgroundColor: '#FFD700',
    color: '#000000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
  };

  const dangerButtonStyle = {
    padding: '6px 12px',
    backgroundColor: '#FF4444',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
  };

  const alertContainerStyle = {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const alertLeftStyle = {
    flex: 1,
  };

  const alertPriorityStyle = (priority) => {
    let bgColor = '#4488FF';
    if (priority === 'critical') bgColor = '#FF4444';
    if (priority === 'warning') bgColor = '#FFB800';
    return { ...badgeStyle(bgColor), marginRight: '12px', marginBottom: '8px' };
  };

  const alertMessageStyle = {
    fontSize: '13px',
    color: '#CCCCCC',
    lineHeight: '1.4',
  };

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: showShipmentModal ? 'flex' : 'none',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };

  const modalStyle = {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
  };

  const modalHeaderStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
  };

  const formGroupStyle = {
    marginBottom: '16px',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    marginBottom: '6px',
    color: '#AAAAAA',
    textTransform: 'uppercase',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '4px',
    color: '#FFFFFF',
    fontSize: '13px',
    boxSizing: 'border-box',
  };

  const modalButtonsStyle = {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  };

  const storageBarStyle = {
    width: '100%',
    height: '24px',
    backgroundColor: '#1E1E1E',
    borderRadius: '4px',
    overflow: 'hidden',
    display: 'flex',
    marginTop: '12px',
  };

  const storageSegmentStyle = (color, pct) => ({
    width: `${pct}%`,
    backgroundColor: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#000000',
    fontSize: '11px',
    fontWeight: 'bold',
  });

  const loadingStyle = {
    fontSize: '16px',
    color: '#888888',
    padding: '20px',
  };

  const errorStyle = {
    fontSize: '14px',
    color: '#FF4444',
    padding: '20px',
  };

  const sectionTitleStyle = {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '16px',
    marginTop: '24px',
  };

  const restockCalcStyle = {
    fontSize: '12px',
    color: '#888888',
    marginTop: '4px',
  };

  // Render inventory tab
  const renderInventoryTab = () => (
    <div>
      <div style={summaryCardsContainerStyle}>
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Total SKUs</div>
          <div style={summaryValueStyle}>{inventory.length || 0}</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>In Stock</div>
          <div style={summaryValueStyle}>
            {inventory.filter((i) => i.fulfillable && i.fulfillable > 0).length || 0}
          </div>
        </div>
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Low Stock</div>
          <div style={summaryValueStyle}>
            {inventory.filter((i) => (i.daysOfStock || 0) < 14 && (i.daysOfStock || 0) > 0).length || 0}
          </div>
        </div>
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Out of Stock</div>
          <div style={summaryValueStyle}>
            {inventory.filter((i) => !i.fulfillable || i.fulfillable === 0).length || 0}
          </div>
        </div>
      </div>

      <div style={searchContainerStyle}>
        <input
          type="text"
          placeholder="Search by ASIN, SKU, or Title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchInputStyle}
        />
      </div>

      <button onClick={exportCSV} style={buttonStyle}>
        Export CSV
      </button>

      {loading && <div style={loadingStyle}>Loading inventory...</div>}
      {error && <div style={errorStyle}>{error}</div>}

      {!loading && !error && Array.isArray(sortedInventory) && sortedInventory.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr style={tableRowStyle}>
              <th style={tableHeaderStyle} onClick={() => handleSort('asin')}>
                ASIN
                {sortConfig.key === 'asin' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
              </th>
              <th style={tableHeaderStyle} onClick={() => handleSort('sku')}>
                SKU
                {sortConfig.key === 'sku' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
              </th>
              <th style={tableHeaderStyle} onClick={() => handleSort('title')}>
                Title
                {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
              </th>
              <th style={tableHeaderStyle} onClick={() => handleSort('fulfillable')}>
                Fulfillable
                {sortConfig.key === 'fulfillable' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
              </th>
              <th style={tableHeaderStyle} onClick={() => handleSort('inbound')}>
                Inbound
                {sortConfig.key === 'inbound' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
              </th>
              <th style={tableHeaderStyle} onClick={() => handleSort('dailyVelocity')}>
                Daily Velocity
                {sortConfig.key === 'dailyVelocity' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
              </th>
              <th style={tableHeaderStyle} onClick={() => handleSort('daysOfStock')}>
                Days of Stock
                {sortConfig.key === 'daysOfStock' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
              </th>
              <th style={tableHeaderStyle} onClick={() => handleSort('reorderPoint')}>
                Reorder Point
                {sortConfig.key === 'reorderPoint' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
              </th>
              <th style={tableHeaderStyle}>Status</th>
              <th style={tableHeaderStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedInventory.map((item) => {
              const dailyVelocity = item.dailyVelocity || 0;
              const fulfillable = item.fulfillable || 0;
              const inbound = item.inbound || 0;
              const daysOfStock = item.daysOfStock || 0;
              const restockQty = Math.max(0, Math.round(dailyVelocity * 60 - fulfillable - inbound));

              return (
                <tr key={item.id || item.sku} style={tableRowStyle}>
                  <td style={tableCellStyle}>{item.asin || '-'}</td>
                  <td style={tableCellStyle}>{item.sku || '-'}</td>
                  <td style={tableCellStyle}>{item.title || '-'}</td>
                  <td style={tableCellStyle}>{fulfillable}</td>
                  <td style={tableCellStyle}>{inbound}</td>
                  <td style={tableCellStyle}>{dailyVelocity.toFixed(2)}</td>
                  <td style={{ ...tableCellStyle, color: getDaysOfStockColor(daysOfStock) }}>
                    {daysOfStock}
                  </td>
                  <td style={tableCellStyle}>{item.reorderPoint || '-'}</td>
                  <td style={tableCellStyle}>
                    <div style={badgeStyle(getStatusColor(item))}>{getStatus(item)}</div>
                  </td>
                  <td style={tableCellStyle}>
                    {daysOfStock < 30 && (
                      <div>
                        <button
                          onClick={() => alert(`Restock recommendation for ${item.sku}: ${restockQty} units`)}
                          style={smallButtonStyle}
                        >
                          Restock
                        </button>
                        <div style={restockCalcStyle}>Qty: {restockQty}</div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!loading && !error && (!Array.isArray(sortedInventory) || sortedInventory.length === 0) && (
        <div style={loadingStyle}>No inventory items found</div>
      )}
    </div>
  );

  // Render alerts tab
  const renderAlertsTab = () => (
    <div>
      {alerts.length > 0 && (
        <button onClick={dismissAllAlerts} style={buttonStyle}>
          Dismiss All
        </button>
      )}

      {Array.isArray(alerts) && alerts.length > 0 ? (
        <div style={{ marginTop: '16px' }}>
          {alerts.map((alert) => (
            <div key={alert.id} style={alertContainerStyle}>
              <div style={alertLeftStyle}>
                <div style={alertPriorityStyle(alert.priority)}>
                  {alert.priority.toUpperCase()}
                </div>
                <div style={alertMessageStyle}>{alert.message}</div>
              </div>
              <button onClick={() => dismissAlert(alert.id)} style={dangerButtonStyle}>
                Dismiss
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={loadingStyle}>No alerts</div>
      )}
    </div>
  );

  // Render shipments tab
  const renderShipmentsTab = () => (
    <div>
      <button onClick={() => setShowShipmentModal(true)} style={buttonStyle}>
        Create Shipment
      </button>

      {Array.isArray(shipments) && shipments.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr style={tableRowStyle}>
              <th style={tableHeaderStyle}>Shipment ID</th>
              <th style={tableHeaderStyle}>Status</th>
              <th style={tableHeaderStyle}>Destination FC</th>
              <th style={tableHeaderStyle}>SKUs</th>
              <th style={tableHeaderStyle}>Quantity</th>
              <th style={tableHeaderStyle}>Created Date</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((shipment) => (
              <tr key={shipment.id} style={tableRowStyle}>
                <td style={tableCellStyle}>{shipment.shipmentId || shipment.id || '-'}</td>
                <td style={tableCellStyle}>
                  <div
                    style={badgeStyle(
                      shipment.status === 'Closed'
                        ? '#44BB44'
                        : shipment.status === 'In Transit'
                          ? '#FFB800'
                          : '#4488FF'
                    )}
                  >
                    {shipment.status || 'Working'}
                  </div>
                </td>
                <td style={tableCellStyle}>{shipment.destinationFC || '-'}</td>
                <td style={tableCellStyle}>{shipment.skus || '-'}</td>
                <td style={tableCellStyle}>{shipment.quantity || 0}</td>
                <td style={tableCellStyle}>
                  {shipment.createdDate
                    ? new Date(shipment.createdDate).toLocaleDateString()
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!Array.isArray(shipments) || shipments.length === 0 && (
        <div style={loadingStyle}>No shipments found</div>
      )}
    </div>
  );

  // Render storage tab
  const renderStorageTab = () => (
    <div>
      {storageData && (
        <>
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>Storage Utilization</div>
            <div style={storageBarStyle}>
              {storageData.standard.pct > 0 && (
                <div style={storageSegmentStyle('#44BB44', storageData.standard.pct)}>
                  {storageData.standard.pct > 10 && `${storageData.standard.pct}%`}
                </div>
              )}
              {storageData.oversize.pct > 0 && (
                <div style={storageSegmentStyle('#FFB800', storageData.oversize.pct)}>
                  {storageData.oversize.pct > 10 && `${storageData.oversize.pct}%`}
                </div>
              )}
              {storageData.hazmat.pct > 0 && (
                <div style={storageSegmentStyle('#FF4444', storageData.hazmat.pct)}>
                  {storageData.hazmat.pct > 10 && `${storageData.hazmat.pct}%`}
                </div>
              )}
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#888888' }}>
              Standard: {storageData.standard.qty} units ({storageData.standard.pct}%) | Oversize:{' '}
              {storageData.oversize.qty} units ({storageData.oversize.pct}%) | Hazmat:{' '}
              {storageData.hazmat.qty} units ({storageData.hazmat.pct}%)
            </div>
          </div>

          <div style={sectionTitleStyle}>Monthly Storage Fees Estimate</div>
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>Total Monthly Fee</div>
            <div style={summaryValueStyle}>${storageData.monthlyFee.toFixed(2)}</div>
          </div>

          <div style={sectionTitleStyle}>Storage Age Breakdown</div>
          <div style={summaryCardsContainerStyle}>
            <div style={summaryCardStyle}>
              <div style={summaryLabelStyle}>0-180 Days</div>
              <div style={summaryValueStyle}>Standard Rate</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={summaryLabelStyle}>181-365 Days</div>
              <div style={summaryValueStyle}>Standard Rate</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={summaryLabelStyle}>365+ Days</div>
              <div style={{ ...summaryValueStyle, color: '#FF4444' }}>+$0.15/unit</div>
              <div style={{ fontSize: '11px', color: '#FF4444', marginTop: '4px' }}>Surcharge</div>
            </div>
          </div>

          <div style={sectionTitleStyle}>Recommendations to Reduce Fees</div>
          <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '16px' }}>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', color: '#CCCCCC', fontSize: '13px' }}>
              <li>Remove slow-moving inventory to free up space</li>
              <li>Consolidate oversize items when possible</li>
              <li>Plan inventory rotation to minimize long-term storage</li>
              <li>Review items aging 365+ days for clearance or removal</li>
            </ul>
          </div>
        </>
      )}

      {!storageData && <div style={loadingStyle}>Loading storage data...</div>}
    </div>
  );

  return (
    <div style={containerStyle}>
      <Sidebar />
      <div style={mainStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>Inventory & Restock</div>
        </div>

        <div style={tabsStyle}>
          <button
            onClick={() => setActiveTab('inventory')}
            style={tabStyle(activeTab === 'inventory')}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            style={tabStyle(activeTab === 'alerts')}
          >
            Alerts {alerts.length > 0 && <span style={tabBadgeStyle}>{alerts.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('shipments')}
            style={tabStyle(activeTab === 'shipments')}
          >
            Shipments
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            style={tabStyle(activeTab === 'storage')}
          >
            Storage
          </button>
        </div>

        {activeTab === 'inventory' && renderInventoryTab()}
        {activeTab === 'alerts' && renderAlertsTab()}
        {activeTab === 'shipments' && renderShipmentsTab()}
        {activeTab === 'storage' && renderStorageTab()}

        {/* Shipment Modal */}
        <div style={modalOverlayStyle} onClick={() => setShowShipmentModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>Create Shipment</div>
            <form onSubmit={handleShipmentSubmit}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>SKU</label>
                <input
                  type="text"
                  value={shipmentForm.sku}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, sku: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Quantity</label>
                <input
                  type="number"
                  value={shipmentForm.quantity}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, quantity: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Destination FC</label>
                <input
                  type="text"
                  value={shipmentForm.destination}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, destination: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g., PHX3"
                  required
                />
              </div>
              <div style={modalButtonsStyle}>
                <button
                  type="button"
                  onClick={() => setShowShipmentModal(false)}
                  style={{ ...buttonStyle, backgroundColor: '#444444' }}
                >
                  Cancel
                </button>
                <button type="submit" style={buttonStyle}>
                  Create Shipment
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
