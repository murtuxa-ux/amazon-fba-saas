import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [triggeringTask, setTriggeringTask] = useState(null);
  const [confirmTrigger, setConfirmTrigger] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

  // Theme colors
  const colors = {
    bg: '#0A0A0A',
    card: '#111111',
    border: '#1E1E1E',
    accent: '#FFD700',
    text: '#FFFFFF',
    textSec: '#888888',
    success: '#00C853',
    warning: '#FFC107',
    error: '#FF5252',
    info: '#2196F3'
  };

  // Check user role on mount
  useEffect(() => {
    const userData = localStorage.getItem('ecomera_user');
    const token = localStorage.getItem('ecomera_token');

    if (!userData || !token) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      // Restrict to owner/admin
      if (!['owner', 'admin'].includes(parsedUser.role)) {
        router.push('/dashboard');
        return;
      }
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  // Fetch all data
  const fetchData = async () => {
    const safeFetch = async (url) => { try { const r = await fetch(url, { headers }); if (!r.ok) return null; return await r.json(); } catch(e) { return null; } };

    const [statusData, metricsData, tasksData, logsData] = await Promise.all([
      safeFetch(`${API_URL}/system/status`),
      safeFetch(`${API_URL}/system/metrics`),
      safeFetch(`${API_URL}/scheduler/tasks`),
      safeFetch(`${API_URL}/system/logs?limit=50`),
    ]);

    if (statusData) setStatus(statusData);
    if (metricsData) setMetrics(metricsData);
    if (tasksData) setTasks(Array.isArray(tasksData) ? tasksData : tasksData.tasks || []);
    if (logsData) setLogs(Array.isArray(logsData) ? logsData : logsData.logs || []);
    setError(null);
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Trigger task handler
  const handleTriggerTask = async (taskName) => {
    if (confirmTrigger !== taskName) {
      setConfirmTrigger(taskName);
      return;
    }

    setTriggeringTask(taskName);
    try {
      const token = localStorage.getItem('ecomera_token');
      const res = await fetch(`${API_URL}/scheduler/trigger/${taskName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        alert(`Task "${taskName}" triggered successfully`);
        setConfirmTrigger(null);
        // Refresh data
        setTimeout(fetchData, 1000);
      } else {
        alert('Failed to trigger task');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setTriggeringTask(null);
    }
  };

  // Toggle task handler
  const handleToggleTask = async (taskName) => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const res = await fetch(`${API_URL}/scheduler/toggle/${taskName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        // Refresh tasks
        fetchData();
      } else {
        alert('Failed to toggle task');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatUptime = (uptime) => {
    if (!uptime) return 'N/A';
    return uptime.uptime_formatted || 'N/A';
  };

  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.bg }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ color: colors.text, fontSize: '32px', fontWeight: '700', margin: 0 }}>
              Admin Dashboard
            </h1>
            <p style={{ color: colors.textSec, fontSize: '14px', marginTop: '8px' }}>
              System status, metrics, and task management
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: colors.error + '20',
              border: `1px solid ${colors.error}`,
              color: colors.error,
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {loading && !systemStatus ? (
            <div style={{ color: colors.textSec, textAlign: 'center', padding: '40px' }}>
              Loading dashboard...
            </div>
          ) : (
            <>
              {/* Section 1: System Status */}
              <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                  System Status
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  {/* Uptime Card */}
                  <div style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Uptime
                    </p>
                    <p style={{ color: colors.accent, fontSize: '24px', fontWeight: '700', margin: 0 }}>
                      {systemStatus?.uptime ? formatUptime(systemStatus.uptime) : 'N/A'}
                    </p>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '8px 0 0 0' }}>
                      Started: {systemStatus?.uptime ? new Date(systemStatus.uptime.started_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>

                  {/* Database Status Card */}
                  <div style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Database
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: systemStatus?.database?.status === 'healthy' ? colors.success : colors.error
                      }} />
                      <p style={{ color: colors.text, fontSize: '16px', fontWeight: '600', margin: 0 }}>
                        {systemStatus?.database?.status === 'healthy' ? 'Healthy' : 'Error'}
                      </p>
                    </div>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '8px 0 0 0' }}>
                      {systemStatus?.database?.message || 'N/A'}
                    </p>
                  </div>

                  {/* Memory Card */}
                  <div style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Memory Usage
                    </p>
                    <p style={{ color: colors.accent, fontSize: '24px', fontWeight: '700', margin: 0 }}>
                      {systemStatus?.memory?.rss_mb?.toFixed(2) || '0'} MB
                    </p>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '8px 0 0 0' }}>
                      Peak RSS
                    </p>
                  </div>

                  {/* Active Connections Card */}
                  <div style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Active Users
                    </p>
                    <p style={{ color: colors.accent, fontSize: '24px', fontWeight: '700', margin: 0 }}>
                      {systemStatus?.metrics?.active_users || 0}
                    </p>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '8px 0 0 0' }}>
                      Last 24 hours
                    </p>
                  </div>

                  {/* Total Organizations Card */}
                  <div style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Organizations
                    </p>
                    <p style={{ color: colors.accent, fontSize: '24px', fontWeight: '700', margin: 0 }}>
                      {systemStatus?.metrics?.total_organizations || 0}
                    </p>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '8px 0 0 0' }}>
                      Total
                    </p>
                  </div>

                  {/* Total Products Card */}
                  <div style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Products
                    </p>
                    <p style={{ color: colors.accent, fontSize: '24px', fontWeight: '700', margin: 0 }}>
                      {systemStatus?.metrics?.total_products || 0}
                    </p>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '8px 0 0 0' }}>
                      Analyzed
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 2: Business Metrics */}
              <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                  Business Metrics
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  {/* Total Revenue Card */}
                  <div style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Total Revenue
                    </p>
                    <p style={{ color: colors.success, fontSize: '24px', fontWeight: '700', margin: 0 }}>
                      ${(metrics?.financial?.total_revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '8px 0 0 0' }}>
                      All time
                    </p>
                  </div>

                  {/* Avg Revenue per Client Card */}
                  <div style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Avg Revenue/Client
                    </p>
                    <p style={{ color: colors.success, fontSize: '24px', fontWeight: '700', margin: 0 }}>
                      ${(metrics?.financial?.avg_revenue_per_client || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '8px 0 0 0' }}>
                      Per client
                    </p>
                  </div>

                  {/* Products Analyzed Card */}
                  <div style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Products Analyzed
                    </p>
                    <p style={{ color: colors.info, fontSize: '24px', fontWeight: '700', margin: 0 }}>
                      {(metrics?.products?.total_analyzed || 0).toLocaleString()}
                    </p>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '8px 0 0 0' }}>
                      Total
                    </p>
                  </div>

                  {/* Average ROI Card */}
                  <div style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Average ROI
                    </p>
                    <p style={{ color: colors.accent, fontSize: '24px', fontWeight: '700', margin: 0 }}>
                      {(metrics?.performance?.average_roi || 0).toFixed(2)}%
                    </p>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '8px 0 0 0' }}>
                      Across clients
                    </p>
                  </div>

                  {/* Active Clients Card */}
                  <div style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Active Clients
                    </p>
                    <p style={{ color: colors.info, fontSize: '24px', fontWeight: '700', margin: 0 }}>
                      {metrics?.clients?.active_in_last_30_days || 0}
                    </p>
                    <p style={{ color: colors.textSec, fontSize: '12px', margin: '8px 0 0 0' }}>
                      Last 30 days
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 3: Scheduled Tasks */}
              <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                  Scheduled Tasks
                </h2>
                <div style={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.textSec, fontWeight: '500' }}>
                          Task Name
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.textSec, fontWeight: '500' }}>
                          Status
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.textSec, fontWeight: '500' }}>
                          Last Run
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.textSec, fontWeight: '500' }}>
                          Next Run
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.textSec, fontWeight: '500' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr key={task.name} style={{
                          borderBottom: `1px solid ${colors.border}`,
                          '&:hover': { backgroundColor: colors.bg }
                        }}>
                          <td style={{ padding: '12px 16px', color: colors.text }}>
                            <div>
                              <p style={{ margin: 0, fontWeight: '500' }}>{task.name}</p>
                              <p style={{ margin: '4px 0 0 0', color: colors.textSec, fontSize: '12px' }}>
                                {task.description}
                              </p>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: colors.text }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: task.enabled ? colors.success + '20' : colors.error + '20',
                              color: task.enabled ? colors.success : colors.error,
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              {task.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: colors.textSec, fontSize: '12px' }}>
                            {task.last_run ? formatDate(task.last_run) : 'Never'}
                          </td>
                          <td style={{ padding: '12px 16px', color: colors.textSec, fontSize: '12px' }}>
                            {task.next_run ? formatDate(task.next_run) : 'N/A'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleTriggerTask(task.name)}
                                disabled={triggeringTask === task.name || !task.enabled}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: colors.accent,
                                  color: colors.bg,
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  opacity: triggeringTask === task.name ? 0.7 : 1
                                }}
                              >
                                {triggeringTask === task.name ? 'Running...' : confirmTrigger === task.name ? 'Confirm?' : 'Trigger'}
                              </button>
                              <button
                                onClick={() => handleToggleTask(task.name)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: task.enabled ? colors.error : colors.success,
                                  color: colors.text,
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '600'
                                }}
                              >
                                {task.enabled ? 'Disable' : 'Enable'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section 4: Recent Activity */}
              <section>
                <h2 style={{ color: colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                  Recent Activity
                </h2>
                <div style={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {logs.length === 0 ? (
                    <div style={{
                      padding: '24px',
                      textAlign: 'center',
                      color: colors.textSec
                    }}>
                      No logs available
                    </div>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} style={{
                        padding: '12px 16px',
                        borderBottom: idx < logs.length - 1 ? `1px solid ${colors.border}` : 'none'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <p style={{
                              color: colors.text,
                              fontSize: '14px',
                              fontWeight: '500',
                              margin: 0
                            }}>
                              [{log.category.toUpperCase()}] {log.message}
                            </p>
                            <p style={{
                              color: colors.textSec,
                              fontSize: '12px',
                              margin: '4px 0 0 0'
                            }}>
                              {new Date(log.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: log.level === 'error' ? colors.error + '20' : log.level === 'warning' ? colors.warning + '20' : colors.info + '20',
                            color: log.level === 'error' ? colors.error : log.level === 'warning' ? colors.warning : colors.info,
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            {log.level}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
