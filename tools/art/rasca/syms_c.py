"""Temas Monumentos y Faro y mar."""
from prim import *
import math

# ----------------------------------------------------------------------------------------------- MONUMENTOS
def pyramid():
    c = cv(); x = c.xx + .5; y = c.yy + .5; SA = RAMP["sand"]
    c.paint(c.ell(11, 19.4, 9.0, 0.9), RAMP["stone"][3])
    tri = pm(c, [(11, 1.4), (21.2, 18.8), (0.8, 18.8)])
    left = tri & (x < 11); right = tri & (x >= 11)
    c.paint(left, SA[0]); c.paint(left & (x < 6.5), SA[1]); c.paint(right, SA[2]); c.paint(right & (x > 16.5), SA[3])
    for yy in (5.6, 8.6, 11.6, 14.6, 17.4):                     # hiladas
        row = tri & (np.abs(y - yy) < 0.5); c.paint(row & left, SA[1]); c.paint(row & right, SA[3])
    for (yy, off) in ((7.1, 2), (10.1, 4), (13.1, 1), (16.0, 3)):
        for bx in range(0, 22, 5):
            sx = bx + off; c.paint(tri & (np.abs(y - yy) < 0.5) & (np.abs(x - sx) < 0.5) & left, SA[1]); c.paint(tri & (np.abs(y - yy) < 0.5) & (np.abs(x - sx) < 0.5) & right, SA[3])
    c.paint(tri & (y < 3.2) & (x < 11), WHITE[0]); c.paint(tri & (y >= 3.2) & (y < 4.4) & (x < 10.6), SA[0])
    c.paint(seg(c, (11, 1.8), (11, 18.6), 0.9), SA[1])
    return fin(c)

def eiffel():
    c = cv(); x = c.xx + .5; y = c.yy + .5; IR = RAMP["iron"]
    hw = np.where(y < 4, 0.8 + 0.2 * (y - 1), 1.4 + 7.4 * (np.clip((y - 4) / 17.0, 0, 1) ** 1.4))
    tower = (np.abs(x - 11) <= hw) & (y >= 1.2) & (y < 21.2)
    plat = ((np.abs(x - 11) <= hw + 1.5) & (y >= 8.0) & (y < 9.8)) | ((np.abs(x - 11) <= hw + 2.0) & (y >= 13.4) & (y < 15.2))
    arch = c.ell(11, 22.2, 3.8, 6.4)
    m = (tower | plat) & ~arch
    u = (x - (11 - hw - 2)) / (2 * hw + 4)
    idx = (u >= 0.3).astype(int) + (u >= 0.55) + (u >= 0.8)
    for i, col in enumerate(IR): c.paint(m & (idx == i), col)
    lat = m & ~plat & (np.abs(x - 11) < hw - 1.0) & (y > 9.8) & (((c.xx + c.yy) % 3) == 0); c.paint(lat, IR[3])
    lat2 = m & ~plat & (np.abs(x - 11) < hw - 1.0) & (y > 9.8) & (((c.xx - c.yy) % 3) == 0) & (c.xx > 10); c.paint(lat2, IR[3])
    c.paint(plat & m, IR[1]); c.paint(plat & m & (y >= 9.0) | (plat & m & (y >= 14.4)), IR[3]); c.paint(plat & m & (y < 8.6) | (plat & m & (y < 14.0) & (y >= 13.4)), IR[0])
    c.paint(tower & (y < 4.2) & (x < 11), IR[0]); c.paint(seg(c, (11, 0.8), (11, 3.0), 0.9) & ~tower, IR[2]) if False else None
    c.paint((y >= 20.2) & (y < 21.2) & m, IR[3])
    return fin(c)

def pisa():
    c = cv(); x = c.xx + .5; y = c.yy + .5; ST = RAMP["stone"]
    c.paint(c.ell(10, 20.4, 9.0, 1.4), RAMP["green"][2]); c.paint(c.ell(9.4, 20.1, 7.4, 0.9), RAMP["green"][1])
    cxl = 8.0 + (19.8 - y) * 0.2
    body = (np.abs(x - cxl) <= np.where(y < 6.2, 3.2, 4.4)) & (y >= 2.6) & (y < 19.8)
    u = (x - (cxl - 4.4)) / 8.8 + 0.04 * (((c.xx + c.yy) % 2) * 2 - 1)
    idx = (u >= 0.3).astype(int) + (u >= 0.6) + (u >= 0.85)
    for i, col in enumerate(ST): c.paint(body & (idx == i), col)
    for yy in (6.3, 9.3, 12.3, 15.3, 18.3):
        c.paint(body & (np.abs(y - yy) < 0.5), ST[3] if yy < 18 else ST[2])
    for yy in (7.6, 10.6, 13.6, 16.6):
        for k in range(-2, 3):
            ax = cxl + k * 1.85; c.paint(body & (np.abs(x - ax) < 0.5) & (y > yy - 0.6) & (y < yy + 1.5), ST[3])
    c.paint(body & (y < 4.0), ST[1]); c.paint(body & (y >= 2.6) & (y < 3.2), ST[0]); c.paint(body & (y < 2.6 + 1) & (x > cxl + 1.5), ST[2])
    c.paint(body & (y >= 4.4) & (y < 5.2) & (np.abs(x - cxl) < 2.2) & (np.abs(x - cxl) > 1.0), ST[3])
    return fin(c)

