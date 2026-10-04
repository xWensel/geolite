"""La cara de la moneda: Don Crupier (dealer_neutral, pixel logico 64) acunado en oro.
Son SUS pixeles: se quita la mano con las cartas (la mejilla se completa con la otra), se acorta la copa de la chistera
para que quepa en el campo, y cada color del retrato pasa a su tono de la rampa del oro (oscuros = grabado, claros = brillo)."""
import numpy as np
from PIL import Image

DEEP=(96,40,22,255); BROWN=(127,58,26,255); RUST=(160,80,24,255); ORANGE=(196,106,27,255); AMBER=(222,136,30,255)
GOLD=(245,166,35,255); HONEY=(252,196,64,255); LIGHT=(255,217,90,255); CREAM=(255,246,200,255)
MAP = {
 (1,0,63): BROWN, (29,10,61): BROWN, (10,0,72): BROWN,          # contornos y bigote: el grabado
 (35,3,97): RUST, (45,19,100): RUST,                             # sombra de la chistera
 (57,19,127): ORANGE,                                            # chistera y bigote
 (78,42,133): AMBER, (112,74,168): AMBER,                        # raya de brillo de la chistera
 (205,7,37): AMBER, (255,28,36): GOLD,                           # cinta y pajarita
 (255,233,26): LIGHT, (255,212,73): HONEY, (255,168,73): AMBER, # antifaz
 (255,239,131): CREAM, (255,255,255): CREAM, (255,255,240): CREAM,
 (214,206,238): LIGHT, (160,146,206): HONEY,                     # camisa
 (255,202,177): HONEY, (236,150,138): AMBER, (255,112,104): AMBER,  # piel
}
CROP_COPA = range(8, 14)        # filas de la copa que se quitan (la chistera sigue entera, solo mas baja)


def portrait(root):
    a = np.array(Image.open(root + "/assets/icons/dealer_neutral.webp").convert("RGBA").resize((64, 64), Image.NEAREST))
    out = np.zeros_like(a)
    for y in range(64):
        for x in range(64):
            if a[y, x, 3]:
                out[y, x] = MAP[tuple(int(v) for v in a[y, x, :3])]
    # fuera la mano y las cartas (filas 35-44, a la izquierda de x=28); la mejilla izquierda se dibuja con el contorno
    # del lado derecho reflejado (x -> 70 - x): borde en 23, que se recoge hacia la barbilla
    out[35:45, :28] = 0
    out[35, 22:25] = BROWN
    edge = {36: 23, 37: 23, 38: 23, 39: 23, 40: 23, 41: 24, 42: 25, 43: 26}
    for y, e in edge.items():
        out[y, e] = BROWN
        out[y, e + 1:28] = HONEY
    out[36, 23:27] = BROWN; out[36, 27] = HONEY        # el borde de abajo del antifaz
    out[42, 26] = BROWN                                  # la curva de la barbilla, doble como a la derecha
    out[44, 26:29] = BROWN                               # el borde de la barbilla
    keep = [y for y in range(4, 45) if y not in CROP_COPA]
    p = out[keep]
    xs = np.where(p[:, :, 3].any(0))[0]
    return p[:, xs.min():xs.max() + 1]


def paint(face, root, cx=32, top=None):
    p = portrait(root)
    h, w = p.shape[:2]
    y0 = top if top is not None else int(round(27.5 - h / 2))
    x0 = int(round(cx - w / 2))
    m = p[:, :, 3] > 0
    # sombra arrojada del relieve (abajo a la derecha, 1 px) sobre el campo
    for y in range(h):
        for x in range(w):
            if m[y, x]:
                for dy, dx in ((1, 1), (0, 1), (1, 0)):
                    yy, xx = y + dy, x + dx
                    if not (yy < h and xx < w and m[yy, xx]):
                        face[y0 + yy, x0 + xx] = ORANGE
    for y in range(h):
        for x in range(w):
            if m[y, x]:
                face[y0 + y, x0 + x] = p[y, x]
    return face, (x0, y0, w, h)
