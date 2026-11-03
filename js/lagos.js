/* Geolite - LAGOS Y EMBALSES del mapa fisico (v0.4.52; datos en data/lagos.js, Natural Earth 10m).
   Cada lago entra con el zoom segun su rango (0 = Superior, Victoria, Baikal... 12 = los pequenos de Europa): a mundo entero ya se ven los grandes
   y, al acercarte, los medianos y los embalses, con un fundido. El agua de un lago es la misma mesa que el mar: el motor la pinta con el programa
   del oceano de cada mesa (js/map.js) y la quita de la tierra en la silueta (luz de orilla) y en la mascara de la firma (js/firma.js).
   Solo es dibujo: no cambia ninguna respuesta ni distancia. */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  /* zoom (1 = mundo entero) al que empieza a entrar cada rango; acaba de entrar a x1,4 */
  const Z = [0.5, 0.6, 0.8, 1.25, 1.8, 2.5, 3.5, 4.8, 6.8, 9.5, 15, 22, 32];
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function alphas(z) { const a = new Float32Array(13); for (let r = 0; r < 13; r++) a[r] = ss(Z[r], Z[r] * 1.4, z); return a; }
  /* tramos de rangos que dibujar: los ya enteros juntos y cada uno a medio fundir aparte. [desde, hasta (sin incluir), alfa] */
  function runs(a) {
    const out = []; let r = 0;
    while (r < 13 && a[r] >= 0.999) r++;
    if (r > 0) out.push([0, r, 1]);
    for (; r < 13; r++) if (a[r] > 0.003) out.push([r, r + 1, a[r]]);
    return out;
  }
  /* [lon, lat, dlon, dlat...] en milesimas de grado -> [[lon, lat]...] */
  const un = e => { const o = []; let x = 0, y = 0; for (let i = 0; i < e.length; i += 2) { x += e[i]; y += e[i + 1]; o.push([x / 1000, y / 1000]); } return o; };
  let list = null;
  function decode() {
    if (list) return list;
    list = (A.LAGOS || []).map(([rank, res, rings, shores, n]) => {
      const R = rings.map(un), S = shores === 1 ? R : shores.map(un);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const [lo, la] of R[0]) { if (lo < x0) x0 = lo; if (lo > x1) x1 = lo; if (la < y0) y0 = la; if (la > y1) y1 = la; }
      return { rank, res, rings: R, shores: S, bbox: [x0, y0, x1, y1], n: n || 0 };
    });
    return list;
  }
  /* v0.4.55: NIVELES DE DETALLE de lagos y rios (generalizacion, para js/map.js y js/map2d.js): con el detalle de 70x, a poco zoom miles de entrantes
     de menos de un pixel se amontonaban en una mancha (la orilla del Victoria). Cada nivel guarda la forma con un error menor de 0,8 px (en 1920 px)
     hasta su zoom (6x, 20x); el ultimo es el detalle entero */
  const LOD_Z = [6, 20, 0], lodTol = z => (Math.PI * 2) / (1920 * z) * 0.8, lodOf = z => (z < 6 ? 0 : z < 20 ? 1 : 2);   // con el grano de las costas (50m)
  function simplify(pts, tol) {                                       // Douglas-Peucker en coordenadas del mundo ([x, y])
    const n = pts.length; if (n < 3) return pts;
    const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1; const st = [0, n - 1], t2 = tol * tol;
    while (st.length) { const b = st.pop(), a = st.pop(), [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy; let best = -1, bi = -1;
      for (let i = a + 1; i < b; i++) { const [px, py] = pts[i]; let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; const ex = px - ax - t * dx, ey = py - ay - t * dy, d = ex * ex + ey * ey; if (d > best) { best = d; bi = i; } }
      if (best > t2) { keep[bi] = 1; st.push(a, bi, bi, b); } }
    const out = []; for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i]); return out;
  }
  A.lagos = { Z, alphas, runs, list: decode, LOD_Z, lodTol, lodOf, simplify };
})(window.AIQ);
