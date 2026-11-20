"""Registri IVA (S_ALR_87012357) e liquidazione periodica (F.12).

Fonte dei dati: le righe registrate sui conti mappati come IVA a debito e IVA a
credito, così registri e liquidazione leggono gli stessi numeri del libro
giornale. Le date seguono la regola fiscale: l'IVA sulle vendite è esigibile
alla data della fattura (data documento), l'IVA sugli acquisti si detrae dalla
data di registrazione.

- Registro vendite: fatture e note di credito clienti (DR, DG).
- Registro acquisti: fatture e note di credito fornitori (KR) e acquisti cespiti.
- Le altre scritture che toccano i conti IVA (rettifiche manuali, giroconti di
  split payment) compaiono come "altre registrazioni IVA": entrano nella
  liquidazione, perché muovono davvero i conti IVA.
- Un documento che muove sia IVA a debito sia IVA a credito (inversione
  contabile) compare in entrambi i registri.

La liquidazione genera il giroconto (documento LI): chiude IVA a debito e IVA
a credito del periodo sul conto Erario c/IVA a debito oppure a credito,
compensando prima l'eventuale credito dei periodi precedenti.
"""
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from extensions import db
from models import AccountMapping, FiscalParameter, JournalEntry, JournalLine
from services.bilancio import saldo_conto

ZERO = Decimal("0.00")
CENT = Decimal("0.01")
DOC_LIQUIDAZIONE = "LI"
ESCLUSI = ("LI", "CH", "RA")
VENDITE = ("DR", "DG")
ACQUISTI = ("KR", "Cespiti")
NOMI_MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio",
             "agosto", "settembre", "ottobre", "novembre", "dicembre"]


class IvaError(ValueError):
    pass


def _conto(concept):
    acc = AccountMapping.get(concept)
    if acc is None:
        raise IvaError(f"Conto '{concept}' non configurato nella determinazione automatica (OBYC).")
    return acc


def periodicita():
    p = FiscalParameter.query.filter_by(key="iva_periodicita").first()
    v = (p.value if p else "mensile").strip().lower()
    return "trimestrale" if v.startswith("trim") else "mensile"


def periodo(anno, numero, tipo=None):
    """(inizio, fine, etichetta) del mese o trimestre `numero` dell'anno."""
    tipo = tipo or periodicita()
    if tipo == "trimestrale":
        if not 1 <= numero <= 4:
            raise IvaError("Trimestre non valido.")
        m1, m2 = 3 * numero - 2, 3 * numero
        etichetta = f"{numero}° trimestre {anno}"
    else:
        if not 1 <= numero <= 12:
            raise IvaError("Mese non valido.")
        m1 = m2 = numero
        etichetta = f"{NOMI_MESI[numero - 1]} {anno}"
    inizio = date(anno, m1, 1)
    fine = (date(anno + 1, 1, 1) if m2 == 12 else date(anno, m2 + 1, 1)) - timedelta(days=1)
    return inizio, fine, etichetta


def _entries(date_from, date_to, company_id, iva_id, tipi, campo_data):
    q = (JournalEntry.query
         .filter(campo_data >= date_from, campo_data <= date_to, ~JournalEntry.doc_type.in_(ESCLUSI)))
    if company_id:
        q = q.filter(JournalEntry.company_id == company_id)
    tocca_iva = db.session.query(JournalLine.entry_id).filter(JournalLine.account_id == iva_id)
    q = q.filter(db.or_(JournalEntry.id.in_(tocca_iva), JournalEntry.doc_type.in_(tipi)))
    return q.order_by(campo_data, JournalEntry.doc_number).all()


def _riga(e, imposta, totale, lato_partner):
    imponibile = totale - imposta if totale is not None else None
    aliquota = e.vat_rate
    if aliquota is None and imponibile:
        aliquota = (imposta / imponibile * 100).quantize(Decimal("0.1"), ROUND_HALF_UP)
    return {"entry": e, "imponibile": imponibile, "imposta": imposta, "totale": totale,
            "aliquota": aliquota, "natura": e.natura, "soggetto": e.party.name if e.party else ""}


