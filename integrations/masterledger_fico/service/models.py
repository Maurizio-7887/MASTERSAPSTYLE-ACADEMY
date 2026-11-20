"""
Modelli del database — MasterLedger (Flask + SQLAlchemy)

Principi seguiti, coerenti con quanto deciso nel piano di trasformazione:
  - Ogni JournalEntry è IMMUTABILE una volta creato: non si modifica, si storna
    (vedi JournalEntry.reversed_by_id). Rispetta il principio di integrità
    documentale richiesto dalla normativa fiscale italiana.
  - La numerazione dei documenti è progressiva e sequenziale per tipo
    documento (vedi DocumentSequence) — niente "buchi" nella numerazione.
  - I parametri fiscali "di giudizio professionale" (aliquote ammortamento,
    metodo valutazione magazzino, % svalutazione crediti) vivono in
    FiscalParameter: sono DATI, non codice — il Commercialista li modifica
    dal proprio pannello, senza bisogno di toccare l'applicazione.
"""
from datetime import datetime, date
from decimal import Decimal
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db


# ══════════════════════════════════════════════════════════════
# UTENTI E RUOLI
# ══════════════════════════════════════════════════════════════
class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    # Ruoli: 'operatore' (Prima Nota/Fatture quotidiane) vs 'commercialista'
    # (unico ruolo che può modificare i Parametri Fiscali — vedi
    # blueprints/dashboard, sezione Config Fiscale).
    role = db.Column(db.String(20), nullable=False, default="operatore")
    # Portale di ingresso: 'desk' (operativo/commerciale — preventivi, ordini,
    # DDT, RFQ: MAI contabilità) vs 'ledger' (amministrazione — GL/AP/AR/
    # Cespiti/Paghe/Costi). Ortogonale a 'role': un utente 'ledger' può
    # essere operatore o commercialista, un utente 'desk' non vede mai le
    # rotte contabili (bloccate lato server, non solo nascoste in UI —
    # vedi blueprints/decorators.py::ledger_required).
    portal = db.Column(db.String(10), nullable=False, default="ledger")
    is_active_flag = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, raw_password):
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        return check_password_hash(self.password_hash, raw_password)

    @property
    def is_commercialista(self):
        return self.role == "commercialista"

    @property
    def is_desk(self):
        return self.portal == "desk"

    @property
    def is_ledger(self):
        return self.portal == "ledger"

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"


# ══════════════════════════════════════════════════════════════
# PIANO DEI CONTI
# ══════════════════════════════════════════════════════════════
class Account(db.Model):
    __tablename__ = "accounts"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), unique=True, nullable=False)   # es. "150000"
    name = db.Column(db.String(120), nullable=False)
    account_type = db.Column(db.String(20), nullable=False)
    # account_type: 'patrimoniale_attivo' | 'patrimoniale_passivo' | 'costo' | 'ricavo'

    # Se True, le righe su questo conto generano un movimento Costi collegato
    # (esattamente come "coRelevant" nel simulatore JS) — solo i conti di
    # Conto Economico devono essere marcati così.
    cost_relevant = db.Column(db.Boolean, default=False)
    cost_relevant_type = db.Column(db.String(10))  # 'COST' | 'REVENUE' | None

    active = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f"<Account {self.code} {self.name}>"


# ══════════════════════════════════════════════════════════════
# GESTIONE MULTI-AZIENDA (Fase 1) — fondazione, additiva e
# retrocompatibile. Un utente (es. Angelo) lavora su più aziende
# legalmente separate (P.IVA diverse) dallo stesso front-end: la legge
# impone che ciascuna abbia la propria numerazione documenti sequenziale
# e la propria Fatturazione Elettronica (P.IVA/dati fiscali propri) — non
# si può mescolare in un unico Libro Giornale. Questa Fase 1 introduce
# solo l'anagrafica azienda + la numerazione già pronta per essere
# separata; il tag "quale azienda" sui singoli documenti (Preventivi,
# Ordini, Fatture...) e il selettore in interfaccia sono Fase 2.
# ══════════════════════════════════════════════════════════════
class Company(db.Model):
    """Azienda — una riga per ogni P.IVA gestita in questo front-end
    (es. Iron Segnaletica, Iron Wood). code è lo slug interno breve usato
    nei riferimenti tecnici (numerazione documenti ecc.), non compare
    all'utente."""
    __tablename__ = "companies"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), unique=True, nullable=False)  # es. "IRSE", "IRWD"
    name = db.Column(db.String(120), nullable=False)
    piva = db.Column(db.String(20))
    codice_fiscale = db.Column(db.String(20))
    regime_fiscale = db.Column(db.String(10))  # es. RF01 — per XML FatturaPA (Fase 3)
    indirizzo = db.Column(db.String(200))
    cap = db.Column(db.String(10))
    comune = db.Column(db.String(100))
    provincia = db.Column(db.String(5))
    nazione = db.Column(db.String(5), default="IT")
    codice_destinatario = db.Column(db.String(10))
    pec_destinatario = db.Column(db.String(120))
    # Dati per il flusso Ri.Ba. CBI (services/riba_cbi.py) — banca presso cui
    # l'azienda presenta le distinte e codice SIA assegnato da quella banca
    # per l'invio del flusso (te lo comunica la banca quando attivi il
    # servizio Ri.Ba. CBI, insieme al manuale col tracciato tecnico).
    iban = db.Column(db.String(34))
    codice_sia_cbi = db.Column(db.String(10))
    active = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f"<Company {self.code} {self.name}>"


# ══════════════════════════════════════════════════════════════
# NUMERAZIONE PROGRESSIVA DOCUMENTI (per tipo documento)
# ══════════════════════════════════════════════════════════════
class DocumentSequence(db.Model):
    """
    Un contatore per ogni tipo di documento (SA=Prima Nota, KR=Fattura
    Fornitore, DR=Fattura Cliente, KZ=Pagamento, DZ=Incasso, Cespiti=Cespite).

    NOTA IMPORTANTE PER CHI ESTENDE QUESTO CODICE: l'incremento qui sotto
    (vedi next_number()) usa un semplice UPDATE all'interno della stessa
    transazione DB — sufficiente per un carico moderato, ma non è ancora
    "a prova di alta concorrenza". Prima di un vero go-live con più utenti
    contemporanei, sostituire con una SEQUENCE nativa Postgres o un
    SELECT ... FOR UPDATE esplicito, per eliminare ogni rischio di
    doppia assegnazione dello stesso numero.
    """
    __tablename__ = "document_sequences"

    id = db.Column(db.Integer, primary_key=True)
    doc_type = db.Column(db.String(10), nullable=False)
    # Fase 1 multi-azienda: nullable perché ogni sequenza esistente oggi
    # (una sola azienda) resta company_id=NULL — comportamento IDENTICO a
    # prima, zero rotture. Solo il codice nuovo, quando sceglie
    # esplicitamente un'azienda, passerà un company_id reale qui.
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True)
    prefix = db.Column(db.String(10), nullable=False)
    current_number = db.Column(db.Integer, nullable=False, default=0)

    __table_args__ = (
        db.UniqueConstraint("doc_type", "company_id", name="uq_document_sequences_type_company"),
    )

    @classmethod
    def next_number(cls, doc_type, prefix, company_id=None):
        seq = cls.query.filter_by(doc_type=doc_type, company_id=company_id).first()
        if seq is None:
            seq = cls(doc_type=doc_type, prefix=prefix, current_number=0, company_id=company_id)
            db.session.add(seq)
        seq.current_number += 1
        db.session.flush()  # garantisce che current_number sia scritto prima del commit finale
        return f"{seq.prefix}{seq.current_number:08d}"


