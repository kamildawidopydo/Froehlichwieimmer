"""Fröhlich Favicon Generator (Session 93 · F-Variante).

Erzeugt minimalistische Fröhlich-Favicons mit einem stilisierten "F"
in Navy auf weißem, sanft abgerundetem Grund. Design bewusst frei von
Verläufen, 3D-Effekten oder Schatten und auch bei 16×16 klar lesbar.

Farben:
  Background : #FFFFFF (weiß)
  F-Glyph    : #0B2F5E (tiefes Navy)

Aufruf (aus diesem Verzeichnis):
  python3 generate_frohlich_favicon.py

Ausgabedateien:
  favicon-16x16.png
  favicon-32x32.png
  favicon.ico             (Multi-Size: 16, 32, 48)
  apple-touch-icon.png    (180×180)
"""
from __future__ import annotations

import os
from PIL import Image, ImageDraw

NAVY = (11, 47, 94, 255)
WHITE = (255, 255, 255, 255)
BASE = 1024

HERE = os.path.dirname(os.path.abspath(__file__))


def _draw_f(size: int) -> Image.Image:
    """Zeichnet das Fröhlich-Favicon (Buchstabe F) an gegebener Zielgröße."""
    if size <= 48:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        radius = max(1, size // 8)
        draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=radius, fill=WHITE)
        s = size
        x0 = round(0.22 * s)
        x1 = round(0.78 * s)
        x_mid = round(0.65 * s)  # Mittelbalken etwas kürzer
        y0 = round(0.18 * s)
        y1 = round(0.82 * s)
        bar_h = max(1, round(0.14 * s))
        bar_w = max(1, round(0.14 * s))
        # Vertikale Säule
        draw.rectangle([(x0, y0), (x0 + bar_w - 1, y1 - 1)], fill=NAVY)
        # Top-Balken
        draw.rectangle([(x0, y0), (x1 - 1, y0 + bar_h - 1)], fill=NAVY)
        # Mittelbalken (leicht kürzer, KEIN Unterbalken – das unterscheidet F von E)
        y_mid_center = (y0 + y1) // 2
        y_mid_top = y_mid_center - bar_h // 2
        draw.rectangle([(x0, y_mid_top), (x_mid - 1, y_mid_top + bar_h - 1)], fill=NAVY)
        return img
    # High-res Basis-Rendering + Downsampling
    hi = Image.new("RGBA", (BASE, BASE), (0, 0, 0, 0))
    d = ImageDraw.Draw(hi)
    radius = int(BASE * 0.14)
    d.rounded_rectangle([(0, 0), (BASE - 1, BASE - 1)], radius=radius, fill=WHITE)
    x0 = int(BASE * 0.22)
    x1 = int(BASE * 0.78)
    x_mid = int(BASE * 0.65)
    y0 = int(BASE * 0.18)
    y1 = int(BASE * 0.82)
    bar_h = int(BASE * 0.14)
    bar_w = int(BASE * 0.14)
    d.rectangle([(x0, y0), (x0 + bar_w, y1)], fill=NAVY)
    d.rectangle([(x0, y0), (x1, y0 + bar_h)], fill=NAVY)
    y_mid_center = (y0 + y1) // 2
    y_mid_top = y_mid_center - bar_h // 2
    d.rectangle([(x0, y_mid_top), (x_mid, y_mid_top + bar_h)], fill=NAVY)
    return hi.resize((size, size), Image.LANCZOS)


def main() -> None:
    for size, name in [(16, "favicon-16x16.png"), (32, "favicon-32x32.png"), (180, "apple-touch-icon.png")]:
        img = _draw_f(size)
        img.save(os.path.join(HERE, name), format="PNG", optimize=True)
        print(f"wrote {name} ({size}×{size})")
    ico_source = _draw_f(64)
    ico_source.save(
        os.path.join(HERE, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    print("wrote favicon.ico (16/32/48 multi-size)")


if __name__ == "__main__":
    main()
