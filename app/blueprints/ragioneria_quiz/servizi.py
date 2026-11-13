"""Estrazione delle prove, correzione e statistiche. Il voto lo calcola solo il server."""
import json
import random

from ...db import adesso, db
from .banca import QUESITI, UNITA, VERSIONE_BANCA
from .modelli import EventoQuiz, RispostaQuiz, TentativoQuiz

MODALITA = {
    "allenamento": {"titolo": "Allenamento", "domande": 8, "feedback": "subito", "tentativi": None},
    "ripasso": {"titolo": "Ripasso degli errori", "domande": 10, "feedback": "subito", "tentativi": None},
    "verifica": {"titolo": "Verifica del blocco", "domande": 10, "feedback": "subito", "tentativi": 2},
    "diagnostica": {"titolo": "Test d'ingresso", "domande": 20, "feedback": "subito", "tentativi": None},
    "finale": {"titolo": "Prova finale", "domande": 60, "feedback": "subito", "tentativi": 2},
}
SOGLIA = 70          # % per verifica e finale
SOGLIA_PARTE = 60    # % minima separata di teoria e applicazione nella finale


def chiave_limite(modalita, unita):
    return f"{modalita}:{unita}" if unita else modalita


def tentativi_usati(uid, modalita, unita=None):
    return TentativoQuiz.query.filter_by(utente_id=uid, modalita=modalita, unita=unita, stato="consegnato").count()


def tentativi_concessi(uid, modalita, unita=None):
    base = MODALITA[modalita]["tentativi"]
    if base is None:
        return None
    extra = EventoQuiz.query.filter_by(utente_id=uid, tipo="tentativo_extra", chiave=chiave_limite(modalita, unita)).count()
    return base + extra


def aperto(uid, modalita, unita=None):
    return TentativoQuiz.query.filter_by(utente_id=uid, modalita=modalita, unita=unita, stato="in_corso").first()


def ultimo_esito_per_quesito(uid):
    """qid → True/False dell'ultima risposta data (solo prove non annullate)."""
    righe = (db.session.query(RispostaQuiz.qid, RispostaQuiz.corretta, RispostaQuiz.data)
             .join(TentativoQuiz, TentativoQuiz.id == RispostaQuiz.tentativo_id)
             .filter(TentativoQuiz.utente_id == uid, TentativoQuiz.stato != "annullato",
                     RispostaQuiz.corretta.isnot(None))
             .order_by(RispostaQuiz.data).all())
    esito = {}
    for qid, ok, _ in righe:
        esito[qid] = ok
    return esito


def _ordina(pool, esiti, rnd):
    """Prima i quesiti mai visti, poi quelli sbagliati, poi gli altri."""
    def peso(q):
        e = esiti.get(q["id"])
        return (0 if e is None else 1 if e is False else 2, rnd.random())
    return sorted(pool, key=peso)


def _equilibrato(pool, n, esiti, rnd):
    teo = _ordina([q for q in pool if q["area"] == "teoria"], esiti, rnd)
    app = _ordina([q for q in pool if q["area"] != "teoria"], esiti, rnd)
    scelti = []
    while len(scelti) < n and (teo or app):
        if app and (len(scelti) % 2 == 0 or not teo):
            scelti.append(app.pop(0))
        elif teo:
            scelti.append(teo.pop(0))
    return scelti


