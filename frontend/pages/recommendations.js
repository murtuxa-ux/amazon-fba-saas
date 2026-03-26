'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";
const token = () => typeof window !== "undefined" ? localStorage.getItem("ecomera_token") : null;
const authHeader = () => ({ headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" } });

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
      setRecommendations(Array.isArray(data) ? data : data.recommendations || []);
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
      setTrending(Array.isArray(data) ? data : data.trending || []);
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
      setSimilarProducts(prev => ({
        ...prev,
        [asin]: Array.isArray(data) ? data : data.similar || []
      }));
    } catch (err) {
      console.error('Similar products error:', err);
    } finally {
      setLoadingSimilar(prev => ({ ...prev, [asin]: false }));
    }
  };

  const getVerdictColor = (score) => {
    if (score >= 8) return '#10B981';
    if (score >= 6) return '#FFD700';
    return '#EF4444';
  };

  const getVerdictText = (score) => {
    if (score >= 8) return 'Highly Recommended';
    if (score >= 6) return 'Good Opportunity';
    return 'Reconsider';
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0A0A" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem" }}>
        <h1 style={{ color: "#FFFFFF", marginBottom: "2rem", fontSize: "2.5rem", fontWeight: 800 }}>
          AI Product Recommendations
        </h1>

        {error && (
          <div style={{
            background: "#EF4444",
            color: "#FFF",
            padding: "1rem",
            borderRadius: "12px",
            marginBottom: "2rem"
          }}>
            Error: {error}
          </div>
        )}

        {/* Recommended Products Section */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ color: "#FFD700", fontSize: "1.5rem", marginBottom: "1.5rem", fontWeight: 700 }}>
            Top Recommended Products
          </h2>
          {loadingRecs ? (
            <div style={{ color: "#888", textAlign: "center", padding: "2rem" }}>Loading recommendations...</div>
          ) : recommendations.length === 0 ? (
            <div style={{
              background: "#111111",
              border: "1px solid #1E1E1E",
              borderRadius: "12px",
              padding: "2rem",
              textAlign: "center",
              color: "#888"
            }}>
              No recommendations available yet. Start by analyzing the market.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
              {recommendations.map((rec, idx) => (
                <div key={idx} style={{
                  background: "#111111",
                  border: "1px solid #1E1E1E",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  transition: "all 0.3s ease",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#FFD700"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#1E1E1E"}
                >
                  <div style={{ marginBottom: "1rem" }}>
                    <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "0.5rem" }}>ASIN</p>
                    <p style={{ color: "#FFFFFF", fontSize: "1.2rem", fontWeight: 700, wordBreak: "break-all" }}>
                      {rec.asin || 'N/A'}
                    </p>
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Category</p>
                    <p style={{ color: "#FFFFFF", fontWeight: 600 }}>{rec.category || 'Unknown'}</p>
                  </div>

                  <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ color: "#888", fontSize: "0.85rem" }}>Score</span>
                      <span style={{ color: "#FFD700", fontWeight: 700 }}>{rec.score || 0}/10</span>
                    </div>
                    <div style={{
                      width: "100%",
                      height: "8px",
                      background: "#1E1E1E",
                      borderRadius: "4px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        width: `${((rec.score || 0) / 10) * 100}%`,
                        height: "100%",
                        background: getVerdictColor(rec.score || 0),
                        transition: "width 0.3s ease"
                      }} />
                    </div>
                  </div>

                  <div style={{
                    background: getVerdictColor(rec.score || 0),
                    color: "#000",
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    marginBottom: "1rem",
                    textAlign: "center"
                  }}>
                    {getVerdictText(rec.score || 0)}
                  </div>

                  <button
                    onClick={() => fetchSimilar(rec.asin)}
                    style={{
                      background: "#FFD700",
                      color: "#000",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.6rem 1.2rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      width: "100%",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => e.target.style.background = "#FFC500"}
                    onMouseLeave={(e) => e.target.style.background = "#FFD700"}
                  >
                    {loadingSimilar[rec.asin] ? 'Loading...' : 'Find Similar'}
                  </button>

                  {similarProducts[rec.asin] && (
                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #1E1E1E" }}>
                      <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Similar Products</p>
                      {similarProducts[rec.asin].length === 0 ? (
                        <p style={{ color: "#666", fontSize: "0.9rem" }}>No similar products found</p>
                      ) : (
                        <ul style={{ color: "#FFFFFF", fontSize: "0.9rem" }}>
                          {similarProducts[rec.asin].slice(0, 3).map((sim, sidx) => (
                            <li key={sidx} style={{ marginBottom: "0.3rem", color: "#BBB" }}>
                              {sim.asin || 'Unknown ASIN'}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Trending Categories Section */}
        <section>
          <h2 style={{ color: "#FFD700", fontSize: "1.5rem", marginBottom: "1.5rem", fontWeight: 700 }}>
            Trending Categories
          </h2>
          {loadingTrending ? (
            <div style={{ color: "#888", textAlign: "center", padding: "2rem" }}>Loading trends...</div>
          ) : trending.length === 0 ? (
            <div style={{
              background: "#111111",
              border: "1px solid #1E1E1E",
              borderRadius: "12px",
              padding: "2rem",
              textAlign: "center",
              color: "#888"
            }}>
              No trending categories available.
            </div>
          ) : (
            <div style={{
              background: "#111111",
              border: "1px solid #1E1E1E",
              borderRadius: "12px",
              padding: "1.5rem",
              overflowX: "auto"
            }}>
              <table style={{ width: "100%", color: "#FFFFFF", fontSize: "0.95rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                    <th style={{ textAlign: "left", padding: "1rem", color: "#888", fontWeight: 600 }}>Category</th>
                    <th style={{ textAlign: "right", padding: "1rem", color: "#888", fontWeight: 600 }}>Growth Rate</th>
                    <th style={{ textAlign: "right", padding: "1rem", color: "#888", fontWeight: 600 }}>Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {trending.map((cat, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #1E1E1E" }}>
                      <td style={{ padding: "1rem" }}>{cat.category || 'Unknown'}</td>
                      <td style={{ textAlign: "right", padding: "1rem", color: "#10B981", fontWeight: 600 }}>
                        +{cat.growthRate || 0}%
                      </td>
                      <td style={{ textAlign: "right", padding: "1rem" }}>{cat.volume || 0}</td>
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
