"""La tarjeta de rasca (108x146 px nativos, se muestra a x4): marco de metal biselado con cenefa, placa del titulo (el texto es HTML: 12 idiomas),
3x3 casillas empotradas y placa del pie; mas la LAMINA (relieve en rejilla nativa + brillo) que se rasca. Un tema = metal + papel + casilla + lamina."""
import hashlib
from prim import *

W, H, CELL, GAP, FX, FY = 108, 146, 28, 3, 9, 32
PLAQUE = (8, 7, 92, 22)       # x, y, w, h  (el titulo HTML va centrado aqui)
FOOT = (8, 126, 92, 14)
def cell_xy(i): return FX + (i % 3) * (CELL + GAP), FY + (i // 3) * (CELL + GAP)
def hx(*hs): return [hexc(h) for h in hs]

M_GOLD = [GOLD[0], GOLD[1], GOLD[3], GOLD[5], GOLD[7]]
M_SILVER = hx("ffffff", "dcd6f2", "a9a1d2", "7a6fae", "4a3f80")
M_BRASS = hx("fff4b8", "ecd070", "c9a23c", "94702a", "5e4418")
M_COPPER = hx("ffe8d6", "f5b08a", "d9784c", "a64a2c", "66281a")

THEMES = {
    "tesoro":     dict(es="Tesoro", en="Treasure", metal=M_GOLD, bead="dot", plaque=hx("5a3018", "7a4626", "3a1c0c"), paper=hx("cfa85c", "bd9448"), pat="dots", well=hx("f6e6b8", "cfae6a", "fff6d8"), foil=hx("ffd9b0", "e9a56e", "c27846", "90502c", "5a2e1a"), amb="#ffb347", gold="#ffd95a"),
    "mapamundi":  dict(es="Mapamundi", en="World map", metal=M_GOLD, bead="dia", plaque=hx("1a4590", "2160c8", "0e2a66"), paper=hx("7cc0ec", "a4d8f6"), pat="grid", well=hx("eaf6ff", "9cc4e0", "ffffff"), foil=hx("f4fbff", "c9dff2", "9db9d8", "6b84ae", "3a4f7e"), amb="#4fa4f0", gold="#ffd95a"),
    "banderas":   dict(es="Banderas", en="Flags", metal=M_SILVER, bead="dash", plaque=hx("a8142e", "e8283a", "6e1030"), paper=hx("f2e8d0", "e0d2b0"), pat="stripes", well=hx("fbf6ea", "d4c8a8", "ffffff"), foil=hx("ffffff", "e2def4", "bcb6dc", "8c84b4", "5a5284"), amb="#ff6a6a", gold="#e8e4ff"),
    "gala":       dict(es="Noche de gala", en="Gala night", metal=M_GOLD, bead="dia", plaque=hx("1a0a2e", "2e1650", "0d0518"), paper=hx("4a2278", "5e3490"), pat="lattice", well=hx("f0e4cc", "b8a47c", "fff8e8"), foil=hx("d2c6ff", "9a84ea", "6c58c0", "443494", "261c62"), amb="#b07cff", gold="#ffd95a"),
    "monumentos": dict(es="Monumentos", en="Monuments", metal=M_BRASS, bead="dot", plaque=hx("9a4a2a", "c86a3e", "5e2a14"), paper=hx("e0b872", "cca25a"), pat="bricks", well=hx("f8ecd0", "c8a468", "fffaea"), foil=hx("fff0c8", "e8cf94", "c8a864", "9a7a42", "6a5028"), amb="#ffd27a", gold="#ffe08a"),
    "faro":       dict(es="Faro y mar", en="Lighthouse", metal=M_COPPER, bead="dash", plaque=hx("0e3f55", "1a6a86", "08202c"), paper=hx("1e7894", "2a90ac"), pat="waves", well=hx("e6f6f4", "8cc4c0", "ffffff"), foil=hx("e0fff6", "9aecd8", "54c6b6", "2e8e92", "165a62"), amb="#3cd0c0", gold="#ffcfa0"),
    "gemas":      dict(es="Gemas", en="Gems", metal=M_SILVER, bead="dia", plaque=hx("8a1f4a", "b83a68", "520f2c"), paper=hx("7a1a4a", "8e2a5c"), pat="dots", well=hx("faeaf2", "d4a0bc", "ffffff"), foil=hx("fff0ee", "f9cfc8", "e8a0a6", "b86a80", "73344f"), amb="#ff7ab8", gold="#fff0f0"),
    "tiempo":     dict(es="Tiempo", en="Weather", metal=M_GOLD, bead="dot", plaque=hx("2c78d4", "5cb4f4", "1a4a98"), paper=hx("74b8f0", "9cd0fa"), pat="dots", well=hx("f2faff", "a8c8e4", "ffffff"), foil=hx("f8ffff", "d0f0ff", "a0d8f0", "6cb0d8", "3c7ab0"), amb="#7fd0ff", gold="#ffd95a"),
}

def erode(m):
    p = np.pad(m, 1); return m & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]

