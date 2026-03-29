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
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
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
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  },
  inputFocus: {
    borderColor: '#FFD700',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  passwordContainer: {
    position: 'relative',
  },
  togglePasswordBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#FFD700',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
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
  statusIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    marginTop: '12px',
  },
  statusSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: '#22C55E',
  },
  statusError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#EF4444',
  },
  statusLoading: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: '#3B82F6',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  toggleSwitch: {
    width: '40px',
    height: '24px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#1E1E1E',
    position: 'relative',
    transition: 'background-color 0.2s ease',
  },
  toggleSwitchActive: {
    backgroundColor: '#FFD700',
  },
  toggleThumb: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    borderRadius: '10px',
    backgroundColor: '#0A0A0A',
    transition: 'left 0.2s ease',
  },
  toggleThumbActive: {
    left: '18px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  syncTypeCard: {
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
  },
  syncTypeLabel: {
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
  },
  syncTypeTimestamp: {
    fontSize: '12px',
    color: '#666666',
    marginBottom: '12px',
  },
  syncNowBtn: {
    padding: '8px 12px',
    backgroundColor: '#FFD700',
    color: '#0A0A0A',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  apiCallsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    padding: '16px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666666',
  },
  logsContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  logEntry: {
    padding: '12px',
    borderBottom: '1px solid #1E1E1E',
    fontSize: '12px',
    fontFamily: 'monospace',
    display: 'grid',
    gridTemplateColumns: '100px 80px 60px 80px 80px',
    gap: '12px',
    alignItems: 'center',
  },
  logTimestamp: {
    color: '#FFD700',
  },
  logEndpoint: {
    color: '#3B82F6',
  },
  logMethod: {
    color: '#22C55E',
  },
  logStatusOk: {
    color: '#22C55E',
  },
  logStatusError: {
    color: '#EF4444',
  },
  logDuration: {
    color: '#999999',
  },
  marketplaceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  marketplaceCard: {
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
  },
  marketplaceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  marketplaceFlag: {
    fontSize: '24px',
  },
  marketplaceName: {
    fontSize: '16px',
    fontWeight: '600',
  },
  marketplaceInfo: {
    fontSize: '12px',
    color: '#666666',
    marginBottom: '8px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
    marginBottom: '12px',
  },
  statusConnected: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: '#22C55E',
  },
  statusDisconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#EF4444',
  },
  marketplaceToggleContainer: {
    marginTop: 'auto',
    paddingTop: '12px',
    borderTop: '1px solid #1E1E1E',
  },
  helpText: {
    fontSize: '12px',
    color: '#666666',
    marginTop: '6px',
    lineHeight: '1.5',
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid #FFD700',
    borderTop: '2px solid transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

const MARKETPLACES = [
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD' },
];

const MOCK_API_LOGS = [
  { timestamp: '14:32:05', endpoint: '/products', method: 'GET', status: 200, duration: '245ms' },
  { timestamp: '14:31:58', endpoint: '/orders', method: 'GET', status: 200, duration: '312ms' },
  { timestamp: '14:31:45', endpoint: '/financials', method: 'GET', status: 200, duration: '478ms' },
  { timestamp: '14:31:20', endpoint: '/inventory', method: 'GET', status: 200, duration: '156ms' },
  { timestamp: '14:30:15', endpoint: '/products', method: 'POST', status: 201, duration: '534ms' },
  { timestamp: '14:29:50', endpoint: '/config', method: 'PUT', status: 200, duration: '89ms' },
];

const MOCK_ERROR_LOGS = [
  { timestamp: '13:45:20', endpoint: '/ppc', method: 'GET', status: 429, error: 'Rate limit exceeded', stack: 'RateLimitError: Too many requests in short time period' },
];

export default function AmazonSettings() {
  const [activeTab, setActiveTab] = useState('api-config');
  const [token, setToken] = useState('');
  const [config, setConfig] = useState({
    sellerId: '',
    marketplace: 'US',
    lwaClientId: '',
    lwaClientSecret: '',
    refreshToken: '',
  });
  const [showSecrets, setShowSecrets] = useState({
    lwaClientSecret: false,
    refreshToken: false,
  });
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncSettings, setSyncSettings] = useState({
    autoSyncInventory: true,
    inventoryInterval: '24h',
    autoSyncOrders: true,
    autoSyncProducts: false,
    autoSyncPpcReports: false,
    autoSyncFinancialData: false,
  });
  const [syncTimestamps, setSyncTimestamps] = useState({
    inventory: '2 hours ago',
    orders: '4 hours ago',
    products: 'Never',
    ppc: 'Never',
    financial: 'Never',
  });
  const [syncingTypes, setSyncingTypes] = useState({});
  const [marketplaceStates, setMarketplaceStates] = useState(
    MARKETPLACES.reduce((acc, m) => {
      acc[m.code] = {
        enabled: m.code === 'US' || m.code === 'CA',
        status: m.code === 'US' || m.code === 'CA' ? 'Connected' : 'Disconnected',
      };
      return acc;
    }, {})
  );

  useEffect(() => {
    const savedToken = localStorage.getItem('ecomera_token');
    const savedConfig = localStorage.getItem('amazon_sp_api_config');
    if (savedToken) setToken(savedToken);
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Failed to parse saved config:', e);
      }
    }
  }, []);

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const response = await fetch(`${BASE_URL}/amazon/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        setConnectionStatus({ type: 'success', message: 'Connection successful' });
      } else {
        setConnectionStatus({ type: 'error', message: 'Connection failed' });
      }
    } catch (error) {
      setConnectionStatus({ type: 'error', message: 'Connection error: ' + error.message });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfiguration = async () => {
    localStorage.setItem('amazon_sp_api_config', JSON.stringify(config));
    try {
      const response = await fetch(`${BASE_URL}/amazon/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        setConnectionStatus({ type: 'success', message: 'Configuration saved successfully' });
      } else {
        setConnectionStatus({ type: 'error', message: 'Failed to save configuration' });
      }
    } catch (error) {
      setConnectionStatus({ type: 'error', message: 'Save error: ' + error.message });
    }
  };

  const handleSyncNow = async (syncType) => {
    setSyncingTypes(prev => ({ ...prev, [syncType]: true }));
    try {
      const response = await fetch(`${BASE_URL}/amazon/sync/${syncType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setSyncTimestamps(prev => ({ ...prev, [syncType]: 'Just now' }));
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncingTypes(prev => ({ ...prev, [syncType]: false }));
    }
  };

  const handleSyncSettingsChange = (field, value) => {
    setSyncSettings(prev => ({ ...prev, [field]: value }));
  };

  const toggleMarketplace = (code) => {
    setMarketplaceStates(prev => ({
      ...prev,
      [code]: {
        ...prev[code],
        enabled: !prev[code].enabled,
      },
    }));
  };

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Amazon SP-API Settings</h1>
          <p style={styles.subtitle}>Configure and manage your Amazon Seller Partner API integration</p>
        </div>

        <div style={styles.tabsContainer}>
          {[
            { id: 'api-config', label: 'API Configuration' },
            { id: 'sync-settings', label: 'Sync Settings' },
            { id: 'api-health', label: 'API Health' },
            { id: 'marketplace-settings', label: 'Marketplace Settings' },
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

        {/* API Configuration Tab */}
        <div style={{ ...styles.tabContent, ...(activeTab === 'api-config' ? styles.tabContentActive : {}) }}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Seller Information</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Seller ID</label>
              <input
                style={styles.input}
                type="text"
                value={config.sellerId}
                onChange={e => handleConfigChange('sellerId', e.target.value)}
                placeholder="e.g., A1234ABCD5E6F"
              />
              <p style={styles.helpText}>Your unique Amazon seller identifier (found in Seller Central)</p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Marketplace</label>
              <select
                style={styles.select}
                value={config.marketplace}
                onChange={e => handleConfigChange('marketplace', e.target.value)}
              >
                {MARKETPLACES.map(m => (
                  <option key={m.code} value={m.code}>{m.flag} {m.name}</option>
                ))}
              </select>
              <p style={styles.helpText}>Select your primary marketplace region</p>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>LWA Credentials</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>LWA Client ID</label>
              <input
                style={styles.input}
                type="text"
                value={config.lwaClientId}
                onChange={e => handleConfigChange('lwaClientId', e.target.value)}
                placeholder="amzn1.application-oa2-client..."
              />
              <p style={styles.helpText}>Login with Amazon client identifier from app registration</p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>LWA Client Secret</label>
              <div style={styles.passwordContainer}>
                <input
                  style={styles.input}
                  type={showSecrets.lwaClientSecret ? 'text' : 'password'}
                  value={config.lwaClientSecret}
                  onChange={e => handleConfigChange('lwaClientSecret', e.target.value)}
                  placeholder="••••••••••••"
                />
                <button
                  style={styles.togglePasswordBtn}
                  onClick={() => setShowSecrets(prev => ({ ...prev, lwaClientSecret: !prev.lwaClientSecret }))}
                >
                  {showSecrets.lwaClientSecret ? 'Hide' : 'Show'}
                </button>
              </div>
              <p style={styles.helpText}>Keep this secret safe - do not share or commit to version control</p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Refresh Token</label>
              <div style={styles.passwordContainer}>
                <input
                  style={styles.input}
                  type={showSecrets.refreshToken ? 'text' : 'password'}
                  value={config.refreshToken}
                  onChange={e => handleConfigChange('refreshToken', e.target.value)}
                  placeholder="••••••••••••"
                />
                <button
                  style={styles.togglePasswordBtn}
                  onClick={() => setShowSecrets(prev => ({ ...prev, refreshToken: !prev.refreshToken }))}
                >
                  {showSecrets.refreshToken ? 'Hide' : 'Show'}
                </button>
              </div>
              <p style={styles.helpText}>Long-lived token obtained during OAuth authorization flow</p>
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button
              style={{ ...styles.button, ...styles.buttonPrimary }}
              onClick={handleTestConnection}
              disabled={testingConnection}
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              style={{ ...styles.button, ...styles.buttonSecondary }}
              onClick={handleSaveConfiguration}
            >
              Save Configuration
            </button>
          </div>

          {connectionStatus && (
            <div
              style={{
                ...styles.statusIndicator,
                ...(connectionStatus.type === 'success' ? styles.statusSuccess : styles.statusError),
              }}
            >
              {connectionStatus.type === 'success' ? '✓' : '✕'} {connectionStatus.message}
            </div>
          )}
        </div>

        {/* Sync Settings Tab */}
        <div style={{ ...styles.tabContent, ...(activeTab === 'sync-settings' ? styles.tabContentActive : {}) }}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Auto-Sync Configuration</div>

            <div style={styles.formGroup}>
              <div style={styles.toggle}>
                <div>
                  <label style={styles.label}>Auto-sync Inventory</label>
                  <p style={styles.helpText}>Automatically sync inventory levels from Amazon</p>
                </div>
                <button
                  style={{
                    ...styles.toggleSwitch,
                    ...(syncSettings.autoSyncInventory ? styles.toggleSwitchActive : {}),
                  }}
                  onClick={() => handleSyncSettingsChange('autoSyncInventory', !syncSettings.autoSyncInventory)}
                >
                  <div style={{
                    ...styles.toggleThumb,
                    ...(syncSettings.autoSyncInventory ? styles.toggleThumbActive : {}),
                  }} />
                </button>
              </div>
              {syncSettings.autoSyncInventory && (
                <div style={{ marginTop: '12px', marginLeft: '40px' }}>
                  <label style={styles.label}>Sync Interval</label>
                  <select
                    style={styles.select}
                    value={syncSettings.inventoryInterval}
                    onChange={e => handleSyncSettingsChange('inventoryInterval', e.target.value)}
                  >
                    <option value="1h">Every 1 hour</option>
                    <option value="6h">Every 6 hours</option>
                    <option value="12h">Every 12 hours</option>
                    <option value="24h">Every 24 hours</option>
                  </select>
                </div>
              )}
            </div>

            <div style={styles.formGroup}>
              <div style={styles.toggle}>
                <div>
                  <label style={styles.label}>Auto-sync Orders</label>
                  <p style={styles.helpText}>Automatically sync orders from Amazon</p>
                </div>
                <button
                  style={{
                    ...styles.toggleSwitch,
                    ...(syncSettings.autoSyncOrders ? styles.toggleSwitchActive : {}),
                  }}
                  onClick={() => handleSyncSettingsChange('autoSyncOrders', !syncSettings.autoSyncOrders)}
                >
                  <div style={{
                    ...styles.toggleThumb,
                    ...(syncSettings.autoSyncOrders ? styles.toggleThumbActive : {}),
                  }} />
                </button>
              </div>
            </div>

            <div style={styles.formGroup}>
              <div style={styles.toggle}>
                <div>
                  <label style={styles.label}>Auto-sync Products</label>
                  <p style={styles.helpText}>Automatically sync product data and listings</p>
                </div>
                <button
                  style={{
                    ...styles.toggleSwitch,
                    ...(syncSettings.autoSyncProducts ? styles.toggleSwitchActive : {}),
                  }}
                  onClick={() => handleSyncSettingsChange('autoSyncProducts', !syncSettings.autoSyncProducts)}
                >
                  <div style={{
                    ...styles.toggleThumb,
                    ...(syncSettings.autoSyncProducts ? styles.toggleThumbActive : {}),
                  }} />
                </button>
              </div>
            </div>

            <div style={styles.formGroup}>
              <div style={styles.toggle}>
                <div>
                  <label style={styles.label}>Auto-sync PPC Reports</label>
                  <p style={styles.helpText}>Automatically sync Amazon Advertising data</p>
                </div>
                <button
                  style={{
                    ...styles.toggleSwitch,
                    ...(syncSettings.autoSyncPpcReports ? styles.toggleSwitchActive : {}),
                  }}
                  onClick={() => handleSyncSettingsChange('autoSyncPpcReports', !syncSettings.autoSyncPpcReports)}
                >
                  <div style={{
                    ...styles.toggleThumb,
                    ...(syncSettings.autoSyncPpcReports ? styles.toggleThumbActive : {}),
                  }} />
                </button>
              </div>
            </div>

            <div style={styles.formGroup}>
              <div style={styles.toggle}>
                <div>
                  <label style={styles.label}>Auto-sync Financial Data</label>
                  <p style={styles.helpText}>Automatically sync financial reports and settlements</p>
                </div>
                <button
                  style={{
                    ...styles.toggleSwitch,
                    ...(syncSettings.autoSyncFinancialData ? styles.toggleSwitchActive : {}),
                  }}
                  onClick={() => handleSyncSettingsChange('autoSyncFinancialData', !syncSettings.autoSyncFinancialData)}
                >
                  <div style={{
                    ...styles.toggleThumb,
                    ...(syncSettings.autoSyncFinancialData ? styles.toggleThumbActive : {}),
                  }} />
                </button>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Manual Sync</div>
            <div style={styles.grid}>
              {[
                { id: 'inventory', label: 'Inventory', key: 'inventory' },
                { id: 'orders', label: 'Orders', key: 'orders' },
                { id: 'products', label: 'Products', key: 'products' },
                { id: 'ppc', label: 'PPC Reports', key: 'ppc' },
                { id: 'financial', label: 'Financial Data', key: 'financial' },
              ].map(syncType => (
                <div key={syncType.id} style={styles.syncTypeCard}>
                  <div style={styles.syncTypeLabel}>{syncType.label}</div>
                  <div style={styles.syncTypeTimestamp}>Last: {syncTimestamps[syncType.key]}</div>
                  <button
                    style={styles.syncNowBtn}
                    onClick={() => handleSyncNow(syncType.id)}
                    disabled={syncingTypes[syncType.id]}
                  >
                    {syncingTypes[syncType.id] ? (
                      <>
                        <span style={styles.spinner} /> Syncing...
                      </>
                    ) : (
                      'Sync Now'
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* API Health Tab */}
        <div style={{ ...styles.tabContent, ...(activeTab === 'api-health' ? styles.tabContentActive : {}) }}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Rate Limit & Performance</div>
            <div style={styles.apiCallsContainer}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>8,234</div>
                <div style={styles.statLabel}>Calls Remaining (today)</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>1,766</div>
                <div style={styles.statLabel}>Calls Used (today)</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>243ms</div>
                <div style={styles.statLabel}>Avg Response Time</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>0.12%</div>
                <div style={styles.statLabel}>Error Rate</div>
              </div>
            </div>

            <svg width="100%" height="200" style={{ marginBottom: '24px' }} viewBox="0 0 600 200">
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: '#22C55E', stopOpacity: 1 }} />
                  <stop offset="50%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#EF4444', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <text x="300" y="30" textAnchor="middle" style={{ fill: '#FFFFFF', fontSize: '16px', fontWeight: '600' }}>
                API Rate Limit Gauge
              </text>
              <rect x="50" y="70" width="500" height="20" rx="10" style={{ fill: '#1E1E1E' }} />
              <rect x="50" y="70" width="411" height="20" rx="10" style={{ fill: 'url(#gaugeGradient)' }} />
              <text x="300" y="160" textAnchor="middle" style={{ fill: '#999999', fontSize: '12px' }}>
                8,234 / 10,000 API calls remaining this hour
              </text>
            </svg>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Recent API Calls</div>
            <div style={styles.logsContainer}>
              <div style={{ ...styles.logEntry, borderTop: '1px solid #1E1E1E', paddingTop: '0', marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: '#666666' }}>Timestamp</div>
                <div style={{ fontSize: '11px', color: '#666666' }}>Endpoint</div>
                <div style={{ fontSize: '11px', color: '#666666' }}>Method</div>
                <div style={{ fontSize: '11px', color: '#666666' }}>Status</div>
                <div style={{ fontSize: '11px', color: '#666666' }}>Duration</div>
              </div>
              {MOCK_API_LOGS.map((log, idx) => (
                <div key={idx} style={styles.logEntry}>
                  <div style={styles.logTimestamp}>{log.timestamp}</div>
                  <div style={styles.logEndpoint}>{log.endpoint}</div>
                  <div style={styles.logMethod}>{log.method}</div>
                  <div style={styles.logStatusOk}>{log.status}</div>
                  <div style={styles.logDuration}>{log.duration}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Error Log</div>
            <div style={styles.logsContainer}>
              {MOCK_ERROR_LOGS.length > 0 ? (
                MOCK_ERROR_LOGS.map((log, idx) => (
                  <div key={idx} style={{ ...styles.logEntry, display: 'block', marginBottom: '12px' }}>
                    <div style={styles.logTimestamp}>{log.timestamp} - {log.endpoint} ({log.method})</div>
                    <div style={{ ...styles.logStatusError, marginTop: '4px' }}>Status {log.status}: {log.error}</div>
                    <div style={{ color: '#666666', fontSize: '11px', marginTop: '4px', fontFamily: 'monospace' }}>
                      {log.stack}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#666666', textAlign: 'center', padding: '32px' }}>No errors recorded</div>
              )}
            </div>
          </div>
        </div>

        {/* Marketplace Settings Tab */}
        <div style={{ ...styles.tabContent, ...(activeTab === 'marketplace-settings' ? styles.tabContentActive : {}) }}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Marketplace Configuration</div>
            <p style={{ ...styles.helpText, marginBottom: '24px' }}>
              Enable or disable selling on each marketplace. Manage seller IDs and sync preferences per region.
            </p>

            <div style={styles.marketplaceGrid}>
              {MARKETPLACES.map(marketplace => (
                <div key={marketplace.code} style={styles.marketplaceCard}>
                  <div style={styles.marketplaceHeader}>
                    <span style={styles.marketplaceFlag}>{marketplace.flag}</span>
                    <div>
                      <div style={styles.marketplaceName}>{marketplace.name}</div>
                      <div style={styles.marketplaceInfo}>{marketplace.code}</div>
                    </div>
                  </div>

                  <div style={{ ...styles.statusBadge, ...styles.statusConnected }}>
                    {marketplaceStates[marketplace.code]?.status || 'Disconnected'}
                  </div>

                  <div style={styles.marketplaceInfo}>
                    <strong>Currency:</strong> {marketplace.currency}
                  </div>
                  <div style={styles.marketplaceInfo}>
                    <strong>Last Sync:</strong> 2 hours ago
                  </div>

                  <div style={styles.marketplaceToggleContainer}>
                    <div style={styles.toggle}>
                      <label style={{ ...styles.label, marginBottom: '0' }}>Enabled</label>
                      <button
                        style={{
                          ...styles.toggleSwitch,
                          ...(marketplaceStates[marketplace.code]?.enabled ? styles.toggleSwitchActive : {}),
                        }}
                        onClick={() => toggleMarketplace(marketplace.code)}
                      >
                        <div style={{
                          ...styles.toggleThumb,
                          ...(marketplaceStates[marketplace.code]?.enabled ? styles.toggleThumbActive : {}),
                        }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
