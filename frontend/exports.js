'use client';

import React, { useState, useRef } from 'react';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

const REPORTS = [
  {
    id: 'executive_summary',
    title: 'Executive Summary',
    description: 'High-level overview of key metrics and performance',
    icon: '📊',
  },
  {
    id: 'product_analysis',
    title: 'Product Analysis',
    description: 'Detailed breakdown of top-performing products',
    icon: '📈',
  },
  {
    id: 'weekly_digest',
    title: 'Weekly Digest',
    description: 'Weekly performance trends and insights',
    icon: '📅',
  },
  {
    id: 'client_overview',
    title: 'Client Overview',
    description: 'Summary of all registered clients',
    icon: '👥',
  },
];

const DATA_EXPORTS = [
  {
    id: 'products',
    title: 'Products',
    description: 'Export all products in your catalog',
    icon: '📦',
  },
  {
    id: 'clients',
    title: 'Clients',
    description: 'Export all client information',
    icon: '🤝',
  },
  {
    id: 'scouts',
    title: 'Scout Results',
    description: 'Export scouted opportunities',
    icon: '🔍',
  },
  {
    id: 'suppliers',
    title: 'Suppliers',
    description: 'Export supplier directory',
    icon: '🏭',
  },
  {
    id: 'weekly_reports',
    title: 'Weekly Reports',
    description: 'Export historical weekly reports',
    icon: '📋',
  },
];

export default function ExportsPage() {
  const [loadingReport, setLoadingReport] = useState(null);
  const [loadingCsv, setLoadingCsv] = useState(null);
  const [error, setError] = useState(null);

  const handleDownloadReport = async (reportType) => {
    setLoadingReport(reportType);
    setError(null);
    try {
      const token = localStorage.getItem('ecomera_token');
      if (!token) {
        setError('Authentication required');
        setLoadingReport(null);
        return;
      }

      const response = await fetch(`${API_URL}/export/report/${reportType}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download report: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_${new Date().getTime()}.html`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Failed to download report');
    } finally {
      setLoadingReport(null);
    }
  };

  const handleDownloadCsv = async (dataType) => {
    setLoadingCsv(dataType);
    setError(null);
    try {
      const token = localStorage.getItem('ecomera_token');
      if (!token) {
        setError('Authentication required');
        setLoadingCsv(null);
        return;
      }

      const response = await fetch(`${API_URL}/export/csv/${dataType}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download CSV: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${dataType}_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Failed to download CSV');
    } finally {
      setLoadingCsv(null);
    }
  };

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
    },
    mainContent: {
      flex: 1,
      marginLeft: '250px',
      padding: '40px',
      overflowY: 'auto',
    },
    pageHeader: {
      marginBottom: '40px',
    },
    title: {
      color: '#FFFFFF',
      fontSize: '32px',
      fontWeight: 'bold',
      margin: '0 0 8px 0',
    },
    subtitle: {
      color: '#888',
      fontSize: '14px',
      margin: '0',
    },
    sectionTitle: {
      color: '#FFD700',
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '20px',
      marginTop: '40px',
      borderBottom: '2px solid #FFD700',
      paddingBottom: '10px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '40px',
    },
    card: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '20px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    },
    cardHover: {
      borderColor: '#FFD700',
      backgroundColor: '#141414',
    },
    cardIcon: {
      fontSize: '40px',
      marginBottom: '12px',
    },
    cardTitle: {
      color: '#FFFFFF',
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '8px',
    },
    cardDescription: {
      color: '#888',
      fontSize: '13px',
      marginBottom: '16px',
      lineHeight: '1.4',
    },
    button: {
      width: '100%',
      padding: '10px 16px',
      backgroundColor: '#FFD700',
      color: '#0A0A0A',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    buttonHover: {
      backgroundColor: '#FFE44D',
      transform: 'translateY(-2px)',
    },
    buttonDisabled: {
      backgroundColor: '#666',
      color: '#888',
      cursor: 'not-allowed',
      transform: 'none',
    },
    errorMessage: {
      backgroundColor: '#3d1616',
      color: '#ff6b6b',
      padding: '16px',
      borderRadius: '6px',
      marginBottom: '20px',
      border: '1px solid #7a2a2a',
    },
    cardContainer: {
      position: 'relative',
    },
  };

  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainContent}>
        {error && (
          <div style={styles.errorMessage}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div style={styles.pageHeader}>
          <h1 style={styles.title}>Export & Download</h1>
          <p style={styles.subtitle}>
            Generate and download reports and data exports
          </p>
        </div>

        {/* Report Downloads Section */}
        <div>
          <h2 style={styles.sectionTitle}>Report Downloads</h2>
          <div style={styles.grid}>
            {REPORTS.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                isLoading={loadingReport === report.id}
                onDownload={handleDownloadReport}
                styles={styles}
              />
            ))}
          </div>
        </div>

        {/* Data Exports Section */}
        <div>
          <h2 style={styles.sectionTitle}>Data Exports</h2>
          <div style={styles.grid}>
            {DATA_EXPORTS.map((dataExport) => (
              <DataExportCard
                key={dataExport.id}
                export={dataExport}
                isLoading={loadingCsv === dataExport.id}
                onDownload={handleDownloadCsv}
                styles={styles}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ report, isLoading, onDownload, styles }) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      style={{
        ...styles.card,
        ...(isHovered && styles.cardHover),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.cardIcon}>{report.icon}</div>
      <h3 style={styles.cardTitle}>{report.title}</h3>
      <p style={styles.cardDescription}>{report.description}</p>
      <button
        style={{
          ...styles.button,
          ...(isHovered && !isLoading && styles.buttonHover),
          ...(isLoading && styles.buttonDisabled),
        }}
        onClick={() => onDownload(report.id)}
        disabled={isLoading}
      >
        {isLoading ? 'Downloading...' : 'Download'}
      </button>
    </div>
  );
}

function DataExportCard({ export: dataExport, isLoading, onDownload, styles }) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      style={{
        ...styles.card,
        ...(isHovered && styles.cardHover),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.cardIcon}>{dataExport.icon}</div>
      <h3 style={styles.cardTitle}>{dataExport.title}</h3>
      <p style={styles.cardDescription}>{dataExport.description}</p>
      <button
        style={{
          ...styles.button,
          ...(isHovered && !isLoading && styles.buttonHover),
          ...(isLoading && styles.buttonDisabled),
        }}
        onClick={() => onDownload(dataExport.id)}
        disabled={isLoading}
      >
        {isLoading ? 'Exporting...' : 'Export CSV'}
      </button>
    </div>
  );
}
