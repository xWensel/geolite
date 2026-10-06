/* Rasca y gana - verificacion exacta del retorno (RTP), de la coherencia de las cuadriculas y de las frecuencias.
   Uso:  node tools/art/rasca/rtp.cjs        (tarda ~20 s: enumera TODAS las cuadriculas posibles del generador) */
const C = require("./rasca-core.js");
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const frac = (n, d) => { const g = gcd(n, d); return `${n / g}/${d / g}`; };
let fails = 0; const ok = (c, msg) => { if (!c) { fails++; console.log("  FALLO:", msg); } };
const pct = x => (x * 100).toFixed(4) + " %";

/* 1. tabla exacta ---------------------------------------------------------------------------------------------- */
console.log("== 1. TABLA DE PAGOS EXACTA (probabilidad por tarjeta, den = " + C.DEN + ") ==");
let rtpNum = 0, hitNum = 0;
console.log("premio  prob.exacta   fraccion        1 de      aporta al RTP");
for (const t of C.TIERS) {
  rtpNum += t.n * t.m; hitNum += t.n;
  console.log(("x" + t.m).padEnd(7), pct(t.n / C.DEN).padEnd(13), frac(t.n, C.DEN).padEnd(15), (C.DEN / t.n).toFixed(1).padEnd(9), pct((t.n * t.m) / C.DEN), `  (${t.slots.length} simbolo${t.slots.length > 1 ? "s" : ""}: ${pct(t.n / C.DEN / t.slots.length)} cada uno)`);
}
console.log("casi    ", pct(C.CASI_N / C.DEN), "(una pareja y nada mas; no paga)");
console.log("nada    ", pct(C.NADA_N / C.DEN));
console.log(`ACIERTO (algun premio): ${pct(hitNum / C.DEN)}  = ${frac(hitNum, C.DEN)}  (1 de ${(C.DEN / hitNum).toFixed(2)})`);
console.log(`RTP EXACTO: ${rtpNum}/${C.DEN} = ${pct(rtpNum / C.DEN)}   ventaja de la casa: ${pct(1 - rtpNum / C.DEN)}`);
ok(rtpNum / C.DEN >= 0.95 && rtpNum / C.DEN <= 0.96, "RTP fuera de 95-96 %");
ok(hitNum + C.CASI_N + C.NADA_N === C.DEN, "las probabilidades no suman 1");
const mean = rtpNum / C.DEN; let varr = 0; for (const t of C.TIERS) varr += (t.n / C.DEN) * (t.m - mean) ** 2; varr += ((C.DEN - hitNum) / C.DEN) * mean ** 2;
console.log(`desviacion tipica por tarjeta: ${Math.sqrt(varr).toFixed(3)} fichas`);

