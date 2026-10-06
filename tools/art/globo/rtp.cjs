/* El globo - probabilidades y RTP EXACTOS (BigInt racionales) + prueba estadistica con el generador real (crash.js).
   Uso:  node rtp.cjs     ->  imprime las tablas y escribe rtp-data.js (lo lee maqueta.html). */
const C = require("./crash.js"), fs = require("fs");
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
const frac = (n, d) => { const g = gcd(n, d); return { n: n / g, d: d / g }; };
const dec = (n, d, k = 6) => { const s = (n * 10n ** BigInt(k)) / d; const t = s.toString().padStart(k + 1, "0"); return t.slice(0, -k) + "." + t.slice(-k); };
const XS = [1001, 1100, 1250, 1500, 2000, 3000, 5000, 10000, 25000, 50000, 100000];
const rows = [];
console.log("x       P(llegar >= x)                 1 de cada  RTP fijo (exacto)   sigma por ficha");
for (const k of XS) {
  const pn = 970n, pd = BigInt(k);                                                   // P(X >= k) = 970/k
  const ev = frac(970n * BigInt(k), 1000n * BigInt(k));                              // x * P = (k/1000) * (970/k) = 0,97
  const P = 970 / k, x = k / 1000, sd = x * Math.sqrt(P * (1 - P));
  rows.push({ x, p: P, pct: P * 100, oneIn: 1 / P, ev: Number(ev.n) / Number(ev.d), evFrac: ev.n + "/" + ev.d, sd, exact: dec(pn, pd, 8) });
  console.log(String(x).padEnd(7), (dec(pn, pd, 8) + " (" + (P * 100).toFixed(4) + " %)").padEnd(30), (1 / P).toFixed(2).padEnd(10), (ev.n + "/" + ev.d + " = 0,97").padEnd(20), sd.toFixed(3));
}
/* distribucion completa: P(X=1000) = 1 - 970/1001 ; P(X=k) = 970/k - 970/(k+1) ; P(X=CAP) = 970/CAP  -> suma 1 y E[X] */
const P1 = 1 - 970 / 1001; let sum = P1, ex = P1;
for (let k = 1001; k < C.CAP; k++) { const pk = 970 / k - 970 / (k + 1); sum += pk; ex += (k / 1000) * pk; }
sum += 970 / C.CAP; ex += 100 * 970 / C.CAP;
const median = 0.97 / 0.5;
console.log("\nsuma de probabilidades =", sum.toFixed(12), " E[X] con tope x100 =", ex.toFixed(4), " P(reventar a x1,000) =", (P1 * 100).toFixed(4), "% (1 de cada", (1 / P1).toFixed(1) + ")", " mediana x" + median.toFixed(2));
console.log("P(llegar al techo x100) = 0,97 % (1 de cada", (100 / 0.97).toFixed(1) + ")");
/* por que el redondeo SEMBRADO: pago entero con tres reglas; RTP de cobrar a x fijo en la rejilla 0,01 (ficha 2, 5 y 10) */
function rtpRule(stake, rule) {
  let mn = 9, mx = 0, mean = 0, n = 0;
  for (let k = 1010; k <= 100000; k += 10) {
    const v = stake * k / 1000, f = rule === "floor" ? Math.floor(v) : rule === "nearest" ? Math.floor(v + 0.5) : v;       // 'seeded' = esperanza exacta v
    const r = (f / stake) * (970 / k); mn = Math.min(mn, r); mx = Math.max(mx, r); mean += r; n++;
  }
  return { min: mn, max: mx, mean: mean / n };
}
const rules = {};
for (const s of [2, 5, 10]) { rules[s] = { floor: rtpRule(s, "floor"), nearest: rtpRule(s, "nearest"), seeded: rtpRule(s, "seeded") }; console.log("ficha", s, "floor", JSON.stringify(rules[s].floor), "| nearest", JSON.stringify(rules[s].nearest), "| sembrado", JSON.stringify(rules[s].seeded)); }
/* prueba estadistica con el generador real: 4M vuelos */
const N = 4000000, bins = [1000, 1001, 1100, 1500, 2000, 3000, 5000, 10000, 50000, 100000], obs = new Array(bins.length).fill(0), r2b = new Array(10).fill(0);
const targets = [1100, 1500, 2000, 5000, 10000, 100000], gain = {}; targets.forEach(t => { gain[t] = 0; });
let sumr = 0, sumx = 0, sumxr = 0, sumx2 = 0, sumr2 = 0;
for (let i = 1; i <= N; i++) {
  const d = C.draw((Math.imul(i, 2654435761) ^ 0x9E3779B9) >>> 0); const x = d.x;
  let b = bins.length - 1; for (let j = 0; j < bins.length - 1; j++) if (x < bins[j + 1]) { b = j; break; } obs[b]++;
  r2b[Math.min(9, Math.floor(d.r2 * 10))]++;
  const lx = Math.log(x); sumr += d.r2; sumx += lx; sumxr += lx * d.r2; sumx2 += lx * lx; sumr2 += d.r2 * d.r2;
  for (const t of targets) if (x >= t) gain[t] += C.payout(5, t, d.r2);
}
const Pge = k => (k <= 1000 ? 1 : k > C.CAP ? 0 : 970 / k);
const expP = bins.map((a, j) => (j === bins.length - 1 ? 970 / C.CAP : Pge(a === 1000 ? 1000 : a) - Pge(bins[j + 1])));
expP[0] = P1;                                                       // [1000,1001): reventar a x1,000
let chi = 0; for (let j = 0; j < bins.length; j++) { const e = expP[j] * N; chi += (obs[j] - e) ** 2 / e; }
let chir = 0; for (const o of r2b) chir += (o - N / 10) ** 2 / (N / 10);
const corr = (sumxr / N - (sumx / N) * (sumr / N)) / Math.sqrt((sumx2 / N - (sumx / N) ** 2) * (sumr2 / N - (sumr / N) ** 2));
console.log("\nPRUEBA con", N, "vuelos: chi2 de X (", bins.length - 1, "gl; critico 95 % = 16.92) =", chi.toFixed(2), "| chi2 de r2 (9 gl; 16.92) =", chir.toFixed(2), "| corr(ln X, r2) =", corr.toFixed(5));
const mc = {};
for (const t of targets) { const rtp = gain[t] / (N * 5); const P = 0.97 / (t / 1000), sd = Math.sqrt((t / 1000) ** 2 * P * (1 - P)) / Math.sqrt(N) / 1; mc[t] = { rtp, z: (rtp - 0.97) / sd }; console.log("cobrar a x" + t / 1000, "(ficha 5, pago entero sembrado): RTP medido =", rtp.toFixed(5), " esperado 0.97000  z =", ((rtp - 0.97) / sd).toFixed(2)); }
const out = { rtp: 0.97, cap: 100, rows, sum, ex, p1: P1, median, rules, test: { N, chi, chir, corr, mc, obs, expP: expP.map(v => v * N), bins } };
fs.writeFileSync(__dirname + "/rtp-data.js", "window.RTP=" + JSON.stringify(out) + ";\n");
console.log("rtp-data.js escrito");
