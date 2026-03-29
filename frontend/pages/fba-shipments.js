import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

export default function FBAShipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    destinationFC: '',
    status: 'Draft',
    units: '',
    boxes: '',
    shipDate: '',
    tracking: '',
  });

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('ecomera_token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      let response = null;
      let success = false;

      // Try primary endpoint first
      try {
        response = await fetch(`${BASE_URL}/inventory/shipments`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          success = true;
        }
      } catch (primaryErr) {
        console.error('Primary endpoint failed:', primaryErr);
      }

      // If primary failed, try fallback endpoint
      if (!success) {
        try {
          response = await fetch(`${BASE_URL}/fba-shipments`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            success = true;
          }
        } catch (fallbackErr) {
          console.error('Fallback endpoint failed:', fallbackErr);
        }
      }

      if (!success || !response.ok) {
        // Don't show error state if no data, just empty list
        setShipments([]);
        setLoading(false);
        return;
      }

      const data = await response.json();
      const shipmentsList = Array.isArray(data)
        ? data
        : (data?.shipments || []);
      setShipments(shipmentsList);
    } catch (err) {
      console.error('Error fetching shipments:', err);
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/fba-shipments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      if (!response.ok) {
        throw new Error('Failed to create shipment');
      }

      setCreateForm({
        name: '',
        destinationFC: '',
        status: 'Draft',
        units: '',
        boxes: '',
        shipDate: '',
        tracking: '',
      });
      setShowCreateModal(false);
      fetchShipments();
    } catch (err) {
      console.error('Error creating shipment:', err);
      alert('Error creating shipment: ' + err.message);
    }
  };

  const handleDeleteShipment = async (id) => {
    if (!confirm('Are you sure you want to delete this shipment?')) return;

    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/fba-shipments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete shipment');
      }

      fetchShipments();
    } catch (err) {
      console.error('Error deleting shipment:', err);
      alert('Error deleting shipment: ' + err.message);
    }
  };

  const getFilteredShipments = () => {
    if (filter === 'All') return shipments;
    return shipments.filter((s) => s.status === filter);
  };

  const filteredShipments = getFilteredShipments();

  const getStatusBadgeStyle = (status) => {
    const baseStyle = {
      display: 'inline-block',
      padding: '6px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
    };

    switch (status) {
      case 'Draft':
        return {
          ...baseStyle,
          backgroundColor: '#6B7280',
          color: '#FFFFFF',
        };
      case 'Shipped':
        return {
          ...baseStyle,
          backgroundColor: '#3B82F6',
          color: '#FFFFFF',
        };
      case 'In Transit':
        return {
          ...baseStyle,
          backgroundColor: '#F59E0B',
          color: '#0A0A0A',
        };
      case 'Received':
        return {
          ...baseStyle,
          backgroundColor: '#22C55E',
          color: '#0A0A0A',
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: '#1E1E1E',
          color: '#FFFFFF',
        };
    }
  };

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
      color: '#FFFFFF',
    },
    main: {
      flex: 1,
      marginLeft: 250,
      padding: '30px',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      paddingBottom: '20px',
      borderBottom: '1px solid #1E1E1E',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      margin: 0,
    },
    button: {
      backgroundColor: '#FFD700',
      color: '#0A0A0A',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    filterTabs: {
      display: 'flex',
      gap: '15px',
      marginBottom: '25px',
      paddingBottom: '15px',
      borderBottom: '1px solid #1E1E1E',
    },
    filterTab: {
      padding: '8px 0',
      backgroundColor: 'transparent',
      border: 'none',
      color: '#888',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      borderBottom: '2px solid transparent',
    },
    filterTabActive: {
      color: '#FFD700',
      borderBottomColor: '#FFD700',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    tableHeader: {
      backgroundColor: '#111111',
      borderBottom: '2px solid #1E1E1E',
      padding: '12px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: '#AAA',
      textTransform: 'uppercase',
    },
    tableRow: {
      borderBottom: '1px solid #1E1E1E',
    },
    tableCell: {
      padding: '12px',
      fontSize: '14px',
      color: '#FFF',
    },
    actionButton: {
      backgroundColor: 'transparent',
      border: '1px solid #1E1E1E',
      color: '#FFD700',
      padding: '6px 12px',
      marginRight: '8px',
      borderRadius: '4px',
      fontSize: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    deleteButton: {
      color: '#EF4444',
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '30px',
      width: '90%',
      maxWidth: '500px',
      maxHeight: '90vh',
      overflowY: 'auto',
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '20px',
      color: '#FFD700',
    },
    formGroup: {
      marginBottom: '15px',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
      marginBottom: '6px',
      color: '#AAA',
    },
    input: {
      width: '100%',
      padding: '10px',
      backgroundColor: '#0A0A0A',
      border: '1px solid #1E1E1E',
      borderRadius: '4px',
      color: '#FFF',
      fontSize: '14px',
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '10px',
      backgroundColor: '#0A0A0A',
      border: '1px solid #1E1E1E',
      borderRadius: '4px',
      color: '#FFF',
      fontSize: '14px',
      boxSizing: 'border-box',
    },
    formActions: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '20px',
    },
    submitButton: {
      backgroundColor: '#FFD700',
      color: '#0A0A0A',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    cancelButton: {
      backgroundColor: 'transparent',
      border: '1px solid #1E1E1E',
      color: '#AAA',
      padding: '10px 20px',
      borderRadius: '4px',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    loadingState: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#666',
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#666',
      backgroundColor: '#111111',
      borderRadius: '8px',
      border: '1px solid #1E1E1E',
    },
    emptyStateIcon: {
      fontSize: '48px',
      marginBottom: '16px',
    },
    emptyStateText: {
      fontSize: '16px',
      marginBottom: '8px',
    },
    retryButton: {
      backgroundColor: '#FFD700',
      color: '#0A0A0A',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '16px',
      transition: 'background-color 0.2s',
    },
  };

  return (
    <div style={styles.container}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>FBA Shipment Planner</h1>
          <button
            style={styles.button}
            onClick={() => setShowCreateModal(true)}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#FFC700')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#FFD700')}
          >
            + Create Shipment
          </button>
        </div>

        <div style={styles.filterTabs}>
          {['All', 'Draft', 'Shipped', 'In Transit', 'Received'].map((status) => (
            <button
              key={status}
              style={{
                ...styles.filterTab,
                ...(filter === status ? styles.filterTabActive : {}),
              }}
              onClick={() => setFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={styles.loadingState}>Loading shipments...</div>
        ) : error ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyStateIcon}>⚠️</div>
            <p style={styles.emptyStateText}>Error: {error}</p>
            <button
              style={styles.retryButton}
              onClick={fetchShipments}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#FFC700')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#FFD700')}
            >
              Retry
            </button>
          </div>
        ) : filteredShipments.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyStateIcon}>📦</div>
            <p style={styles.emptyStateText}>No shipments yet</p>
            <p style={{ color: '#555', fontSize: '14px' }}>
              Create your first FBA shipment to get started
            </p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableRow}>
                <th style={styles.tableHeader}>Name</th>
                <th style={styles.tableHeader}>Destination FC</th>
                <th style={styles.tableHeader}>Status</th>
                <th style={styles.tableHeader}>Units</th>
                <th style={styles.tableHeader}>Boxes</th>
                <th style={styles.tableHeader}>Ship Date</th>
                <th style={styles.tableHeader}>Tracking</th>
                <th style={styles.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map((shipment) => (
                <tr key={shipment.id} style={styles.tableRow}>
                  <td style={styles.tableCell}>{shipment.name || 'N/A'}</td>
                  <td style={styles.tableCell}>{shipment.destinationFC || 'N/A'}</td>
                  <td style={styles.tableCell}>
                    <span style={getStatusBadgeStyle(shipment.status || 'Draft')}>
                      {shipment.status || 'Draft'}
                    </span>
                  </td>
                  <td style={styles.tableCell}>{shipment.units || '0'}</td>
                  <td style={styles.tableCell}>{shipment.boxes || '0'}</td>
                  <td style={styles.tableCell}>
                    {shipment.shipDate
                      ? new Date(shipment.shipDate).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td style={styles.tableCell}>{shipment.tracking || 'N/A'}</td>
                  <td style={styles.tableCell}>
                    <button
                      style={styles.actionButton}
                      onClick={() => alert('Edit feature coming soon')}
                      onMouseEnter={(e) => (e.target.backgroundColor = '#1E1E1E')}
                      onMouseLeave={(e) => (e.target.backgroundColor = 'transparent')}
                    >
                      Edit
                    </button>
                    <button
                      style={{ ...styles.actionButton, ...styles.deleteButton }}
                      onClick={() => handleDeleteShipment(shipment.id)}
                      onMouseEnter={(e) => (e.target.backgroundColor = '#1E1E1E')}
                      onMouseLeave={(e) => (e.target.backgroundColor = 'transparent')}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>

      {showCreateModal && (
        <div style={styles.modal} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Create Shipment</h2>
            <form onSubmit={handleCreateSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Shipment Name</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="e.g., Spring Collection Wave 1"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Destination FC</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="e.g., PHX3"
                  value={createForm.destinationFC}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, destinationFC: e.target.value })
                  }
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Units</label>
                  <input
                    type="number"
                    style={styles.input}
                    placeholder="0"
                    value={createForm.units}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, units: e.target.value })
                    }
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Boxes</label>
                  <input
                    type="number"
                    style={styles.input}
                    placeholder="0"
                    value={createForm.boxes}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, boxes: e.target.value })
                    }
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Ship Date</label>
                <input
                  type="date"
                  style={styles.input}
                  value={createForm.shipDate}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, shipDate: e.target.value })
                  }
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Tracking Number (Optional)</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Tracking number"
                  value={createForm.tracking}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, tracking: e.target.value })
                  }
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select
                  style={styles.select}
                  value={createForm.status}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, status: e.target.value })
                  }
                >
                  <option value="Draft">Draft</option>
                  <option value="Shipped">Shipped</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Received">Received</option>
                </select>
              </div>

              <div style={styles.formActions}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setShowCreateModal(false)}
                  onMouseEnter={(e) => (e.target.backgroundColor = '#1E1E1E')}
                  onMouseLeave={(e) => (e.target.backgroundColor = 'transparent')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = '#FFC700')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = '#FFD700')}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
