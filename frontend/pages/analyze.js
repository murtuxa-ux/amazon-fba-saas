import { useState } from 'react';
import Head from 'next/head';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

const colors = {
  bg: '#0A0A0A', card: '#111111', border: '#1E1E1E',
  accent: '#FFD700', text: '#FFFFFF', secText: '#888888',
  green: '#00C853', red: '#FF5252',
};

export default function Analyze() {
  const [form, setForm] = useState({ asin: '', cost: '', price: '', category: 'General', weight: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAnalyze = async () => {
    if (!form.asin.trim()) { setError('ASIN is required'); return; }
    if (!form.cost.trim()) { setError('Your Cost is required'); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('ecomera_token') : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          asin: form.asin.trim(),
          cost: parseFloat(form.cost) || 0,
          price: parseFloat(form.price) || 0,
          category: form.category,
          weight_lbs: parseFloat(form.weight) || 0,
        }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to analyze product');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: '#1A1A1A',
    border: '1px solid ' + colors.border, borderRadius: 8, color: colors.text,
    fontSize: 14, outline: 'none',
  };

  const labelStyle = { display: 'block', marginBottom: 6, color: colors.secText, fontSize: 13, fontWeight: 500 };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg, color: colors.text }}>
      <Head><title>Analyze ASIN | Ecom Era</title></Head>
      <Sidebar />
      <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          <span style={{ color: colors.accent }}>Analyze</span> ASIN
        </h1>
        <p style={{ color: colors.secText, marginBottom: 24 }}>Enter product details to get a wholesale profitability analysis</p>

        {error && (
          <div style={{ background: '#2D1515', border: '1px solid #FF5252', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#FF8A80' }}>
            {error}
          </div>
        )}

        <div style={{ background: colors.card, border: '1px solid ' + colors.border, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label style={labelStyle}>ASIN *</label>
              <input style={inputStyle} placeholder="B0XXXXXXXX" value={form.asin} onChange={e => handleChange('asin', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Your Cost ($) *</label>
              <input style={inputStyle} type="number" step="0.01" placeholder="12.50" value={form.cost} onChange={e => handleChange('cost', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Selling Price ($)</label>
              <input style={inputStyle} type="number" step="0.01" placeholder="24.99" value={form.price} onChange={e => handleChange('price', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.category} onChange={e => handleChange('category', e.target.value)}>
                <option value="General">General</option>
                <option value="Grocery">Grocery</option>
                <option value="Health">Health & Beauty</option>
                <option value="Electronics">Electronics</option>
                <option value="Home">Home & Kitchen</option>
                <option value="Toys">Toys & Games</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Weight (lbs)</label>
              <input style={inputStyle} type="number" step="0.1" placeholder="1.5" value={form.weight} onChange={e => handleChange('weight', e.target.value)} />
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            style={{
              marginTop: 20, padding: '12px 32px', background: loading ? '#555' : colors.accent,
              color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Analyzing...' : 'Analyze Product'}
          </button>
        </div>

        {result && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Score', value: result.score != null ? result.score + '/100' : 'N/A', color: (result.score || 0) >= 70 ? colors.green : colors.red },
              { label: 'Verdict', value: result.verdict || 'N/A', color: result.verdict === 'PASS' ? colors.green : colors.red },
              { label: 'ROI', value: result.roi != null ? result.roi.toFixed(1) + '%' : 'N/A', color: (result.roi || 0) >= 30 ? colors.green : colors.red },
              { label: 'Est. Monthly Sales', value: result.monthly_sales || 'N/A', color: colors.accent },
              { label: 'Competition', value: result.competition || 'N/A', color: colors.accent },
              { label: 'Risk Level', value: result.risk || 'N/A', color: result.risk === 'LOW' ? colors.green : result.risk === 'HIGH' ? colors.red : colors.accent },
            ].map((item, i) => (
              <div key={i} style={{ background: colors.card, border: '1px solid ' + colors.border, borderRadius: 12, padding: 20, textAlign: 'center' }}>
                <div style={{ color: colors.secText, fontSize: 13, marginBottom: 8 }}>{item.label}</div>
                <div style={{ color: item.color, fontSize: 28, fontWeight: 700 }}>{item.value}</div>
              </div>
            ))}
          </div>
        )}

        {result && result.breakdown && (
          <div style={{ background: colors.card, border: '1px solid ' + colors.border, borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: colors.accent }}>Cost Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {Object.entries(result.breakdown).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid ' + colors.border }}>
                  <span style={{ color: colors.secText }}>{key.replace(/_/g, ' ')}</span>
                  <span style={{ fontWeight: 600 }}>{typeof val === 'number' ? '$' + val.toFixed(2) : val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!result && !loading && (
          <div style={{ background: colors.card, border: '1px solid ' + colors.border, borderRadius: 12, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#128269;</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Ready to Analyze</h3>
            <p style={{ color: colors.secText }}>Enter an ASIN and your cost above to get a full profitability analysis</p>
          </div>
        )}
      </main>
    </div>
  );
}
