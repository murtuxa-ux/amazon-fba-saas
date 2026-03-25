import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

const T = {
  bg: "#0A0A0A", card: "#111111", border: "#1E1E1E",
  yellow: "#FFD700", yellowDim: "rgba(255,215,0,0.12)",
  text: "#FFFFFF", textSec: "#888", textMut: "#444",
  green: "#22C55E", red: "#EF4444", blue: "#3B82F6",
  purple: "#8B5CF6",
};

function authHeader() {
  const t = typeof window !== "undefined" ? localStorage.getItem("ecomera_token") : "";
  return { Authorization: `Bearer ${t}` };
}

function ProgressBar({ value, color, label, target, pct }) {
  const capped = Math.min(pct, 100);
  const barColor = pct >= 100 ? T.green : pct >= 70 ? T.yellow : T.red;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: T.textSec, marginBottom: "4px" }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: barColor }}>{value} / {target} ({pct}%)</span>
      </div>
      <div style={{ background: "#1A1A1A", borderRadius: "4px", height: "7px", overflow: "hidden" }}>
        <div style={{ width: `${capped}%`, background: barColor, height: "100%", borderRadius: "4px", transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function ManagerCard({ m, period }) {
  const scoreColor = m.hunted_pct >= 90 ? T.green : m.hunted_pct >= 60 ? T.yellow : T.red;
  const overall = Math.round((m.hunted_pct + m.analyzed_pct + m.approved_pct + m.purchased_pct) / 4);
  const overallColor = overall >= 90 ? T.green : overall >= 65 ? T.yellow : T.red;

  return (
    <div style={{ background: T.card, borderRadius: "16px", border: `1px solid ${T.border}`, padding: "1.5rem", position: "relative", overflow: "hidden" }}>
      {/* Top accent */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: overallColor }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: "44px", height: "44px", background: T.yellowDim, border: `2px solid ${T.yellow}`,
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: "1.1rem", color: T.yellow,
          }}>
            {m.manager[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem" }}>{m.manager}</div>
            <div style={{ fontSize: "0.72rem", color: T.textSec }}>{m.weeks} week{m.weeks !== 1 ? "s" : ""} reported</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: overallColor }}>{overall}%</div>
          <div style={{ fontSize: "0.68rem", color: T.textSec }}>Overall target</div>
        </div>
      </div>

      {/* Progress bars */}
      <ProgressBar label="Products Hunted"   value={m.hunted}    target={m.hunted_target}    pct={m.hunted_pct} />
      <ProgressBar label="Products Analyzed" value={m.analyzed}  target={m.analyzed_target}  pct={m.analyzed_pct} />
      <ProgressBar label="Approved"          value={m.approved}  target={m.approved_target}  pct={m.approved_pct} />
      <ProgressBar label="Purchased"         value={m.purchased} target={m.purchased_target} pct={m.purchased_pct} />
      <ProgressBar label="Revenue Target"    value={`$${m.revenue.toLocaleString()}`} target={`$${(m.revenue_target || 0).toLocaleString()}`} pct={m.revenue_pct} />

      {/* Stats footer */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginTop: "1.25rem", paddingTop: "1rem", borderTop: `1px solid ${T.border}` }}>
        {[
          { label: "ROI",           val: `${m.roi_pct}%`,     color: m.roi_pct >= 20 ? T.green : m.roi_pct >= 10 ? T.yellow : T.red },
          { label: "Approval Rate", val: `${m.approval_rate}%`, color: T.blue },
          { label: "Conversion",    val: `${m.conversion}%`,  color: T.purple },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: "0.65rem", color: T.textSec }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KPI() {
  const [data,    setData]    = useState(null);
  const [period,  setPeriod]  = useState("monthly");
  const [manager, setManager] = useState("");
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    fetchManagers();
    fetchKPI();
  }, []);

  async function fetchManagers() {
    try {
      const r = await fetch(`${API_URL}/users`, { headers: authHeader() });
      const d = await r.json();
      setManagers((d || []).filter(u => u.role === "account_manager"));
    } catch (_) {}
  }

  async function fetchKPI() {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (manager) params.set("manager", manager);
    try {
      const res  = await fetch(`${API_URL}/reports/kpi?${params}`, { headers: authHeader() });
      const json = await res.json();
      setData(json);
    } catch (_) {}
    setLoading(false);
  }

  useEffect(() => { fetchKPI(); }, [period, manager]);

  const inp = {
    padding: "0.6rem 0.85rem", background: T.card, border: `1px solid ${T.border}`,
    borderRadius: "8px", color: T.text, fontSize: "0.84rem", outline: "none",
  };

  // Top performer
  const top = data?.managers?.sort((a, b) => b.hunted_pct - a.hunted_pct)[0];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "system-ui, sans-serif" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem", minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.2rem" }}>KPI Scorecard</h1>
            <p style={{ color: T.textSec, fontSize: "0.88rem" }}>Track account manager performance against targets</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
              <option value="weekly">Weekly Targets</option>
              <option value="monthly">Monthly Targets</option>
              <option value="quarterly">Quarterly Targets</option>
            </select>
            <select value={manager} onChange={e => setManager(e.target.value)} style={inp}>
              <option value="">All Managers</option>
              {managers.map(m => <option key={m.username} value={m.name}>{m.name}</option>)}
            </select>
          </div>
        </div>

        {/* Targets reference */}
        {data?.targets && (
          <div style={{ background: T.card, borderRadius: "12px", border: `1px solid ${T.border}`, padding: "1rem 1.5rem", marginBottom: "1.75rem", display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: T.textSec, textTransform: "uppercase" }}>
              {period.toUpperCase()} TARGETS:
            </span>
            {["hunted", "analyzed", "approved", "purchased"].map(k => (
              <div key={k} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: T.textSec, textTransform: "capitalize" }}>{k}:</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: T.yellow }}>{data.targets[k]?.[period] ?? "—"}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: T.textSec }}>Revenue:</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: T.yellow }}>${(data.targets.revenue?.[period] || 0).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Top performer banner */}
        {top && (
          <div style={{ background: "linear-gradient(135deg, #1C1400, #2A1E00)", border: `1px solid ${T.yellow}22`, borderRadius: "14px", padding: "1rem 1.5rem", marginBottom: "1.75rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "1.5rem" }}>🏆</span>
            <div>
              <span style={{ fontWeight: 700, color: T.yellow }}>{top.manager}</span>
              <span style={{ color: T.textSec, fontSize: "0.85rem" }}> is the top performer this period — </span>
              <span style={{ fontWeight: 700, color: T.yellow }}>{top.hunted_pct}% of hunt target achieved</span>
            </div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", color: T.textSec, padding: "4rem" }}>Loading KPIs…</div>
        )}

        {/* Manager cards */}
        {data && !loading && data.managers?.length === 0 && (
          <div style={{ textAlign: "center", color: T.textMut, padding: "4rem", background: T.card, borderRadius: "14px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>◆</div>
            <p>No performance data yet.</p>
            <p style={{ fontSize: "0.83rem", marginTop: "0.5rem" }}>Account managers need to submit weekly reports first.</p>
          </div>
        )}

        {data && !loading && data.managers?.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
            {data.managers
              .sort((a, b) => {
                const aScore = Math.round((a.hunted_pct + a.analyzed_pct + a.approved_pct + a.purchased_pct) / 4);
                const bScore = Math.round((b.hunted_pct + b.analyzed_pct + b.approved_pct + b.purchased_pct) / 4);
                return bScore - aScore;
              })
              .map((m, i) => <ManagerCard key={i} m={m} period={period} />)
            }
          </div>
        )}

        {/* Legend */}
        <div style={{ display: "flex", gap: "1.5rem", marginTop: "1.5rem", padding: "1rem", borderRadius: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          {[[T.green, "≥90% — Excellent"], [T.yellow, "70–89% — On Track"], [T.red, "<70% — Needs Attention"]].map(([c, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: c }} />
              <span style={{ fontSize: "0.75rem", color: T.textSec }}>{l}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
