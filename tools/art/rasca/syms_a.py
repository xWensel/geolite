"""Simbolos fijos (chistera, diamante, doblon) y los dos temas de viaje: Mapamundi y Tesoro."""
from prim import *

def hat():
    """la chistera del crupier (lisa: copa morada, cinta roja, ala azul marino) - el premio mayor"""
    c = cv(); HAT = RAMP["hat"]; x = c.xx + .5; y = c.yy + .5
    brim = c.ell(11, 16.4, 10.4, 3.5)
    hband(c, brim, [NAVY[0], NAVY[1], NAVY[2], NAVY[3]], 0.5, 21.5, thr=(0.16, 0.5, 0.84))
    c.paint(brim & (y > 17.9), NAVY[3]); c.paint(brim & (y > 17.9) & (x < 7), NAVY[2])
    t = np.clip((y - 2.6) / 13, 0, 1); hw = 5.2 + 1.1 * t
    bot = 15.2 + 2.5 * np.sqrt(np.clip(1 - ((x - 11) / 6.4) ** 2, 0, 1))
    body = (np.abs(x - 11) <= hw) & (y >= 2.7) & (y <= bot)
    u = (x - (11 - hw)) / (2 * hw) + 0.04 * (((c.xx + c.yy) % 2) * 2 - 1)
    idx = (u >= 0.2).astype(int) + (u >= 0.55) + (u >= 0.84)
    for i, col in enumerate(HAT): c.paint(body & (idx == i), col)
    b1 = 10.5 + 1.3 * np.sqrt(np.clip(1 - ((x - 11) / 6.4) ** 2, 0, 1)); b2 = 13.6 + 1.5 * np.sqrt(np.clip(1 - ((x - 11) / 6.4) ** 2, 0, 1))
    band = body & (y >= b1) & (y <= b2)
    for i, col in enumerate(RED): c.paint(band & (idx == i), col)
    c.paint(band & (y > b2 - 1.1) & (idx <= 2), RED[2])
    top = c.ell(11, 2.9, 5.6, 2.3); c.paint(top, HAT[1]); c.paint(c.ell(10.4, 2.7, 4.3, 1.4), HAT[0]); c.paint(top & (x > 14.5) & (y > 3), HAT[2])
    return fin(c)

def diamond():
    """el diamante del crupier: rombo rubi con filo de oro"""
    c = cv(); x = c.xx + .5; y = c.yy + .5
    outer = pm(c, [(11, 0.4), (20.8, 11), (11, 21.6), (1.2, 11)])
    c.paint(outer, GOLD[3]); c.paint(outer & (x + y < 22) & (x < 11), GOLD[0]); c.paint(outer & (x + y < 22) & (x >= 11), GOLD[1]); c.paint(outer & (x + y >= 22) & (x < 11), GOLD[3]); c.paint(outer & (x + y >= 22) & (x >= 11), GOLD[5])
    inner = pm(c, [(11, 3.4), (18.2, 11), (11, 18.6), (3.8, 11)])
    c.paint(inner & (x < 11) & (y < 11), RED[0]); c.paint(inner & (x >= 11) & (y < 11), RED[1]); c.paint(inner & (x < 11) & (y >= 11), RED[1]); c.paint(inner & (x >= 11) & (y >= 11), RED[2])
    tab = pm(c, [(11, 7), (14.6, 11), (11, 15), (7.4, 11)]); c.paint(tab & (x + y < 22), RED[1]); c.paint(tab & (x + y >= 22), RED[2])
    c.paint(tab & (x < 11) & (y < 11) & (x + y > 16.5), RED[0])
    for (px, py) in ((7, 7), (8, 6), (6, 8)): c.put(px, py, WHITE[0])
    return fin(c)

