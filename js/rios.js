/* Geolite - RIOS del mapa fisico (v0.4.53; datos en data/rios.js, Natural Earth 10m).
   Cada rio entra con el zoom segun su rango (0-1 = Amazonas, Nilo, Misisipi... 12 = los pequenos de Europa), con un fundido y creciendo de grosor:
   los grandes, algo mas anchos. El agua es la de la mesa: en las mesas de siempre, su agua somera o su oceano (el que mas se distinga de la tierra,
   o `rio` en js/skins.js); en las de material nuevo de la firma, el mismo mar que pintan (js/firma.js). Pasa por debajo de las fronteras.
   Solo es dibujo: no cambia ninguna respuesta ni distancia. */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  /* zoom (1 = mundo entero) al que empieza a entrar cada rango; acaba de entrar a x1,45 */
  const Z = [1.35, 1.5, 1.9, 2.5, 3.3, 4.5, 6.3, 8.8, 12.5, 17, 24, 33, 45];
  /* grosor (px CSS) de cada rango ya entero, a zoom medio; con mucho zoom crece hasta x1,55 */
  const W = [1.45, 1.35, 1.2, 1.08, 1.0, 0.92, 0.84, 0.76, 0.7, 0.66, 0.62, 0.6, 0.6];
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function alphas(z) { const a = new Float32Array(13); for (let r = 0; r < 13; r++) a[r] = ss(Z[r], Z[r] * 1.45, z); return a; }
  const width = (r, z, a) => W[r] * (0.45 + 0.55 * a) * (1 + 0.55 * ss(8, 70, z));
  /* el agua de una mesa de siempre: `rio` si la mesa lo trae; si no, su agua somera o su oceano, el que mas se distinga de la tierra */
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const luma = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  function color(st) {
    if (st.rio) return hex(st.rio);   // color propio de la mesa (tiza, plano, neon...): tal cual
    const land = (st.land || ["#888888"]).slice(0, 6).map(hex), lL = land.reduce((s, c) => s + luma(c), 0) / land.length;
    const sh = hex(st.shallow || st.oceanTop), ot = hex(st.oceanTop || st.shallow);
    let c = Math.abs(luma(sh) - lL) >= Math.abs(luma(ot) - lL) ? sh : ot;
    const d = luma(c) - lL;
    if (Math.abs(d) < 0.22) { const k = lL > 0.5 ? (lL - 0.3) / Math.max(luma(c), 0.05) : 1; c = lL > 0.5 ? c.map(v => v * Math.min(1, k)) : c.map(v => v + (1 - v) * 0.45); }
    return lighter(c, lL);
  }
  /* el agua, mas clara si es mucho mas oscura que la tierra: hasta 0,25 de luminancia por debajo de ella, para que un rio nunca se lea como la tinta
     de una frontera (la misma regla en el horneado de la firma, js/firma.js) */
  function lighter(c, lL) {
    const lc = luma(c), want = lL - 0.25; if (lc >= want) return c;
    const t = Math.min(1, (want - lc) / Math.max(1 - lc, 0.01)); return c.map(v => v + (1 - v) * t);
  }
  /* [lon, lat, dlon, dlat...] en milesimas de grado -> [[lon, lat]...] */
  const un = e => { const o = []; let x = 0, y = 0; for (let i = 0; i < e.length; i += 2) { x += e[i]; y += e[i + 1]; o.push([x / 1000, y / 1000]); } return o; };
  let list = null;
  function decode() {
    if (list) return list;
    const R = A.RIOS || { p: [], r: [] };
    list = R.r.map(([rank, p, line]) => ({ rank, pais: R.p[p], line: un(line) }));
    return list;
  }
  A.rios = { Z, alphas, width, color, list: decode };
})(window.AIQ);
