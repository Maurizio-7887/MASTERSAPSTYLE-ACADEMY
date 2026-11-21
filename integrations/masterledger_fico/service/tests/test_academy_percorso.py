"""Percorso pratico verificato Blocco 8 (STYLESAPFICO, Fase C).

Il caso viene svolto dalle STESSE schermate che userà l'allievo (FB70, FB60,
Scadenzario, Prima nota) e verificato dal server: niente stati inviati dal browser.
"""
from decimal import Decimal

from extensions import db
from models import (Account, AcademySession, AcademyStepResult, CostCenter, EconomicSubject,
                    InvoiceInstallment, JournalEntry, User)
from services.academy_percorso import carica_percorso, contatore
from services.posting import reverse_journal_entry
from flask import g


def cambia_utente():
    """Il fixture app tiene aperto un app context condiviso fra le richieste:
    Flask-Login memorizza l'utente in g. Lo si azzera quando si cambia client,
    altrimenti il test userebbe l'utente della richiesta precedente."""
    g.pop("_login_user", None)


def _id(model, code):
    return model.query.filter_by(code=code).one().id


def avvia(client, app, mode="studio"):
    r = client.post("/academy-fico/percorso/avvia", data={"scenario_id": "B8-SET2028", "mode": mode})
    assert r.status_code == 302, r.data
    with app.app_context():
        s = AcademySession.query.order_by(AcademySession.id.desc()).first()
        return s.id


def verifica(client, sid, step):
    r = client.post(f"/academy-fico/percorso/{sid}/verifica/{step}")
    assert r.status_code == 200, r.data
    return r.get_json()


def fb70(client, app, numero="B8-V01", data="2028-09-03", importo="18000", soggetto="B8-ALFA", natura="N2.2", iva="0"):
    with app.app_context():
        form = {"customer_id": str(_id(EconomicSubject, soggetto)), "invoice_number": numero, "invoice_date": data,
                "description": "Vendita transenne", "line_description[]": "Transenne", "line_net[]": importo,
                "line_vat_rate[]": iva, "line_natura[]": natura, "line_account_id[]": str(_id(Account, "400100")),
                "line_cost_center_id[]": ""}
    return client.post("/ar/customer_invoice", data=form)


def fb60(client, app, soggetto, numero, data, conto, centro, importo):
    with app.app_context():
        form = {"vendor_id": str(_id(EconomicSubject, soggetto)), "invoice_number": numero, "invoice_date": data,
                "description": "Fattura fornitore", "line_description[]": "Fornitura", "line_net[]": importo,
                "line_vat_rate[]": "0", "line_pct_indetraibile[]": "0",
                "line_expense_account_id[]": str(_id(Account, conto)),
                "line_cost_center_id[]": str(_id(CostCenter, centro)) if centro else ""}
    return client.post("/ap/supplier_invoice", data=form)


def fb50(client, app, data, righe, descrizione="Prima nota"):
    with app.app_context():
        form = {"doc_date": data, "description": descrizione, "account_id[]": [], "pk[]": [], "amount[]": [],
                "cost_center_id[]": []}
        for codice, pk, importo, centro in righe:
            form["account_id[]"].append(str(_id(Account, codice)))
            form["pk[]"].append(pk)
            form["amount[]"].append(importo)
            form["cost_center_id[]"].append(str(_id(CostCenter, centro)) if centro else "")
    return client.post("/gl/journal_entry", data=form)


def paga_rata(client, app, numero_fattura, contanti, data):
    with app.app_context():
        e = JournalEntry.query.filter_by(reference=numero_fattura, is_reversed=False).one()
        inst = InvoiceInstallment.query.filter_by(entry_id=e.id).one()
        iid = inst.id
    return client.post("/gl/scadenzario/paga", data={"installment_id[]": str(iid), f"cash_{iid}": contanti,
                                                     f"abbuono_{iid}": "0", "doc_date": data})


