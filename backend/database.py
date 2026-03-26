"""
Ecom Era FBA SaaS v6.0 — Database Connection
SQLAlchemy engine + session factory with robust DATABASE_URL handling
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Read DATABASE_URL directly from environment first, then fall back to config
# This ensures Railway's injected env vars are always picked up
DATABASE_URL = os.environ.get("DATABASE_URL", "")

if not DATABASE_URL:
    try:
        from config import settings
        DATABASE_URL = settings.DATABASE_URL
    except Exception:
        DATABASE_URL = "postgresql://localhost:5432/ecomera_fba"

# Railway sometimes provides postgres:// instead of postgresql://
# SQLAlchemy 2.x requires postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency injection for FastAPI routes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)
