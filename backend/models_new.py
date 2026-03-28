"""
NEW MODEL CLASSES — Ecom Era FBA SaaS v6.0
To be APPENDED to models.py

These new SQLAlchemy ORM models extend the existing models.py with PPC management,
profit analysis, buy box tracking, brand approvals, FBA/FBM operations, account health,
and client portal functionality.

USAGE:
1. Copy all classes below (excluding this header)
2. Paste them at the end of the existing models.py file
3. Update the Organization class relationships (see comments at bottom)
"""
from sqlalchemy import (
    Column, ForeignKey, String, Integer, Boolean, Text, Float, DateTime,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


# ── PPCCampaign ──────────────────────────────────────────────────────────────
class PPCCampaign(Base):
    __tablename__ = "ppc_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    account_id = Column(Integer, nullable=True)
    campaign_name = Column(String(255), nullable=False)
    campaign_type = Column(String(10), default="SP")             # SP / SB / SD
    status = Column(String(20), default="active")                # active / paused / archived
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

    # Relationships
    organization = relationship("Organization", back_populates="ppc_campaigns")
    keywords = relationship("PPCKeyword", back_populates="campaign")
    ad_groups = relationship("PPCAdGroup", back_populates="campaign")


# ── PPCKeyword ───────────────────────────────────────────────────────────────
class PPCKeyword(Base):
    __tablename__ = "ppc_keywords"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("ppc_campaigns.id"), nullable=False, index=True)
    keyword_text = Column(String(500), nullable=False)
    match_type = Column(String(20), default="broad")             # broad / phrase / exact
    bid = Column(Float, default=0.0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    spend = Column(Float, default=0.0)
    sales = Column(Float, default=0.0)
    acos = Column(Float, default=0.0)
    status = Column(String(20), default="active")                # active / paused / archived
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    campaign = relationship("PPCCampaign", back_populates="keywords")


# ── PPCAdGroup ───────────────────────────────────────────────────────────────
class PPCAdGroup(Base):
    __tablename__ = "ppc_ad_groups"

     id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("ppc_campaigns.id"), nullable=False, index=True)
    ad_group_name = Column(String(255), nullable=False)
    default_bid = Column(Float, default=0.0)
    status = Column(String(20), default="active")                # active / paused / archived
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    campaign = relationship("PPCCampaign", back_populates="ad_groups")


# ─── ProfitAnalysis ──────────────────────────────────────────────────────────────────────────────
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
    recommended_fulfillment = Column(String(10), default="FBA")  # FBA / FBM / HYBRID
    marketplace = Column(String(10), default="US")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="profit_analyses")


# ─── BuyBoxTracker ──────────────────────────────────────────────────────────────────────────────
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

    # Relationships
    organization = relationship("Organization", back_populates="buybox_trackers")
    history = relationship("BuyBoxHistory", back_populates="tracker")


# ─── BuyBoxHistory ──────────────────────────────────────────────────────────────────────────────
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

    # Relationships
    tracker = relationship("BuyBoxTracker", back_populates="history")


# ─── BrandApproval ──────────────────────────────────────────────────────────────────────────────
class BrandApproval(Base):
    __tablename__ = "brand_approvals"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    brand_name = Column(String(255), nullable=False)
    category = Column(String(255), default="")
    account_id = Column(Integer, nullable=True)
    status = Column(String(20), default="pending")               # pending / approved / rejected / in_progress
    priority = Column(String(10), default="medium")              # low / medium / high / urgent
    notes = Column(Text, default="")
    documents_required = Column(Integer, default=0)
    documents_submitted = Column(Integer, default=0)
    submitted_date = Column(DateTime, nullable=True)
    resolved_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="brand_approvals")
    documents = relationship("BrandDocument", back_populates="approval")
    timeline = relationship("BrandTimeline", back_populates="approval")


# ─── BrandDocument ──────────────────────────────────────────────────────────────────────────────
class BrandDocument(Base):
    __tablename__ = "brand_documents"

    id = Column(Integer, primary_key=True, index=True)
    approval_id = Column(Integer, ForeignKey("brand_approvals.id"), nullable=False, index=True)
    document_name = Column(String(255), nullable=False)
    document_type = Column(String(50), nullable=False)           # trademark / invoice / letter / logo / etc
    is_submitted = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    approval = relationship("BrandApproval", back_populates="documents")


# ─── BrandTimeline ──────────────────────────────────────────────────────────────────────────────
class BrandTimeline(Base):
    __tablename__ = "brand_timeline"

    id = Column(Integer, primary_key=True, index=True)
    approval_id = Column(Integer, ForeignKey("brand_approvals.id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)              # submitted / approved / rejected / requested_info / etc
    description = Column(Text, nullable=False)
    created_by = Column(String(200), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    approval = relationship("BrandApproval", back_populates="timeline")


# ─── FBAShipment ────────────────────────────────────────────────────────────────────────────────────────
class FBAShipment(Base):
    __tablename__ = "fba_shipments"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    shipment_name = Column(String(255), nullable=False)
    shipment_id = Column(String(50), nullable=True, index=True)
    destination_fc = Column(String(10), default="")              # fulfillment center code
    shipping_method = Column(String(10), default="SPD")          # SPD / LTL / etc
    carrier = Column(String(100), default="")
    tracking_number = Column(String(100), default="")
    status = Column(String(20), default="draft")                 # draft / shipped / in_transit / delivered / cancelled
    ship_date = Column(DateTime, nullable=True)
    estimated_arrival = Column(DateTime, nullable=True)
    actual_arrival = Column(DateTime, nullable=True)
    total_units = Column(Integer, default=0)
    total_boxes = Column(Integer, default=0)
    total_weight_lbs = Column(Float, default=0.0)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="fba_shipments")
    items = relationship("FBAShipmentItem", back_populates="shipment")


# ─── FBAShipmentItem ────────────────────────────────────────────────────────────────────────────
class FBAShipmentItem(Base):
    __tablename__ = "fba_shipment_items"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("fba_shipments.id"), nullable=False, index=True)
    asin = Column(String(20), nullable=False)
    sku = Column(String(50), default="")
    quantity = Column(Integer, default=0)
    units_per_case = Column(Integer, default=1)
    number_of_cases = Column(Integer, default=0)
    prep_type = Column(String(20), default="none")               # none / label / poly_bag / etc
    condition = Column(String(20), default="new")                # new / refurbished / used
    fnsku = Column(String(20), nullable=True)
    is_prepped = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    shipment = relationship("FBAShipment", back_populates="items")


# ─── FBMOrder ───────────────────────────────────────────────────────────────────────────────────────────
class FBMOrder(Base):
    __tablename__ = "fbm_orders"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    amazon_order_id = Column(String(50), default="", index=True)
    buyer_name = Column(String(255), default="")
    buyer_address_line1 = Column(String(500), default="")
    buyer_city = Column(String(100), default="")
    buyer_state = Column(String(50), default="")
    buyer_zip = Column(String(20), default="")
    buyer_country = Column(String(10), default="US")
    order_date = Col
