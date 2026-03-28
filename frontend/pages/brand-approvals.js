import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

const CATEGORIES = ['Beauty', 'Supplements', 'Automotive', 'Electronics', 'Jewelry', 'Clothing'];
const PRIORITIES = ['High', 'Medium', 'Low'];

export default function BrandApprovalsTracker() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [formData, setFormData] = useState({
    brandName: '',
    category: 'Beauty',
    priority: 'Medium',
    notes: ''
  });

  // Auth check on mount
  useEffect(() => {
    const token = localStorage.getItem('ecomera_token');
    const user = localStorage.getItem('ecomera_user');

    if (!token || !user) {
      router.push('/login');
      return;
    }

    setIsAuthenticated(true);
  }, [router]);

  // Fetch all data
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('ecomera_token');

        // Fetch stats
        const statsRes = await fetch(`${API_URL}/brand-approvals/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }

        // Fetch applications
        const appsRes = await fetch(`${API_URL}/brand-approvals/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (appsRes.ok) {
          const data = await appsRes.json();
          setApplications(Array.isArray(data) ? data : []);
        } else {
          setApplications([]);
        }
      } catch (err) {
        setError('Failed to load brand approvals data. Please try again.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();

    if (!formData.brandName.trim()) {
      setError('Please enter a brand name');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const token = localStorage.getItem('ecomera_token');

      const res = await fetch(`${API_URL}/brand-approvals/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          brand_name: formData.brandName,
          category: formData.category,
          priority: formData.priority,
          notes: formData.notes
        })
      });

      if (res.ok) {
        setSuccessMessage(`Successfully created brand approval application for ${formData.brandName}`);
        setFormData({ brandName: '', category: 'Beauty', priority: 'Medium', notes: '' });
        setShowForm(false);

        // Refresh data
        const token = localStorage.getItem('ecomera_token');
        const appsRes = await fetch(`${API_URL}/brand-approvals/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (appsRes.ok) {
          const data = await appsRes.json();
          setApplications(Array.isArray(data) ? data : []);
        }

        const statsRes = await fetch(`${API_URL}/brand-approvals/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }

        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create application');
      }
    } catch (err) {
      setError('Error creating application. Please try again.');
      console.error('Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return '#00C853';
      case 'rejected':
        return '#FF5252';
      case 'pending':
        return '#FFC107';
      case 'in_progress':
        return '#2196F3';
      default:
        return '#888888';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return '#FF5252';
      case 'medium':
        return '#FFC107';
      case 'low':
        return '#2196F3';
      default:
        return '#888888';
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: '#0A0A0A' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#FFFFFF', margin: '0 0 8px 0' }}>
            Brand Approval Tracker
          </h1>
          <p style={{ fontSize: '14px', color: '#888888', margin: 0 }}>
            Track brand ungating and approval requests
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            backgroundColor: '#FF5252',
            color: '#FFFFFF',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
        {successMessage && (
          <div style={{
            backgroundColor: '#00C853',
            color: '#FFFFFF',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {successMessage}
          </div>
        )}

        {loading ? (
          <div style={{ color: '#888888', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
            Loading brand approvals data...
          </div>
        ) : (
          <>
            {/* Stats Row */}
            {stats && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '32px'
              }}>
                <div style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <p style={{ fontSize: '12px', color: '#888888', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                    Total Applications
                  </p>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFFFFF', margin: 0 }}>
                    {stats.totalApplications || 0}
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <p style={{ fontSize: '12px', color: '#888888', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                    Approved
                  </p>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#00C853', margin: 0 }}>
                    {stats.approved || 0}
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <p style={{ fontSize: '12px', color: '#888888', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                    Pending
                  </p>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFC107', margin: 0 }}>
                    {stats.pending || 0}
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <p style={{ fontSize: '12px', color: '#888888', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                    Rejected
                  </p>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#FF5252', margin: 0 }}>
                    {stats.rejected || 0}
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <p style={{ fontSize: '12px', color: '#888888', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                    Approval Rate
                  </p>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFD700', margin: 0 }}>
                    {stats.approvalRate || 0}%
                  </p>
                </div>
              </div>
            )}

            {/* New Application Button and Form */}
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                style={{
                  backgroundColor: '#FFD700',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginBottom: '32px'
                }}
              >
                New Application
              </button>
            ) : (
              <div style={{
                backgroundColor: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '32px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#FFFFFF', margin: '0 0 16px 0' }}>
                  Create New Application
                </h3>
                <form onSubmit={handleSubmitApplication}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: '#888888',
                      marginBottom: '8px',
                      textTransform: 'uppercase'
                    }}>
                      Brand Name
                    </label>
                    <input
                      type="text"
                      name="brandName"
                      value={formData.brandName}
                      onChange={handleInputChange}
                      placeholder="Enter brand name"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: '#0A0A0A',
                        border: '1px solid #1E1E1E',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: '#888888',
                      marginBottom: '8px',
                      textTransform: 'uppercase'
                    }}>
                      Category
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: '#0A0A0A',
                        border: '1px solid #1E1E1E',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat} style={{ backgroundColor: '#111111' }}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: '#888888',
                      marginBottom: '8px',
                      textTransform: 'uppercase'
                    }}>
                      Priority
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: '#0A0A0A',
                        border: '1px solid #1E1E1E',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    >
                      {PRIORITIES.map(priority => (
                        <option key={priority} value={priority} style={{ backgroundColor: '#111111' }}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: '#888888',
                      marginBottom: '8px',
                      textTransform: 'uppercase'
                    }}>
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Any additional notes..."
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: '#0A0A0A',
                        border: '1px solid #1E1E1E',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        backgroundColor: '#FFD700',
                        color: '#0A0A0A',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting ? 0.6 : 1
                      }}
                    >
                      {isSubmitting ? 'Creating...' : 'Create Application'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setFormData({ brandName: '', category: 'Beauty', priority: 'Medium', notes: '' });
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#888888',
                        border: '1px solid #1E1E1E',
                        borderRadius: '6px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Applications Table */}
            <div style={{
              backgroundColor: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#FFFFFF', margin: '0 0 16px 0' }}>
                  Applications
                </h3>
              </div>
              {Array.isArray(applications) && applications.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ borderTop: '1px solid #1E1E1E', borderBottom: '1px solid #1E1E1E' }}>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 20px',
                          color: '#888888',
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase'
                        }}>Brand Name</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 20px',
                          color: '#888888',
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase'
                        }}>Category</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 20px',
                          color: '#888888',
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase'
                        }}>Status</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 20px',
                          color: '#888888',
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase'
                        }}>Priority</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 20px',
                          color: '#888888',
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase'
                        }}>Documents</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 20px',
                          color: '#888888',
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase'
                        }}>Submitted Date</th>
                        <th style={{
                          textAlign: 'left',
                          padding: '12px 20px',
                          color: '#888888',
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase'
                        }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #1E1E1E' }}>
                          <td style={{ padding: '12px 20px', color: '#FFFFFF' }}>
                            {app.brandName}
                          </td>
                          <td style={{ padding: '12px 20px', color: '#FFFFFF' }}>
                            {app.category}
                          </td>
                          <td style={{ padding: '12px 20px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: getStatusColor(app.status),
                              color: '#FFFFFF'
                            }}>
                              {app.status ? app.status.replace('_', ' ').charAt(0).toUpperCase() + app.status.slice(1).replace('_', ' ').toLowerCase() : 'Unknown'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 20px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: getPriorityColor(app.priority),
                              color: '#FFFFFF'
                            }}>
                              {app.priority}
                            </span>
                          </td>
                          <td style={{ padding: '12px 20px', color: '#FFFFFF', fontSize: '12px' }}>
                            {app.docsSubmitted}/{app.docsRequired}
                          </td>
                          <td style={{ padding: '12px 20px', color: '#FFFFFF' }}>
                            {app.submittedDate ? new Date(app.submittedDate).toLocaleDateString() : '-'}
                          </td>
                          <td style={{ padding: '12px 20px' }}>
                            <button
                              onClick={() => setSelectedApplication(app)}
                              style={{
                                backgroundColor: 'transparent',
                                color: '#FFD700',
                                border: '1px solid #FFD700',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                marginRight: '8px'
                              }}
                            >
                              View
                            </button>
                            <button
                              onClick={() => router.push(`/brand-approvals/${app.id}/edit`)}
                              style={{
                                backgroundColor: 'transparent',
                                color: '#2196F3',
                                border: '1px solid #2196F3',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#888888',
                  fontSize: '14px'
                }}>
                  No brand approval applications yet. Create one to get started.
                </div>
              )}
            </div>

            {/* Application Details Modal */}
            {selectedApplication && (
              <div style={{
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
                padding: '20px'
              }}>
                <div style={{
                  backgroundColor: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '8px',
                  padding: '24px',
                  maxWidth: '600px',
                  maxHeight: '80vh',
                  overflowY: 'auto',
                  width: '100%'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', margin: 0 }}>
                      {selectedApplication.brandName}
                    </h2>
                    <button
                      onClick={() => setSelectedApplication(null)}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#888888',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #1E1E1E' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888888', textTransform: 'uppercase' }}>Category</p>
                    <p style={{ margin: 0, color: '#FFFFFF' }}>{selectedApplication.category}</p>
                  </div>

                  <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #1E1E1E' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888888', textTransform: 'uppercase' }}>Status</p>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: getStatusColor(selectedApplication.status),
                      color: '#FFFFFF'
                    }}>
                      {selectedApplication.status ? selectedApplication.status.replace('_', ' ').charAt(0).toUpperCase() + selectedApplication.status.slice(1).replace('_', ' ').toLowerCase() : 'Unknown'}
                    </span>
                  </div>

                  {/* Document Checklist */}
                  <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #1E1E1E' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#FFFFFF', margin: '0 0 12px 0' }}>
                      Required Documents
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedApplication.requiredDocs && Array.isArray(selectedApplication.requiredDocs) ? (
                        selectedApplication.requiredDocs.map((doc, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: '#0A0A0A', borderRadius: '4px' }}>
                            <input
                              type="checkbox"
                              checked={selectedApplication.submittedDocs && selectedApplication.submittedDocs.includes(doc)}
                              disabled
                              style={{ cursor: 'not-allowed' }}
                            />
                            <span style={{ color: '#FFFFFF', fontSize: '14px' }}>{doc}</span>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: '#888888', fontSize: '12px' }}>No document requirements specified</p>
                      )}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#FFFFFF', margin: '0 0 12px 0' }}>
                      Timeline
                    </h3>
                    {selectedApplication.timeline && Array.isArray(selectedApplication.timeline) && selectedApplication.timeline.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {selectedApplication.timeline.map((event, idx) => (
                          <div key={idx} style={{
                            padding: '12px',
                            backgroundColor: '#0A0A0A',
                            borderRadius: '4px',
                            borderLeft: '3px solid #FFD700'
                          }}>
                            <p style={{ margin: '0 0 4px 0', color: '#FFFFFF', fontSize: '14px', fontWeight: '600' }}>
                              {event.title}
                            </p>
                            <p style={{ margin: '0 0 4px 0', color: '#888888', fontSize: '12px' }}>
                              {event.description}
                            </p>
                            <p style={{ margin: 0, color: '#888888', fontSize: '11px' }}>
                              {event.timestamp ? new Date(event.timestamp).toLocaleString() : '-'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#888888', fontSize: '12px' }}>No timeline events yet</p>
                    )}
                  </div>

                  {selectedApplication.notes && (
                    <div style={{ marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #1E1E1E' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#FFFFFF', margin: '0 0 8px 0' }}>
                        Notes
                      </h3>
                      <p style={{ color: '#888888', fontSize: '14px', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {selectedApplication.notes}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedApplication(null)}
                    style={{
                      width: '100%',
                      backgroundColor: '#FFD700',
                      color: '#0A0A0A',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginTop: '16px'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
