"""fix_client_pnl_year: delete BUG-11 corrupt rows (year < 2000)

Revision ID: 0011_fix_client_pnl_year
Revises: 0010_password_policy
Create Date: 2026-05-14

BUG-11: backend/client_pnl.py's create handler used to derive `year`
from int(month.split('-')[0]). When the frontend (or a direct curl)
sent month="5" instead of the expected "2026-05" wire format, the
year was stored as 5 — every such record is permanently misattributed.

The UX test (2026-05-13) created exactly one such row (id=1, year=5)
on prod. There is no business value in trying to reconstruct the
intended year from a record whose month was already garbled; safer
to delete and let the user re-enter.

Heuristic: year < 2000 cannot be a real Amazon P&L (Amazon Marketplace
launched in 1999, and no customer is filing P&Ls against pre-2000
periods). Anything in that range came from the bug.

Forward-compat: the create handler now requires year >= 2000 via
Pydantic Field bounds, so no new corrupt rows can land.
"""
from __future__ import annotations

import logging

import sqlalchemy as sa
from alembic import op


revision = "0011_fix_client_pnl_year"
down_revision = "0010_password_policy"
branch_labels = None
depends_on = None

log = logging.getLogger("alembic.runtime.migration")


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(sa.text(
        "SELECT id, org_id, client_id, month, year FROM client_pnl WHERE year < 2000;"
    )).fetchall()
    if rows:
        log.warning(
            "0011_fix_client_pnl_year: deleting %d corrupt client_pnl row(s): %s",
            len(rows),
            [{"id": r[0], "client_id": r[2], "month": r[3], "year": r[4]} for r in rows],
        )
    conn.execute(sa.text("DELETE FROM client_pnl WHERE year < 2000;"))


def downgrade() -> None:
    # Irreversible by design — deleted rows had garbled year/month with
    # no reconstruction path for the user's intended period.
    pass
