import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

export default function Reporting() {
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [benchmarks, setBenchmarks] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState('client_001');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
  const [anomalySeverityFilter, setAnomalySeverityFilter] = useState('all');
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    reportType: 'monthly',
    sections: []
  });
  const [newReport, setNewReport] = useState({
    clientId: 'client_001',
    templateId: 1,
    periodStart: '',
    periodEnd: ''
  });
  const [templateSections, setTemplateSections] = useState(['executive_summary']);
  const [dashboardStats, setDashboardStats] = useState({
    reportsGenerated: 0,
    pendingSchedules: 0,
    activeAnomalies: 0,
    benchmarkHighlights: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') fetchReports();
    if (activeTab === 'templates') fetchTemplates();
    if (activeTab === 'benchmarks') fetchBenchmarks();
    if (activeTab === 'anomalies') fetchAnomalies();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/reporting/dashboard');
      const data = await response.json();
      setDashboardStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reporting/reports');
      const data = await response.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setReports([]);
    }
    setLoading(false);
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reporting/templates');
      const data = await response.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setTemplates([]);
    }
    setLoading(false);
  };

  const fetchBenchmarks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reporting/benchmarks?client_id=${selectedClient}`);
      const data = await response.json();
      setBenchmarks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch benchmarks:', error);
      setBenchmarks([]);
    }
    setLoading(false);
  };

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reporting/anomalies');
      const data = await response.json();
      setAnomalies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch anomalies:', error);
      setAnomalies([]);
    }
    setLoading(false);
  };

  const handleGenerateReport = async () => {
    if (!newReport.templateId || !newReport.periodStart || !newReport.periodEnd) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/reporting/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: newReport.clientId,
          template_id: newReport.templateId,
          period_start: new Date(newReport.periodStart).toISOString(),
          period_end: new Date(newReport.periodEnd).toISOString()
        })
      });
      if (response.ok) {
        setShowGenerateModal(false);
        setNewReport({ clientId: 'client_001', templateId: 1, periodStart: '', periodEnd: '' });
        fetchReports();
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
    setLoading(false);
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name) {
      alert('Please enter a template name');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/reporting/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplate.name,
          description: newTemplate.description,
          report_type: newTemplate.reportType,
          sections: templateSections.map(s => ({ type: s })),
          metrics: [{ name: 'revenue' }, { name: 'acos' }, { name: 'units_sold' }]
        })
      });
      if (response.ok) {
        setShowTemplateModal(false);
        setNewTemplate({ name: '', description: '', reportType: 'monthly', sections: [] });
        setTemplateSections(['executive_summary']);
        fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to create template:', error);
    }
    setLoading(false);
  };

  const handleCalculateBenchmarks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reporting/benchmarks/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: selectedClient })
      });
      if (response.ok) {
        fetchBenchmarks();
      }
    } catch (error) {
      console.error('Failed to calculate benchmarks:', error);
    }
    setLoading(false);
  };

  const handleScanAnomalies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reporting/anomalies/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        fetchAnomalies();
      }
    } catch (error) {
      console.error('Failed to scan anomalies:', error);
    }
    setLoading(false);
  };

  const handleAcknowledgeAnomaly = async (anomalyId) => {
    try {
      const response = await fetch(`/api/reporting/anomalies/${anomalyId}/acknowledge`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Acknowledged' })
      });
      if (response.ok) {
        fetchAnomalies();
      }
    } catch (error) {
      console.error('Failed to acknowledge anomaly:', error);
    }
  };

  const getStatusBadgeStyle = (status) => {
    const baseStyle = {
      padding: '4px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 600,
      display: 'inline-block'
    };

    if (status === 'ready') {
      return { ...baseStyle, backgroundColor: '#FFD700', color: '#0A0A0A' };
    } else if (status === 'sent') {
      return { ...baseStyle, backgroundColor: '#22c55e', color: '#fff' };
    } else if (status === 'generating') {
      return { ...baseStyle, backgroundColor: '#3b82f6', color: '#fff' };
    } else {
      return { ...baseStyle, backgroundColor: '#ef4444', color: '#fff' };
    }
  };

  const getBenchmarkColor = (percentile) => {
    if (percentile >= 75) return '#22c55e';
    if (percentile >= 50) return '#FFD700';
    return '#ef4444';
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical') return '🔴';
    if (severity === 'warning') return '🟡';
    return 'ℹ️';
  };

  const filteredAnomalies = anomalySeverityFilter === 'all'
    ? anomalies
    : anomalies.filter(a => a.severity === anomalySeverityFilter);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#fff' }}>
      <Sidebar />

      <div style={{ flex: 1, padding: '40px', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0, marginBottom: '10px' }}>
            Reporting & Analytics
          </h1>
          <p style={{ color: '#999', margin: 0, fontSize: '14px' }}>
            Manage reports, templates, benchmarks, and anomaly detection
          </p>
        </div>

        {/* Dashboard Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
              Reports Generated
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#FFD700' }}>
              {dashboardStats.reportsGenerated}
            </div>
          </div>

          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
              Pending Schedules
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#FFD700' }}>
              {dashboardStats.pendingSchedules}
            </div>
          </div>

          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
              Active Anomalies
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444' }}>
              {dashboardStats.activeAnomalies}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0',
          borderBottom: '1px solid #1E1E1E',
          marginBottom: '30px'
        }}>
          {['reports', 'templates', 'benchmarks', 'anomalies'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '16px 24px',
                backgroundColor: activeTab === tab ? '#111111' : 'transparent',
                color: activeTab === tab ? '#FFD700' : '#999',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #FFD700' : 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            <div style={{ marginBottom: '30px' }}>
              <button
                onClick={() => setShowGenerateModal(true)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#FFD700',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Generate New Report
              </button>
            </div>

            {loading ? (
              <div style={{ color: '#999' }}>Loading reports...</div>
            ) : reports.length === 0 ? (
              <div style={{
                backgroundColor: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '30px',
                textAlign: 'center',
                color: '#999'
              }}>
                No reports generated yet. Create your first report to get started.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                      <th style={{ textAlign: 'left', padding: '16px', color: '#999', fontSize: '12px', fontWeight: 600 }}>
                        Report Name
                      </th>
                      <th style={{ textAlign: 'left', padding: '16px', color: '#999', fontSize: '12px', fontWeight: 600 }}>
                        Client
                      </th>
                      <th style={{ textAlign: 'left', padding: '16px', color: '#999', fontSize: '12px', fontWeight: 600 }}>
                        Type
                      </th>
                      <th style={{ textAlign: 'left', padding: '16px', color: '#999', fontSize: '12px', fontWeight: 600 }}>
                        Period
                      </th>
                      <th style={{ textAlign: 'left', padding: '16px', color: '#999', fontSize: '12px', fontWeight: 600 }}>
                        Status
                      </th>
                      <th style={{ textAlign: 'left', padding: '16px', color: '#999', fontSize: '12px', fontWeight: 600 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id} style={{ borderBottom: '1px solid #1E1E1E' }}>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          {report.report_name}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#999' }}>
                          {report.client_id}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#999' }}>
                          {report.report_type}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#999' }}>
                          {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={getStatusBadgeStyle(report.status)}>
                            {report.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <button style={{
                            padding: '6px 12px',
                            marginRight: '8px',
                            backgroundColor: '#FFD700',
                            color: '#0A0A0A',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600
                          }}>
                            View
                          </button>
                          <button style={{
                            padding: '6px 12px',
                            marginRight: '8px',
                            backgroundColor: '#1E1E1E',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600
                          }}>
                            Send
                          </button>
                          <button style={{
                            padding: '6px 12px',
                            backgroundColor: '#1E1E1E',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600
                          }}>
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div>
            <div style={{ marginBottom: '30px' }}>
              <button
                onClick={() => setShowTemplateModal(true)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#FFD700',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Create New Template
              </button>
            </div>

            {loading ? (
              <div style={{ color: '#999' }}>Loading templates...</div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                {templates.length === 0 ? (
                  <div style={{
                    backgroundColor: '#111111',
                    border: '1px solid #1E1E1E',
                    borderRadius: '8px',
                    padding: '30px',
                    textAlign: 'center',
                    color: '#999',
                    gridColumn: '1 / -1'
                  }}>
                    No templates created yet.
                  </div>
                ) : (
                  templates.map((template) => (
                    <div
                      key={template.id}
                      style={{
                        backgroundColor: '#111111',
                        border: '1px solid #1E1E1E',
                        borderRadius: '8px',
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FFD700'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1E1E1E'}
                    >
                      <h3 style={{ margin: '0 0 10px 0', color: '#FFD700', fontSize: '16px' }}>
                        {template.name}
                      </h3>
                      <p style={{ margin: '0 0 12px 0', color: '#999', fontSize: '12px' }}>
                        {template.description}
                      </p>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderTop: '1px solid #1E1E1E',
                        paddingTop: '12px',
                        marginTop: '12px'
                      }}>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          Type: <span style={{ color: '#fff' }}>{template.report_type}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          Sections: <span style={{ color: '#fff' }}>{template.sections ? template.sections.length : 0}</span>
                        </div>
                      </div>
                      {template.is_default && (
                        <div style={{
                          marginTop: '12px',
                          padding: '6px 8px',
                          backgroundColor: '#FFD700',
                          color: '#0A0A0A',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'inline-block'
                        }}>
                          Default
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Benchmarks Tab */}
        {activeTab === 'benchmarks' && (
          <div>
            <div style={{ marginBottom: '30px', display: 'flex', gap: '15px' }}>
              <select
                value={selectedClient}
                onChange={(e) => {
                  setSelectedClient(e.target.value);
                  setLoading(true);
                  setTimeout(() => {
                    fetchBenchmarks();
                    setLoading(false);
                  }, 500);
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="client_001">Client 001</option>
                <option value="client_002">Client 002</option>
                <option value="client_003">Client 003</option>
              </select>
              <button
                onClick={handleCalculateBenchmarks}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#FFD700',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Calculate Benchmarks
              </button>
            </div>

            {loading ? (
              <div style={{ color: '#999' }}>Loading benchmarks...</div>
            ) : benchmarks.length === 0 ? (
              <div style={{
                backgroundColor: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '30px',
                textAlign: 'center',
                color: '#999'
              }}>
                No benchmark data available. Run the benchmark calculation to get started.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                {benchmarks.map((bench) => (
                  <div
                    key={bench.id}
                    style={{
                      backgroundColor: '#111111',
                      border: '1px solid #1E1E1E',
                      borderRadius: '8px',
                      padding: '20px'
                    }}
                  >
                    <h3 style={{ margin: '0 0 16px 0', color: '#FFD700', fontSize: '16px' }}>
                      {bench.metric_name}
                    </h3>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                        Your Value vs Category Average
                      </div>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                            {bench.value}
                          </div>
                          <div style={{ fontSize: '11px', color: '#999' }}>Your Performance</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#999' }}>
                            {bench.category_avg}
                          </div>
                          <div style={{ fontSize: '11px', color: '#999' }}>Category Avg</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                        Percentile Rank
                      </div>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#1E1E1E',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(100, bench.percentile_rank)}%`,
                          height: '100%',
                          backgroundColor: getBenchmarkColor(bench.percentile_rank)
                        }} />
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '14px',
                      fontWeight: 600
                    }}>
                      <div style={{ color: getBenchmarkColor(bench.percentile_rank) }}>
                        {Math.round(bench.percentile_rank)}th percentile
                      </div>
                      {bench.percentile_rank >= 75 && <span style={{ color: '#22c55e' }}>⭐ Top Performer</span>}
                      {bench.percentile_rank < 25 && <span style={{ color: '#ef4444' }}>⚠ Below Average</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Anomalies Tab */}
        {activeTab === 'anomalies' && (
          <div>
            <div style={{ marginBottom: '30px', display: 'flex', gap: '15px' }}>
              <select
                value={anomalySeverityFilter}
                onChange={(e) => setAnomalySeverityFilter(e.target.value)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical Only</option>
                <option value="warning">Warnings Only</option>
                <option value="info">Info Only</option>
              </select>
              <button
                onClick={handleScanAnomalies}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#FFD700',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Scan for Anomalies
              </button>
            </div>

            {loading ? (
              <div style={{ color: '#999' }}>Scanning anomalies...</div>
            ) : filteredAnomalies.length === 0 ? (
              <div style={{
                backgroundColor: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '30px',
                textAlign: 'center',
                color: '#999'
              }}>
                No anomalies detected. Your metrics are looking healthy!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredAnomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    style={{
                      backgroundColor: '#111111',
                      border: `1px solid ${anomaly.severity === 'critical' ? '#ef4444' : '#1E1E1E'}`,
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px' }}>
                          {getSeverityIcon(anomaly.severity)}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                          {anomaly.metric_name}
                        </h3>
                        <span style={{
                          padding: '4px 10px',
                          backgroundColor: anomaly.severity === 'critical' ? '#ef4444' : anomaly.severity === 'warning' ? '#f59e0b' : '#3b82f6',
                          color: '#fff',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'capitalize'
                        }}>
                          {anomaly.severity}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#999' }}>
                        <div>
                          Expected: <span style={{ color: '#fff', fontWeight: 600 }}>
                            {anomaly.expected_value.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          Actual: <span style={{ color: '#fff', fontWeight: 600 }}>
                            {anomaly.actual_value.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          Deviation: <span style={{
                            color: Math.abs(anomaly.deviation_pct) > 15 ? '#ef4444' : '#f59e0b',
                            fontWeight: 600
                          }}>
                            {Math.abs(anomaly.deviation_pct).toFixed(1)}%
                          </span>
                        </div>
                        <div style={{ color: '#666' }}>
                          {new Date(anomaly.detected_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAcknowledgeAnomaly(anomaly.id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#1E1E1E',
                        color: '#FFD700',
                        border: '1px solid #FFD700',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Acknowledge
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ margin: '0 0 24px 0', color: '#FFD700' }}>Generate New Report</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#999', marginBottom: '8px' }}>
                Client
              </label>
              <select
                value={newReport.clientId}
                onChange={(e) => setNewReport({ ...newReport, clientId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <option value="client_001">Client 001</option>
                <option value="client_002">Client 002</option>
                <option value="client_003">Client 003</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#999', marginBottom: '8px' }}>
                Template
              </label>
              <select
                value={newReport.templateId}
                onChange={(e) => setNewReport({ ...newReport, templateId: parseInt(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#999', marginBottom: '8px' }}>
                Start Date
              </label>
              <input
                type="date"
                value={newReport.periodStart}
                onChange={(e) => setNewReport({ ...newReport, periodStart: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#fff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#999', marginBottom: '8px' }}>
                End Date
              </label>
              <input
                type="date"
                value={newReport.periodEnd}
                onChange={(e) => setNewReport({ ...newReport, periodEnd: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#fff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleGenerateReport}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#FFD700',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Generate
              </button>
              <button
                onClick={() => setShowGenerateModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#1E1E1E',
                  color: '#fff',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showTemplateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 24px 0', color: '#FFD700' }}>Create New Template</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#999', marginBottom: '8px' }}>
                Template Name
              </label>
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="e.g., Monthly Executive Report"
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#fff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#999', marginBottom: '8px' }}>
                Description
              </label>
              <textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Optional description..."
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#fff',
                  boxSizing: 'border-box',
                  minHeight: '80px',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#999', marginBottom: '8px' }}>
                Report Type
              </label>
              <select
                value={newTemplate.reportType}
                onChange={(e) => setNewTemplate({ ...newTemplate, reportType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#999', marginBottom: '12px', fontWeight: 600 }}>
                Report Sections
              </label>
              {['executive_summary', 'revenue_metrics', 'ppc_performance', 'inventory_health', 'profitability', 'recommendations'].map(section => (
                <div key={section} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={templateSections.includes(section)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTemplateSections([...templateSections, section]);
                      } else {
                        setTemplateSections(templateSections.filter(s => s !== section));
                      }
                    }}
                    style={{ marginRight: '8px', cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label style={{ cursor: 'pointer', fontSize: '14px', textTransform: 'capitalize', color: '#fff' }}>
                    {section.replace(/_/g, ' ')}
                  </label>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCreateTemplate}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#FFD700',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Create Template
              </button>
              <button
                onClick={() => setShowTemplateModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#1E1E1E',
                  color: '#fff',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