def rr(w, h, r):
    yy, xx = np.mgrid[0:h, 0:w]; m = np.ones((h, w), bool)
    for (cx, cy, sx, sy) in ((r, r, -1, -1), (w - r, r, 1, -1), (r, h - r, -1, 1), (w - r, h - r, 1, 1)):
        cor = ((xx + .5 - cx) * sx > 0) & ((yy + .5 - cy) * sy > 0); m &= ~(cor & ((xx + .5 - cx) ** 2 + (yy + .5 - cy) ** 2 > r * r))
    return m

class Art:
    def __init__(self, w, h): self.w, self.h = w, h; self.a = np.zeros((h, w, 4), np.uint8); self.yy, self.xx = np.mgrid[0:h, 0:w]
    def paint(self, mask, col, alpha=255): self.a[mask, :3] = col; self.a[mask, 3] = alpha
    def put(self, x, y, col):
        if 0 <= x < self.w and 0 <= y < self.h: self.a[y, x, :3] = col; self.a[y, x, 3] = 255
    def box(self, x, y, w, h): return (self.xx >= x) & (self.xx < x + w) & (self.yy >= y) & (self.yy < y + h)

def bevel_box(A, x, y, w, h, base, hi, lo, edge, r=1):
    """caja empotrada o en relieve: borde oscuro de 1 px, luz arriba-izquierda y sombra abajo-derecha"""
    m = np.zeros((A.h, A.w), bool); m[y:y + h, x:x + w] = rr(w, h, r); inner = erode(m); inner2 = erode(inner)
    A.paint(m & ~inner, edge); A.paint(inner, base)
    top = (A.yy == y + 1) & inner; left = (A.xx == x + 1) & inner; bot = (A.yy == y + h - 2) & inner; right = (A.xx == x + w - 2) & inner
    A.paint(top | left, hi); A.paint((bot | right) & ~(top | left), lo)
    return m, inner2

