"""Conto ricavi unico per Iron Segnaletica: 4000 rinominato, 4001 rimosso

Corregge quanto inserito dalla vecchia migration g1h2i3j4k5l6 (scritta per
Iron Appalti, subappalto/affidamento diretto — non applicabile a Iron
Segnaletica, che fattura normalmente da preventivo). Upsert idempotente
sullo stesso pattern già usato in quella migration:
  - 4000 rinominato in "Ricavi di Vendita Prodotti" (resta lo stesso conto,
    stesso codice — nessuna scrittura contabile esistente viene toccata).
  - 4001 eliminato SOLO se non ha mai registrato nessuna scrittura
    (journal_lines) — altrimenti solo disattivato, per non rompere
    l'integrità di un eventuale storico reale già presente.

Revision ID: 4a1b2c3d4e5f
Revises: 293982e5361c
Create Date: 2026-08-17 20:10:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '4a1b2c3d4e5f'
down_revision = '293982e5361c'
branch_labels = None
depends_on = None


def upgrade():
    b = op.get_bind()

    b.execute(sa.text(
        "UPDATE accounts SET name=:n WHERE code=:c AND name != :n"
    ), {"c": "4000", "n": "Ricavi di Vendita Prodotti"})

    riga_4001 = b.execute(sa.text("SELECT id FROM accounts WHERE code=:c"), {"c": "4001"}).fetchone()
    if riga_4001:
        account_id_4001 = riga_4001[0]
        usato = b.execute(sa.text(
            "SELECT 1 FROM journal_lines WHERE account_id=:aid LIMIT 1"
        ), {"aid": account_id_4001}).fetchone()
        if usato:
            b.execute(sa.text("UPDATE accounts SET active=false WHERE id=:aid"), {"aid": account_id_4001})
        else:
            b.execute(sa.text("DELETE FROM accounts WHERE id=:aid"), {"aid": account_id_4001})


def downgrade():
    pass
