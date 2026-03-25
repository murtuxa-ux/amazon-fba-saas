import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";

const NAV = [
  { href: "/",           label: "Dashboard",     icon: "▦",  section: "main" },
  { href: "/scout",      label: "FBA Scout",     icon: "◉",  section: "main" },
  { href: "/clients",    label: "Clients",       icon: "◈",  section: "main" },
  { href: "/reports",    label: "Reports",       icon: "▤",  section: "main" },
  { href: "/kpi",        label: "KPI Scorecard", icon: "◆",  section: "main" },
  { href: "/leaderboard",label: "Leaderboard",   icon: "▲",  section: "main" },
  { href: "/weekly",     label: "Weekly Report", icon: "◷",  section: "ops"  },
  { href: "/suppliers",  label: "Suppliers",     icon: "◑",  section: "ops"  },
  { href: "/analyze",    label: "Analyze ASIN",  icon: "◎",  section: "ops"  },
  { href: "/products",   label: "Products",      icon: "▣",  section: "ops"  },
  { href: "/settings",   label: "Settings",      icon: "◌",  section: "config"},
];

export default function Sidebar() {
  const router   = useRouter();
  const [user, setUser]         = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ecomera_user");
      if (stored) setUser(JSON.parse(stored));
    } catch (_) {}
  }, []);

  function handleLogout() {
    const token = localStorage.getItem("ecomera_token");
    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app"}/auth/logout`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    localStorage.removeItem("ecomera_token");
    localStorage.removeItem("ecomera_user");
    router.replace("/login");
  }

  const main   = NAV.filter(n => n.section === "main");
  const ops    = NAV.filter(n => n.section === "ops");
  const config = NAV.filter(n => n.section === "config");

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
    navSection: { padding: collapsed ? "0.75rem 0.5rem 0.25rem" : "0.75rem 0.75rem 0.25rem" },
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
      <Link href={href} style={S.link(active)}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#1A1A1A"; e.currentTarget.style.color = "#DDD"; }}}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#777"; }}}
      >
        <span style={S.icon(active)}>{icon}</span>
        {!collapsed && label}
      </Link>
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
        {collapsed ? "▶" : "◀"}
      </button>

      {/* Nav content */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: "0.5rem" }}>
        {/* Main section */}
        <div style={S.navSection}>
          <div style={S.sectionLabel}>Main</div>
          {main.map(n => <NavLink key={n.href} {...n} />)}
        </div>

        {/* Operations section */}
        <div style={S.navSection}>
          <div style={S.sectionLabel}>Operations</div>
          {ops.map(n => <NavLink key={n.href} {...n} />)}
        </div>

        {/* Config section */}
        <div style={S.navSection}>
          <div style={S.sectionLabel}>Config</div>
          {config.map(n => <NavLink key={n.href} {...n} />)}
        </div>
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
            ⎋ Sign out
          </button>
        </div>
      )}

      {/* Version */}
      {!collapsed && (
        <div style={{ padding: "0.5rem 1rem 0.75rem", fontSize: "0.65rem", color: "#2A2A2A" }}>
          v5.0 · Ecom Era FBA SaaS
        </div>
      )}
    </aside>
  );
}
