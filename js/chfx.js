/*
 * Geolite - FX PREMIUM de los retos (v0.33). Los efectos se dibujan a resolucion completa sobre el mapa:
 *   - lienzo WebGL: humo de puro volumetrico, apagon con linterna y motas de polvo, punto ciego con aura, corte de luz y destellos
 *   - lienzo 2D nitido: lluvia (estelas, salpicaduras, regueros), rayos ramificados, cristal roto, huellas, bisel de la lupa,
 *     anillo del sello y bordes de pelicula en negativo
 *   - capas DOM con backdrop-filter donde hay que emborronar lo de debajo de verdad (gotas en el cristal, huellas, esquirlas)
 *   - retos de CUARTA PARED: ventanas de error falsas y bateria baja (estos dos viven fuera del mapa, sobre la pantalla entera)
 * Solo trabaja mientras hay algo activo. Si no hay WebGL2, js/challenges.js vuelve a sus capas CSS de siempre.
 *
 *   A.chfx.attach(ov)            A.chfx.ok()                 A.chfx.set(list, par, fx)     A.chfx.clear()
 *   A.chfx.cut(len, dim, done)   corte de luz                A.chfx.strike()               rayo con destello
 *   A.chfx.puff(x, y)            voluta del cursor fantasma  A.chfx.trail(x, y)            estela del cursor con retraso
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const X = A.chfx = {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = Math.random, TAU = Math.PI * 2;
  let qr = null;                                                       // azar con semilla de la pregunta (solo en el Reto diario, ver X.set); en la Aventura, Math.random
  const R = tag => (qr ? qr[tag] || (qr[tag] = A.rng(qr.key + ":" + tag)) : rnd);
  const say = (k, ...a) => { try { A.sfx[k] && A.sfx[k](...a); } catch (e) { /* audio no listo */ } };
  const reduce = () => document.documentElement.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;   // el ajuste del juego o el del sistema, como el resto del juego
  /* Destellos suaves (Ajustes > Accesibilidad > Movimiento Suave o Minimo (v0.3.2), apagado por defecto; "reducir movimiento" del juego o del sistema tambien lo activa): cada Rayo es un solo
     fundido y los cortes de luz se apagan y se encienden sin chisporrotear. Sin el, todo sigue igual de intenso */
  const soft = A.softFlash = () => document.documentElement.classList.contains("soft-flash") || reduce();
  const game = () => (A.core && A.core.S) || {};
  const seeded = s => (A.rng ? A.rng(String(s)) : Math.random);
  const L6 = s => (A.L6 ? A.L6(s) : { es: s.split("|")[0] });
  const tx = o => (A.tx ? A.tx(o) : o.es);

  let ov = null, glCv = null, gl = null, prog = null, cv = null, g2 = null, raf = 0, W = 0, H = 0, K = 1, D2 = 1, last = 0, glTried = false, psc = null, linked = false, shs = [], lostAt = 0;
  const U = {}, t0 = performance.now(), timers = [], DM = { r: 0 };   // DM: el ultimo radio del foco (un jefe lo cierra de pregunta en pregunta)
  const E = { dark: null, spot: null, smoke: null, rain: null, lens: null, seal: null, film: null, crack: null, prints: null, batt: null, wins: null, cut: { v: 0, tv: 0, e: 0, b: 0, bt: 0, soft: false }, flash: 0, fseq: null, bolts: [], puffs: [], trail: [], sparks: [], shades: [], wipes: [], teth: null, wind: null, night: null };
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const ptr = () => (A.chal && A.chal.state && A.chal.state.px) || { x: W / 2, y: H / 2 };

  /* ------------------------------------------------------------------ WebGL: un unico pase a pantalla completa */
  const VS = `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2. - 1., 0., 1.); }`;
  const FS = `#version 300 es
precision highp float;
uniform vec2 uR, uP; uniform float uK, uT, uFlash; uniform vec4 uDark, uSpot, uSmoke, uCut, uNight; uniform sampler2D uMask; uniform vec3 uPush;
out vec4 o;
const float TAU = 6.2831853;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), u.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; } return s; }
vec4 over(vec4 d, vec4 s){ return s + d * (1. - s.a); }
void main(){
  vec2 fc = gl_FragCoord.xy, px = vec2(fc.x, uR.y - fc.y) / uK, vw = uR / uK;
  float T = uT; vec4 c = vec4(0.);
  if (uSmoke.x > 0.) {                                   // humo de puro: ruido con dominio deformado, iluminado por las lamparas de la sala
    vec2 dp = px - uP, q = (px - uPush.xy * exp(-dot(dp, dp) / 52000.)) / 290. + uSmoke.w * vec2(7.3, 3.1);   // tanda 7: el raton empuja el humo
    vec2 w = vec2(fbm(q * 1.3 + vec2(T * .045, -T * .02)), fbm(q * 1.3 + vec2(5.2, 1.3) + vec2(-T * .03, T * .035)));
    vec2 qq = q + 2.2 * w + vec2(T * .06, T * .015);
    float d = fbm(qq), d2 = fbm(qq + vec2(.11, .15)), wisp = fbm(q * 3.1 + w * 1.4 - vec2(T * .09, 0.));
    float th = .555 - uSmoke.y * .275, a = smoothstep(th, th + .12, d);          // calibrado: ~cobertura% del mapa tapado (0,18 -> 20 %, 0,4 -> 42 %)
    float lit = clamp(.55 + (d - d2) * 3.6 + (wisp - .5) * .5, 0., 1.);
    vec3 col = mix(vec3(.3, .32, .4), vec3(.95, .9, .83), lit * .7 + .2 * d);
    col = mix(col, vec3(1., .8, .55), .17 * (1. - px.y / vw.y));
    float haze = .14 * smoothstep(th - .2, th + .08, d) + .1 * smoothstep(.55, .8, wisp) * smoothstep(th - .3, th, d);
    a = clamp(a * .95 + haze, 0., .965) * uSmoke.x;
    if (uSmoke.z > 0.) a *= smoothstep(uSmoke.z * .55, uSmoke.z, length(px - uP));
    a *= 1. - texture(uMask, px / vw).a * .97;                       // tanda 7: lo que has barrido (se cierra solo)
    c = over(c, vec4(col * a, a));
  }
  if (uDark.x > 0.) {                                    // apagon: linterna viva (borde que respira), grano en la sombra y motas de polvo en el haz
    float r = uDark.y, d = length(px - uP), an = atan(px.y - uP.y, px.x - uP.x);
    float fl = 1. + .012 * sin(T * 29.) + .008 * sin(T * 13.7 + 1.);
    float L = 1. - smoothstep(r * .3 * fl, r * fl + (vn(vec2(an * 2.2, T * .8)) - .5) * r * .07, d);
    L = L * L * (3. - 2. * L);
    float a = uDark.z * (1. - L) * uDark.x, g = (h21(fc + fract(T * 13.) * 91.) - .5) * .045;
    c = over(c, vec4((vec3(.006, .014, .022) + g) * a, a));
    bool spot = uDark.w > .5;
    c.rgb += (spot ? vec3(1., .74, .38) : vec3(1., .88, .66)) * L * (spot ? .13 : .05) * uDark.x;
    if (spot) { float ring = exp(-pow((d - r * fl * .97) / 2.4, 2.)); c.rgb += vec3(1., .82, .45) * ring * .6 * uDark.x; c.a = max(c.a, ring * .3 * uDark.x); }
    vec2 gp = px / 30. + vec2(T * .06, -T * .1), id = floor(gp), f = fract(gp) - .5;
    float h = h21(id);
    vec2 pos = (vec2(h21(id + 3.1), h21(id + 7.7)) - .5) * .7 + .1 * vec2(sin(T * .8 + h * 6.), cos(T * .6 + h * 9.));
    float mote = smoothstep(.075, 0., length(f - pos)) * step(.6, h) * max(0., .45 + .55 * sin(T * 1.7 + h * 40.));
    c.rgb += vec3(1., .93, .78) * mote * L * .5 * uDark.x;
  }
  if (uSpot.x > 0.) {                                    // punto ciego: vacio con borde organico y aura centelleante (escotoma)
    vec2 v = px - uP; float r = uSpot.y, d = length(v), an = atan(v.y, v.x);
    float e = r * (1. + .09 * (fbm(vec2(an * 1.3 + T * .25, T * .35)) - .5) * 2.);
    float core = 1. - smoothstep(e - 1.5, e + 1.5, d);
    float sw = fbm(vec2(an * 3. - T * .6 + d * .02, d * .045 - T * .4));
    vec3 inner = mix(vec3(0.), vec3(.09, .03, .14), sw * sw * smoothstep(0., r, d));
    float band = smoothstep(e - 1., e + 2., d) * (1. - smoothstep(e + 5., e + 15., d));
    float teeth = step(.5, fract(an * 5.73 + T * 1.3 + sin(d * .7 - T * 4.) * .12));
    vec3 hue = mix(vec3(.92, .95, 1.), .55 + .45 * cos(TAU * (an / TAU * 2. + T * .22 + vec3(0., .33, .67))), .5);
    float sh = band * (.45 + .55 * teeth), shadow = (1. - smoothstep(e, e + 30., d)) * .5;
    c = over(c, vec4(0., 0., 0., shadow * (1. - core) * uSpot.x));
    c = over(c, vec4(hue * sh * .7, sh * .42) * (1. - core) * uSpot.x);
    c = over(c, vec4(inner * core, core) * uSpot.x);
  }
  if (uCut.x > 0.) {                                     // corte de luz: la sala a oscuras, solo el piloto rojo de emergencia
    float a = uCut.x * .99;
    c = over(c, vec4(vec3(.004, .008, .006) * a, a));
    float eg = exp(-length(px - vec2(0., vw.y)) / 240.) + exp(-length(px - vw) / 240.) + .5 * exp(-abs(px.y - vw.y) / 60.);
    c.rgb += vec3(.85, .06, .04) * eg * .22 * uCut.y * uCut.x;
    if (uCut.z > 0.) { float ln = step(.72, h21(vec2(floor(px.y / 2.), floor(T * 40.)))) * uCut.z * .22; c = over(c, vec4(vec3(.55, .7, .62) * ln, ln)); }
  }
  if (uNight.x > 0.) {                                   // tanda 15: noche de tormenta, el mapa casi negro (costas al 10 %); el rayo lo alumbra (uNight.y)
    float g = clamp(uNight.y, 0., 1.), lit = g * g * (3. - 2. * g), a = uNight.x * (.04 + .86 * (1. - lit));
    float cl = vn(px / 260. + vec2(T * .03, 0.)) * .6 + vn(px / 90. - vec2(0., T * .05)) * .4;
    vec3 col = vec3(.012, .02, .05) + vec3(.02, .03, .06) * cl * (1. - lit);
    c = over(c, vec4(col * a, a));
    c.rgb += vec3(.4, .5, 1.) * lit * .06 * uNight.x;
  }
  if (uFlash > 0.) c = over(c, vec4(vec3(.92, .95, 1.) * uFlash, uFlash));
  o = c;
}`;
  function initGL() {
    if (glTried) return gl; glTried = true;
    try {
      glCv = document.createElement("canvas"); glCv.className = "chx-gl";
      gl = glCv.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" });
      if (!gl) return null;
      /* se compila sin esperar al resultado: con KHR_parallel_shader_compile el driver lo hace en segundo plano y ready() solo pregunta si ya esta.
         Antes se esperaba aqui mismo: ~300 ms con la pantalla congelada al empezar la primera Aventura */
      psc = gl.getExtension("KHR_parallel_shader_compile");
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); shs.push(s); return s; };
      prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
      gl.bindVertexArray(gl.createVertexArray());
      glCv.addEventListener("webglcontextlost", e => { e.preventDefault(); gl = prog = psc = null; linked = false; shs.length = 0; SM.tex = null; lostAt = performance.now(); });   // se rehace en tick() (regl), como el mapa (map.js _revive)
    } catch (e) { console.warn("chfx: sin WebGL2", e); gl = null; }
    return gl;
  }
  /* programa listo para dibujar? Sin bloquear mientras se compila; si fallara, sin WebGL (js/challenges.js vuelve a sus capas CSS) */
  function ready() {
    if (linked) return true; if (!gl || !prog) return false;
    if (psc && !gl.getProgramParameter(prog, psc.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn("chfx: sin WebGL2", gl.getProgramInfoLog(prog), ...shs.map(s => gl.getShaderInfoLog(s))); gl = null; return false; }
    for (const n of ["uR", "uP", "uK", "uT", "uFlash", "uDark", "uSpot", "uSmoke", "uCut", "uNight", "uMask", "uPush"]) U[n] = gl.getUniformLocation(prog, n);
    return (linked = true);
  }
  /* se deja compilando en un rato libre nada mas arrancar: cuando llegue el primer reto ya esta listo */
  { const idle = (fn, ms) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: ms }) : setTimeout(fn, ms));
    addEventListener("load", () => idle(() => { initGL(); idle(ready, 6000); }, 5000), { once: true }); }

  /* ------------------------------------------------------------------ lienzos y capas */
  const part = cls => { let el = ov.querySelector("." + cls); if (!el) { el = document.createElement("div"); el.className = cls; ov.appendChild(el); } return el; };
  X.attach = o => {
    if (!o || (ov === o && glCv && glCv.isConnected)) return;
    ov = o; initGL();
    if (!cv) { cv = document.createElement("canvas"); cv.className = "chx-2d"; g2 = cv.getContext("2d"); }
    for (const cls of ["chx-wet", "chx-drops", "chx-shards", "chx-prints"]) part(cls);
    if (glCv) ov.appendChild(glCv);
    ov.appendChild(cv); part("chx-wins"); ov.appendChild(ov.querySelector(".chx-wins"));
    /* el tamano de la capa se apunta cuando cambia (ResizeObserver): leer clientWidth en cada fotograma obligaba a maquetar la pagina a mitad del dibujo */
    if (window.ResizeObserver) { if (!ro) ro = new ResizeObserver(() => { ovW = ov.clientWidth; ovH = ov.clientHeight; }); ro.disconnect(); ro.observe(ov); }
    ovW = ov.clientWidth; ovH = ov.clientHeight;
    W = 0; size();
  };
  let ro = null, ovW = 0, ovH = 0;
  X.ok = () => !!(gl && ov);
  X._tick = (n = 1, ms = 16) => { for (let i = 0; i < n; i++) { last -= ms; tick(performance.now()); } return !!raf; };   // depuracion: avanza fotogramas sin requestAnimationFrame (pestana oculta)
  function size() {
    if (!ov) return false;
    const w = (ro ? ovW : ov.clientWidth) || innerWidth, h = (ro ? ovH : ov.clientHeight) || innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    const k = Math.max(0.5, dpr * ({ low: 0.45, high: 0.85 }[game().quality] || 0.65));
    if (w === W && h === H && k === K && dpr === D2) return false;
    W = w; H = h; K = k; D2 = dpr;
    if (glCv) { glCv.width = Math.max(2, Math.round(W * K)); glCv.height = Math.max(2, Math.round(H * K)); }
    cv.width = Math.max(2, Math.round(W * D2)); cv.height = Math.max(2, Math.round(H * D2));
    return true;
  }
  const busy = () => !!(E.night || E.dark || E.spot || E.smoke || E.rain || E.lens || E.seal || E.film || E.crack || E.prints || E.batt || E.cut.v > 0.001 || E.cut.tv > 0.001 || E.flash > 0.001 || E.fseq || E.bolts.length || E.puffs.length || E.trail.length || E.sparks.length || E.shades.length || E.wipes.length || E.teth || E.wind);
  function kick() { if (!raf && ov) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  /* la GPU se reinicio: a los 1,5 s, lienzo y programa nuevos en el mismo sitio; si aun no se puede, otro intento 1,5 s despues (mientras haya efectos) */
  function regl(now) {
    lostAt = 0; const old = glCv; glTried = false; glCv = null; initGL();
    if (gl && glCv) { if (old && old.parentNode) old.replaceWith(glCv); else if (ov && cv) ov.insertBefore(glCv, cv); W = 0; size(); }
    else { gl = null; glCv = old; lostAt = now; }
  }
  function tick(now) {
    raf = 0; if (!ov || !ov.isConnected) return;
    if (lostAt && now - lostAt > 1500) regl(now);
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    if (size()) rebuild();
    step(dt, now); drawGL(now); draw2D(now);
    if (busy()) raf = requestAnimationFrame(tick);
    else { if (glCv) glCv.classList.remove("on"); cv.classList.remove("on"); }
  }
  /* cada efecto continuo entra y sale con un fundido (k -> on) */
  const keep = (o, props) => Object.assign(o || { k: 0 }, props, { on: 1 });
  const fadeK = (o, dt, tau = 0.18) => { o.k += (o.on - o.k) * (1 - Math.exp(-dt / tau)); return o.on || o.k > 0.01; };
  function step(dt, now) {
    for (const n of ["dark", "spot", "smoke", "lens", "seal", "film", "night"]) if (E[n] && !fadeK(E[n], dt)) E[n] = null;
    if (E.dark && E.dark.tr != null && E.dark.r !== E.dark.tr) { E.dark.r += (E.dark.tr - E.dark.r) * (1 - Math.exp(-dt / (E.dark.fast || 0.55))); if (Math.abs(E.dark.r - E.dark.tr) < 0.4) E.dark.r = E.dark.tr; }
    if (E.night) nightStep(E.night, dt, now);
    if (E.rain) { if (fadeK(E.rain, dt, 0.25)) stepRain(E.rain, dt, now); else { E.rain = null; part("chx-drops").innerHTML = ""; } }
    if (E.crack && !E.crack.on) { E.crack.k -= dt / 0.35; if (E.crack.k <= 0) { E.crack = null; part("chx-shards").innerHTML = ""; } }
    if (E.prints && !E.prints.on) { E.prints.k -= dt / 0.45; if (E.prints.k <= 0) { E.prints = null; part("chx-prints").innerHTML = ""; } }
    if (E.batt) stepBatt(E.batt, dt, now);
    const c = E.cut; if (c.v !== c.tv) c.v = c.soft ? (Math.abs(c.tv - c.v) < 0.004 ? c.tv : c.v + (c.tv - c.v) * (1 - Math.exp(-dt / 0.09))) : c.tv;   // suave: fundido de ~0,2 s
    c.e += ((c.v > 0.9 ? 1 : 0) - c.e) * (1 - Math.exp(-dt / (c.v > 0.9 ? 0.35 : 0.08))); c.b = now < c.bt ? 1 : 0;
    if (E.fseq) { const t = now - E.fseq.t0; E.flash = E.fseq.soft ? softA(t) * 0.62 : t < 55 ? 1 : t < 120 ? 0.18 : t < 200 ? 0.92 : 0.55 * Math.exp(-(t - 200) / 140); if (t > (E.fseq.soft ? 1500 : 900)) { E.fseq = null; E.flash = 0; } }
    else if (E.flash > 0) E.flash = E.flash < 0.004 ? 0 : E.flash * Math.exp(-dt / 0.12);
    E.bolts = E.bolts.filter(b => now - b.t0 < 1400);
    E.puffs = E.puffs.filter(p => now - p.t0 < 700);
    E.trail = E.trail.filter(p => now - p.t < 260);
    if (E.smoke && E.smoke.on) sweepStep(dt, now);
    if (E.sparks.length) { for (const s of E.sparks) { s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; } E.sparks = E.sparks.filter(s => now - s.t0 < s.life); }
    E.shades = E.shades.filter(s => now - s.t0 < s.ms); E.wipes = E.wipes.filter(w => now - w.t0 < 420);
    if (E.teth && now - E.teth.t > 140) E.teth = null;
    if (E.wind) windStep(E.wind, dt, now);
    if (E.seal) { const r = A.chal && A.chal.lensRadius ? A.chal.lensRadius() : 0; if (r > 0) E.seal.r = r; else E.seal.on = 0; }
  }
  function rebuild() {
    if (E.crack) E.crack.hits.forEach(h => { if (h.img) renderHit(h); });
    if (E.prints) E.prints.list.forEach(p => placePrint(p));
  }

  function drawGL(now) {
    if (!gl || !ready()) { if (glCv) glCv.classList.remove("on"); return; }
    const need = !!(E.night || E.dark || E.spot || E.smoke || E.cut.v > 0.001 || E.flash > 0.001);
    glCv.classList.toggle("on", need); if (!need) return;
    gl.viewport(0, 0, glCv.width, glCv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog); const p = ptr(), T = ((now - t0) / 1000) * (reduce() ? 0.35 : 1);
    gl.uniform2f(U.uR, glCv.width, glCv.height); gl.uniform1f(U.uK, K); gl.uniform1f(U.uT, T); gl.uniform2f(U.uP, p.x, p.y);
    const d = E.dark, s = E.spot, m = E.smoke;
    gl.uniform4f(U.uDark, d ? d.k : 0, d ? d.r : 0, d ? d.a : 0, d && d.warm ? 1 : 0);
    gl.uniform4f(U.uSpot, s ? s.k : 0, s ? s.r : 0, 0, 0);
    gl.uniform4f(U.uSmoke, m ? m.k : 0, m ? m.cover : 0, m ? m.hole : 0, m ? m.seed : 0);
    /* la mascara del humo barrido (96x54): una textura siempre enlazada (sin ella el navegador avisa en cada fotograma); con humo, se sube la de ahora */
    if (!SM.tex) { SM.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, SM.tex); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); }
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, SM.tex); if (m && SM.cv) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, SM.cv);
    gl.uniform1i(U.uMask, 0); gl.uniform3f(U.uPush, clamp(SM.push[0], -170, 170), clamp(SM.push[1], -170, 170), 0);
    gl.uniform4f(U.uCut, E.cut.v, E.cut.e, E.cut.b, 0); gl.uniform1f(U.uFlash, E.flash); gl.uniform4f(U.uNight, E.night ? E.night.k : 0, E.night ? E.night.g : 0, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function draw2D(now) {
    const need = !!(E.night || E.rain || E.lens || E.seal || E.film || E.crack || E.prints || E.bolts.length || E.puffs.length || E.trail.length || E.sparks.length || E.shades.length || E.wipes.length || E.teth || E.wind);
    cv.classList.toggle("on", need); if (!need) return;
    const g = g2; g.setTransform(D2, 0, 0, D2, 0, 0); g.clearRect(0, 0, W, H);
    if (E.film) drawFilm(g, E.film);
    if (E.prints) drawPrints(g, E.prints);
    if (E.rain) drawRain(g, E.rain, now);
    if (E.night) drawNight(g, E.night);
    if (E.crack) drawCrack(g, E.crack, now);
    if (E.shades.length) drawShades(g, now);
    if (E.bolts.length) drawBolts(g, now);
    if (E.wipes.length) drawWipes(g, now);
    if (E.sparks.length) drawSparks(g, now);
    if (E.seal) drawSeal(g, E.seal, now);
    if (E.lens) drawLens(g, E.lens);
    if (E.wind) drawWind(g, E.wind);
    if (E.teth) drawTether(g, E.teth, now);
    if (E.trail.length) drawTrail(g, now);
    if (E.puffs.length) drawPuffs(g, now);
  }

  /* ------------------------------------------------------------------ lluvia: estelas en 3 profundidades, salpicaduras, gotas en el cristal */
  function rainOn(dens) {
    const r = E.rain = keep(E.rain && E.rain.on ? E.rain : null, { dens, st: [], sp: [], drops: [], tr: [], tt: 0, wet: 0.35, wb: -1, sh: null, wipeAt: 0 });
    const n = Math.round(60 + dens * 250); for (let i = 0; i < n; i++) r.st.push(streak(true));
    const box = part("chx-drops"); box.innerHTML = ""; box.classList.add("on");
    const low = game().quality === "low";                                           // en calidad baja, menos gotas con backdrop-filter
    for (let i = 0, m = Math.round((low ? 4 : 10) + dens * (low ? 12 : 34)); i < m; i++) r.drops.push(glassDrop(box, true));   // tanda 7: mas gotas
    part("chx-wet").classList.add("on");
    say("rain", dens);
  }
  function streak(init) { const z = rnd(), end = H * (0.06 + rnd() * 0.98); return { x: rnd() * (W + 260) - 200, y: init ? rnd() * end : -20 - rnd() * 180, end, z, v: 650 + z * 1150, l: 9 + z * 30 + (z > 0.93 ? 34 : 0) }; }
  function glassDrop(box, init) {
    const el = document.createElement("i"); el.className = "chx-drop"; const s = 6 + rnd() ** 2.2 * 34;
    el.style.width = s.toFixed(1) + "px"; el.style.height = (s * (1.04 + rnd() * 0.18)).toFixed(1) + "px"; box.appendChild(el);
    return { el, x: rnd() * W, y: init ? rnd() * H : -30, s, vy: 0, slide: false, tt: 0, th: rnd() * 0.9, gone: false };   // th: con cuanta humedad vuelve a salir tras limpiar
  }
  /* tanda 7: la lluvia empana poco a poco (r.wet, de 0 a 1) y se limpia AGITANDO el raton: 3 cambios de sentido en 0,65 s */
  function rainShake(r, now) {
    const p = ptr(), S = r.sh || (r.sh = { lx: p.x, ly: p.y, dx: 0, dy: 0, ax: 0, ay: 0, rev: [] });
    for (const [d, dk, ak] of [[p.x - S.lx, "dx", "ax"], [p.y - S.ly, "dy", "ay"]]) {
      if (Math.abs(d) < 2) continue; const s = Math.sign(d);
      if (s !== S[dk]) { if (S[ak] > 36) S.rev.push(now); S[ak] = 0; S[dk] = s; }
      S[ak] += Math.abs(d);
    }
    S.lx = p.x; S.ly = p.y; S.rev = S.rev.filter(t => now - t < 650);
    if (S.rev.length >= 3 && now - r.wipeAt > 550) { S.rev = []; r.wipeAt = now; r.wet = 0.05; E.wipes.push({ t0: now, dir: S.dx || 1 }); for (const d of r.drops) { d.gone = true; d.el.style.opacity = 0; } r.tr.length = 0; say("wipe"); }
  }
  function stepRain(r, dt, now) {
    const sl = 0.2;
    if (r.on) { rainShake(r, now); r.wet = Math.min(1, r.wet + dt * (0.2 + r.dens * 0.22)); }
    const wb = (0.6 + r.dens * 2.4) * r.wet; if (Math.abs(wb - r.wb) > 0.04) { r.wb = wb; part("chx-wet").style.setProperty("--wb", wb.toFixed(2) + "px"); }   // solo si cambia
    for (const d of r.drops) if (d.gone && r.wet > d.th + 0.08) { Object.assign(d, { x: rnd() * W, y: rnd() * H * 0.9, vy: 0, slide: false, gone: false }); d.el.style.opacity = ""; }
    for (const s of r.st) { s.y += s.v * dt; s.x += s.v * dt * sl; if (s.y >= s.end) { if (s.z > 0.42 && r.sp.length < 90) r.sp.push({ x: s.x, y: s.end, t: now, z: s.z }); Object.assign(s, streak(false)); } }
    r.sp = r.sp.filter(p => now - p.t < 340);
    for (const d of r.drops) {
      if (!d.slide && d.s > 13 && rnd() < dt * 0.22) { d.slide = true; d.vy = 20; }
      if (d.slide) { d.vy = Math.min(190, d.vy + 240 * dt); d.y += d.vy * dt; d.x += Math.sin(now / 170 + d.s) * 0.25; if (now - d.tt > 34) { d.tt = now; r.tr.push({ x: d.x, y: d.y, w: d.s * 0.34, t: now }); } }
      if (d.y > H + 40) { Object.assign(d, { x: rnd() * W, y: -30 - rnd() * 60, vy: 0, slide: rnd() < 0.5 }); }
      d.el.style.transform = `translate(${(d.x - d.s / 2).toFixed(1)}px,${(d.y - d.s / 2).toFixed(1)}px)`;
    }
    r.tr = r.tr.filter(p => now - p.t < 1300);
  }
  function drawRain(g, r, now) {
    const k = r.k;
    if (r.tr.length) { g.lineCap = "round"; for (const p of r.tr) { const a = (1 - (now - p.t) / 1300) * 0.12 * k; g.fillStyle = `rgba(215,235,255,${a.toFixed(3)})`; g.beginPath(); g.ellipse(p.x, p.y, p.w * 0.5, p.w * 0.9, 0, 0, TAU); g.fill(); } }
    const layers = [[0, 0.42, 0.14, 1], [0.42, 0.75, 0.24, 1.2], [0.75, 0.93, 0.4, 1.7], [0.93, 1.01, 0.5, 2.3]], sl = 0.2;
    g.lineCap = "round";
    for (const [z0, z1, a, w] of layers) {
      g.strokeStyle = `rgba(200,226,255,${(a * k).toFixed(3)})`; g.lineWidth = w; g.beginPath();
      for (const s of r.st) if (s.z >= z0 && s.z < z1) { g.moveTo(s.x, s.y); g.lineTo(s.x - s.l * sl, s.y - s.l); }
      g.stroke();
      g.strokeStyle = `rgba(235,246,255,${(Math.min(1, a * 1.8) * k).toFixed(3)})`; g.beginPath();
      for (const s of r.st) if (s.z >= z0 && s.z < z1) { g.moveTo(s.x, s.y); g.lineTo(s.x - s.l * sl * 0.3, s.y - s.l * 0.3); }
      g.stroke();
    }
    g.lineWidth = 1;
    for (const p of r.sp) {
      const q = (now - p.t) / 340, rr = 1.5 + q * (3 + p.z * 7), a = (1 - q) * 0.5 * p.z * k;
      g.strokeStyle = `rgba(215,236,255,${a.toFixed(3)})`; g.beginPath(); g.ellipse(p.x, p.y, rr, rr * 0.42, 0, 0, TAU); g.stroke();
      g.fillStyle = `rgba(230,244,255,${(a * 1.2).toFixed(3)})`;
      for (let j = -1; j <= 1; j += 2) { const tx_ = p.x + j * (2 + q * 6), ty = p.y - Math.sin(q * Math.PI) * (4 + p.z * 5); g.fillRect(tx_ - 0.8, ty - 0.8, 1.6, 1.6); }
    }
  }

  /* ------------------------------------------------------------------ rayos: trazo ramificado (desplazamiento del punto medio) y destello doble */
  function boltPts(x0, y0, x1, y1, amp, it) {
    let pts = [[x0, y0], [x1, y1]];
    for (let i = 0; i < it; i++) { const nx = []; for (let j = 0; j < pts.length - 1; j++) { const a = pts[j], b = pts[j + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, o = (rnd() - 0.5) * amp; nx.push(a, [(a[0] + b[0]) / 2 - (dy / l) * o, (a[1] + b[1]) / 2 + (dx / l) * o]); } nx.push(pts[pts.length - 1]); pts = nx; amp *= 0.55; }
    return pts;
  }
  /* tanda 7: o.near = probabilidad de caer cerca del puntero; o.shade = ms de la sombra que deja (la imagen quemada en la retina) */
  X.strike = (o = {}) => {
    if (!ov) return; kick(); size();
    const p = ptr(), near = !!o.near && rnd() < o.near, now = performance.now(), x1 = near ? clamp(p.x + (rnd() - 0.5) * 240, 40, W - 40) : W * (0.18 + rnd() * 0.64), y1 = near ? clamp(p.y + (rnd() - 0.5) * 170, H * 0.2, H - 40) : H * (0.42 + rnd() * 0.45), x0 = clamp(x1 + (rnd() - 0.5) * W * 0.4, 20, W - 20), y0 = -10, len = Math.hypot(x1 - x0, y1 - y0);
    const main = boltPts(x0, y0, x1, y1, len * 0.17, 7), br = [], dir = Math.atan2(y1 - y0, x1 - x0);
    for (let i = 0, nb = 2 + Math.floor(rnd() * 3); i < nb; i++) { const p = main[2 + Math.floor(rnd() * main.length * 0.6)], a = dir + (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.6), l = (0.16 + rnd() * 0.3) * len; br.push(boltPts(p[0], p[1], p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l, l * 0.2, 5)); }
    const sf = soft(); E.bolts.push({ t0: now, main, br, x: x1, y: y1, soft: sf }); E.fseq = { t0: now, soft: sf };
    if (o.shade) E.shades.push({ x: x1, y: y1, t0: now + 60, ms: o.shade, r: 120 + rnd() * 60 });
    later(() => say("thunder"), 40 + rnd() * 160);
  };
  const boltA = t => (t < 55 ? 1 : t < 120 ? 0.25 : t < 200 ? 1 : Math.exp(-(t - 200) / 230));
  const softA = t => (t < 170 ? (t / 170) * (t / 170) * (3 - 2 * t / 170) : Math.exp(-(t - 170) / 330));   // Destellos suaves: sube en 170 ms y se apaga despacio, sin doble pico
  function drawBolts(g, now) {
    g.save(); g.globalCompositeOperation = "lighter"; g.lineJoin = "round"; g.lineCap = "round";
    const path = pts => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); };
    for (const b of E.bolts) {
      const a = (b.soft ? softA : boltA)(now - b.t0); if (a < 0.01) continue;
      const gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, 110); gr.addColorStop(0, `rgba(190,210,255,${(0.4 * a).toFixed(3)})`); gr.addColorStop(1, "rgba(190,210,255,0)"); g.fillStyle = gr; g.fillRect(b.x - 110, b.y - 110, 220, 220);
      for (const [pts, m] of [[b.main, 1], ...b.br.map(x => [x, 0.6])]) {
        path(pts); g.strokeStyle = `rgba(120,120,255,${(0.14 * a * m).toFixed(3)})`; g.lineWidth = 28 * m; g.stroke();
        g.strokeStyle = `rgba(165,185,255,${(0.42 * a * m).toFixed(3)})`; g.lineWidth = 9 * m; g.stroke();
        g.strokeStyle = `rgba(255,255,255,${(a * (m < 1 ? 0.85 : 1)).toFixed(3)})`; g.lineWidth = 3.2 * m; g.stroke();
      }
    }
    g.restore();
  }

  /* ------------------------------------------------------------------ corte de luz (lo dispara js/challenges.js a intervalos) */
  X.cut = (len, dim, done, pat = "normal") => {
    if (!ov) return done && done(); kick();
    const on = dim ? 0.62 : 1, sf = E.cut.soft = soft();
    /* tanda 7: cada corte, a su manera (tartamudo, amago, largo); en Destellos suaves, siempre el fundido */
    const PAT = { stutter: [[on, 50, 1], [0, 60, 0], [on, 50, 1], [0, 60, 0], [on, 50, 1], [0, 70, 0], [on, len, 2], [0, 0, 3]], tease: [[on * 0.55, 90, 1], [0, 80, 0], [on * 0.7, 70, 1], [0, 60, 0], [on, len * 0.7, 2], [0, 0, 3]], long: [[on, 70, 1], [0, 90, 0], [on, len * 1.6, 2], [on * 0.3, 40, 0], [on, 120, 1], [0, 0, 3]] };
    /* suave: se va y vuelve con un fundido, sin los chispazos ni el fogonazo al volver (a oscuras, casi lo mismo que el corte intenso: 270 ms + len) */
    const seq = sf ? [[on, len + 230, 2], [0, 0, 3]] : PAT[pat] || [[on, 70, 1], [0, 90, 0], [on, 60, 1], [0.25, 40, 0], [on, len, 2], [0, 45, 0], [on * 0.7, 35, 1], [0, 0, 3]];
    const go = i => {
      if (i >= seq.length || !ov) return done && done();
      const [v, ms, snd] = seq[i]; E.cut.tv = v; if (!sf) { E.cut.v = v; E.cut.bt = performance.now() + 70; } kick();
      if (snd === 1) { say("buzz", i); if (!sf && rnd() < 0.7) sparkBurst(); } else if (snd === 2) say("powerdown"); else if (snd === 3) { say("restore"); if (!sf) E.flash = Math.max(E.flash, 0.16); }
      if (i === seq.length - 1) return done && done();
      later(() => go(i + 1), ms);
    };
    go(0);
  };

  /* ------------------------------------------------------------------ CUARTA PARED: cristal roto */
  function crackOn(n, glass) {
    const c = E.crack = { on: 1, k: 1, hits: [] }, pts = []; part("chx-shards").innerHTML = "";
    for (let i = 0; i < n; i++) {
      let fx = 0.5, fy = 0.5;
      for (let tries = 0; tries < 30; tries++) { fx = 0.2 + R("crack")() * 0.6; fy = 0.3 + R("crack")() * 0.48; if (pts.every(p => Math.hypot((p[0] - fx) * W, (p[1] - fy) * H) > Math.min(W, H) * 0.36)) break; }
      pts.push([fx, fy]); c.hits.push({ fx, fy, R: (0.21 + R("crack")() * 0.08) * Math.sqrt(glass), glass, seed: R("crack")(), at: 0, img: null });
    }
    c.hits.forEach((h, i) => later(() => land(h), 380 + i * 340));
  }
  function land(h) {
    if (!E.crack || !E.crack.on) return; renderHit(h); h.at = performance.now(); kick();
    say("glass"); const app = document.getElementById("app");
    if (app && !reduce()) { app.classList.remove("chx-punch"); A.restyle(app); app.classList.add("chx-punch"); later(() => app.classList.remove("chx-punch"), 260); }
    const sh = document.createElement("i"), r = h.Rpx * 0.6, rr = seeded(h.seed + ":s"), poly = [];   // tanda 7: la zona danada tapa de verdad (antes 0,34): mueve o acerca el mapa para ver debajo
    sh.style.setProperty("--sb", (7 + 5 * Math.sqrt(h.glass)).toFixed(1) + "px");
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, q = 0.62 + rr() * 0.38; poly.push(`${(50 + Math.cos(a) * 50 * q).toFixed(1)}% ${(50 + Math.sin(a) * 50 * q).toFixed(1)}%`); }
    sh.className = "chx-shard"; Object.assign(sh.style, { left: (h.fx * W - r) + "px", top: (h.fy * H - r) + "px", width: 2 * r + "px", height: 2 * r + "px", clipPath: `polygon(${poly.join(",")})` });
    part("chx-shards").appendChild(sh); part("chx-shards").classList.add("on");
  }
  function renderHit(h) {
    const R = (h.Rpx = Math.min(W, H) * h.R), S = Math.ceil(R * 2.4), cx = S / 2, cy = S / 2, rr = seeded(h.seed);
    const c = h.img || document.createElement("canvas"); c.width = c.height = Math.ceil(S * D2); h.img = c; h.S = S;
    const g = c.getContext("2d"); g.setTransform(D2, 0, 0, D2, 0, 0); g.clearRect(0, 0, S, S);
    const rays = [], m = 12 + Math.floor(rr() * 7), thick = new Path2D(), thin = new Path2D();
    const add = (P, pts) => pts.forEach((p, i) => (i ? P.lineTo(p[0], p[1]) : P.moveTo(p[0], p[1])));
    for (let i = 0; i < m; i++) {
      let a = ((i + rr() * 0.7) / m) * TAU, x = cx, y = cy; const pts = [[x, y]], len = R * (0.5 + rr() * 0.65);
      while (Math.hypot(x - cx, y - cy) < len) { const st = 7 + rr() * 16; a += (rr() - 0.5) * 0.42; x += Math.cos(a) * st; y += Math.sin(a) * st; pts.push([x, y]); }
      rays.push(pts); const half = Math.ceil(pts.length * 0.45); add(thick, pts.slice(0, half + 1)); add(thin, pts.slice(half));
      if (rr() < 0.45) { const s = pts[Math.floor(pts.length * (0.35 + rr() * 0.3))]; let fa = a + (rr() < 0.5 ? -1 : 1) * (0.5 + rr() * 0.5), fx = s[0], fy = s[1]; const fp = [[fx, fy]]; for (let k = 0, n = 3 + Math.floor(rr() * 4); k < n; k++) { fa += (rr() - 0.5) * 0.5; fx += Math.cos(fa) * (6 + rr() * 12); fy += Math.sin(fa) * (6 + rr() * 12); fp.push([fx, fy]); } add(thin, fp); }
    }
    const at = (pts, r) => pts.find(p => Math.hypot(p[0] - cx, p[1] - cy) >= r);
    for (const f of [0.15, 0.29, 0.46, 0.68]) {
      for (let i = 0; i < m; i++) {
        if (rr() < (f > 0.4 ? 0.45 : 0.2)) continue;
        const p = at(rays[i], R * f * (0.9 + rr() * 0.2)), q = at(rays[(i + 1) % m], R * f * (0.9 + rr() * 0.2)); if (!p || !q) continue;
        const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, ox = (mx - cx) * (rr() * 0.12 - 0.04), oy = (my - cy) * (rr() * 0.12 - 0.04);
        (f < 0.3 ? thick : thin).moveTo(p[0], p[1]); (f < 0.3 ? thick : thin).quadraticCurveTo(mx + ox, my + oy, q[0], q[1]);
      }
    }
    for (let i = 0; i < m; i++) {                                          // facetas que cogen la luz
      if (rr() < 0.45) continue; const p = at(rays[i], R * 0.29), q = at(rays[(i + 1) % m], R * 0.29); if (!p || !q) continue;
      g.fillStyle = rr() < 0.6 ? `rgba(235,245,255,${(0.05 + rr() * 0.12).toFixed(3)})` : `rgba(0,12,24,${(0.08 + rr() * 0.1).toFixed(3)})`;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.closePath(); g.fill();
    }
    const cr = R * 0.12; g.beginPath();                                    // nucleo triturado
    for (let i = 0; i <= 18; i++) { const a = (i / 18) * TAU, q = cr * (0.7 + rr() * 0.45); i ? g.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q) : g.moveTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); }
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, cr * 1.2); gr.addColorStop(0, "rgba(255,255,255,.78)"); gr.addColorStop(0.55, "rgba(225,238,255,.5)"); gr.addColorStop(1, "rgba(200,220,255,.12)"); g.fillStyle = gr; g.fill();
    for (let i = 0; i < 34; i++) { const a = rr() * TAU, d0 = rr() * cr * 1.5, l = 3 + rr() * 9, b = a + (rr() - 0.5) * 1.6; thin.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0); thin.lineTo(cx + Math.cos(a) * d0 + Math.cos(b) * l, cy + Math.sin(a) * d0 + Math.sin(b) * l); }
    g.lineJoin = "round"; g.lineCap = "round";
    for (const [P, w] of [[thick, 1.45], [thin, 0.8]]) {
      g.save(); g.translate(0.9, 1.1); g.strokeStyle = "rgba(0,6,14,.6)"; g.lineWidth = w + 1; g.stroke(P); g.restore();
      g.strokeStyle = "rgba(170,215,255,.2)"; g.lineWidth = w + 1.8; g.stroke(P);
      g.strokeStyle = "rgba(255,255,255,.96)"; g.lineWidth = w * 0.8; g.stroke(P);
    }
    for (let i = 0; i < 6; i++) {                                         // destellos: el cristal roto coge la luz de la sala
      const ray = rays[Math.floor(rr() * m)], p = ray[Math.floor(rr() * ray.length)], L = 3 + rr() * 6, hue = [[255, 255, 255], [255, 255, 255], [255, 226, 180], [190, 228, 255]][Math.floor(rr() * 4)];
      const gr2 = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], L * 1.6); gr2.addColorStop(0, `rgba(${hue},.9)`); gr2.addColorStop(1, `rgba(${hue},0)`); g.fillStyle = gr2; g.fillRect(p[0] - L * 2, p[1] - L * 2, L * 4, L * 4);
      g.strokeStyle = `rgba(${hue},.85)`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(p[0] - L, p[1]); g.lineTo(p[0] + L, p[1]); g.moveTo(p[0], p[1] - L); g.lineTo(p[0], p[1] + L); g.stroke();
    }
  }
  function drawCrack(g, c, now) {
    g.save(); g.globalAlpha = clamp(c.k, 0, 1);
    for (const h of c.hits) {
      if (!h.img || !h.at) continue; const x = h.fx * W, y = h.fy * H, q = Math.min(1, (now - h.at) / 120);
      if (q < 1) { g.save(); g.beginPath(); g.arc(x, y, h.S * 0.5 * (0.15 + 0.85 * q), 0, TAU); g.clip(); }
      g.drawImage(h.img, x - h.S / 2, y - h.S / 2, h.S, h.S);
      if (q < 1) { g.restore(); g.fillStyle = `rgba(255,255,255,${(0.5 * (1 - q)).toFixed(3)})`; g.beginPath(); g.arc(x, y, 40 + q * 60, 0, TAU); g.fill(); }
    }
    g.restore();
  }

  /* ------------------------------------------------------------------ CUARTA PARED: pantalla sucia (huellas dactilares grasientas) */
  function printsOn(n, blurPx, glass) {
    const p = E.prints = { on: 1, k: 1, list: [] }, box = part("chx-prints"); box.innerHTML = ""; box.classList.add("on");
    const spots = [];
    for (let i = 0; i < n; i++) {
      let fx = 0.5, fy = 0.5;
      for (let tries = 0; tries < 30; tries++) { fx = 0.16 + R("prints")() * 0.68; fy = 0.24 + R("prints")() * 0.56; if (spots.every(s => Math.hypot((s[0] - fx) * W, (s[1] - fy) * H) > 150)) break; }
      spots.push([fx, fy]);
      const w = (120 + R("prints")() * 55) * Math.sqrt(glass), el = document.createElement("i"), sm = document.createElement("i"); el.className = "chx-print"; sm.className = "chx-print smear"; box.append(sm, el);
      const pr = { fx, fy, w, h: w * 1.32, rot: (R("prints")() - 0.5) * 1.3, seed: R("prints")(), el, sm, blur: blurPx, dir: R("prints")() * TAU, len: w * (0.9 + R("prints")() * 0.9) };
      el.style.setProperty("--pb", blurPx.toFixed(2) + "px"); sm.style.setProperty("--pb", (blurPx * 1.25).toFixed(2) + "px"); p.list.push(pr); placePrint(pr);
    }
    later(() => say("smear"), 250);
  }
  function placePrint(pr) {
    Object.assign(pr.el.style, { left: (pr.fx * W - pr.w / 2) + "px", top: (pr.fy * H - pr.h / 2) + "px", width: pr.w + "px", height: pr.h + "px", transform: `rotate(${pr.rot}rad)` });
    const sx = pr.fx * W + Math.cos(pr.dir) * pr.len * 0.5, sy = pr.fy * H + Math.sin(pr.dir) * pr.len * 0.5, sw = pr.len + pr.w * 0.6, sgh = pr.w * 0.55;   // arrastre del dedo
    Object.assign(pr.sm.style, { left: (sx - sw / 2) + "px", top: (sy - sgh / 2) + "px", width: sw + "px", height: sgh + "px", transform: `rotate(${pr.dir}rad)` });
    const w = pr.w, h = pr.h, c = pr.img || document.createElement("canvas"); pr.img = c; c.width = Math.ceil(w * D2); c.height = Math.ceil(h * D2);
    const g = c.getContext("2d"), rr = seeded(pr.seed), cx = w * (0.48 + rr() * 0.06), cy = h * (0.56 + rr() * 0.06), loop = rr() < 0.55, sp = 4.3;
    g.setTransform(D2, 0, 0, D2, 0, 0); g.clearRect(0, 0, w, h); g.lineWidth = 1.45; g.strokeStyle = "rgba(255,250,240,.9)";
    for (let k = 1; k * sp < Math.max(w, h) * 0.78; k++) {
      const r0 = k * sp, ph = rr() * TAU; g.beginPath();
      for (let s = 0; s <= 96; s++) {
        const a = (s / 96) * TAU, wob = Math.sin(a * 3 + k * 0.4 + ph) * 1.1 + Math.sin(a * 7 - k * 0.2) * 0.5;
        const x = cx + Math.cos(a) * (r0 * 0.8 + wob), y = cy + Math.sin(a) * (r0 * 1.02 + wob) - (loop ? Math.max(0, -Math.sin(a)) * r0 * 0.22 : 0);
        s ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    g.globalCompositeOperation = "destination-out";                              // cortes y poros de la huella
    for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(rr() * w, rr() * h, 1 + rr() * 3.2, 0, TAU); g.fill(); }
    g.globalCompositeOperation = "destination-in";                               // silueta de yema con presion desigual
    g.save(); g.translate(w / 2, h / 2); g.scale(1, h / w); const gr = g.createRadialGradient(0, 0, 0, 0, 0, w * 0.5); gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(0.62, "rgba(0,0,0,.38)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(-w, -w, 2 * w, 2 * w); g.restore();
    g.globalCompositeOperation = "source-atop";                                  // brillo aceitoso tornasolado
    const sh = g.createLinearGradient(0, 0, w, h); sh.addColorStop(0, "rgba(255,120,200,.35)"); sh.addColorStop(0.35, "rgba(120,220,255,.25)"); sh.addColorStop(0.7, "rgba(255,230,120,.3)"); sh.addColorStop(1, "rgba(160,120,255,.3)"); g.fillStyle = sh; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "source-over";
  }
  function drawPrints(g, p) {
    g.save(); g.globalAlpha = clamp(p.k, 0, 1);
    for (const pr of p.list) {
      if (!pr.img) continue;
      g.save(); g.translate(pr.fx * W, pr.fy * H); g.rotate(pr.dir);                          // estela aceitosa del arrastre
      for (let i = -3; i <= 3; i++) { const y = i * pr.w * 0.07, a = 0.07 * (1 - Math.abs(i) / 4); const gr = g.createLinearGradient(0, 0, pr.len, 0); gr.addColorStop(0, `rgba(255,248,235,${a.toFixed(3)})`); gr.addColorStop(1, "rgba(255,248,235,0)"); g.strokeStyle = gr; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(pr.len * 0.35, y * 1.3, pr.len * 0.7, y * 0.8, pr.len, y * 0.5); g.stroke(); }
      g.restore();
      g.save(); g.translate(pr.fx * W, pr.fy * H); g.rotate(pr.rot); g.drawImage(pr.img, -pr.w / 2, -pr.h / 2, pr.w, pr.h); g.restore();
    }
    g.restore();
  }

  /* ------------------------------------------------------------------ CUARTA PARED: ventanas de error falsas */
  const WT = {
    title: L6("Geolite.exe (No responde)|Geolite.exe (Not responding)|Geolite.exe (Ne répond pas)|Geolite.exe (Não está respondendo)|Geolite.exe (Reagiert nicht)|Geolite.exe (Non risponde)|Geolite.exe (No responde)|Geolite.exe（无响应）|Geolite.exe (응답 없음)|Geolite.exe（応答なし）|Geolite.exe (Не отвечает)|Geolite.exe (Nie odpowiada)"),
    wait: L6("Esperar|Wait|Attendre|Aguardar|Warten|Attendi|Esperar|等待|기다리기|待機|Ждать|Czekaj"),
    close: L6("Cerrar|Close|Fermer|Fechar|Schließen|Chiudi|Cerrar|关闭|닫기|閉じる|Закрыть|Zamknij"),
    msgs: [
      "El mundo está cargando… o eso dice el crupier.|The world is loading… or so the dealer says.|Le monde est en cours de chargement… enfin, d'après le croupier.|O mundo está carregando… ou é o que diz o crupiê.|Die Welt lädt gerade … sagt jedenfalls der Croupier.|Il mondo si sta caricando… o almeno così dice il croupier.|El mundo está cargando… o eso dice el crupier.|世界正在加载中……至少荷官是这么说的。|세계를 불러오는 중… 이라고 딜러가 그러네요.|世界を読み込み中……とディーラーは言っている。|Мир загружается… по крайней мере, так говорит крупье.|Świat się wczytuje… a przynajmniej tak twierdzi krupier.",
      "Error 404: país no encontrado. ¿Has probado a buscarlo en el mapa?|Error 404: country not found. Have you tried looking on the map?|Erreur 404 : pays introuvable. As-tu essayé de le chercher sur la carte ?|Erro 404: país não encontrado. Já tentou procurar no mapa?|Fehler 404: Land nicht gefunden. Schon mal auf der Karte gesucht?|Errore 404: paese non trovato. Hai provato a cercarlo sulla mappa?|Error 404: país no encontrado. ¿Probaste buscarlo en el mapa?|错误 404：找不到国家。你试过在地图上找吗？|오류 404: 국가를 찾을 수 없습니다. 지도에서 찾아보셨나요?|エラー404：国が見つかりません。地図で探してみましたか？|Ошибка 404: страна не найдена. А на карте искать пробовал?|Błąd 404: nie znaleziono kraju. A może poszukać na mapie?",
      "Memoria insuficiente: demasiadas capitales en tu cabeza.|Out of memory: too many capitals in your head.|Mémoire insuffisante : trop de capitales dans ta tête.|Memória insuficiente: capitais demais na sua cabeça.|Nicht genug Speicher: zu viele Hauptstädte in deinem Kopf.|Memoria insufficiente: troppe capitali nella tua testa.|Memoria insuficiente: demasiadas capitales en tu cabeza.|内存不足：你脑子里的首都太多了。|메모리 부족: 머릿속에 수도가 너무 많습니다.|メモリ不足：頭の中に首都が多すぎます。|Недостаточно памяти: слишком много столиц в голове.|Brak pamięci: za dużo stolic w twojej głowie.",
      "El crupier ha tomado el control de tu pantalla. ¿Reintentar?|The dealer has taken over your screen. Retry?|Le croupier a pris le contrôle de ton écran. Réessayer ?|O crupiê assumiu o controle da sua tela. Tentar de novo?|Der Croupier hat deinen Bildschirm übernommen. Erneut versuchen?|Il croupier ha preso il controllo del tuo schermo. Riprovare?|El crupier tomó el control de tu pantalla. ¿Reintentar?|荷官接管了你的屏幕。要重试吗？|딜러가 화면을 장악했습니다. 다시 시도할까요?|ディーラーが画面を乗っ取りました。再試行しますか？|Крупье захватил твой экран. Повторить?|Krupier przejął twój ekran. Spróbować ponownie?",
    ].map(L6),
  };
  X._t = { wins: (n, a) => winsOn(n, a), batt: m => battOn(m) };   // pruebas (como J._nap)
  function winsOn(n, auto) {
    const box = part("chx-wins"); box.innerHTML = ""; box.classList.add("on");
    E.wins = { n }; const order = [0, 1, 2, 3].sort(() => R("wins")() - 0.5);
    for (let i = 0; i < n; i++) later(() => openWin(box, i, n, WT.msgs[order[i % 4]], auto), 450 + i * 420);
  }
  function openWin(box, i, n, msg, auto) {
    if (!E.wins) return;
    const el = document.createElement("div"); el.className = "chx-win"; el.setAttribute("role", "alertdialog");
    el.innerHTML = `<div class="cw-bar"><i class="cw-app" aria-hidden="true"></i><b>${tx(WT.title)}</b><button type="button" class="cw-x" data-a="c" aria-label="${tx(WT.close)}">✕</button></div>
      <div class="cw-body"><i class="cw-sign" aria-hidden="true">!</i><p>${tx(msg)}</p></div>
      <div class="cw-foot"><button type="button" class="cw-b" data-a="w">${tx(WT.wait)}</button><button type="button" class="cw-b cw-def" data-a="c">${tx(WT.close)}</button></div><i class="cw-prog"><i></i></i>`;
    const w = Math.min(340, W - 24), x = clamp(W * 0.5 - w / 2 + (i - (n - 1) / 2) * 70 + (R("wins")() - 0.5) * W * 0.22, 12, W - w - 12), y = clamp(H * 0.4 - 70 + i * 38 + (R("wins")() - 0.5) * H * 0.16, 70, H - 190);
    Object.assign(el.style, { left: x + "px", top: y + "px", width: w + "px" }); box.appendChild(el);
    const close = () => { if (!el.isConnected || el.classList.contains("bye")) return; el.classList.add("bye"); say("flip", false); setTimeout(() => el.remove(), 140); };
    el.addEventListener("click", e => { const b = e.target.closest("[data-a]"); if (!b) return; e.stopPropagation(); if (b.dataset.a === "w") { el.classList.add("waiting"); later(close, 900); } else close(); });
    const bar = el.querySelector(".cw-bar"); let drag = null;
    bar.addEventListener("pointerdown", e => { if (e.target.closest("button")) return; drag = [e.clientX - el.offsetLeft, e.clientY - el.offsetTop]; bar.setPointerCapture(e.pointerId); box.appendChild(el); });
    bar.addEventListener("pointermove", e => { if (drag) { el.style.left = clamp(e.clientX - drag[0], -w + 60, W - 60) + "px"; el.style.top = clamp(e.clientY - drag[1], 0, H - 40) + "px"; } });
    bar.addEventListener("pointerup", () => { drag = null; });
    say("ding");
    if (auto) later(close, auto);
  }

  /* ------------------------------------------------------------------ CUARTA PARED: bateria baja (toda la pantalla se va apagando) */
  const BT = {
    low: L6("Batería baja|Low battery|Batterie faible|Bateria fraca|Akku schwach|Batteria scarica|Batería baja|电量不足|배터리 부족|バッテリー残量低下|Низкий заряд|Słaba bateria"),
    lowDeck: L6("La luz se apaga|The lights are going out|La lumière s'éteint|A luz está se apagando|Das Licht geht aus|La luce si spegne|La luz se apaga|灯光正在熄灭|조명이 꺼지고 있어요|明かりが消えていく|Свет гаснет|Światło gaśnie"),
    plugDeck: L6("Date prisa antes de quedarte a oscuras|Hurry before it goes dark|Dépêche-toi avant le noir complet|Corra antes que fique escuro|Beeil dich, bevor es dunkel wird|Sbrigati prima che faccia buio|Apúrate antes de quedarte a oscuras|趁灯还没灭，快一点|어두워지기 전에 서두르세요|暗くなる前に急げ|Поспеши, пока не стемнело|Pospiesz się, zanim zrobi się ciemno"),
    deadDeck: L6("Se ha ido la luz|The lights went out|Plus de lumière|A luz acabou|Das Licht ist aus|È andata via la luce|Se fue la luz|灯灭了|불이 나갔어요|明かりが消えた|Свет погас|Zgasło światło"),
    plug: L6("Conecta el cargador|Plug in your charger|Branche ton chargeur|Conecte o carregador|Schließ das Ladegerät an|Collega il caricabatterie|Conecta el cargador|请连接充电器|충전기를 연결하세요|充電器を接続してください|Подключи зарядку|Podłącz ładowarkę"),
  };
  function battOn(max, eff) {
    let dim = document.getElementById("chxDim"), hud = document.getElementById("chxBat");
    if (!dim) { dim = document.createElement("div"); dim.id = "chxDim"; document.body.appendChild(dim); }
    if (!hud) { hud = document.createElement("div"); hud.id = "chxBat"; hud.innerHTML = `<div class="cb-cell"><i class="cb-lvl"></i></div><b class="cb-pct"></b><div class="cb-toast"><b></b><span></span></div>`; document.body.appendChild(hud); }
    const deck = document.documentElement.dataset.dev === "deck";                        // v0.2.34: en la Deck no es "la bateria" (la tiene de verdad): es la luz de la mesa
    hud.querySelector(".cb-toast b").textContent = tx(deck ? BT.lowDeck : BT.low); hud.querySelector(".cb-toast span").textContent = tx(deck ? BT.plugDeck : BT.plug);
    let dead = document.getElementById("chxDead"); if (!dead) { dead = document.createElement("div"); dead.id = "chxDead"; dead.innerHTML = `<div class="cd-bat"><i></i></div><b></b>`; document.body.appendChild(dead); }
    dead.querySelector("b").textContent = tx(deck ? BT.deadDeck : BT.plug); dead.classList.remove("on");
    hud.classList.remove("toast", "crit", "charge", "save"); hud.classList.add("on");
    /* tanda 7: como un movil de verdad: empieza con un 14-26 %, se descarga a saltos (zumbido y parpadeo), avisa al 20, 10 y 5 % y, desde el nivel 2, se apaga un momento al 2 % */
    E.batt = { on: 1, k: 0, max, pct: -1, toast: false, dim, hud, dead, start: Math.round(14 + R("batt")() * 12), drain: 0, toasts: {}, died: false, flick: 0, nextS: 0 }; if (eff && eff.p0 != null) { E.batt.sh = true; E.batt.start = eff.p0; E.batt.p1 = eff.p1; }   // tanda 16: la bateria de Pantallazo, una sola para toda la ronda (p0 -> p1 %)
   
  }
  function stepBatt(b, dt, now) {
    const S = game(), asking = S.phase === "asking" && !S.paused && !(A.chal && A.chal.suspended && A.chal.suspended());
    const el = asking && S.t0 ? (performance.now() - S.t0 - (S.pausedAcc || 0)) / 1000 : 0, pr = b.on ? clamp(el / Math.max(1, S.limit || 10), 0, 1) : 0;
    const tgt = b.on && asking ? (b.sh ? b.max * Math.pow(Math.max(0, (100 - (b.start + (b.p1 - b.start) * pr)) / 95), 1.25) : b.max * (pr * pr * (3 - 2 * pr) * 0.85 + pr * 0.15)) : 0;
    b.k += (tgt - b.k) * (1 - Math.exp(-dt / (b.on ? 0.25 : 0.12)));
    if (b.on && asking) { if (!b.nextS) b.nextS = now + 1500 + R("batt")() * 2500; if (now > b.nextS) { b.nextS = now + 2200 + R("batt")() * 3500; b.drain += 1 + Math.floor(R("batt")() * 3); b.flick = now; say("buzz", 1); } }   // un bajon de carga
    const fl = now - b.flick < 240 ? (Math.floor((now - b.flick) / 60) % 2 ? 0 : 0.35) : 0;
    b.dim.style.opacity = Math.min(0.97, b.k + fl).toFixed(3);
    if (b.on) {
      const pct = b.sh ? Math.max(1, Math.round(b.start + (b.p1 - b.start) * pr)) : Math.max(1, Math.round(b.start * (1 - pr) - b.drain));
      if (pct !== b.pct) { b.pct = pct; b.hud.querySelector(".cb-pct").textContent = pct + "%"; b.hud.querySelector(".cb-lvl").style.width = Math.max(6, pct * 3.6) + "%"; b.hud.classList.toggle("crit", pct <= 5); b.hud.classList.toggle("save", pct <= 20 && pct > 5); }
      for (const th of [20, 10, 5]) if (pct <= th && b.start > th && !b.toasts[th]) {
        b.toasts[th] = 1; b.hud.querySelector(".cb-toast b").textContent = tx(document.documentElement.dataset.dev === "deck" ? BT.lowDeck : BT.low) + " · " + th + " %"; b.hud.classList.add("toast"); say("lowbat");
        clearTimeout(b.tT); b.tT = later(() => b.hud && b.hud.classList.remove("toast"), 2200);
      }
      if (pct <= 2 && !b.sh && !b.died && asking && b.max >= 0.6) { b.died = true; b.dead.classList.add("on"); say("powerdown"); later(() => { b.dead.classList.remove("on"); say("restore"); }, 650 + R("batt")() * 300); }   // se apaga un momento
    } else if (b.k < 0.01) { b.dim.style.opacity = 0; b.hud.classList.remove("on", "charge"); E.batt = null; }
  }

  /* ------------------------------------------------------------------ tanda 7: humo barrido, sombra del rayo, limpieza de la lluvia y chispas */
  /* el humo se barre con el raton: mascara de 96x54 (blanca = barrido) que se cierra sola en ~2,5 s; empuja el humo en la direccion del gesto */
  const SM = { cv: null, g: null, tex: null, lx: null, ly: null, acc: 0, at: 0, push: [0, 0] };
  function sweepReset() { if (SM.g) SM.g.clearRect(0, 0, 96, 54); SM.lx = null; SM.push = [0, 0]; SM.acc = 0; }
  function sweepStep(dt, now) {
    if (!SM.cv) { SM.cv = document.createElement("canvas"); SM.cv.width = 96; SM.cv.height = 54; SM.g = SM.cv.getContext("2d"); }
    const g = SM.g, p = ptr(), sx = 96 / Math.max(1, W), sy = 54 / Math.max(1, H);
    g.globalCompositeOperation = "destination-out"; g.fillStyle = `rgba(0,0,0,${(1 - Math.exp(-dt / 2.4)).toFixed(4)})`; g.fillRect(0, 0, 96, 54);
    if (SM.lx != null) {
      const dx = p.x - SM.lx, dy = p.y - SM.ly, d = Math.hypot(dx, dy);
      if (d > 1.5) {
        const v = d / dt, R = clamp(34 + v * 0.045, 34, 120), a = clamp(0.22 + v / 4200, 0.22, 0.75), n = Math.min(24, Math.ceil(d / (R * 0.4)));
        g.globalCompositeOperation = "source-over";
        for (let i = 1; i <= n; i++) { const x = (SM.lx + (dx * i) / n) * sx, y = (SM.ly + (dy * i) / n) * sy, r = R * sx, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
        SM.push[0] += dx * 0.6; SM.push[1] += dy * 0.6; SM.acc += d;
      }
    }
    SM.lx = p.x; SM.ly = p.y;
    const f = Math.exp(-dt / 0.5); SM.push[0] *= f; SM.push[1] *= f;
    SM.acc *= Math.exp(-dt / 0.3); if (SM.acc > 260 && now - SM.at > 420) { SM.at = now; say("sweep", clamp(SM.acc / 900, 0.2, 1)); SM.acc = 0; }
  }
  /* el rayo deja donde cae una sombra: la imagen quemada en la retina, oscura con un halo verdoso */
  function drawShades(g, now) {
    for (const s of E.shades) {
      const t = now - s.t0; if (t < 0) continue; const q = t / s.ms, a = q < 0.45 ? 1 : Math.max(0, 1 - (q - 0.45) / 0.55), r = s.r * (1 + q * 0.12);
      const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, r); gr.addColorStop(0, `rgba(6,4,18,${(0.94 * a).toFixed(3)})`); gr.addColorStop(0.55, `rgba(14,8,34,${(0.82 * a).toFixed(3)})`); gr.addColorStop(0.85, `rgba(60,30,110,${(0.35 * a).toFixed(3)})`); gr.addColorStop(1, "rgba(60,30,110,0)");
      g.fillStyle = gr; g.fillRect(s.x - r, s.y - r, 2 * r, 2 * r);
      g.strokeStyle = `rgba(150,255,210,${(0.26 * a).toFixed(3)})`; g.lineWidth = 3; g.beginPath(); g.arc(s.x, s.y, r * 0.72, 0, TAU); g.stroke();
    }
  }
  /* la escobilla que limpia la lluvia: una banda de cristal limpio que cruza la pantalla en el sentido del gesto */
  function drawWipes(g, now) {
    for (const w of E.wipes) {
      const q = Math.min(1, (now - w.t0) / 380), e = q * q * (3 - 2 * q), x = w.dir > 0 ? -160 + (W + 320) * e : W + 160 - (W + 320) * e, a = q < 0.8 ? 1 : (1 - q) / 0.2;
      const gr = g.createLinearGradient(x - 150, 0, x + 40, 0); gr.addColorStop(0, "rgba(220,240,255,0)"); gr.addColorStop(0.75, `rgba(220,240,255,${(0.16 * a).toFixed(3)})`); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(x - 150, 0, 190, H);
      g.strokeStyle = `rgba(255,255,255,${(0.55 * a).toFixed(3)})`; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 30, 0); g.lineTo(x + 30, H); g.stroke();
      g.fillStyle = `rgba(225,242,255,${(0.6 * a).toFixed(3)})`; for (let i = 0; i < 14; i++) { const y = ((i * 97 + w.t0) % H), dx = (w.dir > 0 ? 1 : -1) * (6 + ((i * 31) % 22)) * e; g.fillRect(x + 34 + dx, y, 2, 2); }   // gotitas que salen despedidas
    }
  }
  /* chispas de la lampara al fallar la luz */
  function sparkBurst() {
    if (reduce() || !ov) return; const now = performance.now(), x0 = W * (0.12 + rnd() * 0.76), n = 10 + Math.floor(rnd() * 8);
    for (let i = 0; i < n; i++) E.sparks.push({ x: x0 + (rnd() - 0.5) * 20, y: -4, vx: (rnd() - 0.5) * 260, vy: 40 + rnd() * 160, t0: now, life: 500 + rnd() * 500 });
    say("spark"); kick();
  }
  function drawSparks(g, now) {
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round"; g.lineWidth = 2;
    for (const s of E.sparks) { const q = (now - s.t0) / s.life; g.strokeStyle = `rgba(255,${Math.round(210 - 100 * q)},90,${(1 - q).toFixed(3)})`; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - s.vx * 0.025, s.y - s.vy * 0.025); g.stroke(); }
    g.restore();
  }

  /* ------------------------------------------------------------------ tanda 8: la goma del Cursor con retraso y las rachas del Vendaval */
  X.tether = (rx, ry, x, y) => { if (!ov || reduce()) return; E.teth = { rx, ry, x, y, t: performance.now() }; kick(); };
  function drawTether(g, t, now) {
    const d = Math.hypot(t.x - t.rx, t.y - t.ry); if (d < 6) return; const a = clamp(d / 60, 0.25, 0.85) * (1 - (now - t.t) / 140);
    g.save(); g.setLineDash([5, 5]); g.lineWidth = 2; g.strokeStyle = `rgba(248,180,73,${a.toFixed(3)})`; g.beginPath(); g.moveTo(t.rx, t.ry); g.lineTo(t.x, t.y); g.stroke();
    g.setLineDash([]); g.lineWidth = 1.6; g.strokeStyle = `rgba(255,247,230,${(a * 0.9).toFixed(3)})`; g.beginPath(); g.arc(t.rx, t.ry, 5, 0, TAU); g.stroke(); g.restore();
  }
  /* rachas: estelas de aire que cruzan el mapa en el sentido del viento (el de la flecha del puntero) y un soplido de vez en cuando */
  function windStep(w, dt, now) {
    const P = A.pointer, v = P && P.wind && P.on ? P.wind : null;
    w.k += ((v && !w.off ? 1 : 0) - w.k) * (1 - Math.exp(-dt / 0.3)); if (w.off && w.k < 0.02) { E.wind = null; return; }
    if (v) { const L = Math.hypot(v[0], v[1]) || 1; w.ux = v[0] / L; w.uy = v[1] / L; }
    if (w.ux == null) return;
    while (w.st.length < 34) w.st.push({ x: rnd() * W, y: rnd() * H, l: 40 + rnd() * 90, v: 700 + rnd() * 700, a: 0.14 + rnd() * 0.3 });
    for (const s of w.st) { s.x += w.ux * s.v * dt; s.y += w.uy * s.v * dt; if (s.x < -120 || s.x > W + 120 || s.y < -120 || s.y > H + 120) { s.x = w.ux > 0 ? -100 : W + 100; s.y = rnd() * H; if (Math.abs(w.uy) > Math.abs(w.ux)) { s.x = rnd() * W; s.y = w.uy > 0 ? -100 : H + 100; } } }
    if (v && now > w.gt) { w.gt = now + 2600 + rnd() * 2400; say("gust"); }
  }
  function drawWind(g, w) {
    if (w.ux == null || w.k < 0.02) return; g.save(); g.lineCap = "round"; g.lineWidth = 2;
    for (const s of w.st) { g.strokeStyle = `rgba(225,240,255,${(s.a * w.k).toFixed(3)})`; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - w.ux * s.l, s.y - w.uy * s.l); g.stroke(); }
    g.restore();
  }

  /* ------------------------------------------------------------------ ayudas (perks): bisel de la lupa, anillo del sello */
  function drawLens(g, l) {
    const p = ptr(), r = l.r + 6, a = clamp(l.k, 0, 1); if (a < 0.02) return;
    g.save(); g.globalAlpha = a;
    const sh = g.createRadialGradient(p.x, p.y, r - 16, p.x, p.y, r - 3); sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(20,10,0,.28)");
    g.fillStyle = sh; g.beginPath(); g.arc(p.x, p.y, r - 3, 0, TAU); g.fill();
    const gr = g.createLinearGradient(p.x - r, p.y - r, p.x + r, p.y + r); gr.addColorStop(0, "#fff3c4"); gr.addColorStop(0.3, "#f5b642"); gr.addColorStop(0.62, "#b8741e"); gr.addColorStop(1, "#5e3212");
    g.lineWidth = 9; g.strokeStyle = gr; g.beginPath(); g.arc(p.x, p.y, r + 1.5, 0, TAU); g.stroke();
    g.lineWidth = 1.5; g.strokeStyle = "rgba(40,20,4,.95)"; g.beginPath(); g.arc(p.x, p.y, r - 3.3, 0, TAU); g.stroke(); g.beginPath(); g.arc(p.x, p.y, r + 6.3, 0, TAU); g.stroke();
    g.strokeStyle = "rgba(255,240,190,.55)"; g.lineWidth = 1;
    for (let i = 0; i < 48; i++) { const t = (i / 48) * TAU, c = Math.cos(t), s = Math.sin(t); g.beginPath(); g.moveTo(p.x + c * (r + 3.4), p.y + s * (r + 3.4)); g.lineTo(p.x + c * (r + 5.4), p.y + s * (r + 5.4)); g.stroke(); }
    g.strokeStyle = "rgba(255,255,255,.38)"; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, r - 10, -2.55, -1.85); g.stroke();
    g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.arc(p.x + Math.cos(-2.75) * (r - 10), p.y + Math.sin(-2.75) * (r - 10), 1.8, 0, TAU); g.fill();
    g.restore();
  }
  function drawSeal(g, s, now) {
    const p = ptr(), r = s.r + 1, a = clamp(s.k, 0, 1); if (a < 0.02) return;
    g.save(); g.globalAlpha = a; g.lineWidth = 4.5; g.strokeStyle = "rgba(22,36,28,.8)"; g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.stroke();
    g.lineWidth = 2; g.strokeStyle = "#f8b449"; g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.stroke();
    g.setLineDash([3, 5]); g.lineDashOffset = -now / 60; g.lineWidth = 2.2; g.strokeStyle = "rgba(255,217,138,.9)"; g.beginPath(); g.arc(p.x, p.y, r + 6, 0, TAU); g.stroke();
    g.setLineDash([]); g.restore();
  }
  /* bordes de pelicula en negativo (perforaciones y marcas de borde) */
  function drawFilm(g, f) {
    const a = clamp(f.k, 0, 1), bh = Math.min(30, H * 0.05); if (a < 0.02) return;
    g.save(); g.globalAlpha = a;
    for (const y0 of [0, H - bh]) {
      g.fillStyle = "rgba(24,12,4,.86)"; g.fillRect(0, y0, W, bh);
      g.globalCompositeOperation = "destination-out";
      for (let x = 10; x < W; x += 26) { g.beginPath(); g.roundRect ? g.roundRect(x, y0 + bh * 0.3, 13, bh * 0.4, 2) : g.rect(x, y0 + bh * 0.3, 13, bh * 0.4); g.fill(); }
      g.globalCompositeOperation = "source-over";
    }
    g.fillStyle = "rgba(255,160,60,.85)"; g.font = "700 10px Silkscreen, monospace"; g.textBaseline = "middle";
    for (let x = 60, i = 12; x < W - 120; x += 260, i++) { g.fillText(`GEOLITE 400  ▸ ${i}`, x, bh + 9); g.fillText(`${i}A`, x + 120, H - bh - 9); }
    g.restore();
  }
  /* cursor fantasma (voluta) y estela del cursor con retraso */
  X.puff = (x, y) => { if (!ov || reduce()) return; kick(); E.puffs.push({ x, y, t0: performance.now(), p: Array.from({ length: 12 }, () => ({ a: rnd() * TAU, v: 14 + rnd() * 40, r: 4 + rnd() * 7 })) }); };
  function drawPuffs(g, now) {
    g.save(); g.globalCompositeOperation = "lighter";
    for (const f of E.puffs) { const q = (now - f.t0) / 700; for (const p of f.p) { const d = p.v * q, x = f.x + Math.cos(p.a) * d, y = f.y + Math.sin(p.a) * d - q * 22, a = (1 - q) * 0.4; const gr = g.createRadialGradient(x, y, 0, x, y, p.r * (1 + q)); gr.addColorStop(0, `rgba(190,255,240,${a.toFixed(3)})`); gr.addColorStop(1, "rgba(190,255,240,0)"); g.fillStyle = gr; g.fillRect(x - 20, y - 20, 40, 40); } }
    g.restore();
  }
  X.trail = (x, y) => { if (!ov || reduce()) return; const now = performance.now(), l = E.trail[E.trail.length - 1]; if (l && Math.hypot(l.x - x, l.y - y) < 6) return; E.trail.push({ x, y, t: now }); if (E.trail.length > 14) E.trail.shift(); kick(); };
  function drawTrail(g, now) {
    g.save(); g.lineWidth = 2;
    E.trail.forEach(p => { const q = (now - p.t) / 260; g.strokeStyle = `rgba(248,180,73,${((1 - q) * 0.35).toFixed(3)})`; g.beginPath(); g.arc(p.x, p.y, 16 - q * 6, 0, TAU); g.stroke(); });
    g.restore();
  }

  /* ------------------------------------------------------------------ tanda 15: Noche de tormenta
     El mapa queda casi negro (lo pinta el shader: uNight.x = cuanta noche, uNight.y = cuanta luz del rayo) con una lluvia fina que se enciende con cada
     relampago. Cada luz tiene su envolvente: dos pulsos (el rayo "tartamudea") y un resplandor que se apaga despacio; en Destellos suaves, un fundido */
  const smooth01 = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const nHard = (t, ms) => (t < 0 ? 0 : t < 40 ? t / 40 : t < 95 ? 1 - 0.5 * (t - 40) / 55 : t < 150 ? 0.5 + 0.5 * (t - 95) / 55 : t < ms * 0.5 ? 1 : t < ms ? 1 - Math.pow((t - ms * 0.5) / (ms * 0.5), 1.5) : 0);
  const nSoft = (t, ms) => (t < 0 ? 0 : t < 220 ? smooth01(t / 220) : t < ms * 0.55 ? 1 : t < ms ? 1 - smooth01((t - ms * 0.55) / (ms * 0.45)) : 0);
  function nightStep(n, dt, now) {
    let g = 0; const L = n.lights;
    for (const l of L) { const t = now - l.t0, v = l.peak * (l.soft ? nSoft(t, l.ms) : nHard(t, l.ms)); if (v > g) g = v; }
    for (let i = L.length - 1; i >= 0; i--) if (now - L[i].t0 > L[i].ms + 60) L.splice(i, 1);
    n.g = g;
    for (const s of n.rs) { s.y += s.v * dt; s.x += s.v * dt * 0.2; if (s.y >= s.end) Object.assign(s, streak(false)); }
  }
  function drawNight(g, n) {
    if (!n.rs.length) return; const a = (0.1 + 0.4 * n.g) * n.k;
    g.save(); g.lineCap = "round";
    for (const [z0, z1, w, m] of [[0, 0.55, 1, 0.7], [0.55, 1.01, 1.6, 1]]) {
      g.strokeStyle = `rgba(190,215,255,${(a * m).toFixed(3)})`; g.lineWidth = w; g.beginPath();
      for (const s of n.rs) if (s.z >= z0 && s.z < z1) { g.moveTo(s.x, s.y); g.lineTo(s.x - s.l * 0.2, s.y - s.l); }
      g.stroke();
    }
    g.restore();
  }
  function mkBolt() {
    const x1 = W * (0.12 + rnd() * 0.76), y1 = H * (0.35 + rnd() * 0.5), x0 = clamp(x1 + (rnd() - 0.5) * W * 0.4, 20, W - 20), y0 = -10, len = Math.hypot(x1 - x0, y1 - y0);
    const main = boltPts(x0, y0, x1, y1, len * 0.17, 7), br = [], dir = Math.atan2(y1 - y0, x1 - x0);
    for (let i = 0, nb = 2 + Math.floor(rnd() * 3); i < nb; i++) { const p = main[2 + Math.floor(rnd() * main.length * 0.6)], a = dir + (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.6), l = (0.16 + rnd() * 0.3) * len; br.push(boltPts(p[0], p[1], p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l, l * 0.2, 5)); }
    return { main, br, x: x1, y: y1 };
  }
  /* kind: strike (rayo), sheet (relampago lejano: solo medio alumbra, sin trazo) o double (dos rayos seguidos); ms: lo que dura el resplandor */
  X.night = (o = {}) => {
    if (!ov || !E.night || !E.night.on) return; kick(); size();
    const now = performance.now(), sf = soft(), kind = o.kind || "strike", ms = o.ms || 900, sheet = kind === "sheet";
    E.night.lights.push({ t0: now, ms: sheet ? ms * 0.7 : ms, peak: sheet ? 0.5 : 1, soft: sf });
    if (!sheet && !sf) { const b = mkBolt(); E.bolts.push({ t0: now, main: b.main, br: b.br, x: b.x, y: b.y, soft: false }); E.flash = Math.max(E.flash, 0.14); }
    say("nightBang", kind, sf);
    if (kind === "double") later(() => X.night({ kind: "strike", ms: ms * 0.8 }), 240 + rnd() * 160);
  };
  function nightOn() {
    const n = E.night = keep(E.night && E.night.on ? E.night : null, { lights: [], rs: [], g: 0 });
    if (!reduce()) for (let i = 0; i < 90; i++) n.rs.push(streak(true));
    say("rain", 0.3);
  }

  /* ------------------------------------------------------------------ API: configura la pregunta y la limpia al responder */
  X.set = (list, par, fx) => {
    if (!ov) return; size(); kick();
    { const st = A.chal && A.chal.state, key = A.adv && A.adv.isDaily && A.adv.isDaily() && st ? `${st.seed}:fx:${st.round}:${st.q}` : null; if (!key) qr = null; else if (!qr || qr.key !== key) qr = { key }; }   // Reto diario: grietas, huellas, ventanas y bateria iguales para todos
    const get = id => list.find(c => c.id === id), gl_ = !!gl, off = n => { if (E[n]) E[n].on = 0; };
    const dk = gl_ && get("dark"); if (dk) { const p = par(dk), boss = !!(A.chal.state && A.chal.state.bk), r0 = dk.slam ? Math.max(W, H, 800) : E.dark && E.dark.k > 0.01 ? E.dark.r : boss && DM.r > 0 ? DM.r : p.r; E.dark = keep(E.dark, { tr: p.r, a: p.a, warm: !!fx.halo, fast: dk.slam ? 0.16 : 0.55 }); E.dark.r = r0; if (boss) DM.r = p.r; } else off("dark");   // tanda 16: el foco se cierra en directo hasta su radio (o salta de golpe, si lo enciende la siesta)
    const bs = gl_ && get("blindspot"); if (bs) E.spot = keep(E.spot, { r: par(bs).r }); else off("spot");
    const cl = gl_ && get("clouds"); if (cl) { if (!E.smoke || !E.smoke.on) sweepReset(); E.smoke = keep(E.smoke, { cover: par(cl).cover, hole: fx.cloudClear || 0, seed: E.smoke && E.smoke.on ? E.smoke.seed : R("clouds")() }); } else off("smoke");   // Reto diario: los claros de las nubes en el mismo sitio para todos
    const rn = get("rain"); if (rn) { if (!(E.rain && E.rain.on)) rainOn(par(rn).dens); } else if (E.rain) { E.rain.on = 0; part("chx-wet").classList.remove("on"); say("rain", 0); }
    if (get("blur") && fx.lensR > 0) E.lens = keep(E.lens, { r: fx.lensR }); else off("lens");
    if ((get("wrongborders") && fx.trueR > 0) || (get("noborders") && fx.peekR > 0)) E.seal = keep(E.seal, { r: 110 }); else off("seal");
    if (get("negative") && !fx.noNegative) E.film = keep(E.film, {}); else off("film");
    const ck = get("crack"); if (ck && !(E.crack && E.crack.on)) crackOn(par(ck).n, fx.glassMul || 1);
    const sm = get("smudge"); if (sm && !(E.prints && E.prints.on)) { const p = par(sm); printsOn(p.n, p.px, fx.glassMul || 1); }
    const hg = get("hang"); if (hg && !E.wins) winsOn(par(hg).n, fx.hangAuto || 0);
    if (get("wind")) { E.wind = E.wind || { k: 0, st: [], gt: 0 }; E.wind.off = false; } else if (E.wind) E.wind.off = true;   // tanda 8: rachas del Vendaval
    const bt = get("battery"); if (bt && !(E.batt && E.batt.on)) battOn(par(bt).dim, bt);
    if (gl_ && get("stormnight")) nightOn(); else off("night");
  };
  X.reset = () => { DM.r = 0; };
  X.clear = () => {
    timers.forEach(clearTimeout); timers.length = 0; qr = null;   // cada pregunta empieza su azar desde su semilla
    for (const n of ["dark", "spot", "smoke", "lens", "seal", "film", "night"]) if (E[n]) E[n].on = 0;
    if (E.rain) { E.rain.on = 0; say("rain", 0); }
    if (E.night) { E.night.on = 0; say("rain", 0); }
    if (ov) { part("chx-wet").classList.remove("on"); part("chx-drops").classList.remove("on"); part("chx-shards").classList.remove("on"); part("chx-prints").classList.remove("on"); const wb = part("chx-wins"); wb.querySelectorAll(".chx-win").forEach(w => w.classList.add("bye")); setTimeout(() => { if (!E.wins) wb.innerHTML = ""; }, 160); }
    E.wins = null;
    if (E.crack) E.crack.on = 0;
    if (E.prints) E.prints.on = 0;
    { const dd = document.getElementById("chxDead"); if (dd) dd.classList.remove("on"); }
    E.sparks.length = 0; E.shades.length = 0; E.wipes.length = 0; E.teth = null; if (E.wind) E.wind.off = true;
    if (E.batt && E.batt.on) { E.batt.on = 0; E.batt.hud.classList.add("charge"); E.batt.hud.classList.remove("toast", "crit"); if (E.batt.k > 0.05) say("charge"); }
    E.cut.v = E.cut.tv = 0; E.fseq = null; E.bolts.length = 0;
    const app = document.getElementById("app"); if (app) app.classList.remove("chx-punch");
    kick();
  };
})(window.AIQ);
