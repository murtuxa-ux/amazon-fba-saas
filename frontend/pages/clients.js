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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#A0A0A0',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid #1E1E1E',
    marginBottom: '32px',
    overflowX: 'auto',
  },
  tab: {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#A0A0A0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    color: '#FFD700',
    borderBottomColor: '#FFD700',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  kpiCard: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
  },
  kpiLabel: {
    fontSize: '12px',
    color: '#A0A0A0',
    fontWeight: '500',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  kpiValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#FFD700',
  },
  kpiSubtext: {
    fontSize: '12px',
    color: '#606060',
    marginTop: '8px',
  },
  controlBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '10px 14px',
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
  },
  select: {
    padding: '10px 14px',
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
    cursor: 'pointer',
  },
  button: {
    padding: '10px 16px',
    backgroundColor: '#FFD700',
    border: 'none',
    borderRadius: '6px',
    color: '#0A0A0A',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  buttonSecondary: {
    padding: '10px 16px',
    backgroundColor: '#1E1E1E',
    border: '1px solid #2E2E2E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontWeight: '500',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  clientGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  clientCard: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '20px',
    transition: 'all 0.2s',
  },
  clientCardHover: {
    borderColor: '#FFD700',
    boxShadow: '0 0 20px rgba(255, 215, 0, 0.1)',
  },
  clientName: {
    fontSize: '16px',
    fontWeight: '700',
    marginBottom: '12px',
    color: '#FFD700',
  },
  clientInfo: {
    fontSize: '13px',
    color: '#A0A0A0',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    marginTop: '12px',
  },
  badgeActive: {
    backgroundColor: 'rgba(100, 200, 100, 0.2)',
    color: '#64C864',
  },
  badgeOnboarding: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    color: '#FFD700',
  },
  badgePaused: {
    backgroundColor: 'rgba(160, 160, 160, 0.2)',
    color: '#A0A0A0',
  },
  badgeChurned: {
    backgroundColor: 'rgba(200, 100, 100, 0.2)',
    color: '#C86464',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  },
  tableHeader: {
    backgroundColor: '#111111',
    borderBottom: '1px solid #1E1E1E',
    padding: '12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#A0A0A0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tableCell: {
    padding: '12px',
    borderBottom: '1px solid #1E1E1E',
    fontSize: '13px',
  },
  tableRow: {
    transition: 'background-color 0.2s',
  },
  tableRowHover: {
    backgroundColor: '#111111',
  },
  modal: {
    display: 'fixed',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '32px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '20px',
    color: '#FFD700',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '6px',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
    minHeight: '100px',
    fontFamily: 'inherit',
  },
  modalFooter: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  timelineItem: {
    padding: '16px',
    borderLeft: '2px solid #1E1E1E',
    marginLeft: '12px',
    marginBottom: '16px',
    paddingLeft: '20px',
  },
  timelineDate: {
    fontSize: '11px',
    color: '#FFD700',
    fontWeight: '600',
    marginBottom: '4px',
  },
  timelineType: {
    fontSize: '12px',
    color: '#A0A0A0',
    marginBottom: '8px',
  },
  timelineContent: {
    fontSize: '13px',
    color: '#FFFFFF',
  },
  checklistItem: {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#0A0A0A',
    borderRadius: '6px',
    marginBottom: '12px',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginTop: '4px',
    cursor: 'pointer',
    width: '18px',
    height: '18px',
    accentColor: '#FFD700',
  },
  checklistContent: {
    flex: 1,
  },
  checklistLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: '4px',
  },
  checklistDate: {
    fontSize: '11px',
    color: '#A0A0A0',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#0A0A0A',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    transition: 'width 0.3s',
  },
  contractCard: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  contractHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  contractTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#FFD700',
  },
  contractStatus: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '4px',
    backgroundColor: 'rgba(100, 200, 100, 0.2)',
    color: '#64C864',
  },
  contractInfo: {
    fontSize: '12px',
    color: '#A0A0A0',
    marginBottom: '6px',
  },
  selectOption: {
    color: '#0A0A0A',
  },
};

