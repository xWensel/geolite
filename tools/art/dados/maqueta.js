/* Duelo de dados - maqueta jugable. Todo el movimiento va por transform con enteros; el arte se escala x4 sin suavizar.
   El resultado (las caras de las dos tiradas) sale de una semilla ANTES de animar; las presentaciones del carrete solo lo ENSENAN. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s), sleep = ms => new Promise(r => setTimeout(r, ms));
  const G = "../../../assets/icons/", T0 = window.DD_T, SIT = window.DD_SIT, PRES = window.DD_PRES;
  const ST = { stake: 5, lang: "es", reduce: false, sound: true, busy: false, bal: 100, phase: "idle", forcePres: null, forceMode: "", recent: [], seen: {}, awaiting: false, auto: false, last: null, hintKey: "start", lastLine: {}, pi: -1, bi: -1 };
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), D2R = Math.PI / 180, rnd = Math.random, J = a => (rnd() - 0.5) * a, rr = (a, b) => a + (b - a) * rnd();
  const easeOut = p => 1 - Math.pow(1 - p, 3), smooth = p => p * p * (3 - 2 * p);
  const tx = () => T0[ST.lang];
  let TS = 1;                                            // escala de tiempo (reducir movimiento: mas corto)

  /* ------------------------------------------------------------------ la semilla decide TODO (en el juego: A.rng(seed) = mulberry32 + hash) */
  function hashStr(s) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; }
  function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const lvOf = m => (m <= 2 ? 1 : m <= 5 ? 2 : 3);
  function rollThrow(r) { const d = () => 1 + Math.floor(r() * 6), th = { p: [d(), d()], d: [d(), d()] }; th.pt = th.p[0] + th.p[1]; th.dt = th.d[0] + th.d[1]; return th; }
  function decide(seed, pred) {
    for (let k = 0; k < 6000; k++) {
      const s = (seed + k * 0x9E3779B1) >>> 0, r = mulberry32(hashStr("duelo" + s)), t1 = rollThrow(r), throws = [t1]; let win, last = t1;
      if (t1.pt !== t1.dt) win = t1.pt > t1.dt; else { last = rollThrow(r); throws.push(last); win = last.pt > last.dt; }
      const tie2 = throws.length === 2 && last.pt === last.dt, margin = Math.abs(last.pt - last.dt), res = { seed: s, throws, win, tie2, margin, level: win ? lvOf(margin) : 0 };
      if (!pred || pred(res)) return res;
    }
    return decide(seed + 1, null);
  }
  const FORCE = {
    "": null, win1: r => r.win && r.level === 1 && r.throws.length === 1, win3: r => r.win && r.level === 3, lose: r => !r.win && !r.tie2 && r.throws.length === 1, tie_win: r => r.throws.length === 2 && r.win, tie_lose: r => r.throws.length === 2 && !r.win && !r.tie2, tie2: r => r.tie2,
    snake: r => r.throws[0].p[0] === 1 && r.throws[0].p[1] === 1, boxcars: r => r.throws[0].p[0] === 6 && r.throws[0].p[1] === 6, dealer12: r => r.throws[0].d[0] === 6 && r.throws[0].d[1] === 6, seven: r => r.throws[0].pt === 7,
  };
  const FORCE_N = { "": ["Resultado al azar (semilla)", "Random result (seed)"], win1: ["Ganas por poco (nivel 1)", "Win narrowly (level 1)"], win3: ["Ganas de calle (nivel 3)", "Win big (level 3)"], lose: ["Pierdes", "Lose"], tie_win: ["Empate y ganas", "Tie, then win"], tie_lose: ["Empate y pierdes", "Tie, then lose"], tie2: ["Doble empate (gana la banca)", "Double tie (house wins)"], snake: ["Ojos de serpiente (tú)", "Snake eyes (you)"], boxcars: ["Doble seis (tú)", "Double six (you)"], dealer12: ["Él saca 12", "He rolls 12"], seven: ["Sacas un siete", "You roll a seven"] };
  let seedC = 0; const newSeed = () => (Date.now() ^ Math.imul(++seedC, 2654435761) ^ Math.floor(rnd() * 4294967296)) >>> 0;

  /* ------------------------------------------------------------------ escenario */
  const stage = $("#ddStage"), wrap = $("#ddWrap"), band = $("#ddBand"), world = $("#ddWorld"), glovesEl = $("#ddGloves");
  function fit() { const s = wrap.clientWidth / 1920, tf = `scale(${s})`; stage.style.transform = tf; stage.style.setProperty("--tf", tf); }
  addEventListener("resize", fit); document.addEventListener("fullscreenchange", () => setTimeout(fit, 60));
  const mk = (cls, parent) => { const d = document.createElement("div"); d.className = cls; (parent || world).appendChild(d); return d; };
  const AX = { X: 0, Z: 1, Y: 2, C: 3 };
  const SIDES = {
    D: { k: "D", cx: 235, gy: 835, dir: 1, mat: "burg", ring: { x: 600, y: 770 } },
    P: { k: "P", cx: 1685, gy: 835, dir: -1, mat: "ivory", ring: { x: 1320, y: 770 } },
  };
  for (const S of Object.values(SIDES)) {
    S.px = S.cx; S.py = S.gy - 78;
    S.sh = mk("dd-sh"); S.sh.style.cssText += "width:216px;height:56px;background-image:url(out/sh_cup.png);background-size:216px 56px";
    S.cb = mk("dd-cup"); S.cb.style.backgroundImage = "url(out/cup_back.png)"; S.cf = mk("dd-cup"); S.cf.style.backgroundImage = "url(out/cup_front.png)";
    S.cup = { phi: 0, dx: 0, dy: 0, k: -1 }; S.shaking = 0; S.plan = null;
    S.dice = [0, 1].map(i => ({ S, i, el: mk("dd-die"), sh: mk("dd-sh"), n: 1 + i * 2, inN: 1 + Math.floor(rnd() * 6), yaw: i, mode: "incup", st: { x: 0, y: 0, h: 0, ax: 1, ang: 0 }, key: "", shk: "", alpha: 1, bob: 0 }));
    S.dice.forEach(d => { d.el.style.backgroundImage = `url(out/dice_${S.mat}_${d.yaw}.png)`; });
    S.glove = { el: mk("dd-glove", glovesEl), vis: 0, tv: 0 }; S.glove.el.innerHTML = `<img src="out/glove_grab.png" width="184" height="200" alt="" draggable="false">`;
  }
  const coins = [0, 1, 2].map(() => mk("dd-coin", stage));

  /* ------------------------------------------------------------------ rutas (suelo x,y + altura h), giro y cubilete */
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

  /* ------------------------------------------------------------------ el carrete: las presentaciones */
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
    clasica: (c) => ({ keys: c.keys, dice: [std(c, 0, 3), std(c, 1, 3)] }),
    deslizada: (c) => ({ keys: c.keys, dice: [0, 1].map(i => { const p0 = c.p0[i], r = c.rest[i]; return die(c, i, mkRoute(p0, [{ d: 260, x: lerp(p0.x, r.x, 0.3), y: lerp(p0.y, r.y, 0.3), arc: 42 * c.f, ev: "land" }, { d: 1250 + i * 150, x: r.x, y: r.y, ex: "out", ev: "stop" }]), "Z", c.dir, 900 + i * 180, 1.3); }) }),
    baranda: (c) => ({ keys: c.keys, rail: true, dice: [0, 1].map(i => { const p0 = c.p0[i], r = c.rest[i], W = { x: lerp(p0.x, r.x, 0.55) + J(40) + i * 30 * c.dir, y: 590 + J(8) }; const m = { x: lerp(W.x, r.x, 0.55), y: lerp(W.y, r.y, 0.75) };
      return die(c, i, mkRoute(p0, [{ d: 420, x: W.x, y: W.y, h: 24, arc: 60 * c.f, ev: "rail" }, { d: 400, x: m.x, y: m.y, arc: 150 * c.f, ev: "land" }, { d: 240, x: lerp(m.x, r.x, 0.6), y: lerp(m.y, r.y, 0.6), arc: 44 * c.f, ev: "land" }, { d: 520, x: r.x, y: r.y, ex: "out", ev: "stop" }]), "X", -1, 720 + rnd() * 360, 1.4); }) }),
    choque: (c) => { const r0 = c.rest[0], r1 = c.rest[1], Kx = (r0.x + r1.x) / 2, Ky = (r0.y + r1.y) / 2; return { keys: c.keys, dice: [0, 1].map(i => { const p0 = c.p0[i], r = c.rest[i], sg = i ? 1 : -1, ax = Kx + sg * c.dir * 30, ay = Ky + sg * 10;
      return die(c, i, mkRoute(p0, [{ d: 620 - i * 60, x: lerp(p0.x, ax, 0.92), y: lerp(p0.y, ay, 0.92), arc: 175 * c.f, ev: "land" }, { d: 260 + i * 60, x: Kx + sg * c.dir * 16, y: Ky + sg * 4, ex: "out", ev: "clack" }, { d: 560, x: r.x, y: r.y, ex: "out", ev: "stop" }]), "Z", i ? -c.dir : c.dir, 540, 1.3); }) }; },
    desigual: (c) => { const fast = rnd() < 0.5 ? 0 : 1; return { keys: c.keys, dice: [0, 1].map(i => i === fast ? std(c, i, 1) : (() => { const o = { n: 3, fr: [0.45, 0.7, 0.88], durs: [470, 340, 270], arcs: [210, 120, 60], slide: 1500 }; return die(c, i, mkRoute(c.p0[i], bsegs(c, i, o)), "Z", c.dir, 1080 + rnd() * 360, 1.35); })()) }; },
    canto: (c) => { const e = rnd() < 0.5 ? 0 : 1; return { keys: c.keys, dice: [0, 1].map(i => { if (i !== e) return std(c, i, 3); const o = { n: 2, fr: [0.55, 0.85], durs: [430, 300], arcs: [170, 70], slide: 520 }, rt = mkRoute(c.p0[i], bsegs(c, i, o));
      return die(c, i, rt, "Z", c.dir, 540, 1.6, { A1: 45, tail: [[260 * TS, 37], [560 * TS, 48], [860 * TS, 40], [1130 * TS, 46], [1360 * TS, 43], [1620 * TS, 0]], edge: true }); }) }; },
    arriba: (c0) => null,
    volcado: (c0) => null,
    peonza: (c) => ({ keys: c.keys, dice: [0, 1].map(i => { const o = { n: 1, fr: [0.55], durs: [400], arcs: [160], slide: 750 }, rt = mkRoute(c.p0[i], bsegs(c, i, o)); return die(c, i, rt, "Y", i ? 1 : -1, 1620 + i * 360, 1.25, { T: rt.T + 350 * TS }); }) }),
    rodado: (c) => ({ keys: c.keys, dice: [0, 1].map(i => { const p0 = c.p0[i], r = c.rest[i]; return die(c, i, mkRoute(p0, [{ d: 320, x: lerp(p0.x, r.x, 0.25), y: Math.max(600, r.y - 110 - rnd() * 30), arc: 50 * c.f, ev: "land" }, { d: 1500 + i * 200, x: r.x, y: r.y, ex: "out3", ev: "stop" }]), "X", -1, 900 + i * 180, 1.15); }) }),
  };
  function buildPlan(S, vals, id, f, rest) {
    const s = -S.dir; let c, P;
    if (id === "arriba") {
      const k = [[0, 0, 0, 0], [160, -s * 10, 0, -30], [560, s * 40, S.dir * 120, -190], [900, s * 140, S.dir * 150, -200], [1500, s * 140, S.dir * 150, -200], [2100, 0, 0, 0]].map(q => [q[0] * TS, q[1], q[2], q[3]]);
      c = mkc(S, rest, f, k, [740, 810]);
      P = { keys: k, dice: [0, 1].map(i => { const p0 = c.p0[i], r = rest[i]; return die(c, i, mkRoute(p0, [{ d: 620, x: lerp(p0.x, r.x, 0.75), y: r.y - 70, hm: "fall", ev: "land" }, { d: 340, x: lerp(p0.x, r.x, 0.9), y: r.y - 20, arc: 130 * f, ev: "land" }, { d: 240, x: r.x, y: r.y - 6, arc: 50 * f, ev: "land" }, { d: 420, x: r.x, y: r.y, ex: "out", ev: "stop" }]), "Z", S.dir, 720 + rnd() * 360, 1.5); }) };
    } else if (id === "volcado") {
      const dx = S.ring.x - S.cx, dy = S.ring.y + 50 - S.gy, ph = s * 180;
      const k = [[0, 0, 0, 0], [140, -s * 20, 0, -14], [330, s * 95, dx * 0.45, -250], [560, ph, dx, dy], [640, ph, dx, dy - 22], [720, ph, dx, dy], [760, ph, dx + 6, dy], [840, ph, dx - 6, dy], [920, ph, dx + 5, dy], [1000, ph, dx - 5, dy], [1080, ph, dx + 4, dy], [1160, ph, dx - 4, dy], [1240, ph, dx, dy], [1560, ph, dx, dy], [1760, ph, dx, dy - 210], [2300, ph, dx, dy - 210], [2950, 0, 0, 0]].map(q => [q[0] * TS, q[1], q[2], q[3]]);
      c = mkc(S, rest, f, k, [1700, 1700]);
      P = { keys: k, glove: S.k === "D" ? [300 * TS, 2400 * TS] : null, appear: true, evx: [[560, "slam"], [760, "rattle"], [900, "rattle"], [1040, "rattle"], [1180, "rattle"], [1700, "lift"]].map(e => [e[0] * TS, e[1]]),
        dice: [0, 1].map(i => { const r = rest[i]; return { route: mkRoute({ x: r.x, y: r.y, h: 0 }, [{ d: 1 }]), tOut: 1700 * TS, appear: true, spin: null }; }) };
    } else {
      c = mkc(S, rest, f, pourKeys(S, 112, 450), [300, 360]); P = PR[id](c);
    }
    P.dice.forEach((dd, i) => { dd.val = vals[i]; dd.rest = rest[i]; dd.end = dd.tOut + Math.max(dd.route.T, spinEnd(dd.spin)); });
    P.T = Math.max(...P.dice.map(d => d.end), P.keys[P.keys.length - 1][0]) + 120 * TS; P.id = id; P.S = S;
    P.ev = []; P.dice.forEach(dd => dd.route.segs.forEach(sg => { if (sg.ev) P.ev.push({ t: dd.tOut + sg.t1, k: sg.ev, s: sg.arc || 0, h: sg.a.h }); })); (P.evx || []).forEach(e => P.ev.push({ t: e[0], k: e[1], s: 0 })); P.ev.sort((a, b) => a.t - b.t);
    return P;
  }
  const poolPick = (rest, S) => rest;
  function pickRests(S) {
    const R = S.ring, a = { x: R.x + rr(-175, -45), y: R.y + rr(-62, 62) }, b = { x: R.x + rr(45, 175), y: R.y + rr(-62, 62) }, arr = rnd() < 0.5 ? [a, b] : [b, a];
    return arr.sort((p, q) => Math.abs(p.x - S.cx) - Math.abs(q.x - S.cx));
  }
  function reelPick(exclude) {
    const ids = PRES.map(p => p.id).filter(id => !ST.recent.includes(id) && !(exclude || []).includes(id)), w = ids.map(id => 1 / Math.pow(1 + (ST.seen[id] || 0), 1.6)), tot = w.reduce((a, b) => a + b, 0);
    let x = rnd() * tot, pick = ids[ids.length - 1]; for (let i = 0; i < ids.length; i++) { x -= w[i]; if (x <= 0) { pick = ids[i]; break; } }
    return pick;
  }
  const noteSeen = id => { ST.seen[id] = (ST.seen[id] || 0) + 1; ST.recent.push(id); while (ST.recent.length > 2) ST.recent.shift(); seenList(); };

  /* ------------------------------------------------------------------ dibujado por fotograma (solo transform / opacity y el cuadro del sprite) */
  const SHSZ = { l: [120, 40], m: [96, 32], s: [72, 24] };
  function drawDie(d, now) {
    const S = d.S;
    if (d.mode === "hidden") { if (d.shown !== 0) { d.el.style.display = d.sh.style.display = "none"; d.shown = 0; } return; }
    if (d.shown !== 1) { d.el.style.display = d.sh.style.display = "block"; d.shown = 1; }
    let cx, cy, key, z, row, col;
    if (d.mode === "incup") {
      const k = S.cup, ph = k.phi * D2R, xl = (d.i ? 18 : -18), yl = 42 + d.bob, px = S.px + k.dx, py = S.py + k.dy;
      cx = px + xl * Math.cos(ph) - yl * Math.sin(ph); cy = py - xl * Math.sin(ph) - yl * Math.cos(ph);
      row = (d.inN - 1) * 4 + 1; col = Math.floor(now / 70 + d.i * 5) % 16; z = S.gy * 4 + 1;
      d.sh.style.display = "none"; d.shk = ""; d.shd = 0;
    } else {
      if (!d.shd) { d.sh.style.display = "block"; d.shd = 1; }
      const s = d.st; cx = s.x; cy = s.y - s.h - 32; z = Math.round(s.y) * 4 + 3;
      col = ((Math.round(s.ang / 22.5) % 16) + 16) % 16; row = (d.n - 1) * 4 + s.ax;
      const sz = s.h < 26 ? "l" : s.h < 100 ? "m" : "s", w = SHSZ[sz][0], h = SHSZ[sz][1];
      if (d.shk !== sz) { d.shk = sz; d.sh.style.cssText += `;width:${w}px;height:${h}px;background-image:url(out/sh_${sz}.png);background-size:${w}px ${h}px`; }
      d.sh.style.transform = `translate3d(${Math.round(s.x - w / 2)}px,${Math.round(s.y - h / 2 + 8)}px,0)`; d.sh.style.opacity = clamp(1 - s.h / 420, 0.35, 0.95); d.sh.style.zIndex = Math.round(s.y) * 4 + 1;
    }
    d.el.style.transform = `translate3d(${Math.round(cx - 72)}px,${Math.round(cy - 72)}px,0)`; d.el.style.zIndex = z;
    key = row * 16 + col; if (key !== d.key) { d.key = key; d.el.style.backgroundPosition = `${-col * 144}px ${-row * 144}px`; }
    if (d.aShown !== d.alpha) { d.aShown = d.alpha; d.el.style.opacity = d.alpha; }
  }
  function drawCup(S) {
    const k = S.cup, kk = ((Math.round((k.phi + 180) / 15) % 24) + 24) % 24, x = Math.round(S.px + k.dx - 120), y = Math.round(S.py + k.dy - 120), tf = `translate3d(${x}px,${y}px,0)`;
    S.cb.style.transform = S.cf.style.transform = tf; S.cb.style.zIndex = S.gy * 4; S.cf.style.zIndex = S.gy * 4 + 2;
    if (kk !== k.k) { k.k = kk; S.cb.style.backgroundPositionX = S.cf.style.backgroundPositionX = -kk * 240 + "px"; }
    S.sh.style.transform = `translate3d(${Math.round(S.cx - 108 + k.dx * 0.9)}px,${Math.round(S.gy - 30)}px,0)`; S.sh.style.opacity = clamp(1 + k.dy / 360, 0.25, 1); S.sh.style.zIndex = S.gy * 4 - 1;
  }
  function stepSide(S, now) {
    const P = S.plan;
    if (P) {
      const t = now - P.t0, c = cupAt(P.keys, t); S.cup.phi = c.phi; S.cup.dx = c.dx; S.cup.dy = c.dy;
      for (const dd of P.dice) {
        const d = dd.d, u = t - dd.tOut;
        if (dd.appear) { d.mode = t >= dd.tOut ? "ground" : "hidden"; d.alpha = clamp(u / 160, 0, 1); }
        else d.mode = t < dd.tOut ? "incup" : "ground";
        d.bob = 0;
        if (d.mode === "ground") { const p = dd.route.at(Math.max(0, u)); d.st.x = p.x; d.st.y = p.y; d.st.h = p.h; d.st.ax = AX[dd.spin ? dd.spin.axis : "Z"]; d.st.ang = angAt(dd.spin, Math.max(0, u)); }
      }
      while (P.ei < P.ev.length && P.ev[P.ei].t <= t) fireEv(P, P.ev[P.ei++]);
      if (P.glove) { S.glove.tv = (t >= P.glove[0] && t <= P.glove[1]) ? 1 : 0; }
      if (t >= P.T && !P.done) { P.done = true; for (const dd of P.dice) { const d = dd.d; d.mode = "ground"; d.alpha = 1; d.st = { x: dd.rest.x, y: dd.rest.y, h: 0, ax: 1, ang: 0 }; } S.cup.phi = 0; S.cup.dx = 0; S.cup.dy = 0; S.glove.tv = 0; S.plan = null; P.resolve(); }
    } else if (S.shaking) {
      const a = S.shaking, ph = [-15, 0, 15, 0][Math.floor(now / 52) % 4];
      S.cup.phi = ph * Math.min(1, a); S.cup.dx = Math.sin(now / 37) * 5 * a; S.cup.dy = -Math.abs(Math.sin(now / 61)) * 9 * a;
      S.dice.forEach(d => { d.mode = "incup"; d.bob = Math.abs(Math.sin(now / 47 + d.i * 2)) * 46 * Math.min(1, a); });
    }
    const g = S.glove; g.vis += (g.tv - g.vis) * 0.3; if (Math.abs(g.tv - g.vis) < 0.01) g.vis = g.tv;
    g.el.style.opacity = g.vis; g.el.style.transform = `translate3d(${Math.round(S.px + S.cup.dx - 92)}px,${Math.round(S.py + S.cup.dy - 240 - (1 - g.vis) * 140)}px,0)`;
    drawCup(S); S.dice.forEach(d => drawDie(d, now));
  }
  function frame(now) { stepSide(SIDES.D, now); stepSide(SIDES.P, now); requestAnimationFrame(frame); }
  function fireEv(P, e) {
    if (e.k === "land") sfx.land(clamp(e.s / 190, 0.25, 1)); else if (e.k === "rail") { sfx.rail(); const r = $(".dd-rail-h"); r.classList.remove("hit"); void r.offsetWidth; r.classList.add("hit"); smallShake(3); }
    else if (e.k === "clack") sfx.clack(); else if (e.k === "slam") { sfx.slam(); smallShake(7); } else if (e.k === "rattle") sfx.rattle(0.8); else if (e.k === "lift") sfx.lift(); else if (e.k === "stop") sfx.tick();
  }
  function runPlan(S, P) { return new Promise(res => { P.resolve = res; P.ei = 0; P.t0 = performance.now(); P.done = false; S.plan = P; S.shaking = 0; P.dice.forEach((dd, i) => { dd.d = S.dice[i]; dd.d.n = dd.val; }); }); }

  /* ------------------------------------------------------------------ sonido (WebAudio sencillo; en el juego, el motor de js/audio.js) */
  const AU = { ctx: null, init() { if (!ST.sound) return null; if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (this.ctx.state === "suspended") this.ctx.resume(); return this.ctx; } };
  const env = (g, t, a, v, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); };
  function tone(f0, f1, d, type, v, delay = 0) { const c = AU.init(); if (!c) return; const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + d); env(g, t, 0.004, v, d); o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05); }
  function noise(d, v, hp, delay = 0) { const c = AU.init(); if (!c) return; const t = c.currentTime + delay, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = "highpass"; f.frequency.value = hp; env(g, t, 0.003, v, d); s.connect(f).connect(g).connect(c.destination); s.start(t); }
  const sfx = {
    rattle(a = 1) { const n = 3 + Math.floor(rnd() * 3); for (let i = 0; i < n; i++) { noise(0.03, (0.05 + rnd() * 0.05) * a, 1800 + rnd() * 2600, i * (0.02 + rnd() * 0.03)); tone(700 + rnd() * 900, 300, 0.03, "square", 0.012 * a, i * 0.03); } },
    land(s = 1) { noise(0.05, 0.05 + 0.1 * s, 800 + rnd() * 400); tone((150 + rnd() * 50) * (1.3 - s * 0.4), 60, 0.09, "sine", 0.06 + 0.12 * s); tone(900 + rnd() * 500, 500, 0.04, "square", 0.01 + 0.02 * s); },
    tick() { noise(0.02, 0.03, 3000); }, clack() { tone(1700 + rnd() * 300, 800, 0.05, "square", 0.07); noise(0.03, 0.1, 3200); tone(260, 120, 0.1, "sine", 0.1); },
    rail() { tone(210, 80, 0.2, "triangle", 0.2); noise(0.12, 0.1, 600); tone(1320, 1320, 0.25, "sine", 0.03); }, slam() { tone(120, 40, 0.35, "sine", 0.34); noise(0.14, 0.14, 700); sfx.rattle(1); },
    lift() { noise(0.16, 0.07, 900); tone(170, 300, 0.15, "triangle", 0.06); }, bell() { tone(1568, 1568, 0.9, "sine", 0.07); tone(2093, 2093, 0.9, "sine", 0.04, 0.02); tone(120, 60, 0.2, "sine", 0.12); },
    drum(ms) { const n = Math.round(ms / 55); for (let i = 0; i < n; i++) { tone(95 + rnd() * 8, 70, 0.06, "sine", 0.04 + (i / n) * 0.12, i * 0.055); noise(0.03, 0.025 + (i / n) * 0.07, 1800, i * 0.055); } },
    win(l) { const root = [523, 554, 587, 622][Math.floor(rnd() * 4)], rt = l === 1 ? [1, 1.25, 1.5] : l === 2 ? [1, 1.25, 1.5, 2, 1.5, 2] : [1, 1.25, 1.5, 2, 2.5, 3, 2, 3]; rt.forEach((r, i) => tone(root * r, root * r, 0.35 + 0.12 * l, "triangle", 0.09 + 0.02 * l, i * (0.115 - 0.014 * l)));
      if (l >= 2) tone(root / 4, root / 4, 0.9, "sawtooth", 0.05, 0.2); if (l === 3) { noise(1.0, 0.05, 3000, 0.3); for (let i = 0; i < 6; i++) tone(2093 + i * 170, 2093 + i * 170, 0.22, "sine", 0.05, 0.5 + i * 0.07); } },
    lose() { tone(300, 110, 0.55, "sawtooth", 0.08); tone(200, 80, 0.6, "sine", 0.1, 0.1); }, tie() { tone(440, 440, 0.25, "triangle", 0.1); tone(440, 440, 0.4, "triangle", 0.1, 0.3); tone(330, 330, 0.5, "sine", 0.06, 0.3); },
    snake() { tone(1400, 300, 0.8, "sawtooth", 0.035); noise(0.7, 0.05, 5000); }, boom() { tone(80, 30, 0.6, "sine", 0.3); [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, 0.5, "triangle", 0.1, 0.1 + i * 0.08)); },
  };

  /* ------------------------------------------------------------------ voz del crupier: cola, nunca se le corta; siempre 1 s mas en pantalla */
  const SP = { cur: false, pend: null }, dealerEl = $("#ddDealer");
  const setFace = f => { dealerEl.src = G + "dealer_" + f + ".webp"; };
  function gesture(g) { if (!g || g === "none" || ST.reduce) return; dealerEl.classList.remove("hop", "shudder", "drop", "lean", "bob"); void dealerEl.offsetWidth; dealerEl.classList.add(g); setTimeout(() => dealerEl.classList.remove(g), 900); }
  function say(text, face, g, prio = 1) { if (SP.cur) { if (!SP.pend || prio >= SP.pend.prio) SP.pend = { text, face, g, prio }; return; } speak(text, face, g); }
  function speak(text, face, g) {
    SP.cur = true; $("#ddBubbleTx").textContent = text; $("#ddBubble").classList.add("on"); setFace(face || "neutral"); gesture(g);
    setTimeout(() => { $("#ddBubble").classList.remove("on"); setFace("neutral"); if (SP.pend) { const p = SP.pend; SP.pend = null; setTimeout(() => speak(p.text, p.face, p.g), 350); } else SP.cur = false; }, 1800 + text.length * 22 + 1000);
  }
  function line(key) { const a = SIT[key][ST.lang]; let i = Math.floor(rnd() * a.length); if (i === ST.lastLine[key] && a.length > 1) i = (i + 1 + Math.floor(rnd() * (a.length - 1))) % a.length; ST.lastLine[key] = i; return a[i]; }
  const sayK = (key, prio = 1, skipIfBusy) => { if (skipIfBusy && SP.cur) return; say(line(key), SIT[key].face, SIT[key].g, prio); };

  /* ------------------------------------------------------------------ interfaz del escenario */
  const hint = k => { ST.hintKey = k; const h = $("#ddHint"); if (!k) { h.classList.remove("on"); return; } h.textContent = tx().hint[k]; h.classList.add("on"); };
  const pillUpdate = () => { const p = $("#ddPill"); p.innerHTML = `<i></i><span>${tx().pill} <b>${ST.stake}</b></span>`; p.classList.add("on"); };
  function hud() { $("#ddHud").innerHTML = `<span><img src="${G}coin.webp" alt=""><small>${tx().bal}</small><em>${ST.bal}</em></span><span><small>${tx().chip}</small><em>${ST.stake}</em></span><span><small>${tx().prize}</small><em>×2</em></span>`; $("#ddCardStake") && ($("#ddCardStake").textContent = ST.stake); }
  const labels = () => { $("#ddLabD").textContent = tx().banca; $("#ddLabP").textContent = tx().tu; $("#ddTurnTx").textContent = tx().turn; };
  function showPlate(kind, name, extra, msg) { const p = $("#ddPlate"); p.className = "dd-plate " + kind; p.innerHTML = `<b>${name}</b>${extra ? `<i>${extra}</i>` : ""}`; $("#ddMsg").textContent = msg; const r = $("#ddRes"); r.classList.remove("on"); void r.offsetWidth; r.classList.add("on"); }
  function banner(text) { const n = $("#ddNo"); n.textContent = text; n.classList.remove("on"); void n.offsetWidth; n.classList.add("on"); }
  const wash = col => { const w = $("#ddWash"); w.style.setProperty("--wc", col); w.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: "ease-out" }); };
  function smallShake(a) { shake(a, 0.3); }
  function shake(amp, dur = 0.5) { if (ST.reduce) return; amp *= 0.85 + rnd() * 0.3; stage.style.setProperty("--sa", (rnd() < 0.5 ? -amp : amp) + "px"); stage.style.setProperty("--sd", dur + "s"); stage.classList.remove("shake"); void stage.offsetWidth; stage.classList.add("shake"); }
  const tot = (S, n, cls) => { const el = $(S === "D" ? "#ddTotD" : "#ddTotP"); el.className = "dd-tot" + (n == null ? "" : " on " + (cls || "")); el.style.opacity = n == null ? 0 : ""; el.innerHTML = n == null ? "" : `<b>${n}</b>`; };

  /* ------------------------------------------------------------------ una partida */
  function resetScene() {
    SP.pend = null; for (const S of Object.values(SIDES)) { S.plan = null; S.shaking = 0; S.cup.phi = S.cup.dx = S.cup.dy = 0; S.glove.tv = 0; S.dice.forEach(d => { d.mode = "incup"; d.alpha = 1; d.bob = 0; d.inN = 1 + Math.floor(rnd() * 6); }); }
    tot("D"); tot("P"); $("#ddRes").classList.remove("on"); $("#ddNo").classList.remove("on"); band.classList.remove("hush", "fast"); setFace("neutral"); hint(null); $("#ddTurn").classList.remove("on"); $("#ddHit").classList.remove("on");
  }
  let holdRes = null, holdT0 = 0, holding = false, rattleIv = 0;
  function press() { if (!ST.awaiting || holding) return; holding = true; holdT0 = performance.now(); SIDES.P.shaking = 0.6; hint("shake"); $("#ddTurn").classList.remove("on"); sfx.rattle(0.8); rattleIv = setInterval(() => { const a = Math.min(1, 0.55 + (performance.now() - holdT0) / 1600); SIDES.P.shaking = a; sfx.rattle(0.5 + a * 0.5); }, 130); }
  function release() { if (!holding) return; holding = false; ST.awaiting = false; clearInterval(rattleIv); const dur = performance.now() - holdT0; setTimeout(() => { $("#ddHit").classList.remove("on"); const r = holdRes; holdRes = null; r && r({ dur }); }, Math.max(0, 650 - dur)); }
  const waitHold = () => new Promise(res => { holdRes = res; ST.awaiting = true; $("#ddHit").classList.add("on"); $("#ddTurn").classList.add("on"); hint("turn"); if (ST.auto) setTimeout(() => { press(); setTimeout(release, ST.autoHold || 900); }, 700); });

  async function throwSide(S, vals, isP, round) {
    const rest = pickRests(S), yaws = rnd() < 0.5 ? [0, 1] : [1, 2], y2 = rnd() < 0.5 ? yaws : [yaws[1], yaws[0]], who = isP ? "P" : "D";
    S.dice.forEach((d, i) => { d.n = vals[i]; d.yaw = y2[i]; d.el.style.backgroundImage = `url(out/dice_${S.mat}_${d.yaw}.png)`; d.mode = "incup"; d.alpha = 1; d.key = ""; });
    let f = 1;
    if (!isP) { hint("dealer"); sayK("shake", 1); S.shaking = 1; for (let i = 0; i < 8; i++) { sfx.rattle(0.7); await sleep(150 * TS + 20); } S.shaking = 0; S.cup.phi = S.cup.dx = S.cup.dy = 0; }
    else { ST.phase = "turn"; sayK("turn", 1, true); const h = await waitHold(); f = 0.85 + 0.35 * clamp(h.dur / 1500, 0, 1); }
    hint("roll"); ST.phase = "roll";
    let id = ST.reduce ? "deslizada" : (isP && ST.forcePres) ? ST.forcePres : (!isP && ST.forceDealerPres) ? ST.forceDealerPres : reelPick(isP ? [] : [ST.forcePres, ST.lastPlayerPres].filter(Boolean)); noteSeen(id);
    if (isP) ST.lastPlayerPres = id; else ST.lastDealerPres = id;
    if (ST.last) ST.last.pres.push(who + ":" + id); const pi = PRES.findIndex(p => p.id === id); if (isP) ST.pi = pi; else ST.bi = pi; countUpdate();
    const P = buildPlan(S, vals, id, f, rest);
    if (isP) sfx.drum(Math.min(2600, P.T * 0.8));
    await runPlan(S, P);
    sfx.tick(); const total = vals[0] + vals[1]; tot(who, total); S.total = total;
    // reaccion del propio tiro: ojos de serpiente, doble seis, doce de la banca, un siete
    if (vals[0] === 1 && vals[1] === 1) { sfx.snake(); sayK("snake", 3); } else if (total === 12) { sfx.boom(); shake(isP ? 10 : 6, 0.5); sayK(isP ? "boxcars" : "dealer12", 3); } else if (total === 7 && rnd() < 0.8) sayK("seven", 1, true);
    await sleep(isP ? 700 : 600);
  }
  async function play() {
    if (ST.busy) return; AU.init(); ST.busy = true; ST.phase = "intro"; $("#ddBtnPlay").disabled = true; $("#ddSelForce").disabled = true; TS = ST.reduce ? 0.55 : 1;
    if (ST.bal < ST.stake) ST.bal = 100; ST.bal -= ST.stake; hud(); pillUpdate(); resetScene();
    const out = decide(newSeed(), FORCE[ST.forceMode]); ST.last = { seed: out.seed, out, pres: [] }; window.__dados.last = ST.last;
    const th0 = out.throws[0]; $("#ddLast").textContent = "semilla " + out.seed;
    banner(tx().no); sfx.bell(); band.classList.add("fast"); sayK("intro", 1); await sleep(1300 * TS + 200); band.classList.remove("fast");
    let res = null;
    for (let r = 0; r < out.throws.length; r++) {
      const th = out.throws[r];
      if (r > 0) { for (const S of Object.values(SIDES)) S.dice.forEach(d => { d.mode = "incup"; d.inN = 1 + Math.floor(rnd() * 6); }); tot("D"); tot("P"); banner(tx().retryNo); await sleep(1500 * TS + 100); }
      await throwSide(SIDES.D, th.d, false, r); await throwSide(SIDES.P, th.p, true, r);
      hint(null); ST.phase = "compare"; await sleep(700 * TS + 100);
      if (th.pt === th.dt) {
        sfx.tie(); band.classList.add("hush");
        if (r === 0) { showPlate("tie", tx().tie, "", tx().tieMsg); sayK("tie", 2); await sleep(2300 * TS + 200); band.classList.remove("hush"); }
        else { showPlate("lose", tx().tie2, "", tx().tie2Msg + " · " + tx().loseMsg(ST.stake)); band.classList.remove("hush"); }
      }
    }
    // resultado final (ultima tirada)
    const th = out.throws[out.throws.length - 1], win = out.win, lv = out.level; band.classList.remove("hush");
    if (win) {
      ST.bal += ST.stake * 2; hud(); tot("D", th.dt, "lose"); tot("P", th.pt, "win"); sfx.win(lv); setFace("shock");
      const col = ["", "rgba(255,217,90,.4)", "rgba(255,190,70,.6)", "rgba(255,120,60,.75)"][lv]; wash(col); shake([0, 5, 11, 20][lv], 0.4 + lv * 0.12); if (lv === 3) setTimeout(() => { wash("rgba(255,233,166,.6)"); shake(10, 0.5); sfx.win(2); }, 520);
      showPlate("win" + (lv >= 2 ? " l" + lv : ""), tx().win, "×2", tx().winMsg(ST.stake * 2) + (lv ? " · " + tx().lvl[lv] : "")); if (lv >= 2) fireCoins(lv === 3 ? 3 : 1);
      sayK(lv === 1 ? "winSmall" : lv === 3 ? "winBig" : (th.pt - th.dt <= 3 ? "winSmall" : "winBig"), 4);
    } else {
      sfx.lose(); tot("P", th.pt, "lose"); tot("D", th.dt, "win"); const t2 = out.tie2;
      if (!t2) showPlate("lose", tx().lose, "", tx().loseMsg(ST.stake)); else showPlate("lose", tx().tie2, "", tx().tie2Msg + " · " + tx().loseMsg(ST.stake));
      sayK(t2 ? "tie2" : "lose", 4);
    }
    ST.phase = "result"; await sleep(3200 * TS + 200);
    ST.busy = false; ST.phase = "idle"; $("#ddBtnPlay").disabled = false; $("#ddSelForce").disabled = false; hint("start"); $("#ddRes").classList.remove("on"); ST.forcePres = null; $("#ddSelPres").value = ""; countUpdate();
    $("#ddLast").textContent = `semilla ${out.seed} · banca ${out.throws.map(t => t.d.join("+") + "=" + t.dt).join(" → ")} · tú ${out.throws.map(t => t.p.join("+") + "=" + t.pt).join(" → ")} · ${win ? "gana (nivel " + lv + ")" : out.tie2 ? "doble empate" : "pierde"}`;
  }
  function fireCoins(n) {   // las monedas saltan del aro de tu tirada y vuelan a la bolsa (abajo a la izquierda)
    if (ST.reduce) return; const S = SIDES.P; coins.slice(0, n).forEach((el, i) => setTimeout(() => { el.style.display = "block"; const x0 = S.ring.x - 48 + (i - (n - 1) / 2) * 110, y0 = 690, x1 = 40, y1 = 900, t0 = performance.now(), dur = 1050 + i * 80;
      const step = now => { const p = Math.min(1, (now - t0) / dur), e = p * p, h = Math.sin(Math.PI * Math.min(1, p * 1.15)) * (200 + i * 40); el.style.transform = `translate3d(${Math.round(lerp(x0, x1, e))}px,${Math.round(lerp(y0, y1, p) - h)}px,0)`; el.style.backgroundPositionX = -(Math.floor(p * 40) % 24) * 96 + "px"; if (p < 1) requestAnimationFrame(step); else el.style.display = "none"; }; requestAnimationFrame(step); }, i * 170));
  }

  /* ------------------------------------------------------------------ cartas de la Barra (HTML del juego) */
  function cards() {
    const t = tx().card, cn = `<img class="ic ic-coin cn" src="${G}coin.webp" alt="" draggable="false">`, ico = (id, src) => `<span class="sp-ic"><img class="ic ic-${id}" src="${src || G + id + ".webp"}" alt="" draggable="false"></span>`;
    $("#ddCards").innerHTML =
      `<div class="sup bet cas bt-red">${ico("bet_red")}<span class="sp-t"><b>${t.red}</b><i>${t.redS}</i></span><span class="bt-pick"><button class="bt-c bt-cr" type="button">${t.redB}</button><button class="bt-c bt-cb" type="button">${t.blackB}</button><button class="bt-c bt-cg" type="button">${t.greenB}</button><em class="sp-p">${cn}2</em></span></div>` +
      `<div class="sup bet cas bt-coin">${ico("bet_coin")}<span class="sp-t"><b>${t.coin}</b><i>${t.coinS}</i></span><span class="bt-pick"><button class="bt-c bt-ch" type="button">${t.heads}</button><button class="bt-c bt-ct" type="button">${t.tails}</button><em class="sp-p bt-stake">${cn}2</em></span></div>` +
      `<div class="sup bet cas bt-wheel">${ico("bet_wheel")}<span class="sp-t"><b>${t.wheel}</b><i>${t.wheelS}</i></span><span class="bt-pick"><button class="bt-c bt-cs" type="button">${t.spin}</button><em class="sp-p">${cn}4</em></span></div>` +
      `<div class="sup bet cas bt-dice" id="ddCardDice">${ico("bet_dados", "out/bet_dados.webp")}<span class="sp-t"><b>${t.n}</b><i>${t.s}</i></span><span class="bt-pick"><button class="bt-c bt-di" type="button" id="ddCardPlay">${t.play}</button><em class="sp-p bt-stake" id="ddCardStakeBtn">${cn}<span id="ddCardStake">${ST.stake}</span></em></span></div>`;
    $("#ddCardPlay").onclick = () => { wrap.scrollIntoView({ behavior: "smooth", block: "center" }); play(); };
    $("#ddCardStakeBtn").onclick = () => { const v = ST.stake === 2 ? 5 : ST.stake === 5 ? 10 : 2; setStake(v); };
  }
  function setStake(v) { ST.stake = v; document.querySelectorAll("#ddSegStake button").forEach(b => b.classList.toggle("on", +b.dataset.v === v)); hud(); pillUpdate(); }

  /* ------------------------------------------------------------------ secciones de datos: pagos, RTP, carrete, reacciones */
  function dataSections() {
    const cnt = {}; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) cnt[a + b] = (cnt[a + b] || 0) + 1;
    const pct = (x, d = 3) => (x * 100).toFixed(d).replace(".", ",") + " %", w1 = 575 / 1296, t1 = 146 / 1296, win = 829150 / 1679616, lose = 850466 / 1679616, rtp = 2 * win;
    let l = [0, 0, 0, 0]; for (let x = 2; x <= 12; x++) for (let y = 2; y <= 12; y++) if (x > y) l[lvOf(x - y)] += (cnt[x] * cnt[y]) / 1296 * (1 + t1);
    $("#ddPay").innerHTML = `<tr><th>Situación</th><th>Resultado</th><th class="n">Pago</th></tr><tr><td>Tu total &gt; el de la banca</td><td>Ganas</td><td class="n">×2</td></tr><tr><td>Tu total &lt; el de la banca</td><td>Pierdes la ficha</td><td class="n">×0</td></tr><tr><td>Empate (1.ª tirada)</td><td>Se repite la tirada una vez</td><td class="n">—</td></tr><tr><td>Empate otra vez (2.ª tirada)</td><td>Gana la banca</td><td class="n">×0</td></tr>`;
    $("#ddProb").innerHTML = `<tr><th>Suceso</th><th class="n">Exacta</th><th class="n">%</th></tr><tr><td>Una tirada: gano</td><td class="n">575/1296</td><td class="n">${pct(w1, 4)}</td></tr><tr><td>Una tirada: empato</td><td class="n">146/1296</td><td class="n">${pct(t1, 4)}</td></tr><tr class="pick"><td>PARTIDA: GANAS</td><td class="n">829150/1679616</td><td class="n">${pct(win, 4)}</td></tr><tr><td>PARTIDA: pierdes</td><td class="n">850466/1679616</td><td class="n">${pct(lose, 4)}</td></tr><tr><td>(de ellas, doble empate)</td><td class="n">21316/1679616</td><td class="n">${pct(t1 * t1, 4)}</td></tr><tr class="pick"><td>RTP = 2 × P(ganar)</td><td class="n">1658300/1679616</td><td class="n">${pct(rtp, 3)}</td></tr><tr><td>Ventaja de la casa</td><td class="n"></td><td class="n">${pct(1 - rtp, 3)}</td></tr>`;
    $("#ddLvl").innerHTML = `<tr><th>Nivel</th><th>Margen ganado</th><th class="n">% de las partidas</th><th>Recompensa</th></tr><tr><td>1</td><td>1-2 puntos</td><td class="n">${pct(l[1], 2)}</td><td>arpegio corto, temblor suave</td></tr><tr><td>2</td><td>3-5 puntos</td><td class="n">${pct(l[2], 2)}</td><td>arpegio largo, temblor medio, 1 moneda</td></tr><tr><td>3</td><td>6+ puntos</td><td class="n">${pct(l[3], 2)}</td><td>fanfarria, doble temblor, 3 monedas</td></tr>`;
    $("#ddAlt").innerHTML = `<tr><th>Regla</th><th class="n">RTP</th></tr><tr><td>Empate = gana la banca</td><td class="n">88,735 %</td></tr><tr><td>Empate = se devuelve</td><td class="n">100 %</td></tr><tr><td>Repetir hasta decidir</td><td class="n">100 %</td></tr><tr><td>Repetir 1 vez; 2.º empate = devolver</td><td class="n">100 %</td></tr><tr class="pick"><td>Repetir 1 vez; 2.º empate = banca (ELEGIDA)</td><td class="n">98,731 %</td></tr><tr><td>La elegida pagando ×1,95</td><td class="n">96,263 %</td></tr>`;
    $("#ddDist").innerHTML = Object.keys(cnt).map(k => `<div><i style="height:${cnt[k] * 16}px"></i><b>${k}</b><span>${cnt[k]}/36</span></div>`).join("");
    $("#ddNPres").textContent = PRES.length;
    $("#ddSelPres").innerHTML = `<option value="">Presentación: al azar (carrete)</option>` + PRES.map((p, i) => `<option value="${p.id}">${i + 1}. ${p.n[0]}</option>`).join("");
    $("#ddSelForce").innerHTML = Object.keys(FORCE).map(k => `<option value="${k}">${FORCE_N[k][ST.lang === "es" ? 0 : 1]}</option>`).join("");
    reactList(); presList(); countUpdate();
  }
  function presList() {
    const L = ST.lang === "es" ? 0 : 1; $("#ddPresList").innerHTML = PRES.map(p => `<li><b>${p.n[L]}</b> <em class="seen" data-id="${p.id}"></em><button data-id="${p.id}">Probar</button><br>${p.d[L]}</li>`).join("");
    $("#ddPresList").querySelectorAll("button").forEach(b => (b.onclick = () => { if (ST.busy) return; ST.forcePres = b.dataset.id; $("#ddSelPres").value = b.dataset.id; wrap.scrollIntoView({ behavior: "smooth", block: "center" }); play(); })); seenList();
  }
  const seenList = () => { document.querySelectorAll(".seen").forEach(e => (e.textContent = "vista " + (ST.seen[e.dataset.id] || 0) + "×")); };
  function reactList() {
    const L = ST.lang === "es" ? 0 : 1; $("#ddReact").innerHTML = Object.keys(SIT).map(k => `<div class="dd-sit"><h4>${SIT[k].n[L]}<small>cara ${SIT[k].face} · gesto ${SIT[k].g}</small></h4><ul>${SIT[k][ST.lang].map(s => `<li>${s}</li>`).join("")}</ul></div>`).join("");
  }
  function countUpdate() { const N = PRES.length; $("#ddCount").textContent = `presentación ${ST.pi < 0 ? "—" : ST.pi + 1} de ${N} (tú) · ${ST.bi < 0 ? "—" : ST.bi + 1} de ${N} (banca)`; }

  /* ------------------------------------------------------------------ controles */
  function wireSeg(id, cb) { document.querySelectorAll(id + " button").forEach(b => (b.onclick = () => { document.querySelectorAll(id + " button").forEach(x => x.classList.remove("on")); b.classList.add("on"); cb(b.dataset.v); })); }
  wireSeg("#ddSegStake", v => setStake(+v));
  wireSeg("#ddSegLang", v => { ST.lang = v; document.documentElement.lang = v; cards(); hud(); pillUpdate(); labels(); dataSections(); if (ST.hintKey) hint(ST.hintKey); });
  $("#ddChkReduce").onchange = e => { ST.reduce = e.target.checked; document.documentElement.classList.toggle("reduce-motion", ST.reduce); };
  $("#ddChkSound").onchange = e => { ST.sound = e.target.checked; };
  $("#ddBtnPlay").onclick = play;
  $("#ddSelPres").onchange = e => { ST.forcePres = e.target.value || null; };
  $("#ddSelForce").onchange = e => { ST.forceMode = e.target.value; };
  $("#ddBtnFull").onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else wrap.requestFullscreen && wrap.requestFullscreen(); };
  $("#ddHit").addEventListener("pointerdown", e => { e.preventDefault(); press(); });
  addEventListener("pointerup", release); addEventListener("pointercancel", release); addEventListener("blur", release);
  addEventListener("keydown", e => { if (e.target.matches("input,textarea,select")) return; if (e.key === " " || e.key === "Enter") { if (ST.awaiting) { e.preventDefault(); if (!e.repeat) press(); } else if (!ST.busy && e.target === document.body) { e.preventDefault(); play(); } } else if (!ST.busy && (e.key === "1" || e.key === "2" || e.key === "3")) setStake([2, 5, 10][+e.key - 1]); });
  addEventListener("keyup", e => { if ((e.key === " " || e.key === "Enter") && holding) release(); });

  // pruebas: window.__dados
  window.__dados = { ST, SIDES, play, press, release, decide, reelPick, buildPlan, FORCE, last: null, phase: () => ST.phase, setAuto: (v, hold) => { ST.auto = v; ST.autoHold = hold; }, force: m => { ST.forceMode = m; $("#ddSelForce").value = m; }, dpres: id => { ST.forceDealerPres = id; }, pres: id => { ST.forcePres = id; $("#ddSelPres").value = id || ""; } };
  cards(); fit(); hud(); labels(); pillUpdate(); resetScene(); hint("start"); dataSections(); requestAnimationFrame(frame);
})();
