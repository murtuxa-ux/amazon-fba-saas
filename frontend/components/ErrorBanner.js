import React from 'react';

/**
 * ErrorBanner
 *
 * Inline error display for API failures, validation errors, etc. Lives
 * INSIDE a page (above the data) rather than as a toast. Toast-style
 * notifications can interrupt; an inline banner is dismissable and lets
 * the user keep working.
 *
 * Usage:
 *   {error && <ErrorBanner message={error} onRetry={fetchData} onDismiss={() => setError(null)} />}
 *
 * Props:
 *   message     — string. Required.
 *   variant     — 'error' (red) | 'warning' (gold) | 'info' (blue). Default 'error'.
 *   onRetry     — optional retry handler. Shows a "Retry" button.
 *   onDismiss   — optional dismiss handler. Shows an X button.
 *   title       — optional headline (e.g. "Couldn't load clients").
 */
function ErrorBanner({ message, variant = 'error', onRetry, onDismiss, title }) {
  const palette = {
    error: { bg: '#2A0F0F', border: '#FF4444', accent: '#FF4444' },
    warning: { bg: '#2A220F', border: '#FFD000', accent: '#FFD000' },
    info: { bg: '#0F1F2A', border: '#4488FF', accent: '#4488FF' },
  }[variant] || {};

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      style={{
        backgroundColor: palette.bg,
        border: `1px solid ${palette.border}`,
        borderLeft: `4px solid ${palette.accent}`,
        borderRadius: '6px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        color: '#FFFFFF',
        marginBottom: '16px',
      }}
    >
      <span aria-hidden="true" style={{ color: palette.accent, fontSize: '18px', flexShrink: 0 }}>
        {variant === 'error' ? '!' : variant === 'warning' ? '!' : 'i'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{title}</div>
        )}
        <div style={{ fontSize: '14px', lineHeight: 1.5, wordWrap: 'break-word' }}>
          {message}
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            backgroundColor: 'transparent',
            color: palette.accent,
            border: `1px solid ${palette.accent}`,
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Retry
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            backgroundColor: 'transparent',
            color: '#A0A0A0',
            border: 'none',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '18px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export default ErrorBanner;
