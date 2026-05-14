// MFA login-challenge page (Phase B). Landed here from /login after the
// password step succeeded on an MFA-enrolled account. We hold a
// short-lived (5 min) challenge token and need the user's 6-digit TOTP
// code OR a single-use recovery code.

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { setToken, setRefreshToken, setStoredUser } from '../../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

export default function MfaChallengePage() {
  const router = useRouter();
  // Challenge token comes via session storage (login.js writes it before
  // routing). Avoids putting the token in the URL where it could leak
  // via Referer / browser history.
  const [challengeToken, setChallengeToken] = useState('');
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = sessionStorage.getItem('ecomera_mfa_challenge') || '';
    if (!t) {
      // No challenge in flight — bounce to login.
      router.replace('/login');
      return;
    }
    setChallengeToken(t);
  }, [router]);

  const submit = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!code) {
      setError(useRecovery ? 'Enter a recovery code.' : 'Enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login/mfa-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfa_challenge_token: challengeToken, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || 'Invalid code.');
        setLoading(false);
        return;
      }
      // Same envelope as /auth/login. Hand to AuthContext helpers and
      // full-page navigate so AuthProvider re-hydrates from storage.
      if (data.token) setToken(data.token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);
      if (data.user) setStoredUser(data.user);
      sessionStorage.removeItem('ecomera_mfa_challenge');
      window.location.href = '/';
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  const card = {
    width: '100%', maxWidth: 420, background: '#111111', border: '1px solid #1E1E1E',
    borderRadius: 8, padding: 40,
  };
  const input = {
    width: '100%', padding: '14px 16px',
    fontSize: useRecovery ? 18 : 22,
    letterSpacing: useRecovery ? '2px' : '6px',
    fontFamily: 'monospace', textAlign: 'center',
    background: '#FFFDE7', color: '#1F3A8A', border: '1px solid #E5E5E5',
    borderRadius: 6, outline: 'none', boxSizing: 'border-box', marginBottom: 16,
  };
  const button = {
    width: '100%', padding: '12px 16px', fontSize: 15, fontWeight: 700,
    background: '#FFD000', color: '#1A1A1A', border: 'none', borderRadius: 6,
    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
  };

  return (
    <>
      <Head><title>Two-factor authentication · Ecom Era</title></Head>
      <div style={{
        minHeight: '100vh', background: '#0A0A0A', color: '#FFFFFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontFamily: '-apple-system, sans-serif',
      }}>
        <div style={card}>
          <h1 style={{ color: '#FFD000', fontSize: 24, margin: '0 0 8px' }}>
            Enter your authenticator code
          </h1>
          <p style={{ color: '#999', fontSize: 14, lineHeight: 1.5, margin: '0 0 24px' }}>
            {useRecovery
              ? 'Enter one of the 8-character recovery codes you saved during MFA setup. Each code can only be used once.'
              : 'Open Google Authenticator (or your authenticator app of choice) and enter the current 6-digit code for Ecom Era.'}
          </p>
          <form onSubmit={submit}>
            <input
              type="text"
              inputMode={useRecovery ? 'text' : 'numeric'}
              autoComplete="one-time-code"
              maxLength={useRecovery ? 8 : 6}
              value={code}
              onChange={(e) => setCode(
                useRecovery
                  ? e.target.value.slice(0, 8)
                  : e.target.value.replace(/\D/g, '').slice(0, 6),
              )}
              placeholder={useRecovery ? 'XXXXxxxx' : '123456'}
              style={input}
              autoFocus
            />
            {error && (
              <div style={{
                padding: 10, background: '#2B1111', border: '1px solid #664444',
                borderRadius: 6, color: '#FF6B6B', fontSize: 13, marginBottom: 12,
              }}>
                {error}
              </div>
            )}
            <button type="submit" style={button} disabled={loading}>
              {loading ? 'Verifying…' : 'Sign in'}
            </button>
          </form>
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
            <button
              type="button"
              onClick={() => { setUseRecovery(!useRecovery); setCode(''); setError(''); }}
              style={{ background: 'transparent', border: 'none', color: '#FFD000', cursor: 'pointer', fontSize: 13, padding: 0 }}
            >
              {useRecovery ? '← Use authenticator code instead' : 'Use a recovery code instead →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
