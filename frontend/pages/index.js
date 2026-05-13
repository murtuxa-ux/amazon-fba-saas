import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';

const Dashboard = () => {
  const router = useRouter();
  const [user, setUser] = useState({ name: 'User' });
  const [loading, setLoading] = useState(true);

  // KPI State
  const [kpiData, setKpiData] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    avgROI: 0,
    activeClients: 0,
    productsHunted: 0,
    teamMembers: 0,
  });
  const [kpiLoading, setKpiLoading] = useState(true);

  // Trend Chart State — fetched from /client-pnl/trends (see fetchTrends below).
  // Renders empty (placeholder) until the fetch resolves; chart hides itself
  // when the trend has zero data points.
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);

  // Products by Status State
  const [statusData, setStatusData] = useState([]);
  const [statusLoading, setStatusLoading] = useState(true);

  // Activity Feed State
  const [activityFeed, setActivityFeed] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Top Products State
  const [topProducts, setTopProducts] = useState([]);
  const [topProductsLoading, setTopProductsLoading] = useState(true);

  const API_BASE = 'https://amazon-fba-saas-production.up.railway.app';

  useEffect(() => {
    const initDashboard = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('ecomera_token') : null;

      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch user info (mock or from localStorage)
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      // Fetch all KPIs in parallel
      fetchKPIs(token);
      fetchStatusData(token);
      fetchActivityFeed(token);
      fetchTopProducts(token);
      fetchTrends(token);

      setLoading(false);
    };

    initDashboard();
  }, [router]);

  const fetchKPIs = async (token) => {
    setKpiLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch PnL Summary
      const pnlRes = await fetch(`${API_BASE}/client-pnl/summary`, { headers });
      const pnlData = pnlRes.ok ? await pnlRes.json() : {};

      // Fetch Clients
      const clientsRes = await fetch(`${API_BASE}/clients`, { headers });
      const clientsArray = await clientsRes.json();
      const clientsData = Array.isArray(clientsArray) ? clientsArray : [];

      // Fetch Products
      const productsRes = await fetch(`${API_BASE}/products-pipeline`, { headers });
      const productsArray = await productsRes.json();
      const productsData = Array.isArray(productsArray) ? productsArray : [];

      // Fetch Users
      const usersRes = await fetch(`${API_BASE}/users`, { headers });
      const usersArray = await usersRes.json();
      const usersData = Array.isArray(usersArray) ? usersArray : [];

      // Calculate ROI average
      const rois = productsData
        .map((p) => {
          if (!p.cost || !p.sellPrice || p.cost === 0) return 0;
          return ((p.sellPrice - p.cost) / p.cost) * 100;
        })
        .filter((r) => r > 0);
      const avgROI = rois.length > 0 ? rois.reduce((a, b) => a + b, 0) / rois.length : 0;

      setKpiData({
        totalRevenue: pnlData.totalRevenue || 0,
        totalProfit: pnlData.totalProfit || 0,
        avgROI: avgROI,
        activeClients: clientsData.length,
        productsHunted: productsData.length,
        teamMembers: usersData.length,
      });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      setKpiData({
        totalRevenue: 0,
        totalProfit: 0,
        avgROI: 0,
        activeClients: 0,
        productsHunted: 0,
        teamMembers: 0,
      });
    } finally {
      setKpiLoading(false);
    }
  };

  const fetchStatusData = async (token) => {
    setStatusLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/products-pipeline`, { headers });
      const data = await res.json();
      const productsData = Array.isArray(data) ? data : [];

      const statusCounts = {
        Lead: 0,
        Sourced: 0,
        Approved: 0,
        Rejected: 0,
        Ordered: 0,
      };

      productsData.forEach((product) => {
        if (product.status && statusCounts.hasOwnProperty(product.status)) {
          statusCounts[product.status]++;
        }
      });

      const statusArray = [
        { label: 'Lead', count: statusCounts.Lead, color: '#FFD700' },
        { label: 'Sourced', count: statusCounts.Sourced, color: '#3B82F6' },
        { label: 'Approved', count: statusCounts.Approved, color: '#10B981' },
        { label: 'Rejected', count: statusCounts.Rejected, color: '#EF4444' },
        { label: 'Ordered', count: statusCounts.Ordered, color: '#8B5CF6' },
      ];

      setStatusData(statusArray);
    } catch (error) {
      console.error('Error fetching status data:', error);
      setStatusData([]);
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchActivityFeed = async (token) => {
    setActivityLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/api/audit-logs?limit=10`, { headers });
      const data = await res.json();
      const feedData = Array.isArray(data) ? data : [];
      setActivityFeed(feedData.slice(0, 5));
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      setActivityFeed([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchTrends = async (token) => {
    setTrendLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/client-pnl/trends`, { headers });
      const data = res.ok ? await res.json() : {};
      // Backend returns { trends: [{month: "2026-01", revenue, net_profit, ...}] }
      // (snake_to_camel in lib/api.js doesn't run on raw fetch; we handle both).
      const rawTrends = Array.isArray(data) ? data : Array.isArray(data.trends) ? data.trends : [];
      const mapped = rawTrends.map((t) => {
        // "2026-01" → "Jan 26" so the X-axis label stays compact.
        const m = String(t.month || '');
        const ymMatch = m.match(/^(\d{4})-(\d{2})/);
        let monthLabel = m;
        if (ymMatch) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const idx = parseInt(ymMatch[2], 10) - 1;
          monthLabel = monthNames[idx] || m;
        }
        return {
          month: monthLabel,
          revenue: Number(t.revenue || t.total_revenue || 0),
          profit: Number(t.net_profit || t.profit || 0),
        };
      });
      setTrendData(mapped);
    } catch (error) {
      console.error('Error fetching trends:', error);
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  const fetchTopProducts = async (token) => {
    setTopProductsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/products-pipeline`, { headers });
      const data = await res.json();
      const productsData = Array.isArray(data) ? data : [];

      const withROI = productsData
        .map((p) => ({
          ...p,
          roi: p.cost && p.sellPrice ? ((p.sellPrice - p.cost) / p.cost) * 100 : 0,
        }))
        .sort((a, b) => b.roi - a.roi)
        .slice(0, 5);

      setTopProducts(withROI);
    } catch (error) {
      console.error('Error fetching top products:', error);
      setTopProducts([]);
    } finally {
      setTopProductsLoading(false);
    }
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatROI = (num) => {
    return `${num.toFixed(1)}%`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // SVG Trend Chart Component
  const TrendChart = () => {
    const width = 600;
    const height = 300;
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Empty-state guard: with zero trend points, the math below produces
    // NaN / -Infinity and React renders a broken SVG. Show a friendly
    // "no data yet" panel until /client-pnl/trends returns rows.
    if (!Array.isArray(trendData) || trendData.length === 0) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '300px',
            color: '#888',
            fontSize: '14px',
            textAlign: 'center',
            padding: '0 24px',
          }}
        >
          {trendLoading
            ? 'Loading revenue trend…'
            : 'No P&L data yet. Trend will populate once weekly P&L statements are submitted.'}
        </div>
      );
    }

    const maxRevenue = Math.max(...trendData.map((d) => d.revenue));
    const maxProfit = Math.max(...trendData.map((d) => d.profit));
    const maxValue = Math.max(maxRevenue, maxProfit) || 1;

    const revenuePoints = trendData.map((d, i) => ({
      x: padding + (i / (trendData.length - 1)) * chartWidth,
      y: height - padding - (d.revenue / maxValue) * chartHeight,
    }));

    const profitPoints = trendData.map((d, i) => ({
      x: padding + (i / (trendData.length - 1)) * chartWidth,
      y: height - padding - (d.profit / maxValue) * chartHeight,
    }));

    const revenuePath = revenuePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const profitPath = profitPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: '100%' }}>
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={`y-${ratio}`}>
            <line
              x1={padding}
              y1={height - padding - ratio * chartHeight}
              x2={width - padding}
              y2={height - padding - ratio * chartHeight}
              stroke="#1E1E1E"
              strokeWidth="1"
            />
            <text
              x={padding - 10}
              y={height - padding - ratio * chartHeight + 4}
              textAnchor="end"
              fill="#888"
              fontSize="12"
            >
              ${(ratio * maxValue / 1000).toFixed(0)}K
            </text>
          </g>
        ))}

        {/* X-axis */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#1E1E1E" strokeWidth="2" />

        {/* Y-axis */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#1E1E1E" strokeWidth="2" />

        {/* Month labels */}
        {trendData.map((d, i) => (
          <text
            key={`month-${i}`}
            x={padding + (i / (trendData.length - 1)) * chartWidth}
            y={height - padding + 20}
            textAnchor="middle"
            fill="#888"
            fontSize="12"
          >
            {d.month}
          </text>
        ))}

        {/* Revenue line */}
        <path d={revenuePath} stroke="#FFD700" strokeWidth="2" fill="none" />

        {/* Profit line */}
        <path d={profitPath} stroke="#10B981" strokeWidth="2" fill="none" />

        {/* Revenue points */}
        {revenuePoints.map((p, i) => (
          <circle key={`rev-${i}`} cx={p.x} cy={p.y} r="4" fill="#FFD700" />
        ))}

        {/* Profit points */}
        {profitPoints.map((p, i) => (
          <circle key={`prof-${i}`} cx={p.x} cy={p.y} r="4" fill="#10B981" />
        ))}
      </svg>
    );
  };

  // SVG Donut Chart Component
  const DonutChart = ({ data }) => {
    const size = 200;
    const radius = 70;
    const innerRadius = 45;

    let currentAngle = -Math.PI / 2;
    const total = data.reduce((sum, item) => sum + item.count, 0);

    const slices = data.map((item) => {
      const sliceAngle = (item.count / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      const x1 = size + radius * Math.cos(startAngle);
      const y1 = size + radius * Math.sin(startAngle);
      const x2 = size + radius * Math.cos(endAngle);
      const y2 = size + radius * Math.sin(endAngle);

      const largeArc = sliceAngle > Math.PI ? 1 : 0;

      const ix1 = size + innerRadius * Math.cos(startAngle);
      const iy1 = size + innerRadius * Math.sin(startAngle);
      const ix2 = size + innerRadius * Math.cos(endAngle);
      const iy2 = size + innerRadius * Math.sin(endAngle);

      const path = `M ${ix1} ${iy1} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`;

      currentAngle = endAngle;

      return { ...item, path };
    });

    return (
      <svg width="100%" height="250" viewBox={`0 0 ${size * 2} ${size * 2}`} style={{ maxWidth: '100%' }}>
        {slices.map((slice, i) => (
          <path key={i} d={slice.path} fill={slice.color} stroke="#0A0A0A" strokeWidth="2" />
        ))}
        <circle cx={size} cy={size} r={innerRadius} fill="#0A0A0A" />
      </svg>
    );
  };

  // KPI Card Component — whole card is a Link; hover/focus apply brand-gold
  // affordance, mousedown gives tactile scale-down feedback. Border is 2px
  // transparent at rest so the gold-border hover state introduces no layout
  // shift.
  const KPICard = ({ title, value, isLoading, isCurrency = false, isROI = false, href }) => {
    const [isHover, setIsHover] = useState(false);
    const [isFocus, setIsFocus] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const active = isHover || isFocus;
    return (
      <Link
        href={href}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => { setIsHover(false); setIsPressed(false); }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        onKeyDown={(e) => {
          if (e.key === ' ') {
            e.preventDefault();
            e.currentTarget.click();
          }
        }}
        style={{
          display: 'block',
          background: '#111111',
          border: `2px solid ${active ? '#FFD000' : 'transparent'}`,
          borderRadius: '8px',
          padding: '20px',
          flex: '1 1 calc(33.333% - 16px)',
          minWidth: '200px',
          textAlign: 'center',
          color: 'inherit',
          textDecoration: 'none',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: active ? '0 8px 24px rgba(255, 208, 0, 0.15)' : 'none',
          transform: isPressed ? 'scale(0.99)' : (active ? 'scale(1.02)' : 'none'),
          transition: 'all 200ms ease-out',
        }}
      >
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFD700' }}>
          {isLoading ? (
            <div style={{ animation: 'pulse 2s infinite', opacity: 0.6 }}>Loading...</div>
          ) : isCurrency ? (
            formatCurrency(value)
          ) : isROI ? (
            formatROI(value)
          ) : (
            value
          )}
        </div>
      </Link>
    );
  };

  // Quick Action Card Component
  const QuickActionCard = ({ icon, title, description, href }) => {
    return (
      <div
        onClick={() => router.push(href)}
        style={{
          background: '#111111',
          border: '1px solid #1E1E1E',
          borderRadius: '8px',
          padding: '20px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          textAlign: 'center',
          flex: '1 1 calc(50% - 8px)',
          minWidth: '150px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#FFD700';
          e.currentTarget.style.background = '#1a1a1a';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#1E1E1E';
          e.currentTarget.style.background = '#111111';
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#888' }}>{description}</div>
      </div>
    );
  };

  // Module Card Component
  const ModuleCard = ({ icon, title, description, href, color }) => {
    return (
      <div
        onClick={() => router.push(href)}
        style={{
          background: '#111111',
          border: `2px solid ${color}`,
          borderRadius: '8px',
          padding: '20px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          flex: '1 1 calc(33.333% - 16px)',
          minWidth: '150px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 0 20px ${color}40`;
          e.currentTarget.style.transform = 'translateY(-4px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>{icon}</div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px', color }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#888' }}>{description}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', background: '#0A0A0A', color: '#FFF', minHeight: '100vh' }}>
        <Sidebar />
        <div style={{ flex: 1, marginLeft: '250px', padding: '32px' }}>
          <div style={{ fontSize: '20px', textAlign: 'center' }}>Loading Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', background: '#0A0A0A', color: '#FFF', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: '250px', padding: '32px' }}>
      {/* Welcome Section */}
      <div style={{ maxWidth: '100%', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '5px' }}>Welcome back, {user.name || 'User'}</h1>
        <p style={{ color: '#888', fontSize: '14px' }}>{today}</p>
      </div>

      {/* KPI Cards */}
      <div style={{ maxWidth: '100%', marginBottom: '40px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            justifyContent: 'space-between',
          }}
        >
          <KPICard title="Total Revenue"   value={kpiData.totalRevenue}   isLoading={kpiLoading} isCurrency href="/finance" />
          <KPICard title="Total Profit"    value={kpiData.totalProfit}    isLoading={kpiLoading} isCurrency href="/finance" />
          <KPICard title="Avg ROI"         value={kpiData.avgROI}         isLoading={kpiLoading} isROI      href="/finance" />
          <KPICard title="Active Clients"  value={kpiData.activeClients}  isLoading={kpiLoading}            href="/clients" />
          <KPICard title="Products Hunted" value={kpiData.productsHunted} isLoading={kpiLoading}            href="/scout" />
          <KPICard title="Team Members"    value={kpiData.teamMembers}    isLoading={kpiLoading}            href="/team" />
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ maxWidth: '100%', marginBottom: '40px' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Trend Chart */}
          <div style={{ flex: '2 1 400px', minWidth: '300px' }}>
            <div
              style={{
                background: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '20px',
                height: '100%',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#FFD700' }}>Revenue & Profit Trend</h3>
              <TrendChart />
              <div style={{ display: 'flex', gap: '30px', marginTop: '20px', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#FFD700', borderRadius: '2px' }} />
                  <span style={{ fontSize: '12px', color: '#888' }}>Revenue</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#10B981', borderRadius: '2px' }} />
                  <span style={{ fontSize: '12px', color: '#888' }}>Profit</span>
                </div>
              </div>
            </div>
          </div>

          {/* Donut Chart */}
          <div style={{ flex: '1 1 300px', minWidth: '250px' }}>
            <div
              style={{
                background: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '20px',
                height: '100%',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#FFD700' }}>Products by Status</h3>
              {statusLoading ? (
                <div style={{ textAlign: 'center', color: '#888' }}>Loading...</div>
              ) : (
                <>
                  <DonutChart data={statusData} />
                  <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {statusData.map((item) => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                        <div style={{ width: '10px', height: '10px', background: item.color, borderRadius: '2px' }} />
                        <span>
                          {item.label}: {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div style={{ maxWidth: '100%', marginBottom: '40px' }}>
        <div
          style={{
            background: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#FFD700' }}>Recent Activity</h3>
          <div
            style={{
              maxHeight: '250px',
              overflowY: 'auto',
              paddingRight: '10px',
            }}
          >
            {activityLoading ? (
              <div style={{ color: '#888' }}>Loading activity...</div>
            ) : activityFeed.length === 0 ? (
              <div style={{ color: '#888' }}>No recent activity</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activityFeed.map((activity, i) => (
                  <div key={i} style={{ borderBottom: '1px solid #1E1E1E', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#FFD700', fontWeight: 'bold' }}>
                          {activity.user || 'System'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#CCC', marginTop: '4px' }}>
                          {activity.action || activity.event || 'Unknown Action'}
                        </div>
                        {activity.details && (
                          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>{activity.details}</div>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap' }}>
                        {formatDate(activity.timestamp || activity.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ maxWidth: '100%', marginBottom: '40px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#FFD700' }}>Quick Actions</h3>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            justifyContent: 'space-between',
          }}
        >
          <QuickActionCard
            icon="📊"
            title="Log Daily Work"
            description="Record your daily progress"
            href="/dwm"
          />
          <QuickActionCard icon="👥" title="Add Clients" description="Onboard new clients" href="/clients" />
          <QuickActionCard icon="📈" title="Weekly Reports" description="View performance metrics" href="/weekly" />
          <QuickActionCard icon="📦" title="Product Pipeline" description="Manage product hunts" href="/products" />
          <QuickActionCard icon="🛒" title="Purchase Orders" description="Create & track POs" href="/purchase-orders" />
          <QuickActionCard icon="💰" title="Client P&L" description="View profit & loss" href="/client-pnl" />
        </div>
      </div>

      {/* Modules Grid */}
      <div style={{ maxWidth: '100%', marginBottom: '40px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#FFD700' }}>Core Modules</h3>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            justifyContent: 'space-between',
          }}
        >
          <ModuleCard
            icon="🎯"
            title="Client Management"
            description="Manage all clients"
            href="/clients"
            color="#FFD700"
          />
          <ModuleCard
            icon="📦"
            title="Products"
            description="Hunt & track products"
            href="/products"
            color="#3B82F6"
          />
          <ModuleCard
            icon="🏪"
            title="Inventory"
            description="Stock & FBA management"
            href="/inventory"
            color="#10B981"
          />
          <ModuleCard
            icon="📊"
            title="Analytics"
            description="Sales & performance data"
            href="/analytics"
            color="#EF4444"
          />
          <ModuleCard
            icon="👥"
            title="Team"
            description="Manage team members"
            href="/team"
            color="#8B5CF6"
          />
          <ModuleCard
            icon="⚙️"
            title="Settings"
            description="Account & integrations"
            href="/settings"
            color="#EC4899"
          />
        </div>
      </div>

      {/* Top Performing Products Table */}
      <div style={{ maxWidth: '100%', marginBottom: '40px' }}>
        <div
          style={{
            background: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            padding: '20px',
            overflowX: 'auto',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#FFD700' }}>Top Performing Products</h3>
          {topProductsLoading ? (
            <div style={{ color: '#888' }}>Loading products...</div>
          ) : topProducts.length === 0 ? (
            <div style={{ color: '#888' }}>No products available</div>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '600px',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid #1E1E1E' }}>
                  <th style={{ textAlign: 'left', padding: '12px', color: '#FFD700', fontWeight: 'bold' }}>ASIN</th>
                  <th style={{ textAlign: 'left', padding: '12px', color: '#FFD700', fontWeight: 'bold' }}>Title</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: '#FFD700', fontWeight: 'bold' }}>Cost</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: '#FFD700', fontWeight: 'bold' }}>Sell Price</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: '#FFD700', fontWeight: 'bold' }}>ROI %</th>
                  <th style={{ textAlign: 'center', padding: '12px', color: '#FFD700', fontWeight: 'bold' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1E1E1E' }}>
                    <td style={{ padding: '12px', color: '#CCC', fontSize: '12px' }}>{product.asin || 'N/A'}</td>
                    <td style={{ padding: '12px', color: '#CCC', fontSize: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {product.title || 'Unknown'}
                    </td>
                    <td style={{ padding: '12px', color: '#CCC', fontSize: '12px', textAlign: 'right' }}>
                      {formatCurrency(product.cost || 0)}
                    </td>
                    <td style={{ padding: '12px', color: '#CCC', fontSize: '12px', textAlign: 'right' }}>
                      {formatCurrency(product.sellPrice || 0)}
                    </td>
                    <td style={{ padding: '12px', color: '#10B981', fontSize: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatROI(product.roi || 0)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          background:
                            product.status === 'Approved'
                              ? '#10B98140'
                              : product.status === 'Ordered'
                              ? '#8B5CF640'
                              : product.status === 'Sourced'
                              ? '#3B82F640'
                              : '#FFD70040',
                          color:
                            product.status === 'Approved'
                              ? '#10B981'
                              : product.status === 'Ordered'
                              ? '#8B5CF6'
                              : product.status === 'Sourced'
                              ? '#3B82F6'
                              : '#FFD700',
                        }}
                      >
                        {product.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

        <style>{`
          * {
            box-sizing: border-box;
          }
          @media (max-width: 768px) {
            div[style*="flex: 1 1 calc(33.333%"] {
              flex: 1 1 calc(50% - 8px) !important;
            }
            div[style*="flex: 2 1 400px"] {
              flex: 1 1 100% !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default Dashboard;
