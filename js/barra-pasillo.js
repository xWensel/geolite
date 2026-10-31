/* Geolite - EL PASILLO de La Barra de la casa (v0.4.35): el salon donde eliges mesa, dibujado entero por codigo en pixel art (640x360 a x2) con luz real por pixel.
   A.barraHall(cv, X) lo monta en un contenedor; X le da las mesas (X.list), los nombres de sala (X.rooms), la carta real de cada mesa (X.card / X.wire) y los textos. Devuelve
   cv.__pasillo (goTo, refreshCard, dispose). Ver la maqueta «La Barra de la casa» (decision D1 + v4). */
window.AIQ = window.AIQ || {};
(function (A) {
/* ---------- EL PASILLO PREMIUM (La Barra de la casa) ----------
   Motor de render pixel art por codigo: lienzo de 640x360 escalado x2 (pixelated), sprites generados una vez con ImageData, suelo en perspectiva
   verdadera (cada fila a su escala), iluminacion por pixel (ambiente + conos, charcos y lavados de pared de cada lampara + apliques) cuantizada a
   8 bandas con tramado Bayer, capa emisiva con bloom y bruma de los conos, paralaje en capas, publico, cortinas, neon y reflejos.
   Navegacion: flechas, arrastre con inercia y ajuste a la mesa, rueda, clic en mesa, Inicio/Fin. */
A.barraHall = function (cv, X) {
  const ROOMC = { ruletas: { w1: "#1d4a35", w2: "#102e21", sign: "#6dffb0" }, cartas: { w1: "#5a1a2c", w2: "#34101b", sign: "#ff8aa8" }, dados: { w1: "#13555f", w2: "#0a333b", sign: "#7cecff" }, rascas: { w1: "#6a4a14", w2: "#3e2a0a", sign: "#ffd060" } };
  const dots = () => { let r = "", prev = ""; X.list.forEach((g, i) => { if (g.room !== prev) { r += `<span class="rl">${X.rooms[g.room]}</span>`; prev = g.room; } r += `<button type="button" class="dt" data-i="${i}" style="--c1:${g.c[0]}" aria-label="${g.n}"></button>`; }); return r; };
  "use strict";
  const SZ = (X.size && X.size()) || { w: 640, h: 360 }, IW = SZ.w, IH = Math.max(360, SZ.h), OY = IH - 360, HW = IW >> 1;   // lienzo del tamano de la ventana; OY = filas de pared extra por arriba (el suelo y las mesas siguen pegados abajo)
  const CJK = (getComputedStyle(document.documentElement).getPropertyValue("--cjk") || "").trim(), IS_CJK = /Fusion/.test(CJK);
  const FJ = IS_CJK ? 12 : 15, FF = "'Jersey 15', 'Pixelify Sans', " + (IS_CJK ? CJK + ", " : "") + "sans-serif", NS = IS_CJK ? 12 : 8, NF = "'Silkscreen', 'Geolite Cyrillic Caps', 'Pixelify Sans', " + (IS_CJK ? CJK + ", " : "") + "monospace";   // placas (Jersey) y neones (Silkscreen)
  /* ====================== utilidades ====================== */
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const HX = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
  const rgb = c => "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
  const hash = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s | 0) + 7, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sprite = (w, h, fn) => { const c = mk(w, h), x = c.getContext("2d"), id = x.createImageData(w, h), d = id.data;
    const set = (px, py, col, a) => { px |= 0; py |= 0; if (px < 0 || py < 0 || px >= w || py >= h) return; const i = (py * w + px) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = a === undefined ? 255 : a; };
    fn(set, w, h, d); x.putImageData(id, 0, 0); return c; };
  /* contorno indigo de 1 px por fuera de lo dibujado (como todo el arte del juego) */
  const outline = (c, ink) => { const w = c.width, h = c.height, x = c.getContext("2d"), id = x.getImageData(0, 0, w, h), d = id.data, add = []; for (let y = 0; y < h; y++) for (let px = 0; px < w; px++) { const i = (y * w + px) * 4; if (d[i + 3]) continue; if ((px > 0 && d[i - 1]) || (px < w - 1 && d[i + 7]) || (y > 0 && d[i - w * 4 + 3]) || (y < h - 1 && d[i + w * 4 + 3])) add.push(i); } add.forEach(i => { d[i] = ink[0]; d[i + 1] = ink[1]; d[i + 2] = ink[2]; d[i + 3] = 255; }); x.putImageData(id, 0, 0); return c; };
  const K = { ink: HX("#1d0a3d"), wd0: HX("#3c240a"), wd1: HX("#6e3414"), wd2: HX("#b06a34"), br0: HX("#3c240a"), br1: HX("#6e3414"), br2: HX("#c46a1b"), br3: HX("#f5a623"), br4: HX("#fff3b0"), by: HX("#fdd742"), cream: HX("#f3f0fa"), cream2: HX("#c9cde0"), red: HX("#a8142e"), red2: HX("#e8283a"), red3: HX("#ff6b5e"), blk: HX("#0a0a0c") };
  const BRASS = [K.br0, K.br1, K.br2, K.br3, K.br4], BRASS_S = [HX("#3a2f58"), HX("#5c565b"), HX("#8a8fa8"), HX("#c9cde0"), HX("#f3f0fa")];
  const BAY = (() => { const m = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21]; return Float32Array.from(m, v => (v + 0.5) / 64); })();
  /* ====================== el mundo ====================== */
  const L = X.list, N = L.length, SP = 136, GAP = 128, FLOOR = 236, BASE = 268, TY = BASE - 98, TOPC = TY + 26;   // TOPC: centro del tapete en pantalla
  const ENTRY_CAM = -30; let wx = 520; L.forEach((g, i) => { if (i && g.room !== L[i - 1].room) wx += GAP; g.px = wx; wx += SP; });
  const CAMMIN = ENTRY_CAM, CAMMAX = L[N - 1].px - HW + 70;
  const roomIds = Object.keys(X.rooms).filter(r => L.some(g => g.room === r));
  const rooms = roomIds.map((r, k) => { const gs = L.filter(g => g.room === r), first = gs[0].px, prevLast = k ? L.filter(g => g.room === roomIds[k - 1]).slice(-1)[0].px : first - 190; return { id: r, c: ROOMC[r], gate: k ? (prevLast + first) / 2 : first - 132 }; });
  const WALLC = { ruletas: [HX("#2c7a56"), HX("#173f2e")], cartas: [HX("#8a2a44"), HX("#431522")], dados: [HX("#1d8294"), HX("#0f4450")], rascas: [HX("#a8742a"), HX("#523714")], hall: [HX("#7a4a1c"), HX("#3a2008")] };
  const LAMPC = { ruletas: ["#3fb54a", "#136b3e", "#fdd742"], cartas: ["#e8283a", "#a8142e", "#fdd742"], dados: ["#0dbeaf", "#08787f", "#5ef2df"], rascas: ["#f5a623", "#c46a1b", "#fdd742"] };
  const LAMPSTYLE = { ruletas: 0, cartas: 1, dados: 2, rascas: 3 };
  /* ====================== sprites ====================== */
  const wallTile = (c1, c2) => sprite(32, 32, (set) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const ax = Math.abs(((x + 16) % 32) - 16) / 16, ay = Math.abs(((y + 16) % 32) - 16) / 16, dia = ax + ay, d2 = Math.abs(Math.abs(((x + 8) % 32) - 16) / 16 + Math.abs(((y + 24) % 32) - 16) / 16 - 1);
    let t = 0; if (Math.abs(dia - 0.5) < 0.075) t = 0.55; if (dia < 0.3 && ((x + y) & 1) === 0) t = 0.4; if (d2 < 0.06) t = 0.32; if (hash(x, y, 3) > 0.92) t += 0.1;
    const base = mix(c1, c2, y / 64); set(x, y, t ? mix(base, mix(c1, [255, 235, 190], 0.6), t * 0.55) : base); } });
  const wainscot = sprite(32, 44, (set) => { for (let y = 0; y < 44; y++) for (let x = 0; x < 32; x++) {
    let c; if (y < 2) c = K.br4; else if (y < 4) c = K.br3; else if (y < 6) c = K.br2; else if (y < 8) c = K.br0; else {
      const inP = x > 3 && x < 28 && y > 13 && y < 40, edge = inP && (x < 6 || x > 25 || y < 16 || y > 37);
      c = inP ? (edge ? K.wd2 : mix(K.wd1, K.wd0, (y - 13) / 36 + hash(x, y, 5) * 0.12)) : mix(K.wd0, K.ink, 0.3); if (inP && (x + y) % 9 === 0 && !edge) c = mix(c, K.wd2, 0.18); }
    set(x, y, c); } });
  /* suelo: marmol en rombos con ribete de laton; textura periodica de 128 x 64 que se proyecta en perspectiva */
  const FT_W = 128, FT_H = 64;
  const floorTex = (() => { const c = sprite(FT_W, FT_H, (set) => { for (let y = 0; y < FT_H; y++) for (let x = 0; x < FT_W; x++) {
    const u = (x % 64) / 64, v = (y % 32) / 32, d = Math.abs(u - 0.5) * 2 + Math.abs(v - 0.5) * 2, dd = Math.abs(d - 1);
    let col = ((x >> 6) + (y >> 5)) & 1 ? HX("#3c1422") : HX("#5a1c30"); if (dd < 0.1) col = mix(K.br1, K.br2, 0.4); else if (dd < 0.17) col = mix(col, K.ink, 0.35); else if (d < 0.5) col = mix(col, HX("#7a2a42"), 0.4);
    if (hash(x, y, 9) > 0.96) col = mix(col, K.br2, 0.25); set(x, y, col); } }); return new Uint32Array(c.getContext("2d").getImageData(0, 0, FT_W, FT_H).data.buffer); })();
  const crowdSprites = [0, 1, 2, 3].map(k => sprite(18, 40, (set) => { const dark = HX("#0a1a12"), rim = HX("#2a5a40"), hat = HX("#0d2018");
    for (let y = 15; y < 40; y++) { const hw = 4.5 + (y - 15) * 0.13; for (let x = 0; x < 18; x++) { const dx = Math.abs(x + 0.5 - 9); if (dx <= hw) set(x, y, dx > hw - 1.3 && x < 9 ? rim : dark); } }
    const hr = k === 1 ? 4.8 : 4.4; for (let y = 4; y < 17; y++) for (let x = 0; x < 18; x++) { const dx = x + 0.5 - 9, dy = y + 0.5 - 11, e = dx * dx + dy * dy; if (e <= hr * hr) set(x, y, dx < -1.5 && dy < 0.5 ? rim : dark); }
    if (k === 0) { for (let x = 3; x < 15; x++) set(x, 7, hat); for (let y = 3; y < 7; y++) for (let x = 6; x < 12; x++) set(x, y, hat); }
    if (k === 2) { for (let x = 4; x < 14; x++) set(x, 7, hat); for (let y = 0; y < 7; y++) for (let x = 6; x < 12; x++) set(x, y, hat); }
    if (k === 1) { for (let y = 3; y < 8; y++) for (let x = 5; x < 13; x++) set(x, y, rim); }
    if (k === 3) { for (let x = 4; x < 14; x++) set(x, 6, hat); for (let y = 2; y < 6; y++) for (let x = 7; x < 11; x++) set(x, y, hat); } }));
  const curtain = sprite(46, IH, (set, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const f = Math.sin(x * 0.7) * 0.55 + Math.sin(x * 0.31 + 1.2) * 0.35, t = clamp((f + 1) / 2, 0, 1);
    let c = t > 0.82 ? K.red3 : t > 0.5 ? K.red2 : t > 0.22 ? K.red : mix(K.red, [0, 0, 0], 0.5); if (x > w - 6) c = mix(c, [0, 0, 0], (x - (w - 6)) / 6 * 0.7); set(x, y, c); }
    for (let x = 0; x < w; x++) { set(x, 0, K.br4); set(x, 1, K.br3); set(x, 2, K.br2); set(x, 3, K.br1); } });
  /* ---- lamparas: una por sala (Tiffany, banquero, globo opalino, pagoda) ---- */
  function lampSprite(style, cols) {
    const W = 60, H = 62, CX = 30, glass = cols.map(HX), dim = v => mix(v, [0, 0, 0], 0.52), shape = [];
    const put = (x, y, o) => { if (x >= 0 && y >= 0 && x < W && y < H) shape[y * W + x] = o; }, br = (x, y, l) => put(x, y, { k: "brass", l });
    for (let x = 24; x < 36; x++) { br(x, 0, 3); br(x, 1, 2); } for (let x = 26; x < 34; x++) br(x, 2, 1); for (let y = 3; y < 12; y++) { br(29, y, 3); br(30, y, 2); } for (let y = 6; y < 10; y++) for (let x = 26; x < 34; x++) { const dx = x - 29.5, dy = y - 7.5; if (dx * dx + dy * dy < 9) br(x, y, dx < 0 ? 4 : 2); }
    if (style === 0) {
      const cx = CX, by = 40, rx = 28, ry = 27;
      for (let y = 10; y <= by; y++) for (let x = 0; x < W; x++) { const dx = (x + 0.5 - cx) / rx, dy = (by - y - 0.5) / ry, r = Math.sqrt(dx * dx + dy * dy); if (r > 1 || dy < 0) continue; const wd = Math.sqrt(Math.max(0.0001, 1 - dy * dy)), phi = Math.asin(clamp(dx / wd, -1, 1)), s = (phi / Math.PI + 0.5) * 9, seg = Math.floor(s), fr = s - seg, ring = dy < 0.26 ? 0 : dy < 0.5 ? 1 : dy < 0.74 ? 2 : 3;
        const lead = fr < 0.08 || fr > 0.92 || Math.abs(dy - 0.26) < 0.035 || Math.abs(dy - 0.5) < 0.035 || Math.abs(dy - 0.74) < 0.035 || r > 0.955 || dy > 0.93; put(x, y, lead ? { k: "lead" } : { k: "glass", i: (seg + ring) % 3, t: clamp(0.95 - dy * 0.45 - (x < cx ? -0.14 : 0.06), 0.15, 1) }); }
      for (let x = 1; x < W - 1; x++) { for (let y = 40; y < 42; y++) br(x, y, y === 40 ? 4 : 3); br(x, 42, 2); if ((x % 6) < 4) br(x, 43, 1); if (x % 6 === 2) br(x, 44, 3); }
    } else if (style === 1) {
      for (let y = 14; y <= 38; y++) { const t = (y - 14) / 24, hw = 8 + 21 * Math.pow(t, 0.75); for (let x = 0; x < W; x++) { const dx = x + 0.5 - CX; if (Math.abs(dx) > hw) continue; const band = Math.floor((dx + hw) / (2 * hw) * 8), edge = Math.abs(Math.abs(dx) - hw) < 1.3, lead = edge || ((dx + hw) * 8 / (2 * hw)) % 1 < 0.1 || y === 38; put(x, y, lead ? { k: "lead" } : { k: "glass", i: band % 2 ? 0 : 1, t: clamp(1 - t * 0.55 - (dx < 0 ? 0 : 0.12), 0.2, 1) }); } }
      for (let x = 2; x < W - 2; x++) { br(x, 39, 4); br(x, 40, 3); br(x, 41, 2); } for (let x = 4; x < W - 4; x += 3) { const l = 5 + ((x / 3) % 2) * 3; for (let y = 42; y < 42 + l; y++) br(x, y, y === 42 + l - 1 ? 4 : 2); }
    } else if (style === 2) {
      const cx = CX, cy = 33, r0 = 19; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.sqrt(dx * dx + dy * dy); if (r > r0 || y < 16) continue; const u = dx / r0, merid = Math.abs(Math.abs(u) - 0.5) < 0.055 || Math.abs(u) < 0.05 || Math.abs(Math.abs(u) - 0.86) < 0.04, rim = r > r0 - 1.2;
        put(x, y, (merid || rim) ? { k: "lead" } : { k: "glass", i: Math.abs(u) > 0.5 ? 1 : Math.abs(u) > 0.05 ? 0 : 2, t: clamp(0.4 + (-dx * 0.012) + (r0 - r) * 0.03, 0.2, 1) }); }
      for (let y = 11; y < 17; y++) for (let x = 20; x < 40; x++) { const hw = 6 + (y - 11) * 1.1; if (Math.abs(x + 0.5 - CX) <= hw) br(x, y, x < CX ? 4 : 2); } for (let x = 24; x < 36; x++) br(x, 52, 3);
    } else {
      for (let y = 13; y <= 42; y++) { const t = (y - 13) / 29, hw = 2 + 27 * t; for (let x = 0; x < W; x++) { const dx = x + 0.5 - CX; if (Math.abs(dx) > hw) continue; const rib = ((dx + hw) / (2 * hw) * 9) % 1 < 0.1, edge = Math.abs(Math.abs(dx) - hw) < 1.1, tier = ((y - 13) % 9) === 8; put(x, y, (rib || edge || tier) ? { k: "lead" } : { k: "glass", i: Math.floor((dx + hw) / (2 * hw) * 9) % 2 ? 0 : 1, t: clamp(1 - t * 0.5 - (dx < 0 ? 0 : 0.12), 0.2, 1) }); } }
      for (let x = 2; x < W - 2; x++) { br(x, 43, 4); br(x, 44, 3); br(x, 45, 2); } for (let x = 5; x < W - 5; x += 5) { for (let y = 46; y < 50; y++) br(x, y, 3); br(x, 50, 4); br(x + 1, 50, 2); }
    }
    const base = sprite(W, H, (set) => { for (let i = 0; i < shape.length; i++) { const o = shape[i]; if (!o) continue; set(i % W, (i / W) | 0, o.k === "lead" ? K.wd0 : o.k === "brass" ? BRASS[o.l] : dim(glass[o.i])); } });
    const glow = sprite(W, H, (set) => { for (let i = 0; i < shape.length; i++) { const o = shape[i]; if (!o || o.k !== "glass") continue; const x = i % W, y = (i / W) | 0; set(x, y, mix(glass[o.i], [255, 250, 215], clamp(o.t * 0.42 + hash(x, y, 2) * 0.08 - 0.12, 0, 0.55))); } });
    outline(base, K.ink); return { k: style === 2 ? 0.75 : style === 3 ? 0.85 : 0.9, base, glow, w: W, h: H, bulbY: style === 0 ? 44 : style === 1 ? 44 : style === 2 ? 53 : 51, top: 88 };
  }
  /* ---- mesas premium ---- */
  const TW = 128, TH = 112, TCX = 64, TCY = 26, RX = 57, RY = 18;
  function tableSprite(g) {
    const c1 = HX(g.c[0]), c2 = HX(g.c[1]), soon = !!g.soon, B = soon ? BRASS_S : BRASS;
    const felt = [mix(c2, [0, 0, 0], 0.3), c2, mix(c2, c1, 0.5), c1, mix(c1, [255, 255, 255], 0.3)];
    return outline(sprite(TW, TH, (set) => {
      const lath = (cx, y, hw, ramp, grain) => { for (let x = Math.floor(cx - hw); x < Math.ceil(cx + hw); x++) { const t = (x + 0.5 - (cx - hw)) / (2 * hw), idx = t < 0.2 ? 4 : t < 0.42 ? 3 : t < 0.72 ? 2 : t < 0.9 ? 1 : 0; let c = ramp[idx]; if (grain && hash(x, y, 4) > 0.96) c = ramp[Math.max(0, idx - 1)]; set(x, y, c); } };
      const W2 = [K.wd0, K.wd1, K.wd2, mix(K.wd2, K.br3, 0.3), mix(K.wd2, K.br4, 0.35)];
      for (let y = 94; y < 111; y++) for (let x = 0; x < TW; x++) { const dx = (x + 0.5 - TCX) / 33, dy = (y + 0.5 - 102) / 8, e = dx * dx + dy * dy; if (e <= 1) { const l = clamp(-(dx * 0.5 + dy * 0.8), -1, 1); set(x, y, e > 0.72 && dy > 0 ? B[1] : l > 0.5 ? B[4] : l > 0.1 ? B[3] : l > -0.4 ? B[2] : B[1]); } }
      for (let y = 46; y < 100; y++) { let hw, ramp = W2, gr = true;
        if (y < 53) { hw = 11; ramp = B; gr = false; } else if (y < 56) { hw = 15; ramp = B; gr = false; } else if (y < 60) { hw = 10; ramp = B; gr = false; }
        else if (y < 84) { hw = 8 + 4 * Math.sin((y - 60) / 24 * Math.PI); if (y === 67 || y === 68 || y === 75 || y === 76) { hw += 2; ramp = B; gr = false; } }
        else if (y < 88) { hw = 12; ramp = B; gr = false; } else { hw = 12 + (y - 88) * 1.6; ramp = W2; if (y > 94) { ramp = B; gr = false; } }
        lath(TCX, y, hw, ramp, gr); }
      for (let y = TCY; y < TCY + 30; y++) for (let x = 0; x < TW; x++) { const dx = (x + 0.5 - TCX) / RX, dy = (y + 0.5 - TCY - 10) / RY, e = dx * dx + dy * dy; if (e > 1) continue; if (dx * dx + ((y + 0.5 - TCY) / RY) ** 2 <= 1) continue; const t = (x + 0.5 - (TCX - RX)) / (2 * RX), l = clamp(1 - t * 1.15 - (y - TCY) * 0.012, 0, 1); let c = l > 0.7 ? K.wd2 : l > 0.35 ? K.wd1 : K.wd0; if (((x + y) % 5 === 0) && (e > 0.72)) c = mix(c, K.br3, 0.45); set(x, y, c); }
      for (let y = 0; y < 56; y++) for (let x = 0; x < TW; x++) { const dx = x + 0.5 - TCX, dy = y + 0.5 - TCY, eT = (dx / RX) ** 2 + (dy / RY) ** 2; if (eT > 1) continue; const eIn = (dx / 49) ** 2 + (dy / 13.2) ** 2;
        if (eIn <= 0.86) { const gl = 1 - Math.sqrt(eIn) * 0.85 - (dx / 85) - (dy / 30) * 0.4, n = hash(x, y, 1); let idx = gl > 0.8 ? 3 : gl > 0.46 ? 2 : gl > 0.2 ? 1 : 0; if (n > 0.955 && idx < 4) idx++; else if (n < 0.04 && idx > 0) idx--; if (gl > 0.94 && n > 0.5) idx = 4;
          const ring = Math.abs(eIn - 0.52) < 0.022, diam = (Math.abs(dx) < 3 && Math.abs(Math.abs(dy) - 8.6) < 1.5) || (Math.abs(dy) < 1 && Math.abs(Math.abs(dx) - 32) < 3); set(x, y, ring || diam ? mix(felt[idx], K.br3, soon ? 0.15 : 0.62) : felt[idx]); }
        else if (eIn <= 1) set(x, y, mix(felt[0], [0, 0, 0], 0.55));
        else { const nx = dx / RX, ny = dy / RY, l = clamp(-(nx * 0.45 + ny * 0.85), -1, 1); let ci = l > 0.62 ? 4 : l > 0.2 ? 3 : l > -0.3 ? 2 : l > -0.7 ? 1 : 0; if (eT > 0.955) ci = Math.max(0, ci - 1); set(x, y, B[ci]); } }
      for (let a = 0; a < 360; a += 10) { const rad = a * Math.PI / 180, sx = TCX + Math.cos(rad) * 53, sy = TCY + Math.sin(rad) * 15.2; set(Math.round(sx), Math.round(sy), B[4]); set(Math.round(sx), Math.round(sy) + 1, B[0]); }
    }), K.ink);
  }
  function chipStack(set, x, y, n, col) { const dk = mix(col, [0, 0, 0], 0.4), lt = mix(col, [255, 255, 255], 0.35); for (let i = 0; i < n; i++) { const yy = y - i * 3; for (let px = 0; px < 8; px++) { set(x + px, yy, px === 0 || px === 7 ? dk : lt); set(x + px, yy + 1, px % 2 ? K.cream : col); set(x + px, yy + 2, dk); } for (let px = 2; px < 6; px++) set(x + px, yy - 1, lt); } }
  function propSprite(g) { const id = g.id; return sprite(128, 44, (set) => {
    const X = x => (x < 64 ? 64 - Math.round((64 - x) * 0.74) : 64 + Math.round((x - 64) * 0.74)), stacks = specs => specs.forEach(s => chipStack(set, X(s[0]), s[1], s[2], s[3]));
    const die = (x0, y) => { const x = X(x0); for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) set(x + a, y + b, a === 0 || b === 0 || a === 6 || b === 6 ? K.cream2 : K.cream); [[2, 2], [4, 4], [4, 2], [2, 4], [3, 3]].forEach(p => set(x + p[0], y + p[1], K.blk)); };
    const card = (x0, y, r) => { const x = X(x0); for (let a = 0; a < 8; a++) for (let b = 0; b < 11; b++) set(x + a, y + b, a === 0 || b === 0 || a === 7 || b === 10 ? K.cream2 : K.cream); const c = r ? K.red2 : K.blk; [[3, 4], [4, 3], [5, 4], [4, 5], [4, 6]].forEach(p => set(x + p[0], y + p[1], c)); };
    if (id === "dice" || id === "craps") { die(28, 22); die(94, 21); stacks([[16, 30, 3, HX("#e8283a")], [108, 31, 4, HX("#0dbeaf")]]); }
    else if (id === "bj" || id === "vp" || id === "bac") { card(20, 12, 1); card(25, 12, 0); card(30, 13, 1); card(98, 13, 0); card(103, 12, 1); stacks([[12, 32, 3, HX("#e8283a")], [110, 33, 3, HX("#f5a623")]]); }
    else if (id === "cups") { [[26, 18], [42, 21], [88, 19]].map(p => [X(p[0]), p[1]]).forEach(p => { for (let y = 0; y < 12; y++) { const hw = 2 + y * 0.35; for (let x = -6; x <= 6; x++) if (Math.abs(x + 0.5) <= hw) set(p[0] + x, p[1] + y, x < -1 ? K.red3 : x < 2 ? K.red2 : K.red); } }); stacks([[106, 31, 3, HX("#f5a623")]]); }
    else if (id === "rasca") { for (let a = 0; a < 20; a++) for (let b = 0; b < 12; b++) set(X(22) + a, 20 + b, a === 0 || b === 0 || a === 19 || b === 11 ? K.br2 : (a > 3 && a < 16 && b > 3 && b < 8 ? K.br3 : K.cream)); chipStack(set, X(98), 30, 3, HX("#fdd742")); chipStack(set, X(108), 32, 2, HX("#f5a623")); }
    else if (id === "bingo") { [[HX("#e8283a"), 24, 26], [HX("#1689fb"), 34, 28], [HX("#3fb54a"), 94, 26], [HX("#fdd742"), 104, 28]].forEach(b => { for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 16) set(X(b[1]) + x, b[2] + y, x + y < -1 ? mix(b[0], [255, 255, 255], 0.5) : b[0]); }); }
    else if (id === "coin") { chipStack(set, X(22), 32, 4, HX("#fdd742")); chipStack(set, X(100), 30, 3, HX("#fdd742")); }
    else if (id === "wheel") { stacks([[20, 32, 3, HX("#e5408f")], [100, 30, 4, HX("#9c7ce6")]]); }
    else if (id === "plk") { stacks([[20, 32, 4, HX("#0dbeaf")], [100, 30, 3, HX("#e8283a")], [110, 33, 2, HX("#fdd742")]]); }
    else if (id === "globo") { stacks([[20, 32, 3, HX("#7ac8ff")], [100, 30, 4, HX("#e8283a")]]); }
    else { stacks([[20, 32, 4, HX("#e8283a")], [30, 34, 3, K.blk], [100, 30, 4, HX("#3fb54a")], [110, 33, 2, HX("#f5a623")]]); } }); }
  /* atril de laton: cuna para el emblema, poste y base sobre el fieltro */
  const easel = outline(sprite(34, 22, (set) => { for (let x = 3; x < 31; x++) { set(x, 0, K.br4); set(x, 1, K.br3); set(x, 2, K.br2); } set(3, 3, K.br2); set(30, 3, K.br2); for (let y = 3; y < 17; y++) { set(16, y, K.br4); set(17, y, K.br3); set(18, y, K.br1); } for (let x = 6; x < 28; x++) { set(x, 17, x < 17 ? K.br4 : K.br3); set(x, 18, x < 17 ? K.br3 : K.br2); set(x, 19, K.br1); } for (let y = 9; y < 13; y++) for (let x = 14; x < 21; x++) set(x, y, y === 9 ? K.br4 : K.br2); }), K.ink);
  const counter = outline(sprite(236, 54, (set, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const roundL = x < 6 ? Math.sqrt(36 - (6 - x) ** 2) : 6, ok = y > (6 - roundL) * 0.5; if (!ok) continue;
    let c; if (y < 4) c = y === 0 ? K.br4 : y < 2 ? K.br3 : K.br2; else if (y < 9) c = mix(K.wd2, K.br3, 0.3); else { const panel = (x % 38) > 4 && (x % 38) < 34 && y > 13 && y < 48; c = panel ? mix(K.wd1, K.wd0, (y - 13) / 40 + hash(x, y, 8) * 0.1) : K.wd0; if (panel && ((x % 38) < 7 || (x % 38) > 31 || y < 16 || y > 45)) c = K.wd2; if (y > 48) c = K.br1; } set(x, y, c); } }), K.ink);
  const counterProps = (() => { const gl = (set, x, y, col) => { for (let a = 0; a < 6; a++) for (let b = 0; b < 9; b++) { const hw = 2.5 + (8 - b) * 0.12; if (Math.abs(a + 0.5 - 3) <= (b < 4 ? 3 : 1.8)) set(x + a, y + b, b < 3 ? mix(col, [255, 255, 255], 0.5) : a < 2 ? mix(col, [255, 255, 255], 0.3) : col); } };
    return outline(sprite(222, 20, (set) => { [[8, "#fdd742"], [24, "#e8283a"], [40, "#7ac8ff"], [150, "#fdd742"], [166, "#5ef2df"], [182, "#e5408f"]].forEach(([x, c]) => gl(set, x, 10, HX(c)));
      for (let x = 58; x < 82; x++) for (let y = 12; y < 19; y++) set(x, y, y < 14 ? K.br4 : y < 17 ? K.br3 : K.br2); for (let x = 64; x < 76; x++) for (let y = 7; y < 12; y++) set(x, y, x < 69 ? K.br4 : K.br3); set(69, 5, K.br4); set(70, 5, K.br3); }), K.ink); })();
  const bottle = (col, h) => sprite(8, h, (set) => { for (let y = 0; y < h; y++) for (let x = 0; x < 8; x++) { const neck = y < h * 0.35, hw = neck ? 1.6 : 3.4; if (Math.abs(x + 0.5 - 4) > hw) continue; set(x, y, x < 3 ? mix(col, [255, 255, 255], 0.45) : x > 5 ? mix(col, [0, 0, 0], 0.4) : col); } for (let x = 3; x < 6; x++) set(x, 0, K.br3); });
  /* ---- placas y rotulos de neon (necesitan las fuentes) ---- */
  const plaque = {}; let gates = [], neonEntry = null, hallLamp = null; const HALLX = 28;
  const buildText = () => {
    L.forEach(g => { const t = g.n, m = mk(260, 20).getContext("2d"); let fs = FJ; m.font = fs + "px " + FF; while (fs > 9 && m.measureText(t).width > 118) { fs--; m.font = fs + "px " + FF; } const w = (v => v + (v & 1))(Math.min(Math.ceil(m.measureText(t).width) + 14, 132)), pc = mk(w, 15), px = pc.getContext("2d"), B = g.soon ? BRASS_S : BRASS;
      for (let yy = 0; yy < 15; yy++) for (let xx = 0; xx < w; xx++) { const edge = xx === 0 || yy === 0 || xx === w - 1 || yy === 14; px.fillStyle = rgb(edge ? B[1] : yy < 2 ? B[4] : yy > 11 ? B[2] : B[3]); px.fillRect(xx, yy, 1, 1); }
      px.font = m.font; px.textBaseline = "top"; px.textAlign = "center"; px.fillStyle = "#1d0a3d"; px.fillText(t, w / 2, IS_CJK ? 1 : 1 + (15 - fs > 3 ? 1 : 0)); plaque[g.id] = pc; });
    const neon = (txt, col) => { const m = mk(400, 12).getContext("2d"); m.font = NS + "px " + NF; m.letterSpacing = "1px"; const tw = Math.ceil(m.measureText(txt).width), W = tw + 20, H = 21, base = mk(W, H), em = mk(W, H), b = base.getContext("2d"), e = em.getContext("2d"), cc = HX(col);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1, bev = x === 1 || y === 1 || x === W - 2 || y === H - 2, tube = (x === 3 || y === 3 || x === W - 4 || y === H - 4) && x > 2 && y > 2 && x < W - 3 && y < H - 3; b.fillStyle = rgb(edge ? K.ink : bev ? K.br2 : tube ? mix(cc, [0, 0, 0], 0.6) : [10, 20, 15]); b.fillRect(x, y, 1, 1); if (tube) { e.fillStyle = rgb(mix(cc, [255, 255, 255], 0.1)); e.fillRect(x, y, 1, 1); } }
      b.font = e.font = NS + "px " + NF; b.letterSpacing = e.letterSpacing = "1px"; b.textBaseline = e.textBaseline = "top"; const ty = IS_CJK ? 5 : 7; b.fillStyle = rgb(mix(cc, [0, 0, 0], 0.6)); b.fillText(txt, 10, ty); e.fillStyle = rgb(cc); e.fillText(txt, 10, ty); e.fillStyle = "rgba(255,255,255,.6)"; e.fillText(txt, 10, ty - 0.5); return { base, em, w: W, h: H }; };
    hallLamp = lampSprite(1, ["#f5a623", "#c46a1b", "#fdd742"]); gates = rooms.map(r => Object.assign({ x: r.gate }, neon(X.rooms[r.id].toUpperCase() + " ›", r.c.sign))); neonEntry = neon(X.title, "#ffe39a");
  };
  /* ====================== luz precalculada ====================== */
  /* mapa de luz de una lampara (centro en x=0 del mapa), sumado por fotograma con su intensidad: cono, lavado de pared, charco del tapete y charco del suelo */
  const LM = { x0: -110, x1: 111, y0: 96, y1: 306 }, LMW = LM.x1 - LM.x0, LMH = LM.y1 - LM.y0, lampLight = new Float32Array(LMW * LMH);
  (() => { for (let y = LM.y0; y < LM.y1; y++) for (let x = LM.x0; x < LM.x1; x++) { let v = 0;
    const t = (y - 128) / 150; if (t > 0 && t < 1) { const hw = 11 + 56 * t, u = Math.abs(x) / hw; if (u < 1) v += 0.92 * (1 - u * u) * Math.pow(1 - t, 0.75) * (t < 0.05 ? t / 0.05 : 1); }
    { const dx = x / 98, dy = (y - 158) / 84, e = dx * dx + dy * dy; if (e < 1) v += 0.46 * Math.pow(1 - e, 1.4); }
    { const dx = x / 66, dy = (y - TOPC) / 19, e = dx * dx + dy * dy; if (e < 1) v += 0.7 * (1 - e); }
    { const dx = x / 92, dy = (y - 278) / 13, e = dx * dx + dy * dy; if (e < 1) v += 0.5 * (1 - e); }
    { const dx = x, dy = y - 132, d = Math.sqrt(dx * dx + dy * dy); if (d < 34) v += 0.7 * Math.pow(1 - d / 34, 2); }
    lampLight[(y - LM.y0) * LMW + (x - LM.x0)] = v; } })();
  const SCW = 100, SCH = 124, sconceLight = new Float32Array(SCW * SCH); for (let y = 0; y < SCH; y++) for (let x = 0; x < SCW; x++) { const dx = x - 50, dy = (y - 52) * 0.85, d = Math.sqrt(dx * dx + dy * dy); sconceLight[y * SCW + x] = d < 50 ? 0.42 * Math.pow(1 - d / 50, 1.5) : 0; }
  /* bruma volumetrica de un cono (alfa tramada) para la capa emisiva */
  const haze = (() => { const w = 150, h = 160; return sprite(w, h, (set) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const t = y / h, hw = 8 + 62 * t, u = Math.abs(x - 75) / hw; if (u >= 1) continue; const a = (1 - u * u) * Math.pow(1 - t, 1.1) * (t < 0.06 ? t / 0.06 : 1) * 0.5, th = (a * 9) - Math.floor(a * 9), lv = Math.floor(a * 9) + (th > BAY[(y & 7) * 8 + (x & 7)] ? 1 : 0); if (lv > 0) set(x, y, [255, 226, 160], Math.min(255, lv * 17)); } }); })();
  /* ====================== carga ====================== */
  const emblem = {}, emblemG = {}, embBox = {}; let dealerPix = null, sprites = null, lamps = null, ready = false, bottles = [], need = true;
  const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  const nat = (im, n) => { const c = mk(n, n), x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, n, n); return c; };
  async function init() {
    const allT = L.map(g => g.n).join("") + Object.values(X.rooms).join("") + X.title; await Promise.all([document.fonts.load(FJ + "px " + FF, allT), document.fonts.load(NS + "px " + NF, allT.toUpperCase() + "›")].map(p => p.catch(() => 0)));
    const srcs = [...new Set(L.map(g => g.ico))], ims = await Promise.all(srcs.map(s => loadImg("assets/icons/" + s + ".webp"))), dealer = await loadImg("assets/icons/dealer_neutral.webp"), icons = {};
    srcs.forEach((s, i) => { if (ims[i]) icons[s] = nat(ims[i], Math.round(ims[i].naturalWidth / 8)); });
    L.forEach(g => { const base = icons[g.ico]; if (!base) return; emblem[g.id] = base; { const bw = base.width, bd = base.getContext('2d').getImageData(0, 0, bw, base.height).data; let y1 = 0, x0 = bw, x1 = 0; for (let y = 0; y < base.height; y++) for (let x = 0; x < bw; x++) if (bd[(y * bw + x) * 4 + 3] > 40) { y1 = y; if (x < x0) x0 = x; if (x > x1) x1 = x; } embBox[g.id] = { bottom: y1 + 1, cx: Math.round((x0 + x1 + 1) / 2) }; } const n = base.width, gc = mk(n, n), x = gc.getContext("2d"); x.drawImage(base, 0, 0); const id = x.getImageData(0, 0, n, n), d = id.data; for (let i = 0; i < d.length; i += 4) { const v = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; d[i] = v * 0.55; d[i + 1] = v * 0.6; d[i + 2] = v * 0.74; } x.putImageData(id, 0, 0); emblemG[g.id] = gc; });
    sprites = {}; L.forEach(g => { sprites[g.id] = { table: tableSprite(g), prop: propSprite(g) }; });
    lamps = {}; Object.keys(LAMPC).forEach(r => { lamps[r] = lampSprite(LAMPSTYLE[r], LAMPC[r]); });
    const cs = ["#a8142e", "#136b3e", "#f5a623", "#0c60d3", "#c46a1b", "#e5408f", "#08787f"]; bottles = cs.map((c, i) => [bottle(HX(c), 20 + (i % 3) * 3), bottle(mix(HX(c), [255, 255, 255], 0.1), 16 + (i % 2) * 4)]);
    if (dealer) dealerPix = outline(nat(dealer, Math.round(dealer.naturalWidth / 8)), K.ink);
    buildText(); ready = true; need = true;
  }
  /* ====================== lienzos y DOM ====================== */
  const baseC = mk(IW, IH), bx = baseC.getContext("2d", { willReadFrequently: true }), emisC = mk(IW, IH), ex = emisC.getContext("2d"), finC = mk(IW, IH), fx = finC.getContext("2d"), lit = fx.createImageData(IW, IH);
  const FH = 360 - FLOOR, floorId = bx.createImageData(IW, FH), floorBuf = new Uint32Array(floorId.data.buffer);
  const bl1 = mk(160, 90), bl1x = bl1.getContext("2d"), bl2 = mk(80, 45), bl2x = bl2.getContext("2d");
  const out = mk(IW * 2, IH * 2); out.className = "pcv"; out.tabIndex = 0; out.setAttribute("role", "application"); out.setAttribute("aria-label", X.aria);
  const ox = out.getContext("2d"); ox.imageSmoothingEnabled = false;
  cv.innerHTML = `<div class="hrail">${dots()}</div><button type="button" class="harr l" aria-label="${X.left}">‹</button><button type="button" class="harr r" aria-label="${X.right}">›</button><div class="hcard"></div><div class="phint" id="phint"><i>←</i><i>→</i><span>${X.hint}</span></div>`;
  cv.insertBefore(out, cv.firstChild);
  const q = s => cv.querySelector(s);
  /* ====================== camara ====================== */
  const STOPS = [ENTRY_CAM, ...L.map(g => g.px - HW)];            // 0 = entrada; 1.. = mesas
  let cam = STOPS[X.start != null ? clamp(X.start, 0, STOPS.length - 1) : Math.min(7, N)], vel = 0, drag = null, snap = null, stop = -1, MM = !!(X.reduce && X.reduce()), lastT = 0, lastRender = 0, hinted = X.start != null, time0 = performance.now();
  const near = c => { let b = 0, bd = 1e9; for (let i = 0; i < STOPS.length; i++) { const d = Math.abs(STOPS[i] - c); if (d < bd) { bd = d; b = i; } } return b; };
  const welcome = X.welcome;
  function cardIn(gi) { const hc = q(".hcard"); hc.innerHTML = gi < 0 ? welcome : X.card(L[gi]); if (gi >= 0) X.wire(hc, L[gi]); }
  function focus(s) { if (s === stop) return; stop = s; const gi = s - 1; cv.querySelectorAll(".dt").forEach((t, k) => t.classList.toggle("on", k === gi)); cardIn(gi); q(".harr.l").disabled = s === 0; q(".harr.r").disabled = s === STOPS.length - 1; need = true; }
  const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  function goTo(s, ms) { s = clamp(s, 0, STOPS.length - 1); const to = STOPS[s], d = Math.abs(to - cam); snap = { from: cam, to, t0: performance.now(), ms: MM ? 1 : ms || clamp(280 + d * 1.0, 340, 800) }; vel = 0; focus(s); need = true; }
  const hide = () => { if (!hinted) { hinted = true; const h = q("#phint"); if (h) h.classList.add("off"); } };
  /* ====================== entrada de usuario ====================== */
  const mxy = e => { const r = out.getBoundingClientRect(); return [(e.clientX - r.left) * IW / r.width, (e.clientY - r.top) * IH / r.height, r.width / IW]; };
  out.addEventListener("pointerdown", e => { if (e.button > 0) return; out.setPointerCapture(e.pointerId); const k = mxy(e)[2]; drag = { id: e.pointerId, x0: e.clientX, cam0: cam, moved: false, k, s: [{ t: performance.now(), c: cam }] }; snap = null; vel = 0; out.classList.add("grab"); });
  out.addEventListener("pointermove", e => { if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x0; if (!drag.moved && Math.abs(dx) < 5) return; drag.moved = true; hide(); let c = drag.cam0 - dx / drag.k; if (c < CAMMIN) c = CAMMIN - (CAMMIN - c) * 0.35; if (c > CAMMAX) c = CAMMAX + (c - CAMMAX) * 0.35; cam = c; const now = performance.now(); drag.s.push({ t: now, c }); while (drag.s.length > 6 || (drag.s.length > 2 && now - drag.s[0].t > 120)) drag.s.shift(); need = true; focus(near(cam)); });
  const endDrag = e => { if (!drag || (e && e.pointerId !== drag.id)) return; const d = drag; drag = null; out.classList.remove("grab"); if (!d.moved) { const [x, y] = mxy(e); for (let i = 0; i < N; i++) { const sx = L[i].px - Math.round(cam); if (Math.abs(x - sx) < 60 && y > 130 + OY && y < 276 + OY) { goTo(i + 1); hide(); return; } } return; }
    const s = d.s, a = s[0], b = s[s.length - 1], dt = Math.max(16, b.t - a.t); vel = MM ? 0 : clamp((b.c - a.c) / dt * 16, -34, 34); if (MM || Math.abs(vel) < 1.2) goTo(near(cam + vel * 6)); need = true; };
  out.addEventListener("pointerup", endDrag); out.addEventListener("pointercancel", endDrag);
  out.addEventListener("wheel", e => { e.preventDefault(); hide(); const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; snap = null; if (MM) { goTo(stop + (d > 0 ? 1 : -1)); return; } vel = clamp(vel + d * 0.06, -30, 30); need = true; }, { passive: false });
  const kd = e => { if (!document.body.contains(cv)) return removeEventListener("keydown", kd); const r = cv.parentNode && cv.parentNode.getBoundingClientRect(); if (!r || r.bottom < 0 || r.top > innerHeight) return; if (X.paused && X.paused()) return; const k = e.key; if (k === "ArrowLeft") { goTo(stop - 1); hide(); e.preventDefault(); } else if (k === "ArrowRight") { goTo(stop + 1); hide(); e.preventDefault(); } else if (k === "Home") { goTo(0); e.preventDefault(); } else if (k === "End") { goTo(STOPS.length - 1); e.preventDefault(); } };
  addEventListener("keydown", kd);
  q(".harr.l").onclick = () => { goTo(stop - 1); hide(); }; q(".harr.r").onclick = () => { goTo(stop + 1); hide(); };
  cv.querySelectorAll(".dt").forEach(t => (t.onclick = () => { goTo(+t.dataset.i + 1); hide(); }));
  /* ====================== dibujo ====================== */
  const roomAt = c => { const W = 150, gs = [{ id: "hall" }, ...rooms], ga = [-1e9, ...rooms.map(r => r.gate)]; let k = 0; for (let i = 1; i < ga.length; i++) if (c >= ga[i] - W / 2) k = i; const nx = k + 1 < ga.length ? c - (ga[k + 1] - W / 2) : -1e9; if (nx > 0) return { a: gs[k].id, b: gs[k + 1].id, t: clamp(nx / W, 0, 1) }; return { a: gs[k].id, b: gs[k].id, t: 0 }; };
  const patCache = {}, wallPattern = (ra, rb, tq) => { const key = ra + rb + tq; if (patCache[key]) return patCache[key]; const A = WALLC[ra], B = WALLC[rb], t = tq / 8; return (patCache[key] = bx.createPattern(wallTile(mix(A[0], B[0], t), mix(A[1], B[1], t)), "repeat")); };
  const WS = 0.35;                                                  // velocidad de la pared
  const sconceXs = c => { const off = Math.round(c * WS), r = []; for (let w = Math.floor(off / 180) * 180 - 180; w < off + IW + 200; w += 180) r.push(w - off + 90); return r; };
  function drawFloor(c) {
    const r0 = 40, rB = BASE - FLOOR, camU = c + HW;
    for (let r = 0; r < FH; r++) { const s = (r + r0) / (rB + r0), inv = 1 / s, v = (Math.floor(2400 / (r + r0)) % FT_H + FT_H) % FT_H, row = v * FT_W, o = r * IW; for (let x = 0; x < IW; x++) { const u = ((Math.floor((x - HW) * inv + camU) % FT_W) + FT_W) % FT_W; floorBuf[o + x] = floorTex[row + u]; } }
    bx.putImageData(floorId, 0, FLOOR + OY);
  }
  const soonW = tg => { const m = mk(8, 8).getContext("2d"); m.font = NS + "px " + NF; return (v => v + (v & 1))(Math.ceil(m.measureText(tg).width) + 8); };
  function scene(time) {
    const c = Math.round(cam), ctx = bx; ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, IW, IH); ctx.save(); ctx.translate(0, OY);
    const ra = roomAt(c + HW), tq = Math.round(ra.t * 8), off = Math.round(c * WS);
    ctx.save(); ctx.translate(-(off % 32), 0); ctx.fillStyle = wallPattern(ra.a, ra.b, tq); ctx.fillRect(0, -OY, IW + 32, FLOOR - 44 + OY); ctx.fillStyle = ctx.createPattern(wainscot, "repeat"); ctx.translate(0, FLOOR - 44); ctx.fillRect(0, 0, IW + 32, 44); ctx.restore();
    sconceXs(c).forEach((sx) => { ctx.fillStyle = rgb(K.ink); ctx.fillRect(sx - 14, 96, 28, 58); ctx.fillStyle = rgb(K.br2); ctx.fillRect(sx - 13, 97, 26, 56); ctx.fillStyle = rgb(K.br3); ctx.fillRect(sx - 13, 97, 26, 1); ctx.fillStyle = rgb(mix(WALLC[ra.a][1], [0, 0, 0], 0.4)); ctx.fillRect(sx - 10, 100, 20, 50);
      const seed = Math.floor((sx + off) / 180); for (let j = 0; j < 12; j++) { ctx.fillStyle = rgb(mix(WALLC[ra.b][0], K.br3, 0.2 + hash(seed, j, 2) * 0.5)); ctx.fillRect(sx - 7 + (j % 4) * 4, 104 + ((j / 4) | 0) * 14, 3, 9); }
      ctx.fillStyle = rgb(K.br3); ctx.fillRect(sx - 4, 154, 8, 3); ctx.fillStyle = rgb(K.br2); ctx.fillRect(sx - 1, 157, 2, 6); });
    { const sx = 120 - Math.round(c * 0.8); if (sx > -240 && sx < IW) { [[143, 0], [176, 1]].forEach(([yy, row]) => { ctx.fillStyle = rgb(K.ink); ctx.fillRect(sx - 2, yy, 196, 5); ctx.fillStyle = rgb(K.br2); ctx.fillRect(sx, yy + 1, 192, 2); ctx.fillStyle = rgb(K.br3); ctx.fillRect(sx, yy + 1, 192, 1); for (let k = 0; k < 17; k++) { const b = bottles[(k + row * 3) % 7][row]; ctx.drawImage(b, sx + 5 + k * 11, yy + 1 - b.height); } }); } }
    { const co = Math.round(c * 0.62); for (let i = -1; i < 26; i++) { const wxp = i * 64 + ((i * 37) % 23) - 40; let px = wxp - (co % 1664); px = ((px % 1664) + 1664) % 1664 - 60; if (px > IW + 20 || px < -24) continue; const k = (i + 40) % 4, bob = MM ? 0 : (Math.floor(time / 520 + i * 0.73) % 2); ctx.drawImage(crowdSprites[k], px, FLOOR - 38 + bob + ((i * 13) % 3)); } }
    drawFloor(c);
    ctx.fillStyle = rgb(K.br3); ctx.fillRect(0, FLOOR, IW, 1); ctx.fillStyle = rgb(K.br2); ctx.fillRect(0, FLOOR + 1, IW, 2); ctx.fillStyle = rgb(K.ink); ctx.fillRect(0, FLOOR + 3, IW, 1);
    const csx = 50 - c; if (csx > -260 && csx < IW) { ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(csx + 118, BASE + 1, 126, 9, 0, 0, 7); ctx.fill(); if (dealerPix) ctx.drawImage(dealerPix, csx + 118 - Math.round(dealerPix.width / 2), FLOOR + 12 - dealerPix.height + 4); ctx.drawImage(counter, csx, FLOOR + 6); ctx.drawImage(counterProps, csx + 8, FLOOR + 6 - counterProps.height + 3); }
    ctx.save(); ctx.beginPath(); ctx.rect(0, BASE + 5, IW, IH); ctx.clip();
    for (let i = 0; i < N; i++) { const sx = L[i].px - c; if (sx < -80 || sx > IW + 80) continue; const sp = sprites[L[i].id]; ctx.save(); ctx.globalAlpha = i + 1 === stop ? 0.3 : 0.18; ctx.translate(0, TY + 102 * 2 + 3); ctx.scale(1, -1); ctx.drawImage(sp.table, sx - TCX, 0); ctx.restore(); }
    ctx.restore();
    for (let i = 0; i < N; i++) { const sx = L[i].px - c; if (sx < -90 || sx > IW + 90) continue; const g = L[i], sp = sprites[g.id], on = i + 1 === stop;
      ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.beginPath(); ctx.ellipse(sx, BASE + 4, 44, 7, 0, 0, 7); ctx.fill();
      ctx.drawImage(sp.table, sx - TCX, TY); ctx.drawImage(sp.prop, sx - 64, TOPC - 20);
      const em = emblem[g.id], eg = emblemG[g.id], bob = MM || !on ? 0 : (Math.floor(time / 600) % 2), eb = TOPC - 9;
      const bb = embBox[g.id] || { bottom: em ? em.height : 0, cx: em ? em.width >> 1 : 0 }; ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.beginPath(); ctx.ellipse(sx, TOPC + 3, 15, 3, 0, 0, 7); ctx.fill(); ctx.drawImage(easel, sx - 17, eb - 1); if (em) ctx.drawImage(g.soon ? eg : em, sx - bb.cx, eb - bb.bottom - bob);
      if (!on) { const pl = plaque[g.id]; if (pl) ctx.drawImage(pl, sx - Math.floor(pl.width / 2), BASE + 12); }
      if (g.soon) { const tg = X.soonTag || "PRONTO", tw = soonW(tg); ctx.fillStyle = rgb(BRASS_S[3]); ctx.fillRect(sx - (tw >> 1), TOPC - 50, tw, 11); ctx.fillStyle = rgb(K.ink); ctx.fillRect(sx - (tw >> 1) - 1, TOPC - 51, tw + 2, 1); ctx.fillRect(sx - (tw >> 1) - 1, TOPC - 39, tw + 2, 1); ctx.fillRect(sx - (tw >> 1) - 1, TOPC - 51, 1, 13); ctx.fillRect(sx - (tw >> 1) + tw, TOPC - 51, 1, 13); ctx.font = NS + "px " + NF; ctx.letterSpacing = "0px"; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(tg, sx, TOPC - (IS_CJK ? 49 : 48)); ctx.textAlign = "left"; } }
    for (let i = 0; i < N; i++) { const sx = L[i].px - c; if (sx < -60 || sx > IW + 60) continue; const lp = lamps[L[i].room], sway = MM ? 0 : (Math.floor(time / 900 + i * 1.7) % 4 === 0 ? 1 : 0); ctx.fillStyle = rgb(K.ink); ctx.fillRect(sx - 1, 50, 3, 40); ctx.fillStyle = rgb(K.br2); ctx.fillRect(sx, 50, 1, 40); ctx.drawImage(lp.base, sx - 30 + sway, lp.top); }
    if (hallLamp) { const sx = HALLX - c + 62; if (sx > -60 && sx < IW + 60) { ctx.fillStyle = rgb(K.ink); ctx.fillRect(sx - 1, 50, 3, 40); ctx.fillStyle = rgb(K.br2); ctx.fillRect(sx, 50, 1, 40); ctx.drawImage(hallLamp.base, sx - 30, 88); } }
    gates.forEach(s => { const sx = Math.round(s.x - c - s.w / 2); if (sx > IW || sx + s.w < 0) return; ctx.fillStyle = rgb(K.ink); ctx.fillRect(sx + 10, 62, 2, 30); ctx.fillRect(sx + s.w - 12, 62, 2, 30); ctx.drawImage(s.base, sx, 92); });
    if (neonEntry) { const sx = csx + 118 - Math.round(neonEntry.w / 2); if (sx < IW && sx + neonEntry.w > 0) { ctx.fillStyle = rgb(K.ink); ctx.fillRect(sx + 10, 62, 2, 30); ctx.fillRect(sx + neonEntry.w - 12, 62, 2, 30); ctx.drawImage(neonEntry.base, sx, 92); } }
    ctx.drawImage(curtain, 0, -OY); ctx.save(); ctx.translate(IW, -OY); ctx.scale(-1, 1); ctx.drawImage(curtain, 0, 0); ctx.restore(); ctx.restore();
  }
  function emissive(time) {
    const c = Math.round(cam), e = ex; e.imageSmoothingEnabled = false; e.clearRect(0, 0, IW, IH); e.save(); e.translate(0, OY); const fl = MM ? 1 : 1 + (Math.sin(time * 0.013) * 0.04 + Math.sin(time * 0.037) * 0.03);
    for (let i = 0; i < N; i++) { const sx = L[i].px - c; if (sx < -90 || sx > IW + 90) continue; const lp = lamps[L[i].room], on = i + 1 === stop, sway = MM ? 0 : (Math.floor(time / 900 + i * 1.7) % 4 === 0 ? 1 : 0);
      e.globalAlpha = on ? 0.26 * fl : 0.11; e.drawImage(haze, sx - 75, 126); e.globalAlpha = clamp((on ? 0.8 : 0.5) * (on ? fl : 1) * (lp.k || 1), 0, 1); e.drawImage(lp.glow, sx - 30 + sway, lp.top); e.globalAlpha = 1;
      e.fillStyle = "rgb(255,246,205)"; e.fillRect(sx - 4 + sway, lp.top + lp.bulbY, 8, 3); e.fillStyle = "rgb(255,215,130)"; e.fillRect(sx - 7 + sway, lp.top + lp.bulbY + 1, 14, 1);
      const g = L[i], em = emblem[g.id]; if (em && on && !g.soon) { e.globalAlpha = 0.22 + 0.08 * Math.sin(time * 0.004); const bb = embBox[g.id]; e.drawImage(em, sx - bb.cx, TOPC - 9 - bb.bottom); e.globalAlpha = 1; } }
    if (hallLamp) { const sx = HALLX - c + 62; if (sx > -90 && sx < IW + 90) { e.globalAlpha = 0.26; e.drawImage(haze, sx - 75, 126); e.globalAlpha = 0.7; e.drawImage(hallLamp.glow, sx - 30, 88); e.globalAlpha = 1; e.fillStyle = 'rgb(255,246,205)'; e.fillRect(sx - 4, 88 + hallLamp.bulbY, 8, 3); } }
    gates.forEach(s => { const sx = Math.round(s.x - c - s.w / 2); if (sx > IW || sx + s.w < 0) return; const t = Math.floor(time / 90) % 97, f = MM ? 1 : (t === 3 ? 0.35 : t === 5 ? 0.7 : 1); e.globalAlpha = f * 0.85; e.drawImage(s.em, sx, 92); e.globalAlpha = 1; });
    const csx = 50 - c; if (neonEntry) { const sx = csx + 118 - Math.round(neonEntry.w / 2); if (sx < IW && sx + neonEntry.w > 0) e.drawImage(neonEntry.em, sx, 92); }
    sconceXs(c).forEach(sx => { e.fillStyle = "rgb(255,236,170)"; e.fillRect(sx - 3, 152, 6, 3); e.fillStyle = "rgb(255,200,110)"; e.fillRect(sx - 4, 153, 8, 1); });
    { const sx = 120 - Math.round(c * 0.8); if (sx > -240 && sx < IW) { e.fillStyle = "rgba(255,225,150,.55)"; e.fillRect(sx, 148, 192, 2); e.fillRect(sx, 181, 192, 2); } if (csx > -260 && csx < IW) { e.fillStyle = "rgba(255,210,120,.6)"; e.fillRect(csx + 6, FLOOR + 28, 224, 1); } }
    e.restore();
  }
  const AMB = 0.4, STEPS = 8, Lw = new Float32Array(IW * IH);
  const vig = (() => { const v = new Float32Array(IW * IH); for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) { const dx = (x - IW / 2) / (IW / 2), dy = (y - IH * 0.55) / (IH * 0.62), d = Math.sqrt(dx * dx * 0.7 + dy * dy * 0.7); v[y * IW + x] = 1 - clamp((d - 0.6) / 0.8, 0, 1) * 0.5; } return v; })();
  function addMap(map, mw, mh, ox0, oy0, I) { const x0 = Math.max(0, ox0), y0 = Math.max(0, oy0), x1 = Math.min(IW, ox0 + mw), y1 = Math.min(IH, oy0 + mh); for (let y = y0; y < y1; y++) { let i = y * IW + x0, m = (y - oy0) * mw + (x0 - ox0); for (let x = x0; x < x1; x++, i++, m++) Lw[i] += I * map[m]; } }
  function compose(time) {
    const c = Math.round(cam), fl = MM ? 1 : 1 + (Math.sin(time * 0.013) * 0.05 + Math.sin(time * 0.037) * 0.035); Lw.fill(0);
    for (let i = 0; i < N; i++) { const lx = L[i].px - c; if (lx < -190 || lx > IW + 190) continue; addMap(lampLight, LMW, LMH, lx + LM.x0, LM.y0 + OY, i + 1 === stop ? 0.85 * fl : 0.4); }
    sconceXs(c).forEach(sx => addMap(sconceLight, SCW, SCH, sx - 50, 102 + OY, 1));
    { const hx = HALLX - c + 62; if (hx > -190 && hx < IW + 190) addMap(lampLight, LMW, LMH, hx + LM.x0, LM.y0 + OY, 0.7 * fl); }
    { const sx = 120 - Math.round(c * 0.8); if (sx > -300 && sx < IW) for (let y = 128 + OY; y < 204 + OY; y++) { const v = 0.4 * (1 - Math.abs(y - OY - 164) / 38); if (v <= 0) continue; const x0 = Math.max(0, sx - 20), x1 = Math.min(IW, sx + 230); for (let x = x0, i = y * IW + x0; x < x1; x++, i++) Lw[i] += v; } const csx = 50 - c; if (csx > -260 && csx < IW) for (let y = 150 + OY; y < 300 + OY; y++) { const dy = (y - OY - 236) / 70; if (dy * dy >= 1) continue; const x0 = Math.max(0, csx - 20), x1 = Math.min(IW, csx + 260); for (let x = x0, i = y * IW + x0; x < x1; x++, i++) { const dx = (x - (csx + 118)) / 130, e2 = dx * dx + dy * dy; if (e2 < 1) Lw[i] += 0.62 * (1 - e2); } } }
    const src = bx.getImageData(0, 0, IW, IH).data, dst = lit.data;
    for (let p = 0, i = 0, y = 0; y < IH; y++) for (let x = 0; x < IW; x++, p++, i += 4) { const lw = Lw[p], s = (AMB + lw) * vig[p], q2 = Math.floor(s * STEPS + BAY[((y & 7) << 3) | (x & 7)]) / STEPS, f = q2 < 0.05 ? 0.05 : q2 > 1.25 ? 1.25 : q2, wf = lw > 0.001 ? lw / (AMB + lw) : 0;
      dst[i] = src[i] * f * (0.84 + 0.3 * wf); dst[i + 1] = src[i + 1] * f * (0.92 + 0.1 * wf); dst[i + 2] = src[i + 2] * f * (1.08 - 0.3 * wf); dst[i + 3] = 255; }
    fx.putImageData(lit, 0, 0); fx.globalCompositeOperation = "lighter"; fx.drawImage(emisC, 0, 0);
    bl1x.clearRect(0, 0, 160, 90); bl1x.imageSmoothingEnabled = true; bl1x.drawImage(emisC, 0, 0, 160, 90); bl2x.clearRect(0, 0, 80, 45); bl2x.imageSmoothingEnabled = true; bl2x.drawImage(bl1, 0, 0, 80, 45);
    fx.imageSmoothingEnabled = true; fx.globalAlpha = 0.42; fx.drawImage(bl1, 0, 0, IW, IH); fx.globalAlpha = 0.45; fx.drawImage(bl2, 0, 0, IW, IH); fx.globalAlpha = 1; fx.imageSmoothingEnabled = false;
    if (!MM) for (let i = 0; i < N; i++) { const lx = L[i].px - c; if (lx < -80 || lx > IW + 80) continue; const on = i + 1 === stop; for (let k = 0; k < (on ? 10 : 4); k++) { const ph = hash(i, k, 6) * 6.28, sp = 0.0006 + hash(i, k, 7) * 0.0007, yy = OY + 134 + ((hash(i, k, 8) * 130 + time * sp * 60 * (0.6 + hash(i, k, 9))) % 130), t = (yy - OY - 134) / 130, hw = 9 + 54 * t, xx = lx + Math.sin(time * 0.0007 + ph) * hw * 0.75 + (hash(i, k, 10) - 0.5) * hw * 0.4, a = (0.3 + 0.45 * (0.5 + 0.5 * Math.sin(time * 0.003 + ph))) * (1 - t * 0.5) * (on ? 1 : 0.6); fx.fillStyle = "rgba(255,240,196," + a.toFixed(2) + ")"; fx.fillRect(Math.round(xx), Math.round(yy), 1, 1); } }
    /* las cortinas van DELANTE de todo y son opacas: ni la luz, ni el neon, ni el bloom, ni el polvo se ven a traves (se vuelven a pintar encima, con su sombra de sala) */
    fx.globalCompositeOperation = "source-over"; fx.imageSmoothingEnabled = false; fx.drawImage(curtain, 0, 0); fx.save(); fx.translate(IW, 0); fx.scale(-1, 1); fx.drawImage(curtain, 0, 0); fx.restore();
    fx.fillStyle = "rgba(0,0,0,.32)"; fx.fillRect(0, 0, curtain.width, IH); fx.fillRect(IW - curtain.width, 0, curtain.width, IH);
    fx.globalCompositeOperation = "source-over"; ox.drawImage(finC, 0, 0, IW * 2, IH * 2);
  }
  /* ====================== bucle ====================== */
  let raf = 0, alive = true; const perf = { n: 0, sA: 0, sB: 0, sC: 0, max: 0 };
  function frame(now) {
    if (!alive) return; if (!document.body.contains(cv)) { alive = false; removeEventListener("keydown", kd); return; }
    raf = requestAnimationFrame(frame); const dt = Math.min(48, now - (lastT || now)); lastT = now;
    if (!ready) return;
    if (X.tick) X.tick(now, cv.__pasillo);
    if (X.paused && X.paused()) return;
    if (snap) { const u = clamp((now - snap.t0) / snap.ms, 0, 1); cam = snap.from + (snap.to - snap.from) * ease(u); if (u >= 1) { cam = snap.to; snap = null; } need = true; }
    else if (!drag && Math.abs(vel) > 0.04) { cam += vel * dt / 16; vel *= Math.pow(0.935, dt / 16); if (cam < CAMMIN || cam > CAMMAX) { const edge = cam < CAMMIN ? CAMMIN : CAMMAX; vel *= 0.8; cam += (edge - cam) * 0.12; } need = true; focus(near(cam)); if (Math.abs(vel) <= 1.2) { vel = 0; goTo(near(cam)); } }
    else if (!drag && stop >= 0 && Math.abs(STOPS[stop] - cam) > 0.6) goTo(stop, 300);
    if (need || now - lastRender > (MM ? 400 : 60)) { need = false; lastRender = now; const p0 = performance.now(), t = now - time0; scene(t); const p1 = performance.now(); emissive(t); const p2 = performance.now(); compose(t); const p3 = performance.now(); perf.n++; perf.sA += p1 - p0; perf.sB += p2 - p1; perf.sC += p3 - p2; perf.max = Math.max(perf.max, p3 - p0); }
  }
  if (hinted) q("#phint").classList.add("off");
  focus(near(cam)); init().then(() => { need = true; }); raf = requestAnimationFrame(frame);
  cv.__pasillo = { refreshCard() { const gi = stop - 1; cardIn(gi); need = true; }, dispose() { alive = false; cancelAnimationFrame(raf); removeEventListener("keydown", kd); }, get cam() { return cam; }, get stop() { return stop; }, goTo, stats: () => ({ N, stop, n: perf.n, scene: +(perf.sA / perf.n).toFixed(2), emis: +(perf.sB / perf.n).toFixed(2), light: +(perf.sC / perf.n).toFixed(2), total: +((perf.sA + perf.sB + perf.sC) / perf.n).toFixed(2), max: +perf.max.toFixed(1) }), resetStats: () => { perf.n = perf.sA = perf.sB = perf.sC = perf.max = 0; } };
};
})(window.AIQ);
