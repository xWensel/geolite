/*
 * Geolite - LO QUE CELEBRA LA CASA (v0.3.203 · Bloque F, paso 6, votado el 23-oct en su segunda vuelta). Efectos SOBRE las piezas del juego, con la
 * tecnica de los retos (js/chfx.js: WebGL2 y ruido fbm a resolucion completa). Nada sale volando ni flota: lo que se mueve es el propio mapa, el
 * ticket, el aviso, la carta. Intensidad al 150 % (la que eligio el autor).
 *   acierto(tier)       la onda de choque deforma el mapa bajo tu chincheta (js/map.js, FS_POST). Los anillos 300/150/75 van en la capa de encima:
 *                       la onda pasa por debajo de ellos y siguen intactos
 *   jackpot(i)          cada golpe del premio de la Enciclopedia: otra onda, mayor (el temblor ya lo pone A.casa.premio; nada de oro en la Enciclopedia)
 *   racha(o)            el fuego de la racha, a lo Balatro, detras del recuadro rojo del ticket: calor en la 2, llamas en la 3, incendio en la 5
 *   superada(lvl, vd)   el sello hunde el ticket, la tinta se corre por el papel y la lampara de la caja sube segun el margen (1 justa, 2 holgada, 3 aplastante)
 *   logro(el)           el aviso de logro aparece quemandose con un filo de oro (y se va igual, con el filo oscuro)
 *   compra(...)         la carta comprada, la reliquia en su hueco, el contador y la etiqueta 0/5 pasan a lo nuevo quemandose en oro
 * La quema la pinta js/quema.js (CSS.paintWorklet), celda a celda, en el hilo del pintor. Movimiento Minimo: sin desplazar, hundir ni temblar
 * (la luz, a la mitad; el fuego, quieto). Destellos suaves: la luz a la mitad. Sin WebGL2 o sin pintor de CSS, todo sigue como antes.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const K = 1.5;
  const H = () => document.documentElement.classList;
  const quieto = () => H().contains("reduce-motion"), suave = () => H().contains("soft-flash") || quieto();
  const esc = () => Math.min(innerWidth / 1920, innerHeight / 1080) || 1;
  const fase = () => (A.core && A.core.S && A.core.S.phase) || "";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = p => 1 - Math.pow(1 - p, 3), io = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const son = (k, ...a) => { try { if (A.sfx && A.sfx[k]) A.sfx[k](...a); } catch (e) { /* audio no listo */ } };

  /* ================================================================ 1. la onda del acierto (y de cada jackpot) */
  const ONDAS = {
    1: [[{ r1: 230, s: 5, w: 24, l: 0.18, ms: 760 }], { r: 90, k: 0.32, ms: 700 }],
    2: [[{ r1: 320, s: 8, w: 28, l: 0.24, ms: 860 }], { r: 125, k: 0.45, ms: 850 }],
    3: [[{ r1: 400, s: 11, w: 30, l: 0.28, ms: 950 }, { r1: 250, s: 6, w: 22, l: 0.18, ms: 760, delay: 120 }], { r: 150, k: 0.55, ms: 1000 }],
    4: [[{ r1: 680, s: 17, w: 40, l: 0.36, ms: 1250 }, { r1: 440, s: 10, w: 30, l: 0.24, ms: 1050, delay: 140 }, { r1: 260, s: 6, w: 22, l: 0.16, ms: 850, delay: 300 }], { r: 210, k: 0.9, ms: 1600 }],
  };
  function onda(aros, luz) {
    const M = A.core && A.core.map; if (!M || !M.onda) return;
    const mov = quieto() ? 0 : 1, lk = suave() ? 0.5 : 1;
    M.onda(aros.map(o => ({ ...o, s: Math.min(22, o.s * K) * mov, l: o.l * K * lk })), luz ? { ...luz, r: luz.r * Math.min(1.3, 0.7 + K * 0.3), k: Math.min(0.85, luz.k * K * 0.75) * lk } : null);
  }
  const acierto = tier => { const o = ONDAS[tier]; if (o) onda(o[0], o[1]); };
  const jackpot = i => onda([{ r1: 520 + 120 * i, s: 12 + 5 * i, w: 34 + 4 * i, l: 0.26 + 0.06 * i, ms: 1100 }], { r: 170 + 30 * i, k: 0.6 + 0.2 * i, ms: 1100 });

  /* ================================================================ WebGL: un lienzo pequeno por efecto, un pase a pantalla completa */
  const VS = `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2. - 1., 0., 1.); }`;
  const NOISE = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), u.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; } return s; }`;
  /* se compila sin esperar al resultado (KHR_parallel_shader_compile, como js/chfx.js): ready() solo pregunta si ya esta. Se deja compilando en un
     rato libre nada mas arrancar, asi el primer fuego o la primera tinta no congelan la pantalla */
  function programa(cv, fs) {
    let gl = null; try { gl = cv.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false, depth: false, stencil: false }); } catch (e) { gl = null; }
    if (!gl) return null;
    const psc = gl.getExtension("KHR_parallel_shader_compile"), shs = [];
    const mk = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); shs.push(o); return o; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    const vao = gl.createVertexArray(), L = {}, u = n => (n in L ? L[n] : (L[n] = gl.getUniformLocation(p, n)));
    let ok = false, dead = false;
    const ready = () => {
      if (ok) return true; if (dead || gl.isContextLost()) return false;
      if (psc && !gl.getProgramParameter(p, psc.COMPLETION_STATUS_KHR)) return false;
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn("celebra:", gl.getProgramInfoLog(p), ...shs.map(x => gl.getShaderInfoLog(x))); dead = true; return false; }
      gl.useProgram(p); gl.bindVertexArray(vao); return (ok = true);
    };
    const draw = () => { gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3); };
    return { gl, u, draw, ready, get dead() { return dead; } };
  }
  /* coloca un lienzo fijo en pantalla (px de pantalla, ajustado al pixel del dispositivo) y devuelve su origen real */
  function coloca(cv, x, y, w, h) {
    const d = devicePixelRatio || 1, X = Math.round(x * d), Y = Math.round(y * d), Wd = Math.max(2, Math.round(w * d)), Hd = Math.max(2, Math.round(h * d));
    if (cv.width !== Wd || cv.height !== Hd) { cv.width = Wd; cv.height = Hd; cv.style.width = Wd / d + "px"; cv.style.height = Hd / d + "px"; }
    const t = `translate(${X / d}px, ${Y / d}px)`; if (cv._t !== t) { cv.style.transform = t; cv._t = t; }
    return [X / d, Y / d];
  }

  /* ================================================================ 2. el fuego de la racha (Balatro), detras del recuadro rojo del ticket.
     Llamas de ruido que suben del borde de arriba del recuadro en cuatro bandas de color de geolite40. El lienzo va FUERA del ticket (el ticket lleva
     su sombra en un filtro: un lienzo vivo dentro lo haria recalcular en cada fotograma) y no pinta dentro del recuadro: queda detras */
  const FS_LLAMAS = `#version 300 es
