"""FB02 — modifica documento: solo testi, mai importi, conti o date.

Come in SAP, ciò che ha effetto contabile non si modifica: si storna e si
registra di nuovo. Il riferimento delle fatture (DR, DG, KR) è il numero del
documento fiscale e resta bloccato. Ogni modifica è registrata con autore e data.
"""
from extensions import db
from models import JournalEntryChange

RIFERIMENTO_BLOCCATO = ("DR", "DG", "KR")


class DocumentoError(ValueError):
    pass


def _log(entry, field, old, new, user_id):
    db.session.add(JournalEntryChange(entry_id=entry.id, field=field, old_value=(old or "")[:255],
                                      new_value=(new or "")[:255], changed_by_id=user_id))


def modifica_testi(entry, description, reference, testi_righe, user_id=None):
    """testi_righe: {line_id: nuovo testo}. Ritorna il numero di campi cambiati."""
    cambi = 0
    description = (description or "").strip()[:255]
    if description != (entry.description or ""):
        _log(entry, "testata.testo", entry.description, description, user_id)
        entry.description = description
        cambi += 1
    reference = (reference or "").strip()[:80]
    if reference != (entry.reference or ""):
        if entry.doc_type in RIFERIMENTO_BLOCCATO:
            raise DocumentoError("Il riferimento di una fattura è il numero del documento fiscale: non si modifica.")
        _log(entry, "testata.riferimento", entry.reference, reference, user_id)
        entry.reference = reference
        cambi += 1
    righe = {l.id: l for l in entry.lines}
    for line_id, testo in testi_righe.items():
        line = righe.get(line_id)
        if line is None:
            raise DocumentoError("Riga non appartenente al documento.")
        testo = (testo or "").strip()[:255]
        if testo != (line.description or ""):
            _log(entry, f"riga {line_id}.testo", line.description, testo, user_id)
            line.description = testo
            cambi += 1
    db.session.commit()
    return cambi
