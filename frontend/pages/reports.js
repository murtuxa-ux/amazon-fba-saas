import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

const T = {
  bg: "#0A0A0A", card: "#111111", border: "#1E1E1E",
  yellow: "#FFD700", yellowDim: "rgba(255,215,0,0.12)",
  text: "#FFFFFF", textSec: "#888", textMut: "#444",
  green: "#22C55E", red: "#EF4444", blue: "#3B82F6",
  purple: "#8B5CF6", input: "#0A0A0A",
};

const PIE_COLORS = ["#22C55E", "#FFD700", "#EF4444"];

function authHeader() {
  const t = typeof window !== "undefined" ? localStorage.getItem("ecomera_token") : "";
  return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{ background: T.card, borderRadius: "12px", padding: "1.25rem", border: `1px solid ${T.border}` }}>
      <div style={{ fontSize: "1.75rem", fontWeight: 800, color: color || T.yellow }}>{value}</div>
      <div style={{ fontSize: "0.8rem", color: T.textSec, marginTop: "3px" }}>{label}</div>
      {sub && <div style={{ fontSize: "0.72rem", color: T.textMut, marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

export default function Reports() {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [managers, setManagers] = useState([]);
  const [clients,  setClients]  = useState([]);

  // Filters
  const [period,    setPeriod]    = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");
  const [manager,   setManager]   = useState("");
  const [verdict,   setVerdict]   = useState("");
  const [minScore,  setMinScore]  = useState("");
  const [maxScore,  setMaxScore]  = useState("");

  useEffect(() => {
    fetchMeta();
    fetchReport();
  }, []);

  async function fetchMeta() {
    try {
      const [uRes, cRes] = await Promise.all([
        fetch(`${API_URL}/users`,   { headers: authHeader() }),
        fetch(`${API_URL}/clients`, { headers: authHeader() }),
      ]);
      const u = await uRes.json(); setManagers(Array.isArray(u) ? u : []);
      const c = await cRes.json(); setClients(Array.isArray(c.clients) ? c.clients : []);
    } catch (_) {}
  }

  async function fetchReport() {
    setLoading(true);
    const params = new URLSearchParams();
    if (period)    params.set("period",    period);
    if (startDate) params.set("start_date", startDate);
    if (endDate)   params.set("end_date",   endDate);
    if (manager)   params.set("manager",    manager);
    if (verdict)   params.set("verdict",    verdict);
    if (minScore)  params.set("min_score",  minScore);
    if (maxScore)  params.set("max_score",  maxScore);
    try {
      const res  = await fetch(`${API_URL}/reports/summary?${params}`, { headers: authHeader() });
      const json = await res.json();
      setData(json);
    } catch (_) {}
    setLoading(false);
  }

  function handleClearFilters() {
    setPeriod("monthly"); setStartDate(""); setEndDate("");
    setManager(""); setVerdict(""); setMinScore(""); setMaxScore("");
    setTimeout(fetchReport, 100);
  }

  const inp = {
    padding: "0.6rem 0.85rem", background: T.card, border: `1px solid ${T.border}`,
    borderRadius: "8px", color: T.text, fontSize: "0.84rem", outline: "none",
  };

  const verdictPieData = data ? [
    { name: "Winners", value: data.verdict_counts?.Winner || 0 },
    { name: "Maybe",   value: data.verdict_counts?.Maybe  || 0 },
    { name: "Skip",    value: data.verdict_counts?.Skip   || 0 },
  ] : [];

  const managerBarData = (data?.manager_summary || []).map(m => ({
    name:     m.manager.length > 8 ? m.manager.slice(0, 8) + "…" : m.manager,
    Revenue:  parseFloat(m.revenue.toFixed(0)),
    Profit:   parseFloat(m.profit.toFixed(0)),
    Approved: m.approved,
  }));

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "system-ui, sans-serif" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem", minWidth: 0 }}>

        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.2rem" }}>Reports & Analytics</h1>
          <p style={{ color: T.textSec, fontSize: "0.88rem" }}>Filter and analyze performance across all dimensions</p>
        </div>

        {/* Filters panel */}
        <div style={{ background: T.card, borderRadius: "14px", border: `1px solid ${T.border}`, padding: "1.25rem 1.5rem", marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: T.textSec, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1rem" }}>
            ◎ Filters
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
            {/* Period */}
            <div>
              <label style={{ fontSize: "0.68rem", color: T.textSec, display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>Period</label>
              <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            {/* Start date */}
            <div>
              <label style={{ fontSize: "0.68rem", color: T.textSec, display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inp} />
            </div>
            {/* End date */}
            <div>
              <label style={{ fontSize: "0.68rem", color: T.textSec, display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inp} />
            </div>
            {/* Manager */}
            <div>
              <label style={{ fontSize: "0.68rem", color: T.textSec, display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>Account Manager</label>
              <select value={manager} onChange={e => setManager(e.target.value)} style={inp}>
                <option value="">All Managers</option>
                {managers.map(m => <option key={m.username} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            {/* Verdict */}
            <div>
              <label style={{ fontSize: "0.68rem", color: T.textSec, display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>Scout Verdict</label>
              <select value={verdict} onChange={e => setVerdict(e.target.value)} style={inp}>
                <option value="">All Verdicts</option>
                <option value="Winner">Winners only</option>
                <option value="Maybe">Maybe only</option>
                <option value="Skip">Skip only</option>
              </select>
            </div>
            {/* Score range */}
            <div>
              <label style={{ fontSize: "0.68rem", color: T.textSec, display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>Min Score</label>
              <input type="number" min="0" max="100" value={minScore} onChange={e => setMinScore(e.target.value)} style={inp} placeholder="0" />
            </div>
            <div>
              <label style={{ fontSize: "0.68rem", color: T.textSec, display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>Max Score</label>
              <input type="number" min="0" max="100" value={maxScore} onChange={e => setMaxScore(e.target.value)} style={inp} placeholder="100" />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={fetchReport} style={{ background: T.yellow, color: "#000", border: "none", borderRadius: "8px", padding: "0.6rem 1.5rem", fontWeight: 700, fontSize: "0.87rem", cursor: "pointer" }}>
              Apply Filters
            </button>
            <button onClick={handleClearFilters} style={{ background: "#1A1A1A", color: T.textSec, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "0.6rem 1.2rem", fontSize: "0.87rem", cursor: "pointer" }}>
              Clear All
            </button>
          </div>
        </div>

        {loading && <div style={{ textAlign: "center", color: T.textSec, padding: "3rem" }}>Loading report…</div>}

        {data && !loading && (
          <>
            {/* KPI Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
              <StatBox label="Total Revenue"   value={`$${(data.total_revenue || 0).toLocaleString()}`} color={T.yellow} />
              <StatBox label="Total Profit"    value={`$${(data.total_profit || 0).toLocaleString()}`}  color={T.green}  />
              <StatBox label="Avg ROI"         value={`${data.avg_roi_pct}%`}                    color={T.blue}   />
              <StatBox label="Products Scouted" value={data.scouts_count} sub={`${data.weeks_count} weeks reported`} color={T.purple} />
            </div>

            {/* Verdict breakdown + Revenue chart */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.25rem", marginBottom: "1.75rem" }}>
              {/* Pie */}
              <div style={{ background: T.card, borderRadius: "14px", border: `1px solid ${T.border}`, padding: "1.25rem" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: T.textSec, textTransform: "uppercase", marginBottom: "1rem" }}>Scout Verdicts</p>
                {verdictPieData.every(d => d.value === 0) ? (
                  <div style={{ textAlign: "center", color: T.textMut, padding: "2rem 0" }}>No scout data for this period.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={verdictPieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {verdictPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#1A1A1A", border: "none", borderRadius: "8px", color: "#FFF" }} />
                      <Legend formatter={(v) => <span style={{ color: T.textSec, fontSize: "0.8rem" }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div style={{ display: "flex", justifyContent: "space-around", marginTop: "0.5rem" }}>
                  {[["Winners", T.green, data.verdict_counts?.Winner], ["Maybe", T.yellow, data.verdict_counts?.Maybe], ["Skip", T.red, data.verdict_counts?.Skip]].map(([l, c, v]) => (
                    <div key={l} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: c }}>{v || 0}</div>
                      <div style={{ fontSize: "0.68rem", color: T.textSec }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manager revenue bar */}
              <div style={{ background: T.card, borderRadius: "14px", border: `1px solid ${T.border}`, padding: "1.25rem" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: T.textSec, textTransform: "uppercase", marginBottom: "1rem" }}>Revenue & Profit by Manager</p>
                {managerBarData.length === 0 ? (
                  <div style={{ textAlign: "center", color: T.textMut, padding: "2rem 0" }}>No weekly reports submitted yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={managerBarData} barGap={4}>
                      <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#666", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#1A1A1A", border: "none", borderRadius: "8px", color: "#FFF" }} />
                      <Bar dataKey="Revenue" fill={T.yellow} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Profit"  fill={T.green}  radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Manager table */}
            {data.manager_summary?.length > 0 && (
              <div style={{ background: T.card, borderRadius: "14px", border: `1px solid ${T.border}`, marginBottom: "1.75rem", overflow: "hidden" }}>
                <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${T.border}`, fontSize: "0.75rem", fontWeight: 700, color: T.textSec, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Manager Performance
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                        {["Manager", "Revenue", "Profit", "ROI %", "Approved", "Purchased"].map(h => (
                          <th key={h} style={{ padding: "0.7rem 1rem", textAlign: "left", color: T.textSec, fontWeight: 600, fontSize: "0.75rem" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.manager_summary.sort((a, b) => b.revenue - a.revenue).map((m, i) => (
                        <tr key={i} style={{ borderBottom: i < data.manager_summary.length - 1 ? `1px solid ${T.border}` : "none" }}>
                          <td style={{ padding: "0.8rem 1rem", fontWeight: 600 }}>{m.manager}</td>
                          <td style={{ padding: "0.8rem 1rem", color: T.yellow }}>${(m.revenue || 0).toLocaleString()}</td>
                          <td style={{ padding: "0.8rem 1rem", color: T.green }}>${(m.profit || 0).toLocaleString()}</td>
                          <td style={{ padding: "0.8rem 1rem", color: m.roi_pct >= 20 ? T.green : m.roi_pct >= 10 ? T.yellow : T.red }}>{m.roi_pct}%</td>
                          <td style={{ padding: "0.8rem 1rem" }}>{m.approved}</td>
                          <td style={{ padding: "0.8rem 1rem" }}>{m.purchased}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top scouts */}
            {data.top_scouts?.length > 0 && (
              <div style={{ background: T.card, borderRadius: "14px", border: `1px solid ${T.border}`, overflow: "hidden" }}>
                <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${T.border}`, fontSize: "0.75rem", fontWeight: 700, color: T.textSec, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Top Scouted Products
                </div>
                {data.top_scouts.slice(0, 8).map((s, i) => {
                  const vc = s.verdict === "Winner" ? T.green : s.verdict === "Maybe" ? T.yellow : T.red;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.8rem 1.25rem", borderBottom: i < 7 ? `1px solid ${T.border}` : "none", fontSize: "0.84rem" }}>
                      <div style={{ fontWeight: 800, color: T.yellow, minWidth: "32px", fontSize: "1rem" }}>{s.fba_score}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title || s.asin}</div>
                        <div style={{ fontSize: "0.72rem", color: T.textSec }}>
                          <a href={s.amazon_url} target="_blank" rel="noopener noreferrer" style={{ color: "#6366F1", textDecoration: "none" }}>{s.asin}</a>
                          {s.brand && ` · ${s.brand}`}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: "70px" }}>
                        <div style={{ fontWeight: 600 }}>${s.current_price?.toFixed(2)}</div>
                        <div style={{ fontSize: "0.7rem", color: T.textSec }}>#{(s.bsr || 0).toLocaleString()}</div>
                      </div>
                      <span style={{ color: vc, fontWeight: 700, minWidth: "60px", textAlign: "right" }}>{s.verdict}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {data.top_scouts?.length === 0 && data.manager_summary?.length === 0 && (
              <div style={{ textAlign: "center", color: T.textMut, padding: "4rem", background: T.card, borderRadius: "14px", border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>▤</div>
                <p>No data matches the selected filters.</p>
                <p style={{ fontSize: "0.83rem", marginTop: "0.5rem" }}>Try submitting weekly reports or running FBA Scout first.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
