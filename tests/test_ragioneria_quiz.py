"""Questionario di ragioneria (Firenze · Amministrazione): banca valida, correzione lato server,
chiavi mai inviate prima della consegna, limiti dei tentativi, isolamento tra allievi, pannello docente."""
import json
import re
import unittest

from markupsafe import escape

from tests._client import app, csrf, docente, entra

from app.blueprints.ragioneria_quiz.banca import PIANO, QUESITI, UNITA, quadra, riepilogo
from app.blueprints.ragioneria_quiz.modelli import TentativoQuiz
from app.blueprints.ragioneria_quiz import servizi as sv
from app.db import Utente, db


def nuovo_allievo(username):
    with app.app_context():
        u = Utente.query.filter_by(username=username).first()
        if u is None:
            u = Utente(username=username, nome=username.title(), ruolo="allievo", deve_cambiare_password=False)
            u.imposta_password("password-di-prova")
            db.session.add(u)
            db.session.commit()
    return entra(username, "password-di-prova")


def avvia(c, modalita, unita=None):
    t = csrf(c.get("/ragioneria-quiz/").get_data(as_text=True))
    dati = {"csrf": t, "modalita": modalita}
    if unita:
        dati["unita"] = unita
    r = c.post("/ragioneria-quiz/avvia", data=dati)
    assert r.status_code == 302, r.status_code
    m = re.search(r"/tentativo/(\d+)", r.headers["Location"])
    assert m, r.headers["Location"]
    return int(m.group(1))


def prova(tid):
    with app.app_context():
        return json.loads(db.session.get(TentativoQuiz, tid).prova)


def rispondi(c, tid, n, ids):
    html = c.get(f"/ragioneria-quiz/tentativo/{tid}?n={n}").get_data(as_text=True)
    return c.post(f"/ragioneria-quiz/tentativo/{tid}/risposta", data={"csrf": csrf(html), "n": n, "scelta": ids})


def consegna(c, tid):
    html = c.get(f"/ragioneria-quiz/tentativo/{tid}").get_data(as_text=True)
    return c.post(f"/ragioneria-quiz/tentativo/{tid}/consegna", data={"csrf": csrf(html)})


class Banca(unittest.TestCase):
    def test_copertura(self):
        r = riepilogo()
        self.assertEqual(r["unita"], 20)
        self.assertGreaterEqual(r["quesiti"], 240)
        from app.blueprints.ragioneria_quiz.manuale_testo import PARTI
        capitoli = [c["titolo"] for p in PARTI for c in p["capitoli"]]
        self.assertEqual(list(UNITA), [f"C{i:02d}" for i in range(1, 21)])          # blocchi = capitoli, in ordine
        self.assertEqual([u["titolo"] for u in UNITA.values()], capitoli)
        for cod, u in UNITA.items():
            self.assertGreaterEqual(len(u["domande"]), 8, cod)
            self.assertTrue(any(q["area"] == "teoria" for q in u["domande"]), cod)
            self.assertTrue(any(q["area"] != "teoria" for q in u["domande"]), cod)
            self.assertTrue(u["studio"], cod)

    def test_scritture_corrette_quadrano_e_conti_esistono(self):
        for q in QUESITI.values():
            if q["tipo"] != "scrittura":
                continue
            giusta = [o for o in q["opzioni"] if o["ok"]]
            self.assertEqual(len(giusta), 1, q["id"])
            self.assertTrue(quadra(giusta[0]["righe"]), q["id"])
            for o in q["opzioni"]:
                for r in o["righe"]:
                    self.assertIn(r["conto"], PIANO, q["id"])

    def test_argomenti_richiesti(self):
        titoli = " ".join(u["titolo"].lower() for u in UNITA.values())
        for parola in ("partita doppia", "mastro", "giornale", "acquisti", "vendite", "incassi", "pagamenti",
                       "personale", "mutuo", "leasing", "anticipo fatture", "magazzino", "chiusura", "riapertura"):
            self.assertIn(parola, titoli)

    def test_correzioni_missioni_colab(self):
        # M16: la bolletta non è più «acquisto merci»; M51: IVA indetraibile nel costo del cespite
        q = QUESITI["Q02-12"]
        self.assertIn("Energia elettrica", [r["conto"] for r in q["opzioni"][0]["righe"]])
        q = QUESITI["Q08-05"]
        self.assertIn(("Automezzi", "D", 1132000), [(r["conto"], r["sez"], r["cent"]) for r in q["opzioni"][0]["righe"]])
        # M44: i dividendi non escono dalla riserva legale
        q = QUESITI["Q04-05"]
        giusta = q["opzioni"][0]["righe"]
        self.assertFalse(any(r["conto"] == "Riserva legale" and r["sez"] == "D" for r in giusta))


