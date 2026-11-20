"""Multi-azienda: Delivery.company_id per DDT separati per azienda

Ogni azienda (Iron Segnaletica, Iron Wood) fa i propri DDT — stesso
principio già applicato a Preventivi/Ordini Cliente/RFQ/Ordini Fornitore.
Nullable per compatibilità con i DDT già esistenti.

Nota: come nelle migration precedenti, l'autogenerate segnala anche
index/FK di journal_entries/journal_lines — drift preesistente
indipendente, escluso di proposito da questa migration.

Revision ID: 52ad101173dc
Revises: d3e4f5a6b7c8
Create Date: 2026-08-18 11:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '52ad101173dc'
down_revision = 'd3e4f5a6b7c8'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('deliveries', schema=None) as batch_op:
        batch_op.add_column(sa.Column('company_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_deliveries_company_id', 'companies', ['company_id'], ['id'])


def downgrade():
    with op.batch_alter_table('deliveries', schema=None) as batch_op:
        batch_op.drop_constraint('fk_deliveries_company_id', type_='foreignkey')
        batch_op.drop_column('company_id')
