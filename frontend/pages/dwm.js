import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

function getToken() {
  if (typeof window !== "undefined") return localStorage.getItem("ecomera_token");
  return null;
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" };
}

const safeNum = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
const safeLoc = (v) => safeNum(v).toLocaleString();
const safeDollar = (v) => "$" + safeNum(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "daily",     label: "Daily Log" },
  { key: "weekly",    label: "Weekly View" },
  { key: "monthly",   label: "Monthly View" },
  { key: "approvals", label: "Approvals" },
  { key: "leaderboard", label: "Leaderboard" },
];

export default function DWMPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Dashboard state
  const [dashboardData, setDashboardData] = useState(null);
  const [dashPeriod, setDashPeriod] = useState("week");

  // Daily state
  const [dailyLogs, setDailyLogs] = useState([]);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [dailyFilter, setDailyFilter] = useState({ user_id: "", start_date: "", end_date: "" });
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [dailyForm, setDailyForm] = useState({
    log_date: new Date().toISOString().split("T")[0],
    role_type: "account_manager",
    notes: "",
    products: [{ asin: "", product_name: "", brand: "", category: "", brand_url: "" }],
    brands: [{ brand_name: "", distributor_name: "", category: "", contact_method: "email", contact_status: "pending" }],
  });

  // Weekly state
  const [weeklyData, setWeeklyData] = useState(null);
  const [weeklyYear, setWeeklyYear] = useState(new Date().getFullYear());
  const [weeklyWeek, setWeeklyWeek] = useState(getISOWeek(new Date()));

  // Monthly state
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1);

  // Approvals state
  const [approvals, setApprovals] = useState([]);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [approvalForm, setApprovalForm] = useState({
    approval_type: "brand", name: "", category: "", order_value: 0, reorder_value: 0,
    approval_date: new Date().toISOString().split("T")[0], notes: "",
  });

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbMetric, setLbMetric] = useState("products_hunted");
  const [lbPeriod, setLbPeriod] = useState("month");

  // ── Load team members on mount ─────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/dwm/team-members`, { headers: authHeaders() })
      .then(r => r.json()).then(d => setTeamMembers(d.members || [])).catch(() => {});
  }, []);

  // ── Load data when tab changes ──────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "dashboard") loadDashboard();
    if (activeTab === "daily") loadDailyLogs();
    if (activeTab === "weekly") loadWeekly();
    if (activeTab === "monthly") loadMonthly();
    if (activeTab === "approvals") loadApprovals();
    if (activeTab === "leaderboard") loadLeaderboard();
  }, [activeTab, dashPeriod, weeklyYear, weeklyWeek, monthlyYear, monthlyMonth, lbMetric, lbPeriod]);

  // ── API Loaders ────────────────────────────────────────────────────────────
  async function loadDashboard() {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/dwm/dashboard?period=${dashPeriod}`, { headers: authHeaders() });
      const d = await r.json();
      setDashboardData(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadDailyLogs() {
    setLoading(true);
    try {
      let url = `${API_URL}/dwm/daily?limit=50`;
      if (dailyFilter.user_id) url += `&user_id=${dailyFilter.user_id}`;
      if (dailyFilter.start_date) url += `&start_date=${dailyFilter.start_date}`;
      if (dailyFilter.end_date) url += `&end_date=${dailyFilter.end_date}`;
      const r = await fetch(url, { headers: authHeaders() });
      const d = await r.json();
      setDailyLogs(d.logs || []);
      setDailyTotal(d.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadWeekly() {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/dwm/weekly?year=${weeklyYear}&week=${weeklyWeek}`, { headers: authHeaders() });
      setWeeklyData(await r.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadMonthly() {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/dwm/monthly?year=${monthlyYear}&month=${monthlyMonth}`, { headers: authHeaders() });
      setMonthlyData(await r.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadApprovals() {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/dwm/approvals?limit=100`, { headers: authHeaders() });
      const d = await r.json();
      setApprovals(d.approvals || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadLeaderboard() {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/dwm/leaderboard?metric=${lbMetric}&period=${lbPeriod}`, { headers: authHeaders() });
      const d = await r.json();
      setLeaderboard(d.leaderboard || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  // ── Submit handlers ────────────────────────────────────────────────────────
  async function submitDailyLog(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/dwm/daily`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify(dailyForm),
      });
      const d = await r.json();
      if (!r.ok) { alert(d.detail || "Error creating log"); setLoading(false); return; }
      alert("Daily log created!");
      setShowDailyForm(false);
      setDailyForm({
        log_date: new Date().toISOString().split("T")[0], role_type: "account_manager", notes: "",
        products: [{ asin: "", product_name: "", brand: "", category: "", brand_url: "" }],
        brands: [{ brand_name: "", distributor_name: "", category: "", contact_method: "email", contact_status: "pending" }],
      });
      loadDailyLogs();
    } catch (e) { alert("Network error"); console.error(e); }
    setLoading(false);
  }

  async function submitApproval(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/dwm/approval`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify(approvalForm),
      });
      const d = await r.json();
      if (!r.ok) { alert(d.detail || "Error"); setLoading(false); return; }
      alert("Approval recorded!");
      setShowApprovalForm(false);
      setApprovalForm({ approval_type: "brand", name: "", category: "", order_value: 0, reorder_value: 0, approval_date: new Date().toISOString().split("T")[0], notes: "" });
      loadApprovals();
    } catch (e) { alert("Network error"); }
    setLoading(false);
  }

  async function deleteDailyLog(id) {
    if (!confirm("Delete this daily log?")) return;
    try {
      await fetch(`${API_URL}/dwm/daily/${id}`, { method: "DELETE", headers: authHeaders() });
      loadDailyLogs();
    } catch (e) { console.error(e); }
  }

  async function deleteApproval(id) {
    if (!confirm("Delete this approval?")) return;
    try {
      await fetch(`${API_URL}/dwm/approval/${id}`, { method: "DELETE", headers: authHeaders() });
      loadApprovals();
    } catch (e) { console.error(e); }
  }

  // ── Daily form helpers ─────────────────────────────────────────────────────
  function addProduct() {
    setDailyForm(f => ({ ...f, products: [...f.products, { asin: "", product_name: "", brand: "", category: "", brand_url: "" }] }));
  }
  function removeProduct(i) {
    setDailyForm(f => ({ ...f, products: f.products.filter((_, idx) => idx !== i) }));
  }
  function updateProduct(i, field, val) {
    setDailyForm(f => {
      const p = [...f.products];
      p[i] = { ...p[i], [field]: val };
      return { ...f, products: p };
    });
  }
  function addBrand() {
    setDailyForm(f => ({ ...f, brands: [...f.brands, { brand_name: "", distributor_name: "", category: "", contact_method: "email", contact_status: "pending" }] }));
  }
  function removeBrand(i) {
    setDailyForm(f => ({ ...f, brands: f.brands.filter((_, idx) => idx !== i) }));
  }
  function updateBrand(i, field, val) {
    setDailyForm(f => {
      const b = [...f.brands];
      b[i] = { ...b[i], [field]: val };
      return { ...f, brands: b };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={S.layout}>
      <Sidebar />
      <main style={S.main}>
        <div style={S.header}>
          <h1 style={S.title}>DWM Reporting System</h1>
          <p style={S.subtitle}>Daily / Weekly / Monthly Performance Tracking</p>
        </div>

        {/* Tab Bar */}
        <div style={S.tabBar}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ ...S.tab, ...(activeTab === t.key ? S.tabActive : {}) }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <div style={S.loader}>Loading...</div>}

        {/* ── DASHBOARD TAB ──────────────────────────────────────── */}
        {activeTab === "dashboard" && dashboardData && (
          <div>
            <div style={S.filterRow}>
              <select value={dashPeriod} onChange={e => setDashPeriod(e.target.value)} style={S.select}>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              <span style={S.periodLabel}>{dashboardData.period_label}</span>
            </div>

            {/* KPI Cards */}
            <div style={S.kpiGrid}>
              {[
                { label: "Team Members", value: dashboardData.kpis?.active_team_members || 0, color: "#FFD700" },
                { label: "Products Hunted", value: safeLoc(dashboardData.kpis?.total_products_hunted), color: "#22C55E" },
                { label: "Brands Contacted", value: safeLoc(dashboardData.kpis?.total_brands_contacted), color: "#3B82F6" },
                { label: "Approvals", value: dashboardData.kpis?.total_approvals || 0, color: "#A855F7" },
                { label: "Brand Approvals", value: dashboardData.kpis?.brand_approvals || 0, color: "#EC4899" },
                { label: "Distributor Approvals", value: dashboardData.kpis?.distributor_approvals || 0, color: "#F97316" },
                { label: "Order Value", value: safeDollar(dashboardData.kpis?.total_order_value), color: "#22C55E" },
                { label: "Avg Products/Person", value: dashboardData.kpis?.avg_products_per_person || 0, color: "#06B6D4" },
              ].map((kpi, i) => (
                <div key={i} style={S.kpiCard}>
                  <div style={{ ...S.kpiValue, color: kpi.color }}>{kpi.value}</div>
                  <div style={S.kpiLabel}>{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Team Breakdown Table */}
            <h3 style={S.sectionTitle}>Team Performance Breakdown</h3>
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Team Member</th>
                    <th style={S.th}>Products</th>
                    <th style={S.th}>Brands</th>
                    <th style={S.th}>Days Logged</th>
                    <th style={S.th}>Approvals</th>
                    <th style={S.th}>Order Value</th>
                    <th style={S.th}>Avg/Day</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboardData.team_breakdown || []).map((m, i) => (
                    <tr key={i} style={i % 2 === 0 ? S.trEven : {}}>
                      <td style={S.td}>{m.user_name}</td>
                      <td style={{ ...S.td, color: "#22C55E", fontWeight: 700 }}>{safeLoc(m.products_hunted)}</td>
                      <td style={{ ...S.td, color: "#3B82F6" }}>{safeLoc(m.brands_contacted)}</td>
                      <td style={S.td}>{m.days_logged}</td>
                      <td style={{ ...S.td, color: "#A855F7" }}>{m.approvals}</td>
                      <td style={{ ...S.td, color: "#FFD700" }}>{safeDollar(m.order_value)}</td>
                      <td style={S.td}>{m.avg_products_per_day}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Daily Trend Mini-Chart (text-based) */}
            {dashboardData.daily_trend && dashboardData.daily_trend.length > 0 && (
              <>
                <h3 style={S.sectionTitle}>Daily Activity Trend</h3>
                <div style={S.trendGrid}>
                  {dashboardData.daily_trend.map((d, i) => {
                    const maxP = Math.max(...dashboardData.daily_trend.map(x => x.products), 1);
                    const pct = Math.round((d.products / maxP) * 100);
                    return (
                      <div key={i} style={S.trendRow}>
                        <span style={S.trendDate}>{d.date.split("-").slice(1).join("/")}</span>
                        <div style={S.trendBarBg}>
                          <div style={{ ...S.trendBarFill, width: `${pct}%` }} />
                        </div>
                        <span style={S.trendVal}>{d.products}p / {d.brands}b</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── DAILY LOG TAB ──────────────────────────────────────── */}
        {activeTab === "daily" && (
          <div>
            <div style={S.filterRow}>
              <select value={dailyFilter.user_id} onChange={e => setDailyFilter(f => ({ ...f, user_id: e.target.value }))} style={S.select}>
                <option value="">All Members</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input type="date" value={dailyFilter.start_date} onChange={e => setDailyFilter(f => ({ ...f, start_date: e.target.value }))} style={S.input} />
              <input type="date" value={dailyFilter.end_date} onChange={e => setDailyFilter(f => ({ ...f, end_date: e.target.value }))} style={S.input} />
              <button onClick={loadDailyLogs} style={S.btnGold}>Filter</button>
              <button onClick={() => setShowDailyForm(!showDailyForm)} style={S.btnGreen}>
                {showDailyForm ? "Cancel" : "+ New Daily Log"}
              </button>
            </div>

            {/* Daily Entry Form */}
            {showDailyForm && (
              <form onSubmit={submitDailyLog} style={S.formCard}>
                <h3 style={S.formTitle}>New Daily Log</h3>
                <div style={S.formRow}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Date</label>
                    <input type="date" value={dailyForm.log_date} onChange={e => setDailyForm(f => ({ ...f, log_date: e.target.value }))} style={S.input} required />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Role Type</label>
                    <select value={dailyForm.role_type} onChange={e => setDailyForm(f => ({ ...f, role_type: e.target.value }))} style={S.select}>
                      <option value="account_manager">Account Manager</option>
                      <option value="sourcing_executive">Sourcing Executive</option>
                    </select>
                  </div>
                </div>

                {/* Products Section */}
                <div style={S.subSection}>
                  <div style={S.subHeader}>
                    <h4 style={S.subTitle}>Products Hunted ({dailyForm.products.length})</h4>
                    <button type="button" onClick={addProduct} style={S.btnSmall}>+ Add</button>
                  </div>
                  {dailyForm.products.map((p, i) => (
                    <div key={i} style={S.itemRow}>
                      <input placeholder="ASIN" value={p.asin} onChange={e => updateProduct(i, "asin", e.target.value)} style={S.inputSm} />
                      <input placeholder="Brand" value={p.brand} onChange={e => updateProduct(i, "brand", e.target.value)} style={S.inputSm} />
                      <input placeholder="Category" value={p.category} onChange={e => updateProduct(i, "category", e.target.value)} style={S.inputSm} />
                      <input placeholder="Brand URL" value={p.brand_url} onChange={e => updateProduct(i, "brand_url", e.target.value)} style={S.inputSm} />
                      {dailyForm.products.length > 1 && (
                        <button type="button" onClick={() => removeProduct(i)} style={S.btnRed}>X</button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Brands Section */}
                <div style={S.subSection}>
                  <div style={S.subHeader}>
                    <h4 style={S.subTitle}>Brands / Distributors Contacted ({dailyForm.brands.length})</h4>
                    <button type="button" onClick={addBrand} style={S.btnSmall}>+ Add</button>
                  </div>
                  {dailyForm.brands.map((b, i) => (
                    <div key={i} style={S.itemRow}>
                      <input placeholder="Brand Name" value={b.brand_name} onChange={e => updateBrand(i, "brand_name", e.target.value)} style={S.inputSm} />
                      <input placeholder="Distributor" value={b.distributor_name} onChange={e => updateBrand(i, "distributor_name", e.target.value)} style={S.inputSm} />
                      <input placeholder="Category" value={b.category} onChange={e => updateBrand(i, "category", e.target.value)} style={S.inputSm} />
                      <select value={b.contact_method} onChange={e => updateBrand(i, "contact_method", e.target.value)} style={S.selectSm}>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="website">Website</option>
                        <option value="other">Other</option>
                      </select>
                      {dailyForm.brands.length > 1 && (
                        <button type="button" onClick={() => removeBrand(i)} style={S.btnRed}>X</button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={S.formGroup}>
                  <label style={S.label}>Notes</label>
                  <textarea value={dailyForm.notes} onChange={e => setDailyForm(f => ({ ...f, notes: e.target.value }))} style={S.textarea} rows={2} />
                </div>

                <button type="submit" style={S.btnGold} disabled={loading}>
                  {loading ? "Submitting..." : "Submit Daily Log"}
                </button>
              </form>
            )}

            {/* Daily Logs Table */}
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Day</th>
                    <th style={S.th}>Team Member</th>
                    <th style={S.th}>Role</th>
                    <th style={S.th}>Products</th>
                    <th style={S.th}>Brands</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyLogs.map((log, i) => (
                    <tr key={log.id} style={i % 2 === 0 ? S.trEven : {}}>
                      <td style={S.td}>{log.log_date}</td>
                      <td style={S.td}>{log.day_name}</td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{log.user_name}</td>
                      <td style={S.td}>
                        <span style={{ ...S.badge, background: log.role_type === "account_manager" ? "#3B82F6" : "#A855F7" }}>
                          {log.role_type === "account_manager" ? "AM" : "SE"}
                        </span>
                      </td>
                      <td style={{ ...S.td, color: "#22C55E", fontWeight: 700 }}>{log.products_hunted}</td>
                      <td style={{ ...S.td, color: "#3B82F6", fontWeight: 700 }}>{log.brands_contacted}</td>
                      <td style={S.td}>
                        <button onClick={() => deleteDailyLog(log.id)} style={S.btnRedSm}>Del</button>
                      </td>
                    </tr>
                  ))}
                  {dailyLogs.length === 0 && (
                    <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#666" }}>No daily logs found. Create your first entry!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── WEEKLY VIEW TAB ─────────────────────────────────────── */}
        {activeTab === "weekly" && (
          <div>
            <div style={S.filterRow}>
              <input type="number" value={weeklyYear} onChange={e => setWeeklyYear(Number(e.target.value))} style={{ ...S.input, width: "100px" }} min={2020} max={2030} />
              <label style={S.label}>Week:</label>
              <input type="number" value={weeklyWeek} onChange={e => setWeeklyWeek(Number(e.target.value))} style={{ ...S.input, width: "80px" }} min={1} max={53} />
              <button onClick={loadWeekly} style={S.btnGold}>Load</button>
              {weeklyData && <span style={S.periodLabel}>{weeklyData.week_range}</span>}
            </div>

            {weeklyData && weeklyData.summaries && weeklyData.summaries.length > 0 ? (
              weeklyData.summaries.map((s, i) => (
                <div key={i} style={S.weeklyCard}>
                  <div style={S.weeklyHeader}>
                    <span style={S.weeklyName}>{s.user_name}</span>
                    <span style={{ ...S.badge, background: s.role_type === "account_manager" ? "#3B82F6" : "#A855F7" }}>
                      {s.role_type === "account_manager" ? "Account Manager" : "Sourcing Executive"}
                    </span>
                  </div>
                  <div style={S.weeklyStats}>
                    <div style={S.wStat}><span style={S.wStatVal}>{safeLoc(s.total_products_hunted)}</span><span style={S.wStatLabel}>Products Hunted</span></div>
                    <div style={S.wStat}><span style={{ ...S.wStatVal, color: "#3B82F6" }}>{safeLoc(s.total_brands_contacted)}</span><span style={S.wStatLabel}>Brands Contacted</span></div>
                    <div style={S.wStat}><span style={{ ...S.wStatVal, color: "#A855F7" }}>{s.total_approvals}</span><span style={S.wStatLabel}>Approvals</span></div>
                    <div style={S.wStat}><span style={{ ...S.wStatVal, color: "#FFD700" }}>{safeDollar(s.total_order_value)}</span><span style={S.wStatLabel}>Order Value</span></div>
                    <div style={S.wStat}><span style={S.wStatVal}>{s.days_logged}/5</span><span style={S.wStatLabel}>Days Logged</span></div>
                    <div style={S.wStat}><span style={S.wStatVal}>{s.avg_products_per_day}</span><span style={S.wStatLabel}>Avg/Day</span></div>
                  </div>
                  {/* Daily Breakdown */}
                  {s.daily_breakdown && s.daily_breakdown.length > 0 && (
                    <div style={S.dailyBreakdown}>
                      {s.daily_breakdown.map((d, j) => (
                        <div key={j} style={S.dayPill}>
                          <span style={S.dayName}>{d.day.substring(0, 3)}</span>
                          <span style={S.dayVal}>{d.products_hunted}p / {d.brands_contacted}b</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Approval Details */}
                  {s.approval_details && s.approval_details.length > 0 && (
                    <div style={S.approvalList}>
                      <strong style={{ color: "#FFD700", fontSize: "12px" }}>Approvals:</strong>
                      {s.approval_details.map((a, k) => (
                        <span key={k} style={S.approvalPill}>
                          {a.name} ({a.type}) - {safeDollar(a.order_value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={S.empty}>No weekly data available for this period.</div>
            )}
          </div>
        )}

        {/* ── MONTHLY VIEW TAB ────────────────────────────────────── */}
        {activeTab === "monthly" && (
          <div>
            <div style={S.filterRow}>
              <input type="number" value={monthlyYear} onChange={e => setMonthlyYear(Number(e.target.value))} style={{ ...S.input, width: "100px" }} min={2020} max={2030} />
              <select value={monthlyMonth} onChange={e => setMonthlyMonth(Number(e.target.value))} style={S.select}>
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <button onClick={loadMonthly} style={S.btnGold}>Load</button>
              {monthlyData && <span style={S.periodLabel}>{monthlyData.month}</span>}
            </div>

            {/* Team Totals */}
            {monthlyData && monthlyData.team_totals && (
              <div style={S.kpiGrid}>
                <div style={S.kpiCard}><div style={{ ...S.kpiValue, color: "#22C55E" }}>{safeLoc(monthlyData.team_totals.total_products_hunted)}</div><div style={S.kpiLabel}>Total Products</div></div>
                <div style={S.kpiCard}><div style={{ ...S.kpiValue, color: "#3B82F6" }}>{safeLoc(monthlyData.team_totals.total_brands_contacted)}</div><div style={S.kpiLabel}>Total Brands</div></div>
                <div style={S.kpiCard}><div style={{ ...S.kpiValue, color: "#A855F7" }}>{monthlyData.team_totals.total_approvals}</div><div style={S.kpiLabel}>Total Approvals</div></div>
                <div style={S.kpiCard}><div style={{ ...S.kpiValue, color: "#FFD700" }}>{safeDollar(monthlyData.team_totals.total_order_value)}</div><div style={S.kpiLabel}>Total Orders</div></div>
              </div>
            )}

            {/* Per-Person Monthly Cards */}
            {monthlyData && monthlyData.summaries && monthlyData.summaries.map((s, i) => (
              <div key={i} style={S.weeklyCard}>
                <div style={S.weeklyHeader}>
                  <span style={S.weeklyName}>{s.user_name}</span>
                  <span style={{ ...S.badge, background: s.role_type === "account_manager" ? "#3B82F6" : "#A855F7" }}>
                    {s.role_type === "account_manager" ? "AM" : "SE"}
                  </span>
                </div>
                <div style={S.weeklyStats}>
                  <div style={S.wStat}><span style={S.wStatVal}>{safeLoc(s.total_products_hunted)}</span><span style={S.wStatLabel}>Products</span></div>
                  <div style={S.wStat}><span style={{ ...S.wStatVal, color: "#3B82F6" }}>{safeLoc(s.total_brands_contacted)}</span><span style={S.wStatLabel}>Brands</span></div>
                  <div style={S.wStat}><span style={{ ...S.wStatVal, color: "#A855F7" }}>{s.brand_approvals} / {s.distributor_approvals}</span><span style={S.wStatLabel}>Brand / Dist Approvals</span></div>
                  <div style={S.wStat}><span style={{ ...S.wStatVal, color: "#FFD700" }}>{safeDollar(s.total_orders_placed)}</span><span style={S.wStatLabel}>Total Orders</span></div>
                  <div style={S.wStat}><span style={S.wStatVal}>{s.days_logged}</span><span style={S.wStatLabel}>Days Logged</span></div>
                </div>
                {/* Weekly Breakdown within Month */}
                {s.weekly_breakdown && s.weekly_breakdown.length > 0 && (
                  <div style={S.dailyBreakdown}>
                    {s.weekly_breakdown.map((w, j) => (
                      <div key={j} style={S.dayPill}>
                        <span style={S.dayName}>W{w.week}</span>
                        <span style={S.dayVal}>{w.products_hunted}p / {w.brands_contacted}b</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {(!monthlyData || !monthlyData.summaries || monthlyData.summaries.length === 0) && (
              <div style={S.empty}>No monthly data available for this period.</div>
            )}
          </div>
        )}

        {/* ── APPROVALS TAB ───────────────────────────────────────── */}
        {activeTab === "approvals" && (
          <div>
            <div style={S.filterRow}>
              <button onClick={() => setShowApprovalForm(!showApprovalForm)} style={S.btnGreen}>
                {showApprovalForm ? "Cancel" : "+ Record Approval"}
              </button>
            </div>

            {showApprovalForm && (
              <form onSubmit={submitApproval} style={S.formCard}>
                <h3 style={S.formTitle}>Record New Approval</h3>
                <div style={S.formRow}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Type</label>
                    <select value={approvalForm.approval_type} onChange={e => setApprovalForm(f => ({ ...f, approval_type: e.target.value }))} style={S.select}>
                      <option value="brand">Brand Approval</option>
                      <option value="distributor">Distributor Approval</option>
                    </select>
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Name</label>
                    <input value={approvalForm.name} onChange={e => setApprovalForm(f => ({ ...f, name: e.target.value }))} style={S.input} required placeholder="Brand or Distributor name" />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Category</label>
                    <input value={approvalForm.category} onChange={e => setApprovalForm(f => ({ ...f, category: e.target.value }))} style={S.input} placeholder="e.g. Health & Beauty" />
                  </div>
                </div>
                <div style={S.formRow}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Order Value ($)</label>
                    <input type="number" value={approvalForm.order_value} onChange={e => setApprovalForm(f => ({ ...f, order_value: Number(e.target.value) }))} style={S.input} min={0} />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Reorder Value ($)</label>
                    <input type="number" value={approvalForm.reorder_value} onChange={e => setApprovalForm(f => ({ ...f, reorder_value: Number(e.target.value) }))} style={S.input} min={0} />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Approval Date</label>
                    <input type="date" value={approvalForm.approval_date} onChange={e => setApprovalForm(f => ({ ...f, approval_date: e.target.value }))} style={S.input} required />
                  </div>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Notes</label>
                  <textarea value={approvalForm.notes} onChange={e => setApprovalForm(f => ({ ...f, notes: e.target.value }))} style={S.textarea} rows={2} />
                </div>
                <button type="submit" style={S.btnGold} disabled={loading}>
                  {loading ? "Saving..." : "Record Approval"}
                </button>
              </form>
            )}

            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Team Member</th>
                    <th style={S.th}>Type</th>
                    <th style={S.th}>Name</th>
                    <th style={S.th}>Category</th>
                    <th style={S.th}>Order Value</th>
                    <th style={S.th}>Reorder Value</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((a, i) => (
                    <tr key={a.id} style={i % 2 === 0 ? S.trEven : {}}>
                      <td style={S.td}>{a.approval_date}</td>
                      <td style={S.td}>{a.user_name}</td>
                      <td style={S.td}>
                        <span style={{ ...S.badge, background: a.approval_type === "brand" ? "#22C55E" : "#F97316" }}>
                          {a.approval_type}
                        </span>
                      </td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{a.name}</td>
                      <td style={S.td}>{a.category}</td>
                      <td style={{ ...S.td, color: "#FFD700" }}>{safeDollar(a.order_value)}</td>
                      <td style={{ ...S.td, color: "#22C55E" }}>{safeDollar(a.reorder_value)}</td>
                      <td style={S.td}>
                        <button onClick={() => deleteApproval(a.id)} style={S.btnRedSm}>Del</button>
                      </td>
                    </tr>
                  ))}
                  {approvals.length === 0 && (
                    <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#666" }}>No approvals recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LEADERBOARD TAB ─────────────────────────────────────── */}
        {activeTab === "leaderboard" && (
          <div>
            <div style={S.filterRow}>
              <select value={lbMetric} onChange={e => setLbMetric(e.target.value)} style={S.select}>
                <option value="products_hunted">Products Hunted</option>
                <option value="brands_contacted">Brands Contacted</option>
                <option value="approvals">Approvals</option>
                <option value="order_value">Order Value</option>
              </select>
              <select value={lbPeriod} onChange={e => setLbPeriod(e.target.value)} style={S.select}>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all_time">All Time</option>
              </select>
            </div>

            <div style={S.leaderboardWrap}>
              {leaderboard.map((entry, i) => {
                const medals = ["#FFD700", "#C0C0C0", "#CD7F32"];
                const medalColor = i < 3 ? medals[i] : "#555";
                const maxVal = Math.max(...leaderboard.map(e => e[lbMetric]), 1);
                const pct = Math.round((entry[lbMetric] / maxVal) * 100);

                return (
                  <div key={i} style={S.lbRow}>
                    <div style={{ ...S.lbRank, background: medalColor }}>{entry.rank}</div>
                    <div style={S.lbAvatar}>{entry.avatar}</div>
                    <div style={S.lbInfo}>
                      <div style={S.lbName}>{entry.user_name}</div>
                      <div style={S.lbBarBg}>
                        <div style={{ ...S.lbBarFill, width: `${pct}%`, background: medalColor }} />
                      </div>
                    </div>
                    <div style={S.lbValue}>
                      {lbMetric === "order_value" ? safeDollar(entry[lbMetric]) : safeLoc(entry[lbMetric])}
                    </div>
                  </div>
                );
              })}
              {leaderboard.length === 0 && (
                <div style={S.empty}>No data for this period yet.</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────
function getISOWeek(d) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const S = {
  layout: { display: "flex", minHeight: "100vh", background: "#0A0A0A" },
  main: { flex: 1, padding: "32px 40px", overflowY: "auto", color: "#E5E5E5" },
  header: { marginBottom: "24px" },
  title: { fontSize: "28px", fontWeight: 800, color: "#FFD700", margin: 0 },
  subtitle: { fontSize: "14px", color: "#888", marginTop: "4px" },
  loader: { textAlign: "center", padding: "40px", color: "#FFD700", fontSize: "16px" },

  // Tabs
  tabBar: { display: "flex", gap: "4px", marginBottom: "24px", background: "#111", borderRadius: "12px", padding: "4px", flexWrap: "wrap" },
  tab: { padding: "10px 20px", background: "transparent", border: "none", color: "#888", cursor: "pointer", borderRadius: "8px", fontSize: "13px", fontWeight: 600, transition: "all 0.2s" },
  tabActive: { background: "#1E1E1E", color: "#FFD700" },

  // Filter Row
  filterRow: { display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" },
  periodLabel: { color: "#FFD700", fontSize: "14px", fontWeight: 600 },

  // Inputs
  select: { background: "#1A1A1A", border: "1px solid #333", borderRadius: "8px", color: "#E5E5E5", padding: "8px 12px", fontSize: "13px" },
  input: { background: "#1A1A1A", border: "1px solid #333", borderRadius: "8px", color: "#E5E5E5", padding: "8px 12px", fontSize: "13px" },
  inputSm: { background: "#1A1A1A", border: "1px solid #333", borderRadius: "6px", color: "#E5E5E5", padding: "6px 8px", fontSize: "12px", flex: 1, minWidth: "80px" },
  selectSm: { background: "#1A1A1A", border: "1px solid #333", borderRadius: "6px", color: "#E5E5E5", padding: "6px 8px", fontSize: "12px", width: "100px" },
  textarea: { background: "#1A1A1A", border: "1px solid #333", borderRadius: "8px", color: "#E5E5E5", padding: "8px 12px", fontSize: "13px", width: "100%", resize: "vertical" },
  label: { fontSize: "12px", color: "#888", marginBottom: "4px", display: "block" },

  // Buttons
  btnGold: { background: "#FFD700", color: "#000", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: "13px" },
  btnGreen: { background: "#22C55E", color: "#000", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: "13px" },
  btnSmall: { background: "#333", color: "#FFD700", border: "1px solid #555", borderRadius: "6px", padding: "4px 12px", cursor: "pointer", fontSize: "12px", fontWeight: 600 },
  btnRed: { background: "#EF4444", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", fontSize: "11px", fontWeight: 600 },
  btnRedSm: { background: "transparent", color: "#EF4444", border: "1px solid #EF4444", borderRadius: "4px", padding: "2px 8px", cursor: "pointer", fontSize: "11px" },

  // KPI Grid
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" },
  kpiCard: { background: "#111", border: "1px solid #1E1E1E", borderRadius: "12px", padding: "20px", textAlign: "center" },
  kpiValue: { fontSize: "28px", fontWeight: 800, color: "#FFD700" },
  kpiLabel: { fontSize: "12px", color: "#888", marginTop: "4px" },

  // Section Title
  sectionTitle: { fontSize: "18px", fontWeight: 700, color: "#E5E5E5", margin: "24px 0 12px", borderBottom: "1px solid #1E1E1E", paddingBottom: "8px" },

  // Table
  tableWrap: { overflowX: "auto", marginTop: "8px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: { textAlign: "left", padding: "10px 12px", background: "#111", color: "#FFD700", borderBottom: "2px solid #1E1E1E", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" },
  td: { padding: "10px 12px", borderBottom: "1px solid #1A1A1A", color: "#CCC" },
  trEven: { background: "#0D0D0D" },

  // Badge
  badge: { padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, color: "#fff" },

  // Form
  formCard: { background: "#111", border: "1px solid #1E1E1E", borderRadius: "12px", padding: "24px", marginBottom: "20px" },
  formTitle: { fontSize: "16px", fontWeight: 700, color: "#FFD700", marginBottom: "16px", margin: "0 0 16px" },
  formRow: { display: "flex", gap: "16px", marginBottom: "12px", flexWrap: "wrap" },
  formGroup: { flex: 1, minWidth: "150px", marginBottom: "12px" },

  // Sub-sections (products/brands in form)
  subSection: { background: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: "8px", padding: "12px", marginBottom: "16px" },
  subHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  subTitle: { fontSize: "13px", fontWeight: 600, color: "#CCC", margin: 0 },
  itemRow: { display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" },

  // Weekly Card
  weeklyCard: { background: "#111", border: "1px solid #1E1E1E", borderRadius: "12px", padding: "20px", marginBottom: "16px" },
  weeklyHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  weeklyName: { fontSize: "18px", fontWeight: 700, color: "#E5E5E5" },
  weeklyStats: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px", marginBottom: "12px" },
  wStat: { textAlign: "center" },
  wStatVal: { display: "block", fontSize: "22px", fontWeight: 800, color: "#22C55E" },
  wStatLabel: { fontSize: "11px", color: "#888" },

  // Daily breakdown pills
  dailyBreakdown: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" },
  dayPill: { background: "#1A1A1A", border: "1px solid #333", borderRadius: "8px", padding: "6px 12px", display: "flex", flexDirection: "column", alignItems: "center" },
  dayName: { fontSize: "11px", color: "#FFD700", fontWeight: 600 },
  dayVal: { fontSize: "12px", color: "#CCC" },

  // Approval pills
  approvalList: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px", alignItems: "center" },
  approvalPill: { background: "#1A1A1A", border: "1px solid #FFD700", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", color: "#FFD700" },

  // Trend
  trendGrid: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" },
  trendRow: { display: "flex", alignItems: "center", gap: "12px" },
  trendDate: { width: "50px", fontSize: "12px", color: "#888", textAlign: "right" },
  trendBarBg: { flex: 1, height: "20px", background: "#1A1A1A", borderRadius: "4px", overflow: "hidden" },
  trendBarFill: { height: "100%", background: "linear-gradient(90deg, #FFD700, #F59E0B)", borderRadius: "4px", transition: "width 0.3s" },
  trendVal: { width: "80px", fontSize: "12px", color: "#CCC" },

  // Leaderboard
  leaderboardWrap: { display: "flex", flexDirection: "column", gap: "12px" },
  lbRow: { display: "flex", alignItems: "center", gap: "16px", background: "#111", border: "1px solid #1E1E1E", borderRadius: "12px", padding: "16px 20px" },
  lbRank: { width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "16px", color: "#000", flexShrink: 0 },
  lbAvatar: { width: "40px", height: "40px", borderRadius: "50%", background: "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700, color: "#FFD700", flexShrink: 0 },
  lbInfo: { flex: 1 },
  lbName: { fontSize: "15px", fontWeight: 600, color: "#E5E5E5", marginBottom: "6px" },
  lbBarBg: { height: "8px", background: "#1A1A1A", borderRadius: "4px", overflow: "hidden" },
  lbBarFill: { height: "100%", borderRadius: "4px", transition: "width 0.3s" },
  lbValue: { fontSize: "20px", fontWeight: 800, color: "#FFD700", minWidth: "80px", textAlign: "right" },

  // Empty state
  empty: { textAlign: "center", padding: "40px", color: "#666", fontSize: "14px" },
};
