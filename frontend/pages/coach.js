import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const styles = {
  outerContainer: { display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' },
  container: { flex: 1, marginLeft: '250px', padding: '32px', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  header: { marginBottom: '24px' },
  title: { fontSize: '32px', fontWeight: '700', marginBottom: '8px', color: '#FFFFFF' },
  subtitle: { fontSize: '14px', color: '#999999' },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' },
  statCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '6px', padding: '14px 16px', borderBottom: '2px solid #FFD000' },
  statLabel: { fontSize: '11px', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
  statValue: { fontSize: '22px', fontWeight: '700', color: '#FFFFFF' },
  statValueGold: { fontSize: '22px', fontWeight: '700', color: '#FFD000' },

  errorBanner: { padding: '12px 16px', backgroundColor: '#2A1E1E', border: '1px solid #5D1F1F', borderRadius: '6px', color: '#FF8888', fontSize: '13px', marginBottom: '16px' },
  emptyState: { padding: '48px 32px', textAlign: 'center', color: '#666666', fontSize: '14px', backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px' },

  actionCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', marginBottom: '14px', borderLeft: '4px solid #FFD000' },
  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' },
  actionTypeRow: { fontSize: '11px', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
  actionTitle: { fontSize: '16px', fontWeight: '600', color: '#FFFFFF', lineHeight: 1.4 },
  actionReasoning: { fontSize: '13px', color: '#BBBBBB', marginTop: '8px', lineHeight: 1.5 },
  impactWrap: { textAlign: 'right', whiteSpace: 'nowrap', minWidth: '100px' },
  impactValue: { fontSize: '24px', fontWeight: '700', color: '#FFD000' },
  impactLabel: { fontSize: '11px', color: '#999999', marginTop: '2px' },
  asinChip: { display: 'inline-block', padding: '2px 8px', fontSize: '11px', fontFamily: 'monospace', color: '#FFD000', backgroundColor: '#1A1A1A', borderRadius: '3px', marginLeft: '8px' },
  buttonRow: { display: 'flex', gap: '10px', marginTop: '16px' },
  buttonComplete: { padding: '7px 14px', fontSize: '12px', fontWeight: '600', backgroundColor: '#FFD000', color: '#1A1A1A', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  buttonDismiss: { padding: '7px 14px', fontSize: '12px', fontWeight: '500', backgroundColor: '#1E1E1E', color: '#CCCCCC', border: '1px solid #2A2A2A', borderRadius: '6px', cursor: 'pointer' },
  buttonDisabled: { opacity: 0.5, cursor: 'not-allowed' },

  refreshRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  refreshButton: { padding: '7px 14px', fontSize: '12px', fontWeight: '500', backgroundColor: '#1E1E1E', color: '#CCCCCC', border: '1px solid #2A2A2A', borderRadius: '6px', cursor: 'pointer' },
};

const URGENCY_BORDER = {
  critical: '#FF4444',
  high: '#FFAA44',
  medium: '#FFD000',
  low: '#888888',
};

const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ecomera_token');
};

const getUserRole = () => {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('ecomera_user');
    if (!raw) return '';
    const u = JSON.parse(raw);
    return (u && u.role) || '';
  } catch (e) {
    return '';
  }
};

const formatActionType = (t) => (t || '').replace(/_/g, ' ');

export default function CoachPage() {
  const [actions, setActions] = useState([]);
  const [pending, setPending] = useState(0);
  const [dismissedToday, setDismissedToday] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState({});
  const [role, setRole] = useState('');

  const isAdmin = role === 'owner' || role === 'admin';

  const loadFeed = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError('Not signed in.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/coach/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || `Coach feed failed (${res.status}).`);
        setActions([]);
      } else {
        setActions(Array.isArray(data.actions) ? data.actions : []);
        setPending(data.total_pending || 0);
        setDismissedToday(data.total_dismissed_today || 0);
        setCompletedToday(data.total_completed_today || 0);
      }
    } catch (e) {
      setError(e.message || 'Coach feed failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAction = useCallback(async (id, endpoint) => {
    const token = getToken();
    if (!token) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const res = await fetch(`${BASE_URL}/coach/${endpoint}/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || `Action ${endpoint} failed (${res.status}).`);
      } else {
        setActions((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (e) {
      setError(e.message || `Action ${endpoint} failed.`);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }, []);

  const regenerate = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/coach/regenerate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || `Regenerate failed (${res.status}).`);
        setLoading(false);
        return;
      }
    } catch (e) {
      setError(e.message || 'Regenerate failed.');
      setLoading(false);
      return;
    }
    await loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    setRole(getUserRole());
    loadFeed();
  }, [loadFeed]);

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>AI Coach — Today&apos;s Top Actions</h1>
          <p style={styles.subtitle}>
            Ranked by estimated dollar impact across BuyBox alerts and PPC spend. Click-to-execute — every action lands you on Seller Central.
          </p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Showing</div>
            <div style={styles.statValueGold}>{(actions.length || 0).toLocaleString()}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Pending Total</div>
            <div style={styles.statValue}>{(pending || 0).toLocaleString()}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Completed Today</div>
            <div style={styles.statValue}>{(completedToday || 0).toLocaleString()}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Dismissed Today</div>
            <div style={styles.statValue}>{(dismissedToday || 0).toLocaleString()}</div>
          </div>
        </div>

        <div style={styles.refreshRow}>
          <span style={styles.subtitle}>{loading ? 'Loading…' : `${actions.length} action${actions.length === 1 ? '' : 's'} waiting`}</span>
          {isAdmin && (
            <button
              onClick={regenerate}
              disabled={loading}
              style={{ ...styles.refreshButton, ...(loading ? styles.buttonDisabled : {}) }}
            >
              Regenerate
            </button>
          )}
        </div>

        {!loading && actions.length === 0 ? (
          <div style={styles.emptyState}>
            All caught up. No pending actions for today.
          </div>
        ) : (
          actions.map((a) => (
            <div
              key={a.id}
              style={{
                ...styles.actionCard,
                borderLeft: `4px solid ${URGENCY_BORDER[a.urgency] || '#FFD000'}`,
              }}
            >
              <div style={styles.actionHeader}>
                <div style={{ flex: 1 }}>
                  <div style={styles.actionTypeRow}>
                    {formatActionType(a.action_type)} · {a.urgency || 'medium'}
                    {a.asin && <span style={styles.asinChip}>{a.asin}</span>}
                  </div>
                  <div style={styles.actionTitle}>{a.suggested_action}</div>
                  {a.reasoning && <div style={styles.actionReasoning}>{a.reasoning}</div>}
                </div>
                <div style={styles.impactWrap}>
                  <div style={styles.impactValue}>${(a.dollar_impact_est || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  <div style={styles.impactLabel}>est. weekly impact</div>
                </div>
              </div>
              <div style={styles.buttonRow}>
                <button
                  onClick={() => updateAction(a.id, 'complete')}
                  disabled={busy[a.id]}
                  style={{ ...styles.buttonComplete, ...(busy[a.id] ? styles.buttonDisabled : {}) }}
                >
                  Mark Done
                </button>
                <button
                  onClick={() => updateAction(a.id, 'dismiss')}
                  disabled={busy[a.id]}
                  style={{ ...styles.buttonDismiss, ...(busy[a.id] ? styles.buttonDisabled : {}) }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
