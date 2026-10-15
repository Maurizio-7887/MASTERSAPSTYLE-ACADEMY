"""Blueprint «Paghe» del sistema integrato S/4 — una pagina HTML per ogni pezzo in templates/erp_paghe/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_paghe", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/paghe")
collega_versione(bp)


@bp.route("/")
def dipendenti():
    return render_lab("erp_paghe", "dipendenti")


@bp.route("/cedolino")
def cedolino():
    return render_lab("erp_paghe", "cedolino")


@bp.route("/contabilita")
def contabilita():
    return render_lab("erp_paghe", "contabilita")
