"""Blueprint «Produzione (PP)» del sistema integrato S/4 — una pagina HTML per ogni pezzo in templates/erp_produzione/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_produzione", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/produzione")
collega_versione(bp)


@bp.route("/")
def ordini():
    return render_lab("erp_produzione", "ordini")


@bp.route("/avanzamento")
def avanzamento():
    return render_lab("erp_produzione", "avanzamento")
