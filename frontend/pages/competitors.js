import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

const token = () => typeof window !== "undefined" ? localStorage.getItem("ecomera_token") : null;
const authHeader = () => ({
  headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" }
});

export default function Competitors() {
  const [overview, setOverview] = useState(null);
  const [crowdedData, setCrowdedData] = useState([]);
  const [brandDetails, setBrandDetails] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingCrowded, setLoadingCrowded] = useState(true);
  const [loadingBrand, setLoadingBrand] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOverview();
    fetchCrowdedData();
  }, []);

  const fetchOverview = async () => {
    setLoadingOverview(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/competitors/overview`, authHeader());
      if (!res.ok) throw new Error('Failed to fetch overview');
      const data = await res.json();
      // Backend returns: { total_products_analyzed, average_fba_sellers, average_competition_level,
      //                     average_price_volatility_pct, highly_competitive_count, low_competition_count }
      setOverview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchCrowdedData = async () => {
    setLoadingCrowded(true);
    try {
      const res = await fetch(`${API_URL}/competitors/crowded`, authHeader());
      if (!res.ok) throw new Error('Failed to fetch crowded niches');
      const data = await res.json();
      // Backend returns: { data: [...], count: N }
      setCrowdedData(data.data || []);
    } catch (err) {
      console.error('Crowded data error:', err);
      setCrowdedData([]);
    } finally {
      setLoadingCrowded(false);
    }
  };

  const fetchBrandDetails = async (brand) => {
    setSelectedBrand(brand);
    setLoadingBrand(true);
    try {
      const res = await fetch(`${API_URL}/competitors/brand/${encodeURIComponent(brand)}`, authHeader());
      if (!res.ok) throw new Error('Failed to fetch brand details');
      const data = await res.json();
      // Backend returns: { brand, total_products, statistics: {...}, top_products: [...] }
      setBrandDetails(data);
    } catch (err) {
      console.error('Brand details error:', err);
      setBrandDetails(null);
    } finally {
      setLoadingBrand(false);
    }
  };

  const getCompetitionLabel = (level) => {
    if (level >= 70) return { label: 'High', color: '#EF4444' };
    if (level >= 40) return { label: 'Medium', color: '#FFD700' };
    return { label: 'Low', color: '#10B981' };
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#FFD700';
    return '#EF4444';
  };

  // Extract unique brands from crowded data
  const uniqueBrands = [];
  const brandMap = {};
  crowdedData.forEach(item => {
    if (item.brand && !brandMap[item.brand]) {
      brandMap[item.brand] = { name: item.brand, count: 1, avgScore: item.fba_score || 0 };
    } else if (item.brand && brandMap[item.brand]) {
      brandMap[item.brand].count++;
      brandMap[item.brand].avgScore = (brandMap[item.brand].avgScore + (item.fba_score || 0)) / 2;
    }
  });
  Object.values(brandMap).forEach(b => uniqueBrands.push(b));
  uniqueBrands.sort((a, b) => b.count - a.count);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0A0A" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem" }}>
        <h1 style={{ color: "#FFFFFF", marginBottom: "2rem", fontSize: "2rem", fontWeight: 800 }}>
          Competitor Tracking
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
            Competition Overview
          </h2>

          {loadingOverview ? (
            <div style={{ color: "#888", padding: "2rem" }}>Loading overview...</div>
          ) : overview ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <StatCard label="Products Analyzed" value={overview.total_products_analyzed || 0} />
              <StatCard label="Avg FBA Sellers" value={overview.average_fba_sellers || 0} />
              <StatCard
                label="Competition Level"
                value={(() => {
                  const c = getCompetitionLabel(overview.average_competition_level || 0);
                  return c.label;
                })()}
                color={getCompetitionLabel(overview.average_competition_level || 0).color}
              />
              <StatCard label="Price Volatility" value={`${overview.average_price_volatility_pct || 0}%`} />
              <StatCard label="High Competition" value={overview.highly_competitive_count || 0} color="#EF4444" />
              <StatCard label="Low Competition" value={overview.low_competition_count || 0} color="#10B981" />
            </div>
          ) : (
            <div style={{ color: "#888" }}>No overview data available. Scout products to see competitor data.</div>
          )}
        </section>

        {/* Brands Table */}
        {uniqueBrands.length > 0 && (
          <section style={{ marginBottom: "3rem" }}>
            <h2 style={{ color: "#FFD700", fontSize: "1.3rem", marginBottom: "1.5rem", fontWeight: 700 }}>
              Top Brands
            </h2>
            <div style={{
              background: "#111111", border: "1px solid #1E1E1E", borderRadius: "12px",
              overflow: "hidden"
            }}>
              <table style={{ width: "100%", color: "#FFFFFF", fontSize: "14px", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1E1E1E", background: "#0A0A0A" }}>
                    <th style={{ textAlign: "left", padding: "14px", color: "#888", fontWeight: 600 }}>Brand</th>
                    <th style={{ textAlign: "center", padding: "14px", color: "#888", fontWeight: 600 }}>Products</th>
                    <th style={{ textAlign: "center", padding: "14px", color: "#888", fontWeight: 600 }}>Avg Score</th>
                    <th style={{ textAlign: "center", padding: "14px", color: "#888", fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueBrands.slice(0, 15).map((brand, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #1E1E1E" }}>
                      <td style={{ padding: "14px", fontWeight: 600 }}>{brand.name}</td>
                      <td style={{ textAlign: "center", padding: "14px", color: "#BBB" }}>{brand.count}</td>
                      <td style={{ textAlign: "center", padding: "14px", color: getScoreColor(brand.avgScore), fontWeight: 600 }}>
                        {brand.avgScore.toFixed(1)}
                      </td>
                      <td style={{ textAlign: "center", padding: "14px" }}>
                        <button
                          onClick={() => fetchBrandDetails(brand.name)}
                          style={{
                            background: "#FFD700", color: "#000", border: "none", borderRadius: "6px",
                            padding: "6px 14px", fontWeight: 600, cursor: "pointer", fontSize: "13px",
                            transition: "all 0.3s ease"
                          }}
                        >
                          Analyze
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Crowded Products */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ color: "#FFD700", fontSize: "1.3rem", marginBottom: "1.5rem", fontWeight: 700 }}>
            Most Competitive Products
          </h2>

          {loadingCrowded ? (
            <div style={{ color: "#888", padding: "2rem", textAlign: "center" }}>Loading competitive data...</div>
          ) : crowdedData.length === 0 ? (
            <div style={{
              background: "#111111", border: "1px solid #1E1E1E", borderRadius: "12px",
              padding: "2rem", textAlign: "center", color: "#888"
            }}>
              No competitive data available. Scout products to see competition levels.
            </div>
          ) : (
            <div style={{
              background: "#111111", border: "1px solid #1E1E1E", borderRadius: "12px",
              padding: "1.5rem", overflowX: "auto"
            }}>
              <table style={{ width: "100%", color: "#FFFFFF", fontSize: "14px", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                    <th style={{ textAlign: "left", padding: "12px", color: "#888", fontWeight: 600 }}>ASIN</th>
                    <th style={{ textAlign: "left", padding: "12px", color: "#888", fontWeight: 600 }}>Title</th>
                    <th style={{ textAlign: "left", padding: "12px", color: "#888", fontWeight: 600 }}>Brand</th>
                    <th style={{ textAlign: "right", padding: "12px", color: "#888", fontWeight: 600 }}>FBA Sellers</th>
                    <th style={{ textAlign: "right", padding: "12px", color: "#888", fontWeight: 600 }}>Price</th>
                    <th style={{ textAlign: "right", padding: "12px", color: "#888", fontWeight: 600 }}>Volatility</th>
                    <th style={{ textAlign: "center", padding: "12px", color: "#888", fontWeight: 600 }}>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {crowdedData.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #1E1E1E" }}>
                      <td style={{ padding: "12px", fontWeight: 600 }}>{item.asin}</td>
                      <td style={{ padding: "12px", color: "#BBB", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title || '-'}
                      </td>
                      <td style={{ padding: "12px", color: "#BBB" }}>
                        {item.brand ? (
                          <button
                            onClick={() => fetchBrandDetails(item.brand)}
                            style={{
                              background: "transparent", border: "none", color: "#FFD700",
                              cursor: "pointer", fontWeight: 600, fontSize: "14px", padding: 0,
                              textDecoration: "underline"
                            }}
                          >
                            {item.brand}
                          </button>
                        ) : '-'}
                      </td>
                      <td style={{ textAlign: "right", padding: "12px", color: "#EF4444", fontWeight: 700 }}>
                        {item.fba_sellers || 0}
                      </td>
                      <td style={{ textAlign: "right", padding: "12px" }}>
                        ${item.current_price != null ? item.current_price.toFixed(2) : 'N/A'}
                      </td>
                      <td style={{ textAlign: "right", padding: "12px", color: (item.price_volatility_pct || 0) > 15 ? '#EF4444' : '#888' }}>
                        {item.price_volatility_pct != null ? `${item.price_volatility_pct}%` : 'N/A'}
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
          )}
        </section>

        {/* Brand Deep-Dive */}
        {selectedBrand && (
          <section style={{
            background: "#111111", border: "1px solid #1E1E1E", borderRadius: "12px",
            padding: "2rem", marginBottom: "2rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ color: "#FFD700", fontSize: "1.3rem", fontWeight: 700 }}>
                {selectedBrand} — Brand Analysis
              </h3>
              <button onClick={() => setSelectedBrand(null)} style={{
                background: "transparent", color: "#888", border: "1px solid #1E1E1E",
                borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "14px"
              }}>
                Close
              </button>
            </div>

            {loadingBrand ? (
              <div style={{ color: "#888", textAlign: "center", padding: "2rem" }}>Loading brand analysis...</div>
            ) : brandDetails ? (
              <div>
                {/* Brand stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                  <StatCard label="Total Products" value={brandDetails.total_products || 0} small />
                  {brandDetails.statistics && (
                    <>
                      <StatCard label="Avg FBA Sellers" value={brandDetails.statistics.average_fba_sellers || 0} small />
                      <StatCard label="Avg FBA Score" value={brandDetails.statistics.average_fba_score || 0} small color={getScoreColor(brandDetails.statistics.average_fba_score)} />
                      <StatCard label="Avg Price" value={`$${(brandDetails.statistics.average_price || 0).toFixed(2)}`} small />
                    </>
                  )}
                </div>

                {/* Verdict breakdown */}
                {brandDetails.statistics && brandDetails.statistics.verdict_breakdown && (
                  <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                    <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981", padding: "6px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
                      Buy: {brandDetails.statistics.verdict_breakdown.buy || 0}
                    </span>
                    <span style={{ background: "rgba(255, 215, 0, 0.15)", color: "#FFD700", padding: "6px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
                      Test: {brandDetails.statistics.verdict_breakdown.test || 0}
                    </span>
                    <span style={{ background: "rgba(239, 68, 68, 0.15)", color: "#EF4444", padding: "6px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
                      Skip: {brandDetails.statistics.verdict_breakdown.skip || 0}
                    </span>
                  </div>
                )}

                {/* Top products */}
                {brandDetails.top_products && brandDetails.top_products.length > 0 && (
                  <div>
                    <h4 style={{ color: "#FFF", fontWeight: 600, marginBottom: "10px", fontSize: "14px" }}>Top Products</h4>
                    {brandDetails.top_products.map((p, idx) => (
                      <div key={idx} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 12px", background: "#0A0A0A", borderRadius: "6px",
                        marginBottom: "6px", fontSize: "13px"
                      }}>
                        <div>
                          <span style={{ color: "#FFF", fontWeight: 600 }}>{p.asin}</span>
                          {p.category && <span style={{ color: "#888", marginLeft: "8px" }}>{p.category}</span>}
                        </div>
                        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                          <span style={{ color: "#888" }}>{p.fba_sellers} sellers</span>
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
              <p style={{ color: "#888" }}>No details available for this brand</p>
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
