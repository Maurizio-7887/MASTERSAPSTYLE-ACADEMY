"""FS00 — anagrafica conti di contabilità generale.

Regole, allineate al comportamento SAP:
- il numero conto è univoco e non si modifica dopo la creazione;
- la natura del conto (attivo, passivo, costo, ricavo) non si cambia se il
  conto ha già movimenti, perché cambierebbe la classificazione dei saldi;
- un conto usato dalla determinazione automatica (OBYC / Account mapping)
  non può essere disattivato, altrimenti si bloccano i flussi automatici;
- la rilevanza CO esiste solo per i conti economici.
"""
import re

from extensions import db
from models import Account, AccountMapping, JournalLine

TIPI_CONTO = {
    "patrimoniale_attivo": "Stato Patrimoniale, Attivo",
    "patrimoniale_passivo": "Stato Patrimoniale, Passivo",
    "costo": "Conto Economico, Costi",
    "ricavo": "Conto Economico, Ricavi",
}
_CO_TYPE = {"costo": "COST", "ricavo": "REVENUE"}
_CODE_RE = re.compile(r"^[0-9A-Z][0-9A-Z.\-]{0,9}$")


class AccountMasterError(ValueError):
    pass


def normalizza_codice(raw):
    return (raw or "").strip().upper()


def ha_movimenti(account):
    return db.session.query(JournalLine.id).filter_by(account_id=account.id).first() is not None


def usato_in_mapping(account):
    return AccountMapping.query.filter_by(account_id=account.id).first()


def _valida_nome_tipo(name, account_type):
    name = (name or "").strip()
    if not name:
        raise AccountMasterError("La descrizione del conto è obbligatoria.")
    if len(name) > 120:
        raise AccountMasterError("La descrizione può avere al massimo 120 caratteri.")
    if account_type not in TIPI_CONTO:
        raise AccountMasterError("Natura del conto non valida.")
    return name


def _applica_co(account, cost_relevant):
    if cost_relevant and account.account_type not in _CO_TYPE:
        raise AccountMasterError("La rilevanza CO è ammessa solo per conti di costo o di ricavo.")
    account.cost_relevant = bool(cost_relevant)
    account.cost_relevant_type = _CO_TYPE[account.account_type] if cost_relevant else None


def crea_conto(code, name, account_type, cost_relevant=False):
    code = normalizza_codice(code)
    if not _CODE_RE.match(code):
        raise AccountMasterError("Numero conto non valido: da 1 a 10 caratteri, solo cifre, lettere, punto o trattino.")
    if Account.query.filter_by(code=code).first():
        raise AccountMasterError(f"Il conto {code} esiste già.")
    name = _valida_nome_tipo(name, account_type)
    if cost_relevant and account_type not in _CO_TYPE:
        raise AccountMasterError("La rilevanza CO è ammessa solo per conti di costo o di ricavo.")
    account = Account(code=code, name=name, account_type=account_type, active=True)
    _applica_co(account, cost_relevant)
    db.session.add(account)
    db.session.commit()
    return account


def modifica_conto(account, name, account_type, cost_relevant=False, active=True):
    name = _valida_nome_tipo(name, account_type)
    if cost_relevant and account_type not in _CO_TYPE:
        raise AccountMasterError("La rilevanza CO è ammessa solo per conti di costo o di ricavo.")
    if account_type != account.account_type and ha_movimenti(account):
        raise AccountMasterError(
            f"Il conto {account.code} ha movimenti: la natura non si può cambiare. "
            "Crea un nuovo conto e gira i saldi con una scrittura.")
    if not active and account.active:
        mapping = usato_in_mapping(account)
        if mapping:
            raise AccountMasterError(
                f"Il conto {account.code} è usato nella determinazione automatica "
                f"({mapping.label}): cambia prima la mappatura, poi disattivalo.")
    account.name = name
    account.account_type = account_type
    account.active = bool(active)
    _applica_co(account, cost_relevant)
    db.session.commit()
    return account