def svolgi_caso(client, app, sid):
    assert verifica(client, sid, "B8-01")["stato"] == "verificato"
    fb70(client, app)
    fb60(client, app, "B8-BETA", "B8-A01", "2028-09-05", "500100", "CC-PROD", "7000")
    fb60(client, app, "B8-GAMMA", "B8-A02", "2028-09-07", "510100", "CC-AMM", "2000")
    paga_rata(client, app, "B8-V01", "12000", "2028-09-10")
    paga_rata(client, app, "B8-A01", "5000", "2028-09-12")
    with app.app_context():
        banca = Account.query.filter_by(code="180000").one().code
    fb50(client, app, "2028-09-18", [("520100", "40", "6000", "CC-PROD"), (banca, "50", "6000", None)])
    fb50(client, app, "2028-09-24", [("540100", "40", "1000", "CC-AMM"), (banca, "50", "1000", None)])
    fb50(client, app, "2028-09-30", [("530100", "40", "500", "CC-PROD"), ("018000", "50", "500", None)])


def test_percorso_completo_al_100_per_cento(login, app):
    sid = avvia(login, app)
    page = login.get(f"/academy-fico/percorso/{sid}")
    assert page.status_code == 200 and "0 / 12" in page.get_data(as_text=True)
    svolgi_caso(login, app, sid)
    for step in ["B8-02", "B8-03", "B8-04", "B8-05", "B8-06", "B8-07", "B8-08", "B8-09", "B8-10", "B8-11", "B8-12"]:
        d = verifica(login, sid, step)
        assert d["stato"] == "verificato", (step, d["messaggio"])
    assert d["contatore"] == {"verificati": 12, "totale": 12, "percentuale": 100, "prossimo": None}
    with app.app_context():
        r = AcademyStepResult.query.filter_by(session_id=sid, step_id="B8-12").one()
        assert '"risultato": "1500.00"' in r.evidence and '"totale_patrimoniale": "99500.00"' in r.evidence
    # ripresa da altro dispositivo: lo stato viene dal server
    stato = login.get(f"/academy-fico/percorso/{sid}/stato").get_json()
    assert stato["contatore"]["percentuale"] == 100


def test_errori_diagnosticati_e_nessun_doppio_conteggio(login, app):
    sid = avvia(login, app)
    verifica(login, sid, "B8-01")
    fb70(login, app, data="2028-09-04")  # data sbagliata
    d = verifica(login, sid, "B8-02")
    assert d["stato"] == "da_rivedere" and "04/09/2028" in d["messaggio"]
    with app.app_context():
        wrong = JournalEntry.query.filter_by(reference="B8-V01").one().id
        reverse_journal_entry(wrong)
    fb70(login, app)
    assert verifica(login, sid, "B8-02")["stato"] == "verificato"
    again = verifica(login, sid, "B8-02")  # doppio clic: nessun doppio conteggio
    assert again["contatore"]["verificati"] == 2
    fb70(login, app, numero="B8-V01-BIS")  # fattura duplicata
    d = verifica(login, sid, "B8-02")
    assert d["stato"] == "invalidato" and "più volte" in d["messaggio"]


def test_iva_non_ammessa_e_centro_di_costo_obbligatorio(login, app):
    sid = avvia(login, app)
    verifica(login, sid, "B8-01")
    fb70(login, app, iva="22", natura="")
    d = verifica(login, sid, "B8-02")
    assert d["stato"] == "da_rivedere" and "righe non previste" in d["messaggio"]
    fb60(login, app, "B8-BETA", "B8-A01", "2028-09-05", "500100", "CC-AMM", "7000")  # centro sbagliato
    d = verifica(login, sid, "B8-03")
    assert d["stato"] == "da_rivedere" and "CC-PROD" in d["messaggio"]


