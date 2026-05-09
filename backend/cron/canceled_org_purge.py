"""Daily canceled-org purge (§2.2 30-day grace).

When Stripe fires customer.subscription.deleted, stripe_billing.py
enqueues a CanceledOrgPurgeQueue row with purge_after = now + 30 days.
This cron walks the queue, finds entries whose grace period has
elapsed, and hard-deletes the org. ON DELETE CASCADE on every org_id
FK does the bulk of the row-level cleanup.

Per-org failures flip the queue row to purge_status='failed' so an
operator can investigate without the run aborting wholesale.

Runs as migration_role (BYPASSRLS) so the cross-org iteration works.

Wired by Murtaza to a Railway scheduled task (daily, off-peak).
"""
from __future__ import annotations

import logging
import sys
from datetime import datetime
from pathlib import Path

# Allow `python backend/cron/canceled_org_purge.py` from repo root.
_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from sqlalchemy.orm import sessionmaker  # noqa: E402

from database import engine  # noqa: E402
import models  # noqa: E402


logger = logging.getLogger(__name__)


def purge_canceled_orgs(now: datetime | None = None) -> dict:
    """Hard-delete canceled orgs whose 30-day grace has elapsed."""
    Session = sessionmaker(bind=engine)
    db = Session()
    now = now or datetime.utcnow()
    purged = 0
    already_gone = 0
    failed = 0
    try:
        queue_items = (
            db.query(models.CanceledOrgPurgeQueue)
            .filter(
                models.CanceledOrgPurgeQueue.purge_status == "pending",
                models.CanceledOrgPurgeQueue.purge_after <= now,
            )
            .all()
        )

        for item in queue_items:
            try:
                org = (
                    db.query(models.Organization)
                    .filter(models.Organization.id == item.org_id)
                    .first()
                )
                if not org:
                    item.purge_status = "purged"
                    item.purged_at = now
                    db.commit()
                    already_gone += 1
                    continue

                # ON DELETE CASCADE on the org_id FKs across the schema
                # handles row-level cleanup. Tables with no FK to
                # organizations (the queue itself, stripe_webhook_events)
                # are intentionally retained — the queue tracks its own
                # lifecycle below; webhook events are an idempotency log.
                db.delete(org)
                item.purge_status = "purged"
                item.purged_at = now
                db.commit()
                purged += 1
                logger.info("Purged canceled org %s", item.org_id)
            except Exception:
                logger.exception(
                    "purge failed for queued org %s", item.org_id
                )
                db.rollback()
                try:
                    item.purge_status = "failed"
                    db.commit()
                except Exception:
                    db.rollback()
                failed += 1
    finally:
        db.close()

    summary = {
        "purged": purged,
        "already_gone": already_gone,
        "failed": failed,
    }
    logger.info("canceled-org purge done: %s", summary)
    return summary


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    purge_canceled_orgs()
