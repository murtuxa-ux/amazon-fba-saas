// MFA enrollment wizard (Phase B / SP-API attestation).
//
// 3-step flow:
//   1. Show QR code + secret. User scans with Google Authenticator / 1Password / Authy.
//   2. User enters a 6-digit code from the app to confirm pairing.
//   3. Show 10 recovery codes ONCE with "I saved these" gate before continuing.
//
// Each step is a self-contained <section>; advancement is gated and
// linear. The user can re-call /auth/mfa/enroll/start to regenerate the
// secret if they messed up the QR scan.

import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Sidebar from '../../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

const COLORS = {
  bgPage: '#0A0A0A',
  bgCard: '#111111',
  border: '#1E1E1E',
  gold: '#FFD000',
  white: '#FFFFFF',
  textMuted: '#A0A0A0',
  green: '#22C55E',
  red: '#EF4444',
};

const S = {
  page: { display: 'flex', minHeight: '100vh', backgroundColor: COLORS.bgPage, color: COLORS.white, fontFamily: '-apple-system, sans-serif' },
  main: { flex: 1, marginLeft: '250px', padding: '32px', overflowY: 'auto' },
  hero: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 700, margin: '0 0 8px' },
  subtitle: { fontSize: 14, color: COLORS.textMuted, margin: 0 },
  stepper: { display: 'flex', gap: 12, marginBottom: 24, fontSize: 13 },
  stepPill: (active, done) => ({
    padding: '6px 12px', borderRadius: 999, fontWeight: 600,
    background: done ? `${COLORS.green}22` : active ? `${COLORS.gold}22` : '#1E1E1E',
    color: done ? COLORS.green : active ? COLORS.gold : COLORS.textMuted,
    border: `1px solid ${done ? COLORS.green : active ? COLORS.gold : '#333'}`,
  }),
  card: { background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 24, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: 700, color: COLORS.gold, margin: '0 0 12px' },
  qrWrap: { background: COLORS.white, padding: 16, borderRadius: 8, display: 'inline-block', marginBottom: 16 },
  secret: { fontFamily: 'monospace', fontSize: 13, background: '#0A0A0A', border: `1px solid ${COLORS.border}`, padding: '8px 12px', borderRadius: 4, color: COLORS.gold, wordBreak: 'break-all', userSelect: 'all' },
  input: {
    width: '100%', maxWidth: 240, padding: '12px 14px', fontSize: 22, letterSpacing: '6px',
    fontFamily: 'monospace', textAlign: 'center',
    background: '#FFFDE7', color: '#1F3A8A', border: '1px solid #E5E5E5',
    borderRadius: 6, outline: 'none', boxSizing: 'border-box',
  },
  btn: (disabled, danger) => ({
    padding: '10px 22px', fontSize: 14, fontWeight: 700,
    background: disabled ? '#666' : danger ? COLORS.red : COLORS.gold,
    color: disabled ? '#CCC' : danger ? COLORS.white : '#1A1A1A',
    border: 'none', borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer', marginRight: 8,
  }),
  btnSecondary: { padding: '10px 22px', fontSize: 14, fontWeight: 600, background: 'transparent', color: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 6, cursor: 'pointer' },
  recoveryGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16, fontFamily: 'monospace' },
  recoveryCode: { padding: '10px 14px', background: '#0A0A0A', border: `1px solid ${COLORS.gold}`, borderRadius: 4, color: COLORS.gold, fontSize: 14, textAlign: 'center', letterSpacing: '1px' },
  banner: (variant) => ({
    padding: 12, borderRadius: 6, fontSize: 13, marginBottom: 16,
    background: variant === 'error' ? '#2B1111' : '#112B1F',
    border: `1px solid ${variant === 'error' ? '#664444' : '#446644'}`,
    color: variant === 'error' ? COLORS.red : COLORS.green,
  }),
  warn: { padding: 14, background: '#3F2F1B', border: `1px solid ${COLORS.gold}`, borderRadius: 6, color: COLORS.gold, fontSize: 13, lineHeight: 1.5, marginBottom: 16 },
};

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ecomera_token');
}

