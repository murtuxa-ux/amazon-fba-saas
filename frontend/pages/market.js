import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

const token = () => typeof window !== "undefined" ? localStorage.getItem("ecomera_token") : null;
const authHeader = () => ({
  headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" }
});

export default function Market() {
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState(null);
  const [categoryDetails, setCategoryDetails] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOverview();
    fetchTrends();
  }, []);

  const fetchOverview = async () => {
    setLoadingOverview(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/market/overview`, authHeader());
      if (!res.ok) throw new Error('Failed to fetch market overview');
      const data = await res.json();
      // Backend returns: { total_products, average_fba_score, average_monthly_sales, average_price, high_opportunity_count, category_count }
      setOverview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchTrends = async () => {
    setLoadingTrends(true);
    try {
      const res = await fetch(`${API_URL}/market/trends`, authHeader());
      if (!res.ok) throw new Error('Failed to fetch trends');
      const data = await res.json();
      // Backend returns: { top_by_score: [...], top_by_sales: [...] }
      setTrends(data);
    } catch (err) {
      console.error('Trends error:', err);
      setTrends(null);
    } finally {
      setLoadingTrends(false);
    }
  };

  const fetchCategoryDetails = async (category) => {
    setSelectedCategory(category);
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_URL}/market/category/${encodeURIComponent(category)}`, authHeader());
      if (!res.ok) throw new Error('Failed to fetch category details');
      const data = await res.json();
      setCategoryDetails(data);
    } catch (err) {
      console.error('Category details error:', err);
      setCategoryDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getHealthLabel = (score) => {
    if (score >= 75) return { label: 'Excellent', color: '#10B981' };
    if (score >= 60) return { label: 'Good', color: '#22C55E' };
    if (score >= 40) return { label: 'Fair', color: '#FFD700' };
    return { label: 'Low', color: '#EF4444' };
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#FFD700';
    return '#EF4444';
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0A0A" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem" }}>
        <h1 style={{ color: "#FFFFFF", marginBottom: "2rem", fontSize: "2rem", fontWeight: 800 }}>
          Market Analysis
        </h1>

        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#EF4444", padding: "1rem", borderRadius: "8px", marginBottom: "2rem", fontSize: "14px",
          }}>
            {error}
          </div>
        )}

        {/* Overview Stats */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ color: "#FFD700", fontSize: "1.3rem", marginBottom: "1.5rem", fontWeight: 700 }}>
            Market Overview
          </h2>

          {loadingOverview ? (
            <div style={{ color: "#888", padding: "2rem" }}>Loading overview...</div>
          ) : overview ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <StatCard label="Total Products" value={overview.total_products || 0} />
              <StatCard label="Categories" value={overview.category_count || 0} />
              <StatCard label="Avg FBA Score" value={overview.average_fba_score || 0} color={getScoreColor(overview.average_fba_score)} />
              <StatCard label="Avg Price" value={`$${(overview.average_price || 0).toFixed(2)}`} />
              <StatCard label="Avg Monthly Sales" value={(overview.average_monthly_sales || 0).toLocaleString()} />
              {(() => {
                const h = getHealthLabel(overview.average_fba_score || 0);
                return <StatCard label="Market Health" value={h.label} color={h.color} />;
              })()}
            </div>
          ) : (
            <div style={{ color: "#888" }}>No overview data available</div>
          )}
        </section>

        {/* Top by Score */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ color: "#FFD700", fontSize: "1.3rem", marginBottom: "1.5rem", fontWeight: 700 }}>
            Top Products by FBA Score
          </h2>

          {loadingTrends ? (
            <div style={{ color: "#888", padding: "2rem", textAlign: "center" }}>Loading trends...</div>
          ) : trends && trends.top_by_score && trends.top_by_score.length > 0 ? (
            <div style={{
              background: "#111111", border: "1px solid #1E1E1E", borderRadius: "12px",
              padding: "1.5rem", overflowX: "auto"
            }}>
              <table style={{ width: "100%", color: "#FFFFFF", fontSize: "14px", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                    <th style={{ textAlign: "left", padding: "12px", color: "#888", fontWeight: 600 }}>ASIN</th>
                    <th style={{ textAlign: "left", padding: "12px", color: "#888", fontWeight: 600 }}>Title</th>
                    <th style={{ textAlign: "right", padding: "12px", color: "#888", fontWeight: 600 }}>FBA Score</th>
                    <th style={{ textAlign: "center", padding: "12px", color: "#888", fontWeight: 600 }}>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.top_by_score.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #1E1E1E" }}>
                      <td style={{ padding: "12px", fontWeight: 600 }}>{item.asin}</td>
                      <td style={{ padding: "12px", color: "#BBB", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title || '-'}
                      </td>
                      <td style={{ textAlign: "right", padding: "12px", color: getScoreColor(item.fba_score), fontWeight: 700 }}>
                        {item.fba_score != null ? item.fba_score : 'N/A'}
                      </td>
                      <td style={{ textAlign: "center", padding: "12px" }}>
                        <span style={{
                          background: item.verdict === 'Buy' ? '#10B981' : item.verdict === 'Test' ? '#FFD700' : '#EF4444',
                          color: item.verdict === 'Test' ? '#000' : '#FFF',
                          padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600
                        }}>
                          {item.verdict || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              background: "#111111", border: "1px solid #1E1E1E", borderRadius: "12px",
              padding: "2rem", textAlign: "center", color: "#888"
            }}>
              No score data available. Scout products to see top performers.
            </div>
          )}
        </section>

        {/* Top by Sales */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ color: "#FFD700", fontSize: "1.3rem", marginBottom: "1.5rem", fontWeight: 700 }}>
            Top Products by Sales Volume
          </h2>

          {loadingTrends ? (
            <div style={{ color: "#888", padding: "2rem", textAlign: "center" }}>Loading...</div>
          ) : trends && trends.top_by_sales && trends.top_by_sales.length > 0 ? (
            <div style={{ display: "grid", gap: "12px" }}>
              {trends.top_by_sales.map((item, idx) => {
                const maxSales = Math.max(...trends.top_by_sales.map(t => t.monthly_sales || 0), 1);
                const barWidth = ((item.monthly_sales || 0) / maxSales) * 100;

                return (
                  <div key={idx}
                    onClick={() => item.category && fetchCategoryDetails(item.category)}
                    style={{
                      background: "#111111", border: "1px solid #1E1E1E", borderRadius: "8px",
                      padding: "16px", cursor: item.category ? "pointer" : "default",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => { if (item.category) e.currentTarget.style.borderColor = "#FFD700"; }}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "#1E1E1E"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div>
                        <span style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "14px" }}>{item.asin}</span>
                        {item.title && (
                          <span style={{ color: "#888", fontSize: "13px", marginLeft: "12px" }}>
                            {item.title.length > 50 ? item.title.substring(0, 50) + '...' : item.title}
                          </span>
                        )}
                      </div>
                      <span style={{ color: "#10B981", fontWeight: 700, fontSize: "14px" }}>
                        {(item.monthly_sales || 0).toLocaleString()} /mo
                      </span>
                    </div>
                    <div style={{
                      width: "100%", height: "8px", background: "#1E1E1E",
                      borderRadius: "4px", overflow: "hidden"
                    }}>
                      <div style={{
                        width: `${barWidth}%`, height: "100%", background: "#10B981",
                        transition: "width 0.3s ease"
                      }} />
                    </div>
                    {item.category && (
                      <span style={{ color: "#666", fontSize: "12px", marginTop: "6px", display: "inline-block" }}>
                        {item.category}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              background: "#111111", border: "1px solid #1E1E1E", borderRadius: "12px",
              padding: "2rem", textAlign: "center", color: "#888"
            }}>
              No sales data available
            </div>
          )}
        </section>

        {/* Category Details */}
        {selectedCategory && (
          <section style={{
            background: "#111111", border: "1px solid #1E1E1E", borderRadius: "12px",
            padding: "2rem", marginBottom: "2rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ color: "#FFD700", fontSize: "1.3rem", fontWeight: 700 }}>
                {selectedCategory} — Category Analysis
              </h3>
              <button onClick={() => setSelectedCategory(null)} style={{
                background: "transparent", color: "#888", border: "1px solid #1E1E1E",
                borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "14px"
              }}>
                Close
              </button>
            </div>

            {loadingDetails ? (
              <div style={{ color: "#888", textAlign: "center", padding: "2rem" }}>Loading category details...</div>
            ) : categoryDetails ? (
              <div>
                {/* Category stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                  <StatCard label="Total Products" value={categoryDetails.total_products || 0} small />
                  {categoryDetails.statistics && (
                    <>
                      <StatCard label="Avg FBA Score" value={categoryDetails.statistics.average_fba_score || 0} small />
                      <StatCard label="Avg Price" value={`$${(categoryDetails.statistics.average_price || 0).toFixed(2)}`} small />
                      <StatCard label="Avg Monthly Sales" value={(categoryDetails.statistics.average_monthly_sales || 0).toLocaleString()} small />
                    </>
                  )}
                </div>

                {/* Verdict breakdown */}
                {categoryDetails.statistics && categoryDetails.statistics.verdict_breakdown && (
                  <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                    <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981", padding: "6px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
                      Buy: {categoryDetails.statistics.verdict_breakdown.buy || 0}
                    </span>
                    <span style={{ background: "rgba(255, 215, 0, 0.15)", color: "#FFD700", padding: "6px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
                      Test: {categoryDetails.statistics.verdict_breakdown.test || 0}
                    </span>
                    <span style={{ background: "rgba(239, 68, 68, 0.15)", color: "#EF4444", padding: "6px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
                      Skip: {categoryDetails.statistics.verdict_breakdown.skip || 0}
                    </span>
                  </div>
                )}

                {/* Top products in category */}
                {categoryDetails.top_products && categoryDetails.top_products.length > 0 && (
                  <div>
                    <h4 style={{ color: "#FFF", fontWeight: 600, marginBottom: "10px", fontSize: "14px" }}>Top Products</h4>
                    {categoryDetails.top_products.map((p, idx) => (
                      <div key={idx} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 12px", background: "#0A0A0A", borderRadius: "6px",
                        marginBottom: "6px", fontSize: "13px"
                      }}>
                        <div>
                          <span style={{ color: "#FFF", fontWeight: 600 }}>{p.asin}</span>
                          {p.brand && <span style={{ color: "#888", marginLeft: "8px" }}>{p.brand}</span>}
                        </div>
                        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                          <span style={{ color: "#BBB" }}>${p.current_price != null ? p.current_price.toFixed(2) : 'N/A'}</span>
                          <span style={{ color: getScoreColor(p.fba_score), fontWeight: 700 }}>{p.fba_score || 'N/A'}</span>
                          <span style={{
                            background: p.verdict === 'Buy' ? '#10B981' : p.verdict === 'Test' ? '#FFD700' : '#EF4444',
                            color: p.verdict === 'Test' ? '#000' : '#FFF',
                            padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 600
                          }}>
                            {p.verdict}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: "#888" }}>No details available for this category</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

/* ── Stat Card Component ──────────────────────────────────────────────── */
function StatCard({ label, value, color, small }) {
  return (
    <div style={{
      background: small ? "#0A0A0A" : "#111111",
      border: "1px solid #1E1E1E",
      borderRadius: small ? "8px" : "12px",
      padding: small ? "12px 16px" : "1.5rem",
    }}>
      <p style={{ color: "#888", fontSize: small ? "12px" : "13px", marginBottom: small ? "4px" : "6px" }}>{label}</p>
      <p style={{
        color: color || "#FFFFFF",
        fontSize: small ? "18px" : "24px",
        fontWeight: 800,
      }}>
        {value}
      </p>
    </div>
  );
}
