"""Tabelle del corso «Ragioneria internazionale IFRS e OIC» (Firenze · Amministrazione, terzo passo).
Separate dai lavori ERP e dal questionario di ragioneria: si creano da sole con db.create_all()."""
from ...db import adesso, db


class RiModulo(db.Model):
    """Lavoro dell'allievo su un modulo: passi spuntati, risultati del laboratorio, test, autovalutazione e voto del docente."""
    __tablename__ = "ri_modulo"
    __table_args__ = (db.UniqueConstraint("utente_id", "modulo", name="uq_ri_modulo"),)
    id = db.Column(db.Integer, primary_key=True)
    utente_id = db.Column(db.Integer, db.ForeignKey("utente.id", ondelete="CASCADE"), nullable=False, index=True)
    modulo = db.Column(db.Integer, nullable=False)
    passi = db.Column(db.Text, default="[]")            # json: indici dei passi spuntati
    valori = db.Column(db.Text, default="{}")           # json: risultati scritti nel laboratorio
    lab_esito = db.Column(db.Text, default="{}")        # json: {campo: true/false} calcolato dal server
    lab_ok = db.Column(db.Boolean, default=False, nullable=False)
    quiz_risposte = db.Column(db.Text, default="")      # json: indice originale scelto per ogni domanda
    quiz_punti = db.Column(db.Integer, nullable=True)
    quiz_superato = db.Column(db.Boolean, nullable=True)
    quiz_tentativi = db.Column(db.Integer, default=0, nullable=False)
    autovalutazione = db.Column(db.Text, default="")    # json: 4 punteggi 0-25 dati dall'allievo
    voto = db.Column(db.Text, default="")               # json: 4 punteggi 0-25 dati dal docente
    nota_docente = db.Column(db.Text, default="")
    corretto_il = db.Column(db.DateTime, nullable=True)
    aggiornato = db.Column(db.DateTime, default=adesso, nullable=False)


class RiScrittura(db.Model):
    """Registrazione del libro giornale simulato con l'esito del confronto con le scritture del manuale."""
    __tablename__ = "ri_scrittura"
    id = db.Column(db.Integer, primary_key=True)
    utente_id = db.Column(db.Integer, db.ForeignKey("utente.id", ondelete="CASCADE"), nullable=False, index=True)
    modulo = db.Column(db.Integer, nullable=False, index=True)
    data = db.Column(db.String(10), default="")
    ledger = db.Column(db.String(4), nullable=False)
    riferimento = db.Column(db.String(40), nullable=False)
    testo = db.Column(db.String(160), default="")
    righe = db.Column(db.Text, nullable=False)           # json: [{conto, dare, avere}] in centesimi
    totale_cent = db.Column(db.Integer, nullable=False)
    ok = db.Column(db.Boolean, default=False, nullable=False)
    modello = db.Column(db.String(120), default="")      # titolo della scrittura del manuale riconosciuta
    esito = db.Column(db.String(300), default="")
    creato = db.Column(db.DateTime, default=adesso, nullable=False)


class RiEvento(db.Model):
    """Diario del corso: serve al docente per vedere chi ha lavorato, quanto e che cosa ha fatto."""
    __tablename__ = "ri_evento"
    id = db.Column(db.Integer, primary_key=True)
    utente_id = db.Column(db.Integer, db.ForeignKey("utente.id", ondelete="CASCADE"), nullable=False, index=True)
    quando = db.Column(db.DateTime, default=adesso, nullable=False, index=True)
    modulo = db.Column(db.Integer, nullable=True)
    tipo = db.Column(db.String(20), default="")          # pagina · laboratorio · scrittura · test · passo · valutazione · voto
    testo = db.Column(db.String(300), default="")
