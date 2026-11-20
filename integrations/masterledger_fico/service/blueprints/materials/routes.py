"""
blueprints/materials/routes.py — Anagrafica Articoli (Material Master, MM01).

MasterLedgerLight non ha magazzino interno: la giacenza fisica vive su
MasterLogistic-WMS (letta via services/logistic_client.py dove serve, es.
in SD) e su IronProduction. Qui restano solo i due dati che servono ai
cicli contabili/commerciali di MasterLedger:
  - costo standard  → usato dal PGI per il Costo del Venduto (SD) e come
                      prezzo proposto negli ordini d'acquisto (MM)
  - prezzo vendita  → proposto in preventivi/ordini cliente

Distinta Base (BOM), Centri di Lavoro e Cicli di Lavorazione (Routing) sono
stati rimossi: quel costing vive ora in IronProduction.
"""
from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify, current_app
from flask_login import login_required

from extensions import db
from models import Material, CostCenter, Account

materials_bp = Blueprint("materials", __name__, template_folder="../../templates/materials")


def _purchase_destination(form):
    """Legge purchase_destination dal form: stringa valida, o None se vuoto
    ('non ancora classificato' — l'Entrata Merci lo richiederà quando serve,
    non lo forziamo qui per non rompere la creazione di prodotti finiti che
    vendiamo soltanto e non compriamo mai)."""
    value = (form.get("purchase_destination") or "").strip()
    return value if value in Material.PURCHASE_DESTINATIONS else None


def _revenue_center_id(form):
    """Legge revenue_center_id (ASA) dal form: id valido di un Centro di
    Costo/Ricavo CON conto ricavi impostato, o None se vuoto/non valido
    ('non ancora classificato' — Fatturazione DDT lo richiederà quando
    serve)."""
    raw = form.get("revenue_center_id", type=int)
    if not raw:
        return None
    cc = CostCenter.query.get(raw)
    return cc.id if cc and cc.revenue_account_id else None


def _custom_cost_account_id(form):
    """Legge custom_cost_account_id (Voce di Costo) dal form: id valido di
    un conto di tipo 'costo', o None se vuoto/non valido ('nessun override
    — resta il conto automatico per tipo articolo, TYPE_ACCOUNTS')."""
    raw = form.get("custom_cost_account_id", type=int)
    if not raw:
        return None
    acc = Account.query.get(raw)
    return acc.id if acc and acc.account_type == "costo" else None


@materials_bp.route("/", methods=["GET", "POST"])
@login_required
def material_list():
    if request.method == "POST":
        code = request.form.get("code", "").strip().upper()
        description = request.form.get("description", "").strip()
        if not code or not description:
            flash("Codice e descrizione sono obbligatori.", "danger")
        elif Material.query.filter_by(code=code).first():
            flash(f"Esiste già un articolo con codice {code}.", "danger")
        else:
            m = Material(
                code=code, description=description,
                material_type=request.form.get("material_type", "FERT"),
                uom=request.form.get("uom", "PZ").strip() or "PZ",
                standard_cost=request.form.get("standard_cost", type=float) or 0,
                sales_price=request.form.get("sales_price", type=float) or 0,
                vat_rate=request.form.get("vat_rate", type=float) or 22,
                is_carpenteria_propria=request.form.get("is_carpenteria_propria") == "1",
                purchase_destination=_purchase_destination(request.form),
                revenue_center_id=_revenue_center_id(request.form),
                custom_cost_account_id=_custom_cost_account_id(request.form),
            )
            db.session.add(m)
            db.session.commit()
            flash(f"Articolo {code} creato.", "success")
            return redirect(url_for("materials.material_list"))

    mats = Material.query.order_by(Material.code).all()
    revenue_centers = CostCenter.query.filter(CostCenter.revenue_account_id.isnot(None),
                                               CostCenter.active.is_(True)).order_by(CostCenter.name).all()
    cost_accounts = Account.query.filter_by(account_type="costo", active=True).order_by(Account.code).all()
    return render_template("materials/list.html", materials=mats,
                           type_labels=Material.TYPE_LABELS, revenue_centers=revenue_centers,
                           cost_accounts=cost_accounts)


