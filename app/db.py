"""Database dell'Academy: utenti, tempo di collegamento, lavoro salvato, consegne e risposte.

In produzione (Railway) usa PostgreSQL da DATABASE_URL; in locale e nei test un file SQLite.
Le tabelle si creano da sole all'avvio. Orari salvati in UTC, mostrati in ora italiana.
"""
import os
import secrets
import time
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()
ROMA = ZoneInfo("Europe/Rome")


def adesso():
    return datetime.now(timezone.utc).replace(tzinfo=None)   # UTC "naive": uguale su SQLite e PostgreSQL


def ora_italiana(dt, formato="%d/%m/%Y %H:%M"):
    if not dt:
        return "—"
    return dt.replace(tzinfo=timezone.utc).astimezone(ROMA).strftime(formato)


class Utente(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(60), unique=True, nullable=False, index=True)
    nome = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), default="")
    ruolo = db.Column(db.String(20), nullable=False, default="allievo")      # docente | allievo
    password_hash = db.Column(db.String(255), nullable=False)
    attivo = db.Column(db.Boolean, default=True, nullable=False)
    deve_cambiare_password = db.Column(db.Boolean, default=True, nullable=False)
    costo_orario = db.Column(db.Numeric(10, 2), nullable=True)                 # vuoto = costo generale
    tentativi_falliti = db.Column(db.Integer, default=0, nullable=False)
    bloccato_fino = db.Column(db.DateTime, nullable=True)
    creato = db.Column(db.DateTime, default=adesso, nullable=False)
    ultimo_accesso = db.Column(db.DateTime, nullable=True)

    sessioni = db.relationship("Sessione", backref="utente", lazy="dynamic", cascade="all, delete-orphan")
    consegne = db.relationship("Consegna", backref="utente", lazy="dynamic", cascade="all, delete-orphan")

    def imposta_password(self, pw):
        self.password_hash = generate_password_hash(pw)

    def verifica_password(self, pw):
        return check_password_hash(self.password_hash, pw)

    @property
    def docente(self):
        return self.ruolo == "docente"

    def secondi_totali(self):
        return int(db.session.query(db.func.coalesce(db.func.sum(Sessione.secondi_attivi), 0)).filter(Sessione.utente_id == self.id).scalar() or 0)

    def tariffa(self):
        return float(self.costo_orario) if self.costo_orario is not None else costo_orario_generale()


class Impostazione(db.Model):
    chiave = db.Column(db.String(60), primary_key=True)
    valore = db.Column(db.String(500), nullable=False)


class Sessione(db.Model):
    """Un periodo di collegamento continuo: si allunga a ogni battito della pagina aperta e in uso."""
    id = db.Column(db.Integer, primary_key=True)
    utente_id = db.Column(db.Integer, db.ForeignKey("utente.id"), nullable=False, index=True)
    inizio = db.Column(db.DateTime, default=adesso, nullable=False)
    ultimo = db.Column(db.DateTime, default=adesso, nullable=False)
    secondi_attivi = db.Column(db.Integer, default=0, nullable=False)
    battiti = db.Column(db.Integer, default=0, nullable=False)
    ultima_pagina = db.Column(db.String(200), default="")


class StatoLavoro(db.Model):
    """Il lavoro corrente dell'allievo: lo stesso contenuto del backup JSON del simulatore."""
    id = db.Column(db.Integer, primary_key=True)
    utente_id = db.Column(db.Integer, db.ForeignKey("utente.id"), nullable=False, index=True)
    versione = db.Column(db.String(20), nullable=False)
    dati = db.Column(db.Text, nullable=False)
    rev = db.Column(db.Integer, default=1, nullable=False)
    aggiornato = db.Column(db.DateTime, default=adesso, nullable=False)
    __table_args__ = (db.UniqueConstraint("utente_id", "versione", name="uq_stato_utente_versione"),)


class ArchivioLavoro(db.Model):
    """Copia di sicurezza del lavoro di un utente, salvata prima che il docente lo sostituisca."""
    id = db.Column(db.Integer, primary_key=True)
    utente_id = db.Column(db.Integer, db.ForeignKey("utente.id"), nullable=False, index=True)
    versione = db.Column(db.String(20), nullable=False)
    dati = db.Column(db.Text, nullable=False)
    creato = db.Column(db.DateTime, default=adesso, nullable=False)
    motivo = db.Column(db.String(200), default="")


