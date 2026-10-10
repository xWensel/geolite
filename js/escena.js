/*
 * Geolite - LA ESCENA (v0.3.70). La luz que se ve en el aire: lo que flota entre la penumbra de la sala (js/casa.js) y las piezas.
 *
 *  - La portada tiene focos de sala: dos focos de techo caen en diagonal sobre las cartas de los lados, el cartel enciende la sala y su oro
 *    baja hasta la carta de la Aventura, que tiene su propio resplandor.
 *
 * Todo son capas quietas detras de las piezas y del crupier (css/escena.css): se miden una vez, cuando la pantalla ya ha entrado, y no cuestan
 * nada por fotograma. A js/casa.js se le dice donde cae cada foco (luzPortada) para que recorte su cono en la penumbra.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const $ = id => document.getElementById(id);
  const luces = () => document.documentElement.classList.contains("sala-on");       // Ajustes > Pantalla > Luces de la sala (js/casa.js)

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

  A.escena = { portada, luzPortada: () => { const d = $("dlg"); return hs && d && d.classList.contains("home") && luces() ? hs : null; } };
})(window.AIQ);
