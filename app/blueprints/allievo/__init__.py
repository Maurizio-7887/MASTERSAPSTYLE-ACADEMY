"""Blueprint «Allievo» — la mia area: tempo di collegamento, lavoro salvato, consegne e risposte del docente."""
import json
from datetime import datetime, timedelta, timezone

from flask import Blueprint, abort, flash, redirect, render_template, request, url_for

from ...accesso import utente_corrente
from ...db import ROMA, Consegna, Sessione, StatoLavoro, db
from ...esercizi import ESERCIZI, scelte
from ...pagine import LAB_SLOTS, VERSIONI

LAVORI = {**VERSIONI, **{k: 'Laboratorio ' + v for k, v in LAB_SLOTS.items()}}   # dove si può consegnare
from ...report import report

bp = Blueprint("allievo", __name__, url_prefix="/area", template_folder="templates")


def inizio_oggi_utc():
    oggi = datetime.now(ROMA).replace(hour=0, minute=0, second=0, microsecond=0)
    return oggi.astimezone(timezone.utc).replace(tzinfo=None)


def riepilogo_lavori(u):
    out = []
    for s in StatoLavoro.query.filter_by(utente_id=u.id).order_by(StatoLavoro.versione).all():
        try:
            ind = report(s.dati)["indicatori"]
        except Exception:  # noqa: BLE001 — uno stato rovinato non deve bloccare la pagina
            ind = {}
        out.append({"versione": s.versione, "aggiornato": s.aggiornato, "scritture": ind.get("scritture", 0),
                    "ultima_data": ind.get("ultima_data", "")})
    return out


@bp.route("/")
def area():
    u = utente_corrente()
    if u.docente:
        return redirect(url_for("docente.pannello"))
    oggi = int(db.session.query(db.func.coalesce(db.func.sum(Sessione.secondi_attivi), 0))
               .filter(Sessione.utente_id == u.id, Sessione.ultimo >= inizio_oggi_utc()).scalar() or 0)
    sessioni = u.sessioni.order_by(Sessione.inizio.desc()).limit(10).all()
    consegne = u.consegne.order_by(Consegna.consegnata.desc()).all()
    return render_template("allievo/area.html", u=u, totale=u.secondi_totali(), oggi=oggi, sessioni=sessioni,
                           consegne=consegne, lavori=riepilogo_lavori(u), versioni=VERSIONI, esercizi=ESERCIZI,
                           nuove=sum(1 for c in consegne if c.stato == "corretta" and not c.letta))


@bp.route("/consegna", methods=["GET", "POST"])
def consegna():
    u = utente_corrente()
    lavori = {s.versione: s for s in StatoLavoro.query.filter_by(utente_id=u.id).all()}
    if request.method == "POST":
        versione = request.form.get("versione")
        esercizio = request.form.get("esercizio") or "libero"
        nota = (request.form.get("nota") or "").strip()[:4000]
        if versione not in LAVORI or esercizio not in ESERCIZI:
            abort(400)
        dati = None
        f = request.files.get("backup")
        if f and f.filename:
            try:
                testo = f.read().decode("utf-8")
                obj = json.loads(testo)
                st = obj.get("stato", obj) if isinstance(obj, dict) else None
                if not isinstance(st, dict) or "registrazioni" not in st:
                    raise ValueError
                dati = json.dumps(st, ensure_ascii=False)
            except (ValueError, UnicodeDecodeError):
                flash("Il file caricato non è un backup JSON del simulatore.", "errore")
                return redirect(url_for("allievo.consegna"))
        elif versione in lavori:
            dati = lavori[versione].dati
        if not dati:
            flash(f"Nella versione {versione} non c'è ancora lavoro salvato: apri il simulatore, lavora e poi consegna.", "errore")
            return redirect(url_for("allievo.consegna"))
        c = Consegna(utente_id=u.id, versione=versione, esercizio=esercizio, nota=nota, dati=dati,
                     secondi_collegato=u.secondi_totali())
        db.session.add(c)
        db.session.commit()
        flash("Consegna inviata al docente. Riceverai qui la sua risposta.", "ok")
        return redirect(url_for("allievo.vedi", cid=c.id))
    return render_template("allievo/consegna.html", lavori=riepilogo_lavori(u), versioni=LAVORI,
                           scelte={v: scelte(v) for v in LAVORI})


@bp.route("/consegna/<int:cid>")
def vedi(cid):
    u = utente_corrente()
    c = db.session.get(Consegna, cid)
    if c is None or (c.utente_id != u.id and not u.docente):
        abort(404)
    if u.docente:
        return redirect(url_for("docente.consegna", cid=cid))
    if c.stato == "corretta" and not c.letta:
        c.letta = True
        db.session.commit()
    ind = report(c.dati, c.esercizio)["indicatori"]
    return render_template("allievo/vedi.html", c=c, ind=ind, esercizio=ESERCIZI.get(c.esercizio, ESERCIZI["libero"]))
