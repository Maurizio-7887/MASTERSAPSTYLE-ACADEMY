#!/usr/bin/env python3
"""Spezza il simulatore monolitico (un solo file HTML) nella struttura a blueprint.

Uso:  python tools/split_simulatore.py
Legge  sorgenti/simulatore-vuoto.html  e  sorgenti/simulatore-completo.html
Scrive:
  app/static/sim/<versione>/css/simulatore.css      stile del simulatore
  app/blueprints/<attivita>/static/<versione>/NN-<modulo>.js
                                                     JavaScript spezzato per modulo, nella cartella
                                                     dell'attività che lo possiede (vedi JS_BLUEPRINT)
  app/static/sim/<versione>/meta.json                titolo, ordine script, id statici
  app/blueprints/<attivita>/templates/<attivita>/_sezioni/<vista>.html
                                                     markup HTML di ogni scheda

Quando arriva una nuova versione del simulatore basta sostituire i due file in
sorgenti/ e rilanciare lo script: le pagine dei blueprint includono i frammenti
rigenerati, nessun template va riscritto a mano.

Regola tecnica: i file JS restano "script classici" caricati in ordine, così
condividono le stesse variabili globali (STATO, SDMM, PP, FI, Treasury...).
Il taglio avviene solo in punti in cui il codice eseguito al caricamento usa
funzioni già definite nei file precedenti (verificato dal test di regressione).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "sorgenti"
APP = ROOT / "app"

# Scheda (data-vista) -> cartella del blueprint che la usa
VISTA_BLUEPRINT = {
    "impostazioni": "impostazioni",
    "budget": "pianificazione",
    "previsionale": "pianificazione",
    "fi": "contabilita",
    "registrazione": "contabilita",
    "sdmm": "vendite_acquisti",
    "pp": "produzione",
    "giornale": "reportistica",
    "mastro": "reportistica",
    "bilancio": "reportistica",
    "centri-costo": "controllo",
    "commesse-report": "controllo",
    "mensile": "controllo",
}

# Script <script> del file originale: (nome file, marcatore iniziale del pezzo).
# Il primo script (SD/MM) e il secondo (PP) restano interi; il terzo (motore) si
# taglia ai marcatori; gli ultimi tre sono estensioni autonome.
TAGLI_MOTORE = [
    ("03-stato-e-costi-standard", None),
    ("04-impostazioni-budget-previsionale", "function renderPianoDeiConti("),
    ("05-registrazione-fb50", "function opzioniConti("),
    ("06-giornale-mastro-bilancio", "function nomeConto("),
    ("07-report-centri-commesse-mensile", "function renderReportCentriCosto("),
    ("08-fi-ragioneria", "const FI = (() => {"),
    ("09-co-budget-pool", "const BudgetPool = (() => {"),
    ("10-fiscale-iva-ires-chiusura", "const Annual=(()=>{"),
    ("11-tesoreria-ar-ap-bl", " * Treasury FI — modulo browser standalone"),
    ("12-fi-moduli-navigazione", "window.FIModules = (() => {"),
    ("13-cespiti-cessioni-sopravvenienze", " * FI-AA asset disposal and constrained FI-GL"),
    ("14-tre-fasi-fabbisogno-piegatura", "window.Fabbisogno = (()=>{"),
    ("15-operativita-guida-moduli", "window.Operativita = (()=>{"),
    ("16-avvio", "inizializzaImpostazioni();"),
]
# File JS -> attività (cartella del blueprint) che lo possiede. Il motore comune sta nel portale.
JS_BLUEPRINT = {
    "01-sd-mm-vendite-acquisti": "vendite_acquisti",
    "02-pp-produzione": "produzione",
    "03-stato-e-costi-standard": "portale",
    "04-impostazioni-budget-previsionale": "impostazioni",
    "05-registrazione-fb50": "contabilita",
    "06-giornale-mastro-bilancio": "reportistica",
    "07-report-centri-commesse-mensile": "controllo",
    "08-fi-ragioneria": "contabilita",
    "09-co-budget-pool": "controllo",
    "10-fiscale-iva-ires-chiusura": "contabilita",
    "11-tesoreria-ar-ap-bl": "contabilita",
    "12-fi-moduli-navigazione": "contabilita",
    "13-cespiti-cessioni-sopravvenienze": "contabilita",
    "14-tre-fasi-fabbisogno-piegatura": "produzione",
    "15-operativita-guida-moduli": "contabilita",
    "16-avvio": "portale",
    "17-fabbisogno-pp-mm": "pianificazione",
    "18-riba-factoring-addizionali": "contabilita",
    "19-civilistico-competenza-servizi": "contabilita",
}
NOMI_SCRIPT = {0: "01-sd-mm-vendite-acquisti", 1: "02-pp-produzione", 3: "17-fabbisogno-pp-mm",
               4: "18-riba-factoring-addizionali", 5: "19-civilistico-competenza-servizi"}


def commento_o_vuota(riga):
    s = riga.strip()
    return s == "" or s.startswith("//") or s.startswith("/*") or s.startswith("*") or s.startswith("*/")


def taglia_motore(codice):
    righe = codice.split("\n")
    inizi = []
    for nome, marcatore in TAGLI_MOTORE:
        if marcatore is None:
            inizi.append((nome, 0))
            continue
        idx = [i for i, r in enumerate(righe) if r.startswith(marcatore) or (marcatore.startswith(" *") and r.startswith(marcatore))]
        if len(idx) != 1:
            sys.exit(f"Marcatore non univoco o assente ({len(idx)}): {marcatore!r}")
        i = idx[0]
        # porta con sé il commento di testata che lo precede
        while i > 0 and commento_o_vuota(righe[i - 1]) and righe[i - 1].strip() != "":
            i -= 1
        inizi.append((nome, i))
    pezzi = []
    for k, (nome, i) in enumerate(inizi):
        fine = inizi[k + 1][1] if k + 1 < len(inizi) else len(righe)
        if k and fine <= i:
            sys.exit(f"Ordine dei marcatori errato vicino a {nome}")
        pezzi.append((nome, "\n".join(righe[i:fine]).strip("\n") + "\n"))
    return pezzi


def estrai(html):
    titolo = re.search(r"<title>(.*?)</title>", html, re.S).group(1).strip()
    css = re.search(r"<style>(.*?)</style>", html, re.S).group(1)
    h1 = re.search(r'<header class="app">\s*<h1>(.*?)</h1>', html, re.S).group(1).strip()
    sotto = re.search(r'<div class="sotto">(.*?)</div>', html, re.S).group(1).strip()
    scripts = re.findall(r"<script>(.*?)</script>", html, re.S)
    if len(scripts) != 6:
        sys.exit(f"Attesi 6 blocchi <script>, trovati {len(scripts)}")
    corpo = html.split("<main>", 1)[1].split("</main>", 1)[0]
    sezioni = {}
    for m in re.finditer(r'<section class="vista(?: attiva)?" data-vista="([^"]+)">', corpo):
        fine = corpo.index("</section>", m.end()) + len("</section>")
        sezioni[m.group(1)] = corpo[m.start():fine].replace(' class="vista attiva"', ' class="vista"')
    markup = html.split("<body>", 1)[1]
    markup = re.sub(r"<script>.*?</script>", "", markup, flags=re.S)
    ids = {}
    for tag, ident in re.findall(r'<(\w+)[^>]*?\sid="([^"$]+)"', markup):
        ids.setdefault(ident, tag.lower())
    return dict(titolo=titolo, css=css, h1=h1, sotto=sotto, scripts=scripts, sezioni=sezioni, ids=ids)


def scrivi(path, testo):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(testo, encoding="utf-8")


def main():
    for versione in ("vuoto", "completo"):
        dati = estrai((SRC / f"simulatore-{versione}.html").read_text(encoding="utf-8"))
        base = APP / "static" / "sim" / versione
        for vecchio in list((base / "js").glob("*.js")) + list((APP / "blueprints").glob(f"*/static/{versione}/*.js")):
            vecchio.unlink()
        scrivi(base / "css" / "simulatore.css", dati["css"].strip() + "\n")
        ordine = []
        for i, codice in enumerate(dati["scripts"]):
            pezzi = taglia_motore(codice) if i == 2 else [(NOMI_SCRIPT[i], codice.strip("\n") + "\n")]
            for nome, testo in pezzi:
                bp = JS_BLUEPRINT[nome]
                scrivi(APP / "blueprints" / bp / "static" / versione / f"{nome}.js",
                       f"/* Generato da tools/split_simulatore.py ({versione}) — non modificare a mano: modifica sorgenti/ e rilancia. */\n" + testo)
                ordine.append({"bp": bp, "file": f"{nome}.js"})
        ordine.sort(key=lambda x: x["file"])   # l'ordine numerico è l'ordine originale degli script
        mancanti = set(VISTA_BLUEPRINT) - set(dati["sezioni"])
        if mancanti:
            sys.exit(f"Schede mancanti nel sorgente {versione}: {mancanti}")
        meta = dict(versione=versione, titolo=dati["titolo"], h1=dati["h1"], sotto=dati["sotto"],
                    script=ordine, id_statici=dati["ids"], sezioni=sorted(dati["sezioni"]))
        scrivi(base / "meta.json", json.dumps(meta, ensure_ascii=False, indent=1))
        if versione == "vuoto":  # il markup delle schede è condiviso dalle due versioni
            for vista, html in dati["sezioni"].items():
                bp = VISTA_BLUEPRINT.get(vista)
                if not bp:
                    sys.exit(f"Scheda senza blueprint: {vista}")
                scrivi(APP / "blueprints" / bp / "templates" / bp / "_sezioni" / f"{vista}.html",
                       "{# Generato da tools/split_simulatore.py — non modificare a mano #}\n{% raw %}" + html.strip() + "{% endraw %}\n")
        print(f"{versione}: {len(ordine)} file JS, {len(dati['sezioni'])} schede, {len(dati['ids'])} id statici")


if __name__ == "__main__":
    main()
