"""Fase 2 FI: bilancio di verifica, bilancio, registri e liquidazione IVA,
chiusura e riapertura, ratei e risconti, FB02, pareggi.

Scenario numerico (anno 2026), controllato a mano:
  02/01 versamento capitale      Banca 10.000  / Capitale 10.000
  15/01 fattura cliente          Crediti 1.220 / Ricavi 1.000 + IVA deb. 220
  20/01 fattura fornitore        Acquisti 500 + IVA cred. 110 / Debiti 610
  Utile 500; IVA gennaio da versare 110.
"""
from datetime import date
from decimal import Decimal

import pytest

from extensions import db
from models import Account, AccountMapping, Company, JournalEntry, JournalEntryChange, InvoiceInstallment
from services.posting import post_journal_entry, reverse_journal_entry

D = Decimal

CONTI_FASE2 = [
    ("300000", "Capitale sociale", "patrimoniale_passivo", None),
    ("190000", "Erario c/IVA credito", "patrimoniale_attivo", "erario_iva_credito"),
    ("230000", "Erario c/IVA debito", "patrimoniale_passivo", "erario_iva_debito"),
    ("303000", "Utile d'esercizio", "patrimoniale_passivo", "utile_esercizio"),
    ("304000", "Perdita d'esercizio", "patrimoniale_attivo", "perdita_esercizio"),
    ("998000", "Conto economico", "patrimoniale_passivo", "conto_economico_epilogo"),
    ("999000", "Stato patrimoniale finale", "patrimoniale_passivo", "stato_patrimoniale_finale"),
    ("999100", "Stato patrimoniale iniziale", "patrimoniale_passivo", "stato_patrimoniale_iniziale"),
    ("193000", "Ratei attivi", "patrimoniale_attivo", "ratei_attivi"),
    ("227000", "Ratei passivi", "patrimoniale_passivo", "ratei_passivi"),
    ("191000", "Risconti attivi", "patrimoniale_attivo", "risconti_attivi"),
    ("231000", "Risconti passivi", "patrimoniale_passivo", "risconti_passivi"),
]


@pytest.fixture()
def f2(app, account, cost_center):
    with app.app_context():
        for code, name, typ, concept in CONTI_FASE2:
            acc = Account.query.filter_by(code=code).first()
            if not acc:
                acc = Account(code=code, name=name, account_type=typ)
                db.session.add(acc)
                db.session.flush()
            if concept and not AccountMapping.query.filter_by(concept_key=concept).first():
                db.session.add(AccountMapping(concept_key=concept, account_id=acc.id, label=name, category="test"))
        acq = account("410000")
        acq.cost_relevant, acq.cost_relevant_type = True, "COST"
        db.session.commit()
    return app


def _ids(*codes):
    return [Account.query.filter_by(code=c).one().id for c in codes]


def _scenario(cc_id, anno=2026, company_id=None):
    banca, capitale, crediti, ricavi, iva_deb, acquisti, iva_cred, debiti = _ids(
        "180000", "300000", "140000", "310000", "170000", "410000", "154000", "210000")
    from models import EconomicSubject
    cliente = EconomicSubject.query.filter_by(code="C0001").one()
    fornitore = EconomicSubject.query.filter_by(code="F0001").one()
    post_journal_entry("SA", "10", date(anno, 1, 2), "Versamento capitale", [
        {"account_id": banca, "dare": "10000", "avere": 0},
        {"account_id": capitale, "dare": 0, "avere": "10000"}], posting_date=date(anno, 1, 2), company_id=company_id)
    dr = post_journal_entry("DR", "14", date(anno, 1, 15), "Fattura 1", [
        {"account_id": crediti, "dare": "1220", "avere": 0},
        {"account_id": ricavi, "dare": 0, "avere": "1000"},
        {"account_id": iva_deb, "dare": 0, "avere": "220"}], reference="FT-1", economic_subject_id=cliente.id,
        gross_amount="1220", vat_rate="22", posting_date=date(anno, 1, 15), commit=False, company_id=company_id)
    from services.payments import create_installments_for_invoice
    create_installments_for_invoice(dr)
    kr = post_journal_entry("KR", "19", date(anno, 1, 20), "Fattura fornitore", [
        {"account_id": acquisti, "dare": "500", "avere": 0, "cost_center_id": cc_id},
        {"account_id": iva_cred, "dare": "110", "avere": 0},
        {"account_id": debiti, "dare": 0, "avere": "610"}], reference="A-1", economic_subject_id=fornitore.id,
        gross_amount="610", posting_date=date(anno, 1, 20), company_id=company_id)
    db.session.commit()
    return dr, kr


