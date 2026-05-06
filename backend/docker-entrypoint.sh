#!/bin/sh
# Container entrypoint for Ecom Era FBA SaaS backend.
#
# Run by Docker as PID 1. Two steps in order:
#   1. alembic_bootstrap.py — three-state probe; stamps head on the
#      legacy pre-alembic prod DB, runs upgrade head everywhere else.
#   2. uvicorn — exec'd so it inherits PID 1 and receives Docker
#      signals (SIGTERM on shutdown, etc.) directly.
#
# `set -e` aborts the script if the bootstrap fails, which surfaces as
# a non-zero container exit. Railway will then retry per the restart
# policy in railway.json. We do NOT want to start uvicorn against an
# un-migrated database.

set -e

echo "entrypoint: running alembic bootstrap"
python alembic_bootstrap.py

echo "entrypoint: starting uvicorn on port ${PORT:-8000}"
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
