"""Genera le figure del Manuale di ragioneria: schermate RICOSTRUITE a scopo didattico di SAP S/4HANA e di
Microsoft Dynamics 365 Business Central (localizzazione italiana) e di ad hoc Revolution (stile e causali del Simulatore AHR
del corso: Prima Nota con causale, F3 zoom, F10 registra). Non sono schermate originali e non contengono loghi:
riproducono campi, numeri e scritture dell'esercitazione «Dicembre» per far riconoscere all'allievo dove si guarda.

Uso:  python3 tools/figure_manuale.py   →  app/blueprints/ragioneria_quiz/static/manuale/*.svg
"""
from html import escape
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "app/blueprints/ragioneria_quiz/static/manuale"
W = 900
STILI = {
    # sistema: (colore barra, colore testo barra, accento, sfondo pagina, nome mostrato)
    "sap": ("#354A5F", "#FFFFFF", "#0A6ED1", "#F5F6F7", "SAP S/4HANA"),
    "bc": ("#00796B", "#FFFFFF", "#008489", "#FAFAFA", "Dynamics 365 Business Central"),
    # stile ripreso dal Simulatore AHR del corso (Maurizio-7887/Simulatore-AHR): maschere con testata scura, blu Zucchetti
    "ahr": ("#2B2B2B", "#FFFFFF", "#0054A6", "#F4F7F9", "ad hoc Revolution"),
}


def t(x, y, s, size=13, color="#32363A", weight="normal", anchor="start", mono=False):
    fam = "DejaVu Sans Mono, monospace" if mono else "DejaVu Sans, Arial, sans-serif"
    return (f'<text x="{x}" y="{y}" font-family="{fam}" font-size="{size}" fill="{color}" font-weight="{weight}" '
            f'text-anchor="{anchor}">{escape(str(s))}</text>')


def campo(x, y, etichetta, valore, w=260, evid=False):
    bordo = "#E9730C" if evid else "#89919A"
    return (t(x, y, etichetta, 11.5, "#556B82") +
            f'<rect x="{x}" y="{y + 6}" width="{w}" height="26" rx="3" fill="#FFFFFF" stroke="{bordo}" stroke-width="{2 if evid else 1}"/>' +
            t(x + 8, y + 24, valore, 13))


def tabella(x, y, colonne, righe, larghezze, accento, num=()):
    out, h = [], 26
    tot = sum(larghezze)
    out.append(f'<rect x="{x}" y="{y}" width="{tot}" height="{h}" fill="#EEF1F4" stroke="#D5DADD"/>')
    cx = x
    for i, (c, w) in enumerate(zip(colonne, larghezze)):
        a = "end" if i in num else "start"
        out.append(t(cx + (w - 8 if i in num else 8), y + 17, c, 12, "#32363A", "bold", a))
        cx += w
    for r, riga in enumerate(righe):
        yy = y + h * (r + 1)
        out.append(f'<rect x="{x}" y="{yy}" width="{tot}" height="{h}" fill="{"#FFFFFF" if r % 2 == 0 else "#FAFBFC"}" stroke="#E5E8EB"/>')
        cx = x
        for i, (v, w) in enumerate(zip(riga, larghezze)):
            a = "end" if i in num else "start"
            out.append(t(cx + (w - 8 if i in num else 8), yy + 17, v, 12.5, "#32363A", "normal", a, mono=i in num))
            cx += w
    return "".join(out), y + h * (len(righe) + 1)


def schermata(nome, sistema, percorso, titolo, corpo, altezza, nota):
    barra, testo_barra, accento, sfondo, sist = STILI[sistema]
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{altezza}" viewBox="0 0 {W} {altezza}" role="img" aria-label="{escape(titolo)}">',
           f'<rect width="{W}" height="{altezza}" fill="{sfondo}"/>',
           f'<rect width="{W}" height="40" fill="{barra}"/>',
           t(16, 25, sist, 14, testo_barra, "bold"),
           t(W - 16, 25, "ricostruzione didattica · non è una schermata originale", 11, "#D8E1EA", anchor="end"),
           f'<rect y="40" width="{W}" height="30" fill="#FFFFFF" stroke="#E5E8EB"/>',
           t(16, 60, percorso, 12, "#6A6D70"),
           t(16, 98, titolo, 18, "#32363A", "bold"),
           f'<rect x="16" y="108" width="60" height="3" fill="{accento}"/>']
    svg.append(corpo(accento))
    svg.append(f'<rect y="{altezza - 34}" width="{W}" height="34" fill="#FFFFFF" stroke="#E5E8EB"/>')
    svg.append(t(16, altezza - 13, nota, 12, "#556B82"))
    svg.append("</svg>")
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{nome}.svg").write_text("".join(svg), encoding="utf-8")


