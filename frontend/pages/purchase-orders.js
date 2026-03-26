import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';

const PurchaseOrdersPage = () => {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    client: '',
    supplier: '',
    dateFrom: '',
    dateTo: '',
    poNumber: '',
  });
  const [expandedRows, setExpandedRows] = useState({});

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

  const colors = {
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
    orange: '#F59E0B',
    gray: '#404040',
    yellow: '#FCD34D',
  };

  const statusColors = {
    draft: colors.gray,
    submitted: colors.yellow,
    confirmed: colors.blue,
    shipped: colors.purple,
    received: colors.orange,
    checked_in: colors.green,
    live: colors.green,
  };

  // Initialize auth token
  useEffect(() => {
    const authToken = localStorage.getItem('ecomera_token');
    setToken(authToken);
    if (!authToken) {
      router.push('/login');
    }
  }, [router]);

  // Fetch data
  useEffect(() => {
    if (token) {
      fetchPurchaseOrders();
      fetchStats();
      fetchClients();
    }
  }, [token, filters]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.client) queryParams.append('client_id', filters.client);
      if (filters.supplier) queryParams.append('supplier', filters.supplier);
      if (filters.poNumber) queryParams.append('po_number', filters.poNumber);

      const response = await fetch(`${API_BASE}/purchase-orders?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPurchaseOrders(data.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load purchase orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/purchase-orders/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setStats(data.data || {});
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`${API_BASE}/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setClients(data.data || []);
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleExpandRow = (poId) => {
    setExpandedRows(prev => ({
      ...prev,
      [poId]: !prev[poId],
    }));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Create PO Form State
  const [newPO, setNewPO] = useState({
    supplier_name: '',
    supplier_contact: '',
    client_id: '',
    shipping_method: 'Standard',
    notes: '',
    items: [{ asin: '', title: '', brand: '', quantity: 1, unit_cost: 0, expected_sell_price: 0 }],
  });

  const handlePOFieldChange = (field, value) => {
    setNewPO(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...newPO.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setNewPO(prev => ({ ...prev, items: updatedItems }));
  };

  const addLineItem = () => {
    setNewPO(prev => ({
      ...prev,
      items: [...prev.items, { asin: '', title: '', brand: '', quantity: 1, unit_cost: 0, expected_sell_price: 0 }],
    }));
  };

  const removeLineItem = (index) => {
    setNewPO(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const createPurchaseOrder = async () => {
    try {
      const payload = {
        supplier_name: newPO.supplier_name,
        supplier_contact: newPO.supplier_contact,
        client_id: newPO.client_id,
        shipping_method: newPO.shipping_method,
        notes: newPO.notes,
        items: newPO.items.filter(item => item.asin && item.title),
      };

      const response = await fetch(`${API_BASE}/purchase-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setCreateStep(1);
        setNewPO({
          supplier_name: '',
          supplier_contact: '',
          client_id: '',
          shipping_method: 'Standard',
          notes: '',
          items: [{ asin: '', title: '', brand: '', quantity: 1, unit_cost: 0, expected_sell_price: 0 }],
        });
        await fetchPurchaseOrders();
      }
    } catch (err) {
      console.error('Failed to create PO:', err);
    }
  };

  const deletePO = async (poId) => {
    if (!window.confirm('Are you sure? This action cannot be undone.')) return;
    try {
      const response = await fetch(`${API_BASE}/purchase-orders/${poId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        await fetchPurchaseOrders();
      }
    } catch (err) {
      console.error('Failed to delete PO:', err);
    }
  };

  const StatusTimeline = ({ currentStatus }) => {
    const statuses = ['draft', 'submitted', 'confirmed', 'shipped', 'received', 'checked_in', 'live'];
    const currentIndex = statuses.indexOf(currentStatus);

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', marginBottom: '16px' }}>
        {statuses.map((status, idx) => (
          <React.Fragment key={status}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: idx <= currentIndex ? statusColors[status] : colors.gray,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                color: idx <= currentIndex ? colors.bg : colors.textSec,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              title={status}
            >
              {idx + 1}
            </div>
            {idx < statuses.length - 1 && (
              <div
                style={{
                  height: '2px',
                  width: '16px',
                  backgroundColor: idx < currentIndex ? statusColors[statuses[idx + 1]] : colors.gray,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Render Create PO Modal
  const renderCreateModal = () => {
    if (!showCreateModal) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
      >
        <div
          style={{
            backgroundColor: colors.card,
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
          }}
        >
          <h2 style={{ marginTop: 0, color: colors.text }}>Create Purchase Order - Step {createStep}/3</h2>

          {createStep === 1 && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: 500 }}>
                  Supplier Name
                </label>
                <input
                  type="text"
                  value={newPO.supplier_name}
                  onChange={e => handlePOFieldChange('supplier_name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    color: colors.text,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: 500 }}>
                  Supplier Contact
                </label>
                <input
                  type="text"
                  value={newPO.supplier_contact}
                  onChange={e => handlePOFieldChange('supplier_contact', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    color: colors.text,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: 500 }}>
                  Client
                </label>
                <select
                  value={newPO.client_id}
                  onChange={e => handlePOFieldChange('client_id', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    color: colors.text,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Select a client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: 500 }}>
                  Shipping Method
                </label>
                <select
                  value={newPO.shipping_method}
                  onChange={e => handlePOFieldChange('shipping_method', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    color: colors.text,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Standard">Standard</option>
                  <option value="Express">Express</option>
                  <option value="Overnight">Overnight</option>
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: 500 }}>
                  Notes
                </label>
                <textarea
                  value={newPO.notes}
                  onChange={e => handlePOFieldChange('notes', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    color: colors.text,
                    boxSizing: 'border-box',
                    minHeight: '100px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>ASIN</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>Title</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>Brand</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>Qty</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>Unit Cost</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>Sell Price</th>
                    <th style={{ textAlign: 'center', padding: '12px', color: colors.textSec, fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {newPO.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="text"
                          value={item.asin}
                          onChange={e => handleItemChange(idx, 'asin', e.target.value)}
                          placeholder="B000..."
                          style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: colors.bg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            color: colors.text,
                            boxSizing: 'border-box',
                            fontSize: '12px',
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="text"
                          value={item.title}
                          onChange={e => handleItemChange(idx, 'title', e.target.value)}
                          placeholder="Product title"
                          style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: colors.bg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            color: colors.text,
                            boxSizing: 'border-box',
                            fontSize: '12px',
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="text"
                          value={item.brand}
                          onChange={e => handleItemChange(idx, 'brand', e.target.value)}
                          placeholder="Brand"
                          style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: colors.bg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            color: colors.text,
                            boxSizing: 'border-box',
                            fontSize: '12px',
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: colors.bg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            color: colors.text,
                            boxSizing: 'border-box',
                            fontSize: '12px',
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="number"
                          value={item.unit_cost}
                          onChange={e => handleItemChange(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                          step="0.01"
                          style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: colors.bg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            color: colors.text,
                            boxSizing: 'border-box',
                            fontSize: '12px',
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="number"
                          value={item.expected_sell_price}
                          onChange={e => handleItemChange(idx, 'expected_sell_price', parseFloat(e.target.value) || 0)}
                          step="0.01"
                          style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: colors.bg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            color: colors.text,
                            boxSizing: 'border-box',
                            fontSize: '12px',
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => removeLineItem(idx)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: colors.red,
                            color: colors.text,
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={addLineItem}
                style={{
                  padding: '10px 16px',
                  backgroundColor: colors.blue,
                  color: colors.text,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '16px',
                }}
              >
                + Add Item
              </button>
            </div>
          )}

          {createStep === 3 && (
            <div>
              <h3 style={{ color: colors.text, marginBottom: '16px' }}>Order Summary</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>
                      Product
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>Qty</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>
                      Unit Cost
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>Total</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>
                      Profit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {newPO.items
                    .filter(item => item.asin && item.title)
                    .map((item, idx) => {
                      const itemTotal = item.quantity * item.unit_cost;
                      const sellTotal = item.quantity * item.expected_sell_price;
                      const profit = sellTotal - itemTotal;
                      return (
                        <tr key={idx} style={{ borderBottom: `1px solid ${colors.border}` }}>
                          <td style={{ padding: '12px', color: colors.text }}>{item.title}</td>
                          <td style={{ padding: '12px', color: colors.text }}>{item.quantity}</td>
                          <td style={{ padding: '12px', color: colors.text }}>{formatCurrency(item.unit_cost)}</td>
                          <td style={{ padding: '12px', color: colors.text }}>{formatCurrency(itemTotal)}</td>
                          <td style={{ padding: '12px', color: profit > 0 ? colors.green : colors.red }}>
                            {formatCurrency(profit)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              <div
                style={{
                  padding: '12px',
                  backgroundColor: colors.bg,
                  borderRadius: '4px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: colors.textSec }}>Supplier:</span>
                  <span style={{ color: colors.text }}>{newPO.supplier_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: colors.textSec }}>Client:</span>
                  <span style={{ color: colors.text }}>
                    {clients.find(c => c.id === newPO.client_id)?.name || 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: colors.textSec }}>Shipping Method:</span>
                  <span style={{ color: colors.text }}>{newPO.shipping_method}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            {createStep > 1 && (
              <button
                onClick={() => setCreateStep(createStep - 1)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: colors.border,
                  color: colors.text,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            {createStep < 3 && (
              <button
                onClick={() => setCreateStep(createStep + 1)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: colors.blue,
                  color: colors.text,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Next
              </button>
            )}
            {createStep === 3 && (
              <button
                onClick={createPurchaseOrder}
                style={{
                  padding: '10px 20px',
                  backgroundColor: colors.green,
                  color: colors.bg,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Create PO
              </button>
            )}
            <button
              onClick={() => {
                setShowCreateModal(false);
                setCreateStep(1);
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.red,
                color: colors.text,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Detail Modal
  const renderDetailModal = () => {
    if (!showDetailModal || !selectedPO) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
      >
        <div
          style={{
            backgroundColor: colors.card,
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
          }}
        >
          <h2 style={{ marginTop: 0, color: colors.text }}>Purchase Order #{selectedPO.po_number}</h2>
          <StatusTimeline currentStatus={selectedPO.status} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <p style={{ margin: '0 0 8px 0', color: colors.textSec, fontSize: '12px', fontWeight: 500 }}>
                SUPPLIER
              </p>
              <p style={{ margin: '0 0 16px 0', color: colors.text }}>{selectedPO.supplier_name}</p>
              <p style={{ margin: '0 0 8px 0', color: colors.textSec, fontSize: '12px', fontWeight: 500 }}>
                CONTACT
              </p>
              <p style={{ margin: '0 0 16px 0', color: colors.text }}>{selectedPO.supplier_contact}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 8px 0', color: colors.textSec, fontSize: '12px', fontWeight: 500 }}>CLIENT</p>
              <p style={{ margin: '0 0 16px 0', color: colors.text }}>{selectedPO.client_name || 'N/A'}</p>
              <p style={{ margin: '0 0 8px 0', color: colors.textSec, fontSize: '12px', fontWeight: 500 }}>
                SHIPPING METHOD
              </p>
              <p style={{ margin: '0 0 16px 0', color: colors.text }}>{selectedPO.shipping_method}</p>
            </div>
          </div>

          <h3 style={{ color: colors.text, marginTop: '24px', marginBottom: '16px' }}>Line Items</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>ASIN</th>
                <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>Title</th>
                <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>Qty Ordered</th>
                <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>
                  Qty Received
                </th>
                <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>
                  Unit Cost
                </th>
                <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(selectedPO.items || []).map((item, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: '12px', color: colors.text }}>{item.asin}</td>
                  <td style={{ padding: '12px', color: colors.text }}>{item.title}</td>
                  <td style={{ padding: '12px', color: colors.text }}>{item.quantity}</td>
                  <td style={{ padding: '12px', color: colors.text }}>{item.received_quantity || 0}</td>
                  <td style={{ padding: '12px', color: colors.text }}>{formatCurrency(item.unit_cost)}</td>
                  <td style={{ padding: '12px', color: colors.text }}>
                    {formatCurrency(item.quantity * item.unit_cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowDetailModal(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.border,
                color: colors.text,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!token) {
    return <div style={{ color: colors.text }}>Redirecting to login...</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.bg }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', color: colors.text, fontSize: '32px', fontWeight: 700 }}>
              Purchase Orders
            </h1>
            <p style={{ margin: 0, color: colors.textSec }}>
              Track and manage all purchase orders
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '12px 24px',
              backgroundColor: colors.accent,
              color: colors.bg,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            + New PO
          </button>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
            <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '16px' }}>
              <p style={{ margin: '0 0 8px 0', color: colors.textSec, fontSize: '12px', fontWeight: 500 }}>
                TOTAL POs
              </p>
              <p style={{ margin: 0, color: colors.accent, fontSize: '28px', fontWeight: 700 }}>
                {stats.total_count || 0}
              </p>
            </div>
            <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '16px' }}>
              <p style={{ margin: '0 0 8px 0', color: colors.textSec, fontSize: '12px', fontWeight: 500 }}>
                PENDING DELIVERY
              </p>
              <p style={{ margin: 0, color: colors.orange, fontSize: '28px', fontWeight: 700 }}>
                {stats.pending_delivery_count || 0}
              </p>
            </div>
            <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '16px' }}>
              <p style={{ margin: '0 0 8px 0', color: colors.textSec, fontSize: '12px', fontWeight: 500 }}>
                TOTAL SPEND THIS MONTH
              </p>
              <p style={{ margin: 0, color: colors.green, fontSize: '28px', fontWeight: 700 }}>
                {formatCurrency(stats.total_spend_this_month || 0)}
              </p>
            </div>
          </div>
        )}

        {/* Status Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '32px' }}>
          {['draft', 'submitted', 'confirmed', 'shipped', 'received', 'checked_in', 'live'].map(status => (
            <div
              key={status}
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onClick={() => handleFilterChange('status', filters.status === status ? '' : status)}
            >
              <p style={{ margin: '0 0 4px 0', color: colors.textSec, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                {status}
              </p>
              <p style={{ margin: '0 0 4px 0', color: statusColors[status], fontSize: '20px', fontWeight: 700 }}>
                {stats?.[`${status}_count`] || 0}
              </p>
              <p style={{ margin: 0, color: colors.textSec, fontSize: '12px' }}>
                {formatCurrency(stats?.[`${status}_total_value`] || 0)}
              </p>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <input
            type="text"
            placeholder="Search by PO number"
            value={filters.poNumber}
            onChange={e => handleFilterChange('poNumber', e.target.value)}
            style={{
              padding: '10px',
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              color: colors.text,
              boxSizing: 'border-box',
            }}
          />
          <select
            value={filters.status}
            onChange={e => handleFilterChange('status', e.target.value)}
            style={{
              padding: '10px',
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              color: colors.text,
              boxSizing: 'border-box',
            }}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="received">Received</option>
            <option value="checked_in">Checked In</option>
            <option value="live">Live</option>
          </select>
          <select
            value={filters.client}
            onChange={e => handleFilterChange('client', e.target.value)}
            style={{
              padding: '10px',
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              color: colors.text,
              boxSizing: 'border-box',
            }}
          >
            <option value="">All Clients</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Filter by supplier"
            value={filters.supplier}
            onChange={e => handleFilterChange('supplier', e.target.value)}
            style={{
              padding: '10px',
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              color: colors.text,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* PO List Table */}
        {loading ? (
          <div style={{ color: colors.text, textAlign: 'center', padding: '32px' }}>Loading...</div>
        ) : error ? (
          <div style={{ color: colors.red, textAlign: 'center', padding: '32px' }}>{error}</div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: colors.card, borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>
                    PO#
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>
                    Supplier
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>
                    Client
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>
                    Items
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>
                    Total Cost
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>
                    Order Date
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px', color: colors.textSec, fontWeight: 600 }}>
                    Expected Delivery
                  </th>
                  <th style={{ textAlign: 'center', padding: '12px', color: colors.textSec, fontWeight: 600 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map(po => (
                  <React.Fragment key={po.id}>
                    <tr
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        backgroundColor: expandedRows[po.id] ? colors.card : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleExpandRow(po.id)}
                    >
                      <td style={{ padding: '12px', color: colors.accent, fontWeight: 600 }}>{po.po_number}</td>
                      <td style={{ padding: '12px', color: colors.text }}>{po.supplier_name}</td>
                      <td style={{ padding: '12px', color: colors.text }}>{po.client_name || 'N/A'}</td>
                      <td style={{ padding: '12px', color: colors.text }}>{(po.items || []).length}</td>
                      <td style={{ padding: '12px', color: colors.text }}>{formatCurrency(po.total_cost || 0)}</td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            backgroundColor: statusColors[po.status],
                            color: ['draft', 'gray'].includes(po.status) ? colors.textSec : colors.bg,
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: colors.text }}>
                        {po.order_date ? formatDate(po.order_date) : 'N/A'}
                      </td>
                      <td style={{ padding: '12px', color: colors.text }}>
                        {po.expected_delivery_date ? formatDate(po.expected_delivery_date) : 'N/A'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedPO(po);
                              setShowDetailModal(true);
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: colors.blue,
                              color: colors.text,
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            View
                          </button>
                          {po.status === 'draft' && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                deletePO(po.id);
                              }}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: colors.red,
                                color: colors.text,
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedRows[po.id] && (
                      <tr style={{ backgroundColor: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
                        <td colSpan="9" style={{ padding: '16px' }}>
                          <h4 style={{ margin: '0 0 12px 0', color: colors.text }}>Line Items</h4>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                                <th style={{ textAlign: 'left', padding: '8px', color: colors.textSec, fontSize: '12px' }}>
                                  ASIN
                                </th>
                                <th style={{ textAlign: 'left', padding: '8px', color: colors.textSec, fontSize: '12px' }}>
                                  Title
                                </th>
                                <th style={{ textAlign: 'left', padding: '8px', color: colors.textSec, fontSize: '12px' }}>
                                  Qty
                                </th>
                                <th style={{ textAlign: 'left', padding: '8px', color: colors.textSec, fontSize: '12px' }}>
                                  Unit Cost
                                </th>
                                <th style={{ textAlign: 'left', padding: '8px', color: colors.textSec, fontSize: '12px' }}>
                                  Total
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(po.items || []).map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                  <td style={{ padding: '8px', color: colors.text, fontSize: '12px' }}>{item.asin}</td>
                                  <td style={{ padding: '8px', color: colors.text, fontSize: '12px' }}>{item.title}</td>
                                  <td style={{ padding: '8px', color: colors.text, fontSize: '12px' }}>{item.quantity}</td>
                                  <td style={{ padding: '8px', color: colors.text, fontSize: '12px' }}>
                                    {formatCurrency(item.unit_cost)}
                                  </td>
                                  <td style={{ padding: '8px', color: colors.text, fontSize: '12px' }}>
                                    {formatCurrency(item.quantity * item.unit_cost)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && purchaseOrders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: colors.textSec }}>
            No purchase orders found. Create one to get started.
          </div>
        )}
      </main>

      {renderCreateModal()}
      {renderDetailModal()}
    </div>
  );
};

export default PurchaseOrdersPage;
