"""Multi-azienda Fase 2: company_id su Preventivi, Ordini Cliente, RFQ, Ordini Fornitore

Le 4 tipologie di documento che Maria Grazia emette sia per Iron
Segnaletica che per Iron Wood (Preventivi, Ordini Cliente, RFQ, Ordini
Fornitore) sono ora taggabili per azienda. Nullable per compatibilità
con i documenti già esistenti (creati prima di questa fase, tutti
impliciti Iron Segnaletica).

Nota: come nelle migration precedenti, l'autogenerate segnala anche il
drop di 'vendors'/'customers' e index/FK di journal_entries/journal_lines
— drift preesistente indipendente, escluso di proposito da questa
migration.

Revision ID: b0d45f058dc9
Revises: 0d51f4f42b5e
Create Date: 2026-08-18 10:20:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'b0d45f058dc9'
down_revision = '0d51f4f42b5e'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('quotations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('company_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_quotations_company_id', 'companies', ['company_id'], ['id'])
    with op.batch_alter_table('sales_orders', schema=None) as batch_op:
        batch_op.add_column(sa.Column('company_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_sales_orders_company_id', 'companies', ['company_id'], ['id'])
    with op.batch_alter_table('purchase_orders', schema=None) as batch_op:
        batch_op.add_column(sa.Column('company_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_purchase_orders_company_id', 'companies', ['company_id'], ['id'])
    with op.batch_alter_table('requests_for_quotation', schema=None) as batch_op:
        batch_op.add_column(sa.Column('company_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_requests_for_quotation_company_id', 'companies', ['company_id'], ['id'])


def downgrade():
    with op.batch_alter_table('requests_for_quotation', schema=None) as batch_op:
        batch_op.drop_constraint('fk_requests_for_quotation_company_id', type_='foreignkey')
        batch_op.drop_column('company_id')
    with op.batch_alter_table('purchase_orders', schema=None) as batch_op:
        batch_op.drop_constraint('fk_purchase_orders_company_id', type_='foreignkey')
        batch_op.drop_column('company_id')
    with op.batch_alter_table('sales_orders', schema=None) as batch_op:
        batch_op.drop_constraint('fk_sales_orders_company_id', type_='foreignkey')
        batch_op.drop_column('company_id')
    with op.batch_alter_table('quotations', schema=None) as batch_op:
        batch_op.drop_constraint('fk_quotations_company_id', type_='foreignkey')
        batch_op.drop_column('company_id')
