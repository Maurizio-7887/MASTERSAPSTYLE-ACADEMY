"""Blueprint «Redditività (CO-PA)» del sistema integrato S/4 — una pagina HTML per ogni pezzo in templates/erp_copa/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_copa", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/copa")
collega_versione(bp)


@bp.route("/")
def ke30():
    return render_lab("erp_copa", "ke30")


@bp.route("/righe")
def ke24():
    return render_lab("erp_copa", "ke24")
