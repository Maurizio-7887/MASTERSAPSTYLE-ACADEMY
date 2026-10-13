"""Blueprint «Portale» — pagina iniziale, materiali e pagina unica di verifica."""
import json

from flask import Blueprint, abort, g, redirect, render_template, send_from_directory, url_for

from ...pagine import ATTIVITA, VERSIONI
from ...simulatore import STATIC, mappa_url, meta

bp = Blueprint("portale", __name__, template_folder="templates", static_folder="static", static_url_path="/static/portale")

MATERIALI = [
    {"file": "Guida-esercizio-integrato.pdf", "titolo": "Esercizio guidato passo passo (PDF)",
     "testo": "Dalla costituzione al saldo IRES: tre ordini di produzione, RiBa, anticipo su fattura, factoring, chiusura e riapertura."},
    {"file": "ferro-transenne-vuoto-file-unico.html", "titolo": "Simulatore offline — versione vuota (file unico)",
     "testo": "Lo stesso programma in un solo file HTML da scaricare e aprire senza internet."},
    {"file": "ferro-transenne-completo-file-unico.html", "titolo": "Simulatore offline — versione completa (file unico)",
     "testo": "Versione con clienti di esempio, in un solo file HTML."},
]
SCHEDE_TUTTO = [("impostazioni", "impostazioni"), ("pianificazione", "budget"), ("pianificazione", "previsionale"),
                ("contabilita", "fi"), ("contabilita", "registrazione"), ("vendite_acquisti", "sdmm"), ("produzione", "pp"),
                ("reportistica", "giornale"), ("reportistica", "mastro"), ("reportistica", "bilancio"),
                ("controllo", "centri-costo"), ("controllo", "commesse-report"), ("controllo", "mensile")]


@bp.route("/")
def home():
    return render_template("portale/home.html", versioni=VERSIONI, attivita=ATTIVITA, materiali=MATERIALI)


@bp.route("/<versione>/")
def ingresso(versione):
    if versione not in VERSIONI:
        abort(404)
    return redirect(url_for("impostazioni.impostazioni", versione=versione))


@bp.route("/<versione>/tutto")
def tutto(versione):
    """Tutte le schede in una pagina, come il file originale: serve ai test e a chi preferisce le linguette."""
    if versione not in VERSIONI:
        abort(404)
    g.versione = versione
    url_vista, url_modulo = mappa_url(versione)
    m = meta(versione)
    config = {"versione": versione, "pagina": "portale.tutto", "vista": "impostazioni", "modulo": None, "sd": None, "pp": None,
              "urlVista": url_vista, "urlModulo": url_modulo, "idStatici": m["id_statici"]}
    attivita = {"blueprint": "portale", "titolo": "Tutto in una pagina", "pagine": []}
    pagina = {"endpoint": "tutto", "titolo": "Tutte le schede"}
    return render_template("portale/tutto.html", attivita=attivita, pagina=pagina, attivita_tutte=ATTIVITA,
                           versioni=VERSIONI, meta=m, config=config, schede=SCHEDE_TUTTO)


@bp.route("/materiali/<path:file>")
def materiale(file):
    if file not in {x["file"] for x in MATERIALI}:
        abort(404)
    return send_from_directory(STATIC / "docs", file, as_attachment=file.endswith(".html"))


# Indirizzi della prima versione del portale
@bp.route("/simulatori/ferro-transenne-<versione>")
def vecchio_indirizzo(versione):
    return redirect(url_for("portale.ingresso", versione=versione), code=301)


@bp.route("/health")
def health():
    return {"status": "ok"}
