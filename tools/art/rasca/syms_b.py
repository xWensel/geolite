"""Temas Banderas, Noche de gala, Gemas y Tiempo (casi todo por formulas: banderas ondeando, palos, facetas de gema...)."""
from prim import *
import math

# ----------------------------------------------------------------------------------------------- BANDERAS
def flag(kind):
    c = cv(); CW, CH, X0, Y0 = 16, 12, 5, 3
    def col(u, v):
        px, py = u * CW, v * CH
        if kind == "jp": return (200, 16, 46) if (px - 8) ** 2 + (py - 6) ** 2 <= 3.5 ** 2 else (246, 243, 252)
        if kind == "br":
            if (px - 8) ** 2 + (py - 6) ** 2 <= 2.7 ** 2: return (0, 39, 118)
            return (255, 223, 0) if abs(px - 8) / 6.4 + abs(py - 6) / 4.6 <= 1 else (0, 150, 60)
        if kind == "fr": return (0, 85, 164) if u < 1 / 3 else (250, 250, 252) if u < 2 / 3 else (239, 65, 53)
        if kind == "es": return (198, 11, 30) if v < .25 or v >= .75 else (255, 196, 0)
        if kind == "de": return (28, 28, 34) if v < 1 / 3 else (221, 0, 0) if v < 2 / 3 else (255, 206, 0)
        if kind == "ch": return (250, 250, 252) if ((abs(px - 8) <= 1.8 and abs(py - 6) <= 4.6) or (abs(py - 6) <= 1.8 and abs(px - 8) <= 4.6)) else (213, 43, 30)
    for xi in range(CW):
        wv = int(round(1.3 * math.sin(xi * 0.55))); ph = math.cos(xi * 0.55)
        k = 1.1 if ph > 0.55 else 0.84 if ph < -0.55 else 1.0
        for yi in range(CH):
            base = col((xi + .5) / CW, (yi + .5) / CH); kk = k * (1.1 if yi == 0 else 0.8 if yi == CH - 1 else 1)
            c.put(X0 + xi, Y0 + yi + wv, lighten(base, kk))
    for yy in range(2, 21): c.put(3, yy, GOLD[1]); c.put(4, yy, GOLD[5])
    c.paint(c.ell(3.9, 2.2, 2.0, 2.0), GOLD[3]); c.paint(c.ell(3.4, 1.8, 1.1, 1.1), GOLD[0])
    return fin(c)

# ----------------------------------------------------------------------------------------------- NOCHE DE GALA
def die():
    c = cv(); x = c.xx + .5; y = c.yy + .5; W = RAMP["white"]
    front = (x >= 2.5) & (x < 15) & (y >= 7) & (y < 19.5); front &= ~(((x < 3.5) | (x > 14)) & ((y < 8) | (y > 18.5)))
    top = pm(c, [(2.5, 7), (6.5, 2.6), (19.5, 2.6), (15, 7)]); side = pm(c, [(15, 7), (19.5, 2.6), (19.5, 15), (15, 19.5)])
    c.paint(front, W[0]); c.paint(front & (x + y > 24), W[1]); c.paint(front & (x > 13.2), W[1]); c.paint(front & (y > 18), W[1]); c.paint(front & (x > 13.2) & (y > 17.4), W[2])
    c.paint(top, W[0]); c.paint(top & (x > 15), W[1]); c.paint(front & (y < 8), W[1]); c.paint(top & (y > 6.2) & (x < 14), W[1]) if False else None
    c.paint(side, W[2]); c.paint(side & (x < 17.2), W[1]); c.paint(side & (y > 14), W[3])
    for (px, py) in ((4.8, 9.2), (10.4, 9.2), (7.6, 12.6), (4.8, 16.0), (10.4, 16.0)):
        c.paint((x >= px) & (x < px + 2.4) & (y >= py) & (y < py + 2.4), RED[1]); c.paint((x >= px) & (x < px + 1.2) & (y >= py) & (y < py + 1.2), RED[0]); c.paint((x >= px + 1.2) & (y >= py + 1.2) & (x < px + 2.4) & (y < py + 2.4), RED[2])
    c.paint(c.ell(11.4, 4.9, 1.7, 0.9), RED[1]); c.paint(c.ell(17.3, 8.8, 0.7, 1.4), RED[2]); c.paint(c.ell(17.3, 13.6, 0.7, 1.4), RED[2])
    return fin(c)

