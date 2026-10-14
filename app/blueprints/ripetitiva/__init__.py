"""Blueprint «Produzione ripetitiva» — laboratorio di produzione, una pagina HTML per ogni pezzo in templates/ripetitiva/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("ripetitiva", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/ripetitiva")
collega_versione(bp)


@bp.route("/")
def pianificazione():
    return render_lab("ripetitiva", "pianificazione")


@bp.route("/collettori")
def collettori():
    return render_lab("ripetitiva", "collettori")


@bp.route("/consuntivazione")
def consuntivazione():
    return render_lab("ripetitiva", "consuntivazione")


@bp.route("/chiusura")
def chiusura():
    return render_lab("ripetitiva", "chiusura")


@bp.route("/cruscotto")
def cruscotto():
    return render_lab("ripetitiva", "cruscotto")


@bp.route("/giornale")
def giornale():
    return render_lab("ripetitiva", "giornale")
