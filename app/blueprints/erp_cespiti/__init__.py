"""Blueprint «Cespiti» del sistema integrato — una pagina HTML per ogni pezzo in templates/erp_cespiti/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_cespiti", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/cespiti")
collega_versione(bp)


@bp.route("/")
def registro():
    return render_lab("erp_cespiti", "registro")


@bp.route("/acquisto")
def acquisto():
    return render_lab("erp_cespiti", "acquisto")


@bp.route("/ammortamenti")
def ammortamenti():
    return render_lab("erp_cespiti", "ammortamenti")


@bp.route("/cessione")
def cessione():
    return render_lab("erp_cespiti", "cessione")
