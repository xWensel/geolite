/* Geolite - El globo (v0.2.51): juego de CRASH del centro de la Barra (se registra en adventure.js con A.adv.casino.add; textos en js/casino-globo-textos.js).
   Un globo aerostatico sube sobre el mapa de la Tierra y el multiplicador sube con el: hay que COBRAR antes de que reviente. Eliges la ficha (2 / 5 / 10) y, si quieres, AUTO (cobra solo al llegar a x1,5 / 2 / 3 / 5 / 10).
   MATEMATICA (exacta; tools/art/globo/rtp.cjs): el punto de reventon X sale de la semilla ANTES de volar: u en (0,1], X = clamp(floor(970 / u), 1000, 100000) milesimas. P(el globo llega a x) = 0,97 / x para x entre x1,001 y x100:
   cobrar a CUALQUIER multiplicador fijo (o con AUTO) devuelve el 97,0000 % exacto y ninguna regla de parada sin ver el futuro lo mejora. Si llega a x100 (1 de cada 103) sale al espacio y se cobra solo a x100 (ficha 10 = 1000 monedas);
   el techo no cambia el retorno. El pago es entero con redondeo SEMBRADO (floor + 1 si la parte fraccionaria supera r, el segundo numero de la semilla): la esperanza es exacta para cualquier ficha y multiplicador.
   La velocidad es R = 0,23 (el multiplicador sube como exp(R t): x2 a 3 s, x10 a 10 s, x100 a 20 s; la decision del usuario fue "mas agil", sin tocar el retorno).
   SIN PISTAS: las falsas alarmas (el mismo repertorio visual que los reventones, sin consecuencias) salen de un proceso de Poisson independiente de X; el aviso de un reventon real dura <= 0,14 s; los pitidos de tension solo dependen
   del multiplicador. Recargar la pagina a mitad de vuelo = el globo revento (la ficha ya estaba pagada y el punto de reventon, guardado). Escena a 640x360 nativos mostrada a un factor ENTERO n (x3 en 1920x1080). */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const CS = A.adv && A.adv.casino, TX = A.gbTx; if (!CS || !TX) return;
  const L6 = A.L6, tr = o => A.tx(o), U = {}, LN = {}, LAST = {};
  for (const k in TX.ui) U[k] = L6(TX.ui[k]);
  for (const k in TX.lines) LN[k] = TX.lines[k].map(s => L6(s));
  const BET = { n: L6(TX.bet.n), d: L6(TX.bet.d), s: L6(TX.bet.s), ico: "bet_globo" };
  const rnd = Math.random, clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
  const ease = p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2), easeOut = p => 1 - Math.pow(1 - p, 3);
  const WD = 640, HT = 360, HY = 130, GH = HT - HY, SKYR = HY + 60, RING = 2880, FMAP = 0.32;
  const ENVW = 78, ENVH = 88, GAP = 54, EX = 9, EY = 30, BW = 96, BH = 196, CXB = 48, CRX = 320, CRY = 76, OY0 = 64;
  const LIVS = [{ id: "crupier", c: ["#e8283a", "#f6e2b8", "#e8283a"] }, { id: "cielo", c: ["#4ab4f5", "#f6e2b8", "#4ab4f5"] }, { id: "arcoiris", c: ["#e8283a", "#ff9a3c", "#ffe03a"] }, { id: "esmeralda", c: ["#2cc47c", "#f6e2b8", "#2cc47c"] },
    { id: "ciruela", c: ["#9a5ce8", "#d6ceee", "#9a5ce8"] }, { id: "atardecer", c: ["#ff9a3c", "#ffe03a", "#ff9a3c"] }, { id: "medianoche", c: ["#4a2eb0", "#f5a623", "#4a2eb0"] }, { id: "caramelo", c: ["#ff6aa6", "#7aeccc", "#ff6aa6"] }];
  const M = { livs: LIVS };
  /* el carrete: 10 cielos (la linea de tiempo del dia recorrida a su ritmo), 8 reventones, 8 falsas alarmas, 6 eventos de ambiente y 8 libreas; nada depende del punto de reventon ni de la ficha */
  const SKIES = [{ id: "mediodia", t0: 0.26, dt: 0.62, w: "", clouds: 1 }, { id: "amanecer", t0: 0.0, dt: 0.55, w: "", clouds: 0.8 }, { id: "atardecer", t0: 0.48, dt: 0.42, w: "", clouds: 1 }, { id: "horaazul", t0: 0.74, dt: 0.24, w: "", clouds: 0.8 },
    { id: "tormenta", t0: 0.30, dt: 0.62, w: "storm", clouds: 1.5 }, { id: "aurora", t0: 0.93, dt: 0.07, w: "", aurora: 1, clouds: 0.3 }, { id: "luna", t0: 0.90, dt: 0.10, w: "", clouds: 0.4 }, { id: "niebla", t0: 0.16, dt: 0.55, w: "fog", clouds: 1.4 },
    { id: "cumulos", t0: 0.30, dt: 0.60, w: "", clouds: 2.0 }, { id: "crepusculo", t0: 0.66, dt: 0.30, w: "", clouds: 0.9 }];
  const BURSTS = [{ id: "pajaro", lead: 0.14 }, { id: "rayo", lead: 0 }, { id: "granizo", lead: 0.14 }, { id: "meteorito", lead: 0.12 }, { id: "costura", lead: 0 }, { id: "fuga", lead: 0 }, { id: "quemador", lead: 0 }, { id: "ovni", lead: 0.14 }];
  const LEAD = {}; BURSTS.forEach(b => (LEAD[b.id] = b.lead));
  const ALARM_IDS = ["pajaro", "rayo", "granizo", "meteorito", "costura", "fuga", "quemador", "ovni"], EVENT_IDS = ["bandada", "avion", "globos", "ovni", "zeppelin", "meteoros"];
  /* situacion -> caras y gestos del rig (A.crupier.list() / A.crupier.gestures()) */
  const FACE = { neutral: "sly", laugh: "laugh", shock: "shock", angry: "angry" }, GEST = { nod: "nod", lean: "lean_in", hop: "hat_pop", bounce: "hat_pop", shake: "tremble_body", zoom: "head_tilt" };
  const RX = { gbIntro: [["neutral"], ["nod"]], gbFly: [["neutral", "laugh"], ["nod", "lean"]], gbCash0: [["neutral"], ["nod"]], gbCash1: [["laugh", "neutral"], ["nod", "hop"]], gbCash2: [["laugh", "shock"], ["hop", "bounce"]], gbCash3: [["shock", "angry"], ["shake", "zoom"]],
    gbBurst: [["laugh"], ["hop", "lean"]], gbBurst100: [["laugh", "shock"], ["bounce", "zoom"]], gbBurstHigh: [["laugh", "angry"], ["lean", "shake"]], gbCloseCall: [["angry", "shock"], ["shake", "zoom"]], gbRegret: [["laugh"], ["lean", "nod"]],
    gbRelief: [["neutral", "shock"], ["nod", "lean"]], gbAuto: [["neutral", "laugh"], ["nod"]], gbCeiling: [["shock"], ["zoom", "shake"]] };
  const COMMA = new Set(["es", "es-419", "fr", "pt", "de", "it", "ru", "pl"]);
  const fmtX = m => "×" + (Math.floor(m / 10) / 100).toFixed(2).replace(".", COMMA.has(A.lang) ? "," : ".");
  const fill = (o, m) => tr(o).replace(/\{(\w+)\}/g, (s, k) => (m[k] != null ? m[k] : s));
  const pick1 = a => a[Math.floor(rnd() * a.length)];

  /* ------------------------------------------------------------------ el punto de reventon y el pago: el MISMO codigo que prueba tools/art/globo/rtp.cjs (con R mas agil y A.rng en vez de mulberry32 + hash propios) */
  const R = 0.23, KT = R / 0.135, CAP = 100000, RTPK = 970;   // KT: cuanto mas deprisa corre este vuelo que el de la maqueta (R = 0,135): el desplazamiento del mapa se escala igual para que la altura a cada multiplicador no cambie
  function draw(key) {
    const u0 = A.rng(key), u = 1 - u0();                                                  // (0, 1]
    return { x: Math.min(CAP, Math.max(1000, Math.floor(RTPK / u))), r2: u0() };
  }
  const payout = (stake, m, r2) => { const v = stake * m, f = Math.floor(v / 1000), fr = (v % 1000) / 1000; return f + (fr > r2 ? 1 : 0); };   // moneda entera: floor + 1 si la fraccion supera r2 (esperanza exacta = ficha x m)
  const tOf = k => Math.log(k / 1000) / R, mOf = t => Math.min(CAP, Math.floor(1000 * Math.exp(R * t) + 1e-9));

  /* ------------------------------------------------------------------ imagenes (se cargan una vez) */
  const IMG = {};
  const NAMES = [].concat(LIVS.map(l => "env_" + l.id), ["basket", "burner", "glow", "head_n", "head_l", "plane", "zeppelin", "ufo", "sun", "moon", "haze", "coin_flat", "world_map", "world_peaks", "world_lights"],
    [0, 1, 2, 3].map(i => "flame_" + i), [0, 1, 2, 3, 4, 5].map(i => "cloud_" + i), [0, 1, 2].map(i => "storm_" + i), [0, 1, 2, 3].map(i => "bird_" + i), [0, 1, 2, 3, 4, 5, 6, 7].map(i => "sb_" + i), [0, 1, 2].map(i => "puff_" + i));
  let imgP = null;
  const loadAll = () => imgP || (imgP = Promise.all(NAMES.map(n => new Promise(res => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => { try { console.error("globo: falta " + n); } catch (e) { /* nada */ } res(); }; im.src = `assets/globo/${n}.png`; }))));

  /* ------------------------------------------------------------------ la carta de la Barra y su cableado */
  let stakeI = 0, autoI = 0;
  const AUTOS = [0, 1500, 2000, 3000, 5000, 10000];
  const histOf = () => { const a = A.profile.get().adv; return (a.gbHist = Array.isArray(a.gbHist) ? a.gbHist : []); };
  CS.add({ id: "globo", bet: BET,
    card(cx) {
      loadAll(); const b = cx.b;
      if (b && b.id === "globo" && b.att === cx.att) return `<div class="sup bet cas bt-globo done ${b.pay > b.stake ? "win" : "lose"}" data-bet="globo">${cx.head}<em class="bt-res"><b>${b.cashM ? fmtX(b.cashM) : tr(U.burst) + " " + fmtX(b.X)}</b>${b.pay ? "+" + b.pay : ""}</em></div>`;
      return `<div class="sup bet cas bt-globo" data-bet="globo">${cx.head}<span class="bt-pick"><button class="bt-c bt-gl" type="button" data-play="1">${tr(U.play)}</button><em class="sp-p bt-stake" role="button" tabindex="0">${cx.CN()}${cx.coinCost(stakeI)}</em></span></div>`;
    },
    wire(el, cx) {
      const pill = el.querySelector(".bt-stake");
      if (pill) pill.onclick = e => { e.stopPropagation(); stakeI = (stakeI + 1) % cx.STAKES.length; pill.innerHTML = cx.CN() + cx.coinCost(stakeI); A.sfx.tick(1); };
      const btn = el.querySelector("[data-play]"); if (!btn) return;
      btn.onclick = e => {
        e.stopPropagation(); if (cx.open) return; if (cx.run.coins < cx.coinCost(0)) { A.sfx.deny(); cx.shake(el); return; }
        A.sfx.rouBet(1); if (A.haptic) A.haptic([10]);
        spinGlobo({ cx }, () => { const run = cx.run; if (!run || A.core.S.phase !== "shop" || !run.stock) return; cx.refresh(); });   // la ficha se paga al DESPEGAR, dentro de la pantalla
      };
    },
  });

  /* ------------------------------------------------------------------ la pantalla */
  function spinGlobo(o, done) {
    const cx = o.cx, TST = A.adv._globo || {}, run = cx.run;
    const html = `<div class="gb-stage"><div class="gb-shake">
        <canvas class="gb-cv" width="640" height="360"></canvas><div class="gb-vig"></div>
        <div class="gb-top"><div class="gb-ghostlbl"></div><div class="gb-mult">×1,00</div><div class="gb-sub"></div></div><div class="gb-res"><span class="gb-plate"></span><span class="gb-msg"></span></div>
        <div class="gb-left"><div class="gb-pill gb-click gb-pstake"></div><div class="gb-pill gb-click gb-pauto"></div><button class="gb-back" type="button"></button></div>
        <div class="gb-alt"><div class="gb-alt-track"><div class="gb-alt-fill"></div></div><div class="gb-alt-ticks"></div><i class="gb-flag cash"></i><i class="gb-flag ghost"></i><b class="gb-alt-km"></b></div>
        <div class="gb-dealerbox"></div><div class="gb-bubble"><span></span></div>
        <button class="gb-btn go" type="button"><b class="gb-btnA"></b><i class="gb-btnB"></i></button><div class="gb-hist"></div><div class="gb-count"></div></div>
      <div class="gb-frame"><i class="rou-lights top"></i><i class="rou-lights bot"></i><i class="gb-vl l"></i><i class="gb-vl r"></i></div></div><div class="gb-dealer"></div>`;
    let rig = null;
    const sh = cx.rouShell("globo", html, {}, () => { try { A.dealer.hold(false); } catch (e) { /* sin crupier */ } try { A.sfx.gbEngine.stop(); } catch (e) { /* nada */ } try { rig && rig.destroy && rig.destroy(); } catch (e) { /* nada */ } done(); });
    if (!sh) return;
    try { A.dealer.hold(true); } catch (e) { /* sin crupier */ }                                  // el crupier de la esquina calla: aqui habla el de la mesa
    const ov = sh.ov, stage = ov.querySelector(".gb-stage"), reduced = sh.reduced, Q = s => ov.querySelector(s), CANCEL = {};
    ov.classList.remove("spin");
    const alive = () => !sh.closed && ov.isConnected;
    const sleep = ms => new Promise((res, rej) => setTimeout(() => (alive() ? res() : rej(CANCEL)), ms));
    const dealerHost = Q(".gb-dealer"), frameEl = Q(".gb-frame");
    function fit() {                                                                            // el canvas (640x360) se muestra a un factor ENTERO n; el escenario de 1920x1080 se escala con n/3 para que siempre lo llene
      const W = ov.clientWidth || innerWidth, H = ov.clientHeight || innerHeight, n = Math.max(1, Math.floor(Math.min(W / WD, H / HT))), s = n / 3, ox = Math.round((W - 1920 * s) / 2), oy = Math.round((H - 1080 * s) / 2);
      stage.style.transform = `translate(${ox}px,${oy}px) scale(${s})`;
      const sn = A.crupier.snap(312 * s), box = 312 * s, css = sn.css || box;                   // el crupier a pixel entero de pantalla: fuera del escenario escalado, dentro de su marco
      dealerHost.style.cssText = `left:${ox + 44 * s + (box - css) / 2}px;top:${oy + (1080 - 44 - 312) * s + (box - css) / 2}px;width:${css}px;height:${css}px`;
    }
    fit(); const onResize = () => { if (ov.isConnected) fit(); }; addEventListener("resize", onResize);

    /* ---- la escena: lienzos, cielo, mapa, nubes, globo, efectos (de la maqueta aprobada, tal cual) ---- */
    const cv = Q(".gb-cv"), ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; return [c, x]; };
    const [gcv, gctx] = mk(WD, GH), [hzcv, hz] = mk(WD, 44), [tcv, tctx] = mk(260, 80), [bcv, bc] = mk(BW, BH);
    const skyImg = ctx.createImageData(WD, SKYR), sky32 = new Uint32Array(skyImg.data.buffer);
    let F = null, T = 0, SC = null, Sn = null, BC = null, BL = null, CL = [], STARS = [], rec = null;
    const ST = { phase: "ready", stake: 0, autoM: AUTOS[autoI], lvl: 0 };
    ST.stake = cx.coinCost(stakeI);
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

    /* ---- sonido: los mismos sintetizadores de la maqueta, por el motor del juego (volumen y mute de efectos, A.sfx.gbTone / gbNoise / gbEngine) ---- */
    const tone = (f0, f1, d, type, v, delay) => { try { A.sfx.gbTone(f0, f1 || 0, d, type, v, delay || 0); } catch (e) { /* un fallo de sonido nunca para el vuelo */ } };
    const noise = (d, v, hp, delay, lp, sweep) => { try { A.sfx.gbNoise(d, v, hp || 0, delay || 0, lp || 0, sweep || 0); } catch (e) { /* idem */ } };
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
      engine: { start() { /* el motor arranca con el primer set() */ }, set: p => A.sfx.gbEngine(p), stop: () => A.sfx.gbEngine.stop() },
    };

    /* ---- pantalla: temblor (respeta Vibracion y reducir movimiento), lavados (respetan Destellos suaves) ---- */
    let shk = { amp: 0, t0: 0, ms: 1 };
    const shakeOk = () => !reduced && A.core.S.shake !== false;
    function kick(amp, ms) { if (!shakeOk()) return; shk = { amp, t0: performance.now(), ms }; }
    function wash(col) { if (reduced) return; const soft = document.documentElement.classList.contains("soft-flash"), c = soft ? col.replace(/([\d.]+)\)$/, (m, a) => (+a * 0.4).toFixed(2) + ")") : col, w = Q(".rou-wash"); w.style.setProperty("--wc", c); w.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, easing: "ease-out" }); }
    const shakeEl = Q(".gb-shake");
    function applyShake(now) {
      let a = 0; const e = now - shk.t0; if (e < shk.ms) a = shk.amp * (1 - e / shk.ms);
      if (F && ST.phase === "fly" && Sn.p > .42 && shakeOk()) a += (Sn.p - .42) * 9;           // temblor continuo que crece con la altura (desde ~x8)
      const dx = a > .3 ? Math.round((rnd() * 2 - 1) * a) : 0, dy = a > .3 ? Math.round((rnd() * 2 - 1) * a) : 0; shakeEl.style.transform = dx || dy ? `translate(${dx}px,${dy}px)` : "";
    }

    /* ---- el crupier: sprite animado, globo (siempre 1 s mas en pantalla) y cola (nunca se le corta una frase) ---- */
    const bubble = Q(".gb-bubble"), bTx = bubble.firstChild, SP = { cur: false, pend: null }; let talkIv = 0;
    try { rig = A.crupier.mount(dealerHost, { fidget: !reduced }); rig.set("sly"); } catch (e) { rig = null; }
    const rigSet = f => { if (rig) { try { rig.set(f); } catch (e) { /* nada */ } } }, rigPlay = g => { if (rig && !reduced) { try { rig.play(g); } catch (e) { /* nada */ } } };
    const lineOf = key => { const a = LN[key]; let i = Math.floor(rnd() * a.length); if (i === LAST[key] && a.length > 1) i = (i + 1 + Math.floor(rnd() * (a.length - 1))) % a.length; LAST[key] = i; return tr(a[i]) || ""; };
    function speak(p) {
      SP.cur = true; bTx.textContent = p.text; bubble.classList.add("on"); rigSet(p.face); rigPlay(p.g);
      if (rig) { clearInterval(talkIv); try { rig.talk(true); } catch (e) { /* nada */ } let n = 0; talkIv = setInterval(() => { if (!alive() || ++n > Math.min(60, p.text.length)) { clearInterval(talkIv); try { rig.talk(false); } catch (e) { /* nada */ } return; } try { rig.syl(); } catch (e) { /* nada */ } }, 70); }
      setTimeout(() => { if (!alive()) return; bubble.classList.remove("on"); rigSet("sly"); if (SP.pend) { const n = SP.pend; SP.pend = null; setTimeout(() => alive() && speak(n), 350); } else SP.cur = false; }, 1800 + p.text.length * 22 + (A.dealer.LINGER || 1000));
    }
    function react(key, prio = 4, skipIfBusy) {
      if (skipIfBusy && SP.cur) return; const rx = RX[key], p = { text: lineOf(key), face: FACE[pick1(rx[0])], g: GEST[pick1(rx[1])], prio };
      if (SP.cur) { if (!SP.pend || prio >= SP.pend.prio) SP.pend = p; return; } speak(p);
    }
    const speechIdle = () => new Promise((res, rej) => { const iv = setInterval(() => { if (!alive()) { clearInterval(iv); rej(CANCEL); } else if (!SP.cur && !SP.pend) { clearInterval(iv); res(); } }, 120); });

    /* ---- preparacion del vuelo (el carrete) y de la escena ---- */
    const pickAlarmLast = []; function pickAlarm() { let i; do { i = Math.floor(rnd() * ALARM_IDS.length); } while (pickAlarmLast.includes(i)); pickAlarmLast.unshift(i); pickAlarmLast.length = 2; return i; }
    const idxOf = (list, id) => list.findIndex(x => (x.id || x) === id);
    let NEXT = null;
    function prepNext() {
      const f = TST.f || {}, R2 = (kind, list) => (f[kind] != null && f[kind] >= 0 ? f[kind] : idxOf(list, cx.reelPick("gb" + kind, list.map(x => x.id || x))));
      NEXT = { sky: R2("sky", SKIES), burst: R2("burst", BURSTS), event: R2("event", EVENT_IDS), liv: R2("liv", LIVS) };
      const th = SKIES[NEXT.sky], lat = -42 + rnd() * 60, w = (rnd() * 3) | 0;
      Sn = { A: 0, p: 0, th, row0: (w * 960 + (90 - (lat + 21.5)) * 5.3333 + RING) % RING };
      CL = genClouds(th); STARS = Array.from({ length: 170 }, () => ({ x: (rnd() * WD) | 0, y: (rnd() * (HY - 4)) | 0, a: .35 + rnd() * .65, ph: rnd() * 6.28, c: rnd() < .2 ? "#ffe9a6" : rnd() < .3 ? "#b4ecff" : "#ffffff", big: rnd() < .08 }));
      BC = newB(); BC.liv = NEXT.liv; BL = null; FXL.length = 0;
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
    pajaro: { approach() { const p = tgt(); birdFx(-12, p.y - 50, p.x - 34, p.y + 24, LEAD.pajaro, 8); sfx.bird(); }, contact(g) { const p = tgt(); shreds(p.x - 34, p.y + 24, 12, ["#2a1456", "#6a4cc0"], g ? .5 : 1, .7); pop(g); } },
    rayo: { approach() {}, contact(g) { const p = tgt(); bolt(p.x + 6, p.y + 8, .3); sfx.zap(); if (!g) wash("rgba(255,255,255,.9)"); pop(g, true); } },
    granizo: { approach() { const p = tgt(); for (let i = 0; i < 7; i++) hailFx(p.x - 30 + rnd() * 60, p.y + 8 + rnd() * 50, rnd() * .12, false); }, contact(g) { const p = tgt(); for (let i = 0; i < 5; i++) hailFx(p.x - 26 + rnd() * 52, p.y + 10 + rnd() * 40, i * .02, false); pop(g); } },
    meteorito: { approach() { const p = tgt(); meteorFx(p.x + 150, p.y - 70, p.x + 14, p.y + 30, LEAD.meteorito, 0, true); sfx.swoosh(); }, contact(g) { const p = tgt(); ring(p.x + 14, p.y + 30, "#ff9a3c", 80, .6, g ? .5 : 1); if (!g) wash("rgba(255,150,60,.7)"); pop(g, true); } },
    costura: { approach() {}, contact(g) { const p = tgt(); lineFx(p.x - 2, p.y + 4, p.x + 3, p.y + 70, ["#fffbe8", "#ffffff"], 1); sfx.rip(); pop(g); } },
    fuga: { approach() {}, contact(g) { BC.mode = "deflate"; BC.t = 0; BC.vy = 0; const p = tgt(); for (let i = 0; i < 18; i++) add({ life: 1.5 + rnd() * .3, delay: i * .08, d: o => { if (o.t < o.delay) return; const q = (o.t - o.delay) / 1.4, pp = tgt(); fr(pp.x - 40 - q * 34, pp.y + 40 + q * 14 + Math.sin(q * 9) * 3, 3, 2, "#e4ebff", (1 - q) * .8); } }); sfx.hiss(1.8, g); puffs(p.x - 36, p.y + 40, 4, 10, g ? .5 : 1); } },
    quemador: { approach() {}, contact(g) { BC.flameOn = 0; BC.mode = "sag"; BC.t = 0; BC.vy = 0; const p = tgt(); puffs(p.x, p.y + ENVH + 8, 6, 14, g ? .5 : 1); sfx.cough(true, g); } },
    ovni: { approach() { const p = tgt(); F.ufo = ufoFx(p.x + 160, -20, p.x, 6, LEAD.ovni + .02, { beam: true, hold: 2.6, beamTo: p.y + 210 }); sfx.ufo(); }, contact(g) { BC.mode = "abduct"; BC.vy = -10; BC.t = 0; sfx.beam(g); } },
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
    const i = pickAlarm(); F.alarms.push(i);
    ALARM[ALARM_IDS[i]](rnd() < .45);
  }

    /* ---- el vuelo ---- */
    const tier = m => (m < 1500 ? 0 : m < 3000 ? 1 : m < 10000 ? 2 : 3);
    const mult = Q(".gb-mult"), btn = Q(".gb-btn"), btnA = Q(".gb-btnA"), btnB = Q(".gb-btnB"), subEl = Q(".gb-sub"), resEl = Q(".gb-res");
    const setT = (el, v) => { if (el._v !== v) { el._v = v; el.textContent = v; } };
    async function takeoff() {
      if (ST.phase !== "ready" || !NEXT) return;
      if (run.coins < ST.stake) { A.sfx.deny(); cx.shake(btn); return; }
      const att = run.attempt || 0, dr = draw(`${run.seed}:globo:${cx.r}:${att}`), X = TST.x != null ? TST.x : dr.x;      // _globo.x: solo pruebas
      run.coins -= ST.stake; run.reds = run.reds || {}; rec = run.reds[cx.r] = { id: "globo", att, stake: ST.stake, X, cashM: 0, pay: 0 };           // la ficha ya esta pagada y el punto de reventon, guardado: recargar a media vuelo = reventon
      cx.persist(); { const cb = document.querySelector("#shopCoins b"); if (cb) cb.textContent = run.coins; }
      const bu = BURSTS[NEXT.burst];
      F = { X, r2: dr.r2, tB: tOf(X + 1), stake: ST.stake, auto: ST.autoM, t: 0, m: 1000, cashed: false, cashM: 0, cashT: 0, pay: 0, kind: bu.id, lead: bu.lead, fatal: false,
        nextAlarm: 1.3 + rnd() * 1.5, alarms: [], events: [{ at: .8 + rnd() * 4, kind: EVENT_IDS[NEXT.event] }, { at: 8 + rnd() * 8, kind: EVENT_IDS[(NEXT.event + 1 + ((rnd() * 5) | 0)) % EVENT_IDS.length] }], tickAcc: 0, blastAt: 1, burstTier: 0 };
      if (F.X <= 1000) F.lead = Math.min(F.lead, F.tB);
      ST.phase = "count"; frameEl.classList.add("fast"); setBtn(); Q(".gb-back").hidden = true; Q(".gb-ghostlbl").classList.remove("on"); mult.classList.remove("ghost");
      react("gbIntro", 1); BC.mode = "ok"; BC.oy = OY0; BC.blast = 1; sfx.go();
      const cnt = Q(".gb-count");
      for (let i = 0; i < 3; i++) { cnt.textContent = tr(U["c" + i]); cnt.classList.remove("on"); void cnt.offsetWidth; cnt.classList.add("on"); sfx.count(i); BC.blast = 1; await sleep(800); }
      cnt.textContent = tr(U.c3); cnt.classList.remove("on"); void cnt.offsetWidth; cnt.classList.add("on"); sfx.go(); BC.blast = 1; BC.mode = "launch"; BC.t = 0;
      ST.phase = "fly"; frameEl.classList.remove("fast"); setBtn(); await sleep(600);
    }
    function stepFlight(dt) {
      if (ST.phase !== "fly") { Sn.A += (Sn.dv || 0) * dt; Sn.dv = (Sn.dv || 0) * Math.exp(-2.2 * dt); return; }
      F.t += dt; const m = Math.min(CAP, mOf(F.t)); F.m = m; const v = (34 + 1.3 * F.t * KT) * KT; Sn.dv = v; Sn.A += v * dt; Sn.p = Math.log(m / 1000) / Math.log(100);
      if (!F.cashed && F.auto && m >= F.auto && F.auto <= F.X) cash(F.auto, "auto");
      if (F.X >= CAP && m >= CAP) { ceiling(); return; }
      if (F.t >= F.nextAlarm) { alarm(); F.nextAlarm = F.t + 1.2 + (-Math.log(1 - rnd())) / 0.22; }      // falsas alarmas: Poisson, independientes del punto de reventon
      for (const e of F.events) if (!e.done && F.t >= e.at) { e.done = true; spawnEvent(e.kind); }
      if (F.t >= F.blastAt) { BC.blast = 1; sfx.whoosh(F.cashed ? .03 : .08 + Sn.p * .04); F.blastAt = F.t + 1.2 + rnd() * 1.8; }
      F.tickAcc += dt * (2.2 + 9 * Sn.p); if (F.tickAcc >= 1) { F.tickAcc -= 1; if (!F.cashed) sfx.tick(); }      // pitidos de tension: dependen SOLO del multiplicador
      if (!F.fatal && F.t >= F.tB - F.lead && F.X < CAP) { F.fatal = true; BURST[F.kind].approach(); }
      if (F.t >= F.tB && F.X < CAP) { burst(); return; }
      if (!F.cashed) sfx.engine.set(Sn.p);
      if (!F.cashed && F.t > 4 && rnd() < dt / 7) react("gbFly", 1, true);
    }
    function cash(mm, how) {
      if (ST.phase !== "fly" || F.cashed || F.X <= 1000) return;                                  // al despegar (x1,000) no hay tiempo ni de cobrar
      const m = Math.min(mm || mOf(F.t), F.X); F.cashed = true; F.cashM = m; F.cashT = F.t; F.pay = payout(F.stake, m, F.r2);
      run.coins += F.pay; if (F.pay > F.stake) run.stats.coinsEarned += F.pay - F.stake; rec.cashM = m; rec.pay = F.pay; cx.persist();      // se cobra en el acto: recargar despues no lo deshace
      BL = { B: Object.assign(newB(), { liv: BC.liv, oy: 0, face: "l", mode: "ok" }), t: 0 }; BL.B.oy = BC.oy; BC.ghost = true; sfx.engine.stop();
      const l = tier(m); F.lvl = l; sfx.cash(l); const amp = [3, 6, 12, 22][l]; kick(amp, [250, 450, 700, 1100][l]); wash(["rgba(255,217,90,.25)", "rgba(255,217,90,.4)", "rgba(255,217,90,.6)", "rgba(255,240,170,.85)"][l]); coinRain([4, 14, 34, 80][l]);
      if (l >= 1) { A.sfx.jackpot(l); if (A.core.jpShake) A.core.jpShake(l); if (A.haptic) A.haptic(l >= 3 ? [40, 40, 80] : [30, 30, 60]); }
      if (l >= 2) frameEl.classList.add("fast"), setTimeout(() => frameEl.classList.remove("fast"), 900 + l * 500);
      react(how === "auto" ? "gbAuto" : how === "ceiling" ? "gbCeiling" : "gbCash" + l);
      Q(".gb-ghostlbl").textContent = tr(U.ghost); Q(".gb-ghostlbl").classList.add("on"); mult.classList.add("ghost");
      showPlate(F.pay >= F.stake ? "" : "lose", how === "ceiling" ? tr(U.pCeil) : tr(U.pCash), fmtX(m), "+" + F.pay + "  (" + (F.pay - F.stake >= 0 ? "+" : "−") + Math.abs(F.pay - F.stake) + ")");
      setBtn(); if (!reduced) setTimeout(() => { if (alive() && ST.phase !== "done") { ov.classList.add("skippable"); ov.addEventListener("click", sh.close, { once: true }); } }, 2600);   // despues de cobrar, tocar la pantalla se salta el resto del vuelo
    }
    function ceiling() {                                                                           // el techo x100: si no habias cobrado, se cobra solo a x100; el globo sale al espacio
      F.t = tOf(CAP); F.m = CAP; if (!F.cashed) cash(CAP, "ceiling"); ST.phase = "burst"; pushHist(CAP);
      BC.mode = "abduct"; BC.vy = -30; BC.t = 0; BC.duck = 0; sfx.engine.stop(); wash("rgba(180,220,255,.7)"); kick(8, 500); sfx.cash(3); finishSoon();
    }
    function burst() {
      F.t = F.tB; F.m = F.X; ST.phase = "burst"; const g = F.cashed; sfx.engine.stop(); BURST[F.kind].contact(g); pushHist(F.X);
      if (!g) { showPlate("lose", tr(U.pLose), fmtX(F.X), "−" + F.stake); react(F.X <= 1000 ? "gbBurst100" : F.X >= 10000 ? "gbBurstHigh" : "gbBurst"); }
      else { const dt = F.t - F.cashT; setTimeout(() => { if (!alive()) return; if (dt < .6) react("gbCloseCall"); else if (F.X >= 3 * F.cashM && F.X >= 5000) react("gbRegret"); else if (F.X <= 1.25 * F.cashM) react("gbRelief"); }, 1300); }
      setBtn(); finishSoon();
    }
    function pushHist(x) { const h = histOf(); h.unshift({ x }); h.length = Math.min(h.length, 7); A.profile.save(); renderHist(); }     // el historial solo se actualiza al terminar el vuelo: no delata nada
    async function finishSoon() {
      try { await sleep(F.cashed ? 4900 : 4300); await speechIdle(); } catch (e) { return; }
      ST.phase = "done"; rec.done = true; cx.persist(); sh.hold(1200);
    }
    function showPlate(kind, name, extra, msg) { const p = Q(".gb-plate"); p.className = "gb-plate " + kind; p.innerHTML = `<b>${name}</b><i>${extra}</i>`; Q(".gb-msg").textContent = msg; resEl.classList.remove("on"); void resEl.offsetWidth; resEl.classList.add("on"); }

    /* ---- HUD ---- */
    function renderHist() { Q(".gb-hist").innerHTML = histOf().slice(0, 7).map(h => `<span class="${h.x < 2000 ? "lo" : h.x < 10000 ? "mid" : "hi"}">${fmtX(h.x)}</span>`).join(""); }
    function hud() {
      Q(".gb-pstake").innerHTML = `<i></i><span>${tr(U.labStake)} <b>${ST.stake}</b></span>`; Q(".gb-pauto").innerHTML = `<span>${tr(U.auto)} <b>${ST.autoM ? fmtX(ST.autoM) : tr(U.off)}</b></span>`;
      Q(".gb-pstake").classList.toggle("lock", ST.phase !== "ready"); Q(".gb-pauto").classList.toggle("lock", ST.phase !== "ready"); Q(".gb-back").textContent = tr(U.back); renderHist();
    }
    function setBtn() {
      let cls = "gb-btn", a = "", s = "";
      if (ST.phase === "ready") { cls += " go"; a = tr(U.go); s = fill(U.goSub, { n: ST.stake }); }
      else if (ST.phase === "count") { cls += " off"; a = "…"; }
      else if (ST.phase === "fly" && !F.cashed) { cls += " cash"; a = tr(U.cashBtn); }
      else { cls += " off"; a = F && F.cashed ? tr(U.cashed) : tr(U.burst); s = F && F.cashed ? "+" + F.pay : ""; }
      if (btn.className !== cls) btn.className = cls; setT(btnA, a); setT(btnB, s); hud();
    }
    const MC = ["#ffffff", "#ffe9a6", "#ffc23a", "#ff8a3a", "#ff5a7a"], MG = ["rgba(255,255,255,.25)", "rgba(255,233,166,.4)", "rgba(255,194,58,.5)", "rgba(255,138,58,.6)", "rgba(255,90,122,.7)"];
    const fillEl = Q(".gb-alt-fill"), flagC = Q(".gb-flag.cash"), flagG = Q(".gb-flag.ghost"), vigEl = Q(".gb-vig"), kmEl = Q(".gb-alt-km"); const lastS = {};
    const setP = (el, k, v) => { if (lastS[k] !== v) { lastS[k] = v; el.style.setProperty(k, v); } };
    Q(".gb-alt-ticks").innerHTML = [2, 5, 10, 25, 50, 100].map(x => `<span style="bottom:${(Math.log(x) / Math.log(100) * 592 + 4).toFixed(1)}px">×${x}</span>`).join("");
    function hudFrame() {
      const m = ST.phase === "ready" || ST.phase === "count" ? 1000 : F.m, p = clamp(Math.log(Math.max(1000, m) / 1000) / Math.log(100), 0, 1);
      setT(mult, fmtX(m)); const ti = m < 1500 ? 0 : m < 3000 ? 1 : m < 10000 ? 2 : m < 30000 ? 3 : 4;
      if (ST.phase === "burst" && F && !F.cashed) { setP(mult, "--mc", "#ff6470"); setP(mult, "--mg", "rgba(255,60,80,.6)"); } else { setP(mult, "--mc", F && F.cashed ? "#d8e8ff" : MC[ti]); setP(mult, "--mg", MG[ti]); }
      fillEl.style.transform = `scaleY(${p.toFixed(4)})`; setT(kmEl, `${tr(U.km)} ${(p * 100).toFixed(1)} km`);
      if (F && F.cashed) { flagC.style.opacity = 1; flagC.style.transform = `translateY(${-(Math.log(F.cashM / 1000) / Math.log(100)) * 592 - 4}px)`; } else flagC.style.opacity = 0;
      if (F && F.cashed && ST.phase === "fly") { flagG.style.opacity = .9; flagG.style.transform = `translateY(${-p * 592 - 4}px)`; } else flagG.style.opacity = 0;
      const vg = ST.phase === "fly" ? clamp((Sn.p - .22) * 1.1, 0, .6) + Math.sin(T * (2 + Sn.p * 9)) * .06 * Sn.p : 0; setP(vigEl, "--vg", vg.toFixed(3));
      if (ST.phase === "fly" && !F.cashed) setT(btnB, "+" + payout(F.stake, m, F.r2));
      setT(subEl, ST.phase === "ready" ? tr(U.ready) : "");
    }

    /* ---- bucle ---- */
    let lastT = performance.now();
    function render() {
      const S = skyState(Sn.th, Sn.p); SC = S; drawSky(S); drawStars(S); drawAurora(S); drawSunMoon(S);
      drawClouds(0); drawGround(S); drawClouds(1); drawFX(0);
      if (BL) drawBalloon(BL.B, 1);
      drawBalloon(BC, BC.ghost ? .4 : 1);
      drawClouds(2); drawFX(1);
      if (S.storm > .08) { for (let i = 0; i < 90; i++) { const x = (i * 37.7 + T * 70) % WD, y = ((i * 91.3 + T * 480) % (HT + 20)) - 10; fr(x, y, 1, 4, "#b4c8ee", .5 * S.storm); } }
    }
    function frameLoop(now) {
      if (!alive()) { cleanup(); sh.bail("capa retirada"); return; }
      requestAnimationFrame(frameLoop);
      const dtR = Math.min(.05, (now - lastT) / 1000); lastT = now; T += dtR; const dt = dtR * (TST.speed || 1);
      if (ST.phase === "count" || ST.phase === "ready") BC.oy = OY0;
      stepFlight(dt); stepBalloon(BC, dt); if (BL) { BL.t += dt; stepBalloon(BL.B, dt); const u = clamp(BL.t / 3.6, 0, 1), e = ease(u); BL.B.ox = 250 * e; BL.B.oy = BC.oy * (1 - e) + 170 * e; BL.B.flameOn = u < .9; if (u >= 1) BL = null; }
      stepFX(dt);
      if (ST.phase === "ready" && Sn.th.w === "storm" && rnd() < dtR * .25) { bolt(80 + rnd() * 480, 120 + rnd() * 20, .2); wash("rgba(255,255,255,.2)"); }
      render(); hudFrame(); applyShake(now);
    }

    /* ---- controles: ficha y AUTO (antes de despegar), DESPEGAR / COBRAR (clic, Espacio, Intro, o A del mando), Volver / Esc ---- */
    const cycleStake = () => { if (ST.phase !== "ready") return; stakeI = (stakeI + 1) % cx.STAKES.length; ST.stake = cx.coinCost(stakeI); sfx.ui(); setBtn(); };
    const cycleAuto = () => { if (ST.phase !== "ready") return; autoI = (autoI + 1) % AUTOS.length; ST.autoM = AUTOS[autoI]; sfx.ui(); hud(); };
    const act = () => { if (ST.phase === "ready") takeoff().catch(e => { if (e !== CANCEL) { try { console.error("globo", e); } catch (x) { /* nada */ } sh.bail(e); } }); else if (ST.phase === "fly" && !F.cashed) cash(0, "manual"); };
    btn.onclick = act; Q(".gb-pstake").onclick = cycleStake; Q(".gb-pauto").onclick = cycleAuto; Q(".gb-back").onclick = () => { if (ST.phase === "ready") sh.close(); };
    const onKey = e => { if (!ov.isConnected) return; if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!e.repeat) act(); } else if (e.key === "Escape" && ST.phase === "ready") { e.preventDefault(); sh.close(); }
      else if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); cycleAuto(); }       // teclado puro: A cambia AUTO y S la ficha (antes solo se podia con el raton o el cursor del mando)
      else if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "s" || e.key === "S")) { e.preventDefault(); cycleStake(); } };
    addEventListener("keydown", onKey, true);
    const cleanup = () => { clearInterval(talkIv); removeEventListener("keydown", onKey, true); removeEventListener("resize", onResize); try { A.sfx.gbEngine.stop(); } catch (e) { /* nada */ } };
    TST.st = ST; TST.getF = () => F; TST.cashNow = () => cash(0, "manual"); TST.takeoff = () => takeoff(); TST.sc = () => Sn;

    loadAll().then(() => { if (!alive()) { cleanup(); sh.bail("capa retirada"); return; } prepNext(); setBtn(); requestAnimationFrame(frameLoop); if (TST.auto) setTimeout(() => { if (!alive()) return; if (TST.auto.stake != null) { stakeI = TST.auto.stake; ST.stake = cx.coinCost(stakeI); } if (TST.auto.autoM != null) ST.autoM = TST.auto.autoM; setBtn(); setTimeout(act, 400); }, 600); });
  }

  A.adv._globo = Object.assign(A.adv._globo || {}, { draw, payout, tOf, mOf, R, CAP });   // solo pruebas (dev/): x (reventon forzado en milesimas), f ({ sky, burst, event, liv }), auto ({ stake, autoM }), speed, st, getF, cashNow, takeoff
})(window.AIQ);
