"""Geolite - Los tres cubiletes (maqueta): utilidades de dibujo pixel art, mismo metodo que tools/barra_px:
mascaras + rampas de 3-4 tonos sobre la rejilla nativa y contorno indigo de 1 px por fuera (grid.outline_pp)."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "barra_px"))
sys.path.insert(0, str(HERE.parent.parent))
from grid import outline_pp          # contorno indigo de 1 px
from pxkit import shift

def hexc(s):
    s = s.lstrip("#"); return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))

# paleta del juego (muestreada de bet_coin, bet_red, bet_wheel y dealer_neutral)
INK = hexc("1d0a3d")
GOLD = [hexc(c) for c in ("fff6c8", "ffd95a", "fcc440", "f5a623", "de881e", "c46a1b", "a05018", "7f3a1a")]   # 0 brillo ... 7 sombra
RED = [hexc(c) for c in ("ff6470", "e8283a", "a8142e", "6e1030")]                                         # luz, base, sombra, fondo
WHITE = [hexc(c) for c in ("ffffff", "d6ceee", "a092ce", "704aa8")]
NAVY = [hexc(c) for c in ("4e2a85", "39137f", "230361", "0a0048")]
PLUM = [hexc(c) for c in ("8a3ae0", "56208f")]

class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.rgb = np.zeros((h, w, 3), np.uint8); self.m = np.zeros((h, w), bool)
        self.yy, self.xx = np.mgrid[0:h, 0:w]
    def paint(self, mask, color):
        self.rgb[mask] = color; self.m |= mask
    def put(self, x, y, color):
        if 0 <= x < self.w and 0 <= y < self.h: self.rgb[y, x] = color; self.m[y, x] = True
    def ell(self, cx, cy, rx, ry):
        return ((self.xx + .5 - cx) / rx) ** 2 + ((self.yy + .5 - cy) / ry) ** 2 <= 1.0
    def finish(self, outline=True, margin=1):
        if outline:
            # un pixel de margen para que quepa el contorno (los cubiletes grandes ya traen el suyo: margin=0)
            rgb = np.pad(self.rgb, ((margin, margin), (margin, margin), (0, 0))); m = np.pad(self.m, margin)
            return outline_pp(rgb, m)
        out = np.zeros((self.h, self.w, 4), np.uint8); out[self.m, :3] = self.rgb[self.m]; out[self.m, 3] = 255; return out

def pad(a, n):
    return np.pad(a, ((n, n), (n, n), (0, 0)))

def save(a, path):
    Image.fromarray(a, "RGBA").save(path)

def zoom_sheet(arrs, path, k=12, bg=(40, 34, 70), cols=4, grid=True):
    ims = [Image.fromarray(a, "RGBA") for a in arrs]
    cw = max(i.width for i in ims) * k + 24; ch = max(i.height for i in ims) * k + 24
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGBA", (cw * min(cols, len(ims)), ch * rows), bg + (255,))
    for n, im in enumerate(ims):
        z = im.resize((im.width * k, im.height * k), Image.NEAREST)
        sheet.alpha_composite(z, ((n % cols) * cw + 12, (n // cols) * ch + 12))
    sheet.convert("RGB").save(path)
