import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://amazon-fba-saas-production.up.railway.app";

const token = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("ecomera_token");
  }
  return null;
};

const authHeader = () => ({
  Authorization: `Bearer ${token()}`,
  "Content-Type": "application/json",
});

/* ── Color tokens ────────────────────────────────────────────────────────── */
const bg = "#0A0A0A";
const cardBg = "#111111";
const border = "#1E1E1E";
const yellow = "#FFD700";
const text = "#FFFFFF";
const textSec = "#888888";
const green = "#22C55E";
const red = "#EF4444";
const blue = "#3B82F6";
const purple = "#A855F7";
const orange = "#F97316";

/* ── Default KPI templates per role ──────────────────────────────────────── */
const AM_METRICS = [
  { key: "clients_managed", label: "Clients Managed", unit: "" },
  { key: "revenue_target", label: "Revenue Target ($)", unit: "$" },
  { key: "profit_target", label: "Profit Target ($)", unit: "$" },
  { key: "roi_target", label: "ROI Target (%)", unit: "%" },
  { key: "orders_placed", label: "Orders Placed", unit: "" },
  { key: "restock_alerts", label: "Restock Alerts Handled", unit: "" },
  { key: "client_calls", label: "Client Calls/Meetings", unit: "" },
  { key: "account_health", label: "Account Health Score", unit: "%" },
];

const SE_METRICS = [
  { key: "products_hunted", label: "Products Hunted", unit: "" },
  { key: "products_analyzed", label: "Products Analyzed", unit: "" },
  { key: "suppliers_contacted", label: "Suppliers Contacted", unit: "" },
  { key: "products_approved", label: "Products Approved", unit: "" },
  { key: "products_purchased", label: "Products Purchased", unit: "" },
  { key: "approval_rate", label: "Approval Rate (%)", unit: "%" },
  { key: "avg_roi_found", label: "Avg ROI Found (%)", unit: "%" },
  { key: "new_suppliers", label: "New Suppliers Added", unit: "" },
];

