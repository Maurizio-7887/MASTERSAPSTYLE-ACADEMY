"""Blueprint «IVA, imposte, chiusura» del sistema integrato — una pagina HTML per ogni pezzo in templates/erp_chiusura/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_chiusura", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/chiusura")
collega_versione(bp)


@bp.route("/")
def iva():
    return render_lab("erp_chiusura", "iva")


@bp.route("/imposte")
def imposte():
    return render_lab("erp_chiusura", "imposte")


@bp.route("/chiusura")
def chiusura():
    return render_lab("erp_chiusura", "chiusura")


@bp.route("/riapertura")
def riapertura():
    return render_lab("erp_chiusura", "riapertura")
