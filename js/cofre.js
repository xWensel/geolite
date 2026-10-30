/* Cofre del jefe (v0.3.227): el cofre dibujado de cada jefe de los actos I y II (y los cinco de banderas) y el telon donde se abre.
   Se dibuja por codigo en una rejilla nativa de 64x64: media tapa y se espeja (simetria exacta), contorno indigo #1d0a3d de 1 px por fuera y solo
   colores de geolite40. Un cofre = madera + herrajes + emblema de la placa + color de la luz de dentro (BOSSES). 7 fotogramas: 0 cerrado, 1 rendija,
   2-4 la tapa en vuelo, 5 abierto, 6 rebote. La clave de cada cofre es la del combo del jefe (run.chalKey). */
(function () {
  "use strict";
  const A = window.AIQ;
const W = 64, INK = "#1d0a3d";
const GOLD = ["#fdd742", "#f5a623", "#c46a1b"], SILVER = ["#f3f0fa", "#c9cde0", "#8a8fa8"], IRON = ["#b6bbb8", "#8a8fa8", "#5c565b"],
  TEAL = ["#5ef2df", "#0dbeaf", "#08787f"], RUST = ["#f5a623", "#c46a1b", "#6e3414"],
  PINK = ["#ff6b5e", "#e5408f", "#a8142e"], BLUE = ["#7ac8ff", "#1689fb", "#0c60d3"];
const OAK = ["#c46a1b", "#b06a34", "#6e3414", "#3c240a"];
const NAVY = ["#6e40c4", "#4a1d96", "#301252", "#1d0a3d"],
  MAGENTA = ["#ff6b5e", "#e5408f", "#a8142e", "#301252"], SAND = ["#c6b497", "#a78f78", "#8f7467", "#6e3414"],
  CREAM = ["#ffd3b6", "#f2a07c", "#c4614a", "#6e3414"], REDW = ["#ff6b5e", "#e8283a", "#a8142e", "#301252"],
  STONE = ["#b6bbb8", "#91887a", "#6b747d", "#5c565b"], CYANW = ["#5ef2df", "#0dbeaf", "#08787f", "#301252"],
  SILVW = ["#f3f0fa", "#c9cde0", "#8a8fa8", "#6b747d"], FELT = ["#3fb54a", "#136b3e", "#0a0a0c", "#0a0a0c"],
  MOSS = ["#a6e05a", "#3fb54a", "#136b3e", "#3c240a"], FOGW = ["#f3f0fa", "#c9cde0", "#8a8fa8", "#6b747d"],
  BLUEW = ["#7ac8ff", "#1689fb", "#0c60d3", "#301252"], DARKN = ["#3a2f58", "#301252", "#1d0a3d", "#0a0a0c"],
  GREYW = ["#91887a", "#6b747d", "#5c565b", "#3a2f58"];

/* emblemas de 8x9 (# = tinta, a = acento) */
const GL = {
  bulb:   ["..####..", ".#....#.", "#......#", "#......#", ".#....#.", "..#..#..", "..####..", "..#..#..", "...##..."],
  spiral: [".######.", "#......#", "#.####.#", "#.#..#.#", "#.#.##.#", "#.#....#", "#.######", "#.......", ".#######"],
  land:   ["..###...", ".#####..", ".######.", "..######", ".#######", "..#####.", "...####.", "....##..", ".....#.."],
  eye:    ["........", "..####..", ".##..##.", "##.aa.##", ".##..##.", "..####..", "........", "#.#.#.#.", ".#.#.#.#"],
  moon:   ["..####..", ".####...", "####..#.", "####.###", "####..#.", "####....", ".####...", "..####..", "........"],
  zz:     ["#####...", "..##....", ".##.....", "#####...", ".....###", "......#.", ".....#..", ".....###", "........"],
  bell:   ["...##...", "..####..", ".######.", ".######.", ".######.", "########", "........", "...aa...", "...aa..."],
  crack:  ["...##...", "..##....", "...##...", "....##..", "...##...", "..##....", "...##...", "....##..", "...##..."],
  glass:  ["########", "#......#", "#..#...#", "#.#.#..#", "#...#..#", "#..#.#.#", "#......#", "#......#", "########"],
  flip:   ["########", ".######.", "..####..", "...##...", "...##...", "..####..", ".######.", "########", "........"],
  spade:  ["...##...", "..####..", ".######.", "########", "########", "########", ".##aa##.", "...aa...", "..####.."],
  drop:   ["...##...", "...##...", "..####..", ".######.", "########", "########", "########", ".######.", "..####.."],
  cloud:  ["........", "...##...", "..####.#", ".#######", "########", "########", ".######.", "........", "........"],
  globe:  ["..####..", ".#.##.#.", "#..##..#", "########", "#..##..#", ".#.##.#.", "..####..", "........", "........"],
  flag:   ["#.......", "######..", "#######.", "#aaaaa#.", "#aaaaa..", "#.......", "#.......", "#.......", "#......."],
  speaker: ["...#....", "..##....", "####.#.#", "####..#.", "####.#.#", "..##....", "...#....", "........", "........"]
};

function Grid() { return { c: new Array(W * W).fill(null), t: new Array(W * W).fill("") }; }
function put(g, x, y, c, t) { if (x < 0 || y < 0 || x >= W || y >= W) return; const i = y * W + x; g.c[i] = c; g.t[i] = t || ""; }
function Rm(g, x0, y0, x1, y1, c, t) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { put(g, x, y, c, t); put(g, W - 1 - x, y, c, t); } }
function Rs(g, x0, y0, x1, y1, c, t) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(g, x, y, c, t); }
const at = (g, x, y) => g.c[y * W + x], tg = (g, x, y) => g.t[y * W + x];

