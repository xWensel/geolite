/* Geolite - Rasca y gana: NUCLEO DEL AZAR (UMD: navegador y node).
   Lo usa la maqueta (maqueta.js) y lo verifica rtp.cjs. En el juego sera A.rng(seed) = mulberry32 + hash (js/rank.js).
   Regla de oro: el resultado se decide aqui ANTES de animar nada; la animacion solo lo ENSENA.
   Ningun parametro del jugador (ficha, orden de rascado, tema, presentacion) entra en outcome(): el resultado depende solo de la semilla. */
(function (root, factory) { const C = factory(); if (typeof module === "object" && module.exports) module.exports = C; else root.RascaCore = C; })(this, function () {
  "use strict";
  const hash = str => { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return (h ^ (h >>> 16)) >>> 0; };
  const mulberry = seed => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  /* ---- la tabla (todo en cienmilesimas: DEN = 100000) ---- */
  const DEN = 100000;
  /* los 9 simbolos de cada tema ocupan las mismas "ranuras": 0 chistera, 1 diamante, 2 doblon, 3 estrella del tema, 4-5 los dos de x3, 6-8 los tres de x2 */
  const SLOT_MULT = [100, 25, 10, 5, 3, 3, 2, 2, 2];
  const TIERS = [
    { id: "x100", m: 100, n: 80,    slots: [0],       level: 3, sit: "jackpot" },
    { id: "x25",  m: 25,  n: 400,   slots: [1],       level: 3, sit: "gordo" },
    { id: "x10",  m: 10,  n: 1200,  slots: [2],       level: 2, sit: "medio" },
    { id: "x5",   m: 5,   n: 4000,  slots: [3],       level: 2, sit: "medio" },
    { id: "x3",   m: 3,   n: 8500,  slots: [4, 5],    level: 1, sit: "chico" },
    { id: "x2",   m: 2,   n: 10250, slots: [6, 7, 8], level: 1, sit: "chico" },
  ];
  const CASI_N = 28000;                                   // 28 %: tarjetas con exactamente UNA pareja (y nada mas). Frecuencia propia, declarada, independiente de la ficha.
  const CASI_W = [3, 3, 2, 1, 1, 1, 1, 1, 1];            // peso de la pareja segun la ranura (mas "casi" de chistera, diamante y doblon)
  const WIN_N = TIERS.reduce((a, t) => a + t.n, 0), NADA_N = DEN - WIN_N - CASI_N;

  /* ---- lectura de una cuadricula (9 ranuras): lo unico que decide el premio ---- */
  function evaluate(grid) {
    const cnt = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 9; i++) cnt[grid[i]]++;
    let triple = -1, pairs = 0, pair = -1, bad = false;
    for (let s = 0; s < 9; s++) { if (cnt[s] === 3) { if (triple >= 0) bad = true; triple = s; } else if (cnt[s] === 2) { pairs++; pair = s; } else if (cnt[s] > 3) bad = true; }
    if (bad) return { valid: false };
    const cells = s => grid.map((g, i) => (g === s ? i : -1)).filter(i => i >= 0);
    if (triple >= 0) return pairs === 0 ? { valid: true, cls: "x" + SLOT_MULT[triple], mult: SLOT_MULT[triple], win: triple, cells: cells(triple) } : { valid: false };
    if (pairs === 1) return { valid: true, cls: "casi", mult: 0, win: -1, pair, cells: cells(pair) };
    if (pairs === 0) return { valid: true, cls: "nada", mult: 0, win: -1, cells: [] };
    return { valid: false };
  }

  /* ---- decidir una tarjeta por semilla ---- */
  function outcome(seed) {
    const r = mulberry(hash("rasca|" + seed)), int = n => Math.floor(r() * n);
    const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const k = int(DEN), grid = new Array(9).fill(-1);
    let acc = 0, tier = null; for (const t of TIERS) { if (k < acc + t.n) { tier = t; break; } acc += t.n; }
    const cellsOrder = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    if (tier) {                                           // premio: tres iguales y seis simbolos DISTINTOS entre si y del premiado
      const s = tier.slots[int(tier.slots.length)], others = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8].filter(x => x !== s));
      for (let j = 0; j < 3; j++) grid[cellsOrder[j]] = s;
      for (let j = 0; j < 6; j++) grid[cellsOrder[3 + j]] = others[j];
    } else if (k < WIN_N + CASI_N) {                      // casi: una pareja y siete simbolos distintos
      const tot = CASI_W.reduce((a, b) => a + b, 0); let x = r() * tot, s = 0; while (s < 8 && x >= CASI_W[s]) x -= CASI_W[s++];
      const others = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8].filter(v => v !== s));
      for (let j = 0; j < 2; j++) grid[cellsOrder[j]] = s;
      for (let j = 0; j < 7; j++) grid[cellsOrder[2 + j]] = others[j];
    } else {                                              // nada: los nueve distintos
      const perm = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]); for (let j = 0; j < 9; j++) grid[j] = perm[j];
    }
    const ev = evaluate(grid);
    return Object.assign({ seed, k, tier: tier ? tier.id : null, grid }, ev);
  }

  /* ---- el carrete: nunca los dos ultimos y mas peso a los menos vistos (igual que reelPick de js/adventure.js, pero puro) ---- */
  function reelPick(ids, seen, last, rnd) {
    const pool = ids.filter(id => !last.includes(id)), min = Math.min(...pool.map(id => seen[id] || 0)), w = pool.map(id => 1 / (1 + (seen[id] || 0) - min));
    let x = rnd() * w.reduce((a, b) => a + b, 0), i = 0; while (i < pool.length - 1 && x >= w[i]) x -= w[i++];
    return pool[i];
  }

  return { DEN, TIERS, SLOT_MULT, CASI_N, CASI_W, WIN_N, NADA_N, hash, mulberry, evaluate, outcome, reelPick };
});
