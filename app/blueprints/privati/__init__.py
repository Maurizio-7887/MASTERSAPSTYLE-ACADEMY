"""Blueprint «Privati» — i corsi online ERP e Magazziniere 5.0 venduti ai privati, come nelle altre Academy.

Pagina pubblica con il programma, iscrizione con prova gratuita (le prime lezioni «Che situazione hai?»), pagina di
acquisto con bonifico o PayPal, attivazione da parte del docente, esame finale (teoria + numeri dell'esercizio guidato
confrontati in automatico) e attestato PDF con QR di verifica pubblica.
Gli allievi delle classi in aula non hanno iscrizioni: per loro non cambia nulla.
"""
import json
import os
import random
import re
import secrets
from datetime import timedelta

from flask import Blueprint, abort, flash, redirect, render_template, request, send_file, url_for

from ...accesso import apri_sessione, csrf_valido, solo_docente, utente_corrente
from ...corsi_privati import CORSI, DOMANDE, DOMANDE_ESAME, DURATA_MIN, SOGLIA_PRATICA, SOGLIA_TEORIA, TENTATIVI, corso
from ...db import Attestato, Iscrizione, StatoLavoro, TentativoEsame, Utente, adesso, db

bp = Blueprint("privati", __name__, url_prefix="/corsi", template_folder="templates", static_folder="static",
               static_url_path="/static/privati")

PUBBLICHE = {"privati.corso_pubblico", "privati.iscriviti", "privati.acquista", "privati.verifica", "privati.verifica_form",
             "privati.static"}
VERSIONE_LAVORO = "erp-ft"          # il sistema integrato dove si svolgono gli esercizi
EMAIL = "info@mauriziogustinicchiconsulting.it"


def _corso_o_404(slug):
    c = corso(slug)
    if c is None:
        abort(404)
    return c


def _ctx(slug, c, **extra):
    return dict(slug=slug, c=c, paypal=os.environ.get("PAYPAL_URL", "").strip(), email=EMAIL,
                scm_url=os.environ.get("SCM_URL", "https://web-production-15943.up.railway.app"), **extra)


def iscrizioni(u):
    return Iscrizione.query.filter_by(utente_id=u.id).order_by(Iscrizione.id).all() if u else []


def solo_prova(u):
    """Vero se l'utente ha soltanto iscrizioni in prova gratuita (né attive, né docente)."""
    if u is None or u.docente:
        return False
    isc = iscrizioni(u)
    return bool(isc) and all(i.stato == "prova" for i in isc)


def lezioni_gratis(u):
    return {s for i in iscrizioni(u) for s in CORSI[i.corso]["gratis"]}


def controlla_prova(u):
    """before_request: chi è in prova vede programma, area e le lezioni gratuite; il resto porta all'iscrizione."""
    from flask import request as rq
    if not solo_prova(u):
        return None
    ep = rq.endpoint or ""
    if ep.startswith(("privati.", "accessi.", "sincronia.")) or ep.endswith(".static") or ep in ("static", "portale.health"):
        return None
    if ep.startswith("formazione.") and ep.split(".", 1)[1].replace("_", "-") in lezioni_gratis(u):
        return None
    if rq.path.startswith("/api/"):
        return None
    slug = iscrizioni(u)[0].corso
    flash("Nella prova gratuita sono aperti il programma e le prime lezioni. Iscriviti al corso per usare il sistema integrato.", "errore")
    return redirect(url_for("privati.acquista", slug=slug))


# ------------------------------------------------------------------ pagine pubbliche
@bp.route("/<slug>")
def corso_pubblico(slug):
    c = _corso_o_404(slug)
    return render_template("privati/corso.html", **_ctx(slug, c, u=utente_corrente()))