export default function MfaSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 = QR, 2 = verify, 3 = recovery
  const [secret, setSecret] = useState('');
  const [qr, setQr] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [savedAck, setSavedAck] = useState(false);
  const [copied, setCopied] = useState(false);

  // L3 (Sprint 3 late): React Strict Mode double-renders this component
  // in dev (and the same shape can happen in prod via fast-refresh /
  // route remount races). Without a lock, the useEffect fires TWICE,
  // hitting POST /auth/mfa/enroll/start twice. The second call rotates
  // the secret server-side, so the QR data URI / secret string Murtaza
  // already scanned no longer matches the stored secret. Same shape
  // for handleVerify: a double-click or fast-refresh during the
  // request fires /enroll/confirm twice. Call 1 returns 200 with the
  // 10 plaintext recovery codes; call 2 returns 400 "already enrolled"
  // with no recovery_codes field; the second response overwrites the
  // first's codes with [] → user sees an empty grid, .txt download
  // is just the header. Plaintext codes hit the floor; bcrypt hashes
  // in DB are the only thing left, and plaintext can never be recovered.
  //
  // Refs (not state) because the lock must NOT trigger a re-render
  // when flipped — flipping state would itself queue a render and
  // race with Strict-Mode's double-mount.
  const startInflight = useRef(false);
  const verifyInflight = useRef(false);

  // Step 1 — fetch the secret + QR on mount (idempotent, see L3 note above)
  useEffect(() => {
    let cancelled = false;
    if (startInflight.current) return;
    startInflight.current = true;
    (async () => {
      try {
        const token = getToken();
        const res = await fetch(`${BASE_URL}/auth/mfa/enroll/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (!cancelled) setError(body.detail || `Failed to start enrollment (${res.status}).`);
          // Do NOT reset startInflight on error — repeated mounts of a
          // failing page would otherwise dogpile the backend. The user
          // can navigate away and back to retry.
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setSecret(data.secret || '');
        setQr(data.qr_code_data_uri || '');
        setOtpauthUrl(data.otpauth_url || '');
      } catch (e) {
        if (!cancelled) setError('Connection error starting enrollment.');
      }
      // No `finally` — once started, startInflight stays true for the
      // lifetime of this component instance. Strict-Mode's second mount
      // gets a fresh ref (refs are not shared across re-renders of the
      // same component instance, but ARE per-instance), and the second
      // mount's effect short-circuits because startInflight.current
      // is already true on the first mount that survived.
      // Verified shape: useRef's initial value is preserved across
      // Strict-Mode's intentional double-invoke of the effect.
    })();
    return () => { cancelled = true; };
  }, []);

  const handleVerify = async (e) => {
    e?.preventDefault?.();
    // L3: lock against double-fire. A second click on the same step-2
    // submit (or Strict-Mode-induced re-entry) would call
    // /enroll/confirm twice. The first call writes mfa_enrolled_at and
    // returns 10 plaintext recovery codes; the second call sees
    // user.mfa_enrolled_at != None (backend/mfa.py:258) and returns
    // 400 with no recovery_codes — that response would overwrite our
    // state with [], losing the plaintext codes forever.
    if (verifyInflight.current) return;
    verifyInflight.current = true;
    setError('');
    if (!(code.length === 6 && /^\d{6}$/.test(code))) {
      setError('Enter the 6-digit code from your authenticator app.');
      verifyInflight.current = false;  // reset so user can retype
      return;
    }
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/auth/mfa/enroll/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || 'Code did not match. Try the next 6 digits.');
        verifyInflight.current = false;  // reset so user can retry with a fresh code
        return;
      }
      setRecoveryCodes(Array.isArray(data.recovery_codes) ? data.recovery_codes : []);
      setStep(3);
      // Do NOT reset verifyInflight on success. We're in step 3; any
      // retry of step 2 would be incorrect (codes are already issued,
      // and the backend would now reject as already-enrolled).
    } catch (e2) {
      setError('Connection error. Please try again.');
      verifyInflight.current = false;  // reset on network error
    } finally {
      setLoading(false);
    }
  };

  const downloadCodes = () => {
    const blob = new Blob(
      [`Ecom Era — MFA Recovery Codes\nGenerated: ${new Date().toISOString()}\n\n` + recoveryCodes.join('\n') + '\n\nKeep these safe. Each code works ONCE.'],
      { type: 'text/plain' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ecomera-mfa-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head><title>Set up MFA · Ecom Era</title></Head>
      <div style={S.page}>
        <Sidebar />
        <main style={S.main}>
          <div style={S.hero}>
            <h1 style={S.title}>Set up two-factor authentication</h1>
            <p style={S.subtitle}>
              MFA adds a second factor to your login. Required for owner and admin accounts
              before launch.
            </p>
          </div>

          <div style={S.stepper}>
            <span style={S.stepPill(step === 1, step > 1)}>1 · Scan QR</span>
            <span style={S.stepPill(step === 2, step > 2)}>2 · Verify code</span>
            <span style={S.stepPill(step === 3, false)}>3 · Save recovery codes</span>
          </div>

          {error && <div style={S.banner('error')}>{error}</div>}

          {step === 1 && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>Step 1: Scan with your authenticator app</h2>
              <p style={{ color: COLORS.textMuted, margin: '0 0 16px' }}>
                Open Google Authenticator, 1Password, Authy, or your password manager and scan
                this QR code. Or paste the secret below if your app supports manual entry.
              </p>
              {qr ? (
                <div style={S.qrWrap}>
                  {/* The data URI is generated server-side by pyotp+qrcode. */}
                  <img src={qr} alt="MFA QR code" style={{ display: 'block', width: 200, height: 200 }} />
                </div>
              ) : (
                <div style={{ color: COLORS.textMuted, marginBottom: 16 }}>Generating QR code…</div>
              )}
              {secret && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Or enter this secret manually:</div>
                  <div
                    style={{ ...S.secret, cursor: 'pointer' }}
                    onClick={async () => {
                      try {
                        if (navigator.clipboard) await navigator.clipboard.writeText(secret);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      } catch {}
                    }}
                    title="Click to copy"
                  >
                    {secret}
                  </div>
                  <div style={{ fontSize: 11, color: copied ? COLORS.green : COLORS.textMuted, marginTop: 4, height: 14 }}>
                    {copied ? '✓ Copied' : 'Click the secret to copy'}
                  </div>
                </div>
              )}
              <div>
                {/* BUG (Sprint 1.5 hotfix): manual-key entry is a fully
                    valid enrollment path. Gating Next on !qr alone left
                    users stranded when the QR data URI didn't populate
                    (Strict-mode effect-race / image proxy / network
                    blip). Both QR scan and manual entry seed the same
                    secret into the authenticator app; Step 2 verifies
                    a live code regardless of how it got there. */}
                <button
                  style={S.btn(!secret && !qr)}
                  onClick={() => setStep(2)}
                  disabled={!secret && !qr}
                >
                  Next: Verify code →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>Step 2: Enter the 6-digit code</h2>
              <p style={{ color: COLORS.textMuted, margin: '0 0 16px' }}>
                Open your authenticator app and enter the current code for{' '}
                <strong style={{ color: COLORS.white }}>Ecom Era</strong>.
              </p>
              <form onSubmit={handleVerify}>
                <input
                  type="text" inputMode="numeric" autoComplete="one-time-code"
                  pattern="[0-9]*" maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  style={S.input}
                  autoFocus
                />
                <div style={{ marginTop: 20 }}>
                  <button type="submit" style={S.btn(loading || code.length !== 6)} disabled={loading || code.length !== 6}>
                    {loading ? 'Verifying…' : 'Verify and enable'}
                  </button>
                  <button type="button" style={S.btnSecondary} onClick={() => setStep(1)}>
                    Back
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 3 && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>Step 3: Save your recovery codes</h2>
              <div style={S.warn}>
                <strong>Print or download these now.</strong> They are shown ONCE and are the only
                way to sign in if you lose your authenticator device. Each code works exactly
                once.
              </div>
              <div style={S.recoveryGrid}>
                {recoveryCodes.map((c) => (
                  <div key={c} style={S.recoveryCode}>{c}</div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button style={S.btn(false)} onClick={downloadCodes}>
                  Download as .txt
                </button>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: COLORS.white, fontSize: 14 }}>
                  <input
                    type="checkbox" checked={savedAck}
                    onChange={(e) => setSavedAck(e.target.checked)}
                  />
                  I&apos;ve saved these somewhere safe
                </label>
                <button
                  style={S.btn(!savedAck)} disabled={!savedAck}
                  onClick={() => router.push('/settings')}
                >
                  Done — back to Settings
                </button>
              </div>
            </div>
          )}

          <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 24 }}>
            Trouble?{' '}
            <Link href="/settings" style={{ color: COLORS.gold }}>
              Cancel setup
            </Link>{' '}
            and try again later.
          </div>
        </main>
      </div>
    </>
  );
}
