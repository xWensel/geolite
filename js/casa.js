/*
 * Geolite - LA CASA (v0.3.52 · paso 4 de la mesa de diseno, Fase 1 de "La sala viva").
 *
 *  - La luz de la sala (#sala): una lampara sobre lo que importa en cada pantalla y penumbra media alrededor, a bandas de pixel con una
 *    costura de trama solo en el borde de cada banda (nada de grano). Es una imagen fija: se calcula en un hilo aparte (Worker) SOLO cuando
 *    cambia lo que hay en pantalla y entra con un fundido. En cada fotograma no cuesta nada: es una capa compuesta mas, como la vineta de siempre.
 *  - La penumbra va SIEMPRE pegada al fondo, por detras de todas las piezas (v0.3.58): cae sobre el mapa o sobre el velo de la pantalla y nunca
 *    sobre una carta, un boton, una pestana o el crupier. Ninguna pieza necesita "su" luz: estan delante y se ven enteras.
 *  - En partida, la lampara sobre la mesa: el centro del mapa no cambia nunca (la tierra no cambia de color) y la sala se calma (el remolino
 *    del oceano baja la voz). La sombra solo toca los bordes.
 *  - Ajustes > Pantalla > Luces de la sala: completas, suaves o apagadas (vuelve la vineta de siempre).
 *  - El director de golpes: premio, perdida e impacto salen de aqui con la misma escala de sonido, temblor y vibracion en todo el juego.
 *  - v0.3.54 (Fase 2, los golpes): la sala responde. Toda la luz que cambia lo hace SOLO en la penumbra (el mismo mapa de luz); las piezas
 *    no cambian nunca. La lampara sube (luz calida un instante: A.casa.luz), baja (A.casa.baja) o barre la sala (A.casa.barrido); la noche
 *    avanza por actos (color y fuerza de la penumbra: A.casa.acto) y, cuando llega el jefe, la penumbra se cierra, enrojece y late.
 *    Todo son capas con animacion de opacidad o de transform: lo hace el compositor, sin repintar.
 *  - Las bombillas de la casa (A.bulbs, js/art.js) laten con un solo reloj (A.casa.MQ_P); aqui se vuelven a poner en fase tras cada pantalla.
 *  - v0.3.57 (Fase 3c): ese reloj es el compas de la cancion que suena: un paso por pulso. Sin musica, el reloj de la casa de siempre.
 *
 * Donde vive #sala (v0.3.58): en partida, en #app justo encima del mapa y por debajo del HUD; en la portada, el veredicto y los cuadros, dentro de
 * #layer (encima de su velo, debajo de todo lo demas); en la intro de ronda o de jefe, dentro de #intro (encima del telon, debajo del cartel y del
 * crupier). Las pantallas con tapete propio (Campamento, Aventura, Clasico, Reto, Perfil, Notas, Clasificacion) ya traen su lampara pintada en el
 * fieltro: ahi la luz de la sala no entra.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const $ = id => document.getElementById(id);
  const core = () => A.core || {};
  const MQ_P = 1140;                                                    // el reloj de la casa para las bombillas: tres pasos de 380 ms

  /* ================================================================ la luz: el calculo (el mismo codigo corre en el Worker o, si no hay, aqui) */
  /* p: { w, h, c (px por celda), amb (luz minima), bands, dark (fuerza de la sombra), rgb, pools [[cx, cy, rx, ry, k]], keep [cx, cy, rx, ry],
          cones [[ax, ay, bx, by, r0, r1, k]] (v0.3.70: el cono de un foco o de una lampara colgada, de su boca a lo que alumbra) }
     Las lamparas (pools) son lo unico que da forma a la penumbra: una caida suave y redonda, justificada por la lampara. Nada mas: la capa va
     por detras de todas las piezas, asi que no hay recortes ni recuadros de luz con forma de nada (los hubo hasta la v0.3.57 y se veian) */
  function paint(p) {
    const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], W = p.w, H = p.h, c = p.c, amb = p.amb, N = p.bands, SEAM = 0.12;
    const pools = p.pools, keep = p.keep, cones = p.cones || [], out = new Uint8ClampedArray(W * H * 4), r = p.rgb[0], g = p.rgb[1], b = p.rgb[2];
    const at = (x, y) => {
      let pool = 0;
      /* un cono: de la boca [ax, ay] (medio ancho r0) a lo que alumbra [bx, by] (medio ancho r1); pierde fuerza con la distancia y muere un poco mas alla */
      for (let k = 0; k < cones.length; k++) { const q = cones[k], vx = q[2] - q[0], vy = q[3] - q[1], t = ((x - q[0]) * vx + (y - q[1]) * vy) / (vx * vx + vy * vy);
        if (t > 0 && t < 1.3) { const qx = q[0] + vx * t, qy = q[1] + vy * t, d2 = (x - qx) * (x - qx) + (y - qy) * (y - qy), rr = q[4] + (q[5] - q[4]) * t;
          if (d2 < rr * rr) { let f = (1 - d2 / (rr * rr)) * q[6] * (1 - 0.3 * (t > 1 ? 1 : t)); if (t > 1) f *= 1 - (t - 1) / 0.3; if (f > pool) pool = f; } } }
      for (let k = 0; k < pools.length; k++) { const q = pools[k], dx = (x - q[0]) / q[2], dy = (y - q[1]) / q[3], d2 = dx * dx + dy * dy; if (d2 < 1) { const f = (1 - d2) * q[4]; if (f > pool) pool = f; } }
      let L = amb + (1 - amb) * (pool > 1 ? 1 : pool);
      if (keep) { const dx = (x - keep[0]) / keep[2], dy = (y - keep[1]) / keep[3], d = Math.sqrt(dx * dx + dy * dy); if (d < 1) { let t = d < 0.78 ? 1 : 1 - (d - 0.78) / 0.22; t = t * t * (3 - 2 * t); L += (1 - L) * t; } }
      return L;
    };
    for (let j = 0; j < H; j++) {
      const y = (j + 0.5) * c;
      for (let i = 0; i < W; i++) {
        const x = (i + 0.5) * c;
        let L = at(x, y);
        let t = (L - amb) / (1 - amb); t = t < 0 ? 0 : t > 1 ? 1 : t;
        const xv = t * N; let s = Math.floor(xv); const fr = xv - s;
        if (fr > 1 - SEAM && B[(i & 3) + ((j & 3) << 2)] / 16 < (fr - (1 - SEAM)) / SEAM) s++;   // la costura de trama, solo en el borde de cada banda
        L = amb + (1 - amb) * Math.min(1, s / N);
        const o4 = (j * W + i) * 4; out[o4] = r; out[o4 + 1] = g; out[o4 + 2] = b; out[o4 + 3] = Math.round((1 - L) * p.dark * 255);
      }
    }
    return out;
  }
  /* la luz que sube: el mismo mapa (mismo alfa) en el color de la lampara. Donde no hay penumbra no hay nada que encender */
  function tint(buf, rgb) { const g = new Uint8ClampedArray(buf); for (let i = 0; i < g.length; i += 4) { g[i] = rgb[0]; g[i + 1] = rgb[1]; g[i + 2] = rgb[2]; } return g; }
  /* el Worker entrega las dos imagenes ya hechas (ImageBitmap): el hilo principal solo las pone en sus lienzos, sin copiar pixeles */
  const WORKER_SRC = `const paint = ${paint.toString()};\nconst tint = ${tint.toString()};
onmessage = e => { const p = e.data, out = paint(p), glo = tint(out, p.glow);
  if (typeof OffscreenCanvas === "function") { const mk = b => { const oc = new OffscreenCanvas(p.w, p.h); oc.getContext("2d").putImageData(new ImageData(b, p.w, p.h), 0, 0); return oc.transferToImageBitmap(); }; const bmp = mk(out), gbmp = mk(glo); postMessage({ id: p.id, w: p.w, h: p.h, bmp, gbmp }, [bmp, gbmp]); }
  else postMessage({ id: p.id, w: p.w, h: p.h, buf: out.buffer, gbuf: glo.buffer }, [out.buffer, glo.buffer]); };`;

  /* ================================================================ la luz: las reglas de cada pantalla */
  const vis = el => {
    if (!el || !el.isConnected) return null; const r = el.getBoundingClientRect();
    return r.width < 8 || r.height < 8 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth ? null : r;
  };
  const all = (sel, root) => [...(root || document).querySelectorAll(sel)].map(vis).filter(Boolean);
  const union = rs => rs.length ? rs.reduce((u, r) => ({ left: Math.min(u.left, r.left), top: Math.min(u.top, r.top), right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom) }), { left: 1e9, top: 1e9, right: -1e9, bottom: -1e9 }) : null;
  /* una lampara centrada en una pieza: sx/sy agrandan su radio respecto a la pieza; k > 1 deja meseta de luz plena en el centro */
  const pool = (r, sx, sy, k = 1.25) => r ? [(r.left + r.right) / 2, (r.top + r.bottom) / 2, Math.max(60, (r.right - r.left) / 2 * sx), Math.max(60, (r.bottom - r.top) / 2 * sy), k] : null;
  function rule() {
    const W = innerWidth, H = innerHeight, lay = $("layer"), dlg = $("dlg"), intro = $("intro");
    const P = [], add = x => { if (x) P.push(x); };
    if (document.body.classList.contains("cx-on")) return { key: "codex", off: 1 };                                 // la Enciclopedia es un aparato con su propia pantalla: la luz de la sala no entra
    /* donde este el crupier (intro, veredicto), una lampara detras de el: se ve como halo, nunca le pasa por encima */
    const crupier = root => add(pool(vis(root.querySelector(".dealer")), 1.3, 1.25, 2.2));
    if (intro && !intro.classList.contains("hidden") && !intro.classList.contains("out")) {                          // intro de ronda o de jefe: una lampara sobre el cartel entero
      const E = A.escena && A.escena.luz && A.escena.luz();
      if (E) { E.pools.forEach(add); crupier(intro); return { key: "intro", pools: P, cones: E.cones, esc: 1, boss: !!intro.querySelector(".intro-in.is-boss") }; }   // v0.3.72: el escenario (js/escena.js): un cono por lampara
      add(pool(union(all(".intro-in > *", intro)), 1.4, 1.7, 1.9)); crupier(intro);
      return { key: "intro", pools: P, boss: !!intro.querySelector(".intro-in.is-boss") };
    }
    if (lay && !lay.classList.contains("hidden") && dlg) {
      if (lay.querySelector(":scope > :not(#dlg) .gx-stage") || dlg.querySelector(".gx-camp, .gx-stage")) return { key: "stage", off: 1 };   // tapete propio: su lampara ya va pintada en el fieltro
      if (dlg.classList.contains("home")) {                                                                          // portada: la lampara sobre las tres cartas y otra sobre el cartel
        const E = A.escena && A.escena.luzPortada && A.escena.luzPortada();
        if (E) { E.pools.forEach(add); return { key: "home", pools: P, cones: E.cones }; }                             // v0.3.70: con sus focos de sala (js/escena.js): un cono por foco
        add(pool(union(all(".hh-cards > *", dlg)), 1.5, 1.7, 1.3)); add(pool(vis(dlg.querySelector(".hh-logo")), 1.5, 2.1, 1.15));
        return { key: "home", pools: P };
      }
      const vd = dlg.querySelector(".gx-vd");
      if (vd) {                                                                                                     // ronda superada o fallida: el ticket bajo su lampara y otra sobre el cartel
        add(pool(vis(vd.querySelector(".gx-vd-ticket")), 1.7, 1.3, 1.4)); add(pool(vis(vd.querySelector(".gx-vd-head")), 1.5, 1.7, 1.5)); add(pool(vis(vd.querySelector(".gx-vd-side")), 1.5, 1.4, 1.5));
        crupier(vd);
        { const E = A.escena && A.escena.luzCaja && A.escena.luzCaja(); if (E) return { key: "vd", pools: P, cones: E.cones }; }   // v0.3.76: el cono de la lampara de la caja (js/escena.js)
        return { key: "vd", pools: P };
      }
      if (!dlg.classList.contains("side")) { add(pool(union(all(":scope > *", dlg)), 1.32, 1.5, 3.2)); return { key: "box", pools: P }; }   // cualquier otro cuadro centrado: una lampara ancha
    }
    /* partida: la lampara sobre la mesa. La penumbra cae sobre el mapa, por debajo del HUD; el centro del mapa queda intacto */
    add([W / 2, H / 2, W * 0.8, H * 0.86, 1.2]);
    return { key: "play", pools: P, keep: [W / 2, H * 0.53, W * 0.46, H * 0.44], calm: 1 };
  }

  /* ================================================================ la luz: dibujo, fundido y cuando recalcular */
  const LUX = { full: { amb: 0.38, dark: 1 }, soft: { amb: 0.38, dark: 0.5 } };   // penumbra media (respuesta lz_penumbra): en lo mas oscuro, 38 % de luz
  /* v0.3.198 (Bloque F, paso 7): el ambiente de la casa, para probarlo en Ajustes > Pantalla. «Original» es el de siempre; Monte Carlo, sombra
     calida de salon; De gala, la de siempre (el color lo pone css/premium.css); Teatro, la sala casi a oscuras y sombra de terciopelo rojo: solo
     se ve bien donde da una lampara, como en el escenario de las intros */
  const AMB = { hoy: null, gala: null, montecarlo: { amb: 0.84, dark: 1.06, rgb: [16, 9, 2] }, teatro: { amb: 0.46, dark: 1.32, rgb: [30, 4, 10] } };
  let ambi = "hoy";
  /* la noche de la expedicion: cambian el color y la fuerza de la penumbra, nunca las piezas ni el centro del mapa.
     Acto I abre la sala; II, medianoche (sombras azul noche, mas cerradas); III, madrugada (grises y mas abiertas); "fin", luces de sala */
  const NOCHE = { 0: { rgb: [2, 9, 8], k: 1 }, 1: { rgb: [10, 8, 58], k: 1.3 }, 2: { rgb: [46, 50, 56], k: 0.8 }, fin: { rgb: [2, 9, 8], k: 0 } };
  const JEFE = { rgb: [46, 4, 9], amb: 0.14, glow: [255, 52, 40] };          // llega el jefe: la penumbra se cierra y enrojece
  const CALIDA = [255, 196, 112];                                           // la luz de la lampara cuando sube
  let root = null, cvs = [], glowCv = null, veil = null, beam = null, front = 0, wk = null, seq = 0, sig = "", mode = "full", tm = 0, tm2 = 0, map = null, act = 0, jefe = false;
  const onMap = async d => {
    const drop = () => { if (d.bmp) d.bmp.close(); if (d.gbmp) d.gbmp.close(); };
    enCurso = false; if (vivoPend) { vivoPend = false; setTimeout(look, 0); }   // v0.3.202: una lampara que se mece pide la siguiente en cuanto llega esta
    if (d.id !== seq || !root) return drop();                           // llego tarde: ya hay otra luz en camino
    let bmp = d.bmp, gbmp = d.gbmp;
    if (!bmp) { try { bmp = await createImageBitmap(new ImageData(new Uint8ClampedArray(d.buf), d.w, d.h)); gbmp = await createImageBitmap(new ImageData(new Uint8ClampedArray(d.gbuf), d.w, d.h)); } catch (e) { return; } if (d.id !== seq) { bmp.close(); gbmp.close(); return; } }
    const back = cvs[1 - front], size = cv => { cv.style.width = d.w * d.c + "px"; cv.style.height = d.h * d.c + "px"; };
    back.getContext("bitmaprenderer").transferFromImageBitmap(bmp); size(back);      // sin copiar: el lienzo se queda con la imagen tal cual
    glowCv.getContext("bitmaprenderer").transferFromImageBitmap(gbmp); size(glowCv);
    back.classList.add("on"); cvs[front].classList.remove("on"); front = 1 - front; root.classList.remove("neutral");
    if (d.boss) glowCv.style.setProperty("--lt", -Math.round(performance.now() % 1000) + "ms"); root.classList.toggle("boss", !!d.boss);
  };
  function worker() {
    if (wk !== null) return wk;
    try { wk = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }))); wk.onmessage = e => { const m = wk._c[e.data.id] || {}; delete wk._c[e.data.id]; onMap({ ...e.data, c: m.c, boss: m.boss }); }; wk._c = {}; wk.onerror = () => { wk = false; }; }
    catch (e) { wk = false; }
    return wk;
  }
  function look() {
    if (!root || mode === "off") return;
    const W = innerWidth, H = innerHeight; if (!W || !H) return;
    const R = rule(), L = LUX[mode], k = Math.min(W / 1280, H / 720), c = Math.max(2, Math.round(2 * k));
    root.classList.toggle("mute", !!R.off);
    charco(R.off ? null : R.key);
    if (R.off) { if (map) map.calm = 0; sig = "off"; seq++; root.classList.remove("boss"); hora(); return; }
    const N = NOCHE[act] || NOCHE[0], boss = !!R.boss;
    const p = { w: Math.ceil(W / c), h: Math.ceil(H / c), c, amb: boss ? JEFE.amb : L.amb, dark: Math.min(1.6, L.dark * (boss ? 1 : N.k)), bands: 6, rgb: boss ? JEFE.rgb : N.rgb, glow: boss ? JEFE.glow : CALIDA, pools: R.pools, keep: R.keep || null, cones: R.cones || null };
    { const X = AMB[ambi]; if (X && !boss && act !== "fin") { p.amb *= X.amb; p.dark = Math.min(1.6, p.dark * X.dark); p.rgb = p.rgb.map((v, i) => Math.round((v + X.rgb[i]) / 2)); } }
    if (R.esc) { p.amb = boss ? 0.12 : 0.16; p.dark = L.dark * 0.92; p.bands = 9; p.rgb = boss ? [18, 2, 5] : [3, 6, 8]; }   // el escenario: a oscuras salvo donde da una lampara; la sombra, casi negra (el color lo pone el telon)
    const s = JSON.stringify([mode, ambi, act, boss, p.w, p.h, R.key, R.esc ? 1 : 0, R.pools.map(q => q.map(v => Math.round(v / 6))), p.keep, (R.cones || []).map(q => q.map(v => Math.round(v / 6)))]);
    if (map) map.calm = R.calm ? 1 : 0;                                 // en partida el remolino del oceano baja la voz (js/map.js)
    hora();
    if (s === sig) return;
    if (vivoOn && enCurso) { vivoPend = true; return; }                // mientras se mece: una luz cada vez (si no, llegarian todas tarde)
    sig = s;
    const id = p.id = ++seq, w = worker();
    if (w) { w._c[id] = { c, boss }; enCurso = true; w.postMessage(p); }
    else { const out = paint(p); onMap({ id, w: p.w, h: p.h, c, boss, buf: out.buffer, gbuf: tint(out, p.glow).buffer }); }   // sin Worker (no deberia pasar): se calcula aqui, una vez por pantalla
  }
  /* v0.3.199 (Bloque F, paso 2): EL CHARCO de luz calida que deja la lampara en el tapete, detras de todas las piezas y solo en los menus
     (portada, veredicto y cuadros): en la partida la tierra nunca cambia de color. x, y, radio en fraccion de la pantalla */
  const CHARCO = { home: [0.5, 0.62, 0.62], vd: [0.5, 0.45, 0.55], box: [0.5, 0.5, 0.6] };
  let charcoK = "";
  function charco(key) {
    const el = root && root.querySelector(".charco"); if (!el) return;
    const c = CHARCO[key], f = mode === "soft" ? 0.6 : 1, k = c ? key + f : "";
    if (k === charcoK) return; charcoK = k;
    if (!c) { el.classList.remove("on"); return; }
    const [x, y, r] = c;
    el.style.background = `radial-gradient(ellipse ${r * 100}% ${r * 78}% at ${x * 100}% ${y * 100}%, rgba(255,200,130,${(0.17 * f).toFixed(3)}) 0%, rgba(255,190,120,${(0.09 * f).toFixed(3)}) 38%, rgba(0,0,0,0) 70%), radial-gradient(ellipse 120% 95% at ${x * 100}% ${y * 100}%, rgba(0,0,0,0) 45%, rgba(3,14,22,${(0.42 * f).toFixed(3)}) 100%)`;
    el.classList.add("on");
  }
  /* v0.3.202 (Bloque F, paso 5): LA LUZ QUE SE MUEVE. Mientras una lampara se mece (js/escena.js), su cono se recalcula al momento, sin esperar
     a un hueco libre y sin fundido (la penumbra va con la lampara); el Worker hace el trabajo y aqui solo se cambia la imagen. Se pide en cada
     fotograma y se apaga sola cuando deja de pedirse */
  let vivoOn = false, vivoPend = false, enCurso = false, vivoT = 0;
  function vivo() {
    if (!root || mode === "off") return;
    if (!vivoOn) { vivoOn = true; root.classList.add("vivo"); }
    clearTimeout(vivoT); vivoT = setTimeout(() => { vivoOn = false; vivoPend = false; if (root) root.classList.remove("vivo"); }, 350);
    look();
  }
  /* algo ha cambiado en pantalla: se mira cuando ha terminado de entrar y otra vez al final por si algo crecio despues.
     Siempre en un hueco libre del hilo principal (requestIdleCallback): ni una medida ni un mensaje en mitad de una animacion */
  const idle = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : requestAnimationFrame(fn));
  /* cambio de pantalla (no una pieza que entra en partida): la luz de la pantalla anterior se va enseguida a una penumbra neutra, para que su
     sombra no se quede un instante encima de la nueva; la luz nueva entra con su fundido en cuanto esta lista */
  function neutral() { if (!root) return; cvs.forEach(c => c.classList.remove("on")); root.classList.add("neutral"); sig = ""; seq++; charco(null); }
  /* que pantalla es, sin medir nada (solo clases): si cambia, la luz vieja se va; si es la misma (el Campamento al comprar, una pieza nueva
     en partida), la luz se ajusta sin apagarse */
  let lastKind = "";
  function kind() {
    const lay = $("layer"), dlg = $("dlg"), intro = $("intro");
    if (document.body.classList.contains("cx-on")) return "codex";
    if (intro && !intro.classList.contains("hidden") && !intro.classList.contains("out")) return intro.querySelector(".intro-in.is-boss") ? "intro jefe" : "intro";
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
  /* donde vive la luz en cada pantalla: siempre pegada a su fondo y por detras de todo lo que se ve en ella (css/gala.css, LA SALA).
     Las pantallas con tapete propio no la usan: se queda donde este, apagada */
  const TAPETE = k => k === "codex" || k === "camp" || k.startsWith("stage");
  function coloca(k) {
    if (!root) return;
    const app = $("app"), h = TAPETE(k) ? (root.isConnected ? null : app) : k.startsWith("intro") ? $("intro") : k === "play" ? app : $("layer");
    if (!h) return;
    if (h === app) { if (root.parentNode !== app) { const ref = app.querySelector(":scope > .vignette"); app.insertBefore(root, ref ? ref.nextSibling : app.firstChild); } }
    else { const tel = h.querySelector(":scope > .esc-telon"), ref = tel ? tel.nextSibling : h.firstChild; if (ref !== root) h.insertBefore(root, ref); }   // el telon de la intro (js/escena.js), por debajo de la luz
  }
  let prisa = 0;                                                        // v0.3.72: el escenario de la intro pide su luz pronto: tiene que estar cuando se encienden las lamparas
  function mira(changed, pronto) {
    if (!root) return;
    if (pronto) prisa = performance.now() + 500;
    /* en que pantalla estas: lo usan la luz y el sonido (con las Luces de la sala apagadas, el sonido sigue sabiendo donde estas) */
    if (changed === true) { const k = kind(); if (k !== lastKind) { if (lastKind && mode !== "off") neutral(); lastKind = k; root.classList.toggle("mute", TAPETE(k)); llegaElJefe(k === "intro jefe"); lugar(k); } }
    coloca(lastKind);                                                   // tambien si la pantalla se ha vuelto a pintar entera y se ha llevado la capa por delante
    if (A.escena && A.escena.caja) A.escena.caja(lastKind === "vd");      // v0.3.76: la lampara de la caja cuelga mientras dura el veredicto
    clearTimeout(tm); clearTimeout(tm2);
    relieve();                                                          // las piezas reciben su luz aunque las Luces de la sala esten apagadas
    if (mode === "off") { tm = setTimeout(hora, 650); return; }       // sin luces de sala, las bombillas siguen en hora
    tm = setTimeout(() => idle(look), performance.now() < prisa ? 140 : 650);   // las pantallas ya han entrado (deslizan unos 350-500 ms): se miden quietas
    tm2 = setTimeout(() => idle(look), 1600);
  }
  /* v0.3.199 (Bloque F, pasos 2 y 3): la luz de cada pieza (js/relieve.js) se mira con la sala: pronto (que no se vea la sombra de antes) y otra
     vez cuando todo ha entrado; si nada se ha movido no hace nada */
  let tr1 = 0, tr2 = 0;
  function relieve() {
    if (!A.relieve) return; clearTimeout(tr1); clearTimeout(tr2);
    tr1 = setTimeout(() => idle(() => { A.relieve.pinta(); if (lastKind === "home") A.relieve.alinea(); }), 90);
    tr2 = setTimeout(() => idle(() => A.relieve.pinta()), 760);
  }

  /* v0.3.55: el sitio en el que estas tambien se oye. En el Campamento la musica llega amortiguada, como desde la sala (js/audio.js) */
  function lugar(k) {
    if (A.music && A.music.room) A.music.room(k === "camp");
    if (k === "home") racha(0);                                          // fuera de la partida, la racha no sigue encendiendo la sala
    /* v0.3.56: y la sala suena distinto en cada sitio (A.amb, js/audio.js): el salon, la sala que baja la voz mientras piensas, la caja,
       la barra del Campamento y el silencio mientras el jefe esta en la mesa. La Enciclopedia es un aparato: queda fuera de la sala */
    const jefe = k === "intro jefe" || ((k === "play" || k === "intro") && A.music && A.music.where === "boss");
    if (A.amb) A.amb.place(k === "codex" ? "fuera" : jefe ? "jefe" : k === "camp" ? "barra" : k === "vd" ? "caja" : k === "play" || k === "intro" ? "calma" : "salon");
  }

  /* ================================================================ las bombillas: un solo reloj, y al compas (v0.3.57) */
  /* Todas las bombillas comparten reloj: cuanto dura la vuelta de tres pasos (mqP) y cuando empezo (mqO, en el reloj del documento).
     Con musica, el paso es un pulso de la cancion que suena (A.music.beat: tempo y primer pulso medidos de cada pista, sin analizar nada
     mientras suena) y cae justo en el pulso. Sin musica, el reloj de la casa: tres pasos de 380 ms.
     Siguen siendo animaciones CSS de opacidad (las mueve el compositor): aqui solo se les dice la duracion (--mq-p) y la hora de inicio
     (startTime) al cambiar de cancion o de pantalla, o si el reproductor se ha ido mas de 35 ms. Por fotograma no se hace nada. */
  const MQ_TOL = 35;
  let mqP = MQ_P, mqO = 0;
  /* A.bulbs nace ya en fase (--mq-p y --mq-s). Si se pinto oculta y empezo tarde, o el reloj ha cambiado, aqui se pone en hora:
     retraso base 0 y startTime = mqO, asi todas dan el mismo paso a la vez */
  function hora() {
    const p = mqP.toFixed(2) + "ms";
    document.querySelectorAll(".mqw").forEach(w => {
      if (w.style.getPropertyValue("--mq-p") !== p) w.style.setProperty("--mq-p", p);
      if (w.style.getPropertyValue("--mq-s") !== "0ms") { w.style.setProperty("--mq-s", "0ms"); w.style.setProperty("--mq-j", "0ms"); }
    });
    document.querySelectorAll(".mqb.mq-lit").forEach(el => el.getAnimations && el.getAnimations().forEach(a => {
      const t = a.animationName === "mq-ch" ? mqO : a.animationName === "mq-latido" ? 0 : null;   // el latido del jefe va con el reloj del documento, como su sonido
      if (t !== null && (a.startTime === null || Math.abs(a.startTime - t) > 1)) a.startTime = t;
    }));
  }
  function compas() {
    const b = A.music && A.music.beat ? A.music.beat() : null, now = performance.now();
    const P = b ? 3 * b.ms : MQ_P, paso = P / 3, T0 = b ? now - b.at : 0;                       // T0: cuando cayo (o caera) el primer pulso
    let e = (((T0 - mqO) % paso) + paso) % paso; e = Math.min(e, paso - e);
    if (Math.abs(P - mqP) < 0.01 && e < MQ_TOL) return;                                         // mismo tempo y en hora: no se toca nada
    mqP = P; mqO = T0 + Math.floor((now - T0) / P) * P - P;                                     // una vuelta entera hacia atras: siempre en el pasado
    hora();
  }

  /* ================================================================ la sala responde (v0.3.54) */
  /* cuanto: Movimiento completo = 1; "Destellos suaves" = 0,5; "Minimo" (o el sistema pide menos movimiento) = nada */
  const quieto = () => { const h = document.documentElement.classList; return h.contains("reduce-motion"); };
  const fuerza = () => (mode === "off" || !root || quieto() ? 0 : (mode === "soft" ? 0.6 : 1) * (document.documentElement.classList.contains("soft-flash") ? 0.5 : 1));
  /* aleatorio dentro del orden: el mismo golpe, nunca con la misma fuerza exacta */
  const vario = (a = 0.86, b = 1.14) => a + Math.random() * (b - a);
  /* la lampara sube: la penumbra se llena de luz calida un instante (lo que se lee no cambia). cuanto: 0-1; ms: lo que tarda en volver */
  function luz(cuanto, ms = 620) {
    const k = fuerza(); if (!k || !glowCv) return;
    const a = Math.min(1, cuanto * k * vario());
    glowCv.animate([{ opacity: 0 }, { opacity: a, offset: 0.1 }, { opacity: a, offset: 0.26 }, { opacity: 0 }], { duration: ms, easing: "ease-out" });
  }
  /* v0.3.74, el destello: en cada golpe de premio, todas las bombillas que hay en pantalla suben a la vez y vuelven a su ola. Cada marco lleva
     una capa con todas sus bombillas encendidas (.mq-all, js/art.js) que normalmente no se ve: aqui solo se anima su opacidad (lo hace el
     compositor) y la ola sigue por debajo, sin pararse ni desfasarse. k: 1-3, la fuerza del golpe (con el reposo al 55 %, 1 = todas a tope).
     No depende de las Luces de la sala (las bombillas son piezas); con Movimiento minimo estan quietas y no hay destello; con "suave", la mitad */
  function destello(k = 3, host) {
    if (quieto()) return;
    k = Math.max(1, Math.min(3, k | 0));
    /* v0.3.198 (Bloque F, paso 7): primero corre la luz (k cometas) y, cuando acaba la carrera, todas a la vez. Varios golpes seguidos (un premio de
       tres) suben los cometas y alargan la carrera; el destello final es uno solo, al acabar el ultimo */
    const run = carrera(host, k), a = [0.67, 0.84, 1][k - 1] * (document.documentElement.classList.contains("soft-flash") ? 0.5 : 1), ms = 460 + 80 * k;
    const box = host || document; clearTimeout(box._mqFin);
    box._mqFin = setTimeout(() => box.querySelectorAll(".mqb.mq-all").forEach(el => el.animate([{ opacity: a }, { opacity: a, offset: 0.2 }, { opacity: 0 }], { duration: ms, easing: "ease-out" })), Math.max(0, run - 260));
  }
  /* la carrera: L cometas de cuatro bombillas dan la vuelta al marco (capa .mq-run, js/art.js). Es su trazo discontinuo que se desplaza:
     el patron sale del paso entre bombillas de cada marco (el mismo del svg de base). Devuelve lo que dura (ms). Sin movimiento, nada */
  function carrera(host, L = 1, total = 0) {
    if (quieto()) return 0;
    L = Math.max(1, Math.min(3, L | 0)); const vuelta = 1150 - 160 * L, dura = total || Math.round(vuelta * (1 + 0.5 * L));
    (host || document).querySelectorAll(".mqw").forEach(w => {
      const run = w.querySelector(".mqb.mq-run"), base = w.querySelector(".mq-base rect"); if (!run || !base || !run.getClientRects().length) return;
      const u = parseFloat(String(getComputedStyle(base).strokeDasharray).split(/[ ,]+/)[1]) || 2, per = 144 / L, rev = w.closest(".rev") ? 1 : -1;
      run.querySelectorAll("rect").forEach(r => { r.getAnimations().forEach(a => a.cancel()); r.style.strokeDasharray = `0 ${u} 0 ${u} 0 ${u} 0 ${(per - 3 * u).toFixed(3)}`;
        r.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: rev * 144 }], { duration: vuelta, iterations: dura / vuelta, easing: "linear" }); });
      run.getAnimations().forEach(a => a.cancel());
      run.animate([{ opacity: 0 }, { opacity: 1, offset: 0.06 }, { opacity: 1, offset: 0.88 }, { opacity: 0 }], { duration: dura, easing: "linear" });
      /* mientras corre la luz, las demas bajan un punto (si no, en reposo lucen casi enteras y el cometa no se distingue); luego vuelven a su filamento */
      w.querySelectorAll(".mqb.mq-lit").forEach(el => { (el._mqBaja && el._mqBaja.cancel()); el._mqBaja = el.animate([{ opacity: 0.85 }, { opacity: 0.42, offset: 0.08 }, { opacity: 0.42, offset: 0.86 }, { opacity: 0.85 }], { duration: dura, easing: "ease-in-out" }); });
    });
    return dura;
  }
  /* la lampara baja: la sala pierde un punto de luz y vuelve (un fallo, una apuesta perdida) */
  function baja(cuanto = 1) {
    const k = fuerza(); if (!k || !veil) return;
    const a = 0.2 * cuanto * k;
    veil.animate([{ opacity: 0 }, { opacity: a, offset: 0.1 }, { opacity: a, offset: 0.3 }, { opacity: 0 }], { duration: 1250, easing: "ease-out" });
  }
  /* el barrido: un haz de luz cruza la sala de lado a lado (el premio gordo). El lado se sortea */
  function barrido() {
    const k = fuerza(); if (!k || !beam) return;
    const d = Math.random() < 0.5 ? 1 : -1, from = d > 0 ? "-70vw" : "130vw", to = d > 0 ? "130vw" : "-70vw";
    beam.animate([{ transform: `translateX(${from}) skewX(-24deg)`, opacity: 0 }, { opacity: 0.9 * k, offset: 0.25 }, { opacity: 0.9 * k, offset: 0.7 }, { transform: `translateX(${to}) skewX(-24deg)`, opacity: 0 }], { duration: 840, easing: "cubic-bezier(.4, 0, .6, 1)" });
    if (A.sfx && A.sfx.barrido) A.sfx.barrido();
  }
  /* la noche avanza: a = 0, 1 o 2 (el acto) o "fin" (luces de sala al acabar la expedicion) */
  function acto(a) { const v = a === "fin" ? "fin" : Math.max(0, Math.min(2, a | 0)); if (v === act) return; act = v; sig = ""; mira(); }
  /* llega el jefe: mientras dura su intro la sala late (la luz roja de la penumbra y las bombillas de su escena, por CSS) con su latido y un zumbido grave */
  let latido = 0;
  function llegaElJefe(on) {
    if (jefe === !!on) return; jefe = !!on;
    clearInterval(latido); clearTimeout(latido); latido = 0;
    if (A.sfx && A.sfx.zumbido) A.sfx.zumbido(jefe);
    /* el latido suena con el reloj del documento (cada segundo en punto), el mismo que mueve la luz y las bombillas: van juntos sin medir nada */
    if (jefe) { const lub = () => { if (!document.hidden && A.sfx && A.sfx.latido) A.sfx.latido(); }; latido = setTimeout(() => { lub(); latido = setInterval(lub, 1000); }, 1000 - (performance.now() % 1000)); }
    else if (root) root.classList.remove("boss");
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
    const top = Math.max(n, o.fuerza | 0), g = gapMs(), LZ = [0.3, 0.46, 0.74];
    /* con cada golpe la lampara sube un punto mas; tras el tercero, el barrido de luz */
    const golpe = k => { const lvl = k === n ? top : k; shake(lvl); luz(LZ[k - 1], 380 + k * 120); destello(k); brilla(); if (k === 3) { setTimeout(barrido, 60); } };   // el premio gordo: barrido de luz
    for (let k = 1; k <= n; k++) { if (k === 1) golpe(1); else setTimeout(() => golpe(k), (k - 1) * g); }
  }
  /* perdida: la apuesta que se va. Sonido de perder (o el que traiga quien llama), un temblor seco y la lampara que baja */
  function perdida(o = {}) { if (!o.mudo && A.sfx && A.sfx.lose) A.sfx.lose(); shake(o.fuerza || 1); baja(1); if (A.haptic) A.haptic([40, 20, 40]); }
  /* impacto: un golpe fisico sin premio (un sello, un dado contra la banda, una reliquia que paga) */
  function impacto(n = 1) { shake(Math.max(1, Math.min(3, n | 0))); }

  /* ================================================================ v0.3.201 (Bloque F, paso 4): EL MUNDO RESPONDE A TU RACHA
     - La sala se calienta un escalon con cada acierto seguido (hasta 5): ambar en los bordes, por debajo del HUD y sin tocar la tierra; los
       paneles, un punto mas calidos (css/gala.css, html.lz-c1..5). Un fallo la enfria un instante y vuelve donde estaba.
     - La musica: con racha de 3 se abre (A.music.energia); un fallo le quita los agudos un momento (A.music.enfria).
     - La mesa: tu racha se apila en fichas junto al dock (hasta 7). Cada acierto pone una; si fallas, la pila se viene abajo; con cada golpe de
       premio, brillan de abajo arriba. Nada salta ni vuela: son fichas sobre la mesa.
     Solo al revelar (js/game.js): mientras contestas, nada cambia. Con Movimiento minimo las fichas aparecen y se van sin moverse */
  let calor = 0, pila = null, fichasN = 0;
  const PILA_MAX = 7, PILA_COL = ["chip_r", "chip_g", "chip_b"];
  function racha(n, o = {}) {
    n = Math.max(0, n | 0); const c = Math.min(5, n), h = document.documentElement.classList;
    if (c !== calor) { h.remove("lz-c" + calor); calor = c; if (c) h.add("lz-c" + c); }
    if (A.music && A.music.energia) A.music.energia(n >= 3);
    if (o.fallo) { frio(); if (A.music && A.music.enfria) A.music.enfria(); }
    fichas(n, !!o.fallo);
  }
  /* el frio del fallo: la penumbra de los bordes se vuelve azul noche un instante (solo opacidad) */
  function frio() {
    const k = fuerza(); if (!k || !root) return; const f = root.querySelector(".fria"); if (!f) return;
    f.animate([{ opacity: 0 }, { opacity: 0.85 * k, offset: 0.18 }, { opacity: 0 }], { duration: 1100, easing: "ease-out" });
  }
  /* la pila: fichas de la casa dibujadas al pixel (js/ficha.js, 32 pixeles de arte a escala entera), a la derecha del dock */
  function pilaMide() {
    const d = $("dockSh"), r = d && d.getBoundingClientRect(); if (!r || !r.width) return null;
    const P = Math.max(1, Math.round(r.height / 42)), S = 32 * P, k = Math.min(innerWidth / 1920, innerHeight / 1080);
    return { x: Math.round(r.right + 16 * k), y: Math.round(r.bottom - S), S, dy: Math.max(2, Math.round(S * 0.16)), k };
  }
  function pilaHost() {
    if (pila && pila.isConnected) return pila;
    pila = document.createElement("div"); pila.id = "pilaRacha"; pila.setAttribute("aria-hidden", "true");
    const app = $("app"), ref = root && root.parentNode === app ? root : app.querySelector(":scope > .vignette");
    app.insertBefore(pila, ref ? ref.nextSibling : app.firstChild); return pila;
  }
  function pilaColoca() {
    if (!pila || !pila.isConnected) return; const m = pilaMide(); if (!m) return;
    const sx = -Math.max(1, Math.round(3 * m.k)), sy = Math.max(1, Math.round(5 * m.k));   // su sombra, lejos de la lampara de la mesa (arriba, en el centro)
    pila.style.filter = "drop-shadow(" + sx + "px " + sy + "px 0 rgba(2, 6, 4, .5))";
    [...pila.children].forEach((c, i) => { c.style.width = c.style.height = m.S + "px"; c.style.left = m.x + "px"; c.style.top = (m.y - i * m.dy) + "px"; c.style.zIndex = i + 1; });
  }
  function ficha(i) {
    const c = document.createElement("canvas"), N = 32; c.width = c.height = N; c.className = "pr-f";
    try { c.getContext("2d").putImageData(new ImageData(A.ficha.px(N, PILA_COL[i % 3]), N, N), 0, 0); } catch (e) { /* sin dibujo, sin ficha */ }
    return c;
  }
  function fichas(n, fallo) {
    const want = Math.min(PILA_MAX, n);
    if (want > fichasN) {
      const host = pilaHost(), m = pilaMide(); if (!m) return;
      for (let i = fichasN; i < want; i++) host.appendChild(ficha(i));
      const nuevas = want - fichasN; fichasN = want; pilaColoca();
      if (!quieto()) {                                                   // la ultima se posa sobre la pila (las demas, si venias de otra ronda, ya estaban)
        const ult = host.lastElementChild, up = -Math.round(14 * m.k), dn = Math.max(1, Math.round(m.k));
        ult.animate([{ transform: "translateY(" + up + "px)", opacity: 0.4 }, { transform: "none", opacity: 1, offset: 0.7 }, { transform: "translateY(" + dn + "px)", offset: 0.85 }, { transform: "none" }], { duration: 230, easing: "cubic-bezier(.3, .7, .4, 1)" });
      }
      if (nuevas === 1 && A.sfx && A.sfx.coin) setTimeout(() => A.sfx.coin(Math.min(1, (want - 1) * 0.15)), 160);
      return;
    }
    if (want < fichasN) {                                               // la racha se ha roto (o se empieza de cero): la pila se viene abajo
      const host = pila; fichasN = 0; pila = null; if (!host) return;
      if (!fallo || quieto() || !host.children.length) { host.remove(); return; }
      const m = pilaMide() || { k: 1 }, base = host.firstElementChild ? parseFloat(host.firstElementChild.style.top) : 0;
      [...host.children].forEach((c, i) => {
        const dx = Math.round(((i % 2 ? 1 : -1) * (6 + i * 5) + (Math.random() - 0.5) * 8) * m.k), dy = Math.round(base - parseFloat(c.style.top) + (4 + Math.random() * 6) * m.k);
        const to = "translate(" + dx + "px, " + dy + "px)";
        c.animate([{ transform: "none", opacity: 1 }, { transform: to, opacity: 1, offset: 0.55 }, { transform: to, opacity: 0 }], { duration: 520 + i * 30, delay: i * 18, easing: "cubic-bezier(.4, 0, .7, 1)", fill: "forwards" });
      });
      setTimeout(() => host.remove(), 700 + host.children.length * 50);
    }
  }
  /* con cada golpe de premio, la pila brilla de abajo arriba (solo luz: no se mueve) */
  function brilla() {
    if (!pila || !pila.isConnected || quieto()) return;
    [...pila.children].forEach((c, i) => c.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.7)", offset: 0.35 }, { filter: "brightness(1)" }], { duration: 320, delay: i * 40, easing: "ease-out" }));
  }

  /* ================================================================ ajuste y arranque */
  function ambiente(v) {
    ambi = v in AMB ? v : "hoy"; const h = document.documentElement.classList;
    ["montecarlo", "gala", "teatro"].forEach(k => h.toggle("amb-" + k, ambi === k)); sig = ""; if (root && mode !== "off") mira();
  }
  function set(m) {
    mode = LUX[m] || m === "off" ? m : "full";
    document.documentElement.classList.toggle("sala-on", mode !== "off"); document.documentElement.classList.toggle("sala-soft", mode === "soft");
    if (root) root.classList.toggle("hidden", mode === "off");
    if (map) { map.vigK = mode === "off" ? 1 : 0.55; if (mode === "off") map.calm = 0; map.dirty = true; }
    sig = ""; if (mode !== "off") mira();
    if (A.escena && A.escena.portada) A.escena.portada();                 // los focos de la portada se van o vuelven con el ajuste
  }
  function init(m, how) {
    map = m || null;
    root = document.createElement("div"); root.id = "sala"; root.setAttribute("aria-hidden", "true");
    root.innerHTML = '<i class="charco"></i><canvas class="d"></canvas><canvas class="d"></canvas><canvas class="g"></canvas><i class="calida"></i><i class="fria"></i><i class="veil"></i><i class="beam"></i>';
    cvs = [...root.querySelectorAll("canvas.d")]; glowCv = root.querySelector("canvas.g"); veil = root.querySelector(".veil"); beam = root.querySelector(".beam");
    lastKind = kind(); root.classList.toggle("mute", TAPETE(lastKind)); coloca(lastKind); lugar(lastKind);
    /* que mirar: cambios de pantalla (#layer, #dlg, #intro), las piezas que entran y salen en partida (#leftCol, el ticket del marcador) y el tamano */
    const mo = new MutationObserver(() => mira(true));
    [["layer", { attributes: true, attributeFilter: ["class"], childList: true }], ["dlg", { attributes: true, attributeFilter: ["class"], childList: true }], ["intro", { attributes: true, attributeFilter: ["class"], childList: true }],
      ["leftCol", { childList: true }], ["ledgerSh", { childList: true }]].forEach(([id, o]) => { const el = $(id); if (el) mo.observe(el, o); });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });                                      // cx-on: se abre o se cierra la Enciclopedia
    addEventListener("resize", () => { sig = ""; mira(); pilaColoca(); });
    /* el compas: al empezar, parar o saltar una cancion (A.music.onBeat) y, cada dos segundos, por si el reproductor se ha ido o se ha quitado la musica */
    if (A.music) A.music.onBeat = compas;
    setInterval(compas, 2000); document.addEventListener("visibilitychange", () => { if (!document.hidden) compas(); });
    set(how || "full");
  }

  A.casa = { init, set, mira, kind, racha, brilla, vivo, premio, perdida, impacto, luz, destello, carrera, ambiente, baja, barrido, acto, vario, compas, get MQ_P() { return mqP; }, get MQ_O() { return mqO; }, get modo() { return mode; }, get noche() { return act; }, _regla: () => rule() };   // _regla: para las pruebas
})(window.AIQ);
