"""
Database Models — Ecom Era FBA SaaS v6.0
SQLAlchemy ORM for PostgreSQL database schema
"""
from sqlalchemy import (
    Column, ForeignKey, String, Integer, Boolean, Text, Float, DateTime,
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
