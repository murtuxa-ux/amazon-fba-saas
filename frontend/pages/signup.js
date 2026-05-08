import React, { useState } from 'react';
import { useRouter } from 'next/router';

export default function Signup() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    orgName: '',
    fullName: '',
    email: '',
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
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 10) {
      setError('Password must be at least 10 characters');
      return false;
    }
    if (!/\d/.test(formData.password) || !/[A-Za-z]/.test(formData.password)) {
      setError('Password must contain at least one letter and one digit');
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

      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          org_name: formData.orgName,
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Pydantic validation errors arrive as {detail: [{...}]}; Flatten the
        // first one for the user. HTTPException(detail="...") is a string.
        const detail = data.detail;
        const message = Array.isArray(detail)
          ? (detail[0]?.msg || 'Signup failed')
          : (detail || 'Signup failed');
        throw new Error(message);
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  if (submitted) {
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
        <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
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
            <h1 style={{ color: '#FFD700', fontSize: '24px', marginBottom: '16px' }}>
              Check your email
            </h1>
            <p style={{ color: '#FFFFFF', fontSize: '14px', marginBottom: '12px' }}>
              We sent a verification link to <strong>{formData.email}</strong>.
            </p>
            <p style={{ color: '#888', fontSize: '12px' }}>
              The link expires in 24 hours. Don't see it? Check your spam folder.
            </p>
          </div>
          <p style={{ marginTop: '24px', fontSize: '13px', color: '#888' }}>
            Already verified?{' '}
            <button
              onClick={handleSignIn}
              style={{
                backgroundColor: 'transparent',
                color: '#FFD700',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                padding: 0,
              }}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    );
  }

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
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
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
          <p style={{ fontSize: '14px', color: '#888' }}>
            Start your 14-day free trial
          </p>
        </div>

        <div style={{
          backgroundColor: '#111111',
          border: '1px solid #1E1E1E',
          borderRadius: '12px',
          padding: '40px',
        }}>
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
            <Field label="Organization Name" name="orgName" placeholder="e.g., My Wholesale Co."
                   value={formData.orgName} onChange={handleInputChange} />
            <Field label="Full Name" name="fullName" placeholder="John Doe"
                   value={formData.fullName} onChange={handleInputChange} />
            <Field label="Email Address" name="email" type="email" placeholder="you@example.com"
                   value={formData.email} onChange={handleInputChange} />
            <Field label="Password" name="password" type="password" placeholder="at least 10 characters, letters + digits"
                   value={formData.password} onChange={handleInputChange} />
            <Field label="Confirm Password" name="confirmPassword" type="password" placeholder="re-enter your password"
                   value={formData.confirmPassword} onChange={handleInputChange} marginBottom="28px" />

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
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div style={{
            margin: '24px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#1E1E1E' }} />
            <span style={{ fontSize: '12px', color: '#666' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#1E1E1E' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#888' }}>
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
                padding: 0,
              }}
            >
              Sign In
            </button>
          </p>
        </div>

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

function Field({ label, name, type = 'text', placeholder, value, onChange, marginBottom = '18px' }) {
  return (
    <div style={{ marginBottom }}>
      <label style={{
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        marginBottom: '6px',
        color: '#FFFFFF',
      }}>
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '11px',
          backgroundColor: '#0A0A0A',
          border: '1px solid #1E1E1E',
          borderRadius: '6px',
          color: '#FFFFFF',
          fontSize: '13px',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => { e.target.style.borderColor = '#FFD700'; }}
        onBlur={(e) => { e.target.style.borderColor = '#1E1E1E'; }}
      />
    </div>
  );
}
