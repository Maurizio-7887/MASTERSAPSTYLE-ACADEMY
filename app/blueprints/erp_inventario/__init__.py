"""Blueprint «Inventari fisici e contabili» del sistema integrato S/4 — una pagina HTML per ogni pezzo in templates/erp_inventario/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_inventario", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/inventario")
collega_versione(bp)


@bp.route("/")
def documenti():
    return render_lab("erp_inventario", "documenti")


@bp.route("/lista")
def lista():
    return render_lab("erp_inventario", "lista")


@bp.route("/differenze")
def differenze():
    return render_lab("erp_inventario", "differenze")


@bp.route("/abc")
def abc():
    return render_lab("erp_inventario", "abc")


@bp.route("/valorizzazione")
def valorizzazione():
    return render_lab("erp_inventario", "valorizzazione")
