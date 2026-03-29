import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const styles = {
  outerContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
  },
  container: {
    flex: 1,
    marginLeft: '250px',
    padding: '32px',
    color: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#999999',
    margin: '0',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '32px',
    borderBottom: '1px solid #1E1E1E',
  },
  tab: {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#999999',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    color: '#FFD700',
    borderBottomColor: '#FFD700',
  },
  tabContent: {
    minHeight: '600px',
  },
  buttonPrimary: {
    padding: '10px 20px',
    backgroundColor: '#FFD700',
    border: 'none',
    borderRadius: '6px',
    color: '#000000',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  buttonPrimaryHover: {
    backgroundColor: '#FFC700',
  },
  buttonSecondary: {
    padding: '10px 20px',
    backgroundColor: '#1E1E1E',
    border: '1px solid #333333',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontWeight: '500',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  buttonDanger: {
    padding: '8px 14px',
    backgroundColor: '#DC2626',
    border: 'none',
    borderRadius: '4px',
    color: '#FFFFFF',
    fontWeight: '500',
    cursor: 'pointer',
    fontSize: '12px',
  },
  buttonSuccess: {
    padding: '8px 14px',
    backgroundColor: '#10B981',
    border: 'none',
    borderRadius: '4px',
    color: '#FFFFFF',
    fontWeight: '500',
    cursor: 'pointer',
    fontSize: '12px',
  },
  modal: {
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
  modalContent: {
    backgroundColor: '#111111',
    borderRadius: '8px',
    padding: '32px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid #1E1E1E',
  },
  modalHeader: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '24px',
    color: '#FFFFFF',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#CCCCCC',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    minHeight: '120px',
    resize: 'vertical',
  },
  modalFooter: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '32px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    transition: 'all 0.2s ease',
  },
  cardHover: {
    borderColor: '#FFD700',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#FFFFFF',
  },
  cardValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: '12px',
  },
  cardSubtext: {
    fontSize: '13px',
    color: '#999999',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#111111',
    borderRadius: '8px',
    border: '1px solid #1E1E1E',
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#1E1E1E',
    borderBottom: '1px solid #2E2E2E',
  },
  tableHeaderCell: {
    padding: '14px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#999999',
    textAlign: 'left',
    cursor: 'pointer',
    userSelect: 'none',
  },
  tableRow: {
    borderBottom: '1px solid #1E1E1E',
    transition: 'background-color 0.2s ease',
  },
  tableRowHover: {
    backgroundColor: '#1A1A1A',
  },
  tableCell: {
    padding: '14px 16px',
    fontSize: '13px',
    color: '#FFFFFF',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  badgeActive: {
    backgroundColor: '#10B98133',
    color: '#10B981',
  },
  badgePending: {
    backgroundColor: '#F5911633',
    color: '#F59116',
  },
  badgeRejected: {
    backgroundColor: '#DC262633',
    color: '#DC2626',
  },
  badgeBlacklisted: {
    backgroundColor: '#7F1D1D33',
    color: '#FCA5A5',
  },
  badgeWinner: {
    backgroundColor: '#10B98133',
    color: '#10B981',
  },
  badgePotential: {
    backgroundColor: '#F5911633',
    color: '#F59116',
  },
  badgePass: {
    backgroundColor: '#DC262633',
    color: '#DC2626',
  },
  searchContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '10px 12px',
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
  },
  filterSelect: {
    padding: '10px 12px',
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
  },
  actionsContainer: {
    display: 'flex',
    gap: '8px',
  },
  starContainer: {
    display: 'inline-flex',
    gap: '2px',
  },
  star: {
    fontSize: '16px',
    color: '#FFD700',
  },
  starEmpty: {
    fontSize: '16px',
    color: '#333333',
  },
  kpiContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  lineItemsContainer: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#0A0A0A',
    borderRadius: '6px',
    border: '1px solid #1E1E1E',
  },
  lineItem: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr auto',
    gap: '12px',
    alignItems: 'flex-end',
    marginBottom: '12px',
  },
  lineItemLastRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #1E1E1E',
  },
  csvPreview: {
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '16px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  csvPreviewRow: {
    fontSize: '12px',
    color: '#999999',
    padding: '4px 0',
    fontFamily: 'monospace',
  },
  timelineContainer: {
    padding: '20px',
    backgroundColor: '#111111',
    borderRadius: '8px',
    border: '1px solid #1E1E1E',
  },
  timelineItem: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    position: 'relative',
  },
  timelineDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#FFD700',
    flexShrink: 0,
    marginTop: '6px',
  },
  timelineContent: {
    flex: 1,
  },
  timelineDate: {
    fontSize: '12px',
    color: '#999999',
    marginBottom: '4px',
  },
  timelineText: {
    fontSize: '14px',
    color: '#FFFFFF',
  },
};

