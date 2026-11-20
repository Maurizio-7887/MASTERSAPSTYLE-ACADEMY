"""ASA: CostCenter.revenue_account_id, Material.revenue_center_id, conto 4010

Ricavi segmentati per ASA (linea di business) tramite Centro di
Costo/Ricavo invece che per conto — coerente con come SAP separa il piano
dei conti (stabile, poche voci) dalla profittabilità analitica (Centro di
Costo/Ricavo, estensibile senza mai toccare il bilancio):
  - cost_centers.revenue_account_id: il conto ricavi associato a un centro
    usato come ASA (NULL per i centri di solo costo).
  - materials.revenue_center_id: l'ASA di un articolo/servizio venduto.
  - Conto 4010 "Ricavi Prestazioni di Servizi" aggiunto accanto al 4000
    "Ricavi Vendita Prodotti" (rinominato da "Ricavi di Vendita Prodotti"
    impostato dalla migration precedente 4a1b2c3d4e5f) — distinzione
    voluta dal bilancio civilistico (beni vs prestazioni).

Nota: come nelle migration precedenti, l'autogenerate segnala anche il
drop di 'vendors'/'customers' — drift preesistente indipendente, escluso
di proposito da questa migration.

Revision ID: 57c7f6204af3
Revises: 4a1b2c3d4e5f
Create Date: 2026-08-17 20:14:00.876543

"""
from alembic import op
import sqlalchemy as sa

revision = '57c7f6204af3'
down_revision = '4a1b2c3d4e5f'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('cost_centers', schema=None) as batch_op:
        batch_op.add_column(sa.Column('revenue_account_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_cost_centers_revenue_account_id', 'accounts', ['revenue_account_id'], ['id'])

    with op.batch_alter_table('materials', schema=None) as batch_op:
        batch_op.add_column(sa.Column('revenue_center_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_materials_revenue_center_id', 'cost_centers', ['revenue_center_id'], ['id'])

    b = op.get_bind()
    b.execute(sa.text(
        "UPDATE accounts SET name=:n WHERE code=:c AND name != :n"
    ), {"c": "4000", "n": "Ricavi Vendita Prodotti"})
    if not b.execute(sa.text("SELECT 1 FROM accounts WHERE code=:c"), {"c": "4010"}).fetchone():
        b.execute(sa.text(
            "INSERT INTO accounts (code, name, account_type, cost_relevant, cost_relevant_type, active) "
            "VALUES (:c, :n, :t, :r, :rt, true)"
        ), {"c": "4010", "n": "Ricavi Prestazioni di Servizi",
            "t": "ricavo", "r": True, "rt": "REVENUE"})


def downgrade():
    with op.batch_alter_table('materials', schema=None) as batch_op:
        batch_op.drop_constraint('fk_materials_revenue_center_id', type_='foreignkey')
        batch_op.drop_column('revenue_center_id')
    with op.batch_alter_table('cost_centers', schema=None) as batch_op:
        batch_op.drop_constraint('fk_cost_centers_revenue_account_id', type_='foreignkey')
        batch_op.drop_column('revenue_account_id')
