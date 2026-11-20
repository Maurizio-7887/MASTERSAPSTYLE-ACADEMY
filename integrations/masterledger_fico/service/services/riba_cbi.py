"""
services/riba_cbi.py — Generazione del flusso Ri.Ba. in tracciato CBI a
120 caratteri, secondo le specifiche interbancarie CBI standard adottate
dai portali corporate di Intesa Sanpaolo (Inbiz), a partire da una
distinta BankAdvance di tipo 'riba_sbf' già presentata in MasterLedgerLight.

Layout posizioni (1-indexed, inclusive) — da specifica Intesa Sanpaolo Inbiz:

  IB (testa flusso): 1-2 "IB" · 3-7 SIA mittente · 8-12 ABI assuntrice ·
    13-18 data AAMMGG · 19-38 nome supporto · 39-114 spazi ·
    115-120 qualificatore "E    "
  14 (disposizione): 1-2 "14" · 3-9 progr. · 10-21 spazi · 22-27 scadenza
    AAMMGG · 28-32 causale fissa "30000" · 33-45 importo centesimi (13) ·
    46 segno fisso "-" · 47-51 ABI assuntrice · 52-56 CAB sportello
    creditore · 57-68 c/c creditore · 69-73 ABI banca debitore ·
    74-78 CAB banca debitore · 79-90 spazi · 91-95 SIA creditore ·
    96 tipo codice creditore fisso "4" · 97-112 CF/P.IVA creditore ·
    113-120 spazi
  20 (anagrafica creditore): 1-2 "20" · 3-9 progr. · 10-33 ragione
    sociale riga1 (24) · 34-57 indirizzo (24) · 58-81 ragione sociale
    riga2 (24) · 82-105 località (24) · 106-120 spazi
  30 (anagrafica debitore): 1-2 "30" · 3-9 progr. · 10-69 ragione
    sociale (60) · 70-85 codice fiscale (16) · 86-120 spazi
  40 (indirizzo debitore): 1-2 "40" · 3-9 progr. · 10-39 indirizzo (30) ·
    40-44 CAP (5) · 45-69 comune (25) · 70-71 provincia (2) ·
    72-120 spazi
  50 (descrizione/riferimenti): 1-2 "50" · 3-9 progr. · 10-89
    descrizione credito (80) · 90-109 spazi · 110-120 P.IVA creditore (11)
  70 (informazioni di servizio): 1-2 "70" · 3-9 progr. · 10-120 spazi
  EF (coda flusso): 1-2 "EF" · 3-7 SIA mittente · 8-12 ABI assuntrice ·
    13-18 data AAMMGG · 19-38 nome supporto (= IB) · 39-44 n. totale
    disposizioni (6) · 45-59 importo totale a debito centesimi (15) ·
    60-74 importo totale a credito, sempre zero (15) · 75-81 n. totale
    record del file incl. IB/EF (7) · 82-114 spazi · 115-120
    qualificatore "E    "

Regole di formato: ASCII puro maiuscolo, niente accenti/simboli (&,/,'
ecc. — sostituiti con lo spazio o l'equivalente senza accento), campi N
allineati a destra zero-filled, campi AN allineati a sinistra space-filled,
CRLF a fine record, 120 caratteri esatti per record.

ATTENZIONE: questo layout segue la specifica Intesa Sanpaolo Inbiz che
ci è stata fornita. Se la distinta va presentata a una banca diversa da
Intesa, le posizioni vanno riverificate col manuale tecnico di
quell'altra banca prima di qualunque invio reale — e in ogni caso,
anche con Intesa, il primo invio va sempre fatto in ambiente di test.
"""
import re
import unicodedata
from decimal import Decimal

RECORD_LEN = 120
ABI_INTESA = "03069"  # usato come fallback se non deducibile dall'IBAN azienda


class RibaCbiError(ValueError):
    """Dati mancanti o non validi per generare il flusso."""


_SOSTITUZIONI_SIMBOLI = {"&": "E", "/": " ", "'": " ", "\"": " ", "@": " "}