def moai():
    c = cv(); x = c.xx + .5; y = c.yy + .5; G = rh("e4e0e8", "b4b0c4", "7e7a94", "4c485e")
    hw = np.select([y < 2.2, y < 14, y < 17.6], [4.4, 5.2, 5.2 - (y - 14) * 0.45], 5.0 + (y - 17.6) * 0.5)
    m = (np.abs(x - 11) <= hw) & (y >= 1.2) & (y < 21.4)
    u = (x - (11 - hw)) / (2 * hw) + 0.04 * (((c.xx + c.yy) % 2) * 2 - 1)
    idx = (u >= 0.28).astype(int) + (u >= 0.6) + (u >= 0.86)
    for i, col in enumerate(G): c.paint(m & (idx == i), col)
    c.paint(m & (y >= 6.6) & (y < 8.4), G[3]); c.paint(m & (y >= 6.0) & (y < 6.6), G[0]) if False else None
    c.paint(m & (y >= 8.4) & (y < 10.4) & (((x >= 6.2) & (x < 9.0)) | ((x >= 13.0) & (x < 15.8))), NAVY[3])
    c.paint(m & (x >= 10.0) & (x < 12.2) & (y >= 8.4) & (y < 14.0), G[1]); c.paint(m & (x >= 10.0) & (x < 11.1) & (y >= 8.4) & (y < 13.8), G[0]); c.paint(m & (x >= 11.1) & (x < 12.2) & (y >= 8.4) & (y < 14.0), G[2])
    c.paint(m & (y >= 13.4) & (y < 14.4) & (x >= 9.2) & (x < 12.9), G[3])
    c.paint(m & (y >= 15.4) & (y < 16.4) & (x >= 7.6) & (x < 14.4), G[3]); c.paint(m & (y >= 14.4) & (y < 15.4) & (x >= 8.2) & (x < 13.8), G[1])
    c.paint(m & (y >= 17.4) & (y < 18.0), G[2]); c.paint(m & (y >= 6.0) & (y < 6.8) & (x < 11), G[1])
    return fin(c)

def taj():
    c = cv(); x = c.xx + .5; y = c.yy + .5; W = RAMP["white"]
    c.paint((y >= 19.0) & (y < 20.8) & (x >= 1) & (x < 21), RAMP["stone"][2]); c.paint((y >= 19.0) & (y < 19.8) & (x >= 1) & (x < 21), RAMP["stone"][1])
    for mx in (3.0, 19.0):
        mn = (np.abs(x - mx) < 1.3) & (y >= 7.0) & (y < 19.2); hband(c, mn, [W[0], W[1], W[2], W[3]], mx - 1.3, mx + 1.3, thr=(0.3, 0.6, 0.85))
        cap = c.ell(mx, 6.4, 1.9, 1.6) & (y < 7.4); c.paint(cap, W[1]); c.paint(cap & (x < mx), W[0]); c.paint(seg(c, (mx, 3.6), (mx, 5.2), 0.8), GOLD[3])
        c.paint(c.ell(mx, 3.4, 0.8, 0.8), GOLD[1]); c.paint((np.abs(x - mx) < 1.3) & (y >= 11) & (y < 11.8), W[3]); c.paint((np.abs(x - mx) < 1.3) & (y >= 15) & (y < 15.8), W[3])
    blk = (x >= 6.0) & (x < 16.0) & (y >= 11.0) & (y < 19.2); hband(c, blk, [W[0], W[1], W[2], W[3]], 6, 16, thr=(0.3, 0.62, 0.9))
    c.paint(blk & (y >= 11) & (y < 11.8), W[0]); c.paint(blk & (y >= 18.2), W[2])
    dome = c.ell(11, 8.2, 4.8, 5.4) & (y < 11.6); hband(c, dome, [W[0], W[1], W[2], W[3]], 6.2, 15.8, thr=(0.3, 0.62, 0.9)); c.paint(dome & (y < 4.4) & (x < 11), W[0])
    c.paint(seg(c, (11, 0.8), (11, 3.6), 1.0), GOLD[3]); c.paint(c.ell(11, 2.0, 1.1, 1.1), GOLD[1]); c.paint(seg(c, (10.6, 1.0), (10.6, 3.0), 0.5), GOLD[0])
    arch = pm(c, [(9.2, 19.2), (9.2, 14.4), (10.0, 13.0), (12.0, 13.0), (12.8, 14.4), (12.8, 19.2)]); c.paint(arch, NAVY[3]); c.paint(arch & (y > 17.6), NAVY[2])
    for sx in (7.4, 14.6): c.paint((np.abs(x - sx) < 0.8) & (y >= 14.2) & (y < 17.6), W[3])
    return fin(c)

