"""Geolite - comprime un build de Linux en .tar.gz con permisos de ejecucion (los zips hechos en Windows los pierden y el juego no arranca).
   python tools/linux_tar.py <carpeta del build> <salida.tar.gz>   (lo llama tools/steam-pack.mjs --linux)"""
import os, sys, tarfile

src, out = sys.argv[1], sys.argv[2]
top = os.path.basename(src.rstrip("/\\"))
EXEC = {"Geolite", "GeoliteDemo", "geolite-bin", "geolitedemo-bin", "Geolite-seguro", "GeoliteDemo-seguro", "chrome_crashpad_handler", "chrome-sandbox"}

def fix(ti):
    name = os.path.basename(ti.name)
    ti.uid = ti.gid = 1000; ti.uname = ti.gname = "deck"
    ti.mode = 0o755 if ti.isdir() or name in EXEC or name.endswith((".so", ".node")) or ".so." in name else 0o644
    return ti

with tarfile.open(out, "w:gz", compresslevel=6) as t:
    t.add(src, arcname=top, filter=fix)
print("tar.gz:", out)
