"""Blueprint «Spedizione» del sistema integrato S/4 — una pagina HTML per ogni pezzo in templates/erp_spedizione/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_spedizione", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/spedizione")
collega_versione(bp)


@bp.route("/")
def monitor():
    return render_lab("erp_spedizione", "monitor")


@bp.route("/prelievo")
def prelievo():
    return render_lab("erp_spedizione", "prelievo")


@bp.route("/imballo")
def imballo():
    return render_lab("erp_spedizione", "imballo")


@bp.route("/trasporti")
def trasporti():
    return render_lab("erp_spedizione", "trasporti")


@bp.route("/ddt")
def ddt():
    return render_lab("erp_spedizione", "ddt")
