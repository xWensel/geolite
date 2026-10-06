/* El globo - maqueta jugable. La escena corre a 640x360 px nativos (canvas) y se muestra x3 sin suavizar dentro del escenario de 1920x1080 (que si se escala con transform).
   El resultado (punto de reventon, redondeo, presentacion) se decide ANTES con crash.js; la animacion solo lo ensena. Nada del aspecto depende del resultado salvo el instante del reventon. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s), sleep = ms => new Promise(r => setTimeout(r, ms));
  const C = window.GB_CRASH, M = window.GB_META, RT = window.RTP, TT = window.GB_T;
  const rnd = Math.random, clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
  const ease = p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2), easeOut = p => 1 - Math.pow(1 - p, 3);
  const WD = 640, HT = 360, HY = 130, GH = HT - HY, SKYR = HY + 60, RING = M.mapRing, FMAP = 0.32;
  const ENVW = M.envW, ENVH = M.envH, GAP = 54, EX = 9, EY = 30, BW = 96, BH = 196, CXB = 48, CRX = 320, CRY = 76, OY0 = 64;
  const IC = "../../../assets/icons/";
  const ST = { stake: 5, lang: "es", reduce: false, sound: true, speed: 1, bal: 100, autoM: 0, phase: "idle", f: { x: null, sky: -1, burst: -1, event: -1, liv: -1 }, plays: 0, hist: [], ghostEnd: null };
  const L = () => TT[ST.lang], nm = o => o[ST.lang] || o.es;
  let F = null, T = 0, SC = null, Sn = null, BC = null, BL = null, CL = [], STARS = [];

  /* ------------------------------------------------------------------ imagenes y lienzos */
  const IMG = {};
  const NAMES = [].concat(M.livs.map(l => "env_" + l.id), ["basket", "burner", "glow", "head_n", "head_l", "plane", "zeppelin", "ufo", "sun", "moon", "haze", "coin_flat", "world_map", "world_peaks", "world_lights"],
    [0, 1, 2, 3].map(i => "flame_" + i), [0, 1, 2, 3, 4, 5].map(i => "cloud_" + i), [0, 1, 2].map(i => "storm_" + i), [0, 1, 2, 3].map(i => "bird_" + i), [0, 1, 2, 3, 4, 5, 6, 7].map(i => "sb_" + i), [0, 1, 2].map(i => "puff_" + i));
  const loadAll = () => Promise.all(NAMES.map(n => new Promise(res => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => { console.error("falta " + n); res(); }; im.src = "out/" + n + ".png"; })));
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; return [c, x]; };
  const cv = $("#gbCv"), ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
  const [gcv, gctx] = mk(WD, GH), [hzcv, hz] = mk(WD, 44), [tcv, tctx] = mk(260, 80), [bcv, bc] = mk(BW, BH);
  const skyImg = ctx.createImageData(WD, SKYR), sky32 = new Uint32Array(skyImg.data.buffer);
  const stage = $("#gbStage"), wrap = $("#gbWrap"), shakeEl = $("#gbShake"), frame = $(".gb-frame");
  function fit() { stage.style.transform = `scale(${wrap.clientWidth / 1920})`; }
  addEventListener("resize", fit); document.addEventListener("fullscreenchange", () => setTimeout(fit, 60));

  /* ------------------------------------------------------------------ cielo: una linea de tiempo unica (amanecer -> dia -> atardecer -> noche) y cada vuelo la recorre a su ritmo */
  const hx = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const TAU = [[0.00, "#3a3a8e", "#c87aa8", "#ffb878", [255, 170, 120, .20], 0], [0.12, "#4a9ae8", "#8cc8f4", "#ffe0b8", [255, 230, 200, .06], 0], [0.30, "#2a78e0", "#5eb0f4", "#b8e4ff", [255, 255, 255, 0], 0],
    [0.46, "#3a78d8", "#7ab4ec", "#ffe8b0", [255, 220, 150, .10], 0], [0.60, "#3a3a9a", "#d4608a", "#ffa850", [255, 140, 80, .30], 0], [0.72, "#1c1c66", "#7a3a98", "#ff7a6a", [170, 90, 170, .40], .05],
    [0.80, "#10104a", "#2a2a88", "#6a5ab0", [90, 100, 190, .48], .55], [0.90, "#06062a", "#0c0c4a", "#22227a", [30, 40, 110, .58], 1], [1.00, "#02021a", "#06062e", "#10104e", [20, 30, 90, .62], 1]]
    .map(k => ({ t: k[0], top: hx(k[1]), mid: hx(k[2]), hor: hx(k[3]), gr: k[4], st: k[5] }));
  const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  function tauAt(tau) {
    tau = clamp(tau, 0, 1); let i = 0; while (i < TAU.length - 2 && tau > TAU[i + 1].t) i++;
    const a = TAU[i], b = TAU[i + 1], f = clamp((tau - a.t) / (b.t - a.t), 0, 1);
    return { top: mix3(a.top, b.top, f), mid: mix3(a.mid, b.mid, f), hor: mix3(a.hor, b.hor, f), gr: a.gr.map((v, q) => lerp(v, b.gr[q], f)), st: lerp(a.st, b.st, f) };
  }
  function skyState(th, p) {
    const tau = clamp(th.t0 + p * th.dt, 0, 1), k = tauAt(tau);
    let top = k.top, mid = k.mid, hor = k.hor, gr = k.gr.slice(), st = k.st, sunA = 1, moonA = 1;
    const storm = th.w === "storm" ? clamp(1 - p / 0.45, 0, 1) : 0, fog = th.w === "fog" ? clamp(0.7 - p * 0.9, 0, 0.7) : 0;
    if (storm > 0) { const s = storm * 0.88; top = mix3(top, [40, 42, 58], s); mid = mix3(mid, [72, 74, 92], s); hor = mix3(hor, [112, 114, 132], s); gr = [lerp(gr[0], 90, s), lerp(gr[1], 94, s), lerp(gr[2], 112, s), lerp(gr[3], .34, s)]; st *= 1 - s; sunA = moonA = 1 - s; }
    if (fog > 0) { top = mix3(top, [186, 196, 212], fog); mid = mix3(mid, [200, 208, 222], fog); hor = mix3(hor, [214, 220, 232], fog); gr = [lerp(gr[0], 210, fog), lerp(gr[1], 216, fog), lerp(gr[2], 228, fog), lerp(gr[3], .26, fog)]; sunA = 1 - fog; st *= 1 - fog; }
    return { th, tau, top, mid, hor, gr, st, sunA, moonA, storm, fog, night: clamp((tau - .62) / .22, 0, 1) };
  }
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], STEP = 14, PX = [0, 0, 0, 0];
  function drawSky(S) {
    for (let y = 0; y < SKYR; y++) {
      const f = y / HY, c = f < 0.55 ? mix3(S.top, S.mid, f / 0.55) : mix3(S.mid, S.hor, Math.min(1, (f - 0.55) / 0.45));
      const lo0 = Math.floor(c[0] / STEP) * STEP, lo1 = Math.floor(c[1] / STEP) * STEP, lo2 = Math.floor(c[2] / STEP) * STEP, f0 = (c[0] - lo0) / STEP, f1 = (c[1] - lo1) / STEP, f2 = (c[2] - lo2) / STEP;
      for (let ph = 0; ph < 4; ph++) { const thr = BAY[(y & 3) * 4 + ph] / 16; PX[ph] = (255 << 24) | (Math.min(255, lo2 + (thr < f2 ? STEP : 0)) << 16) | (Math.min(255, lo1 + (thr < f1 ? STEP : 0)) << 8) | Math.min(255, lo0 + (thr < f0 ? STEP : 0)); }
      const row = y * WD; for (let x = 0; x < WD; x += 4) { sky32[row + x] = PX[0]; sky32[row + x + 1] = PX[1]; sky32[row + x + 2] = PX[2]; sky32[row + x + 3] = PX[3]; }
    }
    ctx.putImageData(skyImg, 0, 0);
  }
  /* sprite con el tinte del momento del dia (mezcla sobre sus pixeles) */
  function spr(img, x, y, o) {
    if (!img) return; x = Math.round(x); y = Math.round(y); const a = o && o.a != null ? o.a : 1, gr = (o && o.gr) || (SC && SC.gr) || [0, 0, 0, 0], k = gr[3] * (o && o.k != null ? o.k : 1);
    if (k < 0.02 || img.width > 260 || img.height > 80) { ctx.globalAlpha = a; ctx.drawImage(img, x, y); ctx.globalAlpha = 1; return; }
    tctx.clearRect(0, 0, img.width, img.height); tctx.drawImage(img, 0, 0); tctx.globalCompositeOperation = "source-atop"; tctx.fillStyle = `rgba(${gr[0] | 0},${gr[1] | 0},${gr[2] | 0},${k})`; tctx.fillRect(0, 0, img.width, img.height); tctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = a; ctx.drawImage(tcv, 0, 0, img.width, img.height, x, y, img.width, img.height); ctx.globalAlpha = 1;
  }
  const fr = (x, y, w, h, col, a) => { ctx.globalAlpha = a == null ? 1 : a; ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); ctx.globalAlpha = 1; };

  function drawStars(S) {
    if (S.st < 0.02) return;
    for (const s of STARS) { const a = S.st * s.a * (0.65 + 0.35 * Math.sin(s.ph + T * (1.3 + s.a))); if (a < .06) continue; fr(s.x, s.y, s.big ? 2 : 1, 1, s.c, a); }
  }
  function drawAurora(S) {
    const a = S.th.aurora ? S.night : 0; if (a < .02) return;
    ctx.globalCompositeOperation = "lighter";
    for (let x = 0; x < WD; x += 2) {
      const y0 = 30 + Math.sin(x * .018 + T * .35) * 16 + Math.sin(x * .047 - T * .6) * 8, h = Math.max(12, 36 + Math.sin(x * .029 + T * .5) * 16 + Math.sin(x * .09 + T * .9) * 6);
      ctx.globalAlpha = .09 * a; ctx.fillStyle = "#3affc8"; ctx.fillRect(x, y0 - 12, 2, h + 12);
      ctx.globalAlpha = .24 * a; ctx.fillStyle = "#4aff9a"; ctx.fillRect(x, y0, 2, h * .7);
      ctx.globalAlpha = .38 * a; ctx.fillStyle = "#b8ff8a"; ctx.fillRect(x, y0 + h * .42, 2, h * .26);
      ctx.globalAlpha = .22 * a; ctx.fillStyle = "#c06aff"; ctx.fillRect(x, y0 - 12, 2, 12);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  function drawSunMoon(S) {
    const f = clamp(S.tau / 0.66, 0, 1);
    if (S.tau < 0.70 && S.sunA > .02) spr(IMG.sun, 70 + f * 500 - 22, HY - 8 - Math.sin(Math.PI * f) * 90 - 22, { a: S.sunA, k: 0 });
    const ph = clamp((S.tau - 0.60) / 0.76, 0, 1);
    if (S.tau > 0.60 && S.moonA > .02) spr(IMG.moon, 90 + ph * 420 - 15, HY - 6 - Math.sin(Math.PI * ph) * 90 - 15, { a: S.moonA * clamp((S.tau - .6) / .12, 0, 1), k: 0 });
  }
  /* nubes: tres capas con paralaje (lejanas detras del horizonte, medias, cercanas por delante del globo). Pierden densidad con la altura: por encima del tiempo */
  function genClouds(th) {
    const arr = [], dens = th.clouds;
    for (let Ly = 0; Ly < 3; Ly++) {
      let wy = -110 + rnd() * 40;
      while (wy < 2600) {
        let keep = wy < 520 ? 1 : wy < 900 ? 0.5 : wy < 1300 ? 0.15 : 0.04; if (th.w === "storm") keep = wy < 560 ? 1.3 : 0.02;
        if (rnd() < keep * Math.min(1, dens)) {
          const storm = th.w === "storm" && wy < 560 && Ly > 0, i = Ly === 0 ? (rnd() * 3) | 0 : Ly === 1 ? 2 + ((rnd() * 3) | 0) : 4 + ((rnd() * 2) | 0);
          arr.push({ x: rnd() * (WD + 320), wy, L: Ly, img: IMG[(storm ? "storm_" + (Ly === 1 ? (rnd() * 2) | 0 : 1 + ((rnd() * 2) | 0)) : "cloud_" + i)], sp: (3 + rnd() * 3) * [0.5, 1, 1.7][Ly] });
        }
        wy += [34, 48, 72][Ly] * (0.6 + rnd() * 0.9) / Math.max(.35, Math.min(dens, 1.6));
      }
    }
    return arr;
  }
  function drawClouds(layer) {
    const f = [.7, 1, 1.5][layer];
    for (const c of CL) {
      if (c.L !== layer) continue; const y = 150 - (c.wy - Sn.A) * f, h = c.img.height; if (y - h > HT || y < -2) continue;
      const x = (((c.x + T * c.sp) % (WD + 320)) + (WD + 320)) % (WD + 320) - 160; if (x > WD || x + c.img.width < 0) continue;
      spr(c.img, x, y - h, { a: layer === 0 ? .88 : layer === 2 ? .92 : 1, k: layer === 0 ? 1 : .9 });
    }
  }
  /* suelo: el mapa de la Tierra (capa base), las cordilleras con su paralaje y las luces de las ciudades; el horizonte se curva con la altura */
  const sag = new Int16Array(WD);
  function drawGround(S) {
    const A = Sn.A, sy = ((Math.floor(Sn.row0 - A * FMAP) % RING) + RING) % RING, syp = ((sy - Math.floor(A * FMAP * 0.07)) % RING + RING) % RING;
    gctx.drawImage(IMG.world_map, 0, sy, WD, GH, 0, 0, WD, GH);
    gctx.drawImage(IMG.world_peaks, 0, syp, WD, GH, 0, 0, WD, GH);
    const gr = S.gr; if (gr[3] > .01) { gctx.fillStyle = `rgba(${gr[0] | 0},${gr[1] | 0},${gr[2] | 0},${gr[3] * .85})`; gctx.fillRect(0, 0, WD, GH); }
    if (S.night > .05) { gctx.globalCompositeOperation = "lighter"; gctx.globalAlpha = S.night * .9; gctx.drawImage(IMG.world_lights, 0, sy, WD, GH, 0, 0, WD, GH); gctx.globalAlpha = 1; gctx.globalCompositeOperation = "source-over"; }
    // bruma del horizonte (tramado ordenado, tenida con el color del cielo)
    hz.globalCompositeOperation = "copy"; hz.drawImage(IMG.haze, 0, 0); hz.globalCompositeOperation = "source-in"; hz.fillStyle = `rgb(${S.hor[0] | 0},${S.hor[1] | 0},${S.hor[2] | 0})`; hz.fillRect(0, 0, WD, 44); hz.globalCompositeOperation = "source-over";
    gctx.drawImage(hzcv, 0, 0);
    if (S.fog > .05) { gctx.globalAlpha = S.fog; gctx.drawImage(hzcv, 0, 14); gctx.globalAlpha = 1; }
    // curvatura: R baja con la altura
    const p = Sn.p, R = lerp(24000, 1050, Math.pow(p, .8));
    for (let x = 0; x < WD; x++) { const dx = x - 320; sag[x] = Math.round(R - Math.sqrt(R * R - dx * dx)); }
    let x0 = 0; const rim = S.night > .3 ? "190,220,255" : "255,255,255", ra = clamp(0.1 + p * 1.1, 0, 1);
    while (x0 < WD) { let x1 = x0 + 1; while (x1 < WD && sag[x1] === sag[x0]) x1++; const s = sag[x0], w = x1 - x0;
      ctx.drawImage(gcv, x0, s, w, GH - s, x0, HY + s, w, GH - s);
      if (p > .04) { ctx.fillStyle = `rgba(${rim},${ra * .9})`; ctx.fillRect(x0, HY + s - 1, w, 1); ctx.fillStyle = `rgba(${rim},${ra * .3})`; ctx.fillRect(x0, HY + s - 2, w, 1); ctx.fillStyle = `rgba(120,200,255,${ra * .14})`; ctx.fillRect(x0, HY + s - 5, w, 3); }
      x0 = x1; }
  }

  /* ------------------------------------------------------------------ el globo (se compone en un lienzo propio de 96x196 y luego se tinta/atenua) */
  const newB = () => ({ mode: "ok", t: 0, ox: 0, oy: OY0, vy: 0, kx: 1, ky: 1, duck: 0, flameOn: 1, blast: 0, stretch: 0, face: "n", envHide: false, hatOff: false, liv: 0, ghost: false, cough: 0 });
  const balloonPos = B => ({ x: CRX + B.ox + Math.round(Math.sin(T * 1.1) * 1.4), y: CRY + B.oy + Math.round(Math.sin(T * 1.9)) });
  function drawEnvSq(img, bottomY, cx, kx, ky) {
    const w = img.width, h = img.height;
    if (kx > .999 && ky > .999) { bc.drawImage(img, cx - (w >> 1), bottomY - h + 1); return; }
    const dh = Math.max(3, Math.round(h * ky)), top = bottomY - dh + 1;
    for (let j = 0; j < dh; j++) { const sr = Math.min(h - 1, Math.floor(j / ky)), rw = Math.max(2, Math.round(w * kx * (1 + .03 * Math.sin(j * .5 + T * 9) * (1 - kx)))); bc.drawImage(img, 0, sr, w, 1, cx - (rw >> 1), top + j, rw, 1); }
  }
  function rope(x0, y0, x1, y1, col) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; bc.fillStyle = col; for (let i = 0; i <= n; i++) { const t = i / n; bc.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 1, 1); } }
  function paintBalloon(B) {
    bc.clearRect(0, 0, BW, BH); bc.globalAlpha = 1;
    const sw = Math.round(Math.sin(T * 1.1 + 1) * 1.6 + Math.sin(T * 2.7) * .6) + (B.stretch ? 0 : 0), yM = EY + ENVH - 1, yB = yM + GAP, bx = CXB - 23 + sw, hb = Math.round(Math.sin(T * 3 + 2) * .6);
    const env = IMG["env_" + M.livs[B.liv].id], headImg = IMG["head_" + B.face], f = ((T * 11) | 0) % 4;
    const fl = B.flameOn && B.mode !== "pop";
    // llama (detras de la tela: solo asoma bajo la falda) y quemador
    if (fl) { const fy = yM + 14 - 28 + (B.cough ? 8 : 0); bc.drawImage(IMG["flame_" + f], CXB - 8, fy); }
    if (!B.envHide) { const sq = B.stretch ? 1 + B.stretch * .035 : 1; drawEnvSq(env, yM, CXB, B.kx * sq, B.ky); }
    const mY = B.envHide ? yM : yM;   // la boca (donde se atan las cuerdas)
    if (!B.envHide && B.mode !== "pop") { rope(CXB - 11, mY, bx + 3, yB + 1, "#f2c070"); rope(CXB + 11, mY, bx + 40, yB + 1, "#a05a30"); rope(CXB - 4, mY, CXB - 12 + sw, yB + 3, "#d89a52"); rope(CXB + 4, mY, CXB + 11 + sw, yB + 3, "#a05a30"); }
    bc.drawImage(IMG.burner, CXB - 7, yM + 12);
    // el crupier asoma: sus pixeles de dealer_mini (cara + sombrero), medio escondido tras el borde
    const hy = yB - 32 + hb + Math.round(B.duck * 30), hh = IMG.head_n.height;
    if (B.hatOff) bc.drawImage(headImg, 0, 17, 36, hh - 17, CXB - 18 + sw, hy + 17, 36, hh - 17); else bc.drawImage(headImg, CXB - 18 + sw, hy);
    bc.drawImage(IMG.basket, bx, yB);
    // soplo del quemador: llama doble por delante de la tela
    if (B.blast > 0 && fl) { const g = B.blast; bc.globalAlpha = Math.min(1, g * 1.6); bc.drawImage(IMG["flame_" + ((f + 1) % 4)], CXB - 8, yM - 14); bc.drawImage(IMG["flame_" + ((f + 2) % 4)], CXB - 8, yM - 36); bc.globalAlpha = 1; }
    // tinte del momento del dia (mas suave que el del suelo para que se lea siempre)
    const gr = SC.gr, k = gr[3] * .55 + (B.ghost ? .3 : 0); if (k > .02) { bc.globalCompositeOperation = "source-atop"; bc.fillStyle = B.ghost ? `rgba(190,215,255,${Math.min(.55, k)})` : `rgba(${gr[0] | 0},${gr[1] | 0},${gr[2] | 0},${k})`; bc.fillRect(0, 0, BW, BH); bc.globalCompositeOperation = "source-over"; }
  }
  function drawBalloon(B, alpha) {
    paintBalloon(B); const p = balloonPos(B), x = p.x - CXB, y = p.y - EY;
    ctx.globalAlpha = alpha; ctx.drawImage(bcv, Math.round(x), Math.round(y)); ctx.globalAlpha = 1;
    // resplandor del quemador sobre la tela: se nota mas de noche
    if (B.flameOn && !B.envHide) {
      const ga = (0.2 + SC.night * .5 + B.blast * .35) * alpha * (.85 + .15 * Math.sin(T * 17)) * B.ky * B.ky; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, ga);
      ctx.drawImage(IMG.glow, Math.round(p.x - 36), Math.round(p.y + ENVH - 1 - 30 * B.ky - 36)); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }
  }
  function stepBalloon(B, dt) {
    B.t += dt; B.blast = Math.max(0, B.blast - dt * 2.8); B.cough = Math.max(0, B.cough - dt); B.stretch = Math.max(0, B.stretch - dt * 3);
    if (B.mode === "pop") { B.vy += 380 * dt; B.oy += B.vy * dt; B.duck = Math.min(1, B.duck + dt * 3.5); }
    else if (B.mode === "deflate" || B.mode === "sag") { const d = clamp(B.t / (B.mode === "sag" ? 2.6 : 1.8), 0, 1); B.kx = lerp(1, .5, ease(d)); B.ky = lerp(1, .36, ease(d)); B.vy += (B.mode === "sag" ? 46 : 70) * dt * d; B.oy += (14 + B.vy) * dt; B.duck = Math.min(.55, B.duck + dt); }
    else if (B.mode === "abduct") { B.vy -= 520 * dt; B.oy += B.vy * dt; B.duck = Math.min(.4, B.duck + dt); }
    else if (B.mode === "launch") { B.oy = lerp(OY0, 0, ease(clamp(B.t / 2.2, 0, 1))); }
  }

  /* ------------------------------------------------------------------ efectos (sin leer el layout; solo dibujo) */
  const FXL = [];
  const add = o => { o.t = 0; if (!o.layer) o.layer = 1; FXL.push(o); return o; };
  function stepFX(dt) { for (let i = FXL.length - 1; i >= 0; i--) { const o = FXL[i]; o.t += dt; if (o.u) o.u(o, dt); if (o.t >= o.life) { if (o.end) o.end(o); FXL.splice(i, 1); } } }
  function drawFX(layer) { for (const o of FXL) if (o.layer === layer && o.d) o.d(o); }
  function liveCols() { return M.livs[BC.liv].c.concat(["#fffbe8", "#ffd95a"]); }
  function shreds(x, y, n, cols, a, power) { power = power || 1; for (let i = 0; i < n; i++) add({ life: 2 + rnd() * 1.4, x, y, vx: (rnd() - .5) * 260 * power, vy: (-60 - rnd() * 220) * power, w: 2 + ((rnd() * 4) | 0), h: 1 + ((rnd() * 3) | 0), col: cols[(rnd() * cols.length) | 0], a, u: (o, dt) => { o.vy += 170 * dt; o.vx *= 1 - .9 * dt; o.vy *= 1 - .5 * dt; o.x += o.vx * dt; o.y += o.vy * dt; }, d: o => fr(o.x, o.y, o.w, o.h, o.col, o.a * (1 - o.t / o.life * .7)) }); }
  function ring(x, y, col, R, life, a) { add({ life, d: o => { const r = 3 + (R - 3) * easeOut(o.t / o.life), n = Math.max(12, (r * 5) | 0); ctx.globalAlpha = a * (1 - o.t / o.life); ctx.fillStyle = col; for (let i = 0; i < n; i++) { const an = i / n * 6.2832; ctx.fillRect(Math.round(x + Math.cos(an) * r), Math.round(y + Math.sin(an) * r * .86), 2, 2); } ctx.globalAlpha = 1; } }); }
  function puffs(x, y, n, spread, a) { for (let i = 0; i < n; i++) add({ life: .9 + rnd() * .6, x: x + (rnd() - .5) * spread, y: y + (rnd() - .5) * spread * .8, vx: (rnd() - .5) * 40, vy: -10 - rnd() * 30, delay: rnd() * .12, u: (o, dt) => { o.x += o.vx * dt; o.y += o.vy * dt; }, d: o => { if (o.t < o.delay) return; const q = (o.t - o.delay) / (o.life - o.delay), im = IMG["puff_" + (q < .25 ? 0 : q < .6 ? 1 : 2)]; spr(im, o.x - im.width / 2, o.y - im.height / 2, { a: a * (1 - q * q), k: .7 }); } }); }
  function coinRain(n) { for (let i = 0; i < n; i++) add({ life: 2.4, x: rnd() * WD, y: -14 - rnd() * 140, vy: 90 + rnd() * 150, ph: rnd() * 6, u: (o, dt) => { o.y += o.vy * dt; }, d: o => spr(IMG.coin_flat, o.x + Math.sin(o.t * 5 + o.ph) * 3, o.y, { k: 0 }) }); }
  function lineFx(ax, ay, bx, by, cols, a) { const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) | 0; for (let i = 0; i <= n; i++) { const t = i / n, x = lerp(ax, bx, t), y = lerp(ay, by, t); fr(x - 1, y - 1, 4, 3, cols[0], a * .35); fr(x, y, 2, 2, cols[1], a); } }
  function bolt(tx, ty, life, x0) {
    const pts = [], n = 14; let x = x0 == null ? tx + (rnd() - .5) * 70 : x0; for (let i = 0; i <= n; i++) { const t = i / n; pts.push([lerp(x, tx, t) + (i && i < n ? (rnd() - .5) * 22 : 0), lerp(-6, ty, t)]); }
    add({ life, d: o => { const a = 1 - o.t / o.life; for (let i = 0; i < pts.length - 1; i++) lineFx(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], ["#ffe96a", "#ffffff"], a); } });
  }
  function birdFx(x0, y0, x1, y1, dur, arc, k) { return add({ life: dur, d: o => { const p = o.t / o.life, x = lerp(x0, x1, p), y = lerp(y0, y1, p) + (arc || 0) * Math.sin(Math.PI * p); spr(IMG["bird_" + (((o.t * 16) | 0) % 4)], x - 5, y - 3, { k: k == null ? .3 : k }); } }); }
  function meteorFx(x0, y0, x1, y1, dur, delay, big) {
    add({ life: dur + (delay || 0), d: o => { const tt = o.t - (delay || 0); if (tt < 0) return; const p = tt / dur, x = lerp(x0, x1, p), y = lerp(y0, y1, p), dx = x0 - x1, dy = y0 - y1, len = Math.hypot(dx, dy), tl = big ? 34 : 22;
      for (let i = 0; i < tl; i++) { const q = i / tl; if (i % 2 && q > .35) continue; ctx.globalAlpha = (1 - q) * .9; ctx.fillStyle = q < .25 ? "#ffd95a" : q < .6 ? "#ff9a3c" : "#e8283a"; ctx.fillRect(Math.round(x + dx / len * i * 1.1), Math.round(y + dy / len * i * 1.1), q < .3 ? 3 : 2, q < .3 ? 3 : 2); }
      ctx.globalAlpha = 1; fr(x - 2, y - 1, 5, 3, "#ffe03a"); fr(x - 1, y - 2, 3, 5, "#fffbe8"); } });
  }
  function hailFx(tx, ty, delay, bounce) {
    const sx = tx + 44 + rnd() * 10, sy = ty - 72;
    add({ life: delay + .75, u: o => { if (!o.hit && o.t >= delay + .18) { o.hit = 1; sfx.tick(); } }, d: o => { if (o.t < delay) return; const p = clamp((o.t - delay) / .18, 0, 1);
      if (p < 1) { fr(lerp(sx, tx, p), lerp(sy, ty, p), 3, 3, "#e4ebff"); fr(lerp(sx, tx, p), lerp(sy, ty, p), 2, 2, "#ffffff"); }
      else { const q = (o.t - delay - .18) / .5; if (q < 1) { if (bounce) fr(tx + q * 34, ty - Math.sin(Math.PI * q) * 16 + q * 10, 3, 3, "#e4ebff", 1 - q); else { fr(tx - 3 - q * 4, ty - q * 5, 2, 2, "#fff", 1 - q); fr(tx + 3 + q * 4, ty - q * 5, 2, 2, "#fff", 1 - q); fr(tx, ty - q * 8, 2, 2, "#b4ecff", 1 - q); } } } } });
  }
  function ufoFx(x0, y0, x1, y1, dur, o2) {
    o2 = o2 || {};
    return add({ life: dur + (o2.hold || 0), d: o => { const p = clamp(o.t / dur, 0, 1), e = easeOut(p), x = lerp(x0, x1, e), y = lerp(y0, y1, e) + Math.sin(o.t * 6) * 1.5; o.x = x; o.y = y;
      if (o2.beam && o.t >= dur * .85) { const bw = 10 + Math.min(1, (o.t - dur * .85) * 6) * 34, by = o2.beamTo || 230; for (let r = y + 12; r < by; r += 2) { const w = bw * ((r - y) / (by - y)) + 6; fr(x - w / 2, r, w, 1, "#9af8ff", .24); fr(x - w / 2, r + 1, w, 1, "#9af8ff", .1); } }
      spr(IMG.ufo, x - 20, y - 9, { k: .35 }); } });
  }
  const hatFx = (x, y) => add({ life: 3, x, y, vx: (rnd() - .3) * 70, vy: -150, u: (o, dt) => { o.vy += 300 * dt; o.x += o.vx * dt; o.y += o.vy * dt; }, d: o => ctx.drawImage(IMG.head_n, 0, 0, 36, 17, Math.round(o.x), Math.round(o.y), 36, 17) });

  /* ------------------------------------------------------------------ eventos de ambiente (decorado; independientes del reventon) */
  function spawnEvent(id) {
    const dir = rnd() < .5 ? 1 : -1, yTop = 20 + rnd() * 60;
    if (id === "bandada") { const n = 7; add({ life: 11, d: o => { const p = o.t / o.life, x0 = dir > 0 ? -60 + p * (WD + 120) : WD + 60 - p * (WD + 120); for (let i = 0; i < n; i++) { const k = (i + 1) >> 1, side = i % 2 ? 1 : -1, bx = x0 - dir * k * 14, by = yTop + 40 + k * 7 * side + Math.sin(o.t * 1.5) * 4 + (Sn.A - o.a0) * .6; spr(IMG["bird_" + ((((o.t * 7) | 0) + i) % 4)], bx, by, { k: .3 }); } }, a0: Sn.A }); }
    else if (id === "avion") { add({ life: 12, a0: Sn.A, d: o => { const p = o.t / o.life, x = dir > 0 ? -60 + p * (WD + 120) : WD + 60 - p * (WD + 120), y = yTop + 10 + (Sn.A - o.a0) * .5; for (let i = 0; i < 90; i += 2) fr(x - dir * (24 + i), y + 6, 2, 1, "#ffffff", (1 - i / 90) * .75); ctx.save(); if (dir < 0) { ctx.translate(Math.round(x) * 2 + 46, 0); ctx.scale(-1, 1); } spr(IMG.plane, dir < 0 ? Math.round(x) : x, y, { k: .5 }); ctx.restore(); } }); }
    else if (id === "globos") { for (let i = 0; i < 3; i++) { const ox = 40 + rnd() * 540, oy = 40 + rnd() * 70, im = IMG["sb_" + ((rnd() * 8) | 0)]; add({ life: 14, a0: Sn.A, d: o => spr(im, ox + Math.sin(o.t * .4 + i) * 12 + o.t * 3 * dir, oy + (Sn.A - o.a0) * (.35 + i * .06) - o.t * 2, { k: .7 }) }); } }
    else if (id === "ovni") { const y = 30 + rnd() * 60; ufoFx(dir > 0 ? -40 : WD + 40, y, dir > 0 ? WD + 40 : -40, y + 20, 5.2, {}).ex = 1; sfx.ufo(); }
    else if (id === "zeppelin") { add({ life: 18, a0: Sn.A, d: o => { const p = o.t / o.life, x = dir > 0 ? -90 + p * (WD + 180) : WD + 90 - p * (WD + 180), y = 50 + yTop * .5 + (Sn.A - o.a0) * .45; ctx.save(); if (dir < 0) { ctx.translate(Math.round(x) * 2 + 74, 0); ctx.scale(-1, 1); } spr(IMG.zeppelin, dir < 0 ? Math.round(x) : x, y, { k: .5 }); ctx.restore(); } }); }
    else if (id === "meteoros") { for (let i = 0; i < 7; i++) { const x0 = 80 + rnd() * 500, y0 = 6 + rnd() * 50; meteorFx(x0, y0, x0 - 90, y0 + 60, .7 + rnd() * .3, i * (.7 + rnd() * .9), false); } sfx.swoosh(); }
  }

  /* ------------------------------------------------------------------ reventones (con su aviso de <= 0,14 s) y falsas alarmas (el mismo repertorio, sin consecuencias) */
  const tgt = () => { const p = balloonPos(BC); return { x: p.x, y: p.y }; };
  function pop(g, mega) {
    const p = tgt(), a = g ? .55 : 1;
    shreds(p.x, p.y + 30, g ? 34 : 74, liveCols(), a, mega ? 1.35 : 1); ring(p.x, p.y + 40, "#fff6c8", mega ? 70 : 54, .5, a); puffs(p.x, p.y + 44, g ? 5 : 10, 56, a);
    BC.mode = "pop"; BC.envHide = true; BC.vy = -50; BC.hatOff = true; hatFx(p.x - 18, p.y + ENVH + GAP - 30);
    sfx.pop(g); if (!g) { kick(12, 650); wash("rgba(255,255,255,.55)"); }
  }
  const BURST = {
    pajaro: { approach() { const p = tgt(); birdFx(-12, p.y - 50, p.x - 34, p.y + 24, TT.BURSTS[0].lead, 8); sfx.bird(); }, contact(g) { const p = tgt(); shreds(p.x - 34, p.y + 24, 12, ["#2a1456", "#6a4cc0"], g ? .5 : 1, .7); pop(g); } },
    rayo: { approach() {}, contact(g) { const p = tgt(); bolt(p.x + 6, p.y + 8, .3); sfx.zap(); if (!g) wash("rgba(255,255,255,.9)"); pop(g, true); } },
    granizo: { approach() { const p = tgt(); for (let i = 0; i < 7; i++) hailFx(p.x - 30 + rnd() * 60, p.y + 8 + rnd() * 50, rnd() * .12, false); }, contact(g) { const p = tgt(); for (let i = 0; i < 5; i++) hailFx(p.x - 26 + rnd() * 52, p.y + 10 + rnd() * 40, i * .02, false); pop(g); } },
    meteorito: { approach() { const p = tgt(); meteorFx(p.x + 150, p.y - 70, p.x + 14, p.y + 30, TT.BURSTS[3].lead, 0, true); sfx.swoosh(); }, contact(g) { const p = tgt(); ring(p.x + 14, p.y + 30, "#ff9a3c", 80, .6, g ? .5 : 1); if (!g) wash("rgba(255,150,60,.7)"); pop(g, true); } },
    costura: { approach() {}, contact(g) { const p = tgt(); lineFx(p.x - 2, p.y + 4, p.x + 3, p.y + 70, ["#fffbe8", "#ffffff"], 1); sfx.rip(); pop(g); } },
    fuga: { approach() {}, contact(g) { BC.mode = "deflate"; BC.t = 0; BC.vy = 0; const p = tgt(); for (let i = 0; i < 18; i++) add({ life: 1.5 + rnd() * .3, delay: i * .08, d: o => { if (o.t < o.delay) return; const q = (o.t - o.delay) / 1.4, pp = tgt(); fr(pp.x - 40 - q * 34, pp.y + 40 + q * 14 + Math.sin(q * 9) * 3, 3, 2, "#e4ebff", (1 - q) * .8); } }); sfx.hiss(1.8, g); puffs(p.x - 36, p.y + 40, 4, 10, g ? .5 : 1); } },
    quemador: { approach() {}, contact(g) { BC.flameOn = 0; BC.mode = "sag"; BC.t = 0; BC.vy = 0; const p = tgt(); puffs(p.x, p.y + ENVH + 8, 6, 14, g ? .5 : 1); sfx.cough(true, g); } },
    ovni: { approach() { const p = tgt(); F.ufo = ufoFx(p.x + 160, -20, p.x, 6, TT.BURSTS[7].lead + .02, { beam: true, hold: 2.6, beamTo: p.y + 210 }); sfx.ufo(); }, contact(g) { BC.mode = "abduct"; BC.vy = -10; BC.t = 0; sfx.beam(g); } },
  };
  const ALARM = {   // fast = aviso rapido (parecido al de verdad); si no, mas lento y a la vista
    pajaro(fast) { const p = tgt(), d = fast ? .16 + rnd() * .1 : .6 + rnd() * .7, side = rnd() < .5 ? -1 : 1; birdFx(p.x - 260 * side, p.y - 30 - rnd() * 40, p.x + 200 * side, p.y - 10 + rnd() * 60, d + .35, 18); sfx.bird(); },
    rayo() { const p = tgt(), x = p.x + (rnd() < .5 ? -1 : 1) * (130 + rnd() * 160); bolt(x, 118 + rnd() * 40, .26); sfx.zap(.5); wash("rgba(255,255,255,.28)"); add({ life: 1.6, delay: .5 + rnd() * .6, u: o => { if (!o.th && o.t >= o.delay) { o.th = 1; sfx.thunder(); } } }); },
    granizo() { const p = tgt(); for (let i = 0; i < 4; i++) hailFx(p.x - 28 + rnd() * 56, p.y + 6 + rnd() * 54, i * (.08 + rnd() * .12), true); },
    meteorito() { const x0 = 60 + rnd() * 520, y0 = 10 + rnd() * 40; meteorFx(x0, y0, x0 - 130, y0 + 90, .9 + rnd() * .5, 0, false); sfx.swoosh(); },
    costura() { BC.stretch = 1; sfx.creak(); },
    fuga() { const p = tgt(); for (let i = 0; i < 7; i++) add({ life: .7, delay: i * .05, d: o => { if (o.t < o.delay) return; const q = (o.t - o.delay) / .55; fr(p.x + 36 + q * 24, p.y + 54 - q * 6, 3, 2, "#e4ebff", (1 - q) * .8); } }); sfx.hiss(.5, true); },
    quemador() { BC.cough = .4; sfx.cough(false); },
    ovni(fast) { const y = 24 + rnd() * 70, dir = rnd() < .5 ? 1 : -1; ufoFx(dir > 0 ? -40 : WD + 40, y, dir > 0 ? WD + 40 : -40, y + 24, fast ? 1.0 : 3.2, {}); sfx.ufo(); },
  };
  function alarm() {
    const i = pick("alarm", TT.ALARMS.length, -1); F.alarms.push(i);
    ALARM[TT.ALARMS[i].id](rnd() < .45);
  }

  /* ------------------------------------------------------------------ carrete: sorteo sin repetir los 2 ultimos y con mas peso a los menos vistos */
  const REEL = {};
  function pick(kind, n, forced) {
    const r = REEL[kind] || (REEL[kind] = { n, seen: Array(n).fill(0), last: [] }); let i;
    if (forced != null && forced >= 0) i = forced;
    else { const cand = []; let tot = 0; for (let k = 0; k < n; k++) { if (r.last.includes(k) && n > 3) continue; const w = 1 / Math.pow(1 + r.seen[k], 1.6); cand.push([k, w]); tot += w; } let x = rnd() * tot; i = cand[cand.length - 1][0]; for (const [k, w] of cand) { x -= w; if (x <= 0) { i = k; break; } } }
    r.seen[i]++; r.last.unshift(i); r.last.length = Math.min(2, r.last.length); renderReel(); return i;
  }

  /* ------------------------------------------------------------------ sonido: WebAudio sintetizado (en el juego, el motor de js/audio.js) */
  const AU = { ctx: null, init() { if (!ST.sound) return null; if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (this.ctx.state === "suspended") this.ctx.resume(); return this.ctx; } };
  const env = (g, t, a, v, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); };
  function tone(f0, f1, d, type, v, delay) { const c = AU.init(); if (!c) return; const t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + d); env(g, t, 0.004, v, d); o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05); }
  function noise(d, v, hp, delay, lp, sweep) { const c = AU.init(); if (!c) return; const t = c.currentTime + (delay || 0), n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = lp ? "lowpass" : "highpass"; f.frequency.setValueAtTime(lp || hp, t); if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + d); env(g, t, 0.006, v, d); s.connect(f).connect(g).connect(c.destination); s.start(t); }
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24], hz_ = (b, s) => b * Math.pow(2, s / 12);
  const sfx = {
    tick() { noise(.03, .09, 3000); tone(1700, 1200, .04, "square", .02); },
    ui() { tone(520 + rnd() * 30, 780, .05, "triangle", .03); },
    count(i) { tone(330 * Math.pow(2, i * 0.16), 0, .22, "triangle", .1); noise(.25, .05, 500, 0, 1400); },
    go() { tone(220, 880, .5, "sawtooth", .08); noise(.7, .12, 400, 0, 1600, 3000); tone(1046, 1046, .5, "triangle", .08, .08); },
    whoosh(v) { noise(.45, (v || .1), 300, 0, 900, 2200); },
    swoosh() { noise(.5, .05, 1200, 0, 3000, 600); },
    bird() { tone(1800, 2600, .07, "square", .03); tone(2200, 3000, .07, "square", .03, .09); },
    zap(k) { noise(.2, .22 * (k || 1), 2000); tone(90, 40, .3, "sawtooth", .16 * (k || 1)); },
    thunder() { noise(1.6, .14, 0, 0, 300, 60); },
    ufo() { tone(500, 900, .5, "sine", .05); tone(700, 300, .6, "triangle", .04, .1); },
    beam(g) { tone(300, 1500, 1.6, "sine", g ? .04 : .09); noise(1.2, g ? .03 : .08, 1000, 0, 4000, 9000); },
    creak() { tone(140, 95, .25, "sawtooth", .05); tone(180, 120, .22, "sawtooth", .04, .12); noise(.3, .03, 2500); },
    hiss(d, g) { noise(d, g ? .06 : .13, 3500, 0, 0, 0); tone(500, 120, d, "sine", g ? .02 : .05); },
    cough(dead, g) { noise(.12, .12, 500, 0, 1000); tone(120, 60, .2, "sine", .1); if (dead) { tone(300, 70, 1.4, "sawtooth", g ? .03 : .08, .1); } else { noise(.2, .1, 500, .22, 1200); } },
    rip() { noise(.25, .25, 2500, 0, 0, 0); tone(200, 60, .3, "sawtooth", .12); },
    pop(g) { const v = g ? .4 : 1; noise(.5, .35 * v, 600, 0, 0, 0); tone(180, 40, .5, "sine", .5 * v); tone(2200, 300, .25, "square", .08 * v); noise(1.0, .12 * v, 0, .05, 900, 120); if (!g) tone(90, 30, 1.2, "sine", .3, .1); },
    cash(l) {
      const b = 440 * Math.pow(2, (rnd() * 3 - 1.5) / 12), steps = [[0, 7, 12], [0, 4, 7, 12], [0, 4, 7, 12, 16, 19], [0, 4, 7, 12, 16, 19, 24, 28]][l];
      steps.forEach((s, i) => tone(hz_(b, s), hz_(b, s), .55 + l * .12, "triangle", .1 + l * .02, i * (.075 - l * .006)));
      if (l >= 1) tone(hz_(b, 0) / 2, hz_(b, 0) / 2, .8, "sawtooth", .04 + l * .02, .1); if (l >= 2) { noise(.6, .09, 4000, .05); tone(hz_(b, 12), hz_(b, 12), 1.2, "sine", .06, .3); }
      if (l >= 3) { noise(1.4, .16, 800, 0, 0, 0); [0, 7, 12, 16, 19, 24].forEach((s, i) => tone(hz_(b, s) * 2, hz_(b, s) * 2, .5, "square", .035, .5 + i * .09)); tone(55, 40, 1.4, "sine", .4); }
      for (let i = 0; i < l * 4 + 2; i++) tone(2400 + rnd() * 1500, 2000, .06, "square", .018, .1 + i * (.05 + rnd() * .04));
    },
    engine: { on: false, nodes: null, start() { const c = AU.init(); if (!c || this.on) return; this.on = true; const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(); o1.type = "sine"; o2.type = "triangle"; o2.detune.value = 7; g.gain.value = 0.0001; o1.connect(g); o2.connect(g); g.connect(c.destination); o1.start(); o2.start(); this.nodes = { o1, o2, g }; },
      set(p) { if (!this.nodes) return; const c = AU.ctx, f = 160 * Math.pow(2, p * 2.7), t = c.currentTime; this.nodes.o1.frequency.setTargetAtTime(f, t, .08); this.nodes.o2.frequency.setTargetAtTime(f * 1.5, t, .08); this.nodes.g.gain.setTargetAtTime(.012 + p * .028, t, .1); },
      stop() { if (!this.nodes) return; const c = AU.ctx, t = c.currentTime; this.nodes.g.gain.setTargetAtTime(0.0001, t, .05); const n = this.nodes; setTimeout(() => { try { n.o1.stop(); n.o2.stop(); } catch (e) {} }, 400); this.nodes = null; this.on = false; } },
  };

  /* ------------------------------------------------------------------ pantalla: temblor, lavados, bombillas */
  let shk = { amp: 0, t0: 0, ms: 1 };
  function kick(amp, ms) { if (ST.reduce) return; shk = { amp, t0: performance.now(), ms }; }
  function wash(col) { if (ST.reduce) return; const w = $("#gbWash"); w.style.setProperty("--wc", col); w.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, easing: "ease-out" }); }
  function applyShake(now) {
    let a = 0; const e = now - shk.t0; if (e < shk.ms) a = shk.amp * (1 - e / shk.ms);
    if (F && ST.phase === "fly" && Sn.p > .42 && !ST.reduce) a += (Sn.p - .42) * 9;    // temblor continuo que crece con la altura (desde ~x8)
    const dx = a > .3 ? Math.round((rnd() * 2 - 1) * a) : 0, dy = a > .3 ? Math.round((rnd() * 2 - 1) * a) : 0; shakeEl.style.transform = dx || dy ? `translate(${dx}px,${dy}px)` : "";
  }

  /* ------------------------------------------------------------------ voz del crupier */
  let bubbleT = 0, faceT = 0, lastLine = {};
  const setFace = f => { $("#gbDealer").src = IC + "dealer_" + f + ".webp"; if (BC) BC.face = f === "laugh" ? "l" : "n"; };
  function say(text, face, gest) {
    $("#gbBubbleTx").textContent = text; $("#gbBubble").classList.add("on");
    if (face) setFace(face); clearTimeout(faceT); faceT = setTimeout(() => setFace("neutral"), 2600);
    const d = $("#gbDealer"); d.className = "gb-dealer"; if (gest && !ST.reduce) { void d.offsetWidth; d.classList.add("g-" + gest); }
    clearTimeout(bubbleT); bubbleT = setTimeout(() => $("#gbBubble").classList.remove("on"), 1800 + 22 * text.length + 1000);    // siempre 1 s mas en pantalla
  }
  function react(key) {
    const a = L().say[key], rx = TT.RX[key]; let i; do { i = (rnd() * a.length) | 0; } while (a.length > 1 && lastLine[key] === i); lastLine[key] = i;
    say(a[i], rx.f[(rnd() * rx.f.length) | 0], rx.g[(rnd() * rx.g.length) | 0]); REACTSEEN[key] = (REACTSEEN[key] || 0) + 1; renderRx();
  }
  const REACTSEEN = {};

  /* ------------------------------------------------------------------ preparacion de cada vuelo (el carrete) y de la escena */
  let NEXT = null;
  function prepNext() {
    const f = ST.f;
    NEXT = { sky: pick("sky", TT.SKIES.length, f.sky), burst: pick("burst", TT.BURSTS.length, f.burst), event: pick("event", TT.EVENTS.length, f.event), liv: pick("liv", M.livs.length, f.liv) };
    const th = TT.SKIES[NEXT.sky]; const lat = -42 + rnd() * 60, w = (rnd() * 3) | 0;
    Sn = { A: 0, p: 0, th, row0: (w * 960 + (90 - (lat + 21.5)) * 5.3333 + RING) % RING };
    CL = genClouds(th); STARS = Array.from({ length: 170 }, () => ({ x: (rnd() * WD) | 0, y: (rnd() * (HY - 4)) | 0, a: .35 + rnd() * .65, ph: rnd() * 6.28, c: rnd() < .2 ? "#ffe9a6" : rnd() < .3 ? "#b4ecff" : "#ffffff", big: rnd() < .08 }));
    BC = newB(); BC.liv = NEXT.liv; BL = null; FXL.length = 0; hud(); renderReel();
  }

  /* ------------------------------------------------------------------ el vuelo */
  const fmtX = m => "×" + (Math.floor(m / 10) / 100).toFixed(2).replace(".", ST.lang === "es" ? "," : ".");
  const tier = m => (m < 1500 ? 0 : m < 3000 ? 1 : m < 10000 ? 2 : 3);
  async function play() {
    if (ST.phase !== "idle") return; AU.init();
    if (ST.bal < ST.stake) ST.bal = 100;
    ST.bal -= ST.stake; ST.plays++;
    const seed = (Math.random() * 4294967296) >>> 0, dr = C.draw(seed), X = ST.f.x != null ? ST.f.x : dr.x;
    F = { seed, X, r2: dr.r2, tB: C.tOf(X + 1), stake: ST.stake, auto: ST.autoM, t: 0, m: 1000, cashed: false, cashM: 0, cashT: 0, pay: 0, kind: TT.BURSTS[NEXT.burst].id, lead: TT.BURSTS[NEXT.burst].lead, fatal: false,
      nextAlarm: 1.3 + rnd() * 1.5, alarms: [], events: [{ at: .8 + rnd() * 4, kind: TT.EVENTS[NEXT.event].id }, { at: 8 + rnd() * 12, kind: TT.EVENTS[(NEXT.event + 1 + ((rnd() * 5) | 0)) % TT.EVENTS.length].id }], tickAcc: 0, blastAt: 1, burstTier: 0 };
    if (F.X <= 1000) F.lead = Math.min(F.lead, F.tB);
    $("#gbTicket").textContent = `Semilla ${seed} · punto de reventón ${fmtX(X)} (${(X / 1000).toFixed(3)}) · umbral de redondeo r = ${dr.r2.toFixed(4)} · presentación: ${nm(TT.SKIES[NEXT.sky])} / ${nm(TT.BURSTS[NEXT.burst])} / ${nm(TT.EVENTS[NEXT.event])} / globo ${nm(M.livs[NEXT.liv])}${ST.f.x != null ? " · (forzado)" : ""}`;
    hud(); ST.phase = "count"; frame.classList.add("fast"); setBtn(); setRes(false); $("#gbGhostLbl").classList.remove("on"); $("#gbMult").classList.remove("ghost");
    react("intro"); BC.mode = "ok"; BC.oy = OY0; BC.blast = 1; sfx.go();
    for (let i = 0; i < 3; i++) { const el = $("#gbCount"); el.textContent = L().count[i]; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); sfx.count(i); BC.blast = 1; await sleep(800 / ST.speed); }
    const el = $("#gbCount"); el.textContent = L().count[3]; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); sfx.go(); BC.blast = 1; BC.mode = "launch"; BC.t = 0;
    ST.phase = "fly"; frame.classList.remove("fast"); setBtn(); sfx.engine.start(); await sleep(600 / ST.speed);
  }
  function stepFlight(dt) {
    if (ST.phase !== "fly") { Sn.A += (Sn.dv || 0) * dt; Sn.dv = (Sn.dv || 0) * Math.exp(-2.2 * dt); return; }
    F.t += dt; const m = Math.min(C.CAP, C.mOf(F.t)); F.m = m; const v = 34 + 1.3 * F.t; Sn.dv = v; Sn.A += v * dt; Sn.p = Math.log(m / 1000) / Math.log(100);
    if (!F.cashed && F.auto && m >= F.auto && F.auto <= F.X) cash(F.auto, "auto");
    if (F.X >= C.CAP && m >= C.CAP) { ceiling(); return; }
    if (F.t >= F.nextAlarm) { alarm(); F.nextAlarm = F.t + 1.2 + (-Math.log(1 - rnd())) / 0.22; }      // falsas alarmas: Poisson, independientes del punto de reventon
    for (const e of F.events) if (!e.done && F.t >= e.at) { e.done = true; spawnEvent(e.kind); }
    if (F.t >= F.blastAt) { BC.blast = 1; if (!F.cashed || true) sfx.whoosh(F.cashed ? .03 : .08 + Sn.p * .04); F.blastAt = F.t + 1.2 + rnd() * 1.8; }
    F.tickAcc += dt * (2.2 + 9 * Sn.p); if (F.tickAcc >= 1) { F.tickAcc -= 1; if (!F.cashed) sfx.tick(); }      // pitidos de tension: dependen SOLO del multiplicador
    if (!F.fatal && F.t >= F.tB - F.lead && F.X < C.CAP) { F.fatal = true; BURST[F.kind].approach(); }
    if (F.t >= F.tB && F.X < C.CAP) { burst(); return; }
    if (!F.cashed) sfx.engine.set(Sn.p);
    if (!F.cashed && F.t > 4 && rnd() < dt / 7 && !$("#gbBubble").classList.contains("on")) react("fly");
  }
  function cash(mm, how) {
    if (ST.phase !== "fly" || F.cashed) return;
    const m = Math.min(mm || C.mOf(F.t), F.X); F.cashed = true; F.cashM = m; F.cashT = F.t; F.pay = C.payout(F.stake, m, F.r2); ST.bal += F.pay;
    BL = { B: Object.assign(newB(), { liv: BC.liv, oy: 0, face: "l", mode: "ok" }), t: 0 }; BL.B.oy = BC.oy; BC.ghost = true; sfx.engine.stop();
    const l = tier(m); F.lvl = l; sfx.cash(l); const amp = [3, 6, 12, 22][l]; kick(amp, [250, 450, 700, 1100][l]); wash(["rgba(255,217,90,.25)", "rgba(255,217,90,.4)", "rgba(255,217,90,.6)", "rgba(255,240,170,.85)"][l]); coinRain([4, 14, 34, 80][l]);
    if (l >= 2) frame.classList.add("fast"), setTimeout(() => frame.classList.remove("fast"), 900 + l * 500);
    react(how === "auto" ? "auto" : how === "ceiling" ? "ceiling" : "cash" + l);
    $("#gbGhostLbl").textContent = L().ghost; $("#gbGhostLbl").classList.add("on"); $("#gbMult").classList.add("ghost");
    showPlate(F.pay >= F.stake ? "" : "lose", how === "ceiling" ? L().plate.ceil : L().plate.cash, fmtX(m), (F.pay >= 0 ? "+" : "") + F.pay + "  (" + (F.pay - F.stake >= 0 ? "+" : "−") + Math.abs(F.pay - F.stake) + ")");
    hud(); setBtn();
  }
  function ceiling() {   // el techo x100: si no habias cobrado, se cobra solo a x100; el globo sale al espacio
    F.t = C.tOf(C.CAP); F.m = C.CAP; if (!F.cashed) cash(C.CAP, "ceiling"); ST.phase = "burst"; ST.hist.unshift({ x: C.CAP }); ST.hist.length = Math.min(ST.hist.length, 9);
    BC.mode = "abduct"; BC.vy = -30; BC.t = 0; BC.duck = 0; sfx.engine.stop(); wash("rgba(180,220,255,.7)"); kick(8, 500); sfx.cash(3);
    finishSoon();
  }
  function burst() {
    F.t = F.tB; F.m = F.X; ST.phase = "burst"; const g = F.cashed; sfx.engine.stop(); BURST[F.kind].contact(g);
    ST.hist.unshift({ x: F.X }); ST.hist.length = Math.min(ST.hist.length, 9);
    if (!g) { showPlate("lose", L().plate.lose, fmtX(F.X), "−" + F.stake); react(F.X <= 1000 ? "burst100" : F.X >= 10000 ? "burstHigh" : "burst"); }
    else { const dt = F.t - F.cashT; setTimeout(() => { if (dt < .6) react("closeCall"); else if (F.X >= 3 * F.cashM && F.X >= 5000) react("regret"); else if (F.X <= 1.25 * F.cashM) react("relief"); }, 1300); }
    hud(); setBtn(); finishSoon();
  }
  function finishSoon() { setTimeout(() => { ST.phase = "idle"; BL = null; $("#gbMult").classList.remove("ghost"); $("#gbGhostLbl").classList.remove("on"); prepNext(); setBtn(); }, 4300 / ST.speed + (F.cashed ? 600 : 0)); }

  /* ------------------------------------------------------------------ HUD */
  const last = {}; const setT = (id, v) => { if (last[id] !== v) { last[id] = v; $(id).textContent = v; } };
  function hud() {
    $("#gbPillStake").innerHTML = `<i></i><span>${L().pill} <b>${ST.stake}</b></span>`; $("#gbPillAuto").innerHTML = `<span>${L().auto} <b>${ST.autoM ? fmtX(ST.autoM) : L().off}</b></span>`;
    const si = REEL.sky, idx = NEXT ? NEXT.sky : 0; $("#gbVuelo").textContent = `${L().vuelo} ${idx + 1} ${L().of} ${TT.SKIES.length} · ${nm(TT.SKIES[idx])}`;
    const cb = $("#gbCardStake"); if (cb) cb.textContent = ST.stake; renderHist();
  }
  function renderHist() { $("#gbHist").innerHTML = ST.hist.slice(0, 7).map(h => `<span class="${h.x < 2000 ? "lo" : h.x < 10000 ? "mid" : "hi"}">${fmtX(h.x)}</span>`).join(""); }
  function setBtn() {
    const b = $("#gbBtn"), A = $("#gbBtnA"), B = $("#gbBtnB"); let cls = "gb-btn", a = "", s = "";
    if (ST.phase === "idle") { cls += " go"; a = L().go; s = `${L().ready.split("·")[1] || ""}`.trim() || ""; s = ST.lang === "es" ? "ficha " + ST.stake : "stake " + ST.stake; }
    else if (ST.phase === "count") { cls += " off"; a = "…"; s = ""; }
    else if (ST.phase === "fly" && !F.cashed) { cls += " cash"; a = L().cashBtn; s = ""; }
    else { cls += " off"; a = F && F.cashed ? L().cashed : L().burst; s = F && F.cashed ? "+" + F.pay : ""; }
    if (b.className !== cls) b.className = cls; setT("#gbBtnA", a); setT("#gbBtnB", s);
  }
  function setRes(on) { $("#gbRes").classList.toggle("on", on); }
  function showPlate(kind, name, extra, msg) { const p = $("#gbPlate"); p.className = "gb-plate " + kind; p.innerHTML = `<b>${name}</b><i>${extra}</i>`; $("#gbMsg").textContent = msg; const r = $("#gbRes"); r.classList.remove("on"); void r.offsetWidth; r.classList.add("on"); }
  const MC = ["#ffffff", "#ffe9a6", "#ffc23a", "#ff8a3a", "#ff5a7a"], MG = ["rgba(255,255,255,.25)", "rgba(255,233,166,.4)", "rgba(255,194,58,.5)", "rgba(255,138,58,.6)", "rgba(255,90,122,.7)"];
  const E = {}; ["#gbMult", "#gbAltFill", "#gbFlagCash", "#gbFlagGhost", "#gbVig", "#gbBubble"].forEach(k => (E[k] = $(k)));
  const lastS = {}; const setP = (el, k, v) => { if (lastS[k] !== v) { lastS[k] = v; el.style.setProperty(k, v); } };
  function hudFrame() {
    const m = ST.phase === "idle" || ST.phase === "count" ? 1000 : F.m, p = clamp(Math.log(Math.max(1000, m) / 1000) / Math.log(100), 0, 1);
    setT("#gbMult", fmtX(m)); const mx = E["#gbMult"], ti = m < 1500 ? 0 : m < 3000 ? 1 : m < 10000 ? 2 : m < 30000 ? 3 : 4;
    if (ST.phase === "burst" && F && !F.cashed) { setP(mx, "--mc", "#ff6470"); setP(mx, "--mg", "rgba(255,60,80,.6)"); } else { setP(mx, "--mc", F && F.cashed ? "#d8e8ff" : MC[ti]); setP(mx, "--mg", MG[ti]); }
    E["#gbAltFill"].style.transform = `scaleY(${p.toFixed(4)})`; setT("#gbAltKm", `${L().km} ${(p * 100).toFixed(1)} km`);
    const fc = E["#gbFlagCash"], fg = E["#gbFlagGhost"];
    if (F && F.cashed) { fc.style.opacity = 1; fc.style.transform = `translateY(${-(Math.log(F.cashM / 1000) / Math.log(100)) * 592 - 4}px)`; } else fc.style.opacity = 0;
    if (F && F.cashed && ST.phase === "fly") { fg.style.opacity = .9; fg.style.transform = `translateY(${-p * 592 - 4}px)`; } else fg.style.opacity = 0;
    const vg = ST.phase === "fly" ? clamp((Sn.p - .22) * 1.1, 0, .6) + Math.sin(T * (2 + Sn.p * 9)) * .06 * Sn.p : 0; E["#gbVig"].style.setProperty("--vg", vg.toFixed(3));
    if (ST.phase === "fly" && !F.cashed) setT("#gbBtnB", "+" + C.payout(F.stake, m, F.r2));
    if (ST.phase === "fly") setT("#gbSub", "");
    else if (ST.phase === "idle") setT("#gbSub", L().ready);
    else if (ST.phase === "count") setT("#gbSub", "");
  }

  /* ------------------------------------------------------------------ bucle */
  let lastT = performance.now(); const PERF = { r: 0 };
  function render() {
    const S = skyState(Sn.th, Sn.p); SC = S; drawSky(S); drawStars(S); drawAurora(S); drawSunMoon(S);
    drawClouds(0); drawGround(S); drawClouds(1); drawFX(0);
    if (BL) drawBalloon(BL.B, 1);
    drawBalloon(BC, BC.ghost ? .4 : 1);
    drawClouds(2); drawFX(1);
    if (S.storm > .08) { for (let i = 0; i < 90; i++) { const x = (i * 37.7 + T * 70) % WD, y = ((i * 91.3 + T * 480) % (HT + 20)) - 10; fr(x, y, 1, 4, "#b4c8ee", .5 * S.storm); } }
  }
  function frameLoop(now) {
    requestAnimationFrame(frameLoop);
    const dtR = Math.min(.05, (now - lastT) / 1000); lastT = now; T += dtR; const dt = dtR * ST.speed;
    if (ST.phase === "count") { BC.oy = OY0; }
    stepFlight(dt); stepBalloon(BC, dt); if (BL) { BL.t += dt; stepBalloon(BL.B, dt); const u = clamp(BL.t / 3.6, 0, 1), e = ease(u); BL.B.ox = 250 * e; BL.B.oy = BC.oy * (1 - e) + 170 * e; BL.B.flameOn = u < .9; if (u >= 1) BL = null; }
    stepFX(dt);
    if (ST.phase === "idle" && Sn.th.w === "storm" && rnd() < dtR * .25) { bolt(80 + rnd() * 480, 120 + rnd() * 20, .2); wash("rgba(255,255,255,.2)"); }
    const t0 = performance.now(); render(); PERF.r = PERF.r * .95 + (performance.now() - t0) * .05; hudFrame(); applyShake(now);
  }

  /* ------------------------------------------------------------------ pagina: carta de la Barra, controles, tablas, carrete */
  function cards() {
    const t = L().card, cn = `<img class="ic ic-coin cn" src="${IC}coin.webp" alt="" draggable="false">`, ico = (id, src) => `<span class="sp-ic"><img class="ic ic-${id}" src="${src || IC + id + ".webp"}" alt="" draggable="false"></span>`;
    $("#gbCards").innerHTML =
      `<div class="sup bet cas bt-red">${ico("bet_red")}<span class="sp-t"><b>${t.red}</b><i>${t.redS}</i></span><span class="bt-pick"><button class="bt-c bt-cr" type="button">${t.redB}</button><button class="bt-c bt-cb" type="button">${t.blackB}</button><button class="bt-c bt-cg" type="button">${t.greenB}</button><em class="sp-p">${cn}2</em></span></div>` +
      `<div class="sup bet cas bt-coin">${ico("bet_coin")}<span class="sp-t"><b>${t.coin}</b><i>${t.coinS}</i></span><span class="bt-pick"><button class="bt-c bt-ch" type="button">${t.heads}</button><button class="bt-c bt-ct" type="button">${t.tails}</button><em class="sp-p bt-stake">${cn}2</em></span></div>` +
      `<div class="sup bet cas bt-wheel">${ico("bet_wheel")}<span class="sp-t"><b>${t.wheel}</b><i>${t.wheelS}</i></span><span class="bt-pick"><button class="bt-c bt-cs" type="button">${t.spin}</button><em class="sp-p">${cn}4</em></span></div>` +
      `<div class="sup bet cas bt-globo" id="gbCardG">${ico("bet_globo", "out/bet_globo.webp")}<span class="sp-t"><b>${t.n}</b><i>${t.s}</i></span><span class="bt-pick"><button class="bt-c bt-gl" type="button" id="gbCardPlay">${t.play}</button><em class="sp-p bt-stake" id="gbCardStakeBtn">${cn}<span id="gbCardStake">${ST.stake}</span></em></span></div>`;
    $("#gbCardPlay").onclick = () => { wrap.scrollIntoView({ behavior: "smooth", block: "center" }); play(); };
    $("#gbCardStakeBtn").onclick = () => cycleStake();
  }
  const STAKES = [2, 5, 10]; function cycleStake() { if (ST.phase !== "idle") return; ST.stake = STAKES[(STAKES.indexOf(ST.stake) + 1) % 3]; document.querySelectorAll("#gbSegStake button").forEach(b => b.classList.toggle("on", +b.dataset.v === ST.stake)); sfx.ui(); hud(); setBtn(); }
  const AUTOS = [0, 1500, 2000, 3000, 5000, 10000]; function cycleAuto() { if (ST.phase !== "idle") return; ST.autoM = AUTOS[(AUTOS.indexOf(ST.autoM) + 1) % AUTOS.length]; document.querySelectorAll("#gbSegAuto button").forEach(b => b.classList.toggle("on", +b.dataset.v === ST.autoM)); sfx.ui(); hud(); }
  function wireSeg(id, cb) { document.querySelectorAll(id + " button").forEach(b => (b.onclick = () => { document.querySelectorAll(id + " button").forEach(x => x.classList.remove("on")); b.classList.add("on"); cb(b.dataset.v); })); }
  const act = () => { if (ST.phase === "idle") play(); else if (ST.phase === "fly" && !F.cashed) cash(0, "manual"); };
  function fillSel(id, items, key) { const s = $(id); s.innerHTML = `<option value="-1">al azar (carrete)</option>` + items.map((it, i) => `<option value="${i}">${i + 1} · ${it.es}</option>`).join(""); s.onchange = () => { ST.f[key] = +s.value; if (ST.phase === "idle") prepNext(); }; }
  function renderTables() {
    if (!RT) return; const f = (v, d = 2) => v.toFixed(d).replace(".", ","), pc = v => f(v, v < 1 ? 3 : v < 10 ? 2 : 1);
    $("#gbTabP").innerHTML = `<tr><th>×</th><th>P(llega a ×)</th><th>1 de cada</th><th>RTP si cobras ahí</th><th>σ por ficha</th></tr>` + RT.rows.map(r => `<tr><td>×${f(r.x, r.x < 1.01 ? 3 : 2)}</td><td>${pc(r.pct)} %</td><td>${f(r.oneIn, 1)}</td><td>${f(r.ev * 100, 4)} %</td><td>${f(r.sd, 2)}</td></tr>`).join("");
    $("#gbListTope").innerHTML = `<li><b>Reventón a ×1,000</b> (al despegar, sin tiempo de cobrar): P = 1 − 0,97/1,001 = <b>${f(RT.p1 * 100, 4)} %</b> (1 de cada ${f(1 / RT.p1, 1)}). Cobro mínimo posible: ×1,001.</li>
      <li><b>Mediana</b> del reventón: ×${f(RT.median, 2)} (la mitad de los vuelos revienta antes de ×1,94). <b>E[X] con tope</b> = ×${f(RT.ex, 3)}.</li>
      <li><b>Tope ×100</b>: llegar al techo ocurre 1 vez de cada ${f(100 / 0.97, 1)} vuelos (0,97 %). El globo sale al espacio y se cobra solo a ×100 (ficha 10 → 1000 monedas).</li>
      <li><b>Efecto del tope en el RTP: ninguno</b>. Como P(X ≥ x) = 0,97/x vale para todo x ≤ 100 y el techo cobra exactamente ×100, cobrar a cualquier objetivo ≤ ×100 da 0,97 con o sin tope. Sin tope el pago máximo no tendría límite y E[X] sería infinita; el tope solo acota la varianza (σ de cobrar a ×100 = 9,8 fichas por vuelo) y el premio máximo.</li>
      <li><b>Suma de todas las probabilidades</b> del reventón: ${RT.sum.toFixed(12)}.</li>`;
    const R = RT.rules; $("#gbTabR").innerHTML = `<tr><th>Ficha</th><th>Redondear hacia abajo</th><th>Al más cercano</th><th>Sembrado</th></tr>` + [2, 5, 10].map(s => `<tr><td>${s}</td><td>${f(R[s].floor.min * 100, 1)} – ${f(R[s].floor.max * 100, 1)} %</td><td>${f(R[s].nearest.min * 100, 1)} – ${f(R[s].nearest.max * 100, 1)} %</td><td>${f(R[s].seeded.max * 100, 4)} %</td></tr>`).join("");
    const t = RT.test; $("#gbTestN").textContent = (t.N / 1e6).toFixed(0) + " M";
    $("#gbListTest").innerHTML = `<li>χ² de la distribución del reventón (9 g.l., crítico 95 % = 16,92): <b>${f(t.chi, 2)}</b> ✔ · χ² del umbral de redondeo r (9 g.l.): <b>${f(t.chir, 2)}</b> ✔ · correlación ln X ↔ r: <b>${t.corr.toFixed(5)}</b> (independientes).</li>` +
      Object.keys(t.mc).map(k => `<li>Cobrar siempre a ×${f(k / 1000, 1)} (ficha 5, pago entero sembrado): RTP medido <b>${f(t.mc[k].rtp * 100, 3)} %</b> (esperado 97,000 %, z = ${f(t.mc[k].z, 2)}).</li>`).join("");
  }
  function renderReel() {
    const box = $("#gbReel"); if (!box) return; const sec = (title, items, kind, extra) => { const r = REEL[kind] || { seen: [] }; return `<div class="mq-lst"><h4>${title}</h4><ol>${items.map((it, i) => `<li>${nm(it)} <em>${extra ? extra(it) : ""}</em> <span class="n">×${r.seen[i] || 0}</span></li>`).join("")}</ol></div>`; };
    box.innerHTML = sec(`Vuelos (cielo) · ${TT.SKIES.length}`, TT.SKIES, "sky", s => (s.w ? s.w : s.aurora ? "aurora" : "")) + sec(`Reventones · ${TT.BURSTS.length}`, TT.BURSTS, "burst", b => (b.lead ? "aviso " + b.lead + " s" : "sin aviso")) + sec(`Falsas alarmas (azar libre) · ${TT.ALARMS.length}`, TT.ALARMS, "alarm") +
      sec(`Eventos de ambiente · ${TT.EVENTS.length}`, TT.EVENTS, "event") + sec(`Globos · ${M.livs.length}`, M.livs, "liv") +
      `<div class="mq-lst"><h4>Reglas</h4><ul><li>Cada carrete sortea sin repetir los 2 últimos y con peso 1/(1+vistos)^1,6.</li><li>Combinaciones de un vuelo: ${TT.SKIES.length} × ${TT.BURSTS.length} × ${TT.EVENTS.length} × ${M.livs.length} = <b>${TT.SKIES.length * TT.BURSTS.length * TT.EVENTS.length * M.livs.length}</b>, más 2 eventos de ambiente y las falsas alarmas al azar.</li><li>Nada del carrete depende del punto de reventón ni de la ficha.</li></ul></div>`;
  }
  function renderRx() {
    const box = $("#gbRx"); if (!box) return; const keys = Object.keys(TT.es.say); let n = 0;
    box.innerHTML = keys.map(k => { n += TT.es.say[k].length; return `<div class="mq-lst"><h4>${TT.RXNAME[k]} <em>×${REACTSEEN[k] || 0}</em></h4><em>cara ${TT.RX[k].f.join(" / ")} · gesto ${TT.RX[k].g.join(" / ")}</em><ol>${TT.es.say[k].map(s => `<li>${s}</li>`).join("")}</ol></div>`; }).join("");
    $("#gbRxCount").textContent = `${keys.length} situaciones × 6 frases = ${n} frases en ES y otras ${n} en EN`;
  }

  /* ------------------------------------------------------------------ arranque */
  wireSeg("#gbSegStake", v => { ST.stake = +v; sfx.ui(); hud(); setBtn(); });
  wireSeg("#gbSegAuto", v => { ST.autoM = +v; sfx.ui(); hud(); });
  wireSeg("#gbSegLang", v => { ST.lang = v; document.documentElement.lang = v; cards(); hud(); setBtn(); });
  wireSeg("#gbSegSpeed", v => { ST.speed = +v; });
  $("#gbChkReduce").onchange = e => { ST.reduce = e.target.checked; document.documentElement.classList.toggle("reduce-motion", ST.reduce); };
  $("#gbChkSound").onchange = e => { ST.sound = e.target.checked; if (!ST.sound) sfx.engine.stop(); };
  $("#gbBtnFull").onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else wrap.requestFullscreen && wrap.requestFullscreen(); };
  $("#gbBtn").onclick = act; $("#gbPillStake").onclick = cycleStake; $("#gbPillAuto").onclick = cycleAuto;
  $("#gbSelX").onchange = e => { ST.f.x = e.target.value === "" ? null : +e.target.value; };
  addEventListener("keydown", e => { if (e.target.matches("input,textarea,select")) return; if (e.key === " " || e.key === "Enter") { if (e.target.closest && e.target.closest("button") && e.target !== $("#gbBtn")) return; e.preventDefault(); act(); } });
  fillSel("#gbSelSky", TT.SKIES, "sky"); fillSel("#gbSelBurst", TT.BURSTS, "burst"); fillSel("#gbSelEvent", TT.EVENTS, "event"); fillSel("#gbSelLiv", M.livs, "liv");

  // pruebas: window.__gb
  window.__gb = { ST, phase: () => ST.phase, F: () => F, m: () => (F ? F.m : 0), cashed: () => !!(F && F.cashed), p: () => Sn && Sn.p, cash: () => cash(0, "manual"), play, force: o => Object.assign(ST.f, o), speed: v => (ST.speed = v), prep: prepNext, say, react, kick, setStake: v => { ST.stake = v; hud(); setBtn(); }, setAuto: v => { ST.autoM = v; hud(); }, FXL, Sn: () => Sn, BC: () => BC, setA: a => { Sn.A = a; Sn.p = Math.log(Math.max(1000, C.mOf(0)) / 1000); }, setP: p => { Sn.p = p; Sn.A = Math.max(Sn.A, p * 1000); }, perf: () => PERF.r };
  $("#gbAltTicks").innerHTML = [2, 5, 10, 25, 50, 100].map(x => `<span style="bottom:${(Math.log(x) / Math.log(100) * 592 + 4).toFixed(1)}px">×${x}</span>`).join("");
  loadAll().then(() => { cards(); fit(); renderTables(); renderRx(); prepNext(); hud(); setBtn(); requestAnimationFrame(frameLoop); window.__gbReady = true; });
})();