def bottone(x, y, testo, accento, w=150):
    return f'<rect x="{x}" y="{y}" width="{w}" height="30" rx="4" fill="{accento}"/>' + t(x + w / 2, y + 20, testo, 13, "#FFFFFF", "bold", "middle")


def esito(x, y, testo):
    return f'<rect x="{x}" y="{y}" width="{W - 2 * x}" height="30" rx="3" fill="#F1FDF6" stroke="#36A41D"/>' + t(x + 10, y + 20, "✔ " + testo, 12.5, "#256F3A")


# ─────────────────────────── SAP ───────────────────────────
def sap_migo():
    def c(acc):
        s = campo(16, 135, "Operazione", "A01 Entrata merci", 200) + campo(232, 135, "Riferimento", "R01 Ordine d'acquisto", 200)
        s += campo(448, 135, "Ordine d'acquisto", "4500000001", 200) + campo(664, 135, "Tipo movimento", "101", 100, True)
        s += campo(16, 190, "Materiale", "FERRO tubolare", 200) + campo(232, 190, "Quantità", "3.000 KG", 200, True)
        s += campo(448, 190, "Divisione / magazzino", "1000 / 0001", 200) + campo(664, 190, "Lotto", "COL-1204", 200)
        s += t(16, 262, "Documento contabile generato (FI)", 13, acc, "bold")
        tab, _ = tabella(16, 272, ["Conto", "Descrizione", "Dare", "Avere"],
                         [["12", "Magazzino ferro (a costo standard 0,95)", "2.850,00", ""],
                          ["63", "Differenze prezzo materiali", "150,00", ""],
                          ["22", "Fatture da ricevere (WE/RE)", "", "3.000,00"]], [80, 470, 157, 161], acc, num=(2, 3))
        return s + tab + bottone(W - 166, 392, "Registra", acc)
    schermata("sap_migo", "sap", "Logistica › Gestione materiali › Movimenti merci › MIGO", "Entrata merci per ordine d'acquisto", c, 470,
              "Il magazzino sale subito a valore; il debito «ponte» 22 si chiuderà con la fattura (MIRO).")


def sap_miro():
    def c(acc):
        s = campo(16, 135, "Data fattura", "05.12.2026", 200) + campo(232, 135, "Riferimento", "FR-2026-871", 200)
        s += campo(448, 135, "Importo lordo", "3.660,00 EUR", 200, True) + campo(664, 135, "Codice IVA", "22% acquisti", 200)
        s += t(16, 205, "Righe dell'ordine 4500000001", 13, acc, "bold")
        tab, y = tabella(16, 215, ["Pos.", "Materiale", "Quantità", "Importo"], [["10", "FERRO tubolare", "3.000 KG", "3.000,00"]], [80, 470, 157, 161], acc, num=(2, 3))
        s += tab + t(16, y + 30, "Simulazione documento", 13, acc, "bold")
        tab2, y2 = tabella(16, y + 40, ["Conto", "Descrizione", "Dare", "Avere"],
                           [["22", "Fatture da ricevere (WE/RE)", "3.000,00", ""], ["14", "IVA a credito", "660,00", ""],
                            ["20", "Debiti verso fornitori · Acciaierie Umbre", "", "3.660,00"]], [80, 470, 157, 161], acc, num=(2, 3))
        return s + tab2 + esito(16, y2 + 14, "Saldo 0,00: la fattura chiude l'entrata merci, il costo non si registra due volte.")
    schermata("sap_miro", "sap", "Logistica › Verifica fatture › MIRO", "Registra fattura fornitore", c, 520,
              "La MIRO chiude il conto 22 aperto dalla MIGO e aggiunge IVA e debito verso il fornitore.")


