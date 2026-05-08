"""Daily AI Coach regeneration cron (§2.6 #4).

Wired by Murtaza to a Railway scheduled task running once per day at
06:00 UTC. Iterates every active/trialing org and force-regenerates the
top-5 Coach action feed.

Runs via either:
  python -m cron.coach_daily        (from backend/ as cwd)
  python backend/cron/coach_daily.py (from repo root)

Both entrypoints execute as the connection's default DB role
(migration_role in dev/test, the app DB user in prod). Migration_role is
BYPASSRLS so the cron sees every org regardless of app.current_org_id;
the prod role is too. Either way RLS doesn't block the iteration.

Errors per-org are logged and skipped — one bad org should not stop the
whole daily run.
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

# Allow `python backend/cron/coach_daily.py` from repo root by ensuring
# the backend/ dir is on sys.path so bare `import models` etc. resolve.
_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from sqlalchemy.orm import sessionmaker  # noqa: E402

from ai_coach import regenerate_coach_feed  # noqa: E402
from database import engine  # noqa: E402
from models import Organization  # noqa: E402

logger = logging.getLogger(__name__)


def run_daily_coach_regeneration() -> dict:
    """Regenerate Coach feed for every active/trialing org.

    Returns a small dict (counts) so a wrapping job runner — Railway,
    cron, manual invocation — can log totals and detect anomalous runs
    without re-querying the DB.
    """
    Session = sessionmaker(bind=engine)
    db = Session()
    succeeded = 0
    failed = 0
    try:
        orgs = (
            db.query(Organization)
            .filter(Organization.status.in_(("active", "trialing")))
            .all()
        )
        logger.info("Coach daily regen: %d orgs", len(orgs))
        for org in orgs:
            try:
                regenerate_coach_feed(db, org, force=True)
                succeeded += 1
            except Exception as e:
                # Roll back the org's failed transaction so the next org
                # starts on a clean session — without this, the session
                # is poisoned and every subsequent commit raises.
                db.rollback()
                logger.exception("Coach regen failed for org %d: %s", org.id, e)
                failed += 1
    finally:
        db.close()
    summary = {"succeeded": succeeded, "failed": failed}
    logger.info("Coach daily regen summary: %s", summary)
    return summary


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    run_daily_coach_regeneration()
