/* Duelo de dados - probabilidades EXACTAS y RTP. Enumera las 36x36 combinaciones de dos tiradas de 2d6 (tu total contra el de la banca).
   Regla: gana el total mas alto (cobras x2). Empate: se repite la tirada UNA vez; si vuelve a empatar, gana la banca.
   Uso: node rtp.cjs   (imprime tablas; con --json imprime solo un JSON que copia la maqueta). */
"use strict";
const N = 36, cnt = {}; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) cnt[a + b] = (cnt[a + b] || 0) + 1;
const tot = Object.keys(cnt).map(Number).sort((a, b) => a - b);
// una tirada: P(gano), P(pierdo), P(empato) y la distribucion del margen (mi total - el suyo) cuando gano
let w1 = 0, l1 = 0, t1 = 0; const mar = {}, lmar = {};
for (const x of tot) for (const y of tot) { const p = (cnt[x] * cnt[y]) / (N * N); if (x > y) { w1 += p; mar[x - y] = (mar[x - y] || 0) + p; } else if (x < y) { l1 += p; lmar[y - x] = (lmar[y - x] || 0) + p; } else t1 += p; }
// una repeticion: gano w1 + t1*w1 ; pierdo l1 + t1*l1 + t1*t1 (el segundo empate lo gana la banca)
const win = w1 + t1 * w1, lose = l1 + t1 * l1 + t1 * t1, pTie2 = t1 * t1;
const rtp = 2 * win;
const R = { reglas: "empate: se repite 1 vez; segundo empate: gana la banca", pTotal: Object.fromEntries(tot.map(t => [t, cnt[t] + "/36"])), w1, l1, t1, win, lose, tie2: pTie2, rtp, ventaja: 1 - rtp };
// niveles de recompensa por margen (solo cuando ganas en la primera tirada o en la repeticion; el margen es el de la tirada que decide)
const lvl = { 1: 0, 2: 0, 3: 0 }; const lv = d => (d <= 2 ? 1 : d <= 5 ? 2 : 3);
for (const [d, p] of Object.entries(mar)) { lvl[lv(+d)] += p * (1 + t1); }
R.niveles = { n1: lvl[1], n2: lvl[2], n3: lvl[3], suma: lvl[1] + lvl[2] + lvl[3] };
// ojos de serpiente / doble seis / un siete
const P = {}; P.snake = 1 / 36; P.boxcars = 1 / 36; P.seven = 6 / 36; R.especiales = { snake: P.snake, boxcars: P.boxcars, seven: P.seven, bancaDoce: 1 / 36 };
// alternativas consideradas (por si se quiere otra regla)
R.alternativas = [
  { regla: "empate = gana la banca (sin repetir)", win: w1, rtp: 2 * w1 },
  { regla: "empate = se devuelve la apuesta", win: w1, push: t1, rtp: 2 * w1 + t1 },
  { regla: "empate: repetir hasta decidir", win: 0.5, rtp: 1.0 },
  { regla: "empate: repetir 1 vez; 2o empate = se devuelve", win, push: pTie2, rtp: 2 * win + pTie2 },
  { regla: "empate: repetir 1 vez; 2o empate = gana la banca (ELEGIDA)", win, rtp },
  { regla: "igual que la elegida pero pagando x1,95", win, rtp: 1.95 * win },
];
if (process.argv.includes("--json")) { console.log(JSON.stringify(R)); process.exit(0); }
const f = (x, d = 4) => (x * 100).toFixed(d) + " %";
console.log("DISTRIBUCION DE UN TOTAL (2d6)"); for (const t of tot) console.log("  " + String(t).padStart(2), cnt[t] + "/36", f(cnt[t] / 36, 2));
console.log("\nUNA TIRADA   gano", f(w1), "  pierdo", f(l1), "  empato", f(t1), "  (146/1296 =", (146 / 1296).toFixed(6) + ")");
console.log("PARTIDA      gano", f(win), "  pierdo", f(lose), "  (empato dos veces seguidas:", f(pTie2) + ")");
console.log("RTP          x2 * P(ganar) =", f(rtp, 3), "  ventaja de la casa", f(1 - rtp, 3));
console.log("\nNIVELES (margen 1-2 = 1, 3-5 = 2, 6+ = 3), sobre todas las partidas:"); console.log("  nivel 1", f(lvl[1], 2), " nivel 2", f(lvl[2], 2), " nivel 3", f(lvl[3], 2), " | total ganar", f(lvl[1] + lvl[2] + lvl[3], 2));
console.log("\nALTERNATIVAS"); for (const a of R.alternativas) console.log("  " + a.regla.padEnd(62), f(a.rtp, 3));
// ---- prueba estadistica corta: el resultado decidido por semilla es uniforme (mulberry32 + hash) y el RTP simulado casa con el exacto
function hash(s) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; }; }
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const d6 = r => 1 + Math.floor(r() * 6);
let gains = 0, wins = 0, ties2 = 0, M = 2000000; const faces = new Array(7).fill(0);
for (let i = 0; i < M; i++) {
  const r = mulberry32(hash("duelo" + i)());
  let res = 0;
  for (let rep = 0; rep < 2; rep++) { const a = d6(r), b = d6(r), c = d6(r), d = d6(r); faces[a]++; if (rep === 0) { /* conteo de caras solo de la primera */ } const mine = a + b, his = c + d; if (mine > his) { res = 1; break; } if (mine < his) { res = -1; break; } }
  if (res === 1) { wins++; gains += 2; } else if (res === 0) ties2++;
}
console.log("\nPRUEBA ESTADISTICA (" + M + " partidas con semilla):  RTP simulado", f(gains / M, 3), "(exacto", f(rtp, 3) + ")  gano", f(wins / M, 3), "(exacto", f(win, 3) + ")");
const exp = M * 2 / 6 / 1; let chi = 0; const fc = faces.slice(1); const tt = fc.reduce((a, b) => a + b, 0); for (const c of fc) chi += (c - tt / 6) ** 2 / (tt / 6);
console.log("uniformidad de las caras del primer dado (chi2, 5 g.l., criterio 11.07 al 5 %):", chi.toFixed(2), chi < 11.07 ? "OK" : "REVISAR");