def chip():
    c = cv(); x = c.xx + .5; y = c.yy + .5; cx = cy = 11
    ang = np.arctan2(y - cy, x - cx); r = np.hypot(x - cx, y - cy)
    disc = c.ell(cx, cy, 10.2, 10.2); s = (x - cx) / 14 + (y - cy) / 14 + 0.05 * (((c.xx + c.yy) % 2) * 2 - 1); idx = (s >= -0.4).astype(int) + (s >= 0.05) + (s >= 0.5)
    dash = (np.floor((ang + np.pi) / (2 * np.pi) * 8 + 0.5) % 2 == 0) & (r >= 7.0)
    for i in range(4):
        c.paint(disc & ~dash & (idx == i), RED[i]); c.paint(disc & dash & (idx == i), [WHITE[0], WHITE[1], WHITE[1], WHITE[2]][i])
    c.paint(disc & (r >= 5.4) & (r < 6.6), RED[2]); c.paint(disc & (r < 5.4), RED[1]); c.paint(disc & (r < 5.4) & (idx == 0), RED[0]); c.paint(disc & (r < 5.4) & (idx == 3), RED[2])
    c.paint(disc & (r >= 5.0) & (r < 5.4), WHITE[1])
    dia = (np.abs(x - cx) / 2.5 + np.abs(y - cy) / 3.4) <= 1.0; c.paint(dia, GOLD[3]); c.paint(dia & (x < cx) & (y < cy), GOLD[0]); c.paint(dia & (x >= cx) & (y >= cy), GOLD[5])
    return fin(c)

def suit(kind):
    c = cv(); x = c.xx + .5; y = c.yy + .5
    if kind == "heart":
        m = c.ell(7.2, 7.6, 4.6, 4.6) | c.ell(14.8, 7.6, 4.6, 4.6) | pm(c, [(2.7, 9.0), (19.3, 9.0), (11, 20.4)]); ramp = RAMP["red"]
    elif kind == "spade":
        m = c.ell(7.2, 12.2, 4.6, 4.6) | c.ell(14.8, 12.2, 4.6, 4.6) | pm(c, [(2.6, 12.6), (19.4, 12.6), (11, 0.8)]) | pm(c, [(9.4, 13.0), (12.6, 13.0), (14.4, 20.6), (7.6, 20.6)]); ramp = rh("b4acec", "7468b0", "4a3e84", "2c2458")
    else:
        m = c.ell(11, 6.2, 4.5, 4.5) | c.ell(5.8, 12.0, 4.5, 4.5) | c.ell(16.2, 12.0, 4.5, 4.5) | c.ell(11, 11.0, 3.4, 3.4) | pm(c, [(9.4, 12.0), (12.6, 12.0), (14.4, 20.6), (7.6, 20.6)]); ramp = RAMP["green"]
    tone(c, m, ramp, 8.5, 7.5, 15, 15, thr=(-0.4, 0.05, 0.55))
    c.paint(c.ell(8, 6.2, 1.3, 1.1) & m, ramp[0]) if kind != "spade" else c.paint(c.ell(8.6, 8.4, 1.3, 1.0) & m, ramp[0])
    c.put(6, 6 if kind != "spade" else 8, WHITE[0] if kind != "spade" else WHITE[1]); c.put(7 if kind == "heart" else 9, 5 if kind == "heart" else (3 if kind == "spade" else 3), WHITE[0] if kind == "heart" else ramp[0]) if kind != "club" else None
    return fin(c)