precision highp float;
uniform vec2 uR; uniform vec4 uBox; uniform float uT, uI, uK;
out vec4 o;
${NOISE}
void main(){
  vec2 px = vec2(gl_FragCoord.x, uR.y - gl_FragCoord.y) / uK;
  float x0 = uBox.x, y0 = uBox.y, x1 = uBox.z, y1 = uBox.w;
  if (px.x > x0 && px.x < x1 && px.y > y0 + 1. && px.y < y1) { o = vec4(0.); return; }   // el recuadro tapa su propio fuego
  float up = y0 - px.y, side = max(x0 - px.x, px.x - x1), t = uT;
  float lengua = fbm(vec2(px.x * .045, t * .9));
  float H = (12. + 92. * uI) * (.35 + 1.15 * lengua * lengua);
  vec2 q = vec2(px.x * .05 + sin(px.y * .06 + t * 3.) * .25, (px.y + t * 95.) * .032);
  float n = fbm(q) * .7 + fbm(q * 2.6 + vec2(4.1, t * 1.7)) * .3;
  float lado = smoothstep(10., -10., side);
  float f = 0.;
  if (up > -6.) f = lado * (1.05 - up / (H * (.55 + .9 * n)));
  f -= (1. - smoothstep(0., 1., n * 1.6)) * .25 * smoothstep(0., 20., up);
  f = clamp(f, 0., 1.) * (.45 + .55 * min(uI, 1.));
  vec3 c = vec3(0.); float a = 0.;
  if (f > .78) { c = vec3(1., .953, .69); a = 1.; }
  else if (f > .56) { c = vec3(.992, .843, .259); a = 1.; }
  else if (f > .34) { c = vec3(.961, .651, .137); a = 1.; }
  else if (f > .14) { c = vec3(.91, .157, .227); a = .92; }
  else if (f > .05) { c = vec3(.659, .078, .18); a = .55 * smoothstep(.05, .14, f); }
  float glow = exp(-max(up, 0.) / 18.) * smoothstep(14., 0., side) * .3 * min(uI, 1.);
  c += vec3(1., .6, .25) * glow * (1. - a); a = max(a, glow);
  o = vec4(c * a, a);
}`;
  const fuerza = n => (n >= 6 ? 1 : n === 5 ? 0.86 : n === 4 ? 0.6 : n === 3 ? 0.38 : n === 2 ? 0.14 : 0);
  const LL = { cv: null, P: null, m: null, fuego: 0, obj: 0, aviva: 0, raf: 0, last: 0, slamT: 0, iq: -1, r: null, rt: 0, mide: 0 };
  function llamasGL(poner = true) {
    if (!LL.P || LL.P.dead || LL.P.gl.isContextLost()) {
      if (LL.cv) LL.cv.remove();
      const cv = document.createElement("canvas"); cv.className = "cel-fx cel-llamas"; cv.setAttribute("aria-hidden", "true");
      LL.cv = cv; LL.P = programa(cv, FS_LLAMAS); if (!LL.P) { LL.cv = null; return null; }
    }
    const hud = document.getElementById("hud");
    if (poner && hud && LL.cv.previousElementSibling !== hud) hud.insertAdjacentElement("afterend", LL.cv);
    return LL.P;
  }
  /* o: { antes, ahora, eq ("on" | "broken" | "off"), slam (ms hasta el golpe de la caja) } */
  function racha(o) {
    clearTimeout(LL.slamT);
    if (!o || !o.eq || !llamasGL()) { LL.obj = 0; return; }
    const lit0 = o.antes >= 2 && o.eq !== "off";
    LL.obj = LL.fuego = lit0 ? fuerza(o.antes) : 0; LL.aviva = 0; LL.m = null; LL.iq = -1; LL.r = null; LL.mide = performance.now() + 1000;   // mientras el ticket entra, el recuadro se mide en cada fotograma
    LL.slamT = setTimeout(() => { LL.obj = o.eq === "on" ? fuerza(o.ahora) : 0; if (o.eq === "on") LL.aviva = 0.35; LL.mide = performance.now() + 600; arde(); }, o.slam || 0);
    arde();
  }
  const arde = () => { if (!LL.raf) { LL.last = 0; LL.raf = requestAnimationFrame(llama); } };
  function apagaLlamas() { if (LL.cv) LL.cv.style.display = "none"; LL.raf = 0; LL.iq = -1; }
  function llama(now) {
    LL.raf = 0;
    const dt = LL.last ? Math.min(0.05, (now - LL.last) / 1000) : 0.016; LL.last = now;
    const m = LL.m && LL.m.isConnected ? LL.m : (LL.m = document.querySelector("#hud .tk-eq .m"));
    if (!m || fase() !== "reveal" || !LL.P || LL.P.dead) { apagaLlamas(); if (fase() !== "reveal") { clearTimeout(LL.slamT); LL.obj = 0; } return; }
    if (!LL.P.ready()) { LL.raf = requestAnimationFrame(llama); return; }   // aun compilando: sin fuego un momento (el de pixeles sigue)
    const eq = m.closest(".tk-eq"); if (eq && !eq.classList.contains("ll-on")) eq.classList.add("ll-on");   // el fuego de pixeles de siempre se aparta
    const q = quieto(), a = 1 - Math.exp(-dt * 3.7);
    LL.fuego += (LL.obj - LL.fuego) * a; LL.aviva *= 1 - a;
    const i = clamp((LL.fuego + LL.aviva) * (q ? 0.7 : 1) * Math.min(1.15, 0.65 + K * 0.3), 0, 1.1);
    if (i < 0.01) { apagaLlamas(); if (LL.obj > 0) arde(); return; }
    if (!LL.r || now < LL.mide || now - LL.rt > 250) { LL.r = m.getBoundingClientRect(); LL.rt = now; }   // quieto el ticket, basta con mirar cada cuarto de segundo
    const r = LL.r;
    if (r.width) {
      const k = esc(), L = 56 * k, T = 222 * k, B = 22 * k, [x, y] = coloca(LL.cv, r.left - L, r.top - T, r.width + 2 * L, r.height + T + B);
      const key = q ? [i.toFixed(2), x, y, r.width, r.height].join() : null;
      if (!q || key !== LL.iq) {                                        // con Movimiento minimo, el fuego quieto: solo se repinta si cambia
        LL.iq = key; LL.cv.style.display = "block";
        const { gl, u } = LL.P, d = devicePixelRatio || 1;
        gl.uniform2f(u("uR"), LL.cv.width, LL.cv.height); gl.uniform1f(u("uK"), k * d);
        gl.uniform4f(u("uBox"), (r.left - x) / k, (r.top - y) / k, (r.right - x) / k, (r.bottom - y) / k);
        gl.uniform1f(u("uT"), q ? 3 : now / 1000); gl.uniform1f(u("uI"), i); LL.P.draw();
      }
    }
    LL.raf = requestAnimationFrame(llama);
  }

  /* ================================================================ 3. ronda superada: el sello hunde el ticket, la tinta se corre y la lampara sube */
  const FS_TINTA = `#version 300 es
