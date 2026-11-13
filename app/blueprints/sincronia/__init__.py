"""Blueprint «Sincronia» — il lavoro dell'allievo segue l'allievo, non il browser; misura del tempo di collegamento.

- /api/stato/<versione>  GET / POST: lo stato del simulatore (lo stesso JSON del localStorage) salvato nel database
- /api/battito          POST ogni minuto dalla pagina aperta e in uso: allunga la sessione di collegamento
"""
import json

from flask import Blueprint, jsonify, request

from ...accesso import csrf_valido, utente_corrente
from datetime import timedelta

from ...db import ArchivioLavoro, DiarioAzione, Sessione, StatoLavoro, adesso, db
from ...pagine import LAB_SLOTS, VERSIONI

SLOT_VALIDI = set(VERSIONI) | set(LAB_SLOTS) | {
    "erp-ft-doc-pistoia", "erp-ft-doc-firenze", "erp-ft-doc-dic-pistoia", "erp-ft-doc-dic-firenze", "erp-ft-doc-pianificazione"
}  # le due prove del docente sono indipendenti dall'azienda principale

bp = Blueprint("sincronia", __name__, template_folder="templates", static_folder="static", static_url_path="/static/sincronia")

# ── protezione del lavoro ─────────────────────────────────────────────────────────────────────
# Il salvataggio sostituisce l'intero stato: se arriva uno stato vuoto o incompleto (altra scheda, memoria del browser
# svuotata, pannello che scrive prima del simulatore) il lavoro sarebbe perso senza possibilità di recupero.
# 1. uno stato di tipo diverso o senza `lab` non sostituisce mai un lavoro popolato (risposta 409, il browser si riallinea)
# 2. prima di ogni sostituzione che riduce le scritture, e comunque ogni AUTO_OGNI minuti, il lavoro precedente va in archivio
AUTO_PREFISSO = "copia automatica"
AUTO_OGNI = timedelta(minutes=30)
AUTO_TENUTE = 8          # copie a tempo conservate per allievo e lavoro
RIDUZIONI_TENUTE = 8     # copie «prima di una riduzione» conservate per allievo e lavoro


def riassunto(dati):
    """(tipo, scritture) di uno stato salvato; (None, None) se non è un oggetto JSON leggibile."""
    try:
        o = json.loads(dati)
    except (TypeError, ValueError):
        return None, None
    if not isinstance(o, dict):
        return None, None
    regs = o.get("registrazioni")
    return o.get("lab"), (len(regs) if isinstance(regs, list) else 0)


def sostituzione_ammessa(vecchio, nuovo):
    """False se `nuovo` cancellerebbe un lavoro popolato con uno stato di altro tipo o incompleto."""
    lab_v, n_v = riassunto(vecchio)
    lab_n, n_n = riassunto(nuovo)
    if lab_n is None and n_n is None:
        return False
    if (n_v or 0) > 0 and lab_v != lab_n:
        # Lavoro salvato senza tipo (vecchio formato) e nuovo lavoro con tipo e non più povero: si accetta (il vecchio va in archivio).
        # Prima veniva rifiutato per sempre e l'allievo ripartiva ogni volta dallo stesso punto.
        return lab_v is None and lab_n is not None and (n_n or 0) >= (n_v or 0)
    return True


def archivia_prima(u, s, motivo, categoria, tieni):
    db.session.add(ArchivioLavoro(utente_id=u.id, versione=s.versione, dati=s.dati, motivo=motivo))
    db.session.flush()
    vecchie = (ArchivioLavoro.query.filter(ArchivioLavoro.utente_id == u.id, ArchivioLavoro.versione == s.versione,
                                           ArchivioLavoro.motivo.like(categoria + "%"))
               .order_by(ArchivioLavoro.creato.desc(), ArchivioLavoro.id.desc()).all())
    for x in vecchie[tieni:]:
        db.session.delete(x)


def proteggi_e_sostituisci(u, s, dati, esplicito=False):
    """Sostituisce il lavoro salvato mettendo prima al sicuro quello che c'era. Ritorna False se la sostituzione è rifiutata."""
    if not esplicito and not sostituzione_ammessa(s.dati, dati):
        return False
    ora = adesso()
    _, n_v = riassunto(s.dati)
    _, n_n = riassunto(dati)
    etichetta = ora.strftime("%d/%m/%Y %H:%M")
    if n_v and n_n < n_v:
        archivia_prima(u, s, f"{AUTO_PREFISSO} prima di una riduzione ({n_v}→{n_n} scritture) · {etichetta}", f"{AUTO_PREFISSO} prima di una riduzione", RIDUZIONI_TENUTE)
    else:
        ultima = (ArchivioLavoro.query.filter(ArchivioLavoro.utente_id == u.id, ArchivioLavoro.versione == s.versione,
                                              ArchivioLavoro.motivo.like(AUTO_PREFISSO + " a tempo%"))
                  .order_by(ArchivioLavoro.creato.desc()).first())
        if n_v and (ultima is None or ora - ultima.creato >= AUTO_OGNI):
            archivia_prima(u, s, f"{AUTO_PREFISSO} a tempo ({n_v} scritture) · {etichetta}", f"{AUTO_PREFISSO} a tempo", AUTO_TENUTE)
    s.dati, s.rev, s.aggiornato = dati, s.rev + 1, ora
    return True


PAUSA_MAX = 300      # oltre 5 minuti senza battito si apre una nuova sessione
BATTITO_MAX = 120    # un battito non conta mai più di 2 minuti