def registri(date_from, date_to, company_id=None):
    iva_deb, iva_cred = _conto("iva_debito"), _conto("iva_credito")
    clienti = AccountMapping.get("crediti_clienti")
    fornitori = AccountMapping.get("debiti_fornitori")
    out = {"vendite": [], "acquisti": [], "altre": []}
    altre = {}

    def somma(e, acc_id, segno):
        return sum(((l.avere - l.dare) if segno == "avere" else (l.dare - l.avere)
                    for l in e.lines if l.account_id == acc_id), ZERO)

    def partner(e, acc, segno):
        return somma(e, acc.id, segno) if acc else ZERO

    def lordo(e):
        return Decimal(str(e.gross_amount)) if e.gross_amount is not None else None

    # Lato vendite: IVA a debito, per data documento
    for e in _entries(date_from, date_to, company_id, iva_deb.id, VENDITE + ACQUISTI, JournalEntry.doc_date):
        deb = somma(e, iva_deb.id, "avere")
        if e.doc_type in VENDITE:
            totale = partner(e, clienti, "dare") or lordo(e)
            if e.doc_type == "DG" and totale is not None and totale > 0 and deb < 0:
                totale = -totale
            out["vendite"].append(_riga(e, deb, totale, "cliente"))
        elif e.doc_type in ACQUISTI:
            if any(l.account_id == iva_deb.id for l in e.lines):
                # Inversione contabile: il fornitore incassa solo l'imponibile
                out["vendite"].append(_riga(e, deb, partner(e, fornitori, "avere") + deb, "fornitore"))
        elif deb:
            altre.setdefault(e.id, {"entry": e, "iva_debito": ZERO, "iva_credito": ZERO})["iva_debito"] = deb

    # Lato acquisti: IVA a credito, per data di registrazione
    for e in _entries(date_from, date_to, company_id, iva_cred.id, ACQUISTI, JournalEntry.posting_date):
        cred = somma(e, iva_cred.id, "dare")
        if e.doc_type in ACQUISTI:
            tot_for = partner(e, fornitori, "avere")
            if any(l.account_id == iva_deb.id for l in e.lines):
                out["acquisti"].append(_riga(e, cred, tot_for + cred, "fornitore"))
            else:
                out["acquisti"].append(_riga(e, cred, tot_for or lordo(e), "fornitore"))
        elif cred:
            altre.setdefault(e.id, {"entry": e, "iva_debito": ZERO, "iva_credito": ZERO})["iva_credito"] = cred

    out["altre"] = sorted(altre.values(), key=lambda x: (x["entry"].posting_date, x["entry"].doc_number))
    for k in ("vendite", "acquisti"):
        out["tot_" + k] = {
            "imponibile": sum((r["imponibile"] or ZERO for r in out[k]), ZERO),
            "imposta": sum((r["imposta"] for r in out[k]), ZERO),
        }
    out["tot_altre"] = {"iva_debito": sum((r["iva_debito"] for r in out["altre"]), ZERO),
                        "iva_credito": sum((r["iva_credito"] for r in out["altre"]), ZERO)}
    return out


def liquidazione_esistente(etichetta, company_id=None):
    q = JournalEntry.query.filter_by(doc_type=DOC_LIQUIDAZIONE, reference=_riferimento(etichetta),
                                     is_reversed=False)
    q = q.filter(JournalEntry.reverses_id.is_(None))
    if company_id:
        q = q.filter(JournalEntry.company_id == company_id)
    else:
        q = q.filter(JournalEntry.company_id.is_(None))
    return q.first()


def _riferimento(etichetta):
    return ("LIQ-IVA " + etichetta)[:80]


