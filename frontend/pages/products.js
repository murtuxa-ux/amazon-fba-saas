import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';

const ProductsPage = () => {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({
    hunted: 0,
    contacted: 0,
    approved: 0,
    ordered: 0,
    live: 0,
    discontinued: 0,
  });
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    status: 'All',
    client: '',
    search: '',
    sortBy: 'newest',
  });
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [statusChangeProduct, setStatusChangeProduct] = useState(null);
  const [statusChangeNotes, setStatusChangeNotes] = useState('');
  const [bulkImportData, setBulkImportData] = useState('');
  const [formData, setFormData] = useState({
    asin: '',
    title: '',
    brand: '',
    category: '',
    supplierName: '',
    supplierContact: '',
    costPrice: '',
    sellPrice: '',
    fbaFee: '',
    referralFee: '',
    monthlySalesEst: '',
    bsr: '',
    client: '',
    assignedTo: '',
    notes: '',
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://amazon-fba-saas-production.up.railway.app';

  const statusColors = {
    hunted: '#FFD700',
    contacted: '#3B82F6',
    approved: '#8B5CF6',
    ordered: '#FF8C42',
    live: '#22C55E',
    discontinued: '#EF4444',
  };

  const statusBgColors = {
    hunted: 'rgba(255, 215, 0, 0.1)',
    contacted: 'rgba(59, 130, 246, 0.1)',
    approved: 'rgba(139, 92, 246, 0.1)',
    ordered: 'rgba(255, 140, 66, 0.1)',
    live: 'rgba(34, 197, 94, 0.1)',
    discontinued: 'rgba(239, 68, 68, 0.1)',
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('ecomera_token');
    setToken(storedToken || '');
  }, []);

  useEffect(() => {
    if (token) {
      fetchProducts();
      fetchStats();
      fetchClients();
      fetchUsers();
    }
  }, [token, filter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status !== 'All') params.append('status', filter.status);
      if (filter.client) params.append('client', filter.client);
      if (filter.search) params.append('search', filter.search);
      if (filter.sortBy !== 'newest') params.append('sortBy', filter.sortBy);

      const response = await fetch(`${API_BASE}/products-pipeline?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/products-pipeline/stats/pipeline`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setStats(data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`${API_BASE}/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      asin: '',
      title: '',
      brand: '',
      category: '',
      supplierName: '',
      supplierContact: '',
      costPrice: '',
      sellPrice: '',
      fbaFee: '',
      referralFee: '',
      monthlySalesEst: '',
      bsr: '',
      client: '',
      assignedTo: '',
      notes: '',
    });
    setShowModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      asin: product.asin || '',
      title: product.title || '',
      brand: product.brand || '',
      category: product.category || '',
      supplierName: product.supplierName || '',
      supplierContact: product.supplierContact || '',
      costPrice: product.costPrice || '',
      sellPrice: product.sellPrice || '',
      fbaFee: product.fbaFee || '',
      referralFee: product.referralFee || '',
      monthlySalesEst: product.monthlySalesEst || '',
      bsr: product.bsr || '',
      client: product.client || '',
      assignedTo: product.assignedTo || '',
      notes: product.notes || '',
    });
    setShowModal(true);
  };

  const handleSaveProduct = async () => {
    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const url = editingProduct
        ? `${API_BASE}/products-pipeline/${editingProduct.id}`
        : `${API_BASE}/products-pipeline`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        fetchProducts();
        fetchStats();
      }
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const response = await fetch(`${API_BASE}/products-pipeline/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchProducts();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleStatusChange = async () => {
    if (!statusChangeProduct) return;
    try {
      const response = await fetch(
        `${API_BASE}/products-pipeline/${statusChangeProduct.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: statusChangeProduct.newStatus,
            notes: statusChangeNotes,
          }),
        }
      );
      if (response.ok) {
        setShowStatusModal(false);
        setStatusChangeProduct(null);
        setStatusChangeNotes('');
        fetchProducts();
        fetchStats();
      }
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const handleBulkImport = async () => {
    try {
      const response = await fetch(`${API_BASE}/products-pipeline/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ csvData: bulkImportData }),
      });
      if (response.ok) {
        setBulkImportData('');
        setShowBulkImport(false);
        fetchProducts();
        fetchStats();
      }
    } catch (error) {
      console.error('Error bulk importing:', error);
    }
  };

  const calculateMetrics = (costPrice, sellPrice, fbaFee = 0, referralFee = 0) => {
    const cost = parseFloat(costPrice) || 0;
    const sell = parseFloat(sellPrice) || 0;
    const fbaF = parseFloat(fbaFee) || 0;
    const refF = parseFloat(referralFee) || 0;
    const netProfit = sell - cost - fbaF - refF;
    const roi = cost > 0 ? ((netProfit / cost) * 100).toFixed(2) : 0;
    return { netProfit: netProfit.toFixed(2), roi };
  };

  const metrics = calculateMetrics(
    formData.costPrice,
    formData.sellPrice,
    formData.fbaFee,
    formData.referralFee
  );

  const statuses = ['Hunted', 'Contacted', 'Approved', 'Ordered', 'Live', 'Discontinued'];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFFFFF' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '40px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>Product Pipeline</h1>
            <p style={{ margin: '8px 0 0 0', color: '#888888', fontSize: '14px' }}>
              {products.length} products
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowBulkImport(true)}
              style={{
                padding: '12px 20px',
                backgroundColor: '#1E1E1E',
                border: '1px solid #2E2E2E',
                color: '#FFFFFF',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              📤 Bulk Import
            </button>
            <button
              onClick={handleAddProduct}
              style={{
                padding: '12px 20px',
                backgroundColor: '#FFD700',
                color: '#000000',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              + Add Product
            </button>
          </div>
        </div>

        {/* Pipeline Stats Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '40px' }}>
          {[
            { label: 'Hunted', count: stats.hunted || 0, color: '#FFD700' },
            { label: 'Contacted', count: stats.contacted || 0, color: '#3B82F6' },
            { label: 'Approved', count: stats.approved || 0, color: '#8B5CF6' },
            { label: 'Ordered', count: stats.ordered || 0, color: '#FF8C42' },
            { label: 'Live', count: stats.live || 0, color: '#22C55E' },
            { label: 'Discontinued', count: stats.discontinued || 0, color: '#EF4444' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                backgroundColor: '#111111',
                border: `1px solid ${stat.color}33`,
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px' }}>{stat.label}</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: stat.color }}>
                {stat.count}
              </p>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
            backgroundColor: '#111111',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #1E1E1E',
          }}
        >
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            style={{
              padding: '10px',
              backgroundColor: '#0A0A0A',
              border: '1px solid #1E1E1E',
              color: '#FFFFFF',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option>All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={filter.client}
            onChange={(e) => setFilter({ ...filter, client: e.target.value })}
            style={{
              padding: '10px',
              backgroundColor: '#0A0A0A',
              border: '1px solid #1E1E1E',
              color: '#FFFFFF',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search ASIN, title, brand..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            style={{
              padding: '10px',
              backgroundColor: '#0A0A0A',
              border: '1px solid #1E1E1E',
              color: '#FFFFFF',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />

          <select
            value={filter.sortBy}
            onChange={(e) => setFilter({ ...filter, sortBy: e.target.value })}
            style={{
              padding: '10px',
              backgroundColor: '#0A0A0A',
              border: '1px solid #1E1E1E',
              color: '#FFFFFF',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="newest">Newest</option>
            <option value="roi">ROI (High to Low)</option>
            <option value="profit">Profit (High to Low)</option>
          </select>
        </div>

        {/* Products Table */}
        <div style={{ backgroundColor: '#111111', borderRadius: '8px', border: '1px solid #1E1E1E', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#888888' }}>Loading products...</div>
          ) : products.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#888888' }}>No products found</div>
          ) : (
            <>
              {/* Table Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 200px 120px 100px 150px 80px 120px 1fr',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: '#0A0A0A',
                  borderBottom: '1px solid #1E1E1E',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#888888',
                }}
              >
                <div>ASIN</div>
                <div>Title</div>
                <div>Brand</div>
                <div>Status</div>
                <div>Cost → Sell</div>
                <div>ROI %</div>
                <div>Client</div>
                <div>Actions</div>
              </div>

              {/* Table Rows */}
              {products.map((product) => (
                <div key={product.id}>
                  <div
                    onClick={() => setExpandedId(expandedId === product.id ? null : product.id)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 200px 120px 100px 150px 80px 120px 1fr',
                      gap: '12px',
                      padding: '16px',
                      borderBottom: '1px solid #1E1E1E',
                      cursor: 'pointer',
                      fontSize: '14px',
                      alignItems: 'center',
                      backgroundColor: expandedId === product.id ? '#1E1E1E' : 'transparent',
                      transition: 'backgroundColor 0.2s',
                    }}
                  >
                    <div style={{ color: '#FFD700', fontWeight: '600' }}>{product.asin}</div>
                    <div style={{ color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {product.title}
                    </div>
                    <div style={{ color: '#888888' }}>{product.brand || '—'}</div>
                    <div
                      style={{
                        backgroundColor: statusBgColors[product.status?.toLowerCase()] || '#1E1E1E',
                        color: statusColors[product.status?.toLowerCase()] || '#FFFFFF',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        width: 'fit-content',
                      }}
                    >
                      {product.status}
                    </div>
                    <div style={{ color: '#FFFFFF', fontSize: '13px' }}>
                      ${product.costPrice} → ${product.sellPrice}
                    </div>
                    <div style={{ color: '#22C55E', fontWeight: '600' }}>{product.roi}%</div>
                    <div style={{ color: '#888888', fontSize: '13px' }}>{product.client || '—'}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusChangeProduct({ ...product, newStatus: product.status });
                          setShowStatusModal(true);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#1E1E1E',
                          border: '1px solid #2E2E2E',
                          color: '#FFFFFF',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Change
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProduct(product);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#1E1E1E',
                          border: '1px solid #2E2E2E',
                          color: '#FFFFFF',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(product.id);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#1E1E1E',
                          border: '1px solid #2E2E2E',
                          color: '#EF4444',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === product.id && (
                    <div style={{ padding: '16px', backgroundColor: '#1E1E1E', borderBottom: '1px solid #1E1E1E' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px' }}>
                        <div>
                          <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px' }}>SUPPLIER INFO</p>
                          <p style={{ margin: '4px 0', color: '#FFFFFF' }}>
                            <strong>Name:</strong> {product.supplierName || '—'}
                          </p>
                          <p style={{ margin: '4px 0', color: '#FFFFFF' }}>
                            <strong>Contact:</strong> {product.supplierContact || '—'}
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px' }}>METRICS</p>
                          <p style={{ margin: '4px 0', color: '#FFFFFF' }}>
                            <strong>Net Profit:</strong> ${product.netProfit || '0.00'}
                          </p>
                          <p style={{ margin: '4px 0', color: '#FFFFFF' }}>
                            <strong>Monthly Est.:</strong> {product.monthlySalesEst || '0'} units
                          </p>
                          <p style={{ margin: '4px 0', color: '#FFFFFF' }}>
                            <strong>BSR:</strong> {product.bsr || '—'}
                          </p>
                        </div>
                      </div>
                      {product.notes && (
                        <div style={{ marginTop: '16px' }}>
                          <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px' }}>NOTES</p>
                          <p style={{ margin: 0, color: '#FFFFFF', fontSize: '13px' }}>{product.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '8px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700' }}>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="ASIN"
                value={formData.asin}
                onChange={(e) => setFormData({ ...formData, asin: e.target.value })}
                style={{
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              <input
                type="text"
                placeholder="Brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                style={{
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            <input
              type="text"
              placeholder="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#0A0A0A',
                border: '1px solid #1E1E1E',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '16px',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              <input
                type="text"
                placeholder="Supplier Name"
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                style={{
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            <input
              type="text"
              placeholder="Supplier Contact"
              value={formData.supplierContact}
              onChange={(e) => setFormData({ ...formData, supplierContact: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#0A0A0A',
                border: '1px solid #1E1E1E',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '16px',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <input
                type="number"
                placeholder="Cost Price"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                step="0.01"
                style={{
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              <input
                type="number"
                placeholder="Sell Price"
                value={formData.sellPrice}
                onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                step="0.01"
                style={{
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              <input
                type="number"
                placeholder="FBA Fee"
                value={formData.fbaFee}
                onChange={(e) => setFormData({ ...formData, fbaFee: e.target.value })}
                step="0.01"
                style={{
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              <input
                type="number"
                placeholder="Referral Fee"
                value={formData.referralFee}
                onChange={(e) => setFormData({ ...formData, referralFee: e.target.value })}
                step="0.01"
                style={{
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <input
                type="number"
                placeholder="Monthly Sales Est"
                value={formData.monthlySalesEst}
                onChange={(e) => setFormData({ ...formData, monthlySalesEst: e.target.value })}
                style={{
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              <input
                type="text"
                placeholder="BSR"
                value={formData.bsr}
                onChange={(e) => setFormData({ ...formData, bsr: e.target.value })}
                style={{
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              <select
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                style={{
                  padding: '10px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="">Select Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#0A0A0A',
                border: '1px solid #1E1E1E',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '16px',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Assign To</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            <textarea
              placeholder="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#0A0A0A',
                border: '1px solid #1E1E1E',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '16px',
                minHeight: '80px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />

            <div style={{ backgroundColor: '#0A0A0A', padding: '12px', borderRadius: '6px', marginBottom: '24px' }}>
              <p style={{ margin: '0 0 8px 0', color: '#888888', fontSize: '12px' }}>CALCULATED METRICS</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <p style={{ margin: 0, color: '#22C55E' }}>
                  <strong>Net Profit:</strong> ${metrics.netProfit}
                </p>
                <p style={{ margin: 0, color: '#22C55E' }}>
                  <strong>ROI:</strong> {metrics.roi}%
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSaveProduct}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#FFD700',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Save Product
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#1E1E1E',
                  color: '#FFFFFF',
                  border: '1px solid #2E2E2E',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && statusChangeProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowStatusModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '8px',
              padding: '32px',
              maxWidth: '400px',
              width: '100%',
            }}
          >
            <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700' }}>
              Change Product Status
            </h2>

            <select
              value={statusChangeProduct.newStatus}
              onChange={(e) =>
                setStatusChangeProduct({ ...statusChangeProduct, newStatus: e.target.value })
              }
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#0A0A0A',
                border: '1px solid #1E1E1E',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '16px',
                boxSizing: 'border-box',
              }}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <textarea
              placeholder="Add notes for this status change (optional)"
              value={statusChangeNotes}
              onChange={(e) => setStatusChangeNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#0A0A0A',
                border: '1px solid #1E1E1E',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '24px',
                minHeight: '100px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleStatusChange}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#FFD700',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Update Status
              </button>
              <button
                onClick={() => setShowStatusModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#1E1E1E',
                  color: '#FFFFFF',
                  border: '1px solid #2E2E2E',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowBulkImport(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#111111',
              border: '1px solid #1E1E1E',
              borderRadius: '8px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
            }}
          >
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>
              Bulk Import Products
            </h2>
            <p style={{ margin: '0 0 16px 0', color: '#888888', fontSize: '13px' }}>
              Paste CSV data: ASIN, Title, Brand, Cost Price, Sell Price (one per line)
            </p>

            <textarea
              placeholder="B0CJ4X9RM7,Product Title,Brand Name,25.50,49.99&#10;B0CJ4X9RM8,Another Product,Another Brand,30.00,59.99"
              value={bulkImportData}
              onChange={(e) => setBulkImportData(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0A0A0A',
                border: '1px solid #1E1E1E',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '24px',
                minHeight: '200px',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
              }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleBulkImport}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#FFD700',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Import Products
              </button>
              <button
                onClick={() => setShowBulkImport(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#1E1E1E',
                  color: '#FFFFFF',
                  border: '1px solid #2E2E2E',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
