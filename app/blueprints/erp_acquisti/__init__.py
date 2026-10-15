"""Blueprint «Acquisti (MM)» del sistema integrato S/4 — una pagina HTML per ogni pezzo in templates/erp_acquisti/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_acquisti", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/acquisti")
collega_versione(bp)


@bp.route("/")
def ordini():
    return render_lab("erp_acquisti", "ordini")


@bp.route("/entrate")
def entrate():
    return render_lab("erp_acquisti", "entrate")


@bp.route("/fatture")
def fatture():
    return render_lab("erp_acquisti", "fatture")


@bp.route("/richieste")
def richieste():
    return render_lab("erp_acquisti", "richieste")
