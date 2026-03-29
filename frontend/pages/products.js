import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    asin: '',
    title: '',
    brand: '',
    cost: '',
    sell_price: '',
    category: '',
    status: 'lead',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/products-pipeline`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : (data?.items || data?.products || []);
      setProducts(items);
    } catch (err) {
      setError(err.message || 'Failed to load products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const getClients = () => {
    const clients = new Set();
    products.forEach((p) => {
      if (p.client) clients.add(p.client);
    });
    return Array.from(clients).sort();
  };

  const filteredProducts = products.filter((product) => {
    const statusMatch = statusFilter === 'all' || product.status === statusFilter;
    const clientMatch =
      clientFilter === 'all' || product.client === clientFilter;
    return statusMatch && clientMatch;
  });

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/products-pipeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to add product');
      }

      setFormData({
        asin: '',
        title: '',
        brand: '',
        cost: '',
        sell_price: '',
        category: '',
        status: 'lead',
      });
      setShowAddModal(false);
      fetchProducts();
    } catch (err) {
      alert('Error adding product: ' + err.message);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return `$${num.toFixed(2)}`;
  };

  const calculateROI = (product) => {
    const cost = parseFloat(product.cost || product.buy_price || product.cost_price || 0);
    const sellPrice = parseFloat(product.sell_price || product.selling_price || product.amazon_price || 0);
    const fees = parseFloat(product.fees || 0);

    if (cost <= 0) return 'N/A';

    const roi = ((sellPrice - cost - fees) / cost) * 100;
    return `${roi.toFixed(1)}%`;
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      lead: '#FF9500',
      sourced: '#5AC8FA',
      approved: '#4CD964',
      ordered: '#FF3B30',
      listed: '#34C759',
    };
    return colors[status] || '#666666';
  };

  const getScoreBadgeColor = (score) => {
    const num = parseFloat(score) || 0;
    if (num >= 80) return '#34C759';
    if (num >= 60) return '#FFD700';
    if (num >= 40) return '#FF9500';
    return '#FF3B30';
  };

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
      color: '#FFFFFF',
    },
    mainContent: {
      flex: 1,
      marginLeft: '250px',
      padding: '32px',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '32px',
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      margin: 0,
    },
    addButton: {
      backgroundColor: '#FFD700',
      color: '#0A0A0A',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background-color 0.2s',
    },
    addButtonHover: {
      backgroundColor: '#FFC107',
    },
    filterRow: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      alignItems: 'center',
    },
    filterGroup: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
    },
    filterLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#999999',
      textTransform: 'uppercase',
    },
    filterSelect: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      color: '#FFFFFF',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '14px',
      cursor: 'pointer',
    },
    tableContainer: {
      overflowX: 'auto',
      backgroundColor: '#111111',
      borderRadius: '8px',
      border: '1px solid #1E1E1E',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px',
    },
    tableHeader: {
      backgroundColor: '#1A1A1A',
      borderBottom: '1px solid #1E1E1E',
    },
    tableHeaderCell: {
      padding: '16px',
      textAlign: 'left',
      fontWeight: '600',
      color: '#CCCCCC',
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    tableRow: {
      borderBottom: '1px solid #1E1E1E',
      transition: 'background-color 0.2s',
    },
    tableRowHover: {
      backgroundColor: '#151515',
    },
    tableCell: {
      padding: '16px',
      color: '#FFFFFF',
    },
    asinCell: {
      fontFamily: 'monospace',
      fontWeight: '600',
      color: '#FFD700',
    },
    titleCell: {
      maxWidth: '200px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    badge: {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      color: '#FFFFFF',
    },
    actionButtons: {
      display: 'flex',
      gap: '8px',
    },
    actionButton: {
      padding: '6px 12px',
      borderRadius: '4px',
      border: 'none',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    viewButton: {
      backgroundColor: '#5AC8FA',
      color: '#000000',
    },
    editButton: {
      backgroundColor: '#FFD700',
      color: '#0A0A0A',
    },
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '400px',
      fontSize: '16px',
      color: '#999999',
    },
    errorContainer: {
      backgroundColor: '#FF3B30',
      color: '#FFFFFF',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '16px',
    },
    emptyContainer: {
      textAlign: 'center',
      padding: '48px 16px',
      color: '#666666',
    },
    emptyTitle: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '8px',
      color: '#CCCCCC',
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      padding: '32px',
      maxWidth: '500px',
      width: '90%',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    },
    modalTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '24px',
      color: '#FFFFFF',
    },
    modalForm: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
    },
    formLabel: {
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '8px',
      color: '#CCCCCC',
      textTransform: 'uppercase',
    },
    formInput: {
      backgroundColor: '#0A0A0A',
      border: '1px solid #1E1E1E',
      color: '#FFFFFF',
      padding: '12px',
      borderRadius: '6px',
      fontSize: '14px',
    },
    modalButtonGroup: {
      display: 'flex',
      gap: '12px',
      marginTop: '24px',
    },
    modalButton: {
      flex: 1,
      padding: '12px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    modalSubmitButton: {
      backgroundColor: '#FFD700',
      color: '#0A0A0A',
    },
    modalCancelButton: {
      backgroundColor: '#333333',
      color: '#FFFFFF',
      border: '1px solid #1E1E1E',
    },
  };

  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <h1 style={styles.title}>Products Pipeline</h1>
          <button
            style={styles.addButton}
            onClick={() => setShowAddModal(true)}
            onMouseEnter={(e) =>
              (e.target.style.backgroundColor = '#FFC107')
            }
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = '#FFD700')
            }
          >
            + Add Product
          </button>
        </div>

        {error && (
          <div style={styles.errorContainer}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div style={styles.filterRow}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Status</label>
            <select
              style={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="lead">Lead</option>
              <option value="sourced">Sourced</option>
              <option value="approved">Approved</option>
              <option value="ordered">Ordered</option>
              <option value="listed">Listed</option>
            </select>
          </div>

          {getClients().length > 0 && (
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Client</label>
              <select
                style={styles.filterSelect}
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
              >
                <option value="all">All</option>
                {getClients().map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div style={styles.emptyContainer}>
            <div style={styles.emptyTitle}>No Products Found</div>
            <p>
              {statusFilter !== 'all' || clientFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first product by clicking "+ Add Product"'}
            </p>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCell}>ASIN</th>
                  <th style={styles.tableHeaderCell}>Title</th>
                  <th style={styles.tableHeaderCell}>Brand</th>
                  <th style={styles.tableHeaderCell}>Cost</th>
                  <th style={styles.tableHeaderCell}>Sell Price</th>
                  <th style={styles.tableHeaderCell}>ROI %</th>
                  <th style={styles.tableHeaderCell}>Score</th>
                  <th style={styles.tableHeaderCell}>Status</th>
                  <th style={styles.tableHeaderCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id || product.asin}
                    style={styles.tableRow}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = '#151515')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    <td style={{ ...styles.tableCell, ...styles.asinCell }}>
                      {product.asin || 'N/A'}
                    </td>
                    <td style={{ ...styles.tableCell, ...styles.titleCell }}>
                      {product.title
                        ? product.title.substring(0, 50)
                        : 'No Title'}
                      {product.title && product.title.length > 50
                        ? '...'
                        : ''}
                    </td>
                    <td style={styles.tableCell}>{product.brand || '-'}</td>
                    <td style={styles.tableCell}>
                      {formatCurrency(
                        product.cost ||
                          product.buy_price ||
                          product.cost_price ||
                          0
                      )}
                    </td>
                    <td style={styles.tableCell}>
                      {formatCurrency(
                        product.sell_price ||
                          product.selling_price ||
                          product.amazon_price ||
                          0
                      )}
                    </td>
                    <td style={styles.tableCell}>{calculateROI(product)}</td>
                    <td style={styles.tableCell}>
                      <div
                        style={{
                          ...styles.badge,
                          backgroundColor: getScoreBadgeColor(product.score),
                        }}
                      >
                        {product.score || 'N/A'}
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <div
                        style={{
                          ...styles.badge,
                          backgroundColor: getStatusBadgeColor(
                            product.status
                          ),
                        }}
                      >
                        {product.status || 'Unknown'}
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.actionButtons}>
                        <button
                          style={{ ...styles.actionButton, ...styles.viewButton }}
                          onMouseEnter={(e) =>
                            (e.target.style.opacity = '0.8')
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.opacity = '1')
                          }
                        >
                          View
                        </button>
                        <button
                          style={{ ...styles.actionButton, ...styles.editButton }}
                          onMouseEnter={(e) =>
                            (e.target.style.opacity = '0.8')
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.opacity = '1')
                          }
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showAddModal && (
          <div style={styles.modal} onClick={() => setShowAddModal(false)}>
            <div
              style={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={styles.modalTitle}>Add New Product</h2>
              <form style={styles.modalForm} onSubmit={handleAddProduct}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>ASIN</label>
                  <input
                    style={styles.formInput}
                    type="text"
                    name="asin"
                    value={formData.asin}
                    onChange={handleFormChange}
                    placeholder="B0XXXXXXXXX"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Title</label>
                  <input
                    style={styles.formInput}
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleFormChange}
                    placeholder="Product Title"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Brand</label>
                  <input
                    style={styles.formInput}
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleFormChange}
                    placeholder="Brand Name"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Cost</label>
                  <input
                    style={styles.formInput}
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Sell Price</label>
                  <input
                    style={styles.formInput}
                    type="number"
                    name="sell_price"
                    value={formData.sell_price}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Category</label>
                  <input
                    style={styles.formInput}
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    placeholder="Product Category"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Status</label>
                  <select
                    style={styles.formInput}
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                  >
                    <option value="lead">Lead</option>
                    <option value="sourced">Sourced</option>
                    <option value="approved">Approved</option>
                    <option value="ordered">Ordered</option>
                    <option value="listed">Listed</option>
                  </select>
                </div>

                <div style={styles.modalButtonGroup}>
                  <button
                    type="submit"
                    style={{ ...styles.modalButton, ...styles.modalSubmitButton }}
                    onMouseEnter={(e) =>
                      (e.target.style.opacity = '0.9')
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.opacity = '1')
                    }
                  >
                    Add Product
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.modalButton, ...styles.modalCancelButton }}
                    onClick={() => setShowAddModal(false)}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = '#444444')
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = '#333333')
                    }
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
