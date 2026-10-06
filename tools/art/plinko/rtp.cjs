/* Lluvia de fichas - tablas de pagos y RTP EXACTO.   Uso:  node tools/art/plinko/rtp.cjs
   1. Distribucion exacta por programacion dinamica (core.js) y comprobacion por enumeracion de los 4096 caminos.
   2. Tres niveles de riesgo (Seguro / Equilibrado / Arriesgado). La forma de cada tabla (alta en los bordes, baja en el centro) es fija; para cada
      columna de salida el programa busca la escala y el redondeo (multiplos de 0,1 / 0,5 / 1 / 5 segun el tamano) que dejan el RTP EXACTO entre 96,0 % y 97,0 %.
      Asi las 33 tablas (3 niveles x 11 columnas) son igual de justas: la columna elige la VARIANZA (centro = premios grandes y raros; borde = premios pequenos y frecuentes), no el retorno.
   3. Premio en monedas = ficha x multiplicador. Si sale fraccion de moneda, la fraccion se SORTEA con el mismo generador sembrado (0,6 monedas = 60 % de cobrar 1 y 40 % de cobrar 0):
      el retorno esperado es exacto para las tres fichas (2, 5, 10) y no hay monedas con decimales. (El redondeo fijo desvia el RTP de la ficha 2 y la 5 hasta +-4 puntos: se probo y se descarto.)
   4. Escribe tablas.js (lo carga la maqueta) y tablas.md (todas las tablas), y hace una prueba estadistica del generador sembrado (chi cuadrado + RTP empirico). */
const fs = require("fs"), path = require("path"), C = require("./core.js");
const { R, COLS, N } = C;
const RISK = ["Seguro", "Equilibrado", "Arriesgado"];
const SHAPE = [[5.6, 2.8, 1.5, 1.1, 0.9, 0.5], [18, 5, 2, 1, 0.6, 0.3], [110, 5, 1.4, 0.3, 0.1, 0]];   // casillas 0..5 (la 10-j es simetrica)
const LO = 0.9600, HI = 0.9700, MID = 0.965;

/* 1. distribucion exacta */
const counts = []; for (let c = 0; c < COLS; c++) { const a = C.counts(c), b = C.countsBrute(c); if (a.join() !== b.join() || a.reduce((x, y) => x + y) !== N) throw new Error("DP != enumeracion en la columna " + c); counts.push(a); }

/* 2. busqueda de tablas (t en decimas del multiplicador) */
const gridT = t => (t < 100 ? 1 : t < 300 ? 5 : t < 1000 ? 10 : 50);      // paso en decimas: 0,1 hasta x10; 0,5 hasta x30; 1 hasta x100; 5 despues
function options(x10, allowZero) {
  const g = gridT(x10), lo = Math.floor(x10 / g) * g;
  return [...new Set([lo - g, lo, lo + g, lo + 2 * g])].filter(t => t >= (allowZero ? 0 : 1)).sort((a, b) => a - b);
}
const rtpOf = (cnt, full) => full.reduce((a, t, j) => a + cnt[j] * t, 0) / (10 * N);
function solve(risk, col) {
  const F = SHAPE[risk], cnt = counts[col];
  let best = null;
  for (let li = 0; li <= 900; li++) {
    const lam = 0.012 * Math.pow(1.0075, li);                                       // escala (de 0,012 a ~9)
    const opts = F.map((f, j) => options(lam * f * 10, f <= 0.15)), tgt = F.map(f => Math.log(lam * f * 10 + 0.5));
    const rec = (j, t) => {
      if (j === 6) {
        const full = t.concat(t.slice(0, 5).reverse()), rtp = rtpOf(cnt, full);
        if (rtp < LO || rtp > HI) return;
        let E = 0; for (let k = 0; k < 6; k++) E += (k === 5 ? 1 : 2) * Math.abs(Math.log(t[k] + 0.5) - tgt[k]);
        const score = E + 8 * Math.abs(rtp - MID);
        if (!best || score < best.score) best = { score, t: full, rtp, lam };
        return;
      }
      for (const o of opts[j]) { if (j > 0 && o > t[j - 1]) continue; t[j] = o; rec(j + 1, t); }
    };
    rec(0, [0, 0, 0, 0, 0, 0]);
  }
  if (!best) throw new Error("sin tabla: riesgo " + risk + " columna " + col);
  return best;
}
const pay = RISK.map((_, r) => counts.map((_, c) => solve(r, c)));
const rtpExact = pay.map(row => row.map((o, c) => rtpOf(counts[c], o.t)));      // [riesgo][columna]
for (let r = 0; r < 3; r++) for (let c = 0; c < COLS; c++) if (rtpExact[r][c] < LO || rtpExact[r][c] > HI) throw new Error("RTP fuera de ventana");

