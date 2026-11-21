"""Accesso unico dal portale e confinamento degli allievi (STYLESAPFICO, Fase B)."""
import time

from flask import g
from itsdangerous import URLSafeTimedSerializer

from extensions import db
from models import AcademySession, Company, JournalEntry, User
from services.ponte_portale import SALT
from tests.test_academy_percorso import avvia, svolgi_caso, verifica


def biglietto(app, uid, ruolo="allievo", nome="Allieva Uno", nonce=None):
    s = URLSafeTimedSerializer(app.config["SECRET_KEY"], salt=SALT)
    return s.dumps({"uid": uid, "nome": nome, "ruolo": ruolo, "nonce": nonce or f"n-{uid}-{time.time_ns()}"})


def entra(app, uid, ruolo="allievo", nome="Allieva Uno"):
    c = app.test_client()
    g.pop("_login_user", None)
    r = c.get("/academy-fico/ponte?t=" + biglietto(app, uid, ruolo, nome))
    assert r.status_code == 302 and r.headers["Location"].endswith("/academy-fico/percorso"), r.data
    g.pop("_login_user", None)
    return c


def test_biglietto_valido_crea_utente_e_apre_la_sessione(app):
    c = entra(app, 7)
    assert c.get("/academy-fico/percorso").status_code == 200
    u = User.query.filter_by(username="portale-7").one()
    assert u.role == "operatore" and u.full_name == "Allieva Uno" and u.portal == "ledger"
    d = entra(app, 1, ruolo="docente", nome="Maurizio")
    assert User.query.filter_by(username="portale-1").one().role == "commercialista"
    assert d.get("/academy-fico/percorso/classe").status_code == 200


def test_biglietto_monouso_scaduto_o_falso(app):
    c = app.test_client()
    t = biglietto(app, 9, nonce="unico")
    assert c.get("/academy-fico/ponte?t=" + t).status_code == 302
    g.pop("_login_user", None)
    c2 = app.test_client()
    r = c2.get("/academy-fico/ponte?t=" + t)
    assert r.status_code == 400 and "già usato" in r.get_data(as_text=True)
    falso = URLSafeTimedSerializer("altra-chiave", salt=SALT).dumps({"uid": 9, "nome": "x", "ruolo": "docente", "nonce": "z"})
    assert c2.get("/academy-fico/ponte?t=" + falso).status_code == 400
    assert c2.get("/academy-fico/ponte").status_code == 400
    vecchio = URLSafeTimedSerializer(app.config["SECRET_KEY"], salt=SALT)
    import itsdangerous.timed as timed
    orig = timed.TimestampSigner.get_timestamp
    timed.TimestampSigner.get_timestamp = lambda self: int(time.time()) - 600
    try:
        t_old = vecchio.dumps({"uid": 9, "nome": "x", "ruolo": "allievo", "nonce": "vecchio"})
    finally:
        timed.TimestampSigner.get_timestamp = orig
    r = c2.get("/academy-fico/ponte?t=" + t_old)
    assert r.status_code == 400 and "scaduto" in r.get_data(as_text=True)


def test_allievo_svolge_il_percorso_dal_portale(app):
    c = entra(app, 11)
    sid = avvia(c, app)
    svolgi_caso(c, app, sid)
    for step in ["B8-02", "B8-03", "B8-04", "B8-05", "B8-06", "B8-07", "B8-08", "B8-09", "B8-10", "B8-11", "B8-12"]:
        assert verifica(c, sid, step)["stato"] == "verificato", step


def test_allievo_confinato_nella_propria_azienda(app):
    a = entra(app, 21, nome="Allievo A")
    sid_a = avvia(a, app)
    svolgi_caso(a, app, sid_a)
    comp_a = db.session.get(AcademySession, sid_a).company_id
    doc_a = JournalEntry.query.filter_by(company_id=comp_a, reference="B8-V01").one().id
    g.pop("_login_user", None)

    b = entra(app, 22, nome="Allievo B")
    sid_b = avvia(b, app)
    comp_b = db.session.get(AcademySession, sid_b).company_id
    # configurazione e moduli fuori percorso: chiusi
    assert b.get("/gl/account-mapping").status_code == 403
    assert b.get("/gl/periods").status_code == 403
    assert b.post("/imposta-azienda-corrente", data={"company_id": str(comp_a)}).status_code == 403
    # anche forzando la sessione sull'azienda di A, la guardia riporta B nella sua
    with b.session_transaction() as sess:
        sess["azienda_corrente_id"] = comp_a
    g.pop("_login_user", None)
    html = b.get("/gl/").get_data(as_text=True)
    assert "B8-V01" not in html
    with b.session_transaction() as sess:
        assert sess["azienda_corrente_id"] == comp_b
    # documento di A aperto per numero: non esiste per B
    g.pop("_login_user", None)
    assert b.get(f"/gl/entry/{doc_a}").status_code == 404
    assert b.post(f"/gl/entry/{doc_a}/reverse").status_code == 404
    # libro mastro e report CO: solo i movimenti di B (solo apertura, nessun costo)
    g.pop("_login_user", None)
    assert "Personale settembre" not in b.get("/gl/libro-mastro").get_data(as_text=True)
    g.pop("_login_user", None)
    co = b.get("/costs/report").get_data(as_text=True)
    assert "13500" not in co.replace(".", "").replace(",00", "")
    # selettore azienda: B vede solo la propria
    g.pop("_login_user", None)
    page = b.get("/academy-fico/percorso").get_data(as_text=True)
    assert db.session.get(Company, comp_a).name not in page


def test_docente_non_confinato(app):
    d = entra(app, 31, ruolo="docente", nome="Docente")
    assert d.get("/gl/periods").status_code == 200
