"""
app.py — Punto di ingresso dell'applicazione MasterLedger.

Usa l'application factory pattern: create_app() costruisce e configura
l'app Flask, registra le estensioni (db, login, migrate) e i Blueprint
(uno per area funzionale, come richiesto: GL, AP, AR, Cespiti, Costi,
Setup Magazzini, Autenticazione).

Per avviare in locale:
    flask --app app run --debug

Per Railway: il Procfile lancia gunicorn app:app (vedi Procfile).
"""
import os
import click
from flask import Flask, render_template, request, abort
from flask_login import current_user

from config import Config
from extensions import db, migrate, login_manager, csrf


def create_app(config_class=Config):
    # root_path esplicito: caricato dal loader del portale (modulo
    # "masterledger_fico_entry", non presente in sys.modules) Flask non
    # ricaverebbe la cartella del servizio e non troverebbe templates/ e static/.
    app = Flask(__name__, root_path=os.path.dirname(os.path.abspath(__file__)))
    app.config.from_object(config_class)

    # ── Estensioni ──────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    csrf.init_app(app)

    # ── Modelli (import qui per evitare cicli di import) ───────
    from models import User

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # ── Blueprint — un modulo per area funzionale ───────────────
    from blueprints.academy.routes import academy_bp
    from blueprints.auth.routes import auth_bp
    from blueprints.dashboard.routes import dashboard_bp
    from blueprints.gl.routes import gl_bp
    from blueprints.ap.routes import ap_bp
    from blueprints.ar.routes import ar_bp
    from blueprints.assets.routes import assets_bp
    from blueprints.costs.routes import costs_bp
    from blueprints.sd.routes import sd_bp
    from blueprints.mm.routes import mm_bp
    from blueprints.materials.routes import materials_bp
    from blueprints.logistics.routes import logistics_bp
    from blueprints.parties.routes import parties_bp
    from blueprints.payroll.routes import payroll_bp
    from blueprints.bank_advances.routes import bank_advances_bp
    from blueprints.tcode.routes import tcode_bp

    app.register_blueprint(academy_bp, url_prefix="/academy-fico")
    app.register_blueprint(tcode_bp, url_prefix="/tcode")
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(dashboard_bp, url_prefix="/")
    app.register_blueprint(gl_bp, url_prefix="/gl")
    app.register_blueprint(ap_bp, url_prefix="/ap")
    app.register_blueprint(ar_bp, url_prefix="/ar")
    app.register_blueprint(assets_bp, url_prefix="/assets")
    app.register_blueprint(costs_bp, url_prefix="/costs")
    app.register_blueprint(sd_bp, url_prefix="/sd")
    app.register_blueprint(mm_bp, url_prefix="/mm")
    app.register_blueprint(materials_bp, url_prefix="/materials")
    app.register_blueprint(logistics_bp, url_prefix="/logistics")
    app.register_blueprint(parties_bp, url_prefix="/soggetti-economici")
    app.register_blueprint(payroll_bp, url_prefix="/paghe")
    app.register_blueprint(bank_advances_bp, url_prefix="/banche")

    # ── Variabili disponibili in ogni template ──────────────────
    @app.context_processor
    def inject_globals():
        from flask_login import current_user
        from models import Company
        from services.azienda_corrente import get_azienda_corrente
        ctx = {"company_name": app.config["COMPANY_NAME"]}
        if current_user.is_authenticated and getattr(current_user, "is_ledger", False):
            ctx["aziende_ledger"] = Company.query.filter_by(active=True).order_by(Company.name).all()
            ctx["azienda_corrente"] = get_azienda_corrente()
        return ctx

    # ── Comando CLI per popolare il database con dati di partenza ──
    @app.cli.command("seed")
    def seed():
        """Popola il database con Piano dei Conti, utenti demo.
        Uso: flask --app app seed
        """
        from seed import run_seed
        run_seed()
        print("Database popolato con dati di partenza.")

    # ── Comando CLI per svuotare COMPLETAMENTE il database ──
    # Pensato per ripartire da zero con le prime registrazioni di prova,
    # senza dover distruggere/ricreare il database Postgres su Railway (più
    # lento e rischia di disallineare le variabili d'ambiente di connessione).
    # SVUOTA OGNI TABELLA — irreversibile, richiede conferma esplicita.
    @app.cli.command("reset-db")
    @click.option("--yes-i-am-sure", is_flag=True,
                 help="Conferma esplicita: senza questo flag il comando non fa nulla.")
    def reset_db(yes_i_am_sure):
        """SVUOTA TUTTE LE TABELLE del database (irreversibile).
        Uso: flask --app app reset-db --yes-i-am-sure
        Dopo, rilancia 'flask --app app seed' per ripopolare piano dei conti,
        utenti e dati di partenza — il reset da solo lascia tutto vuoto.
        """
        if not yes_i_am_sure:
            print("ATTENZIONE: questo comando CANCELLA TUTTI I DATI dal database — ")
            print("fatture, pagamenti, scritture, anagrafiche, TUTTO. Irreversibile.")
            print("Se sei sicuro, rilancia con: flask --app app reset-db --yes-i-am-sure")
            return

        with app.app_context():
            engine = db.engine
            table_names = [t.name for t in db.metadata.sorted_tables]
            with engine.begin() as conn:
                if engine.dialect.name == "postgresql":
                    if table_names:
                        conn.execute(db.text(
                            f"TRUNCATE TABLE {', '.join(table_names)} RESTART IDENTITY CASCADE;"
                        ))
                else:
                    # SQLite (solo per test in locale) — ordine inverso per rispettare le FK.
                    for name in reversed(table_names):
                        conn.execute(db.text(f"DELETE FROM {name};"))
                    has_sequence = conn.execute(db.text(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence';"
                    )).fetchone()
                    if has_sequence:
                        conn.execute(db.text(
                            "DELETE FROM sqlite_sequence WHERE name IN "
                            f"({','.join(repr(n) for n in table_names)});"
                        ))
        print(f"Database svuotato: {len(table_names)} tabelle azzerate.")
        print("Ora rilancia: flask --app app seed")

    # ── Comando CLI: reset MANTENENDO anagrafica partner + piano dei conti ──
    # Svuota tutto il resto (articoli, scritture, documenti SD/MM/paghe/
    # cespiti/banca, parametri fiscali, sequenze documento, periodi
    # contabili) ma NON tocca economic_subjects (clienti/fornitori),
    # accounts (piano dei conti), account_mappings, users (altrimenti
    # nessuno potrebbe più fare login) né cost_centers (centri di costo).
    # Pensato per ripartire puliti sui dati operativi tenendo anagrafica,
    # piano dei conti e struttura organizzativa già validati.
    TABELLE_DA_MANTENERE = {"economic_subjects", "accounts", "users", "account_mappings",
                            "cost_centers"}

    @app.cli.command("reset-mantieni-anagrafica")
    @click.option("--yes-i-am-sure", is_flag=True,
                 help="Conferma esplicita: senza questo flag il comando non fa nulla.")
    def reset_mantieni_anagrafica(yes_i_am_sure):
        """Svuota TUTTO tranne anagrafica partner, piano dei conti, mappatura
        conti, centri di costo e utenti (irreversibile).
        Uso: flask --app app reset-mantieni-anagrafica --yes-i-am-sure
        """
        if not yes_i_am_sure:
            print("ATTENZIONE: questo comando CANCELLA articoli, scritture contabili, documenti")
            print("SD/MM/paghe/cespiti/banca, parametri fiscali, sequenze documento e periodi")
            print("contabili. RESTANO: anagrafica clienti/fornitori, piano dei conti, mappatura")
            print("conti, centri di costo e utenti. Irreversibile.")
            print("Se sei sicuro, rilancia con: flask --app app reset-mantieni-anagrafica --yes-i-am-sure")
            return

        with app.app_context():
            engine = db.engine
            table_names = [t.name for t in db.metadata.sorted_tables if t.name not in TABELLE_DA_MANTENERE]
            with engine.begin() as conn:
                if engine.dialect.name == "postgresql":
                    if table_names:
                        conn.execute(db.text(
                            f"TRUNCATE TABLE {', '.join(table_names)} RESTART IDENTITY CASCADE;"
                        ))
                else:
                    for name in reversed(table_names):
                        conn.execute(db.text(f"DELETE FROM {name};"))
                    has_sequence = conn.execute(db.text(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence';"
                    )).fetchone()
                    if has_sequence:
                        conn.execute(db.text(
                            "DELETE FROM sqlite_sequence WHERE name IN "
                            f"({','.join(repr(n) for n in table_names)});"
                        ))
        print(f"Database svuotato: {len(table_names)} tabelle azzerate, "
              f"{len(TABELLE_DA_MANTENERE)} mantenute ({', '.join(sorted(TABELLE_DA_MANTENERE))}).")

    # ── Bootstrap automatico (Railway): SOLO conti/utenti garantiti ──
    # FIX (19/07/2026): qui c'era anche un db.create_all() automatico ad ogni
    # avvio. Il problema: create_all() crea le tabelle NUOVE che mancano, ma
    # non tocca MAI le tabelle già esistenti per aggiungere colonne — quindi
    # ogni volta che una migrazione aggiungeva un campo a una tabella già
    # esistente (es. materials.is_carpenteria_propria), create_all() la
    # "nascondeva" creando nel frattempo le tabelle nuove senza che
    # alembic_version avanzasse mai, lasciando lo schema in uno stato
    # incoerente e imprevedibile. Da ora lo schema lo gestisce SOLO
    # `flask db upgrade` (già eseguito automaticamente da Railway nel passo
    # "release" del Procfile) — niente più scorciatoie qui.
    with app.app_context():
        try:
            from models import Account
            for code, name, atype, co_rel, co_type in (
                ("450000", "Costo del Venduto", "costo", True, "COST"),
                ("165000", "Ricevimenti da fatturare (EM/RF)", "patrimoniale_passivo", False, None),
            ):
                if not Account.query.filter_by(code=code).first():
                    db.session.add(Account(code=code, name=name, account_type=atype,
                                           cost_relevant=co_rel, cost_relevant_type=co_type))
            # Gli utenti demo sono opt-in e vengono creati una sola volta: non si
            # sovrascrivono mai password o stato di utenze già presenti.
            # Angelo e Maurizio → portale Ledger; Maria Grazia → portale Desk
            # (mai contabilità, bloccato anche lato server).
            if app.config.get("BOOTSTRAP_DEMO_USERS"):
                for uname, pwd, role, portal in (
                    ("Angelo", "Angelo1234", "operatore", "ledger"),
                    ("Maurizio", "Maurizio1234", "commercialista", "ledger"),
                    ("MariaGrazia", "MariaGrazia1234", "operatore", "desk"),
                ):
                    if User.query.filter(db.func.lower(User.username) == uname.lower()).first() is None:
                        u = User(username=uname, full_name=uname, role=role, portal=portal)
                        u.set_password(pwd)
                        db.session.add(u)
            db.session.commit()
        except Exception:
            db.session.rollback()

    # ── Portale Desk vs Ledger: isolamento server-side ──────────
    # Un utente del portale 'desk' (operativo/commerciale — preventivi,
    # ordini, DDT, RFQ) non deve MAI poter aprire una vista contabile,
    # nemmeno digitando l'URL a mano: l'isolamento richiesto non è solo
    # nella sidebar. Un utente 'ledger' (amministrazione) non ha invece
    # restrizioni — può consultare anche le viste operative se serve.
    LEDGER_ONLY_BLUEPRINTS = {"gl", "ap", "ar", "assets", "costs", "payroll"}

    @app.before_request
    def _restrict_desk_from_ledger():
        if (current_user.is_authenticated and current_user.is_desk
                and request.blueprint in LEDGER_ONLY_BLUEPRINTS):
            abort(403)

    @app.errorhandler(403)
    def forbidden(e):
        return render_template("errors/403.html"), 403

    @app.errorhandler(404)
    def not_found(e):
        return render_template("errors/404.html"), 404

    return app


# Istanza a livello di modulo per `flask --app app` e gunicorn (servizio
# autonomo). NON viene creata quando il file è caricato dal loader del
# portale Firenze (integrations/masterledger_fico/loader.py, modulo
# "masterledger_fico_entry"): lì Config leggerebbe il DATABASE_URL di
# Firenze e il bootstrap qui sopra scriverebbe conti e utenti nel database
# sbagliato. Il loader crea l'app da sé, con la configurazione FI/CO.
if __name__ != "masterledger_fico_entry":
    app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
