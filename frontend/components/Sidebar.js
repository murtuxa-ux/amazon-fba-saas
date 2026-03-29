import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

const Sidebar = () => {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState('');

  // Initialize state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar_collapsed');
    if (savedCollapsed !== null) {
      setCollapsed(JSON.parse(savedCollapsed));
    }

    const savedExpanded = localStorage.getItem('sidebar_expanded_sections');
    if (savedExpanded) {
      try {
        setExpandedSections(JSON.parse(savedExpanded));
      } catch (e) {
        // Default: all sections expanded
        setExpandedSections({
          Main: true,
          Operations: true,
          'AI Modules': true,
          Tools: true,
          Admin: true,
          Config: true,
        });
      }
    } else {
      setExpandedSections({
        Main: true,
        Operations: true,
        'AI Modules': true,
        Tools: true,
        Admin: true,
        Config: true,
      });
    }

    // Get user info
    const userStr = localStorage.getItem('ecomera_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.name || user.username || 'User');
        setUserRole(user.role || '');
      } catch (e) {
        setUserName('User');
      }
    }
  }, []);

  // Save collapsed state
  const handleToggleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    localStorage.setItem('sidebar_collapsed', JSON.stringify(newCollapsed));
  };

  // Toggle section expansion
  const toggleSection = (sectionName) => {
    const newExpanded = {
      ...expandedSections,
      [sectionName]: !expandedSections[sectionName],
    };
    setExpandedSections(newExpanded);
    localStorage.setItem('sidebar_expanded_sections', JSON.stringify(newExpanded));
  };

  // Handle sign out
  const handleSignOut = () => {
    localStorage.removeItem('ecomera_user');
    localStorage.removeItem('sidebar_collapsed');
    localStorage.removeItem('sidebar_expanded_sections');
    router.push('/login');
  };

  // Check if link is active
  const isActive = (href) => router.pathname === href;

  // Navigation structure
  const navSections = [
    {
      name: 'Main',
      items: [
        { label: 'Dashboard', href: '/', icon: '📊' },
        { label: 'FBA Scout', href: '/scout', icon: '🔍' },
        { label: 'Clients', href: '/clients', icon: '👥' },
        { label: 'Reports', href: '/reports', icon: '📈' },
        { label: 'KPI Scorecard', href: '/kpi', icon: '🎯' },
        { label: 'Leaderboard', href: '/leaderboard', icon: '🏆' },
      ],
    },
    {
      name: 'Operations',
      items: [
        { label: 'DWM Reports', href: '/dwm', icon: '📋' },
        { label: 'Weekly Report', href: '/weekly', icon: '📅' },
        { label: 'Suppliers', href: '/suppliers', icon: '🏭' },
        { label: 'Analyze ASIN', href: '/analyze', icon: '🔬' },
        { label: 'Products', href: '/products', icon: '📦' },
        { label: 'PPC Action Plan', href: '/ppc', icon: '💰' },
        { label: 'PPC Advanced', href: '/ppc-advanced', icon: '⚙️' },
        { label: 'Inventory', href: '/inventory', icon: '📊' },
        { label: 'Wholesale Hub', href: '/wholesale', icon: '🛒' },
        { label: 'Private Label', href: '/private-label', icon: '🏷️' },
      ],
    },
    {
      name: 'AI Modules',
      items: [
        { label: 'AI Picks', href: '/recommendations', icon: '✨' },
        { label: 'Market Intel', href: '/market', icon: '🌍' },
        { label: 'Competitors', href: '/competitors', icon: '⚔️' },
        { label: 'AI Tools', href: '/ai-tools', icon: '🤖' },
        { label: 'Team', href: '/team', icon: '👨‍💼' },
      ],
    },
    {
      name: 'Tools',
      items: [
        { label: 'Workflow', href: '/workflow', icon: '⚡' },
        { label: 'Client Portal', href: '/client-portal', icon: '🌐' },
        { label: 'Finance & P&L', href: '/finance', icon: '💵' },
        { label: 'Reporting', href: '/reporting', icon: '📑' },
        { label: 'Notifications', href: '/notifications_page', icon: '🔔' },
        { label: 'Exports', href: '/exports', icon: '📥' },
        { label: 'Audit Log', href: '/audit', icon: '📝' },
      ],
    },
    {
      name: 'Admin',
      items: [
        { label: 'Admin Panel', href: '/admin', icon: '🔐' },
      ],
    },
    {
      name: 'Config',
      items: [
        { label: 'Settings', href: '/settings', icon: '⚙️' },
        { label: 'Amazon API', href: '/amazon-settings', icon: '🔗' },
        { label: 'Account Health', href: '/account-health', icon: '❤️' },
      ],
    },
  ];

  const sidebarWidth = collapsed ? '60px' : '250px';
  const sidebarStyle = {
    position: 'fixed',
    top: '0',
    left: '0',
    width: sidebarWidth,
    height: '100vh',
    backgroundColor: '#111111',
    borderRight: '1px solid #1E1E1E',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.3s ease',
    zIndex: 998,
    overflowY: 'auto',
    overflowX: 'hidden',
  };

  const headerStyle = {
    padding: collapsed ? '16px 10px' : '16px 20px',
    borderBottom: '1px solid #1E1E1E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    minHeight: '70px',
  };

  const logoContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    overflow: 'hidden',
    flex: 1,
  };

  const logoImgStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '4px',
  };

  const logoTextStyle = {
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    opacity: collapsed ? 0 : 1,
    transition: 'opacity 0.3s ease',
  };

  const toggleButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#AAAAAA',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease',
  };

  const navContainerStyle = {
    flex: 1,
    overflowY: 'auto',
    paddingTop: '10px',
    paddingBottom: '10px',
  };

  const sectionStyle = {
    marginBottom: '10px',
  };

  const sectionHeaderStyle = {
    padding: collapsed ? '8px 10px' : '8px 20px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'color 0.2s ease',
    userSelect: 'none',
  };

  const sectionHeaderHoverStyle = {
    color: '#AAAAAA',
  };

  const itemsContainerStyle = {
    display: expandedSections[navSections[0]?.name] !== false ? 'block' : 'none',
    maxHeight: expandedSections[navSections[0]?.name] !== false ? '1000px' : '0',
    transition: 'max-height 0.3s ease',
  };

  const navItemStyle = {
    padding: collapsed ? '10px 10px' : '10px 20px',
    margin: '2px 0',
    color: '#AAAAAA',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s ease',
    borderLeft: '3px solid transparent',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const navIconStyle = {
    minWidth: '20px',
    fontSize: '16px',
  };

  const navLabelStyle = {
    opacity: collapsed ? 0 : 1,
    transition: 'opacity 0.3s ease',
    whiteSpace: 'nowrap',
  };

  const userSectionStyle = {
    borderTop: '1px solid #1E1E1E',
    padding: collapsed ? '12px 10px' : '16px 20px',
    backgroundColor: '#0A0A0A',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const userInfoStyle = {
    opacity: collapsed ? 0 : 1,
    transition: 'opacity 0.3s ease',
  };

  const userNameStyle = {
    color: '#FFFFFF',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '4px',
  };

  const userRoleStyle = {
    color: '#666666',
    fontSize: '11px',
    display: 'inline-block',
    padding: '2px 6px',
    backgroundColor: '#1E1E1E',
    borderRadius: '3px',
    marginBottom: '8px',
  };

  const signOutButtonStyle = {
    backgroundColor: '#FFD700',
    color: '#0A0A0A',
    border: 'none',
    padding: collapsed ? '6px 8px' : '8px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: collapsed ? 'auto' : '100%',
  };

  const versionStyle = {
    borderTop: '1px solid #1E1E1E',
    padding: collapsed ? '8px 10px' : '10px 20px',
    fontSize: '10px',
    color: '#444444',
    textAlign: 'center',
    opacity: collapsed ? 0 : 1,
    transition: 'opacity 0.3s ease',
  };

  const hamburgerButtonStyle = {
    position: 'fixed',
    top: '16px',
    left: '16px',
    width: '44px',
    height: '44px',
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#AAAAAA',
    fontSize: '20px',
    cursor: 'pointer',
    zIndex: 1000,
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const mobileOverlayStyle = {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 997,
    display: 'none',
  };

  const mobileSidebarStyle = {
    ...sidebarStyle,
    width: '250px',
    transform: 'translateX(0)',
  };

  // Render a nav item
  const renderNavItem = (item) => {
    const active = isActive(item.href);
    const itemStyleActive = {
      ...navItemStyle,
      borderLeftColor: active ? '#FFD700' : 'transparent',
      color: active ? '#FFFFFF' : '#AAAAAA',
      backgroundColor: active ? 'rgba(255, 215, 0, 0.05)' : 'transparent',
    };

    return (
      <div
        key={item.href}
        onClick={() => {
          router.push(item.href);
          setMobileOpen(false);
        }}
        style={itemStyleActive}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.color = '#FFFFFF';
            e.currentTarget.style.backgroundColor = 'rgba(170, 170, 170, 0.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.color = '#AAAAAA';
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        title={collapsed ? item.label : ''}
      >
        <span style={navIconStyle}>{item.icon}</span>
        <span style={navLabelStyle}>{item.label}</span>
      </div>
    );
  };

  // Render a section
  const renderSection = (section) => {
    const isExpanded = expandedSections[section.name] !== false;

    return (
      <div key={section.name} style={sectionStyle}>
        <div
          style={sectionHeaderStyle}
          onClick={() => toggleSection(section.name)}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#AAAAAA';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#666666';
          }}
          title={collapsed ? section.name : ''}
        >
          <span style={{ opacity: collapsed ? 0 : 1, flex: 1 }}>
            {section.name}
          </span>
          {!collapsed && (
            <span style={{ fontSize: '10px' }}>
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
        </div>
        {isExpanded && (
          <div>
            {section.items.map((item) => renderNavItem(item))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          #sidebar-hamburger {
            display: flex !important;
          }
          #sidebar-mobile-overlay {
            display: block !important;
          }
          #sidebar-main {
            position: fixed !important;
            width: 250px !important;
            height: 100vh !important;
            transform: translateX(-100%) !important;
            transition: transform 0.3s ease !important;
            z-index: 999 !important;
          }
          #sidebar-main.mobile-open {
            transform: translateX(0) !important;
          }
        }
      `}</style>

      <div
        id="sidebar-hamburger"
        style={hamburgerButtonStyle}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? '✕' : '☰'}
      </div>

      <div
        id="sidebar-mobile-overlay"
        style={mobileOverlayStyle}
        onClick={() => setMobileOpen(false)}
      />

      <div
        id="sidebar-main"
        style={sidebarStyle}
        className={mobileOpen ? 'mobile-open' : ''}
      >
        {/* Header with Logo and Toggle */}
        <div style={headerStyle}>
          <div style={logoContainerStyle}>
            <img
              src="/logo.png"
              alt="Ecom Era"
              style={logoImgStyle}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <span style={logoTextStyle}>Ecom Era</span>
          </div>
          <button
            style={toggleButtonStyle}
            onClick={handleToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#AAAAAA';
            }}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        {/* Navigation */}
        <div style={navContainerStyle}>
          {navSections.map((section) => renderSection(section))}
        </div>

        {/* User Section */}
        <div style={userSectionStyle}>
          <div style={userInfoStyle}>
            <div style={userNameStyle}>{userName}</div>
            {userRole && <div style={userRoleStyle}>{userRole}</div>}
          </div>
          <button
            style={signOutButtonStyle}
            onClick={handleSignOut}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FFC700';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFD700';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Sign out"
          >
            {collapsed ? '⌛' : 'Sign Out'}
          </button>
        </div>

        {/* Version Footer */}
        <div style={versionStyle}>v6.0 · Ecom Era FBA SaaS</div>
      </div>
    </>
  );
};

export default Sidebar;
