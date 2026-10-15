"""Blueprint «Dati di base» del sistema integrato S/4 — una pagina HTML per ogni pezzo in templates/erp_dati/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_dati", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/dati")
collega_versione(bp)


@bp.route("/")
def avvio():
    return render_lab("erp_dati", "avvio")


@bp.route("/anagrafiche")
def anagrafiche():
    return render_lab("erp_dati", "anagrafiche")


@bp.route("/condizioni")
def condizioni():
    return render_lab("erp_dati", "condizioni")
