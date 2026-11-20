"""Rimosso EconomicSubject.revenue_channel: Iron Segnaletica ha un conto ricavi unico

Iron Segnaletica non fa subappalti né affidamenti diretti stile appaltatore
(al massimo giornate di gestione apertura/chiusura cantiere, fatturate
normalmente da preventivo) — la distinzione a due canali (conti 4000/4001)
era specifica del modello di business di Iron Appalti. Il ricavo va ora
sempre sul conto unico 4000 "Ricavi di Vendita Prodotti".

Nota: come nelle migration precedenti, l'autogenerate segnala anche il
drop di 'vendors'/'customers' — drift preesistente indipendente, escluso
di proposito da questa migration (vedi nota in fdc29926441f).

Revision ID: 293982e5361c
Revises: bc7645de9f4c
Create Date: 2026-08-17 20:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '293982e5361c'
down_revision = 'bc7645de9f4c'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('economic_subjects', schema=None) as batch_op:
        batch_op.drop_column('revenue_channel')


def downgrade():
    with op.batch_alter_table('economic_subjects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('revenue_channel', sa.String(length=20), nullable=True))
