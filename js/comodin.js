/*
 * Geolite - COMODIN, el gato de la casa (bloque D). Mudo: el crupier habla de el; el nunca habla. Arte de Pixel Lab (js/comodin-data.js): el gato
 * sentado y 8 animaciones de 8 fotogramas (espera, levanta, anda, salta, zarpa, caricia, regana, duerme) en un lienzo de 128x96 que mira a la
 * derecha; a la izquierda se pinta en espejo. Va SIEMPRE al mismo grano de pixel que el crupier de su pantalla (escala entera de pixel real).
 * Hay un solo gato en la casa: cada pantalla lo pone en su suelo con A.comodin.show(...) y lo quita con A.comodin.hide().
 *
 *   A.comodin.show({ host, k, floor, x, min, max, mode, dir, sleep })
 *       host: contenedor posicionado; k(): pixeles reales por pixel de arte (el del crupier); floor: px de CSS del suelo desde abajo del host;
 *       x: donde se sienta (px de CSS desde la izquierda); min/max: hasta donde anda; mode: "follow" (te persigue por el suelo, salta si te
 *       quedas quieto cerca, se duerme si no haces nada), "still" (sentado, mira), "sleep" (dormido), "bar" (dormido en la barra; se despierta solo
 *       a lo suyo); onPet(tipo): "caricia" | "bufido" | "despierta" (para que el crupier lo comente)
 *   A.comodin.hide()  .act(nombre)  (la mesa: espera, levanta, anda, salta, zarpa, caricia, regana, duerme, despierta)  .busy()  .el()
 *   A.comodin.walkTo(x, fin) .play(anim, { rev, hold, after })  .rect()  (la caja del gato en pantalla, para las trastadas)
 *   A.comodin.hopTo(x, floor, { after, clipY, lift })  SALTA de verdad a otra superficie: se agacha donde esta, vuela en arco durante los
 *       fotogramas en el aire de «salta» y aterriza con las patas justo en el nuevo suelo (floor: px de CSS desde abajo del host). clipY: una linea
 *       de pantalla por debajo de la cual no se le ve (sube desde DETRAS de algo, p. ej. de detras de la tarjeta de salir)
 *   A.comodin.dark(on, "ojos")  el apagon de la salida: todo negro y solo sus ojos (parpadean); sin "ojos", la silueta de tinta con los ojos
 * EL GATO ES FISICO: siempre de pie o tumbado SOBRE algo (una placa, el borde de una tarjeta, un boton, el estrado). Nunca anda ni se para en el aire:
 * para cambiar de altura salta (hopTo). Cada pantalla le da su suelo de verdad.
 * Con Movimiento en Minimo no anda ni salta: se queda sentado (o dormido) y solo responde a las caricias.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const DATA = () => A.COMODIN_DATA;
  const FMS = 110;                                  // ms por fotograma (como en la maqueta aprobada)
  const SPEED = 46;                                 // pixeles de arte por segundo al andar
  const reduced = () => document.documentElement.classList.contains("reduce-motion");
  const rnd = (a, b) => a + Math.random() * (b - a);
  let img = null, ready = false; const waiting = [];
  function load(fn) {
    if (ready) return fn && fn();
    if (fn) waiting.push(fn);
    if (img || !DATA()) return;
    img = new Image(); img.decoding = "async";
    img.onload = () => { ready = true; waiting.splice(0).forEach(f => f()); };
    img.src = DATA().atlas;
  }

  /* el puntero, para seguirlo por el suelo (raton; con mando, la mira) */
  const PT = { x: -1e4, y: -1e4, at: 0, in: false, h: [] };
  addEventListener("pointermove", e => {
    const now = performance.now(); if (Math.abs(e.clientX - PT.x) + Math.abs(e.clientY - PT.y) > 2) PT.at = now;
    PT.h.push([now, e.clientX, e.clientY]); while (PT.h.length > 2 && now - PT.h[0][0] > 160) PT.h.shift();   // v0.3.202: el rastro de los ultimos 160 ms (para su velocidad)
    PT.x = e.clientX; PT.y = e.clientY; PT.in = true;
  }, { passive: true });
  /* lo deprisa que va el raton (px por ms), medido en el rastro de los ultimos 160 ms (un solo evento suelto no cuenta) */
  const ptV = () => { const H = PT.h; if (H.length < 2) return 0; const span = H[H.length - 1][0] - H[0][0]; if (span < 40) return 0; let d = 0; for (let i = 1; i < H.length; i++) d += Math.hypot(H[i][1] - H[i - 1][1], H[i][2] - H[i - 1][2]); return performance.now() - H[H.length - 1][0] > 200 ? 0 : d / span; };
  document.addEventListener("pointerleave", () => { PT.in = false; });
  /* con mando no hay raton: persigue la seleccion (el boton enfocado) */
  document.addEventListener("focusin", e => {
    const g = document.documentElement.dataset.glyph; if (!g || g === "kb" || !e.target || !e.target.getBoundingClientRect) return;
    const r = e.target.getBoundingClientRect(); if (r.width < 2) return; PT.x = r.left + r.width / 2; PT.y = r.top + r.height / 2; PT.at = performance.now(); PT.in = true;
  });

  let C = null;                                     // el gato en pantalla (uno solo)
  let DARK = false;                                 // el apagon (js/trastadas.js): silueta con los ojos encendidos
  const EYES = {};                                  // los pixeles amarillos de los ojos de cada fotograma (para el apagon)
  function eyes(name) {
    if (EYES[name]) return EYES[name];
    const r = DATA().r[name], c = document.createElement("canvas"); c.width = r[2]; c.height = r[3]; const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]); const a = x.getImageData(0, 0, r[2], r[3]).data, out = [];
    for (let i = 0; i < a.length; i += 4) if (a[i + 3] && a[i] > 230 && a[i + 1] > 150 && a[i + 2] < 90) out.push([(i / 4) % r[2], Math.floor(i / 4 / r[2])]);
    return (EYES[name] = out);
  }
  class Cat {
    constructor(o) {
      this.o = o; this.host = o.host;
      this.cv = document.createElement("canvas"); this.cv.className = "cm-cv"; this.cv.setAttribute("aria-hidden", "true");
      this.ctx = this.cv.getContext("2d"); this.host.appendChild(this.cv);
      /* lo que se puede tocar es SU CUERPO (la caja del dibujo), no el lienzo entero: el lienzo lleva margen transparente y, a su tamano, tapaba
         botones de debajo (el «Salir» de la salida en la v0.3.187: el clic iba al gato y no te dejaba irte) */
      this.hit = document.createElement("i"); this.hit.className = "cm-hit"; this.hit.setAttribute("aria-hidden", "true"); this.host.appendChild(this.hit);
      this.x = o.x != null ? o.x : 0; this.dir = o.dir || 1; this.st = o.mode === "sleep" || o.mode === "bar" ? "sleep" : "sit";
      this.anim = null; this.k = 0; this.key = ""; this.clicks = []; this.espT = performance.now() + rnd(5000, 9000); this.dead = false; this.born = performance.now();
      this.hop = null; this.clipY = null; this.blink = false; this.blinkT = 0;
      this.hit.addEventListener("pointerdown", e => { e.stopPropagation(); this.pet(); });
      this.hit.addEventListener("pointermove", e => this.roza(e));        // v0.3.202: dormido, se le acaricia pasando el raton despacio por encima
      if (this.st === "sleep") this.play("duerme", { hold: true, at: 1e9 });
      load(() => { this.fit(); this.tick(); });
    }
    get mode() { return this.o.mode || "still"; }
    /* escala entera: la del crupier de la pantalla (k = pixeles reales por pixel de arte) */
    fit() {
      if (this.dead || !ready) return;
      const k = Math.max(1, Math.round((this.o.k && this.o.k()) || 3)), d = DATA();
      if (k !== this.k) { this.k = k; this.cv.width = d.W * k; this.cv.height = d.H * k; this.ctx = this.cv.getContext("2d"); this.ctx.imageSmoothingEnabled = false; this.key = ""; }
      this.place();
    }
    /* coloca el lienzo: el centro del gato en x, sus patas en el suelo, todo a pixel real entero */
    place() {
      const d = DATA(), dpr = window.devicePixelRatio || 1, k = this.k, per = 1 / dpr, s = this.cv.style;
      const cx = (d.box[0] + d.box[2]) / 2;
      s.width = d.W * k * per + "px"; s.height = d.H * k * per + "px";
      const lx = Math.round(this.x * dpr - (this.dir < 0 ? (d.W - cx) : cx) * k), by = Math.round((this.o.floor || 0) * dpr - (d.H - d.floor) * k);
      s.left = lx * per + "px"; s.bottom = by * per + "px"; s.transform = this.dir < 0 ? "scaleX(-1)" : "";
      const b = d.box, hs = this.hit.style, bx = this.dir < 0 ? d.W - b[2] : b[0];   // la caja del cuerpo, en espejo si mira a la izquierda
      hs.left = (lx + bx * k) * per + "px"; hs.width = (b[2] - b[0]) * k * per + "px"; hs.bottom = (by + (d.H - b[3]) * k) * per + "px"; hs.height = (b[3] - b[1]) * k * per + "px";
      if (this.clipY != null) {                                                        // sube desde detras de algo: lo que queda por debajo de esa linea no se ve
        const hb = this.host.getBoundingClientRect().bottom, cut = Math.max(0, Math.round((hb - by * per - this.clipY) * dpr) / dpr);
        s.clipPath = cut > 0 ? `inset(0 0 ${cut}px 0)` : ""; hs.visibility = cut > (d.H - b[1]) * k * per * 0.6 ? "hidden" : "";
      } else if (s.clipPath) { s.clipPath = ""; hs.visibility = ""; }
    }
    /* el salto a otra superficie: agachado en el origen (fotogramas 0-1), en el aire (2-4) y aterrizando en el destino (5-7) */
    hopPlace(now) {
      const h = this.hop, a = this.anim; if (!h || !a || a.name !== "salta") return;
      const sub = Math.max(0, Math.min(1, (now - a.t) / FMS)), p = a.i < 2 ? 0 : a.i >= 5 ? 1 : Math.min(1, (a.i - 2 + sub) / 3);
      const e = p * p * (3 - 2 * p);                                                   // sale despacio, va rapido, llega despacio
      this.x = h.x0 + (h.x1 - h.x0) * e; this.o.floor = h.f0 + (h.f1 - h.f0) * e + h.lift * 4 * p * (1 - p);
      this.place();
    }
    hopTo(x, floor, o = {}) {
      const dpr = window.devicePixelRatio || 1, f0 = this.o.floor || 0;
      const done = () => { this.hop = null; this.x = x; this.o.floor = floor; if (!o.keepClip) this.clipY = null; this.place(); this.st = "sit"; this.anim = null; this.key = ""; this.poke(); if (o.after) o.after(); };
      this.target = null; this.walkDone = null;
      if (o.clipY != null) this.clipY = o.clipY;
      if (reduced()) { done(); return; }                                                // Movimiento en Minimo: aparece ya en su sitio
      this.st = "busy"; if (Math.abs(x - this.x) > 1) this.dir = x > this.x ? 1 : -1;
      this.hop = { x0: this.x, f0, x1: x, f1: floor, lift: o.lift != null ? o.lift : Math.max(0, floor - f0) * 0.18 + 8 * this.k / dpr };
      this.play("salta", { after: done });
    }
    frameName(now) {
      const a = this.anim; if (!a) return "base";
      return a.f[Math.min(a.f.length - 1, a.i)];
    }
    play(name, o = {}) {
      const d = DATA(); const an = d && d.anim[name]; if (!an) { if (o.after) setTimeout(o.after, 0); return; }
      const f = o.rev ? an.f.slice().reverse() : an.f.slice();
      this.anim = { name, f, i: o.at === 1e9 ? f.length - 1 : 0, t: performance.now(), hold: !!o.hold, loop: !!o.loop, after: o.after || null };
      this.poke();
    }
    stop() { this.anim = null; this.poke(); }
    /* le acaricias: ronronea y se deja; tres veces seguidas en 2,6 s, bufido y zarpazo. Dormido: se despierta */
    pet() {
      const now = performance.now(); this.clicks = this.clicks.filter(t => now - t < 2600); this.clicks.push(now);
      const cb = this.o.onPet || (() => {});
      if (this.st === "sleep") { this.st = "busy"; this.play("duerme", { rev: true, after: () => { this.st = "sit"; this.anim = null; } }); cb("despierta"); return; }
      if (this.st === "walk") { this.st = "sit"; this.anim = null; }
      if (this.anim && this.anim.name !== "espera") return;
      this.st = "busy";
      if (this.clicks.length >= 3) { this.clicks = []; this.play("zarpa", { after: () => { this.st = "sit"; this.anim = null; } }); A.sfx && A.sfx.hiss && A.sfx.hiss(); cb("bufido"); }
      else { this.play("caricia", { after: () => { this.st = "sit"; this.anim = null; } }); A.sfx && A.sfx.purr && A.sfx.purr(); cb("caricia"); }
    }
    /* v0.3.202 (Bloque F, paso 5): ACARICIARLE DORMIDO. Pasar el raton despacio por encima (no un clic) es una caricia: ronronea y se estira un
       poco sin despertarse (los ultimos fotogramas de dormirse, ida y vuelta). Si insistes (seis pasadas en 10 s: cada ida o vuelta es una) se despierta y se lo dice a su
       pantalla (onPet «harto»: en la portada se va de un salto). Deprisa no cuenta */
    roza(e) {
      if (this.st !== "sleep" || this.hop) return;
      const now = performance.now(), R = this.rz || (this.rz = { x: e.clientX, y: e.clientY, t: now, len: 0, n: [], purr: 0, at: 0 });
      const dt = now - R.t, d = Math.hypot(e.clientX - R.x, e.clientY - R.y); R.x = e.clientX; R.y = e.clientY; R.t = now;
      if (dt > 400 || ptV() > 0.9) { R.len = 0; return; }                              // se ha parado o va deprisa: empieza otra pasada
      R.len += d; const w = this.hit.getBoundingClientRect().width || 120;
      if (R.len < w * 0.7 || now - R.at < 900) return;                                   // una caricia = una pasada (casi todo el lomo), y otra no antes de ~1 s
      R.len = 0; R.at = now; R.n = R.n.filter(t => now - t < 10000); R.n.push(now);
      if (R.n.length >= 6) { R.n = []; this.pet(); if (this.o.onPet) this.o.onPet("harto"); return; }   // la sexta seguida (tres idas y vueltas): hasta aqui
      if (now - R.purr > 2400) { R.purr = now; if (A.juguete) A.juguete("ronroneo", { x: e.clientX, db: 2 }); }
      const an = DATA().anim.duerme.f; if (reduced()) return;
      this.anim = { name: "duerme", f: [an[7], an[6], an[5], an[5], an[6], an[7]], i: 0, t: now, hold: true, loop: false, after: null }; this.poke();
    }
    walkTo(x, done) {
      if (reduced()) { this.x = x; this.place(); if (done) done(); return; }
      this.target = x; this.walkDone = done || null; this.dir = x >= this.x ? 1 : -1; this.st = "busy";
      this.play("levanta", { after: () => { this.st = "walk"; this.play("anda", { loop: true }); } });
    }
    /* lo que hace solo, segun su modo */
    think(now, dt) {
      if (this.hop) { this.hopPlace(now); return; }
      if (reduced() || this.st === "busy") return;
      const idle = now - Math.max(PT.at, this.born), r = this.host.getBoundingClientRect(), px = PT.x - r.left, near = PT.in && Math.abs(px - this.x) < 70 * (this.k / (devicePixelRatio || 1)) && PT.y > r.bottom - (this.o.floor || 0) - 150;
      if (this.st === "walk") {
        const lo = this.o.min != null ? this.o.min : 0, hi = this.o.max != null ? this.o.max : r.width;
        const tx = this.target != null ? this.target : Math.max(lo, Math.min(hi, PT.in ? px : this.x));
        const dx = tx - this.x, step = SPEED * (this.k / (devicePixelRatio || 1)) * dt;
        if (dx) this.dir = dx > 0 ? 1 : -1;
        this.x += Math.sign(dx) * Math.min(Math.abs(dx), step); this.place();
        if (Math.abs(tx - this.x) < 2) { this.target = null; this.st = "busy"; const fin = this.walkDone; this.walkDone = null; this.play("levanta", { rev: true, after: () => { this.st = "sit"; this.anim = null; if (fin) fin(); } }); }
        return;
      }
      if (this.mode !== "follow") {
        if (this.st === "sit" && !this.anim && now > this.espT) { this.espT = now + rnd(6000, 11000); this.play("espera"); }
        return;
      }
      if (this.st === "sleep") { if (PT.in && idle < 400 && near && ptV() > 0.9 && !(this.rz && now - this.rz.t < 900)) { this.st = "busy"; this.play("duerme", { rev: true, after: () => { this.st = "sit"; this.anim = null; } }); } return; }   // v0.3.202: despacio no le despierta (te acercas a acariciarle)
      if (this.st !== "sit" || this.anim && this.anim.name !== "espera") return;
      if (idle > 9000) { this.st = "sleep"; this.play("duerme", { hold: true }); if (this.o.onPet) this.o.onPet("duerme"); return; }
      const lo = this.o.min != null ? this.o.min : 0, hi = this.o.max != null ? this.o.max : r.width, tx = Math.max(lo, Math.min(hi, px));
      if (PT.in && Math.abs(tx - this.x) > 24 * (this.k / (devicePixelRatio || 1)) && !this.anim) { this.st = "busy"; this.dir = tx > this.x ? 1 : -1; this.play("levanta", { after: () => { this.st = "walk"; this.play("anda", { loop: true }); } }); return; }
      if (near && idle > 1600 && idle < 1750 && !this.anim) { this.st = "busy"; this.play("salta", { after: () => { this.st = "sit"; this.anim = null; } }); return; }
      if (!this.anim && now > this.espT) { this.espT = now + rnd(5000, 9000); this.play("espera"); }
    }
    step(now) {
      const a = this.anim; if (!a) return;
      while (now - a.t >= FMS) {
        a.t += FMS; a.i++;
        if (a.i >= a.f.length) {
          if (a.hold) { a.i = a.f.length - 1; a.t = now; break; }
          if (a.loop) { a.i = 0; continue; }
          this.anim = null; const f = a.after; if (f) f(); return;
        }
      }
    }
    draw(force) {
      if (this.dead || !ready || !this.k) return;
      const name = this.frameName(), key = name + "|" + this.k + "|" + (DARK ? DARK : 0) + "|" + (this.blink ? 1 : 0);
      if (!force && key === this.key) return; this.key = key;
      const d = DATA(), r = d.r[name], k = this.k, c = this.ctx; if (!r) return;
      c.clearRect(0, 0, this.cv.width, this.cv.height);
      if (DARK === "ojos") {                                                          // apagon total: solo sus ojos (y parpadea)
        if (!this.blink) { c.fillStyle = "#fdd742"; for (const [x, y] of eyes(name)) c.fillRect((r[4] + x) * k, (r[5] + y) * k, k, k); }
        return;
      }
      c.drawImage(img, r[0], r[1], r[2], r[3], r[4] * k, r[5] * k, r[2] * k, r[3] * k);
      if (DARK) {                                                                      // el apagon: silueta de tinta y solo los ojos encendidos
        c.globalCompositeOperation = "source-atop"; c.fillStyle = "#01003f"; c.fillRect(0, 0, this.cv.width, this.cv.height); c.globalCompositeOperation = "source-over";
        c.fillStyle = "#fdd742"; for (const [x, y] of eyes(name)) c.fillRect((r[4] + x) * k, (r[5] + y) * k, k, k);
      }
    }
    tick() {
      if (this.dead) return; clearTimeout(this.timer);
      const now = performance.now(), dt = Math.min(0.1, (now - (this.last || now)) / 1000); this.last = now;
      if (DARK === "ojos" && now > this.blinkT) { this.blink = !this.blink; this.blinkT = now + (this.blink ? 140 : rnd(1500, 2600)); }
      if (this.host.isConnected) { this.think(now, dt); this.step(now); if (this.hop) this.hopPlace(now); this.draw(); }
      const fast = this.st === "walk" || this.anim || DARK === "ojos";
      this.timer = setTimeout(() => this.tick(), this.hop ? 16 : fast ? (this.st === "walk" ? 33 : 55) : 120);
    }
    poke() { if (!this.dead) { clearTimeout(this.timer); this.timer = setTimeout(() => this.tick(), 0); } }
    destroy() { this.dead = true; clearTimeout(this.timer); this.cv.remove(); this.hit.remove(); }
  }
  addEventListener("resize", () => { if (C) C.fit(); });

  A.comodin = {
    show(o) {
      if (!DATA() || !o || !o.host) return null;
      if (C && C.host === o.host) { Object.assign(C.o, o); if (o.x != null) C.x = o.x; if (C.o.min != null && C.o.max != null && C.st !== "walk") C.x = Math.max(C.o.min, Math.min(C.o.max, C.x)); if (o.mode === "sleep" || o.mode === "bar") { C.st = "sleep"; C.play("duerme", { hold: true, at: 1e9 }); } C.fit(); return C; }
      if (C) C.destroy();
      C = new Cat(o); return C;
    },
    hide() { if (C) { C.destroy(); C = null; } },
    on: () => !!C && !C.dead,
    el: () => (C ? C.cv : null),
    busy: () => !!C && (C.st === "busy" || C.st === "walk"),
    rect: () => (C ? C.cv.getBoundingClientRect() : null),
    body: () => (C ? C.hit.getBoundingClientRect() : null),               // su cuerpo (lo que se toca), sin el margen del lienzo
    play: (n, o) => { if (C) C.play(n, o); },
    walkTo: (x, fin) => { if (C) C.walkTo(x, fin); else if (fin) fin(); },
    hopTo: (x, floor, o) => { if (C) C.hopTo(x, floor, o); else if (o && o.after) o.after(); },
    clip: y => { if (C) { C.clipY = y == null ? null : y; C.place(); } },
    pos: () => (C ? { x: C.x, floor: C.o.floor || 0, dir: C.dir } : null),
    pet: () => { if (C) C.pet(); },
    state: () => (C ? C.st : null),
    dark: (on, modo) => { DARK = on ? (modo === "ojos" ? "ojos" : true) : false; if (C) { C.blink = false; C.blinkT = performance.now() + 900; C.key = ""; C.poke(); } },
    /* la mesa del crupier: lo que haga el gato ahora */
    act(n) {
      if (!C) return false;
      if (n === "despierta") { if (C.st === "sleep") C.pet(); return true; }
      if (n === "duerme") { C.st = "sleep"; C.play("duerme", { hold: true }); return true; }
      if (n === "anda") { const r = C.host.getBoundingClientRect(); C.walkTo(Math.max(C.o.min || 30, Math.min((C.o.max || r.width) - 30, C.x + (Math.random() < 0.5 ? -1 : 1) * r.width * 0.25))); return true; }
      if (n === "caricia" || n === "zarpa") { if (n === "zarpa") C.clicks = [0, 0].map(() => performance.now()); C.pet(); return true; }
      C.st = "busy"; C.play(n, { after: () => { C.st = "sit"; C.anim = null; } }); return true;
    },
    load,
  };
})(window.AIQ);
