"""Chiusura e riapertura dell'esercizio (FAGLGVTR / F.16), con le scritture
della prassi italiana:

1. Epilogo (CH, 31/12): costi e ricavi girati al Conto economico, risultato
   girato a Utile d'esercizio oppure Perdita d'esercizio.
2. Chiusura (CH, 31/12): attività e passività girate allo Stato patrimoniale
   finale. Dopo questa scrittura tutti i conti sono a zero.
3. Riapertura (RA, 1/1 dell'anno dopo): attività e passività riaperte contro lo
   Stato patrimoniale iniziale.

Controlli: l'esercizio precedente deve essere chiuso, una chiusura già
registrata non si ripete, il bilancio di verifica deve quadrare. L'annullamento
storna i tre documenti con la loro stessa data, non con la data di oggi.
"""
from datetime import date
from decimal import Decimal

from extensions import db
from models import AccountMapping, Company, JournalEntry
from services.bilancio import bilancio_di_verifica, TIPI_CE, TIPI_SP

ZERO = Decimal("0.00")
SOURCE = "CHIUSURA"
PREFISSI = {"LI": "23", "CH": "24", "RA": "25", "RR": "26"}


class ChiusuraError(ValueError):
    pass


def richiedi_azienda(company_id):
    """Con più aziende (P.IVA diverse) chiusure e liquidazioni vanno fatte per azienda."""
    if not company_id and Company.query.count() > 1:
        raise ChiusuraError("Seleziona l'azienda in alto: chiusure e liquidazioni si fanno per singola azienda.")


def _conto(concept):
    acc = AccountMapping.get(concept)
    if acc is None:
        raise ChiusuraError(f"Conto '{concept}' non configurato nella determinazione automatica (OBYC).")
    return acc


def _rif(tipo, anno):
    return f"{tipo} {anno}"


def _documento(doc_type, reference, company_id):
    q = JournalEntry.query.filter_by(doc_type=doc_type, reference=reference, is_reversed=False)
    q = q.filter(JournalEntry.reverses_id.is_(None))
    q = q.filter(JournalEntry.company_id == company_id) if company_id else q.filter(JournalEntry.company_id.is_(None))
    return q.first()


def stato(anno, company_id=None):
    return {"epilogo": _documento("CH", _rif("EPILOGO", anno), company_id),
            "chiusura": _documento("CH", _rif("CHIUSURA", anno), company_id),
            "riapertura": _documento("RA", _rif("RIAPERTURA", anno + 1), company_id)}


def _righe_contro(saldi, contropartita, descr):
    """Azzera ogni conto (saldo Dare-Avere) contro una contropartita unica."""
    righe, netto = [], ZERO
    for acc, saldo in saldi:
        if saldo > 0:
            righe.append({"account_id": acc.id, "dare": ZERO, "avere": saldo, "description": descr})
        elif saldo < 0:
            righe.append({"account_id": acc.id, "dare": -saldo, "avere": ZERO, "description": descr})
        netto += saldo
    if netto > 0:
        righe.append({"account_id": contropartita.id, "dare": netto, "avere": ZERO, "description": descr})
    elif netto < 0:
        righe.append({"account_id": contropartita.id, "dare": ZERO, "avere": -netto, "description": descr})
    return righe


def anteprima(anno, company_id=None):
    bv = bilancio_di_verifica(date(anno, 1, 1), date(anno, 12, 31), company_id, escludi_chiusure=True)
    tecnici = {a.id for a in (AccountMapping.get("conto_economico_epilogo"),
                              AccountMapping.get("stato_patrimoniale_finale"),
                              AccountMapping.get("stato_patrimoniale_iniziale")) if a}
    ce = [(r["account"], r["finale"]) for r in bv["righe"]
          if r["account"].account_type in TIPI_CE and r["finale"] != ZERO]
    sp = [(r["account"], r["finale"]) for r in bv["righe"]
          if r["account"].account_type in TIPI_SP and r["finale"] != ZERO and r["account"].id not in tecnici]
    costi = sum((s for a, s in ce if a.account_type == "costo"), ZERO)
    ricavi = -sum((s for a, s in ce if a.account_type == "ricavo"), ZERO)
    risultato = -sum((s for _, s in ce), ZERO)  # >0 utile
    return {"anno": anno, "bv": bv, "ce": ce, "sp": sp, "costi": costi, "ricavi": ricavi,
            "risultato": risultato, "tecnici_non_a_zero": [r for r in bv["righe"]
                                                          if r["account"].id in tecnici and r["finale"] != ZERO]}