# ══════════════════════════════════════════════════════════════
# PRIMA NOTA — TESTATA E RIGHE (immutabili: si stornano, non si modificano)
# ══════════════════════════════════════════════════════════════
class JournalEntry(db.Model):
    __tablename__ = "journal_entries"
    __table_args__ = (db.UniqueConstraint("doc_number", "company_id", name="uq_journal_entries_docnum_company"),)

    id = db.Column(db.Integer, primary_key=True)
    doc_number = db.Column(db.String(20), nullable=False)
    doc_type = db.Column(db.String(10), nullable=False)   # SA, KR, DR, KZ, DZ, Cespiti...
    doc_date = db.Column(db.Date, nullable=False)
    posting_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    description = db.Column(db.String(255))
    source_module = db.Column(db.String(20), default="LEDGER")  # LEDGER, MAGAZZINO, VENDITE, PRODUZIONE...
    reference = db.Column(db.String(80))

    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Multi-azienda (Fase 3, Angelo/Ledger) — vedi Quotation.company_id per
    # il principio generale. Nullable: le scritture esistenti restano
    # "nessuna azienda", nessuna rottura. Da qui in poi la CONTABILITÀ VERA
    # (Prima Nota, Fatture, Pagamenti, Incassi, Scadenzario) inizia a
    # taggarsi per azienda — prima erano taggati solo i documenti
    # commerciali pre-fattura di Maria Grazia (Preventivi/Ordini/DDT/EM).
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True)
    company = db.relationship("Company")

    # Immutabilità: un documento non si modifica. Se sbagliato, si storna
    # creando un NUOVO documento di segno opposto collegato a questo.
    is_reversed = db.Column(db.Boolean, default=False)
    reversed_by_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=True)
    reverses_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=True)

    # Compensazione (clearing) semplificata per i documenti AP/AR (KR/DR):
    # True quando un pagamento/incasso ha chiuso la posizione. Un vero MasterLedger
    # userebbe la compensazione a livello di singola posizione (partita);
    # qui, per l'MVP, si compensa l'intero documento in un colpo solo.
    is_paid = db.Column(db.Boolean, default=False)
    paid_by_entry_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=True)
    # Fattura d'Anticipo/Acconto (TD02): True SOLO per un DR emesso da
    # ar.customer_advance_invoice (prima della consegna, su un Ordine
    # Cliente aperto) — determina il TipoDocumento nell'XML FatturaPA
    # (TD02 invece di TD01). Stessa numerazione/sequenza dei DR normali:
    # è corretto, acconto e fattura normale condividono la stessa serie.
    is_advance_invoice = db.Column(db.Boolean, nullable=False, default=False)

    # Soggetto economico unico, cliente e/o fornitore.
    economic_subject_id = db.Column(db.Integer, db.ForeignKey("economic_subjects.id"), nullable=True)
    gross_amount = db.Column(db.Numeric(14, 2), nullable=True)  # importo totale fattura, per comodità

    # Aliquota IVA della fattura (unica, per l'MVP — una sola riga/aliquota).
    # Salvata esplicitamente invece di essere ricalcolata da IVA/Imponibile,
    # per evitare arrotondamenti quando si genera l'XML FatturaPA (vedi
    # services/fatturapa.py). Popolata da Fattura cliente (fatture cliente); NULL per
    # gli altri tipi documento dove non serve.
    vat_rate = db.Column(db.Numeric(5, 2), nullable=True)

    # Codice Natura IVA (N1, N2.1, N4, ...) — OBBLIGATORIO per le specifiche
    # SdI quando l'aliquota IVA è zero (controlli 00400 sulla linea e 00429
    # sui DatiRiepilogo: "l'indicazione di un'aliquota IVA pari a zero
    # obbliga all'indicazione della natura che giustifichi la non
    # imponibilità"). NULL per fatture con aliquota > 0 (dove la presenza
    # di Natura causerebbe invece lo scarto 00430).
    natura = db.Column(db.String(4), nullable=True)

    # Nota di credito (doc_type DG): riferimento alla fattura originale che
    # viene rettificata. Alimenta il blocco <DatiFattureCollegate> dell'XML
    # (TD04) — facoltativo nel tracciato ma buona prassi.
    linked_invoice_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=True)
    linked_invoice = db.relationship("JournalEntry", remote_side="JournalEntry.id",
                                     foreign_keys=[linked_invoice_id])

    # Ratei e risconti (FBS1): data in cui F.81 deve generare lo storno
    # automatico. NULL per ogni altro documento.
    reversal_date = db.Column(db.Date, nullable=True)

    party = db.relationship("EconomicSubject")

    lines = db.relationship("JournalLine", backref="entry", cascade="all, delete-orphan")
    created_by = db.relationship("User")

    @property
    def total_dare(self):
        return sum(l.dare for l in self.lines)

    @property
    def total_avere(self):
        return sum(l.avere for l in self.lines)

    @property
    def is_balanced(self):
        return abs(self.total_dare - self.total_avere) < 0.01

    def __repr__(self):
        return f"<JournalEntry {self.doc_number}>"


class JournalEntryChange(db.Model):
    """Registro modifiche FB02: solo campi non contabili (testi e
    riferimento). Importi, conti e date non si modificano mai: si storna."""
    __tablename__ = "journal_entry_changes"

    id = db.Column(db.Integer, primary_key=True)
    entry_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=False, index=True)
    field = db.Column(db.String(40), nullable=False)
    old_value = db.Column(db.String(255))
    new_value = db.Column(db.String(255))
    changed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    changed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    entry = db.relationship("JournalEntry", backref=db.backref("changes", order_by="JournalEntryChange.changed_at"))
    changed_by = db.relationship("User")


class JournalLine(db.Model):
    __tablename__ = "journal_lines"

    id = db.Column(db.Integer, primary_key=True)
    entry_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)
    dare = db.Column(db.Numeric(14, 2), default=0)
    avere = db.Column(db.Numeric(14, 2), default=0)
    description = db.Column(db.String(255))

    # Oggetto Costi collegato (se il conto è cost_relevant) — Centro di costo,
    # Ordine Interno, o simile. Facoltativo per i conti patrimoniali.
    cost_center_id = db.Column(db.Integer, db.ForeignKey("cost_centers.id"), nullable=True)

    account = db.relationship("Account")
    cost_center = db.relationship("CostCenter")


class InvoiceLine(db.Model):
    """
    Riga di dettaglio di una fattura/nota di credito cliente (Fattura cliente/Nota di credito cliente).
    Distinta dalla JournalLine (che è la riga CONTABILE in partita doppia):
    la InvoiceLine è la riga COMMERCIALE del documento, e alimenta i blocchi
    <DettaglioLinee> e <DatiRiepilogo> dell'XML FatturaPA.

    Le specifiche SdI impongono (controlli 00419/00422): un blocco
    DatiRiepilogo per ogni aliquota presente in fattura, con
    ImponibileImporto = somma dei PrezzoTotale delle righe con quella
    aliquota. Il raggruppamento avviene per coppia (aliquota, natura).
    """
    __tablename__ = "invoice_lines"

    id = db.Column(db.Integer, primary_key=True)
    entry_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=False)
    line_number = db.Column(db.Integer, nullable=False)
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Numeric(14, 2), nullable=False)      # imponibile di riga
    vat_rate = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    natura = db.Column(db.String(4), nullable=True)             # solo se vat_rate = 0
    account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)

    entry = db.relationship("JournalEntry", backref=db.backref(
        "invoice_lines", cascade="all, delete-orphan",
        order_by="InvoiceLine.line_number"))
    account = db.relationship("Account")


# ══════════════════════════════════════════════════════════════
# ANAGRAFICHE FORNITORE / CLIENTE
# ══════════════════════════════════════════════════════════════
class PaymentTerm(db.Model):
    """
    Termine di pagamento strutturato (es. 'Ri.Ba. 60/90 gg df fm') — a
    differenza di EconomicSubject.payment_terms (testo libero, mai usato
    per calcolare davvero le scadenze), questo guida il calcolo REALE
    delle rate quando si registra una fattura: services/payments.py
    legge payment_term_id del cliente/fornitore e costruisce lo schedule
    da qui invece del fisso 'una rata a 30 giorni' di sempre.
    """
    __tablename__ = "payment_terms_master"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    description = db.Column(db.String(80), nullable=False)
    payment_type = db.Column(db.String(30))  # libero: RIBA, BONIFICO, RID, CONTANTI... solo informativo
    active = db.Column(db.Boolean, default=True)

    installments = db.relationship("PaymentTermInstallment", backref="term",
                                   cascade="all, delete-orphan",
                                   order_by="PaymentTermInstallment.numero_rata")

    def __repr__(self):
        return f"<PaymentTerm {self.code} {self.description}>"


class PaymentTermInstallment(db.Model):
    """Una rata di un PaymentTerm — es. 'Ri.Ba. 60/90 gg df fm' ha 2 righe
    (50% a 60gg, 50% a 90gg, entrambe arrotondate a fine mese)."""
    __tablename__ = "payment_term_installments"
    id = db.Column(db.Integer, primary_key=True)
    payment_term_id = db.Column(db.Integer, db.ForeignKey("payment_terms_master.id"), nullable=False)
    numero_rata = db.Column(db.Integer, nullable=False)
    percentuale = db.Column(db.Numeric(5, 2), nullable=False)  # deve sommare a 100 su tutte le rate del termine
    giorni = db.Column(db.Integer, nullable=False, default=0)  # giorni dalla data fattura
    fine_mese = db.Column(db.Boolean, default=False)  # dopo aver aggiunto i giorni, arrotonda a fine mese


