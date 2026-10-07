/* Geolite - Lluvia de fichas (v0.2.50): juego del centro de la Barra, estilo Plinko (se registra en adventure.js con A.adv.casino.add; textos en js/casino-plinko-textos.js, tablas en js/casino-plinko-tablas.js).
   Una ficha (la doblon, a escala pequena) cae por 12 filas de clavijas al tresbolillo: en cada una un bit 50/50 decide izquierda o derecha y las paredes rebotan; acaba en una de 11 casillas con multiplicador.
   El jugador elige la ficha (2 / 5 / 10), el RIESGO (Seguro, Equilibrado, Arriesgado: 3 tablas) y la COLUMNA de salida (1-11). Las 33 tablas rinden entre el 96,00 y el 97,00 % EXACTO (programacion dinamica, comprobado
   enumerando los 4096 caminos; tools/art/plinko/rtp.cjs): la columna y el riesgo cambian la varianza, no el retorno. La fraccion de moneda (5 x 0,3 = 1,5) se sortea con la misma semilla, asi que el retorno es exacto con
   cualquier ficha. Los 12 bits del camino y esa fraccion salen de A.rng(`semilla:plinko:ronda:intento`) ANTES de animar; el registro run.reds[r] se guarda y se cobra al soltar (recargar a medias no lo deshace). Las
   presentaciones (11), los decorados del tablero (4), los falsos destellos y la camara lenta salen de un azar APARTE y no dependen de la casilla, la ficha, el riesgo ni la columna. El crupier es el sprite animado
   (A.crupier.mount) y va fuera del escenario escalado, para que su pixel quede entero en pantalla. Escenario de 1920x1080 con el arte a x4 (cada pixel del arte = K pixeles de pantalla, K entero). */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const CS = A.adv && A.adv.casino, TX = A.plkTx, TAB = A.plkTab; if (!CS || !TX || !TAB) return;
  const L6 = A.L6, tr = o => A.tx(o), U = {}, LN = {}, LAST = {};
  for (const k in TX.ui) U[k] = L6(TX.ui[k]);
  for (const k in TX.lines) LN[k] = TX.lines[k].map(s => L6(s));
  const BET = { n: L6(TX.bet.n), d: L6(TX.bet.d), s: L6(TX.bet.s), ico: "bet_plinko" };
  const NR = TAB.R, NC = TAB.COLS, PMAX = 2 * (NC - 1), K = 4, REST = 40, CHUTE_Y = 52, SLOT_Y = 776, WALLX = [8 * K + 24, 206 * K - 24];
  const PX = p => (17 + 9 * p) * K, PY = r => (34 + 13 * r) * K;
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), easeOut = p => 1 - Math.pow(1 - p, 3);
  const vr = Math.random, ri = (a, b) => a + Math.floor(vr() * (b - a + 1)), pick = a => a[Math.floor(vr() * a.length)];
  const PRES = ["clasica", "equilibrio", "doble", "carambola", "giro", "camara", "lluvia", "destellos", "luces", "pesada", "ligera"];   // el carrete de caidas (11)
  const DECORS = ["petroleo", "noche", "marmol", "rubi"];                                                                        // el carrete de decorados del tablero (4)
  /* situacion -> [caras del rig], [gestos del rig] (A.crupier.list() / A.crupier.gestures()) */
  const SIT = { plkDrop: [["sly", "laugh"], ["nod", "head_tilt"]], plkFall: [["sly", "shock"], ["head_tilt", "lean_in"]], plkZero: [["laugh"], ["hat_pop", "nod"]], plkLow: [["laugh", "sly"], ["nod", "head_tilt"]], plkOk: [["sly", "shock"], ["head_tilt", "nod"]],
    plkBig: [["angry", "shock"], ["tremble_body", "hat_pop"]], plkMax: [["shock", "furious"], ["tantrum", "tremble_body"]], plkNear: [["laugh"], ["lean_in", "head_tilt"]], plkCenter: [["sly", "laugh"], ["nod", "lean_in"]],
    plkSlump: [["laugh"], ["head_tilt", "shrug"]], plkEdge: [["sly", "shock"], ["lean_in", "head_tilt"]] };
  const COMMA = new Set(["es", "es-419", "fr", "pt", "de", "it", "ru", "pl"]);
  const fm = t => { const v = t % 10 === 0 ? String(t / 10) : (t / 10).toFixed(1); return COMMA.has(A.lang) ? v.replace(".", ",") : v; };
  const pct = (x, d = 1) => { const v = (100 * x).toFixed(d); return COMMA.has(A.lang) ? v.replace(".", ",") : v; };
  const tier = t => (t === 0 ? 0 : t < 10 ? 1 : t < 50 ? 2 : t < 250 ? 3 : 4);
  const fill = (o, m) => tr(o).replace(/\{(\w+)\}/g, (s, k) => (m[k] != null ? m[k] : s));
  const preload = () => { if (preload.done) return; preload.done = 1; ["board_petroleo", "board_noche", "board_marmol", "board_rubi", "chip", "peg_petroleo", "halo_petroleo", "trail_petroleo", "cenefa", "arrow_on"].forEach(n => { new Image().src = `assets/plinko/${n}.png`; }); };

  /* ------------------------------------------------------------------ el camino y la decision: semilla -> camino -> casilla -> premio (todo ANTES de animar) */
  function step(p, b) { let q = p + (b ? 1 : -1), w = 0; if (q < 0) { q = 1; w = -1; } else if (q > PMAX) { q = PMAX - 1; w = 1; } return { q, w }; }
  function walk(rand, col) {                                                              // P[r] = posicion al llegar a la clavija de la fila r (P[12] = la final); p en medios carriles (0..20)
    const P = [2 * col], bits = [], wall = [];
    for (let r = 0; r < NR; r++) { const b = rand() < 0.5 ? 0 : 1, s = step(P[r], b); P.push(s.q); bits.push(b); wall.push(s.w); }
    return { P, bits, wall, slot: P[NR] / 2 };
  }
  function decide(key, col, risk, stake) {
    const F = A.adv._plinko && A.adv._plinko.force; let res;                                // _plinko.force(res): solo pruebas, busca una semilla que lo cumpla
    for (let k = 0; k < (F ? 20000 : 1); k++) {
      const u = A.rng(F ? `${key}:f${k}` : key), w = walk(u, col), t = TAB.pay[risk][col][w.slot], x = stake * t, f = u(), coins = Math.floor(x / 10) + (f < (x % 10) / 10 ? 1 : 0);   // t en decimas; la fraccion se sortea con la misma semilla
      res = { walk: w, slot: w.slot, t, x, coins, col, risk, stake };
      if (!F || F(res)) break;
    }
    return res;
  }
  const hist = () => { const a = A.profile.get().adv; return (a.plkHist = Array.isArray(a.plkHist) ? a.plkHist : []); };   // las ultimas caidas, entre expediciones (el crupier las comenta: 3 al centro, 3 sin premio)
  function sitFor(res) {
    const H = hist(), cn = TAB.counts[res.col], pays = TAB.pay[res.risk][res.col], mxv = Math.max(...pays.map((v, j) => (cn[j] ? v : 0)));
    if (res.t === mxv && res.t >= 20) return "plkMax";
    if (res.t >= 50) return "plkBig";
    if (res.t < 10 && mxv >= 50 && pays.some((v, j) => cn[j] && v === mxv && Math.abs(res.slot - j) === 1)) return "plkNear";
    if (H.length >= 2 && H.slice(-2).concat([{ s: res.slot }]).every(h => h.s >= 4 && h.s <= 6)) return "plkCenter";
    if (H.length >= 2 && H.slice(-2).concat([{ t: res.t }]).every(h => h.t < 10)) return "plkSlump";
    return res.t === 0 ? "plkZero" : res.t < 10 ? "plkLow" : "plkOk";
  }
  const levelOf = res => (res.coins <= res.stake ? 0 : res.t >= 250 ? 3 : res.t >= 50 ? 2 : 1);   // recompensa por niveles (sonido, temblor y luz crecientes); solo si ganas de verdad

  /* ------------------------------------------------------------------ la carta de la Barra y su cableado */
  let stakeI = 0, riskI = 1, colI = 5;
  CS.add({ id: "plk", bet: BET,
    card(cx) {
      preload(); const b = cx.b;
      if (b && b.id === "plk" && b.att === cx.att) return `<div class="sup bet cas bt-plk done ${b.coins > b.stake ? "win" : "lose"}" data-bet="plk">${cx.head}<em class="bt-res"><b>×${fm(b.t)}</b>${b.coins ? "+" + b.coins : ""}</em></div>`;
      return `<div class="sup bet cas bt-plk" data-bet="plk">${cx.head}<span class="bt-pick"><button class="bt-c bt-pl" type="button" data-play="1">${tr(U.play)}</button><em class="sp-p bt-stake" role="button" tabindex="0">${cx.CN()}${cx.coinCost(stakeI)}</em></span></div>`;
    },
    wire(el, cx) {
      const pill = el.querySelector(".bt-stake");
      if (pill) pill.onclick = e => { e.stopPropagation(); stakeI = (stakeI + 1) % cx.STAKES.length; pill.innerHTML = cx.CN() + cx.coinCost(stakeI); A.sfx.tick(1); };
      const btn = el.querySelector("[data-play]"); if (!btn) return;
      btn.onclick = e => {
        e.stopPropagation(); if (cx.open) return; if (cx.run.coins < cx.coinCost(0)) { A.sfx.deny(); cx.shake(el); return; }
        A.sfx.rouBet(1); if (A.haptic) A.haptic([10]);
        spinPlinko({ cx }, () => { const run = cx.run; if (!run || A.core.S.phase !== "shop" || !run.stock) return; cx.refresh(); });   // la ficha se paga al SOLTAR, dentro de la pantalla
      };
    },
  });

  /* ------------------------------------------------------------------ la pantalla */
  function spinPlinko(o, done) {
    const cx = o.cx, TST = A.adv._plinko || {};
    const html = `<div class="pk-stage" data-decor="petroleo"><div class="pk-bg"></div>
      <div class="pk-left"><div class="rou-pick"><span class="rp-dot rp-plk"></span><span class="rp-k">${tr(cx.BT.seal)}</span><b></b></div><div class="pk-bubble"><span></span></div><div class="pk-hint"></div><div class="pk-hist"></div></div>
      <div class="pk-top"><b class="pk-no"></b><div class="pk-res"><span class="pk-plate"></span><span class="pk-msg"></span></div></div>
      <div class="pk-bshadow"></div>
      <div class="pk-board"><img class="pk-back petroleo" src="assets/plinko/board_petroleo.png" alt="" draggable="false"><img class="pk-back noche" src="assets/plinko/board_noche.png" alt="" draggable="false"><img class="pk-back marmol" src="assets/plinko/board_marmol.png" alt="" draggable="false"><img class="pk-back rubi" src="assets/plinko/board_rubi.png" alt="" draggable="false">
        <i class="pk-lights t"></i><i class="pk-lights b"></i><i class="pk-lights l"></i><i class="pk-lights r"></i>
        <div class="pk-layer pk-notches"></div><div class="pk-layer pk-pegs"></div><div class="pk-layer pk-slots"></div><div class="pk-layer pk-fx"></div><div class="pk-vig"></div></div>
      <div class="pk-right"><div class="pk-lab pk-l0"></div><div class="pk-risks"></div><div class="pk-lab pk-l1"></div><div class="pk-stakes"></div><div class="pk-lab pk-l2"></div>
        <div class="pk-cols"><button class="pk-arrow pk-cl" type="button">◄</button><b></b><button class="pk-arrow pk-cr" type="button">►</button></div><div class="pk-prob"></div><div class="pk-info"></div><button class="pk-go" type="button"></button></div>
      <button class="pk-back2" type="button"></button><div class="pk-hud"></div></div><div class="pk-dealer"></div>`;
    let spr = null;
    const sh = cx.rouShell("plk", html, {}, () => { try { A.dealer.hold(false); } catch (e) { /* sin crupier */ } try { spr && spr.dead !== true && spr.destroy && spr.destroy(); } catch (e) { /* nada */ } done(); });
    if (!sh) return;
    try { A.dealer.hold(true); } catch (e) { /* sin crupier */ }                                  // el crupier de la esquina calla: aqui habla el de la mesa
    const ov = sh.ov, stage = ov.querySelector(".pk-stage"), reduced = sh.reduced, Q = s => ov.querySelector(s), QA = s => [...ov.querySelectorAll(s)], CANCEL = {}, run = cx.run;
    ov.classList.remove("spin"); preload();
    const ST = (TST.st = { phase: "pick", ts: 1, row: -1, plan: null, dropped: false, col: colI, risk: riskI, lastSlot: -1, slow: TST.slow || 1 });   // ST.phase: solo pruebas (pick, drop, fall, done)
    const dealerHost = Q(".pk-dealer");
    const fit = () => {
      const W = ov.clientWidth || innerWidth, H = ov.clientHeight || innerHeight; let k = 2; for (const c of [3, 4, 5, 6]) if ((1920 * c / 4 - W) / 2 <= 90 && (1080 * c / 4 - H) / 2 <= 24) k = c;
      const s = k / 4, ox = Math.round((W - 1920 * s) / 2), oy = Math.round((H - 1080 * s) / 2); stage.style.transform = `translate(${ox}px,${oy}px) scale(${s})`;
      const sn = A.crupier.snap(320 * s), box = 320 * s, css = sn.css || box;                      // el crupier a pixel entero de pantalla: va fuera del escenario escalado
      dealerHost.style.cssText = `left:${ox + 100 * s + (box - css) / 2}px;top:${oy + 100 * s + (box - css) / 2}px;width:${css}px;height:${css}px`;
    };
    fit(); const onResize = () => { if (ov.isConnected) fit(); }; addEventListener("resize", onResize);
    const alive = () => !sh.closed && ov.isConnected, pend = new Set();
    const sleep = ms => new Promise((res, rej) => setTimeout(() => (alive() ? res() : rej(CANCEL)), ms));
    const waitFor = fn => new Promise((res, rej) => { const e = { rej }; pend.add(e); fn(v => { pend.delete(e); res(v); }); });
    const mk = (cls, parent, inner) => { const d = document.createElement("div"); d.className = cls; if (inner) d.innerHTML = inner; (parent || fx).appendChild(d); return d; };
    const board = Q(".pk-board"), fx = Q(".pk-fx");
    /* ---- piezas del tablero ---- */
    const pegs = {}, halos = [], trails = [], slots = [], notches = [];
    { const L0 = Q(".pk-pegs"); for (let r = 0; r < NR; r++) for (let p = r % 2; p <= PMAX; p += 2) { const e = mk("pg", L0); e.style.transform = `translate3d(${PX(p) - 16}px,${PY(r) - 16}px,0)`; pegs[r * 21 + p] = e; } }
    for (let j = 0; j < NC; j++) { const n = mk("pk-notch", Q(".pk-notches"), `<span>${j + 1}</span>`); n.style.left = (PX(2 * j) - 36) + "px"; n.onclick = () => setCol(j); notches.push(n); }
    for (let j = 0; j < NC; j++) { const s = mk("pk-slot", Q(".pk-slots")); s.style.left = ((17 + 18 * j - 8) * K) + "px"; slots.push(s); }
    for (let i = 0; i < 7; i++) halos.push(mk("pk-halo"));
    const wallEl = [mk("pk-wall l"), mk("pk-wall r")];
    const TR = 9; for (let i = 0; i < TR; i++) { const t = mk("pk-trail"); t.style.backgroundPositionX = -(i < 4 ? 0 : i < 7 ? 1 : 2) * 24 + "px"; trails.push(t); }
    const chipEl = mk("pk-chip"), spinEl = mk("pk-spin", stage); spinEl.style.left = "0"; spinEl.style.top = "0";
    let cxp = 0, cyp = 0, haloN = 0, trailHist = [], chipF = 0, root = 57;
    const setFrame = f => { if (f !== chipF) { chipF = f; chipEl.style.backgroundPositionX = -f * 48 + "px"; } };
    function place(x, y) {
      x = Math.round(x / K) * K; y = Math.round(y / K) * K; if (x === cxp && y === cyp) return; cxp = x; cyp = y;
      chipEl.style.transform = `translate3d(${x - 24}px,${y - 24}px,0)`;
      trailHist.unshift(x, y); if (trailHist.length > (TR * 2 + 2) * 2) trailHist.length = (TR * 2 + 2) * 2;
      for (let i = 0; i < TR; i++) { const k = Math.min((trailHist.length >> 1) - 1, (i + 1) * 2) * 2, t = trails[i]; t.style.transform = `translate3d(${trailHist[k] - 12}px,${trailHist[k + 1] - 12}px,0)`; t.style.opacity = reduced ? 0 : 1 - i / (TR + 2); }
    }
    const trailOff = () => { trailHist.length = 0; trails.forEach(t => (t.style.opacity = 0)); };
    const chipShow = v => { chipEl.style.display = v ? "block" : "none"; if (!v) trailOff(); };
    const chipPark = () => { chipShow(true); trailOff(); setFrame(0); place(PX(2 * ST.col), CHUTE_Y); trailOff(); };
    const run1 = (dur, fn) => new Promise((res, rej) => { dur = Math.max(30, dur * ST.ts * ST.slow * (reduced ? 0.6 : 1)); const t0 = performance.now(); const f = now => { if (!alive()) return rej(CANCEL); const p = clamp((now - t0) / dur, 0, 1); fn(p); p < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });

    /* ---- la voz del crupier: sprite animado, globo (siempre 1 s mas en pantalla), cola (nunca se le corta una frase) ---- */
    const bubble = Q(".pk-bubble"), bTx = bubble.firstChild, hintEl = Q(".pk-hint"), SP = { cur: false, pend: null }; let talkIv = 0;
    try { spr = A.crupier.mount(dealerHost, { fidget: !reduced }); spr.set("sly"); } catch (e) { spr = null; }
    const rigSet = f => { if (spr) { try { spr.set(f); } catch (e) { /* nada */ } } }, rigPlay = g => { if (spr && !reduced) { try { spr.play(g); } catch (e) { /* nada */ } } };
    const lineOf = key => { const a = LN[key]; let i = Math.floor(vr() * a.length); if (i === LAST[key] && a.length > 1) i = (i + 1 + Math.floor(vr() * (a.length - 1))) % a.length; LAST[key] = i; return tr(a[i]) || ""; };
    function speak(p) {
      SP.cur = true; bTx.textContent = p.text; bubble.classList.add("on"); rigSet(p.face); rigPlay(p.g);
      if (spr) { clearInterval(talkIv); try { spr.talk(true); } catch (e) { /* nada */ } let n = 0; talkIv = setInterval(() => { if (!alive() || ++n > Math.min(60, p.text.length)) { clearInterval(talkIv); try { spr.talk(false); } catch (e) { /* nada */ } return; } try { spr.syl(); } catch (e) { /* nada */ } }, 70); }
      setTimeout(() => { if (!alive()) return; bubble.classList.remove("on"); rigSet("sly"); if (SP.pend) { const n = SP.pend; SP.pend = null; setTimeout(() => alive() && speak(n), 350); } else SP.cur = false; }, 1800 + p.text.length * 22 + (A.dealer.LINGER || 1000));
    }
    function say(key, prio = 1, skipIfBusy, over) {
      if (skipIfBusy && SP.cur) return; const f = SIT[key], p = { text: lineOf(key), face: (over && over.face) || pick(f[0]), g: (over && over.g) || pick(f[1]), prio };
      if (SP.cur) { if (!SP.pend || prio >= SP.pend.prio) SP.pend = p; return; } speak(p);
    }
    const speechIdle = () => waitFor(res => { const iv = setInterval(() => { if (!alive() || (!SP.cur && !SP.pend)) { clearInterval(iv); res(); } }, 120); });
    const hint = k => { if (!k) { hintEl.classList.remove("on"); return; } hintEl.textContent = tr(U[k]); hintEl.classList.add("on"); };

    /* ---- el panel: riesgo, ficha, columna, barras de probabilidad, resumen y bolsa ---- */
    const stakes = [0, 1, 2].map(i => cx.coinCost(i));
    let purse = run.coins;
    Q(".pk-risks").innerHTML = [0, 1, 2].map(i => `<button class="pk-risk" type="button" data-r="${i}"></button>`).join("");
    Q(".pk-stakes").innerHTML = stakes.map((v, i) => `<button class="pk-stk" type="button" data-v="${i}">${cx.CN()}${v}</button>`).join("");
    const payOf = () => TAB.pay[ST.risk][ST.col], hudOf = () => Math.max(...payOf().map((v, j) => (TAB.counts[ST.col][j] ? v : 0)));
    function renderSlots(anim) {
      const t = payOf(), cn = TAB.counts[ST.col];
      slots.forEach((s, j) => { const txt = "×" + fm(t[j]); s.className = "pk-slot t" + tier(t[j]) + (txt.length > 4 ? " s3" : "") + (cn[j] ? "" : " off"); s.textContent = txt;
        if (anim && !reduced) s.animate([{ transform: "translateY(-14px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 450, delay: Math.abs(j - 5) * 30, easing: "steps(5)", fill: "backwards" }); });
    }
    function renderPanel() {
      const t = payOf(), cn = TAB.counts[ST.col], N = TAB.N, st = TAB.stats[ST.risk][ST.col], mx = hudOf(), mxn = cn.reduce((s, n, j) => s + (n && t[j] === mx ? n : 0), 0);   // mxn: caminos que acaban en CUALQUIER casilla del maximo (las dos esquinas valen lo mismo)
      Q(".pk-cols b").innerHTML = `${ST.col + 1}<small>/ ${NC}</small>`; notches.forEach((n, j) => n.classList.toggle("on", j === ST.col));
      Q(".pk-prob").innerHTML = cn.map((n, j) => `<u class="${j === ST.lastSlot ? "cur" : n ? "" : "z"}" style="height:${Math.max(3, Math.round(60 * n / Math.max(...cn)))}px"></u>`).join("");
      const one = mxn ? fill(U.iOne, { n: Math.round(N / mxn) }) : "—";
      Q(".pk-info").innerHTML = `${fill(U.iMax, { m: fm(mx), p: one })}<br>${fill(U.iWin, { a: pct(st.hit), b: pct(st.zero) })}<br>${fill(U.iRtp, { r: pct(TAB.rtp[ST.risk][ST.col], 2) })}`;
      QA(".pk-risk").forEach((b, i) => { b.classList.toggle("on", i === ST.risk); const tt = TAB.pay[i][5]; b.innerHTML = `<span>${tr(U["risk" + i])}</span><span class="sh">${[0, 1, 2, 3, 4, 5].map(j => `<u style="height:${Math.max(3, Math.round(34 * Math.log(1 + tt[j] / 10) / Math.log(1 + tt[0] / 10)))}px"></u>`).join("")}</span>`; });
      QA(".pk-stk").forEach((b, i) => b.classList.toggle("on", i === stakeI));
      Q(".pk-l0").textContent = tr(U.labRisk); Q(".pk-l1").textContent = tr(U.labStake); Q(".pk-l2").textContent = tr(U.labCol); Q(".pk-go").textContent = tr(U.go); Q(".pk-back2").textContent = tr(U.back);
      Q(".rou-pick b").textContent = `${tr(BET.n)} · ${stakes[stakeI]}`;
      Q(".pk-hud").innerHTML = `<span>${cx.CN()}<small>${tr(U.bal)}</small><em>${purse}</em></span><span><small>${tr(U.labStake)}</small><em>${stakes[stakeI]}</em></span><span><small>${tr(U.maxl)}</small><em>×${fm(mx)}</em></span>`;
    }
    function renderHist(newOne) { Q(".pk-hist").innerHTML = hist().slice(-9).map((h, i, a) => `<b class="t${tier(h.t)}${newOne && i === a.length - 1 ? " n" : ""}">×${fm(h.t)}</b>`).join(""); }
    const setCol = j => { if (ST.dropped) return; const c = clamp(j, 0, NC - 1); if (c !== ST.col) A.sfx.tick(0); colI = ST.col = c; ST.lastSlot = -1; chipPark(); renderSlots(true); renderPanel(); };
    const setRisk = r => { if (ST.dropped) return; riskI = ST.risk = (r + 3) % 3; A.sfx.tick(1); renderSlots(true); renderPanel(); };
    const setStake = i => { if (ST.dropped) return; stakeI = i; A.sfx.tick(1); renderPanel(); };
    QA(".pk-risk").forEach(b => (b.onclick = () => setRisk(+b.dataset.r))); QA(".pk-stk").forEach(b => (b.onclick = () => setStake(+b.dataset.v)));
    Q(".pk-cl").onclick = () => setCol(ST.col - 1); Q(".pk-cr").onclick = () => setCol(ST.col + 1); Q(".pk-go").onclick = () => doDrop(); Q(".pk-back2").onclick = () => { if (!ST.dropped) sh.close(); };
    const onKey = e => {
      if (!ov.isConnected || ST.dropped) return; const k = e.key;
      if (k === "ArrowLeft") { setCol(ST.col - 1); e.preventDefault(); } else if (k === "ArrowRight") { setCol(ST.col + 1); e.preventDefault(); }
      else if (k === "ArrowUp") { setRisk(ST.risk - 1); e.preventDefault(); } else if (k === "ArrowDown" || k === "r" || k === "R") { setRisk(ST.risk + 1); e.preventDefault(); }
      else if ((k === "s" || k === "S") && !e.ctrlKey && !e.metaKey && !e.altKey) { setStake((stakeI + 1) % cx.STAKES.length); e.preventDefault(); }   // la ficha tambien con el teclado
      else if (k >= "1" && k <= "9") setCol(+k - 1); else if (k === "0") setCol(9); else if (k === "Enter" || k === " ") { e.preventDefault(); doDrop(); } else if (k === "Escape") { e.preventDefault(); sh.close(); }
    };
    addEventListener("keydown", onKey, true);

    /* ---- efectos: clavijas, aros de luz, paredes, temblor del tablero ---- */
    const litKeys = [{ backgroundPositionX: "-64px", offset: 0 }, { backgroundPositionX: "-64px", offset: 0.22 }, { backgroundPositionX: "-32px", offset: 0.23 }, { backgroundPositionX: "-32px", offset: 0.55 }, { backgroundPositionX: "0px", offset: 0.56 }, { backgroundPositionX: "0px", offset: 1 }];
    const haloKeys = [{ opacity: 1, backgroundPositionX: "0px", offset: 0 }, { opacity: 1, backgroundPositionX: "0px", offset: 0.24 }, { opacity: 0.9, backgroundPositionX: "-112px", offset: 0.25 }, { opacity: 0.8, backgroundPositionX: "-112px", offset: 0.55 }, { opacity: 0.5, backgroundPositionX: "-224px", offset: 0.56 }, { opacity: 0, backgroundPositionX: "-224px", offset: 1 }];
    function lightPeg(r, p, dur = 520, halo = true) {
      const e = pegs[r * 21 + p]; if (!e) return; e.animate(litKeys, { duration: dur });
      if (halo && !reduced) { const h = halos[haloN++ % halos.length]; h.style.transform = `translate3d(${PX(p) - 56}px,${PY(r) - 56}px,0)`; h.animate(haloKeys, { duration: 400 }); }
    }
    const wallFlash = side => { const w = wallEl[side < 0 ? 0 : 1]; w.style.setProperty("--wc", "#fff3b0"); w.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 420, easing: "ease-out" }); };
    const sk = { a: 0, on: false }; function bump(a) { sk.a = Math.max(sk.a, reduced ? 0 : a); if (!sk.on) { sk.on = true; requestAnimationFrame(shk); } }
    function shk() { const a = sk.a; if (a < 0.6 || !alive()) { board.style.transform = ""; sk.on = false; sk.a = 0; return; } board.style.transform = `translate3d(${Math.round((vr() - 0.5) * 2 * a / 4) * 4}px,${Math.round((vr() - 0.5) * 2 * a / 4) * 4}px,0)`; sk.a *= 0.84; requestAnimationFrame(shk); }
    const plate = (kind, name, extra, msg) => { const p = Q(".pk-plate"); p.className = "pk-plate " + kind; p.innerHTML = `<b>${name}</b>${extra ? `<i>${extra}</i>` : ""}`; Q(".pk-msg").textContent = msg; const r = Q(".pk-res"); r.classList.remove("on"); void r.offsetWidth; r.classList.add("on"); };
    const flash = () => { ov.classList.remove("flash"); void ov.offsetWidth; ov.classList.add("flash"); };

    /* ---- la caida: cada presentacion es un plan que modifica solo el ASPECTO ---- */
    function makePlan(id) {
      const p = { id, base: 205, hop: 14, shake: 1, dbl: [], bal: null, carom: null, slow: null, spin: false, toss: false, rain: 0, flashes: 0, wave: false };
      if (id === "equilibrio") p.bal = { r: ri(3, 8), ms: ri(750, 1250) };
      if (id === "doble") { const a = ri(1, 3), b = ri(5, 8); p.dbl = [a, b].slice(0, ri(1, 2)); }
      if (id === "carambola") p.carom = { r: ri(2, 7) };
      if (id === "giro") { p.spin = true; p.toss = true; }
      if (id === "camara") p.slow = 8;
      if (id === "lluvia") p.rain = ri(8, 11);
      if (id === "destellos") p.flashes = ri(3, 5);
      if (id === "luces") p.wave = true;
      if (id === "pesada") { p.base = 190; p.hop = 6; p.shake = 2.6; }
      if (id === "ligera") { p.base = 275; p.hop = 38; p.shake = 0.5; }
      return p;
    }
    function hitPeg(r, p, prevBit) {
      ST.row = r; lightPeg(r, p); A.sfx.plkPeg(r + (prevBit || 0), root, false); const late = r >= NR - 3 ? (r - (NR - 4)) : 0; bump((late * 5 + 3) * (r >= NR - 3 ? 1 : 0.4) * (ST.plan.shake || 1));   // el temblor del tablero crece en las 3 ultimas filas
    }
    const arc = (x0, y0, x1, y1, dur, hop, f) => run1(dur, p => { setFrame(ST.plan.spin ? Math.floor(performance.now() / 70) % 12 : 0); place(lerp(x0, x1, p), lerp(y0, y1, f ? f(p) : p) - 4 * hop * p * (1 - p)); });
    const lift = on => { chipEl.style.filter = on ? "drop-shadow(8px 20px 0 rgba(8,0,24,.32))" : ""; };
    async function fall(res, plan) {
      const W = res.walk, P = W.P, ys = r => PY(r) - REST, xs = p => PX(p), row = () => plan.base * (0.9 + vr() * 0.2);
      ST.phase = "fall"; chipShow(true); setFrame(0); place(xs(P[0]), CHUTE_Y); trailOff(); Q(".pk-vig").classList.remove("on");
      if (plan.toss) await tossIntro(xs(P[0]));
      await run1(330, p => place(xs(P[0]), lerp(CHUTE_Y, ys(0), p * p)));
      hitPeg(0, P[0], 0); ST.ts = 1;
      for (let r = 0; r < NR; r++) {
        if (plan.slow != null && r === plan.slow) { ST.ts = 2.4; Q(".pk-vig").classList.add("on"); board.classList.add("crawl"); }              // camara lenta: siempre las ultimas filas (no delata nada)
        const x0 = xs(P[r]), y0 = ys(r), last = r === NR - 1;
        if (plan.bal && plan.bal.r === r) {                                                                                                       // en equilibrio: tiembla sobre la clavija antes de decidirse
          const ms = plan.bal.ms, dir = W.bits[r] ? 1 : -1; let k = 0;
          await run1(ms, p => { const a = (1 - p) * 10 * Math.sin(p * 19) + (p > 0.8 ? (p - 0.8) * 5 * 12 * dir : 0); if (Math.floor(p * 9) !== k) { k = Math.floor(p * 9); A.sfx.plkTick(); lightPeg(r, P[r], 160, false); } place(x0 + a, y0 - Math.abs(Math.sin(p * 9)) * 2); });
        }
        if (W.wall[r]) {                                                                                                                          // rebote en la pared: va hacia ella, la toca y vuelve hacia dentro
          const side = W.wall[r], wx = WALLX[side < 0 ? 0 : 1], d = row();
          await arc(x0, y0, wx, y0 + 8, d * 0.42, 6, easeOut); wallFlash(side); A.sfx.plkWall(); bump(12 * plan.shake);
          const ex = last ? xs(P[NR]) : xs(P[r + 1]), ey = last ? SLOT_Y : ys(r + 1);
          await arc(wx, y0 + 8, ex, ey, d * 0.8, plan.hop, null);
        } else if (plan.carom && plan.carom.r === r && !last) {                                                                                   // carambola: sale en alto hasta la pared lateral y vuelve al tablero
          const wx = x0 < 480 ? WALLX[0] : WALLX[1], d = row() * clamp(Math.abs(wx - x0) / 300, 0.9, 1.7); lift(true);
          await arc(x0, y0, wx, y0 - 20, d, 60, easeOut); wallFlash(wx < 480 ? -1 : 1); A.sfx.plkWall(); bump(14);
          await arc(wx, y0 - 20, xs(P[r + 1]), ys(r + 1), d, 70, null); lift(false);
        } else if (plan.dbl.includes(r) && r <= NR - 3 && !W.wall[r + 1]) {                                                                       // doble salto: dos filas de golpe
          const d = row() * 1.55; lift(true); let mid = false;
          await run1(d, p => { const xm = p < 0.5 ? lerp(x0, xs(P[r + 1]), p * 2) : lerp(xs(P[r + 1]), xs(P[r + 2]), p * 2 - 1); setFrame(0); place(xm, lerp(y0, ys(r + 2), p) - 4 * 46 * p * (1 - p)); if (!mid && p >= 0.5) { mid = true; lightPeg(r + 1, P[r + 1], 380); A.sfx.plkPeg(r + 1 + W.bits[r], root, true); } });
          lift(false); r += 1; hitPeg(r + 1, P[r + 1], W.bits[r]);
          continue;
        } else {
          const ex = last ? xs(P[NR]) : xs(P[r + 1]), ey = last ? SLOT_Y : ys(r + 1);
          await arc(x0, y0, ex, ey, last ? row() * 1.25 : row(), last ? plan.hop + 8 : plan.hop, null);
        }
        if (!last) hitPeg(r + 1, P[r + 1], W.bits[r]);
      }
      const sx = xs(P[NR]); await arc(sx, SLOT_Y, sx, SLOT_Y, 230, 22, null); await arc(sx, SLOT_Y, sx, SLOT_Y, 170, 9, null);                         // la casilla: dos rebotes pequenos y se asienta
      setFrame(0); ST.ts = 1; board.classList.remove("crawl"); Q(".pk-vig").classList.remove("on");
    }
    async function tossIntro(x) {                                                                                                                // el crupier lanza la doblon: la de verdad (coin_spin, 24 fotogramas) sube en arco hasta la tolva y se hace ficha
      chipShow(false); spinEl.style.display = "block"; rigPlay("coin_toss"); let f = -1; const sx = 330, sy = 380, ex = 532 + x - 96, ey = 110 + CHUTE_Y - 96;
      await run1(950, p => { const nfr = Math.floor(p * 40) % 24; if (nfr !== f) { f = nfr; spinEl.style.backgroundPositionX = -nfr * 192 + "px"; } spinEl.style.transform = `translate3d(${Math.round(lerp(sx, ex, p) / 4) * 4}px,${Math.round((lerp(sy, ey, p) - 4 * 230 * p * (1 - p)) / 4) * 4}px,0)`; });
      spinEl.style.display = "none"; chipShow(true); place(x, CHUTE_Y); lightPeg(0, ST.col * 2, 0, true); halos[0].style.transform = `translate3d(${x - 56}px,${CHUTE_Y - 56}px,0)`; halos[0].animate(haloKeys, { duration: 400 }); A.sfx.plkDrop();
    }
    function rainChips(n, gold) {                                                                                                                // fichas decorativas: caen por su cuenta (azar de presentacion, ni luz ni notas) y se pierden en una casilla; no significan nada
      for (let i = 0; i < n; i++) (async () => {
        try {
          const el = mk("pk-chip ghost" + (gold ? " goldy" : ""), fx); if (gold) { el.style.filter = "drop-shadow(4px 8px 0 rgba(8,0,24,.4))"; el.style.opacity = ".95"; el.style.zIndex = 4; }
          const col = ri(0, NC - 1), w = walk(A.rng("ghost:" + vr()), col), mv = (x, y) => (el.style.transform = `translate3d(${Math.round(x / K) * K - 24}px,${Math.round(y / K) * K - 24}px,0)`);
          el.style.backgroundPositionX = -ri(0, 11) * 48 + "px"; el.style.opacity = "0"; mv(PX(w.P[0]), -40); await sleep(i * (gold ? 45 : 170) + ri(0, 150)); el.style.opacity = gold ? "0.95" : "0.42";
          for (let r = 0; r < NR; r++) { const y0 = r ? PY(r - 1) - REST : -40, x1 = PX(w.P[r]); await run1(r ? 230 : 300, p => mv(lerp(PX(w.P[Math.max(0, r - 1)]), x1, p), lerp(y0, PY(r) - REST, p) - 4 * 12 * p * (1 - p))); }
          await run1(300, p => mv(PX(w.P[NR]), lerp(PY(NR - 1) - REST, SLOT_Y, p))); el.animate([{ opacity: gold ? 0.95 : 0.42 }, { opacity: 0 }], { duration: 500, fill: "forwards" }); await sleep(520); el.remove();
        } catch (e) { /* la capa se cerro */ }
      })();
    }
    async function wave() { for (let r = 0; r < NR; r++) { for (let p = r % 2; p <= PMAX; p += 2) { if ((p + r * 3) % 4 === 0 || p === ST.col * 2) lightPeg(r, p, 420, false); } A.sfx.plkPeg(r, root, true); await sleep(r < 2 ? 70 : 62); } await sleep(200); }

    /* ---- soltar: se decide, se guarda y se cobra; luego, la caida ---- */
    async function doDrop() {
      if (ST.dropped) return; const stake = stakes[stakeI];
      if (run.coins < stake) { A.sfx.deny(); cx.shake(Q(".pk-go")); return; }
      ST.dropped = true; ST.phase = "drop"; ov.classList.add("dropped"); Q(".pk-back2").hidden = true;
      const att = run.attempt || 0, res = decide(`${run.seed}:plinko:${cx.r}:${att}`, ST.col, ST.risk, stake);
      run.coins += res.coins - stake; if (res.coins > stake) run.stats.coinsEarned += res.coins - stake;                                          // se cobra al soltar, como la ruleta: recargar a medias no lo deshace
      run.reds = run.reds || {}; run.reds[cx.r] = { id: "plk", att, stake, risk: ST.risk, col: ST.col, slot: res.slot, t: res.t, coins: res.coins };
      cx.persist(); purse = run.coins - res.coins; renderPanel(); { const cb = document.querySelector("#shopCoins b"); if (cb) cb.textContent = purse; }
      Q(".pk-go").disabled = true; ST.res = res;
      try {
        const presId = TST.pres || (reduced ? "clasica" : cx.reelPick("plk", PRES)), decorId = TST.decor || cx.reelPick("plkDecor", DECORS);
        stage.dataset.decor = decorId; root = pick([57, 59, 60, 62]); const plan = makePlan(presId); ST.plan = plan; ST.row = -1;
        chipPark(); chipShow(true); board.classList.remove("done"); slots.forEach(s => s.classList.remove("hit", "flash"));
        const no = Q(".pk-no"); no.textContent = tr(cx.BT2.noMore); no.classList.remove("on"); void no.offsetWidth; no.classList.add("on"); A.sfx.rouNoMore(); board.classList.add("fast"); hint("hFall");
        const edge = ST.col === 0 || ST.col === NC - 1; say(edge && vr() < 0.55 ? "plkEdge" : "plkDrop"); await sleep(reduced ? 500 : 1000);
        if (plan.wave) await wave();
        if (plan.rain) rainChips(plan.rain, false);
        if (plan.flashes) for (let i = 0; i < plan.flashes; i++) setTimeout(() => { if (!alive()) return; const s = slots[ri(0, NC - 1)]; s.classList.remove("flash"); s.getAnimations().forEach(a => a.cancel()); void s.offsetWidth; s.classList.add("flash"); A.sfx.plkFlash(); setTimeout(() => s.classList.remove("flash"), 1500); }, 400 + i * ri(380, 640) + ri(0, 300));   // falsos destellos: no significan nada
        if (!plan.toss) A.sfx.plkDrop();
        const fallSay = setTimeout(() => { if (alive() && vr() < 0.4) say("plkFall", 1, true); }, 1400);
        await fall(res, plan); clearTimeout(fallSay); board.classList.remove("fast");
        await settle(res);
      } catch (e) {
        if (e === CANCEL) { if (!sh.closed && !ov.isConnected) sh.bail("capa retirada"); return; }
        try { console.error("plinko", e); } catch (x) { /* nada */ }
        sh.bail(e);                                                                                                                              // el resultado ya esta guardado y cobrado: un fallo de la pantalla no pierde nada
      }
    }
    async function settle(res) {
      ST.phase = "done"; ST.lastSlot = res.slot; const s = slots[res.slot], lv = levelOf(res), sit = sitFor(res), H = hist();
      board.classList.add("done"); s.classList.add("hit"); purse = run.coins; H.push({ s: res.slot, t: res.t }); while (H.length > 9) H.shift(); A.profile.save(); renderHist(true); renderPanel();
      const net = res.coins - res.stake;
      plate("t" + tier(res.t), `×${fm(res.t)}`, `${res.stake} × ${fm(res.t)} = ${fm(res.x)}`, (net > 0 ? "+" + net : net < 0 ? "−" + -net : "±0") + (res.x % 10 ? "  " + tr(U.frac) : ""));
      A.sfx.plkLand(res.slot % 3 + (lv ? 2 : 0), root);
      if (lv === 0) { if (res.coins < res.stake) A.sfx.lose(); ov.classList.add("lose"); }
      else { if (lv >= 2) ov.classList.add("lv" + lv); A.sfx.jackpot(lv); if (A.core.jpShake) A.core.jpShake(lv); if (A.haptic) A.haptic(lv === 3 ? [40, 40, 80] : [30, 30, 60]); bump(8 * lv); if (lv >= 2) rainChips(lv === 3 ? 26 : 9, true); }
      flash(); s.classList.add("flash"); hint(null);
      say(sit, 4, false, sit === "plkMax" ? { face: "shock", g: "tantrum" } : null);
      await sleep(600); await speechIdle(); sh.hold(2600);                                                                                       // la ultima frase se oye entera antes de cerrar (tocar la pantalla tambien cierra)
    }

    /* ---- arranque: la pantalla de eleccion ---- */
    renderSlots(false); renderPanel(); renderHist(false); chipPark(); hint("hStart");
    if (TST.auto) setTimeout(() => { if (!alive()) return; if (TST.auto.col != null) { ST.col = TST.auto.col; chipPark(); } if (TST.auto.risk != null) ST.risk = TST.auto.risk; if (TST.auto.stake != null) stakeI = TST.auto.stake; renderSlots(false); renderPanel(); setTimeout(doDrop, 400); }, 700);
    const cleanup = () => { clearInterval(talkIv); removeEventListener("keydown", onKey, true); removeEventListener("resize", onResize); };
    const wd = setInterval(() => { if (!alive()) { clearInterval(wd); cleanup(); pend.forEach(e => e.rej(CANCEL)); pend.clear(); if (!sh.closed) sh.bail("capa retirada"); } }, 250);
  }

  A.adv._plinko = Object.assign(A.adv._plinko || {}, { decide, walk, sitFor, levelOf, PRES, DECORS });   // solo pruebas (dev/): force(res), pres, decor, slow, auto ({ col, risk, stake }), st
})(window.AIQ);
