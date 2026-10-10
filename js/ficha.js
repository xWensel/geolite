/*
 * Geolite - fichas de casino dibujadas al pixel real (v0.3.59).
 *
 * La ficha lisa (blank_*: Ascensiones, intentos del Reto diario, base de las insignias de logro) es un circulo: a cualquier escala que no sea
 * entera sus escalones salen desiguales y deja de verse redonda (a 48 px con la interfaz a x1,85 eran 1,39 pixeles reales por pixel de arte).
 * Por eso no se escala: se DIBUJA a la medida exacta que ocupa en pantalla, con un pixel de arte de P pixeles reales enteros.
 *
 *   A.ficha.px(N, id)   ficha de N x N pixeles de arte -> Uint8ClampedArray RGBA (la misma funcion pinta assets/icons/blank_*.webp a N = 64)
 *   A.ficha.html(id)    atributos que A.icon anade al <img> de una ficha lisa
 *   A.ficha.see(img)    la vigila: cada vez que cambia su tamano en pixeles reales se vuelve a dibujar a esa medida
 *
 * El circulo es de pixel art, no de compas: disc() ordena los escalones de cada octante de mas largo a mas corto, asi que no hay ni un pixel
 * que sobresalga ni un escalon mas largo que el anterior. Todo lo demas (aro, surco, centro, brillo) sale de discos asi y de sus contornos.
 */
