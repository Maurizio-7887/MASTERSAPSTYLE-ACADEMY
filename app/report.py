"""Report del lavoro di un allievo, calcolato dallo stato salvato del simulatore (lo stesso del backup JSON).

Il report non ricalcola la contabilità: legge le scritture del Libro Giornale dell'allievo e ne trae
saldi, bilancio di verifica, controlli formali e il confronto con i numeri attesi dell'esercizio.
"""
import json
from datetime import date
from collections import defaultdict

from .esercizi import ESERCIZI

TECNICHE = {"CHIUSURA_CE", "CHIUSURA_SP", "APERTURA_SP"}


def _c(x):
    try:
        return round(float(x) * 100)
    except (TypeError, ValueError):
        return 0


def carica(dati):
    if isinstance(dati, dict):
        return dati.get("stato", dati)
    s = json.loads(dati or "{}")
    return s.get("stato", s) if isinstance(s, dict) else {}


class Lavoro:
    def __init__(self, stato):
        self.s = stato or {}
        self.regs = sorted(self.s.get("registrazioni") or [], key=lambda r: (r.get("data") or "", r.get("id") or 0))
        self.conti = {c["codice"]: c for c in self.s.get("pianoDeiConti") or []}
        self.stornate = {r["fi"]["stornoDi"] for r in self.regs if isinstance(r.get("fi"), dict) and r["fi"].get("stornoDi")}
        anni = ((self.s.get("fi") or {}).get("annual") or {}).get("years") or []
        self.anni_chiusi = {a.get("year"): a for a in anni}
        self.anno = (self.s.get("fi") or {}).get("annual", {}).get("activeYear") or 2026
        if self.anni_chiusi:
            self.anno = max(self.anni_chiusi)

    # ── saldi ──
    def apertura(self):
        """Saldi iniziali dell'azienda preesistente (versione completa), come FI.opening() del simulatore."""
        sp = self.s.get("statoPatrimonialeIniziale") or {}
        db_ = self.s.get("distintaBase") or {}
        valori = {"10": _c(sp.get("cassa0")), "11": _c(sp.get("clienti0")),
                  "12": _c((sp.get("magazzinoMP_kg0") or 0) * (db_.get("costoFerro") or 0)),
                  "13": _c((sp.get("magazzinoPF_unita0") or 0) * (sp.get("costoUnitarioPF0") or self.costo_std())),
                  "20": -_c(sp.get("fornitori0"))}
        netto = sum(valori.values())
        if netto:
            valori["32"] = -netto
        return {k: v for k, v in valori.items() if v}

    def saldi(self, fino=None, dal=None, tecniche=False, apertura=True):
        b = defaultdict(int)
        if apertura and not dal:
            for k, v in self.apertura().items():
                b[k] += v
        for r in self.regs:
            d = r.get("data") or ""
            if (fino and d > fino) or (dal and d < dal) or (not tecniche and r.get("tipo") in TECNICHE):
                continue
            for x in r.get("righe") or []:
                b[str(x.get("conto"))] += (1 if x.get("dareAvere") == "DARE" else -1) * _c(x.get("importo"))
        return b

    def saldo(self, conto, **kw):
        return self.saldi(**kw).get(conto, 0) / 100

    def tipo(self, conto):
        return (self.conti.get(conto) or {}).get("tipo", "")

    def nome(self, conto):
        return (self.conti.get(conto) or {}).get("nome", conto)

    # ── indicatori ──
    def costo_std(self):
        db_ = self.s.get("distintaBase") or {}
        centri = {str(c["id"]): c for c in self.s.get("centriDiCosto") or []}
        tot = (db_.get("kgFerro") or 0) * (db_.get("costoFerro") or 0)
        for op in db_.get("ciclo") or []:
            c = centri.get(str(op.get("centroCostoId"))) or {}
            ore = c.get("oreAnnuePreviste") or 0
            if ore:
                tot += (op.get("oreStandard") or 0) * ((c.get("costoPersonaleAnnuo") or 0) + (c.get("costoGeneraleAnnuo") or 0)) / ore
        return round(tot, 4)

    def economico(self, anno):
        b = self.saldi(dal=f"{anno}-01-01", fino=f"{anno}-12-31")
        return {k: v for k, v in b.items() if self.tipo(k) in ("COSTO", "RICAVO") and v}

    def risultato(self, anno, senza_imposte=False):
        e = self.economico(anno)
        return -sum(v for k, v in e.items() if not (senza_imposte and k == "56")) / 100

    def contratti(self):
        eventi = list((self.s.get("fiQuattro") or {}).get("events") or [])
        for r in self.regs:
            q = (r.get("fi") or {}).get("quattro") if isinstance(r.get("fi"), dict) else None
            if q and r.get("id") not in self.stornate:
                eventi.append(q)
        out = []
        for e in eventi:
            if e.get("kind") in ("FACTOR_START", "RIBA_PRESENT"):
                ref = (e.get("input") or {}).get("ref")
                chiuso = any(x.get("kind") in ("CONTRACT_CLOSE", "RIBA_UNPAID") and (x.get("input") or {}).get("contract") == ref for x in eventi)
                out.append({"ref": ref, "tipo": "RiBa" if e["kind"] == "RIBA_PRESENT" else "Factoring", "chiuso": chiuso,
                            "importo": float((e.get("input") or {}).get("amount") or 0)})
        return out

    def indicatori_lab(self):
        """Laboratori di produzione: numeri propri, più i campi generici del report."""
        s, lab = self.s, self.s.get("lab")
        periodo = lambda p: next((x for x in s.get("periodi") or [] if x.get("periodo") == p and not x.get("annullato")), None)
        somma = lambda p, k: round(sum((r.get(k) or 0) for r in (periodo(p) or {}).get("righe", [])), 2) if periodo(p) else None
        base = {"costituzione": "", "scritture": len(self.regs), "ultima_data": self.regs[-1]["data"] if self.regs else "", "anno": "",
                "utile": 0, "ires": 0, "banca_fine_anno": 0, "banca_finale": 0, "chiusura": "—",
                "varianze_61": self.saldo("61"), "ferro_finale": (s.get("giacenze") or {}).get("FERRO", 0)}
        if lab == "hmlv":
            st = s.get("strategie") or {}
            oc = s.get("ordiniCliente") or []
            lt = [(date.fromisoformat(c["consegne"][-1]["data"]) - date.fromisoformat(c["data"])).days for c in oc if c.get("consegne")]
            base.update({"strategie": "sì" if st.get("SL-PIEGA") == "70" and all(st.get(m) == "50" for m in ("TR-STD", "TR-ALTA", "TR-PED")) else "no",
                         "wip_novembre": somma("2026-11", "wip"), "costo_venduto": self.saldo("41"), "lead_time": max(lt) if lt else None,
                         "telai_scaffale": (s.get("giacenze") or {}).get("SL-PIEGA", 0), "wip_finale": self.saldo("15"),
                         "buffer_rifornito": "sì" if len([o for o in s.get("ordini") or [] if o.get("mat") == "SL-PIEGA"]) >= 2 else "no"})
        elif lab == "rem":
            b = s.get("budget") or {}
            piano = b.get("pianoMensile") or {}
            base.update({"budget_totale": b.get("totale", 0), "piano": "/".join(str(piano.get(m, "")) for m in ("TR-STD", "TR-ALTA", "TR-PED")),
                         "collettori": len(s.get("collettori") or {}), "wip_gennaio": somma("2027-01", "wip"), "varianze_gennaio": somma("2027-01", "varianza"),
                         "output_gennaio": somma("2027-01", "output"), "varianze_febbraio": somma("2027-02", "varianza"), "wip_finale": self.saldo("15")})
        elif lab == "erp":
            cp = s.get("copa") or []
            tot = lambda k: sum((r.get(k) or 0) for r in cp)
            netti = tot("ricaviLordi") - tot("scontiQuantita") - tot("scontiCliente") + tot("trasporti") + tot("abbuoni")
            mdc1 = round(netti - tot("costoVenduto"), 2)
            ordini = s.get("ordini") or []
            base.update({"ordini_or": sum(1 for o in ordini if o.get("tipo") == "OR"), "acconti_chiusi": self.saldo("19"),
                         "ricavi_netti_copa": round(netti, 2), "mdc1": mdc1, "mdc2": round(mdc1 - tot("provvigioni"), 2),
                         "crediti_clienti": self.saldo("11"), "banca_finale": self.saldo("10"),
                         "note_credito": sum(1 for f in s.get("fatture") or [] if f.get("tipo") in ("RE", "G2"))})
        return base

    def indicatori(self):
        if self.s.get("lab"):
            return self.indicatori_lab()
        a = self.anno
        fine = f"{a}-12-31"
        chiuso = self.anni_chiusi.get(a)
        utile = chiuso["snapshot"]["profit"] / 100 if chiuso and chiuso.get("snapshot") else self.risultato(a)
        e = self.economico(a)
        iva = sum((r.get("fi") or {}).get("fiscal", {}).get("net", 0) for r in self.regs
                  if r.get("tipo") == "LIQUIDAZIONE_IVA" and (r.get("data") or "").startswith(str(a)) and r.get("id") not in self.stornate) / 100
        ultima = self.regs[-1]["data"] if self.regs else ""
        return {
            "costituzione": (self.s.get("fi") or {}).get("costituzione") or "",
            "costo_std": round(self.costo_std(), 2),
            "capitale": -self.saldi().get("30", 0) / 100,
            "ordini_pp": len((self.s.get("pp") or {}).get("ordini") or []),
            "varianze_61": e.get("61", 0) / 100,
            "plusvalenze": -e.get("45", 0) / 100,
            "minusvalenze": e.get("46", 0) / 100,
            "iva_liquidata": iva,
            "ante_imposte": round(utile + e.get("56", 0) / 100, 2),
            "ires": e.get("56", 0) / 100,
            "utile": round(utile, 2),
            "banca_fine_anno": self.saldo("10", fino=fine),
            "chiusura": "sì" if chiuso and chiuso.get("reopened") else ("chiuso, non riaperto" if chiuso else "no"),
            "banca_finale": self.saldo("10"),
            "contratti_aperti": sum(1 for c in self.contratti() if not c["chiuso"]),
            "ultima_data": ultima,
            "anno": a,
            "scritture": len(self.regs),
        }

    def confronto(self, esercizio):
        es = ESERCIZI.get(esercizio) or ESERCIZI["libero"]
        ind = self.indicatori()
        righe = []
        for chiave, etichetta, atteso, tol in es["attesi"]:
            reale = ind.get(chiave)
            if tol is None:
                ok = str(reale) == str(atteso)
            else:
                try:
                    ok = abs(float(reale) - float(atteso)) <= tol + 1e-9
                except (TypeError, ValueError):
                    ok = False
            righe.append({"etichetta": etichetta, "atteso": atteso, "reale": reale, "ok": ok,
                          "numero": tol is not None, "diff": (float(reale) - float(atteso)) if tol is not None and isinstance(reale, (int, float)) else None})
        return righe

    def controlli_formali(self):
        non_quadrate = []
        for r in self.regs:
            d = sum(_c(x.get("importo")) for x in r.get("righe") or [] if x.get("dareAvere") == "DARE")
            a = sum(_c(x.get("importo")) for x in r.get("righe") or [] if x.get("dareAvere") == "AVERE")
            if d != a:
                non_quadrate.append(r.get("id"))
        tot = self.saldi(tecniche=True)
        per_tipo = defaultdict(int)
        for r in self.regs:
            per_tipo[r.get("tipo") or "—"] += 1
        return {"non_quadrate": non_quadrate, "quadra": sum(tot.values()) == 0, "per_tipo": sorted(per_tipo.items()),
                "storni": len(self.stornate), "contratti": self.contratti()}

    def bilancio_verifica(self, fino=None):
        b = self.saldi(fino=fino)
        righe = []
        for k in sorted(b, key=lambda c: (len(c) > 2, c)):
            v = b[k]
            if v:
                righe.append({"conto": k, "nome": self.nome(k), "tipo": self.tipo(k), "dare": v / 100 if v > 0 else 0, "avere": -v / 100 if v < 0 else 0})
        return righe

    def giornale(self):
        out = []
        for r in self.regs:
            out.append({"id": r.get("id"), "data": r.get("data"), "descrizione": r.get("descrizione"), "tipo": r.get("tipo"),
                        "stornata": r.get("id") in self.stornate,
                        "righe": [{"conto": str(x.get("conto")), "nome": self.nome(str(x.get("conto"))), "segno": x.get("dareAvere"),
                                   "importo": float(x.get("importo") or 0)} for x in r.get("righe") or []]})
        return out


def report(dati, esercizio="libero"):
    w = Lavoro(carica(dati))
    ind = w.indicatori()
    confronto = w.confronto(esercizio)
    return {"indicatori": ind, "anno": w.anno, "confronto": confronto, "esatti": sum(1 for r in confronto if r["ok"]),
            "controlli": w.controlli_formali(), "verifica": w.bilancio_verifica(fino=f"{w.anno}-12-31"),
            "giornale": w.giornale(), "esercizio": ESERCIZI.get(esercizio, ESERCIZI["libero"])["titolo"]}
