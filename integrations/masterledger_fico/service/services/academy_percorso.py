"""Percorsi pratici verificati dell'Academy FI/CO (STYLESAPFICO, Fase C).

Regole fondamentali (piano operativo del 21/11/2026, §8-9):
- ogni sessione ha la propria azienda didattica: le query dei validatori
  filtrano SEMPRE per company_id della sessione;
- un passo è «verificato» solo dopo un esito positivo calcolato qui, sul
  server, leggendo documenti e righe salvati nel database;
- il browser non decide nulla: invia solo «verifica il passo X»;
- se un documento viene stornato, i passi che dipendevano da esso tornano
  «invalidato» alla rivalutazione successiva (lo storico resta nell'evidenza).
"""
import json
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

from extensions import db
from models import (Account, AccountMapping, AccountingPeriod, AcademySession, AcademyStepResult, Company,
                    CostCenter, EconomicSubject, InvoiceInstallment, JournalEntry, JournalLine)

PERCORSI_DIR = Path(__file__).resolve().parent.parent / "blueprints" / "academy" / "percorsi"
APERTURA_REF = "B8-APERTURA"
ZERO = Decimal("0")


class PercorsoError(Exception):
    pass


# ── Catalogo ─────────────────────────────────────────────────────────
def carica_percorso(scenario_id="B8-SET2028"):
    for f in PERCORSI_DIR.glob("*.json"):
        data = json.loads(f.read_text(encoding="utf-8"))
        if data.get("id") == scenario_id:
            return data
    raise PercorsoError(f"Percorso {scenario_id} non trovato")


def elenco_percorsi():
    return [json.loads(f.read_text(encoding="utf-8")) for f in sorted(PERCORSI_DIR.glob("*.json"))]


def _d(value):
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


# ── Dati anagrafici condivisi (idempotente) ──────────────────────────
def prepara_anagrafiche(sc):
    """Crea solo ciò che manca: conti didattici, centri, soggetti. Non modifica
    nulla di esistente. Sono anagrafiche condivise in sola lettura per gli allievi;
    i DOCUMENTI restano separati per azienda didattica."""
    for code, name, typ, co in sc["conti_didattici"]:
        if not Account.query.filter_by(code=code).first():
            acc = Account(code=code, name=name, account_type=typ, active=True,
                          cost_relevant=bool(co), cost_relevant_type=("COST" if co and typ == "costo" else None))
            db.session.add(acc)
    for code, name in sc["centri"]:
        if not CostCenter.query.filter_by(code=code).first():
            db.session.add(CostCenter(code=code, name=name, active=True))
    for code, name, kind in sc["soggetti"]:
        if not EconomicSubject.query.filter_by(code=code).first():
            db.session.add(EconomicSubject(code=code, name=name, is_customer=(kind == "cliente"),
                                           is_supplier=(kind == "fornitore"), active=True,
                                           nazione="IT", codice_destinatario="0000000"))
    # Periodo del caso: se il blocco periodi è attivo e il mese non esiste, nessuna
    # registrazione didattica entrerebbe. Si crea APERTO solo se manca.
    anno, mese = sc["periodo"]["anno"], sc["periodo"]["mese"]
    if AccountingPeriod.find_for_date(date(anno, mese, 1)) is None:
        import calendar
        db.session.add(AccountingPeriod(year=anno, month=mese, start_date=date(anno, mese, 1),
                                        end_date=date(anno, mese, calendar.monthrange(anno, mese)[1]),
                                        status="aperto"))
    db.session.flush()


def conti_ruolo(sc, ruolo):
    """Insieme degli id conto ammessi per un ruolo (es. 'banca')."""
    ids = set()
    for ref in sc["ruoli"].get(ruolo, []):
        if ref.startswith("concept:"):
            m = AccountMapping.query.filter_by(concept_key=ref[8:]).first()
            if m and m.account_id:
                ids.add(m.account_id)
        else:
            acc = Account.query.filter_by(code=ref).first()
            if acc:
                ids.add(acc.id)
    return ids