def colosseum():
    c = cv(); x = c.xx + .5; y = c.yy + .5; SA = RAMP["sand"]
    ybot = 14.8 + 4.4 * np.sqrt(np.clip(1 - ((x - 11) / 10.4) ** 2, 0, 1))
    mass = c.ell(11, 7.8, 10.4, 4.6) | ((np.abs(x - 11) <= 10.4) & (y >= 7.8) & (y <= ybot))
    s = tone(c, mass, [SA[0], SA[1], SA[2], SA[3]], 4, 2, 24, 22, thr=(0.15, 0.55, 0.95))
    inner = c.ell(11, 7.4, 8.0, 3.0); c.paint(inner, NAVY[2]); c.paint(c.ell(11, 8.0, 6.6, 1.9), SA[3]); c.paint(inner & ~c.ell(11, 7.6, 8.0, 3.0) , SA[0])
    c.paint(mass & ~c.ell(11, 7.8, 10.4, 4.6) & (y < 8.6) & (x < 11), SA[0]); c.paint((c.ell(11, 7.8, 10.4, 4.6)) & ~c.ell(11, 8.1, 9.0, 3.6) & (y < 6) & (x < 11), SA[0])
    for (y0, y1) in ((10.6, 13.2), (14.6, 17.6)):
        for k in range(6):
            ax = 2.6 + k * 3.36
            arch = (np.abs(x - ax) < 1.0) & (y >= y0) & (y < y1 - 0.0) & (y < ybot - 1.2); c.paint(arch, NAVY[3]); c.paint(arch & (y < y0 + 0.9) & (np.abs(x - ax) > 0.55), SA[2])
        c.paint(mass & (y >= y1) & (y < y1 + 0.8) & (y < ybot), SA[2])
    return fin(c)

# ----------------------------------------------------------------------------------------------- FARO Y MAR
def lighthouse():
    c = cv(); x = c.xx + .5; y = c.yy + .5; W = RAMP["white"]
    c.paint(c.ell(11, 20.2, 9.0, 1.4), RAMP["stone"][3]); c.paint(c.ell(10.6, 19.9, 7.6, 0.9), RAMP["stone"][2])
    hw = 3.0 + (y - 6.2) * 0.15; tower = (np.abs(x - 11) <= hw) & (y >= 6.2) & (y < 19.6)
    u = (x - (11 - hw)) / (2 * hw) + 0.04 * (((c.xx + c.yy) % 2) * 2 - 1); idx = (u >= 0.25).astype(int) + (u >= 0.55) + (u >= 0.82)
    band = ((np.floor((y - 6.2) / 3.2)).astype(int) % 2 == 0)
    for i in range(4): c.paint(tower & band & (idx == i), RED[i]); c.paint(tower & ~band & (idx == i), W[i])
    c.paint(seg(c, (11, 15.4), (11, 15.5), 1.2) | ((np.abs(x - 11) < 0.8) & (y >= 9.6) & (y < 11.4)), NAVY[3]); c.paint((x >= 10) & (x < 12) & (y >= 16.8) & (y < 19.6), NAVY[3])
    gal = (np.abs(x - 11) <= 4.6) & (y >= 4.8) & (y < 6.4); hband(c, gal, RAMP["gold"], 6, 16, thr=(0.3, 0.6, 0.85)); c.paint((np.abs(x - 11) <= 4.6) & (y >= 4.4) & (y < 4.8) & (c.xx % 2 == 0), GOLD[5])
    lamp = (np.abs(x - 11) <= 2.5) & (y >= 2.0) & (y < 4.8); hband(c, lamp, RAMP["yellow"], 8.5, 13.5, thr=(0.3, 0.6, 0.85)); c.paint(lamp & (np.abs(x - 11) < 0.5), GOLD[5]); c.put(10, 3, WHITE[0])
    c.paint(pm(c, [(11, 0.4), (14.2, 2.2), (7.8, 2.2)]), RED[1]); c.paint(pm(c, [(11, 0.4), (10.2, 2.2), (7.8, 2.2)]), RED[0]); c.paint(pm(c, [(11, 0.4), (14.2, 2.2), (12.4, 2.2)]), RED[2])
    return fin(c)