class Consegna(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    utente_id = db.Column(db.Integer, db.ForeignKey("utente.id"), nullable=False, index=True)
    versione = db.Column(db.String(20), nullable=False)
    esercizio = db.Column(db.String(40), nullable=False, default="libero")
    nota = db.Column(db.Text, default="")
    dati = db.Column(db.Text, nullable=False)                 # fotografia del lavoro al momento della consegna
    consegnata = db.Column(db.DateTime, default=adesso, nullable=False)
    secondi_collegato = db.Column(db.Integer, default=0, nullable=False)
    stato = db.Column(db.String(20), default="da_correggere", nullable=False)   # da_correggere | corretta
    voto = db.Column(db.String(30), default="")
    risposta = db.Column(db.Text, default="")
    corretta_il = db.Column(db.DateTime, nullable=True)
    letta = db.Column(db.Boolean, default=False, nullable=False)


class Iscrizione(db.Model):
    """Corso online per privati (ERP, Magazziniere 5.0): prova gratuita finché il docente non registra il pagamento."""
    id = db.Column(db.Integer, primary_key=True)
    utente_id = db.Column(db.Integer, db.ForeignKey("utente.id"), nullable=False, index=True)
    corso = db.Column(db.String(30), nullable=False)
    stato = db.Column(db.String(20), default="prova", nullable=False)      # prova | attivo
    creata = db.Column(db.DateTime, default=adesso, nullable=False)
    attivata = db.Column(db.DateTime, nullable=True)
    codice_scm = db.Column(db.String(60), default="")                      # codice per la MasterSupplyChain Academy
    nota = db.Column(db.String(300), default="")
    utente = db.relationship("Utente")
    __table_args__ = (db.UniqueConstraint("utente_id", "corso", name="uq_iscrizione_utente_corso"),)


class TentativoEsame(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    utente_id = db.Column(db.Integer, db.ForeignKey("utente.id"), nullable=False, index=True)
    corso = db.Column(db.String(30), nullable=False)
    domande = db.Column(db.Text, nullable=False)            # json: indici delle domande estratte
    iniziato = db.Column(db.DateTime, default=adesso, nullable=False)
    chiuso = db.Column(db.DateTime, nullable=True)
    teoria = db.Column(db.Float, nullable=True)             # 0-1
    pratica = db.Column(db.Float, nullable=True)            # 0-1
    superato = db.Column(db.Boolean, default=False, nullable=False)


class Attestato(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    codice = db.Column(db.String(20), unique=True, nullable=False, index=True)
    utente_id = db.Column(db.Integer, db.ForeignKey("utente.id"), nullable=False, index=True)
    corso = db.Column(db.String(30), nullable=False)
    nome_completo = db.Column(db.String(200), nullable=False)
    titolo = db.Column(db.String(200), nullable=False)
    ore = db.Column(db.Float, nullable=False)
    punteggio = db.Column(db.Float, nullable=False)
    emesso = db.Column(db.DateTime, default=adesso, nullable=False)
    revocato = db.Column(db.Boolean, default=False, nullable=False)


def costo_orario_generale():
    r = db.session.get(Impostazione, "costo_orario")
    try:
        return float(r.valore) if r else 0.0
    except ValueError:
        return 0.0


def url_database():
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        return "sqlite:///" + os.path.join(os.environ.get("ACADEMY_DATI", os.getcwd()), "academy.sqlite3")
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def inizializza(app):
    app.config.setdefault("SQLALCHEMY_DATABASE_URI", url_database())
    app.config.setdefault("SQLALCHEMY_ENGINE_OPTIONS", {"pool_pre_ping": True})
    db.init_app(app)
    with app.app_context():
        # più worker possono partire insieme: chi arriva secondo trova già tutto e va avanti
        for tentativo in range(3):
            try:
                db.create_all()
                crea_docente_iniziale(app)
                break
            except (IntegrityError, OperationalError, ProgrammingError):
                db.session.rollback()
                time.sleep(0.5 + tentativo)
        db.session.remove()
        db.engine.dispose()     # con gunicorn --preload ogni worker apre le sue connessioni


def crea_docente_iniziale(app):
    """Il primo accesso docente nasce dalle variabili DOCENTE_USERNAME / DOCENTE_PASSWORD (solo se non esiste nessun docente)."""
    if Utente.query.filter_by(ruolo="docente").first():
        return
    username = os.environ.get("DOCENTE_USERNAME", "docente").strip().lower()
    password = os.environ.get("DOCENTE_PASSWORD", "")
    obbligo = os.environ.get("DOCENTE_CAMBIO_PASSWORD", "") == "1"   # al primo accesso si sceglie la propria password
    if not password:
        password = secrets.token_urlsafe(9)
        obbligo = True
        app.logger.warning("Nessuna DOCENTE_PASSWORD: creato l'accesso '%s' con password temporanea %s (cambiala al primo accesso)", username, password)
    u = Utente(username=username, nome=os.environ.get("DOCENTE_NOME", "Docente"), ruolo="docente", deve_cambiare_password=obbligo)
    u.imposta_password(password)
    db.session.add(u)
    if not db.session.get(Impostazione, "costo_orario"):
        db.session.add(Impostazione(chiave="costo_orario", valore=os.environ.get("COSTO_ORARIO", "0")))
    db.session.commit()
