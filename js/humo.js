/* Geolite - EL HUMO DEL CRUPIER. Una ficha de la mesa del autor (mesa/ -> js/vivo.js -> js/chfx.js, el motor de la mesa): Don Crupier te echa el humo
   del puro a la cara. Entra a bocanadas por los dos lados de la pantalla, se arremolina, se encuentra en el centro y se queda flotando hasta que la mesa
   lo quita; el jugador lo aparta moviendo el raton (o el cursor del mando): la mano arrastra el humo y lo abre a su paso.
   Es humo de verdad: un fluido simulado en la GPU (WebGL2; velocidad, presion y densidad en texturas de media precision, con adveccion, vorticidad y
   proyeccion en cada fotograma), iluminado por las lamparas de la sala. Solo trabaja mientras hay humo; con Movimiento: Minimo va a media velocidad.
     A.humo.on(host, ptr)   host: la capa donde se pinta (#vivoFx) · ptr(): el puntero en pixeles de esa capa. false = esta GPU no puede (sin WebGL2)
     A.humo.off()           deja de soplar: lo que queda se deshace solo */
window.AIQ = window.AIQ || {};
(function (A) {
  const M = A.humo = {};
  const rnd = Math.random, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reduce = () => document.documentElement.classList.contains("reduce-motion");   // el ajuste del juego (Movimiento: Minimo), como el resto del juego
  const say = (k, ...a) => { try { A.sfx[k] && A.sfx[k](...a); } catch (e) { /* audio no listo */ } };
  const QUAL = { saver: [96, 288, 12], auto: [128, 432, 16], high: [160, 576, 20] };   // celdas del fluido y de la densidad (lado corto) y pasadas de presion

  const VS = `#version 300 es
out vec2 v;
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); v = p; gl_Position = vec4(p * 2. - 1., 0., 1.); }`;
  const HEAD = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 v; out vec4 o; uniform vec2 px;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), u.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), u.x), u.y); }
`;
  const NB = s => `float L = texture(${s}, v - vec2(px.x, 0.)).x, R = texture(${s}, v + vec2(px.x, 0.)).x, B = texture(${s}, v - vec2(0., px.y)).x, T = texture(${s}, v + vec2(0., px.y)).x;`;
  const FS = {
    /* una mancha gaussiana (rad en alturas de pantalla): suma `add` y arrastra lo que hay hacia `col` (mixk). Es la boca que sopla, el humo que
       sale de ella (nz: con hebras, no una bola lisa) y la mano del jugador (lleva el aire consigo y aclara el humo a su paso) */
    splat: `uniform sampler2D uS; uniform vec2 pt, rad; uniform vec3 add, col; uniform float asp, mixk, nz, seed;
void main(){ vec2 d = v - pt; d.x *= asp; float g = exp(-(d.x * d.x / (rad.x * rad.x) + d.y * d.y / (rad.y * rad.y)));
  vec2 q = v * vec2(asp, 1.); float n = nz > 0. ? mix(1., .3 + 1.4 * (vn(q * 5. + seed) * .6 + vn(q * 13. - seed * 1.7) * .4), nz) : 1.;
  vec3 b = texture(uS, v).xyz; o = vec4(b + g * n * add + g * mixk * (col - b), 1.); }`,
    /* cada cosa viaja con el aire y se va gastando (diss); el humo, ademas, se difumina con los segundos (blur): la bocanada nace con detalle y acaba en neblina */
    advect: `uniform sampler2D uV, uS; uniform vec2 vpx; uniform float dt, diss, blur;
void main(){ vec2 c = v - dt * texture(uV, v).xy * vpx; vec4 s = texture(uS, c);
  if (blur > 0.) s = mix(s, .25 * (texture(uS, c + vec2(px.x * 2., 0.)) + texture(uS, c - vec2(px.x * 2., 0.)) + texture(uS, c + vec2(0., px.y * 2.)) + texture(uS, c - vec2(0., px.y * 2.))), blur);
  o = s / (1. + diss * dt); }`,
    curl: `uniform sampler2D uV;
