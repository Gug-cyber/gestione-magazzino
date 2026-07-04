"""add spese_spedizione and metodo_pagamento to ordini

Revision ID: 0040
Revises: 0039
Create Date: 2026-07-04
"""
from alembic import op
import sqlalchemy as sa

revision = '0040'
down_revision = '0039'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('ordini', sa.Column('spese_spedizione', sa.Float(), nullable=True, server_default='0'))
    op.add_column('ordini', sa.Column('metodo_pagamento', sa.String(), nullable=True))


def downgrade():
    op.drop_column('ordini', 'metodo_pagamento')
    op.drop_column('ordini', 'spese_spedizione')
