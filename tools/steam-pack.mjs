/*
 * Geolite - empaqueta el juego para Steam (Windows x64) en dist/<carpeta>/, lista para subir con SteamPipe (ver steam/README.md).
 *   node tools/steam-pack.mjs              juego completo (fotos tarjeta + HD, ~1,5 GB)
 *   node tools/steam-pack.mjs --lite       sin fotos HD (el zoom de la Enciclopedia usa la tarjeta)
 *   node tools/steam-pack.mjs --demo       demo: escribe steam-flavor.json {"demo":true} y sin fotos HD
 *   --linux                                 build nativo de Linux x64 (Steam Deck sin Proton) + dist/<nombre>-<ver>-linux.tar.gz con permisos de ejecucion
 * Sin asar a proposito: Steam sube solo los ficheros que cambian entre versiones y el .node de steamworks.js se carga tal cual.
 * steam_appid.txt NO se incluye: Steam le pasa el App ID al juego al lanzarlo desde la biblioteca (con 480 se veria como Spacewar).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packager } from "@electron/packager";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const DEMO = args.has("--demo"), LITE = DEMO || args.has("--lite"), LINUX = args.has("--linux");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const OUT = path.join(ROOT, "dist");

/* solo lo que el juego necesita en ejecucion (rutas relativas con "/", empezando por "/") */
const KEEP_TOP = new Set(["index.html", "credits.html", "main.js", "preload.js", "package.json", "steam-flavor.json", "js", "css", "fonts", "data", "assets", "node_modules"]);
const DROP_ASSETS = ["/assets/raw"].concat(LITE ? ["/assets/wiki/hd"] : []);
const ignore = p => {
  if (!p) return false;
  const parts = p.split("/").filter(Boolean);
  if (parts.length === 1 && !KEEP_TOP.has(parts[0])) return true;
  if (DROP_ASSETS.some(d => p === d || p.startsWith(d + "/"))) return true;
  if (parts[0] === "node_modules") {                       // solo steamworks.js (+ sus dependencias, que no tiene): el resto es de desarrollo
    if (parts.length === 1) return false;
    return parts[1] !== "steamworks.js";
  }
  return /\.(log|map)$/i.test(p);
};

const flavor = path.join(ROOT, "steam-flavor.json");
if (DEMO) fs.writeFileSync(flavor, JSON.stringify({ demo: true }) + "\n"); else fs.rmSync(flavor, { force: true });

const name = DEMO ? "Geolite Demo" : "Geolite";
console.log(`Empaquetando ${name} v${pkg.version}${LINUX ? " para Linux" : ""}${LITE ? " (sin fotos HD)" : ""}...`);
try {
  const [dir] = await packager({
    dir: ROOT, out: OUT, overwrite: true, platform: LINUX ? "linux" : "win32", arch: "x64",
    name, executableName: DEMO ? "GeoliteDemo" : "Geolite", appVersion: pkg.version,
    electronVersion: JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules/electron/package.json"), "utf8")).version,
    asar: false, prune: false, ignore, icon: path.join(ROOT, "assets/desktop/icon.ico"),
    win32metadata: { CompanyName: "Cousins Studios", ProductName: name, FileDescription: name },
  });
  /* steamworks.js carga steam_api64.dll / libsteam_api.so desde la carpeta del ejecutable */
  const sapi = LINUX ? "linux64/libsteam_api.so" : "win64/steam_api64.dll";
  fs.copyFileSync(path.join(ROOT, "node_modules/steamworks.js/dist", sapi), path.join(dir, path.basename(sapi)));
  /* Linux: el ejecutable que se lanza es un script que fuerza X11 (en Wayland la ventana de Electron se quedaba en negro en la Deck), apaga el
     sandbox desde la linea de comandos (appendSwitch llega tarde para algunos procesos) y deja geolite-log.txt junto al juego para diagnosticar
     sin consola. "<exe>-seguro" arranca ademas sin GPU, por si el negro es del driver */
  if (LINUX) {
    const exe = DEMO ? "GeoliteDemo" : "Geolite", bin = exe.toLowerCase() + "-bin";
    fs.renameSync(path.join(dir, exe), path.join(dir, bin));
    const sh = extra => `#!/bin/sh
D="$(cd "$(dirname "$0")" && pwd)"
export ELECTRON_ENABLE_LOGGING=1
` +
      `exec "$D/${bin}" --no-sandbox --ozone-platform=x11${extra} "$@" > "$D/geolite-log.txt" 2>&1
`;
    fs.writeFileSync(path.join(dir, exe), sh(""));
    fs.writeFileSync(path.join(dir, exe + "-seguro"), sh(" --disable-gpu"));
  }
  let bytes = 0; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); e.isDirectory() ? walk(f) : (bytes += fs.statSync(f).size); } }; walk(dir);
  console.log(`Listo: ${dir}  (${(bytes / 1048576).toFixed(0)} MB)`);
  if (LINUX) execFileSync("python", [path.join(ROOT, "tools/linux_tar.py"), dir, path.join(OUT, `${name.replace(/ /g, "")}-${pkg.version}-linux.tar.gz`)], { stdio: "inherit" });
} finally { if (DEMO) fs.rmSync(flavor, { force: true }); }