void main(){ float L = texture(uV, v - vec2(px.x, 0.)).y, R = texture(uV, v + vec2(px.x, 0.)).y, B = texture(uV, v - vec2(0., px.y)).x, T = texture(uV, v + vec2(0., px.y)).x; o = vec4(.5 * (R - L - T + B), 0., 0., 1.); }`,
    /* los remolinos se mantienen vivos (vorticidad) y el humo, templado, sube despacio */
    vort: `uniform sampler2D uV, uC, uD; uniform float dt, curl, buoy;
void main(){ ${NB("uC")} float C = texture(uC, v).x;
  vec2 f = .5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); f /= length(f) + .0001; f *= curl * C; f.y = -f.y;
  vec2 w = texture(uV, v).xy + f * dt; w.y += buoy * texture(uD, v).x * dt; o = vec4(clamp(w, -1000., 1000.), 0., 1.); }`,
    /* la pantalla es una caja cerrada: el humo no se escapa por los bordes, da la vuelta */
    div: `uniform sampler2D uV;
void main(){ vec2 C = texture(uV, v).xy; float L = texture(uV, v - vec2(px.x, 0.)).x, R = texture(uV, v + vec2(px.x, 0.)).x, B = texture(uV, v - vec2(0., px.y)).y, T = texture(uV, v + vec2(0., px.y)).y;
  if (v.x - px.x < 0.) L = -C.x; if (v.x + px.x > 1.) R = -C.x; if (v.y + px.y > 1.) T = -C.y; if (v.y - px.y < 0.) B = -C.y;
  o = vec4(.5 * (R - L + T - B), 0., 0., 1.); }`,
    scale: `uniform sampler2D uS; uniform float k;
void main(){ o = k * texture(uS, v); }`,
    press: `uniform sampler2D uP, uDv;
void main(){ ${NB("uP")} o = vec4((L + R + B + T - texture(uDv, v).x) * .25, 0., 0., 1.); }`,
    grad: `uniform sampler2D uP, uV;
void main(){ ${NB("uP")} o = vec4(texture(uV, v).xy - vec2(R - L, T - B), 0., 1.); }`,
    /* a pantalla: lo que cuenta es lo que tapa (op: la opacidad de cada punto). Su relieve hace de volumen: los flancos que miran a las lamparas (arriba
       a la izquierda) se encienden en calido y los otros caen a una sombra fria; por dentro la bocanada es cremosa y los bordes se deshacen en velo */
    show: `uniform sampler2D uD; uniform vec2 dpx; uniform float uA, uT;