def estrai(uid, modalita, unita=None, rnd=None):
    rnd = rnd or random.Random()
    esiti = ultimo_esito_per_quesito(uid)
    n = MODALITA[modalita]["domande"]
    if modalita in ("allenamento", "verifica"):
        scelti = _equilibrato(UNITA[unita]["domande"], n, esiti, rnd)
    elif modalita == "diagnostica":
        scelti = [rnd.choice(u["domande"]) for u in UNITA.values()]
    elif modalita == "finale":
        scelti = []
        for i, u in enumerate(UNITA.values()):
            teo = [q for q in u["domande"] if q["area"] == "teoria"]
            app = [q for q in u["domande"] if q["area"] != "teoria"]
            vuole_teo = 2 if i % 2 == 0 else 1
            t = rnd.sample(teo, min(vuole_teo, len(teo)))
            a = rnd.sample(app, min(3 - len(t), len(app)))
            if len(t) + len(a) < 3:        # unità sbilanciata: completa con quel che resta
                resto = [q for q in u["domande"] if q not in t and q not in a]
                a += rnd.sample(resto, 3 - len(t) - len(a))
            scelti += t + a
    elif modalita == "ripasso":
        sbagliati = [qid for qid, ok in esiti.items() if ok is False and qid in QUESITI]
        rnd.shuffle(sbagliati)
        scelti = [QUESITI[q] for q in sbagliati[:n]]
    else:
        raise ValueError(modalita)
    if modalita not in ("finale", "diagnostica"):
        rnd.shuffle(scelti)
    prova = []
    for q in scelti:
        foto = json.loads(json.dumps(q))            # copia profonda: la prova non cambia se la banca cambia
        rnd.shuffle(foto["opzioni"])
        prova.append(foto)
    return prova


def crea(uid, modalita, unita=None):
    prova = estrai(uid, modalita, unita)
    if not prova:
        return None
    t = TentativoQuiz(utente_id=uid, modalita=modalita, unita=unita, versione_banca=VERSIONE_BANCA,
                      prova=json.dumps(prova, ensure_ascii=False), stato="in_corso")
    db.session.add(t)
    db.session.commit()
    return t


def domande(t):
    return json.loads(t.prova)


def risposte(t):
    return {r.qid: r for r in RispostaQuiz.query.filter_by(tentativo_id=t.id).all()}


def esatta(q, scelta):
    giuste = {o["id"] for o in q["opzioni"] if o["ok"]}
    return set(scelta) == giuste


def valida_scelta(q, valori):
    ammessi = {o["id"] for o in q["opzioni"]}
    scelta = [v for v in dict.fromkeys(valori) if v in ammessi]
    if not scelta:
        return None
    if not q["multi"] and len(scelta) != 1:
        return None
    return sorted(scelta)


def salva_risposta(t, pos, valori):
    """Ritorna (risposta, errore). In allenamento la prima risposta è definitiva."""
    qs = domande(t)
    if t.stato != "in_corso" or not (0 <= pos < len(qs)):
        return None, "Prova non più modificabile."
    q = qs[pos]
    scelta = valida_scelta(q, valori)
    if scelta is None:
        return None, ("Seleziona tutte le risposte che ritieni corrette." if q["multi"] else "Seleziona una risposta.")
    r = RispostaQuiz.query.filter_by(tentativo_id=t.id, qid=q["id"]).first()
    subito = MODALITA[t.modalita]["feedback"] == "subito"
    if r and r.scelta and subito:
        return r, None                                  # già risposta: non si cambia in allenamento
    if r is None:
        r = RispostaQuiz(tentativo_id=t.id, qid=q["id"], posizione=pos)
        db.session.add(r)
    r.scelta = json.dumps(scelta)
    r.corretta = esatta(q, scelta) if subito else None  # nelle verifiche si corregge alla consegna
    r.data = adesso()
    db.session.commit()
    return r, None


def segna_aiuto(t, pos):
    qs = domande(t)
    if t.stato != "in_corso" or not (0 <= pos < len(qs)):
        return
    q = qs[pos]
    r = RispostaQuiz.query.filter_by(tentativo_id=t.id, qid=q["id"]).first()
    if r is None:
        r = RispostaQuiz(tentativo_id=t.id, qid=q["id"], posizione=pos, aiuto=True)
        db.session.add(r)
    elif r.scelta:
        return
    r.aiuto = True
    db.session.commit()


