"""Blueprint «Controllo CO» — una pagina HTML per ogni funzione, in templates/controllo/."""
from flask import Blueprint

from ...simulatore import collega_versione, render_pagina

bp = Blueprint("controllo", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/controllo")
collega_versione(bp)

@bp.route("/co-cca")
def co_cca():
    """CO-CCA Budget dei centri"""
    return render_pagina("controllo", "co_cca")


@bp.route("/centri-costo")
def centri_costo():
    """Report centri di costo"""
    return render_pagina("controllo", "centri_costo")


@bp.route("/commesse")
def commesse():
    """Report commesse"""
    return render_pagina("controllo", "commesse")


@bp.route("/mensile")
def mensile():
    """Controllo mensile"""
    return render_pagina("controllo", "mensile")
