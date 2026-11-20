"""Navigazione didattica di sola lettura verso funzioni ERP esistenti.

Non attribuisce voti, non importa movimenti, non crea aziende e non garantisce
che un esercizio sia stato svolto. I percorsi sono PREPARATORI e non i passi
originali della guida dicembre-wms.
"""
from services.firenze_scenario import load_scenario

# Endpoint GET esistenti: nomi controllati sui route handler MasterLedgerLight.
TARGETS = {
    'PREP-01': ('gl.piano_conti', 'Apri piano dei conti'),
    'PREP-02': ('ar.customer_invoice', 'Apri fattura cliente'),
    'PREP-03': ('ap.supplier_invoice', 'Apri fattura fornitore'),
    'PREP-04': ('gl.journal_list', 'Apri libro giornale'),
    'PREP-05': ('ar.customer_payment', 'Apri incasso cliente'),
    'PREP-06': ('ap.supplier_payment', 'Apri pagamento fornitore'),
    'PREP-07': ('assets.asset_list', 'Apri cespiti'),
    'PREP-08': ('costs.cost_centers', 'Apri centri di costo'),
    'PREP-09': ('costs.report', 'Apri report costi (non budget)'),
    'PREP-10': ('gl.journal_list', 'Apri giornale (riconciliazione da verificare)'),
    'PREP-11': ('gl.periods', 'Apri periodi contabili'),
    'PREP-12': ('gl.libro_mastro', 'Apri libro mastro per la relazione'),
}


def validate_targets(scenario=None):
    scenario = scenario or load_scenario()
    ids = {step['id'] for step in scenario['steps']}
    if ids != set(TARGETS):
        raise ValueError('Mappatura incompleta o riferita a passi sconosciuti')
    if any(not step.get('id', '').startswith('PREP-') for step in scenario['steps']):
        raise ValueError('La mappa è solo per i passi preparatori')
    return True


def navigation_data():
    scenario = load_scenario()
    validate_targets(scenario)
    return {'source_verified': False, 'assessment_enabled': False,
            'posting_enabled': False,
            'steps': [{'id': step['id'], 'sequence': step['sequence'],
                       'target_endpoint': TARGETS[step['id']][0],
                       'label': TARGETS[step['id']][1],
                       'status': 'COLLEGAMENTO_PREPARATORIO_NON_VALIDATO'}
                      for step in scenario['steps']]}