// Mock data
const mockClients = [
  {
    id: 1,
    name: 'HMS Group',
    contact: 'John Mitchell',
    email: 'john@hmsgroup.com',
    phone: '(555) 123-4567',
    serviceType: 'Both',
    monthlyBudget: 5000,
    status: 'Active',
    joinedDate: '2023-06-15',
    accountManager: 'Sarah Chen',
  },
  {
    id: 2,
    name: 'Crescent Innovations',
    contact: 'Maria Rodriguez',
    email: 'maria@crescent.com',
    phone: '(555) 234-5678',
    serviceType: 'PL',
    monthlyBudget: 8000,
    status: 'Active',
    joinedDate: '2023-08-22',
    accountManager: 'David Park',
  },
  {
    id: 3,
    name: 'BrightPath Solutions',
    contact: 'Alex Thompson',
    email: 'alex@brightpath.com',
    phone: '(555) 345-6789',
    serviceType: 'Wholesale',
    monthlyBudget: 3500,
    status: 'Onboarding',
    joinedDate: '2024-02-10',
    accountManager: 'Emily Watson',
  },
  {
    id: 4,
    name: 'Wise Buys Ltd',
    contact: 'Jessica Allen',
    email: 'jessica@wisebuys.com',
    phone: '(555) 456-7890',
    serviceType: 'Both',
    monthlyBudget: 6500,
    status: 'Active',
    joinedDate: '2023-11-05',
    accountManager: 'Sarah Chen',
  },
  {
    id: 5,
    name: 'Red Peacock Brands',
    contact: 'Marcus Coleman',
    email: 'marcus@redpeacock.com',
    phone: '(555) 567-8901',
    serviceType: 'PL',
    monthlyBudget: 7200,
    status: 'Paused',
    joinedDate: '2023-09-18',
    accountManager: 'David Park',
  },
];

const mockPerformanceData = {
  1: {
    revenue: [8500, 9200, 8800, 10500, 11200, 12000],
    profit: [2100, 2300, 2200, 2800, 3200, 3600],
    orders: [245, 268, 251, 302, 356, 398],
    metrics: {
      revenue: 64200,
      cogs: 38500,
      profit: 16100,
      margin: 25.1,
      orders: 1720,
      units: 4850,
      acos: 18.5,
      tacos: 23.2,
    },
  },
  2: {
    revenue: [12000, 12800, 13500, 14200, 15100, 16500],
    profit: [3600, 3900, 4200, 4500, 4900, 5400],
    orders: [380, 410, 445, 480, 520, 580],
    metrics: {
      revenue: 84100,
      cogs: 42000,
      profit: 26200,
      margin: 31.1,
      orders: 2815,
      units: 8900,
      acos: 16.2,
      tacos: 19.8,
    },
  },
};

const mockCommunication = {
  1: [
    { id: 1, type: 'Note', content: 'Discussed new product listings and Q2 strategy', date: '2024-03-25', person: 'Sarah Chen' },
    { id: 2, type: 'Call', content: 'Monthly business review - all metrics on track', date: '2024-03-18', person: 'Sarah Chen' },
    { id: 3, type: 'Email', content: 'Sent performance report and recommendations', date: '2024-03-10', person: 'Sarah Chen' },
    { id: 4, type: 'Meeting', content: 'Strategy session for summer campaign', date: '2024-03-01', person: 'Sarah Chen' },
  ],
  2: [
    { id: 1, type: 'Call', content: 'Quarterly business review', date: '2024-03-22', person: 'David Park' },
    { id: 2, type: 'Note', content: 'Identified new market opportunities', date: '2024-03-15', person: 'David Park' },
  ],
};

const mockContracts = [
  { id: 1, client: 'HMS Group', service: 'Full-Service PPC', monthlyFee: 5000, startDate: '2023-06-15', endDate: '2025-06-15', status: 'Active' },
  { id: 2, client: 'Crescent Innovations', service: 'Premium Bundle', monthlyFee: 8000, startDate: '2023-08-22', endDate: '2025-08-22', status: 'Active' },
  { id: 3, client: 'BrightPath Solutions', service: 'Starter Package', monthlyFee: 3500, startDate: '2024-02-10', endDate: '2024-08-10', status: 'Expiring' },
  { id: 4, client: 'Wise Buys Ltd', service: 'Full-Service PPC', monthlyFee: 6500, startDate: '2023-11-05', endDate: '2025-11-05', status: 'Active' },
  { id: 5, client: 'Red Peacock Brands', service: 'Premium Bundle', monthlyFee: 7200, startDate: '2023-09-18', endDate: '2024-09-18', status: 'Expired' },
];

