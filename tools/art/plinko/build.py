"""Lluvia de fichas - genera todo el arte en out/ (PNG a 1x; el icono de la carta tambien en WebP 384x384 sin perdida).  Uso: python build.py [preview]"""
import sys
from parts import *
from board import *
from PIL import Image

OUT = HERE / "out"; OUT.mkdir(exist_ok=True)

def build(preview=False):
    save(chip_sheet(), OUT / "chip.png"); save(shadow_chip(), OUT / "chip_shadow.png")
    save(arrow(True), OUT / "arrow_on.png")
    for dec, d in DECOR.items():
        pal = [hexc(c) for c in d["peg"]]; glow = hexc(d["glow"])
        save(board(dec), OUT / f"board_{dec}.png"); save(peg_sheet(pal, glow), OUT / f"peg_{dec}.png")
        save(halo_sheet(glow), OUT / f"halo_{dec}.png"); save(trail_sheet(glow), OUT / f"trail_{dec}.png")
    try:
        from icon import build_icon
        build_icon(OUT)
    except ImportError:
        pass
    if preview:
        ims = [compose_preview(d) for d in DECOR]
        zoom_sheet(ims[:2], OUT / "zoom_board_a.png", k=3, cols=2); zoom_sheet(ims[2:], OUT / "zoom_board_b.png", k=3, cols=2)
        zoom_sheet([chip_frame(k) for k in range(12)], OUT / "zoom_chip.png", k=10, cols=6)
    print("ok")

if __name__ == "__main__":
    build("preview" in sys.argv)
