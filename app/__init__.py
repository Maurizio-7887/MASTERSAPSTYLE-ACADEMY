"""MASTERSAPSTYLE ACADEMY — applicazione Flask a blueprint, una cartella per attività."""
from flask import Flask

from .blueprints.contabilita import bp as contabilita
from .blueprints.controllo import bp as controllo
from .blueprints.impostazioni import bp as impostazioni
from .blueprints.personale import bp as personale
from .blueprints.pianificazione import bp as pianificazione
from .blueprints.portale import bp as portale
from .blueprints.produzione import bp as produzione
from .blueprints.reportistica import bp as reportistica
from .blueprints.vendite_acquisti import bp as vendite_acquisti

BLUEPRINT = [portale, impostazioni, pianificazione, contabilita, controllo, personale,
             vendite_acquisti, produzione, reportistica]


def create_app():
    app = Flask(__name__)
    for bp in BLUEPRINT:
        app.register_blueprint(bp)

    @app.after_request
    def intestazioni(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Referrer-Policy", "same-origin")
        return resp

    return app