def _saldo(code, al, escludi=()):
    from services.bilancio import saldo_conto
    return saldo_conto(Account.query.filter_by(code=code).one().id, al=al, escludi_tipi=escludi)


# ── Bilancio di verifica e bilancio ─────────────────────────────

def test_bilancio_di_verifica_e_bilancio(f2, cost_center):
    from services.bilancio import bilancio_di_verifica, bilancio
    with f2.app_context():
        _scenario(cost_center().id)
        bv = bilancio_di_verifica(date(2026, 1, 1), date(2026, 12, 31))
        assert bv["quadra"]
        assert bv["totali"]["dare"] == bv["totali"]["avere"] == D("11830.00")
        b = bilancio(date(2026, 12, 31))
        assert b["quadra"]
        assert b["totali"]["patrimoniale_attivo"] == D("11330.00")
        assert b["totali"]["patrimoniale_passivo"] == D("10830.00")
        assert b["risultato"] == D("500.00")
        # Conti economici ripartono dal 1/1 anche partendo a metà anno
        bv_feb = bilancio_di_verifica(date(2026, 2, 1), date(2026, 12, 31))
        ricavi = next(r for r in bv_feb["righe"] if r["account"].code == "310000")
        assert ricavi["iniziale"] == D("-1000.00") and bv_feb["quadra"]


def test_pagine_bilancio(f2, login, cost_center):
    with f2.app_context():
        _scenario(cost_center().id)
    html = login.get("/chiusure/bilancio-verifica?dal=2026-01-01&al=2026-12-31").get_data(as_text=True)
    assert "quadra" in html and "11.830,00" in html
    html = login.get("/chiusure/bilancio?al=2026-12-31").get_data(as_text=True)
    assert "500,00" in html and "il bilancio quadra" in html


# ── IVA ─────────────────────────────────────────────────────────

def test_registri_iva(f2, cost_center, account):
    from services.iva import registri
    with f2.app_context():
        _scenario(cost_center().id)
        crediti, ricavi, iva_deb = _ids("140000", "310000", "170000")
        from models import EconomicSubject
        cliente = EconomicSubject.query.filter_by(code="C0001").one()
        post_journal_entry("DG", "17", date(2026, 1, 25), "Nota di credito", [
            {"account_id": ricavi, "dare": "100", "avere": 0},
            {"account_id": iva_deb, "dare": "22", "avere": 0},
            {"account_id": crediti, "dare": 0, "avere": "122"}], reference="NC-1",
            economic_subject_id=cliente.id, gross_amount="122", posting_date=date(2026, 1, 25))
        r = registri(date(2026, 1, 1), date(2026, 1, 31))
        assert [x["imponibile"] for x in r["vendite"]] == [D("1000.00"), D("-100.00")]
        assert r["tot_vendite"] == {"imponibile": D("900.00"), "imposta": D("198.00")}
        assert r["tot_acquisti"] == {"imponibile": D("500.00"), "imposta": D("110.00")}
        assert r["acquisti"][0]["aliquota"] == D("22.0")


def test_liquidazione_iva_con_credito_riportato(f2, cost_center):
    from services.iva import calcola_liquidazione, registra_liquidazione, annulla_liquidazione, IvaError
    with f2.app_context():
        _scenario(cost_center().id)
        calc = calcola_liquidazione(2026, 1, tipo="mensile")
        assert (calc["iva_debito"], calc["iva_credito"], calc["da_versare"]) == (D("220.00"), D("110.00"), D("110.00"))
        entry, _ = registra_liquidazione(2026, 1)
        assert entry.posting_date == date(2026, 1, 31) and entry.is_balanced
        assert _saldo("170000", date(2026, 1, 31)) == 0 and _saldo("154000", date(2026, 1, 31)) == 0
        assert _saldo("230000", date(2026, 1, 31)) == D("-110.00")
        with pytest.raises(IvaError):
            registra_liquidazione(2026, 1)

        # Febbraio: solo acquisti, credito 50 da riportare
        acq, iva_cred, deb = _ids("410000", "154000", "210000")
        post_journal_entry("KR", "19", date(2026, 2, 10), "Acquisto", [
            {"account_id": acq, "dare": "250", "avere": 0, "cost_center_id": cost_center().id},
            {"account_id": iva_cred, "dare": "50", "avere": 0},
            {"account_id": deb, "dare": 0, "avere": "300"}], posting_date=date(2026, 2, 10))
        registra_liquidazione(2026, 2)
        assert _saldo("190000", date(2026, 2, 28)) == D("50.00")

        # Marzo: IVA a debito 30, compensata con il credito di febbraio
        cre, ric, iva_deb = _ids("140000", "310000", "170000")
        post_journal_entry("DR", "14", date(2026, 3, 5), "Vendita", [
            {"account_id": cre, "dare": "166.36", "avere": 0},
            {"account_id": ric, "dare": 0, "avere": "136.36"},
            {"account_id": iva_deb, "dare": 0, "avere": "30"}], posting_date=date(2026, 3, 5))
        calc = calcola_liquidazione(2026, 3, tipo="mensile")
        assert (calc["credito_precedente"], calc["compensato"], calc["da_versare"]) == (D("50.00"), D("30.00"), D("0.00"))
        registra_liquidazione(2026, 3)
        assert _saldo("190000", date(2026, 3, 31)) == D("20.00")

        # Si annulla solo l'ultima liquidazione
        with pytest.raises(IvaError):
            annulla_liquidazione(2026, 2)
        annulla_liquidazione(2026, 3)
        assert _saldo("190000", date(2026, 3, 31)) == D("50.00")
        assert calcola_liquidazione(2026, 3, tipo="mensile")["registrata"] is None


