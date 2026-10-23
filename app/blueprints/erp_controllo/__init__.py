"""Blueprint «Contabilità dei centri di costo (CO-OM)» del sistema integrato S/4 — ciclo di pianificazione SAP:
anagrafiche, KP06, KP26, ribaltamento, KSPI, consuntivo KSB1 e report. Una pagina HTML per ogni pezzo in templates/erp_controllo/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_controllo", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/controllo")
collega_versione(bp)


@bp.route("/")
def centri():
    return render_lab("erp_controllo", "centri")


@bp.route("/kp06")
def kp06():
    return render_lab("erp_controllo", "kp06")


@bp.route("/kp26")
def kp26():
    return render_lab("erp_controllo", "kp26")


@bp.route("/ksu")
def ksu():
    return render_lab("erp_controllo", "ksu")


@bp.route("/kspi")
def kspi():
    return render_lab("erp_controllo", "kspi")


@bp.route("/ksb1")
def ksb1():
    return render_lab("erp_controllo", "ksb1")


@bp.route("/report")
def report():
    return render_lab("erp_controllo", "report")
