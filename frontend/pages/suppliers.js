import React, { useState, useEffect } from 'react';
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
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#999999',
  },
  tabsContainer: {
    display: 'flex',
    borderBottom: '1px solid #1E1E1E',
    marginBottom: '32px',
    gap: '8px',
  },
  tab: {
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#666666',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    color: '#FFD700',
    borderBottomColor: '#FFD700',
  },
  tabContent: {
    display: 'none',
  },
  tabContentActive: {
    display: 'block',
  },
  card: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
  },
  controlsBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
  },
  select: {
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buttonPrimary: {
    backgroundColor: '#FFD700',
    color: '#0A0A0A',
  },
  buttonSecondary: {
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
  },
  buttonDanger: {
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#0A0A0A',
    borderBottom: '2px solid #1E1E1E',
  },
  tableHeaderCell: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#CCCCCC',
  },
  tableRow: {
    borderBottom: '1px solid #1E1E1E',
    transition: 'background-color 0.2s ease',
  },
  tableRowHover: {
    backgroundColor: '#0A0A0A',
  },
  tableCell: {
    padding: '12px',
    fontSize: '14px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
  },
  statusActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: '#22C55E',
  },
  statusPending: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#3B82F6',
  },
  statusBlacklisted: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#EF4444',
  },
  statusPreferred: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    color: '#A855F7',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    padding: '6px 10px',
    fontSize: '12px',
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  stars: {
    fontSize: '14px',
    color: '#FFD700',
    letterSpacing: '2px',
  },
  modal: {
    display: 'none',
    position: 'fixed',
    zIndex: 1000,
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalActive: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#FFFFFF',
    fontSize: '24px',
    cursor: 'pointer',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '6px',
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
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    minHeight: '100px',
    resize: 'vertical',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  chartContainer: {
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
  },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },
  metricCard: {
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    padding: '12px',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: '4px',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#666666',
  },
  gaugeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#0A0A0A',
    borderRadius: '8px',
    marginTop: '16px',
  },
  gaugeCircle: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '700',
    color: '#0A0A0A',
  },
  gaugeLabel: {
    flex: 1,
  },
  gaugeText: {
    fontSize: '14px',
    color: '#CCCCCC',
    marginBottom: '4px',
  },
  timeline: {
    position: 'relative',
    paddingLeft: '24px',
  },
  timelineItem: {
    marginBottom: '20px',
    paddingBottom: '20px',
    borderLeft: '2px solid #1E1E1E',
    paddingLeft: '16px',
  },
  timelineItemLast: {
    borderLeft: 'none',
  },
  timelineDate: {
    fontSize: '12px',
    color: '#FFD700',
    fontWeight: '500',
    marginBottom: '4px',
  },
  timelineText: {
    fontSize: '14px',
    color: '#CCCCCC',
  },
  timelineType: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: '500',
    marginRight: '8px',
    backgroundColor: '#1E1E1E',
    color: '#FFD700',
  },
};

const SUPPLIER_CATEGORIES = [
  'Grocery',
  'Health',
  'Beauty',
  'Home',
  'Electronics',
  'Toys',
  'Sports',
  'General',
];

const SUPPLIER_STATUS = ['Active', 'Pending', 'Blacklisted', 'Preferred'];

const TERMS_OPTIONS = ['Net 30', 'Net 60', 'Prepaid', 'COD'];

