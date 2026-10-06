"""El globo (maqueta): el globo aerostatico, su cesta, el quemador y la llama. Mismo metodo que los cubiletes del trile:
mascaras + rampas de 4 tonos sobre la rejilla nativa, luz arriba-izquierda, tramado de 1 px y contorno indigo de 1 px por fuera."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "trile"))
import numpy as np
from pix import *          # Canvas, hexc, INK, GOLD, RED, WHITE, NAVY, PLUM, save, zoom_sheet, pad

def Rm(*cs): return [hexc(c) for c in cs]

# rampas (luz, base, sombra, fondo). RED sale del arte del juego; las demas, tonos nuevos coherentes (desplazamiento de tono: sombras hacia el violeta)
CREAM = Rm("fffbe8", "f6e2b8", "d9b98a", "a88260")
SKYR = Rm("b4ecff", "4ab4f5", "2a72d0", "183c8e")
EMER = Rm("98f5c0", "2cc47c", "188a5a", "0c5546")
ORNG = Rm("ffd488", "ff9a3c", "e0601e", "a03212")
VIOL = Rm("d8b4ff", "9a5ce8", "6234b0", "3a1a78")
PINK = Rm("ffc0da", "ff6aa6", "c8387e", "862058")
MINT = Rm("d0fff2", "7aeccc", "3cb8a0", "1e7a78")
YELL = Rm("fff6a0", "ffe03a", "e0b01a", "a87a10")
MIDN = Rm("8a6cf0", "4a2eb0", "2a1480", "140858")
GOLDR = [GOLD[1], GOLD[3], GOLD[5], GOLD[7]]
GOLDL = [GOLD[0], GOLD[2], GOLD[4], GOLD[6]]
REDR = RED

LIV = [   # librea: gajos que se alternan y cinta (cinturon y falda)
    dict(id="crupier", es="Don Crupier", en="Don Crupier", g=[REDR, CREAM], belt=GOLDR),
    dict(id="cielo", es="Cielo despejado", en="Clear sky", g=[SKYR, CREAM], belt=GOLDR),
    dict(id="arcoiris", es="Arcoíris", en="Rainbow", g=[REDR, ORNG, YELL, EMER, SKYR, VIOL, PINK], belt=CREAM),
    dict(id="esmeralda", es="Esmeralda y oro", en="Emerald & gold", g=[EMER, CREAM], belt=GOLDR),
    dict(id="ciruela", es="Ciruela y plata", en="Plum & silver", g=[VIOL, WHITE], belt=WHITE),
    dict(id="atardecer", es="Atardecer", en="Sunset", g=[ORNG, YELL], belt=REDR),
    dict(id="medianoche", es="Medianoche", en="Midnight", g=[MIDN, GOLDR], belt=GOLDL),
    dict(id="caramelo", es="Caramelo", en="Candy", g=[PINK, MINT], belt=CREAM),
]

def envelope(W=84, H=72, liv=None, detail=True, mouth=None, G=7, emblem=True, es=1.0, skirt=7.0):
    """la tela del globo: cupula arriba, cono hacia la boca; gajos que convergen, cinturon curvo, falda y rombo del crupier en el gajo central"""
    liv = liv or LIV[0]; g, belt = liv["g"], liv["belt"]
    c = Canvas(W, H); xx, yy = c.xx + .5, c.yy + .5
    cx = W / 2; half = W / 2 - 0.4; mouth = mouth or W * 0.15
    t = yy / H; TT = 0.44
    up = np.clip((TT - t) / TT, 0, 1)
    dome = half * np.sqrt(np.clip(1 - up ** 2, 0, 1))
    uu = np.clip((t - TT) / (1 - TT), 0, 1)
    cone = mouth + (half - mouth) * (1 - uu ** 1.9)
    hw = np.where(t < TT, dome, cone)
    dx = xx - cx
    body = np.abs(dx) <= hw
    u = np.clip(dx / np.maximum(hw, 1.0), -1, 1)
    z = np.sqrt(np.clip(1 - u ** 2, 0, 1))
    v = np.where(t < TT, -up, uu * 0.55)
    nx, ny = u, v * 0.62
    nz = np.sqrt(np.clip(1 - nx ** 2 - ny ** 2, 0.05, 1))
    L = np.array([-0.52, -0.50, 0.69]); L = L / np.linalg.norm(L)
    I = nx * L[0] + ny * L[1] + nz * L[2]
    ck = (((c.xx + c.yy) % 2) * 2 - 1) * (0.075 if detail else 0.0)
    tone = np.where(I + ck >= 0.80, 0, np.where(I + ck >= 0.42, 1, np.where(I + ck >= 0.06, 2, 3)))
    phi = np.degrees(np.arcsin(u)); gi = np.clip(np.floor((phi + 90) / (180 / G)).astype(int), 0, G - 1)
    gnext = np.concatenate([gi[:, 1:], gi[:, -1:]], axis=1)
    seam = body & (gi != gnext) & (np.abs(u) < 0.92)
    for k in range(G):
        ramp = g[(k + 1) % len(g)]; gm = body & (gi == k)
        for i in range(4):
            c.paint(gm & (tone == i) & ~seam, ramp[i]); c.paint(gm & seam & (tone == i), ramp[min(3, i + 1)])
    # cinturon (curvo, sonrisa) y cinta fina; falda de la boca
    tc = t + 0.035 * (1 - z)
    def band(a, b, ramp):
        m = body & (tc >= a) & (tc < b)
        for i in range(4): c.paint(m & (tone == i), ramp[i])
        return m
    m1 = band(0.60, 0.665, belt); band(0.80, 0.83, belt)
    c.paint(m1 & (tc < 0.60 + 1.1 / H), belt[3])
    sk = body & (t >= 1 - skirt / H)
    for i in range(4): c.paint(sk & (tone == i), belt[min(3, i)] if i < 2 else belt[3 if i == 3 else 2])
    c.paint(sk & (t < 1 - (skirt - 1.0) / H), belt[3])
    # rombo de oro en el gajo central (el "diamante" del crupier)
    if detail and emblem:
        y0 = 0.29 * H
        dd = lambda r: (np.abs(dx) / (5.6 * es * r) + np.abs(yy - y0) / (8.8 * es * r)) <= 1.0
        outer, inner = dd(1.0) & body, dd(0.46) & body
        c.paint(outer, GOLD[1]); c.paint(outer & (dx > 0.3), GOLD[3]); c.paint(outer & (dx > 0.3) & (yy > y0 + 1), GOLD[5]); c.paint(outer & (dx <= 0.3) & (yy < y0 - 2), GOLD[0])
        cen = g[(3 + 1) % len(g)]
        c.paint(inner, cen[3]); c.paint(inner & (dx < -0.6) & (yy < y0 - 0.5), cen[1])
    # brillo especular (brillo blanco pequeno arriba a la izquierda)
    if detail:
        sx = cx - 0.50 * 0.866 * half; sy = 0.22 * H
        sp = c.ell(sx, sy, 3.4, 2.4) & body
        for k in range(G):
            c.paint(sp & (gi == k), g[(k + 1) % len(g)][0])
    return c.finish()

def basket(W=44, H=19, detail=True):
    """cesta de mimbre: trama de ladrillos de 4x2, borde trenzado, postes, placa de laton con rombo rojo"""
    c = Canvas(W, H); xx, yy = c.xx + .5, c.yy + .5; cx = W / 2
    hw = W / 2 - 0.3 - np.clip((yy - 4) / max(1, H - 4), 0, 1) * 2.4
    body = np.abs(xx - cx) <= hw
    u = (xx - cx) / hw
    cell = (c.xx + 2 * ((c.yy // 2) % 2)) % 4
    base = np.where(c.yy % 2 == 0, 3, 4); base = np.where(cell == 3, 6, base)
    sh = np.where(u < -0.45, -1, np.where(u > 0.35, 1, 0)) + (u > 0.75)
    idx = np.clip(base + sh, 1, 7)
    for i in range(1, 8): c.paint(body & (idx == i) & (c.yy >= 4), GOLD[i])
    # borde trenzado (4 filas)
    rim = body & (c.yy < 4)
    c.paint(rim & (c.yy == 0), GOLD[1]); c.paint(rim & (c.yy == 0) & (c.xx % 2 == 0), GOLD[0])
    c.paint(rim & (c.yy >= 1) & (c.yy <= 2), GOLD[3]); c.paint(rim & (c.yy >= 1) & (c.yy <= 2) & ((c.xx + c.yy) % 4 < 2), GOLD[2])
    c.paint(rim & (c.yy == 3), GOLD[5]); c.paint(rim & (c.yy == 3) & (u > 0.35), GOLD[6])
    c.paint(rim & (u > 0.6) & (c.yy <= 2), GOLD[4])
    c.paint(body & (c.yy == 4), GOLD[5]); c.paint(body & (c.yy == 4) & (u > 0.4), GOLD[6])    # sombra del borde
    # postes
    c.paint(body & (c.yy >= 5) & (c.xx == 3), GOLD[2]); c.paint(body & (c.yy >= 5) & (c.xx == W - 4), GOLD[6])
    # fondo
    c.paint(body & (c.yy >= H - 2), GOLD[6]); c.paint(body & (c.yy == H - 1), GOLD[7])
    if detail:    # placa de laton con el rombo del crupier
        pm = (np.abs(xx - cx) <= 5.2) & (c.yy >= 7) & (c.yy <= 13)
        c.paint(pm, GOLD[1]); c.paint(pm & (c.yy == 7), GOLD[0]); c.paint(pm & (c.yy == 13), GOLD[5]); c.paint(pm & (xx > cx + 4.0), GOLD[3])
        dm = (np.abs(xx - cx) / 2.6 + np.abs(c.yy + .5 - 10.5) / 2.6) <= 1.0
        c.paint(dm, RED[1]); c.paint(dm & (xx > cx + .2), RED[2]); c.paint(dm & (xx < cx - .6) & (c.yy < 10), RED[0])
    return c.finish()

def burner(W=12, H=8):
    """cabeza del quemador: lata de laton con boquilla y rejilla"""
    c = Canvas(W, H); xx, yy = c.xx + .5, c.yy + .5; cx = W / 2
    can = (np.abs(xx - cx) <= W / 2 - 0.2 - np.clip((3 - yy) / 3.0, 0, 1) * 2.2)
    for i, col in enumerate((GOLD[0], GOLD[1], GOLD[3], GOLD[5])):
        c.paint(can & (xx >= cx + (i - 2) * 2.4 - 0.01) & (xx < cx + (i - 1) * 2.4), col) if False else None
    u = (xx - cx) / (W / 2)
    c.paint(can, GOLD[3]); c.paint(can & (u < -0.4), GOLD[1]); c.paint(can & (u < -0.7), GOLD[0]); c.paint(can & (u > 0.35), GOLD[5]); c.paint(can & (u > 0.7), GOLD[6])
    c.paint(can & (c.yy >= H - 3) & (c.xx % 2 == 0), GOLD[6]); c.paint(can & (c.yy == H - 1), GOLD[7])      # rejilla
    c.paint(can & (c.yy <= 1) & (np.abs(u) < 0.5), GOLD[7])                                                   # la boquilla (hueco oscuro)
    return c.finish()

def flame(f=0, W=16, H=28):
    """llama de 4 fotogramas: borde naranja con punta roja, cuerpo amarillo y nucleo casi blanco; bambolea hacia arriba"""
    c = Canvas(W, H); yy = c.yy + .5; xx = c.xx + .5; cx = W / 2
    ph = f * (np.pi / 2)
    tl = np.clip(yy / H, 0, 1)                                    # 0 punta .. 1 base
    sway = (np.sin(ph + tl * 4.2) * 1.6 + (0.9 if f % 2 else -0.9) * (1 - tl)) * (1 - tl) ** 0.8
    prof = np.where(tl < 0.64, (tl / 0.64) ** 0.8, ((1 - tl) / 0.36) ** 0.55) * (W / 2 - 1.0)
    prof = prof * (1 + (0.12 if f % 2 else -0.05))
    d = np.abs(xx - cx - sway) / np.maximum(prof, 0.01)
    body = (d <= 1.0) & (tl > 0.02)
    c.paint(body, GOLD[4]); c.paint(body & (d < 0.80), GOLD[3]); c.paint(body & (d < 0.64) & (tl > 0.18), GOLD[2]); c.paint(body & (d < 0.46) & (tl > 0.34), GOLD[1])
    c.paint(body & (d < 0.28) & (tl > 0.52), GOLD[0])
    c.paint(body & (tl < 0.26), RED[1]); c.paint(body & (tl < 0.26) & (d < 0.45) & (tl > 0.12), GOLD[4]); c.paint(body & (tl < 0.12), RED[2])
    # tramado entre capas
    ck = ((c.xx + c.yy) % 2 == 0)
    c.paint(body & (np.abs(d - 0.64) < 0.06) & ck & (tl > 0.3), GOLD[3]); c.paint(body & (np.abs(d - 0.8) < 0.06) & ck, GOLD[4])
    return c.finish(outline=False)

def glow(S=72):
    """resplandor del quemador: anillos de color con tramado de 1 px y alfa (se dibuja en 'lighter')"""
    c = Canvas(S, S); out = np.zeros((S, S, 4), np.uint8)
    r = np.sqrt((c.xx + .5 - S / 2) ** 2 + (c.yy + .5 - S / 2) ** 2) / (S / 2)
    ck = ((c.xx + c.yy) % 2 == 0)
    for lim, col in ((1.0, (255, 80, 30, 22)), (0.80, (255, 120, 40, 40)), (0.60, (255, 170, 70, 70)), (0.40, (255, 215, 120, 110)), (0.22, (255, 246, 200, 150))):
        m = r <= lim; out[m] = col
        out[(np.abs(r - lim) < 0.045) & ck & (r <= lim)] = (0, 0, 0, 0) if False else out[(np.abs(r - lim) < 0.045) & ck & (r <= lim)]
    return out

def liv_swatch(i):
    return envelope(84, 72, LIV[i])

if __name__ == "__main__":
    out = Path(__file__).resolve().parent / "out"; out.mkdir(exist_ok=True)
    arrs = [envelope(84, 72, LIV[0]), basket(), burner(), flame(0), flame(1), flame(2), flame(3)]
    zoom_sheet(arrs, out / "zoom_balloon.png", k=6, cols=4)
