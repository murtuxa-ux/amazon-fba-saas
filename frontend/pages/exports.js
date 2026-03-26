import { useState } from 'react';
import Sidebar from '../components/Sidebar';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

const T = {
  bg: '#0A0A0A',
  card: '#111111',
  border: '#1E1E1E',
  yellow: '#FFD700',
  text: '#FFFFFF',
  textSec: '#888888',
  textMut: '#444444',
  green: '#22C55E',
  red: '#EF4444',
  blue: '#3B82F6',
};

const authHeader = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ecomera_token') : null;
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const ExportButton = ({ label, icon, dataType, format = 'csv', onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setStatus({ type: 'loading', message: 'Exporting...' });

      const endpoint = format === 'csv'
        ? `${API}/export/csv/${dataType}`
        : `${API}/export/report/${dataType}`;

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: authHeader(),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${dataType}-export-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setStatus({ type: 'success', message: 'Downloaded successfully!' });
        onStatusChange({ type: 'success', message: `${label} downloaded` });
      } else {
        setStatus({ type: 'error', message: 'Download failed' });
        onStatusChange({ type: 'error', message: `Failed to download ${label}` });
      }
    } catch (e) {
      console.error('Export error:', e);
      setStatus({ type: 'error', message: 'Error exporting data' });
      onStatusChange({ type: 'error', message: `Error exporting ${label}` });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: T.text, margin: 0 }}>
            {label}
          </h3>
          <p style={{ fontSize: '12px', color: T.textSec, margin: '4px 0 0' }}>
            Export as {format.toUpperCase()}
          </p>
        </div>
      </div>
      <button
        onClick={handleExport}
        disabled={loading}
        style={{
          width: '100%',
          backgroundColor: loading ? T.border : T.yellow,
          color: loading ? T.textMut : '#000',
          border: 'none',
          borderRadius: '6px',
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: loading ? 'default' : 'pointer',
          transition: 'all 0.2s',
          opacity: loading ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = T.yellow;
            e.currentTarget.style.opacity = '0.9';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.opacity = '1';
          }
        }}
      >
        {loading ? '⟳ Exporting...' : '↓ Download'}
      </button>
      {status && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          backgroundColor:
            status.type === 'success' ? T.green + '20' :
            status.type === 'error' ? T.red + '20' :
            T.blue + '20',
          color:
            status.type === 'success' ? T.green :
            status.type === 'error' ? T.red :
            T.blue,
        }}>
          {status.message}
        </div>
      )}
    </div>
  );
};

export default function ExportCenter() {
  const [lastMessage, setLastMessage] = useState(null);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: T.bg }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', maxHeight: '100vh' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: T.text, marginBottom: '8px' }}>
          Export Center
        </h1>
        <p style={{ fontSize: '14px', color: T.textSec, marginBottom: '40px' }}>
          Download your data in CSV and PDF formats
        </p>

        {lastMessage && (
          <div style={{
            backgroundColor: lastMessage.type === 'success' ? T.green + '20' : T.red + '20',
            border: `1px solid ${lastMessage.type === 'success' ? T.green : T.red}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            color: lastMessage.type === 'success' ? T.green : T.red,
            fontSize: '14px',
          }}>
            {lastMessage.message}
          </div>
        )}

        {/* CSV Exports */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: T.text, marginBottom: '16px', paddingBottom: '12px', borderBottom: `1px solid ${T.border}` }}>
            CSV Exports
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <ExportButton
              label="Products"
              icon="📦"
              dataType="products"
              format="csv"
              onStatusChange={setLastMessage}
            />
            <ExportButton
              label="Clients"
              icon="👥"
              dataType="clients"
              format="csv"
              onStatusChange={setLastMessage}
            />
            <ExportButton
              label="Scout Results"
              icon="🔍"
              dataType="scout"
              format="csv"
              onStatusChange={setLastMessage}
            />
            <ExportButton
              label="Weekly Reports"
              icon="📊"
              dataType="weekly"
              format="csv"
              onStatusChange={setLastMessage}
            />
          </div>
        </div>

        {/* PDF Exports */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: T.text, marginBottom: '16px', paddingBottom: '12px', borderBottom: `1px solid ${T.border}` }}>
            PDF Reports
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <ExportButton
              label="Monthly Report"
              icon="📄"
              dataType="monthly"
              format="pdf"
              onStatusChange={setLastMessage}
            />
            <ExportButton
              label="Quarterly Report"
              icon="📈"
              dataType="quarterly"
              format="pdf"
              onStatusChange={setLastMessage}
            />
            <ExportButton
              label="Annual Summary"
              icon="📋"
              dataType="annual"
              format="pdf"
              onStatusChange={setLastMessage}
            />
            <ExportButton
              label="Scout Analysis"
              icon="🎯"
              dataType="scout_report"
              format="pdf"
              onStatusChange={setLastMessage}
            />
          </div>
        </div>

        {/* Info Section */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px', marginTop: '40px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: T.text, marginBottom: '12px' }}>
            About Exports
          </h3>
          <ul style={{ fontSize: '14px', color: T.textSec, margin: 0, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>CSV Format:</strong> Compatible with Excel, Google Sheets, and other spreadsheet applications
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>PDF Reports:</strong> Professional formatted reports ready for sharing with clients
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>Data Included:</strong> All current data at the time of export (from last 12 months for reports)
            </li>
            <li>
              <strong>File Size:</strong> Exports are optimized and compressed for easy sharing
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
