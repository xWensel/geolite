/* Geolite - LA CASA ABRE (paquete «Portada» del Probador: por-puerta, voto del autor, en Extrema).
 * La puerta ya no es un fondo verde: es la portada de verdad, montada debajo, con la sala a oscuras y un solo cono de lampara sobre el rotulo
 * y «Pulsa para entrar». Al pulsar cae una ficha y las lamparas se encienden una a una con su clac (carta de socio, monedero, Clasico, Duelo,
 * placas y la Aventura la ultima; si te espera el regalo de la casa, la ultima es la de la tienda): cada una abre su charco de luz y la
 * penumbra se retira hasta la portada de hoy, identica (luz final = 1: no cambia ni un pixel). 1,2 s; un segundo clic lo salta.
 *  - Un lienzo WebGL encima de la portada (dentro de #gate) con alfa premultiplicado: donde no hay luz, negro; los haces en el aire y el
 *    filamento que se pasa al encender, sumados. Las lamparas salen de las cajas reales de la portada (vale en cualquier ventana).
 *  - Mientras dura, S.booting sigue en true: el crupier y el gato no llegan hasta que la casa esta abierta (nadie delante de la oscuridad).
 *  - Movimiento Minimo: la puerta quieta con su cono y, al pulsar, la portada entera de un golpe (un solo clac).
 *  - Sin WebGL o con la GPU perdida: el cono con un degradado y un fundido corto al entrar.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const $ = id => document.getElementById(id);
  const N = 8;
  const FS = `#version 300 es
precision highp float;
uniform vec2 uR;
uniform float uK, uLx[${N}], uLy[${N}], uRx[${N}], uRy[${N}], uLi[${N}];
uniform float uAmb, uHaz, uOsc;
out vec4 o;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec2 p = vec2(gl_FragCoord.x, uR.y - gl_FragCoord.y) / uK;     // px de CSS
  float L = 0., air = 0., hot = 0.;
  for (int i = 0; i < ${N}; i++) {
    float li = uLi[i]; if (li <= 0.) continue;
    vec2 c = vec2(uLx[i], uLy[i]), r = vec2(uRx[i], uRy[i]);
    float d = length((p - c) / r);
    float pool = 1. - smoothstep(.35, 1.08, d);                   // charco: meseta y borde largo (penumbra que se retira)
    pool *= .82 + .18 * (1. - smoothstep(0., .7, d));
    L += min(li, 1.) * pool;
    hot += max(li - 1., 0.) * (1. - smoothstep(0., .9, d));       // el filamento que se pasa un instante al encender
    /* haz en el aire: de la lampara (fuera de cuadro, arriba) al charco */
    float s0 = uR.y / uK / 1080.;
    vec2 src = vec2(c.x + (c.x - uR.x / uK * .5) * .08, c.y - r.y * 3.2 - 240. * s0);
    vec2 ax = c - src; float len = length(ax); vec2 dir = ax / len;
    float s = dot(p - src, dir) / len;
    float w = mix(r.x * .16, r.x * .92, clamp(s, 0., 1.));
    float lat = abs(dot(p - src, vec2(-dir.y, dir.x))) / w;
    float cone = (1. - smoothstep(.55, 1., lat)) * smoothstep(0., .35, s) * (1. - smoothstep(.9, 1.15, s));
    air += min(li, 1.) * cone * (.55 + .45 * s);
  }
  float Lc = clamp(uAmb + L * (1. - uAmb), 0., 1.);
  float lit = Lc * Lc * (3. - 2. * Lc);
  /* la sala a oscuras: lo que no alumbra nada queda a un resto de la escena (la noche de la casa) */
  float dark = .05 / uOsc;
  float m = lit + (1. - lit) * dark;
  vec3 add = vec3(1., .82, .55) * air * uHaz * .085 * (1. - uAmb) + vec3(1., .9, .7) * hot * .16 * (1. - uAmb);
  float a = clamp(1. - m + (h21(gl_FragCoord.xy) - .5) / 255., 0., 1.);   // tramado de 1 px: sin bandas en la penumbra
  o = vec4(add, a);                                              // premultiplicado: negro con su alfa y la luz del aire sumada
}`;
  /* curva del filamento: chispa, titubeo, se pasa y asienta (ms) */
  const FIL = [[0, 0], [22, 0.5], [48, 0.3], [80, 0.85], [125, 1.14], [270, 1]];
  const fil = ms => { if (ms <= 0) return 0; for (let i = 1; i < FIL.length; i++) if (ms < FIL[i][0]) { const a = FIL[i - 1], b = FIL[i]; return a[1] + (b[1] - a[1]) * (ms - a[0]) / (b[0] - a[0]); } return 1; };
  const io = x => { x = Math.min(1, Math.max(0, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const P = { dura: 1.2, osc: 2.2, haz: 1.3 };                      // Extrema
  const reduced = () => !!(A.core && A.core.S && A.core.S.reduce);
  const sfx = (n, ...a) => { try { if (A.sfx && A.sfx[n]) A.sfx[n](...a); } catch (e) { /* sin sonido */ } };
  const haptic = (lo, hi, ms) => { try { if (A.haptic && A.haptic.dual) A.haptic.dual(lo, hi, ms); } catch (e) { /* sin mando */ } };

  let st = null;                                                   // { gate, cv, gl, prog, U, lamps, ... }

  /* las lamparas de la portada, de sus cajas reales (en px de CSS): rotulo, carta de socio, monedero, Clasico, Duelo, placas, Aventura, tienda */
  function medir() {
    const r = sel => { const e = typeof sel === "string" ? document.querySelector(sel) : sel; if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? b : null; };
    const s = innerHeight / 1080, W = innerWidth, H = innerHeight;
    const logo = r("#dlg .hh-logo"), tag = r("#dlg .hh-tag"), socio = r("#socioBtn"), tools = r("#dlg .hh-top .menu-tools"), deck = r("#dlg .hh-deck"), shop = r("#bqBtn");
    const cards = [...document.querySelectorAll("#dlg .hh-cards > .mcard")].map(e => r(e));
    const hero = cards.find((c, i) => document.querySelectorAll("#dlg .hh-cards > .mcard")[i].classList.contains("hero"));
    const sides = cards.filter(c => c && c !== hero).sort((a, b) => a.left - b.left);
    const L = [];
    const put = (i, x, y, rx, ry) => { L[i] = [x, y, Math.max(20, rx), Math.max(20, ry)]; };
    if (logo) put(0, logo.left + logo.width / 2, logo.top + logo.height * 0.67, logo.width * 0.717, Math.max(logo.height * 1.1, tag ? (tag.bottom - logo.top) * 0.9 : 0));
    else put(0, W / 2, 150 * s, 430 * s, 205 * s);
    if (socio) put(1, socio.left + socio.width / 2, socio.top + socio.height / 2 + 6 * s, socio.width * 0.75, socio.height * 0.74);
    if (tools) put(2, tools.left + tools.width * 0.55, tools.top + tools.height / 2 + 9 * s, 190 * s, 120 * s);
    if (sides[0]) put(3, sides[0].left + sides[0].width / 2, sides[0].top + sides[0].height * 0.52, sides[0].width * 0.78, sides[0].height * 0.67);
    if (sides[1]) put(4, sides[1].left + sides[1].width / 2, sides[1].top + sides[1].height * 0.52, sides[1].width * 0.78, sides[1].height * 0.67);
    if (deck) put(5, deck.left + deck.width / 2, deck.top + deck.height / 2 + 8 * s, deck.width * 0.585, 150 * s);
    if (hero) put(6, hero.left + hero.width / 2, hero.top + hero.height * 0.5, hero.width * 0.75, hero.height * 0.7);
    if (shop) put(7, shop.left + shop.width / 2, shop.top + shop.height / 2 + 4 * s, shop.width * 0.74, shop.height * 1.4);
    return { L, tag };
  }

  function pinta(LI, amb) {
    if (!st || !st.gl) return;
    const gl = st.gl, U = st.U;
    if (gl.isContextLost()) return;
    const k = st.k, X = new Float32Array(N), Y = new Float32Array(N), RX = new Float32Array(N), RY = new Float32Array(N), LL = new Float32Array(N);
    for (let i = 0; i < N; i++) { const l = st.L[i]; if (!l) continue; X[i] = l[0]; Y[i] = l[1]; RX[i] = l[2]; RY[i] = l[3]; LL[i] = LI[i] || 0; }
    gl.viewport(0, 0, st.cv.width, st.cv.height); gl.useProgram(st.prog); gl.bindVertexArray(st.vao); gl.disable(gl.BLEND);
    U("uR", [st.cv.width, st.cv.height], 2); U("uK", k); U("uLx", X, 0); U("uLy", Y, 0); U("uRx", RX, 0); U("uRy", RY, 0); U("uLi", LL, 0);
    U("uAmb", amb); U("uHaz", P.haz); U("uOsc", P.osc);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function tamano() {
    if (!st) return;
    const k = Math.min(2, window.devicePixelRatio || 1);
    st.k = k; st.cv.width = Math.round(innerWidth * k); st.cv.height = Math.round(innerHeight * k);
    const m = medir(); st.L = m.L;
    /* «Pulsa para entrar», dentro del cono, bajo el lema (sin el aviso de la primera vez; con el, va en su sitio de siempre) */
    if (!st.gate.classList.contains("warn")) { const en = $("gateEnter"); if (en) { const y = m.tag ? m.tag.bottom + 22 * innerHeight / 1080 : innerHeight * 292 / 1080; en.style.top = Math.round(y) + "px"; } }
    if (!st.on) pinta([1], 0);
  }

  /* la puerta: se monta la portada debajo (showTitle) y la sala se apaga. Devuelve false si no hay donde (sin portada) */
  function prepara(gate, showTitle) {
    try { showTitle(); } catch (e) { console.error(e); return false; }
    if (!document.querySelector("#dlg .hh")) return false;
    const cv = document.createElement("canvas"); cv.className = "gate-luz"; cv.setAttribute("aria-hidden", "true");
    let gl = null;
    try { gl = cv.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false }); } catch (e) { gl = null; }
    st = { gate, cv, gl: null, on: false, L: [], k: 1 };
    gate.classList.add("puerta");
    if (gl) {
      const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, "#version 300 es\nvoid main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2. - 1., 0., 1.); }"));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
      if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const loc = {};
        st.gl = gl; st.prog = prog; st.vao = gl.createVertexArray();
        st.U = (n, v, kind) => { let l = loc[n]; if (l === undefined) l = loc[n] = gl.getUniformLocation(prog, n); if (l === null) return; if (typeof v === "number") gl.uniform1f(l, v); else if (kind === 2) gl.uniform2fv(l, v); else gl.uniform1fv(l, v); };
        cv.addEventListener("webglcontextlost", e => { e.preventDefault(); if (st) { st.gl = null; gate.classList.add("sin-gl"); cv.remove(); } });
      } else console.error("puerta: " + gl.getProgramInfoLog(prog));
    }
    if (st.gl) gate.insertBefore(cv, gate.firstChild); else gate.classList.add("sin-gl");
    tamano();
    addEventListener("resize", tamano);
    requestAnimationFrame(() => requestAnimationFrame(tamano));        // las cartas y el logo ya en su sitio
    setTimeout(() => { if (st && !st.on && A.telon && A.telon.calienta) A.telon.calienta(); }, 1000);   // mientras esperas a oscuras (antes del precalentamiento de js/gala.js, a 1,5 s): el telon de la partida, ya compilado (~0,13 s una vez; si no, lo pagaba el primer clic)
    return true;
  }

  /* al pulsar: las lamparas (done al acabar, con la portada ya identica a la de hoy) */
  function abre(done) {
    if (!st) { done(); return; }
    const s0 = st; s0.on = true;
    tamano();
    const end = () => {
      if (s0.ended) return; s0.ended = true; cancelAnimationFrame(s0.raf);
      removeEventListener("resize", tamano); removeEventListener("pointerdown", skip, true); removeEventListener("keydown", skipK, true);
      try { const x = s0.gl && s0.gl.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); } catch (e) { /* nada */ }
      s0.cv.remove(); s0.gate.classList.remove("puerta", "sin-gl", "abriendo"); if (st === s0) st = null;
      done();
    };
    const skip = e => { if (s0.t > 0.05) { e.stopPropagation(); end(); } };
    const skipK = e => { if ((e.key === "Enter" || e.key === " " || e.key === "Escape") && s0.t > 0.05) { e.preventDefault(); e.stopPropagation(); end(); } };
    s0.gate.classList.add("abriendo");
    if (reduced() || !s0.gl) {                                        // Minimo o sin WebGL: un solo clac y la portada de golpe (sin GL, fundido corto)
      sfx("lampara", 3); haptic(0.12, 0.05, 50);
      if (!s0.gl && !reduced()) { s0.gate.classList.add("fuera"); setTimeout(end, 260); } else end();
      return;
    }
    const gift = !!(A.escaparate && A.escaparate.giftWaiting && A.escaparate.giftWaiting());
    const k = (P.dura - 0.3) / 0.8;
    const lamps = [[1, 0], [2, 0.14], [3, 0.3], [4, 0.44], [5, 0.6], [6, 0.76]].map(([i, f]) => ({ i, at: 0.06 + f * k }));
    if (gift) lamps.push({ i: 7, at: 0.06 + 0.92 * k, gift: true });
    const lastAt = Math.max(...lamps.map(l => l.at));
    sfx("chip", 1); haptic(0.12, 0.05, 50);
    addEventListener("pointerdown", skip, true); addEventListener("keydown", skipK, true);
    s0.t = 0; let last = performance.now();
    const LI = new Float32Array(N);
    const frame = now => {
      if (s0.ended) return;
      if (!s0.gl || s0.gl.isContextLost()) return end();
      const dt = Math.min(0.05, (now - last) / 1000); last = now; s0.t += dt;
      const ms = s0.t * 1000;
      LI.fill(0); LI[0] = 1;
      lamps.forEach((l, j) => {
        LI[l.i] = fil(ms - l.at * 1000);
        if (!l.done && ms >= l.at * 1000) {
          l.done = true;
          sfx("lampara", Math.min(4, j));                              // cada clac, un pelo distinto (la familia ya no suena nunca igual)
          haptic(l.i === 6 ? 0.3 : 0.14, l.gift ? 0.28 : 0.08, l.i === 6 ? 110 : 60);
          if (l.gift) sfx("chip", 2);
        }
      });
      const amb = io((s0.t - lastAt - 0.02) / Math.max(0.12, P.dura - lastAt - 0.02));
      pinta(LI, amb);
      if (s0.t >= P.dura + 0.02) return end();
      s0.raf = requestAnimationFrame(frame);
    };
    s0.raf = requestAnimationFrame(frame);
  }

  A.puerta = { prepara, abre, on: () => !!st, cono: () => { const l = st && st.L[0]; return l ? { x: l[0], y: l[1], rx: l[2], ry: l[3] } : null; } };
})(window.AIQ);
