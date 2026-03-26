'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";
const token = () => typeof window !== "undefined" ? localStorage.getItem("ecomera_token") : null;
const authHeader = () => ({ headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" } });

export default function Market() {
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
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
      setTrends(Array.isArray(data) ? data : data.trends || []);
    } catch (err) {
      console.error('Trends error:', err);
      setTrends([]);
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

  const StatCard = ({ label, value, unit = '', trend = null }) => (
    <div style={{
      background: "#111111",
      border: "1px solid #1E1E1E",
      borderRadius: "12px",
      padding: "1.5rem",
      flex: 1,
      minWidth: "200px"
    }}>
      <p style={{ color: "#888", fontSize: "0.9rem", marginBottom: "0.5rem" }}>{label}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
        <p style={{ color: "#FFFFFF", fontSize: "2rem", fontWeight: 800 }}>{value}</p>
        {unit && <span style={{ color: "#888", fontSize: "0.9rem" }}>{unit}</span>}
      </div>
      {trend && (
        <p style={{ color: trend > 0 ? "#10B981" : "#EF4444", fontSize: "0.85rem", marginTop: "0.5rem" }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
        </p>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0A0A" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem" }}>
        <h1 style={{ color: "#FFFFFF", marginBottom: "2rem", fontSize: "2.5rem", fontWeight: 800 }}>
          Market Analysis
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

        {/* Overview Stats */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ color: "#FFD700", fontSize: "1.3rem", marginBottom: "1.5rem", fontWeight: 700 }}>
            Market Overview
          </h2>
          {loadingOverview ? (
            <div style={{ color: "#888", padding: "2rem" }}>Loading overview...</div>
          ) : overview ? (
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <StatCard label="Total Categories" value={overview.totalCategories || 0} />
              <StatCard label="Active Sellers" value={overview.activeSellers || 0} trend={overview.sellersTrend || 0} />
              <StatCard label="Avg Price" value={`$${(overview.avgPrice || 0).toFixed(2)}`} trend={overview.priceTrend || 0} />
              <StatCard label="Market Health" value={overview.marketHealth || 'N/A'} />
            </div>
          ) : (
            <div style={{ color: "#888" }}>No overview data available</div>
          )}
        </section>

        {/* Category Breakdown */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ color: "#FFD700", fontSize: "1.3rem", marginBottom: "1.5rem", fontWeight: 700 }}>
            Category Breakdown
          </h2>
          {trends.length === 0 ? (
            <div style={{
              background: "#111111",
              border: "1px solid #1E1E1E",
              borderRadius: "12px",
              padding: "2rem",
              textAlign: "center",
              color: "#888"
            }}>
              No category data available
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {trends.slice(0, 8).map((cat, idx) => {
                const maxValue = Math.max(...trends.map(t => t.marketSize || 0));
                const barWidth = maxValue > 0 ? ((cat.marketSize || 0) / maxValue) * 100 : 0;
                const isImproving = (cat.trend || 0) > 0;

                return (
                  <div
                    key={idx}
                    onClick={() => fetchCategoryDetails(cat.category)}
                    style={{
                      background: "#111111",
                      border: "1px solid #1E1E1E",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      cursor: "pointer",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "#FFD700"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "#1E1E1E"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ color: "#FFFFFF", fontWeight: 600 }}>{cat.category}</span>
                      <span style={{
                        color: isImproving ? "#10B981" : "#EF4444",
                        fontWeight: 700
                      }}>
                        {isImproving ? '↑' : '↓'} {Math.abs(cat.trend || 0)}%
                      </span>
                    </div>
                    <div style={{
                      width: "100%",
                      height: "12px",
                      background: "#1E1E1E",
                      borderRadius: "6px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        width: `${barWidth}%`,
                        height: "100%",
                        background: isImproving ? "#10B981" : "#EF4444",
                        transition: "width 0.3s ease"
                      }} />
                    </div>
                    <p style={{ color: "#888", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                      Market Size: ${(cat.marketSize || 0).toLocaleString()}K
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Category Details Modal */}
        {selectedCategory && (
          <section style={{
            background: "#111111",
            border: "1px solid #1E1E1E",
            borderRadius: "12px",
            padding: "2rem",
            marginBottom: "2rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ color: "#FFD700", fontSize: "1.3rem", fontWeight: 700 }}>
                {selectedCategory} Details
              </h3>
              <button
                onClick={() => setSelectedCategory(null)}
                style={{
                  background: "transparent",
                  color: "#888",
                  border: "1px solid #1E1E1E",
                  borderRadius: "8px",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  fontSize: "1rem"
                }}
              >
                ✕
              </button>
            </div>

            {loadingDetails ? (
              <div style={{ color: "#888", textAlign: "center", padding: "2rem" }}>Loading details...</div>
            ) : categoryDetails ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                <div>
                  <h4 style={{ color: "#FFFFFF", fontWeight: 600, marginBottom: "1rem" }}>Competition Level</h4>
                  <div style={{
                    fontSize: "3rem",
                    fontWeight: 800,
                    color: categoryDetails.competitionLevel === 'High' ? '#EF4444' : categoryDetails.competitionLevel === 'Medium' ? '#FFD700' : '#10B981',
                    marginBottom: "1rem"
                  }}>
                    {categoryDetails.competitionLevel || 'Unknown'}
                  </div>
                  <p style={{ color: "#888" }}>Competitor count: {categoryDetails.competitorCount || 0}</p>
                </div>
                <div>
                  <h4 style={{ color: "#FFFFFF", fontWeight: 600, marginBottom: "1rem" }}>Key Metrics</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#888" }}>Avg Rating:</span>
                      <span style={{ color: "#FFFFFF", fontWeight: 600 }}>{categoryDetails.avgRating || 0}/5</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#888" }}>Monthly Sales:</span>
                      <span style={{ color: "#FFFFFF", fontWeight: 600 }}>${(categoryDetails.monthlySales || 0).toLocaleString()}K</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#888" }}>Avg Price:</span>
                      <span style={{ color: "#FFFFFF", fontWeight: 600 }}>${(categoryDetails.avgPrice || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: "#888" }}>No details available for this category</p>
            )}
          </section>
        )}

        {/* Trends Section */}
        <section>
          <h2 style={{ color: "#FFD700", fontSize: "1.3rem", marginBottom: "1.5rem", fontWeight: 700 }}>
            Improving vs Declining Categories
          </h2>
          {loadingTrends ? (
            <div style={{ color: "#888", padding: "2rem", textAlign: "center" }}>Loading trends...</div>
          ) : trends.length === 0 ? (
            <div style={{
              background: "#111111",
              border: "1px solid #1E1E1E",
              borderRadius: "12px",
              padding: "2rem",
              textAlign: "center",
              color: "#888"
            }}>
              No trend data available
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
              {/* Improving */}
              <div style={{
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "12px",
                padding: "1.5rem"
              }}>
                <h4 style={{ color: "#10B981", fontWeight: 700, marginBottom: "1rem" }}>📈 Improving</h4>
                {trends
                  .filter(t => (t.trend || 0) > 0)
                  .slice(0, 5)
                  .map((cat, idx) => (
                    <div key={idx} style={{
                      padding: "0.8rem 0",
                      borderBottom: idx < 4 ? "1px solid #1E1E1E" : "none",
                      display: "flex",
                      justifyContent: "space-between"
                    }}>
                      <span style={{ color: "#FFFFFF" }}>{cat.category}</span>
                      <span style={{ color: "#10B981", fontWeight: 600 }}>+{cat.trend}%</span>
                    </div>
                  ))
                }
              </div>

              {/* Declining */}
              <div style={{
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "12px",
                padding: "1.5rem"
              }}>
                <h4 style={{ color: "#EF4444", fontWeight: 700, marginBottom: "1rem" }}>📉 Declining</h4>
                {trends
                  .filter(t => (t.trend || 0) < 0)
                  .slice(0, 5)
                  .map((cat, idx) => (
                    <div key={idx} style={{
                      padding: "0.8rem 0",
                      borderBottom: idx < 4 ? "1px solid #1E1E1E" : "none",
                      display: "flex",
                      justifyContent: "space-between"
                    }}>
                      <span style={{ color: "#FFFFFF" }}>{cat.category}</span>
                      <span style={{ color: "#EF4444", fontWeight: 600 }}>{cat.trend}%</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
