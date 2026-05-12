import React from 'react';

const BRAND_GOLD = '#FFD000';
const BRAND_BLACK = '#1A1A1A';
const BRAND_DARK = '#32373C';

const ENTITY_LABELS = {
  client: { singular: 'client', plural: 'clients', cta: 'Add your first client' },
  product: { singular: 'product', plural: 'products', cta: 'Add your first product' },
  supplier: { singular: 'supplier', plural: 'suppliers', cta: 'Add a supplier' },
  shipment: { singular: 'shipment', plural: 'shipments', cta: 'Create a shipment' },
  order: { singular: 'order', plural: 'orders', cta: 'Add an order' },
  invoice: { singular: 'invoice', plural: 'invoices', cta: 'Create invoice' },
  report: { singular: 'report', plural: 'reports', cta: 'Submit a report' },
  asin: { singular: 'ASIN', plural: 'ASINs', cta: 'Track an ASIN' },
  approval: { singular: 'approval', plural: 'approvals', cta: 'Request approval' },
  alert: { singular: 'alert', plural: 'alerts', cta: '' },
  audit_event: { singular: 'audit event', plural: 'audit events', cta: '' },
  note: { singular: 'note', plural: 'notes', cta: 'Add a note' },
  contract: { singular: 'contract', plural: 'contracts', cta: 'Add a contract' },
  item: { singular: 'item', plural: 'items', cta: 'Add an item' },
};

/**
 * EmptyState
 *
 * Branded empty-state component for pages with no data. Renders a tasteful
 * empty illustration (CSS-only — no image deps), a copy line, and an
 * optional "Add first X" CTA button.
 *
 * Usage:
 *   <EmptyState entity="client" onCtaClick={() => setShowAddModal(true)} />
 *
 *   // Custom copy
 *   <EmptyState
 *     title="No alerts right now"
 *     message="You're all caught up. Alerts will appear here when a tracked ASIN moves out of BuyBox or stock dips below your reorder point."
 *   />
 *
 *   // Without CTA (read-only empty state)
 *   <EmptyState entity="audit_event" />
 *
 * Props:
 *   entity       — one of the ENTITY_LABELS keys. Drives default title/copy/CTA.
 *   title        — override the headline.
 *   message      — override the description.
 *   ctaLabel     — override the CTA button label.
 *   onCtaClick   — handler. If omitted, no button is rendered.
 *   compact      — boolean. Removes vertical padding for use inside tabs/cards.
 */
function EmptyState({
  entity,
  title,
  message,
  ctaLabel,
  onCtaClick,
  compact = false,
}) {
  const meta = ENTITY_LABELS[entity] || { singular: entity || 'record', plural: entity || 'records', cta: '' };
  const finalTitle = title || `No ${meta.plural} yet`;
  const finalMessage =
    message ||
    `When you ${entity === 'audit_event' || entity === 'alert' ? 'have activity' : `add a ${meta.singular}`}, it will show up here.`;
  const finalCta = ctaLabel || meta.cta;
  const showCta = !!onCtaClick && !!finalCta;

  return (
    <div
      role="status"
      style={{
        width: '100%',
        padding: compact ? '32px 16px' : '64px 16px',
        backgroundColor: '#111111',
        border: '1px solid #1E1E1E',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        color: '#FFFFFF',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: BRAND_BLACK,
          border: `2px solid ${BRAND_GOLD}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          color: BRAND_GOLD,
          marginBottom: '20px',
        }}
      >
        +
      </div>
      <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '20px', fontWeight: 600 }}>
        {finalTitle}
      </h3>
      <p
        style={{
          margin: 0,
          marginBottom: showCta ? '24px' : 0,
          color: '#A0A0A0',
          maxWidth: '460px',
          lineHeight: 1.5,
        }}
      >
        {finalMessage}
      </p>
      {showCta && (
        <button
          type="button"
          onClick={onCtaClick}
          style={{
            backgroundColor: BRAND_GOLD,
            color: BRAND_BLACK,
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'transform 0.08s',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {finalCta}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
