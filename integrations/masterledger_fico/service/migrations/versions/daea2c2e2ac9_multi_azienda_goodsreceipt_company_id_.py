"""Multi-azienda: GoodsReceipt.company_id per EM separata per azienda

Il ciclo passivo (RFQ -> Ordini d'acquisto -> Entrata Merci) va tenuto
completo dentro ogni riquadro azienda, esattamente come il ciclo attivo
(Preventivi -> Ordini Cliente -> DDT) — mancava proprio l'Entrata Merci.
Nullable per compatibilità con le Entrate Merci già esistenti.

Nota: come nelle migration precedenti, l'autogenerate segnala anche
index/FK di journal_entries/journal_lines — drift preesistente
indipendente, escluso di proposito da questa migration.

Revision ID: daea2c2e2ac9
Revises: 52ad101173dc
Create Date: 2026-08-18 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'daea2c2e2ac9'
down_revision = '52ad101173dc'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('goods_receipts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('company_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_goods_receipts_company_id', 'companies', ['company_id'], ['id'])


def downgrade():
    with op.batch_alter_table('goods_receipts', schema=None) as batch_op:
        batch_op.drop_constraint('fk_goods_receipts_company_id', type_='foreignkey')
        batch_op.drop_column('company_id')
