import { useState, useEffect } from 'react';
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
  headerTitle: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  headerSubtitle: {
    fontSize: '14px',
    color: '#A0A0A0',
  },
  tabsContainer: {
    display: 'flex',
    gap: '16px',
    borderBottom: '1px solid #1E1E1E',
    marginBottom: '32px',
    overflowX: 'auto',
  },
  tab: {
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#A0A0A0',
    border: 'none',
    backgroundColor: 'transparent',
    borderBottom: '2px solid transparent',
    transition: 'all 0.3s ease',
  },
  tabActive: {
    color: '#FFD700',
    borderBottom: '2px solid #FFD700',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '16px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#A0A0A0',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#FFD700',
  },
  button: {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: '#FFD700',
    color: '#000',
  },
  buttonHover: {
    backgroundColor: '#FFF000',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    border: '1px solid #1E1E1E',
    color: '#FFFFFF',
  },
  secondaryButtonHover: {
    borderColor: '#FFD700',
    color: '#FFD700',
  },
  notificationFeed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  notificationItem: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    gap: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  notificationItemUnread: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.03)',
  },
  notificationIcon: {
    fontSize: '24px',
    minWidth: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    minWidth: '0',
  },
  notificationTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '4px',
    color: '#FFFFFF',
  },
  notificationMessage: {
    fontSize: '13px',
    color: '#A0A0A0',
    lineHeight: '1.4',
    marginBottom: '6px',
  },
  notificationTime: {
    fontSize: '11px',
    color: '#707070',
  },
  notificationRead: {
    width: '8px',
    height: '8px',
    borderRadius: '4px',
    backgroundColor: '#FFD700',
  },
  notificationReadIndicator: {
    minWidth: '8px',
    display: 'flex',
    alignItems: 'center',
  },
  ruleCard: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleDetails: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '4px',
  },
  ruleConfig: {
    fontSize: '12px',
    color: '#A0A0A0',
    marginBottom: '6px',
  },
  ruleMethod: {
    fontSize: '11px',
    color: '#FFD700',
  },
  ruleActions: {
    display: 'flex',
    gap: '8px',
  },
  toggle: {
    width: '40px',
    height: '24px',
    backgroundColor: '#1E1E1E',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.3s ease',
  },
  toggleActive: {
    backgroundColor: '#FFD700',
  },
  toggleSwitch: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    transition: 'left 0.3s ease',
  },
  toggleSwitchActive: {
    left: '18px',
  },
  iconButton: {
    padding: '6px 10px',
    fontSize: '12px',
    border: '1px solid #1E1E1E',
    backgroundColor: 'transparent',
    color: '#A0A0A0',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  iconButtonHover: {
    borderColor: '#FFD700',
    color: '#FFD700',
  },
  badgeInventory: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    color: '#F97316',
  },
  badgePrice: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3B82F6',
  },
  badgeOrder: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#22C55E',
  },
  badgePPC: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    color: '#8B5CF6',
  },
  badgeSystem: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    color: '#6B7280',
  },
  badgeHealth: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#EF4444',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  tableHeader: {
    backgroundColor: '#111111',
    borderBottom: '1px solid #1E1E1E',
    textAlign: 'left',
  },
  tableHeaderCell: {
    padding: '12px 16px',
    fontWeight: '600',
    color: '#A0A0A0',
  },
  tableRow: {
    borderBottom: '1px solid #1E1E1E',
    transition: 'background-color 0.3s ease',
  },
  tableRowHover: {
    backgroundColor: '#111111',
  },
  tableCell: {
    padding: '12px 16px',
    color: '#FFFFFF',
  },
  modal: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '1000',
  },
  modalContent: {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '32px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '6px',
    color: '#A0A0A0',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '13px',
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
    fontSize: '13px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    justifyContent: 'flex-end',
  },
  closeButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#A0A0A0',
    fontSize: '24px',
    cursor: 'pointer',
  },
  filterContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  loadMoreButton: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '24px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
};

