/*
 * Geolite - DUELO DE FICHAS (prototipo local: fase 1 del modo 1 vs 1). Sin red, sin Steam y sin servidor: se juega contra un rival simulado
 * para juzgar si el formato divierte y para comprobar unas cifras que salieron de una simulacion con un jugador inventado.
 *  - Los dos reciben la misma pregunta a la vez. Puntos de la ronda = solo precision: round(1000 * e^(-km / (1500 * kf))), con el factor kf por tipo
 *    de lugar de la Aventura (A.adv.kf). Sin racha, sin perks y sin puntos de rapidez.
 *  - Quien puntua menos le paga al otro (diferencia de puntos x multiplicador de la ronda). Quien se queda sin fichas, pierde. Al llegar al tope de
 *    rondas gana quien tenga mas fichas y, si empatan, se juegan rondas extra hasta deshacer el empate.
 *  - Cuando uno fija su respuesta, al otro le quedan como mucho CFG.lockRush segundos.
 *  - La pregunta de cada ronda se sortea entre las de A.QDIFF (data/dificultad.js) por una escalera de dificultad segun la mesa, con semilla
 *    (A.rng de js/rank.js): con la misma semilla sale el mismo duelo (mismas preguntas y mismas respuestas del rival).
 * TODAS las cifras estan en CFG, aqui debajo. No guarda nada: ni perfil, ni logros, ni Enciclopedia, ni clasificacion.
 * Entrada oculta para desarrollo: localStorage "atlasiq.duelo" = "1" anade el boton a la portada (o A.duelo.open() desde la consola).
 * Enganches fuera de este fichero: js/game.js (S.duel en updateHud, showTitle, reveal y la pausa) y A.adv.kf en js/adventure.js.
 * Textos solo en es/en mientras sea prototipo: antes de publicarlo hay que pasarlos a los 12 idiomas.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id), C = () => A.core, T = (es, en) => A.T(es, en);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), pad2 = n => String(n).padStart(2, "0");

  /* ------------------------------------------------------------------ LAS CIFRAS DEL DUELO (todas aqui) */
  const CFG = {
    stack: 2500,                                   // fichas con las que empieza cada jugador
    scale: 1500,                                   // km: puntos = round(1000 * e^(-km / (scale * kf)))
    rounds: 12,                                    // tope de rondas; despues solo hay rondas extra si las pilas estan empatadas
    mult: { from: 4, step: 0.5 },                  // x1 hasta la ronda anterior a "from"; desde ella, +step por ronda (x1,5 en la 4.a ... x5,5 en la 12.a)
    clock: [[1, 15], [5, 12], [9, 10]],            // segundos por pregunta: [desde la ronda, segundos]
    lockRush: 5,                                   // cuando uno fija su respuesta, al otro le quedan como mucho estos segundos
    revealSecs: 8,                                 // lo que dura el revelado antes de pasar solo a la siguiente ronda (0 = espera a que pulses Siguiente)
    introSecs: 2.6, gapSecs: 0.1,                  // intro del duelo y paso de una ronda a otra (gapSecs solo cuenta para estimar la duracion en A.duelo.sim)
    /* mesas: el centro de la escalera de dificultad (0-100 de A.QDIFF) y, salvo que se cambie, el nivel del rival */
    tables: [
      { id: "baja", center: 28, chip: "chip_g", n: { es: "Mesa baja", en: "Low table" } },
      { id: "media", center: 48, chip: "chip_o", n: { es: "Mesa media", en: "Middle table" } },
      { id: "alta", center: 68, chip: "chip_k", n: { es: "Mesa alta", en: "High table" } },
    ],
    /* escalera: la ronda k busca dificultad centro - down + (down + up) * min(1, (k - 1) / steps), con un margen de +-band, acotada a min..max */
    ladder: { down: 22, up: 22, steps: 9, band: 5, min: 5, max: 88 },
    /* rival simulado de nivel t ante una pregunta de dificultad d:
       sabe el lugar con probabilidad logistica((t - d) / know.k): falla know.km de mediana (lognormal, sigma know.s);
       si no, conoce la zona con probabilidad logistica((t - d + zone.off) / zone.k); si no, va perdido. t: [min, max] segundos que tarda en fijar */
    bot: {
      know: { k: 12, km: 180, s: 0.8, t: [4, 7] },
      zone: { off: 25, k: 12, km: 900, s: 0.5, t: [5.5, 9] },
      lost: { km: 4500, s: 0.6, t: [7.5, 11] },
    },
  };
  const NAME = () => T("Duelo de fichas", "Chip duel"), ME = () => T("Tú", "You"), RIVAL = () => T("Rival", "Rival");
  const fmtM = m => (Number.isInteger(m) ? String(m) : A.fmt1(m));
  const multOf = k => (k < CFG.mult.from ? 1 : 1 + CFG.mult.step * (k - CFG.mult.from + 1));
  const secsOf = k => { let s = CFG.clock[0][1]; for (const [from, v] of CFG.clock) if (k >= from) s = v; return s; };
  const targetOf = (center, k) => { const L = CFG.ladder; return clamp(center - L.down + (L.down + L.up) * Math.min(1, (k - 1) / L.steps), L.min, L.max); };
  const roundTxt = k => `${T("Ronda", "Round")} ${pad2(k)} / ${pad2(Math.max(CFG.rounds, k))}`;
  const newSeed = () => { const AB = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; let s = ""; for (let i = 0; i < 6; i++) s += AB[Math.floor(Math.random() * AB.length)]; return s.slice(0, 3) + "-" + s.slice(3); };

  /* ------------------------------------------------------------------ banco de preguntas (las de A.QDIFF que existen en el banco de la Aventura) */
  let POOL = null; const REF = {};
  const big = f => f.polys.reduce((a, b) => ((b.bbox[2] - b.bbox[0]) * (b.bbox[3] - b.bbox[1]) > (a.bbox[2] - a.bbox[0]) * (a.bbox[3] - a.bbox[1]) ? b : a));
  /* punto de referencia de la pregunta [lat, lon] (continente y punteria del rival): el lugar; en un pais, el centro de su trozo mas grande o,
     si cae fuera (paises alargados o en arco), el punto de dentro mas cercano a ese centro */
  function refOf(q) {
    if (q.t !== "c") return [q.lat, q.lon];
    if (REF[q.key]) return REF[q.key];
    const f = C().world.byName[q.key], b = big(f).bbox, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2; let best = [cy, cx], bd = Infinity;
    if (!A.geo.inFeature(cx, cy, f)) for (let i = 1; i < 14; i++) for (let j = 1; j < 14; j++) {
      const lo = b[0] + ((b[2] - b[0]) * i) / 14, la = b[1] + ((b[3] - b[1]) * j) / 14, d = (lo - cx) ** 2 + (la - cy) ** 2;
      if (d < bd && A.geo.inFeature(lo, la, f)) { bd = d; best = [la, lo]; }
    }
    return (REF[q.key] = best);
  }
  /* cada entrada: id de A.QDIFF, dificultad, pregunta, key (el lugar que se responde: una bandera y su pais, o una pista y su lugar, no salen en el mismo duelo) y continente */
  function pool() {
    if (POOL) return POOL;
    const all = A.adv._allQ(), out = [];
    for (const id in A.QDIFF) {
      const flag = id.startsWith("flag:"), base = all[flag ? id.slice(5) : id]; if (!base) continue;
      const q = flag ? { ...base, kind: "flag", duelKf: A.adv.kf(base) } : base, [la, lo] = refOf(q);   // la bandera es la pregunta del pais, vista como bandera (puntua como el pais)
      out.push({ id, d: A.QDIFF[id], q, key: q.cid[q.cid.length - 1], cont: A.continent(la, lo) });
    }
    return (POOL = out);
  }
  /* la pregunta de la ronda: dificultad cerca del peldano, sin repetir lugar y sin dos seguidas del mismo continente. Primero se sortea el continente
     (peso = raiz de cuantas hay, para que Europa no salga una ronda si y otra no) y luego la pregunta */
  function drawQ(st) {
    const L = CFG.ladder, tg = targetOf(st.table.center, st.k), P = pool(); let cand = [];
    for (let band = L.band; !cand.length && band <= 40; band += 3) cand = P.filter(e => Math.abs(e.d - tg) <= band && !st.used.has(e.key) && e.cont !== st.lastCont);
    if (!cand.length) cand = P.filter(e => !st.used.has(e.key));
    const by = {}; cand.forEach(e => (by[e.cont] = by[e.cont] || []).push(e));
    const cs = Object.keys(by).sort(), w = cs.map(c => Math.sqrt(by[c].length)); let x = st.rq() * w.reduce((a, b) => a + b, 0), ci = 0;
    while (ci < cs.length - 1 && x >= w[ci]) x -= w[ci++];
    const e = st.rq.pick(by[cs[ci]]); st.used.add(e.key); st.lastCont = e.cont; return e;
  }

  /* ------------------------------------------------------------------ puntuacion (la de verdad: distancia al lugar, al pais o a la masa de agua) */
  const kfOf = q => q.duelKf || A.adv.kf(q);
  const kmOf = (q, lon, lat) => { const af = A.waters && A.waters.of(q); return af ? A.geo.distToFeature(lon, lat, af) : q.t === "c" ? A.geo.distToFeature(lon, lat, C().world.byName[q.key]) : A.geo.haversine(lat, lon, q.lat, q.lon); };
  const ptsOf = (q, km) => (km == null ? 0 : Math.round(1000 * Math.exp(-km / (CFG.scale * kfOf(q)))));

  /* ------------------------------------------------------------------ rival simulado: su clic es un punto real del mapa */
  const logi = x => 1 / (1 + Math.exp(-x)), gauss = r => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const wrap = x => ((((x + 180) % 360) + 360) % 360) - 180;
  function botPlay(r, q, d, lv) {
    const B = CFG.bot, tier = r() < logi((lv - d) / B.know.k) ? "know" : r() < logi((lv - d + B.zone.off) / B.zone.k) ? "zone" : "lost", m = B[tier];
    const aim = Math.min(19000, m.km * Math.exp(m.s * gauss(r))), brg = r() * 2 * Math.PI, [la0, lo0] = refOf(q), R = Math.PI / 180;   // a esa distancia del lugar, con rumbo al azar
    const dd = aim / 6371, la1 = la0 * R, lo1 = lo0 * R, la2 = Math.asin(Math.sin(la1) * Math.cos(dd) + Math.cos(la1) * Math.sin(dd) * Math.cos(brg));
    const lo2 = lo1 + Math.atan2(Math.sin(brg) * Math.sin(dd) * Math.cos(la1), Math.cos(dd) - Math.sin(la1) * Math.sin(la2));
    return { lon: wrap(lo2 / R), lat: clamp(la2 / R, -84, 84), t: m.t[0] + (m.t[1] - m.t[0]) * r(), tier, aim };
  }
  /* cuando fija cada uno de verdad: nadie pasa del reloj y, en cuanto fija el primero, al otro le quedan lockRush segundos */
  const lockTimes = (ta, tb, limit) => { const cap = Math.min(limit, Math.min(ta, tb) + CFG.lockRush); return [Math.min(ta, cap), Math.min(tb, cap)]; };

  /* ------------------------------------------------------------------ el duelo: estado, ronda y pago (lo usan igual la partida y la simulacion) */
  function mkState(o = {}) {
    const table = CFG.tables.find(t => t.id === o.table) || CFG.tables[1], seed = String(o.seed || newSeed());
    return { seed, table, level: o.level == null ? table.center : +o.level, auto: o.auto || null, rq: A.rng(seed + ":q"), rb: A.rng(seed + ":rival"), ra: A.rng(seed + ":auto"),
      me: CFG.stack, rv: CFG.stack, shown: { me: CFG.stack, rv: CFG.stack }, k: 0, used: new Set(), lastCont: null, log: [], cur: null, over: null, phase: "", secs: 0 };
  }
  function nextRound(st) {
    st.k++; const e = drawQ(st);
    return (st.cur = { e, q: e.q, d: e.d, k: st.k, mult: multOf(st.k), secs: secsOf(st.k), bot: botPlay(st.rb, e.q, e.d, st.level), meAns: null, rvLocked: false });
  }
  /* mine / theirs: { lon, lat, t } o null (sin respuesta). Mueve las fichas y decide si el duelo ha terminado */
  function settle(st, mine, theirs) {
    const cur = st.cur, q = cur.q, side = a => { const km = a ? kmOf(q, a.lon, a.lat) : null; return { km, pts: ptsOf(q, km), t: a ? a.t : null, lon: a ? a.lon : null, lat: a ? a.lat : null }; };
    const me = side(mine), rv = side(theirs), diff = me.pts - rv.pts, owed = Math.round(Math.abs(diff) * cur.mult), paid = Math.min(owed, diff > 0 ? st.rv : st.me), pay = diff > 0 ? paid : -paid;
    st.me += pay; st.rv -= pay;
    const rd = { k: cur.k, mult: cur.mult, id: cur.e.id, d: cur.d, q, me, rv, diff, owed, pay, stMe: st.me, stRv: st.rv, tier: cur.bot.tier };
    st.log.push(rd);
    if (st.me <= 0 || st.rv <= 0) st.over = { win: st.rv <= 0, ko: true, rounds: st.k };
    else if (st.k >= CFG.rounds && st.me !== st.rv) st.over = { win: st.me > st.rv, ko: false, rounds: st.k };
    return rd;
  }
  const summary = st => ({ seed: st.seed, table: st.table.id, level: st.level, win: !!(st.over && st.over.win), ko: !!(st.over && st.over.ko), rounds: st.k, me: st.me, rv: st.rv,
    secs: Math.round(st.secs * 10) / 10, wall: st.t0 ? Math.round((performance.now() - st.t0) / 100) / 10 : null,
    log: st.log.map(r => ({ k: r.k, mult: r.mult, id: r.id, d: r.d, me: r.me.pts, meKm: r.me.km == null ? null : Math.round(r.me.km), rv: r.rv.pts, rvKm: Math.round(r.rv.km), tier: r.tier, pay: r.pay, stMe: r.stMe })) });

  const D = A.duelo = { CFG, multOf, secsOf, targetOf, pool, botPlay, kmOf, ptsOf, last: null };
  /* cientos de duelos entre dos rivales simulados con el banco, la puntuacion y las reglas del juego (sin interfaz ni esperas): rondas, KO y duracion.
     la / lb: nivel de cada uno (por defecto, el centro de la mesa). La duracion suma lo que tarda en fijar el ultimo, el revelado y el paso de ronda.
     Con la misma semilla, el duelo i de aqui es el mismo que A.duelo.start({ seed: semilla + ":" + i, auto: {} }) jugado por la interfaz */
  D.sim = (o = {}) => {
    const n = o.n || 300, rows = [];
    for (let i = 0; i < n; i++) {
      const st = mkState({ table: o.table, level: o.lb, seed: (o.seed || "sim") + ":" + i }), la = o.la == null ? st.table.center : o.la; let secs = CFG.introSecs, ask = 0, lead4 = 0;
      while (!st.over && st.k < CFG.rounds + 40) {
        const cur = nextRound(st), a = botPlay(st.ra, cur.q, cur.d, la), [ta, tb] = lockTimes(a.t, cur.bot.t, cur.secs);
        settle(st, { lon: a.lon, lat: a.lat, t: ta }, { lon: cur.bot.lon, lat: cur.bot.lat, t: tb });
        ask += Math.max(ta, tb); secs += Math.max(ta, tb) + CFG.revealSecs + CFG.gapSecs;
        if (st.k === 4) lead4 = Math.sign(st.me - st.rv);
      }
      const win = !!(st.over && st.over.win);
      rows.push({ rounds: st.k, ko: !!(st.over && st.over.ko), win, me: st.me, secs, ask, lead4: lead4 === 0 ? null : (lead4 > 0) === win, log: o.detail ? st.log.map(r => [r.pay, r.stMe, r.id]) : undefined });
    }
    const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }, pct = f => Math.round((1000 * rows.filter(f).length) / n) / 10, R = rows.map(r => r.rounds), Sx = rows.map(r => r.secs);
    const l4 = rows.filter(r => r.lead4 != null);
    return { n, table: o.table || "media", la: o.la, lb: o.lb, rounds: { p10: q(R, 0.1), p50: q(R, 0.5), p90: q(R, 0.9), mean: Math.round((10 * R.reduce((a, b) => a + b, 0)) / n) / 10 },
      ko: pct(r => r.ko), winA: pct(r => r.win), extra: pct(r => r.rounds > CFG.rounds), secs: { p10: Math.round(q(Sx, 0.1)), p50: Math.round(q(Sx, 0.5)), p90: Math.round(q(Sx, 0.9)) },
      askPerRound: Math.round((10 * rows.reduce((a, r) => a + r.ask, 0)) / R.reduce((a, b) => a + b, 0)) / 10, lead4wins: l4.length ? Math.round((1000 * l4.filter(r => r.lead4).length) / l4.length) / 10 : null,
      hist: R.reduce((h, x) => ((h[x] = (h[x] || 0) + 1), h), {}), rows: o.detail ? rows : undefined };
  };

  /* ================================================================== LA PARTIDA (interfaz) */
  let st = null, raf = 0, timers = [];
  const later = (fn, ms) => { const s = st, id = setTimeout(() => { if (s && st === s) fn(); }, ms); timers.push(id); return id; };
  const elapsed = () => { const S = C().S; return ((S.paused ? S.pauseAt : performance.now()) - st.cur.t0 - S.pausedAcc) / 1000; };   // segundos de esta pregunta, sin contar la pausa
  const veiled = () => { const v = $("veil"); return C().S.settingsOpen || (v && !v.classList.contains("hidden")); };

  /* ---------------- marcador: las dos pilas, el multiplicador y quien ha fijado ya (va dentro del marcador de siempre, #ledger) */
  function mountBoard() {
    let b = $("duBoard"); if (b) return b;
    b = document.createElement("div"); b.id = "duBoard"; b.className = "du-board";
    b.innerHTML = `<div class="du-top"><span id="duRd"></span></div>
      <div class="du-stacks">
        <div class="du-st me" id="duStMe"><span class="du-who">${ME()}</span><div class="du-n">${A.icon("chip_b", "du-chip")}<b class="odo" id="duMe"></b></div><em class="du-lamp" id="duLampMe"></em></div>
        <b class="du-mult" id="duMult" ${A.ttAttr(T("Multiplicador de la ronda", "Round multiplier"), T("La diferencia de puntos se paga por este número.", "The point difference is paid times this number."))}></b>
        <div class="du-st rv" id="duStRv"><span class="du-who">${RIVAL()}</span><div class="du-n"><b class="odo" id="duRv"></b>${A.icon("chip_r", "du-chip")}</div><em class="du-lamp" id="duLampRv"></em></div>
      </div>
      <div class="du-bal"><i id="duBal"></i></div>`;
    $("ledger").appendChild(b); return b;
  }
  function paintBoard(roll) {
    if (!st) return; mountBoard(); const k = Math.max(1, st.k), sh = st.shown, mEl = $("duMult"), mt = "×" + fmtM(multOf(k));
    $("duRd").textContent = roundTxt(k); $("duStMe").firstElementChild.textContent = ME(); $("duStRv").firstElementChild.textContent = RIVAL();
    if (mEl.textContent !== mt) { const up = !!mEl.textContent; mEl.textContent = mt; if (up) { mEl.classList.remove("pop"); A.restyle(mEl); mEl.classList.add("pop"); } }
    C().odoSet($("duMe"), sh.me, roll ? { ms: 900 } : { instant: true }); C().odoSet($("duRv"), sh.rv, roll ? { ms: 900 } : { instant: true });
    $("duBal").style.width = ((100 * sh.me) / Math.max(1, sh.me + sh.rv)).toFixed(2) + "%";
  }
  /* la lucecita de cada jugador: pensando, fijada o, en el revelado, las fichas que gana o pierde */
  function lamp(who, state, txt) { const el = $(who === "me" ? "duLampMe" : "duLampRv"); if (!el) return; el.dataset.s = state; el.textContent = txt; }
  function lamps() {
    const cur = st.cur; if (!cur || st.phase !== "ask") return;
    lamp("me", cur.meAns ? "lock" : "think", cur.meAns ? T("Fijada", "Locked in") : T("Te toca", "Your move"));
    lamp("rv", cur.rvLocked ? "lock" : "think", cur.rvLocked ? T("Fijada", "Locked in") : T("Pensando…", "Thinking…"));
  }
  /* aviso bajo la placa (el rival ya ha fijado / tu respuesta esta fijada) */
  function flash(kind, big, small) {
    document.querySelectorAll(".du-flash").forEach(e => e.remove()); if (!big) return;
    const el = document.createElement("div"); el.className = "du-flash " + kind; el.innerHTML = `<b>${big}</b><span>${small || ""}</span>`; ($("leftCol") || $("app")).appendChild(el);
  }
  /* lo que pinta el juego en su marcador (js/game.js, updateHud): aqui, la ronda, las muescas y las pilas */
  D.hud = () => {
    if (!st) return; const k = Math.max(1, st.k), n = Math.max(CFG.rounds, k), pips = $("pips"), ph = C().S.phase;
    $("lvlText").textContent = `${NAME()} · ${A.tx(st.table.n)}`;
    $("askNo").textContent = roundTxt(k);
    pips.innerHTML = ""; for (let i = 1; i <= n; i++) { const p = document.createElement("i"); p.className = i < k || (i === k && ph === "reveal") ? "done" : i === k ? "cur" : ""; pips.appendChild(p); }
    paintBoard(); lamps();
  };
  /* la pausa del juego (js/game.js, veilMenu): nombre del modo, nota y las dos pilas */
  D.pause = () => ({ mode: T("Prototipo", "Prototype"),
    note: T("Prototipo contra un rival simulado: aquí la pausa detiene el reloj. En un duelo de verdad no habrá pausa.", "Prototype against a simulated rival: here the pause stops the clock. A real duel won't have one."),
    rows: `<div class="gx-lead-row"><span>${T("Tus fichas", "Your chips")}</span><s></s><b>${A.fmt(st.me)}</b></div><div class="gx-lead-row"><span>${T("Fichas del rival", "Rival's chips")}</span><s></s><b>${A.fmt(st.rv)}</b></div><div class="gx-lead-row"><span>${T("Nivel del rival", "Rival's level")}</span><s></s><b>${st.level}</b></div>` });

  /* ---------------- empezar: o = { table, level, seed, auto } (auto: { level, next }: tu sitio lo ocupa otro rival simulado, para pruebas) */
  D.start = (o = {}) => {
    const c = C(), S = c.S; if (S.duel) D.leave();
    c.openSettings(false); A.audio.unlock(); pool(); if (A.coverMap) A.coverMap("duelo", false);
    st = S.duel = mkState(o);
    S.run = null; S.tool = null; S.ranked = null; S.level = 0; S.qs = []; S.qi = 0; S.levelScore = 0; S.runTotal = 0; S.streak = 0; S.hits = 0; S.log = null;
    S.camp = { id: "duelo", mode: "duel", title: { es: "Duelo de fichas", en: "Chip duel" }, home: { lat: 0, lon: 0, zoom: 1 }, levels: [{ kind: "city", seconds: secsOf(1), advance: 0, maxPerQ: 1000, name: st.table.n }] };
    document.body.classList.remove("title-on"); document.body.classList.add("duelo-on");
    c.closeDialog(); $("plate").classList.add("hidden"); $("pauseBtn").classList.add("hidden"); $("streakChip").classList.add("hidden"); $("factText").textContent = "";
    c.map.setHome(S.camp.home); c.map.clearMarks(); c.map.setDecoys([]); c.chrome(true); mountBoard(); D.hud(); lamp("me", "", ""); lamp("rv", "", "");
    A.music.mode(1);
    if (!raf) raf = requestAnimationFrame(tick);
    intro(ask);
    return st.seed;
  };
  function intro(cb) {
    const c = C(), S = c.S, el = $("intro"), s = st, L = CFG.ladder, tb = st.table; S.phase = "intro";
    el.className = ""; el.innerHTML = `<div class="intro-in"><div class="intro-num">VS</div><div class="intro-body"><span class="tag">${NAME()}</span><h2>${A.tx(tb.n)}</h2>
      <p>${A.fmt(CFG.stack)} ${T("fichas", "chips")} · ${CFG.rounds} ${T("rondas", "rounds")} · ${T("dificultad", "difficulty")} ${targetOf(tb.center, 1)} → ${targetOf(tb.center, L.steps + 1)} · ${RIVAL()} ${T("nivel", "level")} ${st.level}</p></div></div>`;
    A.sfx.intro(); c.map.animateTo(c.map.home(), 1100);
    let done = false; const end = () => { if (done || st !== s) return; done = true; el.onclick = null; el.classList.add("out"); setTimeout(() => { if (st !== s) return; el.classList.add("hidden"); cb(); }, 430); };
    S.skipIntro = end; el.onclick = end; later(end, CFG.introSecs * 1000);
  }

  /* ---------------- la pregunta: la misma para los dos, con el reloj y la placa del juego */
  function ask() {
    const c = C(), S = c.S, cur = nextRound(st); st.phase = "ask"; st.shown = { me: st.me, rv: st.rv };
    if (!st.t0) st.t0 = performance.now();
    S.qs.push(cur.q); S.qi = st.k - 1; S.camp.levels[0].seconds = cur.secs; S.camp.levels[0].kind = cur.q.kind || "city";
    flash(); c.map.setDecoys([]); c.nextQuestion();                         // placa, reloj, mapa listo para el clic y D.hud()
    cur.t0 = performance.now(); cur.rvAt = Math.min(cur.bot.t, cur.secs - 0.4);
    if (st.auto) { cur.auto = botPlay(st.ra, cur.q, cur.d, st.auto.level == null ? st.table.center : st.auto.level); cur.autoAt = Math.min(cur.auto.t, cur.secs - 0.4); }
  }
  /* cuando uno fija, al otro le quedan como mucho lockRush segundos: el reloj de la placa salta a ese tiempo */
  function rush() { const S = C().S, left = S.limit - (performance.now() - S.t0 - S.pausedAcc) / 1000; if (left > CFG.lockRush) S.t0 -= (left - CFG.lockRush) * 1000; }
  function rivalLock() {
    const cur = st.cur; cur.rvLocked = true; cur.rvT = elapsed(); lamps(); A.sfx.knock();
    if (cur.meAns) return resolve();
    rush(); if (cur.auto) cur.autoAt = Math.min(cur.autoAt, cur.rvT + CFG.lockRush - 0.3);
    flash("rv", T("El rival ya ha fijado", "Your rival has locked in"), T(`Te quedan ${CFG.lockRush} s`, `You have ${CFG.lockRush} s left`));
  }
  /* tu respuesta (js/game.js, reveal): guess = { lon, lat }, o null si se acabo el tiempo. Se queda fijada y el revelado espera al rival */
  D.answer = guess => {
    const cur = st && st.cur; if (!cur || st.phase !== "ask") return;
    if (!guess) return resolve();
    if (cur.meAns) return;
    cur.meAns = { lon: guess.lon, lat: guess.lat, t: elapsed() };
    C().map.setPick(false); C().map.setMarks({ guess: [guess.lon, guess.lat] }); lamps();   // tu chincheta se queda clavada mientras el rival piensa
    if (cur.rvLocked) return resolve();
    cur.rvAt = Math.min(cur.rvAt, cur.meAns.t + CFG.lockRush - 0.3); rush();
    flash("me", T("Respuesta fijada", "Answer locked in"), T(`El rival tiene ${CFG.lockRush} s como mucho`, `Your rival has ${CFG.lockRush} s at most`));
  };
  function tick() {
    raf = st ? requestAnimationFrame(tick) : 0; if (!st) return;
    const c = C(), S = c.S, cur = st.cur; if (st.phase !== "ask" || !cur || !cur.t0 || S.phase !== "asking" || S.paused) return;
    const el = elapsed();
    if (cur.meAns && c.map.pickEnabled) c.map.setPick(false);              // volver de la pausa no reabre una respuesta ya fijada
    if (!cur.rvLocked && el >= cur.rvAt) return rivalLock();
    if (cur.auto && !cur.meAns && el >= cur.autoAt) c.map.onPick(cur.auto.lon, cur.auto.lat);
  }

  /* ---------------- el revelado: las dos chinchetas, los puntos de cada uno y las fichas que cambian de mano */
  function resolve() {
    const c = C(), S = c.S, map = c.map, cur = st.cur, q = cur.q; if (st.phase !== "ask") return;
    const tEnd = elapsed(); st.secs += tEnd;
    st.phase = "reveal"; S.phase = "reveal"; S.tense = false; map.setPick(false); A.music.mode(1); $("plate").classList.remove("hurry"); flash();
    if (!cur.rvLocked) { cur.rvLocked = true; cur.rvT = Math.min(cur.rvAt, tEnd); }
    const rd = settle(st, cur.meAns, { lon: cur.bot.lon, lat: cur.bot.lat, t: cur.rvT }), me = rd.me, rv = rd.rv, g = cur.meAns;
    /* el objetivo, como en el revelado de siempre: el lugar, el pais resaltado o la masa de agua */
    const af = A.waters && A.waters.of(q), isC = q.t === "c" || !!af, fC = isC && !af ? c.world.byName[q.key] : null; let ans = null, span, labelAt = null;
    if (af) { span = [[af.bbox[0], af.bbox[1]], [af.bbox[2], af.bbox[3]]]; labelAt = [q.lon, q.lat]; }
    else if (isC) { const b = big(fC).bbox; span = [[b[0], b[1]], [b[2], b[3]]]; labelAt = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; }
    else { ans = [q.lon, q.lat]; span = [ans]; }
    const refLon = ans ? ans[0] : labelAt[0], near = lon => lon + 360 * Math.round((refLon - lon) / 360), gLon = g ? near(g.lon) : null, rLon = near(rv.lon);   // por el camino corto (antimeridiano)
    const label = q.clue ? A.tx(q.answer) : A.tx(q.name), onMap = q.clue || q.kind === "flag" ? label : null, kmTxt = s => (s.km > 0 ? A.fmtDist(s.km) : T("dentro", "inside"));
    map.setMarks({ guess: g ? [gLon, g.lat] : null, answer: ans, highlight: fC ? q.key : null, area: af || null, label: onMap, labelAt, dist: g && me.km > 0 ? A.fmtDist(me.km) : "", pop: me.pts ? "+" + A.fmt(me.pts) : null, flags: null, rings: null });
    map.setDecoys([{ lon: rLon, lat: rv.lat, bank: rv.pts, bankLabel: `${RIVAL()} · ${kmTxt(rv)} · +${A.fmt(rv.pts)}`.toUpperCase(), t0: performance.now() + 900, a: 1 }]);   // la chincheta del rival cae despues de la tuya
    const fpts = (isC ? span.map(p => [p[0], p[1], fC && fC.ct]) : [[ans[0], ans[1]]]).concat(g ? [[gLon, g.lat, map.pickCt]] : [], [[rLon, rv.lat]]);
    const tier = !g ? 5 : me.km <= 75 ? 4 : me.km <= 150 ? 3 : me.km <= 300 ? 2 : me.km <= 600 ? 1 : 0, tok = st.k;
    const live = () => st && st.k === tok && st.phase === "reveal";
    later(() => { if (live()) A.sfx.reveal(tier); }, 480);
    later(() => { if (live() && A.sfx.bankPin) A.sfx.bankPin(); }, 1500);

    const win = rd.pay > 0, lose = rd.pay < 0, over = st.over, sub = isC || q.clue ? "" : A.tx(q.sub) || "";
    const col = (cls, who, s, id) => `<div class="du-col ${cls}"><span>${who}</span><b class="odo" id="${id}"></b><i>${s.km == null ? T("Sin respuesta", "No answer") : `${kmTxt(s)} · ${A.fmt1(s.t)} s`}</i></div>`;
    const html = `<div class="sheet ticket tk2 du-tk${win ? " du-w" : lose ? " du-l" : ""}">
      <div class="tk-band"><span>${roundTxt(rd.k)}</span><span class="tag">${A.t("kind." + (q.clue ? "clue" : q.kind))}</span></div>
      <div class="tk-head nf"><div class="tk-id"><div class="tk-title">${win ? T("Ronda ganada", "Round won") : lose ? T("Ronda perdida", "Round lost") : T("Empate", "Tie")}</div>
        <div class="tk-place">${q.clue ? `<span>${A.t("res.was")}</span>` : ""}<b>${label}</b>${sub ? `<em>${sub}</em>` : ""}</div></div></div>
      <div class="du-vs">${col("me", ME(), me, "duPm")}<i class="du-x">vs</i>${col("rv", RIVAL(), rv, "duPr")}</div>
      <div class="tk-perf"></div>
      <dl class="tk-rows">
        <div style="--i:0"><dt>${T("Diferencia", "Difference")}</dt><i></i><dd>${A.fmt(Math.abs(rd.diff))}</dd></div>
        <div style="--i:1"><dt>${T("Multiplicador", "Multiplier")}</dt><i></i><dd>×${fmtM(rd.mult)}</dd></div>
        ${Math.abs(rd.pay) < rd.owed ? `<div style="--i:2" class="bonus"><dt>${T("Sin más fichas", "No chips left")}</dt><i></i><dd>${A.fmt(rd.owed)}</dd></div>` : ""}
      </dl>
      <div class="tk-total"><span>${win ? T("Cobras", "You collect") : lose ? T("Pagas", "You pay") : T("Fichas", "Chips")}</span><span class="odo" id="totNum"></span></div>
      <button class="btn-ink" id="nextBtn" data-primary><span>${over ? T("Ver el resultado", "See the result") : T("Siguiente ronda", "Next round")}</span><span class="ar">${A.icon("u_next", "sm")}</span> <kbd class="k-kb">${A.icon("u_enter", "sm")}</kbd><i class="gl" data-gl="a"></i>${CFG.revealSecs ? `<u class="du-auto" style="--du-s:${CFG.revealSecs}s"></u>` : ""}</button>
    </div>`;
    $("factText").textContent = c.factLine(q);
    requestAnimationFrame(() => {
      if (!live()) return;
      c.dialog(html, "side"); D.hud();
      for (const [id, v, dl] of [["duPm", me.pts, 500], ["duPr", rv.pts, 1500], ["totNum", Math.abs(rd.pay), 1900]]) { const el = $(id); c.odoSet(el, 0, { instant: true }); requestAnimationFrame(() => c.odoSet(el, v, { ms: 700, delay: dl, tick: id === "totNum" && v > 0 })); }
      const go = () => { if (!live()) return; if (st.over) finish(); else ask(); };
      $("nextBtn").onclick = go;
      const wait = st.auto && st.auto.next != null ? st.auto.next : CFG.revealSecs * 1000;
      if (wait) { const auto = () => { if (!live()) return; if (veiled()) return later(auto, 400); go(); }; later(auto, wait); }   // con el menu o Ajustes delante, espera
      later(() => { if (live()) payFx(rd); }, 2500);
      requestAnimationFrame(() => {
        if (!live()) return;
        if (map.frameReveal) map.frameReveal(fpts, c.revealObs(), { l: 70, r: 70, t: 86, b: 34 }, 1100); else map.fitPoints(fpts.map(p => [p[0], p[1]]), undefined, 1100);
      });
    });
  }
  /* las fichas pasan de una pila a la otra (del que paga al que cobra) y las cifras ruedan */
  function payFx(rd) {
    const n = rd.pay, sgn = v => (v > 0 ? "+" : "−") + A.fmt(Math.abs(v));
    lamp("me", n > 0 ? "win" : n < 0 ? "lose" : "", n ? sgn(n) : "="); lamp("rv", n < 0 ? "win" : n > 0 ? "lose" : "", n ? sgn(-n) : "=");
    const land = () => { st.shown = { me: st.me, rv: st.rv }; paintBoard(true); };
    if (!n) return land();
    const from = $(n > 0 ? "duStRv" : "duStMe").querySelector(".du-chip"), to = $(n > 0 ? "duStMe" : "duStRv").querySelector(".du-chip"), app = $("app");
    if (C().S.reduce || !from || !to || !from.animate) { A.sfx.chip(0.5); return land(); }
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect(), ar = app.getBoundingClientRect(), cnt = clamp(Math.round(Math.abs(n) / 140) + 2, 3, 12), dx = b.left - a.left, dy = b.top - a.top;
    for (let i = 0; i < cnt; i++) later(() => {
      const el = document.createElement("div"), up = 26 + Math.random() * 34; el.className = "du-fly"; el.innerHTML = A.icon(n > 0 ? "chip_r" : "chip_b");
      el.style.left = Math.round(a.left + a.width / 2 - ar.left) + "px"; el.style.top = Math.round(a.top + a.height / 2 - ar.top) + "px"; app.appendChild(el);
      el.animate([{ transform: "translate(-50%, -50%)" }, { transform: `translate(calc(-50% + ${dx / 2}px), calc(-50% + ${dy / 2 - up}px))`, offset: 0.5 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))` }],
        { duration: 420, easing: "cubic-bezier(.3, .1, .5, 1)" }).onfinish = () => { el.remove(); A.sfx.chip(i / cnt); };
      setTimeout(() => el.remove(), 800);
    }, i * 70);
    later(land, 260);
  }

  /* ---------------- final: quien gana, como, y el resumen ronda a ronda */
  function finish() {
    const c = C(), S = c.S, map = c.map, o = st.over, tb = st.table, s = st; st.phase = "end"; S.phase = "levelEnd";
    map.clearMarks(); map.setDecoys([]); map.animateTo(map.home(), 900); map.setPick(false);
    $("plate").classList.add("hidden"); $("pauseBtn").classList.add("hidden"); $("factText").textContent = ""; document.querySelectorAll(".du-fly").forEach(e => e.remove());
    const sum = (D.last = summary(st)), mins = Math.floor(sum.wall / 60), ss = Math.round(sum.wall - mins * 60), time = (mins ? mins + " min " : "") + ss + " s";
    A.sfx.stamp(); setTimeout(o.win ? A.sfx.victory : A.sfx.fail, 380);
    const how = o.ko ? (o.win ? T(`Has dejado al rival sin fichas en la ronda ${o.rounds}.`, `You cleaned your rival out in round ${o.rounds}.`) : T(`Te has quedado sin fichas en la ronda ${o.rounds}.`, `You ran out of chips in round ${o.rounds}.`))
      : (o.rounds > CFG.rounds ? T(`Empate al tope: se ha decidido en la ronda extra ${o.rounds}.`, `Tied at the cap: settled in extra round ${o.rounds}.`) : T(`Tope de ${CFG.rounds} rondas: gana quien tiene más fichas.`, `${CFG.rounds}-round cap: whoever holds more chips wins.`));
    const sgn = v => (v > 0 ? "+" : v < 0 ? "−" : "") + A.fmt(Math.abs(v)), cell = x => (x.km == null ? "—" : A.fmt(x.pts));
    let d = 0; const dl = () => `style="--d:${(0.5 + 0.06 * d++).toFixed(2)}s"`;
    const rows = st.log.map(r => `<div class="du-row gx-vd-in${r.pay > 0 ? " w" : r.pay < 0 ? " l" : ""}" ${dl()}><span class="n">${pad2(r.k)}</span><span class="x">×${fmtM(r.mult)}</span><span class="p">${r.q.kind === "flag" ? T("Bandera: ", "Flag: ") : ""}${r.q.clue ? A.tx(r.q.answer) : A.tx(r.q.name)}</span><span>${cell(r.me)}</span><span>${cell(r.rv)}</span><b>${sgn(r.pay)}</b><span class="s">${A.fmt(r.stMe)}</span></div>`).join("");
    c.dialog(`<div class="vd gx-vd gx-layer gx-in du-end${o.win ? "" : " lose"}">
      <div class="gx-vd-head gx-from-left"><span class="gx-eyb">${NAME()} · ${A.tx(tb.n)}</span><h2 class="gx-t-xl">${o.win ? T("Duelo ganado", "Duel won") : T("Duelo perdido", "Duel lost")}</h2><p class="gx-lead">${how}</p>
        <div class="du-fin gx-paper"><div class="gx-lead-row big"><span>${A.icon("chip_b", "sm")}${T("Tus fichas", "Your chips")}</span><s></s><b class="odo" id="duFm"></b></div><div class="gx-lead-row"><span>${A.icon("chip_r", "sm")}${T("Fichas del rival", "Rival's chips")}</span><s></s><b class="odo" id="duFr"></b></div>
          <div class="gx-hr"></div><div class="gx-lead-row"><span>${T("Rondas jugadas", "Rounds played")}</span><s></s><b>${o.rounds}</b></div><div class="gx-lead-row"><span>${T("Duración", "Length")}</span><s></s><b>${time}</b></div></div>${A.bulbs()}</div>
      <div class="gx-vd-mid gx-sh"><div class="gx-vd-ticket gx-paper"><div class="gx-vd-th"><span class="gx-eyb">${T("Ronda a ronda", "Round by round")}</span><span class="gx-note">${T("Semilla", "Seed")} ${st.seed} · ${RIVAL()} ${T("nivel", "level")} ${st.level}</span></div>
        <div class="du-tab"><div class="du-row hd"><span class="n">N.º</span><span class="x">×</span><span class="p">${T("Lugar", "Place")}</span><span>${ME()}</span><span>${RIVAL()}</span><b>${T("Fichas", "Chips")}</b><span class="s">${T("Tu pila", "Stack")}</span></div>${rows}</div>
        <b class="gx-vd-stamp${o.win ? "" : " no"}">${o.ko ? "K.O." : T("A los puntos", "On points")}</b></div></div>
      <div class="gx-vd-acts"><div class="gx-acts"><button class="gx-btn gho sm" id="duExit"><span>${T("Salir", "Exit")}</span></button><button class="gx-btn gho sm" id="duTables"><span>${T("Cambiar de mesa", "Change table")}</span></button><button class="gx-btn gho sm" id="duAgain"><span>${T("Repetir este duelo", "Replay this duel")}</span></button></div>
        <div class="gx-acts"><span class="gx-mq"><button class="gx-btn pri" id="duRematch" data-primary><span>${T("Revancha", "Rematch")}</span>${A.gala.keyHint("Enter", "a")}</button>${A.bulbs()}</span></div></div>
    </div>`, "verdict");
    for (const [id, v] of [["duFm", st.me], ["duFr", st.rv]]) { const el = $(id); c.odoSet(el, 0, { instant: true }); requestAnimationFrame(() => c.odoSet(el, v, { ms: 1200, delay: 700, tick: id === "duFm" && v > 0 })); }
    const again = seed => () => D.start({ table: tb.id, level: s.level, seed, auto: s.auto });
    $("duRematch").onclick = again(null); $("duAgain").onclick = again(s.seed);
    $("duExit").onclick = () => c.showHub("home"); $("duTables").onclick = () => { c.showHub("home"); D.open(); };
    if (st.auto && st.auto.done) st.auto.done(sum);
  }
  /* salir del duelo (lo llama js/game.js al volver a la portada, y D.start antes de empezar otro) */
  D.leave = () => {
    const c = C(); timers.forEach(clearTimeout); timers = []; flash(); document.querySelectorAll(".du-fly").forEach(e => e.remove());
    const b = $("duBoard"); if (b) b.remove();
    document.body.classList.remove("duelo-on"); if (c) { c.map.setDecoys([]); c.S.duel = null; } st = null;
  };

  /* ================================================================== ELEGIR MESA (pantalla de antes del duelo) */
  const sel = { table: "media", level: null, seed: "" };
  const lvOf = () => (sel.level == null ? CFG.tables.find(t => t.id === sel.table).center : sel.level);
  /* la ficha de la mesa elegida se monta una vez y luego solo cambian sus datos: el boton de jugar es siempre el mismo (el cursor del mando no salta) */
  function ficha() {
    const cl = CFG.clock.map(x => x[1] + " s").join(" → "), row = (a, b) => `<div class="gx-lead-row"><span>${a}</span><s></s><b>${b}</b></div>`;
    return `<div class="du-ft"><span class="du-fic" id="duFic"></span><h3 class="gx-t-m" id="duFn"></h3></div>
      <p class="gx-note" id="duFd"></p>
      <div class="du-rules">${row(T("Fichas de cada uno", "Chips each"), A.fmt(CFG.stack))}${row(T("Rondas", "Rounds"), CFG.rounds)}${row(T("Multiplicador", "Multiplier"), `×1 → ×${fmtM(multOf(CFG.rounds))}`)}${row(T("Reloj", "Clock"), cl)}${row(T("Si uno fija, al otro le quedan", "Once one locks in, the other has"), CFG.lockRush + " s")}</div>
      <p class="gx-note">${T("Puntúa solo la precisión. Quien puntúa menos paga la diferencia por el multiplicador de la ronda. Sin fichas, pierdes.", "Only accuracy scores. Whoever scores less pays the difference times the round's multiplier. Out of chips, you lose.")}</p>
      <div class="du-opt"><span class="gx-eyb">${T("Nivel del rival", "Rival's level")}</span><div class="du-step"><span class="gx-acts"><button type="button" class="gx-btn sm" id="duLvDn" aria-label="-">−</button></span><b id="duLv"></b><span class="gx-acts"><button type="button" class="gx-btn sm" id="duLvUp" aria-label="+">+</button></span></div></div>
      <div class="du-opt"><span class="gx-eyb">${T("Semilla", "Seed")}</span><div class="du-step"><b class="sd" id="duSeed"></b><span class="gx-acts"><button type="button" class="gx-btn sm" id="duSeedNew">${T("Otra", "New")}</button></span></div></div>
      <div class="du-go gx-acts"><button type="button" class="gx-btn pri" id="duGo" data-primary><span>${T("Jugar el duelo", "Play the duel")}</span>${A.gala.keyHint("Enter", "a")}</button></div>`;
  }
  function paintFicha() {
    const tb = CFG.tables.find(t => t.id === sel.table), L = CFG.ladder, a = targetOf(tb.center, 1), b = targetOf(tb.center, L.steps + 1);
    if ($("duFic").dataset.t !== tb.id) { $("duFic").dataset.t = tb.id; $("duFic").innerHTML = A.icon(tb.chip); }
    $("duFn").textContent = A.tx(tb.n); $("duLv").textContent = lvOf(); $("duSeed").textContent = sel.seed;
    $("duFd").textContent = T(`La dificultad de las preguntas sube ronda a ronda, de ${a} a ${b} sobre 100.`, `Question difficulty climbs round by round, from ${a} to ${b} out of 100.`);
  }
  D.open = () => {
    const c = C(), S = c.S; if (S.booting || S.phase !== "title") return;
    pool(); S.hub = "duelo"; if (!sel.seed) sel.seed = newSeed();          // S.hub: Esc vuelve a la portada (js/game.js)
    const L = CFG.ladder, cards = CFG.tables.map(t => `<button type="button" class="du-mesa${t.id === sel.table ? " sel" : ""}" data-t="${t.id}" aria-pressed="${t.id === sel.table}"><span class="du-mic">${A.icon(t.chip)}</span><b>${A.tx(t.n)}</b><i>${T("Dificultad", "Difficulty")} ${targetOf(t.center, 1)} → ${targetOf(t.center, L.steps + 1)}</i></button>`).join("");
    c.dialog(`<div class="gx-veil"></div><section class="du-screen gx-stage" aria-labelledby="duH" data-nosq><div class="gx-grid du-grid">
      <header class="du-head"><button type="button" class="gx-btn sm" id="hubBack">${A.icon("u_back")}<span>${A.t("set.close")}</span>${A.gala.keyHint("Esc", "b")}</button><h2 class="gx-t-l" id="duH">${NAME()}</h2><span class="gx-eyb">${T("Prototipo · uno contra uno, contra un rival simulado", "Prototype · one on one, against a simulated rival")}</span></header>
      <div class="gx-sh du-left"><section class="gx-pnl du-mesas"><span class="gx-eyb">${T("Elige mesa", "Pick a table")}</span><div class="du-cards" id="duCards">${cards}</div></section></div>
      <div class="gx-sh du-right"><div class="gx-paper du-ficha" id="duFicha">${ficha()}</div></div>
    </div></section>`, "tablewrap");
    paintFicha();
    $("hubBack").onclick = () => { A.sfx.ui(); A.hub.screen("home"); };
    $("duCards").onclick = e => { const b = e.target.closest(".du-mesa"); if (!b || b.dataset.t === sel.table) return; sel.table = b.dataset.t; sel.level = null; A.sfx.card();
      document.querySelectorAll(".du-mesa").forEach(x => { const on = x === b; x.classList.toggle("sel", on); x.setAttribute("aria-pressed", on); }); paintFicha(); };
    const step = d => () => { sel.level = clamp(lvOf() + d, 4, 96); A.sfx.ui(); paintFicha(); };
    $("duLvDn").onclick = step(-4); $("duLvUp").onclick = step(4);
    $("duSeedNew").onclick = () => { sel.seed = newSeed(); A.sfx.ui(); paintFicha(); };
    $("duGo").onclick = () => { A.sfx.depart(); const seed = sel.seed; sel.seed = ""; D.start({ table: sel.table, level: lvOf(), seed }); };
    if (A.coverMap) A.coverMap("duelo", true, () => !!document.querySelector("#dlg .du-screen") && !$("layer").classList.contains("hidden"));   // fieltro opaco: el mapa de detras deja de dibujarse
  };

  /* ------------------------------------------------------------------ entrada oculta (solo desarrollo): boton en la portada con atlasiq.duelo = "1" */
  let dev = false; try { dev = localStorage.getItem("atlasiq.duelo") === "1"; } catch (e) { /* sin almacenamiento */ }
  if (dev && window.MutationObserver && $("dlg")) {
    const add = () => {
      const d = $("dlg"); if (!d.classList.contains("home") || !d.querySelector(".hh") || $("duEntry")) return;
      const b = document.createElement("button"); b.type = "button"; b.id = "duEntry"; b.className = "du-entry gx-btn sm"; b.innerHTML = `${A.icon("chip_r")}<span>${NAME()}</span>`; b.title = T("Prototipo (solo desarrollo)", "Prototype (development only)");
      b.onclick = () => { A.sfx.card(); D.open(); }; d.appendChild(b);
    };
    new MutationObserver(add).observe($("dlg"), { childList: true }); add();
  }
})(window.AIQ);
