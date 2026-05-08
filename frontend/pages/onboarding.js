import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

// 4-step post-signup wizard (§2.3). Backend at /api/onboarding/*.
// Already-completed users redirect to /dashboard unless ?force=1.
export default function Onboarding() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const tokenHeader = () => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('ecomera_token') : null;
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  // Hydrate state from /progress. If completed and no ?force=1, bounce to dashboard.
  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;
    fetch(`${API_URL}/api/onboarding/progress`, { headers: tokenHeader() })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) {
          // 401 = no token → /login. Anything else → swallow, start at step 1.
          if (d?.detail?.includes('Authentication')) {
            router.push('/login');
            return;
          }
          setStep(1);
          setLoading(false);
          return;
        }
        if (d.completed && !router.query.force) {
          router.push('/');
          return;
        }
        setStep(d.current_step || 1);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setStep(1);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [router.isReady, router.query.force]);

  const advance = async (currentStep) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/onboarding/progress`, {
        method: 'PUT',
        headers: { ...tokenHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: currentStep }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Failed to advance.');
      }
      if (currentStep >= 4) {
        router.push('/');
      } else {
        setStep(currentStep + 1);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const skipAll = async () => {
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/api/onboarding/skip-all`, {
        method: 'POST',
        headers: tokenHeader(),
      });
      router.push('/');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <p style={{ color: '#888', textAlign: 'center' }}>Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: '#FFD700', margin: 0, fontSize: 28 }}>Welcome to Ecom Era</h1>
        <p style={{ color: '#888', marginTop: 8 }}>Get to value in under 3 minutes.</p>
        <ProgressBar step={step} />
      </div>

      {error && (
        <div style={errorBox}>
          {error}
        </div>
      )}

      {step === 1 && (
        <StepClient
          submitting={submitting}
          onContinue={() => advance(1)}
          API_URL={API_URL}
          tokenHeader={tokenHeader}
          onError={setError}
        />
      )}
      {step === 2 && <StepAmazon submitting={submitting} onContinue={() => advance(2)} />}
      {step === 3 && (
        <StepInvite
          submitting={submitting}
          onContinue={() => advance(3)}
          API_URL={API_URL}
          tokenHeader={tokenHeader}
          onError={setError}
        />
      )}
      {step === 4 && (
        <StepScan
          submitting={submitting}
          onContinue={() => advance(4)}
          API_URL={API_URL}
          tokenHeader={tokenHeader}
          onError={setError}
        />
      )}

      {step > 1 && (
        <p style={{ textAlign: 'center', marginTop: 32 }}>
          <button onClick={skipAll} disabled={submitting} style={skipBtn}>
            Skip for now
          </button>
        </p>
      )}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      color: '#FFFFFF',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: 32,
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

function ProgressBar({ step }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          style={{
            flex: 1,
            height: 4,
            background: n <= step ? '#FFD700' : '#333',
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

function StepClient({ submitting, onContinue, API_URL, tokenHeader, onError }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    onError(null);
    try {
      if (name.trim()) {
        const res = await fetch(`${API_URL}/clients`, {
          method: 'POST',
          headers: { ...tokenHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.detail || 'Could not add client.');
        }
      }
      await onContinue();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 style={h2}>Add your first client</h2>
      <p style={pMuted}>The wholesale brand or supplier you'll be tracking.</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Acme Wholesale"
        style={inputStyle}
      />
      <button
        onClick={submit}
        disabled={busy || submitting}
        style={primaryBtn}
      >
        {busy ? 'Saving…' : (name.trim() ? 'Add & Continue' : 'Skip')}
      </button>
    </Card>
  );
}

function StepAmazon({ submitting, onContinue }) {
  return (
    <Card>
      <h2 style={h2}>Connect Amazon Seller Central</h2>
      <p style={pMuted}>SP-API integration is coming soon. Continue to skip for now.</p>
      <button onClick={onContinue} disabled={submitting} style={primaryBtn}>
        Continue
      </button>
    </Card>
  );
}

function StepInvite({ submitting, onContinue, API_URL, tokenHeader, onError }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('manager');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    onError(null);
    try {
      if (email.trim()) {
        const res = await fetch(`${API_URL}/api/onboarding/invite`, {
          method: 'POST',
          headers: { ...tokenHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), role }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          // 402 = tier cap; 400 = duplicate; 403 = role-gated. Surface details.
          throw new Error(d.detail || 'Could not send invite.');
        }
      }
      await onContinue();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 style={h2}>Invite your team</h2>
      <p style={pMuted}>Add up to 2 more on the Scout plan. Upgrade for bigger teams.</p>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="teammate@example.com"
        type="email"
        style={inputStyle}
      />
      <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
        <option value="manager">Manager</option>
        <option value="admin">Admin</option>
        <option value="viewer">Viewer</option>
      </select>
      <button onClick={submit} disabled={busy || submitting} style={primaryBtn}>
        {busy ? 'Sending…' : (email.trim() ? 'Send & Continue' : 'Skip')}
      </button>
    </Card>
  );
}

function StepScan({ submitting, onContinue, API_URL, tokenHeader, onError }) {
  const [busy, setBusy] = useState(false);

  const runScan = async () => {
    setBusy(true);
    onError(null);
    try {
      // Demo scan against existing scouted ASINs (no Keepa cost).
      // 402 here = tier cap on ai_scans; surface the upgrade prompt.
      const res = await fetch(`${API_URL}/product-radar/scan`, {
        headers: tokenHeader(),
      });
      if (!res.ok && res.status !== 402) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Scan failed.');
      }
      await onContinue();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 style={h2}>Run your first Product Radar scan</h2>
      <p style={pMuted}>
        We'll rank your scouted ASINs by composite opportunity score so you can
        see how the platform thinks. No Keepa tokens used.
      </p>
      <button onClick={runScan} disabled={busy || submitting} style={primaryBtn}>
        {busy ? 'Scanning…' : 'Run Demo Scan'}
      </button>
    </Card>
  );
}

function Card({ children }) {
  return (
    <div style={{
      background: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: 12,
      padding: 32,
    }}>
      {children}
    </div>
  );
}

const h2 = { color: '#FFFFFF', fontSize: 20, marginTop: 0, marginBottom: 12 };
const pMuted = { color: '#888', fontSize: 14, marginBottom: 24 };

const inputStyle = {
  width: '100%',
  padding: 12,
  marginBottom: 16,
  background: '#0A0A0A',
  border: '1px solid #1E1E1E',
  borderRadius: 6,
  color: '#FFFFFF',
  fontSize: 14,
  boxSizing: 'border-box',
};

const primaryBtn = {
  width: '100%',
  padding: 14,
  background: '#FFD700',
  color: '#0A0A0A',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

const skipBtn = {
  background: 'transparent',
  border: '1px solid #333',
  color: '#888',
  padding: '8px 16px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
};

const errorBox = {
  padding: '12px 16px',
  background: '#1E1E1E',
  border: '1px solid #CD7F32',
  borderRadius: 6,
  color: '#FFD700',
  marginBottom: 16,
  fontSize: 13,
};
