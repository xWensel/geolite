"""Rasca y gana - primitivas de dibujo pixel art (mismo metodo que el trile: mascaras + rampas de 3-4 tonos, luz arriba-izquierda,
contorno indigo de 1 px por fuera con pix.Canvas.finish). Todos los simbolos se dibujan en un lienzo de 22x22 y salen de 24x24."""
import sys
from pathlib import Path
import numpy as np
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "trile"))
from pix import *          # Canvas, hexc, INK, GOLD, RED, WHITE, NAVY, PLUM, save, zoom_sheet
HERE = Path(__file__).resolve().parent     # (pix.py tambien define HERE: el nuestro va despues)

S = 22
def cv(w=S, h=S): return Canvas(w, h)
def rh(*hs): return [hexc(h) for h in hs]

RAMP = dict(
    gold=[GOLD[1], GOLD[3], GOLD[5], GOLD[6]], red=list(RED), white=list(WHITE),
    hat=rh("8c66e6", "5e34b8", "44208e", "2a1062"),
    blue=rh("8fd4ff", "3f9af0", "2160c8", "143a8c"), green=rh("b8f090", "5cc84a", "2a8a3a", "14582c"),
    teal=rh("a8fff0", "3cd0c0", "1a9a9c", "0f6468"), purple=rh("d0aaff", "9460e8", "6034b8", "3a1c80"),
    rose=rh("ffd0e0", "f488ac", "d04a80", "8a2858"), orange=rh("ffe0a0", "f8a03c", "d0601e", "8a3010"),
    steel=rh("f4f4ff", "b8bcdc", "848cb4", "505a88"), wood=rh("d8a068", "a86a38", "7a4424", "4a2812"),
    stone=rh("f8eed8", "d8c49e", "a89070", "6e5a40"), grey=rh("e0dce4", "b0acc0", "7c788c", "4a4660"),
    ink=rh("8a8aa8", "565678", "38385a", "24243e"), yellow=rh("fff6a0", "ffe040", "e8b020", "b07418"),
    pearl=rh("ffffff", "f8e8f0", "dcbcd2", "a8809e"), sand=rh("ffe8b0", "e8c070", "c08c40", "84582a"),
    iron=rh("e0b888", "a87c50", "70502e", "48301a"),
)

def pm(c, pts):
    """mascara de poligono (regla par-impar, evaluada en el centro de cada pixel: simetrica y sin sorpresas)"""
    x = c.xx + .5; y = c.yy + .5; inside = np.zeros((c.h, c.w), bool); n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % n]
        if y1 == y2: continue
        cond = ((y1 <= y) & (y < y2)) | ((y2 <= y) & (y < y1))
        xi = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
        inside ^= cond & (x < xi)
    return inside

def seg(c, p0, p1, w):
    x = c.xx + .5; y = c.yy + .5; (x0, y0), (x1, y1) = p0, p1; dx, dy = x1 - x0, y1 - y0; L2 = dx * dx + dy * dy
    t = np.clip(((x - x0) * dx + (y - y0) * dy) / L2, 0, 1)
    return np.hypot(x - (x0 + t * dx), y - (y0 + t * dy)) <= w / 2

def seg_tone(c, p0, p1, w, ramp, thr=(-0.45, 0.15, 0.6)):
    """tubo con luz arriba-izquierda: el tono depende de la distancia firmada al eje"""
    x = c.xx + .5; y = c.yy + .5; (x0, y0), (x1, y1) = p0, p1; dx, dy = x1 - x0, y1 - y0; L = (dx * dx + dy * dy) ** .5
    sd = ((x - x0) * (-dy) + (y - y0) * dx) / L
    if (-dy / L) * -1 + (dx / L) * -1 > 0: sd = -sd          # que lo negativo apunte a la luz
    m = seg(c, p0, p1, w); s = sd / (w / 2) + 0.07 * (((c.xx + c.yy) % 2) * 2 - 1)
    idx = sum((s >= t).astype(int) for t in thr)
    for i, col in enumerate(ramp): c.paint(m & (idx == i), col)
    return m

def tone(c, mask, ramp, cx, cy, sx, sy, thr=(-0.5, 0.0, 0.5), dith=0.05):
    s = (c.xx + .5 - cx) / sx + (c.yy + .5 - cy) / sy + dith * (((c.xx + c.yy) % 2) * 2 - 1)
    idx = sum((s >= t).astype(int) for t in thr)
    for i, col in enumerate(ramp): c.paint(mask & (idx == i), col)
    return s

def hband(c, mask, ramp, x0, x1, thr=(0.28, 0.55, 0.82), dith=0.04):
    """tono segun la posicion horizontal (cilindros): luz a la izquierda"""
    u = (c.xx + .5 - x0) / (x1 - x0) + dith * (((c.xx + c.yy) % 2) * 2 - 1)
    idx = sum((u >= t).astype(int) for t in thr)
    for i, col in enumerate(ramp): c.paint(mask & (idx == i), col)

def ball(c, cx, cy, rx, ry, ramp, spec=True, hi=None):
    m = c.ell(cx, cy, rx, ry)
    tone(c, m, ramp, cx - rx * 0.15, cy - ry * 0.15, rx * 1.35, ry * 1.35, thr=(-0.42, 0.02, 0.5))
    if spec: c.put(int(cx - rx * 0.42), int(cy - ry * 0.48), hi or ramp[0]); c.put(int(cx - rx * 0.42) + 1, int(cy - ry * 0.48), hi or ramp[0])
    return m

def lighten(col, k):
    return tuple(int(max(0, min(255, v * k))) for v in col)

def px_rows(rows, pal, margin=1):
    """sprite ASCII (la mano alzada para lo que no se deja escribir con formulas)"""
    h, w = len(rows), max(len(r) for r in rows); c = Canvas(w, h)
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch != "." and ch != " ": c.put(i, j, pal[ch])
    return c

def fin(c): return c.finish(margin=1)
