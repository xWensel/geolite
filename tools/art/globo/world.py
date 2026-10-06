"""El globo (maqueta): el MAPA de la Tierra en pixel art. Sale de la tierra real (Natural Earth, tools/pxkit.land_mask) a 5,33 px/grado.
Tres ventanas de 120 grados de ancho (America, Europa-Africa-Asia occidental, Asia oriental-Oceania) apiladas de polo a polo, de modo que
el vuelo al norte las recorre en anillo (hielo con hielo en las costuras). Capas: mapa base, cordilleras (sprites con sombra; paralaje propio) y luces de ciudades."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "trile"))
import numpy as np
from PIL import Image
from pix import *
from pxkit import land_mask, dilate

SC = 16 / 3.0
WW, WH, WIN = 1920, 960, 640       # mundo (px), alto de una ventana, ancho de una ventana
OC = [hexc(c) for c in ("8ad4fa", "58b0f2", "3a88e4", "2c68c8", "2250a8", "1a3c88")]
GRASS = [hexc(c) for c in ("b4e070", "86c860", "5ea856", "3e8a56", "2a6a50")]
FOREST = [hexc(c) for c in ("6aae5a", "468c52", "30704a", "225840", "184434")]
JUNGLE = [hexc(c) for c in ("58b052", "34904c", "227446", "185c3c", "104630")]
SAVA = [hexc(c) for c in ("d8d476", "bcc060", "9aa850", "788c44", "5a7040")]
DESERT = [hexc(c) for c in ("fce8a8", "f0d088", "e0b468", "c89452", "a87444")]
TUNDRA = [hexc(c) for c in ("c8d8b0", "a8c0a0", "88a890", "6c8c7c", "52706a")]
SNOW = [hexc(c) for c in ("ffffff", "e8f0ff", "c8d8f4", "a8bce6", "88a0d4")]
HIGH = [hexc(c) for c in ("c4ae78", "a8925e", "8a7650", "6c5c44", "50443c")]
CATS = [GRASS, DESERT, JUNGLE, SAVA, FOREST, TUNDRA, SNOW, HIGH]

def vnoise(h, w, cell, seed):
    rng = np.random.default_rng(seed); gh, gw = h // cell + 3, w // cell + 3
    g = (rng.random((gh, gw)) * 255).astype(np.uint8)
    a = np.asarray(Image.fromarray(g).resize((gw * cell, gh * cell), Image.BICUBIC), dtype=np.float32) / 255
    return a[:h, :w]

def fbm(h, w, cell, seed):
    return (vnoise(h, w, cell, seed) * 0.55 + vnoise(h, w, max(2, cell // 2), seed + 1) * 0.3 + vnoise(h, w, max(2, cell // 4), seed + 2) * 0.15)

def wrapd(a): return (a + 180) % 360 - 180

# (lat, lon, radio lat, radio lon)
DESERTS = [(23, 10, 9, 28), (22, 30, 8, 10), (24, 46, 9, 14), (30, 62, 6, 12), (41, 95, 6, 20), (-24, 18, 8, 9), (-26, 133, 9, 17), (34, -112, 6, 8),
           (-22, -69, 7, 3), (-42, -68, 8, 5), (7, 45, 5, 5), (36, 62, 3, 8), (27, 8, 5, 10)]
JUNGLES = [(-4, -62, 9, 14), (0, 22, 7, 12), (2, 108, 9, 24), (10, -84, 5, 6), (7, -5, 4, 12), (25, 92, 4, 6), (-5, 142, 5, 10), (4, -73, 5, 4),
           (-20, -48, 5, 5), (-2, 113, 4, 8), (18, 100, 5, 8), (-18, 47, 4, 3)]
# cordilleras: (lat, lon) puntos; paso en px y altura (1 baja, 3 alta)
RANGES = [
    ([(62, -150), (61, -142), (60, -135)], 3), ([(60, -128), (54, -122), (49, -116), (43, -110), (36, -106), (31, -106)], 3), ([(46, -72), (41, -76), (36, -82)], 1),
    ([(30, -108), (24, -105), (18, -100), (16, -94)], 2), ([(10, -73), (4, -76), (-2, -78), (-10, -77), (-16, -71), (-23, -68), (-30, -70), (-38, -71), (-46, -72), (-53, -72)], 3),
    ([(46, 6.5), (46.6, 10), (47, 13), (46.5, 16)], 3), ([(42.8, -1.5), (42.7, 1), (42.4, 3)], 2), ([(49, 19), (48, 23), (46, 25), (45.5, 24)], 2), ([(43.3, 40), (42.6, 45), (41.8, 48)], 3),
    ([(35, -5.5), (32, -6.5), (31, -8), (33, 3), (36, 8)], 2), ([(68, 66), (62, 60), (56, 59), (52, 59)], 2), ([(38, 45), (34, 48), (30, 52), (27, 56)], 2),
    ([(36, 70), (35, 76), (32, 80), (29, 85), (27.8, 90), (28, 96)], 3), ([(42, 74), (42, 82), (42, 88)], 3), ([(50, 86), (49, 91), (50, 98)], 2), ([(36, 82), (35.5, 90), (35, 96)], 2),
    ([(20, 73), (15, 74), (10, 77)], 1), ([(13, 38), (9, 38), (6, 38)], 2), ([(0, 35), (-3, 37)], 2), ([(-25, 30), (-29, 29), (-31, 28)], 2), ([(-16, 145), (-26, 150), (-35, 148.5)], 1),
    ([(68, 17), (64, 12), (61, 8)], 2), ([(36, 138), (36.5, 137)], 2), ([(5, 96), (0, 100), (-5, 104)], 2), ([(-4, 138), (-5.5, 144)], 2), ([(-43.5, 170), (-44.5, 168)], 3),
    ([(40, 12), (43, 13), (38, 15)], 1), ([(40, 20), (42, 22)], 1), ([(60, 98), (64, 110)], 1), ([(55, 125), (60, 135)], 2), ([(64, -20), (65, -17)], 1),
]
CITIES = [(40.7, -74, 5), (41.9, -87.6, 4), (34, -118.3, 5), (19.4, -99.1, 5), (-23.5, -46.6, 5), (-34.6, -58.4, 4), (51.5, -0.1, 4), (48.9, 2.3, 4), (40.4, -3.7, 3), (52.5, 13.4, 3),
          (41.9, 12.5, 3), (55.7, 37.6, 4), (41, 29, 4), (30, 31.2, 4), (6.5, 3.4, 3), (-26.2, 28, 3), (19, 72.9, 4), (28.6, 77.2, 4), (39.9, 116.4, 4), (31.2, 121.5, 5),
          (35.7, 139.7, 5), (37.5, 127, 4), (-33.9, 151.2, 3), (-6.2, 106.8, 4), (23.1, 113.3, 4), (14.6, 121, 3), (-1.3, 36.8, 2), (33.6, -84.4, 3), (29.8, -95.4, 3), (45.5, -73.6, 3),
          (50.4, 30.5, 3), (59.9, 30.3, 3), (24.9, 67, 3), (35.7, 51.4, 3), (-12, -77, 3), (4.7, -74, 3), (-33.4, -70.7, 3), (59.3, 18, 2), (-37.8, 145, 3), (3.1, 101.7, 3)]
ZONES = [(48, 8, 10, 22, 0.06), (38, -84, 8, 12, 0.04), (35, 118, 8, 10, 0.06), (34, 135, 4, 5, 0.07), (24, 80, 8, 9, 0.04), (-23, -46, 5, 5, 0.04), (30, 31, 5, 3, 0.05)]

def build():
    hi = land_mask(5760); L = hi.reshape(WH, 3, WW, 3).sum(axis=(1, 3)) >= 5
    lat = np.repeat((90 - (np.arange(WH) + .5) * 180 / WH)[:, None], WW, axis=1)
    L[lat < -70] = True
    nb = np.roll(L,1,0).astype(int)+np.roll(L,-1,0)+np.roll(L,1,1)+np.roll(L,-1,1); L &= (nb >= 1)
    nA = fbm(WH, WW, 24, 11); L[(lat < -64) & (lat >= -70) & (nA > 0.52)] = True
    L = np.roll(L, -160, axis=1)
    lon = np.repeat(((np.arange(WW) + .5) * 360 / WW - 150)[None, :], WH, axis=0); lonn = wrapd(lon)
    n1, n2, n3 = fbm(WH, WW, 40, 21), fbm(WH, WW, 9, 31), fbm(WH, WW, 5, 41)
    rng = np.random.default_rng(5)
    # categorias de tierra
    a = np.abs(lat) + (n1 - 0.5) * 9
    cat = np.where(a >= 24, 0, 3)
    cat = np.where(a >= 50, 4, cat); cat = np.where(a >= 62, 5, cat); cat = np.where(a >= 72, 6, cat)
    def zone(la, lo, rla, rlo):
        d = ((lat - la) / rla) ** 2 + (wrapd(lonn - lo) / rlo) ** 2
        return d + (n2 - 0.5) * 0.55 < 1.0
    for z in JUNGLES: cat = np.where(zone(*z) & (a < 30), 2, cat)
    for z in DESERTS: cat = np.where(zone(*z), 1, cat)
    cat = np.where((np.abs(lat) >= 72), 6, cat)
    # --- mar: distancia a la costa, plataforma clara y fondo con manchas
    d = np.zeros((WH, WW), np.int8); cur = L.copy()
    for i in range(1, 9):
        nxt = dilate(cur, 1, True); d[nxt & ~cur] = i; cur = nxt
    d[~cur] = 9
    ocean = np.zeros((WH, WW, 3), np.uint8); ck = (np.add.outer(np.arange(WH), np.arange(WW)) % 2 == 0)
    oi = np.where(d <= 1, 0, np.where(d == 2, np.where(ck, 0, 1), np.where(d <= 3, 1, np.where(d <= 4, np.where(ck, 1, 2), np.where(d <= 6, 2, np.where(d <= 8, np.where(ck, 2, 3), 3))))))
    deep = (d >= 9)
    oi = np.where(deep, np.where(n1 > 0.62, 4, np.where(n1 > 0.50, np.where(ck, 4, 3), 3)), oi)
    oi = np.where(deep & (n1 > 0.74), np.where(ck, 5, 4), oi)
    for i in range(6): ocean[oi == i] = OC[i]
    rip = (rng.random((WH, WW)) < 0.011) & deep
    rip |= np.roll(rip, 1, axis=1) & (rng.random((WH, WW)) < 0.6)
    ocean[rip] = OC[1]
    ice = (~L) & ((np.abs(lat) > 75 + (n1 - 0.5) * 12))
    for i, col in enumerate(SNOW[:4]):
        ocean[ice & (np.where(ck, 0, 1) + (n2 * 3).astype(int) == i)] = col
    # --- tierra: rampas por categoria con ruido y tramado; la costa se oscurece 1 px
    land = np.zeros((WH, WW, 3), np.uint8)
    base_i = np.clip(((n2 * 0.75 + n3 * 0.25) * 4.2 + (ck * 2 - 1) * 0.0).astype(int), 0, 4)
    idx = np.clip(((n2 * 0.5 + n3 * 0.5 - 0.5) * 9.0 + 2.2 + np.where(ck, 0.4, -0.4)).astype(int), 0, 4)
    # picos se marcan despues: ahora las alturas del suelo "montanoso" (cat 7) alrededor de cada cordillera
    peaks = []   # (x_win, y_ring, size, kind, shade)
    for pts, hgt in RANGES:
        P = []
        for (la, lo) in pts:
            x = ((lo + 150) % 360) * SC; P.append((x, (90 - la) * SC))
        for (x0, y0), (x1, y1) in zip(P[:-1] + ([P[0]] if len(P) == 1 else []), P[1:] + ([P[0]] if len(P) == 1 else [])):
            if abs(x1 - x0) > 700: continue
            dist = np.hypot(x1 - x0, y1 - y0); step = 18.5 - hgt * 1.6; n = max(1, int(dist / step))
            for k in range(n + 1):
                tt = k / max(1, n); x = x0 + (x1 - x0) * tt + rng.uniform(-4, 4); y = y0 + (y1 - y0) * tt + rng.uniform(-5, 5)
                if rng.random() < 0.22: continue
                peaks.append((x, y, hgt if rng.random() < 0.7 else max(1, hgt - 1)))
    high = np.zeros((WH, WW), bool)
    for (x, y, h) in peaks:
        xi, yi = int(x), int(y)
        # x esta en el mundo girado (0..1920 = -150..210); y en filas
        if 0 <= yi < WH and 0 <= xi < WW:
            r = 4 + h
            y0_, y1_, x0_, x1_ = max(0, yi - r), min(WH, yi + r + 1), max(0, xi - r), min(WW, xi + r + 1)
            yy, xx = np.mgrid[y0_:y1_, x0_:x1_]
            high[y0_:y1_, x0_:x1_] |= ((yy - yi) ** 2 + (xx - xi) ** 2 <= r * r)
    cat = np.where(high & (cat != 6) & (n3 > 0.28), 7, cat)
    for ci, ramp in enumerate(CATS):
        m = (cat == ci)
        for i in range(5): land[m & (idx == i)] = ramp[i]
    # costa: pixel de tierra con vecino de mar
    coast = L & ~(np.roll(L, 1, 0) & np.roll(L, -1, 0) & np.roll(L, 1, 1) & np.roll(L, -1, 1))
    coast_col = np.zeros_like(land);
    for ci, ramp in enumerate(CATS): coast_col[cat == ci] = ramp[4]
    land[coast] = coast_col[coast]
    img = np.where(L[:, :, None], land, ocean).astype(np.uint8)
    # cordilleras (sprites) + luces
    peaks_img = np.zeros((WH * 3, WIN, 4), np.uint8); lights = np.zeros((WH * 3, WIN, 4), np.uint8)
    return img, L, peaks, rng, peaks_img, lights, cat

def peak_sprite(h, rng, big):
    w = [10, 13, 18][h - 1]; ht = [11, 15, 20][h - 1]
    c = Canvas(w, ht); xx, yy = c.xx + .5, c.yy + .5; cx = w / 2
    hw = (w / 2 - 0.3) * np.clip(((yy) / ht) ** 0.92, 0, 1)
    m = (np.abs(xx - cx) <= hw) & (yy > 0.4)
    ridge = cx + np.sin(yy * 1.7 + rng.uniform(0, 6)) * 0.7
    lit = xx < ridge
    c.paint(m & lit, hexc("d2b684")); c.paint(m & ~lit, hexc("7a5a58"))
    c.paint(m & lit & (yy > ht * 0.45) & (((c.xx + c.yy) % 2) == 0), hexc("b49468")); c.paint(m & ~lit & (yy > ht * 0.45) & (((c.xx + c.yy) % 2) == 0), hexc("62465a"))
    c.paint(m & lit & (yy > ht * 0.72), hexc("b49468")); c.paint(m & ~lit & (yy > ht * 0.72), hexc("62465a"))
    snow = m & (yy < ht * (0.38 + 0.08 * (h - 1)) + np.sin(xx * 1.9 + rng.uniform(0, 6)) * 1.3)
    c.paint(snow & lit, hexc("ffffff")); c.paint(snow & ~lit, hexc("b8c8ee"))
    c.paint(snow & ~lit & (((c.xx + c.yy) % 2) == 0), hexc("d4def8"))
    return c.finish()

def compose():
    img, L, peaks, rng, peaks_img, lights, cat = build()
    wins = [img[:, k * WIN:(k + 1) * WIN] for k in range(3)]
    mp = np.concatenate(wins, axis=0)                   # (2880, 640, 3)
    # cordilleras: se dibujan en la capa de picos con su sombra; x del mundo girado -> ventana
    peaks.sort(key=lambda p: p[1])
    spr = {h: [peak_sprite(h, rng, False) for _ in range(5)] for h in (1, 2, 3)}
    for (x, y, h) in peaks:
        k = int(x // WIN); xw = x - k * WIN
        if k > 2 or not (0 <= int(y) < WH): continue
        xi, yi = int(xw), int(y) + k * WH
        # solo sobre tierra
        if not L[int(y), int(x)]: continue
        s = spr[h][rng.integers(0, 5)]; sh_, sw_ = s.shape[:2]
        # sombra a la derecha-abajo (alfa)
        for j in range(sh_ - 2):
            for i in range(sw_):
                if s[j, i, 3]:
                    ox, oy = xi - sw_ // 2 + i + 2 + j // 4, yi - sh_ + j + 4
                    if 0 <= ox < WIN and 0 <= oy < WH * 3 and peaks_img[oy, ox, 3] < 90 and not (peaks_img[oy, ox, 3] == 255): peaks_img[oy, ox] = (20, 8, 40, 90)
        for j in range(sh_):
            for i in range(sw_):
                if s[j, i, 3]:
                    ox, oy = xi - sw_ // 2 + i, yi - sh_ + j + 2
                    if 0 <= ox < WIN and 0 <= oy < WH * 3: peaks_img[oy, ox] = s[j, i]
    # luces de ciudades
    for (la, lo, r) in CITIES:
        x = ((lo + 150) % 360) * SC; y = (90 - la) * SC; k = int(x // WIN)
        if k > 2: continue
        xw = int(x - k * WIN); yw = int(y) + k * WH
        for _ in range(int(r * 5)):
            ox = xw + int(rng.normal(0, r * 0.9)); oy = yw + int(rng.normal(0, r * 0.7))
            if 0 <= ox < WIN and 0 <= oy < WH * 3 and L[min(WH - 1, max(0, oy - k * WH)), min(WW - 1, max(0, ox + k * WIN))]:
                lights[oy, ox] = (255, 226, 140, 255) if rng.random() < 0.55 else (255, 170, 80, 255)
    for (la, lo, rla, rlo, dens) in ZONES:
        x = ((lo + 150) % 360) * SC; y = (90 - la) * SC; k = int(x // WIN)
        if k > 2: continue
        for _ in range(int(rla * rlo * SC * SC * dens * 3)):
            ox = int(x - k * WIN + rng.normal(0, rlo * SC * 0.45)); oy = int(y + rng.normal(0, rla * SC * 0.45)) + k * WH
            if 0 <= ox < WIN and 0 <= oy < WH * 3 and L[min(WH - 1, max(0, oy - k * WH)), min(WW - 1, max(0, ox + k * WIN))]: lights[oy, ox] = (255, 200, 110, 255)
    ext = 400   # copia del principio al final para que el anillo no tenga costura al dibujar
    mp = np.concatenate([mp, mp[:ext]], 0); peaks_img = np.concatenate([peaks_img, peaks_img[:ext]], 0); lights = np.concatenate([lights, lights[:ext]], 0)
    return mp, peaks_img, lights

if __name__ == "__main__":
    out = Path(__file__).resolve().parent / "out"; out.mkdir(exist_ok=True)
    mp, pk, li = compose()
    Image.fromarray(mp).save(out / "world_map.png"); Image.fromarray(pk, "RGBA").save(out / "world_peaks.png"); Image.fromarray(li, "RGBA").save(out / "world_lights.png")
    # vista de prueba: ventana 1 (Europa-Africa) con picos y luces
    k = 1; base = Image.fromarray(mp[k * WH:k * WH + WH]).convert("RGBA")
    base.alpha_composite(Image.fromarray(pk[k * WH:k * WH + WH], "RGBA")); base.convert("RGB").crop((0, 200, 640, 700)).save(out / "view_world_w1.png")
    b0 = Image.fromarray(mp[0:WH]).convert("RGBA"); b0.alpha_composite(Image.fromarray(pk[0:WH], "RGBA")); b0.convert("RGB").crop((0, 150, 640, 650)).save(out / "view_world_w0.png")
    print(mp.shape)
