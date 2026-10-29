/*
 * Geolite - LA FIRMA DE LAS MESAS (paquete «mesas» del Probador, preset Extrema).
 *
 *  Una lampara comun sobre TODAS las mesas: la misma posicion, altura y calidez (centrada sobre la mesa, donde la luz de la sala de js/casa.js
 *  deja el centro del mapa intacto: no se suman dos lamparas ni se quema la tierra). Cada material responde a ella con relieve, brillo y sombra:
 *    - los paises tienen canto y proyectan una sombra blanda LEJOS de la lampara (la sombra dura de pegatina de antes se quita: tenia otra causa);
 *    - el brillo es el de su material (pano mate, marmol y laca pulidos con el disco de la lampara, laton cepillado anisotropo, papel, cristal);
 *    - la HUELLA del clic: la mesa guarda la marca del ultimo clic segun su material, en todas las mesas;
 *    - el BARRIDO del premio: la lampara barre el material en el jackpot, 1-2-3 pasadas (A.casa.premio -> map.firmaPremio).
 *  Las mesas de hoy conservan su dibujo (el albedo es la escena ya pintada; con la luz neutra salen igual que antes: se compensa el hombro de tono).
 *  Once mesas se pintan con su material nuevo (mismo id, nombre y forma de conseguirlas): mesa (pano con pelo), ruleta (caoba con marqueteria),
 *  laton (camara acorazada), carrara (piedras duras), laca, despacho (cuero), banca (oro macizo), acuarela, cuaderno (10 rotuladores), vegas
 *  (neon de tubos de vidrio) y piscina.
 *
 *  Como corre (js/map.js, _drawGL): escena de siempre -> mascara (tierra, frontera, clase y azar de cada pais, con las mismas deformaciones de los
 *  retos y el mapa mudo) -> tierra suavizada (dos pases: canto, sombra y distancia a la costa) -> material (MRT: albedo + relieve, rugosidad/metal/
 *  capa/luz propia) -> luz. Encima, el resalte del pais y los tintes. Los programas se compilan al poner la mesa (nunca en plena partida):
 *  mientras no estan listos, la mesa sale como antes. Con Movimiento minimo todo queda quieto (sin barrido; la huella, marcada sin animarse).
 *  Coordenadas: q = pixel CSS de la pantalla (origen arriba); p = q + uPorig (anclado al mundo a pixel entero: la tierra se mueve con el mapa,
 *  el mar como hoy queda quieto en pantalla). Mar limpio: el mar solo recibe tono, brillo ancho y halos pegados a la costa.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const VS = `#version 300 es
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); gl_Position=vec4(p*2.0-1.0,0.0,1.0); }`;

  /* ---------------------------------------------------------------- GLSL comun */
  const FC = `#version 300 es
precision highp float; precision highp int;
uniform vec2 uR; uniform vec2 uRes; uniform float uK; uniform vec2 uPorig; uniform float uT;
uniform sampler2D uMsk, uBrd, uSoft, uBN, uBW;
const float PI = 3.14159265, TAU = 6.2831853;
vec2 qFrag(){ return vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uK; }
vec2 UV(vec2 q){ return vec2(q.x * uK, uRes.y - q.y * uK) / uRes; }
float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
#ifdef LITE
const int FBM_N = 3;
#else
const int FBM_N = 5;
#endif
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < FBM_N; i++) { s += a * vn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; } return s; }
float fbm3(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 3; i++) { s += a * vn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; } return s; }
vec3 vor(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.; vec2 id = vec2(0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y), r = g + h22(i + g) - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = i + g; } else if (d < d2) d2 = d; }
  return vec3(sqrt(d1), sqrt(d2), h21(id)); }
float luma(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
float probit(float v){ float m = min(v, 1. - v), t = sqrt(-2. * log(max(m, 1e-6)));
  float z = t - (2.515517 + .802853 * t + .010328 * t * t) / (1. + 1.432788 * t + .189269 * t * t + .001308 * t * t * t); return v < .5 ? -z : z; }
/* la tierra suavizada (sigma 3 px CSS) en 16 bits: R + G/255; B = frontera suavizada x4 */
float softL(vec2 q){ vec4 s = texture(uSoft, UV(q)); return s.r + s.g / 255.; }
float sdNear(vec2 q){ return -3. * probit(clamp(softL(q), .0012, .9988)); }
/* distancia con signo a la costa (px CSS, + en el mar): exacta cerca de la costa; lejos, de las siluetas desenfocadas del mapa (1/3 de resolucion) */
float sdAt(vec2 q){
  float a = sdNear(q), sg = a >= 0. ? 1. : -1., d = abs(a);
  if (d > 5.) { float n = -5.4 * probit(clamp(texture(uBN, UV(q)).r, .002, .998)); d = max(d, mix(d, abs(n), smoothstep(5., 7., d))); }
  if (d > 11.) { float w = -18. * probit(clamp(texture(uBW, UV(q)).r, .002, .998)); d = max(d, mix(d, abs(w), smoothstep(11., 14., d))); }
  return sg * d;
}
struct MS { vec2 p; vec2 q; vec2 uv; float land; float sd; float coast; float border; float cls; vec2 grad; float pid; float col10; };
vec4 mskAt(vec2 q){ vec4 m = texture(uMsk, UV(q)); m.g = texture(uBrd, UV(q)).r; return m; }
MS ms(vec2 p){
  MS s; s.p = p; s.q = p - uPorig; s.uv = s.q / uR; s.sd = sdAt(s.q); s.land = smoothstep(.75, -.75, s.sd); s.grad = vec2(0);
  vec4 m = mskAt(s.q);
  if (m.r < .5 && s.land > .01) { for (int k = 0; k < 8; k++) { float an = float(k) * .785398; vec4 m2 = mskAt(s.q + vec2(cos(an), sin(an)) * 1.5); if (m2.r > .5) { m = vec4(m.r, m.g, m2.b, m2.a); break; } } }
  float cb = floor(m.b * 255. + .5);
  s.border = m.g; s.cls = floor(cb / 16.); s.col10 = cb - 16. * s.cls; s.pid = m.a; s.coast = abs(s.sd) < 1. ? 1. : 0.;
  return s;
}
float clsOK(MS s){ return s.cls; }
vec2 paisId(vec2 p){ float a = mskAt(p - uPorig).a * 255.; return vec2(h11(a * 1.37 + .5), h11(a * 7.13 + 3.1)); }
float bordAA(vec2 p){ return mskAt(p - uPorig).g; }
/* distancia a la frontera interior: lejos, de la frontera suavizada; cerca (< 3,5 px), exacta en la mascara (7 x 7) */
float bordBlur(vec2 q){ float b = texture(uSoft, UV(q)).b / 4.; return b >= .24 ? 0. : 3. * sqrt(2. * log(.24 / max(b, 3e-4))); }
#ifdef LITE
const int RB = 2;
#else
const int RB = 3;
#endif
float bordDist(vec2 p){
  vec2 q = p - uPorig; float d = bordBlur(q); if (d > float(RB) + .5) return d;
  float e = 9.; for (int y = -RB; y <= RB; y++) for (int x = -RB; x <= RB; x++) { vec2 o2 = vec2(x, y); float g = mskAt(q + o2).g; if (g > .35) e = min(e, max(length(o2) - (g - .35) * .8, 0.)); }
  return min(e, max(d, float(RB) + .5));
}
`;
  /* libreria de materiales (la de la maqueta, a 1:1) */
  const MATLIB = `
mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float veta(vec2 p, float ang, float freq, float fig){
  vec2 q = rot2(ang) * p;
  float w = fbm(q * vec2(.0035, .018)) * 9. + fbm(q * vec2(.012, .05)) * 1.6;
  float r = fract(q.y * freq + w);
  float ring = smoothstep(0., .18, r) * smoothstep(1., .55, r);
  float flame = fig * (sin(q.x * .045 + fbm(q * vec2(.006, .03)) * 6.) * .5 + .5) * (vn(q * vec2(.01, .2)) * .6 + .4);
  return clamp(ring * .7 + flame * .5, 0., 1.);
}
float poro(vec2 p, float ang){ vec2 q = rot2(ang) * p; vec2 c = floor(q / vec2(7., 1.)); float h = h21(c + 13.); float x = fract(q.x / 7.); return step(.86, h) * smoothstep(0., .2, x) * smoothstep(1., .6, x); }
float nubeMarmol(vec2 p){ return fbm(p / 340.) * .6 + fbm(p / 90. + 7.) * .4; }
float vetaMarmol(vec2 p){ float n = fbm(p / 260. + fbm(p / 140.) * 1.8); return pow(1. - abs(sin(n * 9.)), 18.); }
float cepillo(vec2 p, float ang){ vec2 q = rot2(ang) * p; return vn(vec2(q.x * .012, q.y * 1.)) * .55 + vn(vec2(q.x * .0025, q.y * .35)) * .3 + h21(vec2(floor(q.y), floor(q.x / 90.))) * .15; }
float grano(vec2 p, float k){ vec3 v = vor(p / k); return smoothstep(0., .5, v.y - v.x) * (.8 + .2 * v.z); }
float greca(vec2 p, float per){ vec2 c = p / per * 5.; vec2 i = floor(vec2(mod(c.x, 5.), clamp(c.y, 0., 4.999))); int x = int(i.x), y = int(i.y); int row[5] = int[5](30, 18, 22, 16, 31); return float((row[4 - y] >> (4 - x)) & 1); }
float remache(vec2 p, vec2 c, float r){ float d = length(p - c) / r; return d < 1. ? sqrt(1. - d * d) : 0.; }
`;
  /* tierra suavizada: dos pases (horizontal: tierra y frontera de la mascara; vertical: empaqueta) */
  const SOFT_H = FC + `
out vec4 o; uniform float uStep;
void main(){ vec2 f = gl_FragCoord.xy; float s = 0., b = 0., w = 0.;
  for (int i = -7; i <= 7; i++) { float k = exp(-float(i * i) / 18.); vec4 m = texture(uMsk, (f + vec2(float(i) * uStep, 0.)) / uRes); s += step(.5, m.r) * k; b += texture(uBrd, (f + vec2(float(i) * uStep, 0.)) / uRes).r * k; w += k; }
  o = vec4(s / w, b / w, 0., 1.); }`;
  const SOFT_V = FC + `
out vec4 o; uniform float uStep; uniform sampler2D uSrc;
void main(){ vec2 f = gl_FragCoord.xy; float s = 0., b = 0., w = 0.;
  for (int i = -7; i <= 7; i++) { float k = exp(-float(i * i) / 18.); vec4 m = texture(uSrc, (f + vec2(0., float(i) * uStep)) / uRes); s += m.r * k; b += m.g * k; w += k; }
  float v = s / w; float hi = floor(v * 255.) / 255.; o = vec4(hi, (v - hi) * 255., min(1., b / w * 4.), 1.); }`;

  /* ---------------------------------------------------------------- horneado y luz (plantillas de la maqueta, mesa-base.js) */
  const BAKE = body => FC + MATLIB + `
layout(location = 0) out vec4 o0; layout(location = 1) out vec4 o1;
float gEmis = 0.;
` + body + `
/* el mar de las mesas nuevas va quieto en pantalla: se hornea UNA vez (uSeaOnly) y, lejos de la costa (uSeaFar px), cada fotograma solo lo copia */
uniform float uSeaOnly, uSeaFar; uniform sampler2D uSeaA, uSeaB;
void main(){ vec2 q = qFrag();
  if (uSeaOnly < .5 && uSeaFar > 0. && sdAt(q) > uSeaFar) { o0 = texture(uSeaA, UV(q)); o1 = texture(uSeaB, UV(q)); return; }
  MS s = ms(q + uPorig); if (uSeaOnly > .5) { s.land = 0.; s.sd = 99.; s.border = 0.; s.coast = 0.; }
  vec3 alb; float h; vec3 mat; mesaBake(s, alb, h, mat); o0 = vec4(clamp(alb, 0., 1.), clamp(h, 0., 1.)); o1 = vec4(clamp(mat, 0., 1.), gEmis); }`;
  const HUELLA_DEF = `
void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){
  float r = length(d), ring = exp(-pow((r - 21.) / 2.2, 2.));
  h -= ring * .05; alb *= 1. - ring * .08;
}`;
  const BARR_DEF = `
vec3 mesaBarrido(MS s, float b, vec2 q, vec3 col){ vec3 F0 = mix(vec3(.04), gAlb, gMat.g); return col + b * (F0 + gAlb * .25 + gMat.b * .6) * gLc * (1. - gMat.r * .6); }`;
  const LIGHT = def => FC + MATLIB + `
out vec4 o;
uniform sampler2D uBake, uMat; uniform vec3 uLamp, uLampCol; uniform float uLampI, uCanto, uSombra, uKs, uAmb, uEnv, uNorm, uPoolK, uBrillo;
uniform vec2 uAniso; uniform vec4 uBarrido; uniform vec4 uHuella;
vec3 gN, gL, gLp, gLc, gAlb, gMat; float gFall, gSh, gEm;
vec4 B(vec2 q){ return texture(uBake, UV(q)); }
vec4 Mt(vec2 q){ return texture(uMat, UV(q)); }
float Soft(vec2 q){ return softL(q); }
${def.lib || ""}
${def.huella || HUELLA_DEF}
float H(vec2 q){
  float h = B(q).a; float sd = sdNear(q);
  if (uHuella.w > 0.) { vec2 d = q - uHuella.xy; if (dot(d, d) < 5184.) { MS s = ms(q + uPorig); vec3 a = vec3(.5), m = vec3(.5); mesaHuella(s, d, uHuella.z, a, h, m); } }
  return h * 4. + clamp(-sd / 2.5, 0., 1.) * uCanto;
}
${def.vivo || "vec3 mesaVivo(MS s, vec3 c){ return c; }"}
${def.barrido || BARR_DEF}
void main(){
  vec2 p = qFrag();
  MS s = ms(p + uPorig);
  vec4 b = B(p); vec3 alb = b.rgb; vec4 m4 = Mt(p); vec3 m = m4.rgb; gEm = m4.a;
  if (uHuella.w > 0.) { vec2 d = p - uHuella.xy; if (dot(d, d) < 5184.) { float hh = b.a; mesaHuella(s, d, uHuella.z, alb, hh, m); } }
  float rough = m.r, metal = m.g, coat = m.b;
  float hx = H(p + vec2(1, 0)) - H(p - vec2(1, 0)), hy = H(p + vec2(0, 1)) - H(p - vec2(0, 1));
  vec3 N = normalize(vec3(-hx, hy, 2.));
  vec3 P = vec3(p.x, uR.y - p.y, 0.), Lp = vec3(uLamp.x, uR.y - uLamp.y, uLamp.z);
  vec3 Ld = normalize(Lp - P);
  float fall = uLampI * mix(1., pow(clamp(1. - length(p - uLamp.xy) / (uR.x * .82), 0., 1.), 1.6), uPoolK);
  float dif = max(dot(N, Ld), 0.);
  vec2 l2 = normalize(uLamp.xy - p + 1e-4);
  float off = uCanto * (1.2 + 2.2 * length(p - uLamp.xy) / max(200., uLamp.z));
  float sh = uCanto > 0. ? Soft(p + l2 * off) * (1. - s.land) : 0.;
  vec3 V = vec3(0, 0, 1), Hh = normalize(Ld + V);
  float shin = mix(220., 6., rough), nh = max(dot(N, Hh), 0.);
  float spec = pow(nh, shin) * (shin + 8.) / 120.;
  if (length(uAniso) > 0. && metal > 0.) {
    vec3 T = normalize(vec3(uAniso.x, -uAniso.y, 0.)); T = normalize(T - N * dot(N, T)); vec3 Bt = cross(N, T);
    float th = dot(Hh, T), bh = dot(Hh, Bt);
    spec = mix(spec, exp(-2. * (th * th / .0007 + bh * bh / .012) / (1. + nh)) * 1.1, metal);
  }
  vec3 F0 = mix(vec3(.04), alb, metal);
  vec3 lc = uLampCol * fall;
  /* legibilidad: el brillo de la lampara (especular y disco reflejado) pesa menos sobre la tierra: nunca se come un pais */
  float kS = mix(1., mix(.15, .3, metal), s.land) * uBrillo;   // tope de legibilidad: en la tierra el brillo es un toque (el oro de la banca, algo mas)
  vec3 col = alb * (1. - metal) * (uAmb * .9 + dif * lc) * uNorm + F0 * spec * lc * uKs * kS;
  col += F0 * metal * uEnv * (uAmb * .7 + lc * .5 * pow(nh, 3.)) * uNorm;
  if (coat > 0.) { vec3 R = reflect(-V, N); float c = dot(R, Ld); float disc = pow(smoothstep(.984, .9975, c), 1.6), halo = pow(max(c, 0.), 45.); col += coat * (disc * .20 + halo * .09) * uLampCol * min(uLampI, 1.) * kS; }
  col *= 1. - sh * uSombra * .5;
  gN = N; gL = Ld; gLp = vec3(uLamp.xy, uLamp.z); gLc = lc; gAlb = alb; gMat = m; gFall = fall; gSh = sh;
  col = mesaVivo(s, col);
  if (uBarrido.x >= 0. && uBarrido.x < 1.6) {
    vec2 dir = vec2(cos(uBarrido.z), sin(uBarrido.z));
    vec2 qq = vec2(dot(p / uR - .5, dir) * 1.4 - (uBarrido.x * 1.9 - .95), dot(p / uR - .5, vec2(-dir.y, dir.x)));
    float bb = exp(-qq.x * qq.x / (.0035 + .002 * uBarrido.y)) * (.7 + .5 * uBarrido.y);
    col = mesaBarrido(s, bb, qq, col);
  }
  vec3 hi = max(col - .78, 0.); col = min(col, .78) + .22 * (1. - exp(-hi / .22));
#ifdef LITE
  o = vec4(clamp((col - b.rgb) * .5 + .5, 0., 1.), 1.);
#else
  col += (h21(gl_FragCoord.xy + fract(uT) * 37.) - .5) / 255.;
  o = vec4(col, 1.);
#endif
}`;
  /* modo ligero: la mesa a resolucion completa + la luz (diferencia) a media resolucion, con subida bilineal. Las fronteras y el dibujo
     quedan nitidos; solo la luz (suave por naturaleza) va a media resolucion */
  const COMP = FC + `
out vec4 o; uniform sampler2D uBase, uDelta;
void main(){ vec2 uv = gl_FragCoord.xy / uRes; vec3 c = texture(uBase, uv).rgb + texture(uDelta, uv).rgb * 2. - 1.;
  o = vec4(c + (h21(gl_FragCoord.xy + fract(uT) * 37.) - .5) / 255., 1.); }`;

  /* ---------------------------------------------------------------- LAS MESAS DE HOY (la firma sobre su dibujo) */
  const HOY_BAKE = `
uniform sampler2D uScene; uniform float uGtipo, uGrano, uSurco, uEmisK, uRelS, uRelL; uniform vec4 uMatS, uMatL;
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  alb = texture(uScene, UV(s.q)).rgb;
  float inl = smoothstep(.5, -2.5, s.sd);
  vec2 p = mix(s.q, s.p, step(.5, s.land));
  float micro = 0., mar = 0.;
  if (uGtipo < .5) { micro = (vn(p * .9) - .5) * .7 + (vn(p * .33 + 9.) - .5) * .5; mar = .45; }
  else if (uGtipo < 1.5) { micro = (vn(p * .6 + 4.) - .5) * .6; mar = .4; }
  else if (uGtipo < 2.5) { micro = (vn(p * vec2(1.6, .45) + 3.) * .5 + vn(p * vec2(.4, 1.5) + 8.) * .5 - .5) * 1.2; mar = .5; }
  else if (uGtipo < 3.5) { micro = (fbm3(p / 7.) - .5) * 1.4; mar = 0.; }
  else { micro = (vn(p * .5 + 2.) - .5) * .3; mar = .2; }
  micro *= mix(mar, 1., inl);
  // el relieve del propio dibujo (tablas, baldosas, ladrillos): paso alto de la escena, a 2 px
  float l0 = luma(alb), la = (luma(texture(uScene, UV(s.q + vec2(2, 0))).rgb) + luma(texture(uScene, UV(s.q - vec2(2, 0))).rgb) + luma(texture(uScene, UV(s.q + vec2(0, 2))).rgb) + luma(texture(uScene, UV(s.q - vec2(0, 2))).rgb)) * .25;
  float rel = clamp(l0 - la, -.25, .25) * mix(uRelS, uRelL, s.land);
  float surco = s.border * inl;
  h = .5 + micro * uGrano * .05 + rel * .35 - surco * uSurco * .22;
  mat = mix(uMatS.rgb, uMatL.rgb, s.land);
  float mx = max(alb.r, max(alb.g, alb.b)), mn = min(alb.r, min(alb.g, alb.b)), sa = (mx - mn) / max(mx, 1e-3);
  gEmis = uEmisK * smoothstep(.42, .72, sa) * smoothstep(.32, .62, mx);
}`;
  const HOY_VIVO = `
vec3 invS(vec3 y){ y = min(y, vec3(.985)); vec3 hi = -.22 * log(max(1. - (max(y, vec3(.78)) - .78) / .22, 1e-4)); return mix(y, .78 + hi, step(.78, y)); }
vec3 mesaVivo(MS s, vec3 col){
  float dif = max(dot(gN, gL), 0.);
  vec3 L = (uAmb * .9 + dif * gLc) * uNorm * (1. - gSh * uSombra * .5);
  col += (invS(gAlb) - gAlb) * L * (1. - gMat.g);
  return mix(col, invS(gAlb) + gLc * .04, gEm);
}`;
  /* la huella en las mesas de hoy: la ficha deja su disco apretado y el canto hundido (el pano se aplasta, el papel se marca, lo pulido se empana) */
  const HOY_HUELLA = `
void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){
  float r = length(d), disc = smoothstep(21.5, 19.5, r), rim = exp(-pow((r - 20.5) / 1.5, 2.));
  alb *= 1. - disc * .05 - rim * .12;
  h -= disc * .04 + rim * .16;
  mat.r = mix(mat.r, mat.r * .7, disc); mat.b *= 1. - disc * .6;
}`;
  const HOY_BARR = `
vec3 mesaBarrido(MS s, float b, vec2 q, vec3 col){ vec3 F0 = mix(vec3(.04), gAlb, gMat.g); return col + b * (F0 + gAlb * .4 + gMat.b * .8) * gLc * 1.3 * (1. - gMat.r * .45); }`;
  /* material por mesa: g = tipo de micro relieve (0 tapete, 1 piedra pulida, 2 papel o madera, 3 piedra mate, 4 cristal o plastico),
     s/l = [rugosidad, metal, capa de brillo] del mar y de la tierra, gr = relieve del material, e = luz propia, r = [relieve del dibujo mar, tierra] */
  const F = (g, s, l, gr, e, r) => ({ g, s, l, gr, e: e || 0, r: r || [0, 0.4] });
  const FELT = F(0, [0.97, 0, 0], [0.72, 0, 0.12], 0.7), PAPER = F(2, [0.93, 0, 0], [0.88, 0, 0], 1.2), WOOD = F(2, [0.45, 0, 0.45], [0.5, 0, 0.3], 0.5, 0, [0.6, 0.4]);
  const GLASS = F(4, [0.2, 0, 0.55], [0.3, 0, 0.4], 0.3, 1), TILE = F(4, [0.25, 0, 0.6], [0.3, 0, 0.5], 0.3, 0, [0.6, 0.5]);
  const HOY = {
    casino: FELT, granate: FELT, medianoche: FELT, moqueta: F(0, [0.97, 0, 0], [0.72, 0, 0.12], 0.7, 0, [0.5, 0.4]), tartan: F(0, [0.95, 0, 0], [0.75, 0, 0.1], 0.7, 0, [0.5, 0.4]),
    bordado: F(0, [0.95, 0, 0], [0.8, 0, 0.05], 0.6, 0, [0.6, 0.6]), expedicion: PAPER, nautica: PAPER, fondo: PAPER, cianotipo: PAPER, periodico: PAPER, cine: PAPER,
    tablero: WOOD, ajedrez: WOOD, nero: F(1, [0.18, 0, 0.8], [0.4, 0, 0.45], 0.25), jade: F(1, [0.2, 0, 0.75], [0.35, 0, 0.5], 0.25), nacar: F(1, [0.2, 0, 0.8], [0.35, 0, 0.5], 0.25),
    hielo: F(1, [0.15, 0, 0.8], [0.35, 0, 0.4], 0.25), pizarra: F(3, [0.9, 0, 0], [0.85, 0, 0.05], 0.5), corcho: F(3, [0.95, 0, 0], [0.9, 0, 0], 1, 0, [0.7, 0.6]),
    zen: F(3, [0.95, 0, 0], [0.85, 0, 0.05], 0.8, 0, [0.7, 0.4]), teselas: F(3, [0.5, 0, 0.3], [0.5, 0, 0.3], 0.6, 0, [0.7, 0.7]), cubos: F(3, [0.8, 0, 0.05], [0.8, 0, 0.05], 0.4, 0, [0.6, 0.6]),
    mazmorra: F(3, [0.85, 0, 0.05], [0.85, 0, 0.05], 0.7, 0, [0.8, 0.6]), brasas: F(3, [0.55, 0, 0.15], [0.68, 0, 0.1], 0.6, 1), lava: F(3, [0.55, 0, 0.15], [0.68, 0, 0.1], 0.6, 1),
    azulejo: TILE, granadino: F(4, [0.25, 0, 0.6], [0.3, 0, 0.5], 0.3, 0, [0.5, 0.5]), bloques: F(4, [0.3, 0, 0.5], [0.3, 0, 0.5], 0.3, 0, [0.8, 0.8]),
    minas: F(4, [0.5, 0, 0.25], [0.5, 0, 0.25], 0.3, 0, [0.6, 0.6]), reverso: F(2, [0.5, 0, 0.3], [0.5, 0, 0.3], 0.5, 0, [0.5, 0.5]), seda: F(4, [0.35, 0, 0.35], [0.45, 0, 0.25], 0.3),
    bolsillo: F(4, [0.5, 0, 0.2], [0.5, 0, 0.2], 0.3, 0, [0, 0.3]), tele: F(4, [0.2, 0, 0.55], [0.25, 0, 0.45], 0.2), vhs: F(4, [0.2, 0, 0.5], [0.25, 0, 0.45], 0.2),
    tormenta: F(4, [0.25, 0, 0.5], [0.7, 0, 0.1], 0.3), aurora: F(4, [0.3, 0, 0.3], [0.6, 0, 0.1], 0.3, 1),
    recreativa: F(4, [0.3, 0, 0.4], [0.4, 0, 0.3], 0.3, 1), radar: GLASS, matrix: GLASS, hiperespacio: GLASS, vitral: F(4, [0.12, 0, 0.7], [0.2, 0, 0.6], 0.3, 0.5, [0.6, 0.6]),
    policroma: F(4, [0.2, 0, 0.6], [0.3, 0, 0.5], 0.3, 0.3), tesoro: F(1, [0.3, 1, 0.4], [0.6, 0, 0.15], 0.3, 0.5), plataformas: F(4, [0.4, 0, 0.3], [0.4, 0, 0.3], 0.3, 0, [0.4, 0.6]),
  };
  /* la firma en Extrema (mesa-firma.js): canto 3,6, sombra 1, brillo 1,8, relieve 1,8, surco 1,2, sala 0,64, lampara 0,62 a 760 px, calidez 0,6 */
  const HOY_LUZ = { canto: 3.6, sombra: 1, ks: 1.8, grano: 1.8, surco: 1.2, amb: 0.64, lmpI: 0.62, lmpZ: 760, lmpK: 0.6, env: 0.4, poolK: 0.25 };

  /* ---------------------------------------------------------------- LAS ONCE MESAS NUEVAS (los materiales de la maqueta, a 1:1)
     p = s.p (tierra, anclada al mapa) · ps = s.q (mar, quieto en pantalla como hoy) */
  const T7 = arr => `vec3[7](${arr.map(c => `vec3(${c.join(", ")})`).join(", ")})`;
  const NUEVAS = {};

  /* LA MESA: pano de casino con pelo, paises de pano con canto, costa bordada en hilo de oro */
  const PANO_CW = `float mesaCw(MS s){ return smoothstep(2.2, .6, abs(s.sd)); }
`;
  NUEVAS.mesa = {
    luz: { lmpI: 1.5, lmpZ: 520, lmpK: 0.55, canto: 2.2, sombra: 1, amb: 0.32, ks: 1, env: 1, poolK: 0.75 },
    uni: { uFeltSea: [0x1d / 255, 0x5c / 255, 0x4a / 255], uInk: [0.11, 0.04, 0.24], uPelo: 1.6 },
    bake: PANO_CW + `
uniform vec3 uFeltSea, uInk; uniform float uPelo;
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = mix(s.q, s.p, step(.5, s.land));
  float f1 = vn(vec2(p.x * .9, p.y * 2.6)), f2 = vn(p * vec2(2.3, .7) + 17.), f3 = h21(floor(p));
  float nap = (f1 * .55 + f2 * .3 + f3 * .15);
  float big = fbm3(s.q / 260.);
  vec3 sea = uFeltSea * (.86 + .14 * big) * (.94 + .1 * nap * uPelo);
  vec3 tints[7] = ${T7([[.93, .87, .72], [.92, .78, .76], [.80, .88, .76], [.95, .82, .66], [.78, .84, .90], [.90, .80, .86], [.94, .92, .86]])};
  vec3 landc = tints[int(clamp(s.cls, 0., 6.))] * (.9 + .1 * nap * uPelo);
  alb = mix(sea, landc, s.land);
  float cw = mesaCw(s);
  alb = mix(alb, vec3(.93, .72, .32), cw * .9);
  alb = mix(alb, uInk, bordAA(s.p) * .8);
  h = nap * .12 * uPelo + big * .05 + cw * .25 - s.border * .15;
  mat = vec3(mix(.92, .55, cw), cw * .95, 0.);
}`,
    huella: PANO_CW + `
void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){
  float r = length(d), disc = smoothstep(21.5, 19.5, r), rim = exp(-pow((r - 20.5) / 1.4, 2.));
  float fib = vn(vec2(d.y * .9, d.x * 2.6) + 5.);
  alb = mix(alb, alb * (1.16 + .08 * fib), disc * (1. - mesaCw(s)));
  h -= disc * .03 + rim * .14;
  mat.r = mix(mat.r, mat.r * .7, disc);
}`,
    barrido: `
vec3 mesaBarrido(MS s, float b, vec2 q, vec3 col){
  float nap = vn(vec2(s.q.x * .9, s.q.y * 2.6));
  return col + b * gLc * (gAlb * (.45 + .35 * nap) * (1. - gMat.g) + gMat.g * vec3(1., .78, .42) * 1.5);
}`,
  };

  /* CAOBA: caoba barnizada, paises de marqueteria con filete de laton */
  NUEVAS.ruleta = {
    luz: { lmpI: 1.4, lmpZ: 560, lmpK: 0.55, canto: 0.8, sombra: 0.8, amb: 0.30, ks: 1, env: 1, poolK: 0.75 },
    uni: { uFig: 1, uBarniz: 1, uFilete: 1 },
    bake: `
uniform float uFig, uBarniz, uFilete;
vec3 madera(float c, float r){
  if (c < .5) return r < .34 ? vec3(.87, .73, .53) : r < .67 ? vec3(.90, .80, .50) : vec3(.76, .67, .47);
  if (c > 4.5) return c < 5.5 ? (r < .5 ? vec3(.84, .62, .40) : vec3(.72, .56, .36)) : vec3(.88, .82, .66);
  return c < 1.5 ? vec3(.80, .52, .34) : c < 2.5 ? vec3(.62, .43, .28) : c < 3.5 ? vec3(.70, .62, .55) : vec3(.88, .76, .45);
}
float mFil(MS s){ return smoothstep(-3.4, -2.6, s.sd) * smoothstep(.5, -.3, s.sd); }
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q;
  float g1 = fbm(vec2(ps.x * .0011, ps.y * .040)), g2 = vn(vec2(ps.x * .0016, ps.y * .16)), g3 = vn(vec2(ps.x * .02, ps.y * 1.));
  float rib = sin(ps.y * .055 + g1 * 5.) * .5 + .5;
  vec3 cao = vec3(.31, .11, .055);
  vec3 sea = cao * (.88 + .10 * g1 + .05 * g2 + .025 * g3) * (1. + uFig * .10 * (rib - .5));
  sea *= 1. - poro(ps, 0.) * .16;
  vec2 id = paisId(p);
  float ang = id.y * 3.1416;
  float v = veta(p + id * 900., ang, .05, .45);
  vec3 land = madera(s.cls, id.x) * (.88 + .14 * v) * (.97 + .06 * id.y) * (1. - poro(p, ang) * .10);
  alb = mix(sea, land, s.land);
  float b = bordAA(p);
  alb = mix(alb, vec3(.13, .06, .035), b * .75);
  float fil = mFil(s) * uFilete;
  alb = mix(alb, vec3(.86, .64, .30), fil);
  h = fil * .16 + v * .015 * s.land - b * .05;
  mat = vec3(mix(.30, .26, fil), fil * .95, uBarniz * (1. - fil * .5));
}`,
    huella: `
float mFil(MS s){ return smoothstep(-3.4, -2.6, s.sd) * smoothstep(.5, -.3, s.sd); }
void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){
  float a = atan(d.y, d.x), r = length(d);
  float rr = 23. + 1.6 * vn(vec2(a * 3.2, 1.)) + .8 * vn(vec2(a * 11., 4.));
  float w = 1.1 + .9 * vn(vec2(a * 5., 9.));
  float ring = exp(-pow((r - rr) / w, 2.)), inner = smoothstep(rr, rr - 4., r) * .25;
  float k = (ring * .8 + inner) * (1. - mFil(s));
  alb = mix(alb, alb * 1.45 + vec3(.05, .04, .03), k);
  mat.b *= 1. - k * .85; mat.r = mix(mat.r, .6, k);
  h -= ring * .05;
}`,
    barrido: `
vec3 mesaBarrido(MS s, float b, vec2 q, vec3 col){
  float ch = .45 + .9 * vn(vec2(s.q.x * .0035, s.q.y * .07 + q.x * 6.));
  vec3 warm = vec3(1., .72, .46);
  return col + b * gLc * (warm * gAlb * 1.4 * ch * gMat.b + gMat.g * vec3(1., .8, .45) * 1.6);
}`,
  };

  /* CAMARA ACORAZADA: laton cepillado con brillo anisotropo, paises de ebano incrustado, remaches en el marco */
  NUEVAS.laton = {
    luz: { lmpI: 1.5, lmpZ: 520, lmpK: 0.55, canto: 0.6, sombra: 0.7, amb: 0.34, ks: 1, env: 1.2, aniso: [1, 0], poolK: 0.75 },
    uni: { uCep: 1.7, uRem: 1 },
    bake: `
uniform float uCep, uRem;
float lRem(vec2 p, out float ring){
  vec2 R = uR; float in0 = 22., step0 = 96.;
  float e = min(min(p.x, p.y), min(R.x - p.x, R.y - p.y));
  ring = 0.; if (e > in0 + 9.) return 0.;
  vec2 c;
  if (min(p.y, R.y - p.y) <= min(p.x, R.x - p.x)) { float x = (floor((p.x - R.x * .5) / step0 + .5)) * step0 + R.x * .5; c = vec2(x, p.y < R.y * .5 ? in0 : R.y - in0); }
  else { float y = (floor((p.y - R.y * .5) / step0 + .5)) * step0 + R.y * .5; c = vec2(p.x < R.x * .5 ? in0 : R.x - in0, y); }
  float d = length(p - c); ring = smoothstep(1.2, 0., abs(d - 7.5));
  return remache(p, c, 6.5);
}
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q;
  float cp = cepillo(ps, 0.);
  vec3 brass = vec3(.80, .61, .31);
  vec3 sea = brass * (1. + uCep * .16 * (cp - .5)) * (.96 + .06 * fbm(ps / 400.));
  vec2 id = paisId(p);
  float v = veta(p + id * 800., id.y * 3.1416, .11, .05);
  vec3 eb = mix(vec3(.07, .05, .045), vec3(.20, .13, .085), v * v * .8) * (.85 + .3 * id.x) + vec3(.02, .012, .008) * s.cls * .4;
  alb = mix(sea, eb, s.land);
  float inc = smoothstep(1.6, .2, s.sd) * smoothstep(-.6, .4, s.sd);
  alb *= 1. - inc * .55;
  float b = bordAA(p);
  float strip = b * s.land;
  alb = mix(alb, brass * 1.05, strip);
  float ring; float rm = lRem(ps, ring) * uRem;
  alb = mix(alb, brass * 1.08, step(.001, rm)); alb *= 1. - ring * .5 * uRem;
  float metal = max(1. - s.land, strip);
  h = (1. - s.land) * cp * .02 * uCep + rm * .9 - inc * .05 - ring * .05 * uRem;
  mat = vec3(mix(.22, .38, metal), metal, (1. - metal) * .75);
}`,
    huella: `
void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){
  float r = length(d), disc = smoothstep(21., 19., r), rings = sin(r * 2.1) * .5 + .5;
  alb = mix(alb, alb * (1.08 + .05 * rings), disc * mat.g);
  mat.r = mix(mat.r, .12, disc * mat.g);
  h -= disc * .02 + exp(-pow((r - 20.) / 1.2, 2.)) * .12;
  mat.b *= 1. - disc * .6 * (1. - mat.g);
}`,
    barrido: `
vec3 mesaBarrido(MS s, float b, vec2 q, vec3 col){
  float cp = cepillo(s.q, 0.);
  return col + b * gLc * (gMat.g * gAlb * (1.3 + 1.2 * cp) + gMat.b * .25);
}`,
  };

  /* CARRARA: marmol blanco pulido (sin vetas: mar limpio) con piedras duras incrustadas */
  NUEVAS.carrara = {
    luz: { lmpI: 1.35, lmpZ: 560, lmpK: 0.55, canto: 0.5, sombra: 0.6, amb: 0.36, ks: 1, env: 1, poolK: 0.75 },
    uni: { uPulido: 1, uPiedra: 1.2 },
    bake: `
uniform float uPulido, uPiedra;
vec3 piedra(float c, vec2 p, out float fleck){
  fleck = 0.;
  if (c < .5) { float n = fbm(p / 38.), m = fbm(p / 9. + 4.); fleck = step(.992, h21(floor(p / 1.))) * step(.45, m); return mix(vec3(.10, .18, .50), vec3(.20, .32, .66), n) * (.88 + .2 * m); }
  if (c < 1.5) { float w = fbm(p / 150.) * 5. + fbm(p / 40.) * .5, bnd = sin(w * 6.2832) * .5 + .5; return mix(vec3(.13, .44, .28), vec3(.05, .26, .16), smoothstep(.75, 1., bnd) * .8 + fbm(p / 30.) * .15); }
  if (c < 2.5) { float n = fbm(p / 26.), v = pow(1. - abs(sin(fbm(p / 80.) * 14.)), 30.); return mix(vec3(.46, .10, .07), vec3(.66, .20, .12), n) * (1. - v * .35); }
  if (c < 3.5) { float bnd = sin(fbm(p / 120.) * 18.) * .5 + .5; return mix(vec3(.62, .40, .17), vec3(.86, .70, .46), smoothstep(.55, 1., bnd) * .8 + fbm(p / 25.) * .1); }
  float n = fbm(p / 50.), v = pow(1. - abs(sin(fbm(p / 90. + 2.) * 12.)), 40.);
  return mix(vec3(.74, .55, .25), vec3(.88, .70, .36), n) * (1. - v * .4);
}
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q;
  float nb = nubeMarmol(ps);
  vec3 sea = vec3(.925, .918, .895) * (.955 + .055 * nb) + vec3(-.01, 0., .01) * (fbm(ps / 600.) - .5);
  vec2 id = paisId(p);
  float c = s.cls;
  float k = c < .5 ? (id.x < .3 ? 0. : id.x < .55 ? 1. : id.x < .8 ? 2. : 4.) : c < 1.5 ? 3. : c < 2.5 ? 0. : c < 3.5 ? 1. : c < 4.5 ? 4. : c < 5.5 ? 2. : 3.;
  float fleck; vec3 st = piedra(k, p + id * 700., fleck) * (.94 + .12 * id.y);
  st = mix(vec3(luma(st)), st, uPiedra);
  alb = mix(sea, st, s.land);
  alb = mix(alb, vec3(.93, .78, .40), fleck * s.land);
  float j = smoothstep(1.1, .1, abs(s.sd + .4)) * .55 + bordAA(p) * .6 * s.land;
  // la masilla de las juntas: oscura sobre las piedras claras y clara sobre las oscuras (lapislazuli, malaquita): la frontera siempre se lee
  vec3 jc = luma(alb) > .3 ? vec3(.20, .19, .19) : vec3(.86, .83, .76);
  alb = mix(alb, jc, clamp(j, 0., 1.));
  h = -j * .04 + s.land * fbm(p / 6.) * .006;
  mat = vec3(mix(.06, .05, s.land), fleck * s.land, uPulido);
}`,
    huella: `
void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){
  float a = atan(d.y, d.x), r = length(d);
  float rr = 22.5 + 1.2 * vn(vec2(a * 3., 2.)), ring = exp(-pow((r - rr) / 1.5, 2.));
  float k = ring * .9 + smoothstep(rr, rr - 6., r) * .15;
  mat.b *= 1. - k * .9; mat.r = mix(mat.r, .55, k); h -= ring * .03;
  alb = mix(alb, alb * .96 + .03, k * (1. - s.land));
}`,
    barrido: `
vec3 mesaBarrido(MS s, float b, vec2 q, vec3 col){
  float sharp = pow(clamp(b / 1.4, 0., 1.), 8.) * .45 * b + b * .05;
  return col + gLc * (sharp * gMat.b * (1. - s.land * .4) + b * gMat.g * vec3(1., .8, .4) * 1.6 + b * s.land * gAlb * .25);
}`,
  };

  /* LACA DE ORO: urushi negra de espejo, costas de maki-e (polvo de oro), lacas de color */
  NUEVAS.laca = {
    luz: { lmpI: 1.4, lmpZ: 600, lmpK: 0.55, canto: 0.5, sombra: 0.5, amb: 0.30, ks: 1, env: 1.1, poolK: 0.75 },
    uni: { uPolvo: 1, uColor: 1.2, uEspejo: 1.5 },
    bake: `
uniform float uPolvo, uColor;
vec3 laca(float c, float r){
  float k = c < .5 ? (r < .4 ? 0. : r < .7 ? 1. : 2.) : c < 1.5 ? 3. : c < 2.5 ? 4. : c < 3.5 ? 2. : c < 4.5 ? 0. : c < 5.5 ? 1. : 3.;
  return k < .5 ? vec3(.50, .075, .045) : k < 1.5 ? vec3(.46, .22, .055) : k < 2.5 ? vec3(.07, .24, .13) : k < 3.5 ? vec3(.62, .46, .13) : vec3(.30, .085, .15);
}
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q;
  vec3 sea = vec3(.022, .017, .016) * (.9 + .2 * fbm(ps / 500.));
  vec2 id = paisId(p); vec3 lc0 = laca(s.cls, id.x);
  vec3 land = mix(vec3(luma(lc0)), lc0, uColor) * (.92 + .1 * fbm(p / 120.)) * (.93 + .14 * id.y);
  alb = mix(sea, land, s.land);
  float k = s.sd < 0. ? exp(s.sd / 2.2) : 0.;
  float dust = step(1. - k * .85 * uPolvo, h21(floor(p) + 3.1));
  float line = smoothstep(1.3, .3, abs(s.sd + .3)) * uPolvo;
  float hair = bordAA(p) * s.land * .9 * uPolvo;
  float gold = clamp(max(max(dust * s.land, line), hair), 0., 1.);
  float tone = .9 + .16 * h21(floor(p) + 9.7);
  alb = mix(alb, vec3(.96, .76, .36) * tone, gold);
  h = line * .06 + dust * s.land * .015;
  mat = vec3(mix(.04, .30, gold), gold, 1. - gold * .7);
}`,
    vivo: `
uniform float uEspejo;
vec3 mesaVivo(MS s, vec3 col){
  // la estela de la lampara en el espejo negro: mas corta que en la maqueta (la lampara cuelga arriba; la estela no baja hasta donde se juega)
  vec2 d = s.q - gLp.xy - vec2(0., 90.);
  float st = exp(-d.x * d.x / (2. * 52. * 52.) - d.y * d.y / (2. * 170. * 170.)) * .8;
  float core = exp(-d.x * d.x / (2. * 14. * 14.) - d.y * d.y / (2. * 100. * 100.)) * .75;
  vec3 lc = gLc / max(.001, gFall) * min(gFall, 1.4);
  return col + gMat.b * uEspejo * lc * (st * .16 + core * .30) * mix(1., .1, s.land) * uBrillo;   // en las lacas de color, el reflejo apenas: el pais y su frontera se leen igual que sin el
}`,
    huella: `
void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){
  float r = length(d), disc = smoothstep(22., 18., r), rim = exp(-pow((r - 20.5) / 1.6, 2.));
  float k = disc * .55 + rim * .45;
  alb = mix(alb, alb + vec3(.035, .032, .03), k * (1. - mat.g));
  mat.b *= 1. - k * .75; mat.r = mix(mat.r, .5, k * (1. - mat.g)); h -= rim * .04;
}`,
    barrido: `
vec3 mesaBarrido(MS s, float b, vec2 q, vec3 col){
  float tw = step(.6, h21(floor(s.q) + floor(q.x * 40.)));
  return col + gLc * (b * gMat.b * .45 * (1. - gMat.g) + pow(b, 1.5) * gMat.g * vec3(1., .8, .45) * (1.2 + 1.6 * tw));
}`,
  };

  /* DESPACHO: cuero verde con su grano, greca de oro gofrada junto al borde de la pantalla, paises de cuero repujado con pan de oro */
  NUEVAS.despacho = {
    luz: { lmpI: 1.45, lmpZ: 560, lmpK: 0.55, canto: 1.6, sombra: 0.85, amb: 0.30, ks: 1, env: 1, poolK: 0.75 },
    uni: { uGrano: 1.6, uOro: 1 },
    bake: `
uniform float uGrano, uOro;
vec3 cuero(float c, float r){
  float k = c < .5 ? (r < .45 ? 0. : r < .75 ? 1. : 4.) : c < 1.5 ? 3. : c < 2.5 ? 2. : c < 3.5 ? 4. : c < 4.5 ? 1. : c < 5.5 ? 0. : 2.;
  return k < .5 ? vec3(.80, .68, .50) : k < 1.5 ? vec3(.80, .60, .36) : k < 2.5 ? vec3(.70, .50, .32) : k < 3.5 ? vec3(.70, .44, .36) : vec3(.64, .63, .47);
}
float cOro(MS s){ return smoothstep(-4.4, -3.6, s.sd) * smoothstep(-1.4, -2.2, s.sd); }
float cGreca(vec2 p, out float g){
  vec2 R = uR; float per = 20., in0 = 34.;
  float e = min(min(p.x, p.y), min(R.x - p.x, R.y - p.y));
  float lin = smoothstep(1.6, .4, abs(e - (in0 - 5.))) + smoothstep(1.6, .4, abs(e - (in0 + per + 5.)));
  float k = 0.;
  if (e > in0 && e < in0 + per) {
    float dx = min(p.x, R.x - p.x), dy = min(p.y, R.y - p.y);
    bool corner = dx < in0 + per && dy < in0 + per;
    if (corner) { vec2 c = vec2(dx, dy) - in0; k = (abs(c.x - per * .5) > per * .3 || abs(c.y - per * .5) > per * .3) ? 1. : 0.; k *= step(per * .1, min(c.x, c.y)) * step(max(c.x, c.y), per * .9); }
    else { float along = dy < dx ? p.x : p.y; float across = e - in0; k = greca(vec2(along - in0, across), per); }
  }
  g = clamp(k + lin, 0., 1.);
  return g;
}
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q;
  float gr = grano(ps, 3.1), mot = fbm(ps / 230.);
  vec3 sea = vec3(.12, .25, .165) * (.86 + .12 * gr * uGrano + .10 * (mot - .5));
  float gl = grano(p * 1.35 + 7., 3.1);
  vec2 id = paisId(p);
  vec3 land = cuero(s.cls, id.x) * (.95 + .08 * id.y) * (.88 + .10 * gl * uGrano + .06 * (fbm(p / 160. + 3.) - .5));
  alb = mix(sea, land, s.land);
  float b = bordAA(p);
  alb *= 1. - b * .45;
  float oro = cOro(s) * uOro;
  vec3 gold = vec3(.95, .74, .36) * (.92 + .1 * h21(floor(p / 2.)));
  alb = mix(alb, gold, oro);
  float g; float gk = cGreca(ps, g) * uOro;
  alb = mix(alb, gold, gk * (1. - s.land));
  h = mix(gr, gl, s.land) * .09 * uGrano + s.land * smoothstep(0., -6., s.sd) * .12 - b * .12 - oro * .05 - gk * (1. - s.land) * .06;
  mat = vec3(mix(.55, .30, max(oro, gk)), max(oro, gk * (1. - s.land)) * .95, .18 * (1. - max(oro, gk)));
}`,
    huella: `
void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){
  float r = length(d), disc = smoothstep(21., 19., r), rim = exp(-pow((r - 20.) / 1.3, 2.));
  alb *= 1. - disc * .16 * (1. - mat.g);
  h -= disc * .08 + rim * .14;
  mat.r = mix(mat.r, .28, disc * (1. - mat.g)); mat.b = max(mat.b, disc * .35);
}`,
    barrido: `
vec3 mesaBarrido(MS s, float b, vec2 q, vec3 col){ return col + b * gLc * (gMat.g * vec3(1., .8, .45) * 1.9 + gAlb * .22 * (1. - gMat.g)); }`,
  };

  /* LA BANCA: pano negro con piezas de oro macizo, canto alto y bisel */
  NUEVAS.banca = {
    luz: { lmpI: 1.4, lmpZ: 560, lmpK: 0.55, canto: 2.6, sombra: 1, amb: 0.30, ks: 1, env: 1.3, poolK: 0.75 },
    uni: { uBisel: 1.6, uMart: 0.9 },
    bake: `
uniform float uBisel, uMart;
vec3 oro(float c, float r){
  float k = c < .5 ? (r < .45 ? 0. : r < .75 ? 4. : 2.) : c < 1.5 ? 1. : c < 2.5 ? 3. : c < 3.5 ? 2. : c < 4.5 ? 4. : c < 5.5 ? 1. : 0.;
  return k < .5 ? vec3(1., .78, .36) : k < 1.5 ? vec3(.97, .64, .47) : k < 2.5 ? vec3(.86, .80, .42) : k < 3.5 ? vec3(.95, .57, .30) : vec3(.95, .87, .58);
}
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q;
  float nap = vn(vec2(ps.x * .9, ps.y * 2.6)) * .6 + h21(floor(ps)) * .4;
  vec3 felt = vec3(.030, .029, .034) * (.85 + .3 * nap) * (.92 + .16 * fbm(ps / 300.));
  vec3 v = vor(p / 6.);
  float ham = smoothstep(0., .6, v.x) * uMart;
  float b = bordAA(p);
  float bev = smoothstep(0., -4.5 * uBisel, s.sd);
  float bevB = smoothstep(.0, 2.5, bordDist(p) - .5);
  vec2 id = paisId(p);
  alb = mix(felt, oro(s.cls, id.x) * (.93 + .08 * v.z + .06 * id.y), s.land);
  alb = mix(alb, vec3(.12, .08, .03), b * s.land * .85);
  h = s.land * (sqrt(bev) * min(1., .35 + .65 * bevB) * .9 + ham * .015) + (1. - s.land) * nap * .01;
  mat = vec3(mix(.95, .22, s.land), s.land * (1. - b * .7), 0.);
}`,
    huella: `
void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){
  float r = length(d), disc = smoothstep(21.5, 19.5, r), rim = exp(-pow((r - 20.5) / 1.4, 2.));
  float fib = vn(vec2(d.y * .9, d.x * 2.6) + 5.);
  alb = mix(alb, alb * (1.7 + .5 * fib) + .006, disc * (1. - mat.g));
  mat.r = mix(mat.r, mat.r * .6, disc * (1. - mat.g));
  h -= rim * (.04 + .10 * mat.g);
  mat.r = mix(mat.r, .12, disc * mat.g);
}`,
    barrido: `
vec3 mesaBarrido(MS s, float b, vec2 q, vec3 col){ float edge = clamp(1. - gN.z, 0., 1.) * 8.; return col + b * gLc * gMat.g * gAlb * (1.5 + edge); }`,
  };

  /* ACUARELA: papel prensado en frio, aguadas que granulan, borde seco, coliflores, tinta sepia; la gota al hacer clic */
  const ACU_LIB = `
uniform vec3 uPaper;
float inkAt(vec2 p, MS s){
  float eb = bordDist(p);
  float bl = clamp(.9 - eb, 0., 1.) * s.land;
  float cl = smoothstep(1.15, .2, abs(s.sd + .25));
  return max(max(bl, s.border * s.land), cl);
}`;
  NUEVAS.acuarela = {
    luz: { lmpI: 0.45, lmpZ: 900, lmpK: 0.4, canto: 0, sombra: 0, amb: 0.72, ks: 0.4, env: 1, poolK: 0.6 },
    uni: { uPaper: [0.975, 0.958, 0.915], uMarP: [0.52, 0.67, 0.94], uGran: 1.6, uSeco: 1.6, uBlanco: 1, uCarga: 1.35, uSeed: 3.7 },
    gotas: 1.5, seaFar: 64,
    lib: ACU_LIB,
    bake: ACU_LIB + `
uniform vec3 uMarP; uniform float uGran, uSeco, uBlanco, uCarga, uSeed;
float paperH(vec2 p){ return fbm3(p / 2.4) * .5 + vn(p / 1.05) * .22 + vn(p / 6.5) * .28; }
vec3 pigA(int c){ return c == 0 ? vec3(.96, .85, .60) : c == 1 ? vec3(.95, .73, .75) : c == 2 ? vec3(.78, .88, .63) : c == 3 ? vec3(.97, .77, .60) : c == 4 ? vec3(.81, .77, .93) : c == 5 ? vec3(.90, .86, .66) : vec3(.93, .92, .90); }
vec3 pigB(int c){ return c == 0 ? vec3(.95, .77, .56) : c == 1 ? vec3(.93, .67, .79) : c == 2 ? vec3(.70, .85, .72) : c == 3 ? vec3(.95, .71, .62) : c == 4 ? vec3(.75, .80, .95) : c == 5 ? vec3(.86, .80, .62) : vec3(.90, .90, .92); }
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q;
  vec2 pp = mix(ps, p, step(.5, s.land));
  float ph = paperH(pp);
  vec3 paper = uPaper * (.988 + .024 * ph);
  float g = smoothstep(.22, .82, (1. - ph) + (h21(floor(pp)) - .5) * .22);
  float big = fbm(ps / 520. + uSeed), mid = fbm(ps / 170. + uSeed * 1.7 + 4.);
  float dens = .60 + (big - .5) * .60 + (mid - .5) * .22;
  float flo = smoothstep(.52, .78, fbm(ps / 230. + 11.3 + uSeed));
  dens *= 1. - flo * .30;
  float sd = max(s.sd, 0.);
  dens += .34 * exp(-sd / 18.) + uSeco * .50 * exp(-pow(sd - 1.6, 2.) / 3.2);
  dens *= 1. + uGran * .60 * (g - .45) * smoothstep(.2, .7, dens);
  vec3 seaT = pow(uMarP, vec3(max(dens, 0.) * uCarga));
  float e = min(bordDist(p), max(-s.sd, 0.));
  int ci = int(clamp(clsOK(s), 0., 6.));
  float w = fbm(p / 95. + float(ci) * 3.1 + uSeed);
  vec3 lp = mix(pigA(ci), pigB(ci), smoothstep(.35, .75, w) * .7);
  float ld = .80 + (w - .5) * .55 + (fbm(p / 34. + 2.) - .5) * .16;
  float cf = fbm(p / 64. + 21. + float(ci) + uSeed);
  ld *= 1. - smoothstep(.60, .655, cf) * .32;
  ld += exp(-pow((cf - .60) / .011, 2.)) * .16;
  float gap = uBlanco * 3.4 * smoothstep(.54, .64, fbm(p / 300. + 5.5 + uSeed));
  float ee = e - gap;
  ld += uSeco * .80 * exp(-max(ee, 0.) / 2.1);
  ld *= 1. + uGran * .35 * (g - .45);
  float cov = smoothstep(-.6, .6, ee);
  vec3 landT = mix(vec3(1.), pow(lp, vec3(max(ld, 0.) * uCarga)), cov);
  vec3 T = mix(seaT, landT, s.land);
  float ink = inkAt(p, s) * (.80 + .20 * vn(pp / 40. + 7.));
  alb = paper * T;
  alb = mix(alb, vec3(.27, .18, .14), ink * .8);
  h = ph * .2 + ink * .06;
  mat = vec3(.9, 0., 0.);
}`,
    huella: `void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){}`,
    vivo: `
uniform float uGotas[32];
vec3 mesaVivo(MS s, vec3 col){
  vec3 a0 = B(s.q).rgb;
  vec3 Tr = clamp(a0 / uPaper, .03, 1.);
  float ink = inkAt(s.p, s);
  for (int i = 0; i < 8; i++){
    float age = uGotas[i * 4 + 2]; if (age < 0.) continue;
    vec2 c = vec2(uGotas[i * 4], uGotas[i * 4 + 1]); float f = uGotas[i * 4 + 3];
    vec2 d = s.q - c; float r = length(d);
    float R = f * 128. * (1. - exp(-age * 2.4)) + 5.;
    if (r > R * 1.4 + 26.) continue;
    vec2 dir = d / max(r, 1e-3); float sd0 = float(i) * 7.31 + f * 3.7;
    float wob = (vn(dir * 1.7 + sd0) - .5) * .34 + (vn(dir * 5.5 + sd0 + 9.) - .5) * .12;
    float edge = R * (1. + wob) + (vn(d / 5.5 + sd0) - .5) * 4.;
    float x = r - edge;
    float wet = clamp(1. - (age - 1.3) / 2.4, 0., 1.);
    float vis = clamp(1. - (age - 3.3) / 2.3, 0., 1.);
    vis = max(vis, .4 * s.land);                                           // la huella: la floracion seca se queda en el papel de la tierra; el mar vuelve a quedar limpio
    float inside = smoothstep(1. + 2.5 * wet, -1. - 2.5 * wet, x);
    float open = inside * (.30 + .50 * smoothstep(edge, edge * .1, r)) * vis * (1. - ink);
    float fr = exp(-x * x / (2.2 + 9. * wet)) * vis * (1. - ink);
    float k = (1. - open) * (1. + fr * .95);
    col *= pow(Tr, vec3(k - 1.));
    float wm = inside * wet;
    vec2 tl = normalize(uLamp.xy - c + 1e-3);
    float lit = max(dot(dir, tl), 0.);
    col *= 1. - wm * .07;
    col += wm * .035 * uLampCol + exp(-x * x / 2.5) * wet * pow(lit, 5.) * .30 * uLampCol;
  }
  return col;
}`,
  };

  /* CUADERNO: hoja de cuadros, diez rotuladores (vecinos nunca repiten), sangrado en la fibra, margen rojo, flexo y cerco de cafe */
  NUEVAS.cuaderno = {
    luz: { lmpI: 0.5, lmpZ: 900, lmpK: 0.65, canto: 0, sombra: 0, amb: 0.72, ks: 0.6, env: 1, poolK: 0.6 },
    uni: { uCuad: 26, uMarg: 118, uSangra: 1.8, uTrazo: 1.8, uCafe: 1, uPant: 0.55 },
    bake: `
uniform float uCuad, uMarg, uSangra, uTrazo, uCafe;
vec3 mk(int c){
  return c == 0 ? vec3(1., .90, .44) : c == 1 ? vec3(1., .69, .45) : c == 2 ? vec3(.64, .88, .54) : c == 3 ? vec3(.58, .79, 1.) : c == 4 ? vec3(1., .64, .80)
       : c == 5 ? vec3(.80, .71, 1.) : c == 6 ? vec3(.54, .90, .86) : c == 7 ? vec3(1., .58, .55) : c == 8 ? vec3(.85, .95, .47) : vec3(.90, .77, .60);
}
float strokes(vec2 p, float ang, float seed){
  vec2 n = vec2(cos(ang), sin(ang));
  float u = dot(p, n) / 9.5, v = dot(p, vec2(-n.y, n.x));
  float id = floor(u), acc = 0.;
  for (int k = -1; k <= 1; k++) {
    float i = id + float(k), hs = h11(i * 1.37 + seed);
    float c = i + .5 + (hs - .5) * .35 + (vn(vec2(v / 160., i + seed)) - .5) * .5;
    float wdt = .64 + h11(i * 7.1 + seed) * .14;
    float d = abs(u - c);
    acc += smoothstep(wdt + .06, wdt - .06, d) * (.86 + .14 * h11(i * 3.3 + seed));
  }
  return acc;
}
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q;
  vec2 pp = mix(ps, p, step(.5, s.land));
  float fib = vn(pp * vec2(1.6, .45) + 3.) * .5 + vn(pp * vec2(.4, 1.5) + 8.) * .5;
  vec3 paper = vec3(.972, .968, .952) * (.992 + .016 * fib);
  vec2 g = mod(floor(ps) - vec2(uMarg, 7.), uCuad);
  float grid = max(step(g.x, .5), step(g.y, .5));
  vec3 T = mix(vec3(1.), vec3(.74, .82, .93), grid * .62);
  float mx = floor(ps.x) - uMarg;
  float marg = step(abs(mx), .5) + step(abs(mx - 3.), .5) * .55;
  T *= mix(vec3(1.), vec3(.93, .45, .48), clamp(marg, 0., 1.) * .8);
  float e = min(bordDist(p), max(-s.sd, 0.));
  float fibr = vn(pp * vec2(2.2, .55) + 11.) * .6 + vn(pp * vec2(.6, 2.4) + 4.) * .4;
  float bleed = uSangra * (.6 + 2.2 * fibr * fibr);
  // en la franja de sangrado del mar, el color es el del pais mas cercano (la mascara ya lo da a 1,5 px; mas lejos se busca)
  float found = s.land > .5 ? 1. : 0., c10 = s.col10; vec2 qp = p;
  if (s.land <= .5 && s.sd < 4.) {
#ifdef LITE
    const int KD = 4, KJ = 2; const float KA = 1.570796;
#else
    const int KD = 8, KJ = 3; const float KA = .785398;
#endif
    for (int k = 0; k < KD; k++) { float an = float(k) * KA; vec2 dd = vec2(cos(an), sin(an));
      for (int j = 1; j <= KJ; j++) { vec2 c = p + dd * (max(s.sd, 0.) + float(j)); vec4 m = mskAt(c - uPorig);
        if (m.r > .5) { float cb = floor(m.b * 255. + .5); c10 = cb - 16. * floor(cb / 16.); qp = c; found = 1.; break; } }
      if (found > .5) break; }
  }
  int ci = int(c10);
  vec2 pid = paisId(qp);
  float reach = smoothstep(.6, -.6, s.sd - bleed) * found;
  float ang = .55 + pid.x * 2.6 + (vn(p / 520. + 3.) - .5) * .8;
  float st = strokes(p, ang, float(ci) * 13.1 + floor(pid.y * 40.));
  float dens = (.66 + .2 * min(st, 1.) + .55 * max(st - 1., 0.) * uTrazo) * (1. + (fibr - .5) * .08);
  dens += .35 * exp(-max(e, 0.) / 1.8) * uTrazo;
  vec3 ink = pow(mk(ci), vec3(dens));
  T *= mix(vec3(1.), ink, reach);
  if (uCafe > 0.) {
    vec2 cp = vec2(250., uR.y - 128.);
    vec2 dc = ps - cp; float r = length(dc); vec2 dn = dc / max(r, 1e-3);
    float R = 96. + (vn(dn * 2.2 + 5.) - .5) * 7. + (vn(ps / 9.) - .5) * 2.5;
    float x = r - R;
    float ring = exp(-x * x / 5.5) * smoothstep(-.1, .45, vn(dn * 1.4 + 2.)) + exp(-pow(r - R + 9., 2.) / 30.) * .25;
    float veil = smoothstep(1.5, -3., x) * (.20 + .12 * vn(ps / 40.));
    float sp = smoothstep(9., 6.5, length(ps - cp - vec2(118., -58.))) + smoothstep(4., 2., length(ps - cp - vec2(132., -82.)));
    float cof = clamp(ring * .9 + veil + sp * .55, 0., 1.) * uCafe * (1. - s.land);
    T *= mix(vec3(1.), vec3(.66, .47, .30), cof);
  }
  float lb = clamp(1.0 - bordDist(p), 0., 1.) * s.land;
  lb = max(lb, s.border * s.land);
  float lc = smoothstep(1.45, .45, abs(s.sd + .3));
  float line = max(lb * .9, lc);
  alb = paper * T;
  alb = mix(alb, vec3(.11, .12, .2), line * (.86 + .1 * vn(pp / 30.)));
  h = fib * .08 + line * .05 + reach * .03;
  mat = vec3(mix(.85, .6, line), 0., 0.);
}`,
    vivo: `
uniform float uPant;
vec3 mesaVivo(MS s, vec3 col){
  float R = uLamp.z * .9, pen = uLamp.z * .42;
  float d = length(s.q - uLamp.xy);
  float lit = smoothstep(R + pen, R - pen * .6, d);
  return col * mix(1. - uPant * .42, 1., lit);
}`,
  };

  /* LAS VEGAS: neon de verdad. Costas de tubo de vidrio (cristal, filamento, halo que ilumina la pared negra); fronteras, tubos finos rosas.
     Se enciende parpadeando al poner la mesa y en el premio; el clic manda un pulso por los tubos; algun tramo viejo titila de vez en cuando */
  NUEVAS.vegas = {
    luz: { lmpI: 0.3, lmpZ: 700, lmpK: 0.55, canto: 0, sombra: 0, amb: 0.06, ks: 1, env: 1, poolK: 0.75 },
    uni: { uPared: [0.042, 0.04, 0.05], uCostaC: [0x3f / 255, 0xe9 / 255, 1], uFronC: [1, 0x4f / 255, 0xcf / 255], uRad: 3.4, uHalo: 1.6, uBri: 1.3 },
    neon: true,
    bake: `
uniform vec3 uPared;
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q;
  vec2 pp = mix(ps, p, step(.5, s.land));
  float pl = fbm3(pp / 3.5) * .5 + vn(pp / 14.) * .5;
  float man = fbm(ps / 340. + 2.);
  vec3 sea = uPared * (.85 + .3 * man);
  vec3 tints[7] = ${T7([[.070, .062, .110], [.082, .058, .098], [.060, .070, .105], [.078, .066, .096], [.064, .064, .118], [.074, .060, .104], [.066, .068, .112]])};
  vec3 land = tints[int(clamp(s.cls, 0., 6.))] * (.9 + .2 * man);
  alb = mix(sea, land, s.land);
  h = pl * .35;
  mat = vec3(.95, 0., 0.);
}`,
    huella: `void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){}`,
    vivo: `
uniform vec3 uCostaC, uFronC; uniform float uRad, uHalo, uBri, uEncT, uSurge, uTicSeg, uTicT;
uniform float uPulsos[16];
float encendido(float seg){
  if (uEncT > 4.) return 1.;
  float tt = uEncT - seg * .65;
  if (tt < 0.) return 0.;
  if (tt > .7) return 1.;
  float slot = floor(tt * 15.);
  float pOn = smoothstep(.0, .6, tt);
  return step(h21(vec2(seg * 91.7, slot)), pOn) * (.55 + .45 * h21(vec2(slot, seg * 13.)));
}
vec3 tubo(vec3 col, vec2 p, float d, float r, vec2 n2, vec3 C, float on, float k){
  float x = d / r;
  float cov = clamp((1. - x) * r + .5, 0., 1.);
  if (cov <= 0.) return col;
  float nz = sqrt(max(1. - x * x, 0.));
  vec3 N = normalize(vec3(n2 * x, nz + .05));
  vec3 L = normalize(vec3(uLamp.xy - p, uLamp.z)), Hh = normalize(L + vec3(0, 0, 1));
  float sp = pow(max(dot(N, Hh), 0.), 70.);
  float fres = pow(x, 6.);
  vec3 glass = mix(col, vec3(.30, .32, .36) + C * .06, .55) + fres * .10 + sp * uLampCol * .9;
  float core = exp(-x * x / .09);
  vec3 em = C * (.75 + .55 * nz) + mix(C, vec3(1.), .7) * core * 1.25;
  vec3 lit = em * uBri * k + sp * uLampCol * .35;
  vec3 tc = mix(glass, lit, on);
  return mix(col, tc, cov);
}
float bdS(vec2 q){ return bordBlur(q); }
vec3 mesaVivo(MS s, vec3 col){
  vec2 p = s.q;
  float sdS = s.sd, bd = bordDist(s.p), seg = vor(s.p / 230.).z;
  float ax = sdNear(p + vec2(1, 0)) - sdNear(p - vec2(1, 0)), ay = sdNear(p + vec2(0, 1)) - sdNear(p - vec2(0, 1));
  float bx = bdS(p + vec2(1, 0)) - bdS(p - vec2(1, 0)), by = bdS(p + vec2(0, 1)) - bdS(p - vec2(0, 1));
  vec2 gC = normalize(vec2(ax, ay) + 1e-5) * sign(sdS + 1e-4), gB = normalize(vec2(bx, by) + 1e-5);
  float on = encendido(seg);
  if (uTicT >= 0. && uTicT < .4 && abs(seg - uTicSeg) < .006) on *= step(.45, h21(vec2(floor(uTicT * 26.), 3.)));
  float pul = 0.;
  for (int i = 0; i < 4; i++) {
    float a = uPulsos[i * 4 + 2]; if (a < 0.) continue;
    float r = length(p - vec2(uPulsos[i * 4], uPulsos[i * 4 + 1]));
    pul += exp(-pow((r - a * 1500.) / 70., 2.)) * exp(-a * 1.4) * uPulsos[i * 4 + 3];
  }
  float k = 1. + pul * .9 + uSurge * .8;
  vec3 cC = mix(uCostaC, vec3(1.), uSurge * .25 + pul * .2), cF = mix(uFronC, vec3(1.), uSurge * .25 + pul * .2);
  float rC = uRad, rF = uRad * .5;
  // el tubo de la frontera sigue la linea de la mascara (en Europa las fronteras estan tan juntas que la distancia suavizada las funde);
  // el halo, la distancia suavizada
  float dT = bd;
  float dC = abs(sdS), dF = s.land > .5 ? dT : 99., dH = s.land > .5 ? bd : 99.;
  float hx = B(p + vec2(1, 0)).a - B(p - vec2(1, 0)).a, hy = B(p + vec2(0, 1)).a - B(p - vec2(0, 1)).a;
  float relC = clamp(1. + dot(vec2(hx, hy), gC) * 3., .75, 1.3), relF = clamp(1. + dot(vec2(hx, hy), gB) * 3., .75, 1.3);
  vec3 a0 = B(p).rgb;
  float hC = exp(-max(dC - rC, 0.) / 7.) * .55 + exp(-dC / 24.) * .32 + exp(-dC / 62.) * .16;
  float hF = exp(-max(dH - rF, 0.) / 4.) * .45 + exp(-dH / 13.) * .22;
  vec3 glow = (cC * hC * relC + cF * hF * relF * .4) * on * uHalo * k;
  col += glow * (a0 * 5. + .16);
  col = tubo(col, p, dF, rF, gB, cF, on, k * .62);
  col = tubo(col, p, dC, rC, gC, cC, on, k);
  return col;
}`,
  };

  /* PISCINA: agua de verdad sobre azulejo (refraccion, causticas suaves, hondura), ondas del clic y del puntero, chapuzon en el premio */
  NUEVAS.piscina = {
    luz: { lmpI: 0.5, lmpZ: 800, lmpK: 0.5, canto: 0, sombra: 0, amb: 0.72, ks: 0.4, env: 1, poolK: 0.6 },
    uni: { uTile: 44, uRefr: 1.6, uCaus: 1.6, uHondo: 1.3, uOla: 1.7, uVel: 1 },
    agua: true,
    bake: `
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p;
  float po = vn(p / 1.4) * .5 + vn(p / 5.) * .5;
  vec3 tints[7] = ${T7([[.97, .92, .82], [.97, .88, .84], [.92, .93, .84], [.97, .89, .78], [.92, .90, .90], [.95, .91, .86], [.96, .95, .92]])};
  vec3 land = tints[int(clamp(s.cls, 0., 6.))] * (.98 + .03 * po);
  float eb = bordDist(p);
  float lb = max(clamp(.95 - eb, 0., 1.), s.border) * s.land;
  float lc = smoothstep(1.35, .35, abs(s.sd + .3));
  alb = mix(vec3(.2, .6, .7), land, s.land);
  alb = mix(alb, vec3(.07, .19, .29), max(lb * .9, lc * s.land));
  h = po * .05 * s.land;
  mat = vec3(.85, 0., 0.);
}`,
    huella: `void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){}`,
    vivo: `
uniform sampler2D uLN; uniform float uTile, uRefr, uCaus, uHondo, uOla, uVel;
uniform float uOn[48];
vec2 ondas(vec2 p){
  vec2 g = vec2(0.);
  for (int i = 0; i < 12; i++){
    float age = uOn[i * 4 + 2]; if (age < 0.) continue;
    vec2 c = vec2(uOn[i * 4], uOn[i * 4 + 1]); float f = uOn[i * 4 + 3];
    vec2 d = p - c; float r = length(d);
    float R = age * 210., w = 24. + age * 16.;
    float x = r - R; if (abs(x) > w * 3.) continue;
    float env = exp(-x * x / (w * w)) * exp(-age * 1.3) * f / (1. + r / 160.);
    g += d / max(r, 1.) * env * cos(x * .29) * .75;
  }
  return g;
}
vec3 mesaVivo(MS s, vec3 col){
  vec2 p = s.q; float t = uT * uVel;
  if (s.land > .995) return col;
  float am = .65 + .7 * texture(uLN, p / 1700. + t * .002).r;
  vec2 grad = vec2(0.);
  for (int i = 0; i < 4; i++) {
    float fi = float(i), ang = .6 + fi * 1.7, lam = 150. - fi * 27., k = TAU / lam;
    vec2 d = vec2(cos(ang), sin(ang));
    grad += d * cos(dot(d, p) * k - t * (1.1 + fi * .35) + fi * 2.3) * k * 2.3 / (1. + fi * .3);
  }
  grad = grad * am * uOla + ondas(p);
  float sd = max(s.sd, 0.);
  float dep = smoothstep(0., 44., sd) * .75 + .25 * smoothstep(.3, .7, texture(uLN, p / 2600.).r);
  vec2 pf = p + grad * (5. + 20. * dep) * uRefr;
  vec2 gp = pf / uTile; vec2 fr = fract(gp); vec2 id = floor(gp);
  float eg = min(min(fr.x, 1. - fr.x), min(fr.y, 1. - fr.y)) * uTile;
  float junta = smoothstep(1.35, .45, eg);
  float bisel = smoothstep(4.5, 1.6, eg) * (1. - junta);
  vec3 az = vec3(.86, .95, .97) * (.975 + .05 * h21(id + 3.));
  az *= 1. - bisel * .07;
  vec3 floorC = mix(az, vec3(.64, .74, .76), junta);
  vec2 cw = (texture(uLN, pf / 900. + t * .004).rg - .5) * 1.6;
  vec3 v1 = vor(pf / 88. + cw + vec2(t * .12, t * .05));
  vec3 v2 = vor(pf / 67. - cw * .8 + vec2(-t * .07, t * .10) + 5.);
  float c1 = 1. - smoothstep(0., .16 + .22 * dep, v1.y - v1.x), c2 = 1. - smoothstep(0., .16 + .22 * dep, v2.y - v2.x);
  float caus = (c1 * c1 + c2 * c2) * .5;
  vec2 l2 = normalize(uLamp.xy - pf + 1e-3);
  float so = Soft(pf + l2 * (5. + 18. * dep));
  float dl = length(p - uLamp.xy);
  float fall = uLampI * mix(1., pow(clamp(1. - dl / (uR.x * .82), 0., 1.), 1.6), uPoolK), E = uAmb * .85 + fall;
  vec3 lit = floorC * (uAmb * .85 + fall * uLampCol) * (1. + caus * uCaus * .30 * (1. - so)) * (1. - so * .18);
  float m = (.75 + dep * 1.55) * uHondo;
  vec3 tr = exp(-vec3(1.05, .30, .17) * m);
  vec3 water = lit * tr + vec3(.03, .23, .33) * (1. - tr.g) * E * .9;
  vec3 N = normalize(vec3(-grad * .9, 1.));
  vec3 Ld = normalize(vec3(uLamp.x - p.x, p.y - uLamp.y, uLamp.z)), Hh = normalize(Ld + vec3(0, 0, 1));
  float nh = max(dot(N, Hh), 0.); float sp = pow(nh, 500.) * .9 + pow(nh, 40.) * .04;
  water += sp * uLampCol * uLampI;
  water *= mix(.72, 1., smoothstep(.4, 3., s.sd));
  return mix(water, col, s.land);
}`,
  };

  /* ---------------------------------------------------------------- EL REWORK DE 7 MESAS DE HOY (probador: fx/mesr-*.js, preset Extrema)
     Casino, Sala privada, Medianoche, Expedicion, Marmol negro, Banquisa y Jade, a la calidad de las 11 nuevas. La clase del pais sale de la
     mascara del juego (exacta por poligono): el clsIn() de la maqueta, que arreglaba la orla de otro color en la costa de mapa-datos, aqui no
     hace falta. Las paletas de cinco clases se extienden a las siete del juego sin que dos vecinos repitan color (clase 0: dos tonos al azar) */
  const K7 = `float k7(float c, float r){ return c < .5 ? (r < .5 ? 0. : 6.) : c < 5.5 ? c : 0.; }
`;
  /* pelo de pano (mesa-pano): fibras cortas en una direccion, a 1:1 */
  const PELO = `float napF(vec2 p){ return vn(vec2(p.x * .9, p.y * 2.6)) * .55 + vn(p * vec2(2.3, .7) + 17.) * .3 + h21(floor(p)) * .15; }
`;
  const HUELLA_PANO = `
void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){
  float r = length(d), disc = smoothstep(21.5, 19.5, r), rim = exp(-pow((r - 20.5) / 1.4, 2.));
  float fib = vn(vec2(d.y * .9, d.x * 2.6) + 5.);
  float felt = 1. - mat.g;
  alb = mix(alb, alb * (1.16 + .08 * fib), disc * felt);
  h -= disc * .03 * felt + rim * .14;
  mat.r = mix(mat.r, mat.r * .7, disc * felt);
}`;
  const BARR_PANO = tint => `
vec3 mesaBarrido(MS s, float b, vec2 q, vec3 col){
  float nap = vn(vec2(s.q.x * .9, s.q.y * 2.6));
  return col + b * gLc * (gAlb * (.45 + .35 * nap) * (1. - gMat.g) + gMat.g * ${tint} * 1.5);
}`;
  const LUZ_R = o => Object.assign({ lmpI: 1.05, lmpZ: 820, lmpK: 0.55, canto: 2.2, sombra: 1, amb: 0.32, ks: 1, env: 1, poolK: 1, abs: true }, o);

  /* CASINO: pano turquesa con pelo y un dibujo de moqueta tejido tono sobre tono; paises de pano pastel, costa de tinta violeta */
  NUEVAS.casino = {
    luz: LUZ_R({ lmpI: 1.15 }), seaFar: 16,
    uni: { uSea: [0x11 / 255, 0x70 / 255, 0x6c / 255], uPelo: 1.35, uMoq: 0.8 },
    bake: PELO + K7 + `
uniform vec3 uSea; uniform float uPelo, uMoq;
float moqueta(vec2 p){
  const float PER = 44.;
  vec2 q = rot2(.7853982) * p / PER, f = fract(q) - .5;
  float r = length(f) * PER, a = atan(f.y, f.x);
  float petal = smoothstep(1.1, .25, abs(r - (6.4 + 2.6 * cos(4. * a))));
  float boton = smoothstep(2.0, 1.2, r);
  vec2 g = abs(f) - .5; float pt = smoothstep(1.7, .9, length(g) * PER);
  vec2 m = abs(f) - vec2(.5, 0.), m2 = abs(f) - vec2(0., .5);
  float sem = smoothstep(1.2, .5, min(length(m), length(m2)) * PER);
  return clamp(petal + boton + pt * .8 + sem * .5, 0., 1.);
}
vec3 pastel(float k){
  return k < .5 ? vec3(.96, .90, .78) : k < 1.5 ? vec3(1., .85, .66) : k < 2.5 ? vec3(.98, .77, .77) : k < 3.5 ? vec3(.79, .91, .76)
       : k < 4.5 ? vec3(.75, .88, 1.) : k < 5.5 ? vec3(.95, .84, 1.) : vec3(1., .97, .90);
}
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q, pp = mix(ps, p, step(.5, s.land));
  float nap = napF(pp), big = fbm3(ps / 260.);
  float mq = moqueta(ps) * uMoq * smoothstep(4., 14., s.sd);               // el dibujo se apaga junto a la costa: nunca toca la tierra ni dibuja islas
  vec3 sea = uSea * (.88 + .12 * big) * (.94 + .1 * nap * uPelo);
  sea = mix(sea, sea * 1.17 + vec3(.004, .014, .012), mq * .55);
  vec2 id = paisId(p);
  vec3 landc = pastel(k7(s.cls, id.x)) * (.965 + .05 * id.y) * (.9 + .1 * nap * uPelo);
  alb = mix(sea, landc, s.land);
  float cw = smoothstep(2.3, .9, abs(s.sd + .5));
  vec3 ink = vec3(.10, .07, .16);
  alb = mix(alb, ink, cw * .92);
  alb = mix(alb, ink, bordAA(p) * .82 * s.land);
  h = nap * .12 * uPelo + big * .05 + mq * .05 - cw * .05 - s.border * .15;
  mat = vec3(mix(.93, .8, cw), 0., 0.);
}`,
    huella: HUELLA_PANO, barrido: BARR_PANO("vec3(.9, .8, 1.)"),
  };

  /* SALA PRIVADA: pano granate de bacara con terciopelo aplastado y el filete de oro en la costa; paises de pano crema */
  NUEVAS.granate = {
    luz: LUZ_R({ lmpI: 1.15 }), seaFar: 12,
    uni: { uSea: [0x6a / 255, 0x1a / 255, 0x28 / 255], uPelo: 1.4, uOro: 1 },
    bake: PELO + K7 + `
uniform vec3 uSea; uniform float uPelo, uOro;
vec3 crema(float k){
  return k < .5 ? vec3(.97, .93, .84) : k < 1.5 ? vec3(.89, .80, .60) : k < 2.5 ? vec3(.96, .82, .77) : k < 3.5 ? vec3(.86, .86, .72)
       : k < 4.5 ? vec3(.86, .83, .79) : k < 5.5 ? vec3(.94, .86, .66) : vec3(.99, .97, .92);
}
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q, pp = mix(ps, p, step(.5, s.land));
  float nap = napF(pp), big = fbm3(ps / 260.);
  float crush = smoothstep(.45, .8, fbm(ps / 420. + 3.));                 // terciopelo aplastado, sin bordes
  vec3 sea = uSea * (.86 + .14 * big) * (.93 + .12 * nap * uPelo) * (1. - .16 * crush);
  vec2 id = paisId(p);
  vec3 landc = crema(k7(s.cls, id.x)) * (.965 + .05 * id.y) * (.9 + .1 * nap * uPelo);
  alb = mix(sea, landc, s.land);
  float fil = smoothstep(2.1, .7, abs(s.sd - .1)) * uOro;
  float ink = smoothstep(1.0, .3, abs(s.sd + 2.2)) * s.land;
  alb = mix(alb, vec3(.30, .07, .09), ink * .7);
  alb = mix(alb, vec3(.93, .71, .35) * (.92 + .1 * nap), fil * .92);
  alb = mix(alb, vec3(.20, .05, .07), bordAA(p) * .82 * s.land);
  h = nap * .12 * uPelo * (1. - .5 * crush) + big * .05 + fil * .25 - s.border * .15;
  mat = vec3(mix(.92 - crush * .2, .5, fil), fil * .95, 0.);
}`,
    huella: HUELLA_PANO, barrido: BARR_PANO("vec3(1., .78, .42)"),
  };

  /* MEDIANOCHE: pano azul noche y paises de plata maciza (de ley, pavonada, rosada, platino, vieja), bisel, ranuras y martillado */
  NUEVAS.medianoche = {
    luz: LUZ_R({ lmpI: 1.0, lmpK: 0.35, canto: 2.6, amb: 0.30, env: 1.6, ks: 0.6 }), seaFar: 12,
    uni: { uSea: [0x16 / 255, 0x24 / 255, 0x4f / 255], uBisel: 1.5, uMart: 0.6 },
    bake: PELO + K7 + `
uniform vec3 uSea; uniform float uBisel, uMart;
vec3 plata(float k){
  return k < .5 ? vec3(.93, .93, .95) : k < 1.5 ? vec3(.74, .80, .92) : k < 2.5 ? vec3(.90, .84, .93) : k < 3.5 ? vec3(.82, .88, .90)
       : k < 4.5 ? vec3(.86, .84, .80) : k < 5.5 ? vec3(.80, .84, .86) : vec3(.96, .96, .97);
}
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q;
  float nap = napF(ps);
  vec3 felt = uSea * (.84 + .3 * nap) * (.9 + .16 * fbm(ps / 300.));
  vec3 v = vor(p / 6.);
  float ham = smoothstep(0., .6, v.x) * uMart;
  float b = bordAA(p);
  float bev = smoothstep(0., -4.5 * uBisel, s.sd);
  float bevB = smoothstep(0., 2.5, bordDist(p) - .5);
  vec2 id = paisId(p);
  alb = mix(felt, plata(k7(s.cls, id.x)) * (.97 + .02 * v.z + .04 * id.y), s.land);
  alb = mix(alb, vec3(.05, .06, .10), b * s.land * .85);
  h = s.land * (sqrt(bev) * min(1., .35 + .65 * bevB) * .9 + ham * .015) + (1. - s.land) * nap * .012;
  mat = vec3(mix(.93, .32, s.land), s.land * (1. - b * .7), 0.);
}`,
    huella: `
void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){
  float r = length(d), disc = smoothstep(21.5, 19.5, r), rim = exp(-pow((r - 20.5) / 1.4, 2.));
  float fib = vn(vec2(d.y * .9, d.x * 2.6) + 5.);
  alb = mix(alb, alb * (1.45 + .3 * fib) + .004, disc * (1. - mat.g));
  mat.r = mix(mat.r, mat.r * .65, disc * (1. - mat.g));
  h -= rim * (.04 + .10 * mat.g);
  mat.r = mix(mat.r, mix(.45, .16, smoothstep(0., 6., age)), disc * mat.g);
}`,
    barrido: `
vec3 mesaBarrido(MS s, float b, vec2 q, vec3 col){
  float edge = clamp(1. - gN.z, 0., 1.) * 8.;
  return col + b * gLc * gMat.g * gAlb * vec3(.95, .98, 1.08) * (.5 + edge * .8);
}`,
  };

  /* EXPEDICION: el atlas de papel como un libro: fibra y ondulacion, tinta de imprenta, el lomo a la izquierda y el canto de las paginas */
  NUEVAS.expedicion = {
    luz: LUZ_R({ canto: 0, sombra: 0, amb: 0.38, ks: 0.6 }), seaFar: 12,
    uni: { uFibra: 1.3, uOnda: 1.5, uTinta: 1.05 },
    bake: K7 + `
uniform float uFibra, uOnda, uTinta;
vec3 tintaPais(float k){
  return k < .5 ? vec3(.94, .89, .78) : k < 1.5 ? vec3(.90, .83, .66) : k < 2.5 ? vec3(.84, .86, .71) : k < 3.5 ? vec3(.92, .77, .65)
       : k < 4.5 ? vec3(.86, .80, .72) : k < 5.5 ? vec3(.80, .85, .77) : vec3(.96, .93, .87);
}
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q;                                                   // el papel va quieto en pantalla (la fibra no crece con el zoom)
  float fib = vn(ps * vec2(1.7, .42) + 3.) * .5 + vn(ps * vec2(.45, 1.6) + 8.) * .35 + h21(floor(ps)) * .15;
  float mota = step(.9993, h21(floor(ps / 2.) + 5.)) * .5;
  float onda = fbm3(ps / 520.) * .7 + fbm3(ps / 180. + 4.) * .3;
  vec3 paper = vec3(.955, .925, .855) * (.985 + .03 * (fib - .5) * uFibra) * (1. - mota * .12) * (.97 + .04 * onda);
  vec3 inkSea = vec3(.23, .47, .56) * (.96 + .06 * fbm3(ps / 600.));
  inkSea = mix(vec3(1.), inkSea, uTinta * (.95 + .07 * (fib - .5)));
  vec2 id = paisId(p);
  vec3 inkLand = tintaPais(k7(s.cls, id.x)) / vec3(.955, .925, .855);
  inkLand = mix(vec3(1.), inkLand * (.985 + .03 * id.y), uTinta);
  vec3 T = mix(inkSea, inkLand, s.land);
  float coast = smoothstep(1.9, .6, abs(s.sd + .9));
  float bord = bordAA(p) * s.land;
  T *= mix(vec3(1.), vec3(.17, .24, .29), coast * .95);
  T *= mix(vec3(1.), vec3(.30, .34, .37), bord * .8);
  alb = paper * T;
  float gut = 1. - smoothstep(0., 90., ps.x);
  alb *= 1. - .30 * gut * gut;
  float eR = uR.x - ps.x, eB = uR.y - ps.y, canto = 0.;
  if (eR < 9. || eB < 7.) {
    float k = eR < 9. ? eR : eB;
    float hoja = mod(floor(k), 2.);
    vec3 ed = vec3(.90, .87, .79) * (.86 + .1 * hoja) * (.93 + .07 * vn(vec2(ps.x + ps.y, k) * vec2(.05, 1.)));
    float sombra = exp(-(eR < 9. ? 9. - eR : 7. - eB) / 2.);
    alb = ed * (1. - .35 * sombra);
    canto = 1.;
  }
  h = (fib - .5) * .02 * uFibra + onda * .22 * uOnda + gut * .12 - canto * .25 - coast * .01;
  mat = vec3(mix(.86, .62, (1. - s.land) * uTinta), 0., (1. - s.land) * .08 * uTinta);
}`,
    huella: `
void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){
  float r = length(d), rim = exp(-pow((r - 20.5) / 1.3, 2.)), disc = smoothstep(21., 19., r);
  h -= rim * .10 + disc * .015; alb *= 1. - rim * .05;
}`,
    barrido: `
vec3 mesaBarrido(MS s, float b, vec2 q, vec3 col){ return col + b * gLc * (gAlb * .32 * (.7 + .6 * clamp(gN.x * 6. + .5, 0., 1.)) + gMat.b * .5); }`,
  };

  /* MARMOL NEGRO: marmol negro pulido con vetas finas de oro viejo lejos de la costa, paises de marfil con su veta y bisel */
  NUEVAS.nero = {
    luz: LUZ_R({ canto: 1.6, sombra: 0.8, amb: 0.34 }), seaFar: 46,
    uni: { uVeta: 1.2, uPulido: 0.35, uEspejo: 1 },
    bake: K7 + `
uniform float uVeta, uPulido;
vec3 marfil(float k){
  return k < .5 ? vec3(.93, .89, .80) : k < 1.5 ? vec3(.86, .79, .63) : k < 2.5 ? vec3(.93, .85, .77) : k < 3.5 ? vec3(.84, .82, .73)
       : k < 4.5 ? vec3(.89, .86, .79) : k < 5.5 ? vec3(.91, .84, .64) : vec3(.97, .95, .90);
}
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q;
  float nb = nubeMarmol(ps);
  vec3 sea = vec3(.034, .032, .036) * (.86 + .3 * nb);
  float vv = vetaMarmol(ps * .8 + 300.), v2 = pow(1. - abs(sin(fbm(ps / 180. + 9.) * 7.)), 40.);
  float lejos = smoothstep(18., 44., s.sd);                               // a menos de 44 px de la costa no hay vetas
  float veta = clamp(vv * .9 + v2 * .45, 0., 1.) * lejos * uVeta;
  sea = mix(sea, vec3(.42, .34, .21) * (.7 + .5 * fbm(ps / 40.)), veta * .55);
  sea = mix(sea, vec3(.16, .15, .15), smoothstep(.55, 1., fbm(ps / 70. + 2.)) * .18 * lejos * uVeta);
  vec2 id = paisId(p);
  vec2 q = rot2(id.x * 6.283) * (p + id * 900.);
  float grain = vn(vec2(q.x * .015, q.y * .32 + fbm(q / 90.) * 6.)) - .5;
  vec3 iv = marfil(k7(s.cls, id.x)) * (.97 + .045 * id.y) * (1. + .014 * grain) * (.97 + .05 * fbm(p / 60.));
  float bev = smoothstep(0., -3.5, s.sd);
  float b = bordAA(p);
  alb = mix(sea, iv, s.land);
  float junta = smoothstep(1.9, .6, abs(s.sd + .9));
  alb = mix(alb, vec3(.12, .09, .06), max(b * s.land * .85, junta * .6));
  h = s.land * (sqrt(bev) * .55 + grain * .01) - b * s.land * .08;
  mat = vec3(mix(.05, .32, s.land), 0., mix(uPulido, .22, s.land));
}`,
    vivo: `
uniform float uEspejo;
vec3 mesaVivo(MS s, vec3 col){
  vec2 d = s.q - gLp.xy - vec2(0., 40.);
  float st = exp(-d.x * d.x / (2. * 260. * 260.) - d.y * d.y / (2. * 200. * 200.));
  vec3 lc = gLc / max(.001, gFall) * min(gFall, 1.3);
  return col + (1. - s.land) * gMat.b * uEspejo * uBrillo * lc * st * .07;
}`,
    huella: `
void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){
  float a = atan(d.y, d.x), r = length(d);
  float rr = 22.5 + 1.2 * vn(vec2(a * 3., 2.)), ring = exp(-pow((r - rr) / 1.5, 2.));
  float k = ring * .9 + smoothstep(rr, rr - 6., r) * .2;
  mat.b *= 1. - k * .9; mat.r = mix(mat.r, .5, k); h -= ring * .03;
  alb = mix(alb, alb + .02, k * (1. - s.land));
}`,
    barrido: `
vec3 mesaBarrido(MS s, float b, vec2 q, vec3 col){
  float sharp = pow(clamp(b / 1.4, 0., 1.), 8.) * .5 * b + b * .04;
  float oro = smoothstep(.06, .2, gAlb.r - gAlb.b) * (1. - s.land);
  return col + gLc * (sharp * gMat.b * (1. - s.land) + b * oro * vec3(1., .78, .4) * 1.4 + b * s.land * gAlb * .22);
}`,
  };

  /* BANQUISA: agua azul honda con la plataforma turquesa pegada a la costa; placas de hielo translucidas con aire atrapado y grietas finas */
  NUEVAS.hielo = {
    luz: LUZ_R({ lmpK: 0.3, canto: 2.4, sombra: 0.9, amb: 0.34 }), seaFar: 12,
    uni: { uGrieta: 1.15, uTransl: 1 },
    bake: K7 + `
uniform float uGrieta, uTransl;
vec3 tinte(float k){
  return k < .5 ? vec3(.95, .97, .99) : k < 1.5 ? vec3(.88, .93, .97) : k < 2.5 ? vec3(.93, .92, .98) : k < 3.5 ? vec3(.88, .95, .93)
       : k < 4.5 ? vec3(.97, .95, .91) : k < 5.5 ? vec3(.90, .93, .99) : vec3(.98, .99, 1.);
}
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q;
  float dep = smoothstep(0., 6., s.sd);
  vec3 sea = mix(vec3(.22, .52, .64), vec3(.06, .19, .31), pow(dep, .7)) * (.94 + .08 * fbm3(ps / 420.));
  float th = smoothstep(0., 16., -s.sd);
  vec2 id = paisId(p);
  vec3 nieve = tinte(k7(s.cls, id.x)) * (.955 + .04 * id.y);
  vec3 fino = vec3(.55, .82, .90);
  vec3 ice = mix(fino, nieve, mix(1., th, uTransl));
  float nub = fbm(p / 70. + id * 50.);
  ice = mix(ice, ice * vec3(.80, .91, .99), smoothstep(.38, .78, nub) * .75 * uTransl * th);
  ice = mix(ice, vec3(.99, 1., 1.), smoothstep(.62, .85, fbm(p / 26. + id * 90.)) * .35 * th);
  vec2 w = p + (vec2(fbm(p / 160.), fbm(p / 160. + 7.)) - .5) * 70.;
  vec3 v1 = vor((w + id * 400.) / 95.);
  float e1 = (v1.y - v1.x) * 95.;
  float rota = step(.42, h21(vec2(floor(v1.z * 211.), id.x * 31.)));
  float g1 = smoothstep(1.1, .25, e1) * rota * (.55 + .45 * vn(w / 30.));
  vec3 v2 = vor((w + 50.) / 34.);
  float g2 = smoothstep(.8, .15, (v2.y - v2.x) * 34.) * step(.78, h21(vec2(floor(v2.z * 173.), 3.))) * .5;
  float dentro = smoothstep(4., 9., -s.sd);
  float gr = clamp(g1 + g2, 0., 1.) * dentro * uGrieta;                   // grietas solo en el hielo, nunca en el agua
  ice = mix(ice, vec3(.50, .74, .86), gr * .62);
  alb = mix(sea, ice, s.land);
  float b = bordAA(p);
  alb = mix(alb, vec3(.12, .22, .36), b * s.land * .85);
  float coast = smoothstep(1.9, .6, abs(s.sd + .9));
  alb = mix(alb, vec3(.14, .30, .44), coast * .55);
  float bev = smoothstep(0., -5., s.sd);
  h = s.land * (sqrt(bev) * .6 - gr * .06 + nub * .02) - b * s.land * .1;
  mat = vec3(mix(.12, .2 + .2 * th, s.land), 0., mix(.3, .2 - .1 * th, s.land));
}`,
    huella: `
void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){
  float r = length(d), disc = smoothstep(21., 18., r), rim = exp(-pow((r - 20.) / 1.5, 2.));
  alb = mix(alb, alb * vec3(.82, .92, 1.), disc * s.land * .8);
  mat.b = mix(mat.b, .6, disc * s.land); mat.r = mix(mat.r, .08, disc * s.land);
  h -= rim * .06 + disc * .02 * s.land;
}`,
    barrido: `
vec3 mesaBarrido(MS s, float b, vec2 q, vec3 col){
  float fino = s.land * (1. - smoothstep(0., 16., -s.sd));
  return col + b * gLc * (gAlb * .28 * s.land + fino * vec3(.30, .75, .95) * .55 + (1. - s.land) * gMat.b * .25);
}`,
  };

  /* JADE: losa de jade verde con nubes en tres capas y la luz que entra en la piedra; paises de jade blanco tallado */
  NUEVAS.jade = {
    luz: LUZ_R({ canto: 2.2, sombra: 0.85, amb: 0.34 }), seaFar: 42,
    uni: { uNube: 1.2, uPulido: 1, uFondo: 1.25 },
    bake: K7 + `
uniform float uNube, uPulido;
vec3 jadeB(float k){
  return k < .5 ? vec3(.94, .92, .84) : k < 1.5 ? vec3(.88, .85, .71) : k < 2.5 ? vec3(.93, .89, .81) : k < 3.5 ? vec3(.86, .88, .79)
       : k < 4.5 ? vec3(.90, .89, .83) : k < 5.5 ? vec3(.91, .86, .66) : vec3(.97, .96, .91);
}
void mesaBake(MS s, out vec3 alb, out float h, out vec3 mat){
  vec2 p = s.p, ps = s.q;
  float n1 = fbm(ps / 380.), n2 = fbm(ps / 130. + 5. + n1 * 1.5), n3 = fbm(ps / 48. + 11. + n2);
  vec3 hondo = vec3(.05, .19, .13), medio = vec3(.15, .37, .26), claro = vec3(.36, .58, .42), leche = vec3(.62, .76, .62);
  vec3 sea = mix(hondo, medio, smoothstep(.2, .7, n1));
  sea = mix(sea, claro, smoothstep(.48, .8, n2) * .65 * uNube);
  sea = mix(sea, leche, smoothstep(.62, .9, n2 * .6 + n3 * .5) * .35 * uNube);
  sea = mix(sea, hondo * .8, smoothstep(.55, .85, n3) * smoothstep(.5, .3, n2) * .35 * uNube);
  float mota = smoothstep(.82, .9, fbm(ps / 22. + 40.)) * smoothstep(20., 40., s.sd);
  sea = mix(sea, vec3(.04, .12, .08), mota * .4 * uNube);
  vec2 id = paisId(p);
  float nb = fbm((p + id * 600.) / 80.);
  vec3 jb = jadeB(k7(s.cls, id.x)) * (.965 + .04 * id.y) * (.95 + .07 * nb);
  float b = bordAA(p);
  alb = mix(sea, jb, s.land);
  alb = mix(alb, vec3(.06, .16, .11), max(b * s.land * .85, smoothstep(1.9, .6, abs(s.sd + .9)) * .6));
  float bev = smoothstep(0., -5.5, s.sd);
  h = s.land * (sqrt(bev) * .75 + nb * .02) - b * s.land * .1 + (1. - s.land) * n3 * .004;
  mat = vec3(mix(.04, .22, s.land), 0., mix(uPulido * .45, .25, s.land));
}`,
    vivo: `
uniform float uFondo;
vec3 mesaVivo(MS s, vec3 col){
  vec2 d = s.q - gLp.xy; float r2 = dot(d, d);
  float k = .55 + .45 * exp(-r2 / (2. * 1100. * 1100.));
  vec3 lc = gLc / max(.001, gFall) * min(gFall, 1.);
  return col + (1. - s.land) * uFondo * k * lc * gAlb * vec3(.75, 1., .85) * .16;
}`,
    huella: `
void mesaHuella(MS s, vec2 d, float age, inout vec3 alb, inout float h, inout vec3 mat){
  float r = length(d), rim = exp(-pow((r - 21.) / 1.6, 2.)), disc = smoothstep(22., 18., r);
  float k = disc * .5 + rim * .5;
  mat.b *= 1. - k * .8; mat.r = mix(mat.r, .45, k); h -= rim * .03;
  alb = mix(alb, alb * 1.06 + .01, k * (1. - s.land));
}`,
    barrido: `
vec3 mesaBarrido(MS s, float b, vec2 q, vec3 col){
  float edge = clamp(1. - gN.z, 0., 1.) * 6.;
  return col + b * gLc * ((1. - s.land) * (gAlb * vec3(.7, 1.3, .9) * .9 + gMat.b * .12) + s.land * gAlb * (.18 + edge * .3));
}`,
  };

  /* ruido periodico de la piscina (512 px, se repite sin costura), una vez por contexto */
  const NOISE_FS = `#version 300 es
precision highp float; out vec4 o;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float ph(vec2 i, float per, float sd){ i = mod(i, per); return h21(i + sd * 17.13); }
float pvn(vec2 p, float per, float sd){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(ph(i, per, sd), ph(i + vec2(1, 0), per, sd), u.x), mix(ph(i + vec2(0, 1), per, sd), ph(i + vec2(1, 1), per, sd), u.x), u.y); }
float pfbm(vec2 uv, float per, float sd){ float s = 0., a = .5; for (int k = 0; k < 5; k++) { s += a * pvn(uv * per, per, sd + float(k) * 3.1); per *= 2.; a *= .5; } return s / .97; }
void main(){ vec2 uv = gl_FragCoord.xy / 512.; o = vec4(pfbm(uv, 4., 1.), pfbm(uv, 4., 7.), pfbm(uv, 8., 13.), pfbm(uv, 16., 29.)); }`;

  /* ---------------------------------------------------------------- utilidades */
  /* calidez de la lampara: 0 = 5500 K, 1 = bombilla de 2700 K */
  const LAMP_Y = 0.12;
  const kelvin = k => { const w = [1, 0.8, 0.56], c = [0.93, 0.97, 1]; return [w[0] * k + c[0] * (1 - k), w[1] * k + c[1] * (1 - k), w[2] * k + c[2] * (1 - k)].map(v => v * (1 + 0.08 * k)); };
  const idOf = st => { if (!st) return null; if (st._fid !== undefined) return st._fid; for (const k in A.MAPSTYLES) if (A.MAPSTYLES[k] === st) { try { Object.defineProperty(st, "_fid", { value: k, enumerable: false }); } catch (e) { /* congelado */ } return k; } return null; };
  const scr = (map, wx, wy) => { const v = map.viewJ || map.view; return map.toScreen(wx + 6.283185307179586 * Math.round((v.cx - wx) / 6.283185307179586), wy); };
  const reduce = map => map.fxOn === false || document.documentElement.classList.contains("reduce-motion");
  /* lista de eventos (gotas, ondas, pulsos): n huecos de (x, y del mundo, t0, fuerza); vida en s; fija = el ultimo no caduca (la huella de la acuarela) */
  const eventos = (n, vida, fija) => ({ n, vida, fija, list: [], add(wx, wy, f, delay = 0) { this.list.push({ wx, wy, f, t0: performance.now() + delay * 1000 }); if (this.list.length > n) this.list.shift(); },
    vivos(now) { return this.list.some(e => (now - e.t0) / 1000 < this.vida); },
    pack(now, map, out) { out.fill(0); for (let i = 0; i < n; i++) out[i * 4 + 2] = -1000;
      const L = this.list.filter((e, i) => (now - e.t0) / 1000 < this.vida || (this.fija && i === this.list.length - 1));
      L.forEach((e, i) => { const [x, y] = scr(map, e.wx, e.wy); out[i * 4] = x; out[i * 4 + 1] = y; out[i * 4 + 2] = Math.min((now - e.t0) / 1000, this.fija ? 6 : 99); out[i * 4 + 3] = e.f; }); return out; },
    clear() { this.list.length = 0; } });

  /* ---------------------------------------------------------------- el pase en el mapa */
  class MapFirma {
    constructor(map) {
      this.map = map; const gl = this.gl = map.gl; this.P = new Map(); this.T = {}; this.U = new Map();
      this.psc = gl.getExtension("KHR_parallel_shader_compile");
      this.vao = gl.createVertexArray(); this.cur = null; this.gen = 0;
      this.hue = null; this.barr = null;
      this.gotas = eventos(8, 6, true); this.ondas = eventos(12, 4); this.pulsos = eventos(4, 2.5);
      this.neo = { encT0: -1, surge: 0, surgeN: 0, surgeAt: 0, ticSeg: 0, ticT0: -1, ticNext: 0 };
      this.lastMouse = null; this.slow = 0;
      this.arr32 = new Float32Array(32); this.arr48 = new Float32Array(48); this.arr16 = new Float32Array(16);
    }
    prog(key, fs) {
      let P = this.P.get(key); if (P) return P;
      const gl = this.gl, sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
      if (!this.vs) this.vs = sh(gl.VERTEX_SHADER, VS);
      const p = gl.createProgram(), f = sh(gl.FRAGMENT_SHADER, fs); gl.attachShader(p, this.vs); gl.attachShader(p, f); gl.linkProgram(p);
      P = { p, f, ok: 0, key }; this.P.set(key, P); return P;
    }
    ready(P) {
      if (!P) return false; if (P.ok) return P.ok > 0; const gl = this.gl;
      if (this.psc && !gl.getProgramParameter(P.p, this.psc.COMPLETION_STATUS_KHR)) return false;
      if (!gl.getProgramParameter(P.p, gl.LINK_STATUS)) { console.warn("firma:", P.key, gl.getProgramInfoLog(P.p), gl.getShaderInfoLog(P.f)); P.ok = -1; return false; }
      P.ok = 1; return true;
    }
    /* la mesa puesta: se piden sus programas (compilan en paralelo; mientras, la mesa sale como antes) */
    /* el modo ligero (media resolucion en la luz, ruido y busquedas mas cortas): en la Steam Deck, con Calidad «ahorro», si el mapa ya ha
       tenido que bajar su resolucion o si la propia firma tarda mas de 2 ms en la GPU (se mide de vez en cuando) */
    lite() { const map = this.map; return document.documentElement.dataset.dev === "deck" || map.quality === "saver" || (map.rsPerf != null && map.rsPerf < 1) || this.slow >= 1 || !!A.firmaLite; }
    /* segundo escalon (si aun asi va justa): tambien el material de las mesas nuevas a media resolucion */
    half() { return this.slow >= 2 || A.firmaLite === 2; }
    /* la mesa puesta: se piden sus programas (compilan en paralelo; mientras, la mesa sale como antes) */
    prep(st) {
      const id = idOf(st), def = NUEVAS[id] || null, k = def ? id : "hoy", L = this.lite(), sfx = L ? ":L" : "", lt = src => (L ? src.replace("#version 300 es", "#version 300 es\n#define LITE 1") : src);
      const set = { id, def, k, lite: L, soft: [this.prog("softH" + sfx, lt(SOFT_H)), this.prog("softV" + sfx, lt(SOFT_V))],
        bake: this.prog("bake:" + k + sfx, lt(BAKE(def ? def.bake : HOY_BAKE))),
        light: this.prog("light:" + k + sfx, lt(LIGHT(def ? def : { vivo: HOY_VIVO, barrido: HOY_BARR, huella: HOY_HUELLA }))),
        comp: L ? this.prog("comp", COMP) : null,
        noise: def && def.agua ? this.prog("noise", NOISE_FS) : null };
      const changed = !this.cur || this.cur.id !== id;
      if (this.cur && this.okSet(this.cur) && this.cur.id === id) this.prev = this.cur;          // al cambiar de modo, la de antes sigue hasta que la nueva compile
      else this.prev = null;
      this.cur = set; this.key = null;
      if (changed) { this.gotas.clear(); this.ondas.clear(); this.pulsos.clear(); this.barr = null; if (def && def.neon) this.encender(0); }
      return set;
    }
    okSet(c) { return !!c && c.soft.every(p => this.ready(p)) && this.ready(c.bake) && this.ready(c.light) && (!c.noise || this.ready(c.noise)) && (!c.comp || this.ready(c.comp)); }
    use() { const c = this.cur; if (this.okSet(c)) { this.prev = null; return c; } return this.okSet(this.prev) ? this.prev : null; }
    /* hay que repintar: mientras compila y UNA vez mas cuando ya esta lista (si no, una mesa quieta no se repintaria con su firma) */
    pend() { const c = this.cur; if (!c) return false; if (this.okSet(c)) { if (c.drawn) return false; c.drawn = true; return true; } return ![...c.soft, c.bake, c.light, c.noise, c.comp].some(p => p && p.ok < 0); }
    ok() { return !!this.use(); }
    tgt(name, w, h, o = {}) {
      const gl = this.gl; let t = this.T[name]; w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
      if (t && t.w === w && t.h === h) return t;
      if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); }
      gl.activeTexture(gl.TEXTURE15);
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const f = o.nearest ? gl.NEAREST : gl.LINEAR, wr = o.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
      const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return (this.T[name] = { tex, fbo, w, h, fresh: true });
    }
    /* el material: dos texturas en un solo pase (MRT) */
    mrt(w, h, na = "matA", nb = "matB") {
      const gl = this.gl, a = this.tgt(na, w, h), b = this.tgt(nb, w, h), key = "mrt:" + na, m = this.T[key];
      if (!m || m.a !== a.tex || m.b !== b.tex) {
        if (m) gl.deleteFramebuffer(m.fbo);
        const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, a.tex, 0); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, b.tex, 0);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
        this.T[key] = { fbo, a: a.tex, b: b.tex, w: a.w, h: a.h };
      }
      return { fbo: this.T[key].fbo, w: a.w, h: a.h, A: a, B: b };
    }
    draw(P, uni, dst) {
      const gl = this.gl, p = P.p; gl.useProgram(p);
      if (!this.U.has(p)) this.U.set(p, {}); const UC = this.U.get(p);
      const loc = n => (n in UC ? UC[n] : (UC[n] = gl.getUniformLocation(p, n)));
      let unit = 6;
      for (const n in uni) {
        const v = uni[n]; let l = loc(n); if (l == null) { l = loc(n + "[0]"); if (l == null) continue; }
        if (v && (v instanceof WebGLTexture || v.tex)) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v.tex || v); gl.uniform1i(l, unit); unit++; }
        else if (v instanceof Float32Array) gl.uniform1fv(l, v);
        else if (Array.isArray(v)) { if (v.length === 2) gl.uniform2f(l, v[0], v[1]); else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2]); else gl.uniform4f(l, v[0], v[1], v[2], v[3]); }
        else gl.uniform1f(l, +v || 0);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo); gl.viewport(0, 0, dst.w, dst.h); gl.bindVertexArray(this.vao); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    /* scene, msk: objetivos del mapa ({ tex, w, h }); v: la camara. Devuelve el objetivo iluminado o null (sin firma: la escena tal cual) */
    run(scene, msk, brd, v, now, same) {
      if (this.lite() !== !!(this.cur && this.cur.lite)) this.prep(this.map.sk);          // se ha pasado al modo ligero: sus programas compilan aparte
      const c = this.use(); if (!c) return null;
      const gl = this.gl, map = this.map, W = map.W, H = map.H, sw = scene.w, sh = scene.h, red = reduce(map), def = c.def, D = c.lite ? 2 : 1;
      const tw = Math.ceil(sw / D), th = Math.ceil(sh / D), k = tw / W;
      const tq = this.tq || (this.tq = gl.getExtension("EXT_disjoint_timer_query_webgl2") || 0), mide = tq && this.slow < 2 && !this.qPend && (this.gen % 45 === 7);
      if (mide) { this.qPend = gl.createQuery(); gl.beginQuery(tq.TIME_ELAPSED_EXT, this.qPend); }
      const L = def ? def.luz : HOY_LUZ, fm = def ? null : HOY[c.id] || HOY.casino;
      const mod = (a, m) => ((a % m) + m) % m;
      const porig = [mod(Math.round(v.cx * v.s - W / 2), 16384), mod(Math.round(-v.cy * v.s - H / 2), 16384)];
      const T = red ? 1.7 : now / 1000;
      const base = { uR: [W, H], uRes: [tw, th], uK: k, uPorig: porig, uT: T, uMsk: msk, uBrd: brd, uBN: map.T.bN, uBW: map.T.bW };
      gl.disable(gl.BLEND);
      /* con la mesa y el encuadre quietos (barrido, huella, neon o agua sobre un mapa parado) el horneado (tierra suavizada y material) no cambia:
         solo se recompone la luz */
      const key = same ? c.k + "|" + c.lite + "|" + this.half() + "|" + tw + "x" + th : null, hornea = !key || key !== this.key; this.key = key;
      // tierra suavizada
      const sA = this.tgt("sA", tw, th), sB = this.tgt("sB", tw, th);
      if (hornea) {
        this.draw(c.soft[0], Object.assign({}, base, { uStep: k }), sA);
        this.draw(c.soft[1], Object.assign({}, base, { uStep: k, uSrc: sA }), sB);
      }
      base.uSoft = sB;
      // ruido de la piscina (una vez)
      if (c.noise && (!this.T.noise || this.T.noise.fresh)) { const n = this.tgt("noise", 512, 512, { repeat: true }); this.draw(c.noise, {}, n); n.fresh = false; }
      // material: las mesas nuevas, siempre a resolucion completa (su dibujo es el material); las de hoy, a la de la luz (su dibujo es la escena)
      const full = def && !(c.lite && this.half()), bw = full ? sw : tw, bh = full ? sh : th, M = this.mrt(bw, bh);
      const uni = Object.assign({}, def ? def.uni : {});
      if (!def) Object.assign(uni, { uScene: scene, uGtipo: fm.g, uGrano: HOY_LUZ.grano * fm.gr, uSurco: HOY_LUZ.surco, uEmisK: fm.e, uRelS: fm.r[0], uRelL: fm.r[1],
        uMatS: [...fm.s, 0], uMatL: [...fm.l, 0] });
      if (hornea) {
        const bu = Object.assign({}, base, uni, { uRes: [bw, bh], uK: bw / W, uSeaOnly: 0, uSeaFar: 0 });
        if (def) {
          const S = this.mrt(bw, bh, "seaA", "seaB"), sk = c.k + "|" + bw + "x" + bh + "|" + c.lite;
          if (this.seaKey !== sk || S.A.fresh) { this.draw(c.bake, Object.assign({}, bu, { uSeaOnly: 1 }), S); this.seaKey = sk; S.A.fresh = false; }
          Object.assign(bu, { uSeaFar: def.seaFar || 12, uSeaA: S.A, uSeaB: S.B });
        }
        this.draw(c.bake, bu, M);
      }
      // luz
      const lit = this.tgt(c.lite ? "dl" : "lit", tw, th), lc = kelvin(L.lmpK), z = L.lmpZ * H / 1080;
      /* la lampara cuelga arriba, hacia el borde de la mesa (como la de la sala): su disco reflejado cae en el norte, bajo la cabecera, y no
         en el centro, donde se juega. La luz se normaliza en el centro del mapa: ahi, las de hoy salen exactamente como antes */
      const lamp = [W * 0.5, H * LAMP_Y, z];
      /* debajo de la lampara la tierra no se quema: las de hoy salen como antes en el centro (1); las nuevas, a lo sumo como un pais a media
         distancia de la lampara en la maqueta (1,15). Fuera, la caida de la maqueta (y la penumbra de la sala, js/casa.js) */
      const f0 = Math.pow(Math.max(0, 1 - Math.hypot(0, H * (0.55 - LAMP_Y)) / (W * 0.82)), 1.6), fc = L.lmpI * (1 + (f0 - 1) * L.poolK);
      const Lc = L.amb * 0.9 + fc * 0.97 * (0.2126 * lc[0] + 0.7152 * lc[1] + 0.0722 * lc[2]), norm = def ? (def.luz.abs ? 1 : Math.min(1.3, 1.05 / Lc)) : 1 / Lc;   // abs: la maqueta ya llevaba la lampara arriba (el rework de las 7): su luz, tal cual
      const hu = this.hue ? (() => { const [x, y] = scr(map, this.hue.wx, this.hue.wy); return [x, y, red ? 9 : (now - this.hue.t0) / 1000, 1]; })() : [0, 0, 0, 0];
      let ba = [-1, 1, 0, 0];
      if (this.barr && !red) { const b = this.barr, e = (now - b.t0) / 1000 / 1.1, i = Math.floor(e / 1.6); if (i < b.n) ba = [e - i * 1.6, b.n - i, b.a + 0.6 * i, 0]; else this.barr = null; }
      if (red) this.barr = null;
      const lu = Object.assign({}, base, uni, {
        uBake: M.A, uMat: M.B, uLamp: lamp, uLampCol: lc, uLampI: L.lmpI, uCanto: L.canto, uSombra: L.sombra, uKs: L.ks, uAmb: L.amb, uEnv: L.env,
        uNorm: norm, uPoolK: L.poolK, uBrillo: A.firmaBrillo == null ? 1 : A.firmaBrillo, uAniso: L.aniso || [0, 0], uBarrido: ba, uHuella: hu,
      });
      if (def && def.gotas) lu.uGotas = red ? this.arr32.fill(0).map((x, i) => (i % 4 === 2 ? -1000 : 0)) : this.gotas.pack(now, map, this.arr32);
      if (def && def.agua) { lu.uOn = red ? this.arr48.fill(0).map((x, i) => (i % 4 === 2 ? -1000 : 0)) : this.ondas.pack(now, map, this.arr48); lu.uLN = this.T.noise; if (red) lu.uOla = 0; }
      if (def && def.neon) {
        const N = this.neo, et = N.encT0 < 0 ? 0 : (now - N.encT0) / 1000;
        if (N.surgeN && et > 1.2 && !N.surgeAt) { N.surgeAt = now; N.surge = [0, 0.35, 0.7, 1][N.surgeN]; }
        const sg = N.surgeAt ? N.surge * Math.pow(0.25, (now - N.surgeAt) / 1000) : 0;
        const tt = N.ticT0 >= 0 ? (now - N.ticT0) / 1000 : -1;
        Object.assign(lu, { uEncT: red ? 99 : et, uSurge: red ? 0 : sg, uTicSeg: N.ticSeg, uTicT: red || tt > 0.5 ? -1 : tt, uPulsos: red ? this.arr16.fill(0).map((x, i) => (i % 4 === 2 ? -1000 : 0)) : this.pulsos.pack(now, map, this.arr16) });
      }
      this.draw(c.light, lu, lit);
      let out = lit;
      if (c.lite) { out = this.tgt("lit", sw, sh); this.draw(c.comp, { uRes: [sw, sh], uT: T, uBase: def ? M.A : scene, uDelta: lit }, out); }
      if (mide) gl.endQuery(tq.TIME_ELAPSED_EXT);
      if (this.qPend && !mide && gl.getQueryParameter(this.qPend, gl.QUERY_RESULT_AVAILABLE)) {          // la medida de hace unos fotogramas
        const ms = gl.getParameter(tq.GPU_DISJOINT_EXT) ? -1 : gl.getQueryParameter(this.qPend, gl.QUERY_RESULT) / 1e6; gl.deleteQuery(this.qPend); this.qPend = null;
        if (ms >= 0) { (this.qs || (this.qs = [])).push(ms); if (this.qs.length > 5) this.qs.shift();
          if (this.qs.length === 5 && this.qs.slice().sort((a, b) => a - b)[2] > 2) { this.slow++; this.qs = []; } }   // la mediana de cinco medidas por encima de 2 ms: un escalon mas ligero
      }
      gl.activeTexture(gl.TEXTURE0);
      this.gen++;
      return out;
    }
    /* ---- lo que pasa en la mesa */
    clic(wx, wy) {
      const red = reduce(this.map), now = performance.now(), d = this.cur && this.cur.def;
      this.hue = { wx, wy, t0: red ? now - 9000 : now };
      if (red || !d) return;
      if (d.gotas) this.gotas.add(wx, wy, d.gotas * (0.8 + Math.random() * 0.25));
      if (d.agua) this.ondas.add(wx, wy, 1);
      if (d.neon) this.pulsos.add(wx, wy, 1);
    }
    premio(n) {
      if (reduce(this.map)) return;
      n = Math.max(1, Math.min(3, n | 0));
      this.barr = { t0: performance.now(), n, a: -0.5 + Math.random() * 0.4 };
      const d = this.cur && this.cur.def; if (!d) return;
      if (d.neon) this.encender(n);
      if (d.agua) { const m = this.map, [wx, wy] = m._toWorld(m.W * 0.52, m.H * 0.44); this.ondas.add(wx, wy, 1.3 + 0.2 * n); const kk = n === 1 ? 0 : n === 2 ? 2 : 3;
        for (let i = 0; i < kk; i++) { const a = Math.random() * 6.28, r = 150 + Math.random() * 130, [x2, y2] = m._toWorld(m.W * 0.52 + Math.cos(a) * r, m.H * 0.44 + Math.sin(a) * r * 0.75); this.ondas.add(x2, y2, 0.7, 0.2 + i * 0.18); } }
    }
    encender(n) { const N = this.neo; N.encT0 = performance.now(); N.surgeN = n || 0; N.surgeAt = 0; N.surge = 0; N.ticNext = performance.now() + 7000 + Math.random() * 5000;
      if (A.sfx && A.sfx.neon && !reduce(this.map)) try { A.sfx.neon(); } catch (e) { /* sin sonido */ } }
    /* true mientras algo se anima (el mapa repinta); tambien recoge la estela del puntero en la piscina y el titileo del neon */
    anim(now) {
      const map = this.map; if (!this.cur || reduce(map)) return false;
      const d = this.cur.def; let live = false;
      if (this.barr) live = true;
      if (this.hue && now - this.hue.t0 < 700) live = true;
      if (d) {
        if (d.gotas && this.gotas.vivos(now)) live = true;
        if (d.agua) {
          const m = map.mouse; if (m && map.pickEnabled !== undefined) { const l = this.lastMouse; if (!l) this.lastMouse = { x: m.x, y: m.y };
            else { const dd = Math.hypot(m.x - l.x, m.y - l.y); if (dd > 30) { const [wx, wy] = map._toWorld(m.x, m.y); this.ondas.add(wx, wy, Math.min(0.32, 0.12 + dd / 600)); this.lastMouse = { x: m.x, y: m.y }; } } }
          if (this.ondas.vivos(now)) live = true;
        }
        if (d.neon) {
          const N = this.neo; if (N.encT0 >= 0 && now - N.encT0 < 4500) live = true;
          if (N.surgeAt && now - N.surgeAt < 2500) live = true;
          if (this.pulsos.vivos(now)) live = true;
          if (N.encT0 >= 0 && now - N.encT0 > 3000 && now > N.ticNext) { N.ticSeg = Math.random(); N.ticT0 = now; N.ticNext = now + 7000 + Math.random() * 6000; }
          if (N.ticT0 >= 0 && now - N.ticT0 < 520) live = true;
        }
      }
      return live;
    }
  }

  /* los colores del cuaderno: un coloreado de los paises vecinos (10 rotuladores, los vecinos nunca repiten y evitan los de tono parecido) */
  const MK = [[1, .90, .44], [1, .69, .45], [.64, .88, .54], [.58, .79, 1], [1, .64, .80], [.80, .71, 1], [.54, .90, .86], [1, .58, .55], [.85, .95, .47], [.90, .77, .60]];
  const parecido = (a, b) => { const P = MK[a], Q = MK[b]; return Math.max(0, 1 - Math.hypot(P[0] - Q[0], P[1] - Q[1], P[2] - Q[2]) / 0.36); };
  const hs = v => { let x = Math.imul(v, 0x9e3779b1); x ^= x >>> 15; x = Math.imul(x, 0x85ebca77); x ^= x >>> 13; return (x >>> 0) / 4294967296; };
  /* feats: [{ ci, area }], adj: [Set de vecinos] -> Uint8Array con (ci << 4 | color) y otra con el azar de cada pais */
  function colorear(feats, adj) {
    const n = feats.length, col = new Int8Array(n).fill(-1), used = new Float64Array(10);
    const order = feats.map((f, i) => i).sort((a, b) => adj[b].size - adj[a].size || feats[b].area - feats[a].area);
    for (const a of order) {
      let best = 0, bc = 1e9;
      for (let c = 0; c < 10; c++) {
        let cost = used[c] * 1e-6 + hs(a * 31 + c) * 0.02;
        for (const b of adj[a]) { const cb = col[b]; if (cb < 0) continue; if (cb === c) cost += 1000; else cost += parecido(c, cb) * 4; }
        if (cost < bc) { bc = cost; best = c; }
      }
      col[a] = best; used[best] += Math.max(1, feats[a].area);
    }
    const cls = new Uint8Array(n), rnd = new Uint8Array(n);
    for (let i = 0; i < n; i++) { cls[i] = ((feats[i].ci & 15) << 4) | col[i]; rnd[i] = 1 + Math.floor(hs(i * 7 + 3) * 254); }
    return { cls, rnd };
  }

  A.firma = { forMap: map => new MapFirma(map), colorear, HOY, NUEVAS: Object.keys(NUEVAS) };
})(window.AIQ);
