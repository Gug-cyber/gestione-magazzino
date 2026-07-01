"""add indirizzo_spedizione to ordini

Revision ID: 0038
Revises: 0037
Create Date: 2026-07-01
"""
from alembic import op
import sqlalchemy as sa

revision = '0038'
down_revision = '0037'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('ordini', sa.Column('indirizzo_spedizione', sa.String(), nullable=True))


def downgrade():
    op.drop_column('ordini', 'indirizzo_spedizione')
