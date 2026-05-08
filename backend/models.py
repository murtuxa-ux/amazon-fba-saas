"""
Database Models — Ecom Era FBA SaaS v6.0
SQLAlchemy ORM for PostgreSQL database schema
"""
from sqlalchemy import (
    Column, ForeignKey, String, Integer, Boolean, Text, Float, DateTime, Date,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


# ── Organization ─────────────────────────────────────────────────────────────
class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    plan = Column(String(50), default="starter")             # starter / growth / enterprise
    keepa_api_key = Column(String(255), default="")
    stripe_customer_id = Column(String(255), default="")
    stripe_subscription_id = Column(String(255), default="")
    # Subscription lifecycle state set by Stripe webhooks.
    # active = paid + within period; trialing = inside Stripe trial window;
    # past_due = invoice.payment_failed; canceled = customer.subscription.deleted.
    status = Column(String(20), default="trialing", nullable=False)
    trial_ends_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="organization")
    clients = relationship("Client", back_populates="organization")
    products = relationship("Product", back_populates="organization")
    weekly_reports = relationship("WeeklyReport", back_populates="organization")
    suppliers = relationship("Supplier", back_populates="organization")
    scout_results = relationship("ScoutResult", back_populates="organization")
    activity_logs = relationship("ActivityLog", back_populates="organization")
    buybox_trackers = relationship("BuyBoxTracker", back_populates="organization")
    buybox_alerts = relationship("BuyBoxAlert", back_populates="organization")
    ppc_campaigns = relationship("PPCCampaign", back_populates="organization")
    profit_analyses = relationship("ProfitAnalysis", back_populates="organization")
    brand_approvals = relationship("BrandApproval", back_populates="organization")
    fba_shipments = relationship("FBAShipment", back_populates="organization")
    fbm_orders = relationship("FBMOrder", back_populates="organization")
    account_health_snapshots = relationship("AccountHealthSnapshot", back_populates="organization")
    account_violations = relationship("AccountViolation", back_populates="organization")
    client_portal_users = relationship("ClientPortalUser", back_populates="organization")
    client_messages = relationship("ClientMessage", back_populates="organization")


# ── User ─────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=False, index=True)
    role = Column(String(50), default="manager")             # owner / admin / manager / viewer
    avatar = Column(String(10), default="U")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="users")
    activity_logs = relationship("ActivityLog", back_populates="user")


# ── Client ───────────────────────────────────────────────────────────────────
class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(200), default="")
    phone = Column(String(50), default="")
    marketplace = Column(String(10), default="US")
    plan = Column(String(50), default="Starter")
    assigned_am = Column(String(200), default="")
    monthly_budget = Column(Float, default=0.0)
    start_date = Column(String(20), default="")
    status = Column(String(50), default="active")            # active / paused / churned
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="clients")


# ── Product (analyzed products) ──────────────────────────────────────────────
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    asin = Column(String(20), nullable=False)
    cost = Column(Float, default=0.0)
    price = Column(Float, default=0.0)
    fba_fee = Column(Float, default=0.0)
    net_profit = Column(Float, default=0.0)
    roi_pct = Column(Float, default=0.0)
    ai_score = Column(Float, default=0.0)
    decision = Column(String(20), default="")                # BUY / TEST / REJECT
    risk_level = Column(String(20), default="")              # HIGH RISK / LOW RISK
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="products")


# ── WeeklyReport ─────────────────────────────────────────────────────────────
class WeeklyReport(Base):
    __tablename__ = "weekly_reports"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    week = Column(String(20), nullable=False)                # e.g. "2026-W13"
    manager = Column(String(200), nullable=False)
    hunted = Column(Integer, default=0)
    analyzed = Column(Integer, default=0)
    contacted = Column(Integer, default=0)
    approved = Column(Integer, default=0)
    purchased = Column(Integer, default=0)
    revenue = Column(Float, default=0.0)
    profit = Column(Float, default=0.0)
    roi_pct = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="weekly_reports")


# ── Supplier ─────────────────────────────────────────────────────────────────
class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    brand = Column(String(255), default="")
    contact = Column(String(255), default="")
    response_rate = Column(Float, default=0.0)
    approval_rate = Column(Float, default=0.0)
    priority_score = Column(Float, default=0.0)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="suppliers")


