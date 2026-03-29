import React from 'react';

/**
 * ErrorBoundary Component
 *
 * A React error boundary that catches rendering errors in child components.
 * Displays a styled dark-themed error screen with recovery options.
 *
 * Error boundaries only catch errors during:
 * - Rendering
 * - Lifecycle methods
 * - Constructors of child components
 *
 * They DO NOT catch errors in:
 * - Event handlers (use try/catch instead)
 * - Async code (setTimeout, promises)
 * - Server-side rendering
 *
 * @component
 * @param {ReactNode} children - Child components to wrap
 * @param {function} onError - Optional callback function called when error is caught: (error, errorInfo) => void
 * @param {ReactNode} fallback - Optional custom fallback UI component
 *
 * @example
 * <ErrorBoundary onError={(err, info) => console.error(err, info)}>
 *   <ChildComponent />
 * </ErrorBoundary>
 *
 * @example
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <ChildComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isDetailsExpanded: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error callback for logging to external services
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by ErrorBoundary:', error);
      console.error('Error info:', errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isDetailsExpanded: false,
    });
  };

  toggleDetails = () => {
    this.setState((prev) => ({
      isDetailsExpanded: !prev.isDetailsExpanded,
    }));
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, isDetailsExpanded } = this.state;
      const errorMessage = error?.toString() || 'An unknown error occurred';
      const errorStack = errorInfo?.componentStack || '';

      return (
        <div
          style={{
            width: '100%',
            minHeight: '100vh',
            backgroundColor: '#0A0A0A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              padding: '40px',
              backgroundColor: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Warning Icon */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFD700"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  display: 'block',
                }}
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            {/* Error Heading */}
            <div>
              <h1
                style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#FFFFFF',
                  margin: '0 0 12px 0',
                  textAlign: 'center',
                }}
              >
                Something Went Wrong
              </h1>
              <p
                style={{
                  fontSize: '14px',
                  color: '#B0B0B0',
                  margin: '0',
                  textAlign: 'center',
                }}
              >
                We encountered an unexpected error. Please try again or go back to the dashboard.
              </p>
            </div>

            {/* Error Details (Collapsible) */}
            <div>
              <button
                onClick={this.toggleDetails}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  color: '#FFD700',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#242424';
                  e.target.style.borderColor = '#2E2E2E';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#1a1a1a';
                  e.target.style.borderColor = '#1E1E1E';
                }}
              >
                <span>Error Details</span>
                <span style={{ fontSize: '16px' }}>
                  {isDetailsExpanded ? '−' : '+'}
                </span>
              </button>

              {isDetailsExpanded && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '16px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'Courier New, monospace',
                      fontSize: '12px',
                      color: '#FF6B6B',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    <div style={{ marginBottom: '8px', color: '#FFD700' }}>
                      Error:
                    </div>
                    {errorMessage}
                    {errorStack && (
                      <>
                        <div style={{ marginTop: '12px', marginBottom: '8px', color: '#FFD700' }}>
                          Component Stack:
                        </div>
                        {errorStack}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexDirection: 'column',
              }}
            >
              {/* Try Again Button */}
              <button
                onClick={this.handleReset}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#FFD700',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#FFE55C';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#FFD700';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Try Again
              </button>

              {/* Go to Dashboard Link */}
              <a
                href="/"
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#FFD700',
                  border: '1px solid #FFD700',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  display: 'block',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Go to Dashboard
              </a>
            </div>

            {/* Footer Note */}
            <p
              style={{
                fontSize: '12px',
                color: '#808080',
                margin: '0',
                textAlign: 'center',
                paddingTop: '12px',
                borderTop: '1px solid #1E1E1E',
              }}
            >
              If this problem persists, please contact support or check the browser console for more information.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
