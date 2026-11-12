"""Ragioneria · teoria e quiz a risposta chiusa (Firenze · Amministrazione).

Studia → Allenati → Verifica → Ripassa gli errori → Il mio andamento.
Le risposte non movimentano la contabilità del simulatore e i risultati restano
separati dai lavori ERP e dalle consegne."""
import csv
import io
import json

from flask import Blueprint, Response, abort, flash, redirect, render_template, request, url_for

from ...accesso import solo_docente, utente_corrente
from ...db import Utente, db, ora_italiana
from .banca import NATURA, PIANO, QUESITI, UNITA, riepilogo
from .modelli import EventoQuiz, RispostaQuiz, TentativoQuiz
from . import servizi as sv

bp = Blueprint("ragioneria_quiz", __name__, url_prefix="/ragioneria-quiz",
               template_folder="templates", static_folder="static", static_url_path="/static-rq")


@bp.app_context_processor
def _contesto():
    return {"rq_unita": UNITA}


def _tentativo(tid, scrivere=False):
    u = utente_corrente()
    t = db.session.get(TentativoQuiz, tid)
    if t is None:
        abort(404)
    if t.utente_id != u.id and not (u.docente and not scrivere):
        abort(403)
    return u, t


# ── ALLIEVO ──────────────────────────────────────────────────────────────────
@bp.get("/")
def indice():
    u = utente_corrente()
    a = sv.andamento(u.id)
    limiti = {}
    for c in UNITA:
        limiti[c] = (sv.tentativi_usati(u.id, "verifica", c), sv.tentativi_concessi(u.id, "verifica", c))
    limiti["finale"] = (sv.tentativi_usati(u.id, "finale"), sv.tentativi_concessi(u.id, "finale"))
    aperte = {(t.modalita, t.unita): t for t in a["tentativi"] if t.stato == "in_corso"}
    return render_template("ragioneria_quiz/indice.html", u=u, a=a, limiti=limiti, aperte=aperte,
                           banca=riepilogo(), MODALITA=sv.MODALITA, SOGLIA=sv.SOGLIA, SOGLIA_PARTE=sv.SOGLIA_PARTE)


@bp.get("/unita/<cod>")
def unita(cod):
    if cod not in UNITA:
        abort(404)
    u = utente_corrente()
    a = sv.andamento(u.id)
    return render_template("ragioneria_quiz/unita.html", u=u, un=UNITA[cod], st=a["unita"][cod],
                           usati=sv.tentativi_usati(u.id, "verifica", cod), concessi=sv.tentativi_concessi(u.id, "verifica", cod),
                           ap_ver=sv.aperto(u.id, "verifica", cod), SOGLIA=sv.SOGLIA)


@bp.post("/avvia")
def avvia():
    u = utente_corrente()
    modalita = request.form.get("modalita", "")
    cod = request.form.get("unita") or None
    if modalita not in sv.MODALITA:
        abort(400)
    if modalita in ("allenamento", "verifica"):
        if cod not in UNITA:
            abort(400)
    else:
        cod = None
    t = sv.aperto(u.id, modalita, cod)
    if t:
        flash("Hai già una prova aperta: riprendi da dove eri rimasto.", "ok")
        return redirect(url_for(".tentativo", tid=t.id))
    concessi = sv.tentativi_concessi(u.id, modalita, cod)
    if concessi is not None and sv.tentativi_usati(u.id, modalita, cod) >= concessi:
        flash("Hai usato tutti i tentativi disponibili per questa prova. Chiedi al docente se puoi riprovare.", "errore")
        return redirect(url_for(".unita", cod=cod) if cod else url_for(".indice"))
    t = sv.crea(u.id, modalita, cod)
    if t is None:
        flash("Non ci sono domande da ripassare: ottimo lavoro! Allenati su un'unità.", "ok")
        return redirect(url_for(".indice"))
    return redirect(url_for(".tentativo", tid=t.id))


