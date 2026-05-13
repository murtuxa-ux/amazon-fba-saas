import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import ConfirmDialog from '../components/ConfirmDialog';
import DataTable from '../components/DataTable';
import AddEditModal from '../components/AddEditModal';
import api from '../lib/api';

const styles = {
  outerContainer: { display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' },
  container: {
    flex: 1, marginLeft: '250px', padding: '32px',
    color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  header: { marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: 700, marginBottom: '4px' },
  subtitle: { fontSize: '14px', color: '#A0A0A0' },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px', marginBottom: '24px',
  },
  kpiCard: {
    backgroundColor: '#111111', border: '1px solid #1E1E1E',
    borderRadius: '8px', padding: '20px',
  },
  kpiLabel: {
    fontSize: '12px', color: '#A0A0A0', fontWeight: 500, marginBottom: '8px',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  kpiValue: { fontSize: '28px', fontWeight: 700, color: '#FFD000' },
  kpiSubtext: { fontSize: '12px', color: '#606060', marginTop: '8px' },
  controlBar: {
    display: 'flex', gap: '12px', marginBottom: '16px',
    flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
  },
  primaryBtn: {
    padding: '10px 16px', backgroundColor: '#FFD000', border: 'none',
    borderRadius: '6px', color: '#1A1A1A', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
  },
};

function priorityLabel(score) {
  const s = Number(score) || 0;
  if (s >= 80) return { label: 'Top', color: '#64C864' };
  if (s >= 50) return { label: 'Mid', color: '#FFD000' };
  return { label: 'Low', color: '#C86464' };
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);   // BUG-23
  const [confirmDelete, setConfirmDelete] = useState(null);  // BUG-23

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/suppliers');
      const data = res?.data || {};
      const list = Array.isArray(data) ? data : Array.isArray(data.suppliers) ? data.suppliers : [];
      setSuppliers(list);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load suppliers.');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const fields = [
    { name: 'name', label: 'Supplier Name', required: true },
    { name: 'brand', label: 'Brand(s)' },
    { name: 'contact', label: 'Contact (name / email / phone)' },
    {
      name: 'responseRate',
      label: 'Response Rate (%)',
      type: 'number',
      helpText: '0–100. How often the supplier responds to inquiries.',
    },
    {
      name: 'approvalRate',
      label: 'Brand-Approval Rate (%)',
      type: 'number',
      helpText: '0–100. How often this supplier ends up brand-approved.',
    },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'brand', label: 'Brand(s)' },
    { key: 'contact', label: 'Contact' },
    {
      key: 'responseRate',
      label: 'Response %',
      align: 'right',
      sortable: true,
      render: (r) => `${Number(r.responseRate) || 0}%`,
    },
    {
      key: 'approvalRate',
      label: 'Approval %',
      align: 'right',
      sortable: true,
      render: (r) => `${Number(r.approvalRate) || 0}%`,
    },
    {
      key: 'priorityScore',
      label: 'Priority',
      align: 'right',
      sortable: true,
      render: (r) => {
        const p = priorityLabel(r.priorityScore);
        return (
          <span style={{ color: p.color, fontWeight: 600 }}>
            {p.label} ({(Number(r.priorityScore) || 0).toFixed(1)})
          </span>
        );
      },
    },
    // BUG-23: Edit / Delete row actions.
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (r) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setEditing(r)}
            style={{
              background: 'transparent', color: '#FFD000', border: '1px solid #FFD000',
              padding: '4px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
            }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(r)}
            style={{
              background: 'transparent', color: '#C86464', border: '1px solid #C86464',
              padding: '4px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const handleCreate = async (values) => {
    await api.post('/suppliers', {
      name: values.name,
      brand: values.brand || '',
      contact: values.contact || '',
      response_rate: Number(values.responseRate) || 0,
      approval_rate: Number(values.approvalRate) || 0,
      notes: values.notes || '',
    });
    await refetch();
  };

  // BUG-23: row-level Edit/Delete. Used to be display-only.
  const handleEdit = async (values) => {
    if (!editing?.id) return;
    await api.put(`/suppliers/${editing.id}`, {
      name: values.name,
      brand: values.brand || '',
      contact: values.contact || '',
      response_rate: Number(values.responseRate) || 0,
      approval_rate: Number(values.approvalRate) || 0,
      notes: values.notes || '',
    });
    await refetch();
  };

  const handleDelete = async () => {
    if (!confirmDelete?.id) return;
    await api.delete(`/suppliers/${confirmDelete.id}`);
    setConfirmDelete(null);
    await refetch();
  };

  const total = suppliers.length;
  const avgResponse = total > 0
    ? Math.round(suppliers.reduce((s, x) => s + (Number(x.responseRate) || 0), 0) / total)
    : 0;
  const avgApproval = total > 0
    ? Math.round(suppliers.reduce((s, x) => s + (Number(x.approvalRate) || 0), 0) / total)
    : 0;
  const topPriority = suppliers.filter((s) => (Number(s.priorityScore) || 0) >= 80).length;

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>Suppliers</div>
          <div style={styles.subtitle}>Wholesale and brand suppliers, prioritized by response + approval rates</div>
        </div>

        {error && <ErrorBanner message={error} title="Couldn't load suppliers" onRetry={refetch} />}

        {loading ? (
          <LoadingSkeleton type="full" />
        ) : (
          <>
            <div style={styles.kpiGrid}>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Total Suppliers</div>
                <div style={styles.kpiValue}>{total}</div>
                <div style={styles.kpiSubtext}>All time</div>
              </div>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Top Priority</div>
                <div style={styles.kpiValue}>{topPriority}</div>
                <div style={styles.kpiSubtext}>Priority score ≥ 80</div>
              </div>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Avg Response Rate</div>
                <div style={styles.kpiValue}>{avgResponse}%</div>
                <div style={styles.kpiSubtext}>How often they reply</div>
              </div>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Avg Approval Rate</div>
                <div style={styles.kpiValue}>{avgApproval}%</div>
                <div style={styles.kpiSubtext}>End up brand-approved</div>
              </div>
            </div>

            <div style={styles.controlBar}>
              <div style={{ color: '#A0A0A0', fontSize: '14px' }}>
                {total} {total === 1 ? 'supplier' : 'suppliers'}
              </div>
              <button type="button" style={styles.primaryBtn} onClick={() => setAdding(true)}>
                + Add Supplier
              </button>
            </div>

            {total === 0 && !error ? (
              <EmptyState
                entity="supplier"
                message="No suppliers yet. Add one to start tracking response rates, approval rates, and priority scores."
                onCtaClick={() => setAdding(true)}
              />
            ) : (
              <DataTable
                columns={columns}
                rows={suppliers}
                rowKey="name"
                searchableFields={['name', 'brand', 'contact']}
                emptyMessage="No suppliers match your filter."
                pageSize={25}
              />
            )}
          </>
        )}

        <AddEditModal
          open={adding}
          title="Add Supplier"
          initialValues={{ responseRate: 0, approvalRate: 0 }}
          fields={fields}
          onSubmit={async (values) => {
            await handleCreate(values);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
          submitLabel="Add Supplier"
        />

        {/* BUG-23: Edit modal */}
        <AddEditModal
          open={!!editing}
          title="Edit Supplier"
          initialValues={editing ? {
            name: editing.name,
            brand: editing.brand,
            contact: editing.contact,
            responseRate: editing.responseRate,
            approvalRate: editing.approvalRate,
            notes: editing.notes,
          } : {}}
          fields={fields}
          onSubmit={async (values) => {
            await handleEdit(values);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
          submitLabel="Save Changes"
        />

        {/* BUG-23: Delete confirm */}
        <ConfirmDialog
          open={!!confirmDelete}
          title="Delete supplier?"
          message={`This will permanently remove '${confirmDelete?.name || ''}'. This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      </div>
    </div>
  );
}
