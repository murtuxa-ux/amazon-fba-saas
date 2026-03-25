import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

const T = {
  bg: "#0A0A0A", card: "#111111", cardAlt: "#161616",
  border: "#1E1E1E", borderHover: "#2A2A2A",
  yellow: "#FFD700", yellowDim: "rgba(255,215,0,0.1)",
  text: "#FFFFFF", textSec: "#888", textMut: "#444",
  green: "#22C55E", red: "#EF4444", blue: "#3B82F6",
  input: "#0A0A0A",
};

const STATUS_COLORS = {
  active:      { bg: "#052E16", color: "#4ADE80", border: "#166534" },
  inactive:    { bg: "#1C1917", color: "#78716C", border: "#44403C" },
  onboarding:  { bg: "#1C1400", color: "#FFD700", border: "#854D0E" },
};

const PLAN_COLORS = {
  Starter:    "#3B82F6",
  Pro:        "#8B5CF6",
  Enterprise: "#FFD700",
};

const MARKETPLACES = ["US", "UK", "CA", "DE", "FR", "IT", "ES", "AU", "IN", "JP"];
const PLANS        = ["Starter", "Pro", "Enterprise"];
const STATUSES     = ["active", "onboarding", "inactive"];

function token() { return typeof window !== "undefined" ? localStorage.getItem("ecomera_token") || "" : ""; }
function authHeader() { return { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" }; }

export default function Clients() {
  const [clients,    setClients]    = useState([]);
  const [managers,   setManagers]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [search,     setSearch]     = useState("");
  const [filterAM,   setFilterAM]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlan,   setFilterPlan]   = useState("");

  const [form, setForm] = useState({
    name: "", email: "", phone: "", marketplace: "US",
    plan: "Starter", assigned_am: "", monthly_budget: "",
    start_date: "", status: "active", asins: "", notes: "",
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [cRes, uRes] = await Promise.all([
        fetch(`${API_URL}/clients`, { headers: authHeader() }),
        fetch(`${API_URL}/users`,   { headers: authHeader() }),
      ]);
      const cData = await cRes.json();
      const uData = await uRes.json();
      setClients(cData.clients || []);
      setManagers((uData || []).filter(u => u.role === "account_manager" || u.role === "admin"));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function resetForm() {
    setForm({ name: "", email: "", phone: "", marketplace: "US", plan: "Starter",
              assigned_am: "", monthly_budget: "", start_date: "", status: "active", asins: "", notes: "" });
    setEditClient(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      monthly_budget: parseFloat(form.monthly_budget) || 0,
      asins: form.asins ? form.asins.split(/[\n,\s]+/).map(a => a.trim().toUpperCase()).filter(Boolean) : [],
    };
    try {
      if (editClient) {
        await fetch(`${API_URL}/clients/${editClient.id}`, {
          method: "PUT", headers: authHeader(), body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${API_URL}/clients`, {
          method: "POST", headers: authHeader(), body: JSON.stringify(payload),
        });
      }
      resetForm();
      setShowForm(false);
      fetchAll();
    } catch (e) { alert("Error saving client."); }
  }

  function startEdit(c) {
    setForm({
      name: c.name, email: c.email, phone: c.phone,
      marketplace: c.marketplace, plan: c.plan,
      assigned_am: c.assigned_am, monthly_budget: c.monthly_budget || "",
      start_date: c.start_date, status: c.status,
      asins: (c.asins || []).join("\n"), notes: c.notes,
    });
    setEditClient(c);
    setShowForm(true);
  }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !search || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
    const matchAM     = !filterAM     || c.assigned_am === filterAM;
    const matchStatus = !filterStatus || c.status === filterStatus;
    const matchPlan   = !filterPlan   || c.plan === filterPlan;
    return matchSearch && matchAM && matchStatus && matchPlan;
  });

  // Stats
  const totalActive   = clients.filter(c => c.status === "active").length;
  const totalBudget   = clients.reduce((s, c) => s + (c.monthly_budget || 0), 0);
  const byAM = managers.map(m => ({
    ...m, count: clients.filter(c => c.assigned_am === m.username).length
  }));

  const inp = {
    padding: "0.65rem 0.9rem", background: T.input, border: `1px solid ${T.border}`,
    borderRadius: "8px", color: T.text, fontSize: "0.87rem", outline: "none",
    width: "100%", boxSizing: "border-box",
  };
  const rowStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "system-ui, sans-serif" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem", minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.2rem" }}>Clients</h1>
            <p style={{ color: T.textSec, fontSize: "0.88rem" }}>Manage clients and assign them to account managers</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{ background: T.yellow, color: "#000", border: "none", borderRadius: "10px", padding: "0.7rem 1.5rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}
          >
            + Add Client
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
          {[
            { label: "Total Clients",    val: clients.length,         color: T.yellow },
            { label: "Active",           val: totalActive,            color: T.green },
            { label: "Account Managers", val: managers.length,        color: "#8B5CF6" },
            { label: "Monthly Budget",   val: `$${totalBudget.toLocaleString()}`, color: T.blue },
          ].map(s => (
            <div key={s.label} style={{ background: T.card, borderRadius: "12px", padding: "1.1rem 1.25rem", border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: "0.75rem", color: T.textSec, marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* AM workload */}
        {byAM.length > 0 && (
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            {byAM.map(m => (
              <div key={m.username} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "10px", padding: "0.6rem 1rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ width: "28px", height: "28px", background: T.yellow, color: "#000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.8rem" }}>
                  {m.avatar || m.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: "0.68rem", color: T.textSec }}>{m.count} client{m.count !== 1 ? "s" : ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…"
            style={{ ...inp, maxWidth: "240px", background: T.card }} />
          <select value={filterAM} onChange={e => setFilterAM(e.target.value)} style={{ ...inp, maxWidth: "180px", background: T.card }}>
            <option value="">All Managers</option>
            {managers.map(m => <option key={m.username} value={m.username}>{m.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inp, maxWidth: "150px", background: T.card }}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={{ ...inp, maxWidth: "140px", background: T.card }}>
            <option value="">All Plans</option>
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          y(search || filterAM || filterStatus || filterPlan) && (
            <button onClick={() => { setSearch(""); setFilterAM(""); setFilterStatus(""); setFilterPlan(""); }}
              style={{ background: "none", border: `1px solid ${T.border}`, color: T.textSec, padding: "0.65rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem" }}>
              Clear
            </button>
          )}
        </div>

        {/* Client table */}
        {loading ? (
          <div style={{ textAlign: "center", color: T.textSec, padding: "4rem" }}>Loading clients…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: T.textMut, padding: "4rem", background: T.card, borderRadius: "12px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>◈</div>
            <p>No clients found. {!clients.length && 'Click "+ Add Client" to get started.'}</p>
          </div>
        ) : (
          <div style={{ background: T.card, borderRadius: "14px", border: `1px solid ${T.border}`, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr 1fr 1fr 1fr 80px", padding: "0.75rem 1.25rem", borderBottom: `1px solid ${T.border}`, fontSize: "0.7rem", fontWeight: 700, color: T.textSec, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <span>Client</span><span>Account Manager</span><span>Plan</span><span>Status</span><span>Budget/mo</span><span>Actions</span>
            </div>
            {filtered.map((c, i) => {
              const sc = STATUS_COLORS[c.status] || STATUS_COLORS.active;
              const am = managers.find(m => m.username === c.assigned_am);
              return (
                <div key={c.id} style={{
                  display: "grid", gridTemplateColumns: "1.8fr 1.2fr 1fr 1fr 1fr 80px",
                  padding: "0.9rem 1.25rem", borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none",
                  alignItems: "center", fontSize: "0.85rem",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: T.text }}>{c.name}</div>
                    <div style={{ fontSize: "0.73rem", color: T.textSec }}>
                      {c.marketplace} · {c.asins?.length || 0} ASINs
                      {c.email && ` · ${c.email}`}
                    </div>
                  </div>
                  <div>
                    {am ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: "24px", height: "24px", background: T.yellow, color: "#000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.7rem" }}>
                          {am.avatar || am.name[0]}
                        </div>
                        <span style={{ color: T.text, fontSize: "0.83rem" }}>{am.name}</span>
                      </div>
                    ) : (
                      <span style={{ color: T.textMut, fontStyle: "italic" }}>Unassigned</span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: PLAN_COLORS[c.plan] || T.textSec, fontWeight: 600 }}>{c.plan}</span>
                  </div>
                  <div>
                    <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: "999px", padding: "2px 10px", fontSize: "0.75rem", fontWeight: 600 }}>
                      {c.status}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {c.monthly_budget ? `$${c.monthly_budget.toLocaleString()}` : "—"}
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button onClick={() => startEdit(c)}
                      style={{ background: "#1A1A1A", border: `1px solid ${T.border}`, color: T.textSec, borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "0.75rem" }}>
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit modal */}
        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <div style={{ background: "#111", border: `1px solid ${T.border}`, borderRadius: "18px", padding: "2rem", width: "100%", maxWidth: "640px", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontWeight: 800, fontSize: "1.2rem" }}>{editClient ? "Edit Client" : "Add New Client"}</h2>
                <button onClick={() => { setShowForm(false); resetForm(); }}
                  style={{ background: "none", border: "none", color: T.textSec, cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={rowStyle}>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: T.textSec, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Client Name *</label>
                    <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={inp} placeholder="e.g. Wise Buys LLC" />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: T.textSec, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} style={inp} placeholder="client@example.com" />
                  </div>
                </div>
                <div style={rowStyle}>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: T.textSec, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Phone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} style={inp} placeholder="+92 300 0000000" />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: T.textSec, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Marketplace</label>
                    <select value={form.marketplace} onChange={e => setForm(f => ({...f, marketplace: e.target.value}))} style={inp}>
                      {MARKETPLACES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div style={rowStyle}>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: T.textSec, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Account Manager</label>
                    <select value={form.assigned_am} onChange={e => setForm(f => ({...f, assigned_am: e.target.value}))} style={inp}>
                      <option value="">-- Select AM --</option>
                      {managers.map(m => <option key={m.username} value={m.username}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: T.textSec, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.2rem" }}>Plan</label>
                    <select value={form.plan} onChange={e => setForm(f => ({...f, plan: e.target.value}))} style={inp}>
                      {PLANS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div style={rowStyle}>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: T.textSec, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Monthly Budget ($)</label>
                    <input type="number" value={form.monthly_budget} onChange={e => setForm(f => ({...f, monthly_budget: e.target.value}))} style={inp} placeholder="5000" min="0" />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: T.textSec, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Start Date</label>
                    <input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} style={inp} />
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ fontSize: "0.72rem", color: T.textSec, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Status</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {STATUSES.map(s => (
                      <button key={s} type="button" onClick={() => setForm(f => ({...f, status: s}))}
                        style={{ padding: "0.4rem 1rem", borderRadius: "999px", border: `1px solid ${form.status === s ? T.yellow : T.border}`, background: form.status === s ? T.yellowDim : "none", color: form.status === s ? T.yellow : T.textSec, fontSize: "0.8rem", cursor: "pointer", fontWeight: form.status === s ? 700 : 400 }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ fontSize: "0.72rem", color: T.textSec, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>ASINs (one per line)</label>
                  <textarea value={form.asins} onChange={e => setForm(f => ({...f, asins: e.target.value}))} rows={3}
                    style={{ ...inp, fontFamily: "monospace", resize: "vertical" }} placeholder="B0CYT8BT8M&#10;B001234567" />
                </div>
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ fontSize: "0.72rem", color: T.textSec, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2}
                    style={{ ...inp, resize: "vertical" }} placeholder="Any notes about this client…" />
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button type="submit" style={{ flex: 1, padding: "0.85rem", background: T.yellow, color: "#000", border: "none", borderRadius: "10px", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer" }}>
                    {editClient ? "Save Changes" : "Add Client"}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                    style={{ padding: "0.85rem 1.5rem", background: "#1A1A1A", color: T.textSec, border: `1px solid ${T.border}`, borderRadius: "10px", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