export default function KPIPage() {
  const [activeTab, setActiveTab] = useState("scorecard");
  const [period, setPeriod] = useState("monthly");
  const [teamMembers, setTeamMembers] = useState([]);
  const [kpiData, setKpiData] = useState(null);
  const [targets, setTargets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  /* ── Target form state ──────────────────────────────────────────────── */
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberRole, setMemberRole] = useState("sourcing_expert");
  const [targetValues, setTargetValues] = useState({});

  useEffect(() => {
    fetchTeamMembers();
    fetchKPIData();
    fetchTargets();
  }, [period]);

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`, { headers: authHeader() });
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data);
      }
    } catch (e) {}
  };

  const fetchKPIData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/reports/kpi?period=${period}`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setKpiData(data);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTargets = async () => {
    try {
      const res = await fetch(`${API_URL}/kpi/targets?period=${period}`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setTargets(data.targets || {});
      }
    } catch (e) {
      // Endpoint may not exist yet — use defaults
    }
  };

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    const existingTargets =
      targets[member.username] || targets[member.name] || {};
    setMemberRole(existingTargets.role_type || "sourcing_expert");
    setTargetValues(existingTargets.metrics || {});
    setSuccessMsg("");
  };

  const handleTargetChange = (metricKey, value) => {
    setTargetValues((prev) => ({
      ...prev,
      [metricKey]: value === "" ? "" : parseFloat(value) || 0,
    }));
  };

  const handleSaveTargets = async () => {
    if (!selectedMember) return;
    setSaving(true);
    setError(null);
    setSuccessMsg("");

    try {
      const res = await fetch(`${API_URL}/kpi/targets`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({
          username: selectedMember.username,
          name: selectedMember.name,
          role_type: memberRole,
          period: period,
          metrics: targetValues,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`Targets saved for ${selectedMember.name}`);
        fetchTargets();
      } else {
        const data = await res.json();
        throw new Error(data.detail || "Failed to save targets");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const getMetrics = () =>
    memberRole === "account_manager" ? AM_METRICS : SE_METRICS;

  const getProgressColor = (pct) => {
    if (pct >= 100) return green;
    if (pct >= 75) return blue;
    if (pct >= 50) return yellow;
    if (pct >= 25) return orange;
    return red;
  };

  /* ── Input field style ─────────────────────────────────────────────── */
  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#0A0A0A",
    border: `1px solid ${border}`,
    borderRadius: "6px",
    color: text,
    fontSize: "14px",
    boxSizing: "border-box",
    transition: "border-color 0.2s ease",
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: bg,
        color: text,
        fontFamily: "system-ui",
      }}
    >
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2rem",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: 0 }}>
              KPI Dashboard
            </h1>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {/* Period Selector */}
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{
                  padding: "8px 16px",
                  background: cardBg,
                  border: `1px solid ${border}`,
                  borderRadius: "6px",
                  color: text,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
          </div>

          {/* Tab Navigation */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              marginBottom: "2rem",
              background: cardBg,
              borderRadius: "8px",
              padding: "4px",
              width: "fit-content",
            }}
          >
            {[
              { key: "scorecard", label: "Scorecard" },
              { key: "targets", label: "Set Targets" },
              { key: "weekly", label: "Log Weekly Data" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "10px 24px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor:
                    activeTab === tab.key ? yellow : "transparent",
                  color: activeTab === tab.key ? "#0A0A0A" : textSec,
                  fontWeight: activeTab === tab.key ? "700" : "500",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── TAB: SCORECARD ─────────────────────────────────────── */}
          {activeTab === "scorecard" && (
            <ScoreboardTab
              kpiData={kpiData}
              targets={targets}
              loading={loading}
              error={error}
              period={period}
              getProgressColor={getProgressColor}
            />
          )}

          {/* ─── TAB: SET TARGETS ──────────────────────────────────── */}
          {activeTab === "targets" && (
            <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px" }}>
              {/* Team Members List */}
              <div
                style={{
                  background: cardBg,
                  border: `1px solid ${border}`,
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: textSec,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "12px",
                  }}
                >
                  Team Members
                </h3>
                {teamMembers.length === 0 ? (
                  <p style={{ color: textSec, fontSize: "13px" }}>
                    No team members found
                  </p>
                ) : (
                  teamMembers.map((m, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelectMember(m)}
                      style={{
                        padding: "12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        marginBottom: "4px",
                        backgroundColor:
                          selectedMember?.username === m.username
                            ? "rgba(255, 215, 0, 0.1)"
                            : "transparent",
                        border:
                          selectedMember?.username === m.username
                            ? `1px solid ${yellow}`
                            : "1px solid transparent",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${yellow}, ${orange})`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "#0A0A0A",
                          }}
                        >
                          {(m.avatar || m.name?.[0] || "U").toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "600" }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: "12px", color: textSec }}>
                            {m.role}
                          </div>
                        </div>
                      </div>
                      {targets[m.username] && (
                        <div
                          style={{
                            marginTop: "6px",
                            fontSize: "11px",
                            color: green,
                            paddingLeft: "46px",
                          }}
                        >
                          Targets set
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Target Input Form */}
              <div
                style={{
                  background: cardBg,
                  border: `1px solid ${border}`,
                  borderRadius: "8px",
                  padding: "24px",
                }}
              >
                {!selectedMember ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "60px 20px",
                      color: textSec,
                    }}
                  >
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      &#127919;
                    </div>
                    <h3 style={{ fontSize: "18px", marginBottom: "8px", color: text }}>
                      Select a Team Member
                    </h3>
                    <p style={{ fontSize: "14px" }}>
                      Click on a team member from the left to set their KPI
                      targets
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "24px",
                      }}
                    >
                      <h2 style={{ fontSize: "20px", fontWeight: "700", margin: 0 }}>
                        Targets for {selectedMember.name}
                      </h2>
                      <span
                        style={{
                          fontSize: "13px",
                          color: textSec,
                          padding: "4px 12px",
                          background: "#1a1a1a",
                          borderRadius: "12px",
                        }}
                      >
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </span>
                    </div>

                    {/* Role Type Selection */}
                    <div style={{ marginBottom: "24px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "13px",
                          fontWeight: "600",
                          marginBottom: "8px",
                          color: textSec,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Role Type
                      </label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {[
                          {
                            key: "account_manager",
                            label: "Account Manager",
                            icon: "&#128188;",
                          },
                          {
                            key: "sourcing_expert",
                            label: "Sourcing Expert",
                            icon: "&#128269;",
                          },
                        ].map((role) => (
                          <button
                            key={role.key}
                            onClick={() => {
                              setMemberRole(role.key);
                              setTargetValues({});
                            }}
                            style={{
                              flex: 1,
                              padding: "12px 16px",
                              borderRadius: "8px",
                              border:
                                memberRole === role.key
                                  ? `2px solid ${yellow}`
                                  : `1px solid ${border}`,
                              backgroundColor:
                                memberRole === role.key
                                  ? "rgba(255, 215, 0, 0.08)"
                                  : "transparent",
                              color:
                                memberRole === role.key ? yellow : textSec,
                              cursor: "pointer",
                              fontSize: "14px",
                              fontWeight: memberRole === role.key ? "600" : "400",
                              textAlign: "center",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <span
                              dangerouslySetInnerHTML={{ __html: role.icon }}
                            />{" "}
                            {role.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                        marginBottom: "24px",
                      }}
                    >
                      {getMetrics().map((metric) => (
                        <div key={metric.key}>
                          <label
                            style={{
                              display: "block",
                              fontSize: "13px",
                              fontWeight: "500",
                              marginBottom: "6px",
                              color: "#CCC",
                            }}
                          >
                            {metric.label}
                          </label>
                          <input
                            type="number"
                            value={targetValues[metric.key] ?? ""}
                            onChange={(e) =>
                              handleTargetChange(metric.key, e.target.value)
                            }
                            placeholder={`Enter ${period} target`}
                            style={inputStyle}
                            onFocus={(e) => {
                              e.target.style.borderColor = yellow;
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = border;
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Error / Success */}
                    {error && (
                      <div
                        style={{
                          padding: "10px 16px",
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          borderRadius: "6px",
                          color: red,
                          fontSize: "13px",
                          marginBottom: "16px",
                        }}
                      >
                        {error}
                      </div>
                    )}
                    {successMsg && (
                      <div
                        style={{
                          padding: "10px 16px",
                          backgroundColor: "rgba(34, 197, 94, 0.1)",
                          border: "1px solid rgba(34, 197, 94, 0.3)",
                          borderRadius: "6px",
                          color: green,
                          fontSize: "13px",
                          marginBottom: "16px",
                        }}
                      >
                        {successMsg}
                      </div>
                    )}

                    {/* Save Button */}
                    <button
                      onClick={handleSaveTargets}
                      disabled={saving}
                      style={{
                        padding: "12px 32px",
                        backgroundColor: yellow,
                        color: "#0A0A0A",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "14px",
                        fontWeight: "700",
                        cursor: saving ? "not-allowed" : "pointer",
                        opacity: saving ? 0.6 : 1,
                        transition: "all 0.3s ease",
                      }}
                    >
                      {saving ? "Saving..." : "Save Targets"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB: LOG WEEKLY DATA ─────────────────────────────── */}
          {activeTab === "weekly" && (
            <WeeklyInputTab
              teamMembers={teamMembers}
              API_URL={API_URL}
              onSaved={fetchKPIData}
            />
          )}
        </div>
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SCORECARD TAB — shows KPI data + progress vs targets
   ══════════════════════════════════════════════════════════════════════════ */
function ScoreboardTab({ kpiData, targets, loading, error, period, getProgressColor }) {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
        Loading KPI data...
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "#EF4444" }}>
        Error: {error}
      </div>
    );
  }
  if (!kpiData || !kpiData.managers || kpiData.managers.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
        No KPI data available. Add weekly reports to see the scorecard.
      </div>
    );
  }

  const managers = kpiData.managers || [];

  return (
    <>
      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "2rem",
        }}
      >
        {[
          {
            label: "Total Revenue",
            value: `$${managers
              .reduce((s, m) => s + (m.revenue || 0), 0)
              .toLocaleString()}`,
          },
          {
            label: "Total Profit",
            value: `$${managers
              .reduce((s, m) => s + (m.profit || 0), 0)
              .toLocaleString()}`,
          },
          {
            label: "Products Hunted",
            value: managers.reduce((s, m) => s + (m.hunted || 0), 0),
          },
          {
            label: "Products Approved",
            value: managers.reduce((s, m) => s + (m.approved || 0), 0),
          },
          {
            label: "Products Purchased",
            value: managers.reduce((s, m) => s + (m.purchased || 0), 0),
          },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              background: "#111111",
              border: "1px solid #1E1E1E",
              borderRadius: "8px",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "6px" }}>
              {card.label}
            </div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FFD700" }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Manager Cards with Progress */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "20px",
        }}
      >
        {managers.map((manager, idx) => {
          const memberTargets = targets[manager.manager] || {};
          const metrics = memberTargets.metrics || {};

          const metricRows = [
            { label: "Hunted", actual: manager.hunted || 0, target: metrics.products_hunted },
            { label: "Analyzed", actual: manager.analyzed || 0, target: metrics.products_analyzed },
            { label: "Contacted", actual: manager.contacted || 0, target: metrics.suppliers_contacted },
            { label: "Approved", actual: manager.approved || 0, target: metrics.products_approved },
            { label: "Purchased", actual: manager.purchased || 0, target: metrics.products_purchased },
            { label: "Revenue", actual: manager.revenue || 0, target: metrics.revenue_target, prefix: "$" },
            { label: "Profit", actual: manager.profit || 0, target: metrics.profit_target, prefix: "$" },
          ];

          return (
            <div
              key={idx}
              style={{
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "8px",
                padding: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: "700" }}>
                  {manager.manager}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    background: "rgba(255, 215, 0, 0.1)",
                    color: "#FFD700",
                  }}
                >
                  ROI: {(manager.roi_pct || 0).toFixed(1)}%
                </div>
              </div>

              {metricRows.map((row, i) => {
                const pct = row.target
                  ? Math.min(Math.round((row.actual / row.target) * 100), 100)
                  : null;

                return (
                  <div key={i} style={{ marginBottom: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "13px",
                        marginBottom: "4px",
                      }}
                    >
                      <span style={{ color: "#888" }}>{row.label}</span>
                      <span style={{ fontWeight: "600" }}>
                        {row.prefix || ""}
                        {typeof row.actual === "number"
                          ? row.actual.toLocaleString()
                          : row.actual}
                        {row.target ? (
                          <span style={{ color: "#666" }}>
                            {" "}
                            / {row.prefix || ""}
                            {row.target.toLocaleString()}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    {pct !== null && (
                      <div
                        style={{
                          background: "#1a1a1a",
                          borderRadius: "4px",
                          height: "6px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: getProgressColor(pct),
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   WEEKLY INPUT TAB — form to log weekly report data
   ══════════════════════════════════════════════════════════════════════════ */
function WeeklyInputTab({ teamMembers, API_URL, onSaved }) {
  const [form, setForm] = useState({
    week: "",
    manager: "",
    hunted: "",
    analyzed: "",
    contacted: "",
    approved: "",
    purchased: "",
    revenue: "",
    profit: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.week || !form.manager) {
      setErrMsg("Week and Manager are required");
      return;
    }
    setSaving(true);
    setMsg("");
    setErrMsg("");

    try {
      const token = localStorage.getItem("ecomera_token");
      const res = await fetch(`${API_URL}/weekly`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          week: form.week,
          manager: form.manager,
          hunted: parseInt(form.hunted) || 0,
          analyzed: parseInt(form.analyzed) || 0,
          contacted: parseInt(form.contacted) || 0,
          approved: parseInt(form.approved) || 0,
          purchased: parseInt(form.purchased) || 0,
          revenue: parseFloat(form.revenue) || 0,
          profit: parseFloat(form.profit) || 0,
        }),
      });

      if (res.ok) {
        setMsg("Weekly report saved successfully!");
        setForm({
          week: form.week,
          manager: "",
          hunted: "",
          analyzed: "",
          contacted: "",
          approved: "",
          purchased: "",
          revenue: "",
          profit: "",
        });
        if (onSaved) onSaved();
      } else {
        const data = await res.json();
        throw new Error(data.detail || "Failed to save");
      }
    } catch (e) {
      setErrMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#0A0A0A",
    border: "1px solid #1E1E1E",
    borderRadius: "6px",
    color: "#FFFFFF",
    fontSize: "14px",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        background: "#111111",
        border: "1px solid #1E1E1E",
        borderRadius: "8px",
        padding: "28px",
        maxWidth: "700px",
      }}
    >
      <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px" }}>
        Log Weekly Report
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        {/* Week */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "500",
              marginBottom: "6px",
              color: "#CCC",
            }}
          >
            Week (e.g., 2026-W13)
          </label>
          <input
            type="text"
            value={form.week}
            onChange={(e) => handleChange("week", e.target.value)}
            placeholder="2026-W13"
            style={inputStyle}
          />
        </div>
        {/* Manager */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "500",
              marginBottom: "6px",
              color: "#CCC",
            }}
          >
            Manager
          </label>
          <select
            value={form.manager}
            onChange={(e) => handleChange("manager", e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="">Select Manager</option>
            {teamMembers.map((m, i) => (
              <option key={i} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        {[
          { key: "hunted", label: "Products Hunted" },
          { key: "analyzed", label: "Products Analyzed" },
          { key: "contacted", label: "Suppliers Contacted" },
          { key: "approved", label: "Products Approved" },
          { key: "purchased", label: "Products Purchased" },
        ].map((field) => (
          <div key={field.key}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "500",
                marginBottom: "6px",
                color: "#CCC",
              }}
            >
              {field.label}
            </label>
            <input
              type="number"
              value={form[field.key]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "500",
              marginBottom: "6px",
              color: "#CCC",
            }}
          >
            Revenue ($)
          </label>
          <input
            type="number"
            value={form.revenue}
            onChange={(e) => handleChange("revenue", e.target.value)}
            placeholder="0.00"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "500",
              marginBottom: "6px",
              color: "#CCC",
            }}
          >
            Profit ($)
          </label>
          <input
            type="number"
            value={form.profit}
            onChange={(e) => handleChange("profit", e.target.value)}
            placeholder="0.00"
            style={inputStyle}
          />
        </div>
      </div>

      {errMsg && (
        <div
          style={{
            padding: "10px 16px",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "6px",
            color: "#EF4444",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          {errMsg}
        </div>
      )}
      {msg && (
        <div
          style={{
            padding: "10px 16px",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "6px",
            color: "#22C55E",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          {msg}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={saving}
        style={{
          padding: "12px 32px",
          backgroundColor: "#FFD700",
          color: "#0A0A0A",
          border: "none",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: "700",
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving..." : "Submit Weekly Report"}
      </button>
    </div>
  );
}