def test_liquidazione_trimestrale_e_interessi(f2, cost_center):
    from services.iva import calcola_liquidazione
    with f2.app_context():
        _scenario(cost_center().id)
        calc = calcola_liquidazione(2026, 1, tipo="trimestrale")
        assert calc["fine"] == date(2026, 3, 31) and calc["interessi_trimestrali"] == D("1.10")


# ── Chiusura e riapertura ───────────────────────────────────────

def test_chiusura_e_riapertura(f2, cost_center):
    from services.chiusura import chiudi_esercizio, annulla_chiusura, stato, ChiusuraError
    from services.bilancio import bilancio_di_verifica, bilancio
    with f2.app_context():
        _scenario(cost_center().id)
        creati, prev = chiudi_esercizio(2026)
        assert set(creati) == {"epilogo", "chiusura", "riapertura"}
        assert prev["risultato"] == D("500.00")
        # Dopo epilogo e chiusura tutti i conti sono a zero al 31/12
        for code in ("180000", "310000", "410000", "303000", "998000", "999000", "300000"):
            assert _saldo(code, date(2026, 12, 31)) == 0, code
        # Riapertura al 1/1/2027: saldi patrimoniali di nuovo presenti, utile in 303000
        assert _saldo("180000", date(2027, 1, 1)) == D("10000.00")
        assert _saldo("303000", date(2027, 1, 1)) == D("-500.00")
        assert _saldo("999100", date(2027, 1, 1)) == 0
        # Il bilancio 2026 continua a mostrare i saldi prima della chiusura
        assert bilancio(date(2026, 12, 31))["risultato"] == D("500.00")
        bv27 = bilancio_di_verifica(date(2027, 1, 1), date(2027, 12, 31))
        assert bv27["quadra"] and bv27["risultato_non_riportato"] == 0
        with pytest.raises(ChiusuraError):
            chiudi_esercizio(2026)
        # Annullamento con storni alla stessa data, poi nuova chiusura
        annulla_chiusura(2026)
        assert stato(2026)["chiusura"] is None
        assert _saldo("180000", date(2026, 12, 31)) == D("10000.00")
        assert _saldo("180000", date(2027, 1, 1)) == D("10000.00")
        chiudi_esercizio(2026)
        assert _saldo("180000", date(2027, 1, 1)) == D("10000.00")


def test_chiusura_richiede_esercizio_precedente_chiuso(f2, cost_center):
    from services.chiusura import chiudi_esercizio, ChiusuraError
    with f2.app_context():
        _scenario(cost_center().id, anno=2025)
        _scenario(cost_center().id, anno=2026)
        with pytest.raises(ChiusuraError, match="2025"):
            chiudi_esercizio(2026)
        chiudi_esercizio(2025)
        chiudi_esercizio(2026)
        assert _saldo("303000", date(2027, 1, 1)) == D("-1000.00")


