"""DDT/EM multi-ordine: Delivery.order_id e GoodsReceipt.po_id nullable

Un DDT può ora coprire righe di più Ordini Cliente diversi (stesso
cliente), e un'Entrata Merci righe di più Ordini d'Acquisto diversi
(stesso fornitore) — la relazione autorevole vive sempre a livello di
riga (DeliveryLine.sales_order_line_id, GoodsReceiptLine.po_line_id, già
presenti prima di questa migration), order_id/po_id restano solo come
riferimento al primo ordine scelto, per compatibilità con stampe/
riferimenti legacy che assumevano un solo ordine.

Nota: come nelle migration precedenti, l'autogenerate segnala anche il
drop di 'vendors'/'customers' — drift preesistente indipendente, escluso
di proposito da questa migration.

Revision ID: 637c4e567d3b
Revises: 2085b667accc
Create Date: 2026-08-17 21:20:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '637c4e567d3b'
down_revision = '2085b667accc'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('deliveries', schema=None) as batch_op:
        batch_op.alter_column('order_id', existing_type=sa.INTEGER(), nullable=True)
    with op.batch_alter_table('goods_receipts', schema=None) as batch_op:
        batch_op.alter_column('po_id', existing_type=sa.INTEGER(), nullable=True)


def downgrade():
    with op.batch_alter_table('goods_receipts', schema=None) as batch_op:
        batch_op.alter_column('po_id', existing_type=sa.INTEGER(), nullable=False)
    with op.batch_alter_table('deliveries', schema=None) as batch_op:
        batch_op.alter_column('order_id', existing_type=sa.INTEGER(), nullable=False)
