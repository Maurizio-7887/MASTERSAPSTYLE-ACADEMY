"""Ragioneria internazionale IFRS e OIC (Firenze · Amministrazione, terzo passo):
contenuti completi, correzione lato server di laboratorio, libro giornale e test, isolamento tra allievi,
pannello docente con tempo, diario e voto, riquadro sempre visibile nella home."""
import re
import unittest

from tests._client import app, csrf, docente, entra

from app.blueprints.ragioneria_internazionale import servizi as sv
from app.blueprints.ragioneria_internazionale.modelli import RiModulo, RiScrittura
from app.db import Utente, db

URL = "/ragioneria-internazionale"


def nuovo_allievo(username):
    with app.app_context():
        u = Utente.query.filter_by(username=username).first()
        if u is None:
            u = Utente(username=username, nome=username.title(), ruolo="allievo", deve_cambiare_password=False)
            u.imposta_password("password-di-prova")
            db.session.add(u)
            db.session.commit()
    return entra(username, "password-di-prova")


def uid(username):
    with app.app_context():
        return Utente.query.filter_by(username=username).first().id


def posta(c, url, dati):
    t = csrf(c.get(url).get_data(as_text=True))
    return c.post(url, data={"csrf": t, **dati})


def scrittura(c, n, e, ledger=None, rif="R"):
    righe = [(a, v, "") for a, v in e["d"]] + [(a, "", v) for a, v in e["a"]]
    dati = {"ledger": ledger or e["l"] or "0L", "riferimento": rif, "data": "2027-12-31"}
    for i, (a, d, v) in enumerate(righe):
        dati[f"conto{i}"] = a
        dati[f"dare{i}"] = str(d).replace(".", ",")
        dati[f"avere{i}"] = str(v).replace(".", ",")
    return posta(c, f"{URL}/modulo/{n}/giornale", dati)


class Contenuti(unittest.TestCase):
    def test_dodici_moduli_cento_ore(self):
        self.assertEqual(len(sv.MODULI), 12)
        self.assertEqual(sv.ORE, 100)
        self.assertEqual(sv.ESAME, 12)
        for n in sv.MODULI:
            self.assertTrue(sv.CONTENUTI[n], n)
            self.assertEqual(len(sv.QUIZ[n]), 4, n)
            self.assertTrue(sv.ATTESI[n], n)
            self.assertTrue(sv.SCRITTURE[n], n)

    def test_scritture_del_manuale_quadrano(self):
        for n, lista in sv.SCRITTURE.items():
            for e in lista:
                d = sum(round(v * 100) for _, v in e["d"])
                a = sum(round(v * 100) for _, v in e["a"])
                self.assertEqual(d, a, f"modulo {n}: {e['t']}")
                for conto, _ in e["d"] + e["a"]:
                    self.assertIn(conto, sv.CONTI)

    def test_numeri_all_italiana(self):
        self.assertEqual(sv.numero("57.264,70"), 57264.70)
        self.assertEqual(sv.numero("57264,70"), 57264.70)
        self.assertEqual(sv.numero("57264.70"), 57264.70)
        self.assertEqual(sv.numero("1.204.783,89"), 1204783.89)
        self.assertEqual(sv.numero("−6.000"), -6000)
        self.assertEqual(sv.numero("5,1038"), 5.1038)
        self.assertIsNone(sv.numero("abc"))

    def test_risposte_giuste_distribuite(self):
        pos = [0, 0, 0]
        for n in sv.QUIZ:
            for i, q in enumerate(sv.QUIZ[n]):
                pos[sv.ordine(n, i).index(q[2])] += 1
        self.assertEqual(sum(pos), 48)
        self.assertTrue(all(p >= 15 for p in pos), pos)


