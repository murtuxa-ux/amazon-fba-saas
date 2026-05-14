import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

function getToken() {
  if (typeof window !== "undefined") return localStorage.getItem("ecomera_token");
  return null;
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" };
}

const S = {
  page: { display: "flex", minHeight: "100vh", background: "#0A0A0A", color: "#E0E0E0", fontFamily: "'Inter', system-ui, sans-serif" },
  // BUG-26 Sprint 2: marginLeft offsets the position:fixed Sidebar
  // (250px wide). Without this the H1 + tab bar render behind the
  // sidebar on first paint. Matches the convention used by /clients,
  // /suppliers, /dwm, etc.
  main: { flex: 1, marginLeft: "250px", padding: "2rem", overflowY: "auto" },
  title: { fontSize: "1.6rem", fontWeight: 800, color: "#FFD700", marginBottom: "0.25rem" },
  subtitle: { fontSize: "0.85rem", color: "#666", marginBottom: "1.5rem" },
  card: { background: "#111111", border: "1px solid #1E1E1E", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.25rem" },
  cardTitle: { fontSize: "1rem", fontWeight: 700, color: "#FFD700", marginBottom: "1rem" },
  tabs: { display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" },
  tab: (active) => ({ padding: "0.6rem 1.2rem", borderRadius: "8px", border: active ? "1px solid #FFD700" : "1px solid #1E1E1E", background: active ? "#FFD70015" : "#111111", color: active ? "#FFD700" : "#777", cursor: "pointer", fontWeight: active ? 700 : 400, fontSize: "0.85rem", transition: "all 0.15s" }),
  btn: { padding: "0.6rem 1.2rem", borderRadius: "8px", border: "none", background: "#FFD700", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" },
  btnOutline: { padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #333", background: "transparent", color: "#AAA", cursor: "pointer", fontSize: "0.8rem" },
  btnSm: (color) => ({ padding: "0.3rem 0.7rem", borderRadius: "6px", border: "none", background: color || "#222", color: "#FFF", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }),
  input: { padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #1E1E1E", background: "#0A0A0A", color: "#E0E0E0", fontSize: "0.85rem", width: "100%" },
  select: { padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #1E1E1E", background: "#0A0A0A", color: "#E0E0E0", fontSize: "0.85rem" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" },
  th: { padding: "0.6rem 0.5rem", textAlign: "left", borderBottom: "1px solid #1E1E1E", color: "#666", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase" },
  td: { padding: "0.55rem 0.5rem", borderBottom: "1px solid #0F0F0F", color: "#CCC" },
  badge: (color) => ({ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700, background: `${color}20`, color: color, border: `1px solid ${color}40` }),
  stat: { textAlign: "center", padding: "0.75rem" },
  statVal: { fontSize: "1.5rem", fontWeight: 800, color: "#FFD700" },
  statLabel: { fontSize: "0.72rem", color: "#666", marginTop: "0.25rem" },
  uploadArea: { border: "2px dashed #1E1E1E", borderRadius: "12px", padding: "2rem", textAlign: "center", cursor: "pointer", transition: "all 0.2s" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" },
};

export default function PPCActionPlan() {
  const [activeTab, setActiveTab] = useState("plans");
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planDetail, setPlanDetail] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clientName, setClientName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { fetchPlans(); fetchRules(); }, []);

  async function fetchPlans() {
    try {
      const r = await fetch(`${API}/ppc-action-plan/plans`, { headers: authHeaders() });
      if (r.ok) setPlans(await r.json());
    } catch (e) { console.error("Failed to fetch plans:", e); }
  }

  async function fetchRules() {
    try {
      const r = await fetch(`${API}/ppc-action-plan/rules`, { headers: authHeaders() });
      if (r.ok) setRules(await r.json());
    } catch (e) { console.error("Failed to fetch rules:", e); }
  }

  async function fetchPlanDetail(planId) {
    setLoading(true);
    try {
      const r = await fetch(`${API}/ppc-action-plan/plans/${planId}`, { headers: authHeaders() });
      if (r.ok) {
        const data = await r.json();
        setPlanDetail(data);
        setSelectedPlan(planId);
        setActiveTab("detail");
      }
    } catch (e) { console.error("Failed to fetch plan detail:", e); }
    setLoading(false);
  }

  async function handleUpload() {
    if (!clientName.trim()) {
      alert("Please enter a client name.");
      return;
    }
    if (!selectedFile && !fileRef.current?.files[0]) {
      alert("Please select a CSV file to upload.");
      return;
    }
    const file = fileRef.current?.files[0] || selectedFile;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please upload a CSV file. XLSX and other formats are not supported.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("client_name", clientName.trim());

    try {
      const token = getToken();
      if (!token) {
        alert("You are not logged in. Please log in first.");
        setUploading(false);
        return;
      }
      const r = await fetch(`${API}/ppc-action-plan/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (r.ok) {
        const data = await r.json();
        alert(`Action plan generated! ${data.bid_changes} bid changes, ${data.harvests} harvests, ${data.negatives} negatives.`);
        setClientName("");
        setSelectedFile(null);
        if (fileRef.current) fileRef.current.value = "";
        fetchPlans();
        fetchPlanDetail(data.plan_id);
      } else {
        let errMsg = "Upload failed (Status " + r.status + ")";
        try { const err = await r.json(); errMsg = err.detail || errMsg; } catch (_) {}
        alert("Error: " + errMsg);
      }
    } catch (e) {
      console.error("Upload error:", e);
      alert("Upload error: " + e.message + ". Please check your connection and try again.");
    }
    setUploading(false);
  }

  async function approveItem(type, itemId, approved) {
    const endpoint = type === "bid" ? "bid-changes" : type === "harvest" ? "harvests" : "negatives";
    try {
      await fetch(`${API}/ppc-action-plan/${endpoint}/${itemId}/approve`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ approved }),
      });
      if (selectedPlan) fetchPlanDetail(selectedPlan);
    } catch (e) { console.error("Approve error:", e); }
  }

  async function approveAll(planId) {
    try {
      await fetch(`${API}/ppc-action-plan/plans/${planId}/approve-all`, {
        method: "PUT",
        headers: authHeaders(),
      });
      fetchPlanDetail(planId);
      fetchPlans();
    } catch (e) { console.error("Approve all error:", e); }
  }

  function exportPlan(planId) {
    window.open(`${API}/ppc-action-plan/plans/${planId}/export?token=${getToken()}`, "_blank");
  }

  function StatusBadge({ status }) {
    const colors = { draft: "#888", reviewed: "#FFD700", approved: "#00CC66", applied: "#00AAFF" };
    return <span style={S.badge(colors[status] || "#888")}>{status?.toUpperCase()}</span>;
  }

  function ActionBadge({ action }) {
    if (!action) return null;
    const color = action.includes("Hard") ? "#FF4444" : action.includes("Mild") ? "#FFD700" : "#00CC66";
    return <span style={S.badge(color)}>{action}</span>;
  }

  return (
    <div style={S.page}>
      <Sidebar />
      <main style={S.main}>
        {/* BUG-28 Sprint 3: was <div>; bumped to <h1> for a11y / SEO. */}
        <h1 style={{ ...S.title, margin: 0 }}>PPC Action Plan Engine</h1>
        <div style={S.subtitle}>Automated bid optimization, keyword harvesting & negative management</div>

        <div style={S.tabs}>
          {["plans", "generate", "rules"].map(t => (
            <div key={t} style={S.tab(activeTab === t)} onClick={() => setActiveTab(t)}>
              {t === "plans" ? "Action Plans" : t === "generate" ? "Generate New" : "Rules Engine"}
            </div>
          ))}
          {planDetail && (
            <div style={S.tab(activeTab === "detail")} onClick={() => setActiveTab("detail")}>
              Plan Detail
            </div>
          )}
        </div>

        {/* ── Plans List ── */}
        {activeTab === "plans" && (
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={S.cardTitle}>Recent Action Plans</div>
              <button style={S.btn} onClick={() => setActiveTab("generate")}>+ Generate New Plan</button>
            </div>
            {plans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#555" }}>
                No action plans yet. Upload a Seller Central CSV to generate your first plan.
              </div>
            ) : (
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Client</th>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>ACoS</th>
                    <th style={S.th}>Spend</th>
                    <th style={S.th}>Bids</th>
                    <th style={S.th}>Harvests</th>
                    <th style={S.th}>Negatives</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map(p => (
                    <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => fetchPlanDetail(p.id)}>
                      <td style={{ ...S.td, fontWeight: 600, color: "#FFD700" }}>{p.client_name}</td>
                      <td style={S.td}>{p.plan_date?.split("T")[0]}</td>
                      <td style={S.td}><StatusBadge status={p.status} /></td>
                      <td style={{ ...S.td, color: p.overall_acos > 30 ? "#FF4444" : "#00CC66" }}>{p.overall_acos?.toFixed(1)}%</td>
                      <td style={S.td}>${p.total_spend?.toFixed(2)}</td>
                      <td style={S.td}>{p.bid_changes_count}</td>
                      <td style={S.td}>{p.harvest_count}</td>
                      <td style={S.td}>{p.negatives_count}</td>
                      <td style={S.td}>
                        <button style={S.btnSm("#1E1E1E")} onClick={(e) => { e.stopPropagation(); exportPlan(p.id); }}>Export</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Generate New Plan ── */}
        {activeTab === "generate" && (
          <div style={S.card}>
            <div style={S.cardTitle}>Generate New Action Plan</div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.4rem", display: "block" }}>Client Name *</label>
              <input style={{ ...S.input, maxWidth: "400px" }} placeholder="e.g. Creative Crafts HMA" value={clientName} onChange={e => setClientName(e.target.value)} />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.4rem", display: "block" }}>Upload PPC Data (CSV from Seller Central or Helium 10)</label>
              <div style={{ ...S.uploadArea, borderColor: selectedFile ? "#FFD700" : "#1E1E1E" }} onClick={() => fileRef.current?.click()}>
                <input type="file" ref={fileRef} accept=".csv" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) setSelectedFile(e.target.files[0]); }} />
                {selectedFile ? (
                  <>
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "#00CC66" }}>&#10003;</div>
                    <div style={{ color: "#FFD700", fontWeight: 600 }}>{selectedFile.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "#888", marginTop: "0.3rem" }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB — Click to change file
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>+</div>
                    <div style={{ color: "#888" }}>Click to upload CSV file</div>
                    <div style={{ fontSize: "0.72rem", color: "#555", marginTop: "0.5rem" }}>
                      Supports: Sponsored Products Bulk Sheet, Search Term Report, Campaign Report
                    </div>
                  </>
                )}
              </div>
            </div>
            <button style={{ ...S.btn, opacity: uploading ? 0.5 : 1 }} onClick={handleUpload} disabled={uploading}>
              {uploading ? "Generating..." : "Generate Action Plan"}
            </button>
          </div>
        )}

        {/* ── Plan Detail ── */}
        {activeTab === "detail" && planDetail && (
          <>
            {/* Summary */}
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <div style={S.cardTitle}>{planDetail.plan.client_name} — Action Plan</div>
                  <div style={{ fontSize: "0.8rem", color: "#666" }}>{planDetail.plan.plan_date?.split("T")[0]} | {planDetail.plan.report_period} | <StatusBadge status={planDetail.plan.status} /></div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button style={S.btnOutline} onClick={() => exportPlan(planDetail.plan.id)}>Export Excel</button>
                  {planDetail.plan.status === "draft" && (
                    <button style={S.btn} onClick={() => approveAll(planDetail.plan.id)}>Approve All</button>
                  )}
                </div>
              </div>

              <div style={S.grid}>
                <div style={S.stat}><div style={{ ...S.statVal, color: planDetail.plan.overall_acos > 30 ? "#FF4444" : "#00CC66" }}>{planDetail.plan.overall_acos?.toFixed(1)}%</div><div style={S.statLabel}>Overall ACoS</div></div>
                <div style={S.stat}><div style={S.statVal}>${planDetail.plan.total_spend?.toFixed(0)}</div><div style={S.statLabel}>Total Spend</div></div>
                <div style={S.stat}><div style={S.statVal}>${planDetail.plan.total_sales?.toFixed(0)}</div><div style={S.statLabel}>Total Sales</div></div>
                <div style={S.stat}><div style={S.statVal}>{planDetail.plan.total_keywords}</div><div style={S.statLabel}>Keywords</div></div>
                <div style={S.stat}><div style={{ ...S.statVal, color: "#FF8800" }}>{planDetail.plan.bid_changes_count}</div><div style={S.statLabel}>Bid Changes</div></div>
                <div style={S.stat}><div style={{ ...S.statVal, color: "#00CC66" }}>{planDetail.plan.harvest_count}</div><div style={S.statLabel}>Harvests</div></div>
                <div style={S.stat}><div style={{ ...S.statVal, color: "#FF4444" }}>{planDetail.plan.negatives_count}</div><div style={S.statLabel}>Negatives</div></div>
              </div>
            </div>

            {/* Bid Changes */}
            {planDetail.bid_changes.length > 0 && (
              <div style={S.card}>
                <div style={{ ...S.cardTitle, color: "#FF8800" }}>Bid Change Recommendations ({planDetail.bid_changes.length})</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Keyword</th>
                        <th style={S.th}>Campaign</th>
                        <th style={S.th}>Match</th>
                        <th style={S.th}>Impr</th>
                        <th style={S.th}>Clicks</th>
                        <th style={S.th}>Spend</th>
                        <th style={S.th}>Sales</th>
                        <th style={S.th}>ACoS</th>
                        <th style={S.th}>Bid</th>
                        <th style={S.th}>Action</th>
                        <th style={S.th}>New Bid</th>
                        <th style={S.th}>Approve</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planDetail.bid_changes.map(b => (
                        <tr key={b.id}>
                          <td style={{ ...S.td, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.keyword_target}</td>
                          <td style={{ ...S.td, maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.72rem" }}>{b.campaign}</td>
                          <td style={S.td}>{b.match_type}</td>
                          <td style={S.td}>{b.impressions?.toLocaleString()}</td>
                          <td style={S.td}>{b.clicks}</td>
                          <td style={S.td}>${b.spend?.toFixed(2)}</td>
                          <td style={S.td}>${b.sales?.toFixed(2)}</td>
                          <td style={{ ...S.td, color: b.acos > 30 ? "#FF4444" : "#00CC66", fontWeight: 600 }}>{b.acos?.toFixed(1)}%</td>
                          <td style={S.td}>${b.current_bid?.toFixed(2)}</td>
                          <td style={S.td}><ActionBadge action={b.action} /></td>
                          <td style={{ ...S.td, fontWeight: 700, color: "#FFD700" }}>${b.new_bid?.toFixed(2)}</td>
                          <td style={S.td}>
                            {b.approved === true ? <span style={S.badge("#00CC66")}>YES</span> :
                             b.approved === false ? <span style={S.badge("#FF4444")}>NO</span> : (
                              <div style={{ display: "flex", gap: "0.25rem" }}>
                                <button style={S.btnSm("#00CC66")} onClick={() => approveItem("bid", b.id, true)}>Y</button>
                                <button style={S.btnSm("#FF4444")} onClick={() => approveItem("bid", b.id, false)}>N</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Keyword Harvests */}
            {planDetail.harvests.length > 0 && (
              <div style={S.card}>
                <div style={{ ...S.cardTitle, color: "#00CC66" }}>Keyword Harvests ({planDetail.harvests.length})</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Search Term</th>
                        <th style={S.th}>Source Campaign</th>
                        <th style={S.th}>Target</th>
                        <th style={S.th}>Clicks</th>
                        <th style={S.th}>Orders</th>
                        <th style={S.th}>Spend</th>
                        <th style={S.th}>Sales</th>
                        <th style={S.th}>Action</th>
                        <th style={S.th}>Approve</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planDetail.harvests.map(h => (
                        <tr key={h.id}>
                          <td style={{ ...S.td, fontWeight: 600, color: "#00CC66" }}>{h.search_term}</td>
                          <td style={{ ...S.td, fontSize: "0.72rem" }}>{h.source_campaign}</td>
                          <td style={S.td}>{h.auto_target}</td>
                          <td style={S.td}>{h.clicks}</td>
                          <td style={S.td}>{h.orders}</td>
                          <td style={S.td}>${h.spend?.toFixed(2)}</td>
                          <td style={S.td}>${h.sales?.toFixed(2)}</td>
                          <td style={S.td}><span style={S.badge("#00CC66")}>{h.recommended_action}</span></td>
                          <td style={S.td}>
                            {h.approved === true ? <span style={S.badge("#00CC66")}>YES</span> :
                             h.approved === false ? <span style={S.badge("#FF4444")}>NO</span> : (
                              <div style={{ display: "flex", gap: "0.25rem" }}>
                                <button style={S.btnSm("#00CC66")} onClick={() => approveItem("harvest", h.id, true)}>Y</button>
                                <button style={S.btnSm("#FF4444")} onClick={() => approveItem("harvest", h.id, false)}>N</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Negatives */}
            {planDetail.negatives.length > 0 && (
              <div style={S.card}>
                <div style={{ ...S.cardTitle, color: "#FF4444" }}>Negatives to Add ({planDetail.negatives.length})</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Search Term</th>
                        <th style={S.th}>Source Campaign</th>
                        <th style={S.th}>Wasted Clicks</th>
                        <th style={S.th}>Wasted Spend</th>
                        <th style={S.th}>Action</th>
                        <th style={S.th}>Priority</th>
                        <th style={S.th}>Approve</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planDetail.negatives.map(n => (
                        <tr key={n.id}>
                          <td style={{ ...S.td, fontWeight: 600, color: "#FF4444" }}>{n.search_term}</td>
                          <td style={{ ...S.td, fontSize: "0.72rem" }}>{n.source_campaign}</td>
                          <td style={S.td}>{n.wasted_clicks}</td>
                          <td style={{ ...S.td, color: "#FF4444" }}>${n.wasted_spend?.toFixed(2)}</td>
                          <td style={S.td}><span style={S.badge("#FF4444")}>{n.recommended_action}</span></td>
                          <td style={S.td}><span style={S.badge(n.priority === "High" ? "#FF4444" : "#FFD700")}>{n.priority}</span></td>
                          <td style={S.td}>
                            {n.approved === true ? <span style={S.badge("#00CC66")}>YES</span> :
                             n.approved === false ? <span style={S.badge("#FF4444")}>NO</span> : (
                              <div style={{ display: "flex", gap: "0.25rem" }}>
                                <button style={S.btnSm("#00CC66")} onClick={() => approveItem("negative", n.id, true)}>Y</button>
                                <button style={S.btnSm("#FF4444")} onClick={() => approveItem("negative", n.id, false)}>N</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Rules Engine ── */}
        {activeTab === "rules" && (
          <div style={S.card}>
            <div style={S.cardTitle}>PPC Rules Engine Configuration</div>
            <div style={{ fontSize: "0.8rem", color: "#666", marginBottom: "1.5rem" }}>
              Configure thresholds per client. Changes apply to new action plans generated after saving.
            </div>
            {rules.length === 0 ? (
              <div style={{ color: "#555", padding: "1rem", textAlign: "center" }}>
                No rules configured yet. Generate an action plan and default rules will be created automatically.
              </div>
            ) : (
              rules.map(r => (
                <div key={r.id} style={{ background: "#0A0A0A", borderRadius: "8px", padding: "1rem", marginBottom: "1rem", border: "1px solid #1E1E1E" }}>
                  <div style={{ fontWeight: 700, color: "#FFD700", marginBottom: "0.75rem" }}>{r.name} {r.client_id ? `(Client #${r.client_id})` : "(Default)"}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", fontSize: "0.8rem" }}>
                    <div><span style={{ color: "#666" }}>Target ACoS:</span> <span style={{ color: "#FFD700", fontWeight: 700 }}>{r.target_acos}%</span></div>
                    <div><span style={{ color: "#666" }}>Max ACoS (Hard):</span> <span style={{ color: "#FF4444", fontWeight: 700 }}>{r.max_acos_hard}%</span></div>
                    <div><span style={{ color: "#666" }}>Raise Bid Below:</span> <span style={{ color: "#00CC66" }}>{r.raise_bid_threshold}%</span></div>
                    <div><span style={{ color: "#666" }}>Lower Mild Above:</span> <span style={{ color: "#FFD700" }}>{r.lower_bid_mild_threshold}%</span></div>
                    <div><span style={{ color: "#666" }}>Lower Hard Above:</span> <span style={{ color: "#FF4444" }}>{r.lower_bid_hard_threshold}%</span></div>
                    <div><span style={{ color: "#666" }}>Raise Bid %:</span> +{r.raise_bid_pct}%</div>
                    <div><span style={{ color: "#666" }}>Lower Mild %:</span> -{r.lower_bid_mild_pct}%</div>
                    <div><span style={{ color: "#666" }}>Lower Hard %:</span> -{r.lower_bid_hard_pct}%</div>
                    <div><span style={{ color: "#666" }}>Neg. Min Clicks:</span> {r.negative_min_clicks}</div>
                    <div><span style={{ color: "#666" }}>Harvest Min Orders:</span> {r.harvest_min_orders}</div>
                    <div><span style={{ color: "#666" }}>Harvest Max ACoS:</span> {r.harvest_max_acos}%</div>
                    <div><span style={{ color: "#666" }}>Min Impressions:</span> {r.min_impressions}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