def coin():
    """la doblon con la estrella"""
    c = cv(); x = c.xx + .5; y = c.yy + .5
    rim = c.ell(11, 11, 10.4, 10.4); tone(c, rim, [GOLD[1], GOLD[3], GOLD[5], GOLD[6]], 8, 8, 14, 14, thr=(-0.4, 0.1, 0.6))
    face = c.ell(11, 11, 7.5, 7.5); tone(c, face, [GOLD[0], GOLD[1], GOLD[2], GOLD[3]], 9, 9, 14, 14, thr=(-0.5, 0.0, 0.55))
    c.paint(c.ell(11, 11, 8.5, 8.5) & ~face, GOLD[5]); c.paint(c.ell(11, 11, 8.5, 8.5) & ~face & (x + y < 18), GOLD[3])
    pts = []
    for k in range(10):
        a = -np.pi / 2 + k * np.pi / 5; r = 5.4 if k % 2 == 0 else 2.3; pts.append((11 + r * np.cos(a), 11.6 + r * np.sin(a)))
    star = pm(c, pts); hi = pm(c, [(px - 1, py - 1) for px, py in pts]); lo = pm(c, [(px + 1, py + 1) for px, py in pts])
    c.paint(lo & ~star, GOLD[0]); c.paint(star, GOLD[4]); c.paint(star & (x + y > 23.5), GOLD[5]); c.paint(hi & ~star & ~lo, GOLD[5]); c.paint(star & (x < 10.2) & (y < 10.4), GOLD[3])
    c.put(5, 6, WHITE[0]); c.put(6, 5, WHITE[0])
    return fin(c)

# ----------------------------------------------------------------------------------------------- MAPAMUNDI
def globe():
    c = cv(); cx, cy, r = 10, 9.4, 8.2; x = c.xx + .5; y = c.yy + .5
    c.paint(c.ell(10.5, 19.8, 5.4, 1.6), RAMP["wood"][2]); c.paint(c.ell(10.2, 19.4, 4.4, 1.0), RAMP["wood"][1])
    c.paint(seg(c, (10.5, 15.5), (10.5, 19.2), 2.0), RAMP["wood"][1]); c.paint(seg(c, (11.2, 15.5), (11.2, 19.2), 0.8), RAMP["wood"][2])
    m = c.ell(cx, cy, r, r); thr = (-0.42, 0.05, 0.55)
    s = tone(c, m, RAMP["blue"], cx - 1.2, cy - 1.2, r * 1.5, r * 1.5, thr=thr)
    idx = sum((s >= t).astype(int) for t in thr)
    land = (c.ell(7.2, 6.6, 3.6, 2.4) | c.ell(6.2, 9.4, 2.4, 2.4) | c.ell(12.8, 12.6, 3.2, 3.7) | c.ell(14.6, 7.2, 2.0, 1.7) | c.ell(11.5, 5.2, 1.6, 1.2)) & m
    for i, col in enumerate(RAMP["green"]): c.paint(land & (idx == i), col)
    ring = c.ell(11, 9.6, 10.6, 10.6) & ~c.ell(11, 9.6, 9.3, 9.3) & (x > 11.2) & (y < 18.2) & ~m
    tone(c, ring, RAMP["gold"], 11, 4, 11, 11, thr=(-0.1, 0.5, 1.1))
    c.paint(seg(c, (10, 0.8), (10, 1.6), 1) & ~m, GOLD[3])
    return fin(c)

