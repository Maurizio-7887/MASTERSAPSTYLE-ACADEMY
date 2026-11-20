"""
seed.py — Popola il database con i dati minimi per partire subito.

Uso:
    flask --app app seed

Crea:
  - Piano dei Conti essenziale (patrimoniali + economici, con cost_relevant
    impostato correttamente sui conti di costo/ricavo)
  - Due utenti: Angelo (operatore) e Maurizio (commercialista)
  - Un paio di fornitori/clienti e un centro di costo, per poter provare
    subito Fattura fornitore/Fattura cliente/Prima nota senza dover compilare tutto da zero
"""
from decimal import Decimal
from extensions import db
from models import (
    Account, User, EconomicSubject, CostCenter, Company,
    DocumentSequence, FiscalParameter, PayrollAccountConfig,
    PaymentTerm, PaymentTermInstallment,
)


ACCOUNTS = [
    # code,     name,                                   type,                    cost_relevant, co_type
    ("150000", "Magazzino Materie Prime e Merci",        "patrimoniale_attivo",   False, None),
    ("152000", "Magazzino Blocco Qualità",                "patrimoniale_attivo",   False, None),
    ("155000", "Magazzino Semilavorati",                  "patrimoniale_attivo",   False, None),
    ("160000", "Magazzino Prodotti Finiti",                "patrimoniale_attivo",   False, None),
    ("140000", "Crediti v/Clienti (AR)",                   "patrimoniale_attivo",   False, None),
    ("141000", "Fatture da Emettere",                       "patrimoniale_attivo",   False, None),
    ("154000", "IVA a Credito",                             "patrimoniale_attivo",   False, None),
    ("180000", "Banca c/c",                                 "patrimoniale_attivo",   False, None),
    ("200000", "Cespiti — Impianti e Macchinari",           "patrimoniale_attivo",   False, None),
    ("210000", "Debiti v/Fornitori (AP)",                   "patrimoniale_passivo",  False, None),
    ("170000", "IVA a Debito",                              "patrimoniale_passivo",  False, None),
    ("018000", "Fondo Ammortamento",                        "patrimoniale_passivo",  False, None),
    ("590000", "Perdite su Magazzino (Scarti)",              "costo",                 True,  "COST"),
    ("400000", "Costi per Materie Prime e Consumo",          "costo",                 True,  "COST"),
    ("520000", "Ammortamenti",                               "costo",                 True,  "COST"),
    ("620000", "Costi di Manutenzione",                      "costo",                 True,  "COST"),
    ("640000", "Costi di Trasporto",                          "costo",                 True,  "COST"),
    # Conto ricavi vendita beni (Carpenteria + Commercializzati — sono
    # comunque vendita di prodotti, non prestazioni). Servizi (Saldatura
    # Conto Terzi, Gestione Cantieri) vanno invece sul 4010 qui sotto —
    # distinzione richiesta dal bilancio civilistico (voce A1 vs A1bis del
    # Conto Economico). La profittabilità PER ASA si legge dal Centro di
    # Costo/Ricavo assegnato a ogni articolo (vedi CostCenter più sotto),
    # non da altri conti: aggiungere una nuova ASA non tocca mai il piano
    # dei conti, solo l'anagrafica centri di costo.
    ("4000",   "Ricavi Vendita Prodotti",                     "ricavo",                True,  "REVENUE"),
    ("4010",   "Ricavi Prestazioni di Servizi",                "ricavo",                True,  "REVENUE"),
    ("450000", "Costo del Venduto",                           "costo",                 True,  "COST"),
    ("165000", "Ricevimenti da fatturare (EM/RF)",            "patrimoniale_passivo",  False, None),
    # Acconti da Clienti: passività, NON ricavo. Il ricavo si riconosce solo
    # alla consegna (DDT/PGI), non quando arriva l'acconto — è denaro
    # ricevuto in anticipo di una prestazione non ancora eseguita.
    ("166000", "Acconti da Clienti",                          "patrimoniale_passivo",  False, None),
    ("430000", "Variazione Rimanenze Prodotti Finiti",         "ricavo",                True,  "REVENUE"),
    ("460000", "Varianza Prezzo Materiali",                    "costo",                 True,  "COST"),
    ("461000", "Varianza Materiali (Produzione)",               "costo",                 True,  "COST"),
    ("462000", "Varianza Manodopera (Produzione)",              "costo",                 True,  "COST"),
    ("463000", "Varianza Overhead (Produzione)",                "costo",                 True,  "COST"),
    # I 4 conti seguenti esistevano già nel DB (inseriti dalla migrazione
    # 6g7h8i9j0k1l_commesse_wip_rfq.py con INSERT diretto, non da questo
    # seed) — li esplicito anche qui perché seed.py resti la fonte di
    # verità COMPLETA del piano dei conti: sono quelli che reggono il ciclo
    # MIGO (Entrata Merci)/MIRO (Verifica Fattura) e il costo standard con
    # varianze di produzione (vedi blueprints/mm, blueprints/operations).
    ("157000", "Produzione in Corso (WIP)",                     "patrimoniale_attivo",  False, None),
    ("464000", "Varianza di Produzione",                         "costo",                True,  "COST"),
    ("472000", "Manodopera Diretta Assorbita",                   "ricavo",                True,  "REVENUE"),
    ("473000", "Overhead Industriali Assorbiti",                 "ricavo",                True,  "REVENUE"),

    # ── Estensione piano dei conti "standard IRON APPALTI" ──────────
    # Aggiunta a supporto di: 1) Prima Nota manuale/AI per i documenti
    # che NON passano da un ciclo automatico (utenze, notule, rimborsi,
    # assestamenti di fine anno); 2) modulo Paghe (vedi PayrollAccountConfig
    # più sotto, obbligatorio perché il modulo Paghe funzioni).
    ("100000", "Cassa Contanti",                              "patrimoniale_attivo",   False, None),
    ("190000", "Crediti v/Erario c/IVA (credito da riportare)", "patrimoniale_attivo", False, None),
    ("191000", "Risconti Attivi",                              "patrimoniale_attivo",   False, None),
    ("192000", "Fatture da Emettere",                          "patrimoniale_attivo",   False, None),

    ("220000", "Debiti v/Professionisti",                      "patrimoniale_passivo",  False, None),
    ("221000", "Debiti v/Erario c/Ritenute su Compensi Professionali", "patrimoniale_passivo", False, None),
    ("222000", "Debiti v/Dipendenti c/Retribuzioni",           "patrimoniale_passivo",  False, None),
    ("223000", "Debiti v/INPS",                                "patrimoniale_passivo",  False, None),
    ("224000", "Debiti Tributari — Ritenute Lavoro Dipendente", "patrimoniale_passivo", False, None),
    ("225000", "Debiti Tributari per Imposte dell'Esercizio (IRES/IRAP)", "patrimoniale_passivo", False, None),
    ("226000", "TFR — Fondo Trattamento di Fine Rapporto",     "patrimoniale_passivo",  False, None),
    ("227000", "Ratei Passivi",                                "patrimoniale_passivo",  False, None),
    ("228000", "Fatture da Ricevere",                          "patrimoniale_passivo",  False, None),
    ("229000", "Fondo Svalutazione Crediti",                   "patrimoniale_passivo",  False, None),

    ("300000", "Capitale Sociale",                             "patrimoniale_passivo",  False, None),
    ("301000", "Riserva Legale",                               "patrimoniale_passivo",  False, None),
    ("302000", "Utili Portati a Nuovo",                        "patrimoniale_passivo",  False, None),
    ("303000", "Utile d'Esercizio",                             "patrimoniale_passivo",  False, None),
    ("304000", "Perdita d'Esercizio",                           "patrimoniale_attivo",   False, None),
    # Fase 2 FI: liquidazione IVA, ratei e risconti, chiusura e riapertura
    ("193000", "Ratei Attivi",                                 "patrimoniale_attivo",   False, None),
    ("230000", "Debiti v/Erario c/IVA (liquidazione)",         "patrimoniale_passivo",  False, None),
    ("231000", "Risconti Passivi",                             "patrimoniale_passivo",  False, None),
    ("998000", "Conto Economico (epilogo di fine esercizio)",  "patrimoniale_passivo",  False, None),
    ("999000", "Stato Patrimoniale Finale (chiusura)",         "patrimoniale_passivo",  False, None),
    ("999100", "Stato Patrimoniale Iniziale (riapertura)",     "patrimoniale_passivo",  False, None),

    ("610000", "Costi per Lavorazioni e Subappalti",            "costo",                 True,  "COST"),
    ("645000", "Costi Telefonici e Trasmissione Dati",           "costo",                 True,  "COST"),
    ("646000", "Costi per Energia Elettrica",                    "costo",                 True,  "COST"),
    ("647000", "Premi Assicurativi",                             "costo",                 True,  "COST"),
    ("648000", "Interessi Passivi Bancari",                      "costo",                 True,  "COST"),
    ("650000", "Compensi a Professionisti",                      "costo",                 True,  "COST"),
    ("651000", "Rimborsi Spese a Dipendenti e Collaboratori",     "costo",                 True,  "COST"),
    ("652000", "Abbuoni Attivi Concessi a Clienti (Fase 3, pagamenti parziali)", "costo",   True,  "COST"),
    ("452000", "Abbuoni Passivi Ottenuti da Fornitori (Fase 3, pagamenti parziali)", "ricavo", True, "REVENUE"),
    ("660000", "Salari e Stipendi",                               "costo",                 True,  "COST"),
    ("661000", "Oneri Sociali (INPS/INAIL a carico azienda)",     "costo",                 True,  "COST"),
    ("662000", "Accantonamento TFR",                             "costo",                 True,  "COST"),
    ("663000", "Svalutazione Crediti",                           "costo",                 True,  "COST"),
    ("664000", "Imposte sul Reddito d'Esercizio (IRES/IRAP)",     "costo",                 True,  "COST"),

    # ── Estensione: conti degli Schemi 1-13 (Prima Nota libera / Sezione 13
    # Rettifiche) — services/classificazione_operazioni.py e
    # services/rettifiche_operazioni.py referenziano questi codici, presi dal
    # piano dei conti REALE del commercialista (~795 conti), mai importato
    # finora in questo seed. Tipo e nome erano stati DEDOTTI automaticamente
    # dal nome e dal verso (Dare/Avere) usati negli schemi. Il 20/11/2026 la
    # natura è stata ricontrollata conto per conto: 29 conti erano sbagliati
    # (ratei e risconti, IVA vendite, fondi, rimanenze, interessi,
    # plusvalenze) e sono stati corretti qui e, per i database esistenti,
    # dalla migrazione s6t7u8v9w0x1.
    ("013203",   "Costi per migliorie beni di terzi",       "patrimoniale_attivo",    False, None),
    ("014003",   "Macchinari specifici",                    "patrimoniale_attivo",    False, None),
    ("014303",   "F.do amm. macchinari specifici",          "patrimoniale_passivo",   False, None),
    ("014401",   "F.do sval. impianti generici (o coppia coerente col bene)","patrimoniale_passivo",   False, None),
    ("015700",   "Crediti v/controllate entro es.",         "patrimoniale_attivo",    False, None),
    ("015750",   "Crediti v/controllate oltre es.",         "patrimoniale_attivo",    False, None),
    ("016301",   "Depositi cauz. a fornitori",              "patrimoniale_attivo",    False, None),
    ("017001",   "Rim. materie prime (finali, per categoria)","patrimoniale_attivo",    False, None),
    ("017301",   "Rim. lavori in corso su ordin.",          "patrimoniale_attivo",    False, None),
    ("017401",   "Rim. merci per la vendita (o categoria verificata)","patrimoniale_attivo",    False, None),
    ("030001",   "F.do sval.cred.v/clienti/breve",          "patrimoniale_passivo",   False, None),
    ("030354",   "Cred. erario c/iva da compens. (saldo, se iva a credito)","patrimoniale_attivo",    False, None),
    ("030393",   "Ires da compensare (o il credito usato: 030364 inps, 030354 iva...)","patrimoniale_attivo",    False, None),
    ("030552",   "Forn. nota accr. da ricevere",            "patrimoniale_attivo",    False, None),
    ("030553",   "Crediti commerciali diversi (solo se è il credito in valuta specifico)","patrimoniale_attivo",    False, None),
    ("032003",   "Intesa San Paolo c/c",                    "patrimoniale_attivo",    False, None),
    ("032004",   "PayPal",                                  "patrimoniale_attivo",    False, None),
    ("032601",   "Cassa Contanti (Iron Appalti)",           "patrimoniale_attivo",    False, None),
    ("032701",   "Ratei attivi",                            "patrimoniale_attivo",    False, None),
    ("032801",   "Risconti attivi",                         "patrimoniale_attivo",    False, None),
    ("032802",   "Canoni anticipati leasing",               "patrimoniale_attivo",    False, None),
    ("032804",   "Clienti c/fatture da emettere",           "patrimoniale_attivo",    False, None),
    ("033301",   "Riserva legale (o 033501 riserva straordinaria)","patrimoniale_passivo",   False, None),
    ("033502",   "Versam.in conto aumen.capitale (o 033503 copertura perdite)","patrimoniale_passivo",   False, None),
    ("033621",   "Utili esercizi precedenti",               "patrimoniale_passivo",   False, None),
    ("033651",   "Utile d'esercizio",                       "patrimoniale_passivo",   False, None),
    ("034102",   "F.do imposte differite",                  "patrimoniale_passivo",   False, None),
    ("034205",   "F.do controversie legali (utilizzo)",     "patrimoniale_passivo",   False, None),
    ("034301",   "F.do tratt.fine rapp. tfr",               "patrimoniale_passivo",   False, None),
    ("044001",   "Fatture da ricevere a breve",             "patrimoniale_passivo",   False, None),
    ("044202",   "Effetti Passivi",                         "patrimoniale_passivo",   False, None),
    ("044401",   "Debiti a breve v/controllate",            "patrimoniale_passivo",   False, None),
    ("044430",   "Debiti a lungo v/controllate",            "patrimoniale_passivo",   False, None),
    ("044604",   "Debito iva da versare (saldo, se iva a debito)","patrimoniale_passivo",   False, None),
    ("044610",   "Debito irap a saldo",                     "patrimoniale_passivo",   False, None),
    ("044614",   "Debito ires a saldo",                     "patrimoniale_passivo",   False, None),
    ("044692",   "Debiti v/INPS c/contributi",              "patrimoniale_passivo",   False, None),
    ("044902",   "Debiti v/inail",                          "patrimoniale_passivo",   False, None),
    ("044915",   "Debiti v/Cassa Edile",                    "patrimoniale_passivo",   False, None),
    ("044960",   "Debiti v/Fondo TFR Alleanza Previdenza",  "patrimoniale_passivo",   False, None),
    ("045001",   "Debiti v/Erario c/IVA",                   "patrimoniale_passivo",   False, None),
    ("045005",   "Iva acquisti",                            "patrimoniale_attivo",     False, None),
    ("045006",   "Iva vendite",                             "patrimoniale_passivo",   False, None),
    ("045202",   "Clienti nota accr. da emettere (totale)", "patrimoniale_passivo",   False, None),
    ("045501",   "Ratei passivi",                           "patrimoniale_passivo",   False, None),
    ("045551",   "Risconti passivi",                        "patrimoniale_passivo",   False, None),
    ("050501",   "Rim.fin.in corso su ordinaz.",            "ricavo",                 True, "REVENUE"),
    ("050702",   "Affitti attivi",                          "ricavo",                 True, "REVENUE"),
    ("051609",   "Resi su vendite (o 057039 sconti su vendite, per sconti)","ricavo",                 True, "REVENUE"),
    ("051802",   "Prestazioni di servizi",                  "ricavo",                 True, "REVENUE"),
    ("054002",   "Merci c/acquisti (imponibile)",           "costo",                  True, "COST"),
    ("054607",   "Multe e Sanzioni (indeducibile)",         "costo",                  True, "COST"),
    ("055007",   "Manut.e rip. su beni di prop.",           "costo",                  True, "COST"),
    ("055305",   "Costo di competenza documentato",         "costo",                  True, "COST"),
    ("055307",   "Altre utenze (o il conto errato effettivamente usato)","costo",                  True, "COST"),
    ("056002",   "Affitti passivi (o costo pluriperiodale coerente)","costo",                  True, "COST"),
    ("056003",   "Canoni leasing iva deducibile",           "costo",                  True, "COST"),
    ("056201",   "Contributi inps (costi - oneri sociali)", "costo",                  True, "COST"),
    ("056202",   "Oneri per contributi inail",              "costo",                  True, "COST"),
    ("056242",   "Accant. tfr dell'anno",                   "costo",                  True, "COST"),
    ("056550",   "Svalutaz. beni ammortizzabili",           "costo",                  True, "COST"),
    ("056602",   "Altre svalutazioni",                      "costo",                  True, "COST"),
    ("056801",   "Rim. fin. materie prime",                 "costo",                  True, "COST"),
    ("057019",   "Imposte di Bollo",                        "costo",                  True, "COST"),
    ("057036",   "Iva indetr. pro-rata (o il costo originario pertinente)","costo",                  True, "COST"),
    ("065401",   "Arrotondamenti attivi",                   "ricavo",                 True, "REVENUE"),
    ("065404",   "Interessi attivi c/c bancari",            "ricavo",                 True, "REVENUE"),
    ("070005",   "Interessi passivi c/c bancari",           "costo",                  True, "COST"),
    ("070009",   "Arrotondamenti passivi",                  "costo",                  True, "COST"),
    ("070010",   "Perdite su cambi (se perdita)",           "costo",                  True, "COST"),
    ("070018",   "Commissioni e Oneri Bancari",             "costo",                  True, "COST"),
    ("070500",   "Interessi Passivi su Pagamenti Rateali",  "costo",                  True, "COST"),
    ("072551",   "Rival.crediti attivo circol.",            "ricavo",                 True, "REVENUE"),
    ("075000",   "Plusv. da alien. immobilizz. (se plusvalenza)","ricavo",                 True, "REVENUE"),
    ("080000",   "Minusval.alienazione immobil. (se minusvalenza)","costo",                  True, "COST"),
    ("090005",   "Ires dell'esercizio",                     "costo",                  True, "COST"),
    ("090006",   "Irap dell'esercizio",                     "costo",                  True, "COST"),
]


