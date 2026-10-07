#!/usr/bin/env python3
"""Geolite - Don Crupier: el retrato maestro (solo desarrollo).
Parte del retrato que le encanta al usuario (src/neutral_orig.png = assets/icons/dealer_neutral.webp de v0.29.1, rejilla 128) y lo pule
a mano sin redibujarlo: paleta cerrada (px.PAL), ramas limpias, mascara sin manchas, cartas sin indices, guante con volumen,
chistera lisa (sin broches ni brillos que parezcan una gema). Todo lo demas (caras, gestos) sale de este maestro.

  python tools/crupier/master.py            -> src/master.png + vistas en el scratchpad (si se da --show DIR)
"""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
from px import RGB, PAL, load, patch, replace, show, big, HERE

# color original -> caracter de la paleta nueva (funde medios tonos casi iguales)
ORIG = {
    (1, 0, 63): "K", (255, 255, 255): "W", (56, 17, 124): "P", (10, 0, 72): "D", (57, 20, 130): "P", (35, 0, 95): "d",
    (29, 10, 61): "s", (255, 233, 26): "y", (255, 28, 36): "R", (255, 202, 177): "r", (36, 6, 100): "d", (255, 168, 73): "O",
    (78, 42, 133): "L", (205, 7, 37): "c", (255, 212, 73): "b", (255, 255, 240): "t", (191, 115, 71): "o", (190, 157, 117): "G",
    (232, 46, 62): "R", (0, 0, 47): "K", (45, 19, 100): "a", (255, 239, 131): "h", (18, 0, 64): "K", (125, 61, 82): "o",
    (77, 68, 88): "K", (0, 0, 44): "K", (88, 27, 108): "P",
}

def base():
    a = load(HERE / "src" / "neutral_orig.png"); out = np.zeros_like(a)
    for y in range(128):
        for x in range(128):
            if a[y, x, 3] == 0: continue
            out[y, x] = RGB[ORIG[tuple(int(v) for v in a[y, x, :3])]]
    return out

def ch(m, x, y):
    px = m[y, x]
    if px[3] == 0: return "."
    for k, v in RGB.items():
        if (v == px).all(): return k
    return "?"

def recolor(m, box, mapping, where=None):
    """dentro de la caja (x0, y0, x1, y1 incluidos) cambia caracteres segun mapping; where(x, y) filtra"""
    x0, y0, x1, y1 = box
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c = ch(m, x, y)
            if c in mapping and (where is None or where(x, y)): m[y, x] = RGB[mapping[c]]

def setpx(m, pts, c):
    for x, y in pts: m[y, x] = RGB[c]

def hat(m):
    # chistera LISA: fuera los restos del broche (el hueco oscuro de arriba, el blanco y el ocre de la banda)
    setpx(m, [(x, 37) for x in range(58, 63)], "P")
    recolor(m, (49, 36, 93, 45), {"W": "R", "t": "R", "o": "R", "O": "R"})
    # banda: brillo fino arriba en el lado de la luz, sombra a la derecha (ya estaba) y una linea de sombra abajo
    for x in range(50, 74):
        for y in range(36, 42):
            if ch(m, x, y) == "R": m[y, x] = RGB["e"]; break
    for x in range(53, 81):
        for y in range(46, 36, -1):
            if ch(m, x, y) == "R": m[y, x] = RGB["c"]; break
    # copa: brillo lacado dentro de la franja de luz (Balatro: "glossy highlights")
    setpx(m, [(57, y) for y in range(11, 34)], "H")
    setpx(m, [(58, y) for y in range(13, 24)], "H")
    # ala: canto de luz arriba a la izquierda y motas oscuras fuera
    setpx(m, [(x, 42) for x in range(36, 46)], "L")
    recolor(m, (60, 48, 82, 48), {"D": "P"})