def chiave_storage(versione):
    return f"ferro-transenne-fi-2026-{versione}-civilistico"


def stato_salvato(utente, versione):
    if utente is None:
        return None
    return StatoLavoro.query.filter_by(utente_id=utente.id, versione=versione).first()


@bp.app_template_global()
def config_sincronia(versione):
    """Dati per sincronia.js: incorporati nella pagina, così lo stato è in localStorage prima che parta il simulatore."""
    u = utente_corrente()
    if u is None or versione not in SLOT_VALIDI:
        return None
    s = stato_salvato(u, versione)
    return {"versione": versione, "chiave": chiave_storage(versione), "utente": u.id, "csrf": _csrf(),
            "rev": s.rev if s else 0, "stato": s.dati if s else None,
            "urlStato": f"/api/stato/{versione}", "urlBattito": "/api/battito", "battito": not u.docente}


def _csrf():
    from ...accesso import csrf_token
    return csrf_token()


def _corpo():
    try:
        return json.loads(request.get_data(as_text=True) or "{}")
    except ValueError:
        return {}


def _controlla(corpo):
    tok = request.headers.get("X-CSRF") or corpo.get("csrf")
    return csrf_valido(tok)


@bp.route("/api/stato/<versione>", methods=["GET", "POST"])
def stato(versione):
    if versione not in SLOT_VALIDI:
        return jsonify(errore="versione sconosciuta"), 404
    u = utente_corrente()
    # Le prove isolate sono riservate al docente; le normali classi
    # continuano a lavorare nei propri archivi esistenti.
    if versione in {"erp-ft-doc-pistoia", "erp-ft-doc-firenze", "erp-ft-doc-dic-pistoia", "erp-ft-doc-dic-firenze", "erp-ft-doc-pianificazione"} and (u is None or not u.docente):
        return jsonify(errore="archivio di prova riservato al docente"), 403
    s = stato_salvato(u, versione)
    if request.method == "GET":
        return jsonify(rev=s.rev if s else 0, stato=s.dati if s else None)
    corpo = _corpo()
    if not _controlla(corpo):
        return jsonify(errore="token non valido"), 403
    dati = corpo.get("stato")
    if not isinstance(dati, str):
        return jsonify(errore="stato mancante"), 400
    try:
        json.loads(dati)
    except ValueError:
        return jsonify(errore="stato non valido"), 400
    if s is None:
        s = StatoLavoro(utente_id=u.id, versione=versione, dati=dati, rev=1)
        db.session.add(s)
    elif s.dati != dati:
        if not proteggi_e_sostituisci(u, s, dati, esplicito=corpo.get("azzera") is True):
            db.session.rollback()
            return jsonify(errore="stato incompleto: il lavoro salvato è stato protetto", rev=s.rev, stato=s.dati), 409
    db.session.commit()
    return jsonify(rev=s.rev)


DIARIO_TENUTE = 3000   # voci conservate per allievo


@bp.route("/api/diario", methods=["POST"])
def diario():
    """Diario delle azioni: pulsanti premuti, messaggi di esito/errore, salvataggi riusciti o rifiutati."""
    u = utente_corrente()
    if u is None:
        return jsonify(errore="non autenticato"), 401
    corpo = _corpo()
    if not _controlla(corpo):
        return jsonify(errore="token non valido"), 403
    if u.docente:
        return jsonify(ok=True)
    voci = corpo.get("voci")
    if not isinstance(voci, list):
        return jsonify(errore="voci mancanti"), 400
    for v in voci[:60]:
        if not isinstance(v, dict):
            continue
        db.session.add(DiarioAzione(utente_id=u.id, pagina=str(v.get("pagina") or "")[:200], tipo=str(v.get("tipo") or "")[:20],
                                    testo=str(v.get("testo") or "")[:400], passo=str(v.get("passo") or "")[:160]))
    db.session.flush()
    n = DiarioAzione.query.filter_by(utente_id=u.id).count()
    if n > DIARIO_TENUTE + 200:
        vecchie = (DiarioAzione.query.filter_by(utente_id=u.id).order_by(DiarioAzione.quando.asc(), DiarioAzione.id.asc())
                   .limit(n - DIARIO_TENUTE).all())
        for x in vecchie:
            db.session.delete(x)
    db.session.commit()
    return jsonify(ok=True)


def registra_battito(u, pagina="", ora=None):
    ora = ora or adesso()
    ses = Sessione.query.filter_by(utente_id=u.id).order_by(Sessione.ultimo.desc()).first()
    gap = (ora - ses.ultimo).total_seconds() if ses else None
    if ses is None or gap is None or gap > PAUSA_MAX or gap < 0:
        ses = Sessione(utente_id=u.id, inizio=ora, ultimo=ora, secondi_attivi=0, battiti=1, ultima_pagina=pagina)
        db.session.add(ses)
    else:
        ses.secondi_attivi += int(min(gap, BATTITO_MAX))
        ses.ultimo, ses.battiti, ses.ultima_pagina = ora, ses.battiti + 1, pagina
    u.ultimo_accesso = ora
    db.session.commit()
    return ses


@bp.route("/api/battito", methods=["POST"])
def battito():
    u = utente_corrente()
    corpo = _corpo()
    if not _controlla(corpo):
        return jsonify(errore="token non valido"), 403
    if u.docente:
        return jsonify(ok=True)
    ses = registra_battito(u, str(corpo.get("pagina") or "")[:200])
    return jsonify(ok=True, secondi=ses.secondi_attivi)
