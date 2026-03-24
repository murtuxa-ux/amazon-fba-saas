import { useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import DecisionBadge from "../components/DecisionBadge";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const Field = ({ label, name, value, onChange, type = "text", placeholder = "" }) => (
  <div>
    <label className="block text-xs text-gray-400 mb-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
    />
  </div>
);

export default function Analyze() {
  const [form, setForm] = useState({
    asin: "", cost: "", price: "", fba_fee: "",
    monthly_sales: "", competition: "", price_stability: "", buybox_pct: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    if (!form.asin || !form.cost || !form.price || !form.fba_fee) {
      setError("Please fill in ASIN, Cost, Selling Price and FBA Fee at minimum.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = {
        asin:     form.asin,
        cost:     parseFloat(form.cost),
        price:    parseFloat(form.price),
        fba_fee:  parseFloat(form.fba_fee),
        ...(form.monthly_sales   && { monthly_sales:   parseFloat(form.monthly_sales)   }),
        ...(form.competition     && { competition:     parseFloat(form.competition)     }),
        ...(form.price_stability && { price_stability: parseFloat(form.price_stability) }),
        ...(form.buybox_pct      && { buybox_pct:      parseFloat(form.buybox_pct)      }),
      };
      const res = await axios.post(`${API}/analyze`, payload);
      setResult(res.data);
    } catch (e) {
      setError("Could not reach backend. Make sure it is running.");
    }
    setLoading(false);
  };

  const riskColor = result?.risk_level === "HIGH RISK" ? "text-red-400" : "text-green-400";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 max-w-3xl">
        <h2 className="text-2xl font-bold mb-1">Analyze ASIN</h2>
        <p className="text-gray-500 text-sm mb-6">AI-powered product scoring with Keepa intelligence</p>

        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Required Fields</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Field label="ASIN"          name="asin"    value={form.asin}    onChange={handle} placeholder="B08XXXXX" />
            <Field label="Your Cost ($)" name="cost"    value={form.cost}    onChange={handle} type="number" placeholder="10.00" />
            <Field label="Selling Price ($)" name="price" value={form.price} onChange={handle} type="number" placeholder="25.00" />
            <Field label="FBA Fee ($)"   name="fba_fee" value={form.fba_fee} onChange={handle} type="number" placeholder="5.00" />
          </div>

          <h3 className="text-sm font-semibold text-gray-300 mb-4">Optional (Keepa Data)</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly Sales (units)" name="monthly_sales"   value={form.monthly_sales}   onChange={handle} type="number" placeholder="500" />
            <Field label="# of Competitors"      name="competition"     value={form.competition}     onChange={handle} type="number" placeholder="10" />
            <Field label="Price Stability (0-1)" name="price_stability" value={form.price_stability} onChange={handle} type="number" placeholder="0.8" />
            <Field label="Buy Box % (0-100)"     name="buybox_pct"      value={form.buybox_pct}      onChange={handle} type="number" placeholder="85" />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button onClick={submit} disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl text-sm transition">
          {loading ? "Analyzing..." : "Run AI Analysis"}
        </button>

        {result && (
          <div className="mt-8 bg-gray-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-gray-500">ASIN</p>
                <p className="font-bold text-lg">{result.asin}</p>
              </div>
              <div className="text-right">
                <DecisionBadge decision={result.decision} />
                <p className={`text-xs mt-1 font-medium ${riskColor}`}>{result.risk_level}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: "AI Score",      value: result.ai_score },
                { label: "ROI",           value: `${result.roi_pct}%` },
                { label: "Net Profit",    value: `$${result.net_profit}` },
                { label: "Monthly Sales", value: result.monthly_sales },
                { label: "Competition",   value: result.competition },
                { label: "Buy Box %",     value: `${result.buybox_pct}%` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xl font-bold text-white mt-1">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-4">Data source: {result.keepa_source}</p>
          </div>
        )}
      </main>
    </div>
  );
}
