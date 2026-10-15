"""Blueprint «Magazzino a ubicazioni (WMS)» del sistema integrato S/4 — una pagina HTML per ogni pezzo in templates/erp_magazzino/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_magazzino", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/magazzino")
collega_versione(bp)


@bp.route("/")
def struttura():
    return render_lab("erp_magazzino", "struttura")


@bp.route("/mappa")
def mappa():
    return render_lab("erp_magazzino", "mappa")


@bp.route("/rf")
def rf():
    return render_lab("erp_magazzino", "rf")


@bp.route("/compiti")
def compiti():
    return render_lab("erp_magazzino", "compiti")


@bp.route("/monitor")
def monitor():
    return render_lab("erp_magazzino", "monitor")


@bp.route("/etichette")
def etichette():
    return render_lab("erp_magazzino", "etichette")
