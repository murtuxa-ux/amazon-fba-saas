"""
Phase 12-15 model shim — Ecom Era FBA SaaS.

The classes formerly defined here were consolidated into models.py
during the multi-tenancy cleanup (PR A, brief §2.1).

This module is kept temporarily as a re-export shim so callers that
still do `from models_phase12 import X` (e.g., amazon_integration.py
lazy imports) and `import models_phase12` (main_wrapper.py,
main_patch_phase12.py) keep working without changes.

This file will be removed in PR B alongside main_wrapper.py and
main_patch_phase12.py once Alembic baseline lands.
"""
from models import (  # noqa: F401  (re-exports for backwards compat)
    PPCCampaign,
    PPCKeyword,
    PPCAdGroup,
    ProfitAnalysis,
    BuyBoxTracker,
    BuyBoxHistory,
    BrandApproval,
    BrandDocument,
    BrandTimeline,
    FBAShipment,
    FBAShipmentItem,
    FBMOrder,
    FBMOrderItem,
    AccountHealthSnapshot,
    AccountViolation,
    ClientPortalUser,
    ClientMessage,
)
