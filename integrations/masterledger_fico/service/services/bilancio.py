"""Saldi contabili, bilancio di verifica (S_ALR_87012277 / F.08) e bilancio
a sezioni contrapposte (F.01).

Regole:
- si ragiona sulla data di registrazione (posting_date), come il blocco periodi;
- conti patrimoniali: il saldo iniziale è il cumulato di tutto ciò che precede
  la data di inizio (riporto saldi);
- conti economici: il saldo iniziale parte dal 1° gennaio dell'anno della data
  di inizio, perché il conto economico riparte da zero ogni esercizio;
- le scritture di chiusura (tipo CH) che cadono nel periodo si escludono di
  default, così il bilancio dell'esercizio mostra i saldi prima di epilogo e
  chiusura. Le chiusure precedenti al periodo restano incluse;
- se un esercizio precedente non è stato chiuso, il suo risultato compare in una
  riga a parte, così il bilancio di verifica quadra comunque.
"""
from collections import OrderedDict
from datetime import date, timedelta
from decimal import Decimal

from extensions import db
from models import Account, JournalEntry, JournalLine

ZERO = Decimal("0.00")
TIPI_SP = ("patrimoniale_attivo", "patrimoniale_passivo")
TIPI_CE = ("costo", "ricavo")
DOC_CHIUSURA = "CH"
DOC_RIAPERTURA = "RA"


def _somme(company_id, date_from=None, date_to=None, escludi_tipi=(), solo_tipi_conto=None):
    """{account_id: (dare, avere)} delle righe nel range di posting_date (estremi inclusi)."""
    q = (db.session.query(JournalLine.account_id,
                          db.func.coalesce(db.func.sum(JournalLine.dare), 0),
                          db.func.coalesce(db.func.sum(JournalLine.avere), 0))
         .join(JournalEntry, JournalLine.entry_id == JournalEntry.id))
    if company_id:
        q = q.filter(JournalEntry.company_id == company_id)
    if date_from:
        q = q.filter(JournalEntry.posting_date >= date_from)
    if date_to:
        q = q.filter(JournalEntry.posting_date <= date_to)
    if escludi_tipi:
        q = q.filter(~JournalEntry.doc_type.in_(escludi_tipi))
    if solo_tipi_conto:
        q = q.join(Account, JournalLine.account_id == Account.id).filter(Account.account_type.in_(solo_tipi_conto))
    out = {}
    for acc_id, dare, avere in q.group_by(JournalLine.account_id).all():
        out[acc_id] = (Decimal(str(dare)).quantize(ZERO), Decimal(str(avere)).quantize(ZERO))
    return out


def saldo_conto(account_id, company_id=None, al=None, escludi_tipi=()):
    """Saldo Dare-Avere di un conto alla data (inclusa)."""
    d, a = _somme(company_id, date_to=al, escludi_tipi=escludi_tipi).get(account_id, (ZERO, ZERO))
    return d - a


def bilancio_di_verifica(date_from, date_to, company_id=None, escludi_chiusure=True):
    if date_from > date_to:
        raise ValueError("La data di inizio è successiva alla data di fine.")
    inizio_anno = date(date_from.year, 1, 1)
    giorno_prima = date_from - timedelta(days=1)

    prec_sp = _somme(company_id, date_to=giorno_prima, solo_tipi_conto=TIPI_SP)
    prec_ce = _somme(company_id, date_from=inizio_anno, date_to=giorno_prima, solo_tipi_conto=TIPI_CE) \
        if date_from > inizio_anno else {}
    escludi = (DOC_CHIUSURA,) if escludi_chiusure else ()
    periodo = _somme(company_id, date_from, date_to, escludi_tipi=escludi)

    # Risultato di esercizi precedenti mai chiusi (conti economici prima del 1/1)
    ce_storico = _somme(company_id, date_to=inizio_anno - timedelta(days=1), solo_tipi_conto=TIPI_CE)
    risultato_non_riportato = sum((d - a for d, a in ce_storico.values()), ZERO)

    ids = set(prec_sp) | set(prec_ce) | set(periodo)
    accounts = {a.id: a for a in Account.query.filter(Account.id.in_(ids)).all()} if ids else {}
    righe = []
    for acc in sorted(accounts.values(), key=lambda a: a.code):
        di, ai = (prec_sp if acc.account_type in TIPI_SP else prec_ce).get(acc.id, (ZERO, ZERO))
        iniziale = di - ai
        dare, avere = periodo.get(acc.id, (ZERO, ZERO))
        finale = iniziale + dare - avere
        if iniziale == ZERO and dare == ZERO and avere == ZERO:
            continue
        righe.append({"account": acc, "iniziale": iniziale, "dare": dare, "avere": avere, "finale": finale})

    tot = {k: sum((r[k] for r in righe), ZERO) for k in ("iniziale", "dare", "avere", "finale")}
    tot["finale_dare"] = sum((r["finale"] for r in righe if r["finale"] > 0), ZERO)
    tot["finale_avere"] = -sum((r["finale"] for r in righe if r["finale"] < 0), ZERO)
    quadratura = tot["finale"] + risultato_non_riportato
    return {"righe": righe, "totali": tot, "risultato_non_riportato": risultato_non_riportato,
            "quadra": quadratura == ZERO and tot["dare"] == tot["avere"],
            "differenza": quadratura, "date_from": date_from, "date_to": date_to}


def bilancio(al, company_id=None, date_from=None):
    """Stato patrimoniale alla data e conto economico dal 1/1 (o da date_from)."""
    date_from = date_from or date(al.year, 1, 1)
    bv = bilancio_di_verifica(date_from, al, company_id, escludi_chiusure=True)
    sez = OrderedDict((t, []) for t in ("patrimoniale_attivo", "patrimoniale_passivo", "costo", "ricavo"))
    for r in bv["righe"]:
        if r["finale"] == ZERO:
            continue
        tipo = r["account"].account_type
        # Attività e costi a saldo Dare, passività e ricavi a saldo Avere
        importo = r["finale"] if tipo in ("patrimoniale_attivo", "costo") else -r["finale"]
        sez.setdefault(tipo, []).append({"account": r["account"], "importo": importo})
    tot = {t: sum((x["importo"] for x in v), ZERO) for t, v in sez.items()}
    risultato = tot["ricavo"] - tot["costo"]
    precedente = -bv["risultato_non_riportato"]  # >0 utile non riportato
    differenza = tot["patrimoniale_attivo"] - tot["patrimoniale_passivo"] - risultato - precedente
    return {"sezioni": sez, "totali": tot, "risultato": risultato, "risultato_precedente": precedente,
            "quadra": differenza == ZERO, "differenza": differenza, "al": al, "date_from": date_from}