def chiudi_esercizio(anno, company_id=None, created_by_id=None, riapri=True):
    from services.posting import post_journal_entry
    richiedi_azienda(company_id)
    st = stato(anno, company_id)
    if st["epilogo"] or st["chiusura"]:
        raise ChiusuraError(f"L'esercizio {anno} risulta già chiuso.")
    if not stato(anno - 1, company_id)["chiusura"] and _ha_movimenti_prima(anno, company_id):
        raise ChiusuraError(f"Chiudi prima l'esercizio {anno - 1}: ha movimenti ma non è stato chiuso.")
    prev = anteprima(anno, company_id)
    bv = prev["bv"]
    if not bv["quadra"]:
        raise ChiusuraError(f"Il bilancio di verifica {anno} non quadra (differenza {bv['differenza']}).")
    if prev["tecnici_non_a_zero"]:
        raise ChiusuraError("I conti tecnici di epilogo/chiusura/riapertura hanno un saldo: verifica le scritture manuali.")
    if not prev["ce"] and not prev["sp"]:
        raise ChiusuraError(f"Nessun saldo da chiudere per l'esercizio {anno}.")

    ce_acc = _conto("conto_economico_epilogo")
    spf = _conto("stato_patrimoniale_finale")
    spi = _conto("stato_patrimoniale_iniziale")
    fine = date(anno, 12, 31)
    kw = dict(source_module=SOURCE, created_by_id=created_by_id, commit=False,
              allow_inactive_accounts=True, company_id=company_id)
    creati = {}

    sp_saldi = dict((a.id, [a, s]) for a, s in prev["sp"])
    if prev["ce"]:
        righe = _righe_contro(prev["ce"], ce_acc, f"Epilogo esercizio {anno}")
        risultato = prev["risultato"]
        if risultato > 0:
            ris_acc = _conto("utile_esercizio")
            righe += [{"account_id": ce_acc.id, "dare": risultato, "avere": ZERO, "description": "Utile d'esercizio"},
                      {"account_id": ris_acc.id, "dare": ZERO, "avere": risultato, "description": "Utile d'esercizio"}]
            sp_saldi.setdefault(ris_acc.id, [ris_acc, ZERO])[1] -= risultato
        elif risultato < 0:
            ris_acc = _conto("perdita_esercizio")
            righe += [{"account_id": ris_acc.id, "dare": -risultato, "avere": ZERO, "description": "Perdita d'esercizio"},
                      {"account_id": ce_acc.id, "dare": ZERO, "avere": -risultato, "description": "Perdita d'esercizio"}]
            sp_saldi.setdefault(ris_acc.id, [ris_acc, ZERO])[1] += -risultato
        creati["epilogo"] = post_journal_entry("CH", "24", fine, f"Epilogo conti economici {anno}", righe,
                                               reference=_rif("EPILOGO", anno), posting_date=fine, **kw)

    sp = [(a, s) for a, s in sp_saldi.values() if s != ZERO]
    if sp:
        creati["chiusura"] = post_journal_entry("CH", "24", fine, f"Chiusura conti patrimoniali {anno}",
                                                _righe_contro(sp, spf, f"Chiusura esercizio {anno}"),
                                                reference=_rif("CHIUSURA", anno), posting_date=fine, **kw)
        if riapri:
            inizio = date(anno + 1, 1, 1)
            invertite = [(a, -s) for a, s in sp]
            creati["riapertura"] = post_journal_entry("RA", "25", inizio, f"Riapertura conti {anno + 1}",
                                                      _righe_contro(invertite, spi, f"Riapertura esercizio {anno + 1}"),
                                                      reference=_rif("RIAPERTURA", anno + 1), posting_date=inizio, **kw)
    db.session.commit()
    return creati, prev


def _ha_movimenti_prima(anno, company_id):
    q = JournalEntry.query.filter(JournalEntry.posting_date < date(anno, 1, 1))
    q = q.filter(JournalEntry.company_id == company_id) if company_id else q
    return db.session.query(q.exists()).scalar()


def storna_stessa_data(original, created_by_id=None):
    """Storno con la stessa data del documento originale (non quella di oggi)."""
    from services.posting import post_journal_entry
    if original.is_reversed:
        raise ChiusuraError(f"Il documento {original.doc_number} è già stornato.")
    righe = [{"account_id": l.account_id, "dare": l.avere, "avere": l.dare,
              "description": f"STORNO {l.description or ''}"[:255], "cost_center_id": l.cost_center_id}
             for l in original.lines]
    nuovo = post_journal_entry(original.doc_type, PREFISSI.get(original.doc_type, "10"), original.doc_date, f"Storno di {original.doc_number}",
                               righe, source_module=original.source_module, reference=original.reference,
                               created_by_id=created_by_id, commit=False, allow_inactive_accounts=True,
                               posting_date=original.posting_date, company_id=original.company_id)
    original.is_reversed = True
    original.reversed_by_id = nuovo.id
    nuovo.reverses_id = original.id
    return nuovo


def annulla_chiusura(anno, company_id=None, created_by_id=None):
    richiedi_azienda(company_id)
    if stato(anno + 1, company_id)["chiusura"]:
        raise ChiusuraError(f"Annulla prima la chiusura dell'esercizio {anno + 1}.")
    st = stato(anno, company_id)
    docs = [d for d in (st["riapertura"], st["chiusura"], st["epilogo"]) if d]
    if not docs:
        raise ChiusuraError(f"Nessuna chiusura registrata per l'esercizio {anno}.")
    for d in docs:
        storna_stessa_data(d, created_by_id)
    db.session.commit()
    return docs
