"""MASTERSAPSTYLE ACADEMY — applicazione Flask a blueprint, una cartella per attività."""
import os
import secrets
from datetime import timedelta

from flask import Flask

from . import accesso
from .blueprints.accessi import bp as accessi
from .blueprints.allievo import bp as allievo
from .blueprints.alta_varieta import bp as alta_varieta
from .blueprints.contabilita import bp as contabilita
from .blueprints.controllo import bp as controllo
from .blueprints.docente import bp as docente
from .blueprints.erp_acquisti import bp as erp_acquisti
from .blueprints.erp_copa import bp as erp_copa
from .blueprints.erp_costi import bp as erp_costi
from .blueprints.erp_dati import bp as erp_dati
from .blueprints.erp_fi import bp as erp_fi
from .blueprints.erp_innovazione import bp as erp_innovazione
from .blueprints.erp_inventario import bp as erp_inventario
from .blueprints.erp_magazzino import bp as erp_magazzino
from .blueprints.erp_paghe import bp as erp_paghe
from .blueprints.erp_produzione import bp as erp_produzione
from .blueprints.erp_spedizione import bp as erp_spedizione
from .blueprints.erp_tesoreria import bp as erp_tesoreria
from .blueprints.erp_valute import bp as erp_valute
from .blueprints.erp_vendite import bp as erp_vendite
from .blueprints.formazione import bp as formazione
from .blueprints.guida import bp as guida
from .blueprints.impostazioni import bp as impostazioni
from .blueprints.personale import bp as personale
from .blueprints.pianificazione import bp as pianificazione
from .blueprints.portale import bp as portale
from .blueprints.produzione import bp as produzione
from .blueprints.reportistica import bp as reportistica
from .blueprints.ripetitiva import bp as ripetitiva
from .blueprints.sincronia import bp as sincronia
from .blueprints.vendite_acquisti import bp as vendite_acquisti
from .db import inizializza, ora_italiana

BLUEPRINT = [portale, accessi, sincronia, guida, allievo, docente,
             impostazioni, pianificazione, contabilita, controllo, personale,
             vendite_acquisti, produzione, reportistica, alta_varieta, ripetitiva, formazione,
             erp_dati, erp_vendite, erp_acquisti, erp_produzione, erp_costi, erp_magazzino, erp_inventario, erp_spedizione, erp_innovazione, erp_tesoreria, erp_valute, erp_paghe, erp_copa, erp_fi]


def create_app():
    app = Flask(__name__)
    chiave = os.environ.get("SECRET_KEY")
    if not chiave:
        chiave = secrets.token_hex(32)
        app.logger.warning("SECRET_KEY non impostata: chiave temporanea (gli accessi decadono al riavvio)")
    produzione = bool(os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("FORZA_HTTPS"))
    app.config.update(
        SECRET_KEY=chiave,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=produzione,
        PERMANENT_SESSION_LIFETIME=timedelta(hours=12),
        MAX_CONTENT_LENGTH=8 * 1024 * 1024,
    )
    inizializza(app)
    for bp in BLUEPRINT:
        app.register_blueprint(bp)
    app.before_request(accesso.controlla_accesso)

    @app.context_processor
    def comuni():
        return {"utente_corrente": accesso.utente_corrente, "csrf_token": accesso.csrf_token,
                "durata": accesso.durata, "ora_italiana": ora_italiana}

    @app.template_filter("euro")
    def euro(x):
        try:
            v = float(x)
        except (TypeError, ValueError):
            return x if x not in (None, "") else "—"
        s = f"{abs(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return ("−" if v < 0 else "") + s

    @app.after_request
    def intestazioni(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Referrer-Policy", "same-origin")
        resp.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        if resp.mimetype == "text/html":
            resp.headers.setdefault("Cache-Control", "no-store")
        return resp

    return app
