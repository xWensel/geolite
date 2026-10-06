"""Duelo de dados - genera TODO el arte en out/ (python build.py). Dados: 6 hojas (2 materiales x 3 giros), cubilete en 2 capas, tapete, baranda, aro, sombras, cenefa e icono."""
import shutil, time
from rt import *
import dice, cupd, mesa
from PIL import Image

def main():
    out = MYDIR / "out"; out.mkdir(exist_ok=True); t0 = time.time()
    for mat in ("ivory", "burg"):
        for k, yaw in enumerate(dice.YAWS):
            a = dice.sheet(mat, yaw); save(a, out / f"dice_{mat}_{k}.png")
        print(mat, "ok", round(time.time() - t0, 1), "s")
    F, B, fr, bk = cupd.sheets(); save(F, out / "cup_front.png"); save(B, out / "cup_back.png")
    save(mesa.felt(), out / "felt.png"); save(mesa.rail_h(), out / "rail_h.png"); save(mesa.rail_v("l"), out / "rail_l.png"); save(mesa.rail_v("r"), out / "rail_r.png")
    save(mesa.ring(), out / "ring.png"); save(mesa.cenefa(), out / "cenefa.png")
    for nm, (w, h) in {"sh_s": (18, 6), "sh_m": (24, 8), "sh_l": (30, 10), "sh_cup": (54, 14)}.items(): save(mesa.die_shadow(w, h), out / f"{nm}.png")
    ic = mesa.bet_icon(); save(ic, out / "bet_dados.png")
    Image.fromarray(ic, "RGBA").resize((384, 384), Image.NEAREST).save(out / "bet_dados.webp", "WEBP", lossless=True, method=6)
    shutil.copyfile(MYDIR.parent / "trile" / "out" / "glove_grab.png", out / "glove_grab.png")      # el guante del crupier (solo se copia)
    zoom_sheet([ic], out / "zoom_icon.png", k=10, cols=1)
    fr = [dice.render_die(dice.pose(n, "Z", 0, dice.YAWS[(n + 1) % 3]), "ivory" if n % 2 else "burg") for n in range(1, 7)]
    zoom_sheet(fr, out / "zoom_dice.png", k=8, cols=6)
    print("LISTO", round(time.time() - t0, 1), "s", {p.name: p.stat().st_size // 1024 for p in out.glob("dice_*.png")})
main()