(function (root) {
  const A = root.AIQ = root.AIQ || {};
  const hex = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  const ramp = (...h) => h.map(hex);
  /* claro -> oscuro: brillo, luz, base, sombra, sombra profunda */
  const R = {
    gold: ramp("fff6c8", "ffd95a", "f5a623", "c46a1b", "7f3a1a"), red: ramp("ffa08f", "ff5a55", "d8283f", "9c1a3f", "5e1238"),
    blue: ramp("a8ecff", "4cb4ff", "2a78e4", "1f4bb0", "1d2a6e"), green: ramp("dcf78e", "8be05a", "3fb54a", "26804a", "1b4d3e"),
    teal: ramp("b0ffe8", "4ee3c1", "1fb3a3", "16787f", "164a5c"), purple: ramp("ecc2ff", "b36cff", "8440e0", "5a2ab0", "351a70"),
    orange: ramp("ffd08a", "ffa244", "f06d22", "b8431f", "772720"), dark: ramp("6a6f96", "4a4d72", "33345a", "24234a", "181636"),
    mint: ramp("8fffbb", "54ff99", "28d86e", "199c4e", "115e30"), amber: ramp("ffd58d", "ffbf52", "e59f27", "a57119", "644511"),
  };
  const CREAM = ramp("ffffff", "fff4dc", "eedcb8", "c9aa84", "8a6a58"), INK = hex("1d0a3d");
  const COL = { blank_big: "orange", blank_boss: "red", blank_gold: "gold", blank_small: "blue", blank_teal: "teal", blank_green: "mint",
    chip_b: "blue", chip_g: "green", chip_k: "dark", chip_p: "purple", chip_r: "red", chip_o: "amber" };

  /* ---------- mascaras (Uint8Array de N x N) ---------- */
  /* disco de pixel art de diametro d centrado en el lienzo (d y N de la misma paridad). Se parte del circulo de compas y, en el octante de
     arriba, se ordenan los escalones horizontales de mas largo a mas corto; el otro octante es su reflejo en la diagonal */
  const disc = (N, d) => {
    const n = Math.ceil(d / 2), off = d % 2 ? 0 : .5, r2 = (d / 2 - .1) ** 2, h = new Int32Array(n);
    for (let j = 0; j < n; j++) { let c = 0; for (let i = 0; i < n; i++) if ((i + off) ** 2 + (j + off) ** 2 <= r2) c++; h[j] = c; }
    let jm = n - 1; while (jm > 0 && h[jm - 1] - 1 <= jm - 1) jm--;                    // filas del octante de arriba: n-1 (la de arriba) ... jm
    const runs = []; for (let j = n - 2; j >= jm; j--) runs.push(h[j] - h[j + 1]);
    runs.sort((a, b) => b - a);
    for (let j = n - 2, t = 0; j >= jm; j--, t++) h[j] = h[j + 1] + runs[t];
    const q = (i, j) => i <= j ? (j >= jm ? i < h[j] : true) : (i >= jm ? j < h[i] : true);
    const m = new Uint8Array(N * N), c = N / 2;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = Math.abs(x + .5 - c) - off, j = Math.abs(y + .5 - c) - off;
      if (i < n && j < n && q(i, j)) m[y * N + x] = 1;
    }
    return m;
  };
  /* erosion de 1 px: en cruz (el contorno que queda es una linea fina) o en cuadro (linea gruesa, sin diagonales sueltas) */
  const erode = (N, m, sq) => {
    const o = new Uint8Array(N * N);
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      const p = y * N + x; if (!m[p] || !m[p - 1] || !m[p + 1] || !m[p - N] || !m[p + N]) continue;
      if (sq && (!m[p - N - 1] || !m[p - N + 1] || !m[p + N - 1] || !m[p + N + 1])) continue;
      o[p] = 1;
    }
    return o;
  };
  const dilate = (N, m) => {
    const o = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v = 0; for (let b = -1; b <= 1 && !v; b++) for (let a = -1; a <= 1; a++) { const X = x + a, Y = y + b; if (X >= 0 && Y >= 0 && X < N && Y < N && m[Y * N + X]) { v = 1; break; } }
      o[y * N + x] = v;
    }
    return o;
  };
  const par = (N, v) => { v = Math.round(v); return (v - N) % 2 ? v + 1 : v; };       // entero de la misma paridad que N (los discos comparten centro)

  /* ---------- la ficha ---------- */
  /* N pixeles de arte de lado; o.d = diametro con el contorno (por defecto deja ~1 px de aire por lado a 64). Devuelve RGBA */
  const px = (N, id, o = {}) => {
    const rp = R[COL[id] || id] || R.red, c = N / 2, d = o.d || N - 2 * Math.floor(N / 48), r = d / 2 - 1, fine = r >= 16;
    const out = new Uint8ClampedArray(N * N * 4), put = (p, k) => { out[p * 4] = k[0]; out[p * 4 + 1] = k[1]; out[p * 4 + 2] = k[2]; out[p * 4 + 3] = 255; };
    const full = disc(N, d), face = erode(N, full), in1 = erode(N, face);
    /* ficha pequena (menos de ~36 px): aro mas ancho en proporcion e incrustaciones pegadas al surco, sin filete ni rayitas, para que se siga leyendo */
    const hw = fine ? r * .124 : Math.max(1, r * .15), rimIn = r - (fine ? r * .26 : Math.max(2, r * .3));
    const G = disc(N, par(N, 2 * rimIn)), Gout = fine ? dilate(N, G) : G, G1 = erode(N, G), G2 = erode(N, G1), G1sq = erode(N, G1, true), G3 = erode(N, G2);
    const in2 = erode(N, in1), in3 = erode(N, in2);
    /* incrustaciones: 8 radios de lados paralelos (los de 45 grados quedan en escalera 1:1 limpia) */
    const spoke = (X, Y, w) => {
      for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4, dx = Math.sin(t), dy = -Math.cos(t); if (X * dx + Y * dy > 0 && Math.abs(X * dy - Y * dx) < w) return true; }
      return false;
    };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const p = y * N + x; if (!full[p]) continue;
      if (!face[p]) { put(p, INK); continue; }
      const X = x + .5 - c, Y = y + .5 - c, rho = Math.hypot(X, Y) || 1e-6, lit = (-X * .62 - Y * .78) / rho;      // coseno con la luz (arriba-izquierda)
      let k;
      if (!G[p]) {                                                                   // aro
        const ins = !Gout[p] && spoke(X, Y, hw), edge = !in1[p];
        k = ins ? CREAM[1] : rp[2];
        if (edge && lit > .35) k = ins ? CREAM[0] : rp[1];                            // bisel: luz arriba-izquierda, sombra abajo-derecha
        else if (edge && lit < -.35) k = ins ? CREAM[2] : rp[3];
        else if (r >= 12 && in2[p] && !in3[p] && !ins) {                               // brillo corto del aro, a los lados de la incrustacion de arriba-izquierda
          const ang = (Math.atan2(X, -Y) * 180 / Math.PI + 360) % 360;
          if (ang > 291 && ang < 339 && !spoke(X, Y, hw + 1.2)) k = rp[0];
        }
      } else if (!G1[p]) k = fine ? rp[4] : rp[3];                                    // surco
      else if (fine && !G2[p]) k = spoke(X, Y, 1.7) ? CREAM[1] : rp[2];               // filete con rayitas alineadas con las incrustaciones
      else {
        const ctr = fine ? G2 : G1, ctrIn = fine ? G3 : G2;
        k = rp[1];
        if (fine && !G1sq[p] && spoke(X, Y, 1.7)) k = CREAM[1];                       // la rayita en diagonal, maciza (sin pixeles unidos solo por la esquina)
        else if (ctr[p] && !ctrIn[p] && lit > .2) k = rp[2];                          // centro hundido: sombra arriba-izquierda
      }
      put(p, k);
    }
    return out;
  };

  A.ficha = { px, R, COL, CREAM, INK, disc, attr: () => "", soon() {}, see() {} };
  if (typeof module !== "undefined" && module.exports) module.exports = A.ficha;
  if (typeof document === "undefined" || typeof ResizeObserver === "undefined") return;

  /* ---------- en pantalla: cada ficha lisa, a la medida exacta de su hueco en pixeles reales ---------- */
  const LISA = /\bic-(blank_[a-z]+)\b/, urls = new Map();
  /* imagen de w x h pixeles reales con la ficha centrada: P pixeles reales por pixel de arte, P entero */
  const url = (id, w, h, P) => {
    const key = id + "|" + w + "|" + h + "|" + P; let u = urls.get(key); if (u) return u;
    const D = Math.min(w, h), N = Math.floor(D / P), a = new Uint32Array(px(N, id).buffer), cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const g = cv.getContext("2d"), im = g.createImageData(w, h), t = new Uint32Array(im.data.buffer), ox = (w - N * P) >> 1, oy = (h - N * P) >> 1;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = a[y * N + x]; if (!v) continue;
      for (let b = 0; b < P; b++) { const q = (oy + y * P + b) * w + ox + x * P; for (let i = 0; i < P; i++) t[q + i] = v; }
    }
    g.putImageData(im, 0, 0); u = cv.toDataURL("image/png"); urls.set(key, u); return u;
  };
  /* el pixel de arte mide lo mas parecido a lo que mediria el de la ficha de 64 px en ese hueco (como el resto de iconos), pero entero:
     hueco de 48 a 95 px reales -> 1 px; de 96 a 156 -> 2 px... */
  const fit = (im, s) => {
    const w = s.inlineSize, h = s.blockSize, D = Math.min(w, h); if (D < 6 || D > 1024) return;
    const P = Math.max(1, Math.floor(.5 + Math.sqrt(.25 + (D / 64) ** 2))), key = w + "|" + h + "|" + P; if (im._fxK === key) return;
    const now = performance.now(); if (now - (im._fxT || 0) > 1000) { im._fxT = now; im._fxN = 0; }
    if (++im._fxN > 8) { ro.unobserve(im); return; }                                  // un <img> sin tamano propio creceria con su imagen: se deja como esta
    im._fxK = key; im.style.imageRendering = "pixelated"; im.src = url(im._fx, w, h, P);
  };
  let ro = null, ok = true;
  try { ro = new ResizeObserver(es => { for (const e of es) { const s = e.devicePixelContentBoxSize && e.devicePixelContentBoxSize[0]; if (s) fit(e.target, s); } }); } catch (e) { ok = false; }
  const see = im => {
    if (!ok || im._fx) return; const m = LISA.exec(im.className); if (!m) return;
    im._fx = m[1];
    try { ro.observe(im, { box: "device-pixel-content-box" }); } catch (e) { ok = false; }   // navegador sin esa caja: se queda la ficha de 64 px
  };
  /* A.icon devuelve texto: las fichas recien escritas se recogen al acabar el guion que las pinta (antes del primer fotograma); el onload
     del <img> cubre las que se insertan mas tarde */
  const live = document.getElementsByClassName("ic-fx"); let pend = false;
  const scan = () => { pend = false; for (let i = 0; i < live.length; i++) if (!live[i]._fx) see(live[i]); };
  A.ficha.see = see;
  A.ficha.soon = () => { if (ok && !pend) { pend = true; queueMicrotask(scan); } };
  A.ficha.attr = id => ok && COL[id] && id.startsWith("blank_") ? ' onload="AIQ.ficha.see(this)"' : "";
})(typeof window !== "undefined" ? window : globalThis);
