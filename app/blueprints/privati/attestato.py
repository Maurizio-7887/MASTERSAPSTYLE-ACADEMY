"""Attestato di frequenza e profitto in PDF (modello MASTER CAMPUS, come le altre Academy) con QR di verifica pubblica.
Attestato privato di formazione: non è un titolo di studio né una certificazione SAP."""
import os
from io import BytesIO

from flask import url_for
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.pdfgen import canvas

# Modello approvato (ottobre 2026): marchio MASTER CAMPUS a sinistra, marchio Maurizio Gustinicchi a destra,
# sigillo al centro in basso, firma, QR di verifica. Risorse in static/attestato/ (sorgenti SVG in sorgenti/).
RISORSE = os.path.join(os.path.dirname(__file__), "static", "attestato")
ORO = colors.HexColor("#C9A042")
ORO_T = colors.HexColor("#9a6b12")
INK = colors.HexColor("#11141b")
TESTO = colors.HexColor("#4a4d55")
MUTED = colors.HexColor("#6a6f79")
TENUE = colors.HexColor("#8a8d95")
CARTA = colors.HexColor("#fffdf9")
MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre",
        "novembre", "dicembre"]
_FONT = {"PF": "PlayfairDisplay-Medium.ttf", "PFI": "PlayfairDisplay-MediumItalic.ttf", "MR": "Manrope-Medium.ttf",
         "MRB": "Manrope-SemiBold.ttf", "JB": "JetBrainsMono-Regular.ttf"}


def _font():
    for nome, file in _FONT.items():
        if nome not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont(nome, os.path.join(RISORSE, "fonts", file)))


def verify_url(code):
    return url_for("privati.verifica", codice=code, _external=True)


def data_estesa(d):
    return f"{d.day} {MESI[d.month - 1]} {d.year}"


def titolo_e_contenuti(cert):
    """Il titolo del corso fino ai due punti; i moduli diventano la riga dei contenuti."""
    from ...corsi_privati import corso
    titolo = (cert.titolo or "").partition(":")[0].strip()
    moduli = [m[0].split(" · ", 1)[-1] for m in corso(cert.corso)["moduli"]]
    resto = ", ".join(moduli)
    return titolo, (resto[:1].upper() + resto[1:]).rstrip(".") + "."


