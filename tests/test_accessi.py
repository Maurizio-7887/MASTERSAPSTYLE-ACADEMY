"""Accessi, tempo di collegamento, costo, salvataggio del lavoro, consegna, report e risposta del docente.
Usa lo stato finale dell'esercizio guidato prodotto da test:file-unico (tests/stato-finale.json).
Uso: python tests/test_accessi.py"""
import json
import re
import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tests._client import app, csrf, docente, entra  # noqa: E402

from app.blueprints.sincronia import registra_battito  # noqa: E402
from app.db import Consegna, Sessione, Utente, adesso, db  # noqa: E402

FINALE = json.loads((Path(__file__).parent / "stato-finale.json").read_text(encoding="utf-8"))["stato"]
errori, passi = [], 0


def ok(cond, msg):
    global passi
    passi += 1
    if not cond:
        errori.append(msg)
        print("✗", msg)


def tok(c, url):
    return csrf(c.get(url).get_data(as_text=True))


def sync(html):
    m = re.search(r"window\.MSA_SYNC = (\{.*?\});</script>", html)
    return json.loads(m.group(1)) if m else None


# ── senza accesso ──
anonimo = app.test_client()
r = anonimo.get("/vuoto/contabilita/moduli")
ok(r.status_code == 302 and "/accesso" in r.headers["Location"], "pagina del simulatore senza accesso → login")
ok(anonimo.post("/api/battito", data="{}").status_code == 401, "API senza accesso → 401")
ok(anonimo.get("/").status_code == 200 and "Accedi" in anonimo.get("/").get_data(as_text=True), "pagina iniziale pubblica con Accedi")
ok(anonimo.get("/health").status_code == 200, "health pubblico")

# ── il docente crea l'allievo ──
d = docente()
r = d.post("/docente/allievi/nuovo", data={"csrf": tok(d, "/docente/allievi/nuovo"), "username": "Anna.Verdi", "nome": "Anna Verdi",
                                           "email": "anna@example.com", "costo_orario": "", "password": ""})
html = r.get_data(as_text=True)
pw = re.search(r'<code style="font-size:16px">([^<]+)</code>', html)
ok(r.status_code == 200 and pw, "allievo creato con password temporanea mostrata una volta")
pw = pw.group(1)
ok(d.post("/docente/allievi/nuovo", data={"csrf": tok(d, "/docente/allievi/nuovo"), "username": "anna.verdi", "nome": "Doppio"})
   .get_data(as_text=True).count("esiste già") == 1, "nome utente doppio rifiutato")
ok(d.post("/docente/allievi/nuovo", data={"username": "x.y", "nome": "Senza token"}).status_code == 400, "modulo senza CSRF rifiutato")

# ── primo accesso: password obbligatoria ──
a = app.test_client()
r = a.post("/accesso", data={"csrf": tok(a, "/accesso"), "username": "anna.verdi", "password": "sbagliata"})
ok(r.status_code == 401, "password sbagliata → 401")
a = entra("anna.verdi", pw)
r = a.get("/vuoto/")
ok(r.status_code == 302 and r.headers["Location"].endswith("/password"), "primo accesso → cambio password obbligatorio")
r = a.post("/password", data={"csrf": tok(a, "/password"), "attuale": pw, "nuova": "annaverdi2026", "conferma": "annaverdi2026"})
ok(r.status_code == 302 and r.headers["Location"].endswith("/area/"), "password cambiata → la mia area")
ok(a.get("/vuoto/").status_code == 200, "dopo il cambio entra nel launchpad")
ok(a.get("/docente/").status_code == 403, "l'allievo non entra nel pannello docente")