def _sanitizza(value):
    """ASCII puro, maiuscolo, senza accenti né simboli non ammessi dal
    parser Inbiz (regola esplicita del punto critico n.4)."""
    if value is None:
        return ""
    s = str(value)
    for simbolo, sostituto in _SOSTITUZIONI_SIMBOLI.items():
        s = s.replace(simbolo, sostituto)
    # Rimuove accenti (È→E, é→e, ecc.) via normalizzazione NFKD + ASCII
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = s.upper()
    # Qualunque altro carattere non alfanumerico/spazio/punteggiatura di base → spazio
    s = re.sub(r"[^A-Z0-9 .,\-]", " ", s)
    return s


def _an(value, length):
    """Campo alfanumerico: sanitizzato, allineato a sinistra, space-filled."""
    s = _sanitizza(value)[:length]
    return s.ljust(length, " ")


def _n(value, length):
    """Campo numerico: allineato a destra, zero-filled. value già in unità
    intere del campo (es. già in centesimi se il campo è un importo)."""
    try:
        n = int(Decimal(str(value or 0)))
    except Exception:
        raise RibaCbiError(f"Valore numerico non valido per un campo di {length} caratteri: {value!r}")
    if n < 0:
        raise RibaCbiError("I campi numerici del tracciato non ammettono segno (il segno è un campo a parte).")
    s = str(n)
    if len(s) > length:
        raise RibaCbiError(f"Valore {n} troppo lungo per il campo numerico di {length} caratteri.")
    return s.rjust(length, "0")


def _centesimi(importo):
    return int((Decimal(str(importo or 0)) * 100).to_integral_value())


def _data_aammgg(d):
    if not d:
        raise RibaCbiError("Data mancante per il flusso Ri.Ba.")
    return d.strftime("%y%m%d")


def _abi_cab_conto_da_iban(iban, label):
    """Estrae ABI (5)/CAB (5)/conto (12) da un IBAN italiano (27 caratteri:
    IT + 2 cifre controllo + 1 CIN + 5 ABI + 5 CAB + 12 conto)."""
    if not iban:
        raise RibaCbiError(f"IBAN mancante per {label}.")
    iban = iban.replace(" ", "").upper()
    if not iban.startswith("IT") or len(iban) != 27:
        raise RibaCbiError(f"IBAN non valido o non italiano per {label}: {iban!r}.")
    return iban[5:10], iban[10:15], iban[15:27]


def _record_ib(company, doc_date, nome_supporto):
    r = "IB"
    r += _an(company.codice_sia_cbi, 5)
    abi_assuntrice, _, _ = _abi_cab_conto_da_iban(company.iban, company.name)
    r += _an(abi_assuntrice or ABI_INTESA, 5)
    r += _n(_data_aammgg(doc_date), 6)
    r += _an(nome_supporto, 20)
    r += _an("", 76)
    r += _an("E", 6)
    return r


def _record_14(riga, progressivo, company):
    inst = riga.installment
    entry = inst.entry
    debitore = entry.party
    if debitore is None:
        raise RibaCbiError(f"Fattura {entry.doc_number}: manca l'anagrafica del cliente (debitore).")
    abi_assuntrice, cab_assuntore, conto_creditore = _abi_cab_conto_da_iban(company.iban, company.name)
    abi_debitore, cab_debitore, _ = _abi_cab_conto_da_iban(debitore.iban, debitore.name)
    cf_piva_creditore = company.piva or company.codice_fiscale or ""

    r = "14"
    r += _n(progressivo, 7)
    r += _an("", 12)
    r += _n(_data_aammgg(inst.due_date), 6)
    r += "30000"                                    # causale fissa
    r += _n(_centesimi(riga.amount), 13)
    r += "-"                                         # segno fisso, pos 46
    r += _an(abi_assuntrice, 5)
    r += _an(cab_assuntore, 5)
    r += _an(conto_creditore, 12)
    r += _an(abi_debitore, 5)
    r += _an(cab_debitore, 5)
    r += _an("", 12)
    r += _an(company.codice_sia_cbi, 5)
    r += "4"                                         # tipo codice creditore fisso
    r += _an(cf_piva_creditore, 16)
    r += _an("", 8)
    return r