class EconomicSubject(db.Model):
    """Anagrafica unica: può operare contemporaneamente come cliente e fornitore."""
    __tablename__ = "economic_subjects"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)  # denominazione o nome completo
    subject_type = db.Column(db.String(12), nullable=False, default="azienda")  # azienda | persona
    is_customer = db.Column(db.Boolean, nullable=False, default=False)
    is_supplier = db.Column(db.Boolean, nullable=False, default=False)
    piva = db.Column(db.String(20), index=True)
    codice_fiscale = db.Column(db.String(16))
    indirizzo = db.Column(db.String(120))
    cap = db.Column(db.String(10))
    comune = db.Column(db.String(80))
    provincia = db.Column(db.String(2))
    nazione = db.Column(db.String(2), default="IT")
    email = db.Column(db.String(120))
    pec = db.Column(db.String(120))
    telefono = db.Column(db.String(40))
    codice_destinatario = db.Column(db.String(7), default="0000000")
    payment_terms = db.Column(db.String(40), default="Netto 30gg")
    # Termine di pagamento strutturato (opzionale): quando valorizzato,
    # guida DAVVERO il calcolo delle rate alla registrazione di una
    # fattura — payment_terms (sopra) resta solo per compatibilità/
    # visualizzazione, non calcola più nulla da solo. NULL = comportamento
    # di sempre (una rata unica a 30 giorni), nessuna rottura.
    payment_term_id = db.Column(db.Integer, db.ForeignKey("payment_terms_master.id"), nullable=True)
    payment_term = db.relationship("PaymentTerm", foreign_keys=[payment_term_id])
    iban = db.Column(db.String(34))
    active = db.Column(db.Boolean, default=True)
    # Castelletto (limite di esposizione) — dato dal fornitore/cliente stesso
    # o stimato internamente. Confrontato con l'esposizione TOTALE (fatture
    # non pagate/incassate + ordini aperti non ancora fatturati) alla
    # creazione di un nuovo Ordine Fornitore/Cliente: se lo supera, l'ordine
    # si blocca finché non si conferma esplicitamente di voler procedere
    # comunque (vedi services/castelletto.py). NULL = nessun limite impostato,
    # nessun controllo.
    credit_limit = db.Column(db.Numeric(14, 2), nullable=True)
    # Split Payment (scissione dei pagamenti, D.L. 50/2017) — obbligatorio
    # per le fatture verso Pubblica Amministrazione (Comuni, enti pubblici):
    # il cliente paga solo il netto, versa lui stesso l'IVA all'Erario.
    # Determina il codice EsigibilitaIVA nell'XML FatturaPA (vedi
    # services/fatturapa.py). Rilevante solo per i clienti (is_customer),
    # ma il campo resta generico come credit_limit qui sopra.
    split_payment = db.Column(db.Boolean, nullable=False, default=False, server_default="0")

    @property
    def role_label(self):
        if self.is_customer and self.is_supplier:
            return "Cliente e fornitore"
        if self.is_customer:
            return "Cliente"
        if self.is_supplier:
            return "Fornitore"
        return "Da qualificare"

    @property
    def pec_destinatario(self):
        return self.pec

    @pec_destinatario.setter
    def pec_destinatario(self, value):
        self.pec = value



# ══════════════════════════════════════════════════════════════
# CENTRI DI COSTO
# ══════════════════════════════════════════════════════════════
class CostCenter(db.Model):
    __tablename__ = "cost_centers"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)
    active = db.Column(db.Boolean, default=True)
    # Conto ricavi associato — solo per i centri usati come ASA (linea di
    # business) su cui si vende: Carpenteria, Commercializzati, Saldatura
    # Conto Terzi, Gestione Cantieri... I centri di costo puri (es. un
    # reparto amministrativo) non hanno mai un conto ricavi, restano NULL.
    # Un articolo che vende (Material.revenue_center_id) eredita da qui SIA
    # il conto ricavi SIA il centro di costo/ricavo in un colpo solo — non
    # può mai disallinearsi perché è una sola fonte di verità.
    revenue_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    revenue_account = db.relationship("Account", foreign_keys=[revenue_account_id])


# ══════════════════════════════════════════════════════════════
# CESPITI (Asset Accounting)
# ══════════════════════════════════════════════════════════════
class Asset(db.Model):
    __tablename__ = "assets"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    description = db.Column(db.String(200), nullable=False)
    acquisition_value = db.Column(db.Numeric(14, 2), nullable=False)
    acquisition_date = db.Column(db.Date, nullable=False)

    # Categoria collegata ai Parametri Fiscali (aliquota/metodo) impostati
    # dal Commercialista — vedi FiscalParameter.
    asset_category = db.Column(db.String(40), default="Impianti e Macchinari")
    useful_life_years = db.Column(db.Integer, default=10)
    accumulated_depreciation = db.Column(db.Numeric(14, 2), default=0)
    active = db.Column(db.Boolean, default=True)
    # Centro di Costo/Ricavo (ASA) a cui appartiene questo cespite — es. una
    # saldatrice di CC-SALD-01, un macchinario di CC-CARP-01. Determina su
    # quale centro finisce il suo ammortamento mensile (vedi
    # blueprints/assets/routes.py::depreciation, che raggruppa la scrittura
    # per centro invece di un'unica riga aggregata su tutti i cespiti).
    cost_center_id = db.Column(db.Integer, db.ForeignKey("cost_centers.id"), nullable=True)
    cost_center = db.relationship("CostCenter", foreign_keys=[cost_center_id])
    # Multi-azienda (Fase 3) — un macchinario appartiene a un'azienda sola.
    # Nullable: i cespiti già esistenti restano "nessuna azienda", nessuna
    # rottura.
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True)
    company = db.relationship("Company")



# ══════════════════════════════════════════════════════════════
# PARAMETRI FISCALI — pannello riservato al Commercialista
# ══════════════════════════════════════════════════════════════
class FiscalParameter(db.Model):
    """
    Coppia chiave/valore + descrizione, modificabile SOLO da utenti con
    ruolo 'commercialista'. Qui vivono le decisioni di giudizio
    professionale (metodo ammortamento, valutazione magazzino, % svalutazione
    crediti) — il codice applicativo le LEGGE, non le decide.
    """
    __tablename__ = "fiscal_parameters"

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(80), unique=True, nullable=False)
    value = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(255))
    category = db.Column(db.String(40))  # 'ammortamenti' | 'magazzino' | 'crediti' | 'iva'
    updated_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    updated_by = db.relationship("User")


# ══════════════════════════════════════════════════════════════
# Fase 4 (progettazione parti mancanti, punto 6) — Riconciliazione
# bancaria. Modello a tre livelli: testata estratto conto, righe
# importate, allocazioni molti-a-molti verso le righe del mastrino
# (un bonifico può chiudere più fatture, una riga GL può essere
# coperta da più movimenti bancari — es. incasso + commissione
# separati sull'estratto conto).
class BankStatement(db.Model):
    __tablename__ = "bank_statements"

    id = db.Column(db.Integer, primary_key=True)
    bank_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)
    period_from = db.Column(db.Date, nullable=False)
    period_to = db.Column(db.Date, nullable=False)
    opening_balance = db.Column(db.Numeric(14, 2), nullable=False)
    closing_balance = db.Column(db.Numeric(14, 2), nullable=False)
    import_filename = db.Column(db.String(255))
    file_hash = db.Column(db.String(64))  # impronta dell'INTERO file — evita di reimportare lo stesso file due volte
    imported_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    imported_at = db.Column(db.DateTime, default=datetime.utcnow)

    bank_account = db.relationship("Account")
    imported_by = db.relationship("User")

    __table_args__ = (db.UniqueConstraint("bank_account_id", "file_hash", name="uq_statement_file_hash"),)


class BankStatementLine(db.Model):
    __tablename__ = "bank_statement_lines"

    id = db.Column(db.Integer, primary_key=True)
    statement_id = db.Column(db.Integer, db.ForeignKey("bank_statements.id"), nullable=False)
    value_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(255))
    amount = db.Column(db.Numeric(14, 2), nullable=False)  # positivo=accredito, negativo=addebito
    bank_transaction_id = db.Column(db.String(120))  # identificativo bancario, se il formato lo fornisce
    # Hash CONTESTUALIZZATO (non unique globale): due movimenti reali
    # possono avere stesso importo/data/descrizione senza essere lo
    # stesso movimento — l'unicità è su (statement_id, hash), non sulla
    # sola riga, così un secondo import dello stesso file viene bloccato
    # ma due bonifici identici nello stesso giorno restano entrambi validi.
    import_hash = db.Column(db.String(64), nullable=False)

    statement = db.relationship("BankStatement", backref="lines")

    __table_args__ = (db.UniqueConstraint("statement_id", "import_hash", name="uq_statement_line_hash"),)

    @property
    def allocated_amount(self):
        return sum((a.amount_allocated for a in self.allocations if not a.reversed), Decimal("0"))

    @property
    def residual_amount(self):
        return abs(Decimal(str(self.amount))) - self.allocated_amount

    @property
    def is_reconciled(self):
        return self.residual_amount <= 0


class BankReconciliationAllocation(db.Model):
    """Allocazione molti-a-molti tra una riga di estratto conto e una riga
    di mastrino GL — mai un collegamento 1:1 rigido: un bonifico può
    chiudere più fatture, un incasso e la sua commissione possono comparire
    come due righe separate sull'estratto conto per un solo movimento GL."""
    __tablename__ = "bank_reconciliation_allocations"

    id = db.Column(db.Integer, primary_key=True)
    statement_line_id = db.Column(db.Integer, db.ForeignKey("bank_statement_lines.id"), nullable=False)
    journal_line_id = db.Column(db.Integer, db.ForeignKey("journal_lines.id"), nullable=False)
    amount_allocated = db.Column(db.Numeric(14, 2), nullable=False)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reversed = db.Column(db.Boolean, default=False)

    statement_line = db.relationship("BankStatementLine", backref="allocations")
    journal_line = db.relationship("JournalLine", backref="bank_allocations")


