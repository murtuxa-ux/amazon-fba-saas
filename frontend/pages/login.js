import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    margin: 0,
    padding: 0,
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#111111',
    border: '1px solid #1E1E1E',
    borderRadius: '8px',
    padding: '48px 40px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
  },
  logoContainer: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  logo: {
    width: '48px',
    height: '48px',
    marginBottom: '16px',
    borderRadius: '4px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#999999',
    margin: '0',
    fontWeight: '400',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#E0E0E0',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '15px',
    backgroundColor: '#1A1A1A',
    border: '1px solid #1E1E1E',
    borderRadius: '6px',
    color: '#FFFFFF',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  inputFocus: {
    borderColor: '#FFD700',
    boxShadow: '0 0 0 3px rgba(255, 215, 0, 0.1)',
  },
  inputError: {
    borderColor: '#FF4444',
    boxShadow: '0 0 0 3px rgba(255, 68, 68, 0.1)',
  },
  forgotPassword: {
    textAlign: 'right',
    marginTop: '12px',
  },
  forgotPasswordLink: {
    fontSize: '13px',
    color: '#FFD700',
    textDecoration: 'none',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    transition: 'color 0.2s ease',
  },
  forgotPasswordLinkHover: {
    color: '#FFF700',
  },
  submitButton: {
    width: '100%',
    padding: '12px 16px',
    marginTop: '28px',
    fontSize: '15px',
    fontWeight: '600',
    backgroundColor: '#FFD700',
    color: '#0A0A0A',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  submitButtonHover: {
    backgroundColor: '#FFF700',
    transform: 'translateY(-1px)',
  },
  submitButtonDisabled: {
    backgroundColor: '#666666',
    cursor: 'not-allowed',
    opacity: '0.6',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #0A0A0A',
    borderTop: '2px solid transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorMessage: {
    marginTop: '16px',
    padding: '12px 14px',
    backgroundColor: '#2B1111',
    border: '1px solid #664444',
    borderRadius: '6px',
    color: '#FF6B6B',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  successMessage: {
    marginTop: '16px',
    padding: '12px 14px',
    backgroundColor: '#112B1F',
    border: '1px solid #446644',
    borderRadius: '6px',
    color: '#6BFF9F',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  footer: {
    textAlign: 'center',
    marginTop: '40px',
    fontSize: '12px',
    color: '#666666',
  },
  backToLogin: {
    fontSize: '13px',
    color: '#FFD700',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  },
  styleSheet: `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #0A0A0A; }
  `,
};

export default function LoginPage() {
  const router = useRouter();
  const { login: authLogin, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mounted, setMounted] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetFocused, setResetFocused] = useState(false);

  // Mount + redirect-if-already-authenticated. Reads from AuthContext
  // (single source of truth) instead of localStorage directly — otherwise
  // we can disagree with AuthGuard, which gates routes on the same
  // context state and would bounce us right back here.
  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      router.push('/');
    }
  }, [router, isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Fall back to the live DOM values when React state is empty: Chrome
    // autofill writes directly to the <input> without dispatching the
    // synthetic change event React listens for, so a credentialed
    // autofill leaves `email`/`password` as '' and the form bails out
    // silently. Read FormData as the source of truth and sync state.
    // (Issue #15, Bug D.)
    const formData = new FormData(e.currentTarget);
    const submittedEmail = (formData.get('email') || email || '').toString().trim();
    const submittedPassword = (formData.get('password') || password || '').toString();
    if (submittedEmail !== email) setEmail(submittedEmail);
    if (submittedPassword !== password) setPassword(submittedPassword);

    if (!submittedEmail || !submittedPassword) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      // Delegate to AuthContext.login — it writes the token and user to
      // localStorage AND updates the AuthContext React state in one
      // transaction, so AuthGuard's `isAuthenticated` flips to true on
      // the very next render. The previous bespoke flow here only wrote
      // to localStorage; AuthContext stayed null, AuthGuard saw a
      // not-authenticated user, redirected to /login, and the mount
      // useEffect bounced us back to / on the token presence — locking
      // clean-browser logins in a redirect loop. (Issue #15, Bug A.)
      //
      // Backend accepts either username or email under the same field;
      // we pass the form's email value as the identifier.
      await authLogin(submittedEmail, submittedPassword);
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        router.push('/');
      }, 500);
    } catch (err) {
      // SP-API attestation: backend returns 403 detail="PASSWORD_EXPIRED"
      // when password_changed_at is older than PASSWORD_MAX_AGE_DAYS.
      // Redirect to the forced-rotation page; user cannot proceed without
      // setting a new password that meets the current policy.
      if (err && err.message === 'PASSWORD_EXPIRED') {
        router.push({
          pathname: '/change-password',
          query: { forced: 'true', username: submittedEmail },
        });
        return;
      }
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetEmail) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess(data.message || 'If an account with that email exists, a password reset link has been sent.');
      setLoading(false);
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{showForgotPassword ? 'Reset password' : 'Sign in'} · Ecom Era</title>
      </Head>
      <style>{styles.styleSheet}</style>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logoContainer}>
            <img
              src="/logo.png"
              alt="Ecom Era"
              style={styles.logo}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <h1 style={styles.title}>Ecom Era</h1>
            <p style={styles.subtitle}>FBA Management Platform</p>
          </div>

          {!showForgotPassword ? (
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label htmlFor="email" style={styles.label}>
                  Email or Username
                </label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  style={{
                    ...styles.input,
                    ...(emailFocused ? styles.inputFocus : {}),
                    ...(error && !email ? styles.inputError : {}),
                  }}
                  disabled={loading}
                  autoComplete="username"
                />
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="password" style={styles.label}>
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  style={{
                    ...styles.input,
                    ...(passwordFocused ? styles.inputFocus : {}),
                    ...(error && !password ? styles.inputError : {}),
                  }}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <div style={styles.forgotPassword}>
                  <button
                    type="button"
                    style={styles.forgotPasswordLink}
                    onClick={() => {
                      setShowForgotPassword(true);
                      setError('');
                      setSuccess('');
                      setResetEmail(email);
                    }}
                    onMouseEnter={(e) => { e.target.style.color = styles.forgotPasswordLinkHover.color; }}
                    onMouseLeave={(e) => { e.target.style.color = styles.forgotPasswordLink.color; }}
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              {error && <div style={styles.errorMessage}>{error}</div>}
              {success && <div style={styles.successMessage}>{success}</div>}

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.submitButton,
                  ...(loading ? styles.submitButtonDisabled : {}),
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    Object.assign(e.target.style, styles.submitButtonHover);
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = styles.submitButton.backgroundColor;
                    e.target.style.transform = 'none';
                  }
                }}
              >
                {loading ? (
                  <>
                    <div style={styles.spinner} />
                    <span>Signing in...</span>
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <p style={{ color: '#999', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
                Enter your email address and we will send you a link to reset your password.
              </p>

              <div style={styles.formGroup}>
                <label htmlFor="resetEmail" style={styles.label}>
                  Email Address
                </label>
                <input
                  id="resetEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  onFocus={() => setResetFocused(true)}
                  onBlur={() => setResetFocused(false)}
                  style={{
                    ...styles.input,
                    ...(resetFocused ? styles.inputFocus : {}),
                    ...(error && !resetEmail ? styles.inputError : {}),
                  }}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              {error && <div style={styles.errorMessage}>{error}</div>}
              {success && <div style={styles.successMessage}>{success}</div>}

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.submitButton,
                  ...(loading ? styles.submitButtonDisabled : {}),
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    Object.assign(e.target.style, styles.submitButtonHover);
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = styles.submitButton.backgroundColor;
                    e.target.style.transform = 'none';
                  }
                }}
              >
                {loading ? (
                  <>
                    <div style={styles.spinner} />
                    <span>Sending...</span>
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button
                  type="button"
                  style={styles.backToLogin}
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError('');
                    setSuccess('');
                  }}
                  onMouseEnter={(e) => { e.target.style.color = '#FFF700'; }}
                  onMouseLeave={(e) => { e.target.style.color = '#FFD700'; }}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          <div style={styles.footer}>
            <p>v6.0 · Ecom Era</p>
          </div>
        </div>
      </div>
    </>
  );
}
