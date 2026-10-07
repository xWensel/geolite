/*
 * Geolite - visor del mapa 2D (RESPALDO para equipos sin WebGL2).
 *
 *  Capas (canvas apilados):
 *    #map  base     oceano + retícula + TEXTURAS pre-generadas (resplandor y tierra) + capa nítida
 *    #hl   resalte  pais resaltado (solo se redibuja al cambiar camara o preguntas)
 *    #fx   efectos  chinchetas, línea, etiquetas y cursor de precisión
 *
 *  Por que es rapido:
 *    - El coste de dibujar ~100.000 puntos de frontera con trazos gruesos era ~700 ms/frame. Ahora el mundo se
 *      dibuja UNA vez en dos texturas (tierra y resplandor) y cada frame solo son 2-3 llamadas drawImage.
 *    - Al hacer mucho zoom (más allá de la resolución de la textura) se genera una capa vectorial nítida, recortada
 *      a lo visible, cuando la cámara se detiene (~100 ms). Mientras se mueve, se reutiliza lo ya dibujado.
 *    - Todo sigue siendo vectorial en origen: se ve nítido a cualquier zoom y densidad de pixeles.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  A.mapSens = A.mapSens || { pan: 1, zoom: 1 };     // multiplicador en vivo: lo muta Ajustes, lo leen ambos motores de mapa (este y map.js)
  const { project, unproject, D2R } = A.geo;
  const BX0 = -Math.PI, BX1 = Math.PI, BY0 = -1.5, BY1 = 2.1;      // limites del mundo (Miller)

  const INK = "#14232b", PAPER = "#f2e9d6", RED = "#e0492b", BRASS = "#c8963e";
  const OCEAN_TOP = "#12414f", OCEAN_BOT = "#092632";
  const SHORE = "120,205,205";

  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutBounce = t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  };
  const fmtCoord = (v, pos, neg) => Math.abs(v).toFixed(2) + "°" + (v >= 0 ? pos : neg);
  /* las fuentes pixel del juego (como map.js): Fraunces y DM Mono ya no vienen en fonts/ y caian a Georgia, sin pixel */
  /* se leen del CSS solo cuando cambia el idioma o el tema (en cada fotograma forzaban un recalculo de estilos) */
  let fk = "", fc = {};
  const font = (v, def) => { const h = document.documentElement, key = h.lang + "|" + h.dataset.skin; if (fk !== key) { fk = key; fc = {}; } return fc[v] || (fc[v] = getComputedStyle(h).getPropertyValue(v) || def); };
  const FD = () => font("--serif", "'Jersey 15', sans-serif");
  const FM = () => font("--mono", "Silkscreen, monospace");
  /* poner la letra del lienzo recalcula los estilos de la pagina (aunque sea la misma): solo si cambia (como en map.js) */
  const fser = new Map(); if (document.fonts) document.fonts.addEventListener("loadingdone", () => fser.clear());
  const setFont = (c, f) => { const s = fser.get(f); if (s !== undefined && c.font === s) return; c.font = f; fser.set(f, c.font); };

  class MapView2D {
    constructor(canvas, world, onPick) {
      this.cv = canvas; this.ctx = canvas.getContext("2d");
      this.hl = document.createElement("canvas"); this.hl.id = "hl"; canvas.after(this.hl); this.hctx = this.hl.getContext("2d");
      this.fx = document.createElement("canvas"); this.fx.id = "fx"; this.hl.after(this.fx); this.fctx = this.fx.getContext("2d");
      this.world = world; this.onPick = onPick || (() => {}); this.onView = null;
      this.view = { cx: 0, cy: 0.3, s: 100 };
      this.homeSpec = { lat: 0, lon: 0, zoom: 1 };
      this.anim = null; this.drift = null;
      this.marks = this._emptyMarks();
      this.pickEnabled = false; this.mouse = null;
      this.quality = "auto"; this.rs = 1; this.frameEma = 0; this.baseDt = 1e9; this.lastT = 0; this.calm = 0; this.sharp = null; this.sharpStale = false; this.lastMove = 0;
      this.dirty = this.fxDirty = this.hlDirty = true;
      this.pointers = new Map();
      this._bind(); this.resize(true);

      const p = mk(20, 20), pc = p.getContext("2d"); pc.strokeStyle = "rgba(224,73,43,.85)"; pc.lineWidth = 3;
      pc.beginPath(); pc.moveTo(-2, 22); pc.lineTo(22, -2); pc.moveTo(-12, 12); pc.lineTo(12, -12); pc.moveTo(8, 32); pc.lineTo(32, 8); pc.stroke();
      this.hatch = this.hctx.createPattern(p, "repeat");
      if (document.fonts) document.fonts.ready.then(() => { this.dirty = this.fxDirty = true; });
      let errN = 0; const loop = t => { try { this._frame(t); } catch (e) { if (errN++ < 5) console.error("Mapa 2D:", e); } requestAnimationFrame(loop); };   // como el WebGL: una excepcion suelta no congela el mapa
      requestAnimationFrame(loop);
    }
    setDecoys(list) { this.decoys = list || []; this.fxDirty = true; }   // los senuelos solo se pintan en el mapa WebGL; aqui basta con guardarlos
    _emptyMarks() { return { guess: null, answer: null, highlight: null, label: null, labelAt: null, dist: "", pop: null, t0: 0 }; }
    setMarks(m) { this.marks = { ...this._emptyMarks(), ...m, t0: performance.now() }; this.fxDirty = this.hlDirty = true; }
    clearMarks() { this.marks = this._emptyMarks(); this.probes = []; this.fxDirty = this.hlDirty = true; }
    setPaint() { /* sin WebGL la Enciclopedia no tine paises (el mapa sigue igual) */ }
    setHighlight(name) { this.marks = { ...this.marks, highlight: name || null }; this.fxDirty = this.hlDirty = true; }
    setPick(on) { this.pickEnabled = on; this.fxDirty = true; for (const c of [this.cv, this.fx]) c.classList.toggle("aiming", on); }
    setQuality(q) { this.quality = q; this.resize(true); }
    setStyle() {}
    setAnchor() {}
    static supported() { return true; }

    /* ---------- tamano / camara ---------- */
    resize(force) {
      const r = this.cv.getBoundingClientRect();
      const raw = window.devicePixelRatio || 1;
      this.dpr = this.quality === "saver" ? 1 : Math.min(2.5, raw);
      if (r.width < 2 || r.height < 2) return;                          // lienzo oculto o minimizado
      const W = Math.max(1, r.width), H = Math.max(1, r.height);
      const sizeChanged = force || Math.abs(W - (this.W || 0)) > 0.5 || Math.abs(H - (this.H || 0)) > 0.5;
      this.W = W; this.H = H;
      if (sizeChanged) {
        for (const c of [this.hl, this.fx]) { c.width = Math.round(W * this.dpr); c.height = Math.round(H * this.dpr); }
        this.cv.width = Math.round(W * this.dpr * this.rs); this.cv.height = Math.round(H * this.dpr * this.rs);
      }
      const oldMin = this.minS;
      this.minS = Math.max(W / (BX1 - BX0), H / (BY1 - BY0));
      this.maxS = this.minS * 120;
      if (oldMin && Math.abs(this.minS - oldMin) > 1e-6) { const k = this.minS / oldMin; this.view.s *= k; if (this.tv) this.tv.s *= k; if (this.anim) { this.anim.from.s *= k; this.anim.to.s *= k; } if (this.drift) this.drift.base.s *= k; }   // se conserva el nivel de zoom al cambiar el tamano
      this.view.s = clamp(this.view.s, this.minS, this.maxS);
      this._clamp(this.view);
      this.sharp = null;
      // texturas: se regeneran solo si la resolucion necesaria cambia mucho
      const want = this.quality === "saver" ? 2048 : clamp(Math.round(W * this.dpr * 2), 2048, 3072);
      if (force || !this.texW || want > this.texW * 1.25 || want < this.texW * 0.6) {
        clearTimeout(this._texT);
        if (!this.texW || force) this._buildTextures(want); else this._texT = setTimeout(() => { this._buildTextures(want); this.dirty = true; }, 250);
      }
      this.dirty = this.fxDirty = this.hlDirty = true;
    }
    _clamp(v) {
      const hw = this.W / (2 * v.s), hh = this.H / (2 * v.s);
      v.cx = hw * 2 >= BX1 - BX0 ? 0 : clamp(v.cx, BX0 + hw, BX1 - hw);
      v.cy = hh * 2 >= BY1 - BY0 ? (BY0 + BY1) / 2 : clamp(v.cy, BY0 + hh, BY1 - hh);
      return v;
    }

    /* ---------- texturas del mundo (se dibujan una sola vez) ---------- */
    _buildTextures(texW) {
      const t0 = performance.now();
      this.texW = texW; this.texSc = texW / (BX1 - BX0); const sc = this.texSc;
      const texH = Math.round((BY1 - BY0) * sc);
      // tierra + fronteras
      const land = mk(texW, texH), lc = land.getContext("2d");
      lc.setTransform(sc, 0, 0, -sc, -BX0 * sc, BY1 * sc); lc.lineJoin = "round"; lc.lineCap = "round";
      for (const f of this.world.features) { lc.fillStyle = f.color; lc.fill(f.path); }
      lc.strokeStyle = "rgba(38,52,58,.45)"; lc.lineWidth = 1.15 / sc; lc.stroke(this.world.all);
      // resplandor de costas: silueta desenfocada, dibujado bajo la tierra (una sola vez)
      let combo = land;
      if (this.quality !== "saver") {
        const half = mk(texW / 2, texH / 2), hc = half.getContext("2d");
        hc.setTransform(sc / 2, 0, 0, -sc / 2, (-BX0 * sc) / 2, (BY1 * sc) / 2); hc.fillStyle = "#fff"; hc.fill(this.world.all);
        const glow = mk(texW, texH), gc = glow.getContext("2d");
        if ("filter" in gc) {
          for (const [blur, a] of [[30, 0.5], [14, 0.6], [5, 0.7]]) { gc.filter = `blur(${blur}px)`; gc.globalAlpha = a; gc.drawImage(half, 0, 0, texW, texH); }
          gc.filter = "none"; gc.globalAlpha = 1; gc.globalCompositeOperation = "source-in"; gc.fillStyle = `rgb(${SHORE})`; gc.fillRect(0, 0, texW, texH);
          gc.globalCompositeOperation = "source-over"; gc.globalAlpha = 0.9; gc.drawImage(land, 0, 0);
          combo = glow;
        }
      }
      this.landTex = land; this.comboTex = combo; this.texMs = Math.round(performance.now() - t0);
    }

    setHome(spec) { this.homeSpec = { lat: spec.lat, lon: spec.lon, zoom: spec.zoom || 1 }; }
    home() {
      const h = this.homeSpec;
      if (h.zoom <= 1.001 && h.lat === 0 && h.lon === 0) return { cx: 0, cy: 0.35, s: this.minS };
      const [x, y] = project(h.lon, h.lat);
      return { cx: x, cy: y, s: this.minS * h.zoom };
    }
    animateTo(target, ms = 800) {
      const t = this._clamp({ ...target, s: clamp(target.s, this.minS, this.maxS) });
      clearTimeout(this._dT); this.drift = null;
      if (ms <= 0) { this.view = t; this.anim = null; this.dirty = this.fxDirty = this.hlDirty = true; return; }
      const from = { ...this.view };
      const far = Math.min(1, Math.hypot(t.cx - from.cx, t.cy - from.cy) * Math.min(from.s, t.s) / Math.max(this.W, this.H));
      this.anim = { from, to: t, t0: performance.now(), ms, dip: 0.55 * far };
    }
    fitPoints(pts, pad = { l: 60, r: 60, t: 160, b: 120 }, ms = 900) {
      const ps = pts.map(([lo, la]) => project(lo, la));
      let x0 = Math.min(...ps.map(p => p[0])), x1 = Math.max(...ps.map(p => p[0]));
      let y0 = Math.min(...ps.map(p => p[1])), y1 = Math.max(...ps.map(p => p[1]));
      const MIN_SPAN = 0.3;
      if (x1 - x0 < MIN_SPAN) { const m = (x0 + x1) / 2; x0 = m - MIN_SPAN / 2; x1 = m + MIN_SPAN / 2; }
      if (y1 - y0 < MIN_SPAN) { const m = (y0 + y1) / 2; y0 = m - MIN_SPAN / 2; y1 = m + MIN_SPAN / 2; }
      const aw = this.W - pad.l - pad.r, ah = this.H - pad.t - pad.b;
      const s = clamp(Math.min(aw / (x1 - x0), ah / (y1 - y0)), this.minS, this.maxS);
      this.animateTo({ cx: (x0 + x1) / 2 - (pad.l - pad.r) / (2 * s), cy: (y0 + y1) / 2 + (pad.t - pad.b) / (2 * s), s }, ms);
    }
    startDrift() {
      const v = this._clamp({ cx: 0.3, cy: 0.9, s: this.minS * 1.7 });
      this.animateTo(v, 1400); clearTimeout(this._dT); this._dT = setTimeout(() => { if (!this.anim && !this.pointers.size) this.drift = { base: { ...this.view }, t0: performance.now() }; }, 1500);
    }
    zoomBy(f, px = this.W / 2, py = this.H / 2, animate = true) {
      if (this.zzUntil && performance.now() < this.zzUntil) return;
      const v = this.anim ? this.anim.to : this.view;
      const [wx, wy] = this._toWorld(px, py, v);
      const s = clamp(v.s * f, this.minS, this.maxS);
      const t = { s, cx: wx - (px - this.W / 2) / s, cy: wy + (py - this.H / 2) / s };
      if (animate) this.animateTo(t, 260); else { this.drift = null; this.view = this._clamp(t); this.anim = null; this.dirty = this.fxDirty = this.hlDirty = true; }
    }
    nudge(dx, dy) { if (this.zzUntil && performance.now() < this.zzUntil) return; this.anim = null; this.drift = null; const v = this.view; v.cx += (dx * A.mapSens.pan) / v.s; v.cy -= (dy * A.mapSens.pan) / v.s; this._clamp(v); this.dirty = this.fxDirty = this.hlDirty = true; }   // mando (js/mando.js)
    tapAt(px, py) { this._tap(px, py); }
    _toWorld(px, py, v = this.view) { return [v.cx + (px - this.W / 2) / v.s, v.cy - (py - this.H / 2) / v.s]; }
    toScreen(x, y, v = this.view) { return [this.W / 2 + (x - v.cx) * v.s, this.H / 2 - (y - v.cy) * v.s]; }
    lonLatToScreen(lon, lat) { const [x, y] = project(lon, lat); return this.toScreen(x, y); }
    zoomLevel() { return this.view.s / this.minS; }

    /* ---------- interaccion ---------- */
    _bind() {
      const cv = this.cv; cv.style.touchAction = "none";
      cv.addEventListener("contextmenu", e => e.preventDefault());
      cv.addEventListener("pointerdown", e => {
        if (this.zzUntil && performance.now() < this.zzUntil) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;                   // solo el boton principal (el derecho marcaba respuesta al soltar)
        try { cv.setPointerCapture(e.pointerId); } catch (err) { return; } this.drift = null;   // un pointerdown del mando no tiene puntero real que capturar
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false });
        if (this.pointers.size === 2) this._pinch = this._pinchState();
      });
      cv.addEventListener("pointermove", e => {
        if (e.pointerType === "mouse") { const r = cv.getBoundingClientRect(); this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; this.fxDirty = true; }
        const p = this.pointers.get(e.pointerId); if (!p) return; if (e.pointerType === "mouse" && !(e.buttons & 1)) { up({ pointerId: e.pointerId, type: "pointercancel" }); return; }   // el boton ya no esta pulsado: el arrastre acabo fuera
        const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
        if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > (e.pointerType === "touch" ? 10 : 5)) p.moved = true;
        if (this.pointers.size === 1 && p.moved) {
          this.anim = null; this.view.cx -= (dx * A.mapSens.pan) / this.view.s; this.view.cy += (dy * A.mapSens.pan) / this.view.s;
          this._clamp(this.view); this.dirty = this.fxDirty = this.hlDirty = true; cv.classList.add("grabbing"); this.fx.classList.add("grabbing");
        } else if (this.pointers.size === 2) {
          const st = this._pinchState();
          if (this._pinch && this._pinch.d > 0) { this.anim = null; const r = cv.getBoundingClientRect(); this.zoomBy(st.d / this._pinch.d, st.mx - r.left, st.my - r.top, false); }
          this._pinch = st;
        }
      });
      cv.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { this.mouse = null; this.fxDirty = true; } });
      const up = e => {
        const p = this.pointers.get(e.pointerId); if (!p) return;
        this.pointers.delete(e.pointerId); cv.classList.remove("grabbing"); this.fx.classList.remove("grabbing");
        if (!p.moved && this.pointers.size === 0 && !this._wasPinch && e.type === "pointerup") {
          const r = cv.getBoundingClientRect(); this._tap(e.clientX - r.left, e.clientY - r.top);
        }
        this._wasPinch = this.pointers.size > 0; if (this.pointers.size === 0) this._wasPinch = false;
        this.sharpStale = true;
      };
      cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); cv.addEventListener("lostpointercapture", up);
      cv.addEventListener("wheel", e => {
        e.preventDefault(); const r = cv.getBoundingClientRect();
        this.zoomBy(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1) * (e.ctrlKey ? 0.01 : 0.0016) * A.mapSens.zoom), ...(A.pointer && A.pointer.zoomAt ? A.pointer.zoomAt(e.clientX - r.left, e.clientY - r.top) : [e.clientX - r.left, e.clientY - r.top]), false);
      }, { passive: false });
      new ResizeObserver(() => this.resize()).observe(cv);
    }
    _pinchState() { const [a, b] = [...this.pointers.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; }
    _tap(px, py) {
      if (!this.pickEnabled) return;
      if (this.zzUntil && performance.now() < this.zzUntil) return;
      const [x, y] = this._toWorld(px, py); const [lon, lat] = unproject(x, y);
      if (lon < -180 || lon > 180 || lat > 90 || lat < -90) return;
      this.onPick(lon, lat);
    }

    /* ---------- resolucion dinamica: si los frames se alargan al mover la camara, baja el detalle y lo restaura al parar ---------- */
    _setRS(k) {
      if (Math.abs(k - this.rs) < 0.01) return;
      this.rs = k; this.cv.width = Math.round(this.W * this.dpr * k); this.cv.height = Math.round(this.H * this.dpr * k); this.dirty = true;
    }
    _adapt(now) {
      const dt = now - this.lastT; this.lastT = now;
      if (dt <= 0 || dt > 250) return;
      const moving = !!(this.anim || this.drift || this.pointers.size);
      if (dt < this.baseDt) this.baseDt = dt;                                   // estimacion del refresco de la pantalla
      if (!moving) { if (this.rs < 1 && ++this.calm > 20) { this._setRS(1); this.calm = 0; } this.frameEma = this.baseDt; return; }
      this.calm = 0; this.frameEma = this.frameEma * 0.85 + dt * 0.15;
      if (this.quality !== "auto") return;
      const target = Math.max(this.baseDt * 1.35, this.baseDt + 1.5);
      if (this.frameEma > target && this.rs > 0.6) { this._setRS(Math.max(0.6, this.rs - 0.1)); this.frameEma = this.baseDt; }
    }

    /* ---------- bucle ---------- */
    _needSharp() { return this.view.s * this.dpr > this.texSc * 0.85; }
    setHold(on) { this.hold = !!on; this._holdN = 0; if (!on) this.dirty = this.fxDirty = this.hlDirty = true; }
    _frame(now) {
      if (this.hold) { this.lastT = now; if (!(this.holdCheck && ++this._holdN % 15 === 0 && !this.holdCheck())) return; }
      this._adapt(now);
      if (this.anim) {
        const a = this.anim, k = Math.min(1, (now - a.t0) / a.ms), e = easeIO(k);
        const dip = 1 - a.dip * Math.sin(Math.PI * e);
        this.view = {
          cx: a.from.cx + (a.to.cx - a.from.cx) * e, cy: a.from.cy + (a.to.cy - a.from.cy) * e,
          s: Math.max(this.minS, a.from.s * Math.pow(a.to.s / a.from.s, e) * dip),
        };
        if (k >= 1) this.anim = null;
        this.dirty = this.fxDirty = this.hlDirty = true;
      } else if (this.drift) {
        /* la deriva sale de donde se paro el mapa, sin salto (antes empezaba con cy desplazado sin(1) * 0,16 y el mapa se recolocaba de golpe
           1,5 s despues de abrir la portada) y arranca despacio: el reloj u acelera durante los primeros 4 s, asi la velocidad crece desde 0 */
        const t = (now - this.drift.t0) / 1000, u = t < 4 ? t * t / 8 : t - 2, b = this.drift.base;
        this.view = this._clamp({ cx: b.cx + Math.sin(u * 0.09) * 1.1, cy: b.cy + Math.sin(u * 0.07) * 0.16, s: clamp(b.s, this.minS, this.maxS) });
        this.dirty = this.fxDirty = this.hlDirty = true;
      }
      if (this.dirty) { this.lastMove = now; this.sharpStale = true; }
      const m = this.marks;
      if (m.guess || m.answer || (this.pickEnabled && this.mouse)) this.fxDirty = true;
      if (m.highlight && now - m.t0 < 700) this.hlDirty = true;

      // capa nitida: solo cuando la camara se detiene y el zoom supera la textura
      if (this.sharpStale && !this.anim && !this.drift && !this.pointers.size && now - this.lastMove > 100) {
        this.sharpStale = false;
        if (this._needSharp()) { this._renderSharp(); this.dirty = true; } else if (this.sharp) { this.sharp = null; this.dirty = true; }
      }
      if (this.dirty) { this.dirty = false; this._drawBase(); if (this.onView) this.onView(this.view); }
      if (this.hlDirty) { this.hlDirty = false; this._drawHl(now); }
      if (this.fxDirty) { this.fxDirty = false; this._drawFx(now); }
    }

    /* ---------- capa base ---------- */
    _grid(ctx) {
      const { W, H, view: v } = this;
      const pxDeg = (v.s * Math.PI) / 180;
      const step = [30, 15, 10, 5, 2, 1, 0.5, 0.25].find(s => s * pxDeg >= 84) || 0.25;
      ctx.lineWidth = 1; ctx.font = `500 10px ${FM()}`; ctx.textBaseline = "top";
      const [wx0, wyTop] = this._toWorld(0, 0), [wx1, wyBot] = this._toWorld(W, H);
      const lon0 = Math.max(-180, Math.floor(wx0 / D2R / step) * step), lon1 = Math.min(180, Math.ceil(wx1 / D2R / step) * step);
      const latTop = unproject(0, wyTop)[1], latBot = unproject(0, wyBot)[1];
      const lat0 = Math.max(-90, Math.floor(latBot / step) * step), lat1 = Math.min(90, Math.ceil(latTop / step) * step);
      // todas las lineas en un solo trazo por tipo (menos llamadas)
      const minor = new Path2D(), major = new Path2D(), labels = [];
      for (let lo = lon0; lo <= lon1 + 1e-9; lo += step) {
        const x = this.toScreen(lo * D2R, 0)[0], isMajor = Math.abs(lo % 30) < 1e-9;
        (isMajor ? major : minor).moveTo(x, 0); (isMajor ? major : minor).lineTo(x, H);
        if (isMajor || step < 30) labels.push([fmtCoord(lo, "E", "W").replace(".00", ""), x + 4, H - 16]);
      }
      for (let la = lat0; la <= lat1 + 1e-9; la += step) {
        const y = this.lonLatToScreen(0, la)[1], isMajor = Math.abs(la % 30) < 1e-9;
        (isMajor ? major : minor).moveTo(0, y); (isMajor ? major : minor).lineTo(W, y);
        if (isMajor || step < 30) labels.push([fmtCoord(la, "N", "S").replace(".00", ""), 8, y + 3]);
      }
      ctx.strokeStyle = "rgba(190,225,230,.09)"; ctx.stroke(minor);
      ctx.strokeStyle = "rgba(190,225,230,.20)"; ctx.stroke(major);
      ctx.fillStyle = "rgba(190,225,230,.55)"; for (const [t, x, y] of labels) ctx.fillText(t, x, y);
      ctx.setLineDash([3, 7]); ctx.strokeStyle = "rgba(255,214,140,.32)"; ctx.beginPath();
      for (const la of [0, 23.4366, -23.4366]) { const y = this.lonLatToScreen(0, la)[1]; ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke(); ctx.setLineDash([]);
    }

    _drawBase() {
      const { ctx, W, H, view: v } = this, dpr = this.dpr * this.rs;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);   // el oceano lo pinta el CSS (gratis para la GPU)
      this._grid(ctx);

      const s = v.s, dx = W / 2 + (BX0 - v.cx) * s, dy = H / 2 - (BY1 - v.cy) * s, dw = (BX1 - BX0) * s, dh = (BY1 - BY0) * s;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";

      // si la capa nitida cubre toda la pantalla, basta con ella (una sola pasada)
      const sh = this.sharp; let covered = false;
      if (sh) {
        const k = s / sh.v.s;
        if (k > 0.4 && k < 2.6) {
          const w = sh.w * k, h = sh.h * k, X = W / 2 + (sh.v.cx - v.cx) * s - w / 2, Y = H / 2 - (sh.v.cy - v.cy) * s - h / 2;
          covered = X <= 0 && Y <= 0 && X + w >= W && Y + h >= H;
          if (!covered) this._drawWorldTex(ctx, dx, dy, dw, dh, s);
          ctx.drawImage(sh.cv, X, Y, w, h);
        } else this._drawWorldTex(ctx, dx, dy, dw, dh, s);
      } else this._drawWorldTex(ctx, dx, dy, dw, dh, s);
    }

    /* textura del mundo: con resplandor de costas al alejar, sin el al acercar (lo da la capa nitida) */
    _drawWorldTex(ctx, dx, dy, dw, dh, s) {
      const ga = clamp(1 - (s / this.minS - 1.6) / 0.8, 0, 1);            // 1 = con resplandor · 0 = solo tierra
      if (ga >= 0.999 || this.comboTex === this.landTex) { ctx.drawImage(this.comboTex, dx, dy, dw, dh); return; }
      ctx.drawImage(this.landTex, dx, dy, dw, dh);
      if (ga > 0.01) { ctx.globalAlpha = ga; ctx.drawImage(this.comboTex, dx, dy, dw, dh); ctx.globalAlpha = 1; }
    }

    _renderSharp() {
      const { W, H, dpr } = this, v = { ...this.view }, s = v.s;
      const OV = clamp(4096 / (Math.max(W, H) * dpr), 1.12, 1.6);
      const cw = Math.round(W * OV * dpr), ch = Math.round(H * OV * dpr);
      if (!this._sharpCv || this._sharpCv.width !== cw || this._sharpCv.height !== ch) { this._sharpCv = mk(cw, ch); this._sharpCtx = this._sharpCv.getContext("2d"); }
      const c = this._sharpCtx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cw, ch);
      c.setTransform(s * dpr, 0, 0, -s * dpr, (cw / dpr / 2 - v.cx * s) * dpr, (ch / dpr / 2 + v.cy * s) * dpr);
      c.lineJoin = "round"; c.lineCap = "round";
      const hw = cw / dpr / (2 * s), hh = ch / dpr / (2 * s), x0 = v.cx - hw, x1 = v.cx + hw, y0 = v.cy - hh, y1 = v.cy + hh;
      const vis = this.world.features.filter(f => f.wrap || (f.px1 >= x0 && f.px0 <= x1 && f.py1 >= y0 && f.py0 <= y1));
      for (const [w, a] of [[18, 0.06], [8, 0.10], [3.5, 0.16]]) { c.strokeStyle = `rgba(${SHORE},${a})`; c.lineWidth = w / s; for (const f of vis) c.stroke(f.path); }
      for (const f of vis) { c.fillStyle = f.color; c.fill(f.path); }
      c.strokeStyle = "rgba(38,52,58,.5)"; c.lineWidth = clamp(s / 300, 0.6, 1.5) / s; for (const f of vis) c.stroke(f.path);
      this.sharp = { cv: this._sharpCv, v, w: cw / dpr, h: ch / dpr };
    }

    /* ---------- pais resaltado ---------- */
    _drawHl(now) {
      const { hctx: c, W, H, dpr, view: v } = this, m = this.marks;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      const hl = (m.highlight && this.world.byName[m.highlight]) || (m.area && Object.assign(m.area, { path: A.waters.path(m.area) })); if (!hl) return;   // m.area: masa de agua (js/aguas.js)
      const s = v.s, k = Math.min(1, (now - m.t0) / 500), moving = !!this.anim;
      c.setTransform(s * dpr, 0, 0, -s * dpr, (W / 2 - v.cx * s) * dpr, (H / 2 + v.cy * s) * dpr);
      c.globalAlpha = k; c.fillStyle = "rgba(224,73,43,.22)"; c.fill(hl.path);
      this.hatch.setTransform(new DOMMatrix().scale(1 / (s * dpr), -1 / (s * dpr)));
      c.fillStyle = this.hatch; c.fill(hl.path);
      c.lineJoin = "round"; c.strokeStyle = RED; c.lineWidth = 2.6 / s; c.stroke(hl.path);
      if (!moving) { c.strokeStyle = PAPER; c.lineWidth = 0.9 / s; c.stroke(hl.path); }
      c.globalAlpha = 1;
    }

    /* ---------- efectos (chinchetas, linea, etiquetas, cursor) ---------- */
    _drawFx(now) {
      const { fctx: c, W, H, dpr } = this, m = this.marks;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      const age = now - m.t0;
      if (m.guess || m.answer || m.labelAt) {
        const G = m.guess && this.lonLatToScreen(m.guess[0], m.guess[1]);
        const Aa = m.answer && this.lonLatToScreen(m.answer[0], m.answer[1]);
        const ds = G && Aa ? this._line(c, m, G, Aa, age) : null;
        if (Aa) {
          const k = clamp((age - 480) / 600, 0, 1);
          if (age > 480) {
            const t = ((age - 480) % 1900) / 1900;
            c.strokeStyle = `rgba(242,233,214,${0.85 * (1 - t)})`; c.lineWidth = 2.5; c.beginPath(); c.arc(Aa[0], Aa[1], 10 + t * 48, 0, Math.PI * 2); c.stroke();
            c.strokeStyle = `rgba(224,73,43,${0.6 * (1 - t)})`; c.lineWidth = 2; c.beginPath(); c.arc(Aa[0], Aa[1], 8 + t * 30, 0, Math.PI * 2); c.stroke();
          }
          this._pin(c, Aa[0], Aa[1], RED, PAPER, age - 480, k);
        }
        if (G) this._pin(c, G[0], G[1], INK, PAPER, age, 1);
        if (ds) this._distChip(c, m, ds, age);                            // encima de las chinchetas (antes quedaba debajo y la tapaba el pin de la respuesta)
        const at = Aa || (m.labelAt && this.lonLatToScreen(m.labelAt[0], m.labelAt[1]));
        if (at && m.label && age > 520) this._chip(c, m.label, at[0], at[1] - (Aa ? 66 : 10), { center: true, font: `italic 700 17px ${FD()}`, alpha: Math.min(1, (age - 520) / 300) });
        if (G && m.pop && age > 700) {
          const t = Math.min(1, (age - 700) / 1700), y = G[1] - 52 - easeIO(t) * 46;
          c.save(); c.globalAlpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
          setFont(c, `900 34px ${FD()}`); c.textAlign = "center"; c.lineJoin = "round";
          c.lineWidth = 7; c.strokeStyle = INK; c.strokeText(m.pop, G[0], y); c.fillStyle = PAPER; c.fillText(m.pop, G[0], y); c.restore();
        }
      }
      if (this.probes && this.probes.length && A.drawProbes(this, c, now)) this.fxDirty = true;
      if (this.pickEnabled && this.mouse && !this.pointers.size) this._reticle(c, this.mouse.x, this.mouse.y);
    }

    _line(c, m, G, Aa, age) {
      const k = clamp((age - 300) / 500, 0, 1), e = easeIO(k);
      if (k <= 0) return;
      c.save(); c.setLineDash([1, 9]); c.lineCap = "round"; c.lineWidth = 4; c.strokeStyle = "rgba(20,35,43,.9)";
      const segs = [];
      for (const s of [-360, 0, 360]) {
        if (Math.abs(m.guess[0] + s - m.answer[0]) <= 180) segs.push([this.lonLatToScreen(m.guess[0] + s, m.guess[1]), Aa]);
        if (s !== 0 && Math.abs(m.answer[0] + s - m.guess[0]) <= 180) segs.push([G, this.lonLatToScreen(m.answer[0] + s, m.answer[1])]);
      }
      const trace = () => { c.beginPath(); for (const [a, b] of segs) { c.moveTo(a[0], a[1]); c.lineTo(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e); } c.stroke(); };
      trace();
      c.lineWidth = 1.5; c.strokeStyle = "rgba(242,233,214,.7)"; c.lineDashOffset = 5; trace(); c.restore();
      return m.dist && k >= 1 ? segs[0] : null;
    }
    /* etiqueta de distancia: en medio de la linea; si las dos chinchetas quedan cerca (la cabeza del pin sube ~40 px), debajo de las dos puntas */
    _distChip(c, m, [a, b], age) {
      const near = Math.hypot(b[0] - a[0], b[1] - a[1]) < 130, x = (a[0] + b[0]) / 2, y = near ? Math.max(a[1], b[1]) + 26 : (a[1] + b[1]) / 2;
      this._chip(c, m.dist, x, y, { font: `500 12px ${FM()}`, center: true, alpha: Math.min(1, (age - 800) / 250) });
    }

    /* etiqueta de papel con esquinas cortadas */
    _chip(c, text, x, y, o = {}) {
      c.save(); c.globalAlpha = o.alpha == null ? 1 : o.alpha; setFont(c, o.font || "600 14px sans-serif");
      const w = c.measureText(text).width + 22, h = 28, cut = 6;
      let rx = o.center ? x - w / 2 : x, ry = y - h / 2;
      rx = clamp(rx, 8, this.W - w - 8); ry = clamp(ry, 8, this.H - h - 8);
      const path = () => { c.beginPath(); c.moveTo(rx + cut, ry); c.lineTo(rx + w - cut, ry); c.lineTo(rx + w, ry + cut); c.lineTo(rx + w, ry + h - cut); c.lineTo(rx + w - cut, ry + h); c.lineTo(rx + cut, ry + h); c.lineTo(rx, ry + h - cut); c.lineTo(rx, ry + cut); c.closePath(); };
      c.shadowColor = "rgba(0,0,0,.4)"; c.shadowBlur = 10; c.shadowOffsetY = 3; path(); c.fillStyle = PAPER; c.fill();
      c.shadowColor = "transparent"; c.strokeStyle = INK; c.lineWidth = 1.3; c.stroke();
      c.fillStyle = INK; c.textBaseline = "middle"; c.fillText(text, rx + 11, ry + h / 2 + 1); c.restore();
    }

    _pin(c, x, y, fill, ring, age, alpha) {
      if (age < 0 || alpha <= 0) return;
      const k = Math.min(1, age / 520), drop = (1 - easeOutBounce(k)) * -90;
      c.save(); c.globalAlpha = alpha;
      c.fillStyle = "rgba(0,0,0,.32)"; c.beginPath(); c.ellipse(x, y + 1, 9 * (0.4 + 0.6 * k), 3.6 * (0.4 + 0.6 * k), 0, 0, Math.PI * 2); c.fill();
      c.translate(x, y + drop);
      c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-4, -10, -13, -15, -13, -26); c.arc(0, -26, 13, Math.PI, 0); c.bezierCurveTo(13, -15, 4, -10, 0, 0); c.closePath();
      c.fillStyle = fill; c.fill(); c.lineWidth = 2.5; c.strokeStyle = ring; c.stroke();
      c.beginPath(); c.arc(0, -26, 4.6, 0, Math.PI * 2); c.fillStyle = ring; c.fill(); c.restore();
    }

    _reticle(c, x, y) {
      c.save(); c.lineWidth = 1; c.setLineDash([2, 6]); c.strokeStyle = "rgba(242,233,214,.28)";
      c.beginPath(); c.moveTo(0, y); c.lineTo(x - 22, y); c.moveTo(x + 22, y); c.lineTo(this.W, y); c.moveTo(x, 0); c.lineTo(x, y - 22); c.moveTo(x, y + 22); c.lineTo(x, this.H); c.stroke();
      c.setLineDash([]); c.strokeStyle = PAPER; c.lineWidth = 1.6;
      c.beginPath(); c.arc(x, y, 14, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(x - 22, y); c.lineTo(x - 8, y); c.moveTo(x + 8, y); c.lineTo(x + 22, y); c.moveTo(x, y - 22); c.lineTo(x, y - 8); c.moveTo(x, y + 8); c.lineTo(x, y + 22); c.stroke();
      c.fillStyle = RED; c.beginPath(); c.arc(x, y, 2.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = BRASS; c.beginPath(); c.moveTo(x - 5, 0); c.lineTo(x + 5, 0); c.lineTo(x, 8); c.fill();
      c.beginPath(); c.moveTo(0, y - 5); c.lineTo(0, y + 5); c.lineTo(8, y); c.fill();
      const [wx, wy] = this._toWorld(x, y), [lon, lat] = unproject(wx, wy);
      if (Math.abs(lon) <= 180 && Math.abs(lat) <= 90) {
        const txt = fmtCoord(lat, "N", "S") + "  " + fmtCoord(lon, "E", "W");
        setFont(c, `500 11px ${FM()}`); const w = c.measureText(txt).width + 14;
        let bx = x + 20, by = y + 18; if (bx + w > this.W - 6) bx = x - 20 - w; if (by + 22 > this.H - 6) by = y - 40;
        c.fillStyle = "rgba(20,35,43,.9)"; c.fillRect(bx, by, w, 22);
        c.fillStyle = PAPER; c.textBaseline = "middle"; c.fillText(txt, bx + 7, by + 12);
      }
      c.restore();
    }

    /* miniatura de una region (usa la textura ya dibujada: coste casi nulo) */
    setProbes(list) { this.probes = A.keepT0(this.probes, list); this.fxDirty = true; }   // antes se guardaban y no se dibujaban: el Sonar gastaba la carga sin enseñar nada
    sceneOf(lon, lat) { return project(lon, lat); }
    drawThumb(cv, spec) {
      if (!this.landTex) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 120, h = cv.clientHeight || 76;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      const c = cv.getContext("2d"), sc = this.texSc;
      const g = c.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, OCEAN_TOP); g.addColorStop(1, OCEAN_BOT); c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
      const [x, y] = project(spec.lon, spec.lat), z = Math.max(1, spec.zoom * 0.85);
      const uw = (BX1 - BX0) / z, uh = (uw * h) / w;
      const sw = uw * sc, sh = uh * sc, texH = this.landTex.height;
      const sx = clamp((x - uw / 2 - BX0) * sc, 0, this.landTex.width - sw), sy = clamp((BY1 - (y + uh / 2)) * sc, 0, Math.max(0, texH - sh));
      c.imageSmoothingQuality = "high"; c.drawImage(this.landTex, sx, sy, sw, Math.min(sh, texH), 0, 0, cv.width, cv.height);
      // marca del lugar (mark:false = miniatura de region, sin punto)
      if (spec.mark === false) return;
      const px = ((x - BX0) * sc - sx) / sw * cv.width, py = ((BY1 - y) * sc - sy) / sh * cv.height;
      c.strokeStyle = RED; c.lineWidth = 2 * dpr; c.beginPath(); c.arc(px, py, 6 * dpr, 0, Math.PI * 2); c.stroke();
      c.fillStyle = RED; c.beginPath(); c.arc(px, py, 2 * dpr, 0, Math.PI * 2); c.fill();
    }
  }
  A.MapView2D = MapView2D;
})(window.AIQ);
