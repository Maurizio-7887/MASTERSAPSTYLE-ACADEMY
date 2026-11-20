"""Natura dei conti del piano del commercialista: dati iniziali e migrazione s6t7u8v9w0x1."""
import importlib.util
import re
from pathlib import Path

import pytest

SERVICE = Path(__file__).resolve().parent.parent
MIGRAZIONE = SERVICE / "migrations" / "versions" / "s6t7u8v9w0x1_correzione_natura_conti.py"


def _correzioni():
    spec = importlib.util.spec_from_file_location("mig_natura", MIGRAZIONE)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.CORREZIONI


def _seed_tipi():
    t = (SERVICE / "seed.py").read_text(encoding="utf-8")
    return {c: (tipo, co == "True") for c, tipo, co in
            re.findall(r'\("(\d+)",\s*"[^"]+",\s*"(\w+)",\s*(True|False)', t)}


def test_seed_ha_la_natura_corretta():
    seed = _seed_tipi()
    for code, _t, _co, _cot, new_t, new_co, _ncot in _correzioni():
        assert seed[code] == (new_t, new_co), code
    # Controlli di buon senso su tutto il piano: nessun rateo, risconto, fondo o IVA tra i costi o ricavi
    t = (SERVICE / "seed.py").read_text(encoding="utf-8")
    for code, name, tipo in re.findall(r'\("(\d+)",\s*"([^"]+)",\s*"(\w+)"', t):
        n = name.lower()
        if re.search(r"\b(ratei|risconti|iva (vendite|acquisti)|f\.do|fondo)\b", n) and "accant" not in n:
            assert tipo.startswith("patrimoniale"), (code, name, tipo)


@pytest.fixture()
def db_migrato(tmp_path):
    from flask_migrate import upgrade, downgrade
    from config import Config
    from app import create_app

    class C(Config):
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{tmp_path / 'mig.db'}"
        SECRET_KEY = "x" * 40
        TESTING = True
        BOOTSTRAP_DEMO_USERS = False

    app = create_app(C)
    return app, lambda rev: upgrade(directory=str(SERVICE / "migrations"), revision=rev), \
        lambda rev: downgrade(directory=str(SERVICE / "migrations"), revision=rev)


def test_migrazione_corregge_solo_i_conti_ancora_sbagliati(db_migrato):
    from extensions import db
    from models import Account
    app, up, down = db_migrato
    corr = _correzioni()
    with app.app_context():
        up("r5s6t7u8v9w0")
        for code, old_t, old_co, old_cot, *_ in corr:
            db.session.add(Account(code=code, name=code, account_type=old_t,
                                   cost_relevant=old_co, cost_relevant_type=old_cot))
        db.session.commit()
        # Il commercialista aveva già sistemato a mano 045006 come attivo: non va toccato
        Account.query.filter_by(code="045006").one().account_type = "patrimoniale_attivo"
        db.session.commit()

        up("s6t7u8v9w0x1")
        db.session.expire_all()
        for code, _o, _oc, _ocot, new_t, new_co, new_cot in corr:
            a = Account.query.filter_by(code=code).one()
            if code == "045006":
                assert a.account_type == "patrimoniale_attivo"
                continue
            assert (a.account_type, a.cost_relevant, a.cost_relevant_type) == (new_t, new_co, new_cot), code

        down("r5s6t7u8v9w0")
        db.session.expire_all()
        a = Account.query.filter_by(code="032701").one()
        assert (a.account_type, a.cost_relevant) == ("costo", True)
        db.session.remove()