# ── stato del lavoro ──
s = sync(a.get("/vuoto/contabilita/moduli").get_data(as_text=True))
ok(s and s["stato"] is None and s["rev"] == 0 and s["battito"], "pagina del simulatore con sincronia, ancora senza lavoro")
ok(a.post("/api/stato/vuoto", data=json.dumps({"stato": "{}"})).status_code == 403, "salvataggio senza token → 403")
dati = json.dumps(FINALE, ensure_ascii=False)
r = a.post("/api/stato/vuoto", data=json.dumps({"csrf": s["csrf"], "stato": dati}), content_type="text/plain")
ok(r.status_code == 200 and r.get_json()["rev"] == 1, "lavoro salvato (rev 1)")
r = a.post("/api/stato/vuoto", data=json.dumps({"csrf": s["csrf"], "stato": dati}), headers={"X-CSRF": s["csrf"]})
ok(r.get_json()["rev"] == 1, "stesso lavoro → nessuna nuova revisione")
s2 = sync(a.get("/vuoto/").get_data(as_text=True))
ok(s2 and s2["stato"] == dati and s2["rev"] == 1, "il launchpad riporta il lavoro salvato nel browser")
ok(a.get("/api/stato/vuoto").get_json()["stato"] == dati, "GET dello stato")

# ── tempo di collegamento ──
with app.app_context():
    u = Utente.query.filter_by(username="anna.verdi").first()
    t0 = adesso() - timedelta(hours=3)
    registra_battito(u, "/vuoto/", t0)
    for i in range(1, 31):                       # 30 minuti di lavoro, un battito al minuto
        registra_battito(u, "/vuoto/contabilita/moduli", t0 + timedelta(minutes=i))
    registra_battito(u, "/vuoto/", t0 + timedelta(minutes=31, seconds=50))   # battito in ritardo: conta al massimo 2 min
    registra_battito(u, "/vuoto/", t0 + timedelta(minutes=60))               # pausa di 28 min → nuova sessione
    sessioni = Sessione.query.filter_by(utente_id=u.id).order_by(Sessione.inizio).all()
    ok(len(sessioni) == 2, f"pausa lunga apre una nuova sessione ({len(sessioni)})")
    ok(sessioni[0].secondi_attivi == 30 * 60 + 110, f"tempo attivo della prima sessione ({sessioni[0].secondi_attivi})")
    ok(sessioni[1].secondi_attivi == 0, "la nuova sessione parte da zero")
    secondi_prima = u.secondi_totali()
r = a.post("/api/battito", data=json.dumps({"csrf": s["csrf"], "pagina": "/vuoto/"}))
ok(r.status_code == 200 and r.get_json()["ok"], "battito dalla pagina")

# ── costo ──
r = d.post("/docente/impostazioni", data={"csrf": tok(d, "/docente/impostazioni"), "costo_orario": "30,00"})
ok(r.status_code == 302, "costo orario generale impostato")
html = d.get("/docente/").get_data(as_text=True)
costo_atteso = f"{round(secondi_prima / 3600 * 30, 2):.2f}".replace(".", ",")
ok("Anna Verdi" in html and costo_atteso in html, f"pannello: tempo e costo dell'allievo ({costo_atteso})")
with app.app_context():
    uid = Utente.query.filter_by(username="anna.verdi").first().id
r = d.post(f"/docente/allievo/{uid}", data={"csrf": tok(d, f"/docente/allievo/{uid}"), "nome": "Anna Verdi", "email": "anna@example.com",
                                           "costo_orario": "40", "attivo": "1"})
ok(r.status_code == 302, "costo orario personale")
csv_ = d.get("/docente/tempi?formato=csv").get_data(as_text=True)
ok("Anna Verdi" in csv_ and "40,00" in csv_, "CSV dei tempi con il costo personale")

# ── consegna ──
r = a.post("/area/consegna", data={"csrf": tok(a, "/area/consegna"), "versione": "vuoto", "esercizio": "guidato-dic-2026",
                                   "nota": "Non mi torna la RiBa insoluta"})
ok(r.status_code == 302 and "/area/consegna/" in r.headers["Location"], "consegna inviata")
cid = int(r.headers["Location"].rstrip("/").split("/")[-1])
ok("in correzione" in a.get(f"/area/consegna/{cid}").get_data(as_text=True), "l'allievo vede la consegna in correzione")
with app.app_context():
    c = db.session.get(Consegna, cid)
    ok(c.secondi_collegato >= secondi_prima, "la consegna fotografa il tempo di collegamento")

