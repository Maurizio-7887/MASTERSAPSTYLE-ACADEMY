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
    ("sovraccosti", "Il costo standard non copre i costi generali?", "Lo standard è «ferro + ore»: magazzino, acquisti, capireparto e manutenzione restano fuori e il margine sembra più alto di quello che è.",
     "🧮", "erp_costi", "KZZ2"),
    ("varianza-lotto", "I lotti piccoli costano di più e nessuno lo vede?", "Lo stesso prodotto, con la stessa efficienza, costa di più quando si fanno pochi pezzi: la varianza finisce in un unico numero.",
     "📏", "erp_costi", "KKS2: leggi"),
    ("material-ledger", "Il costo standard non è il costo vero?", "Il ferro si paga più dello standard, gli ordini hanno varianze: a fine mese nessuno sa quanto è costato davvero quello che hai venduto.",
     "📒", "erp_costi", "CKMLCP"),
    ("dove-merce", "Sai quanto c'è a magazzino, ma non DOVE?", "Si cerca la merce girando tra gli scaffali, i pallet si spostano senza traccia, il magazziniere nuovo non trova niente.",
     "🗺️", "erp_magazzino", "Mappa"),
    ("inventario-differenze", "Lo scaffale non torna con il sistema?", "A fine anno si conta, i numeri non coincidono e qualcuno «aggiusta» la giacenza senza sapere perché.",
     "📝", "erp_inventario", "Crea il documento d"),
    ("inventario-rotazione", "Per fare l'inventario fermi il magazzino?", "Due giorni di spedizioni ferme a dicembre, conte fatte di corsa, errori che nessuno ricontrolla.",
     "🔄", "erp_inventario", "ABC"),
    ("valorizzazione", "Quanto valgono le rimanenze in bilancio?", "Stesse quantità, valori diversi: FIFO, LIFO, costo medio o standard? E che effetto ha sull'utile?",
     "💶", "erp_inventario", "Valorizzazione"),
    ("processo-spedizione", "Spedisci senza sapere cosa sale sul camion?", "Il camion parte, il cliente chiama: manca un pallet, ce n'è uno di un altro cliente, il DDT non corrisponde.",
     "🚛", "erp_spedizione", "Aprile — VL01N"),
    ("prelievo-errori", "Il prelievo è lento e pieno di errori?", "Il magazziniere gira a vuoto, prende il pallet più comodo invece del più vecchio, le mancanze si scoprono dal cliente.",
     "📋", "erp_spedizione", "RF: preleva la consegna del Comune"),
    ("ddt-sscc", "DDT ed etichette scritti a mano?", "Numeri di DDT saltati, pesi stimati, colli senza etichetta: al ricevimento del cliente nessuno sa cosa ha in mano.",
     "📄", "erp_spedizione", "Imballo: 5 pallet"),
    ("magazziniere-cammina", "Il magazziniere cammina troppo?", "Gli articoli più richiesti sono in fondo al magazzino e ogni consegna è un giro a parte.",
     "🧭", "erp_innovazione", "Slotting"),
    ("misurare-magazzino", "Come misuri il tuo magazzino?", "Si dice «funziona» o «è un disastro», ma nessuno sa quanti errori, quanti metri, quanti giorni.",
     "📈", "erp_innovazione", "KPI di maggio"),
    ("rfid-automazione", "Leggere tutto in un colpo?", "Al carico si leggono i colli uno per uno; la merce in arrivo per un ordine urgente va prima a scaffale e poi torna indietro.",
     "📡", "erp_innovazione", "Varco RFID"),
    ("previsione-cassa", "Non sai quanta cassa avrai il mese prossimo?", "I pagamenti ai fornitori si fanno a mano, l'estratto conto si spunta su carta, i clienti in ritardo li scopre la banca.",
     "💧", "erp_tesoreria", "F110"),
    ("valute-estere", "Vendi e compri in dollari?", "La fattura è in dollari, l'incasso arriva dopo: in banca entra un importo diverso e nessuno sa dove registrare la differenza.",
     "💱", "erp_valute", "Luglio — F-28"),
    ("costo-personale", "Quanto costa davvero un dipendente?", "Si conosce il netto in busta, non il costo per l'azienda né quanto pesa su ogni reparto.",
     "🧾", "erp_paghe", "Calcola i cedolini"),
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


# Corso FORMAS «Addetto alle operazioni di spedizione» (Pistoia): unità formative del docente, date e materiali del portale
FORMAS = [
    {"uf": "UF 8", "titolo": "Introduzione alla contabilità di magazzino", "date": "15 giugno – 28 luglio 2026", "verifica": "14 luglio 2026",
     "lezioni": ["valorizzazione", "dove-merce"], "pagine": [("erp_inventario.valorizzazione", "Scheda di magazzino e valorizzazione"), ("erp_dati.anagrafiche", "Materiali e giacenze"), ("erp_fi.giornale", "Libro giornale")]},
    {"uf": "UF 9", "titolo": "Inventari fisici e contabili — procedure operative", "date": "21 ottobre – 3 novembre 2026", "verifica": "3 novembre 2026",
     "lezioni": ["inventario-differenze", "inventario-rotazione", "valorizzazione", "dove-merce"],
     "pagine": [("erp_inventario.documenti", "Documenti d'inventario"), ("erp_inventario.lista", "Lista di conta"), ("erp_inventario.differenze", "Differenze"), ("erp_inventario.abc", "Classificazione ABC"), ("erp_magazzino.rf", "Pistola RF")],
     "esercizio": "marzo 2027 dell'esercizio passo passo (s4-magazzino)"},
    {"uf": "UF 10", "titolo": "Sistemi informativi applicati al processo logistico", "date": "10 – 26 novembre 2026", "verifica": "26 novembre 2026",
     "lezioni": ["processo-spedizione", "prelievo-errori", "ddt-sscc", "dove-merce"],
     "pagine": [("erp_spedizione.monitor", "Monitor delle consegne"), ("erp_spedizione.imballo", "Imballo e SSCC"), ("erp_spedizione.trasporti", "Trasporti e carico"), ("erp_spedizione.ddt", "DDT"), ("erp_magazzino.rf", "Pistola RF")],
     "esercizio": "aprile 2027 dell'esercizio passo passo (s4-spedizione)"},
    {"uf": "UF 11", "titolo": "Innovazione dei sistemi logistici e del magazzino", "date": "26 novembre 2026 – 15 marzo 2027", "verifica": "8 gennaio 2027",
     "lezioni": ["magazziniere-cammina", "misurare-magazzino", "rfid-automazione"],
     "pagine": [("erp_innovazione.kpi", "KPI di magazzino"), ("erp_innovazione.slotting", "Slotting"), ("erp_innovazione.ondate", "Ondate e cross-docking"), ("erp_innovazione.rfid", "Varco RFID")],
     "esercizio": "maggio 2027 dell'esercizio passo passo (s4-innovazione)"},
]


@bp.route("/formas")
def formas():
    return render_template("formazione/formas.html", formas=FORMAS, caso_per=CASO, versione=versione_corrente(), versioni=VERSIONI,
                           moduli=MODULI, modulo_attivo=modulo("casi"), endpoint_corrente="formazione.formas")


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
