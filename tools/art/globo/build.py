"""El globo (maqueta): genera TODO el arte en out/ (python build.py). Sprites a 1x en PNG; la escena corre a 640x360 y se muestra x3 con image-rendering: pixelated."""
import sys, json
from pathlib import Path
HERE_ = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE_.parent / "trile")); sys.path.insert(0, str(HERE_))
import numpy as np
from PIL import Image
from pix import *
from balloon import *
from props import *
import world
from extras import coin_flat, paste, padded

OUT = HERE_ / "out"; OUT.mkdir(exist_ok=True)
ENV_W, ENV_H, ENV_MOUTH = 76, 86, 12.0

def line(a, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        t = i / max(1, n); x = int(round(x0 + (x1 - x0) * t)); y = int(round(y0 + (y1 - y0) * t))
        if 0 <= y < a.shape[0] and 0 <= x < a.shape[1]: a[y, x] = (*col, 255)

def bet_globo_icon():
    """icono de la carta (48x48): el globo de Don Crupier con sus cuerdas y su cesta, entre dos bancos de nubes"""
    icon = np.zeros((48, 48, 4), np.uint8)
    env = envelope(30, 31, LIV[0], G=5, mouth=4.6, es=0.5, skirt=3.0); bs = basket(14, 8)
    ex0 = 9; paste(icon, env, ex0, 0)
    ex, ey = ex0 + env.shape[1] // 2, env.shape[0]
    by = 38; bx = 24 - bs.shape[1] // 2
    for dx_, tx_ in ((-4, -6), (-1, -2), (1, 2), (4, 6)):
        line(icon, ex + dx_, ey - 1, 24 + tx_, by + 1, GOLD[5])
    paste(icon, bs, bx, by)
    paste(icon, cloud(17, 8, 7), 0, 40); paste(icon, cloud(17, 8, 9), 31, 41)
    return icon

def cenefa_awning(w=24, h=11):
    """cenefa de la carta: toldo de gajos rojos y crema con festones (como un globo visto de cerca)"""
    c = Canvas(w, h); m = np.zeros((h, w), bool)
    for k in range(4):
        cx = k * 6 + 3
        for x in range(k * 6, k * 6 + 6):
            dxn = (x + .5 - cx) / 3.0; yb = 7 + int(round(2.7 * np.sqrt(max(0, 1 - dxn * dxn))))
            m[:yb + 1, x] = True
            col = RED if k % 2 == 0 else CREAM
            c.rgb[:yb + 1, x] = col[1]
            c.rgb[0, x] = col[0]; c.rgb[1:3, x] = col[1] if k % 2 else col[0]
            c.rgb[yb - 2:yb + 1, x] = col[2]
            if x == k * 6 + 5: c.rgb[:yb + 1, x] = col[2]
            if x == k * 6: c.rgb[1:yb - 1, x] = col[0]
    out = np.zeros((h, w, 4), np.uint8); out[m, :3] = c.rgb[m]; out[m, 3] = 255
    edge = m & ~np.roll(m, -1, 0); out[edge, :3] = INK
    return out

def cenefa_clouds(w=24, h=9):
    c = Canvas(w, h); m = np.zeros((h, w), bool)
    for cx, r in ((4, 4.6), (12, 5.6), (20, 4.6), (-2, 4.0), (26, 4.0)):
        m |= c.ell(cx, h + 1.2 - r * 0.2, r * 1.15, r)
    m &= (c.yy < h)
    out = np.zeros((h, w, 4), np.uint8)
    top = np.where(m.any(axis=0), np.argmax(m, axis=0), h)
    s = c.yy - top[None, :]; col = np.zeros((h, w, 3), np.uint8)
    col[...] = WHITE[0]; col[s >= 2] = hexc("e4ebff"); col[s >= 4] = hexc("b8c6f0"); col[s >= 6] = hexc("93a2d8")
    out[m, :3] = col[m]; out[m, 3] = 255
    edge = m & ~np.roll(m, 1, 0); out[edge, :3] = INK; out[edge, 3] = 255
    return out

def save_ico(icon, name):
    save(icon, OUT / (name + ".png"))
    Image.fromarray(icon, "RGBA").resize((384, 384), Image.NEAREST).save(OUT / (name + ".webp"), "WEBP", lossless=True, method=6)

if __name__ == "__main__":
    for i, lv in enumerate(LIV): save(envelope(ENV_W, ENV_H, lv, mouth=ENV_MOUTH), OUT / f"env_{lv['id']}.png")
    save(basket(44, 19), OUT / "basket.png"); save(burner(), OUT / "burner.png")
    for f in range(4): save(flame(f), OUT / f"flame_{f}.png")
    save(glow(), OUT / "glow.png")
    # la cabeza del crupier: los pixeles de su dealer_mini del juego (rejilla de 36 a x2), sin redibujar
    ICONS = HERE_.parent.parent.parent / "assets" / "icons"
    for nm, fn in (("n", "dealer_mini"), ("l", "dealer_mini_laugh")):
        a = np.array(Image.open(ICONS / (fn + ".webp")).convert("RGBA"))[::2, ::2].copy(); save(a, OUT / f"head_{nm}.png")
    for i, (w, h) in enumerate(((36, 13), (52, 17), (70, 22), (100, 30), (140, 40), (190, 52))): save(cloud(w, h, 10 + i), OUT / f"cloud_{i}.png")
    for i, (w, h) in enumerate(((120, 36), (170, 50), (230, 64))): save(cloud(w, h, 40 + i, CL_STORM), OUT / f"storm_{i}.png")
    for f in range(4): save(bird(f), OUT / f"bird_{f}.png")
    save(plane(), OUT / "plane.png"); save(zeppelin(), OUT / "zeppelin.png"); save(ufo(), OUT / "ufo.png")
    for i in range(8): save(smallballoon(i), OUT / f"sb_{i}.png")
    save(sun(), OUT / "sun.png"); save(moon(), OUT / "moon.png")
    for i, s in enumerate((18, 30, 46)): save(puff(s, 3 + i), OUT / f"puff_{i}.png")
    save(haze(), OUT / "haze.png"); save(coin_flat(), OUT / "coin_flat.png")
    icon = bet_globo_icon(); save_ico(icon, "bet_globo")
    save(cenefa_awning(), OUT / "cenefa_top.png"); save(cenefa_clouds(), OUT / "cenefa_bot.png")
    # mapa
    mp, pk, li = world.compose()
    Image.fromarray(mp).save(OUT / "world_map.png"); Image.fromarray(pk, "RGBA").save(OUT / "world_peaks.png"); Image.fromarray(li, "RGBA").save(OUT / "world_lights.png")
    e = envelope(ENV_W, ENV_H, LIV[0], mouth=ENV_MOUTH)
    meta = dict(envW=int(e.shape[1]), envH=int(e.shape[0]), mouth=ENV_MOUTH, mapH=int(mp.shape[0]), mapRing=world.WH * 3, mapW=world.WIN,
                livs=[dict(id=l["id"], es=l["es"], en=l["en"], c=["#%02x%02x%02x" % tuple(l["g"][k % len(l["g"])][1]) for k in range(3)]) for l in LIV])
    (OUT / "meta.js").write_text("window.GB_META=" + json.dumps(meta, ensure_ascii=False) + ";\n", encoding="utf8")
    zoom_sheet([icon, cenefa_awning(), cenefa_clouds(), bet_globo_icon()], OUT / "zoom_icon.png", k=8, cols=4)
    zoom_sheet([envelope(ENV_W, ENV_H, LIV[i], mouth=ENV_MOUTH) for i in range(8)], OUT / "zoom_liveries.png", k=3, cols=4)
    print("ok", meta["envW"], meta["envH"], mp.shape)
