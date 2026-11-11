"""
Renders a resume as a one-page, ATS-friendly PDF that follows Jake's Resume template (Overleaf):
centred name and contact line, small-caps section headings with a rule, bold role + right-aligned dates,
italic company + right-aligned location, small bullets, and an unbulleted skills block.

ATS rules baked in: real selectable text in reading order, one font family, no images or icons,
standard section names, visible URLs, no zero-width or exotic characters, ligatures flattened.
"""
import re
import unicodedata
from io import BytesIO
from xml.sax.saxutils import escape, quoteattr

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import BaseDocTemplate, Frame, HRFlowable, KeepTogether, PageTemplate, Paragraph, Table, TableStyle

PAGE = A4
MARGIN = 0.5 * inch
# (font size, spacing factor). The first level that fits on one page wins: type shrinks gently, then spacing tightens.
FIT_LEVELS = ((10.5, 1.0), (10.5, 0.7), (10, 1.0), (10, 0.7), (9.5, 1.0), (9.5, 0.7), (9, 0.7), (9, 0.5), (8.5, 0.5))
# Order for people with work experience. Use ("education", "experience", "projects", "skills", ...) for Jake's original order.
SECTION_ORDER = ("summary", "skills", "experience", "projects", "education", "certifications", "additional")
ADDITIONAL_TITLE = "Leadership"  # heading used for the "additional" list

_MAP = {"\u2192": "->", "\u21d2": "->", "\u2265": ">=", "\u2264": "<=", "\u2212": "-", "\u00a0": " ", "\u2011": "-", "\u00d7": "x"}
_LEAD_BULLET = re.compile(r"^[\u2022\u25cf\u25aa\u25e6\u2023\u25cb*\-]\s+")


def _clean(s) -> str:
    """Text that every ATS and the standard PDF fonts handle: no ligatures, zero-width or unsupported characters."""
    s = unicodedata.normalize("NFKC", str(s or ""))
    s = re.sub(r"[\u200b-\u200f\u2060\ufeff]", "", s)
    s = "".join(_MAP.get(c, c) for c in s)
    out = []
    for ch in s:
        try:
            ch.encode("cp1252")
            out.append(ch)
        except UnicodeEncodeError:
            out.append(unicodedata.normalize("NFKD", ch).encode("ascii", "ignore").decode())
    return re.sub(r"[\x00-\x1f]|\s+", " ", "".join(out)).strip()


def _t(s) -> str:
    return escape(_clean(s))


def _display_url(url: str) -> str:
    return re.sub(r"^https?://(www\.)?", "", url.strip()).rstrip("/")


