import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const VERDICT_STYLES = {
  "Winner ✅": { row: "bg-green-950 border-green-800", badge: "bg-green-900 text-green-300 border border-green-600" },
  "Maybe 🟡":  { row: "bg-yellow-950 border-yellow-800", badge: "bg-yellow-900 text-yellow-300 border border-yellow-600" },
  "Skip ❌":   { row: "bg-red-950 border-red-900", badge: "bg-red-900 text-red-300 border border-red-700" },
};

const SCORE_LABELS = {
  bsr:             { label: "BSR Rank",       max: 30 },
  sales_velocity:  { label: "Sales Velocity", max: 20 },
  price_stability: { label: "Price Stability",max: 20 },
  competition:     { label: "Competition",    max: 20 },
  price_point:     { label: "Price Point",    max: 10 },
};

const SIGNAL_COLORS = {
  STRONG: "text-green-400", GOOD: "text-blue-400",
  MODERATE: "text-yellow-400", WEAK: "text-red-400",
};

const Field = ({ label, name, value, onChange, type="text", placeholder="", required=false }) => (
  <div>
    <label className="block text-xs text-gray-400 mb-1">
      {label}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
  </div>
);

function ScoreBar({ score, max, signal }) {
  const pct = Math.round((score / max) * 100);
  const color = signal==="STRONG" ? "bg-green-500" : signal==="GOOD" ? "bg-blue-500" : signal==="MODERATE" ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold w-12 text-right">{score}/{max}</span>
    </div>
  );
}

function ScoreGauge({ score }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  const dashArray = (score / 100) * 188.5;
  return (
    <div className="relative flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke="#374151" strokeWidth="12" strokeLinecap="round"/>
        <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke={color} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={`${dashArray} 188.5`}/>
      </svg>
      <div className="absolute bottom-0 text-center">
        <p className="text-3xl font-black" style={{ color }}>{score}</p>
        <p className="text-xs text-gray-500">/ 100</p>
      </div>
    </div>
  );
}

