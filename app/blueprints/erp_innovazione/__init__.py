"""Blueprint «Innovazione logistica» (UF 11) del sistema integrato S/4 — una pagina HTML per ogni pezzo in templates/erp_innovazione/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_innovazione", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/innovazione")
collega_versione(bp)


@bp.route("/")
def kpi():
    return render_lab("erp_innovazione", "kpi")


@bp.route("/slotting")
def slotting():
    return render_lab("erp_innovazione", "slotting")


@bp.route("/ondate")
def ondate():
    return render_lab("erp_innovazione", "ondate")


@bp.route("/rfid")
def rfid():
    return render_lab("erp_innovazione", "rfid")
