"""Geolite - iconos de logros para Steamworks (64x64 JPG, conseguido y sin conseguir) + vista previa grande.

Lee docs/steam/achievements.json (node tools/steam-achievements.mjs) y compone cada insignia igual que el
juego (css/premium.css .ic.badge): ficha del color de su modo a tamano completo + la ilustracion propia del
logro (assets/icons/ach_<id>.webp, tools/ach_pixel.py: 48 px nativos) al 75 % en el pixel (8, 8) de la ficha de 64 (centrada):
ficha e ilustracion comparten rejilla, asi que a 64 px cada pixel del icono es un pixel del arte (vecino mas cercano).
La version bloqueada es la del juego: escala de grises y brillo al 60 %.

    python tools/steam_icons.py      -> docs/steam/icons/<id>.jpg, <id>_locked.jpg (64 px) y preview/<id>.png (256 px)
"""
import json
from pathlib import Path
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "assets" / "icons"
OUT = ROOT / "docs" / "steam" / "icons"
PREV = OUT / "preview"
OUT.mkdir(parents=True, exist_ok=True); PREV.mkdir(parents=True, exist_ok=True)
SIZE, WORK = 64, 512
BG = (26, 22, 18)                                   # fondo oscuro de la mesa: Steam no admite transparencia en JPG


def badge(frame: str, icon: str, bg=True) -> Image.Image:
    """insignia a 64 px nativos (un pixel por pixel de arte) ampliada x8 por vecino mas cercano"""
    img = Image.new("RGBA", (SIZE, SIZE), (BG + (255,)) if bg else (0, 0, 0, 0))
    img.alpha_composite(Image.open(ICONS / f"{frame}.webp").convert("RGBA").resize((SIZE, SIZE), Image.NEAREST))
    img.alpha_composite(Image.open(ICONS / f"{icon}.webp").convert("RGBA").resize((48, 48), Image.NEAREST), (8, 8))
    return img.resize((WORK, WORK), Image.NEAREST)


rows = json.loads((ROOT / "docs" / "steam" / "achievements.json").read_text(encoding="utf-8"))
for r in rows:
    big = badge(r["frame"], r["icon"])
    got = big.convert("RGB").resize((SIZE, SIZE), Image.NEAREST)
    got.save(OUT / f"{r['id']}.jpg", quality=92)
    locked = ImageEnhance.Brightness(got.convert("L").convert("RGB")).enhance(0.6)
    locked.save(OUT / f"{r['id']}_locked.jpg", quality=92)
    badge(r["frame"], r["icon"], bg=False).resize((256, 256), Image.NEAREST).save(PREV / f"{r['id']}.png")
print(f"{len(rows)} logros -> {OUT} ({len(rows) * 2} iconos de 64 px + vista previa de 256 px)")