class PercorsoAllievo(unittest.TestCase):
    def test_tutti_i_moduli_corretti_dal_server(self):
        c = nuovo_allievo("ri_anna")
        home = c.get("/").get_data(as_text=True)
        self.assertIn("RAGIONERIA INTERNAZIONALE IFRS E OIC", home)
        self.assertIn("Terzo passo", home)
        self.assertEqual(c.get(URL + "/").status_code, 200)
        for n in sv.MODULI:
            for pag in ("", "/manuale", "/laboratorio", "/giornale", "/test", "/valutazione"):
                self.assertEqual(c.get(f"{URL}/modulo/{n}{pag}").status_code, 200, (n, pag))
            # laboratorio: prima sbagliato, poi giusto (scritto all'italiana)
            posta(c, f"{URL}/modulo/{n}/laboratorio", {k: "1" for k in sv.ATTESI[n]})
            with app.app_context():
                self.assertFalse(RiModulo.query.filter_by(utente_id=uid("ri_anna"), modulo=n).first().lab_ok)
            giusti = {k: f"{v:.4f}".replace(".", ",") for k, v in sv.ATTESI[n].items()}
            posta(c, f"{URL}/modulo/{n}/laboratorio", giusti)
            # libro giornale: tutte le scritture del manuale
            for i, e in enumerate(sv.SCRITTURE[n]):
                r = scrittura(c, n, e, rif=f"M{n}-{i}")
                self.assertEqual(r.status_code, 302)
            # test: tutto giusto
            posta(c, f"{URL}/modulo/{n}/test", {f"q{i}": q[2] for i, q in enumerate(sv.QUIZ[n])})
            rip = None
            with app.app_context():
                rip = sv.riepilogo_modulo(uid("ri_anna"), n)
            self.assertTrue(rip["lab_ok"], n)
            self.assertEqual(rip["scritture"], rip["scritture_tot"], n)
            self.assertEqual(rip["quiz"], 100, n)
            self.assertTrue(rip["completo"], n)
        self.assertIn("Moduli completati: 12 / 12", c.get(URL + "/").get_data(as_text=True))

    def test_ledger_sbagliato_e_scrittura_errata(self):
        c = nuovo_allievo("ri_bruno")
        e = next(x for x in sv.SCRITTURE[2] if x["l"] == "2L")
        scrittura(c, 2, e, ledger="0L", rif="W1")
        scrittura(c, 2, {"t": "x", "l": None, "d": [["Banca", 100]], "a": [["Ricavi vendite", 100]]}, rif="W2")
        with app.app_context():
            docs = RiScrittura.query.filter_by(utente_id=uid("ri_bruno"), modulo=2).order_by(RiScrittura.id).all()
            self.assertIn("ledger è sbagliato", docs[0].esito)
            self.assertFalse(docs[0].ok)
            self.assertIn("non corrisponde", docs[1].esito)
        # non quadra: non viene registrata
        r = posta(c, f"{URL}/modulo/2/giornale", {"ledger": "0L", "riferimento": "W3", "conto0": "Banca", "dare0": "100",
                                                  "conto1": "Ricavi vendite", "avere1": "90"})
        self.assertEqual(r.status_code, 302)
        with app.app_context():
            self.assertEqual(RiScrittura.query.filter_by(utente_id=uid("ri_bruno"), riferimento="W3").count(), 0)

    def test_le_soluzioni_non_arrivano_prima(self):
        c = nuovo_allievo("ri_carla")
        html = c.get(f"{URL}/modulo/4/laboratorio").get_data(as_text=True)
        self.assertNotIn("106378", html)
        self.assertNotIn("106.378,52", html.split("Laboratorio — calcoli")[1].split("</form>")[0])
        test = c.get(f"{URL}/modulo/4/test").get_data(as_text=True)
        self.assertNotIn("giusta", test.split("<form")[1])

    def test_isolamento_tra_allievi(self):
        a = nuovo_allievo("ri_dario")
        b = nuovo_allievo("ri_elena")
        scrittura(a, 1, sv.SCRITTURE[1][0], rif="SOLO-DARIO")
        self.assertNotIn("SOLO-DARIO", b.get(f"{URL}/modulo/1/giornale").get_data(as_text=True))
        with app.app_context():
            did = RiScrittura.query.filter_by(riferimento="SOLO-DARIO").first().id
        r = posta(b, f"{URL}/modulo/1/giornale", {})  # carica csrf
        t = csrf(b.get(f"{URL}/modulo/1/giornale").get_data(as_text=True))
        self.assertEqual(b.post(f"{URL}/modulo/1/giornale/{did}/elimina", data={"csrf": t}).status_code, 404)
        self.assertEqual(b.get(f"{URL}/docente").status_code, 403)


class Docente(unittest.TestCase):
    def test_vede_lavoro_tempo_e_mette_il_voto(self):
        al = nuovo_allievo("ri_franco")
        al.get(f"{URL}/modulo/3/manuale")
        posta(al, f"{URL}/modulo/3/laboratorio", {k: str(v) for k, v in sv.ATTESI[3].items()})
        posta(al, f"{URL}/modulo/3/valutazione", {"p0": 20, "p1": 20, "p2": 18, "p3": 20})
        d = docente()
        classe = d.get(f"{URL}/docente").get_data(as_text=True)
        self.assertIn("Ri_Franco", classe)
        pag = d.get(f"{URL}/docente/allievo/{uid('ri_franco')}").get_data(as_text=True)
        self.assertIn("Controllo risultati", pag)
        self.assertIn("Autovalutazione: 78/100", pag)
        r = posta(d, f"{URL}/docente/allievo/{uid('ri_franco')}", {})
        t = csrf(pag)
        r = d.post(f"{URL}/docente/allievo/{uid('ri_franco')}/modulo/3/voto",
                   data={"csrf": t, "p0": 22, "p1": 21, "p2": 20, "p3": 19, "nota": "Ricalcola l'impairment."})
        self.assertEqual(r.status_code, 302)
        val = al.get(f"{URL}/modulo/3/valutazione").get_data(as_text=True)
        self.assertIn("Voto del docente: 82/100", val)
        self.assertIn("Ricalcola l&#39;impairment.", val)
        # voto non valido rifiutato
        d.post(f"{URL}/docente/allievo/{uid('ri_franco')}/modulo/3/voto", data={"csrf": t, "p0": 30, "p1": 1, "p2": 1, "p3": 1})
        with app.app_context():
            self.assertEqual(RiModulo.query.filter_by(utente_id=uid("ri_franco"), modulo=3).first().voto, "[22, 21, 20, 19]")

    def test_menu_docente(self):
        self.assertIn("🌍 IFRS e OIC", docente().get("/ragioneria-quiz/docente").get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()