def compass():
    c = cv(); x = c.xx + .5; y = c.yy + .5; cx, cy = 11, 12.4
    ball(c, cx, cy, 9.2, 9.2, RAMP["gold"], spec=False)
    face = c.ell(cx, cy, 7.0, 7.0); tone(c, face, RAMP["teal"], cx - 2, cy - 2, 11, 11, thr=(-0.4, 0.1, 0.6))
    c.paint(c.ell(cx, cy, 7.6, 7.6) & ~face, GOLD[6])
    loop = c.ell(11, 2.3, 2.5, 2.5) & ~c.ell(11, 2.3, 1.0, 1.0); tone(c, loop, RAMP["gold"], 10, 1.5, 4, 4)
    for (px, py) in ((11, 6), (11, 18), (5, 12), (17, 12)): c.put(px, py, GOLD[1]); c.put(px, py + 1 if py < 12 else py - 1, GOLD[3]) if px == 11 else c.put(px + (1 if px < 11 else -1), py, GOLD[3])
    u = np.array([0.62, -0.78]); v = np.array([0.78, 0.62]); cc = np.array([cx, cy])
    n_ = [tuple(cc + u * 6.2), tuple(cc + v * 2.0), tuple(cc - v * 2.0)]; s_ = [tuple(cc - u * 6.2), tuple(cc + v * 2.0), tuple(cc - v * 2.0)]
    pn, ps = pm(c, n_), pm(c, s_); c.paint(ps, WHITE[1]); c.paint(ps & (x < cx), WHITE[0]); c.paint(pn, RED[1]); c.paint(pn & (x < cx + 1), RED[0]); c.paint(pn & (y > cy), RED[2])
    c.paint(c.ell(cx, cy, 1.5, 1.5), GOLD[2]); c.put(int(cx) - 1, int(cy) - 1, GOLD[0])
    return fin(c)

def pin():
    c = cv(); x = c.xx + .5; y = c.yy + .5
    c.paint(c.ell(11, 20.0, 4.2, 1.1), NAVY[2])
    drop = c.ell(11, 8.0, 6.4, 6.4) | pm(c, [(5.9, 10.6), (16.1, 10.6), (11, 20.4)])
    tone(c, drop, RED, 8.5, 5.5, 11, 11, thr=(-0.45, 0.1, 0.65))
    hole = c.ell(11, 8.0, 2.6, 2.6); c.paint(c.ell(11.6, 8.6, 2.9, 2.9), RED[3]); c.paint(hole, WHITE[1]); c.paint(c.ell(10.4, 7.4, 1.5, 1.5), WHITE[0])
    for (px, py) in ((6, 5), (7, 4), (6, 6)): c.put(px, py, WHITE[0])
    return fin(c)

def passport():
    c = cv(); x = c.xx + .5; y = c.yy + .5
    cover = (x >= 4) & (x < 18) & (y >= 1.5) & (y < 20.5)
    hband(c, cover, [NAVY[0], NAVY[1], NAVY[2], NAVY[3]], 4, 18, thr=(0.12, 0.45, 0.85))
    c.paint(cover & (x < 6.5), NAVY[3]); c.paint(cover & (x >= 6.5) & (x < 7.5), NAVY[2]); c.paint(cover & (x >= 6.5) & (x < 7.5) & (y > 4), NAVY[1])
    c.paint((x >= 17) & (x < 18.5) & (y >= 2.5) & (y < 20.5), WHITE[1])    # canto de las hojas
    c.paint((x >= 17) & (x < 18.5) & (y >= 2.5) & (y < 20.5) & (c.yy % 2 == 0), WHITE[0])
    emb = c.ell(12, 9, 3.9, 3.9); ring = emb & ~c.ell(12, 9, 2.7, 2.7); tone(c, ring, RAMP["gold"], 10, 7, 8, 8, thr=(-0.2, 0.3, 0.8))
    c.paint(seg(c, (8.3, 9), (15.7, 9), 0.8), GOLD[3]); c.paint(seg(c, (12, 5.3), (12, 12.7), 0.8), GOLD[3]); c.paint(c.ell(12, 9, 1.8, 3.7) & ~c.ell(12, 9, 0.9, 2.8), GOLD[3])
    c.paint((y >= 14.3) & (y < 15.3) & (x >= 9) & (x < 15.5), GOLD[2]); c.paint((y >= 16.4) & (y < 17.4) & (x >= 10.5) & (x < 14), GOLD[3])
    return fin(c)

