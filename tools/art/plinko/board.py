"""Lluvia de fichas - el tablero (214x220 px nativos, se muestra x4): marco de oro con ranura para las bombillas, tolva con 11 flechas, campo de clavijas
con paneles, tabiques de las 11 casillas y suelo. Cuatro decorados con su propia paleta, textura y juego de clavijas. Las clavijas, la ficha, las etiquetas
y las bombillas van encima (DOM); aqui solo el fondo fijo, con las sombras de las clavijas ya pintadas."""
import numpy as np
from parts import *

W, H, T = 214, 220, 8                    # ancho, alto y grosor del marco
def X(p): return 17 + 9 * p              # centro de la posicion p (medios carriles 0..20)
def Y(r): return 34 + 13 * r             # fila r de clavijas (0..11)
FIELD0, FIELD1, SLOT0, FLOOR = 27, 181, 181, 211

STEEL = [hexc(c) for c in ("ffffff", "e8e2f8", "d6ceee", "a092ce", "8070b8", "704aa8", "4e2a85", "2c1a5c")]
DECOR = {
    "petroleo": dict(bg=["1c8c97", "0f6b78", "0a4a56", "052b36"], frame=GOLD, peg=["fff6c8", "ffd95a", "fcc440", "de881e", "a05018"], glow="ffd95a", neon=None),
    "noche":    dict(bg=["4a3a9a", "2e2072", "1d1450", "0e0a30"], frame=STEEL, peg=["ffffff", "e8e2f8", "c0b4ec", "8070b8", "4e2a85"], glow="7fe8ff", neon=("ff4fd8", "4fe6ff")),
    "marmol":   dict(bg=["fbf4e2", "e9dfc4", "cfc19e", "a89a7a"], frame=GOLD, peg=["ffd9a0", "e0a458", "b8702a", "8a4a1c", "4a2410"], glow="ffe08a", neon=None),
    "rubi":     dict(bg=["e03a56", "b01c3c", "7a1030", "440820"], frame=GOLD, peg=["ffffff", "ffd0da", "ff8fa4", "d44a66", "8a1a3a"], glow="ffb0c0", neon=None),
}
LIGHTS = {"petroleo": ("ffe08a", "4a3410"), "noche": ("7fe8ff", "ff4fd8"), "marmol": ("fff3b0", "7a5a1c"), "rubi": ("ffc0cc", "7a1030")}   # (encendida, apagada) de las bombillas (CSS)

def _noise(seed, p):
    return np.random.default_rng(seed).random((H, W)) < p

def _field_tones(dec, xx, yy):
    """mapa de tonos 0..3 (0 el mas claro) del campo de clavijas, segun el decorado"""
    px, py = xx + .5 - 17, yy + .5 - 34
    u = (13 * px - 9 * py) % 234; v = (13 * px + 9 * py) % 234
    du = np.minimum(u, 234 - u) / 15.8; dv = np.minimum(v, 234 - v) / 15.8                        # distancia en px a las diagonales que pasan por las clavijas
    net = (du < 0.62) | (dv < 0.62)
    ua = np.floor((13 * px - 9 * py) / 234).astype(int); va = np.floor((13 * px + 9 * py) / 234).astype(int)
    ck = (xx + yy) % 2 == 0
    if dec == "petroleo":                       # rombos de oro viejo sobre el petroleo: la red que une las clavijas
        t = np.ones_like(xx); t[net] = 2; t[net & (du < 0.3) & (px < 0)] = 3
        t[((xx < 21) | (xx > W - 22)) & ck] = 2
        return t
    if dec == "rubi":                           # facetas de joya: cada rombo de la red, un tono
        t = np.array([1, 2, 0])[(ua + 2 * va) % 3]; t[net] = 3; t[net & ck] = 2
        return t
    if dec == "noche":                          # indigo con tubos de neon verticales entre las columnas y lineas de barrido
        t = np.ones_like(xx); t[(yy % 4) == 3] = 2; t[((xx < 21) | (xx > W - 22)) & ck] = 2
        return t
    if dec == "marmol":                         # losas de marmol (2 carriles x 4 filas) con vetas; las juntas, de oro
        sx, sy = (xx - 8) // 36, (yy - FIELD0) // 52; t = np.zeros_like(xx)
        for a in range(-1, 7):
            for b in range(-1, 4):
                r = np.random.default_rng(100 * (a + 2) + (b + 2) + 7); ph = r.random(4) * 6.28; k = 0.12 + r.random() * 0.1
                m = (sx == a) & (sy == b)
                f = np.sin(k * (xx + 3 * np.sin(0.09 * yy + ph[0])) + 1.9 * np.sin(0.07 * (yy + 11 * a) + ph[1]) + ph[2])
                vein = np.abs(f) < 0.07; soft = (np.abs(f) < 0.2) & ck
                g = np.sin(0.075 * (xx - 40 * a) + 1.3 * np.sin(0.035 * yy + ph[3]) + ph[0]); gold = (np.abs(g) < 0.028) & (r.random() < 0.55)
                t[m & ~gold] = 0; t[m & soft] = 1; t[m & vein] = 3; t[m & gold] = 4
        return t
    raise ValueError(dec)