const mockNotifications = [
  { id: 1, type: 'Inventory Alert', icon: '📦', title: 'Low Stock Alert', message: 'Product SKU-001 has 5 days of supply remaining', timestamp: '2025-03-29 14:30', read: false },
  { id: 2, type: 'Price Change', icon: '💰', title: 'Price Drop Detected', message: 'Competitor price for ASIN B07XYZ dropped by 12%', timestamp: '2025-03-29 12:15', read: true },
  { id: 3, type: 'Order Update', icon: '📋', title: 'Order Shipped', message: 'Order #ORD-2025-00456 has been shipped', timestamp: '2025-03-29 10:45', read: false },
  { id: 4, type: 'PPC Alert', icon: '🎯', title: 'High ACOS Campaign', message: 'Campaign "Spring Sales" ACOS is 45%, above 35% threshold', timestamp: '2025-03-28 16:20', read: true },
  { id: 5, type: 'Inventory Alert', icon: '📦', title: 'Stock Replenishment', message: 'SKU-042 recommended for reorder based on forecasts', timestamp: '2025-03-28 14:00', read: false },
  { id: 6, type: 'System', icon: '⚙️', title: 'Sync Complete', message: 'Daily Amazon inventory sync completed successfully', timestamp: '2025-03-28 02:00', read: true },
  { id: 7, type: 'Account Health', icon: '⚠️', title: 'Account Health Warning', message: 'Your seller rating has dropped to 98.5%', timestamp: '2025-03-27 19:30', read: false },
  { id: 8, type: 'Price Change', icon: '💰', title: 'Price Alert', message: 'Your product ASIN B08ABC reached target price', timestamp: '2025-03-27 11:20', read: true },
  { id: 9, type: 'Order Update', icon: '📋', title: 'Return Initiated', message: 'Customer initiated return for order #ORD-2025-00421', timestamp: '2025-03-27 09:00', read: false },
  { id: 10, type: 'PPC Alert', icon: '🎯', title: 'Campaign Paused', message: 'Campaign "Flash Deal" was auto-paused due to low ROI', timestamp: '2025-03-26 15:45', read: true },
  { id: 11, type: 'Inventory Alert', icon: '📦', title: 'Inventory Issue', message: 'Suspected inventory discrepancy for SKU-089', timestamp: '2025-03-26 13:10', read: false },
  { id: 12, type: 'Account Health', icon: '⚠️', title: 'Negative Review', message: 'New 2-star review: "Product arrived damaged"', timestamp: '2025-03-25 20:40', read: true },
  { id: 13, type: 'System', icon: '⚙️', title: 'Report Generated', message: 'Monthly P&L Report for February is ready', timestamp: '2025-03-25 10:00', read: false },
  { id: 14, type: 'Price Change', icon: '💰', title: 'Price Adjustment', message: 'Your price adjustment to $49.99 is now live', timestamp: '2025-03-24 16:30', read: true },
  { id: 15, type: 'Order Update', icon: '📋', title: 'Order Delivered', message: 'Order #ORD-2025-00389 delivered successfully', timestamp: '2025-03-24 14:00', read: false },
];

