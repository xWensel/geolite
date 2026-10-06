"""Lluvia de fichas - icono de la carta de la Barra (48x48 nativos -> 384x384 WebP sin perdida, como bet_cups) y la cenefa propia del filete de la carta."""
from parts import *
from PIL import Image

def paste(dst, src, x, y):
    h, w = src.shape[:2]
    for j in range(h):
        for i in range(w):
            if src[j, i, 3] and 0 <= y + j < dst.shape[0] and 0 <= x + i < dst.shape[1]: dst[y + j, x + i] = src[j, i]

def bucket(w, h, col):
    """suelo de una casilla: bloque plano con luz arriba y sombra abajo (como las celdas de la ruleta)"""
    a = np.zeros((h, w, 4), np.uint8); a[..., 3] = 255; a[..., :3] = col; a[0, :, :3] = mix(col, (255, 255, 255), .45); a[-1, :, :3] = mix(col, (0, 0, 0), .45); return a

def bet_plinko_icon():
    icon = np.zeros((48, 48, 4), np.uint8); INK = hexc("1d0a3d")
    # paredes y tabiques: oro con luz a la izquierda (2 px)
    def fin(x, y0, y1):
        def put(xx, yy, c):
            if 0 <= xx < 48 and 0 <= yy < 48: icon[yy, xx] = (*c, 255)
        for y in range(y0, y1): put(x, y, GOLD[1]); put(x + 1, y, GOLD[4]); put(x - 1, y, INK); put(x + 2, y, INK)
        put(x, y0 - 1, INK); put(x + 1, y0 - 1, INK)
    # casillas (4 de 12 px) con el color de su premio
    cols = [hexc("d9a21f"), hexc("c9362c"), hexc("1f9a58"), hexc("d9a21f")]
    for n, c in enumerate(cols): paste(icon, [None][0] or bucket(*[(8,6),(12,6),(12,6),(8,6)][n], c), [2, 12, 26, 40][n], 41)
    for x in (0, 9, 23, 37, 46): fin(x, 36 if x not in (0, 46) else 30, 47)
    icon[47, :] = (*INK, 255); icon[47, 0] = (0, 0, 0, 0); icon[47, 47] = (0, 0, 0, 0)
    # triangulo de clavijas (3 filas, 6 bolas de 6 px) y la ficha que acaba de rebotar en la punta, con su estela
    pg = peg_small()
    for (x, y) in ((24, 13), (17, 22), (31, 22), (10, 31), (24, 31), (38, 31)): paste(icon, pg, x - 3, y - 3)
    glow = hexc("ffd95a"); trail = trail_sheet(glow)
    paste(icon, trail[:, 0:6], 28, 6); paste(icon, trail[:, 6:12], 25, 2); paste(icon, trail[:, 12:18], 22, 0)
    paste(icon, chip_frame(0), 37 - 6, 14 - 6)
    return icon

def cenefa(w=16, h=10):
    """filete de la carta: dos clavijas de oro en zigzag con la estela de la ficha entre ellas (a 1:1 en pantalla, como la cenefa del trile)"""
    a = np.zeros((h, w, 4), np.uint8); pg = peg_small()
    paste(a, pg, 1, 0); paste(a, pg, 9, 4)
    for (x, y) in ((7, 2), (8, 3), (13, 6), (14, 5), (15, 3), (0, 3)): a[y, x] = (*GOLD[1], 255) if (x + y) % 2 else (*GOLD[3], 255)
    return a

def peg_small():
    c = Canvas(4, 4)
    for (x, y, col) in ((1, 0, GOLD[0]), (2, 0, GOLD[1]), (0, 1, GOLD[1]), (1, 1, GOLD[2]), (2, 1, GOLD[3]), (3, 1, GOLD[4]), (0, 2, GOLD[2]), (1, 2, GOLD[3]), (2, 2, GOLD[4]), (3, 2, GOLD[5]), (1, 3, GOLD[5]), (2, 3, GOLD[6])): c.put(x, y, col)
    return c.finish()

def build_icon(out):
    icon = bet_plinko_icon(); save(icon, out / "bet_plinko.png")
    Image.fromarray(icon, "RGBA").resize((384, 384), Image.NEAREST).save(out / "bet_plinko.webp", "WEBP", lossless=True, method=6)
    save(cenefa(), out / "cenefa.png")
    zoom_sheet([icon, cenefa()], out / "zoom_icon.png", k=10, cols=2)
