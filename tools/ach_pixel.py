#!/usr/bin/env python3
"""Geolite - ilustraciones de los logros a pixel art de verdad (solo desarrollo).

Las 100 ilustraciones (tools/gen_art.py) salian suaves a 256 px, sin rejilla. Aqui se bajan a una rejilla nativa de
48 px, que es EXACTAMENTE el pixel de la ficha de la insignia: la ficha mide 64 px nativos y la ilustracion ocupa el 75 %
(css/premium.css .ic.badge .bd-in, tools/steam_icons.py), asi que ficha e ilustracion comparten tamano de pixel y
rejilla. Despues pasa el acabado de tools/pixel_cleanup.py (paleta sin medios tonos, sin motas, contorno indigo de 1 px).

Fuente: tools/art/ach_src/ach_<id>.webp (las ilustraciones suaves originales; nunca se pisan).
  python tools/ach_pixel.py [ids...] [--preview hoja.png]     -> assets/icons/ach_<id>.webp (48 px x 8 = 384)
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, str(Path(__file__).parent))
from pxkit import ROOT, dilate
from pixel_cleanup import merge_palette, despeckle_colors, reoutline

SRC = ROOT / "tools" / "art" / "ach_src"; OUT = ROOT / "assets" / "icons"
NAT, K = 48, 8
KEEP_SRC = 450                       # piezas sueltas de menos pixeles (a 256 px) = destellos, rayitos y motas: fuera
KEEP = {"adv_score100k": 150,        # aqui las piezas pequenas son monedas que saltan de la tragaperras
        "classic_gold1": 1300}       # destello grande junto a la medalla
FILL = {"adv_clear1", "classic_clues", "adv_flawless2", "adv_flawless3", "adv_rich2", "adv_wins10"}   # el recorte del magenta se comio sus partes oscuras (rayas de la carpa, sombreros, grietas, traje): se rellenan
FILL_C = (48, 18, 82)
KEEP48 = {"adv_clear1": 40,         # la banderita de la carpa pierde el mastil al reducir y se queda flotando
          "adv_score100k": 12}      # sus monedas al vuelo son pequenas

def holes(m):
    """huecos cerrados de la silueta (lo transparente que no toca el borde)"""
    out = ~m; h, w = m.shape; st = [(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)]
    seen = np.zeros_like(m)
    while st:
        y, x = st.pop()
        if not (0 <= y < h and 0 <= x < w) or seen[y, x] or m[y, x]: continue
        seen[y, x] = True; st += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return out & ~seen

def islands(m, keep=16):
    """fuera las motas sueltas (destellos, puntitos) de menos de `keep` pixeles: a 48 px quedan como pixeles tontos"""
    h, w = m.shape; seen = np.zeros_like(m); out = m.copy(); comps = []
    for y0, x0 in zip(*np.where(m)):
        if seen[y0, x0]: continue
        st = [(y0, x0)]; seen[y0, x0] = True; c = []
        while st:
            y, x = st.pop(); c.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; st.append((yy, xx))
        comps.append(c)
    big = max(len(c) for c in comps)
    for c in comps:
        if len(c) < keep and len(c) < big:
            for y, x in c: out[y, x] = False
    return out

def pixel(src, keep=KEEP_SRC, fill=False, keep48=18):
    im = Image.open(src).convert("RGBA")
    al_ = np.array(im.getchannel("A")); m0 = islands(al_ >= 128, keep)          # destellos fuera en la fuente, donde aun van sueltos
    al_[~dilate(m0, 2, cross=False)] = 0; im.putalpha(Image.fromarray(al_))
    rgb = im.convert("RGB").filter(ImageFilter.UnsharpMask(radius=2, percent=120, threshold=0)); rgb.putalpha(im.getchannel("A"))
    a = np.array(rgb).astype(float); al = a[..., 3:] / 255                    # media con alfa premultiplicado: sin halo oscuro
    pm = Image.fromarray(np.dstack([a[..., :3] * al, a[..., 3:]]).astype(np.uint8), "RGBA").resize((NAT, NAT), Image.BOX)
    p = np.array(pm).astype(float); m = islands(p[..., 3] >= 118, keep48)        # y las que se rompen al reducir
    rgb = np.clip(p[..., :3] / np.maximum(p[..., 3:] / 255, 1e-3), 0, 255).astype(np.uint8)
    if fill: hl = holes(m); rgb[hl] = FILL_C; m = m | hl
    pal = Image.fromarray(rgb[m].reshape(1, -1, 3), "RGB").quantize(colors=32, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    rgb = np.array(Image.fromarray(rgb, "RGB").quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB"))
    rgb, _ = merge_palette(rgb, m, 14)
    rgb = despeckle_colors(rgb, m, 48)
    out = reoutline(rgb, m)
    out[~islands(out[..., 3] > 0, keep48)] = 0                                 # lo que el contorno nuevo deja suelto (un mastil fino que desaparece)
    return out

def build(ids):
    for id in ids:
        out = pixel(SRC / f"ach_{id}.webp", KEEP.get(id, KEEP_SRC), id in FILL, KEEP48.get(id, 18))
        Image.fromarray(out, "RGBA").resize((NAT * K, NAT * K), Image.NEAREST).save(OUT / f"ach_{id}.webp", "WEBP", lossless=True, method=6)
    return ids

def preview(ids, path):
    """antes (suave) / despues (pixel) / insignia a 64 px nativos x2, como en el Perfil"""
    sys.path.insert(0, str(Path(__file__).parent)); c = 140; cols = 4; rows = (len(ids) + cols - 1) // cols
    sh = Image.new("RGBA", (cols * c * 3, rows * c), (30, 40, 34, 255))
    for i, id in enumerate(ids):
        x0 = (i % cols) * c * 3; y0 = (i // cols) * c
        sh.alpha_composite(Image.open(SRC / f"ach_{id}.webp").convert("RGBA").resize((128, 128), Image.LANCZOS), (x0 + 4, y0 + 6))
        now = Image.open(OUT / f"ach_{id}.webp").convert("RGBA"); sh.alpha_composite(now.resize((128, 128), Image.NEAREST), (x0 + c + 4, y0 + 6))
        b = Image.open(OUT / "blank_big.webp").convert("RGBA").resize((64, 64), Image.NEAREST)
        b.alpha_composite(now.resize((48, 48), Image.NEAREST), (8, 8))
        sh.alpha_composite(b.resize((128, 128), Image.NEAREST), (x0 + 2 * c + 4, y0 + 6))
    sh.save(path)

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--") and not a.endswith(".png")]
    ids = args or sorted(p.stem[4:] for p in SRC.glob("ach_*.webp"))
    build(ids); print(len(ids), "ilustraciones de logro pixeladas")
    if "--preview" in sys.argv: preview(ids, sys.argv[sys.argv.index("--preview") + 1])
