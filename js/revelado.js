/*
 * Geolite - LA PREGUNTA Y EL REVELADO (paquete del «Probador de Geolite», aprobado en su segunda ronda; todo en el preset EXTREMA de la maqueta,
 * geolite-art-tools/probador/src/fx/par-*.js). El orden es el del montaje aprobado:
 *   clic -> la camara se acerca y cierra el foco (par-dolly) mientras tu chincheta cae y se clava (par-chincheta) -> la sala contiene el aliento
 *   (par-respira: penumbra, latido, la musica baja) -> el revelado lo suelta -> (diana perfecta 0-5 km: la casa se calla y luego el golpe, par-silencio |
 *   te quedas justo fuera de un aro: la cuenta pasa el umbral y vuelve atras, el aro se estira hacia ti y se raja, par-casi) -> la cuenta del ticket
 *   con rodillos (par-rodillos: cada cifra gira a saltos de pixel y encaja con su clic; un clic en el ticket la interrumpe).
 * Lo que se dibuja vive en el mapa (js/map.js: la chincheta y su sombra en la capa 2D; hoyuelo, onda, foco, penumbra, silencio y luz en el ultimo
 * pase FS_POST: ningun lienzo nuevo, sobrevive a la perdida de la GPU) y en el ticket (rodillos). La partida es sagrada: todo empieza DESPUES del clic.
 * Movimiento Minimo (el ajuste del juego, html.reduce-motion): sin anticipo ni camara ni temblor; la chincheta ya clavada con su hoyuelo, el aro del
 * casi ya rajado, los aros de oro encendidos y las cifras finales. Suave: sin desenfoque y la luz a la mitad. Vibracion = no: sin temblor ni mando.
 *   A.par.plan(o)              cuanto dura cada cosa en esta respuesta: { pre, sil, casi, peso }
 *   A.par.start(o)             el anticipo (camara, foco, penumbra, latido, sonido y vibracion del clavado); o.onR se llama al revelar
 *   A.par.saltar()             clic, Intro o A durante el anticipo: se revela ya
 *   A.par.silencio(ms, golpe)  la casa se calla ms y luego el golpe (la luz pasada de rosca)
 *   A.par.rueda(el, v, o)      rodillos: o = { from, ms, delay, tick, row, path, onSeg, onV }
 *   A.par.fin(el, v) / cortar() lo que vale cada cifra al final / un clic en el ticket: todo encaja de golpe
 *   A.par.post(now)            lo que pinta FS_POST ahora (lo lee js/map.js)
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  /* el preset Extrema de la maqueta, tal cual (ver cada fx/par-*.js) */
  const X = {
    caida: 280, alto: 65,                          // par-chincheta: D = 0,16 + 0,12·alto (alto 1) y la altura (25 + 40·alto)·(0,75 + 0,15·peso) px
    hunde: 1, onda: 1,
    susp: 500, pen: 0.78, luz: 1,                  // par-respira: suspense 500 ms, penumbra 0,78, luz que vuelve 1, latido
    zoom: 1.7, foco: 190, bokeh: 20, flor: 0.9,    // par-dolly: x1,7, foco 190 px, desenfoque 20 px, claros 0,9
    calla: 1000, calLuz: 0.95, golpe: 1,           // par-silencio: hasta 1 s de silencio (a 0 km), la luz baja 0,95
    hondo: 18, espera: 340, raja: 1,               // par-casi: baja un 18 % del umbral, duda 340 ms, se raja entero
    dur: 1.4, salto: 2,                            // par-rodillos: x1,4 de duracion, salto de 2 px (tambor limpio: sin hueco ni estela, peticion de la revision)
  };
  A.par = { X };
  const cls = () => document.documentElement.classList;
  const quieto = () => cls().contains("reduce-motion");
  const suave = () => cls().contains("soft-flash");
  const temblor = () => !cls().contains("no-shake") && !quieto() && !(A.core && A.core.S && A.core.S.shake === false);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), eo = u => 1 - Math.pow(1 - u, 3), eio = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const son = (k, ...a) => { try { if (A.sfx && A.sfx[k]) A.sfx[k](...a); } catch (e) { /* audio aun no listo */ } };
  const vib = (s, w, ms) => { try { if (A.haptic && A.haptic.dual) A.haptic.dual(s, w, ms); else if (A.haptic) A.haptic(Math.round(ms * 0.6)); } catch (e) { /* sin vibracion */ } };

  /* ================================================================ el plan de esta respuesta */
  /* o: { guess, km, isC, lim: [300,150,75], streak (antes de contestar), gl (hay mapa de GPU) }. peso = la racha con la que clavas (1 <2, 2 de 2 a 4,
     3 de 5): el clavado pesa mas con racha y no delata el resultado antes del revelado */
  A.par.plan = o => {
    const peso = o.streak >= 5 ? 3 : o.streak >= 2 ? 2 : 1, vivo = !!o.gl && !quieto();
    const pre = vivo && o.guess ? X.caida + X.susp : 0;
    /* la diana perfecta: solo puntos (en un pais, dentro = 0 km siempre) */
    const sil = o.guess && !o.isC && o.km <= 5 ? Math.round(500 + (X.calla - 500) * clamp((5 - o.km) / 5)) : 0;
    /* el casi: hasta un 15 % por fuera del aro mas pequeno que no alcanzaste (300, 150 o 75 km). Solo con anillos (puntos) */
    let casi = null;
    if (o.guess && !o.isC && o.lim) for (let i = 2; i >= 0; i--) { const r = o.lim[i]; if (o.km > r && o.km <= r * 1.15) { casi = { i, r, m: Math.round(r * (1 - X.hondo / 100)), F: o.km }; break; } }
    return { pre, sil: vivo ? sil : sil ? 1 : 0, casi, peso, vivo };
  };
  A.par.clava = (peso, vivo) => ({ t0: performance.now(), ms: vivo ? X.caida : 0, h: X.alto * (0.75 + 0.15 * peso), peso, hunde: X.hunde, onda: X.onda });

  /* ================================================================ el anticipo y el revelado */
  let st = null, rT = 0, onR = null;
  A.par.start = o => {
    clearTimeout(rT); st = null; onR = null;
    const { map, plan } = o; if (!plan.vivo || !plan.pre) { if (o.onR) o.onR(); return; }
    const t0 = performance.now(), V = X.caida, S = X.susp;
    st = { t0, V, S, tR: t0 + plan.pre, niv: -1, blur: map.blurOn !== false, suave: suave() };
    /* la camara: se acerca hacia el punto (que no se mueve) durante el vuelo y el suspense */
    if (map.dolly && o.xy) map.dolly(o.xy[0], o.xy[1], X.zoom, plan.pre);
    /* la chincheta se clava: su sonido (el de siempre, con racha su nota sube) y el golpe con peso; el mando, por peso */
    setTimeout(() => {
      if (!st || st.t0 !== t0) return;
      son("pin", o.streak || 0, o.side || 0); son("clava", plan.peso, o.side || 0);
      vib(0.2 + 0.22 * plan.peso, 0.08 + 0.05 * plan.peso, 70 + plan.peso * 35);
      if (plan.peso === 3 && temblor() && A.core && A.core.jpShake) A.core.jpShake(1);
      if (A.music && A.music.aliento) A.music.aliento(true);                       // la musica baja a su fondo
    }, V);
    setTimeout(() => { if (st && st.t0 === t0) { son("aliento"); vib(0.45, 0, 90); setTimeout(() => { if (st && st.t0 === t0 && performance.now() < st.tR) vib(0.28, 0, 70); }, 170); } }, V + 50);
    onR = o.onR; rT = setTimeout(suelta, plan.pre);
    map.dirty = true;
  };
  function suelta() {
    clearTimeout(rT); if (!st || st.niv >= 0) return;
    st.tR = performance.now(); st.niv = 0;
    if (A.music && A.music.aliento) A.music.aliento(false);
    const f = onR; onR = null; if (f) f();
  }
  /* el revelado ya sabe como ha ido: la luz vuelve (fria y lenta si fallas; con un destello si es muy bien o diana) */
  A.par.nivel = tier => { if (st) st.tier = tier; };
  A.par.saltar = () => { if (st && st.niv < 0 && performance.now() - st.t0 > 120) { suelta(); return true; } return false; };
  A.par.anticipando = () => !!(st && st.niv < 0);
  /* el silencio de la diana perfecta: desde ahora la casa se calla ms y en golpe() vuelve todo */
  A.par.silencio = ms => {
    if (A.music && A.music.calla) A.music.calla(ms);
    if (quieto()) return;
    const a = performance.now(); if (!st) st = { t0: a, V: 0, S: 0, tR: a - 5000, niv: 0, blur: false, suave: suave() };
    st.sil = { a, b: a + ms };
  };

  /* lo que pinta FS_POST ahora (px de diseno a 1080p): null cuando ya no queda nada */
  A.par.post = now => {
    if (!st) return null;
    const o = { foc: 4000, coc: 0, flor: X.flor, pen: 0, penR: 900, dim: 0, luz: 0, flash: 0, frio: 0, sigma: 260 };
    const t = (now - st.t0) / 1000, V = st.V / 1000, S = st.S / 1000, k = st.suave ? 0.5 : 1;
    let vivo = false;
    if (st.niv < 0) {                                                       // el anticipo
      vivo = true; const TR = V + S, uf = eo(clamp(t / (TR * 0.85)));
      if (st.blur) { o.foc = 1400 - (1400 - X.foco) * uf; o.coc = X.bokeh * uf; }
      if (t >= V) { const u = (t - V) / S; o.pen = X.pen * eo(clamp(u * 1.6)); o.penR = 900 - 640 * eo(clamp(u)); }
    } else {
      const r = (now - st.tR) / 1000;
      if (r < 1.6) {
        vivo = true; const uo = eo(clamp(r / 0.35));
        if (st.blur) { o.foc = X.foco + (2600 - X.foco) * uo; o.coc = X.bokeh * (1 - uo); }
        o.pen = X.pen * Math.max(0, 1 - r / 0.14); o.penR = 260;
        const tier = st.tier == null ? 2 : st.tier, fallo = tier === 0 || tier === 5, niv = fallo ? 0 : tier;
        if (fallo) { o.pen = X.pen * (1 - eo(clamp(r / 0.9))); o.penR = 260 + 400 * clamp(r / 0.9); o.frio = 0.5 * Math.exp(-r * 1.2) * clamp(r * 6); }
        else { o.luz = X.luz * Math.exp(-r * 5) * (0.5 + 0.12 * niv) * k; o.flash = X.luz * (niv >= 3 ? 1 : 0.5) * Math.exp(-r * 14) * clamp(r * 40) * k; o.sigma = 240 + r * 520; }
        if (quieto()) { o.luz = o.flash = o.frio = 0; }
      }
    }
    if (st.sil) {
      const s = st.sil;
      if (now < s.b) { vivo = true; o.dim = X.calLuz * clamp((now - s.a) / 50); o.luz = o.flash = 0; }
      else {
        const r = (now - s.b) / 1000;
        if (r < 1.8) {
          vivo = true; o.dim = X.calLuz * Math.max(0, 1 - r / 0.06);
          const f = X.golpe * (Math.exp(-r * 3.2) * 1.1 + (r > 0.18 ? 0.5 * Math.exp(-(r - 0.18) * 5) : 0)) * k;
          o.luz = Math.max(o.luz, f * 0.6); o.flash = Math.max(o.flash, f * 0.3);   // la mitad de la maqueta: en el juego la onda de la diana (js/celebra.js) y la lampara de la sala suman su propia luz en el mismo golpe o.sigma = 300 + r * 700;
        }
      }
    }
    if (!vivo) { st = null; return null; }
    return o;
  };

  /* ================================================================ los rodillos (par-rodillos) */
  /* cada cifra es un tambor de carrete: todas las cifras desde la mas alta que cambia giran por su cuenta (vueltas de mas sobre su valor), paran de
     izquierda a derecha, cada una con su clic, y asientan con un leve rebote; el giro va a saltos de pixel (X.salto px a 1080p, en pixeles reales);
     recorte duro, sin fantasmas. Debajo sigue el valor de la cuenta (el casi baja, duda y vuelve) */
  const DIG = [..."01234567890"].map(d => `<i>${d}</i>`).join("");
  const RUN = new Set(), FIN = new Map(); let raf = 0, lastTic = 0;
  function build(el, shape) {
    el.innerHTML = ""; el._cols = []; el._seps = [];
    let n = 0;
    [...shape].forEach(ch => {
      if (ch === "0") { const dg = document.createElement("span"); dg.className = "dg"; const col = document.createElement("span"); col.className = "col"; col.style.setProperty("--i", n); col.innerHTML = DIG; dg.appendChild(col); el.appendChild(dg); el._cols.push(col); n++; }
      else { const sp = document.createElement("span"); sp.className = "sep"; sp.textContent = ch; el.appendChild(sp); el._seps.push({ sp, left: n }); }
    });
    el._shape = shape; el.style.setProperty("--t", "0s");
  }
  const posOf = (v, i) => { if (i === 0) return v; const p = Math.pow(10, i), fl = Math.floor(v / p), rem = v - fl * p; return fl + Math.max(0, rem - (p - 1)); };
  /* el tambor de cada cifra (R.sp[i], i = 0 unidades): da `turns` vueltas de mas sobre su valor, frena hasta `stop` ms y, si cabe, se pasa un poco y
     asienta (`bounce` ms). Las cifras de arriba paran antes: el carrete se asienta de izquierda a derecha */
  const SPIN_P = 1.8, BOUNCE = 0.3;
  const spinOf = (sp, t) => (t >= sp.end ? 0 : t >= sp.stop ? (sp.bounce ? BOUNCE * Math.sin(Math.PI * clamp((t - sp.stop) / sp.bounce)) : 0) : sp.turns * 10 * Math.pow(1 - clamp(t / sp.stop), SPIN_P));
  function paint(R, v, vel, t) {
    const el = R.el, cols = el._cols, n = cols.length, step = R.step;
    if (!el._seps) return;                                            // el contador se rehizo por fuera (odoBuild de js/game.js): este giro ya no pinta nada
    for (let i = 0; i < n; i++) {
      const col = cols[n - 1 - i], p = posOf(v, i), sp = t != null && R.sp ? R.sp[i] : null, extra = sp ? spinOf(sp, t) : 0;
      const blank = i > 0 && p < 0.001 && !(sp && t < sp.end);                      // un tambor que gira se ve aunque su cifra aun sea 0 a la izquierda
      if (blank !== !!col._blank) { col._blank = blank; col.style.visibility = blank ? "hidden" : ""; }
      if (blank) continue;
      let f = ((((p % 10) + extra) % 10) + 10) % 10; if (step > 0) f = Math.round(f / step) * step;
      const y = f.toFixed(4); if (col._y !== y) { col._y = y; col.style.transform = `translateY(${(-f * R.cell).toFixed(4)}em)`; }
    }
    /* un separador de miles a la izquierda de cifras en blanco tampoco se ve */
    for (const s of el._seps) { const show = s.left > 0 && !!cols[s.left - 1] && !cols[s.left - 1]._blank; if (show !== !s.sp._hid) { s.sp._hid = !show; s.sp.style.visibility = show ? "" : "hidden"; } }
  }
  function lock(R) {
    { const sh = A.fmt(Math.round(R.to)).replace(/\d/g, "0"); if (!R.el._cols || R.el._cols.length < sh.replace(/[^0]/g, "").length) build(R.el, sh); }   // un corte puede llegar con las cifras de un valor mas corto
    const el = R.el, d = (A.fmt(Math.round(R.to)).match(/\d/g) || []).map(Number), cols = el._cols || [], off = cols.length - d.length;
    cols.forEach((c, i) => { const dg = i - off; c.style.transform = ""; c._y = null; const blank = dg < 0; c._blank = blank; c.style.visibility = blank ? "hidden" : ""; c.style.setProperty("--d", blank ? 0 : d[dg]); });
    for (const s of el._seps || []) { const show = s.left - off > 0; s.sp._hid = !show; s.sp.style.visibility = show ? "" : "hidden"; }
    el.classList.remove("gira", "rapido"); el._v = R.to;
  }
  function frame(now) {
    raf = 0;
    for (const R of RUN) {
      if (!R.el.isConnected) { RUN.delete(R); continue; }
      const t = now - R.start;
      if (t < 0) { if (!R.shown) { R.shown = true; paint(R, R.from, 0); } continue; }
      const { v, seg, done } = R.at(t), vel = Math.abs(v - (R.last == null ? v : R.last));
      if (seg !== R.seg) { R.seg = seg; if (R.onSeg) R.onSeg(seg); }
      if (R.onV) R.onV(v, seg);
      if (done) { RUN.delete(R); lock(R); if (R.onV) R.onV(R.to, -1); if (R.clic) { son("encaja", R.row || 0); vib(0.05, 0.25, 40); } continue; }
      paint(R, v, vel, t);
      /* cada tambor encaja con su clic al parar (de izquierda a derecha), sin amontonarse */
      if (R.sp && R.tick) for (const sp of R.sp) if (!sp.clic && t >= sp.stop) { sp.clic = true; if (now - lastTic > 30) { lastTic = now; son("count", clamp(R.row / 6)); } }
      /* el clic del rodillo: cada vez que las unidades pasan una cifra (sin amontonarse) */
      if (R.tick && R.last != null && Math.floor(v) !== Math.floor(R.last) && vel < 6 && now - lastTic > 42 && Math.random() < 0.6) { lastTic = now; son("count", clamp(R.row / 6)); }
      R.last = v;
    }
    if (RUN.size) raf = requestAnimationFrame(frame);
  }
  A.par.rueda = (el, to, o = {}) => {
    if (!el) return;
    if (el._lock) return;
    for (const R of RUN) if (R.el === el) RUN.delete(R);
    const from = o.from != null ? o.from : el._v != null ? el._v : 0, path = o.path || [{ to, ms: o.ms || 1000, e: "salida" }];
    const hi = Math.max(from, to, ...path.map(p => p.to)), shape = A.fmt(Math.round(hi)).replace(/\d/g, "0");
    if (el._shape !== shape || !el._cols || !el._seps) build(el, shape);
    if (quieto() || o.instant) { const R = { el, to }; lock(R); return; }
    /* el giro: salida rapida y frenada larga (un rodillo con reten); los tramos del casi bajan, dudan y vuelven */
    const segs = []; let acc = 0, a = from;
    for (const p of path) { segs.push({ a, b: p.to, t0: acc, ms: Math.max(1, p.ms), e: p.e || "salida" }); acc += Math.max(1, p.ms); a = p.to; }
    const ease = (e, u) => (e === "salida" ? 1 - Math.pow(1 - u, 3.2) : e === "io" ? eio(u) : e === "out" ? eo(u) : u);
    const at = t => {
      for (let i = 0; i < segs.length; i++) { const s = segs[i]; if (t < s.t0 + s.ms) { const u = clamp((t - s.t0) / s.ms); return { v: s.a + (s.b - s.a) * ease(s.e, u), seg: i, done: false }; } }
      return { v: to, seg: segs.length, done: true };
    };
    const z = el.currentCSSZoom || 1, fs = parseFloat(getComputedStyle(el).fontSize) || 30, pitch = fs * z * (devicePixelRatio || 1);
    const sal = Math.max(1, Math.round(X.salto * Math.min(innerWidth / 1920, innerHeight / 1080) * (devicePixelRatio || 1)));
    const cell = el.classList.contains("odp") ? 1.4 : 1;
    /* los tambores: giran desde la cifra mas alta que cambia hasta las unidades (como un carrete: si cambia la de arriba, las de abajo tambien giran) */
    const dgA = (x, i) => (i > 0 && x < Math.pow(10, i) ? -1 : Math.floor(x / Math.pow(10, i)) % 10), vals = [from, ...path.map(p => p.to)].map(Math.round), T = Math.round(to), nd = String(Math.abs(T)).length;
    let hiP = -1; for (let i = 0; i < nd; i++) if (vals.some(x => dgA(x, i) !== dgA(T, i))) hiP = i;
    let sp = null;
    if (hiP >= 0) {
      const s0 = segs[0].ms, bounce = s0 >= 420 ? 130 : 0, D = s0 - bounce, base = clamp(Math.round(D / 260), 1, 6); sp = [];
      for (let i = 0; i <= hiP; i++) { const stop = Math.max(1, D * (1 - 0.45 * (hiP ? i / hiP : 0))); sp.push({ turns: Math.max(1, Math.round(base * stop / D)), stop, bounce, end: stop + bounce, clic: false }); }
    }
    const R = { el, cell, from, to, at, sp, start: performance.now() + (o.delay || 0), step: sal / (pitch * cell), tick: !!o.tick, row: o.row || 0, onSeg: o.onSeg, onV: o.onV, clic: o.clic !== false, seg: -1, last: null, shown: false };
    el._v = to; RUN.add(R); paint(R, from, 0); R.shown = true;
    if (!raf) raf = requestAnimationFrame(frame);
  };
  A.par.fin = (el, v) => { if (el) FIN.set(el, v); };
  A.par.nuevo = () => { for (const el of FIN.keys()) el._lock = false; FIN.clear(); };
  /* un clic en el ticket durante la cuenta: todo encaja de golpe en su valor, con un solo clac */
  A.par.cortar = () => {
    let any = false;
    for (const [el, v] of FIN) {
      if (!el.isConnected || el._lock) continue;
      for (const R of RUN) if (R.el === el) { RUN.delete(R); any = true; }
      if (el._v !== v) any = true;
      lock({ el, to: v }); el._lock = true;
    }
    if (any) { son("encaja", 6); son("golpe", 0); vib(0.3, 0.3, 80); }
    return any;
  };
  A.par.cuentaViva = () => RUN.size > 0;
  /* un clic en cualquier sitio durante el anticipo revela ya (la tecla Intro y el boton A, en js/game.js) */
  addEventListener("pointerdown", () => { A.par.saltar(); }, true);
})(window.AIQ);