const mockInvoices = [
  { id: 'INV-2024-001', client: 'HMS Group', amount: 5000, date: '2024-03-01', status: 'Paid', dueDate: '2024-03-15' },
  { id: 'INV-2024-002', client: 'Crescent Innovations', amount: 8000, date: '2024-03-01', status: 'Paid', dueDate: '2024-03-15' },
  { id: 'INV-2024-003', client: 'Wise Buys Ltd', amount: 6500, date: '2024-03-01', status: 'Pending', dueDate: '2024-03-15' },
  { id: 'INV-2024-004', client: 'BrightPath Solutions', amount: 3500, date: '2024-02-15', status: 'Overdue', dueDate: '2024-03-01' },
  { id: 'INV-2024-005', client: 'Red Peacock Brands', amount: 7200, date: '2024-02-01', status: 'Overdue', dueDate: '2024-02-15' },
];

const mockOnboarding = {
  1: [
    { step: 1, title: 'Welcome call', completed: true, assigned: 'Sarah Chen', dueDate: '2023-06-20', notes: 'Discussed goals and expectations' },
    { step: 2, title: 'Amazon access', completed: true, assigned: 'Sarah Chen', dueDate: '2023-06-25', notes: 'Seller Central access granted' },
    { step: 3, title: 'Store audit', completed: true, assigned: 'Sarah Chen', dueDate: '2023-07-05', notes: 'Audit report sent' },
    { step: 4, title: 'Strategy deck', completed: true, assigned: 'Sarah Chen', dueDate: '2023-07-15', notes: 'Approved by client' },
    { step: 5, title: 'First PO/Listing', completed: true, assigned: 'Sarah Chen', dueDate: '2023-08-01', notes: '' },
    { step: 6, title: 'Training', completed: true, assigned: 'Sarah Chen', dueDate: '2023-08-10', notes: '' },
    { step: 7, title: 'Go-live', completed: true, assigned: 'Sarah Chen', dueDate: '2023-08-20', notes: '' },
    { step: 8, title: '30-day review', completed: true, assigned: 'Sarah Chen', dueDate: '2023-09-20', notes: '' },
  ],
  3: [
    { step: 1, title: 'Welcome call', completed: true, assigned: 'Emily Watson', dueDate: '2024-02-15', notes: 'Initial onboarding call completed' },
    { step: 2, title: 'Amazon access', completed: true, assigned: 'Emily Watson', dueDate: '2024-02-20', notes: 'Access configured' },
    { step: 3, title: 'Store audit', completed: true, assigned: 'Emily Watson', dueDate: '2024-03-05', notes: 'Audit in progress' },
    { step: 4, title: 'Strategy deck', completed: false, assigned: 'Emily Watson', dueDate: '2024-03-20', notes: '' },
    { step: 5, title: 'First PO/Listing', completed: false, assigned: 'Emily Watson', dueDate: '2024-04-05', notes: '' },
    { step: 6, title: 'Training', completed: false, assigned: 'Emily Watson', dueDate: '2024-04-15', notes: '' },
    { step: 7, title: 'Go-live', completed: false, assigned: 'Emily Watson', dueDate: '2024-05-01', notes: '' },
    { step: 8, title: '30-day review', completed: false, assigned: 'Emily Watson', dueDate: '2024-06-01', notes: '' },
  ],
};

