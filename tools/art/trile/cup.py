"""El cubilete del trile: cuero burdeos boca abajo, placa y banda de oro, pespuntes y un rombo de oro (el ♦ de las cartas del crupier)."""
import numpy as np
from pix import *

def cup(f=1.0, detail=True):
    W, H = round(48 * f), round(56 * f); CX = 24.0 * f
    c = Canvas(W, H); xx, yy = c.xx + .5, c.yy + .5
    TOPY, PRX, PRY = 10.0 * f, 11.0 * f, 4.6 * f   # placa de arriba (el culo del cubilete, boca abajo)
    BOTY, BRY = 44.0 * f, 4.8 * f                   # borde de la boca: elipse, su arco delantero asoma por debajo
    def hw(y):
        t = np.clip((y - TOPY) / (BOTY - TOPY), 0, 1); return f * (11.0 + 6.4 * t + 0.9 * t ** 4)
    dx = xx - CX; u = dx / hw(yy)
    hwb = hw(BOTY); bot = BOTY + BRY * np.sqrt(np.clip(1 - (dx / hwb) ** 2, 0, 1))
    body = (yy >= TOPY) & (np.abs(dx) <= hw(yy)) & (yy <= bot)
    # --- cuerpo de cuero: 4 tonos con trama de tramado en los cambios de tono
    ck = (((c.xx + c.yy) % 2) * 2 - 1) * (1 if detail else 0)   # el tramado solo en los grandes
    ue = u + 0.045 * ck
    tone = np.where(ue < -0.58, 0, np.where(ue < 0.10, 1, np.where(ue < 0.60, 2, 3)))
    for i, col in enumerate(RED): c.paint(body & (tone == i), col)
    # sombra de contacto bajo la placa (2 filas mas oscuras)
    plate_front = TOPY + PRY * np.sqrt(np.clip(1 - (dx / PRX) ** 2, 0, 1))
    c.paint(body & (yy < plate_front + 3.2 * f) & (tone <= 1) & (np.abs(dx) < PRX + 4 * f), RED[2])
    # --- pespuntes (hilo de oro, uno si y uno no): bajo la placa y sobre la banda
    st1 = np.abs(yy - (plate_front + 4.2 * f)) < 0.55
    bandtop = bot - 8.2 * f
    st2 = np.abs(yy - (bandtop - 3.4 * f)) < 0.55
    thread = body & ((st1 & (np.abs(dx) < PRX - 0.5)) | (st2 & (np.abs(dx) < hw(yy) - 2.2))) & (c.xx % 2 == 0)
    if detail: c.paint(thread & (u < 0.35), GOLD[2]); c.paint(thread & (u >= 0.35), GOLD[5])
    # --- el rombo de oro, con el centro de cuero (incrustado): ♦
    dia = lambda r: (np.abs(dx) / (5.8 * f * r) + np.abs(yy - 27.5 * f) / (8.2 * f * r)) <= 1.0
    outer, inner = dia(1.0), dia(0.46)
    if detail:
        c.paint(outer & (yy >= TOPY + 8 * f) & (yy <= bandtop - 6 * f), GOLD[1])
        c.paint(outer & (dx > 0.4 * f), GOLD[3]); c.paint(outer & (dx > 0.4 * f) & (yy > 28.5 * f), GOLD[5]); c.paint(outer & (dx <= 0.4 * f) & (yy < 24.5 * f), GOLD[0])
    if detail: c.paint(inner, RED[1]); c.paint(inner & (dx > 0.2), RED[2]); c.paint(inner & (dx < -1.2) & (yy < 27.4), RED[0])
    # --- banda de oro de la boca, siguiendo el arco
    band = body & (yy >= bandtop)
    bue = u + 0.04 * ck
    bt = np.where(bue < -0.86, 0, np.where(bue < -0.40, 1, np.where(bue < 0.06, 2, np.where(bue < 0.48, 3, np.where(bue < 0.80, 5, 6)))))
    bt = np.where((bt == 0) & (yy >= bandtop + 3.6 * f), 1, bt)                  # el brillo del borde solo en lo alto de la banda
    for i in range(7): c.paint(band & (bt == i), GOLD[i])
    c.paint(band & (yy < bandtop + 1.2), RED[3] if detail else RED[2])                             # ranura entre cuero y oro
    c.paint(band & (yy >= bandtop + 1.2) & (yy < bandtop + 2.4) & (bt <= 2), GOLD[0])   # filo de luz
    c.paint(band & (yy > bot - 1.15), GOLD[5]); c.paint(band & (yy > bot - 1.15) & (u > 0.35), GOLD[7])   # canto inferior
    # --- placa de arriba, de oro cepillado
    plate = c.ell(CX, TOPY, PRX, PRY)
    edge = plate & ~c.ell(CX, TOPY - 0.9, PRX - 0.6, PRY - 0.2)
    v = ((xx - (CX - 4.2)) / PRX) ** 2 + ((yy - (TOPY - 1.3)) / PRY) ** 2
    pt = np.where(v < 0.10, 0, np.where(v < 0.52, 1, np.where(v < 0.93, 3, 4)))
    pt = np.where(((v > 0.47) & (v < 0.55)) & (ck > 0), pt - 1, pt)      # tramado
    for i, col in enumerate(GOLD[:5]): c.paint(plate & (pt == i), col)
    ring = plate & (np.abs(np.sqrt(((xx - CX) / PRX) ** 2 + ((yy - TOPY) / PRY) ** 2) - 0.60) < 0.075)
    if detail: c.paint(ring & (u < 0.0), GOLD[3]); c.paint(ring & (u >= 0.0), GOLD[5])   # grabado en la placa
    thick = c.ell(CX, TOPY + 1.2, PRX, PRY) & ~plate                         # el grosor de la placa
    c.paint(thick & (u < 0.2), GOLD[4]); c.paint(thick & (u >= 0.2), GOLD[6])
    c.paint(edge & (dx > 3), GOLD[5])
    return c.finish(margin=(0 if f >= 1 else 1))

def shadow(w=44, h=12):
    """sombra del cubilete en el tapete: elipse con tramado en el borde"""
    c = Canvas(w, h); yy, xx = c.yy, c.xx
    core = c.ell(w / 2, h / 2, w / 2 - 1, h / 2 - 1); inner = c.ell(w / 2, h / 2, w / 2 - 5, h / 2 - 2.2)
    out = np.zeros((h, w, 4), np.uint8)
    ck = ((xx + yy) % 2) == 0
    out[core & ck] = (8, 0, 24, 120); out[core & ~ck] = (8, 0, 24, 70)
    out[inner] = (8, 0, 24, 150)
    return out

if __name__ == "__main__":
    a = cup(); save(a, HERE / "out" / "cup.png"); save(shadow(), HERE / "out" / "shadow.png")
    zoom_sheet([a, shadow()], HERE / "out" / "zoom_cup.png", k=12, cols=2)
    print("cup", a.shape)
