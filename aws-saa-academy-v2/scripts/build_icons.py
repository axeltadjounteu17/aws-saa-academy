#!/usr/bin/env python3
"""Génère les icônes du site (onglet, PWA, Apple, réseaux sociaux) depuis des SVG sources.

Le dessin n'utilise que des formes géométriques (aucune police) pour un rendu identique partout.
Usage : python3 scripts/build_icons.py
"""

from __future__ import annotations

import io
from pathlib import Path

import cairosvg
from PIL import Image

PUBLIC = Path(__file__).resolve().parents[1] / "public"
INK = "#232F3E"      # bleu nuit AWS
ORANGE = "#FF9900"   # orange AWS

# Nuage orange avec coche blanche : « cloud » + « certification réussie ».
GLYPH = f"""
  <g fill="{ORANGE}">
    <circle cx="24" cy="33" r="10"/>
    <circle cx="35" cy="27" r="13"/>
    <circle cx="45" cy="35" r="8.5"/>
    <rect x="14" y="33" width="39" height="11.5" rx="5.75"/>
  </g>
  <path d="M25.5 35.5 L31 41 L41.5 30.5" fill="none" stroke="#FFFFFF" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
"""

FAVICON = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <title>AWS SAA Academy</title>
  <rect width="64" height="64" rx="14" fill="{INK}"/>
  <g transform="translate(-1.75 2.75)">{GLYPH}</g>
</svg>
"""

# Icône « maskable » : fond plein bord à bord, motif réduit dans la zone sûre (80 %).
MASKABLE = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="{INK}"/>
  <g transform="translate(8.4 11.5) scale(0.7)">{GLYPH}</g>
</svg>
"""

OG_IMAGE = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#09090b"/>
  <rect x="80" y="155" width="320" height="320" rx="70" fill="{INK}"/>
  <g transform="translate(71 169) scale(5)">{GLYPH}</g>
  <text x="460" y="285" font-family="DejaVu Sans, Arial, sans-serif" font-size="68" font-weight="bold" fill="#FFFFFF">AWS SAA Academy</text>
  <text x="460" y="365" font-family="DejaVu Sans, Arial, sans-serif" font-size="40" fill="{ORANGE}">Préparation SAA-C03 · FR / EN</text>
  <text x="460" y="430" font-family="DejaVu Sans, Arial, sans-serif" font-size="30" fill="#a1a1aa">41 cours · 130 labs · 895 questions</text>
</svg>
"""


def png(svg: str, size: int | tuple[int, int]) -> bytes:
    width, height = (size, size) if isinstance(size, int) else size
    return cairosvg.svg2png(bytestring=svg.encode("utf-8"), output_width=width, output_height=height)


def write(path: Path, data: bytes | str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data, str):
        path.write_text(data, encoding="utf-8")
    else:
        path.write_bytes(data)
    print(f"✓ {path.relative_to(PUBLIC.parent)}")


def main() -> None:
    write(PUBLIC / "favicon.svg", FAVICON)
    # favicon.ico multi-tailles pour les navigateurs sans support SVG.
    base = Image.open(io.BytesIO(png(FAVICON, 256))).convert("RGBA")
    buffer = io.BytesIO()
    base.save(buffer, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    write(PUBLIC / "favicon.ico", buffer.getvalue())
    write(PUBLIC / "apple-touch-icon.png", png(MASKABLE, 180))
    write(PUBLIC / "icons" / "icon-192.png", png(FAVICON, 192))
    write(PUBLIC / "icons" / "icon-512.png", png(FAVICON, 512))
    write(PUBLIC / "icons" / "maskable-512.png", png(MASKABLE, 512))
    write(PUBLIC / "og-image.png", png(OG_IMAGE, (1200, 630)))


if __name__ == "__main__":
    main()
