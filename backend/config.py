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

    # Stripe Billing
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_STARTER_PRICE_ID: Optional[str] = None
    STRIPE_GROWTH_PRICE_ID: Optional[str] = None
    STRIPE_ENTERPRISE_PRICE_ID: Optional[str] = None

    # App
    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000,https://amazon-fba-saas.vercel.app"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