def telescope():
    c = cv(); x = c.xx + .5; y = c.yy + .5
    seg_tone(c, (3.2, 18.8), (7.2, 14.8), 3.6, RAMP["wood"])
    seg_tone(c, (7.2, 14.8), (12.4, 9.6), 4.8, RAMP["gold"])
    seg_tone(c, (12.4, 9.6), (17.4, 4.6), 6.2, RAMP["steel"])
    for (p, q, w) in (((7.0, 15.0), (7.6, 14.4), 5.6), ((12.2, 9.8), (12.8, 9.2), 7.0)): c.paint(seg(c, p, q, w), GOLD[6])
    c.paint(seg(c, (18.0, 4.0), (18.8, 3.2), 6.4), GOLD[3]); c.paint(seg(c, (18.4, 3.6), (19.2, 2.8), 4.6), TEAL := RAMP["teal"][1]); c.paint(seg(c, (18.0, 4.0), (18.4, 3.6), 3.0), RAMP["teal"][0])
    return fin(c)

def mapa():
    c = cv(); x = c.xx + .5; y = c.yy + .5; ST = RAMP["stone"]
    ytop = 4.0 + np.where((x < 8) | ((x >= 14)), 0, 1.4)
    sheet = (x >= 2) & (x < 20) & (y >= ytop) & (y < 18.0 - np.where((x >= 8) & (x < 14), 1.2, 0))
    c.paint(sheet & (x < 8), ST[0]); c.paint(sheet & (x >= 8) & (x < 14), ST[1]); c.paint(sheet & (x >= 14), ST[0])
    c.paint(sheet & (x >= 7) & (x < 8), ST[2]); c.paint(sheet & (x >= 13) & (x < 14), ST[2]); c.paint(sheet & (x >= 8) & (x < 9), ST[0] if False else ST[1])
    c.paint(sheet & (y >= 17) , ST[2]); c.paint(sheet & (x >= 14) & (y >= 16), ST[3])
    c.paint(c.ell(5, 8.5, 2.3, 1.7) & sheet, RAMP["green"][1]); c.paint(c.ell(16.5, 13, 2.6, 2.0) & sheet, RAMP["blue"][1]); c.paint(c.ell(11, 7.5, 2, 1.4) & sheet, RAMP["green"][2])
    for (px, py) in ((4, 14), (6, 13), (8, 12), (10, 12), (12, 11), (14, 10), (16, 9)): c.put(px, py, RED[1])
    c.put(17, 8, RED[1]); c.put(18, 7, RED[1]); c.put(18, 9, RED[1]); c.put(16, 7, RED[1]); c.put(16, 9, RED[1])
    return fin(c)

# ----------------------------------------------------------------------------------------------- TESORO
def chest():
    c = cv(); x = c.xx + .5; y = c.yy + .5; W = RAMP["wood"]
    body = (x >= 2.5) & (x < 19.5) & (y >= 11) & (y < 19.5); lid = c.ell(11, 11.2, 8.5, 6.6) & (y < 11.2) | ((x >= 2.5) & (x < 19.5) & (y >= 10) & (y < 11.2))
    wood = body | lid
    tone(c, wood, W, 7, 7, 18, 18, thr=(-0.35, 0.1, 0.55))
    c.paint(body & (y >= 11) & (y < 12.2), W[3]); c.paint(lid & (y > 9.5) & (y < 11), W[2])
    for bx in (5.2, 15.8):
        band = (np.abs(x - bx) < 1.15) & (wood | (lid)); band &= (y > 4) & (y < 19.8); tone(c, band, RAMP["gold"], bx - 1, 4, 3, 12, thr=(-0.6, 0.3, 1.0))
    c.paint((y >= 17.6) & (y < 19.5) & (x >= 2.5) & (x < 19.5), GOLD[5]); c.paint((y >= 17.6) & (y < 18.4) & (x >= 2.5) & (x < 19.5), GOLD[3])
    lock = (x >= 8.8) & (x < 13.2) & (y >= 9.6) & (y < 14.4); tone(c, lock, RAMP["gold"], 8, 9, 6, 6, thr=(-0.2, 0.4, 0.9)); c.paint(c.ell(11, 11.4, 0.9, 0.9), NAVY[3]); c.paint((np.abs(x - 11) < 0.5) & (y >= 11.4) & (y < 13.2), NAVY[3])
    return fin(c)