/* tapa: x 9..54, h filas desde top. mode front (cara de fuera) | back (abierta hacia atras, borde visible) | edge (de canto) */
function lid(g, P, top, h, mode) {
  const w = P.wood, m = P.metal, INS = mode === "edge" ? [2, 1, 0, 0] : [6, 3, 2, 1, 1];
  for (let i = 0; i < h; i++) {
    const ins = i < INS.length ? INS[i] : 0, y = top + i, x0 = 9 + ins, x1 = 54 - ins;
    let c = w[1];
    if (i === 0 || i === 1) c = w[0];
    if (mode === "front" && i === h - 1) c = w[2];
    if (mode === "back" && i === h - 1) c = P.edge;
    if (mode === "edge" && i === h - 1) c = w[2];
    Rs(g, x0, y, x1, y, c, "w");
  }
  if (mode === "front" && h >= 10) {
    [Math.round(h * 0.47), Math.round(h * 0.76)].forEach(k => { Rs(g, 10, top + k, 53, top + k, w[3], "w"); Rs(g, 10, top + k + 1, 53, top + k + 1, w[0], "w"); });
  }
  if (mode === "back" && h >= 8) { const k = Math.round(h * 0.5); Rs(g, 10, top + k, 53, top + k, w[2], "w"); }
  /* correas: laterales (5) y central (8), recortadas a la forma de la tapa */
  const SIDE = [m[1], m[0], m[1], m[1], m[2]], CEN = [m[2], m[1], m[0], m[0]];
  for (let i = 0; i < h; i++) {
    const y = top + i;
    SIDE.forEach((c, k) => { if (tg(g, 9 + k, y) === "w") { put(g, 9 + k, y, c, "m"); put(g, 54 - k, y, c, "m"); } });
    CEN.forEach((c, k) => { if (tg(g, 28 + k, y) === "w") { put(g, 28 + k, y, c, "m"); put(g, 35 - k, y, c, "m"); } });
  }
  if (P.lidDeco) P.lidDeco(g, P, top, h, mode);
}

/* cuerpo: friso metalico y 16 filas de tablas, esquineras, base */
function body(g, P) {
  const w = P.wood, m = P.metal;
  Rs(g, 9, 36, 54, 51, w[1], "w");
  [41, 47].forEach(y => { Rs(g, 10, y, 53, y, w[3], "w"); Rs(g, 10, y + 1, 53, y + 1, w[0], "w"); });
  Rs(g, 10, 36, 53, 36, w[0], "w");
  /* friso (rim) */
  Rs(g, 8, 32, 55, 32, m[0], "m"); Rs(g, 8, 33, 55, 34, m[1], "m"); Rs(g, 8, 35, 55, 35, m[2], "m");
  /* esquineras */
  const COR = [m[1], m[0], m[1], m[1], m[2]];
  for (let y = 36; y <= 55; y++) COR.forEach((c, k) => { if (y > 51 || true) { put(g, 9 + k, y, c, "m"); put(g, 54 - k, y, c, "m"); } });
  Rm(g, 11, 38, 11, 38, m[2], "m"); Rm(g, 11, 49, 11, 49, m[2], "m");
  /* base */
  Rs(g, 10, 52, 53, 52, m[0], "m"); Rs(g, 10, 53, 53, 54, m[1], "m"); Rs(g, 10, 55, 53, 55, m[2], "m");
  Rs(g, 15, 52, 15, 55, m[2], "m"); Rs(g, 48, 52, 48, 55, m[2], "m");
}