/* 2. enumeracion exhaustiva de lo que el generador puede fabricar -------------------------------------------- */
console.log("\n== 2. ENUMERACION EXHAUSTIVA (cada cuadricula posible se lee con una copia rapida de evaluate()) ==");
const subsets = (n, k) => { const out = []; const rec = (s, a) => { if (a.length === k) { out.push(a.slice()); return; } for (let i = s; i < n; i++) { a.push(i); rec(i + 1, a); a.pop(); } }; rec(0, []); return out; };
const perms = (arr, k) => { const out = []; const used = new Array(arr.length).fill(false), cur = []; const rec = () => { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = 0; i < arr.length; i++) if (!used[i]) { used[i] = true; cur.push(arr[i]); rec(); cur.pop(); used[i] = false; } }; rec(); return out; };
const cnt = new Int8Array(9);
const fastEval = g => { cnt.fill(0); for (let i = 0; i < 9; i++) cnt[g[i]]++; let t = -1, p = 0; for (let s = 0; s < 9; s++) { const c = cnt[s]; if (c === 3) { if (t >= 0) return -9; t = s; } else if (c === 2) p++; else if (c > 3) return -9; } return t >= 0 ? (p ? -9 : C.SLOT_MULT[t] * 1000 + t) : p === 1 ? -1 : p === 0 ? -2 : -9; };
let totalGrids = 0; const t0 = Date.now(); const g = new Array(9);
const all9 = [0, 1, 2, 3, 4, 5, 6, 7, 8];
for (let s = 0; s < 9; s++) {                       // premios: tres iguales + seis distintos
  const others = all9.filter(x => x !== s), P6 = perms(others, 6), T = subsets(9, 3); let n = 0, bad = false;
  for (const tr of T) { const rest = all9.filter(i => !tr.includes(i)); for (const p of P6) { for (const i of tr) g[i] = s; for (let j = 0; j < 6; j++) g[rest[j]] = p[j]; n++; if (fastEval(g) !== C.SLOT_MULT[s] * 1000 + s) bad = true; } }
  ok(!bad, "cuadricula de premio mal leida, simbolo " + s); totalGrids += n; ok(n === 84 * 20160, "recuento de cuadriculas de premio");
}
for (let s = 0; s < 9; s++) {                       // casi: una pareja + siete distintos
  const others = all9.filter(x => x !== s), P7 = perms(others, 7), T = subsets(9, 2); let n = 0, bad = false;
  for (const tr of T) { const rest = all9.filter(i => !tr.includes(i)); for (const p of P7) { for (const i of tr) g[i] = s; for (let j = 0; j < 7; j++) g[rest[j]] = p[j]; n++; if (fastEval(g) !== -1) bad = true; } }
  ok(!bad, "casi mal leido"); totalGrids += n; ok(n === 36 * 40320, "recuento de casi");
}
{ const P9 = perms(all9, 9); let bad = false; for (const p of P9) if (fastEval(p) !== -2) bad = true; ok(!bad, "nada mal leida"); totalGrids += P9.length; }
console.log(`  ${totalGrids.toLocaleString("es-ES")} cuadriculas posibles revisadas en ${((Date.now() - t0) / 1000).toFixed(1)} s: toda cuadricula de premio paga EXACTAMENTE su simbolo, ninguna de "casi" ni de "nada" paga.`);

