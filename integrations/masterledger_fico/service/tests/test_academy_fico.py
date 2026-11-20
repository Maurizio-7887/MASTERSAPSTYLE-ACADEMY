import json
from pathlib import Path


def test_eight_chapters_present():
    root = Path(__file__).resolve().parents[1]
    chapters = json.loads((root / 'blueprints/academy/manual.json').read_text(encoding='utf-8'))
    assert [x['number'] for x in chapters] == list(range(1, 9))
    assert all(x['pages_count'] == len(x['pages']) for x in chapters)
    assert sum(x['pages_count'] for x in chapters) == 85
    assert all(len(''.join(x['pages'])) > 1000 for x in chapters)


def test_blueprint_registered_without_schema_change():
    root = Path(__file__).resolve().parents[1]
    app = (root / 'app.py').read_text(encoding='utf-8')
    assert 'app.register_blueprint(academy_bp, url_prefix="/academy-fico")' in app
    assert 'academy.index' in (root / 'templates/base.html').read_text(encoding='utf-8')
