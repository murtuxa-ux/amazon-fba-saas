"""Daily audit-log retention purge (§3.4).

Iterates every org and deletes audit_logs rows older than the org's
tier-specific retention window (scout 7d / growth 30d / professional
180d / enterprise 365d, defined in backend/audit_logs.RETENTION_DAYS).

Runs as migration_role (BYPASSRLS) so a single cron run can clean
every tenant — same pattern as cron/coach_daily.py.

Wired by Murtaza to a Railway scheduled task (daily, off-peak). The
purge is idempotent: re-running on the same day deletes nothing
because the previous run already removed the expired rows.

Per-org failures are swallowed and logged — one bad org does not
abort the whole run.
"""
from __future__ import annotations

import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Allow `python backend/cron/audit_retention.py` from repo root.
_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from sqlalchemy.orm import sessionmaker  # noqa: E402

from database import engine  # noqa: E402
from audit_logs import RETENTION_DAYS  # noqa: E402
import models  # noqa: E402


logger = logging.getLogger(__name__)


def purge_expired_audit_logs(now: datetime | None = None) -> dict:
    """Delete expired audit_logs entries for every org. Returns counts."""
    Session = sessionmaker(bind=engine)
    db = Session()
    now = now or datetime.utcnow()
    total_deleted = 0
    orgs_processed = 0
    orgs_failed = 0
    try:
        orgs = db.query(models.Organization).all()
        for org in orgs:
            try:
                retention_days = RETENTION_DAYS.get(
                    (org.plan or "scout").lower(), RETENTION_DAYS["scout"]
                )
                cutoff = now - timedelta(days=retention_days)
                deleted = (
                    db.query(models.AuditLog)
                    .filter(
                        models.AuditLog.org_id == org.id,
                        models.AuditLog.created_at < cutoff,
                    )
                    .delete(synchronize_session=False)
                )
                db.commit()
                total_deleted += deleted
                orgs_processed += 1
            except Exception:
                logger.exception("audit retention failed for org %s", org.id)
                db.rollback()
                orgs_failed += 1
    finally:
        db.close()

    summary = {
        "deleted": total_deleted,
        "orgs_processed": orgs_processed,
        "orgs_failed": orgs_failed,
    }
    logger.info("audit retention done: %s", summary)
    return summary


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    purge_expired_audit_logs()
