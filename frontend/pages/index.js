import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Dashboard() {
  const [username, setUsername] = useState('User');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    avgROI: 0,
    activeClients: 0,
    productsHunted: 0,
    teamMembers: 0
  });

  useEffect(() => {
    const token = localStorage.getItem('ecomera_token');

    if (!token) {
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch all data in parallel
        const [pnlRes, clientsRes, productsRes, usersRes] = await Promise.all([
          fetch(`${BASE_URL}/client-pnl/summary`, { headers }).catch(e => {
            console.error('Error fetching P&L summary:', e);
            return { ok: false };
          }),
          fetch(`${BASE_URL}/clients`, { headers }).catch(e => {
            console.error('Error fetching clients:', e);
            return { ok: false };
          }),
          fetch(`${BASE_URL}/products-pipeline`, { headers }).catch(e => {
            console.error('Error fetching products pipeline:', e);
            return { ok: false };
          }),
          fetch(`${BASE_URL}/users`, { headers }).catch(e => {
            console.error('Error fetching users:', e);
            return { ok: false };
          })
        ]);

        // Parse P&L Summary
        let revenue = 0;
        let profit = 0;
        let roi = 0;
        if (pnlRes.ok) {
          try {
            const pnlData = await pnlRes.json();
            revenue = pnlData.totalRevenue || 0;
            profit = pnlData.totalProfit || 0;
            // Calculate ROI if we have the data
            if (revenue > 0) {
              roi = ((profit / revenue) * 100).toFixed(2);
            }
          } catch (e) {
            console.error('Error parsing P&L data:', e);
          }
        }

        // Parse Clients
        let clientCount = 0;
        if (clientsRes.ok) {
          try {
            const clientsData = await clientsRes.json();
            clientCount = Array.isArray(clientsData) ? clientsData.length : (clientsData.count || 0);
          } catch (e) {
            console.error('Error parsing clients data:', e);
          }
        }

        // Parse Products
        let productCount = 0;
        if (productsRes.ok) {
          try {
            const productsData = await productsRes.json();
            productCount = Array.isArray(productsData) ? productsData.length : (productsData.count || 0);
          } catch (e) {
            console.error('Error parsing products data:', e);
          }
        }

        // Parse Users
        let userCount = 0;
        if (usersRes.ok) {
          try {
            const usersData = await usersRes.json();
            userCount = Array.isArray(usersData) ? usersData.length : (usersData.count || 0);
          } catch (e) {
            console.error('Error parsing users data:', e);
          }
        }

        setKpis({
          totalRevenue: revenue,
          totalProfit: profit,
          avgROI: roi,
          activeClients: clientCount,
          productsHunted: productCount,
          teamMembers: userCount
        });

        // Get username from localStorage if available
        const storedUsername = localStorage.getItem('ecomera_username');
        if (storedUsername) {
          setUsername(storedUsername);
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getFormattedDate = () => {
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  const StatCard = ({ label, value, loading: isLoading, format = 'text' }) => (
    <div style={{
      background: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '20px',
      flex: 1,
      minWidth: '180px'
    }}>
      <div style={{
        fontSize: '12px',
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '10px'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#FFD700'
      }}>
        {isLoading ? (
          <span style={{ color: '#666' }}>Loading...</span>
        ) : (
          format === 'currency' ? formatCurrency(value) :
          format === 'percentage' ? `${value}%` :
          value.toLocaleString()
        )}
      </div>
    </div>
  );

  const QuickActionCard = ({ icon, label, href }) => (
    <Link href={href}>
      <a style={{ textDecoration: 'none' }}>
        <div style={{
          background: '#111111',
          border: '1px solid #1E1E1E',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          flex: 1,
          minWidth: '140px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#FFD700';
          e.currentTarget.style.backgroundColor = '#1a1a1a';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#1E1E1E';
          e.currentTarget.style.backgroundColor = '#111111';
        }}>
          <div style={{
            fontSize: '24px',
            marginBottom: '8px'
          }}>
            {icon}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#FFF',
            fontWeight: '500'
          }}>
            {label}
          </div>
        </div>
      </a>
    </Link>
  );

  const ModuleCard = ({ title, icon, href, description }) => (
    <Link href={href}>
      <a style={{ textDecoration: 'none' }}>
        <div style={{
          background: '#111111',
          border: '1px solid #1E1E1E',
          borderRadius: '8px',
          padding: '24px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#FFD700';
          e.currentTarget.style.backgroundColor = '#1a1a1a';
          e.currentTarget.style.transform = 'translateY(-4px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#1E1E1E';
          e.currentTarget.style.backgroundColor = '#111111';
          e.currentTarget.style.transform = 'translateY(0)';
        }}>
          <div>
            <div style={{
              fontSize: '32px',
              marginBottom: '12px'
            }}>
              {icon}
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#FFF',
              marginBottom: '8px'
            }}>
              {title}
            </div>
            {description && (
              <div style={{
                fontSize: '12px',
                color: '#999'
              }}>
                {description}
              </div>
            )}
          </div>
        </div>
      </a>
    </Link>
  );

  return (
    <div style={{
      background: '#0A0A0A',
      color: '#FFF',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <Sidebar />

      <div style={{
        marginLeft: '250px',
        padding: '32px'
      }}>
        {/* Welcome Header */}
        <div style={{
          marginBottom: '32px'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#FFF',
            margin: '0 0 8px 0'
          }}>
            Welcome back, {username}
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#999',
            margin: '0'
          }}>
            {getFormattedDate()}
          </p>
        </div>

        {/* Top KPI Cards */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '32px',
          flexWrap: 'wrap'
        }}>
          <StatCard
            label="Total Revenue"
            value={kpis.totalRevenue}
            loading={loading}
            format="currency"
          />
          <StatCard
            label="Total Profit"
            value={kpis.totalProfit}
            loading={loading}
            format="currency"
          />
          <StatCard
            label="Avg ROI"
            value={kpis.avgROI}
            loading={loading}
            format="percentage"
          />
          <StatCard
            label="Active Clients"
            value={kpis.activeClients}
            loading={loading}
          />
          <StatCard
            label="Products Hunted"
            value={kpis.productsHunted}
            loading={loading}
          />
          <StatCard
            label="Team Members"
            value={kpis.teamMembers}
            loading={loading}
          />
        </div>

        {/* Quick Actions */}
        <div style={{
          marginBottom: '40px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#FFF',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: '#FFD700'
          }}>
            Quick Actions
          </h2>
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <QuickActionCard
              icon="📝"
              label="Log Daily Work"
              href="/dwm"
            />
            <QuickActionCard
              icon="👥"
              label="Add Clients"
              href="/clients"
            />
            <QuickActionCard
              icon="📊"
              label="Weekly Reports"
              href="/weekly"
            />
            <QuickActionCard
              icon="📦"
              label="Product Pipeline"
              href="/products"
            />
            <QuickActionCard
              icon="📋"
              label="Purchase Orders"
              href="/purchase-orders"
            />
            <QuickActionCard
              icon="💰"
              label="Client P&L"
              href="/client-pnl"
            />
          </div>
        </div>

        {/* Module Cards Grid */}
        <div style={{
          marginBottom: '32px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#FFF',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: '#FFD700'
          }}>
            Modules
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px'
          }}>
            <ModuleCard
              title="Product Pipeline"
              icon="📦"
              href="/products"
              description="Manage product hunting and pipeline"
            />
            <ModuleCard
              title="Purchase Orders"
              icon="📋"
              href="/purchase-orders"
              description="Track purchase orders and inventory"
            />
            <ModuleCard
              title="Client P&L"
              icon="💰"
              href="/client-pnl"
              description="View profit and loss statements"
            />
            <ModuleCard
              title="DWM Reports"
              icon="📝"
              href="/dwm"
              description="Daily work management reports"
            />
            <ModuleCard
              title="Intelligence"
              icon="🔍"
              href="/intelligence"
              description="Market research and insights"
            />
            <ModuleCard
              title="Automations"
              icon="⚙️"
              href="/automations"
              description="Setup and manage automations"
            />
            <ModuleCard
              title="Client Portal"
              icon="🌐"
              href="/client-portal"
              description="Client communication hub"
            />
            <ModuleCard
              title="KPI Targets"
              icon="🎯"
              href="/kpi-targets"
              description="Set and track KPI goals"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
