import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import DataTable from '../components/DataTable';
import api from '../lib/api';

const styles = {
  outerContainer: { display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' },
  container: {
    flex: 1, marginLeft: '250px', padding: '32px',
    color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  header: { marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: 700, marginBottom: '4px' },
  subtitle: { fontSize: '14px', color: '#A0A0A0' },
  tabsContainer: {
    display: 'flex', gap: '8px', borderBottom: '1px solid #1E1E1E',
    marginBottom: '24px', overflowX: 'auto',
  },
  tab: {
    padding: '12px 20px', backgroundColor: 'transparent', border: 'none',
    color: '#A0A0A0', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
    borderBottom: '2px solid transparent', whiteSpace: 'nowrap',
  },
  tabActive: { color: '#FFD000', borderBottomColor: '#FFD000' },
  card: {
    backgroundColor: '#111111', border: '1px solid #1E1E1E',
    borderRadius: '8px', padding: '20px', marginBottom: '16px',
  },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px', marginBottom: '20px',
  },
  kpiCard: {
    backgroundColor: '#111111', border: '1px solid #1E1E1E',
    borderRadius: '8px', padding: '16px',
  },
  kpiLabel: {
    fontSize: '12px', color: '#A0A0A0', fontWeight: 500, marginBottom: '6px',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  kpiValue: { fontSize: '24px', fontWeight: 700, color: '#FFD000' },
  noticeCard: {
    backgroundColor: '#111111', border: '1px solid #1E1E1E',
    borderRadius: '8px', padding: '32px 24px', textAlign: 'center',
    color: '#FFFFFF',
  },
};

function DailyLogsTab({ logs, loading, error, onRefetch }) {
  if (loading) return <LoadingSkeleton type="table" rows={5} />;
  if (error) {
    return <ErrorBanner message={error} title="Couldn't load daily logs" onRetry={onRefetch} />;
  }
  if (!logs || logs.length === 0) {
    return (
      <EmptyState
        entity="report"
        title="No daily logs yet"
        message="Daily reports submitted via the DWM module appear here. They aggregate into the weekly summary and leaderboard."
      />
    );
  }

  const columns = [
    { key: 'logDate', label: 'Date', sortable: true },
    { key: 'roleType', label: 'Role' },
    {
      key: 'productsHunted',
      label: 'Products',
      align: 'right',
      sortable: true,
      render: (r) => Number(r.productsHunted) || 0,
    },
    {
      key: 'brandsContacted',
      label: 'Brands',
      align: 'right',
      sortable: true,
      render: (r) => Number(r.brandsContacted) || 0,
    },
    { key: 'notes', label: 'Notes', render: (r) => (r.notes || '').slice(0, 80) },
  ];

  return (
    <DataTable
      columns={columns}
      rows={logs}
      rowKey="id"
      searchableFields={['logDate', 'roleType', 'notes']}
      pageSize={25}
    />
  );
}

function DashboardTab({ dashboard, loading, error, onRefetch }) {
  if (loading) return <LoadingSkeleton type="full" />;
  if (error) {
    return <ErrorBanner message={error} title="Couldn't load DWM dashboard" onRetry={onRefetch} />;
  }
  if (!dashboard) return <EmptyState entity="report" />;

  const totals = dashboard.totals || dashboard || {};
  return (
    <div>
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Products Hunted</div>
          <div style={styles.kpiValue}>{Number(totals.productsHunted) || 0}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Brands Contacted</div>
          <div style={styles.kpiValue}>{Number(totals.brandsContacted) || 0}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Approvals</div>
          <div style={styles.kpiValue}>{Number(totals.approvals) || 0}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Submissions</div>
          <div style={styles.kpiValue}>{Number(totals.submissions) || 0}</div>
        </div>
      </div>
    </div>
  );
}

function LeaderboardTab({ leaderboard, loading, error, onRefetch }) {
  if (loading) return <LoadingSkeleton type="table" rows={6} />;
  if (error) {
    return <ErrorBanner message={error} title="Couldn't load leaderboard" onRetry={onRefetch} />;
  }
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <EmptyState
        entity="report"
        title="No leaderboard data yet"
        message="Once managers submit daily DWM reports, top performers will rank here by approved + purchased + profitable products."
      />
    );
  }

  const columns = [
    { key: 'manager', label: 'Manager', sortable: true },
    { key: 'approved', label: 'Approved', align: 'right', sortable: true },
    { key: 'purchased', label: 'Purchased', align: 'right', sortable: true },
    { key: 'profitable', label: 'Profitable', align: 'right', sortable: true },
    {
      key: 'revenue',
      label: 'Revenue',
      align: 'right',
      sortable: true,
      render: (r) => (Number(r.revenue) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
    },
    { key: 'score', label: 'Score', align: 'right', sortable: true },
  ];

  return (
    <DataTable
      columns={columns}
      rows={leaderboard}
      rowKey="manager"
      searchableFields={['manager']}
      pageSize={25}
    />
  );
}

// ── Submit Daily Form (BUG-29, Sprint 2 A1) ────────────────────────────────
//
// Replaces the long-running placeholder with a real form mapped to
// backend POST /dwm/daily (backend/dwm_reporting.py:194). The backend
// schema is:
//   log_date    str  YYYY-MM-DD (required)
//   role_type   str  "account_manager" | "sourcing_executive"
//   products    list of {asin, product_name, brand, category, brand_url}
//   brands      list of {brand_name, distributor_name, category, contact_method, contact_status}
//   notes       str  optional
//
// Backend enforces one-log-per-user-per-date — duplicate returns 400
// "Daily log already exists for {date}…". The form catches that and
// surfaces a banner with a "Use a different date" affordance.

const submitStyles = {
  sectionTitle: {
    fontSize: '14px', fontWeight: 700, color: '#FFD000',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    paddingBottom: '8px', marginBottom: '16px',
    borderBottom: '2px solid #FFD000',
  },
  fieldGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px', marginBottom: '12px',
  },
  label: {
    display: 'block', fontSize: '12px', color: '#A0A0A0',
    marginBottom: '4px', fontWeight: 500,
  },
  // YB convention: input cells light yellow #FFFDE7 with blue text.
  input: {
    width: '100%', padding: '8px 10px', fontSize: '14px',
    backgroundColor: '#FFFDE7', color: '#1F3A8A',
    border: '1px solid #E5E5E5', borderRadius: '4px',
    boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none',
  },
  rowCard: (alt) => ({
    backgroundColor: alt ? '#0E0E0E' : '#141414',
    border: '1px solid #1E1E1E', borderRadius: '6px',
    padding: '12px', marginBottom: '10px',
  }),
  removeLink: {
    background: 'transparent', border: 'none', color: '#C86464',
    fontSize: '12px', cursor: 'pointer', padding: 0, marginTop: '6px',
  },
  addBtn: {
    background: 'transparent', color: '#FFD000',
    border: '1px dashed #FFD000', borderRadius: '6px',
    padding: '8px 14px', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', marginBottom: '20px',
  },
  textarea: {
    width: '100%', minHeight: '90px', padding: '10px 12px', fontSize: '14px',
    backgroundColor: '#FFFDE7', color: '#1F3A8A',
    border: '1px solid #E5E5E5', borderRadius: '4px',
    boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', outline: 'none',
  },
  submitBtn: (disabled) => ({
    width: '100%', padding: '12px 20px', fontSize: '15px', fontWeight: 700,
    backgroundColor: disabled ? '#666666' : '#FFD000',
    color: disabled ? '#CCCCCC' : '#1A1A1A',
    border: 'none', borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
  }),
  spinner: {
    width: '14px', height: '14px',
    border: '2px solid #1A1A1A', borderTopColor: 'transparent',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  banner: (variant) => ({
    padding: '12px 14px', borderRadius: '6px', marginBottom: '16px',
    fontSize: '13px', lineHeight: 1.5,
    backgroundColor: variant === 'error' ? '#2B1111' : variant === 'duplicate' ? '#3F2F1B' : '#112B1F',
    border: `1px solid ${variant === 'error' ? '#664444' : variant === 'duplicate' ? '#FFD000' : '#446644'}`,
    color: variant === 'error' ? '#FF6B6B' : variant === 'duplicate' ? '#FFD000' : '#6BFF9F',
  }),
};

const todayISO = () => new Date().toISOString().slice(0, 10);

function emptyProduct() {
  return { asin: '', product_name: '', brand: '', category: '', brand_url: '' };
}
function emptyBrand() {
  return { brand_name: '', distributor_name: '', category: '', contact_method: 'email', contact_status: 'pending' };
}

function isProductRowFilled(p) {
  return Boolean((p.asin || '').trim() || (p.product_name || '').trim());
}
function isBrandRowFilled(b) {
  return Boolean((b.brand_name || '').trim());
}

function SubmitDailyTab({ onSubmitted }) {
  const [logDate, setLogDate] = useState(todayISO());
  const [roleType, setRoleType] = useState('account_manager');
  const [products, setProducts] = useState([emptyProduct()]);
  const [brands, setBrands] = useState([emptyBrand()]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [duplicateMsg, setDuplicateMsg] = useState('');
  const [validationError, setValidationError] = useState('');

  const reset = () => {
    setLogDate(todayISO());
    setRoleType('account_manager');
    setProducts([emptyProduct()]);
    setBrands([emptyBrand()]);
    setNotes('');
    setError('');
    setDuplicateMsg('');
    setValidationError('');
  };

  const setProductField = (idx, field, value) => {
    setProducts((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };
  const setBrandField = (idx, field, value) => {
    setBrands((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  // Validation mirroring spec: date required & ≤ today, role required,
  // at least one filled product OR brand row.
  const filledProducts = products.filter(isProductRowFilled);
  const filledBrands = brands.filter(isBrandRowFilled);
  const dateValid = logDate && logDate <= todayISO();
  const hasContent = filledProducts.length > 0 || filledBrands.length > 0 || (notes || '').trim().length > 0;
  const canSubmit = dateValid && roleType && hasContent && !submitting;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError('');
    setDuplicateMsg('');
    setValidationError('');

    if (!dateValid) {
      setValidationError('Pick a valid date (today or earlier).');
      return;
    }
    if (!hasContent) {
      setValidationError('Add at least one product, one brand contacted, or notes.');
      return;
    }

    setSubmitting(true);
    // Submit MUST use AbortController + 15s timeout (Sprint 1 pattern).
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const payload = {
        log_date: logDate,
        role_type: roleType,
        products: filledProducts,
        brands: filledBrands,
        notes: (notes || '').trim(),
      };
      const res = await api.post('/dwm/daily', payload, { signal: controller.signal });
      // Success — onSubmitted handles tab switch + refetch + toast.
      reset();
      if (onSubmitted) onSubmitted(res?.data);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') {
        setError('Submission timed out after 15 seconds. Please try again.');
      } else {
        const detail = err?.response?.data?.detail;
        if (typeof detail === 'string' && detail.toLowerCase().includes('already exists')) {
          setDuplicateMsg(detail);
        } else {
          setError(detail || err?.message || 'Failed to submit daily log.');
        }
      }
    } finally {
      clearTimeout(timeoutId);
      setSubmitting(false);
    }
  };

  const useDifferentDate = () => {
    setDuplicateMsg('');
    // Roll back one day so the user can fix without re-typing.
    const d = new Date(logDate);
    d.setDate(d.getDate() - 1);
    setLogDate(d.toISOString().slice(0, 10));
  };

  return (
    <form onSubmit={handleSubmit}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {duplicateMsg && (
        <div style={submitStyles.banner('duplicate')}>
          {duplicateMsg}{' '}
          <button type="button" onClick={useDifferentDate} style={{ ...submitStyles.removeLink, color: '#FFD000', textDecoration: 'underline' }}>
            Use a different date
          </button>
        </div>
      )}
      {error && <div style={submitStyles.banner('error')}>{error}</div>}
      {validationError && <div style={submitStyles.banner('error')}>{validationError}</div>}

      {/* Header card: date + role */}
      <div style={styles.card}>
        <div style={submitStyles.sectionTitle}>Log Details</div>
        <div style={submitStyles.fieldGrid}>
          <div>
            <label style={submitStyles.label}>Date *</label>
            <input
              type="date"
              value={logDate}
              max={todayISO()}
              onChange={(e) => setLogDate(e.target.value)}
              style={submitStyles.input}
              required
            />
          </div>
          <div>
            <label style={submitStyles.label}>Role *</label>
            <select
              value={roleType}
              onChange={(e) => setRoleType(e.target.value)}
              style={submitStyles.input}
            >
              <option value="account_manager">Account Manager</option>
              <option value="sourcing_executive">Sourcing Executive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products hunted */}
      <div style={styles.card}>
        <div style={submitStyles.sectionTitle}>Products Hunted</div>
        {products.map((p, idx) => (
          <div key={idx} style={submitStyles.rowCard(idx % 2 === 1)}>
            <div style={submitStyles.fieldGrid}>
              <div>
                <label style={submitStyles.label}>ASIN</label>
                <input
                  type="text" value={p.asin} maxLength={10}
                  onChange={(e) => setProductField(idx, 'asin', e.target.value.trim().toUpperCase())}
                  placeholder="B0XXXXXXXX" style={submitStyles.input}
                />
              </div>
              <div>
                <label style={submitStyles.label}>Product Name</label>
                <input
                  type="text" value={p.product_name}
                  onChange={(e) => setProductField(idx, 'product_name', e.target.value)}
                  style={submitStyles.input}
                />
              </div>
              <div>
                <label style={submitStyles.label}>Brand</label>
                <input
                  type="text" value={p.brand}
                  onChange={(e) => setProductField(idx, 'brand', e.target.value)}
                  style={submitStyles.input}
                />
              </div>
              <div>
                <label style={submitStyles.label}>Category</label>
                <input
                  type="text" value={p.category}
                  onChange={(e) => setProductField(idx, 'category', e.target.value)}
                  style={submitStyles.input}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={submitStyles.label}>Brand URL</label>
                <input
                  type="url" value={p.brand_url}
                  onChange={(e) => setProductField(idx, 'brand_url', e.target.value)}
                  placeholder="https://"
                  style={submitStyles.input}
                />
              </div>
            </div>
            {products.length > 1 && (
              <button
                type="button" style={submitStyles.removeLink}
                onClick={() => setProducts((rows) => rows.filter((_, i) => i !== idx))}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button" style={submitStyles.addBtn}
          onClick={() => setProducts((rows) => [...rows, emptyProduct()])}
        >
          + Add Product
        </button>
      </div>

      {/* Brands contacted */}
      <div style={styles.card}>
        <div style={submitStyles.sectionTitle}>Brands Contacted</div>
        {brands.map((b, idx) => (
          <div key={idx} style={submitStyles.rowCard(idx % 2 === 1)}>
            <div style={submitStyles.fieldGrid}>
              <div>
                <label style={submitStyles.label}>Brand Name</label>
                <input
                  type="text" value={b.brand_name}
                  onChange={(e) => setBrandField(idx, 'brand_name', e.target.value)}
                  style={submitStyles.input}
                />
              </div>
              <div>
                <label style={submitStyles.label}>Distributor</label>
                <input
                  type="text" value={b.distributor_name}
                  onChange={(e) => setBrandField(idx, 'distributor_name', e.target.value)}
                  style={submitStyles.input}
                />
              </div>
              <div>
                <label style={submitStyles.label}>Category</label>
                <input
                  type="text" value={b.category}
                  onChange={(e) => setBrandField(idx, 'category', e.target.value)}
                  style={submitStyles.input}
                />
              </div>
              <div>
                <label style={submitStyles.label}>Contact Method</label>
                <select
                  value={b.contact_method}
                  onChange={(e) => setBrandField(idx, 'contact_method', e.target.value)}
                  style={submitStyles.input}
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="website">Website</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={submitStyles.label}>Status</label>
                <select
                  value={b.contact_status}
                  onChange={(e) => setBrandField(idx, 'contact_status', e.target.value)}
                  style={submitStyles.input}
                >
                  <option value="pending">Pending</option>
                  <option value="responded">Responded</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            {brands.length > 1 && (
              <button
                type="button" style={submitStyles.removeLink}
                onClick={() => setBrands((rows) => rows.filter((_, i) => i !== idx))}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button" style={submitStyles.addBtn}
          onClick={() => setBrands((rows) => [...rows, emptyBrand()])}
        >
          + Add Brand
        </button>
      </div>

      {/* Notes */}
      <div style={styles.card}>
        <div style={submitStyles.sectionTitle}>Notes</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything that didn't fit in the rows above…"
          style={submitStyles.textarea}
        />
      </div>

      {/* Submit */}
      <button type="submit" style={submitStyles.submitBtn(!canSubmit)} disabled={!canSubmit}>
        {submitting ? (<><span style={submitStyles.spinner} /> Submitting…</>) : 'Submit Daily Log'}
      </button>
    </form>
  );
}

export default function DWMPage() {
  const [activeTab, setActiveTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsRes, dashRes, leaderRes] = await Promise.allSettled([
        api.get('/dwm/daily'),
        api.get('/dwm/dashboard'),
        api.get('/dwm/leaderboard'),
      ]);

      if (logsRes.status === 'fulfilled') {
        const ldata = logsRes.value?.data;
        const list = Array.isArray(ldata) ? ldata : Array.isArray(ldata?.logs) ? ldata.logs : [];
        setLogs(list);
      } else {
        setLogs([]);
      }

      if (dashRes.status === 'fulfilled') {
        setDashboard(dashRes.value?.data || null);
      } else {
        setDashboard(null);
      }

      if (leaderRes.status === 'fulfilled') {
        const ldata = leaderRes.value?.data;
        const list = Array.isArray(ldata)
          ? ldata
          : Array.isArray(ldata?.leaderboard)
            ? ldata.leaderboard
            : [];
        setLeaderboard(list);
      } else {
        setLeaderboard([]);
      }
    } catch (e) {
      setError(e?.message || 'Failed to load DWM data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const tabs = [
    { id: 'logs', label: 'Daily Logs' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'submit', label: 'Submit Daily' },
  ];

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>DWM Reporting</div>
          <div style={styles.subtitle}>Daily / Weekly / Monthly logs, dashboard, and leaderboard</div>
        </div>

        <div style={styles.tabsContainer}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              style={{ ...styles.tab, ...(activeTab === t.id ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'logs' && (
          <DailyLogsTab logs={logs} loading={loading} error={error} onRefetch={fetchAll} />
        )}
        {activeTab === 'dashboard' && (
          <DashboardTab dashboard={dashboard} loading={loading} error={error} onRefetch={fetchAll} />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardTab
            leaderboard={leaderboard}
            loading={loading}
            error={error}
            onRefetch={fetchAll}
          />
        )}
        {activeTab === 'submit' && (
          <SubmitDailyTab
            onSubmitted={async () => {
              setToast('Daily log submitted.');
              setTimeout(() => setToast(''), 3000);
              setActiveTab('logs');
              await fetchAll();
            }}
          />
        )}
      </div>

      {/* Success toast — minimal inline so no extra dep. */}
      {toast && (
        <div
          style={{
            position: 'fixed', top: '20px', right: '20px',
            padding: '12px 18px', borderRadius: '6px',
            backgroundColor: '#112B1F', border: '1px solid #446644',
            color: '#6BFF9F', fontSize: '14px', fontWeight: 500,
            zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
