"""Blueprint «Libri e bilancio» — una pagina HTML per ogni funzione, in templates/reportistica/."""
from flask import Blueprint

from ...simulatore import collega_versione, render_pagina

bp = Blueprint("reportistica", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/reportistica")
collega_versione(bp)

@bp.route("/giornale")
def giornale():
    """Libro giornale"""
    return render_pagina("reportistica", "giornale")


@bp.route("/mastro")
def mastro():
    """Mastro"""
    return render_pagina("reportistica", "mastro")


@bp.route("/bilancio-verifica")
def bilancio_verifica():
    """Bilancio di verifica"""
    return render_pagina("reportistica", "bilancio_verifica")
