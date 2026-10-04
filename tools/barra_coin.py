"""Uso: python tools/barra_coin.py <raiz del repo> [hoja_de_prueba.png]
La moneda de la Barra, con el arte de la moneda de los logros (assets/icons/coin.webp, pixel logico de 8 px):
 - coin_spin.webp : 24 fotogramas de 64x64 (pixel logico) de la moneda girando sobre su eje horizontal (cara = Don Crupier acunado, de tools/barra_coin_crupier.py; cruz = rosa de los vientos)
 - coin_stand.webp: la moneda de canto, de pie
 - bet_coin.webp  : el icono de la casilla (la moneda inclinada del giro, sin destellos)
Se renderiza la moneda como un cilindro: dos caras elipticas con la textura del arte original y el canto con su cordoncillo."""
import math, sys
import numpy as np
from PIL import Image

ROOT = sys.argv[1]
ICONS = ROOT + "/assets/icons/"
OUT = sys.argv[3] + "/" if len(sys.argv) > 3 else ICONS
INK = (29, 10, 61, 255)
GOLD = (245, 166, 35, 255); LIGHT = (255, 217, 90, 255); ORANGE = (196, 106, 27, 255); BROWN = (127, 58, 26, 255); CREAM = (255, 246, 200, 255)
F = 64                                   # lienzo logico del fotograma
CX, CY0 = 32.0, 27.5                      # centro de la cara en el arte original
RX, RY = 28.0, 26.5                       # semiejes de la cara
T = 7                                     # grosor del canto (pixeles logicos)
ALPHA = 19                                # la camara mira la moneda un poco desde arriba (como el arte original): en reposo se ve el canto abajo

src = Image.open(ICONS + "coin.webp").convert("RGBA").resize((64, 64), Image.NEAREST)


def face_mask():
    m = np.zeros((64, 64), bool)
    for y in range(64):
        for x in range(64):
            if ((x + .5 - CX) / RX) ** 2 + ((y + .5 - CY0) / RY) ** 2 <= 1.0:
                m[y, x] = True
    return m


FM = face_mask()


def plain_face():
    a = np.array(src)
    out = np.zeros_like(a)
    out[FM] = a[FM]
    return out


def heads_face():
    """la cara: Don Crupier (sus pixeles de dealer_neutral) acunado en oro; el ala de la chistera pisa el anillo fino"""
    sys.path.insert(0, ROOT + "/tools")
    import barra_coin_crupier as relief
    a = plain_face()
    for y in range(64):
        for x in range(64):
            r = math.hypot(x + .5 - CX, y + .5 - CY0)
            if FM[y, x] and (r < 19.2 or (r < 20.5 and tuple(a[y, x]) != BROWN)):   # sin restos de la estrella; el anillo fino se queda
                a[y, x] = GOLD
    return relief.paint(a, ROOT)[0]


