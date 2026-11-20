from services.firenze_scenario import load_scenario, grade_evidence, validate_scenario
import pytest

def test_scenario_preparatory_and_four_indicators():
    s = load_scenario()
    assert s['status'] == 'TEMPLATE_DA_ALLINEARE'
    assert len(s['assessment']['indicators']) == 4
    assert sum(x['max_points'] for x in s['assessment']['indicators']) == 100
    assert all(not x['verified_against_firenze'] for x in s['steps'])

def test_no_fake_grade_without_original_source():
    s=load_scenario()
    assert grade_evidence(s['steps'][0], {'test':'ok'})['status']=='non_verificabile'

def test_duplicate_step_rejected():
    s=load_scenario()
    s['steps'][1]['id']=s['steps'][0]['id']
    with pytest.raises(ValueError):validate_scenario(s)
