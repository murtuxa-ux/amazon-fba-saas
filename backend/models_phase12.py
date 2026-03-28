"""
Phase 12-15 Database Models — Ecom Era FBA SaaS
17 new SQLAlchemy ORM model classes for PPC, profit analysis, buy box tracking,
brand approvals, FBA/FBM operations, account health, and client portal.

This module also patches the 'models' module namespace so that backend modules
can import these classes via `from models import PPCCampaign` etc.
"""

from sqlalchemy import (
    Column, ForeignKey, String, Integer, Boolean, Text, Float, DateTime,
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


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


class PPCAdGroup(Base):
    __tablename__ = "ppc_ad_groups"
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("ppc_campaigns.id"), nullable=False, index=True)
    ad_group_name = Column(String(255), nullable=False)
    default_bid = Column(Float, default=0.0)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    campaign = relationship("PPCCampaign", back_populates="ad_groups")


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
    history = relationship("BuyBoxHistory", back_populates="tracker")


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


class BrandTimeline(Base):
    __tablename__ = "brand_timeline"
    id = Column(Integer, primary_key=True, index=True)
    approval_id = Column(Integer, ForeignKey("brand_approvals.id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    created_by = Column(String(200), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    approval = relationship("BrandApproval", back_populates="timeline")


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
    client = relationship("Client", back_populates="portal_users")
    organization = relationship("Organization", back_populates="client_portal_users")
    messages = relationship("ClientMessage", back_populates="portal_user")


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


# ═══════════════════════════════════════════════════════════════════════════════
# Monkey-patch: inject new model classes into the 'models' module namespace
# so that backend modules can do `from models import PPCCampaign` etc.
# ═══════════════════════════════════════════════════════════════════════════════
import sys as _sys

_models_mod = _sys.modules.get("models")
if _models_mod:
    _new_classes = [
        "PPCCampaign", "PPCKeyword", "PPCAdGroup", "ProfitAnalysis",
        "BuyBoxTracker", "BuyBoxHistory", "BrandApproval", "BrandDocument",
        "BrandTimeline", "FBAShipment", "FBAShipmentItem", "FBMOrder",
        "FBMOrderItem", "AccountHealthSnapshot", "AccountViolation",
        "ClientPortalUser", "ClientMessage",
    ]
    _g = globals()
    for _cls_name in _new_classes:
        if _cls_name in _g:
            setattr(_models_mod, _cls_name, _g[_cls_name])
