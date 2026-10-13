"""Blueprint «Accessi» — entrata, uscita e cambio password di allievi e docente."""
from datetime import timedelta
from urllib.parse import urlparse

from flask import Blueprint, flash, redirect, render_template, request, session, url_for

from ...accesso import apri_sessione, csrf_token, csrf_valido, utente_corrente
from ...db import Utente, adesso, db

bp = Blueprint("accessi", __name__, template_folder="templates")

TENTATIVI = 5
BLOCCO = timedelta(minutes=10)


def _sicura(dest):
    """Solo destinazioni interne al portale."""
    if not dest:
        return None
    u = urlparse(dest)
    if u.scheme or u.netloc or not dest.startswith("/") or dest.startswith("//"):
        return None
    return dest


def _casa(u):
    return url_for("docente.pannello") if u.docente else url_for("allievo.area")


@bp.route("/accesso", methods=["GET", "POST"])
def accesso():
    prossima = _sicura(request.values.get("prossima"))
    if request.method == "GET":
        u = utente_corrente()
        if u:
            return redirect(prossima or _casa(u))
        return render_template("accessi/accesso.html", prossima=prossima, username="")
    if not csrf_valido(request.form.get("csrf")):
        flash("Modulo scaduto: riprova.", "errore")
        return redirect(url_for("accessi.accesso", prossima=prossima))
    username = (request.form.get("username") or "").strip().lower()
    password = request.form.get("password") or ""
    u = Utente.query.filter_by(username=username).first()
    ora = adesso()
    if u and u.bloccato_fino and u.bloccato_fino > ora:
        minuti = int((u.bloccato_fino - ora).total_seconds() // 60) + 1
        flash(f"Troppi tentativi sbagliati: riprova fra {minuti} minuti.", "errore")
        return render_template("accessi/accesso.html", prossima=prossima, username=username), 429
    if not u or not u.attivo or not u.verifica_password(password):
        if u:
            u.tentativi_falliti += 1
            if u.tentativi_falliti >= TENTATIVI:
                u.bloccato_fino, u.tentativi_falliti = ora + BLOCCO, 0
            db.session.commit()
        flash("Nome utente o password non corretti." if not u or u.attivo else "Accesso disattivato: rivolgiti al docente.", "errore")
        return render_template("accessi/accesso.html", prossima=prossima, username=username), 401
    u.tentativi_falliti, u.bloccato_fino, u.ultimo_accesso = 0, None, ora
    db.session.commit()
    apri_sessione(u)
    if u.deve_cambiare_password:
        return redirect(url_for("accessi.password"))
    return redirect(prossima or _casa(u))


@bp.route("/esci", methods=["POST"])
def esci():
    session.clear()
    return render_template("accessi/uscita.html")


@bp.route("/password", methods=["GET", "POST"])
def password():
    u = utente_corrente()
    if request.method == "POST":
        attuale = request.form.get("attuale") or ""
        nuova = request.form.get("nuova") or ""
        conferma = request.form.get("conferma") or ""
        if not u.verifica_password(attuale):
            flash("La password attuale non è corretta.", "errore")
        elif len(nuova) < 8:
            flash("La nuova password deve avere almeno 8 caratteri.", "errore")
        elif nuova != conferma:
            flash("Le due password nuove non coincidono.", "errore")
        elif nuova == attuale:
            flash("Scegli una password diversa da quella attuale.", "errore")
        else:
            u.imposta_password(nuova)
            u.deve_cambiare_password = False
            db.session.commit()
            apri_sessione(u)
            flash("Password aggiornata.", "ok")
            return redirect(_casa(u))
    return render_template("accessi/password.html", obbligo=u.deve_cambiare_password)
