"""Tests for backend/cron/billing_reminders.py — Sprint Day 5 (§2.4).

Coverage:
  - Org with trial_ends_at ~3 days out gets exactly one 3-day reminder.
  - Org with trial_ends_at ~1 day out gets exactly one 1-day reminder.
  - Org with status=active is skipped even if trial_ends_at lands in window.
  - Org with status=past_due is skipped (not trialing).
  - Org outside both windows is skipped.
  - send_email is short-circuited via EMAIL_DISABLED so no Resend call fires
    in CI; the cron's _send_reminder still returns True (counts as sent
    for totals purposes — that's the contract).

The cron uses sessionmaker(bind=engine) and opens its own Session, so
these tests rely on db_session committing seed data (it does — see
conftest.py). `now` is injected so we don't have to mock datetime.
"""
from __future__ import annotations

from datetime import datetime, timedelta

import pytest


@pytest.fixture(autouse=True)
def _disable_email(monkeypatch):
    """EMAIL_DISABLED=true: cron logs intent but skips Resend. Counts as
    a successful send (contract: the cron is up, the email infra is the
    side that's down). Tests assert on the counts dict."""
    from config import settings
    monkeypatch.setattr(settings, "EMAIL_DISABLED", True)


def _seed_trialing_org(db_session, *, trial_ends_at: datetime, with_owner: bool = True):
    """Helper: Org with status=trialing + an Owner user (or none).

    A trialing org without an Owner is a malformed state but the cron must
    not crash on it — _send_reminder returns False and the org increments
    the `skipped` counter.
    """
    from models import Organization, User
    from auth import hash_password

    org = Organization(
        name=f"Trial {trial_ends_at.isoformat()}",
        plan="scout",
        status="trialing",
        trial_ends_at=trial_ends_at,
    )
    db_session.add(org)
    db_session.flush()

    if with_owner:
        owner = User(
            org_id=org.id,
            username=f"owner_{org.id}",
            email=f"owner_{org.id}@cron-test.io",
            name="Cron Owner",
            password_hash=hash_password("x"),
            role="owner",
            avatar="C",
            is_active=True,
            email_verified=True,
        )
        db_session.add(owner)

    db_session.commit()
    return org


# ── Window matching ─────────────────────────────────────────────────────────


def test_three_day_window_sends_reminder(db_session):
    """Trial ending 3 days from `now` -> sent_3_day=1."""
    from cron.billing_reminders import send_trial_reminders

    now = datetime.utcnow()
    _seed_trialing_org(db_session, trial_ends_at=now + timedelta(days=3))

    summary = send_trial_reminders(now=now)
    assert summary["sent_3_day"] == 1
    assert summary["sent_1_day"] == 0


def test_one_day_window_sends_reminder(db_session):
    """Trial ending 1 day from `now` -> sent_1_day=1."""
    from cron.billing_reminders import send_trial_reminders

    now = datetime.utcnow()
    _seed_trialing_org(db_session, trial_ends_at=now + timedelta(days=1))

    summary = send_trial_reminders(now=now)
    assert summary["sent_1_day"] == 1
    assert summary["sent_3_day"] == 0


def test_active_org_skipped_even_if_trial_ends_in_window(db_session):
    """status=active orgs never get the reminder, regardless of trial_ends_at."""
    from cron.billing_reminders import send_trial_reminders
    from models import Organization

    now = datetime.utcnow()
    org = Organization(
        name="Already Paid",
        plan="growth",
        status="active",
        trial_ends_at=now + timedelta(days=3),
    )
    db_session.add(org)
    db_session.commit()

    summary = send_trial_reminders(now=now)
    assert summary["sent_3_day"] == 0
    assert summary["sent_1_day"] == 0


def test_past_due_org_skipped(db_session):
    """status=past_due is not trialing — cron skips."""
    from cron.billing_reminders import send_trial_reminders
    from models import Organization

    now = datetime.utcnow()
    org = Organization(
        name="Card Failed",
        plan="growth",
        status="past_due",
        trial_ends_at=now + timedelta(days=3),
    )
    db_session.add(org)
    db_session.commit()

    summary = send_trial_reminders(now=now)
    assert summary["sent_3_day"] == 0


def test_org_outside_windows_not_emailed(db_session):
    """Trial ending 7 days out (between windows) -> nobody gets an email."""
    from cron.billing_reminders import send_trial_reminders

    now = datetime.utcnow()
    _seed_trialing_org(db_session, trial_ends_at=now + timedelta(days=7))

    summary = send_trial_reminders(now=now)
    assert summary["sent_3_day"] == 0
    assert summary["sent_1_day"] == 0


def test_trialing_org_without_owner_is_skipped_not_crashed(db_session):
    """Org with no Owner user -> _send_reminder returns False, counts skipped."""
    from cron.billing_reminders import send_trial_reminders

    now = datetime.utcnow()
    _seed_trialing_org(
        db_session,
        trial_ends_at=now + timedelta(days=3),
        with_owner=False,
    )

    # Must not raise.
    summary = send_trial_reminders(now=now)
    assert summary["sent_3_day"] == 0
    assert summary["skipped"] == 1
