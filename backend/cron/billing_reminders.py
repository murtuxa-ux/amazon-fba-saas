"""Daily billing reminders cron (§2.4).

Iterates trialing orgs whose trial_ends_at lands inside a 3-day or 1-day
window from now and sends a reminder email to the org's Owner. Honors
EMAIL_DISABLED rollback flag — when set, the cron logs intent but skips
the actual Resend call.

Wired by Murtaza to a Railway scheduled task running once per day at
09:00 UTC. Two reminder windows per run:
  - trial_ends_at in (now+2.5d, now+3.5d) -> "ends in 3 days" email
  - trial_ends_at in (now+0.5d,  now+1.5d) -> "ends in 1 day" email

Wider-than-1d windows so a Railway scheduled job that fires slightly
late or skips a day still catches affected orgs. Per-org idempotency is
NOT enforced here — re-running the same day will resend. That's
acceptable for an MVP cron; tightening to dedup by (org_id, days) goes
in a follow-up sprint when there's traffic to justify the table.

Runs via either:
  python -m cron.billing_reminders        (from backend/ as cwd)
  python backend/cron/billing_reminders.py (from repo root)

Both entrypoints execute as the connection's default DB role
(migration_role in dev/test, app DB user in prod). migration_role is
BYPASSRLS so the cron sees every org regardless of app.current_org_id;
the app DB user is too. RLS does not block this iteration.

Errors per-org are logged and skipped — one bad org should not stop
the whole daily run.
"""
from __future__ import annotations

import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Allow `python backend/cron/billing_reminders.py` from repo root by
# ensuring the backend/ dir is on sys.path so bare `import config` etc.
# resolve. Same shim cron/coach_daily.py uses.
_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from sqlalchemy.orm import sessionmaker  # noqa: E402

from config import settings  # noqa: E402
from database import engine  # noqa: E402
from email_service import get_template, send_email  # noqa: E402
from models import Organization, User  # noqa: E402


logger = logging.getLogger(__name__)


def _send_reminder(db, org: Organization, days: int) -> bool:
    """Find the org's Owner, render the trial_ending template, send.

    Returns True if an email was sent (or would have been sent — the
    EMAIL_DISABLED branch counts as a successful no-op so totals match).
    Returns False if there's no eligible Owner with an email.
    """
    owner = (
        db.query(User)
        .filter(User.org_id == org.id, User.role == "owner", User.is_active == True)
        .first()
    )
    if not owner or not owner.email:
        logger.info("Org %s has no Owner with an email; skipping reminder.", org.id)
        return False

    billing_link = f"{settings.APP_BASE_URL}/billing"
    if settings.EMAIL_DISABLED:
        logger.info(
            "EMAIL_DISABLED=true; not sending %d-day reminder to %s (org %s).",
            days, owner.email, org.id,
        )
        return True

    try:
        subject, html = get_template("trial_ending", {
            "user_name": owner.name or owner.username or "there",
            "days_remaining": days,
            "billing_link": billing_link,
        })
        send_email(owner.email, subject, html)
        return True
    except Exception:
        logger.exception(
            "Failed to send %d-day trial reminder to %s (org %s)",
            days, owner.email, org.id,
        )
        return False


def send_trial_reminders(now: datetime | None = None) -> dict:
    """Send trial-ending reminders. `now` is injectable for tests.

    Returns a counts dict so a wrapping job runner can log totals and
    detect anomalous runs.
    """
    Session = sessionmaker(bind=engine)
    db = Session()
    now = now or datetime.utcnow()
    sent_3 = 0
    sent_1 = 0
    skipped = 0
    try:
        # Two windows. Wider-than-24h on each side so a slightly-late or
        # missed run still catches affected orgs.
        windows = [
            (now + timedelta(days=2, hours=12), now + timedelta(days=3, hours=12), 3),
            (now + timedelta(hours=12), now + timedelta(days=1, hours=12), 1),
        ]

        for w_start, w_end, days in windows:
            orgs = (
                db.query(Organization)
                .filter(
                    Organization.status == "trialing",
                    Organization.trial_ends_at >= w_start,
                    Organization.trial_ends_at <= w_end,
                )
                .all()
            )
            logger.info(
                "Trial-reminder window %d-day: %d trialing orgs in [%s, %s]",
                days, len(orgs), w_start.isoformat(), w_end.isoformat(),
            )
            for org in orgs:
                if _send_reminder(db, org, days):
                    if days == 3:
                        sent_3 += 1
                    else:
                        sent_1 += 1
                else:
                    skipped += 1
    finally:
        db.close()

    summary = {"sent_3_day": sent_3, "sent_1_day": sent_1, "skipped": skipped}
    logger.info("Billing reminders done: %s", summary)
    return summary


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    send_trial_reminders()
