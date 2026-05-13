import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PasswordStrength, { passwordValid } from '../components/PasswordStrength';

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

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mounted, setMounted] = useState(false);
  const [newPwFocused, setNewPwFocused] = useState(false);
  const [confirmPwFocused, setConfirmPwFocused] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (!passwordValid(newPassword)) {
      setError('Password does not meet all requirements (see checklist).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!token) {
      setError('Invalid or missing reset token. Please request a new reset link.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Failed to reset password. The link may have expired.');
        setLoading(false);
        return;
      }

      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  if (!token && mounted) {
    return (
      <>
        <style>{styles.styleSheet}</style>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.logoContainer}>
              <img src="/logo.png" alt="Ecom Era" style={styles.logo} onError={(e) => { e.target.style.display = 'none'; }} />
              <h1 style={styles.title}>Ecom Era</h1>
              <p style={styles.subtitle}>FBA Management Platform</p>
            </div>
            <div style={styles.errorMessage}>
              Invalid or missing reset token. Please request a new password reset from the login page.
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                type="button"
                style={styles.backToLogin}
                onClick={() => router.push('/login')}
                onMouseEnter={(e) => { e.target.style.color = '#FFF700'; }}
                onMouseLeave={(e) => { e.target.style.color = '#FFD700'; }}
              >
                Back to Sign In
              </button>
            </div>
            <div style={styles.footer}>
              <p>v6.0 · Ecom Era</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles.styleSheet}</style>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logoContainer}>
            <img src="/logo.png" alt="Ecom Era" style={styles.logo} onError={(e) => { e.target.style.display = 'none'; }} />
            <h1 style={styles.title}>Ecom Era</h1>
            <p style={styles.subtitle}>FBA Management Platform</p>
          </div>

          <p style={{ color: '#E0E0E0', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
            Reset Your Password
          </p>
          <p style={{ color: '#999', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
            Enter your new password below.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label htmlFor="newPassword" style={styles.label}>
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                placeholder="12+ chars, mix of cases, digit, symbol"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setNewPwFocused(true)}
                onBlur={() => setNewPwFocused(false)}
                style={{
                  ...styles.input,
                  ...(newPwFocused ? styles.inputFocus : {}),
                  ...(error && !newPassword ? styles.inputError : {}),
                }}
                disabled={loading || !!success}
                autoComplete="new-password"
              />
              <PasswordStrength password={newPassword} />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="confirmPassword" style={styles.label}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setConfirmPwFocused(true)}
                onBlur={() => setConfirmPwFocused(false)}
                style={{
                  ...styles.input,
                  ...(confirmPwFocused ? styles.inputFocus : {}),
                  ...(error && !confirmPassword ? styles.inputError : {}),
                }}
                disabled={loading || !!success}
                autoComplete="new-password"
              />
            </div>

            {error && <div style={styles.errorMessage}>{error}</div>}
            {success && <div style={styles.successMessage}>{success}</div>}

            <button
              type="submit"
              disabled={loading || !!success || !passwordValid(newPassword) || newPassword !== confirmPassword}
              style={{
                ...styles.submitButton,
                ...((loading || !!success || !passwordValid(newPassword) || newPassword !== confirmPassword) ? styles.submitButtonDisabled : {}),
              }}
              onMouseEnter={(e) => {
                if (!loading && !success) {
                  Object.assign(e.target.style, styles.submitButtonHover);
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && !success) {
                  e.target.style.backgroundColor = styles.submitButton.backgroundColor;
                  e.target.style.transform = 'none';
                }
              }}
            >
              {loading ? (
                <>
                  <div style={styles.spinner} />
                  <span>Resetting...</span>
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              type="button"
              style={styles.backToLogin}
              onClick={() => router.push('/login')}
              onMouseEnter={(e) => { e.target.style.color = '#FFF700'; }}
              onMouseLeave={(e) => { e.target.style.color = '#FFD700'; }}
            >
              Back to Sign In
            </button>
          </div>

          <div style={styles.footer}>
            <p>v6.0 · Ecom Era</p>
          </div>
        </div>
      </div>
    </>
  );
}
