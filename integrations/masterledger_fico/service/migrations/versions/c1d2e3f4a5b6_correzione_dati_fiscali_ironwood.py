"""Correzione dati fiscali Iron Wood: dati veri da Zucchetti (Ironwood Srls)

Come già successo con i conti 4000/4001 (migration 4a1b2c3d4e5f): la sola
modifica a seed.py non aggiorna una riga già creata su un ambiente dove
`flask seed` è già girato con il placeholder — seed.py crea solo se la
riga non esiste. Questa migration corregge i dati anagrafici di Iron Wood
con quelli reali forniti da Mauri (screenshot Zucchetti "Dati azienda"):
  Ragione sociale: Ironwood Srls
  Indirizzo: Strada Tiberina Nord, 483 — 06134 Perugia (PG)
  P.IVA / Codice Fiscale: 03614490542

Ancora mancanti (non visibili in quello screenshot, restano segnaposto
finché non arrivano): codice destinatario SDI, PEC — necessari solo per
la Fatturazione Elettronica vera (Fase 3), non bloccano l'uso attuale
(Fase 2, solo documenti commerciali).

Revision ID: c1d2e3f4a5b6
Revises: b0d45f058dc9
Create Date: 2026-08-18 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'c1d2e3f4a5b6'
down_revision = 'b0d45f058dc9'
branch_labels = None
depends_on = None


def upgrade():
    b = op.get_bind()
    b.execute(sa.text(
        "UPDATE companies SET name=:name, piva=:piva, codice_fiscale=:cf, "
        "indirizzo=:indirizzo, cap=:cap, comune=:comune, provincia=:prov "
        "WHERE code='IRWD'"
    ), {
        "name": "Ironwood Srls", "piva": "03614490542", "cf": "03614490542",
        "indirizzo": "Strada Tiberina Nord, 483", "cap": "06134",
        "comune": "Perugia", "prov": "PG",
    })


def downgrade():
    pass
