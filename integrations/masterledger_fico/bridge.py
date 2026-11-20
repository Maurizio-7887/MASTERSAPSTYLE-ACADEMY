"""Pagina ponte non invasiva verso MasterLedger FI/CO.

Non registra automaticamente il blueprint nell'ERP originale.
Il gestore del portale deve registrarlo nella factory dopo i test.
"""
import os
from flask import Blueprint, abort, redirect, render_template_string
from flask_login import login_required

masterledger_fico_bridge = Blueprint("masterledger_fico_bridge", __name__, url_prefix="/formazione/masterledger-fico")

@masterledger_fico_bridge.get("/")
@login_required
def index():
    url = os.getenv("MASTERLEDGER_FICO_PUBLIC_URL", "").strip()
    if not url:
        return render_template_string(
            "<h1>MasterLedger FI/CO</h1>"
            "<p>Secondo livello della formazione Firenze.</p>"
            "<p>Il servizio non è ancora pubblicato. "
            "L'esercitazione ERP esistente resta disponibile.</p>"
        ), 503
    if not url.startswith("https://"):
        abort(503, "L'indirizzo del servizio FI/CO deve essere HTTPS.")
    return redirect(url.rstrip("/") + "/academy-fico/", code=302)