def key():
    c = cv(); x = c.xx + .5; y = c.yy + .5
    seg_tone(c, (9.0, 9.0), (18.6, 18.6), 2.6, RAMP["gold"], thr=(-0.4, 0.2, 0.7))
    for (px, py) in ((15.0, 15.0), (17.6, 17.6)):
        c.paint(seg(c, (px, py), (px - 3.2, py + 3.2), 2.0), GOLD[3]); c.paint(seg(c, (px - 0.6, py + 0.6), (px - 3.0, py + 3.0), 0.8), GOLD[1])
    bow = c.ell(6, 6, 5.0, 5.0) & ~c.ell(6, 6, 2.3, 2.3); tone(c, bow, RAMP["gold"], 4, 4, 9, 9, thr=(-0.4, 0.15, 0.6))
    c.paint(c.ell(6, 6, 2.3, 2.3) & ~c.ell(6, 6, 1.7, 1.7) & (x > 6) & (y > 6), GOLD[1])
    c.put(3, 3, GOLD[0]); c.put(4, 2, GOLD[0]); c.put(2, 4, GOLD[0])
    return fin(c)

def ring():
    c = cv(); x = c.xx + .5; y = c.yy + .5
    band = c.ell(11, 14.2, 7.8, 6.2) & ~c.ell(11, 13.6, 5.2, 3.9); tone(c, band, RAMP["gold"], 6, 10, 16, 12, thr=(-0.4, 0.1, 0.6))
    c.paint(band & (y > 18.4), GOLD[6])
    gem = pm(c, [(11, 0.6), (15.2, 4.8), (11, 9.4), (6.8, 4.8)])
    c.paint(gem, RED[1]); c.paint(gem & (x < 11) & (y < 5), RED[0]); c.paint(gem & (x >= 11) & (y >= 5), RED[2]); c.paint(gem & (x < 11) & (y >= 5), RED[1]); c.put(8, 3, WHITE[0]); c.put(9, 2, WHITE[0])
    c.paint(pm(c, [(6.0, 6.8), (8.0, 6.4), (9.4, 9.6), (7.2, 10.8)]), GOLD[3]); c.paint(pm(c, [(16.0, 6.8), (14.0, 6.4), (12.6, 9.6), (14.8, 10.8)]), GOLD[5])
    return fin(c)

def skull():
    c = cv(); x = c.xx + .5; y = c.yy + .5; W = RAMP["white"]
    W = RAMP["stone"]; cran = c.ell(11, 9.2, 7.8, 7.4); jaw = (x >= 6.4) & (x < 15.6) & (y >= 13.5) & (y < 19.4) & ~((x < 7.6) & (y > 17)) & ~((x > 14.4) & (y > 17))
    bone = cran | jaw; tone(c, bone, [W[0], W[1], W[2], W[3]], 8, 6, 15, 17, thr=(-0.35, 0.2, 0.7))
    c.paint(c.ell(7.6, 10.4, 2.2, 2.5), NAVY[3]); c.paint(c.ell(14.4, 10.4, 2.2, 2.5), NAVY[3]); c.put(7, 9, NAVY[2]); c.put(14, 9, NAVY[2])
    c.paint(pm(c, [(11, 12.0), (9.9, 14.2), (12.1, 14.2)]), NAVY[3])
    for tx in (9.5, 11.5, 13.5): c.paint((np.abs(x - tx) < 0.5) & (y >= 15.2) & (y < 19.2), W[3])
    c.paint((y >= 14.6) & (y < 15.4) & (x >= 7.4) & (x < 14.6), W[2])
    return fin(c)

