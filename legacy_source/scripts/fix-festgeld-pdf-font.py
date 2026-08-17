#!/usr/bin/env python3
"""Replace mixed PDF fonts with DIN (Altinn-DIN) and fix known text glitches."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

import fitz

FONT_DIR = Path(__file__).resolve().parent / "fonts"
FONT_REGULAR = FONT_DIR / "D-DIN.otf"
FONT_BOLD = FONT_DIR / "D-DIN-Bold.otf"
FONT_ITALIC = FONT_DIR / "D-DIN-Italic.otf"

DEFAULT_INPUT = Path(
    r"c:\Users\HP\Desktop\Kapitalmitte Antrage ETC\BBVA\BBVA Festgeld Unterlagen\BBVA Deutschland_Festgeldvertrag.pdf"
)
DEFAULT_BACKUP = DEFAULT_INPUT.with_name(DEFAULT_INPUT.stem + "_backup" + DEFAULT_INPUT.suffix)

DROP_TEXT = {">", "[Il", "[Il ", "1"}


def int_to_rgb(color: int) -> tuple[float, float, float]:
    return (
        ((color >> 16) & 255) / 255.0,
        ((color >> 8) & 255) / 255.0,
        (color & 255) / 255.0,
    )


def sample_bg_color(page: fitz.Page, rect: fitz.Rect) -> tuple[float, float, float]:
    cx = (rect.x0 + rect.x1) / 2
    cy = (rect.y0 + rect.y1) / 2
    clip = fitz.Rect(cx - 1, cy - 1, cx + 1, cy + 1)
    pix = page.get_pixmap(clip=clip, alpha=False)
    if pix.n >= 3:
        return (pix.samples[0] / 255.0, pix.samples[1] / 255.0, pix.samples[2] / 255.0)
    v = pix.samples[0] / 255.0
    return (v, v, v)


def fix_text(text: str) -> str | None:
    t = text.replace("\u00a0", " ")
    stripped = t.strip()
    if not stripped or stripped in DROP_TEXT:
        return None
    if stripped == "D":
        return "[ ]"

    replacements = [
        ("Ba neo", "Banco"),
        ("Staatsa ng e hörig keit", "Staatsangehörigkeit"),
        ("PLZ/Ort'", "PLZ/Ort*"),
        ("mit•", "mit *"),
        ("p.a.•", "p.a.*"),
        ("[empfohlen für maximale Erträge)", "[empfohlen für maximale Erträge]"),
        ('" genannt]', "\u201c genannt]"),
        ('„Bank"', "„Bank\u201c"),
    ]
    for old, new in replacements:
        t = t.replace(old, new)

    return t


def pick_font(flags: int, font_name: str, cache: dict[str, fitz.Font]) -> fitz.Font:
    italic = bool(flags & 2)
    bold = bool(flags & 16) or "Bold" in font_name
    if italic:
        key = "italic"
    elif bold:
        key = "bold"
    else:
        key = "regular"
    if key not in cache:
        path = {"regular": FONT_REGULAR, "bold": FONT_BOLD, "italic": FONT_ITALIC}[key]
        cache[key] = fitz.Font(fontfile=str(path))
    return cache[key]


def collect_spans(page: fitz.Page) -> tuple[list[dict], list[dict]]:
    all_spans: list[dict] = []
    redraw_spans: list[dict] = []

    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                rect = fitz.Rect(span["bbox"]).irect
                rect.x0 -= 1
                rect.y0 -= 1
                rect.x1 += 1.5
                rect.y1 += 1
                entry = {
                    "text": span["text"],
                    "fixed": fix_text(span["text"]),
                    "origin": span["origin"],
                    "size": span["size"],
                    "flags": span["flags"],
                    "font_name": span["font"],
                    "color": int_to_rgb(span["color"]),
                    "rect": rect,
                    "bg": sample_bg_color(page, rect),
                }
                all_spans.append(entry)
                if entry["fixed"] is not None:
                    redraw_spans.append(entry)

    return all_spans, redraw_spans


def replace_page_fonts(page: fitz.Page) -> int:
    all_spans, redraw_spans = collect_spans(page)

    for span in all_spans:
        page.add_redact_annot(span["rect"], fill=span["bg"])
    page.apply_redactions()

    font_cache: dict[str, fitz.Font] = {}
    groups: dict[tuple[tuple[float, float, float], str], list[dict]] = {}
    for span in redraw_spans:
        italic = bool(span["flags"] & 2)
        bold = bool(span["flags"] & 16) or "Bold" in span["font_name"]
        style = "italic" if italic else "bold" if bold else "regular"
        font = pick_font(span["flags"], span["font_name"], font_cache)
        key = (span["color"], style)
        groups.setdefault(key, []).append({**span, "font": font})

    count = 0
    for (color, _), batch in groups.items():
        tw = fitz.TextWriter(page.rect, color=color)
        for span in batch:
            tw.append(span["origin"], span["fixed"], font=span["font"], fontsize=span["size"])
            count += 1
        tw.write_text(page, color=False, render_mode=0)

    return count


def main() -> int:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INPUT
    backup = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_BACKUP

    if not src.exists():
        print(f"Input not found: {src}", file=sys.stderr)
        return 1

    for font in (FONT_REGULAR, FONT_BOLD, FONT_ITALIC):
        if not font.exists() or font.stat().st_size < 1000:
            print(f"Missing font file: {font}", file=sys.stderr)
            return 1

    if backup.exists():
        shutil.copy2(backup, src)
        print(f"Restored from backup: {backup}")
    elif not src.with_name(src.stem + "_backup" + src.suffix).exists():
        shutil.copy2(src, src.with_name(src.stem + "_backup" + src.suffix))
        print(f"Backup created: {src.with_name(src.stem + '_backup' + src.suffix)}")

    doc = fitz.open(src)

    total = 0
    for page in doc:
        total += replace_page_fonts(page)

    out = src.with_name(src.stem + "_DIN" + src.suffix)
    doc.save(out, garbage=4, deflate=True, clean=True)
    doc.close()
    shutil.copy2(out, src)

    print(f"Updated {src}")
    print(f"DIN copy: {out}")
    print(f"Replaced {total} text spans with DIN")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
