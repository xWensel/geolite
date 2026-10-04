"""
Geolite - iconos de los botones del mando (v0.2.29), pixel art nitido.

Tres familias: xbox (letras de color sobre boton oscuro), ps (simbolos de color) y deck (letras marfil sobre gris acero, como la Steam Deck).
Cada icono se dibuja en una rejilla de pixeles logicos con contorno oscuro de 1 px, brillo arriba y sombra abajo (el mismo acabado de las fichas),
y se guarda a escala entera x2. Salida:
  js/glifos-data.js   A.GLIFOS = { familia: { boton: [dataURL, ancho, alto] } }  (lo usa js/mando.js)
  tools/art/glifos-hoja.png   hoja de muestra para revisarlos de un vistazo

Uso: python tools/glifos.py
"""
import base64, io, json, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K = (15, 26, 20, 255)            # contorno
S = 2                            # escala entera

FAM = {
    "xbox": {"rim": (122, 132, 126), "rim2": (84, 92, 88), "body": (34, 40, 37), "hi": (66, 76, 70), "lo": (20, 24, 22), "ink": (236, 230, 211),
             "a": (108, 210, 96), "b": (255, 92, 80), "x": (92, 170, 255), "y": (248, 206, 72)},
    "ps": {"rim": (118, 126, 146), "rim2": (80, 86, 102), "body": (34, 38, 46), "hi": (64, 70, 84), "lo": (20, 22, 28), "ink": (236, 230, 211),
             "a": (138, 176, 255), "b": (255, 112, 112), "x": (240, 150, 214), "y": (84, 222, 178)},
    "deck": {"rim": (140, 147, 154), "rim2": (98, 104, 110), "body": (48, 53, 58), "hi": (84, 90, 97), "lo": (28, 31, 35), "ink": (232, 228, 216),
             "a": (232, 228, 216), "b": (232, 228, 216), "x": (232, 228, 216), "y": (232, 228, 216)},
}
F5 = {  # letras y simbolos de 5x5
    "A": [".###.", "#...#", "#####", "#...#", "#...#"],
    "B": ["####.", "#...#", "####.", "#...#", "####."],
    "X": ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
    "Y": ["#...#", ".#.#.", "..#..", "..#..", "..#.."],
    "cross": ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
    "circle": [".###.", "#...#", "#...#", "#...#", ".###."],
    "square": ["#####", "#...#", "#...#", "#...#", "#####"],
    "triangle": ["..#..", ".#.#.", ".#.#.", "#...#", "#####"],
}
F3 = {  # 3x5 para L1, RB, LT...
    "L": ["#..", "#..", "#..", "#..", "###"], "R": ["##.", "#.#", "##.", "#.#", "#.#"], "B": ["##.", "#.#", "##.", "#.#", "##."],
    "T": ["###", ".#.", ".#.", ".#.", ".#."], "1": [".#.", "##.", ".#.", ".#.", "###"], "2": ["##.", "..#", ".#.", "#..", "###"],
}

