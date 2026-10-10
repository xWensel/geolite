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
 *  - v0.3.54 (Fase 2, los golpes): la sala responde. Toda la luz que cambia lo hace SOLO en la penumbra (el mismo mapa de luz); las piezas
 *    no cambian nunca. La lampara sube (luz calida un instante: A.casa.luz), baja (A.casa.baja) o barre la sala (A.casa.barrido); la noche
 *    avanza por actos (color y fuerza de la penumbra: A.casa.acto) y, cuando llega el jefe, la penumbra se cierra, enrojece y late.
 *    Todo son capas con animacion de opacidad o de transform: lo hace el compositor, sin repintar.
 *  - Las bombillas de la casa (A.bulbs, js/art.js) laten con un solo reloj (A.casa.MQ_P); aqui se vuelven a poner en fase tras cada pantalla.
 *  - v0.3.57 (Fase 3c): ese reloj es el compas de la cancion que suena: un paso por pulso. Sin musica, el reloj de la casa de siempre.
 *
 * Capas (#app): mapa < [#sala en partida] < HUD (z 5-6) < #layer (4) < #intro (6) < [#sala en las demas pantallas, z 7] < #tip (30) < avisos (40) < pausa (60) < Ajustes (62) < crupier y mesas.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const $ = id => document.getElementById(id);
  const core = () => A.core || {};
  const MQ_P = 1140;                                                    // el reloj de la casa para las bombillas: tres pasos de 380 ms

  /* ================================================================ la luz: el calculo (el mismo codigo corre en el Worker o, si no hay, aqui) */
  /* p: { w, h, c (px por celda), amb (luz minima), bands, dark (fuerza de la sombra), rgb, pools [[cx, cy, rx, ry, k]], floors [[x0, y0, x1, y1, luzMinima]], keep [cx, cy, rx, ry] }
     Las lamparas (pools) son lo unico que da forma a la penumbra: una caida suave y redonda, justificada por la lampara. Cada pieza (floor) recibe
     UNA sola luz, la que cae en su centro (o su minimo para poder leerla), plana y recortada a su borde: ni halo alrededor ni el borde de una
     banda cruzandola. Asi no aparece ninguna sombra con forma de algo que no esta en pantalla */
  function paint(p) {
    const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], W = p.w, H = p.h, c = p.c, amb = p.amb, N = p.bands, SEAM = 0.12;
    const pools = p.pools, floors = p.floors, keep = p.keep, out = new Uint8ClampedArray(W * H * 4), r = p.rgb[0], g = p.rgb[1], b = p.rgb[2];
    const at = (x, y) => {
      let pool = 0;
      for (let k = 0; k < pools.length; k++) { const q = pools[k], dx = (x - q[0]) / q[2], dy = (y - q[1]) / q[3], d2 = dx * dx + dy * dy; if (d2 < 1) { const f = (1 - d2) * q[4]; if (f > pool) pool = f; } }
      let L = amb + (1 - amb) * (pool > 1 ? 1 : pool);
      if (keep) { const dx = (x - keep[0]) / keep[2], dy = (y - keep[1]) / keep[3], d = Math.sqrt(dx * dx + dy * dy); if (d < 1) { let t = d < 0.78 ? 1 : 1 - (d - 0.78) / 0.22; t = t * t * (3 - 2 * t); L += (1 - L) * t; } }
      return L;
    };
    const FL = floors.map(f => Math.max(f[4], at((f[0] + f[2]) / 2, (f[1] + f[3]) / 2)));
    for (let j = 0; j < H; j++) {
      const y = (j + 0.5) * c;
      for (let i = 0; i < W; i++) {
        const x = (i + 0.5) * c;
        let L = -1;
        for (let k = 0; k < floors.length; k++) { const f = floors[k]; if (x >= f[0] && x <= f[2] && y >= f[1] && y <= f[3] && FL[k] > L) L = FL[k]; }
        if (L < 0) L = at(x, y);
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
  /* la luz de una pieza SOLIDA (carta, ticket, boton, placa): plana y recortada a su borde (2 px de margen por la celda); `lv` es su minimo para
     poder leerla. Nunca se le da a un contenedor invisible ni a un texto suelto: su caja dibujaria un recuadro de luz que no corresponde a nada */
  const floor = (r, lv) => r ? [r.left - 2, r.top - 2, r.right + 2, r.bottom + 2, lv] : null;
  /* las piezas de una pantalla de gala: las de su reticula de 12 columnas o, si no la usa (la Clasificacion), sus bloques y lo que llevan dentro */
  const stageKids = st => { const k = all(".gx-grid > *", st); return k.length ? k : all(":scope > *, :scope > * > *", st); };
  function rule() {
    const W = innerWidth, H = innerHeight, lay = $("layer"), dlg = $("dlg"), intro = $("intro");
    const P = [], F = [], add = (arr, x) => { if (x) arr.push(x); };
    const fl = (rs, lv) => rs.forEach(r => add(F, floor(r, lv)));
    /* las marquesinas de bombillas dan luz: el hueco que ocupan nunca queda en sombra */
    const bulbs = root => fl(all(".mqb.mq-base", root), 1);
    /* un tablero a pantalla completa (pantallas de gala, cuadros): una lampara ancha con mucha meseta; todo lo que hay se lee a luz plena y
       la penumbra solo asoma en los margenes */
    const board = kids => add(P, pool(union(kids), 1.32, 1.5, 3.2));
    if (document.body.classList.contains("cx-on")) return { key: "codex", off: 1 };                                 // la Enciclopedia es un aparato con su propia pantalla: la luz de la sala no entra
    /* el crupier va delante de todo: donde este (intro, veredicto), una lampara propia. Ninguna sombra ni luz le pasa por encima */
    const crupier = root => add(P, pool(vis(root.querySelector(".dealer")), 1.3, 1.25, 2.2));
    if (intro && !intro.classList.contains("hidden") && !intro.classList.contains("out")) {                          // intro de ronda o de jefe: una lampara sobre el cartel entero
      add(P, pool(union(all(".intro-in > *", intro)), 1.4, 1.7, 1.9)); crupier(intro); bulbs(intro);
      return { key: "intro", pools: P, floors: F, boss: !!intro.querySelector(".intro-in.is-boss") };
    }
    const top = lay && !lay.classList.contains("hidden") ? [...lay.querySelectorAll(":scope > :not(#dlg) .gx-stage")].pop() : null;
    if (top) { board(stageKids(top)); bulbs(top); return { key: "stage", pools: P, floors: F }; }                    // la Clasificacion: va en #layer, encima de la portada
    if (lay && !lay.classList.contains("hidden") && dlg) {
      if (dlg.classList.contains("home")) {                                                                          // portada: la lampara sobre las tres cartas y otra sobre el cartel
        const cards = all(".hh-cards > *", dlg);
        add(P, pool(union(cards), 1.5, 1.7, 1.3)); add(P, pool(vis(dlg.querySelector(".hh-logo")), 1.5, 2.1, 1.15));
        fl(cards, 1); fl(all(".plq, .hh-resume .startbtn", dlg), 1); fl(all(".hh-top .menu-gear, .menu-gear", dlg), 0.8); fl(all("#leftCol > *"), 1);
        return { key: "home", pools: P, floors: F };
      }
      const vd = dlg.querySelector(".gx-vd");
      if (vd) {                                                                                                     // ronda superada o fallida: el ticket bajo su lampara y otra sobre el cartel
        const tk = vis(vd.querySelector(".gx-vd-ticket")), hd = vis(vd.querySelector(".gx-vd-head"));
        add(P, pool(tk, 1.7, 1.3, 1.4)); add(P, pool(hd, 1.5, 1.7, 1.5)); add(P, pool(vis(vd.querySelector(".gx-vd-side")), 1.5, 1.4, 1.5));
        fl([tk].filter(Boolean), 1); fl(all(".gx-vd-iq, .gx-vd-acts .gx-btn", vd), 1); crupier(vd); bulbs(vd);
        return { key: "vd", pools: P, floors: F };
      }
      const camp = dlg.querySelector(".gx-camp");
      if (camp) {                                                                                                   // el Campamento: una lampara sobre la mesa (cartas, Barra, mochila) y otra sobre el boleto
        add(P, pool(union(all(":scope > .tb-head, :scope > .tb-shop, :scope > .tb-sup, :scope > .tb-tray", camp)), 1.22, 1.32, 1.7));
        add(P, pool(union(all(":scope > .tb-next, :scope > .go2-wrap", camp)), 1.4, 1.25, 1.7));
        fl(all(".offer, .tb-deck, .tb-next, .go2-wrap, .sup, .tb-right > *", camp), 1); fl(all(":scope > .tb-tray", camp), 0.9); bulbs(camp);
        return { key: "camp", pools: P, floors: F };
      }
      const stage = dlg.querySelector(".gx-stage");
      if (stage) { board(stageKids(stage)); bulbs(stage); return { key: "stage", pools: P, floors: F }; }           // pantallas de gala (Aventura, Clasico, Reto, Perfil...)
      if (!dlg.classList.contains("side")) { board(all(":scope > *", dlg)); return { key: "box", pools: P, floors: F }; }   // cualquier otro cuadro centrado
    }
    /* partida: la lampara sobre la mesa. La penumbra cae SOLO sobre el mapa: en partida la luz de la sala va por debajo del HUD (#sala.bajo), asi que
       la placa, el marcador y su ticket, las tarjetas y las herramientas quedan encima, siempre a plena luz y sin recortes que calcular.
       El centro del mapa queda intacto */
    add(P, [W / 2, H / 2, W * 0.8, H * 0.86, 1.2]);
    return { key: "play", pools: P, floors: F, keep: [W / 2, H * 0.53, W * 0.46, H * 0.44], calm: 1 };
  }

  /* ================================================================ la luz: dibujo, fundido y cuando recalcular */
  const LUX = { full: { amb: 0.38, dark: 1 }, soft: { amb: 0.38, dark: 0.5 } };   // penumbra media (respuesta lz_penumbra): en lo mas oscuro, 38 % de luz
  /* la noche de la expedicion: cambian el color y la fuerza de la penumbra, nunca las piezas ni el centro del mapa.
     Acto I abre la sala; II, medianoche (sombras azul noche, mas cerradas); III, madrugada (grises y mas abiertas); "fin", luces de sala */
  const NOCHE = { 0: { rgb: [2, 9, 8], k: 1 }, 1: { rgb: [10, 8, 58], k: 1.3 }, 2: { rgb: [46, 50, 56], k: 0.8 }, fin: { rgb: [2, 9, 8], k: 0 } };
  const JEFE = { rgb: [46, 4, 9], amb: 0.14, glow: [255, 52, 40] };          // llega el jefe: la penumbra se cierra y enrojece
  const CALIDA = [255, 196, 112];                                           // la luz de la lampara cuando sube
  let root = null, cvs = [], glowCv = null, veil = null, beam = null, front = 0, wk = null, seq = 0, sig = "", mode = "full", tm = 0, tm2 = 0, map = null, act = 0, jefe = false;
  const onMap = async d => {
    const drop = () => { if (d.bmp) d.bmp.close(); if (d.gbmp) d.gbmp.close(); };
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
    if (R.off) { if (map) map.calm = 0; sig = "off"; seq++; root.classList.remove("boss"); return; }
    const N = NOCHE[act] || NOCHE[0], boss = !!R.boss;
    const p = { w: Math.ceil(W / c), h: Math.ceil(H / c), c, amb: boss ? JEFE.amb : L.amb, dark: Math.min(1.6, L.dark * (boss ? 1 : N.k)), bands: 6, rgb: boss ? JEFE.rgb : N.rgb, glow: boss ? JEFE.glow : CALIDA, pools: R.pools, floors: R.floors, keep: R.keep || null };
    const s = JSON.stringify([mode, act, boss, p.w, p.h, R.key, R.pools.map(q => q.map(v => Math.round(v / 6))), R.floors.map(q => q.map(v => Math.round(v / 6))), p.keep]);
    if (map) map.calm = R.calm ? 1 : 0;                                 // en partida el remolino del oceano baja la voz (js/map.js)
    hora();
    if (s === sig) return; sig = s;
    const id = p.id = ++seq, w = worker();
    if (w) { w._c[id] = { c, boss }; w.postMessage(p); }
    else { const out = paint(p); onMap({ id, w: p.w, h: p.h, c, boss, buf: out.buffer, gbuf: tint(out, p.glow).buffer }); }   // sin Worker (no deberia pasar): se calcula aqui, una vez por pantalla
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
  function mira(changed) {
    if (!root) return;
    /* en que pantalla estas: lo usan la luz y el sonido (con las Luces de la sala apagadas, el sonido sigue sabiendo donde estas) */
    if (changed === true) { const k = kind(); if (k !== lastKind) { if (lastKind && mode !== "off") neutral(); lastKind = k; root.classList.toggle("mute", k === "codex"); root.classList.toggle("bajo", k === "play"); llegaElJefe(k === "intro jefe"); lugar(k); } }
    clearTimeout(tm); clearTimeout(tm2);
    if (mode === "off") { tm = setTimeout(hora, 650); return; }       // sin luces de sala, las bombillas siguen en hora
    tm = setTimeout(() => idle(look), 650);                            // las pantallas ya han entrado (deslizan unos 350-500 ms): se miden quietas
    tm2 = setTimeout(() => idle(look), 1600);
  }

  /* v0.3.55: el sitio en el que estas tambien se oye. En el Campamento la musica llega amortiguada, como desde la sala (js/audio.js) */
  function lugar(k) {
    if (A.music && A.music.room) A.music.room(k === "camp");
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
  const quieto = () => { const h = document.documentElement.classList; return h.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches; };
  const fuerza = () => (mode === "off" || !root || quieto() ? 0 : (mode === "soft" ? 0.6 : 1) * (document.documentElement.classList.contains("soft-flash") ? 0.5 : 1));
  /* aleatorio dentro del orden: el mismo golpe, nunca con la misma fuerza exacta */
  const vario = (a = 0.86, b = 1.14) => a + Math.random() * (b - a);
  /* la lampara sube: la penumbra se llena de luz calida un instante (lo que se lee no cambia). cuanto: 0-1; ms: lo que tarda en volver */
  function luz(cuanto, ms = 620) {
    const k = fuerza(); if (!k || !glowCv) return;
    const a = Math.min(1, cuanto * k * vario());
    glowCv.animate([{ opacity: 0 }, { opacity: a, offset: 0.1 }, { opacity: a, offset: 0.26 }, { opacity: 0 }], { duration: ms, easing: "ease-out" });
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
    const golpe = k => { const lvl = k === n ? top : k; shake(lvl); luz(LZ[k - 1], 380 + k * 120); if (A.marcador && A.marcador.destello) A.marcador.destello(130); if (k === 3) { setTimeout(barrido, 60); if (A.amb) setTimeout(() => A.amb.applause(1), 320); } };   // el premio gordo: barrido de luz y aplausos
    for (let k = 1; k <= n; k++) { if (k === 1) golpe(1); else setTimeout(() => golpe(k), (k - 1) * g); }
  }
  /* perdida: la apuesta que se va. Sonido de perder (o el que traiga quien llama), un temblor seco y la lampara que baja */
  function perdida(o = {}) { if (!o.mudo && A.sfx && A.sfx.lose) A.sfx.lose(); shake(o.fuerza || 1); baja(1); if (A.haptic) A.haptic([40, 20, 40]); }
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
    root.innerHTML = '<canvas class="d"></canvas><canvas class="d"></canvas><canvas class="g"></canvas><i class="veil"></i><i class="beam"></i>';
    cvs = [...root.querySelectorAll("canvas.d")]; glowCv = root.querySelector("canvas.g"); veil = root.querySelector(".veil"); beam = root.querySelector(".beam");
    /* va justo encima del mapa (tras la vineta): en partida se queda ahi, por debajo del HUD; en las demas pantallas sube con z-index por encima de ellas */
    const app = $("app"), ref = app.querySelector(":scope > .vignette"); if (ref) app.insertBefore(root, ref.nextSibling); else app.insertBefore(root, app.firstChild);
    root.classList.add("bajo"); lastKind = kind(); root.classList.toggle("bajo", lastKind === "play"); lugar(lastKind);
    /* que mirar: cambios de pantalla (#layer, #dlg, #intro), las piezas que entran y salen en partida (#leftCol, el ticket del marcador) y el tamano */
    const mo = new MutationObserver(() => mira(true));
    [["layer", { attributes: true, attributeFilter: ["class"], childList: true }], ["dlg", { attributes: true, attributeFilter: ["class"], childList: true }], ["intro", { attributes: true, attributeFilter: ["class"] }],
      ["leftCol", { childList: true }], ["ledgerSh", { childList: true }]].forEach(([id, o]) => { const el = $(id); if (el) mo.observe(el, o); });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });                                      // cx-on: se abre o se cierra la Enciclopedia
    addEventListener("resize", () => { sig = ""; mira(); });
    /* el compas: al empezar, parar o saltar una cancion (A.music.onBeat) y, cada dos segundos, por si el reproductor se ha ido o se ha quitado la musica */
    if (A.music) A.music.onBeat = compas;
    setInterval(compas, 2000); document.addEventListener("visibilitychange", () => { if (!document.hidden) compas(); });
    set(how || "full");
  }

  A.casa = { init, set, mira, premio, perdida, impacto, luz, baja, barrido, acto, vario, compas, get MQ_P() { return mqP; }, get MQ_O() { return mqO; }, get modo() { return mode; }, get noche() { return act; }, _regla: () => rule() };   // _regla: para las pruebas
})(window.AIQ);
