"""Esercitazione di PRIMA NOTA: l'allievo scrive da solo la scrittura (conto, Dare, Avere) e il server la corregge subito.

Le operazioni seguono i 20 capitoli del Manuale, nello stesso ordine: le scritture della banca delle domande (blocco del
capitolo) e le scritture svolte scritte nel manuale. Correzione: conti, sezioni e importi devono coincidere con la
scrittura del manuale (l'ordine delle righe non conta; righe dello stesso conto e sezione si sommano)."""
import json
import re
from collections import OrderedDict

from flask import abort, redirect, render_template, request, url_for

from ...accesso import utente_corrente
from ...db import db
from .banca import PIANO, QUESITI, UNITA
from .banca.aiuti import AIUTI
from .modelli import PrimaNotaRisposta
from .scritture_sap import CAPITOLI as CAPITOLI_SAP, DOCUMENTI


def _operazioni():
    """{capitolo: [operazione]} con operazione = {eid, testo, righe [(conto, sez, cent)], spiegazione, qid?}."""
    from .manuale_testo import PARTI
    ops, n = OrderedDict(), 0
    for p in PARTI:
        for c in p["capitoli"]:
            n += 1
            lista, k = [], 0
            for _tit, _html, esempi in c["sezioni"]:   # prima le scritture svolte nel manuale, nell'ordine dei paragrafi
                for e in esempi:
                    if isinstance(e, dict):
                        k += 1
                        lista.append({"eid": f"M{n:02d}-{k:02d}", "testo": e["testo"], "spiegazione": e["spiegazione"],
                                      "righe": [(cc, z, int(round(v * 100))) for cc, z, v in e["righe"]]})
            k = 0
            for doc, titolo, scritture, nota in CAPITOLI_SAP.get(c["titolo"], []):   # poi il caso Ferro & Transenne
                d = DOCUMENTI.get(doc)
                base = (d["testo"] if d else titolo).rstrip(". ")
                for j, sc in enumerate(scritture, 1):
                    k += 1
                    giro = f" — scrittura {j} di {len(scritture)}" if len(scritture) > 1 else ""
                    importi = " · ".join(_eu(v) for v in sorted({int(round(v * 100)) for _c, _z, v in sc}, reverse=True))
                    lista.append({"eid": f"F{n:02d}-{k:02d}", "caso": True,
                                  "testo": f"Caso Ferro & Transenne{', ' + _data(d['data']) if d and d.get('data') else ''}: {base}{giro}. Importi da usare (€): {importi}. Registrala con il metodo italiano del manuale.",
                                  "titolo_caso": titolo,
                                  "spiegazione": f"{titolo}. {nota}",
                                  "righe": [(cc, z, int(round(v * 100))) for cc, z, v in sc]})
            gia = {tuple(sorted(o["righe"])) for o in lista}
            for q in UNITA[f"C{n:02d}"]["domande"]:     # poi le scritture del blocco
                if q["tipo"] == "scrittura":
                    g = next(o for o in q["opzioni"] if o["ok"])
                    if tuple(sorted((r["conto"], r["sez"], r["cent"]) for r in g["righe"])) in gia:
                        continue
                    lista.append({"eid": q["id"], "qid": q["id"], "testo": q["testo"], "spiegazione": q["spiegazione"],
                                  "righe": [(r["conto"], r["sez"], r["cent"]) for r in g["righe"]]})
            ops[n] = {"titolo": c["titolo"], "lista": lista}
    return ops


def _data(iso):
    a, m, g = iso.split("-")
    return f"{int(g)}/{int(m)}/{a}"


OPERAZIONI = None


def operazioni():
    global OPERAZIONI
    if OPERAZIONI is None:
        OPERAZIONI = _operazioni()
    return OPERAZIONI


def conti_ammessi():
    """Piano dei conti del quiz + i conti che il manuale usa nelle scritture del caso (es. Cambiali attive)."""
    return set(PIANO) | {c for b in operazioni().values() for op in b["lista"] for c, _z, _v in op["righe"]}


def _importo(testo):
    """«1.500,00», «1500,5», «1500.50» → centesimi; vuoto → 0; non valido → None."""
    t = (testo or "").strip().replace("€", "").replace(" ", "")
    if not t:
        return 0
    if "," in t:
        t = t.replace(".", "").replace(",", ".")
    elif t.count(".") > 1 or re.fullmatch(r"\d{1,3}(\.\d{3})+", t):
        t = t.replace(".", "")
    try:
        v = float(t)
    except ValueError:
        return None
    return int(round(v * 100)) if v >= 0 else None


def _eu(cent):
    return f"{cent / 100:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _somma(righe):
    out = {}
    for c, z, v in righe:
        out[(c, z)] = out.get((c, z), 0) + v
    return {k: v for k, v in out.items() if v}


def correggi(scritte, giuste):
    """Confronta la scrittura dell'allievo con quella del manuale e spiega che cosa non va, riga per riga."""
    a, g = _somma(scritte), _somma(giuste)
    dare = sum(v for (c, z), v in a.items() if z == "D")
    avere = sum(v for (c, z), v in a.items() if z == "A")
    ok = a == g
    note = []
    if not ok:
        if dare != avere:
            note.append(f"La scrittura non quadra: Dare {_eu(dare)} € e Avere {_eu(avere)} €. In partita doppia i due totali devono essere uguali.")
        inv = {(c, "A" if z == "D" else "D"): v for (c, z), v in g.items()}
        if a == inv:
            note.append("Conti e importi giusti, ma le sezioni sono invertite: rileggi da che parte aumenta ciascun conto.")
        else:
            conti_a = {c for c, _z in a}
            conti_g = {c for c, _z in g}
            for c in sorted(conti_g - conti_a):
                note.append(f"Manca il conto «{c}».")
            for c in sorted(conti_a - conti_g):
                note.append(f"Il conto «{c}» non serve in questa operazione.")
            for (c, z), v in g.items():
                if c in conti_a:
                    if (c, z) not in a:
                        note.append(f"«{c}» va in {'Dare' if z == 'D' else 'Avere'}.")
                    elif a[(c, z)] != v:
                        note.append(f"«{c}»: l'importo non è giusto.")
    return ok, note


