"""Blueprint «Alta varietà» — laboratorio di produzione, una pagina HTML per ogni pezzo in templates/alta_varieta/."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("alta_varieta", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/alta-varieta")
collega_versione(bp)


@bp.route("/")
def anagrafica():
    return render_lab("alta_varieta", "anagrafica")


@bp.route("/ordini")
def ordini():
    return render_lab("alta_varieta", "ordini")


@bp.route("/vendite")
def vendite():
    return render_lab("alta_varieta", "vendite")


@bp.route("/chiusura")
def chiusura():
    return render_lab("alta_varieta", "chiusura")


@bp.route("/cruscotto")
def cruscotto():
    return render_lab("alta_varieta", "cruscotto")


@bp.route("/giornale")
def giornale():
    return render_lab("alta_varieta", "giornale")
