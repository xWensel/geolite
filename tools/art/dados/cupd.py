"""El cubilete de los dados: el mismo cuero burdeos, banda de oro, placa de oro y rombo del cubilete del trile, pero BOCA ARRIBA (con la boca abierta).
Se traza como cuerpo de revolucion y se gira alrededor del eje z (de pie, agitando, vertiendo, boca abajo = como el del trile): 24 angulos.
Dos capas por angulo: 'back' (interior y borde lejano, DETRAS de los dados) y 'front' (pared y borde cercano, DELANTE): los dados se meten entre ambas."""
from rt import *

W = 60                     # lienzo nativo
HC, WT, FL = 40.0, 2.3, 3.2   # alto, grosor de la pared y del suelo
BAND = 8.5                 # banda de oro de la boca
LCUP = unit([-0.78, 0.50, 0.68])

def prof(s): return 11.0 + 5.4 * s + 0.7 * s ** 4

def solid(Q):
    y = Q[..., 1]; rho = np.hypot(Q[..., 0], Q[..., 2]); s = np.clip(y / HC, 0, 1); r = prof(s)
    outer = (y >= 0) & (y <= HC) & (rho <= r)
    inner = (y >= FL) & (y <= HC + 1) & (rho <= r - WT)
    return outer & ~inner

