"""
blueprints/logistics/routes.py — Cruscotti in stile MasterLogistic-WMS.

MasterLedgerLight non ha magazzino interno: lo stock qui sotto viene letto
in tempo reale da MasterLogistic-WMS (services/logistic_client.get_magazzino,
un'unica chiamata bulk per pagina, chiave = Material.code = sku WMS). Se il
WMS non è raggiungibile/configurato, i cruscotti mostrano comunque ordini e
scadenze ma con stock/disponibilità a 0 e un avviso — MasterLedger non
inventa una giacenza propria.

  - /logistics/magazzino          → tabella Stock/Impegnato/Ordinati/
                                     Disponibilità/Scorta Minima/Fabbisogno
  - /logistics/ordini-clienti     → card per ogni Ordine Cliente aperto
  - /logistics/ordini-fornitori   → card per ogni Ordine Fornitore aperto

"Impegnato Clienti" = qty - qty_delivered sulle righe SalesOrderLine ancora
aperte. "Ordinati Fornitori" = qty - qty_received sulle righe
PurchaseOrderLine ancora aperte. "Evadibilità" = quota delle righe ordine
coperta dalla disponibilità netta WMS (stock+ordinati-impegnato), senza
allocazione per priorità tra ordini concorrenti (approssimazione dichiarata).

Stati mappati da WMS (che si basavano su un flusso PDF con conferma
telefonica, corriere, imballaggio) a ciò che MasterLedger può davvero
verificare sui suoi documenti:
  Cliente:   MANCANO_CONFERME / ORDINI_CONFERMATI / EVADIBILE / EVASO
             (+ overlay SCADUTO se delivery_due_date è passata)
  Fornitore: DA_CONFERMARE / CONFERMATO / IN_ARRIVO / DA_RITIRARE / EVASI
"""
from datetime import date, datetime
from decimal import Decimal

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required

from extensions import db
from models import Material, SalesOrder, SalesOrderLine, PurchaseOrder, PurchaseOrderLine
from services.logistic_client import get_magazzino, LogisticError
from services.ironproduction_client import get_giacenza_wood, IronProductionError

logistics_bp = Blueprint("logistics", __name__, template_folder="../../templates/logistics")


def _stock_wms_map():
    """dict {material.code: stock float} da MasterLogistic-WMS, in un'unica
    chiamata bulk. Ritorna (mappa, wms_ok) — wms_ok=False se il WMS non è
    raggiungibile/configurato, nel qual caso la mappa è vuota."""
    try:
        magazzino = get_magazzino()
    except LogisticError:
        return {}, False
    stock = {}
    for sku, row in (magazzino or {}).items():
        if isinstance(row, dict):
            try:
                stock[sku] = float(row.get("stock", 0) or 0)
            except (TypeError, ValueError):
                stock[sku] = 0.0
    return stock, True


def _righe_aperte_vendita():
    """dict {material_id: qty_impegnata} dalle righe ordine cliente non ancora
    consegnate del tutto (qty - qty_delivered > 0), su ordini non evasi."""
    impegnato = {}
    righe = (
        db.session.query(SalesOrderLine)
        .join(SalesOrder)
        .filter(SalesOrder.status != "consegnato")
        .all()
    )
    for r in righe:
        residuo = float(r.qty) - float(r.qty_delivered or 0)
        if residuo > 0:
            impegnato[r.material_id] = impegnato.get(r.material_id, 0) + residuo
    return impegnato


def _righe_aperte_acquisto():
    """dict {material_id: qty_ordinata} dalle righe ordine fornitore non
    ancora ricevute del tutto (qty - qty_received > 0)."""
    ordinati = {}
    righe = db.session.query(PurchaseOrderLine).join(PurchaseOrder).all()
    for r in righe:
        residuo = float(r.qty) - float(r.qty_received or 0)
        if residuo > 0:
            ordinati[r.material_id] = ordinati.get(r.material_id, 0) + residuo
    return ordinati


