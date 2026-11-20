"""PEC per Iron Segnaletica e Iron Wood — usata via intermediario (Aruba) al posto del codice destinatario SDI

Mauri: niente codice destinatario, la trasmissione della Fatturazione
Elettronica passa da Aruba — serve solo la PEC. Come già per la
correzione dati fiscali di Iron Wood (c1d2e3f4a5b6): seed.py da solo
non aggiorna una riga Company già creata su un ambiente dove
`flask seed` è già girato, quindi anche qui serve una migration che
corregga i dati esistenti, non solo il file sorgente.

Revision ID: d3e4f5a6b7c8
Revises: c1d2e3f4a5b6
Create Date: 2026-08-18 11:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'd3e4f5a6b7c8'
down_revision = 'c1d2e3f4a5b6'
branch_labels = None
depends_on = None


def upgrade():
    b = op.get_bind()
    b.execute(sa.text("UPDATE companies SET pec_destinatario=:pec WHERE code='IRSE'"),
             {"pec": "ironsegnaletica@pec.it"})
    b.execute(sa.text("UPDATE companies SET pec_destinatario=:pec WHERE code='IRWD'"),
             {"pec": "pec@pec.ironwoodpg.it"})


def downgrade():
    pass
