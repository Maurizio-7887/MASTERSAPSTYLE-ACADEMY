"""Material.custom_cost_account_id — Voce di Costo override, opzionale

Il conto "Dare" all'Entrata Merci/Uscita Merci è oggi automatico ma
rigido (TYPE_ACCOUNTS: un conto fisso per tipo articolo ROH/HALB/FERT).
Questo campo, quando valorizzato, vince su quello automatico per un
articolo specifico — quando vuoto (il caso normale), nessuna rottura per
gli articoli esistenti: comportamento identico a prima.

Nota: come nelle migration precedenti, l'autogenerate segnala anche
index/FK di journal_entries/journal_lines — drift preesistente
indipendente, escluso di proposito da questa migration.

Revision ID: 85a8be5971ae
Revises: daea2c2e2ac9
Create Date: 2026-08-18 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '85a8be5971ae'
down_revision = 'daea2c2e2ac9'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('materials', schema=None) as batch_op:
        batch_op.add_column(sa.Column('custom_cost_account_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_materials_custom_cost_account_id', 'accounts', ['custom_cost_account_id'], ['id'])


def downgrade():
    with op.batch_alter_table('materials', schema=None) as batch_op:
        batch_op.drop_constraint('fk_materials_custom_cost_account_id', type_='foreignkey')
        batch_op.drop_column('custom_cost_account_id')
