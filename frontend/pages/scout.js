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

export default function ScoutPage() {
  const [formData, setFormData] = useState({
    asin: "",
    title: "",
    brand: "",
    category: "",
    bsr: "",
    monthly_sales: "",
    current_price: "",
    price_volatility_pct: "",
    fba_sellers: "",
    cost: "",
    referral_pct: "",
    fba_fee: "",
  });

  const [scoutResult, setScoutResult] = useState(null);
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutError, setScoutError] = useState(null);

  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState(null);
  const [bulkResults, setBulkResults] = useState([]);

  const [historyFilter, setHistoryFilter] = useState({
    verdict: "",
    min_score: "",
    max_score: "",
  });
  const [scoutHistory, setScoutHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  useEffect(() => {
    fetchScoutHistory();
  }, [historyFilter]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleScout = async (e) => {
    e.preventDefault();
    setScoutLoading(true);
    setScoutError(null);
    setScoutResult(null);

    try {
      const payload = { ...formData };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "") delete payload[key];
      });

      const response = await fetch(`${API_URL}/scout`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scout product");
      }

      const data = await response.json();
      setScoutResult(data);
      setFormData({
        asin: "",
        title: "",
        brand: "",
        category: "",
        bsr: "",
        monthly_sales: "",
        current_price: "",
        price_volatility_pct: "",
        fba_sellers: "",
        cost: "",
        referral_pct: "",
        fba_fee: "",
      });
    } catch (err) {
      setScoutError(err.message);
    } finally {
      setScoutLoading(false);
    }
  };

  const handleBulkScout = async (e) => {
    e.preventDefault();
    if (!bulkText.trim()) {
      setBulkError("Please enter at least one ASIN");
      return;
    }

    setBulkLoading(true);
    setBulkError(null);
    setBulkResults([]);

    try {
      const asins = bulkText
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter((s) => s);

      const response = await fetch(`${API_URL}/scout/bulk`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ asins }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to perform bulk scout");
      }

      const data = await response.json();
      setBulkResults(data.results || []);
      setBulkText("");
    } catch (err) {
      setBulkError(err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const fetchScoutHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const params = new URLSearchParams();
      if (historyFilter.verdict) params.append("verdict", historyFilter.verdict);
      if (historyFilter.min_score) params.append("min_score", historyFilter.min_score);
      if (historyFilter.max_score) params.append("max_score", historyFilter.max_score);

      const response = await fetch(`${API_URL}/scout?${params}`, {
        headers: authHeader(),
      });

      if (!response.ok) throw new Error("Failed to fetch scout history");
      const data = await response.json();
      setScoutHistory(data.scouts || []);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteScout = async (asin) => {
    if (!confirm(`Are you sure you want to delete scout for ASIN ${asin}?`)) return;

    try {
      const response = await fetch(`${API_URL}/scout/${asin}`, {
        method: "DELETE",
        headers: authHeader(),
      });

      if (!response.ok) throw new Error("Failed to delete scout");
      setScoutHistory(scoutHistory.filter((s) => s.asin !== asin));
    } catch (err) {
      alert("Error deleting scout: " + err.message);
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

  const buttonStyle = {
    padding: "0.5rem 1.5rem",
    background: blue,
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.875rem",
  };

  const badgeStyle = (verdict) => ({
    display: "inline-block",
    padding: "0.25rem 0.75rem",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: "600",
    backgroundColor: verdict === "buy" ? green : verdict === "test" ? yellow : red,
    color: verdict === "test" ? "#000" : "#fff",
  });

  const sectionStyle = {
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: "8px",
    padding: "1.5rem",
    marginBottom: "2rem",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
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

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: bg, color: text, fontFamily: "system-ui" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: "0 0 2rem 0" }}>FBA Scout</h1>

          <div style={sectionStyle}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Single Product Scout</h2>
            <form onSubmit={handleScout}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <input
                  type="text"
                  name="asin"
                  placeholder="ASIN *"
                  value={formData.asin}
                  onChange={handleFormChange}
                  style={inputStyle}
                  required
                />
                <input
                  type="text"
                  name="title"
                  placeholder="Title"
                  value={formData.title}
                  onChange={handleFormChange}
                  style={inputStyle}
                />
                <input
                  type="text"
                  name="brand"
                  placeholder="Brand"
                  value={formData.brand}
                  onChange={handleFormChange}
                  style={inputStyle}
                />
                <input
                  type="text"
                  name="category"
                  placeholder="Category"
                  value={formData.category}
                  onChange={handleFormChange}
                  style={inputStyle}
                />
                <input
                  type="number"
                  name="bsr"
                  placeholder="BSR"
                  value={formData.bsr}
                  onChange={handleFormChange}
                  style={inputStyle}
                />
                <input
                  type="number"
                  name="monthly_sales"
                  placeholder="Monthly Sales"
                  value={formData.monthly_sales}
                  onChange={handleFormChange}
                  style={inputStyle}
                />
                <input
                  type="number"
                  name="current_price"
                  placeholder="Current Price"
                  value={formData.current_price}
                  onChange={handleFormChange}
                  step="0.01"
                  style={inputStyle}
                />
                <input
                  type="number"
                  name="price_volatility_pct"
                  placeholder="Price Volatility %"
                  value={formData.price_volatility_pct}
                  onChange={handleFormChange}
                  style={inputStyle}
                />
                <input
                  type="number"
                  name="fba_sellers"
                  placeholder="FBA Sellers *"
                  value={formData.fba_sellers}
                  onChange={handleFormChange}
                  style={inputStyle}
                  required
                />
                <input
                  type="number"
                  name="cost"
                  placeholder="Cost (optional)"
                  value={formData.cost}
                  onChange={handleFormChange}
                  step="0.01"
                  style={inputStyle}
                />
                <input
                  type="number"
                  name="referral_pct"
                  placeholder="Referral %"
                  value={formData.referral_pct}
                  onChange={handleFormChange}
                  style={inputStyle}
                />
                <input
                  type="number"
                  name="fba_fee"
                  placeholder="FBA Fee"
                  value={formData.fba_fee}
                  onChange={handleFormChange}
                  step="0.01"
                  style={inputStyle}
                />
              </div>
              <button type="submit" disabled={scoutLoading} style={{ ...buttonStyle, opacity: scoutLoading ? 0.6 : 1 }}>
                {scoutLoading ? "Scouting..." : "Scout Product"}
              </button>
            </form>

            {scoutError && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: red, borderRadius: "6px", color: "#fff" }}>
                Error: {scoutError}
              </div>
            )}

            {scoutResult && (
              <div style={{ marginTop: "1rem", padding: "1.5rem", background: "#1a1a1a", borderRadius: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "0.875rem", color: textSec, marginBottom: "0.25rem" }}>FBA Score</div>
                    <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: yellow }}>
                      {scoutResult.fba_score?.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <span style={badgeStyle(scoutResult.verdict)}>
                      {scoutResult.verdict?.toUpperCase()}
                    </span>
                  </div>
                </div>

                {scoutResult.cost && (
                  <div style={{ paddingTop: "1rem", borderTop: `1px solid ${border}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
                      <div>
                        <div style={{ fontSize: "0.875rem", color: textSec }}>Estimated Profit</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: green }}>
                          ${scoutResult.estimated_profit?.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.875rem", color: textSec }}>ROI</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: yellow }}>
                          {scoutResult.roi?.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Bulk Scout</h2>
            <form onSubmit={handleBulkScout}>
              <textarea
                placeholder="Enter ASINs separated by commas or newlines..."
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                style={{
                  ...inputStyle,
                  width: "100%",
                  minHeight: "120px",
                  marginBottom: "1rem",
                  fontFamily: "monospace",
                  resize: "vertical",
                }}
              />
              <button type="submit" disabled={bulkLoading} style={{ ...buttonStyle, opacity: bulkLoading ? 0.6 : 1 }}>
                {bulkLoading ? "Processing..." : "Scout ASINs"}
              </button>
            </form>

            {bulkError && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: red, borderRadius: "6px", color: "#fff" }}>
                Error: {bulkError}
              </div>
            )}

            {bulkResults.length > 0 && (
              <div style={{ marginTop: "1.5rem", overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>ASIN</th>
                      <th style={thStyle}>Score</th>
                      <th style={thStyle}>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResults.map((result, idx) => (
                      <tr key={idx}>
                        <td style={tdStyle}>{result.asin}</td>
                        <td style={tdStyle}>
                          <span style={{ color: yellow, fontWeight: "bold" }}>{result.fba_score?.toFixed(1)}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={badgeStyle(result.verdict)}>{result.verdict?.toUpperCase()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Scout History</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", color: textSec, marginBottom: "0.25rem" }}>
                  Verdict
                </label>
                <select
                  value={historyFilter.verdict}
                  onChange={(e) => setHistoryFilter({ ...historyFilter, verdict: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">All Verdicts</option>
                  <option value="buy">Buy</option>
                  <option value="test">Test</option>
                  <option value="skip">Skip</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", color: textSec, marginBottom: "0.25rem" }}>
                  Min Score
                </label>
                <input
                  type="number"
                  value={historyFilter.min_score}
                  onChange={(e) => setHistoryFilter({ ...historyFilter, min_score: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", color: textSec, marginBottom: "0.25rem" }}>
                  Max Score
                </label>
                <input
                  type="number"
                  value={historyFilter.max_score}
                  onChange={(e) => setHistoryFilter({ ...historyFilter, max_score: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            {historyLoading ? (
              <div style={{ textAlign: "center", padding: "2rem", color: textSec }}>Loading scout history...</div>
            ) : historyError ? (
              <div style={{ textAlign: "center", padding: "2rem", color: red }}>Error: {historyError}</div>
            ) : scoutHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: textSec }}>No scout history available</div>
            ) : (
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
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoutHistory.map((scout, idx) => (
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
                        <td style={tdStyle}>${scout.current_price?.toFixed(2)}</td>
                        <td style={tdStyle}>{scout.fba_sellers}</td>
                        <td style={tdStyle}>
                          <span style={{ color: yellow, fontWeight: "bold" }}>{scout.fba_score?.toFixed(1)}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={badgeStyle(scout.verdict)}>{scout.verdict?.toUpperCase()}</span>
                        </td>
                        <td style={tdStyle}>
                          <button
                            onClick={() => handleDeleteScout(scout.asin)}
                            style={{
                              padding: "0.25rem 0.75rem",
                              background: red,
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
