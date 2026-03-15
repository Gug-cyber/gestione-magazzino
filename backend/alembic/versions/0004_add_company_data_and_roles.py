"""add_company_data_and_roles

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-15 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add ruolo column to utenti
    op.add_column(
        "utenti",
        sa.Column("ruolo", sa.String(20), nullable=True, server_default="operatore"),
    )
    # Backfill: set ruolo='admin' for existing admins
    op.execute("UPDATE utenti SET ruolo = 'admin' WHERE is_admin = TRUE")
    op.execute("UPDATE utenti SET ruolo = 'operatore' WHERE ruolo IS NULL")

    # Create dati_azienda table
    op.create_table(
        "dati_azienda",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ragione_sociale", sa.String(255), nullable=False),
        sa.Column("partita_iva", sa.String(20), nullable=False),
        sa.Column("codice_fiscale", sa.String(20), nullable=True),
        sa.Column("indirizzo", sa.String(255), nullable=True),
        sa.Column("citta", sa.String(100), nullable=True),
        sa.Column("cap", sa.String(10), nullable=True),
        sa.Column("provincia", sa.String(2), nullable=True),
        sa.Column("nazione", sa.String(100), nullable=True, server_default="Italia"),
        sa.Column("telefono", sa.String(50), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("pec", sa.String(255), nullable=True),
        sa.Column("sito_web", sa.String(255), nullable=True),
        sa.Column("iban", sa.String(50), nullable=True),
        sa.Column("codice_sdi", sa.String(10), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_dati_azienda_id", "dati_azienda", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_dati_azienda_id", table_name="dati_azienda")
    op.drop_table("dati_azienda")
    op.drop_column("utenti", "ruolo")
