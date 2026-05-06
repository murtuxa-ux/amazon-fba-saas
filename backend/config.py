"""
Ecom Era FBA SaaS v6.0 — Configuration
Centralized settings from environment variables
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://localhost:5432/ecomera_fba"

    # JWT Auth
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 72

    # Keepa
    KEEPA_API_KEY: Optional[str] = None
    # Max Keepa tokens a single Product Radar live-scan may consume.
    RADAR_LIVE_SCAN_TOKEN_BUDGET: int = 500

    # Stripe Billing
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_STARTER_PRICE_ID: Optional[str] = None
    STRIPE_GROWTH_PRICE_ID: Optional[str] = None
    STRIPE_ENTERPRISE_PRICE_ID: Optional[str] = None

    # App
    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000,https://amazon-fba-saas.vercel.app"

    # Multi-tenancy — master kill-switch for tenant_session enforcement.
    # Defined in PR C-1, defaulting False so the new tenant_session
    # dependency is a no-op (current behavior preserved). PR C-2 ships
    # the route sweep + RLS migration with this still False, soaks for
    # 24-48h, then we flip RLS_ENFORCED=true via Railway env var to
    # engage SET LOCAL ROLE app_role + SET LOCAL app.current_org_id per
    # request. Flip back to false to roll back without redeploying.
    RLS_ENFORCED: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