@bp.get("/tentativo/<int:tid>")
def tentativo(tid):
    u, t = _tentativo(tid)
    if t.stato != "in_corso":
        return redirect(url_for(".risultato", tid=t.id))
    if t.utente_id != u.id:
        return redirect(url_for(".risultato", tid=t.id))
    qs = sv.domande(t)
    rs = sv.risposte(t)
    try:
        n = int(request.args.get("n", -1))
    except ValueError:
        n = -1
    if not (0 <= n < len(qs)):
        n = next((i for i, q in enumerate(qs) if not (rs.get(q["id"]) and rs[q["id"]].scelta)), 0)
    q = qs[n]
    r = rs.get(q["id"])
    scelta = json.loads(r.scelta) if r and r.scelta else []
    subito = sv.MODALITA[t.modalita]["feedback"] == "subito"
    mostra_esito = subito and bool(scelta)
    risposte_date = sum(1 for x in qs if rs.get(x["id"]) and rs[x["id"]].scelta)
    stato_nav = []
    for i, x in enumerate(qs):
        rr = rs.get(x["id"])
        if not (rr and rr.scelta):
            stato_nav.append("vuota")
        elif subito:
            stato_nav.append("ok" if rr.corretta else "ko")
        else:
            stato_nav.append("data")
    return render_template("ragioneria_quiz/tentativo.html", u=u, t=t, q=q, n=n, tot=len(qs), scelta=scelta,
                           mostra_esito=mostra_esito, aiuto=bool(r and r.aiuto), aiuto_aperto=request.args.get("aiuto") == "1",
                           risposte_date=risposte_date, stato_nav=stato_nav, M=sv.MODALITA[t.modalita],
                           un=UNITA[q["unita"]])


@bp.post("/tentativo/<int:tid>/risposta")
def risposta(tid):
    u, t = _tentativo(tid, scrivere=True)
    try:
        n = int(request.form.get("n", -1))
    except ValueError:
        abort(400)
    if t.stato != "in_corso":
        return redirect(url_for(".risultato", tid=t.id))
    r, errore = sv.salva_risposta(t, n, request.form.getlist("scelta"))
    if errore:
        flash(errore, "errore")
        return redirect(url_for(".tentativo", tid=t.id, n=n))
    subito = sv.MODALITA[t.modalita]["feedback"] == "subito"
    if subito:
        return redirect(url_for(".tentativo", tid=t.id, n=n))           # mostra subito la correzione
    tot = len(sv.domande(t))
    return redirect(url_for(".tentativo", tid=t.id, n=min(n + 1, tot - 1)))


@bp.post("/tentativo/<int:tid>/aiuto")
def aiuto(tid):
    u, t = _tentativo(tid, scrivere=True)
    n = int(request.form.get("n", 0) or 0)
    if sv.MODALITA[t.modalita]["feedback"] == "subito":
        sv.segna_aiuto(t, n)
    return redirect(url_for(".tentativo", tid=t.id, n=n, aiuto=1))


@bp.post("/tentativo/<int:tid>/consegna")
def consegna(tid):
    u, t = _tentativo(tid, scrivere=True)
    sv.consegna(t)
    return redirect(url_for(".risultato", tid=t.id))


@bp.get("/tentativo/<int:tid>/risultato")
def risultato(tid):
    u, t = _tentativo(tid)
    if t.stato == "in_corso":
        if t.utente_id == u.id:
            return redirect(url_for(".tentativo", tid=t.id))
        flash("Prova ancora in corso: le soluzioni si vedono dopo la consegna.", "ok")
    qs = sv.domande(t) if t.stato != "in_corso" else []
    rs = sv.risposte(t)
    righe = []
    per_unita = {}
    for q in qs:
        r = rs.get(q["id"])
        scelta = json.loads(r.scelta) if r and r.scelta else []
        righe.append({"q": q, "scelta": scelta, "ok": bool(r and r.corretta), "aiuto": bool(r and r.aiuto)})
        s = per_unita.setdefault(q["unita"], [0, 0])
        s[1] += 1
        s[0] += 1 if r and r.corretta else 0
    return render_template("ragioneria_quiz/risultato.html", u=u, t=t, righe=righe, per_unita=per_unita,
                           M=sv.MODALITA[t.modalita], allievo=t.utente, SOGLIA=sv.SOGLIA, SOGLIA_PARTE=sv.SOGLIA_PARTE)