html = d.get("/docente/").get_data(as_text=True)
ok("Correggi" in html, "consegna nel pannello da correggere")
html = d.get(f"/docente/consegna/{cid}").get_data(as_text=True)
ok("15 su 15 esatti" in html, "report: tutti i 15 numeri dell'esercizio esatti")
ok("Non mi torna la RiBa insoluta" in html, "report: messaggio dell'allievo")
st = d.get(f"/docente/consegna/{cid}/stampa").get_data(as_text=True)
for atteso in ["Report del lavoro — Anna Verdi", "1.611,43", "508,87", "74.095,13", "Libro giornale (78 scritture)", "Bilancio di verifica"]:
    ok(atteso in st, f"stampa contiene «{atteso}»")
ok(st.count("<span class=\"ok-no\">✗") == 0, "stampa senza controlli falliti")
b = d.get(f"/docente/consegna/{cid}/backup.json")
ok(b.status_code == 200 and json.loads(b.get_data(as_text=True))["registrazioni"], "backup JSON della consegna")

# ── risposta ──
t = tok(d, f"/docente/consegna/{cid}")
d.post(f"/docente/consegna/{cid}", data={"csrf": t, "risposta": "Bozza", "voto": "", "azione": "bozza"})
ok("Il docente non ha ancora corretto" in a.get(f"/area/consegna/{cid}").get_data(as_text=True), "la bozza non è visibile all'allievo")
d.post(f"/docente/consegna/{cid}", data={"csrf": t, "risposta": "Ottimo lavoro: rivedi solo la RiBa.", "voto": "9/10", "azione": "invia"})
html = d.get(f"/docente/consegna/{cid}").get_data(as_text=True)
ok("mailto:anna%40example.com" in html, "link email con la risposta")
ok("1 nuova risposta" in a.get("/area/").get_data(as_text=True), "l'allievo vede l'avviso della nuova risposta")
html = a.get(f"/area/consegna/{cid}").get_data(as_text=True)
ok("Ottimo lavoro: rivedi solo la RiBa." in html and "9/10" in html, "l'allievo legge risposta e voto")
ok("nuova risposta" not in a.get("/area/").get_data(as_text=True), "risposta segnata come letta")

# ── un altro allievo non vede la consegna ──
r = d.post("/docente/allievi/nuovo", data={"csrf": tok(d, "/docente/allievi/nuovo"), "username": "luca", "nome": "Luca", "password": "lucaluca1"})
l = entra("luca", "lucaluca1")
l.post("/password", data={"csrf": tok(l, "/password"), "attuale": "lucaluca1", "nuova": "lucaluca2", "conferma": "lucaluca2"})
ok(l.get(f"/area/consegna/{cid}").status_code == 404, "un altro allievo non vede la consegna")
ok(sync(l.get("/vuoto/").get_data(as_text=True))["stato"] is None, "un altro allievo non riceve il lavoro di Anna")

# ── blocco dopo 5 tentativi ──
x = app.test_client()
for _ in range(5):
    x.post("/accesso", data={"csrf": tok(x, "/accesso"), "username": "luca", "password": "no"})
r = x.post("/accesso", data={"csrf": tok(x, "/accesso"), "username": "luca", "password": "lucaluca2"})
ok(r.status_code == 429, "dopo 5 tentativi sbagliati l'accesso è bloccato")

# ── reimposta password e disattiva ──
with app.app_context():
    lid = Utente.query.filter_by(username="luca").first().id
r = d.post(f"/docente/allievo/{lid}/password", data={"csrf": tok(d, f"/docente/allievo/{lid}")})
nuova = re.search(r'<code style="font-size:16px">([^<]+)</code>', r.get_data(as_text=True)).group(1)
ok(l.get("/area/").status_code == 302, "dopo il reset la vecchia sessione decade")
entra("luca", nuova)
d.post(f"/docente/allievo/{lid}", data={"csrf": tok(d, f"/docente/allievo/{lid}"), "nome": "Luca", "attivo": "0"})
y = app.test_client()
ok(y.post("/accesso", data={"csrf": tok(y, "/accesso"), "username": "luca", "password": nuova}).status_code == 401, "allievo disattivato non entra")

