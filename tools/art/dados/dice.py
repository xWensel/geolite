"""Los dados: cubo de aristas redondeadas (SDF), 3 caras visibles, sombreado de 4 tonos con tramado, pips proyectados de verdad y contorno indigo.
Dos materiales:
  'ivory' (TUS dados)   marfil con pips rojos: es el dado del icono del juego (assets/icons/dice.webp), asi la carta y la mesa hablan igual.
  'burg'  (LA BANCA)    burdeos con pips de marfil y FILETE DE ORO en las aristas: el cuero y el oro del cubilete de Don Crupier.
Valores: caras opuestas suman 7; 1,2,3 en sentido antihorario alrededor de una esquina (dado 'diestro')."""
from rt import *

W, K, RR = 34, 10.0, 0.15           # lienzo, pixeles por unidad (arista = 2 u = 20 px) y redondeo de la arista
LIGHT = unit([-0.55, 0.80, 0.45])   # arriba-izquierda-delante
IVORY = [hexc(c) for c in ("fffbe8", "f6e9c6", "d9c5b6", "9b82a8")]
BURG = [hexc(c) for c in ("cf3552", "9c1c3a", "6e1030", "3f0820")]
GOLDE = [GOLD[0], GOLD[1], GOLD[3], GOLD[5]]
PIPR = [RED[1], RED[1], RED[2], RED[3]]
PIPR_HI, PIPR_LO = RED[0], RED[3]
PIPI = IVORY
FACE_VAL = {(1, 1): 1, (1, -1): 6, (2, 1): 2, (2, -1): 5, (0, 1): 3, (0, -1): 4}      # (eje, signo) -> valor
# coordenadas (u derecha, v arriba) vistas desde fuera: (eje u, signo u, eje v, signo v)
UV = {(1, 1): (0, 1, 2, -1), (1, -1): (0, 1, 2, 1), (2, 1): (0, 1, 1, 1), (2, -1): (0, -1, 1, 1), (0, 1): (2, -1, 1, 1), (0, -1): (2, 1, 1, 1)}
S = 0.54
PIPS = {1: [(0, 0)], 2: [(-S, S), (S, -S)], 3: [(-S, S), (0, 0), (S, -S)], 4: [(-S, S), (S, S), (-S, -S), (S, -S)],
       5: [(-S, S), (S, S), (0, 0), (-S, -S), (S, -S)], 6: [(-S, S), (-S, 0), (-S, -S), (S, S), (S, 0), (S, -S)]}
PR = 0.235                         # radio del pip (u)

def sdf(Q, r=RR):
    q = np.abs(Q) - (1.0 - r)
    return np.linalg.norm(np.maximum(q, 0), axis=-1) + np.minimum(q.max(-1), 0) - r

def rest_matrix(n):
    """orientacion con la cara n arriba (y+)"""
    return {1: np.eye(3), 6: Rx(180), 2: Rx(-90), 5: Rx(90), 3: Rz(90), 4: Rz(-90)}[n]

def pose(n, axis="Z", theta=0.0, yaw=0.0):
    """R = Ry(yaw) . Rroll(axis, theta) . Rest(n). Ejes: X (rueda hacia el espectador), Z (de lado), Y (peonza), C (diagonal)."""
    R0 = rest_matrix(n)
    if axis == "X": Rr = Rx(theta)
    elif axis == "Z": Rr = Rz(theta)
    elif axis == "C": Rr = Raxis([1, 0, 1], theta)
    else: return Ry(yaw + theta) @ R0
    return Ry(yaw) @ Rr @ R0

