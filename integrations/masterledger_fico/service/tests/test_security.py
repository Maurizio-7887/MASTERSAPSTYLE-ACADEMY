from extensions import db
from models import User


def test_anonymous_is_redirected_from_accounting(client):
    r = client.get("/gl/journal_entry")
    assert r.status_code == 302 and "/auth/login" in r.headers["Location"]


def test_open_redirect_after_login_is_blocked(client):
    r = client.post("/auth/login?next=https://evil.example/", data={"username": "tester", "password": "secret"})
    assert r.status_code == 302
    assert "evil.example" not in r.headers["Location"]


def test_payroll_account_config_is_commercialista_only(client, app):
    with app.app_context():
        uid = User.query.filter_by(username="operator").one().id
    with client.session_transaction() as session:
        session["_user_id"] = str(uid); session["_fresh"] = True
    assert client.get("/paghe/config").status_code == 403


def test_csrf_rejects_post_without_token(client, app):
    app.config["WTF_CSRF_ENABLED"] = True
    try:
        response = client.post("/auth/login", data={"username": "tester", "password": "secret"})
        assert response.status_code == 400
        page = client.get("/auth/login")
        assert b'name="csrf_token"' in page.data
    finally:
        app.config["WTF_CSRF_ENABLED"] = False


def test_logout_is_not_get_side_effect(login):
    assert login.get("/auth/logout").status_code == 405


def test_desk_user_redirected_to_desk_home_after_login(client, app):
    r = client.post("/auth/login", data={"username": "deskuser", "password": "secret"},
                    follow_redirects=True)
    assert r.status_code == 200
    assert r.request.path == "/desk"


def test_ledger_user_redirected_to_ledger_home_after_login(client, app):
    r = client.post("/auth/login", data={"username": "tester", "password": "secret"},
                    follow_redirects=True)
    assert r.status_code == 200
    assert r.request.path == "/ledger"


def test_desk_user_cannot_open_ledger_routes_even_by_url(client, app):
    with app.app_context():
        uid = User.query.filter_by(username="deskuser").one().id
    with client.session_transaction() as session:
        session["_user_id"] = str(uid); session["_fresh"] = True
    for path in ("/gl/journal_entry", "/ap/supplier_invoice", "/ar/customer_invoice",
                "/assets/", "/costs/", "/paghe/"):
        assert client.get(path).status_code == 403, f"{path} avrebbe dovuto dare 403 a un utente desk"


def test_desk_user_can_open_operational_routes(client, app):
    with app.app_context():
        uid = User.query.filter_by(username="deskuser").one().id
    with client.session_transaction() as session:
        session["_user_id"] = str(uid); session["_fresh"] = True
    for path in ("/sd/quotations", "/mm/rfq", "/materials/", "/logistics/magazzino"):
        assert client.get(path).status_code == 200, f"{path} avrebbe dovuto essere accessibile a un utente desk"


def test_ledger_user_not_restricted_from_operational_routes(login):
    assert login.get("/sd/quotations").status_code == 200