def canvas(w, h): return [[None] * w for _ in range(h)]
def shade(g, f):
    """canto claro (aro de 1 px, como una ficha) y, por dentro, brillo en la fila de arriba y sombra en la de abajo"""
    h, w = len(g), len(g[0]); full = [[g[y][x] is not None for x in range(w)] for y in range(h)]
    edge = lambda x, y: full[y][x] and any(not (0 <= y + dy < h and 0 <= x + dx < w) or not full[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    for y in range(h):
        for x in range(w):
            if edge(x, y): g[y][x] = f["rim"] if y < h * 0.55 else f["rim2"]
    for x in range(w):
        ys = [y for y in range(h) if full[y][x] and not edge(x, y)]
        if ys: g[ys[0]][x] = f["hi"]; g[ys[-1]][x] = f["lo"]
    return g
def put(g, x, y, c):
    if 0 <= y < len(g) and 0 <= x < len(g[0]): g[y][x] = c
def stamp(g, rows, ox, oy, c):
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == "#": put(g, ox + x, oy + y, c)
def text3(g, s, ox, oy, c):
    for i, ch in enumerate(s): stamp(g, F3[ch], ox + i * 4, oy, c)

def disc(f, n=11):
    """boton redondo n x n con brillo arriba y sombra abajo"""
    g = canvas(n, n); r = n / 2 - 0.05; c = (n - 1) / 2
    for y in range(n):
        for x in range(n):
            if (x - c) ** 2 + (y - c) ** 2 <= r * r: g[y][x] = f["body"]
    return shade(g, f)

def pill(f, w, h, round_top=False):
    g = canvas(w, h)
    for y in range(h):
        for x in range(w):
            corner = (x in (0, w - 1) and y in (0, h - 1))
            if round_top and y == 0 and x in (1, w - 2): corner = True
            if round_top and y == 1 and x in (0, w - 1): corner = True
            if not corner: g[y][x] = f["body"]
    return shade(g, f)

def outline(g):
    h, w = len(g), len(g[0]); o = canvas(w + 2, h + 2)
    for y in range(h):
        for x in range(w): o[y + 1][x + 1] = g[y][x]
    out = [r[:] for r in o]
    for y in range(h + 2):
        for x in range(w + 2):
            if o[y][x] is None and any(0 <= y + dy < h + 2 and 0 <= x + dx < w + 2 and o[y + dy][x + dx] is not None for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out[y][x] = K
    return out

def img(g):
    g = outline(g); h, w = len(g), len(g[0]); im = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0)); px = im.load()
    for y in range(h):
        for x in range(w):
            c = g[y][x]
            if c is None: continue
            c = c if len(c) == 4 else c + (255,)
            for yy in range(S):
                for xx in range(S): px[x * S + xx, y * S + yy] = c
    return im

def face(f, fam, b):
    g = disc(f); sym = {"a": "cross", "b": "circle", "x": "square", "y": "triangle"}[b] if fam == "ps" else b.upper()
    stamp(g, F5[sym], 3, 3, f[b]); return g

def bumper(f, lab, trig):
    w = 13; h = 9 if not trig else 10; g = pill(f, w, h, round_top=trig)
    text3(g, lab, (w - 7) // 2, (h - 5) // 2 + (1 if trig else 0), f["ink"]); return g

def stick(f, side):
    g = disc(f, 11)
    for y in range(11):                                   # aro interior (la seta del stick)
        for x in range(11):
            d = ((x - 5) ** 2 + (y - 5) ** 2) ** 0.5
            if 3.5 <= d <= 4.3: g[y][x] = f["rim2"]
    stamp(g, F3[side], 4, 3, f["ink"]); return g

def dpad(f, hl=None):
    g = canvas(11, 11)
    for y in range(11):
        for x in range(11):
            if 3 <= x <= 7 or 3 <= y <= 7: g[y][x] = f["body"]
    shade(g, f)
    arm = {"up": [(5, 1), (4, 2), (5, 2), (6, 2)], "down": [(5, 9), (4, 8), (5, 8), (6, 8)], "left": [(1, 5), (2, 4), (2, 5), (2, 6)], "right": [(9, 5), (8, 4), (8, 5), (8, 6)]}
    for k, pts in arm.items():
        if hl is None or hl == k:
            for x, y in pts: g[y][x] = f["ink"]
    return g

def menu(f):
    g = pill(f, 11, 9)
    for y in (2, 4, 6):
        for x in range(3, 8): g[y][x] = f["ink"]
    return g

def view(f):
    g = pill(f, 11, 9)
    stamp(g, ["###..", "#.###", "###.#", "..###"], 3, 2, f["ink"]); return g

def build():
    out, sheet = {}, []
    for fam, f in FAM.items():
        L = {"lb": "LB", "rb": "RB", "lt": "LT", "rt": "RT"} if fam == "xbox" else {"lb": "L1", "rb": "R1", "lt": "L2", "rt": "R2"}
        G = {b: face(f, fam, b) for b in "abxy"}
        G.update({k: bumper(f, v, k in ("lt", "rt")) for k, v in L.items()})
        G.update({"ls": stick(f, "L"), "rs": stick(f, "R"), "dpad": dpad(f), "dup": dpad(f, "up"), "ddown": dpad(f, "down"), "dleft": dpad(f, "left"), "dright": dpad(f, "right"), "menu": menu(f), "view": view(f)})
        out[fam] = {}
        row = []
        for k, g in G.items():
            im = img(g); buf = io.BytesIO(); im.save(buf, "PNG", optimize=True)
            out[fam][k] = ["data:image/png;base64," + base64.b64encode(buf.getvalue()).decode(), im.width, im.height]; row.append(im)
        sheet.append(row)
    # hoja de muestra sobre el pano de la mesa
    pad = 12; W = max(sum(i.width + pad for i in r) for r in sheet) + pad; H = sum(max(i.height for i in r) + pad for r in sheet) + pad
    sh = Image.new("RGBA", (W, H), (22, 48, 38, 255)); y = pad
    for r in sheet:
        x = pad
        for i in r: sh.alpha_composite(i, (x, y)); x += i.width + pad
        y += max(i.height for i in r) + pad
    os.makedirs(os.path.join(ROOT, "tools", "art"), exist_ok=True)
    sh.resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(ROOT, "tools", "art", "glifos-hoja.png"))
    js = ("/* Geolite - iconos de los botones del mando (pixel art x2). GENERADO por tools/glifos.py: no editar a mano. */\n"
          "window.AIQ = window.AIQ || {};\nwindow.AIQ.GLIFOS = " + json.dumps(out, separators=(",", ":")) + ";\n")
    open(os.path.join(ROOT, "js", "glifos-data.js"), "w", encoding="utf-8", newline="\n").write(js)
    print("glifos:", {k: len(v) for k, v in out.items()}, "bytes", len(js))

if __name__ == "__main__":
    build()
