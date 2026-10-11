/* Geolite - geometria: proyeccion Miller, distancias y construccion del mundo. */
window.AIQ = window.AIQ || {};
(function (A) {
  const D2R = Math.PI / 180;
  const R_KM = 6371.0088;

  /* Proyeccion cilindrica de Miller (invertible, finita en los polos) */
  function project(lon, lat) {
    return [lon * D2R, 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * D2R))];
  }
  function unproject(x, y) {
    return [x / D2R, (2.5 * (Math.atan(Math.exp(0.8 * y)) - Math.PI / 4)) / D2R];
  }

  function haversine(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * D2R, dLon = (lon2 - lon1) * D2R;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.sin(dLon / 2) ** 2;
    return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  const wrap = d => (d > 180 ? d - 360 : d < -180 ? d + 360 : d);

  /* ---------- punto dentro de poligono (lon/lat planos) ---------- */
  function inRing(lon, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function inPoly(lon, lat, poly) {
    const b = poly.bbox;
    if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) return false;
    if (!inRing(lon, lat, poly.rings[0])) return false;
    for (let i = 1; i < poly.rings.length; i++) if (inRing(lon, lat, poly.rings[i])) return false;
    return true;
  }
  function inFeature(lon, lat, f) {
    for (const p of f.polys) {
      if (inPoly(lon, lat, p) || inPoly(lon + 360, lat, p) || inPoly(lon - 360, lat, p)) return true;
    }
    return false;
  }


  /* punto bien DENTRO de un poligono (el mas alejado de su borde, en una malla): la bandera del revelado cae en tierra, no en el mar
     (el centro de la caja de Vietnam, Chile o Italia queda fuera del pais). Si el centro de la caja ya esta dentro y holgado, se queda. */
  function innerPoint(poly) {
    if (poly.inner) return poly.inner;
    const b = poly.bbox, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, kx = Math.max(0.2, Math.cos(cy * D2R));
    const edge = (lo, la) => {                                    // distancia plana (en grados escalados) al borde mas cercano, todos los anillos
      let m = Infinity;
      for (const r of poly.rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const ax = (r[j][0] - lo) * kx, ay = r[j][1] - la, dx = (r[i][0] - r[j][0]) * kx, dy = r[i][1] - r[j][1], l2 = dx * dx + dy * dy;
        const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0, ex = ax + t * dx, ey = ay + t * dy, d = ex * ex + ey * ey;
        if (d < m) m = d;
      }
      return Math.sqrt(m);
    };
    let best = null, bd = -1;
    const scan = (x0, y0, x1, y1, n) => {
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
        const lo = x0 + (x1 - x0) * i / n, la = y0 + (y1 - y0) * j / n;
        if (!inPoly(lo, la, poly)) continue;
        const d = edge(lo, la); if (d > bd) { bd = d; best = [lo, la]; }
      }
    };
    scan(b[0], b[1], b[2], b[3], 20);
    if (best) { const w = (b[2] - b[0]) / 20, h = (b[3] - b[1]) / 20; scan(best[0] - w, best[1] - h, best[0] + w, best[1] + h, 8); }
    const mid = inPoly(cx, cy, poly) ? edge(cx, cy) : -1;
    return (poly.inner = best && bd > mid * 1.05 ? best : [cx, cy]);   // sin hueco interior (Antartida, rarezas): el centro de siempre
  }

  /* ---------- distancia (km) de un punto al borde de un pais ---------- */
  function segDistKm(lon, lat, a, b) {
    const midLat = (a[1] + b[1]) / 2;
    const kx = 111.32 * Math.cos(((lat + midLat) / 2) * D2R), ky = 110.574;
    const ox = wrap(a[0] - lon), ax = ox * kx, ay = (a[1] - lat) * ky;
    const bx = (ox + b[0] - a[0]) * kx, by = (b[1] - lat) * ky;       // b relativo a a (anillos desenrollados): antes b se envolvia por su cuenta y un tramo que cruzaba el meridiano opuesto al clic daba la vuelta al mundo (distancia ~0 en las antipodas)
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? -(ax * dx + ay * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return haversine(lat, lon, a[1] + t * (b[1] - a[1]), a[0] + t * (b[0] - a[0]));   // punto mas cercano (aprox. local) y distancia real sobre la esfera
  }
  /* caja para medir distancias: con TODOS los anillos (en la Antartida el primero es solo el tramo del polo, caja [-540,-90,-180,-90], y la costa
     va en otro); si da la vuelta al mundo, de -180 a 180. La bbox de siempre no se toca: la usan el dibujo y la colocacion de continentes */
  const dboxOf = p => p.dbox || (p.dbox = (() => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const r of p.rings) for (const [lo, la] of r) { if (lo < x0) x0 = lo; if (lo > x1) x1 = lo; if (la < y0) y0 = la; if (la > y1) y1 = la; } return x1 - x0 >= 360 ? [-180, y0, 180, y1] : [x0, y0, x1, y1]; })());
  /* distancia (aprox.) a una caja [lon0, lat0, lon1, lat1], tambien dando la vuelta por el antimeridiano */
  const boxKm = (lon, lat, b) => { const cy = Math.max(b[1], Math.min(lat, b[3])); let m = Infinity; for (const l of [lon, lon - 360, lon + 360]) m = Math.min(m, haversine(lat, lon, cy, Math.max(b[0], Math.min(l, b[2])))); return m; };
  /* cap (opcional): solo interesa si esta mas cerca que eso; si no, devuelve cap (asi buscar el pais mas cercano en todo el mundo es barato) */
  function distToFeature(lon, lat, f, cap = Infinity) {
    let best = cap;
    if (best < Infinity && !f.polys.some(p => boxKm(lon, lat, dboxOf(p)) <= best * 1.3 + 100)) return best;
    if (inFeature(lon, lat, f)) return 0;
    for (const p of f.polys) {
      // descarte rapido por caja: distancia minima posible a la bbox
      if (boxKm(lon, lat, dboxOf(p)) > best * 1.3 + 100) continue;   // con margen: a miles de km la esquina de la caja no es una cota exacta sobre la esfera
      for (const ring of p.rings) for (let i = 0; i < ring.length - 1; i++) {   // tambien los huecos: desde Lesoto, Sudafrica esta en su borde (antes contaba solo la costa: 323 km desde Maseru)
        const d = segDistKm(lon, lat, ring[i], ring[i + 1]);
        if (d < best) best = d;
      }
    }
    return best;
  }

  /* ---------- construccion del mundo a partir del TopoJSON ---------- */
  const PALETTE = ["#efe5cc", "#e3d4ac", "#d5dbb7", "#e9c3a5", "#dbcdb8", "#cdd9c6"];

  function buildWorld() {
    const topo = window.ATLAS_TOPO;
    const obj = topo.objects.countries;
    const fc = window.topojson.feature(topo, obj);
    const nb = window.topojson.neighbors(obj.geometries);

    // coloreado voraz: dos paises vecinos nunca comparten color
    const colorIdx = new Array(fc.features.length).fill(-1);
    const order = fc.features.map((_, i) => i).sort((a, b) => nb[b].length - nb[a].length);
    for (const i of order) {
      const used = new Set(nb[i].map(j => colorIdx[j]));
      let c = 0;
      while (used.has(c)) c++;
      colorIdx[i] = c % PALETTE.length;
    }

    // Los anillos que cruzan la linea de fecha (+-180) se "desenrollan" para no dibujar rayas
    const unwrap = ring => {
      const out = []; let off = 0, prev = null;
      for (const [lo, la] of ring) {
        let x = lo + off;
        if (prev !== null) {
          if (x - prev > 180) { off -= 360; x -= 360; } else if (x - prev < -180) { off += 360; x += 360; }
        }
        out.push([x, la]); prev = x;
      }
      return out;
    };
    const TWO_PI = 2 * Math.PI;

    const features = fc.features.map((ft, i) => {
      const g = ft.geometry;
      const polysRaw = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
      const path = new Path2D();
      const polys = polysRaw.map(rawRings => {
        let rings = rawRings.map(unwrap);
        if (rings.length > 1 && rings[0].every(q => q[1] <= -89.99)) { const c = rings[1]; rings = [c.concat([[c[c.length - 1][0], -90], [c[0][0], -90]])].concat(rings.slice(2)); }   // la Antartida (world-atlas, geometria esferica): el anillo 0 es solo el polo y la costa venia como hueco; se cierra por el polo (relleno en el mapa y clic "dentro")
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const [lo, la] of rings[0]) {
          if (lo < x0) x0 = lo; if (lo > x1) x1 = lo;
          if (la < y0) y0 = la; if (la > y1) y1 = la;
        }
        const pp = new Path2D();
        for (const ring of rings) {
          ring.forEach(([lo, la], k) => {
            const [x, y] = project(lo, la);
            if (k === 0) pp.moveTo(x, y); else pp.lineTo(x, y);
          });
          pp.closePath();
        }
        path.addPath(pp);
        if (x1 > 180) path.addPath(pp, new DOMMatrix().translate(-TWO_PI, 0));
        if (x0 < -180) path.addPath(pp, new DOMMatrix().translate(TWO_PI, 0));
        return { rings, bbox: [x0, y0, x1, y1] };
      });
      const name = ft.properties.name;
      // caja del pais en coordenadas proyectadas (para recortar lo que no se ve)
      let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
      for (const p of polys) { bx0 = Math.min(bx0, p.bbox[0]); bx1 = Math.max(bx1, p.bbox[2]); by0 = Math.min(by0, p.bbox[1]); by1 = Math.max(by1, p.bbox[3]); }
      const [px0, py0] = project(bx0, Math.max(-90, by0)), [px1, py1] = project(bx1, Math.min(90, by1));
      return {
        name, polys, path, px0, px1, py0, py1, wrap: bx0 < -180 || bx1 > 180,
        color: name === "Antarctica" ? "#f4efe3" : PALETTE[colorIdx[i]], ci: name === "Antarctica" ? 6 : colorIdx[i] % 6,
      };
    });

    const byName = {};
    features.forEach(f => (byName[f.name] = f));
    const all = new Path2D();
    features.forEach(f => all.addPath(f.path));
    return { features, byName, all };
  }

  A.geo = { D2R, R_KM, project, unproject, haversine, inFeature, distToFeature, innerPoint, buildWorld };
})(window.AIQ);
