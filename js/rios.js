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
    list = R.r.map(([rank, p, line, n]) => {
      const L = un(line); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const [lo, la] of L) { if (lo < x0) x0 = lo; if (lo > x1) x1 = lo; if (la < y0) y0 = la; if (la > y1) y1 = la; }
      return { rank, pais: R.p[p], line: L, n: n || 0, bbox: [x0, y0, x1, y1] };
    });
    return list;
  }

  /* ---------------------------------------------------------------- AGUA CERCANA (v0.4.54): la nota de campo del veredicto
     El rio con nombre a menos de 15 km de la respuesta (entre varios, el mas importante si estan casi igual de cerca: km + 1,2 por rango) y el lago
     o embalse con nombre a menos de 10 km (0 si la respuesta esta dentro). Nombres de Natural Earth en el idioma del jugador. Solo despues de
     responder: nunca da pistas. */
  const RIO_KM = 15, LAGO_KM = 10;
  const LI = { es: 0, "es-419": 0, en: 1, fr: 2, pt: 3, de: 4, it: 5, zh: 6, ko: 7, ja: 8, ru: 9, pl: 10 };
  const nameOf = row => { if (!row) return ""; const i = LI[A.lang] != null ? LI[A.lang] : 1; return row[i] || row[1] || ""; };
  /* distancia en km de un punto a un segmento, en el plano local del punto (exacta a estas distancias) */
  function segKm(lon, lat, a, b) {
    const kx = 111.32 * Math.cos(lat * Math.PI / 180), ky = 110.57;
    const ax = (a[0] - lon) * kx, ay = (a[1] - lat) * ky, bx = (b[0] - lon) * kx, by = (b[1] - lat) * ky, dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0; return Math.hypot(ax + t * dx, ay + t * dy);
  }
  const inRing = (x, y, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  function cerca(lon, lat) {
    const mx = 0.25 / Math.max(0.2, Math.cos(lat * Math.PI / 180)), my = 0.15;   // ~15 km de margen en grados
    let rio = null, best = 1e9;
    for (const t of decode()) {
      if (!t.n || lon < t.bbox[0] - mx || lon > t.bbox[2] + mx || lat < t.bbox[1] - my || lat > t.bbox[3] + my) continue;
      let d = 1e9; for (let i = 0; i < t.line.length - 1; i++) d = Math.min(d, segKm(lon, lat, t.line[i], t.line[i + 1]));
      const sc = d + 1.2 * t.rank; if (d <= RIO_KM && sc < best) { best = sc; rio = { n: t.n, km: d }; }
    }
    let lago = null;
    for (const l of (A.lagos ? A.lagos.list() : [])) {
      if (!l.n || lon < l.bbox[0] - mx || lon > l.bbox[2] + mx || lat < l.bbox[1] - my || lat > l.bbox[3] + my) continue;
      let d = inRing(lon, lat, l.rings[0]) && !l.rings.slice(1).some(h => inRing(lon, lat, h)) ? 0 : 1e9;
      if (d) for (const r of l.rings) for (let i = 0; i < r.length - 1; i++) d = Math.min(d, segKm(lon, lat, r[i], r[i + 1]));
      if (d <= LAGO_KM && (!lago || d < lago.km)) lago = { n: l.n, km: d, res: l.res };
    }
    return { rio: rio && { name: nameOf((A.RIOS.n || [])[rio.n - 1]), km: rio.km }, lago: lago && { name: nameOf((A.LAGOS_N || [])[lago.n - 1]), km: lago.km, res: lago.res } };
  }
  const TX = { rio: "Río|River|Cours d’eau|Rio|Fluss|Fiume||河流|강|川|Река|Rzeka", lago: "Lago|Lake|Lac|Lago|See|Lago||湖泊|호수|湖|Озеро|Jezioro",
    emb: "Embalse|Reservoir|Réservoir|Represa|Stausee|Bacino||水库|저수지|貯水池|Водохранилище|Zbiornik" };
  /* palabras que ya dicen que es (entonces no se repite la etiqueta); en chino, coreano y japones el nombre ya lleva su 河 / 湖 / 강 */
  const TIPO = /(^|[\s-])(lago|lake|lac|see|presa|embalse|reservoir|réservoir|dam|barrage|represa|stausee|talsperre|bacino|diga|lagoa|озеро|водохранилище|река|jezioro|zbiornik|rzeka|river|rio|río|fleuve|rivière|fluss|fiume)([\s-]|$)/i;
  function item(k, x) {
    if (!x.name) return "";
    const w = A.pick6(TX[k]), lab = /^(zh|ko|ja)/.test(A.lang) || TIPO.test(x.name) || x.name.toLowerCase().endsWith(w.toLowerCase()) ? "" : w + (A.lang === "fr" ? " : " : ": ");   // Genfersee, Bodensee: ya lo dice
    return lab + x.name + (x.km >= 1 && A.fmtDist ? " (" + A.fmtDist(x.km) + ")" : "");
  }
  /* la linea de la nota de campo para la respuesta de una pregunta (un lugar: ni pais, ni masa de agua, ni zona) */
  function nota(o) {
    if (!o || o.t === "c" || o.area || o.zone || o.lat == null || o.lon == null) return "";
    const c = cerca(o.lon, o.lat);
    return [c.rio && item("rio", c.rio), c.lago && item(c.lago.res ? "emb" : "lago", c.lago)].filter(Boolean).join("  ·  ");
  }
  A.rios = { Z, alphas, width, color, list: decode, cerca, nota };
})(window.AIQ);
