import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const ScoutPage = () => {
  const [activeTab, setActiveTab] = useState('single');
  const [singleAsin, setSingleAsin] = useState('');
  const [singleDomain, setSingleDomain] = useState(1);
  const [bulkAsins, setBulkAsins] = useState('');
  const [bulkDomain, setBulkDomain] = useState(1);

  const [singleResults, setSingleResults] = useState(null);
  const [bulkResults, setBulkResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');

  const [singleLoading, setSingleLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);

  const [singleError, setSingleError] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const marketplaces = [
    { name: 'US', domain_id: 1 },
    { name: 'UK', domain_id: 2 },
    { name: 'CA', domain_id: 3 },
    { name: 'DE', domain_id: 4 },
    { name: 'FR', domain_id: 5 },
    { name: 'IT', domain_id: 6 },
    { name: 'ES', domain_id: 7 },
    { name: 'JP', domain_id: 8 },
    { name: 'AU', domain_id: 9 },
  ];

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ecomera_token');
    }
    return null;
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const getVerdictBadge = (score) => {
    if (!score && score !== 0) return { color: '#FFD700', label: 'UNKNOWN' };
    if (score >= 7) return { color: '#10B981', label: 'GREEN' };
    if (score >= 4) return { color: '#F59E0B', label: 'YELLOW' };
    return { color: '#EF4444', label: 'RED' };
  };

  // Single Scout Submit
  const handleSingleScout = async (e) => {
    e.preventDefault();
    if (!singleAsin.trim()) {
      setSingleError('Please enter an ASIN');
      return;
    }

    setSingleLoading(true);
    setSingleError('');
    setSingleResults(null);

    // BUG-16/18 (Sprint 1.5): the Keepa-backed lookup takes ~6s on a
    // good day and can stall on rate-limited weeks. Cap the wait at
    // 20s so the user never sees an indefinite frozen state. The
    // AbortError is caught below and surfaced as a friendly message.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const token = getToken();
      // BUG-16: /scout is the CRUD endpoint (expects fully-populated
      // product rows). /scout/lookup is the Keepa-enrichment endpoint
      // that takes just an ASIN + domain and returns enriched fields.
      const response = await fetch(`${BASE_URL}/scout/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          asin: singleAsin.trim(),
          domain_id: singleDomain,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // BUG-17: surface backend's detail field instead of "Scout failed:"
        const errBody = await response.json().catch(() => ({}));
        throw new Error(`Scout failed: ${errBody.detail || response.statusText}`);
      }

      // BUG-16 Sprint 1.5: tolerate {data:{...}} or {result:{...}}
      // envelope variants so future backend shape changes don't
      // silently produce "no result" rendering. The Keepa enrichment
      // endpoint currently returns the flat object directly, but
      // matching by `asin` presence is a robust unwrap.
      const json = await response.json();
      const data = (json && json.asin) ? json : (json?.data || json?.result || json);
      setSingleResults(data);
    } catch (error) {
      if (error.name === 'AbortError') {
        setSingleError('Lookup timed out after 20 seconds. Keepa may be slow — please try again.');
      } else {
        setSingleError(error.message || 'Failed to scout ASIN');
      }
      console.error('Scout error:', error);
    } finally {
      clearTimeout(timeoutId);
      setSingleLoading(false);
    }
  };

  // Add Single Result to Pipeline
  const handleAddToPipeline = async () => {
    if (!singleResults) return;

    try {
      const token = getToken();
      const payload = {
        asin: singleResults.asin,
        title: singleResults.title,
        brand: singleResults.brand,
        category: singleResults.category,
        price: singleResults.price,
        bsr_rank: singleResults.bsr_rank,
        number_of_sellers: singleResults.number_of_sellers,
        rating: singleResults.rating,
        ratings_count: singleResults.ratings_count,
        fba_fees_estimate: singleResults.fba_fees_estimate,
        monthly_sales: singleResults.monthly_sales,
        verdict: getVerdictBadge(singleResults.score).label,
        score: singleResults.score,
        domain_id: singleDomain,
      };

      const response = await fetch(`${BASE_URL}/products-pipeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to add to pipeline');
      }

      showToast('Product added to pipeline successfully!');
    } catch (error) {
      setSingleError(error.message || 'Failed to add to pipeline');
      console.error('Pipeline error:', error);
    }
  };

  // Bulk Scout Submit
  const handleBulkScout = async (e) => {
    e.preventDefault();
    const asinList = bulkAsins
      .split('\n')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    if (asinList.length === 0) {
      setBulkError('Please enter at least one ASIN');
      return;
    }

    if (asinList.length > 25) {
      setBulkError('Maximum 25 ASINs per bulk scout');
      return;
    }

    setBulkLoading(true);
    setBulkError('');
    setBulkResults([]);
    setBulkProgress({ current: 0, total: asinList.length });

    try {
      const token = getToken();
      const results = [];

      for (let i = 0; i < asinList.length; i++) {
        try {
          // BUG-16: /scout is the CRUD endpoint, /scout/lookup is the
          // Keepa-enrichment endpoint. Same fix as the single-ASIN path.
          const response = await fetch(`${BASE_URL}/scout/lookup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              asin: asinList[i],
              domain_id: bulkDomain,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            results.push(data);
          }
        } catch (error) {
          console.error(`Failed to scout ${asinList[i]}:`, error);
        }

        setBulkProgress({ current: i + 1, total: asinList.length });
      }

      if (Array.isArray(results)) {
        setBulkResults(results);
      }
    } catch (error) {
      setBulkError(error.message || 'Bulk scout failed');
      console.error('Bulk scout error:', error);
    } finally {
      setBulkLoading(false);
    }
  };

  // Add All Winners to Pipeline
  const handleAddAllWinners = async () => {
    if (!Array.isArray(bulkResults) || bulkResults.length === 0) return;

    const winners = bulkResults.filter((r) => {
      const verdict = getVerdictBadge(r.score).label;
      return verdict === 'GREEN';
    });

    if (winners.length === 0) {
      showToast('No GREEN verdict items to add');
      return;
    }

    try {
      const token = getToken();
      let addedCount = 0;

      for (const result of winners) {
        try {
          const payload = {
            asin: result.asin,
            title: result.title,
            brand: result.brand,
            category: result.category,
            price: result.price,
            bsr_rank: result.bsr_rank,
            number_of_sellers: result.number_of_sellers,
            rating: result.rating,
            ratings_count: result.ratings_count,
            fba_fees_estimate: result.fba_fees_estimate,
            monthly_sales: result.monthly_sales,
            verdict: 'GREEN',
            score: result.score,
            domain_id: bulkDomain,
          };

          const response = await fetch(`${BASE_URL}/products-pipeline`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            addedCount++;
          }
        } catch (error) {
          console.error('Failed to add result to pipeline:', error);
        }
      }

      showToast(`${addedCount} products added to pipeline!`);
    } catch (error) {
      setBulkError(error.message || 'Failed to add winners');
      console.error('Bulk add error:', error);
    }
  };

  // Add Individual Bulk Result to Pipeline
  const handleAddBulkResultToPipeline = async (result) => {
    try {
      const token = getToken();
      const payload = {
        asin: result.asin,
        title: result.title,
        brand: result.brand,
        category: result.category,
        price: result.price,
        bsr_rank: result.bsr_rank,
        number_of_sellers: result.number_of_sellers,
        rating: result.rating,
        ratings_count: result.ratings_count,
        fba_fees_estimate: result.fba_fees_estimate,
        monthly_sales: result.monthly_sales,
        verdict: getVerdictBadge(result.score).label,
        score: result.score,
        domain_id: bulkDomain,
      };

      const response = await fetch(`${BASE_URL}/products-pipeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to add to pipeline');
      }

      showToast(`${result.asin} added to pipeline!`);
    } catch (error) {
      console.error('Add to pipeline error:', error);
      showToast('Failed to add to pipeline');
    }
  };

  // Fetch Scout History
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${BASE_URL}/scout/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setHistory(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
        } else {
          // Fallback to session storage
          const stored = sessionStorage.getItem('scout_history');
          if (stored) {
            setHistory(JSON.parse(stored));
          }
        }
      } else {
        // Fallback to session storage
        const stored = sessionStorage.getItem('scout_history');
        if (stored) {
          setHistory(JSON.parse(stored));
        }
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      const stored = sessionStorage.getItem('scout_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Clear History
  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all scout history?')) return;

    try {
      const token = getToken();
      await fetch(`${BASE_URL}/scout/history`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      setHistory([]);
      sessionStorage.removeItem('scout_history');
      showToast('History cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  // Export CSV
  const exportToCSV = () => {
    if (!Array.isArray(bulkResults) || bulkResults.length === 0) {
      showToast('No results to export');
      return;
    }

    try {
      const headers = ['ASIN', 'Title', 'Brand', 'BSR', 'Price', 'Sellers', 'Rating', 'Verdict'];
      const rows = bulkResults.map((r) => [
        r.asin,
        r.title || '',
        r.brand || '',
        r.bsr_rank || '',
        r.price ? `$${r.price.toFixed(2)}` : '',
        r.number_of_sellers || '',
        r.rating ? r.rating.toFixed(2) : '',
        getVerdictBadge(r.score).label,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((cell) => {
              const cellStr = String(cell);
              if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            })
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `scout-results-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Results exported to CSV');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export CSV');
    }
  };

  // Filter history by search
  const filteredHistory = Array.isArray(history)
    ? history.filter((item) =>
        (item.asin || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (item.title || '').toLowerCase().includes(searchFilter.toLowerCase())
      )
    : [];

  const containerStyle = {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    color: '#FFFFFF',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  const mainContentStyle = {
    flex: 1,
    marginLeft: '250px',
    padding: '32px',
  };

  const tabsStyle = {
    display: 'flex',
    gap: '16px',
    borderBottom: '1px solid #1E1E1E',
    marginBottom: '32px',
  };

  const tabButtonStyle = (isActive) => ({
    padding: '12px 24px',
    background: 'none',
    border: 'none',
    color: isActive ? '#FFD700' : '#FFFFFF',
    fontSize: '16px',
    fontWeight: isActive ? '600' : '400',
    cursor: 'pointer',
    borderBottom: isActive ? '2px solid #FFD700' : 'none',
    transition: 'all 0.3s ease',
  });

  const cardStyle = {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
  };

  const formGroupStyle = {
    marginBottom: '16px',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '500',
    fontSize: '14px',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0A0A0A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const selectStyle = {
    ...inputStyle,
  };

  const textareaStyle = {
    ...inputStyle,
    resize: 'vertical',
    minHeight: '150px',
    fontFamily: 'monospace',
  };

  const buttonStyle = {
    padding: '12px 24px',
    backgroundColor: '#FFD700',
    color: '#0A0A0A',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  };

  const secondaryButtonStyle = {
    padding: '12px 24px',
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginLeft: '8px',
  };

  const resultsContainerStyle = {
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '24px',
    marginTop: '24px',
  };

  const resultRowStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '16px',
  };

  const resultItemStyle = {
    padding: '12px',
    backgroundColor: '#0A0A0A',
    borderRadius: '6px',
    border: '1px solid #1E1E1E',
  };

  const resultLabelStyle = {
    fontSize: '12px',
    color: '#999999',
    marginBottom: '4px',
  };

  const resultValueStyle = {
    fontSize: '16px',
    fontWeight: '600',
  };

  const verdictBadgeStyle = (color) => ({
    display: 'inline-block',
    padding: '6px 12px',
    backgroundColor: color,
    color: color === '#FFD700' ? '#0A0A0A' : '#FFFFFF',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '700',
  });

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '16px',
  };

  const tableHeaderStyle = {
    backgroundColor: '#0A0A0A',
    borderBottom: '2px solid #1E1E1E',
    padding: '12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#FFD700',
  };

  const tableCellStyle = {
    padding: '12px',
    borderBottom: '1px solid #1E1E1E',
    fontSize: '14px',
  };

  const tableRowStyle = {
    transition: 'background-color 0.2s ease',
  };

  const progressBarStyle = {
    width: '100%',
    height: '8px',
    backgroundColor: '#1E1E1E',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '12px',
  };

  const progressFillStyle = {
    height: '100%',
    backgroundColor: '#FFD700',
    width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%`,
    transition: 'width 0.3s ease',
  };

  const spinnerStyle = {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid #1E1E1E',
    borderTop: '2px solid #FFD700',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  };

  const errorStyle = {
    backgroundColor: '#7F1D1D',
    border: '1px solid #991B1B',
    color: '#FCA5A5',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
  };

  const toastStyle = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    padding: '16px 24px',
    borderRadius: '6px',
    boxShadow: '0 10px 15px rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
    animation: 'slideIn 0.3s ease',
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        button:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }
        table tr:hover {
          background-color: #0A0A0A;
        }
      `}</style>

      <Sidebar />

      <div style={mainContentStyle}>
        <h1 style={{ marginTop: 0, marginBottom: '32px', fontSize: '32px', fontWeight: '700' }}>
          FBA Scout
        </h1>

        {/* Tabs */}
        <div style={tabsStyle}>
          <button
            style={tabButtonStyle(activeTab === 'single')}
            onClick={() => setActiveTab('single')}
          >
            Single Scout
          </button>
          <button
            style={tabButtonStyle(activeTab === 'bulk')}
            onClick={() => setActiveTab('bulk')}
          >
            Bulk Scout
          </button>
          <button
            style={tabButtonStyle(activeTab === 'history')}
            onClick={() => setActiveTab('history')}
          >
            Scout History
          </button>
        </div>

        {/* Single Scout Tab */}
        {activeTab === 'single' && (
          <div>
            <div style={cardStyle}>
              <form onSubmit={handleSingleScout}>
                {singleError && <div style={errorStyle}>{singleError}</div>}

                <div style={formGroupStyle}>
                  <label style={labelStyle}>ASIN</label>
                  <input
                    type="text"
                    style={inputStyle}
                    placeholder="e.g., B0D5NBNC8Z"
                    value={singleAsin}
                    onChange={(e) => setSingleAsin(e.target.value)}
                    required
                  />
                </div>

                <div style={formGroupStyle}>
                  <label style={labelStyle}>Marketplace</label>
                  <select
                    style={selectStyle}
                    value={singleDomain}
                    onChange={(e) => setSingleDomain(Number(e.target.value))}
                  >
                    {marketplaces.map((m) => (
                      <option key={m.domain_id} value={m.domain_id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button type="submit" style={buttonStyle} disabled={singleLoading}>
                  {singleLoading ? (
                    <>
                      <span style={spinnerStyle} /> Scouting...
                    </>
                  ) : (
                    'Lookup ASIN'
                  )}
                </button>
              </form>
            </div>

            {/* BUG-18 Sprint 1.5: visible inline progress banner.
                The button's "Scouting..." text alone wasn't enough
                feedback during the 6+ second Keepa fetch — users
                reported "no spinner, no error" because the button
                state was easy to miss. This banner sits directly
                above the results card and is unmissable. */}
            {singleLoading && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: '#1A1A1A',
                  border: '1px solid #FFD000',
                  borderRadius: '6px',
                  color: '#FFD000',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={spinnerStyle} />
                Looking up <code style={{ color: '#FFFFFF' }}>{singleAsin}</code> on Keepa… this can take up to 10 seconds.
              </div>
            )}

            {/* Single Results */}
            {singleResults && (
              <div style={resultsContainerStyle}>
                <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Scout Results</h2>

                <div style={resultRowStyle}>
                  <div style={resultItemStyle}>
                    <div style={resultLabelStyle}>Product Title</div>
                    <div style={resultValueStyle}>{singleResults.title || 'N/A'}</div>
                  </div>
                  <div style={resultItemStyle}>
                    <div style={resultLabelStyle}>Brand</div>
                    <div style={resultValueStyle}>{singleResults.brand || 'N/A'}</div>
                  </div>
                </div>

                <div style={resultRowStyle}>
                  <div style={resultItemStyle}>
                    <div style={resultLabelStyle}>Category</div>
                    <div style={resultValueStyle}>{singleResults.category || 'N/A'}</div>
                  </div>
                  <div style={resultItemStyle}>
                    <div style={resultLabelStyle}>BSR Rank</div>
                    <div style={resultValueStyle}>{singleResults.bsr_rank || 'N/A'}</div>
                  </div>
                </div>

                <div style={resultRowStyle}>
                  <div style={resultItemStyle}>
                    <div style={resultLabelStyle}>Buy Box Price</div>
                    <div style={resultValueStyle}>
                      {singleResults.price ? `$${singleResults.price.toFixed(2)}` : 'N/A'}
                    </div>
                  </div>
                  <div style={resultItemStyle}>
                    <div style={resultLabelStyle}>FBA Fees Estimate</div>
                    <div style={resultValueStyle}>
                      {singleResults.fba_fees_estimate
                        ? `$${singleResults.fba_fees_estimate.toFixed(2)}`
                        : 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={resultRowStyle}>
                  <div style={resultItemStyle}>
                    <div style={resultLabelStyle}>Number of Sellers</div>
                    <div style={resultValueStyle}>{singleResults.number_of_sellers || 'N/A'}</div>
                  </div>
                  <div style={resultItemStyle}>
                    <div style={resultLabelStyle}>Average Rating</div>
                    <div style={resultValueStyle}>
                      {singleResults.rating ? singleResults.rating.toFixed(2) : 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={resultRowStyle}>
                  <div style={resultItemStyle}>
                    <div style={resultLabelStyle}>Ratings Count</div>
                    <div style={resultValueStyle}>{singleResults.ratings_count || 'N/A'}</div>
                  </div>
                  <div style={resultItemStyle}>
                    <div style={resultLabelStyle}>Monthly Estimated Sales</div>
                    <div style={resultValueStyle}>{singleResults.monthly_sales || 'N/A'}</div>
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={resultLabelStyle}>Verdict</span>
                    <div style={verdictBadgeStyle(getVerdictBadge(singleResults.score).color)}>
                      {getVerdictBadge(singleResults.score).label}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#999999' }}>
                    Score: {singleResults.score ? singleResults.score.toFixed(2) : 'N/A'}/10
                  </div>
                </div>

                <button
                  style={buttonStyle}
                  onClick={handleAddToPipeline}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = '#E6C200')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = '#FFD700')}
                >
                  Add to Products Pipeline
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bulk Scout Tab */}
        {activeTab === 'bulk' && (
          <div>
            <div style={cardStyle}>
              <form onSubmit={handleBulkScout}>
                {bulkError && <div style={errorStyle}>{bulkError}</div>}

                <div style={formGroupStyle}>
                  <label style={labelStyle}>ASINs (one per line, max 25)</label>
                  <textarea
                    style={textareaStyle}
                    placeholder="B0D5NBNC8Z&#10;B0D1234ABC&#10;B0D5678XYZ"
                    value={bulkAsins}
                    onChange={(e) => setBulkAsins(e.target.value)}
                  />
                </div>

                <div style={formGroupStyle}>
                  <label style={labelStyle}>Marketplace</label>
                  <select
                    style={selectStyle}
                    value={bulkDomain}
                    onChange={(e) => setBulkDomain(Number(e.target.value))}
                  >
                    {marketplaces.map((m) => (
                      <option key={m.domain_id} value={m.domain_id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button type="submit" style={buttonStyle} disabled={bulkLoading}>
                  {bulkLoading ? (
                    <>
                      <span style={spinnerStyle} /> Scouting...
                    </>
                  ) : (
                    'Scout All'
                  )}
                </button>
              </form>

              {bulkLoading && bulkProgress.total > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                    Progress: {bulkProgress.current} of {bulkProgress.total}
                  </div>
                  <div style={progressBarStyle}>
                    <div style={progressFillStyle} />
                  </div>
                </div>
              )}
            </div>

            {/* Bulk Results Table */}
            {Array.isArray(bulkResults) && bulkResults.length > 0 && (
              <div style={resultsContainerStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0 }}>Results ({bulkResults.length})</h2>
                  <div>
                    <button
                      style={buttonStyle}
                      onClick={exportToCSV}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = '#E6C200')}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = '#FFD700')}
                    >
                      Export Results CSV
                    </button>
                    <button
                      style={secondaryButtonStyle}
                      onClick={handleAddAllWinners}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = '#1E1E1E')}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = '#1E1E1E')}
                    >
                      Add All Winners to Pipeline
                    </button>
                  </div>
                </div>

                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>ASIN</th>
                      <th style={tableHeaderStyle}>Title</th>
                      <th style={tableHeaderStyle}>BSR</th>
                      <th style={tableHeaderStyle}>Price</th>
                      <th style={tableHeaderStyle}>Sellers</th>
                      <th style={tableHeaderStyle}>Verdict</th>
                      <th style={tableHeaderStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResults.map((result, idx) => (
                      <tr key={idx} style={tableRowStyle}>
                        <td style={tableCellStyle}>{result.asin}</td>
                        <td style={{ ...tableCellStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {result.title || 'N/A'}
                        </td>
                        <td style={tableCellStyle}>{result.bsr_rank || 'N/A'}</td>
                        <td style={tableCellStyle}>
                          {result.price ? `$${result.price.toFixed(2)}` : 'N/A'}
                        </td>
                        <td style={tableCellStyle}>{result.number_of_sellers || 'N/A'}</td>
                        <td style={tableCellStyle}>
                          <span style={verdictBadgeStyle(getVerdictBadge(result.score).color)}>
                            {getVerdictBadge(result.score).label}
                          </span>
                        </td>
                        <td style={tableCellStyle}>
                          <button
                            style={{ ...secondaryButtonStyle, marginLeft: 0, padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleAddBulkResultToPipeline(result)}
                            onMouseEnter={(e) => (e.target.style.backgroundColor = '#2A2A2A')}
                            onMouseLeave={(e) => (e.target.style.backgroundColor = '#1E1E1E')}
                          >
                            Add
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Scout History Tab */}
        {activeTab === 'history' && (
          <div>
            <div style={cardStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Search</label>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="Filter by ASIN or title..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>

              <button
                style={secondaryButtonStyle}
                onClick={handleClearHistory}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#2A2A2A')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#1E1E1E')}
              >
                Clear History
              </button>
            </div>

            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <span style={spinnerStyle} /> Loading history...
              </div>
            ) : Array.isArray(filteredHistory) && filteredHistory.length > 0 ? (
              <div style={resultsContainerStyle}>
                <h2 style={{ marginTop: 0, marginBottom: '16px' }}>
                  History ({filteredHistory.length})
                </h2>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Date</th>
                      <th style={tableHeaderStyle}>ASIN</th>
                      <th style={tableHeaderStyle}>Title</th>
                      <th style={tableHeaderStyle}>BSR</th>
                      <th style={tableHeaderStyle}>Price</th>
                      <th style={tableHeaderStyle}>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((item, idx) => (
                      <tr key={idx} style={tableRowStyle}>
                        <td style={tableCellStyle}>
                          {item.date
                            ? new Date(item.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                              })
                            : 'N/A'}
                        </td>
                        <td style={tableCellStyle}>{item.asin || 'N/A'}</td>
                        <td style={{ ...tableCellStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.title || 'N/A'}
                        </td>
                        <td style={tableCellStyle}>{item.bsr_rank || 'N/A'}</td>
                        <td style={tableCellStyle}>
                          {item.price ? `$${item.price.toFixed(2)}` : 'N/A'}
                        </td>
                        <td style={tableCellStyle}>
                          <span style={verdictBadgeStyle(getVerdictBadge(item.score).color)}>
                            {getVerdictBadge(item.score).label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ ...cardStyle, textAlign: 'center', color: '#999999' }}>
                No scout history found.
              </div>
            )}
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && <div style={toastStyle}>{toastMessage}</div>}
      </div>
    </div>
  );
};

export default ScoutPage;