def run_seed():
    # ── Piano dei Conti ──────────────────────────────────────────
    for code, name, acc_type, co_rel, co_type in ACCOUNTS:
        if not Account.query.filter_by(code=code).first():
            db.session.add(Account(
                code=code, name=name, account_type=acc_type,
                cost_relevant=co_rel, cost_relevant_type=co_type,
            ))

    # ── Numerazione documenti ────────────────────────────────────
    sequences = [
        ("SA", "10"), ("KR", "19"), ("DR", "14"), ("KZ", "15"),
        ("DZ", "16"), ("Cespiti", "20"), ("AF", "21"),
        ("QT", "30"), ("OR", "31"), ("DL", "32"), ("OA", "33"), ("GR", "34"),
        ("RFQ", "35"), ("PG", "22"),
        ("LI", "23"), ("CH", "24"), ("RA", "25"), ("RR", "26"),
    ]
    for doc_type, prefix in sequences:
        if not DocumentSequence.query.filter_by(doc_type=doc_type).first():
            db.session.add(DocumentSequence(doc_type=doc_type, prefix=prefix, current_number=0))

    # ── Utenti demo (DA CAMBIARE prima di un uso reale) ─────────
    # Angelo e Maurizio amministrano (portale Ledger); Maria Grazia lavora
    # sul desk operativo/commerciale (preventivi, ordini, DDT, RFQ) e non
    # vede mai le rotte contabili, nemmeno digitando l'URL a mano.
    if not User.query.filter_by(username="Angelo").first():
        u1 = User(username="Angelo", full_name="Angelo", role="operatore", portal="ledger")
        u1.set_password("Angelo1234")
        db.session.add(u1)

    if not User.query.filter_by(username="Maurizio").first():
        u2 = User(username="Maurizio", full_name="Maurizio", role="commercialista", portal="ledger")
        u2.set_password("Maurizio1234")
        db.session.add(u2)

    if not User.query.filter_by(username="MariaGrazia").first():
        u3 = User(username="MariaGrazia", full_name="Maria Grazia", role="operatore", portal="desk")
        u3.set_password("MariaGrazia1234")
        db.session.add(u3)

    # ── Fornitori / Clienti / Centro di costo demo ──────────────
    if not EconomicSubject.query.filter_by(code="FORN-001").first():
        db.session.add(EconomicSubject(code="FORN-001", name="Acciai Lombardi SpA", piva="02345678901", payment_terms="Netto 30gg", is_supplier=True))
    if not EconomicSubject.query.filter_by(code="CUST-001").first():
        db.session.add(EconomicSubject(
            code="CUST-001", name="Ferrari Meccanica SpA", piva="03456789012", payment_terms="Netto 30gg", is_customer=True,
            # Dati fiscali di esempio, così Fattura cliente → XML FatturaPA
            # funziona subito in demo (CAMBIA con i dati reali del cliente).
            codice_fiscale="03456789012", indirizzo="Via dell'Industria 45", cap="41100",
            comune="Modena", provincia="MO", nazione="IT",
            codice_destinatario="0000000", pec_destinatario="amministrazione@pec.ferrarimeccanica.it",
        ))
    if not CostCenter.query.filter_by(code="CC-AMM-01").first():
        db.session.add(CostCenter(code="CC-AMM-01", name="Amministrazione"))
    if not CostCenter.query.filter_by(code="CC-PROD-01").first():
        db.session.add(CostCenter(code="CC-PROD-01", name="Produzione"))
    if not CostCenter.query.filter_by(code="CC-VEND-01").first():
        db.session.add(CostCenter(code="CC-VEND-01", name="Vendite"))
    if not CostCenter.query.filter_by(code="CC-ACQ-01").first():
        db.session.add(CostCenter(code="CC-ACQ-01", name="Acquisti e Logistica Post-Vendita"))
    if not CostCenter.query.filter_by(code="CC-DIR-01").first():
        db.session.add(CostCenter(code="CC-DIR-01", name="Direzione"))
    # Indiretti di produzione: due persone diverse, non spalmate su un
    # unico centro — una segue solo Falegnameria, l'altra segue insieme
    # Realizzazione Stelle/Saldatura Manuale e Carpenteria.
    if not CostCenter.query.filter_by(code="CC-INDFALE-01").first():
        db.session.add(CostCenter(code="CC-INDFALE-01", name="Indiretto Produzione — Falegnameria"))
    if not CostCenter.query.filter_by(code="CC-INDCARP-01").first():
        db.session.add(CostCenter(code="CC-INDCARP-01", name="Indiretto Produzione — Stelle/Saldatura Manuale/Carpenteria"))
    db.session.flush()

    # ── Centri di Ricavo ASA (linea di business) ────────────────
    # Ognuno porta con sé il conto ricavi giusto (CostCenter.revenue_account_id):
    # Carpenteria/Falegnameria/Commercializzati/Stelle sono vendita di beni
    # (4000), Saldatura/Gestione Cantieri sono prestazioni di servizi
    # (4010). Un articolo classificato con uno di questi
    # (Material.revenue_center_id) eredita conto + centro in automatico in
    # Fatturazione DDT.
    acc_4000 = Account.query.filter_by(code="4000").first()
    acc_4010 = Account.query.filter_by(code="4010").first()
    for code, name, acc in [
        ("CC-CARP-01", "Carpenteria", acc_4000),
        ("CC-FALE-01", "Falegnameria", acc_4000),
        ("CC-COMM-01", "Commercializzati", acc_4000),
        ("CC-STELLE-01", "Realizzazione Stelle e Saldatura Manuale", acc_4000),
        ("CC-SALD-01", "Saldatura Conto Terzi", acc_4010),
        ("CC-CANT-01", "Gestione Cantieri", acc_4010),
    ]:
        cc = CostCenter.query.filter_by(code=code).first()
        if cc is None:
            db.session.add(CostCenter(code=code, name=name, revenue_account_id=acc.id if acc else None))
        elif cc.revenue_account_id is None and acc is not None:
            cc.revenue_account_id = acc.id

    # ── Articoli demo — SENZA questi, Ordini Cliente/Fornitore, DDT ed
    # Entrata Merci hanno il menu articoli vuoto e non si può testare nulla
    # del ciclo attivo/passivo. Codici in linea con MasterLogistic-WMS per
    # il controllo giacenza in DDT (vedi services/logistic_client.py) — se
    # gli SKU reali sono diversi, aggiornali qui prima di un uso reale.
    from models import Material
    MATERIALS_DEMO = [
        # code,        description,                     type,   uom, standard_cost, sales_price, vat_rate
        ("RM-LAM-001", "Lamiera acciaio S235 (materia prima)", "ROH",  "KG", 1.35, 0,     22),
        ("SL-TRAN-01", "Transenna parapedonale (semilavorato)", "HALB", "PZ", 42.00, 0,    22),
        ("FP-CART-01", "Cartello stradale assemblato (prodotto finito)", "FERT", "PZ", 28.50, 65.00, 22),
    ]
    for code, desc, mtype, uom, std_cost, sales_price, vat in MATERIALS_DEMO:
        if not Material.query.filter_by(code=code).first():
            db.session.add(Material(code=code, description=desc, material_type=mtype, uom=uom,
                                    standard_cost=std_cost, sales_price=sales_price, vat_rate=vat,
                                    active=True))

    # ── Piano dei conti CANONICO configurabile (Fase 1, progettazione parti
    # mancanti punto 0) — default che puntano ESATTAMENTE ai codici già in
    # uso oggi in AP/AR/GL/Cespiti. Nessun comportamento cambia con questo
    # seed: cambia solo che ora il codice è centralizzato qui invece che
    # sparso in ogni blueprint. Quando arriverà la mappatura reale approvata
    # dal commercialista, si aggiornano queste righe in un solo posto.
    db.session.flush()  # serve avere gli Account già persistiti per risolvere account_id
    from models import AccountMapping
    ACCOUNT_MAPPING_DEFAULTS = [
        # concept_key,              codice conto attuale, etichetta,                          categoria
        ("banca_principale",        "180000", "Banca c/c",                              "banca"),
        ("iva_credito",             "154000", "IVA a Credito (acquisti)",                "iva"),
        ("iva_debito",              "170000", "IVA a Debito (vendite)",                  "iva"),
        ("crediti_clienti",         "140000", "Crediti v/Clienti (AR)",                  "clienti_fornitori"),
        ("fatture_da_emettere",     "141000", "Fatture da Emettere",                     "clienti_fornitori"),
        ("debiti_fornitori",        "210000", "Debiti v/Fornitori (AP)",                 "clienti_fornitori"),
        ("cespiti_impianti",        "200000", "Cespiti — Impianti e Macchinari",         "cespiti"),
        ("ammortamenti_costo",      "520000", "Ammortamenti (costo)",                    "cespiti"),
        ("fondo_ammortamento",      "018000", "Fondo Ammortamento",                      "cespiti"),
        ("ritenute_professionisti", "221000", "Debiti v/Erario c/Ritenute su Compensi Professionali", "iva"),
        ("abbuoni_attivi",          "652000", "Abbuoni Attivi Concessi a Clienti",       "pagamenti"),
        ("abbuoni_passivi",         "452000", "Abbuoni Passivi Ottenuti da Fornitori",   "pagamenti"),
        ("erario_iva_debito",       "230000", "Erario c/IVA a debito (liquidazione)",    "iva"),
        ("erario_iva_credito",      "190000", "Erario c/IVA a credito (da riportare)",   "iva"),
        ("ratei_attivi",            "193000", "Ratei attivi",                            "chiusura"),
        ("ratei_passivi",           "227000", "Ratei passivi",                           "chiusura"),
        ("risconti_attivi",         "191000", "Risconti attivi",                         "chiusura"),
        ("risconti_passivi",        "231000", "Risconti passivi",                        "chiusura"),
        ("utile_esercizio",         "303000", "Utile d'esercizio",                       "chiusura"),
        ("perdita_esercizio",       "304000", "Perdita d'esercizio",                     "chiusura"),
        ("conto_economico_epilogo", "998000", "Conto economico (epilogo)",               "chiusura"),
        ("stato_patrimoniale_finale", "999000", "Stato patrimoniale finale",             "chiusura"),
        ("stato_patrimoniale_iniziale", "999100", "Stato patrimoniale iniziale",         "chiusura"),
    ]
    for concept_key, code, label, category in ACCOUNT_MAPPING_DEFAULTS:
        if not AccountMapping.query.filter_by(concept_key=concept_key).first():
            acc = Account.query.filter_by(code=code).first()
            if acc:
                db.session.add(AccountMapping(concept_key=concept_key, account_id=acc.id,
                                              label=label, category=category))

    # ── Profilo Cedente/Prestatore per XML FatturaPA — dati di ESEMPIO ──
    # (vedi services/fatturapa.py e dashboard/routes.py). Da correggere
    # in Configurazione Fiscale → "Fatturazione elettronica" con i dati
    # reali dell'azienda prima di un uso reale. Riusiamo le descrizioni
    # ufficiali da dashboard/routes.py per non tenerle duplicate qui.
    from blueprints.dashboard.routes import FISCAL_PARAM_DEFAULTS

    FE_DEMO_VALUES = {
        "fe_denominazione": "IRON APPALTI",
        "fe_piva": "01234567890",
        "fe_codice_fiscale": "01234567890",
        "fe_regime_fiscale": "RF01",
        "fe_indirizzo": "Via delle Officine 1",
        "fe_cap": "20100",
        "fe_comune": "Milano",
        "fe_provincia": "MI",
        "fe_nazione": "IT",
    }
    for key, default_value, desc, category in FISCAL_PARAM_DEFAULTS:
        if category != "fatturazione elettronica":
            continue
        if not FiscalParameter.query.filter_by(key=key).first():
            db.session.add(FiscalParameter(
                key=key, value=FE_DEMO_VALUES.get(key, default_value),
                description=desc, category=category,
            ))

    # ── Configurazione conti Paghe (obbligatoria: senza questa riga il
    # modulo Paghe si rifiuta di contabilizzare, vedi services/payroll.py
    # ensure_config()). Punta ai conti "personale" appena creati sopra. ──
    db.session.flush()
    if not PayrollAccountConfig.query.first():
        def _acc_id(code):
            a = Account.query.filter_by(code=code).first()
            return a.id if a else None

        db.session.add(PayrollAccountConfig(
            wage_expense_account_id=_acc_id("660000"),               # Salari e Stipendi (costo)
            employer_burden_account_id=_acc_id("661000"),             # Oneri Sociali a carico azienda (costo)
            net_salary_payable_account_id=_acc_id("222000"),          # Debiti v/Dipendenti c/Retribuzioni
            inps_payable_account_id=_acc_id("223000"),                # Debiti v/INPS
            withholding_payable_account_id=_acc_id("224000"),         # Debiti Tributari - Ritenute Lav. Dip.
            bank_account_id=_acc_id("180000"),                        # Banca c/c
            imu_expense_account_id=_acc_id("620000"),                 # Costi di Manutenzione (fallback IMU immobili strumentali)
            accrued_holiday_expense_account_id=_acc_id("660000"),     # Ratei ferie: stesso costo del personale
            accrued_permission_expense_account_id=_acc_id("660000"),  # Ratei permessi: idem
            accrued_thirteenth_expense_account_id=_acc_id("660000"),  # Rateo tredicesima: idem
            accrued_payable_account_id=_acc_id("227000"),             # Ratei Passivi
            tfr_expense_account_id=_acc_id("662000"),                 # Accantonamento TFR (costo)
            tfr_fund_account_id=_acc_id("226000"),                    # TFR - Fondo Trattamento Fine Rapporto
        ))

    # ── Gestione multi-azienda (Fase 1) — Iron Segnaletica (l'azienda già
    # gestita da tutto il resto di questo file) e Iron Wood (P.IVA
    # separata, propria numerazione documenti e propria Fatturazione
    # Elettronica — Fase 3). Dati fiscali SEGNAPOSTO, come già per
    # fe_denominazione più sopra: da correggere in Anagrafica Aziende con
    # i dati reali prima di un uso fiscale vero.
    if not Company.query.filter_by(code="IRSE").first():
        db.session.add(Company(
            code="IRSE", name="Iron Segnaletica", piva="01234567890", codice_fiscale="01234567890",
            regime_fiscale="RF01", indirizzo="Via delle Officine 1", cap="20100",
            comune="Milano", provincia="MI", nazione="IT", codice_destinatario="0000000",
            pec_destinatario="ironsegnaletica@pec.it",
        ))
    if not Company.query.filter_by(code="IRWD").first():
        db.session.add(Company(
            code="IRWD", name="Ironwood Srls", piva="03614490542", codice_fiscale="03614490542",
            regime_fiscale="RF01", indirizzo="Strada Tiberina Nord, 483", cap="06134",
            comune="Perugia", provincia="PG", nazione="IT", codice_destinatario="0000000",
            pec_destinatario="pec@pec.ironwoodpg.it",
        ))

    # ── Termini di Pagamento strutturati (calcolano DAVVERO le scadenze,
    # a differenza di EconomicSubject.payment_terms testuale) — set di
    # base, comuni nella pratica commerciale italiana.
    if not PaymentTerm.query.filter_by(code="NETTO30").first():
        t = PaymentTerm(code="NETTO30", description="Netto 30 giorni data fattura", payment_type="BONIFICO")
        db.session.add(t)
        db.session.flush()
        db.session.add(PaymentTermInstallment(payment_term_id=t.id, numero_rata=1, percentuale=100, giorni=30, fine_mese=False))
    if not PaymentTerm.query.filter_by(code="NETTO60").first():
        t = PaymentTerm(code="NETTO60", description="Netto 60 giorni data fattura", payment_type="BONIFICO")
        db.session.add(t)
        db.session.flush()
        db.session.add(PaymentTermInstallment(payment_term_id=t.id, numero_rata=1, percentuale=100, giorni=60, fine_mese=False))
    if not PaymentTerm.query.filter_by(code="RIBA6090").first():
        t = PaymentTerm(code="RIBA6090", description="Ri.Ba. 60/90 gg data fattura fine mese", payment_type="RIBA")
        db.session.add(t)
        db.session.flush()
        db.session.add(PaymentTermInstallment(payment_term_id=t.id, numero_rata=1, percentuale=50, giorni=60, fine_mese=True))
        db.session.add(PaymentTermInstallment(payment_term_id=t.id, numero_rata=2, percentuale=50, giorni=90, fine_mese=True))
    if not PaymentTerm.query.filter_by(code="RIBA30609").first():
        t = PaymentTerm(code="RIBA30609", description="Ri.Ba. 30/60/90 gg data fattura fine mese", payment_type="RIBA")
        db.session.add(t)
        db.session.flush()
        db.session.add(PaymentTermInstallment(payment_term_id=t.id, numero_rata=1, percentuale=Decimal("33.34"), giorni=30, fine_mese=True))
        db.session.add(PaymentTermInstallment(payment_term_id=t.id, numero_rata=2, percentuale=Decimal("33.33"), giorni=60, fine_mese=True))
        db.session.add(PaymentTermInstallment(payment_term_id=t.id, numero_rata=3, percentuale=Decimal("33.33"), giorni=90, fine_mese=True))

    db.session.commit()

