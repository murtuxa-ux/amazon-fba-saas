import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

export default function AnalyzePage() {
  // ====== State Management ======
  const [tab, setTab] = useState('single');
  const [asin, setAsin] = useState('');
  const [cost, setCost] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [category, setCategory] = useState('General');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [localCalculation, setLocalCalculation] = useState(false);

  // Batch analysis state
  const [batchAsins, setBatchAsins] = useState('');
  const [batchCost, setBatchCost] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState([]);
  const [batchProgress, setBatchProgress] = useState(0);

  const BASE_URL = 'https://amazon-fba-saas-production.up.railway.app';

  // ====== Fetch history on mount ======
  useEffect(() => {
    fetchHistory();
  }, []);

  // ====== API Functions ======
  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('ecomera_token');
      if (!token) {
        console.log('No auth token found');
        return;
      }

      const response = await fetch(`${BASE_URL}/analyze/history`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setHistory(data);
        } else if (data.data && Array.isArray(data.data)) {
          setHistory(data.data);
        }
      }
    } catch (err) {
      console.log('History fetch failed, using session history');
    }
  };

  const localFbaCalculation = (sellPrice, costAmount, weightAmount) => {
    const actualWeight = weightAmount && parseFloat(weightAmount) > 0 ? parseFloat(weightAmount) : 1;
    const actualSellPrice = parseFloat(sellPrice);
    const actualCost = parseFloat(costAmount);

    // Referral Fee (15%)
    const referralFee = actualSellPrice * 0.15;

    // FBA Fulfillment Fee
    let fbaFee;
    if (actualWeight <= 1) {
      fbaFee = 3.22;
    } else if (actualWeight <= 2) {
      fbaFee = 3.4 + (actualWeight - 1) * 0.39;
    } else {
      fbaFee = 3.4 + 0.39 + (actualWeight - 2) * 0.44;
    }

    // Storage Fee
    const storageFee = 0.87;

    // Total Fees
    const totalFees = referralFee + fbaFee + storageFee;

    // Profit
    const profit = actualSellPrice - actualCost - totalFees;

    // ROI & Margin
    const roi = actualCost > 0 ? (profit / actualCost) * 100 : 0;
    const margin = actualSellPrice > 0 ? (profit / actualSellPrice) * 100 : 0;

    return {
      referralFee,
      fbaFee,
      storageFee,
      totalFees,
      profit,
      roi,
      margin,
    };
  };

  const analyzeProduct = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLocalCalculation(false);

    if (!asin.trim() || !cost) {
      setError('ASIN and Cost are required');
      return;
    }

    const sellPriceValue = sellPrice || null;
    setLoading(true);

    try {
      const token = localStorage.getItem('ecomera_token');
      const payload = {
        asin: asin.trim(),
        cost: parseFloat(cost),
        sell_price: sellPriceValue ? parseFloat(sellPriceValue) : null,
        category,
        weight: weight ? parseFloat(weight) : null,
      };

      let response = await fetch(`${BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      setResult(data);
      setLocalCalculation(false);

      // Add to local history
      const historyEntry = {
        asin: asin.trim(),
        cost: parseFloat(cost),
        sell_price: data.sell_price || parseFloat(sellPrice),
        profit: data.profit,
        roi: data.roi,
        margin: data.margin,
        timestamp: new Date().toISOString(),
      };
      setHistory([historyEntry, ...history]);
    } catch (err) {
      console.log('API failed, using local calculation:', err.message);

      // Fallback to local calculation
      if (!sellPrice) {
        setError('Selling Price is required for local calculation');
        setLoading(false);
        return;
      }

      const fees = localFbaCalculation(sellPrice, cost, weight);
      const localResult = {
        asin: asin.trim(),
        sell_price: parseFloat(sellPrice),
        cost: parseFloat(cost),
        referral_fee: fees.referralFee,
        fba_fee: fees.fbaFee,
        storage_fee: fees.storageFee,
        total_fees: fees.totalFees,
        profit: fees.profit,
        roi: fees.roi,
        margin: fees.margin,
        category,
        weight: weight ? parseFloat(weight) : 1,
      };

      setResult(localResult);
      setLocalCalculation(true);

      // Add to local history
      const historyEntry = {
        asin: asin.trim(),
        cost: parseFloat(cost),
        sell_price: parseFloat(sellPrice),
        profit: fees.profit,
        roi: fees.roi,
        margin: fees.margin,
        timestamp: new Date().toISOString(),
      };
      setHistory([historyEntry, ...history]);
    } finally {
      setLoading(false);
    }
  };

  const analyzeBatch = async (e) => {
    e.preventDefault();
    setError('');
    setBatchResults([]);

    if (!batchAsins.trim() || !batchCost) {
      setError('ASINs and Cost are required');
      return;
    }

    const asins = batchAsins
      .split('\n')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    if (asins.length === 0) {
      setError('Please enter at least one ASIN');
      return;
    }

    setBatchLoading(true);
    const results = [];

    for (let i = 0; i < asins.length; i++) {
      try {
        const token = localStorage.getItem('ecomera_token');
        const payload = {
          asin: asins[i],
          cost: parseFloat(batchCost),
          sell_price: null,
          category: 'General',
          weight: null,
        };

        const response = await fetch(`${BASE_URL}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          results.push({
            asin: asins[i],
            ...data,
            success: true,
          });
        } else {
          results.push({
            asin: asins[i],
            success: false,
            error: 'Analysis failed',
          });
        }
      } catch (err) {
        results.push({
          asin: asins[i],
          success: false,
          error: err.message,
        });
      }

      setBatchProgress(((i + 1) / asins.length) * 100);
    }

    setBatchResults(results);
    setBatchLoading(false);
  };

  // ====== Helper Functions ======
  const getVerdictBadge = (roi) => {
    if (roi > 30) {
      return {
        text: 'WINNER',
        bg: '#1a4d1a',
        color: '#4ade80',
      };
    } else if (roi >= 15) {
      return {
        text: 'POTENTIAL',
        bg: '#4d4d1a',
        color: '#fbbf24',
      };
    } else {
      return {
        text: 'PASS',
        bg: '#4d1a1a',
        color: '#f87171',
      };
    }
  };

  const getProfitColor = (profit) => {
    return profit >= 0 ? '#4ade80' : '#f87171';
  };

  const getRoiColor = (roi) => {
    if (roi > 30) return '#4ade80';
    if (roi >= 15) return '#fbbf24';
    return '#f87171';
  };

  const formatMoney = (value) => {
    return `$${parseFloat(value).toFixed(2)}`;
  };

  const formatPercent = (value) => {
    return `${parseFloat(value).toFixed(1)}%`;
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ====== Styles ======
  const styles = {
    outerContainer: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    container: {
      flex: 1,
      marginLeft: '250px',
      padding: '32px',
    },
    header: {
      maxWidth: '1200px',
      margin: '0 auto 40px',
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      marginBottom: '10px',
      color: '#FFD700',
    },
    subtitle: {
      fontSize: '14px',
      color: '#888888',
      marginBottom: '30px',
    },
    tabContainer: {
      display: 'flex',
      gap: '10px',
      marginBottom: '30px',
      borderBottom: '1px solid #1E1E1E',
    },
    tab: (isActive) => ({
      padding: '12px 20px',
      backgroundColor: 'transparent',
      border: 'none',
      borderBottom: isActive ? '2px solid #FFD700' : 'none',
      color: isActive ? '#FFD700' : '#888888',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: isActive ? 'bold' : 'normal',
      transition: 'color 0.2s',
    }),
    card: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      maxWidth: '1200px',
      margin: '0 auto 20px',
    },
    formGroup: {
      marginBottom: '15px',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: 'bold',
      marginBottom: '6px',
      color: '#CCCCCC',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      backgroundColor: '#1a1a1a',
      border: '1px solid #1E1E1E',
      borderRadius: '4px',
      color: '#ffffff',
      fontSize: '14px',
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      backgroundColor: '#1a1a1a',
      border: '1px solid #1E1E1E',
      borderRadius: '4px',
      color: '#ffffff',
      fontSize: '14px',
      boxSizing: 'border-box',
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '20px',
    },
    button: {
      padding: '12px 24px',
      backgroundColor: '#FFD700',
      border: 'none',
      borderRadius: '4px',
      color: '#000000',
      fontWeight: 'bold',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    buttonHover: {
      backgroundColor: '#FFC700',
    },
    spinner: {
      display: 'inline-block',
      width: '16px',
      height: '16px',
      border: '2px solid #888888',
      borderTop: '2px solid #FFD700',
      borderRadius: '50%',
      animation: 'spin 0.6s linear infinite',
    },
    error: {
      backgroundColor: '#4d1a1a',
      border: '1px solid #f87171',
      color: '#f87171',
      padding: '12px',
      borderRadius: '4px',
      marginBottom: '15px',
      fontSize: '13px',
    },
    notice: {
      backgroundColor: '#4d4d1a',
      border: '1px solid #fbbf24',
      color: '#fbbf24',
      padding: '12px',
      borderRadius: '4px',
      marginBottom: '15px',
      fontSize: '13px',
    },
    resultGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '15px',
      marginBottom: '20px',
    },
    resultItem: {
      backgroundColor: '#1a1a1a',
      border: '1px solid #1E1E1E',
      borderRadius: '4px',
      padding: '15px',
    },
    resultLabel: {
      fontSize: '12px',
      color: '#888888',
      marginBottom: '6px',
      textTransform: 'uppercase',
    },
    resultValue: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#ffffff',
    },
    verdictBadge: (verdict) => ({
      backgroundColor: verdict.bg,
      border: `1px solid ${verdict.color}`,
      color: verdict.color,
      padding: '8px 16px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      display: 'inline-block',
    }),
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px',
    },
    th: {
      backgroundColor: '#1a1a1a',
      border: '1px solid #1E1E1E',
      padding: '12px',
      textAlign: 'left',
      color: '#FFD700',
      fontWeight: 'bold',
    },
    td: {
      border: '1px solid #1E1E1E',
      padding: '12px',
      color: '#ffffff',
    },
    tableRow: {
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    tableRowHover: {
      backgroundColor: '#1a1a1a',
    },
    textarea: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#1a1a1a',
      border: '1px solid #1E1E1E',
      borderRadius: '4px',
      color: '#ffffff',
      fontSize: '13px',
      fontFamily: 'monospace',
      minHeight: '150px',
      boxSizing: 'border-box',
    },
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: '#1a1a1a',
      border: '1px solid #1E1E1E',
      borderRadius: '4px',
      marginBottom: '15px',
      overflow: 'hidden',
    },
    progressFill: (percent) => ({
      height: '100%',
      backgroundColor: '#FFD700',
      width: `${percent}%`,
      transition: 'width 0.3s ease',
    }),
  };

  // ====== Component: Profit Breakdown Chart ======
  const ProfitBreakdownChart = ({ result }) => {
    const cost = result.cost;
    const referral = result.referral_fee || 0;
    const fba = result.fba_fee || 0;
    const storage = result.storage_fee || 0;
    const profit = Math.max(result.profit, 0);

    const total = cost + referral + fba + storage + profit;
    const costPercent = (cost / total) * 100;
    const referralPercent = (referral / total) * 100;
    const fbaPercent = (fba / total) * 100;
    const storagePercent = (storage / total) * 100;
    const profitPercent = (profit / total) * 100;

    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#888888' }}>
          PROFIT BREAKDOWN
        </div>
        <svg width="100%" height="60" viewBox="0 0 1000 60" style={{ marginBottom: '10px' }}>
          <rect x={0} y={15} width={(costPercent / 100) * 1000} height={30} fill="#FF6B6B" />
          <rect x={(costPercent / 100) * 1000} y={15} width={(referralPercent / 100) * 1000} height={30} fill="#FF8E72" />
          <rect x={((costPercent + referralPercent) / 100) * 1000} y={15} width={(fbaPercent / 100) * 1000} height={30} fill="#FFA94D" />
          <rect x={((costPercent + referralPercent + fbaPercent) / 100) * 1000} y={15} width={(storagePercent / 100) * 1000} height={30} fill="#FFD93D" />
          <rect x={((costPercent + referralPercent + fbaPercent + storagePercent) / 100) * 1000} y={15} width={(profitPercent / 100) * 1000} height={30} fill="#6BCB77" />
        </svg>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', fontSize: '12px' }}>
          <div>
            <span style={{ color: '#FF6B6B' }}>■</span> Cost: {formatMoney(cost)}
          </div>
          <div>
            <span style={{ color: '#FF8E72' }}>■</span> Referral: {formatMoney(referral)}
          </div>
          <div>
            <span style={{ color: '#FFA94D' }}>■</span> FBA: {formatMoney(fba)}
          </div>
          <div>
            <span style={{ color: '#FFD93D' }}>■</span> Storage: {formatMoney(storage)}
          </div>
          <div>
            <span style={{ color: '#6BCB77' }}>■</span> Profit: {formatMoney(profit)}
          </div>
        </div>
      </div>
    );
  };

  // ====== Main Render ======
  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          button:hover {
            opacity: 0.9;
          }
          tr:hover {
            background-color: #1a1a1a !important;
          }
        `}
      </style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>ASIN Analyzer</div>
        <div style={styles.subtitle}>Calculate FBA profitability and analyze product potential</div>
      </div>

      {/* Tab Navigation */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={styles.tabContainer}>
          <button style={styles.tab(tab === 'single')} onClick={() => setTab('single')}>
            Single Analysis
          </button>
          <button style={styles.tab(tab === 'batch')} onClick={() => setTab('batch')}>
            Batch Analysis
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ ...styles.card, ...styles.error }}>
          {error}
        </div>
      )}

      {/* LOCAL CALCULATION: SINGLE ANALYSIS TAB */}
      {tab === 'single' && (
        <>
          {/* Analysis Form */}
          <div style={styles.card}>
            <form onSubmit={analyzeProduct}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>ASIN *</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={asin}
                    onChange={(e) => setAsin(e.target.value)}
                    placeholder="e.g., B08EXAMPLE"
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Your Cost ($) *</label>
                  <input
                    style={styles.input}
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Selling Price ($)</label>
                  <input
                    style={styles.input}
                    type="number"
                    step="0.01"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    placeholder="Leave blank to fetch from Amazon"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Category</label>
                  <select style={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option>General</option>
                    <option>Grocery</option>
                    <option>Health & Beauty</option>
                    <option>Electronics</option>
                    <option>Home & Kitchen</option>
                    <option>Toys & Games</option>
                  </select>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Weight (lbs)</label>
                  <input
                    style={styles.input}
                    type="number"
                    step="0.01"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <button
                style={styles.button}
                type="submit"
                disabled={loading}
                onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#FFC700')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#FFD700')}
              >
                {loading ? (
                  <>
                    <div style={{ ...styles.spinner, display: 'inline-block', marginRight: '8px' }} />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Product'
                )}
              </button>
            </form>
          </div>

          {/* Local Calculation Notice */}
          {result && localCalculation && (
            <div style={{ ...styles.card, ...styles.notice }}>
              Using local calculation (API unavailable)
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div style={styles.card}>
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ ...styles.resultLabel, marginBottom: '5px' }}>ASIN</div>
                  <div style={{ ...styles.resultValue, color: '#FFD700', fontSize: '24px' }}>
                    {result.asin}
                  </div>
                </div>
                <div style={styles.verdictBadge(getVerdictBadge(result.roi))}>
                  {getVerdictBadge(result.roi).text}
                </div>
              </div>

              <div style={styles.resultGrid}>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>Sell Price</div>
                  <div style={styles.resultValue}>{formatMoney(result.sell_price)}</div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>Your Cost</div>
                  <div style={styles.resultValue}>{formatMoney(result.cost)}</div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>Referral Fee</div>
                  <div style={{ ...styles.resultValue, color: '#f87171' }}>
                    {formatMoney(result.referral_fee)}
                  </div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>FBA Fee</div>
                  <div style={{ ...styles.resultValue, color: '#f87171' }}>
                    {formatMoney(result.fba_fee)}
                  </div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>Storage Fee</div>
                  <div style={{ ...styles.resultValue, color: '#f87171' }}>
                    {formatMoney(result.storage_fee)}
                  </div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>Total Fees</div>
                  <div style={{ ...styles.resultValue, color: '#f87171' }}>
                    {formatMoney(result.total_fees)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  ...styles.resultItem,
                  marginBottom: '20px',
                  backgroundColor: 'transparent',
                  border: `2px solid ${getProfitColor(result.profit)}`,
                }}
              >
                <div style={styles.resultLabel}>Net Profit</div>
                <div style={{ ...styles.resultValue, color: getProfitColor(result.profit), fontSize: '28px' }}>
                  {formatMoney(result.profit)}
                </div>
              </div>

              <div style={styles.resultGrid}>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>ROI</div>
                  <div style={{ ...styles.resultValue, color: getRoiColor(result.roi) }}>
                    {formatPercent(result.roi)}
                  </div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>Profit Margin</div>
                  <div style={styles.resultValue}>{formatPercent(result.margin)}</div>
                </div>
              </div>

              <ProfitBreakdownChart result={result} />
            </div>
          )}

          {/* Analysis History */}
          {history.length > 0 && (
            <div style={styles.card}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', color: '#FFD700' }}>
                ANALYSIS HISTORY
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>ASIN</th>
                      <th style={styles.th}>Cost</th>
                      <th style={styles.th}>Sell Price</th>
                      <th style={styles.th}>Profit</th>
                      <th style={styles.th}>ROI</th>
                      <th style={styles.th}>Verdict</th>
                      <th style={styles.th}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(history) &&
                      history.map((item, idx) => (
                        <tr
                          key={idx}
                          style={styles.tableRow}
                          onClick={() => {
                            // Populate form with history item
                            setAsin(item.asin);
                            setCost(item.cost.toString());
                            setSellPrice(item.sell_price ? item.sell_price.toString() : '');
                          }}
                        >
                          <td style={styles.td}>{item.asin}</td>
                          <td style={styles.td}>{formatMoney(item.cost)}</td>
                          <td style={styles.td}>{formatMoney(item.sell_price)}</td>
                          <td style={{ ...styles.td, color: getProfitColor(item.profit) }}>
                            {formatMoney(item.profit)}
                          </td>
                          <td style={{ ...styles.td, color: getRoiColor(item.roi) }}>
                            {formatPercent(item.roi)}
                          </td>
                          <td style={styles.td}>
                            <span style={styles.verdictBadge(getVerdictBadge(item.roi))}>
                              {getVerdictBadge(item.roi).text}
                            </span>
                          </td>
                          <td style={styles.td}>{formatDate(item.timestamp)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* BATCH ANALYSIS TAB */}
      {tab === 'batch' && (
        <>
          {/* Batch Form */}
          <div style={styles.card}>
            <form onSubmit={analyzeBatch}>
              <div style={styles.formGroup}>
                <label style={styles.label}>ASINs (one per line) *</label>
                <textarea
                  style={styles.textarea}
                  value={batchAsins}
                  onChange={(e) => setBatchAsins(e.target.value)}
                  placeholder="B08EXAMPLE&#10;B09EXAMPLE&#10;B10EXAMPLE"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Your Cost ($) *</label>
                  <input
                    style={styles.input}
                    type="number"
                    step="0.01"
                    value={batchCost}
                    onChange={(e) => setBatchCost(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <button
                style={styles.button}
                type="submit"
                disabled={batchLoading}
                onMouseEnter={(e) => !batchLoading && (e.target.style.backgroundColor = '#FFC700')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#FFD700')}
              >
                {batchLoading ? (
                  <>
                    <div style={{ ...styles.spinner, display: 'inline-block', marginRight: '8px' }} />
                    Analyzing Batch...
                  </>
                ) : (
                  'Analyze Batch'
                )}
              </button>
            </form>

            {batchLoading && (
              <div style={{ marginTop: '20px' }}>
                <div style={styles.progressBar}>
                  <div style={styles.progressFill(batchProgress)} />
                </div>
                <div style={{ fontSize: '12px', color: '#888888' }}>
                  {Math.round(batchProgress)}% Complete
                </div>
              </div>
            )}
          </div>

          {/* Batch Results */}
          {batchResults.length > 0 && (
            <div style={styles.card}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', color: '#FFD700' }}>
                BATCH RESULTS ({batchResults.length})
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>ASIN</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Sell Price</th>
                      <th style={styles.th}>Profit</th>
                      <th style={styles.th}>ROI</th>
                      <th style={styles.th}>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(batchResults) &&
                      batchResults.map((item, idx) => (
                        <tr key={idx}>
                          <td style={styles.td}>{item.asin}</td>
                          <td style={styles.td}>
                            {item.success ? (
                              <span style={{ color: '#4ade80' }}>✓ Success</span>
                            ) : (
                              <span style={{ color: '#f87171' }}>✗ {item.error}</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            {item.success ? formatMoney(item.sell_price) : '—'}
                          </td>
                          <td style={styles.td}>
                            {item.success ? (
                              <span style={{ color: getProfitColor(item.profit) }}>
                                {formatMoney(item.profit)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td style={styles.td}>
                            {item.success ? (
                              <span style={{ color: getRoiColor(item.roi) }}>
                                {formatPercent(item.roi)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td style={styles.td}>
                            {item.success ? (
                              <span style={styles.verdictBadge(getVerdictBadge(item.roi))}>
                                {getVerdictBadge(item.roi).text}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