/* 3. el generador sembrado: coherencia y frecuencias --------------------------------------------------------- */
console.log("\n== 3. GENERADOR SEMBRADO (outcome(semilla)): 1.000.000 de tarjetas ==");
const N = 1000000, cls = {}, symCount = new Array(9).fill(0), cell3 = new Array(9).fill(0), pairSym = new Array(9).fill(0), cellPair = new Array(9).fill(0); let paid = 0, coherent = true;
for (let i = 0; i < N; i++) {
  const o = C.outcome("t" + i + "x" + ((i * 2654435761) >>> 0).toString(16)), e = C.evaluate(o.grid);
  if (!e.valid || e.cls !== o.cls || e.mult !== o.mult) { coherent = false; console.log("  incoherente en la semilla", o.seed, o); break; }
  cls[o.cls] = (cls[o.cls] || 0) + 1; paid += o.mult;
  if (o.mult) { symCount[o.win]++; for (const c of o.cells) cell3[c]++; } else if (o.cls === "casi") { pairSym[o.pair]++; for (const c of o.cells) cellPair[c]++; }
}
ok(coherent, "alguna cuadricula no es coherente con su premio");
const chi = (obs, exp) => obs.reduce((a, o, i) => a + (o - exp[i]) ** 2 / exp[i], 0);
const crit = { 1: 6.63, 2: 9.21, 3: 11.34, 4: 13.28, 5: 15.09, 6: 16.81, 7: 18.48, 8: 20.09 };          // chi2 al 99 %
const ids = ["x100", "x25", "x10", "x5", "x3", "x2", "casi", "nada"], expN = [80, 400, 1200, 4000, 8500, 10250, C.CASI_N, C.NADA_N].map(n => (n / C.DEN) * N);
console.log("clase    observado   esperado    desv.");
ids.forEach((id, i) => console.log(id.padEnd(8), String(cls[id] || 0).padEnd(11), expN[i].toFixed(0).padEnd(11), (((cls[id] || 0) - expN[i]) / Math.sqrt(expN[i])).toFixed(2) + " sigma"));
const x2 = chi(ids.map(id => cls[id] || 0), expN); console.log(`chi2 de las 8 clases = ${x2.toFixed(2)} (gl 7, limite al 99 %: ${crit[7]})`); ok(x2 < crit[7], "las clases no siguen la tabla");
const wins = C.TIERS.reduce((a, t) => a + (cls[t.id] || 0), 0);
console.log(`RTP medido = ${pct(paid / N)} (exacto ${pct(rtpNum / C.DEN)}) - acierto medido ${pct(wins / N)}`);
ok(Math.abs(paid / N - rtpNum / C.DEN) < 0.02, "RTP medido lejos del exacto");
const t3 = [symCount[4], symCount[5]], t2 = [symCount[6], symCount[7], symCount[8]];
const c3 = chi(t3, [(t3[0] + t3[1]) / 2, (t3[0] + t3[1]) / 2]), c2 = chi(t2, t2.map(() => (t2[0] + t2[1] + t2[2]) / 3));
console.log(`simbolo dentro de x3: ${t3} (chi2 ${c3.toFixed(2)}) - dentro de x2: ${t2} (chi2 ${c2.toFixed(2)})`); ok(c3 < crit[1] && c2 < crit[2], "simbolos de un mismo nivel no equiprobables");
const tot3 = cell3.reduce((a, b) => a + b, 0), cc = chi(cell3, cell3.map(() => tot3 / 9));
console.log(`casillas premiadas por posicion (9 casillas): ${cell3} - chi2 ${cc.toFixed(2)} (gl 8, limite ${crit[8]})`); ok(cc < crit[8], "las casillas premiadas no son uniformes");
const totP = pairSym.reduce((a, b) => a + b, 0), wsum = C.CASI_W.reduce((a, b) => a + b, 0), cp = chi(pairSym, C.CASI_W.map(w => (w / wsum) * totP));
console.log(`pareja del "casi" por simbolo: ${pairSym} - esperado segun pesos ${C.CASI_W} - chi2 ${cp.toFixed(2)} (gl 8)`); ok(cp < crit[8], "la pareja del casi no sigue sus pesos");
const totC = cellPair.reduce((a, b) => a + b, 0), cq = chi(cellPair, cellPair.map(() => totC / 9));
console.log(`casillas de la pareja: ${cellPair} - chi2 ${cq.toFixed(2)}`); ok(cq < crit[8], "casillas de la pareja no uniformes");

/* 4. independencia ---------------------------------------------------------------------------------------------- */
const a = JSON.stringify(C.outcome("semilla-fija")), b = JSON.stringify(C.outcome("semilla-fija")); ok(a === b, "la semilla no es reproducible");
console.log("\n== 4. outcome(semilla) es una funcion pura de la semilla: " + (a === b ? "SI" : "NO") + " (no recibe ficha, tema, presentacion ni orden de rascado) ==");

/* 5. el carrete de presentaciones --------------------------------------------------------------------------- */
console.log("\n== 5. CARRETE: 8 presentaciones, nunca las 2 ultimas, mas peso a las menos vistas (200.000 sorteos) ==");
const ids8 = ["a", "b", "c", "d", "e", "f", "g", "h"], seen = {}, last = []; let rep = 0; const rnd = C.mulberry(12345);
for (let i = 0; i < 200000; i++) { const id = C.reelPick(ids8, seen, last, rnd); if (last.includes(id)) rep++; seen[id] = (seen[id] || 0) + 1; last.unshift(id); last.length = Math.min(2, last.length); }
console.log("  veces que sale cada una:", ids8.map(i => seen[i]).join(" / "), "- repeticiones de las 2 ultimas:", rep);
ok(rep === 0, "el carrete repite las 2 ultimas"); const mx = Math.max(...ids8.map(i => seen[i])), mn = Math.min(...ids8.map(i => seen[i])); ok(mx / mn < 1.08, "el carrete no se equilibra");

console.log(fails ? `\n*** ${fails} FALLOS ***` : "\nTODO CORRECTO"); process.exit(fails ? 1 : 0);