# ══════════════════════════════════════════════════════════════
# Fase 3 (progettazione parti mancanti, punto 1) — Pagamenti
# parziali, scadenze e residui.
#
# Ogni fattura (KR/DR) riceve almeno UNA rata (InvoiceInstallment)
# alla creazione — se non è configurato un piano a più scadenze,
# la rata è unica e copre l'intero gross_amount, così il comportamento
# di oggi (paga tutto insieme) resta disponibile senza differenze.
#
# is_paid su JournalEntry NON diventa una proprietà calcolata (lo
# era stato proposto in una prima versione e correttamente respinto
# in revisione: il codice esistente lo usa dentro filter() SQL, una
# property Python non è interrogabile lì). Resta una colonna vera,
# sincronizzata dentro la STESSA transazione di ogni allocazione:
# quando l'ultima rata di una fattura si azzera, is_paid diventa True
# nello stesso commit — mai in un passaggio separato.
class InvoiceInstallment(db.Model):
    __tablename__ = "invoice_installments"

    id = db.Column(db.Integer, primary_key=True)
    entry_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=False)
    numero_rata = db.Column(db.Integer, nullable=False, default=1)
    due_date = db.Column(db.Date, nullable=False)
    amount = db.Column(db.Numeric(14, 2), nullable=False)           # importo originario della rata
    residual_amount = db.Column(db.Numeric(14, 2), nullable=False)  # si riduce ad ogni allocazione, mai < 0, mai > amount
    version = db.Column(db.Integer, nullable=False, default=0)      # controllo di concorrenza ottimistico
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    entry = db.relationship("JournalEntry", foreign_keys=[entry_id])

    @property
    def is_settled(self):
        return self.residual_amount <= 0

    @property
    def is_overdue(self):
        """Non salvato: calcolato al momento della query contro la data
        odierna — 'scaduta' non è mai un valore persistito e stantio."""
        return (not self.is_settled) and self.due_date < datetime.utcnow().date()

    @property
    def status_label(self):
        if self.is_settled:
            return "saldata"
        if self.residual_amount < self.amount:
            return "scaduta e parziale" if self.is_overdue else "parziale"
        return "scaduta" if self.is_overdue else "aperta"


class PaymentAllocation(db.Model):
    """Allocazione molti-a-molti: un pagamento può chiudere più rate, una
    rata può ricevere più pagamenti nel tempo. cash_amount è la quota
    coperta da denaro reale (si somma al movimento banca del pagamento);
    abbuono_amount è una quota che riduce comunque il residuo della rata
    ma genera una riga contabile separata sul conto abbuoni autorizzato,
    non un movimento di cassa."""
    __tablename__ = "payment_allocations"

    id = db.Column(db.Integer, primary_key=True)
    payment_entry_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=False)
    installment_id = db.Column(db.Integer, db.ForeignKey("invoice_installments.id"), nullable=False)
    cash_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    abbuono_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reversed = db.Column(db.Boolean, default=False)
    reversed_at = db.Column(db.DateTime)
    reversed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    payment_entry = db.relationship("JournalEntry", foreign_keys=[payment_entry_id])
    installment = db.relationship("InvoiceInstallment")


# ══════════════════════════════════════════════════════════════
# Fase 2 (progettazione parti mancanti, punto 5) — Chiusura e
# blocco dei periodi contabili.
#
# Un periodo ASSENTE da questa tabella è bloccante per default
# (vedi PERIOD_LOCK_ENFORCED in services/posting.py) SOLO dopo che
# l'azienda ha iniziato a creare i propri periodi. Durante la messa
# in produzione iniziale, quando ancora nessun periodo esiste, il
# blocco è disattivabile da FiscalParameter così da non paralizzare
# il lavoro il primo giorno — va riattivato non appena i periodi
# sono stati creati (vedi info_box nella pagina di gestione periodi).
class AccountingPeriod(db.Model):
    __tablename__ = "accounting_periods"
    __table_args__ = (db.UniqueConstraint("company", "year", "month", name="uq_period_company_year_month"),)

    id = db.Column(db.Integer, primary_key=True)
    company = db.Column(db.String(80), nullable=False, default="Iron Segnaletica")  # esplicito fin da subito, anche se oggi single-company
    year = db.Column(db.Integer, nullable=False)
    month = db.Column(db.Integer, nullable=False)  # 1-12
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    period_type = db.Column(db.String(20), default="mensile")  # mensile | trimestrale | annuale
    status = db.Column(db.String(24), default="aperto")  # aperto | chiuso | riaperto_temporaneamente
    closed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    closed_at = db.Column(db.DateTime)
    reopen_reason = db.Column(db.String(255))

    closed_by = db.relationship("User")

    @property
    def is_open(self):
        return self.status in ("aperto", "riaperto_temporaneamente")

    @staticmethod
    def find_for_date(d, company="Iron Segnaletica"):
        return AccountingPeriod.query.filter(
            AccountingPeriod.company == company,
            AccountingPeriod.start_date <= d,
            AccountingPeriod.end_date >= d,
        ).first()


class AccountingPeriodLog(db.Model):
    """Log immutabile di chiusure/riaperture — tabella separata da
    AccountingPeriod apposta: anche se lo stato del periodo viene
    riportato indietro (riapertura), la storia di CHI e QUANDO resta,
    riga per riga, mai sovrascritta."""
    __tablename__ = "accounting_period_logs"

    id = db.Column(db.Integer, primary_key=True)
    period_id = db.Column(db.Integer, db.ForeignKey("accounting_periods.id"), nullable=False)
    action = db.Column(db.String(20), nullable=False)  # chiusura | riapertura
    performed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    performed_at = db.Column(db.DateTime, default=datetime.utcnow)
    reason = db.Column(db.String(255))

    period = db.relationship("AccountingPeriod")
    performed_by = db.relationship("User")


# ══════════════════════════════════════════════════════════════
# Fase 1 (progettazione parti mancanti, punto 0) — Piano dei conti
# canonico e configurabile.
#
# PERCHÉ ESISTE: prima di questa tabella, AP/AR/GL/Cespiti avevano i
# codici conto (banca, IVA a credito/debito, crediti clienti, debiti
# fornitori...) scritti a mano dentro _get_account_by_code("180000")
# sparsi in più file. Cambiare piano dei conti significava una caccia
# al codice in ogni blueprint. Ora ogni concetto si legge da qui.
#
# COSA NON FA: non esegue una migrazione automatica verso il piano dei
# conti "reale" di Iron Appalti. Gli Schemi 1-13 (services/
# classificazione_operazioni.py, services/rettifiche_operazioni.py)
# usano già i codici reali (032003, 045001...) perché quei codici sono
# noti con certezza. Per i concetti di BASE usati qui sotto (crediti
# clienti, debiti fornitori, cespiti) NON esiste ancora una conferma
# del codice reale equivalente nel piano dei ~795 conti del
# commercialista — il CSV completo non è mai stato ricevuto. Finché
# non arriva, questa tabella punta ai codici "generici" originari
# (140000, 154000, 170000, 180000, 210000...): NIENTE CAMBIA nel
# comportamento oggi, cambia solo DOVE il codice è scritto — da
# sparso nel codice a centralizzato qui, pronto per essere aggiornato
# in un solo posto quando la mappatura reale sarà approvata.
class AccountMapping(db.Model):
    """
    Concetto contabile → conto attivo. Modificabile SOLO da ruolo
    'commercialista' (stessa protezione di FiscalParameter/
    PayrollAccountConfig). Il codice applicativo LEGGE da qui,
    non decide più da solo quale conto usare.
    """
    __tablename__ = "account_mappings"

    id = db.Column(db.Integer, primary_key=True)
    concept_key = db.Column(db.String(60), unique=True, nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)
    label = db.Column(db.String(120), nullable=False)   # descrizione leggibile per l'UI di configurazione
    category = db.Column(db.String(40))                 # 'banca' | 'iva' | 'clienti_fornitori' | 'cespiti'
    updated_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    account = db.relationship("Account")
    updated_by = db.relationship("User")

    @staticmethod
    def get(concept_key):
        """Ritorna l'Account mappato per un concetto, o None se non configurato."""
        m = AccountMapping.query.filter_by(concept_key=concept_key).first()
        return m.account if m else None

    @staticmethod
    def get_or_error(concept_key):
        """Come get(), ma solleva un errore esplicito invece di un None silenzioso —
        così un concetto non ancora configurato blocca l'operazione con un
        messaggio chiaro invece di un crash a valle o, peggio, una scrittura
        su un conto sbagliato."""
        account = AccountMapping.get(concept_key)
        if account is None:
            raise ValueError(
                f"Il concetto contabile '{concept_key}' non è configurato in "
                f"AccountMapping — contatta il commercialista prima di procedere."
            )
        return account


