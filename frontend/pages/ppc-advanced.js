import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const PPCAdvancedPage = () => {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Campaigns Tab State
  const [campaigns, setCampaigns] = useState([]);
  const [campaignTypeFilter, setCampaignTypeFilter] = useState('All');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('All');

  // Search Terms Tab State
  const [searchTerms, setSearchTerms] = useState([]);
  const [searchTermFilter, setSearchTermFilter] = useState('');
  const [searchTermSort, setSearchTermSort] = useState('');
  const [searchTermSortDir, setSearchTermSortDir] = useState('asc');

  // Dayparting Tab State
  const [daypartingData, setDaypartingData] = useState([]);
  const [daypartingMetric, setDaypartingMetric] = useState('roas');

  // Budget Pacing Tab State
  const [budgetCampaigns, setBudgetCampaigns] = useState([]);

  // Campaign Builder Tab State
  const [campaignBuilderForm, setCampaignBuilderForm] = useState({
    campaignName: '',
    type: 'SP',
    dailyBudget: '',
    startDate: '',
    targeting: 'auto',
    keywords: '',
    bidStrategy: 'down-only',
    defaultBid: '',
  });
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderError, setBuilderError] = useState('');
  const [builderSuccess, setBuilderSuccess] = useState('');

  const BASE_URL = 'https://amazon-fba-saas-production.up.railway.app';

  // Initialize token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('ecomera_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  // Fetch campaigns
  const fetchCampaigns = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/ppc/campaigns`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch search terms
  const fetchSearchTerms = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/ppc/search-terms`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSearchTerms(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch search terms');
      setSearchTerms([]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize dayparting data (mock)
  const initializeDayparting = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const basePerformance = [2.5, 1.8, 1.2, 0.9, 1.0, 1.5, 2.8, 3.5, 3.2, 2.9, 2.6, 2.4, 2.2, 2.1, 2.3, 2.6, 3.0, 3.4, 3.8, 3.5, 3.2, 2.8, 2.2, 1.8];
        data.push({
          hour,
          day,
          dayName: days[day],
          roas: basePerformance[hour] + (Math.random() - 0.5),
          sales: Math.floor(Math.random() * 5000) + 1000,
          spend: Math.floor(Math.random() * 2000) + 200,
          acos: Math.floor(Math.random() * 40) + 15,
        });
      }
    }
    setDaypartingData(data);
  };

  // Initialize budget pacing data
  const initializeBudgetPacing = () => {
    if (campaigns.length > 0) {
      const pacingData = campaigns.map(campaign => {
        const dailyBudget = parseFloat(campaign.dailyBudget) || 0;
        const todaySpend = Math.random() * dailyBudget;
        const monthlyBudget = dailyBudget * 30;
        const daysElapsed = 15;
        const projectedSpend = (todaySpend / daysElapsed) * 30;
        let status = 'On Track';
        if (projectedSpend < monthlyBudget * 0.85) status = 'Underspending';
        if (projectedSpend > monthlyBudget * 1.15) status = 'Overspending';
        return {
          ...campaign,
          dailyBudget,
          todaySpend,
          monthlyBudget,
          projectedSpend,
          status,
        };
      });
      setBudgetCampaigns(pacingData);
    }
  };

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'campaigns' && campaigns.length === 0) fetchCampaigns();
    if (tab === 'search-terms' && searchTerms.length === 0) fetchSearchTerms();
    if (tab === 'dayparting' && daypartingData.length === 0) initializeDayparting();
    if (tab === 'budget-pacing') initializeBudgetPacing();
  };

  // Handle campaign builder form submission
  const handleCampaignBuilderSubmit = async (e) => {
    e.preventDefault();
    setBuilderLoading(true);
    setBuilderError('');
    setBuilderSuccess('');

    try {
      const keywords = campaignBuilderForm.keywords
        .split('\n')
        .filter(k => k.trim())
        .map(k => k.trim());

      const payload = {
        campaignName: campaignBuilderForm.campaignName,
        type: campaignBuilderForm.type,
        dailyBudget: parseFloat(campaignBuilderForm.dailyBudget),
        startDate: campaignBuilderForm.startDate,
        targeting: campaignBuilderForm.targeting,
        keywords,
        bidStrategy: campaignBuilderForm.bidStrategy,
        defaultBid: parseFloat(campaignBuilderForm.defaultBid),
      };

      const res = await fetch(`${BASE_URL}/ppc/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setBuilderSuccess('Campaign created successfully!');
      setCampaignBuilderForm({
        campaignName: '',
        type: 'SP',
        dailyBudget: '',
        startDate: '',
        targeting: 'auto',
        keywords: '',
        bidStrategy: 'down-only',
        defaultBid: '',
      });
      setTimeout(() => setBuilderSuccess(''), 3000);
    } catch (err) {
      setBuilderError(`Failed to create campaign: ${err.message}`);
    } finally {
      setBuilderLoading(false);
    }
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(c => {
    const typeMatch = campaignTypeFilter === 'All' || c.type === campaignTypeFilter;
    const statusMatch = campaignStatusFilter === 'All' || c.status === campaignStatusFilter;
    return typeMatch && statusMatch;
  });

  // Filter and sort search terms
  let filteredSearchTerms = searchTerms.filter(st =>
    st.searchTerm?.toLowerCase().includes(searchTermFilter.toLowerCase())
  );
  if (searchTermSort) {
    filteredSearchTerms.sort((a, b) => {
      let aVal = a[searchTermSort];
      let bVal = b[searchTermSort];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (searchTermSortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }

  // Calculate performance summaries
  const calculateCampaignSummary = () => {
    const totalSpend = filteredCampaigns.reduce((sum, c) => sum + (parseFloat(c.spend) || 0), 0);
    const totalSales = filteredCampaigns.reduce((sum, c) => sum + (parseFloat(c.sales) || 0), 0);
    const avgAcos = filteredCampaigns.length > 0
      ? filteredCampaigns.reduce((sum, c) => sum + (parseFloat(c.acos) || 0), 0) / filteredCampaigns.length
      : 0;
    const avgRoas = filteredCampaigns.length > 0
      ? filteredCampaigns.reduce((sum, c) => sum + (parseFloat(c.roas) || 0), 0) / filteredCampaigns.length
      : 0;
    return { totalSpend, totalSales, avgAcos, avgRoas };
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (val) => {
    const num = parseFloat(val) || 0;
    return `${num.toFixed(1)}%`;
  };

  const getAcosColor = (acos) => {
    const val = parseFloat(acos) || 0;
    if (val < 25) return '#00C851';
    if (val <= 35) return '#FFD700';
    return '#FF4444';
  };

  const getRoasColor = (roas) => {
    const val = parseFloat(roas) || 0;
    if (val > 3) return '#00C851';
    if (val >= 2) return '#FFD700';
    return '#FF4444';
  };

  const styles = {
    outerContainer: {
      display: 'flex',
      backgroundColor: '#0A0A0A',
      color: '#FFFFFF',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    container: {
      flex: 1,
      marginLeft: '250px',
      padding: '32px',
    },
    header: {
      marginBottom: '30px',
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      marginBottom: '10px',
    },
    subtitle: {
      fontSize: '14px',
      color: '#AAAAAA',
    },
    tabsContainer: {
      display: 'flex',
      gap: '10px',
      marginBottom: '30px',
      borderBottom: '1px solid #1E1E1E',
      overflowX: 'auto',
    },
    tab: {
      padding: '12px 16px',
      border: 'none',
      backgroundColor: 'transparent',
      color: '#AAAAAA',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      borderBottom: '2px solid transparent',
      transition: 'all 0.3s',
    },
    tabActive: {
      color: '#FFD700',
      borderBottomColor: '#FFD700',
    },
    summaryCardsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '30px',
    },
    card: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '20px',
    },
    cardLabel: {
      fontSize: '12px',
      color: '#777777',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '8px',
    },
    cardValue: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#FFD700',
    },
    filterContainer: {
      display: 'flex',
      gap: '15px',
      marginBottom: '20px',
      flexWrap: 'wrap',
    },
    select: {
      backgroundColor: '#111111',
      color: '#FFFFFF',
      border: '1px solid #1E1E1E',
      borderRadius: '4px',
      padding: '8px 12px',
      fontSize: '13px',
      cursor: 'pointer',
    },
    input: {
      backgroundColor: '#111111',
      color: '#FFFFFF',
      border: '1px solid #1E1E1E',
      borderRadius: '4px',
      padding: '8px 12px',
      fontSize: '13px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '20px',
    },
    thead: {
      backgroundColor: '#1A1A1A',
      borderBottom: '2px solid #1E1E1E',
    },
    th: {
      padding: '12px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: '#FFD700',
      cursor: 'pointer',
      userSelect: 'none',
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #1E1E1E',
      fontSize: '13px',
    },
    tr: {
      transition: 'background-color 0.2s',
    },
    trHover: {
      backgroundColor: '#0F0F0F',
    },
    button: {
      backgroundColor: '#FFD700',
      color: '#000000',
      border: 'none',
      borderRadius: '4px',
      padding: '8px 12px',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    buttonSmall: {
      padding: '6px 10px',
      fontSize: '11px',
    },
    formContainer: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
    },
    formGroup: {
      marginBottom: '15px',
    },
    label: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '600',
      marginBottom: '6px',
      color: '#AAAAAA',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    textarea: {
      width: '100%',
      minHeight: '100px',
      backgroundColor: '#0A0A0A',
      color: '#FFFFFF',
      border: '1px solid #1E1E1E',
      borderRadius: '4px',
      padding: '10px',
      fontSize: '13px',
      fontFamily: 'monospace',
      boxSizing: 'border-box',
      resize: 'vertical',
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '15px',
    },
    grid3: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '15px',
    },
    loadingText: {
      color: '#FFD700',
      textAlign: 'center',
      padding: '20px',
    },
    errorText: {
      color: '#FF4444',
      textAlign: 'center',
      padding: '15px',
      backgroundColor: 'rgba(255, 68, 68, 0.1)',
      borderRadius: '4px',
      marginBottom: '15px',
    },
    successText: {
      color: '#00C851',
      textAlign: 'center',
      padding: '15px',
      backgroundColor: 'rgba(0, 200, 81, 0.1)',
      borderRadius: '4px',
      marginBottom: '15px',
    },
    heatmapContainer: {
      overflowX: 'auto',
      marginBottom: '20px',
    },
    heatmapGrid: {
      display: 'grid',
      gridTemplateColumns: 'auto ' + Array(24).fill('1fr').join(' '),
      gap: '4px',
      padding: '10px',
    },
    heatmapCell: {
      width: '40px',
      height: '40px',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '9px',
      cursor: 'pointer',
      transition: 'transform 0.2s',
    },
    heatmapLabel: {
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontWeight: '600',
      color: '#777777',
    },
    legend: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: '15px',
      fontSize: '12px',
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    progressBar: {
      width: '100%',
      height: '24px',
      backgroundColor: '#0A0A0A',
      borderRadius: '4px',
      overflow: 'hidden',
      border: '1px solid #1E1E1E',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#FFD700',
      transition: 'width 0.3s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontWeight: '600',
      color: '#000000',
    },
    budgetRow: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '6px',
      padding: '15px',
      marginBottom: '12px',
    },
    chartBarContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '15px',
    },
    chartBarLabel: {
      width: '150px',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    chartBar: {
      flex: 1,
      height: '24px',
      backgroundColor: '#FFD700',
      borderRadius: '4px',
      position: 'relative',
    },
    chartBarValue: {
      position: 'absolute',
      right: '8px',
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: '12px',
      fontWeight: '600',
      color: '#000000',
    },
  };

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Advanced PPC Automation</div>
        <div style={styles.subtitle}>Manage campaigns, search terms, dayparting, and budget pacing</div>
      </div>

      {error && <div style={styles.errorText}>{error}</div>}

      <div style={styles.tabsContainer}>
        {['campaigns', 'search-terms', 'dayparting', 'budget-pacing', 'campaign-builder'].map(t => (
          <button
            key={t}
            style={{
              ...styles.tab,
              ...(activeTab === t ? styles.tabActive : {}),
            }}
            onClick={() => handleTabChange(t)}
          >
            {t === 'campaigns' && 'Campaigns'}
            {t === 'search-terms' && 'Search Terms'}
            {t === 'dayparting' && 'Dayparting'}
            {t === 'budget-pacing' && 'Budget Pacing'}
            {t === 'campaign-builder' && 'Campaign Builder'}
          </button>
        ))}
      </div>

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div>
          {loading ? (
            <div style={styles.loadingText}>Loading campaigns...</div>
          ) : (
            <>
              {(() => {
                const { totalSpend, totalSales, avgAcos, avgRoas } = calculateCampaignSummary();
                return (
                  <div style={styles.summaryCardsContainer}>
                    <div style={styles.card}>
                      <div style={styles.cardLabel}>Total Spend</div>
                      <div style={styles.cardValue}>{formatCurrency(totalSpend)}</div>
                    </div>
                    <div style={styles.card}>
                      <div style={styles.cardLabel}>Total Sales</div>
                      <div style={styles.cardValue}>{formatCurrency(totalSales)}</div>
                    </div>
                    <div style={styles.card}>
                      <div style={styles.cardLabel}>Avg ACoS</div>
                      <div style={{ ...styles.cardValue, color: getAcosColor(avgAcos) }}>
                        {formatPercentage(avgAcos)}
                      </div>
                    </div>
                    <div style={styles.card}>
                      <div style={styles.cardLabel}>Avg ROAS</div>
                      <div style={{ ...styles.cardValue, color: getRoasColor(avgRoas) }}>
                        {avgRoas.toFixed(2)}x
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ marginBottom: '30px' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px' }}>Top 5 Campaigns by Sales</div>
                <svg style={{ width: '100%', height: '300px' }} viewBox="0 0 800 300">
                  <defs>
                    <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#FFA500', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                  {filteredCampaigns.slice().sort((a, b) => parseFloat(b.sales) - parseFloat(a.sales)).slice(0, 5).map((campaign, idx) => {
                    const maxSales = Math.max(...filteredCampaigns.slice().sort((a, b) => parseFloat(b.sales) - parseFloat(a.sales)).slice(0, 5).map(c => parseFloat(c.sales)));
                    const barWidth = (parseFloat(campaign.sales) / maxSales) * 700;
                    const y = 30 + idx * 50;
                    return (
                      <g key={idx}>
                        <text x="10" y={y + 12} style={{ fontSize: '12px', fill: '#AAAAAA' }}>
                          {campaign.name?.substring(0, 30)}
                        </text>
                        <rect x="220" y={y} width={barWidth} height="30" fill="url(#barGradient)" rx="4" />
                        <text x={220 + barWidth + 10} y={y + 18} style={{ fontSize: '12px', fill: '#FFFFFF' }}>
                          {formatCurrency(campaign.sales)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={styles.filterContainer}>
                  <select
                    style={styles.select}
                    value={campaignTypeFilter}
                    onChange={e => setCampaignTypeFilter(e.target.value)}
                  >
                    <option value="All">All Types</option>
                    <option value="Sponsored Products">Sponsored Products</option>
                    <option value="Sponsored Brands">Sponsored Brands</option>
                    <option value="Sponsored Display">Sponsored Display</option>
                  </select>
                  <select
                    style={styles.select}
                    value={campaignStatusFilter}
                    onChange={e => setCampaignStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <table style={styles.table}>
                <thead style={styles.thead}>
                  <tr>
                    <th style={styles.th}>Campaign Name</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Daily Budget</th>
                    <th style={styles.th}>Spend</th>
                    <th style={styles.th}>Sales</th>
                    <th style={styles.th}>ACoS</th>
                    <th style={styles.th}>ROAS</th>
                    <th style={styles.th}>TACOS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((campaign, idx) => (
                    <tr key={idx} style={styles.tr}>
                      <td style={styles.td}>{campaign.name || 'N/A'}</td>
                      <td style={styles.td}>{campaign.type || 'N/A'}</td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          backgroundColor: campaign.status === 'Active' ? '#00C85150' : campaign.status === 'Paused' ? '#FFD70050' : '#FF444450',
                          color: campaign.status === 'Active' ? '#00C851' : campaign.status === 'Paused' ? '#FFD700' : '#FF4444',
                          fontWeight: '600',
                        }}>
                          {campaign.status || 'N/A'}
                        </span>
                      </td>
                      <td style={styles.td}>{formatCurrency(campaign.dailyBudget)}</td>
                      <td style={styles.td}>{formatCurrency(campaign.spend)}</td>
                      <td style={styles.td}>{formatCurrency(campaign.sales)}</td>
                      <td style={{ ...styles.td, color: getAcosColor(campaign.acos) }}>
                        {formatPercentage(campaign.acos)}
                      </td>
                      <td style={{ ...styles.td, color: getRoasColor(campaign.roas) }}>
                        {parseFloat(campaign.roas || 0).toFixed(2)}x
                      </td>
                      <td style={styles.td}>{formatPercentage(campaign.tacos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCampaigns.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#777777' }}>
                  No campaigns found
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Search Terms Tab */}
      {activeTab === 'search-terms' && (
        <div>
          {loading ? (
            <div style={styles.loadingText}>Loading search terms...</div>
          ) : (
            <>
              <div style={{ marginBottom: '20px' }}>
                <input
                  style={{ ...styles.input, width: '300px' }}
                  type="text"
                  placeholder="Search terms..."
                  value={searchTermFilter}
                  onChange={e => setSearchTermFilter(e.target.value)}
                />
              </div>

              <table style={styles.table}>
                <thead style={styles.thead}>
                  <tr>
                    <th
                      style={{ ...styles.th, cursor: 'pointer' }}
                      onClick={() => {
                        setSearchTermSort('searchTerm');
                        setSearchTermSortDir(searchTermSort === 'searchTerm' ? (searchTermSortDir === 'asc' ? 'desc' : 'asc') : 'asc');
                      }}
                    >
                      Search Term {searchTermSort === 'searchTerm' && (searchTermSortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      style={{ ...styles.th, cursor: 'pointer' }}
                      onClick={() => {
                        setSearchTermSort('campaign');
                        setSearchTermSortDir(searchTermSort === 'campaign' ? (searchTermSortDir === 'asc' ? 'desc' : 'asc') : 'asc');
                      }}
                    >
                      Campaign {searchTermSort === 'campaign' && (searchTermSortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={styles.th}>Match Type</th>
                    <th
                      style={{ ...styles.th, cursor: 'pointer' }}
                      onClick={() => {
                        setSearchTermSort('impressions');
                        setSearchTermSortDir(searchTermSort === 'impressions' ? (searchTermSortDir === 'asc' ? 'desc' : 'asc') : 'asc');
                      }}
                    >
                      Impressions {searchTermSort === 'impressions' && (searchTermSortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      style={{ ...styles.th, cursor: 'pointer' }}
                      onClick={() => {
                        setSearchTermSort('clicks');
                        setSearchTermSortDir(searchTermSort === 'clicks' ? (searchTermSortDir === 'asc' ? 'desc' : 'asc') : 'asc');
                      }}
                    >
                      Clicks {searchTermSort === 'clicks' && (searchTermSortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={styles.th}>CTR</th>
                    <th style={styles.th}>Spend</th>
                    <th style={styles.th}>Sales</th>
                    <th style={styles.th}>ACoS</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSearchTerms.map((term, idx) => (
                    <tr key={idx} style={styles.tr}>
                      <td style={{
                        ...styles.td,
                        color: term.isNegative ? '#FF4444' : '#FFFFFF',
                        fontWeight: term.isNegative ? '600' : 'normal',
                      }}>
                        {term.searchTerm || 'N/A'}
                        {term.isNegative && ' (negative)'}
                      </td>
                      <td style={styles.td}>{term.campaign || 'N/A'}</td>
                      <td style={styles.td}>{term.matchType || 'N/A'}</td>
                      <td style={styles.td}>{term.impressions || 0}</td>
                      <td style={styles.td}>{term.clicks || 0}</td>
                      <td style={styles.td}>{formatPercentage(term.ctr)}</td>
                      <td style={styles.td}>{formatCurrency(term.spend)}</td>
                      <td style={styles.td}>{formatCurrency(term.sales)}</td>
                      <td style={{ ...styles.td, color: getAcosColor(term.acos) }}>
                        {formatPercentage(term.acos)}
                      </td>
                      <td style={styles.td}>
                        <button
                          style={{ ...styles.button, ...styles.buttonSmall }}
                          onClick={() => alert(`Add "${term.searchTerm}" as negative keyword`)}
                        >
                          Add Negative
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredSearchTerms.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#777777' }}>
                  No search terms found
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Dayparting Tab */}
      {activeTab === 'dayparting' && (
        <div>
          {daypartingData.length === 0 ? (
            <div style={styles.loadingText}>Initializing dayparting data...</div>
          ) : (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={styles.label}>Metric</label>
                <select
                  style={styles.select}
                  value={daypartingMetric}
                  onChange={e => setDaypartingMetric(e.target.value)}
                >
                  <option value="roas">ROAS</option>
                  <option value="sales">Sales</option>
                  <option value="spend">Spend</option>
                  <option value="acos">ACoS</option>
                </select>
              </div>

              <div style={styles.heatmapContainer}>
                <div style={styles.heatmapGrid}>
                  <div style={styles.heatmapLabel}></div>
                  {Array.from({ length: 24 }, (_, i) => (
                    <div key={`hour-${i}`} style={styles.heatmapLabel}>
                      {i}
                    </div>
                  ))}

                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIdx) => (
                    <React.Fragment key={`day-${dayIdx}`}>
                      <div style={styles.heatmapLabel}>{day}</div>
                      {Array.from({ length: 24 }, (_, hourIdx) => {
                        const cell = daypartingData.find(d => d.day === dayIdx && d.hour === hourIdx);
                        if (!cell) return <div key={`cell-${dayIdx}-${hourIdx}`} style={styles.heatmapCell}></div>;

                        let intensity = 0;
                        let value = 0;
                        if (daypartingMetric === 'roas') {
                          value = cell.roas;
                          intensity = Math.min(1, value / 4);
                        } else if (daypartingMetric === 'sales') {
                          value = cell.sales;
                          intensity = Math.min(1, value / 5000);
                        } else if (daypartingMetric === 'spend') {
                          value = cell.spend;
                          intensity = Math.min(1, value / 2000);
                        } else {
                          value = cell.acos;
                          intensity = 1 - Math.min(1, value / 50);
                        }

                        const color = daypartingMetric === 'acos'
                          ? `rgba(255, ${Math.floor(100 + intensity * 155)}, 68, ${0.3 + intensity * 0.7})`
                          : `rgba(0, ${Math.floor(200 + intensity * 55)}, 81, ${0.3 + intensity * 0.7})`;

                        return (
                          <div
                            key={`cell-${dayIdx}-${hourIdx}`}
                            style={{
                              ...styles.heatmapCell,
                              backgroundColor: color,
                              cursor: 'pointer',
                            }}
                            title={`${day} ${hourIdx}:00 - ${daypartingMetric}: ${value.toFixed(1)}`}
                          >
                            {intensity > 0.5 ? Math.floor(value) : ''}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div style={styles.legend}>
                <div style={styles.legendItem}>
                  <div style={{ width: '30px', height: '20px', backgroundColor: 'rgba(0, 200, 81, 0.3)' }}></div>
                  <span>Low {daypartingMetric === 'acos' ? '(High ACoS)' : '(Low Performance)'}</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{ width: '30px', height: '20px', backgroundColor: 'rgba(0, 200, 81, 0.7)' }}></div>
                  <span>Medium</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{ width: '30px', height: '20px', backgroundColor: 'rgba(0, 200, 81, 1)' }}></div>
                  <span>High {daypartingMetric === 'acos' ? '(Low ACoS)' : '(High Performance)'}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Budget Pacing Tab */}
      {activeTab === 'budget-pacing' && (
        <div>
          {budgetCampaigns.length === 0 ? (
            <div style={styles.loadingText}>Loading budget data...</div>
          ) : (
            <>
              <div style={styles.summaryCardsContainer}>
                <div style={styles.card}>
                  <div style={styles.cardLabel}>Total Daily Budget</div>
                  <div style={styles.cardValue}>
                    {formatCurrency(budgetCampaigns.reduce((sum, c) => sum + (parseFloat(c.dailyBudget) || 0), 0))}
                  </div>
                </div>
                <div style={styles.card}>
                  <div style={styles.cardLabel}>Today's Spend</div>
                  <div style={styles.cardValue}>
                    {formatCurrency(budgetCampaigns.reduce((sum, c) => sum + (parseFloat(c.todaySpend) || 0), 0))}
                  </div>
                </div>
                <div style={styles.card}>
                  <div style={styles.cardLabel}>Remaining Budget</div>
                  <div style={styles.cardValue}>
                    {formatCurrency(budgetCampaigns.reduce((sum, c) => sum + (parseFloat(c.dailyBudget) - parseFloat(c.todaySpend) || 0), 0))}
                  </div>
                </div>
                <div style={styles.card}>
                  <div style={styles.cardLabel}>Utilization %</div>
                  <div style={styles.cardValue}>
                    {((budgetCampaigns.reduce((sum, c) => sum + (parseFloat(c.todaySpend) || 0), 0) /
                      budgetCampaigns.reduce((sum, c) => sum + (parseFloat(c.dailyBudget) || 0), 0)) * 100 || 0).toFixed(1)}%
                  </div>
                </div>
              </div>

              {budgetCampaigns.map((campaign, idx) => {
                const utilization = (parseFloat(campaign.todaySpend) / parseFloat(campaign.dailyBudget)) * 100 || 0;
                const statusColor = campaign.status === 'On Track' ? '#00C851' : campaign.status === 'Underspending' ? '#FFD700' : '#FF4444';

                return (
                  <div key={idx} style={styles.budgetRow}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{campaign.name}</div>
                      <div style={{ fontSize: '13px', color: statusColor, fontWeight: '600' }}>
                        {campaign.status}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px', fontSize: '12px' }}>
                      <div>
                        <div style={{ color: '#777777', marginBottom: '4px' }}>Daily Budget</div>
                        <div>{formatCurrency(campaign.dailyBudget)}</div>
                      </div>
                      <div>
                        <div style={{ color: '#777777', marginBottom: '4px' }}>Today's Spend</div>
                        <div>{formatCurrency(campaign.todaySpend)}</div>
                      </div>
                      <div>
                        <div style={{ color: '#777777', marginBottom: '4px' }}>Monthly Budget</div>
                        <div>{formatCurrency(campaign.monthlyBudget)}</div>
                      </div>
                      <div>
                        <div style={{ color: '#777777', marginBottom: '4px' }}>Projected EOMonth Spend</div>
                        <div>{formatCurrency(campaign.projectedSpend)}</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', color: '#777777', marginBottom: '6px' }}>
                        Daily Utilization: {utilization.toFixed(1)}%
                      </div>
                      <div style={styles.progressBar}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${Math.min(100, utilization)}%`,
                            backgroundColor: utilization < 80 ? '#FFD700' : '#FF4444',
                          }}
                        >
                          {utilization.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Campaign Builder Tab */}
      {activeTab === 'campaign-builder' && (
        <div>
          {builderError && <div style={styles.errorText}>{builderError}</div>}
          {builderSuccess && <div style={styles.successText}>{builderSuccess}</div>}

          <div style={styles.grid2}>
            <div>
              <div style={styles.formContainer}>
                <form onSubmit={handleCampaignBuilderSubmit}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Campaign Name</label>
                    <input
                      style={styles.input}
                      type="text"
                      required
                      value={campaignBuilderForm.campaignName}
                      onChange={e => setCampaignBuilderForm({ ...campaignBuilderForm, campaignName: e.target.value })}
                      placeholder="e.g., Summer Sale 2024"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Campaign Type</label>
                    <select
                      style={styles.select}
                      required
                      value={campaignBuilderForm.type}
                      onChange={e => setCampaignBuilderForm({ ...campaignBuilderForm, type: e.target.value })}
                    >
                      <option value="SP">Sponsored Products</option>
                      <option value="SB">Sponsored Brands</option>
                      <option value="SD">Sponsored Display</option>
                    </select>
                  </div>

                  <div style={styles.grid2}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Daily Budget ($)</label>
                      <input
                        style={styles.input}
                        type="number"
                        required
                        step="0.01"
                        value={campaignBuilderForm.dailyBudget}
                        onChange={e => setCampaignBuilderForm({ ...campaignBuilderForm, dailyBudget: e.target.value })}
                        placeholder="50.00"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Default Bid ($)</label>
                      <input
                        style={styles.input}
                        type="number"
                        step="0.01"
                        value={campaignBuilderForm.defaultBid}
                        onChange={e => setCampaignBuilderForm({ ...campaignBuilderForm, defaultBid: e.target.value })}
                        placeholder="0.50"
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Start Date</label>
                    <input
                      style={styles.input}
                      type="date"
                      required
                      value={campaignBuilderForm.startDate}
                      onChange={e => setCampaignBuilderForm({ ...campaignBuilderForm, startDate: e.target.value })}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Targeting</label>
                    <select
                      style={styles.select}
                      value={campaignBuilderForm.targeting}
                      onChange={e => setCampaignBuilderForm({ ...campaignBuilderForm, targeting: e.target.value })}
                    >
                      <option value="auto">Auto</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>

                  {campaignBuilderForm.targeting === 'manual' && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Keywords (one per line)</label>
                      <textarea
                        style={styles.textarea}
                        value={campaignBuilderForm.keywords}
                        onChange={e => setCampaignBuilderForm({ ...campaignBuilderForm, keywords: e.target.value })}
                        placeholder="blue widget&#10;red widget&#10;large blue widget"
                      />
                    </div>
                  )}

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Bid Strategy</label>
                    <select
                      style={styles.select}
                      value={campaignBuilderForm.bidStrategy}
                      onChange={e => setCampaignBuilderForm({ ...campaignBuilderForm, bidStrategy: e.target.value })}
                    >
                      <option value="down-only">Down Only</option>
                      <option value="up-and-down">Up and Down</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    style={styles.button}
                    disabled={builderLoading}
                  >
                    {builderLoading ? 'Creating...' : 'Create Campaign'}
                  </button>
                </form>
              </div>
            </div>

            <div>
              <div style={styles.formContainer}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '15px' }}>Campaign Preview</div>

                <div style={{ fontSize: '12px', marginBottom: '12px' }}>
                  <div style={{ color: '#777777', marginBottom: '4px' }}>Campaign Name</div>
                  <div style={{ color: '#FFD700' }}>{campaignBuilderForm.campaignName || 'Not specified'}</div>
                </div>

                <div style={{ fontSize: '12px', marginBottom: '12px' }}>
                  <div style={{ color: '#777777', marginBottom: '4px' }}>Type</div>
                  <div>{campaignBuilderForm.type === 'SP' ? 'Sponsored Products' : campaignBuilderForm.type === 'SB' ? 'Sponsored Brands' : 'Sponsored Display'}</div>
                </div>

                <div style={{ fontSize: '12px', marginBottom: '12px' }}>
                  <div style={{ color: '#777777', marginBottom: '4px' }}>Daily Budget</div>
                  <div>{formatCurrency(campaignBuilderForm.dailyBudget)}</div>
                </div>

                <div style={{ fontSize: '12px', marginBottom: '12px' }}>
                  <div style={{ color: '#777777', marginBottom: '4px' }}>Default Bid</div>
                  <div>{formatCurrency(campaignBuilderForm.defaultBid)}</div>
                </div>

                <div style={{ fontSize: '12px', marginBottom: '12px' }}>
                  <div style={{ color: '#777777', marginBottom: '4px' }}>Start Date</div>
                  <div>{campaignBuilderForm.startDate || 'Not specified'}</div>
                </div>

                <div style={{ fontSize: '12px', marginBottom: '12px' }}>
                  <div style={{ color: '#777777', marginBottom: '4px' }}>Targeting</div>
                  <div>{campaignBuilderForm.targeting === 'auto' ? 'Automatic' : 'Manual'}</div>
                </div>

                {campaignBuilderForm.targeting === 'manual' && (
                  <div style={{ fontSize: '12px', marginBottom: '12px' }}>
                    <div style={{ color: '#777777', marginBottom: '4px' }}>Keywords</div>
                    <div style={{
                      maxHeight: '100px',
                      overflowY: 'auto',
                      backgroundColor: '#0A0A0A',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #1E1E1E',
                      fontSize: '11px',
                    }}>
                      {campaignBuilderForm.keywords.split('\n').filter(k => k.trim()).map((k, i) => (
                        <div key={i}>• {k}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '12px', marginBottom: '12px' }}>
                  <div style={{ color: '#777777', marginBottom: '4px' }}>Bid Strategy</div>
                  <div>
                    {campaignBuilderForm.bidStrategy === 'down-only' ? 'Down Only'
                      : campaignBuilderForm.bidStrategy === 'up-and-down' ? 'Up and Down'
                      : 'Fixed'}
                  </div>
                </div>

                <div style={{
                  fontSize: '12px',
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  borderRadius: '4px',
                  border: '1px solid #1E1E1E',
                  color: '#AAAAAA',
                }}>
                  Review the configuration above. Click "Create Campaign" to submit.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default PPCAdvancedPage;