def pattern(A, mask, pat, c1, c2):
    x, y = A.xx, A.yy
    A.paint(mask, c1)
    if pat == "dots": sel = (x % 6 == 2) & (y % 6 == 2)
    elif pat == "grid": sel = (x % 9 == 4) | (y % 9 == 4)
    elif pat == "stripes": sel = (y % 4 == 0)
    elif pat == "lattice": sel = ((x + y) % 8 == 0) | ((x - y) % 8 == 0)
    elif pat == "bricks": sel = (y % 5 == 0) | (((x + (y // 5) * 5) % 10 == 0) & (y % 5 != 0))
    elif pat == "waves": sel = (((x + (y // 3) * 2) % 6) < 2) & (y % 3 == 1)
    else: sel = np.zeros_like(mask)
    A.paint(mask & sel, c2)

def card_base(th):
    T = THEMES[th]; M = T["metal"]; A = Art(W, H)
    m = rr(W, H, 4); ring = [m]
    for _ in range(4): ring.append(erode(ring[-1]))
    L = [ring[i] & ~ring[i + 1] for i in range(4)]; inner = ring[4]
    lit = ((A.xx - W / 2) / W + (A.yy - H / 2) / H) < 0
    A.paint(L[0], INK); A.paint(L[1] & lit, M[0]); A.paint(L[1] & ~lit, M[2]); A.paint(L[2] & lit, M[1]); A.paint(L[2] & ~lit, M[3]); A.paint(L[3] & lit, M[2]); A.paint(L[3] & ~lit, M[4])
    bead = L[2] & (((A.xx + A.yy) % 4) == 0) if T["bead"] == "dia" else L[2] & (((A.xx + A.yy) % 4) == 0) & (((A.xx // 2 + A.yy // 2) % 2) == 0) if T["bead"] == "dash" else L[2] & (((A.xx + A.yy) % 4) == 0)
    A.paint(bead, M[0] if T["bead"] != "dia" else M[4]);
    if T["bead"] == "dia": A.paint(L[2] & (((A.xx + A.yy) % 4) == 2), M[0])
    # tachuelas en las cuatro esquinas del marco
    for (cx, cy) in ((6, 6), (W - 7, 6), (6, H - 7), (W - 7, H - 7)):
        s = (A.xx >= cx - 1) & (A.xx <= cx + 1) & (A.yy >= cy - 1) & (A.yy <= cy + 1) & ~(((A.xx == cx - 1) | (A.xx == cx + 1)) & ((A.yy == cy - 1) | (A.yy == cy + 1)))
        A.paint(s, M[1]); A.put(cx - 1, cy, M[0]); A.put(cx, cy - 1, M[0]); A.put(cx + 1, cy, M[3]); A.put(cx, cy + 1, M[3]); A.put(cx, cy, M[2])
    paper = inner & ~A.box(5, 5, 4, 4) & ~A.box(W - 9, 5, 4, 4) & ~A.box(5, H - 9, 4, 4) & ~A.box(W - 9, H - 9, 4, 4)
    pattern(A, inner, T["pat"], T["paper"][0], T["paper"][1])
    for (cx, cy) in ((6, 6), (W - 7, 6), (6, H - 7), (W - 7, H - 7)):    # las tachuelas se pintan otra vez encima del papel
        s = (A.xx >= cx - 1) & (A.xx <= cx + 1) & (A.yy >= cy - 1) & (A.yy <= cy + 1) & ~(((A.xx == cx - 1) | (A.xx == cx + 1)) & ((A.yy == cy - 1) | (A.yy == cy + 1)))
        A.paint(s, M[1]); A.put(cx - 1, cy, M[0]); A.put(cx, cy - 1, M[0]); A.put(cx + 1, cy, M[3]); A.put(cx, cy + 1, M[3]); A.put(cx, cy, M[2])
    # placa del titulo y del pie: metal por fuera, tela del tema por dentro
    pb, ph, pd = T["plaque"]
    for (x, y, w, h, tag) in (PLAQUE + ("t",), FOOT + ("f",)):
        mm, inn = bevel_box(A, x, y, w, h, pb, M[1], M[3], INK, r=2)
        ed = mm & ~erode(mm); A.paint(ed & (((A.xx - x) / w + (A.yy - y) / h) < 0.5) & (A.yy < y + h - 1) & (A.xx < x + w - 1) & (A.yy > y) & (A.xx > x), M[1]) if False else None
        i1 = erode(mm); pl_lit = (A.yy <= y + 2) | (A.xx <= x + 2); A.paint(i1 & ~erode(i1) & pl_lit, M[1]); A.paint(i1 & ~erode(i1) & ~pl_lit, M[3])           # filete de metal (1 px dentro del contorno)
        core = erode(i1); A.paint(core, pb); A.paint(core & ((A.yy - y) % 2 == 0) & ((A.xx + A.yy) % 2 == 0), ph)
        A.paint(core & (A.yy == y + 2), ph) if tag == "t" else None
        cy = y + h // 2
        for dx in (6, w - 7):
            A.put(x + dx, cy, M[1]); A.put(x + dx - 1, cy, M[0]); A.put(x + dx + 1, cy, M[3]); A.put(x + dx, cy - 1, M[0]); A.put(x + dx, cy + 1, M[3])
    # las nueve casillas empotradas
    wb, wd, wl = T["well"]
    for i in range(9):
        x, y = cell_xy(i); mm = np.zeros((H, W), bool); mm[y:y + CELL, x:x + CELL] = rr(CELL, CELL, 2)
        A.paint(mm, wd); inn = erode(mm); A.paint(inn, wb); A.paint(inn & ((A.yy == y + 1) | (A.xx == x + 1)), wd); A.paint(inn & ((A.yy == y + CELL - 2) | (A.xx == x + CELL - 2)) & ~((A.yy == y + 1) | (A.xx == x + 1)), wl)
        i2 = erode(inn); A.paint(i2 & (((A.xx + A.yy) % 7) == 0), wl)
        A.paint(mm & ~inn & ((A.yy >= y + CELL - 1) | (A.xx >= x + CELL - 1)), wl)
    return A.a

# ----------------------------------------------------------------------------------------------- la lamina
def hash01(x, y, k=0):
    return int(hashlib.md5(f"{x},{y},{k}".encode()).hexdigest()[:6], 16) / 0xFFFFFF

def foil_cell(F, ox, oy):
    """una casilla de lamina 28x28: contorno oscuro, bisel, rejilla en relieve (un punto de luz y uno de sombra cada 4 px), banda de brillo y un rombo estampado"""
    out = np.zeros((CELL, CELL, 4), np.uint8)
    for ly in range(CELL):
        for lx in range(CELL):
            if (lx in (0, CELL - 1)) and (ly in (0, CELL - 1)): continue
            x, y = ox + lx, oy + ly
            if lx in (0, CELL - 1) or ly in (0, CELL - 1): col = F[4]
            elif lx == 1 or ly == 1: col = F[0]
            elif lx == CELL - 2 or ly == CELL - 2: col = F[3]
            else:
                col = F[2]
                if lx % 4 == 2 and ly % 4 == 2: col = F[1]
                elif lx % 4 == 3 and ly % 4 == 3: col = F[3]
                d = (x * 0.8 + y * 0.6) % 70
                if 16 <= d < 30:
                    if col == F[2]: col = F[1]
                    elif col == F[1]: col = F[0]
                    if 21 <= d < 25 and col == F[1]: col = F[0]
                    if 21 <= d < 25 and col == F[0]: col = (255, 255, 255) if (lx + ly) % 3 == 0 else F[0]
                h = hash01(x, y)
                if h < 0.022: col = F[0]
                elif h > 0.985: col = F[3]
            dx, dy = lx - 13.5, ly - 13.5; dm = abs(dx) / 5.2 + abs(dy) / 7.4
            if dm <= 1.0 and 1 < lx < CELL - 2 and 1 < ly < CELL - 2:
                edge = dm > 0.78
                if edge: col = F[0] if (dx + dy) < 0 else F[3]
                else: col = F[1] if (dx + dy) < 2 else F[2]
            out[ly, lx, :3] = col; out[ly, lx, 3] = 255
    return out

def foil(th):
    F = THEMES[th]["foil"]; out = np.zeros((H, W, 4), np.uint8)
    for i in range(9):
        x, y = cell_xy(i); out[y:y + CELL, x:x + CELL] = foil_cell(F, x, y)
    return out

# ----------------------------------------------------------------------------------------------- piezas sueltas
def mini_hat():
    rows = [".PPP.", ".PPQ.", ".RRs.", "NNNNK"]; pal = {"P": hexc("8c66e6"), "Q": hexc("44208e"), "R": RED[1], "s": RED[2], "N": NAVY[1], "K": NAVY[3]}
    return rows, pal

def bet_icon():
    """el icono de la carta de la Barra (48x48): una tarjeta con marco de oro, la fila de arriba rascada con tres chisteras y una doblon rascadora"""
    c = Canvas(48, 48); x = c.xx + .5; y = c.yy + .5
    X0, Y0, TW, TH = 7, 2, 31, 40
    tk = (x >= X0) & (x < X0 + TW) & (y >= Y0) & (y < Y0 + TH); tk &= rr_mask(c, X0, Y0, TW, TH, 2)
    ext = (x >= X0 + 2) & (x < X0 + TW + 2) & (y >= Y0 + 2) & (y < Y0 + TH + 2) & rr_mask(c, X0 + 2, Y0 + 2, TW, TH, 2)                  # el grosor de la tarjeta (volumen v0.2.52): 2 px de canto en oro oscuro y su sombra en el suelo
    c.paint(c.ell(25, 44.4, 17.5, 2.7) & ~tk & ~ext & ((c.xx + c.yy) % 2 == 0), INK); c.paint(ext & ~tk, GOLD[5]); c.paint(ext & ~tk & ((c.xx + c.yy) % 2 == 0), GOLD[6])
    c.paint(tk, GOLD[1]); c.paint(tk & ((x < X0 + 1) | (y < Y0 + 1)), GOLD[0]); c.paint(tk & (x >= X0 + TW - 2), GOLD[4]); c.paint(tk & (y >= Y0 + TH - 2), GOLD[4]); c.paint(tk & (x >= X0 + TW - 1), GOLD[5]); c.paint(tk & (y >= Y0 + TH - 1), GOLD[5])
    inner = (x >= X0 + 2) & (x < X0 + TW - 2) & (y >= Y0 + 2) & (y < Y0 + TH - 2); c.paint(inner, hexc("f1dfae")); c.paint(inner & (y >= Y0 + 2) & (y < Y0 + 3), GOLD[3]); c.paint(inner & (x >= X0 + 2) & (x < X0 + 3), GOLD[3])
    c.paint(inner & (x >= X0 + TW - 5) & (x < X0 + TW - 3) & (y > Y0 + 9) & ((c.xx + c.yy) % 2 == 0), hexc("e0cb92")); c.paint(inner & (y >= Y0 + TH - 5) & (y < Y0 + TH - 3) & (x > X0 + 2) & ((c.xx + c.yy) % 2 == 0), hexc("e0cb92"))
    c.paint(inner & (x >= X0 + TW - 3) & (y > Y0 + 2), hexc("d8c288")); c.paint(inner & (y >= Y0 + TH - 3) & (x > X0 + 2), hexc("d8c288"))
    pl = (x >= X0 + 3) & (x < X0 + TW - 3) & (y >= Y0 + 3) & (y < Y0 + 9)
    c.paint(pl, RED[2]); c.paint(pl & (y < Y0 + 4), RED[1]); c.paint(pl & (y >= Y0 + 8), RED[3])
    for dx in (6, 15.5, 25):
        c.paint((np.abs(x - (X0 + dx + 0.5)) / 1.8 + np.abs(y - (Y0 + 6)) / 1.8) <= 1.0, GOLD[1]) if False else None
    for dx in (6, 12, 18, 24):
        c.paint((x >= X0 + dx + 0) & (x < X0 + dx + 2) & (y >= Y0 + 5) & (y < Y0 + 6), GOLD[1]); c.paint((x >= X0 + dx + 0) & (x < X0 + dx + 2) & (y >= Y0 + 6) & (y < Y0 + 7), GOLD[3])
    rows, pal = mini_hat(); gx0, gy0 = X0 + 3, Y0 + 11
    for j in range(3):
        for i in range(3):
            cx0, cy0 = gx0 + i * 9, gy0 + j * 9
            cell = (x >= cx0) & (x < cx0 + 7) & (y >= cy0) & (y < cy0 + 7)
            if j == 0:
                c.paint(cell, hexc("fff8e4")); c.paint(cell & ((x >= cx0 + 6) | (y >= cy0 + 6)), hexc("d8c288")); c.paint(cell & ((x < cx0 + 1) | (y < cy0 + 1)), hexc("b89a52"))
                hat = ["..KKK..", ".KPPPK.", ".KPPQK.", ".KRRsK.", "KNNNNNK", ".KKKKK."]; hp = {"K": INK, "P": hexc("8c66e6"), "Q": hexc("5e34b8"), "R": RED[1], "s": RED[2], "N": NAVY[1]}
                for jj, r in enumerate(hat):
                    for ii, ch in enumerate(r):
                        if ch != ".": c.put(cx0 + ii, cy0 + jj, hp[ch])
            else:
                F = THEMES["mapamundi"]["foil"] if False else M_SILVER
                c.paint(cell, hexc("c9c2e8")); c.paint(cell & ((x < cx0 + 1) | (y < cy0 + 1)), WHITE[0]); c.paint(cell & ((x >= cx0 + 6) | (y >= cy0 + 6)), WHITE[2])
                c.paint(cell & (((x - cx0 + y - cy0) % 4) == 1) & (x >= cx0 + 1) & (y >= cy0 + 1) & (x < cx0 + 6) & (y < cy0 + 6), WHITE[0])
                if j == 1 and i == 1:                                      # la casilla que se esta rascando: trazo diagonal
                    for k in range(-1, 8):
                        for w_ in (0, 1): c.put(cx0 + k, cy0 + k + w_ - 0, hexc("fff8e4")) if (0 <= k < 7 and 0 <= k + w_ < 7) else None
    # volumen (v0.2.52): luz de arriba en el papel, filo de plata mas claro en las casillas y la sombra de la doblon sobre la tarjeta
    for j in (1, 2):
        for i in range(3):
            cx0, cy0 = gx0 + i * 9, gy0 + j * 9; c.paint((x >= cx0 + 1) & (x < cx0 + 4) & (y >= cy0 + 1) & (y < cy0 + 2), WHITE[0])
    c.put(X0 + 4, Y0 + 12, WHITE[0]); c.put(X0 + 13, Y0 + 12, WHITE[0]); c.put(X0 + 22, Y0 + 12, WHITE[0])
    c.paint(c.ell(35.2, 40.2, 8.6, 8.2) & tk & ~inner, GOLD[5]); c.paint(c.ell(35.2, 40.2, 8.6, 8.2) & inner, hexc("a88e58"))                  # la sombra de la doblon sobre la tarjeta
    # doblon rascadora
    cx, cy = 37, 37
    ball(c, cx, cy, 8.4, 8.4, [GOLD[1], GOLD[3], GOLD[5], GOLD[6]], spec=False)
    c.paint(c.ell(cx, cy, 6.0, 6.0), GOLD[1]); tone(c, c.ell(cx, cy, 5.8, 5.8), [GOLD[0], GOLD[1], GOLD[2], GOLD[3]], cx - 2, cy - 2, 12, 12, thr=(-0.5, 0.0, 0.55))
    pts = [(cx + (3.6 if k % 2 == 0 else 1.6) * np.cos(-np.pi / 2 + k * np.pi / 5), cy + 0.5 + (3.6 if k % 2 == 0 else 1.6) * np.sin(-np.pi / 2 + k * np.pi / 5)) for k in range(10)]
    st = pm(c, pts); c.paint(st, GOLD[4]); c.paint(st & (x + y > 75), GOLD[5])
    c.put(cx - 4, cy - 4, WHITE[0]); c.put(cx - 3, cy - 5, WHITE[0])
    return c.finish(margin=0)

def rr_mask(c, x0, y0, w, h, r):
    x = c.xx + .5; y = c.yy + .5; m = np.ones((c.h, c.w), bool)
    for (cx, cy, sx, sy) in ((x0 + r, y0 + r, -1, -1), (x0 + w - r, y0 + r, 1, -1), (x0 + r, y0 + h - r, -1, 1), (x0 + w - r, y0 + h - r, 1, 1)):
        cor = ((x - cx) * sx > 0) & ((y - cy) * sy > 0); m &= ~(cor & ((x - cx) ** 2 + (y - cy) ** 2 > r * r))
    return m

def cenefa(w=12, h=10):
    """cadena de laminas de plata y rombos de oro para el filete de la carta de la Barra (1:1)"""
    c = Canvas(w, h); x = c.xx + .5; y = c.yy + .5
    sq = (c.xx >= 0) & (c.xx < 7) & (c.yy >= 1) & (c.yy < 8); c.paint(sq, WHITE[1]); c.paint(sq & ((c.xx == 0) | (c.yy == 1)), WHITE[0]); c.paint(sq & ((c.xx == 6) | (c.yy == 7)), WHITE[3]); c.paint(sq & (((c.xx + c.yy) % 3) == 0) & (c.xx > 0) & (c.yy > 1) & (c.xx < 6) & (c.yy < 7), WHITE[0])
    for (px, py) in ((0, 1), (6, 1), (0, 7), (6, 7)): c.paint((c.xx == px) & (c.yy == py), INK)
    d = (np.abs(x - 9.6) / 2.4 + np.abs(y - 4.6) / 3.6) <= 1.0; c.paint(d, GOLD[1]); c.paint(d & (x >= 9.6), GOLD[3]); c.paint(d & (x >= 9.6) & (y >= 4.6), GOLD[5]); c.paint(d & (x < 9.6) & (y < 4.6), GOLD[0])
    return c.finish(outline=False)

def coin_cursor(hold=False):
    """la doblon rascadora: de cara (flotando) o girada con el canto hacia la lamina (rascando)"""
    if not hold:
        c = Canvas(18, 18); ball(c, 9, 9, 7.8, 7.8, [GOLD[1], GOLD[3], GOLD[5], GOLD[6]], spec=False)
        tone(c, c.ell(9, 9, 5.6, 5.6), [GOLD[0], GOLD[1], GOLD[2], GOLD[3]], 7, 7, 12, 12, thr=(-0.5, 0.0, 0.55)); c.paint(c.ell(9, 9, 6.2, 6.2) & ~c.ell(9, 9, 5.6, 5.6), GOLD[5])
        pts = [(9 + (3.9 if k % 2 == 0 else 1.7) * np.cos(-np.pi / 2 + k * np.pi / 5), 9.5 + (3.9 if k % 2 == 0 else 1.7) * np.sin(-np.pi / 2 + k * np.pi / 5)) for k in range(10)]
        st = pm(c, pts); c.paint(st, GOLD[4]); c.paint(st & (c.xx + c.yy > 18), GOLD[5]); c.put(4, 4, WHITE[0]); c.put(5, 3, WHITE[0])
        return c.finish(margin=1)
    c = Canvas(20, 16); x = c.xx + .5; y = c.yy + .5
    edge = c.ell(10, 9.6, 8.6, 4.6) | ((np.abs(x - 10) <= 8.6) & (y >= 7) & (y <= 9.8)); edge |= c.ell(10, 8.4, 8.6, 4.6) & False
    c.paint(c.ell(10, 9.2, 8.8, 4.8) , GOLD[5]); c.paint((np.abs(x - 10) <= 8.8) & (y >= 5.8) & (y < 9.2), GOLD[5])
    c.paint(c.ell(10, 9.2, 8.8, 4.8) & (y > 11.4), GOLD[6]); c.paint((c.xx % 2 == 0) & (y > 8.4) & (y < 13.8) & (np.abs(x - 10) < 8.2), GOLD[4])
    top = c.ell(10, 6.2, 8.8, 4.8); c.paint(top, GOLD[3]); tone(c, top, [GOLD[0], GOLD[1], GOLD[2], GOLD[3]], 6, 4, 18, 9, thr=(-0.45, 0.0, 0.5))
    c.paint(top & ~c.ell(10, 6.2, 7.4, 3.6), GOLD[2]); c.paint(top & ~c.ell(10, 6.0, 7.6, 3.8) & (x < 10) & (y < 6), GOLD[0])
    pts = [(10 + (3.6 if k % 2 == 0 else 1.5) * np.cos(-np.pi / 2 + k * np.pi / 5), 6.4 + 0.62 * (3.6 if k % 2 == 0 else 1.5) * np.sin(-np.pi / 2 + k * np.pi / 5)) for k in range(10)]
    c.paint(pm(c, pts), GOLD[4]); c.put(5, 4, WHITE[0])
    return c.finish(margin=1)

def felt_ivory(n=32, seed=11):
    rng = np.random.default_rng(seed); out = np.zeros((n, n, 4), np.uint8); r = rng.random((n, n))
    out[r < 0.07] = (255, 252, 236, 70); out[(r >= 0.07) & (r < 0.16)] = (150, 110, 50, 34); out[(r >= 0.16) & (r < 0.19)] = (110, 76, 30, 46)
    return out

def wall_tile(n=64, seed=5):
    rng = np.random.default_rng(seed); out = np.zeros((n, n, 4), np.uint8); out[..., 3] = 255
    bases = [hexc("3a2218"), hexc("321d12"), hexc("402818"), hexc("2d190f")]
    for px in range(n // 16):
        b = np.array(bases[px % 4])
        for lx in range(16):
            for y in range(n):
                x = px * 16 + lx; col = b.copy()
                if lx == 0: col = (col * 0.62).astype(int)
                elif lx == 1: col = np.minimum(255, col * 1.22).astype(int)
                else:
                    g = rng.random()
                    if (lx * 7 + (y // 9) * 5 + px * 3) % 11 == 0: col = (col * 0.86).astype(int)
                    if g < 0.04: col = np.minimum(255, col * 1.18).astype(int)
                    elif g > 0.97: col = (col * 0.8).astype(int)
                out[y, x, :3] = np.clip(col, 0, 255)
        for y in (13, 14, 31, 47):   # nudos y cortes de tablon
            pass
    return out

def sweat_drop():
    rows = ["...a...", "..aba..", "..abb..", ".abbbb.", ".abwbb.", "abbwbbc", "abbbbbc", ".abbbc.", "..ccc.."]
    pal = {"a": hexc("c8ecff"), "b": hexc("5cb4f4"), "w": (255, 255, 255), "c": hexc("2160c8")}
    c = px_rows(rows, pal); return c.finish(margin=1)

if __name__ == "__main__":
    out = HERE / "out"; out.mkdir(exist_ok=True)
    bases = [card_base(t) for t in THEMES]; foils = [foil(t) for t in THEMES]
    zoom_sheet(bases[:4] + [bet_icon(), coin_cursor(False), coin_cursor(True), sweat_drop()], out / "_sheet_card.png", k=4, cols=4)
    comp = []
    for b, f in zip(bases, foils):
        z = b.copy(); m = f[..., 3] > 0
        # media tarjeta rascada: la de arriba sin lamina, el resto con ella
        z[m] = f[m]; z[FY:FY + CELL, FX:FX + CELL] = b[FY:FY + CELL, FX:FX + CELL]
        comp.append(z)
    zoom_sheet(comp, out / "_sheet_card2.png", k=3, cols=4)
