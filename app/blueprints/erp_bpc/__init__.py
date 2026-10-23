"""Blueprint «Pianificazione BPC» del sistema integrato S/4 — SAP Business Planning and Consolidation sopra il piano CO:
modello e Data Manager, modulo di inserimento EPM, processo di approvazione e ritrasferimento in S/4, report.
Una pagina HTML per ogni pezzo in templates/erp_bpc/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_bpc", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/bpc")
collega_versione(bp)


@bp.route("/")
def modello():
    return render_lab("erp_bpc", "modello")


@bp.route("/input")
def input():
    return render_lab("erp_bpc", "input")


@bp.route("/processo")
def processo():
    return render_lab("erp_bpc", "processo")


@bp.route("/report")
def report():
    return render_lab("erp_bpc", "report")
