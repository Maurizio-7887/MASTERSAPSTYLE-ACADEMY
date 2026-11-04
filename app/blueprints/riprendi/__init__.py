"""Blueprint «Riprendi» — appena entra, l'allievo sceglie: CONTINUA l'esercizio dall'ultima volta o COMINCIA UN ESERCIZIO NUOVO.

La ripartenza è fatta dal server: il lavoro attuale va in archivio (il docente lo può ripristinare dal pannello «Passa il comando»),
lo stato salvato viene tolto e la pagina di conferma pulisce anche la copia nel browser, così niente lo ricarica per errore.
"""
from flask import Blueprint, flash, redirect, render_template, request, url_for

from ...accesso import utente_corrente
from ...db import ArchivioLavoro, StatoLavoro, adesso, db
from ...esercizi import ESERCIZI
from ...report import report as report_lavoro
from ..sincronia import chiave_storage

bp = Blueprint("riprendi", __name__, url_prefix="/riprendi", template_folder="templates")

SLOT = "erp-ft"          # il sistema integrato su cui girano gli esercizi passo passo
VERSIONE_URL = "vuoto"   # la versione nell'indirizzo delle pagine del sistema integrato
PREDEFINITO = "dicembre-wms"


def esercizi_integrati():
    return [(k, v["titolo"]) for k, v in ESERCIZI.items() if v.get("versione") == SLOT]


def lavoro_di(u):
    s = StatoLavoro.query.filter_by(utente_id=u.id, versione=SLOT).first()
    if s is None:
        return None
    try:
        ind = report_lavoro(s.dati)["indicatori"]
    except Exception:  # noqa: BLE001 — un lavoro illeggibile si può comunque archiviare e ricominciare
        ind = {}
    return {"stato": s, "scritture": ind.get("scritture", 0), "ultima": ind.get("ultima_data", ""), "aggiornato": s.aggiornato}


def ha_lavoro(u):
    return StatoLavoro.query.filter_by(utente_id=u.id, versione=SLOT).first() is not None


@bp.route("/")
def scelta():
    u = utente_corrente()
    return render_template("riprendi/scelta.html", u=u, lavoro=lavoro_di(u), esercizi=esercizi_integrati(), predefinito=PREDEFINITO,
                           continua=url_for("portale.ingresso", versione=VERSIONE_URL))


@bp.route("/nuovo", methods=["POST"])
def nuovo():
    u = utente_corrente()
    codice = request.form.get("esercizio") or PREDEFINITO
    if codice not in dict(esercizi_integrati()):
        codice = PREDEFINITO
    if request.form.get("conferma") != "si":
        flash("Per ricominciare conferma con la casella «Sì, cancella e ricomincia».", "errore")
        return redirect(url_for("riprendi.scelta"))
    s = StatoLavoro.query.filter_by(utente_id=u.id, versione=SLOT).first()
    if s is not None:
        db.session.add(ArchivioLavoro(utente_id=u.id, versione=SLOT, dati=s.dati, motivo=f"ricominciato da zero dall'allievo · {adesso():%d/%m/%Y %H:%M}"))
        db.session.delete(s)
    db.session.commit()
    vai = url_for("erp_dati.avvio", versione=VERSIONE_URL, esercizio_guida=codice)
    return render_template("riprendi/pulito.html", chiave=chiave_storage(SLOT), slot=SLOT, vai=vai)
