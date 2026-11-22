"""Ragioneria internazionale IFRS e OIC (Firenze · Amministrazione, terzo passo).

Corsetto da seguire dopo l'esercizio ERP e la ragioneria OIC: 12 moduli, 100 ore, sul caso Ferro & Transenne
con i ledger paralleli 0L (OIC) e 2L (IFRS). Ogni modulo ha le sue pagine: obiettivi, manuale, laboratorio,
libro giornale, test e valutazione. Le correzioni le fa il server; il docente vede chi ha lavorato, quanto
e che cosa ha fatto, e mette il voto. Non movimenta la contabilità del simulatore ERP."""
import json

from flask import Blueprint, abort, flash, redirect, render_template, request, url_for

from ...accesso import solo_docente, utente_corrente
from ...db import Utente, adesso, db
from . import servizi as sv
from .modelli import RiEvento, RiModulo, RiScrittura

bp = Blueprint("ragioneria_internazionale", __name__, url_prefix="/ragioneria-internazionale",
               template_folder="templates", static_folder="static", static_url_path="/static-ri")


def _modulo(n):
    if n not in sv.MODULI:
        abort(404)
    return sv.MODULI[n]


def _ctx(n, pagina, **kw):
    u = utente_corrente()
    sv.segna_pagina(u.id, n, pagina)
    return dict(u=u, n=n, m=sv.MODULI[n], pagina=pagina, moduli=sv.MODULI, r=sv.riepilogo_modulo(u.id, n), sv=sv, **kw)


# ── ALLIEVO ──────────────────────────────────────────────────────────────────
@bp.get("/")
def indice():
    u = utente_corrente()
    rip = sv.riepilogo(u.id)
    return render_template("ragioneria_internazionale/indice.html", u=u, rip=rip, ore=sv.ORE,
                           completi=sum(1 for x in rip if x["completo"]))


@bp.get("/modulo/<int:n>")
def obiettivi(n):
    _modulo(n)
    r = sv.stato(utente_corrente().id, n)
    return render_template("ragioneria_internazionale/obiettivi.html", spuntati=sv.js(r.passi, []) if r else [],
                           **_ctx(n, "obiettivi"))


@bp.post("/modulo/<int:n>/passi")
def passi(n):
    m = _modulo(n)
    u = utente_corrente()
    r = sv.stato(u.id, n, crea=True)
    scelti = sorted({int(x) for x in request.form.getlist("passo") if x.isdigit() and int(x) < len(m["tasks"])})
    r.passi, r.aggiornato = json.dumps(scelti), adesso()
    sv.evento(u.id, n, "passo", f"Passi spuntati: {len(scelti)}/{len(m['tasks'])}")
    db.session.commit()
    flash("Passi salvati.", "ok")
    return redirect(url_for(".obiettivi", n=n))


@bp.get("/modulo/<int:n>/manuale")
def manuale(n):
    _modulo(n)
    return render_template("ragioneria_internazionale/manuale.html", blocchi=sv.CONTENUTI[n], **_ctx(n, "manuale"))


@bp.route("/modulo/<int:n>/laboratorio", methods=["GET", "POST"])
def laboratorio(n):
    _modulo(n)
    u = utente_corrente()
    r = sv.stato(u.id, n)
    if request.method == "POST":
        r = r or sv.stato(u.id, n, crea=True)
        valori = {k: (request.form.get(k) or "").strip()[:30] for k in sv.ATTESI[n]}
        esito = sv.controlla_lab(n, valori)
        r.valori, r.lab_esito, r.lab_ok, r.aggiornato = json.dumps(valori), json.dumps(esito), all(esito.values()), adesso()
        giusti = sum(esito.values())
        sv.evento(u.id, n, "laboratorio", f"Controllo risultati: {giusti}/{len(esito)} corretti")
        db.session.commit()
        flash("Tutti i risultati sono corretti: passa al libro giornale." if r.lab_ok else f"{giusti} risultati corretti su {len(esito)}: rivedi quelli segnati in rosso.",
              "ok" if r.lab_ok else "errore")
        return redirect(url_for(".laboratorio", n=n))
    return render_template("ragioneria_internazionale/laboratorio.html", valori=sv.js(r.valori, {}) if r else {},
                           esito=sv.js(r.lab_esito, {}) if r else {}, **_ctx(n, "laboratorio"))


