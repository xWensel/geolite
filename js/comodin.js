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
  const PT = { x: -1e4, y: -1e4, at: 0, in: false };
  addEventListener("pointermove", e => { if (Math.abs(e.clientX - PT.x) + Math.abs(e.clientY - PT.y) > 2) PT.at = performance.now(); PT.x = e.clientX; PT.y = e.clientY; PT.in = true; }, { passive: true });
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
      this.x = o.x != null ? o.x : 0; this.dir = o.dir || 1; this.st = o.mode === "sleep" || o.mode === "bar" ? "sleep" : "sit";
      this.anim = null; this.k = 0; this.key = ""; this.clicks = []; this.espT = performance.now() + rnd(5000, 9000); this.dead = false; this.born = performance.now();
      this.cv.addEventListener("pointerdown", e => { e.stopPropagation(); this.pet(); });
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
    walkTo(x, done) {
      if (reduced()) { this.x = x; this.place(); if (done) done(); return; }
      this.target = x; this.walkDone = done || null; this.dir = x >= this.x ? 1 : -1; this.st = "busy";
      this.play("levanta", { after: () => { this.st = "walk"; this.play("anda", { loop: true }); } });
    }
    /* lo que hace solo, segun su modo */
    think(now, dt) {
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
      if (this.st === "sleep") { if (PT.in && idle < 400 && near) { this.st = "busy"; this.play("duerme", { rev: true, after: () => { this.st = "sit"; this.anim = null; } }); } return; }
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
      const name = this.frameName(), key = name + "|" + this.k + "|" + (DARK ? 1 : 0);
      if (!force && key === this.key) return; this.key = key;
      const d = DATA(), r = d.r[name], k = this.k, c = this.ctx; if (!r) return;
      c.clearRect(0, 0, this.cv.width, this.cv.height);
      c.drawImage(img, r[0], r[1], r[2], r[3], r[4] * k, r[5] * k, r[2] * k, r[3] * k);
      if (DARK) {                                                                      // el apagon: silueta de tinta y solo los ojos encendidos
        c.globalCompositeOperation = "source-atop"; c.fillStyle = "#01003f"; c.fillRect(0, 0, this.cv.width, this.cv.height); c.globalCompositeOperation = "source-over";
        c.fillStyle = "#fdd742"; for (const [x, y] of eyes(name)) c.fillRect((r[4] + x) * k, (r[5] + y) * k, k, k);
      }
    }
    tick() {
      if (this.dead) return; clearTimeout(this.timer);
      const now = performance.now(), dt = Math.min(0.1, (now - (this.last || now)) / 1000); this.last = now;
      if (this.host.isConnected) { this.think(now, dt); this.step(now); this.draw(); }
      const fast = this.st === "walk" || this.anim;
      this.timer = setTimeout(() => this.tick(), fast ? (this.st === "walk" ? 33 : 55) : 120);
    }
    poke() { if (!this.dead) { clearTimeout(this.timer); this.timer = setTimeout(() => this.tick(), 0); } }
    destroy() { this.dead = true; clearTimeout(this.timer); this.cv.remove(); }
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
    play: (n, o) => { if (C) C.play(n, o); },
    walkTo: (x, fin) => { if (C) C.walkTo(x, fin); else if (fin) fin(); },
    pet: () => { if (C) C.pet(); },
    state: () => (C ? C.st : null),
    dark: on => { DARK = !!on; if (C) { C.key = ""; C.poke(); } },
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