def sap_fbs1():
    def c(acc):
        s = campo(16, 135, "Data registrazione", "31.12.2026", 200) + campo(232, 135, "Tipo documento", "SA Rateo/risconto", 200)
        s += campo(448, 135, "Motivo storno", "01", 200, True) + campo(664, 135, "Data storno", "01.01.2027", 200, True)
        s += t(16, 205, "Righe", 13, acc, "bold")
        tab, y = tabella(16, 215, ["Conto", "Descrizione", "Dare", "Avere"],
                         [["86", "Fitti passivi (31 giorni di dicembre)", "1.033,33", ""], ["39", "Ratei passivi", "", "1.033,33"]],
                         [80, 470, 157, 161], acc, num=(2, 3))
        return s + tab + esito(16, y + 14, "Al 1° gennaio l'elaborazione F.81 crea lo storno: Ratei passivi in Dare, Fitti passivi in Avere.")
    schermata("sap_fbs1", "sap", "Contabilità generale › Chiusura › Rettifiche › FBS1", "Rateo con storno automatico", c, 380,
              "Il rateo vale al 31/12 e si storna da solo il giorno dopo: al pagamento del fitto si registra tutto il costo.")


def sap_inventario():
    def c(acc):
        s = campo(16, 135, "Documento d'inventario", "100000001", 200) + campo(232, 135, "Data di conteggio", "31.12.2026", 200)
        s += campo(448, 135, "Magazzino", "1000 / 0001", 200) + campo(664, 135, "Movimento differenze", "711", 100, True)
        tab, y = tabella(16, 200, ["Materiale", "A sistema", "Contato", "Differenza", "Valore"],
                         [["SL-TAGLIO kit", "20 PZ", "19 PZ", "-1 PZ", "-14,60"], ["FERRO tubolare", "740 KG", "740 KG", "0", "0,00"]],
                         [260, 150, 150, 150, 158], acc, num=(1, 2, 3, 4))
        s += tab + t(16, y + 30, "Documento contabile della differenza (MI07)", 13, acc, "bold")
        tab2, y2 = tabella(16, y + 40, ["Conto", "Descrizione", "Dare", "Avere"],
                           [["65", "Differenze inventariali", "14,60", ""], ["07", "Magazzino semilavorati", "", "14,60"]], [80, 470, 157, 161], acc, num=(2, 3))
        return s + tab2
    schermata("sap_inventario", "sap", "Logistica › Inventario fisico › MI01 · MI04 · MI07", "Inventario di fine anno e differenze", c, 470,
              "Nel metodo permanente la conta corregge i conti di magazzino; nel metodo italiano la conta dà il valore delle rimanenze finali.")


def sap_chiusura():
    def c(acc):
        s = campo(16, 135, "Società", "1000 Ferro & Transenne", 200) + campo(232, 135, "Esercizio da chiudere", "2026", 200)
        s += campo(448, 135, "Conto bilancio di chiusura", "91", 200, True) + campo(664, 135, "Conto bilancio di apertura", "92", 200, True)
        s += campo(16, 190, "1ª esecuzione", "Conti economici → utile (90 → 32)", 416) + campo(448, 190, "2ª esecuzione", "Conti patrimoniali: chiusura 31.12 e apertura 01.01", 416)
        tab, y = tabella(16, 260, ["Data", "Conto", "Descrizione", "Dare", "Avere"],
                         [["31.12.2026", "12", "Magazzino ferro → 91", "", "703,00"], ["31.12.2026", "07", "Magazzino semilavorati → 91", "", "277,40"],
                          ["01.01.2027", "12", "Magazzino ferro ← 92", "703,00", ""], ["01.01.2027", "07", "Magazzino semilavorati ← 92", "277,40", ""]],
                         [120, 70, 380, 149, 149], acc, num=(3, 4))
        return s + tab + bottone(W - 166, y + 14, "Esegui", acc)
    schermata("sap_chiusura", "sap", "Contabilità generale › Chiusura › FAGL_IT_01 Registrazioni di chiusura e apertura (Italia)", "Chiusura e riapertura dei conti", c, 470,
              "Prima i conti economici nell'utile, poi chiusura e riapertura dei patrimoniali (estratto: righe del magazzino).")


