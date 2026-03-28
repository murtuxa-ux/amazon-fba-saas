"""
Phase 12-15 Router Patch — Ecom Era FBA SaaS v8.0
This module is imported by main_patch.py to register Phase 12-15 routers.
It imports models_phase12 first (to monkey-patch model classes into the models module),
then imports all 9 Phase 12-15 backend modules with safe error handling.
"""
import logging

logger = logging.getLogger(__name__)

# Step 1: Import models_phase12 to register new DB models and patch the models module
try:
    import models_phase12
    logger.info("Phase 12-15 database models loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Phase 12-15 models: {e}")

# Step 2: Import Phase 12-15 routers with safe error handling
phase12_routers = {}
for mod_name, router_name, key in [
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
        mod = __import__(mod_name)
        phase12_routers[key] = getattr(mod, router_name)
        logger.info(f"Phase 12-15 module loaded: {mod_name}")
    except Exception as e:
        logger.error(f"Failed to import {mod_name}: {e}")
        phase12_routers[key] = None


def register_phase12_routers(app):
    """Register all Phase 12-15 routers with the FastAPI app."""
    count = 0
    for key, router in phase12_routers.items():
        if router is not None:
            try:
                app.include_router(router)
                count += 1
            except Exception as e:
                logger.error(f"Failed to register router {key}: {e}")
        else:
            logger.warning(f"Skipping Phase 12-15 router: {key} (import failed)")
    logger.info(f"Phase 12-15: registered {count}/{len(phase12_routers)} routers")
    return count