def test_chiusura_per_azienda_con_piu_aziende(f2, cost_center):
    from services.chiusura import chiudi_esercizio, ChiusuraError
    with f2.app_context():
        a = Company(code="AAA", name="Azienda A")
        b = Company(code="BBB", name="Azienda B")
        db.session.add_all([a, b])
        db.session.commit()
        _scenario(cost_center().id, company_id=a.id)
        with pytest.raises(ChiusuraError, match="Seleziona l'azienda"):
            chiudi_esercizio(2026)
        creati, prev = chiudi_esercizio(2026, company_id=a.id)
        assert prev["risultato"] == D("500.00")
        assert all(e.company_id == a.id for e in creati.values())


def test_pagina_esercizio(f2, login, cost_center):
    with f2.app_context():
        _scenario(cost_center().id)
    assert "500,00" in login.get("/chiusure/esercizio?anno=2026").get_data(as_text=True)
    resp = login.post("/chiusure/esercizio", data={"anno": "2026"}, follow_redirects=True)
    assert "chiuso e riaperto" in resp.get_data(as_text=True)


def _come(app, username):
    from models import User
    with app.app_context():
        uid = User.query.filter_by(username=username).one().id
    c = app.test_client()
    with c.session_transaction() as s:
        s["_user_id"] = str(uid)
        s["_fresh"] = True
    return c


def test_operatore_non_chiude_ne_liquida(f2):
    c = _come(f2, "operator")
    assert c.post("/chiusure/esercizio", data={"anno": "2026"}).status_code == 403
    assert c.post("/chiusure/liquidazione-iva", data={"anno": "2026", "numero": "1"}).status_code == 403


def test_desk_non_vede_bilanci(f2):
    c = _come(f2, "deskuser")
    assert c.get("/chiusure/bilancio").status_code == 403


# ── Ratei e risconti ────────────────────────────────────────────

def test_risconto_e_storno_automatico(f2, cost_center):
    from services.ratei import registra, esegui_storni, da_stornare, quota_giorni, RateiError
    with f2.app_context():
        _scenario(cost_center().id)
        quota, g, tot = quota_giorni(D("1200"), date(2026, 10, 1), date(2027, 3, 31), date(2026, 12, 31))
        assert (quota, g, tot) == (D("593.41"), 90, 182)
        acq = Account.query.filter_by(code="410000").one()
        with pytest.raises(RateiError):
            registra("risconto_attivo", date(2026, 12, 31), date(2027, 1, 1), acq.id, "300", "x")  # senza CdC
        e = registra("risconto_attivo", date(2026, 12, 31), date(2027, 1, 1), acq.id, "300", "Affitto",
                     cost_center_id=cost_center().id)
        assert _saldo("191000", date(2026, 12, 31)) == D("300.00")
        assert _saldo("410000", date(2026, 12, 31)) == D("200.00")
        ric = Account.query.filter_by(code="310000").one()
        with pytest.raises(RateiError):
            registra("risconto_attivo", date(2026, 12, 31), date(2027, 1, 1), ric.id, "10", "conto sbagliato")
        assert da_stornare(date(2026, 12, 31)) == []
        fatti = esegui_storni(date(2027, 1, 1))
        assert len(fatti) == 1 and fatti[0][1].posting_date == date(2027, 1, 1)
        assert _saldo("191000", date(2027, 1, 1)) == 0
        assert esegui_storni(date(2027, 1, 1)) == []


# ── FB02 ────────────────────────────────────────────────────────

def test_fb02_modifica_solo_testi_con_registro(f2, login, cost_center):
    with f2.app_context():
        dr, _ = _scenario(cost_center().id)
        sa = JournalEntry.query.filter_by(doc_type="SA").one()
        dr_id, sa_id, line_id = dr.id, sa.id, sa.lines[0].id
    login.post(f"/chiusure/documento/{sa_id}/modifica",
               data={"description": "Versamento soci", "reference": "VERB-1", f"riga_{line_id}": "Bonifico soci"})
    resp = login.post(f"/chiusure/documento/{dr_id}/modifica", data={"description": "Fattura 1", "reference": "ALTRO"},
                      follow_redirects=True)
    assert "non si modifica" in resp.get_data(as_text=True)
    with f2.app_context():
        sa = db.session.get(JournalEntry, sa_id)
        assert (sa.description, sa.reference) == ("Versamento soci", "VERB-1")
        assert JournalEntryChange.query.filter_by(entry_id=sa_id).count() == 3
        assert db.session.get(JournalEntry, dr_id).reference == "FT-1"
        assert sa.total_dare == D("10000.00")


# ── Pareggio ────────────────────────────────────────────────────

