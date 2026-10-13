"""Blueprint «Vendite e acquisti SD / MM» — una pagina HTML per ogni funzione, in templates/vendite_acquisti/."""
from flask import Blueprint, request

from ...pagine import SCHERMATE_SD
from ...simulatore import collega_versione, render_pagina

bp = Blueprint("vendite_acquisti", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/vendite-acquisti")
collega_versione(bp)

@bp.route("/")
def sdmm():
    """Launchpad SD / MM"""
    schermata = request.args.get("sd")
    return render_pagina("vendite_acquisti", "sdmm", sd=schermata if schermata in SCHERMATE_SD else None)
