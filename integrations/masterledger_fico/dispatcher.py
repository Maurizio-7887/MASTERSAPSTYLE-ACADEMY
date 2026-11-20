"""Dispatcher WSGI per montare MasterLedger su /fico senza cambiare le rotte Firenze.

ATTENZIONE: attivare solo quando il codice MasterLedger e le sue dipendenze
sono stati importati e verificati. La configurazione del database FI/CO
deve essere indipendente da quella del portale.
"""
from werkzeug.middleware.dispatcher import DispatcherMiddleware

def build_combined_app(firenze_app, masterledger_app):
    """Monta una WSGI app separata sotto /fico.

    Werkzeug aggiorna SCRIPT_NAME e PATH_INFO; Flask genera URL sotto
    il prefisso quando una richiesta viene instradata correttamente.
    Non fornisce SSO, migrazioni o isolamento dati da solo.
    """
    return DispatcherMiddleware(firenze_app, {"/fico": masterledger_app})
