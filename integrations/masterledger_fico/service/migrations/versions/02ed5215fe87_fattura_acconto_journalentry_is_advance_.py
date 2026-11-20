"""Fattura Acconto: JournalEntry.is_advance_invoice, tabella CustomerAdvanceInvoice

Fattura d'Anticipo/Acconto (TD02) — emessa su un Ordine Cliente aperto
PRIMA della consegna, per le commesse custom dove si chiede un anticipo
prima di iniziare.

Nota: come nelle migration precedenti, l'autogenerate segnala anche il
drop di 'vendors'/'customers' e index/FK di journal_entries/journal_lines
— drift preesistente indipendente, escluso di proposito da questa
migration.

Revision ID: 02ed5215fe87
Revises: d9f8d5f505e7
Create Date: 2026-08-18 16:08:16.753671

"""
from alembic import op
import sqlalchemy as sa

revision = '02ed5215fe87'
down_revision = 'd9f8d5f505e7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('customer_advance_invoices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sales_order_id', sa.Integer(), nullable=False),
        sa.Column('entry_id', sa.Integer(), nullable=False),
        sa.Column('net_amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('vat_amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['entry_id'], ['journal_entries.id']),
        sa.ForeignKeyConstraint(['sales_order_id'], ['sales_orders.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('journal_entries', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_advance_invoice', sa.Boolean(), nullable=False, server_default='0'))


def downgrade():
    with op.batch_alter_table('journal_entries', schema=None) as batch_op:
        batch_op.drop_column('is_advance_invoice')
    op.drop_table('customer_advance_invoices')
