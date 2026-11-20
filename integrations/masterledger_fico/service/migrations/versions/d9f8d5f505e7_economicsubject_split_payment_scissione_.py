"""EconomicSubject.split_payment — Scissione dei Pagamenti per clienti PA

Determina il codice EsigibilitaIVA nell'XML FatturaPA (S invece di I) —
obbligatorio per le fatture verso Pubblica Amministrazione (Comuni, enti
pubblici). Default false, nessuna rottura per i clienti esistenti.

Nota: come nelle migration precedenti, l'autogenerate segnala anche
index/FK di journal_entries/journal_lines — drift preesistente
indipendente, escluso di proposito da questa migration.

Revision ID: d9f8d5f505e7
Revises: 85a8be5971ae
Create Date: 2026-08-18 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'd9f8d5f505e7'
down_revision = '85a8be5971ae'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('economic_subjects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('split_payment', sa.Boolean(), nullable=False, server_default='0'))


def downgrade():
    with op.batch_alter_table('economic_subjects', schema=None) as batch_op:
        batch_op.drop_column('split_payment')
