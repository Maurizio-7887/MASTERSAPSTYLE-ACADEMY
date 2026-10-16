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
            gen = "2027-01-31"   # gennaio: vendite e redditività · febbraio: costi del prodotto e Material Ledger
            cp = s.get("copa") or []
            def margini(dal, al):
                tot = lambda k: sum((r.get(k) or 0) for r in cp if dal <= (r.get("data") or "") <= al)
                netti = tot("ricaviLordi") - tot("scontiQuantita") - tot("scontiCliente") + tot("trasporti") + tot("abbuoni")
                mdc1 = round(netti - tot("costoVenduto") - tot("diffPrezzo"), 2)
                return round(netti, 2), mdc1, round(mdc1 - tot("provvigioni"), 2)
            netti, mdc1, mdc2 = margini("", gen)
            ordini = s.get("ordini") or []
            costing = s.get("costing") or {}
            prod = s.get("produzione") or []
            ml = next((c for c in costing.get("ml") or [] if c.get("periodo") == "2027-02"), None)
            lotto = next((c.get("v") for o in prod if o.get("materiale") == "TR-ALTA" for c in (o.get("liquidazione") or {}).get("categorie") or []
                          if str(c.get("cat", "")).startswith("Varianza di LOTTO")), None)
            base.update({"ordini_or": sum(1 for o in ordini if o.get("tipo") == "OR" and (o.get("data") or "") <= gen),
                         "acconti_chiusi": self.saldo("19", fino=gen), "ricavi_netti_copa": netti, "mdc1": mdc1, "mdc2": mdc2,
                         "crediti_clienti": self.saldo("11", fino=gen), "banca_finale": self.saldo("10", fino=gen),
                         "note_credito": sum(1 for f in s.get("fatture") or [] if f.get("tipo") in ("RE", "G2") and (f.get("data") or "") <= gen),
                         "std_tr_std": (s.get("materiali") or {}).get("TR-STD", {}).get("std"),
                         "rivalutazione": round(-self.saldo("64"), 2),
                         "pd_acquisti": round(sum(p.get("pd", 0) for p in s.get("mlPD") or [] if p.get("mat") == "FERRO" and (p.get("data") or "")[:7] == "2027-02"), 2),
                         "varianza_lotto": lotto,
                         "varianze_ordini": round(sum((o.get("liquidazione") or {}).get("varianza", 0) for o in prod), 2),
                         "ml_venduto": self.saldo("42"),
                         "prezzo_effettivo_ped": ((ml or {}).get("materiali") or {}).get("TR-PED", {}).get("prezzoEffettivo"),
                         "mdc1_febbraio": margini("2027-02-01", "2027-02-28")[1]})
            wm = s.get("wm") or {}
            quanti = [q for q in wm.get("quant") or [] if abs(q.get("qta") or 0) > 1e-9]
            tot_wm = {}
            for q in quanti:
                tot_wm[q["mat"]] = round(tot_wm.get(q["mat"], 0) + q["qta"], 3)
            giac = s.get("giacenze") or {}
            invs = wm.get("inventari") or []
            ubic = wm.get("ubicazioni") or {}
            base.update({"wm_attivo": "sì" if wm.get("attivo") else "no",
                         "compiti_confermati": sum(1 for t in wm.get("compiti") or [] if t.get("stato") == "confermato" and (t.get("confermato") or "") <= "2027-03-31"),
                         "udc_ferro": len({q.get("udc") or q.get("id") for q in quanti if q.get("mat") == "FERRO" and (ubic.get(q.get("ubic")) or {}).get("tipo") == "002"}),
                         "inventari_chiusi": sum(1 for d in invs if d.get("stato") == "chiuso"),
                         "riconte": sum(1 for d in invs for r in d.get("righe") or [] if r.get("riconta")),
                         "differenze_65_marzo": self.saldo("65", fino="2027-03-31"),
                         "differenze_65": self.saldo("65", fino="2027-04-30"),
                         "giacenza_tr_std": round(sum(m.get("qta") or 0 for m in s.get("movimenti") or [] if m.get("mat") == "TR-STD" and (m.get("data") or "") <= "2027-03-31"), 3),
                         "consegne_wm_uscite": sum(1 for c in s.get("consegne") or [] if c.get("wm") and c.get("pgi") and c["pgi"] <= "2027-04-30"),
                         "compiti_prelievo": sum(1 for t in wm.get("compiti") or [] if t.get("tipo") == "PICK" and t.get("stato") == "confermato" and (t.get("confermato") or "") <= "2027-04-30"),
                         "colli": sum(1 for x in (s.get("sped") or {}).get("colli") or [] if (x.get("data") or "") <= "2027-04-30"),
                         "peso_lordo": round(sum(x.get("pesoLordo") or 0 for x in (s.get("sped") or {}).get("colli") or [] if (x.get("data") or "") <= "2027-04-30"), 2),
                         "colli_maggio": sum(1 for x in (s.get("sped") or {}).get("colli") or [] if (x.get("data") or "") >= "2027-05-01"),
                         "trasporti_partiti": sum(1 for t in (s.get("sped") or {}).get("trasporti") or [] if t.get("partenza") and t["partenza"] <= "2027-04-30"),
                         "ddt": sum(1 for c in s.get("consegne") or [] if c.get("ddt") and (c.get("pgi") or "") <= "2027-04-30"),
                         "giacenza_tr_ped": round(sum(m.get("qta") or 0 for m in s.get("movimenti") or [] if m.get("mat") == "TR-PED" and (m.get("data") or "") <= "2027-04-30"), 3),
                         "giacenza_tr_ped_maggio": giac.get("TR-PED"),
                         "slotting": sum(1 for t in wm.get("compiti") or [] if t.get("tipo") == "TRASF" and "slotting" in (t.get("motivo") or "") and t.get("stato") == "confermato"),
                         "ondata_compiti": sum(len(o.get("compiti") or []) for o in wm.get("ondateRilasciate") or []),
                         "ondata_metri": sum(o.get("metriOnda") or 0 for o in wm.get("ondateRilasciate") or []),
                         "ondata_metri_ordine": sum(o.get("metriOrdine") or 0 for o in wm.get("ondateRilasciate") or []),
                         "rfid_letture": sum(1 for x in (s.get("sped") or {}).get("colli") or [] if x.get("rfid")),
                         "consegne_maggio": sum(1 for c in s.get("consegne") or [] if c.get("wm") and c.get("pgi") and (c.get("data") or "") >= "2027-05-01"),
                         "f110_totale": round(sum(r.get("totale") or 0 for r in (s.get("tes") or {}).get("pagamenti") or []), 2),
                         "righe_automatiche": sum(1 for e in (s.get("tes") or {}).get("estratti") or [] for r in e.get("righe") or [] if r.get("stato") == "abbinata in automatico"),
                         "estratto_completo": "sì" if (s.get("tes") or {}).get("estratti") and all(r.get("contabile") for e in s["tes"]["estratti"] for r in e.get("righe") or []) else "no",
                         "banca_15_06": self.saldo("10", fino="2027-06-15"),
                         "crediti_30_06": self.saldo("11", fino="2027-06-30"),
                         "netti_giugno": round(sum(c.get("netto") or 0 for c in (s.get("hr") or {}).get("cedolini") or [] if c.get("periodo") == "2027-06"), 2),
                         "costo_personale_giugno": round(self.saldo("80", fino="2027-06-30") + self.saldo("81", fino="2027-06-30") + self.saldo("82", fino="2027-06-30"), 2),
                         "irpef_giugno": round(sum(c.get("irpef") or 0 for c in (s.get("hr") or {}).get("cedolini") or [] if c.get("periodo") == "2027-06"), 2),
                         "fatture_valuta": len((s.get("fx") or {}).get("documenti") or []),
                         "utili_cambi": -self.saldo("66", fino="2027-07-31"),
                         "perdite_cambi": self.saldo("67", fino="2027-07-31"),
                         "perdita_valutazione": self.saldo("68", fino="2027-07-31"),
                         "iva_reverse_charge": round(sum(x.get("importo") or 0 for r in s.get("registrazioni") or [] if r.get("tipo") == "FATTURA_VALUTA" for x in r.get("righe") or [] if x.get("conto") == "14"), 2),
                         "f24_versato": round(sum(r["righe"][-1]["importo"] for r in s.get("registrazioni") or [] if r.get("tipo") == "F24"), 2),
                         "ricavi_servizi": -self.saldo("44", fino="2027-07-31"),
                         "fatture_stornate_ago": sum(1 for f in s.get("fatture") or [] if f.get("tipo") == "F2" and f.get("stornata") and (f.get("data") or "") >= "2027-08-01"),
                         "documenti_sdi": sum(1 for f in s.get("fatture") or [] if f.get("sdi")),
                         "nota_credito_td04": round(sum(f.get("totale") or 0 for f in s.get("fatture") or [] if f.get("tipo") == "G2" and f.get("sdi") and (f.get("data") or "") >= "2027-08-01"), 2),
                         "ordini_rilasciati_vkm1": sum(1 for o in s.get("ordini") or [] if (o.get("credito") or {}).get("stato") == "D"),
                         "rda_ordinate": sum(1 for r in s.get("rda") or [] if r.get("stato") == "ordinata"),
                         "seriali_presso_clienti": sum(1 for m in (s.get("seriali") or {}).values() for x in m.values() if x.get("stato") == "cliente"),
                         "ferro_colata_0816": round((((s.get("lotti") or {}).get("FERRO") or {}).get("COL-0816") or {}).get("qta") or 0, 2),
                         "tredicesima_dicembre": round(sum(c.get("tredicesima") or 0 for c in (s.get("hr") or {}).get("cedolini") or [] if c.get("periodo") == "2027-12"), 2),
                         "credito_usd_aperto": round(sum(d.get("importo") or 0 for d in (s.get("fx") or {}).get("documenti") or [] if d.get("lato") == "cliente" and not d.get("chiuso")), 2),
                         "quadratura_im_wm": ("sì" if wm.get("attivo") and all(abs(giac.get(m, 0) - tot_wm.get(m, 0)) < 1e-6 for m in giac) else "no")})
        if lab == "erp":
            wm = s.get("wm") or {}
            compiti = wm.get("compiti") or []
            g = s.get("giacenze") or {}
            base.update({
                "rw_compiti_aperti": sum(t.get("stato") == "aperto" for t in compiti),
                "rw_compiti_confermati": sum(t.get("stato") == "confermato" for t in compiti),
                "rw_ferro": g.get("FERRO", 0), "rw_std": g.get("TR-STD", 0),
                "rw_alta": g.get("TR-ALTA", 0), "rw_ped": g.get("TR-PED", 0),
                # prima parte: valori al 30/04/2027, così restano giusti anche dopo la seconda parte e la chiusura
                "rw_ferro_valore": self.saldo("12", fino="2027-04-30"), "rw_pf_valore": self.saldo("13", fino="2027-04-30"),
                "rw_cogs": round(self.saldo("41", fino="2027-04-30") + self.saldo("42", fino="2027-04-30"), 2),
                "rw_banca": self.saldo("10", fino="2027-04-30"), "rw_clienti": self.saldo("11", fino="2027-04-30"),
                "rw_fornitori": self.saldo("20", fino="2027-04-30"), "rw_were": self.saldo("22", fino="2027-04-30"),
                "rw_transito": self.saldo("18", fino="2027-04-30"),
                "rw_colli": len((s.get("sped") or {}).get("colli") or []),
                "rw_ddt": sum(bool(c.get("ddt")) for c in s.get("consegne") or []),
            })
            # seconda parte: saldi del 2027 senza i documenti di chiusura (che azzerano tutto al 31/12)
            def sc(conto, fino="2027-12-31"):
                t = 0
                for r in s.get("registrazioni") or []:
                    if (r.get("data") or "") > fino or r.get("chiusura") in ("epilogo", "stato patrimoniale", "riapertura"):
                        continue
                    for x in r.get("righe") or []:
                        if str(x.get("conto")) == conto:
                            t += (1 if x.get("dareAvere") == "DARE" else -1) * (x.get("importo") or 0)
                return round(t, 2)
            ch = s.get("chiusura") or {}
            iva = {x.get("periodo"): x for x in ch.get("iva") or []}
            chiuso = (s.get("chiusure") or {}).get("2027") or {}
            base.update({
                "rc_cespiti_netto": round(sc("01") + sc("02") + sc("03") + sc("04"), 2),
                "rc_ammortamenti": sc("50"),
                "rc_minusvalenza": sc("46"),
                "rc_ricavi_servizi": -sc("44"),
                "rc_oneri_factoring": sc("55"),
                "rc_iva_t1_versata": round((iva.get("2027-T1") or {}).get("saldo") or 0, 2) if (iva.get("2027-T1") or {}).get("versato") else 0,
                "rc_credito_iva": sc("14"),
                "rc_ires": -sc("23"), "rc_irap": -sc("35"), "rc_anticipate": sc("17"),
                "rc_utile": round(chiuso.get("utile") or 0, 2),
                "rc_chiuso": "sì" if chiuso.get("risultato") and chiuso.get("chiusuraSP") else "no",
                "rc_riaperto": "sì" if chiuso.get("riapertura") else "no",
                "rc_banca_2028": round(sum((1 if x.get("dareAvere") == "DARE" else -1) * (x.get("importo") or 0) for r in s.get("registrazioni") or [] for x in r.get("righe") or [] if str(x.get("conto")) == "10"), 2),
            })
            # «Dicembre: dalla costituzione alla riapertura»: saldi del 2026 senza epilogo, chiusura e riapertura
            def s26(conto):
                return sc(conto, fino="2026-12-31")
            ch26 = (s.get("chiusure") or {}).get("2026") or {}
            base.update({
                "dc_costituzione": (s.get("costituzione") or {}).get("data") or "",
                "dc_capitale_versato": round(-s26("30") - s26("08"), 2),
                "dc_ordini_pp": sum(1 for o in s.get("produzione") or [] if (o.get("data") or "").startswith("2026-12")),
                "dc_scorte": "/".join(str(round(g.get(m, 0))) for m in ("FERRO", "SL-TAGLIO", "SL-PIEGA", "TR-STD")),
                "dc_rimanenze": round(s26("12") + s26("07") + s26("13"), 2),
                "dc_colli": len((s.get("sped") or {}).get("colli") or []),
                "dc_plusvalenza": -s26("45"), "dc_minusvalenza": s26("46"), "dc_sopravvenienza": -s26("84"),
                "dc_risconto": s26("06"), "dc_rateo": -s26("39"), "dc_ammortamenti": s26("50"),
                "dc_credito_iva": s26("14"), "dc_ires": -s26("23"), "dc_irap": -s26("35"),
                "dc_utile": round(ch26.get("utile") or 0, 2),
                "dc_chiuso": "sì" if ch26.get("risultato") and ch26.get("chiusuraSP") else "no",
                "dc_riaperto": "sì" if ch26.get("riapertura") else "no",
                "dc_banca_31_12": s26("10"),
            })
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
