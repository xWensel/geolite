"""Piezas del tapete de Duelo de dados: fieltro verde azulado, baranda acolchada de cuero burdeos con capitone y botones de oro, aro de aterrizaje,
sombras, cenefa de la carta (una hilera de caras de dado) y el icono de la carta (48 px, igual que los demas)."""
from rt import *
from dice import render_die, pose, IVORY, YAWS, PIPR
import cupd
from PIL import Image

def A(rows):  # lista de filas de (color) -> array RGBA
    pass

def felt(n=32, seed=11):
    """tapete: motas de 1 px (hilos claros y oscuros) con una trama muy suave de tejido"""
    rng = np.random.default_rng(seed); out = np.zeros((n, n, 4), np.uint8); r = rng.random((n, n))
    out[r < 0.06] = (210, 255, 245, 15); out[(r >= 0.06) & (r < 0.17)] = (0, 18, 24, 34)
    out[(np.arange(n)[:, None] % 8 == 0) & (np.arange(n)[None, :] % 2 == 0)] = (0, 30, 36, 22)
    return out

RAIL = {"k": INK, "g1": GOLD[1], "g3": GOLD[3], "g5": GOLD[5], "h": RED[0], "r1": RED[1], "r2": RED[2], "r3": RED[3], "s": hexc("ffd0c8")}
def rail_profile():
    """22 posiciones a traves de la baranda: filete de oro (fuera) -> luz -> cuero -> sombra"""
    return ["k", "g1", "g3", "g5", "k", "h", "h", "s" , "r1", "r1", "r1", "r1", "r1", "r2", "r2", "r2", "r2", "r3", "r3", "k", None, None][:22]

def rail_h(w=24, h=22):
    out = np.zeros((h, w, 4), np.uint8)
    prof = ["k", "g1", "g3", "g5", "k", "h", "h", "r1", "r1", "r1", "r1", "r1", "r1", "r2", "r2", "r2", "r2", "r3", "r3", "k", None, None]
    for y, code in enumerate(prof):
        if code: out[y, :, :3] = RAIL[code]; out[y, :, 3] = 255
    # capitone: un boton de oro cada 24 px y los pliegues en X hasta el borde
    cx, cy = 12, 11
    for k in range(3, 8):
        for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            x, y = (cx + dx * k) % w, cy + dy * k
            if 5 <= y <= 18: out[y, x, :3] = RED[3] if k < 6 else RED[2]
    for (dx, dy, col) in ((-1, -1, GOLD[0]), (0, -1, GOLD[1]), (1, -1, GOLD[3]), (-1, 0, GOLD[1]), (0, 0, GOLD[3]), (1, 0, GOLD[5]), (-1, 1, GOLD[3]), (0, 1, GOLD[5]), (1, 1, GOLD[6])):
        out[cy + dy, cx + dx, :3] = col
    out[cy - 1, cx - 1, :3] = GOLD[0]; out[cy + 2, cx - 1:cx + 2, :3] = RED[3]; out[cy + 2, cx - 1:cx + 2, 3] = 255     # sombra bajo el boton
    return out

def rail_v(side, w=22, h=24):
    """baranda lateral: lo mismo girado. 'l': filete fuera (izquierda) y luz fuera; 'r': filete fuera (derecha), luz en el lado de dentro (izquierda)"""
    hz = rail_h(h, w)                                 # (w alto) x (h ancho): lo transponemos
    v = np.transpose(hz, (1, 0, 2)).copy()           # ahora (24 filas, 22 columnas): columna 0 = fuera, 21 = dentro
    if side == "l": return v
    # derecha: el filete queda fuera (a la derecha) y la luz a la izquierda: invertimos y rehacemos las capas de cuero
    f = v[:, ::-1].copy()
    cush = v[:, 5:20][:, ::-1]                         # el cuero (luz -> sombra) lo ponemos con la luz a la izquierda... ya esta invertido: la luz quedaria a la derecha
    f[:, 1:16] = v[:, 5:20]; f[:, 16:19] = v[:, 1:4][:, ::-1]; f[:, 19] = v[:, 4]; f[:, 20:] = 0
    # reordenado: [k][luz..sombra][k][g5 g3 g1][k]
    f2 = np.zeros_like(v); f2[:, 0] = v[:, 4]; f2[:, 1:16] = v[:, 5:20]; f2[:, 16] = v[:, 19]; f2[:, 17] = v[:, 4]; f2[:, 18] = v[:, 3]; f2[:, 19] = v[:, 2]; f2[:, 20] = v[:, 1]; f2[:, 21] = v[:, 0]
    return f2

