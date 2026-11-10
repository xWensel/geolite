/* Geolite - el catalogo de frases de la mesa del crupier (mesa/frases.js). Uso: node tools/mesa-frases.mjs
   Lee las frases del crupier de js/dealer.js (LINES + MORE) y escribe, en espanol, las que se pueden decir sin datos de la partida (sin {p}, {n}...;
   {name} si vale: el juego pone el nombre del jugador). La mesa las ensena por momento con buscador y las manda por su clave ("clave#indice"):
   el juego dice SU version, en el idioma del jugador (A.dealer.nth). Volver a lanzarlo cuando cambien las frases del crupier. */
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const src = fs.readFileSync(path.join(root, "js/dealer.js"), "utf8");

/* el texto de un objeto literal de dealer.js (cuenta llaves saltandose cadenas y comentarios) */
function literal(name) {
  const a = src.indexOf("const " + name + " = {"); if (a < 0) throw new Error("no encuentro " + name);
  let i = src.indexOf("{", a), d = 0, q = null, j = i;
  for (; j < src.length; j++) {
    const c = src[j];
    if (q) { if (c === "\\") { j++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "/" && src[j + 1] === "/") { j = src.indexOf("\n", j); continue; }
    if (c === "/" && src[j + 1] === "*") { j = src.indexOf("*/", j) + 1; continue; }
    if (c === "{") d++; else if (c === "}") { d--; if (!d) break; }
  }
  return src.slice(i, j + 1);
}
/* cualquier funcion de envoltorio (only(...), etc.) devuelve su primer argumento: solo queremos el texto */
const ctx = new Proxy({}, { has: () => true, get: (t, k) => (k === Symbol.unscopables ? undefined : k in globalThis ? globalThis[k] : x => x) });
const ev = name => vm.runInNewContext("with (ctx) { (" + literal(name) + ") }", { ctx });
const LINES = ev("LINES"), MORE = ev("MORE");
for (const k in MORE) LINES[k] = (LINES[k] || []).concat(MORE[k]);

/* la voz de cada grupo (el bloque VOZ de dealer.js: "voz: clave clave ...") */
const VOZ = {};
{
  const a = src.indexOf("const VOZ = {}; {"), b = src.indexOf("const VOZ_OLD", a), block = src.slice(a, b);
  for (const m of block.matchAll(/(\w+):\s*"([^"]+)"/g)) m[2].split(" ").forEach(k => { VOZ[k] = m[1]; });
}

/* el momento de cada clave, por su nombre (el primero que encaje) */
const MOMS = [
  ["comodin", /^(cat|quitCat|retireCat|retireEndCat|comebackCat)/],
  ["salida", /^(quit|hover|forgetBye|gateWait)/],
  ["jefes", /^(boss$|bossNamed|bossBeat|bossWins|finalBoss)/],
  ["duelo", /^(duel|h2h)/],
  ["barra", /^(bet|trile|bribe|reroll|winSmall|winFull|winBorder)/],
  ["tienda", /^(shop|pf|tier|ach|pod|cx|lock|file|chest|tagFix|mesaNew)/],
  ["pared", /^(afk|tabBack|resize|clock|visitsMeta|totalMeta|pt\d|poke|sulk|babel|fakeAch|copyName|rightClick|batteryReal|napWake|lateLeft|homeMeta|runMeta|homeIdle|runIdle|tantrum|monitor|osLang|padOn|padOff|deckOn|photo|midnight|dejavu|wake|newVersion)/],
  ["retos", /^(shaky|missing|swap|mirror|nocountry|memory|blur|dark|flicker|wrongborders|noborders|pangea|flip|clouds|upside|runes|scroll|novowels|anagram|dance|riddle|babel|deal|spread|tilt|spin|myopia|blindspot|mosaic|negative|quake|drift|decoys|lightning|rain|tremble|blink|ghost$|cblur|lag|cmirror|dizzy|wind|storm|silence|crack|smudge|hang|battery|frost|tiles|signal|card$|flag|fakepass|ticker|ctrlz|stormnight|trap|giants|boss_|siesta|screensaver|bsod|hand)/],
  ["acierto", /^(good|streak$|counter|roundWin|runWin|closeCall|goalMid|lastSecond|secondWin|nemesisBeat|ghostBeat)/],
  ["fallo", /^(bull|miss|timeout|roundFail|runLose|wrongCountry|decoyHit|streakEnd|funeral|ghostFall)/],
  ["partida", /^(calm|newHand|run|act\d|inf|retry|trick|virgin|nemesis|amulet|relic|tourSkip|classicBack|card)/],
  ["portada", /^(hello|home|first|open|cal|anniv|streakDays|comeback|retire|nick|name|song)/],
];
const momOf = k => (MOMS.find(([, re]) => re.test(k)) || ["otras"])[0];

const out = {}; let n = 0, skipped = 0;
for (const k of Object.keys(LINES)) {
  const rows = [];
  LINES[k].forEach((s, i) => {
    const es = (typeof s === "string" ? s : s.es || "").split("|")[0].trim();
    if (!es || /\{\w*\}/.test(es.replace(/\{name\}/g, ""))) { skipped++; return; }   // necesita datos de la partida: no se puede mandar a mano
    rows.push([i, es]); n++;
  });
  if (rows.length) (out[momOf(k)] = out[momOf(k)] || []).push([k, VOZ[k] || "", rows]);
}
const ORDER = ["portada", "partida", "acierto", "fallo", "retos", "jefes", "barra", "duelo", "tienda", "salida", "comodin", "pared", "otras"];
const data = ORDER.filter(m => out[m]).map(m => [m, out[m]]);
const head = "/* GENERADO por tools/mesa-frases.mjs desde js/dealer.js: no editar a mano. " + n + " frases del crupier que se pueden decir sin datos de la partida,\n   en espanol, por momento: [momento, [[clave, voz, [[indice, texto], ...]], ...]]. La mesa manda \"clave#indice\" y el juego dice la suya, en su idioma. */\n";
fs.writeFileSync(path.join(root, "mesa/frases.js"), head + "window.MESA_FRASES = " + JSON.stringify(data) + ";\n");
console.log("mesa/frases.js:", n, "frases en", data.reduce((a, [, g]) => a + g.length, 0), "grupos;", skipped, "fuera (piden datos)");
for (const [m, g] of data) console.log("  " + m.padEnd(9), g.reduce((a, x) => a + x[2].length, 0));
