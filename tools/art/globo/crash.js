/* El globo - el punto de reventon y el cobro, el MISMO codigo en la maqueta (window.GB_CRASH) y en la prueba (rtp.cjs).
   Distribucion "crash": P(X >= x) = 0,97 / x para x en [1,001 ; 100] (milesimas). Mulberry32 + hash, como A.rng del juego. */
(function (root) {
  "use strict";
  const R = 0.135;          // el multiplicador sube como exp(R t): x2 a los 5,1 s, x10 a los 17 s, x100 a los 34 s
  const CAP = 100000;       // el techo: x100,000 (en milesimas)
  const RTPK = 970;         // RTP 97 % (970 milesimas de 1000)
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  /* una semilla -> el punto de reventon X (milesimas; 1000 = x1,000 = revienta al despegar) y el umbral del redondeo sembrado r2 */
  function draw(seed) {
    const rng = mulberry32(typeof seed === "number" ? seed >>> 0 : hash(String(seed)));
    const u = 1 - rng();                                     // (0, 1]
    const x = Math.min(CAP, Math.max(1000, Math.floor(RTPK / u)));
    return { x, r2: rng() };
  }
  /* pago en monedas enteras al cobrar a m (milesimas): floor + 1 si la parte fraccionaria supera r2 (esperanza exacta = ficha * m) */
  function payout(stake, m, r2) { const v = stake * m, f = Math.floor(v / 1000), fr = (v % 1000) / 1000; return f + (fr > r2 ? 1 : 0); }
  const tOf = k => Math.log(k / 1000) / R;                    // segundo en que el multiplicador llega a k milesimas
  const mOf = t => Math.min(CAP, Math.floor(1000 * Math.exp(R * t) + 1e-9));
  const api = { R, CAP, RTPK, mulberry32, hash, draw, payout, tOf, mOf };
  root.GB_CRASH = api; if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
