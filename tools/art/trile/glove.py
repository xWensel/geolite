"""Los guantes del crupier (flotan, sin brazo, como en los dibujos animados): blanco con sombra lavanda, puno de frac azul marino y un gemelo de oro.
Dos poses: GRAB (la mano agarra el cubilete por arriba) y OPEN (palma abierta: el 'ta-da' y el reposo)."""
import numpy as np
from pix import *

def sleeve(c, x0, x1, y0, y1):
    """manga del frac: 4 tonos con un pliegue"""
    xx, yy = c.xx, c.yy
    m = (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1); u = (xx - x0) / (x1 - x0)
    c.paint(m & (u < 0.18), NAVY[0]); c.paint(m & (u >= 0.18) & (u < 0.62), NAVY[1]); c.paint(m & (u >= 0.62) & (u < 0.9), NAVY[2]); c.paint(m & (u >= 0.9), NAVY[3])
    fold = m & (xx == int(x0 + (x1 - x0) * 0.40)) & (yy >= y0 + 2) & (yy < y1 - 2)
    c.paint(fold, NAVY[2])

def cuff(c, x0, x1, y0, h=4, link=True):
    xx, yy = c.xx, c.yy
    m = (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y0 + h)
    c.paint(m, WHITE[0]); c.paint(m & (xx >= x1 - 4), WHITE[1]); c.paint(m & (yy == y0 + h - 1), WHITE[1]); c.paint(m & (yy == y0 + h - 1) & (xx >= x1 - 4), WHITE[2])
    if link:
        lx = int(x1 - 6); c.put(lx, int(y0 + 1), GOLD[1]); c.put(lx + 1, int(y0 + 1), GOLD[3]); c.put(lx, int(y0 + 2), GOLD[3]); c.put(lx + 1, int(y0 + 2), GOLD[5])   # gemelo de oro

def shade_white(c, mask, cx, cy, sx, sy):
    """luz arriba-izquierda: blanco, lavanda y sombra honda"""
    xx, yy = c.xx + .5, c.yy + .5
    s = (xx - cx) / sx + (yy - cy) / sy
    ck = ((c.xx + c.yy) % 2) * 2 - 1
    s = s + 0.05 * ck
    c.paint(mask & (s < 0.95), WHITE[0]); c.paint(mask & (s >= 0.95) & (s < 1.6), WHITE[1]); c.paint(mask & (s >= 1.6), WHITE[2])

def glove_grab():
    W, H = 46, 50; c = Canvas(W, H); xx, yy = c.xx + .5, c.yy + .5
    sleeve(c, 13, 33, 0, 15); cuff(c, 11, 35, 15, 4)
    palm = c.ell(23, 28, 14.5, 10.5)
    fingers = np.zeros_like(palm)
    for cx in (12.2, 18.4, 24.6, 30.8): fingers |= c.ell(cx, 36.2, 3.55, 5.0)
    thumb = c.ell(8.2, 29.5, 4.4, 6.0)
    glove = palm | fingers | thumb
    shade_white(c, glove, 18, 25, 22, 14)
    # hendiduras entre los dedos y sombra bajo cada yema
    for x in (15, 21, 27):
        c.paint((c.xx == x) & (c.yy >= 33) & (c.yy <= 39) & glove, WHITE[2])
    for cx in (12.2, 18.4, 24.6, 30.8):
        c.paint(c.ell(cx, 36.2, 3.55, 5.0) & ~c.ell(cx, 35.2, 3.5, 4.6), WHITE[2])
    c.paint(thumb & ~c.ell(8.2, 28.6, 4.1, 5.5) & (xx > 7), WHITE[2])
    # las tres costuras del dorso (guante de dibujos animados)
    for x in (17, 23, 29): c.paint((c.xx == x) & (c.yy >= 20) & (c.yy <= 26), WHITE[2])
    return c.finish(margin=0)

def glove_open():
    W, H = 46, 62; c = Canvas(W, H); xx, yy = c.xx + .5, c.yy + .5
    sleeve(c, 13, 33, 48, 62); cuff(c, 11, 35, 44, 4, link=True)
    palm = c.ell(23, 36, 12.6, 10.4)
    glove = palm.copy()
    # cuatro dedos separados por una rendija de 1 px (el contorno la rellena de tinta); indice, corazon, anular, menique
    for x0, top in ((11, 14), (17, 10), (23, 13), (29, 19)):
        cap = c.ell(x0 + 2.5, top + 2.5, 2.6, 2.7)
        body = (c.xx >= x0) & (c.xx < x0 + 5) & (c.yy >= top + 2.5) & (c.yy < 36)
        glove |= cap | body
    thumb = c.ell(8.0, 37.5, 4.2, 6.6) | c.ell(5.6, 31.0, 3.0, 5.2)
    glove |= thumb
    shade_white(c, glove, 20, 28, 26, 22)
    # nudillos, pliegue de la palma y sombra de la base de los dedos
    for x0 in (11, 17, 23, 29): c.paint((c.xx == x0 + 4) & (c.yy >= 30) & (c.yy <= 33) & glove & (x0 + 4 < 33), WHITE[2])
    c.paint((c.yy == 40) & (c.xx >= 17) & (c.xx <= 26), WHITE[2]); c.paint((c.yy == 41) & (c.xx >= 14) & (c.xx <= 16), WHITE[2])
    c.paint(glove & (c.yy >= 43) & (c.xx > 14) & (c.xx < 32), WHITE[2])
    return c.finish(margin=0)

if __name__ == "__main__":
    a, b = glove_grab(), glove_open()
    save(a, HERE / "out" / "glove_grab.png"); save(b, HERE / "out" / "glove_open.png")
    zoom_sheet([a, b], HERE / "out" / "zoom_glove.png", k=12, cols=2)
    print(a.shape, b.shape)
