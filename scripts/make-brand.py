"""Generates the Classcribe logo, app icons and README artwork.

The mark is a ring of 20 dots around a solid core: a record button drawn in the
dot-matrix style used across the app.

    python scripts/make-brand.py
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
INK = (11, 11, 11, 255)
PAPER = (246, 246, 244, 255)
WHITE = (243, 243, 241, 255)
FONT = ROOT / "node_modules/@expo-google-fonts/geist/500Medium/Geist_500Medium.ttf"
SS = 4  # supersampling for smooth circles


def mark(size: int, color, bg=(0, 0, 0, 0), scale: float = 1.0) -> Image.Image:
    """the dot ring + core, centred, `scale` = share of the canvas the ring spans"""
    S = size * SS
    im = Image.new("RGBA", (S, S), bg)
    d = ImageDraw.Draw(im)
    c = S / 2
    ring = S * 0.40 * scale  # radius of the ring of dots
    dot = S * 0.034 * scale
    core = S * 0.16 * scale
    for i in range(20):
        a = i / 20 * math.tau
        x, y = c + math.cos(a) * ring, c + math.sin(a) * ring
        d.ellipse([x - dot, y - dot, x + dot, y + dot], fill=color)
    d.ellipse([c - core, c - core, c + core, c + core], fill=color)
    return im.resize((size, size), Image.LANCZOS)


def lockup(fg, bg, path: Path, height=220):
    """mark + wordmark, for the README header"""
    font = ImageFont.truetype(str(FONT), int(height * 0.62 * SS))
    word = "Classcribe"
    tmp = Image.new("RGBA", (10, 10))
    l, t, r, b = ImageDraw.Draw(tmp).textbbox((0, 0), word, font=font)
    H = height * SS
    m = mark(height, fg, scale=0.92).resize((H, H), Image.LANCZOS)
    gap = int(H * 0.28)
    W = H + gap + (r - l) + int(H * 0.1)
    im = Image.new("RGBA", (W, H), bg)
    im.alpha_composite(m, (0, 0))
    d = ImageDraw.Draw(im)
    # optical tracking: draw letter by letter, slightly tighter than default
    x = H + gap
    y = (H - (b - t)) / 2 - t
    for ch in word:
        d.text((x, y), ch, font=font, fill=fg)
        x += d.textlength(ch, font=font) - H * 0.012
    im = im.crop((0, 0, int(x + H * 0.05), H))
    im = im.resize((im.width // SS, im.height // SS), Image.LANCZOS)
    im.save(path)


def main():
    assets = ROOT / "assets"
    docs = ROOT / "docs"
    docs.mkdir(exist_ok=True)

    # app icon: white mark on ink
    icon = mark(1024, WHITE, bg=INK, scale=0.82)
    icon.convert("RGB").save(assets / "icon.png")
    # android adaptive icon: foreground mark inside the safe zone, flat ink background
    mark(512, WHITE, scale=0.56).save(assets / "android-icon-foreground.png")
    Image.new("RGBA", (512, 512), INK).save(assets / "android-icon-background.png")
    mark(432, (255, 255, 255, 255), scale=0.6).save(assets / "android-icon-monochrome.png")
    # splash: white mark, the splash background is ink
    mark(1024, WHITE, scale=0.9).save(assets / "splash-icon.png")
    mark(48, WHITE, bg=INK, scale=0.84).save(assets / "favicon.png")

    # readme artwork
    lockup(INK[:3] + (255,), (0, 0, 0, 0), docs / "logo-light.png")
    lockup(WHITE, (0, 0, 0, 0), docs / "logo-dark.png")
    mark(256, WHITE, bg=INK, scale=0.82).save(docs / "icon.png")


if __name__ == "__main__":
    main()
