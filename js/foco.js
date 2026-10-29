/*
 * Geolite - EL FOCO DEL JEFE (paquete «Veredicto, jefe y cofre» del Probador, preset EXTREMA; maqueta: geolite-art-tools/probador/src/fx/ver-telon.js,
 * ver-foco). Al abrirse el telon del jefe, la sala baja y un foco de seguimiento colgado sobre el escenario se enciende con su clac, barre buscando
 * (acto I: va y se posa; acto II: busca dos veces; jefe final: tres), se pasa un poco y vuelve hasta posarse DETRAS del crupier: cono de luz con
 * aire (humo muy fino y lento), charco en las tablas y motas de polvo que solo existen dentro del haz (nada que flote fuera de la luz).
 *  - Vive en #intro como capa del fondo: encima del telon pintado y de la luz de la sala (#sala), DEBAJO del cartel, la ficha y el crupier. Asi la
 *    luz nunca pisa al crupier ni al cartel (no hace falta mascara: el orden de capas es el real).
 *  - Un lienzo WebGL2 en modo de fusion «hard-light»: por debajo de gris medio oscurece (la sala que baja), por encima aclara (el haz).
 *  - Movimiento Minimo: el foco ya posado, el polvo quieto y la sala con su luz baja; sin barrido ni clac. Sin WebGL2: nada (la intro de siempre).
 *
 *   A.foco.start(intro, { tier })   A.foco.stop()
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  /* el preset Extrema de la maqueta */
  const X = { sala: 0.6, radio: 300, aire: 0.85, polvo: 1.3, barrido: 1.9, color: [1, 0.9, 0.74] };
  const quieto = () => document.documentElement.classList.contains("reduce-motion");
  const temblor = () => !document.documentElement.classList.contains("no-shake") && !quieto() && !(A.core && A.core.S && A.core.S.shake === false);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const easeIO = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const son = (k, ...a) => { try { if (A.sfx && A.sfx[k]) A.sfx[k](...a); } catch (e) { /* audio no listo */ } };
  const vib = (s, w, ms) => { try { if (A.haptic && A.haptic.dual) A.haptic.dual(s, w, ms); else if (A.haptic) A.haptic(Math.round(ms * 0.6)); } catch (e) { /* sin vibracion */ } };

  const FS = `#version 300 es
precision highp float;
uniform vec2 uR, uSrc, uAim; uniform float uT, uS, uOn, uDim, uRad, uDust, uHaze, uFloorY, uReduce;
uniform vec3 uLC;
out vec4 o;
vec2 px(){ return vec2(gl_FragCoord.x, uR.y - gl_FragCoord.y); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm3(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 3; i++) { s += a * vn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; } return s; }
float beam(vec2 p){
  vec2 a = normalize(uAim - uSrc), d = p - uSrc;
  float al = dot(d, a); if (al <= 0.) return 0.;
  float len = length(uAim - uSrc);
  float r = uRad * (.16 + .84 * al / len);
  float pr = length(d - a * al) / r;
  float core = 1. - smoothstep(.62, 1., pr);
  float fall = .55 + .45 * smoothstep(0., len, al);
  return core * fall;
}
void main(){
  vec2 p = px(), q = p / uS;                                               // q: en pixeles de diseno (1080p)
  float B = beam(p) * uOn;
  float air = .72 + .28 * fbm3(vec2(q.x / 140. - uT * .05, q.y / 90. + uT * .03));
  float haze = B * air * uHaze;
  float fl = smoothstep(uFloorY - 6. * uS, uFloorY + 6. * uS, p.y);
  vec2 dp = (p - uAim) / vec2(uRad * 1.05, uRad * .26);
  float pool = (1. - smoothstep(.55, 1., length(dp))) * fl * uOn;
  float dust = 0.;
  for (int l = 0; l < 2; l++) {
    float sz = l == 0 ? 26. : 41.;
    vec2 qq = q + vec2(uT * (l == 0 ? 5. : -3.), -uT * (l == 0 ? 7. : 4.5));
    vec2 id = floor(qq / sz), f = qq - id * sz;
    vec2 ctr = 4. + h22(id + float(l) * 17.) * (sz - 8.);
    float d = length(f - ctr);
    float on = step(.45, h21(id + 3.1 + float(l)));
    float tw = .55 + .45 * sin(uT * (1.3 + h21(id) * 2.) + h21(id + 9.) * 6.28);
    if (uReduce > .5) tw = .8;
    dust += on * tw * (1. - smoothstep(.35, l == 0 ? 1.1 : 1.5, d)) * (l == 0 ? 1. : .6);
  }
  dust *= pow(B, 1.4) * uDust * (1. - fl);
  /* lo que hace la luz: la sala baja fuera del haz (multiplica) y el haz aclara (el terciopelo rojo se enciende rojo, el aire y el polvo en su color) */
  float keep = min(1., B * 1.6 + pool);
  float m = 1. - uDim * (1. - keep);                                        // < 1: oscurece
  vec3 add = uLC * (haze * .32 + dust * .75 + pool * .06) + vec3(.62, .16, .14) * (B * .55 + pool * .8) * .5;
  /* hard-light: por debajo de .5 multiplica (x2), por encima es «pantalla». El neto se mide contra el tono tipico de la sala (D0): sin anillos
     claros en el borde del haz, donde la sala ya baja y la luz aun no llega */
  const float D0 = .18;
  vec3 net = add - (1. - m) * D0;
  vec3 c = mix(.5 * clamp(1. + net / D0, 0., 1.), .5 + .5 * clamp(net, 0., 1.), step(0., net));
  float a = (abs(net.r) + abs(net.g) + abs(net.b)) > .0015 ? 1. : 0.;
  c += (h21(p + fract(uT) * 71.) - .5) / 255.;                             // tramado de 1/255: sin bandas
  o = vec4(c * a, a);
}`;
  const VS = `#version 300 es
in vec2 aP; void main(){ gl_Position = vec4(aP, 0., 1.); }`;

  let cur = null;
  function start(intro, o = {}) {
    stop(0);
    if (!intro) return null;
    const tier = clamp(o.tier | 0 || 1, 1, 3);
    const cv = document.createElement("canvas"); cv.className = "foco-cv"; cv.setAttribute("aria-hidden", "true");
    let gl = null; try { gl = cv.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false }); } catch (e) { gl = null; }
    if (!gl) return null;
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn("foco:", gl.getShaderInfoLog(s)); return null; } return s; };
    const v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS); if (!v || !f) return null;
    const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "aP"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}, u = n => (n in U ? U[n] : (U[n] = gl.getUniformLocation(pr, n)));
    /* la capa: justo encima del fondo del escenario (telon pintado y luz de la sala), por debajo del cartel y del crupier */
    const sala = intro.querySelector(":scope > #sala") || intro.querySelector(":scope > .esc-telon");
    const ref = sala ? sala.nextSibling : intro.firstChild;
    intro.insertBefore(cv, ref);
    let W = 0, H = 0, d = 1;
    const mide = () => { d = devicePixelRatio || 1; const w = Math.round(innerWidth * d), h = Math.round(innerHeight * d); if (w !== W || h !== H) { W = cv.width = w; H = cv.height = h; gl.viewport(0, 0, W, H); } };
    mide();
    /* a donde mira: detras del crupier (su centro), sobre las tablas del escenario */
    const objetivo = () => {
      const s = Math.max(innerWidth / 1920, innerHeight / 1080), dl = intro.querySelector(".intro-dealer .dealer, .intro-dealer"), r = dl && dl.getBoundingClientRect();
      const fl = intro.querySelector(".esc-telon > .suelo"), ft = fl ? fl.getBoundingClientRect().top : innerHeight * 0.89;
      const x = r && r.width > 4 ? r.left + r.width / 2 : innerWidth * 0.715;
      return { s, x, floor: ft, aim: ft + 40 * s };
    };
    let O = objetivo();
    const red = quieto();
    let t0 = performance.now(), fired = {}, raf = 0, vivo = true, fade = 1, fadeT = 0;
    /* el camino: busca (se pasa y vuelve) y se posa; en fraccion del ancho (los puntos de la maqueta, a 1920) */
    const aimAt = e => {
      const tgt = O.x, F = x => x / 1920 * innerWidth;
      const keys = tier === 1 ? [[0, F(230)], [1, tgt]] : tier === 2 ? [[0, F(230)], [0.55, F(1560)], [1, tgt]] : [[0, F(230)], [0.36, F(980)], [0.62, F(1600)], [1, tgt]];
      for (let i = 1; i < keys.length; i++) if (e <= keys[i][0]) { const [a0, x0] = keys[i - 1], [a1, x1] = keys[i]; return x0 + (x1 - x0) * easeIO((e - a0) / (a1 - a0)); }
      return tgt;
    };
    const frame = now => {
      raf = 0; if (!vivo) return;
      if (gl.isContextLost() || !intro.isConnected || intro.classList.contains("hidden")) { if (cur === me) cur = null; return me.fin(); }
      mide();
      const t = (now - t0) / 1000, uq = red ? 99 : t;
      if (!red) {
        if (!fired.on && uq >= 0.05) { fired.on = 1; son("foco", "on", tier); vib(0.2, 0.3, 60); }
        if (!fired.land && uq >= X.barrido + 0.1) { fired.land = 1; son("foco", "posa", tier); vib(0.3 + 0.12 * tier, 0.1, 200); if (tier === 3 && temblor() && A.core && A.core.jpShake) A.core.jpShake(1); }
      }
      if (t < X.barrido + 0.5 || (t | 0) % 2 === 0) O = objetivo();                 // el crupier puede moverse un poco al hablar: el foco le sigue
      const on = red ? 1 : clamp((uq - 0.05) / 0.06, 0, 1) * (uq < 0.1 ? (Math.random() < 0.5 ? 0.6 : 1) : 1);
      const dim = X.sala * (red ? 1 : Math.min(1, uq / 0.35)) * [0.75, 0.9, 1.1][tier - 1];
      if (fadeT) fade = Math.max(0, 1 - (now - fadeT) / 320);
      const ax = red ? O.x : aimAt(clamp(uq / X.barrido, 0, 1));
      const sd = O.s * d;
      gl.uniform2f(u("uR"), W, H); gl.uniform1f(u("uS"), sd); gl.uniform1f(u("uT"), red ? 3 : t); gl.uniform1f(u("uReduce"), red ? 1 : 0);
      gl.uniform2f(u("uSrc"), (innerWidth * 1010 / 1920) * d, -240 * sd); gl.uniform2f(u("uAim"), ax * d, O.aim * d);
      gl.uniform1f(u("uOn"), on * fade); gl.uniform1f(u("uDim"), Math.min(0.7, dim) * fade); gl.uniform1f(u("uRad"), X.radio * sd * [0.9, 1, 1.12][tier - 1]);
      gl.uniform1f(u("uDust"), X.polvo); gl.uniform1f(u("uHaze"), X.aire); gl.uniform1f(u("uFloorY"), O.floor * d); gl.uniform3f(u("uLC"), ...X.color);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (fadeT && fade <= 0) { if (cur === me) cur = null; return me.fin(); }
      if (red && !fadeT) return;                                                   // Minimo: un solo dibujo, quieto
      raf = requestAnimationFrame(frame);
    };
    cv.addEventListener("webglcontextlost", e => { e.preventDefault(); if (cur === me) cur = null; me.fin(); });
    const onRes = () => { if (vivo && red) { mide(); O = objetivo(); requestAnimationFrame(frame); } };
    addEventListener("resize", onRes);
    const me = cur = { cv, fin() { vivo = false; cancelAnimationFrame(raf); removeEventListener("resize", onRes); cv.remove(); }, apaga() { if (!fadeT) { fadeT = performance.now(); if (!raf) raf = requestAnimationFrame(frame); } } };
    raf = requestAnimationFrame(frame);
    return cur;
  }
  /* se apaga (con un fundido corto) o se quita ya */
  function stop(ms = 320) { const c = cur; if (!c) return; if (!ms) { cur = null; c.fin(); } else c.apaga(); }

  A.foco = { start, stop, activo: () => !!cur };
})(window.AIQ);
