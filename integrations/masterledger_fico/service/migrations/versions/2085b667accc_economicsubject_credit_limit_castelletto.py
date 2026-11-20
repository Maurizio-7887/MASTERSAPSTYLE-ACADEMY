"""EconomicSubject.credit_limit (castelletto)

Limite di esposizione dato dal fornitore/cliente stesso o stimato
internamente. Confrontato con l'esposizione totale (ordini aperti +
fatture non pagate/incassate, vedi services/castelletto.py) alla
creazione di un nuovo Ordine Fornitore/Cliente — blocca con richiesta di
conferma esplicita se lo supera. NULL = nessun limite, nessun controllo.

Nota: come nelle migration precedenti, l'autogenerate segnala anche il
drop di 'vendors'/'customers' — drift preesistente indipendente, escluso
di proposito da questa migration.

Revision ID: 2085b667accc
Revises: aeac8afdd5bd
Create Date: 2026-08-17 21:05:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '2085b667accc'
down_revision = 'aeac8afdd5bd'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('economic_subjects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('credit_limit', sa.Numeric(precision=14, scale=2), nullable=True))


def downgrade():
    with op.batch_alter_table('economic_subjects', schema=None) as batch_op:
        batch_op.drop_column('credit_limit')
