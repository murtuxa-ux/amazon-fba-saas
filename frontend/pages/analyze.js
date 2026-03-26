import { useState } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import DecisionBadge from '../components/DecisionBadge';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const Field = ({ label, type = 'text', value, onChange, placeholder = '' }) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-gray-300">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
);

export default function Analyze() {
  const [form, setForm] = useState({
    asin: '',
    cost: '',
    price: '',
    fba_fee: '',
    monthly_sales: '',
    competition: '',
    price_stability: '',
    buybox_pct: '',
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    // Validate required fields
    if (!form.asin.trim()) {
      setError('ASIN is required');
      return;
    }
    if (!form.cost.trim()) {
      setError('Your Cost is required');
      return;
    }
    if (!form.price.trim()) {
      setError('Selling Price is required');
      return;
    }
    if (!form.fba_fee.trim()) {
      setError('FBA Fee is required');
      return;
    }

    try {
      setLoading(true);

      // Build payload with required fields and optional fields only if filled
      const payload = {
        asin: form.asin.trim(),
        cost: parseFloat(form.cost),
        price: parseFloat(form.price),
        fba_fee: parseFloat(form.fba_fee),
      };

      if (form.monthly_sales.trim()) {
        payload.monthly_sales = parseInt(form.monthly_sales, 10);
      }
      if (form.competition.trim()) {
        payload.competition = parseInt(form.competition, 10);
      }
      if (form.price_stability.trim()) {
        payload.price_stability = parseFloat(form.price_stability);
      }
      if (form.buybox_pct.trim()) {
        payload.buybox_pct = parseFloat(form.buybox_pct);
      }

      const response = await axios.post(`${API}/analyze`, payload);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-gray-900 min-h-screen text-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Analyze ASIN</h1>
            <p className="text-gray-400">AI-powered product scoring with Keepa intelligence</p>
          </div>

          {/* Form Card */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
            <form onSubmit={submit} className="space-y-6">
              {/* Required Fields Section */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Required Fields</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="ASIN"
                    value={form.asin}
                    onChange={handle('asin')}
                    placeholder="e.g., B0123456789"
                  />
                  <Field
                    label="Your Cost ($)"
                    type="number"
                    value={form.cost}
                    onChange={handle('cost')}
                    placeholder="0.00"
                  />
                  <Field
                    label="Selling Price ($)"
                    type="number"
                    value={form.price}
                    onChange={handle('price')}
                    placeholder="0.00"
                  />
                  <Field
                    label="FBA Fee ($)"
                    type="number"
                    value={form.fba_fee}
                    onChange={handle('fba_fee')}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Optional Fields Section */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Optional (Keepa Data)</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Monthly Sales"
                    type="number"
                    value={form.monthly_sales}
                    onChange={handle('monthly_sales')}
                    placeholder="Leave blank if unknown"
                  />
                  <Field
                    label="# of Competitors"
                    type="number"
                    value={form.competition}
                    onChange={handle('competition')}
                    placeholder="Leave blank if unknown"
                  />
                  <Field
                    label="Price Stability (0-1)"
                    type="number"
                    value={form.price_stability}
                    onChange={handle('price_stability')}
                    placeholder="0.0 - 1.0"
                  />
                  <Field
                    label="Buy Box % (0-100)"
                    type="number"
                    value={form.buybox_pct}
                    onChange={handle('buybox_pct')}
                    placeholder="0 - 100"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {loading ? 'Analyzing...' : 'Run AI Analysis'}
              </button>
            </form>
          </div>

          {/* Results Section */}
          {result && (
            <div className="space-y-6">
              {/* ASIN Header with Badge */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold text-white">ASIN: {result.asin}</h2>
                  <DecisionBadge decision={result.decision} />
                </div>
                <p className={`text-sm font-medium ${
                  result.risk_level === 'HIGH RISK'
                    ? 'text-red-400'
                    : 'text-green-400'
                }`}>
                  Risk Level: {result.risk_level}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-4">
                {/* AI Score */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <p className="text-gray-400 text-sm font-medium mb-1">AI Score</p>
                  <p className="text-3xl font-bold text-white">{result.ai_score.toFixed(1)}</p>
                </div>

                {/* ROI */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <p className="text-gray-400 text-sm font-medium mb-1">ROI (%)</p>
                  <p className="text-3xl font-bold text-white">{result.roi_pct.toFixed(1)}%</p>
                </div>

                {/* Net Profit */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <p className="text-gray-400 text-sm font-medium mb-1">Net Profit ($)</p>
                  <p className="text-3xl font-bold text-white">${result.net_profit.toFixed(2)}</p>
                </div>

                {/* Monthly Sales */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <p className="text-gray-400 text-sm font-medium mb-1">Monthly Sales</p>
                  <p className="text-3xl font-bold text-white">{result.monthly_sales || 'N/A'}</p>
                </div>

                {/* Competition */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <p className="text-gray-400 text-sm font-medium mb-1">Competition</p>
                  <p className="text-3xl font-bold text-white">{result.competition || 'N/A'}</p>
                </div>

                {/* Buy Box % */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <p className="text-gray-400 text-sm font-medium mb-1">Buy Box %</p>
                  <p className="text-3xl font-bold text-white">{result.buybox_pct || 'N/A'}%</p>
                </div>
              </div>

              {/* Data Source Note */}
              <p className="text-gray-500 text-xs text-center">
                Data sources: User inputs + Keepa intelligence (when available)
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
