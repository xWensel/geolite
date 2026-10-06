/* Lluvia de fichas - nucleo comun: generador sembrado, camino de la ficha y distribucion EXACTA.
   Lo cargan la maqueta (navegador, window.PLK_CORE) y rtp.cjs (node, require). Una sola fuente de verdad: lo que se anima es lo que se calcula.

   Tablero: 12 filas de clavijas al tresbolillo y 11 casillas. Posicion p en medios carriles (0..20): la fila r tiene clavijas en p con la paridad de r
   (filas pares: p = 0,2,..,20 -> 11 clavijas; impares: p = 1,3,..,19 -> 10). La ficha SIEMPRE cae sobre una clavija; en cada una se decide
   izquierda/derecha 50/50 con un bit del generador (1 bit por fila: 4096 caminos equiprobables). En la pared (p=0 a la izquierda, p=20 a la derecha)
   la ficha rebota y se va hacia dentro. Tras la fila 12 queda en p par: casilla = p/2. Las clavijas de la ultima fila son los tabiques entre casillas. */
(function (root) {
  "use strict";
  const R = 12, COLS = 11, PMAX = 2 * (COLS - 1), N = 1 << R;

  function hash(s) { s = String(s); let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^ (h >>> 16)) >>> 0; }
  function mulberry32(a) { return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rng = seed => mulberry32(typeof seed === "number" ? seed >>> 0 : hash(seed));

  /* un paso: de la posicion p, con el bit b (0 izquierda, 1 derecha) a la nueva posicion; w = -1/1 si rebota en la pared izquierda/derecha */
  function step(p, b) {
    let q = p + (b ? 1 : -1), w = 0;
    if (q < 0) { q = 1; w = -1; } else if (q > PMAX) { q = PMAX - 1; w = 1; }
    return { q, w };
  }
  /* el camino de una ficha soltada en la columna col (0..10): P[r] = posicion al llegar a la clavija de la fila r (P[12] = posicion final) */
  function walk(rand, col) {
    const P = [2 * col], bits = [], wall = [];
    for (let r = 0; r < R; r++) { const b = rand() < 0.5 ? 0 : 1, s = step(P[r], b); P.push(s.q); bits.push(b); wall.push(s.w); }
    return { P, bits, wall, slot: P[R] / 2 };
  }
  /* distribucion exacta por programacion dinamica: counts[j] caminos (de 4096) que acaban en la casilla j */
  function counts(col) {
    let dp = new Array(PMAX + 1).fill(0); dp[2 * col] = 1;
    for (let r = 0; r < R; r++) { const nx = new Array(PMAX + 1).fill(0); for (let p = 0; p <= PMAX; p++) if (dp[p]) for (const b of [0, 1]) nx[step(p, b).q] += dp[p]; dp = nx; }
    const out = new Array(COLS).fill(0); for (let p = 0; p <= PMAX; p += 2) out[p / 2] = dp[p]; return out;
  }
  /* comprobacion por enumeracion de los 4096 caminos (debe coincidir con counts) */
  function countsBrute(col) {
    const out = new Array(COLS).fill(0);
    for (let m = 0; m < N; m++) { let p = 2 * col; for (let r = 0; r < R; r++) p = step(p, (m >> r) & 1).q; out[p / 2]++; }
    return out;
  }
  const api = { R, COLS, PMAX, N, hash, mulberry32, rng, step, walk, counts, countsBrute };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PLK_CORE = api;
})(typeof window !== "undefined" ? window : globalThis);