const MOCK_SUPPLIERS = [
  {
    id: 1,
    companyName: 'Global Wholesale Foods Ltd.',
    contactPerson: 'Sarah Johnson',
    email: 'sarah@globalwholesale.com',
    phone: '+1-555-0101',
    website: 'www.globalwholesale.com',
    category: 'Grocery',
    status: 'Active',
    rating: 5,
    productsSupplied: 342,
    terms: 'Net 60',
    totalOrders: 156,
    fillRate: 98.5,
    onTimeDelivery: 96.2,
    avgLeadTime: '2.5 days',
    defectRate: 0.8,
  },
  {
    id: 2,
    companyName: 'Premium Health & Wellness Corp',
    contactPerson: 'Michael Chen',
    email: 'michael@premiumhealth.com',
    phone: '+1-555-0102',
    website: 'www.premiumhealth.com',
    category: 'Health',
    status: 'Active',
    rating: 4,
    productsSupplied: 218,
    terms: 'Net 30',
    totalOrders: 89,
    fillRate: 94.3,
    onTimeDelivery: 92.1,
    avgLeadTime: '3.2 days',
    defectRate: 1.2,
  },
  {
    id: 3,
    companyName: 'BeautyHub International',
    contactPerson: 'Emma Rodriguez',
    email: 'emma@beautyhub.com',
    phone: '+1-555-0103',
    website: 'www.beautyhub.com',
    category: 'Beauty',
    status: 'Preferred',
    rating: 5,
    productsSupplied: 412,
    terms: 'Net 45',
    totalOrders: 203,
    fillRate: 99.1,
    onTimeDelivery: 98.8,
    avgLeadTime: '2.1 days',
    defectRate: 0.3,
  },
  {
    id: 4,
    companyName: 'HomeGoods Distributors',
    contactPerson: 'David Kim',
    email: 'david@homegoods.com',
    phone: '+1-555-0104',
    website: 'www.homegoods.com',
    category: 'Home',
    status: 'Active',
    rating: 4,
    productsSupplied: 567,
    terms: 'Net 60',
    totalOrders: 178,
    fillRate: 95.7,
    onTimeDelivery: 93.4,
    avgLeadTime: '3.8 days',
    defectRate: 1.5,
  },
  {
    id: 5,
    companyName: 'TechPro Electronics',
    contactPerson: 'Lisa Wang',
    email: 'lisa@techpro.com',
    phone: '+1-555-0105',
    website: 'www.techpro.com',
    category: 'Electronics',
    status: 'Pending',
    rating: 3,
    productsSupplied: 145,
    terms: 'Prepaid',
    totalOrders: 12,
    fillRate: 87.5,
    onTimeDelivery: 85.0,
    avgLeadTime: '5.2 days',
    defectRate: 2.8,
  },
  {
    id: 6,
    companyName: 'PlayTime Toys Supply',
    contactPerson: 'James Wilson',
    email: 'james@playtime.com',
    phone: '+1-555-0106',
    website: 'www.playtime.com',
    category: 'Toys',
    status: 'Active',
    rating: 4,
    productsSupplied: 289,
    terms: 'Net 30',
    totalOrders: 134,
    fillRate: 92.1,
    onTimeDelivery: 90.5,
    avgLeadTime: '4.1 days',
    defectRate: 1.9,
  },
  {
    id: 7,
    companyName: 'FitAthletics Sports Goods',
    contactPerson: 'Rebecca Brown',
    email: 'rebecca@fitathle.com',
    phone: '+1-555-0107',
    website: 'www.fitathle.com',
    category: 'Sports',
    status: 'Blacklisted',
    rating: 2,
    productsSupplied: 98,
    terms: 'COD',
    totalOrders: 23,
    fillRate: 72.3,
    onTimeDelivery: 68.5,
    avgLeadTime: '7.5 days',
    defectRate: 5.2,
  },
  {
    id: 8,
    companyName: 'Universal Trading Co.',
    contactPerson: 'Thomas Martinez',
    email: 'thomas@universal-trading.com',
    phone: '+1-555-0108',
    website: 'www.universal-trading.com',
    category: 'General',
    status: 'Active',
    rating: 5,
    productsSupplied: 756,
    terms: 'Net 60',
    totalOrders: 267,
    fillRate: 97.8,
    onTimeDelivery: 97.2,
    avgLeadTime: '2.8 days',
    defectRate: 0.6,
  },
];