float op(vec2 p){ return 1. - exp(-max(texture(uD, p).x, 0.) * .9); }
void main(){
  float a = op(v); vec2 e1 = dpx * 1.5, e2 = dpx * 7.;
  vec2 g = 2. * vec2(op(v + vec2(e1.x, 0.)) - op(v - vec2(e1.x, 0.)), op(v + vec2(0., e1.y)) - op(v - vec2(0., e1.y)))
         + 1.5 * vec2(op(v + vec2(e2.x, 0.)) - op(v - vec2(e2.x, 0.)), op(v + vec2(0., e2.y)) - op(v - vec2(0., e2.y)));
  float sh = clamp(.74 + .55 * g.x - .8 * g.y, 0., 1.); sh = sh * sh * (3. - 2. * sh);
  vec3 col = mix(vec3(.46, .47, .56), vec3(1., .985, .95), sh);
  col = mix(col, col * vec3(.86, .88, .95), .5 * smoothstep(.75, .98, a));                     // el corazon, mas espeso
  col += vec3(.08, .07, .05) * smoothstep(.02, .22, a) * (1. - smoothstep(.22, .6, a));         // el velo fino se enciende con la luz
  col = mix(col, col * vec3(1.05, .97, .86), .5 * v.y);                                        // lamparas calidas arriba
  col += (h21(gl_FragCoord.xy + fract(uT) * 61.) - .5) * .014;                                 // sin bandas en los degradados
  a = max(a, .07 * (.55 + .45 * vn(v * vec2(5., 3.) + uT * .05)));                             // y la sala entera queda cargada: una neblina leve
  a = min(a, .95) * uA;
  o = vec4(clamp(col, 0., 1.) * a, a);
}`,
  };

  let cv = null, gl = null, psc = null, P = null, linked = false, host = null, ptr = null, ro = null, raf = 0, last = 0, lostT = 0;
  let on = false, k = 0, offAt = 0, W = 0, H = 0, hw = 0, hh = 0, grid = "", V = null, D = null, Pr = null, C = null, Dv = null, N = 16;
  const BR = [], HND = { x: 0, y: 0, ok: false, acc: 0, at: 0 }; let nextAt = 0, turn = 1;

  /* ------------------------------------------------------------------ WebGL: programas y texturas */
  function init() {
    try {
      const c = document.createElement("canvas"); c.className = "hm-cv";
      const g = c.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" });
      if (!g || !(g.getExtension("EXT_color_buffer_float") || g.getExtension("EXT_color_buffer_half_float"))) return false;   // sin texturas de media precision no hay fluido
      cv = c; gl = g; psc = gl.getExtension("KHR_parallel_shader_compile"); linked = false; P = {};
      /* se compila sin esperar (como js/chfx.js): el primer fotograma sale cuando el driver termina, sin congelar la pantalla */
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }, vs = sh(gl.VERTEX_SHADER, VS);
      for (const n in FS) { const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, HEAD + FS[n])); gl.linkProgram(p); P[n] = { p, u: {} }; }
      gl.bindVertexArray(gl.createVertexArray()); gl.disable(gl.BLEND);
      cv.addEventListener("webglcontextlost", e => { e.preventDefault(); drop(); if (on) lostT = setTimeout(() => { if (on && !gl && init()) { mount(); kick(); } }, 1500); });   // la GPU se reinicio: humo nuevo en el mismo sitio
      hw = host.clientWidth || innerWidth; hh = host.clientHeight || innerHeight; grid = "";
      if (!fit()) { drop(); return false; }
    } catch (e) { console.warn("humo: sin WebGL2", e); drop(); return false; }
    return true;
  }
  function drop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(lostT); if (cv) cv.remove(); cv = gl = P = V = D = Pr = C = Dv = null; linked = false; }
  function ready() {
    if (linked) return true;
    for (const n in P) if (psc && !gl.getProgramParameter(P[n].p, psc.COMPLETION_STATUS_KHR)) return false;
    for (const n in P) {
      const p = P[n].p; if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn("humo:", n, gl.getProgramInfoLog(p)); P = null; return false; }   // este driver no lo compila: sin humo
      for (let i = 0, m = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < m; i++) { const nm = gl.getActiveUniform(p, i).name; P[n].u[nm] = gl.getUniformLocation(p, nm); }
    }
    return (linked = true);
  }
  function tex(w, h, lin) {
    const t = gl.createTexture(), f = gl.createFramebuffer(), flt = lin ? gl.LINEAR : gl.NEAREST;
    gl.bindTexture(gl.TEXTURE_2D, t);
    for (const [a, b] of [[gl.TEXTURE_MIN_FILTER, flt], [gl.TEXTURE_MAG_FILTER, flt], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, a, b);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("fbo");
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    return { t, f, w, h };
  }
  const pair = (w, h, lin) => ({ r: tex(w, h, lin), w: tex(w, h, lin), swap() { const t = this.r; this.r = this.w; this.w = t; } });
  const free = o => { if (!o) return; for (const x of o.t ? [o] : [o.r, o.w]) { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.f); } };
  /* el lienzo a la medida de la capa y las rejillas con su proporcion (se rehacen si la ventana cambia de forma: el humo vuelve a entrar) */
  function fit() {
    const w = hw || innerWidth, h = hh || innerHeight, S = A.core && A.core.S, q = QUAL[S && S.quality] || QUAL.auto, dpr = Math.min(2, devicePixelRatio || 1);
    const cw = Math.max(2, Math.round(w * dpr * 0.6)), ch = Math.max(2, Math.round(h * dpr * 0.6));
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    W = w; H = h;
    const asp = w / Math.max(1, h), dim = n => (asp >= 1 ? [Math.min(2048, Math.round(n * asp)), n] : [n, Math.min(2048, Math.round(n / asp))]), s = dim(q[0]), d = dim(q[1]), key = s + "|" + d;
    if (key === grid) return true;
    try { for (const o of [V, D, Pr, C, Dv]) free(o); V = pair(s[0], s[1], true); D = pair(d[0], d[1], true); Pr = pair(s[0], s[1], false); C = tex(s[0], s[1], false); Dv = tex(s[0], s[1], false); }
    catch (e) { console.warn("humo: sin texturas de media precision"); return false; }
    grid = key; N = q[2]; HND.ok = false; return true;
  }
  /* un pase: programa, destino (null = la pantalla) y sus valores (numero, [x, y], [x, y, z] o una textura) */
  function run(name, dst, u) {
    const p = P[name]; gl.useProgram(p.p); let unit = 0;
    for (const n in u) {
      const val = u[n], loc = p.u[n]; if (loc == null) continue;
      if (typeof val === "number") gl.uniform1f(loc, val);
      else if (val.t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, val.t); gl.uniform1i(loc, unit++); }
      else if (val.length === 2) gl.uniform2f(loc, val[0], val[1]); else gl.uniform3f(loc, val[0], val[1], val[2]);
    }
    const w = dst ? dst.w : cv.width, h = dst ? dst.h : cv.height;
    if (p.u.px) gl.uniform2f(p.u.px, 1 / w, 1 / h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.f : null); gl.viewport(0, 0, w, h); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  const Z3 = [0, 0, 0];
  const splat = (T, pt, rad, add, col, mixk, nz, seed) => { run("splat", T.w, { uS: T.r, pt, rad, add, col, asp: W / Math.max(1, H), mixk, nz: nz || 0, seed: seed || 0 }); T.swap(); };

  /* ------------------------------------------------------------------ las bocanadas: entran por un lado, a la altura de la cara, y se van apagando */
  function puff(side, pw, at) { BR.push({ side, y: 0.26 + rnd() * 0.44, t0: at, dur: 1.5 + rnd() * 0.7, pw, tilt: (rnd() - 0.5) * 0.5, seed: rnd() * 40 }); }
  function breathe(now, dt, slow) {
    if (on && now > nextAt) {                                                 // mientras la ficha siga puesta, sigue fumando: una de cada lado, y de vez en cuando las dos
      turn = -turn; puff(turn, 0.55 + rnd() * 0.3, now); if (rnd() < 0.3) puff(-turn, 0.45 + rnd() * 0.3, now + 300 + rnd() * 600);
      nextAt = now + (2300 + rnd() * 1900) / slow;
    }
    for (let i = BR.length - 1; i >= 0; i--) {
      const b = BR[i], t = (now - b.t0) / 1000 * slow; if (t < 0) continue; if (t > b.dur) { BR.splice(i, 1); continue; }
      const e = Math.min(1, t / 0.14) * Math.exp(-t / (b.dur * 0.4)) * b.pw; if (e < 0.02) continue;
      const y = b.y + 0.035 * Math.sin(t * 2.3 + b.seed), U = 350 * e * (V.r.h / 128), gush = 0.6 + 0.4 * Math.sin(t * 10 + b.seed * 3);
      const up = (b.tilt + 0.7 * Math.sin(t * 6.1 + b.seed) + 0.45 * Math.sin(t * 14.7 + b.seed * 2)) * U * 0.6;        // el chorro culebrea: de ahi salen las volutas
      splat(V, [b.side < 0 ? 0.03 : 0.97, y], [0.12, 0.1], Z3, [-b.side * U * gush, up, 0], Math.min(1, 12 * dt));
      splat(D, [b.side < 0 ? -0.02 : 1.02, y], [0.14, 0.125], [44 * e * gush * dt, 0, 0], Z3, 0, 0.5, b.seed + t * 0.9);  // y el humo que lleva
    }
  }
  /* la mano del jugador: el aire va con ella (la velocidad del raton, en celdas) y el humo se aclara por donde pasa; con brio, suena el soplo */
  function hand(now, dt) {
    const p = ptr ? ptr() : null; if (!p) return;
    if (!HND.ok) { HND.x = p.x; HND.y = p.y; HND.ok = true; return; }
    const dx = p.x - HND.x, dy = p.y - HND.y, d = Math.hypot(dx, dy); if (d < 0.5) return;
    const sp = d / dt, cell = V.r.h / Math.max(1, H), r = clamp(52 + sp * 0.022, 52, 120) / Math.max(1, H), n = Math.min(5, Math.ceil(d / (r * H * 0.7)));
    const vel = [clamp(dx / dt * cell, -900, 900), clamp(-dy / dt * cell, -900, 900), 0], thin = clamp((sp - 250) / 3200, 0, 1) * Math.min(0.3, 4 * dt);
    for (let i = 1; i <= n; i++) {
      const pt = [(HND.x + dx * i / n) / Math.max(1, W), 1 - (HND.y + dy * i / n) / Math.max(1, H)];
      splat(V, pt, [r, r], Z3, vel, 0.85);
      if (thin > 0.004) splat(D, pt, [r * 0.8, r * 0.8], Z3, Z3, thin);
    }
    HND.x = p.x; HND.y = p.y;
    HND.acc = HND.acc * Math.exp(-dt / 0.3) + d; if (HND.acc > 300 && now - HND.at > 480 && k > 0.5) { HND.at = now; say("sweep", clamp(HND.acc / 900, 0.2, 1)); HND.acc = 0; }
  }

  /* ------------------------------------------------------------------ cada fotograma: soplar, mover el aire, llevar el humo y pintarlo */
  function frame(now) {
    raf = 0; if (!gl || !cv.isConnected) return;
    if (!ready()) { if (!P) return drop(); last = now; raf = requestAnimationFrame(frame); return; }
    const slow = reduce() ? 0.5 : 1, rdt = Math.min(1 / 30, Math.max(1 / 240, (now - last) / 1000)), dt = rdt * slow; last = now;
    if (!fit()) { on = false; drop(); return; }
    k += ((on ? 1 : 0) - k) * (1 - Math.exp(-rdt / (on ? 0.25 : 1.3)));
    breathe(now, dt, slow); hand(now, rdt);
    const vpx = [1 / V.r.w, 1 / V.r.h];
    run("curl", C, { uV: V.r });
    run("vort", V.w, { uV: V.r, uC: C, uD: D.r, dt, curl: 14, buoy: 1.5 }); V.swap();
    run("div", Dv, { uV: V.r });
    run("scale", Pr.w, { uS: Pr.r, k: 0.8 }); Pr.swap();
    for (let i = 0; i < N; i++) { run("press", Pr.w, { uP: Pr.r, uDv: Dv }); Pr.swap(); }
    run("grad", V.w, { uP: Pr.r, uV: V.r }); V.swap();
    run("advect", V.w, { uV: V.r, uS: V.r, vpx, dt, diss: 0.45, blur: 0 }); V.swap();
    run("advect", D.w, { uV: V.r, uS: D.r, vpx, dt, diss: on ? 0.06 : 1, blur: Math.min(0.35, 7 * dt) }); D.swap();   // quitada la ficha, se deshace en un par de segundos
    run("show", null, { uD: D.r, dpx: [1 / D.r.w, 1 / D.r.h], uA: clamp(k * 1.15, 0, 1), uT: now / 1000 });
    if (on || now - offAt < 5500) raf = requestAnimationFrame(frame);
    else { cv.classList.remove("on"); for (const o of [V, D, Pr, C, Dv]) free(o); V = D = Pr = C = Dv = null; grid = ""; }   // se acabo: suelta las texturas (la proxima vez empieza en limpio)
  }
  function kick() { if (!raf && gl) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function mount() {
    if (cv.parentNode !== host) host.insertBefore(cv, host.firstChild);                         // por debajo de la lluvia, del cristal y del apagon de la mesa
    if (window.ResizeObserver) { if (!ro) ro = new ResizeObserver(() => { hw = host.clientWidth; hh = host.clientHeight; }); ro.disconnect(); ro.observe(host); }
    cv.classList.add("on");
  }

  M.on = (h, p) => {
    if (!h) return false; host = h; ptr = p || null;
    if (on) return true;
    if (!gl && !init()) return false;
    mount(); on = true; HND.ok = false;
    const now = performance.now(); BR.length = 0; puff(-1, 1, now); puff(1, 1, now + 420); nextAt = now + 2700; turn = 1;   // la primera calada: una bocanada grande por cada lado
    say("gust"); kick(); return true;
  };
  M.off = () => { if (!on) return; on = false; offAt = performance.now(); BR.length = 0; kick(); };
  M.isOn = () => on;
})(window.AIQ);
