"""Blueprint «Impostazioni» — una pagina HTML per ogni funzione, in templates/impostazioni/."""
from flask import Blueprint

from ...simulatore import collega_versione, render_pagina

bp = Blueprint("impostazioni", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/impostazioni")
collega_versione(bp)

@bp.route("/")
def impostazioni():
    """Azienda, centri, distinta base"""
    return render_pagina("impostazioni", "impostazioni")
