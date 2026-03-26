'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
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

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [user, setUser] = useState(null);

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
      try {
        const dashRes = await fetch(`${API}/dashboard`, {
          headers: authHeader(),
        });
        if (dashRes.ok) {
          const dashData = await dashRes.json();
          setKpis(dashData);
        }
      } catch (e) {
        console.error('Failed to fetch dashboard:', e);
      }

      try {
        const weeklyRes = await fetch(`${API}/weekly`, {
          headers: authHeader(),
        });
        if (weeklyRes.ok) {
          const weeklyData = await weeklyRes.json();
          setWeeks(Array.isArray(weeklyData) ? weeklyData : []);
        }
      } catch (e) {
        console.error('Failed to fetch weekly data:', e);
      }
    };

    fetchData();
  }, []);

  const firstName = user?.firstName || 'User';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const last8Weeks = weeks.slice(-8);
  const latestWeek = weeks[weeks.length - 1] || {};

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
            👋 Welcome back, {firstName}
          </div>
          <div style={{ fontSize: '14px', color: T.textSec }}>{today}</div>
        </div>

        {/* KPI Cards Grid */}
        {kpis ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px',
              marginBottom: '40px',
            }}
          >
            <KPICard
              title="Total Revenue"
              value={`$${(kpis.totalRevenue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
              color={T.yellow}
              icon="💰"
            />
            <KPICard
              title="Total Profit"
              value={`$${(kpis.totalProfit || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
              color={T.green}
              icon="📈"
            />
            <KPICard
              title="Avg ROI"
              value={`${(kpis.avgROI || 0).toFixed(1)}%`}
              color={T.blue}
              icon="🎯"
            />
            <KPICard
              title="Active Clients"
              value={kpis.activeClients || 0}
              sub={`${kpis.totalSubscriptions || 0} total subscriptions`}
              color={T.purple}
              icon="👥"
            />
            <KPICard
              title="Account Managers"
              value={kpis.accountManagers || 0}
              color={T.yellow}
              icon="👔"
            />
            <KPICard
              title="Products Analyzed"
              value={(kpis.productsAnalyzed || 0).toLocaleString('en-US')}
              color={T.green}
              icon="📦"
            />
          </div>
        ) : (
          <div
            style={{
              backgroundColor: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: '8px',
              padding: '40px',
              marginBottom: '40px',
              textAlign: 'center',
              color: T.textSec,
            }}
          >
            Loading KPI data...
          </div>
        )}

        {/* Charts Grid */}
        {last8Weeks.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px',
              marginBottom: '40px',
            }}
          >
            {/* Weekly Revenue */}
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
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={last8Weeks}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={T.yellow} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={T.yellow} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="week"
                    stroke={T.textMut}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke={T.textMut} style={{ fontSize: '12px' }} />
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

            {/* Profit Trend */}
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
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={last8Weeks}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={T.green} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={T.green} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="week"
                    stroke={T.textMut}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke={T.textMut} style={{ fontSize: '12px' }} />
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

            {/* Approvals vs Purchases */}
            <div
              style={{
                backgroundColor: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, color: T.text, marginBottom: '20px' }}>
                Approvals vs Purchases
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={last8Weeks}>
                  <XAxis
                    dataKey="week"
                    stroke={T.textMut}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke={T.textMut} style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: T.card,
                      border: `1px solid ${T.border}`,
                      borderRadius: '4px',
                      color: T.text,
                    }}
                  />
                  <Bar dataKey="approvals" fill={T.blue} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="purchases" fill={T.purple} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Hunting Funnel */}
            <div
              style={{
                backgroundColor: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, color: T.text, marginBottom: '20px' }}>
                Hunting Funnel (Latest Week)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '20px' }}>
                {[
                  { label: 'Hunted', value: latestWeek.hunted || 0, color: T.yellow },
                  { label: 'Analyzed', value: latestWeek.analyzed || 0, color: T.blue },
                  { label: 'Contacted', value: latestWeek.contacted || 0, color: T.purple },
                  { label: 'Approved', value: latestWeek.approved || 0, color: T.green },
                  { label: 'Purchased', value: latestWeek.purchased || 0, color: T.green },
                ].map((stage, i) => {
                  const maxValue = latestWeek.hunted || 1;
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
                          {stage.value} ({percentage}%)
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
          </div>
        ) : (
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
              No weekly data available yet
            </div>
            <div style={{ fontSize: '14px', color: T.textSec, marginBottom: '24px' }}>
              Start by hunting products or adding clients to see analytics
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <a
                href="/weekly"
                style={{
                  padding: '10px 20px',
                  backgroundColor: T.blue,
                  color: T.text,
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                View Weekly Analytics
              </a>
              <a
                href="/clients"
                style={{
                  padding: '10px 20px',
                  backgroundColor: T.border,
                  color: T.text,
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Add Clients
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