def _cerca(eid):
    for cap, blocco in operazioni().items():
        for i, op in enumerate(blocco["lista"]):
            if op["eid"] == eid:
                return cap, i, op
    return None, None, None


def _citazione(op, cap):
    from . import _dove_nel_manuale
    if op.get("qid"):
        return _dove_nel_manuale(QUESITI[op["qid"]])
    if op.get("caso"):
        return {"ancora": f"sap{cap}", "testo": f"capitolo {cap}, riquadro «Lo stesso nei programmi», operazione «{op['titolo_caso']}»",
                "citazione": None}
    from .manuale_testo import PARTI
    n = 0
    for p in PARTI:
        for c in p["capitoli"]:
            n += 1
            if n != cap:
                continue
            for i, (titolo, _h, esempi) in enumerate(c["sezioni"], 1):
                if any(isinstance(e, dict) and e["testo"] == op["testo"] for e in esempi):
                    return {"ancora": f"sez{n}.{i}", "testo": f"paragrafo {n}.{i} «{titolo}»", "citazione": op["spiegazione"]}
    return None


def registra(bp):
    @bp.get("/prima-nota")
    def prima_nota():
        u = utente_corrente()
        fatte = {}
        for r in PrimaNotaRisposta.query.filter_by(utente_id=u.id).order_by(PrimaNotaRisposta.data).all():
            fatte[r.eid] = r.corretta or fatte.get(r.eid, False)
        capitoli = [{"n": n, "titolo": b["titolo"], "tot": len(b["lista"]),
                     "giuste": sum(1 for op in b["lista"] if fatte.get(op["eid"])),
                     "fatte": sum(1 for op in b["lista"] if op["eid"] in fatte),
                     "prossima": next((op["eid"] for op in b["lista"] if not fatte.get(op["eid"])), b["lista"][0]["eid"] if b["lista"] else None)}
                    for n, b in operazioni().items()]
        tot = sum(c["tot"] for c in capitoli)
        prima = next((c["prossima"] for c in capitoli if c["giuste"] < c["tot"] and c["prossima"]), None)
        return render_template("ragioneria_quiz/primanota_indice.html", capitoli=capitoli, tot=tot,
                               giuste=sum(c["giuste"] for c in capitoli), prima=prima)

    @bp.route("/prima-nota/<eid>", methods=["GET", "POST"])
    def prima_nota_op(eid):
        u = utente_corrente()
        cap, i, op = _cerca(eid)
        if op is None:
            abort(404)
        lista = operazioni()[cap]["lista"]
        esito, scritte, aiuto = None, [], request.values.get("aiuto") == "1"
        if request.method == "POST":
            errori = []
            conti, dare, avere = request.form.getlist("conto"), request.form.getlist("dare"), request.form.getlist("avere")
            for c, d, a in zip(conti, dare, avere):
                c = (c or "").strip()
                vd, va = _importo(d), _importo(a)
                if not c and not vd and not va:
                    continue
                if c not in conti_ammessi():
                    errori.append(f"«{c or '(vuoto)'}» non è un conto del piano dei conti: sceglilo dall'elenco.")
                    continue
                if vd is None or va is None or (vd and va) or not (vd or va):
                    errori.append(f"«{c}»: scrivi un importo valido in Dare oppure in Avere (non in entrambi).")
                    continue
                scritte.append((c, "D" if vd else "A", vd or va))
            if errori or len(scritte) < 2:
                esito = {"valida": False, "note": errori or ["Una scrittura ha almeno due righe: un conto in Dare e uno in Avere."]}
            else:
                ok, note = correggi(scritte, op["righe"])
                db.session.add(PrimaNotaRisposta(utente_id=u.id, eid=eid, righe=json.dumps(scritte), corretta=ok, aiuto=aiuto))
                db.session.commit()
                esito = {"valida": True, "ok": ok, "note": note}
        succ = lista[i + 1]["eid"] if i + 1 < len(lista) else None
        if succ is None:
            dopo = next((b["lista"][0]["eid"] for n, b in operazioni().items() if n > cap and b["lista"]), None)
        else:
            dopo = succ
        giuste = [{"conto": c, "sez": z, "cent": v} for c, z, v in op["righe"]]
        return render_template("ragioneria_quiz/primanota.html", op=op, cap=cap, titolo_cap=operazioni()[cap]["titolo"],
                               pos=i + 1, tot=len(lista), esito=esito, scritte=scritte,
                               scritte_d=[{"conto": c, "sez": z, "cent": v} for c, z, v in scritte], giuste=giuste, dopo=dopo,
                               aiuto=aiuto, aiuto_testo=AIUTI.get(op.get("qid", ""), ""), dove=_citazione(op, cap),
                               conti=sorted(conti_ammessi()), righe_vuote=max(4, len(op["righe"]) + 1),
                               prec=lista[i - 1]["eid"] if i else None)