def build_pdf(cert):
    _font()
    buf = BytesIO()
    W, H = landscape(A4)
    c = canvas.Canvas(buf, pagesize=(W, H))
    c.setTitle(f"Attestato {cert.codice}")
    c.setAuthor("Maurizio Gustinicchi Consulting · MASTER CAMPUS")
    y = lambda v: H - v * mm  # noqa: E731 - coordinate dall'alto, in millimetri

    def img(nome, x, top, w=None, h=None, anchor="left"):
        from reportlab.lib.utils import ImageReader
        ir = ImageReader(os.path.join(RISORSE, nome))
        iw, ih = ir.getSize()
        if w is None:
            w = h * iw / ih
        if h is None:
            h = w * ih / iw
        x0 = x - w if anchor == "right" else (x - w / 2 if anchor == "center" else x)
        c.drawImage(ir, x0, H - top - h, w, h, mask="auto")

    def centrato(txt, font, size, v, col, x=W / 2, track=0):
        c.setFillColor(col)
        if track:
            c.saveState()
            t = c.beginText(); t.setFont(font, size); t.setCharSpace(track)
            larg = pdfmetrics.stringWidth(txt, font, size) + track * (len(txt) - 1)
            t.setTextOrigin(x - larg / 2, y(v)); t.textOut(txt); c.drawText(t)
            c.restoreState()
        else:
            c.setFont(font, size); c.drawCentredString(x, y(v), txt)

    c.setFillColor(CARTA); c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setStrokeColor(ORO); c.setLineWidth(1.1); c.rect(8 * mm, 8 * mm, W - 16 * mm, H - 16 * mm)
    c.setLineWidth(.45); c.rect(10.5 * mm, 10.5 * mm, W - 21 * mm, H - 21 * mm)
    img("filigrana.png", W / 2, 35 * mm, w=140 * mm, anchor="center")

    # testata: i due marchi
    img("master-campus.png", 20 * mm, 17 * mm, h=19 * mm)
    img("marchio-mg.png", W - 20 * mm, 16 * mm, h=21 * mm, anchor="right")

    titolo, contenuti = titolo_e_contenuti(cert)
    centrato("CAMPUS ACADEMY · CORSI ONLINE", "JB", 9.5, 55.6, ORO_T, track=3)
    centrato("Attestato di frequenza e profitto", "PF", 30, 70.4, INK)
    centrato("Si attesta che", "MR", 11, 84.4, MUTED)
    nome = cert.nome_completo
    size = 34
    while pdfmetrics.stringWidth(nome, "PFI", size) > 200 * mm and size > 20:
        size -= 1
    centrato(nome, "PFI", size, 98.5, INK)
    c.setStrokeColor(ORO); c.setLineWidth(.6); c.line(W / 2 - 55 * mm, y(105), W / 2 + 55 * mm, y(105))
    centrato("ha frequentato e completato il corso online", "MR", 11, 113.9, MUTED)
    size = 21
    while pdfmetrics.stringWidth(titolo, "PF", size) > 225 * mm and size > 13:
        size -= .5
    centrato(titolo, "PF", size, 124, INK)
    from ...corsi_privati import corso
    moduli = len(corso(cert.corso)["moduli"])
    ore = f"{cert.ore:g}".replace(".", ",")
    det = f"{ore} ORE · {moduli} MODULI · ESERCITAZIONI NEL SISTEMA INTEGRATO · ESAME FINALE SUPERATO CON {cert.punteggio:.0f}/100"
    centrato(det, "JB", 9, 132.4, TESTO, track=1.2)
    if contenuti:
        st = ParagraphStyle("c", fontName="MR", fontSize=9.6, leading=14, alignment=TA_CENTER, textColor=TESTO)
        par = Paragraph(contenuti, st)
        _, ph = par.wrap(200 * mm, 30 * mm)
        par.drawOn(c, W / 2 - 100 * mm, y(136) - ph)

    # piede: QR e data, sigillo, firma
    url = verify_url(cert.codice)
    qr = QrCodeWidget(url, barBorder=0)
    x1, y1, x2, y2 = qr.getBounds()
    q = 19 * mm
    d = Drawing(q, q, transform=[q / (x2 - x1), 0, 0, q / (y2 - y1), 0, 0]); d.add(qr)
    renderPDF.draw(d, c, 24 * mm, y(188.5))
    xl = 48 * mm
    c.saveState(); c.setFillColor(ORO_T); t = c.beginText(); t.setFont("JB", 7.5); t.setCharSpace(1.8)
    t.setTextOrigin(xl, y(165.4)); t.textOut("LUOGO E DATA"); c.drawText(t); c.restoreState()
    c.setFillColor(INK); c.setFont("PF", 12); c.drawString(xl, y(171.6), f"Città di Castello, {data_estesa(cert.emesso)}")
    c.setStrokeColor(TENUE); c.setLineWidth(.6); c.line(xl, y(174.6), 119 * mm, y(174.6))
    c.setFillColor(TESTO); c.setFont("MR", 9.5); c.drawString(xl, y(179.4), f"Codice {cert.codice}")
    c.setFillColor(TENUE); c.setFont("MR", 7.6)
    c.drawString(xl, y(183.4), "Verifica con il QR o su")
    c.drawString(xl, y(187), url.split("://", 1)[-1].rsplit("/", 1)[0])

    img("sigillo.png", W / 2, 151 * mm, w=36 * mm, anchor="center")

    xf = 225.6 * mm
    img("firma.png", xf, 157.5 * mm, h=17 * mm, anchor="center")
    c.setStrokeColor(TENUE); c.line(178 * mm, y(174.4), 273 * mm, y(174.4))
    centrato("Maurizio Gustinicchi", "MRB", 10, 179.2, INK, x=xf)
    centrato("Docente e direttore didattico", "MR", 8.2, 183.3, TESTO, x=xf)
    centrato("Controller AssoController · Innovation Manager UNI 11814", "MR", 7.6, 187, TENUE, x=xf)

    centrato("Attestato privato rilasciato da Maurizio Gustinicchi Consulting · Città di Castello (PG) · "
             "non costituisce titolo di studio con valore legale", "JB", 6.8, 196, TENUE, track=.4)
    c.showPage(); c.save()
    buf.seek(0)
    return buf