/* 3. salida */
const fmt = t => (t % 10 === 0 ? String(t / 10) : (t / 10).toFixed(1)).replace(".", ",");
const pct = x => (100 * x).toFixed(2).replace(".", ",") + " %";
const stats = pay.map((row, r) => row.map((o, c) => { const cnt = counts[c]; let hit = 0, zero = 0, mx = 0, e2 = 0; o.t.forEach((t, j) => { if (t >= 10) hit += cnt[j]; if (t === 0) zero += cnt[j]; if (cnt[j]) mx = Math.max(mx, t); e2 += cnt[j] / N * (t / 10) ** 2; });
  const p = rtpExact[r][c]; return { hit: hit / N, zero: zero / N, max: mx / 10, sd: Math.sqrt(e2 - p * p) }; }));
fs.writeFileSync(path.join(__dirname, "tablas.js"),
  "/* generado por rtp.cjs - NO editar. pay[riesgo][columna][casilla] en decimas del multiplicador; counts[columna][casilla] caminos de 4096; rtp[riesgo][columna] */\nwindow.PLK_TAB = " +
  JSON.stringify({ R, COLS, N, risk: RISK, counts, pay: pay.map(row => row.map(o => o.t)), rtp: rtpExact, stats }) + ";\n");
let md = "# Lluvia de fichas - todas las tablas (generado por rtp.cjs)\n\nCasillas 1..11 de izquierda a derecha; columnas de salida 1..11. Probabilidad = caminos / 4096 (exacta).\n";
RISK.forEach((nm, r) => { md += `\n## ${nm}\n`; for (let c = 0; c < COLS; c++) { md += `\n### ${nm} - columna ${c + 1} - RTP ${pct(rtpExact[r][c])} - gana >= x1: ${pct(stats[r][c].hit)} - x0: ${pct(stats[r][c].zero)}\n\n| casilla | ${[...Array(COLS).keys()].map(j => j + 1).join(" | ")} |\n|---|${"---|".repeat(COLS)}\n| multiplicador | ${pay[r][c].t.map(t => "x" + fmt(t)).join(" | ")} |\n| caminos /4096 | ${counts[c].join(" | ")} |\n`; } });
fs.writeFileSync(path.join(__dirname, "tablas.md"), md);

console.log("RTP exacto por nivel y columna de salida (1..11):");
RISK.forEach((nm, r) => console.log(nm.padEnd(12), rtpExact[r].map(x => (100 * x).toFixed(2)).join("  ")));
for (const [r, c] of [[0, 5], [1, 5], [2, 5], [0, 0], [1, 0], [2, 0], [1, 2]]) {
  console.log(`\n${RISK[r]} columna ${c + 1}: RTP ${pct(rtpExact[r][c])}  (escala ${pay[r][c].lam.toFixed(3)})  gana>=x1: ${pct(stats[r][c].hit)}  x0: ${pct(stats[r][c].zero)}  max x${stats[r][c].max}  desv.tipica ${stats[r][c].sd.toFixed(2)}`);
  console.log("  casilla ", [...Array(COLS).keys()].map(j => String(j + 1).padStart(6)).join(""));
  console.log("  pago x  ", pay[r][c].t.map(t => ("x" + fmt(t)).padStart(6)).join(""));
  console.log("  caminos ", counts[c].map(n => String(n).padStart(6)).join(""));
  console.log("  prob %  ", counts[c].map(n => (100 * n / N).toFixed(2).padStart(6)).join(""));
}

/* 4. prueba estadistica del generador sembrado (core.walk con mulberry32): chi cuadrado contra la distribucion exacta y RTP empirico (con el sorteo de la fraccion de moneda, ficha 5) */
const M = 1000000;
for (const c of [0, 3, 5]) {
  const rand = C.rng("plk-test-" + c), obs = new Array(COLS).fill(0); let paid = 0;
  for (let i = 0; i < M; i++) { const w = C.walk(rand, c); obs[w.slot]++; const x = 5 * pay[1][c].t[w.slot] / 10, f = Math.floor(x); paid += f + (rand() < x - f ? 1 : 0); }
  let chi = 0, df = -1; counts[c].forEach((n, j) => { if (n) { const e = M * n / N; chi += (obs[j] - e) ** 2 / e; df++; } else if (obs[j]) throw new Error("caida imposible"); });
  const lim = df + 4 * Math.sqrt(2 * df), emp = paid / (5 * M);
  console.log(`\nprueba columna ${c + 1}: ${M} caidas  chi2=${chi.toFixed(2)} (gl ${df}, limite ${lim.toFixed(1)}) ${chi < lim ? "OK" : "FALLA"}   RTP empirico Equilibrado ficha 5 (monedas enteras sorteadas) ${(100 * emp).toFixed(2)} % vs exacto ${(100 * rtpExact[1][c]).toFixed(2)} %`);
}
