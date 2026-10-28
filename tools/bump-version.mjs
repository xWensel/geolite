/* Geolite - la version en un solo paso (v0.3.235).
 *   node tools/bump-version.mjs            solo regenera la lista CORE de sw.js (desde index.html) y comprueba que la version esta igual en los 5 sitios
 *   node tools/bump-version.mjs 0.3.236    escribe esa version en los 5 sitios de la regla y regenera CORE
 *   node tools/bump-version.mjs --check    solo comprueba (sale con error si algo no cuadra): para usarlo antes de empaquetar
 * Los 5 sitios: package.json, package-lock.json (dos veces), VERSION, js/support.js (A.VERSION) y sw.js (CACHE).
 * CORE = todo lo que index.html carga (src / href locales) + EXTRA (lo que el juego pide por JS y conviene tener sin conexion), sin duplicados.
 * Antes la lista se escribia a mano y se quedaba corta (v0.3.234: faltaban el Duelo entero y data/media2.js). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const F = n => path.join(ROOT, n);
const read = n => fs.readFileSync(F(n), "utf8");
/* se escribe con los finales de linea que ya tenia el fichero (el repositorio va en CRLF): sin diffs de linea entera por nada */
const write = (n, s) => { let old = ""; try { old = read(n); } catch (e) { /* nuevo */ } const crlf = /\r\n/.test(old) || (!old && process.platform === "win32"); fs.writeFileSync(F(n), s.replace(/\r\n/g, "\n").replace(/\n/g, crlf ? "\r\n" : "\n")); };
const SEMVER = /^\d+\.\d+\.\d+$/;

/* lo que no esta en index.html pero el juego pide al vuelo (js/escena.js, js/audio.js, js/art.js, manifest, iconos). Si algo de esto deja de
   existir, el install del SW fallaria entero: se comprueba abajo */
const EXTRA = [
  "./", "index.html", "manifest.webmanifest", "favicon.ico",
  "assets/icon-192.png", "assets/icon-512.png", "assets/icons/logo_mark.png", "assets/icons/logo_mark_s.png", "assets/icons/m_patch.webp", "assets/icons/ficha_oro.webp",
  "assets/logo/carta.png", "assets/logo/chistera.png", "assets/logo/tierra.png", "assets/logo/rotulo.png", "assets/logo.png",
  "assets/esc/lamp_billar.png", "assets/esc/lamp_globo.png", "assets/esc/lamp_deco.png", "assets/esc/lamp_farol.png", "assets/esc/lamp_verbena.png",
  "assets/esc/lamp_velas.png", "assets/esc/lamp_quinque.png", "assets/esc/lamp_flexo.png", "assets/esc/lamp_arana.png", "assets/esc/lamp_foco.png",
  "assets/sfx/juego.mp3", "assets/sfx/sala.mp3", "assets/sfx/publico/aplauso_corto.mp3", "assets/sfx/publico/aplauso_largo.mp3", "assets/sfx/publico/aplauso_vitores.mp3",
  "assets/sfx/publico/vitores.mp3", "assets/sfx/publico/ooow.mp3", "assets/sfx/publico/oooh_1.mp3", "assets/sfx/publico/oooh_2.mp3", "assets/sfx/publico/oooh_3.mp3", "assets/sfx/publico/oooh_4.mp3",
  "js/quema.js",
];

const args = process.argv.slice(2), check = args.includes("--check"), next = args.find(a => SEMVER.test(a)) || null;
const errors = [];

/* ---- la version: donde esta y cual es ---- */
const pkg = JSON.parse(read("package.json")), lock = JSON.parse(read("package-lock.json"));
const sites = {
  "package.json": pkg.version,
  "package-lock.json": lock.version,
  "package-lock.json (packages[\"\"])": lock.packages && lock.packages[""] && lock.packages[""].version,
  "VERSION": read("VERSION").trim(),
  "js/support.js": (read("js/support.js").match(/A\.VERSION = "([^"]+)"/) || [])[1],
  "sw.js": (read("sw.js").match(/const CACHE = "geolite-v([^"]+)"/) || [])[1],
};
const cur = pkg.version, distinct = [...new Set(Object.values(sites))];
if (distinct.length !== 1) errors.push("la version no es la misma en los 5 sitios: " + Object.entries(sites).map(([k, v]) => `${k}=${v}`).join(", "));

/* ---- CORE desde index.html ---- */
const html = read("index.html");
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1].replace(/[?#].*$/, "")).filter(u => u && !/^(https?:|data:|mailto:|#)/.test(u));
const core = [...new Set([...EXTRA, ...refs])];
for (const f of core) if (f !== "./" && !fs.existsSync(F(f))) errors.push("en CORE pero no existe en disco: " + f);

if (check || !next) {
  if (errors.length) { console.error("bump-version: " + errors.join("\n  ")); process.exit(1); }
}

/* ---- escribir ---- */
const ver = next || cur;
if (next) {
  if (errors.length && !check) console.warn("aviso: " + errors.join("\n  "));
  pkg.version = ver; write("package.json", JSON.stringify(pkg, null, 2) + "\n");
  lock.version = ver; if (lock.packages && lock.packages[""]) lock.packages[""].version = ver; write("package-lock.json", JSON.stringify(lock, null, 2) + "\n");
  write("VERSION", ver + "\n");
  write("js/support.js", read("js/support.js").replace(/A\.VERSION = "[^"]+"/, `A.VERSION = "${ver}"`));
}
if (!check) {
  const sw = read("sw.js");
  const list = core.map(f => JSON.stringify(f)).join(", ");
  const out = sw.replace(/const CACHE = "geolite-v[^"]+"/, `const CACHE = "geolite-v${ver}"`).replace(/const CORE = \[[\s\S]*?\n\];/, `const CORE = [   // generada por tools/bump-version.mjs desde index.html + EXTRA: no editar a mano\n  ${list},\n];`);
  if (!/const CORE = \[/.test(out)) { console.error("bump-version: no encuentro `const CORE = [` en sw.js"); process.exit(1); }
  write("sw.js", out);
}
console.log(`version ${ver}${next ? " (escrita en los 5 sitios)" : ""} · CORE del service worker: ${core.length} entradas (${refs.length} de index.html + ${EXTRA.length} extra)` + (errors.length ? "\n  AVISOS:\n  " + errors.join("\n  ") : ""));
