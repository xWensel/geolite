/* La apertura del cofre del jefe (v0.4.11). Cinco tiempos: CARGA (el cofre vibra, la luz se cuela por las juntas y la mesa ya reacciona con el reto del
   jefe), GOLPE (parada de 90 ms, destello, onda en el tapete y sacudida), ESTALLIDO (la firma del jefe: 17 distintas, con sus piezas del tema que caen y
   se quedan apoyadas), PICO (1, 2 o 3 golpes segun el margen de la ronda, 3, 5 o 7 notas) y REMATE (el haz se recoge y el cofre queda abierto).
   Todo es una funcion pura del tiempo (render(t)): no guarda estado entre fotogramas. Capas, de abajo arriba, dentro del telon (.cf-tel):
     1. GL     la mesa, la luz y el efecto del jefe: un lienzo WebGL2 que nace una vez (warm) y se reutiliza, como js/chfx.js
     2. mesa   2D: sombras de las piezas y grietas, por debajo del cofre
     3. cofre  el lienzo de 64x64 de js/cofre.js, a escala entera, con sus siete fotogramas
     4. 2D     rendijas de luz, nucleo del haz, piezas del tema, rayos, gotas
     5. DOM    destello, sello del margen, ventana de mentira de la cuarta pared
   Sin WebGL2 se pinta todo menos la mesa (queda el charco de siempre). Con Movimiento minimo: sin parada, sin sacudida, sin ondas que deformen, sin
   giro del mundo y destello al 30 %; con Vibracion apagada, sin sacudida. El sonido es A.sfx.cofreAbrir (js/audio.js). */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const TAU = Math.PI * 2, INK = "#1d0a3d", PAD = 24;                       // PAD: margen de los lienzos para que la sacudida no deje bordes
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const fract = x => x - Math.floor(x);
  const hash = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
  const rng = seed => { let s = seed | 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgba = (h, a) => { const c = hex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  const FACE = { x: 31.5, base: 56, mouth: 31 };                              // geometria del cofre de 64x64: centro, fila de apoyo en la mesa, borde de la boca

  /* el modo del efecto de cada jefe (el mismo numero que el shader) y su pieza; sin clave conocida: el cofre de siempre, sin efecto */
  const TH = {
    blackout: { m: 1, glyph: "bulb", sn: "relay" }, dizzy: { m: 2, glyph: "spiral", sn: "wobble" }, onecont: { m: 3, glyph: "land", sn: "tect" },
    blind: { m: 4, glyph: "eye", sn: "focus" }, nightfall: { m: 5, glyph: "moon", sn: "thunder" }, siesta: { m: 6, glyph: "Z", sn: "lull" },
    falsealarm: { m: 7, glyph: "bell", sn: "alarm" }, quakehall: { m: 8, glyph: "rock", sn: "quake" }, fourthwall: { m: 9, glyph: "glass", sn: "glass" },
    mirror: { m: 10, glyph: "flip", sn: "glass" }, shuffled: { m: 11, glyph: "card", sn: "cards" }, dirty: { m: 12, glyph: "drop", sn: "bloop" },
    flagfog: { m: 13, glyph: null, sn: "pad" }, flagworld: { m: 14, glyph: "globe", sn: "whoosh" }, flagneon: { m: 15, glyph: null, sn: "buzz" },
    flagpix: { m: 16, glyph: null, sn: "bits" }, flagmute: { m: 17, glyph: null, sn: "mute" }, default: { m: 0, glyph: null, sn: "none" }
  };

  /* ------------------------------------------------------------------ shader de la mesa */
  const VS = `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2. - 1., 0., 1.); }`;
  const FS = `#version 300 es
precision highp float;
uniform vec2 uR, uC;
uniform float uU, uMouth, uT, uAge, uLit, uBeam, uTier, uPool, uMute, uAmb, uVeil;
uniform int uMode;
uniform vec4 uP, uQ;
uniform vec3 uRD, uG0, uG1, uG2, uG3;
uniform vec4 uB[5];
out vec4 o;
const float PI = 3.14159265, TAU = 6.2831853;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p), u = f*f*(3.-2.*f); return mix(mix(h21(i), h21(i+vec2(1.,0.)), u.x), mix(h21(i+vec2(0.,1.)), h21(i+vec2(1.,1.)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a*vn(p); p = mat2(1.6,1.2,-1.2,1.6)*p; a *= .5; } return s; }
vec3 ramp(float v){ v = clamp(v,0.,1.); return v < .34 ? mix(uG0,uG1,v/.34) : (v < .67 ? mix(uG1,uG2,(v-.34)/.33) : mix(uG2,uG3,(v-.67)/.33)); }
vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c*p.x - s*p.y, s*p.x + c*p.y); }
vec3 hsv(float h, float s, float v){ vec3 k = clamp(abs(fract(h + vec3(0., .6667, .3333))*6. - 3.) - 1., 0., 1.); return v*mix(vec3(1.), k, s); }
float beamAt(vec2 q, float by){
  if (by <= 0.) return 0.;
  float w0 = 6. + by*(.13 + .05*uTier);
  float core = exp(-pow(q.x/w0, 2.)) * smoothstep(0., 5., by);
  float fall = exp(-by/(85. + 25.*uTier));
  float sh = .78 + .45*fbm(vec2(q.x*.11, by*.045 - uT*1.6));
  float ang = atan(q.x, max(by, .5));
  float rays = pow(.5 + .5*sin(ang*26. + fbm(vec2(ang*3., uT*.4))*5. - uT*.35), 3.) * smoothstep(1.35, .15, abs(ang)) * exp(-by/190.);
  return (core*fall*sh*1.5 + rays*.5) * uBeam;
}
void main(){
  vec2 px = vec2(gl_FragCoord.x, uR.y - gl_FragCoord.y);
  vec2 q = (px - uC) / uU;
  if (uMode == 16 && uP.x > 1.) { q = (floor(q / uP.x) + .5) * uP.x; px = uC + q * uU; }
  vec2 d = vec2(q.x, q.y * 2.1);
  float L = length(d) + .001;
  float by = (uMouth - px.y) / uU;
  vec2 uv = px / uR;
  float vg = length((uv - vec2(.5, .6)) * vec2(1., 1.15));
  /* ondas de choque sobre la mesa: empujan el dibujo del tapete y dejan luz */
  vec2 w = vec2(0.); float ringL = 0.;
  for (int k = 0; k < 3; k++) {
    if (float(k) >= uTier) break;
    float a = uAge - uRD[k];
    if (uAge < 0. || a < 0.) continue;
    float r = a * 165.; float x = (L - r) / (3.5 + a * 7.);
    float pr = exp(-x*x) * exp(-a * 1.5) * (1. - .15 * float(k));
    ringL += pr; w -= d / L * pr * 4.5 * (1. - uMute);
  }
  vec2 qq = q + w;
  if (uMode == 2) qq = rot(qq, uP.x * exp(-L/70.) * 2.6);
  else if (uMode == 14) qq = rot(qq, uP.x * exp(-L/90.) * 1.6);
  else if (uMode == 8) qq.y += uP.z * sin(px.x * .05 + uT * 50.) * 1.5;
  else if (uMode == 9) { float bd = floor(px.y / (uU * 3.)); float hh = h21(vec2(bd, floor(uT * 14.))); if (hh > .92) qq.x += (hh - .96) * 90. * uP.x; }
  /* tapete: fieltro liso (1:1) y el dibujo impreso del fieltro, a la rejilla del juego */
  vec3 col = mix(vec3(.118, .082, .208), vec3(.04, .028, .08), smoothstep(.15, .95, vg));
  vec2 pg = floor(qq);
  float lat = max(mod(pg.x + pg.y, 14.) < 1. ? 1. : 0., mod(pg.x - pg.y, 14.) < 1. ? 1. : 0.);
  float ringPrint = abs(length(vec2(qq.x, qq.y * 2.1)) - 112.) < .8 ? 1. : 0.;
  float latK = .05; if (uMode == 4) latK *= uP.z;
  col += vec3(.55, .45, .9) * max(lat * .8, ringPrint) * latK * max(0., 1. - vg * 1.1);
  col *= uAmb;
  vec2 e = vec2(q.x / 31., (q.y - 3.) / 4.5);
  col *= 1. - .6 * exp(-dot(e, e) * 1.3);                               /* la penumbra del cofre sobre el tapete: siempre detras */
  /* luz del cofre sobre la mesa y halo */
  vec2 pe = d / vec2(78., 78.);
  col += ramp(.55) * exp(-dot(pe, pe)) * uLit * .5;
  vec2 he = vec2(q.x / 62., (q.y + 28.) / 58.);
  col += ramp(.7) * exp(-dot(he, he)) * uLit * .2;
  vec2 le = (px - vec2(uR.x * .5, uR.y * .56)) / vec2(uR.x * .40, uR.x * .31);
  col += ramp(.5) * exp(-dot(le, le) * 1.4) * uPool * .9;              /* el charco de hoy */
  /* haz de luz y rayos */
  float bm = beamAt(q, by);
  float core = by > 0. ? exp(-pow(q.x / (6. + by * .15), 2.)) * exp(-by / 110.) : 0.;
  col += ramp(.78) * bm * .85 + vec3(1.) * pow(core, 3.) * uBeam * .35;
  col += ramp(.82) * ringL * .3;

  if (uMode == 1) {
    for (int i = 0; i < 3; i++) {
      float on = i == 0 ? uQ.x : (i == 1 ? uQ.y : uQ.z);
      float xi = (float(i) - 1.) * 88.;
      float wd = 8. + (px.y / uR.y) * 72.;
      float cone = smoothstep(1., 0., abs(q.x - xi) / wd) * on * (.55 + .45 * smoothstep(0., uC.y, px.y));
      col += vec3(1., .82, .45) * cone * .24 * (1. - smoothstep(uC.y + 30., uC.y + 60., px.y));
    }
  } else if (uMode == 2) {
    float r = length(q); float sp = sin(atan(q.y, q.x) * 3. + r * .13 - uT * 5.5);
    col += vec3(1., .3, .55) * max(sp, 0.) * uP.y * exp(-r / 100.) * .35;
  } else if (uMode == 3) {
    float cx = 6. * sin(q.y * .11) + 4. * sin(q.y * .37 + 2.);
    float side = q.x > cx ? 1. : -1.;
    vec2 lp = q + vec2(side * uP.x, 0.);
    float bl = fbm(lp * .02 + vec2(3., 7.)) - length(lp * vec2(.0085, .017)) * .7;
    float landM = smoothstep(.11, .13, bl);
    float coast = 1. - smoothstep(0., .022, abs(bl - .12));
    col = mix(col, vec3(.36, .31, .2) * (.8 + .5 * fbm(lp * .09)), landM * uP.y * .6);
    col += vec3(.37, .95, .87) * coast * uP.y * .5;
    col += ramp(.45) * exp(-abs(q.x - cx) / (6. + uP.x * .4)) * uP.z * .55 * smoothstep(130., 40., abs(q.y));
  } else if (uMode == 4) {
    float st = exp(-abs(px.y - uMouth) / (2.2 * uU)) * exp(-abs(q.x) / 130.) * uP.x;
    col += vec3(.75, .95, 1.) * st * .9;
    col *= 1. - uP.y * smoothstep(.35, 1.1, length((uv - vec2(.5, .55)) * vec2(1.2, 1.))) * .9;
  } else if (uMode == 5) {
    col *= vec3(.6, .78, 1.15);
    float xl = floor(px.x / uU);
    float hc = h21(vec2(xl, 3.7));
    float yy = fract(px.y / uU / 70. - uT * (1.1 + hc * .8) + hc * 9.) * 70.;
    float on = step(.8, h21(vec2(xl, 1.3)));
    col += vec3(.55, .7, 1.) * on * (1. - yy / 9.) * step(yy, 9.) * uP.x * .55;
    col += vec3(.55, .65, 1.) * uP.y * .5 * (1. - vg * .5);
  } else if (uMode == 6) {
    col *= vec3(1.06, 1., .9);
    col += vec3(1., .85, .65) * fbm(q * .02 + uT * .03) * .1 * uP.x;
  } else if (uMode == 7) {
    vec2 bv = q - vec2(0., -64.); float ba = atan(bv.y, bv.x); float da = abs(mod(ba - uP.y + PI, TAU) - PI);
    float cone = smoothstep(.42, 0., da) * exp(-length(bv) / 230.) * uP.x;
    vec3 sirenC = mix(vec3(1., .14, .1), ramp(.72), uP.z);
    col += sirenC * cone * .65 + vec3(1., .1, .08) * uP.w * (1. - vg);
  } else if (uMode == 8) {
    float dn = smoothstep(.38, .78, fbm(q * .045 + vec2(uT * .03, -uT * .15)));
    float dm = exp(-pow(L / (uP.x + 18.), 2.)) * exp(-pow((q.y + 10.) / 34., 2.));
    col = mix(col, vec3(.42, .36, .3) * (.3 + ramp(.5) * .5), dn * dm * uP.y * .75);
  } else if (uMode == 9) {
    col *= vec3(.85, 1., 1.05);
    col *= mix(1., .94 + .06 * sin(px.y * 1.3), uP.x);
    col += vec3(0., 1., .9) * step(.985, h21(vec2(floor(px.y / (uU * 2.)), floor(uT * 20.)))) * uP.x * .12;
  } else if (uMode == 10) {
    if (q.y > 0.) col += ramp(.7) * beamAt(q, q.y - 25.) * .3 * exp(-q.y / 60.);
  } else if (uMode == 11) {
    float cw = 20. + (px.y / uR.y) * 70.;
    col += vec3(1., .95, .8) * smoothstep(1., 0., abs(q.x) / cw) * smoothstep(0., uC.y, px.y) * uP.x * .2;
  } else if (uMode == 12) {
    float fld = 0.;
    for (int i = 0; i < 5; i++) { vec4 b = uB[i]; if (b.z < .5) continue; vec2 dd = (q - b.xy) * vec2(1., 2.1); fld += b.z * b.z / (dot(dd, dd) + 1.); }
    float pm = smoothstep(.9, 1.05, fld);
    float rim = smoothstep(.9, 1., fld) * (1. - smoothstep(1.05, 1.5, fld));
    vec3 pc = vec3(.08, .3, .12) + vec3(.35, .8, .2) * pow(max(0., fld - 1.), .5) * .4;
    col = mix(col, pc, pm * .92);
    col += vec3(.65, 1., .4) * rim * .35 + vec3(1.) * smoothstep(2.2, 2.6, fld) * .3;
  } else if (uMode == 13) {
    float fd = fbm(vec2(q.x * .022 + uT * .05, q.y * .06 - uT * .02));
    float fd2 = fbm(vec2(q.x * .05 - uT * .08, q.y * .09 + uT * .03) + 9.);
    float band = exp(-pow((q.y + 14.) / 52., 2.));
    float clr = uP.y > .5 ? smoothstep(uP.y - 12., uP.y + 46., L) : 1.;
    float dens = smoothstep(.22, .72, fd * .65 + fd2 * .45) * band * uP.x * 1.35 * clr;
    vec3 fogC = vec3(.7, .76, .86) * (.34 + 1.4 * (exp(-dot(pe, pe)) * uLit * .5 + bm * .7 + exp(-dot(he, he)) * uLit * .3));
    col = mix(col, fogC, clamp(dens, 0., .93));
  } else if (uMode == 14) {
    float LL = length(vec2(qq.x, qq.y * 2.1));
    float gr = abs(fract(LL / 15.) - .5);
    float gm = abs(fract((atan(qq.y * 2.1, qq.x) + PI) / TAU * 16.) - .5);
    float g = (gr < .02 ? 1. : 0.) + (gm < .012 ? .8 : 0.);
    col += vec3(.2, .55, 1.) * g * (.22 + .25 * uP.y) * exp(-LL / 170.);
  } else if (uMode == 15) {
    float n = fbm(q * .019 + vec2(uP.x, uP.x * .6) + 2.7);
    float iso = abs(n - .5);
    col *= .6;
    col += hsv(.75 + .2 * sin(n * 5. + uP.w), .85, 1.) * (.006 / (iso + .004)) * uP.y * .8 * (1. - .4 * vg);
  } else if (uMode == 17) {
    float g = dot(col, vec3(.3, .59, .11));
    vec3 mono = vec3(g) * vec3(1.05, 1., .88);
    float cm = uP.x > 0. ? smoothstep(uP.x + 10., uP.x - 10., L) : 0.;
    mono *= .93 + .07 * sin(uT * 47.);
    mono += (h21(floor(px) + floor(uT * 24.)) - .5) * .05;
    mono += step(.9965, h21(vec2(floor(px.x / (uU * .5)), floor(uT * 9.)))) * .35;
    mono *= 1. - .5 * smoothstep(.5, 1., length((uv - .5) * vec2(1.2, 1.)));
    col = mix(mono, col, cm);
  }
  col += (h21(floor(gl_FragCoord.xy)) - .5) * .02;
  o = vec4(clamp(col, 0., 1.) * uVeil, uVeil);
}`;

  /* ------------------------------------------------------------------ el lienzo de GL: nace una vez y se reutiliza de un telon a otro */
  let G = null, gTried = false;
  function glInit() {
    if (G || gTried) return G; gTried = true;
    try {
      const cv = document.createElement("canvas"), gl = cv.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" });
      if (!gl) return null;
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
      const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
      gl.useProgram(p); gl.bindVertexArray(gl.createVertexArray());
      cv.addEventListener("webglcontextlost", e => { e.preventDefault(); G = null; gTried = false; });
      G = { cv, gl, p, loc: {} };
    } catch (e) { G = null; }
    return G;
  }
  const uloc = n => (n in G.loc ? G.loc[n] : (G.loc[n] = G.gl.getUniformLocation(G.p, n)));
  /* calentarlo antes de que haga falta (compilar el shader en mitad de la partida da un tiron): se llama al llegar el veredicto del jefe */
  function warm() { if (G || gTried) return; if (window.requestIdleCallback) requestIdleCallback(glInit, { timeout: 800 }); else setTimeout(glInit, 60); }

  /* ------------------------------------------------------------------ piezas del tema: el emblema de la placa de cada cofre, recoloreado */
  const ROCK = ["..###..", ".#####.", "#######", "#######", ".#####.", "..###.."];
  const ZS = [["#####", "...#.", "..#..", ".#...", "#####"], ["#######", "....##.", "...##..", "..##...", ".##....", "#######"]];
  const SUITS = [[".#.#.", "#####", "#####", ".###.", "..#.."], ["..#..", ".###.", "#####", "#####", "..#.."], ["..#..", ".###.", "#####", "#####", ".#.#."], [".###.", ".###.", "#####", "#####", "..#.."]];
  function sprite(rows, fill, acc, inner, span) {
    const w = rows[0].length, h = rows.length, cv = document.createElement("canvas"); cv.width = w + 2; cv.height = h + 2;
    const x = cv.getContext("2d", { willReadFrequently: true }), on = (i, j) => i >= 0 && j >= 0 && i < w && j < h && (rows[j][i] === "#" || rows[j][i] === "a");
    const inside = (i, j) => { if (!inner || j < span[0] || j > span[1] || on(i, j) || i < 0 || i >= w) return false; let l = false, r = false; for (let k = 0; k < i; k++) if (on(k, j)) l = true; for (let k = i + 1; k < w; k++) if (on(k, j)) r = true; return l && r; };
    for (let j = -1; j < h + 1; j++) for (let i = -1; i < w + 1; i++) {
      if (inside(i, j)) { x.fillStyle = inner; x.fillRect(i + 1, j + 1, 1, 1); }
      else if (on(i, j)) { x.fillStyle = rows[j][i] === "a" ? acc : fill; x.fillRect(i + 1, j + 1, 1, 1); }
      else if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) { x.fillStyle = INK; x.fillRect(i + 1, j + 1, 1, 1); }
    }
    return cv;
  }
  function cardSprite(face, suit) {
    const cv = document.createElement("canvas"); cv.width = 11; cv.height = 15; const x = cv.getContext("2d", { willReadFrequently: true });
    x.fillStyle = INK; x.fillRect(1, 0, 9, 15); x.fillRect(0, 1, 11, 13);
    if (face) {
      x.fillStyle = "#f3f0fa"; x.fillRect(1, 1, 9, 13); x.fillRect(2, 0, 7, 1); x.fillStyle = "#c9cde0"; x.fillRect(1, 13, 9, 1);
      x.fillStyle = suit < 2 ? "#e8283a" : INK; SUITS[suit].forEach((r, j) => [...r].forEach((ch, i) => { if (ch === "#") x.fillRect(3 + i, 5 + j, 1, 1); }));   // sin indices de carta (A K Q J), como en todo el juego
    } else {
      x.fillStyle = "#4a1d96"; x.fillRect(1, 1, 9, 13); x.fillStyle = "#6e40c4";
      for (let j = 2; j < 13; j++) for (let i = 2; i < 9; i++) if ((i + j) % 2 === 0) x.fillRect(i, j, 1, 1);
      x.fillStyle = "#fdd742"; x.fillRect(5, 7, 1, 1);
    }
    return cv;
  }
  const spriteCache = {};
  function pieceSprite(id, P, kind, variant) {
    const key = id + kind + variant; if (spriteCache[key]) return spriteCache[key];
    const g = P.glow; let cv;
    if (kind === "card") cv = cardSprite(variant >= 10, variant % 10);
    else if (kind === "rock") cv = sprite(ROCK, "#91887a", "#b6bbb8");
    else if (kind === "Z") cv = sprite(ZS[variant % 2], "#ffd3b6", "#fff3b0");
    else { const FILL = { bulb: [1, 5], globe: [1, 5], glass: [1, 7], eye: [2, 5] }[kind]; cv = sprite(A.cofre.GL[kind], g[2], g[3], FILL ? g[1] : null, FILL); }
    return (spriteCache[key] = cv);
  }
  const colCache = {}, rgbOf = c => colCache[c] || (colCache[c] = hex(c));
  /* el cofre al pixel: con destello (pixeles hacia el blanco), reflejo de luz en diagonal (el espejo) y mosaico (la bandera pixelada) */
  function paintChest(cv, g, o) {
    const x = cv.getContext("2d"), im = x.createImageData(64, 64), d = im.data, B = o.B || 1;
    for (let i = 0; i < 4096; i++) {
      let j = i; if (B > 1) { const px = i % 64, py = (i / 64) | 0, bx = Math.min(63, px - px % B + (B >> 1)), by = Math.min(63, py - py % B + (B >> 1)); j = by * 64 + bx; }
      const c = g.c[j]; if (!c) continue; const rgb = rgbOf(c); let r = rgb[0], gg = rgb[1], b = rgb[2];
      if (o.flash && g.t[j] !== "o") { r += (255 - r) * o.flash; gg += (255 - gg) * o.flash; b += (255 - b) * o.flash; }
      if (o.glint != null && o.glint >= 0 && g.t[j] !== "o") { const px = i % 64, py = (i / 64) | 0, v = (px + py * .8) / 100 - o.glint; if (v > 0 && v < .045) { const k = .55 * (1 - Math.abs(v - .0225) / .0225); r += (255 - r) * k; gg += (255 - gg) * k; b += (255 - b) * k; } }
      d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
    }
    x.putImageData(im, 0, 0);
  }

  /* ------------------------------------------------------------------ textos (12 idiomas: es, en, fr, pt, de, it, es-419, zh, ko, ja, ru, pl) */
  const STAMP = [
    "Victoria justa|Narrow win|Victoire de justesse|Vitória apertada|Knapper Sieg|Vittoria di misura||险胜|아슬아슬한 승리|ぎりぎりの勝利|Победа в притык|Zwycięstwo na styk",
    "Victoria holgada|Comfortable win|Victoire confortable|Vitória folgada|Klarer Sieg|Vittoria comoda||轻松获胜|여유 있는 승리|余裕の勝利|Уверенная победа|Pewne zwycięstwo",
    "Victoria aplastante|Crushing win|Victoire écrasante|Vitória esmagadora|Vernichtender Sieg|Vittoria schiacciante||压倒性胜利|압도적인 승리|圧倒的な勝利|Разгромная победа|Miażdżące zwycięstwo"
  ];
  const WIN_T = "El cofre ha dejado de responder.|The chest has stopped responding.|Le coffre ne répond plus.|O baú parou de responder.|Die Truhe reagiert nicht mehr.|Il forziere non risponde più.||宝箱没有响应了。|상자가 응답하지 않습니다.|宝箱が応答しません。|Сундук не отвечает.|Skrzynia przestała odpowiadać.";
  const WIN_T3 = "Premio.exe no responde. Tampoco hace falta.|Prize.exe is not responding. It doesn't need to.|Prix.exe ne répond pas. Pas besoin.|Premio.exe não responde. Nem precisa.|Preis.exe reagiert nicht. Muss es auch nicht.|Premio.exe non risponde. Non serve.||奖品.exe没有响应。也不需要。|상품.exe가 응답하지 않습니다. 그럴 필요도 없죠.|景品.exeが応答しません。その必要もありません。|Приз.exe не отвечает. И не надо.|Nagroda.exe nie odpowiada. I nie musi.";
  const WIN_OK = "Esperar|Wait|Attendre|Aguardar|Warten|Attendi||等待|기다리기|待機|Ждать|Czekaj";
  const WIN_N = "premio.exe|prize.exe|prix.exe|premio.exe|preis.exe|premio.exe||奖品.exe|상품.exe|景品.exe|приз.exe|nagroda.exe";

  /* ------------------------------------------------------------------ el escenario */
  function Stage(o) {
    const me = this, tel = o.tel; this.tel = tel; this.slot = o.slot; this.chest = o.canvas; this.o = o;
    const mk = (tag, cls, parent, before) => { const e = document.createElement(tag); e.className = cls; if (before) parent.insertBefore(e, before); else parent.appendChild(e); return e; };
    this.fxb = mk("canvas", "cf-fxb", tel, tel.firstChild); this.fx = mk("canvas", "cf-fx", tel);
    this.flash = mk("div", "cf-flash", tel); this.win = mk("div", "chx-win cf-win", tel); this.win.setAttribute("aria-hidden", "true");
    this.win.innerHTML = `<div class="cw-bar"><i class="cw-app"></i><b></b><span class="cw-x">✕</span></div><div class="cw-body"><i class="cw-sign">!</i><p></p></div><div class="cw-foot"><span class="cw-b cw-def"></span></div>`;
    this.win.querySelector("b").textContent = A.pick6(WIN_N); this.win.querySelector(".cw-b").textContent = A.pick6(WIN_OK);
    this.ref = mk("canvas", "cf-ref", this.slot, this.chest); this.ref.width = 64; this.ref.height = 64;
    const plq = tel.querySelector(".cf-plaque"); this.stp = plq ? mk("i", "cf-stp", plq) : null;
    this.g2 = this.fx.getContext("2d"); this.gb = this.fxb.getContext("2d");
    this.glc = null; this.k = 1; this.slow = 0; this.cache = {}; this.chestKey = ""; this.refKey = "";
    this.key = o.key && A.cofre.has(o.key) ? o.key : "default"; this.th = TH[this.key] || TH.default; this.b = A.cofre.of(this.key);
    this.tier = clamp(o.tier | 0 || 1, 1, 3); this.seed = (Math.random() * 1e9) | 0; this.t = 0; this.state0 = "idle";
    const g = G || glInit(); if (g) { this.glc = g.cv; this.glc.className = "cf-gl"; this.glc.style.transition = "none"; this.glc.style.opacity = "0"; tel.insertBefore(this.glc, tel.firstChild); } else tel.classList.add("nogl");
    this.ro = new ResizeObserver(() => { this.layout(); if (this.state0 !== "play") this.render(this.t); }); this.ro.observe(tel);
    tel.classList.add("fxon"); this.layout(); this.configure();
  }
  const P = Stage.prototype;
  const S_ = () => (A.core && A.core.S) || {};
  P.reduced = function () { return !!(S_().reduce || document.documentElement.classList.contains("reduce-motion")); };
  P.canShake = function () { const S = S_(); return !this.reduced() && S.shake !== false; };

  /* medidas: la escala entera del cofre y su sitio dentro del telon (px de CSS; los lienzos llevan PAD de margen) */
  P.layout = function () {
    const tel = this.tel, W = tel.clientWidth, H = tel.clientHeight; if (!W || !H) return;
    const tr = tel.getBoundingClientRect(), sr = this.slot.getBoundingClientRect(), cr = this.chest.getBoundingClientRect();
    this.W = W; this.H = H; this.s = Math.max(1, Math.round(cr.width / 64)); this.left = Math.round(cr.left - tr.left); this.top = Math.round(cr.top - tr.top);
    const k = this.k, w = W + PAD * 2, h = H + PAD * 2;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    [this.fx, this.fxb].forEach(c => { c.width = Math.round(w * this.dpr); c.height = Math.round(h * this.dpr); c.style.cssText = `left:${-PAD}px;top:${-PAD}px;width:${w}px;height:${h}px`; });
    if (this.glc) { this.glc.width = Math.round(w * k); this.glc.height = Math.round(h * k); this.glc.style.cssText = `left:${-PAD}px;top:${-PAD}px;width:${w}px;height:${h}px`; }
    this.ref.style.cssText = `left:0;top:${48 * this.s}px;width:${64 * this.s}px;height:${64 * this.s}px`;
    this.chestKey = ""; this.refKey = "";
  };

  /* linea de tiempo (segundos; a = edad desde el golpe) y todo lo que depende de la semilla: piezas, rayos, grietas */
  P.configure = function () {
    const r = rng(this.seed), tier = this.tier, th = this.th, key = this.key, red = this.reduced();
    const hit = [1.0, 1.25, 1.5][tier - 1], W = [0, .62 + (r() - .5) * .08, 1.12 + (r() - .5) * .08].slice(0, tier), rest = W[W.length - 1] + 1.5;
    this.T = { hit, hs: red ? 0 : .09, W, rest, end: rest + 1.0, m: [1, 1.25, 1.5][tier - 1] }; this.total = hit + this.T.end + this.T.hs;
    this.pieces = []; const kind = th.glyph;
    if (kind) {
      const counts = [[11], [9, 9], [8, 10, 12]][tier - 1], gm = kind === "Z" ? .22 : kind === "card" ? .9 : 1; let id = 0;
      W.forEach((w, k) => {
        for (let i = 0; i < counts[k]; i++) {
          const ang = (r() - .5) * 2 * 1.08, vm = (120 + r() * 110) * (1 + .12 * k) * (kind === "Z" ? .55 : 1);
          let vx = Math.sin(ang) * vm; const vy = -Math.cos(ang) * vm * (kind === "Z" ? 1.15 : 1), x0 = FACE.x + (r() - .5) * 22, y0 = FACE.mouth - 2, g = 430 * gm;
          const Ly = 60 + r() * 22, t1 = (-vy + Math.sqrt(vy * vy + 2 * g * (Ly - y0))) / g;
          let xl = x0 + vx * t1; if (Math.abs(xl - FACE.x) < 38 && Ly < 66) { const sg = xl >= FACE.x ? 1 : -1; vx += sg * (38 - Math.abs(xl - FACE.x)) / t1; xl = x0 + vx * t1; }
          const vyB = -.36 * (vy + g * t1), t2 = 2 * Math.abs(vyB) / g;
          this.pieces.push({ id: id++, a0: w + r() * .09, x0, y0, vx, vy, g, Ly, t1, t2, vyB, vxB: vx * .45, xl, hold: .9 + r() * .7, kind, flip: r() < .5, variant: kind === "card" ? 10 + Math.floor(r() * 4) : Math.floor(r() * 4), k });
        }
      });
    }
    this.cracks = this.glass = this.bolts = null;
    if (th.m === 8) this.cracks = this.makeCracks(r, tier);
    if (th.m === 9) this.glass = this.makeGlass(r, tier);
    if (th.m === 5) this.bolts = W.map((w, k) => this.makeBolt(r, k));
    this.chestKey = ""; this.refKey = "";
  };
  P.makeCracks = function (r, tier) {
    const n = 5 + tier * 2, br = [];
    for (let i = 0; i < n; i++) {
      const base = (i / n) * TAU + (r() - .5) * .5; let x = 0, y = 4, ang = base; const pts = [[x, y]], len = 90 + r() * 90 + tier * 25;
      for (let d = 0; d < len; d += 9 + r() * 7) { ang += (r() - .5) * .8; x += Math.cos(ang) * (9 + r() * 7); y += Math.sin(ang) * (9 + r() * 7) * .46; pts.push([x, y]); }
      br.push(pts);
      if (r() < .8) { const k = 2 + Math.floor(r() * (pts.length - 3)), q = [pts[k].slice()]; let a2 = base + (r() < .5 ? -1 : 1) * (.7 + r() * .6), px = pts[k][0], py = pts[k][1]; for (let j = 0; j < 4; j++) { a2 += (r() - .5) * .8; px += Math.cos(a2) * 10; py += Math.sin(a2) * 10 * .46; q.push([px, py]); } br.push(q); }
    }
    return br;
  };
  P.makeGlass = function (r, tier) {
    const n = 8 + tier * 2, rays = [];
    for (let i = 0; i < n; i++) { const base = (i / n) * TAU + (r() - .5) * .35; let rad = 0; const pts = [], jit = []; for (let k = 0; k < 14; k++) { rad += 55 + r() * 70; pts.push(rad); jit.push((r() - .5) * .16); } rays.push({ base, pts, jit }); }
    return rays;
  };
  P.makeBolt = function (r, k) {
    const x1 = (k === 0 ? 0 : (k === 1 ? -1 : 1) * (60 + r() * 50)), pts = [[x1 + 80 + r() * 60, -170]];
    const seg = 9; for (let i = 1; i <= seg; i++) { const t = i / seg; pts.push([lerp(pts[0][0], x1, t) + (r() - .5) * 34 * (1 - t * .5), lerp(-170, FACE.mouth - 40, t)]); }
    pts.push([x1, FACE.mouth - 34]);
    const br = []; for (let i = 0; i < 3; i++) { const b = 2 + Math.floor(r() * 5), q = [pts[b].slice()]; let px = pts[b][0], py = pts[b][1]; const dir = r() < .5 ? -1 : 1; for (let j = 0; j < 4; j++) { px += dir * (10 + r() * 14); py += 14 + r() * 12; q.push([px, py]); } br.push(q); }
    return { pts, br };
  };

  /* ------------------------------------------------------------------ estado en el instante t */
  P.state = function (t) {
    const T = this.T, th = this.th, red = this.reduced(), m = th.m;
    let tv = t; if (!red && t >= T.hit) tv = t < T.hit + T.hs ? T.hit : t - T.hs;
    const a = tv - T.hit, c = clamp(tv / T.hit, 0, 1), o = { t, tv, a, c, m, red };
    o.f = a < 0 ? 0 : a < .05 ? 1 : a < .10 ? 2 : a < .15 ? 3 : a < .20 ? 4 : a < .33 ? 6 : 5;
    let luz = a < 0 ? lerp(.25, .9, Math.pow(c, 1.6)) : 1.12;
    if (a >= 0) { T.W.forEach(w => { if (a >= w) luz += .3 * Math.exp(-(a - w) * 5); }); if (a > T.rest) luz = lerp(luz, .85, sst(T.rest, T.rest + .8, a)); }
    o.luz = Math.min(1.45, luz);
    const soft = A.softFlash ? A.softFlash() : red; let fl = 0;
    T.W.forEach((w, k) => { if (a >= w) fl += [1, .5, .65][k] * Math.exp(-(a - w) * (k ? 9 : 6.5)); }); o.flash = Math.min(.78, fl) * (soft ? .3 : 1);
    let beam = 0; if (a >= 0) { beam = sst(0, .1, a); let k = 0; T.W.forEach((w, i) => { if (a >= w) k = i; }); beam *= (1 + .22 * k) * (1 - .7 * sst(T.rest, T.rest + .9, a)); T.W.forEach(w => { if (a >= w) beam += .25 * Math.exp(-(a - w) * 6); }); }
    o.beam = beam; o.lit = a < 0 ? Math.pow(c, 1.5) * .6 : Math.min(1.3, 0.9 + .35 * (beam > 0 ? 1 : 0)) * (1 - .45 * sst(T.rest, T.rest + .9, a));
    const n = Math.floor(tv * 50), s = this.s; let amp = 0;
    if (this.canShake()) {
      T.W.forEach((w, k) => { if (a >= w) amp += s * [1.5, 1.2, 1.4][k] * T.m * Math.exp(-(a - w) * 7); });
      if (a < 0) amp += s * (m === 8 ? .25 + 1.1 * c * c : .12 * c * c);
    }
    o.shake = [(hash(n * 2.3) - .5) * 2 * amp, (hash(n * 5.1 + 9) - .5) * 2 * amp];
    if (m === 2 && this.canShake()) o.shake[0] += Math.sin(tv * 7) * s * 1.1 * (a < 0 ? c : Math.exp(-a * 1.5));
    const ck = a < 0 && !red ? Math.floor(c * c * 2.6) : 0; o.cox = ck ? Math.round((hash(Math.floor(tv * 38) * 3.7) - .5) * 2 * ck) : 0; o.coy = ck ? Math.round((hash(Math.floor(tv * 38) * 6.1 + 4) - .5) * ck) : 0;
    if (a >= 0 && !red) o.coy += Math.round(2 * Math.exp(-a * 16));
    const par = this.themeParams(o); o.up = par.p; o.uq = par.q || [0, 0, 0, 0]; o.amb = par.amb == null ? 1 : par.amb; o.filter = par.filter || ""; o.B = par.B || 1;
    o.glint = m === 10 ? (a < 0 ? fract(tv * 1.3) * 1.6 - .3 : (a < .5 ? a / .5 * 1.3 - .3 : -1)) : -1;
    return o;
  };

  P.themeParams = function (o) {
    const { a, c, tv, m } = o, T = this.T, tier = this.tier, rest = T.rest, post = a >= 0, env = post ? 1 - sst(rest, rest + 1, a) : 1;
    switch (m) {
      case 1: {
        let amb; if (!post) { const k = Math.floor(tv * 11), r = hash(k); amb = c < .12 ? 1 : lerp(1, (r < .5 ? .06 : .38 + .5 * r) * (1 - .5 * c), sst(.12, .3, c)); } else amb = .06 + .94 * sst(.25, 1, a) * .85 + .1 * sst(.25, 1, a);
        const on = d => post ? sst(d, d + .08, a) : 0;
        return { p: [0, 0, 0, 0], q: [on(.12), on(.28), on(.44), 0], amb };
      }
      case 2: return { p: [post ? 1.1 * Math.exp(-a * 2.6) * Math.cos(a * 11) : c * 1.1, post ? .8 * Math.exp(-a * .9) : c * .5, 0, 0] };
      case 3: return { p: [post ? 46 * (1 - Math.exp(-a * 2.2)) : 0, (post ? .95 : c) * (post ? env : 1), post ? .9 * Math.exp(-a * .8) : c * .8, 0] };
      case 4: return { p: [post ? Math.exp(-a * 2) : 0, post ? .7 * Math.exp(-a * 8) : c * .7, post ? 1 : 1 - .88 * c, 0], filter: !post ? `blur(${(6 * (1 - c * .85)).toFixed(1)}px)` : (a < .22 ? `blur(${(2.2 * Math.max(0, Math.sin(a / .22 * Math.PI))).toFixed(1)}px)` : "") };
      case 5: {
        let ly = 0; T.W.forEach((w, k) => { if (a >= w) ly += (k ? .6 : 1) * Math.exp(-(a - w) * 14) * (.7 + .3 * Math.sin((a - w) * 90)); });
        return { p: [(post ? .9 : c * .9) * (post ? 1 - .5 * sst(rest, rest + 1, a) : 1), Math.max(0, ly), 0, 0], amb: .55 + (post ? .25 * sst(0, 1, a) : 0) };
      }
      case 6: return { p: [post ? 1 : .6 + .4 * c, 0, 0, 0], amb: .85 + .15 * (post ? 1 : Math.sin(tv * 2.2) * .5 + .5) };
      case 7: { const amp = !post ? .3 + .7 * c : .6 * Math.exp(-a * .7) * (a < .1 ? 0 : 1); return { p: [amp, tv * (post ? 4 : 5 + 10 * c), post ? sst(0, .25, a) : 0, !post ? (Math.sin(tv * TAU * 2.2) * .5 + .5) * .25 * c : 0] }; }
      case 8: return { p: [post ? a * 60 : 0, post ? Math.exp(-a * .55) : c * .2, post ? Math.exp(-a * 5) : c * .8, 0] };
      case 9: { const on = !post ? (hash(Math.floor(tv * 9)) < .3 + c * .5 ? .15 + c * .85 : 0) : (a < .6 ? 1 : Math.exp(-(a - .6) * 3)); return { p: [o.red ? 0 : on, 0, 0, 0] }; }
      case 10: return { p: [c, 0, 0, 0] };
      case 11: return { p: [post ? sst(0, .2, a) * env : 0, 0, 0, 0] };
      case 12: {
        const R = [9, 12, 13, 10, 14].map(x => x * (.8 + .2 * tier)), X = [-26, -10, 12, 28, 0], Y = [3, 5, 6, 3, 9], st = [.35, .5, .62, .75, .55], q = [];
        for (let i = 0; i < 5; i++) { const k = post ? (1 - Math.exp(-(a - st[i]) * 1.8)) * (a > st[i] ? 1 : 0) * env : 0; q.push(X[i], Y[i], R[i] * k, 0); }
        this._pud = q; return { p: [0, 0, 0, 0] };
      }
      case 13: return { p: [post ? .9 * env : c * 1.0, post ? a * 85 : 0, 0, 0] };
      case 14: return { p: [post ? .8 * Math.exp(-a * 2.2) : c * .8, post ? 1 : c, 0, 0] };
      case 15: {
        const flick = !post ? (hash(Math.floor(tv * 14)) < .25 + c * .75 ? 1 : .15) * c : 1 - .4 * sst(0, 1.5, a);
        return { p: [(post ? .25 * (1 - Math.exp(-a * 3)) : 0) + tv * .03, flick, 0, .12 * tv + (post ? 2.5 * (1 - Math.exp(-1.2 * a)) : 0)] };
      }
      case 16: { let B; if (!post) B = [10, 6, 12, 8][Math.floor(tv * 7) % 4] * (.55 + .45 * c); else B = a < .06 ? 16 : a < .12 ? 10 : a < .2 ? 6 : a < .3 ? 3 : a < .4 ? 2 : 1; return { p: [o.red ? 1 : B, 0, 0, 0], B: o.red ? 1 : (B >= 7 ? 8 : B >= 3.5 ? 4 : B >= 1.8 ? 2 : 1) }; }
      case 17: return { p: [post ? a * 230 : -20, 1, 0, 0], filter: post && a > .05 ? "" : "grayscale(1) sepia(.35)" };
    }
    return { p: [0, 0, 0, 0] };
  };

  /* ------------------------------------------------------------------ pintado */
  P.grid = function (f, luz) {
    const k = f + "|" + Math.round(luz * 20); return this.cache[k] || (this.cache[k] = A.cofre.render(this.b.P, f, Math.round(luz * 20) / 20));
  };
  P.render = function (t) {
    if (!this.W) return; this.t = t;
    const o = this.state(t), T = this.T, s = this.s, P_ = this.b.P, gl = this.glc && G && G.gl;
    this.cur = o;
    const fl = Math.round(o.flash * 12) / 12, key = [o.f, Math.round(o.luz * 20), fl, Math.round((o.glint || 0) * 40), o.B].join("|");
    if (key !== this.chestKey) { this.chestKey = key; paintChest(this.chest, this.grid(o.f, o.luz), { flash: fl * .9, glint: o.glint, B: o.B }); }
    if (o.m === 10) { const af = this.refFrame(t), rk = af.f + "|" + Math.round(af.luz * 20); if (rk !== this.refKey) { this.refKey = rk; paintChest(this.ref, this.grid(af.f, af.luz), {}); } }
    this.ref.style.display = o.m === 10 ? "block" : "none";
    this.chest.style.filter = o.filter || "none";
    const sh = `translate(${o.cox * s}px, ${o.coy * s}px)`; this.slot.style.transform = sh;
    const wt = `translate(${Math.round(o.shake[0])}px, ${Math.round(o.shake[1])}px)`;
    [this.fx, this.fxb, this.glc].forEach(c => { if (c) c.style.transform = wt; });
    this.tel.style.transform = o.m === 14 && !o.red && o.a > .1 && o.a < 1.15 ? `perspective(1500px) rotateX(${(360 * sst(.1, 1.1, o.a)).toFixed(1)}deg)` : "";
    this.flash.style.opacity = o.flash.toFixed(3);
    if (this.flashKey !== this.key) { this.flashKey = this.key; const g = P_.glow; this.flash.style.background = `radial-gradient(ellipse 60% 70% at 50% 58%, #fff 0%, ${rgba(g[3], .92)} 28%, ${rgba(g[2], .5)} 62%, ${rgba(g[1], .12)} 100%)`; }
    if (gl) this.drawGL(o, gl);
    this.draw2D(o);
    this.dom(o);
  };
  P.drawGL = function (o, gl) {
    const T = this.T, s = this.s, g = this.b.P.glow.map(hex), k = this.glc.width / (this.W + PAD * 2), u = uloc;
    gl.viewport(0, 0, this.glc.width, this.glc.height);
    gl.uniform2f(u("uR"), this.glc.width, this.glc.height); gl.uniform2f(u("uC"), (this.left + PAD + 32 * s) * k, (this.top + PAD + FACE.base * s) * k);
    gl.uniform1f(u("uU"), s * k); gl.uniform1f(u("uMouth"), (this.top + PAD + FACE.mouth * s) * k);
    gl.uniform1f(u("uT"), o.tv); gl.uniform1f(u("uAge"), o.a); gl.uniform1f(u("uLit"), o.lit); gl.uniform1f(u("uBeam"), o.beam); gl.uniform1f(u("uTier"), this.tier);
    gl.uniform1f(u("uPool"), 0); gl.uniform1f(u("uMute"), o.red ? 1 : 0); gl.uniform1f(u("uAmb"), o.amb); gl.uniform1f(u("uVeil"), .94);
    gl.uniform1i(u("uMode"), o.m); gl.uniform4fv(u("uP"), o.up); gl.uniform4fv(u("uQ"), o.uq);
    gl.uniform3f(u("uRD"), T.W[0] || 0, T.W[1] || 0, T.W[2] || 0);
    gl.uniform3fv(u("uG0"), g[0].map(v => v / 255)); gl.uniform3fv(u("uG1"), g[1].map(v => v / 255)); gl.uniform3fv(u("uG2"), g[2].map(v => v / 255)); gl.uniform3fv(u("uG3"), g[3].map(v => v / 255));
    const bu = new Float32Array(20); if (o.m === 12 && this._pud) this._pud.forEach((v, i) => { bu[i] = v; }); gl.uniform4fv(u("uB"), bu);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  /* el espejo: el reflejo se abre antes que el cofre y a la hora del golpe se igualan */
  P.refFrame = function (t) {
    const T = this.T, ahead = t < T.hit + T.hs + .25 ? .24 * Math.min(1, t / (T.hit * .6)) : 0, o2 = this.state(Math.min(t + ahead, this.total)); return { f: o2.f, luz: o2.luz };
  };

  /* ---------- capa 2D ---------- */
  P.draw2D = function (o) {
    const g = this.g2, gb = this.gb, d = this.dpr, G_ = this.b.P.glow;
    g.setTransform(d, 0, 0, d, PAD * d, PAD * d); g.clearRect(-PAD, -PAD, this.W + PAD * 2, this.H + PAD * 2); g.imageSmoothingEnabled = false;
    gb.setTransform(d, 0, 0, d, PAD * d, PAD * d); gb.clearRect(-PAD, -PAD, this.W + PAD * 2, this.H + PAD * 2);
    this.drawPieces(gb, o, "sh");
    g.save(); g.translate(o.cox * this.s, o.coy * this.s);
    if (o.a < 0 && o.c > .06) this.seams(g, o, G_);
    if (o.a >= 0) this.beamCore(g, o, G_);
    if (o.m === 12) this.drips(g, o);
    g.restore();
    if (o.m === 5 && this.bolts) this.drawBolts(g, o);
    if (o.m === 8 && this.cracks) this.drawCracks(gb, o);
    if (o.m === 9 && this.glass) this.drawGlass(g, o);
    this.drawPieces(g, o, "p");
  };
  /* la luz que se cuela por las juntas: rendija de la tapa y ojo de la cerradura; crecen con la carga */
  P.seams = function (g, o, G_) {
    const s = this.s, k = Math.pow(o.c, 1.2), L = x => this.left + x * s, Y = y => this.top + y * s;
    g.globalCompositeOperation = "lighter";
    for (let x = 10; x <= 53; x++) {
      if (x >= 26 && x <= 37) continue;
      const v = k * (.45 + .55 * hash(x * 1.7 + Math.floor(o.tv * 16) * 3.1)), grd = g.createLinearGradient(0, Y(31) - s * 11, 0, Y(31) + s * 7);
      grd.addColorStop(0, rgba(G_[2], 0)); grd.addColorStop(.62, rgba(G_[2], .38 * v)); grd.addColorStop(.7, rgba(G_[3], .9 * v)); grd.addColorStop(1, rgba(G_[2], 0));
      g.fillStyle = grd; g.fillRect(L(x), Y(31) - s * 11, s, s * 18); g.fillStyle = rgba(G_[3], Math.min(1, v * 1.15)); g.fillRect(L(x), Y(31), s, s);
    }
    const kx = L(31.5), ky = Y(42.5), rg = g.createRadialGradient(kx, ky, 0, kx, ky, s * 16 * (.4 + k));
    rg.addColorStop(0, rgba(G_[3], .9 * k)); rg.addColorStop(.35, rgba(G_[2], .5 * k)); rg.addColorStop(1, rgba(G_[1], 0)); g.fillStyle = rg; g.fillRect(kx - s * 18, ky - s * 18, s * 36, s * 36);
    g.fillStyle = rgba("#ffffff", Math.min(1, k * 1.2)); g.fillRect(L(31), Y(41), s * 2, s * 4);
    g.globalCompositeOperation = "source-over";
  };
  /* el nucleo del haz, por delante de la tapa abierta: la tapa por dentro recibe la luz */
  P.beamCore = function (g, o, G_) {
    const s = this.s, A_ = Math.min(1.2, o.beam); if (A_ <= .01 || o.f < 1) return;
    const Y = y => this.top + y * s, X = x => this.left + x * s, h = 150 * s * (.8 + .1 * this.tier);
    g.globalCompositeOperation = "lighter";
    const poly = (x0, x1, xt0, xt1) => { g.beginPath(); g.moveTo(X(x0), Y(31)); g.lineTo(X(x1), Y(31)); g.lineTo(X(xt1), Y(31) - h); g.lineTo(X(xt0), Y(31) - h); g.closePath(); };
    let grd = g.createLinearGradient(0, Y(31), 0, Y(31) - h); grd.addColorStop(0, rgba(G_[2], .5 * A_)); grd.addColorStop(.35, rgba(G_[2], .22 * A_)); grd.addColorStop(1, rgba(G_[1], 0));
    g.fillStyle = grd; poly(15, 48, 2, 61);
    grd = g.createLinearGradient(0, Y(31), 0, Y(31) - h * .8); grd.addColorStop(0, rgba("#ffffff", .62 * A_)); grd.addColorStop(.3, rgba(G_[3], .3 * A_)); grd.addColorStop(1, rgba(G_[2], 0));
    g.fillStyle = grd; poly(23, 40, 18, 45);
    const rg = g.createRadialGradient(X(31.5), Y(30), 0, X(31.5), Y(30), s * 26); rg.addColorStop(0, rgba("#ffffff", .5 * A_)); rg.addColorStop(.4, rgba(G_[3], .25 * A_)); rg.addColorStop(1, rgba(G_[2], 0));
    g.fillStyle = rg; g.fillRect(X(5), Y(8), s * 53, s * 40);
    g.globalCompositeOperation = "source-over";
  };
  /* piezas: nacen en cada golpe, caen con la gravedad, rebotan una vez, se quedan apoyadas con su sombra y se queman con filo de oro */
  P.pstate = function (p, a) {
    const u = a - p.a0; if (u < 0) return null;
    if (u < p.t1) return { x: p.x0 + p.vx * u, y: p.y0 + p.vy * u + .5 * p.g * u * u, air: 1, u };
    const v = u - p.t1; if (v < p.t2) return { x: p.xl + p.vxB * v, y: p.Ly + p.vyB * v + .5 * p.g * v * v, air: 1, u };
    const x = p.xl + p.vxB * p.t2, r = u - p.t1 - p.t2; if (r < p.hold) return { x, y: p.Ly, air: 0, u };
    const dp = (r - p.hold) / .7; if (dp >= 1) return null; return { x, y: p.Ly, air: 0, dis: dp, u };
  };
  P.drawPieces = function (g, o, pass) {
    if (!this.pieces.length || o.a < 0) return;
    const s = this.s, id = this.key, P_ = this.b.P, ex = this.left, ey = this.top;
    for (const p of this.pieces) {
      const st = this.pstate(p, o.a); if (!st) continue;
      const kind = p.kind, cv = pieceSprite(id, P_, kind, kind === "card" ? p.variant : (kind === "Z" ? p.k : 0)), w = cv.width, h = cv.height, fall = st.y - p.Ly;
      if (pass === "sh") {
        if (Math.abs(st.x - FACE.x) < 30 && st.u < p.t1 * .5) continue;
        const k = clamp(1 + fall / 70, .25, 1), sw = (w + 2) * s * k * .6;
        g.fillStyle = `rgba(5,3,12,${.38 * k * (st.dis ? 1 - st.dis : 1)})`; g.beginPath(); g.ellipse(ex + st.x * s, ey + p.Ly * s + h * s * .5, sw * .5, sw * .17, 0, 0, TAU); g.fill();
        continue;
      }
      let sw = w, face = false;
      if (kind === "card") { const total = p.t1 + p.t2, pr = clamp(st.u / total, 0, 1), ang = Math.PI + 4 * Math.PI * Math.pow(1 - pr, 1.4), cs = Math.cos(ang); sw = Math.max(1, Math.round(w * Math.abs(cs))); face = cs < 0; }
      const X = Math.round(ex + (st.x - w / 2) * s), Y = Math.round(ey + (st.y - h / 2) * s);
      g.save();
      if (st.u < .14 && Math.abs(st.x - FACE.x) < 28 && st.y + h / 2 > FACE.mouth + 1) { g.beginPath(); g.rect(-PAD, -PAD, this.W + PAD * 2, ey + FACE.mouth * s + PAD); g.clip(); }   // todavia sale de dentro: no pisa el borde delantero
      let src = cv; if (kind === "card" && !face) src = pieceSprite(id, P_, "card", 0);
      if (st.dis != null) src = this.dissolve(src, p.id, st.dis);
      const dx = kind === "card" ? X + Math.round((w - sw) / 2 * s) : X, dw = (kind === "card" ? sw : w) * s;
      if (p.flip && kind !== "card") { g.translate(X + w * s, Y); g.scale(-1, 1); g.drawImage(src, 0, 0, w * s, h * s); }
      else g.drawImage(src, 0, 0, w, h, dx, Y, dw, h * s);
      g.restore();
    }
  };
  P.dissolve = function (src, id, prog) {
    const cv = this._dcv || (this._dcv = document.createElement("canvas")); cv.width = src.width; cv.height = src.height; const x = cv.getContext("2d", { willReadFrequently: true }); x.clearRect(0, 0, cv.width, cv.height);
    const im = src.getContext("2d").getImageData(0, 0, src.width, src.height), d = im.data;
    for (let i = 0; i < src.width * src.height; i++) {
      if (!d[i * 4 + 3]) continue; const n = hash(i * 1.3 + id * 7.7);
      if (n < prog) d[i * 4 + 3] = 0; else if (n < prog + .2) { d[i * 4] = 253; d[i * 4 + 1] = 215; d[i * 4 + 2] = 66; }
    }
    x.putImageData(im, 0, 0); return cv;
  };
  P.drawBolts = function (g, o) {
    const s = this.s, ex = this.left, ey = this.top, T = this.T;
    this.bolts.forEach((bt, k) => {
      const a = o.a - T.W[k]; if (a < 0 || a > .3) return; if (!(a < .09 || (a > .14 && a < .24))) return;
      const path = pts => { g.beginPath(); pts.forEach((p, i) => { const X = ex + (FACE.x + p[0]) * s, Y = ey + p[1] * s; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); };
      g.lineJoin = "miter"; g.globalCompositeOperation = "lighter";
      [[10, "rgba(90,130,255,.22)"], [5, "rgba(150,185,255,.5)"], [2.2, "rgba(255,255,255,.95)"]].forEach(([wd, col]) => { g.strokeStyle = col; g.lineWidth = wd * s / 4 * (k ? .8 : 1); path(bt.pts); g.stroke(); bt.br.forEach(br => { path(br); g.lineWidth = wd * s / 4 * .55; g.stroke(); }); });
      g.globalCompositeOperation = "source-over";
    });
  };
  P.drawCracks = function (g, o) {
    if (o.a < 0) return;
    const s = this.s, ex = this.left + FACE.x * s, ey = this.top + FACE.base * s, a = o.a, vis = 1 - sst(this.T.rest, this.T.rest + 1, a); if (vis <= 0) return; const run = a * 240 * (1 + .12 * this.tier);
    this.cracks.forEach(br => {
      const pts = [br[0]]; let acc = 0;
      for (let i = 1; i < br.length; i++) { const dx = br[i][0] - br[i - 1][0], dy = (br[i][1] - br[i - 1][1]) * 2.17, seg = Math.hypot(dx, dy); if (acc + seg <= run) { pts.push(br[i]); acc += seg; } else { const f = Math.max(0, (run - acc) / seg); pts.push([br[i - 1][0] + (br[i][0] - br[i - 1][0]) * f, br[i - 1][1] + (br[i][1] - br[i - 1][1]) * f]); break; } }
      if (pts.length < 2) return;
      const path = () => { g.beginPath(); pts.forEach((p, i) => { const X = ex + p[0] * s, Y = ey + p[1] * s; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); };
      g.lineJoin = "round"; g.lineCap = "round"; g.globalAlpha = vis;
      g.globalCompositeOperation = "lighter"; g.strokeStyle = "rgba(245,140,35,.16)"; g.lineWidth = s * 7; path(); g.stroke(); g.globalCompositeOperation = "source-over";
      g.strokeStyle = INK; g.lineWidth = s * 3.2; path(); g.stroke(); g.strokeStyle = "#f5a623"; g.lineWidth = s * 1.8; path(); g.stroke(); g.strokeStyle = "#fff3b0"; g.lineWidth = s * .8; path(); g.stroke(); g.globalAlpha = 1;
    });
  };
  P.drawGlass = function (g, o) {
    if (o.a < 0) return;
    const s = this.s, cx = this.left + FACE.x * s, cy = this.top + (FACE.mouth - 6) * s, a = o.a, vis = 1 - sst(this.T.rest + .2, this.T.rest + 1.1, a); if (vis <= 0) return;
    const sc = s / 4, run = a * 2200 * sc * .9, lw = Math.max(1, sc);
    g.save(); g.globalAlpha = vis; g.lineJoin = "round";
    const stroke = (path, col, wd) => { g.strokeStyle = col; g.lineWidth = wd * lw; path(); g.stroke(); };
    this.glass.forEach(k => {
      const pts = [[cx, cy]];
      for (let i = 0; i < k.pts.length; i++) {
        const r = k.pts[i];
        if (r * sc > run) { const prev = i ? k.pts[i - 1] : 0, f = Math.max(0, (run - prev * sc) / ((r - prev) * sc)), a0 = k.base + (i ? k.jit[i - 1] : 0), a1 = k.base + k.jit[i], rr = lerp(prev, r, f) * sc, an = lerp(a0, a1, f); pts.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr]); break; }
        pts.push([cx + Math.cos(k.base + k.jit[i]) * r * sc, cy + Math.sin(k.base + k.jit[i]) * r * sc]);
      }
      const path = () => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); };
      stroke(path, "rgba(0,0,0,.45)", 3.2); g.globalCompositeOperation = "lighter"; stroke(path, "rgba(94,242,223,.5)", 2.4); stroke(path, "rgba(255,255,255,.95)", 1); g.globalCompositeOperation = "source-over";
    });
    [140, 300, 520].forEach(rr => {
      if (rr * sc > run) return;
      const pts = this.glass.map(k => { const idx = k.pts.findIndex(v => v >= rr), i = idx < 0 ? k.pts.length - 1 : idx; return [cx + Math.cos(k.base + k.jit[i]) * rr * sc, cy + Math.sin(k.base + k.jit[i]) * rr * sc]; });
      const path = () => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
      stroke(path, "rgba(0,0,0,.4)", 2.4); g.globalCompositeOperation = "lighter"; stroke(path, "rgba(190,250,244,.55)", .9); g.globalCompositeOperation = "source-over";
    });
    g.restore();
  };
  P.drips = function (g, o) {
    const s = this.s, xs = [15, 23, 41, 49], st = [.0, .1, .16, .24], R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(this.left + x * s, this.top + y * s, w * s, h * s); };
    xs.forEach((x, i) => {
      const len = o.a < 0 ? o.c * 5 * (i % 2 ? .6 : 1) : 5 + 15 * (1 - Math.exp(-Math.max(0, o.a - st[i]) * 1.4)); if (len < 1.5) return;
      const fade = 1 - sst(this.T.rest, this.T.rest + 1, o.a); if (fade <= 0) return; const L = Math.round(len), y0 = 33; g.globalAlpha = fade;
      R(x - 1, y0, 1, L - 1, INK); R(x + 2, y0, 1, L - 1, INK); R(x, y0, 2, L - 1, "#3fb54a"); R(x, y0, 1, L - 1, "#a6e05a");
      R(x - 1, y0 + L - 1, 4, 3, INK); R(x - 1, y0 + L, 4, 1, INK); R(x, y0 + L - 1, 2, 2, "#3fb54a"); R(x, y0 + L - 1, 1, 1, "#a6e05a"); R(x, y0 + L + 1, 2, 1, INK);
      g.globalAlpha = 1;
    });
  };
  /* ---------- DOM: el sello del margen y la ventana de mentira ---------- */
  P.dom = function (o) {
    const T = this.T, last = T.W[T.W.length - 1], sh = o.a >= last + .3;
    if (this.stp) { if (!this.stpTxt) { this.stpTxt = 1; this.stp.textContent = A.pick6(STAMP[this.tier - 1]); this.stp.dataset.t = this.tier; } this.stp.classList.toggle("on", sh); this.stp.style.setProperty("--k", sh ? (1 - Math.exp(-(o.a - last - .3) * 9)).toFixed(3) : 0); }
    if (o.m === 9) {
      const w = this.win, on = o.a > .55 && o.a < T.rest + .6; w.style.opacity = on ? 1 : 0;
      if (on) { const k = Math.min(1, (o.a - .55) / .22), e = k < 1 ? (1 - Math.pow(1 - k, 3)) * 1.06 : 1; w.style.transform = `scale(${(.6 + .4 * e).toFixed(3)})`; if (!this.winTxt) { this.winTxt = 1; w.querySelector("p").textContent = A.pick6(this.tier === 3 ? WIN_T3 : WIN_T); } }
    }
  };

  /* ------------------------------------------------------------------ reproduccion */
  P.play = function () {
    this.state0 = "play"; this.t0 = performance.now(); this.configure(); this.render(0);
    if (this.glc) requestAnimationFrame(() => { this.glc.style.transition = "opacity .4s ease-out"; this.glc.style.opacity = "1"; });   // la mesa de siempre se funde con el fieltro, sin corte
    const S = S_(), red = this.reduced();
    this.snd = A.sfx && A.sfx.cofreAbrir ? A.sfx.cofreAbrir({ id: this.key, sn: this.th.sn, tier: this.tier, hit: this.T.hit, hs: this.T.hs, W: this.T.W, rest: this.T.rest, i: this.b.i, red, taps: this.pieces.map(p => ({ t: p.a0, l: p.t1 })) }) : null;
    this.frames = 0; this.acc = 0; this.loop();
  };
  P.loop = function () {
    const step = now => {
      if (this.state0 !== "play") return;
      if (!this.chest.isConnected) { this.dispose(); return; }
      const t = Math.min((now - this.t0) / 1000, this.total), dt = now - (this.last || now); this.last = now;
      this.render(t);
      /* si la maquina va justa, el lienzo de GL baja de resolucion (la luz es suave: casi no se nota) */
      if (this.glc && t > .2 && dt > 0) { this.acc += dt; this.frames++; if (this.frames === 14) { if (this.acc / 14 > 24 && this.k > .5) { this.k = Math.max(.5, this.k * .75); this.layout(); } this.frames = 0; this.acc = 0; } }
      if (t >= this.total) { this.state0 = "done"; if (this.o.onEnd) this.o.onEnd(); return; }
      this._raf = requestAnimationFrame(step);
    };
    this.last = 0; this._raf = requestAnimationFrame(step);
  };
  /* saltar: el final de la apertura, sin pasar por lo demas; el sonido que quedaba por sonar se corta */
  P.seek = function (t) { cancelAnimationFrame(this._raf); this.state0 = "idle"; if (this.glc) { this.glc.style.transition = "none"; this.glc.style.opacity = "1"; } this.render(t); };   // para las pruebas: un instante cualquiera, sin reloj
  P.skip = function () {
    if (this.state0 !== "play") return; cancelAnimationFrame(this._raf); this.state0 = "done"; if (this.snd && this.snd.cancel) this.snd.cancel(); this.render(this.total); if (this.o.onEnd) this.o.onEnd();
  };
  P.dispose = function () {
    if (this.state0 === "gone") return; this.state0 = "gone"; cancelAnimationFrame(this._raf); if (this.snd && this.snd.cancel) this.snd.cancel(); if (this.ro) this.ro.disconnect();
    if (this.glc && this.glc.parentNode) this.glc.parentNode.removeChild(this.glc);
    this.tel.style.transform = ""; this.slot.style.transform = ""; this.chest.style.filter = "";
  };

  A.cofreFx = { create: o => (A.cofreFx.cur = new Stage(o)), warm, TH };
})(window.AIQ);
