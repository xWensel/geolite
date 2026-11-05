/*
 * Geolite - LUCES DE NEON, de verdad (maqueta «Lo que queda», votada el 5-nov-2026: dirección A «la lámpara de cuadro»). El reto de bandera
 * «Luces de neón» (flaghue) ya no gira los colores con un filtro de foto: una lámpara de latón atornillada a la carta de la pregunta, encima de
 * la bandera, con tres tubos (uno blanco y dos de color que se turnan). Su luz MULTIPLICA toda la carta (bajo el azul el rojo se vuelve casi negro;
 * bajo el sodio, Francia parece Bélgica) y es más fuerte cerca de los tubos. La forma de la bandera nunca cambia: engañan los colores.
 *   Por nivel (votado tal cual): 1 rosa y naranja, la sala con luz; 2 rosa y azul, el blanco a ratos; 3 sodio y azul en penumbra con la VENTANA
 *   JUSTA (cada 4 s se apagan los de color y entra el blanco 1,5 s: la bandera de verdad); jefe «Neón de fronteras falsas»: como el 3, el doble
 *   de rápido y con un tubo moribundo.
 *   Pixel art en la rejilla del juego: la luz se calcula por celdas de k píxeles reales (escala entera) y en escalones de una décima (bandas de
 *   píxel, nada de degradados blandos). El tubo luce (no se multiplica); el latón y los bornes reciben la luz. Un halo de 2 celdas pegado al tubo.
 *   Fotosensibilidad: el arranque tiembla entre media luz y medio, nunca a negro (2 caídas fuertes por segundo como mucho).
 *   Movimiento en Mínimo: un tubo de color fijo por pregunta, sin parpadeos, y el blanco a media luz. Destellos suaves: los tubos se encienden sin
 *   temblor ni tartamudeo (los turnos siguen). Suena el arranque (tic-tic-clonc) al encenderse un tubo.
 *   A.neon.mount(img, { lv: 1-3, boss, mul })   monta la lámpara sobre esa bandera (.ask-flag, dentro de #plate); A.neon.unmount()
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const RGB = {}, hx = h => RGB[h] || (RGB[h] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
  const K = { b0: "fff3b0", b1: "f5a623", b2: "c46a1b", b3: "6e3414", b4: "3c240a", boot: "5c565b", black: "0a0a0c" };
  /* gases: color del tubo (paleta geolite40) y color de la luz que da (multiplica R, G, B) */
  const GAS = {
    rosa: { body: "e5408f", core: "ffd3b6", dim: "a8142e", L: [1, .28, .55] },
    naranja: { body: "f2a07c", core: "ffd3b6", dim: "c4614a", L: [1, .62, .42] },
    sodio: { body: "f5a623", core: "fdd742", dim: "c46a1b", L: [1, .58, .06] },
    azul: { body: "1689fb", core: "7ac8ff", dim: "0c60d3", L: [.18, .45, 1] },
    blanco: { body: "c9cde0", core: "f3f0fa", dim: "8a8fa8", L: [.95, .95, .97] },
  };
  const GLASS = ["c9cde0", "8a8fa8", "6b747d"];                                   // tubo apagado: cristal con su brillo arriba
  const LAMP = 21;                                                                // filas de arte que ocupa la lámpara encima del marco de la bandera

  /* ---------------------------------------------------------------- tiempo: arranque, tartamudeo, tubo moribundo */
  const STRIKE = [[0, .35], [50, .7], [100, .35], [170, .7], [230, 1]];         // tic-tic... clonc, sin apagones a negro
  const STRIKE_FAST = [[0, .35], [60, 1]];
  const pat = (P, dt) => { let v = 0; for (const [s, p] of P) if (dt >= s) v = p; return v; };
  const hash = n => { n |= 0; n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; };
  const soft = () => document.documentElement.classList.contains("soft-flash");
  function onP(tOn, tOff, t, seed, st, fast) {
    if (t < tOn) return 0;
    if (t >= tOff) return t - tOff < 45 ? .35 : 0;                                 // al cortar, un resto de brillo de un fotograma
    const dt = t - tOn; if (soft()) return 1;                                      // Destellos suaves: se enciende sin temblor ni tartamudeo
    if (dt < (fast ? 60 : 230)) return pat(fast ? STRIKE_FAST : STRIKE, dt);
    if (st) { const k = Math.floor(t / 60); if (hash(k * 7919 + seed * 131) < st || hash((k - 1) * 7919 + seed * 131) < st * .5) return .7; }
    return 1;
  }
  const dying = (t, seed) => { if (soft()) return .35; const k = Math.floor(t / 140), h = hash(k * 977 + seed); return h < .12 ? 0 : h < .55 ? .35 : 1; };   // una punta que tiembla

  const CFG = [null,
    { amb: .45, g: ["rosa", "naranja"], per: 4000, wh: "off", st: .006 },
    { amb: .30, g: ["rosa", "azul"], per: 3000, wh: "half", st: .015 },
    { amb: .20, g: ["sodio", "azul"], swaps: 2, wh: "win", st: .02 },
    { amb: .16, g: ["sodio", "azul"], swaps: 4, wh: "win", st: .035, dying: true }];
  /* los tres tubos en cada momento: p1, p2 los de color, pw el blanco (0 apagado, .35 media luz, .7 medio, 1 pleno) */
  function sched(l, t, mini, seed) {
    const c = CFG[l]; let p1 = 0, p2 = 0, pw = 0;
    if (mini) { if (seed % 2) p2 = 1; else p1 = 1; pw = l === 1 ? 0 : .6; }    // Mínimo: un tubo de color fijo por pregunta, sin parpadeos
    else if (c.wh === "win") {
      /* nivel 3 y jefe: ciclo de 4 s. Los dos de color se turnan 2,5 s; luego se apagan y entra el blanco 1,5 s: la ventana justa */
      const P = 4000, W0 = 2500, k = Math.floor(t / P), s = k * P, dt = t - s, seg = W0 / c.swaps;
      if (dt < W0) {
        const i = Math.floor(dt / seg), on = onP(s + i * seg, s + (i + 1) * seg, t, 11 + k * 8 + i, c.st, c.dying);
        if (i % 2 === 0) p1 = on; else p2 = on;
        if (i > 0 && dt - i * seg < 45) { if (i % 2) p1 = .35; else p2 = .35; }
      } else if (dt - W0 < 45) { if ((c.swaps - 1) % 2) p2 = .35; else p1 = .35; }
      pw = onP(s + W0, s + P, t, 51 + k, 0);
    } else {
      const k = Math.floor(t / c.per), s = k * c.per, act = k % 2, on = onP(s + 160, s + c.per, t, 11 + k, c.st), tail = k > 0 && t - s < 45 ? .35 : 0;
      if (act === 0) { p1 = on; p2 = tail; } else { p2 = on; p1 = tail; }
      const P = 4000, kk = Math.floor(t / P), ss = kk * P;
      pw = c.wh === "off" ? 0 : onP(ss + 200, ss + 2000, t, 31 + kk, .01) * .85;
    }
    return { p: [pw, p1, p2], amb: c.amb, gas: ["blanco", c.g[0], c.g[1]], dyingP: c.dying && !mini ? dying(t, 3) : null };
  }

  /* ---------------------------------------------------------------- la escena montada */
  let M = null;
  const reduced = () => document.documentElement.classList.contains("reduce-motion");
  function unmount() { if (!M) return; cancelAnimationFrame(M.raf); clearInterval(M.geoT); M.cvs.forEach(c => c.remove()); if (M.wrap && M.wrap.isConnected && M.img.isConnected) M.wrap.replaceWith(M.img); M = null; }
  function mount(img, o = {}) {
    unmount();
    const plate = img && img.closest("#plate"); if (!plate) return;
    const lv = o.boss ? 4 : Math.max(1, Math.min(3, o.lv | 0 || 2));
    const wrap = document.createElement("span"); wrap.className = "nn-wrap"; img.replaceWith(wrap); wrap.appendChild(img);
    const mk = cls => { const c = document.createElement("canvas"); c.className = "nn-cv " + cls; c.setAttribute("aria-hidden", "true"); plate.appendChild(c); return c; };
    M = { img, plate, wrap, lv, mul: o.mul == null ? 1 : o.mul, seed: (o.seed | 0) || 1, t0: performance.now(), key: "", geoKey: "", cvs: [], lastOn: [0, 0, 0], sndAt: 0 };
    M.lt = mk("nn-luz"); M.bl = mk("nn-halo"); M.fg = mk("nn-lampara"); M.cvs = [M.lt, M.bl, M.fg];
    geo(); M.geoT = setInterval(geo, 500);
    const loop = now => { if (!M) return; if (!img.isConnected || !plate.isConnected) return unmount(); if (plate.offsetWidth) frame(now); M.raf = requestAnimationFrame(loop); };   // con la carta oculta no calcula nada
    M.raf = requestAnimationFrame(loop);
  }
  /* la rejilla: celdas de k píxeles reales sobre toda la carta (#plate); la bandera y la lámpara, en celdas enteras */
  function geo() {
    if (!M) return;
    const dpr = window.devicePixelRatio || 1, ir = M.img.getBoundingClientRect(); if (!ir.width) return;
    const k = Math.max(2, Math.round(ir.width * dpr / 105));
    const zw = M.wrap.currentCSSZoom || 1, lampCss = (LAMP + 1) * k / dpr / zw;                    // el hueco de la lámpara (la carta va con zoom a 1080p)
    if (Math.abs((parseFloat(M.wrap.style.paddingTop) || 0) - lampCss) > .5) M.wrap.style.paddingTop = lampCss + "px";
    const pr = M.plate.getBoundingClientRect(), ir2 = M.img.getBoundingClientRect();
    if (pr.width < 8 || pr.height < 8) return;                                     // la carta aún no se ve (o se está yendo)
    const gw = Math.ceil(pr.width * dpr / k), gh = Math.ceil(pr.height * dpr / k);
    /* el marco de la bandera (2 px de borde en css) en celdas: x0, x1 = las columnas del borde; y0 = su fila de arriba */
    const fx0 = Math.round((ir2.left - pr.left) * dpr / k), fx1 = Math.round((ir2.right - pr.left) * dpr / k) - 1, fy0 = Math.round((ir2.top - pr.top) * dpr / k);
    const key = [k, gw, gh, fx0, fx1, fy0, Math.round(pr.left), Math.round(pr.top)].join(",");
    if (key === M.geoKey) return; M.geoKey = key; M.key = "";
    Object.assign(M, { k, dpr, gw, gh, fx0, fx1, fy0 });
    const op = M.lt.offsetParent || M.plate, or = op.getBoundingClientRect(), z = M.lt.currentCSSZoom || 1;   // en la esquina de la carta, sea quien sea su contenedor (y con su zoom)
    for (const c of M.cvs) { c.width = gw * k; c.height = gh * k; c.style.width = gw * k / dpr / z + "px"; c.style.height = gh * k / dpr / z + "px"; c.style.left = (pr.left - or.left) / z - op.clientLeft + "px"; c.style.top = (pr.top - or.top) / z - op.clientTop + "px"; }
    M.lm = M.lm && M.lm.width === gw && M.lm.height === gh ? M.lm : Object.assign(document.createElement("canvas"), { width: gw, height: gh });
    M.bm = M.bm && M.bm.width === gw && M.bm.height === gh ? M.bm : Object.assign(document.createElement("canvas"), { width: gw, height: gh });
    /* la lámpara, a la medida de la bandera (simétrica sobre su centro): placa de 10 en medio, brazo de 2, barra, dos soportes y tres tubos */
    const cx2 = fx0 + fx1;                                                         // el centro, en medias celdas
    const half = Math.max(8, Math.floor((fx1 - fx0 - 1) / 2) - 17);              // medio tubo (en la maqueta, 32 sobre una bandera de 98)
    const ta = Math.ceil(cx2 / 2) - half, tb = Math.floor(cx2 / 2) + half;          // simétricos sobre el centro
    M.L = { ta, tb, rows: [fy0 - 11, fy0 - 7, fy0 - 3], top: fy0 - LAMP, cx2 };
  }
  /* la luz de un tubo en un punto: la del trozo encendido que más alumbra (un tubo partido no cuenta dos veces) */
  function tubeQ(t, u, v) {
    let best = 0; const dv = v - (t.c + .5);
    for (const s of t.segs) { if (s.p <= 0) continue; const du = Math.max(s.a - u, 0, u - (s.b + 1)), d = Math.hypot(du, dv), q = Math.min(1, 1.2 / (1 + (d / 40) * (d / 40)) * s.p); if (q > best) best = q; }
    return best;
  }
  function frame(now) {
    if (!M.L) return;
    const t = now - M.t0, st = sched(M.lv, t, reduced(), M.seed), L = M.L;
    const tubes = st.gas.map((g, i) => {
      const t0 = { gas: g, c: L.rows[i], a: L.ta, b: L.tb, p: st.p[i] };
      t0.segs = i === 2 && st.dyingP != null ? [{ a: L.ta, b: L.ta + Math.round((L.tb - L.ta) * .73) - 1, p: st.p[i] }, { a: L.ta + Math.round((L.tb - L.ta) * .73), b: L.tb, p: st.p[i] * st.dyingP }] : [{ a: L.ta, b: L.tb, p: st.p[i] }];
      return t0;
    });
    /* el arranque suena al encenderse un tubo (de apagado a encendido), uno cada 0,4 s como mucho */
    tubes.forEach((tb, i) => { const on = tb.p > 0; if (on && !M.lastOn[i] && now - M.sndAt > 400 && A.sfx && A.sfx.neonOn) { M.sndAt = now; A.sfx.neonOn(); } M.lastOn[i] = on; });
    const amb = 1 - (1 - st.amb) * M.mul;                                         // la Lupa del tasador sube la luz de sala
    const key = amb + "|" + tubes.map(tb => tb.segs.map(s => s.p).join(",")).join("|");
    if (key === M.key) return; M.key = key;
    light(tubes, amb); paint(tubes);
  }
  /* la luz de la carta: luz de sala + cada tubo según su distancia, en escalones de una décima; y el halo pegado al tubo encendido */
  function light(tubes, amb) {
    if (!M.gw || !M.gh) return;
    const { gw, gh } = M, lx = M.lm.getContext("2d"), bx = M.bm.getContext("2d"), li = lx.createImageData(gw, gh), bi = bx.createImageData(gw, gh), d = li.data, e = bi.data;
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const px = x + .5, py = y + .5; let r = amb, g = amb, b = amb, br = 0, bg = 0, bb = 0;
      for (const tb of tubes) {
        const q = tubeQ(tb, px, py), G = GAS[tb.gas].L;
        if (q) { r += G[0] * q; g += G[1] * q; b += G[2] * q; }
        const uc = Math.max(tb.a, Math.min(tb.b + 1, px)), seg = tb.segs.find(s => uc >= s.a && uc <= s.b + 1) || tb.segs[0], p = seg.p; if (p <= 0) continue;
        const du = Math.abs(px - uc), dv = py - (tb.c + .5), dd = Math.hypot(du, dv);
        if (dd < 2.7 && (Math.abs(dv) >= 1.5 || du > 0)) { const kk = (dd < 2 ? .3 : .15) * (p >= .55 ? 1 : .5); br += G[0] * kk; bg += G[1] * kk; bb += G[2] * kk; }
      }
      const i = (y * gw + x) * 4, Q = v => Math.round(Math.min(1, v) * 10) / 10 * 255;
      d[i] = Q(r); d[i + 1] = Q(g); d[i + 2] = Q(b); d[i + 3] = 255;
      e[i] = br * 255; e[i + 1] = bg * 255; e[i + 2] = bb * 255; e[i + 3] = 255;
    }
    lx.putImageData(li, 0, 0); bx.putImageData(bi, 0, 0);
    M.light = d;
    for (const [c, src] of [[M.lt, M.lm], [M.bl, M.bm]]) { const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.clearRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0, c.width, c.height); }
  }
  /* la lámpara y los tubos (lo que luce no se multiplica; el latón y los bornes reciben la luz de la carta) */
  function paint(tubes) {
    const { k, gw } = M, c = M.fg.getContext("2d"), L = M.L, d = M.light;
    c.clearRect(0, 0, M.fg.width, M.fg.height);
    const cell = (x, y, h, emis) => { if (x < 0 || y < 0 || x >= gw || y >= M.gh) return; let col = hx(h); if (!emis) { const i = (y * gw + x) * 4; col = [col[0] * d[i] / 255 | 0, col[1] * d[i + 1] / 255 | 0, col[2] * d[i + 2] / 255 | 0]; } c.fillStyle = "rgb(" + col + ")"; c.fillRect(x * k, y * k, k, k); };
    const top = L.top, mid = L.cx2 / 2, pa = Math.ceil(mid) - 5, pb = Math.floor(mid) + 5;   // la placa, centrada (10 u 11 de ancho según la paridad)
    for (let x = pa; x <= pb; x++) { cell(x, top, K.b1); cell(x, top + 1, K.b2); cell(x, top + 2, K.b3); }
    cell(pa + 1, top + 1, K.b4); cell(pb - 1, top + 1, K.b4);                     // los tornillos
    const armX = L.cx2 % 2 ? [Math.floor(mid), Math.ceil(mid)] : [mid];          // el brazo: 2 de ancho (o 1 si el centro cae en una columna)
    for (let y = top + 3; y <= top + 6; y++) for (const x of armX) cell(x, y, K.b2);
    const sa = L.ta - 4, sb = L.tb + 4;                                            // la barra y los soportes, 4 por fuera del tubo
    for (let x = sa + 1; x <= sb - 1; x++) if (!armX.includes(x)) cell(x, top + 6, K.b4);
    for (let x = sa; x <= sb; x++) { cell(x, top + 7, K.b2); cell(x, top + 8, K.b1); }
    for (let y = top + 9; y <= M.fy0 - 2; y++) { cell(sa, y, K.b3); cell(sa + 1, y, K.b2); cell(sb - 1, y, K.b2); cell(sb, y, K.b3); }
    for (const tb of tubes) {
      for (let i = tb.a; i <= tb.b; i++) {
        const seg = tb.segs.find(s => i >= s.a && i <= s.b) || tb.segs[0], G = GAS[tb.gas], p = seg.p;
        const rows = p >= .85 ? [G.body, G.core, G.body] : p >= .55 ? [G.body, G.body, G.body] : p >= .2 ? [G.dim, G.body, G.dim] : null, prof = rows || GLASS;
        for (let j = -1; j <= 1; j++) { if ((i === tb.a || i === tb.b) && j) continue; cell(i, tb.c + j, prof[j + 1], !!rows); }
      }
      for (const i of [tb.a - 2, tb.a - 1, tb.b + 1, tb.b + 2]) for (let j = -1; j <= 1; j++) cell(i, tb.c + j, j === -1 ? K.boot : K.black);   // los bornes
    }
  }
  A.neon = { mount, unmount, on: () => !!M };
})(window.AIQ);