def render_cup(phi, w=W, sc=1.0):
    M = Rz(phi)
    j, i = np.mgrid[0:w, 0:w]; sx = (i + .5 - w / 2) / sc; su = (w / 2 - (j + .5)) / sc
    Ow = sx[..., None] * EX + su[..., None] * EU
    ts = np.arange(0, 90, 0.3)
    C = np.array([0, HC / 2, 0])
    def Qof(t): return ((Ow + (45 - t)[..., None] * NC) @ M) + C if np.ndim(t) else None
    # primer punto solido a lo largo del rayo (de cerca a lejos)
    first = np.full(sx.shape, np.inf)
    for t in ts:
        P = (Ow + (45 - t) * NC) @ M + C
        m = solid(P) & ~np.isfinite(first); first[m] = t
    hit = np.isfinite(first)
    lo = np.where(hit, first - 0.3, 0.0); hi = np.where(hit, first, 0.0)
    for _ in range(7):
        mid = (lo + hi) / 2; P = (Ow + (45 - mid)[..., None] * NC) @ M + C
        s_ = solid(P); hi = np.where(s_, mid, hi); lo = np.where(s_, lo, mid)
    Q = (Ow + (45 - hi)[..., None] * NC) @ M + C
    y = Q[..., 1]; rho = np.hypot(Q[..., 0], Q[..., 2]) + 1e-9; s = np.clip(y / HC, 0, 1); r = prof(s)
    drdy = (5.4 + 2.8 * s ** 3) / HC
    # clasificacion de la superficie y normal local
    rim = hit & (y > HC - 0.45) & (rho >= r - WT - 0.05)
    floor_out = hit & (y < 0.5)
    floor_in = hit & (y < FL + 0.5) & (rho < r - WT - 0.2) & ~floor_out
    outer = hit & ~rim & ~floor_out & ~floor_in & (rho > r - WT * 0.5)
    inner = hit & ~rim & ~floor_out & ~floor_in & ~outer
    nrm = np.zeros(Q.shape); rad = np.stack([Q[..., 0] / rho, np.zeros_like(rho), Q[..., 2] / rho], -1)
    nout = rad.copy(); nout[..., 1] = -drdy[..., None][..., 0]; nout /= np.linalg.norm(nout, axis=-1, keepdims=True)
    nin = -rad.copy(); nin[..., 1] = drdy; nin /= np.linalg.norm(nin, axis=-1, keepdims=True)
    up = np.zeros(Q.shape); up[..., 1] = 1
    nrm[outer] = nout[outer]; nrm[inner] = nin[inner]; nrm[rim] = up[rim]; nrm[floor_in] = up[floor_in]; nrm[floor_out] = -up[floor_out]
    nw = nrm @ M.T
    lum = np.clip(nw @ LCUP, 0, 1)
    ck = ordered(w, w)
    lv = 0.18 + 0.86 * lum + 0.035 * ck
    rgb = np.zeros((w, w, 3), np.uint8)
    # --- cuero (pared exterior)
    tone = np.where(lv > 0.97, 0, np.where(lv > 0.62, 1, np.where(lv > 0.38, 2, 3)))
    body = outer & (y > FL) & (y < HC - BAND)
    for ti in range(4): rgb[body & (tone == ti)] = RED[ti]
    # sombra de contacto bajo la banda y sobre la placa
    rgb[body & (y > HC - BAND - 2.2) & (tone <= 1)] = RED[2]
    rgb[body & (y < FL + 2.0) & (tone <= 1)] = RED[2]
    # pespuntes: hilo de oro, uno si y uno no
    a = np.arctan2(Q[..., 0], Q[..., 2]); u = rho * a
    for ys in (FL + 3.6, HC - BAND - 3.6):
        th = body & (np.abs(y - ys) < 0.55) & (np.floor(u) % 2 == 0)
        rgb[th & (tone <= 1)] = GOLD[2]; rgb[th & (tone > 1)] = GOLD[5]
    # rombo de oro con el centro de cuero (el rombo de las cartas del crupier) en el frente
    ye = FL + (HC - BAND - FL) * 0.52
    dia = lambda k: (np.abs(u) / (5.4 * k) + np.abs(y - ye) / (9.0 * k)) <= 1.0
    front = body & (np.abs(a) < 1.2)
    outd, ind = front & dia(1.0), front & dia(0.46)
    rgb[outd] = GOLD[1]; rgb[outd & (u > 0.4)] = GOLD[3]; rgb[outd & (u > 0.4) & (y < ye - 1)] = GOLD[5]; rgb[outd & (u <= 0.4) & (y > ye + 2)] = GOLD[0]
    rgb[ind] = RED[1]; rgb[ind & (u > 0.2)] = RED[2]; rgb[ind & (u < -0.8) & (y > ye)] = RED[0]
    # --- banda de oro de la boca y su borde
    gl = np.where(lv > 1.0, 0, np.where(lv > 0.80, 1, np.where(lv > 0.62, 2, np.where(lv > 0.46, 3, np.where(lv > 0.30, 4, 5)))))
    GR = [GOLD[0], GOLD[1], GOLD[2], GOLD[3], GOLD[5], GOLD[6]]
    bnd = (outer | rim) & (y >= HC - BAND)
    for gi in range(6): rgb[bnd & (gl == gi)] = GR[gi]
    rgb[outer & (y >= HC - BAND) & (y < HC - BAND + 1.0)] = RED[3]                       # ranura entre cuero y oro
    rgb[outer & (y >= HC - BAND + 1.0) & (y < HC - BAND + 2.0) & (gl <= 1)] = GOLD[0]       # filo de luz
    # --- placa de la base (oro)
    pl = (outer | floor_out) & (y <= FL)
    for gi in range(6): rgb[pl & (gl == gi)] = GR[gi]
    rgb[floor_out & (gl >= 2)] = GOLD[4]
    rgb[outer & (y < 0.9) & (gl >= 2)] = GOLD[6]
    # --- interior: oscuro, mas claro cerca de la boca
    d = np.clip(1 - (HC - y) / HC * 1.15, 0, 1)
    il = np.where(inner, np.where(lv > 0.72, 0, 1), 3)
    ipal = [RED[2], RED[3], (0x3b, 0x08, 0x20), (0x24, 0x04, 0x14)]
    ii = np.clip(il + (d < 0.62).astype(int) + (d < 0.30).astype(int), 0, 3)
    for ti in range(4): rgb[inner & (ii == ti)] = ipal[ti]
    rgb[floor_in] = ipal[3]
    # borde interior de la boca (la cara superior del borde): oro mas claro hacia dentro
    rgb[rim] = GOLD[2]; rgb[rim & (lv > 0.62)] = GOLD[1]; rgb[rim & (lv > 0.95)] = GOLD[0]
    # --- capas: delante = pared exterior + borde cercano; detras = interior + borde lejano
    isfront = outer | floor_out | (rim & (Q[..., 2] > 0))
    union = hit
    full = finish_rgba(rgb, union, 1)
    h = full.shape[0]
    m = np.pad(union, 1); fr = np.pad(isfront & union, 1); bk = np.pad(~isfront & union, 1)
    a_ = full[..., 3] > 0; ol = a_ & ~m
    n4 = np.zeros_like(fr)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): n4 |= shift(fr, dx, dy)
    front_l = np.zeros_like(full); back_l = np.zeros_like(full)
    f_m = (fr | (ol & n4)); b_m = (bk | (ol & ~n4))
    front_l[f_m] = full[f_m]; back_l[b_m] = full[b_m]
    return front_l, back_l

ANG = [(-180 + 15 * k) for k in range(24)]      # k=12 es de pie (0 grados); +: boca arriba-izquierda; -: arriba-derecha

def sheets():
    fr, bk = [], []
    for a in ANG:
        f, b = render_cup(a); fr.append(f); bk.append(b)
    return np.concatenate(fr, 1), np.concatenate(bk, 1), fr, bk

if __name__ == "__main__":
    out = MYDIR / "out"; out.mkdir(exist_ok=True)
    F, B, fr, bk = sheets()
    comp = []
    for k in (12, 11, 10, 9, 8, 6, 3, 0, 14, 16, 18, 20):
        a = np.zeros_like(fr[k]); 
        for L in (bk[k], fr[k]):
            m = L[..., 3] > 0; a[m] = L[m]
        comp.append(a)
    zoom_sheet(comp, out / "zoom_cupd.png", k=7, cols=6)
    print(F.shape)