export default function Suppliers() {
  const [activeTab, setActiveTab] = useState('directory');
  const [token, setToken] = useState('');
  const [suppliers, setSuppliers] = useState(MOCK_SUPPLIERS);
  const [filteredSuppliers, setFilteredSuppliers] = useState(MOCK_SUPPLIERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    category: 'General',
    status: 'Pending',
    terms: 'Net 30',
    notes: '',
  });
  const [performanceSupplier, setPerformanceSupplier] = useState(MOCK_SUPPLIERS[0]);
  const [communicationSupplier, setCommunicationSupplier] = useState(MOCK_SUPPLIERS[0]);
  const [communicationLog, setCommunicationLog] = useState([
    { id: 1, type: 'Call', date: '2025-03-28', text: 'Discussed Q2 inventory requirements' },
    { id: 2, type: 'Email', date: '2025-03-25', text: 'Sent updated product list for approval' },
    { id: 3, type: 'Note', date: '2025-03-20', text: 'Need to negotiate better terms for bulk orders' },
  ]);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [newCommunication, setNewCommunication] = useState({
    type: 'Note',
    text: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const savedToken = localStorage.getItem('ecomera_token');
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    let filtered = suppliers;

    if (searchTerm) {
      filtered = filtered.filter(
        s => s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory) {
      filtered = filtered.filter(s => s.category === filterCategory);
    }

    if (filterStatus) {
      filtered = filtered.filter(s => s.status === filterStatus);
    }

    setFilteredSuppliers(filtered);
  }, [searchTerm, filterCategory, filterStatus, suppliers]);

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const handleAddSupplier = () => {
    const supplierToAdd = {
      id: suppliers.length + 1,
      ...newSupplier,
      rating: 3,
      productsSupplied: 0,
      totalOrders: 0,
      fillRate: 0,
      onTimeDelivery: 0,
      avgLeadTime: '0 days',
      defectRate: 0,
    };
    setSuppliers([...suppliers, supplierToAdd]);
    setShowAddModal(false);
    setNewSupplier({
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      website: '',
      category: 'General',
      status: 'Pending',
      terms: 'Net 30',
      notes: '',
    });
  };

  const handleDeleteSupplier = (id) => {
    setSuppliers(suppliers.filter(s => s.id !== id));
  };

  const handleAddCommunication = () => {
    setCommunicationLog([
      { id: communicationLog.length + 1, type: newCommunication.type, date: newCommunication.date, text: newCommunication.text },
      ...communicationLog,
    ]);
    setNewCommunication({
      type: 'Note',
      text: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Suppliers Management</h1>
          <p style={styles.subtitle}>Manage wholesale suppliers, track performance, and communicate effectively</p>
        </div>

        <div style={styles.tabsContainer}>
          {[
            { id: 'directory', label: 'Supplier Directory' },
            { id: 'performance', label: 'Performance' },
            { id: 'communication', label: 'Communication' },
          ].map(tabItem => (
            <button
              key={tabItem.id}
              style={{
                ...styles.tab,
                ...(activeTab === tabItem.id ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tabItem.id)}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {/* Supplier Directory Tab */}
        <div style={{ ...styles.tabContent, ...(activeTab === 'directory' ? styles.tabContentActive : {}) }}>
          <div style={styles.card}>
            <div style={styles.controlsBar}>
              <input
                style={styles.searchInput}
                type="text"
                placeholder="Search by company name or contact..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <select
                style={styles.select}
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {SUPPLIER_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                style={styles.select}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                {SUPPLIER_STATUS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button
                style={{ ...styles.button, ...styles.buttonPrimary }}
                onClick={() => setShowAddModal(true)}
              >
                + Add Supplier
              </button>
            </div>

            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCell}>Company Name</th>
                  <th style={styles.tableHeaderCell}>Contact Person</th>
                  <th style={styles.tableHeaderCell}>Email</th>
                  <th style={styles.tableHeaderCell}>Category</th>
                  <th style={styles.tableHeaderCell}>Status</th>
                  <th style={styles.tableHeaderCell}>Rating</th>
                  <th style={styles.tableHeaderCell}>Products</th>
                  <th style={styles.tableHeaderCell}>Terms</th>
                  <th style={styles.tableHeaderCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map(supplier => (
                  <tr key={supplier.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <strong>{supplier.companyName}</strong>
                    </td>
                    <td style={styles.tableCell}>{supplier.contactPerson}</td>
                    <td style={styles.tableCell}>{supplier.email}</td>
                    <td style={styles.tableCell}>{supplier.category}</td>
                    <td style={styles.tableCell}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...(supplier.status === 'Active' ? styles.statusActive :
                              supplier.status === 'Pending' ? styles.statusPending :
                              supplier.status === 'Preferred' ? styles.statusPreferred :
                              styles.statusBlacklisted),
                        }}
                      >
                        {supplier.status}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={styles.stars}>{renderStars(supplier.rating)}</span>
                    </td>
                    <td style={styles.tableCell}>{supplier.productsSupplied}</td>
                    <td style={styles.tableCell}>{supplier.terms}</td>
                    <td style={styles.tableCell}>
                      <div style={styles.actions}>
                        <button
                          style={styles.actionBtn}
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            setActiveTab('performance');
                            setPerformanceSupplier(supplier);
                          }}
                        >
                          View
                        </button>
                        <button
                          style={styles.actionBtn}
                          onClick={() => handleDeleteSupplier(supplier.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredSuppliers.length === 0 && (
              <div style={{ textAlign: 'center', color: '#666666', padding: '32px' }}>
                No suppliers found matching your filters
              </div>
            )}
          </div>
        </div>

        {/* Performance Tab */}
        <div style={{ ...styles.tabContent, ...(activeTab === 'performance' ? styles.tabContentActive : {}) }}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Performance Metrics</div>
            <div>
              <label style={styles.label}>Select Supplier</label>
              <select
                style={styles.select}
                value={performanceSupplier.id}
                onChange={e => setPerformanceSupplier(suppliers.find(s => s.id === parseInt(e.target.value)))}
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.companyName}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.metricGrid}>
              <div style={styles.metricCard}>
                <div style={styles.metricValue}>{performanceSupplier.totalOrders}</div>
                <div style={styles.metricLabel}>Total Orders</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricValue}>{performanceSupplier.fillRate}%</div>
                <div style={styles.metricLabel}>Fill Rate</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricValue}>{performanceSupplier.onTimeDelivery}%</div>
                <div style={styles.metricLabel}>On-time Delivery</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricValue}>{performanceSupplier.avgLeadTime}</div>
                <div style={styles.metricLabel}>Avg Lead Time</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricValue}>{performanceSupplier.defectRate}%</div>
                <div style={styles.metricLabel}>Defect Rate</div>
              </div>
            </div>

            <div style={styles.chartContainer}>
              <div style={styles.cardTitle}>Order Volume Trend</div>
              <svg width="100%" height="150" viewBox="0 0 600 150">
                <rect x="50" y="20" width="40" height="80" fill="#FFD700" opacity="0.8" />
                <rect x="110" y="40" width="40" height="60" fill="#FFD700" opacity="0.8" />
                <rect x="170" y="35" width="40" height="65" fill="#FFD700" opacity="0.8" />
                <rect x="230" y="25" width="40" height="75" fill="#FFD700" opacity="0.8" />
                <rect x="290" y="45" width="40" height="55" fill="#FFD700" opacity="0.8" />
                <rect x="350" y="30" width="40" height="70" fill="#FFD700" opacity="0.8" />
                <rect x="410" y="50" width="40" height="50" fill="#FFD700" opacity="0.8" />
                <text x="75" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 1</text>
                <text x="135" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 2</text>
                <text x="195" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 3</text>
                <text x="255" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 4</text>
                <text x="315" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 5</text>
                <text x="375" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 6</text>
                <text x="435" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 7</text>
              </svg>
            </div>

            <div style={styles.chartContainer}>
              <div style={styles.cardTitle}>Fill Rate Trend</div>
              <svg width="100%" height="150" viewBox="0 0 600 150">
                <polyline points="50,30 110,25 170,35 230,20 290,40 350,25 410,45" fill="none" stroke="#FFD700" strokeWidth="2" />
                <circle cx="50" cy="30" r="4" fill="#FFD700" />
                <circle cx="110" cy="25" r="4" fill="#FFD700" />
                <circle cx="170" cy="35" r="4" fill="#FFD700" />
                <circle cx="230" cy="20" r="4" fill="#FFD700" />
                <circle cx="290" cy="40" r="4" fill="#FFD700" />
                <circle cx="350" cy="25" r="4" fill="#FFD700" />
                <circle cx="410" cy="45" r="4" fill="#FFD700" />
                <text x="75" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 1</text>
                <text x="135" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 2</text>
                <text x="195" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 3</text>
                <text x="255" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 4</text>
                <text x="315" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 5</text>
                <text x="375" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 6</text>
                <text x="435" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 7</text>
              </svg>
            </div>

            <div style={styles.chartContainer}>
              <div style={styles.cardTitle}>Cost Per Unit Trend</div>
              <svg width="100%" height="150" viewBox="0 0 600 150">
                <polyline points="50,50 110,48 170,52 230,46 290,55 350,49 410,54" fill="none" stroke="#FFD700" strokeWidth="2" />
                <circle cx="50" cy="50" r="4" fill="#FFD700" />
                <circle cx="110" cy="48" r="4" fill="#FFD700" />
                <circle cx="170" cy="52" r="4" fill="#FFD700" />
                <circle cx="230" cy="46" r="4" fill="#FFD700" />
                <circle cx="290" cy="55" r="4" fill="#FFD700" />
                <circle cx="350" cy="49" r="4" fill="#FFD700" />
                <circle cx="410" cy="54" r="4" fill="#FFD700" />
                <text x="75" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 1</text>
                <text x="135" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 2</text>
                <text x="195" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 3</text>
                <text x="255" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 4</text>
                <text x="315" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 5</text>
                <text x="375" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 6</text>
                <text x="435" y="130" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Week 7</text>
              </svg>
            </div>

            <div style={styles.gaugeContainer}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#1E1E1E" strokeWidth="8" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#FFD700" strokeWidth="8" strokeDasharray={`${Math.PI * 100 * (performanceSupplier.fillRate / 100)} 314.159`} />
                <text x="60" y="65" textAnchor="middle" style={{ fill: '#FFFFFF', fontSize: '24px', fontWeight: '700' }}>
                  {Math.round(performanceSupplier.fillRate)}
                </text>
                <text x="60" y="80" textAnchor="middle" style={{ fill: '#666666', fontSize: '12px' }}>Score</text>
              </svg>
              <div style={styles.gaugeLabel}>
                <div style={styles.gaugeText}>
                  <strong>Performance Score</strong>
                </div>
                <div style={styles.gaugeText}>
                  Based on fill rate, on-time delivery, and defect rate metrics
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Communication Tab */}
        <div style={{ ...styles.tabContent, ...(activeTab === 'communication' ? styles.tabContentActive : {}) }}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Select Supplier</div>
            <select
              style={styles.select}
              value={communicationSupplier.id}
              onChange={e => setCommunicationSupplier(suppliers.find(s => s.id === parseInt(e.target.value)))}
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.companyName}</option>
              ))}
            </select>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Communication Log</div>
            <div style={styles.timeline}>
              {communicationLog.map((entry, idx) => (
                <div
                  key={entry.id}
                  style={{
                    ...styles.timelineItem,
                    ...(idx === communicationLog.length - 1 ? styles.timelineItemLast : {}),
                  }}
                >
                  <div style={styles.timelineDate}>{entry.date}</div>
                  <div style={styles.timelineText}>
                    <span style={styles.timelineType}>{entry.type}</span>
                    {entry.text}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #1E1E1E', paddingTop: '20px', marginTop: '20px' }}>
              <div style={styles.cardTitle}>Add New Entry</div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Type</label>
                <select
                  style={styles.select}
                  value={newCommunication.type}
                  onChange={e => setNewCommunication({ ...newCommunication, type: e.target.value })}
                >
                  <option value="Note">Note</option>
                  <option value="Call">Call</option>
                  <option value="Email">Email</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Date</label>
                <input
                  style={styles.input}
                  type="date"
                  value={newCommunication.date}
                  onChange={e => setNewCommunication({ ...newCommunication, date: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Message</label>
                <textarea
                  style={styles.textarea}
                  value={newCommunication.text}
                  onChange={e => setNewCommunication({ ...newCommunication, text: e.target.value })}
                  placeholder="Enter your note, call summary, or email details..."
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  style={{ ...styles.button, ...styles.buttonPrimary }}
                  onClick={handleAddCommunication}
                >
                  Add Entry
                </button>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Schedule Follow-up</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Follow-up Date</label>
              <input
                style={styles.input}
                type="date"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Reminder</label>
              <select style={styles.select}>
                <option value="email">Email Reminder</option>
                <option value="notification">App Notification</option>
                <option value="both">Both</option>
              </select>
            </div>
            <button style={{ ...styles.button, ...styles.buttonSecondary }}>
              Schedule Follow-up
            </button>
          </div>
        </div>

        {/* Add Supplier Modal */}
        <div style={{ ...styles.modal, ...(showAddModal ? styles.modalActive : {}) }}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <span>Add New Supplier</span>
              <button
                style={styles.closeBtn}
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Company Name</label>
              <input
                style={styles.input}
                type="text"
                value={newSupplier.companyName}
                onChange={e => setNewSupplier({ ...newSupplier, companyName: e.target.value })}
                placeholder="e.g., Global Wholesale Foods"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Contact Person</label>
              <input
                style={styles.input}
                type="text"
                value={newSupplier.contactPerson}
                onChange={e => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                placeholder="Full name"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                type="email"
                value={newSupplier.email}
                onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })}
                placeholder="contact@company.com"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Phone</label>
              <input
                style={styles.input}
                type="tel"
                value={newSupplier.phone}
                onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                placeholder="+1-555-0000"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Website</label>
              <input
                style={styles.input}
                type="url"
                value={newSupplier.website}
                onChange={e => setNewSupplier({ ...newSupplier, website: e.target.value })}
                placeholder="www.example.com"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Category</label>
              <select
                style={styles.select}
                value={newSupplier.category}
                onChange={e => setNewSupplier({ ...newSupplier, category: e.target.value })}
              >
                {SUPPLIER_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <select
                style={styles.select}
                value={newSupplier.status}
                onChange={e => setNewSupplier({ ...newSupplier, status: e.target.value })}
              >
                {SUPPLIER_STATUS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Terms</label>
              <select
                style={styles.select}
                value={newSupplier.terms}
                onChange={e => setNewSupplier({ ...newSupplier, terms: e.target.value })}
              >
                {TERMS_OPTIONS.map(term => (
                  <option key={term} value={term}>{term}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Notes</label>
              <textarea
                style={styles.textarea}
                value={newSupplier.notes}
                onChange={e => setNewSupplier({ ...newSupplier, notes: e.target.value })}
                placeholder="Any additional notes about this supplier..."
              />
            </div>

            <div style={styles.modalActions}>
              <button
                style={{ ...styles.button, ...styles.buttonPrimary }}
                onClick={handleAddSupplier}
              >
                Add Supplier
              </button>
              <button
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
