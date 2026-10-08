/*
 * Geolite - genera credits.html (creditos y licencias): fotos y banderas de Wikimedia Commons con autor, licencia y enlace,
 * textos de Wikipedia, musica, fuentes y datos del mapa. Se abre desde Ajustes -> Datos.
 *   node tools/build-credits.mjs        (vuelve a generarlo cada vez que cambien fotos, banderas o creditos: data/wiki/img.json, data/flags.js)
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const img = JSON.parse(read("data/wiki/img.json")), en = JSON.parse(read("data/wiki/en.json"));
const ctx = { window: { AIQ: {} } }; vm.createContext(ctx); vm.runInContext(read("data/flags.js"), ctx);
const FLAGS = ctx.window.AIQ.FLAGS || {};
const LIC_URL = l => {
  let m;
  if ((m = /^CC BY(-SA)? (\d\.\d)/i.exec(l))) return `https://creativecommons.org/licenses/by${m[1] ? "-sa" : ""}/${m[2]}/`;
  if (/^CC0/i.test(l)) return "https://creativecommons.org/publicdomain/zero/1.0/";
  return "";
};
const link = (u, t) => u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>` : esc(t);
const row = (name, c) => {
  const [artist, lic, page] = c || [];
  return `<tr><td>${esc(name)}</td><td>${esc(artist || "—")}</td><td>${link(LIC_URL(lic || ""), lic || "—")}</td><td>${link(page, "Commons")}</td></tr>`;
};
const TIER = { h: " · History", k: " · Key fact" };   // cada lugar lleva su foto de portada y la de su Historia (id~h) y su Dato clave (id~k)
const photos = Object.entries(img).map(([id, r]) => { const m = /^(.*)~([hk])$/.exec(id), base = m ? m[1] : id; return [((en[base] && en[base][0]) || base.replace(/-/g, " ")) + (m ? TIER[m[2]] : ""), r[3]]; }).sort((a, b) => a[0].localeCompare(b[0], "en"));
const flags = Object.entries(FLAGS).map(([n, r]) => [n, r[3]]).sort((a, b) => a[0].localeCompare(b[0], "en"));
const VERSION = read("VERSION").trim();

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Geolite · Credits and licenses</title>
<style>
:root{color-scheme:dark;--bg:#0a140f;--ink:#f2e9d6;--dim:#b9b09a;--brass:#f8b449;--line:rgba(242,233,214,.16)}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,"Segoe UI",sans-serif}
main{max-width:1000px;margin:0 auto;padding:32px 20px 80px}
h1{font-size:28px;margin:0 0 4px;color:var(--brass)} h2{margin:36px 0 8px;font-size:20px;color:var(--brass)} p{margin:6px 0;color:var(--dim)} p b,li b{color:var(--ink)}
a{color:#9fd3ff} table{border-collapse:collapse;width:100%;font-size:13.5px} th,td{text-align:left;padding:5px 8px;border-bottom:1px solid var(--line);vertical-align:top}
th{position:sticky;top:0;background:#12231a;color:var(--brass)} td:nth-child(2){color:var(--dim)} ul{padding-left:20px;color:var(--dim)}
#q{width:100%;box-sizing:border-box;padding:9px 12px;margin:10px 0;border-radius:6px;border:1px solid var(--line);background:#12231a;color:var(--ink);font:inherit}
.n{color:var(--dim);font-size:13px}
</style></head><body><main>
<h1>Geolite</h1><p>Credits and licenses · v${esc(VERSION)} · Cousins Studios</p>

<h2>Game</h2>
<ul>
<li><b>Design, code and soundtrack:</b> Cousins Studios. The soundtrack was created by the studio with AKAI.</li>
<li><b>Art:</b> Cousins Studios. The base was conceived by the studio and scaffolded with AI tools; the hand work and the polish are human: every piece is retouched, redrawn and polished by hand to the game's native pixel grid.</li>
</ul>

<h2>Soundtrack</h2>
<ul>
<li>01. Sure Bet (lounge nocturno, 1:30)</li>
<li>02. Double or Nothing (ragtime, 1:44)</li>
<li>03. Both Teams to Score (bossa nova, 1:41)</li>
<li>04. Over 2.5 Goals (samba, 1:37)</li>
<li>05. All on Red (blues, 1:48)</li>
<li>06. Orphans (vals, 1:45)</li>
<li>07. All In (funk, 1:33)</li>
<li>08. Parlay (big band, 1:43)</li>
<li>09. Raise the Stakes (mambo, 1:40)</li>
<li>10. Cash Out (lo-fi, 1:45)</li>
<li>11. Bankroll (reggae, 1:42)</li>
<li>12. Live Bet (reggaeton, 1:45)</li>
<li>13. Straight Up (flamenco, 1:48)</li>
<li>14. Asian Handicap (deep house, 1:35)</li>
<li>15. High Roller (funk, 1:44)</li>
<li>16. Progressive Jackpot (house, 1:34)</li>
<li>17. House Edge (tecno, 1:46)</li>
<li>18. Hot Hand (merengue, 1:47)</li>
<li>19. Each Way (cha-cha-chá, 1:46)</li>
<li>20. Draw No Bet (ranchera, 1:43)</li>
<li>21. Max Bet (corrido, 1:45)</li>
</ul>

<h2>Encyclopedia texts</h2>
<p>The text of the Encyclopedia entries is adapted from <a href="https://www.wikipedia.org/" target="_blank" rel="noopener noreferrer">Wikipedia</a> and its editors, licensed under
<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. Every entry is one Wikipedia article; its history page lists the authors.
Changes: shortened and reformatted for the game.</p>

<h2>Photos <span class="n">(${photos.length})</span></h2>
<p>From <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>. Each photo keeps its own license; resized and converted to WebP for the game.
The author and license of the photo on screen also appear next to it in the Encyclopedia.</p>
<input id="q" type="search" placeholder="Filter photos and flags…" aria-label="Filter">
<table id="t1"><thead><tr><th>Subject</th><th>Author</th><th>License</th><th>Source</th></tr></thead><tbody>
${photos.map(([n, c]) => row(n, c)).join("\n")}
</tbody></table>

<h2>Flags <span class="n">(${flags.length})</span></h2>
<table id="t2"><thead><tr><th>Country</th><th>Author</th><th>License</th><th>Source</th></tr></thead><tbody>
${flags.map(([n, c]) => row(n, c)).join("\n")}
</tbody></table>

<h2>Fonts</h2>
<ul>
<li><b>Silkscreen</b>, <b>Pixelify Sans</b>, <b>Jersey 15</b>, <b>Tiny5</b> — SIL Open Font License 1.1 (<a href="fonts/LICENSE-silkscreen.txt">Silkscreen</a>, <a href="fonts/LICENSE-pixelify-sans.txt">Pixelify Sans</a>, <a href="fonts/LICENSE-jersey.txt">Jersey</a>, <a href="fonts/LICENSE-tiny5.txt">Tiny5</a>).</li>
<li><b>Fusion Pixel Font</b> (Chinese, Japanese and Korean glyphs) — <a href="fonts/LICENSE-fusion-pixel.txt">license</a>.</li>
<li><b>Yellowtail</b> by Astigmatic (base of the Cousins Studios lettering) — Apache License 2.0 (<a href="fonts/LICENSE-yellowtail.txt">text</a>).</li>
</ul>

<h2>Map data and software</h2>
<ul>
<li><b>World map:</b> <a href="https://github.com/topojson/world-atlas" target="_blank" rel="noopener noreferrer">world-atlas</a> by Mike Bostock (ISC license, <a href="data/LICENSE-world-atlas.txt">text</a>), from <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a> (public domain).</li>
<li><b>Sea, ocean and lake outlines:</b> marine polygons and lakes from <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a> (public domain), simplified and merged for the game.</li>
<li><b>Desktop version:</b> <a href="https://www.electronjs.org/" target="_blank" rel="noopener noreferrer">Electron</a> and Chromium (MIT and other licenses, see LICENSE and LICENSES.chromium.html in the game folder); <a href="https://github.com/ceifa/steamworks.js" target="_blank" rel="noopener noreferrer">steamworks.js</a> (MIT). Steamworks SDK © Valve Corporation.</li>
</ul>

<script>
const q=document.getElementById("q");q.addEventListener("input",()=>{const v=q.value.trim().toLowerCase();document.querySelectorAll("tbody tr").forEach(r=>{r.hidden=!!v&&!r.textContent.toLowerCase().includes(v)})});
</script>
</main></body></html>
`;
fs.writeFileSync(path.join(ROOT, "credits.html"), html);
console.log(`credits.html: ${photos.length} fotos, ${flags.length} banderas, ${(html.length / 1024).toFixed(0)} KB`);