def board(dec):
    d = DECOR[dec]; bg = [hexc(c) for c in d["bg"]]; fr = d["frame"]
    yy, xx = np.mgrid[0:H, 0:W]; rgb = np.zeros((H, W, 3), np.uint8); ck = (xx + yy) % 2 == 0
    # --- fondo: tolva (tono 2), campo (textura del decorado), casillas (tono 3)
    ti = _field_tones(dec, xx, yy); field = (yy >= FIELD0) & (yy < FIELD1)
    ti = np.where(field, ti, 2)
    rgb[:] = np.array(bg + [GOLD[2]])[np.clip(ti, 0, 4)]
    if dec == "marmol": rgb[(ti == 4)] = GOLD[3]; rgb[(yy >= SLOT0)] = bg[3]; rgb[(yy < FIELD0)] = bg[2]
    else: rgb[(yy >= SLOT0)] = bg[3]
    if dec == "noche":
        for n, p in enumerate(range(1, 20, 2)):
            col = hexc(d["neon"][n % 2]); x = X(p)
            for yyy in range(FIELD0 + 2, FIELD1 - 1):
                if yyy % 8 < 6:
                    rgb[yyy, x] = col; rgb[yyy, x - 1] = mix(bg[1], col, .25); rgb[yyy, x + 1] = mix(bg[1], col, .25)
    # --- paneles del campo: tres paneles apilados con bisel de 1 px (luz arriba-izquierda)
    cuts = [FIELD0, Y(3) + 6, Y(7) + 6, FIELD1]
    hi, lo, line = bg[0], bg[3], mix(bg[3], hexc("000000"), .3)
    if dec == "marmol": hi, lo, line = GOLD[1], GOLD[5], GOLD[6]
    for a, b in zip(cuts[:-1], cuts[1:]):
        rgb[a, T:W - T] = hi; rgb[b - 1, T:W - T] = lo
        if a != FIELD0: rgb[a - 1, T:W - T] = line
    if dec == "marmol":
        for xj in range(8 + 36, W - 8, 36):
            seg = slice(FIELD0, FIELD1 - 1); rgb[seg, xj] = GOLD[5]; rgb[seg, xj - 1] = GOLD[3]
    rgb[FIELD0 - 2, T:W - T] = fr[1]; rgb[FIELD0 - 1, T:W - T] = fr[5]                  # filete dorado bajo la tolva
    rgb[FIELD1 - 1, T:W - T] = fr[5]; rgb[FIELD1, T:W - T] = fr[1] if False else bg[2]
    # --- sombras de las clavijas: elipse de 7x4 desplazada (1,2), tono oscuro con tramado en el borde
    sh = mix(bg[3], (0, 0, 0), .25) if dec != "marmol" else bg[3]
    for r in range(12):
        for p in range(0 if r % 2 == 0 else 1, 21, 2):
            cx, cy = X(p) + 1.5, Y(r) + 2.6
            m = ((xx + .5 - cx) / 4.0) ** 2 + ((yy + .5 - cy) / 2.6) ** 2 <= 1.0
            rgb[m & ((xx + yy) % 2 == 0)] = sh; rgb[m & ((xx + yy) % 2 == 1) & (((xx + .5 - cx) / 3.0) ** 2 + ((yy + .5 - cy) / 1.8) ** 2 <= 1.0)] = sh
    # --- tabiques de las casillas (en p impar, bajo la ultima fila de clavijas) y su suelo
    for p in range(1, 20, 2):
        x = X(p); top = Y(11) + 4
        for yyy in range(top, FLOOR):
            rgb[yyy, x - 1] = fr[1]; rgb[yyy, x] = fr[3]; rgb[yyy, x + 1] = fr[5]
        rgb[top - 1, x - 1:x + 2] = hexc("1d0a3d"); rgb[FLOOR - 1, x - 1:x + 2] = fr[6]
    rgb[SLOT0:SLOT0 + 2, T:W - T] = bg[3]; rgb[FLOOR - 1, T:W - T] = fr[5]; rgb[FLOOR, T:W - T] = hexc("1d0a3d")
    # --- flechas de la tolva
    ar = arrow(False)
    for j in range(11):
        x0, y0 = X(2 * j) - ar.shape[1] // 2, 12
        sub = rgb[y0:y0 + ar.shape[0], x0:x0 + ar.shape[1]]; sub[ar[..., 3] > 0] = ar[..., :3][ar[..., 3] > 0]
    # --- marco de oro: railes de 8 px con ranura de 4 para las bombillas (ink, luz, ranura x4, sombra, ink) y paredes iguales
    INK = hexc("1d0a3d")
    prof = [INK, fr[1], fr[6], fr[7], fr[7], fr[6], fr[3], INK]                           # de fuera a dentro
    prof[2] = fr[7]
    def rail(sl, axis, flip=False):
        pr = prof[::-1] if flip else prof
        for i in range(T):
            if axis == 0: rgb[i + sl, :] = pr[i] if sl == 0 else pr[i]
    for i in range(T): rgb[i, :] = prof[i]; rgb[H - 1 - i, :] = prof[i]
    for i in range(T):
        for yv in range(T, H - T): rgb[yv, i] = prof[i]; rgb[yv, W - 1 - i] = prof[i]
    # luz del marco: el borde izquierdo y superior brillan, el derecho e inferior son sombra
    rgb[1, 1:W - 1] = fr[0]; rgb[H - 2, 1:W - 1] = fr[4]; rgb[1:H - 1, 1] = fr[0]; rgb[1:H - 1, W - 2] = fr[4]; rgb[H - 2, W - 2] = fr[5]
    # remaches en las esquinas
    for (cx, cy) in ((4, 4), (W - 5, 4), (4, H - 5), (W - 5, H - 5)):
        rgb[cy - 1:cy + 2, cx - 1:cx + 2] = fr[3]; rgb[cy - 1, cx - 1] = fr[0]; rgb[cy, cx - 1] = fr[1]; rgb[cy + 1, cx + 1] = fr[6]
    out = np.zeros((H, W, 4), np.uint8); out[..., :3] = rgb; out[..., 3] = 255
    return out

