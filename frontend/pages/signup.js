import React, { useState } from 'react';
import { useRouter } from 'next/router';

export default function Signup() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    orgName: '',
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError(null);
  };

  const validateForm = () => {
    if (!formData.orgName.trim()) {
      setError('Organization name is required');
      return false;
    }
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          org_name: formData.orgName,
          name: formData.fullName,
          email: formData.email,
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Store token and user info (backend returns flat, not nested)
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

      // Full page redirect to trigger AuthContext re-read
      window.location.href = '/onboarding';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/login');
  };

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
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
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
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '8px',
            color: '#FFFFFF',
          }}>
            Create Account
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#888',
          }}>
            Join Ecom Era and start scaling your FBA wholesale business
          </p>
        </div>

        {/* Form Card */}
        <div style={{
          backgroundColor: '#111111',
          border: '1px solid #1E1E1E',
          borderRadius: '12px',
          padding: '40px',
        }}>
          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#1E1E1E',
              border: '1px solid #CD7F32',
              borderRadius: '6px',
              color: '#FFD700',
              marginBottom: '24px',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Organization Name */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '6px',
                color: '#FFFFFF',
              }}>
                Organization Name
              </label>
              <input
                type="text"
                name="orgName"
                value={formData.orgName}
                onChange={handleInputChange}
                placeholder="e.g., My Wholesale Co."
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#FFD700';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#1E1E1E';
                }}
              />
            </div>

            {/* Full Name */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '6px',
                color: '#FFFFFF',
              }}>
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="John Doe"
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#FFD700';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#1E1E1E';
                }}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '6px',
                color: '#FFFFFF',
              }}>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#FFD700';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#1E1E1E';
                }}
              />
            </div>

            {/* Username */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '6px',
                color: '#FFFFFF',
              }}>
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="johndoe"
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#FFD700';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#1E1E1E';
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '6px',
                color: '#FFFFFF',
              }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="at least 6 characters"
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#FFD700';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#1E1E1E';
                }}
              />
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '6px',
                color: '#FFFFFF',
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="re-enter your password"
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#FFD700';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#1E1E1E';
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#FFD700',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 24px rgba(255, 215, 0, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            margin: '24px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              flex: 1,
              height: '1px',
              backgroundColor: '#1E1E1E',
            }} />
            <span style={{ fontSize: '12px', color: '#666' }}>OR</span>
            <div style={{
              flex: 1,
              height: '1px',
              backgroundColor: '#1E1E1E',
            }} />
          </div>

          {/* Sign In Link */}
          <p style={{
            textAlign: 'center',
            fontSize: '13px',
            color: '#888',
          }}>
            Already have an account?{' '}
            <button
              onClick={handleSignIn}
              style={{
                backgroundColor: 'transparent',
                color: '#FFD700',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                textDecoration: 'none',
                padding: 0,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.target.style.textDecoration = 'none';
              }}
            >
              Sign In
            </button>
          </p>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          fontSize: '11px',
          color: '#666',
          marginTop: '24px',
        }}>
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