class BlocchiDelManuale(unittest.TestCase):
    def test_ogni_domanda_in_un_solo_blocco_e_id_storici_conservati(self):
        from app.blueprints.ragioneria_quiz.banca import UNITA_STORICHE
        visti = [q["id"] for u in UNITA.values() for q in u["domande"]]
        self.assertEqual(sorted(visti), sorted(QUESITI))
        self.assertEqual(len(UNITA_STORICHE), 20)
        self.assertEqual(QUESITI["Q15-02"]["unita"], "C17")
        self.assertEqual(QUESITI["Q08-05"]["unita"], "C06")
        self.assertEqual(QUESITI["Q16-09"]["unita"], "C20")
        self.assertEqual(UNITA["Q05"]["titolo"], UNITA_STORICHE["Q05"]["titolo"])   # le prove vecchie si leggono ancora
        self.assertNotIn("Q05", UNITA)

    def test_prove_fatte_con_le_unita_storiche_restano_leggibili(self):
        c = nuovo_allievo("rq_storico")
        with app.app_context():
            u = Utente.query.filter_by(username="rq_storico").first()
            q = json.loads(json.dumps(QUESITI["Q05-01"]))
            q["unita"] = "Q05"
            t = TentativoQuiz(utente_id=u.id, modalita="verifica", unita="Q05", versione_banca="2026.11-r1",
                              prova=json.dumps([q]), stato="consegnato", punti=1, massimo=1, superato=True)
            db.session.add(t)
            db.session.commit()
            tid = t.id
        self.assertEqual(c.get("/ragioneria-quiz/").status_code, 200)
        self.assertEqual(c.get(f"/ragioneria-quiz/tentativo/{tid}/risultato").status_code, 200)
        r = c.get("/ragioneria-quiz/unita/Q05")
        self.assertEqual(r.status_code, 302)
        self.assertIn("/unita/C07", r.headers["Location"])

    def test_aiuto_cita_il_testo_del_manuale(self):
        from app.blueprints.ragioneria_quiz import _dove_nel_manuale
        for qid in QUESITI:
            d = _dove_nel_manuale(QUESITI[qid])
            self.assertTrue(d and d["citazione"].strip(". "), qid)
            self.assertTrue(d["testo"].startswith(f"paragrafo {int(QUESITI[qid]['unita'][1:])}."), qid)
        self.assertIn("Variazione rimanenze merci in Dare, Merci in Avere", _dove_nel_manuale(QUESITI["Q15-02"])["citazione"])
        self.assertIn("Merci in Dare, Stato patrimoniale iniziale in Avere", _dove_nel_manuale(QUESITI["N17-03"])["citazione"])


