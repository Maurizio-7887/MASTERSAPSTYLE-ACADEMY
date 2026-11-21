"""Percorso formativo aggiuntivo: non registra né modifica dati contabili."""
import json
from pathlib import Path
from flask import Blueprint, render_template, abort, request, jsonify, url_for
from flask_login import login_required
from blueprints.decorators import ledger_required

academy_bp = Blueprint('academy', __name__)
CHAPTERS = json.loads((Path(__file__).parent / 'manual.json').read_text(encoding='utf-8'))

@academy_bp.get('/')
@login_required
@ledger_required
def index():
    return render_template('academy/index.html', chapters=CHAPTERS)

@academy_bp.get('/blocco/<int:number>')
@login_required
@ledger_required
def chapter(number):
    if not 1 <= number <= len(CHAPTERS): abort(404)
    ch = CHAPTERS[number-1]
    return render_template('academy/chapter.html', ch=ch, chapters=CHAPTERS)

@academy_bp.get('/copertura')
@login_required
@ledger_required
def coverage():
    return render_template('academy/coverage.html', chapters=CHAPTERS)


@academy_bp.get('/firenze')
@login_required
@ledger_required
def firenze():
    from services.firenze_scenario import load_scenario
    return render_template('academy/firenze.html', scenario=load_scenario())

@academy_bp.get('/firenze/dati')
@login_required
@ledger_required
def firenze_data():
    from services.firenze_scenario import load_scenario
    return jsonify(load_scenario())

@academy_bp.post('/firenze/verifica/<step_id>')
@login_required
@ledger_required
def firenze_verify(step_id):
    from services.firenze_scenario import load_scenario, grade_evidence
    scenario = load_scenario()
    step = next((s for s in scenario['steps'] if s['id'] == step_id), None)
    if step is None: abort(404)
    data = request.get_json(silent=True)
    if not isinstance(data, dict): return jsonify({'error':'Richiesta JSON non valida'}), 400
    return jsonify(grade_evidence(step, data))


@academy_bp.get('/firenze/allineamento')
@login_required
@ledger_required
def firenze_alignment():
    from services.firenze_scenario import load_source_alignment
    return jsonify(load_source_alignment())


@academy_bp.get('/firenze/navigazione')
@login_required
@ledger_required
def firenze_navigation():
    """Endpoint di sola lettura: link ai moduli, non operazioni contabili."""
    from services.firenze_navigation import navigation_data
    from flask import url_for
    data = navigation_data()
    for step in data['steps']:
        step['url'] = url_for(step['target_endpoint'])
    return jsonify(data)


# ══════════════════════════════════════════════════════════════════════
# PERCORSI PRATICI VERIFICATI (STYLESAPFICO, Fase C)
# Sessione personale con azienda didattica propria; avanzamento nel database,
# deciso dal server leggendo i documenti registrati.
# ══════════════════════════════════════════════════════════════════════
from flask import redirect, flash
from flask_login import current_user


def _sessione_o_404(session_id):
    from services.academy_percorso import sessione_di
    s = sessione_di(current_user, session_id)
    if s is None:
        abort(404)  # non esiste o non è tua: stessa risposta, nessuna informazione
    return s


def _azienda_corrente_id():
    from services.azienda_corrente import get_azienda_corrente
    a = get_azienda_corrente()
    return a.id if a else None


@academy_bp.get('/percorso')
@login_required
@ledger_required
def percorsi():
    from services.academy_percorso import elenco_percorsi, sessione_attiva, contatore
    voci = []
    for sc in elenco_percorsi():
        s = sessione_attiva(current_user, sc['id'])
        voci.append({'sc': sc, 'sessione': s, 'contatore': contatore(s) if s else None})
    return render_template('academy/percorsi.html', voci=voci)


@academy_bp.post('/percorso/avvia')
@login_required
@ledger_required
def percorso_avvia():
    from services.academy_percorso import avvia_sessione, PercorsoError
    from services.azienda_corrente import set_azienda_corrente
    try:
        s = avvia_sessione(current_user, request.form.get('scenario_id', 'B8-SET2028'),
                           request.form.get('mode', 'studio'))
    except PercorsoError as e:
        flash(str(e), 'danger')
        return redirect(url_for('academy.percorsi'))
    set_azienda_corrente(s.company_id)
    flash(f"Nuova esercitazione avviata nella tua azienda didattica {s.company.code}.", 'success')
    return redirect(url_for('academy.percorso', session_id=s.id))


@academy_bp.post('/percorso/<int:session_id>/riprendi')
@login_required
@ledger_required
def percorso_riprendi(session_id):
    from services.azienda_corrente import set_azienda_corrente
    s = _sessione_o_404(session_id)
    set_azienda_corrente(s.company_id)
    return redirect(url_for('academy.percorso', session_id=s.id))


@academy_bp.get('/percorso/<int:session_id>')
@login_required
@ledger_required
def percorso(session_id):
    from services.academy_percorso import carica_percorso, rivaluta, contatore
    s = _sessione_o_404(session_id)
    sc = carica_percorso(s.scenario_id)
    rivaluta(s, _azienda_corrente_id())
    risultati = {r.step_id: r for r in s.results}
    link = {}
    for p in sc['passi']:
        try:
            link[p['id']] = url_for(p['funzione']['endpoint'])
        except Exception:
            link[p['id']] = None
    return render_template('academy/percorso.html', s=s, sc=sc, risultati=risultati, link=link,
                           cont=contatore(s), azienda_ok=_azienda_corrente_id() == s.company_id)


@academy_bp.post('/percorso/<int:session_id>/verifica/<step_id>')
@login_required
@ledger_required
def percorso_verifica(session_id, step_id):
    from services.academy_percorso import verifica_passo, contatore, PercorsoError
    s = _sessione_o_404(session_id)
    try:
        r = verifica_passo(s, step_id, _azienda_corrente_id())
    except PercorsoError:
        abort(404)
    msg = r.message
    if s.mode == 'prova' and r.status != 'verificato':
        msg = "Passo non ancora conforme. In prova autonoma non vengono mostrati i dettagli."
    return jsonify({'step': step_id, 'stato': r.status, 'messaggio': msg, 'contatore': contatore(s)})


@academy_bp.get('/percorso/<int:session_id>/stato')
@login_required
@ledger_required
def percorso_stato(session_id):
    from services.academy_percorso import contatore
    s = _sessione_o_404(session_id)
    return jsonify({'contatore': contatore(s),
                    'passi': {r.step_id: {'stato': r.status, 'messaggio': r.message} for r in s.results}})


@academy_bp.get('/percorso/classe')
@login_required
@ledger_required
def percorso_classe():
    """Vista docente in sola lettura: riepilogo delle sessioni attive."""
    from models import AcademySession
    from services.academy_percorso import contatore
    if not current_user.is_commercialista:
        abort(403)
    sessioni = AcademySession.query.filter_by(is_active=True).order_by(AcademySession.updated_at.desc()).all()
    righe = [{'s': x, 'c': contatore(x)} for x in sessioni]
    return render_template('academy/percorso_classe.html', righe=righe)
