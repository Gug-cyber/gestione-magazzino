"""add_totp_fields_to_utenti

Revision ID: 0035
Revises: 0034
Create Date: 2026-05-23
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0035"
down_revision: Union[str, None] = "0034"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_cols = [c["name"] for c in inspector.get_columns("utenti")]

    if "totp_secret" not in existing_cols:
        op.add_column("utenti", sa.Column("totp_secret", sa.String(length=255), nullable=True))

    if "totp_enabled" not in existing_cols:
        op.add_column(
            "utenti",
            sa.Column("totp_enabled", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        )
        op.execute(sa.text("UPDATE utenti SET totp_enabled = FALSE WHERE totp_enabled IS NULL"))
        op.alter_column("utenti", "totp_enabled", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_cols = [c["name"] for c in inspector.get_columns("utenti")]

    if "totp_enabled" in existing_cols:
        op.drop_column("utenti", "totp_enabled")
    if "totp_secret" in existing_cols:
        op.drop_column("utenti", "totp_secret")
