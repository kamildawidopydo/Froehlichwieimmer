#!/usr/bin/env python3
"""
Fröhlich Color System — WCAG Contrast Regression (Session 80.43).

Prüft alle relevanten Vordergrund/Hintergrund-Paarungen der drei neuen
Slots (Gold, Champagne, Sage) plus Fallback-Kombinationen gegen
WCAG-Kontraststandards. Läuft standalone, keine Node/Jest-Dependency.

Nutzung:
    python3 /app/frontend/scripts/check-contrast.py
Exit-Code 0 bei PASS, 1 bei mindestens einem FAIL.

WCAG 2.1:
- AA normal text  : >= 4.5:1
- AA large text   : >= 3.0:1  (18pt+ oder 14pt bold)
- AAA normal text : >= 7.0:1
- AAA large text  : >= 4.5:1
"""
from __future__ import annotations

import sys
from typing import Tuple

# Alle Werte gespiegelt aus /app/frontend/src/index.css (Light + Dark).
LIGHT = {
    "white":               "#FFFFFF",
    "surface":             "#FFFFFF",
    "text":                "#1E292B",
    "text-muted":          "#667675",
    # Gold — Session 80.43 AA-tuned
    "gold":                "#C89A3D",
    "gold-strong":         "#8F641A",
    "gold-ink":            "#5D4414",
    "gold-tint":           "#FBF5E8",
    "gold-border":         "#E7D5AC",
    # Champagne — Session 80.43 AA-tuned
    "champagne":           "#D8C5A3",
    "champagne-strong":    "#9E8258",
    "champagne-ink":       "#5C4B33",
    "champagne-tint":      "#FAF7F1",
    "champagne-border":    "#E9DFCF",
    # Sage — Session 80.43 AA-tuned
    "sage":                "#8FA89A",
    "sage-strong":         "#566F60",
    "sage-ink":            "#385448",
    "sage-tint":           "#F1F6F3",
    "sage-border":         "#CBDAD2",
}

DARK = {
    "bg":                  "#1E1E22",
    "surface-elev":        "#343438",
    "text":                "#F5F6F7",
    # Gold (dark)
    "gold-strong":         "#E4C680",
    "gold-ink":            "#F4E2BC",
    "gold-tint":           "#2E240C",
    # Champagne (dark)
    "champagne-strong":    "#DCC8A8",
    "champagne-ink":       "#EBDCC2",
    "champagne-tint":      "#28221A",
    # Sage (dark)
    "sage-strong":         "#BCD2C4",
    "sage-ink":            "#D6E8DE",
    "sage-tint":           "#182820",
}


def _hex_to_rgb(hx: str) -> Tuple[int, int, int]:
    hx = hx.lstrip("#")
    return int(hx[0:2], 16), int(hx[2:4], 16), int(hx[4:6], 16)


def _rel_luminance(rgb: Tuple[int, int, int]) -> float:
    def _ch(c: int) -> float:
        s = c / 255.0
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * _ch(r) + 0.7152 * _ch(g) + 0.0722 * _ch(b)


def contrast(fg: str, bg: str) -> float:
    l1 = _rel_luminance(_hex_to_rgb(fg))
    l2 = _rel_luminance(_hex_to_rgb(bg))
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


# (Mode-Label, fg-token, bg-token, minimum ratio, note)
CHECKS = [
    # ---- LIGHT ------------------------------------------------------------
    ("LIGHT", "gold-ink",         "gold-tint",   7.0, "Gold-Ink auf Gold-Tint (AAA text)"),
    ("LIGHT", "gold-ink",         "white",       7.0, "Gold-Ink auf Weiß (AAA text)"),
    ("LIGHT", "gold-strong",      "white",       4.5, "Gold-Strong auf Weiß (AA text)"),
    ("LIGHT", "gold-strong",      "gold-tint",   4.5, "Gold-Strong auf Gold-Tint (AA text)"),

    ("LIGHT", "champagne-ink",    "champagne-tint", 7.0, "Champagne-Ink auf Champagne-Tint (AAA)"),
    ("LIGHT", "champagne-ink",    "white",       7.0, "Champagne-Ink auf Weiß (AAA)"),
    ("LIGHT", "champagne-strong", "white",       3.0, "Champagne-Strong auf Weiß (AA large text)"),

    ("LIGHT", "sage-ink",         "sage-tint",   7.0, "Sage-Ink auf Sage-Tint (AAA)"),
    ("LIGHT", "sage-ink",         "white",       7.0, "Sage-Ink auf Weiß (AAA)"),
    ("LIGHT", "sage-strong",      "white",       4.5, "Sage-Strong auf Weiß (AA text)"),
    ("LIGHT", "sage-strong",      "sage-tint",   4.5, "Sage-Strong auf Sage-Tint (AA)"),
]

DARK_CHECKS = [
    ("DARK",  "gold-ink",         "bg",             4.5, "Gold-Ink auf Dark-Bg (AA text)"),
    ("DARK",  "gold-ink",         "gold-tint",      4.5, "Gold-Ink auf Dark Gold-Tint (AA)"),
    ("DARK",  "gold-strong",      "bg",             3.0, "Gold-Strong auf Dark-Bg (AA large)"),

    ("DARK",  "champagne-ink",    "bg",             4.5, "Champagne-Ink auf Dark-Bg (AA)"),
    ("DARK",  "champagne-ink",    "champagne-tint", 4.5, "Champagne-Ink auf Dark Champagne-Tint (AA)"),

    ("DARK",  "sage-ink",         "bg",             4.5, "Sage-Ink auf Dark-Bg (AA)"),
    ("DARK",  "sage-ink",         "sage-tint",      4.5, "Sage-Ink auf Dark Sage-Tint (AA)"),
    ("DARK",  "sage-strong",      "bg",             3.0, "Sage-Strong auf Dark-Bg (AA large)"),
]


def main() -> int:
    fails = 0
    print(f"{'MODE':<6} {'RATIO':>7}  {'MIN':>4}  STATUS  DESCRIPTION")
    print("-" * 90)
    for mode, fg, bg, minimum, note in CHECKS + DARK_CHECKS:
        table = LIGHT if mode == "LIGHT" else DARK
        try:
            fg_hex = table[fg]
            bg_hex = table[bg]
        except KeyError as e:
            print(f"{mode:<6} {'   n/a':>7}  {minimum:>4.1f}  MISSING  {note} — key {e}")
            fails += 1
            continue
        ratio = contrast(fg_hex, bg_hex)
        status = "PASS " if ratio >= minimum else "FAIL "
        if ratio < minimum:
            fails += 1
        print(f"{mode:<6} {ratio:7.2f}  {minimum:>4.1f}  {status}  {note}  ({fg_hex} on {bg_hex})")

    print("-" * 90)
    total = len(CHECKS) + len(DARK_CHECKS)
    if fails:
        print(f"FAILED: {fails}/{total}")
        return 1
    print(f"OK: {total}/{total} contrast checks pass")
    return 0


if __name__ == "__main__":
    sys.exit(main())
