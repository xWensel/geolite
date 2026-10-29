/* Geolite - LATON REPASADO (paquete «Portada» del Probador: por-laton, voto del autor, en Extrema).
 * El filo de laton de las cinco placas de la portada, repintado al pixel: bandas horizontales de 1 px en cinco tonos de la paleta (rampa de oro),
 * luz arriba y sombra abajo, una variacion fija por fila (el repasado de la lima), los lados con un tono mas o menos, y su canto debajo.
 * Al entrar el raton (o el foco del mando) en una placa, un brillo cruza la placa una vez en diagonal, a escalones: el filo sube de tono y el
 * esmalte recibe un barniz en tres escalones. Todo dentro de la placa: nada sale de ella (sin luces alrededor de los botones).
 *  - Un lienzo 2D por placa (dentro de .plq, debajo del icono y del texto), a los pixeles reales de la pantalla; el filo se pinta una vez y
 *    solo se repinta durante el brillo (0,4 s).
 *  - Movimiento Minimo: el laton repasado se queda; al pasar el raton la placa se aclara un poco, sin barrido.
 * hub.js llama a A.laton.monta() al pintar la portada.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const RAMPA = ["#3c240a", "#c46a1b", "#f5a623", "#fdd742", "#fff3b0"].map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  const P = { gros: 6, var: 1.4, esmalte: 1, vel: 0.4 };          // Extrema (a 1080: 6 px de filo)
  const reduced = () => !!(A.core && A.core.S && A.core.S.reduce);
  const h11 = p => { p = (p * 0.1031) % 1; if (p < 0) p += 1; p *= p + 33.33; p *= p + p; return p - Math.floor(p); };
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const vivas = new Set();

  /* una placa: geometria en px reales. La caja del filo es la placa con 2 px de CSS de mas por cada lado (el laton de .plq::before, sin su
     contorno de fuera); el canto va 4-6 px de CSS por debajo */
  function prepara(b) {
    let cv = b.querySelector(":scope > canvas.plq-laton");
    if (!cv) { cv = document.createElement("canvas"); cv.className = "plq-laton"; cv.setAttribute("aria-hidden", "true"); b.insertBefore(cv, b.firstChild); }
    const w = b.offsetWidth, h = b.offsetHeight; if (!w || !h) return null;
    const r = b.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const z = (r.width / w || 1) * dpr;                            // px reales por px de CSS de la placa (zoom de la portada y pantalla)
    const f = z / 1.5;                                             // la maqueta esta a 1080 (zoom 1,5): 1 px de alli = f px reales
    const cw = Math.round((w + 4) * z), boxH = Math.round((h + 4) * z), K0 = boxH - 1 + Math.round(4 * f), K1 = boxH - 1 + Math.round(7 * f);
    const ch = K1 + 1;
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    cv.style.width = cw / z + "px"; cv.style.height = ch / z + "px";
    const o = { b, cv, g: cv.getContext("2d"), cw, ch, boxH, K0, K1, f, gros: Math.max(2, Math.round(P.gros * f)), s: -1, hov: 0, raf: 0 };
    b._laton = o; vivas.add(o);
    return o;
  }
  /* el pase de la maqueta, pixel a pixel (solo el filo, el canto y, durante el brillo, el barniz del esmalte) */
  function pinta(o) {
    const { cw, ch, boxH, K0, K1, f, gros } = o, img = o.g.createImageData(cw, ch), d = img.data;
    const x0 = 0, x1 = cw - 1, Y0 = 0, Y1 = boxH - 1, Hh = Y1 - Y0;
    const s = o.s, hov = o.hov, esm = P.esmalte * 1.4;
    const put = (i, c, a = 255) => { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; };
    const tone = t => RAMPA[Math.max(0, Math.min(4, Math.floor(t + 0.5)))];
    for (let y = 0; y < ch; y++) {
      const row = (y - Y0) / f;                                    // en filas de la maqueta (a 1080)
      const inBox = y <= Y1, inK = y >= K0 && y <= K1;
      if (!inBox && !inK) continue;
      const v = (h11(Math.floor(row) * 1.37 + 7) - 0.5) * P.var;     // el repasado: fijo por fila
      const quieto = !(s > 0 || hov > 0) && inBox && y - Y0 >= gros && Y1 - y >= gros;   // en reposo, en el medio de la placa solo hay filo a los lados
      for (let x = 0; x < cw; x++) {
        if (quieto && x === gros) x = cw - gros;
        const u = (x - x0 + (y - Y0) * 0.7) / (x1 - x0 + Hh * 0.7);
        let b = s > 0 ? 1 - smooth(0, 0.055, Math.abs(u - (s * 1.3 - 0.15))) : 0;
        b = Math.max(b, hov * 0.35 * (1 - smooth(0, 0.3, Math.abs(u - 0.5))));
        const i = (y * cw + x) * 4;
        if (inBox) {
          const dx = Math.min(x - x0, x1 - x), dy = Math.min(y - Y0, Y1 - y), dd = Math.min(dx, dy);
          if (dd < gros) {
            let t;
            if (y - Y0 < gros && dy < dx + 0.5) t = 4 - ((y - Y0) / f >= 0.5 ? 1 : 0) * (0.6 + ((y - Y0) / f >= 1.5 ? 1 : 0) * 0.5);   // arriba: luz
            else if (Y1 - y < gros && dy < dx + 0.5) t = 1.2 - (1.5 - (Y1 - y) / f >= 0.5 ? 1 : 0) * 0.6;                             // abajo: sombra
            else t = 3.3 + (1.4 - 3.3) * (row / (Hh / f)) + v + (x - x0 < gros ? 0.35 : -0.35);                                      // lados
            t += Math.floor(b * 2.4 + 0.3);
            put(i, o.foco && o.s < 0 ? [255, 255, 255] : tone(t));      // con el foco del mando, el filo en blanco (el aviso de foco de siempre)
          } else if (b > 0) {
            /* el esmalte recibe el brillo como un barniz: tres escalones, dentro de la placa (screen con un gris calido = mezcla hacia el blanco) */
            const a = Math.floor(b * 3) / 3 * 0.32 * esm * 0.55;
            if (a > 0) put(i, [255, 241, 209], Math.round(Math.min(1, a) * 255));
          }
        } else {
          const rr = (y - K0) / f;
          const t = 2 - rr * 0.55 + (h11(Math.floor(rr) * 3.1 + 2) - 0.5) * P.var * 0.6 + Math.floor(b * 1.6);
          const c = tone(t); put(i, [c[0] * 0.82, c[1] * 0.82, c[2] * 0.82]);   // el canto, a la sombra de la placa
        }
      }
    }
    o.g.putImageData(img, 0, 0);
  }
  /* el brillo que cruza (0,4 s); con Movimiento Minimo, la placa solo se aclara mientras el raton esta encima */
  function cruza(o) {
    if (reduced()) { o.hov = 1; pinta(o); return; }
    if (o.s > 0 && o.s < 0.5) return;                              // ya cruzando
    o.s = 0.0001; let last = performance.now();
    const step = now => {
      if (!o.cv.isConnected) { o.raf = 0; return; }
      o.s += Math.min(0.05, (now - last) / 1000) / P.vel; last = now;
      if (o.s > 1) { o.s = -1; pinta(o); o.raf = 0; return; }
      pinta(o); o.raf = requestAnimationFrame(step);
    };
    cancelAnimationFrame(o.raf); o.raf = requestAnimationFrame(step);
  }
  const sale = o => { if (o.hov) { o.hov = 0; pinta(o); } };

  /* la portada: una vez por pintado (hub.js home) */
  function monta(root) {
    const deck = root && root.querySelector(".hh-deck"); if (!deck) return;
    if (!matchMedia("(min-width: 900px) and (min-height: 520px)").matches) return;   // el filo de laton al pixel es de escritorio y Deck (css/relieve.css)
    deck.querySelectorAll(":scope > .plq").forEach(b => {
      const o = prepara(b); if (!o) return; pinta(o);
      if (b._latonOn) return; b._latonOn = true;
      b.addEventListener("pointerenter", () => { const q = b._laton; if (q) cruza(q); });
      b.addEventListener("pointerleave", () => { const q = b._laton; if (q) sale(q); });
      b.addEventListener("focus", () => { const q = b._laton; if (q && (b.matches(":focus-visible") || document.documentElement.dataset.input === "pad")) { q.foco = true; cruza(q); } });   // el foco del mando o del teclado
      b.addEventListener("blur", () => { const q = b._laton; if (q) { q.foco = false; q.hov = 0; pinta(q); } });
    });
  }
  /* la ventana cambia: se rehacen a su nueva medida (las placas de la portada que siguen montadas) */
  let rt = 0;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { for (const o of [...vivas]) { if (!o.cv.isConnected) { vivas.delete(o); continue; } const q = prepara(o.b); if (q) pinta(q); } }, 120); });

  A.laton = { monta };
})(window.AIQ);