def ring(w=124, h=46):
    """aro de oro grabado donde aterrizan los dados: 1 px de oro con luz arriba-izquierda, relleno de sombra suave y cuatro rombos"""
    c = Canvas(w, h); out = np.zeros((h, w, 4), np.uint8)
    cx, cy, rx, ry = w / 2, h / 2, w / 2 - 1, h / 2 - 1
    outer = c.ell(cx, cy, rx, ry); inner = c.ell(cx, cy, rx - 1.6, ry - 1.6); rg = outer & ~inner
    xx, yy = c.xx + .5, c.yy + .5
    lit = ((xx - cx) / rx + (yy - cy) / ry) < -0.25; dark = ((xx - cx) / rx + (yy - cy) / ry) > 0.55
    out[rg] = (*GOLD[3], 235); out[rg & lit] = (*GOLD[1], 245); out[rg & dark] = (*GOLD[5], 230)
    out[inner] = (0, 20, 22, 42)
    # segundo aro interior, fino y apagado
    i2 = c.ell(cx, cy, rx - 6, ry - 5) & ~c.ell(cx, cy, rx - 7, ry - 6)
    out[i2] = (*GOLD[5], 120)
    for (px, py) in ((cx - rx, cy), (cx + rx, cy)):     # rombos en los extremos
        for k in range(-3, 4):
            for dx in range(-(3 - abs(k)), 4 - abs(k)):
                x, y = int(px + dx - (1 if px > cx else 0)), int(py + k)
                if 0 <= x < w and 0 <= y < h: out[y, x] = (*GOLD[1], 255) if dx <= 0 else (*GOLD[3], 255)
    return out

def die_shadow(w, h):
    c = Canvas(w, h); out = np.zeros((h, w, 4), np.uint8); ck = ((c.xx + c.yy) % 2) == 0
    core = c.ell(w / 2, h / 2, w / 2 - .5, h / 2 - .5); inner = c.ell(w / 2, h / 2, w / 2 - 3, h / 2 - 1.6)
    out[core & ck] = (2, 14, 18, 120); out[core & ~ck] = (2, 14, 18, 62); out[inner] = (2, 14, 18, 150)
    return out

def cenefa(face=8):
    """una hilera de caras de dado (1..6) con el borde indigo: la cenefa de la carta"""
    tiles = []
    pos = {1: [(3, 3)], 2: [(1, 1), (6, 6)], 3: [(1, 1), (3, 3), (6, 6)], 4: [(1, 1), (6, 1), (1, 6), (6, 6)], 5: [(1, 1), (6, 1), (3, 3), (1, 6), (6, 6)], 6: [(1, 1), (1, 3), (1, 6), (6, 1), (6, 3), (6, 6)]}
    for n in range(1, 7):
        c = Canvas(face, face)
        c.paint(c.xx >= 0, IVORY[1]); c.paint(c.yy == 0, IVORY[0]); c.paint(c.xx == 0, IVORY[0]); c.paint(c.yy == face - 1, IVORY[2]); c.paint(c.xx == face - 1, IVORY[2]); c.put(face - 1, face - 1, IVORY[3])
        for (x, y) in pos[n]:
            c.put(x, y, RED[1]); c.put(x + 1, y, RED[1]) if n in (1,) else None
            if n == 1: c.put(x, y + 1, RED[2]); c.put(x + 1, y + 1, RED[2])
        tiles.append(c.finish(margin=1))
    h, w = tiles[0].shape[:2]
    out = np.zeros((h, (w + 1) * 6, 4), np.uint8)
    for k, t in enumerate(tiles): out[:, k * (w + 1):k * (w + 1) + w] = t
    return out

def paste(dst, src, x, y):
    h, w = src.shape[:2]
    for j in range(h):
        for i in range(w):
            if src[j, i, 3] and 0 <= y + j < dst.shape[0] and 0 <= x + i < dst.shape[1]: dst[y + j, x + i] = src[j, i]

def bet_icon(v=1):
    """icono de la carta (48x48): el duelo = dos dados, el tuyo (marfil) delante y el de la banca (burdeos con oro) detras, chocando"""
    icon = np.zeros((48, 48, 4), np.uint8)
    P = [dict(burg=(4, "Z", 22.5, 0, 9.0, -3, 5), ivo=(6, "Z", 0, 1, 9.6, 14, 12)),
         dict(burg=(3, "C", 45, 0, 9.0, -2, 6), ivo=(5, "Z", 0, 1, 9.4, 14, 12))][v]
    n, ax, th, yi, k, x, y = P["burg"]; n2, ax2, th2, yi2, k2, x2, y2 = P["ivo"]
    paste(icon, die_shadow(30, 9), 8, 39)
    paste(icon, render_die(pose(n, ax, th, YAWS[0]), "burg", w=34, k=k), x, y)
    paste(icon, render_die(pose(n2, ax2, th2, YAWS[1]), "ivory", w=34, k=k2), x2, y2)
    return icon

if __name__ == "__main__":
    out = MYDIR / "out"; out.mkdir(exist_ok=True)
    ic = bet_icon(); save(ic, out / "bet_dados.png")
    Image.fromarray(ic, "RGBA").resize((384, 384), Image.NEAREST).save(out / "bet_dados.webp", "WEBP", lossless=True, method=6)
    zoom_sheet([ic, rail_h(), rail_v("l"), rail_v("r"), cenefa(), ring(), die_shadow(26, 9)], out / "zoom_mesa.png", k=8, cols=4)
