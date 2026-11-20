import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    """
    Configurazione dell'applicazione.

    In locale, senza nessuna variabile d'ambiente, gira su SQLite (file
    masterledger.db nella cartella del progetto) — zero setup per provarla subito.

    Su Railway, basta collegare un plugin Postgres: Railway espone
    automaticamente la variabile DATABASE_URL, che questa configurazione
    legge da sola (con la piccola correzione "postgres://" -> "postgresql://"
    richiesta da SQLAlchemy 1.4+).
    """
    SECRET_KEY = os.environ.get("SECRET_KEY", "cambia-questa-chiave-in-produzione")

    _database_url = os.environ.get("DATABASE_URL", f"sqlite:///{os.path.join(basedir, 'masterledger.db')}")
    if _database_url.startswith("postgres://"):
        _database_url = _database_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = _database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Nome azienda/cliente — configurabile per riutilizzare l'app con più
    # clienti. Nessun "codice azienda" stile SAP: qui è un'unica ragione
    # sociale per istanza, non un multi-company.
    COMPANY_NAME = os.environ.get("COMPANY_NAME", "IRON APPALTI")

    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)
    REMEMBER_COOKIE_DURATION = timedelta(hours=8)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() in ("1", "true", "yes")
    # Un form di Prima Nota/Preventivo con molte righe può restare aperto a
    # lungo (interruzioni, dati da recuperare altrove) prima dell'invio. Il
    # default di Flask-WTF è 1 ora — troppo poco per un uso reale, causa
    # "CSRF token has expired" su form legittimi. Allineato alla durata
    # della sessione stessa (8 ore): il token resta valido finché resta
    # valida la sessione dell'utente, non prima.
    WTF_CSRF_TIME_LIMIT = 8 * 60 * 60
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SAMESITE = "Lax"
    REMEMBER_COOKIE_SECURE = SESSION_COOKIE_SECURE
    BOOTSTRAP_DEMO_USERS = os.environ.get("BOOTSTRAP_DEMO_USERS", "false").lower() in ("1", "true", "yes")

    # Chiave API OpenAI per il suggerimento AI delle scritture di Prima Nota
    # (facoltativa: se assente, il pulsante "Suggerisci con AI" mostra un
    # errore chiaro invece di rompere il resto dell'applicazione).
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

    # URL base del servizio MasterLogistic-WMS (fonte di verità per le giacenze).
    # Es. https://masterlogistic-wms-production.up.railway.app — SENZA slash finale.
    # Se assente, tutte le operazioni che leggono/scrivono giacenza restano bloccate
    # con un errore chiaro invece di proseguire silenziosamente con dati sbagliati.
    MASTERLOGISTIC_URL = os.environ.get("MASTERLOGISTIC_URL", "").rstrip("/")

    # URL base del servizio IronProduction (magazzino officina interna —
    # ferro per lavorazioni, filo di saldatura, DPI, consumabili). Endpoint
    # non ancora costruiti lato IronProduction: finché non esistono, il
    # client (services/ironproduction_client.py) resta inerte e le rotte
    # che lo useranno daranno un errore chiaro invece di bloccarsi in modo
    # silenzioso. IRONPRODUCTION_API_KEY è la chiave condivisa da mettere
    # anche lato IronProduction (header X-API-Key) — a differenza di
    # MasterLogistic-WMS, qui l'autenticazione va prevista fin dall'inizio.
    IRONPRODUCTION_URL = os.environ.get("IRONPRODUCTION_URL", "").rstrip("/")
    IRONPRODUCTION_API_KEY = os.environ.get("IRONPRODUCTION_API_KEY", "")

    # Token per l'integrazione INVERSA: IronProduction (Kanban Gruppi) legge
    # da qui l'anagrafica articolo (costo standard, prezzo, tipo) quando si
    # inserisce un codice — vedi blueprints/materials/routes.py::
    # api_kanban_articolo. Chiave indipendente da IRONPRODUCTION_API_KEY
    # (quella è per le chiamate che facciamo NOI verso IronProduction): va
    # impostata identica anche lato IronProduction (MASTERLEDGERLIGHT_API_TOKEN).
    KANBAN_API_TOKEN = os.environ.get("KANBAN_API_TOKEN", "")


    # Canale di inoltro RFQ: configura questi valori nell'ambiente di produzione.
    RFQ_SMTP_HOST = os.environ.get("RFQ_SMTP_HOST", "")
    RFQ_SMTP_PORT = int(os.environ.get("RFQ_SMTP_PORT", "587"))
    RFQ_SMTP_USERNAME = os.environ.get("RFQ_SMTP_USERNAME", "")
    RFQ_SMTP_PASSWORD = os.environ.get("RFQ_SMTP_PASSWORD", "")
    RFQ_SMTP_USE_TLS = os.environ.get("RFQ_SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")
    RFQ_FROM_EMAIL = os.environ.get("RFQ_FROM_EMAIL", "")
    RFQ_FROM_NAME = os.environ.get("RFQ_FROM_NAME", COMPANY_NAME)
