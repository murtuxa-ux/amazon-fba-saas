import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const Scout = () => {
  const [activeTab, setActiveTab] = useState('single');
  const [singleAsin, setSingleAsin] = useState('');
  const [singleMarketplace, setSingleMarketplace] = useState(1);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleResult, setSingleResult] = useState(null);
  const [singleError, setSingleError] = useState('');

  const [bulkAsins, setBulkAsins] = useState('');
  const [bulkMarketplace, setBulkMarketplace] = useState(1);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkError, setBulkError] = useState('');

  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const marketplaces = [
    { label: 'US', id: 1 },
    { label: 'UK', id: 2 },
    { label: 'DE', id: 3 },
    { label: 'FR', id: 4 },
    { label: 'JP', id: 5 },
    { label: 'CA', id: 6 },
    { label: 'IN', id: 9 },
    { label: 'IT', id: 10 },
    { label: 'ES', id: 11 },
  ];

  // Fetch scout history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/scout`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      setHistoryData(Array.isArray(data) ? data : []);
    } catch (error) {
      setHistoryError(error.message || 'Failed to fetch history');
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSingleScout = async () => {
    if (!singleAsin.trim()) {
      setSingleError('Please enter an ASIN');
      return;
    }

    setSingleLoading(true);
    setSingleError('');
    setSingleResult(null);

    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/scout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asin: singleAsin.trim().toUpperCase(),
          domain_id: singleMarketplace,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      setSingleResult(data);
    } catch (error) {
      setSingleError(error.message || 'Failed to scout ASIN');
      setSingleResult(null);
    } finally {
      setSingleLoading(false);
    }
  };

  const handleBulkScout = async () => {
    const asinList = bulkAsins
      .split('\n')
      .map(a => a.trim().toUpperCase())
      .filter(a => a.length > 0);

    if (asinList.length === 0) {
      setBulkError('Please enter at least one ASIN');
      return;
    }

    setBulkLoading(true);
    setBulkError('');
    setBulkResults([]);

    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/scout/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asins: asinList,
          domain_id: bulkMarketplace,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      setBulkResults(Array.isArray(data) ? data : []);
    } catch (error) {
      setBulkError(error.message || 'Failed to bulk scout');
      setBulkResults([]);
    } finally {
      setBulkLoading(false);
    }
  };

  const getVerdictStyle = (verdict) => {
    if (!verdict) return {};
    const verdictLower = verdict.toLowerCase();
    if (verdictLower === 'buy') {
      return { background: '#1a5a1a', color: '#4ade80', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' };
    }
    if (verdictLower === 'maybe') {
      return { background: '#5a4a1a', color: '#facc15', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' };
    }
    if (verdictLower === 'skip') {
      return { background: '#5a1a1a', color: '#f87171', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' };
    }
    return {};
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '24px 32px', marginLeft: '250px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 8px 0', color: '#FFFFFF', fontSize: '32px', fontWeight: 'bold' }}>FBA Product Scout</h1>
          <p style={{ margin: '0', color: '#B0B0B0', fontSize: '14px' }}>Analyze products and identify profitable sourcing opportunities</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #1E1E1E', paddingBottom: '16px' }}>
          {[
            { id: 'single', label: 'Single Scout' },
            { id: 'bulk', label: 'Bulk Scout' },
            { id: 'history', label: 'Scout History' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: activeTab === tab.id ? '#FFD700' : 'transparent',
                color: activeTab === tab.id ? '#0A0A0A' : '#B0B0B0',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? 'bold' : '500',
                borderRadius: '4px',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Single Scout Tab */}
        {activeTab === 'single' && (
          <div>
            <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ margin: '0 0 20px 0', color: '#FFFFFF', fontSize: '18px', fontWeight: 'bold' }}>Look Up Single ASIN</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px auto', gap: '12px', alignItems: 'flex-end' }}>
                {/* ASIN Input */}
                <div>
                  <label style={{ display: 'block', color: '#B0B0B0', fontSize: '12px', marginBottom: '8px', fontWeight: '500' }}>ASIN</label>
                  <input
                    type="text"
                    value={singleAsin}
                    onChange={(e) => setSingleAsin(e.target.value)}
                    placeholder="e.g., B0ABCDEF12"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#0A0A0A',
                      border: '1px solid #1E1E1E',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Marketplace Dropdown */}
                <div>
                  <label style={{ display: 'block', color: '#B0B0B0', fontSize: '12px', marginBottom: '8px', fontWeight: '500' }}>Marketplace</label>
                  <select
                    value={singleMarketplace}
                    onChange={(e) => setSingleMarketplace(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#0A0A0A',
                      border: '1px solid #1E1E1E',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                    }}
                  >
                    {marketplaces.map(mp => (
                      <option key={mp.id} value={mp.id}>
                        {mp.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scout Button */}
                <button
                  onClick={handleSingleScout}
                  disabled={singleLoading}
                  style={{
                    padding: '10px 24px',
                    background: singleLoading ? '#B39700' : '#FFD700',
                    color: '#0A0A0A',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: singleLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s',
                  }}
                >
                  {singleLoading ? 'Scouting...' : 'Lookup ASIN'}
                </button>
              </div>

              {singleError && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#3a1a1a', border: '1px solid #5a1a1a', borderRadius: '4px', color: '#f87171', fontSize: '14px' }}>
                  {singleError}
                </div>
              )}
            </div>

            {/* Single Scout Result */}
            {singleResult && (
              <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', color: '#FFFFFF', fontSize: '18px', fontWeight: 'bold' }}>
                        {singleResult.title || 'N/A'}
                      </h3>
                      <p style={{ margin: '0', color: '#B0B0B0', fontSize: '14px' }}>
                        {singleResult.brand ? `Brand: ${singleResult.brand}` : ''} {singleResult.category ? `| Category: ${singleResult.category}` : ''}
                      </p>
                    </div>
                    <div style={getVerdictStyle(singleResult.verdict)}>
                      {singleResult.verdict || 'N/A'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <div style={{ background: '#0A0A0A', padding: '12px', borderRadius: '4px', border: '1px solid #1E1E1E' }}>
                      <p style={{ margin: '0 0 4px 0', color: '#B0B0B0', fontSize: '12px' }}>BSR</p>
                      <p style={{ margin: '0', color: '#FFD700', fontSize: '16px', fontWeight: 'bold' }}>{singleResult.bsr || 'N/A'}</p>
                    </div>
                    <div style={{ background: '#0A0A0A', padding: '12px', borderRadius: '4px', border: '1px solid #1E1E1E' }}>
                      <p style={{ margin: '0 0 4px 0', color: '#B0B0B0', fontSize: '12px' }}>Price</p>
                      <p style={{ margin: '0', color: '#FFD700', fontSize: '16px', fontWeight: 'bold' }}>${singleResult.price || 'N/A'}</p>
                    </div>
                    <div style={{ background: '#0A0A0A', padding: '12px', borderRadius: '4px', border: '1px solid #1E1E1E' }}>
                      <p style={{ margin: '0 0 4px 0', color: '#B0B0B0', fontSize: '12px' }}>FBA Sellers</p>
                      <p style={{ margin: '0', color: '#FFD700', fontSize: '16px', fontWeight: 'bold' }}>{singleResult.fba_sellers || 'N/A'}</p>
                    </div>
                    <div style={{ background: '#0A0A0A', padding: '12px', borderRadius: '4px', border: '1px solid #1E1E1E' }}>
                      <p style={{ margin: '0 0 4px 0', color: '#B0B0B0', fontSize: '12px' }}>Monthly Sales</p>
                      <p style={{ margin: '0', color: '#FFD700', fontSize: '16px', fontWeight: 'bold' }}>{singleResult.monthly_sales_est || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Profit Analysis */}
                <div style={{ borderTop: '1px solid #1E1E1E', paddingTop: '24px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#FFFFFF', fontSize: '14px', fontWeight: 'bold' }}>Profit Analysis</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ background: '#0A0A0A', padding: '12px', borderRadius: '4px', border: '1px solid #1E1E1E' }}>
                      <p style={{ margin: '0 0 4px 0', color: '#B0B0B0', fontSize: '12px' }}>Buy Price</p>
                      <p style={{ margin: '0', color: '#4ade80', fontSize: '16px', fontWeight: 'bold' }}>${singleResult.buy_price || 'N/A'}</p>
                    </div>
                    <div style={{ background: '#0A0A0A', padding: '12px', borderRadius: '4px', border: '1px solid #1E1E1E' }}>
                      <p style={{ margin: '0 0 4px 0', color: '#B0B0B0', fontSize: '12px' }}>Sell Price</p>
                      <p style={{ margin: '0', color: '#4ade80', fontSize: '16px', fontWeight: 'bold' }}>${singleResult.sell_price || 'N/A'}</p>
                    </div>
                    <div style={{ background: '#0A0A0A', padding: '12px', borderRadius: '4px', border: '1px solid #1E1E1E' }}>
                      <p style={{ margin: '0 0 4px 0', color: '#B0B0B0', fontSize: '12px' }}>Net Profit</p>
                      <p style={{ margin: '0', color: '#4ade80', fontSize: '16px', fontWeight: 'bold' }}>${singleResult.net_profit || 'N/A'}</p>
                    </div>
                    <div style={{ background: '#0A0A0A', padding: '12px', borderRadius: '4px', border: '1px solid #1E1E1E' }}>
                      <p style={{ margin: '0 0 4px 0', color: '#B0B0B0', fontSize: '12px' }}>FBA Fee</p>
                      <p style={{ margin: '0', color: '#f87171', fontSize: '16px', fontWeight: 'bold' }}>${singleResult.fba_fee || 'N/A'}</p>
                    </div>
                    <div style={{ background: '#0A0A0A', padding: '12px', borderRadius: '4px', border: '1px solid #1E1E1E' }}>
                      <p style={{ margin: '0 0 4px 0', color: '#B0B0B0', fontSize: '12px' }}>Referral Fee</p>
                      <p style={{ margin: '0', color: '#f87171', fontSize: '16px', fontWeight: 'bold' }}>${singleResult.referral_fee || 'N/A'}</p>
                    </div>
                    <div style={{ background: '#0A0A0A', padding: '12px', borderRadius: '4px', border: '1px solid #1E1E1E' }}>
                      <p style={{ margin: '0 0 4px 0', color: '#B0B0B0', fontSize: '12px' }}>Score</p>
                      <p style={{ margin: '0', color: '#FFD700', fontSize: '16px', fontWeight: 'bold' }}>{singleResult.score || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bulk Scout Tab */}
        {activeTab === 'bulk' && (
          <div>
            <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ margin: '0 0 20px 0', color: '#FFFFFF', fontSize: '18px', fontWeight: 'bold' }}>Scout Multiple ASINs</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' }}>
                {/* ASINs Textarea */}
                <div>
                  <label style={{ display: 'block', color: '#B0B0B0', fontSize: '12px', marginBottom: '8px', fontWeight: '500' }}>ASINs (one per line)</label>
                  <textarea
                    value={bulkAsins}
                    onChange={(e) => setBulkAsins(e.target.value)}
                    placeholder="B0ABCDEF12&#10;B0BCDEFGH34&#10;B0CDEFGHI56"
                    style={{
                      width: '100%',
                      height: '150px',
                      padding: '12px',
                      background: '#0A0A0A',
                      border: '1px solid #1E1E1E',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Marketplace & Button */}
                <div>
                  <label style={{ display: 'block', color: '#B0B0B0', fontSize: '12px', marginBottom: '8px', fontWeight: '500' }}>Marketplace</label>
                  <select
                    value={bulkMarketplace}
                    onChange={(e) => setBulkMarketplace(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#0A0A0A',
                      border: '1px solid #1E1E1E',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      marginBottom: '12px',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                    }}
                  >
                    {marketplaces.map(mp => (
                      <option key={mp.id} value={mp.id}>
                        {mp.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkScout}
                    disabled={bulkLoading}
                    style={{
                      width: '100%',
                      padding: '10px 24px',
                      background: bulkLoading ? '#B39700' : '#FFD700',
                      color: '#0A0A0A',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: bulkLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      transition: 'all 0.2s',
                    }}
                  >
                    {bulkLoading ? 'Scouting...' : 'Scout All'}
                  </button>
                </div>
              </div>

              {bulkError && (
                <div style={{ padding: '12px', background: '#3a1a1a', border: '1px solid #5a1a1a', borderRadius: '4px', color: '#f87171', fontSize: '14px' }}>
                  {bulkError}
                </div>
              )}
            </div>

            {/* Bulk Results Table */}
            {bulkResults.length > 0 && (
              <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '24px', overflow: 'x' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#FFFFFF', fontSize: '16px', fontWeight: 'bold' }}>
                  Results ({bulkResults.length} products)
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                        <th style={{ textAlign: 'left', padding: '12px 0', color: '#B0B0B0', fontWeight: '500' }}>ASIN</th>
                        <th style={{ textAlign: 'left', padding: '12px 0', color: '#B0B0B0', fontWeight: '500' }}>Title</th>
                        <th style={{ textAlign: 'left', padding: '12px 0', color: '#B0B0B0', fontWeight: '500' }}>Price</th>
                        <th style={{ textAlign: 'left', padding: '12px 0', color: '#B0B0B0', fontWeight: '500' }}>BSR</th>
                        <th style={{ textAlign: 'left', padding: '12px 0', color: '#B0B0B0', fontWeight: '500' }}>FBA Sellers</th>
                        <th style={{ textAlign: 'left', padding: '12px 0', color: '#B0B0B0', fontWeight: '500' }}>Score</th>
                        <th style={{ textAlign: 'left', padding: '12px 0', color: '#B0B0B0', fontWeight: '500' }}>Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkResults.map((product, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #1E1E1E' }}>
                          <td style={{ padding: '12px 0', color: '#FFD700', fontWeight: 'bold' }}>{product.asin || 'N/A'}</td>
                          <td style={{ padding: '12px 0', color: '#FFFFFF' }}>{product.title || 'N/A'}</td>
                          <td style={{ padding: '12px 0', color: '#4ade80' }}>${product.price || 'N/A'}</td>
                          <td style={{ padding: '12px 0', color: '#B0B0B0' }}>{product.bsr || 'N/A'}</td>
                          <td style={{ padding: '12px 0', color: '#B0B0B0' }}>{product.fba_sellers || 'N/A'}</td>
                          <td style={{ padding: '12px 0', color: '#FFD700', fontWeight: 'bold' }}>{product.score || 'N/A'}</td>
                          <td style={{ padding: '12px 0' }}>
                            <div style={getVerdictStyle(product.verdict)}>
                              {product.verdict || 'N/A'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scout History Tab */}
        {activeTab === 'history' && (
          <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '24px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#FFFFFF', fontSize: '18px', fontWeight: 'bold' }}>Scout History</h2>

            {historyError && (
              <div style={{ padding: '12px', background: '#3a1a1a', border: '1px solid #5a1a1a', borderRadius: '4px', color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>
                {historyError}
              </div>
            )}

            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#B0B0B0' }}>
                <p>Loading history...</p>
              </div>
            ) : historyData.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: '#B0B0B0', fontWeight: '500' }}>ASIN</th>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: '#B0B0B0', fontWeight: '500' }}>Title</th>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: '#B0B0B0', fontWeight: '500' }}>Brand</th>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: '#B0B0B0', fontWeight: '500' }}>Score</th>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: '#B0B0B0', fontWeight: '500' }}>Verdict</th>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: '#B0B0B0', fontWeight: '500' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1E1E1E' }}>
                        <td style={{ padding: '12px 0', color: '#FFD700', fontWeight: 'bold' }}>{item.asin || 'N/A'}</td>
                        <td style={{ padding: '12px 0', color: '#FFFFFF' }}>{item.title || 'N/A'}</td>
                        <td style={{ padding: '12px 0', color: '#B0B0B0' }}>{item.brand || 'N/A'}</td>
                        <td style={{ padding: '12px 0', color: '#FFD700', fontWeight: 'bold' }}>{item.score || 'N/A'}</td>
                        <td style={{ padding: '12px 0' }}>
                          <div style={getVerdictStyle(item.verdict)}>
                            {item.verdict || 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 0', color: '#B0B0B0' }}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#B0B0B0' }}>
                <p>No scout history yet. Start scouting products to build your history.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scout;
