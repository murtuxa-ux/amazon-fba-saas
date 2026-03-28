import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

const AmazonSettings = () => {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [marketplaces, setMarketplaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("credentials");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    credential_type: "sp_api",
    seller_id: "",
    marketplace_id: "ATVPDKIKX0DER",
    client_id: "",
    client_secret: "",
    refresh_token: "",
    profile_id: "",
  });

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("ecomera_token") : null;
    setToken(t);
    if (!t) { router.push("/login"); return; }
    fetchCredentials(t);
    fetchSyncStatus(t);
    fetchSyncLogs(t);
    fetchMarketplaces(t);
  }, []);

  const headers = (t) => ({ Authorization: "Bearer " + (t || token), "Content-Type": "application/json" });

  const fetchCredentials = async (t) => {
    try {
      const res = await fetch(API + "/amazon/credentials", { headers: headers(t) });
      const data = await res.json();
      setCredentials(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Failed to fetch credentials", e); }
  };

  const fetchSyncStatus = async (t) => {
    try {
      const res = await fetch(API + "/amazon/sync/status", { headers: headers(t) });
      const data = await res.json();
      setSyncStatus(data);
    } catch (e) { console.error(e); }
  };

  const fetchSyncLogs = async (t) => {
    try {
      const res = await fetch(API + "/amazon/sync/logs?limit=20", { headers: headers(t) });
      const data = await res.json();
      setSyncLogs(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchMarketplaces = async (t) => {
    try {
      const res = await fetch(API + "/amazon/marketplaces", { headers: headers(t) });
      const data = await res.json();
      setMarketplaces(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(API + "/amazon/credentials", {
        method: "POST", headers: headers(), body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setFormData({ credential_type: "sp_api", seller_id: "", marketplace_id: "ATVPDKIKX0DER", client_id: "", client_secret: "", refresh_token: "", profile_id: "" });
        fetchCredentials();
      } else {
        alert(data.detail || "Failed to save");
      }
    } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(API + "/amazon/test-connection", {
        method: "POST", headers: headers(), body: JSON.stringify(formData),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) { setTestResult({ success: false, message: "Network error: " + e.message }); }
    setTesting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete these credentials?")) return;
    try {
      await fetch(API + "/amazon/credentials/" + id, { method: "DELETE", headers: headers() });
      fetchCredentials();
    } catch (e) { alert("Error: " + e.message); }
  };

  const handleSync = async (types) => {
    setSyncing(true);
    try {
      const res = await fetch(API + "/amazon/sync", {
        method: "POST", headers: headers(), body: JSON.stringify({ sync_types: types }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Sync started! " + (data.note || ""));
        setTimeout(() => { fetchSyncStatus(); fetchSyncLogs(); setSyncing(false); }, 5000);
      } else {
        alert(data.detail || "Sync failed");
        setSyncing(false);
      }
    } catch (e) { alert("Error: " + e.message); setSyncing(false); }
  };

  // Styles
  const S = {
    container: { display: "flex", minHeight: "100vh", backgroundColor: "#0A0A0A", color: "#FFFFFF", fontFamily: "system-ui, -apple-system, sans-serif" },
    content: { flex: 1, padding: "32px", overflowY: "auto" },
    title: { fontSize: "32px", fontWeight: "bold", marginBottom: "8px" },
    subtitle: { color: "#888", fontSize: "14px", marginBottom: "32px" },
    tabs: { display: "flex", gap: "16px", marginBottom: "32px", borderBottom: "1px solid #1E1E1E", paddingBottom: "16px" },
    tab: (a) => ({ padding: "8px 16px", fontSize: "14px", fontWeight: a ? "bold" : "normal", cursor: "pointer", color: a ? "#FFD700" : "#888", borderBottom: a ? "2px solid #FFD700" : "none", marginBottom: "-17px", backgroundColor: "transparent", border: "none" }),
    card: { backgroundColor: "#111", padding: "24px", borderRadius: "8px", border: "1px solid #1E1E1E", marginBottom: "16px" },
    cardTitle: { fontSize: "18px", fontWeight: "bold", marginBottom: "16px" },
    btn: { padding: "10px 20px", backgroundColor: "#FFD700", color: "#0A0A0A", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" },
    btnSec: { padding: "10px 20px", backgroundColor: "#1E1E1E", color: "#FFF", border: "1px solid #333", borderRadius: "6px", cursor: "pointer", fontSize: "14px" },
    btnDanger: { padding: "8px 16px", backgroundColor: "#EF4444", color: "#FFF", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" },
    input: { width: "100%", padding: "10px 12px", backgroundColor: "#0A0A0A", color: "#FFF", border: "1px solid #1E1E1E", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" },
    select: { padding: "10px 12px", backgroundColor: "#0A0A0A", color: "#FFF", border: "1px solid #1E1E1E", borderRadius: "4px", fontSize: "14px" },
    label: { display: "block", marginBottom: "6px", fontSize: "13px", color: "#888" },
    formGroup: { marginBottom: "16px" },
    badge: (color) => ({ display: "inline-block", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", backgroundColor: color + "20", color: color }),
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
    grid4: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" },
    stat: { backgroundColor: "#111", padding: "16px", borderRadius: "8px", border: "1px solid #1E1E1E" },
    statLabel: { color: "#888", fontSize: "11px", textTransform: "uppercase", marginBottom: "4px" },
    statValue: { fontSize: "20px", fontWeight: "bold", color: "#FFD700" },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { padding: "10px", textAlign: "left", fontSize: "12px", color: "#888", borderBottom: "1px solid #1E1E1E", fontWeight: "bold" },
    td: { padding: "10px", borderBottom: "1px solid #1E1E1E", fontSize: "13px" },
    helpText: { fontSize: "12px", color: "#666", marginTop: "4px" },
    modal: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
    modalContent: { backgroundColor: "#111", border: "1px solid #1E1E1E", borderRadius: "8px", padding: "32px", maxWidth: "600px", width: "90%", maxHeight: "90vh", overflowY: "auto" },
  };

  const statusColor = (s) => s === "success" ? "#22C55E" : s === "error" ? "#EF4444" : s === "syncing" ? "#FFD700" : "#888";

  return (
    <div style={S.container}>
      <Sidebar />
      <div style={S.content}>
        <h1 style={S.title}>Amazon API Integration</h1>
        <p style={S.subtitle}>Connect your Amazon Seller Central and Advertising accounts to sync real data</p>

        <div style={S.tabs}>
          <button style={S.tab(activeTab === "credentials")} onClick={() => setActiveTab("credentials")}>Credentials</button>
          <button style={S.tab(activeTab === "sync")} onClick={() => setActiveTab("sync")}>Sync & Status</button>
          <button style={S.tab(activeTab === "logs")} onClick={() => setActiveTab("logs")}>Sync Logs</button>
          <button style={S.tab(activeTab === "guide")} onClick={() => setActiveTab("guide")}>Setup Guide</button>
        </div>

        {/* ─── Credentials Tab ─── */}
        {activeTab === "credentials" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "bold" }}>API Credentials</h2>
              <button style={S.btn} onClick={() => setShowForm(true)}>+ Add Credentials</button>
            </div>

            {credentials.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: "48px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>&#128279;</div>
                <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>No Credentials Configured</h3>
                <p style={{ color: "#888", marginBottom: "24px" }}>Add your Amazon SP-API or Advertising API credentials to start syncing data.</p>
                <button style={S.btn} onClick={() => setShowForm(true)}>Add Your First Credential</button>
              </div>
            ) : (
              credentials.map((cred) => (
                <div key={cred.id} style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                          {cred.credential_type === "sp_api" ? "Selling Partner API (SP-API)" : "Amazon Advertising API"}
                        </span>
                        <span style={S.badge(statusColor(cred.sync_status))}>{cred.sync_status}</span>
                      </div>
                      <div style={{ color: "#888", fontSize: "13px" }}>
                        <span>Client ID: {cred.client_id ? cred.client_id.substring(0, 12) + "..." : "N/A"}</span>
                        {cred.seller_id && <span style={{ marginLeft: "16px" }}>Seller: {cred.seller_id}</span>}
                        {cred.marketplace_id && <span style={{ marginLeft: "16px" }}>Marketplace: {cred.marketplace_id}</span>}
                        {cred.profile_id && <span style={{ marginLeft: "16px" }}>Profile: {cred.profile_id}</span>}
                      </div>
                      {cred.last_sync_at && <div style={{ color: "#666", fontSize: "12px", marginTop: "8px" }}>Last synced: {cred.last_sync_at}</div>}
                      {cred.sync_error && <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px" }}>Error: {cred.sync_error}</div>}
                    </div>
                    <button style={S.btnDanger} onClick={() => handleDelete(cred.id)}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── Sync Tab ─── */}
        {activeTab === "sync" && (
          <div>
            <div style={S.grid4}>
              <div style={S.stat}>
                <div style={S.statLabel}>SP-API</div>
                <div style={{ ...S.statValue, color: syncStatus?.has_sp_api ? "#22C55E" : "#EF4444" }}>
                  {syncStatus?.has_sp_api ? "Connected" : "Not Connected"}
                </div>
              </div>
              <div style={S.stat}>
                <div style={S.statLabel}>Advertising API</div>
                <div style={{ ...S.statValue, color: syncStatus?.has_advertising ? "#22C55E" : "#EF4444" }}>
                  {syncStatus?.has_advertising ? "Connected" : "Not Connected"}
                </div>
              </div>
            </div>

            <div style={S.card}>
              <h3 style={S.cardTitle}>Sync Data from Amazon</h3>
              <p style={{ color: "#888", marginBottom: "24px", fontSize: "14px" }}>
                Click a button below to sync specific data types, or sync everything at once.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                <button style={S.btn} onClick={() => handleSync(["all"])} disabled={syncing}>
                  {syncing ? "Syncing..." : "Sync All Data"}
                </button>
                <button style={S.btnSec} onClick={() => handleSync(["ppc"])} disabled={syncing}>PPC Campaigns</button>
                <button style={S.btnSec} onClick={() => handleSync(["orders"])} disabled={syncing}>Orders</button>
                <button style={S.btnSec} onClick={() => handleSync(["shipments"])} disabled={syncing}>FBA Shipments</button>
                <button style={S.btnSec} onClick={() => handleSync(["inventory"])} disabled={syncing}>Inventory</button>
                <button style={S.btnSec} onClick={() => handleSync(["buybox"])} disabled={syncing}>Buy Box</button>
                <button style={S.btnSec} onClick={() => handleSync(["account_health"])} disabled={syncing}>Account Health</button>
              </div>
            </div>

            {syncStatus?.credentials && syncStatus.credentials.length > 0 && (
              <div style={S.card}>
                <h3 style={S.cardTitle}>Connection Status</h3>
                <table style={S.table}>
                  <thead>
                    <tr><th style={S.th}>Type</th><th style={S.th}>Status</th><th style={S.th}>Last Sync</th><th style={S.th}>Error</th></tr>
                  </thead>
                  <tbody>
                    {syncStatus.credentials.map((c, i) => (
                      <tr key={i}>
                        <td style={S.td}>{c.type === "sp_api" ? "SP-API" : "Advertising"}</td>
                        <td style={S.td}><span style={S.badge(statusColor(c.status))}>{c.status}</span></td>
                        <td style={S.td}>{c.last_sync || "Never"}</td>
                        <td style={{ ...S.td, color: "#EF4444" }}>{c.error || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── Logs Tab ─── */}
        {activeTab === "logs" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "bold" }}>Sync History</h2>
              <button style={S.btnSec} onClick={() => fetchSyncLogs()}>Refresh</button>
            </div>
            {syncLogs.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: "32px", color: "#888" }}>
                No sync logs yet. Run a sync to see history here.
              </div>
            ) : (
              <div style={S.card}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Type</th><th style={S.th}>Status</th><th style={S.th}>Records</th>
                      <th style={S.th}>Started</th><th style={S.th}>Completed</th><th style={S.th}>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={S.td}>{log.sync_type}</td>
                        <td style={S.td}><span style={S.badge(statusColor(log.status))}>{log.status}</span></td>
                        <td style={S.td}>{log.records_synced}</td>
                        <td style={S.td}>{log.started_at ? new Date(log.started_at).toLocaleString() : "-"}</td>
                        <td style={S.td}>{log.completed_at ? new Date(log.completed_at).toLocaleString() : "-"}</td>
                        <td style={{ ...S.td, color: "#EF4444", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>{log.error_message || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── Guide Tab ─── */}
        {activeTab === "guide" && (
          <div>
            <div style={S.card}>
              <h3 style={S.cardTitle}>Step 1: Amazon SP-API (Selling Partner API)</h3>
              <p style={{ color: "#CCC", lineHeight: 1.7, fontSize: "14px" }}>
                The SP-API gives you access to orders, FBA shipments, inventory, buy box data, and account health.
              </p>
              <ol style={{ color: "#AAA", lineHeight: 2, paddingLeft: "20px", marginTop: "12px", fontSize: "14px" }}>
                <li>Go to <strong style={{ color: "#FFD700" }}>Seller Central &gt; Apps &amp; Services &gt; Develop Apps</strong></li>
                <li>Register as a Developer (if not already) and create a new App</li>
                <li>Under <strong style={{ color: "#FFD700" }}>LWA credentials</strong>, note your <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                <li>Self-authorize your app to get a <strong>Refresh Token</strong></li>
                <li>Copy your <strong>Seller ID</strong> from Settings &gt; Account Info</li>
                <li>Paste all credentials in the Credentials tab above</li>
              </ol>
            </div>

            <div style={S.card}>
              <h3 style={S.cardTitle}>Step 2: Amazon Advertising API</h3>
              <p style={{ color: "#CCC", lineHeight: 1.7, fontSize: "14px" }}>
                The Advertising API gives you PPC campaign data: spend, sales, ACoS, impressions, keywords, and ad groups.
              </p>
              <ol style={{ color: "#AAA", lineHeight: 2, paddingLeft: "20px", marginTop: "12px", fontSize: "14px" }}>
                <li>Go to <strong style={{ color: "#FFD700" }}>advertising.amazon.com/developer</strong></li>
                <li>Register for API access (requires an Amazon Advertising account)</li>
                <li>Create a new application to get <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                <li>Authorize the app via OAuth to get your <strong>Refresh Token</strong></li>
                <li>Get your <strong>Profile ID</strong> from the Profiles API endpoint</li>
                <li>Add as a separate "Advertising" credential in the Credentials tab</li>
              </ol>
            </div>

            <div style={S.card}>
              <h3 style={S.cardTitle}>What Gets Synced</h3>
              <div style={{ ...S.grid2, marginTop: "16px" }}>
                <div style={{ padding: "12px", backgroundColor: "#0A0A0A", borderRadius: "4px" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#FFD700" }}>SP-API Data</div>
                  <div style={{ color: "#AAA", fontSize: "13px", lineHeight: 1.8 }}>
                    FBM Orders &amp; items, FBA Inbound Shipments, Inventory levels (FBA), Buy Box prices &amp; ownership, Account Health metrics, Catalog product data
                  </div>
                </div>
                <div style={{ padding: "12px", backgroundColor: "#0A0A0A", borderRadius: "4px" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#FFD700" }}>Advertising Data</div>
                  <div style={{ color: "#AAA", fontSize: "13px", lineHeight: 1.8 }}>
                    SP/SB/SD Campaigns, Ad Groups &amp; Keywords, Spend, Sales &amp; ACoS, Impressions &amp; Clicks, Performance reports
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Add Credential Modal ─── */}
        {showForm && (
          <div style={S.modal} onClick={() => setShowForm(false)}>
            <div style={S.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "24px" }}>Add Amazon API Credentials</h2>

              <div style={S.formGroup}>
                <label style={S.label}>Credential Type</label>
                <select value={formData.credential_type} onChange={(e) => setFormData({...formData, credential_type: e.target.value})} style={{...S.select, width: "100%"}}>
                  <option value="sp_api">Selling Partner API (SP-API)</option>
                  <option value="advertising">Amazon Advertising API</option>
                </select>
              </div>

              {formData.credential_type === "sp_api" && (
                <div style={S.formGroup}>
                  <label style={S.label}>Seller ID</label>
                  <input style={S.input} value={formData.seller_id} onChange={(e) => setFormData({...formData, seller_id: e.target.value})} placeholder="e.g., A3EXAMPLE1234" />
                  <p style={S.helpText}>Found in Seller Central &gt; Settings &gt; Account Info</p>
                </div>
              )}

              <div style={S.formGroup}>
                <label style={S.label}>Marketplace</label>
                <select value={formData.marketplace_id} onChange={(e) => setFormData({...formData, marketplace_id: e.target.value})} style={{...S.select, width: "100%"}}>
                  {marketplaces.map((m) => (
                    <option key={m.id} value={m.id}>{m.country} ({m.id})</option>
                  ))}
                  {marketplaces.length === 0 && <option value="ATVPDKIKX0DER">US (ATVPDKIKX0DER)</option>}
                </select>
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Client ID (LWA)</label>
                <input style={S.input} value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})} placeholder="amzn1.application-oa2-client.example" />
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Client Secret (LWA)</label>
                <input style={S.input} type="password" value={formData.client_secret} onChange={(e) => setFormData({...formData, client_secret: e.target.value})} placeholder="Your LWA client secret" />
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Refresh Token</label>
                <input style={S.input} type="password" value={formData.refresh_token} onChange={(e) => setFormData({...formData, refresh_token: e.target.value})} placeholder="Atzr|..." />
                <p style={S.helpText}>Generated when you self-authorize your app</p>
              </div>

              {formData.credential_type === "advertising" && (
                <div style={S.formGroup}>
                  <label style={S.label}>Advertising Profile ID</label>
                  <input style={S.input} value={formData.profile_id} onChange={(e) => setFormData({...formData, profile_id: e.target.value})} placeholder="e.g., 1234567890" />
                  <p style={S.helpText}>Get this from the Advertising API Profiles endpoint after auth</p>
                </div>
              )}

              {testResult && (
                <div style={{ padding: "12px", borderRadius: "6px", marginBottom: "16px", backgroundColor: testResult.success ? "#22C55E20" : "#EF444420", border: "1px solid " + (testResult.success ? "#22C55E" : "#EF4444") }}>
                  <div style={{ fontWeight: "bold", color: testResult.success ? "#22C55E" : "#EF4444" }}>
                    {testResult.success ? "Connection Successful" : "Connection Failed"}
                  </div>
                  <div style={{ fontSize: "13px", color: "#CCC", marginTop: "4px" }}>{testResult.message}</div>
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                <button style={S.btnSec} onClick={() => { setShowForm(false); setTestResult(null); }}>Cancel</button>
                <button style={{ ...S.btnSec, borderColor: "#3B82F6", color: "#3B82F6" }} onClick={handleTest} disabled={testing}>
                  {testing ? "Testing..." : "Test Connection"}
                </button>
                <button style={S.btn} onClick={handleSave} disabled={loading}>
                  {loading ? "Saving..." : "Save Credentials"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AmazonSettings;