@bp.route("/modulo/<int:n>/giornale", methods=["GET", "POST"])
def giornale(n):
    _modulo(n)
    u = utente_corrente()
    if request.method == "POST":
        righe, errore = sv.leggi_righe(request.form)
        ledger = request.form.get("ledger") if request.form.get("ledger") in ("0L", "2L") else "0L"
        rif = (request.form.get("riferimento") or "").strip()[:40] or f"DOC-{RiScrittura.query.filter_by(utente_id=u.id).count() + 1}"
        if errore:
            sv.evento(u.id, n, "scrittura", "Non registrata: " + errore)
            db.session.commit()
            flash(errore, "errore")
            return redirect(url_for(".giornale", n=n))
        if RiScrittura.query.filter_by(utente_id=u.id, modulo=n, riferimento=rif, ledger=ledger).first():
            flash("Riferimento già usato in questo modulo e ledger: evita le doppie registrazioni.", "errore")
            return redirect(url_for(".giornale", n=n))
        ok, modello, esito = sv.confronta(n, righe, ledger)
        db.session.add(RiScrittura(utente_id=u.id, modulo=n, data=(request.form.get("data") or "2027-12-31")[:10], ledger=ledger,
                                   riferimento=rif, testo=(request.form.get("testo") or "").strip()[:160],
                                   righe=json.dumps(righe), totale_cent=sum(x["dare"] for x in righe), ok=ok, modello=modello if ok else "", esito=esito))
        sv.evento(u.id, n, "scrittura", f"{rif} ({ledger}): {esito}")
        db.session.commit()
        flash(esito, "ok" if ok else "errore")
        return redirect(url_for(".giornale", n=n))
    docs = RiScrittura.query.filter_by(utente_id=u.id, modulo=n).order_by(RiScrittura.creato).all()
    return render_template("ragioneria_internazionale/giornale.html", docs=docs, righe_di=lambda d: json.loads(d.righe),
                           fatte=sv.scritture_fatte(u.id, n), **_ctx(n, "giornale"))


@bp.post("/modulo/<int:n>/giornale/<int:did>/elimina")
def elimina(n, did):
    u = utente_corrente()
    d = db.session.get(RiScrittura, did)
    if d is None or d.utente_id != u.id or d.modulo != n:
        abort(404)
    sv.evento(u.id, n, "scrittura", f"Eliminato il documento {d.riferimento} ({d.ledger})")
    db.session.delete(d)
    db.session.commit()
    flash("Documento eliminato.", "ok")
    return redirect(url_for(".giornale", n=n))


@bp.route("/modulo/<int:n>/test", methods=["GET", "POST"])
def test(n):
    _modulo(n)
    u = utente_corrente()
    r = sv.stato(u.id, n)
    if request.method == "POST":
        scelte = []
        for i in range(len(sv.QUIZ[n])):
            v = request.form.get(f"q{i}", "")
            scelte.append(int(v) if v.isdigit() else None)
        if None in scelte:
            flash("Rispondi a tutte le domande.", "errore")
            return redirect(url_for(".test", n=n))
        r = r or sv.stato(u.id, n, crea=True)
        giuste, punti, ok = sv.correggi_quiz(n, scelte)
        r.quiz_risposte, r.quiz_punti, r.quiz_superato = json.dumps(scelte), punti, ok
        r.quiz_tentativi = (r.quiz_tentativi or 0) + 1
        r.aggiornato = adesso()
        sv.evento(u.id, n, "test", f"Test: {giuste}/{len(scelte)} · {punti}/100 · {'superato' if ok else 'da ripetere'}")
        db.session.commit()
        return redirect(url_for(".test", n=n, esito=1))
    risposte = sv.js(r.quiz_risposte, []) if r else []
    mostra = request.args.get("esito") == "1" and bool(risposte)
    domande = [{"i": i, "testo": q[0], "opzioni": [(j, q[1][j]) for j in sv.ordine(n, i)],
                "scelta": risposte[i] if i < len(risposte) else None,
                "giusta": q[2] if mostra else None} for i, q in enumerate(sv.QUIZ[n])]
    return render_template("ragioneria_internazionale/test.html", domande=domande, mostra=mostra, stato_r=r, **_ctx(n, "test"))


