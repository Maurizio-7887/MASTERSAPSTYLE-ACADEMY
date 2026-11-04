"""Protezione del lavoro salvato: uno stato vuoto o incompleto non sostituisce mai un lavoro popolato; copie prima di ogni riduzione.
Uso: python tests/test_protezione_stato.py"""
import json
import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tests._client import app, csrf, docente  # noqa: E402

from app.db import ArchivioLavoro, StatoLavoro, db  # noqa: E402

c = docente()
tok = csrf(c.get("/docente/passa").get_data(as_text=True))
ok = 0


def verifica(cond, msg):
    global ok
    if not cond:
        print("✘", msg)
        sys.exit(1)
    ok += 1


def invia(slot, stato, azzera=False):
    corpo = {"csrf": tok, "stato": stato if isinstance(stato, str) else json.dumps(stato), "azzera": azzera}
    return c.post(f"/api/stato/{slot}", data=json.dumps(corpo), headers={"X-CSRF": tok, "Content-Type": "text/plain"})


def server(slot):
    return c.get(f"/api/stato/{slot}").get_json()


def copie(slot, categoria=""):
    with app.app_context():
        return [a.motivo for a in ArchivioLavoro.query.filter(ArchivioLavoro.versione == slot, ArchivioLavoro.motivo.like("copia automatica" + categoria + "%")).all()]


def regs(n):
    return {"lab": "erp", "registrazioni": [{"n": i} for i in range(n)], "avviato": "2026-12-01"}


S = "erp-ft"
verifica(invia(S, regs(5)).status_code == 200 and server(S)["rev"] == 1, "primo salvataggio")
r = invia(S, "{}")
verifica(r.status_code == 409 and json.loads(r.get_json()["stato"])["registrazioni"] and server(S)["rev"] == 1, "stato vuoto rifiutato, lavoro intatto")
verifica(invia(S, '{"msaGuida":{"x":{"a":1}}}').status_code == 409, "stato incompleto (solo pannello) rifiutato")
verifica(invia(S, '"testo"').status_code == 409 and invia(S, "[1,2]").status_code == 409, "JSON non oggetto rifiutato")
verifica(invia(S, {"lab": "altro", "registrazioni": [1, 2, 3, 4, 5, 6]}).status_code == 409, "stato di altro tipo rifiutato")
verifica(len(json.loads(server(S)["stato"])["registrazioni"]) == 5, "dopo i rifiuti il lavoro è ancora quello di prima")
verifica(copie(S, " a tempo") == [], "nessuna copia se non c'è stata sostituzione")

# salvataggio normale: la prima sostituzione crea una copia a tempo, la seconda (subito dopo) no
verifica(invia(S, regs(6)).status_code == 200, "salvataggio con più scritture")
verifica(len(copie(S, " a tempo")) == 1, "copia automatica a tempo")
verifica(invia(S, regs(7)).status_code == 200 and len(copie(S, " a tempo")) == 1, "non più di una copia ogni 30 minuti")

# riduzione delle scritture: ammessa (annullamenti), ma prima c'è la copia
verifica(invia(S, regs(2)).status_code == 200, "riduzione ammessa")
verifica(len(copie(S, " prima di una riduzione")) == 1, "copia prima della riduzione")
with app.app_context():
    riga = ArchivioLavoro.query.filter(ArchivioLavoro.motivo.like("copia automatica prima di una riduzione%")).first()
    verifica(len(json.loads(riga.dati)["registrazioni"]) == 7, "la copia contiene il lavoro com'era prima (7 scritture)")

# azzeramento esplicito: ammesso anche con stato vuoto, con copia
invia(S, regs(4))
verifica(invia(S, {"lab": "erp", "registrazioni": []}, azzera=True).status_code == 200, "azzeramento esplicito ammesso")
verifica(len(json.loads(server(S)["stato"])["registrazioni"]) == 0 and len(copie(S, " prima di una riduzione")) == 2, "azzeramento esplicito: copia prima")

# tetto alle copie
for n in range(3, 30):
    invia(S, regs(n))
    invia(S, regs(1))
verifica(len(copie(S, " prima di una riduzione")) <= 8, "le copie «prima di una riduzione» sono limitate a 8")
with app.app_context():
    a = ArchivioLavoro.query.filter(ArchivioLavoro.motivo.like("copia automatica a tempo%")).first()
    if a:
        a.creato -= timedelta(hours=2)
        db.session.commit()
verifica(len(copie(S, " a tempo")) <= 8, "le copie a tempo sono limitate a 8")

# la prima volta senza lavoro: qualsiasi stato valido si salva (nessun lavoro da proteggere)
verifica(invia("vuoto", "{}").status_code == 200, "primo salvataggio di uno stato qualunque su uno slot vuoto")
# pannello docente: elenco generale senza copie automatiche, elenco per allievo con tutte
h = c.get("/docente/passa").get_data(as_text=True)
verifica("copia automatica" not in h, "le copie automatiche non affollano l'elenco generale")
with app.app_context():
    uid = StatoLavoro.query.filter_by(versione=S).first().utente_id
h = c.get(f"/docente/passa?allievo={uid}").get_data(as_text=True)
verifica("copia automatica" in h and "Ripristina" in h, "elenco per allievo con le copie automatiche e il pulsante Ripristina")
print(f"✅ protezione del lavoro salvato: {ok} verifiche")
