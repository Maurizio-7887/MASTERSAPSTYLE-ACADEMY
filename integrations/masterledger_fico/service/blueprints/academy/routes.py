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
