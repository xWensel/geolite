"""Rasca y gana - genera TODO el arte de la maqueta en out/ (PNG a 1x; la carta de la Barra, ademas, en WebP 48 px x8 sin perdida como los demas iconos).
Uso:  python tools/art/rasca/build.py"""
import base64, io, json, shutil
from PIL import Image
from prim import *
import syms_a, syms_b, syms_c, card

OUT = HERE / "out"; OUT.mkdir(exist_ok=True); SPR = OUT / "spr"; SPR.mkdir(exist_ok=True)

# tema -> los 9 simbolos por ranura: 0 chistera, 1 diamante, 2 doblon (fijos) y 3 (x5), 4-5 (x3), 6-8 (x2)
THEME_SYMS = {
    "tesoro":     ["chest", "key", "ring", "skull", "chalice", "pouch"],
    "mapamundi":  ["globe", "compass", "pin", "passport", "telescope", "mapa"],
    "banderas":   ["flag_jp", "flag_br", "flag_fr", "flag_es", "flag_de", "flag_ch"],
    "gala":       ["die", "chip", "spade", "heart", "club", "flute"],
    "monumentos": ["pyramid", "eiffel", "pisa", "moai", "taj", "colosseum"],
    "faro":       ["lighthouse", "sail", "anchor", "helm", "buoy", "shell"],
    "gemas":      ["gem_esmeralda", "gem_zafiro", "gem_amatista", "gem_topacio", "gem_perla", "gem_aguamarina"],
    "tiempo":     ["sun", "moon", "cloud", "bolt", "snow", "drop"],
}
FIXED = ["hat", "diamond", "coin"]

def png_uri(a):
    b = io.BytesIO(); Image.fromarray(a, "RGBA").save(b, "PNG"); return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()

if __name__ == "__main__":
    reg = dict(syms_a.TOP + syms_a.MAPAMUNDI + syms_a.TESORO + syms_b.BANDERAS + syms_b.GALA + syms_b.GEMAS + syms_b.TIEMPO + syms_c.MONUMENTOS + syms_c.FARO)
    sprites = {}
    for name, fn in reg.items():
        a = fn(); sprites[name] = a; save(a, SPR / (name + ".png"))
    # hojas de revision (x10)
    for th, lst in THEME_SYMS.items(): pass
    zoom_sheet([sprites[n] for n in FIXED] + [sprites[n] for th in THEME_SYMS for n in THEME_SYMS[th][:0]], OUT / "_sheet_fixed.png", k=10, cols=3)
    for th, lst in THEME_SYMS.items(): zoom_sheet([sprites[n] for n in FIXED + lst], OUT / f"_sheet_sym_{th}.png", k=8, cols=9)
    # tarjetas y laminas
    art = {"themes": {}, "geom": {"W": card.W, "H": card.H, "CELL": card.CELL, "FX": card.FX, "FY": card.FY, "GAP": card.GAP, "PLAQUE": card.PLAQUE, "FOOT": card.FOOT}, "foil": {}}
    for th, T in card.THEMES.items():
        b = card.card_base(th); f = card.foil(th); save(b, OUT / f"card_{th}.png"); save(f, OUT / f"foil_{th}.png")
        art["foil"][th] = png_uri(f)
        art["themes"][th] = {"es": T["es"], "en": T["en"], "amb": T["amb"], "gold": T["gold"], "flake": ["#%02x%02x%02x" % tuple(c) for c in T["foil"]], "syms": FIXED[:3] + THEME_SYMS[th],
                             "plaque": "#%02x%02x%02x" % tuple(T["plaque"][0]), "paper": "#%02x%02x%02x" % tuple(T["paper"][0])}
    (OUT / "art.js").write_text("/* generado por build.py: laminas (data URI, para poder leer sus pixeles tambien desde file://) y datos de los temas */\nwindow.RASCA_ART = " + json.dumps(art) + ";\n", encoding="utf8")
    # piezas sueltas
    ic = card.bet_icon(); save(ic, OUT / "bet_rasca.png"); Image.fromarray(ic, "RGBA").resize((384, 384), Image.NEAREST).save(OUT / "bet_rasca.webp", "WEBP", lossless=True, method=6)
    save(card.cenefa(), OUT / "cenefa.png"); save(card.coin_cursor(False), OUT / "coin_cur.png"); save(card.coin_cursor(True), OUT / "coin_hold.png")
    save(card.felt_ivory(), OUT / "felt_ivory.png"); save(card.wall_tile(), OUT / "wall.png"); save(card.sweat_drop(), OUT / "sweat.png")
    for n in ("glove_open.png", "glove_grab.png"): shutil.copyfile(HERE.parent / "trile" / "out" / n, OUT / n)       # los guantes del crupier, tal cual
    zoom_sheet([ic], OUT / "_sheet_icon.png", k=10, cols=1)
    ims = [Image.open(OUT / f"_sheet_sym_{t}.png") for t in THEME_SYMS]; w = max(i.width for i in ims); h = sum(i.height for i in ims); M = Image.new("RGB", (w, h)); y = 0
    for i in ims: M.paste(i, (0, y)); y += i.height
    M.resize((w * 6 // 10, h * 6 // 10), Image.NEAREST).save(OUT / "_sheet_all.png")
    for n in ("_sheet_a", "_sheet_b", "_sheet_c", "_sheet_card", "_sheet_card2", "_sheet_fixed"): (OUT / (n + ".png")).unlink(missing_ok=True)
    print("ok:", len(sprites), "simbolos,", len(card.THEMES), "temas")
