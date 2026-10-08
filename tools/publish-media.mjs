/*
 * Geolite - publica las fotos de la Enciclopedia en GitHub Pages (gratis, sin tarjeta): Vercel no admite ~1 GB de fotos.
 * Van repartidas en dos repositorios publicos para no pasar del limite de 1 GB de cada web de GitHub Pages:
 *   xWensel/geolite-media     -> assets/wiki/card y assets/wiki/th  (https://xwensel.github.io/geolite-media/)
 *   xWensel/geolite-media-hd, -hd2 y -hd3 -> assets/wiki/hd repartido por la inicial del archivo (a-c, d-n, o-z)
 * Cada repositorio se clona junto a la carpeta del juego (../geolite-media, ../geolite-media-hd) y se deja como copia exacta:
 * copia lo nuevo o cambiado, borra lo que ya no esta en el juego, y hace commit + push. El juego las busca ahi via A.media (js/support.js).
 *   node tools/publish-media.mjs            publica los cambios
 *   node tools/publish-media.mjs --dry      solo cuenta lo que cambiaria
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OWNER = "xWensel";
const TARGETS = [
  { repo: "geolite-media", dirs: ["assets/wiki/card", "assets/wiki/th"], what: "tarjetas (960 px) y miniaturas (320 px)" },
  { repo: "geolite-media-hd", dirs: ["assets/wiki/hd"], what: "fotos HD (hasta 1920 px), archivos de la a a la c", part: 0 },
  { repo: "geolite-media-hd2", dirs: ["assets/wiki/hd"], what: "fotos HD (hasta 1920 px), archivos de la d a la n", part: 1 },
  { repo: "geolite-media-hd3", dirs: ["assets/wiki/hd"], what: "fotos HD (hasta 1920 px), archivos de la o a la z", part: 2 },
];
const hdPart = f => { const c = f.charAt(0).toLowerCase(); return c < "d" ? 0 : c <= "n" ? 1 : 2; };   // misma regla que js/support.js
const DRY = process.argv.includes("--dry");
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
const list = dir => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile()) : []);

for (const t of TARGETS) {
  const dest = path.join(ROOT, "..", t.repo);
  if (!fs.existsSync(dest)) { if (DRY) { console.log(`${t.repo}: sin clonar todavia`); continue; } execFileSync("git", ["clone", `https://github.com/${OWNER}/${t.repo}.git`, dest], { stdio: "inherit" }); }
  let added = 0, changed = 0, removed = 0;
  for (const d of t.dirs) {
    const src = path.join(ROOT, d), out = path.join(dest, d), have = new Set(list(src).filter(f => t.part == null || hdPart(f) === t.part));
    if (!DRY) fs.mkdirSync(out, { recursive: true });
    for (const f of have) {
      const a = fs.statSync(path.join(src, f)), bp = path.join(out, f), b = fs.existsSync(bp) && fs.statSync(bp);
      if (b && b.size === a.size && Math.round(b.mtimeMs) === Math.round(a.mtimeMs)) continue;
      b ? changed++ : added++;
      if (!DRY) { fs.copyFileSync(path.join(src, f), bp); fs.utimesSync(bp, a.atime, a.mtime); }
    }
    for (const f of list(out)) if (!have.has(f)) { removed++; if (!DRY) fs.rmSync(path.join(out, f)); }
  }
  console.log(`${t.repo}: ${added} nuevas, ${changed} cambiadas, ${removed} borradas`);
  if (DRY) continue;
  fs.writeFileSync(path.join(dest, ".nojekyll"), "");                                 // sin Jekyll: GitHub Pages sirve los archivos tal cual
  fs.writeFileSync(path.join(dest, "README.md"), `# ${t.repo}\n\nFotos de la Enciclopedia de **Geolite**: ${t.what}, servidas con GitHub Pages en https://${OWNER.toLowerCase()}.github.io/${t.repo}/.\n\nNo se edita a mano: lo publica \`tools/publish-media.mjs\` desde el repositorio del juego.\nAutoria y licencia de cada foto (casi todas de Wikimedia Commons): \`data/wiki/img.json\` del juego, que tambien las muestra en la Enciclopedia.\n`);
  if (!git(dest, "status", "--porcelain")) { console.log(`${t.repo}: sin cambios que subir`); continue; }
  try { git(dest, "rev-parse", "--verify", "--quiet", "HEAD"); } catch (e) { git(dest, "symbolic-ref", "HEAD", "refs/heads/main"); }   // repositorio recien creado: la rama se llama main
  git(dest, "add", "-A");
  git(dest, "commit", "-q", "-m", `Fotos: ${added} nuevas, ${changed} cambiadas, ${removed} borradas`);
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: dest, stdio: "inherit" });
}
