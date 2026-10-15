"""Blueprint «Costi del prodotto (CO-PC)» del sistema integrato S/4 — una pagina HTML per ogni pezzo in templates/erp_costi/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_costi", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/costi")
collega_versione(bp)


@bp.route("/")
def scheda():
    return render_lab("erp_costi", "scheda")


@bp.route("/calcolo")
def calcolo():
    return render_lab("erp_costi", "calcolo")


@bp.route("/chiusura")
def chiusura():
    return render_lab("erp_costi", "chiusura")


@bp.route("/material-ledger")
def ml():
    return render_lab("erp_costi", "ml")