def test_storno_invalida_i_passi_dipendenti(login, app):
    sid = avvia(login, app)
    svolgi_caso(login, app, sid)
    for step in ["B8-02", "B8-05"]:
        assert verifica(login, sid, step)["stato"] == "verificato"
    with app.app_context():
        pay = JournalEntry.query.filter_by(doc_type="DZ", is_reversed=False).filter(JournalEntry.reverses_id.is_(None)).one()
        reverse_journal_entry(pay.id)
    html = login.get(f"/academy-fico/percorso/{sid}").get_data(as_text=True)
    assert "Non più valido" in html
    with app.app_context():
        assert AcademyStepResult.query.filter_by(session_id=sid, step_id="B8-05").one().status == "invalidato"
        s = db.session.get(AcademySession, sid)
        assert contatore(s)["verificati"] == 2  # B8-01 e B8-02 restano validi


def test_isolamento_tra_allievi(login, app, client):
    sid = avvia(login, app)
    svolgi_caso(login, app, sid)
    with app.app_context():
        other = User(username="allievo2", full_name="Allievo Due", role="operatore")
        other.set_password("x")
        db.session.add(other)
        db.session.commit()
        oid = other.id
    c2 = app.test_client()
    with c2.session_transaction() as sess:
        sess["_user_id"] = str(oid)
        sess["_fresh"] = True
    cambia_utente()
    # non può aprire né verificare la sessione altrui (anche cambiando l'URL)
    assert c2.get(f"/academy-fico/percorso/{sid}").status_code == 404
    assert c2.post(f"/academy-fico/percorso/{sid}/verifica/B8-02").status_code == 404
    # la sua sessione parte da zero e non vede i documenti del primo allievo
    sid2 = avvia(c2, app)
    assert sid2 != sid
    verifica(c2, sid2, "B8-01")
    d = verifica(c2, sid2, "B8-02")
    assert d["stato"] == "da_rivedere" and d["contatore"]["verificati"] == 1
    # vista classe riservata al docente
    assert c2.get("/academy-fico/percorso/classe").status_code == 403
    cambia_utente()
    assert login.get("/academy-fico/percorso/classe").status_code == 200


def test_azienda_corrente_diversa_blocca_il_controllo_ambiente(login, app):
    sid = avvia(login, app)
    login.post("/imposta-azienda-corrente", data={"company_id": ""})
    with login.session_transaction() as sess:
        sess.pop("azienda_corrente_id", None)
    d = verifica(login, sid, "B8-01")
    assert d["stato"] == "da_rivedere" and "azienda didattica" in d["messaggio"]


def test_prova_autonoma_non_rivela_dettagli(login, app):
    sid = avvia(login, app, mode="prova")
    verifica(login, sid, "B8-01")
    fb70(login, app, data="2028-09-04")
    d = verifica(login, sid, "B8-02")
    assert d["stato"] == "da_rivedere" and "04/09" not in d["messaggio"]
    html = login.get(f"/academy-fico/percorso/{sid}").get_data(as_text=True)
    assert "400100 Ricavi vendite (B8)" not in html


def test_catalogo_coerente():
    sc = carica_percorso("B8-SET2028")
    ids = [p["id"] for p in sc["passi"]]
    assert len(ids) == len(set(ids)) == 12
    for p in sc["passi"]:
        assert all(d in ids for d in p["dipende_da"])
        for campo in ("obiettivo", "prerequisiti", "funzione", "cosa_cliccare", "cosa_scrivere",
                      "prima_di_confermare", "risultato_atteso", "se_sbaglio", "approfondimento", "validator"):
            assert p.get(campo), (p["id"], campo)
    # Giornale del mese: 8 operazioni, 51.500 per lato
    tot = sum(Decimal(str(r["importo"])) for p in sc["passi"] if p["validator"]["tipo"] in ("documento", "pagamento")
              for r in p["validator"]["righe"] if r["lato"] == "dare")
    assert tot == Decimal("51500")
