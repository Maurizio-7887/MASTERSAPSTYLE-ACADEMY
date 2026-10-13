"""Blueprint «Vendite e acquisti SD / MM» — una pagina HTML per ogni funzione, in templates/vendite_acquisti/."""
from flask import Blueprint

from ...simulatore import collega_versione, render_pagina

bp = Blueprint("vendite_acquisti", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/vendite-acquisti")
collega_versione(bp)

@bp.route("/")
def sdmm():
    """Launchpad SD / MM"""
    return render_pagina("vendite_acquisti", "sdmm")