const alertRulesMock = [
  { id: 1, type: 'Low Stock Alert', config: 'SKU-001: 7 days threshold', method: 'In-app, Email', enabled: true },
  { id: 2, type: 'Price Drop Alert', config: 'ASIN B07XYZ: 10% threshold', method: 'In-app', enabled: true },
  { id: 3, type: 'Buy Box Lost', config: 'Monitoring 5 ASINs', method: 'Email', enabled: false },
  { id: 4, type: 'ROI Below Threshold', config: 'Minimum ROI: 25%', method: 'In-app, Email', enabled: true },
  { id: 5, type: 'Negative Review', config: 'Star rating: 3 stars or below', method: 'Email', enabled: true },
  { id: 6, type: 'Account Health Warning', config: 'Seller rating: 98% threshold', method: 'In-app', enabled: true },
];

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState(mockNotifications);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [displayedNotifications, setDisplayedNotifications] = useState(10);

  const [ruleFormData, setRuleFormData] = useState({
    type: 'Low Stock Alert',
    method: 'In-app',
    threshold: '',
    product: '',
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const totalCount = notifications.length;
  const thisWeekCount = notifications.filter(n => {
    const date = new Date(n.timestamp);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo;
  }).length;

  const handleMarkAsRead = (id) => {
    setNotifications(notifications.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleLoadMore = () => {
    setDisplayedNotifications(displayedNotifications + 10);
  };

  const filteredNotifications = notifications.filter(n => {
    if (filterType && n.type !== filterType) return false;
    return true;
  });

  const getNotificationBadgeStyle = (type) => {
    switch (type) {
      case 'Inventory Alert':
        return { ...styles.badge, ...styles.badgeInventory };
      case 'Price Change':
        return { ...styles.badge, ...styles.badgePrice };
      case 'Order Update':
        return { ...styles.badge, ...styles.badgeOrder };
      case 'PPC Alert':
        return { ...styles.badge, ...styles.badgePPC };
      case 'System':
        return { ...styles.badge, ...styles.badgeSystem };
      case 'Account Health':
        return { ...styles.badge, ...styles.badgeHealth };
      default:
        return { ...styles.badge, ...styles.badgeSystem };
    }
  };

  const notificationTypesInFeed = [...new Set(notifications.map(n => n.type))];

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>Notifications</div>
          <div style={styles.headerSubtitle}>Manage alerts, notifications, and notification rules</div>
        </div>

        <div style={styles.tabsContainer}>
          {['all', 'rules', 'history'].map((tab) => (
            <button
              key={tab}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'all' && 'All Notifications'}
              {tab === 'rules' && 'Alert Rules'}
              {tab === 'history' && 'Notification History'}
            </button>
          ))}
        </div>

        {activeTab === 'all' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={styles.filterContainer}>
                <select
                  style={{ ...styles.select, width: '200px' }}
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">All Types</option>
                  {notificationTypesInFeed.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <button
                style={styles.button}
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </button>
            </div>

            <div style={styles.notificationFeed}>
              {filteredNotifications.slice(0, displayedNotifications).map((notif) => (
                <div
                  key={notif.id}
                  style={{
                    ...styles.notificationItem,
                    ...(notif.read ? {} : styles.notificationItemUnread),
                  }}
                  onClick={() => handleMarkAsRead(notif.id)}
                  onMouseEnter={(e) => {
                    if (notif.read) {
                      e.currentTarget.style.backgroundColor = styles.tableRowHover.backgroundColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notif.read ? '#111111' : 'rgba(255, 215, 0, 0.03)';
                  }}
                >
                  <div style={styles.notificationIcon}>{notif.icon}</div>
                  <div style={styles.notificationContent}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div style={styles.notificationTitle}>{notif.title}</div>
                      <div style={getNotificationBadgeStyle(notif.type)}>{notif.type}</div>
                    </div>
                    <div style={styles.notificationMessage}>{notif.message}</div>
                    <div style={styles.notificationTime}>{notif.timestamp}</div>
                  </div>
                  {!notif.read && <div style={styles.notificationRead} />}
                </div>
              ))}
            </div>

            {displayedNotifications < filteredNotifications.length && (
              <div style={styles.loadMoreButton}>
                <button
                  style={{ ...styles.button, ...styles.secondaryButton }}
                  onClick={handleLoadMore}
                >
                  Load More Notifications
                </button>
              </div>
            )}

            {filteredNotifications.length === 0 && (
              <div style={{ ...styles.notificationItem, textAlign: 'center', color: '#A0A0A0' }}>
                No notifications found
              </div>
            )}
          </div>
        )}

        {activeTab === 'rules' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <button
                style={styles.button}
                onClick={() => setRuleModalOpen(true)}
              >
                + Create Alert Rule
              </button>
            </div>

            {alertRulesMock.map((rule) => (
              <div key={rule.id} style={styles.ruleCard}>
                <div style={styles.ruleDetails}>
                  <div style={styles.ruleTitle}>{rule.type}</div>
                  <div style={styles.ruleConfig}>{rule.config}</div>
                  <div style={styles.ruleMethod}>Notification: {rule.method}</div>
                </div>
                <div style={styles.ruleActions}>
                  <button
                    style={{
                      ...styles.toggle,
                      ...(rule.enabled ? styles.toggleActive : {}),
                    }}
                  >
                    <div
                      style={{
                        ...styles.toggleSwitch,
                        ...(rule.enabled ? styles.toggleSwitchActive : {}),
                      }}
                    />
                  </button>
                  <button
                    style={styles.iconButton}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = styles.iconButtonHover.borderColor;
                      e.target.style.color = styles.iconButtonHover.color;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = '#1E1E1E';
                      e.target.style.color = '#A0A0A0';
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    style={styles.iconButton}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = styles.iconButtonHover.borderColor;
                      e.target.style.color = styles.iconButtonHover.color;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = '#1E1E1E';
                      e.target.style.color = '#A0A0A0';
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div style={styles.statsContainer}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Notifications</div>
                <div style={styles.statValue}>{totalCount}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Unread</div>
                <div style={styles.statValue}>{unreadCount}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Actioned</div>
                <div style={styles.statValue}>{notifications.filter(n => n.read).length}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>This Week</div>
                <div style={styles.statValue}>{thisWeekCount}</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <select
                style={{ ...styles.select, width: '200px' }}
              >
                <option value="">All Types</option>
                {notificationTypesInFeed.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                style={{ ...styles.select, width: '200px' }}
              >
                <option value="">All Status</option>
                <option value="sent">Sent</option>
                <option value="read">Read</option>
                <option value="actioned">Actioned</option>
              </select>
              <button
                style={{ ...styles.button, ...styles.secondaryButton }}
              >
                📥 Export to CSV
              </button>
            </div>

            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.tableHeaderCell}>Type</th>
                  <th style={styles.tableHeaderCell}>Title</th>
                  <th style={styles.tableHeaderCell}>Message</th>
                  <th style={styles.tableHeaderCell}>Date</th>
                  <th style={styles.tableHeaderCell}>Status</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notif) => (
                  <tr
                    key={notif.id}
                    style={styles.tableRow}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = styles.tableRowHover.backgroundColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={styles.tableCell}>
                      <div style={getNotificationBadgeStyle(notif.type)}>{notif.type}</div>
                    </td>
                    <td style={styles.tableCell}>{notif.title}</td>
                    <td style={{ ...styles.tableCell, maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {notif.message}
                    </td>
                    <td style={styles.tableCell}>{notif.timestamp}</td>
                    <td style={styles.tableCell}>
                      {notif.read ? (
                        <div style={{ ...styles.badge, backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>Read</div>
                      ) : (
                        <div style={{ ...styles.badge, backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#EAB308' }}>Sent</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ruleModalOpen && (
          <div style={styles.modal} onClick={() => setRuleModalOpen(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button style={styles.closeButton} onClick={() => setRuleModalOpen(false)}>✕</button>
              <div style={styles.modalTitle}>Create Alert Rule</div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Alert Type</label>
                <select
                  style={styles.select}
                  value={ruleFormData.type}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, type: e.target.value })}
                >
                  <option value="Low Stock Alert">Low Stock Alert</option>
                  <option value="Price Drop Alert">Price Drop Alert</option>
                  <option value="Buy Box Lost">Buy Box Lost</option>
                  <option value="ROI Below Threshold">ROI Below Threshold</option>
                  <option value="Negative Review">Negative Review</option>
                  <option value="Account Health Warning">Account Health Warning</option>
                </select>
              </div>

              {ruleFormData.type === 'Low Stock Alert' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Product SKU</label>
                    <input
                      type="text"
                      style={styles.input}
                      placeholder="e.g., SKU-001"
                      value={ruleFormData.product}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, product: e.target.value })}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Days of Supply Threshold</label>
                    <input
                      type="number"
                      style={styles.input}
                      placeholder="e.g., 7"
                      value={ruleFormData.threshold}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, threshold: e.target.value })}
                    />
                  </div>
                </>
              )}

              {ruleFormData.type === 'Price Drop Alert' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>ASIN</label>
                    <input
                      type="text"
                      style={styles.input}
                      placeholder="e.g., B07XYZ123"
                      value={ruleFormData.product}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, product: e.target.value })}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Price Drop Threshold (%)</label>
                    <input
                      type="number"
                      style={styles.input}
                      placeholder="e.g., 10"
                      value={ruleFormData.threshold}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, threshold: e.target.value })}
                    />
                  </div>
                </>
              )}

              {ruleFormData.type === 'ROI Below Threshold' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Minimum ROI (%)</label>
                  <input
                    type="number"
                    style={styles.input}
                    placeholder="e.g., 25"
                    value={ruleFormData.threshold}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, threshold: e.target.value })}
                  />
                </div>
              )}

              {ruleFormData.type === 'Negative Review' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Star Rating Threshold</label>
                  <select
                    style={styles.select}
                    value={ruleFormData.threshold}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, threshold: e.target.value })}
                  >
                    <option value="1">1 star or below</option>
                    <option value="2">2 stars or below</option>
                    <option value="3">3 stars or below</option>
                    <option value="4">4 stars or below</option>
                  </select>
                </div>
              )}

              {ruleFormData.type === 'Account Health Warning' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Seller Rating Threshold (%)</label>
                  <input
                    type="number"
                    style={styles.input}
                    placeholder="e.g., 98"
                    value={ruleFormData.threshold}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, threshold: e.target.value })}
                  />
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Notification Method</label>
                <select
                  style={styles.select}
                  value={ruleFormData.method}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, method: e.target.value })}
                >
                  <option value="In-app">In-app Only</option>
                  <option value="Email">Email Only</option>
                  <option value="Both">In-app & Email</option>
                </select>
              </div>

              <div style={styles.modalButtons}>
                <button style={{ ...styles.button, ...styles.secondaryButton }} onClick={() => setRuleModalOpen(false)}>
                  Cancel
                </button>
                <button style={styles.button}>Create Rule</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
