/*
 * Geolite - LA QUEMA (v0.3.203 · Bloque F, paso 6). Pintor de CSS (CSS.paintWorklet) que dibuja, celda a celda (un pixel de arte), el frente de fuego
 * que convierte una pieza del juego en otra (la carta comprada, la reliquia en su hueco, el contador, la etiqueta) o hace aparecer el aviso de un
 * logro. Lo carga js/celebra.js; corre en el hilo del pintor, fuera del juego. El mismo ruido que la maqueta (fx2.js, FS_QUEMA): fbm + el fuego
 * que sube desde abajo.
 *   --qp  avance 0-1            --qs  semilla             --qc  celda (px locales)        --qz  px a 1080p por px local
 *   --qm  0 mascara: lo que queda de lo viejo   1 mascara: lo que ya aparecio   2 filo (lo viejo se quema)   3 filo (aparece)   4 filo oscuro (se va)
 */
/* global registerPaint */
const fr = v => v - Math.floor(v);
function h21(x, y) { x = fr(x * 123.34); y = fr(y * 456.21); const d = x * (x + 45.32) + y * (y + 45.32); x += d; y += d; return fr(x * y); }
function vn(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h21(ix, iy), b = h21(ix + 1, iy), c = h21(ix, iy + 1), d = h21(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, n) { let s = 0, a = 0.5; for (let i = 0; i < n; i++) { s += a * vn(x, y); const nx = 1.6 * x - 1.2 * y, ny = 1.2 * x + 1.6 * y; x = nx; y = ny; a *= 0.5; } return s; }
const CACHE = new Map();
function campo(cw, ch, c, z, seed) {
  const key = cw + "x" + ch + ":" + c + ":" + z + ":" + seed; let f = CACHE.get(key); if (f) return f;
  f = new Float32Array(cw * ch);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const x = (i + 0.5) * c * z, y = (j + 0.5) * c * z, v = 1 - (j + 0.5) / ch;   // arriba arde lo ultimo
    f[j * cw + i] = fbm(x * 0.022 + seed, y * 0.022 + seed, 4) * 0.62 + v * 0.28 + fbm(x * 0.07 + seed * 2, y * 0.07 + seed * 2, 2) * 0.1;   // el fuego sube desde abajo (las octavas mas finas que una celda no se verian)
  }
  if (CACHE.size > 24) CACHE.delete(CACHE.keys().next().value);
  CACHE.set(key, f); return f;
}
const num = (p, k, d) => { const v = parseFloat(String(p.get(k))); return isFinite(v) ? v : d; };
const W = 0.055;                                                        // el ancho del filo (en unidades de ruido)
const ORO = ["#f5a623", "#fdd742", "#fff3b0"], OSCURO = ["#a8142e", "#c46a1b", "#f5a623"];   // geolite40: del borde al corazon del fuego
registerPaint("quema", class {
  static get inputProperties() { return ["--qp", "--qs", "--qc", "--qz", "--qm"]; }
  paint(g, size, p) {
    const P = num(p, "--qp", 0), seed = num(p, "--qs", 7), c = Math.max(1, num(p, "--qc", 2)), z = num(p, "--qz", 1.5), m = num(p, "--qm", 0) | 0;
    const cw = Math.ceil(size.width / c), ch = Math.ceil(size.height / c); if (!cw || !ch) return;
    const f = campo(cw, ch, c, Math.round(z * 100) / 100, Math.round(seed * 100) / 100), th = P * 1.25 - 0.12, vivo = P > 0.001 && P < 0.999;
    if (m === 0 || m === 1) {                                            // la mascara: tramos seguidos de cada fila
      g.fillStyle = "#000";
      for (let j = 0; j < ch; j++) {
        let i0 = -1;
        for (let i = 0; i <= cw; i++) {
          const n = i < cw ? f[j * cw + i] : 0, on = i < cw && (m === 0 ? n >= th : n < th + (vivo ? W : 0));
          if (on && i0 < 0) i0 = i; else if (!on && i0 >= 0) { g.fillRect(i0 * c, j * c, (i - i0) * c, c); i0 = -1; }
        }
      }
      return;
    }
    if (!vivo) return;
    /* cada celda del filo, en su banda de color (tramos seguidos de la misma banda en un solo rectangulo); delante, lo que se tuesta */
    const pal = m === 4 ? OSCURO : ORO, TOSTADO = ["rgba(40, 20, 8, 0.36)", "rgba(40, 20, 8, 0.22)", "rgba(40, 20, 8, 0.1)"];
    const banda = d => (d < 0 || d >= W * 3 ? -1 : d < W ? (d < W / 3 ? 2 : d < W * 2 / 3 ? 1 : 0) : m === 2 ? 3 + Math.min(2, Math.floor((d - W) / (W * 2 / 3))) : -1);
    for (let j = 0; j < ch; j++) {
      let i0 = 0, b0 = banda(f[j * cw] - th);
      for (let i = 1; i <= cw; i++) {
        const b = i < cw ? banda(f[j * cw + i] - th) : -2;
        if (b === b0) continue;
        if (b0 >= 0) { g.fillStyle = b0 < 3 ? pal[b0] : TOSTADO[b0 - 3]; g.fillRect(i0 * c, j * c, (i - i0) * c, c); }
        i0 = i; b0 = b;
      }
    }
  }
});
