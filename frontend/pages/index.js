import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

const T = {
  bg: "#0A0A0A", card: "#111111", border: "#1E1E1E",
  yellow: "#FFD700", yellowDim: "rgba(255,215,0,0.12)",
  text: "#FFFFFF", textSec: "#888", textMut: "#444",
  green: "#22C55E", red: "#EF4444", blue: "#3B82F6", purple: "#8B5CF6",
};

function authHeader() {
  const t = typeof window !== "undefined" ? localStorage.getItem("ecomera_token") : "";
  return { Authorization: `Bearer ${t}` };
}

function KPICard({ title, value, sub, color, icon }) {
  return (
    <div style={{ background: T.card, borderRadius: "14px", padding: "1.25rem 1.5rem", border: `1px solid ${T.border}`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: color || T.yellow }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: color || T.yellow, lineHeight: 1.1 }}>{value}</div>
          <div style={{ fontSize: "0.8rem", color: T.textSec, marginTop: "4px" }}>{title}</div>
          {sub && <div style={{ fontSize: "0.7rem", color: T.textMut, marginTop: "2px" }}>{sub}</div>}
        </div>
        <div style={{ fontSize: "1.4rem", opacity: 0.3 }}>{icon}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [kpis,  setKpis]  = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [user,  setUser]  = useState(null);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("ecomera_user") || "{}")); } catch (_) {}
    const h = authHeader();
    fetch(`${API}/dashboard`, { headers: h }).then(r => r.json()).then(setKpis).catch(() => {});
    fetch(`${API}/weekly`,    { headers: h }).then(r => r.json()).then(d => setWeeks(d.weeks || [])).catch(() => {});
  }, []);

  const greeting = user?.name ? `Welcome back, ${user.name.split(" ")[0]} 👋` : "Dashboard";

  const recentWeeks = weeks.slice(-8);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem", minWidth: 0 }}>

        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.2rem" }}>{greeting}</h1>
          <p style={{ color: T.textSec, fontSize: "0.88rem" }}>
            Ecom Era FBA Wholesale · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* KPI Cards */}
        {kpis ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
            <KPICard title="Total Revenue"       value={`$${kpis.total_revenue.toLocaleString()}`} color={T.yellow} icon="💰" />
            <KPICard title="Total Profit"        value={`$${kpis.total_profit.toLocaleString()}`}  color={T.green}  icon="📈" />
            <KPICard title="Avg ROI"             value={`${kpis.avg_roi_pct}%`}                    color={T.blue}   icon="%" />
            <KPICard title="Active Clients"      value={kpis.active_clients ?? "—"}                color={T.purple} icon="◈" sub={`${kpis.total_clients ?? 0} total`} />
            <KPICard title="Account Managers"    value={kpis.total_managers ?? "—"}               color="#F97316" icon="◑" />
            <KPICard title="Products Analyzed"   value={kpis.total_products_analyzed}              color={T.textSec} icon="◎" />
          </div>
        ) : (
          <div style={{ color: T.textMut, marginBottom: "1.75rem", padding: "2rem", background: T.card, borderRadius: "14px", textAlign: "center", border: `1px solid ${T.border}` }}>
            Loading dashboard data…
          </div>
        )}

        {/* Charts */}
        {recentWeeks.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            {/* Revenue chart */}
            <div style={{ background: T.card, borderRadius: "14px", padding: "1.5rem", border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: T.textSec, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
                Weekly Revenue
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={recentWeeks}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={T.yellow} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={T.yellow} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" tick={{ fill: "#555", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#555", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#1A1A1A", border: "none", borderRadius: "8px", color: "#FFF" }} />
                  <Area type="monotone" dataKey="revenue" stroke={T.yellow} strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Profit trend */}
            <div style={{ background: T.card, borderRadius: "14px", padding: "1.5rem", border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: T.textSec, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
                Profit Trend
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={recentWeeks}>
                  <defs>
                    <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={T.green} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={T.green} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" tick={{ fill: "#555", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#555", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#1A1A1A", border: "none", borderRadius: "8px", color: "#FFF" }} />
                  <Area type="monotone" dataKey="profit" stroke={T.green} strokeWidth={2} fill="url(#profGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Approved vs Purchased */}
            <div style={{ background: T.card, borderRadius: "14px", padding: "1.5rem", border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: T.textSec, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
                Approvals vs Purchases
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={recentWeeks}>
                  <XAxis dataKey="week" tick={{ fill: "#555", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#555", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#1A1A1A", border: "none", borderRadius: "8px", color: "#FFF" }} />
                  <Bar dataKey="approved"  fill={T.blue}   radius={[3, 3, 0, 0]} name="Approved" />
                  <Bar dataKey="purchased" fill={T.purple} radius={[3, 3, 0, 0]} name="Purchased" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Hunt funnel */}
            <div style={{ background: T.card, borderRadius: "14px", padding: "1.5rem", border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: T.textSec, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
                Hunting Funnel (latest week)
              </p>
              {recentWeeks.length > 0 && (() => {
                const w = recentWeeks[recentWeeks.length - 1];
                const steps = [
                  { label: "Hunted",    val: w.hunted,    color: T.textSec },
                  { label: "Analyzed",  val: w.analyzed,  color: T.blue },
                  { label: "Contacted", val: w.contacted, color: T.purple },
                  { label: "Approved",  val: w.approved,  color: T.yellow },
                  { label: "Purchased", val: w.purchased, color: T.green },
                ];
                return (
                  <div>
                    {steps.map((s, i) => {
                      const pct = s.val && steps[0].val ? Math.round(s.val / steps[0].val * 100) : 0;
                      return (
                        <div key={s.label} style={{ marginBottom: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "3px" }}>
                            <span style={{ color: T.textSec }}>{s.label}</span>
                            <span style={{ fontWeight: 700, color: s.color }}>{s.val ?? "—"} <span style={{ color: T.textMut, fontWeight: 400 }}>({pct}%)</span></span>
                          </div>
                          <div style={{ background: "#1A1A1A", borderRadius: "4px", height: "6px" }}>
                            <div style={{ width: `${pct}%`, background: s.color, height: "100%", borderRadius: "4px" }} />
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: "0.72rem", color: T.textMut, marginTop: "0.5rem" }}>Week: {w.week} · Manager: {w.manager}</div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div style={{ background: T.card, borderRadius: "14px", padding: "3rem", textAlign: "center", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem", opacity: 0.3 }}>▤</div>
            <p style={{ color: T.textSec, marginBottom: "0.5rem" }}>No weekly data yet.</p>
            <p style={{ color: T.textMut, fontSize: "0.83rem" }}>
              Go to <a href="/weekly" style={{ color: T.yellow }}>Weekly Report</a> to submit your first report, or <a href="/clients" style={{ color: T.yellow }}>add your clients</a> to get started.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