def calcola_liquidazione(anno, numero, company_id=None, tipo=None):
    tipo = tipo or periodicita()
    inizio, fine, etichetta = periodo(anno, numero, tipo)
    iva_deb, iva_cred = _conto("iva_debito"), _conto("iva_credito")
    erario_cred = _conto("erario_iva_credito")
    def movimenti(acc_id, campo_data):
        q = (db.session.query(db.func.coalesce(db.func.sum(JournalLine.dare), 0),
                              db.func.coalesce(db.func.sum(JournalLine.avere), 0))
             .join(JournalEntry, JournalLine.entry_id == JournalEntry.id)
             .filter(campo_data >= inizio, campo_data <= fine, ~JournalEntry.doc_type.in_(ESCLUSI),
                     JournalLine.account_id == acc_id))
        if company_id:
            q = q.filter(JournalEntry.company_id == company_id)
        d, a = q.one()
        return Decimal(str(d)), Decimal(str(a))

    d_deb, a_deb = movimenti(iva_deb.id, JournalEntry.doc_date)       # vendite: data documento
    d_cred, a_cred = movimenti(iva_cred.id, JournalEntry.posting_date)  # acquisti: data registrazione
    iva_debito = (a_deb - d_deb).quantize(CENT)
    iva_credito = (d_cred - a_cred).quantize(CENT)
    credito_prec = max(saldo_conto(erario_cred.id, company_id, al=inizio - timedelta(days=1)), ZERO).quantize(CENT)
    saldo = iva_debito - iva_credito
    compensato = min(credito_prec, saldo) if saldo > 0 else ZERO
    da_versare = saldo - compensato if saldo > 0 else ZERO
    credito_nuovo = -saldo if saldo < 0 else ZERO
    interessi = (da_versare * Decimal("0.01")).quantize(CENT, ROUND_HALF_UP) if tipo == "trimestrale" else ZERO
    return {"anno": anno, "numero": numero, "tipo": tipo, "inizio": inizio, "fine": fine,
            "etichetta": etichetta, "iva_debito": iva_debito, "iva_credito": iva_credito,
            "credito_precedente": credito_prec, "compensato": compensato, "da_versare": da_versare,
            "credito_periodo": credito_nuovo, "interessi_trimestrali": interessi,
            "registrata": liquidazione_esistente(etichetta, company_id)}


def registra_liquidazione(anno, numero, company_id=None, created_by_id=None):
    from services.posting import post_journal_entry
    calc = calcola_liquidazione(anno, numero, company_id)
    if calc["registrata"]:
        raise IvaError(f"La liquidazione {calc['etichetta']} è già registrata "
                       f"(documento {calc['registrata'].doc_number}).")
    iva_deb, iva_cred = _conto("iva_debito"), _conto("iva_credito")
    erario_deb, erario_cred = _conto("erario_iva_debito"), _conto("erario_iva_credito")
    righe = []

    def riga(acc, dare=ZERO, avere=ZERO, descr=""):
        if dare < 0:
            dare, avere = ZERO, -dare
        if avere < 0:
            dare, avere = -avere, ZERO
        if dare or avere:
            righe.append({"account_id": acc.id, "dare": dare, "avere": avere, "description": descr})

    riga(iva_deb, dare=calc["iva_debito"], descr="Chiusura IVA a debito del periodo")
    riga(iva_cred, avere=calc["iva_credito"], descr="Chiusura IVA a credito del periodo")
    riga(erario_cred, avere=calc["compensato"], descr="Utilizzo credito IVA periodi precedenti")
    riga(erario_cred, dare=calc["credito_periodo"], descr="Credito IVA del periodo da riportare")
    riga(erario_deb, avere=calc["da_versare"], descr="IVA da versare")
    if len(righe) < 2:
        raise IvaError(f"Nessun movimento IVA da liquidare per {calc['etichetta']}.")
    entry = post_journal_entry(
        doc_type=DOC_LIQUIDAZIONE, prefix="23", doc_date=calc["fine"], posting_date=calc["fine"],
        description=f"Liquidazione IVA {calc['etichetta']}", lines=righe, source_module="IVA",
        reference=_riferimento(calc["etichetta"]), created_by_id=created_by_id, company_id=company_id,
    )
    return entry, calc


def annulla_liquidazione(anno, numero, company_id=None, created_by_id=None):
    """Storna la liquidazione con la sua stessa data. Solo l'ultima registrata:
    annullarne una intermedia renderebbe errati i crediti riportati dopo."""
    from services.chiusura import storna_stessa_data
    calc = calcola_liquidazione(anno, numero, company_id)
    doc = calc["registrata"]
    if not doc:
        raise IvaError(f"Nessuna liquidazione registrata per {calc['etichetta']}.")
    q = JournalEntry.query.filter(JournalEntry.doc_type == DOC_LIQUIDAZIONE, JournalEntry.is_reversed.is_(False),
                                  JournalEntry.reverses_id.is_(None), JournalEntry.posting_date > doc.posting_date)
    q = q.filter(JournalEntry.company_id == company_id) if company_id else q.filter(JournalEntry.company_id.is_(None))
    if q.first():
        raise IvaError("Esistono liquidazioni successive: annulla prima quelle.")
    storno = storna_stessa_data(doc, created_by_id)
    db.session.commit()
    return storno
