#!/usr/bin/env python3
"""Replace 'kapital-direkt24.de' occurrences in Froehlich download PDFs with
'essenceinvest.com'. Uses exact span bboxes (no expansion → no neighbor damage)
and page.insert_text() for baseline-accurate rendering.
"""
from __future__ import annotations

import shutil
from pathlib import Path

import pymupdf

DOCS_DIR = Path("/app/frontend/public/assets/documents")
BAK = DOCS_DIR / ".bak"
INTER_REG = "/usr/share/fonts/opentype/inter/Inter-Regular.otf"


def rgb_from_int(c: int) -> tuple[float, float, float]:
    return ((c >> 16) & 0xFF) / 255, ((c >> 8) & 0xFF) / 255, (c & 0xFF) / 255


REPLACEMENTS = {
    "kundenservice@kapital-direkt24.de": "kundenservice@essenceinvest.com",
    "www.kapital-direkt24.de": "www.essenceinvest.com",
    "kapital-direkt24.de": "essenceinvest.com",
}


def patch(pdf: Path) -> int:
    doc = pymupdf.open(pdf)
    patched = 0
    for page in doc:
        d = page.get_text("dict")
        spans_to_redact: list[tuple[pymupdf.Rect, str, float, int]] = []
        for b in d["blocks"]:
            if "lines" not in b:
                continue
            for line in b["lines"]:
                for span in line["spans"]:
                    txt = span["text"]
                    tl = txt.lower()
                    if "kapital-direkt24" not in tl:
                        continue
                    # Longest-prefix match
                    new = None
                    for old, repl in REPLACEMENTS.items():
                        if old in txt:
                            new = txt.replace(old, repl)
                            break
                    if new is None:
                        # fallback domain-only
                        new = txt.replace("kapital-direkt24.de", "essenceinvest.com")
                    spans_to_redact.append((
                        pymupdf.Rect(*span["bbox"]),
                        new,
                        span["size"],
                        span["color"],
                    ))
        for r, _, _, _ in spans_to_redact:
            page.add_redact_annot(r, fill=(1, 1, 1))
        if spans_to_redact:
            page.apply_redactions()
            for r, new, size, color_int in spans_to_redact:
                baseline_y = r.y1 - size * 0.18
                page.insert_text(
                    (r.x0, baseline_y),
                    new,
                    fontname="F-FroehlichInter",
                    fontfile=INTER_REG,
                    fontsize=size,
                    color=rgb_from_int(color_int),
                )
                patched += 1
    tmp = pdf.with_suffix(".tmp.pdf")
    doc.save(tmp, garbage=4, deflate=True, clean=True)
    doc.close()
    tmp.replace(pdf)
    return patched


def main() -> None:
    for name in [
        "Froehlich_Informationsbogen_Einlagenloesungen.pdf",
        "Froehlich_Kundendokumente.pdf",
        "Froehlich_Risiken_der_Kapitalanlage.pdf",
    ]:
        src = DOCS_DIR / name
        bak = BAK / name
        # Always restore from original backup first so re-runs are idempotent
        shutil.copy2(bak, src)
        n = patch(src)
        print(f"{name}: {n} replacement(s)")


if __name__ == "__main__":
    main()