def render_die(M, mat="ivory", w=W, k=K, rr=RR):
    j, i = np.mgrid[0:w, 0:w]
    sx = (i + .5 - w / 2) / k; su = (w / 2 - (j + .5)) / k
    Ow = sx[..., None] * EX + su[..., None] * EU                       # origen del rayo en el plano de la pantalla
    Ol = Ow @ M; Dl = -(NC @ M)                                         # al sistema del dado (Q = M^T P)
    t = np.zeros(sx.shape); T0 = 3.0
    start = Ol + T0 * (NC @ M)                                          # punto de partida cerca de la camara
    hit = np.zeros(sx.shape, bool)
    for _ in range(56):
        d = sdf(start + t[..., None] * Dl, rr)
        hit |= d < 0.004
        t = np.where(hit, t, t + np.maximum(d, 0.01)); t = np.minimum(t, 7.0)
    Q = start + t[..., None] * Dl
    hit &= sdf(Q, rr) < 0.02
    eps = 0.012; nl = np.zeros(Q.shape)
    for a in range(3):
        e = np.zeros(3); e[a] = eps; nl[..., a] = sdf(Q + e, rr) - sdf(Q - e, rr)
    nl /= np.maximum(np.linalg.norm(nl, axis=-1, keepdims=True), 1e-9)
    nw = nl @ M.T
    lum = np.clip(nw @ LIGHT, 0, 1)
    ck = ordered(w, w)
    nedge = (np.abs(Q) > (1.0 - rr - 0.035)).sum(-1)
    lv = 0.30 + 0.78 * lum + 0.03 * ck * (nedge >= 2)               # el tramado solo en las aristas (las caras planas van a un tono)
    tone = np.where(lv > 0.93, 0, np.where(lv > 0.66, 1, np.where(lv > 0.40, 2, 3)))
    spec = hit & (lum > 0.955)                                          # el destello del filo iluminado
    aQ = np.abs(Q); ax = np.argmax(aQ, -1); sg = np.sign(np.take_along_axis(Q, ax[..., None], -1)[..., 0]).astype(int)
    bevel = (aQ > (1.0 - rr - 0.035)).sum(-1) >= 2
    rgb = np.zeros((w, w, 3), np.uint8)
    body, pipc = (IVORY, PIPR) if mat == "ivory" else (BURG, PIPI)
    for ti in range(4):
        m = hit & (tone == ti)
        rgb[m] = body[ti]
        if mat == "burg": rgb[m & bevel] = GOLDE[ti]
    if mat == "burg": rgb[spec & bevel] = (255, 253, 232)
    # --- pips: circulos en el plano de la cara, asi salen elipses al verlos de lado
    Pw = Q @ M.T                                                       # posicion de mundo (relativa al centro del dado)
    for (a, s), val in FACE_VAL.items():
        fm = hit & (ax == a) & (sg == s) & ~bevel
        if not fm.any(): continue
        ua, us, va, vs = UV[(a, s)]
        u = us * Q[..., ua]; v = vs * Q[..., va]
        for (pu, pv) in PIPS[val]:
            pm = fm & ((u - pu) ** 2 + (v - pv) ** 2 < PR ** 2)
            if not pm.any(): continue
            c = np.zeros(3); c[a] = s; c[ua] = pu * us; c[va] = pv * vs      # el centro del pip (en local): u = us*Q[ua] -> Q[ua] = pu*us
            off = Pw - (c @ M.T)
            g = (-(off @ EX) + (off @ EU)) / (PR * 1.35)                    # >0: arriba-izquierda del pip
            for ti in range(4):
                mm = pm & (tone == ti)
                if mat == "ivory":
                    rgb[mm] = pipc[ti]
                    rgb[mm & (g > 0.50) & (ti <= 1)] = PIPR_HI
                    rgb[mm & (g < -0.55)] = PIPR_LO
                else:
                    rgb[mm] = pipc[ti]
                    rgb[mm & (g < -0.55)] = IVORY[min(3, ti + 1)]
    return finish_rgba(rgb, hit, 1)

def sheet(mat, yaw, angles=16):
    """hoja de un material y una guinada: filas = (valor, eje), columnas = angulo (0, 22.5, ...). theta = 0 es el reposo."""
    rows = []
    for n in range(1, 7):
        for ax in "XZYC":
            rows.append([render_die(pose(n, ax, a * 360.0 / angles, yaw), mat) for a in range(angles)])
    h, w = rows[0][0].shape[:2]
    out = np.zeros((h * len(rows), w * angles, 4), np.uint8)
    for r, row in enumerate(rows):
        for c, f in enumerate(row): out[r * h:(r + 1) * h, c * w:(c + 1) * w] = f
    return out

YAWS = [-40.0, 20.0, 36.0]

if __name__ == "__main__":
    out = MYDIR / "out"; out.mkdir(exist_ok=True)
    fr = [render_die(pose(n, "Z", 0, YAWS[1]), "ivory") for n in range(1, 7)] + [render_die(pose(n, "Z", 0, YAWS[0]), "burg") for n in range(1, 7)]
    fr += [render_die(pose(5, "X", a * 22.5, YAWS[2]), "ivory") for a in range(6)] + [render_die(pose(3, "C", a * 22.5, YAWS[1]), "burg") for a in range(6)]
    zoom_sheet(fr, out / "zoom_dice.png", k=8, cols=6)
    print(fr[0].shape)
