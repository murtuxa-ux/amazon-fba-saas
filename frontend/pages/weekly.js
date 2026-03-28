import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

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

export default function WeeklyPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [managers, setManagers] = useState([]);
  const [formData, setFormData] = useState({
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
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    fetchWeeklyData();
    fetchManagers();
  }, []);

  const fetchWeeklyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/weekly`, {
        headers: authHeader(),
      });
      if (!response.ok) throw new Error("Failed to fetch weekly data");
      const data = await response.json();
      setEntries(data.entries || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: authHeader(),
      });
      if (response.ok) {
        const data = await response.json();
        setManagers(Array.isArray(data) ? data : data.users || data.managers || []);
      }
    } catch (err) {
      console.error("Failed to fetch managers:", err);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const revenue = parseFloat(formData.revenue) || 0;
      const profit = parseFloat(formData.profit) || 0;
      const roi = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;

      const payload = {
        week: formData.week,
        manager: formData.manager,
        hunted: parseInt(formData.hunted) || 0,
        analyzed: parseInt(formData.analyzed) || 0,
        contacted: parseInt(formData.contacted) || 0,
        approved: parseInt(formData.approved) || 0,
        purchased: parseInt(formData.purchased) || 0,
        revenue: revenue,
        profit: profit,
        roi: parseFloat(roi),
      };

      const response = await fetch(`${API_URL}/weekly`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add weekly entry");
      }

      const data = await response.json();
      setEntries([data.entry, ...entries]);
      setFormData({
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
      setShowModal(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const calculateStats = () => {
    if (entries.length === 0) {
      return { total_entries: 0, avg_roi: 0, total_revenue: 0 };
    }

    const totalRevenue = entries.reduce((sum, e) => sum + (e.revenue || 0), 0);
    const totalProfit = entries.reduce((sum, e) => sum + (e.profit || 0), 0);
    const avgRoi = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

    return {
      total_entries: entries.length,
      avg_roi: parseFloat(avgRoi),
      total_revenue: totalRevenue,
    };
  };

  const sortedEntries = [...entries].sort((a, b) => new Date(b.week) - new Date(a.week));
  const stats = calculateStats();

  const bg = "#0A0A0A";
  const cardBg = "#111111";
  const border = "#1E1E1E";
  const yellow = "#FFD700";
  const text = "#FFFFFF";
  const textSec = "#888888";
  const green = "#22C55E";
  const red = "#EF4444";
  const blue = "#3B82F6";

  const inputStyle = {
    padding: "0.75rem",
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: "6px",
    color: text,
    fontSize: "0.875rem",
    width: "100%",
  };

  const buttonStyle = {
    padding: "0.75rem 1.5rem",
    background: blue,
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.875rem",
  };

  const modalStyle = {
    display: showModal ? "flex" : "none",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };

  const modalContentStyle = {
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: "8px",
    padding: "2rem",
    maxWidth: "600px",
    width: "90%",
    maxHeight: "90vh",
    overflowY: "auto",
  };

  const summaryGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "1rem",
    marginBottom: "2rem",
  };

  const summaryCardStyle = {
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: "8px",
    padding: "1.5rem",
    textAlign: "center",
  };

  const summaryLabelStyle = {
    fontSize: "0.75rem",
    color: textSec,
    marginBottom: "0.5rem",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const summaryValueStyle = {
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: yellow,
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "1.5rem",
  };

  const thStyle = {
    background: "#1a1a1a",
    border: `1px solid ${border}`,
    padding: "0.75rem",
    textAlign: "left",
    fontSize: "0.75rem",
    fontWeight: "600",
    color: textSec,
  };

  const tdStyle = {
    border: `1px solid ${border}`,
    padding: "0.75rem",
    fontSize: "0.875rem",
    color: text,
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: "600",
    color: text,
    marginBottom: "0.5rem",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: bg, color: text, fontFamily: "system-ui" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: 0 }}>Weekly Reports</h1>
            <button onClick={() => setShowModal(true)} style={buttonStyle}>
              + Add Entry
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: textSec }}>Loading weekly data...</div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "3rem", color: red }}>Error: {error}</div>
          ) : (
            <>
              <div style={summaryGridStyle}>
                <div style={summaryCardStyle}>
                  <div style={summaryLabelStyle}>Total Entries</div>
                  <div style={summaryValueStyle}>{stats.total_entries}</div>
                </div>
                <div style={summaryCardStyle}>
                  <div style={summaryLabelStyle}>Avg ROI</div>
                  <div style={summaryValueStyle}>{stats.avg_roi.toFixed(1)}%</div>
                </div>
                <div style={summaryCardStyle}>
                  <div style={summaryLabelStyle}>Total Revenue</div>
                  <div style={summaryValueStyle}>${stats.total_revenue.toLocaleString()}</div>
                </div>
              </div>

              {sortedEntries.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: textSec,
                    background: cardBg,
                    border: `1px solid ${border}`,
                    borderRadius: "8px",
                  }}
                >
                  <p style={{ marginBottom: "1rem" }}>No weekly entries yet</p>
                  <button onClick={() => setShowModal(true)} style={buttonStyle}>
                    Add First Entry
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Week</th>
                        <th style={thStyle}>Manager</th>
                        <th style={thStyle}>Hunted</th>
                        <th style={thStyle}>Analyzed</th>
                        <th style={thStyle}>Contacted</th>
                        <th style={thStyle}>Approved</th>
                        <th style={thStyle}>Purchased</th>
                        <th style={thStyle}>Revenue</th>
                        <th style={thStyle}>Profit</th>
                        <th style={thStyle}>ROI %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEntries.map((entry, idx) => {
                        const roi = entry.revenue > 0 ? ((entry.profit / entry.revenue) * 100).toFixed(1) : 0;

                        return (
                          <tr key={idx}>
                            <td style={tdStyle}>{entry.week}</td>
                            <td style={tdStyle}>{entry.manager}</td>
                            <td style={tdStyle}>{entry.hunted}</td>
                            <td style={tdStyle}>{entry.analyzed}</td>
                            <td style={tdStyle}>{entry.contacted}</td>
                            <td style={tdStyle}>{entry.approved}</td>
                            <td style={tdStyle}>{entry.purchased}</td>
                            <td style={tdStyle}>${entry.revenue?.toLocaleString()}</td>
                            <td style={{ ...tdStyle, color: green }}>
                              ${entry.profit?.toLocaleString()}
                            </td>
                            <td style={{ ...tdStyle, color: roi >= 20 ? green : yellow }}>
                              {parseFloat(roi).toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          <div style={modalStyle} onClick={() => setShowModal(false)}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Add Weekly Entry</h2>

              <form onSubmit={handleAddEntry}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>Week *</label>
                  <input
                    type="date"
                    name="week"
                    value={formData.week}
                    onChange={handleFormChange}
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>Manager *</label>
                  <select
                    name="manager"
                    value={formData.manager}
                    onChange={handleFormChange}
                    style={inputStyle}
                    required
                  >
                    <option value="">Select Manager</option>
                    {managers.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={labelStyle}>Hunted</label>
                    <input
                      type="number"
                      name="hunted"
                      value={formData.hunted}
                      onChange={handleFormChange}
                      placeholder="0"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Analyzed</label>
                    <input
                      type="number"
                      name="analyzed"
                      value={formData.analyzed}
                      onChange={handleFormChange}
                      placeholder="0"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Contacted</label>
                    <input
                      type="number"
                      name="contacted"
                      value={formData.contacted}
                      onChange={handleFormChange}
                      placeholder="0"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Approved</label>
                    <input
                      type="number"
                      name="approved"
                      value={formData.approved}
                      onChange={handleFormChange}
                      placeholder="0"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Purchased</label>
                    <input
                      type="number"
                      name="purchased"
                      value={formData.purchased}
                      onChange={handleFormChange}
                      placeholder="0"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div>
                    <label style={labelStyle}>Revenue</label>
                    <input
                      type="number"
                      name="revenue"
                      value={formData.revenue}
                      onChange={handleFormChange}
                      placeholder="0.00"
                      step="0.01"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Profit</label>
                    <input
                      type="number"
                      name="profit"
                      value={formData.profit}
                      onChange={handleFormChange}
                      placeholder="0.00"
                      step="0.01"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {formError && (
                  <div
                    style={{
                      padding: "0.75rem",
                      background: red,
                      color: "#fff",
                      borderRadius: "6px",
                      marginBottom: "1rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    Error: {formError}
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      ...buttonStyle,
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? "Adding..." : "Add Entry"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: "0.75rem 1.5rem",
                      background: "#1a1a1a",
                      border: `1px solid ${border}`,
                      color: text,
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
