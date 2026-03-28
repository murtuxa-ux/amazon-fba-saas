"""
Ecom Era FBA SaaS v8.0 — Main Application
Multi-tenant, JWT-authenticated API built with FastAPI and PostgreSQL
"""

from fastapi import FastAPI, HTTPException, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
import uuid

from config import settings
from database import get_db, init_db, Base, engine
from models import (
    Organization, User, Client, Product, WeeklyReport,
    Supplier, ScoutResult, ActivityLog,
)
from auth import (
    get_current_user, require_role, hash_password, verify_password,
    create_access_token, get_org_scoped_query,
)
from ai_engine import calculate_score, get_decision, get_risk_level
from fba_scoring import compute_fba_score, compute_profit
from keepa_service import get_keepa_data
from stripe_billing import router as billing_router
from plan_middleware import enforce_client_limit, enforce_scout_limit

# Phase 3/4 AI module routers
from ai_recommendations import router as recommendations_router
from market_analyzer import router as market_router
from competitor_tracker import router as competitor_router
from pricing_optimizer import router as pricing_router
from inventory_forecaster import router as inventory_router
from risk_analyzer import router as risk_router
from report_generator import router as report_gen_router
from notification_service import router as notification_router
from batch_processor import router as batch_router
from analytics_engine import router as analytics_router

# Stage 5/6 module routers
from websocket_manager import router as ws_router
from email_service import router as email_router
from pdf_exporter import router as export_router
from scheduler import router as scheduler_router
from system_monitor import router as system_router
from kpi_targets import router as kpi_router

# Stage 7: DWM Reporting System
from dwm_reporting import router as dwm_router

# Phase 7-11: New modules (safe imports)
import logging as _log

_phase7_routers = {}
for _mod_name, _router_name, _key in [
    ("products_manager", "router", "products_pipeline"),
    ("purchase_orders", "router", "purchase_orders"),
    ("client_pnl", "router", "client_pnl"),
    ("automation_service", "router", "automation"),
    ("client_portal", "router", "client_portal"),
    ("intelligence_hub", "router", "intelligence"),
]:
    try:
        _mod = __import__(_mod_name)
        _phase7_routers[_key] = getattr(_mod, _router_name)
    except Exception as _e:
        _log.error(f"Failed to import {_mod_name}: {_e}")
        _phase7_routers[_key] = None

# Phase 12-15: Wholesale Intelligence, Fulfillment, RBAC, Client Portal (safe imports)
_phase12_routers = {}
for _mod_name, _router_name, _key in [
    ("ppc_manager", "router", "ppc"),
    ("wholesale_profit_calculator", "router", "profit_calc"),
    ("buybox_tracker", "router", "buybox"),
    ("brand_approval_tracker", "router", "brand_approvals"),
    ("fba_shipment_planner", "router", "fba_shipments"),
    ("fbm_order_manager", "router", "fbm_orders"),
    ("account_health_monitor", "router", "account_health"),
    ("multi_user_access", "router", "user_management"),
    ("client_portal_external", "router", "client_portal_ext"),
]:
    try:
        _mod = __import__(_mod_name)
        _phase12_routers[_key] = getattr(_mod, _router_name)
    except Exception as _e:
        _log.error(f"Failed to import {_mod_name}: {_e}")
        _phase12_routers[_key] = None

# Initialize FastAPI app
app = FastAPI(
    title="Ecom Era FBA SaaS",
    description="Multi-tenant Amazon FBA management platform",
    version="8.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all Phase 3/4 routers
app.include_router(recommendations_router)
app.include_router(market_router)
app.include_router(competitor_router)
app.include_router(pricing_router)
app.include_router(inventory_router)
app.include_router(risk_router)
app.include_router(report_gen_router)
app.include_router(notification_router)
app.include_router(batch_router)
app.include_router(analytics_router)

# Include all Stage 5/6 routers
app.include_router(billing_router)
app.include_router(ws_router)
app.include_router(email_router)
app.include_router(export_router)
app.include_router(scheduler_router)
app.include_router(system_router)
app.include_router(kpi_router)

# Include Stage 7 routers
app.include_router(dwm_router)

# Phase 7-11 routers (only include if successfully imported)
for _key, _router in _phase7_routers.items():
    if _router is not None:
        app.include_router(_router)
    else:
        _log.warning(f"Skipping router: {_key} (import failed)")

# Phase 12-15 routers (only include if successfully imported)
for _key, _router in _phase12_routers.items():
    if _router is not None:
        app.include_router(_router)
    else:
        _log.warning(f"Skipping router: {_key} (import failed)")

# --- REST OF EXISTING main.py CODE CONTINUES BELOW (unchanged) ---

@app.on_event("startup")
def on_startup():
    try:
        Base.metadata.create_all(bind=engine)
        _log.info("Database tables created / verified successfully")
    except Exception as e:
        _log.error(f"Error creating database tables: {e}")