precision highp float;
uniform vec2 uR; uniform vec4 uS; uniform float uRot, uP, uDeja, uK;
out vec4 o;
${NOISE}
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
void main(){
  vec2 px = vec2(gl_FragCoord.x, uR.y - gl_FragCoord.y) / uK, d = px - uS.xy;
  float cs = cos(uRot), sn = sin(uRot); vec2 p = vec2(cs * d.x + sn * d.y, -sn * d.x + cs * d.y);
  float sd = sdBox(p, uS.zw);
  float fib = fbm(p * vec2(.09, .35)) * .7 + fbm(p * .2) * .3;
  float alc = 4. + 26. * uP * (.35 + fib);
  float ink = (1. - smoothstep(alc - 3., alc, sd)) * step(-6., sd);
  float a = ink * (.55 * (1. - uP * .6) + uDeja * .25) * (.6 + .4 * fib);
  o = vec4(vec3(.765, .2, .165) * a, a);
}`;
  const TI = { cv: null, P: null, mo: null };
  function tintaGL(poner = true) {
    if (!TI.P || TI.P.dead || TI.P.gl.isContextLost()) {
      if (TI.cv) TI.cv.remove();
      const cv = document.createElement("canvas"); cv.className = "cel-fx cel-tinta"; cv.setAttribute("aria-hidden", "true");
      TI.cv = cv; TI.P = programa(cv, FS_TINTA); if (!TI.P) { TI.cv = null; return null; }
    }
    const host = document.getElementById("layer");
    if (poner && host && TI.cv.parentNode !== host) host.appendChild(TI.cv);
    return TI.P;
  }
  const quitaTinta = () => { if (TI.cv) TI.cv.style.display = "none"; if (TI.mo) { TI.mo.disconnect(); TI.mo = null; } removeEventListener("resize", quitaTinta); };
  function superada(lvl, vd) {
    lvl = clamp(lvl | 0, 1, 3);
    const st = vd && vd.isConnected ? vd.querySelector(".gx-vd-stamp:not(.re)") : null; if (!st) return;
    const tk = st.closest(".gx-vd-ticket"), mid = st.closest(".gx-vd-mid"), k = esc(), z = tk && tk.offsetWidth ? tk.getBoundingClientRect().width / tk.offsetWidth : 1;
    /* el golpe hunde el ticket (con su sombra: se mueve la pieza entera, el filtro no se recalcula) */
    if (!quieto() && mid) mid.animate([{ transform: "none" }, { transform: `translateY(${((4 + lvl * 2) * k / z).toFixed(2)}px) scale(${1 - 0.004 * lvl})`, offset: 0.25 }, { transform: `translateY(${(-k / z).toFixed(2)}px)`, offset: 0.6 }, { transform: "none" }], { duration: 300, easing: "cubic-bezier(.2, .8, .3, 1)" });
    if (lvl >= 2 && A.casa && A.casa.impacto) A.casa.impacto(lvl - 1);
    if (A.casa && A.casa.luz) A.casa.luz([0.35, 0.6, 0.95][lvl - 1] * Math.min(1.3, K / 1.2), [900, 1400, 2200][lvl - 1]);
    /* la tinta: un cerco que se corre por la fibra del papel y se recoge; deja un leve corrido mientras el veredicto siga en pantalla */
    const P = tintaGL(); if (!P || !P.ready()) return;
    const r = st.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, hw = st.offsetWidth / 2 * z, hh = st.offsetHeight / 2 * z, M = Math.hypot(hw, hh) + 64 * k;
    const [x, y] = coloca(TI.cv, cx - M, cy - M, 2 * M, 2 * M), mt = getComputedStyle(st).transform, mm = /matrix\(([^)]+)\)/.exec(mt), rot = mm ? Math.atan2(+mm[1].split(",")[1], +mm[1].split(",")[0]) : -7 * Math.PI / 180;
    const { gl, u } = P, d = devicePixelRatio || 1, top = 0.6 + 0.2 * lvl;
    const pinta = (p, deja) => { gl.uniform2f(u("uR"), TI.cv.width, TI.cv.height); gl.uniform1f(u("uK"), k * d); gl.uniform4f(u("uS"), (cx - x) / k, (cy - y) / k, hw / k, hh / k); gl.uniform1f(u("uRot"), rot); gl.uniform1f(u("uP"), p); gl.uniform1f(u("uDeja"), deja); P.draw(); };
    TI.cv.style.display = "block";
    if (TI.mo) TI.mo.disconnect(); TI.mo = new MutationObserver(quitaTinta); TI.mo.observe(document.getElementById("dlg"), { childList: true }); addEventListener("resize", quitaTinta);
    if (quieto()) { pinta(top * 0.25, 1); return; }
    const t0 = performance.now(), m1 = 520 + lvl * 120, m2 = 700;
    const paso = now => {
      if (!TI.mo) return; const e = now - t0;
      if (e < m1) pinta(ease(e / m1) * top, 0); else if (e < m1 + m2) { const p = (e - m1) / m2; pinta(top * (1 - p * 0.75), p); } else { pinta(top * 0.25, 1); return; }
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  /* ================================================================ 4. la quema (CSS.paintWorklet, js/quema.js) */
  let QM = false;
  (function prepara() {
    try {
      if (!(window.CSS && CSS.paintWorklet && CSS.registerProperty)) return;
      [["--qp", "0", true], ["--qs", "7", true], ["--qc", "2", true], ["--qz", "1.5", true], ["--qm", "0", false]].forEach(([name, iv, inh]) => { try { CSS.registerProperty({ name, syntax: "<number>", inherits: inh, initialValue: iv }); } catch (e) { /* ya estaba */ } });
      CSS.paintWorklet.addModule("js/quema.js").then(() => { QM = true; calienta(); }).catch(e => console.warn("quema:", e));
    } catch (e) { QM = false; }
  })();
  /* el pintor arranca en frio: en un rato libre se le hace pintar una vez (mascara y filo) en dos piezas invisibles, asi la primera compra no da un tiron */
  function calienta() {
    const idle = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 8000 }) : setTimeout(fn, 3000));
    idle(() => {
      if (!document.body) return;
      const mk = (m, prop) => { const e = document.createElement("i"); e.setAttribute("aria-hidden", "true");
        Object.assign(e.style, { position: "fixed", left: "0", top: "0", width: "180px", height: "240px", opacity: "0.001", pointerEvents: "none", zIndex: "-1" });
        e.style.setProperty("--qm", String(m)); e.style.setProperty("--qp", "0.5"); e.style.setProperty("--qc", "2"); e.style[prop] = "paint(quema)"; if (prop === "maskImage") e.style.background = "#000";
        document.body.appendChild(e); return e; };
      const a = mk(0, "maskImage"), b = mk(2, "backgroundImage");
      setTimeout(() => { a.remove(); b.remove(); }, 700);
    });
  }
  /* la celda: un pixel de arte (2 px locales en las mesas a 1280x720; 3 px de pantalla a 1080p), entera en pixeles del dispositivo */
  function celda(el) {
    const r = el.getBoundingClientRect(), z = el.offsetWidth ? r.width / el.offsetWidth : 1, d = devicePixelRatio || 1;
    const dev = Math.max(2, Math.round(2 * z * d));                    // px de dispositivo por celda
    return { c: dev / (z * d), z: (z / esc()) || 1 };
  }
  /* prepara una pieza para quemarse: mascara en la pieza y, encima, el filo (un hijo que ocupa toda la pieza) */
  function mascara(el, modo, seed) {
    const { c, z } = celda(el), s = el.style;
    s.setProperty("--qc", c.toFixed(4)); s.setProperty("--qz", z.toFixed(3)); s.setProperty("--qs", String(seed == null ? Math.round(Math.random() * 4000) / 100 : seed)); s.setProperty("--qm", String(modo)); s.setProperty("--qp", "0");
    s.webkitMaskImage = s.maskImage = "paint(quema)"; s.webkitMaskSize = s.maskSize = "100% 100%"; s.webkitMaskRepeat = s.maskRepeat = "no-repeat";
  }
  function enciende(el, modo, seed) {
    mascara(el, modo, seed);
    const f = document.createElement("i"); f.className = "qm-filo"; f.setAttribute("aria-hidden", "true"); f.style.setProperty("--qm", String(modo === 0 ? 2 : 3)); el.appendChild(f);
    return f;
  }
  const apaga = (el, f) => { const s = el.style; s.webkitMaskImage = s.maskImage = ""; ["--qc", "--qz", "--qs", "--qm", "--qp"].forEach(n => s.removeProperty(n)); if (f) f.remove(); };
  const anima = (el, de, a, ms, done, easing = "linear") => { const an = el.animate([{ "--qp": de }, { "--qp": a }], { duration: Math.max(1, ms), easing, fill: "forwards" }); an.onfinish = () => { if (done) done(an); }; return an; };
  /* el halo: la luz del fuego sobre la mesa, detras de la pieza (screen), sube y se va con la quema */
  function halo(el, ms, k = 0.75) {
    if (!el.offsetParent) return; const h = document.createElement("i"); h.className = "qm-halo"; h.setAttribute("aria-hidden", "true");
    const w = el.offsetWidth, hg = el.offsetHeight; Object.assign(h.style, { left: el.offsetLeft - w * 0.25 + "px", top: el.offsetTop - hg * 0.2 + "px", width: w * 1.5 + "px", height: hg * 1.4 + "px" });
    el.parentNode.insertBefore(h, el); const a = k * Math.min(1, K / 1.2) * (suave() ? 0.5 : 1);
    h.animate([{ opacity: 0 }, { opacity: a, offset: 0.5 }, { opacity: 0 }], { duration: ms, easing: "ease-in-out" }).onfinish = () => h.remove();
  }

  /* el aviso de logro: aparece quemandose en oro. Devuelve false si no hay quema (el aviso entra como siempre) */
  function logro(el) {
    if (!QM || !el) return false;
    const f = enciende(el, 1); el.classList.add("qm"); el._qm = f;
    const ms = quieto() ? 420 : 760; halo(el, ms, 0.8);
    anima(el, 0, 1, ms, an => { an.cancel(); if (el._qm === f) { apaga(el, f); el._qm = null; } });
    return true;
  }
  /* y se va igual, con el filo oscuro; done al acabar */
  function logroFuera(el, done) {
    if (!QM || !el || !el.classList.contains("qm")) return false;
    if (el._qm) apaga(el, el._qm);
    const f = enciende(el, 1); f.style.setProperty("--qm", "4"); el._qm = f;
    anima(el, 1, 0, 380, an => { an.cancel(); apaga(el, f); el._qm = null; el.classList.remove("qm"); done(); });
    return true;
  }

  /* la compra: antes de repintar la mesa se copian las piezas que van a cambiar; despues, cada copia se pone encima de la nueva y se quema */
  function antesDeComprar(card, ix) {
    if (!QM) return null;
    const dlg = document.getElementById("dlg"); if (!dlg) return null;
    const row = dlg.querySelector(".tr-relics .tray-row"), slot = row ? row.querySelector(":scope > .tr-slot:not(.pact)") : null, si = slot ? [...row.children].indexOf(slot) : -1;
    /* la copia conserva clases e ids (sus estilos dependen de ellos) y va DESPUES de la pieza nueva: quien busque la pieza encuentra la de verdad */
    const copia = el => { if (!el) return null; const c = el.cloneNode(true);
      const src = el.querySelectorAll("canvas"), dst = c.querySelectorAll("canvas"); src.forEach((cv, i) => { try { dst[i].width = cv.width; dst[i].height = cv.height; dst[i].getContext("2d").drawImage(cv, 0, 0); } catch (e) { /* sin copia del brillo */ } });
      return c; };
    const P = [
      ["carta", copia(card), () => dlg.querySelector(`.offer[data-ix="${ix}"]`), 0, 820],
      ["cuenta", copia(document.getElementById("shopCoins")), () => document.getElementById("shopCoins"), 180, 380],
      ["hueco", si >= 0 ? copia(slot) : null, () => { const r = dlg.querySelector(".tr-relics .tray-row"); return r && si >= 0 ? r.children[si] : null; }, 420, 620],
      ["etiqueta", copia(dlg.querySelector(".tr-relics h4 b")), () => dlg.querySelector(".tr-relics h4 b"), 507, 443],
    ];
    return () => {
      const f = quieto() ? 0.6 : 1, seed = Math.round(Math.random() * 4000) / 100;
      P.forEach(([n, c, nuevo, at, ms]) => {
        const nu = nuevo(); if (!c || !nu || !nu.offsetParent) return;
        if (n === "hueco" && !nu.classList.contains("tr-relic")) return;            // no entro una reliquia (una herramienta o una provision)
        if (n !== "carta" && n !== "hueco" && c.textContent === nu.textContent) return;   // no ha cambiado
        const s = c.style;
        Object.assign(s, { position: "absolute", left: nu.offsetLeft + "px", top: nu.offsetTop + "px", width: nu.offsetWidth + "px", height: nu.offsetHeight + "px", margin: "0", boxSizing: "border-box", pointerEvents: "none", zIndex: "6", transition: "none", animation: "none" });
        c.classList.add("qm-copia"); c.setAttribute("aria-hidden", "true"); nu.parentNode.insertBefore(c, nu.nextSibling);   // mismo padre: mismos estilos y mismo bloque de referencia
        /* la vieja se quema y la nueva aparece por el mismo frente: mascaras complementarias (misma semilla, misma rejilla), nunca las dos a la vez */
        enciende(c, 0, seed + at); mascara(nu, 1, seed + at);
        if (n === "carta") halo(nu, ms * f);
        const fin = () => { c.remove(); if (nu._qmA) { nu._qmA.cancel(); nu._qmA = null; } apaga(nu); };
        setTimeout(() => {
          if (!c.isConnected || !nu.isConnected) { fin(); return; }
          if (n === "cuenta") son("coin", 0.4);
          nu._qmA = anima(nu, 0, 1, ms * f);
          anima(c, 0, 1, ms * f, () => { fin(); if (n === "hueco") son("coin", 0.7); });
        }, at * f);
      });
    };
  }

  /* en un rato libre nada mas arrancar: los dos programas compilando en segundo plano */
  { const idle = (fn, ms) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: ms }) : setTimeout(fn, ms));
    addEventListener("load", () => idle(() => { llamasGL(false); tintaGL(false); }, 6000), { once: true }); }

  A.celebra = { acierto, jackpot, racha, superada, logro, logroFuera, antesDeComprar, get quema() { return QM; } };
})(window.AIQ);
