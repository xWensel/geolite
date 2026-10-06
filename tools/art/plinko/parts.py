"""Lluvia de fichas - piezas pequenas en pixel art: la ficha (doblon a escala pequena, 12 fotogramas de giro), las clavijas (3 estados), el aro de luz del golpe,
la estela y la flecha de la tolva. Mismo metodo que el trile: mascaras + rampas de 3-4 tonos sobre la rejilla nativa y contorno indigo de 1 px (pix.Canvas.finish)."""
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "trile"))
import numpy as np
from pix import *
HERE = Path(__file__).resolve().parent      # (pix.py define su propio HERE: el del trile; el de esta carpeta va despues)

D = 10                                    # diametro de la ficha (12 con el contorno)

def _disc():
    return Canvas(D, D).ell(D / 2, D / 2, D / 2, D / 2)

def _face(side):
    """cara de la doblon a 10x10: aro con luz arriba-izquierda y emblema (A: el sombrero del crupier; B: la estrella de la brujula)"""
    c = Canvas(D, D); xx, yy = c.xx + .5 - D / 2, c.yy + .5 - D / 2
    disc = c.ell(D / 2, D / 2, D / 2, D / 2); inner = c.ell(D / 2, D / 2, D / 2 - 1.05, D / 2 - 1.05); ring = disc & ~inner
    c.paint(disc, GOLD[2])
    c.paint(inner & ((xx + yy) < -2.2), GOLD[1])                      # luz del cuerpo
    c.paint(inner & ((xx + yy) > 3.6), GOLD[3])                       # sombra del cuerpo
    c.paint(ring, GOLD[1]); c.paint(ring & ((xx + yy) < -2.4), GOLD[0]); c.paint(ring & ((xx + yy) > 2.6), GOLD[4]); c.paint(ring & ((xx + yy) > 4.6), GOLD[5])
    em = {"A": ["..kkkk..", "..kkkk..", ".kkkkkk.", "..eFFe..", "..FmmF..", "...FF..."],
          "B": ["...ww...", "...ww...", ".wwwWww.", "..wWWww.", "...ww...", "...ww..."]}[side]
    col = {"k": GOLD[5], "e": GOLD[7], "F": GOLD[1], "m": GOLD[6], "w": GOLD[0], "W": (255, 255, 255)}
    for j, row in enumerate(em):
        for i, ch in enumerate(row):
            if ch != "." and inner[2 + j, 1 + i]: c.put(1 + i, 2 + j, col[ch])
    return c.rgb.copy(), c.m.copy()

TEX = {s: _face(s) for s in "AB"}

def chip_frame(k, n=12):
    """doblon girando sobre un eje horizontal (como coin_spin.webp): cara A -> canto con cordoncillo -> cara B -> canto"""
    th = 2 * np.pi * k / n; ct, st = np.cos(th), abs(np.sin(th))
    rgb, m = TEX["A" if ct >= 0 else "B"]
    s = abs(ct); h = max(2, int(round(D * s))); t = int(round(2.0 * st)) if k % n else 0
    if s < 0.2: h, t = 2, 2                                               # de canto: dos filas de cuerpo y el cordoncillo
    c = Canvas(D, D); y0 = (D - (h + t)) // 2
    for i in range(h):
        src = min(D - 1, int((i + 0.5) / h * D))
        for x in range(D):
            if m[src, x]: c.put(x, y0 + i, rgb[src, x] if s >= 0.2 else (GOLD[3] if i == 0 else GOLD[5]))
    for x in range(D):                                                      # el canto: bajo el ultimo pixel de cada columna, t filas de cordoncillo
        col = np.where(c.m[:, x])[0]
        if len(col):
            yb = col.max()
            for j in range(1, t + 1): c.put(x, yb + j, (GOLD[4] if (x + j) % 2 == 0 else GOLD[6]) if j > 1 or s < 0.2 else (GOLD[3] if x % 2 == 0 else GOLD[5]))
    return c.finish()

