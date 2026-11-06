"""API privata di provisioning ERP per MASTER EXECUTIVE ASSISTANT.
Usa il database isolato dei test; NON richiede credenziali reali.
"""
import os
import uuid

from tests._client import app
from app.db import Utente, db

def test_executive_api_accesso_protetto_e_idempotente(monkeypatch):
    key="chiave-segreta-di-test-"+"x"*32
    monkeypatch.setenv("EXECUTIVE_API_KEY", key)
    client=app.test_client()
    url="/api/iscrizioni/executive"
    data={"email":f"executive-{uuid.uuid4().hex[:12]}@example.test","nome":"Giulia","cognome":"Neri"}

    assert client.post(url,json=data).status_code==403
    assert client.post(url,json=data,headers={"X-Api-Key":"sbagliata"}).status_code==403
    assert client.post(url,data="testo",headers={"X-Api-Key":key}).status_code==415
    assert client.post(url,json={"email":"non valido","nome":"X"},headers={"X-Api-Key":key}).status_code==400

    resp=client.post(url,json=data,headers={"X-Api-Key":key})
    assert resp.status_code==201
    body=resp.get_json()
    assert body["password"] and body["username"].startswith("exa-")
    assert body["gia_presente"] is False
    with app.app_context():
        user=Utente.query.filter_by(email=data["email"]).one()
        assert user.ruolo=="allievo"
        assert user.deve_cambiare_password is True
        assert user.verifica_password(body["password"])

    repeat=client.post(url,json=data,headers={"X-Api-Key":key})
    assert repeat.status_code==200
    again=repeat.get_json()
    assert again["username"]==body["username"]
    assert again["gia_presente"] is True
    assert again["password"]==""
    with app.app_context():
        assert Utente.query.filter_by(email=data["email"]).count()==1