def mask(m):
    # sombra del ala sobre la mascara: degradado limpio naranja -> oro (sin la raya marron)
    for x in range(56, 98):
        for y, c in ((54, "O"), (55, "O"), (56, "b" if x <= 84 else "O"), (57, "y" if x <= 84 else "O")):
            if ch(m, x, y) not in "Ks.": m[y, x] = RGB[c]
    # lado en sombra (derecha): naranja uniforme, sin vetas marrones ni la mancha roja de la mejilla
    recolor(m, (80, 58, 97, 77), {"o": "O", "R": "O", "b": "O"}, where=lambda x, y: x >= 86 or y <= 72)
    recolor(m, (70, 58, 97, 72), {"o": "O", "j": "O"})
    recolor(m, (44, 58, 60, 66), {"G": "b"})
    # la mascara acaba en la fila 77 por la derecha: linea de tinta y debajo piel (antes seguia en naranja hasta la barbilla)
    setpx(m, [(x, 78) for x in range(85, 94)], "K")
    recolor(m, (84, 79, 93, 84), {"O": "r"})
    setpx(m, [(92, y) for y in range(79, 84)] + [(93, y) for y in range(79, 84)] + [(91, 79), (91, 80)], "q")
    # piel: fuera motas tostadas, sombra suave en la barbilla y la mejilla izquierda
    recolor(m, (54, 76, 90, 91), {"G": "q", "o": "q", "t": "r"})
    for x in range(58, 84):
        for y in range(91, 80, -1):
            c = ch(m, x, y)
            if c == "r": m[y, x] = RGB["q"]; break
            if c not in "KD": break

def hand(m):
    inside = lambda x, y: not (x >= 55 and y < 92) and not (x >= 52 and y >= 90 and ch(m, x, y) in "PdLDa")
    # cartas: caras blancas y limpias (sin indices: la regla del juego), un solo palo grande en la carta de delante
    recolor(m, (17, 72, 55, 90), {"R": "W", "c": "W", "G": "W", "o": "W", "r": "W", "t": "W", "O": "W"}, where=inside)
    patch(m, 42, 77, """
        |...R...
        |..eRR..
        |.eRRRR.
        |eRRRRRc
        |.RRRRc.
        |..RRc..
        |...c...
    """, keep=".")
    # sombra de una carta sobre la de detras (canto izquierdo de la siguiente)
    for y in range(74, 93):
        for x in range(18, 44):
            if ch(m, x, y) == "W" and ch(m, x + 1, y) == "K" and ch(m, x + 2, y) in "KW": m[y, x] = RGB["w"]
    # guante: pliegues en lavanda (no tostado), volumen en la parte en sombra (derecha y abajo)
    recolor(m, (24, 89, 52, 118), {"G": "v", "o": "w", "r": "w", "t": "w", "R": "W", "O": "W"}, where=inside)
    for y in range(91, 118):
        run = [x for x in range(24, 53) if ch(m, x, y) in "Ww" and inside(x, y)]
        if not run: continue
        edge = max(run)
        for x in range(edge - 1, edge + 1):
            if ch(m, x, y) == "W": m[y, x] = RGB["w"]
    for x in range(26, 52):
        for y in range(117, 100, -1):
            c = ch(m, x, y)
            if c in "Ww": m[y, x] = RGB["w"]; break
            if c not in "Ks": break

def body(m):
    # camisa: la sombra bajo la pajarita en lavanda (antes crema) y volumen a la derecha
    recolor(m, (62, 102, 82, 118), {"t": "w", "G": "w", "r": "w"})
    for y in range(106, 118):
        for x in range(81, 60, -1):
            if ch(m, x, y) == "W": m[y, x] = RGB["w"]; break
    # pajarita: brillo arriba a la izquierda de cada ala
    for (x0, x1, y) in ((58, 63, 93), (76, 82, 93)):
        for x in range(x0, x1):
            if ch(m, x, y) == "R": m[y, x] = RGB["e"]
    recolor(m, (40, 88, 110, 118), {"G": "d", "a": "P", "j": "d", "k": "d"})
    # mota: un pixel azul-indigo suelto dentro de la tinta de la chaqueta
    setpx(m, [(82, 105)], "K")

def build():
    m = base()
    hat(m); mask(m); hand(m); body(m)
    return m

if __name__ == "__main__":
    m = build()
    from PIL import Image
    Image.fromarray(m, "RGBA").save(HERE / "src" / "master.png")
    if "--show" in sys.argv:
        d = Path(sys.argv[sys.argv.index("--show") + 1])
        show(m, d / "m_face.png", (40, 36, 112, 96), 12)
        show(m, d / "m_hand.png", (14, 64, 80, 122), 12)
        show(m, d / "m_hat.png", (30, 4, 112, 56), 10)
        show(m, d / "m_body.png", (50, 84, 116, 122), 12)
        big(m, 5, (38, 30, 58, 255)).save(d / "m_full.png")
