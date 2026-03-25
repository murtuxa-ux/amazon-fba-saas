import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-backend-production.up.railway.app";

const VERDICT = {
  Winner: { label: "Winner", bg: "#064e3b", color: "#6ee7b7", border: "#059669" },
  Maybe:  { label: "Maybe",  bg: "#422006", color: "#fcd34d", border: "#d97706" },
  Skip:   { label: "Skip",   bg: "#450a0a", color: "#fca5a5", border: "#b91c1c" },
};

const SCORE_COLS = [
  { key: "bsr_score",         label: "BSR Rank",       max: 30 },
  { key: "sales_score",       label: "Sales Velocity", max: 20 },
  { key: "stability_score",   label: "Price Stability",max: 20 },
  { key: "competition_score", label: "Competition",    max: 20 },
  { key: "price_score",       label: "Price Point",    max: 10 },
];

function ScoreRing({ score, size = 64 }) {
  const r     = size / 2 - 5;
  const circ  = 2 * Math.PI * r;
  const pct   = Math.min(score / 100, 1);
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: size/2 + "px " + size/2 + "px" }} />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fontSize={size * 0.22} fontWeight={800} fill={color}>{score}</text>
    </svg>
  );
}

function MiniBar({ value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "5px" }}>
      <div style={{ flex: 1, background: "#0f172a", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
        <div style={{ width: pct + "%", background: color, height: "100%", borderRadius: "4px" }} />
      </div>
      <span style={{ fontSize: "0.7rem", color: "#64748b", minWidth: "28px", textAlign: "right" }}>{value}/{max}</span>
    </div>
  );
}