@bp.get("/piano-dei-conti")
def piano():
    return render_template("ragioneria_quiz/piano.html", PIANO=PIANO, NATURA=NATURA)


# ── DOCENTE ──────────────────────────────────────────────────────────────────
def _allievi():
    return Utente.query.filter_by(ruolo="allievo", attivo=True).order_by(Utente.nome).all()


@bp.get("/docente")
@solo_docente
def docente():
    allievi = _allievi()
    righe = []
    for al in allievi:
        a = sv.andamento(al.id)
        if not a["tentativi"]:
            righe.append({"u": al, "a": None})
            continue
        righe.append({"u": al, "a": a, "ultimo": max(t.consegnato or t.iniziato for t in a["tentativi"])})
    # quesiti più sbagliati dalla classe (prove non annullate)
    dati = (db.session.query(RispostaQuiz.qid, RispostaQuiz.corretta, RispostaQuiz.scelta)
            .join(TentativoQuiz, TentativoQuiz.id == RispostaQuiz.tentativo_id)
            .join(Utente, Utente.id == TentativoQuiz.utente_id)
            .filter(TentativoQuiz.stato != "annullato", RispostaQuiz.corretta.isnot(None), Utente.ruolo == "allievo").all())
    stat = {}
    unita_stat = {c: [0, 0] for c in UNITA}
    for qid, ok, scelta in dati:
        s = stat.setdefault(qid, {"tot": 0, "ko": 0, "scelte": {}})
        s["tot"] += 1
        if qid[:3] in unita_stat:
            unita_stat[qid[:3]][1] += 1
            unita_stat[qid[:3]][0] += 1 if ok else 0
        if not ok:
            s["ko"] += 1
            for o in json.loads(scelta or "[]"):
                s["scelte"][o] = s["scelte"].get(o, 0) + 1
    difficili = []
    for qid, s in stat.items():
        if qid in QUESITI and s["tot"] >= 2 and s["ko"]:
            q = QUESITI[qid]
            errore = max(s["scelte"].items(), key=lambda x: x[1])[0] if s["scelte"] else None
            opz = next((o for o in q["opzioni"] if o["id"] == errore), None)
            difficili.append({"q": q, "tot": s["tot"], "ko": s["ko"], "perc": round(100 * s["ko"] / s["tot"]), "errore": opz})
    difficili.sort(key=lambda d: (-d["perc"], -d["tot"]))
    return render_template("ragioneria_quiz/docente.html", righe=righe, difficili=difficili[:12], unita_stat=unita_stat,
                           banca=riepilogo(), SOGLIA=sv.SOGLIA)


@bp.get("/docente/allievo/<int:uid>")
@solo_docente
def docente_allievo(uid):
    al = db.session.get(Utente, uid) or abort(404)
    a = sv.andamento(uid)
    tutti = TentativoQuiz.query.filter_by(utente_id=uid).order_by(TentativoQuiz.iniziato.desc()).all()
    eventi = EventoQuiz.query.filter_by(utente_id=uid).order_by(EventoQuiz.data.desc()).all()
    limiti = {c: (sv.tentativi_usati(uid, "verifica", c), sv.tentativi_concessi(uid, "verifica", c)) for c in UNITA}
    limiti["finale"] = (sv.tentativi_usati(uid, "finale"), sv.tentativi_concessi(uid, "finale"))
    autori = {x.id: x.nome for x in Utente.query.filter(Utente.id.in_({e.autore_id for e in eventi} or {0})).all()}
    return render_template("ragioneria_quiz/docente_allievo.html", al=al, a=a, tutti=tutti, eventi=eventi,
                           limiti=limiti, autori=autori, MODALITA=sv.MODALITA, SOGLIA=sv.SOGLIA)