# ── ScoutResult ──────────────────────────────────────────────────────────────
class ScoutResult(Base):
    __tablename__ = "scout_results"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    asin = Column(String(20), nullable=False, index=True)
    title = Column(String(500), default="")
    brand = Column(String(255), default="")
    category = Column(String(255), default="")
    bsr = Column(Integer, default=0)
    monthly_sales = Column(Integer, default=0)
    current_price = Column(Float, default=0.0)
    price_volatility_pct = Column(Float, default=0.0)
    fba_sellers = Column(Integer, default=0)
    fba_score = Column(Float, default=0.0)
    verdict = Column(String(50), default="Skip")             # Buy / Test / Skip
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="scout_results")


# ── ActivityLog ──────────────────────────────────────────────────────────────
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    detail = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="activity_logs")
    user = relationship("User", back_populates="activity_logs")


# ── BuyBoxTracker ────────────────────────────────────────────────────────────
class BuyBoxTracker(Base):
    __tablename__ = "buybox_trackers"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    asin = Column(String(20), nullable=False, index=True)
    product_title = Column(String(500), default="")
    our_price = Column(Float, default=0.0)
    buy_box_price = Column(Float, default=0.0)
    buy_box_winner = Column(String(255), default="")
    win_rate_pct = Column(Float, default=0.0)
    is_suppressed = Column(Boolean, default=False)
    competitor_count = Column(Integer, default=0)
    last_checked = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="buybox_trackers")
    history = relationship("BuyBoxHistory", back_populates="tracker", cascade="all, delete-orphan")
    alerts = relationship("BuyBoxAlert", back_populates="tracker", cascade="all, delete-orphan")


# ── BuyBoxHistory ────────────────────────────────────────────────────────────
class BuyBoxHistory(Base):
    __tablename__ = "buybox_history"

    id = Column(Integer, primary_key=True, index=True)
    tracker_id = Column(Integer, ForeignKey("buybox_trackers.id"), nullable=False, index=True)
    buy_box_price = Column(Float, nullable=False)
    buy_box_winner = Column(String(255), nullable=False)
    our_price = Column(Float, nullable=False)
    competitor_count = Column(Integer, default=0)
    is_winning = Column(Boolean, default=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    tracker = relationship("BuyBoxTracker", back_populates="history")


# ── BuyBoxAlert ──────────────────────────────────────────────────────────────
class BuyBoxAlert(Base):
    __tablename__ = "buybox_alerts"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    tracker_id = Column(Integer, ForeignKey("buybox_trackers.id"), nullable=True, index=True)
    asin = Column(String(20), nullable=False, index=True)
    product_title = Column(String(500), default="")
    alert_type = Column(String(50), nullable=False)        # lost_buybox / price_drop / new_competitor / suppressed
    severity = Column(String(20), default="info")          # critical / warning / info
    message = Column(Text, default="")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="buybox_alerts")
    tracker = relationship("BuyBoxTracker", back_populates="alerts")


# ─────────────────────────────────────────────────────────────────────────────
# Phase 12-15 models — consolidated from former models_phase12.py.
# All tables have org_id FK to organizations; non-org-rooted child tables
# (PPCKeyword, PPCAdGroup, BrandDocument, BrandTimeline, FBAShipmentItem,
# FBMOrderItem) inherit tenancy through their parent FK.
# ─────────────────────────────────────────────────────────────────────────────


# ── PPCCampaign ──────────────────────────────────────────────────────────────
class PPCCampaign(Base):
    __tablename__ = "ppc_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    account_id = Column(Integer, nullable=True)
    campaign_name = Column(String(255), nullable=False)
    campaign_type = Column(String(10), default="SP")
    status = Column(String(20), default="active")
    daily_budget = Column(Float, default=0.0)
    total_spend = Column(Float, default=0.0)
    total_sales = Column(Float, default=0.0)
    acos = Column(Float, default=0.0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    orders = Column(Integer, default=0)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="ppc_campaigns")
    keywords = relationship("PPCKeyword", back_populates="campaign")
    ad_groups = relationship("PPCAdGroup", back_populates="campaign")


# ── PPCKeyword ───────────────────────────────────────────────────────────────
class PPCKeyword(Base):
    __tablename__ = "ppc_keywords"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("ppc_campaigns.id"), nullable=False, index=True)
    keyword_text = Column(String(500), nullable=False)
    match_type = Column(String(20), default="broad")
    bid = Column(Float, default=0.0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    spend = Column(Float, default=0.0)
    sales = Column(Float, default=0.0)
    acos = Column(Float, default=0.0)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    campaign = relationship("PPCCampaign", back_populates="keywords")


# ── PPCAdGroup ───────────────────────────────────────────────────────────────
class PPCAdGroup(Base):
    __tablename__ = "ppc_ad_groups"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("ppc_campaigns.id"), nullable=False, index=True)
    ad_group_name = Column(String(255), nullable=False)
    default_bid = Column(Float, default=0.0)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    campaign = relationship("PPCCampaign", back_populates="ad_groups")