def _build(r: dict, size: float, k: float = 1.0) -> tuple[bytes, int]:
    width = PAGE[0] - 2 * MARGIN
    margin_y = MARGIN if k >= 1 else 0.4 * inch
    small = size - 0.5

    body = ParagraphStyle("body", fontName="Times-Roman", fontSize=size, leading=size * 1.17)
    bold = ParagraphStyle("bold", parent=body, fontName="Times-Bold")
    ital = ParagraphStyle("ital", parent=body, fontName="Times-Italic", fontSize=small, leading=small * 1.17)
    right = ParagraphStyle("right", parent=body, alignment=TA_RIGHT)
    right_i = ParagraphStyle("right_i", parent=ital, alignment=TA_RIGHT)
    name_style = ParagraphStyle("name", parent=body, fontName="Times-Bold", fontSize=size * 2.2, leading=size * 2.4, alignment=TA_CENTER)
    contact_style = ParagraphStyle("contact", parent=body, fontSize=small, leading=small * 1.25, alignment=TA_CENTER, spaceBefore=1, spaceAfter=2)
    head = ParagraphStyle("head", parent=body, fontSize=size + 1.5, leading=size + 3, spaceBefore=size * 0.6 * k)
    bullet = ParagraphStyle("bullet", parent=body, fontSize=small, leading=small * 1.17, leftIndent=12, bulletIndent=3, bulletFontSize=small)
    plain = ParagraphStyle("plain", parent=body, fontSize=small, leading=small * 1.17, leftIndent=12)
    para = ParagraphStyle("para", parent=body, fontSize=small, leading=small * 1.2)

    def smallcaps(text: str, big: float) -> str:
        """Small caps like the LaTeX template: capital first letters, smaller capitals for the rest."""
        words = []
        for w in _clean(text).split(" "):
            if w:
                words.append(f'{escape(w[0].upper())}<font size="{big * 0.8:.1f}">{escape(w[1:].upper())}</font>')
        return " ".join(words)

    def section(title: str):
        return [Paragraph(smallcaps(title, size + 1.5), head),
                HRFlowable(width="100%", thickness=0.5, color=colors.black, spaceBefore=1, spaceAfter=2.5)]

    def entry(top_left: str, top_right: str, sub_left: str = "", sub_right: str = ""):
        """top_left is markup (already escaped); the rest is plain text."""
        rows = [[Paragraph(top_left, bold), Paragraph(_t(top_right), right)]]
        if sub_left or sub_right:
            rows.append([Paragraph(_t(sub_left), ital), Paragraph(_t(sub_right), right_i)])
        t = Table(rows, colWidths=[width * 0.7, width * 0.3])
        t.spaceBefore = 3 * k
        t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                               ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
        return t

    def bullets(items):
        out = []
        for b in items or []:
            text = _LEAD_BULLET.sub("", _clean(b))
            if text:
                out.append(Paragraph(escape(text), bullet, bulletText="\u2022"))
        return out

    def block(head_flowable, items):
        """Keeps an entry heading together with its first bullet so it never sits alone at a page bottom."""
        items = [head_flowable] + items
        return [KeepTogether(items[:2])] + items[2:]

    # ---- header ----
    story = [Paragraph(smallcaps(r.get("name") or "Resume", size * 2.2), name_style)]
    if r.get("title"):
        story.append(Paragraph(_t(r["title"]), ParagraphStyle("title", parent=contact_style, fontSize=size, leading=size * 1.2)))
    c = r.get("contact") or {}
    parts = [_t(c[k]) for k in ("location", "phone") if c.get(k)]
    if c.get("email"):
        parts.append(f'<u><link href={quoteattr("mailto:" + c["email"].strip())}>{_t(c["email"])}</link></u>')
    for link in c.get("links") or []:
        url = (link if isinstance(link, str) else link.get("url")) or ""
        if url.strip():
            href = url.strip() if re.match(r"https?://", url.strip()) else "https://" + url.strip()
            parts.append(f"<u><link href={quoteattr(href)}>{_t(_display_url(url))}</link></u>")  # visible URL: many ATS ignore link targets
    if parts:
        story.append(Paragraph(" | ".join(parts), contact_style))

    # ---- sections ----
    def summary():
        text = (r.get("summary") or r.get("profileSummary") or "").strip()
        return section("Summary") + [Paragraph(_t(text), para)] if text else []

    def education():
        out = []
        for e in r.get("education") or []:
            out.append(entry(f"{_t(e.get('school') or e.get('institution'))}", e.get("location", ""), e.get("degree", ""), e.get("dates") or e.get("year", "")))
        return section("Education") + out if out else []

    def experience():
        out = []
        for e in r.get("experience") or []:
            role = e.get("role") or e.get("title") or ""
            head_row = entry(_t(role or e.get("company")), e.get("dates") or e.get("period", ""), e.get("company", "") if role else "", e.get("location", ""))
            out += block(head_row, bullets(e.get("bullets")))
        return section("Experience") + out if out else []

    def projects():
        out = []
        for p in r.get("projects") or []:
            name = _t(p.get("name") or p.get("title"))
            tech = f' | <i>{_t(p["tech"])}</i>' if p.get("tech") else ""
            out += block(entry(f"{name}{tech}", p.get("dates") or p.get("year", "")), bullets(p.get("bullets")))
        return section("Projects") + out if out else []

    def skills():
        out = []
        for g in r.get("skills") or []:
            items = g.get("items") or []
            line = ", ".join(items) if isinstance(items, list) else str(items)
            if _clean(line):
                label = f"<b>{_t(g.get('category'))}</b>: " if g.get("category") else ""
                out.append(Paragraph(label + _t(line), plain))
        return section("Technical Skills") + out if out else []

    def certifications():
        items = [ct if isinstance(ct, str) else " - ".join(x for x in (ct.get("title") or ct.get("name"), ct.get("code")) if x) for ct in r.get("certifications") or []]
        b = bullets(items)
        return section("Certifications") + b if b else []

    def additional():
        b = bullets(r.get("leadership") or r.get("additional"))
        return section(ADDITIONAL_TITLE) + b if b else []

    builders = {"summary": summary, "education": education, "experience": experience, "projects": projects,
                "skills": skills, "certifications": certifications, "additional": additional}
    for key in SECTION_ORDER:
        story += builders[key]()

    skill_words = [_clean(i) for g in (r.get("skills") or []) for i in (g.get("items") or [])][:20]
    buf = BytesIO()
    doc = BaseDocTemplate(buf, pagesize=PAGE, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=margin_y, bottomMargin=margin_y,
                          title=f"{_clean(r.get('name')) or 'Resume'} - Resume", author=_clean(r.get("name")) or "Applicant",
                          subject="Resume", keywords=", ".join(skill_words))
    # Zero-padding frame so headings, rules and entries all share the same left and right edge.
    frame = Frame(MARGIN, margin_y, width, PAGE[1] - 2 * margin_y, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="resume", frames=[frame])])
    doc.build(story)
    return buf.getvalue(), doc.page


def build_pdf(resume: dict) -> tuple[bytes, int, float]:
    """Shrinks the font, then the spacing, until everything fits on one page."""
    print(f"DEBUG: Building PDF for {resume.get('name')}")
    for size, k in FIT_LEVELS:
        data, pages = _build(resume, size, k)
        print(f"DEBUG: Try size={size}, k={k}, pages={pages}")
        if pages == 1:
            break
    return data, pages, size
