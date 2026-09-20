#!/usr/bin/env python3
"""Render assets/og-image.png — the 1200x630 card every share of masa.life
renders as.

Run from the repo root:

    pip install Pillow fonttools brotli
    python3 scripts/make-og-image.py

It builds the card from the page's own brand tokens and the same self-hosted
faces `index.html` loads, so the preview and the page cannot drift apart. The
woff2 files are unpacked to TrueType in a temp directory because Pillow cannot
read woff2 directly; nothing new is committed to assets/fonts/.

If the hero copy in `index.html` changes, change HEAD_LINES here to match and
re-run — the card is not generated at request time.
"""
import tempfile
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
W, H = 1200, 630
SCALE = 2  # supersample, then downscale, so the serif stays clean

# Brand tokens, as README.md lists them.
MIST = (243, 239, 234)  # #F3EFEA Warm Mist
CARD = (250, 248, 245)  # #FAF8F5 panel
RULE = (217, 210, 199)  # #D9D2C7 hairline
SLATE = (74, 78, 90)  # #4A4E5A Slate Warm
INK = (47, 50, 59)  # #2f323b headings
BODY = (58, 58, 58)  # #3A3A3A body
MUTED = (100, 116, 139)  # #64748B secondary

HEAD_LINES = ["Built for her whole story —", "every season."]
SUB = "Cycles, fertility, pregnancy, postpartum, and the seasons in between."

FACES = [
    "cormorant-garamond-500-latin",
    "inter-400-latin",
    "inter-500-latin",
]


def unpack_fonts(dest):
    """woff2 -> ttf, since Pillow reads only the latter."""
    for name in FACES:
        f = TTFont(ROOT / "assets" / "fonts" / f"{name}.woff2")
        f.flavor = None
        f.save(dest / f"{name}.ttf")


def main():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        unpack_fonts(tmp)

        def font(name, size):
            return ImageFont.truetype(str(tmp / f"{name}.ttf"), size * SCALE)

        def px(v):
            return v * SCALE

        img = Image.new("RGB", (px(W), px(H)), MIST)
        d = ImageDraw.Draw(img)

        # Inset panel, echoing the page's #FAF8F5 sections on Warm Mist.
        d.rounded_rectangle(
            [px(40), px(40), px(W - 40), px(H - 40)],
            radius=px(28), fill=CARD, outline=RULE, width=px(1),
        )

        icon = Image.open(ROOT / "assets" / "masa-icon.png").convert("RGBA")
        icon = icon.resize((px(92), px(92)), Image.LANCZOS)
        img.paste(icon, (px(W // 2) - px(46), px(84)), icon)

        def centre(text, f, y, fill, tracking=0):
            """Centred on W/2, with optional letter tracking in CSS px."""
            if tracking:
                widths = [d.textlength(ch, font=f) for ch in text]
                total = sum(widths) + tracking * SCALE * (len(text) - 1)
                x = px(W // 2) - total / 2
                for ch, w in zip(text, widths):
                    d.text((x, y), ch, font=f, fill=fill)
                    x += w + tracking * SCALE
                return
            w = d.textlength(text, font=f)
            d.text((px(W // 2) - w / 2, y), text, font=f, fill=fill)

        # Wordmark and tagline, set as the nav sets them.
        centre("MASA", font("cormorant-garamond-500-latin", 46), px(196), SLATE, tracking=14)
        centre("EVERY SEASON YOURS", font("inter-400-latin", 13), px(262), MUTED, tracking=4)

        d.line([px(540), px(300), px(660), px(300)], fill=RULE, width=px(1))

        head = font("cormorant-garamond-500-latin", 54)
        for i, line in enumerate(HEAD_LINES):
            centre(line, head, px(330 + i * 70), INK)

        centre(SUB, font("inter-400-latin", 19), px(486), BODY)
        centre("masa.life", font("inter-500-latin", 17), px(536), MUTED, tracking=1)

        img = img.resize((W, H), Image.LANCZOS)

        # Flat colour and two faces: a 192-entry palette is indistinguishable
        # from truecolour here and about a quarter of the bytes.
        img = img.quantize(colors=192, method=Image.MEDIANCUT, dither=Image.Dither.NONE)

        out = ROOT / "assets" / "og-image.png"
        img.save(out, optimize=True)
        print(f"{out.relative_to(ROOT)} — {out.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