@bp.post("/docente/allievo/<int:uid>/tentativo-extra")
@solo_docente
def tentativo_extra(uid):
    al = db.session.get(Utente, uid) or abort(404)
    chiave = request.form.get("chiave", "")
    nota = (request.form.get("nota") or "").strip()[:300]
    valide = {"finale"} | {f"verifica:{c}" for c in UNITA}
    if chiave not in valide:
        abort(400)
    if not nota:
        flash("Scrivi il motivo: resta registrato.", "errore")
        return redirect(url_for(".docente_allievo", uid=uid))
    db.session.add(EventoQuiz(utente_id=al.id, autore_id=utente_corrente().id, tipo="tentativo_extra", chiave=chiave, nota=nota))
    db.session.commit()
    flash(f"Concesso un tentativo in più a {al.nome}.", "ok")
    return redirect(url_for(".docente_allievo", uid=uid))


@bp.post("/docente/tentativo/<int:tid>/annulla")
@solo_docente
def annulla(tid):
    t = db.session.get(TentativoQuiz, tid) or abort(404)
    nota = (request.form.get("nota") or "").strip()[:300]
    if not nota:
        flash("Scrivi il motivo dell'annullamento: resta registrato.", "errore")
        return redirect(url_for(".docente_allievo", uid=t.utente_id))
    if t.stato != "annullato":
        t.stato = "annullato"
        db.session.add(EventoQuiz(utente_id=t.utente_id, autore_id=utente_corrente().id, tentativo_id=t.id,
                                  tipo="annullato", chiave=sv.chiave_limite(t.modalita, t.unita), nota=nota))
        db.session.commit()
        flash("Prova annullata: i dati restano archiviati e non contano più nei risultati.", "ok")
    return redirect(url_for(".docente_allievo", uid=t.utente_id))


def _cella(v):
    s = "" if v is None else str(v)
    return "'" + s if s[:1] in ("=", "+", "-", "@", "\t", "\r") else s     # niente formule nel CSV


@bp.get("/docente/risultati.csv")
@solo_docente
def esporta():
    out = io.StringIO()
    w = csv.writer(out, delimiter=";")
    w.writerow(["Allievo", "Utente", "Prova", "Unità", "Stato", "Iniziata", "Consegnata", "Punti", "Massimo", "%",
                "Teoria", "Applicazione", "Superata", "Aiuti", "Versione banca"])
    ts = TentativoQuiz.query.order_by(TentativoQuiz.utente_id, TentativoQuiz.iniziato).all()
    for t in ts:
        w.writerow([_cella(x) for x in [
            t.utente.nome, t.utente.username, sv.MODALITA[t.modalita]["titolo"],
            f"{t.unita} {UNITA[t.unita]['titolo']}" if t.unita in UNITA else "", t.stato,
            ora_italiana(t.iniziato), ora_italiana(t.consegnato) if t.consegnato else "",
            t.punti, t.massimo, t.percentuale,
            f"{t.punti_teoria}/{t.max_teoria}" if t.max_teoria else "", f"{t.punti_app}/{t.max_app}" if t.max_app else "",
            "" if t.superato is None else ("sì" if t.superato else "no"), t.aiuti, t.versione_banca]])
    testo = "﻿" + "SIMULAZIONE DIDATTICA — NON VALIDO AI FINI FISCALI O COMMERCIALI\n" + out.getvalue()
    return Response(testo, mimetype="text/csv",
                    headers={"Content-Disposition": "attachment; filename=ragioneria-quiz-risultati.csv"})


@bp.get("/docente/banca")
@solo_docente
def docente_banca():
    return render_template("ragioneria_quiz/docente_banca.html", banca=riepilogo())
