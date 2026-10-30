/*
 * Geolite - EL INSTANTE DECISIVO (v0.3.24x · paquete «Campamento y casino» del Probador, votado SI en Extrema). En los juegos de la Barra, en el
 * ultimo instante antes del resultado (550 ms en Extrema) la sala entera se queda sin color salvo la pieza que decide (la casilla bajo el puntero,
 * la cuna de la rueda, la moneda, el cubilete que levantas, tus dados, la casilla del Plinko y la ficha) y tu apuesta; el sonido se tensa (un grave
 * que sube; con mucho en juego, un latido y el mando que vibra). Al caer, el color vuelve de golpe y el juego ensena su resultado como siempre.
 *   const d = A.decisivo.vigila(capa, { keep: () => [elementos o DOMRect], tier: 1-3 })
 *   d.falta(segundos)   en cada fotograma: lo que le falta al resultado; al entrar en la ventana, empieza
 *   d.ya()              empieza ahora (cuando el juego sabe que el resultado llega en ~la ventana)
 *   d.fin()             el resultado ha caido: vuelve el color
 * Corre con el reloj de los juegos (js/casino-ctl.js): con x2 el instante se acorta con el; saltando (x14) no existe; Movimiento minimo, tampoco.
 * Nunca delata nada: solo empieza cuando el resultado ya esta decidido y en camino (el Globo y el Rasca, que decides tu, no lo llevan).
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const W = 0.55, GRIS = 1, TENSION = 1, NIVEL = [0.65, 0.9, 1];          // Extrema: ventana 550 ms, todo el color se va, tension al maximo
  const quieto = () => document.documentElement.classList.contains("reduce-motion");
  const saltando = () => !!(A.casCtl && A.casCtl.speed >= (A.casCtl.FF || 14));
  const rect = x => (x && x.getBoundingClientRect ? x.getBoundingClientRect() : x);
  /* la mascara: toda la pantalla menos los huecos de las piezas que deciden (svg con evenodd, en pixeles de la ventana) */
  function mascara(rs) {
    const w = innerWidth, h = innerHeight; let d = `M0 0H${w}V${h}H0Z`;
    for (const r of rs) if (r && r.width > 0 && r.height > 0) d += `M${r.left.toFixed(1)} ${r.top.toFixed(1)}H${r.right.toFixed(1)}V${r.bottom.toFixed(1)}H${r.left.toFixed(1)}Z`;
    return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><path fill-rule='evenodd' d='${d}'/></svg>`)}")`;
  }
  /* piezas con forma propia (dados, cubiletes, ficha, casilla): en vez de recortar un hueco cuadrado en el velo (se veia un cuadrado sin apagar alrededor de
     cada dado), se apaga TODO lo demas: los hermanos de cada pieza y de sus ancestros hasta la capa del juego, uno a uno; la pieza conserva su color y su
     silueta exacta. Si alguna pieza es un rectangulo virtual (la cuna de la rueda, el arco de la moneda), vale el velo con huecos de siempre */
  const apagables = (ov, els) => {
    const ruta = new Set(); els.forEach(k => { for (let n = k; n && n !== ov; n = n.parentElement) ruta.add(n); });
    const fuera = []; const anda = n => { for (const c of n.children) { if (c.classList.contains("dcv")) continue; if (!ruta.has(c)) fuera.push(c); else if (!els.includes(c)) anda(c); } };
    anda(ov); return fuera;
  };
  function vigila(ov, o = {}) {
    const tier = Math.max(1, Math.min(3, o.tier | 0 || 1)), keep = typeof o.keep === "function" ? o.keep : () => o.keep || [];
    let el = null, luz = [], on = false, done = false, raf = 0, t0 = 0, last = 0, des = 0, sig = "", out = false, tOut = 0, win = W, lift = false;
    const tocados = new Map();                                              // elemento -> su filtro de antes (modo piezas con silueta)
    const apaga = (x, f) => { if (!tocados.has(x)) tocados.set(x, x.style.filter); if (x.style.filter !== f) x.style.filter = f; };
    const pinta = now => {
      raf = 0; if (!ov.isConnected || (!lift && (!el || !el.isConnected))) { quita(); return; }
      const t = (now - t0) / 1000;
      if (!out) { const q = Math.min(1, t / win); des = Math.min(1, q * 6) * GRIS * NIVEL[tier - 1]; }
      else des *= Math.pow(0.0005, Math.min(0.05, (now - (last || now)) / 1000));
      last = now;
      if (lift) {
        const ks = keep().filter(k => k && k.nodeType === 1 && ov.contains(k) && k.getBoundingClientRect().width > 0);
        const f = des < 0.005 ? "" : `grayscale(${des.toFixed(3)}) brightness(${(1 - 0.45 * des).toFixed(3)})`;
        apagables(ov, ks).forEach(x => apaga(x, f)); tocados.forEach((v, x) => { if (!x.isConnected) tocados.delete(x); });
        if (out && des < 0.01) { quita(); return; }
        raf = requestAnimationFrame(pinta); return;
      }
      const rs = keep().map(rect).filter(Boolean), s = rs.map(r => [r.left, r.top, r.width, r.height].map(Math.round).join(",")).join(";") + "|" + innerWidth + "x" + innerHeight;
      if (s !== sig) {
        sig = s; const m = mascara(rs); el.style.webkitMaskImage = el.style.maskImage = m;
        luz.forEach(x => x.remove()); luz = rs.map(r => { const l = document.createElement("i"); l.className = "dcv-luz"; Object.assign(l.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" }); ov.appendChild(l); return l; });
      }
      el.style.opacity = des.toFixed(3); luz.forEach(l => { l.style.opacity = Math.min(1, des * 1.2).toFixed(3); });
      if (out && des < 0.01) { quita(); return; }
      raf = requestAnimationFrame(pinta);
    };
    const quita = () => { if (raf) cancelAnimationFrame(raf); raf = 0; tocados.forEach((v, x) => { x.style.filter = v; }); tocados.clear(); if (el) el.remove(); luz.forEach(x => x.remove()); el = null; luz = []; };
    const ya = (ventana) => {
      if (on || done || quieto() || saltando() || !ov.isConnected) return; on = true;
      win = Math.max(0.15, Math.min(W, ventana || W));
      const k0 = keep(); lift = k0.length > 0 && k0.every(k => k && k.nodeType === 1);
      if (!lift) { el = document.createElement("i"); el.className = "dcv"; el.setAttribute("aria-hidden", "true"); ov.appendChild(el); }
      t0 = performance.now(); last = 0; raf = requestAnimationFrame(pinta);
      try { if (A.sfx && A.sfx.decisivo) A.sfx.decisivo(win, tier, TENSION); } catch (e) { /* sin audio */ }
      if (tier === 3 && A.haptic && A.haptic.dual) A.haptic.dual(0.3, 0, Math.round(win * 1000));
    };
    const falta = s => { if (!on && !done && s <= W && s > 0.05) ya(s); };
    const fin = () => { if (done) return; done = true; if (!on) return; out = true; tOut = performance.now(); if (!raf && el) raf = requestAnimationFrame(pinta); };
    return { falta, ya, fin, get on() { return on; } };
  }
  /* lo que te juegas, en 1-3: la apuesta frente a lo que llevabas */
  const tierDe = (stake, coins) => { const k = coins > 0 ? stake / coins : 1; return k >= 0.5 ? 3 : k >= 0.2 ? 2 : 1; };
  A.decisivo = { vigila, tierDe, W };
})(window.AIQ);
