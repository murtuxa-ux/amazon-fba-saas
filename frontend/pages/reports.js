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

export default function ReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("month");
  const [manager, setManager] = useState("");
  const [verdict, setVerdict] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    fetchManagers();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [period, manager, verdict, startDate, endDate]);

  const fetchManagers = async () => {
    try {
      const response = await fetch(`${API_URL}/managers`, {
        headers: authHeader(),
      });
      if (response.ok) {
        const data = await response.json();
        setManagers(data.managers || []);
      }
    } catch (err) {
      console.error("Failed to fetch managers:", err);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("period", period);
      if (manager) params.append("manager", manager);
      if (verdict) params.append("verdict", verdict);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const response = await fetch(`${API_URL}/reports/summary?${params}`, {
        headers: authHeader(),
      });
      if (!response.ok) throw new Error("Failed to fetch report data");
      const data = await response.json();
      setReportData(data);
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

  const inputStyle = {
    padding: "0.5rem 0.75rem",
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: "6px",
    color: text,
    fontSize: "0.875rem",
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
    background: cardBg,
    border: `1px solid ${border}`,
    padding: "0.75rem",
    textAlign: "left",
    fontSize: "0.875rem",
    fontWeight: "600",
    color: textSec,
  };

  const tdStyle = {
    background: cardBg,
    border: `1px solid ${border}`,
    padding: "0.75rem",
    fontSize: "0.875rem",
    color: text,
  };

  const badgeStyle = (color) => ({
    display: "inline-block",
    padding: "0.25rem 0.75rem",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: "600",
    backgroundColor: color === "buy" ? green : color === "test" ? yellow : red,
    color: color === "test" ? "#000" : "#fff",
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: bg, color: text, fontFamily: "system-ui" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: "0 0 2rem 0" }}>Reports Summary</h1>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", color: textSec, marginBottom: "0.25rem" }}>
                Period
              </label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} style={inputStyle}>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="custom">Custom Date</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.875rem", color: textSec, marginBottom: "0.25rem" }}>
                Manager
              </label>
              <select value={manager} onChange={(e) => setManager(e.target.value)} style={inputStyle}>
                <option value="">All Managers</option>
                {managers.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.875rem", color: textSec, marginBottom: "0.25rem" }}>
                Verdict
              </label>
              <select value={verdict} onChange={(e) => setVerdict(e.target.value)} style={inputStyle}>
                <option value="">All Verdicts</option>
                <option value="buy">Buy</option>
                <option value="test">Test</option>
                <option value="skip">Skip</option>
              </select>
            </div>

            {period === "custom" && (
              <>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", color: textSec, marginBottom: "0.25rem" }}>
                    Start Date
                  </label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", color: textSec, marginBottom: "0.25rem" }}>
                    End Date
                  </label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
                </div>
              </>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: textSec }}>Loading report data...</div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "3rem", color: red }}>Error: {error}</div>
          ) : !reportData ? (
            <div style={{ textAlign: "center", padding: "3rem", color: textSec }}>No report data available</div>
          ) : (
            <>
              <div style={summaryGridStyle}>
                <div style={summaryCardStyle}>
                  <div style={summaryLabelStyle}>Products Analyzed</div>
                  <div style={summaryValueStyle}>{reportData.summary?.total_analyzed || 0}</div>
                </div>
                <div style={summaryCardStyle}>
                  <div style={summaryLabelStyle}>Buy Decisions</div>
                  <div style={summaryValueStyle}>{reportData.summary?.buy_count || 0}</div>
                </div>
                <div style={summaryCardStyle}>
                  <div style={summaryLabelStyle}>Avg ROI</div>
                  <div style={summaryValueStyle}>{(reportData.summary?.avg_roi || 0).toFixed(1)}%</div>
                </div>
                <div style={summaryCardStyle}>
                  <div style={summaryLabelStyle}>Total Revenue</div>
                  <div style={summaryValueStyle}>${(reportData.summary?.total_revenue || 0).toLocaleString()}</div>
                </div>
                <div style={summaryCardStyle}>
                  <div style={summaryLabelStyle}>Total Profit</div>
                  <div style={summaryValueStyle}>${(reportData.summary?.total_profit || 0).toLocaleString()}</div>
                </div>
              </div>

              <div style={{ marginTop: "2rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>Scout Results</h2>
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>ASIN</th>
                        <th style={thStyle}>Title</th>
                        <th style={thStyle}>Brand</th>
                        <th style={thStyle}>Category</th>
                        <th style={thStyle}>BSR</th>
                        <th style={thStyle}>Price</th>
                        <th style={thStyle}>FBA Sellers</th>
                        <th style={thStyle}>Score</th>
                        <th style={thStyle}>Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.scouts && reportData.scouts.length > 0 ? (
                        reportData.scouts.map((scout, idx) => (
                          <tr key={idx}>
                            <td style={tdStyle}>
                              <a
                                href={`https://www.amazon.com/dp/${scout.asin}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: blue, textDecoration: "none" }}
                              >
                                {scout.asin}
                              </a>
                            </td>
                            <td style={tdStyle}>{scout.title}</td>
                            <td style={tdStyle}>{scout.brand}</td>
                            <td style={tdStyle}>{scout.category}</td>
                            <td style={tdStyle}>{scout.bsr || "N/A"}</td>
                            <td style={tdStyle}>${scout.current_price?.toFixed(2) || "N/A"}</td>
                            <td style={tdStyle}>{scout.fba_sellers}</td>
                            <td style={tdStyle}>
                              <span style={{ color: yellow, fontWeight: "bold" }}>{scout.fba_score?.toFixed(1)}</span>
                            </td>
                            <td style={tdStyle}>
                              <span
                                style={badgeStyle(
                                  scout.verdict === "buy" ? "buy" : scout.verdict === "test" ? "test" : "skip"
                                )}
                              >
                                {scout.verdict?.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" style={{ ...tdStyle, textAlign: "center", color: textSec }}>
                            No scout results found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ marginTop: "2rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>Weekly Breakdown</h2>
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Week</th>
                        <th style={thStyle}>Analyzed</th>
                        <th style={thStyle}>Buy Count</th>
                        <th style={thStyle}>Avg ROI</th>
                        <th style={thStyle}>Revenue</th>
                        <th style={thStyle}>Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.weekly && reportData.weekly.length > 0 ? (
                        reportData.weekly.map((week, idx) => (
                          <tr key={idx}>
                            <td style={tdStyle}>{week.week}</td>
                            <td style={tdStyle}>{week.analyzed}</td>
                            <td style={tdStyle}>{week.buy_count}</td>
                            <td style={tdStyle}>
                              <span style={{ color: week.avg_roi >= 20 ? green : yellow }}>
                                {week.avg_roi?.toFixed(1)}%
                              </span>
                            </td>
                            <td style={tdStyle}>${week.revenue?.toLocaleString()}</td>
                            <td style={tdStyle}>
                              <span style={{ color: green }}>${week.profit?.toLocaleString()}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ ...tdStyle, textAlign: "center", color: textSec }}>
                            No weekly data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                style={{
                  marginTop: "2rem",
                  padding: "1rem",
                  background: cardBg,
                  border: `1px solid ${border}`,
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  color: textSec,
                }}
              >
                💾 Tip: Use your browser's export tools or spreadsheet applications to download this data for further analysis
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