# ─────────────────────────── BUSINESS CENTRAL ───────────────────────────
def bc_fattura():
    def c(acc):
        s = campo(16, 135, "Fornitore", "F001 Acciaierie Umbre Spa", 270) + campo(302, 135, "Data registrazione", "05/12/2026", 180)
        s += campo(498, 135, "N. fattura fornitore", "FR-2026-871", 180, True) + campo(694, 135, "Codice IVA", "22", 120)
        s += t(16, 205, "Righe", 13, acc, "bold")
        tab, y = tabella(16, 215, ["Tipo", "N.", "Descrizione", "Quantità", "Costo unit.", "Importo"],
                         [["Articolo", "FERRO", "Ferro tubolare", "3.000 KG", "1,00", "3.000,00"]], [110, 100, 290, 120, 120, 128], acc, num=(3, 4, 5))
        s += tab
        s += t(W - 24, y + 30, "Imponibile 3.000,00   IVA 660,00   Totale 3.660,00", 13, "#32363A", "bold", "end")
        return s + bottone(16, y + 50, "Registra", acc, 130) + bottone(156, y + 50, "Anteprima registrazione", "#5E6A70", 210)
    schermata("bc_fattura_acquisto", "bc", "Acquisti › Fatture acquisto › Nuova", "Fattura acquisto", c, 380,
              "Riga di tipo «Articolo»: alla registrazione si muovono contabilità generale e magazzino insieme.")


def bc_movimenti():
    def c(acc):
        tab, y = tabella(16, 130, ["Data reg.", "N. conto", "Descrizione", "Dare", "Avere"],
                         [["05/12/2026", "Acquisti materie prime", "Fattura FR-2026-871", "3.000,00", ""],
                          ["05/12/2026", "IVA ns/credito", "Fattura FR-2026-871", "660,00", ""],
                          ["05/12/2026", "Debiti v/fornitori", "Fattura FR-2026-871", "", "3.660,00"],
                          ["05/12/2026", "Magazzino materie prime", "Costo magazzino in C/G", "3.000,00", ""],
                          ["05/12/2026", "Var. rimanenze mat. prime", "Costo diretto applicato", "", "3.000,00"]],
                         [110, 210, 270, 139, 139], acc, num=(3, 4))
        return tab + esito(16, y + 14, "Conto economico: acquisti 3.000 − variazione rimanenze 3.000 = 0 finché il ferro è in magazzino.")
    schermata("bc_movimenti_cg", "bc", "Contabilità › Movimenti C/G (filtro: documento FR-2026-871)", "Movimenti C/G della fattura", c, 340,
              "Con il piano dei conti italiano il magazzino entra in contabilità con contropartita la variazione delle rimanenze.")


def bc_differimento():
    def c(acc):
        s = campo(16, 135, "Codice modello", "RISC-POLIZZA", 200) + campo(232, 135, "Conto differimento", "Risconti attivi", 200, True)
        s += campo(448, 135, "Metodo di calcolo", "Giorni per periodo", 200) + campo(664, 135, "N. di periodi", "12", 100)
        tab, y = tabella(16, 200, ["Periodo", "Data registrazione", "Importo a costo"],
                         [["1", "31/12/2026", "101,92"], ["2", "31/01/2027", "101,92"], ["…", "…", "…"], ["12", "30/11/2027", "…"]],
                         [120, 300, 448], acc, num=(2,))
        return s + tab + esito(16, y + 14, "Al 31/12/2026 nei Risconti attivi restano 1.098,08: nessuna scrittura di fine anno, nessuno storno.")
    schermata("bc_differimento", "bc", "Contabilità › Setup › Modelli di differimento · fattura POL-2026-118", "Risconto con modello di differimento", c, 400,
              "La polizza va subito a Risconti attivi e ogni mese passa a costo la quota di competenza.")


def bc_periodiche():
    def c(acc):
        tab, y = tabella(16, 130, ["Metodo ricorrente", "Data reg.", "N. conto", "Importo", "Contropartita"],
                         [["RF Storno fisso", "31/12/2026", "Fitti passivi", "1.033,33", "Ratei passivi"],
                          ["RF Storno fisso", "31/12/2026", "Interessi passivi su mutui", "54,19", "Ratei passivi"]],
                         [170, 120, 250, 130, 198], acc, num=(3,))
        return tab + esito(16, y + 14, "Registrando, il programma crea anche lo storno con data 01/01/2027.") + bottone(W - 146, y + 56, "Registra", acc, 130)
    schermata("bc_registrazioni_periodiche", "bc", "Contabilità › Registrazioni periodiche", "Ratei con storno automatico", c, 330,
              "Metodo «Storno fisso»: al 1° gennaio i ratei si chiudono da soli e la fattura successiva va tutta a costo.")


