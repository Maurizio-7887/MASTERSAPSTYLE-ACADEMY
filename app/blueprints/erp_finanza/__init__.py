"""Blueprint «Finanza e adempimenti» del sistema integrato S/4 — una pagina HTML per ogni pezzo in templates/erp_finanza/.
Cambiali e bolli, assegni, mutui, leasing, ritenute d'acconto, imposta di bollo, crediti dubbi, scambi intracomunitari."""
from flask import Blueprint

from ...laboratori import render_lab
from ...simulatore import collega_versione

bp = Blueprint("erp_finanza", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/s4/finanza")
collega_versione(bp)

PAGINE = ("cambiali", "assegni", "mutui", "leasing", "ritenute", "bolli", "crediti", "intra")


def _pagina(nome):
    def vista():
        return render_lab("erp_finanza", nome)
    vista.__name__ = nome
    return vista


for _nome in PAGINE:
    bp.add_url_rule("/" + _nome, _nome, _pagina(_nome))
