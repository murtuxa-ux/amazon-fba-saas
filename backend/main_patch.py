"""
Ecom Era FBA SaaS v6.0 — main.py patch for Phase 2 Monetization

Add these lines to your existing backend/main.py:

1. Import the billing router (near the top, after other imports):

    from stripe_billing import router as billing_router

2. Include the router (after other app.include_router calls):

    app.include_router(billing_router)

3. Import and use plan middleware on existing routes.
   Example — protect the POST /clients endpoint:

    from plan_middleware import enforce_client_limit

    @app.post("/clients")
    def create_client(
        ...,
        _limit_check: User = Depends(enforce_client_limit),
    ):
        ...

4. Similarly for scouts:

    from plan_middleware import enforce_scout_limit

    @app.post("/scout")
    def scout_asins(
        ...,
        _limit_check: User = Depends(enforce_scout_limit),
    ):
        ...

5. Add 'pricing', 'billing', 'onboarding', 'landing' to your _app.js
   PUBLIC_ROUTES array so unauthenticated users can access them.
"""

# ── Auto-patchable snippet ──────────────────────────────────────────────────
# If you want to apply this programmatically, you can import and mount:

def apply_billing_to_app(app):
    """Call this in main.py after creating the FastAPI app"""
    from stripe_billing import router as billing_router
    app.include_router(billing_router)
    return app