def bc_chiusura():
    def c(acc):
        s = t(16, 140, "Chiusura conto economico", 14, acc, "bold")
        s += campo(16, 155, "Data fine esercizio", "31/12/2026", 200) + campo(16, 210, "Conto utile netto", "Utile dell'esercizio", 200, True)
        s += campo(16, 265, "Conto perdita netta", "Perdita dell'esercizio", 200) + campo(232, 155, "Descrizione registrazione", "Chiusura conto economico", 200)
        s += f'<line x1="458" y1="130" x2="458" y2="410" stroke="#D5DADD"/>'
        s += t(474, 140, "Chiusura/apertura stato patrimoniale (Italia)", 14, acc, "bold")
        s += campo(474, 155, "Data fine esercizio", "31/12/2026", 200) + campo(474, 210, "Conto di chiusura", "Stato patrimoniale di chiusura", 410, True)
        s += campo(474, 265, "Conto di apertura", "Stato patrimoniale di apertura", 410, True) + campo(474, 320, "Prima: magazzino aggiornato", "Rettifica costo · Registra costo in C/G", 410)
        return s + bottone(16, 385, "OK", acc, 100) + bottone(474, 385, "OK", acc, 100)
    schermata("bc_chiusura", "bc", "Contabilità › Fine esercizio › Chiusura conto economico · Chiusura/apertura stato patrimoniale", "Chiusura e riapertura di fine anno", c, 470,
              "Prima i conti economici nell'utile, poi i patrimoniali nel conto di chiusura e riapertura dal conto di apertura.")


# ─────────────────────────── AD HOC REVOLUTION ───────────────────────────
def _quadra(y, acc, testo="Totale Dare = Totale Avere: la registrazione è in quadratura"):
    return esito(16, y, testo) + bottone(W - 196, y + 40, "F10 — Registra", acc, 180)


def ahr_fattura():
    def c(acc):
        s = campo(16, 135, "Data reg.", "05/12/2026", 150) + campo(182, 135, "Causale contabile (F3 zoom)", "FA — Fattura acquisti", 260, True)
        s += campo(458, 135, "N. doc / protocollo", "FR-2026-871 / 12", 200) + campo(674, 135, "Fornitore", "Acciaierie Umbre Spa", 210)
        s += t(16, 205, "Righe contabili — partita doppia", 13, acc, "bold")
        tab, y = tabella(16, 215, ["Rigo", "Conto (PDC)", "Descrizione sottoconto", "Dare (€)", "Avere (€)"],
                         [["10", "601001", "Materie prime c/acquisti", "3.000,00", ""], ["20", "260100", "IVA su acquisti 22%", "660,00", ""],
                          ["30", "400101", "Debiti v/fornitori · Acciaierie Umbre", "", "3.660,00"]], [60, 130, 400, 139, 139], acc, num=(3, 4))
        return s + tab + _quadra(y + 14, acc)
    schermata("ahr_primanota_fa", "ahr", "GESCON · Prima Nota Contabile", "Fattura d'acquisto in Prima Nota", c, 460,
              "La causale FA propone i conti: costo d'acquisto, IVA e fornitore. Il magazzino non entra in contabilità generale.")


def ahr_inventario():
    def c(acc):
        s = campo(16, 135, "Data valutazione", "31/12/2026", 200) + campo(232, 135, "Metodo valorizzazione", "Costo medio ponderato", 260, True)
        s += campo(508, 135, "Magazzino", "Principale", 200)
        tab, y = tabella(16, 200, ["Codice", "Descrizione", "Giacenza", "Costo (€)", "Valore (€)"],
                         [["FERRO", "Ferro tubolare (materia prima)", "740 kg", "1,0121", "748,97"], ["SL-TAGLIO", "Kit tagliato (semilavorato)", "19 pz", "14,60", "277,40"],
                          ["TR-STD", "Transenna standard (prodotto finito)", "0 pz", "31,40", "0,00"], ["", "Totale rimanenze finali", "", "", "1.026,37"]],
                         [130, 340, 130, 130, 138], acc, num=(2, 3, 4))
        return s + tab + t(16, y + 30, "Ferro: (2.800 kg × 1,00 + 500 kg × 1,08) ÷ 3.300 kg = 1,0121 €/kg · semilavorato al costo di produzione", 12, acc, "bold") + bottone(W - 196, y + 44, "Stampa inventario", acc, 180)
    schermata("ahr_inventario", "ahr", "GESINV · Stampa Inventario Valorizzato", "Inventario valorizzato al 31 dicembre", c, 470,
              "Dal valore dell'inventario si registrano in Prima Nota le rimanenze finali (metodo italiano).")