# ══════════════════════════════════════════════════════════════
# ANAGRAFICA ARTICOLI (Material Master — MM01 semplificato)
# ══════════════════════════════════════════════════════════════
class Material(db.Model):
    """
    Articolo con costo standard (per il Costo del Venduto all'uscita merci,
    come SAP) e prezzo di vendita. Nessuna giacenza qui: MasterLedgerLight
    non ha magazzino interno — la giacenza vive su MasterLogistic-WMS e su
    IronProduction, letta a bisogno (es. controllo disponibilità in SD).
    """
    __tablename__ = "materials"

    TYPE_ACCOUNTS = {"ROH": "150000", "HALB": "155000", "FERT": "160000"}
    TYPE_LABELS = {"ROH": "Materia Prima", "HALB": "Semilavorato", "FERT": "Prodotto Finito"}

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(30), unique=True, nullable=False)
    description = db.Column(db.String(200), nullable=False)
    material_type = db.Column(db.String(5), nullable=False, default="FERT")  # ROH|HALB|FERT
    uom = db.Column(db.String(10), default="PZ")
    standard_cost = db.Column(db.Numeric(14, 4), nullable=False, default=0)   # costo del venduto
    sales_price = db.Column(db.Numeric(14, 4), nullable=False, default=0)
    vat_rate = db.Column(db.Numeric(5, 2), nullable=False, default=22)
    # Scorta minima (reorder point) — soglia sotto la quale il cruscotto
    # Magazzino/Fabbisogno (stile MasterLogistic-WMS) segnala fabbisogno.
    # La giacenza vera (stock) non vive qui: MasterLedgerLight non ha
    # magazzino interno, la legge in tempo reale da MasterLogistic-WMS
    # (services/logistic_client.py) e da IronProduction.
    reorder_point = db.Column(db.Numeric(14, 3), nullable=False, default=0)
    active = db.Column(db.Boolean, default=True)
    # Flag: questo articolo passa dal reparto carpenteria propria (taglio e
    # foratura di semilavorati, poi saldatura) — es. paletti parapedonali,
    # transenne, archetti parcheggi, cavalletti cartelli stradali, cartelli
    # stradali assemblati (pellicola su lamiera ferrosa acquistata). Serve per
    # sapere QUALI prodotti condividono il pool di costi indiretti di
    # carpenteria (taglio/foratura) quando lo si spalma in base al fatturato —
    # un prodotto comprato e rivenduto così com'è NON deve riceverne quota.
    is_carpenteria_propria = db.Column(db.Boolean, default=False, nullable=False)
    # Dove va instradato l'acquisto di questo articolo quando arriva
    # un'Entrata Merci (MM): 'wms' = a MasterLogistic-WMS (materiali di
    # rivendita, es. lamiera/carpenteria da rivendere così com'è), 'iron_
    # production' = al magazzino officina interna di IronProduction (ferro
    # per lavorazioni proprie, filo di saldatura, DPI, consumabili). NULL =
    # non ancora classificato — l'Entrata Merci blocca con un errore chiaro
    # invece di instradare a caso. I prodotti finiti che VENDIAMO (letti da
    # MasterLogistic-WMS in SD) non passano da qui: questo campo riguarda
    # solo il lato acquisti.
    PURCHASE_DESTINATIONS = ("wms", "iron_production")
    purchase_destination = db.Column(db.String(20), nullable=True)
    # ASA (linea di business) di questo articolo/servizio, per gli articoli
    # che VENDIAMO: determina conto ricavi + centro di costo/ricavo in
    # Fatturazione DDT (vedi CostCenter.revenue_account_id). NULL = non
    # ancora classificato — blocca la fatturazione con un errore chiaro,
    # stessa logica di purchase_destination sull'Entrata Merci. Gli articoli
    # comprati e mai rivenduti (es. consumabili officina) restano NULL qui.
    revenue_center_id = db.Column(db.Integer, db.ForeignKey("cost_centers.id"), nullable=True)
    revenue_center = db.relationship("CostCenter", foreign_keys=[revenue_center_id])
    # Voce di Costo (override) — il conto "Dare" all'Entrata Merci/Uscita
    # Merci è oggi automatico ma rigido: dipende solo dal tipo articolo
    # (ROH/HALB/FERT -> un conto fisso ciascuno, vedi TYPE_ACCOUNTS/
    # inventory_account_code). Per un articolo specifico che deve andare
    # su un conto diverso da quello automatico, si imposta qui — quando
    # valorizzato, vince su TYPE_ACCOUNTS; quando vuoto, il comportamento
    # resta quello di sempre (nessuna rottura per gli articoli esistenti).
    custom_cost_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    custom_cost_account = db.relationship("Account", foreign_keys=[custom_cost_account_id])

    @property
    def type_label(self):
        return self.TYPE_LABELS.get(self.material_type, self.material_type)

    @property
    def inventory_account_code(self):
        # Se è stato impostato un conto specifico per questo articolo
        # (custom_cost_account_id), vince su quello automatico per tipo.
        if self.custom_cost_account_id and self.custom_cost_account:
            return self.custom_cost_account.code
        return self.TYPE_ACCOUNTS.get(self.material_type, "160000")


# ══════════════════════════════════════════════════════════════
# CICLO ATTIVO SD — Preventivo → Ordine → DDT (PGI+COGS) → Fattura
# ══════════════════════════════════════════════════════════════
class Quotation(db.Model):
    """Preventivo cliente (VA21)."""
    __tablename__ = "quotations"
    __table_args__ = (db.UniqueConstraint("doc_number", "company_id", name="uq_quotations_docnum_company"),)
    id = db.Column(db.Integer, primary_key=True)
    doc_number = db.Column(db.String(20), nullable=False)
    doc_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    economic_subject_id = db.Column(db.Integer, db.ForeignKey("economic_subjects.id"), nullable=True)  # FIX: allineato alla migrazione reale (nullable=True), che non ha imposto NOT NULL sulle righe storiche
    # Multi-azienda (Fase 2): per quale azienda è questo preventivo — Maria
    # Grazia lavora sia per Iron Segnaletica che per Iron Wood dallo stesso
    # front-end. Nullable per compatibilità con i preventivi già esistenti
    # (creati prima di questa fase, tutti impliciti Iron Segnaletica).
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True)
    status = db.Column(db.String(15), default="aperto")  # aperto | convertito | scaduto
    note = db.Column(db.String(255))
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    party = db.relationship("EconomicSubject")
    company = db.relationship("Company")
    lines = db.relationship("QuotationLine", backref="quotation", cascade="all, delete-orphan")

    @property
    def total_net(self):
        return sum(float(l.qty) * float(l.price) for l in self.lines)


class QuotationLine(db.Model):
    __tablename__ = "quotation_lines"
    id = db.Column(db.Integer, primary_key=True)
    quotation_id = db.Column(db.Integer, db.ForeignKey("quotations.id"), nullable=False)
    material_id = db.Column(db.Integer, db.ForeignKey("materials.id"), nullable=False)
    qty = db.Column(db.Numeric(14, 3), nullable=False)
    price = db.Column(db.Numeric(14, 4), nullable=False)  # prezzo unitario netto
    material = db.relationship("Material")


class SalesOrder(db.Model):
    """Ordine cliente (VA01) — creato libero o da Preventivo (copy control)."""
    __tablename__ = "sales_orders"
    __table_args__ = (db.UniqueConstraint("doc_number", "company_id", name="uq_sales_orders_docnum_company"),)
    id = db.Column(db.Integer, primary_key=True)
    doc_number = db.Column(db.String(20), nullable=False)
    doc_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    economic_subject_id = db.Column(db.Integer, db.ForeignKey("economic_subjects.id"), nullable=True)  # FIX: allineato alla migrazione reale (nullable=True), che non ha imposto NOT NULL sulle righe storiche
    quotation_id = db.Column(db.Integer, db.ForeignKey("quotations.id"), nullable=True)
    # Multi-azienda (Fase 2) — vedi Quotation.company_id
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True)
    status = db.Column(db.String(15), default="aperto")  # aperto | consegnato
    note = db.Column(db.String(255))
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Cruscotto Ordini Cliente stile MasterLogistic (logistics_bp):
    delivery_due_date = db.Column(db.Date, nullable=True)   # data consegna concordata col cliente
    confirmed = db.Column(db.Boolean, nullable=False, default=False)  # confermato col cliente (telefono/mail)
    priority = db.Column(db.Integer, nullable=False, default=0)  # ordine manuale (drag&drop) nel cruscotto

    party = db.relationship("EconomicSubject")
    company = db.relationship("Company")
    quotation = db.relationship("Quotation", backref="orders")
    lines = db.relationship("SalesOrderLine", backref="order", cascade="all, delete-orphan")

    @property
    def total_net(self):
        return sum(float(l.qty) * float(l.price) for l in self.lines)

    @property
    def qty_delivered_total(self):
        return sum(float(l.qty_delivered or 0) for l in self.lines)

    @property
    def acconto_fatturato_netto(self):
        """Somma dell'imponibile già fatturato come Acconto (Fattura
        d'Anticipo, TD02) su questo ordine — NON ancora dedotto in
        automatico dalla fattura finale: serve come promemoria per chi
        fattura da DDT, che deve tenerne conto a mano per ora (vedi
        CustomerAdvanceInvoice)."""
        return sum(float(a.net_amount) for a in self.advance_invoices if not a.entry.is_reversed)


