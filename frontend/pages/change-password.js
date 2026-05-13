// Forced password rotation page — landed here when /auth/login responds
// 403 PASSWORD_EXPIRED. User cannot get a session JWT until their password
// is rotated to one that satisfies the current policy (12+ chars, mixed
// case, digit, symbol, not in the common-password denylist).
//
// Calls POST /auth/force-rotate which accepts {username, current_password,
// new_password} without a JWT (the user has none yet), verifies the old
// password, validates the new password against the policy, writes the
// rotation, and returns a session JWT shaped like /auth/login.

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { setToken, setRefreshToken, setStoredUser } from '../context/AuthContext';
import PasswordStrength, { passwordValid } from '../components/PasswordStrength';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ChangePasswordPage() {
  const router = useRouter();
  const forced = router.query.forced === 'true';
  const prefilledUsername = (router.query.username || '').toString();

  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (prefilledUsername && !username) setUsername(prefilledUsername);
  }, [prefilledUsername]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !currentPassword || !newPassword) {
      setError('All fields are required.');
      return;
    }
    if (!passwordValid(newPassword)) {
      setError('New password does not meet all requirements (see checklist).');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from the current one.');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/auth/force-rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(data.detail || 'Password rotation failed.');
        setLoading(false);
        return;
      }
      // Same response shape as /auth/login. Write token + user to
      // localStorage via the AuthContext helpers, then full-page navigate
      // so AuthProvider re-hydrates from storage on mount (mirrors the
      // logout path which also relies on window.location).
      if (data.token) setToken(data.token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);
      if (data.user) setStoredUser(data.user);
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        router.push('/');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  const card = {
    width: '100%', maxWidth: 440, backgroundColor: '#111111',
    border: '1px solid #1E1E1E', borderRadius: 8, padding: '40px 32px',
  };
  const input = {
    width: '100%', padding: '12px 14px', fontSize: 15,
    backgroundColor: '#1A1A1A', border: '1px solid #1E1E1E',
    borderRadius: 6, color: '#FFFFFF', outline: 'none', boxSizing: 'border-box',
    marginBottom: 16,
  };
  const button = {
    width: '100%', padding: '12px 16px', marginTop: 8,
    fontSize: 15, fontWeight: 600, backgroundColor: '#FFD000',
    color: '#0A0A0A', border: 'none', borderRadius: 6, cursor: 'pointer',
  };
  const disabled =
    loading || !passwordValid(newPassword) || newPassword !== confirmPassword;

  return (
    <>
      <Head><title>{forced ? 'Rotate Password' : 'Change Password'} · Ecom Era</title></Head>
      <div style={{
        minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFFFFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '-apple-system, sans-serif', padding: 20,
      }}>
        <div style={card}>
          <h1 style={{ color: '#FFD000', fontSize: 24, margin: '0 0 8px' }}>
            {forced ? 'Password expired' : 'Change password'}
          </h1>
          <p style={{ color: '#999', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
            {forced
              ? 'Your password has expired per our security policy. Enter your current password and choose a new one that meets the requirements below.'
              : 'Set a new password that meets the requirements below.'}
          </p>
          <form onSubmit={submit}>
            <label style={{ fontSize: 13, color: '#E0E0E0' }}>Username or email</label>
            <input
              type="text" value={username} style={input}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username" disabled={loading || !!prefilledUsername}
            />
            <label style={{ fontSize: 13, color: '#E0E0E0' }}>Current password</label>
            <input
              type="password" value={currentPassword} style={input}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password" disabled={loading}
            />
            <label style={{ fontSize: 13, color: '#E0E0E0' }}>New password</label>
            <input
              type="password" value={newPassword} style={input}
              placeholder="12+ chars, mix of cases, digit, symbol"
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password" disabled={loading}
            />
            <PasswordStrength password={newPassword} />
            <label style={{ fontSize: 13, color: '#E0E0E0' }}>Confirm new password</label>
            <input
              type="password" value={confirmPassword} style={input}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password" disabled={loading}
            />
            {error && (
              <div style={{
                padding: 12, backgroundColor: '#2B1111', border: '1px solid #664444',
                borderRadius: 6, color: '#FF6B6B', fontSize: 13, marginBottom: 12,
              }}>{error}</div>
            )}
            <button
              type="submit" disabled={disabled}
              style={{ ...button, opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Rotating…' : (forced ? 'Rotate and sign in' : 'Change password')}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
