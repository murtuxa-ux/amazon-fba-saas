import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { href: "/",            label: "Dashboard",     icon: "\u25A6", section: "main" },
  { href: "/scout",       label: "FBA Scout",     icon: "\u25C9", section: "main" },
  { href: "/clients",     label: "Clients",       icon: "\u25C8", section: "main" },
  { href: "/reports",     label: "Reports",       icon: "\u25A4", section: "main" },
  { href: "/kpi",         label: "KPI Scorecard", icon: "\u25C6", section: "main" },
  { href: "/leaderboard", label: "Leaderboard",   icon: "\u25B2", section: "main" },
  { href: "/products",         label: "Products",        icon: "\u25A3", section: "ops"  },
  { href: "/purchase-orders",  label: "Purchase Orders",  icon: "\u25A9", section: "ops"  },
  { href: "/dwm",              label: "DWM Reports",      icon: "\u25A8", section: "ops"  },
  { href: "/weekly",           label: "Weekly Report",    icon: "\u25F7", section: "ops"  },
  { href: "/suppliers",        label: "Suppliers",        icon: "\u25D1", section: "ops"  },
  { href: "/analyze",          label: "Analyze ASIN",     icon: "\u25CE", section: "ops"  },
  { href: "/client-pnl",       label: "Client P&L",       icon: "\u25B0", section: "finance" },
  { href: "/intelligence",     label: "Intelligence",     icon: "\u2726", section: "ai"  },
  { href: "/recommendations",  label: "AI Picks",         icon: "\u2605", section: "ai"  },
  { href: "/market",           label: "Market Intel",     icon: "\u25B6", section: "ai"  },
  { href: "/competitors",      label: "Competitors",      icon: "\u25C7", section: "ai"  },
  { href: "/team",             label: "Team",             icon: "\u25CB", section: "team" },
  { href: "/automations",      label: "Automations",      icon: "\u2699", section: "tools" },
  { href: "/notifications_page", label: "Notifications", icon: "\u25C0", section: "tools" },
  { href: "/exports",            label: "Exports",       icon: "\u25A5", section: "tools" },
  { href: "/audit",              label: "Audit Log",     icon: "\u25A1", section: "tools" },
  { href: "/portal-admin",     label: "Client Portal",    icon: "\u25C4", section: "admin" },
  { href: "/admin",            label: "Admin Panel",      icon: "\u2630", section: "admin" },
  { href: "/settings",         label: "Settings",         icon: "\u25CC", section: "config" },
];