class CustomerAdvanceInvoice(db.Model):
    """
    Fattura d'Anticipo/Acconto (FatturaPA TD02) — emessa PRIMA della
    consegna su un Ordine Cliente aperto, per una commessa custom (es.
    cartelli/transenne su misura) dove si chiede un anticipo prima di
    iniziare. A differenza della fattura normale (che nasce da un DDT/PGI),
    questa non tocca magazzino né Costo del Venduto: contabilmente
    l'acconto è una PASSIVITÀ (166000 Acconti da Clienti), non un ricavo —
    il ricavo si riconosce solo alla consegna vera. Questa tabella traccia
    quanto è stato già fatturato in acconto su ciascun ordine, per
    riferimento (vedi SalesOrder.acconto_fatturato_netto).

    LIMITE NOTO: la deduzione automatica dell'acconto dalla fattura finale
    (quella generata da billing() a partire dal DDT) non è ancora
    implementata — oggi è un promemoria per l'operatore, che deve tenerne
    conto manualmente quando fattura il saldo.
    """
    __tablename__ = "customer_advance_invoices"
    id = db.Column(db.Integer, primary_key=True)
    sales_order_id = db.Column(db.Integer, db.ForeignKey("sales_orders.id"), nullable=False)
    entry_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=False)
    net_amount = db.Column(db.Numeric(14, 2), nullable=False)
    vat_amount = db.Column(db.Numeric(14, 2), nullable=False)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order = db.relationship("SalesOrder", backref="advance_invoices")
    entry = db.relationship("JournalEntry")


class SalesOrderLine(db.Model):
    __tablename__ = "sales_order_lines"
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("sales_orders.id"), nullable=False)
    material_id = db.Column(db.Integer, db.ForeignKey("materials.id"), nullable=False)
    qty = db.Column(db.Numeric(14, 3), nullable=False)
    qty_delivered = db.Column(db.Numeric(14, 3), nullable=False, default=0)
    price = db.Column(db.Numeric(14, 4), nullable=False)
    material = db.relationship("Material")


class Delivery(db.Model):
    """
    DDT / Consegna (VL01N). Alla registrazione avviene l'USCITA MERCI (PGI):
    scarico giacenza + scrittura Costo del Venduto:
        Dare  Costo del Venduto (450000)
        Avere Magazzino Prodotti Finiti (160000)
    per qty × costo standard — esattamente come SAP (mov. 601).
    """
    __tablename__ = "deliveries"
    __table_args__ = (db.UniqueConstraint("doc_number", "company_id", name="uq_deliveries_docnum_company"),)
    id = db.Column(db.Integer, primary_key=True)
    doc_number = db.Column(db.String(20), nullable=False)
    doc_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    # Nullable: un DDT può coprire righe di PIÙ Ordini Cliente diversi (stesso
    # cliente, es. un'unica spedizione che evade 2 ordini aperti insieme).
    # Quando è così, order_id resta valorizzato con il PRIMO ordine scelto
    # (comodo per i riferimenti storici/stampe legacy), ma la fonte di verità
    # per "quali ordini copre davvero questo DDT" è sempre la proprietà
    # `orders` qui sotto, che li ricava dalle righe (DeliveryLine.
    # sales_order_line_id) — mai da questo campo da solo.
    order_id = db.Column(db.Integer, db.ForeignKey("sales_orders.id"), nullable=True)
    economic_subject_id = db.Column(db.Integer, db.ForeignKey("economic_subjects.id"), nullable=True)  # FIX: allineato alla migrazione reale (nullable=True), che non ha imposto NOT NULL sulle righe storiche
    # Multi-azienda (Fase 2) — vedi Quotation.company_id
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True)
    cogs_entry_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=True)
    billing_entry_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=True)
    # Fatture da Emettere (rateo attivo) — valorizzato quando il DDT è stato
    # spedito ma non ancora fatturato e si è generata la scrittura provvisoria
    # di competenza. Stornata automaticamente quando arriva la fattura vera
    # (billing()), per non contare il ricavo due volte.
    accrual_entry_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Vero quando MasterLogistic-WMS ha davvero confermato la giacenza al
    # momento della spedizione; False quando il DDT è stato registrato col
    # bypass (WMS non ancora collegato) — segnalato bene in elenco.
    stock_verified = db.Column(db.Boolean, default=True)
    # Fase 4 (progettazione parti mancanti, punto 4) — storno di dominio
    is_reversed = db.Column(db.Boolean, default=False)
    reversal_reason = db.Column(db.String(255))
    reversed_at = db.Column(db.DateTime)
    reversed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    order = db.relationship("SalesOrder", backref="deliveries")
    party = db.relationship("EconomicSubject")
    company = db.relationship("Company")
    cogs_entry = db.relationship("JournalEntry", foreign_keys=[cogs_entry_id])
    billing_entry = db.relationship("JournalEntry", foreign_keys=[billing_entry_id])
    lines = db.relationship("DeliveryLine", backref="delivery", cascade="all, delete-orphan")

    @property
    def total_net(self):
        return sum(float(l.qty) * float(l.price) for l in self.lines)

    @property
    def total_cogs(self):
        return sum(float(l.qty) * float(l.unit_cost) for l in self.lines)

    @property
    def is_billed(self):
        return self.billing_entry_id is not None

    @property
    def orders(self):
        """Insieme (senza duplicati) degli Ordini Cliente REALMENTE coperti
        da questo DDT, ricavati dalle righe — non da order_id, che su un DDT
        multi-ordine indica solo il primo scelto."""
        seen, result = set(), []
        for l in self.lines:
            so = l.sales_order_line.order if l.sales_order_line else (self.order if self.order_id else None)
            if so and so.id not in seen:
                seen.add(so.id)
                result.append(so)
        return result

    @property
    def is_multi_order(self):
        return len(self.orders) > 1


class DeliveryLine(db.Model):
    __tablename__ = "delivery_lines"
    id = db.Column(db.Integer, primary_key=True)
    delivery_id = db.Column(db.Integer, db.ForeignKey("deliveries.id"), nullable=False)
    material_id = db.Column(db.Integer, db.ForeignKey("materials.id"), nullable=False)
    # Riga d'ordine di origine — nullable per compatibilità con righe storiche
    # create prima di questo campo. Serve a ripristinare la riga ESATTA in
    # caso di storno: senza questo riferimento, un ordine con lo stesso
    # articolo su due righe (stesso SKU a prezzi diversi, nessun vincolo lo
    # impedisce) renderebbe ambiguo quale riga decrementare allo storno.
    sales_order_line_id = db.Column(db.Integer, db.ForeignKey("sales_order_lines.id"), nullable=True)
    qty = db.Column(db.Numeric(14, 3), nullable=False)
    price = db.Column(db.Numeric(14, 4), nullable=False)      # prezzo di vendita (dall'ordine)
    unit_cost = db.Column(db.Numeric(14, 4), nullable=False)  # costo standard AL MOMENTO del PGI
    material = db.relationship("Material")
    sales_order_line = db.relationship("SalesOrderLine")


# ══════════════════════════════════════════════════════════════
# CICLO PASSIVO MM — Ordine Acquisto → Entrata Merci → Verifica Fattura
# con THREE-WAY MATCH (Ordinato vs Ricevuto vs Fatturato)
# ══════════════════════════════════════════════════════════════
class PurchaseOrder(db.Model):
    """Ordine d'acquisto (ME21N)."""
    __tablename__ = "purchase_orders"
    __table_args__ = (db.UniqueConstraint("doc_number", "company_id", name="uq_purchase_orders_docnum_company"),)
    id = db.Column(db.Integer, primary_key=True)
    doc_number = db.Column(db.String(20), nullable=False)
    doc_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    economic_subject_id = db.Column(db.Integer, db.ForeignKey("economic_subjects.id"), nullable=True)  # FIX: allineato alla migrazione reale (nullable=True), che non ha imposto NOT NULL sulle righe storiche
    # Multi-azienda (Fase 2) — vedi Quotation.company_id
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True)
    note = db.Column(db.String(255))
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Cruscotto Ordini Fornitore stile MasterLogistic (logistics_bp):
    delivery_due_date = db.Column(db.Date, nullable=True)   # data consegna/ritiro concordata col fornitore
    confirmed = db.Column(db.Boolean, nullable=False, default=False)  # confermato dal fornitore
    pickup_mode = db.Column(db.String(20), nullable=False, default="consegnano_loro")  # consegnano_loro | ritiriamo_noi
    priority = db.Column(db.Integer, nullable=False, default=0)  # ordine manuale (drag&drop) nel cruscotto

    party = db.relationship("EconomicSubject")
    company = db.relationship("Company")
    lines = db.relationship("PurchaseOrderLine", backref="po", cascade="all, delete-orphan")

    @property
    def total_net(self):
        return sum(float(l.qty) * float(l.price) for l in self.lines)

    @property
    def status(self):
        recv = sum(float(l.qty_received or 0) for l in self.lines)
        inv = sum(float(l.qty_invoiced or 0) for l in self.lines)
        tot = sum(float(l.qty) for l in self.lines)
        if inv >= tot and tot > 0:
            return "fatturato"
        if recv >= tot and tot > 0:
            return "ricevuto"
        if recv > 0:
            return "parz. ricevuto"
        return "aperto"


