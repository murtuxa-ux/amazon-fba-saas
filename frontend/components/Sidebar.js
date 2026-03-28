import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

const T = {
  bg: "#0A0A0A",
  card: "#111111",
  border: "#1E1E1E",
  borderLight: "#2A2A2A",
  yellow: "#FFD700",
  yellowDim: "rgba(255,215,0,0.12)",
  text: "#FFFFFF",
  textSec: "#888888",
  textMut: "#555555",
};

const SECTIONS = [
  {
    key: "main",
    label: "Main",
    items: [
      { href: "/", label: "Dashboard", icon: "\u25a6" },
      { href: "/scout", label: "FBA Scout", icon: "\u25c9" },
      { href: "/clients", label: "Clients", icon: "\u25c8" },
      { href: "/reports", label: "Reports", icon: "\u25a4" },
      { href: "/kpi", label: "KPI Scorecard", icon: "\u25c6" },
      { href: "/leaderboard", label: "Leaderboard", icon: "\u25b2" },
    ],
  },
  {
    key: "ops",
    label: "Operations",
    items: [
      { href: "/products", label: "Products", icon: "\u25a3" },
      { href: "/purchase-orders", label: "Purchase Orders", icon: "\u25a9" },
      { href: "/dwm", label: "DWM Reports", icon: "\u25a8" },
      { href: "/weekly", label: "Weekly Report", icon: "\u25f7" },
      { href: "/suppliers", label: "Suppliers", icon: "\u25d1" },
      { href: "/analyze", label: "Analyze ASIN", icon: "\u25ce" },
    ],
  },
  {
    key: "wholesale",
    label: "Wholesale",
    items: [
      { href: "/profit-calculator", label: "Profit Calculator", icon: "\u25c8" },
      { href: "/buybox", label: "Buy Box Tracker", icon: "\u25c9" },
      { href: "/brand-approvals", label: "Brand Approvals", icon: "\u25c6" },
      { href: "/ppc", label: "PPC Manager", icon: "\u25c7" },
      { href: "/account-health", label: "Account Health", icon: "\u2665" },
    ],
  },
  {
    key: "fulfillment",
    label: "Fulfillment",
    items: [
      { href: "/fba-shipments", label: "FBA Shipments", icon: "\u25a3" },
      { href: "/fbm-orders", label: "FBM Orders", icon: "\u25a4" },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    items: [
      { href: "/client-pnl", label: "Client P&L", icon: "\u25b0" },
    ],
  },
  {
    key: "ai",
    label: "AI Modules",
    items: [
      { href: "/intelligence", label: "Intelligence", icon: "\u2726" },
      { href: "/recommendations", label: "AI Picks", icon: "\u2605" },
      { href: "/market", label: "Market Intel", icon: "\u25b6" },
      { href: "/competitors", label: "Competitors", icon: "\u25c7" },
    ],
  },
  {
    key: "team",
    label: "Team",
    items: [
      { href: "/team", label: "Team", icon: "\u25cb" },
    ],
  },
  {
    key: "tools",
    label: "Tools",
    items: [
      { href: "/automations", label: "Automations", icon: "\u2699" },
      { href: "/notifications_page", label: "Notifications", icon: "\u25c0" },
      { href: "/exports", label: "Exports", icon: "\u25a5" },
      { href: "/audit", label: "Audit Log", icon: "\u25a1" },
    ],
  },
  {
    key: "admin",
    label: "Admin",
    items: [
      { href: "/portal-admin", label: "Client Portal", icon: "\u25c4" },
      { href: "/admin", label: "Admin Panel", icon: "\u2630" },
      { href: "/user-management", label: "User Management", icon: "\u25ce" },
      { href: "/client-portal-manage", label: "Portal Access", icon: "\u25d0" },
    ],
  },
  {
    key: "config",
    label: "Config",
    items: [
      { href: "/settings", label: "Settings", icon: "\u25cc" },
    ],
  },
];

export default function Sidebar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href) => {
    if (href === "/") return router.pathname === "/";
    return router.pathname.startsWith(href);
  };

  const S = {
    aside: {
      width: collapsed ? "60px" : "220px",
      minHeight: "100vh",
      backgroundColor: T.card,
      borderRight: `1px solid ${T.border}`,
      display: "flex",
      flexDirection: "column",
      transition: "width 0.2s",
      overflow: "hidden",
      flexShrink: 0,
    },
    logo: {
      padding: collapsed ? "16px 8px" : "16px 20px",
      borderBottom: `1px solid ${T.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: "56px",
    },
    logoText: {
      fontSize: "14px",
      fontWeight: 700,
      color: T.text,
      whiteSpace: "nowrap",
    },
    toggleBtn: {
      background: "none",
      border: "none",
      color: T.textSec,
      cursor: "pointer",
      fontSize: "16px",
      padding: "4px",
    },
    nav: {
      flex: 1,
      overflowY: "auto",
      padding: "8px 0",
    },
    sectionLabel: {
      fontSize: "10px",
      fontWeight: 700,
      color: T.textMut,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      padding: collapsed ? "12px 8px 4px" : "12px 20px 4px",
      whiteSpace: "nowrap",
    },
    link: (active) => ({
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: collapsed ? "8px 8px" : "8px 20px",
      fontSize: "13px",
      fontWeight: active ? 600 : 400,
      color: active ? T.yellow : T.textSec,
      backgroundColor: active ? T.yellowDim : "transparent",
      textDecoration: "none",
      borderRadius: "0",
      cursor: "pointer",
      transition: "background 0.15s, color 0.15s",
      whiteSpace: "nowrap",
    }),
    icon: {
      fontSize: "14px",
      width: "20px",
      textAlign: "center",
      flexShrink: 0,
    },
    userArea: {
      borderTop: `1px solid ${T.border}`,
      padding: collapsed ? "12px 8px" : "12px 20px",
    },
    userName: {
      fontSize: "13px",
      fontWeight: 600,
      color: T.text,
      marginBottom: "2px",
    },
    userRole: {
      fontSize: "11px",
      color: T.textMut,
    },
    logoutBtn: {
      marginTop: "8px",
      background: "none",
      border: "none",
      color: T.textSec,
      cursor: "pointer",
      fontSize: "12px",
      padding: "4px 0",
    },
    version: {
      fontSize: "10px",
      color: T.textMut,
      padding: collapsed ? "8px 8px" : "8px 20px",
      borderTop: `1px solid ${T.border}`,
    },
  };

  return (
    <aside style={S.aside}>
      {/* Logo */}
      <div style={S.logo}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img
              src="/logo.png"
              alt="Ecom Era"
              style={{ height: "24px", objectFit: "contain" }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <span style={S.logoText}>Ecom Era</span>
          </div>
        )}
        <button
          style={S.toggleBtn}
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "\u25b6" : "\u25c0"}
        </button>
      </div>

      {/* Navigation */}
      <nav style={S.nav}>
        {SECTIONS.map((section) => (
          <div key={section.key}>
            {!collapsed && <div style={S.sectionLabel}>{section.label}</div>}
            {section.items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={S.link(isActive(item.href))}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(item.href);
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.href)) {
                    e.currentTarget.style.color = T.text;
                    e.currentTarget.style.backgroundColor = T.border;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.href)) {
                    e.currentTarget.style.color = T.textSec;
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <span style={S.icon}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </a>
            ))}
          </div>
        ))}
      </nav>

      {/* User Area */}
      {user && (
        <div style={S.userArea}>
          {!collapsed && (
            <>
              <div style={S.userName}>{user.name || user.username}</div>
              <div style={S.userRole}>{user.role}</div>
            </>
          )}
          <button
            style={S.logoutBtn}
            onClick={logout}
            onMouseEnter={(e) => (e.target.style.color = "#EF4444")}
            onMouseLeave={(e) => (e.target.style.color = T.textSec)}
          >
            {collapsed ? "\u23fb" : "\u23fb Sign out"}
          </button>
        </div>
      )}

      {/* Version */}
      {!collapsed && <div style={S.version}>v7.0 &middot; Ecom Era FBA SaaS</div>}
    </aside>
  );
}
