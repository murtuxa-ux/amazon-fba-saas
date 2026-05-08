import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function VerifyEmail() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";
  const router = useRouter();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState(null);

  useEffect(() => {
    const { token } = router.query;
    if (!token) return;

    let cancelled = false;

    fetch(`${API_URL}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) {
          throw new Error(data.detail || 'Verification failed');
        }
        // Mirror /auth/login + signup.js localStorage shape so AuthContext
        // re-hydrates after the full-page reload below. AuthContext.js
        // listens for storage events and reads ecomera_token + ecomera_user
        // synchronously on mount.
        localStorage.setItem('ecomera_token', data.token);
        localStorage.setItem('ecomera_user', JSON.stringify({
          username: data.username,
          name: data.name,
          role: data.role,
          email: data.email,
          avatar: data.avatar,
          org_id: data.org_id,
          org_name: data.org_name,
        }));
        setStatus('success');
        // Full-page redirect — triggers AuthContext.useEffect to hydrate
        // from localStorage. Onboarding wizard takes over from there.
        setTimeout(() => {
          window.location.href = '/onboarding';
        }, 1200);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setStatus('error');
      });

    return () => { cancelled = true; };
  }, [router.query.token]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
      color: '#FFFFFF',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#FFD700',
          letterSpacing: '2px',
          marginBottom: '24px',
        }}>
          ECOM ERA
        </div>
        <div style={{
          backgroundColor: '#111111',
          border: '1px solid #1E1E1E',
          borderRadius: '12px',
          padding: '40px',
        }}>
          {status === 'verifying' && (
            <>
              <h1 style={{ color: '#FFFFFF', fontSize: '22px', marginBottom: '12px' }}>
                Verifying your email…
              </h1>
              <p style={{ color: '#888', fontSize: '13px' }}>
                One moment.
              </p>
            </>
          )}
          {status === 'success' && (
            <>
              <h1 style={{ color: '#FFD700', fontSize: '22px', marginBottom: '12px' }}>
                Email verified
              </h1>
              <p style={{ color: '#FFFFFF', fontSize: '13px' }}>
                Redirecting to onboarding…
              </p>
            </>
          )}
          {status === 'error' && (
            <>
              <h1 style={{ color: '#FF4444', fontSize: '22px', marginBottom: '12px' }}>
                Verification failed
              </h1>
              <p style={{ color: '#FFFFFF', fontSize: '13px', marginBottom: '20px' }}>
                {error}
              </p>
              <button
                onClick={() => router.push('/signup')}
                style={{
                  backgroundColor: '#FFD700',
                  color: '#0A0A0A',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Back to sign up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
