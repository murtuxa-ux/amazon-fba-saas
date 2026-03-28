'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, LogOut, Settings, Menu, X } from 'lucide-react';

/**
 * Sidebar Component v8.0
 * Amazon Wholesale SaaS Application
 * Updated with new Wholesale and Fulfillment sections
 */

const Sidebar = ({ user, onLogout }) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    ops: true,
    wholesale: true,
    fulfillment: true,
    finance: false,
    ai: false,
    team: false,
    tools: false,
    admin: false,
    config: false,
  });

  // Navigation items with new sections
  const NAV = [
    // Main Section
    { href: "/", label: "Dashboard", icon: "▦", section: "main" },
    { href: "/scout", label: "FBA Scout", icon: "◉", section: "main" },
    { href: "/clients", label: "Clients", icon: "◈", section: "main" },
    { href: "/reports", label: "Reports", icon: "▤", section: "main" },
    { href: "/kpi", label: "KPI Scorecard", icon: "◆", section: "main" },
    { href: "/leaderboard", label: "Leaderboard", icon: "▲", section: "main" },

    // Operations Section
    { href: "/products", label: "Products", icon: "▣", section: "ops" },
    { href: "/purchase-orders", label: "Purchase Orders", icon: "▩", section: "ops" },
    { href: "/dwm", label: "DWM Reports", icon: "▨", section: "ops" },
    { href: "/weekly", label: "Weekly Report", icon: "◷", section: "ops" },
    { href: "/suppliers", label: "Suppliers", icon: "◑", section: "ops" },
    { href: "/analyze", label: "Analyze ASIN", icon: "◎", section: "ops" },

    // Wholesale Section (NEW)
    { href: "/profit-calculator", label: "Profit Calculator", icon: "◈", section: "wholesale" },
    { href: "/buybox", label: "Buy Box Tracker", icon: "◉", section: "wholesale" },
    { href: "/brand-approvals", label: "Brand Approvals", icon: "◆", section: "wholesale" },
    { href: "/ppc", label: "PPC Manager", icon: "◇", section: "wholesale" },
    { href: "/account-health", label: "Account Health", icon: "♥", section: "wholesale" },

    // Fulfillment Section (NEW)
    { href: "/fba-shipments", label: "FBA Shipments", icon: "▣", section: "fulfillment" },
    { href: "/fbm-orders", label: "FBM Orders", icon: "▤", section: "fulfillment" },

    // Finance Section
    { href: "/client-pnl", label: "Client P&L", icon: "▰", section: "finance" },

    // AI Modules Section
    { href: "/intelligence", label: "Intelligence", icon: "✦", section: "ai" },
    { href: "/recommendations", label: "AI Picks", icon: "★", section: "ai" },
    { href: "/market", label: "Market Intel", icon: "▶", section: "ai" },
    { href: "/competitors", label: "Competitors", icon: "◇", section: "ai" },

    // Team Section
    { href: "/team", label: "Team", icon: "○", section: "team" },

    // Tools Section
    { href: "/automations", label: "Automations", icon: "⚙", section: "tools" },
    { href: "/notifications_page", label: "Notifications", icon: "◀", section: "tools" },
    { href: "/exports", label: "Exports", icon: "▥", section: "tools" },
    { href: "/audit", label: "Audit Log", icon: "□", section: "tools" },

    // Admin Section (with new items)
    { href: "/portal-admin", label: "Client Portal", icon: "◄", section: "admin" },
    { href: "/admin", label: "Admin Panel", icon: "☰", section: "admin" },
    { href: "/user-management", label: "User Management", icon: "◎", section: "admin" },
    { href: "/client-portal-manage", label: "Portal Access", icon: "◐", section: "admin" },

    // Config Section
    { href: "/settings", label: "Settings", icon: "◌", section: "config" },
  ];

  // Section display names
  const SECTION_LABELS = {
    main: "Main",
    ops: "Operations",
    wholesale: "Wholesale",
    fulfillment: "Fulfillment",
    finance: "Finance",
    ai: "AI Modules",
    team: "Team",
    tools: "Tools",
    admin: "Admin",
    config: "Configuration",
  };

  // Section order for rendering
  const SECTION_ORDER = ["main", "ops", "wholesale", "fulfillment", "finance", "ai", "team", "tools", "admin", "config"];

  // Group navigation items by section
  const groupedNav = SECTION_ORDER.reduce((acc, section) => {
    acc[section] = NAV.filter((item) => item.section === section);
    return acc;
  }, {});

  // Check if a route is active
  const isActive = (href) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Handle mobile menu close on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Container */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 transition-all duration-300 z-40 flex flex-col ${
          collapsed ? "w-20" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            {!collapsed && <h1 className="text-lg font-bold text-gray-900">Wholesale</h1>}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors hidden lg:block"
              title={collapsed ? "Expand" : "Collapse"}
            >
              <ChevronDown
                size={18}
                className={`text-gray-600 transition-transform ${collapsed ? "-rotate-90" : "rotate-90"}`}
              />
            </button>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {SECTION_ORDER.map((section) => {
            const items = groupedNav[section];
            if (!items || items.length === 0) return null;

            return (
              <div key={section} className="mb-4">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                >
                  {!collapsed && <span>{SECTION_LABELS[section]}</span>}
                  {!collapsed && (
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${expandedSections[section] ? "rotate-180" : ""}`}
                    />
                  )}
                </button>

                {/* Section Items */}
                {(expandedSections[section] || collapsed) && (
                  <div className="space-y-1">
                    {items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                          isActive(item.href)
                            ? "bg-blue-50 text-blue-600 border border-blue-200 shadow-sm"
                            : "text-gray-700 hover:bg-gray-200 border border-transparent"
                        }`}
                        title={collapsed ? item.label : ""}
                      >
                        <span className="text-lg flex-shrink-0">{item.icon}</span>
                        {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Area */}
        <div className="border-t border-gray-200 p-3 bg-white space-y-2">
          {!collapsed && (
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">User</p>
              {user && (
                <div className="mt-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name || "User"}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email || "user@example.com"}</p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => {
              const settingsLink = document.createElement('a');
              settingsLink.href = '/settings';
              settingsLink.click();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;