@bp.route("/modulo/<int:n>/valutazione", methods=["GET", "POST"])
def valutazione(n):
    _modulo(n)
    u = utente_corrente()
    r = sv.stato(u.id, n)
    if request.method == "POST":
        try:
            punti = [int(request.form.get(f"p{i}", "")) for i in range(4)]
        except ValueError:
            punti = [-1]
        if len(punti) != 4 or any(not 0 <= p <= 25 for p in punti):
            flash("Ogni indicatore vuole un punteggio intero da 0 a 25.", "errore")
            return redirect(url_for(".valutazione", n=n))
        r = r or sv.stato(u.id, n, crea=True)
        r.autovalutazione, r.aggiornato = json.dumps(punti), adesso()
        sv.evento(u.id, n, "valutazione", f"Autovalutazione: {sum(punti)}/100")
        db.session.commit()
        flash(f"Autovalutazione salvata: {sum(punti)}/100. Il voto ufficiale lo mette il docente.", "ok")
        return redirect(url_for(".valutazione", n=n))
    return render_template("ragioneria_internazionale/valutazione.html", auto=sv.js(r.autovalutazione, []) if r else [],
                           voto=sv.js(r.voto, []) if r else [], nota=r.nota_docente if r else "",
                           corretto=r.corretto_il if r else None, ind=sv.indicatori(n), **_ctx(n, "valutazione"))


# ── DOCENTE ──────────────────────────────────────────────────────────────────
def _allievi():
    return Utente.query.filter_by(ruolo="allievo", attivo=True).order_by(Utente.nome).all()


@bp.get("/docente")
@solo_docente
def docente():
    righe = []
    for al in _allievi():
        rip = sv.riepilogo(al.id)
        sec, ultima, azioni = sv.tempo_e_ultima(al.id)
        righe.append({"u": al, "rip": rip, "sec": sec, "ultima": ultima, "azioni": azioni,
                      "completi": sum(1 for x in rip if x["completo"]),
                      "da_correggere": sum(1 for x in rip if (x["lab_ok"] or x["quiz"] is not None) and x["voto"] is None)})
    return render_template("ragioneria_internazionale/docente.html", righe=righe, moduli=sv.MODULI)


@bp.get("/docente/allievo/<int:uid>")
@solo_docente
def docente_allievo(uid):
    al = db.session.get(Utente, uid) or abort(404)
    stati = {r.modulo: r for r in RiModulo.query.filter_by(utente_id=uid).all()}
    dettagli = []
    for n in sorted(sv.MODULI):
        r = stati.get(n)
        dettagli.append({"rip": sv.riepilogo_modulo(uid, n, r), "valori": sv.js(r.valori, {}) if r else {},
                         "esito": sv.js(r.lab_esito, {}) if r else {}, "auto": sv.js(r.autovalutazione, []) if r else [],
                         "voto": sv.js(r.voto, []) if r else [], "nota": r.nota_docente if r else "",
                         "corretto": r.corretto_il if r else None, "tentativi": r.quiz_tentativi if r else 0,
                         "docs": RiScrittura.query.filter_by(utente_id=uid, modulo=n).order_by(RiScrittura.creato).all(),
                         "ind": sv.indicatori(n)})
    sec, ultima, azioni = sv.tempo_e_ultima(uid)
    diario = RiEvento.query.filter_by(utente_id=uid).filter(RiEvento.tipo != "pagina").order_by(RiEvento.quando.desc()).limit(80).all()
    return render_template("ragioneria_internazionale/docente_allievo.html", al=al, dettagli=dettagli, sec=sec, ultima=ultima,
                           azioni=azioni, diario=diario, righe_di=lambda d: json.loads(d.righe), sv=sv)


@bp.post("/docente/allievo/<int:uid>/modulo/<int:n>/voto")
@solo_docente
def voto(uid, n):
    _modulo(n)
    al = db.session.get(Utente, uid) or abort(404)
    try:
        punti = [int(request.form.get(f"p{i}", "")) for i in range(4)]
    except ValueError:
        punti = [-1]
    if len(punti) != 4 or any(not 0 <= p <= 25 for p in punti):
        flash("Ogni indicatore vuole un punteggio intero da 0 a 25.", "errore")
        return redirect(url_for(".docente_allievo", uid=uid) + f"#m{n}")
    r = sv.stato(al.id, n, crea=True)
    r.voto, r.nota_docente, r.corretto_il = json.dumps(punti), (request.form.get("nota") or "").strip()[:2000], adesso()
    sv.evento(al.id, n, "voto", f"Voto del docente: {sum(punti)}/100")
    db.session.commit()
    flash(f"Voto salvato per {al.nome}, modulo {n}: {sum(punti)}/100.", "ok")
    return redirect(url_for(".docente_allievo", uid=uid) + f"#m{n}")