@bp.route("/<slug>/iscriviti", methods=["GET", "POST"])
def iscriviti(slug):
    c = _corso_o_404(slug)
    u = utente_corrente()
    if u is not None and request.method == "GET":
        if not u.docente and not Iscrizione.query.filter_by(utente_id=u.id, corso=slug).first():
            db.session.add(Iscrizione(utente_id=u.id, corso=slug))
            db.session.commit()
        return redirect(url_for(".area", slug=slug))
    if request.method == "POST":
        f = request.form
        email = (f.get("email") or "").strip().lower()
        nome = " ".join(x.strip() for x in (f.get("nome"), f.get("cognome")) if x and x.strip())
        pw = f.get("password") or ""
        errore = None
        if not csrf_valido(f.get("csrf")):
            errore = "Modulo scaduto: riprova."
        elif not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email) or not f.get("nome") or not f.get("cognome"):
            errore = "Inserisci nome, cognome e un'email valida."
        elif len(pw) < 8:
            errore = "La password deve avere almeno 8 caratteri."
        elif f.get("privacy") != "1":
            errore = "Per iscriverti devi accettare l'informativa privacy e le condizioni."
        elif Utente.query.filter_by(username=email).first():
            errore = "Esiste già un account con questa email: accedi con email e password."
        if errore:
            flash(errore, "errore")
            return render_template("privati/iscriviti.html", **_ctx(slug, c, dati=f)), 400
        nuovo = Utente(username=email, nome=nome, email=email, ruolo="allievo", deve_cambiare_password=False)
        nuovo.imposta_password(pw)
        db.session.add(nuovo)
        db.session.flush()
        db.session.add(Iscrizione(utente_id=nuovo.id, corso=slug))
        db.session.commit()
        apri_sessione(nuovo)
        flash("Account creato: il programma e le prime lezioni sono aperti in prova gratuita.", "ok")
        return redirect(url_for(".area", slug=slug))
    return render_template("privati/iscriviti.html", **_ctx(slug, c, dati={}))


@bp.route("/<slug>/acquista")
def acquista(slug):
    c = _corso_o_404(slug)
    return render_template("privati/acquista.html", **_ctx(slug, c, u=utente_corrente()))


@bp.route("/verifica")
def verifica_form():
    codice = (request.args.get("codice") or "").strip().upper()
    if codice:
        return redirect(url_for(".verifica", codice=codice))
    return render_template("privati/verifica.html", a=None, codice="")


@bp.route("/verifica/<codice>")
def verifica(codice):
    a = Attestato.query.filter_by(codice=codice.upper()).first()
    return render_template("privati/verifica.html", a=a, codice=codice.upper(), c=corso(a.corso) if a else None)


# ------------------------------------------------------------------ area dello studente
@bp.route("/")
def area_generale():
    u = utente_corrente()
    if u.docente:
        return redirect(url_for(".docente"))
    isc = iscrizioni(u)
    if len(isc) == 1:
        return redirect(url_for(".area", slug=isc[0].corso))
    return render_template("privati/scegli.html", isc=isc, corsi=CORSI)


def _pratica(u, c):
    """Confronto automatico del lavoro salvato nel sistema integrato con i numeri attesi dell'esercizio del corso."""
    from ...report import report
    s = StatoLavoro.query.filter_by(utente_id=u.id, versione=VERSIONE_LAVORO).first()
    if s is None:
        return {"righe": [], "esatti": 0, "totale": 0, "quota": 0.0, "iniziato": False}
    try:
        r = report(s.dati, c["esercizio"])
    except Exception:  # noqa: BLE001 — un lavoro rovinato non deve bloccare la pagina
        return {"righe": [], "esatti": 0, "totale": 0, "quota": 0.0, "iniziato": True}
    tot = len(r["confronto"])
    return {"righe": r["confronto"], "esatti": r["esatti"], "totale": tot, "quota": r["esatti"] / tot if tot else 0.0,
            "iniziato": True}


@bp.route("/<slug>/area")
def area(slug):
    c = _corso_o_404(slug)
    u = utente_corrente()
    isc = Iscrizione.query.filter_by(utente_id=u.id, corso=slug).first()
    if isc is None and not u.docente:
        return redirect(url_for(".iscriviti", slug=slug))
    tentativi = TentativoEsame.query.filter_by(utente_id=u.id, corso=slug).order_by(TentativoEsame.id).all()
    att = Attestato.query.filter_by(utente_id=u.id, corso=slug, revocato=False).first()
    return render_template("privati/area.html", **_ctx(slug, c, u=u, isc=isc, pratica=_pratica(u, c), tentativi=tentativi,
                                                         prova=isc is None or isc.stato != "attivo",
                                                         att=att, rimasti=TENTATIVI - sum(1 for t in tentativi if t.chiuso)))


# ------------------------------------------------------------------ esame finale
def _attiva(u, slug):
    isc = Iscrizione.query.filter_by(utente_id=u.id, corso=slug).first()
    return isc is not None and isc.stato == "attivo"