# ── passa il lavoro: docente → allievo e ritorno ──
sd = sync(d.get("/vuoto/").get_data(as_text=True))
lavoro_docente = json.dumps({**FINALE, "notaDocente": "lavagna"}, ensure_ascii=False)
d.post("/api/stato/vuoto", data=json.dumps({"csrf": sd["csrf"], "stato": lavoro_docente}))
with app.app_context():
    aid = Utente.query.filter_by(username="anna.verdi").first().id
r = d.post("/docente/passa", data={"csrf": tok(d, "/docente/passa"), "verso": "a_allievi", "versione": "vuoto", "allievi": [str(aid)]})
ok(r.status_code == 302, "lavoro del docente passato all'allievo")
s3 = sync(a.get("/vuoto/").get_data(as_text=True))
ok(s3["stato"] == lavoro_docente and s3["rev"] == 2, "l'allievo riparte dal lavoro del docente (rev 2)")
html = d.get("/docente/passa").get_data(as_text=True)
ok("sostituito dal lavoro del docente" in html, "il lavoro precedente dell'allievo è in archivio")
arch = re.search(r'/docente/archivio/(\d+)/ripristina', html).group(1)
d.post(f"/docente/archivio/{arch}/ripristina", data={"csrf": tok(d, "/docente/passa")})
ok(sync(a.get("/vuoto/").get_data(as_text=True))["stato"] == dati, "ripristino dall'archivio")
r = d.post("/docente/passa", data={"csrf": tok(d, "/docente/passa"), "verso": "da_allievo", "versione": "vuoto", "allievo": str(aid)})
ok(r.status_code == 302 and sync(d.get("/vuoto/").get_data(as_text=True))["stato"] == dati, "il docente carica il lavoro dell'allievo")
ok(a.get("/docente/passa").status_code == 403, "l'allievo non può passare lavori")
html = a.get("/vuoto/contabilita/fi-gl").get_data(as_text=True)
ok("guidato-dic-2026.js" in html and "pannello.js" in html, "finestra «Esercizio passo passo» nelle pagine del simulatore")
ok("pannello.js" in a.get("/completo/").get_data(as_text=True), "finestra anche nella versione completa")

# ── laboratori: lavoro salvato nel proprio slot, consegna e report ──
for slot, es, file, attesi in [("lab-hmlv", "hmlv-disaccoppiamento", "lab-hmlv-finale.json", 8), ("lab-rem", "rem-trattore", "lab-rem-finale.json", 8)]:
    lab = (Path(__file__).parent / file).read_text(encoding="utf-8")
    pagina = "/vuoto/alta-varieta/" if slot == "lab-hmlv" else "/vuoto/ripetitiva/"
    sl = sync(a.get(pagina).get_data(as_text=True))
    ok(sl and sl["chiave"].endswith(slot + "-civilistico"), f"{slot}: pagina con sincronia del laboratorio")
    r = a.post(f"/api/stato/{slot}", data=json.dumps({"csrf": sl["csrf"], "stato": lab}))
    ok(r.status_code == 200, f"{slot}: lavoro salvato")
    r = a.post("/area/consegna", data={"csrf": tok(a, "/area/consegna"), "versione": slot, "esercizio": es, "nota": "laboratorio"})
    ok(r.status_code == 302, f"{slot}: consegnato")
    lid = int(r.headers["Location"].rstrip("/").split("/")[-1])
    ok(f"{attesi} su {attesi} esatti" in d.get(f"/docente/consegna/{lid}").get_data(as_text=True), f"{slot}: report {attesi} su {attesi}")
    ok(d.get(f"/docente/consegna/{lid}/stampa").status_code == 200, f"{slot}: stampa")

# ── uscita ──
r = a.post("/esci", data={"csrf": tok(a, "/area/")})
ok(r.status_code == 200 and "Sei uscito" in r.get_data(as_text=True), "uscita")
ok(a.get("/area/").status_code == 302, "dopo l'uscita serve di nuovo l'accesso")

print("\n".join(errori) and f"❌ {len(errori)} errori su {passi} controlli" or f"✅ accessi, tempi, costi, consegne e report: {passi} controlli")
sys.exit(1 if errori else 0)
