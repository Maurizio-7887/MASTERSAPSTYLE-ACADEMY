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
    # extensions, blueprints, services). Durante il caricamento la cartella del
    # servizio sta in testa a sys.path; subito dopo passa in coda, così un nuovo
    # modulo di Firenze non viene mai oscurato. I nomi già importati da un'altra
    # cartella bloccano l'avvio: meglio un errore chiaro di un modulo sbagliato.
    _controlla_collisioni(root)
    sys.path.insert(0, str(root))
    try:
        spec = importlib.util.spec_from_file_location("masterledger_fico_entry", entry)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        from config import Config
    finally:
        _sposta_in_coda(root)
    _verifica_provenienza(root)

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

    sys.path.insert(0, str(root))
    try:
        ledger = module.create_app(FicoConfig)
    finally:
        _sposta_in_coda(root)
    _verifica_provenienza(root)

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
        except Exception as exc:
            # Il portale Firenze resta online, ma /fico NON parte con uno schema vecchio:
            # risponde 503 finché le migrazioni non vanno a buon fine (al prossimo avvio).
            import logging
            logging.getLogger(__name__).exception(
                "Migrazioni MasterLedger FI/CO non applicate: %s. /fico resta in manutenzione.", exc)
            return build_combined_app(firenze_app, fico_in_manutenzione(str(exc)))

    return build_combined_app(firenze_app, ledger)


# Nomi di primo livello che il servizio importa in modo assoluto.
NOMI_SERVIZIO = ("config", "models", "extensions", "blueprints", "services", "seed")


def _controlla_collisioni(root):
    for nome in NOMI_SERVIZIO:
        mod = sys.modules.get(nome)
        origine = getattr(mod, "__file__", None) if mod is not None else None
        if origine and not Path(origine).resolve().is_relative_to(root):
            raise RuntimeError(f"Collisione di moduli: '{nome}' è già importato da {origine}; "
                               "MasterLedger FI/CO non può essere caricato in questo processo.")


def _sposta_in_coda(root):
    voce = str(root)
    while voce in sys.path:
        sys.path.remove(voce)
    sys.path.append(voce)


def _verifica_provenienza(root):
    for nome in NOMI_SERVIZIO:
        mod = sys.modules.get(nome)
        origine = getattr(mod, "__file__", None) if mod is not None else None
        if origine and not Path(origine).resolve().is_relative_to(root):
            raise RuntimeError(f"Il modulo '{nome}' di MasterLedger è stato preso da {origine}.")


def fico_in_manutenzione(motivo=""):
    """App WSGI minima per /fico quando lo schema del database non è aggiornato."""
    def app(environ, start_response):
        corpo = ("<!doctype html><meta charset=utf-8><title>FI/CO in manutenzione</title>"
                 "<h1>FI/CO temporaneamente non disponibile</h1>"
                 "<p>Il database FI/CO non è stato aggiornato all'avvio. Il resto del portale funziona; "
                 "riprova dopo il prossimo riavvio o avvisa il docente.</p>").encode("utf-8")
        start_response("503 Service Unavailable", [("Content-Type", "text/html; charset=utf-8"),
                                                   ("Retry-After", "300"), ("Content-Length", str(len(corpo)))])
        return [corpo]
    app.motivo = motivo
    return app