def _primo_conto(sc, ruolo):
    for ref in sc["ruoli"][ruolo]:
        if ref.startswith("concept:"):
            m = AccountMapping.query.filter_by(concept_key=ref[8:]).first()
            if m and m.account_id:
                return db.session.get(Account, m.account_id)
        else:
            acc = Account.query.filter_by(code=ref).first()
            if acc:
                return acc
    raise PercorsoError(f"Nessun conto configurato per il ruolo «{ruolo}»: controlla OBYC / piano dei conti.")


# ── Sessioni ─────────────────────────────────────────────────────────
def sessione_attiva(user, scenario_id):
    return (AcademySession.query.filter_by(user_id=user.id, scenario_id=scenario_id, is_active=True)
            .order_by(AcademySession.id.desc()).first())


def sessione_di(user, session_id):
    """Controllo di titolarità: una persona apre solo le proprie sessioni."""
    s = db.session.get(AcademySession, session_id)
    if s is None or s.user_id != user.id:
        return None
    return s


def avvia_sessione(user, scenario_id="B8-SET2028", mode="studio"):
    """Nuova sessione con azienda didattica personale e saldi di apertura.
    Le sessioni precedenti restano nel database (disattivate), mai cancellate."""
    from services.posting import post_journal_entry
    from services.payments import create_installments_for_invoice

    sc = carica_percorso(scenario_id)
    if mode not in ("studio", "allenamento", "prova"):
        mode = "studio"
    prepara_anagrafiche(sc)
    for old in AcademySession.query.filter_by(user_id=user.id, scenario_id=scenario_id, is_active=True):
        old.is_active = False
    s = AcademySession(user_id=user.id, scenario_id=sc["id"], scenario_version=sc["versione"], mode=mode)
    db.session.add(s)
    db.session.flush()
    company = Company(code=f"AC{s.id:06d}", name=f"{sc['azienda_nome']} · {user.full_name}"[:120],
                      nazione="IT", active=True)
    db.session.add(company)
    db.session.flush()
    s.company_id = company.id

    ap = sc["apertura"]
    d0 = date.fromisoformat(ap["data"])
    c = {r: _primo_conto(sc, r) for r in ("banca", "crediti", "impianti", "fondo", "debiti", "pn", "apertura")}
    # 1) Attività e patrimonio: la differenza transita sul conto di apertura e si
    #    annulla con le due scritture dei partner iniziali (2) e (3).
    diff = _d(ap["pn"]) + _d(ap["fondo"]) - _d(ap["banca"]) - _d(ap["impianti"])
    lines = [{"account_id": c["banca"].id, "dare": _d(ap["banca"]), "avere": 0},
             {"account_id": c["impianti"].id, "dare": _d(ap["impianti"]), "avere": 0},
             {"account_id": c["fondo"].id, "dare": 0, "avere": _d(ap["fondo"])},
             {"account_id": c["pn"].id, "dare": 0, "avere": _d(ap["pn"])}]
    lines.append({"account_id": c["apertura"].id, "dare": diff if diff > 0 else 0, "avere": -diff if diff < 0 else 0})
    post_journal_entry("SA", "10", d0, "Apertura conti al 01/09/2028 (caso didattico)", lines,
                       source_module="ACADEMY", reference=APERTURA_REF, created_by_id=user.id,
                       commit=False, company_id=company.id)
    cli = EconomicSubject.query.filter_by(code="B8-CLIINI").first()
    forn = EconomicSubject.query.filter_by(code="B8-FORINI").first()
    e_cli = post_journal_entry("DR", "14", d0, "Crediti iniziali verso clienti preesistenti",
                               [{"account_id": c["crediti"].id, "dare": _d(ap["crediti"]), "avere": 0},
                                {"account_id": c["apertura"].id, "dare": 0, "avere": _d(ap["crediti"])}],
                               source_module="ACADEMY", reference=APERTURA_REF, created_by_id=user.id,
                               economic_subject_id=cli.id, gross_amount=_d(ap["crediti"]),
                               commit=False, company_id=company.id)
    e_for = post_journal_entry("KR", "19", d0, "Debiti iniziali verso fornitori preesistenti",
                               [{"account_id": c["apertura"].id, "dare": _d(ap["debiti"]), "avere": 0},
                                {"account_id": c["debiti"].id, "dare": 0, "avere": _d(ap["debiti"])}],
                               source_module="ACADEMY", reference=APERTURA_REF, created_by_id=user.id,
                               economic_subject_id=forn.id, gross_amount=_d(ap["debiti"]),
                               commit=False, company_id=company.id)
    create_installments_for_invoice(e_cli)
    create_installments_for_invoice(e_for)
    db.session.commit()
    return s


