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
    color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: { marginBottom: '24px' },
  title: { fontSize: '32px', fontWeight: 700, marginBottom: '4px' },
  subtitle: { fontSize: '14px', color: '#A0A0A0' },
  tabsContainer: {
    display: 'flex', gap: '8px', borderBottom: '1px solid #1E1E1E',
    marginBottom: '24px', overflowX: 'auto',
  },
  tab: {
    padding: '12px 20px', backgroundColor: 'transparent', border: 'none',
    color: '#A0A0A0', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
    borderBottom: '2px solid transparent', whiteSpace: 'nowrap',
  },
  tabActive: { color: '#FFD000', borderBottomColor: '#FFD000' },
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
  statusBadge: {
    display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
    fontSize: '11px', fontWeight: 600,
  },
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'paused', label: 'Paused' },
  { value: 'churned', label: 'Churned' },
];

const PLAN_OPTIONS = [
  { value: 'Starter', label: 'Starter' },
  { value: 'Growth', label: 'Growth' },
  { value: 'Premium', label: 'Premium' },
  { value: 'Enterprise', label: 'Enterprise' },
];

const MARKETPLACE_OPTIONS = [
  { value: 'US', label: 'US' },
  { value: 'CA', label: 'CA' },
  { value: 'UK', label: 'UK' },
  { value: 'DE', label: 'DE' },
  { value: 'JP', label: 'JP' },
];

function StatusBadge({ status }) {
  const palette = {
    active: { bg: 'rgba(100, 200, 100, 0.2)', fg: '#64C864' },
    onboarding: { bg: 'rgba(255, 208, 0, 0.2)', fg: '#FFD000' },
    paused: { bg: 'rgba(160, 160, 160, 0.2)', fg: '#A0A0A0' },
    churned: { bg: 'rgba(200, 100, 100, 0.2)', fg: '#C86464' },
  }[String(status || '').toLowerCase()] || { bg: '#1E1E1E', fg: '#A0A0A0' };
  return (
    <span style={{ ...styles.statusBadge, backgroundColor: palette.bg, color: palette.fg }}>
      {status || '—'}
    </span>
  );
}

