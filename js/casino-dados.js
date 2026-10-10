/* Geolite - Duelo de dados (v0.2.49): juego del centro de la Barra (se registra en adventure.js con A.adv.casino.add; textos en js/casino-dados-textos.js).
   Tu contra Don Crupier: cada uno tira dos dados y gana el total mas alto (x2). Empate: se repite la tirada una vez; si vuelve a empatar, gana la banca (RTP 98,731 % exacto:
   2 x 829150/1679616). Las cuatro caras (y la tirada de desempate) salen de la semilla ANTES de animar y el registro se guarda y se cobra al empezar, como la ruleta: lo unico que
   decide el jugador es CUANDO suelta el cubilete, y eso (momento y fuerza) solo cambia la estetica. La presentacion de cada tirada sale de un carrete de 10 (reelPick: nunca las dos
   ultimas, mas peso a las menos vistas; la banca y tu nunca repetis) y no depende ni del resultado ni de la apuesta. Los dados NO se ven dentro del cubilete (tu nota de la maqueta:
   se movian y sobresalian): salen de la boca ya en vuelo y rebotan en el tapete. Escenario de 1920x1080 con el arte a x4 (cada pixel del arte = K pixeles de pantalla, K entero). */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const CS = A.adv && A.adv.casino, TX = A.diceTx; if (!CS || !TX) return;
  const L6 = A.L6, tr = o => A.tx(o), U = {}, LN = {}, LAST = {};
  for (const k in TX.ui) U[k] = L6(TX.ui[k]);
  for (const k in TX.lines) LN[k] = TX.lines[k].map(s => L6(s));
  const BET = { n: L6(TX.bet.n), d: L6(TX.bet.d), s: L6(TX.bet.s), ico: "bet_dados" };
  const FACE = { diceIntro: ["neutral", "none"], diceTurn: ["neutral", "none"], diceShake: ["neutral", "hop"], diceLose: ["laugh", "hop"], diceWinSmall: ["shock", "shudder"], diceWinBig: ["angry", "drop"], diceTie: ["shock", "shudder"],
    diceTie2: ["laugh", "hop"], diceSnake: ["shock", "lean"], diceBoxcars: ["shock", "drop"], diceDealer12: ["laugh", "hop"], diceSeven: ["neutral", "lean"] };
  const PRES = ["clasica", "deslizada", "baranda", "choque", "desigual", "canto", "arriba", "volcado", "peonza", "rodado"];   // el carrete de tiradas (10)
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), D2R = Math.PI / 180, rnd = Math.random, J = a => (rnd() - 0.5) * a, rr = (a, b) => a + (b - a) * rnd();
  const easeOut = p => 1 - Math.pow(1 - p, 3), smooth = p => p * p * (3 - 2 * p);
  const preload = () => { if (preload.done) return; preload.done = 1; ["cup_back", "cup_front", "dice_ivory_0", "dice_ivory_1", "dice_ivory_2", "dice_burg_0", "dice_burg_1", "dice_burg_2", "ring", "felt", "rail_h", "rail_l", "rail_r", "sh_cup", "sh_l", "sh_m", "sh_s", "cenefa"].forEach(n => { new Image().src = `assets/dados/${n}.png`; }); ["reach", "half", "grab_sq", "grab"].forEach(n => { new Image().src = `assets/trile/hand_${n}.png`; }); };
  /* la mano del crupier (la misma del trile): baja abierta, cierra, aprieta y agarra; al soltar se abre y sube. Se apoya por el centro de los nudillos */
  const HAND = { reach: [224, 296], half: [224, 296], grab_sq: [176, 284], grab: [176, 280] };
  const HAND_HTML = Object.entries(HAND).map(([n, [w, h]]) => `<img class="hf-${n}" src="assets/trile/hand_${n}.png" width="${w}" height="${h}" style="left:${-w / 2}px;top:${-h}px" alt="" draggable="false">`).join("");
  function handStep(g, now, tx, ty) {
    if (g.tv !== g.ptv) { g.ptv = g.tv; g.t0 = now; g.at = 0; }
    if (g.tv) { if (!g.on) { g.on = 1; g.x = tx; g.y = ty - 300; } g.x += (tx - g.x) * 0.42; g.y += (ty - g.y) * 0.42; if (!g.at && Math.abs(ty - g.y) < 6) g.at = now; }
    else if (g.on) { g.x += (tx - g.x) * 0.42; g.y += (ty - 340 - g.y) * 0.2; if (g.y < ty - 320) g.on = 0; }
    const f = g.tv ? (!g.at ? "reach" : now - g.at < 60 ? "half" : now - g.at < 130 ? "grab_sq" : "grab") : (now - g.t0 < 70 ? "half" : "reach");
    if (f !== g.f) { g.f = f; g.el.dataset.f = f; }
    const d = g.on ? "block" : "none"; if (g.d !== d) { g.d = d; g.el.style.display = d; }
    if (g.on) g.el.style.transform = `translate3d(${Math.round(g.x)}px,${Math.round(g.y)}px,0)`;
  }

  /* ------------------------------------------------------------------ el resultado: la semilla decide TODO (las dos tiradas si hay empate) */
  const lvOf = m => (m <= 2 ? 1 : m <= 5 ? 2 : 3);                                   // nivel de recompensa segun el margen ganado
  const mkThrow = u => { const d = () => 1 + Math.floor(u() * 6), t = { p: [d(), d()], d: [d(), d()] }; t.pt = t.p[0] + t.p[1]; t.dt = t.d[0] + t.d[1]; return t; };
  function decide(key) {
    const F = A.adv._dice && A.adv._dice.force; let res;                              // _dice.force(res): solo pruebas, busca una semilla que lo cumpla
    for (let k = 0; k < (F ? 6000 : 1); k++) {
      const u = A.rng(F ? `${key}:f${k}` : key), t1 = mkThrow(u), throws = [t1]; let last = t1;
      if (t1.pt === t1.dt) { last = mkThrow(u); throws.push(last); }                  // empate: una sola repeticion
      const win = last.pt > last.dt, margin = Math.abs(last.pt - last.dt);
      res = { throws, win, tie2: throws.length === 2 && last.pt === last.dt, level: win ? lvOf(margin) : 0 };
      if (!F || F(res)) break;
    }
    return res;
  }

  /* ------------------------------------------------------------------ la carta de la Barra y su cableado */
  let stakeI = 0;
  CS.add({ id: "dice", bet: BET,
    card(cx) {
      preload(); const b = cx.b;
      if (b && b.id === "dice" && b.att === cx.att) return `<div class="sup bet cas bt-dice done ${b.win ? "win" : "lose"}" data-bet="dice">${cx.head}<em class="bt-res"><b>${tr(b.win ? U.win : U.lose)}</b>${b.pay ? "+" + b.pay : ""}</em></div>`;
      return `<div class="sup bet cas bt-dice" data-bet="dice">${cx.head}<span class="bt-pick"><button class="bt-c bt-di" type="button" data-play="1">${tr(U.play)}</button><em class="sp-p bt-stake" role="button" tabindex="0">${cx.CN()}${cx.coinCost(stakeI)}</em></span></div>`;
    },
    wire(el, cx) {
      const pill = el.querySelector(".bt-stake");
      if (pill) pill.onclick = e => { e.stopPropagation(); stakeI = (stakeI + 1) % cx.STAKES.length; pill.innerHTML = cx.CN() + cx.coinCost(stakeI); A.sfx.tick(1); };   // el precio se cambia con un clic en la ficha
      const btn = el.querySelector("[data-play]"); if (!btn) return;
      btn.onclick = e => {
        e.stopPropagation(); if (cx.open) return; const run = cx.run, stake = cx.coinCost(stakeI); if (run.coins < stake) { A.sfx.deny(); cx.shake(el); return; }
        const att = run.attempt || 0, res = decide(`${run.seed}:dados:${cx.r}:${att}`), pay = res.win ? stake * 2 : 0;
        run.coins += pay - stake; if (pay > stake) run.stats.coinsEarned += pay - stake;                 // se cobra al empezar, como la ruleta: recargar a medias no lo deshace
        run.reds = run.reds || {}; run.reds[cx.r] = { id: "dice", att, stake, th: res.throws, win: res.win, tie2: res.tie2, level: res.level, pay };
        cx.persist(); A.sfx.rouBet(1); if (A.haptic) A.haptic([10]);
        { const cb = document.querySelector("#shopCoins b"); if (cb) cb.textContent = run.coins - pay; }   // el saldo que se ve detras sube cuando acaba el duelo
        spinDice({ cx, stake, res, pay }, () => { if (!run || A.core.S.phase !== "shop" || !run.stock) return; cx.refresh(); });
      };
    },
  });

  /* ------------------------------------------------------------------ la pantalla del duelo */
  const SIDES_CFG = { D: { k: "D", cx: 235, gy: 835, dir: 1, mat: "burg", ring: { x: 600, y: 770 } }, P: { k: "P", cx: 1685, gy: 835, dir: -1, mat: "ivory", ring: { x: 1320, y: 770 } } };
  const AX = { X: 0, Z: 1, Y: 2, C: 3 }, SHSZ = { l: [120, 40], m: [96, 32], s: [72, 24] };

  function spinDice(o, done) {
    const cx = o.cx, TST = A.adv._dice || {}, ST = (TST.st = { phase: "intro" });                // ST.phase: solo pruebas (intro, dshake, droll, pturn, pshake, proll, cmp, result)
    const html = `<div class="dd-stage"><div class="dd-bg"></div><img class="dd-dealer" src="assets/icons/dealer_neutral.webp" alt="" draggable="false"><div class="dd-bubble"><span></span></div>
      <div class="dd-left"><div class="rou-pick"><span class="rp-dot rp-dice"></span><span class="rp-k">${tr(cx.BT.seal)}</span><b>${tr(BET.n)} · ${o.stake}</b></div><div class="dd-hint"></div></div>
      <div class="dd-top"><b class="dd-no"></b><div class="dd-res"><span class="dd-plate"></span><span class="dd-msg"></span></div></div>
      <div class="dd-band"><div class="dd-rail dd-rail-h"></div><div class="dd-rail dd-rail-l"></div><div class="dd-rail dd-rail-r"></div>
        <img class="dd-ring d" src="assets/dados/ring.png" alt="" draggable="false"><img class="dd-ring p" src="assets/dados/ring.png" alt="" draggable="false">
        <b class="dd-lab d">${tr(U.banca)}</b><b class="dd-lab p">${tr(U.tu)}</b><div class="dd-vs"><span>VS</span></div><i class="rou-lights top"></i><i class="rou-lights bot"></i></div>
      <div class="dd-world"></div><div class="dd-tot d"></div><div class="dd-tot p"></div><div class="dd-turn"><span>${tr(U.hold)}</span></div><div class="dd-glovelayer"></div><div class="dd-hit"></div></div>`;
    const sh = cx.rouShell("dice", html, {}, () => { try { A.dealer.hold(false); } catch (e) { /* sin crupier */ } done(); });
    if (!sh) return;
    try { A.dealer.hold(true); } catch (e) { /* sin crupier */ }                                  // el crupier de la esquina calla: aqui habla el de la mesa
    const ov = sh.ov, stage = ov.querySelector(".dd-stage"), reduced = sh.reduced, Q = s => ov.querySelector(s), CANCEL = {};
    ov.classList.remove("spin"); preload();
    let TS = (TST.slow || 1) * (reduced ? 0.55 : 1);                                              // escala de tiempo (reducir movimiento: todo mas corto; _dice.slow: camara lenta, solo pruebas)
    const fit = () => { const W = ov.clientWidth || innerWidth, H = ov.clientHeight || innerHeight; let k = 2; for (const c of [3, 4, 5, 6]) if ((1920 * c / 4 - W) / 2 <= 90 && (1080 * c / 4 - H) / 2 <= 24) k = c;
      stage.style.transform = `translate(${Math.round((W - 1920 * k / 4) / 2)}px,${Math.round((H - 1080 * k / 4) / 2)}px) scale(${k / 4})`; };
    fit(); const onResize = () => { if (ov.isConnected) fit(); }; addEventListener("resize", onResize);
    const alive = () => !sh.closed && ov.isConnected, pend = new Set();
    const sleep = ms => new Promise((res, rej) => setTimeout(() => (alive() ? res() : rej(CANCEL)), ms));
    const waitFor = fn => new Promise((res, rej) => { const e = { rej }; pend.add(e); fn(v => { pend.delete(e); res(v); }); });   // lo que espera al jugador o a una animacion: si la capa muere, se rechaza
    const world = Q(".dd-world"), band = Q(".dd-band"), glovesEl = Q(".dd-glovelayer");
    const mk = (cls, parent) => { const d = document.createElement("div"); d.className = cls; (parent || world).appendChild(d); return d; };

    /* ---- los dos lados: cubilete en dos capas (los dados salen de la boca, nunca se ven dentro), sombra, dos dados y el guante del crupier ---- */
    const SIDES = {};
    for (const key of ["D", "P"]) {
      const S = (SIDES[key] = Object.assign({}, SIDES_CFG[key])); S.px = S.cx; S.py = S.gy - 78;
      S.sh = mk("dd-sh"); S.sh.style.cssText += "width:216px;height:56px;background-image:url(assets/dados/sh_cup.png);background-size:216px 56px";
      S.cb = mk("dd-cup"); S.cb.style.backgroundImage = "url(assets/dados/cup_back.png)"; S.cf = mk("dd-cup"); S.cf.style.backgroundImage = "url(assets/dados/cup_front.png)";
      S.cup = { phi: 0, dx: 0, dy: 0, k: -1 }; S.shaking = 0; S.plan = null;
      S.dice = [0, 1].map(i => ({ S, i, el: mk("dd-die"), sh: mk("dd-sh"), n: 1 + i * 2, yaw: i, mode: "hidden", st: { x: 0, y: 0, h: 0, ax: 1, ang: 0 }, key: "", shk: "", alpha: 1, shown: -1, aShown: -1, tf: "" }));
      S.dice.forEach(d => { d.el.style.backgroundImage = `url(assets/dados/dice_${S.mat}_${d.yaw}.png)`; d.el.style.display = "none"; d.sh.style.display = "none"; });
      S.glove = { el: mk("dd-glove", glovesEl), tv: 0, on: 0, x: 0, y: 0, f: "", t0: 0, at: 0 }; S.glove.el.innerHTML = HAND_HTML;
    }
    const coins = [0, 1, 2].map(() => mk("dd-coin", stage));

    /* ---- rutas del dado (suelo x,y + altura h), giro del dado y poses del cubilete ---- */
    function mkRoute(p0, segs) {
      let t = 0, cur = { x: p0.x, y: p0.y, h: p0.h }; const L = [];
      for (const g of segs) { const b = { x: clamp(g.x ?? cur.x, 130, 1790), y: clamp(g.y ?? cur.y, 584, 928), h: g.h ?? 0 }, d = g.d * TS; L.push({ t0: t, t1: t + d, a: cur, b, arc: g.arc || 0, ex: g.ex || "lin", hm: g.hm, ev: g.ev }); t += d; cur = b; }
      return { T: t, segs: L, end: cur, at(tt) {
        if (tt >= t) return { ...cur };
        for (const s of L) if (tt < s.t1) { const p = (tt - s.t0) / (s.t1 - s.t0), e = s.ex === "out" ? 1 - Math.pow(1 - p, 2.2) : s.ex === "out3" ? easeOut(p) : p;
          return { x: lerp(s.a.x, s.b.x, e), y: lerp(s.a.y, s.b.y, e), h: s.hm === "fall" ? lerp(s.a.h, s.b.h, p * p) : lerp(s.a.h, s.b.h, p) + 4 * s.arc * p * (1 - p) }; }
        return { ...cur }; } };
    }
    function cupAt(keys, t) {
      if (t <= keys[0][0]) return { phi: keys[0][1], dx: keys[0][2], dy: keys[0][3] };
      for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const a = keys[i - 1], b = keys[i], p = smooth((t - a[0]) / (b[0] - a[0])); return { phi: lerp(a[1], b[1], p), dx: lerp(a[2], b[2], p), dy: lerp(a[3], b[3], p) }; }
      const l = keys[keys.length - 1]; return { phi: l[1], dx: l[2], dy: l[3] };
    }
    function angAt(sp, t) {
      if (!sp) return 0;
      if (t < 0) return sp.A0 * sp.dir;
      if (t <= sp.T) return (sp.A1 + (sp.A0 - sp.A1) * Math.pow(1 - t / sp.T, sp.q)) * sp.dir;
      if (!sp.tail) return 0;
      let pt = 0, pv = sp.A1; const u = t - sp.T;
      for (const [kt, kv] of sp.tail) { if (u < kt) return lerp(pv, kv, smooth((u - pt) / (kt - pt))) * sp.dir; pt = kt; pv = kv; }
      return 0;
    }
    const spinEnd = sp => (sp ? sp.T + (sp.tail ? sp.tail[sp.tail.length - 1][0] : 0) : 0);

    /* ---- el carrete: las 10 presentaciones. Todas empiezan con el dado saliendo de la boca del cubilete (ya en vuelo) y acaban en su posicion de reposo ---- */
    const pourKeys = (S, phi = 112, hold = 450) => { const s = -S.dir; return [[0, 0, 0, 0], [120, -s * 16, 0, 0], [330, s * phi, 0, 0], [330 + hold, s * phi, 0, 0], [330 + hold + 560, 0, 0, 0]].map(k => [k[0] * TS, k[1], k[2], k[3]]); };
    function mkc(S, rest, f, keys, tOut) {
      const c = { S, rest, f, keys, tOut: tOut.map(t => t * TS), dir: S.dir, p0: [] };
      c.p0 = [0, 1].map(i => { const k = cupAt(keys, c.tOut[i]), px = S.px + k.dx, py = S.py + k.dy, mx = px - 80 * Math.sin(k.phi * D2R), my = py - 80 * Math.cos(k.phi * D2R), gy = S.gy - 12 + i * 22; return { x: mx + J(8), y: gy, h: Math.max(0, gy - 32 - my) }; });
      return c;
    }
    const bsegs = (c, i, o) => {
      const p0 = c.p0[i], r = c.rest[i], segs = [];
      for (let k = 0; k < o.n; k++) { const fr = o.fr[k]; segs.push({ d: o.durs[k] * (1 + J(0.12)), x: lerp(p0.x, r.x, fr) + J(40), y: lerp(p0.y, r.y, fr) + J(30), h: 0, arc: o.arcs[k] * c.f, ev: "land" }); }
      segs.push({ d: o.slide * (1 + J(0.1)), x: r.x, y: r.y, h: 0, ex: "out", ev: "stop" }); return segs;
    };
    const die = (c, i, route, axis, dir, A0, q, ex) => ({ route, tOut: c.tOut[i], spin: { axis, dir, A0, A1: 0, T: route.T, q, ...(ex || {}) } });
    const std = (c, i, n) => { const o = { n, fr: [0.5, 0.78, 0.92], durs: [430, 300, 230], arcs: [190, 100, 42], slide: n === 3 ? 430 : 700 }; return die(c, i, mkRoute(c.p0[i], bsegs(c, i, o)), "Z", c.dir, 540 + rnd() * 360, 1.5); };
    const PR = {
      clasica: c => ({ keys: c.keys, dice: [std(c, 0, 3), std(c, 1, 3)] }),                                                   // 1 · tres botes y a rodar
      deslizada: c => ({ keys: c.keys, dice: [0, 1].map(i => { const p0 = c.p0[i], r = c.rest[i]; return die(c, i, mkRoute(p0, [{ d: 260, x: lerp(p0.x, r.x, 0.3), y: lerp(p0.y, r.y, 0.3), arc: 42 * c.f, ev: "land" }, { d: 1250 + i * 150, x: r.x, y: r.y, ex: "out", ev: "stop" }]), "Z", c.dir, 900 + i * 180, 1.3); }) }),   // 2 · un bote bajo y larga deslizada
      baranda: c => ({ keys: c.keys, rail: true, dice: [0, 1].map(i => { const p0 = c.p0[i], r = c.rest[i], W = { x: lerp(p0.x, r.x, 0.55) + J(40) + i * 30 * c.dir, y: 590 + J(8) }, m = { x: lerp(W.x, r.x, 0.55), y: lerp(W.y, r.y, 0.75) };   // 3 · rebote en la baranda del fondo
        return die(c, i, mkRoute(p0, [{ d: 420, x: W.x, y: W.y, h: 24, arc: 60 * c.f, ev: "rail" }, { d: 400, x: m.x, y: m.y, arc: 150 * c.f, ev: "land" }, { d: 240, x: lerp(m.x, r.x, 0.6), y: lerp(m.y, r.y, 0.6), arc: 44 * c.f, ev: "land" }, { d: 520, x: r.x, y: r.y, ex: "out", ev: "stop" }]), "X", -1, 720 + rnd() * 360, 1.4); }) }),
      choque: c => { const r0 = c.rest[0], r1 = c.rest[1], Kx = (r0.x + r1.x) / 2, Ky = (r0.y + r1.y) / 2; return { keys: c.keys, dice: [0, 1].map(i => { const p0 = c.p0[i], r = c.rest[i], sg = i ? 1 : -1, ax = Kx + sg * c.dir * 30, ay = Ky + sg * 10;   // 4 · los dos chocan en medio
        return die(c, i, mkRoute(p0, [{ d: 620 - i * 60, x: lerp(p0.x, ax, 0.92), y: lerp(p0.y, ay, 0.92), arc: 175 * c.f, ev: "land" }, { d: 260 + i * 60, x: Kx + sg * c.dir * 16, y: Ky + sg * 4, ex: "out", ev: "clack" }, { d: 560, x: r.x, y: r.y, ex: "out", ev: "stop" }]), "Z", i ? -c.dir : c.dir, 540, 1.3); }) }; },
      desigual: c => { const fast = rnd() < 0.5 ? 0 : 1; return { keys: c.keys, dice: [0, 1].map(i => i === fast ? std(c, i, 1) : (() => { const o = { n: 3, fr: [0.45, 0.7, 0.88], durs: [470, 340, 270], arcs: [210, 120, 60], slide: 1500 }; return die(c, i, mkRoute(c.p0[i], bsegs(c, i, o)), "Z", c.dir, 1080 + rnd() * 360, 1.35); })()) }; },   // 5 · uno para y el otro tarda
      canto: c => { const e = rnd() < 0.5 ? 0 : 1; return { keys: c.keys, dice: [0, 1].map(i => { if (i !== e) return std(c, i, 3); const o = { n: 2, fr: [0.55, 0.85], durs: [430, 300], arcs: [170, 70], slide: 520 }, rt = mkRoute(c.p0[i], bsegs(c, i, o));   // 6 · un dado se queda de canto, tambalea y cae
        return die(c, i, rt, "Z", c.dir, 540, 1.6, { A1: 45, tail: [[260 * TS, 37], [560 * TS, 48], [860 * TS, 40], [1130 * TS, 46], [1360 * TS, 43], [1620 * TS, 0]], edge: true }); }) }; },
      peonza: c => ({ keys: c.keys, dice: [0, 1].map(i => { const o = { n: 1, fr: [0.55], durs: [400], arcs: [160], slide: 750 }, rt = mkRoute(c.p0[i], bsegs(c, i, o)); return die(c, i, rt, "Y", i ? 1 : -1, 1620 + i * 360, 1.25, { T: rt.T + 350 * TS }); }) }),   // 9 · aterrizan girando como peonzas
      rodado: c => ({ keys: c.keys, dice: [0, 1].map(i => { const p0 = c.p0[i], r = c.rest[i]; return die(c, i, mkRoute(p0, [{ d: 320, x: lerp(p0.x, r.x, 0.25), y: Math.max(600, r.y - 110 - rnd() * 30), arc: 50 * c.f, ev: "land" }, { d: 1500 + i * 200, x: r.x, y: r.y, ex: "out3", ev: "stop" }]), "X", -1, 900 + i * 180, 1.15); }) }),   // 10 · ruedan pegados al tapete
    };
    function buildPlan(S, vals, id, f, rest) {
      const s = -S.dir; let c, P;
      if (id === "arriba") {                                                                    // 7 · el cubilete sube y los dados caen desde lo alto
        const k = [[0, 0, 0, 0], [160, -s * 10, 0, -30], [560, s * 40, S.dir * 120, -190], [900, s * 140, S.dir * 150, -200], [1500, s * 140, S.dir * 150, -200], [2100, 0, 0, 0]].map(q => [q[0] * TS, q[1], q[2], q[3]]);
        c = mkc(S, rest, f, k, [740, 810]);
        P = { keys: k, dice: [0, 1].map(i => { const p0 = c.p0[i], r = rest[i]; return die(c, i, mkRoute(p0, [{ d: 620, x: lerp(p0.x, r.x, 0.75), y: r.y - 70, hm: "fall", ev: "land" }, { d: 340, x: lerp(p0.x, r.x, 0.9), y: r.y - 20, arc: 130 * f, ev: "land" }, { d: 240, x: r.x, y: r.y - 6, arc: 50 * f, ev: "land" }, { d: 420, x: r.x, y: r.y, ex: "out", ev: "stop" }]), "Z", S.dir, 720 + rnd() * 360, 1.5); }) };
      } else if (id === "volcado") {                                                            // 8 · el cubilete se estampa boca abajo, repiquetea y al levantarlo estan los dos
        const dx = S.ring.x - S.cx, dy = S.ring.y + 50 - S.gy, ph = s * 180;
        const k = [[0, 0, 0, 0], [140, -s * 20, 0, -14], [330, s * 95, dx * 0.45, -250], [560, ph, dx, dy], [640, ph, dx, dy - 22], [720, ph, dx, dy], [760, ph, dx + 6, dy], [840, ph, dx - 6, dy], [920, ph, dx + 5, dy], [1000, ph, dx - 5, dy], [1080, ph, dx + 4, dy], [1160, ph, dx - 4, dy], [1240, ph, dx, dy], [1560, ph, dx, dy], [1760, ph, dx, dy - 210], [2300, ph, dx, dy - 210], [2950, 0, 0, 0]].map(q => [q[0] * TS, q[1], q[2], q[3]]);
        c = mkc(S, rest, f, k, [1700, 1700]);
        P = { keys: k, glove: S.k === "D" ? [300 * TS, 2400 * TS] : null, appear: true, evx: [[560, "slam"], [760, "rattle"], [900, "rattle"], [1040, "rattle"], [1180, "rattle"], [1700, "lift"]].map(e => [e[0] * TS, e[1]]),
          dice: [0, 1].map(i => { const r = rest[i]; return { route: mkRoute({ x: r.x, y: r.y, h: 0 }, [{ d: 1 }]), tOut: 1700 * TS, appear: true, spin: null }; }) };
      } else { c = mkc(S, rest, f, pourKeys(S, 112, 450), [300, 360]); P = PR[id](c); }
      P.dice.forEach((dd, i) => { dd.val = vals[i]; dd.rest = rest[i]; dd.end = dd.tOut + Math.max(dd.route.T, spinEnd(dd.spin)); });
      P.T = Math.max(...P.dice.map(d => d.end), P.keys[P.keys.length - 1][0]) + 120 * TS; P.id = id; P.S = S;
      P.ev = []; P.dice.forEach(dd => dd.route.segs.forEach(sg => { if (sg.ev) P.ev.push({ t: dd.tOut + sg.t1, k: sg.ev, s: sg.arc || 0 }); })); (P.evx || []).forEach(e => P.ev.push({ t: e[0], k: e[1], s: 0 })); P.ev.sort((a, b) => a.t - b.t);
      return P;
    }
    function pickRests(S) {                                                                     // donde se queda cada dado dentro del aro (el que queda mas cerca de su cubilete es el primero)
      const R = S.ring, a = { x: R.x + rr(-175, -45), y: R.y + rr(-62, 62) }, b = { x: R.x + rr(45, 175), y: R.y + rr(-62, 62) }, arr = rnd() < 0.5 ? [a, b] : [b, a];
      return arr.sort((p, q) => Math.abs(p.x - S.cx) - Math.abs(q.x - S.cx));
    }

    /* ---- dibujado por fotograma: solo transform / opacidad / cuadro del sprite, y solo cuando cambian ---- */
    function drawDie(d, now) {
      if (d.mode === "hidden") { if (d.shown !== 0) { d.el.style.display = d.sh.style.display = "none"; d.shown = 0; } return; }   // dentro del cubilete no se ven: salen ya en vuelo
      if (d.shown !== 1) { d.el.style.display = d.sh.style.display = "block"; d.shown = 1; }
      const s = d.st, cx0 = s.x, cy0 = s.y - s.h - 32, z = (s.h > 4 ? 6000 : 0) + Math.round(s.y) * 4 + 3, col = ((Math.round(s.ang / 22.5) % 16) + 16) % 16, row = (d.n - 1) * 4 + s.ax;
      const sz = s.h < 26 ? "l" : s.h < 100 ? "m" : "s", w = SHSZ[sz][0], h = SHSZ[sz][1];
      if (d.shk !== sz) { d.shk = sz; const st = d.sh.style; st.width = w + "px"; st.height = h + "px"; st.backgroundImage = `url(assets/dados/sh_${sz}.png)`; st.backgroundSize = `${w}px ${h}px`; }
      d.sh.style.transform = `translate3d(${Math.round(s.x - w / 2)}px,${Math.round(s.y - h / 2 + 8)}px,0)`; d.sh.style.opacity = clamp(1 - s.h / 420, 0.35, 0.95) * d.alpha; d.sh.style.zIndex = Math.round(s.y) * 4 + 1;
      const tf = `translate3d(${Math.round(cx0 - 72)}px,${Math.round(cy0 - 72)}px,0)`; if (tf !== d.tf) { d.tf = tf; d.el.style.transform = tf; } d.el.style.zIndex = z;
      const key = row * 16 + col; if (key !== d.key) { d.key = key; d.el.style.backgroundPosition = `${-col * 144}px ${-row * 144}px`; }
      if (d.aShown !== d.alpha) { d.aShown = d.alpha; d.el.style.opacity = d.alpha; }
    }
    function drawCup(S) {
      const k = S.cup, kk = ((Math.round((k.phi + 180) / 15) % 24) + 24) % 24, tf = `translate3d(${Math.round(S.px + k.dx - 124)}px,${Math.round(S.py + k.dy - 124)}px,0)`;   // el cuadro mide 62 px nativos (60 + 1 de contorno) x4
      if (tf !== S.tf) { S.tf = tf; S.cb.style.transform = S.cf.style.transform = tf; S.cb.style.zIndex = S.gy * 4; S.cf.style.zIndex = S.gy * 4 + 2; }
      if (kk !== k.k) { k.k = kk; S.cb.style.backgroundPositionX = S.cf.style.backgroundPositionX = -kk * 248 + "px"; }
      const st = `translate3d(${Math.round(S.cx - 108 + k.dx * 0.9)}px,${Math.round(S.gy - 30)}px,0)`; if (st !== S.stf) { S.stf = st; S.sh.style.transform = st; S.sh.style.opacity = clamp(1 + k.dy / 360, 0.25, 1); S.sh.style.zIndex = S.gy * 4 - 1; }
    }
    function stepSide(S, now) {
      const P = S.plan;
      if (P) {
        const t = now - P.t0, c = cupAt(P.keys, t); S.cup.phi = c.phi; S.cup.dx = c.dx; S.cup.dy = c.dy;
        for (const dd of P.dice) {
          const d = dd.d, u = t - dd.tOut;
          if (dd.appear) { d.mode = t >= dd.tOut ? "ground" : "hidden"; d.alpha = clamp(u / 160, 0, 1); }                          // el volcado: aparecen a la vez al levantar el cubilete
          else { d.mode = t < dd.tOut ? "hidden" : "ground"; d.alpha = clamp(u / 110, 0, 1); }                                    // el resto: salen de la boca en un suspiro
          if (d.mode === "ground") { const p = dd.route.at(Math.max(0, u)); d.st.x = p.x; d.st.y = p.y; d.st.h = p.h; d.st.ax = AX[dd.spin ? dd.spin.axis : "Z"]; d.st.ang = angAt(dd.spin, Math.max(0, u)); }
        }
        while (P.ei < P.ev.length && P.ev[P.ei].t <= t) fireEv(P.ev[P.ei++]);
        if (P.glove) S.glove.tv = (t >= P.glove[0] && t <= P.glove[1]) ? 1 : 0;
        if (t >= P.T && !P.done) { P.done = true; for (const dd of P.dice) { const d = dd.d; d.mode = "ground"; d.alpha = 1; d.st = { x: dd.rest.x, y: dd.rest.y, h: 0, ax: 1, ang: 0 }; } S.cup.phi = S.cup.dx = S.cup.dy = 0; S.glove.tv = 0; S.plan = null; P.resolve(); }
      } else if (S.shaking) {                                                                  // el cubilete se agita solo (los dados no se ven dentro)
        const a = S.shaking, ph = [-15, 0, 15, 0][Math.floor(now / 52) % 4];
        S.cup.phi = ph * Math.min(1, a); S.cup.dx = Math.sin(now / 37) * 5 * a; S.cup.dy = -Math.abs(Math.sin(now / 61)) * 9 * a;
      }
      handStep(S.glove, now, S.px + S.cup.dx, S.py + S.cup.dy - 76);                        // la mano sigue al cubilete por los nudillos
      drawCup(S); S.dice.forEach(d => drawDie(d, now));
    }
    const killPend = () => { pend.forEach(e => e.rej(CANCEL)); pend.clear(); };
    const frame = now => { if (!alive()) { killPend(); return; } stepSide(SIDES.D, now); stepSide(SIDES.P, now); requestAnimationFrame(frame); };
    function fireEv(e) {
      if (e.k === "land") A.sfx.diceLand(clamp(e.s / 190, 0.25, 1));
      else if (e.k === "rail") { A.sfx.diceRail(); const r = Q(".dd-rail-h"); r.classList.remove("hit"); void r.offsetWidth; r.classList.add("hit"); }
      else if (e.k === "clack") A.sfx.diceClack(); else if (e.k === "slam") { A.sfx.diceSlam(); A.casa.impacto(1); }
      else if (e.k === "rattle") A.sfx.diceRattle(0.8); else if (e.k === "lift") A.sfx.cupLift(); else if (e.k === "stop") A.sfx.diceTick();
    }
    const runPlan = (S, P) => waitFor(res => { P.resolve = res; P.ei = 0; P.t0 = performance.now(); P.done = false; S.plan = P; S.shaking = 0; P.dice.forEach((dd, i) => { dd.d = S.dice[i]; dd.d.n = dd.val; }); });

    /* ---- la voz del crupier: cola (nunca se le corta una frase) y siempre 1 s mas en pantalla ---- */
    const bubble = Q(".dd-bubble"), bTx = bubble.firstChild, dealerImg = Q(".dd-dealer"), hintEl = Q(".dd-hint"), SP = { cur: false, pend: null };
    const face = f => { dealerImg.src = `assets/icons/dealer_${f}.webp`; };
    const gesture = g => { if (!g || g === "none" || reduced) return; dealerImg.classList.remove("hop", "shudder", "drop", "lean"); void dealerImg.offsetWidth; dealerImg.classList.add(g); setTimeout(() => dealerImg.classList.remove(g), 900); };
    const lineOf = key => { const a = LN[key]; let i = Math.floor(rnd() * a.length); if (i === LAST[key] && a.length > 1) i = (i + 1 + Math.floor(rnd() * (a.length - 1))) % a.length; LAST[key] = i; return tr(a[i]) || ""; };
    function speak(p) {
      SP.cur = true; bTx.textContent = p.text; bubble.classList.add("on"); face(p.face); gesture(p.g);
      setTimeout(() => { if (!alive()) return; bubble.classList.remove("on"); face("neutral"); if (SP.pend) { const n = SP.pend; SP.pend = null; setTimeout(() => alive() && speak(n), 350); } else SP.cur = false; }, 1800 + p.text.length * 22 + (A.dealer.LINGER || 1000));
    }
    function say(key, prio = 1, skipIfBusy) {
      if (skipIfBusy && SP.cur) return; const f = FACE[key], p = { text: lineOf(key), face: f[0], g: f[1], prio };
      if (SP.cur) { if (!SP.pend || prio >= SP.pend.prio) SP.pend = p; return; } speak(p);
    }
    const speechIdle = () => waitFor(res => { const iv = setInterval(() => { if (!alive() || (!SP.cur && !SP.pend)) { clearInterval(iv); res(); } }, 120); });
    const hint = k => { if (!k) { hintEl.classList.remove("on"); return; } hintEl.textContent = tr(U[k]); hintEl.classList.add("on"); };
    const plate = (kind, name, extra, msg) => { const p = Q(".dd-plate"); p.className = "dd-plate " + kind; p.innerHTML = `<b>${name}</b>${extra ? `<i>${extra}</i>` : ""}`; Q(".dd-msg").textContent = msg; const r = Q(".dd-res"); r.classList.remove("on"); void r.offsetWidth; r.classList.add("on"); };
    const banner = text => { const n = Q(".dd-no"); n.textContent = text; n.classList.remove("on"); void n.offsetWidth; n.classList.add("on"); };
    const flash = () => { ov.classList.remove("flash"); void ov.offsetWidth; ov.classList.add("flash"); };
    const tot = (side, n, cls) => { const el = Q(side === "D" ? ".dd-tot.d" : ".dd-tot.p"); el.className = "dd-tot " + (side === "D" ? "d" : "p") + (n == null ? "" : " on " + (cls || "")); el.style.opacity = n == null ? 0 : ""; el.innerHTML = n == null ? "" : `<b>${n}</b>`; };
    function fireCoins(n) {                                                                     // las monedas saltan del aro de tu tirada y vuelan a la bolsa (abajo a la izquierda)
      if (reduced) return;
      coins.slice(0, n).forEach((el, i) => setTimeout(() => { if (!alive()) return; el.style.display = "block"; const x0 = SIDES.P.ring.x - 48 + (i - (n - 1) / 2) * 110, y0 = 690, x1 = 40, y1 = 900, t0 = performance.now(), dur = 1050 + i * 80;
        const step = now => { if (!alive()) return; const p = Math.min(1, (now - t0) / dur), e = p * p, h = Math.sin(Math.PI * Math.min(1, p * 1.15)) * (200 + i * 40); el.style.transform = `translate3d(${Math.round(lerp(x0, x1, e))}px,${Math.round(lerp(y0, y1, p) - h)}px,0)`; el.style.backgroundPositionX = -(Math.floor(p * 40) % 24) * 96 + "px"; if (p < 1) requestAnimationFrame(step); else el.style.display = "none"; }; requestAnimationFrame(step); }, i * 170));
    }

    /* ---- tu turno: mantener agita el cubilete, soltar lo lanza (clic o toque, Espacio / Intro, o el boton A del mando) ---- */
    let holdRes = null, holdT0 = 0, holding = false, rattleIv = 0, awaiting = false; const hit = Q(".dd-hit"), turnEl = Q(".dd-turn");
    function press() { if (!awaiting || holding) return; holding = true; ST.phase = "pshake"; holdT0 = performance.now(); SIDES.P.shaking = 0.6; hint("hShake"); turnEl.classList.remove("on"); A.sfx.diceRattle(0.8);
      rattleIv = setInterval(() => { const a = Math.min(1, 0.55 + (performance.now() - holdT0) / 1600); SIDES.P.shaking = a; A.sfx.diceRattle(0.5 + a * 0.5); }, 130); }
    function release() { if (!holding) return; holding = false; awaiting = false; clearInterval(rattleIv); const dur = performance.now() - holdT0;
      setTimeout(() => { hit.classList.remove("on"); const r = holdRes; holdRes = null; r && r({ dur }); }, Math.max(0, 650 - dur)); }   // un toque rapido tambien vale: agita 0,65 s como minimo
    const waitHold = () => waitFor(res => { sh.waiting(true); holdRes = v => { sh.waiting(false); res(v); }; awaiting = true; hit.classList.add("on"); turnEl.classList.add("on"); hint("hTurn"); if (TST.auto) setTimeout(() => { press(); setTimeout(release, TST.auto.hold || 900); }, 700); });
    hit.addEventListener("pointerdown", e => { e.preventDefault(); press(); });
    const onUp = () => release(), onKey = e => { if (!ov.isConnected) return; if ((e.key === " " || e.key === "Enter") && awaiting) { e.preventDefault(); if (!e.repeat) press(); } }, onKeyUp = e => { if ((e.key === " " || e.key === "Enter") && holding) release(); };
    addEventListener("pointerup", onUp); addEventListener("pointercancel", onUp); addEventListener("blur", onUp); addEventListener("keydown", onKey, true); addEventListener("keyup", onKeyUp, true);

    /* ---- una tirada de un lado ---- */
    async function throwSide(S, vals, isP) {
      const rest = pickRests(S), yaws = rnd() < 0.5 ? [0, 1] : [1, 2], y2 = rnd() < 0.5 ? yaws : [yaws[1], yaws[0]];
      S.dice.forEach((d, i) => { d.n = vals[i]; d.yaw = y2[i]; d.el.style.backgroundImage = `url(assets/dados/dice_${S.mat}_${d.yaw}.png)`; d.mode = "hidden"; d.alpha = 1; d.key = ""; d.aShown = -1; d.tf = ""; });
      let f = 1;
      ST.phase = isP ? "pturn" : "dshake";
      if (!isP) { hint("hDealer"); say("diceShake", 1); S.shaking = 1; for (let i = 0; i < 8; i++) { A.sfx.diceRattle(0.7); await sleep(150 * TS + 20); } S.shaking = 0; S.cup.phi = S.cup.dx = S.cup.dy = 0; }
      else { say("diceTurn", 1, true); const h = await waitHold(); f = 0.85 + 0.35 * clamp(h.dur / 1500, 0, 1); }
      hint("hRoll"); ST.phase = isP ? "proll" : "droll";
      const id = reduced ? "deslizada" : (isP ? TST.pres : TST.dpres) || cx.reelPick("dice", PRES);                  // la presentacion: carrete vivo (_dice.pres / dpres: solo pruebas)
      const P = buildPlan(S, vals, id, f, rest);
      if (isP) A.sfx.cupDrum(Math.min(2600, P.T * 0.8));
      await runPlan(S, P);
      A.sfx.diceTick(); const total = vals[0] + vals[1]; tot(isP ? "P" : "D", total);
      if (vals[0] === 1 && vals[1] === 1) { A.sfx.diceSnake(); say("diceSnake", 3); }                                   // reaccion a la propia tirada: ojos de serpiente, doble seis, el doce de la banca, un siete
      else if (total === 12) { A.sfx.diceBoom(); A.casa.impacto(isP ? 2 : 1); say(isP ? "diceBoxcars" : "diceDealer12", 3); }
      else if (total === 7 && rnd() < 0.8) say("diceSeven", 1, true);
      await sleep(isP ? 700 : 600);
    }

    (async () => {
      try {
        const res = o.res, pay = o.pay; requestAnimationFrame(frame);
        banner(tr(cx.BT2.noMore)); A.sfx.rouNoMore(); ov.classList.add("spin"); say("diceIntro", 1); await sleep(1300 * TS + 200); ov.classList.remove("spin");
        for (let r = 0; r < res.throws.length; r++) {
          const th = res.throws[r];
          if (r > 0) { for (const S of Object.values(SIDES)) S.dice.forEach(d => { d.mode = "hidden"; }); tot("D"); tot("P"); Q(".dd-res").classList.remove("on"); banner(tr(U.retry)); await sleep(1500 * TS + 100); }
          await throwSide(SIDES.D, th.d, false); await throwSide(SIDES.P, th.p, true);
          hint(null); ST.phase = "cmp"; await sleep(700 * TS + 100);
          if (th.pt === th.dt) {
            A.sfx.diceTie(); ov.classList.add("hush");
            if (r === 0) { plate("tie", tr(U.tie), "", tr(U.tieMsg)); say("diceTie", 2); await sleep(2300 * TS + 200); ov.classList.remove("hush"); }
            else { ov.classList.remove("hush"); }
          }
        }
        const th = res.throws[res.throws.length - 1], lv = res.level; ov.classList.remove("hush"); sh.outcome();
        if (res.win) {
          tot("D", th.dt, "lose"); tot("P", th.pt, "win"); face("shock");
          if (lv >= 2) ov.classList.add("lv" + lv); ov.classList.add("win"); flash(); A.casa.premio(lv);
          if (lv === 3) setTimeout(() => { if (alive()) { flash(); A.sfx.jackpot(2); } }, 520);   // el eco del doble seis: el temblor ya crece con los golpes del premio
          plate("win" + (lv >= 2 ? " l" + lv : ""), tr(U.win), "×2", "+" + pay + " · " + tr(U["lv" + lv])); if (lv >= 2) fireCoins(lv === 3 ? 3 : 1);
          say(lv === 1 ? "diceWinSmall" : lv === 3 ? "diceWinBig" : (th.pt - th.dt <= 3 ? "diceWinSmall" : "diceWinBig"), 4);
        } else {
          A.sfx.lose(); ov.classList.add("lose"); tot("P", th.pt, "lose"); tot("D", th.dt, "win"); flash();
          if (res.tie2) plate("lose", tr(U.tie2), "", tr(cx.BT2.house) + " · −" + o.stake); else plate("lose", tr(U.lose), "", "−" + o.stake);
          say(res.tie2 ? "diceTie2" : "diceLose", 4);
        }
        ST.phase = "result"; await sleep(600); await speechIdle(); sh.hold(2200);                                     // la ultima frase del crupier se oye entera antes de cerrar (tocar la pantalla tambien cierra)
      } catch (e) {
        if (e === CANCEL) { if (!sh.closed && !ov.isConnected) sh.bail("capa retirada"); return; }   // otra pantalla se llevo la capa: que el Campamento no se quede bloqueado
        try { console.error("dados", e); } catch (x) { /* nada */ }
        sh.bail(e);                                                                                // el resultado ya esta guardado y cobrado: un fallo de la pantalla no pierde nada
      } finally { clearInterval(rattleIv); removeEventListener("keydown", onKey, true); removeEventListener("keyup", onKeyUp, true); removeEventListener("pointerup", onUp); removeEventListener("pointercancel", onUp); removeEventListener("blur", onUp); removeEventListener("resize", onResize); }
    })();
  }

  A.adv._dice = Object.assign(A.adv._dice || {}, { decide, PRES, lvOf });      // solo pruebas (dev/): force(res), pres / dpres (id de presentacion), auto ({ hold })
})(window.AIQ);
