/*
 * Geolite - LA CASA (v0.3.52 · paso 4 de la mesa de diseno, Fase 1 de "La sala viva").
 *
 *  - La luz de la sala (#sala): una lampara sobre lo que importa en cada pantalla y penumbra media alrededor, a bandas de pixel con una
 *    costura de trama solo en el borde de cada banda (nada de grano). Es una imagen fija: se calcula en un hilo aparte (Worker) SOLO cuando
 *    cambia lo que hay en pantalla y entra con un fundido. En cada fotograma no cuesta nada: es una capa compuesta mas, como la vineta de siempre.
 *  - Lo que hay que leer siempre tiene luz: cada pieza (placa, ticket, cartas, botones) lleva su suelo de luz; la penumbra solo se come lo que sobra.
 *  - En partida, la lampara sobre la mesa: el centro del mapa no cambia nunca (la tierra no cambia de color) y la sala se calma (el remolino
 *    del oceano baja la voz). La sombra solo toca los bordes.
 *  - Ajustes > Pantalla > Luces de la sala: completas, suaves o apagadas (vuelve la vineta de siempre).
 *  - El director de golpes: premio, perdida e impacto salen de aqui con la misma escala de sonido, temblor y vibracion en todo el juego.
 *    En la Fase 2 la luz respondera desde estos mismos sitios.
 *  - Las bombillas de la casa (A.bulbs, js/art.js) laten con un solo reloj (A.casa.MQ_P); aqui se vuelven a poner en fase tras cada pantalla.
 *
 * Capas (#app): mapa < HUD (z 5-6) < #layer (4) < #intro (6) < #sala (7) < #tip (30) < avisos (40) < pausa (60) < Ajustes (62) < crupier y mesas.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const $ = id => document.getElementById(id);
  const core = () => A.core || {};
  const MQ_P = 1140;                                                    // el reloj de las bombillas: tres pasos de 380 ms

  /* ================================================================ la luz: el calculo (el mismo codigo corre en el Worker o, si no hay, aqui) */
  /* p: { w, h, c (px por celda), amb (luz minima), bands, dark (fuerza de la sombra), rgb, pools [[cx, cy, rx, ry, k]], floors [[x0, y0, x1, y1, luz, borde]], keep [cx, cy, rx, ry] } */
  function paint(p) {
    const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], W = p.w, H = p.h, c = p.c, amb = p.amb, N = p.bands, SEAM = 0.12;
    const pools = p.pools, floors = p.floors, keep = p.keep, out = new Uint8ClampedArray(W * H * 4), r = p.rgb[0], g = p.rgb[1], b = p.rgb[2];
    for (let j = 0; j < H; j++) {
      const y = (j + 0.5) * c;
      for (let i = 0; i < W; i++) {
        const x = (i + 0.5) * c;
        let pool = 0;
        for (let k = 0; k < pools.length; k++) { const q = pools[k], dx = (x - q[0]) / q[2], dy = (y - q[1]) / q[3], d2 = dx * dx + dy * dy; if (d2 < 1) { const f = (1 - d2) * q[4]; if (f > pool) pool = f; } }
        let L = amb + (1 - amb) * (pool > 1 ? 1 : pool);
        for (let k = 0; k < floors.length; k++) {
          const f = floors[k], ox = Math.max(f[0] - x, 0, x - f[2]), oy = Math.max(f[1] - y, 0, y - f[3]);
          if (ox < f[5] && oy < f[5]) { const o = Math.sqrt(ox * ox + oy * oy); if (o < f[5]) { let t = 1 - o / f[5]; t = t * t * (3 - 2 * t); const v = L + (f[4] - L) * t; if (v > L) L = v; } }
        }
        if (keep) { const dx = (x - keep[0]) / keep[2], dy = (y - keep[1]) / keep[3], d = Math.sqrt(dx * dx + dy * dy); if (d < 1) { let t = d < 0.78 ? 1 : 1 - (d - 0.78) / 0.22; t = t * t * (3 - 2 * t); L += (1 - L) * t; } }
        let t = (L - amb) / (1 - amb); t = t < 0 ? 0 : t > 1 ? 1 : t;
        const xv = t * N; let s = Math.floor(xv); const fr = xv - s;
        if (fr > 1 - SEAM && B[(i & 3) + ((j & 3) << 2)] / 16 < (fr - (1 - SEAM)) / SEAM) s++;   // la costura de trama, solo en el borde de cada banda
        L = amb + (1 - amb) * Math.min(1, s / N);
        const o4 = (j * W + i) * 4; out[o4] = r; out[o4 + 1] = g; out[o4 + 2] = b; out[o4 + 3] = Math.round((1 - L) * p.dark * 255);
      }
    }
    return out;
  }
  /* el Worker entrega la luz ya hecha imagen (ImageBitmap): el hilo principal solo la pone en su lienzo, sin copiar pixeles */
  const WORKER_SRC = `const paint = ${paint.toString()};
onmessage = e => { const p = e.data, out = paint(p);
  if (typeof OffscreenCanvas === "function") { const oc = new OffscreenCanvas(p.w, p.h); oc.getContext("2d").putImageData(new ImageData(out, p.w, p.h), 0, 0); const bmp = oc.transferToImageBitmap(); postMessage({ id: p.id, w: p.w, h: p.h, bmp }, [bmp]); }
  else postMessage({ id: p.id, w: p.w, h: p.h, buf: out.buffer }, [out.buffer]); };`;

  /* ================================================================ la luz: las reglas de cada pantalla */
  const vis = el => {
    if (!el || !el.isConnected) return null; const r = el.getBoundingClientRect();
    return r.width < 8 || r.height < 8 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth ? null : r;
  };
  const all = (sel, root) => [...(root || document).querySelectorAll(sel)].map(vis).filter(Boolean);
  const union = rs => rs.length ? rs.reduce((u, r) => ({ left: Math.min(u.left, r.left), top: Math.min(u.top, r.top), right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom) }), { left: 1e9, top: 1e9, right: -1e9, bottom: -1e9 }) : null;
  /* una lampara centrada en una pieza: sx/sy agrandan su radio respecto a la pieza; k > 1 deja meseta de luz plena en el centro */
  const pool = (r, sx, sy, k = 1.25) => r ? [(r.left + r.right) / 2, (r.top + r.bottom) / 2, Math.max(60, (r.right - r.left) / 2 * sx), Math.max(60, (r.bottom - r.top) / 2 * sy), k] : null;
  /* el suelo de luz de una pieza que se lee: nunca baja de `lv` dentro de ella, y se funde con la sala en `soft` px */
  const floor = (r, lv, soft) => r ? [r.left - 6, r.top - 6, r.right + 6, r.bottom + 6, lv, soft] : null;
  /* las piezas de una pantalla de gala: las de su reticula de 12 columnas o, si no la usa (la Clasificacion), sus bloques y lo que llevan dentro */
  const stageKids = st => { const k = all(".gx-grid > *", st); return k.length ? k : all(":scope > *, :scope > * > *", st); };
  function rule() {
    const W = innerWidth, H = innerHeight, S = Math.min(W, H) * 0.11, s = S * 0.3, lay = $("layer"), dlg = $("dlg"), intro = $("intro");
    const P = [], F = [], add = (arr, x) => { if (x) arr.push(x); };
    /* lo que se lee (papel, botones, titulos) va a luz plena con un borde corto: sobre el papel nunca cae el borde de una banda.
       Los contenedores de fieltro llevan un suelo mas bajo y borde largo: sobre ellos si se ve la caida de la lampara */
    const fl = (rs, lv, soft = S) => rs.forEach(r => add(F, floor(r, lv, soft)));
    if (intro && !intro.classList.contains("hidden") && !intro.classList.contains("out")) {                          // intro de ronda o de jefe
      const kids = all(".intro-in > *", intro); add(P, pool(union(kids), 1.3, 1.5)); fl(kids, 1, s);
      return { key: "intro", pools: P, floors: F, root: intro };
    }
    const top = lay && !lay.classList.contains("hidden") ? [...lay.querySelectorAll(":scope > :not(#dlg) .gx-stage")].pop() : null;
    if (top) {                                                                                                      // la Clasificacion: va en #layer, encima de la portada
      const kids = stageKids(top); add(P, pool(union(kids), 1.18, 1.32, 1.35)); fl(kids, 1, s);
      return { key: "stage", pools: P, floors: F, root: top.parentElement || top };
    }
    if (lay && !lay.classList.contains("hidden") && dlg) {
      if (dlg.classList.contains("home")) {                                                                          // portada: la lampara sobre las tres cartas
        const cards = all(".hh-cards > *", dlg), u = union(cards);
        add(P, pool(u, 1.45, 1.6)); add(P, pool(vis(dlg.querySelector(".hh-logo")), 1.45, 2, 1.1));
        fl(cards, 1, s); fl(all(".hh-logo, .hh-tag, .hh-resume, .hh-bottom > *", dlg), 1, s); fl(all(".hh-top > *, #hud > *, #dockSh, #railSh", dlg.ownerDocument), 0.95, s);
        return { key: "home", pools: P, floors: F, root: dlg };
      }
      const vd = dlg.querySelector(".gx-vd");
      if (vd) {                                                                                                     // ronda superada o fallida: el ticket bajo su lampara
        const tk = vis(vd.querySelector(".gx-vd-ticket")), hd = vis(vd.querySelector(".gx-vd-head"));
        add(P, pool(tk, 1.55, 1.2)); add(P, pool(hd, 1.35, 1.5, 1.05));
        fl([tk, hd].filter(Boolean), 1, s); fl(all(".gx-vd-side > *", vd), 0.96, s); fl(all(".gx-vd-acts .gx-btn, .gx-vd-acts .gx-mq", vd), 1, s);
        return { key: "vd", pools: P, floors: F, root: vd };
      }
      const camp = dlg.querySelector(".gx-camp");
      if (camp) {                                                                                                   // el Campamento: la mesa de cartas y el boleto
        add(P, pool(vis(camp.querySelector(".tb-shop")), 1.22, 1.5)); add(P, pool(vis(camp.querySelector(".tb-next")), 1.3, 1.18, 1.2));
        fl(all(".tb-shop", camp), 0.72); fl(all(".tb-sup, .tb-tray", camp), 0.86);
        fl(all(".offer, .tb-deck, .sup, .tb-next, .go2-wrap, :scope > .tb-head > *", camp), 1, s);
        return { key: "camp", pools: P, floors: F, root: camp };
      }
      const stage = dlg.querySelector(".gx-stage");
      if (stage) {                                                                                                  // pantallas de gala (Aventura, Clasico, Reto, Perfil...)
        const kids = stageKids(stage); add(P, pool(union(kids), 1.18, 1.32, 1.35));
        fl(kids, 1, s);                                                                                             // son tableros para leer: todo a luz plena, la penumbra en los margenes
        return { key: "stage", pools: P, floors: F, root: dlg };
      }
      if (!dlg.classList.contains("side")) {                                                                        // cualquier otro cuadro centrado
        const kids = all(":scope > *", dlg); add(P, pool(union(kids), 1.4, 1.5)); fl(kids, 1, s);
        return { key: "box", pools: P, floors: F, root: dlg };
      }
    }
    /* partida: la lampara sobre la mesa. El centro del mapa queda intacto; las piezas del HUD, con su luz */
    add(P, [W / 2, H / 2, W * 0.8, H * 0.86, 1.2]);
    fl(all("#leftCol > *, #hud > *, #ledgerSh, #noteSh, #toolBar, .tool-bar, #railSh, #dockSh"), 1, s);
    if (dlg && dlg.classList.contains("side") && lay && !lay.classList.contains("hidden")) fl([vis(dlg)].filter(Boolean), 1, s);
    return { key: "play", pools: P, floors: F, keep: [W / 2, H * 0.53, W * 0.46, H * 0.44], calm: 1, root: $("ledgerSh") };
  }

  /* ================================================================ la luz: dibujo, fundido y cuando recalcular */
  const LUX = { full: { amb: 0.38, dark: 1 }, soft: { amb: 0.38, dark: 0.5 } };   // penumbra media (respuesta lz_penumbra): en lo mas oscuro, 38 % de luz
  let root = null, cvs = [], front = 0, wk = null, seq = 0, sig = "", mode = "full", tm = 0, tm2 = 0, map = null;
  const onMap = async d => {
    if (d.id !== seq || !root) { if (d.bmp) d.bmp.close(); return; }   // llego tarde: ya hay otra luz en camino
    let bmp = d.bmp;
    if (!bmp) { try { bmp = await createImageBitmap(new ImageData(new Uint8ClampedArray(d.buf), d.w, d.h)); } catch (e) { return; } if (d.id !== seq) { bmp.close(); return; } }
    const back = cvs[1 - front];
    back.getContext("bitmaprenderer").transferFromImageBitmap(bmp);      // sin copiar: el lienzo se queda con la imagen tal cual
    back.style.width = d.w * d.c + "px"; back.style.height = d.h * d.c + "px";
    back.classList.add("on"); cvs[front].classList.remove("on"); front = 1 - front; root.classList.remove("neutral");
  };
  function worker() {
    if (wk !== null) return wk;
    try { wk = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }))); wk.onmessage = e => onMap({ ...e.data, c: wk._c[e.data.id] }); wk._c = {}; wk.onerror = () => { wk = false; }; }
    catch (e) { wk = false; }
    return wk;
  }
  function look() {
    if (!root || mode === "off") return;
    const W = innerWidth, H = innerHeight; if (!W || !H) return;
    const R = rule(), L = LUX[mode], k = Math.min(W / 1280, H / 720), c = Math.max(2, Math.round(2 * k));
    const p = { w: Math.ceil(W / c), h: Math.ceil(H / c), c, amb: L.amb, dark: L.dark, bands: 6, rgb: [2, 9, 8], pools: R.pools, floors: R.floors, keep: R.keep || null };
    const s = JSON.stringify([mode, p.w, p.h, R.key, R.pools.map(q => q.map(v => Math.round(v / 6))), R.floors.map(q => q.map(v => Math.round(v / 6))), p.keep]);
    if (map) map.calm = R.calm ? 1 : 0;                                 // en partida el remolino del oceano baja la voz (js/map.js)
    syncBulbs();
    if (s === sig) return; sig = s;
    const id = p.id = ++seq, w = worker();
    if (w) { w._c[id] = c; w.postMessage(p); }
    else onMap({ id, w: p.w, h: p.h, c, buf: paint(p).buffer });         // sin Worker (no deberia pasar): se calcula aqui, una vez por pantalla
  }
  /* algo ha cambiado en pantalla: se mira cuando ha terminado de entrar y otra vez al final por si algo crecio despues.
     Siempre en un hueco libre del hilo principal (requestIdleCallback): ni una medida ni un mensaje en mitad de una animacion */
  const idle = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : requestAnimationFrame(fn));
  /* cambio de pantalla (no una pieza que entra en partida): la luz de la pantalla anterior se va enseguida a una penumbra neutra, para que su
     sombra no se quede un instante encima de la nueva; la luz nueva entra con su fundido en cuanto esta lista */
  function neutral() { if (!root) return; cvs.forEach(c => c.classList.remove("on")); root.classList.add("neutral"); sig = ""; seq++; }
  /* que pantalla es, sin medir nada (solo clases): si cambia, la luz vieja se va; si es la misma (el Campamento al comprar, una pieza nueva
     en partida), la luz se ajusta sin apagarse */
  let lastKind = "";
  function kind() {
    const lay = $("layer"), dlg = $("dlg"), intro = $("intro");
    if (intro && !intro.classList.contains("hidden") && !intro.classList.contains("out")) return "intro";
    const top = lay && !lay.classList.contains("hidden") ? [...lay.querySelectorAll(":scope > :not(#dlg) .gx-stage")].pop() : null;
    if (top) return "stage " + top.className;
    if (lay && !lay.classList.contains("hidden") && dlg) {
      if (dlg.classList.contains("home")) return "home";
      if (dlg.querySelector(".gx-vd")) return "vd";
      if (dlg.querySelector(".gx-camp")) return "camp";
      const st = dlg.querySelector(".gx-stage"); if (st) return "stage " + st.className;
      if (!dlg.classList.contains("side")) return "box";
    }
    return "play";
  }
  function mira(changed) {
    if (!root || mode === "off") return;
    if (changed === true) { const k = kind(); if (k !== lastKind) { if (lastKind) neutral(); lastKind = k; } }
    clearTimeout(tm); clearTimeout(tm2);
    tm = setTimeout(() => idle(look), 650);                            // las pantallas ya han entrado (deslizan unos 350-500 ms): se miden quietas
    tm2 = setTimeout(() => idle(look), 1600);
  }

  /* ================================================================ las bombillas: un solo reloj */
  /* A.bulbs nace ya en fase (--mq-s, sacado del reloj del documento). Si se pinto oculta y empezo tarde, aqui se pone en hora para siempre:
     retraso base 0 y startTime 0 (el origen del reloj del documento), asi todas comparten el mismo paso */
  function syncBulbs() {
    const ws = [...document.querySelectorAll(".mqw")].filter(w => w.style.getPropertyValue("--mq-s") !== "0ms"); if (!ws.length) return;
    ws.forEach(w => w.style.setProperty("--mq-s", "0ms"));
    ws.forEach(w => w.querySelectorAll(".mq-lit").forEach(el => el.getAnimations && el.getAnimations().forEach(a => { a.startTime = 0; })));
  }

  /* ================================================================ el director de golpes */
  const shake = n => { const f = core().jpShake; if (f) f(n); };
  const gapMs = () => Math.round(((A.audio && A.audio.jpGap) || 0.46) * 1000);
  /* premio de nivel n (1-3): los jackpots de la casa (sonido), un temblor por golpe que crece al compas (1, 2, 3) y la vibracion del movil.
     o.fuerza: el ultimo temblor pega mas que el nivel (el verde de la ruleta); o.mudo: el sonido ya lo pone quien llama */
  function premio(n, o = {}) {
    n = Math.max(1, Math.min(3, n | 0));
    if (!o.mudo && A.sfx && A.sfx.jackpot) A.sfx.jackpot(n);
    if (A.haptic && A.haptic.jackpot) A.haptic.jackpot(n);
    const top = Math.max(n, o.fuerza | 0), g = gapMs();
    for (let k = 1; k <= n; k++) { const lvl = k === n ? top : k; if (k === 1) shake(lvl); else setTimeout(() => shake(lvl), (k - 1) * g); }
  }
  /* perdida: la apuesta que se va. Sonido de perder (o el que traiga quien llama) y un temblor seco */
  function perdida(o = {}) { if (!o.mudo && A.sfx && A.sfx.lose) A.sfx.lose(); shake(o.fuerza || 1); if (A.haptic) A.haptic([40, 20, 40]); }
  /* impacto: un golpe fisico sin premio (un sello, un dado contra la banda, una reliquia que paga) */
  function impacto(n = 1) { shake(Math.max(1, Math.min(3, n | 0))); }

  /* ================================================================ ajuste y arranque */
  function set(m) {
    mode = LUX[m] || m === "off" ? m : "full";
    document.documentElement.classList.toggle("sala-on", mode !== "off"); document.documentElement.classList.toggle("sala-soft", mode === "soft");
    if (root) root.classList.toggle("hidden", mode === "off");
    if (map) { map.vigK = mode === "off" ? 1 : 0.55; if (mode === "off") map.calm = 0; map.dirty = true; }
    sig = ""; if (mode !== "off") mira();
  }
  function init(m, how) {
    map = m || null;
    root = document.createElement("div"); root.id = "sala"; root.setAttribute("aria-hidden", "true");
    root.innerHTML = "<canvas></canvas><canvas></canvas>"; cvs = [...root.children];
    const app = $("app"), ref = $("intro"); if (ref && ref.parentNode === app) app.insertBefore(root, ref.nextSibling); else app.appendChild(root);
    /* que mirar: cambios de pantalla (#layer, #dlg, #intro), las piezas que entran y salen en partida (#leftCol, el ticket del marcador) y el tamano */
    const mo = new MutationObserver(() => mira(true));
    [["layer", { attributes: true, attributeFilter: ["class"], childList: true }], ["dlg", { attributes: true, attributeFilter: ["class"], childList: true }], ["intro", { attributes: true, attributeFilter: ["class"] }],
      ["leftCol", { childList: true }], ["ledgerSh", { childList: true }]].forEach(([id, o]) => { const el = $(id); if (el) mo.observe(el, o); });
    addEventListener("resize", () => { sig = ""; mira(); });
    set(how || "full");
  }

  A.casa = { init, set, mira, premio, perdida, impacto, MQ_P, get modo() { return mode; }, _regla: () => rule() };   // _regla: para las pruebas
})(window.AIQ);