# ── ProfitAnalysis ───────────────────────────────────────────────────────────
class ProfitAnalysis(Base):
    __tablename__ = "profit_analyses"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    asin = Column(String(20), nullable=False, index=True)
    cost_price = Column(Float, default=0.0)
    selling_price = Column(Float, default=0.0)
    fba_profit = Column(Float, default=0.0)
    fbm_profit = Column(Float, default=0.0)
    fba_roi = Column(Float, default=0.0)
    fbm_roi = Column(Float, default=0.0)
    fba_margin = Column(Float, default=0.0)
    fbm_margin = Column(Float, default=0.0)
    recommended_fulfillment = Column(String(10), default="FBA")
    marketplace = Column(String(10), default="US")
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="profit_analyses")


# ── BrandApproval ────────────────────────────────────────────────────────────
class BrandApproval(Base):
    __tablename__ = "brand_approvals"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    brand_name = Column(String(255), nullable=False)
    category = Column(String(255), default="")
    account_id = Column(Integer, nullable=True)
    status = Column(String(20), default="pending")
    priority = Column(String(10), default="medium")
    notes = Column(Text, default="")
    documents_required = Column(Integer, default=0)
    documents_submitted = Column(Integer, default=0)
    submitted_date = Column(DateTime, nullable=True)
    resolved_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="brand_approvals")
    documents = relationship("BrandDocument", back_populates="approval")
    timeline = relationship("BrandTimeline", back_populates="approval")


# ── BrandDocument ────────────────────────────────────────────────────────────
class BrandDocument(Base):
    __tablename__ = "brand_documents"

    id = Column(Integer, primary_key=True, index=True)
    approval_id = Column(Integer, ForeignKey("brand_approvals.id"), nullable=False, index=True)
    document_name = Column(String(255), nullable=False)
    document_type = Column(String(50), nullable=False)
    is_submitted = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    approval = relationship("BrandApproval", back_populates="documents")


# ── BrandTimeline ────────────────────────────────────────────────────────────
class BrandTimeline(Base):
    __tablename__ = "brand_timeline"

    id = Column(Integer, primary_key=True, index=True)
    approval_id = Column(Integer, ForeignKey("brand_approvals.id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    created_by = Column(String(200), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    approval = relationship("BrandApproval", back_populates="timeline")


# ── FBAShipment ──────────────────────────────────────────────────────────────
class FBAShipment(Base):
    __tablename__ = "fba_shipments"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    shipment_name = Column(String(255), nullable=False)
    shipment_id = Column(String(50), nullable=True, index=True)
    destination_fc = Column(String(10), default="")
    shipping_method = Column(String(10), default="SPD")
    carrier = Column(String(100), default="")
    tracking_number = Column(String(100), default="")
    status = Column(String(20), default="draft")
    ship_date = Column(DateTime, nullable=True)
    estimated_arrival = Column(DateTime, nullable=True)
    actual_arrival = Column(DateTime, nullable=True)
    total_units = Column(Integer, default=0)
    total_boxes = Column(Integer, default=0)
    total_weight_lbs = Column(Float, default=0.0)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="fba_shipments")
    items = relationship("FBAShipmentItem", back_populates="shipment")


# ── FBAShipmentItem ──────────────────────────────────────────────────────────
class FBAShipmentItem(Base):
    __tablename__ = "fba_shipment_items"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("fba_shipments.id"), nullable=False, index=True)
    asin = Column(String(20), nullable=False)
    sku = Column(String(50), default="")
    quantity = Column(Integer, default=0)
    units_per_case = Column(Integer, default=1)
    number_of_cases = Column(Integer, default=0)
    prep_type = Column(String(20), default="none")
    condition = Column(String(20), default="new")
    fnsku = Column(String(20), nullable=True)
    is_prepped = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    shipment = relationship("FBAShipment", back_populates="items")