@materials_bp.route("/<int:mat_id>/update", methods=["POST"])
@login_required
def material_update(mat_id):
    m = Material.query.get_or_404(mat_id)
    m.standard_cost = request.form.get("standard_cost", type=float) or 0
    m.sales_price = request.form.get("sales_price", type=float) or 0
    m.vat_rate = request.form.get("vat_rate", type=float) or 22
    m.is_carpenteria_propria = request.form.get("is_carpenteria_propria") == "1"
    m.purchase_destination = _purchase_destination(request.form)
    m.revenue_center_id = _revenue_center_id(request.form)
    m.custom_cost_account_id = _custom_cost_account_id(request.form)
    db.session.commit()
    flash(f"Articolo {m.code} aggiornato (costo standard {float(m.standard_cost):.4f} €, "
          f"prezzo {float(m.sales_price):.2f} €).", "success")
    return redirect(url_for("materials.material_list"))


@materials_bp.route("/api/search")
@login_required
def api_search():
    """
    Ricerca-mentre-scrivi per il widget autocomplete nei form di riga
    (Preventivi, Ordini Cliente, RFQ, Ordini Fornitore): per codice O
    descrizione, case-insensitive, max 15 risultati — pensata per
    un'anagrafica con centinaia/migliaia di articoli, dove un <select>
    con tutto dentro non è più utilizzabile.
    """
    q = (request.args.get("q") or "").strip()
    if len(q) < 2:
        return jsonify([])
    like = f"%{q}%"
    mats = (Material.query.filter_by(active=True)
           .filter(db.or_(Material.code.ilike(like), Material.description.ilike(like)))
           .order_by(Material.code).limit(15).all())
    return jsonify([{
        "id": m.id, "code": m.code, "description": m.description, "uom": m.uom,
        "sales_price": float(m.sales_price), "standard_cost": float(m.standard_cost),
    } for m in mats])


# ══════════════════════════════════════════════════════════════════════════════
#  INTEGRAZIONE KANBAN (IronProduction) — lettura anagrafica articolo per la
#  "interrogazione automatica" del Kanban Gruppi: quando in IronProduction si
#  inserisce un codice, IronProduction chiama qui per sapere se esiste già
#  in anagrafica MasterLedgerLight (costo standard, prezzo vendita, tipo).
#  Endpoint SEPARATO da /api/search (che è sessione utente, per l'autocomplete
#  nei form): qui serve sempre il token KANBAN_API_TOKEN, stesso schema
#  Bearer già usato per l'integrazione IronProduction→MasterLedgerLight
#  esistente (vedi blueprints/mm per l'Entrata Merci), ma con una chiave
#  indipendente — così le due integrazioni si possono revocare separatamente.
#  Sola lettura: nessuna scrittura è mai possibile da questo endpoint.
# ══════════════════════════════════════════════════════════════════════════════
def _auth_kanban():
    token = current_app.config.get('KANBAN_API_TOKEN', '')
    if not token:
        return jsonify(ok=False, error="API Kanban disabilitata: configurare KANBAN_API_TOKEN"), 503
    bearer = request.headers.get('Authorization', '')
    got = bearer[7:].strip() if bearer.lower().startswith('bearer ') else ''
    if got != token:
        return jsonify(ok=False, error="non autorizzato"), 401


@materials_bp.route("/api/kanban/articolo/<path:code>")
def api_kanban_articolo(code):
    """
    Lettura sola-lettura di un articolo per codice, per l'interrogazione
    automatica del Kanban Gruppi di IronProduction. trovato=False (non 404)
    se il codice non esiste in anagrafica — è un esito normale, non un
    errore: molti codici Kanban non passano mai da MasterLedgerLight.
    """
    auth = _auth_kanban()
    if auth:
        return auth
    m = Material.query.filter(db.func.upper(Material.code) == code.strip().upper()).first()
    if not m:
        return jsonify(ok=True, trovato=False)
    return jsonify(ok=True, trovato=True, codice=m.code, descrizione=m.description,
                   tipo=m.material_type, tipo_label=Material.TYPE_LABELS.get(m.material_type, m.material_type),
                   uom=m.uom, costo_standard=float(m.standard_cost), prezzo_vendita=float(m.sales_price),
                   aliquota_iva=float(m.vat_rate), scorta_minima=float(m.reorder_point),
                   carpenteria_propria=m.is_carpenteria_propria,
                   destinazione_acquisto=m.purchase_destination, attivo=m.active)

