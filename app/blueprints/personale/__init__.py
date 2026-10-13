"""Blueprint «Personale HR» — una pagina HTML per ogni funzione, in templates/personale/."""
from flask import Blueprint

from ...simulatore import collega_versione, render_pagina

bp = Blueprint("personale", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/personale")
collega_versione(bp)

@bp.route("/")
def hr():
    """Dipendenti e paghe"""
    return render_pagina("personale", "hr")
