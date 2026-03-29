import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import styles from '../styles/wholesale.module.css';

export default function Wholesale() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // kanban or table
  const [filters, setFilters] = useState({
    hunt_status: null,
    min_roi: null,
    min_score: null,
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch products
      const productsRes = await fetch(
        `/api/wholesale/products?${new URLSearchParams(
          Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== null))
        )}`
      );
      const productsData = await productsRes.json();
      setProducts(productsData || []);

      // Fetch suppliers
      const suppliersRes = await fetch('/api/wholesale/suppliers');
      const suppliersData = await suppliersRes.json();
      setSuppliers(suppliersData || []);

      // Fetch purchase orders
      const posRes = await fetch('/api/wholesale/purchase-orders');
      const posData = await posRes.json();
      setPurchaseOrders(posData || []);

      // Fetch dashboard
      const dashboardRes = await fetch('/api/wholesale/dashboard');
      const dashboardData = await dashboardRes.json();
      setDashboard(dashboardData || {});
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return { label: 'Strong Buy', className: styles.badgeStrongBuy };
    if (score >= 60) return { label: 'Buy', className: styles.badgeBuy };
    if (score >= 40) return { label: 'Hold', className: styles.badgeHold };
    return { label: 'Pass', className: styles.badgePass };
  };

  const huntStatuses = ['lead', 'sourced', 'approved', 'ordered', 'received', 'listed'];

  // ============================================================================
  // PIPELINE TAB
  // ============================================================================

  const PipelineTab = () => {
    if (viewMode === 'kanban') {
      return (
        <div className={styles.kanbanContainer}>
          {huntStatuses.map((status) => {
            const statusProducts = products.filter((p) => p.hunt_status === status);
            const statusLabels = {
              lead: 'Lead',
              sourced: 'Sourced',
              approved: 'Approved',
              ordered: 'Ordered',
              received: 'Received',
              listed: 'Listed',
            };

            return (
              <div key={status} className={styles.kanbanColumn}>
                <div className={styles.columnHeader}>
                  <h3>{statusLabels[status]}</h3>
                  <span className={styles.columnCount}>{statusProducts.length}</span>
                </div>
                <div className={styles.columnCards}>
                  {statusProducts.map((product) => {
                    const badge = getScoreBadge(product.score);
                    return (
                      <div
                        key={product.id}
                        className={styles.productCard}
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowProductModal(true);
                        }}
                      >
                        <div className={styles.cardHeader}>
                          <span className={styles.asin}>{product.asin}</span>
                          <span className={badge.className}>{badge.label}</span>
                        </div>
                        <h4 className={styles.cardTitle}>{product.product_title}</h4>
                        <div className={styles.cardBrand}>{product.brand || 'N/A'}</div>
                        <div className={styles.cardMetrics}>
                          <div className={styles.metric}>
                            <span className={styles.label}>ROI</span>
                            <span className={styles.value}>{product.roi_pct.toFixed(1)}%</span>
                          </div>
                          <div className={styles.metric}>
                            <span className={styles.label}>Score</span>
                            <span className={styles.value}>{product.score.toFixed(0)}</span>
                          </div>
                          <div className={styles.metric}>
                            <span className={styles.label}>Profit</span>
                            <span className={styles.value}>${product.net_profit.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ASIN</th>
              <th>Product Title</th>
              <th>Brand</th>
              <th>Hunt Status</th>
              <th>Buy Price</th>
              <th>Amazon Price</th>
              <th>Net Profit</th>
              <th>ROI %</th>
              <th>Score</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const badge = getScoreBadge(product.score);
              return (
                <tr key={product.id}>
                  <td>{product.asin}</td>
                  <td>{product.product_title}</td>
                  <td>{product.brand || 'N/A'}</td>
                  <td>
                    <span className={styles.statusBadge}>{product.hunt_status}</span>
                  </td>
                  <td>${product.buy_price.toFixed(2)}</td>
                  <td>${product.amazon_price.toFixed(2)}</td>
                  <td>${product.net_profit.toFixed(2)}</td>
                  <td>{product.roi_pct.toFixed(1)}%</td>
                  <td>
                    <span className={badge.className}>{product.score.toFixed(0)}</span>
                  </td>
                  <td>
                    <button
                      className={styles.btnSmall}
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowProductModal(true);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ============================================================================
  // SUPPLIERS TAB
  // ============================================================================

  const SuppliersTab = () => {
    return (
      <div className={styles.suppliersContainer}>
        <div className={styles.suppliersGrid}>
          {suppliers.map((supplier) => (
            <div key={supplier.id} className={styles.supplierCard}>
              <div className={styles.supplierHeader}>
                <h3>{supplier.name}</h3>
                <div className={styles.ratingStars}>
                  {'⭐'.repeat(Math.round(supplier.reliability_rating))}
                </div>
              </div>
              <div className={styles.supplierContent}>
                <div className={styles.supplierField}>
                  <span className={styles.label}>Contact Person</span>
                  <span>{supplier.contact_person || 'N/A'}</span>
                </div>
                <div className={styles.supplierField}>
                  <span className={styles.label}>Email</span>
                  <span>{supplier.email || 'N/A'}</span>
                </div>
                <div className={styles.supplierField}>
                  <span className={styles.label}>Phone</span>
                  <span>{supplier.phone || 'N/A'}</span>
                </div>
                <div className={styles.supplierField}>
                  <span className={styles.label}>Website</span>
                  {supplier.website ? (
                    <a href={supplier.website} target="_blank" rel="noopener noreferrer">
                      {supplier.website}
                    </a>
                  ) : (
                    <span>N/A</span>
                  )}
                </div>
                <div className={styles.supplierField}>
                  <span className={styles.label}>Min Order Value</span>
                  <span>{supplier.min_order_value ? `$${supplier.min_order_value.toFixed(2)}` : 'N/A'}</span>
                </div>
                <div className={styles.supplierField}>
                  <span className={styles.label}>Lead Time</span>
                  <span>{supplier.lead_time_days} days</span>
                </div>
                <div className={styles.supplierField}>
                  <span className={styles.label}>Payment Terms</span>
                  <span>{supplier.payment_terms || 'N/A'}</span>
                </div>
              </div>
              <div className={styles.supplierActions}>
                <button className={styles.btnSecondary}>Edit</button>
                <button className={styles.btnSecondary}>View POs</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // PURCHASE ORDERS TAB
  // ============================================================================

  const POStatus = ({ status }) => {
    const statusColors = {
      draft: '#888888',
      submitted: '#FFA500',
      confirmed: '#FFD700',
      shipped: '#87CEEB',
      received: '#90EE90',
      invoiced: '#98FB98',
    };
    return (
      <span
        className={styles.poStatusBadge}
        style={{ backgroundColor: statusColors[status] || '#888888' }}
      >
        {status}
      </span>
    );
  };

  const PurchaseOrdersTab = () => {
    const [expandedPO, setExpandedPO] = useState(null);

    return (
      <div className={styles.poContainer}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Status</th>
                <th>Order Date</th>
                <th>Expected Delivery</th>
                <th>Subtotal</th>
                <th>Shipping</th>
                <th>Total</th>
                <th>Items</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((po) => (
                <React.Fragment key={po.id}>
                  <tr>
                    <td>{po.po_number}</td>
                    <td>{suppliers.find((s) => s.id === po.supplier_id)?.name || 'N/A'}</td>
                    <td>
                      <POStatus status={po.status} />
                    </td>
                    <td>{new Date(po.order_date).toLocaleDateString()}</td>
                    <td>
                      {po.expected_delivery
                        ? new Date(po.expected_delivery).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td>${po.subtotal.toFixed(2)}</td>
                    <td>${po.shipping_cost.toFixed(2)}</td>
                    <td className={styles.totalPrice}>${po.total.toFixed(2)}</td>
                    <td>{po.line_items.length}</td>
                    <td>
                      <button
                        className={styles.btnSmall}
                        onClick={() =>
                          setExpandedPO(expandedPO === po.id ? null : po.id)
                        }
                      >
                        {expandedPO === po.id ? 'Hide' : 'Show'} Items
                      </button>
                    </td>
                  </tr>
                  {expandedPO === po.id && (
                    <tr className={styles.expandedRow}>
                      <td colSpan="10">
                        <div className={styles.lineItemsTable}>
                          <h4>Line Items</h4>
                          <table>
                            <thead>
                              <tr>
                                <th>ASIN</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {po.line_items.map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.asin || 'N/A'}</td>
                                  <td>{item.quantity}</td>
                                  <td>${item.unit_price.toFixed(2)}</td>
                                  <td>${item.total_price.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================================
  // DASHBOARD TAB
  // ============================================================================

  const DashboardTab = () => {
    if (!dashboard) return <div>Loading dashboard...</div>;

    const funnelStats = [
      { label: 'Leads', count: dashboard.pipeline?.lead || 0 },
      { label: 'Sourced', count: dashboard.pipeline?.sourced || 0 },
      { label: 'Approved', count: dashboard.pipeline?.approved || 0 },
      { label: 'Ordered', count: dashboard.pipeline?.ordered || 0 },
      { label: 'Received', count: dashboard.pipeline?.received || 0 },
      { label: 'Listed', count: dashboard.pipeline?.listed || 0 },
    ];

    return (
      <div className={styles.dashboardContainer}>
        {/* Top Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Products</span>
            <span className={styles.statValue}>{dashboard.total_products || 0}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Avg Deal Score</span>
            <span className={styles.statValue}>{dashboard.avg_deal_score || 0}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Active Suppliers</span>
            <span className={styles.statValue}>{dashboard.suppliers?.length || 0}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total PO Value</span>
            <span className={styles.statValue}>
              ${dashboard.purchase_orders?.total_value || 0}
            </span>
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className={styles.funnelSection}>
          <h3>Pipeline Funnel</h3>
          <div className={styles.funnel}>
            {funnelStats.map((stat, idx) => {
              const maxCount = Math.max(...funnelStats.map((s) => s.count)) || 1;
              const width = ((stat.count / maxCount) * 100) || 0;
              return (
                <div key={idx} className={styles.funnelRow}>
                  <div className={styles.funnelLabel}>{stat.label}</div>
                  <div className={styles.funnelBar}>
                    <div
                      className={styles.funnelFill}
                      style={{ width: `${width}%`, backgroundColor: '#FFD700' }}
                    >
                      {stat.count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Deals by Score */}
        <div className={styles.topDealsSection}>
          <h3>Top 10 Deals by Score</h3>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>ASIN</th>
                  <th>Product Title</th>
                  <th>Score</th>
                  <th>ROI %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard.top_deals || []).map((deal, idx) => {
                  const badge = getScoreBadge(deal.score);
                  return (
                    <tr key={deal.id}>
                      <td className={styles.rank}>#{idx + 1}</td>
                      <td>{deal.asin}</td>
                      <td>{deal.product_title}</td>
                      <td>
                        <span className={badge.className}>{deal.score.toFixed(0)}</span>
                      </td>
                      <td>{deal.roi_pct.toFixed(1)}%</td>
                      <td>
                        <span className={styles.statusBadge}>{deal.hunt_status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Supplier Performance */}
        <div className={styles.supplierPerfSection}>
          <h3>Supplier Performance</h3>
          <div className={styles.supplierPerfGrid}>
            {(dashboard.suppliers || []).map((supplier) => (
              <div key={supplier.id} className={styles.perfCard}>
                <h4>{supplier.name}</h4>
                <div className={styles.perfMetric}>
                  <span className={styles.label}>Products</span>
                  <span className={styles.value}>{supplier.product_count}</span>
                </div>
                <div className={styles.perfMetric}>
                  <span className={styles.label}>Reliability</span>
                  <span className={styles.value}>{supplier.reliability_rating.toFixed(1)}/5</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <Sidebar activePage="wholesale" />
      <div className={styles.mainContent}>
        <div className={styles.header}>
          <h1>Wholesale Operations Hub</h1>
          <button className={styles.btnPrimary}>+ New Product</button>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabNav}>
          <button
            className={activeTab === 'pipeline' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('pipeline')}
          >
            Product Pipeline
          </button>
          <button
            className={activeTab === 'suppliers' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('suppliers')}
          >
            Suppliers
          </button>
          <button
            className={activeTab === 'orders' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('orders')}
          >
            Purchase Orders
          </button>
          <button
            className={activeTab === 'dashboard' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
        </div>

        {/* Pipeline Controls */}
        {activeTab === 'pipeline' && (
          <div className={styles.pipelineControls}>
            <div className={styles.filterGroup}>
              <label>Min Score:</label>
              <input
                type="number"
                min="0"
                max="100"
                value={filters.min_score || ''}
                onChange={(e) =>
                  setFilters({ ...filters, min_score: e.target.value || null })
                }
              />
            </div>
            <div className={styles.filterGroup}>
              <label>Min ROI %:</label>
              <input
                type="number"
                min="0"
                value={filters.min_roi || ''}
                onChange={(e) =>
                  setFilters({ ...filters, min_roi: e.target.value || null })
                }
              />
            </div>
            <div className={styles.viewToggle}>
              <button
                className={viewMode === 'kanban' ? styles.btnActive : styles.btnInactive}
                onClick={() => setViewMode('kanban')}
              >
                Kanban
              </button>
              <button
                className={viewMode === 'table' ? styles.btnActive : styles.btnInactive}
                onClick={() => setViewMode('table')}
              >
                Table
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {loading ? (
          <div className={styles.loadingContainer}>
            <p>Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === 'pipeline' && <PipelineTab />}
            {activeTab === 'suppliers' && <SuppliersTab />}
            {activeTab === 'orders' && <PurchaseOrdersTab />}
            {activeTab === 'dashboard' && <DashboardTab />}
          </>
        )}
      </div>

      {/* Product Detail Modal */}
      {showProductModal && selectedProduct && (
        <div className={styles.modal} onClick={() => setShowProductModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{selectedProduct.product_title}</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowProductModal(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalRow}>
                <span className={styles.label}>ASIN</span>
                <span>{selectedProduct.asin}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>Brand</span>
                <span>{selectedProduct.brand || 'N/A'}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>Category</span>
                <span>{selectedProduct.category || 'N/A'}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>Buy Price</span>
                <span>${selectedProduct.buy_price.toFixed(2)}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>Amazon Price</span>
                <span>${selectedProduct.amazon_price.toFixed(2)}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>FBA Fee</span>
                <span>${selectedProduct.fba_fee.toFixed(2)}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>Referral Fee</span>
                <span>${selectedProduct.referral_fee.toFixed(2)}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>Net Profit</span>
                <span className={styles.profitValue}>
                  ${selectedProduct.net_profit.toFixed(2)}
                </span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>ROI %</span>
                <span>{selectedProduct.roi_pct.toFixed(1)}%</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>Margin %</span>
                <span>{selectedProduct.margin_pct.toFixed(1)}%</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>BSR</span>
                <span>{selectedProduct.bsr || 'N/A'}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>Monthly Sales Est.</span>
                <span>{selectedProduct.monthly_sales_est}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>Buy Box %</span>
                <span>{selectedProduct.buy_box_pct.toFixed(1)}%</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>FBA Sellers</span>
                <span>{selectedProduct.num_fba_sellers}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>Score</span>
                <span className={getScoreBadge(selectedProduct.score).className}>
                  {selectedProduct.score.toFixed(0)}
                </span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>Hunt Status</span>
                <span className={styles.statusBadge}>{selectedProduct.hunt_status}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>Approval Status</span>
                <span className={styles.statusBadge}>{selectedProduct.approval_status}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.label}>Notes</span>
                <span>{selectedProduct.notes || 'N/A'}</span>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary}>Edit</button>
              <button className={styles.btnSecondary}>Delete</button>
              <button
                className={styles.btnPrimary}
                onClick={() => setShowProductModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
