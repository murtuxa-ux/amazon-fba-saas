import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const styles = {
  outerContainer: { display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' },
  container: { flex: 1, marginLeft: '250px', padding: '32px', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  header: { marginBottom: '32px' },
  title: { fontSize: '32px', fontWeight: '700', marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: '#999999' },
  gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '32px' },
  toolCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', cursor: 'pointer', transition: 'border-color 0.2s' },
  toolCardHover: { borderColor: '#FFD700' },
  toolIcon: { fontSize: '32px', marginBottom: '12px' },
  toolTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '8px' },
  toolDescription: { fontSize: '13px', color: '#999999', marginBottom: '16px', lineHeight: '1.4' },
  launchButton: { width: '100%', padding: '8px 12px', backgroundColor: '#FFD700', color: '#000000', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s' },
  expandedContainer: { position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  expandedContent: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '32px' },
  closeButton: { position: 'absolute', top: '12px', right: '12px', backgroundColor: '#1E1E1E', border: '1px solid #1E1E1E', color: '#999999', fontSize: '20px', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' },
  toolHeader: { fontSize: '24px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' },
  inputGroup: { marginBottom: '20px' },
  inputLabel: { fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block', color: '#FFFFFF' },
  input: { width: '100%', padding: '10px 12px', backgroundColor: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '4px', color: '#FFFFFF', fontSize: '13px', boxSizing: 'border-box', transition: 'border-color 0.2s' },
  textarea: { width: '100%', padding: '10px 12px', backgroundColor: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '4px', color: '#FFFFFF', fontSize: '13px', boxSizing: 'border-box', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', minHeight: '120px', transition: 'border-color 0.2s' },
  buttonGroup: { display: 'flex', gap: '12px', marginTop: '20px' },
  primaryButton: { flex: 1, padding: '10px 16px', backgroundColor: '#FFD700', color: '#000000', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  secondaryButton: { flex: 1, padding: '10px 16px', backgroundColor: '#1E1E1E', color: '#999999', border: '1px solid #1E1E1E', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  exportButton: { padding: '8px 16px', backgroundColor: '#1E1E1E', color: '#999999', border: '1px solid #1E1E1E', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', marginRight: '8px' },
  resultContainer: { backgroundColor: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '6px', padding: '16px', marginTop: '20px', maxHeight: '300px', overflowY: 'auto' },
  resultTitle: { fontSize: '13px', fontWeight: '600', marginBottom: '12px' },
  resultItem: { padding: '12px 0', borderBottom: '1px solid #1E1E1E' },
  resultItemLabel: { fontSize: '11px', color: '#666666', marginBottom: '4px' },
  resultItemValue: { fontSize: '12px', color: '#FFFFFF', fontWeight: '500' },
  scoreCard: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' },
  scoreBox: { backgroundColor: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '6px', padding: '12px' },
  scoreLabel: { fontSize: '11px', color: '#666666', marginBottom: '4px' },
  scoreValue: { fontSize: '20px', fontWeight: '700', color: '#FFD700' },
  scoreChange: { fontSize: '12px', color: '#90EE90', marginTop: '4px' },
  feesTable: { width: '100%', marginTop: '12px', borderCollapse: 'collapse', fontSize: '12px' },
  feesRow: { borderBottom: '1px solid #1E1E1E', padding: '8px 0' },
  feesLabel: { padding: '8px 0', color: '#999999' },
  feesValue: { padding: '8px 0', color: '#FFFFFF', textAlign: 'right', fontWeight: '600' },
  chartContainer: { backgroundColor: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '6px', padding: '16px', marginTop: '20px' },
  chartTitle: { fontSize: '13px', fontWeight: '600', marginBottom: '12px' },
  noData: { padding: '24px', textAlign: 'center', color: '#666666', fontSize: '13px' },
  select: { width: '100%', padding: '10px 12px', backgroundColor: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '4px', color: '#FFFFFF', fontSize: '13px', boxSizing: 'border-box' },
  sentimentBadge: { display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', marginRight: '6px' },
  sentimentPositive: { backgroundColor: '#1E4620', color: '#90EE90' },
  sentimentNeutral: { backgroundColor: '#4D3E1F', color: '#FFD700' },
  sentimentNegative: { backgroundColor: '#5D1F1F', color: '#FF6B6B' },
};

const tools = [
  {
    id: 'listing-optimizer',
    icon: '📝',
    title: 'Listing Optimizer',
    description: 'Optimize your product title, bullets, and description with AI-powered keyword suggestions',
    category: 'Listing'
  },
  {
    id: 'keyword-generator',
    icon: '🔑',
    title: 'Keyword Generator',
    description: 'Generate high-performing keywords with search volume, competition, and relevance scores',
    category: 'Research'
  },
  {
    id: 'ppc-calculator',
    icon: '💰',
    title: 'PPC Bid Calculator',
    description: 'Calculate optimal PPC bids based on target ACoS, conversion rate, and order value',
    category: 'Advertising'
  },
  {
    id: 'review-analyzer',
    icon: '⭐',
    title: 'Review Analyzer',
    description: 'Analyze sentiment, extract complaints and praises, get improvement suggestions',
    category: 'Analytics'
  },
  {
    id: 'profit-calculator',
    icon: '📊',
    title: 'Profit Calculator',
    description: 'Calculate all FBA fees and profit margins with detailed fee breakdown',
    category: 'Financial'
  },
  {
    id: 'demand-forecaster',
    icon: '📈',
    title: 'Demand Forecaster',
    description: 'Project monthly demand with seasonality analysis and inventory recommendations',
    category: 'Forecasting'
  },
];

export default function AIToolsPage() {
  const [selectedTool, setSelectedTool] = useState(null);
  const [inputs, setInputs] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleToolSelect = (tool) => {
    setSelectedTool(tool);
    setResults(null);
    setInputs({});
  };

  const handleInputChange = (field, value) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleRunTool = async (toolId) => {
    // Only profit-calculator is genuinely client-side math; the rest
    // would each hit a separate AI backend endpoint that hasn't been
    // mapped from this UI yet. Show a polite "not yet wired" banner
    // instead of fabricating results.
    //
    // Legacy behavior: generateMockResults() returned hardcoded fake
    // "Ergonomic Wireless Mouse" optimization, fake keyword volumes
    // (45,600 searches for "wireless mouse"), fake PPC bids, fake
    // review sentiment percentages, fake demand curves. Every customer
    // saw the same answer regardless of input. Dispatch §62: "Never
    // silently fall back to mock data."
    if (toolId !== 'profit-calculator') {
      setResults(null);
      if (typeof window !== 'undefined') {
        window.alert(
          'This AI tool is not yet wired to the backend. The profit calculator ' +
          'works today; the rest are tracked in docs/api-endpoint-gaps.md.',
        );
      }
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const buyPrice = parseFloat(inputs.buyPrice) || 0;
      const sellPrice = parseFloat(inputs.sellPrice) || 0;
      const weight = parseFloat(inputs.weight) || 0;
      const referralFee = sellPrice * 0.15;
      const fulfillmentFee = weight <= 0.5 ? 3.22 : weight <= 1 ? 3.6 : 3.99;
      const storageFee = 0.87;
      const totalCogs = buyPrice + referralFee + fulfillmentFee + storageFee;
      const profit = sellPrice - totalCogs;
      const roi = buyPrice > 0 ? ((profit / buyPrice) * 100).toFixed(1) : '0.0';
      const margin = sellPrice > 0 ? ((profit / sellPrice) * 100).toFixed(1) : '0.0';
      setResults({
        buyPrice,
        sellPrice,
        referralFee: referralFee.toFixed(2),
        fulfillmentFee: fulfillmentFee.toFixed(2),
        storageFee: storageFee.toFixed(2),
        totalCogs: totalCogs.toFixed(2),
        profit: profit.toFixed(2),
        roi,
        margin,
      });
      setLoading(false);
    }, 200);
  };

  const handleExportCSV = () => {
    if (selectedTool?.id === 'keyword-generator' && results?.keywords) {
      const csv = 'Keyword,Search Volume,Competition,Relevance\n' + results.keywords.map(k => `"${k.keyword}",${k.volume},${k.competition},${k.relevance}`).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'keywords.csv';
      a.click();
    }
  };

  const renderListingOptimizer = () => (
    <div>
      <div style={styles.inputGroup}>
        <label style={styles.inputLabel}>ASIN or Current Listing Text</label>
        <textarea
          style={styles.textarea}
          placeholder="Paste your current listing title, bullets, and description..."
          value={inputs.listing || ''}
          onChange={(e) => handleInputChange('listing', e.target.value)}
        />
      </div>
      <div style={styles.buttonGroup}>
        <button style={styles.primaryButton} onClick={() => handleRunTool('listing-optimizer')} disabled={loading}>
          {loading ? 'Optimizing...' : 'Optimize Listing'}
        </button>
        <button style={styles.secondaryButton} onClick={() => setSelectedTool(null)}>Cancel</button>
      </div>

      {results && (
        <div>
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #1E1E1E' }}>
            <div style={styles.scoreCard}>
              <div style={styles.scoreBox}>
                <div style={styles.scoreLabel}>Before Score</div>
                <div style={styles.scoreValue}>{results.original.score}</div>
              </div>
              <div style={styles.scoreBox}>
                <div style={styles.scoreLabel}>After Score</div>
                <div style={styles.scoreValue}>{results.optimized.score}</div>
                <div style={styles.scoreChange}>+{results.optimized.score - results.original.score} points</div>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>Optimized Listing</div>
              <div style={styles.resultContainer}>
                <div style={styles.resultItem}>
                  <div style={styles.resultItemLabel}>Optimized Title</div>
                  <div style={styles.resultItemValue}>{results.optimized.title}</div>
                </div>
                {results.optimized.bullets.map((bullet, idx) => (
                  <div key={idx} style={styles.resultItem}>
                    <div style={styles.resultItemLabel}>Bullet {idx + 1}</div>
                    <div style={styles.resultItemValue}>• {bullet}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Suggested Keywords</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {results.optimized.keywords.map((kw, idx) => (
                  <span key={idx} style={{
                    padding: '4px 12px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: '#FFD700'
                  }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderKeywordGenerator = () => (
    <div>
      <div style={styles.inputGroup}>
        <label style={styles.inputLabel}>Seed Keyword or ASIN</label>
        <input
          style={styles.input}
          type="text"
          placeholder="e.g., wireless mouse or B0D1234567"
          value={inputs.keyword || ''}
          onChange={(e) => handleInputChange('keyword', e.target.value)}
        />
      </div>
      <div style={styles.buttonGroup}>
        <button style={styles.primaryButton} onClick={() => handleRunTool('keyword-generator')} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Keywords'}
        </button>
        <button style={styles.secondaryButton} onClick={() => setSelectedTool(null)}>Cancel</button>
      </div>

      {results && results.keywords && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button style={styles.exportButton} onClick={handleExportCSV}>📥 Export CSV</button>
          </div>
          <div style={styles.resultContainer}>
            {results.keywords.map((kw, idx) => (
              <div key={idx} style={styles.resultItem}>
                <div style={styles.resultItemLabel}>{kw.keyword}</div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', marginTop: '4px' }}>
                  <span style={{ color: '#FFD700' }}>Vol: {kw.volume.toLocaleString()}</span>
                  <span style={{ color: '#FF6B6B' }}>Comp: {kw.competition}</span>
                  <span style={{ color: '#90EE90' }}>Relevance: {kw.relevance}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderPPCCalculator = () => (
    <div>
      <div style={styles.inputGroup}>
        <label style={styles.inputLabel}>Target ACoS (%)</label>
        <input
          style={styles.input}
          type="number"
          placeholder="e.g., 25"
          value={inputs.targetACoS || ''}
          onChange={(e) => handleInputChange('targetACoS', e.target.value)}
        />
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.inputLabel}>Conversion Rate (%)</label>
        <input
          style={styles.input}
          type="number"
          step="0.1"
          placeholder="e.g., 8"
          value={inputs.conversionRate || ''}
          onChange={(e) => handleInputChange('conversionRate', e.target.value)}
        />
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.inputLabel}>Average Order Value ($)</label>
        <input
          style={styles.input}
          type="number"
          step="0.01"
          placeholder="e.g., 35"
          value={inputs.aov || ''}
          onChange={(e) => handleInputChange('aov', e.target.value)}
        />
      </div>
      <div style={styles.buttonGroup}>
        <button style={styles.primaryButton} onClick={() => handleRunTool('ppc-calculator')} disabled={loading}>
          {loading ? 'Calculating...' : 'Calculate Bid'}
        </button>
        <button style={styles.secondaryButton} onClick={() => setSelectedTool(null)}>Cancel</button>
      </div>

      {results && (
        <div style={{ marginTop: '24px' }}>
          <div style={styles.scoreCard}>
            <div style={styles.scoreBox}>
              <div style={styles.scoreLabel}>Recommended Bid</div>
              <div style={styles.scoreValue}>${results.recommendedBid.toFixed(2)}</div>
            </div>
            <div style={styles.scoreBox}>
              <div style={styles.scoreLabel}>Daily Budget</div>
              <div style={styles.scoreValue}>${results.dailyBudget.toFixed(2)}</div>
            </div>
          </div>

          <div style={styles.resultContainer}>
            <div style={styles.resultItem}>
              <div style={styles.resultItemLabel}>Projected Monthly Sales</div>
              <div style={styles.resultItemValue}>${results.projectedSales.toLocaleString()}</div>
            </div>
            <div style={styles.resultItem}>
              <div style={styles.resultItemLabel}>Estimated Monthly Clicks</div>
              <div style={styles.resultItemValue}>{results.projectedClicks.toLocaleString()}</div>
            </div>
            <div style={styles.resultItem}>
              <div style={styles.resultItemLabel}>Avg Cost Per Click</div>
              <div style={styles.resultItemValue}>${results.breakdown.avgCPC.toFixed(2)}</div>
            </div>
            <div style={styles.resultItem}>
              <div style={styles.resultItemLabel}>Est. Cost Per Acquisition</div>
              <div style={styles.resultItemValue}>${results.breakdown.estimatedCPA.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderReviewAnalyzer = () => (
    <div>
      <div style={styles.inputGroup}>
        <label style={styles.inputLabel}>ASIN</label>
        <input
          style={styles.input}
          type="text"
          placeholder="e.g., B0D1234567"
          value={inputs.asin || ''}
          onChange={(e) => handleInputChange('asin', e.target.value)}
        />
      </div>
      <div style={styles.buttonGroup}>
        <button style={styles.primaryButton} onClick={() => handleRunTool('review-analyzer')} disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze Reviews'}
        </button>
        <button style={styles.secondaryButton} onClick={() => setSelectedTool(null)}>Cancel</button>
      </div>

      {results && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>Sentiment Breakdown</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ ...styles.sentimentBadge, ...styles.sentimentPositive }}>Positive {results.sentiment.positive}%</span>
              <span style={{ ...styles.sentimentBadge, ...styles.sentimentNeutral }}>Neutral {results.sentiment.neutral}%</span>
              <span style={{ ...styles.sentimentBadge, ...styles.sentimentNegative }}>Negative {results.sentiment.negative}%</span>
            </div>
            <div style={{ fontSize: '13px', marginTop: '12px', color: '#FFD700' }}>Average Rating: ⭐ {results.sentiment.avgRating}</div>
          </div>

          <div style={styles.resultContainer}>
            <div style={styles.resultTitle}>Top Complaints</div>
            {results.topComplaints.map((item, idx) => (
              <div key={idx} style={styles.resultItem}>
                <div style={styles.resultItemValue}>{item.issue}</div>
                <div style={{ fontSize: '11px', color: '#666666' }}>{item.mentions} mentions</div>
              </div>
            ))}
          </div>

          <div style={styles.resultContainer}>
            <div style={styles.resultTitle}>Top Praises</div>
            {results.topPraises.map((item, idx) => (
              <div key={idx} style={styles.resultItem}>
                <div style={styles.resultItemValue}>{item.praise}</div>
                <div style={{ fontSize: '11px', color: '#666666' }}>{item.mentions} mentions</div>
              </div>
            ))}
          </div>

          <div style={styles.resultContainer}>
            <div style={styles.resultTitle}>Improvement Suggestions</div>
            {results.suggestions.map((sug, idx) => (
              <div key={idx} style={{ ...styles.resultItem, paddingLeft: '16px' }}>
                <div style={styles.resultItemValue}>• {sug}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProfitCalculator = () => (
    <div>
      <div style={styles.inputGroup}>
        <label style={styles.inputLabel}>Buy Price ($)</label>
        <input
          style={styles.input}
          type="number"
          step="0.01"
          placeholder="e.g., 12"
          value={inputs.buyPrice || ''}
          onChange={(e) => handleInputChange('buyPrice', e.target.value)}
        />
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.inputLabel}>Sell Price ($)</label>
        <input
          style={styles.input}
          type="number"
          step="0.01"
          placeholder="e.g., 29.99"
          value={inputs.sellPrice || ''}
          onChange={(e) => handleInputChange('sellPrice', e.target.value)}
        />
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.inputLabel}>Weight (lbs)</label>
        <input
          style={styles.input}
          type="number"
          step="0.1"
          placeholder="e.g., 0.3"
          value={inputs.weight || ''}
          onChange={(e) => handleInputChange('weight', e.target.value)}
        />
      </div>
      <div style={styles.buttonGroup}>
        <button style={styles.primaryButton} onClick={() => handleRunTool('profit-calculator')} disabled={loading}>
          {loading ? 'Calculating...' : 'Calculate Profit'}
        </button>
        <button style={styles.secondaryButton} onClick={() => setSelectedTool(null)}>Cancel</button>
      </div>

      {results && (
        <div style={{ marginTop: '24px' }}>
          <div style={styles.scoreCard}>
            <div style={styles.scoreBox}>
              <div style={styles.scoreLabel}>Profit Per Unit</div>
              <div style={styles.scoreValue}>${parseFloat(results.profit).toFixed(2)}</div>
            </div>
            <div style={styles.scoreBox}>
              <div style={styles.scoreLabel}>Margin</div>
              <div style={styles.scoreValue}>{results.margin}%</div>
              <div style={styles.scoreChange}>ROI: {results.roi}%</div>
            </div>
          </div>

          <div style={styles.resultContainer}>
            <table style={styles.feesTable}>
              <tbody>
                <tr style={styles.feesRow}>
                  <td style={styles.feesLabel}>Buy Price</td>
                  <td style={styles.feesValue}>${parseFloat(results.buyPrice).toFixed(2)}</td>
                </tr>
                <tr style={styles.feesRow}>
                  <td style={styles.feesLabel}>Referral Fee (15%)</td>
                  <td style={styles.feesValue}>${parseFloat(results.referralFee).toFixed(2)}</td>
                </tr>
                <tr style={styles.feesRow}>
                  <td style={styles.feesLabel}>Fulfillment Fee</td>
                  <td style={styles.feesValue}>${parseFloat(results.fulfillmentFee).toFixed(2)}</td>
                </tr>
                <tr style={styles.feesRow}>
                  <td style={styles.feesLabel}>Storage Fee</td>
                  <td style={styles.feesValue}>${parseFloat(results.storageFee).toFixed(2)}</td>
                </tr>
                <tr style={{ ...styles.feesRow, borderBottom: '2px solid #1E1E1E' }}>
                  <td style={{ ...styles.feesLabel, fontWeight: '600' }}>Total COGS</td>
                  <td style={{ ...styles.feesValue, color: '#FF6B6B' }}>${parseFloat(results.totalCogs).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderDemandForecaster = () => (
    <div>
      <div style={styles.inputGroup}>
        <label style={styles.inputLabel}>ASIN or Category</label>
        <input
          style={styles.input}
          type="text"
          placeholder="e.g., B0D1234567 or Electronics"
          value={inputs.asinOrCategory || ''}
          onChange={(e) => handleInputChange('asinOrCategory', e.target.value)}
        />
      </div>
      <div style={styles.buttonGroup}>
        <button style={styles.primaryButton} onClick={() => handleRunTool('demand-forecaster')} disabled={loading}>
          {loading ? 'Forecasting...' : 'Forecast Demand'}
        </button>
        <button style={styles.secondaryButton} onClick={() => setSelectedTool(null)}>Cancel</button>
      </div>

      {results && (
        <div style={{ marginTop: '24px' }}>
          <div style={styles.scoreCard}>
            <div style={styles.scoreBox}>
              <div style={styles.scoreLabel}>Current Month Demand</div>
              <div style={styles.scoreValue}>{results.currentMonthDemand}</div>
            </div>
            <div style={styles.scoreBox}>
              <div style={styles.scoreLabel}>Projected Next Month</div>
              <div style={styles.scoreValue}>{results.projectedMonthDemand}</div>
              <div style={styles.scoreChange}>+{results.growthRate}%</div>
            </div>
          </div>

          <div style={styles.chartContainer}>
            <div style={styles.chartTitle}>Seasonality Forecast (Next 7 Months)</div>
            <svg style={{ width: '100%', height: '150px' }} viewBox="0 0 700 150" preserveAspectRatio="xMidYMid meet">
              <line x1="40" y1="120" x2="680" y2="120" stroke="#1E1E1E" strokeWidth="1" />
              <line x1="40" y1="20" x2="40" y2="120" stroke="#1E1E1E" strokeWidth="1" />
              {results.seasonality.map((item, idx) => {
                const height = (item.demand / 1800) * 100;
                const x = 50 + idx * 90;
                return (
                  <g key={idx}>
                    <rect x={x} y={120 - height} width="60" height={height} fill="#FFD700" fillOpacity="0.7" />
                    <text x={x + 30} y="135" textAnchor="middle" style={{ fontSize: '11px', fill: '#666666' }}>{item.month}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div style={styles.resultContainer}>
            <div style={styles.resultTitle}>Inventory Recommendations</div>
            <div style={styles.resultItem}>
              <div style={styles.resultItemValue}>{results.recommendations.inventory}</div>
            </div>
            <div style={styles.resultItem}>
              <div style={styles.resultItemValue}>{results.recommendations.restocking}</div>
            </div>
            <div style={styles.resultItem}>
              <div style={styles.resultItemValue}>{results.recommendations.bufferStock}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (selectedTool) {
    return (
      <div style={styles.outerContainer}>
        <Sidebar />
        <div style={styles.expandedContainer}>
          <div style={styles.expandedContent}>
            <div style={styles.toolHeader}>
              <span>{selectedTool.icon}</span>
              {selectedTool.title}
              <button style={styles.closeButton} onClick={() => setSelectedTool(null)}>×</button>
            </div>

            {selectedTool.id === 'listing-optimizer' && renderListingOptimizer()}
            {selectedTool.id === 'keyword-generator' && renderKeywordGenerator()}
            {selectedTool.id === 'ppc-calculator' && renderPPCCalculator()}
            {selectedTool.id === 'review-analyzer' && renderReviewAnalyzer()}
            {selectedTool.id === 'profit-calculator' && renderProfitCalculator()}
            {selectedTool.id === 'demand-forecaster' && renderDemandForecaster()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>AI Tools Hub</h1>
          <p style={styles.subtitle}>Powerful AI-powered tools to optimize your FBA business</p>
        </div>

        <div style={styles.gridContainer}>
          {tools.map(tool => (
            <div
              key={tool.id}
              style={styles.toolCard}
              onClick={() => handleToolSelect(tool)}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FFD700'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1E1E1E'}
            >
              <div style={styles.toolIcon}>{tool.icon}</div>
              <div style={styles.toolTitle}>{tool.title}</div>
              <div style={styles.toolDescription}>{tool.description}</div>
              <div style={{ marginBottom: '12px', fontSize: '11px', color: '#666666' }}>Category: {tool.category}</div>
              <button style={styles.launchButton}>Launch Tool →</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
