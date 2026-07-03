"""Extend clienti_account with structured address fields and sync ordini_ecommerce/items_ordine

Revision ID: 0039
Revises: 0038
Create Date: 2026-07-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0039"
down_revision: Union[str, None] = "0038"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
    """Verifica se una colonna esiste già nella tabella."""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c["name"] for c in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    # === clienti_account: aggiungi campi indirizzo strutturato ===
    if not _column_exists("clienti_account", "numero_civico"):
        op.add_column("clienti_account", sa.Column("numero_civico", sa.String(20), nullable=True))

    if not _column_exists("clienti_account", "paese"):
        op.add_column("clienti_account", sa.Column("paese", sa.String(100), nullable=True, server_default="Italia"))

    if not _column_exists("clienti_account", "indirizzo_nome_destinatario"):
        op.add_column("clienti_account", sa.Column("indirizzo_nome_destinatario", sa.String(100), nullable=True))

    if not _column_exists("clienti_account", "indirizzo_cognome_destinatario"):
        op.add_column("clienti_account", sa.Column("indirizzo_cognome_destinatario", sa.String(100), nullable=True))

    # === ordini_ecommerce: sincronizza con DB (già presenti in 0037, ma modello ORM non li aveva) ===
    if not _column_exists("ordini_ecommerce", "subtotale"):
        op.add_column("ordini_ecommerce", sa.Column("subtotale", sa.Float(), nullable=True, server_default="0.0"))

    if not _column_exists("ordini_ecommerce", "spese_spedizione"):
        op.add_column("ordini_ecommerce", sa.Column("spese_spedizione", sa.Float(), nullable=True, server_default="0.0"))

    if not _column_exists("ordini_ecommerce", "metodo_pagamento"):
        op.add_column("ordini_ecommerce", sa.Column("metodo_pagamento", sa.String(50), nullable=True))

    if not _column_exists("ordini_ecommerce", "corriere"):
        op.add_column("ordini_ecommerce", sa.Column("corriere", sa.String(100), nullable=True))

    if not _column_exists("ordini_ecommerce", "tracking_number"):
        op.add_column("ordini_ecommerce", sa.Column("tracking_number", sa.String(100), nullable=True))

    if not _column_exists("ordini_ecommerce", "data_stimata_consegna"):
        op.add_column("ordini_ecommerce", sa.Column("data_stimata_consegna", sa.DateTime(), nullable=True))

    # === items_ordine: aggiungi subtotale ===
    if not _column_exists("items_ordine", "subtotale"):
        op.add_column("items_ordine", sa.Column("subtotale", sa.Float(), nullable=True))


def downgrade() -> None:
    # items_ordine
    if _column_exists("items_ordine", "subtotale"):
        op.drop_column("items_ordine", "subtotale")

    # ordini_ecommerce
    for col in ["data_stimata_consegna", "tracking_number", "corriere", "metodo_pagamento", "spese_spedizione", "subtotale"]:
        if _column_exists("ordini_ecommerce", col):
            op.drop_column("ordini_ecommerce", col)

    # clienti_account
    for col in ["indirizzo_cognome_destinatario", "indirizzo_nome_destinatario", "paese", "numero_civico"]:
        if _column_exists("clienti_account", col):
            op.drop_column("clienti_account", col)