def ahr_rimanenze():
    def c(acc):
        s = campo(16, 135, "Data reg.", "31/12/2026", 150) + campo(182, 135, "Causale contabile", "Assestamento — rimanenze finali", 300, True)
        s += campo(498, 135, "Note", "Da inventario valorizzato al 31/12", 386)
        tab, y = tabella(16, 205, ["Rigo", "Conto", "Descrizione", "Dare (€)", "Avere (€)"],
                         [["10", "Rim. MP", "Rimanenze materie prime", "748,97", ""], ["20", "Rim. SL", "Rimanenze semilavorati", "277,40", ""],
                          ["30", "Var. MP", "Variazione rimanenze materie prime", "", "748,97"], ["40", "Var. SL", "Variazione rimanenze semilavorati", "", "277,40"]],
                         [60, 130, 400, 139, 139], acc, num=(3, 4))
        return s + tab + _quadra(y + 14, acc, "Al 1° gennaio, dopo la riapertura, la scrittura opposta riporta le rimanenze iniziali a costo.")
    schermata("ahr_rimanenze", "ahr", "GESCON · Prima Nota Contabile", "Rimanenze finali in Prima Nota", c, 470,
              "Codici dei conti indicativi: dipendono dal piano dei conti dell'azienda.")


def ahr_risconto():
    def c(acc):
        s = campo(16, 135, "Data reg.", "31/12/2026", 150) + campo(182, 135, "Causale contabile", "Assestamento — risconti", 260, True)
        s += campo(458, 135, "Competenza", "01/12/2026 – 30/11/2027", 220) + campo(694, 135, "Giorni nel 2027", "334 su 365", 190)
        tab, y = tabella(16, 205, ["Rigo", "Conto", "Descrizione", "Dare (€)", "Avere (€)"],
                         [["10", "Risc. att.", "Risconti attivi", "1.098,08", ""], ["20", "Assic.", "Premi di assicurazione", "", "1.098,08"]],
                         [60, 130, 400, 139, 139], acc, num=(3, 4))
        return s + tab + _quadra(y + 14, acc, "Al 1° gennaio, dopo la riapertura, il risconto torna a costo con la scrittura opposta.")
    schermata("ahr_risconto", "ahr", "GESCON · Prima Nota Contabile", "Risconto attivo di fine anno", c, 420,
              "Le scritture di assestamento si registrano in Prima Nota con una causale dedicata.")


def ahr_chiusura():
    def c(acc):
        s = campo(16, 135, "Esercizio da chiudere", "2026", 150) + campo(182, 135, "Data chiusura", "31/12/2026", 150) + campo(348, 135, "Data apertura", "01/01/2027", 150)
        s += campo(16, 190, "Conto profitti e perdite", "Conto economico", 260, True) + campo(292, 190, "Bilancio di chiusura", "Stato patrimoniale finale", 280, True)
        s += campo(588, 190, "Bilancio di apertura", "Stato patrimoniale iniziale", 296, True)
        tab, y = tabella(16, 260, ["Fase", "Che cosa genera"],
                         [["1 · Epilogo", "Costi e ricavi (comprese le variazioni delle rimanenze) → Conto economico; utile o perdita"],
                          ["2 · Chiusura", "Attività, passività e patrimonio netto → Stato patrimoniale finale"],
                          ["3 · Apertura", "Gli stessi conti riaperti dallo Stato patrimoniale iniziale al 01/01/2027"]], [160, 708], acc)
        return s + tab + bottone(W - 196, y + 14, "F10 — Elabora", acc, 180)
    schermata("ahr_chiusura", "ahr", "Contabilità generale · Chiusura/apertura conti", "Chiusura e apertura dei conti", c, 420,
              "Prima di elaborare: rimanenze, ratei, risconti, ammortamenti e imposte già registrati in Prima Nota.")


if __name__ == "__main__":
    for f in (sap_migo, sap_miro, sap_fbs1, sap_inventario, sap_chiusura, bc_fattura, bc_movimenti, bc_differimento, bc_periodiche, bc_chiusura,
              ahr_fattura, ahr_inventario, ahr_rimanenze, ahr_risconto, ahr_chiusura):
        f()
    print("\n".join(sorted(p.name for p in OUT.glob("*.svg"))))
