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

export default function KPIPage() {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("week");

  useEffect(() => {
    fetchKPIData();
  }, [period]);

  const fetchKPIData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/reports/kpi?period=${period}`, {
        headers: authHeader(),
      });
      if (!response.ok) throw new Error("Failed to fetch KPI data");
      const data = await response.json();
      setKpiData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const bg = "#0A0A0A";
  const cardBg = "#111111";
  const border = "#1E1E1E";
  const yellow = "#FFD700";
  const text = "#FFFFFF";
  const textSec = "#888888";
  const green = "#22C55E";
  const red = "#EF4444";
  const blue = "#3B82F6";

  const summaryStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
    fontSize: "0.875rem",
    color: textSec,
    marginBottom: "0.5rem",
  };

  const summaryValueStyle = {
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: yellow,
  };

  const managersGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "1.5rem",
  };

  const managerCardStyle = {
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: "8px",
    padding: "1.5rem",
  };

  const managerNameStyle = {
    fontSize: "1.1rem",
    fontWeight: "bold",
    color: text,
    marginBottom: "1rem",
  };

  const metricRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.75rem",
    fontSize: "0.875rem",
  };

  const metricLabelStyle = {
    color: textSec,
  };

  const metricValueStyle = {
    fontWeight: "bold",
    color: text,
  };

  const barContainerStyle = {
    background: "#1a1a1a",
    borderRadius: "4px",
    height: "8px",
    marginTop: "0.25rem",
    overflow: "hidden",
  };

  const getBarColor = (index) => {
    const colors = [green, blue, yellow, "#FF6B6B", "#4ECDC4"];
    return colors[index % colors.length];
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: bg, color: text, fontFamily: "system-ui" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: 0 }}>KPI Scorecard</h1>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{
                padding: "0.5rem 1rem",
                background: cardBg,
                border: `1px solid ${border}`,
                borderRadius: "6px",
                color: text,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: textSec }}>Loading KPI data...</div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "3rem", color: red }}>Error: {error}</div>
          ) : !kpiData || !kpiData.managers || kpiData.managers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: textSec }}>
              No KPI data available for this period
            </div>
          ) : (
            <>
              <div style={summaryStyle}>
                <div style={summaryCardStyle}>
                  <div style={summaryLabelStyle}>Total Revenue</div>
                  <div style={summaryValueStyle}>${(kpiData.summary?.total_revenue || 0).toLocaleString()}</div>
                </div>
                <div style={summaryCardStyle}>
                  <div style={summaryLabelStyle}>Total Profit</div>
                  <div style={summaryValueStyle}>${(kpiData.summary?.total_profit || 0).toLocaleString()}</div>
                </div>
                <div style={summaryCardStyle}>
                  <div style={summaryLabelStyle}>Avg ROI</div>
                  <div style={summaryValueStyle}>{(kpiData.summary?.avg_roi || 0).toFixed(1)}%</div>
                </div>
              </div>

              <div style={managersGridStyle}>
                {kpiData.managers.map((manager, idx) => {
                  const maxHunted = Math.max(...kpiData.managers.map((m) => m.hunted || 0), 1);
                  const maxAnalyzed = Math.max(...kpiData.managers.map((m) => m.analyzed || 0), 1);
                  const maxContacted = Math.max(...kpiData.managers.map((m) => m.contacted || 0), 1);
                  const maxApproved = Math.max(...kpiData.managers.map((m) => m.approved || 0), 1);
                  const maxPurchased = Math.max(...kpiData.managers.map((m) => m.purchased || 0), 1);

                  return (
                    <div key={idx} style={managerCardStyle}>
                      <div style={managerNameStyle}>{manager.manager}</div>

                      <div style={metricRowStyle}>
                        <span style={metricLabelStyle}>Hunted</span>
                        <span style={metricValueStyle}>{manager.hunted || 0}</span>
                      </div>
                      <div style={barContainerStyle}>
                        <div
                          style={{
                            width: `${((manager.hunted || 0) / maxHunted) * 100}%`,
                            height: "100%",
                            background: getBarColor(0),
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>

                      <div style={metricRowStyle}>
                        <span style={metricLabelStyle}>Analyzed</span>
                        <span style={metricValueStyle}>{manager.analyzed || 0}</span>
                      </div>
                      <div style={barContainerStyle}>
                        <div
                          style={{
                            width: `${((manager.analyzed || 0) / maxAnalyzed) * 100}%`,
                            height: "100%",
                            background: getBarColor(1),
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>

                      <div style={metricRowStyle}>
                        <span style={metricLabelStyle}>Contacted</span>
                        <span style={metricValueStyle}>{manager.contacted || 0}</span>
                      </div>
                      <div style={barContainerStyle}>
                        <div
                          style={{
                            width: `${((manager.contacted || 0) / maxContacted) * 100}%`,
                            height: "100%",
                            background: getBarColor(2),
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>

                      <div style={metricRowStyle}>
                        <span style={metricLabelStyle}>Approved</span>
                        <span style={metricValueStyle}>{manager.approved || 0}</span>
                      </div>
                      <div style={barContainerStyle}>
                        <div
                          style={{
                            width: `${((manager.approved || 0) / maxApproved) * 100}%`,
                            height: "100%",
                            background: getBarColor(3),
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>

                      <div style={metricRowStyle}>
                        <span style={metricLabelStyle}>Purchased</span>
                        <span style={metricValueStyle}>{manager.purchased || 0}</span>
                      </div>
                      <div style={barContainerStyle}>
                        <div
                          style={{
                            width: `${((manager.purchased || 0) / maxPurchased) * 100}%`,
                            height: "100%",
                            background: getBarColor(4),
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
