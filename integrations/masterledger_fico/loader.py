"""Caricamento isolato del servizio MasterLedger FI/CO.

Il modulo MasterLedger è un'app Flask autonoma, non un blueprint Firenze.
Questa funzione viene invocata solo se MASTERLEDGER_FICO_ENABLED=1.
"""
import importlib.util
import os
import sys
from pathlib import Path

from integrations.masterledger_fico.dispatcher import build_combined_app


def mount_masterledger(firenze_app):
    if os.getenv("MASTERLEDGER_FICO_ENABLED") != "1":
        return firenze_app

    root = Path(__file__).resolve().parent / "service"
    entry = root / "app.py"
    if not entry.is_file():
        raise RuntimeError("Codice MasterLedger FI/CO mancante: " + str(entry))

    db_url = os.getenv("MASTERLEDGER_FICO_DATABASE_URL", "").strip()
    secret = os.getenv("MASTERLEDGER_FICO_SECRET_KEY", "").strip()
    if not db_url or not secret:
        raise RuntimeError("Configurare MASTERLEDGER_FICO_DATABASE_URL e MASTERLEDGER_FICO_SECRET_KEY")
    if db_url == os.getenv("DATABASE_URL", ""):
        raise RuntimeError("MasterLedger FI/CO non può condividere il DATABASE_URL di Firenze")
    if secret == os.getenv("SECRET_KEY", ""):
        raise RuntimeError("MasterLedger FI/CO deve usare una SECRET_KEY distinta")

    # Gli import originali di MasterLedger sono assoluti (config, models,
    # extensions, blueprints). La directory del servizio precede quella
    # dell'ERP Firenze, che usa il package 'app.blueprints'.
    sys.path.insert(0, str(root))
    spec = importlib.util.spec_from_file_location("masterledger_fico_entry", entry)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    from config import Config

    class FicoConfig(Config):
        SECRET_KEY = secret
        SQLALCHEMY_DATABASE_URI = db_url
        SESSION_COOKIE_NAME = "masterledger_fico_session"
        REMEMBER_COOKIE_NAME = "masterledger_fico_remember"
        SESSION_COOKIE_PATH = "/fico"
        REMEMBER_COOKIE_PATH = "/fico"
        SESSION_COOKIE_SECURE = True
        REMEMBER_COOKIE_SECURE = True
        BOOTSTRAP_DEMO_USERS = False

    ledger = module.create_app(FicoConfig)

    # Nel deploy unico (gunicorn wsgi:app) non passa da service/start.sh, quindi
    # lo schema FI/CO non verrebbe mai aggiornato. Si applicano le migrazioni
    # all'avvio, solo sul database FI/CO dedicato. Disattivabile con
    # MASTERLEDGER_FICO_AUTO_UPGRADE=0. NON si esegue il seed: crea utenti demo
    # con password note e non va mai lanciato automaticamente su un sito pubblico.
    if os.getenv("MASTERLEDGER_FICO_AUTO_UPGRADE", "1") != "0":
        from flask_migrate import upgrade
        try:
            with ledger.app_context():
                upgrade(directory=str(root / "migrations"))
        except Exception as exc:  # il portale Firenze deve restare online comunque
            import logging
            logging.getLogger(__name__).exception(
                "Migrazioni MasterLedger FI/CO non applicate: %s. Il portale resta attivo; "
                "verificare lo schema del database FI/CO prima di usare /fico.", exc)

    return build_combined_app(firenze_app, ledger)