function ClientOverviewTab({ clients, loading, error, onRefetch, onCreate, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingInFlight, setDeletingInFlight] = useState(false);

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => String(c.status || '').toLowerCase() === 'active').length;
  const monthlyRevenue = clients.reduce((sum, c) => sum + (Number(c.monthlyBudget) || 0), 0);
  const avgRevenue = totalClients > 0 ? Math.round(monthlyRevenue / totalClients) : 0;

  const fields = [
    { name: 'name', label: 'Client Name', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'plan', label: 'Plan', type: 'select', options: PLAN_OPTIONS },
    { name: 'marketplace', label: 'Marketplace', type: 'select', options: MARKETPLACE_OPTIONS },
    { name: 'assignedAm', label: 'Account Manager (username)' },
    { name: 'monthlyBudget', label: 'Monthly Budget (USD)', type: 'number' },
    { name: 'startDate', label: 'Start Date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'plan', label: 'Plan', sortable: true },
    { key: 'marketplace', label: 'Market', sortable: true },
    { key: 'assignedAm', label: 'AM' },
    {
      key: 'monthlyBudget',
      label: 'Budget',
      align: 'right',
      sortable: true,
      render: (r) => (Number(r.monthlyBudget) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  if (loading) {
    return <LoadingSkeleton type="full" />;
  }

  return (
    <div>
      {error && <ErrorBanner message={error} title="Couldn't load clients" onRetry={onRefetch} />}

      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Total Clients</div>
          <div style={styles.kpiValue}>{totalClients}</div>
          <div style={styles.kpiSubtext}>All time</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Active Clients</div>
          <div style={styles.kpiValue}>{activeClients}</div>
          <div style={styles.kpiSubtext}>
            {totalClients > 0 ? `${((activeClients / totalClients) * 100).toFixed(0)}% of total` : '—'}
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Monthly Revenue</div>
          <div style={styles.kpiValue}>${(monthlyRevenue / 1000).toFixed(1)}k</div>
          <div style={styles.kpiSubtext}>Sum of monthly budgets</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Avg Budget</div>
          <div style={styles.kpiValue}>${(avgRevenue / 1000).toFixed(1)}k</div>
          <div style={styles.kpiSubtext}>Per client</div>
        </div>
      </div>

      <div style={styles.controlBar}>
        <div style={{ color: '#A0A0A0', fontSize: '14px' }}>
          {totalClients} {totalClients === 1 ? 'client' : 'clients'}
        </div>
        <button type="button" style={styles.primaryBtn} onClick={() => setAdding(true)}>
          + Add Client
        </button>
      </div>

      {totalClients === 0 && !error ? (
        <EmptyState
          entity="client"
          message="No clients yet. Add your first wholesale or private-label client to start tracking performance, contracts, and onboarding."
          onCtaClick={() => setAdding(true)}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={clients}
          rowKey="id"
          searchableFields={['name', 'email', 'phone', 'plan', 'marketplace', 'assignedAm']}
          actions={[
            { label: 'Edit', onClick: (row) => setEditing(row) },
            { label: 'Delete', onClick: (row) => setDeleting(row), destructive: true },
          ]}
          emptyMessage="No clients match your filter."
          pageSize={25}
        />
      )}

      <AddEditModal
        open={adding}
        title="Add Client"
        initialValues={{ marketplace: 'US', plan: 'Starter', status: 'onboarding' }}
        fields={fields}
        onSubmit={async (values) => {
          await onCreate({
            ...values,
            monthly_budget: Number(values.monthlyBudget) || 0,
            assigned_am: values.assignedAm || '',
            start_date: values.startDate || '',
          });
          setAdding(false);
        }}
        onCancel={() => setAdding(false)}
        submitLabel="Add Client"
      />

      <AddEditModal
        open={editing !== null}
        title={`Edit ${editing?.name || 'Client'}`}
        initialValues={editing || {}}
        fields={fields}
        onSubmit={async (values) => {
          await onUpdate(editing.id, {
            ...values,
            monthly_budget: Number(values.monthlyBudget) || 0,
            assigned_am: values.assignedAm || '',
            start_date: values.startDate || '',
          });
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete client?"
        message={
          deleting
            ? `This will delete "${deleting.name}" and any data scoped to it. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        loading={deletingInFlight}
        onConfirm={async () => {
          setDeletingInFlight(true);
          try {
            await onDelete(deleting.id);
          } finally {
            setDeletingInFlight(false);
            setDeleting(null);
          }
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function PendingTabPlaceholder({ title, designQuestion, clientCount }) {
  return (
    <div>
      {clientCount === 0 ? (
        <EmptyState
          entity="client"
          title="Add a client first"
          message={`This tab shows ${title.toLowerCase()} per client. Add at least one client on the Overview tab to populate it.`}
        />
      ) : (
        <div
          style={{
            backgroundColor: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            padding: '48px 24px',
            textAlign: 'center',
            color: '#FFFFFF',
          }}
        >
          <h3 style={{ margin: 0, marginBottom: '8px', color: '#FFD000' }}>
            {title} — pending backend
          </h3>
          <p style={{ maxWidth: '460px', margin: '0 auto', color: '#A0A0A0', lineHeight: 1.5 }}>
            The wiring for this tab is tracked in
            {' '}<code style={{ color: '#FFD000' }}>docs/design-questions.md #{designQuestion}</code>.
            It will populate once the backend schema is decided and the endpoint ships.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/clients');
      const data = res?.data || {};
      // Backend returns {count, clients: [...]}; the camelCase transformer
      // in lib/api.js leaves "clients" alone (already camel). Be defensive
      // against both list and { clients: [...] } shapes.
      const list = Array.isArray(data) ? data : Array.isArray(data.clients) ? data.clients : [];
      setClients(list);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load clients.');
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleCreate = async (payload) => {
    await api.post('/clients', payload);
    await refetch();
  };

  const handleUpdate = async (id, payload) => {
    await api.put(`/clients/${id}`, payload);
    await refetch();
  };

  const handleDelete = async (id) => {
    await api.delete(`/clients/${id}`);
    await refetch();
  };

  const tabs = [
    { id: 'overview', label: 'Client Overview' },
    { id: 'performance', label: 'Performance' },
    { id: 'communication', label: 'Communication' },
    { id: 'contracts', label: 'Contracts & Billing' },
    { id: 'onboarding', label: 'Onboarding' },
  ];

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>Clients</div>
          <div style={styles.subtitle}>Manage your Amazon FBA wholesale and private-label clients</div>
        </div>

        <div style={styles.tabsContainer}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              style={{ ...styles.tab, ...(activeTab === t.id ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <ClientOverviewTab
            clients={clients}
            loading={loading}
            error={error}
            onRefetch={refetch}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
        {activeTab === 'performance' && (
          <PendingTabPlaceholder
            title="Performance metrics"
            designQuestion={3}
            clientCount={clients.length}
          />
        )}
        {activeTab === 'communication' && (
          <PendingTabPlaceholder
            title="Communication log"
            designQuestion={1}
            clientCount={clients.length}
          />
        )}
        {activeTab === 'contracts' && (
          <PendingTabPlaceholder
            title="Contracts and billing"
            designQuestion={2}
            clientCount={clients.length}
          />
        )}
        {activeTab === 'onboarding' && (
          <PendingTabPlaceholder
            title="Internal onboarding"
            designQuestion={5}
            clientCount={clients.length}
          />
        )}
      </div>
    </div>
  );
}
