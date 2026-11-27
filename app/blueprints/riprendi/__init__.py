"""Blueprint «Riprendi» — appena entra, l'allievo sceglie: CONTINUA l'esercizio dall'ultima volta o COMINCIA UN ESERCIZIO NUOVO.

La ripartenza è fatta dal server: il lavoro attuale va in archivio (il docente lo può ripristinare dal pannello «Passa il comando»),
lo stato salvato viene tolto e la pagina di conferma pulisce anche la copia nel browser, così niente lo ricarica per errore.
"""
from flask import Blueprint, abort, flash, redirect, render_template, request, url_for

from ...accesso import utente_corrente, guida_autorizzata, corsi_assegnati
from ...db import ArchivioLavoro, AvanzamentoGuida, StatoLavoro, adesso, db
from ...esercizi import ESERCIZI
from ...report import report as report_lavoro
from ..sincronia import chiave_storage

bp = Blueprint("riprendi", __name__, url_prefix="/riprendi", template_folder="templates")

SLOT = "erp-ft"          # il sistema integrato su cui girano gli esercizi passo passo
VERSIONE_URL = "vuoto"   # la versione nell'indirizzo delle pagine del sistema integrato
PREDEFINITO = "dicembre-wms"


def esercizi_integrati():
    return [(k, v["titolo"]) for k, v in ESERCIZI.items() if v.get("versione") == SLOT and guida_autorizzata(utente_corrente(), k)]


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
    disponibili = esercizi_integrati()
    if not disponibili:
        abort(403, "Nessun corso autorizzato dal docente.")
    predefinito = PREDEFINITO if PREDEFINITO in dict(disponibili) else disponibili[0][0]
    return render_template("riprendi/scelta.html", u=u, lavoro=lavoro_di(u), esercizi=disponibili, predefinito=predefinito,
                           continua=url_for("portale.ingresso", versione=VERSIONE_URL))


@bp.route("/nuovo", methods=["POST"])
def nuovo():
    u = utente_corrente()
    codice = request.form.get("esercizio") or PREDEFINITO
    if codice not in dict(esercizi_integrati()):
        abort(403, "Esercizio non autorizzato.")
    if request.form.get("conferma") != "si":
        flash("Per ricominciare conferma con la casella «Sì, cancella e ricomincia».", "errore")
        return redirect(url_for("riprendi.scelta"))
    corsi = corsi_assegnati(u)
    if corsi is not None and len(corsi) > 1:
        abort(409, "Reset sospeso: hai più corsi abilitati e gli archivi ERP sono ancora condivisi. Contatta il docente per non perdere il lavoro degli altri corsi.")
    s = StatoLavoro.query.filter_by(utente_id=u.id, versione=SLOT).first()
    if s is not None:
        db.session.add(ArchivioLavoro(utente_id=u.id, versione=SLOT, dati=s.dati, motivo=f"ricominciato da zero dall'allievo · {adesso():%d/%m/%Y %H:%M}"))
        db.session.delete(s)
    # Solo dopo la conferma esplicita di "nuovo" si riporta il tutor a zero.
    # La normale uscita/ripresa NON modifica mai i checkpoint.
    for g in AvanzamentoGuida.query.filter_by(utente_id=u.id, versione=SLOT).all():
        g.posizione = 0
        g.posizione_massima = 0
        g.passi = {}
        g.totale = 0
        g.osservazioni = {}
        g.aggiornato = adesso()
    db.session.commit()
    vai = url_for("erp_dati.avvio", versione=VERSIONE_URL, esercizio_guida=codice)
    return render_template("riprendi/pulito.html", chiave=chiave_storage(SLOT), slot=SLOT, vai=vai)