class PurchaseOrderLine(db.Model):
    __tablename__ = "purchase_order_lines"
    id = db.Column(db.Integer, primary_key=True)
    po_id = db.Column(db.Integer, db.ForeignKey("purchase_orders.id"), nullable=False)
    material_id = db.Column(db.Integer, db.ForeignKey("materials.id"), nullable=False)
    qty = db.Column(db.Numeric(14, 3), nullable=False)
    price = db.Column(db.Numeric(14, 4), nullable=False)          # prezzo ordine (base del match)
    qty_received = db.Column(db.Numeric(14, 3), nullable=False, default=0)
    qty_invoiced = db.Column(db.Numeric(14, 3), nullable=False, default=0)
    material = db.relationship("Material")


class GoodsReceipt(db.Model):
    """
    Entrata merci (MIGO mov. 101). Scrittura, come SAP:
        Dare  Magazzino (conto del tipo articolo)
        Avere Ricevimenti da fatturare — EM/RF (165000)
    al PREZZO ORDINE. Il conto EM/RF verrà chiuso dalla Verifica Fattura.
    """
    __tablename__ = "goods_receipts"
    __table_args__ = (db.UniqueConstraint("doc_number", "company_id", name="uq_goods_receipts_docnum_company"),)
    id = db.Column(db.Integer, primary_key=True)
    doc_number = db.Column(db.String(20), nullable=False)
    doc_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    # Nullable: un'Entrata Merci può coprire righe di PIÙ Ordini d'Acquisto
    # diversi (stesso fornitore, un solo DDT ricevuto che evade 2+ OA
    # aperti). po_id resta valorizzato con il PRIMO ordine scelto per i
    # riferimenti legacy, ma la fonte di verità è sempre la property `pos`
    # qui sotto, ricavata dalle righe (GoodsReceiptLine.po_line).
    po_id = db.Column(db.Integer, db.ForeignKey("purchase_orders.id"), nullable=True)
    # Multi-azienda — vedi Quotation.company_id
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True)
    ddt_vendor_ref = db.Column(db.String(60))  # n. DDT del fornitore
    journal_entry_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Fase 4 (progettazione parti mancanti, punto 4) — storno di dominio
    is_reversed = db.Column(db.Boolean, default=False)
    reversal_reason = db.Column(db.String(255))
    reversed_at = db.Column(db.DateTime)
    reversed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    po = db.relationship("PurchaseOrder", backref="receipts")
    company = db.relationship("Company")
    journal_entry = db.relationship("JournalEntry", foreign_keys=[journal_entry_id])
    lines = db.relationship("GoodsReceiptLine", backref="receipt", cascade="all, delete-orphan")

    @property
    def pos(self):
        """Insieme (senza duplicati) degli Ordini d'Acquisto REALMENTE
        coperti da questa Entrata Merci, ricavati dalle righe."""
        seen, result = set(), []
        for l in self.lines:
            po = l.po_line.po if l.po_line else (self.po if self.po_id else None)
            if po and po.id not in seen:
                seen.add(po.id)
                result.append(po)
        return result

    @property
    def is_multi_order(self):
        return len(self.pos) > 1


class GoodsReceiptLine(db.Model):
    __tablename__ = "goods_receipt_lines"
    id = db.Column(db.Integer, primary_key=True)
    receipt_id = db.Column(db.Integer, db.ForeignKey("goods_receipts.id"), nullable=False)
    po_line_id = db.Column(db.Integer, db.ForeignKey("purchase_order_lines.id"), nullable=False)
    qty = db.Column(db.Numeric(14, 3), nullable=False)
    po_line = db.relationship("PurchaseOrderLine")


class InvoiceVerificationLine(db.Model):
    """Riga di dettaglio della Verifica Fattura (MIRO/three-way match) —
    stesso ruolo di GoodsReceiptLine ma per la fattura fornitore: senza
    questa tabella non c'era modo di sapere, dato un KR generato da MM,
    quali righe ordine e quali quantità aveva davvero fatturato — quindi
    nessun modo sicuro di ripristinare qty_invoiced se il documento
    veniva eliminato. Popolata da blueprints/mm/routes.py, invoice_verification()."""
    __tablename__ = "invoice_verification_lines"
    id = db.Column(db.Integer, primary_key=True)
    entry_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=False)
    po_line_id = db.Column(db.Integer, db.ForeignKey("purchase_order_lines.id"), nullable=False)
    qty = db.Column(db.Numeric(14, 3), nullable=False)
    po_line = db.relationship("PurchaseOrderLine")


# ══════════════════════════════════════════════════════════════
# PAGHE / F24 — import PDF con revisione prima della contabilizzazione
# ══════════════════════════════════════════════════════════════
class PayrollEmployeeMapping(db.Model):
    __tablename__ = "payroll_employee_mappings"
    id = db.Column(db.Integer, primary_key=True)
    employee_key = db.Column(db.String(80), unique=True, nullable=False)  # CF, oppure codice Zucchetti
    employee_name = db.Column(db.String(160), nullable=False)
    cost_center_id = db.Column(db.Integer, db.ForeignKey("cost_centers.id"), nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    cost_center = db.relationship("CostCenter")


class PayrollAccountConfig(db.Model):
    __tablename__ = "payroll_account_configs"
    id = db.Column(db.Integer, primary_key=True)
    wage_expense_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    employer_burden_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    net_salary_payable_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    inps_payable_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    withholding_payable_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    bank_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    imu_expense_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    accrued_holiday_expense_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    accrued_permission_expense_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    accrued_thirteenth_expense_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    accrued_payable_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    tfr_expense_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    tfr_fund_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True)
    # Aliquote SOLO come comodo valore di precompilazione in revisione: l'importo
    # che viene davvero registrato è sempre quello (eventualmente corretto a mano)
    # visibile e modificabile riga per riga nella maschera di revisione — mai
    # un'aliquota applicata alla cieca in fase di contabilizzazione.
    employee_inps_rate = db.Column(db.Numeric(5, 2), nullable=True)      # es. 9.19 — quota INPS a carico dipendente, dentro le trattenute
    employer_contribution_rate = db.Column(db.Numeric(5, 2), nullable=True)  # es. 30.00 — oneri INPS/INAIL a carico azienda, NON dentro il lordo busta
    wage_expense_account = db.relationship("Account", foreign_keys=[wage_expense_account_id])
    employer_burden_account = db.relationship("Account", foreign_keys=[employer_burden_account_id])
    net_salary_payable_account = db.relationship("Account", foreign_keys=[net_salary_payable_account_id])
    inps_payable_account = db.relationship("Account", foreign_keys=[inps_payable_account_id])
    withholding_payable_account = db.relationship("Account", foreign_keys=[withholding_payable_account_id])
    bank_account = db.relationship("Account", foreign_keys=[bank_account_id])
    imu_expense_account = db.relationship("Account", foreign_keys=[imu_expense_account_id])
    accrued_holiday_expense_account = db.relationship("Account", foreign_keys=[accrued_holiday_expense_account_id])
    accrued_permission_expense_account = db.relationship("Account", foreign_keys=[accrued_permission_expense_account_id])
    accrued_thirteenth_expense_account = db.relationship("Account", foreign_keys=[accrued_thirteenth_expense_account_id])
    accrued_payable_account = db.relationship("Account", foreign_keys=[accrued_payable_account_id])
    tfr_expense_account = db.relationship("Account", foreign_keys=[tfr_expense_account_id])
    tfr_fund_account = db.relationship("Account", foreign_keys=[tfr_fund_account_id])


class F24ImuMapping(db.Model):
    """Optional remembered default for an IMU municipality/tribute pair."""
    __tablename__ = "f24_imu_mappings"
    id = db.Column(db.Integer, primary_key=True)
    municipality_code = db.Column(db.String(8), nullable=False)
    tribute_code = db.Column(db.String(12), nullable=False)
    expense_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)
    cost_center_id = db.Column(db.Integer, db.ForeignKey("cost_centers.id"), nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint("municipality_code", "tribute_code", name="uq_f24_imu_mapping"),)
    expense_account = db.relationship("Account")
    cost_center = db.relationship("CostCenter")


