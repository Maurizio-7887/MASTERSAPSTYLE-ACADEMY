"""Asset.cost_center_id: ammortamento raggruppato per ASA

Un cespite (macchinario) appartiene a un Centro di Costo/Ricavo (ASA):
la scrittura di ammortamento mensile (assets.depreciation) ora genera una
riga Dare per ogni ASA coinvolta invece di un'unica riga aggregata su
tutti i cespiti — altrimenti l'ammortamento di una saldatrice (Saldatura
Conto Terzi) e di un macchinario di Carpenteria finirebbero mescolati,
vanificando il margine per ASA.

Nota: come nelle migration precedenti, l'autogenerate segnala anche il
drop di 'vendors'/'customers' — drift preesistente indipendente, escluso
di proposito da questa migration.

Revision ID: aeac8afdd5bd
Revises: 57c7f6204af3
Create Date: 2026-08-17 20:25:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'aeac8afdd5bd'
down_revision = '57c7f6204af3'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('assets', schema=None) as batch_op:
        batch_op.add_column(sa.Column('cost_center_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_assets_cost_center_id', 'cost_centers', ['cost_center_id'], ['id'])


def downgrade():
    with op.batch_alter_table('assets', schema=None) as batch_op:
        batch_op.drop_constraint('fk_assets_cost_center_id', type_='foreignkey')
        batch_op.drop_column('cost_center_id')
