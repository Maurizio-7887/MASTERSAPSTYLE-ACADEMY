"""Blueprint «Pianificazione» — una pagina HTML per ogni funzione, in templates/pianificazione/."""
from flask import Blueprint

from ...simulatore import collega_versione, render_pagina

bp = Blueprint("pianificazione", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/pianificazione")
collega_versione(bp)

@bp.route("/budget")
def budget():
    """Budget annuo"""
    return render_pagina("pianificazione", "budget")


@bp.route("/previsionale")
def previsionale():
    """Bilancio previsionale"""
    return render_pagina("pianificazione", "previsionale")


@bp.route("/fabbisogno")
def fabbisogno():
    """Fabbisogno PP / MM"""
    return render_pagina("pianificazione", "fabbisogno")
