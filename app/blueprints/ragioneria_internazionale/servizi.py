"""Contenuti e correttore del corso «Ragioneria internazionale IFRS e OIC».

I contenuti (12 moduli, 100 ore) vengono dal manuale Word «SAP S/4HANA FI/CO International»:
testo, risultati attesi del laboratorio, scritture del libro giornale e test. Ogni controllo è fatto qui,
sul server: la pagina non riceve mai le soluzioni prima della correzione."""
import json
from datetime import timedelta
from pathlib import Path

from ...db import adesso, db
from .modelli import RiEvento, RiModulo, RiScrittura

_D = json.loads((Path(__file__).with_name("dati.json")).read_text(encoding="utf-8"))
MODULI = {m["id"]: m for m in _D["moduli"]}
CONTENUTI = {int(k): v for k, v in _D["contenuti"].items()}
QUIZ = {int(k): v for k, v in _D["quiz"].items()}
ATTESI = {int(k): v for k, v in _D["attesi"].items()}
SCRITTURE = {int(k): v for k, v in _D["scritture"].items()}
CONTI = _D["conti"]
ETICHETTE = _D["etichette"]
ORE = sum(m["hours"] for m in MODULI.values())
ESAME = max(MODULI)
SOGLIA = 75
TOLLERANZA = 0.01
INDICATORI = ["Registrazioni e procedure", "Calcoli e riconciliazioni", "Controlli e documenti", "Relazione e autonomia"]
INDICATORI_ESAME = ["Contabilità OIC", "Reporting IFRS", "Analisi gestionale", "Fascicolo CFO"]
PAUSA = timedelta(minutes=10)      # due azioni distanti più di 10 minuti non contano come tempo di lavoro


def indicatori(n):
    return INDICATORI_ESAME if n == ESAME else INDICATORI


def js(testo, vuoto):
    try:
        return json.loads(testo) if testo else vuoto
    except ValueError:
        return vuoto


def stato(uid, n, crea=False):
    r = RiModulo.query.filter_by(utente_id=uid, modulo=n).first()
    if r is None and crea:
        r = RiModulo(utente_id=uid, modulo=n)
        db.session.add(r)
    return r


def evento(uid, n, tipo, testo):
    db.session.add(RiEvento(utente_id=uid, modulo=n, tipo=tipo, testo=testo[:300]))


# ── laboratorio ─────────────────────────────────────────────────────────────
def numero(testo):
    """Accetta «57.264,70», «57264,70», «57264.70», «−6.000»: restituisce float o None."""
    t = (testo or "").strip().replace("€", "").replace("%", "").replace(" ", "").replace("−", "-")
    if not t:
        return None
    if "," in t:                                    # scrittura italiana: 57.264,70
        t = t.replace(".", "").replace(",", ".")
    elif t.count(".") > 1 or (t.count(".") == 1 and len(t.split(".")[1]) == 3):
        t = t.replace(".", "")                      # 57.264 · 1.204.783 = punti delle migliaia
    try:
        return float(t)
    except ValueError:
        return None


def controlla_lab(n, valori):
    esito = {}
    for k, atteso in ATTESI[n].items():
        v = numero(valori.get(k, ""))
        esito[k] = v is not None and abs(v - atteso) <= TOLLERANZA + 1e-9
    return esito


# ── libro giornale ──────────────────────────────────────────────────────────
def _chiave(righe):
    m = {}
    for r in righe:
        lato = "D" if r["dare"] else "A"
        k = r["conto"] + "|" + lato
        m[k] = m.get(k, 0) + (r["dare"] or r["avere"])
    return ";".join(f"{k}|{v}" for k, v in sorted(m.items()))


def _cent(x):
    return int(round(float(x) * 100))


def confronta(n, righe, ledger):
    mia = _chiave(righe)
    for e in SCRITTURE.get(n, []):
        att = _chiave([{"conto": a, "dare": _cent(v), "avere": 0} for a, v in e["d"]] +
                      [{"conto": a, "dare": 0, "avere": _cent(v)} for a, v in e["a"]])
        if att == mia:
            if e["l"] and e["l"] != ledger:
                return False, e["t"], f"Conti e importi giusti («{e['t']}»), ma il ledger è sbagliato: questa scrittura va nel ledger {e['l']}."
            return True, e["t"], f"✓ Corrisponde alla scrittura del manuale «{e['t']}»."
    return False, "", "✗ La scrittura quadra, ma non corrisponde a nessuna scrittura del modulo: controlla conti, lati Dare/Avere e importi."


