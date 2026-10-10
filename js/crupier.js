/*
 * Geolite - DON CRUPIER, el sprite animado. Un solo retrato maestro (tools/crupier/) partido en capas que se mueven por
 * separado: cuerpo, cabeza (mascara rigida + ojos + boca + bigote), chistera lisa, cartas, guante y la mano libre con su manga.
 * Nunca cambia su ropa: la chistera, la mascara, la pajarita y las cartas son los mismos pixeles en todas las caras y gestos.
 *
 *   const s = A.crupier.mount(host, o)    pinta el crupier dentro de `host` (un <canvas> nitido: escala ENTERA de pixel de pantalla)
 *   s.set("laugh")                        expresion (A.crupier.list()); cada una con su bucle, su parpadeo y su forma de hablar
 *   s.talk(true) / s.syl() / s.talk(false)  boca al ritmo de la frase (dealer.js llama a syl() en cada letra que suena)
 *   s.play("hat_off_bow", fin)            gesto de un solo disparo (A.crupier.gestures()) y vuelve a su cara; los "hold" se
 *   s.release()                           quedan en su ultimo fotograma hasta release() (p. ej. al acabar la frase)
 *   s.look(-1|0|1|2|null)                 hacia donde mira (2 = arriba; null = donde quiera la expresion)
 *   s.fit()                               recalcula la escala (se llama sola al cambiar de tamano o de pantalla)
 * o: { round: true } escala entera mas cercana (si no, hacia abajo con un 34 % de margen), { fidget: false } sin gestos sueltos,
 *    { still: true } quieto (sin respirar, parpadear ni gestos sueltos: para capturas y movimiento reducido)
 * Datos (atlas + piezas + expresiones + gestos): js/crupier-data.js, generado por tools/crupier/build.py.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const N = 128, BOTTOM = 118;
  const D = () => A.CRUPIER_DATA;
  let img = null, loaded = false; const onload = [];
  const whenReady = fn => { if (loaded) fn(); else { onload.push(fn); load(); } };
  function load() {
    if (img) return; img = new Image(); img.decoding = "async";
    img.onload = () => { loaded = true; onload.splice(0).forEach(f => f()); };
    img.src = D().atlas;
  }
  const exprId = id => { const d = D(); return d.expr[id] ? id : d.alias.expr[id] || "sly"; };
  const gestId = id => { const d = D(); return d.gest[id] ? id : d.alias.gest[id] || null; };
  const reduced = () => document.documentElement.classList.contains("reduce-motion");

  /* lienzos de trabajo de 128x128 en CPU (se leen filas para el corte del busto, el glitch y la silueta), compartidos */
  let work, wctx, hw, hctx;
  const mk = () => { const c = document.createElement("canvas"); c.width = c.height = N; const x = c.getContext("2d", { willReadFrequently: true }); x.imageSmoothingEnabled = false; return [c, x]; };
  const ctxs = () => { if (!wctx) { [work, wctx] = mk(); [hw, hctx] = mk(); } };
  const OUTLINE = [29, 10, 61], INK = [1, 0, 63], RIM = [35, 3, 97], DIM = [70, 10, 40], WHITE = [255, 255, 255];
  const REDS = ["255,28,36", "205,7,37", "255,112,104", "150,4,40"];
  const TILT = { 1: .07, 2: .14, "-1": -.07, "-2": -.14 };

  /* pose por defecto y mezcla de capas de pose (la de la expresion, su bucle, el gesto, el parpadeo y el habla) */
  const BASE = { e: "open", r: null, l: 0, m: "smirk", s: 0, b: [0, 0], h: [0, 0], t: [0, 0], c: [0, 0], f: [0, 0], g: null, x: null, k: 0, w: null, d: 0 };
  const merge = (...ps) => { const o = Object.assign({}, BASE); for (const p of ps) if (p) for (const k in p) if (p[k] !== undefined) o[k] = p[k]; return o; };

  /* compone una pose en el lienzo de trabajo (misma logica que pose_img de tools/crupier/build.py) */
  function compose(p) {
    ctxs();
    const c = wctx, P = D().parts;
    const put = (x, name, dx, dy) => { const q = P[name]; if (q) x.drawImage(img, q[0], q[1], q[2], q[3], q[4] + dx, q[5] + dy, q[2], q[3]); };
    c.clearRect(0, 0, N, N);
    const hx = p.h[0], hy = p.h[1];
    put(c, "body", p.b[0], p.b[1]);
    // la cabeza y su chistera, aparte (para poder ladearlas desplazando filas enteras, sin rotar)
    const h = p.k ? hctx : c; if (p.k) h.clearRect(0, 0, N, N);
    put(h, "head", hx, hy);
    const el = p.e, er = p.r || p.e, lk = p.l | 0;
    put(h, P[`eL_${el}_${lk}`] ? `eL_${el}_${lk}` : `eL_${el}_0`, hx, hy);
    put(h, P[`eR_${er}_${lk}`] ? `eR_${er}_${lk}` : `eR_${er}_0`, hx, hy);
    if (p.m) put(h, "m_" + p.m, hx, hy);
    put(h, "stache", hx, hy + p.s);
    put(h, "hat", hx + p.t[0], hy + p.t[1]);
    if (p.k) {
      const t = TILT[p.k] || 0; let y0 = 0, cur = Math.round((90 - 0) * t);
      for (let y = 1; y <= N; y++) {
        const dx = y < N ? Math.round((90 - y) * t) : null;
        if (dx !== cur) { c.drawImage(hw, 0, y0, N, y - y0, cur, y0, N, y - y0); y0 = y; cur = dx; }
      }
    }
    put(c, "cards", p.c[0], p.c[1]);
    put(c, "fist", p.f[0], p.f[1]);
    if (p.g) { if (typeof p.g === "string") put(c, p.g, 0, 0); else for (const [n, dx, dy] of p.g) put(c, n, dx | 0, dy | 0); }   // la mano libre: brazo, lo que sujeta y la mano, en orden
    if (p.x) for (const [n, dx, dy] of p.x) put(c, n, hx + (dx | 0), hy + (dy | 0));
    if (p.w) for (const [y0, y1, dx] of p.w) { const band = c.getImageData(0, y0, N, y1 - y0); c.clearRect(0, y0, N, y1 - y0); c.putImageData(band, dx, y0); }
    if (p.d) darken(c, hx, hy);
    // corte del busto: nada por debajo de la fila 118 y una linea de contorno bajo lo que llega hasta ella
    c.clearRect(0, BOTTOM + 1, N, N - BOTTOM - 1);
    const row = c.getImageData(0, BOTTOM, N, 1).data, line = c.createImageData(N, 1);
    for (let x = 0; x < N; x++) if (row[x * 4 + 3]) { line.data.set(OUTLINE, x * 4); line.data[x * 4 + 3] = 255; }
    c.putImageData(line, 0, BOTTOM + 1);
    return work;
  }
  /* a oscuras: silueta con un filo de luz a la izquierda, los rojos apagados y solo los ojos encendidos */
  function darken(c, hx, hy) {
    const im = c.getImageData(0, 0, N, N), a = im.data, src = new Uint8ClampedArray(a);
    const isOut = i => src[i] === OUTLINE[0] && src[i + 1] === OUTLINE[1] && src[i + 2] === OUTLINE[2];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4; if (!src[i + 3] || isOut(i)) continue;
      const eye = x >= 53 + hx && x <= 90 + hx && y >= 58 + hy && y <= 67 + hy && src[i] === 255 && src[i + 1] === 255 && src[i + 2] === 255;
      if (eye) continue;
      const col = REDS.includes(`${src[i]},${src[i + 1]},${src[i + 2]}`) ? DIM : x > 0 && isOut(i - 4) ? RIM : INK;
      a[i] = col[0]; a[i + 1] = col[1]; a[i + 2] = col[2];
    }
    c.putImageData(im, 0, 0);
  }

  const rnd = (a, b) => a + Math.random() * (b - a);
  const BLINK = { open: ["half", "closed", "half"], half: ["closed"], big: ["half", "closed", "half"], angry: ["closed"], sad: ["closed"], squint: ["closed"], sleepy: ["closed"], rage: ["closed"] };
  const live = new Set();

  class Sprite {
    constructor(host, o = {}) {
      load();
      this.host = host; this.o = o;
      this.cv = document.createElement("canvas"); this.cv.className = "cr-cv" + (o.mini ? " mini" : ""); this.cv.setAttribute("aria-hidden", "true");
      this.ctx = this.cv.getContext("2d"); host.appendChild(this.cv);
      this.expr = exprId(o.expr || "sly"); this.t0 = performance.now(); this.gest = null;
      this.talking = false; this.mi = 0; this.lastSyl = 0; this.lastMouth = 0; this.blinkAt = 0; this.lookO = null;
      this.fidgetAt = 0; this.lastFidget = ""; this.key = ""; this.k = 0; this.timer = 0; this.dead = false; this.visible = o.visible !== false;
      if (window.ResizeObserver) {                                                // tamano en pixeles reales: cambia tambien con el zoom de la pantalla o al pasar a otro monitor
        this.ro = new ResizeObserver(() => this.fit());
        try { this.ro.observe(host, { box: "device-pixel-content-box" }); } catch (e) { this.ro.observe(host); }
      }
      live.add(this);
      whenReady(() => { this.fit(); this.tick(); });
    }
    get E() { return D().expr[this.expr]; }
    get quiet() { return this.o.still || reduced(); }
    /* escala entera: el lienzo mide 128*k pixeles REALES de pantalla (con el zoom de la pantalla y el escalado de Windows) y va centrado en host.
       k se elige por el busto (112 filas de las 128): el busto cabe en el hueco y lo que sobra del lienzo es margen transparente.
       o.mini: hueco pequeno (tutorial): recorte de la cabeza a escala entera, sin encoger nunca el pixel */
    fit() {
      if (this.dead || !loaded) return;
      // tamano de maquetacion (sin transformaciones: las animaciones de entrada escalan y no deben encogerlo) x zoom efectivo x pixeles reales
      const cw = this.host.clientWidth, ch = this.host.clientHeight, z = this.host.currentCSSZoom || 1, dpr = window.devicePixelRatio || 1;
      const dw = cw * z * dpr, dh = ch * z * dpr;
      const slot = Math.min(dw, dh || dw); if (slot < 4 || !cw) return;
      const mini = !!this.o.mini || slot < 90;                                      // hueco mas pequeno que el busto a x1: recorte de la cara (nunca se sale del hueco)
      const k = mini ? Math.max(1, Math.floor(slot / 64 + 0.02)) : Math.max(1, Math.floor(slot / 112 + 0.2));   // el busto puede pasarse ~6 % del hueco (lo absorbe el margen del lienzo)
      if (k !== this.k) { this.k = k; this.cv.width = this.cv.height = N * k; this.ctx = this.cv.getContext("2d"); this.ctx.imageSmoothingEnabled = false; this.key = ""; }
      const per = 1 / (z * dpr);                                                     // px de CSS (del hueco) por pixel real de pantalla
      const css = N * k * per; this.css = css; this.cv.style.width = this.cv.style.height = css + "px";
      if (mini !== this.mini) { this.mini = mini; this.cv.classList.toggle("mini", mini); this.host.style.overflow = mini ? "hidden" : ""; if (!mini) this.cv.style.left = this.cv.style.top = ""; }
      if (mini) { this.cv.style.left = (cw / 2 - 64 * k * per) + "px"; this.cv.style.top = (ch / 2 - 66 * k * per) + "px"; }   // entre los ojos y la boca
      this.draw(true);
    }
    set(expr, o = {}) {
      expr = exprId(expr);
      if (this.gest && this.gest.fid) this.drop();                                     // un gesto suelto de reposo nunca se cuela en una frase
      if (expr === this.expr && !o.restart) return this;
      this.expr = expr; this.t0 = performance.now(); this.blinkAt = 0; this.mi = 0; this.fidgetAt = 0;
      if (this.gest && !this.gest.g.hold) this.drop();
      if (this.E.enter && !o.quiet && !this.quiet) this.play(this.E.enter);
      this.poke(); return this;
    }
    talk(on) { this.talking = !!on; if (!on) this.mi = 0; else if (this.gest && this.gest.fid) this.drop(); this.fidgetAt = 0; this.poke(); return this; }
    /* a la vista o no (dealer.js): oculto no hace gestos sueltos y repinta muy de vez en cuando */
    shown(on) { this.visible = !!on; if (!on && this.gest && this.gest.fid) this.drop(); this.fidgetAt = 0; this.poke(); return this; }
    drop() { const d = this.gest && this.gest.done; this.gest = null; if (d) setTimeout(d, 0); }
    syl() {
      const now = performance.now(); this.lastSyl = now;
      if (now - this.lastMouth >= (this.E.talkMs || 70)) { this.mi++; this.lastMouth = now; }
      this.poke(); return this;
    }
    look(d) { this.lookO = d; this.poke(); return this; }
    play(id, done) {
      id = gestId(id); const g = id && D().gest[id];
      if (!g || this.quiet && !g.hold) { if (done) setTimeout(done, 0); return this; }
      if (this.gest && this.gest.done) { const d = this.gest.done; setTimeout(d, 0); }
      this.gest = { id, g, i: this.quiet ? g.frames.length - 1 : 0, at: performance.now(), done }; this.poke(); return this;
    }
    release() { if (this.gest && this.gest.g.hold) { const d = this.gest.done; this.gest = null; if (d) setTimeout(d, 0); this.poke(); } return this; }
    busy() { return !!this.gest; }
    /* pose actual */
    pose(now) {
      const E = this.E, G = this.gest, frz = G && G.g.freeze; let p = merge(E.base);
      if (E.idle && E.idle.length && !this.quiet && !frz) {            // bucle de la expresion
        const tot = E.idle.reduce((s, f) => s + f[1], 0); let t = (now - this.t0) % tot;
        for (const f of E.idle) { if (t < f[1]) { p = merge(p, f[0]); break; } t -= f[1]; }
      }
      const held = G && G.g.hold && G.i >= G.g.frames.length - 1;                  // gesto sostenido ya en su pose final: sigue vivo (respira y parpadea)
      if (E.breath !== false && !this.quiet && !frz && (!G || held)) {           // respira: cabeza, chistera y manos bajan 1 px
        const ph = Math.floor((now - this.t0) / (E.breath || 1300)) % 2;
        if (ph) p = merge(p, { h: [p.h[0], p.h[1] + 1], c: [p.c[0], p.c[1] + 1], f: [p.f[0], p.f[1] + 1] });
      }
      if (G) {
        const fr = G.g.frames;
        while (G.i < fr.length && now - G.at >= fr[G.i][1]) { if (G.g.hold && G.i === fr.length - 1) break; G.at += fr[G.i][1]; G.i++; }
        if (G.i >= fr.length) { const d = G.done; this.gest = null; this.fidgetAt = 0; if (d) setTimeout(d, 0); }
        else p = merge(p, fr[G.i][0]);
      }
      const gf = this.gest && this.gest.g.frames[this.gest.i];
      if (this.lookO != null && !(gf && gf[0].l != null)) p.l = this.lookO;
      if (this.talking && !(this.gest && (this.gest.g.lockMouth || frz))) {   // habla: la boca sigue las letras; si se calla un rato, cierra
        const T = E.talk || ["talk1", "talk2"];
        if (now - this.lastSyl < 190) { p.m = T[this.mi % T.length]; if (/talk3|laugh|yawn|shout/.test(p.m)) p.s = Math.min(p.s, -1); }
        else p.m = E.rest != null ? E.rest : E.base.m != null ? E.base.m : "smirk";
      }
      if (E.blink !== false && (!this.gest || held) && BLINK[p.e]) {             // parpadeo al azar (tambien con movimiento reducido: no es movimiento)
        if (!this.blinkAt) this.blinkAt = now + rnd(1800, 5200);
        if (now >= this.blinkAt) {
          const seq = BLINK[p.e], i = Math.floor((now - this.blinkAt) / 60);
          if (i < seq.length) { p.e = seq[i]; if (p.r) p.r = BLINK[p.r] ? seq[i] : p.r; }
          else this.blinkAt = now + (Math.random() < 0.12 ? 200 : rnd(3000, 6000));   // a veces, doble parpadeo
        }
      }
      return p;
    }
    /* gestos sueltos en reposo (callado, sin otro gesto, sin repetir el anterior) */
    fidget(now) {
      const L = this.E.fidget; if (!L || !L.length || this.o.fidget === false || this.quiet || this.talking || this.gest || !this.visible) return;
      const [a, b] = D().fidget || [7000, 14000];
      if (!this.fidgetAt) { this.fidgetAt = now + rnd(a, b); return; }
      if (now < this.fidgetAt) return;
      const pool = L.length > 1 ? L.filter(g => g !== this.lastFidget) : L, g = pool[Math.floor(Math.random() * pool.length)];
      this.lastFidget = g; this.fidgetAt = now + rnd(a, b); this.play(g); if (this.gest) this.gest.fid = true;
    }
    draw(force) {
      if (this.dead || !loaded || !this.k) return;
      const now = performance.now(); this.fidget(now);
      const p = this.pose(now), key = JSON.stringify(p);
      if (!force && key === this.key) return;
      this.key = key; compose(p);
      const c = this.ctx; c.clearRect(0, 0, this.cv.width, this.cv.height); c.drawImage(work, 0, 0, N, N, 0, 0, N * this.k, N * this.k);
    }
    /* reloj propio: solo repinta cuando cambia algo (nada de 60 fps): ~30 ms con gesto o habla, si no a su ritmo */
    tick() {
      if (this.dead) return;
      clearTimeout(this.timer);
      if (!this.host.isConnected) { this.timer = setTimeout(() => this.tick(), 400); return; }
      this.draw();
      const busy = this.gest || this.talking || (this.blinkAt && performance.now() >= this.blinkAt - 40);
      this.timer = setTimeout(() => this.tick(), busy ? 33 : this.visible ? 90 : 400);
    }
    poke() { if (loaded && !this.dead) { clearTimeout(this.timer); this.timer = setTimeout(() => this.tick(), 0); } }
    destroy() { this.dead = true; clearTimeout(this.timer); if (this.ro) this.ro.disconnect(); live.delete(this); this.cv.remove(); }
  }
  addEventListener("resize", () => live.forEach(s => s.fit()));                     // tambien cambia devicePixelRatio (otro monitor, zoom)

  A.crupier = {
    mount: (host, o) => new Sprite(host, o),
    list: () => Object.keys(D().expr),
    gestures: () => Object.keys(D().gest),
    expr: exprId, gest: gestId,
    ready: whenReady, load,
    /* tamano de CSS exacto para un hueco de `css` px como mucho: el busto a k pixeles reales por pixel (k <= kMax si se da) */
    snap(css, kMax) {
      const dpr = window.devicePixelRatio || 1; let k = Math.floor(css * dpr / 112 + 0.02); if (kMax) k = Math.min(k, kMax);
      return k < 1 ? { k: 0, css: 0 } : { k, css: 112 * k / dpr };
    },
    /* imagen fija de una expresion (iconos, fichas, tutorial): dataURL de 128*k pixeles */
    still(expr = "sly", k = 4) {
      if (!loaded) return null;
      const E = D().expr[exprId(expr)], c = document.createElement("canvas"); c.width = c.height = N * k;
      const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(compose(merge(E.base, E.still)), 0, 0, N, N, 0, 0, N * k, N * k);
      return c.toDataURL();
    },
  };
})(window.AIQ);
