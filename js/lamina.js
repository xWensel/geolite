/* Geolite - LAMINA DE VERDAD (paquete «Portada» del Probador: por-lamina, voto del autor, en Extrema).
 * Las ediciones de tu carta de socio (lamina, holografica, policroma) pasan de un degradado CSS a una lamina calculada POR PIXEL DE ARTE: cada
 * pixel de la carta recibe un solo tono, asi que el brillo se mueve a saltos de pixel y el dibujo no cambia nunca. Un reflejo de la luz que
 * sigue al raton (con inercia), el arcoiris que cambia con el angulo, el relieve del foil (rombos en lamina y holo; rayos desde el icono en la
 * policroma) y la inclinacion que la carta ya tenia. Los recuadros de texto (categoria, nombre, titulo y nivel) y el icono quedan fuera.
 *  - Port del shader de la maqueta (probador/src/fx/por-lamina.js) a JS: la carta mide ~100 x 150 pixeles de arte, asi que cada repintado son
 *    ~15.000 pixeles (1-2 ms) y solo cuando la luz se mueve. Sin WebGL: nada que perder con la GPU.
 *  - «Pasa la luz»: un barrido por toda la carta al estrenar edicion (la primera vez que la ves) y al enfocarla con el mando.
 *  - Movimiento Minimo: la carta plana y quieta, con la luz fija en la lampara de la portada.
 * socio.js llama a A.lamina.monta() al dibujar una carta con edicion.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const P = { fuerza: 1, relieve: 1.7, inercia: 10 };               // Extrema
  const KEY = "atlasiq.laminaVista";
  const reduced = () => document.documentElement.classList.contains("reduce-motion");
  const RB = [[.91, .16, .23], [.96, .65, .14], [.99, .84, .26], [.65, .88, .35], [.05, .75, .69], [.09, .54, .98], [.43, .25, .77], [.9, .25, .56]];
  const fract = x => x - Math.floor(x), clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const ramp = h => { h = fract(h) * 8; const i = Math.floor(h) % 8; return RB[fract(h) >= 0.5 ? (i + 1) % 8 : i]; };   // tono de la paleta, a escalones
  const muelle = (s, target, dt, w) => { const k = w * w, c = 2 * w, a = k * (target - s.x) - c * s.v; s.v += a * dt; s.x += s.v * dt; return s.x; };
  const vivas = new Set();

  /* o = { tilt (el span que se inclina), cv (el lienzo de la carta, a pixeles de arte), L (lo que devuelve draw), ed ("lamina"|"holo"|"poli"),
           ic (id del icono), card (numero de carta), sweepAlEstrenar } */
  function monta(o) {
    const ED = { lamina: 1, holo: 2, poli: 3 }[o.ed]; if (!ED) return null;
    const cv = o.cv, GW = cv.width, GH = cv.height, M = o.L.m;
    const fo = document.createElement("canvas"); fo.width = GW; fo.height = GH; fo.className = "sc-foil"; fo.setAttribute("aria-hidden", "true");
    fo.style.cssText = cv.style.cssText; fo.style.imageRendering = "pixelated";
    cv.after(fo);
    const g = fo.getContext("2d"), img = g.createImageData(GW, GH), d = img.data;
    const cw = 96, chh = o.L.H, UX = 3;                               // en unidades de la maqueta: 3 por pixel de arte (la carta de 288 x 384)
    const mk = new Float32Array(GW * GH), cl = new Float32Array(GW * GH);
    const inR = (x, y, r) => r && x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3];
    const win = o.L.win;                                               // en coordenadas del lienzo
    const wcx = win[0] - M + win[2] / 2, wcy = win[1] - M + win[3] / 2;
    let art = null;
    /* la mascara: el marco crema 1, sus filos 0,6, el fondo de la ventana 0,7; fuera los recuadros de texto, el contorno y el icono */
    const remask = () => {
      art = o.L.ctx.getImageData(0, 0, GW, GH).data;
      let ico = null;
      try {
        const im = new Image(); im.src = `assets/icons/${o.ic}.webp`;
        if (im.complete && im.naturalWidth) { const n = Math.round(im.naturalWidth / 8), m = Math.round(im.naturalHeight / 8), c = document.createElement("canvas"); c.width = n; c.height = m; const q = c.getContext("2d"); q.imageSmoothingEnabled = false; q.drawImage(im, 0, 0, n, m);
          ico = { x: Math.round(win[0] + (win[2] - n) / 2), y: Math.round(win[1] + (win[3] - m) / 2), n, m, a: q.getImageData(0, 0, n, m).data }; }
      } catch (e) { ico = null; }
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const p = y * GW + x, q = p * 4, ax = x - M, ay = y - M;
        let m = 0;
        const r = art[q], gg = art[q + 1], b = art[q + 2], a = art[q + 3];
        const ink = r === 0x12 && gg === 0x0e && b === 0x1c;
        if (a && !ink && ax > 0 && ay > 0 && ax < cw - 1 && ay < chh - 1 && !inR(ax, ay, o.L.cat) && !inR(ax, ay, o.L.name) && !inR(ax, ay, o.L.tit) && !inR(ax, ay, o.L.foot)) {
          if (x >= win[0] && x < win[0] + win[2] && y >= win[1] && y < win[1] + win[3]) {
            const onIco = ico && x >= ico.x && y >= ico.y && x < ico.x + ico.n && y < ico.y + ico.m && ico.a[((y - ico.y) * ico.n + (x - ico.x)) * 4 + 3] > 0;
            m = onIco ? 0 : 0.7;
          } else m = r + gg + b > 300 ? 1 : 0.6;
        }
        mk[p] = m;
        const v = Math.sin(ax * 0.31 + Math.sin(ay * 0.17) * 2) * 0.5 + Math.sin(ay * 0.23 - ax * 0.11) * 0.5;   // racimos de color de la policroma
        cl[p] = v * 0.5 + 0.5;
      }
    };
    remask();
    /* el estado: inclinacion (la de la carta, en radianes) y la luz (el puntero, en unidades de la maqueta respecto a la carta), con muelle */
    const st = { tx: { x: 0, v: 0 }, ty: { x: 0, v: 0 }, lx: { x: 52, v: 0 }, ly: { x: -97, v: 0 }, gx: 52, gy: -97, gtx: 0, gty: 0, sweep: -1, raf: 0, last: 0, alive: true };
    const fuerza = P.fuerza * [0.8, 0.9, 1][ED - 1];
    const render = () => {
      if (!art) return;
      const cx = cw * UX / 2, cy = chh * UX / 2;
      const ax = st.tx.x, ay = st.ty.x, cxr = Math.cos(ax), sxr = Math.sin(ax), cyr = Math.cos(ay), syr = Math.sin(ay);
      /* R = rotY(ay) * rotX(ax) (como la maqueta); N0 = R * (0,0,-1) */
      const R = (x, y, z) => { const y1 = cxr * y - sxr * z, z1 = sxr * y + cxr * z; return [cyr * x + syr * z1, y1, -syr * x + cyr * z1]; };
      const N0 = R(0, 0, -1), Lx = st.lx.x, Ly = st.ly.x;
      const sw = st.sweep >= 0 ? Math.min(1, st.sweep / 0.7) : 0;
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const p = y * GW + x, q = p * 4, m = mk[p];
        if (m <= 0) { d[q + 3] = 0; continue; }
        const i = x - M, j = y - M;
        const c = R((i + 0.5) * UX - cx, (j + 0.5) * UX - cy, 0); c[0] += cx; c[1] += cy;
        let lx = Lx - c[0], ly = Ly - c[1], lz = -420 - c[2]; const ln = Math.hypot(lx, ly, lz); lx /= ln; ly /= ln; lz /= ln;
        let hx = lx, hy = ly, hz = lz - 1; const hn = Math.hypot(hx, hy, hz); hx /= hn; hy /= hn; hz /= hn;
        const ndh = Math.max(N0[0] * hx + N0[1] * hy + N0[2] * hz, 0), lobe = Math.pow(ndh, 22), spec = Math.pow(ndh, 180);
        let line;
        if (ED < 3) { const fx = Math.abs(fract(i / 8) - 0.5), fy = Math.abs(fract(j / 8) - 0.5); line = Math.abs(fx + fy - 0.5) <= 0.07 ? 1 : 0; }
        else { const dx = i - wcx, dy = j - wcy, an = Math.atan2(dy, dx) / (Math.PI * 2) * 28; line = (Math.abs(fract(an) - 0.5) <= 0.09 && Math.hypot(dx, dy) >= 14) ? 1 : 0; }
        line *= P.relieve;
        const ang = (lx * 0.8 + ly * 0.55) * 1.1;
        const hue = ED === 1 ? [0.86, 0.87, 0.94] : ED === 2 ? ramp((i + j * 0.8) / 150 + ang) : ramp((i * 0.5 - j) / 110 + cl[p] * 0.25 + ang * 1.3);
        const s0 = sw > 0 ? 1 - smooth(2, 9, Math.abs((i + j * 0.6) - (sw * 200 - 30))) : 0;
        let I = 0.06 + lobe * 1.05 + line * (0.1 + lobe * 0.5) + s0 * 0.9;
        I = Math.floor(clamp(I, 0, 1) * 4 + 0.5) / 4;                  // a cuatro escalones: el brillo a saltos de pixel de arte
        const a = m * fuerza, t1 = 0.22 * a, lq = Math.floor(lobe * a * 3) / 3 * 0.35, sq = Math.floor(spec * 3) / 3 * a * 0.5, wq = Math.floor(s0 * 3) / 3 * a * 0.6;
        for (let k = 0; k < 3; k++) {
          let v = art[q + k] / 255;
          v *= 1 + ((1 + (hue[k] - 1) * 0.5) * 1.04 - 1) * t1;        // el tinte de la lamina, suave: el dibujo manda
          const s = hue[k] * I * a * 0.7; v = 1 - (1 - v) * (1 - s);  // screen
          v += ((hue[k] + 1) * 0.5 - v) * lq;                          // el reflejo de la luz en la lamina
          v += ([1, 0.99, 0.95][k] - v) * sq;
          v += ((hue[k] + (1 - hue[k]) * 0.65) - v) * wq;              // «pasa la luz»
          d[q + k] = clamp(Math.round(v * 255), 0, 255);
        }
        d[q + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    };
    /* el bucle: solo mientras la luz, la inclinacion o el barrido se mueven */
    const tick = now => {
      st.raf = 0; if (!st.alive || !fo.isConnected) { vivas.delete(st); return; }
      const dt = Math.min(0.05, st.last ? (now - st.last) / 1000 : 0.016); st.last = now;
      const w = P.inercia;
      muelle(st.tx, st.gtx, dt, w); muelle(st.ty, st.gty, dt, w); muelle(st.lx, st.gx, dt, w * 1.4); muelle(st.ly, st.gy, dt, w * 1.4);
      if (st.sweep >= 0) { st.sweep += dt; if (st.sweep > 0.75) st.sweep = -1; }
      render();
      const moving = st.sweep >= 0 || Math.abs(st.lx.x - st.gx) + Math.abs(st.ly.x - st.gy) > 0.5 || Math.abs(st.lx.v) + Math.abs(st.ly.v) > 0.5 || Math.abs(st.tx.x - st.gtx) + Math.abs(st.ty.x - st.gty) > 0.0005;
      if (moving) st.raf = requestAnimationFrame(tick); else st.last = 0;
    };
    const kick = () => { if (!st.raf && !reduced()) st.raf = requestAnimationFrame(tick); };
    /* la luz sigue al puntero por toda la pantalla (con su tope, como en la maqueta); la inclinacion es la que socio.js ya da a la carta */
    st.point = (clientX, clientY) => {
      if (!fo.isConnected) { st.alive = false; vivas.delete(st); return; }
      if (reduced()) return;
      const r = o.cv.getBoundingClientRect(); if (!r.width) return;
      const ux = r.width / (GW * UX), uy = r.height / (GH * UX);     // px de pantalla por unidad de la maqueta
      st.gx = clamp((clientX - r.left) / ux - M * UX, -298, 422); st.gy = clamp((clientY - r.top) / uy - M * UX, -337, 563);
      const tr = o.tilt.style.transform || "", ry = /rotateY\(([-\d.]+)deg\)/.exec(tr), rx = /rotateX\(([-\d.]+)deg\)/.exec(tr);
      st.gty = ry ? (+ry[1] * Math.PI) / 180 : 0; st.gtx = rx ? (+rx[1] * Math.PI) / 180 : 0;
      kick();
    };
    st.barre = () => { if (reduced()) return; st.sweep = 0; kick(); try { if (A.sfx && A.sfx.ding) A.sfx.ding(); if (A.haptic && A.haptic.dual) A.haptic.dual(0.08, 0.2 + 0.1 * ED, 120 + 60 * ED); } catch (e) { /* nada */ } };
    st.remask = () => { remask(); render(); };
    st.refresh = () => { art = o.L.ctx.getImageData(0, 0, GW, GH).data; render(); };   // las cartas vivas: su fondo se ha movido
    st.alive = true; vivas.add(st);
    render();
    /* «Pasa la luz» al estrenar edicion: la primera vez que ves esta carta */
    if (o.sweepAlEstrenar) { let v = 0; try { v = +(localStorage.getItem(KEY) || 0); } catch (e) { /* nada */ } if (o.card > v) { try { localStorage.setItem(KEY, String(o.card)); } catch (e) { /* nada */ } setTimeout(() => st.barre(), 900); } }
    return st;
  }
  addEventListener("pointermove", e => { for (const st of vivas) { if (!st.alive) { vivas.delete(st); continue; } st.point(e.clientX, e.clientY); } }, { passive: true });

  A.lamina = { monta };
})(window.AIQ);