def compose_preview(dec, k=3):
    """el tablero con las clavijas (algunas encendidas), una ficha y casillas de color: para revisar el arte (no es un entregable del juego)"""
    from PIL import Image
    d = DECOR[dec]; pal = [hexc(c) for c in d["peg"]]; glow = hexc(d["glow"]); sheet = peg_sheet(pal, glow); b = board(dec).copy()
    def blit(a, s, x, y):
        h, w = s.shape[:2]
        for j in range(h):
            for i in range(w):
                if s[j, i, 3] and 0 <= y + j < a.shape[0] and 0 <= x + i < a.shape[1]: a[y + j, x + i] = s[j, i]
    lit = {(3, 8), (4, 9), (5, 8), (2, 9)}
    for r in range(12):
        for p in range(0 if r % 2 == 0 else 1, 21, 2):
            f = 2 if (r, p) in lit else (1 if (r, p) in {(3, 6), (4, 7), (5, 10)} else 0)
            blit(b, sheet[:, f * 8:(f + 1) * 8], X(p) - 4, Y(r) - 4)
    ch = chip_frame(0); blit(b, ch, X(10) - 6, Y(6) - 10 - 6)
    tr = trail_sheet(glow)
    for n, (dx, dy) in enumerate(((-9, -14), (-17, -26), (-22, -36))): blit(b, tr[:, n * 6:(n + 1) * 6], X(10) - 3 + dx, Y(6) - 16 + dy)
    cols = ["5d6470", "c9362c", "1f9a58", "d9a21f"]
    for j in range(11):
        c = hexc(cols[[3, 2, 1, 0, 0, 0, 0, 0, 1, 2, 3][j]]); x0 = X(2 * j) - 7
        b[SLOT0 + 6:SLOT0 + 28, x0:x0 + 15, :3] = c; b[SLOT0 + 6, x0:x0 + 15, :3] = mix(c, (255, 255, 255), .4); b[SLOT0 + 27, x0:x0 + 15, :3] = mix(c, (0, 0, 0), .45)
    return b
