"""Blueprint «Valute estere» del sistema integrato S/4 — una pagina HTML per ogni pezzo in templates/erp_valute/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_valute", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/valute")
collega_versione(bp)


@bp.route("/")
def tassi():
    return render_lab("erp_valute", "tassi")


@bp.route("/documenti")
def documenti():
    return render_lab("erp_valute", "documenti")


@bp.route("/regolazioni")
def regolazioni():
    return render_lab("erp_valute", "regolazioni")


@bp.route("/valutazione")
def valutazione():
    return render_lab("erp_valute", "valutazione")