def _dispo_map():
    """dict {material_id: disponibilità netta} = stock WMS + ordinati - impegnato,
    la stessa formula del cruscotto Magazzino/Fabbisogno."""
    impegnato_map = _righe_aperte_vendita()
    ordinati_map = _righe_aperte_acquisto()
    stock_wms, _ = _stock_wms_map()
    dispo = {}
    for m in Material.query.filter_by(active=True).all():
        stock = stock_wms.get(m.code, 0.0)
        dispo[m.id] = stock + ordinati_map.get(m.id, 0) - impegnato_map.get(m.id, 0)
    return dispo


def _parse_data_it(s):
    """'gg/mm/aaaa' -> date, oppure None se vuoto/non valido."""
    s = (s or "").strip()
    if not s:
        return None
    try:
        return datetime.strptime(s, "%d/%m/%Y").date()
    except ValueError:
        return None


# ══════════════════════════════════════════════════════════════
# MAGAZZINO / FABBISOGNO
# ══════════════════════════════════════════════════════════════
@logistics_bp.route("/magazzino")
@login_required
def magazzino():
    impegnato_map = _righe_aperte_vendita()
    ordinati_map = _righe_aperte_acquisto()
    stock_wms, wms_ok = _stock_wms_map()
    if not wms_ok:
        flash("MasterLogistic-WMS non raggiungibile: stock mostrato a 0 finché non torna disponibile.",
              "warning")

    righe = []
    for m in Material.query.filter_by(active=True).order_by(Material.code).all():
        stock = stock_wms.get(m.code, 0.0)
        impegnato = impegnato_map.get(m.id, 0)
        ordinati = ordinati_map.get(m.id, 0)
        scorta_min = float(m.reorder_point or 0)
        dispo = stock + ordinati - impegnato
        fabbisogno = max(0.0, scorta_min - dispo)

        if stock <= 0 and impegnato > 0:
            stato = "esaurito"
        elif dispo <= scorta_min:
            stato = "sottoscorta"
        else:
            stato = "ok"

        righe.append({
            "material": m, "stock": stock, "impegnato": impegnato,
            "ordinati": ordinati, "scorta_min": scorta_min, "dispo": dispo,
            "fabbisogno": fabbisogno, "stato": stato,
        })
    return render_template("logistics/magazzino.html", righe=righe)


@logistics_bp.route("/magazzino/scorta-minima/<int:material_id>", methods=["POST"])
@login_required
def aggiorna_scorta_minima(material_id):
    m = Material.query.get_or_404(material_id)
    try:
        valore = Decimal(request.form.get("reorder_point", "0").replace(",", "."))
        if valore < 0:
            raise ValueError
    except Exception:
        flash("Scorta minima non valida.", "danger")
        return redirect(url_for("logistics.magazzino"))
    m.reorder_point = valore
    db.session.commit()
    flash(f"Scorta minima di {m.code} aggiornata a {valore}.", "success")
    return redirect(url_for("logistics.magazzino"))


# ══════════════════════════════════════════════════════════════
# MAGAZZINO IRON WOOD — legge IronProduction (modulo Wood), non WMS.
# Diverso dal Magazzino qui sopra: quello legge MasterLogistic-WMS ed è il
# magazzino di Iron Segnaletica; questo legge IronProduction (giacenza_wood)
# ed è il magazzino della società Iron Wood — due aziende, due magazzini
# fisicamente diversi. IronProduction calcola già tutto da solo
# (impegnato/ordinato/disponibile/fabbisogno): qui si mostra soltanto,
# nessun ricalcolo lato MasterLedger.
# ══════════════════════════════════════════════════════════════
@logistics_bp.route("/magazzino-wood")
@login_required
def magazzino_wood():
    q = request.args.get("q", "").strip()
    errore = None
    righe = []
    try:
        dati = get_giacenza_wood(q=q)
        righe = dati.get("righe", [])
    except IronProductionError as e:
        errore = str(e)
    return render_template("logistics/magazzino_wood.html", righe=righe, errore=errore, q=q)


