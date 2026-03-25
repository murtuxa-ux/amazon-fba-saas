"""
Ecom Era FBA SaaS v6.0 — Config additions for Phase 2
Add these fields to your existing config.py Settings class.
"""

# Add these to the Settings class in config.py:
#
#     # Stripe Billing (Phase 2)
#     STRIPE_SECRET_KEY: Optional[str] = None
#     STRIPE_WEBHOOK_SECRET: Optional[str] = None
#     STRIPE_STARTER_PRICE_ID: Optional[str] = None
#     STRIPE_GROWTH_PRICE_ID: Optional[str] = None
#     STRIPE_ENTERPRISE_PRICE_ID: Optional[str] = None
#
# And add these to .env.example:
#
#     STRIPE_STARTER_PRICE_ID=price_xxx
#     STRIPE_GROWTH_PRICE_ID=price_xxx
#     STRIPE_ENTERPRISE_PRICE_ID=price_xxx

# ── Patch: apply to existing config.py ──────────────────────────────────────
# This file can be imported to extend settings if needed,
# but ideally just add the fields above to your existing Settings class.

PHASE2_ENV_ADDITIONS = """
# Stripe Billing (Phase 2)
STRIPE_STARTER_PRICE_ID=
STRIPE_GROWTH_PRICE_ID=
STRIPE_ENTERPRISE_PRICE_ID=
"""