def consegna(t):
    """Congela e corregge. Idempotente: una seconda consegna non cambia nulla."""
    if t.stato != "in_corso":
        return False
    qs = domande(t)
    rs = risposte(t)
    punti = pt = mt = pa = ma = aiuti = 0
    for i, q in enumerate(qs):
        r = rs.get(q["id"])
        scelta = json.loads(r.scelta) if r and r.scelta else []
        ok = bool(scelta) and esatta(q, scelta)
        if r is None:
            r = RispostaQuiz(tentativo_id=t.id, qid=q["id"], posizione=i, scelta=None)
            db.session.add(r)
        r.corretta = ok
        aiuti += 1 if r.aiuto else 0
        punti += ok
        if q["area"] == "teoria":
            mt += 1; pt += ok
        else:
            ma += 1; pa += ok
    massimo = len(qs)
    superato = None
    if t.modalita == "verifica":
        superato = punti * 100 >= SOGLIA * massimo
    elif t.modalita == "finale":
        superato = (punti * 100 >= SOGLIA * massimo
                    and (mt == 0 or pt * 100 >= SOGLIA_PARTE * mt) and (ma == 0 or pa * 100 >= SOGLIA_PARTE * ma))
    n = TentativoQuiz.query.filter_by(id=t.id, stato="in_corso").update({
        "stato": "consegnato", "consegnato": adesso(), "punti": punti, "massimo": massimo,
        "punti_teoria": pt, "max_teoria": mt, "punti_app": pa, "max_app": ma, "superato": superato, "aiuti": aiuti})
    if n != 1:
        db.session.rollback()
        return False
    db.session.commit()
    db.session.refresh(t)
    return True


def andamento(uid):
    """Riepilogo per l'allievo e per il docente."""
    ts = TentativoQuiz.query.filter_by(utente_id=uid).filter(TentativoQuiz.stato != "annullato").order_by(TentativoQuiz.iniziato).all()
    per_unita = {c: {"verifiche": [], "allenamenti": 0, "migliore": None, "aperta": None} for c in UNITA}
    finali, diagnostiche = [], []
    for t in ts:
        if t.unita and t.unita not in per_unita:   # prova su un'unità storica (Q01…Q20): resta nell'elenco dei tentativi
            continue
        if t.stato == "in_corso":
            if t.unita and t.modalita in ("verifica", "allenamento"):
                per_unita[t.unita]["aperta"] = per_unita[t.unita]["aperta"] or t
            continue
        if t.modalita == "verifica":
            per_unita[t.unita]["verifiche"].append(t)
            m = per_unita[t.unita]["migliore"]
            if m is None or t.percentuale > m.percentuale:
                per_unita[t.unita]["migliore"] = t
        elif t.modalita == "allenamento":
            per_unita[t.unita]["allenamenti"] += 1
        elif t.modalita == "finale":
            finali.append(t)
        elif t.modalita == "diagnostica":
            diagnostiche.append(t)
    # padronanza per unità: risposte corrette / risposte viste (su tutte le prove consegnate o d'allenamento)
    righe = (db.session.query(RispostaQuiz.qid, RispostaQuiz.corretta)
             .join(TentativoQuiz, TentativoQuiz.id == RispostaQuiz.tentativo_id)
             .filter(TentativoQuiz.utente_id == uid, TentativoQuiz.stato != "annullato",
                     RispostaQuiz.corretta.isnot(None)).all())
    for c in per_unita:
        per_unita[c]["viste"] = 0
        per_unita[c]["giuste"] = 0
    for qid, ok in righe:
        c = QUESITI[qid]["unita"] if qid in QUESITI else None   # il blocco del manuale in cui sta oggi la domanda
        if c in per_unita:
            per_unita[c]["viste"] += 1
            per_unita[c]["giuste"] += 1 if ok else 0
    esiti = ultimo_esito_per_quesito(uid)
    da_ripassare = sum(1 for qid, ok in esiti.items() if ok is False and qid in QUESITI)
    migliore_finale = max(finali, key=lambda t: t.percentuale, default=None)
    return {"unita": per_unita, "finali": finali, "diagnostiche": diagnostiche, "migliore_finale": migliore_finale,
            "da_ripassare": da_ripassare, "tentativi": ts,
            "verifiche_superate": sum(1 for u in per_unita.values() if u["migliore"] and u["migliore"].superato)}
