#!/usr/bin/env python3
"""Replace Alexander Wahl branding with Fröhlich Vermögensberatung in the PDF.

Uses pymupdf redaction annotations + text insertion to keep the original layout.
"""
from __future__ import annotations

import pymupdf

SRC = "/app/generated_pdfs/original.pdf"
DST = "/app/generated_pdfs/Zinsstaffel-Konditionen-Froehlich.pdf"

INTER_REG = "/usr/share/fonts/opentype/inter/Inter-Regular.otf"
INTER_BOLD = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"


def rgb_from_int(c: int) -> tuple[float, float, float]:
    return ((c >> 16) & 0xFF) / 255, ((c >> 8) & 0xFF) / 255, (c & 0xFF) / 255


COLOR_MUTED = rgb_from_int(6055026)   # header + body captions
COLOR_FOOTER = rgb_from_int(10134193)  # footer address grey
COLOR_BRAND_BLUE = rgb_from_int(1386831)  # top-right brand headline
NBSP = "\u00a0"


def _text_width(text: str, fontfile: str, size: float) -> float:
    f = pymupdf.Font(fontfile=fontfile)
    return f.text_length(text, fontsize=size)


def insert_line(page, x, y, text, *, fontfile, fontname, size, color, align=0, width=250):
    """Insert one line of text at exact baseline coordinates via a wide textbox."""
    tb = pymupdf.Rect(x, y - 2, x + width, y + size + 2)
    page.insert_textbox(
        tb, text,
        fontname=fontname, fontfile=fontfile, fontsize=size,
        color=color, align=align,
    )


def main() -> None:
    doc = pymupdf.open(SRC)

    # ============================== PAGE 1 ==============================
    p1 = doc[0]
    # Collect all redactions first, then apply once, then draw new text.
    reds = [
        # header phone (was: "49 40 334 657 983" at 672-734) — stay BELOW "Ihr Service-Team" bottom y=53.8
        pymupdf.Rect(670, 54.3, 800, 65),
        # header email
        pymupdf.Rect(598, 63.5, 800, 79),
        # footer address line
        pymupdf.Rect(180, 549, 620, 561),
        # footer register line
        pymupdf.Rect(240, 559, 560, 572),
    ]
    for r in reds:
        p1.add_redact_annot(r, fill=(1, 1, 1))
    p1.apply_redactions()

    # Re-draw header phone (same x-start as original)
    insert_line(p1, 672.1, 54.0, "0 6966 7785941",
                fontfile=INTER_REG, fontname="F-InterReg", size=8.6,
                color=COLOR_MUTED)
    # Re-draw header email (same x-start as original)
    insert_line(p1, 600.6, 64.6, "kundenservice@essenceinvest.com",
                fontfile=INTER_REG, fontname="F-InterReg", size=8.6,
                color=COLOR_MUTED, width=300)

    # Footer lines (centered)
    footer1 = (f"Fröhlich Vermögensberatung GmbH{NBSP}·{NBSP}"
               f"Bösgrunder Weg 62{NBSP}·{NBSP}"
               f"55543 Bad Kreuznach{NBSP}·{NBSP}Deutschland")
    footer2 = (f"Amtsgericht Bad Kreuznach{NBSP}·{NBSP}"
               f"HRB 23436{NBSP}·{NBSP}"
               f"Geschäftsführer: Manfred Franz Fröhlich")
    p1.insert_textbox(
        pymupdf.Rect(140, 549, 660, 561),
        footer1,
        fontname="F-InterReg", fontfile=INTER_REG,
        fontsize=7.0, color=COLOR_FOOTER, align=1,
    )
    p1.insert_textbox(
        pymupdf.Rect(180, 560, 620, 572),
        footer2,
        fontname="F-InterReg", fontfile=INTER_REG,
        fontsize=7.0, color=COLOR_FOOTER, align=1,
    )

    # ============================== PAGES 2 & 3 (top-right brand) ==============================
    for pi in (1, 2):
        page = doc[pi]
        # Cover the ENTIRE top-right brand block: "Alexander Wahl" + "Vermögensverwaltung GmbH"
        # AND the right column "Ihr Vermögen." / "Unsere Verantwortung." tagline.
        # Combined rect covers everything from x=560..800, y=24..60.
        page.add_redact_annot(pymupdf.Rect(560, 24, 800, 60), fill=(1, 1, 1))
        page.apply_redactions()
        # Re-draw as a single clean 2-line brand, right-aligned to same right edge (x=796)
        page.insert_text(
            (796 - _text_width("Fröhlich", INTER_BOLD, 15.5), 42),
            "Fröhlich",
            fontname="F-InterBold", fontfile=INTER_BOLD,
            fontsize=15.5, color=COLOR_BRAND_BLUE,
        )
        page.insert_text(
            (796 - _text_width("Vermögensberatung GmbH", INTER_REG, 7.5), 54),
            "Vermögensberatung GmbH",
            fontname="F-InterReg", fontfile=INTER_REG,
            fontsize=7.5, color=COLOR_MUTED,
        )

    # ============================== PAGE 3 disclaimer + Datenschutz URL ==============================
    p3 = doc[2]
    # Line 1 disclaimer: "Alexander Wahl" → "Fröhlich"
    p3.add_redact_annot(pymupdf.Rect(728, 344, 798, 356), fill=(1, 1, 1))
    # Line 2 disclaimer word "Vermögensverwaltung GmbH" (leaves the "im ..." intact)
    p3.add_redact_annot(pymupdf.Rect(558, 355, 666, 365), fill=(1, 1, 1))
    # URL "www.aw-" (line 1 of Datenschutz)
    p3.add_redact_annot(pymupdf.Rect(760, 440, 798, 452), fill=(1, 1, 1))
    # URL "vermoegensverwaltung.de " (line 2 of Datenschutz)
    p3.add_redact_annot(pymupdf.Rect(558, 450, 660, 462), fill=(1, 1, 1))
    p3.apply_redactions()

    # Insert Fröhlich in the disclaimer at the "Alexander Wahl" start position
    insert_line(p3, 729.4, 345.5, "Fröhlich",
                fontfile=INTER_REG, fontname="F-InterReg", size=7.6,
                color=COLOR_MUTED, width=70)
    # Insert "Vermögensberatung GmbH" replacing "Vermögensverwaltung GmbH" (same start)
    insert_line(p3, 559.1, 356.0, "Vermögensberatung GmbH",
                fontfile=INTER_REG, fontname="F-InterReg", size=7.6,
                color=COLOR_MUTED, width=110)
    # Replace "vermoegensverwaltung.de " on Datenschutz line 2 with "www.essenceinvest.com"
    insert_line(p3, 559.1, 452.0, "www.essenceinvest.com",
                fontfile=INTER_REG, fontname="F-InterReg", size=7.6,
                color=COLOR_MUTED, width=105)

    doc.save(DST, garbage=4, deflate=True, clean=True)
    print(f"Saved: {DST}")


if __name__ == "__main__":
    main()