class PayrollImport(db.Model):
    __tablename__ = "payroll_imports"
    id = db.Column(db.Integer, primary_key=True)
    document_kind = db.Column(db.String(12), nullable=False)  # PAYSLIP, F24
    filename = db.Column(db.String(255), nullable=False)
    fingerprint = db.Column(db.String(64), nullable=False, unique=True)
    document_reference = db.Column(db.String(120), nullable=True)
    document_date = db.Column(db.Date, nullable=True)
    parsed_data = db.Column(db.Text, nullable=False)  # reviewed extraction snapshot, JSON
    status = db.Column(db.String(20), nullable=False, default="review")
    journal_entry_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    posted_at = db.Column(db.DateTime, nullable=True)
    journal_entry = db.relationship("JournalEntry")

class PayrollEmployeeAllocation(db.Model):
    """Percentual split; legacy PayrollEmployeeMapping.cost_center_id remains readable."""
    __tablename__ = "payroll_employee_allocations"
    id = db.Column(db.Integer, primary_key=True)
    mapping_id = db.Column(db.Integer, db.ForeignKey("payroll_employee_mappings.id"), nullable=False)
    cost_center_id = db.Column(db.Integer, db.ForeignKey("cost_centers.id"), nullable=False)
    percentage = db.Column(db.Numeric(5, 2), nullable=False)
    mapping = db.relationship("PayrollEmployeeMapping", backref=db.backref("allocations", cascade="all, delete-orphan"))
    cost_center = db.relationship("CostCenter")
    __table_args__ = (db.UniqueConstraint("mapping_id", "cost_center_id", name="uq_payroll_mapping_center"),)


class AllocationSplit(db.Model):
    """Generic future-ready allocation for AP/AR documents and commercial lines."""
    __tablename__ = "allocation_splits"
    id = db.Column(db.Integer, primary_key=True)
    document_type = db.Column(db.String(30), nullable=False)
    document_id = db.Column(db.Integer, nullable=False)
    document_line_id = db.Column(db.Integer, nullable=True)
    cost_center_id = db.Column(db.Integer, db.ForeignKey("cost_centers.id"), nullable=False)
    percentage = db.Column(db.Numeric(5, 2), nullable=False)
    cost_center = db.relationship("CostCenter")
    __table_args__ = (db.UniqueConstraint("document_type", "document_id", "document_line_id", "cost_center_id", name="uq_allocation_split_target_center"),)

# ══════════════════════════════════════════════════════════════
# RFQ MM — richiesta d'offerta, confronto, scelta e conversione in OA
# ══════════════════════════════════════════════════════════════
class RequestForQuotation(db.Model):
    __tablename__ = "requests_for_quotation"
    __table_args__ = (db.UniqueConstraint("rfq_number", "company_id", name="uq_rfq_docnum_company"),)
    id = db.Column(db.Integer, primary_key=True)
    rfq_number = db.Column(db.String(30), nullable=False)
    request_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    material_id = db.Column(db.Integer, db.ForeignKey("materials.id"), nullable=False)
    # Multi-azienda (Fase 2) — vedi Quotation.company_id
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True)
    qty = db.Column(db.Numeric(14, 3), nullable=False)
    required_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="aperta")  # aperta|aggiudicata|ordinata
    notes = db.Column(db.String(300))
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    material = db.relationship("Material")
    company = db.relationship("Company")
    offers = db.relationship("SupplierQuotation", backref="rfq", cascade="all, delete-orphan")


class RfqDelivery(db.Model):
    """Traccia ogni inoltro di una RFQ a un fornitore selezionato."""
    __tablename__ = "rfq_deliveries"
    id = db.Column(db.Integer, primary_key=True)
    rfq_id = db.Column(db.Integer, db.ForeignKey("requests_for_quotation.id"), nullable=False, index=True)
    economic_subject_id = db.Column(db.Integer, db.ForeignKey("economic_subjects.id"), nullable=False)
    recipient_email = db.Column(db.String(120), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="inviata")  # inviata|errore
    error_message = db.Column(db.String(500))
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    sent_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    rfq = db.relationship("RequestForQuotation", backref=db.backref("deliveries", cascade="all, delete-orphan"))
    supplier = db.relationship("EconomicSubject")
    sent_by = db.relationship("User")


# ══════════════════════════════════════════════════════════════
# BANCHE — RiBa "salvo buon fine" e Anticipo Fatture.
#
# Sono due strumenti diversi anche se lo schema che li regge è lo
# stesso (vedi services/bank_advances.py per la logica):
#   - RiBa SBF: strumento di INCASSO — la banca anticipa contro un
#     effetto (Ricevuta Bancaria) generato alla scadenza della fattura.
#   - Anticipo Fatture: FINANZIAMENTO — la banca anticipa contro una
#     fattura non ancora scaduta, indipendentemente da come poi verrà
#     incassata.
# In entrambi i casi il credito verso il cliente (InvoiceInstallment)
# NON si chiude alla presentazione: si apre solo un debito verso la
# banca pari all'anticipo. Si chiude — credito E debito insieme —
# solo al buon fine. Se va insoluto, si storna solo il debito verso
# la banca: il credito verso il cliente torna aperto (più eventuali
# spese di insoluto, da registrare a parte).
# ══════════════════════════════════════════════════════════════
class BankAdvance(db.Model):
    """Testata di una distinta di anticipo bancario (RiBa SBF o Anticipo
    Fatture) — può raggruppare più rate cliente (BankAdvanceLine), anche
    di clienti diversi, così come si fa davvero in banca con una distinta."""
    __tablename__ = "bank_advances"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True)
    tipo = db.Column(db.String(20), nullable=False)  # 'riba_sbf' | 'anticipo_fatture'
    doc_number = db.Column(db.String(20), unique=True, nullable=False)
    doc_date = db.Column(db.Date, nullable=False, default=date.today)
    bank_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)  # Banca c/c che riceve l'accredito

    gross_amount = db.Column(db.Numeric(14, 2), nullable=False)          # totale nominale anticipato (somma righe)
    bank_charges_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)  # commissioni + interessi, addebitati subito

    advance_entry_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=False)  # scrittura di presentazione/accredito

    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    company = db.relationship("Company")
    bank_account = db.relationship("Account")
    advance_entry = db.relationship("JournalEntry", foreign_keys=[advance_entry_id])
    created_by = db.relationship("User")

    @property
    def stato(self):
        """Calcolato dalle righe, mai salvato: 'aperto' se almeno una riga
        è ancora in_corso, altrimenti 'chiuso' (tutte con esito)."""
        if any(l.esito == "in_corso" for l in self.lines):
            return "aperto"
        return "chiuso"

    @property
    def net_credited(self):
        """Importo netto realmente accreditato in banca (gross - oneri)."""
        return Decimal(str(self.gross_amount)) - Decimal(str(self.bank_charges_amount or 0))


class BankAdvanceLine(db.Model):
    """Una rata cliente (InvoiceInstallment) inclusa in una distinta di
    anticipo — con l'esito che matura quando arriva a scadenza."""
    __tablename__ = "bank_advance_lines"

    id = db.Column(db.Integer, primary_key=True)
    advance_id = db.Column(db.Integer, db.ForeignKey("bank_advances.id"), nullable=False)
    installment_id = db.Column(db.Integer, db.ForeignKey("invoice_installments.id"), nullable=False)
    amount = db.Column(db.Numeric(14, 2), nullable=False)  # quota anticipata di questa rata

    esito = db.Column(db.String(15), nullable=False, default="in_corso")  # in_corso | buon_fine | insoluto
    esito_entry_id = db.Column(db.Integer, db.ForeignKey("journal_entries.id"), nullable=True)
    esito_at = db.Column(db.DateTime, nullable=True)

    advance = db.relationship("BankAdvance", backref="lines")
    installment = db.relationship("InvoiceInstallment")
    esito_entry = db.relationship("JournalEntry", foreign_keys=[esito_entry_id])


class SupplierQuotation(db.Model):
    __tablename__ = "supplier_quotations"
    id = db.Column(db.Integer, primary_key=True)
    rfq_id = db.Column(db.Integer, db.ForeignKey("requests_for_quotation.id"), nullable=False)
    economic_subject_id = db.Column(db.Integer, db.ForeignKey("economic_subjects.id"), nullable=False)
    offer_ref = db.Column(db.String(60))
    unit_price = db.Column(db.Numeric(14, 4), nullable=False)
    lead_days = db.Column(db.Integer, nullable=True)
    valid_until = db.Column(db.Date, nullable=True)
    selected = db.Column(db.Boolean, nullable=False, default=False)
    purchase_order_id = db.Column(db.Integer, db.ForeignKey("purchase_orders.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    supplier = db.relationship("EconomicSubject")
    purchase_order = db.relationship("PurchaseOrder")
