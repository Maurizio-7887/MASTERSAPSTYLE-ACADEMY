"""Validazione e lettura del percorso didattico: nessuna scrittura ERP."""
import json
from pathlib import Path

SCENARIO_FILE = Path(__file__).resolve().parents[1] / 'blueprints' / 'academy' / 'scenarios' / 'firenze_template.json'


def validate_scenario(data):
    if not isinstance(data, dict):
        raise ValueError('Scenario non valido')
    steps = data.get('steps')
    if not isinstance(steps, list) or not steps:
        raise ValueError('Sono necessari passi non vuoti')
    ids = [s.get('id') for s in steps]
    if any(not isinstance(x, str) or not x for x in ids) or len(ids) != len(set(ids)):
        raise ValueError('ID dei passi mancanti o duplicati')
    if [s.get('sequence') for s in steps] != list(range(1, len(steps) + 1)):
        raise ValueError('Numerazione dei passi non consecutiva')
    for s in steps:
        if not s.get('title') or not s.get('instruction') or not isinstance(s.get('expected'), dict):
            raise ValueError('Passo incompleto')
    assessment = data.get('assessment', {})
    indicators = assessment.get('indicators', [])
    if len(indicators) != 4 or any(x.get('max_points') != 25 for x in indicators):
        raise ValueError('La valutazione richiede quattro indicatori da 25 punti')
    return data


def load_scenario():
    return validate_scenario(json.loads(SCENARIO_FILE.read_text(encoding='utf-8')))


def grade_evidence(step, answer):
    """Solo autocontrollo su dati attesi verificati; mai attestazione di una scrittura FI."""
    expected = step.get('expected', {})
    if not step.get('verified_against_firenze') or not expected:
        return {'status': 'non_verificabile', 'message': 'Passo in attesa della consegna originale Firenze: nessun voto assegnato.'}
    if not isinstance(answer, dict):
        return {'status': 'non_valido', 'message': 'Formato risposta non valido.'}
    mismatches = [k for k,v in expected.items() if str(answer.get(k, '')).strip() != str(v).strip()]
    return {'status': 'corretto' if not mismatches else 'da_correggere', 'fields_to_review': mismatches}


def load_source_alignment():
    """Matrice documentata da README originale, NON elenco dei passi verificati."""
    file = SCENARIO_FILE.with_name('firenze_source_alignment.json')
    data = json.loads(file.read_text(encoding='utf-8'))
    if data.get('grading_enabled') or data.get('posting_enabled'):
        raise ValueError('La matrice preliminare non può abilitare scritture o voti')
    return data
