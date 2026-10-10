/*
 * Geolite - LA ESCENA (v0.3.70). La luz que se ve en el aire: lo que flota entre la penumbra de la sala (js/casa.js) y las piezas.
 *
 *  - La portada tiene focos de sala: dos focos de techo caen en diagonal sobre las cartas de los lados, el cartel enciende la sala y su oro
 *    baja hasta la carta de la Aventura, que tiene su propio resplandor.
 *  - v0.3.72: la intro de cada ronda es un escenario. Telon de terciopelo del color del acto (esmeralda, azul de medianoche, violeta; granate
 *    cuando llega el jefe), galon y suelo, y la lampara del tema colgada sobre la ficha y sobre el crupier, con su haz en el aire. Se encienden
 *    una detras de otra. El jefe lleva un foco de teatro sobre su ficha y la lampara del tema, en rojo, sobre el crupier.
 *
 * Todo son capas quietas detras de las piezas y del crupier (css/escena.css): se miden una vez, al entrar la pantalla, y no cuestan nada por
 * fotograma. A js/casa.js se le dice donde cae cada luz (luz, luzPortada) para que recorte su cono en la penumbra.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const $ = id => document.getElementById(id);
  const luces = () => document.documentElement.classList.contains("sala-on");       // Ajustes > Pantalla > Luces de la sala (js/casa.js)

  /* ================================================================ el escenario de la intro */
  /* la lampara de cada tema (assets/esc/lamp_*.png, 64 x 48 px de arte). b: la boca, por donde sale la luz [fila, medio ancho]; h: filas
     dibujadas; v: filas de varilla o cadena que pueden perderse por arriba; c: el color de su luz; g: es de las estrechas y se pinta con un
     pixel de arte mas grande para que tenga presencia */
  const TEMA = { capital: "billar", country: "globo", city: "deco", landmark: "farol", flag: "verbena", history: "velas", nature: "quinque", clue: "flexo", mixed: "arana" };
  const L = {
    billar: { b: [34, 24], h: 40, v: 8, c: "255, 222, 164" }, globo: { b: [42, 15], h: 47, v: 6, c: "255, 232, 184", g: 1 }, deco: { b: [40, 10], h: 46, v: 4, c: "206, 232, 255", g: 1 }, farol: { b: [40, 12], h: 45, v: 7, c: "255, 200, 118", g: 1 },
    verbena: { b: [38, 26], h: 42, v: 5, c: "255, 226, 170" }, velas: { b: [36, 26], h: 46, v: 9, c: "255, 180, 96" }, quinque: { b: [30, 12], h: 45, v: 4, c: "255, 196, 116", g: 1 }, flexo: { b: [33, 17], h: 43, v: 8, c: "238, 244, 255" },
    arana: { b: [38, 28], h: 45, v: 7, c: "255, 234, 180" }, foco: { b: [36, 12], h: 45, v: 2, c: "255, 246, 236" },
  };
  const ROJO = "255, 92, 70";
  const px = () => Math.max(2, Math.round(2 * Math.min(innerWidth / 1280, innerHeight / 720)));   // px de pantalla por pixel de arte: 2 en 720p y Deck, 3 en 1080p
  let st = null;
  function desmonta() { if (st) { st.tm.forEach(clearTimeout); st.tel.remove(); st.air.remove(); st = null; } }
  /* o: { act } (el tema y si es un jefe se leen del propio cartel). Se llama al pintar la intro, con el crupier ya en su sitio (js/game.js) */
  function monta(o) {
    const intro = $("intro"); desmonta();
    if (!intro || !luces()) return;
    const en = intro.querySelector(".intro-in"), boss = !!(en && en.classList.contains("is-boss")), tema = TEMA[(o && o.topic) || (en && en.dataset.topic)] || "billar";
    const p = px(), tel = document.createElement("div"), air = document.createElement("div");
    tel.innerHTML = '<i class="pano"></i><i class="suelo"></i>'; tel.className = "esc-telon t-" + (boss ? "jefe" : "a" + (Math.max(0, Math.min(2, (o && o.act) | 0)) + 1)); tel.style.setProperty("--p", p + "px"); tel.setAttribute("aria-hidden", "true");
    air.className = "esc-aire"; air.style.setProperty("--p", p + "px"); air.setAttribute("aria-hidden", "true");
    intro.insertBefore(tel, intro.firstChild); intro.insertBefore(air, intro.querySelector(".intro-in"));
    /* el jefe: un foco duro de teatro sobre su ficha y la lampara del tema, en rojo, sobre el crupier */
    st = { tel, air, p, fh: 34 * p, tm: [], lamps: boss ? [["foco", L.foco.c], [tema, ROJO]] : [[tema, L[tema].c], [tema, L[tema].c]], luz: null };
    coloca(true);
  }
  /* donde cuelga cada lampara: sobre la ficha y sobre el crupier (en el Clasico, solo sobre el numero). Se mide la caja de maquetacion, no la
     pintada: las piezas entran con una animacion de transform */
  const caja = el => { let x = 0, y = 0, e = el; while (e && e.id !== "intro") { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { l: x, t: y, w: el.offsetWidth, h: el.offsetHeight }; };
  function coloca(nueva) {
    if (!st) return; const intro = $("intro"), H = innerHeight, p = st.p, air = st.air, en = intro.querySelector(".intro-in"); if (!en) return;
    const cara = intro.querySelector(".intro-dealer .dl-face"), T = [intro.querySelector(".intro-num"), cara].filter(Boolean).map(caja); if (!T.length) return;
    /* el suelo del escenario: tan alto como deje el cartel (en pantallas bajas, o con el cartel largo de un jefe, se queda en un rodapie) */
    { const b = caja(en); st.fh = Math.max(12, Math.min(34, Math.floor((H - (b.t + b.h) - 8 * p) / p))) * p; st.tel.style.setProperty("--fh", st.fh + "px"); }
    air.innerHTML = '<div class="esc-luces"></div>'; air.classList.toggle("ya", !nueva); const lz = air.firstChild, cones = [], pools = [];
    const add = (host, cls, css, vars) => { const e = document.createElement("i"); e.className = cls; Object.assign(e.style, css); Object.entries(vars || {}).forEach(([k, v]) => e.style.setProperty(k, v)); host.appendChild(e); };
    /* el techo de la lampara del crupier: no puede bajar de su bocadillo (hasta tres lineas). Si a su pixel grande no cabe, las dos lamparas de
       la ronda se pintan al pixel normal, para que sigan siendo iguales */
    const techo = T[1] ? T[1].t - 8 - 124 - 2 * p : 1e9, chica = T[1] && 3 * p + L[st.lamps[1][0]].h * (p + 1) > techo;
    T.forEach((r, i) => {
      const [name, lc] = st.lamps[i], M = L[name], crupier = i === 1; let q = p + (M.g && !chica ? 1 : 0);   // q: px de pantalla por pixel de arte de esta lampara
      const cx = Math.round((r.l + r.w / 2) / p) * p, cy = r.t + r.h / 2, rt = crupier ? r.w * 0.5 : Math.max(r.w, r.h) / 2;
      /* la de la ficha cuelga mas baja. La del crupier, pegada a la barra; si ni asi cabe bajo su techo, sube: la varilla se pierde por arriba,
         como en cualquier lampara colgada */
      let top = crupier ? 3 * p : Math.round(H * 0.07 / p) * p + 3 * p;
      if (crupier && top + M.h * q > techo) top = Math.max(Math.floor((techo - M.h * q) / p) * p, -(M.v - 1) * q);
      const my = top + M.b[0] * q, rm = M.b[1] * q, D = Math.max(60, cy - my), a = Math.max(5, Math.atan2(Math.max(0, rt * 1.12 - rm), D) * 180 / Math.PI), ta = Math.tan(a * Math.PI / 180);
      const hb = Math.min(H - my, D + r.h * 0.5 + H * 0.16), wb = 2 * (rm + ta * hb) * 1.5, ms = 500 + i * 320, d = nueva ? ms + "ms" : "0ms", duro = name === "foco";
      if (top > 3 * p) add(air, "esc-cable", { left: cx - p + "px", top: 3 * p + "px", height: top - 3 * p + "px" });
      add(lz, "esc-haz", { left: cx - wb / 2 + "px", top: my + "px", width: wb + "px", height: hb + "px" }, { "--a": a.toFixed(2) + "deg", "--oy": -(rm / ta).toFixed(1) + "px", "--lc": lc, "--li": duro ? ".42" : ".3", "--d": d });
      add(lz, "esc-halo", { left: cx - rm * 2.6 - 20 + "px", top: my - rm * 1.9 - 16 + "px", width: rm * 5.2 + 40 + "px", height: rm * 4.4 + 32 + "px" }, { "--lc": lc, "--d": d });
      add(lz, "esc-charco", { left: cx - rt * 1.7 + "px", top: cy - rt * (crupier ? 1.05 : 1.5) + "px", width: rt * 3.4 + "px", height: rt * (crupier ? 2.1 : 3) + "px" }, { "--lc": lc, "--d": d });
      add(air, "esc-lamp", { left: cx - 32 * q + "px", top: top + "px", width: 64 * q + "px", height: 48 * q + "px", backgroundImage: `url(assets/esc/lamp_${name}.png)` }, { "--d": d });
      cones.push([cx, my, cx, cy, rm * 1.1, rt * (duro ? 1.05 : 1.2), duro ? 1.5 : 1.25]); pools.push([cx, cy, rt * 1.5, rt * (crupier ? 1.05 : 1.4), 1.3]);
      /* el chasquido de cada lampara al encenderse (si la intro sigue ahi) */
      if (nueva) st.tm.push(setTimeout(() => { if (A.sfx && A.sfx.lampara && !intro.classList.contains("out") && !intro.classList.contains("hidden")) A.sfx.lampara(i); }, ms));
    });
    /* luz de lectura sobre el texto: un charco bajo y ancho, sin lampara propia (le llega de las dos) */
    const body = intro.querySelector(".intro-body"); if (body) { const b = caja(body); pools.push([b.l + b.w / 2, b.t + b.h / 2, b.w * 0.8, b.h * 0.85, 0.72]); }
    /* y el suelo del escenario recoge lo que le llega de cada lampara */
    T.forEach((r, i) => pools.push([Math.round((r.l + r.w / 2) / p) * p, H - st.fh * 0.6, Math.max(r.w * 0.7, 80 * p), st.fh * 0.8, i ? 0.62 : 0.5]));
    st.luz = { cones, pools };
    if (A.casa && A.casa.mira) A.casa.mira(false, true);                // la penumbra tiene que estar cuando se encienden las lamparas
  }
  addEventListener("resize", () => { if (st && st.tel.isConnected) { st.p = px(); st.tel.style.setProperty("--p", st.p + "px"); st.air.style.setProperty("--p", st.p + "px"); coloca(false); } });

  /* ================================================================ la portada: focos de sala y el resplandor del cartel */
  let hs = null, htm = 0, hmo = null, vista = false;
  function portada() {
    const lay = $("layer"), dlg = $("dlg"); clearTimeout(htm);
    if (!lay || !dlg) return;
    /* al salir de la portada, la capa se va con ella */
    if (!hmo) { hmo = new MutationObserver(() => { if (!dlg.classList.contains("home")) { const old = lay.querySelector(":scope > .hh-aire"); if (old) old.remove(); hs = null; clearTimeout(htm); } }); hmo.observe(dlg, { attributes: true, attributeFilter: ["class"] }); }
    { const old = lay.querySelector(":scope > .hh-aire"); if (old) old.remove(); } hs = null;
    if (!dlg.classList.contains("home") || !luces()) return;
    const air = document.createElement("div"); air.className = "hh-aire" + (vista ? " ya" : ""); air.setAttribute("aria-hidden", "true"); lay.insertBefore(air, dlg);
    const pon = () => {
      if (!air.isConnected || !dlg.classList.contains("home")) return;
      const R = e => e && e.getBoundingClientRect(), cards = [...dlg.querySelectorAll(".hh-cards > .mcard")].map(R), logo = R(dlg.querySelector(".hh-logo")), W = innerWidth, H = innerHeight;
      if (cards.length < 3 || !logo || !logo.width || !cards[0].width) return;
      const key = cards.concat(logo).map(r => [r.left, r.top, r.width].map(Math.round).join()).join("|"); if (hs && hs.key === key) return;
      if (hs) air.classList.add("ya");                                   // algo se ha movido despues de encender: se recoloca sin volver a parpadear
      air.innerHTML = ""; const cones = [], pools = [];
      const mk = (cls, css, vars) => { const e = document.createElement("i"); e.className = cls; Object.assign(e.style, css); Object.entries(vars || {}).forEach(([k, v]) => e.style.setProperty(k, v)); air.appendChild(e); };
      const c = r => [(r.left + r.right) / 2, (r.top + r.bottom) / 2];
      /* un foco de techo por cada carta de los lados: nace fuera de cuadro, arriba y hacia fuera, y cae en diagonal sobre su carta */
      [[cards[0], -1, ".34s"], [cards[2], 1, ".52s"]].forEach(([r, s, d]) => {
        const [tx, ty] = c(r), sx = tx + s * W * 0.15, sy = -H * 0.1, dx = tx - sx, dy = ty - sy, D = Math.hypot(dx, dy), rt = Math.hypot(r.width, r.height) * 0.42;
        const a = Math.atan2(rt, D) * 180 / Math.PI, len = D * 1.5, w = 2 * Math.tan(a * Math.PI / 180) * len * 1.7;
        mk("hz", { left: sx - w / 2 + "px", top: sy + "px", width: w + "px", height: len + "px", transform: `rotate(${(-Math.atan2(dx, dy) * 180 / Math.PI).toFixed(2)}deg)` }, { "--a": a.toFixed(2) + "deg", "--d": d });
        cones.push([sx, sy, tx, ty, rt * 0.25, rt * 1.25, 1.2]); pools.push([tx, ty, r.width * 0.8, r.height * 0.72, 1.25]);
      });
      /* el cartel enciende la sala: su resplandor, y el oro que cae sobre la carta del centro, que tiene el suyo */
      const [lx, ly] = c(logo), [hx, hy] = c(cards[1]), h = cards[1];
      mk("gl", { left: lx - logo.width * 0.85 + "px", top: ly - logo.height * 1.25 + "px", width: logo.width * 1.7 + "px", height: logo.height * 2.5 + "px" }, { "--lc": "255, 186, 84", "--li": ".3", "--d": ".1s" });
      { const sy = logo.bottom - logo.height * 0.15, D = hy - sy, rt = h.width * 0.62, rm = logo.width * 0.3, a = Math.max(4, Math.atan2(rt - rm, D) * 180 / Math.PI), ta = Math.tan(a * Math.PI / 180), len = D * 1.45, w = 2 * (rm + ta * len) * 1.6;
        mk("hz", { left: hx - w / 2 + "px", top: sy + "px", width: w + "px", height: len + "px" }, { "--a": a.toFixed(2) + "deg", "--oy": -(rm / ta).toFixed(0) + "px", "--lc": "255, 196, 96", "--li": ".22", "--d": ".2s" }); }
      mk("gl", { left: hx - h.width * 0.95 + "px", top: hy - h.height * 0.72 + "px", width: h.width * 1.9 + "px", height: h.height * 1.44 + "px" }, { "--lc": "255, 180, 76", "--li": ".3", "--d": ".2s" });
      pools.push([hx, hy, h.width * 0.95, h.height * 0.8, 1.3], [lx, ly, logo.width * 0.75, logo.height * 1.05, 1.15]);
      hs = { key, cones, pools }; vista = true; if (A.casa && A.casa.mira) A.casa.mira();
    };
    htm = setTimeout(() => { pon(); htm = setTimeout(pon, 900); }, vista ? 420 : 950);   // las cartas ya estan repartidas (entran con transform)
  }
  addEventListener("resize", () => { const d = $("dlg"); if (d && d.classList.contains("home")) portada(); });

  A.escena = { portada, luzPortada: () => { const d = $("dlg"); return hs && d && d.classList.contains("home") && luces() ? hs : null; },
    monta, desmonta, luz: () => (st && st.luz && st.tel.isConnected && luces() ? st.luz : null) };
})(window.AIQ);