def leggi_righe(form, quante=8):
    """Righe del modulo HTML → lista in centesimi, oppure messaggio d'errore."""
    righe = []
    for i in range(quante):
        conto = (form.get(f"conto{i}") or "").strip()
        dare, avere = numero(form.get(f"dare{i}")), numero(form.get(f"avere{i}"))
        if not conto and not dare and not avere:
            continue
        if conto not in CONTI:
            return None, f"Riga {i + 1}: scegli il conto dal piano dei conti."
        if (dare or 0) < 0 or (avere or 0) < 0 or bool(dare) == bool(avere):
            return None, f"Riga {i + 1}: scrivi un solo importo positivo, in Dare oppure in Avere."
        righe.append({"conto": conto, "dare": _cent(dare or 0), "avere": _cent(avere or 0)})
    if len(righe) < 2:
        return None, "Servono almeno due righe."
    d, a = sum(r["dare"] for r in righe), sum(r["avere"] for r in righe)
    if d != a:
        return None, f"Documento non registrato: Dare {d / 100:,.2f} e Avere {a / 100:,.2f} devono coincidere.".replace(",", "X").replace(".", ",").replace("X", ".")
    return righe, None


def scritture_fatte(uid, n):
    """Titoli delle scritture del manuale già registrate correttamente (con il ledger giusto)."""
    return {s.modello for s in RiScrittura.query.filter_by(utente_id=uid, modulo=n, ok=True).all()}


# ── test ────────────────────────────────────────────────────────────────────
def ordine(n, i):
    """Ordine stabile delle risposte: la giusta ruota fra prima, seconda e terza posizione su tutto il corso."""
    pos = sum(len(QUIZ[m]) for m in sorted(QUIZ) if m < n) + i
    q = QUIZ[n][i]
    altri = [j for j in range(len(q[1])) if j != q[2]]
    altri.insert((pos * 2) % len(q[1]), q[2])
    return altri


def correggi_quiz(n, scelte):
    giuste = sum(1 for q, s in zip(QUIZ[n], scelte) if s == q[2])
    punti = round(100 * giuste / len(QUIZ[n]))
    return giuste, punti, punti >= SOGLIA


# ── riepiloghi per allievo e docente ────────────────────────────────────────
def riepilogo_modulo(uid, n, r=None):
    r = r if r is not None else stato(uid, n)
    passi = js(r.passi, []) if r else []
    voto = js(r.voto, []) if r else []
    auto = js(r.autovalutazione, []) if r else []
    fatte = len(scritture_fatte(uid, n))
    return {"n": n, "m": MODULI[n], "passi": len(passi), "passi_tot": len(MODULI[n]["tasks"]),
            "lab_ok": bool(r and r.lab_ok), "lab_campi": len(ATTESI[n]),
            "lab_giusti": sum(1 for v in js(r.lab_esito, {}).values() if v) if r else 0,
            "scritture": fatte, "scritture_tot": len(SCRITTURE.get(n, [])),
            "quiz": r.quiz_punti if r else None, "quiz_ok": bool(r and r.quiz_superato),
            "auto": sum(auto) if auto else None, "voto": sum(voto) if voto else None,
            "completo": bool(r and r.lab_ok and r.quiz_superato and fatte >= len(SCRITTURE.get(n, [])))}


def riepilogo(uid):
    righe = {r.modulo: r for r in RiModulo.query.filter_by(utente_id=uid).all()}
    return [riepilogo_modulo(uid, n, righe.get(n)) for n in sorted(MODULI)]


def tempo_e_ultima(uid):
    """Tempo di lavoro stimato dal diario del corso (azioni a meno di 10 minuti l'una dall'altra) e ultima attività."""
    ev = RiEvento.query.filter_by(utente_id=uid).order_by(RiEvento.quando).all()
    sec, prec = 0, None
    for e in ev:
        if prec is not None and e.quando - prec <= PAUSA:
            sec += int((e.quando - prec).total_seconds())
        prec = e.quando
    return sec, (ev[-1].quando if ev else None), len(ev)


def segna_pagina(uid, n, pagina):
    """Una sola voce di diario per pagina ogni 2 minuti: basta a misurare il tempo senza riempire il diario."""
    ult = RiEvento.query.filter_by(utente_id=uid).order_by(RiEvento.quando.desc()).first()
    if ult and ult.tipo == "pagina" and ult.modulo == n and ult.testo == pagina and adesso() - ult.quando < timedelta(minutes=2):
        return
    evento(uid, n, "pagina", pagina)
    db.session.commit()
