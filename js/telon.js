/* Geolite - EL TELON DE TERCIOPELO (comun: el del jefe y el de la portada a la partida). Paquete del Probador «ver-telon» / «por-telon».
 * Port fiel de la maqueta aprobada (geolite-art-tools/probador/src/fx/ver-telon.js, PROB.telon): los mismos pliegues analiticos (suma de senos
 * con fase irregular, mas hondos cuanto mas recogida esta la tela), el brillo del terciopelo en los cantos, el canto que da la vuelta con su
 * contorno, galon dorado a filas de 3 px con fleco, barra de laton y bambalina, borla de pixel art por codigo, y la fisica (cierra con peso,
 * la parte de abajo se queda atras con un muelle y se balancea al abrir).
 * Diferencia con la maqueta: alli el shader leia la captura de la pantalla; en el juego la pantalla es el DOM, asi que el lienzo es una capa
 * ENCIMA de todo con alfa premultiplicado: la tela es opaca y, donde no hay tela, solo pone la sombra del telon y la luz de sala que baja.
 *
 *   A.telon.play(o)  o = { conCierre (true: cierra y abre; false: empieza cerrado y abre), pre (s antes de cerrar), tier (1-3: peso),
 *                         color ("granate"|"esmeralda"|"noche"|"violeta"), hondo, brillo, balanceo, bandas (0 = liso), pix (rejilla 3 px),
 *                         bambalina, lados (queda recogido a los lados), dim (0-1: la luz de sala que baja con el telon), sala (true: la sala
 *                         baja antes de cerrar y vuelve al abrir, con su clac), onClosed (cambia la escena con el telon cerrado; puede devolver
 *                         una promesa: el telon espera a que se resuelva antes de abrir), onDone }
 *                    Devuelve { skip() } (un clic o el boton A lo cortan). Movimiento Minimo, sin WebGL o con la GPU perdida: corte directo
 *                    (onClosed y onDone, sin animacion).
 *                    Tambien acepta los nombres de la sesion del veredicto: after (= onClosed), onOpen (ya abierto), lados + quitar(ms) (queda
 *                    recogido a los lados hasta quitar), minimo: "fundido" (en Minimo, telon quieto que entra y sale fundido) y fallback(after)
 *                    (sin WebGL: el telon de siempre). Devuelve { skip(), quitar(ms) }.
 *   A.telon.busy()   true mientras hay un telon en pantalla.  A.telon.calienta(): compila el shader de antemano (una vez).
 *   A.telon.FS(o), A.telon.COLORES, A.telon.borla(k): las piezas, por si otra escena las necesita.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const easeIO = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const accel = u => u * u * (3 - 2 * u) * 0.35 + u * u * u * 0.65;            // arranca pesado, llega con fuerza
  const hex3 = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const reduced = () => !!(A.core && A.core.S && A.core.S.reduce) || document.documentElement.classList.contains("reduce-motion");

  const COLORES = {
    granate: ["#1c030b", "#7c0e22", "#e86a74"],
    esmeralda: ["#02150e", "#0d5e3e", "#7fe0b6"],
    noche: ["#040823", "#1a2c72", "#93b0ff"],
    violeta: ["#10052a", "#432088", "#bba0ff"],
  };
  const COMMON = `#version 300 es
precision highp float;
uniform vec2 uR;
out vec4 o;
const float PI = 3.14159265, TAU = 6.2831853;
vec2 px(){ return vec2(gl_FragCoord.x, uR.y - gl_FragCoord.y); }
float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
`;
  /* el shader del telon: el de la maqueta (pleat, velvet, galon, fleco, bambalina) tal cual; solo cambia lo que hay detras (alfa) */
  const FS = (o = {}) => COMMON + `
${o.head || ""}uniform float uET, uEB, uETr, uEBr, uCloth, uAmp, uSheen, uPix, uBands, uVal, uTop, uValOff, uDim;
uniform vec3 uC0, uC1, uC2;
float edgeAt(float y, float et, float eb){ float k = clamp((y - uTop) / (uR.y - uTop), 0., 1.); return mix(et, eb, pow(k, 1.6)); }
vec2 pleat(float c, float y, float seed){
  float s = 1. + .2 * y / uR.y;
  float P1 = 92. * s, P2 = 37. * s, P3 = 211.;
  float a1 = c * TAU / P1 + seed, a2 = c * TAU / P2 + seed * 2.3 + y * .0012, a3 = c * TAU / P3 + seed * 5.1;
  float w = .5 + .5 * sin(c * .013 + seed * 3.);
  float z = .62 * sin(a1) + .2 * w * sin(a2) + .25 * sin(a3);
  float dz = .62 * cos(a1) * TAU / P1 + .2 * w * cos(a2) * TAU / P2 + .25 * cos(a3) * TAU / P3;
  return vec2(z, dz);
}
vec3 velvet(vec2 p, float xl, float e, float seed, out float a){
  a = 0.;
  if (xl >= e || e < 1.) return vec3(0);
  float u = xl / e, c = u * uCloth;
  vec2 pz = pleat(c, p.y, seed);
  float comp = uCloth / max(e, 1.);
  float amp = uAmp * (.75 + .25 * min(comp, 4.));
  float slope = pz.y * amp * comp;
  float de = e - xl;
  float roll = 1. - smoothstep(0., 13., de);
  slope += roll * roll * 3.2;
  vec3 N = normalize(vec3(-slope, -.06, 1.));
  vec3 L = normalize(vec3(-.28, -.62, .74));
  float dif = max(dot(N, L), 0.);
  float sheen = pow(1. - N.z, 1.6) * (.45 + .55 * max(dot(normalize(N.xy + 1e-4), normalize(L.xy)) * .5 + .5, 0.));
  float ao = .3 + .7 * smoothstep(-1.1, .7, pz.x);
  float light = .78 + .32 * exp(-pow((p.x - uR.x * .5) / 560., 2.)) - .22 * smoothstep(uR.y * .3, uR.y, p.y) + .3 * smoothstep(uR.y - 260., uR.y, p.y);
  float v = (.13 + .95 * dif) * ao * light;
  float sh = sheen * uSheen * sqrt(ao) * light;
  if (uBands > 1.5) { v = floor(v * uBands + .5) / uBands; sh = floor(sh * uBands + .5) / uBands; }
  vec3 col = mix(uC0, uC1, clamp(v, 0., 1.4)) + uC2 * sh * .55;
  float hy = uR.y - p.y;
  if (hy < 42.) {
    float ar = floor(hy / 3.);
    float gd = .5 + .5 * clamp(-slope * .5, -1., 1.);
    vec3 G1 = vec3(1., .953, .69), G2 = vec3(.992, .843, .259), G3 = vec3(.961, .651, .137), G4 = vec3(.769, .416, .106), G5 = vec3(.431, .204, .078), GO = vec3(.114, .039, .239);
    if (ar >= 13.) col = GO;
    else if (ar >= 12.) col = gd > .55 ? G1 : G2;
    else if (ar >= 11.) col = gd > .4 ? G2 : G3;
    else if (ar >= 10.) col = gd > .6 ? G3 : G4;
    else if (ar >= 9.) col = G5;
    else {
      float j = floor(p.x / 3.), odd = mod(j, 2.);
      float Lf = 7. + floor(h11(j * 1.37 + seed) * 2.99);
      if (odd > .5) { if (ar >= 8.) col = G5; else { a = 0.; return col; } }
      else if (ar > 8. - Lf) col = ar >= 7. ? G2 : ar >= 4. ? G3 : G4;
      else if (ar > 7. - Lf) col = G5;
      else { a = 0.; return col; }
      col *= .82 + .18 * gd;
    }
  }
  float ol = 1. - smoothstep(1., 2.2, de);
  col = mix(col, uC0 * .45, ol * .9);
  a = 1.;
  return col;
}
void main(){
  vec2 p = px();
  vec2 q = p;
  if (uPix > .5) q = (floor(p / 3.) + .5) * 3.;
  float W = uR.x;
  float eL = edgeAt(q.y, uET, uEB), eR = edgeAt(q.y, uETr, uEBr);
  float a1, a2;
  vec3 cL = velvet(q, q.x, eL, 1.7, a1);
  vec3 cR = velvet(q, W - q.x, eR, 4.3, a2);
  /* detras: la escena (el DOM) no se pinta; solo se oscurece. Luz de sala que baja (queda un resto en el centro, el escenario) y la sombra del telon */
  vec2 pp = p / (uR / vec2(1920., 1080.));
  float keep = 1. - smoothstep(220., 920., length((pp - vec2(960., 600.)) * vec2(.75, 1.)));
  float M = mix(1., mix(.22, .5, keep), uDim);
  float dl = max(0., q.x - eL), dr = max(0., (W - q.x) - eR);
  float shd = .62 * exp(-dl / 26.) * step(1., eL) + .62 * exp(-dr / 26.) * step(1., eR);
  M *= 1. - clamp(shd, 0., .8);
  vec4 col = vec4(0., 0., 0., 1. - M);
  col = mix(col, vec4(cL, 1.), a1);
  col = mix(col, vec4(cR, 1.), a2 * (1. - a1));
  if (uVal > .5) {
    p.y -= uValOff; q.y -= uValOff;
    float y = q.y;
    float swag = 30. + 7. * abs(sin(q.x * PI / 240.));
    if (y < -.5) {}
    else if (y < 13.) {
      float r = floor(p.y / 3.);
      vec3 L5[5]; L5[0] = vec3(1., .95, .69); L5[1] = vec3(.99, .84, .26); L5[2] = vec3(.96, .65, .14); L5[3] = vec3(.77, .42, .11); L5[4] = vec3(.43, .2, .08);
      int i = int(clamp(r, 0., 4.));
      vec3 b = L5[i] * (.94 + .06 * h11(r * 7.1));
      if (p.y >= 12.) b = vec3(.11, .04, .24);
      col = vec4(b, 1.);
    } else if (y < swag) {
      float c = q.x;
      float z = sin(c * TAU / 240.);
      float sl = cos(c * TAU / 240.) * .9 + (y - 13.) / (swag - 13.) * .2;
      vec3 N = normalize(vec3(-sl * .5, -.5 + (y - 13.) / (swag - 13.), 1.));
      float v = (.25 + .8 * max(dot(N, normalize(vec3(-.28, -.62, .74))), 0.)) * (.7 + .3 * smoothstep(-1., 1., z));
      float sh = pow(1. - N.z, 1.6) * uSheen;
      if (uBands > 1.5) { v = floor(v * uBands + .5) / uBands; sh = floor(sh * uBands + .5) / uBands; }
      vec3 cc = mix(uC0, uC1, v) + uC2 * sh * .5;
      if (y > swag - 4.) cc = mix(vec3(.43, .2, .05), vec3(.96, .65, .14), .5 + .5 * z);
      col = vec4(cc, 1.);
    } else if (y < swag + 6. && mod(floor(q.x / 3.), 2.) < .5) {
      col = vec4(vec3(.77, .48, .12) * (.8 + .2 * h11(floor(q.x / 3.))), 1.);
    } else if (y < swag + 22.) {
      float k = 1. - .45 * exp(-(y - swag) / 9.);                 // sombra de la bambalina sobre lo de debajo
      col = vec4(col.rgb * k, 1. - (1. - col.a) * k);
    }
  }
  o = col;                                                         // premultiplicado: tela opaca; detras, negro con su alfa
}`;

  /* borla: pixel art por codigo (paleta geolite40, contorno #1d0a3d), 13x31 px de arte, luz arriba a la izquierda */
  const borla = k => {
    const W = 13, H = 31, T = { o: "#1d0a3d", 1: "#fff3b0", 2: "#fdd742", 3: "#f5a623", 4: "#c46a1b", 5: "#6e3414" };
    const rows = [".....o1o.....", ".....o3o.....", ".....o2o.....", ".....o4o.....", ".....o2o.....", "....oo3oo....", "...o12233o...", "..o1222334o..", "..o2223344o..", "..o2233445o..", "...o33445o...", "..ooooooooo..", "..o1122344o..", "..ooooooooo..", "...o23345o..."];
    const c = document.createElement("canvas"); c.width = W * k; c.height = H * k; const g = c.getContext("2d");
    const P = (x, y, ch) => { if (ch === "." || !T[ch]) return; g.fillStyle = T[ch]; g.fillRect(x * k, y * k, k, k); };
    rows.forEach((r, y) => [...r].forEach((ch, x) => P(x, y, ch)));
    const top = 15, len = [13, 15, 14, 16, 15, 16, 14, 16, 15, 14, 13];
    for (let y = top; y < H; y++) {
      const hw = Math.min(5, 3 + Math.floor((y - top) / 5));
      for (let x = 6 - hw; x <= 6 + hw; x++) {
        const j = x - 1, L = top + (len[j] || 13) - 1;
        if (y > L + 1) continue;
        if (y === L + 1) { P(x, y, "o"); continue; }
        const t = (x - (6 - hw)) / (2 * hw);
        let tone = t < 0.15 ? 1 : t < 0.4 ? 2 : t < 0.65 ? 3 : t < 0.85 ? 4 : 5;
        if ((x + 1) % 2 === 0) tone = Math.min(5, tone + 1);
        if (y === top) tone = Math.min(5, tone + 1);
        P(x, y, String(tone));
      }
      P(6 - hw - 1, y, y < top + 15 ? "o" : "."); P(6 + hw + 1, y, y < top + 15 ? "o" : ".");
    }
    return c;
  };

  /* cordon de tiro de las borlas: paleta de la borla, trenzado de 4 tonos y anilla de 5x4 donde nace bajo la bambalina */
  const CORDON = { t: { o: "#1d0a3d", 1: "#fff3b0", 2: "#fdd742", 3: "#f5a623", 4: "#c46a1b", 5: "#6e3414" }, tonos: ["2", "3", "4", "3"], anilla: [".ooo.", "o122o", "o345o", ".ooo."] };

  /* ------------------------------------------------------------------ la pieza en pantalla */
  const sfx = (n, ...a) => { try { if (A.sfx && A.sfx[n]) A.sfx[n](...a); } catch (e) { /* sin sonido */ } };
  const haptic = (lo, hi, ms) => { try { if (A.haptic && A.haptic.dual) A.haptic.dual(lo, hi, ms); } catch (e) { /* sin mando */ } };
  const shake = n => { try { if (A.core && A.core.jpShake) A.core.jpShake(n); } catch (e) { /* nada */ } };
  let cur = null;
  const VAL_FUERA = -66;                                            // la bambalina recogida arriba (fuera de cuadro), en multiplos de 3

  function play(o = {}) {
    if (cur) cur.skip(true);
    const tier = clamp(o.tier || 1, 1, 3), conCierre = o.conCierre !== false;
    const P = Object.assign({ color: "granate", hondo: 1.5, brillo: 1.4, balanceo: 1.5, bandas: 0, pix: true, bambalina: true, lados: false, dim: 1, sala: false }, o);
    if (!P.onClosed && P.after) P.onClosed = P.after;               // los nombres de la sesion del veredicto (after / onOpen / quitar) valen igual
    const done = { closed: false, end: false, open: false };
    const fireOpen = () => { if (done.open) return; done.open = true; try { if (P.onOpen) P.onOpen(); } catch (e) { console.error(e); } };
    const fireClosed = () => { if (done.closed) return Promise.resolve(); done.closed = true; try { return Promise.resolve(P.onClosed ? P.onClosed() : null).catch(() => {}); } catch (e) { return Promise.resolve(); } };
    const fireEnd = () => { if (done.end) return; done.end = true; fireOpen(); try { if (P.onDone) P.onDone(); } catch (e) { console.error(e); } };
    const cut = () => { fireClosed().then(fireEnd); return { skip() {}, quitar() {} }; };
    /* sin WebGL o con la GPU perdida: quien llama puede dar su telon de siempre (fallback(after)); si no, corte directo */
    const sinGL = () => { if (P.fallback) { try { P.fallback(() => fireClosed().then(fireEnd)); } catch (e) { cut(); } return { skip() {}, quitar() {} }; } return cut(); };
    if (reduced() && P.minimo !== "fundido") return cut();          // Movimiento Minimo: corte directo (la portada); "fundido": telon quieto que entra y sale fundido (el jefe)
    const cv = document.createElement("canvas"), c2 = document.createElement("canvas");
    let gl = null;
    try { gl = cv.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: false }); } catch (e) { gl = null; }
    if (!gl) return sinGL();
    const W = Math.max(1, innerWidth), H = Math.max(1, innerHeight);
    cv.width = W; cv.height = H; c2.width = W; c2.height = H;
    const base = "position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;image-rendering:pixelated;z-index:2147483000";
    cv.style.cssText = base; c2.style.cssText = base.replace("2147483000", "2147483001").replace("pointer-events:none", "pointer-events:auto;cursor:default");   // mientras dura, nada de debajo se pulsa
    cv.className = "telon-gl"; c2.className = "telon-2d"; cv.setAttribute("aria-hidden", "true"); c2.setAttribute("aria-hidden", "true");
    /* compilar ANTES de ensenar nada (nunca en mitad de la animacion) */
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, "#version 300 es\nvoid main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2. - 1., 0., 1.); }"));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS()));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error("telon: " + gl.getProgramInfoLog(prog)); return sinGL(); }
    const vao = gl.createVertexArray(), loc = {};
    const U = (n, v) => { let l = loc[n]; if (l === undefined) l = loc[n] = gl.getUniformLocation(prog, n); if (l === null) return; if (typeof v === "number") gl.uniform1f(l, v); else if (v.length === 2) gl.uniform2fv(l, v); else gl.uniform3fv(l, v); };
    let lost = false; cv.addEventListener("webglcontextlost", e => { e.preventDefault(); lost = true; });
    document.body.appendChild(cv); document.body.appendChild(c2);
    const g = c2.getContext("2d");
    const k = Math.max(1, Math.round(3 * H / 1080)), tas = borla(k);
    const tasS = (() => { const c = document.createElement("canvas"); c.width = tas.width; c.height = tas.height; const q = c.getContext("2d"); q.drawImage(tas, 0, 0); q.globalCompositeOperation = "source-in"; q.fillStyle = "rgba(20,2,8,0.45)"; q.fillRect(0, 0, c.width, c.height); return c; })();
    const half = W / 2 + 6, side = () => (P.lados ? 46 : -14);
    /* guion: cierra (accel) + pausa + abre (easeIO); con la sala: baja antes de cerrar (pre) y vuelve mientras se abre */
    const heavy = [1, 1.12, 1.25][tier - 1], pre = P.pre != null ? P.pre : P.sala ? 0.35 : 0;
    const dc = 0.75 * heavy, hold = conCierre ? 0.45 : 0.3, dopen = 1.15 * heavy;
    const seq = conCierre ? [{ a: pre, b: pre + dc, from: side(), to: half, kind: "cierra" }, { a: pre + dc + hold, b: pre + dc + hold + dopen, from: half, to: side(), kind: "abre" }]
      : [{ a: hold, b: hold + dopen, from: half, to: side(), kind: "abre" }];
    let top = conCierre ? side() : half, bot = top, vb = 0, fired = {}, t = 0, last = performance.now(), raf = 0, waitOpen = null, holdShift = 0, ended = false, parked = false;
    const topAt = u => {
      let x = seq[0].kind === "cierra" ? seq[0].from : half;
      for (const s of seq) { if (u < s.a) break; const e = clamp((u - s.a) / (s.b - s.a), 0, 1); x = s.from + (s.to - s.from) * (s.kind === "cierra" ? accel(e) : easeIO(e)); }
      return x;
    };
    const col = COLORES[P.color] || COLORES.granate, C0 = hex3(col[0]), C1 = hex3(col[1]), C2 = hex3(col[2]);
    const finish = () => {
      if (ended) return; ended = true; cancelAnimationFrame(raf); cur = null;
      removeEventListener("pointerdown", onSkip, true); removeEventListener("keydown", onKey, true);
      cv.remove(); c2.remove();
      try { const x = gl.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); } catch (e) { /* nada */ }
      fireClosed().then(fireEnd);
    };
    const draw = (u, dim, val) => {
      gl.viewport(0, 0, W, H); gl.useProgram(prog); gl.bindVertexArray(vao); gl.disable(gl.BLEND);
      const sway = bot - top, edge = x => Math.max(0, x);
      U("uR", [W, H]); U("uET", edge(top)); U("uEB", edge(top + sway * P.balanceo)); U("uETr", edge(top)); U("uEBr", edge(top + sway * P.balanceo * 0.92));
      U("uCloth", 1220); U("uAmp", 15 * P.hondo); U("uSheen", P.brillo); U("uPix", P.pix ? 1 : 0); U("uBands", P.bandas); U("uVal", P.bambalina ? 1 : 0); U("uTop", P.bambalina ? 14 : 0);
      U("uValOff", val); U("uDim", dim); U("uC0", C0); U("uC1", C1); U("uC2", C2);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      /* cordon de tiro: baja de la bambalina siguiendo el canto de cada hoja y la borla cuelga de su extremo (a la altura del atado), todo en
         enteros de arte; en la juntura cada cordon se queda de su lado (tope), asi las borlas nunca se cruzan con el rebote del cierre */
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
      const yb0 = Math.round(H * 0.56), kk = Math.pow((yb0 - 14) / (H - 14), 1.6), eb = top + sway * P.balanceo * kk;
      if (eb > 60) {
        const y1 = Math.round(yb0 / k), y0 = 16, gap = 8 * k, inset = 20;
        const edgeAt = (y, f) => top + sway * P.balanceo * f * Math.pow((y * k - 14) / (H - 14), 1.6);
        const put = (x, y, ch) => { if (x < 0) return; g.fillStyle = CORDON.t[ch]; g.fillRect(x * k, y * k, k, k); };
        for (const lado of [-1, 1]) {
          const xc = y => { const e = edgeAt(y, lado < 0 ? 1 : 0.92); return Math.round((lado < 0 ? Math.min(e - inset, W / 2 - gap) : Math.max(W - e + inset, W / 2 + gap)) / k); };
          for (let y = y0 + 2; y < y1; y++) { const x = xc(y); put(x - 1, y, "o"); put(x + 1, y, "o"); }
          for (let y = y0 + 2; y < y1; y++) put(xc(y), y, CORDON.tonos[y % 4]);
          const rx = xc(y0 + 2);
          CORDON.anilla.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== ".") put(rx - 2 + i, y0 - 2 + j, r[i]); });
          const tx = (xc(y1 - 1) - 6) * k, ty = y1 * k;
          g.drawImage(tasS, tx + k, ty + 2 * k); g.drawImage(tas, tx, ty);
        }
      }
    };
    const frame = now => {
      raf = 0; if (ended) return;
      if (lost || gl.isContextLost()) return finish();              // GPU perdida: corte directo (la escena ya cambia en finish)
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      /* con el telon cerrado se espera a la escena nueva (onClosed puede tardar): el reloj del guion se para ahi */
      if (waitOpen) { holdShift += dt; } else t += dt;
      let u = t;
      top = topAt(u);
      const K = 46 / [1, 1.15, 1.3][tier - 1], D = 5.2 / (0.35 + 0.65 * Math.max(0.05, P.balanceo)), n = 4, h = dt / n;
      for (let i = 0; i < n; i++) { const acc = K * (top - bot) - D * vb; vb += acc * h; bot += vb * h; }
      if (P.balanceo <= 0.01) bot = top;
      for (let i = 0; i < seq.length; i++) {
        const s = seq[i];
        if (!fired[i + "a"] && u >= s.a) { fired[i + "a"] = 1;
          if (s.kind === "cierra") { sfx("sweep", 0.8); sfx("lift"); } else { sfx("sweep", 0.55); if (tier === 3) sfx("bossRise", 3); } }
        if (!fired[i + "b"] && u >= s.b) {
          fired[i + "b"] = 1;
          if (s.kind === "cierra") {
            sfx("impacto"); shake(tier); haptic(0.35 + 0.15 * tier, 0.12, 180 + 60 * tier);
            const pr = fireClosed(); waitOpen = pr; let ok = false; pr.then(() => { ok = true; });
            /* dos fotogramas de margen para que la escena nueva se pinte antes de abrir (y nunca mas de 4 s) */
            const t1 = performance.now(), chk = () => { if (ended) return; if (ok || performance.now() - t1 > 4000) requestAnimationFrame(() => requestAnimationFrame(() => { waitOpen = null; })); else setTimeout(chk, 30); }; chk();
          } else sfx("felt");
        }
      }
      /* la sala: baja antes de cerrar, sigue a oscuras con el telon cerrado y vuelve mientras se abre; la bambalina baja con la sala y sube al final */
      let dim = 0, val = P.bambalina ? 0 : VAL_FUERA;
      if (P.sala && conCierre) {
        const c = seq[0], a = seq[1], PRE = Math.max(0.01, pre);
        dim = u < c.a ? easeIO(clamp(u / PRE, 0, 1)) : u < a.a ? 1 : 1 - easeIO(clamp((u - a.a) / (a.b - a.a), 0, 1));
        const vin = easeIO(clamp(u / PRE, 0, 1)), vout = easeIO(clamp((u - a.b) / 0.5, 0, 1));
        val = VAL_FUERA * (1 - vin + vout);
        if (!fired.sala) { fired.sala = 1; sfx("lampara", 1); }
        if (!fired.luz && u >= a.a + 0.35) { fired.luz = 1; sfx("lampara", 4); }
      }
      val = Math.round(val / 3) * 3;
      draw(u, dim * P.dim * (tier === 3 ? 1.1 : 1), val);
      const endAt = seq[seq.length - 1].b + (P.sala ? 0.5 : 0.05);
      if (u >= seq[seq.length - 1].b && seq[seq.length - 1].to === side()) fireOpen();
      /* recogido a los lados (lados: true): se queda quieto, sin gastar, hasta quitar(); los clics vuelven a la escena */
      if (P.lados && seq[seq.length - 1].to === side() && u >= endAt + 0.6 * heavy && Math.abs(bot - top) < 0.3) { parked = true; c2.style.pointerEvents = "none"; removeEventListener("pointerdown", onSkip, true); removeEventListener("keydown", onKey, true); return; }
      if (u >= endAt && !P.lados) return finish();
      if (u >= endAt && P.lados && seq[seq.length - 1].to === -14) return finish();
      raf = requestAnimationFrame(frame);
    };
    /* un clic, Intro o el boton A cortan la funcion: la escena cambia ya y el telon se quita */
    const onSkip = e => { e.stopPropagation(); e.preventDefault(); if (done.closed && !waitOpen) finish(); };
    const onKey = e => { if (e.key === "Enter" || e.key === " " || e.key === "Escape") { e.preventDefault(); e.stopPropagation(); if (done.closed && !waitOpen) finish(); } };
    addEventListener("pointerdown", onSkip, true); addEventListener("keydown", onKey, true);
    /* recoge el telon que quedo a los lados y lo quita (ms) */
    const quitar = (ms = 600) => { if (ended) return; const a = Math.max(t, seq[seq.length - 1].b); seq.push({ a, b: a + Math.max(0.05, ms / 1000), from: side(), to: -14, kind: "abre" }); fired[(seq.length - 1) + "a"] = fired[(seq.length - 1) + "b"] = 1; if (parked) { parked = false; last = performance.now(); raf = requestAnimationFrame(frame); } };
    if (reduced()) {                                                   // "fundido": el telon quieto (cerrado) entra fundido, cambia la escena y se va fundido
      top = bot = half; draw(0, 0, 0);
      for (const c of [cv, c2]) { c.style.opacity = "0"; c.style.transition = "opacity .25s linear"; }
      requestAnimationFrame(() => { cv.style.opacity = c2.style.opacity = "1"; });
      setTimeout(() => fireClosed().then(() => requestAnimationFrame(() => requestAnimationFrame(() => { cv.style.opacity = c2.style.opacity = "0"; setTimeout(finish, 260); }))), 280);
      cur = { skip() {}, quitar() {} };
      return cur;
    }
    draw(0, 0, P.sala ? VAL_FUERA : 0);
    raf = requestAnimationFrame(frame);
    cur = { skip: (now) => { if (now) finish(); else if (done.closed) finish(); }, quitar };
    return cur;
  }

  /* precalentamiento: compila el shader una vez en un lienzo de 1 px (la cache de programas de la GPU lo guarda) para que el primer telon
     no pare el clic (~60 ms de mas la primera vez). Lo llama la puerta mientras espera (js/puerta.js) */
  let caliente = false;
  function calienta() {
    if (caliente) return; caliente = true;
    try {
      const c = document.createElement("canvas"); c.width = c.height = 1; const gl = c.getContext("webgl2"); if (!gl) return;
      const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
      const p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, "#version 300 es\nvoid main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2. - 1., 0., 1.); }"));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS())); gl.linkProgram(p); gl.getProgramParameter(p, gl.LINK_STATUS);
      gl.useProgram(p); gl.bindVertexArray(gl.createVertexArray()); gl.drawArrays(gl.TRIANGLES, 0, 3);
      const x = gl.getExtension("WEBGL_lose_context"); if (x) x.loseContext();
    } catch (e) { /* sin WebGL: el telon ya corta directo */ }
  }

  A.telon = { play, busy: () => !!cur, calienta, FS, COLORES, borla };
})(window.AIQ);
