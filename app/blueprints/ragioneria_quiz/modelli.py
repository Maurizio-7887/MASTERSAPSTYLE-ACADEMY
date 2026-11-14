"""Tabelle del questionario di ragioneria: separate dai lavori ERP (StatoLavoro, Consegna, TentativoEsame).
Si creano da sole con db.create_all() all'avvio: nessuna modifica alle tabelle esistenti."""
from ...db import adesso, db


class TentativoQuiz(db.Model):
    __tablename__ = "rq_tentativo"
    id = db.Column(db.Integer, primary_key=True)
    utente_id = db.Column(db.Integer, db.ForeignKey("utente.id"), nullable=False, index=True)
    modalita = db.Column(db.String(20), nullable=False)          # allenamento | verifica | diagnostica | finale | ripasso
    unita = db.Column(db.String(4), nullable=True)               # Q01…Q20 per allenamento/verifica
    versione_banca = db.Column(db.String(20), nullable=False)
    prova = db.Column(db.Text, nullable=False)                   # json: fotografia immutabile dei quesiti estratti
    stato = db.Column(db.String(12), nullable=False, default="in_corso")   # in_corso | consegnato | annullato
    iniziato = db.Column(db.DateTime, default=adesso, nullable=False)
    consegnato = db.Column(db.DateTime, nullable=True)
    punti = db.Column(db.Integer, nullable=True)
    massimo = db.Column(db.Integer, nullable=True)
    punti_teoria = db.Column(db.Integer, nullable=True)
    max_teoria = db.Column(db.Integer, nullable=True)
    punti_app = db.Column(db.Integer, nullable=True)
    max_app = db.Column(db.Integer, nullable=True)
    superato = db.Column(db.Boolean, nullable=True)
    aiuti = db.Column(db.Integer, default=0, nullable=False)

    utente = db.relationship("Utente")

    @property
    def percentuale(self):
        return round(100 * self.punti / self.massimo) if self.massimo else None


class RispostaQuiz(db.Model):
    __tablename__ = "rq_risposta"
    __table_args__ = (db.UniqueConstraint("tentativo_id", "qid", name="uq_rq_risposta"),)
    id = db.Column(db.Integer, primary_key=True)
    tentativo_id = db.Column(db.Integer, db.ForeignKey("rq_tentativo.id"), nullable=False, index=True)
    qid = db.Column(db.String(12), nullable=False)
    posizione = db.Column(db.Integer, nullable=False)
    scelta = db.Column(db.Text, nullable=True)                   # json: lista di ID opzione
    corretta = db.Column(db.Boolean, nullable=True)              # calcolata dal server
    aiuto = db.Column(db.Boolean, default=False, nullable=False)
    data = db.Column(db.DateTime, default=adesso, nullable=False)


class EventoQuiz(db.Model):
    __tablename__ = "rq_evento"
    id = db.Column(db.Integer, primary_key=True)
    utente_id = db.Column(db.Integer, db.ForeignKey("utente.id"), nullable=False, index=True)   # allievo interessato
    autore_id = db.Column(db.Integer, db.ForeignKey("utente.id"), nullable=False)
    tentativo_id = db.Column(db.Integer, nullable=True)
    tipo = db.Column(db.String(24), nullable=False)              # tentativo_extra | annullato
    chiave = db.Column(db.String(24), nullable=True)             # es. verifica:Q05, finale
    nota = db.Column(db.String(300), default="")
    data = db.Column(db.DateTime, default=adesso, nullable=False)


class PrimaNotaRisposta(db.Model):
    """Esercitazione di prima nota: ogni registrazione scritta dall'allievo e la correzione del server."""
    __tablename__ = "rq_primanota"
    id = db.Column(db.Integer, primary_key=True)
    utente_id = db.Column(db.Integer, db.ForeignKey("utente.id"), nullable=False, index=True)
    eid = db.Column(db.String(16), nullable=False, index=True)    # Q07-03 (banca) oppure M17-02 (scrittura svolta del manuale)
    righe = db.Column(db.Text, nullable=False)                   # json: [[conto, D/A, centesimi], …] scritte dall'allievo
    corretta = db.Column(db.Boolean, nullable=False)
    aiuto = db.Column(db.Boolean, default=False, nullable=False)
    data = db.Column(db.DateTime, default=adesso, nullable=False)
