"""Blueprint «Docente» — allievi, tempo di collegamento e costo, consegne da correggere, report stampabile, risposta."""
import csv
import io
import re
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from flask import Blueprint, Response, abort, flash, redirect, render_template, request, url_for

from ...accesso import solo_docente, utente_corrente
from ...db import ROMA, ArchivioLavoro, Consegna, Impostazione, Sessione, StatoLavoro, Utente, adesso, costo_orario_generale, db, ora_italiana
from ...pagine import LAB_SLOTS, VERSIONI

LAVORI = {**{v: v for v in VERSIONI}, **{k: 'lab ' + v for k, v in LAB_SLOTS.items()}}
from ...report import report as report_lavoro
from ...esercizi import ESERCIZI
from ...report import report

bp = Blueprint("docente", __name__, url_prefix="/docente", template_folder="templates")
bp.before_request(solo_docente(lambda: None))

USERNAME = re.compile(r"^[a-z0-9._-]{3,60}$")


def costo(secondi, tariffa):
    return round(secondi / 3600 * (tariffa or 0), 2)


def _data(s, fine=False):
    """Data italiana del filtro (AAAA-MM-GG) → istante UTC di inizio (o fine) giornata."""
    try:
        d = datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=ROMA)
    except (TypeError, ValueError):
        return None
    if fine:
        d += timedelta(days=1)
    return d.astimezone(timezone.utc).replace(tzinfo=None)


def tempi(dal=None, al=None):
    """Secondi di collegamento per allievo nel periodo (sessioni iniziate nel periodo)."""
    q = db.session.query(Sessione.utente_id, db.func.coalesce(db.func.sum(Sessione.secondi_attivi), 0),
                         db.func.count(Sessione.id), db.func.max(Sessione.ultimo))
    if dal:
        q = q.filter(Sessione.inizio >= dal)
    if al:
        q = q.filter(Sessione.inizio < al)
    return {uid: {"secondi": int(s or 0), "sessioni": n, "ultimo": ult} for uid, s, n, ult in q.group_by(Sessione.utente_id).all()}


def righe_allievi(dal=None, al=None, anche_disattivi=True):
    t = tempi(dal, al)
    da_corr = dict(db.session.query(Consegna.utente_id, db.func.count(Consegna.id)).filter(Consegna.stato == "da_correggere")
                   .group_by(Consegna.utente_id).all())
    q = Utente.query.filter_by(ruolo="allievo")
    if not anche_disattivi:
        q = q.filter_by(attivo=True)
    out = []
    for u in q.order_by(Utente.nome).all():
        x = t.get(u.id, {"secondi": 0, "sessioni": 0, "ultimo": None})
        tar = u.tariffa()
        out.append({"u": u, "secondi": x["secondi"], "sessioni": x["sessioni"], "tariffa": tar,
                    "costo": costo(x["secondi"], tar), "da_correggere": da_corr.get(u.id, 0)})
    return out


@bp.route("/")
def pannello():
    righe = righe_allievi()
    consegne = Consegna.query.filter_by(stato="da_correggere").order_by(Consegna.consegnata).all()
    recenti = Consegna.query.filter_by(stato="corretta").order_by(Consegna.corretta_il.desc()).limit(10).all()
    oggi = _data(datetime.now(ROMA).strftime("%Y-%m-%d"))
    collegati = Utente.query.filter(Utente.ruolo == "allievo", Utente.ultimo_accesso >= adesso() - timedelta(minutes=5)).count()
    return render_template("docente/pannello.html", righe=righe, consegne=consegne, recenti=recenti, esercizi=ESERCIZI,
                           tot_secondi=sum(r["secondi"] for r in righe), tot_costo=round(sum(r["costo"] for r in righe), 2),
                           oggi=sum(x["secondi"] for x in tempi(oggi).values()), collegati=collegati,
                           tariffa=costo_orario_generale())


def _password_temporanea():
    alfabeto = "abcdefghjkmnpqrstuvwxyz23456789"
    return "".join(secrets.choice(alfabeto) for _ in range(10))


def _costo_form(v):
    v = (v or "").strip().replace(",", ".")
    if not v:
        return None
    try:
        x = round(float(v), 2)
    except ValueError:
        raise ValueError("Costo orario non valido.")
    if x < 0:
        raise ValueError("Il costo orario non può essere negativo.")
    return x