const SupplierDirectory = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    category: 'Grocery',
    rating: 4,
    status: 'Active',
    notes: '',
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    filterSuppliers();
  }, [suppliers, searchTerm, categoryFilter, statusFilter]);

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/suppliers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSuppliers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    }
  };

  const filterSuppliers = () => {
    let filtered = Array.isArray(suppliers) ? suppliers : [];
    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          (s.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter) {
      filtered = filtered.filter((s) => s.category === categoryFilter);
    }
    if (statusFilter) {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }
    setFilteredSuppliers(filtered);
  };

  const handleAddOrUpdate = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `${BASE_URL}/suppliers/${editingId}`
        : `${BASE_URL}/suppliers`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        setFormData({
          companyName: '',
          contactPerson: '',
          email: '',
          phone: '',
          category: 'Grocery',
          rating: 4,
          status: 'Active',
          notes: '',
        });
        setEditingId(null);
        fetchSuppliers();
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this supplier?')) return;
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/suppliers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchSuppliers();
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  const handleEdit = (supplier) => {
    setFormData(supplier);
    setEditingId(supplier.id);
    setShowModal(true);
  };

  const openAddModal = () => {
    setFormData({
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      category: 'Grocery',
      rating: 4,
      status: 'Active',
      notes: '',
    });
    setEditingId(null);
    setShowModal(true);
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          style={i <= rating ? styles.star : styles.starEmpty}
        >
          ★
        </span>
      );
    }
    return <div style={styles.starContainer}>{stars}</div>;
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: '0', fontSize: '20px', fontWeight: '600' }}>Supplier Directory</h2>
        <button style={styles.buttonPrimary} onClick={openAddModal}>
          + Add Supplier
        </button>
      </div>

      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by company or contact..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Categories</option>
          <option value="Grocery">Grocery</option>
          <option value="Health">Health</option>
          <option value="Beauty">Beauty</option>
          <option value="Home">Home</option>
          <option value="Electronics">Electronics</option>
          <option value="Toys">Toys</option>
          <option value="Sports">Sports</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Blacklisted">Blacklisted</option>
        </select>
      </div>

      <div style={styles.grid}>
        {filteredSuppliers.map((supplier) => (
          <div
            key={supplier.id}
            style={styles.card}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = styles.cardHover.borderColor)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1E1E1E')}
          >
            <div style={styles.cardTitle}>{supplier.companyName || 'N/A'}</div>
            <div style={{ marginBottom: '12px', fontSize: '13px', color: '#999999' }}>
              {supplier.contactPerson || 'N/A'}
            </div>
            <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666666' }}>
              {supplier.email || 'N/A'}
            </div>
            <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666666' }}>
              {supplier.phone || 'N/A'}
            </div>
            <div style={{ marginBottom: '12px', fontSize: '12px', color: '#999999' }}>
              {supplier.category || 'N/A'}
            </div>
            <div style={{ marginBottom: '12px' }}>{renderStars(supplier.rating || 0)}</div>
            <div style={{ marginBottom: '16px' }}>
              <span
                style={{
                  ...styles.badge,
                  ...(supplier.status === 'Active'
                    ? styles.badgeActive
                    : supplier.status === 'Pending'
                    ? styles.badgePending
                    : styles.badgeBlacklisted),
                }}
              >
                {supplier.status || 'N/A'}
              </span>
            </div>
            <div style={{ ...styles.actionsContainer, marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1E1E1E' }}>
              <button
                style={{ ...styles.buttonSecondary, flex: 1 }}
                onClick={() => handleEdit(supplier)}
              >
                Edit
              </button>
              <button
                style={styles.buttonDanger}
                onClick={() => handleDelete(supplier.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              {editingId ? 'Edit Supplier' : 'Add New Supplier'}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Company Name</label>
              <input
                type="text"
                style={styles.input}
                value={formData.companyName || ''}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Contact Person</label>
              <input
                type="text"
                style={styles.input}
                value={formData.contactPerson || ''}
                onChange={(e) =>
                  setFormData({ ...formData, contactPerson: e.target.value })
                }
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                style={styles.input}
                value={formData.email || ''}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Phone</label>
              <input
                type="tel"
                style={styles.input}
                value={formData.phone || ''}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Category</label>
              <select
                style={styles.select}
                value={formData.category || 'Grocery'}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              >
                <option value="Grocery">Grocery</option>
                <option value="Health">Health</option>
                <option value="Beauty">Beauty</option>
                <option value="Home">Home</option>
                <option value="Electronics">Electronics</option>
                <option value="Toys">Toys</option>
                <option value="Sports">Sports</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Rating (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                style={styles.input}
                value={formData.rating || 4}
                onChange={(e) =>
                  setFormData({ ...formData, rating: parseInt(e.target.value) || 4 })
                }
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <select
                style={styles.select}
                value={formData.status || 'Active'}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Blacklisted">Blacklisted</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Notes</label>
              <textarea
                style={styles.textarea}
                value={formData.notes || ''}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.buttonSecondary}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button style={styles.buttonPrimary} onClick={handleAddOrUpdate}>
                {editingId ? 'Update' : 'Add'} Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PurchaseOrders = () => {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [sortField, setSortField] = useState('poNumber');
  const [sortDirection, setSortDirection] = useState('asc');
  const [formData, setFormData] = useState({
    poNumber: '',
    supplierId: '',
    lineItems: [{ asin: '', quantity: 1, unitCost: 0 }],
    notes: '',
    status: 'Draft',
  });

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/purchase-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/suppliers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSuppliers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    }
  };

  const calculateTotal = () => {
    return (Array.isArray(formData.lineItems) ? formData.lineItems : []).reduce(
      (sum, item) => sum + ((item.quantity || 0) * (item.unitCost || 0)),
      0
    );
  };

  const handleAddOrUpdateOrder = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const payload = {
        ...formData,
        totalCost: calculateTotal(),
      };

      const response = await fetch(`${BASE_URL}/purchase-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowModal(false);
        setFormData({
          poNumber: '',
          supplierId: '',
          lineItems: [{ asin: '', quantity: 1, unitCost: 0 }],
          notes: '',
          status: 'Draft',
        });
        fetchOrders();
      }
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/purchase-orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Draft':
        return styles.badgePending;
      case 'Submitted':
        return { ...styles.badge, backgroundColor: '#3B82F633', color: '#3B82F6' };
      case 'Shipped':
        return { ...styles.badge, backgroundColor: '#F5911633', color: '#F59116' };
      case 'Received':
        return styles.badgeActive;
      case 'Cancelled':
        return styles.badgeRejected;
      default:
        return styles.badge;
    }
  };

  const supplierMap = suppliers.reduce((acc, s) => {
    acc[s.id] = s.companyName || 'N/A';
    return acc;
  }, {});

  const sortedOrders = [...(Array.isArray(orders) ? orders : [])].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    const comparison = String(aVal).localeCompare(String(bVal));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: '0', fontSize: '20px', fontWeight: '600' }}>Purchase Orders</h2>
        <button style={styles.buttonPrimary} onClick={() => setShowModal(true)}>
          + Create PO
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead style={styles.tableHeader}>
            <tr>
              <th style={styles.tableHeaderCell} onClick={() => handleSort('poNumber')}>
                PO#
              </th>
              <th style={styles.tableHeaderCell} onClick={() => handleSort('supplierId')}>
                Supplier
              </th>
              <th style={styles.tableHeaderCell} onClick={() => handleSort('itemCount')}>
                Items
              </th>
              <th style={styles.tableHeaderCell} onClick={() => handleSort('totalCost')}>
                Total Cost
              </th>
              <th style={styles.tableHeaderCell} onClick={() => handleSort('status')}>
                Status
              </th>
              <th style={styles.tableHeaderCell} onClick={() => handleSort('createdDate')}>
                Created
              </th>
              <th style={styles.tableHeaderCell}>Expected Delivery</th>
              <th style={styles.tableHeaderCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order) => (
              <tr key={order.id} style={styles.tableRow}>
                <td style={styles.tableCell}>{order.poNumber || 'N/A'}</td>
                <td style={styles.tableCell}>{supplierMap[order.supplierId] || 'N/A'}</td>
                <td style={styles.tableCell}>
                  {Array.isArray(order.lineItems) ? order.lineItems.length : 0}
                </td>
                <td style={styles.tableCell}>
                  ${((order.totalCost || 0) / 100).toFixed(2)}
                </td>
                <td style={styles.tableCell}>
                  <span style={getStatusBadgeStyle(order.status)}>
                    {order.status || 'N/A'}
                  </span>
                </td>
                <td style={styles.tableCell}>
                  {order.createdDate
                    ? new Date(order.createdDate).toLocaleDateString()
                    : 'N/A'}
                </td>
                <td style={styles.tableCell}>
                  {order.expectedDelivery
                    ? new Date(order.expectedDelivery).toLocaleDateString()
                    : 'N/A'}
                </td>
                <td style={styles.tableCell}>
                  <div style={styles.actionsContainer}>
                    {order.status === 'Draft' && (
                      <button
                        style={{ ...styles.buttonSuccess, fontSize: '11px' }}
                        onClick={() => handleStatusUpdate(order.id, 'Submitted')}
                      >
                        Submit
                      </button>
                    )}
                    {order.status === 'Submitted' && (
                      <button
                        style={{ ...styles.buttonSuccess, fontSize: '11px' }}
                        onClick={() => handleStatusUpdate(order.id, 'Shipped')}
                      >
                        Mark Shipped
                      </button>
                    )}
                    {order.status === 'Shipped' && (
                      <button
                        style={{ ...styles.buttonSuccess, fontSize: '11px' }}
                        onClick={() => handleStatusUpdate(order.id, 'Received')}
                      >
                        Mark Received
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>Create Purchase Order</div>

            <div style={styles.formGroup}>
              <label style={styles.label}>PO Number</label>
              <input
                type="text"
                style={styles.input}
                value={formData.poNumber || ''}
                onChange={(e) =>
                  setFormData({ ...formData, poNumber: e.target.value })
                }
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Supplier</label>
              <select
                style={styles.select}
                value={formData.supplierId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, supplierId: e.target.value })
                }
              >
                <option value="">Select a supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName || 'N/A'}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.lineItemsContainer}>
              <label style={{ ...styles.label, marginBottom: '16px' }}>
                Line Items
              </label>
              {(Array.isArray(formData.lineItems) ? formData.lineItems : []).map(
                (item, idx) => (
                  <div key={idx} style={styles.lineItem}>
                    <input
                      type="text"
                      placeholder="ASIN"
                      style={styles.input}
                      value={item.asin || ''}
                      onChange={(e) => {
                        const newItems = [...(Array.isArray(formData.lineItems) ? formData.lineItems : [])];
                        newItems[idx].asin = e.target.value;
                        setFormData({ ...formData, lineItems: newItems });
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      style={styles.input}
                      value={item.quantity || 1}
                      onChange={(e) => {
                        const newItems = [...(Array.isArray(formData.lineItems) ? formData.lineItems : [])];
                        newItems[idx].quantity = parseInt(e.target.value) || 1;
                        setFormData({ ...formData, lineItems: newItems });
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Unit Cost"
                      style={styles.input}
                      value={item.unitCost || 0}
                      onChange={(e) => {
                        const newItems = [...(Array.isArray(formData.lineItems) ? formData.lineItems : [])];
                        newItems[idx].unitCost = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, lineItems: newItems });
                      }}
                    />
                    <button
                      style={styles.buttonDanger}
                      onClick={() => {
                        const newItems = (Array.isArray(formData.lineItems) ? formData.lineItems : []).filter(
                          (_, i) => i !== idx
                        );
                        setFormData({ ...formData, lineItems: newItems });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )
              )}
              <button
                style={{ ...styles.buttonSecondary, marginTop: '12px' }}
                onClick={() => {
                  const newItems = [...(Array.isArray(formData.lineItems) ? formData.lineItems : [])];
                  newItems.push({ asin: '', quantity: 1, unitCost: 0 });
                  setFormData({ ...formData, lineItems: newItems });
                }}
              >
                + Add Line Item
              </button>
              <div style={styles.lineItemLastRow}>
                <span>Total:</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFD700' }}>
                  ${(calculateTotal() / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Notes</label>
              <textarea
                style={styles.textarea}
                value={formData.notes || ''}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.buttonSecondary}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button style={styles.buttonPrimary} onClick={handleAddOrUpdateOrder}>
                Create PO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProductSourcing = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvContent, setCSVContent] = useState('');
  const [csvPreview, setCSVPreview] = useState([]);
  const [sortField, setSortField] = useState('roi');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    asin: '',
    productName: '',
    category: '',
    buyPrice: 0,
    sellPrice: 0,
    weight: 1,
  });

  const csvInputRef = useRef(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterAndSort();
  }, [products, searchTerm, sortField, sortDirection]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/sourcing-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const enriched = (Array.isArray(data) ? data : []).map((p) =>
          enrichProductData(p)
        );
        setProducts(enriched);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const calculateFBAFees = (weight, sellPrice) => {
    const referralFee = (sellPrice * 0.15) / 100;
    const fulfillmentFee =
      weight <= 20
        ? 322
        : weight <= 30
        ? 360
        : weight <= 40
        ? 399
        : 399;
    const storageFee = 87;
    return (referralFee + fulfillmentFee + storageFee) / 100;
  };

  const enrichProductData = (product) => {
    const buyPrice = parseFloat(product.buyPrice) || 0;
    const sellPrice = parseFloat(product.sellPrice) || 0;
    const weight = parseFloat(product.weight) || 1;
    const fbaFees = calculateFBAFees(weight, sellPrice);
    const profit = sellPrice - buyPrice - fbaFees;
    const roi = buyPrice > 0 ? ((profit / buyPrice) * 100).toFixed(2) : 0;
    let verdict = 'PASS';
    if (roi >= 30) verdict = 'WINNER';
    else if (roi >= 15) verdict = 'POTENTIAL';

    return {
      ...product,
      fbaFees: fbaFees.toFixed(2),
      profit: profit.toFixed(2),
      roi: parseFloat(roi),
      verdict,
    };
  };

  const filterAndSort = () => {
    let filtered = products;
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          (p.asin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.productName || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      const comparison = parseFloat(aVal) - parseFloat(bVal);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredProducts(sorted);
  };

  const handleAddOrUpdate = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const payload = enrichProductData(formData);

      const response = await fetch(`${BASE_URL}/sourcing-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowModal(false);
        setFormData({
          asin: '',
          productName: '',
          category: '',
          buyPrice: 0,
          sellPrice: 0,
          weight: 1,
        });
        fetchProducts();
      }
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleCSVImport = () => {
    const lines = csvContent
      .trim()
      .split('\n')
      .filter((line) => line.trim());
    const preview = [];

    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length >= 5) {
        preview.push({
          asin: parts[0],
          productName: parts[1],
          buyPrice: parseFloat(parts[2]) || 0,
          sellPrice: parseFloat(parts[3]) || 0,
          weight: parseFloat(parts[4]) || 1,
        });
      }
    }

    setCSVPreview(preview);
  };

  const confirmCSVImport = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const lines = csvContent.trim().split('\n');

      for (const line of lines) {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length >= 5) {
          const product = enrichProductData({
            asin: parts[0],
            productName: parts[1],
            category: parts[4] || '',
            buyPrice: parseFloat(parts[2]) || 0,
            sellPrice: parseFloat(parts[3]) || 0,
            weight: parseFloat(parts[4]) || 1,
          });

          await fetch(`${BASE_URL}/sourcing-products`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(product),
          });
        }
      }

      setShowCSVModal(false);
      setCSVContent('');
      setCSVPreview([]);
      fetchProducts();
    } catch (error) {
      console.error('Error importing CSV:', error);
    }
  };

  const exportToCSV = () => {
    const rows = [
      ['ASIN', 'Product Name', 'Category', 'Buy Price', 'Sell Price', 'Weight', 'FBA Fees', 'Profit', 'ROI %', 'Verdict'],
      ...filteredProducts.map((p) => [
        p.asin || '',
        p.productName || '',
        p.category || '',
        (p.buyPrice || 0).toFixed(2),
        (p.sellPrice || 0).toFixed(2),
        (p.weight || 0).toFixed(2),
        p.fbaFees || '0.00',
        p.profit || '0.00',
        p.roi || '0',
        p.verdict || 'PASS',
      ]),
    ];

    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sourcing-products.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getVerdictStyle = (verdict) => {
    switch (verdict) {
      case 'WINNER':
        return styles.badgeWinner;
      case 'POTENTIAL':
        return styles.badgePotential;
      case 'PASS':
      default:
        return styles.badgePass;
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div>
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <h2 style={{ margin: '0', fontSize: '20px', fontWeight: '600' }}>
          Product Sourcing
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={styles.buttonPrimary} onClick={() => setShowModal(true)}>
            + Add Product
          </button>
          <button style={styles.buttonSecondary} onClick={() => setShowCSVModal(true)}>
            📥 Import CSV
          </button>
          <button style={styles.buttonSecondary} onClick={exportToCSV}>
            📤 Export CSV
          </button>
        </div>
      </div>

      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by ASIN or product name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead style={styles.tableHeader}>
            <tr>
              <th
                style={styles.tableHeaderCell}
                onClick={() => handleSort('asin')}
              >
                ASIN
              </th>
              <th
                style={styles.tableHeaderCell}
                onClick={() => handleSort('productName')}
              >
                Product Name
              </th>
              <th
                style={styles.tableHeaderCell}
                onClick={() => handleSort('category')}
              >
                Category
              </th>
              <th
                style={styles.tableHeaderCell}
                onClick={() => handleSort('buyPrice')}
              >
                Buy Price
              </th>
              <th
                style={styles.tableHeaderCell}
                onClick={() => handleSort('sellPrice')}
              >
                Sell Price
              </th>
              <th
                style={styles.tableHeaderCell}
                onClick={() => handleSort('fbaFees')}
              >
                FBA Fees
              </th>
              <th
                style={styles.tableHeaderCell}
                onClick={() => handleSort('profit')}
              >
                Profit
              </th>
              <th
                style={styles.tableHeaderCell}
                onClick={() => handleSort('roi')}
              >
                ROI %
              </th>
              <th
                style={styles.tableHeaderCell}
                onClick={() => handleSort('verdict')}
              >
                Verdict
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id} style={styles.tableRow}>
                <td style={styles.tableCell}>{product.asin || 'N/A'}</td>
                <td style={styles.tableCell}>{product.productName || 'N/A'}</td>
                <td style={styles.tableCell}>{product.category || 'N/A'}</td>
                <td style={styles.tableCell}>
                  ${((parseFloat(product.buyPrice) || 0) / 100).toFixed(2)}
                </td>
                <td style={styles.tableCell}>
                  ${((parseFloat(product.sellPrice) || 0) / 100).toFixed(2)}
                </td>
                <td style={styles.tableCell}>
                  ${(parseFloat(product.fbaFees) || 0).toFixed(2)}
                </td>
                <td style={styles.tableCell}>
                  ${(parseFloat(product.profit) || 0).toFixed(2)}
                </td>
                <td style={styles.tableCell}>{product.roi || 0}%</td>
                <td style={styles.tableCell}>
                  <span style={getVerdictStyle(product.verdict)}>
                    {product.verdict || 'PASS'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>Add Product</div>

            <div style={styles.formGroup}>
              <label style={styles.label}>ASIN</label>
              <input
                type="text"
                style={styles.input}
                value={formData.asin || ''}
                onChange={(e) =>
                  setFormData({ ...formData, asin: e.target.value })
                }
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Product Name</label>
              <input
                type="text"
                style={styles.input}
                value={formData.productName || ''}
                onChange={(e) =>
                  setFormData({ ...formData, productName: e.target.value })
                }
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Category</label>
              <input
                type="text"
                style={styles.input}
                value={formData.category || ''}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Buy Price ($)</label>
              <input
                type="number"
                step="0.01"
                style={styles.input}
                value={formData.buyPrice || 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    buyPrice: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Sell Price ($)</label>
              <input
                type="number"
                step="0.01"
                style={styles.input}
                value={formData.sellPrice || 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sellPrice: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Weight (oz)</label>
              <input
                type="number"
                step="0.1"
                style={styles.input}
                value={formData.weight || 1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    weight: parseFloat(e.target.value) || 1,
                  })
                }
              />
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.buttonSecondary}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button style={styles.buttonPrimary} onClick={handleAddOrUpdate}>
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}

      {showCSVModal && (
        <div style={styles.modal} onClick={() => setShowCSVModal(false)}>
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>Import Products from CSV</div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                CSV Format: ASIN, Product Name, Buy Price, Sell Price, Weight
              </label>
              <textarea
                style={styles.textarea}
                value={csvContent}
                onChange={(e) => setCSVContent(e.target.value)}
                placeholder="B08ABC123,Widget,10.00,29.99,2.5&#10;B08DEF456,Gadget,15.00,49.99,3.0"
              />
            </div>

            {csvPreview.length > 0 && (
              <div style={styles.csvPreview}>
                <div style={{ marginBottom: '8px', color: '#FFD700' }}>
                  Preview ({csvPreview.length} products):
                </div>
                {csvPreview.map((p, idx) => (
                  <div key={idx} style={styles.csvPreviewRow}>
                    {p.asin} - {p.productName} (${p.buyPrice} → ${p.sellPrice})
                  </div>
                ))}
              </div>
            )}

            <div style={styles.modalFooter}>
              <button
                style={styles.buttonSecondary}
                onClick={() => {
                  setShowCSVModal(false);
                  setCSVContent('');
                  setCSVPreview([]);
                }}
              >
                Cancel
              </button>
              <button
                style={styles.buttonSecondary}
                onClick={handleCSVImport}
              >
                Preview
              </button>
              {csvPreview.length > 0 && (
                <button
                  style={styles.buttonPrimary}
                  onClick={confirmCSVImport}
                >
                  Import {csvPreview.length} Products
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const WholesaleAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/wholesale-analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const mockData = {
    totalRevenue: 45678,
    totalProfit: 12340,
    avgROI: 27,
    activeSuppliers: 8,
    revenueBySupplier: [
      { supplier: 'Supplier A', revenue: 15000 },
      { supplier: 'Supplier B', revenue: 12000 },
      { supplier: 'Supplier C', revenue: 10000 },
      { supplier: 'Supplier D', revenue: 8678 },
    ],
    profitTrend: [
      { month: 'Sep', profit: 1500 },
      { month: 'Oct', profit: 2300 },
      { month: 'Nov', profit: 2100 },
      { month: 'Dec', profit: 3200 },
      { month: 'Jan', profit: 2140 },
      { month: 'Feb', profit: 1100 },
    ],
    categoryDistribution: [
      { category: 'Electronics', percentage: 35 },
      { category: 'Home', percentage: 25 },
      { category: 'Sports', percentage: 20 },
      { category: 'Other', percentage: 20 },
    ],
    topProducts: [
      { product: 'Product A', roi: 45 },
      { product: 'Product B', roi: 38 },
      { product: 'Product C', roi: 32 },
      { product: 'Product D', roi: 28 },
      { product: 'Product E', roi: 25 },
    ],
  };

  const displayData = data || mockData;

  const RevenueBySupplierChart = () => {
    const maxRevenue = Math.max(
      ...displayData.revenueBySupplier.map((d) => d.revenue)
    );
    const barHeight = 40;
    const chartHeight = displayData.revenueBySupplier.length * (barHeight + 20) + 40;

    return (
      <svg width="100%" height={chartHeight} style={{ marginBottom: '16px' }}>
        <text x="10" y="20" fill="#FFD700" fontSize="12" fontWeight="600">
          Revenue by Supplier
        </text>

        {displayData.revenueBySupplier.map((item, idx) => {
          const barWidth = (item.revenue / maxRevenue) * 250;
          const y = 40 + idx * (barHeight + 20);

          return (
            <g key={idx}>
              <text x="10" y={y + 25} fill="#FFFFFF" fontSize="12">
                {item.supplier}
              </text>
              <rect
                x="150"
                y={y + 10}
                width={barWidth}
                height={barHeight}
                fill="#FFD700"
                opacity="0.8"
                title={`$${(item.revenue / 100).toFixed(2)}`}
              />
              <text
                x={160 + barWidth}
                y={y + 35}
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="600"
              >
                ${(item.revenue / 100).toFixed(0)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  const ProfitTrendChart = () => {
    const maxProfit = Math.max(...displayData.profitTrend.map((d) => d.profit));
    const width = 600;
    const height = 200;
    const padding = 30;
    const pointSpacing = (width - padding * 2) / (displayData.profitTrend.length - 1);

    const points = displayData.profitTrend.map((item, idx) => {
      const x = padding + idx * pointSpacing;
      const y = height - padding - (item.profit / maxProfit) * (height - padding * 2);
      return { x, y, ...item };
    });

    return (
      <svg
        width="100%"
        height={height}
        style={{ marginBottom: '16px' }}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMinYMin meet"
      >
        <text x="10" y="20" fill="#FFD700" fontSize="12" fontWeight="600">
          Profit Trend (6 Months)
        </text>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
          <line
            key={`grid-${idx}`}
            x1={padding}
            y1={height - padding - ratio * (height - padding * 2)}
            x2={width - padding}
            y2={height - padding - ratio * (height - padding * 2)}
            stroke="#1E1E1E"
            strokeDasharray="2,2"
          />
        ))}

        {/* Line */}
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#FFD700"
          strokeWidth="2"
        />

        {/* Points */}
        {points.map((point, idx) => (
          <g key={idx}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#FFD700"
              title={`${point.month}: $${(point.profit / 100).toFixed(2)}`}
            />
            <text
              x={point.x}
              y={height - 10}
              textAnchor="middle"
              fill="#999999"
              fontSize="11"
            >
              {point.month}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  const CategoryDistributionChart = () => {
    const width = 300;
    const height = 300;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 80;

    let currentAngle = -Math.PI / 2;
    const slices = displayData.categoryDistribution.map((item) => {
      const sliceAngle = (item.percentage / 100) * Math.PI * 2;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const largeArc = sliceAngle > Math.PI ? 1 : 0;
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z',
      ].join(' ');

      const labelAngle = startAngle + sliceAngle / 2;
      const labelX = centerX + (radius * 0.65) * Math.cos(labelAngle);
      const labelY = centerY + (radius * 0.65) * Math.sin(labelAngle);

      currentAngle = endAngle;

      return { item, pathData, labelX, labelY };
    });

    const colors = ['#FFD700', '#F59116', '#10B981', '#3B82F6'];

    return (
      <svg width="100%" height={height} style={{ marginBottom: '16px' }}>
        <text x="10" y="20" fill="#FFD700" fontSize="12" fontWeight="600">
          Category Distribution
        </text>

        {slices.map((slice, idx) => (
          <g key={idx}>
            <path
              d={slice.pathData}
              fill={colors[idx % colors.length]}
              opacity="0.8"
              title={`${slice.item.category}: ${slice.item.percentage}%`}
            />
            <text
              x={slice.labelX}
              y={slice.labelY}
              textAnchor="middle"
              fill="#000000"
              fontSize="11"
              fontWeight="600"
            >
              {slice.item.percentage}%
            </text>
          </g>
        ))}

        {displayData.categoryDistribution.map((item, idx) => (
          <g key={`legend-${idx}`}>
            <rect
              x="10"
              y={height - 80 + idx * 18}
              width="12"
              height="12"
              fill={colors[idx % colors.length]}
            />
            <text
              x="28"
              y={height - 70 + idx * 18}
              fill="#FFFFFF"
              fontSize="11"
            >
              {item.category}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  const TopProductsChart = () => {
    const maxROI = Math.max(...displayData.topProducts.map((d) => d.roi));
    const barHeight = 30;
    const chartHeight = displayData.topProducts.length * (barHeight + 15) + 50;

    return (
      <svg width="100%" height={chartHeight} style={{ marginBottom: '16px' }}>
        <text x="10" y="20" fill="#FFD700" fontSize="12" fontWeight="600">
          Top 10 Products by ROI
        </text>

        {displayData.topProducts.map((item, idx) => {
          const barWidth = (item.roi / maxROI) * 250;
          const y = 40 + idx * (barHeight + 15);

          return (
            <g key={idx}>
              <text x="10" y={y + 20} fill="#FFFFFF" fontSize="11">
                {item.product}
              </text>
              <rect
                x="150"
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#10B981"
                opacity="0.8"
                title={`ROI: ${item.roi}%`}
              />
              <text
                x={160 + barWidth}
                y={y + 22}
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="600"
              >
                {item.roi}%
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading analytics...</div>;
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600' }}>
        Wholesale Analytics
      </h2>

      <div style={styles.kpiContainer}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Total Revenue</div>
          <div style={styles.cardValue}>
            ${((displayData.totalRevenue || 0) / 100).toFixed(2)}
          </div>
          <div style={styles.cardSubtext}>All-time revenue</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Total Profit</div>
          <div style={styles.cardValue}>
            ${((displayData.totalProfit || 0) / 100).toFixed(2)}
          </div>
          <div style={styles.cardSubtext}>All-time profit</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Avg ROI</div>
          <div style={styles.cardValue}>{displayData.avgROI || 0}%</div>
          <div style={styles.cardSubtext}>Average return on investment</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Active Suppliers</div>
          <div style={styles.cardValue}>{displayData.activeSuppliers || 0}</div>
          <div style={styles.cardSubtext}>Current partnerships</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}
      >
        <div style={{ ...styles.card, gridColumn: 'span 2' }}>
          <RevenueBySupplierChart />
        </div>

        <div style={styles.card}>
          <CategoryDistributionChart />
        </div>

        <div style={{ ...styles.card, gridColumn: 'span 2' }}>
          <ProfitTrendChart />
        </div>

        <div style={styles.card}>
          <TopProductsChart />
        </div>
      </div>
    </div>
  );
};

const BrandApprovals = () => {
  const [brands, setBrands] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [formData, setFormData] = useState({
    brandName: '',
    category: '',
    justification: '',
  });

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/brand-approvals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBrands(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
      setBrands([]);
    }
  };

  const handleApply = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/brand-approvals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          applicationDate: new Date().toISOString(),
          status: 'Pending',
        }),
      });

      if (response.ok) {
        setShowModal(false);
        setFormData({
          brandName: '',
          category: '',
          justification: '',
        });
        fetchBrands();
      }
    } catch (error) {
      console.error('Error applying for brand:', error);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Pending':
        return styles.badgePending;
      case 'Approved':
        return styles.badgeActive;
      case 'Denied':
        return styles.badgeRejected;
      case 'Under Review':
        return { ...styles.badge, backgroundColor: '#3B82F633', color: '#3B82F6' };
      default:
        return styles.badge;
    }
  };

  const filteredBrands = statusFilter
    ? (Array.isArray(brands) ? brands : []).filter((b) => b.status === statusFilter)
    : Array.isArray(brands)
    ? brands
    : [];

  const getTimelineData = (brand) => {
    const timeline = [];
    if (brand.applicationDate) {
      timeline.push({
        date: new Date(brand.applicationDate).toLocaleDateString(),
        text: 'Application Submitted',
      });
    }
    if (brand.status === 'Approved') {
      timeline.push({
        date: new Date(
          new Date(brand.applicationDate).getTime() + 5 * 24 * 60 * 60 * 1000
        ).toLocaleDateString(),
        text: 'Application Approved',
      });
    }
    return timeline;
  };

  return (
    <div>
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: '0', fontSize: '20px', fontWeight: '600' }}>
          Brand Approvals
        </h2>
        <button style={styles.buttonPrimary} onClick={() => setShowModal(true)}>
          + Apply for Brand
        </button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Denied">Denied</option>
          <option value="Under Review">Under Review</option>
        </select>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {filteredBrands.map((brand) => (
          <div
            key={brand.id}
            style={{
              ...styles.card,
              cursor: 'pointer',
            }}
            onClick={() => setSelectedBrand(selectedBrand?.id === brand.id ? null : brand)}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={styles.cardTitle}>{brand.brandName || 'N/A'}</div>
                <div style={{ fontSize: '13px', color: '#999999', marginBottom: '8px' }}>
                  {brand.category || 'N/A'}
                </div>
              </div>
              <span style={getStatusBadgeStyle(brand.status)}>
                {brand.status || 'N/A'}
              </span>
            </div>

            <div style={{ fontSize: '12px', color: '#666666', marginBottom: '16px' }}>
              Applied:{' '}
              {brand.applicationDate
                ? new Date(brand.applicationDate).toLocaleDateString()
                : 'N/A'}
            </div>

            {brand.notes && (
              <div style={{ fontSize: '13px', color: '#CCCCCC', marginBottom: '16px' }}>
                {brand.notes}
              </div>
            )}

            {selectedBrand?.id === brand.id && (
              <div style={styles.timelineContainer}>
                <div style={{ marginBottom: '16px', fontWeight: '600', color: '#FFD700' }}>
                  Approval Timeline
                </div>
                {getTimelineData(brand).map((item, idx) => (
                  <div key={idx} style={styles.timelineItem}>
                    <div style={styles.timelineDot} />
                    <div style={styles.timelineContent}>
                      <div style={styles.timelineDate}>{item.date}</div>
                      <div style={styles.timelineText}>{item.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>Apply for Brand Approval</div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Brand Name</label>
              <input
                type="text"
                style={styles.input}
                value={formData.brandName || ''}
                onChange={(e) =>
                  setFormData({ ...formData, brandName: e.target.value })
                }
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Category</label>
              <input
                type="text"
                style={styles.input}
                value={formData.category || ''}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Justification</label>
              <textarea
                style={styles.textarea}
                value={formData.justification || ''}
                onChange={(e) =>
                  setFormData({ ...formData, justification: e.target.value })
                }
              />
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.buttonSecondary}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button style={styles.buttonPrimary} onClick={handleApply}>
                Submit Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function WholesaleHub() {
  const [activeTab, setActiveTab] = useState('suppliers');

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Wholesale Hub</h1>
          <p style={styles.subtitle}>
            Manage suppliers, purchase orders, sourcing opportunities, analytics, and brand approvals
          </p>
        </div>

        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'suppliers' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('suppliers')}
          >
            Supplier Directory
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'orders' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('orders')}
          >
            Purchase Orders
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'sourcing' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('sourcing')}
          >
            Product Sourcing
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'analytics' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'brands' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('brands')}
          >
            Brand Approvals
          </button>
        </div>

        <div style={styles.tabContent}>
          {activeTab === 'suppliers' && <SupplierDirectory />}
          {activeTab === 'orders' && <PurchaseOrders />}
          {activeTab === 'sourcing' && <ProductSourcing />}
          {activeTab === 'analytics' && <WholesaleAnalytics />}
          {activeTab === 'brands' && <BrandApprovals />}
        </div>
      </div>
    </div>
  );
}
