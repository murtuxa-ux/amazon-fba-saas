import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";

const T = {
  bg: "#0A0A0A",
  card: "#111111",
  border: "#1E1E1E",
  yellow: "#FFD700",
  yellowDim: "rgba(255,215,0,0.12)",
  text: "#FFFFFF",
  textSec: "#888888",
  textMut: "#555555",
  green: "#22C55E",
  red: "#EF4444",
};

const API = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

export default function PPCManager() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("campaigns");

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/ppc/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(Array.isArray(data) ? data : data.campaigns || []);
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const S = {
    page: {
      display: "flex",
      minHeight: "100vh",
      backgroundColor: T.bg,
      color: T.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    main: {
      flex: 1,
      padding: "32px",
      overflowY: "auto",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
    },
    title: {
      fontSize: "24px",
      fontWeight: 700,
    },
    subtitle: {
      fontSize: "14px",
      color: T.textSec,
      marginTop: "4px",
    },
    tabs: {
      display: "flex",
      gap: "4px",
      marginBottom: "24px",
      borderBottom: `1px solid ${T.border}`,
      paddingBottom: "0",
    },
    tab: (active) => ({
      padding: "10px 20px",
      fontSize: "13px",
      fontWeight: active ? 600 : 400,
      color: active ? T.yellow : T.textSec,
      backgroundColor: "transparent",
      border: "none",
      borderBottom: active ? `2px solid ${T.yellow}` : "2px solid transparent",
      cursor: "pointer",
      transition: "all 0.15s",
    }),
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gap: "16px",
      marginBottom: "32px",
    },
    statCard: {
      backgroundColor: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: "8px",
      padding: "20px",
    },
    statLabel: {
      fontSize: "12px",
      color: T.textSec,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      marginBottom: "8px",
    },
    statValue: {
      fontSize: "28px",
      fontWeight: 700,
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      backgroundColor: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: "8px",
      overflow: "hidden",
    },
    th: {
      textAlign: "left",
      padding: "12px 16px",
      fontSize: "11px",
      fontWeight: 700,
      color: T.textMut,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      borderBottom: `1px solid ${T.border}`,
      backgroundColor: T.card,
    },
    td: {
      padding: "12px 16px",
      fontSize: "13px",
      borderBottom: `1px solid ${T.border}`,
      color: T.textSec,
    },
    badge: (color) => ({
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: 600,
      backgroundColor: color === "green" ? "rgba(34,197,94,0.12)" : color === "red" ? "rgba(239,68,68,0.12)" : T.yellowDim,
      color: color === "green" ? T.green : color === "red" ? T.red : T.yellow,
    }),
    emptyState: {
      textAlign: "center",
      padding: "60px 20px",
      backgroundColor: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: "8px",
    },
    emptyTitle: {
      fontSize: "18px",
      fontWeight: 600,
      marginBottom: "8px",
    },
    emptyText: {
      fontSize: "14px",
      color: T.textSec,
      marginBottom: "20px",
    },
    btn: {
      padding: "10px 20px",
      backgroundColor: T.yellow,
      color: "#000",
      border: "none",
      borderRadius: "6px",
      fontSize: "13px",
      fontWeight: 600,
      cursor: "pointer",
    },
  };

  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const totalSales = campaigns.reduce((s, c) => s + (c.sales || 0), 0);
  const avgAcos = totalSales > 0 ? ((totalSpend / totalSales) * 100).toFixed(1) : "0.0";
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);

  return (
    <div style={S.page}>
      <Sidebar />
      <main style={S.main}>
        <div style={S.header}>
          <div>
            <div style={S.title}>PPC Manager</div>
            <div style={S.subtitle}>Manage and optimize your Amazon PPC campaigns</div>
          </div>
          <button style={S.btn} onClick={fetchCampaigns}>Refresh Data</button>
        </div>

        <div style={S.tabs}>
          {["campaigns", "keywords", "analytics"].map((t) => (
            <button
              key={t}
              style={S.tab(tab === t)}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div style={S.grid}>
          <div style={S.statCard}>
            <div style={S.statLabel}>Total Spend</div>
            <div style={S.statValue}>${totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div style={S.statCard}>
            <div style={S.statLabel}>Total Sales</div>
            <div style={S.statValue}>${totalSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div style={S.statCard}>
            <div style={S.statLabel}>Avg ACoS</div>
            <div style={{ ...S.statValue, color: parseFloat(avgAcos) > 30 ? T.red : T.green }}>{avgAcos}%</div>
          </div>
          <div style={S.statCard}>
            <div style={S.statLabel}>Impressions</div>
            <div style={S.statValue}>{totalImpressions.toLocaleString()}</div>
          </div>
        </div>

        {loading ? (
          <div style={S.emptyState}>
            <div style={S.emptyTitle}>Loading campaigns...</div>
          </div>
        ) : campaigns.length === 0 ? (
          <div style={S.emptyState}>
            <div style={S.emptyTitle}>No PPC Campaigns Yet</div>
            <div style={S.emptyText}>
              PPC campaigns will appear here once they are synced from your Amazon Advertising account.
            </div>
          </div>
        ) : (
          <div style={{ borderRadius: "8px", overflow: "hidden", border: `1px solid ${T.border}` }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Campaign Name</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Budget</th>
                  <th style={S.th}>Spend</th>
                  <th style={S.th}>Sales</th>
                  <th style={S.th}>ACoS</th>
                  <th style={S.th}>Impressions</th>
                  <th style={S.th}>Clicks</th>
                  <th style={S.th}>CTR</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => {
                  const acos = c.sales > 0 ? ((c.spend / c.sales) * 100).toFixed(1) : "0.0";
                  const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0.00";
                  return (
                    <tr key={c.id || i}>
                      <td style={{ ...S.td, color: T.text, fontWeight: 500 }}>{c.name || c.campaign_name || "Unnamed"}</td>
                      <td style={S.td}>
                        <span style={S.badge(c.status === "active" || c.status === "enabled" ? "green" : "red")}>
                          {(c.status || "unknown").toUpperCase()}
                        </span>
                      </td>
                      <td style={S.td}>${(c.budget || 0).toFixed(2)}</td>
                      <td style={S.td}>${(c.spend || 0).toFixed(2)}</td>
                      <td style={S.td}>${(c.sales || 0).toFixed(2)}</td>
                      <td style={{ ...S.td, color: parseFloat(acos) > 30 ? T.red : T.green }}>{acos}%</td>
                      <td style={S.td}>{(c.impressions || 0).toLocaleString()}</td>
                      <td style={S.td}>{(c.clicks || 0).toLocaleString()}</td>
                      <td style={S.td}>{ctr}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