def chip_sheet(n=12):
    return np.concatenate([chip_frame(k, n) for k in range(n)], axis=1)

PEG_ROWS = ["..HL..", ".HLBB.", "HLBBSS", "LBBSSD", ".BSSD.", "..SD.."]

def peg(pal):
    c = Canvas(6, 6)
    col = dict(zip("HLBSD", pal))
    for j, r in enumerate(PEG_ROWS):
        for i, ch in enumerate(r):
            if ch != ".": c.put(i, j, col[ch])
    return c.finish()

def mix(a, b, t):
    return tuple(int(round(x + (y - x) * t)) for x, y in zip(a, b))

def peg_sheet(pal, glow):
    """3 estados: reposo, calentando, encendida (blanco-calido con el tono de la mesa)"""
    warm = [mix(c, glow, .55) for c in pal]; hot = [(255, 255, 255), (255, 255, 255), mix(glow, (255, 255, 255), .55), glow, mix(glow, pal[3], .35)]
    return np.concatenate([peg(pal), peg(warm), peg(hot)], axis=1)

def halo_sheet(glow, n=3):
    """aro de luz que se abre alrededor de la clavija al ser golpeada (3 fotogramas: 6, 9 y 12 de radio)"""
    S = 28; out = np.zeros((S, S * n, 4), np.uint8); yy, xx = np.mgrid[0:S, 0:S]
    for k, (r, a) in enumerate(((6.0, 255), (9.2, 205), (12.4, 130))):
        d = np.sqrt((xx + .5 - S / 2) ** 2 + (yy + .5 - S / 2) ** 2); ring = np.abs(d - r) < 0.62; fill = (d < r) & (((xx + yy) % 2) == 0) & (k < 2)
        sub = out[:, k * S:(k + 1) * S]
        sub[fill] = (*glow, 52); sub[ring] = (*mix(glow, (255, 255, 255), .5), a)
    return out

def trail_sheet(glow):
    """estela de luz: puntos redondos de 6, 4 y 2 px (nucleo claro, borde del color de la mesa)"""
    out = np.zeros((6, 18, 4), np.uint8)
    for k, dm in enumerate((6, 4, 2)):
        c = Canvas(6, 6); m = c.ell(3, 3, dm / 2, dm / 2); c.paint(m, glow); c.paint(c.ell(3, 3, max(.6, dm / 2 - 1.2), max(.6, dm / 2 - 1.2)), mix(glow, (255, 255, 255), .7))
        sub = out[:, k * 6:(k + 1) * 6]; sub[c.m, :3] = c.rgb[c.m]; sub[c.m, 3] = 255
    return out

def arrow(lit):
    """flecha de la tolva (9x6): dorada apagada / blanca encendida"""
    rows = ["HHHHHHH", ".LLLLL.", ".BBBBB.", "..BBB..", "...S...", "......."][:5]
    pal = {"H": GOLD[0] if lit else GOLD[3], "L": GOLD[1] if lit else GOLD[4], "B": GOLD[2] if lit else GOLD[5], "S": GOLD[3] if lit else GOLD[6]}
    c = Canvas(7, 5)
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch != ".": c.put(i, j, pal[ch])
    return c.finish()

def shadow_chip(w=12, h=4):
    c = Canvas(w, h); out = np.zeros((h, w, 4), np.uint8); e = c.ell(w / 2, h / 2, w / 2, h / 2)
    out[e & ((c.xx + c.yy) % 2 == 0)] = (8, 0, 24, 120); out[e & ((c.xx + c.yy) % 2 == 1)] = (8, 0, 24, 70); return out

if __name__ == "__main__":
    fr = [chip_frame(k) for k in range(12)]
    zoom_sheet(fr, HERE / "out" / "zoom_chip.png", k=10, cols=6)
    print("ok", fr[0].shape)
