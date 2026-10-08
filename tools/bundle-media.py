#!/usr/bin/env python3
"""
Geolite - empaqueta las fotos de la Enciclopedia y las banderas dentro del juego (solo desarrollo, necesita red).

  python tools/bundle-media.py            descarga lo que falte (reanudable) y convierte a WebP
  python tools/bundle-media.py --flags    solo banderas

Fotos (data/wiki/img.json):  assets/wiki/hd/<id>.webp (lado mayor hasta 1920 px), assets/wiki/card/<id>.webp (960 px de ancho)
                             y assets/wiki/th/<id>.webp (miniatura de 320 px para las cartas pequenas: tools/wiki-thumbs.py)
Banderas (data/flags.js):    assets/flags/<pais>.svg (original vectorial de Wikimedia Commons)
Los creditos y licencias siguen en img.json / flags.js y el juego los muestra junto a cada imagen.
"""
import json, os, re, sys, time, threading, urllib.request, urllib.parse, io
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
HD, CARD, FLAGS = ROOT / "assets/wiki/hd", ROOT / "assets/wiki/card", ROOT / "assets/flags"
for d in (HD, CARD, FLAGS): d.mkdir(parents=True, exist_ok=True)
UA = "Geolite-builder/1.0 (https://github.com/xWensel/geolite; educational geography game; polite batch job)"
LOG = ROOT / "tools/bundle-media.log"

def safe(s):  # mismo criterio que A.mediaKey en js/wiki.js
    return re.sub(r"[^A-Za-z0-9._-]", "_", s)

def file_of(src):
    parts = src.split("?")[0].split("/")
    f = parts.pop()
    if "thumb" in parts: f = parts.pop()
    else: f = re.sub(r"^\d+px-", "", f)
    return urllib.parse.unquote(f)

lock, last = threading.Lock(), [0.0]
def get(url, tries=6):
    for i in range(tries):
        with lock:
            wait = last[0] + 0.5 - time.time()
            if wait > 0: time.sleep(wait)
            last[0] = time.time()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r: return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            ra = e.headers.get("retry-after")
            time.sleep(max(int(ra) if ra and ra.isdigit() else 0, 6 * (i + 1)))
        except Exception:
            time.sleep(3 * (i + 1))
    return None

def log(msg):
    with lock:
        with open(LOG, "a", encoding="utf-8") as f: f.write(msg + "\n")

def photo(item):
    pid, rec = item
    key = safe(pid); hd, card = HD / (key + ".webp"), CARD / (key + ".webp")
    if hd.exists() and card.exists(): return "skip"
    fn, w = file_of(rec[0]), rec[1] or 1920
    url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(fn) + "?width=" + str(min(int(w), 1920))
    data = get(url)
    if not data: log("FALLO " + pid + " " + fn); return "fail"
    try:
        im = Image.open(io.BytesIO(data)); im.load()
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
        if len(rec) > 4 and rec[4]:                                  # recorte opcional [izq, arriba, dcha, abajo] en fracciones (quita rotulos o bordes de escaneo)
            l, t, r, b = rec[4]; im = im.crop((round(l * im.width), round(t * im.height), round(r * im.width), round(b * im.height)))
        if max(im.size) > 1920: im.thumbnail((1920, 1920), Image.LANCZOS)
        im.save(hd, "WEBP", quality=82, method=6)
        c = im.copy()
        if c.width > 960: c = c.resize((960, round(c.height * 960 / c.width)), Image.LANCZOS)
        c.save(card, "WEBP", quality=80, method=6)
        return "ok"
    except Exception as e:
        log("ERROR " + pid + " " + fn + " " + str(e)); return "fail"

def flag(item):
    name, rec = item
    out = FLAGS / (safe(name) + ".svg")
    if out.exists(): return "skip"
    data = get("https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(rec[0]))
    if not data: log("FALLO bandera " + name); return "fail"
    out.write_bytes(data); return "ok"

def run(fn, items, label):
    n, stats = 0, {}
    with ThreadPoolExecutor(max_workers=2) as ex:
        for r in ex.map(fn, items):
            n += 1; stats[r] = stats.get(r, 0) + 1
            if n % 20 == 0: print(f"\r{label} {n}/{len(items)} {stats}", end="", flush=True)
    print(f"\r{label} {n}/{len(items)} {stats}")

if __name__ == "__main__":
    flags_src = (ROOT / "data/flags.js").read_text(encoding="utf-8")
    FL = json.loads(re.search(r"window\.AIQ\.FLAGS\s*=\s*(\{.*\});?\s*$", flags_src, re.S).group(1))
    run(flag, list(FL.items()), "banderas")
    if "--flags" not in sys.argv:
        IMG = json.loads((ROOT / "data/wiki/img.json").read_text(encoding="utf-8"))
        run(photo, list(IMG.items()), "fotos")
        import importlib.util                                        # miniaturas de 320 px para las cartas de la Enciclopedia (tools/wiki-thumbs.py)
        spec = importlib.util.spec_from_file_location("wiki_thumbs", ROOT / "tools/wiki-thumbs.py"); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); m.main()
    total = sum(f.stat().st_size for d in (HD, CARD, FLAGS) for f in d.iterdir())
    print("tamano total: %.1f MB" % (total / 1e6))