@bp.route("/<slug>/esame", methods=["GET", "POST"])
def esame(slug):
    c = _corso_o_404(slug)
    u = utente_corrente()
    if not _attiva(u, slug):
        flash("L'esame si apre con l'iscrizione al corso completo.", "errore")
        return redirect(url_for(".acquista", slug=slug))
    if Attestato.query.filter_by(utente_id=u.id, corso=slug, revocato=False).first():
        return redirect(url_for(".area", slug=slug))
    aperto = TentativoEsame.query.filter_by(utente_id=u.id, corso=slug, chiuso=None).first()
    fatti = TentativoEsame.query.filter(TentativoEsame.utente_id == u.id, TentativoEsame.corso == slug,
                                        TentativoEsame.chiuso.isnot(None)).count()
    banca = DOMANDE[slug]
    if request.method == "POST" and request.form.get("azione") == "inizia" and aperto is None:
        if fatti >= TENTATIVI:
            flash("Hai usato tutti i tentativi: scrivi al docente per riaprirli.", "errore")
            return redirect(url_for(".area", slug=slug))
        scelte = random.sample(range(len(banca)), min(DOMANDE_ESAME, len(banca)))
        aperto = TentativoEsame(utente_id=u.id, corso=slug, domande=json.dumps(scelte))
        db.session.add(aperto)
        db.session.commit()
        return redirect(url_for(".esame", slug=slug))
    if request.method == "POST" and request.form.get("azione") == "consegna" and aperto is not None:
        scelte = json.loads(aperto.domande)
        giuste = sum(1 for i in scelte if request.form.get(f"d{i}") == str(banca[i][2]))
        aperto.teoria = giuste / len(scelte)
        aperto.pratica = _pratica(u, c)["quota"]
        scaduto = adesso() > aperto.iniziato + timedelta(minutes=DURATA_MIN + 2)
        aperto.superato = (not scaduto and aperto.teoria >= SOGLIA_TEORIA and aperto.pratica >= SOGLIA_PRATICA)
        aperto.chiuso = adesso()
        if aperto.superato:
            punteggio = round((aperto.teoria * 0.5 + aperto.pratica * 0.5) * 100, 1)
            db.session.add(Attestato(codice=f"{c['prefisso']}-" + "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(8)),
                                     utente_id=u.id, corso=slug, nome_completo=u.nome, titolo=c["titolo"], ore=c["ore"],
                                     punteggio=punteggio))
        db.session.commit()
        return render_template("privati/esito.html", **_ctx(slug, c, t=aperto, scaduto=scaduto, soglia_t=SOGLIA_TEORIA,
                                                              soglia_p=SOGLIA_PRATICA, rimasti=TENTATIVI - fatti - 1,
                                                              att=Attestato.query.filter_by(utente_id=u.id, corso=slug, revocato=False).first()))
    domande = [(i, banca[i]) for i in json.loads(aperto.domande)] if aperto else []
    return render_template("privati/esame.html", **_ctx(slug, c, aperto=aperto, domande=domande, fatti=fatti, pratica=_pratica(u, c),
                                                          tentativi=TENTATIVI, durata=DURATA_MIN, soglia_t=SOGLIA_TEORIA,
                                                          soglia_p=SOGLIA_PRATICA, n_domande=min(DOMANDE_ESAME, len(banca))))


@bp.route("/attestato/<codice>.pdf")
def attestato_pdf(codice):
    from .attestato import build_pdf
    a = Attestato.query.filter_by(codice=codice.upper()).first_or_404()
    u = utente_corrente()
    if a.utente_id != u.id and not u.docente:
        abort(403)
    if a.revocato:
        abort(410)
    return send_file(build_pdf(a), mimetype="application/pdf", as_attachment=True, download_name=f"Attestato_{a.codice}.pdf")


# ------------------------------------------------------------------ docente: iscrizioni e attivazioni
@bp.route("/docente")
@solo_docente
def docente():
    righe = Iscrizione.query.order_by(Iscrizione.creata.desc()).all()
    att = {(a.utente_id, a.corso): a for a in Attestato.query.all()}
    return render_template("privati/docente.html", righe=righe, corsi=CORSI, att=att)


@bp.route("/docente/<int:iid>/attiva", methods=["POST"])
@solo_docente
def attiva(iid):
    isc = db.session.get(Iscrizione, iid) or abort(404)
    isc.stato, isc.attivata = "attivo", adesso()
    isc.codice_scm = (request.form.get("codice_scm") or isc.codice_scm or "").strip()[:60]
    isc.nota = (request.form.get("nota") or isc.nota or "").strip()[:300]
    db.session.commit()
    flash(f"Corso attivato per {isc.utente.nome} ({isc.utente.username}).", "ok")
    return redirect(url_for(".docente"))


@bp.route("/docente/<int:iid>/tentativi", methods=["POST"])
@solo_docente
def azzera_tentativi(iid):
    isc = db.session.get(Iscrizione, iid) or abort(404)
    n = TentativoEsame.query.filter_by(utente_id=isc.utente_id, corso=isc.corso, superato=False).delete()
    db.session.commit()
    flash(f"Tentativi d'esame azzerati ({n}).", "ok")
    return redirect(url_for(".docente"))
