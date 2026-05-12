import React, { useEffect, useState } from 'react';

const BRAND_GOLD = '#FFD000';
const BRAND_BLACK = '#1A1A1A';

/**
 * AddEditModal
 *
 * Schema-driven form modal for Add or Edit flows. Caller passes a fields
 * config; the modal renders the inputs, validates required fields, and
 * hands the assembled payload to onSubmit.
 *
 * Usage:
 *   <AddEditModal
 *     open={editing !== null}
 *     title={editing?.id ? 'Edit Client' : 'Add Client'}
 *     initialValues={editing || { name: '', email: '', phone: '' }}
 *     fields={[
 *       { name: 'name', label: 'Name', required: true },
 *       { name: 'email', label: 'Email', type: 'email', required: true },
 *       { name: 'phone', label: 'Phone', type: 'tel' },
 *       { name: 'notes', label: 'Notes', type: 'textarea' },
 *       { name: 'status', label: 'Status', type: 'select', options: [
 *         { value: 'active', label: 'Active' },
 *         { value: 'paused', label: 'Paused' },
 *       ]},
 *     ]}
 *     onSubmit={async (payload) => {
 *       if (editing?.id) await api.put(`/clients/${editing.id}`, payload);
 *       else await api.post('/clients', payload);
 *       setEditing(null);
 *     }}
 *     onCancel={() => setEditing(null)}
 *   />
 *
 * Field config:
 *   { name, label, type?, required?, options?, placeholder?, helpText? }
 *   type defaults to 'text'. Supported: text, email, tel, number, password,
 *   url, date, textarea, select, checkbox.
 *
 * Props:
 *   open           — boolean.
 *   title          — modal title (e.g. "Add Client" or "Edit Client").
 *   initialValues  — object keyed by field.name. {} for Add, the row for Edit.
 *   fields         — array of field config.
 *   onSubmit       — async (payload) => void. Modal stays open until resolved.
 *   onCancel       — handler.
 *   submitLabel    — default "Save".
 */
function AddEditModal({
  open,
  title,
  initialValues = {},
  fields = [],
  onSubmit,
  onCancel,
  submitLabel = 'Save',
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setErrors({});
      setSubmitError(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onCancel?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, submitting, onCancel]);

  if (!open) return null;

  const validate = () => {
    const next = {};
    fields.forEach((f) => {
      const v = values[f.name];
      if (f.required && (v == null || v === '' || (typeof v === 'string' && !v.trim()))) {
        next[f.name] = `${f.label} is required`;
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit?.(values);
    } catch (err) {
      setSubmitError(err?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (name, val) => {
    setValues((v) => ({ ...v, [name]: val }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const renderField = (f) => {
    const value = values[f.name] ?? (f.type === 'checkbox' ? false : '');
    const commonStyle = {
      width: '100%',
      padding: '8px 12px',
      backgroundColor: BRAND_BLACK,
      color: '#FFFFFF',
      border: `1px solid ${errors[f.name] ? '#FF4444' : '#333'}`,
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'inherit',
    };

    if (f.type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(e) => setField(f.name, e.target.value)}
          placeholder={f.placeholder}
          rows={4}
          style={{ ...commonStyle, resize: 'vertical', minHeight: '80px' }}
        />
      );
    }
    if (f.type === 'select') {
      return (
        <select
          value={value}
          onChange={(e) => setField(f.name, e.target.value)}
          style={commonStyle}
        >
          <option value="">Select…</option>
          {(f.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    if (f.type === 'checkbox') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => setField(f.name, e.target.checked)}
          />
          <span>{f.checkboxLabel || f.label}</span>
        </label>
      );
    }
    return (
      <input
        type={f.type || 'text'}
        value={value}
        onChange={(e) => setField(f.name, e.target.value)}
        placeholder={f.placeholder}
        style={commonStyle}
      />
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel?.();
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
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: '#111111',
          border: '1px solid #1E1E1E',
          borderRadius: '10px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          color: '#FFFFFF',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
        }}
      >
        <h2 style={{ margin: 0, marginBottom: '20px', fontSize: '18px', fontWeight: 600, color: BRAND_GOLD }}>
          {title}
        </h2>

        {submitError && (
          <div
            style={{
              backgroundColor: '#2A0F0F',
              border: '1px solid #FF4444',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              marginBottom: '16px',
              color: '#FFFFFF',
            }}
          >
            {submitError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {fields.map((f) => (
            <div key={f.name}>
              {f.type !== 'checkbox' && (
                <label
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    color: '#D0D0D0',
                  }}
                >
                  {f.label}
                  {f.required && <span style={{ color: '#FF4444', marginLeft: '4px' }}>*</span>}
                </label>
              )}
              {renderField(f)}
              {f.helpText && !errors[f.name] && (
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                  {f.helpText}
                </div>
              )}
              {errors[f.name] && (
                <div style={{ fontSize: '12px', color: '#FF4444', marginTop: '4px' }}>
                  {errors[f.name]}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onCancel?.()}
            style={{
              backgroundColor: 'transparent',
              color: '#FFFFFF',
              border: '1px solid #333',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: BRAND_GOLD,
              color: BRAND_BLACK,
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}
          >
            {submitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddEditModal;