class Percorso(unittest.TestCase):
    def test_verifica_senza_chiavi_e_correzione_server(self):
        c = nuovo_allievo("rq_anna")
        tid = avvia(c, "verifica", "C07")
        qs = prova(tid)
        self.assertEqual(len(qs), 10)
        html = c.get(f"/ragioneria-quiz/tentativo/{tid}?n=0").get_data(as_text=True)
        # nessuna chiave o spiegazione degli errori nella pagina prima della consegna
        for o in qs[0]["opzioni"]:
            if o["perche"]:
                self.assertNotIn(str(escape(o["perche"])), html)
        self.assertNotIn("rq-opz giusta", html)
        self.assertNotIn(str(escape(qs[0]["spiegazione"])), html)
        # risponde giusto alle prime 7, sbagliato alle altre 3
        for i, q in enumerate(qs):
            giuste = [o["id"] for o in q["opzioni"] if o["ok"]]
            sbagliata = [next(o["id"] for o in q["opzioni"] if not o["ok"])]
            rispondi(c, tid, i, giuste if i < 7 else sbagliata)
        # correzione subito dopo la risposta, anche in verifica
        dopo = c.get(f"/ragioneria-quiz/tentativo/{tid}?n=0").get_data(as_text=True)
        self.assertIn("rq-esito", dopo)
        self.assertIn("Esatto", dopo)
        # punteggio inviato dal browser: ignorato
        html = c.get(f"/ragioneria-quiz/tentativo/{tid}").get_data(as_text=True)
        c.post(f"/ragioneria-quiz/tentativo/{tid}/consegna", data={"csrf": csrf(html), "punti": 10})
        with app.app_context():
            t = db.session.get(TentativoQuiz, tid)
            self.assertEqual((t.punti, t.massimo, t.stato, t.superato), (7, 10, "consegnato", True))
        # seconda consegna: nessun cambiamento
        c.post(f"/ragioneria-quiz/tentativo/{tid}/consegna", data={"csrf": csrf(html)})
        with app.app_context():
            self.assertEqual(db.session.get(TentativoQuiz, tid).punti, 7)
        ris = c.get(f"/ragioneria-quiz/tentativo/{tid}/risultato").get_data(as_text=True)
        self.assertIn("7 / 10", ris)
        self.assertIn(str(escape(qs[0]["spiegazione"])), ris)
        # dopo la consegna le risposte non si cambiano più
        r = rispondi(c, tid, 9, [o["id"] for o in qs[9]["opzioni"] if o["ok"]])
        with app.app_context():
            self.assertEqual(db.session.get(TentativoQuiz, tid).punti, 7)

    def test_scelta_multipla_insieme_esatto(self):
        c = nuovo_allievo("rq_bruno")
        tid = avvia(c, "allenamento", "C02")
        qs = prova(tid)
        for i, q in enumerate(qs):
            giuste = [o["id"] for o in q["opzioni"] if o["ok"]]
            rispondi(c, tid, i, giuste[:1] if q["multi"] else giuste)   # multipla: solo una delle giuste → errore
        consegna(c, tid)
        with app.app_context():
            t = db.session.get(TentativoQuiz, tid)
            multi = sum(1 for q in qs if q["multi"])
            self.assertEqual(t.punti, len(qs) - multi)

    def test_allenamento_correzione_subito_e_risposta_definitiva(self):
        c = nuovo_allievo("rq_carla")
        tid = avvia(c, "allenamento", "C14")
        q = prova(tid)[0]
        sbagliata = next(o for o in q["opzioni"] if not o["ok"])
        rispondi(c, tid, 0, [sbagliata["id"]])
        html = c.get(f"/ragioneria-quiz/tentativo/{tid}?n=0").get_data(as_text=True)
        self.assertIn(str(escape(sbagliata["perche"])), html)
        self.assertIn("Non è corretta", html)
        # cambiare risposta dopo la correzione non è possibile
        rispondi(c, tid, 0, [o["id"] for o in q["opzioni"] if o["ok"]])
        consegna(c, tid)
        with app.app_context():
            self.assertEqual(db.session.get(TentativoQuiz, tid).punti, 0)
        # l'errore entra nel ripasso
        tid2 = avvia(c, "ripasso")
        self.assertIn(q["id"], [x["id"] for x in prova(tid2)])

    def test_aiuto_specifico_della_domanda_con_rimando_al_manuale(self):
        from app.blueprints.ragioneria_quiz.banca.aiuti import AIUTI
        c = nuovo_allievo("rq_aiuto")
        tid = avvia(c, "allenamento", "C17")
        html = c.get(f"/ragioneria-quiz/tentativo/{tid}?n=0").get_data(as_text=True)
        self.assertIn("Mi serve un aiuto su questa domanda", html)
        c.post(f"/ragioneria-quiz/tentativo/{tid}/aiuto", data={"csrf": csrf(html), "n": 0})
        h = c.get(f"/ragioneria-quiz/tentativo/{tid}?n=0&aiuto=1").get_data(as_text=True)
        q = prova(tid)[0]
        self.assertIn(str(escape(AIUTI[q["id"]])), h)
        self.assertIn("Dal manuale", h)
        self.assertIn("/ragioneria-quiz/manuale#", h)

    def test_limite_tentativi_e_concessione_docente(self):
        c = nuovo_allievo("rq_dario")
        for _ in range(2):
            tid = avvia(c, "verifica", "C04")
            consegna(c, tid)
        t = csrf(c.get("/ragioneria-quiz/").get_data(as_text=True))
        r = c.post("/ragioneria-quiz/avvia", data={"csrf": t, "modalita": "verifica", "unita": "C04"})
        self.assertNotIn("/tentativo/", r.headers["Location"])
        d = docente()
        with app.app_context():
            uid = Utente.query.filter_by(username="rq_dario").first().id
        h = d.get(f"/ragioneria-quiz/docente/allievo/{uid}").get_data(as_text=True)
        d.post(f"/ragioneria-quiz/docente/allievo/{uid}/tentativo-extra",
               data={"csrf": csrf(h), "chiave": "verifica:C04", "nota": "assente alla lezione"})
        avvia(c, "verifica", "C04")

    def test_isolamento_allievi(self):
        a = nuovo_allievo("rq_elena")
        b = nuovo_allievo("rq_fabio")
        tid = avvia(a, "verifica", "C10")
        self.assertEqual(b.get(f"/ragioneria-quiz/tentativo/{tid}").status_code, 403)
        self.assertEqual(b.get(f"/ragioneria-quiz/tentativo/{tid}/risultato").status_code, 403)
        h = b.get("/ragioneria-quiz/").get_data(as_text=True)
        r = b.post(f"/ragioneria-quiz/tentativo/{tid}/risposta", data={"csrf": csrf(h), "n": 0, "scelta": ["o1"]})
        self.assertEqual(r.status_code, 403)
        self.assertEqual(b.get("/ragioneria-quiz/docente").status_code, 403)
        self.assertEqual(b.get("/ragioneria-quiz/docente/banca").status_code, 403)
        self.assertEqual(b.get("/ragioneria-quiz/docente/risultati.csv").status_code, 403)

    def test_finale_60_domande_tutte_le_unita(self):
        c = nuovo_allievo("rq_gino")
        tid = avvia(c, "finale")
        qs = prova(tid)
        self.assertEqual(len(qs), 60)
        self.assertEqual({q["unita"] for q in qs}, set(UNITA))
        self.assertEqual(sum(1 for q in qs if q["area"] == "teoria"), 30)

    def test_pagine_e_pannello_docente(self):
        c = nuovo_allievo("rq_ilaria")
        for p in ("/ragioneria-quiz/", "/ragioneria-quiz/unita/C13", "/ragioneria-quiz/piano-dei-conti"):
            self.assertEqual(c.get(p).status_code, 200, p)
        tid = avvia(c, "diagnostica")
        self.assertEqual(len(prova(tid)), 20)
        consegna(c, tid)
        d = docente()
        h = d.get("/ragioneria-quiz/docente").get_data(as_text=True)
        self.assertIn("Ilaria", h)
        self.assertEqual(d.get("/ragioneria-quiz/docente/banca").status_code, 200)
        csvt = d.get("/ragioneria-quiz/docente/risultati.csv").get_data(as_text=True)
        self.assertIn("SIMULAZIONE DIDATTICA", csvt)
        self.assertIn("Test d'ingresso", csvt)
        self.assertEqual(d.get(f"/ragioneria-quiz/tentativo/{tid}/risultato").status_code, 200)
        self.assertIn("ragioneria-quiz", d.get("/").get_data(as_text=True))

    def test_annullamento_motivato(self):
        c = nuovo_allievo("rq_luca")
        tid = avvia(c, "verifica", "C19")
        consegna(c, tid)
        d = docente()
        with app.app_context():
            uid = Utente.query.filter_by(username="rq_luca").first().id
        h = d.get(f"/ragioneria-quiz/docente/allievo/{uid}").get_data(as_text=True)
        d.post(f"/ragioneria-quiz/docente/tentativo/{tid}/annulla",
               data={"csrf": csrf(h), "nota": "problema di rete"})
        with app.app_context():
            self.assertEqual(db.session.get(TentativoQuiz, tid).stato, "annullato")
            self.assertEqual(sv.tentativi_usati(uid, "verifica", "C19"), 0)


