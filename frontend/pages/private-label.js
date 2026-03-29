import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const STATUSES = ['research', 'validation', 'sourcing', 'sampling', 'production', 'shipping', 'launch', 'live', 'discontinued'];
const COMPETITION_LEVELS = ['low', 'medium', 'high', 'very_high'];
const ASSET_TYPES = ['logo', 'trademark', 'a_plus', 'storefront', 'listing_images', 'video', 'brand_story'];
const ASSET_STATUS = ['not_started', 'in_progress', 'review', 'approved', 'published'];

export default function PrivateLabelPage() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [products, setProducts] = useState([]);
  const [sourcing, setSourcing] = useState([]);
  const [launches, setLaunches] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [assets, setAssets] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('product');
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [productsRes, reviewsRes, assetsRes, dashRes] = await Promise.all([
        fetch('/api/private-label/products'),
        fetch('/api/private-label/review-tracker'),
        fetch('/api/private-label/brand-assets'),
        fetch('/api/private-label/dashboard')
      ]);

      if (productsRes.ok) setProducts(await productsRes.json());
      if (reviewsRes.ok) setReviews(await reviewsRes.json());
      if (assetsRes.ok) setAssets(await assetsRes.json());
      if (dashRes.ok) setDashboard(await dashRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompetitionColor = (level) => {
    const colors = {
      low: '#4ade80',
      medium: '#facc15',
      high: '#f97316',
      very_high: '#ef4444'
    };
    return colors[level] || '#9ca3af';
  };

  const getStatusColor = (status) => {
    const colors = {
      research: '#64748b',
      validation: '#3b82f6',
      sourcing: '#8b5cf6',
      sampling: '#ec4899',
      production: '#f59e0b',
      shipping: '#f97316',
      launch: '#14b8a6',
      live: '#10b981',
      discontinued: '#6b7280'
    };
    return colors[status] || '#9ca3af';
  };

  const getAssetStatusColor = (status) => {
    const colors = {
      not_started: '#6b7280',
      in_progress: '#fbbf24',
      review: '#60a5fa',
      approved: '#34d399',
      published: '#a78bfa'
    };
    return colors[status] || '#9ca3af';
  };

  const getReviewColor = (rating) => {
    if (rating > 4.3) return '#10b981';
    if (rating >= 4.0) return '#fbbf24';
    return '#ef4444';
  };

  // Tab: Product Pipeline (Kanban)
  const PipelineTab = () => (
    <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '16px' }}>
      {STATUSES.map(status => (
        <div key={status} style={{
          flex: '0 0 280px',
          background: '#111111',
          border: '1px solid #1E1E1E',
          borderRadius: '8px',
          padding: '16px',
          minHeight: '600px',
          maxHeight: '700px',
          overflowY: 'auto'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFD700', textTransform: 'capitalize', marginBottom: '12px' }}>
            {status.replace(/_/g, ' ')}
          </div>
          {products
            .filter(p => p.status === status)
            .map(product => (
              <div
                key={product.id}
                onClick={() => {
                  setSelectedProduct(product);
                  setShowModal(true);
                  setModalType('product');
                }}
                style={{
                  background: '#0A0A0A',
                  border: '1px solid #1E1E1E',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  ':hover': { borderColor: '#FFD700' }
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#FFD700'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1E1E1E'}
              >
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff', marginBottom: '8px' }}>
                  {product.product_name}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                  {product.brand_name}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>
                  {product.category}
                </div>
                {product.target_margin && (
                  <div style={{ fontSize: '12px', color: '#FFD700', marginBottom: '6px' }}>
                    Margin: {product.target_margin}%
                  </div>
                )}
                {product.competition_level && (
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: getCompetitionColor(product.competition_level),
                    fontSize: '11px',
                    color: '#000',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {product.competition_level}
                  </div>
                )}
              </div>
            ))}
        </div>
      ))}
    </div>
  );

  // Tab: Sourcing
  const SourcingTab = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff', display: 'block', marginBottom: '8px' }}>
          Select Product
        </label>
        <select
          value={selectedProduct?.id || ''}
          onChange={e => {
            const prod = products.find(p => p.id === parseInt(e.target.value));
            setSelectedProduct(prod);
          }}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '10px 12px',
            background: '#111111',
            border: '1px solid #1E1E1E',
            color: '#ffffff',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        >
          <option value="">Choose a product...</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.product_name}</option>
          ))}
        </select>
      </div>

      {selectedProduct && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ color: '#FFD700', fontSize: '18px', fontWeight: '600' }}>
              Sourcing Leads - {selectedProduct.product_name}
            </h3>
            <button
              onClick={() => {
                setModalType('sourcing');
                setShowModal(true);
              }}
              style={{
                padding: '8px 16px',
                background: '#FFD700',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Add Lead
            </button>
          </div>

          <div style={{
            overflowX: 'auto',
            background: '#111111',
            border: '1px solid #1E1E1E',
            borderRadius: '8px'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#FFD700', fontWeight: '600' }}>Supplier</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#FFD700', fontWeight: '600' }}>Country</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#FFD700', fontWeight: '600' }}>Unit Price</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#FFD700', fontWeight: '600' }}>MOQ</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#FFD700', fontWeight: '600' }}>Sample Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#FFD700', fontWeight: '600' }}>Quality</th>
                </tr>
              </thead>
              <tbody>
                {sourcing.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                      No sourcing leads yet
                    </td>
                  </tr>
                ) : (
                  sourcing.map(lead => (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #1E1E1E' }}>
                      <td style={{ padding: '12px', color: '#ffffff' }}>{lead.supplier_name}</td>
                      <td style={{ padding: '12px', color: '#9ca3af' }}>{lead.supplier_country}</td>
                      <td style={{ padding: '12px', color: '#FFD700', fontWeight: '600' }}>
                        ${lead.unit_price?.toFixed(2) || 'N/A'}
                      </td>
                      <td style={{ padding: '12px', color: '#9ca3af' }}>{lead.moq || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: '#1E1E1E',
                          color: '#FFD700',
                          fontSize: '12px',
                          textTransform: 'capitalize'
                        }}>
                          {lead.sample_status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#FFD700' }}>
                        {'★'.repeat(Math.round(lead.quality_rating || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // Tab: Launch Plans
  const LaunchPlansTab = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff', display: 'block', marginBottom: '8px' }}>
          Select Product
        </label>
        <select
          value={selectedProduct?.id || ''}
          onChange={e => {
            const prod = products.find(p => p.id === parseInt(e.target.value));
            setSelectedProduct(prod);
          }}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '10px 12px',
            background: '#111111',
            border: '1px solid #1E1E1E',
            color: '#ffffff',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        >
          <option value="">Choose a product...</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.product_name}</option>
          ))}
        </select>
      </div>

      {selectedProduct && launches.length > 0 && (
        <div>
          <h3 style={{ color: '#FFD700', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Launch Plan - {selectedProduct.product_name}
          </h3>
          {launches.map(plan => (
            <div
              key={plan.id}
              style={{
                background: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '20px'
              }}
            >
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #1E1E1E' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Launch Date</div>
                    <div style={{ color: '#FFD700', fontWeight: '600' }}>{plan.launch_date || 'TBD'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Budget</div>
                    <div style={{ color: '#FFD700', fontWeight: '600' }}>${plan.launch_budget?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>PPC Budget</div>
                    <div style={{ color: '#FFD700', fontWeight: '600' }}>${plan.ppc_budget?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Initial Inventory</div>
                    <div style={{ color: '#FFD700', fontWeight: '600' }}>{plan.initial_inventory || 0} units</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFD700', marginBottom: '12px' }}>
                  Milestones ({plan.milestones.filter(m => m.completed).length}/{plan.milestones.length})
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: '#1E1E1E',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: `${(plan.milestones.filter(m => m.completed).length / plan.milestones.length) * 100}%`,
                    height: '100%',
                    background: '#FFD700'
                  }}></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                  {plan.milestones.map((milestone, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        background: '#0A0A0A',
                        border: '1px solid #1E1E1E',
                        borderRadius: '4px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={milestone.completed}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                        readOnly
                      />
                      <span style={{ fontSize: '13px', color: '#9ca3af' }}>{milestone.milestone}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(!selectedProduct || launches.length === 0) && (
        <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
          No launch plans found
        </div>
      )}
    </div>
  );

  // Tab: Reviews
  const ReviewsTab = () => (
    <div style={{ padding: '24px' }}>
      <h3 style={{ color: '#FFD700', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
        Product Reviews
      </h3>

      <div style={{
        overflowX: 'auto',
        background: '#111111',
        border: '1px solid #1E1E1E',
        borderRadius: '8px'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px'
        }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
              <th style={{ padding: '12px', textAlign: 'left', color: '#FFD700', fontWeight: '600' }}>ASIN</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#FFD700', fontWeight: '600' }}>Total Reviews</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#FFD700', fontWeight: '600' }}>Avg Rating</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#FFD700', fontWeight: '600' }}>Star Distribution</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#FFD700', fontWeight: '600' }}>30d Velocity</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#FFD700', fontWeight: '600' }}>Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                  No review data yet
                </td>
              </tr>
            ) : (
              reviews.map(review => (
                <tr key={review.id} style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <td style={{ padding: '12px', color: '#FFD700', fontWeight: '600' }}>{review.asin}</td>
                  <td style={{ padding: '12px', color: '#ffffff' }}>{review.total_reviews}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      color: getReviewColor(review.average_rating),
                      fontWeight: '600'
                    }}>
                      {review.average_rating.toFixed(1)} {'★'.repeat(Math.round(review.average_rating))}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '2px', fontSize: '10px' }}>
                      <div style={{ width: '20px', height: '20px', background: '#10b981', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}>
                        {review.five_star}
                      </div>
                      <div style={{ width: '20px', height: '20px', background: '#84cc16', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}>
                        {review.four_star}
                      </div>
                      <div style={{ width: '20px', height: '20px', background: '#fbbf24', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}>
                        {review.three_star}
                      </div>
                      <div style={{ width: '20px', height: '20px', background: '#f97316', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}>
                        {review.two_star}
                      </div>
                      <div style={{ width: '20px', height: '20px', background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}>
                        {review.one_star}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: '#9ca3af' }}>{review.review_velocity_30d}</td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#9ca3af' }}>
                    {new Date(review.last_checked).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Tab: Brand Assets
  const BrandAssetsTab = () => (
    <div style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h3 style={{ color: '#FFD700', fontSize: '18px', fontWeight: '600' }}>Brand Assets</h3>
        <button
          onClick={() => {
            setModalType('asset');
            setShowModal(true);
          }}
          style={{
            padding: '8px 16px',
            background: '#FFD700',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          New Asset
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {assets.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: '#6b7280' }}>
            No brand assets yet
          </div>
        ) : (
          assets.map(asset => (
            <div
              key={asset.id}
              style={{
                background: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#FFD700'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1E1E1E'}
            >
              <div style={{ marginBottom: '12px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  background: getAssetStatusColor(asset.status),
                  color: asset.status === 'in_progress' ? '#000' : '#fff',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'capitalize'
                }}>
                  {asset.status}
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'capitalize' }}>
                  {asset.asset_type.replace(/_/g, ' ')}
                </div>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFD700', marginBottom: '12px' }}>
                {asset.name}
              </div>
              {asset.notes && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                  {asset.notes}
                </div>
              )}
              <button
                onClick={() => {
                  setSelectedProduct(asset);
                  setModalType('asset-edit');
                  setShowModal(true);
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#1E1E1E',
                  color: '#FFD700',
                  border: '1px solid #FFD700',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                View Details
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Modal Component
  const Modal = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#0A0A0A',
        border: '1px solid #1E1E1E',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: '#FFD700', fontSize: '18px', fontWeight: '600' }}>
            {modalType === 'product' && 'Product Details'}
            {modalType === 'sourcing' && 'Add Sourcing Lead'}
            {modalType === 'asset' && 'Add Brand Asset'}
            {modalType === 'asset-edit' && 'Edit Brand Asset'}
          </h2>
          <button
            onClick={() => setShowModal(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFD700',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {modalType === 'product' && selectedProduct && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Product Name</div>
              <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>
                {selectedProduct.product_name}
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Brand</div>
              <div style={{ color: '#FFD700' }}>{selectedProduct.brand_name}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Status</div>
              <div style={{
                display: 'inline-block',
                padding: '4px 8px',
                borderRadius: '4px',
                background: getStatusColor(selectedProduct.status),
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                {selectedProduct.status}
              </div>
            </div>
            {selectedProduct.validation_score && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Validation Score</div>
                <div style={{ color: '#FFD700', fontSize: '16px', fontWeight: '600' }}>
                  {selectedProduct.validation_score.toFixed(1)}/100
                </div>
              </div>
            )}
          </div>
        )}

        {modalType === 'sourcing' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                Supplier Name
              </label>
              <input
                type="text"
                placeholder="e.g., Alibaba Supplier"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '4px',
                  color: '#ffffff'
                }}
              />
            </div>
            <button
              style={{
                width: '100%',
                padding: '10px',
                background: '#FFD700',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '12px'
              }}
            >
              Add Lead
            </button>
          </div>
        )}

        {modalType === 'asset' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                Asset Type
              </label>
              <select style={{
                width: '100%',
                padding: '8px',
                background: '#111111',
                border: '1px solid #1E1E1E',
                borderRadius: '4px',
                color: '#ffffff'
              }}>
                {ASSET_TYPES.map(type => (
                  <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                Asset Name
              </label>
              <input
                type="text"
                placeholder="e.g., Brand Logo v1"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#111111',
                  border: '1px solid #1E1E1E',
                  borderRadius: '4px',
                  color: '#ffffff'
                }}
              />
            </div>
            <button
              style={{
                width: '100%',
                padding: '10px',
                background: '#FFD700',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '12px'
              }}
            >
              Create Asset
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', background: '#0A0A0A', minHeight: '100vh' }}>
      <Sidebar />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          background: '#0A0A0A',
          borderBottom: '1px solid #1E1E1E',
          padding: '20px 24px'
        }}>
          <h1 style={{ color: '#FFD700', fontSize: '28px', fontWeight: '700' }}>
            Private Label Management
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
            Manage your private label product pipeline, from research to live sales
          </p>
        </div>

        {/* Dashboard Summary */}
        {dashboard && (
          <div style={{
            background: '#0A0A0A',
            borderBottom: '1px solid #1E1E1E',
            padding: '16px 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Total Products</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFD700' }}>
                {dashboard.total_products}
              </div>
            </div>
            <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Active Launches</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFD700' }}>
                {dashboard.active_launches}
              </div>
            </div>
            <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Avg Validation Score</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFD700' }}>
                {dashboard.avg_validation_score.toFixed(1)}
              </div>
            </div>
            <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Review Health</div>
              <div style={{
                fontSize: '14px',
                color: '#10b981'
              }}>
                {dashboard.review_health.healthy} Healthy
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex',
          background: '#0A0A0A',
          borderBottom: '1px solid #1E1E1E',
          paddingX: '24px'
        }}>
          {[
            { key: 'pipeline', label: 'Product Pipeline' },
            { key: 'sourcing', label: 'Sourcing' },
            { key: 'launch', label: 'Launch Plans' },
            { key: 'reviews', label: 'Reviews' },
            { key: 'assets', label: 'Brand Assets' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '16px 24px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.key ? '3px solid #FFD700' : 'none',
                color: activeTab === tab.key ? '#FFD700' : '#9ca3af',
                fontWeight: activeTab === tab.key ? '600' : '400',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
              Loading...
            </div>
          )}

          {!loading && activeTab === 'pipeline' && <PipelineTab />}
          {!loading && activeTab === 'sourcing' && <SourcingTab />}
          {!loading && activeTab === 'launch' && <LaunchPlansTab />}
          {!loading && activeTab === 'reviews' && <ReviewsTab />}
          {!loading && activeTab === 'assets' && <BrandAssetsTab />}
        </div>
      </div>

      {showModal && <Modal />}
    </div>
  );
}
