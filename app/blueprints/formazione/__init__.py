"""Blueprint «Formazione» — «Che situazione hai?»: un pulsante per ogni situazione aziendale riconoscibile.
Ogni pulsante apre PRIMA la lezione da spiegare (sintomi, diagnosi, concetti, esempio, schema, SAP, domande)
e POI il laboratorio, preparato fino al punto giusto, con la finestra passo passo su quel passo.
Una pagina HTML per ogni situazione in templates/formazione/<slug>.html."""
from flask import Blueprint, abort, render_template, url_for

from ...pagine import LABORATORI, MODULI, VERSIONI, modulo
from ...simulatore import collega_versione

bp = Blueprint("formazione", __name__, template_folder="templates", static_folder="static", url_prefix="/<versione>/formazione")
collega_versione(bp)

# slug: (domanda del pulsante, «lo riconosci se…», icona, laboratorio o None per il simulatore, passo da cui partire)
CASI = [
    ("ordini-lunghi", "Hai ordini o «commesse» aperti per mesi?", "Semilavorati avviati mesi prima del finito, ordini che non si chiudono mai, il gestionale «non regge».",
     "⏳", "alta_varieta", "Strategie:"),
    ("wip-fine-mese", "A fine mese vedi costi sugli ordini aperti, ma nessun ricavo?", "Il controller chiede di chiudere gli ordini entro il mese per far tornare il conto economico.",
     "📆", "alta_varieta", "CO88: chiusura di novembre"),
    ("varianze", "Hai varianze di produzione che nessuno sa spiegare?", "Un solo numero a fine commessa, sempre sullo stesso codice, senza sapere se è materiale, tempi o lotto.",
     "🔬", "alta_varieta", "CO88: chiusura di dicembre"),
    ("lead-time", "Il cliente aspetta troppo la consegna?", "Il lead time verso il cliente è quello dell'intera distinta, dal ferro al prodotto finito.",
     "🚚", "alta_varieta", "VA01: tre ordini cliente"),
    ("scorte-semilavorati", "Non sai quanti semilavorati tenere a scorta?", "A volte mancano (rotture), a volte ce ne sono troppi fermi; l'MRP cambia piano ogni giorno.",
     "🛟", "alta_varieta", "Buffer DDMRP"),
    ("linea-ripetitiva", "Fai pochi modelli, sempre gli stessi, su una linea?", "Volumi stabili ogni giorno, come un costruttore di trattori: aprire un ordine per ogni lotto non ha senso.",
     "🚜", "ripetitiva", "Budget 2027"),
    ("backflush", "Lo scarico automatico (backflush) ti falsa il magazzino?", "Scarti, sfridi e pezzi fermi in linea che lo scarico a standard non vede.",
     "⚖️", "ripetitiva", "20 TR-STD fermi"),
    ("prezzi-sconti", "Prezzi e sconti decisi a mano, ordine per ordine?", "Ogni venditore applica il suo sconto, il listino è un foglio Excel e nessuno sa perché un cliente paga meno.",
     "🏷️", "erp_dati", "VK11: prezzo speciale"),
    ("acconti", "Chiedi acconti ai clienti prima di consegnare?", "L'acconto finisce tra i crediti, l'IVA si paga due volte o mai, e in fattura nessuno lo detrae.",
     "💰", "erp_vendite", "F-37"),
    ("resi-abbuoni", "Clienti che rendono merce o chiedono abbuoni?", "Note di credito fatte a mano, merce resa che non rientra a magazzino, abbuoni senza approvazione.",
     "↩️", "erp_vendite", "Reso:"),
    ("redditivita-clienti", "Non sai quanto guadagni su ogni cliente?", "Il fatturato per cliente c'è, il margine no: sconti, resi, trasporti e provvigioni si perdono nel conto economico.",
     "📊", "erp_copa", "KE30"),
    ("ciclo-completo", "Devi insegnare il ciclo completo, dalla costituzione al bilancio?", "Contabilità, controllo di gestione, vendite, acquisti e produzione in un unico esercizio.",
     "🏛️", None, "Prepara l'azienda nuova"),
]
CASO = {c[0]: c for c in CASI}


def _url_lab(versione, caso):
    slug, _, _, _, lab, passo = caso
    if lab is None:
        return url_for("contabilita.sicurezza", versione=versione, passo=passo)
    # la prima pagina del laboratorio; la finestra passo passo porta poi alla pagina giusta
    return url_for(f"{lab}.{LABORATORI[lab]['pagine'][0]['endpoint']}", versione=versione, passo=passo)


@bp.route("/")
def indice():
    return render_template("formazione/indice.html", casi=CASI, versione=versione_corrente(), versioni=VERSIONI,
                           moduli=MODULI, modulo_attivo=modulo("casi"), endpoint_corrente="formazione.indice", laboratori=LABORATORI)


def versione_corrente():
    from flask import g
    return g.versione


def lezione(slug):
    caso = CASO[slug]
    lab = LABORATORI.get(caso[4]) if caso[4] else None
    v = versione_corrente()
    return render_template(f"formazione/{slug}.html", caso=caso, lab=lab, versione=v, versioni=VERSIONI, moduli=MODULI,
                           modulo_attivo=modulo("casi"), endpoint_corrente=f"formazione.{slug.replace('-', '_')}",
                           url_lab=_url_lab(v, caso), blueprint_lab=caso[4],
                           chiave_lab=f"ferro-transenne-fi-2026-{lab['slot']}-civilistico" if lab else None,
                           js_lab=_js_logica(caso[4], lab) if lab else [], copione=lab.get("copione", "HMLV" if caso[4] == "alta_varieta" else "REM") if lab else None,
                           casi=CASI)


def _js_logica(blueprint, lab):
    """Gli script di logica del laboratorio (non quelli che disegnano le pagine), per preparare la situazione dalla lezione."""
    out = []
    for f in lab["js"]:
        ep, nome = f if isinstance(f, tuple) else (f"{blueprint}.static", f)
        if "-pagine" not in nome:
            out.append(url_for(ep, filename=nome))
    return out


for _c in CASI:
    bp.add_url_rule(f"/{_c[0]}", _c[0].replace("-", "_"), (lambda s: (lambda: lezione(s)))(_c[0]))