class Manuale(unittest.TestCase):
    def test_manuale_completo_e_coerente_con_la_banca(self):
        from app.blueprints.ragioneria_quiz.manuale_testo import PARTI
        tutti = [q for p in PARTI for c in p["capitoli"] for s in c["sezioni"] for q in s[2]]
        usati = [q for q in tutti if isinstance(q, str)]
        liberi = [q for q in tutti if isinstance(q, dict)]   # scritture svolte scritte nel manuale: devono quadrare
        for e in liberi:
            self.assertEqual(round(sum(v for _c, z, v in e["righe"] if z == "D"), 2), round(sum(v for _c, z, v in e["righe"] if z == "A"), 2), e["testo"])
        self.assertEqual([q for q in usati if q not in QUESITI], [])
        self.assertTrue(all(QUESITI[q]["tipo"] == "scrittura" for q in usati))
        self.assertEqual(sum(len(p["capitoli"]) for p in PARTI), 20)
        coperte = {u for p in PARTI for c in p["capitoli"] for u in c["unita"]}
        self.assertEqual(coperte, set(UNITA))
        c = nuovo_allievo("rq_manuale")
        h = c.get("/ragioneria-quiz/manuale").get_data(as_text=True)
        for t in ("Parte prima", "partita doppia", "Parte quinta", "La riapertura dei conti", "Capitolo 20"):
            self.assertIn(t, h)
        # metodo italiano: ciclo completo delle scorte; gestionale SAP accanto, con i conti del simulatore
        for t in ("la chiusura delle scorte finali", "la riapertura delle scorte", "Lo stesso nei programmi: metodo italiano, ad hoc Revolution, Dynamics 365 Business Central, SAP",
                  "Quattro modi di registrare le stesse operazioni", "Fine anno voce per voce: chiusura e riapertura",
                  "Chiusura/apertura stato patrimoniale", "Chiusura/apertura conti", "modello di differimento",
                  "31/12: chiudi il risconto attivo di 900", "1/1: riapri il rateo passivo di 160", "manuale/sap_miro.svg", "manuale/bc_chiusura.svg", "manuale/ahr_primanota_fa.svg", "manuale/ahr_chiusura.svg", "causale FA",
                  "12 Magazzino ferro (materie prime)", "Variazione rimanenze materie prime", "Raccordo con il piano dei conti del gestionale SAP"):
            self.assertIn(t, h)

    def test_scritture_sap_del_manuale_quadrano(self):
        from pathlib import Path
        from app.blueprints.ragioneria_quiz.scritture_sap import ALTRI, CAPITOLI, DOCUMENTI, FIGURE
        cartella = Path(__file__).resolve().parent.parent / "app/blueprints/ragioneria_quiz/static/manuale"
        for (cap, d), figure in FIGURE.items():
            self.assertIn(d, [v[0] for v in CAPITOLI[cap]])
            for f, _ in figure:
                self.assertTrue((cartella / f).exists(), f)
        for d, (bc, _a, _b) in ALTRI.items():
            if bc:
                self.assertEqual(round(sum(v for _c, z, v in bc if z == "D"), 2), round(sum(v for _c, z, v in bc if z == "A"), 2), d)
        for cap, voci in CAPITOLI.items():
            for d, _t, ita, _n in voci:
                for righe in [DOCUMENTI[d]["righe"]] + ita:
                    self.assertEqual(round(sum(v for _c, z, v in righe if z == "D"), 2), round(sum(v for _c, z, v in righe if z == "A"), 2), (cap, d))

    def test_ogni_domanda_ha_un_suggerimento_specifico(self):
        from app.blueprints.ragioneria_quiz.banca.aiuti import AIUTI
        self.assertEqual(set(AIUTI), set(QUESITI))
        self.assertEqual(len(set(AIUTI.values())), len(AIUTI))   # nessun suggerimento generico ripetuto


