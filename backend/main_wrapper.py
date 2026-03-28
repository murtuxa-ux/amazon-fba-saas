"""
Ecom Era FBA SaaS v8.0 — Application Wrapper
Loads Phase 12-15 models and routers, then exposes the FastAPI app.
Entry point for uvicorn: uvicorn main_wrapper:app
"""
import logging

_log = logging.getLogger(__name__)

# Step 1: Import Phase 12-15 database models (patches the models module)
try:
    import models_phase12
    _log.info("Phase 12-15 database models loaded and patched into models module")
except Exception as e:
    _log.error(f"Failed to load Phase 12-15 models: {e}")

# Step 2: Import the base application (this imports main.py with all existing routes)
from main import app

# Step 3: Import and register Phase 12-15 routers
try:
    import main_patch_phase12
    count = main_patch_phase12.register_phase12_routers(app)
    _log.info(f"Phase 12-15: {count} routers registered successfully")
except Exception as e:
    _log.error(f"Failed to register Phase 12-15 routers: {e}")

# The 'app' object is now the fully configured FastAPI application
# with all phases (1-15) loaded