export default function Scout() {
  const [form, setForm] = useState({
    asin:"", title:"", brand:"", category:"",
    bsr:"", monthly_sales:"", current_price:"",
    avg_price_90d:"", min_price_90d:"", max_price_90d:"",
    price_volatility_pct:"", fba_sellers:"", total_sellers:"",
    reviews:"", rating:"", cost:"", referral_pct:"0.15", fba_fee:"3.22",
  });
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("form");

  useEffect(() => {
    axios.get(`${API}/scout`).then(r => setHistory(r.data.results || [])).catch(() => {});
  }, []);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    const required = ["asin","bsr","monthly_sales","current_price","price_volatility_pct","fba_sellers"];
    const missing = required.filter(k => !form[k]);
    if (missing.length) { setError(`Please fill: ${missing.join(", ")}`); return; }
    setError(""); setLoading(true);
    try {
      const payload = {
        asin: form.asin.trim().toUpperCase(),
        title: form.title, brand: form.brand, category: form.category,
        bsr: parseInt(form.bsr), monthly_sales: parseInt(form.monthly_sales),
        current_price: parseFloat(form.current_price),
        price_volatility_pct: parseFloat(form.price_volatility_pct),
        fba_sellers: parseInt(form.fba_sellers),
        ...(form.avg_price_90d  && { avg_price_90d:  parseFloat(form.avg_price_90d) }),
        ...(form.min_price_90d  && { min_price_90d:  parseFloat(form.min_price_90d) }),
        ...(form.max_price_90d  && { max_price_90d:  parseFloat(form.max_price_90d) }),
        ...(form.total_sellers  && { total_sellers:  parseInt(form.total_sellers) }),
        ...(form.reviews        && { reviews:        parseInt(form.reviews) }),
        ...(form.rating         && { rating:         parseFloat(form.rating) }),
        ...(form.cost           && { cost:           parseFloat(form.cost) }),
        referral_pct: parseFloat(form.referral_pct) || 0.15,
        fba_fee:      parseFloat(form.fba_fee)      || 3.22,
      };
      const res = await axios.post(`${API}/scout`, payload);
      setResult(res.data);
      setHistory(prev => [res.data, ...prev.filter(h => h.asin !== res.data.asin)]);
    } catch { setError("Could not reach backend."); }
    setLoading(false);
  };

  const vStyle = result ? (VERDICT_STYLES[result.verdict] || VERDICT_STYLES["Skip ❌"]) : null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold mb-1">FBA Scout</h2>
        <p className="text-gray-500 text-sm mb-6">Score products 0–100 for wholesale FBA viability · Winner / Maybe / Skip</p>

        <div className="flex gap-2 mb-6">
          {["form","history"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition capitalize
                ${tab===t ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              {t==="form" ? "🎯 Scout a Product" : `📋 History (${history.length})`}
            </button>
          ))}
        </div>

        {tab === "form" && (
          <div className="max-w-4xl">
            <div className="bg-gray-900 rounded-xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Required Fields</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="ASIN"                         name="asin"                 value={form.asin}                 onChange={handle} placeholder="B0CYT8BT8M" required />
                <Field label="Brand"                        name="brand"                value={form.brand}                onChange={handle} placeholder="Sky and Sol" />
                <Field label="BSR"                          name="bsr"                  value={form.bsr}                  onChange={handle} type="number" placeholder="768" required />
                <Field label="Est. Monthly Sales (units)"   name="monthly_sales"        value={form.monthly_sales}        onChange={handle} type="number" placeholder="6000" required />
                <Field label="Current Price ($)"            name="current_price"        value={form.current_price}        onChange={handle} type="number" placeholder="34.95" required />
                <Field label="Price Volatility 90d (%)"     name="price_volatility_pct" value={form.price_volatility_pct} onChange={handle} type="number" placeholder="14.3" required />
                <Field label="Active FBA Sellers"           name="fba_sellers"          value={form.fba_sellers}          onChange={handle} type="number" placeholder="3" required />
                <Field label="Total Sellers"                name="total_sellers"        value={form.total_sellers}        onChange={handle} type="number" placeholder="5" />
              </div>

              <details className="mb-4">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 mb-2">▶ Optional — price history, reviews, title</summary>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <Field label="Title"           name="title"        value={form.title}        onChange={handle} placeholder="Product name..." />
                  <Field label="Category"        name="category"     value={form.category}     onChange={handle} placeholder="Beauty > Skin Care" />
                  <Field label="Avg Price 90d ($)" name="avg_price_90d" value={form.avg_price_90d} onChange={handle} type="number" placeholder="34.91" />
                  <Field label="Min Price 90d ($)" name="min_price_90d" value={form.min_price_90d} onChange={handle} type="number" placeholder="30.00" />
                  <Field label="Max Price 90d ($)" name="max_price_90d" value={form.max_price_90d} onChange={handle} type="number" placeholder="34.95" />
                  <Field label="Reviews"         name="reviews"      value={form.reviews}      onChange={handle} type="number" placeholder="2377" />
                  <Field label="Rating"          name="rating"       value={form.rating}       onChange={handle} type="number" placeholder="4.2" />
                </div>
              </details>

              <div className="border-t border-gray-800 pt-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Profit Calculator <span className="text-gray-600">(enter your cost)</span></h3>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Wholesale Cost ($)"     name="cost"         value={form.cost}         onChange={handle} type="number" placeholder="17.00" />
                  <Field label="Referral Fee %"         name="referral_pct" value={form.referral_pct} onChange={handle} type="number" placeholder="0.15" />
                  <Field label="FBA Fulfillment Fee ($)" name="fba_fee"      value={form.fba_fee}      onChange={handle} type="number" placeholder="3.22" />
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button onClick={submit} disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-xl text-sm transition mb-8">
              {loading ? "Scoring…" : "🎯 Run FBA Scout"}
            </button>

            {result && vStyle && (
              <div className={`rounded-xl border p-6 ${vStyle.row}`}>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-xs text-gray-400 font-mono mb-1">{result.asin}</p>
                    <p className="font-bold text-lg leading-tight max-w-xl">{result.title || result.brand || result.asin}</p>
                    {result.category && <p className="text-xs text-gray-500 mt-1">{result.category}</p>}
                  </div>
                  <span className={`text-sm font-bold px-4 py-2 rounded-xl ml-4 flex-shrink-0 ${vStyle.badge}`}>{result.verdict}</span>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <div>
                    <div className="flex items-center gap-6 mb-6">
                      <ScoreGauge score={result.fba_score} />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">FBA SCORE</p>
                        <p className="text-4xl font-black">{result.fba_score}<span className="text-lg text-gray-500">/100</span></p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(result.score_breakdown).map(([key, val]) => (
                        <div key={key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">{SCORE_LABELS[key]?.label || key}</span>
                            <span className={SIGNAL_COLORS[val.signal] || "text-gray-400"}>{val.signal}</span>
                          </div>
                          <ScoreBar score={val.score} max={val.max} signal={val.signal} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Market Data</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { l:"BSR",           v:`#${result.bsr?.toLocaleString()}` },
                          { l:"Monthly Sales", v:`${result.monthly_sales?.toLocaleString()} units` },
                          { l:"Buy Box Price", v:`$${result.current_price}` },
                          { l:"FBA Sellers",   v:result.fba_sellers },
                          { l:"Reviews",       v:result.reviews ? result.reviews.toLocaleString() : "—" },
                          { l:"Rating",        v:result.rating ? `${result.rating} ★` : "—" },
                          { l:"90d Volatility",v:`${result.price_volatility_pct}%` },
                          { l:"Price Range",   v:result.min_price_90d && result.max_price_90d ? `$${result.min_price_90d}–$${result.max_price_90d}` : "—" },
                        ].map(({ l, v }) => (
                          <div key={l} className="bg-black bg-opacity-30 rounded-lg p-2">
                            <p className="text-xs text-gray-500">{l}</p>
                            <p className="text-sm font-bold">{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {result.profit_calc && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Profit Calculator</p>
                        <div className="bg-black bg-opacity-30 rounded-lg p-4 space-y-2">
                          {result.profit_calc.net_profit !== undefined && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Referral Fee</span>
                                <span>-${result.profit_calc.referral_fee}</span>
                              </div>
                              <div className="flex justify-between text-sm border-t border-gray-700 pt-2 font-bold">
                                <span className="text-gray-400">Net Profit</span>
                                <span className={result.profit_calc.net_profit >= 0 ? "text-green-400" : "text-red-400"}>
                                  ${result.profit_calc.net_profit}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Margin</span>
                                <span className={result.profit_calc.margin_pct >= 25 ? "text-green-400" : result.profit_calc.margin_pct >= 10 ? "text-yellow-400" : "text-red-400"}>
                                  {result.profit_calc.margin_pct}%
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-400">ROI</span>
                                <span>{result.profit_calc.roi_pct}%</span>
                              </div>
                            </>
                          )}
                          <div className="border-t border-gray-700 pt-2 flex justify-between text-xs">
                            <span className="text-gray-500">Max cost for 25% margin</span>
                            <span className="font-bold text-blue-400">${result.profit_calc.breakeven_cost_25pct}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <a href={result.amazon_url} target="_blank" rel="noreferrer"
                      className="inline-block text-xs text-blue-400 hover:underline">View on Amazon →</a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div>
            {history.length === 0 ? (
              <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-600">
                <p className="text-4xl mb-3">🎯</p>
                <p>No products scouted yet. Use the Scout form to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((h, i) => {
                  const vs = VERDICT_STYLES[h.verdict] || VERDICT_STYLES["Skip ❌"];
                  return (
                    <div key={i} className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${vs.row}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-gray-400">{h.asin}</p>
                        <p className="font-semibold text-sm truncate">{h.title || h.brand || h.asin}</p>
                        <p className="text-xs text-gray-500 mt-1">BSR #{h.bsr?.toLocaleString()} · {h.monthly_sales?.toLocaleString()} units/mo · ${h.current_price}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-black">{h.fba_score}</p>
                          <p className="text-xs text-gray-500">score</p>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${vs.badge}`}>{h.verdict}</span>
                        <a href={h.amazon_url} target="_blank" rel="noreferrer"
                          className="text-xs text-blue-400 hover:underline whitespace-nowrap">View →</a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
  }