@bp.route("/allievi/nuovo", methods=["GET", "POST"])
def nuovo_allievo():
    dati = {"username": "", "nome": "", "email": "", "costo_orario": ""}
    if request.method == "POST":
        dati = {k: (request.form.get(k) or "").strip() for k in dati}
        dati["username"] = dati["username"].lower()
        errore = None
        try:
            tariffa = _costo_form(dati["costo_orario"])
        except ValueError as e:
            errore = str(e)
        if not USERNAME.match(dati["username"]):
            errore = "Nome utente: 3-60 caratteri fra lettere minuscole, numeri, punto, trattino."
        elif Utente.query.filter_by(username=dati["username"]).first():
            errore = "Questo nome utente esiste già."
        elif not dati["nome"]:
            errore = "Scrivi nome e cognome dell'allievo."
        if errore:
            flash(errore, "errore")
        else:
            pw = (request.form.get("password") or "").strip() or _password_temporanea()
            u = Utente(username=dati["username"], nome=dati["nome"][:120], email=dati["email"][:160], ruolo="allievo",
                       costo_orario=tariffa, deve_cambiare_password=True)
            u.imposta_password(pw)
            db.session.add(u)
            db.session.commit()
            return render_template("docente/credenziali.html", u=u, password=pw, nuovo=True)
    return render_template("docente/nuovo_allievo.html", dati=dati, tariffa=costo_orario_generale())


def _allievo(uid):
    u = db.session.get(Utente, uid)
    if u is None or u.ruolo != "allievo":
        abort(404)
    return u


@bp.route("/allievo/<int:uid>", methods=["GET", "POST"])
def allievo(uid):
    u = _allievo(uid)
    if request.method == "POST":
        try:
            u.costo_orario = _costo_form(request.form.get("costo_orario"))
        except ValueError as e:
            flash(str(e), "errore")
            return redirect(url_for("docente.allievo", uid=uid))
        u.nome = (request.form.get("nome") or u.nome).strip()[:120] or u.nome
        u.email = (request.form.get("email") or "").strip()[:160]
        u.attivo = request.form.get("attivo") == "1"
        db.session.commit()
        flash("Dati dell'allievo salvati.", "ok")
        return redirect(url_for("docente.allievo", uid=uid))
    sessioni = u.sessioni.order_by(Sessione.inizio.desc()).limit(100).all()
    consegne = u.consegne.order_by(Consegna.consegnata.desc()).all()
    sec = u.secondi_totali()
    return render_template("docente/allievo.html", u=u, sessioni=sessioni, consegne=consegne, secondi=sec,
                           costo=costo(sec, u.tariffa()), tariffa_generale=costo_orario_generale(), esercizi=ESERCIZI, costo_f=costo)


@bp.route("/allievo/<int:uid>/password", methods=["POST"])
def reimposta_password(uid):
    u = _allievo(uid)
    pw = _password_temporanea()
    u.imposta_password(pw)
    u.deve_cambiare_password, u.tentativi_falliti, u.bloccato_fino = True, 0, None
    db.session.commit()
    return render_template("docente/credenziali.html", u=u, password=pw, nuovo=False)


def _consegna(cid):
    c = db.session.get(Consegna, cid)
    if c is None:
        abort(404)
    return c


def _mailto(c):
    if not c.utente.email:
        return None
    oggetto = f"Correzione esercizio del {ora_italiana(c.consegnata, '%d/%m/%Y')} — MASTERSAPSTYLE Academy"
    corpo = f"Ciao {c.utente.nome},\n\n{c.risposta or ''}\n"
    if c.voto:
        corpo += f"\nValutazione: {c.voto}\n"
    corpo += f"\nTrovi la correzione anche nella tua area: {url_for('allievo.vedi', cid=c.id, _external=True)}\n"
    return f"mailto:{quote(c.utente.email)}?subject={quote(oggetto)}&body={quote(corpo[:1800])}"


