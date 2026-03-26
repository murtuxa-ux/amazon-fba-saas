import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

const T = {
  bg: '#0A0A0A',
  card: '#111111',
  border: '#1E1E1E',
  yellow: '#FFD700',
  yellowDim: 'rgba(255,215,0,0.12)',
  text: '#FFFFFF',
  textSec: '#888888',
  textMut: '#444444',
  green: '#22C55E',
  red: '#EF4444',
  blue: '#3B82F6',
  purple: '#8B5CF6',
};

const authHeader = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ecomera_token') : null;
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const KPICard = ({ title, value, sub, color, icon }) => (
  <div
    style={{
      backgroundColor: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: '8px',
      padding: '20px',
      borderTop: `4px solid ${color}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: '12px', color: T.textSec, fontWeight: 500, marginBottom: '8px' }}>
          {title}
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: T.text }}>{value}</div>
      </div>
      <div style={{ fontSize: '24px' }}>{icon}</div>
    </div>
    {sub && <div style={{ fontSize: '12px', color: T.textMut }}>{sub}</div>}
  </div>
);

const QuickLink = ({ href, label, color }) => (
  <a
    href={href}
    style={{
      padding: '10px 20px',
      backgroundColor: color || T.border,
      color: T.text,
      textDecoration: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 500,
      transition: 'opacity 0.2s',
    }}
  >
    {label}
  </a>
);

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [user, setUser] = useState(null);
  const [dwm, setDwm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('ecomera_user') : null;
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }

    const fetchData = async () => {
      // Fetch main dashboard KPIs
      try {
        const dashRes = await fetch(`${API}/dashboard`, { headers: authHeader() });
        if (dashRes.ok) setKpis(await dashRes.json());
      } catch (e) { console.error('Dashboard fetch failed:', e); }

      // Fetch weekly reports
      try {
        const weeklyRes = await fetch(`${API}/weekly`, { headers: authHeader() });
        if (weeklyRes.ok) {
          const weeklyData = await weeklyRes.json();
          setWeeks(Array.isArray(weeklyData) ? weeklyData : []);
        }
      } catch (e) { console.error('Weekly fetch failed:', e); }

      // Fetch DWM dashboard for real-time team activity
      try {
        const dwmRes = await fetch(`${API}/dwm/dashboard?period=month`, { headers: authHeader() });
        if (dwmRes.ok) setDwm(await dwmRes.json());
      } catch (e) { console.error('DWM fetch failed:', e); }

      setLoading(false);
    };

    fetchData();
  }, []);

  const firstName = user?.name?.split(' ')[0] || user?.username || 'User';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const last8Weeks = weeks.slice(-8);
  const latestWeek = weeks[weeks.length - 1] || {};

  // Extract DWM totals for this month
  const dwmTotals = dwm?.totals || {};
  const dwmDaily = dwm?.daily_trend || [];
  const dwmTeam = dwm?.team_kpis || [];

  const hasAnyData = kpis || dwm || weeks.length > 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: T.bg }}>
      <Sidebar />

      <div
        style={{
          flex: 1,
          padding: '40px',
          overflowY: 'auto',
          maxHeight: '100vh',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: T.text, marginBottom: '8px' }}>
            Welcome back, {firstName}
          </div>
          <div style={{ fontSize: '14px', color: T.textSec }}>{today}</div>
        </div>

        {loading ? (
          <div
            style={{
              backgroundColor: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: '8px',
              padding: '60px 40px',
              textAlign: 'center',
              color: T.textSec,
            }}
          >
            Loading dashboard data...
          </div>
        ) : (
          <>
            {/* Primary KPI Cards — Business Overview */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '20px',
                marginBottom: '24px',
              }}
            >
              <KPICard
                title="Total Revenue"
                value={`$${(kpis?.totalRevenue || kpis?.total_revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                color={T.yellow}
                icon="💰"
              />
              <KPICard
                title="Total Profit"
                value={`$${(kpis?.totalProfit || kpis?.total_profit || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                color={T.green}
                icon="📈"
              />
              <KPICard
                title="Avg ROI"
                value={`${(kpis?.avgROI || kpis?.avg_roi || 0).toFixed(1)}%`}
                color={T.blue}
                icon="🎯"
              />
            </div>

            {/* Secondary KPI Cards — Operations + DWM */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '20px',
                marginBottom: '40px',
              }}
            >
              <KPICard
                title="Active Clients"
                value={kpis?.activeClients || kpis?.active_clients || 0}
                sub={`${kpis?.totalSubscriptions || kpis?.total_subscriptions || 0} total subscriptions`}
                color={T.purple}
                icon="👥"
              />
              <KPICard
                title="Products Hunted (Month)"
                value={(dwmTotals.products_hunted || 0).toLocaleString('en-US')}
                sub={`${dwmTotals.brands_contacted || 0} brands contacted`}
                color={T.yellow}
                icon="📦"
              />
              <KPICard
                title="Approvals (Month)"
                value={dwmTotals.total_approvals || 0}
                sub={`$${(dwmTotals.total_order_value || 0).toLocaleString('en-US')} order value`}
                color={T.green}
                icon="✅"
              />
              <KPICard
                title="Team Members"
                value={kpis?.accountManagers || kpis?.account_managers || dwmTeam.length || 0}
                color={T.blue}
                icon="👔"
              />
            </div>

            {/* Team Activity Section — from DWM */}
            {dwmTeam.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <div style={{ fontSize: '18px', fontWeight: 600, color: T.text, marginBottom: '16px' }}>
                  Team Activity This Month
                </div>
                <div
                  style={{
                    backgroundColor: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '13px',
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                        {['Team Member', 'Products Hunted', 'Brands Contacted', 'Approvals', 'Order Value'].map(
                          (h) => (
                            <th
                              key={h}
                              style={{
                                padding: '14px 16px',
                                textAlign: 'left',
                                color: T.textSec,
                                fontWeight: 600,
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {dwmTeam.map((member, i) => (
                        <tr
                          key={i}
                          style={{
                            borderBottom: i < dwmTeam.length - 1 ? `1px solid ${T.border}` : 'none',
                          }}
                        >
                          <td style={{ padding: '12px 16px', color: T.text, fontWeight: 500 }}>
                            {member.user_name || member.username || `User ${member.user_id}`}
                          </td>
                          <td style={{ padding: '12px 16px', color: T.yellow, fontWeight: 600 }}>
                            {(member.products_hunted || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 16px', color: T.purple }}>
                            {member.brands_contacted || 0}
                          </td>
                          <td style={{ padding: '12px 16px', color: T.green }}>
                            {member.total_approvals || 0}
                          </td>
                          <td style={{ padding: '12px 16px', color: T.text }}>
                            ${(member.total_order_value || 0).toLocaleString('en-US')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Charts Grid */}
            {last8Weeks.length > 0 || dwmDaily.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '20px',
                  marginBottom: '40px',
                }}
              >
                {/* Weekly Revenue */}
                {last8Weeks.length > 0 && (
                  <div
                    style={{
                      backgroundColor: T.card,
                      border: `1px solid ${T.border}`,
                      borderRadius: '8px',
                      padding: '20px',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 600, color: T.text, marginBottom: '20px' }}>
                      Weekly Revenue
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={last8Weeks}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={T.yellow} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={T.yellow} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="week" stroke={T.textMut} style={{ fontSize: '11px' }} />
                        <YAxis stroke={T.textMut} style={{ fontSize: '11px' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: T.card,
                            border: `1px solid ${T.border}`,
                            borderRadius: '4px',
                            color: T.text,
                          }}
                          formatter={(value) => `$${value.toLocaleString('en-US')}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke={T.yellow}
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Profit Trend */}
                {last8Weeks.length > 0 && (
                  <div
                    style={{
                      backgroundColor: T.card,
                      border: `1px solid ${T.border}`,
                      borderRadius: '8px',
                      padding: '20px',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 600, color: T.text, marginBottom: '20px' }}>
                      Profit Trend
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={last8Weeks}>
                        <defs>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={T.green} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={T.green} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="week" stroke={T.textMut} style={{ fontSize: '11px' }} />
                        <YAxis stroke={T.textMut} style={{ fontSize: '11px' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: T.card,
                            border: `1px solid ${T.border}`,
                            borderRadius: '4px',
                            color: T.text,
                          }}
                          formatter={(value) => `$${value.toLocaleString('en-US')}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="profit"
                          stroke={T.green}
                          fillOpacity={1}
                          fill="url(#colorProfit)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Daily Hunting Activity — from DWM */}
                {dwmDaily.length > 0 && (
                  <div
                    style={{
                      backgroundColor: T.card,
                      border: `1px solid ${T.border}`,
                      borderRadius: '8px',
                      padding: '20px',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 600, color: T.text, marginBottom: '20px' }}>
                      Daily Hunting Activity
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={dwmDaily.slice(-14)}>
                        <XAxis
                          dataKey="date"
                          stroke={T.textMut}
                          style={{ fontSize: '10px' }}
                          tickFormatter={(d) => {
                            const date = new Date(d);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          }}
                        />
                        <YAxis stroke={T.textMut} style={{ fontSize: '11px' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: T.card,
                            border: `1px solid ${T.border}`,
                            borderRadius: '4px',
                            color: T.text,
                            fontSize: '12px',
                          }}
                          labelFormatter={(d) => {
                            const date = new Date(d);
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '11px', color: T.textSec }}
                        />
                        <Bar dataKey="products_hunted" name="Hunted" fill={T.yellow} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="brands_contacted" name="Contacted" fill={T.purple} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Hunting Funnel */}
                {(latestWeek.hunted > 0 || dwmTotals.products_hunted > 0) && (
                  <div
                    style={{
                      backgroundColor: T.card,
                      border: `1px solid ${T.border}`,
                      borderRadius: '8px',
                      padding: '20px',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 600, color: T.text, marginBottom: '20px' }}>
                      {dwmTotals.products_hunted > 0 ? 'Monthly Funnel (DWM)' : 'Hunting Funnel (Latest Week)'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '20px' }}>
                      {(dwmTotals.products_hunted > 0
                        ? [
                            { label: 'Products Hunted', value: dwmTotals.products_hunted || 0, color: T.yellow },
                            { label: 'Brands Contacted', value: dwmTotals.brands_contacted || 0, color: T.blue },
                            { label: 'Approvals', value: dwmTotals.total_approvals || 0, color: T.green },
                          ]
                        : [
                            { label: 'Hunted', value: latestWeek.hunted || 0, color: T.yellow },
                            { label: 'Analyzed', value: latestWeek.analyzed || 0, color: T.blue },
                            { label: 'Contacted', value: latestWeek.contacted || 0, color: T.purple },
                            { label: 'Approved', value: latestWeek.approved || 0, color: T.green },
                            { label: 'Purchased', value: latestWeek.purchased || 0, color: T.green },
                          ]
                      ).map((stage, i, arr) => {
                        const maxValue = arr[0].value || 1;
                        const percentage = ((stage.value / maxValue) * 100).toFixed(1);
                        return (
                          <div key={i}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '6px',
                              }}
                            >
                              <span style={{ fontSize: '12px', color: T.textSec }}>{stage.label}</span>
                              <span
                                style={{
                                  fontSize: '12px',
                                  color: T.text,
                                  fontWeight: 600,
                                }}
                              >
                                {stage.value.toLocaleString()} ({percentage}%)
                              </span>
                            </div>
                            <div
                              style={{
                                width: '100%',
                                height: '6px',
                                backgroundColor: T.border,
                                borderRadius: '3px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${percentage}%`,
                                  height: '100%',
                                  backgroundColor: stage.color,
                                  borderRadius: '3px',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty state — no charts data yet */
              <div
                style={{
                  backgroundColor: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: '8px',
                  padding: '60px 40px',
                  textAlign: 'center',
                  marginBottom: '40px',
                }}
              >
                <div style={{ fontSize: '16px', color: T.text, marginBottom: '16px' }}>
                  No activity data available yet
                </div>
                <div style={{ fontSize: '14px', color: T.textSec, marginBottom: '24px' }}>
                  Start logging daily work in DWM Reports or add weekly reports to see analytics here.
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <QuickLink href="/dwm" label="Log Daily Work" color={T.yellow} />
                  <QuickLink href="/clients" label="Add Clients" />
                  <QuickLink href="/weekly" label="Weekly Reports" />
                </div>
              </div>
            )}

            {/* Quick Navigation — role-based */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
              }}
            >
              {[
                { href: '/products', label: 'Product Pipeline', icon: '📦', desc: 'Track products through stages' },
                { href: '/purchase-orders', label: 'Purchase Orders', icon: '🧾', desc: 'Manage POs & deliveries' },
                { href: '/client-pnl', label: 'Client P&L', icon: '💹', desc: 'Profit & loss reports' },
                { href: '/dwm', label: 'DWM Reports', icon: '📋', desc: 'Daily/Weekly/Monthly logs' },
                ...(user?.role === 'owner' || user?.role === 'admin' ? [
                  { href: '/intelligence', label: 'Intelligence', icon: '🧠', desc: 'AI-powered insights' },
                  { href: '/automations', label: 'Automations', icon: '⚡', desc: 'Alerts & auto-reports' },
                  { href: '/portal-admin', label: 'Client Portal', icon: '🌐', desc: 'Manage client access' },
                  { href: '/kpi', label: 'KPI Targets', icon: '🎯', desc: 'Set and track targets' },
                ] : [
                  { href: '/kpi', label: 'KPI Targets', icon: '🎯', desc: 'Set and track targets' },
                  { href: '/scout', label: 'FBA Scout', icon: '🔍', desc: 'Analyze products' },
                  { href: '/clients', label: 'Clients', icon: '👥', desc: 'Manage client accounts' },
                  { href: '/exports', label: 'Export Data', icon: '📊', desc: 'Download reports & CSVs' },
                ]),
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    backgroundColor: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: '8px',
                    padding: '20px',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.yellow)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.border)}
                >
                  <div style={{ fontSize: '24px' }}>{link.icon}</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: T.text }}>{link.label}</div>
                  <div style={{ fontSize: '12px', color: T.textSec }}>{link.desc}</div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