if __name__ == "__main__":
    unittest.main()


class PrimaNota(unittest.TestCase):
    def test_operazioni_seguono_il_manuale_e_quadrano(self):
        from app.blueprints.ragioneria_quiz.primanota import operazioni
        ops = operazioni()
        self.assertEqual(list(ops), list(range(1, 21)))
        tutte = [op for b in ops.values() for op in b["lista"]]
        self.assertGreaterEqual(len(tutte), 150)
        self.assertEqual(len({op["eid"] for op in tutte}), len(tutte))
        for op in tutte:
            d = sum(v for _c, z, v in op["righe"] if z == "D")
            a = sum(v for _c, z, v in op["righe"] if z == "A")
            self.assertEqual(d, a, op["eid"])
            self.assertTrue(op["spiegazione"], op["eid"])
        self.assertTrue(any(op["eid"].startswith("M17") for op in ops[17]["lista"]))   # chiusura/riapertura scorte

    def test_importi_e_diagnosi(self):
        from app.blueprints.ragioneria_quiz.primanota import _importo, correggi
        self.assertEqual(_importo("1.500,00"), 150000)
        self.assertEqual(_importo("1500,5"), 150050)
        self.assertEqual(_importo("1.500"), 150000)
        self.assertEqual(_importo(""), 0)
        self.assertIsNone(_importo("abc"))
        g = [("Merci c/acquisti", "D", 100000), ("IVA ns/credito", "D", 22000), ("Debiti v/fornitori", "A", 122000)]
        self.assertEqual(correggi(list(reversed(g)), g), (True, []))
        ok, note = correggi([(c, "A" if z == "D" else "D", v) for c, z, v in g], g)
        self.assertFalse(ok)
        self.assertIn("invertite", note[0])
        ok, note = correggi([("Merci c/acquisti", "D", 122000), ("Debiti v/fornitori", "A", 122000)], g)
        self.assertIn("Manca il conto «IVA ns/credito».", note)

    def test_correzione_immediata_e_avanzamento(self):
        from app.blueprints.ragioneria_quiz.primanota import operazioni
        op = operazioni()[17]["lista"][0]
        c = nuovo_allievo("pn-allievo")
        self.assertIn("Prima nota", c.get("/ragioneria-quiz/prima-nota").get_data(as_text=True))
        html = c.get(f"/ragioneria-quiz/prima-nota/{op['eid']}").get_data(as_text=True)
        self.assertIn(str(escape(op["testo"])), html)
        self.assertNotIn("La scrittura del manuale", html)       # la soluzione non c'è prima della risposta
        sbagliata = {"csrf": csrf(html), "conto": [r[0] for r in op["righe"]],
                     "dare": [("%.2f" % (r[2] / 100)).replace(".", ",") if r[1] == "A" else "" for r in op["righe"]],
                     "avere": [("%.2f" % (r[2] / 100)).replace(".", ",") if r[1] == "D" else "" for r in op["righe"]]}
        r = c.post(f"/ragioneria-quiz/prima-nota/{op['eid']}", data=sbagliata).get_data(as_text=True)
        self.assertIn("Non è ancora giusta", r)
        self.assertIn("invertite", r)
        self.assertIn("Dal manuale", r)
        giusta = dict(sbagliata, dare=sbagliata["avere"], avere=sbagliata["dare"])
        r = c.post(f"/ragioneria-quiz/prima-nota/{op['eid']}", data=giusta).get_data(as_text=True)
        self.assertIn("Scrittura giusta", r)
        self.assertIn("1 / ", c.get("/ragioneria-quiz/prima-nota").get_data(as_text=True))
        r = c.post(f"/ragioneria-quiz/prima-nota/{op['eid']}", data=dict(giusta, conto=["Conto inventato", "Banca c/c"])).get_data(as_text=True)
        self.assertIn("non è un conto del piano dei conti", r)