@bp.route("/consegna/<int:cid>", methods=["GET", "POST"])
def consegna(cid):
    c = _consegna(cid)
    if request.method == "POST":
        c.risposta = (request.form.get("risposta") or "").strip()[:20000]
        c.voto = (request.form.get("voto") or "").strip()[:30]
        if request.form.get("azione") == "invia":
            if c.stato != "corretta" or request.form.get("rinvia"):
                c.letta = False
            c.stato, c.corretta_il = "corretta", adesso()
            flash("Correzione inviata: l'allievo la trova nella sua area.", "ok")
        else:
            flash("Bozza salvata (l'allievo non la vede ancora).", "ok")
        db.session.commit()
        return redirect(url_for("docente.consegna", cid=cid))
    r = report(c.dati, c.esercizio)
    return render_template("docente/consegna.html", c=c, r=r, mailto=_mailto(c), esercizio=ESERCIZI.get(c.esercizio, ESERCIZI["libero"]),
                           costo=costo(c.secondi_collegato, c.utente.tariffa()))


@bp.route("/consegna/<int:cid>/stampa")
def stampa(cid):
    c = _consegna(cid)
    r = report(c.dati, c.esercizio)
    return render_template("docente/stampa.html", c=c, r=r, esercizio=ESERCIZI.get(c.esercizio, ESERCIZI["libero"]),
                           costo=costo(c.secondi_collegato, c.utente.tariffa()), stampato=adesso())


@bp.route("/consegna/<int:cid>/backup.json")
def backup(cid):
    c = _consegna(cid)
    nome = f"consegna-{c.id}-{c.utente.username}-{c.versione}.json"
    return Response(c.dati, mimetype="application/json", headers={"Content-Disposition": f'attachment; filename="{nome}"'})


@bp.route("/tempi")
def tempi_pagina():
    dal_s, al_s = request.args.get("dal") or "", request.args.get("al") or ""
    righe = righe_allievi(_data(dal_s), _data(al_s, fine=True))
    if request.args.get("formato") == "csv":
        buf = io.StringIO()
        w = csv.writer(buf, delimiter=";")
        w.writerow(["Allievo", "Nome utente", "Sessioni", "Ore", "Minuti totali", "Costo orario €", "Costo €", "Ultimo accesso"])
        for x in righe:
            w.writerow([x["u"].nome, x["u"].username, x["sessioni"], f"{x['secondi'] / 3600:.2f}".replace(".", ","),
                        x["secondi"] // 60, f"{x['tariffa']:.2f}".replace(".", ","), f"{x['costo']:.2f}".replace(".", ","),
                        ora_italiana(x["u"].ultimo_accesso)])
        nome = f"tempi-collegamento{('-dal-' + dal_s) if dal_s else ''}{('-al-' + al_s) if al_s else ''}.csv"
        return Response("﻿" + buf.getvalue(), mimetype="text/csv", headers={"Content-Disposition": f'attachment; filename="{nome}"'})
    return render_template("docente/tempi.html", righe=righe, dal=dal_s, al=al_s,
                           tot_secondi=sum(x["secondi"] for x in righe), tot_costo=round(sum(x["costo"] for x in righe), 2))


@bp.route("/impostazioni", methods=["GET", "POST"])
def impostazioni():
    if request.method == "POST":
        try:
            v = _costo_form(request.form.get("costo_orario")) or 0.0
        except ValueError as e:
            flash(str(e), "errore")
            return redirect(url_for("docente.impostazioni"))
        imp = db.session.get(Impostazione, "costo_orario") or Impostazione(chiave="costo_orario", valore="0")
        imp.valore = f"{v:.2f}"
        db.session.add(imp)
        db.session.commit()
        flash("Costo orario generale salvato.", "ok")
        return redirect(url_for("docente.pannello"))
    return render_template("docente/impostazioni.html", tariffa=costo_orario_generale(), u=utente_corrente())


def _riassunto(stato):
    if stato is None:
        return None
    try:
        ind = report_lavoro(stato.dati)["indicatori"]
    except Exception:  # noqa: BLE001
        ind = {}
    return {"scritture": ind.get("scritture", 0), "ultima": ind.get("ultima_data", ""), "aggiornato": stato.aggiornato}