def tails_face():
    """igual que la cara, con la estrella cambiada por una rosa de los vientos (la cruz de la geografia)"""
    a = plain_face()
    for y in range(64):
        for x in range(64):
            if math.hypot(x + .5 - CX, y + .5 - CY0) < 17.5 and FM[y, x]:
                a[y, x] = GOLD
    # anillo interior fino, como el de la cara
    img = Image.fromarray(a).copy()
    px = img.load()

    def poly(pts, col):
        from PIL import ImageDraw
        ImageDraw.Draw(img).polygon(pts, fill=col)

    cx, cy = 32, 27.5
    L, S = 15.5, 6.0
    # 4 puntas largas (N, E, S, O), mitad clara y mitad en sombra
    for ang in (0, 90, 180, 270):
        r = math.radians(ang)
        ux, uy = math.sin(r), -math.cos(r)           # direccion de la punta
        vx, vy = -uy, ux                              # perpendicular
        tip = (cx + ux * L, cy + uy * L)
        l = (cx + vx * 3.4 + ux * 3, cy + vy * 3.4 + uy * 3)
        rt = (cx - vx * 3.4 + ux * 3, cy - vy * 3.4 + uy * 3)
        poly([tip, l, (cx, cy)], LIGHT)
        poly([tip, rt, (cx, cy)], ORANGE)
    # 4 puntas cortas en diagonal
    for ang in (45, 135, 225, 315):
        r = math.radians(ang)
        ux, uy = math.sin(r), -math.cos(r)
        vx, vy = -uy, ux
        tip = (cx + ux * (L * .62), cy + uy * (L * .62))
        l = (cx + vx * 2.0 + ux * 2, cy + vy * 2.0 + uy * 2)
        rt = (cx - vx * 2.0 + ux * 2, cy - vy * 2.0 + uy * 2)
        poly([tip, l, (cx, cy)], GOLD if ang in (45, 225) else BROWN)
        poly([tip, rt, (cx, cy)], BROWN if ang in (45, 225) else GOLD)
    # centro con su brillo
    from PIL import ImageDraw
    d = ImageDraw.Draw(img)
    d.ellipse([cx - 2.6, cy - 2.6, cx + 2.6, cy + 2.6], fill=CREAM)
    d.ellipse([cx - 1.4, cy - 1.4, cx + 1.4, cy + 1.4], fill=LIGHT)
    # anillo fino alrededor (como el de la estrella del arte original)
    for k in range(360):
        r = math.radians(k)
        x = int(cx + math.sin(r) * 19.5); y = int(cy - math.cos(r) * 19.5)
        if 0 <= x < 64 and 0 <= y < 64 and FM[y, x]:
            px[x, y] = ORANGE
    return np.array(img)


HEADS, TAILS = heads_face(), tails_face()