def flute():
    c = cv(); x = c.xx + .5; y = c.yy + .5; W = RAMP["white"]
    glass = pm(c, [(6.6, 1.0), (15.4, 1.0), (13.7, 12.6), (8.3, 12.6)]); hband(c, glass, [W[0], W[1], W[1], W[2]], 6.6, 15.4, thr=(0.2, 0.6, 0.85))
    liq = pm(c, [(7.0, 4.4), (15.0, 4.4), (13.3, 12.0), (8.7, 12.0)]); hband(c, liq, [GOLD[0], GOLD[1], GOLD[2], GOLD[3]], 7.0, 15.0, thr=(0.18, 0.5, 0.8)); c.paint(liq & (y < 5.4), GOLD[0])
    for (bx, by) in ((10, 7), (12, 9), (9, 10), (11, 5.6), (12, 7)): c.put(bx, int(by), WHITE[0])
    c.paint((y >= 12.6) & (y < 17.8) & (np.abs(x - 11) < 1.0), W[1]); c.paint((y >= 12.6) & (y < 17.8) & (x >= 10) & (x < 11), W[0]); c.paint(c.ell(11, 14.6, 1.8, 0.8), W[1])
    base = c.ell(11, 18.8, 5.0, 1.8); hband(c, base, [W[0], W[1], W[2], W[3]], 6, 16, thr=(0.3, 0.6, 0.85))
    return fin(c)

# ----------------------------------------------------------------------------------------------- GEMAS
def facets(c, outer, inner, ramp, cx=11.0, cy=11.0):
    n = len(outer); la = math.atan2(-1, -1)
    for i in range(n):
        o1, o2, i1, i2 = outer[i], outer[(i + 1) % n], inner[i], inner[(i + 1) % n]
        a = math.atan2((o1[1] + o2[1]) / 2 - cy, (o1[0] + o2[0]) / 2 - cx); lt = math.cos(a - la)
        c.paint(pm(c, [o1, o2, i2, i1]), ramp[0 if lt > 0.72 else 1 if lt > 0.1 else 2 if lt > -0.55 else 3])
    tab = pm(c, inner); c.paint(tab, ramp[1]); c.paint(tab & (c.xx + c.yy < cx + cy - 1), ramp[0]); c.paint(tab & (c.xx + c.yy > cx + cy + 3), ramp[2])
    c.put(int(cx) - 3, int(cy) - 3, WHITE[0]); c.put(int(cx) - 2, int(cy) - 3, WHITE[0]); c.put(int(cx) - 3, int(cy) - 2, WHITE[0])

def scaled(pts, k, cx=11.0, cy=11.0, dy=0.0): return [(cx + (px - cx) * k, cy + (py - cy) * k + dy) for px, py in pts]