/* placa de cierre con el emblema del jefe y su ojo de cerradura */
function plate(g, P, open) {
  const m = P.metal;
  Rs(g, 26, 29, 37, 45, m[1], "m");
  Rs(g, 27, 29, 36, 30, m[0], "m"); Rs(g, 26, 31, 26, 44, m[0], "m"); Rs(g, 37, 31, 37, 44, m[2], "m");
  Rs(g, 27, 44, 36, 45, m[2], "m");
  [[26, 29], [37, 29], [26, 45], [37, 45]].forEach(([x, y]) => { g.c[y * W + x] = null; g.t[y * W + x] = ""; });
  const gl = GL[P.glyph];
  if (gl) gl.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "#") put(g, 28 + i, 31 + j, INK, "e"); else if (ch === "a") put(g, 28 + i, 31 + j, P.acc || INK, "e"); }));
  const kc = open ? INK : (P.keyGlow || INK);
  Rs(g, 31, 41, 32, 44, kc, "e");
}

/* el hueco entre tapa y friso: se ve el interior; luz = 0..1 llena el fondo de bandas de brillo */
function interior(g, P, y0, y1, luz) {
  if (y1 < y0) return;
  const G = P.glow, rows = y1 - y0 + 1;
  for (let y = y0; y <= y1; y++) {
    const t = rows > 1 ? (y - y0) / (rows - 1) : 1, xl = 12 + Math.round(2 * (1 - t) * Math.min(1, rows / 14)), xr = W - 1 - xl;
    for (let x = xl; x <= xr; x++) {
      let c = "#301252";
      const dx = (x - 31.5) / 21, dy = (y - (y1 + 3)) / (rows + 3), d = Math.sqrt(dx * dx * 0.55 + dy * dy), v = luz * (1.12 - d);
      if (v > 0.8) c = G[3]; else if (v > 0.6) c = G[2]; else if (v > 0.4) c = G[1]; else if (v > 0.2) c = G[0];
      put(g, x, y, c, "i");
    }
    put(g, xl, y, P.wood[2], "w"); put(g, xl + 1, y, P.wood[2], "w"); put(g, xr, y, P.wood[2], "w"); put(g, xr - 1, y, P.wood[2], "w");
  }
}

function outline(g) {
  const add = [];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    if (at(g, x, y)) continue;
    if ((x > 0 && at(g, x - 1, y)) || (x < W - 1 && at(g, x + 1, y)) || (y > 0 && at(g, x, y - 1)) || (y < W - 1 && at(g, x, y + 1))) add.push([x, y]);
  }
  add.forEach(([x, y]) => put(g, x, y, INK, "o"));
}

/* fotogramas: 0 cerrado, 1 entornado (rendija de luz), 2 abre, 3 casi, 4 de canto, 5 abierto, 6 rebote.
   luz: 0..1 el brillo del interior (animacion aparte) */
const FR = {
  0: { top: 14, h: 18, mode: "front" },
  1: { top: 12, h: 18, mode: "front", gap: [30, 31] },
  2: { top: 8, h: 14, mode: "front", gap: [22, 31] },
  3: { top: 5, h: 9, mode: "front", gap: [15, 31] },
  4: { top: 3, h: 4, mode: "edge", gap: [8, 31] },
  5: { top: 4, h: 12, mode: "back", gap: [17, 31] },
  6: { top: 2, h: 13, mode: "back", gap: [16, 31] }
};
function render(P, f, luz, opts) {
  const g = Grid(), F = FR[f];
  opts = opts || {};
  body(g, P);
  if (F.gap) interior(g, P, F.gap[0], F.gap[1], f === 1 ? 1 : (luz == null ? 0.25 : luz));
  lid(g, P, F.top, F.h, F.mode);
  plate(g, P, f >= 2);
  if (P.post) P.post(g, P, f);
  outline(g);
  return g;
}

