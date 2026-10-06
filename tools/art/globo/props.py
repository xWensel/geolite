"""El globo (maqueta): decorado del cielo y elementos de los eventos: nubes, pajaros, avion, zepelin, OVNI, globos lejanos, sol, luna, humo."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "trile"))
import numpy as np
from pix import *
from balloon import *

def shaded(c, mask, cx, cy, rx, ry, ramp, detail=True):
    d = ((c.xx + .5 - cx) / rx) * 0.45 + ((c.yy + .5 - cy) / ry) * 0.75
    d = d + (((c.xx + c.yy) % 2) * 2 - 1) * 0.07 * detail
    tone = np.where(d < -0.45, 0, np.where(d < 0.05, 1, np.where(d < 0.55, 2, 3)))
    for i in range(4): c.paint(mask & (tone == i), ramp[i])

CL_DAY = Rm("fffdf8", "e4ebff", "b8c6f0", "93a2d8")
CL_STORM = Rm("c4c0d8", "9490b4", "6a6890", "484668")

def cloud(W, H, seed, ramp=CL_DAY, flat=True):
    """nube sin contorno: bultos de circulos sobre una base casi plana, 4 tonos de arriba (luz) a abajo (sombra) con tramado"""
    rng = np.random.default_rng(seed); c = Canvas(W, H); m = np.zeros((H, W), bool)
    n = max(3, W // 13)
    for i in range(n):
        t = (i + .5) / n; cx = t * W + rng.uniform(-2, 2)
        r = rng.uniform(0.34, 0.52) * H * (1 - abs(t - .5) * 0.85)
        m |= c.ell(cx, H - 1.5 - r * 0.92, r * 1.3, r)
    m &= (c.yy < H - 1)
    # tono segun la profundidad bajo el borde superior de cada columna
    top = np.where(m.any(axis=0), np.argmax(m, axis=0), H); bot = H - 1
    s = (c.yy - top[None, :]) / np.maximum(1, bot - top[None, :])
    s = s + 0.14 * ((c.xx + .5) / W - 0.5) + (((c.xx + c.yy) % 2) * 2 - 1) * 0.06
    tone = np.where(s < 0.22, 0, np.where(s < 0.52, 1, np.where(s < 0.80, 2, 3)))
    for i in range(4): c.paint(m & (tone == i), ramp[i])
    return c.finish(outline=False)

BIRD = [
    ["x.......x", ".xx.....xx", "..xx...xx.", "...xxxxx..", ".....x...."],
    ["..........", "xxx.....xxx", "..xxx.xxx..", "....xxx...", ".....x...."],
    ["..........", "..........", "xxxxxxxxxxx", "....xxx...", ".....x...."],
    ["..........", "..xx...xx.", ".x..xxx..x", "x...xxx...x", ".....x...."],
]
def bird(f):
    rows = BIRD[f]; w = max(len(r) for r in rows); c = Canvas(w, len(rows))
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch == "x": c.put(i, j, hexc("2a1456"))
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch == "x" and j == 3 and 3 <= i <= 6: c.put(i, j, hexc("6a4cc0"))
    return c.finish(outline=False)

def plane(W=46, H=13):
    c = Canvas(W, H); xx, yy = c.xx + .5, c.yy + .5
    fus = c.ell(W * 0.52, H * 0.55, W * 0.44, H * 0.30)
    shaded(c, fus, W * 0.5, H * 0.55, W * 0.44, H * 0.30, WHITE)
    c.paint(fus & (xx < W * 0.18), WHITE[2])
    tail = (xx >= W * 0.08) & (xx <= W * 0.22) & (yy <= H * 0.55) & (yy >= H * 0.55 - (xx - W * 0.08) * 0.0 - 5) & ((yy - (H * 0.55 - 5)) >= (W * 0.22 - xx) * 0.0)
    c.paint(tail & (yy >= 1) & (yy < H * 0.5), RED[1]); c.paint(tail & (xx > W * 0.17) & (yy < H * 0.5), RED[2])
    wing = (xx >= W * 0.38) & (xx <= W * 0.62) & (yy >= H * 0.55) & (yy <= H * 0.55 + 4 - (xx - W * 0.38) * 0.0)
    c.paint(wing & (yy < H - 1), WHITE[2]); c.paint(wing & (yy >= H * 0.55 + 2), WHITE[3])
    for i in range(7):
        c.put(int(W * 0.46) + i * 2, int(H * 0.5), hexc("3fa5f0"))
    c.paint(c.ell(W * 0.88, H * 0.5, 2.6, 1.6), hexc("3fa5f0")); c.paint(c.ell(W * 0.87, H * 0.45, 1.2, 0.7), hexc("b4ecff"))
    return c.finish()

def zeppelin(W=72, H=26):
    c = Canvas(W, H); xx, yy = c.xx + .5, c.yy + .5
    body = c.ell(W * 0.5, H * 0.42, W * 0.46, H * 0.38)
    shaded(c, body, W * 0.5, H * 0.42, W * 0.46, H * 0.38, CREAM)
    for a in (0.32, 0.5, 0.68):
        c.paint(body & (np.abs(xx - W * a) < 1.6), RED[1]); c.paint(body & (np.abs(xx - W * a) < 1.6) & (yy > H * 0.55), RED[2])
    fin = ((xx < W * 0.14) & (np.abs(yy - H * 0.42) < 2 + (W * 0.14 - xx) * 0.45) & (xx > 0.5))
    c.paint(fin, RED[2]); c.paint(fin & (yy < H * 0.42), RED[1])
    gon = (xx > W * 0.42) & (xx < W * 0.6) & (yy >= H * 0.78) & (yy < H - 1)
    c.paint(gon, WHITE[2]); c.paint(gon & (yy == int(H * 0.78) + 1), hexc("3fa5f0")); c.paint(gon & (xx > W * 0.54), WHITE[3])
    return c.finish()

def ufo(W=40, H=18):
    c = Canvas(W, H); xx, yy = c.xx + .5, c.yy + .5
    dome = c.ell(W * 0.5, H * 0.36, W * 0.2, H * 0.34) & (yy < H * 0.5)
    shaded(c, dome, W * 0.5, H * 0.36, W * 0.2, H * 0.34, Rm("e8fcff", "7ae0f0", "3ab0d0", "2078a0"))
    c.put(int(W * 0.46), int(H * 0.2), hexc("ffffff"))
    sau = c.ell(W * 0.5, H * 0.62, W * 0.48, H * 0.22)
    shaded(c, sau, W * 0.5, H * 0.62, W * 0.48, H * 0.22, WHITE)
    for i in range(6):
        x = int(W * 0.14) + i * int(W * 0.14); c.put(x, int(H * 0.66), hexc("ffe03a") if i % 2 == 0 else hexc("ff6470"))
    c.paint(c.ell(W * 0.5, H * 0.8, W * 0.2, H * 0.1) & (yy > H * 0.74), VIOL[2])
    return c.finish()

def smallballoon(i, s=1):
    liv = LIV[i % len(LIV)]; e = envelope(15, 17, liv, detail=False, G=3, mouth=3.4)
    b = basket(5, 3, detail=False)
    out = np.zeros((e.shape[0] + 7, e.shape[1], 4), np.uint8); out[:e.shape[0]] = e
    ox = (e.shape[1] - b.shape[1]) // 2; oy = e.shape[0] + 3
    for j in range(b.shape[0]):
        for k in range(b.shape[1]):
            if b[j, k, 3] and 0 <= oy + j < out.shape[0]: out[oy + j, ox + k] = b[j, k]
    for j in range(3):   # cuerdas
        out[e.shape[0] + j, 5 + 0] = (*GOLD[5], 255); out[e.shape[0] + j, e.shape[1] - 6] = (*GOLD[5], 255)
    return out

def sun(S=44):
    c = Canvas(S, S); out = np.zeros((S, S, 4), np.uint8)
    r = np.sqrt((c.xx + .5 - S / 2) ** 2 + (c.yy + .5 - S / 2) ** 2); ck = (c.xx + c.yy) % 2 == 0
    out[(r < S * 0.5) & ck] = (255, 200, 90, 70); out[(r < S * 0.44)] = (255, 214, 110, 55)
    core = r <= S * 0.30
    d = ((c.xx + .5 - S * 0.43) * 0.5 + (c.yy + .5 - S * 0.43) * 0.6) / (S * 0.3)
    for i, col in enumerate((GOLD[0], GOLD[1], GOLD[2], GOLD[3])):
        lo = (-9, -0.35, 0.15, 0.55)[i]; hi = (-0.35, 0.15, 0.55, 9)[i]
        out[core & (d >= lo) & (d < hi)] = (*col, 255)
    ring = (r > S * 0.30 - 0.2) & (r <= S * 0.30 + 1.0); out[ring] = (*GOLD[4], 255)
    return out

def moon(S=30):
    c = Canvas(S, S); disc = c.ell(S / 2, S / 2, S / 2 - 0.6, S / 2 - 0.6)
    shaded(c, disc, S * 0.4, S * 0.4, S * 0.5, S * 0.5, Rm("ffffff", "ece6ff", "b8aae0", "8a78c0"))
    for (cx, cy, r) in ((0.62, 0.35, 0.12), (0.35, 0.62, 0.09), (0.66, 0.68, 0.075), (0.28, 0.3, 0.06)):
        m = c.ell(S * cx, S * cy, S * r, S * r); c.paint(m & disc, Rm("c8bcec")[0]); c.paint(m & disc & (c.yy < S * cy - 0.3 * S * r), hexc("a898d8"))
    return c.finish()

def puff(S, seed=1):
    rng = np.random.default_rng(seed); c = Canvas(S, S); m = np.zeros((S, S), bool)
    for _ in range(max(4, S // 5)):
        a = rng.uniform(0, 6.28); d = rng.uniform(0, S * 0.26); r = rng.uniform(0.16, 0.28) * S
        m |= c.ell(S / 2 + np.cos(a) * d, S / 2 + np.sin(a) * d, r, r)
    d = ((c.xx + .5 - S * 0.4) * 0.5 + (c.yy + .5 - S * 0.38) * 0.6) / (S * 0.4) + (((c.xx + c.yy) % 2) * 2 - 1) * 0.08
    tone = np.where(d < -0.3, 0, np.where(d < 0.2, 1, np.where(d < 0.6, 2, 3)))
    for i, col in enumerate(Rm("fffbe8", "e8dcc8", "b8a8a0", "807080")): c.paint(m & (tone == i), col)
    return c.finish(outline=False)

def haze(W=640, H=44):
    """banco de bruma del horizonte: mascara blanca con tramado ordenado (se tiñe con el color del cielo)"""
    B = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
    out = np.zeros((H, W, 4), np.uint8); yy, xx = np.mgrid[0:H, 0:W]
    p = (1 - yy / H) ** 1.35; out[B[yy % 4, xx % 4] < p] = (255, 255, 255, 255); return out
