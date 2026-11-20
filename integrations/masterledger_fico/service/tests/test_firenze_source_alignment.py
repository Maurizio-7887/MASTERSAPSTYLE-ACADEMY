from services.firenze_scenario import load_source_alignment

def test_source_mapping_is_safe_and_traceable():
    m = load_source_alignment()
    assert m['source']['repository'] == 'Maurizio-7887/MASTERSAPSTYLE-ACADEMY'
    assert m['source']['file'] == 'README.md'
    assert m['grading_enabled'] is False
    assert m['posting_enabled'] is False
    assert m['original_step_count_verified'] is False
    assert len(m['source_findings']) >= 8
    assert len({x['id'] for x in m['source_findings']}) == len(m['source_findings'])
