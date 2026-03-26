import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

const token = () => typeof window !== "undefined" ? localStorage.getItem("ecomera_token") : null;
const authHeader = () => ({
  headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" }
});

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [error, setError] = useState('');
  const [similarProducts, setSimilarProducts] = useState({});
  const [loadingSimilar, setLoadingSimilar] = useState({});

  useEffect(() => {
    fetchRecommendations();
    fetchTrending();
  }, []);

  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/recommendations`, authHeader());
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      const data = await res.json();
      // Backend returns { data: [...], count: N }
      setRecommendations(data.data || []);
    } catch (err) {
      setError(err.message);
      setRecommendations([]);
    } finally {
      setLoadingRecs(false);
    }
  };

  const fetchTrending = async () => {
    setLoadingTrending(true);
    try {
      const res = await fetch(`${API_URL}/recommendations/trending`, authHeader());
      if (!res.ok) throw new Error('Failed to fetch trending');
      const data = await res.json();
      // Backend returns { data: [...], count: N }
      setTrending(data.data || []);
    } catch (err) {
      console.error('Trending error:', err);
      setTrending([]);
    } finally {
      setLoadingTrending(false);
    }
  };

  const fetchSimilar = async (asin) => {
    setLoadingSimilar(prev => ({ ...prev, [asin]: true }));
    try {
      const res = await fetch(`${API_URL}/recommendations/similar/${asin}`, authHeader());
      if (!res.ok) throw new Error('Failed to fetch similar products');
      const data = await res.json();
      // Backend returns { similar_products: [...] }
      setSimilarProducts(prev => ({
        ...prev,
        [asin]: data.similar_products || []
      }));
    } catch (err) {
      console.error('Similar products error:', err);
    } finally {
      setLoadingSimilar(prev => ({ ...prev, [asin]: false }));
    }
  };

  const getVerdictColor = (verdict) => {
    switch (verdict) {
      case 'Buy': return '#10B981';
      case 'Test': return '#FFD700';
      default: return '#EF4444';
    }
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
          AI Product Recommendations
        </h1>

        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#EF4444",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "2rem",
            fontSize: "14px",
          }}>
            {error}
          </div>
        )}

        {/* Recommended Products Section */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ color: "#FFD700", fontSize: "1.3rem", marginBottom: "1.5rem", fontWeight: 700 }}>
            Top Recommended Products
          </h2>

          {loadingRecs ? (
            <div style={{ color: "#888", textAlign: "center", padding: "2rem" }}>Loading recommendations...</div>
          ) : recommendations.length === 0 ? (
            <div style={{
              background: "#111111", border: "1px solid #1E1E1E", borderRadius: "12px",
              padding: "2rem", textAlign: "center", color: "#888"
            }}>
              No recommendations available yet. Scout some products first to get AI recommendations.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
              {recommendations.map((rec, idx) => (
                <div key={idx} style={{
                  background: "#111111", border: "1px solid #1E1E1E", borderRadius: "12px",
                  padding: "1.5rem", transition: "all 0.3s ease", cursor: "pointer"
                }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "#FFD700"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "#1E1E1E"}
                >
                  {/* ASIN + Title */}
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ color: "#888", fontSize: "12px" }}>ASIN</span>
                      <span style={{
                        background: getVerdictColor(rec.verdict),
                        color: rec.verdict === 'Test' ? '#000' : '#FFF',
                        padding: "3px 10px", borderRadius: "12px",
                        fontSize: "11px", fontWeight: 700
                      }}>
                        {rec.verdict || 'N/A'}
                      </span>
                    </div>
                    <p style={{ color: "#FFFFFF", fontSize: "16px", fontWeight: 700, wordBreak: "break-all" }}>
                      {rec.asin || 'N/A'}
                    </p>
                    {rec.title && (
                      <p style={{ color: "#AAA", fontSize: "13px", marginTop: "4px", lineHeight: "1.4" }}>
                        {rec.title.length > 80 ? rec.title.substring(0, 80) + '...' : rec.title}
                      </p>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px",
                    marginBottom: "14px", padding: "12px", background: "#0A0A0A", borderRadius: "8px"
                  }}>
                    <div>
                      <span style={{ color: "#888", fontSize: "11px", display: "block" }}>FBA Score</span>
                      <span style={{ color: getScoreColor(rec.fba_score), fontWeight: 700, fontSize: "18px" }}>
                        {rec.fba_score != null ? rec.fba_score : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "#888", fontSize: "11px", display: "block" }}>Price</span>
                      <span style={{ color: "#FFF", fontWeight: 700, fontSize: "18px" }}>
                        ${rec.current_price != null ? rec.current_price.toFixed(2) : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "#888", fontSize: "11px", display: "block" }}>Monthly Sales</span>
                      <span style={{ color: "#FFF", fontWeight: 600, fontSize: "14px" }}>
                        {rec.monthly_sales != null ? rec.monthly_sales.toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "#888", fontSize: "11px", display: "block" }}>FBA Sellers</span>
                      <span style={{ color: "#FFF", fontWeight: 600, fontSize: "14px" }}>
                        {rec.fba_sellers != null ? rec.fba_sellers : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Category + Brand */}
                  <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
                    {rec.category && (
                      <span style={{
                        background: "#1E1E1E", color: "#CCC", padding: "4px 10px",
                        borderRadius: "6px", fontSize: "12px"
                      }}>
                        {rec.category}
                      </span>
                    )}
                    {rec.brand && (
                      <span style={{
                        background: "#1E1E1E", color: "#CCC", padding: "4px 10px",
                        borderRadius: "6px", fontSize: "12px"
                      }}>
                        {rec.brand}
                      </span>
                    )}
                  </div>

                  {/* Score Bar */}
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{
                      width: "100%", height: "6px", background: "#1E1E1E",
                      borderRadius: "3px", overflow: "hidden"
                    }}>
                      <div style={{
                        width: `${Math.min(100, rec.fba_score || 0)}%`,
                        height: "100%",
                        background: getScoreColor(rec.fba_score),
                        transition: "width 0.3s ease"
                      }} />
                    </div>
                  </div>

                  {/* Find Similar Button */}
                  <button
                    onClick={() => fetchSimilar(rec.asin)}
                    style={{
                      background: "#FFD700", color: "#000", border: "none", borderRadius: "6px",
                      padding: "8px 16px", fontWeight: 700, cursor: "pointer", width: "100%",
                      fontSize: "13px", transition: "all 0.3s ease"
                    }}
                  >
                    {loadingSimilar[rec.asin] ? 'Loading...' : 'Find Similar Products'}
                  </button>

                  {/* Similar Products */}
                  {similarProducts[rec.asin] && (
                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #1E1E1E" }}>
                      <p style={{ color: "#888", fontSize: "12px", marginBottom: "8px" }}>Similar Products</p>
                      {similarProducts[rec.asin].length === 0 ? (
                        <p style={{ color: "#666", fontSize: "13px" }}>No similar products found</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {similarProducts[rec.asin].slice(0, 3).map((sim, sidx) => (
                            <div key={sidx} style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "6px 8px", background: "#0A0A0A", borderRadius: "4px", fontSize: "13px"
                            }}>
                              <span style={{ color: "#CCC" }}>{sim.asin}</span>
                              <span style={{ color: getScoreColor(sim.fba_score), fontWeight: 600 }}>
                                {sim.fba_score != null ? sim.fba_score : 'N/A'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Trending Products Section */}
        <section>
          <h2 style={{ color: "#FFD700", fontSize: "1.3rem", marginBottom: "1.5rem", fontWeight: 700 }}>
            Trending Products
          </h2>

          {loadingTrending ? (
            <div style={{ color: "#888", textAlign: "center", padding: "2rem" }}>Loading trends...</div>
          ) : trending.length === 0 ? (
            <div style={{
              background: "#111111", border: "1px solid #1E1E1E", borderRadius: "12px",
              padding: "2rem", textAlign: "center", color: "#888"
            }}>
              No trending products yet. Scout more products to see trends.
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
                    <th style={{ textAlign: "left", padding: "12px", color: "#888", fontWeight: 600 }}>Category</th>
                    <th style={{ textAlign: "right", padding: "12px", color: "#888", fontWeight: 600 }}>Monthly Sales</th>
                    <th style={{ textAlign: "right", padding: "12px", color: "#888", fontWeight: 600 }}>Price</th>
                    <th style={{ textAlign: "right", padding: "12px", color: "#888", fontWeight: 600 }}>FBA Score</th>
                    <th style={{ textAlign: "center", padding: "12px", color: "#888", fontWeight: 600 }}>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {trending.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #1E1E1E" }}>
                      <td style={{ padding: "12px", fontWeight: 600 }}>{item.asin}</td>
                      <td style={{ padding: "12px", color: "#BBB", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title || '-'}
                      </td>
                      <td style={{ padding: "12px", color: "#BBB" }}>{item.category || '-'}</td>
                      <td style={{ textAlign: "right", padding: "12px", color: "#10B981", fontWeight: 600 }}>
                        {(item.monthly_sales || 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: "right", padding: "12px" }}>
                        ${item.current_price != null ? item.current_price.toFixed(2) : 'N/A'}
                      </td>
                      <td style={{ textAlign: "right", padding: "12px", color: getScoreColor(item.fba_score), fontWeight: 600 }}>
                        {item.fba_score != null ? item.fba_score : 'N/A'}
                      </td>
                      <td style={{ textAlign: "center", padding: "12px" }}>
                        <span style={{
                          background: getVerdictColor(item.verdict),
                          color: item.verdict === 'Test' ? '#000' : '#FFF',
                          padding: "3px 10px", borderRadius: "12px",
                          fontSize: "12px", fontWeight: 600
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
      </main>
    </div>
  );
}