def _record_20(riga, progressivo, company):
    r = "20"
    r += _n(progressivo, 7)
    r += _an(company.name, 24)                       # ragione sociale riga 1
    r += _an(company.indirizzo, 24)
    r += _an("", 24)                                 # ragione sociale riga 2 (non usata)
    r += _an(f"{company.cap or ''} {company.comune or ''}".strip(), 24)
    r += _an("", 15)
    return r


def _record_30(riga, progressivo):
    debitore = riga.installment.entry.party
    r = "30"
    r += _n(progressivo, 7)
    r += _an(debitore.name, 60)
    r += _an(debitore.codice_fiscale, 16)
    r += _an("", 35)
    return r


def _record_40(riga, progressivo):
    debitore = riga.installment.entry.party
    r = "40"
    r += _n(progressivo, 7)
    r += _an(debitore.indirizzo, 30)
    r += _n(debitore.cap or 0, 5)
    r += _an(debitore.comune, 25)
    r += _an(debitore.provincia, 2)
    r += _an("", 49)
    return r


def _record_50(riga, progressivo, company):
    inst = riga.installment
    descrizione = f"FT. {inst.entry.doc_number} DEL {inst.entry.doc_date.strftime('%d/%m/%Y')}"
    r = "50"
    r += _n(progressivo, 7)
    r += _an(descrizione, 80)
    r += _an("", 20)
    r += _an(company.piva or company.codice_fiscale, 11)
    return r


def _record_70(progressivo):
    r = "70"
    r += _n(progressivo, 7)
    r += _an("", 111)
    return r


def _record_ef(company, doc_date, nome_supporto, numero_disposizioni, totale_importo, numero_record_totali):
    r = "EF"
    r += _an(company.codice_sia_cbi, 5)
    abi_assuntrice, _, _ = _abi_cab_conto_da_iban(company.iban, company.name)
    r += _an(abi_assuntrice, 5)
    r += _n(_data_aammgg(doc_date), 6)
    r += _an(nome_supporto, 20)
    r += _n(numero_disposizioni, 6)
    r += _n(_centesimi(totale_importo), 15)
    r += _n(0, 15)                                   # importo totale a credito, sempre zero
    r += _n(numero_record_totali, 7)
    r += _an("", 33)
    r += _an("E", 6)
    return r


def genera_flusso_riba_cbi(advance):
    """Genera il flusso Ri.Ba. CBI (record CRLF-separati, 120 caratteri
    ciascuno) per una distinta BankAdvance di tipo 'riba_sbf'."""
    if advance.tipo != "riba_sbf":
        raise RibaCbiError("Il flusso CBI si genera solo per distinte di tipo RiBa s.b.f., non per Anticipo Fatture.")

    company = advance.company
    if company is None:
        raise RibaCbiError("La distinta non è associata a un'azienda (company_id mancante).")
    if not company.codice_sia_cbi:
        raise RibaCbiError(f"Codice SIA CBI non impostato per {company.name}.")
    if not company.iban:
        raise RibaCbiError(f"IBAN non impostato per {company.name}.")

    righe = list(advance.lines)
    if not righe:
        raise RibaCbiError("La distinta non ha righe.")

    mancano_iban = [r.installment.entry.party.name for r in righe
                     if not r.installment.entry.party or not r.installment.entry.party.iban]
    if mancano_iban:
        raise RibaCbiError(f"IBAN mancante per: {', '.join(mancano_iban)}.")

    nome_supporto = f"RIBA{advance.doc_number}"

    records = [_record_ib(company, advance.doc_date, nome_supporto)]
    for i, riga in enumerate(righe, start=1):
        records.append(_record_14(riga, i, company))
        records.append(_record_20(riga, i, company))
        records.append(_record_30(riga, i))
        records.append(_record_40(riga, i))
        records.append(_record_50(riga, i, company))
        records.append(_record_70(i))

    numero_record_totali = len(records) + 1  # +1 per l'EF che sto per aggiungere
    totale = sum((Decimal(str(r.amount)) for r in righe), Decimal("0"))
    records.append(_record_ef(company, advance.doc_date, nome_supporto, len(righe), totale, numero_record_totali))

    for rec in records:
        if len(rec) != RECORD_LEN:
            raise RibaCbiError(f"Errore interno: record di lunghezza {len(rec)} invece di {RECORD_LEN} — {rec!r}")

    return "\r\n".join(records) + "\r\n"
