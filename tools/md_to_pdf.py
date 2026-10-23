"""Converte il sorgente Markdown dell'esercitazione nel PDF scaricabile dal portale.

Uso: python3 tools/md_to_pdf.py app/static/docs/Esercitazione_Completa_FORMAS.md \
        app/static/docs/Esercitazione_Completa_FORMAS.pdf "Esercitazione completa — Firenze e FORMAS Pistoia"
Gestisce titoli #/##/###, paragrafi, elenchi «- », tabelle «|», separatori «---», **grassetto** e `codice`.
"""
import re
import sys
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

BLU = colors.HexColor('#1f3a5f')


def inline(t):
    t = escape(t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'`(.+?)`', r'<font face="Courier">\1</font>', t)
    return t


def stili():
    base = getSampleStyleSheet()
    corpo = ParagraphStyle('corpo', parent=base['BodyText'], fontName='DejaVuSans', fontSize=8.6, leading=11.6, spaceAfter=3)
    return {
        'p': corpo,
        'li': ParagraphStyle('li', parent=corpo, leftIndent=8, bulletIndent=0),
        'h1': ParagraphStyle('h1', parent=corpo, fontSize=17, leading=21, textColor=BLU, spaceBefore=4, spaceAfter=8),
        'h2': ParagraphStyle('h2', parent=corpo, fontSize=12.5, leading=16, textColor=BLU, spaceBefore=10, spaceAfter=5),
        'h3': ParagraphStyle('h3', parent=corpo, fontSize=10, leading=13, textColor=BLU, spaceBefore=8, spaceAfter=4),
        'td': ParagraphStyle('td', parent=corpo, fontSize=7.8, leading=10, spaceAfter=0),
    }


def registra_font():
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.fonts import addMapping
    d = '/usr/share/fonts/truetype/dejavu/'
    pdfmetrics.registerFont(TTFont('DejaVuSans', d + 'DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', d + 'DejaVuSans-Bold.ttf'))
    addMapping('DejaVuSans', 0, 0, 'DejaVuSans')
    addMapping('DejaVuSans', 1, 0, 'DejaVuSans-Bold')
    addMapping('DejaVuSans', 0, 1, 'DejaVuSans')
    addMapping('DejaVuSans', 1, 1, 'DejaVuSans-Bold')


def flussi(md, st):
    out, par, tab = [], [], []

    def chiudi_par():
        if par:
            out.append(Paragraph('<br/>'.join(inline(x) for x in par), st['p']))
            par.clear()

    def chiudi_tab():
        if tab:
            righe = [[Paragraph(inline(c.strip()), st['td']) for c in r.strip().strip('|').split('|')] for r in tab
                     if not re.match(r'^\|[\s\-|:]+\|$', r.strip())]
            t = Table(righe, colWidths=[45 * mm, None][:len(righe[0])] if len(righe[0]) == 2 else None, repeatRows=1)
            t.setStyle(TableStyle([('GRID', (0, 0), (-1, -1), .4, colors.HexColor('#b8c4d6')),
                                   ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e8eef6')),
                                   ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
            out.append(t)
            out.append(Spacer(1, 4))
            tab.clear()

    for riga in md.split('\n'):
        s = riga.rstrip('\n')
        if s.strip().startswith('|'):
            chiudi_par(); tab.append(s); continue
        chiudi_tab()
        if not s.strip():
            chiudi_par(); continue
        m = re.match(r'^(#{1,3}) (.*)$', s)
        if m:
            chiudi_par(); out.append(Paragraph(inline(m.group(2)), st['h' + str(len(m.group(1)))])); continue
        if s.strip() == '---':
            chiudi_par(); out.append(HRFlowable(width='100%', color=colors.HexColor('#b8c4d6'))); continue
        if s.startswith('- '):
            chiudi_par(); out.append(Paragraph(inline(s[2:]), st['li'], bulletText='•')); continue
        if re.match(r'^\d+\. ', s):
            chiudi_par(); out.append(Paragraph(inline(s), st['li'])); continue
        par.append(s.rstrip())
        if not riga.endswith('  '):
            chiudi_par()
    chiudi_par(); chiudi_tab()
    return out


def main(src, dst, titolo):
    registra_font()
    st = stili()
    md = open(src, encoding='utf8').read()

    def pagina(c, doc):
        c.saveState()
        c.setFont('DejaVuSans', 6.5); c.setFillColor(colors.HexColor('#556677'))
        c.drawString(18 * mm, A4[1] - 10 * mm, 'MASTERSAPSTYLE ACADEMY | ' + titolo)
        c.drawCentredString(A4[0] / 2, 8 * mm, 'SIMULAZIONE DIDATTICA — NON VALIDO AI FINI FISCALI O COMMERCIALI')
        c.drawRightString(A4[0] - 18 * mm, 12 * mm, str(doc.page))
        c.restoreState()

    doc = SimpleDocTemplate(dst, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm,
                            bottomMargin=18 * mm, title=titolo, author='Maurizio Gustinicchi Consulting')
    doc.build(flussi(md, st), onFirstPage=pagina, onLaterPages=pagina)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'Esercitazione')
