/* Geolite - RECORD NUEVO (paquete «Portada» del Probador: por-record, voto del autor, en Extrema).
 * Vuelves a la portada tras batir tu record de la Aventura y la etiqueta de su carta se reimprime delante de ti: la sombra de un sello baja
 * sobre ella, golpea y deja la etiqueta nueva («Record 48.200») como un tampon de verdad: bloque de tinta con la cifra en reserva, celdas
 * donde apreto menos, la tinta que se corre unos pixeles por el papel y un brillo humedo que se seca. Todo a la rejilla de 3 px de la carta.
 *  - Nivel por lo que lo has batido: 1 (poco), 2 (el primero o un 8 % mas), 3 (un 25 % mas: ademas, carrera de luz por la marquesina).
 *  - Una vez por record, 0,4 s despues de que se reparta la carta. La etiqueta nueva es la de siempre (la escribe hub.js): aqui solo se pinta
 *    el sello y la tinta encima, en un lienzo a la medida de la etiqueta.
 *  - Movimiento Minimo: la etiqueta nueva ya impresa y seca, solo el golpe del sello (sonido).
 * hub.js llama a A.record.mira(carta, best, etiqueta) al pintar la portada.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const KEY = "atlasiq.recordVisto";
  const P = { corre: 2, humedo: 1, seco: 2.4, sombra: 1 };          // Extrema
  const reduced = () => !!(A.core && A.core.S && A.core.S.reduce);
  const sfx = (n, ...a) => { try { if (A.sfx && A.sfx[n]) A.sfx[n](...a); } catch (e) { /* sin sonido */ } };
  const h21 = (x, y) => { let a = (x * 0.1031) % 1, b = (y * 0.1031) % 1, c = (x * 0.1031) % 1; if (a < 0) a++; if (b < 0) b++; if (c < 0) c++; const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33); a += d; b += d; c += d; const r = ((a + b) * c) % 1; return r < 0 ? r + 1 : r; };
  const vn = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = h21(i, j), b = h21(i + 1, j), c = h21(i, j + 1), d = h21(i + 1, j + 1); return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy; };
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const rgb = (s, def) => { const m = String(s).match(/[\d.]+/g); return !m || (m.length > 3 && +m[3] === 0) ? def : [+m[0], +m[1], +m[2]]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  const visto = () => { try { const v = localStorage.getItem(KEY); return v == null ? null : +v; } catch (e) { return null; } };
  const guarda = v => { try { localStorage.setItem(KEY, String(v)); } catch (e) { /* sin almacenamiento */ } };

  /* card: la carta (.mcard.hero); best: el record de ahora; viejo: lo que decia la etiqueta antes (texto); nuevo: lo que dice ahora */
  function mira(card, best, etiqueta) {
    const prev = visto();
    if (!best) return;
    if (prev == null) { guarda(best); return; }                    // la primera vez con esta version: se apunta sin celebrar nada viejo
    if (best <= prev) return;
    guarda(best);
    const lbl = card && card.querySelector(".mc-stat"); if (!lbl) return;
    const n = !prev ? 2 : best >= prev * 1.25 ? 3 : best >= prev * 1.08 ? 2 : 1;
    const nuevo = lbl.textContent;
    if (!reduced()) lbl.textContent = etiqueta(prev);              // hasta el golpe, la etiqueta de antes
    /* con la puerta a oscuras (arranque) espera a que la casa abra: el sello se ve, no se gasta en la oscuridad */
    let t0 = 0;
    const go = () => {
      if (!lbl.isConnected) return;
      const S = A.core && A.core.S;
      if (S && S.booting) { t0 = 0; setTimeout(go, 120); return; }
      if (!t0) { t0 = 1; setTimeout(go, reduced() ? 400 : 400 + 620); return; }   // 0,4 s despues de que se reparta la carta (el reparto dura ~0,62 s)
      imprime(card, lbl, nuevo, n, reduced());                    // Minimo: ya impresa y seca (solo el golpe del sello)
    };
    go();
  }
  function sello(n) {
    try { if (A.juguete) A.juguete("sello", { db: n - 1 }); else sfx("stamp"); } catch (e) { sfx("stamp"); }
    sfx("impacto");
  }

  function imprime(card, lbl, nuevo, n, quieto) {
    if (!lbl.isConnected) return;
    const host = card;
    /* la rejilla de la carta: 3 px de arte a 1080 (la carta va al zoom de la portada) */
    const lr = lbl.getBoundingClientRect(), cr = host.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const z = (cr.width / host.offsetWidth) || 1;                   // px de pantalla por px de CSS de la carta
    const K = Math.max(1, Math.round(2 * z * dpr));                 // celda en px reales (3 a 1080)
    const ink = rgb(getComputedStyle(lbl).backgroundColor, [22, 36, 28]), paper = rgb(getComputedStyle(host).backgroundColor, [246, 239, 220]);   // la tinta del bloque y el papel de la carta
    const pad = 3;                                                  // celdas de margen alrededor (la tinta que se corre y la sombra)
    const cv = document.createElement("canvas"), g = cv.getContext("2d");
    const ncx = Math.ceil(lr.width * dpr / K), ncy = Math.ceil(lr.height * dpr / K);
    const W = (ncx + 2 * pad) * K, H = (ncy + 2 * pad) * K;
    cv.width = W; cv.height = H; cv.className = "rec-tinta"; cv.setAttribute("aria-hidden", "true");
    /* en coordenadas de CSS de la carta (va dentro de ella, encima de la etiqueta) */
    cv.style.cssText = `position:absolute;pointer-events:none;z-index:3;image-rendering:pixelated;left:${(lr.left - cr.left) / z - pad * K / dpr / z}px;top:${(lr.top - cr.top) / z - pad * K / dpr / z}px;width:${W / dpr / z}px;height:${H / dpr / z}px`;
    host.appendChild(cv);
    /* lo de dentro del bloque (presion y tinta humeda) va DEBAJO del texto: la cifra queda en reserva, limpia, como en un tampon */
    const cin = document.createElement("canvas"), gi = cin.getContext("2d"), WI = ncx * K, HI = ncy * K;
    cin.width = WI; cin.height = HI; cin.setAttribute("aria-hidden", "true");
    cin.style.cssText = `position:absolute;left:0;top:0;z-index:-1;pointer-events:none;image-rendering:pixelated;width:${WI / dpr / z}px;height:${HI / dpr / z}px`;
    const txt = document.createTextNode(lbl.textContent); lbl.textContent = ""; lbl.append(txt, cin); lbl.classList.add("rec-on");
    const inkLo = mix(ink, paper, 0.72), lighter = mix(ink, paper, 0.12), hlc = mix(ink, paper, 0.45);
    const lvl = n, grow0 = P.corre * (0.7 + 0.15 * lvl);
    const hit = 0.22; let t = quieto ? P.seco + 1 : 0, last = performance.now(), hitDone = false;
    const draw = () => {
      const img = g.createImageData(W, H), d = img.data, imi = gi.createImageData(WI, HI), di = imi.data;
      const putIn = (cx, cy, c, a) => { for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) { const i = (((cy * K + y) * WI) + cx * K + x) * 4; di[i] = c[0]; di[i + 1] = c[1]; di[i + 2] = c[2]; di[i + 3] = Math.round(a * 255); } };
      const put = (cx, cy, c, a) => { for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) { const i = (((cy * K + y) * W) + cx * K + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = Math.round(a * 255); } };
      if (t < hit + 0.05) {
        /* 1) la sombra del sello que baja (antes del golpe) */
        const k = Math.min(1, t / hit), cxm = W / 2 + 10 * (1 - k) * dpr * z, cym = H / 2 + 16 * (1 - k) * dpr * z;
        const hsx = ncx * K / 2 * (1.35 - 0.35 * k) + 6 * dpr, hsy = ncy * K / 2 * (1.35 - 0.35 * k) + 6 * dpr;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const qx = Math.abs(x - cxm) - hsx, qy = Math.abs(y - cym) - hsy, dd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
          const a = (1 - smooth(-8 * dpr, 18 * (1.4 - k) * dpr, dd)) * (0.15 + 0.45 * k * k) * P.sombra;
          if (a > 0.004) { const i = (y * W + x) * 4; d[i + 3] = Math.round(a * 255); }
        }
      }
      if (t >= hit) {
        const tt = t - hit;
        const grow = grow0 * smooth(0, 0.55, tt), wet = P.humedo * (1 - smooth(0.05, P.seco, tt));
        for (let cy = 0; cy < ncy + 2 * pad; cy++) for (let cx = 0; cx < ncx + 2 * pad; cx++) {
          const ix = cx - pad, iy = cy - pad;
          const ox = Math.max(-ix, ix - (ncx - 1), 0), oy = Math.max(-iy, iy - (ncy - 1), 0), dOut = Math.max(ox, oy);
          if (dOut < 0.5) {
            /* dentro del bloque: donde el tampon apreto menos, y la tinta humeda (mas clara y azulada) con un filo de luz roto que se seca */
            let c = null, a = 0;
            if (vn(ix * 0.23 + 4, iy * 0.23 + 4) > 0.72) { c = lighter; a = 1; }
            if (wet > 0.01) {
              const base = c || ink, w = [Math.min(255, base[0] * 1.25 + 5), Math.min(255, base[1] * 1.25 + 8), Math.min(255, base[2] * 1.25 + 15)];
              c = mix(base, w, wet * 0.8); a = Math.max(a, wet * 0.8);
              const hl = Math.abs(iy - 1) <= 0.5 && vn(ix * 0.32, 3) >= 0.38 && ix >= 1.5 && ix <= ncx - 2.5;
              const q = Math.floor(wet * 2 + 0.5) / 2;
              if (hl && q > 0) { c = mix(c, hlc, q); a = Math.max(a, q); }
            }
            if (c && a > 0.01 && ix < ncx && iy < ncy) putIn(ix, iy, c, a);
          } else if (dOut <= 2) {
            /* la tinta se corre por el papel: dedos cortos pegados al bloque (fibra a lo largo del borde) */
            const al = ox > oy ? [iy, 0] : [ix, 1];
            const fib = vn(al[0] * 0.2, al[1] * 7), reach = smooth(0.35, 1, fib) * (grow + 0.4);
            if (dOut <= reach) put(cx, cy, inkLo, dOut < 1.5 ? 0.8 : 0.5);
          }
        }
      }
      g.putImageData(img, 0, 0); gi.putImageData(imi, 0, 0);
    };
    const step = now => {
      if (!cv.isConnected) return;
      t += Math.min(0.05, (now - last) / 1000); last = now;
      if (!hitDone && t >= hit) {
        hitDone = true; txt.data = nuevo;
        sello(n);
        if (!quieto) try { if (A.core && A.core.jpShake) A.core.jpShake(n); } catch (e) { /* nada */ }
        try { if (A.haptic && A.haptic.dual) A.haptic.dual(0.25 + 0.2 * n, 0.1 + 0.1 * n, 120 + 60 * n); } catch (e) { /* sin mando */ }
        if (n === 3 && !quieto) { setTimeout(() => sfx("ding"), 120); try { if (A.casa && A.casa.carrera) A.casa.carrera(card, 1, 1800); } catch (e) { /* nada */ } }   // record gordo: la luz corre por la marquesina
      }
      draw();
      if (t > P.seco + 0.4) { draw(); return; }                       // seca: se queda (la tinta corrida y la presion) hasta la proxima sesion
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  A.record = { mira, _olvida: () => { try { localStorage.removeItem(KEY); } catch (e) { /* nada */ } } };
})(window.AIQ);
