import React, { useEffect, useRef } from 'react';

const BRAND_GOLD = '#FFD000';
const BRAND_BLACK = '#1A1A1A';

/**
 * ConfirmDialog
 *
 * Accessible modal confirmation dialog. Used before destructive actions
 * (Delete client, Cancel subscription, etc.). Focus is trapped to the
 * cancel button on open so a stray Enter keypress doesn't auto-confirm.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showConfirm}
 *     title="Delete client?"
 *     message={`Are you sure you want to delete "${client.name}"? This cannot be undone.`}
 *     confirmLabel="Delete"
 *     destructive
 *     onConfirm={async () => { await api.delete(`/clients/${client.id}`); setShowConfirm(false); }}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 *
 * Props:
 *   open           — boolean. Renders null when false.
 *   title          — required headline.
 *   message        — body copy (string or ReactNode).
 *   confirmLabel   — confirm button label. Default "Confirm".
 *   cancelLabel    — cancel button label. Default "Cancel".
 *   destructive    — boolean. If true, confirm button is red. Default false.
 *   onConfirm      — async or sync handler. Receives no args.
 *   onCancel       — handler invoked on cancel button OR backdrop click OR Esc.
 *   loading        — boolean. Disables both buttons while a confirm is in flight.
 */
function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
  loading = false,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = typeof document !== 'undefined' ? document.activeElement : null;
    if (cancelRef.current) cancelRef.current.focus();

    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#111111',
          border: '1px solid #1E1E1E',
          borderRadius: '10px',
          maxWidth: '440px',
          width: '100%',
          padding: '24px',
          color: '#FFFFFF',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
        }}
      >
        <h2
          id="confirm-dialog-title"
          style={{
            margin: 0,
            marginBottom: '12px',
            fontSize: '18px',
            fontWeight: 600,
            color: destructive ? '#FF4444' : BRAND_GOLD,
          }}
        >
          {title}
        </h2>
        <div style={{ color: '#D0D0D0', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
          {message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            ref={cancelRef}
            type="button"
            disabled={loading}
            onClick={() => onCancel?.()}
            style={{
              backgroundColor: 'transparent',
              color: '#FFFFFF',
              border: '1px solid #333',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onConfirm?.()}
            style={{
              backgroundColor: destructive ? '#FF4444' : BRAND_GOLD,
              color: destructive ? '#FFFFFF' : BRAND_BLACK,
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
