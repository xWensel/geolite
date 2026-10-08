/*
 * Geolite - completa assets/wiki con todas las fotos de la Enciclopedia (miniatura, tarjeta y HD) para empaquetar el juego.
 * Las fotos pesan ~1 GB y no viven en git: se bajan una vez de GitHub Pages (las mismas que usa la web) y quedan en la carpeta del juego.
 *   node tools/fetch-media.mjs            baja lo que falte (reanudable: no repite lo que ya esta)
 *   node tools/fetch-media.mjs --check    solo cuenta lo que falta, sin descargar
 *   node tools/fetch-media.mjs --lite     sin HD
 * Orden recomendado antes de una build para Steam: fetch-media -> steam-pack. NO ejecutes publish-media sin haber hecho antes fetch-media:
 * publish-media deja las webs como copia exacta de assets/wiki y borraria lo que falte en tu carpeta.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const CHECK = args.has("--check"), LITE = args.has("--lite");
const SETS = [
  { dir: "th", base: "https://xwensel.github.io/geolite-media/assets/wiki/th/" },
  { dir: "card", base: "https://xwensel.github.io/geolite-media/assets/wiki/card/" },
  ...(LITE ? [] : [{ dir: "hd", base: f => `https://xwensel.github.io/${f.charAt(0).toLowerCase() < "d" ? "geolite-media-hd" : f.charAt(0).toLowerCase() <= "n" ? "geolite-media-hd2" : "geolite-media-hd3"}/assets/wiki/hd/` }]),
];
const safe = s => s.replace(/[^A-Za-z0-9._-]/g, "_");                            // mismo criterio que A.mediaKey (js/wiki.js)
const img = JSON.parse(fs.readFileSync(path.join(ROOT, "data/wiki/img.json"), "utf8"));
const keys = Object.keys(img).map(safe);

const todo = [];
for (const s of SETS) {
  fs.mkdirSync(path.join(ROOT, "assets/wiki", s.dir), { recursive: true });
  for (const k of keys) if (!fs.existsSync(path.join(ROOT, "assets/wiki", s.dir, k + ".webp"))) todo.push({ s, k });
}
console.log(`fotos en img.json: ${keys.length} · faltan ${todo.length} archivos` + SETS.map(s => ` (${s.dir}: ${todo.filter(t => t.s === s).length})`).join(""));
if (CHECK || !todo.length) process.exit(0);

let done = 0, bad = [];
async function get(t) {
  const out = path.join(ROOT, "assets/wiki", t.s.dir, t.k + ".webp");
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch((typeof t.s.base === "function" ? t.s.base(t.k) : t.s.base) + t.k + ".webp");
      if (r.status === 404) { bad.push(`${t.s.dir}/${t.k}`); return; }
      if (!r.ok) throw new Error("HTTP " + r.status);
      fs.writeFileSync(out + ".part", Buffer.from(await r.arrayBuffer())); fs.renameSync(out + ".part", out); return;
    } catch (e) { await new Promise(r => setTimeout(r, 800 * (i + 1))); }
  }
  bad.push(`${t.s.dir}/${t.k}`);
}
async function worker() { while (todo.length) { await get(todo.pop()); if (++done % 200 === 0) console.log(`${done} descargadas…`); } }
await Promise.all(Array.from({ length: 12 }, worker));
console.log(`listo: ${done - bad.length} descargadas` + (bad.length ? ` · ${bad.length} sin foto en la web (p. ej. ${bad.slice(0, 5).join(", ")})` : ""));
process.exit(bad.length ? 1 : 0);