# ══════════════════════════════════════════════════════════════
# ORDINI CLIENTE — card stile MasterLogistic
# ══════════════════════════════════════════════════════════════
@logistics_bp.route("/ordini-clienti")
@login_required
def ordini_clienti():
    dispo = _dispo_map()
    oggi = date.today()

    # Solo le ASA che NON hanno già un tabellone in MasterLogistic-WMS:
    # Carpenteria e Commercializzati sono già visibili là (compresa la
    # produzione IronProduction->WMS delle transenne), ripeterle qui
    # sarebbe doppio. Falegnameria, Realizzazione Stelle e Saldatura
    # Manuale, Saldatura Conto Terzi non hanno nessun altro tabellone —
    # queste sì restano qui. Gestione Cantieri esclusa per ora su scelta
    # di Mauri, anche se per logica (è un servizio, non passa da WMS)
    # potrebbe starci in futuro.
    ASA_VISIBILI_QUI = {"Falegnameria", "Realizzazione Stelle e Saldatura Manuale", "Saldatura Conto Terzi"}

    ordini = (
        SalesOrder.query.filter(SalesOrder.status != "consegnato")
        .order_by(SalesOrder.priority, SalesOrder.doc_date.desc())
        .all()
    )
    cards = []
    for o in ordini:
        if not any(l.material.revenue_center and l.material.revenue_center.name in ASA_VISIBILI_QUI
                  for l in o.lines):
            continue
        tot = sum(float(l.qty) for l in o.lines) or 1
        consegnato = sum(float(l.qty_delivered or 0) for l in o.lines)
        perc_evaso = round(consegnato / tot * 100)

        # Evadibilità: quota delle unità ANCORA da consegnare coperta dalla
        # disponibilità netta di magazzino (approssimazione senza
        # allocazione per priorità tra ordini concorrenti).
        residuo_tot = 0.0
        coperto_tot = 0.0
        for l in o.lines:
            residuo = float(l.qty) - float(l.qty_delivered or 0)
            if residuo <= 0:
                continue
            residuo_tot += residuo
            coperto_tot += min(residuo, max(0.0, dispo.get(l.material_id, 0)))
        perc_evadibile = round(coperto_tot / residuo_tot * 100) if residuo_tot > 0 else 100

        scaduto = bool(o.delivery_due_date and o.delivery_due_date < oggi and perc_evaso < 100)

        if perc_evaso >= 100:
            stato = "EVASO"
        elif not o.confirmed:
            stato = "MANCANO_CONFERME"
        elif perc_evadibile >= 100:
            stato = "EVADIBILE"
        else:
            stato = "ORDINI_CONFERMATI"

        cards.append({
            "ordine": o, "perc_evaso": perc_evaso, "perc_evadibile": perc_evadibile,
            "stato": stato, "scaduto": scaduto,
        })
    return render_template("logistics/ordini_clienti.html", cards=cards)


@logistics_bp.route("/ordini-clienti/<int:order_id>/conferma", methods=["POST"])
@login_required
def sd_conferma_toggle(order_id):
    o = SalesOrder.query.get_or_404(order_id)
    o.confirmed = not o.confirmed
    db.session.commit()
    return jsonify({"ok": True, "confirmed": o.confirmed})


@logistics_bp.route("/ordini-clienti/<int:order_id>/consegna", methods=["POST"])
@login_required
def sd_consegna(order_id):
    o = SalesOrder.query.get_or_404(order_id)
    data = request.get_json(silent=True) or request.form
    o.delivery_due_date = _parse_data_it(data.get("data"))
    db.session.commit()
    return jsonify({"ok": True, "data": o.delivery_due_date.strftime("%d/%m/%Y") if o.delivery_due_date else ""})


