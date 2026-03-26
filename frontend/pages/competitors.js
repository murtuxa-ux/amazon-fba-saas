'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";
const token = () => typeof window !== "undefined" ? localStorage.getItem("ecomera_token") : null;
const authHeader = () => ({ headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" } });

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
      setCrowdedData(Array.isArray(data) ? data : data.niches || []);
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
      setBrandDetails(data);
    } catch (err) {
      console.error('Brand details error:', err);
      setBrandDetails(null);
    } finally {
      setLoadingBrand(false);
    }
  };

  const getCompetitionColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#FFD700';
      case 'low':
        return '#10B981';
      default:
        return '#888';
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
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% change
        </p>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0A0A" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem" }}>
        <h1 style={{ color: "#FFFFFF", marginBottom: "2rem", fontSize: "2.5rem", fontWeight: 800 }}>
          Competitor Tracking
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
            Competition Overview
          </h2>
          {loadingOverview ? (
            <div style={{ color: "#888", padding: "2rem" }}>Loading overview...</div>
          ) : overview ? (
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <StatCard label="Total Competitors" value={overview.totalCompetitors || 0} />
              <StatCard label="Top Brands" value={overview.topBrands || 0} />
              <StatCard label="Avg Competition Level" value={overview.avgCompetitionLevel || 'N/A'} />
              <StatCard label="Market Concentration" value={`${(overview.concentration || 0).toFixed(1)}%`} />
            </div>
          ) : (
            <div style={{ color: "#888" }}>No overview data available</div>
          )}
        </section>

        {/* Top Brands Table */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ color: "#FFD700", fontSize: "1.3rem", marginBottom: "1.5rem", fontWeight: 700 }}>
            Top Brands
          </h2>
          {overview && overview.topBrandsList && overview.topBrandsList.length > 0 ? (
            <div style={{
              background: "#111111",
              border: "1px solid #1E1E1E",
              borderRadius: "12px",
              overflow: "hidden"
            }}>
              <table style={{ width: "100%", color: "#FFFFFF", fontSize: "0.95rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1E1E1E", background: "#0A0A0A" }}>
                    <th style={{ textAlign: "left", padding: "1.2rem", color: "#888", fontWeight: 600 }}>Brand</th>
                    <th style={{ textAlign: "center", padding: "1.2rem", color: "#888", fontWeight: 600 }}>Product Count</th>
                    <th style={{ textAlign: "center", padding: "1.2rem", color: "#888", fontWeight: 600 }}>Avg Score</th>
                    <th style={{ textAlign: "center", padding: "1.2rem", color: "#888", fontWeight: 600 }}>Competition</th>
                    <th style={{ textAlign: "center", padding: "1.2rem", color: "#888", fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.topBrandsList.map((brand, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #1E1E1E" }}>
                      <td style={{ padding: "1.2rem", fontWeight: 600 }}>{brand.name}</td>
                      <td style={{ textAlign: "center", padding: "1.2rem", color: "#BBB" }}>{brand.productCount || 0}</td>
                      <td style={{ textAlign: "center", padding: "1.2rem", color: "#FFD700", fontWeight: 600 }}>
                        {(brand.avgScore || 0).toFixed(2)}/10
                      </td>
                      <td style={{ textAlign: "center", padding: "1.2rem" }}>
                        <div style={{
                          display: "inline-block",
                          background: getCompetitionColor(brand.competitionLevel),
                          color: brand.competitionLevel?.toLowerCase() === 'high' ? "#FFFFFF" : "#000",
                          padding: "0.4rem 0.8rem",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          fontWeight: 600
                        }}>
                          {brand.competitionLevel || 'N/A'}
                        </div>
                      </td>
                      <td style={{ textAlign: "center", padding: "1.2rem" }}>
                        <button
                          onClick={() => fetchBrandDetails(brand.name)}
                          style={{
                            background: "#FFD700",
                            color: "#000",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.4rem 0.8rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            transition: "all 0.3s ease"
                          }}
                          onMouseEnter={(e) => e.target.style.background = "#FFC500"}
                          onMouseLeave={(e) => e.target.style.background = "#FFD700"}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              background: "#111111",
              border: "1px solid #1E1E1E",
              borderRadius: "12px",
              padding: "2rem",
              textAlign: "center",
              color: "#888"
            }}>
              No brand data available
            </div>
          )}
        </section>

        {/* Crowded vs Uncrowded Niches */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ color: "#FFD700", fontSize: "1.3rem", marginBottom: "1.5rem", fontWeight: 700 }}>
            Crowded vs Uncrowded Niches
          </h2>
          {loadingCrowded ? (
            <div style={{ color: "#888", padding: "2rem", textAlign: "center" }}>Loading niche data...</div>
          ) : crowdedData.length === 0 ? (
            <div style={{
              background: "#111111",
              border: "1px solid #1E1E1E",
              borderRadius: "12px",
              padding: "2rem",
              textAlign: "center",
              color: "#888"
            }}>
              No niche data available
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
              {/* Crowded */}
              <div style={{
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "12px",
                padding: "1.5rem"
              }}>
                <h4 style={{ color: "#EF4444", fontWeight: 700, marginBottom: "1rem" }}>
                  Crowded Niches (High Competition)
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  {crowdedData
                    .filter(n => n.crowded === true || n.competitionLevel === 'High')
                    .slice(0, 6)
                    .map((niche, idx) => (
                      <div key={idx} style={{
                        background: "#0A0A0A",
                        border: "1px solid #1E1E1E",
                        borderRadius: "8px",
                        padding: "0.8rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span style={{ color: "#FFFFFF" }}>{niche.niche || niche.category}</span>
                        <span style={{
                          background: "#EF4444",
                          color: "#FFFFFF",
                          padding: "0.3rem 0.6rem",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          fontWeight: 600
                        }}>
                          {niche.competitorCount || niche.competitors || 0} sellers
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Uncrowded */}
              <div style={{
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "12px",
                padding: "1.5rem"
              }}>
                <h4 style={{ color: "#10B981", fontWeight: 700, marginBottom: "1rem" }}>
                  Uncrowded Niches (Low Competition)
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  {crowdedData
                    .filter(n => n.crowded === false || n.competitionLevel === 'Low')
                    .slice(0, 6)
                    .map((niche, idx) => (
                      <div key={idx} style={{
                        background: "#0A0A0A",
                        border: "1px solid #1E1E1E",
                        borderRadius: "8px",
                        padding: "0.8rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span style={{ color: "#FFFFFF" }}>{niche.niche || niche.category}</span>
                        <span style={{
                          background: "#10B981",
                          color: "#000",
                          padding: "0.3rem 0.6rem",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          fontWeight: 600
                        }}>
                          {niche.competitorCount || niche.competitors || 0} sellers
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Brand Deep-Dive Modal */}
        {selectedBrand && (
          <section style={{
            background: "#111111",
            border: "1px solid #1E1E1E",
            borderRadius: "12px",
            padding: "2rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ color: "#FFD700", fontSize: "1.3rem", fontWeight: 700 }}>
                {selectedBrand} Deep-Dive
              </h3>
              <button
                onClick={() => setSelectedBrand(null)}
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

            {loadingBrand ? (
              <div style={{ color: "#888", textAlign: "center", padding: "2rem" }}>Loading brand details...</div>
            ) : brandDetails ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
                <div>
                  <h4 style={{ color: "#888", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Total Products</h4>
                  <p style={{ color: "#FFFFFF", fontSize: "2rem", fontWeight: 800 }}>
                    {brandDetails.productCount || 0}
                  </p>
                </div>
                <div>
                  <h4 style={{ color: "#888", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Avg Rating</h4>
                  <p style={{ color: "#FFD700", fontSize: "2rem", fontWeight: 800 }}>
                    {(brandDetails.avgRating || 0).toFixed(1)}/5
                  </p>
                </div>
                <div>
                  <h4 style={{ color: "#888", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Est. Revenue</h4>
                  <p style={{ color: "#10B981", fontSize: "2rem", fontWeight: 800 }}>
                    ${(brandDetails.estRevenue || 0).toLocaleString()}K
                  </p>
                </div>

                <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #1E1E1E", paddingTop: "1rem", marginTop: "1rem" }}>
                  <h4 style={{ color: "#FFFFFF", fontWeight: 600, marginBottom: "1rem" }}>Top Products</h4>
                  <ul style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {(brandDetails.topProducts || []).slice(0, 4).map((prod, idx) => (
                      <li key={idx} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.6rem",
                        background: "#0A0A0A",
                        borderRadius: "6px",
                        color: "#FFFFFF",
                        fontSize: "0.9rem"
                      }}>
                        <span>{prod.name || `Product ${idx + 1}`}</span>
                        <span style={{ color: "#FFD700", fontWeight: 600 }}>${(prod.price || 0).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
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