# ── FBMOrder ─────────────────────────────────────────────────────────────────
class FBMOrder(Base):
    __tablename__ = "fbm_orders"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    amazon_order_id = Column(String(50), default="", index=True)
    buyer_name = Column(String(255), default="")
    buyer_city = Column(String(100), default="")
    buyer_state = Column(String(50), default="")
    buyer_zip = Column(String(20), default="")
    buyer_country = Column(String(10), default="US")
    order_date = Column(DateTime, nullable=True)
    ship_by_date = Column(DateTime, nullable=True)
    delivery_by_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="pending")
    priority = Column(String(20), default="standard")
    carrier = Column(String(100), default="")
    tracking_number = Column(String(100), default="")
    ship_date = Column(DateTime, nullable=True)
    delivery_date = Column(DateTime, nullable=True)
    total_amount = Column(Float, default=0.0)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="fbm_orders")
    items = relationship("FBMOrderItem", back_populates="order")


# ── FBMOrderItem ─────────────────────────────────────────────────────────────
class FBMOrderItem(Base):
    __tablename__ = "fbm_orders_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("fbm_orders.id"), nullable=False, index=True)
    asin = Column(String(20), nullable=False)
    sku = Column(String(50), default="")
    quantity = Column(Integer, default=0)
    unit_price = Column(Float, default=0.0)
    total_price = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("FBMOrder", back_populates="items")


# ── AccountHealthSnapshot ────────────────────────────────────────────────────
class AccountHealthSnapshot(Base):
    __tablename__ = "account_health_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    account_id = Column(Integer, nullable=True)
    health_score = Column(Float, default=0.0)
    odr_rate = Column(Float, default=0.0)
    late_shipment_rate = Column(Float, default=0.0)
    valid_tracking_rate = Column(Float, default=100.0)
    policy_violations_count = Column(Integer, default=0)
    ip_complaints_count = Column(Integer, default=0)
    listing_violations_count = Column(Integer, default=0)
    stranded_inventory_count = Column(Integer, default=0)
    risk_level = Column(String(20), default="low")
    snapshot_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="account_health_snapshots")


# ── AccountViolation ─────────────────────────────────────────────────────────
class AccountViolation(Base):
    __tablename__ = "account_violations"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    violation_type = Column(String(100), nullable=False)
    severity = Column(String(20), default="warning")
    status = Column(String(20), default="open")
    description = Column(Text, default="")
    asin = Column(String(20), nullable=True)
    action_required = Column(Text, default="")
    deadline = Column(DateTime, nullable=True)
    appeal_notes = Column(Text, default="")
    resolved_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="account_violations")


# ── ClientPortalUser ─────────────────────────────────────────────────────────
class ClientPortalUser(Base):
    __tablename__ = "client_portal_users"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    can_view_pnl = Column(Boolean, default=True)
    can_view_inventory = Column(Boolean, default=True)
    can_view_reports = Column(Boolean, default=True)
    can_message = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", backref="portal_users")
    organization = relationship("Organization", back_populates="client_portal_users")
    messages = relationship("ClientMessage", back_populates="portal_user")


# ── ClientMessage ────────────────────────────────────────────────────────────
class ClientMessage(Base):
    __tablename__ = "client_messages"

    id = Column(Integer, primary_key=True, index=True)
    client_portal_user_id = Column(Integer, ForeignKey("client_portal_users.id"), nullable=False, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    subject = Column(String(500), default="")
    message = Column(Text, default="")
    sender_type = Column(String(10), default="client")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    portal_user = relationship("ClientPortalUser", back_populates="messages")
    organization = relationship("Organization", back_populates="client_messages")


# ── UsageCounter ─────────────────────────────────────────────────────────────
# Tracks daily resource usage for tier-gated quotas (ai_scans, keepa_lookups).
# One row per (org, resource, day) — incremented on every enforce_limit() call
# for a daily resource. Cumulative resources (users, clients, asins) are not
# tracked here; their counts are derived from the canonical row count.
class UsageCounter(Base):
    __tablename__ = "usage_counters"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    resource = Column(String(50), nullable=False)
    count = Column(Integer, nullable=False, default=0)
    period_start_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("org_id", "resource", "period_start_date", name="uq_usage_counter_org_resource_date"),
    )


# ── StripeWebhookEvent ───────────────────────────────────────────────────────
# System-wide table (no org_id, no RLS): Stripe webhooks arrive pre-auth and
# are signature-verified, not tenant-scoped. This is purely an idempotency log
# so a redelivered event is a no-op rather than a duplicate state mutation.
class StripeWebhookEvent(Base):
    __tablename__ = "stripe_webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    stripe_event_id = Column(String(255), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    payload = Column(Text, nullable=False)
    processed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
