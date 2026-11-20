"""services/ironproduction_client.py — Integrazione con IronProduction.

IronProduction è la fonte di verità per il magazzino "officina interna":
materiali che NON vanno a MasterLogistic-WMS (rivendita) ma restano dentro
Iron Segnaletica per lavorazioni proprie — ferro per cavalletti/transenne,
filo di saldatura, DPI/scarpe antinfortunistiche, consumabili.

A differenza di MasterLogistic-WMS, qui l'autenticazione è prevista fin
dall'inizio: token Bearer (IRONPRODUCTION_API_KEY), verificato lato
IronProduction su ogni chiamata — vedi blueprints/magazzino/routes.py::
_auth_masterledger() nel repository IronLogistica/IronProduction.

API usate qui (endpoint dedicati all'integrazione, separati da quelli
dell'interfaccia interna di IronProduction):
    POST /api/masterledger/carico_magazzino_produzione
         {sku, quantita (>0), doc_riferimento, note} → {ok, sku, quantita_totale}
    GET  /api/masterledger/giacenza
         → {sku: {stock, scorta_minima, unita_misura}}  (stesso formato di
           logistic_client.get_magazzino, per riuso del parsing)

Questo client fa SOLO carico (quantità positive): non esiste ancora un caso
d'uso per scaricare materiale da IronProduction verso MasterLedger.
"""
import requests
from flask import current_app


class IronProductionError(Exception):
    """Sollevata per qualunque problema nel parlare con IronProduction."""
    pass


def _base_url():
    url = current_app.config.get("IRONPRODUCTION_URL", "")
    if not url:
        raise IronProductionError(
            "IRONPRODUCTION_URL non configurato. Aggiungilo nelle variabili d'ambiente "
            "(su Railway: Variables) per collegare MasterLedger a IronProduction."
        )
    return url


def _headers():
    token = current_app.config.get("IRONPRODUCTION_API_KEY", "")
    if not token:
        raise IronProductionError(
            "IRONPRODUCTION_API_KEY non configurato. Deve combaciare con MASTERLEDGER_API_TOKEN "
            "impostato lato IronProduction."
        )
    return {"Authorization": f"Bearer {token}"}


def carica_magazzino_produzione(sku, quantita, doc_riferimento="", note="", timeout=8):
    """
    Notifica un carico (arrivo merce) su IronProduction per un materiale di
    officina interna. quantita deve essere positiva — questo client carica
    soltanto, non esiste scarico verso IronProduction.

    Ritorna {ok, sku, quantita_totale} in caso di successo. Solleva
    IronProductionError per qualunque problema (rete, auth, sku/quantita
    non validi) — il chiamante (Entrata Merci in blueprints/mm) deve
    trattarlo come un errore bloccante: se IronProduction non conferma il
    carico, l'Entrata Merci non deve dare l'illusione che la merce sia
    arrivata da qualche parte.
    """
    if quantita is None or quantita <= 0:
        raise IronProductionError(f"Quantità non valida per il carico a IronProduction: {quantita}")

    url = f"{_base_url()}/api/masterledger/carico_magazzino_produzione"
    payload = {"sku": sku, "quantita": float(quantita), "doc_riferimento": doc_riferimento, "note": note}
    try:
        resp = requests.post(url, json=payload, headers=_headers(), timeout=timeout)
    except requests.exceptions.RequestException as e:
        raise IronProductionError(f"IronProduction non raggiungibile ({url}): {e}")

    if resp.status_code == 401:
        raise IronProductionError("IronProduction ha rifiutato l'autenticazione: verifica IRONPRODUCTION_API_KEY.")
    if resp.status_code == 503:
        raise IronProductionError("Integrazione disabilitata lato IronProduction (MASTERLEDGER_API_TOKEN non configurato).")

    try:
        dati = resp.json()
    except ValueError:
        raise IronProductionError(f"IronProduction ha risposto in un formato inatteso (status {resp.status_code}).")

    if not dati.get("ok"):
        raise IronProductionError(f"IronProduction ha rifiutato il carico per {sku}: {dati.get('error', 'errore sconosciuto')}")
    return dati


def get_giacenza_produzione(timeout=8):
    """
    Ritorna l'intera giacenza di officina interna da IronProduction:
    {sku: {stock, scorta_minima, unita_misura}}.
    """
    url = f"{_base_url()}/api/masterledger/giacenza"
    try:
        resp = requests.get(url, headers=_headers(), timeout=timeout)
    except requests.exceptions.RequestException as e:
        raise IronProductionError(f"IronProduction non raggiungibile ({url}): {e}")

    if resp.status_code == 401:
        raise IronProductionError("IronProduction ha rifiutato l'autenticazione: verifica IRONPRODUCTION_API_KEY.")
    if resp.status_code == 503:
        raise IronProductionError("Integrazione disabilitata lato IronProduction (MASTERLEDGER_API_TOKEN non configurato).")

    try:
        return resp.json()
    except ValueError:
        raise IronProductionError(f"IronProduction ha risposto in un formato inatteso (status {resp.status_code}).")


def get_giacenza_wood(q="", timeout=8):
    """
    Il magazzino VERO di Iron Wood — non l'officina interna di Iron
    Segnaletica (get_giacenza_produzione qui sopra, autenticata, un
    concetto completamente diverso): questo legge il modulo "Wood" di
    IronProduction (giacenza_wood, distinta_base_wood, centri_costo_wood),
    che è l'intera contabilità di magazzino della società Iron Wood.
    Endpoint SENZA autenticazione (stessa scelta già fatta per la lettura
    di MasterLogistic-WMS — sola lettura, non scrive nulla qui).

    IronProduction calcola già impegnato/ordinato/disponibile_contabile/
    fabbisogno da solo (stessa metodologia di MasterLogistic-WMS) — questo
    client fa da semplice passa-carte, MasterLedger non ricalcola niente.

    Ritorna il dict grezzo della risposta:
    {righe: [...], totale, mostrate, filtrato, limite}
    """
    url = f"{_base_url()}/api/giacenza_wood"
    params = {"solo_bom": "1"}
    if q:
        params["q"] = q
    try:
        resp = requests.get(url, params=params, timeout=timeout)
    except requests.exceptions.RequestException as e:
        raise IronProductionError(f"IronProduction (magazzino Iron Wood) non raggiungibile ({url}): {e}")
    try:
        return resp.json()
    except ValueError:
        raise IronProductionError(f"IronProduction ha risposto in un formato inatteso per giacenza_wood (status {resp.status_code}).")
