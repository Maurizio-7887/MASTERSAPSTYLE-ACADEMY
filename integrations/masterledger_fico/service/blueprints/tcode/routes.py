"""Campo comandi stile SAP GUI: si digita un codice transazione e si apre la pagina."""
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user

from services.tcodes import (TCODES, TCODE_ARGS, PREVISTI, LEDGER_ONLY_BLUEPRINTS,
                             parse_command, catalogo_per_modulo)

tcode_bp = Blueprint("tcode", __name__)


def _home():
    return url_for("dashboard.desk_home") if current_user.is_desk else url_for("dashboard.ledger_home")


def _consentito(endpoint):
    return not (current_user.is_desk and endpoint.split(".")[0] in LEDGER_ONLY_BLUEPRINTS)


@tcode_bp.get("/")
@login_required
def elenco():
    gruppi = catalogo_per_modulo()
    if current_user.is_desk:
        for g in gruppi:
            g["attivi"] = [t for t in g["attivi"] if _consentito(t[2])]
        gruppi = [g for g in gruppi if g["attivi"]]
    return render_template("tcode/elenco.html", gruppi=gruppi)


@tcode_bp.get("/vai")
@login_required
def vai():
    codice, _ = parse_command(request.args.get("cmd"))
    if not codice:
        return redirect(_home())
    if codice in TCODES:
        _mod, descrizione, endpoint, nota = TCODES[codice]
        if not _consentito(endpoint):
            flash(f"{codice}: transazione non autorizzata per il portale Desk.", "danger")
            return redirect(_home())
        if nota:
            flash(f"{codice} {descrizione}: {nota}", "info")
        return redirect(url_for(endpoint, **TCODE_ARGS.get(codice, {})))
    if codice in PREVISTI:
        _mod, descrizione, fase = PREVISTI[codice]
        flash(f"{codice} {descrizione}: transazione prevista ({fase}), non ancora disponibile.", "warning")
        return redirect(url_for("tcode.elenco"))
    flash(f"Transazione {codice} non esiste. Consulta l'elenco dei codici.", "danger")
    return redirect(url_for("tcode.elenco"))
