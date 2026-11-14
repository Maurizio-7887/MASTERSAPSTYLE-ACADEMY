"""Statistiche aggregate pubbliche, senza dati identificativi degli allievi."""
from flask import Blueprint, jsonify, request

from ...db import Utente, db

bp = Blueprint("public_stats", __name__)

# Il dato aggregato può essere letto solo dal sito istituzionale.
_ORIGINI_AMMESSE = {
    "https://www.mauriziogustinicchiconsulting.it",
    "https://mauriziogustinicchiconsulting.it",
}


@bp.get("/api/pubblico/allievi-count")
def allievi_count():
    """Restituisce il numero di account allievo attivi, senza dati personali."""
    totale = (
        db.session.query(db.func.count(db.distinct(Utente.id)))
        .filter(Utente.ruolo == "allievo", Utente.attivo.is_(True))
        .scalar()
    ) or 0

    risposta = jsonify(count=int(totale))
    origine = request.headers.get("Origin", "").rstrip("/")
    if origine in _ORIGINI_AMMESSE:
        risposta.headers["Access-Control-Allow-Origin"] = origine
        risposta.headers["Vary"] = "Origin"
    risposta.headers["Cache-Control"] = "public, max-age=300"
    return risposta
