"""Blueprint «Vendite» del sistema integrato S/4 — una pagina HTML per ogni pezzo in templates/erp_vendite/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_vendite", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/vendite")
collega_versione(bp)


@bp.route("/")
def ordini():
    return render_lab("erp_vendite", "ordini")


@bp.route("/acconti")
def acconti():
    return render_lab("erp_vendite", "acconti")


@bp.route("/consegne")
def consegne():
    return render_lab("erp_vendite", "consegne")


@bp.route("/fatture")
def fatture():
    return render_lab("erp_vendite", "fatture")


@bp.route("/resi")
def resi():
    return render_lab("erp_vendite", "resi")


@bp.route("/incassi")
def incassi():
    return render_lab("erp_vendite", "incassi")


@bp.route("/flusso")
def flusso():
    return render_lab("erp_vendite", "flusso")


@bp.route("/crediti")
def crediti():
    return render_lab("erp_vendite", "crediti")
