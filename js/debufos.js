/*
 * Geolite - DEBUFOS DE MATERIA (v0.3.238, el «Probador de Geolite», paquete «debufos», preset Extrema). Lo nuevo de los retos que no cabia en
 * js/chfx.js porque tiene que LEER el mapa (refraccion, desenfoque, realimentacion):
 *   - El pase de los retos del mapa (A.deb.forMap): corre DENTRO del lienzo del mapa (js/map.js, MapViewGL._post), entre la escena y el ultimo
 *     pase, asi que va debajo de las chinchetas, del reticulo y del HUD, y la curva CRT, la vineta y la onda del revelado siguen por encima.
 *     Escarcha (frost), Cristal esmerilado (frosted), Teselas de vidrio (tiles), Senal rota (signal), Negativo de pelicula (negative) y la
 *     refraccion por esquirla del Cristal roto (crack). Cada efecto activo es un pase propio (normalmente uno); lo caro (relieve del hielo,
 *     esquirlas, rotulos de la pelicula) se hornea en ratos libres al presentar la ronda (A.deb.prep), nunca en el instante del reto.
 *     Usa el mismo contexto WebGL del mapa: si la GPU se reinicia, el mapa rehace su contexto (_initGL) y este modulo se rehace con el.
 *   - La carta que se cuela (card): naipes de la casa pegados al cristal, en un lienzo 2D sobre el mapa (#chOv), pixel art a escala entera.
 *   - Bandera mojada (flagwet): un lienzo WebGL pequeno encima de la bandera de la placa (solo en las rondas que lo traen; se rehace si se pierde).
 *   - El guante que limpia (veredicto): si superas una ronda en la que te rompieron el cristal, su guante (vivo_hand) con un pano se lleva las grietas.
 * Movimiento Minimo (html.reduce-motion) = la version quieta del mismo efecto. Ningun efecto tapa la placa, el reloj ni el marcador.
 *
 *   map.setDeb(cfg|null)        cfg = { key, t0, ptr(), frost:{lv,m}, frosted:{lv,m}, tiles:{lv,m}, signal:{lv,m}, negative:{lv}, crack:{n,glass} }
 *   A.deb.prep(ids, map)        hornea en ratos libres lo de la ronda            A.deb.mapOk(map)   programas listos
 *   A.deb.card(cfg|null, ov)    A.deb.flag(F|null, cfg)     A.deb.veredicto(superada)     A.deb.roundStart()
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const PAL = "1d0a3d 301252 4a1d96 6e40c4 9c7ce6 3a2f58 8a8fa8 c9cde0 f3f0fa 3c240a c46a1b f5a623 fdd742 fff3b0 6e3414 b06a34 a8142e e8283a ff6b5e e5408f 08787f 0dbeaf 5ef2df 0c60d3 1689fb 7ac8ff 136b3e 3fb54a a6e05a c4614a f2a07c ffd3b6 8f7467 a78f78 c6b497 0a0a0c 5c565b 6b747d 91887a b6bbb8".split(" ").map(h => "#" + h);
  const reduce = () => document.documentElement.classList.contains("reduce-motion");
  const say = (k, ...a) => { try { A.sfx && A.sfx[k] && A.sfx[k](...a); } catch (e) { /* audio no listo */ } };
  const buzz = (lo, hi, ms) => { try { if (A.haptic && A.haptic.rumble) A.haptic.rumble(lo, hi, ms); else if (A.haptic && typeof A.haptic === "function") A.haptic([ms]); } catch (e) { /* sin mando */ } };
  const idle = (fn, ms = 1200) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: ms }) : setTimeout(fn, 30));
  const rnd = seed => { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  /* preset Extrema de la maqueta (los deslizadores, tal cual) */
  const X = {
    frost: { cubre: 0.85, refr: 0.95, brillo: 0.95, radio: 150, rehiela: 0.8 },
    frosted: { borra: 28, refr: 1.7, leche: 1.4, lupa: 115, bisel: 24, inercia: 0.8 },
    tiles: { celda: 72, lente: 0.25, bisel: 0.24, radio: 130, luz: 1.2, unbit: true },
    signal: { fuerza: 1, arrastre: 2.6, blk: 32, limpia: 0.9 },
    negative: { dens: 1.35, mascara: 1, grano: 0.16, polvo: 1, lampara: 0.35, banda: 74 },
    crack: { refr: 1, brillo: 1, ab: 1, radio: 1.35, polvo: 1.5 },
    card: { gesto: 2000, vuelve: 1.2, brillo: 1.3, escala: 5 },
    flagwet: { tiempo: 6, chorreo: 1.5, cerco: 1.4, barro: 1 },
    wipe: { dur: 1.1, rad: 130, huellas: 1.4, brillo: 1.5 },
  };

  /* ================================================================== GLSL comun (coordenadas en px CSS con el origen arriba) */
  const VS = `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2. - 1., 0., 1.); }`;
  const COMMON = `#version 300 es
precision highp float; precision highp int;
uniform vec2 uR; uniform float uK, uT, uReduce, uFade; uniform vec2 uMouse; uniform sampler2D uSrc;
out vec4 o;
const float PI = 3.14159265, TAU = 6.2831853;
vec2 RC(){ return uR / uK; }
vec2 px(){ return vec2(gl_FragCoord.x, uR.y - gl_FragCoord.y) / uK; }
vec2 uv0(){ return px() / RC(); }
vec2 fuv(){ return gl_FragCoord.xy / uR; }
vec2 top2fbo(vec2 u){ return vec2(u.x, 1. - u.y); }
vec4 mapa(vec2 u){ return texture(uSrc, top2fbo(clamp(u, vec2(.0005), vec2(.9995)))); }
vec4 mapaL(vec2 u, float l){ return textureLod(uSrc, top2fbo(clamp(u, vec2(.0005), vec2(.9995))), l); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; } return s; }
vec3 vor(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.; vec2 id = vec2(0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y), r = g + h22(i + g) - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = i + g; } else if (d < d2) d2 = d; }
  return vec3(sqrt(d1), sqrt(d2), h21(id)); }
float luma(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
vec3 sat(vec3 c, float s){ return mix(vec3(luma(c)), c, s); }
float dith(){ return (h21(gl_FragCoord.xy + fract(uT * 7.31) * 91.7) - .5) / 255.; }
vec4 fin(vec3 col){ return vec4(mix(mapa(uv0()).rgb, col, uFade) + dith(), 1.); }
`;

  /* ------------------------------------------------------------------ Escarcha */
  const FROST_BAKE = `
uniform float uSeed; uniform sampler2D uFern, uFernB;
float H(vec2 p){
  vec2 uv = p / RC(), q = p / 170. + uSeed;
  float big = fbm(q + fbm(q * 1.3) * 1.6);
  vec4 f = texture(uFern, uv), fb = texture(uFernB, uv);
  float fern = f.a * (.55 + .45 * f.r), halo = fb.a, dust = vn(p / 2.2 + uSeed);
  return clamp(big * .34 + fern * .46 + halo * .26 + dust * .05, 0., 1.);
}
void main(){
  vec2 p = px(); float h = H(p), hx = H(p + vec2(1.5, 0.)), hy = H(p + vec2(0., 1.5));
  vec2 g = vec2(hx - h, hy - h) * 5.;
  float fern = texture(uFern, p / RC()).a, spark = step(.9965, h21(floor(p / 2.))) * smoothstep(.5, .9, fern);
  o = vec4(h, clamp(g * .5 + .5, 0., 1.), spark);
}`;
  const FROST_MASK = `
uniform sampler2D uPrev; uniform float uDt, uRegrow, uRad, uMoved;
void main(){
  float m = max(0., texture(uPrev, fuv()).r - uDt / max(.05, uRegrow));
  float d = length(px() - uMouse), st = (1. - smoothstep(uRad * .6, uRad, d)) * uMoved;
  o = vec4(max(m, st), 0., 0., 1.);
}`;
  const FROST = `
uniform sampler2D uIce, uAl; uniform float uCov, uRefr, uBri, uGrow, uRad, uLevel;
void main(){
  vec2 p = px(), uv = uv0(), R = RC();
  vec4 ice = texture(uIce, top2fbo(uv)); float h = ice.r; vec2 g = ice.gb * 2. - 1.;
  vec2 e = min(uv, 1. - uv); e.x *= R.x / R.y; float edge = min(e.x, e.y);
  float n = fbm(p / 260. + 3.1), field = 1. - edge * 2.3 + (n - .5) * .8, thr = 1.08 - uCov * uGrow * 1.25;
  float cover = smoothstep(thr - .05, thr + .32, field);
  float clearM = texture(uAl, top2fbo(uv)).r, keep = 1. - smoothstep(uRad * .5, uRad * 1.05, length(p - uMouse));
  cover *= 1. - max(clearM, keep);
  float a = cover * smoothstep(.18, .62, h + cover * .35);
  vec2 off = g * uRefr * 34. * a / R;
  vec3 c = mapa(uv + off).rgb * .36; vec2 b = (5. + 9. * a) / R;
  c += mapa(uv + off + vec2(b.x, 0.)).rgb * .16 + mapa(uv + off - vec2(b.x, 0.)).rgb * .16 + mapa(uv + off + vec2(0., b.y)).rgb * .16 + mapa(uv + off - vec2(0., b.y)).rgb * .16;
  vec3 base = mapa(uv).rgb, frost = mix(sat(c, .55), vec3(.86, .93, 1.), .32 + .4 * h);
  vec3 N = normalize(vec3(-g * 1.6, 1.)), L = normalize(vec3(.15, -.75, .65));
  float spec = pow(max(dot(reflect(-L, N), vec3(0, 0, 1)), 0.), 28.) * uBri;
  float rim = clamp(cover * (1. - cover) * 4., 0., 1.) * (.5 + .5 * h);
  float tw = uReduce > .5 ? .6 : .5 + .5 * sin(uT * 3. + h * 40.);
  vec3 col = mix(base, frost, a * (.62 + .2 * uLevel));
  col += spec * a * vec3(1., .98, .94) * .7 + rim * vec3(.75, .9, 1.) * .22 + ice.a * tw * uBri * a * .55;
  o = fin(col);
}`;
  /* ------------------------------------------------------------------ Cristal esmerilado */
  const RELIEF = `
uniform float uSeed;
float Hh(vec2 p){ return fbm(p / 58. + uSeed) * .62 + vn(p / 13. + uSeed * 2.) * .23 + vn(p / 2.6 + uSeed * 3.) * .15; }
void main(){
  vec2 p = px(); float h = Hh(p), hx = Hh(p + vec2(1.5, 0.)), hy = Hh(p + vec2(0., 1.5));
  o = vec4(clamp(vec2(hx - h, hy - h) * 9. * .5 + .5, 0., 1.), h, vn(p / 1.3 + uSeed * 5.));
}`;
  const BLUR = `
uniform sampler2D uB; uniform vec2 uDir; uniform float uFirst, uSig;
vec3 S(vec2 u){ return uFirst > .5 ? texture(uSrc, u).rgb : texture(uB, u).rgb; }
void main(){
  vec2 u = fuv(); vec3 a = vec3(0.); float ws = 0.;
  for (int i = -6; i <= 6; i++) { float x = float(i), w = exp(-x * x / 18.); a += S(u + uDir * x * uSig / 6. / RC()) * w; ws += w; }
  o = vec4(a / ws, 1.);
}`;
  const FROSTED = `
uniform sampler2D uRel, uBlur; uniform vec2 uLens; uniform float uLensR, uRefr, uMilk, uOn, uBevel;
void main(){
  vec2 p = px(), uv = uv0(), R = RC();
  vec4 r = texture(uRel, top2fbo(uv)); vec2 g = r.rg * 2. - 1.;
  float F = uOn * (R.y + 260.), on = 1. - smoothstep(F - 260., F, p.y + 60. * (r.b - .5));
  vec2 dl = p - uLens; float dist = length(dl);
  float inW = 1. - smoothstep(uLensR - 1.2, uLensR + 1.2, dist), bev = smoothstep(uLensR - uBevel, uLensR, dist) * inW;
  vec2 nd = dl / max(dist, 1.);
  vec3 fro = texture(uBlur, top2fbo((p + g * uRefr * 7.) / R)).rgb;
  vec3 N = normalize(vec3(-g * .9, 1.)); float lam = clamp(dot(N, normalize(vec3(.12, -.7, .7))), 0., 1.);
  vec2 lp = p - vec2(R.x * .5, R.y * .12); float lampF = exp(-dot(lp, lp) / (2. * 700. * 700.));
  fro = mix(fro, vec3(.80, .86, .86), uMilk * (.10 + .10 * lampF) * (.8 + .4 * lam));
  fro *= .96 + .08 * lam; fro += (r.a - .5) * .022 * uMilk;
  vec2 q = p - nd * bev * bev * uBevel * .9; vec3 clr = mapa(q / R).rgb;
  float lit = dot(nd, normalize(vec2(-.35, -1.)));
  clr += bev * bev * (smoothstep(.2, 1., lit) * .32 * vec3(1., .97, .9) - smoothstep(.1, 1., -lit) * .16);
  float edg = exp(-pow((dist - uLensR) / 1.1, 2.)); clr = mix(clr, vec3(1., .98, .93), edg * .35 * smoothstep(-.3, .6, lit));
  float sh = (1. - smoothstep(uLensR, uLensR + 16., length(p - uLens - vec2(4., 7.)))) * (1. - inW); fro *= 1. - sh * .16;
  vec3 col = mix(mapa(uv).rgb, mix(fro, clr, inW), on);
  o = fin(col);
}`;
  /* ------------------------------------------------------------------ Teselas de vidrio */
  const TILES = `
uniform float uCell, uLens, uBev, uRad, uOn, uBit, uJunta, uLuz; uniform vec3 uInk, uPaper;
float bayer4(vec2 p){ ivec2 q = ivec2(mod(p, 4.)); int i = q.x + q.y * 4; int b[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5); return (float(b[i]) + .5) / 16.; }
void main(){
  vec2 p = px(), uv = uv0(), R = RC(); float c = uCell;
  vec2 id = floor(p / c), cc = (id + .5) * c, l = p - cc; float hsz = c * .5;
  float dly = h21(id + 3.7) * .45 + (cc.y / R.y) * .3, a = clamp((uOn - dly) / .35, 0., 1.);
  float set = a < 1. ? 1. - pow(1. - a, 3.) + sin(a * 9.4) * .08 * (1. - a) : 1.;
  float near = 1. - smoothstep(uRad * .45, uRad, length(cc - uMouse));
  float k = mix(1., mix(uLens, 1., near * .82), set), bevW = max(1.5, uBev * c) * set;
  vec2 ad = hsz - abs(l); float dE = min(ad.x, ad.y), t = clamp(1. - dE / bevW, 0., 1.);
  vec2 nrm = ad.x < ad.y ? vec2(sign(l.x), 0.) : vec2(0., sign(l.y));
  float rc = bevW * 1.4; vec2 corner = max(abs(l) - (hsz - rc), 0.); if (corner.x > 0. && corner.y > 0.) nrm = normalize(corner * sign(l));
  float slope = t * t;
  vec2 q = cc + l * k + nrm * slope * c * .3 * set;
  vec3 col = mapaL(q / R, set * (1.2 + (1. - k) * 1.6 + slope * .8)).rgb;
  col *= mix(vec3(1.), vec3(.86, .97, .93), slope * .8 * set) * (1. + (h21(id) - .5) * .06 * set);
  vec2 lampD = normalize(vec2(R.x * .5, -R.y * .4) - cc); float facing = dot(nrm, lampD);
  col += set * uLuz * slope * (smoothstep(.1, 1., facing) * .42 * vec3(1., .97, .9));
  col *= 1. - set * uLuz * slope * smoothstep(.1, 1., -facing) * .4;
  vec2 hp = lampD * hsz * .45; col += set * uLuz * exp(-dot(l - hp, l - hp) / (2. * pow(c * .1, 2.))) * (1. - t) * .07 * vec3(1., .98, .94);
  float j = 1. - smoothstep(uJunta - .5, uJunta + .5, dE);
  col = mix(col, vec3(.07, .03, .12), j * set);
  col += set * exp(-pow((dE - uJunta - 1.) / .8, 2.)) * smoothstep(0., 1., facing) * .14;
  if (uBit > .5) { float L = clamp((luma(col) - .08) / .82, 0., 1.); col = mix(col, L > bayer4(floor(p / 2.)) ? uPaper : uInk, set); col = mix(col, uInk, j * set); }
  o = fin(col);
}`;
  /* ------------------------------------------------------------------ Senal rota */
  const YUV = `vec3 yuv(vec3 c){ return vec3(dot(c, vec3(.299, .587, .114)), dot(c, vec3(-.169, -.331, .5)), dot(c, vec3(.5, -.419, -.081))); }
vec3 rgb(vec3 y){ return vec3(y.x + 1.402 * y.z, y.x - .344 * y.y - .714 * y.z, y.x + 1.772 * y.y); }`;
  const SIGNAL = YUV + `
uniform sampler2D uPrev; uniform vec2 uVel; uniform float uMosh, uBlk, uSeed, uRefresh, uFirst;
vec3 prev(vec2 p){ return texture(uPrev, top2fbo(clamp(p / RC(), vec2(.0005), vec2(.9995)))).rgb; }
void main(){
  vec2 p = px(); vec3 f = mapa(p / RC()).rgb;
  if (uFirst > .5) { o = vec4(f, 1.); return; }
  vec2 b = floor(p / uBlk); float r1 = h21(b + uSeed), r2 = h21(b * 1.7 + uSeed * .37);
  float wave = fract(b.y * .043 + b.x * .011 - uRefresh), bad = step(r1, uMosh * (.55 + .45 * smoothstep(0., .5, wave)));
  if (bad < .5) { o = vec4(f, 1.); return; }
  vec2 mv = uVel * (1.4 + 1.6 * r2) + (h22(b + floor(uSeed)) - .5) * 3. * uMosh;
  vec3 y0 = yuv(prev(p - mv)), yc = yuv(prev(p - mv + vec2(.75 + r2, 0.))), yf = yuv(f);
  o = vec4(clamp(rgb(vec3(mix(y0.x, yf.x, .05), mix(yc.yz, yf.yz, .03) * 1.03)), 0., 1.), 1.);
}`;
  const SIGNAL_STATIC = YUV + `
uniform float uBlk;
void main(){
  vec2 p = px(), uv = uv0(), R = RC(), b = floor(p / uBlk);
  float band = step(.78, sin(b.y * .19 + 1.3) * .5 + .5) * step(h21(b * 3.1), .5) * step(b.x, floor(R.x / uBlk * .8)) * step(floor(R.x / uBlk * .25), b.x);
  vec2 mv = vec2(-16., 5.) * (.6 + h21(b) * .8) * band;
  vec3 y0 = yuv(mapa((p - mv) / R).rgb), yc = yuv(mapa((p - mv * 1.08) / R).rgb);
  o = fin(band > .01 ? clamp(rgb(vec3(y0.x, yc.yz * 1.04)), 0., 1.) : mapa(uv).rgb);
}`;
  /* ------------------------------------------------------------------ Negativo: pelicula sobre mesa de luz */
  const FILM = `
uniform sampler2D uEdge; uniform float uSx, uDens, uGrain, uDust, uLight, uHot, uStrip, uGap, uPitch, uNaranja; uniform vec2 uHotP;
float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
void main(){
  vec2 p = px(), uv = uv0(), R = RC();
  float fx = p.x + uSx, per = R.x + uGap, lx = mod(fx, per), S = uStrip;
  float dh = length(p - uHotP), light = uLight * (.80 + uHot * .42 * exp(-dh * dh / (2. * 330. * 330.)));
  light *= 1. - .10 * pow(length((uv - .5) * vec2(1.1, 1.3)), 2.);
  vec3 L = vec3(1., .975, .93) * light, base = mix(vec3(1.), vec3(1., .63, .37), uNaranja);
  vec3 c = mapa(vec2(lx / R.x, uv.y)).rgb, dens = pow(c, vec3(.9)) * uDens;
  vec3 T = exp(-dens * vec3(2.6, 2.9, 3.2) * 1.15) * .96 + .04;
  float gt = uReduce > .5 ? 0. : floor(uT * 24.);
  float gn = (h21(gl_FragCoord.xy + gt * 37.17) - .5) * .7 + (vn(gl_FragCoord.xy / 1.7 + gt * 11.3) - .5) * .6;
  float mid = 4. * luma(T) * (1. - luma(T)); T *= 1. + gn * uGrain * (.35 + .65 * mid);
  float inImg = step(S, p.y) * step(p.y, R.y - S) * step(lx, R.x);
  vec3 film = mix(base * .9, base * T, inImg);
  float ey = min(abs(p.y - S), abs(p.y - (R.y - S))); film *= 1. - .25 * exp(-ey / 1.6) * step(lx, R.x);
  vec4 e = texture(uEdge, vec2(min(lx, R.x - 1.) / R.x, uv.y)); e.rgb *= e.a;
  float onF = step(lx, R.x);
  film *= 1. - e.r * .78 * onF; film *= 1. - e.g * uDust * .85 * onF; film = mix(film, base * .95, e.b * uDust * .7 * onF);
  float pxk = mod(fx, uPitch) - uPitch * .5;
  float dp = min(rbox(vec2(pxk, p.y - S * .5), vec2(uPitch * .2, S * .2), 3.5), rbox(vec2(pxk, p.y - (R.y - S * .5)), vec2(uPitch * .2, S * .2), 3.5));
  float hole = 1. - smoothstep(-.6, .6, dp);
  film = mix(film, vec3(1.), hole); film *= 1. - .35 * exp(-pow(dp / 1.1, 2.)) * (1. - hole);
  o = fin(film * L);
}`;
  /* ------------------------------------------------------------------ Cristal roto: refraccion por esquirla */
  const CRACK = `
uniform sampler2D uShard, uLines; uniform vec4 uH0, uH1, uH2; uniform float uRefr, uBri, uAb, uLvl, uFrost;
float revela(vec4 h, vec2 p){ return h.w * step(0., h.z) * step(length(p - h.xy), h.z * 3600.); }
vec2 onda(vec4 h, vec2 p){
  if (h.w < .5 || h.z < 0. || h.z > .16 || uReduce > .5) return vec2(0);
  vec2 d = p - h.xy; float r = length(d), Rr = h.z * 2600., k = 1. - h.z / .16;
  return d / max(r, 1.) * exp(-pow((r - Rr) / 60., 2.)) * 12. * k * k;
}
void main(){
  vec2 p = px(), uv = uv0(), R = RC();
  vec3 rv = vec3(revela(uH0, p), revela(uH1, p), revela(uH2, p));
  p += onda(uH0, p) + onda(uH1, p) + onda(uH2, p);
  vec4 S = texture(uShard, uv); float sano = step(.99, S.b); int id = int(min(2., floor(S.b * 3.)));
  float on = (1. - sano) * (id == 0 ? rv.x : id == 1 ? rv.y : rv.z);
  vec2 tilt = (S.rg - .5) / .47;
  vec3 L3 = texture(uLines, uv).rgb * rv; float v = max(L3.r, max(L3.g, L3.b));
  vec3 L3s = texture(uLines, uv + vec2(1.5) / R).rgb * rv; float vs = max(L3s.r, max(L3s.g, L3s.b));
  float core = smoothstep(.12, .8, v), halo = clamp(v * 3.2, 0., 1.);
  vec2 off = tilt * uRefr * 9. * on, ab = tilt * (halo * 1.6 + .5 * on) * uAb, q = (p + off) / R;
  vec3 col = vec3(mapa(q + ab / R).r, mapa(q).g, mapa(q - ab / R).b);
  vec2 lamp = vec2(R.x * .5, R.y * .28) - (uMouse - R * .5) * .55;
  float lg = exp(-dot(p - lamp, p - lamp) / (2. * 420. * 420.)), facet = dot(tilt, normalize(lamp - p + 1e-3));
  col *= 1. + facet * .1 * on * uBri;
  col += vec3(1., .97, .9) * pow(max(facet, 0.), 2.) * (.04 + lg * .3) * on * uBri;
  col = mix(col, col * vec3(.94, .99, 1.02), on * .5);
  float tw = uReduce > .5 ? .8 : .7 + .3 * sin(uT * 2.3 + p.x * .05 + p.y * .03), spark = step(.985, h21(floor(p / 2.))) * core;
  col *= 1. - clamp(vs - v, 0., 1.) * .55; col = mix(col, col * .82 + vec3(.06, .07, .08), halo * .35);
  col += vec3(.9, .96, 1.) * core * (.28 + 1.25 * lg * tw) * uBri + spark * lg * 1.2 * uBri;
  for (int i = 0; i < 3; i++) {
    vec4 h = i == 0 ? uH0 : i == 1 ? uH1 : uH2; if (h.w < .5 || h.z < 0.) continue;
    float r = length(p - h.xy), rr = (26. + 10. * uLvl) * uFrost; if (r > rr * 1.2) continue;
    vec3 vc = vor((p - h.xy) / (3. + r * .12));
    float f = 1. - smoothstep(rr * .35, rr, r + (vn(p / 7.) - .5) * 12.), ed = 1. - smoothstep(0., .12, vc.y - vc.x);
    vec3 sh2 = mapa((p + (h22(vec2(vc.z * 91.)) - .5) * 10.) / R).rgb;
    col = mix(col, mix(sh2, vec3(.82, .87, .9), .15 + .25 * vc.z), f * .75); col += vec3(.9, .95, 1.) * ed * f * .22 * (.5 + lg);
  }
  o = fin(col);
}`;
  const COPY = `void main(){ o = vec4(texture(uSrc, fuv()).rgb, 1.); }`;
  const SRC = { frostBake: FROST_BAKE, frostMask: FROST_MASK, frost: FROST, relief: RELIEF, blur: BLUR, frosted: FROSTED, tiles: TILES, signal: SIGNAL, signalStatic: SIGNAL_STATIC, negative: FILM, crack: CRACK, copy: COPY };

  /* ================================================================== lienzos horneados (puertos de la maqueta) */
  /* polilineas en un lienzo transparente: alfa = cobertura, R y G = datos */
  function lienzo(W, H, lines, blur = 0) {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"); g.lineCap = "round"; g.lineJoin = "round"; if (blur) g.filter = `blur(${blur}px)`;
    const groups = new Map();
    for (const L of lines) {
      const k = Math.round(L.w * 4) + "|" + Math.round((L.r == null ? 1 : L.r) * 31);
      let p = groups.get(k); if (!p) { p = { path: new Path2D(), w: Math.round(L.w * 4) / 4, r: Math.round((L.r == null ? 1 : L.r) * 31) / 31 }; groups.set(k, p); }
      const a = L.pts; p.path.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) p.path.lineTo(a[i], a[i + 1]);
    }
    [...groups.values()].sort((a, b) => b.w - a.w).forEach(p => { g.strokeStyle = `rgb(${Math.round(p.r * 255)},0,0)`; g.lineWidth = Math.max(0.5, p.w); g.stroke(p.path); });
    return c;
  }
  /* escarcha: helechos que nacen en los bordes del cristal (ramas a +-60 grados) y estrellas sueltas cerca de los bordes */
  function helechos(W, H, seed) {
    const R = rnd(seed), lines = [];
    const fern = (x, y, ang, len, w, depth) => {
      const step = depth ? 3 : 3.5, n = Math.max(2, Math.floor(len / step)), per = depth === 0 ? 3 : 4; let pts = [x, y]; const curv = (R() - 0.5) * 0.012;
      for (let i = 1; i <= n; i++) {
        ang += curv + (R() - 0.5) * 0.035; x += Math.cos(ang) * step; y += Math.sin(ang) * step; pts.push(x, y);
        const ww = w * (1 - 0.55 * i / n);
        if (pts.length >= 14 || i === n) { lines.push({ pts, w: ww, r: [1, 0.78, 0.6][depth] }); pts = [x, y]; }
        if (depth < 2 && i > 1 && i % per === 0 && i < n - 1) {
          const bl = len * (depth ? 0.5 : 0.36) * Math.pow(1 - i / n, 0.85) * (0.55 + R() * 0.75), j = (R() - 0.5) * 0.12;
          if (bl > 5) { fern(x, y, ang + Math.PI / 3 + j, bl, w * 0.55, depth + 1); if (R() < 0.92) fern(x, y, ang - Math.PI / 3 - j, bl * (0.75 + R() * 0.4), w * 0.55, depth + 1); }
        }
        if (x < -40 || y < -40 || x > W + 40 || y > H + 40) break;
      }
    };
    const per = 2 * (W + H); let s = 0;
    while (s < per) {
      s += 26 + R() * 58; let x, y, nx, ny; const u = s % per;
      if (u < W) { x = u; y = -2; nx = 0; ny = 1; } else if (u < W + H) { x = W + 2; y = u - W; nx = -1; ny = 0; } else if (u < 2 * W + H) { x = 2 * W + H - u; y = H + 2; nx = 0; ny = -1; } else { x = -2; y = per - u; nx = 1; ny = 0; }
      fern(x, y, Math.atan2(ny, nx) + (R() - 0.5) * 1.5, 110 + Math.pow(R(), 1.5) * 430, 2.2 + R() * 1.2, 0);
    }
    for (let k = 0; k < 70; k++) {
      const x = R() * W, y = R() * H, e = Math.min(x, y, W - x, H - y); if (R() > Math.exp(-e / 260)) continue;
      const r = 14 + R() * 46, a0 = R() * Math.PI; for (let a = 0; a < 6; a++) fern(x, y, a0 + a * Math.PI / 3, r, 1.5, 1);
    }
    return lines;
  }
  /* cristal roto: esquirlas (R,G = inclinacion, B = golpe*85 + azar; 255 = sano) y grietas (canal = golpe) */
  function grietas(W, H, golpes, seed) {
    const R = rnd(seed);
    const sh = document.createElement("canvas"); sh.width = W; sh.height = H;
    const ln = document.createElement("canvas"); ln.width = W; ln.height = H;
    const gs = sh.getContext("2d"), gl = ln.getContext("2d");
    gs.fillStyle = "rgb(128,128,255)"; gs.fillRect(0, 0, W, H); gl.fillStyle = "#000"; gl.fillRect(0, 0, W, H);
    gl.globalCompositeOperation = "lighter"; gl.lineCap = "round"; gl.lineJoin = "round";
    const segs = [];
    golpes.forEach((G, gi) => {
      const nR = 10 + Math.floor(R() * 5), a0 = R() * Math.PI * 2, rad = [];
      for (let i = 0; i < nR; i++) {
        const ang = a0 + (i + (R() - 0.5) * 0.55) * (Math.PI * 2 / nR), len = G.r * (0.5 + R() * 0.55);
        const pts = [{ x: G.x, y: G.y, r: 0 }]; let a = ang, x = G.x, y = G.y, r = 0, wob = 0;
        while (r < len) { const st = 9 + R() * 9; wob = wob * 0.6 + (R() - 0.5) * 0.22; a += wob * 0.5; x += Math.cos(a) * st; y += Math.sin(a) * st; r = Math.hypot(x - G.x, y - G.y); pts.push({ x, y, r }); a = a * 0.8 + ang * 0.2; }
        rad.push({ pts, len: r });
        for (let k = 3; k < pts.length - 2; k++) if (R() < 0.07) {
          let bx = pts[k].x, by = pts[k].y, ba = ang + (R() < 0.5 ? -1 : 1) * (0.35 + R() * 0.5); const bp = [bx, by], bl = (len - pts[k].r) * (0.25 + R() * 0.4);
          for (let s = 0; s < bl; s += 10) { ba += (R() - 0.5) * 0.25; bx += Math.cos(ba) * 10; by += Math.sin(ba) * 10; bp.push(bx, by); }
          segs.push({ pts: bp, w: 0.9, ch: gi, v: 0.45 });
        }
      }
      const at = (rd, rr) => { const p = rd.pts; for (let k = 1; k < p.length; k++) if (p[k].r >= rr) { const f = (rr - p[k - 1].r) / Math.max(1e-3, p[k].r - p[k - 1].r); return { x: p[k - 1].x + (p[k].x - p[k - 1].x) * f, y: p[k - 1].y + (p[k].y - p[k - 1].y) * f }; } return p[p.length - 1]; };
      const between = (rd, ra, rb) => rd.pts.filter(q => q.r > ra && q.r < rb);
      const rings = []; for (let rr = 12 + R() * 6; rr < G.r * 1.1; rr *= 1.45 + R() * 0.25) rings.push(rr);
      for (let i = 0; i < nR; i++) {
        const Aa = rad[i], Bq = rad[(i + 1) % nR], lim = Math.min(Aa.len, Bq.len) * 0.97; let prev = 0, prevPath = null; const present = [0];
        rings.forEach((rr, k) => { if (rr < lim && R() < (k < 4 ? 0.96 : 0.78 - k * 0.04)) present.push(rr); });
        const ringPath = rr => { const pa = at(Aa, rr), pb = at(Bq, rr), m = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }, dx = m.x - G.x, dy = m.y - G.y, dl = Math.hypot(dx, dy) || 1, bow = (R() - 0.3) * rr * 0.08; return [pa, { x: m.x + dx / dl * bow + (R() - 0.5) * 3, y: m.y + dy / dl * bow + (R() - 0.5) * 3 }, pb]; };
        for (let k = 1; k < present.length; k++) {
          const rr = present[k], rp = ringPath(rr);
          segs.push({ pts: rp.flatMap(q => [q.x, q.y]), w: Math.max(0.8, 1.6 - k * 0.12), ch: gi, v: Math.max(0.35, 1 - rr / G.r * 0.6) });
          const ga = between(Aa, prev, rr), gb = between(Bq, prev, rr), P2 = [];
          if (prev === 0) P2.push({ x: G.x, y: G.y }); else P2.push(...prevPath);
          P2.push(...gb); P2.push(...rp.slice().reverse()); P2.push(...ga.reverse());
          const cen = k <= 2 ? 1 : 0.6 + R() * 0.4, ang = R() * Math.PI * 2, m = (0.45 + R() * 0.55) * cen;
          gs.fillStyle = `rgb(${Math.round(128 + Math.cos(ang) * m * 120)},${Math.round(128 + Math.sin(ang) * m * 120)},${gi * 85 + Math.floor(R() * 80)})`;
          gs.beginPath(); P2.forEach((q, j) => (j ? gs.lineTo(q.x, q.y) : gs.moveTo(q.x, q.y))); gs.closePath(); gs.fill();
          prev = rr; prevPath = rp;
        }
      }
      rad.forEach(rd => { const p = rd.pts; for (let k = 1; k < p.length; k += 3) { const q = p.slice(k - 1, Math.min(p.length, k + 3)); segs.push({ pts: q.flatMap(z => [z.x, z.y]), w: Math.max(0.85, 1.9 * (1 - q[0].r / (rd.len + 1))), ch: gi, v: Math.max(0.22, 1 - Math.pow(q[0].r / (rd.len + 1), 1.5) * 0.85) }); } });
      for (let k = 0; k < 14; k++) { const a = R() * Math.PI * 2, r0 = 4 + R() * 12, r1 = r0 + 6 + R() * 16; segs.push({ pts: [G.x + Math.cos(a) * r0, G.y + Math.sin(a) * r0, G.x + Math.cos(a + 0.3) * r1, G.y + Math.sin(a + 0.3) * r1], w: 0.9, ch: gi, v: 0.55 }); }
    });
    const col = (ch, v) => { const c = [0, 0, 0]; c[ch] = Math.round(255 * v); return `rgb(${c[0]},${c[1]},${c[2]})`; };
    const stroke = (g, s, w, style) => { g.strokeStyle = style; g.lineWidth = w; g.beginPath(); const a = s.pts; g.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) g.lineTo(a[i], a[i + 1]); g.stroke(); };
    gl.filter = "blur(2.5px)"; segs.forEach(s => stroke(gl, s, s.w * 3 + 3, col(s.ch, 0.2 * (s.v || 1))));
    gl.filter = "none"; segs.forEach(s => stroke(gl, s, s.w, col(s.ch, 0.8 * (s.v || 1))));
    /* para el guante del veredicto: las mismas grietas en blanco sobre transparente (alli no hay mapa que refractar) */
    const wh = document.createElement("canvas"); wh.width = W; wh.height = H; const gw = wh.getContext("2d"); gw.lineCap = "round"; gw.lineJoin = "round";
    gw.filter = "blur(2px)"; segs.forEach(s => stroke(gw, s, s.w * 3 + 3, `rgba(170,210,255,${(0.16 * (s.v || 1)).toFixed(3)})`));
    gw.filter = "none"; segs.forEach(s => stroke(gw, s, s.w + 1, `rgba(0,8,20,${(0.45 * (s.v || 1)).toFixed(3)})`)); segs.forEach(s => stroke(gw, s, s.w * 0.85, `rgba(240,248,255,${(0.95 * (s.v || 1)).toFixed(3)})`));
    return { shard: sh, lines: ln, white: wh };
  }
  /* golpes al azar sobre el mapa, lejos del HUD y separados entre si */
  function golpesAzar(W, H, n, R, rk) {
    const out = [], sx = W / 1920, sy = H / 1080, hud = A.chal && A.chal.hudPx ? A.chal.hudPx(W, H) : [];
    for (let tries = 0; out.length < n && tries < 400; tries++) {
      const x = (380 + R() * 1160) * sx, y = (340 + R() * 480) * sy;
      if (out.some(o => Math.hypot(o.x - x, o.y - y) < 330 * sx)) continue;
      if (tries < 300 && hud.some(([a, b, c, d]) => x > a - 40 && x < c + 40 && y > b - 40 && y < d + 40)) continue;
      out.push({ x, y, r: (240 + R() * 120) * sx * rk });
    }
    return out;
  }
  /* pelicula: rotulo de borde, polvo, pelos y rayas, una vez por ronda (r = rotulo, g = polvo/pelo, b = raya) */
  function edgeCanvas(W, H, S, seed, lvl) {
    const R = rnd(seed), c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"); g.fillStyle = "rgb(255,0,0)"; g.textBaseline = "middle"; g.font = "700 11px 'Courier New', monospace";
    const fr = 10 + Math.floor(R() * 20), yT = Math.round(S * 0.13) + 1, yB = H - Math.round(S * 0.13) - 1;
    for (let x = 30; x < W - 80; x += 330) {
      const k = Math.round(x / 330);
      g.fillText("GEOLITE 400", x, yT); g.fillText((k % 2 ? "◂ " + (fr + 1) + "A" : "" + (fr + 1)) + "   5063", x + 150, yT);
      g.fillText(k % 2 ? "" + (fr + 1) : "◂ " + (fr + 1) + "A", x + 60, yB); g.fillText("GEOLITE 400", x + 160, yB);
    }
    const gc = a => `rgba(0,255,0,${a})`;
    for (let i = 0, n = [60, 110, 170][lvl - 1]; i < n; i++) { const x = R() * W, y = R() * H, r = R() < 0.85 ? 0.6 + R() * 0.6 : 1 + R() * 1.2; g.fillStyle = gc(0.55 + R() * 0.45); g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
    g.lineCap = "round";
    for (let i = 0; i < 2 + lvl * 2; i++) {
      let x = R() * W, y = S + R() * (H - 2 * S), a = R() * 6.283, cv = (R() - 0.5) * 0.06; const len = 50 + R() * 170;
      g.strokeStyle = gc(0.75); g.lineWidth = 0.8 + R() * 0.5; g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < len; s += 3) { cv += (R() - 0.5) * 0.03; a += cv; x += Math.cos(a) * 3; y += Math.sin(a) * 3; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < lvl; i++) { const x = R() * W, y0 = R() * H * 0.4, y1 = y0 + H * (0.3 + R() * 0.6); g.strokeStyle = "rgba(0,0,255,0.55)"; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y0); g.bezierCurveTo(x + (R() - 0.5) * 8, y0 + 200, x + (R() - 0.5) * 8, y1 - 200, x + (R() - 0.5) * 6, y1); g.stroke(); }
    return c;
  }

  /* ================================================================== lo horneado de la ronda (A.deb.prep): por tamano y semilla, en ratos libres */
  const BK = { frost: null, crack: null, crackNext: null, film: null, lastCrack: null };
  function bakeFrost(W, H) { const seed = 1 + Math.floor(Math.random() * 9999), L = helechos(W, H, seed); return { W, H, fern: lienzo(W, H, L, 0), fernB: lienzo(W, H, L.map(l => Object.assign({}, l, { w: l.w * 2.5 + 2 })), 3), up: null }; }
  function bakeCrack(W, H) { const seed = 1 + Math.floor(Math.random() * 9999), R = rnd(seed), g = golpesAzar(W, H, 3, R, X.crack.radius || 1.35); return { W, H, g, c: grietas(W, H, g, seed * 7), up: null }; }
  function bakeFilm(W, H, lvl) { return { W, H, lvl, c: edgeCanvas(W, H, X.negative.banda, 1 + Math.floor(Math.random() * 9999), lvl), up: null }; }
  X.crack.radius = 1.35;

  /* ================================================================== el pase del mapa */
  class MapDeb {
    constructor(map) {
      this.map = map; const gl = this.gl = map.gl; this.P = {}; this.T = {}; this.U = new Map(); this.st = {}; this.key = null; this.gen = -1; this.last = 0;
      this.psc = gl.getExtension("KHR_parallel_shader_compile");
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
      this.vs = sh(gl.VERTEX_SHADER, VS);
      for (const k in SRC) { const p = gl.createProgram(), f = sh(gl.FRAGMENT_SHADER, COMMON + SRC[k]); gl.attachShader(p, this.vs); gl.attachShader(p, f); gl.linkProgram(p); this.P[k] = { p, f, ok: 0 }; }
      this.vao = gl.createVertexArray();
    }
    ready(k) {
      const P = this.P[k]; if (!P) return false; if (P.ok) return P.ok > 0; const gl = this.gl;
      if (this.psc && !gl.getProgramParameter(P.p, this.psc.COMPLETION_STATUS_KHR)) return false;
      if (!gl.getProgramParameter(P.p, gl.LINK_STATUS)) { console.warn("debufos:", k, gl.getProgramInfoLog(P.p), gl.getShaderInfoLog(P.f)); P.ok = -1; return false; }
      P.ok = 1; return true;
    }
    allReady() { return Object.keys(SRC).every(k => this.ready(k)); }
    tgt(name, w, h, o = {}) {
      const gl = this.gl; let t = this.T[name]; w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h)); gl.activeTexture(gl.TEXTURE15);
      if (t && t.w === w && t.h === h) return t;
      if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); }
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const f = o.nearest ? gl.NEAREST : gl.LINEAR, wr = o.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
      const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return (this.T[name] = { tex, fbo, w, h, fresh: true });
    }
    /* sube un lienzo a una textura (una vez por lienzo; lo guarda el propio horneado) */
    upload(rec, keyName, cv) {
      const gl = this.gl; if (rec[keyName] && rec[keyName].gl === gl) return rec[keyName].tex;
      gl.activeTexture(gl.TEXTURE15); const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      rec[keyName] = { gl, tex }; return tex;
    }
    draw(k, uni, dst) {
      const gl = this.gl, P = this.P[k], p = P.p; gl.useProgram(p);
      if (!this.U.has(p)) this.U.set(p, {}); const UC = this.U.get(p);
      const loc = n => (n in UC ? UC[n] : (UC[n] = gl.getUniformLocation(p, n)));
      let unit = 6;   // unidades 6+: el mapa deja las suyas (0-4) enlazadas entre fotogramas
      for (const n in uni) {
        const v = uni[n], l = loc(n); if (l == null) continue;
        if (v && (v instanceof WebGLTexture || v.tex)) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v.tex || v); gl.uniform1i(l, unit); unit++; }
        else if (Array.isArray(v)) { if (v.length === 2) gl.uniform2f(l, v[0], v[1]); else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2]); else gl.uniform4f(l, v[0], v[1], v[2], v[3]); }
        else gl.uniform1f(l, +v || 0);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo); gl.viewport(0, 0, dst.w, dst.h); gl.bindVertexArray(this.vao); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE15);
    }
    /* scene: { tex, w, h } del mapa. Devuelve la textura que debe leer el ultimo pase, o null (sin efecto: el mapa tal cual) */
    run(scene, now, gen) {
      const cfg = this.map.debCfg; if (!cfg) { this.key = null; return null; }
      const gl = this.gl, W = this.map.W, H = this.map.H, sw = scene.w, sh = scene.h, k = sw / W, red = reduce();
      const dt = this.last ? Math.min(0.05, Math.max(0.001, (now - this.last) / 1000)) : 0.016; this.last = now;
      const T = ((now - (cfg.t0 || 0)) / 1000), st = this.st;
      if (cfg.key !== this.key) { this.key = cfg.key; this.arrive(cfg, now); }
      const ptr = (cfg.ptr && cfg.ptr()) || { x: W / 2, y: H / 2 }, mouse = [ptr.x, ptr.y];
      const fade = cfg.out ? Math.max(0, 1 - (now - cfg.out) / 350) : 1; if (cfg.out && fade <= 0) { this.map.debCfg = null; this.key = null; return null; }
      const base = (dst) => ({ uR: [dst.w, dst.h], uK: dst.w / W, uT: red ? 0 : T, uReduce: red ? 1 : 0, uFade: fade, uMouse: mouse });
      let src = scene, n = 0;
      const out = () => this.tgt("o" + (n++ & 1), sw, sh);
      gl.disable(gl.BLEND); gl.activeTexture(gl.TEXTURE15);
      /* Senal rota: va primero (rompe la imagen que llega); su realimentacion es su propia salida */
      if (cfg.signal && this.ready("signal") && this.ready("signalStatic")) {
        const c = cfg.signal, lv = c.lv, P = X.signal, blk = P.blk;
        if (red) { const d = out(); this.draw("signalStatic", Object.assign(base(d), { uSrc: src, uBlk: blk }), d); src = d; st.sigFirst = 2; }
        else {
          const pv = this.map.pv || [0, 0], zv = Math.abs(this.map.zv || 0);
          let vel = [-pv[0] * dt * 5, -pv[1] * dt * 5]; const vl = Math.hypot(vel[0], vel[1]); if (vl > 12) vel = [vel[0] * 12 / vl, vel[1] * 12 / vl];
          const sp = Math.hypot(vel[0], vel[1]) * 0.25 + zv * 0.9, e = (now - st.sigT0) / 1000;
          let target = Math.min(1, sp * 1.6) * P.fuerza * [0.4, 0.7, 1][lv - 1] * (c.m || 1);
          if (e < 0.6) { target = Math.max(target, (1 - e / 0.6) * 0.95 + 0.05); vel = [vel[0] * 0.3, vel[1] * 0.3 + 2.2]; }
          const lim = P.limpia * (lv === 3 ? 2 : 1);
          st.mo = target > (st.mo || 0) ? target : Math.max(0, (st.mo || 0) - dt / lim); st.ref = (st.ref || 0) + dt / Math.max(0.1, lim);
          const A_ = this.tgt("sA", sw, sh), C_ = this.tgt("sC", sw, sh), prev = st.sigFlip ? C_ : A_, dst = st.sigFlip ? A_ : C_;
          this.draw("signal", Object.assign(base(dst), { uSrc: src, uPrev: prev, uVel: [vel[0] * P.arrastre, vel[1] * P.arrastre], uMosh: st.mo, uBlk: blk, uSeed: Math.floor(T * 2.2) * 0.13, uRefresh: st.ref, uFirst: st.sigFirst > 0 ? 1 : 0 }), dst);
          st.sigFirst = Math.max(0, (st.sigFirst || 0) - 1); st.sigFlip = !st.sigFlip; src = dst;
        }
      }
      /* Teselas de vidrio: la cara de cada tesela funde el detalle (mipmaps de lo que llega) */
      if (cfg.tiles && this.ready("tiles")) {
        const c = cfg.tiles, lv = c.lv, P = X.tiles, mm = c.m == null ? 1 : c.m;
        if (st.mipGen !== gen || src !== scene) { gl.bindTexture(gl.TEXTURE_2D, src.tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.generateMipmap(gl.TEXTURE_2D); st.mipGen = gen; }
        else { gl.bindTexture(gl.TEXTURE_2D, src.tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
        const cell = Math.max(8, Math.round(P.celda * [0.54, 0.75, 1][lv - 1] / 2) * 2), lens = 1 - (1 - Math.min(1, P.lente * [1.5, 1.2, 1][lv - 1])) * mm;
        const d = out();
        this.draw("tiles", Object.assign(base(d), { uSrc: src, uCell: cell, uLens: lens, uBev: P.bisel, uRad: P.radio, uOn: red ? 9 : (now - st.tilesT0) / 1000, uBit: P.unbit ? 1 : 0, uJunta: cell > 30 ? 1.2 : 0.9, uLuz: P.luz, uInk: [0x1d / 255, 0x0a / 255, 0x3d / 255], uPaper: [1, 0xf3 / 255, 0xb0 / 255] }), d);
        gl.bindTexture(gl.TEXTURE_2D, src.tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        src = d;
      }
      /* Cristal esmerilado: el mapa desenfocado (se rehace solo si cambia la escena o el nivel) y la ventana pulida que sigue al puntero */
      if (cfg.frosted && this.ready("frosted") && this.ready("blur") && this.ready("relief")) {
        const c = cfg.frosted, lv = c.lv, P = X.frosted, mm = c.m == null ? 1 : c.m, hw = sw / 2, hh = sh / 2;
        const rel = this.tgt("rel", W, H); if (rel.fresh || st.relKey !== cfg.key) { rel.fresh = false; st.relKey = cfg.key; this.draw("relief", Object.assign(base(rel), { uSeed: Math.random() * 30 }), rel); }
        const bA = this.tgt("bA", hw, hh), bB = this.tgt("bB", hw, hh), sig = Math.max(2, P.borra * [0.34, 0.62, 1][lv - 1] * mm), bk = sig.toFixed(2) + "|" + gen + "|" + (src === scene ? 0 : n);
        if (bk !== st.blurKey || src !== scene) {
          st.blurKey = bk;
          this.draw("blur", Object.assign(base(bB), { uSrc: src, uB: bA, uDir: [1, 0], uFirst: 1, uSig: sig }), bB);
          this.draw("blur", Object.assign(base(bA), { uSrc: src, uB: bB, uDir: [0, 1], uFirst: 0, uSig: sig }), bA);
          this.draw("blur", Object.assign(base(bB), { uSrc: src, uB: bA, uDir: [0.7, 0.7], uFirst: 0, uSig: sig * 0.5 }), bB);
          this.draw("blur", Object.assign(base(bA), { uSrc: src, uB: bB, uDir: [0.7, -0.7], uFirst: 0, uSig: sig * 0.5 }), bA);
        }
        const kk = red ? 1 : 1 - Math.pow(P.inercia, dt * 60);
        if (st.lx == null) { st.lx = ptr.x; st.ly = ptr.y; }
        st.lx += (ptr.x - st.lx) * kk; st.ly += (ptr.y - st.ly) * kk;
        const d = out();
        this.draw("frosted", Object.assign(base(d), { uSrc: src, uRel: rel, uBlur: bA, uLens: [st.lx, st.ly], uLensR: P.lupa, uBevel: Math.min(P.bisel, P.lupa * 0.4), uRefr: P.refr * [0.7, 0.85, 1][lv - 1], uMilk: P.leche * [0.7, 0.85, 1][lv - 1] * Math.max(0.4, mm), uOn: red ? 1 : Math.min(1, (now - st.groundT0) / 600) }), d);
        src = d;
      }
      /* Negativo de pelicula */
      if (cfg.negative && this.ready("negative")) {
        const lv = cfg.negative.lv || 1, P = X.negative;
        if (!BK.film || BK.film.W !== W || BK.film.H !== H || BK.film.lvl !== lv) BK.film = bakeFilm(W, H, lv);
        const edge = this.upload(BK.film, "up", BK.film.c), per = W + 44, u = red ? 1 : Math.min(1, (now - st.filmT0) / 550);
        const e = u < 1 ? 1 - Math.pow(1 - u, 3) * (1 - 2.2 * u * (1 - u)) : 1, kk = red ? 1 : 1 - Math.pow(0.86, dt * 60);
        if (st.hx == null) { st.hx = ptr.x; st.hy = ptr.y; } st.hx += (ptr.x - st.hx) * kk; st.hy += (ptr.y - st.hy) * kk;
        const d = out();
        this.draw("negative", Object.assign(base(d), { uSrc: src, uEdge: edge, uSx: Math.round(-per + per * e), uDens: P.dens * [0.72, 0.86, 1][lv - 1], uGrain: P.grano * [0.7, 0.85, 1][lv - 1], uDust: P.polvo, uLight: 1.02, uHot: P.lampara * [1, 0.85, 0.7][lv - 1], uHotP: [st.hx, st.hy], uStrip: P.banda, uGap: 44, uPitch: 48, uNaranja: P.mascara }), d);
        src = d;
      }
      /* Cristal roto: refraccion por esquirla (los golpes, a su hora) */
      if (cfg.crack && this.ready("crack") && st.crack) {
        const c = cfg.crack, P = X.crack, cr = st.crack, nG = Math.min(3, c.n || 1), Hs = [];
        for (let i = 0; i < 3; i++) {
          const g = cr.g[i] || { x: 0, y: 0 }, th = st.crackT0 + 380 + i * 340, s = red ? 99 : (now - th) / 1000;
          if (!red && s >= 0 && (st.crackSonados || 0) <= i && i < nG) { st.crackSonados = i + 1; this.golpe(i); }
          Hs.push([g.x, g.y, s, i < nG ? 1 : 0]);
        }
        const d = out();
        this.draw("crack", Object.assign(base(d), { uSrc: src, uShard: this.upload(cr, "upS", cr.c.shard), uLines: this.upload(cr, "upL", cr.c.lines), uH0: Hs[0], uH1: Hs[1], uH2: Hs[2], uRefr: P.refr, uBri: P.brillo, uAb: P.ab, uLvl: (nG - 1) / 2, uFrost: P.polvo }), d);
        src = d;
      }
      /* Escarcha: lo ultimo (esta en tu cristal) */
      if (cfg.frost && this.ready("frost") && this.ready("frostMask") && this.ready("frostBake")) {
        const c = cfg.frost, lv = c.lv, P = X.frost, mm = c.m == null ? 1 : c.m;
        if (!BK.frost || BK.frost.W !== Math.round(W) || BK.frost.H !== Math.round(H)) BK.frost = bakeFrost(Math.round(W), Math.round(H));
        const ice = this.tgt("ice", W, H);
        if (ice.fresh || st.iceKey !== cfg.key) { ice.fresh = false; st.iceKey = cfg.key; this.draw("frostBake", Object.assign(base(ice), { uSeed: Math.random() * 50, uFern: this.upload(BK.frost, "upA", BK.frost.fern), uFernB: this.upload(BK.frost, "upB", BK.frost.fernB) }), ice); }
        const mA = this.tgt("mA", W / 2, H / 2), mB = this.tgt("mB", W / 2, H / 2);
        if (mA.fresh || mB.fresh) { for (const f of [mA, mB]) { f.fresh = false; gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); } }
        const moved = st.fmx == null || Math.hypot(ptr.x - st.fmx, ptr.y - st.fmy) > 0.5 ? 1 : 0; st.fmx = ptr.x; st.fmy = ptr.y;
        const pr = st.fFlip ? mB : mA, dm = st.fFlip ? mA : mB; st.fFlip = !st.fFlip;
        this.draw("frostMask", Object.assign(base(dm), { uPrev: pr, uDt: dt, uRegrow: P.rehiela * (lv === 3 ? 0.5 : 1) / Math.max(0.4, mm), uRad: P.radio, uMoved: moved }), dm);
        let grow = 1; if (!red) { const g = Math.min(1, (now - st.frostT0) / 1300); grow = 1 - Math.pow(1 - g, 3); }
        const d = out();
        this.draw("frost", Object.assign(base(d), { uSrc: src, uIce: ice, uAl: dm, uCov: P.cubre * [0.55, 0.85, 1.12][lv - 1] * mm, uRefr: P.refr, uBri: P.brillo, uGrow: grow, uRad: P.radio, uLevel: (lv - 1) / 2 }), d);
        src = d;
      }
      gl.activeTexture(gl.TEXTURE0);
      return src === scene ? null : src;
    }
    /* la llegada del reto (cada pregunta): sonido, vibracion y animacion de entrada */
    arrive(cfg, now) {
      const st = this.st, W = this.map.W, H = this.map.H, red = reduce();
      st.sigT0 = st.tilesT0 = st.groundT0 = st.filmT0 = st.frostT0 = now; st.sigFirst = 2; st.mo = 0; st.crackSonados = 0; st.crackT0 = now; st.lx = st.hx = null;
      if (cfg.crack) {
        let b = BK.crackNext && BK.crackNext.W === Math.round(W) && BK.crackNext.H === Math.round(H) ? BK.crackNext : null;
        if (!b) b = bakeCrack(Math.round(W), Math.round(H));
        BK.crackNext = null; st.crack = b; BK.lastCrack = b; DEB.crackRound = true;
        idle(() => { if (!BK.crackNext) BK.crackNext = bakeCrack(Math.round(this.map.W), Math.round(this.map.H)); }, 4000);   // el siguiente juego de golpes, en reposo
      }
      if (red) return;
      if (cfg.frost) { say("debFrost"); buzz(0.35, 0.15, 260); }
      if (cfg.frosted) { say("debSand"); buzz(0.15, 0.4, 550); }
      if (cfg.tiles) { say("debTiles"); buzz(0.05, 0.35, 650); }
      if (cfg.negative) { say("debFilm"); buzz(0.2, 0.3, 90); }
      if (cfg.signal) { say("debSignal"); buzz(0.25, 0.4, 200); }
    }
    golpe(i) {
      say("glass", i); buzz(0.75, 0.45, 220);
      const app = document.getElementById("app");
      if (app && !reduce()) { app.classList.remove("chx-punch"); if (A.restyle) A.restyle(app); app.classList.add("chx-punch"); setTimeout(() => app.classList.remove("chx-punch"), 260); }
    }
  }

  /* ================================================================== La carta que se cuela (2D, sobre el mapa) */
  /* el dorso de la casa (44 x 62, simetrico en los dos ejes: se pinta un cuarto y se refleja), geolite40, contorno #1d0a3d */
  let DORSO = null;
  function dorso() {
    if (DORSO) return DORSO;
    const w = 44, h = 62, c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    const P = PAL, INK = P[0], CREAM = P[8], LAV = P[7], V1 = P[2], V2 = P[3], V0 = P[1], AU = P[11], AU2 = P[12], AUD = P[10];
    const px = (x, y, col) => { g.fillStyle = col; for (const [X_, Y_] of [[x, y], [w - 1 - x, y], [x, h - 1 - y], [w - 1 - x, h - 1 - y]]) g.fillRect(X_, Y_, 1, 1); };
    for (let y = 0; y < h / 2; y++) for (let x = 0; x < w / 2; x++) {
      if ((x === 0 && y < 2) || (y === 0 && x < 2) || (x === 1 && y === 1)) continue;
      let col;
      if (x === 0 || y === 0 || (x === 1 && y === 2) || (x === 2 && y === 1)) col = INK;
      else if (x <= 2 || y <= 2) col = (x === 1 || y === 1) ? LAV : CREAM;
      else if (x === 3 || y === 3) col = INK;
      else if (x === 5 || y === 5) col = (x === 5 && y >= 5) || (y === 5 && x >= 5) ? AU : V1;
      else if (x === 4 || y === 4) col = V0;
      else { const u = x - 6, v = y - 6, d1 = ((u + v) % 6 + 6) % 6, d2 = ((u - v) % 6 + 6) % 6; col = d1 === 0 || d2 === 0 ? V2 : V1; if (d1 === 0 && d2 === 0) col = AUD; }
      px(x, y, col);
    }
    const cx = w / 2, cy = h / 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = Math.abs(x + 0.5 - cx), dy = Math.abs(y + 0.5 - cy), m = dx / 9 + dy / 12;
      if (m < 1.0 && m >= 0.86) { g.fillStyle = INK; g.fillRect(x, y, 1, 1); }
      else if (m < 0.86 && m >= 0.72) { g.fillStyle = y < cy ? AU2 : AU; g.fillRect(x, y, 1, 1); }
      else if (m < 0.72) { g.fillStyle = V0; g.fillRect(x, y, 1, 1); }
      const r = Math.hypot(dx, dy);
      if (r < 4.2 && r >= 3.2) { g.fillStyle = AU; g.fillRect(x, y, 1, 1); }
      else if (r < 3.2 && r >= 2.1) { g.fillStyle = P[16]; g.fillRect(x, y, 1, 1); }
      else if (r < 2.1) { g.fillStyle = AU2; g.fillRect(x, y, 1, 1); }
    }
    return (DORSO = c);
  }
  const CARD = { on: false, cv: null, g: null, raf: 0, cards: [], cfg: null, lit: null, litG: null, sh: null, last: 0, lmx: 0, lmy: 0, mvx: 0, mvy: 0, dpr: 1, W: 0, H: 0 };
  /* la carta abombada: luz en bandas por columna de arte (pixel art) y el brillo de la lampara en una columna segun donde esta */
  function cardLit(lift, lampX, cx, s) {
    const src = dorso(), w = 44, h = 62;
    if (!CARD.lit) { CARD.lit = document.createElement("canvas"); CARD.lit.width = w; CARD.lit.height = h; CARD.litG = CARD.lit.getContext("2d"); CARD.base = src.getContext("2d").getImageData(0, 0, w, h); }
    const out = CARD.litG.createImageData(w, h), b = CARD.base.data, o = out.data, bri = X.card.brillo;
    const hx = Math.min(0.88, Math.max(0.12, 0.3 + (lampX - cx - w * s * 0.5) / Math.max(1, CARD.W) * 0.9)) * w;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w, bow = Math.sin(u * Math.PI), dx = Math.abs(x + 0.5 - hx), spec = (dx < 1.5 ? 0.2 : dx < 2.5 ? 0.08 : 0) * bri * (0.6 + 0.4 * bow);
      for (let y = 0; y < h; y++) {
        const i = (y * w + x) * 4; if (b[i + 3] < 128) continue;
        const v = (y + 0.5) / h, lit = Math.round((0.9 + 0.12 * bow + 0.06 * (1 - v) + 0.08 * lift * (1 - u)) * 8) / 8;
        o[i] = Math.min(255, b[i] * lit + spec * 255); o[i + 1] = Math.min(255, b[i + 1] * lit + spec * 247); o[i + 2] = Math.min(255, b[i + 2] * lit + spec * 230); o[i + 3] = 255;
      }
    }
    CARD.litG.putImageData(out, 0, 0); return CARD.lit;
  }
  function cardShadow() {
    if (CARD.sh) return CARD.sh;
    const c = document.createElement("canvas"), w = 44 * 8, h = 62 * 8; c.width = w + 160; c.height = h + 160; const g = c.getContext("2d");
    g.filter = "blur(28px)"; g.fillStyle = "rgba(6,2,16,1)"; g.beginPath(); (g.roundRect ? g.roundRect(80, 80, w, h, 40) : g.rect(80, 80, w, h)); g.fill();
    return (CARD.sh = c);
  }
  /* las cajas del HUD de verdad (medidas una vez por pregunta, al pegar las cartas): placa, puntos, tira de retos, zoom, herramientas, placa de abajo */
  const HUD_SEL = ["#leftCol", "#ledgerSh", "#ledger", "#topHud", "#chalBar", "#railSh", "#toolBar", "#noteSh", "#plate", "#dock"];
  function hudCajas() {
    const out = [], M = 26;
    for (const sel of HUD_SEL) for (const el of document.querySelectorAll(sel)) {
      if (el.closest(".hidden")) continue; const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8) continue;
      const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.05) continue;
      out.push([r.left - M, r.top - M, r.right + M, r.bottom + M]);
      for (const k of el.querySelectorAll(".k-kb, .badge, b.n")) { const q = k.getBoundingClientRect(); if (q.width) out.push([q.left - M, q.top - M, q.right + M, q.bottom + M]); }   // la insignia de la herramienta
    }
    return out;
  }
  function cardSitio(i, cw, ch) {
    const W = CARD.W, H = CARD.H, hud = CARD.hud || [], m = 24;
    const libre = (x, y) => !hud.some(([a, b, c, d]) => x < c && x + cw > a && y < d && y + ch > b);
    for (let k = 0; k < 160; k++) {
      const x = Math.round(m + Math.random() * Math.max(1, W - cw - 2 * m)), y = Math.round(m + Math.random() * Math.max(1, H - ch - 2 * m));
      if (!libre(x, y)) continue;
      if (CARD.cards.every((c, j) => j === i || c.st === "fuera" || Math.abs(c.x - x) > cw * 1.15 || Math.abs(c.y - y) > ch * 1.05)) return [x, y];
    }
    for (let k = 0; k < 400; k++) { const x = Math.round(m + Math.random() * (W - cw - 2 * m)), y = Math.round(m + Math.random() * (H - ch - 2 * m)); if (libre(x, y)) return [x, y]; }   // apretadas, pero nunca sobre el HUD
    return null;
  }
  function cardFrame(now) {
    CARD.raf = 0; if (!CARD.on || !CARD.cv || !CARD.cv.isConnected) return;
    const dt = CARD.last ? Math.min(0.05, Math.max(0.001, (now - CARD.last) / 1000)) : 0.016; CARD.last = now;
    const cfg = CARD.cfg, P = X.card, red = reduce(), n = cfg ? cfg.n : 0, dpr = CARD.dpr;
    const ov = CARD.cv.parentNode, W = ov.clientWidth || innerWidth, H = ov.clientHeight || innerHeight;
    if (W !== CARD.W || H !== CARD.H || CARD.cv.width !== Math.round(W * dpr)) { CARD.W = W; CARD.H = H; CARD.cv.width = Math.round(W * dpr); CARD.cv.height = Math.round(H * dpr); }
    const s = Math.max(2, Math.round(P.escala * W / 1920)), sd = Math.max(1, Math.round(s * dpr)), cw = 44 * sd / dpr, ch = 62 * sd / dpr;
    const p = (cfg && cfg.ptr && cfg.ptr()) || { x: W / 2, y: H / 2 };
    const px0 = CARD.lmx, py0 = CARD.lmy, dx = p.x - px0, dy = p.y - py0; CARD.lmx = p.x; CARD.lmy = p.y;
    const kv = 1 - Math.exp(-dt * 18); CARD.mvx += (dx / dt - CARD.mvx) * kv; CARD.mvy += (dy / dt - CARD.mvy) * kv;
    const sp = Math.hypot(CARD.mvx, CARD.mvy), gesto = P.gesto * W / 1920 * (A.mando && A.mando.activo && A.mando.activo() ? 0.55 : 1);
    let alive = false;
    CARD.cards.forEach((c, i) => {
      if (i >= n && c.st !== "fuera" && c.st !== "vuela") { c.st = "fuera"; c.on = 0; }
      if (red && c.st !== "fuera") { if (c.st === "vuela") { c.st = "fuera"; c.on = 0; c.hold = 0; } else { c.st = "pegada"; c.lift = 0; c.on = 1; c.x = c.tx; c.y = c.ty; } }
      const inC = (x, y) => x > c.x && x < c.x + cw && y > c.y && y < c.y + ch;
      let dentro = inC(p.x, p.y), cruza = dentro;   // un gesto rapido puede saltarse la carta entre dos fotogramas: se mira todo el trazo
      for (let k = 1; k < 8 && !cruza; k++) cruza = inC(px0 + dx * k / 8, py0 + dy * k / 8);
      if (c.st === "llega") {
        c.t += dt; if (c.t < 0) { c.on = 0; alive = true; return; }
        const e = Math.min(1, c.t / 0.16), q = 1 - Math.pow(1 - e, 3);
        c.on = 1; c.lift = 1 - q; c.x = Math.round(c.tx + 40 * (1 - q)); c.y = Math.round(c.ty - 60 * (1 - q));
        if (e >= 1) { c.st = "pegada"; say("debCard", i); buzz(0.25, 0.3, 90); }
      } else if (c.st === "pegada") {
        c.lift += ((dentro ? 0.14 : 0) - c.lift) * (1 - Math.exp(-dt * 10));
        if (cruza && Math.max(sp, Math.hypot(dx, dy) / dt) > gesto) {
          if (red) { c.st = "fuera"; c.on = 0; c.hold = 0; }
          else { c.st = "vuela"; const m = Math.max(1600, sp * 1.3), dl = Math.hypot(dx, dy) || 1, ux = sp > 50 ? CARD.mvx / sp : dx / dl, uy = sp > 50 ? CARD.mvy / sp : dy / dl; c.vx = ux * m; c.vy = uy * m; c.fx = c.x; c.fy = c.y; say("debCardOff"); buzz(0.1, 0.25, 70); }
        }
      } else if (c.st === "vuela") {
        c.lift = Math.min(1, c.lift + dt * 9); c.fx += c.vx * dt; c.fy += c.vy * dt; c.x = Math.round(c.fx); c.y = Math.round(c.fy);
        if (c.x > W + 40 || c.x < -cw - 40 || c.y > H + 40 || c.y < -ch - 40) { c.st = "fuera"; c.on = 0; c.hold = 0; }
      } else if (c.st === "fuera" && i < n && !red) {
        c.hold += dt; if (c.hold > P.vuelve * (cfg.lv === 3 ? 0.7 : 1) * (cfg.back || 1)) { const xy = cardSitio(i, cw, ch); if (xy) Object.assign(c, { x: xy[0], y: xy[1], tx: xy[0], ty: xy[1], st: "llega", t: 0, lift: 1, on: 0 }); else c.hold = 0; }
      }
      if (c.st !== "fuera" || i < n) alive = true;
    });
    const g = CARD.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, CARD.cv.width, CARD.cv.height); g.imageSmoothingEnabled = true;
    const lamp = W * 0.5 - (p.x - W / 2) * 0.5, shc = cardShadow();
    for (const c of CARD.cards) {
      if (c.st === "fuera" || !c.on) continue;
      const ox = (14 + 34 * c.lift) * dpr, oy = (20 + 46 * c.lift) * dpr, X0 = Math.round(c.x * dpr), Y0 = Math.round(c.y * dpr), cwd = 44 * sd, chd = 62 * sd, k = cwd / (44 * 8);
      g.globalAlpha = (0.55 - 0.2 * c.lift) * c.on; g.drawImage(shc, X0 + ox - 80 * k, Y0 + oy - 80 * k, shc.width * k, shc.height * k);
    }
    g.globalAlpha = 1; g.imageSmoothingEnabled = false;
    for (const c of CARD.cards) {
      if (c.st === "fuera" || !c.on) continue;
      g.drawImage(cardLit(c.lift, lamp, c.x, s), Math.round(c.x * dpr), Math.round(c.y * dpr), 44 * sd, 62 * sd);
    }
    if (alive || CARD.cfg) CARD.raf = requestAnimationFrame(cardFrame);
  }
  function cardSet(cfg, ov) {
    if (!cfg) { CARD.cfg = null; CARD.on = false; cancelAnimationFrame(CARD.raf); CARD.raf = 0; if (CARD.g) CARD.g.clearRect(0, 0, CARD.cv.width, CARD.cv.height); CARD.cards.forEach(c => { c.st = "fuera"; c.on = 0; }); return; }
    if (!CARD.cv) { CARD.cv = document.createElement("canvas"); CARD.cv.className = "deb-card"; CARD.g = CARD.cv.getContext("2d"); }
    if (ov && CARD.cv.parentNode !== ov) ov.appendChild(CARD.cv);
    CARD.dpr = Math.min(2, devicePixelRatio || 1); CARD.cfg = cfg; CARD.on = true; CARD.last = 0;
    const p = (cfg.ptr && cfg.ptr()) || { x: 0, y: 0 }; CARD.lmx = p.x; CARD.lmy = p.y; CARD.mvx = CARD.mvy = 0;
    CARD.W = ov ? ov.clientWidth : innerWidth; CARD.H = ov ? ov.clientHeight : innerHeight;
    while (CARD.cards.length < 3) CARD.cards.push({ x: 0, y: 0, lift: 1, on: 0, st: "fuera", t: 0, vx: 0, vy: 0, hold: 0 });
    const s = Math.max(2, Math.round(X.card.escala * CARD.W / 1920)), sd = Math.max(1, Math.round(s * CARD.dpr)), cw = 44 * sd / CARD.dpr, ch = 62 * sd / CARD.dpr;
    CARD.cards.forEach(c => { c.st = "fuera"; c.on = 0; c.hold = 0; });
    CARD.hud = hudCajas();
    for (let i = 0; i < cfg.n; i++) { const xy = cardSitio(i, cw, ch); if (xy) Object.assign(CARD.cards[i], { x: xy[0], y: xy[1], tx: xy[0], ty: xy[1], st: "llega", t: -(0.2 + i * 0.18), lift: 1, on: 0 }); }
    if (!CARD.raf) CARD.raf = requestAnimationFrame(cardFrame);
  }

  /* ================================================================== Bandera mojada (lienzo WebGL pequeno sobre la bandera de la placa) */
  const MOJ = `#version 300 es
precision highp float;
uniform sampler2D uFlag; uniform vec2 uR, uTexS, uMouse; uniform float uPad, uSc, uP, uSeed, uRun, uCerco, uBarro, uK; uniform vec3 uAvg;
out vec4 o;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; } return s; }
float luma(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
vec4 pig(vec2 st, float lod){ vec4 c = textureLod(uFlag, st, lod); return vec4(c.rgb / max(c.a, .002), c.a); }
void main(){
  vec2 p = vec2(gl_FragCoord.x, uR.y - gl_FragCoord.y) / uK, R = uR / uK, f = p / R;
  float paperN = vn(p / 1.3) * .5 + vn(p / 3.7) * .35 + vn(p / 11.) * .15;
  vec3 paper = vec3(.965, .945, .9) * (.975 + .04 * paperN);
  float Wn = fbm(f * vec2(2.4, 1.7) + uSeed) * .75 + f.y * .25 + (fbm(p / 18. + uSeed) - .5) * .08;
  float wet = clamp((uP * 1.35 - Wn) / .3, 0., 1.), front = smoothstep(0., .05, wet) * (1. - smoothstep(.05, .22, wet));
  vec2 w2 = vec2(fbm(f * 4.3 + uSeed + 3.), fbm(f * 4.3 + uSeed + 9.)) - .5;
  float streak = .35 + .65 * vn(vec2(f.x * 46. + uSeed, f.y * 2.)), drip = wet * wet * uRun * (.05 + .16 * streak) * uP * smoothstep(0., .2, f.y);
  vec2 g = f + w2 * .07 * wet - vec2(0., drip), st = (g * R / uSc + uPad) / uTexS;
  st.y = 1. - st.y;
  float lod = wet * 5.4 * uP + .2;
  vec4 a = pig(st, lod), b = pig(st + vec2(.0, .012) * wet, lod + 1.);
  vec3 pc = mix(a.rgb, b.rgb, .35 * wet); float pa = max(a.a, b.a * .6 * wet);
  float mud = smoothstep(.45, 1., uP * wet) * uBarro; vec3 barro = mix(uAvg, vec3(luma(uAvg)), .4) * vec3(.85, .72, .55);
  pc = mix(pc, mix(pc, barro, .85), mud);
  float edge = abs(pig(st, lod + 1.5).a - pa);
  pc = mix(pc, pc * pc * .9, clamp((front * .7 + edge * .9 * wet) * uCerco, 0., 1.));
  pc = mix(pc, pc * pc, .25 * wet * smoothstep(.45, .8, paperN));
  vec3 cc = paper * (1. - .05 * wet) * mix(vec3(1.), pc, clamp(pa, 0., 1.) * (1. - .12 * wet));
  vec2 lamp = vec2(R.x * .45, R.y * .2) - (uMouse - R * .5) * .25;
  cc += vec3(1., .97, .9) * wet * exp(-dot(p - lamp, p - lamp) / (2. * 80. * 80.)) * .1;
  o = vec4(cc + (h21(gl_FragCoord.xy) - .5) / 255., 1.);
}`;
  const FL = { cv: null, gl: null, p: null, U: {}, tex: null, raf: 0, on: false, cfg: null, t0: 0, img: null, lost: false };
  function flagGL() {
    if (FL.gl && !FL.lost && !FL.gl.isContextLost()) return FL.gl;
    FL.cv = document.createElement("canvas"); FL.cv.className = "deb-flag"; FL.lost = false;
    const gl = FL.gl = FL.cv.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false });
    if (!gl) return null;
    FL.cv.addEventListener("webglcontextlost", e => { e.preventDefault(); FL.lost = true; FL.tex = null; FL.p = null; });   // la siguiente bandera rehace lienzo y contexto
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, MOJ)); gl.linkProgram(p);
    FL.p = p; FL.U = {}; FL.psc = gl.getExtension("KHR_parallel_shader_compile"); gl.bindVertexArray(gl.createVertexArray());
    return gl;
  }
  function flagFrame(now) {
    FL.raf = 0; if (!FL.on || !FL.cv || !FL.cv.isConnected || FL.lost) return;
    const gl = FL.gl, c = FL.cfg;
    if (FL.psc && !gl.getProgramParameter(FL.p, FL.psc.COMPLETION_STATUS_KHR)) { FL.raf = requestAnimationFrame(flagFrame); return; }
    if (!gl.getProgramParameter(FL.p, gl.LINK_STATUS)) { console.warn("bandera mojada:", gl.getProgramInfoLog(FL.p)); return; }
    if (!FL.tex) { FL.raf = requestAnimationFrame(flagFrame); return; }
    if (FL.cv.style.visibility) FL.cv.style.visibility = "";
    const P = X.flagwet, red = reduce(), Tt = P.tiempo * [1.4, 1, 0.7][c.lv - 1] / Math.max(0.25, c.m == null ? 1 : c.m), e = red ? 999 : (now - FL.t0) / 1000;
    const pr = red ? 0.42 : Math.min(1, 0.2 * (1 - Math.exp(-e / 0.35)) + 0.8 * Math.max(0, e) / Tt);
    const loc = n => (n in FL.U ? FL.U[n] : (FL.U[n] = gl.getUniformLocation(FL.p, n)));
    gl.useProgram(FL.p); gl.viewport(0, 0, FL.cv.width, FL.cv.height); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, FL.tex); gl.uniform1i(loc("uFlag"), 0);
    const ptr = (c.ptr && c.ptr()) || { x: 0, y: 0 }, r = FL.box;
    gl.uniform2f(loc("uR"), FL.cv.width, FL.cv.height); gl.uniform1f(loc("uK"), FL.k); gl.uniform2f(loc("uTexS"), FL.texS[0], FL.texS[1]); gl.uniform2f(loc("uMouse"), ptr.x - r.x, ptr.y - r.y);
    gl.uniform1f(loc("uPad"), FL.pad); gl.uniform1f(loc("uSc"), FL.sc); gl.uniform1f(loc("uP"), pr); gl.uniform1f(loc("uSeed"), FL.seed); gl.uniform1f(loc("uRun"), P.chorreo * (c.lv === 3 ? 1.3 : 1)); gl.uniform1f(loc("uCerco"), P.cerco); gl.uniform1f(loc("uBarro"), P.barro); gl.uniform3f(loc("uAvg"), ...FL.avg);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!red && pr < 1) FL.raf = requestAnimationFrame(flagFrame);
  }
  function flagSet(F, cfg) {
    if (!F) { FL.on = false; cancelAnimationFrame(FL.raf); FL.raf = 0; if (FL.cv && FL.cv.parentNode) FL.cv.remove(); return; }
    const gl = flagGL(); if (!gl) return;
    FL.cfg = cfg; FL.on = true; FL.t0 = performance.now(); FL.seed = Math.random() * 30; FL.tex = null;
    const img = F.img, wpx = parseFloat(img.style.width) || img.clientWidth || 200, hpx = parseFloat(img.style.height) || img.clientHeight || 130, dpr = Math.min(2, devicePixelRatio || 1);
    FL.k = dpr; FL.cv.width = Math.round(wpx * dpr); FL.cv.height = Math.round(hpx * dpr); FL.cv.style.width = wpx + "px"; FL.cv.style.height = hpx + "px"; FL.cv.style.visibility = "hidden";
    F.stage.appendChild(FL.cv);
    const r = img.getBoundingClientRect(); FL.box = { x: r.left, y: r.top };
    const TW = Math.round(wpx * dpr * 2), PAD = Math.round(TW / 12), go = () => {
      if (!FL.on || FL.cfg !== cfg) return;
      const th = Math.round(TW * hpx / wpx), cv = document.createElement("canvas"); cv.width = TW + PAD * 2; cv.height = th + PAD * 2;
      const g = cv.getContext("2d"); g.drawImage(img, PAD, PAD, TW, th);
      const s = document.createElement("canvas"); s.width = s.height = 1; const sg = s.getContext("2d"); sg.drawImage(img, 0, 0, 1, 1); const d = sg.getImageData(0, 0, 1, 1).data; FL.avg = [d[0] / 255, d[1] / 255, d[2] / 255];
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      FL.tex = tex; FL.texS = [cv.width, cv.height]; FL.pad = PAD; FL.sc = 1 / (TW / wpx);
      if (!reduce()) { say("debDrops"); buzz(0.1, 0.2, 80); }
      if (!FL.raf) FL.raf = requestAnimationFrame(flagFrame);
    };
    if (img.complete && img.naturalWidth) go(); else img.addEventListener("load", go, { once: true });
    if (!FL.raf) FL.raf = requestAnimationFrame(flagFrame);
  }

  /* ================================================================== El guante que limpia (veredicto) */
  const N_PATH = 28, RUTA = [[-0.05, 0.22], [0.25, 0.2], [0.55, 0.26], [0.86, 0.22], [0.9, 0.36], [0.6, 0.45], [0.3, 0.42], [0.08, 0.5], [0.12, 0.64], [0.4, 0.68], [0.7, 0.66], [0.92, 0.72], [0.85, 0.85], [0.5, 0.9], [0.15, 0.88], [-0.1, 0.9]];
  const catmull = (pts, n) => { const out = [], m = pts.length - 1; for (let i = 0; i < n; i++) { const f = (i / (n - 1)) * m, k = Math.min(m - 1, Math.floor(f)), t = f - k, p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(m, k + 2)]; const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t * t + (-a + 3 * b - 3 * c2 + d) * t * t * t); out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]); } return out; };
  /* el pano: 40 x 30 de arte, arrugado, que asoma bajo la mano aprobada del crupier (vivo_hand) */
  let PANO = null;
  function pano() {
    if (PANO) return PANO;
    const w = 40, h = 30, c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"), M = [];
    const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? M[y * w + x] : 0);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (x + 0.5 - 20) / 17, dy = (y + 0.5 - 15) / 12; let v = dx * dx + dy * dy < 1 + 0.06 * Math.sin(x * 0.9) + 0.05 * Math.cos(y * 1.3) ? 1 : 0; if (x >= 4 && x <= 11 && y >= 22 && y <= 29 && (x - 4) + (29 - y) * 0.6 < 8) v = 1; M.push(v); }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue; const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
      const fold = Math.abs((x - 20) * 0.5 - (y - 15) * 1.2 + Math.sin(x * 0.5) * 1.5) < 0.6 || Math.abs((x - 28) * 0.8 + (y - 18)) < 0.5, sh = (x - 20) * 0.04 + (y - 15) * 0.11;
      g.fillStyle = edge ? PAL[0] : fold ? PAL[6] : sh > 0.55 ? PAL[7] : PAL[8]; g.fillRect(x, y, 1, 1);
    }
    return (PANO = c);
  }
  let HAND = null; const handImg = () => { if (!HAND) { HAND = new Image(); HAND.src = "assets/icons/vivo_hand.webp"; } return HAND; };
  const WIPE = { cv: null, raf: 0 };
  function veredicto(superada) {
    const had = DEB.crackRound; DEB.crackRound = false; const b = BK.lastCrack;
    if (!had || !superada || !b) return;
    handImg(); pano();
    if (!WIPE.cv) { WIPE.cv = document.createElement("canvas"); WIPE.cv.id = "debWipe"; WIPE.cv.setAttribute("aria-hidden", "true"); }
    const cv = WIPE.cv, dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight; document.body.appendChild(cv);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); const g = cv.getContext("2d"), P = X.wipe, red = reduce();
    const path = catmull(RUTA, N_PATH).map(([x, y]) => [x * W, y * H]), t0 = performance.now() + 400, dur = P.dur * 1000, rad = P.rad * Math.min(1, W / 1280);
    const dl = document.getElementById("vdDealer"), cr = dl ? dl.getBoundingClientRect() : null;
    const s = Math.max(2, Math.round(3 * W / 1280)), sd = Math.max(1, Math.round(s * dpr));
    let pasada = -1, fin = false;
    cancelAnimationFrame(WIPE.raf);
    const frame = now => {
      WIPE.raf = 0; if (!cv.isConnected) return;
      const pg = red ? 0.55 : Math.max(0, Math.min(1, (now - t0) / dur)), f = pg * (N_PATH - 1), k = Math.min(N_PATH - 2, Math.floor(f)), fr = f - k;
      const cx = path[k][0] + (path[k + 1][0] - path[k][0]) * fr, cy = path[k][1] + (path[k + 1][1] - path[k][1]) * fr;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
      g.imageSmoothingEnabled = true; g.drawImage(b.c.white, 0, 0, cv.width, cv.height);
      if (now >= t0 || red) {   // lo limpio: el recorrido del pano hasta donde ha llegado
        g.globalCompositeOperation = "destination-out"; g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = rad * 2 * dpr; g.beginPath(); g.moveTo(path[0][0] * dpr, path[0][1] * dpr);
        for (let i = 1; i <= k; i++) g.lineTo(path[i][0] * dpr, path[i][1] * dpr); g.lineTo(cx * dpr, cy * dpr); g.stroke(); g.globalCompositeOperation = "source-over";
      }
      const sh = red ? 0 : Math.max(0, now - t0 - dur), sx = (-400 + sh / 550 * (W * 1.45 + 800)) * dpr;
      if (sh > 0 && sh < 600) {   // el reflejo limpio que barre al terminar, en diagonal; nunca sobre el crupier
        g.save(); if (cr) { g.beginPath(); g.rect(0, 0, cv.width, cv.height); g.ellipse((cr.left + cr.width / 2) * dpr, (cr.top + cr.height / 2) * dpr, cr.width * 0.75 * dpr, cr.height * 0.7 * dpr, 0, 0, 6.283, true); g.clip("evenodd"); }
        g.setTransform(1, 0, -0.45, 1, 0, 0); const gr = g.createLinearGradient(sx - 280 * dpr, 0, sx + 280 * dpr, 0), a = Math.min(0.22, 0.1 * P.brillo);
        gr.addColorStop(0, "rgba(255,250,240,0)"); gr.addColorStop(0.5, `rgba(255,250,240,${a})`); gr.addColorStop(0.505, `rgba(255,255,255,${Math.min(0.5, 0.2 * P.brillo)})`); gr.addColorStop(0.51, `rgba(255,250,240,${a})`); gr.addColorStop(1, "rgba(255,250,240,0)");
        g.fillStyle = gr; g.fillRect(-cv.width, 0, cv.width * 3, cv.height); g.restore();
      }
      const vis = (now >= t0 || red) && pg < 1;
      if (vis && HAND.complete && HAND.naturalWidth) {   // el pano bajo la mano del crupier, a escala entera
        g.imageSmoothingEnabled = false; const pw = 40 * sd, ph = 30 * sd, hw = 64 * sd, X0 = Math.round(cx * dpr - pw / 2), Y0 = Math.round(cy * dpr - ph / 2);
        g.globalAlpha = 0.3; g.fillStyle = "#06020f"; g.beginPath(); g.ellipse(X0 + pw / 2 + 16 * dpr, Y0 + ph / 2 + 22 * dpr, pw * 0.5, ph * 0.5, 0, 0, 6.283); g.fill(); g.globalAlpha = 1;
        g.drawImage(PANO, X0, Y0, pw, ph); g.drawImage(HAND, Math.round(cx * dpr - hw / 2), Math.round(Y0 - 26 * sd), hw, hw);
      }
      if (!red && now >= t0) {
        const ps = Math.floor(pg * 3); if (ps !== pasada && pg < 1) { pasada = ps; say("debWipe"); buzz(0.05, 0.12, 120); }
        if (pg >= 1 && !fin) { fin = true; say("debWipeEnd"); }
      }
      if (red ? now - t0 < 1400 : sh < 650) WIPE.raf = requestAnimationFrame(frame);
      else cv.remove();
    };
    WIPE.raf = requestAnimationFrame(frame);
  }

  /* ================================================================== API */
  const DEB = A.deb = {
    X, crackRound: false,
    forMap: map => new MapDeb(map),
    /* los programas del pase del mapa estan listos (compilados en segundo plano al arrancar) */
    mapOk: map => !!(map && map.gl && (map.debx || (map.debx = new MapDeb(map))) && map.debx.allReady()),
    /* lo de la ronda, en ratos libres mientras se presenta (nunca en el instante del reto) */
    prep(ids, map) {
      if (!map || !map.W) return; const W = Math.round(map.W), H = Math.round(map.H), has = id => ids.includes(id);
      if (has("frost") && !(BK.frost && BK.frost.W === W && BK.frost.H === H)) idle(() => { BK.frost = bakeFrost(W, H); if (map.debx && !map.lost) { map.debx.upload(BK.frost, "upA", BK.frost.fern); map.debx.upload(BK.frost, "upB", BK.frost.fernB); } }, 3000);
      if (has("crack") && !(BK.crackNext && BK.crackNext.W === W)) idle(() => { BK.crackNext = bakeCrack(W, H); if (map.debx && !map.lost) { map.debx.upload(BK.crackNext, "upS", BK.crackNext.c.shard); map.debx.upload(BK.crackNext, "upL", BK.crackNext.c.lines); } }, 3000);
      if (has("negative")) { const lv = 1; if (!BK.film) idle(() => { BK.film = bakeFilm(W, H, lv); }, 3000); }
      if (has("flagwet")) idle(() => flagGL(), 3000);
      if (has("card")) idle(() => { dorso(); cardShadow(); }, 3000);
    },
    roundStart() { DEB.crackRound = false; },
    card: cardSet, flag: flagSet, veredicto,
    _bk: BK, _card: CARD, _fl: FL,
  };
  /* los programas del mapa se compilan en un rato libre al arrancar (en segundo plano): cuando llega el primer reto ya estan */
  addEventListener("load", () => idle(() => { const m = A.core && A.core.map; if (m && m.gl && !m.debx) try { m.debx = new MapDeb(m); } catch (e) { /* sin WebGL2: los retos de siempre */ } }, 8000), { once: true });
})(window.AIQ);