def copia_lavoro(da, a, versione, motivo):
    """Il lavoro di «da» diventa il lavoro di «a» (il precedente di «a» va in archivio). Ritorna False se «da» non ha lavoro."""
    sorgente = StatoLavoro.query.filter_by(utente_id=da.id, versione=versione).first()
    if sorgente is None:
        return False
    dest = StatoLavoro.query.filter_by(utente_id=a.id, versione=versione).first()
    if dest is None:
        db.session.add(StatoLavoro(utente_id=a.id, versione=versione, dati=sorgente.dati, rev=1))
    elif dest.dati != sorgente.dati:
        db.session.add(ArchivioLavoro(utente_id=a.id, versione=versione, dati=dest.dati, motivo=motivo[:200]))
        dest.dati, dest.rev, dest.aggiornato = sorgente.dati, dest.rev + 1, adesso()
    return True


@bp.route("/passa", methods=["GET", "POST"])
def passa():
    """Passa il comando: il lavoro del docente va a uno o più allievi (o quello di un allievo al docente)."""
    io = utente_corrente()
    allievi = Utente.query.filter_by(ruolo="allievo", attivo=True).order_by(Utente.nome).all()
    versione = request.values.get("versione") if request.values.get("versione") in LAVORI else "vuoto"
    if request.method == "POST":
        verso = request.form.get("verso")
        if verso == "a_allievi":
            scelti = [u for u in allievi if str(u.id) in request.form.getlist("allievi")]
            if not scelti:
                flash("Scegli almeno un allievo.", "errore")
            elif not StatoLavoro.query.filter_by(utente_id=io.id, versione=versione).first():
                flash(f"Non hai ancora lavoro salvato nella versione {versione}.", "errore")
            else:
                for u in scelti:
                    copia_lavoro(io, u, versione, f"sostituito dal lavoro del docente {ora_italiana(adesso())}")
                db.session.commit()
                flash(f"Lavoro passato a {', '.join(u.nome for u in scelti)}: alla prossima pagina che aprono riprendono da qui, "
                      "e la finestra «Esercizio passo passo» riparte dal passo giusto.", "ok")
                return redirect(url_for("docente.passa", versione=versione))
        elif verso == "da_allievo":
            u = next((x for x in allievi if str(x.id) == request.form.get("allievo")), None)
            if u is None:
                flash("Scegli l'allievo.", "errore")
            elif not copia_lavoro(u, io, versione, f"sostituito dal lavoro di {u.nome} {ora_italiana(adesso())}"):
                flash(f"{u.nome} non ha ancora lavoro salvato nella versione {versione}.", "errore")
            else:
                db.session.commit()
                flash(f"Ora il tuo simulatore ha il lavoro di {u.nome}. Il tuo precedente è in archivio.", "ok")
                return redirect(url_for("docente.passa", versione=versione))
    mio = _riassunto(StatoLavoro.query.filter_by(utente_id=io.id, versione=versione).first())
    righe = [{"u": u, "lavoro": _riassunto(StatoLavoro.query.filter_by(utente_id=u.id, versione=versione).first())} for u in allievi]
    archivio = ArchivioLavoro.query.order_by(ArchivioLavoro.creato.desc()).limit(20).all()
    nomi = {u.id: u.nome for u in Utente.query.all()}
    return render_template("docente/passa.html", versione=versione, versioni=LAVORI, mio=mio, righe=righe, archivio=archivio, nomi=nomi)


@bp.route("/archivio/<int:aid>/ripristina", methods=["POST"])
def ripristina(aid):
    a = db.session.get(ArchivioLavoro, aid)
    if a is None:
        abort(404)
    u = db.session.get(Utente, a.utente_id)
    dest = StatoLavoro.query.filter_by(utente_id=a.utente_id, versione=a.versione).first()
    if dest is None:
        db.session.add(StatoLavoro(utente_id=a.utente_id, versione=a.versione, dati=a.dati, rev=1))
    else:
        db.session.add(ArchivioLavoro(utente_id=a.utente_id, versione=a.versione, dati=dest.dati, motivo=f"prima del ripristino {ora_italiana(adesso())}"))
        dest.dati, dest.rev, dest.aggiornato = a.dati, dest.rev + 1, adesso()
    db.session.commit()
    flash(f"Ripristinato il lavoro di {u.nome} del {ora_italiana(a.creato)}.", "ok")
    return redirect(url_for("docente.passa", versione=a.versione))
