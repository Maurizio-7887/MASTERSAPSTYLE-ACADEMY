"""Dual Portal: campo User.portal (desk/ledger)

Aggiunge users.portal ('desk' | 'ledger'), con default 'ledger' — gli
utenti già esistenti (es. Angelo, Maurizio) restano nel portale
Amministrazione senza bisogno di intervento manuale dopo il deploy.

Nota: come nella migration precedente (fdc29926441f), l'autogenerate
segnala anche il drop di 'vendors'/'customers' e delle colonne
journal_entries.customer_id/vendor_id — drift preesistente indipendente,
escluso di proposito da questa migration (vedi nota in fdc29926441f).

Revision ID: 3860278ebd05
Revises: fdc29926441f
Create Date: 2026-08-17 15:12:33.411352

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3860278ebd05'
down_revision = 'fdc29926441f'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('portal', sa.String(length=10), nullable=False,
                                       server_default='ledger'))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('portal')
