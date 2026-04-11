"""add store_settings table

Revision ID: 0016
Revises: 0015
Create Date: 2026-04-10 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    if "store_settings" not in inspector.get_table_names():
        op.create_table(
            "store_settings",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("store_nome", sa.String(100), nullable=True, server_default="TCG Store"),
            sa.Column("store_logo_url", sa.String(500), nullable=True),
            sa.Column("spedizione_ritiro_abilitato", sa.Boolean(), nullable=True, server_default=sa.text("true")),
            sa.Column("spedizione_ritiro_costo", sa.Float(), nullable=True, server_default="0.0"),
            sa.Column("spedizione_ritiro_giorni", sa.String(50), nullable=True, server_default="Immediato"),
            sa.Column("spedizione_standard_abilitato", sa.Boolean(), nullable=True, server_default=sa.text("true")),
            sa.Column("spedizione_standard_costo", sa.Float(), nullable=True, server_default="4.90"),
            sa.Column("spedizione_standard_giorni", sa.String(50), nullable=True, server_default="3-5 giorni lavorativi"),
            sa.Column("spedizione_express_abilitato", sa.Boolean(), nullable=True, server_default=sa.text("true")),
            sa.Column("spedizione_express_costo", sa.Float(), nullable=True, server_default="9.90"),
            sa.Column("spedizione_express_giorni", sa.String(50), nullable=True, server_default="1-2 giorni lavorativi"),
            sa.Column("pagamento_carta_abilitato", sa.Boolean(), nullable=True, server_default=sa.text("true")),
            sa.Column("pagamento_paypal_abilitato", sa.Boolean(), nullable=True, server_default=sa.text("true")),
            sa.Column("pagamento_apple_pay_abilitato", sa.Boolean(), nullable=True, server_default=sa.text("true")),
            sa.Column("pagamento_google_pay_abilitato", sa.Boolean(), nullable=True, server_default=sa.text("true")),
            sa.Column("pagamento_negozio_abilitato", sa.Boolean(), nullable=True, server_default=sa.text("true")),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_store_settings_id", "store_settings", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_store_settings_id", table_name="store_settings")
    op.drop_table("store_settings")