function ResultCard({ item, idx }) {
  const [expanded, setExpanded] = useState(false);
  const v        = VERDICT[item.verdict] || VERDICT.Skip;
  const barColor = item.fba_score >= 80 ? "#10b981" : item.fba_score >= 60 ? "#f59e0b" : "#ef4444";
  const verdictEmoji = item.verdict === "Winner" ? "Winner ✅" : item.verdict === "Maybe" ? "Maybe 🟡" : "Skip ❌";

  return (
    <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid " + v.border, marginBottom: "0.75rem", overflow: "hidden" }}>
      <div onClick={() => setExpanded(!expanded)}
        style={{ display: "grid", gridTemplateColumns: "32px 70px 1fr 90px 100px 120px 24px", alignItems: "center", gap: "1rem", padding: "0.9rem 1.25rem", cursor: "pointer" }}>
        <span style={{ fontWeight: 700, color: "#475569", fontSize: "0.85rem" }}>#{idx + 1}</span>
        <ScoreRing score={item.fba_score} size={60} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.title || item.asin}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
            <a href={item.amazon_url} target="_blank" rel="noopener noreferrer"
              style={{ color: "#818cf8", textDecoration: "none" }} onClick={e => e.stopPropagation()}>{item.asin}</a>
            {item.brand && <span style={{ marginLeft: "0.6rem" }}>· {item.brand}</span>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: "#e2e8f0" }}>${item.current_price != null ? item.current_price.toFixed(2) : "—"}</div>
          <div style={{ fontSize: "0.7rem", color: "#64748b" }}>price</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: "#e2e8f0" }}>#{(item.bsr || 0).toLocaleString()}</div>
          <div style={{ fontSize: "0.7rem", color: "#64748b" }}>BSR</div>
        </div>
        <span style={{ background: v.bg, color: v.color, border: "1px solid " + v.border, borderRadius: "999px", padding: "3px 11px", fontSize: "0.78rem", fontWeight: 700, textAlign: "center" }}>
          {verdictEmoji}
        </span>
        <span style={{ color: "#475569", fontSize: "0.9rem" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid #334155", padding: "1.25rem 1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
          <div>
            <p style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>Score Breakdown — {item.fba_score}/100</p>
            {SCORE_COLS.map(col => (
              <div key={col.key} style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "3px" }}>
                  <span>{col.label}</span>
                </div>
                <MiniBar value={item[col.key] || 0} max={col.max} color={barColor} />
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>Product Metrics</p>
            {[
              ["Monthly Sales",    "~" + ((item.monthly_sales || 0).toLocaleString()) + " units"],
              ["FBA Sellers",      item.fba_sellers != null ? item.fba_sellers : "—"],
              ["Total Sellers",    item.total_sellers != null ? item.total_sellers : "—"],
              ["Reviews",          (item.reviews || 0).toLocaleString()],
              ["Rating",           item.rating ? item.rating + " ⭐" : "—"],
              ["Price Volatility", item.price_volatility_pct != null ? item.price_volatility_pct + "%" : "—"],
              ["90d Avg",          item.avg_price_90d ? "$" + item.avg_price_90d : "—"],
              ["90d Low / High",   (item.min_price_90d && item.max_price_90d) ? "$" + item.min_price_90d + " / $" + item.max_price_90d : "—"],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #0f172a", fontSize: "0.83rem" }}>
                <span style={{ color: "#64748b" }}>{lbl}</span>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{val}</span>
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>Profit Snapshot</p>
            {item.profit_calc && item.profit_calc.breakeven_cost_25pct != null && (
              <div style={{ background: "#0c2340", border: "1px solid #1d4ed8", borderRadius: "8px", padding: "0.7rem", marginBottom: "0.75rem", fontSize: "0.85rem", color: "#93c5fd" }}>
                Source below <strong style={{ color: "#60a5fa" }}>${item.profit_calc.breakeven_cost_25pct}</strong> for 25% margin
              </div>
            )}
            {item.profit_calc && item.profit_calc.net_profit != null ? (
              [
                ["Sell Price",     "$" + (item.current_price || 0).toFixed(2)],
                ["Net Profit",     "$" + item.profit_calc.net_profit.toFixed(2)],
                ["Margin",         item.profit_calc.margin_pct.toFixed(1) + "%"],
                ["ROI",            item.profit_calc.roi_pct.toFixed(1) + "%"],
                ["Monthly Profit", "~$" + Math.round((item.profit_calc.net_profit || 0) * (item.monthly_sales || 0)).toLocaleString()],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #0f172a", fontSize: "0.83rem" }}>
                  <span style={{ color: "#64748b" }}>{lbl}</span>
                  <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{val}</span>
                </div>
              ))
            ) : (
              <p style={{ color: "#475569", fontSize: "0.82rem" }}>Enter a cost per unit to see full profit breakdown.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Scout() {
  const [asinsInput, setAsinsInput] = useState("");
  const [costInput,  setCostInput]  = useState("");
  const [loading,    setLoading]    = useState(false);
  const [progress,   setProgress]   = useState("");
  const [results,    setResults]    = useState([]);
  const [errors,     setErrors]     = useState([]);
  const [hasKey,     setHasKey]     = useState(false);
  const [tab,        setTab]        = useState("scout");
  const [history,    setHistory]    = useState([]);

  useEffect(() => {
    const key = localStorage.getItem("keepa_api_key") || "";
    setHasKey(!!key);
  }, []);

  const asinList = asinsInput
    .split(/[\n,\s]+/)
    .map(a => a.trim().toUpperCase())
    .filter(a => a.length >= 8 && a.length <= 12 && /^[A-Z0-9]+$/.test(a));
  const uniqueAsins = [...new Set(asinList)];

  async function handleScout() {
    if (uniqueAsins.length === 0) return;
    const apiKey = localStorage.getItem("keepa_api_key") || "";
    if (!apiKey) { alert("No Keepa API key found. Go to Settings and add your key first."); return; }
    setLoading(true);
    setResults([]);
    setErrors([]);
    setProgress("Fetching Keepa data for " + uniqueAsins.length + " ASIN" + (uniqueAsins.length > 1 ? "s" : "") + "...");
    try {
      const payload = { asins: uniqueAsins, keepa_api_key: apiKey, ...(costInput ? { cost_per_unit: parseFloat(costInput) } : {}) };
      const resp = await fetch(API_URL + "/scout/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!resp.ok) { const err = await resp.json(); throw new Error(err.detail || "Server error " + resp.status); }
      const data = await resp.json();
      setResults(data.results || []);
      setErrors(data.error_details || []);
      setProgress("Done — " + data.processed + " product" + (data.processed !== 1 ? "s" : "") + " scored" + (data.errors > 0 ? ", " + data.errors + " failed" : "") + ".");
    } catch (e) {
      setProgress("");
      alert("Scout failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      const resp = await fetch(API_URL + "/scout");
      const data = await resp.json();
      setHistory(data.results || []);
    } catch (_) {}
  }

  function switchTab(t) { setTab(t); if (t === "history") loadHistory(); }

  const winners = results.filter(r => r.verdict === "Winner").length;
  const maybes  = results.filter(r => r.verdict === "Maybe").length;
  const skips   = results.filter(r => r.verdict === "Skip").length;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>🎯 FBA Scout</h1>
        <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>Paste up to 50 ASINs — Scout fetches live Keepa data and ranks them by FBA viability automatically.</p>

        {!hasKey && (
          <div style={{ background: "#422006", border: "1px solid #d97706", borderRadius: "10px", padding: "0.85rem 1.25rem", marginBottom: "1.5rem", fontSize: "0.9rem", color: "#fde68a" }}>
            ⚠️ No Keepa API key saved.{" "}
            <a href="/settings" style={{ color: "#fbbf24", fontWeight: 700, textDecoration: "underline" }}>Go to Settings</a>{" "}
            to add your key before scouting.
          </div>
        )}

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid #1e293b" }}>
          {[{ id: "scout", label: "🔍 Bulk Scout" }, { id: "history", label: "📋 History" }].map(t => (
            <button key={t.id} onClick={() => switchTab(t.id)}
              style={{ background: tab === t.id ? "#1e293b" : "transparent", color: tab === t.id ? "#e2e8f0" : "#64748b", border: "none", borderBottom: tab === t.id ? "2px solid #6366f1" : "2px solid transparent", padding: "0.6rem 1.25rem", cursor: "pointer", fontWeight: tab === t.id ? 700 : 400, fontSize: "0.9rem", borderRadius: "8px 8px 0 0" }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "scout" && (
          <>
            <div style={{ background: "#1e293b", borderRadius: "12px", padding: "1.5rem", border: "1px solid #334155", marginBottom: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "1.25rem", alignItems: "start" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
                    ASINs — one per line or comma-separated (max 50)
                  </label>
                  <textarea value={asinsInput} onChange={e => setAsinsInput(e.target.value)}
                    placeholder={"B0CYT8BT8M\nB001234567\n..."} rows={7}
                    style={{ width: "100%", padding: "0.75rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", fontSize: "0.9rem", fontFamily: "monospace", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                  {uniqueAsins.length > 0 && (
                    <p style={{ fontSize: "0.78rem", marginTop: "4px", color: uniqueAsins.length > 50 ? "#f87171" : "#6366f1" }}>
                      {uniqueAsins.length} unique ASIN{uniqueAsins.length > 1 ? "s" : ""} detected
                      {uniqueAsins.length > 50 && " — please reduce to 50 or fewer"}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>Cost / Unit (optional)</label>
                    <input type="number" value={costInput} onChange={e => setCostInput(e.target.value)} placeholder="e.g. 12.50" step="0.01" min="0"
                      style={{ width: "100%", padding: "0.75rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }} />
                    <p style={{ fontSize: "0.72rem", color: "#475569", marginTop: "4px" }}>Enter wholesale cost for profit analysis</p>
                  </div>
                  <button onClick={handleScout} disabled={loading || uniqueAsins.length === 0 || uniqueAsins.length > 50}
                    style={{ padding: "0.9rem", background: (!loading && uniqueAsins.length > 0 && uniqueAsins.length <= 50) ? "#6366f1" : "#1e293b", color: (!loading && uniqueAsins.length > 0 && uniqueAsins.length <= 50) ? "#fff" : "#475569", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "1rem", cursor: (!loading && uniqueAsins.length > 0 && uniqueAsins.length <= 50) ? "pointer" : "not-allowed" }}>
                    {loading ? "Scouting…" : uniqueAsins.length > 0 ? "🚀 Scout " + uniqueAsins.length + " ASIN" + (uniqueAsins.length > 1 ? "s" : "") : "🚀 Scout ASINs"}
                  </button>
                  <p style={{ fontSize: "0.75rem", color: "#475569", lineHeight: 1.6 }}>
                    Powered by <a href="https://keepa.com" target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1" }}>Keepa API</a>.
                    Set your key in <a href="/settings" style={{ color: "#6366f1" }}>Settings</a>.
                  </p>
                </div>
              </div>
            </div>

            {(loading || progress) && (
              <div style={{ background: "#0c2340", border: "1px solid #1d4ed8", borderRadius: "8px", padding: "0.85rem 1.25rem", marginBottom: "1.5rem", color: "#93c5fd", fontSize: "0.9rem" }}>
                {loading && "⏳ "}{progress}
              </div>
            )}

            {results.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                {[
                  { label: "Scouted",    val: results.length, color: "#818cf8" },
                  { label: "Winners ✅", val: winners,         color: "#10b981" },
                  { label: "Maybe 🟡",   val: maybes,          color: "#f59e0b" },
                  { label: "Skip ❌",    val: skips,           color: "#ef4444" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#1e293b", borderRadius: "10px", padding: "1rem", border: "1px solid #334155", textAlign: "center" }}>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {results.map((item, i) => <ResultCard key={item.asin} item={item} idx={i} />)}

            {errors.length > 0 && (
              <div style={{ background: "#1e293b", borderRadius: "10px", padding: "1rem 1.25rem", border: "1px solid #7f1d1d", marginTop: "0.75rem" }}>
                <h4 style={{ color: "#fca5a5", fontSize: "0.88rem", marginBottom: "0.5rem" }}>
                  ⚠️ {errors.length} ASIN{errors.length > 1 ? "s" : ""} could not be fetched
                </h4>
                {errors.map(e => (
                  <div key={e.asin} style={{ fontSize: "0.8rem", color: "#94a3b8", padding: "3px 0" }}>
                    <span style={{ color: "#f87171", fontWeight: 600 }}>{e.asin}</span>: {e.error}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "history" && (
          <div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", color: "#475569", padding: "4rem 2rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎯</div>
                <p>No products scouted yet. Use the Bulk Scout tab to get started.</p>
              </div>
            ) : (
              history.map((item, i) => <ResultCard key={"h-" + item.asin + "-" + i} item={item} idx={i} />)
            )}
          </div>
        )}
      </main>
    </div>
  );
    }
