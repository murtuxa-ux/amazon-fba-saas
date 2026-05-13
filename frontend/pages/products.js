import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  // BUG-20: POST /products-pipeline requires assigned_to (user id).
  // Loaded from /users/me on mount and used as the default assignment
  // when an admin/manager creates a product. AuthContext's user blob
  // doesn't include `id`, so we have to fetch.
  const [currentUserId, setCurrentUserId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    asin: '',
    title: '',
    brand: '',
    cost: '',
    sell_price: '',
    category: '',
    status: 'Lead',
    notes: '',
  });
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importLoading, setImportLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
    // Resolve the current user's id so Add Product can default
    // assigned_to. /users/me requires auth; if it fails the modal
    // simply requires the user to pick someone explicitly later.
    const token = localStorage.getItem('ecomera_token');
    if (token) {
      fetch(`${BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data && data.id) setCurrentUserId(data.id); })
        .catch(() => {});
    }
  }, []);

  // Filter and sort products when data or filters change
  useEffect(() => {
    applyFiltersAndSort();
  }, [products, statusFilter, searchQuery, sortConfig]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/products-pipeline`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      const productsArray = Array.isArray(data) ? data : data.products || [];
      setProducts(productsArray);
    } catch (err) {
      setError(err.message || 'Error fetching products');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...products];

    // Apply status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        (p.asin || '').toLowerCase().includes(query) ||
        (p.title || '').toLowerCase().includes(query) ||
        (p.brand || '').toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'roi') {
          aVal = calculateROI(a);
          bVal = calculateROI(b);
        }

        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';

        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredProducts(filtered);
  };

  const calculateROI = (product) => {
    const cost = product.cost || product.buy_price || product.cost_price || 0;
    const sell_price = product.sell_price || product.selling_price || product.price || 0;

    if (!cost || cost === 0) return 0;
    return ((sell_price - cost) / cost) * 100;
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        asin: product.asin || '',
        title: product.title || '',
        brand: product.brand || '',
        cost: product.cost || product.buy_price || product.cost_price || '',
        sell_price: product.sell_price || product.selling_price || product.price || '',
        category: product.category || '',
        status: product.status || 'Lead',
        notes: product.notes || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        asin: '',
        title: '',
        brand: '',
        cost: '',
        sell_price: '',
        category: '',
        status: 'Lead',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      asin: '',
      title: '',
      brand: '',
      cost: '',
      sell_price: '',
      category: '',
      status: 'Lead',
      notes: '',
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProduct = async () => {
    if (!formData.asin.trim() || !formData.title.trim()) {
      alert('Please fill in ASIN and Title');
      return;
    }
    // BUG-20: POST /products-pipeline requires assigned_to. Default to
    // the currently-signed-in user (resolved at mount). If we still
    // don't have it (network failed), warn rather than letting the
    // server hand back a 422 the user can't act on.
    if (!editingProduct && !currentUserId) {
      alert('Could not determine your user account. Please refresh and try again.');
      return;
    }
    // BUG-19: 15s timeout + AbortController so a wrong-route or hung
    // backend never freezes the renderer with an unresolved promise.
    setSubmitting(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const token = localStorage.getItem('ecomera_token');
      const payload = {
        ...formData,
        cost: parseFloat(formData.cost) || 0,
        sell_price: parseFloat(formData.sell_price) || 0,
      };
      if (!editingProduct) {
        payload.assigned_to = currentUserId;
      }

      const method = editingProduct ? 'PUT' : 'POST';
      const url = editingProduct
        ? `${BASE_URL}/products-pipeline/${editingProduct.id}`
        : `${BASE_URL}/products-pipeline`;

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(
          errBody.detail ||
          (editingProduct ? 'Failed to update product' : 'Failed to add product')
        );
      }

      await fetchProducts();
      handleCloseModal();
    } catch (err) {
      if (err.name === 'AbortError') {
        alert('Request timed out after 15 seconds. Please try again.');
      } else {
        alert(err.message || 'Error saving product');
      }
      console.error('Save error:', err);
    } finally {
      clearTimeout(timeoutId);
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const response = await fetch(`${BASE_URL}/products-pipeline/${productId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      await fetchProducts();
      setConfirmDelete(null);
    } catch (err) {
      alert(err.message || 'Error deleting product');
      console.error('Delete error:', err);
    }
  };

  const handleChangeStatus = async (productId, newStatus) => {
    try {
      const token = localStorage.getItem('ecomera_token');
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const response = await fetch(`${BASE_URL}/products-pipeline/${productId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...product, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      await fetchProducts();
    } catch (err) {
      alert(err.message || 'Error updating status');
      console.error('Status update error:', err);
    }
  };

  const handleExportCSV = () => {
    try {
      if (filteredProducts.length === 0) {
        alert('No products to export');
        return;
      }

      const headers = ['ASIN', 'Title', 'Brand', 'Cost', 'Sell Price', 'ROI %', 'Status', 'Date Added'];
      const rows = filteredProducts.map(p => [
        p.asin || '',
        p.title || '',
        p.brand || '',
        `$${(parseFloat(p.cost || p.buy_price || p.cost_price || 0)).toFixed(2)}`,
        `$${(parseFloat(p.sell_price || p.selling_price || p.price || 0)).toFixed(2)}`,
        `${calculateROI(p).toFixed(2)}%`,
        p.status || '',
        p.created_at || p.date_added || new Date().toISOString().split('T')[0],
      ]);

      let csv = headers.join(',') + '\n';
      rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_pipeline_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Error exporting CSV');
      console.error('Export error:', err);
    }
  };

  const handleImportCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result;
        if (typeof csv !== 'string') throw new Error('Invalid file');

        const lines = csv.trim().split('\n');
        if (lines.length < 2) {
          alert('CSV must have headers and at least one data row');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          if (values.length < 2 || !values[0]) continue;

          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });

          data.push({
            asin: row.asin || '',
            title: row.title || '',
            brand: row.brand || '',
            cost: parseFloat(row.cost) || 0,
            sell_price: parseFloat(row['sell price']) || 0,
            status: row.status || 'Lead',
            category: row.category || '',
            notes: row.notes || '',
          });
        }

        if (data.length === 0) {
          alert('No valid data found in CSV');
          return;
        }

        setImportData(data);
        setShowImportPreview(true);
      } catch (err) {
        alert('Error parsing CSV: ' + err.message);
        console.error('Parse error:', err);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    try {
      setImportLoading(true);
      const token = localStorage.getItem('ecomera_token');
      let imported = 0;
      let failed = 0;

      for (let i = 0; i < importData.length; i++) {
        try {
          const response = await fetch(`${BASE_URL}/products-pipeline`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(importData[i]),
          });

          if (response.ok) {
            imported++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }

        setImportProgress(Math.round(((i + 1) / importData.length) * 100));
      }

      alert(`Import complete: ${imported} imported, ${failed} failed`);
      setShowImportPreview(false);
      setImportData([]);
      setImportProgress(0);
      await fetchProducts();
    } catch (err) {
      alert('Error during import: ' + err.message);
      console.error('Import error:', err);
    } finally {
      setImportLoading(false);
    }
  };

  const getSummaryStats = () => {
    const total = products.length;
    const approved = products.filter(p => p.status === 'Approved').length;
    const avgROI = products.length > 0
      ? products.reduce((sum, p) => sum + calculateROI(p), 0) / products.length
      : 0;
    const totalValue = products.reduce((sum, p) => {
      const sell_price = p.sell_price || p.selling_price || p.price || 0;
      return sum + parseFloat(sell_price);
    }, 0);

    return { total, approved, avgROI, totalValue };
  };

  const stats = getSummaryStats();
  const getROIColor = (roi) => {
    if (roi > 30) return '#4ADE80';
    if (roi >= 15) return '#FACC15';
    return '#F87171';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Lead': '#6B7280',
      'Sourced': '#3B82F6',
      'Approved': '#4ADE80',
      'Rejected': '#F87171',
      'Ordered': '#A855F7',
    };
    return colors[status] || '#6B7280';
  };

  const statuses = ['Lead', 'Sourced', 'Approved', 'Rejected', 'Ordered'];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFFFFF', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: '250px', padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0 }}>Products Pipeline</h1>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ cursor: 'pointer' }}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  style={{ display: 'none' }}
                />
                <span style={{
                  padding: '10px 16px',
                  backgroundColor: '#FFD700',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}>
                  Import CSV
                </span>
              </label>
              <button
                onClick={handleExportCSV}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#FFD700',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Export CSV
              </button>
              <button
                onClick={() => handleOpenModal()}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#FFD700',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Add Product
              </button>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search by ASIN, title, or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                backgroundColor: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontSize: '14px',
              }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '10px 12px',
                backgroundColor: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <option>All</option>
              <option>Lead</option>
              <option>Sourced</option>
              <option>Approved</option>
              <option>Rejected</option>
              <option>Ordered</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Products</div>
            <div style={{ fontSize: '28px', fontWeight: '700' }}>{stats.total}</div>
          </div>
          <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Approved</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#4ADE80' }}>{stats.approved}</div>
          </div>
          <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg ROI</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: getROIColor(stats.avgROI) }}>{stats.avgROI.toFixed(2)}%</div>
          </div>
          <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Pipeline Value</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#FFD700' }}>${stats.totalValue.toFixed(2)}</div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading products...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#F87171' }}>Error: {error}</div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No products found</div>
        ) : (
          <div style={{ backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E1E1E', backgroundColor: '#0A0A0A' }}>
                  <th
                    onClick={() => handleSort('asin')}
                    style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    ASIN {sortConfig.key === 'asin' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('title')}
                    style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    Title {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('brand')}
                    style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    Brand {sortConfig.key === 'brand' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('cost')}
                    style={{
                      padding: '16px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    Cost {sortConfig.key === 'cost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('sell_price')}
                    style={{
                      padding: '16px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    Sell Price {sortConfig.key === 'sell_price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('roi')}
                    style={{
                      padding: '16px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    ROI % {sortConfig.key === 'roi' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9CA3AF' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const roi = calculateROI(product);
                  const cost = product.cost || product.buy_price || product.cost_price || 0;
                  const sell_price = product.sell_price || product.selling_price || product.price || 0;

                  return (
                    <tr key={product.id} style={{ borderBottom: '1px solid #1E1E1E', '&:hover': { backgroundColor: '#1A1A1A' } }}>
                      <td style={{ padding: '16px', fontSize: '14px' }}>{product.asin || '—'}</td>
                      <td style={{ padding: '16px', fontSize: '14px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.title || '—'}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px' }}>{product.brand || '—'}</td>
                      <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px' }}>${parseFloat(cost).toFixed(2)}</td>
                      <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px' }}>${parseFloat(sell_price).toFixed(2)}</td>
                      <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', color: getROIColor(roi), fontWeight: '600' }}>
                        {roi.toFixed(2)}%
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          backgroundColor: getStatusColor(product.status),
                          color: '#000000',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}>
                          {product.status || 'Lead'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            onClick={() => handleOpenModal(product)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#3B82F6',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDelete(product.id)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#F87171',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                            }}
                          >
                            Delete
                          </button>
                          <select
                            value={product.status || 'Lead'}
                            onChange={(e) => handleChangeStatus(product.id, e.target.value)}
                            style={{
                              padding: '6px 8px',
                              backgroundColor: '#1E1E1E',
                              border: '1px solid #333333',
                              borderRadius: '4px',
                              color: '#FFFFFF',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            {statuses.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px', margin: 0 }}>
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ASIN
                </label>
                <input
                  type="text"
                  name="asin"
                  value={formData.asin}
                  onChange={handleFormChange}
                  placeholder="Enter ASIN"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="Enter product title"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Brand
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleFormChange}
                  placeholder="Enter brand name"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Cost
                  </label>
                  <input
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #1E1E1E',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Sell Price
                  </label>
                  <input
                    type="number"
                    name="sell_price"
                    value={formData.sell_price}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #1E1E1E',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  placeholder="Enter category"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  {statuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  placeholder="Enter notes"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #1E1E1E',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCloseModal}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#1E1E1E',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProduct}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#FFD700',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                {editingProduct ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {showImportPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px', margin: 0 }}>
              Import Preview ({importData.length} rows)
            </h2>

            {importLoading && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', marginBottom: '8px' }}>Progress: {importProgress}%</div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#1E1E1E',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${importProgress}%`,
                    backgroundColor: '#FFD700',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            )}

            <div style={{ overflowX: 'auto', marginBottom: '24px', maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1E1E1E', backgroundColor: '#0A0A0A' }}>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#9CA3AF' }}>ASIN</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#9CA3AF' }}>Title</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#9CA3AF' }}>Cost</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#9CA3AF' }}>Sell Price</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#9CA3AF' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1E1E1E' }}>
                      <td style={{ padding: '8px' }}>{row.asin}</td>
                      <td style={{ padding: '8px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</td>
                      <td style={{ padding: '8px' }}>${row.cost.toFixed(2)}</td>
                      <td style={{ padding: '8px' }}>${row.sell_price.toFixed(2)}</td>
                      <td style={{ padding: '8px' }}>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowImportPreview(false);
                  setImportData([]);
                  setImportProgress(0);
                }}
                disabled={importLoading}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#1E1E1E',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: importLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  opacity: importLoading ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importLoading}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#FFD700',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: importLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  opacity: importLoading ? 0.5 : 1,
                }}
              >
                {importLoading ? `Importing... (${importProgress}%)` : 'Confirm Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', margin: 0 }}>
              Confirm Delete
            </h2>
            <p style={{ color: '#9CA3AF', marginBottom: '24px' }}>
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#1E1E1E',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProduct(confirmDelete)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#F87171',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
