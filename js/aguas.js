/* Geolite - aguas con frontera (v0.2.5): los mares, oceanos, golfos, estrechos y lagos del banco se aciertan haciendo clic DENTRO de su masa de
   agua, como un pais, aunque la frontera no se vea (data/aguas.js, tools/build-aguas.mjs). Se tratan como un pais para medir (km 0 dentro, si no
   distancia al borde) y la pregunta sigue siendo un lugar para todo lo demas (pistas, etiquetas, Enciclopedia). Al responder se dibuja su territorio. */
window.AIQ = window.AIQ || {};
(function (A) {
  const cache = {};
  /* la misma forma que un pais del mapa (polys con rings y bbox), para que A.geo.inFeature y A.geo.distToFeature la midan igual */
  function feat(id) {
    if (cache[id]) return cache[id];
    const d = A.WATERS && A.WATERS[id]; if (!d) return null;
    const polys = d.p.map(rings => {
      const rr = rings.map(flat => { const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i], flat[i + 1]]); if (r.length > 2 && (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1])) r.push(r[0].slice()); return r; });   // cerrado: la distancia mide tambien el lado de vuelta al primero
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [lo, la] of rr[0]) { if (lo < x0) x0 = lo; if (lo > x1) x1 = lo; if (la < y0) y0 = la; if (la > y1) y1 = la; }
      return { rings: rr, bbox: [x0, y0, x1, y1] };
    });
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of polys) { x0 = Math.min(x0, p.bbox[0]); y0 = Math.min(y0, p.bbox[1]); x1 = Math.max(x1, p.bbox[2]); y1 = Math.max(y1, p.bbox[3]); }
    return (cache[id] = { name: id, water: true, polys, bbox: [x0, y0, x1, y1], label: d.c || null, ct: null });
  }
  /* trazado en coordenadas proyectadas del mundo (para el mapa 2D de reserva); con las copias de +-una vuelta, como los paises */
  function path(f) {
    if (f.path) return f.path;
    const P = A.geo.project, TAU = Math.PI * 2, base = new Path2D();
    for (const p of f.polys) for (const ring of p.rings) { ring.forEach(([lo, la], k) => { const [x, y] = P(lo, Math.max(-89.9, Math.min(89.9, la))); k ? base.lineTo(x, y) : base.moveTo(x, y); }); base.closePath(); }
    const all = new Path2D(); all.addPath(base); all.addPath(base, new DOMMatrix().translate(-TAU, 0)); all.addPath(base, new DOMMatrix().translate(TAU, 0));
    return (f.path = all);
  }
  /* ZONAS: una respuesta que es la union de varios paises (tango = Argentina + Uruguay, hummus = el Levante...). Se arma con los poligonos de los
     paises del mapa (nombres de Natural Earth) y se trata como una masa de agua: km 0 dentro de cualquiera de ellos, si no distancia al borde mas cercano */
  const zcache = {};
  function zoneFeat(keys) {
    const id = "zona:" + keys.join("+"); if (zcache[id]) return zcache[id];
    const W = A.core && A.core.world && A.core.world.byName; if (!W) return null;
    const fs = keys.map(k => W[k]).filter(Boolean); if (!fs.length) return null;
    const polys = []; fs.forEach(f => f.polys.forEach(p => polys.push(p)));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of polys) { x0 = Math.min(x0, p.bbox[0]); y0 = Math.min(y0, p.bbox[1]); x1 = Math.max(x1, p.bbox[2]); y1 = Math.max(y1, p.bbox[3]); }
    return (zcache[id] = { name: id, water: true, zone: true, polys, bbox: [x0, y0, x1, y1], label: [(x0 + x1) / 2, (y0 + y1) / 2], ct: null });
  }
  A.waters = {
    has: id => !!(A.WATERS && A.WATERS[id]),
    feat, path,
    of: o => (o && o.area ? feat(o.area) : o && o.zone ? zoneFeat(o.zone) : null),   // la masa de agua o la zona de una pregunta, o null si es un punto (o un pais)
  };
})(window.AIQ);