def test_pareggio_nota_di_credito_cliente(f2, cost_center):
    from services.pareggio import pareggia, annulla, note_aperte, PareggioError
    with f2.app_context():
        dr, _ = _scenario(cost_center().id)
        crediti, ricavi, iva_deb = _ids("140000", "310000", "170000")
        dg = post_journal_entry("DG", "17", date(2026, 2, 1), "NC", [
            {"account_id": ricavi, "dare": "100", "avere": 0},
            {"account_id": iva_deb, "dare": "22", "avere": 0},
            {"account_id": crediti, "dare": 0, "avere": "122"}],
            economic_subject_id=dr.economic_subject_id, gross_amount="122")
        rata = InvoiceInstallment.query.filter_by(entry_id=dr.id).one()
        with pytest.raises(PareggioError, match="per intero"):
            pareggia("clienti", dg.id, {rata.id: "100"})
        assert db.session.get(InvoiceInstallment, rata.id).residual_amount == D("1220.00")
        pareggia("clienti", dg.id, {rata.id: "122"})
        assert db.session.get(InvoiceInstallment, rata.id).residual_amount == D("1098.00")
        assert db.session.get(JournalEntry, dg.id).is_paid and note_aperte("clienti") == []
        annulla(dg.id)
        assert db.session.get(InvoiceInstallment, rata.id).residual_amount == D("1220.00")
        assert not db.session.get(JournalEntry, dg.id).is_paid


# ── Correzione storno per azienda ───────────────────────────────

def test_storno_mantiene_azienda(f2):
    with f2.app_context():
        a = Company(code="AAA", name="Azienda A")
        db.session.add(a)
        db.session.commit()
        banca, capitale = _ids("180000", "300000")
        e = post_journal_entry("SA", "10", date(2026, 1, 2), "x", [
            {"account_id": banca, "dare": "10", "avere": 0},
            {"account_id": capitale, "dare": 0, "avere": "10"}], company_id=a.id)
        storno = reverse_journal_entry(e.id)
        assert storno.company_id == a.id


def test_tutte_le_pagine_fase2(f2, login, cost_center):
    with f2.app_context():
        _scenario(cost_center().id)
    for url in ("/chiusure/bilancio-verifica", "/chiusure/bilancio", "/chiusure/registri-iva?dal=2026-01-01&al=2026-01-31",
                "/chiusure/liquidazione-iva?anno=2026&numero=1", "/chiusure/esercizio?anno=2026",
                "/chiusure/ratei-risconti", "/chiusure/documento", "/chiusure/pareggio/clienti",
                "/chiusure/pareggio/fornitori"):
        assert login.get(url).status_code == 200, url
    for code, path in (("F.01", "/chiusure/bilancio"), ("F-44", "/chiusure/pareggio/fornitori"),
                       ("FB02", "/chiusure/documento"), ("F.12", "/chiusure/liquidazione-iva")):
        assert login.get(f"/tcode/vai?cmd={code}").headers["Location"].endswith(path), code


def test_iva_vendite_per_data_documento_acquisti_per_data_registrazione(f2, cost_center):
    from services.iva import calcola_liquidazione, registri
    with f2.app_context():
        cre, ric, iva_deb, acq, iva_cred, deb = _ids("140000", "310000", "170000", "410000", "154000", "210000")
        # Fattura di vendita del 30/01 registrata il 02/02: IVA esigibile a gennaio
        post_journal_entry("DR", "14", date(2026, 1, 30), "Vendita", [
            {"account_id": cre, "dare": "122", "avere": 0}, {"account_id": ric, "dare": 0, "avere": "100"},
            {"account_id": iva_deb, "dare": 0, "avere": "22"}], posting_date=date(2026, 2, 2))
        # Fattura d'acquisto del 30/01 registrata il 02/02: IVA detraibile a febbraio
        post_journal_entry("KR", "19", date(2026, 1, 30), "Acquisto", [
            {"account_id": acq, "dare": "50", "avere": 0, "cost_center_id": cost_center().id},
            {"account_id": iva_cred, "dare": "11", "avere": 0}, {"account_id": deb, "dare": 0, "avere": "61"}],
            posting_date=date(2026, 2, 2))
        gen = calcola_liquidazione(2026, 1, tipo="mensile")
        feb = calcola_liquidazione(2026, 2, tipo="mensile")
        assert (gen["iva_debito"], gen["iva_credito"]) == (D("22.00"), D("0.00"))
        assert (feb["iva_debito"], feb["iva_credito"]) == (D("0.00"), D("11.00"))
        r = registri(date(2026, 1, 1), date(2026, 1, 31))
        assert len(r["vendite"]) == 1 and r["acquisti"] == []
