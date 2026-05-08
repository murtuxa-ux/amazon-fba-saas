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

    # Per-plan price IDs the stripe_billing.PLANS dict already references via
    # getattr. Declared here so Pydantic's `extra="ignore"` actually loads the
    # values from Railway env. Empty defaults so a missing env var surfaces as
    # 400 "Stripe price not configured" instead of silently falling through.
    STRIPE_SCOUT_PRICE_ID: Optional[str] = None
    STRIPE_SCOUT_ANNUAL_PRICE_ID: Optional[str] = None
    STRIPE_GROWTH_ANNUAL_PRICE_ID: Optional[str] = None
    STRIPE_PRO_PRICE_ID: Optional[str] = None
    STRIPE_PRO_ANNUAL_PRICE_ID: Optional[str] = None
    STRIPE_ENTERPRISE_ANNUAL_PRICE_ID: Optional[str] = None

    # Rollback flag — when true, billing endpoints return 503 cleanly.
    # See CONVENTIONS.md §Rollback playbook.
    STRIPE_DISABLED: bool = False

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

    # Observability (§2.8). Empty SENTRY_DSN keeps the SDK disabled —
    # see CONVENTIONS.md §Rollback playbook. The SDK is still imported
    # and middleware still installs request_id headers regardless of DSN.
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "production"
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    LOG_LEVEL: str = "INFO"

    # Rate limiting (§2.5). Stream B owns. RATE_LIMIT_DISABLED is the
    # rollback flag — see CONVENTIONS.md §Rollback playbook.
    RATE_LIMIT_DISABLED: bool = False
    RATE_LIMIT_PER_USER_PER_MIN: int = 60
    RATE_LIMIT_PER_IP_PER_MIN: int = 200
    RATE_LIMIT_AUTH_PER_IP_PER_MIN: int = 5
    RATE_LIMIT_PER_ORG_PER_MIN: int = 1000

    # Keepa monthly token budget — admin endpoint alerts at 80%.
    KEEPA_MONTHLY_TOKEN_BUDGET: int = 100000

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