def rim_color(x, ty, depth):
    """cordoncillo: franjas verticales de 2 px; ty = posicion en el grosor (0 arriba .. 1 abajo)"""
    col = ORANGE if (int(x) // 2) % 2 == 0 else BROWN
    if ty < 0.18:
        col = BROWN if col == ORANGE else INK
    if 0.36 < ty < 0.55 and col == ORANGE:
        col = GOLD
    return col


def frame(theta_deg):
    th = math.radians(theta_deg)
    s, sn = math.cos(th), math.sin(th)
    out = np.zeros((F, F, 4), np.uint8)
    cx, cy = 32.0, 32.0
    # centros de las dos caras (A delante, B detras) tras girar sobre el eje horizontal
    yA, yB = cy - (T / 2) * sn, cy + (T / 2) * sn
    vis = HEADS if s >= 0 else TAILS
    yv = yA if s >= 0 else yB
    yo = yB if s >= 0 else yA                  # el centro de la cara oculta
    b = RY * abs(s)
    a = RX
    # --- canto: apila elipses entre los dos centros
    steps = int(max(1, round(abs(yB - yA) * 2)))
    lo, hi = (min(yA, yB), max(yA, yB))
    for i in range(steps + 1):
        yc = lo + (hi - lo) * (i / steps if steps else 0)
        ty = (yc - lo) / (hi - lo) if hi > lo else 0.5
        y0, y1 = int(math.floor(yc - max(b, 0.5) - 1)), int(math.ceil(yc + max(b, 0.5) + 1))
        for y in range(max(0, y0), min(F, y1 + 1)):
            dy = (y + .5 - yc) / max(b, 0.5)
            if abs(dy) > 1:
                continue
            half = a * math.sqrt(max(0.0, 1 - dy * dy))
            for x in range(int(math.floor(cx - half)), int(math.ceil(cx + half))):
                if 0 <= x < F and abs(x + .5 - cx) <= half:
                    c = rim_color(x, 1 - ty if s >= 0 else ty, 0)   # el borde mas proximo a la cara visible, arriba del grosor
                    out[y, x] = c
    # --- cara visible
    if b >= 1.4:
        flip = s < 0
        for y in range(F):
            v = (y + .5 - yv) / b
            if abs(v) > 1:
                continue
            half = a * math.sqrt(max(0.0, 1 - v * v))
            sv = -v if flip else v
            sy = int(CY0 + sv * RY)
            for x in range(int(math.floor(cx - half)), int(math.ceil(cx + half))):
                if 0 <= x < F and abs(x + .5 - cx) <= half:
                    sx = int(CX + (x + .5 - cx) / a * RX)
                    sx = max(0, min(63, sx)); sy2 = max(0, min(63, sy))
                    px = vis[sy2, sx]
                    if px[3] > 0:
                        out[y, x] = px
    # --- contorno de tinta alrededor de todo
    alpha = out[:, :, 3] > 0
    ink = np.zeros_like(alpha)
    ink[1:, :] |= alpha[:-1, :]; ink[:-1, :] |= alpha[1:, :]; ink[:, 1:] |= alpha[:, :-1]; ink[:, :-1] |= alpha[:, 1:]
    edge = ink & ~alpha
    out[edge] = INK
    return Image.fromarray(out)


def sheet(n=24):
    im = Image.new("RGBA", (F * n, F), (0, 0, 0, 0))
    for k in range(n):
        im.alpha_composite(frame(k * 360 / n + ALPHA), (k * F, 0))
    return im


def stand():
    """la moneda de canto: un cilindro de pie visto de lado (altura 2*RX, ancho T), cordoncillo en horizontal"""
    W, H = 16, 64
    out = np.zeros((H, W, 4), np.uint8)
    cx = W / 2
    top, bot = 4.0, 60.0
    for y in range(H):
        for x in range(W):
            if not (top <= y + .5 <= bot):
                continue
            ty = (x + .5 - (cx - T / 2)) / T
            if not (0 <= ty <= 1):
                continue
            # extremos redondeados (el borde de la moneda curva)
            e = min(y + .5 - top, bot - (y + .5))
            if e < 2.2 and (ty < 0.15 or ty > 0.85) and e < 1.2:
                continue
            band = (y // 2) % 2
            col = ORANGE if band == 0 else BROWN
            if ty < 0.3:
                col = GOLD if band == 0 else ORANGE          # luz a la izquierda
            elif ty > 0.78:
                col = BROWN if band == 0 else INK            # sombra a la derecha
            out[y, x] = col
    alpha = out[:, :, 3] > 0
    ink = np.zeros_like(alpha)
    ink[1:, :] |= alpha[:-1, :]; ink[:-1, :] |= alpha[1:, :]; ink[:, 1:] |= alpha[:, :-1]; ink[:, :-1] |= alpha[:, 1:]
    out[ink & ~alpha] = INK
    return Image.fromarray(out)


def icon(sp):
    """icono de la casilla: la moneda inclinada del propio giro (fotograma 1: se ve la cara y el canto), centrada; sin destellos"""
    f = sp.crop((F, 0, 2 * F, F)); bb = f.getbbox()
    c = Image.new("RGBA", (F, F), (0, 0, 0, 0)); h = bb[3] - bb[1]
    c.alpha_composite(f.crop((0, bb[1], F, bb[3])), (0, (F - h) // 2))
    return c


if __name__ == "__main__":
    sp = sheet()
    sp.save(OUT + "coin_spin.webp", lossless=True)
    st = stand()
    st.save(OUT + "coin_stand.webp", lossless=True)
    ic = icon(sp).resize((384, 384), Image.NEAREST)
    ic.save(OUT + "bet_coin.webp", lossless=True)
    # hoja de contacto para revisar
    prev = Image.new("RGBA", (F * 12 * 4, F * 2 * 4 + 40 * 4), (30, 60, 90, 255))
    big = sp.resize((sp.width * 4, sp.height * 4), Image.NEAREST)
    for r in range(2):
        prev.alpha_composite(big.crop((r * F * 12 * 4, 0, (r + 1) * F * 12 * 4, F * 4)), (0, r * F * 4))
    prev.alpha_composite(st.resize((st.width * 4, st.height * 4), Image.NEAREST), (10, F * 8))
    prev.alpha_composite(ic.resize((256, 256), Image.NEAREST), (200, F * 8 - 60))
    if len(sys.argv) > 2:
        prev.save(sys.argv[2])
