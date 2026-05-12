import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const styles = {
  outerContainer: { display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0A' },
  container: { flex: 1, marginLeft: '250px', padding: '32px', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  header: { marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '700', marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: '#999999' },
  tabs: { display: 'flex', borderBottom: '1px solid #1E1E1E', marginBottom: '32px', gap: '24px' },
  tab: { padding: '12px 0', fontSize: '14px', cursor: 'pointer', color: '#666666', borderBottom: '2px solid transparent', transition: 'all 0.2s' },
  tabActive: { color: '#FFD700', borderBottomColor: '#FFD700' },
  tabsContent: {},
  card: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', marginBottom: '16px' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '32px' },
  kpiCard: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px', textAlign: 'center' },
  kpiValue: { fontSize: '24px', fontWeight: '700', color: '#FFD700', marginBottom: '4px' },
  kpiLabel: { fontSize: '12px', color: '#999999', textTransform: 'uppercase' },
  statusBadge: { display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
  statusResearch: { backgroundColor: '#1E3A1F', color: '#4ADE80' },
  statusSourcing: { backgroundColor: '#1E2B3D', color: '#3B82F6' },
  statusManufacturing: { backgroundColor: '#3D2B1F', color: '#FBBF24' },
  statusShipping: { backgroundColor: '#3D1F2B', color: '#F87171' },
  statusLive: { backgroundColor: '#1F3D2B', color: '#10B981' },
  statusDiscontinued: { backgroundColor: '#2B1F1F', color: '#9CA3AF' },
  button: { backgroundColor: '#FFD700', color: '#000000', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' },
  buttonSecondary: { backgroundColor: '#1E1E1E', color: '#FFFFFF', border: '1px solid #333333', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '32px', maxWidth: '500px', width: '90%' },
  modalHeader: { fontSize: '20px', fontWeight: '700', marginBottom: '20px' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '12px', color: '#999999', marginBottom: '6px', textTransform: 'uppercase' },
  input: { width: '100%', backgroundColor: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '4px', padding: '10px', color: '#FFFFFF', fontSize: '14px', boxSizing: 'border-box' },
  select: { width: '100%', backgroundColor: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '4px', padding: '10px', color: '#FFFFFF', fontSize: '14px', boxSizing: 'border-box' },
  textarea: { width: '100%', backgroundColor: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '4px', padding: '10px', color: '#FFFFFF', fontSize: '14px', boxSizing: 'border-box', minHeight: '100px' },
  modalFooter: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { backgroundColor: '#0A0A0A', borderBottom: '1px solid #1E1E1E' },
  tableHeaderCell: { padding: '12px', textAlign: 'left', fontSize: '12px', color: '#999999', fontWeight: '600', textTransform: 'uppercase' },
  tableRow: { borderBottom: '1px solid #1E1E1E' },
  tableCell: { padding: '12px', fontSize: '14px' },
  pipeline: { display: 'flex', gap: '12px', marginBottom: '32px', overflowX: 'auto' },
  pipelineStage: { flex: '0 0 150px', backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '12px', textAlign: 'center' },
  pipelineStageName: { fontSize: '12px', color: '#999999', marginBottom: '8px', textTransform: 'uppercase' },
  pipelineStageValue: { fontSize: '20px', fontWeight: '700', color: '#FFD700' },
  chartContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' },
  chart: { backgroundColor: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '20px' },
  chartTitle: { fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#FFFFFF' },
  chartBar: { display: 'flex', alignItems: 'flex-end', height: '200px', gap: '8px', justifyContent: 'space-around' },
  bar: { flex: 1, backgroundColor: '#FFD700', borderRadius: '4px 4px 0 0', transition: 'all 0.2s' },
  barLabel: { fontSize: '11px', color: '#999999', marginTop: '4px', textAlign: 'center' },
  line: { width: '100%', height: '200px', position: 'relative', marginBottom: '16px' },
  donut: { width: '200px', height: '200px', borderRadius: '50%', background: 'conic-gradient(#FFD700 0deg 90deg, #3B82F6 90deg 180deg, #10B981 180deg 270deg, #F87171 270deg 360deg)', margin: '0 auto' },
};

export default function PrivateLabelPage() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('ecomera_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    loadMockData();
  }, []);

  const loadMockData = () => {
    // Mock arrays zeroed during the 2026-05-12 mock-data purge.
    // Private-label module has no backend yet (design-question #6).
    // Page renders empty state until the module ships.
    setBrands([]);
    setProducts([]);
  };

  const getStatusStyle = (status) => {
    const statusMap = {
      'Research': styles.statusResearch,
      'Sourcing': styles.statusSourcing,
      'Manufacturing': styles.statusManufacturing,
      'Shipping': styles.statusShipping,
      'Live': styles.statusLive,
      'Discontinued': styles.statusDiscontinued,
    };
    return statusMap[status] || styles.statusResearch;
  };

  const handleAddProduct = () => {
    setFormData({});
    setShowProductModal(true);
  };

  const handleAddBrand = () => {
    setFormData({});
    setShowBrandModal(true);
  };

  const handleSaveProduct = () => {
    if (formData.id) {
      setProducts(products.map(p => p.id === formData.id ? { ...p, ...formData } : p));
    } else {
      const newProduct = { id: Math.max(...products.map(p => p.id), 0) + 1, ...formData };
      setProducts([...products, newProduct]);
    }
    setShowProductModal(false);
    setFormData({});
  };

  const handleSaveBrand = () => {
    if (formData.id) {
      setBrands(brands.map(b => b.id === formData.id ? { ...b, ...formData } : b));
    } else {
      const newBrand = { id: Math.max(...brands.map(b => b.id), 0) + 1, ...formData };
      setBrands([...brands, newBrand]);
    }
    setShowBrandModal(false);
    setFormData({});
  };

  const handleEditProduct = (product) => {
    setFormData(product);
    setShowProductModal(true);
  };

  const handleEditBrand = (brand) => {
    setFormData(brand);
    setShowBrandModal(true);
  };

  const renderProductsTab = () => (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <button style={styles.button} onClick={handleAddProduct}>+ Add Product</button>
      </div>
      <div style={styles.cardGrid}>
        {Array.isArray(products) ? products.map(product => (
          <div key={product.id} style={styles.card}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '4px' }}>{product.brandName}</div>
              <div style={{ fontSize: '16px', fontWeight: '700' }}>{product.productName}</div>
              <div style={{ fontSize: '12px', color: '#666666', marginTop: '4px' }}>ASIN: {product.asin}</div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ ...styles.statusBadge, ...getStatusStyle(product.status) }}>{product.status}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#999999', marginBottom: '16px' }}>
              <div>Category: {product.category}</div>
              {product.launchDate && <div>Launch: {product.launchDate}</div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '12px' }}>
              <div><span style={{ color: '#999999' }}>Investment</span><br/><span style={{ fontSize: '14px', fontWeight: '700' }}>${product.investment.toLocaleString()}</span></div>
              <div><span style={{ color: '#999999' }}>Revenue</span><br/><span style={{ fontSize: '14px', fontWeight: '700' }}>${product.revenue.toLocaleString()}</span></div>
              <div><span style={{ color: '#999999' }}>Profit</span><br/><span style={{ fontSize: '14px', fontWeight: '700', color: product.profit >= 0 ? '#10B981' : '#F87171' }}>${product.profit.toLocaleString()}</span></div>
              <div><span style={{ color: '#999999' }}>ROI</span><br/><span style={{ fontSize: '14px', fontWeight: '700', color: product.roi.startsWith('-') ? '#F87171' : '#10B981' }}>{product.roi}</span></div>
            </div>
            <button style={styles.buttonSecondary} onClick={() => handleEditProduct(product)}>Edit</button>
          </div>
        )) : null}
      </div>
    </div>
  );

  const renderBrandRegistryTab = () => (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <button style={styles.button} onClick={handleAddBrand}>+ Add Brand</button>
      </div>
      <div style={styles.card}>
        <table style={styles.table}>
          <thead style={styles.tableHeader}>
            <tr>
              <th style={styles.tableHeaderCell}>Brand Name</th>
              <th style={styles.tableHeaderCell}>Trademark Status</th>
              <th style={styles.tableHeaderCell}>Registry Status</th>
              <th style={styles.tableHeaderCell}>Filing Date</th>
              <th style={styles.tableHeaderCell}>Registration #</th>
              <th style={styles.tableHeaderCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(brands) ? brands.map(brand => (
              <tr key={brand.id} style={styles.tableRow}>
                <td style={styles.tableCell}>{brand.name}</td>
                <td style={styles.tableCell}><span style={{ ...styles.statusBadge, backgroundColor: brand.trademarkStatus === 'Registered' ? '#1F3D2B' : '#3D2B1F', color: brand.trademarkStatus === 'Registered' ? '#10B981' : '#FBBF24' }}>{brand.trademarkStatus}</span></td>
                <td style={styles.tableCell}><span style={{ ...styles.statusBadge, backgroundColor: brand.registryStatus === 'Approved' ? '#1F3D2B' : '#1E2B3D', color: brand.registryStatus === 'Approved' ? '#10B981' : '#3B82F6' }}>{brand.registryStatus}</span></td>
                <td style={styles.tableCell}>{brand.filingDate}</td>
                <td style={styles.tableCell}>{brand.registrationNumber}</td>
                <td style={styles.tableCell}><button style={styles.buttonSecondary} onClick={() => handleEditBrand(brand)}>Edit</button></td>
              </tr>
            )) : null}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLaunchTrackerTab = () => {
    const stages = ['Idea', 'Research', 'Sourcing', 'Sample', 'Manufacturing', 'Shipping', 'Pre-Launch', 'Live'];
    const stageProducts = {};
    stages.forEach(stage => {
      stageProducts[stage] = products.filter(p => {
        const stageMap = { 'Idea': 'Research', 'Research': 'Research', 'Sourcing': 'Sourcing', 'Sample': 'Sourcing', 'Manufacturing': 'Manufacturing', 'Shipping': 'Shipping', 'Pre-Launch': 'Shipping', 'Live': 'Live' };
        return stageMap[stage] === p.status;
      });
    });

    return (
      <div>
        <div style={styles.pipeline}>
          {stages.map(stage => (
            <div key={stage} style={styles.pipelineStage}>
              <div style={styles.pipelineStageName}>{stage}</div>
              <div style={styles.pipelineStageValue}>{stageProducts[stage].length}</div>
            </div>
          ))}
        </div>
        <div style={styles.cardGrid}>
          {Array.isArray(products) ? products.map(product => (
            <div key={product.id} style={styles.card}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700' }}>{product.productName}</div>
                <span style={{ ...styles.statusBadge, ...getStatusStyle(product.status) }}>{product.status}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px' }}>Launch Checklist:</div>
                {['Keyword Research', 'Listing Copy', 'Images', 'A+ Content', 'PPC Setup', 'Inventory Plan', 'Pricing Strategy', 'Launch Promo'].map((item, i) => (
                  <div key={i} style={{ marginBottom: '4px' }}><input type="checkbox" style={{ marginRight: '6px' }} /> {item}</div>
                ))}
              </div>
            </div>
          )) : null}
        </div>
      </div>
    );
  };

  const renderAnalyticsTab = () => {
    const revenueByBrand = {
      'AMIRA': 97000,
      'Deck Out': 5000,
    };
    const monthlyData = [8000, 12000, 15000, 18000, 20000, 22000, 20000, 18000, 15000, 12000, 10000, 8000];
    const categoryBreakdown = { 'Skincare': 97000, 'Desk Accessories': 5000 };

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiValue}>$102K</div>
            <div style={styles.kpiLabel}>Total Revenue</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiValue}>$40K</div>
            <div style={styles.kpiLabel}>Total Profit</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiValue}>$54K</div>
            <div style={styles.kpiLabel}>Total Investment</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiValue}>74%</div>
            <div style={styles.kpiLabel}>Avg ROI</div>
          </div>
        </div>

        <div style={styles.chartContainer}>
          <div style={styles.chart}>
            <div style={styles.chartTitle}>Revenue by Brand</div>
            <div style={styles.chartBar}>
              <div style={{ flex: 1 }}>
                <div style={{ ...styles.bar, height: '160px' }}></div>
                <div style={styles.barLabel}>AMIRA</div>
                <div style={{ fontSize: '11px', color: '#FFD700' }}>$97K</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...styles.bar, height: '8px' }}></div>
                <div style={styles.barLabel}>Deck Out</div>
                <div style={{ fontSize: '11px', color: '#FFD700' }}>$5K</div>
              </div>
            </div>
          </div>

          <div style={styles.chart}>
            <div style={styles.chartTitle}>Monthly Profit Trend</div>
            <div style={{ height: '200px', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around' }}>
              {monthlyData.map((value, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ ...styles.bar, height: `${(value / 22000) * 180}px` }}></div>
                  <div style={{ fontSize: '10px', color: '#999999', marginTop: '4px' }}>M{i + 1}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.chart}>
            <div style={styles.chartTitle}>Investment vs Return</div>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '200px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...styles.bar, width: '40px', height: '100px' }}></div>
                <div style={{ fontSize: '11px', color: '#999999', marginTop: '4px' }}>Invest</div>
                <div style={{ fontSize: '10px', color: '#FFD700' }}>$54K</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...styles.bar, width: '40px', height: '180px', backgroundColor: '#10B981' }}></div>
                <div style={{ fontSize: '11px', color: '#999999', marginTop: '4px' }}>Return</div>
                <div style={{ fontSize: '10px', color: '#10B981' }}>$102K</div>
              </div>
            </div>
          </div>

          <div style={styles.chart}>
            <div style={styles.chartTitle}>Category Breakdown</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={styles.donut}></div>
            </div>
            <div style={{ marginTop: '16px', fontSize: '12px' }}>
              <div style={{ marginBottom: '8px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#FFD700', marginRight: '8px' }}></span> Skincare: 95%</div>
              <div><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#3B82F6', marginRight: '8px' }}></span> Desk: 5%</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'products':
        return renderProductsTab();
      case 'brands':
        return renderBrandRegistryTab();
      case 'tracker':
        return renderLaunchTrackerTab();
      case 'analytics':
        return renderAnalyticsTab();
      default:
        return null;
    }
  };

  return (
    <div style={styles.outerContainer}>
      <Sidebar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Private Label Management</h1>
          <p style={styles.subtitle}>Track brands, products, and launch progress</p>
        </div>

        <div style={styles.tabs}>
          <div
            style={{ ...styles.tab, ...(activeTab === 'products' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('products')}
          >
            Products
          </div>
          <div
            style={{ ...styles.tab, ...(activeTab === 'brands' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('brands')}
          >
            Brand Registry
          </div>
          <div
            style={{ ...styles.tab, ...(activeTab === 'tracker' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('tracker')}
          >
            Launch Tracker
          </div>
          <div
            style={{ ...styles.tab, ...(activeTab === 'analytics' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </div>
        </div>

        {renderTabContent()}

        {showProductModal && (
          <div style={styles.modal} onClick={() => setShowProductModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>{formData.id ? 'Edit Product' : 'Add Product'}</div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Brand Name</label>
                <input style={styles.input} type="text" value={formData.brandName || ''} onChange={(e) => setFormData({ ...formData, brandName: e.target.value })} placeholder="Brand name" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Product Name</label>
                <input style={styles.input} type="text" value={formData.productName || ''} onChange={(e) => setFormData({ ...formData, productName: e.target.value })} placeholder="Product name" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>ASIN</label>
                <input style={styles.input} type="text" value={formData.asin || ''} onChange={(e) => setFormData({ ...formData, asin: e.target.value })} placeholder="ASIN" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select style={styles.select} value={formData.status || ''} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="">Select Status</option>
                  <option value="Research">Research</option>
                  <option value="Sourcing">Sourcing</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Shipping">Shipping</option>
                  <option value="Live">Live</option>
                  <option value="Discontinued">Discontinued</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Category</label>
                <input style={styles.input} type="text" value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Category" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Launch Date</label>
                <input style={styles.input} type="date" value={formData.launchDate || ''} onChange={(e) => setFormData({ ...formData, launchDate: e.target.value })} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Investment</label>
                <input style={styles.input} type="number" value={formData.investment || ''} onChange={(e) => setFormData({ ...formData, investment: parseInt(e.target.value) })} placeholder="0" />
              </div>
              <div style={styles.modalFooter}>
                <button style={styles.buttonSecondary} onClick={() => setShowProductModal(false)}>Cancel</button>
                <button style={styles.button} onClick={handleSaveProduct}>Save</button>
              </div>
            </div>
          </div>
        )}

        {showBrandModal && (
          <div style={styles.modal} onClick={() => setShowBrandModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>{formData.id ? 'Edit Brand' : 'Add Brand'}</div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Brand Name</label>
                <input style={styles.input} type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Brand name" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Trademark Status</label>
                <select style={styles.select} value={formData.trademarkStatus || ''} onChange={(e) => setFormData({ ...formData, trademarkStatus: e.target.value })}>
                  <option value="">Select Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Registered">Registered</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Registry Status</label>
                <select style={styles.select} value={formData.registryStatus || ''} onChange={(e) => setFormData({ ...formData, registryStatus: e.target.value })}>
                  <option value="">Select Status</option>
                  <option value="Applied">Applied</option>
                  <option value="Approved">Approved</option>
                  <option value="Denied">Denied</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Filing Date</label>
                <input style={styles.input} type="date" value={formData.filingDate || ''} onChange={(e) => setFormData({ ...formData, filingDate: e.target.value })} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Registration #</label>
                <input style={styles.input} type="text" value={formData.registrationNumber || ''} onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })} placeholder="Registration number" />
              </div>
              <div style={styles.modalFooter}>
                <button style={styles.buttonSecondary} onClick={() => setShowBrandModal(false)}>Cancel</button>
                <button style={styles.button} onClick={handleSaveBrand}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
