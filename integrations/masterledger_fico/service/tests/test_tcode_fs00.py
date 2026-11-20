"""Campo comandi SAP (codici transazione) e FS00 anagrafica conti."""
from datetime import date

from extensions import db
from models import Account, AccountMapping, User
from services.tcodes import TCODES, PREVISTI, parse_command
from services.posting import post_journal_entry


def _login_as(client, app, username):
    with app.app_context():
        uid = User.query.filter_by(username=username).one().id
    with client.session_transaction() as s:
        s["_user_id"] = str(uid)
        s["_fresh"] = True
    return client


# ── Codici transazione ─────────────────────────────────────────

def test_every_tcode_points_to_existing_endpoint(app):
    endpoints = {r.endpoint for r in app.url_map.iter_rules()}
    missing = {c: v[2] for c, v in TCODES.items() if v[2] not in endpoints}
    assert missing == {}
    assert not set(TCODES) & set(PREVISTI)


def test_parse_command_handles_sap_prefixes():
    assert parse_command(" fb50 ") == ("FB50", False)
    assert parse_command("/nFB50") == ("FB50", False)
    assert parse_command("/oMIGO") == ("MIGO", True)
    assert parse_command("/n") == ("", False)


def test_every_active_tcode_opens_its_page(login):
    for codice, (_m, _d, endpoint, _n) in TCODES.items():
        resp = login.get("/tcode/vai", query_string={"cmd": codice})
        assert resp.status_code == 302, codice
        target = login.get(resp.headers["Location"])
        assert target.status_code < 500, (codice, endpoint, target.status_code)


def test_tcode_redirects(login):
    assert login.get("/tcode/vai?cmd=/nfb50").headers["Location"].endswith("/gl/journal_entry")
    assert login.get("/tcode/vai?cmd=FS00").headers["Location"].endswith("/gl/fs00")
    assert login.get("/tcode/vai?cmd=MIRO").headers["Location"].endswith("/mm/invoice-verification")


def test_planned_and_unknown_tcodes_go_to_list_with_message(login):
    resp = login.get("/tcode/vai?cmd=KP06", follow_redirects=True)
    assert "prevista" in resp.get_data(as_text=True)
    resp = login.get("/tcode/vai?cmd=ZZ99", follow_redirects=True)
    assert "non esiste" in resp.get_data(as_text=True)


def test_tcode_list_and_command_bar(login):
    html = login.get("/tcode/").get_data(as_text=True)
    for codice in ("FB50", "FS00", "MIGO", "MIRO", "VF01", "AFAB", "KS01", "F.01"):
        assert codice in html
    assert 'name="cmd"' in login.get("/gl/").get_data(as_text=True)


def test_desk_user_cannot_open_ledger_tcodes(client, app):
    _login_as(client, app, "deskuser")
    resp = client.get("/tcode/vai?cmd=FB50", follow_redirects=True)
    assert "non autorizzata" in resp.get_data(as_text=True)
    html = client.get("/tcode/").get_data(as_text=True)
    assert "cmd=FB50" not in html and "cmd=VA01" in html
    assert client.get("/tcode/vai?cmd=VA01").headers["Location"].endswith("/sd/orders")


# ── FS00 ───────────────────────────────────────────────────────

def test_fs00_create_account(login, app):
    resp = login.post("/gl/fs00", data={"code": "610100", "name": "Spese di consulenza",
                                        "account_type": "costo", "cost_relevant": "1"})
    assert resp.status_code == 302
    with app.app_context():
        acc = Account.query.filter_by(code="610100").one()
        assert acc.account_type == "costo" and acc.cost_relevant and acc.cost_relevant_type == "COST"
        assert acc.active


def test_fs00_rejects_duplicate_and_invalid(login, app):
    login.post("/gl/fs00", data={"code": "180000", "name": "Doppione", "account_type": "costo"})
    login.post("/gl/fs00", data={"code": "61 01", "name": "X", "account_type": "costo"})
    login.post("/gl/fs00", data={"code": "999000", "name": "Attivo CO", "account_type": "patrimoniale_attivo",
                                 "cost_relevant": "1"})
    with app.app_context():
        assert Account.query.filter_by(code="180000").one().name == "Banca"
        assert Account.query.filter_by(code="999000").first() is None


def test_fs00_edit_keeps_code_and_blocks_type_change_with_movements(login, app, account, cost_center):
    with app.app_context():
        acq, banca = account("410000"), account("180000")
        post_journal_entry("SA", "10", date(2026, 1, 2), "movimento di prova", [
            {"account_id": acq.id, "dare": "100", "avere": 0, "cost_center_id": cost_center().id},
            {"account_id": banca.id, "dare": 0, "avere": "100"},
        ])
        acq_id = acq.id
    login.post("/gl/fs00", data={"account_id": acq_id, "code": "XXXXXX", "name": "Acquisti merci",
                                 "account_type": "ricavo", "active": "1"})
    with app.app_context():
        acc = db.session.get(Account, acq_id)
        assert acc.code == "410000" and acc.account_type == "costo" and acc.name == "Acquisti"
    login.post("/gl/fs00", data={"account_id": acq_id, "name": "Acquisti merci",
                                 "account_type": "costo", "active": "1"})
    with app.app_context():
        assert db.session.get(Account, acq_id).name == "Acquisti merci"


def test_fs00_blocks_deactivation_of_mapped_account(login, app, account):
    with app.app_context():
        banca_id = account("180000").id
        assert AccountMapping.query.filter_by(account_id=banca_id).first()
    login.post("/gl/fs00", data={"account_id": banca_id, "name": "Banca", "account_type": "patrimoniale_attivo",
                                 "active": "0"})
    with app.app_context():
        assert db.session.get(Account, banca_id).active is True


def test_fs00_reserved_to_commercialista(client, app):
    _login_as(client, app, "operator")
    assert client.get("/gl/fs00").status_code == 403
    assert client.post("/gl/fs00", data={"code": "777000", "name": "X", "account_type": "costo"}).status_code == 403
