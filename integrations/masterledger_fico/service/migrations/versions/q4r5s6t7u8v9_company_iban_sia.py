"""Company: iban e codice_sia_cbi — dati banca necessari in testata del
flusso Ri.Ba. CBI (services/riba_cbi.py)

Revision ID: q4r5s6t7u8v9
Revises: p3q4r5s6t7u8
Create Date: 2026-08-21
"""
from alembic import op
import sqlalchemy as sa

revision = "q4r5s6t7u8v9"
down_revision = "p3q4r5s6t7u8"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("companies", schema=None) as batch_op:
        batch_op.add_column(sa.Column("iban", sa.String(34), nullable=True))
        batch_op.add_column(sa.Column("codice_sia_cbi", sa.String(10), nullable=True))


def downgrade():
    with op.batch_alter_table("companies", schema=None) as batch_op:
        batch_op.drop_column("codice_sia_cbi")
        batch_op.drop_column("iban")
