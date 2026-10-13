"""Blueprint «Contabilità FI» — una pagina HTML per ogni funzione, in templates/contabilita/."""
from flask import Blueprint

from ...simulatore import collega_versione, render_pagina

bp = Blueprint("contabilita", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/contabilita")
collega_versione(bp)

@bp.route("/moduli")
def moduli():
    """Tutti i moduli"""
    return render_pagina("contabilita", "moduli")


@bp.route("/fi-gl")
def fi_gl():
    """FI-GL Contabilità generale"""
    return render_pagina("contabilita", "fi_gl")


@bp.route("/fi-aa")
def fi_aa():
    """FI-AA Cespiti"""
    return render_pagina("contabilita", "fi_aa")


@bp.route("/fi-ar")
def fi_ar():
    """FI-AR Clienti"""
    return render_pagina("contabilita", "fi_ar")


@bp.route("/fi-ap")
def fi_ap():
    """FI-AP Fornitori"""
    return render_pagina("contabilita", "fi_ap")


@bp.route("/fi-bl")
def fi_bl():
    """FI-BL Banche, RiBa, factoring"""
    return render_pagina("contabilita", "fi_bl")


@bp.route("/fiscale")
def fiscale():
    """IVA e imposte"""
    return render_pagina("contabilita", "fiscale")


@bp.route("/sicurezza")
def sicurezza():
    """Impostazioni FI e backup"""
    return render_pagina("contabilita", "sicurezza")


@bp.route("/registrazione")
def registrazione():
    """Scrittura libera FB50"""
    return render_pagina("contabilita", "registrazione")
