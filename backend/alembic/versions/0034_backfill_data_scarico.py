"""backfill_data_scarico

Revision ID: 0034
Revises: 0033
Create Date: 2026-05-22

Retroattività per la migration 0033: imposta `data_scarico = NOW()` su tutti i
prodotti che hanno già `quantita = 0` e `data_scarico IS NULL`, in modo che lo
scheduler di pulizia automatica li consideri candidati alla cancellazione dopo
10 giorni dal deploy.

La migration è idempotente: non sovrascrive `data_scarico` se già impostato.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0034"
down_revision: Union[str, None] = "0033"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # Dialect-aware: SQLite non supporta NOW(), usa CURRENT_TIMESTAMP
    if bind.dialect.name == "sqlite":
        now_expr = "CURRENT_TIMESTAMP"
    else:
        now_expr = "NOW()"

    op.execute(
        sa.text(
            f"UPDATE prodotti SET data_scarico = {now_expr} "
            "WHERE quantita = 0 AND data_scarico IS NULL"
        )
    )


def downgrade() -> None:
    # Best-effort: azzera data_scarico per i prodotti ancora a zero stock
    # (ripristina lo stato precedente alla migration per i prodotti non ancora
    # cancellati dallo scheduler)
    op.execute(
        sa.text(
            "UPDATE prodotti SET data_scarico = NULL "
            "WHERE quantita = 0"
        )
    )
