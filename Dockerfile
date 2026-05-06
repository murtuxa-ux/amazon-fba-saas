# Backend container for Ecom Era FBA SaaS.
#
# Why a Dockerfile and not Nixpacks: this is a monorepo with a Node
# frontend at /frontend and a Python backend at /backend. With
# /railway.json forcing the build context to repo root, Nixpacks
# auto-detects on frontend/package.json and never installs Python.
# /nixpacks.toml with `providers = ["python"]` did not override that
# behavior in practice (PR #10 — same `pip: command not found` failure).
# A Dockerfile gives full control over base image, install order, and
# entrypoint orchestration with no auto-detection in the loop.

FROM python:3.11-slim

# Quiet pip warnings, keep image lean.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Layer 1: Python dependencies. Cached when requirements.txt is unchanged.
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# Layer 2: backend application code (rebuilt on any backend/ change).
# COPY of a directory with trailing slash copies the directory contents,
# so /app ends up containing main.py, alembic.ini, alembic/, models.py,
# alembic_bootstrap.py, docker-entrypoint.sh, etc.
COPY backend/ .

# Make the entrypoint executable. Required because Windows checkouts
# don't preserve the +x bit through git.
RUN chmod +x /app/docker-entrypoint.sh

# Railway injects $PORT at runtime; 8000 is just a documentation default.
EXPOSE 8000

# The entrypoint runs alembic_bootstrap.py first (creates / stamps
# alembic_version, applies any pending migrations) then exec's into
# uvicorn. No reliance on Railway's release phase — both steps happen
# inside this container's start.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