def sail():
    c = cv(); x = c.xx + .5; y = c.yy + .5; W = RAMP["white"]
    hull = pm(c, [(1.2, 14.4), (20.8, 14.4), (17.6, 19.4), (4.4, 19.4)]); hband(c, hull, RAMP["wood"], 1, 21, thr=(0.2, 0.55, 0.85)); c.paint(hull & (y >= 15.6) & (y < 16.6), W[0]); c.paint(hull & (y >= 15.6) & (y < 16.6) & (x > 14), W[1])
    c.paint(hull & (y >= 14.4) & (y < 15.2), RAMP["wood"][0])
    for xx in range(1, 21): c.put(xx, 20 + (1 if (xx // 2) % 2 else 0), RAMP["blue"][1] if xx % 3 else RAMP["blue"][0]); c.put(xx, 21 if (xx // 2) % 2 == 0 else 20, RAMP["blue"][2]) if False else None
    c.paint((y >= 20) & (y < 21.4) & (x > 2) & (x < 20) & (((c.xx // 2) % 2) == 0), RAMP["blue"][1]); c.paint((y >= 20.4) & (y < 21.6) & (x > 2) & (x < 20) & (((c.xx // 2) % 2) == 1), RAMP["blue"][2])
    c.paint(seg(c, (11, 1.8), (11, 14.6), 1.0), RAMP["wood"][3])
    main = pm(c, [(11.8, 2.4), (11.8, 13.6), (19.6, 13.6)]); tone(c, main, [W[0], W[0], W[1], W[2]], 12, 3, 12, 14, thr=(0.1, 0.5, 0.9))
    fore = pm(c, [(10.2, 3.8), (10.2, 13.6), (3.2, 13.6)]); tone(c, fore, [W[1], W[1], W[2], W[3]], 5, 3, 10, 12, thr=(0.1, 0.5, 0.9))
    c.paint(pm(c, [(11, 1.0), (14.8, 2.2), (11, 3.4)]), RED[1]); c.paint(pm(c, [(11, 1.0), (14.8, 2.2), (12.5, 2.0)]), RED[0])
    return fin(c)

def anchor():
    c = cv(); x = c.xx + .5; y = c.yy + .5; ST = RAMP["steel"]
    seg_tone(c, (11, 5.6), (11, 18.8), 2.4, ST, thr=(-0.3, 0.2, 0.65)); seg_tone(c, (5.8, 7.6), (16.2, 7.6), 2.0, ST, thr=(-0.4, 0.2, 0.65))
    for ex in (5.4, 16.6): c.paint(c.ell(ex, 7.6, 1.5, 1.5), ST[1]); c.paint(c.ell(ex - 0.4, 7.2, 0.9, 0.9), ST[0])
    ring = c.ell(11, 3.2, 3.0, 3.0) & ~c.ell(11, 3.2, 1.2, 1.2); tone(c, ring, ST, 9, 1, 8, 8, thr=(-0.3, 0.3, 0.8))
    arms = c.ell(11, 12.6, 8.8, 8.0) & ~c.ell(11, 11.4, 5.9, 5.4) & (y >= 11.0); tone(c, arms, ST, 6, 10, 18, 14, thr=(-0.35, 0.15, 0.6))
    c.paint(seg(c, (2.6, 12.4), (3.0, 10.2), 2.4), ST[1]); c.paint(seg(c, (19.4, 12.4), (19.0, 10.2), 2.4), ST[2])
    c.paint(pm(c, [(0.8, 9.6), (4.8, 9.6), (2.8, 13.4)]), ST[1]); c.paint(pm(c, [(17.2, 9.6), (21.2, 9.6), (19.2, 13.4)]), ST[2]); c.paint(pm(c, [(0.8, 9.6), (2.8, 9.6), (2.4, 11.4)]), ST[0])
    c.paint(c.ell(11, 18.4, 1.6, 1.2) & (y > 18), ST[2])
    return fin(c)

def helm():
    c = cv(); x = c.xx + .5; y = c.yy + .5; cx = cy = 11.0; Wd = RAMP["wood"]
    for k in range(8):
        a = math.radians(k * 45 + 22.5); ex, ey = cx + 9.2 * math.cos(a), cy + 9.2 * math.sin(a)
        seg_tone(c, (cx, cy), (ex, ey), 1.9, Wd, thr=(-0.4, 0.15, 0.6)); c.paint(c.ell(ex + 0.4 * math.cos(a), ey + 0.4 * math.sin(a), 1.6, 1.6), GOLD[3]); c.paint(c.ell(ex - 0.2, ey - 0.3, 0.9, 0.9), GOLD[1])
    ring = c.ell(cx, cy, 7.8, 7.8) & ~c.ell(cx, cy, 5.2, 5.2); tone(c, ring, RAMP["gold"], 7, 6, 16, 16, thr=(-0.35, 0.1, 0.55))
    ball(c, cx, cy, 3.0, 3.0, RAMP["gold"], spec=False); c.paint(c.ell(10.2, 10.2, 1.0, 0.8), GOLD[0]); c.paint(c.ell(11, 11, 0.9, 0.9), GOLD[6])
    return fin(c)

def buoy():
    c = cv(); x = c.xx + .5; y = c.yy + .5; cx = cy = 11.0
    ang = np.arctan2(y - cy, x - cx); r = np.hypot(x - cx, y - cy); ring = (r <= 9.9) & (r >= 4.4)
    sec = (np.floor((ang + np.pi + np.pi / 4) / (np.pi / 2)).astype(int)) % 2 == 0
    s = (x - cx) / 14 + (y - cy) / 14 + 0.05 * (((c.xx + c.yy) % 2) * 2 - 1); idx = (s >= -0.4).astype(int) + (s >= 0.05) + (s >= 0.5)
    for i in range(4): c.paint(ring & sec & (idx == i), RED[i]); c.paint(ring & ~sec & (idx == i), [WHITE[0], WHITE[1], WHITE[2], WHITE[3]][i])
    c.paint(ring & (r < 5.4) & (idx >= 2), WHITE[3] if False else RED[3]) if False else None
    for k in range(4):
        a = math.radians(k * 90 + 45); bx, by = cx + 7.1 * math.cos(a), cy + 7.1 * math.sin(a); c.paint(c.ell(bx, by, 1.2, 1.2), GOLD[3]); c.put(int(bx), int(by), GOLD[0])
    c.paint(ring & (r >= 9.0) & (r < 9.9) & (x > cx) & (y > cy), RED[3] if False else NAVY[3]) if False else None
    return fin(c)

def shell():
    c = cv(); x = c.xx + .5; y = c.yy + .5; SH = rh("fff4ec", "ffcdbc", "ea9a8c", "b4606e")
    ang = np.arctan2(y - 19.4, x - 11); f = (ang + np.pi) / (np.pi / 9)                       # 9 costillas
    scall = 1 - 0.07 * (np.abs(np.sin(f * np.pi)))
    m = (((x - 11) / 10.2) ** 2 + ((y - 19.4) / 17.8) ** 2 <= scall ** 2) & (y <= 19.6)
    s = (x - 11) / 20 + (y - 19.4) / 40 + 0.04 * (((c.xx + c.yy) % 2) * 2 - 1); idx = (s >= -0.25).astype(int) + (s >= -0.05) + (s >= 0.2)
    # el abanico: luz arriba-izquierda
    for i in range(4): c.paint(m & (idx == i), SH[i])
    rib = m & ((f - np.floor(f)) < 0.17) & (y < 17.4); c.paint(rib, SH[3]); c.paint(rib & (x < 11), SH[2])
    ear = pm(c, [(7.4, 19.0), (14.6, 19.0), (13.6, 21.6), (8.4, 21.6)]); hband(c, ear, [SH[1], SH[2], SH[3], SH[3]], 7.4, 14.6, thr=(0.3, 0.6, 0.85)); c.paint(ear & (y < 19.6), SH[2])
    c.paint(m & (y > 17.8) & (np.abs(x - 11) < 2.5), SH[3]) if False else None
    return fin(c)

MONUMENTOS = [("pyramid", pyramid), ("eiffel", eiffel), ("pisa", pisa), ("moai", moai), ("taj", taj), ("colosseum", colosseum)]
FARO = [("lighthouse", lighthouse), ("sail", sail), ("anchor", anchor), ("helm", helm), ("buoy", buoy), ("shell", shell)]

if __name__ == "__main__":
    arrs = [f() for _, f in MONUMENTOS + FARO]
    zoom_sheet(arrs, HERE / "out" / "_sheet_c.png", k=10, cols=6)