function paint(cv, g, flash) {
  cv.width = W; cv.height = W;
  const x = cv.getContext("2d"), im = x.createImageData(W, W);
  for (let i = 0; i < W * W; i++) {
    const c = g.c[i]; if (!c) continue;
    const r = parseInt(c.slice(1, 3), 16), gg = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
    im.data[i * 4] = r; im.data[i * 4 + 1] = gg; im.data[i * 4 + 2] = b; im.data[i * 4 + 3] = 255;
    if (flash && g.t[i] !== "o") { const k = flash; im.data[i * 4] = Math.min(255, r + (255 - r) * k); im.data[i * 4 + 1] = Math.min(255, gg + (255 - gg) * k); im.data[i * 4 + 2] = Math.min(255, b + (255 - b) * k); }
  }
  x.putImageData(im, 0, 0);
}

/* ---------------- adornos por jefe ---------------- */
const zig = (g, pts, c, tag) => { for (let k = 0; k < pts.length - 1; k++) { let [x0, y0] = pts[k], [x1, y1] = pts[k + 1]; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); if (tag.includes(tg(g, x, y))) put(g, x, y, c, tg(g, x, y)); } } };
const DECO = {
  blind: { lid(g, P, top, h, mode) { if (mode !== "front") return; const y0 = top + 6; Rs(g, 9, y0, 54, y0 + 4, "#f3f0fa", "c"); Rs(g, 9, y0 + 4, 54, y0 + 4, "#c9cde0", "c"); Rs(g, 9, y0, 54, y0, "#c9cde0", "c"); Rs(g, 25, y0 - 1, 38, y0 + 5, "#c9cde0", "c"); Rs(g, 26, y0, 37, y0 + 4, "#f3f0fa", "c"); } },
  onecont: { lid(g, P, top, h, mode) { if (mode !== "front") return; const B = ["...####...", ".########.", "##########", "##########", ".#########", "..########", "...#####..", "....###..."]; B.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === "#") { const x = 15 + i, y = top + 5 + j; if (tg(g, x, y) === "w") put(g, x, y, "#3fb54a", "w"); } })); } },
  shuffled: { lid(g, P, top, h, mode) { if (mode !== "front") return; [[15, "#e8283a"], [22, "#1d0a3d"], [39, "#e8283a"], [46, "#1d0a3d"]].forEach(([x, c]) => { Rs(g, x, top + 5, x + 3, top + 12, "#f3f0fa", "c"); Rs(g, x + 1, top + 7, x + 2, top + 10, c, "c"); }); } },
  dirty: { post(g, P, f) { const D = [[13, 4], [17, 2], [22, 5], [41, 3], [46, 5], [50, 2]]; D.forEach(([x, l]) => { for (let k = 0; k < l; k++) { const y = 36 + k; if (tg(g, x, y) === "w") put(g, x, y, k === l - 1 ? "#a6e05a" : "#3fb54a", "w"); } }); } },
  fourth: { post(g, P, f) { zig(g, [[31, 29], [27, 24], [29, 19], [25, 15]], "#f3f0fa", "wm"); zig(g, [[32, 29], [37, 25], [35, 20], [40, 16]], "#c9cde0", "wm"); zig(g, [[31, 44], [26, 48], [28, 52]], "#f3f0fa", "wm"); zig(g, [[32, 29], [38, 33], [43, 31]], "#f3f0fa", "wm"); zig(g, [[30, 29], [23, 32], [18, 30]], "#c9cde0", "wm"); } },
  quake: { post(g, P, f) { zig(g, [[18, 36], [21, 41], [17, 46], [21, 51]], "#1d0a3d", "w"); zig(g, [[45, 37], [42, 42], [46, 47]], "#1d0a3d", "w"); } },
  pix: { post(g, P, f) { const T = ["#e8283a", "#1689fb", "#fdd742", "#3fb54a"]; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (tg(g, x, y) === "w") g.c[y * W + x] = T[(((x >> 2) + (y >> 2)) % 4 + 4) % 4]; } },
  neon: { post(g, P, f) { for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (tg(g, x, y) === "m") { const c = g.c[y * W + x]; g.c[y * W + x] = c === P.metal[0] ? "#ffffff" : c; } } },
  fog: { post(g, P, f) { const D = [[12, 22], [34, 40], [20, 46], [44, 28]]; D.forEach(([x, y]) => { Rs(g, x, y, x + 8, y + 1, "#f3f0fa", "c"); Rs(g, x + 2, y - 1, x + 6, y - 1, "#f3f0fa", "c"); }); } }
};