def gem(kind):
    c = cv()
    if kind == "esmeralda":
        o = [(6.5, 1.0), (15.5, 1.0), (20.8, 6.2), (20.8, 15.8), (15.5, 21.0), (6.5, 21.0), (1.2, 15.8), (1.2, 6.2)]; facets(c, o, scaled(o, 0.6), RAMP["green"])
        c.paint(pm(c, scaled(o, 0.34)), RAMP["green"][2]); c.paint(pm(c, scaled(o, 0.3)), RAMP["green"][1])
    elif kind == "zafiro":
        o = [(11 + 10.0 * math.cos(math.radians(22.5 + 45 * k)), 11 + 10.0 * math.sin(math.radians(22.5 + 45 * k))) for k in range(8)]; facets(c, o, scaled(o, 0.56), RAMP["blue"])
    elif kind == "amatista":
        o = [(11, 0.8), (16.8, 5.2), (19.8, 11.8), (16.6, 18.6), (11, 21.2), (5.4, 18.6), (2.2, 11.8), (5.2, 5.2)]; facets(c, o, scaled(o, 0.5, cy=11.4), RAMP["purple"], cy=11.0)
    elif kind == "topacio":
        o = [(11, 1.0), (20.0, 6.2), (20.0, 15.8), (11, 21.0), (2.0, 15.8), (2.0, 6.2)]; facets(c, o, scaled(o, 0.55), RAMP["orange"])
    elif kind == "aguamarina":
        o = [(11, 0.6), (16.2, 4.8), (19.6, 11.0), (16.2, 17.2), (11, 21.4), (5.8, 17.2), (2.4, 11.0), (5.8, 4.8)]; facets(c, o, scaled(o, 0.5), RAMP["teal"])
    elif kind == "perla":
        x = c.xx + .5; y = c.yy + .5
        base = pm(c, [(4.4, 14.6), (17.6, 14.6), (15.6, 20.4), (6.4, 20.4)]); hband(c, base, RAMP["gold"], 4.4, 17.6, thr=(0.3, 0.6, 0.85)); c.paint(base & (y < 15.6), GOLD[0])
        p = ball(c, 11, 9.2, 7.6, 7.6, RAMP["pearl"], spec=False); c.paint(c.ell(8.2, 6.2, 2.4, 1.8), WHITE[0]); c.paint(c.ell(8.0, 6.0, 1.4, 1.0), (255, 255, 255)); c.put(13, 12, RAMP["pearl"][2])
    return fin(c)

# ----------------------------------------------------------------------------------------------- TIEMPO
def sun():
    c = cv(); x = c.xx + .5; y = c.yy + .5; cx = cy = 11.0
    for k in range(8):
        a = math.radians(k * 45 - 90); L = 10.9 if k % 2 == 0 else 9.6; hw = 2.5 if k % 2 == 0 else 2.0
        tip = (cx + L * math.cos(a), cy + L * math.sin(a)); b1 = (cx + 5.6 * math.cos(a) - hw * math.sin(a), cy + 5.6 * math.sin(a) + hw * math.cos(a)); b2 = (cx + 5.6 * math.cos(a) + hw * math.sin(a), cy + 5.6 * math.sin(a) - hw * math.cos(a))
        lt = math.cos(a - math.radians(-135)); c.paint(pm(c, [tip, b1, b2]), RAMP["orange"][1] if lt > 0.3 else RAMP["orange"][2] if lt > -0.5 else RAMP["orange"][3])
    ball(c, cx, cy, 6.2, 6.2, [GOLD[0], GOLD[1], GOLD[2], GOLD[3]], spec=False); c.paint(c.ell(9.2, 8.8, 2.0, 1.5), WHITE[0]); c.paint(c.ell(9.0, 8.6, 1.0, 0.8), (255, 255, 255))
    return fin(c)

def moon():
    c = cv(); x = c.xx + .5; y = c.yy + .5
    m = c.ell(10.6, 11, 9.4, 9.4) & ~c.ell(15.8, 9.0, 8.0, 8.0)
    tone(c, m, [GOLD[0], GOLD[1], GOLD[2], GOLD[3]], 6, 6, 14, 14, thr=(-0.5, -0.05, 0.4))
    for (px, py, r) in ((5.4, 12.6, 1.4), (7.6, 16.4, 1.1), (4.6, 8.0, 0.9)): c.paint(c.ell(px, py, r, r) & m, GOLD[4]); c.put(int(px) - 1, int(py) - 1, GOLD[0]) if False else None
    c.paint(m & (x > 12) & (y > 15), GOLD[4]); c.put(5, 6, WHITE[0]); c.put(6, 5, WHITE[0]); c.put(4, 7, WHITE[0])
    return fin(c)

