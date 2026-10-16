"""Blueprint «Tesoreria» del sistema integrato S/4 — una pagina HTML per ogni pezzo in templates/erp_tesoreria/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_tesoreria", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/tesoreria")
collega_versione(bp)


@bp.route("/")
def posizione():
    return render_lab("erp_tesoreria", "posizione")


@bp.route("/partite")
def partite():
    return render_lab("erp_tesoreria", "partite")


@bp.route("/pagamenti")
def pagamenti():
    return render_lab("erp_tesoreria", "pagamenti")


@bp.route("/estratti")
def estratti():
    return render_lab("erp_tesoreria", "estratti")


@bp.route("/riba")
def riba():
    return render_lab("erp_tesoreria", "riba")


@bp.route("/factoring")
def factoring():
    return render_lab("erp_tesoreria", "factoring")


@bp.route("/anticipi")
def anticipi():
    return render_lab("erp_tesoreria", "anticipi")