/* los 17 cofres: cada jefe que da cofre (actos I y II) y los 5 de banderas */
const BOSSES = [
  { id: "blackout",  wood: ["#5c565b", "#3a2f58", "#301252", "#0a0a0c"], metal: IRON, edge: "#8a8fa8", glyph: "bulb", acc: INK, glow: ["#3a2f58", "#fdd742", "#fff3b0", "#ffffff"], keyGlow: "#fdd742" },
  { id: "dizzy",  wood: MAGENTA, metal: GOLD, edge: "#ffd3b6", glyph: "spiral", acc: INK, glow: ["#a8142e", "#e5408f", "#ff6b5e", "#fff3b0"] },
  { id: "onecont",  wood: SAND, metal: TEAL, edge: "#ffd3b6", glyph: "land", acc: INK, glow: ["#08787f", "#0dbeaf", "#5ef2df", "#fff3b0"], lid: "onecont" },
  { id: "blind",  wood: DARKN, metal: SILVER, edge: "#8a8fa8", glyph: "eye", acc: INK, glow: ["#6b747d", "#c9cde0", "#f3f0fa", "#ffffff"], lid: "blind" },
  { id: "nightfall",  wood: NAVY, metal: SILVER, edge: "#9c7ce6", glyph: "moon", acc: INK, glow: ["#4a1d96", "#6e40c4", "#9c7ce6", "#f3f0fa"] },
  { id: "siesta",  wood: CREAM, metal: GOLD, edge: "#fff3b0", glyph: "zz", acc: INK, glow: ["#f2a07c", "#ffd3b6", "#fff3b0", "#ffffff"] },
  { id: "falsealarm",  wood: REDW, metal: SILVER, edge: "#ffd3b6", glyph: "bell", acc: "#fdd742", glow: ["#a8142e", "#e8283a", "#ff6b5e", "#fff3b0"] },
  { id: "quakehall",  wood: STONE, metal: RUST, edge: "#c6b497", glyph: "crack", acc: INK, glow: ["#6e3414", "#c46a1b", "#f5a623", "#fff3b0"], post: "quake" },
  { id: "fourthwall",  wood: CYANW, metal: SILVER, edge: "#c9cde0", glyph: "glass", acc: INK, glow: ["#08787f", "#0dbeaf", "#5ef2df", "#ffffff"], post: "fourth" },
  { id: "mirror",  wood: SILVW, metal: BLUE, edge: "#ffffff", glyph: "flip", acc: INK, glow: ["#8a8fa8", "#c9cde0", "#f3f0fa", "#ffffff"] },
  { id: "shuffled",  wood: FELT, metal: GOLD, edge: "#a6e05a", glyph: "spade", acc: "#e8283a", glow: ["#136b3e", "#3fb54a", "#a6e05a", "#fff3b0"] },
  { id: "dirty",  wood: MOSS, metal: RUST, edge: "#a6e05a", glyph: "drop", acc: INK, glow: ["#136b3e", "#3fb54a", "#a6e05a", "#fff3b0"], post: "dirty" },
  { id: "flagfog",  wood: FOGW, metal: IRON, edge: "#ffffff", glyph: "cloud", acc: INK, glow: ["#8a8fa8", "#c9cde0", "#f3f0fa", "#ffffff"], post: "fog" },
  { id: "flagworld",  wood: BLUEW, metal: SILVER, edge: "#c9cde0", glyph: "globe", acc: INK, glow: ["#0c60d3", "#1689fb", "#7ac8ff", "#ffffff"] },
  { id: "flagneon",  wood: DARKN, metal: PINK, edge: "#e5408f", glyph: "flag", acc: "#5ef2df", glow: ["#e5408f", "#5ef2df", "#ffffff", "#ffffff"], post: "neon" },
  { id: "flagpix",  wood: OAK, metal: IRON, edge: "#f3f0fa", glyph: "flag", acc: "#e8283a", glow: ["#1689fb", "#fdd742", "#e8283a", "#ffffff"], post: "pix" },
  { id: "flagmute",  wood: GREYW, metal: IRON, edge: "#b6bbb8", glyph: "speaker", acc: INK, glow: ["#3a2f58", "#6b747d", "#b6bbb8", "#f3f0fa"] }
];
  /* ---- los cofres por jefe (clave = la del combo de js/challenges.js) y uno de reserva con la madera y el oro de siempre ---- */
  const BY = {};
  BOSSES.forEach((b, i) => { b.i = i; BY[b.id] = b; b.P = { wood: b.wood, metal: b.metal, edge: b.edge, glyph: b.glyph, acc: b.acc, glow: b.glow, keyGlow: b.keyGlow }; const l = DECO[b.lid], p = DECO[b.post]; if (l) b.P.lidDeco = l.lid; if (p) b.P.post = p.post; });
  BY.default = { id: "default", i: 3, P: { wood: OAK, metal: GOLD, edge: "#f2a07c", glyph: null, glow: ["#c46a1b", "#f5a623", "#fdd742", "#fff3b0"] } };
  const of = key => BY[key] || BY.default;
  const $ = id => document.getElementById(id), wait = ms => new Promise(r => setTimeout(r, ms));

  /* un cofre vivo: su lienzo de 64x64, el fotograma, la luz de dentro (0..1,3) y el destello de sus pixeles */
  function Chest(cv, key) { this.cv = cv; this.P = of(key).P; this.f = 0; this.luz = 0.25; this.fl = 0; this.draw(); }
  Chest.prototype.draw = function () { paint(this.cv, render(this.P, this.f, this.luz), this.fl); };
  Chest.prototype.set = function (o) { Object.assign(this, o); this.draw(); };

  /* el cofre como imagen suelta (el chip del Campamento) */
  function url(key, f, luz) { const cv = document.createElement("canvas"); paint(cv, render(of(key).P, f, luz == null ? 0.25 : luz), 0); return cv.toDataURL("image/png"); }

  const SKIP = "Saltar|Skip|Passer|Pular|Überspringen|Salta||跳过|건너뛰기|スキップ|Пропустить|Pomiń";
  const PLAQUE = "Cofre de «{t}»|Chest of “{t}”|Coffre de « {t} »|Baú de “{t}”|Truhe von „{t}“|Forziere di «{t}»||“{t}”的宝箱|‘{t}’의 보물상자|「{t}」の宝箱|Сундук «{t}»|Skrzynia „{t}”";

  /* el telon del cofre: el veredicto se retira y queda el cofre solo sobre la mesa. o = { key, tag, name, tier (1 justa, 2 holgada, 3 aplastante),
     stuck (el primer clic se atasca), onStuck, then } */
  function open(o) {
    const C = A.core, S = C.S, key = BY[o.key] ? o.key : "default", D = A.dealer;
    C.dialog(`<div class="cf-tel" id="cfTel" style="--cfg:${of(key).P.glow[2]}">
      <div class="cf-pool" id="cfPool"></div>
      <div class="cf-main"><div class="cf-plaque"><span class="gx-eyb tag">${o.tag || ""}</span>${o.name ? `<h2 class="gx-t-m">${A.pick6(PLAQUE).replace("{t}", o.name)}</h2>` : ""}</div>
        <div class="cf-slot" id="cfSlot"><canvas id="cfCv" width="64" height="64"></canvas><img class="cf-hand" id="cfHand" src="assets/icons/vivo_hand.webp" alt=""></div>
        <div class="go2-wrap"><button class="gx-btn pri" id="cfGo" type="button" data-primary><span>${A.T("Abrir el cofre del jefe", "Open the boss chest")}</span>${A.gala.keyHint("Enter", "a")}</button></div></div>
      <div class="gx-vd-dealer cf-dealer" id="vdDealer"></div></div>`, "tablewrap");
    const cv = $("cfCv"), ch = new Chest(cv, key), hand = $("cfHand"), pool = $("cfPool"), tel = $("cfTel");
    if (D && D.on) D.anchor($("vdDealer"));
    if (A.cofreFx) A.cofreFx.warm();
    const fit = () => tel.style.setProperty("--s", Math.max(3, Math.min(8, Math.floor((innerHeight - 300) / 64), Math.floor(innerWidth * 0.46 / 64))));
    fit(); const onR = () => { if (cv.isConnected) fit(); else removeEventListener("resize", onR); }; addEventListener("resize", onR);
    const st = { busy: false, stuck: !!o.stuck, done: false, opening: false }, alive = () => cv.isConnected;
    const tier = Math.max(1, Math.min(3, o.tier | 0 || 1)), shake = n => { if (C.jpShake) C.jpShake(n); };

    async function stuckSeq() {
      if (o.onStuck) o.onStuck();
      A.sfx.card(); shake(1); ch.set({ f: 1, luz: 1 }); await wait(120); if (!alive()) return; ch.set({ f: 0, luz: 0.25 });
      hand.animate([{ transform: "scaleY(-1) translateY(120%)", opacity: 0 }, { transform: "scaleY(-1) translateY(0)", opacity: 1 }], { duration: 300, easing: "ease-out", fill: "forwards" });
      await wait(300); if (!alive()) return; A.sfx.deny(); shake(2);
      const px = S && S.reduce ? 0 : parseFloat(getComputedStyle(tel).getPropertyValue("--s")) || 4;
      hand.animate([{ transform: "scaleY(-1) translateY(0)" }, { transform: `scaleY(-1) translateY(${-px}px)` }, { transform: "scaleY(-1) translateY(0)" }, { transform: `scaleY(-1) translateY(${-px}px)` }, { transform: "scaleY(-1) translateY(0)" }], { duration: 420, fill: "forwards" });
      if (D && D.chestStuck) D.chestStuck();
      await wait(2200); if (!alive()) return;
      hand.animate([{ transform: "scaleY(-1) translateY(0)", opacity: 1 }, { transform: "scaleY(-1) translateY(120%)", opacity: 0 }], { duration: 260, easing: "ease-in", fill: "forwards" }); await wait(300);
    }
    /* la apertura (js/cofre-fx.js): carga, golpe, estallido con la firma del jefe, pico segun el margen y remate. Pulsar durante la apertura la salta;
       al acabar el cofre queda abierto y espera tu pulsacion (Enter, A o clic) para pasar al Campamento */
    let fx = null, hap = [];
    const lab = txt => { const b = $("cfGo"), s = b && b.querySelector("span"); if (s) s.textContent = txt; };
    function finish() { hap.forEach(clearTimeout); hap = []; st.opening = false; st.done = true; st.busy = false; lab(A.T("Al campamento", "To camp")); const b = $("cfGo"); if (b) b.focus({ preventScroll: true }); }
    function openSeq() {
      pool.style.opacity = 0;
      try {
        fx = A.cofreFx.create({ tel, slot: $("cfSlot"), canvas: cv, key, tier, onEnd: finish });
        st.opening = true; lab(A.pick6(SKIP)); fx.play();
        fx.T.W.forEach((w, k) => hap.push(setTimeout(() => { if (A.haptic && A.haptic.jackpot) A.haptic.jackpot(Math.min(3, k + 1)); }, (fx.T.hit + fx.T.hs + w) * 1000)));
        return true;
      } catch (e) { if (fx) fx.dispose(); fx = null; st.opening = false; return false; }
    }
    async function go() {
      if (st.opening) { if (fx) fx.skip(); return; }
      if (st.done) { if (fx) fx.dispose(); if (alive()) o.then(); return; }
      if (st.busy || !alive()) return; st.busy = true;
      if (st.stuck) { st.stuck = false; await stuckSeq(); st.busy = false; const b = $("cfGo"); if (b) b.focus({ preventScroll: true }); return; }
      if (!openSeq()) { st.busy = false; st.done = true; o.then(); }
    }
    $("cfGo").onclick = go;
    tel.addEventListener("click", e => { if (st.opening && !e.target.closest("button")) go(); });
  }
  A.cofre = { GL, render, of, BOSSES, open, has: key => !!BY[key], url, paint: (cv, key, f, luz) => paint(cv, render(of(key).P, f || 0, luz == null ? 0.25 : luz), 0) };
})();
