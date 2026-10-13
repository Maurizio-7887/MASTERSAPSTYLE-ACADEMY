"""MASTERSAPSTYLE ACADEMY — portale dei simulatori didattici in stile SAP.

Prima versione: serve i simulatori standalone (HTML offline) e i materiali.
I dati degli studenti restano nel loro browser (localStorage): il server non
salva nulla. Le prossime versioni potranno aggiungere accessi, classi e
consegne dei backup JSON.
"""
import os
from flask import Flask, render_template, send_from_directory, abort

BASE = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder="static", template_folder="templates")

SIMULATORI = {
    "ferro-transenne-vuoto": {
        "file": "ferro-transenne-vuoto.html",
        "titolo": "Ferro & Transenne — versione vuota",
        "testo": "Azienda da costituire: clienti, ordini e commesse li crei tu. È la versione da usare per l'esercizio guidato.",
    },
    "ferro-transenne-completo": {
        "file": "ferro-transenne-completo.html",
        "titolo": "Ferro & Transenne — versione completa",
        "testo": "Stessa azienda con cinque clienti di esempio già caricati: utile per esplorare i moduli senza partire da zero.",
    },
}

MATERIALI = [
    {"file": "Guida-esercizio-integrato.pdf", "titolo": "Esercizio guidato passo passo (PDF)",
     "testo": "Dalla costituzione al saldo IRES: tre ordini di produzione, RiBa, anticipo su fattura, factoring, chiusura e riapertura."},
]


@app.after_request
def sicurezza(resp):
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "same-origin")
    return resp


@app.route("/")
def home():
    return render_template("index.html", simulatori=SIMULATORI, materiali=MATERIALI)


@app.route("/simulatori/<nome>")
def simulatore(nome):
    s = SIMULATORI.get(nome)
    if not s:
        abort(404)
    return send_from_directory(os.path.join(BASE, "static", "simulatori"), s["file"])


@app.route("/materiali/<path:file>")
def materiale(file):
    if file not in {m["file"] for m in MATERIALI}:
        abort(404)
    return send_from_directory(os.path.join(BASE, "static", "docs"), file)


@app.route("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
