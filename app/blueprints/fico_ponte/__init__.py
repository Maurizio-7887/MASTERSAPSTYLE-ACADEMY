"""Blueprint «FI/CO» — accesso unico dal portale al programma STYLESAPFICO (/fico).

Chi è già entrato nel portale apre il FI/CO senza un secondo nome utente:
il portale firma un biglietto valido 2 minuti e monouso con la chiave del
servizio FI/CO (MASTERLEDGER_FICO_SECRET_KEY). Il FI/CO crea o aggiorna
l'utente collegato e, se è un allievo, lo confina nella sua azienda didattica.
"""
import os
import secrets

from flask import Blueprint, abort, redirect
from itsdangerous import URLSafeTimedSerializer

from ...accesso import utente_corrente

bp = Blueprint("fico_ponte", __name__)

SALT = "mastersapstyle-ponte-fico-v1"   # deve coincidere con services/ponte_portale.py del FI/CO


def fico_attivo():
    return (os.environ.get("MASTERLEDGER_FICO_ENABLED") == "1"
            and bool(os.environ.get("MASTERLEDGER_FICO_SECRET_KEY", "").strip()))


def biglietto(u):
    s = URLSafeTimedSerializer(os.environ["MASTERLEDGER_FICO_SECRET_KEY"].strip(), salt=SALT)
    return s.dumps({"uid": u.id, "nome": u.nome, "ruolo": "docente" if u.docente else "allievo",
                    "nonce": secrets.token_urlsafe(24)})


@bp.route("/fico-accesso")
def entra():
    u = utente_corrente()
    if u is None:
        abort(401)
    if not fico_attivo():
        return ("<h1>Programma FI/CO non ancora attivo</h1>"
                "<p>Il docente non ha ancora pubblicato il programma SAP FI/CO. "
                "<a href='/'>Torna al portale</a></p>"), 503
    return redirect("/fico/academy-fico/ponte?t=" + biglietto(u))
