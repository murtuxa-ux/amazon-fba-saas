import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

const T = {
  bg: '#0A0A0A',
  card: '#111111',
  cardAlt: '#161616',
  border: '#1E1E1E',
  borderHover: '#2A2A2A',
  yellow: '#FFD700',
  yellowDim: 'rgba(255,215,0,0.1)',
  text: '#FFFFFF',
  textSec: '#888888',
  textMut: '#444444',
  green: '#22C55E',
  red: '#EF4444',
  blue: '#3B82F6',
  input: '#0A0A0A',
};

const STATUS_COLORS = {
  active: T.green,
  inactive: '#64748B',
  onboarding: T.yellow,
};

const PLAN_COLORS = {
  Starter: T.blue,
  Pro: '#8B5CF6',
  Enterprise: T.yellow,
};

const MARKETPLACES = ['US', 'UK', 'CA', 'DE', 'FR', 'IT', 'ES', 'AU', 'IN', 'JP'];
const PLANS = ['Starter', 'Pro', 'Enterprise'];
const STATUSES = ['active', 'onboarding', 'inactive'];

const token = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('ecomera_token');
  }
  return null;
};

const authHeader = () => {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [search, setSearch] = useState('');
  const [filterAM, setFilterAM] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    marketplace: 'US',
    plan: 'Starter',
    assigned_am: '',
    monthly_budget: '',
    start_date: '',
    status: 'active',
    asins: '',
    notes: '',
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [clientRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/clients`, { headers: authHeader() }),
        fetch(`${API_URL}/users`, { headers: authHeader() }),
      ]);

      if (clientRes.ok) {
        const clientData = await clientRes.json();
        setClients(Array.isArray(clientData) ? clientData : clientData.clients || clientData.data || []);
      }

      if (usersRes.ok) {
        const userData = await usersRes.json();
        const amData = Array.isArray(userData)
          ? userData.filter((u) => u.role === 'account_manager' || u.role === 'admin' || u.role === 'manager' || u.role === 'owner')
          : userData.data?.filter((u) => u.role === 'account_manager' || u.role === 'admin' || u.role === 'manager' || u.role === 'owner') || [];
        setManagers(amData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        monthly_budget: parseFloat(formData.monthly_budget) || 0,
        asins: formData.asins
          .split('\n')
          .map((a) => a.trim())
          .filter((a) => a),
      };

      const method = editClient ? 'PUT' : 'POST';
      const url = editClient ? `${API_URL}/clients/${editClient.id}` : `${API_URL}/clients`;

      const res = await fetch(url, {
        method,
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchAll();
        setShowForm(false);
        setEditClient(null);
        setFormData({
          name: '',
          email: '',
          phone: '',
          marketplace: 'US',
          plan: 'Starter',
          assigned_am: '',
          monthly_budget: '',
          start_date: '',
          status: 'active',
          asins: '',
          notes: '',
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const startEdit = (client) => {
    setEditClient(client);
    setFormData({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      marketplace: client.marketplace || 'US',
      plan: client.plan || 'Starter',
      assigned_am: client.assigned_am || '',
      monthly_budget: client.monthly_budget?.toString() || '',
      start_date: client.start_date || '',
      status: client.status || 'active',
      asins: Array.isArray(client.asins) ? client.asins.join('\n') : '',
      notes: client.notes || '',
    });
    setShowForm(true);
  };

  const filtered = clients.filter((c) => {
    const matchSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchAM = !filterAM || c.assigned_am === filterAM;
    const matchStatus = !filterStatus || c.status === filterStatus;
    const matchPlan = !filterPlan || c.plan === filterPlan;
    return matchSearch && matchAM && matchStatus && matchPlan;
  });

  const totalBudget = clients.reduce((sum, c) => sum + (c.monthly_budget || 0), 0);
  const activeCount = clients.filter((c) => c.status === 'active').length;
  const amCount = managers.length;

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: T.bg,
        color: T.text,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <Sidebar />

      <main
        style={{
          flex: 1,
          padding: '2rem',
          overflowY: 'auto',
          maxWidth: '100%',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
            }}
          >
            <h1 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>Clients</h1>
            <button
              onClick={() => {
                setEditClient(null);
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  marketplace: 'US',
                  plan: 'Starter',
                  assigned_am: '',
                  monthly_budget: '',
                  start_date: '',
                  status: 'active',
                  asins: '',
                  notes: '',
                });
                setShowForm(true);
              }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: T.yellow,
                color: '#000',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.95rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.target.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.target.style.opacity = '1')}
            >
              + Add Client
            </button>
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <div style={{ backgroundColor: T.card, padding: '1.5rem', borderRadius: '0.75rem', border: `1px solid ${T.border}` }}>
              <p style={{ margin: '0 0 0.5rem 0', color: T.textSec, fontSize: '0.875rem', fontWeight: '500' }}>Total Clients</p>
              <p style={{ margin: '0', fontSize: '2.5rem', fontWeight: '700', color: T.yellow }}>{clients.length}</p>
            </div>
            <div style={{ backgroundColor: T.card, padding: '1.5rem', borderRadius: '0.75rem', border: `1px solid ${T.border}` }}>
              <p style={{ margin: '0 0 0.5rem 0', color: T.textSec, fontSize: '0.875rem', fontWeight: '500' }}>Active</p>
              <p style={{ margin: '0', fontSize: '2.5rem', fontWeight: '700', color: T.green }}>{activeCount}</p>
            </div>
            <div style={{ backgroundColor: T.card, padding: '1.5rem', borderRadius: '0.75rem', border: `1px solid ${T.border}` }}>
              <p style={{ margin: '0 0 0.5rem 0', color: T.textSec, fontSize: '0.875rem', fontWeight: '500' }}>Account Managers</p>
              <p style={{ margin: '0', fontSize: '2.5rem', fontWeight: '700', color: '#8B5CF6' }}>{amCount}</p>
            </div>
            <div style={{ backgroundColor: T.card, padding: '1.5rem', borderRadius: '0.75rem', border: `1px solid ${T.border}` }}>
              <p style={{ margin: '0 0 0.5rem 0', color: T.textSec, fontSize: '0.875rem', fontWeight: '500' }}>Monthly Budget</p>
              <p style={{ margin: '0', fontSize: '2.5rem', fontWeight: '700', color: T.blue }}>${totalBudget.toLocaleString()}</p>
            </div>
          </div>

          {/* AM Workload Chips */}
          {managers.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <p style={{ color: T.textSec, fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem' }}>Account Manager Workload</p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {managers.map((am) => {
                  const amClients = clients.filter((c) => c.assigned_am === am.id).length;
                  return (
                    <div
                      key={am.id}
                      style={{
                        backgroundColor: T.cardAlt,
                        padding: '0.75rem 1rem',
                        borderRadius: '2rem',
                        border: `1px solid ${T.border}`,
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <div
                        style={{
                          width: '2rem',
                          height: '2rem',
                          borderRadius: '50%',
                          backgroundColor: T.blue,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                        }}
                      >
                        {am.name?.charAt(0).toUpperCase()}
                      </div>
                      <span>
                        {am.name} • {amClients} {amClients === 1 ? 'client' : 'clients'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: T.input,
                border: `1px solid ${T.border}`,
                borderRadius: '0.5rem',
                color: T.text,
                fontSize: '0.95rem',
                flex: '1',
                minWidth: '200px',
              }}
            />
            <select
              value={filterAM}
              onChange={(e) => setFilterAM(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: T.input,
                border: `1px solid ${T.border}`,
                borderRadius: '0.5rem',
                color: T.text,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              <option value="">All Account Managers</option>
              {managers.map((am) => (
                <option key={am.id} value={am.id}>
                  {am.name}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: T.input,
                border: `1px solid ${T.border}`,
                borderRadius: '0.5rem',
                color: T.text,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: T.input,
                border: `1px solid ${T.border}`,
                borderRadius: '0.5rem',
                color: T.text,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              <option value="">All Plans</option>
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {(search || filterAM || filterStatus || filterPlan) && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterAM('');
                  setFilterStatus('');
                  setFilterPlan('');
                }}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'transparent',
                  border: `1px solid ${T.border}`,
                  borderRadius: '0.5rem',
                  color: T.textSec,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = T.borderHover;
                  e.target.style.color = T.text;
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = T.border;
                  e.target.style.color = T.textSec;
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Clients Table */}
          {filtered.length === 0 && !loading ? (
            <div
              style={{
                backgroundColor: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: '0.75rem',
                padding: '3rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>◇</div>
              <p style={{ color: T.textSec, margin: '0', fontSize: '1rem' }}>
                {search || filterAM || filterStatus || filterPlan
                  ? 'No clients match your filters'
                  : 'No clients yet. Create your first client to get started.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', backgroundColor: T.card, borderRadius: '0.75rem', border: `1px solid ${T.border}` }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.95rem',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: T.textSec, fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Client</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: T.textSec, fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Account Manager</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: T.textSec, fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Plan</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: T.textSec, fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: T.textSec, fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Budget/mo</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: T.textSec, fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((client, idx) => {
                    const am = managers.find((m) => String(m.id) === String(client.assigned_am));
                    return (
                      <tr
                        key={client.id || idx}
                        style={{
                          borderBottom: `1px solid ${T.border}`,
                          transition: 'background-color 0.2s ease',
                          backgroundColor: 'transparent',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = T.cardAlt)}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '1rem', color: T.text }}>
                          <div style={{ marginBottom: '0.25rem', fontWeight: '600' }}>{client.name}</div>
                          <div style={{ color: T.textSec, fontSize: '0.85rem', marginBottom: '0.25rem' }}>📍 {client.marketplace || 'N/A'}</div>
                          {client.asins && client.asins.length > 0 && (
                            <div style={{ color: T.textSec, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                              ASINs: {client.asins.slice(0, 2).join(', ')}
                              {client.asins.length > 2 && ` +${client.asins.length - 2}`}
                            </div>
                          )}
                          <div style={{ color: T.textMut, fontSize: '0.85rem' }}>{client.email}</div>
                        </td>
                        <td style={{ padding: '1rem', color: T.text }}>
                          {am ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div
                                style={{
                                  width: '1.75rem',
                                  height: '1.75rem',
                                  borderRadius: '50%',
                                  backgroundColor: T.blue,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  color: '#000',
                                }}
                              >
                                {am.name?.charAt(0).toUpperCase()}
                              </div>
                              <span>{am.name}</span>
                            </div>
                          ) : (
                            <span style={{ color: T.textMut }}>Unassigned</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', color: T.text }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.35rem 0.75rem',
                              backgroundColor: PLAN_COLORS[client.plan] || T.blue,
                              color: client.plan === 'Enterprise' ? '#000' : '#fff',
                              borderRadius: '0.375rem',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                            }}
                          >
                            {client.plan || 'Starter'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: T.text }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.35rem 0.75rem',
                              backgroundColor: STATUS_COLORS[client.status] || T.textMut,
                              color: client.status === 'onboarding' ? '#000' : '#fff',
                              borderRadius: '2rem',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                            }}
                          >
                            {client.status ? client.status.charAt(0).toUpperCase() + client.status.slice(1) : 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: T.text, fontWeight: '600' }}>
                          ${(client.monthly_budget || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => startEdit(client)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: T.blue,
                              border: 'none',
                              borderRadius: '0.375rem',
                              color: '#fff',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => (e.target.style.opacity = '0.8')}
                            onMouseLeave={(e) => (e.target.style.opacity = '1')}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Form */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowForm(false);
            setEditClient(null);
          }}
        >
          <div
            style={{
              backgroundColor: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: '0.75rem',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
              {editClient ? 'Edit Client' : 'Add New Client'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
              {/* Name & Email Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: T.textSec, fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Client Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: T.input,
                      border: `1px solid ${T.border}`,
                      borderRadius: '0.5rem',
                      color: T.text,
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: T.textSec, fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: T.input,
                      border: `1px solid ${T.border}`,
                      borderRadius: '0.5rem',
                      color: T.text,
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Phone & Marketplace Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: T.textSec, fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: T.input,
                      border: `1px solid ${T.border}`,
                      borderRadius: '0.5rem',
                      color: T.text,
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: T.textSec, fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Marketplace</label>
                  <select
                    value={formData.marketplace}
                    onChange={(e) => setFormData({ ...formData, marketplace: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: T.input,
                      border: `1px solid ${T.border}`,
                      borderRadius: '0.5rem',
                      color: T.text,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    {MARKETPLACES.map((mp) => (
                      <option key={mp} value={mp}>
                        {mp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Plan & Budget Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: T.textSec, fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Plan</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: T.input,
                      border: `1px solid ${T.border}`,
                      borderRadius: '0.5rem',
                      color: T.text,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    {PLANS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: T.textSec, fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Monthly Budget</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monthly_budget}
                    onChange={(e) => setFormData({ ...formData, monthly_budget: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: T.input,
                      border: `1px solid ${T.border}`,
                      borderRadius: '0.5rem',
                      color: T.text,
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Assigned AM & Start Date Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: T.textSec, fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Assigned Account Manager</label>
                  <select
                    value={formData.assigned_am}
                    onChange={(e) => setFormData({ ...formData, assigned_am: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: T.input,
                      border: `1px solid ${T.border}`,
                      borderRadius: '0.5rem',
                      color: T.text,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Select an account manager</option>
                    {managers.map((am) => (
                      <option key={am.id} value={am.id}>
                        {am.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: T.textSec, fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: T.input,
                      border: `1px solid ${T.border}`,
                      borderRadius: '0.5rem',
                      color: T.text,
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Status Toggle Buttons */}
              <div>
                <label style={{ display: 'block', color: T.textSec, fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>Status</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: s })}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        backgroundColor: formData.status === s ? STATUS_COLORS[s] : T.input,
                        border: `1px solid ${formData.status === s ? STATUS_COLORS[s] : T.border}`,
                        borderRadius: '0.5rem',
                        color: formData.status === s ? (s === 'onboarding' ? '#000' : '#fff') : T.text,
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textTransform: 'capitalize',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* ASINs Textarea */}
              <div>
                <label style={{ display: 'block', color: T.textSec, fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>ASINs (one per line)</label>
                <textarea
                  value={formData.asins}
                  onChange={(e) => setFormData({ ...formData, asins: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: T.input,
                    border: `1px solid ${T.border}`,
                    borderRadius: '0.5rem',
                    color: T.text,
                    fontSize: '0.95rem',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Notes Textarea */}
              <div>
                <label style={{ display: 'block', color: T.textSec, fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: T.input,
                    border: `1px solid ${T.border}`,
                    borderRadius: '0.5rem',
                    color: T.text,
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Form Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditClient(null);
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'transparent',
                    border: `1px solid ${T.border}`,
                    borderRadius: '0.5rem',
                    color: T.text,
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = T.borderHover;
                    e.target.style.backgroundColor = T.cardAlt;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = T.border;
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: T.blue,
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.target.style.opacity = '0.9')}
                  onMouseLeave={(e) => (e.target.style.opacity = '1')}
                >
                  {editClient ? 'Update Client' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
