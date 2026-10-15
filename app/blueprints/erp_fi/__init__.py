"""Blueprint «Contabilità» del sistema integrato S/4 — una pagina HTML per ogni pezzo in templates/erp_fi/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_fi", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/contabilita-s4")
collega_versione(bp)


@bp.route("/")
def giornale():
    return render_lab("erp_fi", "giornale")


@bp.route("/bilancio")
def bilancio():
    return render_lab("erp_fi", "bilancio")


@bp.route("/sdi")
def sdi():
    return render_lab("erp_fi", "sdi")


@bp.route("/storni")
def storni():
    return render_lab("erp_fi", "storni")
