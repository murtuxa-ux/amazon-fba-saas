import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

export default function ClientPortal() {
  const [activeTab, setActiveTab] = useState('all-clients');
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [newNoteType, setNewNoteType] = useState('general');
  const [loading, setLoading] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    brand_name: '',
    amazon_store_url: '',
    marketplace: 'US',
    main_category: '',
    monthly_revenue: 0,
    product_count: 0,
    target_acos: null,
    target_tacos: null,
    target_margin: null,
  });

  const darkBg = '#0A0A0A';
  const cardBg = '#111111';
  const borderColor = '#1E1E1E';
  const accentColor = '#FFD700';
  const textPrimary = '#FFFFFF';
  const textSecondary = '#B0B0B0';

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchOnboarding(selectedClient.id);
      fetchNotes(selectedClient.id);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/client-portal/profiles', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
    setLoading(false);
  };

  const fetchOnboarding = async (clientId) => {
    try {
      const response = await fetch(`/api/client-portal/profiles/${clientId}/onboarding`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setOnboarding(data);
      }
    } catch (error) {
      console.error('Error fetching onboarding:', error);
    }
  };

  const fetchNotes = async (clientId) => {
    try {
      const response = await fetch(`/api/client-portal/profiles/${clientId}/notes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const createClient = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/client-portal/profiles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        const newClient = await response.json();
        setClients([...clients, newClient]);
        setShowCreateClient(false);
        setFormData({
          company_name: '',
          brand_name: '',
          amazon_store_url: '',
          marketplace: 'US',
          main_category: '',
          monthly_revenue: 0,
          product_count: 0,
          target_acos: null,
          target_tacos: null,
          target_margin: null,
        });
      }
    } catch (error) {
      console.error('Error creating client:', error);
    }
    setLoading(false);
  };

  const markOnboardingStep = async (stepId, clientId) => {
    try {
      const response = await fetch(`/api/client-portal/profiles/${clientId}/onboarding/${stepId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        fetchOnboarding(clientId);
      }
    } catch (error) {
      console.error('Error marking step complete:', error);
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedClient) return;

    try {
      const response = await fetch(`/api/client-portal/profiles/${selectedClient.id}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note_type: newNoteType,
          content: newNote,
          is_pinned: false,
        }),
      });
      if (response.ok) {
        const createdNote = await response.json();
        setNotes([createdNote, ...notes]);
        setNewNote('');
        setNewNoteType('general');
      }
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const getStatusBadge = (status, percentage) => {
    let bgColor = '#4A4A4A';
    if (status === 'pending') bgColor = '#4A4A4A';
    else if (status === 'in_progress') bgColor = 'rgba(255, 215, 0, 0.2)';
    else if (status === 'completed') bgColor = 'rgba(34, 197, 94, 0.2)';

    let textColor = textSecondary;
    if (status === 'in_progress') textColor = accentColor;
    else if (status === 'completed') textColor = '#22C55E';

    return (
      <div style={{
        display: 'inline-block',
        padding: '6px 12px',
        borderRadius: '4px',
        backgroundColor: bgColor,
        color: textColor,
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'capitalize',
      }}>
        {status.replace('_', ' ')} ({Math.round(percentage)}%)
      </div>
    );
  };

  const noteTypeColors = {
    general: '#8B8B8B',
    meeting: accentColor,
    action: '#EF4444',
    milestone: '#22C55E',
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: darkBg,
      color: textPrimary,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <Sidebar />
      
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Client Portal</h1>
          {activeTab === 'all-clients' && (
            <button
              onClick={() => setShowCreateClient(!showCreateClient)}
              style={{
                backgroundColor: accentColor,
                color: darkBg,
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              + New Client
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: `1px solid ${borderColor}`,
          paddingBottom: '16px',
        }}>
          {['all-clients', 'onboarding', 'client-dashboard', 'notes'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedClient(null);
              }}
              style={{
                padding: '12px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === tab ? accentColor : textSecondary,
                borderBottom: activeTab === tab ? `2px solid ${accentColor}` : 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? '600' : '400',
                fontSize: '14px',
                transition: 'all 0.3s ease',
              }}
            >
              {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        {/* All Clients Tab */}
        {activeTab === 'all-clients' && (
          <>
            {showCreateClient && (
              <div style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '24px',
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: accentColor }}>Create New Client</h3>
                <form onSubmit={createClient} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}>
                  <input
                    type="text"
                    placeholder="Company Name"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: darkBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '6px',
                      color: textPrimary,
                      fontSize: '14px',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Brand Name"
                    required
                    value={formData.brand_name}
                    onChange={(e) => setFormData({...formData, brand_name: e.target.value})}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: darkBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '6px',
                      color: textPrimary,
                      fontSize: '14px',
                    }}
                  />
                  <input
                    type="url"
                    placeholder="Amazon Store URL"
                    value={formData.amazon_store_url}
                    onChange={(e) => setFormData({...formData, amazon_store_url: e.target.value})}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: darkBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '6px',
                      color: textPrimary,
                      fontSize: '14px',
                    }}
                  />
                  <select
                    value={formData.marketplace}
                    onChange={(e) => setFormData({...formData, marketplace: e.target.value})}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: darkBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '6px',
                      color: textPrimary,
                      fontSize: '14px',
                    }}
                  >
                    {['US', 'CA', 'UK', 'DE', 'FR', 'ES', 'IT', 'AU', 'JP'].map(m => (
                      <option key={m} value={m} style={{ backgroundColor: cardBg }}>{m}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Main Category"
                    value={formData.main_category}
                    onChange={(e) => setFormData({...formData, main_category: e.target.value})}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: darkBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '6px',
                      color: textPrimary,
                      fontSize: '14px',
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Monthly Revenue ($)"
                    value={formData.monthly_revenue}
                    onChange={(e) => setFormData({...formData, monthly_revenue: parseInt(e.target.value) || 0})}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: darkBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '6px',
                      color: textPrimary,
                      fontSize: '14px',
                    }}
                  />
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px' }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        backgroundColor: accentColor,
                        color: darkBg,
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Create Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateClient(false)}
                      style={{
                        backgroundColor: 'transparent',
                        color: textSecondary,
                        border: `1px solid ${borderColor}`,
                        padding: '10px 20px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderBottom: `1px solid ${borderColor}`,
                  }}>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: textSecondary,
                    }}>Company</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: textSecondary,
                    }}>Brand</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: textSecondary,
                    }}>Marketplace</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: textSecondary,
                    }}>Revenue</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: textSecondary,
                    }}>Products</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: textSecondary,
                    }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client, idx) => (
                    <tr key={client.id} style={{
                      borderBottom: idx < clients.length - 1 ? `1px solid ${borderColor}` : 'none',
                    }}>
                      <td style={{
                        padding: '16px',
                        fontSize: '14px',
                        color: textPrimary,
                      }}>{client.company_name}</td>
                      <td style={{
                        padding: '16px',
                        fontSize: '14px',
                        color: textSecondary,
                      }}>{client.brand_name}</td>
                      <td style={{
                        padding: '16px',
                        fontSize: '14px',
                        color: textSecondary,
                      }}>{client.marketplace}</td>
                      <td style={{
                        padding: '16px',
                        fontSize: '14px',
                        color: textSecondary,
                      }}>${(client.monthly_revenue / 100).toLocaleString()}</td>
                      <td style={{
                        padding: '16px',
                        fontSize: '14px',
                        color: textSecondary,
                      }}>{client.product_count}</td>
                      <td style={{
                        padding: '16px',
                      }}>
                        {getStatusBadge(client.onboarding_status, (client.onboarding_step / 8) * 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clients.length === 0 && (
                <div style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: textSecondary,
                }}>
                  No clients yet. Create one to get started.
                </div>
              )}
            </div>
          </>
        )}

        {/* Onboarding Tab */}
        {activeTab === 'onboarding' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '300px 1fr',
            gap: '24px',
          }}>
            <div style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '16px',
              height: 'fit-content',
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: accentColor }}>Select Client</h3>
              {clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: selectedClient?.id === client.id ? borderColor : 'transparent',
                    border: `1px solid ${selectedClient?.id === client.id ? accentColor : borderColor}`,
                    borderRadius: '6px',
                    color: selectedClient?.id === client.id ? accentColor : textSecondary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {client.company_name}
                </button>
              ))}
            </div>

            {selectedClient && onboarding && (
              <div style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '24px',
              }}>
                <h2 style={{ margin: '0 0 8px 0', color: textPrimary }}>{selectedClient.company_name}</h2>
                <p style={{ margin: '0 0 24px 0', color: textSecondary, fontSize: '14px' }}>
                  Onboarding Progress: {Math.round(onboarding.completion_percentage)}%
                </p>

                <div style={{
                  backgroundColor: borderColor,
                  height: '8px',
                  borderRadius: '4px',
                  marginBottom: '24px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    backgroundColor: accentColor,
                    height: '100%',
                    width: `${onboarding.completion_percentage}%`,
                    transition: 'width 0.3s ease',
                  }}></div>
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>
                  {onboarding.items.map((step, idx) => (
                    <div key={step.id} style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      border: `1px solid ${step.is_completed ? accentColor : borderColor}`,
                      borderRadius: '8px',
                      padding: '16px',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}>
                        <input
                          type="checkbox"
                          checked={step.is_completed}
                          onChange={() => markOnboardingStep(step.id, selectedClient.id)}
                          style={{
                            marginTop: '2px',
                            cursor: 'pointer',
                            width: '18px',
                            height: '18px',
                            accentColor: accentColor,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            margin: '0 0 4px 0',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: step.is_completed ? textSecondary : textPrimary,
                            textDecoration: step.is_completed ? 'line-through' : 'none',
                          }}>
                            {step.step_order}. {step.step_name}
                          </h4>
                          <p style={{
                            margin: 0,
                            fontSize: '12px',
                            color: textSecondary,
                          }}>
                            {step.description}
                          </p>
                          {step.completed_at && (
                            <p style={{
                              margin: '8px 0 0 0',
                              fontSize: '11px',
                              color: accentColor,
                            }}>
                              Completed: {new Date(step.completed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!selectedClient && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: textSecondary,
                fontSize: '14px',
              }}>
                Select a client to view onboarding checklist
              </div>
            )}
          </div>
        )}

        {/* Client Dashboard Tab */}
        {activeTab === 'client-dashboard' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '300px 1fr',
            gap: '24px',
          }}>
            <div style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '16px',
              height: 'fit-content',
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: accentColor }}>Select Client</h3>
              {clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: selectedClient?.id === client.id ? borderColor : 'transparent',
                    border: `1px solid ${selectedClient?.id === client.id ? accentColor : borderColor}`,
                    borderRadius: '6px',
                    color: selectedClient?.id === client.id ? accentColor : textSecondary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13px',
                  }}
                >
                  {client.company_name}
                </button>
              ))}
            </div>

            {selectedClient && (
              <div style={{
                display: 'grid',
                gap: '24px',
              }}>
                <div>
                  <h2 style={{ margin: '0 0 24px 0', color: textPrimary }}>{selectedClient.company_name} Dashboard</h2>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px',
                  }}>
                    <div style={{
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      padding: '16px',
                    }}>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '12px',
                        color: textSecondary,
                        textTransform: 'uppercase',
                        fontWeight: '600',
                      }}>Monthly Revenue</p>
                      <p style={{
                        margin: 0,
                        fontSize: '24px',
                        fontWeight: '700',
                        color: accentColor,
                      }}>${(selectedClient.monthly_revenue / 100).toLocaleString()}</p>
                    </div>

                    <div style={{
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      padding: '16px',
                    }}>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '12px',
                        color: textSecondary,
                        textTransform: 'uppercase',
                        fontWeight: '600',
                      }}>Product Count</p>
                      <p style={{
                        margin: 0,
                        fontSize: '24px',
                        fontWeight: '700',
                        color: accentColor,
                      }}>{selectedClient.product_count}</p>
                    </div>

                    <div style={{
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      padding: '16px',
                    }}>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '12px',
                        color: textSecondary,
                        textTransform: 'uppercase',
                        fontWeight: '600',
                      }}>Target ACoS</p>
                      <p style={{
                        margin: 0,
                        fontSize: '24px',
                        fontWeight: '700',
                        color: accentColor,
                      }}>{selectedClient.target_acos ? `${(selectedClient.target_acos / 100).toFixed(1)}%` : '—'}</p>
                    </div>

                    <div style={{
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      padding: '16px',
                    }}>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '12px',
                        color: textSecondary,
                        textTransform: 'uppercase',
                        fontWeight: '600',
                      }}>Target TACOS</p>
                      <p style={{
                        margin: 0,
                        fontSize: '24px',
                        fontWeight: '700',
                        color: accentColor,
                      }}>{selectedClient.target_tacos ? `${(selectedClient.target_tacos / 100).toFixed(1)}%` : '—'}</p>
                    </div>

                    <div style={{
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      padding: '16px',
                    }}>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '12px',
                        color: textSecondary,
                        textTransform: 'uppercase',
                        fontWeight: '600',
                      }}>Marketplace</p>
                      <p style={{
                        margin: 0,
                        fontSize: '24px',
                        fontWeight: '700',
                        color: accentColor,
                      }}>{selectedClient.marketplace}</p>
                    </div>

                    <div style={{
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      padding: '16px',
                    }}>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '12px',
                        color: textSecondary,
                        textTransform: 'uppercase',
                        fontWeight: '600',
                      }}>Status</p>
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: '600',
                        color: selectedClient.onboarding_status === 'completed' ? '#22C55E' : 
                               selectedClient.onboarding_status === 'in_progress' ? accentColor : textSecondary,
                        textTransform: 'capitalize',
                      }}>
                        {selectedClient.onboarding_status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>

                {onboarding && (
                  <div style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                    padding: '16px',
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', color: accentColor, fontSize: '16px' }}>Onboarding Status</h3>
                    <div style={{
                      backgroundColor: borderColor,
                      height: '8px',
                      borderRadius: '4px',
                      marginBottom: '12px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        backgroundColor: accentColor,
                        height: '100%',
                        width: `${onboarding.completion_percentage}%`,
                      }}></div>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      color: textSecondary,
                    }}>
                      {Math.round(onboarding.completion_percentage)}% Complete ({onboarding.items.filter(i => i.is_completed).length}/{onboarding.items.length} steps)
                    </p>
                  </div>
                )}
              </div>
            )}

            {!selectedClient && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: textSecondary,
                fontSize: '14px',
              }}>
                Select a client to view dashboard
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '300px 1fr',
            gap: '24px',
          }}>
            <div style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '16px',
              height: 'fit-content',
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: accentColor }}>Select Client</h3>
              {clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: selectedClient?.id === client.id ? borderColor : 'transparent',
                    border: `1px solid ${selectedClient?.id === client.id ? accentColor : borderColor}`,
                    borderRadius: '6px',
                    color: selectedClient?.id === client.id ? accentColor : textSecondary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13px',
                  }}
                >
                  {client.company_name}
                </button>
              ))}
            </div>

            {selectedClient && (
              <div>
                <h2 style={{ margin: '0 0 24px 0', color: textPrimary }}>Notes for {selectedClient.company_name}</h2>

                <form onSubmit={addNote} style={{
                  backgroundColor: cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: accentColor }}>Add Note</h3>
                  <select
                    value={newNoteType}
                    onChange={(e) => setNewNoteType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      marginBottom: '12px',
                      backgroundColor: darkBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '6px',
                      color: textPrimary,
                      fontSize: '14px',
                    }}
                  >
                    <option value="general">General Note</option>
                    <option value="meeting">Meeting Note</option>
                    <option value="action">Action Item</option>
                    <option value="milestone">Milestone</option>
                  </select>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Write a note..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      marginBottom: '12px',
                      backgroundColor: darkBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '6px',
                      color: textPrimary,
                      fontSize: '14px',
                      resize: 'vertical',
                      minHeight: '80px',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newNote.trim()}
                    style={{
                      backgroundColor: accentColor,
                      color: darkBg,
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: newNote.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      opacity: newNote.trim() ? 1 : 0.5,
                    }}
                  >
                    Add Note
                  </button>
                </form>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {notes.map((note) => (
                    <div key={note.id} style={{
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      padding: '16px',
                      borderLeft: `4px solid ${noteTypeColors[note.note_type] || textSecondary}`,
                      opacity: note.is_pinned ? 1 : 0.9,
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px',
                      }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          backgroundColor: `${noteTypeColors[note.note_type] || textSecondary}20`,
                          color: noteTypeColors[note.note_type] || textSecondary,
                          fontSize: '11px',
                          fontWeight: '600',
                          borderRadius: '3px',
                          textTransform: 'capitalize',
                        }}>
                          {note.note_type}
                        </span>
                        {note.is_pinned && (
                          <span style={{
                            fontSize: '12px',
                            color: accentColor,
                            fontWeight: '600',
                          }}>
                            📌 Pinned
                          </span>
                        )}
                      </div>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '14px',
                        color: textPrimary,
                        lineHeight: '1.5',
                      }}>
                        {note.content}
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: textSecondary,
                      }}>
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <div style={{
                      padding: '32px',
                      textAlign: 'center',
                      color: textSecondary,
                      fontSize: '14px',
                    }}>
                      No notes yet. Create one to get started.
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selectedClient && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: textSecondary,
                fontSize: '14px',
              }}>
                Select a client to view notes
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
