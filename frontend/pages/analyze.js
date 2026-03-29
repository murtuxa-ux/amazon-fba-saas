import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const CATEGORIES = [
  'General',
  'Grocery',
  'Health & Beauty',
  'Electronics',
  'Home & Kitchen',
  'Toys & Games'
];

export default function AnalyzePage() {
  // Form state
  const [asin, setAsin] = useState('');
  const [cost, setCost] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [category, setCategory] = useState('General');
  const [weight, setWeight] = useState('');

  // API state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch analysis history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const token = localStorage.getItem('ecomera_token');
      if (!token) {
        setHistory([]);
        return;
      }

      const response = await fetch(`${BASE_URL}/analyze/history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(Array.isArray(data) ? data : data.history || []);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const calculateFbaFee = (weightValue) => {
    const w = parseFloat(weightValue) || 0;
    if (w < 1) return 3.22;
    if (w < 2) return 4.75;
    if (w < 3) return 5.40;
    return 5.40 + (w - 3) * 0.40;
  };

  const calculateMetrics = (sellingPrice, costPrice, fbaFee, referralFee) => {
    const revenue = parseFloat(sellingPrice);
    const cogs = parseFloat(costPrice);
    const netProfit = revenue - cogs - fbaFee - referralFee;
    const roi = cogs > 0 ? (netProfit / cogs) * 100 : 0;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      revenue: revenue.toFixed(2),
      cogs: cogs.toFixed(2),
      fbaFee: fbaFee.toFixed(2),
      referralFee: referralFee.toFixed(2),
      netProfit: netProfit.toFixed(2),
      roi: roi.toFixed(2),
      margin: margin.toFixed(2)
    };
  };

  const getVerdictBadge = (roi) => {
    const roiValue = parseFloat(roi);
    if (roiValue > 30) {
      return { text: 'Strong Buy', color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.1)' };
    } else if (roiValue > 15) {
      return { text: 'Buy', color: '#2196F3', bg: 'rgba(33, 150, 243, 0.1)' };
    } else if (roiValue > 0) {
      return { text: 'Hold', color: '#FFC107', bg: 'rgba(255, 193, 7, 0.1)' };
    } else {
      return { text: 'Pass', color: '#F44336', bg: 'rgba(244, 67, 54, 0.1)' };
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setError('');
    setResults(null);

    // Validation
    if (!asin.trim()) {
      setError('ASIN is required');
      return;
    }
    if (!cost || isNaN(parseFloat(cost)) || parseFloat(cost) <= 0) {
      setError('Valid cost amount is required and must be greater than 0');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('ecomera_token');
      if (!token) {
        setError('Not authenticated. Please log in.');
        return;
      }

      const payload = {
        asin: asin.trim(),
        cost: parseFloat(cost),
        sell_price: sellPrice ? parseFloat(sellPrice) : null,
        category,
        weight: weight ? parseFloat(weight) : null
      };

      const response = await fetch(`${BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Analysis failed');
      }

      const data = await response.json();

      // Calculate metrics
      const finalSellPrice = data.current_price || parseFloat(sellPrice) || 0;
      const fbaFee = calculateFbaFee(data.weight || weight || 0);
      const referralFee = finalSellPrice * 0.15;
      const metrics = calculateMetrics(finalSellPrice, cost, fbaFee, referralFee);
      const verdict = getVerdictBadge(metrics.roi);

      setResults({
        productInfo: {
          title: data.title || 'N/A',
          brand: data.brand || 'N/A',
          category: data.category || category,
          bsr: data.bsr || 'N/A',
          currentPrice: finalSellPrice,
          fbaSellers: data.fba_sellers_count || 0
        },
        metrics,
        verdict
      });

      // Refresh history
      fetchHistory();
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'An error occurred during analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError('');
    setResults(null);
  };

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
      color: '#FFFFFF',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    },
    main: {
      flex: 1,
      marginLeft: '250px',
      padding: '40px',
      overflowY: 'auto'
    },
    header: {
      marginBottom: '40px'
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      marginBottom: '8px',
      color: '#FFFFFF'
    },
    subtitle: {
      fontSize: '14px',
      color: '#B0B0B0',
      fontWeight: '400'
    },
    card: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '24px'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '13px',
      fontWeight: '600',
      marginBottom: '8px',
      color: '#E0E0E0',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    input: {
      padding: '10px 12px',
      backgroundColor: '#1A1A1A',
      border: '1px solid #2A2A2A',
      borderRadius: '6px',
      color: '#FFFFFF',
      fontSize: '14px',
      fontFamily: 'inherit',
      outline: 'none',
      transition: 'border-color 0.2s'
    },
    inputFocus: {
      borderColor: '#FFD700'
    },
    select: {
      padding: '10px 12px',
      backgroundColor: '#1A1A1A',
      border: '1px solid #2A2A2A',
      borderRadius: '6px',
      color: '#FFFFFF',
      fontSize: '14px',
      fontFamily: 'inherit',
      outline: 'none',
      cursor: 'pointer'
    },
    buttonContainer: {
      display: 'flex',
      gap: '12px',
      marginTop: '28px'
    },
    button: {
      padding: '12px 24px',
      backgroundColor: '#FFD700',
      color: '#000000',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    buttonHover: {
      backgroundColor: '#FFF44F',
      transform: 'translateY(-1px)'
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none'
    },
    errorMessage: {
      backgroundColor: 'rgba(244, 67, 54, 0.1)',
      border: '1px solid #F44336',
      color: '#FF6B6B',
      padding: '12px 16px',
      borderRadius: '6px',
      marginBottom: '24px',
      fontSize: '13px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    errorDismiss: {
      background: 'none',
      border: 'none',
      color: '#FF6B6B',
      cursor: 'pointer',
      fontSize: '18px',
      padding: 0
    },
    spinner: {
      display: 'inline-block',
      width: '16px',
      height: '16px',
      border: '2px solid rgba(0, 0, 0, 0.2)',
      borderRadius: '50%',
      borderTopColor: '#000000',
      animation: 'spin 0.6s linear infinite'
    },
    resultsContainer: {
      marginTop: '40px'
    },
    resultCard: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '24px'
    },
    resultTitle: {
      fontSize: '16px',
      fontWeight: '700',
      marginBottom: '16px',
      color: '#FFFFFF'
    },
    resultGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '16px'
    },
    resultItem: {
      padding: '12px',
      backgroundColor: '#0A0A0A',
      borderRadius: '6px',
      border: '1px solid #1E1E1E'
    },
    resultLabel: {
      fontSize: '12px',
      color: '#909090',
      marginBottom: '4px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    resultValue: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#FFD700'
    },
    verdictBadge: {
      display: 'inline-block',
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '700',
      marginTop: '12px'
    },
    historyTable: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    historyTh: {
      backgroundColor: '#1A1A1A',
      padding: '12px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '700',
      borderBottom: '1px solid #1E1E1E',
      color: '#B0B0B0',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    historyTd: {
      padding: '12px',
      borderBottom: '1px solid #1E1E1E',
      fontSize: '13px',
      color: '#E0E0E0'
    },
    historyTr: {
      transition: 'background-color 0.2s'
    },
    historyTrHover: {
      backgroundColor: '#1A1A1A'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#707070'
    },
    emptyStateIcon: {
      fontSize: '32px',
      marginBottom: '16px'
    }
  };

  return (
    <div style={styles.container}>
      <Sidebar />
      <main style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>ASIN Analyzer</h1>
          <p style={styles.subtitle}>Analyze product profitability and get data-driven insights for wholesale opportunities</p>
        </div>

        {/* Analysis Form */}
        <div style={styles.card}>
          <form onSubmit={handleAnalyze}>
            <div style={styles.formGrid}>
              {/* ASIN */}
              <div style={styles.formGroup}>
                <label style={styles.label}>ASIN *</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="e.g., B0123456789"
                  value={asin}
                  onChange={(e) => setAsin(e.target.value)}
                  required
                />
              </div>

              {/* Cost */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Your Cost ($) *</label>
                <input
                  type="number"
                  style={styles.input}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                />
              </div>

              {/* Selling Price */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Selling Price ($)</label>
                <input
                  type="number"
                  style={styles.input}
                  placeholder="Leave blank to fetch from Amazon"
                  step="0.01"
                  min="0"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                />
              </div>

              {/* Category */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Category</label>
                <select
                  style={styles.select}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Weight */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Weight (lbs)</label>
                <input
                  type="number"
                  style={styles.input}
                  placeholder="Optional"
                  step="0.01"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
            </div>

            {/* Button Container */}
            <div style={styles.buttonContainer}>
              <button
                type="submit"
                style={{
                  ...styles.button,
                  ...(loading ? styles.buttonDisabled : {})
                }}
                disabled={loading}
                onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = styles.buttonHover.backgroundColor)}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#FFD700')}
              >
                {loading && <div style={styles.spinner} />}
                {loading ? 'Analyzing...' : 'Analyze Product'}
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div style={styles.errorMessage}>
            <span>{error}</span>
            <button
              style={styles.errorDismiss}
              onClick={handleRetry}
              type="button"
            >
              ×
            </button>
          </div>
        )}

        {/* Results */}
        {results && (
          <div style={styles.resultsContainer}>
            {/* Product Info */}
            <div style={styles.resultCard}>
              <h2 style={styles.resultTitle}>Product Information</h2>
              <div style={styles.resultGrid}>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>Title</div>
                  <div style={{ ...styles.resultValue, fontSize: '14px', color: '#E0E0E0' }}>
                    {results.productInfo.title}
                  </div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>Brand</div>
                  <div style={styles.resultValue}>{results.productInfo.brand}</div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>Category</div>
                  <div style={styles.resultValue}>{results.productInfo.category}</div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>BSR</div>
                  <div style={styles.resultValue}>{results.productInfo.bsr}</div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>Current Price</div>
                  <div style={styles.resultValue}>${parseFloat(results.productInfo.currentPrice).toFixed(2)}</div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>FBA Sellers</div>
                  <div style={styles.resultValue}>{results.productInfo.fbaSellers}</div>
                </div>
              </div>
            </div>

            {/* Profitability */}
            <div style={styles.resultCard}>
              <h2 style={styles.resultTitle}>Profitability Analysis</h2>
              <div style={styles.resultGrid}>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>Revenue</div>
                  <div style={styles.resultValue}>${results.metrics.revenue}</div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>COGS</div>
                  <div style={styles.resultValue}>${results.metrics.cogs}</div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>FBA Fee</div>
                  <div style={styles.resultValue}>${results.metrics.fbaFee}</div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>Referral Fee (15%)</div>
                  <div style={styles.resultValue}>${results.metrics.referralFee}</div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>Net Profit</div>
                  <div style={{
                    ...styles.resultValue,
                    color: parseFloat(results.metrics.netProfit) >= 0 ? '#4CAF50' : '#F44336'
                  }}>
                    ${results.metrics.netProfit}
                  </div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>ROI</div>
                  <div style={styles.resultValue}>{results.metrics.roi}%</div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>Margin</div>
                  <div style={styles.resultValue}>{results.metrics.margin}%</div>
                </div>
                <div style={styles.resultItem}>
                  <div style={styles.resultLabel}>Verdict</div>
                  <div style={{
                    ...styles.verdictBadge,
                    color: results.verdict.color,
                    backgroundColor: results.verdict.bg,
                    borderLeft: `3px solid ${results.verdict.color}`
                  }}>
                    {results.verdict.text}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analysis History */}
        <div style={styles.card}>
          <h2 style={styles.resultTitle}>Analysis History</h2>
          {historyLoading ? (
            <div style={styles.emptyState}>
              <div style={styles.spinner} />
              <p>Loading history...</p>
            </div>
          ) : history && Array.isArray(history) && history.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.historyTable}>
                <thead>
                  <tr style={styles.historyTr}>
                    <th style={styles.historyTh}>ASIN</th>
                    <th style={styles.historyTh}>Title</th>
                    <th style={styles.historyTh}>Cost</th>
                    <th style={styles.historyTh}>Price</th>
                    <th style={styles.historyTh}>ROI</th>
                    <th style={styles.historyTh}>Verdict</th>
                    <th style={styles.historyTh}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, idx) => {
                    const verdict = getVerdictBadge(item.roi || 0);
                    return (
                      <tr key={idx} style={styles.historyTr}>
                        <td style={styles.historyTd}>{item.asin}</td>
                        <td style={styles.historyTd}>{item.title || 'N/A'}</td>
                        <td style={styles.historyTd}>${parseFloat(item.cost || 0).toFixed(2)}</td>
                        <td style={styles.historyTd}>${parseFloat(item.sell_price || 0).toFixed(2)}</td>
                        <td style={styles.historyTd}>{parseFloat(item.roi || 0).toFixed(2)}%</td>
                        <td style={styles.historyTd}>
                          <span style={{
                            ...styles.verdictBadge,
                            color: verdict.color,
                            backgroundColor: verdict.bg,
                            borderLeft: `3px solid ${verdict.color}`
                          }}>
                            {verdict.text}
                          </span>
                        </td>
                        <td style={styles.historyTd}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyStateIcon}>📊</div>
              <p>No analyses yet. Start by analyzing a product above!</p>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        input:focus, select:focus {
          outline: none;
          border-color: #FFD700;
        }

        table tbody tr:hover {
          background-color: #1A1A1A;
        }
      `}</style>
    </div>
  );
}