def chalice():
    c = cv(); x = c.xx + .5; y = c.yy + .5; G = RAMP["gold"]
    cup = pm(c, [(3.0, 1.6), (19.0, 1.6), (17.6, 8.4), (14.4, 11.4), (7.6, 11.4), (4.4, 8.4)])
    hband(c, cup, [GOLD[1], GOLD[3], GOLD[5], GOLD[6]], 3, 19, thr=(0.25, 0.55, 0.85)); c.paint(cup & (y < 3.2), GOLD[0]); c.paint(cup & (y < 2.6) & (x > 4), GOLD[1]) if False else None
    c.paint(cup & (y >= 3.2) & (y < 4.0), GOLD[2])
    stem = (np.abs(x - 11) < 1.5) & (y >= 11.4) & (y < 16.6); hband(c, stem, G, 9.5, 12.5, thr=(0.3, 0.6, 0.85)); c.paint(c.ell(11, 13.4, 2.8, 1.3), GOLD[3]); c.paint(c.ell(10.5, 13.2, 1.8, 0.7), GOLD[1])
    base = c.ell(11, 18.0, 6.6, 2.4) | ((x > 4.4) & (x < 17.6) & (y > 16.4) & (y < 18)); hband(c, base, G, 4.4, 17.6, thr=(0.3, 0.6, 0.85)); c.paint(base & (y > 19.2), GOLD[6])
    gem = pm(c, [(11, 3.8), (13.4, 6.4), (11, 9.4), (8.6, 6.4)]); c.paint(gem, RED[1]); c.paint(gem & (x < 11) & (y < 6.4), RED[0]); c.paint(gem & (x >= 11) & (y >= 6.4), RED[2]); c.put(9, 5, WHITE[0])
    return fin(c)

def pouch():
    c = cv(); x = c.xx + .5; y = c.yy + .5; B = [RAMP["stone"][1], RAMP["stone"][2], RAMP["wood"][1], RAMP["wood"][2]]
    body = c.ell(11, 14.0, 8.2, 6.8) | pm(c, [(7.6, 8.4), (14.4, 8.4), (17.6, 11.6), (4.4, 11.6)])
    tone(c, body, [RAMP["sand"][1], RAMP["sand"][2], RAMP["wood"][1], RAMP["wood"][2]], 7, 9, 18, 18, thr=(-0.35, 0.15, 0.6))
    c.paint(pm(c, [(7.4, 8.8), (5.6, 3.4), (9.0, 5.6), (11, 2.0), (13.0, 5.6), (16.4, 3.4), (14.6, 8.8)]), RAMP["sand"][1])
    c.paint(pm(c, [(7.4, 8.8), (5.6, 3.4), (8.0, 5.2), (9.6, 8.8)]), RAMP["sand"][0]); c.paint(pm(c, [(14.6, 8.8), (16.4, 3.4), (14.0, 5.2), (12.4, 8.8)]), RAMP["sand"][2])
    c.paint((y >= 8.2) & (y < 10.0) & (x >= 7.0) & (x < 15.0), RED[1]); c.paint((y >= 8.2) & (y < 8.8) & (x >= 7.0) & (x < 15.0), RED[0]); c.paint((y >= 9.4) & (y < 10.0) & (x >= 7.0) & (x < 15.0), RED[2])
    c.paint(c.ell(11, 14.8, 3.6, 3.6), GOLD[3]); c.paint(c.ell(11, 14.8, 3.0, 3.0), GOLD[1]); c.paint(c.ell(10.6, 14.4, 1.8, 1.8), GOLD[0]); c.paint(c.ell(11.6, 15.4, 1.0, 1.0), GOLD[3])
    return fin(c)

MAPAMUNDI = [("globe", globe), ("compass", compass), ("pin", pin), ("passport", passport), ("telescope", telescope), ("mapa", mapa)]
TESORO = [("chest", chest), ("key", key), ("ring", ring), ("skull", skull), ("chalice", chalice), ("pouch", pouch)]
TOP = [("hat", hat), ("diamond", diamond), ("coin", coin)]

if __name__ == "__main__":
    arrs = [f() for _, f in TOP + MAPAMUNDI + TESORO]
    zoom_sheet(arrs, HERE / "out" / "_sheet_a.png", k=10, cols=5)