// ---- el carrete de presentaciones (misma logica que reelPick de maqueta.js): sin repetir las 2 ultimas, mas peso a las menos vistas; independiente del resultado
{
  const ids = ["clasica", "deslizada", "baranda", "choque", "desigual", "canto", "arriba", "volcado", "peonza", "rodado"], seen = {}, recent = []; let rep = 0, N = 100000;
  const cross = {}; // presentacion x (gano / pierdo): la presentacion se sortea con Math.random, el resultado con la semilla -> deben ser independientes
  for (let i = 0; i < N; i++) {
    const ok = ids.filter(id => !recent.includes(id)), w = ok.map(id => 1 / Math.pow(1 + (seen[id] || 0), 1.6)), tt = w.reduce((a, b) => a + b, 0); let x = Math.random() * tt, p = ok[ok.length - 1];
    for (let k = 0; k < ok.length; k++) { x -= w[k]; if (x <= 0) { p = ok[k]; break; } }
    if (recent.includes(p)) rep++; seen[p] = (seen[p] || 0) + 1; recent.push(p); if (recent.length > 2) recent.shift();
    const r = mulberry32(hash("duelo" + i)()), win = d6(r) + d6(r) > d6(r) + d6(r); (cross[p] = cross[p] || [0, 0])[win ? 0 : 1]++;
  }
  console.log("\nCARRETE (" + N + " tiradas): repeticiones de las 2 ultimas:", rep, "| veces vista (min..max):", Math.min(...ids.map(i => seen[i])), "..", Math.max(...ids.map(i => seen[i])), "(uniforme = " + N / ids.length + ")");
  let chi2 = 0; const A = ids.reduce((s, id) => s + cross[id][0], 0), pb = A / N; for (const id of ids) { const [a, b] = cross[id], n = a + b, ea = n * pb, eb = n * (1 - pb); chi2 += (a - ea) ** 2 / ea + (b - eb) ** 2 / eb; }
  console.log("independencia presentacion-resultado: % de 'gano' por presentacion", ids.map(id => (100 * cross[id][0] / (cross[id][0] + cross[id][1])).toFixed(1)).join(" "), "| chi2 aprox (9 g.l., 16.9 al 5 %):", chi2.toFixed(1));
}
