"""Blueprint «Produzione PP» — una pagina HTML per ogni funzione, in templates/produzione/."""
from flask import Blueprint

from ...simulatore import collega_versione, render_pagina

bp = Blueprint("produzione", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/produzione")
collega_versione(bp)

@bp.route("/")
def pp():
    """Launchpad PP"""
    return render_pagina("produzione", "pp")