# ── Lettura documenti della sessione ─────────────────────────────────
def _documenti_validi(company_id, doc_types):
    """Documenti dell'azienda didattica non stornati, non storni, non di apertura."""
    return (JournalEntry.query
            .filter(JournalEntry.company_id == company_id, JournalEntry.doc_type.in_(doc_types),
                    JournalEntry.is_reversed.is_(False), JournalEntry.reverses_id.is_(None),
                    db.or_(JournalEntry.reference.is_(None), JournalEntry.reference != APERTURA_REF))
            .order_by(JournalEntry.id).all())


def _righe_aggregate(entry):
    agg = {}
    for ln in JournalLine.query.filter_by(entry_id=entry.id).all():
        key = (ln.account_id, ln.cost_center_id)
        dare, avere = agg.get(key, (ZERO, ZERO))
        agg[key] = (dare + _d(ln.dare), avere + _d(ln.avere))
    return agg


def _confronta(sc, entry, cfg):
    """Elenco dei problemi (vuoto = documento corretto)."""
    problemi = []
    if cfg.get("data") and entry.doc_date != date.fromisoformat(cfg["data"]):
        problemi.append(f"data {entry.doc_date:%d/%m/%Y} invece di {date.fromisoformat(cfg['data']):%d/%m/%Y}")
    if cfg.get("soggetto"):
        subj = db.session.get(EconomicSubject, entry.economic_subject_id) if entry.economic_subject_id else None
        if subj is None or subj.code != cfg["soggetto"]:
            problemi.append(f"soggetto {subj.code if subj else 'assente'} invece di {cfg['soggetto']}")
    agg = _righe_aggregate(entry)
    usate = set()
    for r in cfg["righe"]:
        ammessi = conti_ruolo(sc, r["ruolo"])
        centro = CostCenter.query.filter_by(code=r["centro"]).first() if r.get("centro") else None
        imp = _d(r["importo"])
        trovata = None
        for key, (dare, avere) in agg.items():
            if key in usate or key[0] not in ammessi:
                continue
            val = dare - avere if r["lato"] == "dare" else avere - dare
            if val == imp:
                trovata = key
                break
        if trovata is None:
            problemi.append(f"manca {r['lato'].upper()} {r['ruolo']} {imp:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))
            continue
        usate.add(trovata)
        if centro and trovata[1] != centro.id:
            problemi.append(f"la riga {r['ruolo']} deve avere il centro di costo {r['centro']}")
    extra = [k for k in agg if k not in usate and (agg[k][0] or agg[k][1])]
    if extra:
        codici = []
        for acc_id, _cc in extra:
            acc = db.session.get(Account, acc_id)
            codici.append(acc.code if acc else str(acc_id))
        problemi.append("righe non previste sui conti " + ", ".join(codici) + " (es. IVA in un caso senza IVA)")
    return problemi


def residuo_fattura(entry):
    if entry.is_reversed:
        return ZERO
    rate = InvoiceInstallment.query.filter_by(entry_id=entry.id).all()
    if entry.is_paid and not rate:
        return ZERO
    if not rate:
        return _d(entry.gross_amount)
    return sum((_d(i.residual_amount) for i in rate), ZERO)


def _documento_del_passo(s, sc, step_id):
    """Documento che soddisfa un passo-documento (per i passi che ne dipendono)."""
    step = next(p for p in sc["passi"] if p["id"] == step_id)
    cfg = step["validator"]
    ok = [e for e in _documenti_validi(s.company_id, cfg["doc_types"]) if not _confronta(sc, e, cfg)]
    return ok[0] if len(ok) == 1 else None


def _saldo_ruolo(sc, company_id, ruolo, fino_a=None):
    ids = conti_ruolo(sc, ruolo)
    if not ids:
        return ZERO
    q = (db.session.query(db.func.coalesce(db.func.sum(JournalLine.dare), 0),
                          db.func.coalesce(db.func.sum(JournalLine.avere), 0))
         .join(JournalEntry, JournalLine.entry_id == JournalEntry.id)
         .filter(JournalEntry.company_id == company_id, JournalLine.account_id.in_(ids)))
    if fino_a:
        q = q.filter(JournalEntry.doc_date <= fino_a)
    dare, avere = q.one()
    return _d(dare) - _d(avere)


def _fmt(v):
    return f"{_d(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


# ── Validatori ───────────────────────────────────────────────────────
def _v_ambiente(s, sc, cfg, azienda_corrente_id):
    if azienda_corrente_id != s.company_id:
        return False, "L'azienda corrente non è la tua azienda didattica. Premi «Riprendi» nel percorso.", {}
    aperture = (JournalEntry.query.filter_by(company_id=s.company_id, reference=APERTURA_REF,
                                             is_reversed=False).count())
    if aperture != 3:
        return False, "Le scritture di apertura non sono integre (attese 3). Avvia una nuova sessione.", {}
    att = (_saldo_ruolo(sc, s.company_id, "banca") + _saldo_ruolo(sc, s.company_id, "crediti")
           + _saldo_ruolo(sc, s.company_id, "impianti") + _saldo_ruolo(sc, s.company_id, "fondo"))
    d0 = date.fromisoformat(sc["apertura"]["data"])
    att0 = sum((_saldo_ruolo(sc, s.company_id, r, d0) for r in ("banca", "crediti", "impianti", "fondo")), ZERO)
    if att0 != Decimal("94000.00"):
        return False, f"Attività nette di apertura {_fmt(att0)} invece di 94.000,00.", {}
    return True, "Ambiente corretto: azienda didattica attiva, apertura quadrata a 94.000,00.", {
        "azienda": s.company.code if s.company else None, "attivita_nette_apertura": str(att0), "attivita_nette_oggi": str(att)}


def _v_documento(s, sc, cfg, *_):
    docs = _documenti_validi(s.company_id, cfg["doc_types"])
    esiti = [(e, _confronta(sc, e, cfg)) for e in docs]
    giusti = [e for e, p in esiti if not p]
    if len(giusti) > 1:
        return False, ("Documento registrato più volte: " + ", ".join(e.doc_number for e in giusti)
                       + ". Storna i doppioni con FB08."), {"documenti": [e.doc_number for e in giusti]}
    if len(giusti) == 1:
        e = giusti[0]
        return True, f"Documento {e.doc_number} corretto.", {"documento": e.doc_number, "id": e.id,
                                                            "data": e.doc_date.isoformat()}
    # Diagnosi: documento più vicino (meno problemi), con soggetto/data compatibili se possibile.
    if esiti:
        e, p = min(esiti, key=lambda x: len(x[1]))
        if len(p) <= len(cfg["righe"]) + 1:
            return False, f"Il documento {e.doc_number} non è corretto: " + "; ".join(p) + ".", {
                "documento_controllato": e.doc_number, "problemi": p}
    return False, "Non trovo ancora il documento richiesto nella tua azienda didattica.", {}


def _v_pagamento(s, sc, cfg, *a):
    ok, msg, ev = _v_documento(s, sc, cfg, *a)
    if not ok:
        return ok, msg, ev
    fattura = _documento_del_passo(s, sc, cfg["fattura_passo"])
    if fattura is None:
        return False, f"Prima rendi valido il passo {cfg['fattura_passo']} (fattura).", ev
    res = residuo_fattura(fattura)
    if res != _d(cfg["residuo_atteso"]):
        return False, (f"Il pagamento è registrato ma il residuo della fattura {fattura.doc_number} è {_fmt(res)} "
                       f"invece di {_fmt(cfg['residuo_atteso'])}: l'importo non è stato abbinato alla partita giusta. "
                       "Storna il pagamento e ripetilo dallo Scadenzario selezionando la rata della fattura."), ev
    ev.update({"fattura": fattura.doc_number, "residuo": str(res)})
    return True, f"{msg} Residuo della fattura {fattura.doc_number}: {_fmt(res)}.", ev


def _v_saldi(s, sc, cfg, *_):
    attesi = cfg["saldi"]
    osservati = {
        "banca": _saldo_ruolo(sc, s.company_id, "banca"),
        "crediti": _saldo_ruolo(sc, s.company_id, "crediti"),
        "debiti": _saldo_ruolo(sc, s.company_id, "debiti"),
        "impianti_netti": _saldo_ruolo(sc, s.company_id, "impianti") + _saldo_ruolo(sc, s.company_id, "fondo"),
    }
    errori = [f"{k.replace('_', ' ')} {_fmt(abs(osservati[k]))} invece di {_fmt(abs(v))}"
              for k, v in attesi.items() if osservati[k] != _d(v)]
    for step_id, atteso in cfg.get("residui", {}).items():
        f = _documento_del_passo(s, sc, step_id)
        if f is None or residuo_fattura(f) != _d(atteso):
            errori.append(f"residuo della partita del passo {step_id} diverso da {_fmt(atteso)}")
    ev = {k: str(v) for k, v in osservati.items()}
    if errori:
        return False, "Saldi da rivedere: " + "; ".join(errori) + ".", ev
    return True, "Banca 50.000, crediti 26.000, debiti 18.000, impianti netti 23.500: riconciliati.", ev


def _v_centri(s, sc, cfg, *_):
    osservati = {}
    errori = []
    for code, atteso in cfg["centri"].items():
        cc = CostCenter.query.filter_by(code=code).first()
        q = (db.session.query(db.func.coalesce(db.func.sum(JournalLine.dare), 0),
                              db.func.coalesce(db.func.sum(JournalLine.avere), 0))
             .join(JournalEntry, JournalLine.entry_id == JournalEntry.id)
             .join(Account, JournalLine.account_id == Account.id)
             .filter(JournalEntry.company_id == s.company_id, JournalLine.cost_center_id == (cc.id if cc else -1),
                     Account.account_type == "costo"))
        dare, avere = q.one()
        osservati[code] = _d(dare) - _d(avere)
        if osservati[code] != _d(atteso):
            errori.append(f"{code} {_fmt(osservati[code])} invece di {_fmt(atteso)}")
    ev = {k: str(v) for k, v in osservati.items()}
    ev["scostamenti"] = {k: str(osservati[k] - _d(b)) for k, b in cfg.get("budget", {}).items()}
    if errori:
        return False, "Costi per centro da rivedere: " + "; ".join(errori) + ".", ev
    return True, "CC-PROD 13.500 (+500 sul budget), CC-AMM 3.000 (−500): totale 16.500.", ev


def _v_quadratura(s, sc, cfg, *_):
    anno, mese = sc["periodo"]["anno"], sc["periodo"]["mese"]
    import calendar
    inizio, fine = date(anno, mese, 1), date(anno, mese, calendar.monthrange(anno, mese)[1])
    stornati = {e.id for e in JournalEntry.query.filter_by(company_id=s.company_id, is_reversed=True)}
    q = (db.session.query(JournalEntry.id, JournalEntry.reverses_id, JournalEntry.reference,
                          db.func.coalesce(db.func.sum(JournalLine.dare), 0),
                          db.func.coalesce(db.func.sum(JournalLine.avere), 0))
         .join(JournalLine, JournalLine.entry_id == JournalEntry.id)
         .filter(JournalEntry.company_id == s.company_id, JournalEntry.doc_date >= inizio,
                 JournalEntry.doc_date <= fine)
         .group_by(JournalEntry.id, JournalEntry.reverses_id, JournalEntry.reference))
    dare_tot = avere_tot = ZERO
    for eid, rev_id, ref, d, a in q.all():
        if ref == APERTURA_REF or eid in stornati or rev_id in stornati:
            continue
        dare_tot += _d(d)
        avere_tot += _d(a)
    ricavi = -sum((_saldo_ruolo(sc, s.company_id, r) for r in ("ricavi",)), ZERO)
    costi = sum((_saldo_ruolo(sc, s.company_id, r) for r in ("acquisti", "servizi", "personale", "utenze", "ammortamenti")), ZERO)
    risultato = ricavi - costi
    totale = sum((_saldo_ruolo(sc, s.company_id, r) for r in ("banca", "crediti", "impianti", "fondo")), ZERO)
    ev = {"dare_mese": str(dare_tot), "avere_mese": str(avere_tot), "ricavi": str(ricavi), "costi": str(costi),
          "risultato": str(risultato), "totale_patrimoniale": str(totale)}
    errori = []
    if dare_tot != avere_tot or dare_tot != _d(cfg["movimenti_mese"]):
        errori.append(f"movimenti del mese Dare {_fmt(dare_tot)} / Avere {_fmt(avere_tot)} invece di {_fmt(cfg['movimenti_mese'])}")
    if risultato != _d(cfg["risultato"]):
        errori.append(f"risultato {_fmt(risultato)} invece di {_fmt(cfg['risultato'])}")
    if totale != _d(cfg["totale_patrimoniale"]):
        errori.append(f"totale patrimoniale {_fmt(totale)} invece di {_fmt(cfg['totale_patrimoniale'])}")
    if errori:
        return False, "Bilancio da rivedere: " + "; ".join(errori) + ".", ev
    margine = (risultato / ricavi * 100).quantize(Decimal("0.01")) if ricavi else ZERO
    return True, (f"Movimenti 51.500 = 51.500; risultato 1.500 (margine {str(margine).replace('.', ',')}%); "
                  "totale patrimoniale 99.500."), ev


VALIDATORI = {"ambiente": _v_ambiente, "documento": _v_documento, "pagamento": _v_pagamento,
              "saldi": _v_saldi, "centri": _v_centri, "quadratura": _v_quadratura}


def _valuta(s, sc, step, azienda_corrente_id, stati):
    mancanti = [d for d in step.get("dipende_da", []) if stati.get(d) != "verificato"]
    if mancanti:
        return False, "Prima completa: " + ", ".join(mancanti) + ".", {}
    return VALIDATORI[step["validator"]["tipo"]](s, sc, step["validator"], azienda_corrente_id)


def _stati(s):
    return {r.step_id: r.status for r in s.results}


def verifica_passo(s, step_id, azienda_corrente_id):
    """Esegue il validatore e salva l'esito. Idempotente: ripetere la verifica
    di un passo già verificato non lo conta due volte."""
    sc = carica_percorso(s.scenario_id)
    step = next((p for p in sc["passi"] if p["id"] == step_id), None)
    if step is None:
        raise PercorsoError("Passo inesistente")
    ok, msg, ev = _valuta(s, sc, step, azienda_corrente_id, _stati(s))
    r = AcademyStepResult.query.filter_by(session_id=s.id, step_id=step_id).first()
    if r is None:
        r = AcademyStepResult(session_id=s.id, step_id=step_id, attempts=0)
        db.session.add(r)
    r.attempts = (r.attempts or 0) + 1
    now = datetime.utcnow()
    if ok:
        if r.status != "verificato":
            r.verified_at = now
        r.status = "verificato"
    else:
        r.status = "invalidato" if r.status == "verificato" else "da_rivedere"
    r.message = msg[:500]
    r.evidence = json.dumps(ev, ensure_ascii=False, default=str)
    r.updated_at = now
    s.updated_at = now
    db.session.commit()
    return r


def rivaluta(s, azienda_corrente_id):
    """Ricontrolla i passi già verificati (es. dopo uno storno). Un passo che
    non è più valido diventa «invalidato»: non viene mostrato come completato."""
    sc = carica_percorso(s.scenario_id)
    stati = _stati(s)
    cambiati = False
    for step in sc["passi"]:
        if stati.get(step["id"]) != "verificato":
            continue
        if step["validator"]["tipo"] == "ambiente":
            continue  # dipende dalla sessione del browser, non dai documenti
        ok, msg, ev = _valuta(s, sc, step, azienda_corrente_id, stati)
        if not ok:
            r = AcademyStepResult.query.filter_by(session_id=s.id, step_id=step["id"]).first()
            r.status = "invalidato"
            r.message = ("Non più valido: " + msg)[:500]
            r.updated_at = datetime.utcnow()
            stati[step["id"]] = "invalidato"
            cambiati = True
    if cambiati:
        db.session.commit()
    return stati


def contatore(s):
    sc = carica_percorso(s.scenario_id)
    obbligatori = [p["id"] for p in sc["passi"] if p.get("obbligatorio")]
    stati = _stati(s)
    c = sum(1 for p in obbligatori if stati.get(p) == "verificato")
    n = len(obbligatori)
    prossimo = next((p for p in obbligatori if stati.get(p) != "verificato"), None)
    return {"verificati": c, "totale": n, "percentuale": round(100 * c / n) if n else 0, "prossimo": prossimo}
