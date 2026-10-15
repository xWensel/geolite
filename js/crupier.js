/*
 * Geolite - DON CRUPIER, el sprite animado. Todo el arte es de Pixel Lab: 18 caras y 40 gestos dibujados enteros a 96 px (lienzo de 96x112:
 * 16 filas arriba para la chistera que salta) y piezas de vida que se ponen encima (tres bocas para hablar, parpadeo y mirada). El codigo
 * solo elige el dibujo y pone las piezas; nunca dibuja. Los 8 gestos sencillos (asentir, mecerse, temblar, acercarse, helarse, guinar...)
 * mueven el dibujo entero a pixel completo.
 *
 *   const s = A.crupier.mount(host, o)    pinta el crupier dentro de `host` (un <canvas> nitido: escala ENTERA de pixel de pantalla)
 *   s.set("laugh")                        expresion (A.crupier.list()); cada una con su reposo, su parpadeo y su forma de hablar
 *   s.talk(true) / s.syl() / s.talk(false)  boca al ritmo de la frase (dealer.js llama a syl() en cada letra que suena)
 *   s.play("hat_off_bow", fin)            gesto de un solo disparo (A.crupier.gestures()) y vuelve a su cara; los "hold" se
 *   s.release()                           quedan en su pose hasta release() (p. ej. al acabar la frase)
 *   s.look(-1|0|1|2|null)                 hacia donde mira (solo con los ojos de su cara normal: -1 izquierda, 1 derecha)
 *   s.fit()                               recalcula la escala (se llama sola al cambiar de tamano o de pantalla)
 * o: { fidget: false } sin gestos sueltos, { still: true } quieto (sin respirar, parpadear ni gestos sueltos: capturas y movimiento
 *    reducido), { mini: true } solo la cabeza (tutorial)
 * Durante un gesto se ve el dibujo del gesto; si la cara de la frase no es la normal, sus ojos y su boca se ponen encima en los
 * fotogramas en que la cabeza esta en su sitio (crupier-data.js dice donde, al pixel).
 * Datos (atlas + rectangulos + gestos): js/crupier-data.js, generado por geolite-art-tools/pixellab/crupier/derivados/rig/build_rig.py.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const W = 96, H = 112;                       // lienzo de cada dibujo
  const FIG = 81;                              // alto de la figura quieta (chistera incluida): la unidad de los huecos
  const CX = 52.5, CY = 65;                    // centro de la figura quieta en el lienzo (para centrarla en su hueco)
  const HX = 48, HY = 56;                      // centro de la cabeza (recorte de la cabeza: tutorial y fotos fijas; la chistera entera)
  const D = () => A.CRUPIER_DATA;
  let img = null, loaded = false; const onload = [];
  const whenReady = fn => { if (loaded) fn(); else { onload.push(fn); load(); } };
  function load() {
    if (img) return; img = new Image(); img.decoding = "async";
    img.onload = () => { loaded = true; onload.splice(0).forEach(f => f()); };
    img.src = D().atlas;
  }
  const reduced = () => document.documentElement.classList.contains("reduce-motion");

  /* ------------------------------------------------------------ expresiones: su cara, su reposo y como hablan, parpadean y respiran.
     talk:0 = habla con su propia boca (risa, enfado, sorpresa, nervios, furia, sueno); blink:0 = no parpadea; breath = ms de cada respiracion
     (0 = no respira). idle: [{x, y: el dibujo entero a pixel completo; l: "l"|"r" mira; shut: ojos cerrados; open: ojo del guino abierto;
     off: a oscuras, ojos apagados}, ms] en bucle. enter: gesto con el que entra; fidget: gestos sueltos en reposo */
  const EX = {
    sly: { idle: [[{}, 5200], [{ l: "l" }, 1100], [{}, 3600], [{ l: "r" }, 900]], fidget: ["shuffle", "fan_self", "hat_tip", "twirl_moustache"] },
    laugh: { talk: 0, blink: 0, breath: 0, enter: "hat_pop", idle: [[{ y: -1 }, 110], [{}, 110], [{ y: -1 }, 110], [{}, 110], [{ y: -1 }, 110], [{}, 400]] },
    angry: { talk: 0, idle: [[{}, 1400], [{ x: -1 }, 60], [{ x: 1 }, 60], [{ x: -1 }, 60], [{}, 60]], fidget: ["crumple"] },
    shock: { talk: 0, blink: 0, enter: "hat_pop", idle: [[{}, 800], [{ x: 1 }, 60], [{}, 800]] },
    wink: { idle: [[{}, 900], [{ open: 1 }, 3600]] },
    suspicious: {},
    smug: { fidget: ["fan_self", "twirl_moustache", "preen"] },
    sad: { breath: 2000 },
    nervous: { talk: 0, talkMs: 55, idle: [[{}, 700], [{ x: 1 }, 120], [{ x: -1 }, 120], [{}, 900]] },
    innocent: {},
    bored: { breath: 2200, talkMs: 120, fidget: ["yawn", "slow_blink"] },
    sleep: { talk: 0, blink: 0, breath: 1600, idle: [[{}, 2500], [{ y: 2 }, 500], [{}, 300]] },
    furious: { talk: 0, breath: 0, talkMs: 60, enter: "tantrum", idle: [[{ x: -2 }, 70], [{ x: 2 }, 70], [{ y: 1 }, 150], [{}, 150]] },
    puzzled: { fidget: ["scratch_head"] },
    dare: { breath: 2400, enter: "hat_low", idle: [[{}, 3000], [{ shut: 1 }, 80]] },
    bow: { blink: 0, breath: 0, enter: "hat_off_bow" },
    dark: { dark: 1, talk: 0, blink: 0, idle: [[{}, 5000], [{ off: 1 }, 100]] },
    dark_vexed: { dark: 1, talk: 0, blink: 0, idle: [[{}, 3300], [{ off: 1 }, 100]] },
  };
  const ALIAS = {
    expr: { boss: "dare", deadpan: "bored", doze: "sleep", neutral: "sly", dark_innocent: "dark" },
    gest: { hat_hop: "hat_pop", hat_jump: "hat_pop", flinch: "hat_pop", bow: "hat_off_bow", mourn: "hat_chest", fan: "fan_self", wag: "finger_wag", twirl: "twirl_moustache", bowtie: "preen", toss: "coin_toss", slam: "crumple" },
  };
  /* gestos de Pixel Lab: duracion total (la de siempre), hold = se queda en su punto alto hasta release(), lock = la boca no habla
     (la tapa o la usa el gesto), cut = no vuelve atras (la carta sale volando: corta a su cara) */
  const GT = {
    hat_tip: [750], hat_off_bow: [1987, "lock"], hat_pop: [498], hat_low: [667], hat_chest: [2817, "lock"], shuffle: [747], deal_card: [581, "cut"],
    card_reveal: [1264], fan_self: [1375], fan_open: [915], crumple: [655], cards_hide: [998], point: [1141], tantrum: [1246], droop: [500, "hold"],
    shrug: [776], finger_wag: [1377], finger_up: [1238, "hold"], shh: [1514, "lock"], beckon: [894], pinch: [1064], slow_clap: [1147],
    facepalm: [1214, "lock"], scratch_head: [1314], twirl_moustache: [1000], preen: [929], pocket_watch: [1329], coin_toss: [1904], stamp: [608, "lock"],
    jot: [1157], glass_knock: [923], snap: [830], magic_pass: [963], turn_away: [1162, "lock"], head_tilt: [749], hand_heart: [1314], cards_tap: [706],
    pocket_coin: [896], blow: [745, "lock"], yawn: [759, "lock"],
  };
  /* gestos por codigo: el dibujo entero se mueve a pixel completo (x, y), cierra los ojos (shut), guina (wink) o falla la senal (w: bandas de
     filas desplazadas [fila0, fila1, dx]) */
  const shake = (n, a, b, ms) => Array.from({ length: n }, (_, i) => [{ x: i % 2 ? b : a }, ms]);
  const GC = {
    nod: { frames: [[{ y: 2 }, 160], [{}, 160], [{ y: 1 }, 160], [{}, 160]] },
    sway: { frames: [-2, -1, 0, 1, 2, 1, 0, -1, -2, -1, 0, 1, 2, 1, 0, 0].map(x => [{ x }, 110]) },
    tremble: { frames: shake(12, -1, 1, 60) },
    tremble_body: { frames: shake(12, -1, 1, 60), lock: 1 },
    lean_in: { frames: [[{ y: 1 }, 249]], hold: 1 },
    freeze: { frames: [[{}, 700], [{ w: [[48, 57, 3], [83, 89, -2]] }, 83], [{ w: [[48, 57, -2], [83, 89, 2]] }, 83], [{}, 83], [{ wink: 1 }, 450]], freeze: 1 },
    slow_blink: { frames: [[{ shut: 1 }, 800]] },
    wink: { frames: [[{ wink: 1 }, 820]] },
  };
  const gfx = {};   // gesto de Pixel Lab -> { frames: [[indice del fotograma, ms]], peak, hold, lock }
  function gx(id) {
    if (gfx[id] || GC[id]) return gfx[id] || GC[id];
    const g = D().gest[id], t = GT[id]; if (!g || !t) return null;
    const n = g.frames.length, cut = t.includes("cut"), ida = g.ida && !cut;
    const seq = []; for (let i = 0; i < n; i++) seq.push(i); if (ida) for (let i = n - 2; i >= 0; i--) seq.push(i);
    const per = Math.max(60, Math.min(150, Math.round(t[0] / seq.length))), extra = Math.max(0, t[0] - per * seq.length);
    const peak = g.peak;
    return (gfx[id] = { pm: g, frames: seq.map((f, i) => [f, per + (i === peak ? extra : 0)]), peak, hold: t.includes("hold"), lock: t.includes("lock") });
  }
  const exprId = id => EX[id] ? id : ALIAS.expr[id] || "sly";
  const gestId = id => { const g = GC[id] || GT[id] ? id : ALIAS.gest[id]; return g && (GC[g] || (D().gest[g] && GT[g])) ? g : null; };

  /* ------------------------------------------------------------ composicion: un lienzo de trabajo de 96x112 compartido */
  let work, wctx;
  const ctxs = () => { if (!wctx) { work = document.createElement("canvas"); work.width = W; work.height = H; wctx = work.getContext("2d", { willReadFrequently: true }); wctx.imageSmoothingEnabled = false; } };
  const R = n => D().r[n];
  function put(c, r, dx, dy, clear) {                 // pinta una pieza del atlas en su sitio (+ desplazamiento); clear: borra antes su rectangulo
    if (!r) return; const x = r[4] + (dx | 0), y = r[5] + (dy | 0);
    if (clear) c.clearRect(x, y, r[2], r[3]);
    c.drawImage(img, r[0], r[1], r[2], r[3], x, y, r[2], r[3]);
  }
  const INK = [1, 0, 63], RIM = [35, 3, 97], DIM = [70, 10, 40], OUTLINE = [29, 10, 61];
  const REDS = new Set(["232,40,58", "168,20,46"]);
  function darken(c) {                                  // a oscuras: silueta con un filo de luz a la izquierda y los rojos apagados
    const im = c.getImageData(0, 0, W, H), a = im.data, src = new Uint8ClampedArray(a);
    const isOut = i => src[i] === OUTLINE[0] && src[i + 1] === OUTLINE[1] && src[i + 2] === OUTLINE[2];
    for (let i = 0; i < a.length; i += 4) {
      if (!src[i + 3] || isOut(i)) continue;
      const col = REDS.has(`${src[i]},${src[i + 1]},${src[i + 2]}`) ? DIM : i % (W * 4) && isOut(i - 4) ? RIM : INK;
      a[i] = col[0]; a[i + 1] = col[1]; a[i + 2] = col[2];
    }
    c.putImageData(im, 0, 0);
  }
  /* p: { e: cara, g: gesto de Pixel Lab (o null), f: su fotograma, l: "l"|"r", shut, open, wink, off, m: boca "eh"|"ah"|"oh", w: bandas } */
  function compose(p) {
    ctxs();
    const c = wctx, d = D(), E = EX[p.e], cap = d.caps[p.e] || {};
    c.clearRect(0, 0, W, H);
    put(c, d.master);
    let eo = [0, 0], mo = [0, 0];                         // donde estan los ojos y la boca (desplazamiento al pixel; null = no estan a la vista)
    if (p.g) {
      const g = d.gest[p.g]; put(c, R(g.frames[p.f]), 0, 0, true);
      [eo, mo] = g.al[p.f];
      if (p.e !== "sly") { if (eo) put(c, R("fe_" + p.e), eo[0], eo[1]); if (mo) put(c, R("fm_" + p.e), mo[0], mo[1]); }
    } else if (p.e !== "sly") put(c, R("face_" + p.e), 0, 0, true);
    if (eo) {
      if (p.e === "wink" && p.open && !p.g) put(c, R("wink_open"));
      if (p.wink) put(c, R("wink_shut"), eo[0], eo[1]);
      if (p.l && cap.look && !p.g) put(c, R(p.l === "l" ? "look_l" : "look_r"));
      if (p.shut) put(c, R("blink"), eo[0], eo[1]);
    }
    if (p.m && mo) put(c, R("mouth_" + p.m), mo[0], mo[1]);
    if (E.dark) { darken(c); if (!p.off && eo) put(c, R("glow_" + p.e), eo[0], eo[1]); }
    if (p.w) for (const [y0, y1, dx] of p.w) { const band = c.getImageData(0, y0, W, y1 - y0); c.clearRect(0, y0, W, y1 - y0); c.putImageData(band, dx, y0); }
    return work;
  }

  const rnd = (a, b) => a + Math.random() * (b - a);
  const MOUTHS = ["eh", "ah", null, "oh", "eh", null];   // boca al ritmo de las silabas (null = su boca, cerrada entre silabas)
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
    get E() { return EX[this.expr]; }
    get cap() { return D().caps[this.expr] || {}; }
    get quiet() { return this.o.still || reduced(); }
    /* escala entera: el lienzo mide 96x112 pixeles de arte a k pixeles REALES de pantalla (con el zoom de la pantalla y el escalado de
       Windows) y la figura (81 filas) queda centrada en el hueco; lo que sobra del lienzo es margen transparente.
       o.mini: hueco pequeno (tutorial): la cabeza a escala entera, sin encoger nunca el pixel */
    fit() {
      if (this.dead || !loaded) return;
      const cw = this.host.clientWidth, ch = this.host.clientHeight, z = this.host.currentCSSZoom || 1, dpr = window.devicePixelRatio || 1;
      const dw = cw * z * dpr, dh = ch * z * dpr;
      const slot = Math.min(dw, dh || dw); if (slot < 4 || !cw) return;
      const mini = !!this.o.mini || slot < 66;
      const k = mini ? Math.max(1, Math.floor(slot / 64 + 0.02)) : Math.max(1, Math.floor(slot / FIG + 0.2));   // la figura puede pasarse un poco del hueco (lo absorbe el margen del lienzo)
      if (k !== this.k) { this.k = k; this.cv.width = W * k; this.cv.height = H * k; this.ctx = this.cv.getContext("2d"); this.ctx.imageSmoothingEnabled = false; this.key = ""; }
      const per = 1 / (z * dpr);                                                     // px de CSS (del hueco) por pixel real de pantalla
      const s = this.cv.style; s.width = W * k * per + "px"; s.height = H * k * per + "px";
      if (mini !== this.mini) { this.mini = mini; this.cv.classList.toggle("mini", mini); this.host.style.overflow = mini ? "hidden" : ""; }
      if (mini) { s.margin = ""; s.left = (Math.round(cw * z * dpr / 2) - HX * k) * per + "px"; s.top = (Math.round(ch * z * dpr / 2) - HY * k) * per + "px"; }
      else { s.left = s.top = ""; s.marginLeft = -Math.round((CX - W / 2) * k) * per + "px"; s.marginTop = -Math.round((CY - H / 2) * k) * per + "px"; }
      this.draw(true);
    }
    set(expr, o = {}) {
      expr = exprId(expr);
      if (this.gest && this.gest.fid) this.drop();                                     // un gesto suelto de reposo nunca se cuela en una frase
      if (expr === this.expr && !o.restart) return this;
      this.expr = expr; this.t0 = performance.now(); this.blinkAt = 0; this.mi = 0; this.fidgetAt = 0;
      if (this.gest && !this.gest.x.hold) this.drop();
      if (this.E.enter && !o.quiet && !this.quiet) this.play(this.E.enter);
      this.poke(); return this;
    }
    talk(on) { this.talking = !!on; if (!on) this.mi = 0; else if (this.gest && this.gest.fid) this.drop(); this.fidgetAt = 0; this.poke(); return this; }
    shown(on) { this.visible = !!on; if (!on && this.gest && this.gest.fid) this.drop(); this.fidgetAt = 0; this.poke(); return this; }
    drop() { const d = this.gest && this.gest.done; this.gest = null; if (d) setTimeout(d, 0); }
    syl() {
      const now = performance.now(); this.lastSyl = now;
      if (now - this.lastMouth >= (this.E.talkMs || 70)) { this.mi++; this.lastMouth = now; }
      this.poke(); return this;
    }
    look(d) { this.lookO = d; this.poke(); return this; }
    play(id, done) {
      id = gestId(id); const x = id && gx(id);
      if (!x || this.quiet && !x.hold) { if (done) setTimeout(done, 0); return this; }
      if (this.gest && this.gest.done) { const d = this.gest.done; setTimeout(d, 0); }
      const stop = x.hold ? (x.pm ? x.frames.findIndex(f => f[0] === x.peak) : x.frames.length - 1) : -1;
      this.gest = { id, x, i: this.quiet ? Math.max(0, stop) : 0, at: performance.now(), done, stop, rel: false }; this.poke(); return this;
    }
    release() {
      const G = this.gest; if (!G || !G.x.hold) return this;
      if (this.quiet || !G.x.pm) { this.gest = null; if (G.done) setTimeout(G.done, 0); }
      else { G.rel = true; G.at = performance.now(); }                                // sigue el gesto desde su punto alto hasta el final
      this.poke(); return this;
    }
    busy() { return !!this.gest; }
    /* pose actual */
    pose(now) {
      const E = this.E, G = this.gest, cap = this.cap, frz = G && G.x.freeze;
      const p = { e: this.expr, g: null, f: 0, x: 0, y: 0, l: null, shut: 0, open: 0, wink: 0, off: 0, m: null, w: null };
      if (G) {
        const fr = G.x.frames;
        while (G.i < fr.length && now - G.at >= fr[G.i][1]) { if (G.i === G.stop && !G.rel) break; G.at += fr[G.i][1]; G.i++; }
        if (G.i >= fr.length) { const d = G.done; this.gest = null; this.fidgetAt = 0; if (d) setTimeout(d, 0); return this.pose(now); }
        const f = fr[G.i];
        if (G.x.pm) { p.g = G.id; p.f = f[0]; } else Object.assign(p, f[0]);
      }
      const held = G && G.i === G.stop && !G.rel;                                    // gesto sostenido en su punto alto: sigue vivo (respira y parpadea)
      if (E.idle && !this.quiet && !frz && (!G || !G.x.pm || held)) {                // reposo de la expresion
        const tot = E.idle.reduce((s, f) => s + f[1], 0); let t = (now - this.t0) % tot;
        for (const f of E.idle) { if (t < f[1]) { const q = f[0]; p.x += q.x | 0; p.y += q.y | 0; if (q.l && !p.g) p.l = q.l; if (q.shut) p.shut = 1; if (q.open) p.open = 1; if (q.off) p.off = 1; break; } t -= f[1]; }
      }
      const br = E.breath === undefined ? 1300 : E.breath;
      if (br && !this.quiet && !frz && (!G || held)) { if (Math.floor((now - this.t0) / br) % 2) p.y += 1; }   // respira: el dibujo entero baja 1 px
      if (this.lookO != null && !p.g) p.l = this.lookO === -1 ? "l" : this.lookO === 1 ? "r" : null;
      if (this.talking && E.talk !== 0 && cap.talk && !(G && (G.x.lock || frz))) {   // habla: la boca sigue las letras; si se calla un rato, cierra
        if (now - this.lastSyl < 190) p.m = MOUTHS[this.mi % MOUTHS.length];
      }
      if (E.blink !== 0 && cap.blink && (!G || held) && !p.shut) {                    // parpadeo al azar (tambien con movimiento reducido: no es movimiento)
        if (!this.blinkAt) this.blinkAt = now + rnd(1800, 5200);
        if (now >= this.blinkAt) {
          if (now - this.blinkAt < 110) p.shut = 1;
          else this.blinkAt = now + (Math.random() < 0.12 ? 160 : rnd(3000, 6000));   // a veces, doble parpadeo
        }
      }
      return p;
    }
    fidget(now) {
      const L = this.E.fidget; if (!L || !L.length || this.o.fidget === false || this.quiet || this.talking || this.gest || !this.visible) return;
      if (!this.fidgetAt) { this.fidgetAt = now + rnd(7000, 14000); return; }
      if (now < this.fidgetAt) return;
      const pool = L.length > 1 ? L.filter(g => g !== this.lastFidget) : L, g = pool[Math.floor(Math.random() * pool.length)];
      this.lastFidget = g; this.fidgetAt = now + rnd(7000, 14000); this.play(g); if (this.gest) this.gest.fid = true;
    }
    draw(force) {
      if (this.dead || !loaded || !this.k) return;
      const now = performance.now(); this.fidget(now);
      const p = this.pose(now), key = JSON.stringify(p);
      if (!force && key === this.key) return;
      this.key = key; compose(p);
      const c = this.ctx, k = this.k; c.clearRect(0, 0, this.cv.width, this.cv.height); c.drawImage(work, 0, 0, W, H, p.x * k, p.y * k, W * k, H * k);
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
    list: () => Object.keys(EX),
    gestures: () => [...Object.keys(GT).filter(g => D().gest[g]), ...Object.keys(GC)],
    expr: exprId, gest: gestId,
    ready: whenReady, load,
    /* tamano de CSS exacto para un hueco de `css` px como mucho: la figura (81 filas) a k pixeles reales por pixel (k <= kMax si se da) */
    snap(css, kMax) {
      const dpr = window.devicePixelRatio || 1; let k = Math.floor(css * dpr / FIG + 0.02); if (kMax) k = Math.min(k, kMax);
      return k < 1 ? { k: 0, css: 0 } : { k, css: FIG * k / dpr };
    },
    /* imagen fija de una expresion (fotos, tutorial): dataURL del lienzo entero (96x112 * k) o, con crop "head", de la cabeza (64x64 * k) */
    still(expr = "sly", k = 4, crop) {
      if (!loaded) return null;
      const src = compose({ e: exprId(expr), g: null, f: 0, l: null, shut: 0, open: 0, wink: 0, off: 0, m: null, w: null });
      const [sx, sy, sw, sh] = crop === "head" ? [HX - 32, HY - 32, 64, 64] : [0, 0, W, H];
      const c = document.createElement("canvas"); c.width = sw * k; c.height = sh * k;
      const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(src, sx, sy, sw, sh, 0, 0, sw * k, sh * k);
      return c.toDataURL();
    },
  };
})(window.AIQ);
