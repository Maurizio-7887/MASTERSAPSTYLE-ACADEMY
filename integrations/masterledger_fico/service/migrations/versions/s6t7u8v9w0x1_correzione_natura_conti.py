"""Correzione della natura di 29 conti del piano dei conti del commercialista
(codici a 6 cifre che iniziano per 0, Iron Appalti).

Quei conti erano stati inseriti nei dati iniziali con natura DEDOTTA
automaticamente dal nome, mai confermata: ratei e risconti, IVA vendite,
fondi, rimanenze, interessi e plusvalenze risultavano costi o attività
sbagliate, e falsavano bilancio di verifica, Stato patrimoniale e Conto
economico. La natura corretta è verificata anche sul lato Dare/Avere con cui
gli schemi di rettifica (services/rettifiche_operazioni.py) usano ogni conto.

Si corregge un conto SOLO se ha ancora la natura sbagliata dei dati iniziali:
una modifica già fatta a mano dal commercialista non viene sovrascritta.
Natura e rilevanza CO cambiano; saldi e movimenti restano quelli registrati.

Revision ID: s6t7u8v9w0x1
Revises: r5s6t7u8v9w0
Create Date: 2026-11-20
"""
from alembic import op
import sqlalchemy as sa

revision = "s6t7u8v9w0x1"
down_revision = "r5s6t7u8v9w0"
branch_labels = None
depends_on = None

# codice, natura errata, CO errata, tipo CO errato, natura corretta, CO corretta, tipo CO corretto
CORREZIONI = [
    ("013203", "costo", True, 'COST', "patrimoniale_attivo", False, None),  # migliorie su beni di terzi capitalizzate: immobilizzazione immateriale
    ("014401", "patrimoniale_attivo", False, None, "patrimoniale_passivo", False, None),  # fondo svalutazione: rettifica dell'attivo
    ("016301", "costo", True, 'COST', "patrimoniale_attivo", False, None),  # depositi cauzionali: credito
    ("017001", "costo", True, 'COST', "patrimoniale_attivo", False, None),  # rimanenze finali di materie prime
    ("017301", "costo", True, 'COST', "patrimoniale_attivo", False, None),  # rimanenze di lavori in corso su ordinazione
    ("017401", "costo", True, 'COST', "patrimoniale_attivo", False, None),  # rimanenze finali di merci
    ("030001", "costo", True, 'COST', "patrimoniale_passivo", False, None),  # fondo svalutazione crediti: rettifica dell'attivo
    ("030354", "patrimoniale_passivo", False, None, "patrimoniale_attivo", False, None),  # credito verso erario per IVA
    ("030552", "costo", True, 'COST', "patrimoniale_attivo", False, None),  # note di accredito da ricevere dai fornitori: credito
    ("032701", "costo", True, 'COST', "patrimoniale_attivo", False, None),  # ratei attivi
    ("032801", "costo", True, 'COST', "patrimoniale_attivo", False, None),  # risconti attivi
    ("033621", "costo", True, 'COST', "patrimoniale_passivo", False, None),  # utili di esercizi precedenti: patrimonio netto
    ("034102", "costo", True, 'COST', "patrimoniale_passivo", False, None),  # fondo imposte differite
    ("034205", "costo", True, 'COST', "patrimoniale_passivo", False, None),  # fondo rischi per controversie legali
    ("045006", "costo", True, 'COST', "patrimoniale_passivo", False, None),  # IVA sulle vendite: debito verso erario
    ("045202", "costo", True, 'COST', "patrimoniale_passivo", False, None),  # note di accredito da emettere ai clienti: debito
    ("045501", "costo", True, 'COST', "patrimoniale_passivo", False, None),  # ratei passivi
    ("045551", "costo", True, 'COST', "patrimoniale_passivo", False, None),  # risconti passivi
    ("050501", "costo", True, 'COST', "ricavo", True, 'REVENUE'),  # variazione dei lavori in corso su ordinazione (valore della produzione)
    ("050702", "costo", True, 'COST', "ricavo", True, 'REVENUE'),  # affitti attivi: altri ricavi
    ("051609", "costo", True, 'COST', "ricavo", True, 'REVENUE'),  # resi su vendite: rettifica dei ricavi
    ("051802", "costo", True, 'COST', "ricavo", True, 'REVENUE'),  # ricavi per prestazioni di servizi
    ("056242", "patrimoniale_passivo", False, None, "costo", True, 'COST'),  # accantonamento TFR dell'anno: costo del personale
    ("065401", "costo", True, 'COST', "ricavo", True, 'REVENUE'),  # arrotondamenti attivi: provento
    ("065404", "patrimoniale_attivo", False, None, "ricavo", True, 'REVENUE'),  # interessi attivi bancari: provento finanziario
    ("070005", "patrimoniale_attivo", False, None, "costo", True, 'COST'),  # interessi passivi bancari: onere finanziario
    ("072551", "patrimoniale_attivo", False, None, "ricavo", True, 'REVENUE'),  # rivalutazione di crediti: rettifica di valore positiva
    ("075000", "patrimoniale_attivo", False, None, "ricavo", True, 'REVENUE'),  # plusvalenza da alienazione
    ("080000", "patrimoniale_attivo", False, None, "costo", True, 'COST'),  # minusvalenza da alienazione
]

accounts = sa.table("accounts", sa.column("code", sa.String), sa.column("account_type", sa.String),
                    sa.column("cost_relevant", sa.Boolean), sa.column("cost_relevant_type", sa.String))


def _applica(da_tipo, da_co, da_cot, a_tipo, a_co, a_cot, code):
    op.get_bind().execute(
        accounts.update()
        .where(accounts.c.code == code)
        .where(accounts.c.account_type == da_tipo)
        .values(account_type=a_tipo, cost_relevant=a_co, cost_relevant_type=a_cot))


def upgrade():
    for code, old_t, old_co, old_cot, new_t, new_co, new_cot in CORREZIONI:
        _applica(old_t, old_co, old_cot, new_t, new_co, new_cot, code)


def downgrade():
    for code, old_t, old_co, old_cot, new_t, new_co, new_cot in CORREZIONI:
        _applica(new_t, new_co, new_cot, old_t, old_co, old_cot, code)
