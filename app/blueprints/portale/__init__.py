"""Blueprint «Portale» — pagina iniziale, materiali e pagina unica di verifica."""
import json

from flask import Blueprint, abort, g, redirect, render_template, send_from_directory, url_for

from ...pagine import ATTIVITA, MODULI, VERSIONI, app_modulo, modulo
from ...simulatore import STATIC, mappa_url, meta

bp = Blueprint("portale", __name__, template_folder="templates", static_folder="static", static_url_path="/static/portale")

MATERIALI = [
    {"file": "Esercitazione_Completa_FORMAS.pdf", "titolo": "Esercitazione completa — Firenze e FORMAS Pistoia (PDF)",
     "testo": "Caso principale, UF 8–11 e laboratori dei comandi: dati simulati, verifiche e mappa di copertura."},
    {"file": "Esercitazione_Completa_FORMAS.md", "titolo": "Esercitazione completa — sorgente modificabile",
     "testo": "Testo modificabile della stessa esercitazione, generato dalle guide del programma."},
    {"file": "Esercitazione_Ragioneria_con_WMS.pdf", "titolo": "Ragioneria con WMS — guida passo passo (PDF)",
     "testo": "Acquisto, produzione, vendita, chiusura costi e banca: percorso integrato con magazzino attivo dall'apertura."},
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
    return render_template("portale/home.html", versioni=VERSIONI, attivita=ATTIVITA, materiali=[])


def _lp(versione, **extra):
    return render_template(extra.pop("template"), versione=versione, versioni=VERSIONI, attivita_tutte=ATTIVITA, attivita=None,
                           moduli=MODULI, materiali=[], chiave_storage="ferro-transenne-fi-2026-erp-ft-civilistico", **extra)


@bp.route("/<versione>/")
def ingresso(versione):
    """Launchpad in stile SAP Fiori, primo livello: si sceglie il modulo (FI, CO, SD, MM, PP, HR…)."""
    if versione not in VERSIONI:
        abort(404)
    return _lp(versione, template="portale/launchpad.html", modulo_attivo=None, endpoint_corrente="portale.ingresso")


@bp.route("/<versione>/m/<codice>")
def modulo_lp(versione, codice):
    """Secondo livello: le app (transazioni) del modulo scelto, a mattonelle compatte."""
    m = modulo(codice)
    if versione not in VERSIONI or m is None:
        abort(404)
    g.versione = versione
    return _lp(versione, template="portale/modulo.html", modulo_attivo=m, app=app_modulo(m), endpoint_corrente="portale.modulo_lp",
               parametri_correnti={"codice": codice})


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
                           moduli=MODULI, modulo_attivo=None, app_attiva="Tutte le schede in una pagina",
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