function ClientOverviewTab() {
  const [clients, setClients] = useState(mockClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    serviceType: 'Both',
    monthlyBudget: 0,
    status: 'Onboarding',
    accountManager: '',
  });
  const [hoveredCard, setHoveredCard] = useState(null);

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesService = serviceFilter === 'All' || client.serviceType === serviceFilter;
    const matchesStatus = statusFilter === 'All' || client.status === statusFilter;
    return matchesSearch && matchesService && matchesStatus;
  });

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === 'Active').length;
  const monthlyRevenue = clients.reduce((sum, c) => sum + c.monthlyBudget, 0);
  const avgLifetime = Math.round(monthlyRevenue / totalClients);

  const handleAddClient = () => {
    if (newClient.name && newClient.contact && newClient.email) {
      setClients([
        ...clients,
        {
          id: clients.length + 1,
          ...newClient,
          joinedDate: new Date().toISOString().split('T')[0],
        },
      ]);
      setNewClient({
        name: '',
        contact: '',
        email: '',
        phone: '',
        serviceType: 'Both',
        monthlyBudget: 0,
        status: 'Onboarding',
        accountManager: '',
      });
      setShowModal(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Active':
        return styles.badgeActive;
      case 'Onboarding':
        return styles.badgeOnboarding;
      case 'Paused':
        return styles.badgePaused;
      case 'Churned':
        return styles.badgeChurned;
      default:
        return {};
    }
  };

  return (
    <div>
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Total Clients</div>
          <div style={styles.kpiValue}>{totalClients}</div>
          <div style={styles.kpiSubtext}>All time</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Active Clients</div>
          <div style={styles.kpiValue}>{activeClients}</div>
          <div style={styles.kpiSubtext}>{((activeClients / totalClients) * 100).toFixed(1)}% of total</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Monthly Revenue</div>
          <div style={styles.kpiValue}>${(monthlyRevenue / 1000).toFixed(1)}k</div>
          <div style={styles.kpiSubtext}>MRR</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Avg Client Lifetime</div>
          <div style={styles.kpiValue}>${avgLifetime / 1000}</div>
          <div style={styles.kpiSubtext}>Monthly average</div>
        </div>
      </div>

      <div style={styles.controlBar}>
        <input
          type="text"
          placeholder="Search by name, contact, or email..."
          style={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select style={styles.select} value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
          <option style={styles.selectOption}>All Services</option>
          <option style={styles.selectOption}>Wholesale</option>
          <option style={styles.selectOption}>PL</option>
          <option style={styles.selectOption}>Both</option>
        </select>
        <select style={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option style={styles.selectOption}>All Status</option>
          <option style={styles.selectOption}>Active</option>
          <option style={styles.selectOption}>Onboarding</option>
          <option style={styles.selectOption}>Paused</option>
          <option style={styles.selectOption}>Churned</option>
        </select>
        <button style={styles.button} onClick={() => setShowModal(true)}>
          + Add Client
        </button>
      </div>

      <div style={styles.clientGrid}>
        {filteredClients.map((client) => (
          <div
            key={client.id}
            style={{
              ...styles.clientCard,
              ...(hoveredCard === client.id ? styles.clientCardHover : {}),
            }}
            onMouseEnter={() => setHoveredCard(client.id)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.clientName}>{client.name}</div>
            <div style={styles.clientInfo}>
              <div>
                <div style={{ fontWeight: '500' }}>{client.contact}</div>
                <div>{client.email}</div>
                <div>{client.phone}</div>
              </div>
            </div>
            <div style={styles.clientInfo}>
              <span>Service: {client.serviceType}</span>
            </div>
            <div style={styles.clientInfo}>
              <span>Budget: ${client.monthlyBudget.toLocaleString()}/mo</span>
            </div>
            <div style={styles.clientInfo}>
              <span>Manager: {client.accountManager}</span>
            </div>
            <div style={styles.clientInfo}>
              <span>Joined: {new Date(client.joinedDate).toLocaleDateString()}</span>
            </div>
            <div style={{ ...styles.badge, ...getStatusBadgeStyle(client.status) }}>{client.status}</div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>Add New Client</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Company Name</label>
              <input
                type="text"
                style={styles.input}
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Contact Person</label>
              <input
                type="text"
                style={styles.input}
                value={newClient.contact}
                onChange={(e) => setNewClient({ ...newClient, contact: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                style={styles.input}
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Phone</label>
              <input
                type="tel"
                style={styles.input}
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Service Type</label>
              <select
                style={styles.select}
                value={newClient.serviceType}
                onChange={(e) => setNewClient({ ...newClient, serviceType: e.target.value })}
              >
                <option style={styles.selectOption}>Wholesale</option>
                <option style={styles.selectOption}>PL</option>
                <option style={styles.selectOption}>Both</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Monthly Budget</label>
              <input
                type="number"
                style={styles.input}
                value={newClient.monthlyBudget}
                onChange={(e) => setNewClient({ ...newClient, monthlyBudget: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Account Manager</label>
              <input
                type="text"
                style={styles.input}
                value={newClient.accountManager}
                onChange={(e) => setNewClient({ ...newClient, accountManager: e.target.value })}
              />
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.buttonSecondary} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button style={styles.button} onClick={handleAddClient}>
                Add Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientPerformanceTab() {
  const [selectedClient, setSelectedClient] = useState(1);
  const clientOptions = mockClients.map((c) => ({ id: c.id, name: c.name }));
  const data = mockPerformanceData[selectedClient] || mockPerformanceData[1];
  const metrics = data.metrics;

  const maxRevenue = Math.max(...data.revenue);
  const maxProfit = Math.max(...data.profit);
  const maxOrders = Math.max(...data.orders);

  const revenueChartHeight = 200;
  const chartWidth = 600;
  const pointSpacing = chartWidth / (data.revenue.length - 1);

  const revenuePoints = data.revenue
    .map((val, idx) => ({
      x: idx * pointSpacing,
      y: revenueChartHeight - (val / maxRevenue) * (revenueChartHeight - 30),
    }))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  const profitPoints = data.profit
    .map((val, idx) => ({
      x: idx * pointSpacing,
      y: revenueChartHeight - (val / maxProfit) * (revenueChartHeight - 30),
    }))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const roiPercentage = ((metrics.profit / metrics.cogs) * 100).toFixed(1);

  return (
    <div>
      <div style={styles.controlBar}>
        <select
          style={styles.select}
          value={selectedClient}
          onChange={(e) => setSelectedClient(parseInt(e.target.value))}
        >
          {clientOptions.map((client) => (
            <option key={client.id} value={client.id} style={styles.selectOption}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {/* Revenue Trend */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Revenue Trend (6 Months)</div>
          <svg width="100%" height="220" viewBox="0 0 600 220" style={{ marginTop: '12px' }}>
            <polyline
              points={revenuePoints}
              fill="none"
              stroke="#FFD700"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
            {data.revenue.map((val, idx) => (
              <circle
                key={idx}
                cx={idx * pointSpacing}
                cy={revenueChartHeight - (val / maxRevenue) * (revenueChartHeight - 30)}
                r="4"
                fill="#FFD700"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {months.map((month, idx) => (
              <text key={idx} x={idx * pointSpacing} y="210" textAnchor="middle" fontSize="11" fill="#A0A0A0">
                {month}
              </text>
            ))}
          </svg>
        </div>

        {/* Profit Trend */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Profit Trend (6 Months)</div>
          <svg width="100%" height="220" viewBox="0 0 600 220" style={{ marginTop: '12px' }}>
            <polyline
              points={profitPoints}
              fill="none"
              stroke="#64C864"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
            {data.profit.map((val, idx) => (
              <circle
                key={idx}
                cx={idx * pointSpacing}
                cy={revenueChartHeight - (val / maxProfit) * (revenueChartHeight - 30)}
                r="4"
                fill="#64C864"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {months.map((month, idx) => (
              <text key={idx} x={idx * pointSpacing} y="210" textAnchor="middle" fontSize="11" fill="#A0A0A0">
                {month}
              </text>
            ))}
          </svg>
        </div>

        {/* Monthly Orders Bar Chart */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Monthly Orders</div>
          <svg width="100%" height="220" viewBox="0 0 600 220" style={{ marginTop: '12px' }}>
            {data.orders.map((orders, idx) => {
              const barHeight = (orders / maxOrders) * 150;
              const barWidth = 60;
              const barX = 40 + idx * 100;
              const barY = 170 - barHeight;
              return (
                <g key={idx}>
                  <rect x={barX} y={barY} width={barWidth} height={barHeight} fill="#FFD700" opacity="0.8" />
                  <text x={barX + barWidth / 2} y="210" textAnchor="middle" fontSize="11" fill="#A0A0A0">
                    {months[idx]}
                  </text>
                  <text x={barX + barWidth / 2} y={barY - 5} textAnchor="middle" fontSize="10" fill="#FFD700">
                    {orders}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* ROI Gauge */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>ROI</div>
          <svg width="100%" height="180" viewBox="0 0 220 180" style={{ marginTop: '12px' }}>
            <circle cx="110" cy="110" r="80" fill="none" stroke="#1E1E1E" strokeWidth="8" />
            <circle
              cx="110"
              cy="110"
              r="80"
              fill="none"
              stroke="#FFD700"
              strokeWidth="8"
              strokeDasharray={`${(parseFloat(roiPercentage) / 100) * 502.65} 502.65`}
              strokeDashoffset="0"
              transform="rotate(-90 110 110)"
            />
            <text x="110" y="120" textAnchor="middle" fontSize="32" fontWeight="700" fill="#FFD700">
              {roiPercentage}%
            </text>
          </svg>
        </div>
      </div>

      {/* Performance Metrics Table */}
      <div style={styles.kpiCard}>
        <div style={styles.kpiLabel}>Performance Metrics</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.tableHeader}>Metric</th>
              <th style={styles.tableHeader}>Current</th>
              <th style={styles.tableHeader}>vs Previous</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tableCell}>Revenue</td>
              <td style={styles.tableCell}>${metrics.revenue.toLocaleString()}</td>
              <td style={{ ...styles.tableCell, color: '#64C864' }}>+12.5% ↑</td>
            </tr>
            <tr>
              <td style={styles.tableCell}>COGS</td>
              <td style={styles.tableCell}>${metrics.cogs.toLocaleString()}</td>
              <td style={{ ...styles.tableCell, color: '#C86464' }}>+8.2% ↑</td>
            </tr>
            <tr>
              <td style={styles.tableCell}>Profit</td>
              <td style={styles.tableCell}>${metrics.profit.toLocaleString()}</td>
              <td style={{ ...styles.tableCell, color: '#64C864' }}>+15.8% ↑</td>
            </tr>
            <tr>
              <td style={styles.tableCell}>Profit Margin</td>
              <td style={styles.tableCell}>{metrics.margin.toFixed(1)}%</td>
              <td style={{ ...styles.tableCell, color: '#64C864' }}>+2.1% ↑</td>
            </tr>
            <tr>
              <td style={styles.tableCell}>Orders</td>
              <td style={styles.tableCell}>{metrics.orders}</td>
              <td style={{ ...styles.tableCell, color: '#64C864' }}>+18.3% ↑</td>
            </tr>
            <tr>
              <td style={styles.tableCell}>Units Sold</td>
              <td style={styles.tableCell}>{metrics.units.toLocaleString()}</td>
              <td style={{ ...styles.tableCell, color: '#64C864' }}>+16.7% ↑</td>
            </tr>
            <tr>
              <td style={styles.tableCell}>ACoS</td>
              <td style={styles.tableCell}>{metrics.acos.toFixed(1)}%</td>
              <td style={{ ...styles.tableCell, color: '#64C864' }}>-1.3% ↓</td>
            </tr>
            <tr>
              <td style={styles.tableCell}>TACoS</td>
              <td style={styles.tableCell}>{metrics.tacos.toFixed(1)}%</td>
              <td style={{ ...styles.tableCell, color: '#64C864' }}>-1.8% ↓</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommunicationTab() {
  const [selectedClient, setSelectedClient] = useState(1);
  const [activityFilter, setActivityFilter] = useState('All');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteData, setNoteData] = useState({ type: 'Note', content: '', followUpDate: '' });
  const [activities, setActivities] = useState(mockCommunication[1] || []);

  const clientOptions = mockClients.map((c) => ({ id: c.id, name: c.name }));

  const handleClientChange = (clientId) => {
    setSelectedClient(clientId);
    setActivities(mockCommunication[clientId] || []);
  };

  const filteredActivities =
    activityFilter === 'All' ? activities : activities.filter((a) => a.type === activityFilter);

  const handleAddNote = () => {
    if (noteData.content) {
      setActivities([
        {
          id: activities.length + 1,
          type: noteData.type,
          content: noteData.content,
          date: new Date().toISOString().split('T')[0],
          person: 'Current User',
        },
        ...activities,
      ]);
      setNoteData({ type: 'Note', content: '', followUpDate: '' });
      setShowNoteModal(false);
    }
  };

  return (
    <div>
      <div style={styles.controlBar}>
        <select style={styles.select} value={selectedClient} onChange={(e) => handleClientChange(parseInt(e.target.value))}>
          {clientOptions.map((client) => (
            <option key={client.id} value={client.id} style={styles.selectOption}>
              {client.name}
            </option>
          ))}
        </select>
        <select style={styles.select} value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)}>
          <option style={styles.selectOption}>All Types</option>
          <option style={styles.selectOption}>Note</option>
          <option style={styles.selectOption}>Call</option>
          <option style={styles.selectOption}>Email</option>
          <option style={styles.selectOption}>Meeting</option>
        </select>
        <button style={styles.button} onClick={() => setShowNoteModal(true)}>
          + Add Note
        </button>
      </div>

      <div style={styles.kpiCard}>
        <div style={styles.kpiLabel}>Activity Timeline</div>
        {filteredActivities.length === 0 ? (
          <div style={{ padding: '20px', color: '#A0A0A0', textAlign: 'center' }}>No activities found</div>
        ) : (
          filteredActivities.map((activity) => (
            <div key={activity.id} style={styles.timelineItem}>
              <div style={styles.timelineDate}>{new Date(activity.date).toLocaleDateString()}</div>
              <div style={styles.timelineType}>{activity.type}</div>
              <div style={styles.timelineContent}>{activity.content}</div>
              <div style={{ fontSize: '11px', color: '#606060', marginTop: '8px' }}>by {activity.person}</div>
            </div>
          ))
        )}
      </div>

      {showNoteModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>Add Activity Note</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Type</label>
              <select
                style={styles.select}
                value={noteData.type}
                onChange={(e) => setNoteData({ ...noteData, type: e.target.value })}
              >
                <option style={styles.selectOption}>Note</option>
                <option style={styles.selectOption}>Call</option>
                <option style={styles.selectOption}>Email</option>
                <option style={styles.selectOption}>Meeting</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Content</label>
              <textarea
                style={styles.textarea}
                value={noteData.content}
                onChange={(e) => setNoteData({ ...noteData, content: e.target.value })}
                placeholder="Enter activity details..."
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Follow-up Date (Optional)</label>
              <input
                type="date"
                style={styles.input}
                value={noteData.followUpDate}
                onChange={(e) => setNoteData({ ...noteData, followUpDate: e.target.value })}
              />
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.buttonSecondary} onClick={() => setShowNoteModal(false)}>
                Cancel
              </button>
              <button style={styles.button} onClick={handleAddNote}>
                Add Activity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContractsAndBillingTab() {
  const [contracts, setContracts] = useState(mockContracts);
  const [invoices, setInvoices] = useState(mockInvoices);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState({ client: '', amount: 0, description: '' });

  const revenueByClient = mockClients
    .map((c) => ({
      name: c.name,
      revenue: c.monthlyBudget,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const maxRevenue = Math.max(...revenueByClient.map((c) => c.revenue));
  const chartHeight = 40;

  const handleAddInvoice = () => {
    if (invoiceData.client && invoiceData.amount > 0) {
      const newInvoice = {
        id: `INV-2024-${String(invoices.length + 1).padStart(3, '0')}`,
        client: invoiceData.client,
        amount: invoiceData.amount,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };
      setInvoices([newInvoice, ...invoices]);
      setInvoiceData({ client: '', amount: 0, description: '' });
      setShowInvoiceModal(false);
    }
  };

  const overdueInvoices = invoices.filter((inv) => inv.status === 'Overdue');

  return (
    <div>
      {overdueInvoices.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(200, 100, 100, 0.1)',
            border: '1px solid rgba(200, 100, 100, 0.3)',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '24px',
            color: '#C86464',
            fontSize: '13px',
          }}
        >
          ⚠️ {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''} - immediate action required
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Contracts */}
        <div>
          <div style={{ ...styles.kpiLabel, marginBottom: '16px' }}>
            Active Contracts
          </div>
          {contracts.map((contract) => (
            <div key={contract.id} style={styles.contractCard}>
              <div style={styles.contractHeader}>
                <div style={styles.contractTitle}>{contract.client}</div>
                <div
                  style={{
                    ...styles.contractStatus,
                    backgroundColor:
                      contract.status === 'Active'
                        ? 'rgba(100, 200, 100, 0.2)'
                        : contract.status === 'Expiring'
                          ? 'rgba(255, 215, 0, 0.2)'
                          : 'rgba(100, 100, 100, 0.2)',
                    color:
                      contract.status === 'Active'
                        ? '#64C864'
                        : contract.status === 'Expiring'
                          ? '#FFD700'
                          : '#A0A0A0',
                  }}
                >
                  {contract.status}
                </div>
              </div>
              <div style={styles.contractInfo}>{contract.service}</div>
              <div style={styles.contractInfo}>Monthly: ${contract.monthlyFee.toLocaleString()}</div>
              <div style={styles.contractInfo}>
                {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>

        {/* Revenue by Client */}
        <div>
          <div style={{ ...styles.kpiLabel, marginBottom: '16px' }}>
            Revenue by Client
          </div>
          {revenueByClient.map((client) => (
            <div key={client.name} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: '500' }}>{client.name}</div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#FFD700' }}>
                  ${client.revenue.toLocaleString()}
                </div>
              </div>
              <svg width="100%" height={chartHeight} viewBox={`0 0 400 ${chartHeight}`}>
                <rect
                  x="0"
                  y="5"
                  width={(client.revenue / maxRevenue) * 400}
                  height={chartHeight - 10}
                  fill="#FFD700"
                  rx="3"
                  opacity="0.8"
                />
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div style={styles.kpiCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={styles.kpiLabel}>Invoices</div>
          <button style={styles.button} onClick={() => setShowInvoiceModal(true)}>
            + Create Invoice
          </button>
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.tableHeader}>Invoice #</th>
              <th style={styles.tableHeader}>Client</th>
              <th style={styles.tableHeader}>Amount</th>
              <th style={styles.tableHeader}>Date</th>
              <th style={styles.tableHeader}>Status</th>
              <th style={styles.tableHeader}>Due Date</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td style={styles.tableCell}>{invoice.id}</td>
                <td style={styles.tableCell}>{invoice.client}</td>
                <td style={styles.tableCell}>${invoice.amount.toLocaleString()}</td>
                <td style={styles.tableCell}>{new Date(invoice.date).toLocaleDateString()}</td>
                <td style={styles.tableCell}>
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor:
                        invoice.status === 'Paid'
                          ? 'rgba(100, 200, 100, 0.2)'
                          : invoice.status === 'Pending'
                            ? 'rgba(255, 215, 0, 0.2)'
                            : 'rgba(200, 100, 100, 0.2)',
                      color:
                        invoice.status === 'Paid'
                          ? '#64C864'
                          : invoice.status === 'Pending'
                            ? '#FFD700'
                            : '#C86464',
                      padding: '4px 10px',
                      borderRadius: '4px',
                    }}
                  >
                    {invoice.status}
                  </span>
                </td>
                <td style={styles.tableCell}>{new Date(invoice.dueDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInvoiceModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>Create Invoice</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Client</label>
              <select
                style={styles.select}
                value={invoiceData.client}
                onChange={(e) => setInvoiceData({ ...invoiceData, client: e.target.value })}
              >
                <option style={styles.selectOption}></option>
                {mockClients.map((client) => (
                  <option key={client.id} value={client.name} style={styles.selectOption}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Amount</label>
              <input
                type="number"
                style={styles.input}
                value={invoiceData.amount}
                onChange={(e) => setInvoiceData({ ...invoiceData, amount: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                style={styles.textarea}
                value={invoiceData.description}
                onChange={(e) => setInvoiceData({ ...invoiceData, description: e.target.value })}
                placeholder="Service details..."
              />
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.buttonSecondary} onClick={() => setShowInvoiceModal(false)}>
                Cancel
              </button>
              <button style={styles.button} onClick={handleAddInvoice}>
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OnboardingTab() {
  const [selectedClient, setSelectedClient] = useState(3);
  const [onboardingChecklist, setOnboardingChecklist] = useState(mockOnboarding[3] || []);

  const clientOptions = mockClients
    .filter((c) => c.status === 'Onboarding' || mockOnboarding[c.id])
    .map((c) => ({ id: c.id, name: c.name }));

  const handleClientChange = (clientId) => {
    setSelectedClient(clientId);
    setOnboardingChecklist(mockOnboarding[clientId] || []);
  };

  const handleToggleStep = (stepIndex) => {
    const updated = [...onboardingChecklist];
    updated[stepIndex].completed = !updated[stepIndex].completed;
    setOnboardingChecklist(updated);
  };

  const completedSteps = onboardingChecklist.filter((s) => s.completed).length;
  const totalSteps = onboardingChecklist.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div>
      <div style={styles.controlBar}>
        <select style={styles.select} value={selectedClient} onChange={(e) => handleClientChange(parseInt(e.target.value))}>
          {clientOptions.map((client) => (
            <option key={client.id} value={client.id} style={styles.selectOption}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.kpiCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={styles.kpiLabel}>Onboarding Progress</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFD700' }}>
            {completedSteps}/{totalSteps}
          </div>
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progressPercentage}%` }} />
        </div>
      </div>

      <div style={{ marginTop: '32px' }}>
        {onboardingChecklist.map((step, idx) => (
          <div key={step.step} style={styles.checklistItem}>
            <input
              type="checkbox"
              checked={step.completed}
              onChange={() => handleToggleStep(idx)}
              style={styles.checkbox}
            />
            <div style={styles.checklistContent}>
              <div style={{ ...styles.checklistLabel, textDecoration: step.completed ? 'line-through' : 'none' }}>
                Step {step.step}: {step.title}
              </div>
              <div style={styles.checklistDate}>Assigned to: {step.assigned}</div>
              <div style={styles.checklistDate}>Due: {new Date(step.dueDate).toLocaleDateString()}</div>
              {step.notes && <div style={{ fontSize: '12px', color: '#FFFFFF', marginTop: '6px' }}>Notes: {step.notes}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ClientOverviewTab />;
      case 'performance':
        return <ClientPerformanceTab />;
      case 'communication':
        return <CommunicationTab />;
      case 'contracts':
        return <ContractsAndBillingTab />;
      case 'onboarding':
        return <OnboardingTab />;
      default:
        return <ClientOverviewTab />;
    }
  };

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>Clients</div>
          <div style={styles.subtitle}>Manage your Amazon FBA client relationships</div>
        </div>

        <div style={styles.tabsContainer}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'overview' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('overview')}
          >
            Client Overview
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'performance' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'communication' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('communication')}
          >
            Communication
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'contracts' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('contracts')}
          >
            Contracts & Billing
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'onboarding' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('onboarding')}
          >
            Onboarding
          </button>
        </div>

        {renderTabContent()}
      </div>
    </div>
  );
}
