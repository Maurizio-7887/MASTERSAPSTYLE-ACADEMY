"""Campo Material.purchase_destination (wms/iron_production) per instradare l'Entrata Merci

Decide dove va instradato il carico quando MasterLedger registra un'Entrata
Merci per un articolo: 'wms' (MasterLogistic-WMS, materiali di rivendita) o
'iron_production' (officina interna — ferro per lavorazioni, filo di
saldatura, DPI). NULL = non ancora classificato, l'Entrata Merci blocca con
un errore chiaro invece di instradare a caso.

Nota: come nelle migration precedenti (fdc29926441f, 3860278ebd05),
l'autogenerate segnala anche il drop di 'vendors'/'customers' — drift
preesistente indipendente, escluso di proposito da questa migration.

Revision ID: bc7645de9f4c
Revises: 3860278ebd05
Create Date: 2026-08-17 19:55:34.672279

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bc7645de9f4c'
down_revision = '3860278ebd05'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('materials', schema=None) as batch_op:
        batch_op.add_column(sa.Column('purchase_destination', sa.String(length=20), nullable=True))


def downgrade():
    with op.batch_alter_table('materials', schema=None) as batch_op:
        batch_op.drop_column('purchase_destination')
