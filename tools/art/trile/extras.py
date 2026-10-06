"""Piezas sueltas de Los tres cubiletes: icono de la carta (bet_cups, rejilla de 48 px como los demas), doblon plano, fieltro y cenefa."""
import numpy as np
from pix import *
from cup import cup
from PIL import Image

def padded(a, n):
    return np.pad(a, ((n, n), (n, n), (0, 0)))

def mini_cup(f=0.30):
    """el cubilete a escala pequena (sin pespuntes ni incrustacion): se redibuja entero, no se reduce"""
    return cup(f, detail=False)

COIN_ROWS = ["....hhhhhhh....", "..hhccchccccg..", ".hcccchhhcccgg.", "hccccccheccccga", "hhcccccccccccga", "cgggggggggggaaa", "hhcccccccccccga", "cgggggggggggaaa", ".aaaaaaaaaaaaa."]
COIN_PAL = {"h": hexc("fff3b0"), "c": hexc("fdd742"), "g": hexc("efa526"), "a": hexc("b8620c"), "e": hexc("b8620c")}

def coin_flat():
    """la doblon tumbada (la cara y el canto a franjas de las pilas de pz_monedas)"""
    rows = COIN_ROWS; w, h = len(rows[0]), len(rows)
    c = Canvas(w + 2, h + 2)
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch != ".": c.put(i + 1, j + 1, COIN_PAL[ch])
    return c.finish()

def paste(dst, src, x, y):
    h, w = src.shape[:2]
    for j in range(h):
        for i in range(w):
            if src[j, i, 3] and 0 <= y + j < dst.shape[0] and 0 <= x + i < dst.shape[1]: dst[y + j, x + i] = src[j, i]

def bet_cups_icon():
    """icono de la carta (48x48): dos cubiletes abajo, el del medio levantado y la doblon debajo"""
    icon = np.zeros((48, 48, 4), np.uint8)
    cupa = mini_cup(0.34); sh = np.zeros((6, 17, 4), np.uint8)
    cc = Canvas(17, 6); e = cc.ell(8.5, 3, 8, 2.4); sh[e] = (8, 0, 24, 255)
    ground = 40
    for cx in (8, 40):
        paste(icon, sh, cx - 8, ground - 2); paste(icon, cupa, cx - cupa.shape[1] // 2, ground - cupa.shape[0] + 1)
    mid = 24
    paste(icon, sh, mid - 8, ground - 2)
    paste(icon, coin_flat(), mid - 8, ground - 8)
    paste(icon, cupa, mid - cupa.shape[1] // 2, ground - cupa.shape[0] - 9)
    return icon

def slot_ring(w=58, h=18):
    """aro dorado grabado en el tapete (donde se asienta cada cubilete): 1 px de oro con luz arriba-izquierda y relleno de sombra suave"""
    c = Canvas(w, h); out = np.zeros((h, w, 4), np.uint8)
    cx, cy, rx, ry = w / 2, h / 2, w / 2 - 1, h / 2 - 1
    outer = c.ell(cx, cy, rx, ry); inner = c.ell(cx, cy, rx - 1.6, ry - 1.6); ring = outer & ~inner
    xx, yy = c.xx + .5, c.yy + .5
    lit = ((xx - cx) / rx + (yy - cy) / ry) < -0.25; dark = ((xx - cx) / rx + (yy - cy) / ry) > 0.55
    out[ring] = (*GOLD[3], 235); out[ring & lit] = (*GOLD[1], 245); out[ring & dark] = (*GOLD[5], 230)
    out[inner] = (20, 0, 10, 46)
    return out

def felt(n=32, seed=7):
    rng = np.random.default_rng(seed); out = np.zeros((n, n, 4), np.uint8)
    r = rng.random((n, n))
    out[r < 0.07] = (255, 235, 230, 16); out[(r >= 0.07) & (r < 0.16)] = (0, 0, 0, 30)
    return out

def cenefa(w=12, h=10):
    """cadena de rombos de oro (el ♦ del crupier) para el filete de la carta"""
    c = Canvas(w, h); cx, cy = 5.5, 4.5
    d = (np.abs(c.xx + .5 - cx - .5) / 3.4 + np.abs(c.yy + .5 - cy - .5) / 4.4) <= 1.0
    c.paint(d, GOLD[1]); c.paint(d & (c.xx >= 6), GOLD[3]); c.paint(d & (c.xx >= 6) & (c.yy >= 5), GOLD[5]); c.paint(d & (c.xx <= 4) & (c.yy <= 3), GOLD[0])
    for (x, y) in ((0, 4), (0, 5), (11, 4), (11, 5)): c.put(x, y, GOLD[5])
    return c.finish(outline=False)

if __name__ == "__main__":
    out = HERE / "out"
    icon = bet_cups_icon(); save(icon, out / "bet_cups.png")
    Image.fromarray(icon, "RGBA").resize((384, 384), Image.NEAREST).save(out / "bet_cups.webp", "WEBP", lossless=True, method=6)
    save(coin_flat(), out / "coin_flat.png"); save(felt(), out / "felt.png"); save(cenefa(), out / "cenefa.png")
    save(mini_cup(0.34), out / "cup_mini.png"); save(slot_ring(), out / "ring.png")
    zoom_sheet([icon, coin_flat(), mini_cup(0.34)], out / "zoom_extras.png", k=10, cols=3)
    print("ok", icon.shape)
