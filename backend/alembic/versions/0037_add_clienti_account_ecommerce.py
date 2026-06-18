"""add clienti_account, ordini_ecommerce, righe_ordine_ecommerce, preferiti tables

Revision ID: 0037
Revises: 0036
Create Date: 2026-06-18 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0037"
down_revision: Union[str, None] = "0036"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create clienti_account table
    op.create_table(
        "clienti_account",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("cognome", sa.String(), nullable=False),
        sa.Column("telefono", sa.String(), nullable=True),
        sa.Column("indirizzo", sa.String(), nullable=True),
        sa.Column("citta", sa.String(), nullable=True),
        sa.Column("cap", sa.String(), nullable=True),
        sa.Column("provincia", sa.String(), nullable=True),
        sa.Column("paese", sa.String(), server_default="Italia", nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=True),
        sa.Column("is_verified", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_clienti_account_id"), "clienti_account", ["id"], unique=False)
    op.create_index(op.f("ix_clienti_account_email"), "clienti_account", ["email"], unique=True)

    # Create ordini_ecommerce table
    op.create_table(
        "ordini_ecommerce",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("numero_ordine", sa.String(), nullable=False),
        sa.Column("cliente_id", sa.Integer(), nullable=False),
        sa.Column("stato", sa.Enum(
            "in_attesa", "confermato", "in_lavorazione", "spedito",
            "consegnato", "annullato", "reso_richiesto", "reso_approvato",
            "reso_completato", "rimborsato",
            name="statoordineecommerce"
        ), server_default="in_attesa", nullable=False),
        sa.Column("totale", sa.Float(), server_default="0.0", nullable=True),
        sa.Column("subtotale", sa.Float(), server_default="0.0", nullable=True),
        sa.Column("spese_spedizione", sa.Float(), server_default="0.0", nullable=True),
        sa.Column("metodo_pagamento", sa.String(), nullable=True),
        sa.Column("indirizzo_spedizione", sa.Text(), nullable=True),
        sa.Column("corriere", sa.String(), nullable=True),
        sa.Column("tracking_number", sa.String(), nullable=True),
        sa.Column("data_ordine", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("data_spedizione", sa.DateTime(timezone=True), nullable=True),
        sa.Column("data_consegna", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reso_richiesto_il", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reso_motivo", sa.Text(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["cliente_id"], ["clienti_account.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ordini_ecommerce_id"), "ordini_ecommerce", ["id"], unique=False)
    op.create_index(op.f("ix_ordini_ecommerce_numero_ordine"), "ordini_ecommerce", ["numero_ordine"], unique=True)

    # Create righe_ordine_ecommerce table
    op.create_table(
        "righe_ordine_ecommerce",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ordine_id", sa.Integer(), nullable=False),
        sa.Column("prodotto_id", sa.Integer(), nullable=True),
        sa.Column("nome_prodotto", sa.String(), nullable=False),
        sa.Column("immagine_url", sa.String(), nullable=True),
        sa.Column("quantita", sa.Integer(), server_default="1", nullable=False),
        sa.Column("prezzo_unitario", sa.Float(), nullable=False),
        sa.Column("subtotale", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["ordine_id"], ["ordini_ecommerce.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_righe_ordine_ecommerce_id"), "righe_ordine_ecommerce", ["id"], unique=False)

    # Create preferiti table
    op.create_table(
        "preferiti",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cliente_id", sa.Integer(), nullable=False),
        sa.Column("prodotto_id", sa.Integer(), nullable=False),
        sa.Column("nome_prodotto", sa.String(), nullable=True),
        sa.Column("immagine_url", sa.String(), nullable=True),
        sa.Column("prezzo", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["cliente_id"], ["clienti_account.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_preferiti_id"), "preferiti", ["id"], unique=False)


def downgrade() -> None:
    op.drop_table("preferiti")
    op.drop_table("righe_ordine_ecommerce")
    op.drop_table("ordini_ecommerce")
    op.drop_table("clienti_account")
    op.execute("DROP TYPE IF EXISTS statoordineecommerce")