export default function Sidebar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  function handleLogout() {
    logout();
  }

  const main    = NAV.filter(n => n.section === "main");
  const ops     = NAV.filter(n => n.section === "ops");
  const finance = NAV.filter(n => n.section === "finance");
  const ai      = NAV.filter(n => n.section === "ai");
  const team    = NAV.filter(n => n.section === "team");
  const tools   = NAV.filter(n => n.section === "tools");
  const admin   = NAV.filter(n => n.section === "admin");
  const config  = NAV.filter(n => n.section === "config");

  const S = {
    aside: {
      width: collapsed ? "64px" : "220px",
      minHeight: "100vh",
      background: "#0F0F0F",
      borderRight: "1px solid #1E1E1E",
      display: "flex",
      flexDirection: "column",
      transition: "width 0.2s ease",
      position: "relative",
      flexShrink: 0,
    },
    logoArea: {
      padding: collapsed ? "1.25rem 0.75rem" : "1.25rem 1.25rem",
      borderBottom: "1px solid #1E1E1E",
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
    },
    logoImg: { height: "28px", objectFit: "contain", flexShrink: 0 },
    collapseBtn: {
      position: "absolute",
      top: "1.1rem",
      right: "-12px",
      width: "24px",
      height: "24px",
      background: "#1E1E1E",
      border: "1px solid #2A2A2A",
      borderRadius: "50%",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "0.6rem",
      color: "#666",
      zIndex: 10,
    },
    navSection: {
      padding: collapsed ? "0.75rem 0.5rem 0.25rem" : "0.75rem 0.75rem 0.25rem",
    },
    sectionLabel: {
      fontSize: "0.6rem",
      fontWeight: 700,
      color: "#444",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      marginBottom: "0.4rem",
      paddingLeft: collapsed ? "0" : "0.5rem",
      display: collapsed ? "none" : "block",
    },
    link: (active) => ({
      display: "flex",
      alignItems: "center",
      gap: "0.65rem",
      padding: collapsed ? "0.6rem 0.75rem" : "0.55rem 0.75rem",
      borderRadius: "8px",
      marginBottom: "2px",
      textDecoration: "none",
      background: active ? "#FFD700" : "transparent",
      color: active ? "#000000" : "#777",
      fontWeight: active ? 700 : 400,
      fontSize: "0.83rem",
      transition: "all 0.15s",
      cursor: "pointer",
      justifyContent: collapsed ? "center" : "flex-start",
      position: "relative",
    }),
    icon: (active) => ({
      fontSize: "0.9rem",
      color: active ? "#000" : "#555",
      flexShrink: 0,
    }),
    userArea: {
      marginTop: "auto",
      borderTop: "1px solid #1E1E1E",
      padding: collapsed ? "0.75rem 0.5rem" : "0.75rem 1rem",
    },
    avatar: {
      width: "32px",
      height: "32px",
      background: "#FFD700",
      color: "#000",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      fontSize: "0.85rem",
      flexShrink: 0,
    },
    userName: { fontSize: "0.8rem", fontWeight: 600, color: "#DDD", lineHeight: 1.2 },
    userRole: { fontSize: "0.68rem", color: "#555", textTransform: "capitalize" },
    logoutBtn: {
      background: "none",
      border: "none",
      color: "#444",
      fontSize: "0.75rem",
      cursor: "pointer",
      padding: "0.4rem 0",
      marginTop: "0.5rem",
      textAlign: "left",
      width: "100%",
      display: collapsed ? "none" : "block",
    },
  };

  function NavLink({ href, label, icon }) {
    const active = router.pathname === href;
    return (
      <Link
        href={href}
        style={S.link(active)}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = "#1A1A1A";
            e.currentTarget.style.color = "#DDD";
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#777";
          }
        }}
      >
        <span style={S.icon(active)}>{icon}</span>
        {!collapsed && label}
      </Link>
    );
  }

  function Section({ label, items }) {
    if (!items || items.length === 0) return null;
    return (
      <div style={S.navSection}>
        <div style={S.sectionLabel}>{label}</div>
        {items.map(n => <NavLink key={n.href} {...n} />)}
      </div>
    );
  }

  return (
    <aside style={S.aside}>
      {/* Logo */}
      <div style={S.logoArea}>
        <img src="/logo.png" alt="Ecom Era" style={S.logoImg} />
      </div>

      {/* Collapse toggle */}
      <button style={S.collapseBtn} onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? "\u25B6" : "\u25C0"}
      </button>

      {/* Nav content */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: "0.5rem" }}>
        <Section label="Main" items={main} />
        <Section label="Operations" items={ops} />
        <Section label="Finance" items={finance} />
        <Section label="AI Modules" items={ai} />
        <Section label="Team" items={team} />
        <Section label="Tools" items={tools} />

        {/* Admin section — only show for owner/admin */}
        {user && (user.role === "owner" || user.role === "admin") && (
          <Section label="Admin" items={admin} />
        )}

        <Section label="Config" items={config} />
      </div>

      {/* User area */}
      {user && (
        <div style={S.userArea}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={S.avatar}>{user.avatar || user.name?.[0] || "U"}</div>
            {!collapsed && (
              <div>
                <div style={S.userName}>{user.name}</div>
                <div style={S.userRole}>{user.role?.replace("_", " ")}</div>
              </div>
            )}
          </div>
          <button style={S.logoutBtn} onClick={handleLogout}>
            {"\u238B"} Sign out
          </button>
        </div>
      )}

      {/* Version */}
      {!collapsed && (
        <div style={{ padding: "0.5rem 1rem 0.75rem", fontSize: "0.65rem", color: "#2A2A2A" }}>
          v7.0 &middot; Ecom Era FBA SaaS
        </div>
      )}
    </aside>
  );
}
