/* Geolite - Rasca y gana (v0.2.52): juego del centro de la Barra (se registra en adventure.js con A.adv.casino.add; textos en js/casino-rasca-textos.js, laminas en js/casino-rasca-arte.js).
   Tarjeta de 3x3 casillas: tres simbolos iguales en cualquier parte = premio segun el simbolo (x2, x3, x5, x10, x25, x100); la ficha (2, 5 o 10) solo multiplica el premio. RTP 96,000 % exacto.
   La semilla decide la tarjeta ENTERA antes de animar nada (`run.seed:rasca:ronda:intento`): rascar, el orden, la presentacion y "Rasca todo" solo ENSENAN un resultado ya decidido y cobrado
   (como la ruleta, la ficha y el premio se pagan al empezar: recargar a medias no lo deshace ni lo cambia). La presentacion de cada tarjeta sale de un carrete de 8 (tema + entrada + orden de
   revelado + efecto de premio; reelPick: nunca las dos ultimas, mas peso a las menos vistas) y no depende ni del resultado ni de la ficha. Escenario de 1920x1080 con el arte a x4 (cada pixel del
   arte = K pixeles de pantalla, K entero); la lamina es un canvas a resolucion nativa (108x146) que se rasca pixel a pixel. */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const CS = A.adv && A.adv.casino, TX = A.rscTx, FOIL = A.rscFoil; if (!CS || !TX || !FOIL) return;
  const L6 = A.L6, tr = o => A.tx(o), U = {}, LN = {}, LAST = {};
  for (const k in TX.ui) U[k] = L6(TX.ui[k]);
  for (const k in TX.lines) LN[k] = TX.lines[k].map(r => ({ t: L6(r[0]), f: r[1], g: r[2] }));
  const BET = { n: L6(TX.bet.n), d: L6(TX.bet.d), s: L6(TX.bet.s), ico: "bet_rasca" };
  const COMMA = new Set(["es", "es-419", "fr", "pt", "de", "it", "ru", "pl"]);
  const rnd = Math.random, lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2), easeOut = p => 1 - Math.pow(1 - p, 3), easeBack = p => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
  const bounce = p => { const n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75; if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375; return n * (p -= 2.625 / d) * p + 0.984375; };
  const AS = "assets/rasca/", SPR = AS + "spr/", IC = "assets/icons/";
  const GEO = { W: 108, H: 146, CELL: 28, FX: 9, FY: 32, GAP: 3 }, K = 4, CX0 = 744, CY0 = 378, NW = GEO.W, NH = GEO.H;   // el arte se muestra a x4; la tarjeta ocupa (744,378) del escenario
  const cellXY = i => [GEO.FX + (i % 3) * (GEO.CELL + GEO.GAP), GEO.FY + Math.floor(i / 3) * (GEO.CELL + GEO.GAP)];
  /* los temas (paleta de ambiente, oro del marco, confeti y los 9 simbolos de cada tema, siempre en las mismas ranuras: 0 chistera, 1 diamante, 2 doblon, 3 la estrella del tema, 4-5 los dos de x3, 6-8 los tres de x2) */
  const THEMES = {
    tesoro: { amb: "#ffb347", gold: "#ffd95a", flake: ["#ffd9b0", "#e9a56e", "#c27846", "#90502c", "#5a2e1a"], syms: ["hat", "diamond", "coin", "chest", "key", "ring", "skull", "chalice", "pouch"] },
    mapamundi: { amb: "#4fa4f0", gold: "#ffd95a", flake: ["#f4fbff", "#c9dff2", "#9db9d8", "#6b84ae", "#3a4f7e"], syms: ["hat", "diamond", "coin", "globe", "compass", "pin", "passport", "telescope", "mapa"] },
    banderas: { amb: "#ff6a6a", gold: "#e8e4ff", flake: ["#ffffff", "#e2def4", "#bcb6dc", "#8c84b4", "#5a5284"], syms: ["hat", "diamond", "coin", "flag_jp", "flag_br", "flag_fr", "flag_es", "flag_de", "flag_ch"] },
    gala: { amb: "#b07cff", gold: "#ffd95a", flake: ["#d2c6ff", "#9a84ea", "#6c58c0", "#443494", "#261c62"], syms: ["hat", "diamond", "coin", "die", "chip", "spade", "heart", "club", "flute"] },
    monumentos: { amb: "#ffd27a", gold: "#ffe08a", flake: ["#fff0c8", "#e8cf94", "#c8a864", "#9a7a42", "#6a5028"], syms: ["hat", "diamond", "coin", "pyramid", "eiffel", "pisa", "moai", "taj", "colosseum"] },
    faro: { amb: "#3cd0c0", gold: "#ffcfa0", flake: ["#e0fff6", "#9aecd8", "#54c6b6", "#2e8e92", "#165a62"], syms: ["hat", "diamond", "coin", "lighthouse", "sail", "anchor", "helm", "buoy", "shell"] },
    gemas: { amb: "#ff7ab8", gold: "#fff0f0", flake: ["#fff0ee", "#f9cfc8", "#e8a0a6", "#b86a80", "#73344f"], syms: ["hat", "diamond", "coin", "gem_esmeralda", "gem_zafiro", "gem_amatista", "gem_topacio", "gem_perla", "gem_aguamarina"] },
    tiempo: { amb: "#7fd0ff", gold: "#ffd95a", flake: ["#f8ffff", "#d0f0ff", "#a0d8f0", "#6cb0d8", "#3c7ab0"], syms: ["hat", "diamond", "coin", "sun", "moon", "cloud", "bolt", "snow", "drop"] },
  };
  /* el carrete: 8 presentaciones = tema + entrada de la tarjeta + orden de "Rasca todo" + efecto de premio */
  const ORDERS = { reading: [0, 1, 2, 3, 4, 5, 6, 7, 8], spiral: [0, 1, 2, 5, 8, 7, 6, 3, 4], snake: [0, 1, 2, 5, 4, 3, 6, 7, 8], cross: [4, 1, 3, 5, 7, 0, 2, 6, 8], columns: [0, 3, 6, 1, 4, 7, 2, 5, 8], centerout: [4, 0, 8, 2, 6, 1, 7, 3, 5], diagonal: [0, 1, 3, 2, 4, 6, 5, 7, 8], random: null };
  const REEL = [
    { id: "r1", theme: "tesoro", entry: "slide", order: "reading", fx: "coins" }, { id: "r2", theme: "mapamundi", entry: "drop", order: "spiral", fx: "pins" },
    { id: "r3", theme: "banderas", entry: "fan", order: "snake", fx: "bunting" }, { id: "r4", theme: "gala", entry: "curtain", order: "cross", fx: "spot" },
    { id: "r5", theme: "monumentos", entry: "stamp", order: "columns", fx: "cannons" }, { id: "r6", theme: "faro", entry: "wave", order: "centerout", fx: "beam" },
    { id: "r7", theme: "gemas", entry: "spin", order: "diagonal", fx: "gems" }, { id: "r8", theme: "tiempo", entry: "zoom", order: "random", fx: "storm" },
  ];

  /* ------------------------------------------------------------------ el resultado: la semilla decide la tarjeta entera (todo en cienmilesimas: DEN = 100000) */
  const DEN = 100000, SLOT_MULT = [100, 25, 10, 5, 3, 3, 2, 2, 2];
  const TIERS = [
    { id: "x100", m: 100, n: 80,    slots: [0],       level: 3, sit: "rcJackpot" },
    { id: "x25",  m: 25,  n: 400,   slots: [1],       level: 3, sit: "rcGordo" },
    { id: "x10",  m: 10,  n: 1200,  slots: [2],       level: 2, sit: "rcMedio" },
    { id: "x5",   m: 5,   n: 4000,  slots: [3],       level: 2, sit: "rcMedio" },
    { id: "x3",   m: 3,   n: 8500,  slots: [4, 5],    level: 1, sit: "rcChico" },
    { id: "x2",   m: 2,   n: 10250, slots: [6, 7, 8], level: 1, sit: "rcChico" },
  ];
  const CASI_N = 28000, CASI_W = [3, 3, 2, 1, 1, 1, 1, 1, 1];     // 28 %: tarjetas con exactamente UNA pareja (y nada mas); mas "casi" de chistera, diamante y doblon
  const WIN_N = TIERS.reduce((a, t) => a + t.n, 0), RTP_N = TIERS.reduce((a, t) => a + t.n * t.m, 0);
  function evaluate(grid) {                                         // lo unico que decide el premio: tres iguales = premio; una pareja = casi; nueve distintos = nada
    const cnt = [0, 0, 0, 0, 0, 0, 0, 0, 0]; for (let i = 0; i < 9; i++) cnt[grid[i]]++;
    let triple = -1, pairs = 0, pair = -1, bad = false;
    for (let s = 0; s < 9; s++) { if (cnt[s] === 3) { if (triple >= 0) bad = true; triple = s; } else if (cnt[s] === 2) { pairs++; pair = s; } else if (cnt[s] > 3) bad = true; }
    if (bad) return { valid: false };
    const cells = s => grid.map((g, i) => (g === s ? i : -1)).filter(i => i >= 0);
    if (triple >= 0) return pairs === 0 ? { valid: true, cls: "x" + SLOT_MULT[triple], mult: SLOT_MULT[triple], win: triple, cells: cells(triple) } : { valid: false };
    if (pairs === 1) return { valid: true, cls: "casi", mult: 0, win: -1, pair, cells: cells(pair) };
    if (pairs === 0) return { valid: true, cls: "nada", mult: 0, win: -1, cells: [] };
    return { valid: false };
  }
  function outcome(key) {
    const r = A.rng(key), int = n => Math.floor(r() * n), shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const k = int(DEN), grid = new Array(9).fill(-1); let acc = 0, tier = null;
    for (const t of TIERS) { if (k < acc + t.n) { tier = t; break; } acc += t.n; }
    const order = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    if (tier) {                                                     // premio: tres iguales y seis simbolos DISTINTOS entre si y del premiado (un premio nunca lleva una segunda pareja)
      const s = tier.slots[int(tier.slots.length)], others = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8].filter(x => x !== s));
      for (let j = 0; j < 3; j++) grid[order[j]] = s; for (let j = 0; j < 6; j++) grid[order[3 + j]] = others[j];
    } else if (k < WIN_N + CASI_N) {                                // casi: una pareja y siete simbolos distintos
      const tot = CASI_W.reduce((a, b) => a + b, 0); let x = r() * tot, s = 0; while (s < 8 && x >= CASI_W[s]) x -= CASI_W[s++];
      const others = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8].filter(v => v !== s));
      for (let j = 0; j < 2; j++) grid[order[j]] = s; for (let j = 0; j < 7; j++) grid[order[2 + j]] = others[j];
    } else { const perm = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]); for (let j = 0; j < 9; j++) grid[j] = perm[j]; }   // nada: los nueve distintos
    return Object.assign({ k, tier: tier ? tier.id : null, grid }, evaluate(grid));
  }
  function decide(key) {                                            // _rasca.force(cls): solo pruebas, busca una semilla real de esa clase
    const F = A.adv._rasca && A.adv._rasca.force;
    if (!F) return outcome(key);
    for (let i = 0; i < 400000; i++) { const o = outcome(`${key}:f${i}`); if (o.cls === F) return o; }
    return outcome(key);
  }

  /* ------------------------------------------------------------------ la carta de la Barra y su cableado */
  let stakeI = 0;
  const pctS = v => { const s = v.toFixed(1); return COMMA.has(A.lang) ? s.replace(".", ",") : s; };
  CS.add({ id: "rasca", bet: BET,
    card(cx) {
      const b = cx.b;
      if (b && b.id === "rasca" && b.att === cx.att) return `<div class="sup bet cas bt-rasca done ${b.pay ? "win" : "lose"}" data-bet="rasca">${cx.head}<em class="bt-res"><b>${b.pay ? "×" + b.mult : tr(b.cls === "casi" ? U.casi : U.lose)}</b>${b.pay ? "+" + b.pay : ""}</em></div>`;
      return `<div class="sup bet cas bt-rasca" data-bet="rasca">${cx.head}<span class="bt-pick"><button class="bt-c bt-ra" type="button" data-play="1">${tr(U.btn)}</button><em class="sp-p bt-stake" role="button" tabindex="0">${cx.CN()}${cx.coinCost(stakeI)}</em></span></div>`;
    },
    wire(el, cx) {
      const pill = el.querySelector(".bt-stake");
      if (pill) pill.onclick = e => { e.stopPropagation(); stakeI = (stakeI + 1) % cx.STAKES.length; pill.innerHTML = cx.CN() + cx.coinCost(stakeI); A.sfx.tick(1); };   // el precio se cambia con un clic en la ficha
      const btn = el.querySelector("[data-play]"); if (!btn) return;
      btn.onclick = e => {
        e.stopPropagation(); if (cx.open) return; const run = cx.run, stake = cx.coinCost(stakeI); if (run.coins < stake) { A.sfx.deny(); cx.shake(el); return; }
        const TST = A.adv._rasca || {}, att = run.attempt || 0, out = decide(`${run.seed}:rasca:${cx.r}:${att}`), mult = out.mult || 0, pay = stake * mult;
        const rid = TST.reel || cx.reelPick("rasca", REEL.map(r => r.id));                                 // la presentacion: carrete vivo (_rasca.reel: solo pruebas)
        run.coins += pay - stake; if (pay > stake) run.stats.coinsEarned += pay - stake;                  // se cobra al empezar, como la ruleta: recargar a medias no lo deshace
        run.reds = run.reds || {}; run.reds[cx.r] = { id: "rasca", att, stake, grid: out.grid, cls: out.cls, mult, cells: out.cells, rid, pay, done: false };
        cx.persist(); A.sfx.rouBet(1); if (A.haptic) A.haptic([10]);
        { const cb = document.querySelector("#shopCoins b"); if (cb) cb.textContent = run.coins - pay; }     // el saldo que se ve detras sube cuando se descubre el premio
        spinRasca({ cx, stake, out, pay, rid, rec: run.reds[cx.r] }, () => { if (!run || A.core.S.phase !== "shop" || !run.stock) return; cx.refresh(); });
      };
    },
  });

  /* ------------------------------------------------------------------ la mesa */
  const IMG = {};
  const img = n => IMG[n] || (IMG[n] = Object.assign(new Image(), { src: `${SPR}${n}.png` }));
  const foilCache = {};
  const foilData = th => foilCache[th] || (foilCache[th] = new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = NW; c.height = NH; const g = c.getContext("2d"); g.drawImage(im, 0, 0); res(g.getImageData(0, 0, NW, NH).data); }; im.onerror = () => res(null); im.src = FOIL[th]; }));
  const cellOf = new Int8Array(NW * NH).fill(-1); for (let i = 0; i < 9; i++) { const [x0, y0] = cellXY(i); for (let y = 0; y < GEO.CELL; y++) for (let x = 0; x < GEO.CELL; x++) cellOf[(y0 + y) * NW + x0 + x] = i; }
  const preload = () => { if (preload.done) return; preload.done = 1; ["hat", "diamond", "coin", "pin"].forEach(img); ["cenefa", "coin_cur", "coin_hold", "felt_ivory", "wall", "sweat", "glove_open"].forEach(n => { new Image().src = `${AS}${n}.png`; }); };

  function spinRasca(o, done) {
    const cx = o.cx, TST = A.adv._rasca || {}, run = cx.run, out = o.out, R = REEL.find(r => r.id === o.rid) || REEL[0], th = R.theme, TH = THEMES[th], rec = o.rec;
    preload();
    const tierRows = TIERS.map(t => `<div class="ra-row" data-tier="${t.id}"><span class="ra-m">×${t.m}</span><span class="ra-ics">${t.slots.map(s => `<span><img src="${SPR}${TH.syms[s]}.png" alt="" draggable="false"></span>`).join("")}</span></div>`).join("");
    const html = `<div class="ra-stage"><div class="ra-wall"></div><div class="ra-spotl"></div><div class="ra-spotl r"></div>
      <div class="ra-sign"><span class="ra-signtx"></span><i class="rou-lights top"></i><i class="rou-lights bot"></i></div>
      <div class="ra-tag"><b></b><span></span></div>
      <div class="ra-top"><div class="ra-res"><span class="ra-plate"></span><span class="ra-msg"></span></div></div>
      <div class="ra-dealerbox bob"><img class="ra-dealer" src="${IC}dealer_neutral.webp" alt="" draggable="false"><img class="ra-sweat s1" src="${AS}sweat.png" alt="" draggable="false"><img class="ra-sweat s2" src="${AS}sweat.png" alt="" draggable="false"></div>
      <div class="ra-bubble"><span></span></div>
      <div class="ra-band"><i class="rou-lights top"></i><i class="rou-lights bot"></i></div>
      <div class="ra-glovelayer"><img class="ra-gl l" src="${AS}glove_open.png" alt="" draggable="false"><img class="ra-gl r" src="${AS}glove_open.png" alt="" draggable="false"></div>
      <div class="ra-plaque ra-pay"></div>
      <div class="ra-card off"><img class="ra-base" src="${AS}card_${th}.png" alt="" draggable="false"><div class="ra-ct"></div><div class="ra-cf"></div><div class="ra-syms"></div><canvas class="ra-foil" width="${NW}" height="${NH}"></canvas><div class="ra-hls"></div></div>
      <div class="ra-curtain l"></div><div class="ra-curtain r"></div>
      <div class="ra-right"><div class="ra-pill"></div><button class="ra-btn" type="button"></button><div class="ra-hint"></div></div>
      <div class="ra-plaque ra-help"></div><div class="ra-hud"></div>
      <div class="ra-beam"></div><canvas class="ra-fx" width="1920" height="1080"></canvas>
      <img class="ra-coin" id="raCoin" src="${AS}coin_cur.png" alt="" draggable="false"><img class="ra-coin" id="raCoinH" src="${AS}coin_hold.png" alt="" draggable="false"><div class="ra-wash"></div></div>`;
    const sh = cx.rouShell("rasca", html, {}, () => { try { A.dealer.hold(false); } catch (e) { /* sin crupier */ } cleanup(); done(); });
    if (!sh) return;
    try { A.dealer.hold(true); } catch (e) { /* sin crupier */ }                                  // el crupier de la esquina calla: aqui habla el de la mesa
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) { /* nada */ }
    const ov = sh.ov, stage = ov.querySelector(".ra-stage"), reduced = sh.reduced, Q = s => ov.querySelector(s), QA = s => [...ov.querySelectorAll(s)], CANCEL = {};
    ov.classList.remove("spin");
    const alive = () => !sh.closed && ov.isConnected, pend = new Set();
    const sleep = ms => new Promise((res, rej) => setTimeout(() => (alive() ? res() : rej(CANCEL)), ms));
    const later = (fn, ms) => setTimeout(() => { if (alive()) fn(); }, ms);
    const waitFor = fn => new Promise((res, rej) => { const e = { rej }; pend.add(e); fn(v => { pend.delete(e); res(v); }); });
    const runAnim = (d, fn) => new Promise((res, rej) => { const t0 = performance.now(), f = now => { if (!alive()) return rej(CANCEL); const p = Math.min(1, (now - t0) / d); fn(p); p < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
    const swallow = p => p && p.catch && p.catch(e => { if (e !== CANCEL) { try { console.error("rasca", e); } catch (x) { /* nada */ } } });

    /* ---- elementos y escala (cada pixel del arte = K pixeles de pantalla, K entero) ---- */
    const cardEl = Q(".ra-card"), band = Q(".ra-band"), symsEl = Q(".ra-syms"), hlsEl = Q(".ra-hls"), foilCv = Q(".ra-foil"), fctx = foilCv.getContext("2d"), fxCv = Q(".ra-fx"), fx = fxCv.getContext("2d");
    const coinEl = Q("#raCoin"), coinH = Q("#raCoinH"), dealerBox = Q(".ra-dealerbox"), dealerImg = Q(".ra-dealer"), btnAll = Q(".ra-btn"), hintEl = Q(".ra-hint"), bubble = Q(".ra-bubble"), bTx = bubble.firstChild;
    const glL = Q(".ra-gl.l"), glR = Q(".ra-gl.r");
    let scale = 1, ox = 0, oy = 0, shakeX = 0, shakeY = 0, ovL = 0, ovT = 0;
    const applyTf = () => { stage.style.transform = `translate(${Math.round(ox + shakeX * scale)}px,${Math.round(oy + shakeY * scale)}px) scale(${scale})`; };
    const fit = () => {
      const W = ov.clientWidth || innerWidth, H = ov.clientHeight || innerHeight; let k = 2; for (const c of [3, 4, 5, 6]) if ((1920 * c / 4 - W) / 2 <= 90 && (1080 * c / 4 - H) / 2 <= 24) k = c;
      scale = k / 4; ox = Math.round((W - 1920 * scale) / 2); oy = Math.round((H - 1080 * scale) / 2); const r = ov.getBoundingClientRect(); ovL = r.left; ovT = r.top; applyTf();
    };
    fit(); const onResize = () => { if (ov.isConnected) fit(); }; addEventListener("resize", onResize);
    const toStage = (cxp, cyp) => [(cxp - ovL - ox) / scale, (cyp - ovT - oy) / scale];

    /* ---- estado ---- */
    const ST = (TST.st = { phase: "enter", down: false, keyHold: false, padHold: false, pointerIn: false, padMoved: false });   // ST.phase: solo pruebas (enter, scratch, done)
    const cur = { x: 960, y: 860 }; let card = null, purse = run.coins - o.pay;
    TST.get = () => ({ card, cur, purse });                                                    // solo pruebas
    const shakeOk = () => !reduced && A.core.S.shake !== false;

    /* ---- sonido: el motor del juego (volumen y mute) con los sintetizadores de la maqueta ---- */
    const tone = (f0, f1, d, type, v, delay) => A.sfx.gbTone(f0, f1, d, type, v, delay || 0), noise = (d, v, hp, delay, bp) => A.sfx.rcNoise(d, v, hp, delay || 0, bp || 0);
    const sfx = {
      buy() { tone(1900, 1300, 0.07, "square", 0.025); tone(2500, 1800, 0.09, "triangle", 0.03, 0.06); noise(0.05, 0.03, 4000, 0.02); },
      swish() { noise(0.35, 0.05, 0, 0, 1800); tone(180, 420, 0.3, "triangle", 0.03); }, thump() { tone(150, 45, 0.3, "sine", 0.26); noise(0.1, 0.08, 1500); }, flick() { noise(0.08, 0.06, 2600); tone(900, 300, 0.1, "triangle", 0.04); },
      rustle() { for (let i = 0; i < 5; i++) noise(0.14, 0.04, 0, i * 0.1, 900 + i * 220); }, zap() { noise(0.25, 0.1, 3000); tone(2400, 80, 0.35, "sawtooth", 0.05); }, wave() { tone(120, 240, 0.6, "sine", 0.06); noise(0.5, 0.04, 0, 0, 600); }, ring() { tone(1320, 1320, 0.5, "sine", 0.05); tone(1760, 1760, 0.5, "sine", 0.03, 0.05); },
      reveal(n) { tone(420 + n * 55, 640 + n * 70, 0.12, "triangle", 0.06); noise(0.05, 0.03, 3000); },
      heart() { tone(70, 50, 0.12, "sine", 0.18); tone(62, 46, 0.14, "sine", 0.15, 0.17); },
      casi() { tone(440, 330, 0.22, "triangle", 0.07); tone(392, 294, 0.22, "triangle", 0.07, 0.24); tone(330, 196, 0.5, "triangle", 0.07, 0.48); },
      clack() { noise(0.045, 0.12, 2000); tone(250, 120, 0.09, "sine", 0.12); },
    };
    let hbTimer = 0; const heartOff = () => clearTimeout(hbTimer), heartOn = () => { heartOff(); let n = 0; const beat = () => { if (!alive() || n++ > 9) return; sfx.heart(); hbTimer = setTimeout(beat, 760); }; beat(); };

    /* ---- el crupier: retrato con sus caras, gestos de CSS, globo (siempre 1 s mas en pantalla) y cola (nunca se le corta una frase) ---- */
    const SP = { cur: false, pend: null }; let faceT = 0, gT = 0;
    const setFace = f => { dealerImg.src = `${IC}dealer_${f}.webp`; clearTimeout(faceT); if (f !== "neutral" && !(card && card.tense)) faceT = setTimeout(() => { if (alive() && !(card && card.tense)) dealerImg.src = `${IC}dealer_neutral.webp`; }, 4200); };
    function gesture(g) {
      if (reduced || !g) return;
      if (g === "sweat") { dealerBox.classList.add("sweat"); clearTimeout(gT); gT = setTimeout(() => { if (alive() && !(card && card.tense)) dealerBox.classList.remove("sweat"); }, 3600); return; }
      if (g === "peek") { dealerBox.classList.add("g-peek"); later(() => { if (!(card && card.tense)) dealerBox.classList.remove("g-peek"); }, 2600); return; }
      if (g === "clap") return swallow(clap(3 + Math.floor(rnd() * 2)));
      const c = "g-" + g, dur = { tip: 620, shrug: 720, hop: 920, faint: 2850 }[g] || 700; dealerBox.classList.remove("g-tip", "g-shrug", "g-hop", "g-faint"); void dealerBox.offsetWidth; dealerBox.classList.add(c); later(() => dealerBox.classList.remove(c), dur);
    }
    function speak(p) {
      SP.cur = true; bTx.textContent = p.text; bubble.classList.add("on"); if (p.face) setFace(p.face); if (p.g) gesture(p.g);
      setTimeout(() => { if (!alive()) return; bubble.classList.remove("on"); if (SP.pend) { const n = SP.pend; SP.pend = null; setTimeout(() => alive() && speak(n), 350); } else SP.cur = false; }, 1800 + p.text.length * 22 + (A.dealer.LINGER || 1000));
    }
    function say(key, prio = 1, skipIfBusy) {
      const a = LN[key]; if (!a) return; if (skipIfBusy && SP.cur) return;
      let i = Math.floor(rnd() * a.length); if (i === LAST[key] && a.length > 1) i = (i + 1 + Math.floor(rnd() * (a.length - 1))) % a.length; LAST[key] = i;
      const p = { text: tr(a[i].t) || "", face: a[i].f, g: a[i].g, prio };
      if (SP.cur) { if (!SP.pend || prio >= SP.pend.prio) SP.pend = p; return; } speak(p);
    }
    const speechIdle = () => waitFor(res => { const iv = setInterval(() => { if (!alive() || (!SP.cur && !SP.pend)) { clearInterval(iv); res(); } }, 120); });
    let clapId = 0; const glovesOff = () => { clapId++; glL.style.opacity = glR.style.opacity = 0; };
    async function clap(n) {
      const my = ++clapId, run1 = (d, fn) => new Promise(res => { const t0 = performance.now(), f = now => { const p = Math.min(1, (now - t0) / d); if (my === clapId && alive()) fn(p); p < 1 && my === clapId && alive() ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
      glL.style.opacity = glR.style.opacity = 1; const L0 = 860, R0 = 1360; glL.style.left = L0 + "px"; glR.style.left = R0 + "px";
      await run1(300, p => { const y = lerp(340, 120, easeOut(p)); glL.style.transform = `translate3d(0,${Math.round(y - 340)}px,0)`; glR.style.transform = `scaleX(-1) translate3d(0,${Math.round(y - 340)}px,0)`; });
      for (let i = 0; i < n && my === clapId && alive(); i++) { await run1(130, p => { const x = lerp(0, 120, easeOut(p)); glL.style.left = L0 + x + "px"; glR.style.left = R0 - x + "px"; }); sfx.clack(); await run1(130, p => { const x = lerp(120, 0, p); glL.style.left = L0 + x + "px"; glR.style.left = R0 - x + "px"; }); }
      await run1(300, p => { const y = lerp(120, 340, ease(p)); glL.style.transform = `translate3d(0,${Math.round(y - 340)}px,0)`; glR.style.transform = `scaleX(-1) translate3d(0,${Math.round(y - 340)}px,0)`; }); if (my === clapId) glL.style.opacity = glR.style.opacity = 0;
    }

    /* ---- textos del escenario ---- */
    const fmtN = n => String(n);
    function hud() { Q(".ra-hud").innerHTML = `<span><img src="${IC}coin.webp" alt=""><small>${tr(U.bal)}</small><em>${fmtN(purse)}</em></span><span><small>${tr(U.labStake)}</small><em>${o.stake}</em></span><span><small>${tr(U.prize)}</small><em>×100</em></span>`; }
    function helpP() { const rows = [[U.k0, U.v0], [U.k1, U.v1], [U.k2, U.v1], [U.k3, U.all]]; Q(".ra-help").innerHTML = `<h4>${tr(U.helpT)}</h4>` + rows.map(r => `<div class="ra-hr"><span class="kc">${tr(r[0])}</span><span>${tr(r[1])}</span></div>`).join(""); }
    function payPanel() { const pc = pctS(RTP_N / DEN * 100); Q(".ra-pay").innerHTML = `<h4>${tr(U.payTitle)}<small>${pc} %</small></h4>${tierRows}<p class="ra-pnote">${tr(U.payNote)} ${tr(U.rtpNote)} ${pc} %.</p>`; }
    function fitText(el, text, maxW, px) { el.innerHTML = "<span></span>"; const sp = el.firstChild; sp.textContent = text; el.style.fontSize = px + "px"; let n = 0; while (sp.offsetWidth > maxW && px > 20 && n++ < 40) { px -= 2; el.style.fontSize = px + "px"; } }   // una vez al montar la tarjeta, nunca por fotograma
    const cardTexts = () => { fitText(Q(".ra-ct"), tr(U.title), 352, 56); fitText(Q(".ra-cf"), tr(U.foot), 352, 28); };
    const hint = (k, extra) => { if (!k) { hintEl.classList.remove("on"); return; } hintEl.innerHTML = tr(U[k]) + (extra ? `<small>${extra}</small>` : ""); hintEl.classList.add("on"); };
    const showPlate = (kind, name, extra, msg) => { const p = Q(".ra-plate"); p.className = "ra-plate " + kind; p.innerHTML = `<b>${name}</b>${extra ? `<i>${extra}</i>` : ""}`; Q(".ra-msg").textContent = msg; const r = Q(".ra-res"); r.classList.remove("on"); void r.offsetWidth; r.classList.add("on"); };
    const setBtns = () => { const sc = ST.phase === "scratch" && card && !card.auto && !card.finished; btnAll.hidden = ST.phase !== "scratch" && ST.phase !== "done"; btnAll.disabled = !sc; };

    /* ---- particulas (un solo canvas 1920x1080; todo a enteros) ---- */
    const parts = []; let bunt = null;
    const P = p => { if (parts.length < 520) parts.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 1800, t: 0, life: 1, w: 8, h: 8, col: "#fff", img: null, floor: 0, bnc: 0, drag: 0, sway: 0, ph: rnd() * 6 }, p)); };
    function flakes(x, y, n) { const F = TH.flake; for (let i = 0; i < n; i++) P({ x: x + (rnd() - .5) * 28, y: y - 10 + (rnd() - .5) * 12, vx: (rnd() - .5) * 520, vy: -300 - rnd() * 520, life: 0.5 + rnd() * 0.5, w: rnd() < .5 ? 4 : 8, h: rnd() < .5 ? 4 : 8, col: F[Math.floor(rnd() * 4)] }); }
    function drawParts(dt) {
      if (!parts.length && !bunt) { if (fxCv.dataset.dirty) { fx.clearRect(0, 0, 1920, 1080); fxCv.dataset.dirty = ""; } return; }
      fx.clearRect(0, 0, 1920, 1080); fxCv.dataset.dirty = "1"; fx.imageSmoothingEnabled = false;
      if (bunt) drawBunting(dt);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.t += dt; if (p.t >= p.life) { parts.splice(i, 1); continue; }
        p.vy += p.g * dt; p.x += (p.vx + Math.sin(p.t * 6 + p.ph) * p.sway) * dt; p.y += p.vy * dt; if (p.drag) { p.vx *= 1 - p.drag * dt; }
        if (p.floor && p.y + p.h > p.floor && p.vy > 0) { if (p.bnc) { p.y = p.floor - p.h; p.vy *= -p.bnc; p.vx *= 0.8; } else { p.y = p.floor - p.h; p.vy = 0; p.vx = 0; p.g = 0; } }
        const a = p.life - p.t < 0.35 ? (p.life - p.t) / 0.35 : 1; fx.globalAlpha = a;
        if (p.img) { if (p.img.complete && p.img.naturalWidth) fx.drawImage(p.img, Math.round(p.x), Math.round(p.y), p.w, p.h); } else { fx.fillStyle = p.col; fx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h); }
      }
      fx.globalAlpha = 1;
    }
    const PAL = [...TH.flake.slice(0, 3), TH.gold, "#e8283a", "#ffffff", "#3f9af0", "#5cc84a"];
    function drawBunting(dt) {
      bunt.t += dt; const e = easeOut(Math.min(1, bunt.t / 0.5)), outA = bunt.t > bunt.life - 0.4 ? (bunt.life - bunt.t) / 0.4 : 1; if (bunt.t > bunt.life) { bunt = null; return; }
      fx.globalAlpha = outA;
      for (const side of [0, 1]) for (let k = 0; k < 14; k++) {
        const x = side ? 1920 - 70 - k * 66 : 20 + k * 66, sag = Math.round(Math.sin((k + 0.5) / 14 * Math.PI) * 54), y = Math.round(-120 + (30 + sag + (side ? 46 : 0)) * e); fx.fillStyle = bunt.cols[(k + side) % bunt.cols.length];
        for (let r = 0; r < 7; r++) fx.fillRect(x + r * 4, y + r * 8, 48 - r * 8, 8); fx.fillStyle = "#1d0a3d"; fx.fillRect(x - 4, y - 4, 56, 4);
      }
      fx.globalAlpha = 1;
    }
    function emitFx(kind, lv) {
      if (reduced) return; const syms = TH.syms, big = lv >= 3, N = [0, 16, 44, 110][lv];
      const rain = (im, w, n, spread = 1) => { for (let i = 0; i < n; i++) P({ img: im, w, h: w, x: 80 + rnd() * 1760, y: -80 - rnd() * 700 * spread, vx: (rnd() - .5) * 160, vy: 60 + rnd() * 220, g: 1500, floor: 960 + rnd() * 40, bnc: im ? 0.5 : 0.3, life: 2.4 + rnd() * 1.4 }); };
      const confetti = (n, fromBottom) => { for (let i = 0; i < n; i++) { const c = PAL[Math.floor(rnd() * PAL.length)], hor = rnd() < .5; const L = fromBottom ? (i % 2 ? 1 : -1) : 0; P(fromBottom ? { x: L < 0 ? 40 : 1860, y: 980, vx: (L < 0 ? 1 : -1) * (400 + rnd() * 900), vy: -900 - rnd() * 900, g: 1500, drag: 0.8, w: hor ? 16 : 8, h: hor ? 8 : 16, col: c, life: 2.4 + rnd() * 1.2, sway: 60 } : { x: rnd() * 1920, y: -60 - rnd() * 500, vx: (rnd() - .5) * 120, vy: 80 + rnd() * 140, g: 260, w: hor ? 16 : 8, h: hor ? 8 : 16, col: c, life: 3 + rnd() * 1.5, sway: 90 }); } };
      if (kind === "coins") rain(img("coin"), 48, N);
      else if (kind === "pins") rain(img(syms.includes("pin") ? "pin" : "coin"), 48, Math.round(N * 0.6));
      else if (kind === "bunting") { bunt = { t: 0, life: 3.2 + lv * 0.5, cols: PAL }; confetti(N * 2, false); }
      else if (kind === "spot") { QA(".ra-spotl").forEach(e => { e.classList.remove("on"); void e.offsetWidth; e.classList.add("on"); }); for (let i = 0; i < N; i++) P({ x: rnd() * 1920, y: -120 - rnd() * 500, vx: 0, vy: 90 + rnd() * 120, g: 0, w: 8, h: 56 + Math.floor(rnd() * 3) * 16, col: PAL[Math.floor(rnd() * PAL.length)], life: 3.4, sway: 140 }); }
      else if (kind === "cannons") confetti(N * 2, true);
      else if (kind === "beam") { const b = Q(".ra-beam"); b.classList.remove("on"); void b.offsetWidth; b.classList.add("on"); rain(img("coin"), 48, Math.round(N * 0.5)); }
      else if (kind === "gems") { const gs = syms.filter(n => n.startsWith("gem_")); for (let i = 0; i < N; i++) P({ img: img(gs[i % gs.length]), w: 48, h: 48, x: 80 + rnd() * 1760, y: -80 - rnd() * 700, vx: (rnd() - .5) * 120, vy: 80 + rnd() * 200, g: 1400, floor: 960 + rnd() * 40, bnc: 0.55, life: 2.6 + rnd() }); }
      else if (kind === "storm") { flash(); for (let i = 0; i < N * 2; i++) P({ x: rnd() * 1960 - 40, y: -60 - rnd() * 900, vx: -120, vy: 900 + rnd() * 500, g: 0, w: 4, h: 28, col: i % 4 ? "#8fd4ff" : "#ffffff", life: 1.8 + rnd() * 0.8 }); }
      if (big) { const hats = out.cls === "x100"; for (let i = 0; i < (hats ? 26 : 16); i++) P({ img: img(hats ? "hat" : "diamond"), w: 72, h: 72, x: 80 + rnd() * 1760, y: -100 - rnd() * 800, vx: (rnd() - .5) * 200, vy: 100 + rnd() * 200, g: 1300, floor: 970, bnc: 0.45, life: 3.2 + rnd() * 1.2 }); }   // chisteras = solo el jackpot (3 chisteras)
    }

    /* ---- temblor del escenario, destellos de luz y recompensas por niveles (sonido + temblor de pantalla + vibracion + particulas crecientes) ---- */
    let shakeRun = 0;
    function shake(amp, ms) { if (!shakeOk()) return; const id = ++shakeRun, t0 = performance.now(), a = amp * (0.8 + rnd() * 0.4), sx = rnd() < .5 ? 1 : -1; const f = now => { if (id !== shakeRun || !alive()) return; const p = Math.min(1, (now - t0) / ms), k = (1 - p) * (1 - p); shakeX = Math.round(Math.sin(now / 17) * a * k * sx + (rnd() - .5) * a * 0.5 * k); shakeY = Math.round(Math.cos(now / 13) * a * 0.7 * k + (rnd() - .5) * a * 0.4 * k); applyTf(); if (p < 1) requestAnimationFrame(f); else { shakeX = shakeY = 0; applyTf(); } }; requestAnimationFrame(f); }
    function flash() { if (reduced) return; stage.classList.remove("flash"); void stage.offsetWidth; stage.classList.add("flash"); }
    const wash = (col, ms = 650) => { if (reduced) return; const soft = document.documentElement.classList.contains("soft-flash"), c = soft ? col.replace(/([\d.]+)\)$/, (m, a) => (+a * 0.4).toFixed(2) + ")") : col, w = Q(".ra-wash"); w.style.setProperty("--wc", c); w.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: "ease-out" }); };
    const lights = ms => { band.classList.add("fast"); later(() => band.classList.remove("fast"), ms); };
    function reward(lv, tier) {
      A.sfx.jackpot(lv); if (A.core.jpShake) A.core.jpShake(lv); if (A.haptic) A.haptic(lv === 3 ? [40, 40, 80] : lv === 2 ? [30, 30, 60] : [20]);
      wash(["", "rgba(255,217,90,.35)", "rgba(255,200,70,.55)", "rgba(255,230,120,.8)"][lv], [0, 500, 750, 1300][lv]); lights([0, 900, 1500, 2600][lv]); emitFx(R.fx, lv);
      if (tier.id === "x100") later(() => { A.sfx.jackpot(2); if (A.core.jpShake) A.core.jpShake(2); wash("rgba(255,255,255,.7)", 900); emitFx(R.fx, 3); }, 1100);
    }

    /* ---- la lamina: rascar pixel a pixel ---- */
    function foilInit(base) {
      const d = new Uint8ClampedArray(base); card.img = new ImageData(d, NW, NH); card.total = new Array(9).fill(0); card.clear = new Array(9).fill(0);
      for (let i = 0; i < NW * NH; i++) if (d[i * 4 + 3] && cellOf[i] >= 0) card.total[cellOf[i]]++;
      fctx.putImageData(card.img, 0, 0);
    }
    function stamp(nx, ny, Rr) {
      const d = card.img.data, x0 = Math.max(0, Math.floor(nx - Rr)), x1 = Math.min(NW - 1, Math.ceil(nx + Rr)), y0 = Math.max(0, Math.floor(ny - Rr)), y1 = Math.min(NH - 1, Math.ceil(ny + Rr)); let n = 0;
      if (x1 < x0 || y1 < y0) return 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = x + 0.5 - nx, dy = y + 0.5 - ny; if (dx * dx + dy * dy > Rr * Rr) continue; const p = y * NW + x; if (d[p * 4 + 3]) { d[p * 4 + 3] = 0; n++; const c = cellOf[p]; if (c >= 0) card.clear[c]++; } }
      if (n) fctx.putImageData(card.img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1); return n;
    }
    function strokeTo(nx, ny) {
      let n = 0; const R0 = 3.4, l = card.last;
      if (l) { const dx = nx - l.x, dy = ny - l.y, steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 1.2)); for (let i = 1; i <= steps; i++) n += stamp(l.x + dx * i / steps, l.y + dy * i / steps, R0 + (rnd() - 0.5) * 0.9); } else n += stamp(nx, ny, R0);
      card.last = { x: nx, y: ny }; return n;
    }
    const checkCells = () => { for (let c = 0; c < 9; c++) if (!card.rev[c] && card.clear[c] / card.total[c] >= 0.55) revealCell(c, false); };   // al rascar el 55 % de una casilla, la lamina que queda se retira sola
    function revealCell(c, instant) {
      if (!card || card.rev[c]) return; card.rev[c] = true; const n = card.rev.filter(Boolean).length, [x0, y0] = cellXY(c), d = card.img.data, left = [];
      for (let y = 0; y < GEO.CELL; y++) for (let x = 0; x < GEO.CELL; x++) { const p = (y0 + y) * NW + x0 + x; if (d[p * 4 + 3]) left.push(p); }
      const wipe = list => { for (const p of list) d[p * 4 + 3] = 0; fctx.putImageData(card.img, 0, 0, x0, y0, GEO.CELL, GEO.CELL); };
      if (instant || reduced || left.length < 8) wipe(left);
      else {                                                       // la lamina que queda salta a trozos, en 4 tandas
        for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
        const q = Math.ceil(left.length / 4); for (let k = 0; k < 4; k++) later(() => { if (card) { const part = left.slice(k * q, (k + 1) * q); wipe(part); for (let m = 0; m < part.length; m += 22) { const p = part[m]; flakes(CX0 + (p % NW) * K, CY0 + Math.floor(p / NW) * K, 1); } } }, k * 45);
      }
      const im = symsEl.children[c]; im.classList.remove("pop"); void im.offsetWidth; im.classList.add("pop"); sfx.reveal(n);
      afterReveal();
    }
    function afterReveal() {
      const c = card, bySym = {}; c.rev.forEach((r, i) => { if (r) (bySym[out.grid[i]] = bySym[out.grid[i]] || []).push(i); });
      const n = c.rev.filter(Boolean).length;
      if (out.win >= 0 && !c.won && out.cells.every(i => c.rev[i])) { c.won = true; win(); }
      if (!c.won && !c.finished) for (const s in bySym) if (bySym[s].length === 2 && n < 9 && !c.pairSeen[s]) { c.pairSeen[s] = true; tension(bySym[s]); }
      if (n === 9) finish();
    }
    function tension(cells) {                                      // dos iguales a la vista y la tercera sin rascar: el crupier suda, se asoma y se oye un latido
      card.tense = true; cells.forEach(i => hlsEl.children[i].classList.add("pair")); if (!reduced) dealerBox.classList.add("sweat", "g-peek"); setFace("shock"); say("rcTension", 3); hint("hTension"); if (!reduced) heartOn();
    }
    function tensionOff() { if (!card) return; card.tense = false; heartOff(); dealerBox.classList.remove("sweat", "g-peek"); QA(".ra-hls .hl.pair").forEach(h => h.classList.remove("pair")); }
    let finishRes = null; const finished = new Promise(res => { finishRes = res; });
    function win() {
      const c = card, tier = TIERS.find(t => t.id === out.cls); tensionOff(); c.paid = true; purse = run.coins; hud();
      out.cells.forEach(i => { hlsEl.children[i].classList.add("win"); symsEl.children[i].classList.add("win"); }); later(() => c.rev.forEach((r, i) => { if (r && !out.cells.includes(i)) symsEl.children[i].classList.add("dim"); }), 700);
      const row = Q(`.ra-row[data-tier="${tier.id}"]`); row && row.classList.add("hit");
      showPlate(tier.level >= 3 ? "big" : "", tr(U.win), "×" + tier.m, "+" + o.pay); hint(null); reward(tier.level, tier); say(tier.sit, 4);
      later(() => { if (!c.finished) swallow(autoReveal(false)); }, reduced ? 600 : 1500);
    }
    function finish() {
      const c = card; if (c.finished) return; c.finished = true; tensionOff();
      if (!c.paid) {
        if (out.cls === "casi") { sfx.casi(); showPlate("casi", tr(U.casi), "", "−" + o.stake); say("rcCasi", 4); shake(4, 300); }
        else { A.sfx.lose(); showPlate("lose", tr(U.lose), "", "−" + o.stake); say("rcNada", 4); }
      }
      later(() => { ST.phase = "done"; stage.classList.remove("scratching"); coinEl.style.display = coinH.style.display = "none"; setBtns(); hint(null); finishRes(); }, c.paid ? 1900 : 900);
    }

    /* "Rasca todo": la doblon recorre cada casilla en zigzag, en el orden de la presentacion; reducir movimiento = la lamina sale de golpe por casillas */
    async function autoPath(i) {
      const [x0, y0] = cellXY(i), pts = []; for (let r = 0; r < 6; r++) { pts.push([x0 + (r % 2 ? 25 : 3), y0 + 3 + r * 4.4]); pts.push([x0 + (r % 2 ? 3 : 25), y0 + 3 + r * 4.4 + 2.2]); }
      for (const [nx, ny] of pts) { if (!card || card.rev[i]) break; const fx0 = cur.x, fy0 = cur.y, tx_ = CX0 + nx * K, ty_ = CY0 + ny * K; await runAnim(34, p => { cur.x = lerp(fx0, tx_, p); cur.y = lerp(fy0, ty_, p); }); }
    }
    async function autoReveal(withCoin) {
      const c = card; if (!c || c.auto) return; c.auto = true; const order = ORDERS[R.order] || [...Array(9).keys()].sort(() => rnd() - 0.5);
      try {
        for (const i of order) {
          if (card !== c) return; if (c.rev[i]) continue;
          if (reduced) { revealCell(i, true); await sleep(110); }
          else if (withCoin) { c.autoHold = true; await autoPath(i); c.autoHold = false; if (!c.rev[i]) revealCell(i, false); await sleep(60); }
          else { revealCell(i, false); await sleep(170); }
        }
      } finally { c.auto = false; c.autoHold = false; }
    }
    function scratchAll() { if (ST.phase !== "scratch" || !card || card.auto || card.finished) return; say("rcAll", 2); swallow(autoReveal(true)); setBtns(); }

    /* ---- entradas de la tarjeta (una por presentacion) ---- */
    const setCard = (tx_, ty_, sx = 1, sy = 1, op = 1) => { cardEl.style.transform = `translate3d(${Math.round(tx_)}px,${Math.round(ty_)}px,0) scale(${sx},${sy})`; cardEl.style.opacity = op; };
    const ENTRY = {
      async slide() { sfx.swish(); await runAnim(700, p => setCard(0, lerp(720, 0, easeBack(p)))); setCard(0, 0); },
      async drop() { await runAnim(950, p => { setCard(0, lerp(-780, 0, bounce(p))); if (p > 0.36 && !this._h1) { this._h1 = 1; sfx.thump(); shake(7, 300); } }); this._h1 = 0; setCard(0, 0); },
      async fan() { sfx.flick(); await runAnim(760, p => setCard(lerp(780, 0, easeOut(p)), lerp(-60, 0, easeOut(p)), Math.max(0.02, Math.abs(Math.cos((1 - easeOut(p)) * Math.PI * 1.5))), 1)); setCard(0, 0); },
      async curtain() { const l = Q(".ra-curtain.l"), r = Q(".ra-curtain.r"); l.classList.add("on"); r.classList.add("on"); setCard(0, 0); sfx.rustle(); await sleep(420); await runAnim(800, p => { l.style.transform = `translateX(${-Math.round(easeOut(p) * 236)}px)`; r.style.transform = `translateX(${Math.round(easeOut(p) * 236)}px)`; }); l.classList.remove("on"); r.classList.remove("on"); l.style.transform = r.style.transform = ""; },
      async stamp() { setCard(0, 0, 1.7, 1.7, 0); await sleep(120); await runAnim(260, p => setCard(0, 0, lerp(1.7, 1, p * p), lerp(1.7, 1, p * p), Math.min(1, p * 2.4))); sfx.thump(); shake(10, 420); setCard(0, 0); },
      async wave() { sfx.wave(); await runAnim(1000, p => setCard(lerp(-1050, 0, easeOut(p)), Math.round(46 * Math.sin(p * 9.5) * (1 - p)))); setCard(0, 0); },
      async spin() { sfx.ring(); await runAnim(900, p => setCard(0, 0, Math.max(0.03, Math.abs(Math.cos((1 - easeOut(p)) * Math.PI * 2.5))), 1, Math.min(1, p * 4))); setCard(0, 0); },
      async zoom() { flash(); sfx.zap(); setCard(0, 0, 0.1, 0.1, 0); await sleep(140); await runAnim(540, p => setCard(0, 0, lerp(0.1, 1, easeBack(p)), lerp(0.1, 1, easeBack(p)), Math.min(1, p * 3))); setCard(0, 0); },
    };

    /* ---- entrada: raton / toque, teclado y mando. Con mando el cursor es el del juego (stick izquierdo) y A mantenido rasca ---- */
    const keys = new Set();
    const onMove = e => { const [x, y] = toStage(e.clientX, e.clientY); cur.x = x; cur.y = y; ST.pointerIn = true; };
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerdown", e => { if (e.button !== 0 || e.target.closest(".ra-btn,.ra-pill")) return; const [x, y] = toStage(e.clientX, e.clientY); cur.x = x; cur.y = y; ST.pointerIn = true; ST.down = true; if (card) card.last = null; try { stage.setPointerCapture(e.pointerId); } catch (_) { /* sintetico */ } });
    const up = () => { ST.down = false; };
    stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up); stage.addEventListener("pointerleave", () => { ST.pointerIn = false; });
    const onBlur = () => { up(); keys.clear(); ST.keyHold = false; ST.padHold = false; }; addEventListener("blur", onBlur);   // Alt+Tab con una tecla pulsada: el keyup no llega y la doblon seguia rascando sola
    btnAll.onclick = e => { e.stopPropagation(); scratchAll(); };
    const MOVE = ["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"];
    const onKey = e => {
      if (!ov.isConnected || (e.target && e.target.matches && e.target.matches("input,textarea,select"))) return; const k = e.key.toLowerCase();
      if (MOVE.includes(k) && ST.phase === "scratch") { keys.add(k); e.preventDefault(); }
      else if (k === " ") { if (ST.phase === "scratch") { e.preventDefault(); ST.keyHold = true; } }
      else if ((k === "enter" && e.isTrusted) || k === "r" || k === "tab") { if (ST.phase === "scratch") { e.preventDefault(); scratchAll(); } }   // Intro del teclado; la A del mando manda un Intro sintetico que NO cuenta (A rasca); Y del mando = Tab
      else if (k === "shift") keys.add("shift");
    };
    const onKeyUp = e => { const k = e.key.toLowerCase(); keys.delete(k); if (k === " ") ST.keyHold = false; };
    addEventListener("keydown", onKey, true); addEventListener("keyup", onKeyUp, true);
    const padA = () => { const gs = navigator.getGamepads ? navigator.getGamepads() : [], bi = A.mando && A.mando.settings && A.mando.settings.swapAB ? 1 : 0; for (const g of gs) if (g && g.connected && g.buttons[bi] && (g.buttons[bi].pressed || g.buttons[bi].value > 0.5)) return true; return false; };
    function pollInput(dt) {
      const pad = !!(A.mando && A.mando.on); ST.padHold = false;
      if (pad) { const [x, y] = toStage(A.mando.x, A.mando.y); cur.x = x; cur.y = y; ST.padMoved = true; ST.padHold = ST.phase === "scratch" && padA(); }
      else {
        let mx = 0, my = 0; const sp = (keys.has("shift") ? 1500 : 900) * dt;
        if (keys.has("arrowleft") || keys.has("a")) mx -= 1; if (keys.has("arrowright") || keys.has("d")) mx += 1; if (keys.has("arrowup") || keys.has("w")) my -= 1; if (keys.has("arrowdown") || keys.has("s")) my += 1;
        if ((mx || my) && ST.phase === "scratch" && card && !card.auto) { cur.x = clamp(cur.x + mx * sp, 0, 1920); cur.y = clamp(cur.y + my * sp, 330, 1010); ST.padMoved = true; }
      }
      return pad;
    }

    /* ---- bucle: la doblon, la lamina, las particulas (solo transform / canvas) ---- */
    let tPrev = performance.now(), px = -1, py = -1, padCls = false, ctf = "";
    const rootEl = document.documentElement, killPend = () => { pend.forEach(e => e.rej(CANCEL)); pend.clear(); };
    function frame(now) {
      if (!alive()) { killPend(); if (!sh.closed) sh.bail("capa retirada"); return; }   // la capa se fue: libera teclado y estado (await finished no pasa por killPend)
      const dt = Math.min(0.05, (now - tPrev) / 1000); tPrev = now; const pad = pollInput(dt);
      const active = ST.phase === "scratch" && card && !card.finished, auto = active && card.autoHold, holding = active && (ST.down || ST.keyHold || ST.padHold || auto) && !(card.auto && !card.autoHold);
      const onCard = pad && active && cur.x > CX0 - 60 && cur.x < CX0 + 432 + 60 && cur.y > CY0 - 60 && cur.y < CY0 + 584 + 60;       // con mando, el cursor del juego se esconde sobre la tarjeta (ahi manda la doblon)
      if (onCard !== padCls) { padCls = onCard; rootEl.classList.toggle("ra-pad", onCard); }
      if (active && (pad ? onCard : (ST.pointerIn || ST.padMoved || card.auto || ST.keyHold || keys.size))) {
        const flat = !holding; coinEl.style.display = flat ? "block" : "none"; coinH.style.display = flat ? "none" : "block";
        const el = flat ? coinEl : coinH, hx = flat ? 36 : 40, hy = flat ? 64 : 54, tf = `translate3d(${Math.round(cur.x - hx)}px,${Math.round(cur.y - hy)}px,0)`; if (tf !== ctf || el.dataset.f !== (flat ? "1" : "0")) { ctf = tf; el.dataset.f = flat ? "1" : "0"; el.style.transform = tf; }
      } else if (!active || pad) { coinEl.style.display = coinH.style.display = "none"; }
      if (holding) {
        const nx = (cur.x - CX0) / K, ny = (cur.y - CY0) / K;
        if (nx > -4 && nx < NW + 4 && ny > -4 && ny < NH + 4) {
          const dist = px < 0 ? 0 : Math.hypot(cur.x - px, cur.y - py), removed = strokeTo(nx, ny);
          if (removed) { A.sfx.rcScratch(dist / Math.max(dt, 0.008)); flakes(cur.x, cur.y, Math.min(3, 1 + (removed >> 4))); checkCells(); }
        } else card.last = null;
      } else if (card) card.last = null;
      px = cur.x; py = cur.y; A.sfx.rcScratch.idle(now); drawParts(dt); requestAnimationFrame(frame);
    }
    function cleanup() {
      heartOff(); try { A.sfx.rcScratch.stop(); } catch (e) { /* nada */ } rootEl.classList.remove("ra-pad");
      removeEventListener("keydown", onKey, true); removeEventListener("keyup", onKeyUp, true); removeEventListener("blur", up); removeEventListener("resize", onResize);
    }

    /* ---- la tarjeta de esta partida ---- */
    function buildCard() {
      stage.style.setProperty("--amb", TH.amb); stage.style.setProperty("--gold", TH.gold); cardEl.style.setProperty("--cg", TH.gold);
      TH.syms.forEach(img); Q(".ra-signtx").textContent = tr(U.title).toUpperCase(); cardTexts(); helpP(); payPanel(); hud();
      Q(".ra-pill").innerHTML = `<i></i><span>${tr(U.labStake)} <b>${o.stake}</b></span>`; btnAll.textContent = tr(U.all);
      symsEl.innerHTML = ""; hlsEl.innerHTML = "";
      for (let i = 0; i < 9; i++) {
        const [x0, y0] = cellXY(i), im = document.createElement("img"); im.src = `${SPR}${TH.syms[out.grid[i]]}.png`; im.draggable = false; im.style.left = (x0 + 2) * K + "px"; im.style.top = (y0 + 2) * K + "px"; symsEl.appendChild(im);
        const h = document.createElement("div"); h.className = "hl"; h.style.left = (x0 * K) + "px"; h.style.top = (y0 * K) + "px"; hlsEl.appendChild(h);
      }
      Q(".ra-tag b").textContent = `${tr(U.tagNo)} ${REEL.indexOf(R) + 1} ${tr(U.tagOf)} ${REEL.length}`; Q(".ra-tag span").textContent = tr(U["th_" + th]); Q(".ra-tag").classList.add("on");
    }

    (async () => {
      try {
        requestAnimationFrame(frame);
        const base = await foilData(th); if (!alive()) throw CANCEL; if (!base) throw new Error("rasca: lamina ilegible");
        card = { rev: new Array(9).fill(false), last: null, auto: false, autoHold: false, won: false, paid: false, finished: false, tense: false, pairSeen: {} };
        buildCard(); foilInit(base); setCard(0, 0, 1, 1, 0); sfx.buy(); setBtns();
        say("rcIntro", 1); cardEl.classList.remove("off");
        if (reduced) setCard(0, 0); else await ENTRY[R.entry].call(ENTRY);
        ST.phase = "scratch"; stage.classList.add("scratching"); cur.x = 960; cur.y = 860; setBtns(); hint("hScratch");
        if (TST.auto) later(() => { if (TST.auto.all !== false) scratchAll(); }, TST.auto.delay || 600);                      // _rasca.auto ({ all, delay }): solo pruebas
        await finished; rec.done = true; cx.persist();
        await sleep(400); await speechIdle(); sh.hold(2400);                                                                    // la ultima frase del crupier se oye entera antes de cerrar (tocar la pantalla tambien cierra)
      } catch (e) {
        if (e === CANCEL) { if (!sh.closed && !ov.isConnected) sh.bail("capa retirada"); return; }   // otra pantalla se llevo la capa: que el Campamento no se quede bloqueado
        try { console.error("rasca", e); } catch (x) { /* nada */ }
        sh.bail(e);                                                                                // el resultado ya esta guardado y cobrado: un fallo de la pantalla no pierde nada
      }
    })();
  }

  A.adv._rasca = Object.assign(A.adv._rasca || {}, { outcome, decide, evaluate, TIERS, REEL, THEMES, CASI_N, DEN, RTP_N });      // solo pruebas (dev/): force (clase), reel (id), auto ({ all, delay }), st (estado)
})(window.AIQ);