def cloud():
    c = cv(); x = c.xx + .5; y = c.yy + .5; W = RAMP["white"]
    m = (c.ell(6.6, 13.4, 4.6, 4.4) | c.ell(11.4, 9.4, 5.6, 5.6) | c.ell(16.4, 13.2, 4.4, 4.2) | c.ell(11, 14.6, 5.5, 4.0)) & (y < 18.4)
    tone(c, m, [W[0], W[0], W[1], W[2]], 9, 2, 40, 16, thr=(0.15, 0.62, 1.0))
    c.paint(c.ell(9.2, 8.2, 2.6, 1.9) & m, W[0]); c.paint(m & (y > 17.2), W[2]); c.paint(m & (y > 16.0) & (y <= 17.2) & (x > 11), W[1])
    return fin(c)

def bolt():
    c = cv(); x = c.xx + .5; y = c.yy + .5
    m = pm(c, [(13.6, 0.8), (4.6, 12.4), (10.2, 12.4), (7.2, 21.2), (18.0, 8.6), (12.4, 8.6), (16.4, 0.8)]); hband(c, m, RAMP["yellow"], 4.5, 18, thr=(0.3, 0.55, 0.8))
    c.paint(m & (y < 8.6) & (x < 11), RAMP["yellow"][0]); c.paint(m & (y > 17) , RAMP["yellow"][2]); c.put(13, 2, WHITE[0]); c.put(12, 3, WHITE[0])
    return fin(c)

def snow():
    c = cv(); cx = cy = 11.0; ICE = [(250, 253, 255), (200, 232, 255), (140, 190, 240)]
    for k in range(6):
        a = math.radians(k * 60 - 90); ca, sa = math.cos(a), math.sin(a)
        c.paint(seg(c, (cx, cy), (cx + 9.8 * ca, cy + 9.8 * sa), 1.8), ICE[1])
        bx, by = cx + 6.0 * ca, cy + 6.0 * sa
        for d in (-1, 1):
            a2 = a + d * math.radians(55); c.paint(seg(c, (bx, by), (bx + 3.4 * math.cos(a2), by + 3.4 * math.sin(a2)), 1.3), ICE[1])
    xx = c.xx + .5; yy = c.yy + .5
    c.paint(c.m & (xx + yy < 22), ICE[0]); c.paint(c.m & (xx + yy > 26), ICE[2]); c.paint(c.ell(cx, cy, 2.4, 2.4), ICE[0]); c.paint(c.ell(cx, cy, 1.4, 1.4), (255, 255, 255))
    return fin(c)

def drop():
    c = cv(); x = c.xx + .5; y = c.yy + .5
    m = c.ell(11, 13.6, 6.8, 6.8) | pm(c, [(11, 0.8), (5.0, 11.0), (17.0, 11.0)])
    tone(c, m, RAMP["blue"], 9, 9, 14, 14, thr=(-0.4, 0.05, 0.55))
    c.paint(c.ell(8.2, 14.2, 1.6, 2.6) & m, RAMP["blue"][0]); c.put(8, 12, WHITE[0]); c.put(8, 13, WHITE[0]); c.put(9, 11, WHITE[0]); c.put(10, 5, WHITE[0]); c.put(10, 6, RAMP["blue"][0])
    return fin(c)

BANDERAS = [("flag_jp", lambda: flag("jp")), ("flag_br", lambda: flag("br")), ("flag_fr", lambda: flag("fr")), ("flag_es", lambda: flag("es")), ("flag_de", lambda: flag("de")), ("flag_ch", lambda: flag("ch"))]
GALA = [("die", die), ("chip", chip), ("spade", lambda: suit("spade")), ("heart", lambda: suit("heart")), ("club", lambda: suit("club")), ("flute", flute)]
GEMAS = [(f"gem_{k}", (lambda k=k: gem(k))) for k in ("esmeralda", "zafiro", "amatista", "topacio", "perla", "aguamarina")]
TIEMPO = [("sun", sun), ("moon", moon), ("cloud", cloud), ("bolt", bolt), ("snow", snow), ("drop", drop)]

if __name__ == "__main__":
    arrs = [f() for _, f in BANDERAS + GALA + GEMAS + TIEMPO]
    zoom_sheet(arrs, HERE / "out" / "_sheet_b.png", k=10, cols=6)