@logistics_bp.route("/ordini-clienti/riordina", methods=["POST"])
@login_required
def sd_riordina():
    data = request.get_json(silent=True) or {}
    for i, order_id in enumerate(data.get("ids", [])):
        SalesOrder.query.filter_by(id=order_id).update({"priority": i})
    db.session.commit()
    return jsonify({"ok": True})


# ══════════════════════════════════════════════════════════════
# ORDINI FORNITORE — card stile MasterLogistic
# ══════════════════════════════════════════════════════════════
@logistics_bp.route("/ordini-fornitori")
@login_required
def ordini_fornitori():
    ordini = (
        PurchaseOrder.query.order_by(PurchaseOrder.priority, PurchaseOrder.doc_date.desc()).all()
    )
    cards = []
    for o in ordini:
        if o.status == "fatturato":
            continue  # ciclo chiuso, non interessa il cruscotto operativo
        # Solo gli ordini per l'officina interna (IronProduction — ferro,
        # filo di saldatura, DPI...): quelli destinati a MasterLogistic-WMS
        # (prodotti finiti da rivendere) hanno GIÀ il loro tabellone cards
        # dentro WMS stesso — ripeterlo qui sarebbe doppio e confusionario.
        # Un ordine entra in questo tabellone se ha ALMENO una riga per
        # l'officina interna (non serve che lo sia per intero).
        if not any(l.material.purchase_destination == "iron_production" for l in o.lines):
            continue
        tot = sum(float(l.qty) for l in o.lines) or 1
        ricevuto = sum(float(l.qty_received or 0) for l in o.lines)
        perc = round(ricevuto / tot * 100)

        if perc >= 100:
            stato = "EVASI"
        elif not o.confirmed:
            stato = "DA_CONFERMARE"
        elif ricevuto > 0:
            stato = "IN_ARRIVO"
        elif o.pickup_mode == "ritiriamo_noi":
            stato = "DA_RITIRARE"
        else:
            stato = "CONFERMATO"

        cards.append({"ordine": o, "perc": perc, "stato": stato})
    return render_template("logistics/ordini_fornitori.html", cards=cards)


@logistics_bp.route("/ordini-fornitori/<int:order_id>/conferma", methods=["POST"])
@login_required
def mm_conferma_toggle(order_id):
    o = PurchaseOrder.query.get_or_404(order_id)
    o.confirmed = not o.confirmed
    db.session.commit()
    return jsonify({"ok": True, "confirmed": o.confirmed})


@logistics_bp.route("/ordini-fornitori/<int:order_id>/consegna", methods=["POST"])
@login_required
def mm_consegna(order_id):
    o = PurchaseOrder.query.get_or_404(order_id)
    data = request.get_json(silent=True) or request.form
    o.delivery_due_date = _parse_data_it(data.get("data"))
    db.session.commit()
    return jsonify({"ok": True, "data": o.delivery_due_date.strftime("%d/%m/%Y") if o.delivery_due_date else ""})


@logistics_bp.route("/ordini-fornitori/<int:order_id>/ritiro", methods=["POST"])
@login_required
def mm_ritiro(order_id):
    o = PurchaseOrder.query.get_or_404(order_id)
    data = request.get_json(silent=True) or request.form
    valore = data.get("pickup_mode")
    if valore not in ("consegnano_loro", "ritiriamo_noi"):
        return jsonify({"ok": False, "error": "valore non valido"}), 400
    o.pickup_mode = valore
    db.session.commit()
    return jsonify({"ok": True, "pickup_mode": o.pickup_mode})


@logistics_bp.route("/ordini-fornitori/riordina", methods=["POST"])
@login_required
def mm_riordina():
    data = request.get_json(silent=True) or {}
    for i, order_id in enumerate(data.get("ids", [])):
        PurchaseOrder.query.filter_by(id=order_id).update({"priority": i})
    db.session.commit()
    return jsonify({"ok": True})
