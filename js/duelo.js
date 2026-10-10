/*
 * Geolite - DUELO DE FICHAS (prototipo del modo 1 vs 1). Dos formas de jugar: contra la banca (un rival simulado, sin red) y contra un amigo en
 * una SALA PRIVADA con codigo (el transporte es js/duelo-red.js y el servidor api/duelo.js; invitar por Steam llegara despues).
 * Aspecto: la maqueta aprobada el 2026-10-10 (sala, cara a cara, marcador en espejo, revelado con la cuenta dentro del marcador y veredicto).
 *  - Los dos reciben la misma pregunta a la vez. Puntos de la ronda = solo precision: round(1000 * e^(-km / (1500 * kf))), con el factor kf por tipo
 *    de lugar de la Aventura (A.adv.kf). Sin racha, sin perks y sin puntos de rapidez.
 *  - Quien puntua menos le paga al otro (diferencia de puntos x multiplicador de la ronda). Quien se queda sin fichas, pierde. Al llegar al tope de
 *    rondas gana quien tenga mas fichas y, si empatan, se juegan rondas extra hasta deshacer el empate.
 *  - Cuando uno fija su respuesta, al otro le quedan como mucho CFG.lockRush segundos.
 *  - La pregunta de cada ronda se sortea entre las de A.QDIFF (data/dificultad.js) por una escalera de dificultad segun la mesa, con semilla
 *    (A.rng de js/rank.js): con la misma semilla sale el mismo duelo (mismas preguntas y mismas respuestas del rival).
 * TODAS las cifras estan en CFG, aqui debajo. Guarda solo tus duelos contra la banca (localStorage "atlasiq.duelo.banca") y las tarjetas de la
 * Enciclopedia que ganes (en silencio: se ensenan juntas en el veredicto). Ni logros de partida, ni perfil, ni clasificacion.
 * Entre jugadores (seccion «ENTRE JUGADORES», al final): los dos juegos sacan las mismas preguntas de la misma semilla y hacen las mismas cuentas;
 * por la red solo viajan «listo», «he fijado aqui» y «me rindo». El reloj es el del servidor, no hay pausa y los amistosos no cuentan para tus
 * duelos contra la banca.
 * Entrada: la tercera carta de la portada (la que era del Reto diario, retirado por ahora: js/hub.js), que abre la sala (A.duelo.open()).
 * Enganches fuera de este fichero: js/game.js (S.duel en updateHud, showTitle, reveal y la pausa, que entre jugadores no existe; piezas publicadas en A.core) y A.adv.kf en js/adventure.js.
 * Textos: es y en aqui, junto al codigo; los otros 10 idiomas en js/duelo-textos.js (clave = el texto en ingles).
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id), C = () => A.core;
  /* textos: el espanol y el ingles van aqui, a la vista; los otros 10 idiomas estan en js/duelo-textos.js (clave = el texto en ingles).
     Tf rellena los huecos {x} de una frase (el orden de las palabras cambia de un idioma a otro) */
  const TRI = { fr: 0, pt: 1, de: 2, it: 3, "es-419": 4, zh: 5, ko: 6, ja: 7, ru: 8, pl: 9 };
  const T = (es, en) => { const t = A.DUELO_TR && A.DUELO_TR[en], i = TRI[A.lang]; return (t && i != null && t[i]) || A.T(es, en); };
  const Tf = (es, en, p) => T(es, en).replace(/\{(\w+)\}/g, (m, k) => (p[k] != null ? p[k] : m));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), pad2 = n => String(n).padStart(2, "0");

  /* ------------------------------------------------------------------ LAS CIFRAS DEL DUELO (todas aqui) */
  const CFG = {
    stack: 2500,                                   // fichas con las que empieza cada jugador
    scale: 1500,                                   // km: puntos = round(1000 * e^(-km / (scale * kf)))
    rounds: 12,                                    // tope de rondas; despues solo hay rondas extra si las pilas estan empatadas
    mult: { from: 4, step: 0.5 },                  // x1 hasta la ronda anterior a "from"; desde ella, +step por ronda (x1,5 en la 4.a ... x5,5 en la 12.a)
    clock: [[1, 15], [5, 12], [9, 10]],            // segundos por pregunta: [desde la ronda, segundos]
    lockRush: 5,                                   // cuando uno fija su respuesta, al otro le quedan como mucho estos segundos
    revealSecs: 7.5,                               // lo que dura el revelado: la cuenta acaba hacia los 4 s y pasa sola a la siguiente ronda
    introSecs: 5, gapSecs: 0.1,                    // el cara a cara (se puede saltar) y el paso de una ronda a otra (gapSecs solo cuenta para estimar la duracion en A.duelo.sim)
    /* el revelado, en ms desde que empieza (los de la maqueta): tu ficha, la del rival, las lineas, la fila de la cuenta, tus puntos, los suyos,
       la diferencia, por la ronda, las fichas que se pagan, su vuelo (flyN fichas, una cada flyGap, flyMs cada una) y las pilas que ruedan */
    rev: { me: 800, rv: 1000, lines: 1150, row: 1200, pm: 1500, pr: 1700, diff: 2100, mult: 2500, pay: 2900, fly: 3050, flyN: 9, flyGap: 70, flyMs: 560, roll: 3300, rollMs: 800 },
    /* mesas: el centro de la escalera de dificultad (0-100 de A.QDIFF) y, salvo que se cambie, el nivel del rival */
    tables: [
      { id: "baja", center: 28, chip: "chip_g", n: A.L6("Mesa baja|Low table|Table basse|Mesa baixa|Niedriger Tisch|Tavolo basso||低注桌|낮은 테이블|ローテーブル|Малый стол|Niski stół") },
      { id: "media", center: 48, chip: "chip_b", n: A.L6("Mesa media|Middle table|Table moyenne|Mesa média|Mittlerer Tisch|Tavolo medio||中注桌|중간 테이블|ミドルテーブル|Средний стол|Średni stół") },
      { id: "alta", center: 68, chip: "chip_k", n: A.L6("Mesa alta|High table|Table haute|Mesa alta|Hoher Tisch|Tavolo alto||高注桌|높은 테이블|ハイテーブル|Большой стол|Wysoki stół") },
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
  const NAME6 = "Duelo de fichas|Chip duel|Duel de jetons|Duelo de fichas|Chip-Duell|Duello di fiche||筹码对决|칩 대결|チップ勝負|Дуэль на фишки|Pojedynek na żetony";
  const NAME = () => T("Duelo de fichas", "Chip duel"), ME = () => T("Tú", "You"), RIVAL = () => T("Rival", "Rival"), BANK = () => T("La banca", "The house");
  const fmtM = m => (Number.isInteger(m) ? String(m) : A.fmt1(m));
  const multOf = k => (k < CFG.mult.from ? 1 : 1 + CFG.mult.step * (k - CFG.mult.from + 1));
  const secsOf = k => { let s = CFG.clock[0][1]; for (const [from, v] of CFG.clock) if (k >= from) s = v; return s; };
  const targetOf = (center, k) => { const L = CFG.ladder; return clamp(center - L.down + (L.down + L.up) * Math.min(1, (k - 1) / L.steps), L.min, L.max); };
  const rungTxt = k => `${T("Peldaño", "Rung")} ${k} / ${Math.max(CFG.rounds, k)}`;
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
    return { seed, table, level: o.level == null ? table.center : +o.level, auto: o.auto || null, net: o.net || null, rq: A.rng(seed + ":q"), rb: A.rng(seed + ":rival"), ra: A.rng(seed + ":auto"),
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
    log: st.log.map(r => ({ k: r.k, mult: r.mult, id: r.id, d: r.d, me: r.me.pts, meKm: r.me.km == null ? null : Math.round(r.me.km), rv: r.rv.pts, rvKm: r.rv.km == null ? null : Math.round(r.rv.km), tier: r.tier, pay: r.pay, stMe: r.stMe })) });

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

  /* ================================================================== LA INTERFAZ (la maqueta aprobada: sala, cara a cara, partida, revelado y veredicto) */
  let st = null, raf = 0, timers = [];
  const later = (fn, ms) => { const s = st, id = setTimeout(() => { if (s && st === s) fn(); }, ms); timers.push(id); return id; };
  const elapsed = () => { const S = C().S; return ((S.paused ? S.pauseAt : performance.now()) - st.cur.t0 - S.pausedAcc) / 1000; };   // segundos de esta pregunta, sin contar la pausa
  const veiled = () => { const v = $("veil"); return C().S.settingsOpen || (v && !v.classList.contains("hidden")); };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ME_CHIP = "chip_o", RV_CHIP = "chip_p", ME_FICHA = "blank_gold", RV_FICHA = "chip_p";   // colores fijos: tu, oro; el rival, violeta
  const myName = () => { const n = A.profile && A.profile.get().name; return n ? esc(n) : ""; };
  const foeRaw = () => (st && st.net ? st.net.his || RIVAL() : BANK()), foe = () => esc(foeRaw());   // el de enfrente: la banca o, en la sala privada, tu amigo
  const cut = (s, n) => { const a = [...String(s)]; return a.length > n ? a.slice(0, n - 1).join("") + "…" : String(s); };
  const range = t => `${targetOf(t.center, 1)} ${T("a", "to")} ${targetOf(t.center, CFG.ladder.steps + 1)}`;
  const row = (a, b) => `<div class="gx-lead-row"><span>${a}</span><s></s><b>${b}</b></div>`;
  const tableOf = id => CFG.tables.find(t => t.id === id) || CFG.tables[1];
  const inRow = n => (n === 1 ? T("1 seguida", "1 in a row") : Tf("{n} seguidas", "{n} in a row", { n }));
  const tally = o => `${T("Victorias", "Wins")}: ${o.w} · ${T("Duelos", "Duels")}: ${o.d}.`;

  /* tus duelos contra la banca (lo unico que guarda el prototipo, junto a las tarjetas de la Enciclopedia) */
  const SKEY = "atlasiq.duelo.banca";
  const stats = () => { let o = {}; try { o = JSON.parse(localStorage.getItem(SKEY) || "{}") || {}; } catch (e) { /* sin almacenamiento */ } return { d: +o.d || 0, w: +o.w || 0, s: +o.s || 0 }; };
  D.stats = stats;                                                        // la carta de la portada ensena tus duelos ganados (js/hub.js)
  const statsAdd = win => { const o = stats(); o.d++; if (win) { o.w++; o.s++; } else o.s = 0; try { localStorage.setItem(SKEY, JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ } return o; };

  /* escala del duelo: el diseno es a 1280 x 720 y se escala entero (como las pantallas de gala), sin pasar de la escala de la interfaz.
     La variable solo se escribe si cambia (una variable en el cuerpo recalcula los estilos de toda la pagina) */
  function fitDk() { const k = Math.max(0.5, Math.min(innerWidth / 1280, innerHeight / 720, (A.uiK && A.uiK()) || 1)).toFixed(3), b = document.body.style; if (b.getPropertyValue("--dk") !== k) b.setProperty("--dk", k); return +k; }
  addEventListener("resize", () => { if (!st && !document.querySelector(".du-wrap")) return; fitDk(); if (st && st.pins) { st.pins.rect = null; st.pins.sig = ""; } if (st) factFit(); });

  /* ---------------- el crupier: habla al sentarte y en el veredicto (el de las frases, js/dealer.js, sentado en un hueco de la pantalla);
     durante la partida solo pone caras (un sprite propio, js/crupier.js). Las frases siguen su guion: nunca se le corta */
  const LN = {
    sala: [["Tú, yo, un mapa y mis fichas. Alguien va a pagar, y no pienso ser yo.", "You, me, a map and my chips. Someone's going to pay, and I don't plan on it being me."],
      ["¿Otra vez por aquí? Siéntate. Las fichas no se pierden solas.", "Back again? Take a seat. Chips don't lose themselves."]],
    vs: [["Mismas preguntas, mismo reloj. Lo único distinto es lo que sabemos tú y yo.", "Same questions, same clock. The only difference is what you and I know."],
      ["Las primeras rondas pagan poco. Las últimas lo pagan todo.", "The early rounds pay little. The late ones pay for everything."],
      ["Doce peldaños. Arriba se cobra caro. Sube con cuidado.", "Twelve rungs. It gets pricey at the top. Climb carefully."]],
    win: [["Te llevas mis fichas. Hoy invita la casa. Mañana, ya veremos.", "You're walking off with my chips. Tonight's on the house. Tomorrow, we'll see."],
      ["Bien jugado. Y que conste: no me acostumbro a pagar.", "Well played. For the record, I'm not getting used to paying."]],
    lose: [["Alguien tenía que pagar. Hoy has sido tú. Mañana, ya veremos.", "Someone had to pay. Today it was you. Tomorrow, we'll see."],
      ["La casa gana. No es nada personal: es la costumbre.", "The house wins. Nothing personal: it's a habit."]],
    quit: [["¿Te vas a medias? Las fichas se quedan. Tú vuelve cuando quieras.", "Leaving halfway? The chips stay. You come back whenever you like."]],
    vs2: [["Mismas preguntas, mismo reloj. Lo único distinto es lo que sabéis.", "Same questions, same clock. The only difference is what each of you knows."],
      ["Yo solo reparto. Las fichas os las quitáis entre vosotros.", "I only deal. You two take the chips off each other."],
      ["Doce peldaños. Arriba se cobra caro. Subid con cuidado.", "Twelve rungs. It gets pricey at the top. Climb carefully, you two."]],
    win2: [["Te llevas sus fichas. Yo solo las repartí. Esta vez.", "You walk off with their chips. I only dealt them. This time."],
      ["Bien jugado. Hoy no pago yo, y eso siempre me alegra la noche.", "Well played. I'm not the one paying tonight, and that always makes my evening."]],
    lose2: [["Alguien tenía que pagar. Hoy has sido tú. Mañana, ya veremos.", "Someone had to pay. Today it was you. Tomorrow, we'll see."],
      ["Se lleva tus fichas. Pídele la revancha: yo barajo encantado.", "They're taking your chips. Ask for a rematch: I'll gladly shuffle."]],
    left2: [["Se ha levantado de la mesa. Las fichas se quedan contigo.", "They got up from the table. The chips stay with you."]],
    quit2: [["Se ha rendido. Las fichas no discuten: son tuyas.", "They gave up. Chips don't argue: they're yours."]],
    lost2: [["Te perdí de vista demasiado rato. Y la mesa no espera.", "I lost sight of you for too long. And the table doesn't wait."]],
    r_open: [["Sala abierta. Pásale el código a tu amigo; yo voy barajando.", "Room's open. Send your friend the code; I'll start shuffling."]],
    r_both: [["Ya estáis los dos. Cuando quieras, reparto.", "You're both here. I'll deal whenever you like."]],
    r_guest: [["Bienvenido a la mesa. Aquí reparte el anfitrión; yo solo miro. Y cobro.", "Welcome to the table. The host deals here; I just watch. And collect."]],
    how: [["Una pregunta, dos respuestas: la tuya y la mía. Puntúa más quien clava más cerca.", "One question, two answers: yours and mine. Whoever pins closer scores more."],
      ["Quien puntúa menos paga la diferencia, multiplicada por el peldaño. Arriba se paga hasta ×5,5.", "Whoever scores less pays the difference, times the rung. At the top it pays up to ×5.5."],
      ["Sin fichas, pierdes. Y cuando uno fija, al otro le quedan cinco segundos. Sin prisa. Bueno, con un poco.", "Out of chips, you lose. And once one of us locks in, the other gets five seconds. No rush. Well, a little."]],
  };
  const lnAt = {};
  const line = (k, i) => { const a = LN[k]; if (i == null) i = lnAt[k] = lnAt[k] == null ? Math.floor(Math.random() * a.length) : (lnAt[k] + 1) % a.length; return T(a[i][0], a[i][1]); };
  const DL = () => A.dealer || {};
  const seat = host => { if (DL().dock) DL().dock(host); };
  const unseat = () => { if (DL().dock) { DL().dock(null); DL().release(); } };       // si esta a media frase, la acaba en su esquina y se va
  const speak = (text, o = {}) => { if (DL().say) DL().say(text, { force: true, mood: o.mood || "sly", face: o.face, gesture: o.gesture, done: o.done, valid: o.valid }); else if (o.done) o.done(); };
  const face = (e, g) => { if (!st || !st.spr) return; st.spr.set(e); if (g) st.spr.play(g); };

  /* pantalla de gala del duelo: tapete a toda la ventana y el lienzo de 1280 x 720 centrado y escalado */
  const stage = (cls, inner, extra = "") => `<div class="du-wrap"><div class="gx-veil"></div><div class="du-spot"></div><div class="du-stage du-st gx-layer gx-in"><div class="g12 ${cls}">${inner}</div>${extra}</div></div>`;
  const primary = (id, txt) => `<span class="gx-mq"><button type="button" class="gx-btn pri" id="${id}" data-primary><span>${txt}</span>${A.gala.keyHint("Enter", "a")}</button>${A.bulbs()}</span>`;

  /* ficha pequena dibujada al pixel real con el dibujante del juego (js/ficha.js): cada pixel de arte ocupa un numero entero de pixeles de pantalla */
  function fichaCv(id, css, base = 12) {
    const dpr = devicePixelRatio || 1, dev = Math.max(base, Math.round(css * dpr)), s = Math.max(1, Math.round(dev / base)), N = Math.max(8, Math.round(dev / s)), cv = document.createElement("canvas");
    cv.width = cv.height = N; cv.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(A.ficha.px(N, id)), N, N), 0, 0);
    cv.style.width = cv.style.height = (N * s) / dpr + "px"; return cv;
  }

  /* ================================================================== 1 · LA SALA: tu ficha de socio y las tres puertas («Retar a un amigo» y «Contra el crupier»; la liga, mas adelante) */
  const sel = { table: "media", level: null, door: "crupier", msg: "" };
  const WHY = { none: ["No hay ninguna sala con ese código.", "There's no room with that code."], full: ["Esa sala ya está completa.", "That room is already full."],
    ver: ["Tu amigo y tú tenéis versiones distintas del juego.", "You and your friend are on different versions of the game."], closed: ["La sala se ha cerrado.", "The room was closed."],
    short: ["El código tiene 5 letras o números.", "The code has 5 letters or digits."], net: ["No se ha podido conectar con la sala. Inténtalo otra vez.", "Couldn't reach the room. Try again."] };
  const whyTxt = w => { const a = WHY[w] || WHY.net; return T(a[0], a[1]); };
  const salaMsg = (t, bad) => { const e = $("duAmgTx"); if (!e) return; e.textContent = t || T("¿Tu amigo ya tiene sala? Escribe su código.", "Does your friend already have a room? Type their code."); e.classList.toggle("bad", !!bad); };
  const lvOf = () => (sel.level == null ? tableOf(sel.table).center : sel.level);
  let greeted = false;
  D.open = () => {
    const c = C(), S = c.S; if (S.booting || S.phase !== "title") return;
    pool(); fitDk(); S.hub = "duelo";                                     // S.hub: Esc vuelve a la portada (js/game.js)
    const s = stats(), nm = myName();
    const door = (i, id, ill, t, d, tag, cls, on) => `<div class="doorw ${on ? "on" : "off"} rise" style="--d:${(0.1 + i * 0.08).toFixed(2)}s"${on ? ` data-door="${id}" role="button" tabindex="0"` : ""}><div class="gx-paper door">${ill}<h3 class="ink">${t}</h3><p>${d}</p><span class="tag ${cls}">${tag}</span></div></div>`;
    const ms = t => `<button type="button" class="ms${t.id === sel.table ? " on" : ""}" data-t="${t.id}" aria-pressed="${t.id === sel.table}">${A.icon(t.chip)}<span><b>${A.tx(t.n)}</b><i>${T("dificultad", "difficulty")} ${range(t)}</i></span></button>`;
    c.dialog(stage("lob", `<div class="hd"><button type="button" class="gx-btn sm" id="hubBack">${A.icon("u_back")}<span>${A.t("set.close")}</span>${A.gala.keyHint("Esc", "b")}</button><h2 class="gx-t-l" id="duH">${NAME()}</h2><span class="gx-eyb">${T("Prototipo", "Prototype")}</span></div>
      <div class="socio gx-sh fromL"><div class="gx-paper"><span class="gx-eyb">${T("Tu ficha", "Your chip")}</span>
        <div class="who">${A.icon(ME_CHIP)}<div><b>${nm || T("Jugador", "Player")}</b><span>${T("Sin liga todavía", "No league yet")}</span></div></div>
        <p class="gx-note">${T("Las ligas llegarán más adelante. De momento: amistosos con un amigo y práctica contra la banca.", "Leagues come later. For now: friendlies with a friend and practice against the house.")}</p>
        <div class="gx-hr"></div>
        <div class="rows">${row(T("Duelos", "Duels"), s.d)}${row(T("Victorias", "Wins"), s.w)}${row(T("Racha", "Streak"), s.s ? inRow(s.s) : "—")}<div class="gx-lead-row"><span>${T("Tu mesa", "Your table")}</span><s></s><b id="duTm"></b></div></div>
      </div></div>
      <div class="puertas gx-sh"><div class="gx-pnl"><span class="gx-eyb">${T("Elige duelo", "Pick a duel")}</span>
        <div class="doors" id="duDoors">
          ${door(0, "liga", `<div class="ill" style="background-image:url(assets/gen/card_compete.webp)"></div>`, T("Duelo de liga", "League duel"), T("Un rival de tu liga, o su partida grabada si no hay nadie.", "A rival from your league, or their recorded game if no one's around."), T("Pronto", "Soon"), "line", false)}
          ${door(1, "amigo", `<div class="ill amigo">${A.icon("chip_o")}${A.icon("chip_p")}</div>`, T("Retar a un amigo", "Challenge a friend"), T("Abre una sala y pásale el código. O entra en la suya.", "Open a room and send them the code. Or join theirs."), T("Con código", "With a code"), "", true)}
          ${door(2, "crupier", `<div class="ill" style="background-image:url(assets/gen/card_adv.webp);background-color:#5a1420"></div>`, T("Contra el crupier", "Against the dealer"), T("Práctica contra la banca. Tú eliges cuánto sabe.", "Practice against the house. You choose how much it knows."), T("Práctica", "Practice"), "", true)}
        </div>
        <div class="amg hidden" id="duRowA"><span id="duAmgTx" role="status"></span><input id="duCode" type="text" maxlength="5" spellcheck="false" autocomplete="off" autocapitalize="characters" enterkeyhint="go" placeholder="·····" aria-label="${T("Código de la sala", "Room code")}"><span class="gx-acts"><button type="button" class="gx-btn sm" id="duJoin">${T("Entrar", "Join")}</button></span></div>
        <div class="mesas" id="duRowB"><div class="mss" id="duMesas">${CFG.tables.map(ms).join("")}</div>
          <div class="lvl"><span>${T("La banca sabe", "The house knows")}</span><span class="gx-acts"><button type="button" class="gx-btn sm" id="duLvDn" aria-label="-">−</button></span><b id="duLv"></b><span class="gx-acts"><button type="button" class="gx-btn sm" id="duLvUp" aria-label="+">+</button></span></div></div>
        <div class="regl"><span>${A.icon("chip_k")}<b>${A.fmt(CFG.stack)}</b> ${T("fichas cada uno", "chips each")}</span><span>${A.icon("boss_hat")}${T("Hasta", "Up to")} <b>${CFG.rounds}</b> ${T("rondas", "rounds")}</span><span>${A.icon("coin")}${T("Paga la <b>diferencia</b> por la ronda", "Pays the <b>difference</b> times the round")}</span></div>
      </div></div>
      <div class="ft"><div class="seatw" id="duSalaSeat"></div><div class="gx-acts"><button type="button" class="gx-btn gho" id="duHow">${T("Cómo se juega", "How to play")}</button>${primary("duGo", T("Sentarse a la mesa", "Take a seat"))}</div></div>`), "tablewrap");
    const paint = () => { const t = tableOf(sel.table), am = sel.door === "amigo"; $("duLv").textContent = lvOf(); $("duTm").textContent = `${T("dificultad", "difficulty")} ${range(t)}`;
      document.querySelectorAll("#duDoors .doorw.on").forEach(x => { const on = x.dataset.door === sel.door; x.classList.toggle("eleg", on); x.setAttribute("aria-pressed", on); });
      $("duRowA").classList.toggle("hidden", !am); $("duRowB").classList.toggle("hidden", am);
      $("duGo").querySelector("span").textContent = am ? T("Abrir una sala", "Open a room") : T("Sentarse a la mesa", "Take a seat"); };
    paint(); salaMsg(sel.msg, !!sel.msg); sel.msg = "";
    $("hubBack").onclick = () => { A.sfx.ui(); unseat(); A.hub.screen("home"); };
    $("duDoors").onclick = e => { const b = e.target.closest(".doorw.on"); if (!b || b.dataset.door === sel.door) return; sel.door = b.dataset.door; A.sfx.card(); paint(); };
    { const ci = $("duCode");                                              // el codigo de tu amigo: solo sus letras y cifras; Intro = Entrar
      ci.oninput = () => { const v = ci.value.toUpperCase().replace(/[^A-HJKMNP-Z2-9]/g, "").slice(0, 5); if (v !== ci.value) ci.value = v; salaMsg(""); };
      ci.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); roomJoin(ci.value); } };   // tambien el «Listo» del teclado en pantalla (js/teclado.js)
      $("duJoin").onclick = () => roomJoin(ci.value); }
    $("duMesas").onclick = e => { const b = e.target.closest(".ms"); if (!b || b.dataset.t === sel.table) return; sel.table = b.dataset.t; sel.level = null; A.sfx.card();
      document.querySelectorAll("#duMesas .ms").forEach(x => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); }); paint(); };
    const step = d => () => { sel.level = clamp(lvOf() + d, 4, 96); A.sfx.ui(); paint(); };
    $("duLvDn").onclick = step(-4); $("duLvUp").onclick = step(4);
    $("duGo").onclick = () => { if (sel.door === "amigo") return roomNew(); A.sfx.depart(); D.start({ table: sel.table, level: lvOf() }); };
    let k = 0; const how = () => { if (k > 2 || !$("duSalaSeat")) return; speak(line("how", k++), { done: how }); };
    $("duHow").onclick = () => { A.sfx.ui(); if (k > 0 && k < 3) return; k = 0; how(); };   // el crupier lo explica en tres frases
    seat($("duSalaSeat")); if (!greeted) { greeted = true; speak(line("sala", s.d ? 1 : 0)); }
    if (A.coverMap) A.coverMap("duelo", true, () => !!document.querySelector("#dlg .du-wrap") && !$("layer").classList.contains("hidden"));   // tapete opaco: el mapa de detras deja de dibujarse
  };

  /* ================================================================== EMPEZAR: o = { table, level, seed, auto } (auto: { level, next, done }: tu sitio lo ocupa otro rival simulado, para pruebas) */
  D.start = (o = {}) => {
    const c = C(), S = c.S; if (S.duel) D.leave(true); else seat(null);
    c.openSettings(false); A.audio.unlock(); pool(); fitDk();
    st = S.duel = mkState(o);
    S.run = null; S.tool = null; S.ranked = null; S.level = 0; S.qs = []; S.qi = 0; S.levelScore = 0; S.runTotal = 0; S.streak = 0; S.hits = 0; S.log = null;
    S.camp = { id: "duelo", mode: "duel", title: A.L6(NAME6), home: { lat: 0, lon: 0, zoom: 1 }, levels: [{ kind: "city", seconds: secsOf(1), advance: 0, maxPerQ: 1000, name: st.table.n }] };
    c.map.setHome(S.camp.home); c.map.clearMarks(); c.map.setDecoys([]); A.music.mode(1);
    if (!raf) raf = requestAnimationFrame(tick);
    if (st.auto && st.auto.vs === false) sit(); else vs(sit);
    return st.seed;
  };

  /* ================================================================== 2 · CARA A CARA: los dos naipes, las fichas en juego y la escalera de lo que paga cada ronda */
  function vs(cb) {
    const c = C(), S = c.S, tb = st.table, s = stats(), sT = st, nm = myName(), nt = st.net; S.phase = "intro";
    const room = w => row(T("Fichas", "Chips"), A.fmt(CFG.stack)) + row(T("Victorias en la sala", "Wins in this room"), w);
    const card = (side, chip, name, tag, cls, rws) => `<div class="cardw ${side} ${side === "l" ? "fromL" : "fromR"}" style="--d:.15s"><div class="gx-paper pc">${A.icon(chip)}<h3 class="ink">${name}</h3><span class="tag ${cls}">${tag}</span><div class="rows">${rws}</div></div></div>`;
    const lad = Array.from({ length: CFG.rounds }, (_, i) => `<div class="pop" style="--d:${(0.6 + i * 0.05).toFixed(2)}s"><i style="--h:${8 + Math.round(multOf(i + 1) * 6)}px"></i><span>×${fmtM(multOf(i + 1))}</span></div>`).join("");
    c.dialog(stage("vs", `<div class="top"><span class="gx-eyb">${A.tx(tb.n)} · ${T("dificultad", "difficulty")} ${range(tb)}</span></div>
      ${card("l", ME_CHIP, nm || T("Jugador", "Player"), ME(), "me", nt ? room(N.score.me) : row(T("Duelos", "Duels"), s.d) + row(T("Victorias", "Wins"), s.w) + row(T("Racha", "Streak"), s.s || "—"))}
      <div class="mid"><div class="seatw" id="duVsSeat"></div><b class="rise" style="--d:.35s">${A.fmt(2 * CFG.stack)}</b><span class="gx-note rise" style="--d:.4s">${T("fichas en juego", "chips at stake")}</span></div>
      ${card("r", RV_CHIP, foe(), RIVAL(), "rv", nt ? room(N.score.rv) : row(T("Nivel", "Level"), st.level) + row(T("Duelos contigo", "Duels with you"), s.d) + row(T("Victorias", "Wins"), s.d - s.w))}
      <div class="lad" style="--n:${CFG.rounds}">${lad}</div>`, `<span class="cnt" id="duCnt"></span>`), "tablewrap");
    A.sfx.intro(); c.map.animateTo(c.map.home(), 1100);
    /* dura lo justo y se puede saltar (clic, Intro o A). Nunca se cierra sola con el crupier a media frase: espera a que acabe, con su segundo de mas */
    let done = false, talking = !!DL().say, timeUp = false, left = Math.ceil(CFG.introSecs);
    const end = () => { if (done || st !== sT || st.phase === "end") return; done = true; clearInterval(iv); cb(); };   // (phase "end": el otro se fue durante el cara a cara y ya esta el veredicto)
    const cnt = $("duCnt"), iv = setInterval(() => { if (st !== sT || done || st.phase === "end") return clearInterval(iv); left--; cnt.textContent = left > 0 && left <= 3 ? Tf("Empieza en {n}", "Starts in {n}", { n: left }) : ""; if (left <= 0) { timeUp = true; if (!talking) end(); } }, 1000);
    seat($("duVsSeat")); speak(line(nt ? "vs2" : "vs"), { done: () => { talking = false; if (timeUp) end(); } });
    S.skipIntro = end; document.querySelector("#dlg .du-wrap").onclick = end; later(end, CFG.introSecs * 1000 + 15000);   // red de seguridad
  }

  /* ================================================================== 3 · LA PARTIDA: el marcador en espejo, el crupier en su esquina y la placa del juego en papel de gala */
  function sit() {
    const c = C(), app = $("app"), nm = myName(), add = (id, cls, html) => { let e = $(id); if (e) e.remove(); e = document.createElement("div"); e.id = id; e.className = cls; e.innerHTML = html; app.appendChild(e); return e; };
    c.closeDialog(); if (A.coverMap) A.coverMap("duelo", false);
    document.body.classList.remove("title-on"); document.body.classList.add("duelo-on");
    $("plate").classList.add("hidden"); $("pauseBtn").classList.add("hidden"); $("streakChip").classList.add("hidden"); $("factText").textContent = ""; c.chrome(true);
    add("duHud", "du-hud du-st", `<div class="gx-pnl">
      <div class="pl me">${A.icon(ME_CHIP, "av")}<div data-src="me"><div class="du-nm"><span class="tag me" id="duTagMe"></span>${nm ? `<span class="nmt">${nm}</span>` : ""}</div><div class="num odo" id="duMe"></div></div></div>
      <div class="mid"><span class="gx-eyb" id="duRd"></span><span class="brass" id="duMult" ${A.ttAttr(T("Lo que paga la ronda", "What the round pays"), T("La diferencia de puntos se paga por este número.", "The point difference is paid times this number."))}></span><div class="pips" id="duPips"></div></div>
      <div class="pl rv"><div data-src="rv"><div class="du-nm"><span class="nmt">${st.net ? foe() : T("Banca", "House")}</span><span class="tag line" id="duTagRv"></span></div><div class="num odo" id="duRv"></div></div>${A.icon(RV_CHIP, "av")}</div>
      <div class="bal"><span><i id="duBal"></i></span></div>
      <div class="cuenta" id="duCuenta"></div></div>`);
    add("duSeat", "du-seat", `<div class="own" id="duOwn"></div>`);
    add("duTools", "du-tools du-st gx-acts", `<button type="button" class="gx-btn sm gho" id="duQuit"><span class="a">${T("Rendirse", "Give up")}</span><span class="b">${T("¿Seguro?", "Sure?")}</span></button>`);
    add("duFact", "du-fact du-st hidden", "");
    add("duPins", "du-pins du-st", `<svg aria-hidden="true"><line class="me"></line><line class="rv"></line></svg>`);
    if (A.crupier) st.spr = A.crupier.mount($("duOwn"), { round: true });
    if (DL().busy) { seat($("duSeat")); DL().release(); } else unseat();     // si aun hablaba (saltaste el cara a cara), acaba la frase en su sitio de la mesa
    /* rendirse: dos pulsaciones, como todo lo que no tiene vuelta atras */
    { const b = $("duQuit"); let armed = 0;
      b.onclick = () => { if (!st || st.phase === "end") return; if (!armed) { armed = setTimeout(() => { armed = 0; b.classList.remove("armed"); }, 4000); b.classList.add("armed"); A.sfx.deny(); return; }   // armado ensena «¿Seguro?» en el mismo hueco
        clearTimeout(armed); A.sfx.deny(); if (st.net) send({ a: "quit", n: st.net.n }); st.over = { win: false, ko: false, quit: true, rounds: Math.max(1, st.k) }; finish(); }; }
    st.shown = { me: st.me, rv: st.rv };
    if (st.net) { st.phase = "wait"; D.hud(); netReady(1, 0); } else { D.hud(); ask(); }   // entre jugadores, la primera pregunta sale cuando los dos estan sentados
  }
  /* lo que pinta el juego en su marcador (js/game.js, updateHud): aqui, el numero de la pregunta en la placa y el marcador del duelo */
  D.hud = () => {
    if (!st || !$("duHud")) return; const c = C(), k = Math.max(1, st.k), n = Math.max(CFG.rounds, k), cur = st.cur, ask = st.phase === "ask", sh = st.shown;
    $("askNo").textContent = A.t("ask.no", { n: pad2(k), m: pad2(n) });
    $("duRd").textContent = rungTxt(k); $("duMult").textContent = "×" + fmtM(multOf(k));
    let h = ""; for (let i = 1; i <= n; i++) { const r = st.log[i - 1], done = r && (i < k || (!ask && st.rolled)); h += `<i class="${done ? (r.pay > 0 ? "me" : r.pay < 0 ? "rv" : "eq") : i === k ? "now" : ""}"></i>`; }
    $("duPips").innerHTML = h;
    const tm = $("duTagMe"), tr = $("duTagRv"), mine = ask && cur && cur.meAns, his = ask && cur && cur.rvLocked, nt = st.net, wait = st.phase === "wait", cutoff = nt && N.cut, gone = nt && nt.off;
    tm.className = "tag " + (cutoff ? "red" : "me"); tm.textContent = cutoff ? T("Sin conexión", "Offline") : mine ? T("Fijada", "Locked in") : ask && cur && cur.passed ? T("Sin respuesta", "No answer") : ME();
    tr.className = "tag " + (gone ? "red" : wait ? "line" : !ask ? "rv" : his ? "red" : "line");
    tr.textContent = gone ? T("Sin señal", "No signal") : wait ? T("Esperando", "Waiting") : !ask ? RIVAL() : his ? T("Ha fijado", "Has locked in") : T("Pensando", "Thinking");
    document.body.classList.toggle("duelo-lock", !!(his && !mine));          // el reloj de la placa, en rojo
    c.odoSet($("duMe"), sh.me, { instant: true }); c.odoSet($("duRv"), sh.rv, { instant: true }); bal();
  };
  const bal = () => { const sh = st.shown, e = $("duBal"); if (e) e.style.transform = `translateX(${(-100 + (100 * sh.me) / Math.max(1, sh.me + sh.rv)).toFixed(2)}%)`; };
  /* la pausa del juego (js/game.js, veilMenu): nombre del modo, nota y las dos pilas */
  D.pause = () => (st.net ? { mode: `${NAME()} · ${T("Amistoso", "Friendly")}`,
    note: T("Entre jugadores no hay pausa: el reloj sigue corriendo para los dos. Si sales al menú, pierdes el duelo.", "There's no pause between players: the clock keeps running for both. If you exit to the menu, you lose the duel."),
    rows: row(T("Tus fichas", "Your chips"), A.fmt(st.me)) + row(Tf("Fichas de {name}", "{name}'s chips", { name: foe() }), A.fmt(st.rv)) } : { mode: `${NAME()} · ${A.tx(st.table.n)}`,
    note: T("Prototipo contra la banca: aquí la pausa detiene el reloj. En un duelo entre jugadores no habrá pausa.", "Prototype against the house: here the pause stops the clock. A duel between players won't have one."),
    rows: row(T("Tus fichas", "Your chips"), A.fmt(st.me)) + row(T("Fichas de la banca", "The house's chips"), A.fmt(st.rv)) + row(T("Nivel de la banca", "The house's level"), st.level) });

  /* ---------------- las fichas sobre el mapa (tu respuesta y la del rival): piezas sueltas encima del mapa del juego, que siguen su camara.
     Su sitio sale de map.lonLatToScreen (cuentas, sin medir la pagina) y solo se escribe cuando cambia */
  function pinsSet(list, tgt) {
    const host = $("duPins"); if (!host) return; host.querySelectorAll(".pn").forEach(e => e.remove()); host.classList.remove("ln");
    st.pins = list.length ? { list: [], tgt: tgt || null, rect: null, sig: "" } : null; list.forEach(pinAdd);
  }
  function pinAdd(m) {
    const host = $("duPins"), P = st.pins = st.pins || { list: [], tgt: null, rect: null, sig: "" }, dk = parseFloat(document.body.style.getPropertyValue("--dk")) || 1;
    m.el = document.createElement("div"); m.el.className = "pn " + m.who; m.el.innerHTML = `<div class="in${m.drop ? " drop" : ""}"><span class="tag ${m.who} hidden"></span></div>`;
    m.el.firstElementChild.prepend(fichaCv(m.who === "me" ? ME_FICHA : RV_FICHA, 24 * dk)); host.appendChild(m.el); P.list.push(m); P.sig = "";
  }
  const pinTag = (who, txt) => { const m = st.pins && st.pins.list.find(x => x.who === who); if (!m) return; const t = m.el.querySelector(".tag"); t.textContent = txt; t.classList.remove("hidden"); st.pins.sig = ""; };
  function pinsTick() {
    const P = st.pins; if (!P || !P.list.length) return; const map = C().map;
    if (!P.rect) { const r = map.cv.getBoundingClientRect(), a = $("app").getBoundingClientRect(); P.rect = [r.left - a.left, r.top - a.top]; }
    const at = (lon, lat, ct) => { const q = map.lonLatToScreen(lon, lat, ct); return [Math.round(q[0] + P.rect[0]), Math.round(q[1] + P.rect[1])]; }, t = P.tgt ? at(P.tgt[0], P.tgt[1], P.tgt[2]) : null;
    let sig = t ? t.join() : ""; for (const m of P.list) { [m.x, m.y] = at(m.lon, m.lat, m.ct); sig += "|" + m.x + "," + m.y; }
    if (sig === P.sig) return; P.sig = sig;
    const W = innerWidth, a = P.list[0], b = P.list[1], near = a && b && Math.abs(a.y - b.y) < 30 && Math.abs(a.x - b.x) < 220;
    for (const m of P.list) {
      let side = t ? (m.x <= t[0] ? "l" : "r") : "r"; if (side === "l" && m.x < 190) side = "r"; else if (side === "r" && m.x > W - 190) side = "l";
      m.el.style.transform = `translate(${m.x}px, ${m.y}px)`; m.el.className = `pn ${m.who} ${side}${near ? (m === a ? " up" : " dn") : ""}`;
      const ln = $("duPins").querySelector("line." + m.who); if (ln && t) { const on = m.line && Math.hypot(m.x - t[0], m.y - t[1]) > 16; ln.style.display = on ? "" : "none"; if (on) { ln.setAttribute("x1", m.x); ln.setAttribute("y1", m.y); ln.setAttribute("x2", t[0]); ln.setAttribute("y2", t[1]); } }
    }
  }
  /* lo que tapa el duelo en el lienzo del mapa (para encuadrar el revelado en el hueco libre): placa, marcador ya con la fila de la cuenta, crupier, tira del dato y botones */
  function obstacles() {
    const cv = C().map.cv.getBoundingClientRect(), dk = parseFloat(document.body.style.getPropertyValue("--dk")) || 1, out = [];
    const add = (e, p = 12, grow = 0) => { if (!e || !e.getClientRects().length) return; const r = e.getBoundingClientRect(); if (r.width > 1 && r.height > 1) out.push([r.left - cv.left - p, r.top - cv.top - p, r.right - cv.left + p, r.bottom - cv.top + p + grow]); };
    add($("plate")); add($("duHud"), 12, $("duHud").classList.contains("rev") ? 0 : 90 * dk); add($("duSeat"), 0); add($("duTools")); add($("dock")); add($("rail"));
    const w = 592 * dk, h = 132 * dk; out.push([(cv.width - w) / 2 - 12, cv.height - 32 * dk - h - 12, (cv.width + w) / 2 + 12, cv.height]);   // la tira del dato, que aun no ha salido
    return out;
  }

  /* ---------------- la pregunta: la misma para los dos, con el reloj y la placa del juego */
  function ask() {
    const c = C(), S = c.S, cur = nextRound(st); st.phase = "ask"; st.shown = { me: st.me, rv: st.rv }; st.rolled = true;
    if (!st.t0) st.t0 = performance.now();
    S.qs.push(cur.q); S.qi = st.k - 1; S.camp.levels[0].seconds = cur.secs; S.camp.levels[0].kind = cur.q.kind || "city";
    pinsSet([]); $("duHud").classList.remove("rev"); $("duCuenta").innerHTML = ""; $("duFact").classList.add("hidden"); face("sly");
    c.nextQuestion();                                                     // placa, reloj, mapa listo para el clic y D.hud()
    cur.t0 = performance.now(); cur.rvAt = Math.min(cur.bot.t, cur.secs - 0.4);
    if (st.net) { const nt = st.net; cur.t0 = S.t0 = Rd().perfAt(nt.s); cur.rvAt = Infinity; nt.want = st.k; nt.ack = nt.rdy = false; nt.s = 0; netLoop(); }   // entre jugadores, el reloj es el del servidor: empieza para los dos a la vez
    if (st.auto) { cur.auto = botPlay(st.ra, cur.q, cur.d, st.auto.level == null ? st.table.center : st.auto.level); cur.autoAt = Math.min(cur.auto.t, cur.secs - 0.4); }
  }
  /* cuando uno fija, al otro le quedan como mucho lockRush segundos: el reloj de la placa salta a ese tiempo */
  function rush() { const S = C().S, left = S.limit - (performance.now() - S.t0 - S.pausedAcc) / 1000; if (left > CFG.lockRush) S.t0 -= (left - CFG.lockRush) * 1000; }
  function rivalLock() {
    const cur = st.cur; cur.rvLocked = true; cur.rvT = elapsed(); A.sfx.knock();
    if (cur.meAns) return resolve();
    rush(); if (cur.auto) cur.autoAt = Math.min(cur.autoAt, cur.rvT + CFG.lockRush - 0.3);
    D.hud(); face("shock");                                               // su etiqueta en rojo, el reloj a 5 s y el crupier con cara de susto; sin bocadillo
  }
  /* tu respuesta (js/game.js, reveal): guess = { lon, lat }, o null si se acabo el tiempo. Se queda fijada (tu ficha, clavada en el mapa) y el revelado espera al rival */
  D.answer = guess => {
    const cur = st && st.cur; if (!cur || st.phase !== "ask") return;
    if (st.net) {                                                         // entre jugadores: se la manda al servidor y el revelado llega cuando estan las dos (duelView)
      if (cur.meAns || cur.passed) return;
      if (guess) { cur.meAns = { lon: guess.lon, lat: guess.lat, t: Math.max(0, elapsed()) }; pinsSet([{ who: "me", lon: guess.lon, lat: guess.lat, ct: C().map.pickCt, drop: true }]); } else cur.passed = true;
      C().map.setPick(false); D.hud(); return netKick(true);
    }
    if (!guess) return resolve();
    if (cur.meAns) return;
    cur.meAns = { lon: guess.lon, lat: guess.lat, t: elapsed() };
    C().map.setPick(false); pinsSet([{ who: "me", lon: guess.lon, lat: guess.lat, ct: C().map.pickCt, drop: true }]);
    if (cur.rvLocked) return resolve();
    cur.rvAt = Math.min(cur.rvAt, cur.meAns.t + CFG.lockRush - 0.3); rush(); D.hud();
  };
  function tick() {
    raf = st ? requestAnimationFrame(tick) : 0; if (!st) return;
    const c = C(), S = c.S, cur = st.cur, own = $("duOwn");
    if (st.pins) pinsTick();
    if (own) { const hide = !!DL().busy; if (hide !== st.ownOff) { st.ownOff = hide; own.classList.toggle("hidden", hide); if (st.spr) st.spr.shown(!hide); } }   // nunca dos crupieres: el de las frases, mientras hable, ocupa el sitio
    if (st.phase !== "ask" || !cur || !cur.t0 || S.phase !== "asking" || S.paused) return;
    const el = elapsed();
    if (cur.meAns && c.map.pickEnabled) c.map.setPick(false);              // volver de la pausa no reabre una respuesta ya fijada
    if (!cur.rvLocked && el >= cur.rvAt) return rivalLock();
    if (cur.auto && !cur.meAns && el >= cur.autoAt) c.map.onPick(cur.auto.lon, cur.auto.lat);
  }

  /* ================================================================== 4 · EL REVELADO: el mapa vuela al lugar, cae la bandera y las dos fichas, y la cuenta se hace dentro del marcador */
  function resolve(net) {                                                 // net (entre jugadores): { me, rv } = las dos respuestas tal como las guardo el servidor ({ lon, lat, t } o null)
    const c = C(), S = c.S, map = c.map, cur = st.cur, q = cur.q, R = CFG.rev; if (st.phase !== "ask") return;
    if (net) { if (!net.me && cur.meAns) pinsSet([]); cur.meAns = net.me; }   // una respuesta que llego fuera de plazo no cuenta
    const tEnd = elapsed(); st.secs += tEnd;
    st.phase = "reveal"; S.phase = "reveal"; S.tense = false; map.setPick(false); A.music.mode(1); $("plate").classList.remove("hurry"); st.rolled = false;
    if (!cur.rvLocked) { cur.rvLocked = true; cur.rvT = Math.min(cur.rvAt, tEnd); }
    const rd = settle(st, cur.meAns, net ? net.rv : { lon: cur.bot.lon, lat: cur.bot.lat, t: cur.rvT }), me = rd.me, rv = rd.rv, g = cur.meAns, tok = st.k, live = () => st && st.k === tok && st.phase === "reveal";
    const cx = g && !st.auto && A.codexUnlock ? A.codexUnlock(q, me.km) : { added: [], level: 0 }; rd.cards = cx.added;   // la Enciclopedia, en silencio: se ensena en el veredicto
    D.hud();
    /* el objetivo, como en el revelado de siempre: el lugar con su bandera en el mastil, el pais resaltado o la masa de agua */
    const af = A.waters && A.waters.of(q), isC = q.t === "c" || !!af, fC = isC && !af ? c.world.byName[q.key] : null; let ans = null, span, labelAt = null;
    if (af) { span = [[af.bbox[0], af.bbox[1]], [af.bbox[2], af.bbox[3]]]; labelAt = [q.lon, q.lat]; }
    else if (isC) { const b = big(fC).bbox; span = [[b[0], b[1]], [b[2], b[3]]]; labelAt = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; }
    else { ans = [q.lon, q.lat]; span = [ans]; }
    const tgt = ans || labelAt, near = lon => lon + 360 * Math.round((tgt[0] - lon) / 360), gLon = g ? near(g.lon) : null, rLon = rv.lon == null ? null : near(rv.lon);   // por el camino corto (antimeridiano)
    const label = q.clue ? A.tx(q.answer) : A.tx(q.name), kmTxt = s => (s.km > 0 ? A.fmtDist(s.km) : T("dentro", "inside")), fl = c.flagsOf(q);
    const lim = A.codexLimits && q.cid ? A.codexLimits({ id: q.cid[0], cids: q.cid }) : [300, 150, 75];
    map.setMarks({ guess: null, answer: ans, highlight: fC ? q.key : null, area: af || null, label, labelAt, dist: "", pop: null, flags: fl.length ? fl.map(c.flagImg) : null,
      rings: ans ? { r: lim, n: cx.level, at: [0, 1, 2].map(i => R.me + 150 + i * 180) } : null });
    if (!st.pins) st.pins = { list: [], tgt: null, rect: null, sig: "" };
    if (g && !st.pins.list.some(x => x.who === "me")) pinAdd({ who: "me", lon: gLon, lat: g.lat, ct: map.pickCt });
    const mine = st.pins.list.find(x => x.who === "me"); if (mine) { mine.lon = gLon; mine.line = me.km > 0; }
    st.pins.tgt = [tgt[0], tgt[1], fC && fC.ct]; st.pins.sig = "";
    const fpts = (isC ? span.map(p => [p[0], p[1], fC && fC.ct]) : [[ans[0], ans[1]]]).concat(g ? [[gLon, g.lat, map.pickCt]] : [], rLon == null ? [] : [[rLon, rv.lat]]);
    requestAnimationFrame(() => { if (!live()) return; if (map.frameReveal) map.frameReveal(fpts, obstacles(), { l: 110, r: 110, t: 96, b: 44 }, 1100); else map.fitPoints(fpts.map(p => [p[0], p[1]]), undefined, 1100); });

    /* la cuenta, a la vista y por golpes: tus puntos, los suyos, DIFERENCIA x RONDA = fichas */
    const win = rd.pay > 0, lose = rd.pay < 0, tier = !g ? 5 : me.km <= 75 ? 4 : me.km <= 150 ? 3 : me.km <= 300 ? 2 : me.km <= 600 ? 1 : 0;
    const box = (id, cls, small, v) => `<div class="box ${cls} w" id="${id}"><small>${small}</small><b>${v}</b></div>`, off = s => { if (s.km == null) return T("En blanco", "Blank"); if (!(s.km > 0)) return T("Dentro", "Inside"); const d = A.fmtDist(s.km); return d.length > 6 ? d : Tf("A {d}", "{d} off", { d }); };   // etiquetas cortas: la fila no da para mas
    $("duCuenta").innerHTML = `<div class="lft">${box("duBm", "me", off(me), A.fmt(me.pts))}</div>
      <div class="mx">${box("duBd", "dk", T("Diferencia", "Difference"), A.fmt(Math.abs(rd.diff)))}<span class="op w" id="duO1">×</span>${box("duBx", "red", T("Ronda", "Round"), "×" + fmtM(rd.mult))}<span class="op w" id="duO2">=</span>${box("duBp", win ? "me" : lose ? "rv" : "dk", win ? T("Para ti", "For you") : lose ? T("Pagas tú", "You pay") : T("Nadie paga", "No one pays"), A.fmt(Math.abs(rd.pay)))}</div>
      <div class="rgt">${box("duBr", "rv", off(rv), A.fmt(rv.pts))}</div>`;
    const show = (ids, beat) => () => { if (!live()) return; ids.forEach(id => { const e = $(id); if (e) e.classList.remove("w"); }); if (beat != null && A.sfx.golpe) A.sfx.golpe(beat); };
    later(() => { if (live()) A.sfx.reveal(tier); }, 480);
    if (fl.length) later(() => { if (live() && A.sfx.flag) A.sfx.flag(fl.length); }, 650);
    later(() => { if (live() && g) pinTag("me", `${ME()} · ${kmTxt(me)}`); }, R.me);
    later(() => { if (!live() || rLon == null) return; pinAdd({ who: "rv", lon: rLon, lat: rv.lat, drop: true, line: rv.km > 0 }); pinTag("rv", `${cut(foeRaw(), 13)} · ${kmTxt(rv)}`); if (A.sfx.bankPin) A.sfx.bankPin(); }, R.rv);
    later(() => { if (live()) $("duPins").classList.add("ln"); }, R.lines);
    later(() => { if (!live()) return; $("duHud").classList.add("rev"); factShow(q, label, fl); }, R.row);
    later(show(["duBm"], 0), R.pm); later(show(["duBr"], 1), R.pr); later(show(["duBd"], 2), R.diff); later(show(["duO1", "duBx"], 3), R.mult);
    later(() => { show(["duO2", "duBp"])(); if (!live()) return; if (rd.pay) A.sfx.countEnd();
      if (st.net) face(!rd.pay ? "puzzled" : Math.abs(rd.pay) >= 900 ? "shock" : win ? "wink" : "smug");   // entre jugadores el crupier no cobra ni paga: solo mira
      else face(lose ? (-rd.pay >= 900 ? "laugh" : "smug") : win ? (rd.pay >= 900 ? "angry" : "suspicious") : "puzzled"); }, R.pay);
    later(() => { if (live() && rd.pay) fly(win ? "rv" : "me", win ? "me" : "rv"); }, R.fly);
    later(() => { if (!live()) return; st.shown = { me: st.me, rv: st.rv }; st.rolled = true; D.hud(); c.odoSet($("duMe"), st.me, { ms: R.rollMs, tick: !!rd.pay && win }); c.odoSet($("duRv"), st.rv, { ms: R.rollMs, tick: !!rd.pay && lose }); }, R.roll);
    /* avanza sola: los tres ultimos segundos se cuentan en la tira del dato; con el menu o Ajustes delante, espera */
    const total = st.auto && st.auto.next != null ? st.auto.next : CFG.revealSecs * 1000, go = () => { if (!live()) return; if (veiled() && !st.net) return later(go, 400); if (st.over) finish(); else ask(); };
    /* entre jugadores: «listo para la siguiente» sale ya, y la pregunta empieza para los dos a la hora que diga el servidor (netGo) */
    if (st.net && !st.over) { netReady(st.k + 1, total); later(() => { const e = $("duNext"); if (live() && e && e.classList.contains("hidden")) { e.textContent = T("Esperando…", "Waiting…"); e.classList.remove("hidden"); } }, total + 700); return; }
    for (let n = 3; n >= 1; n--) if (total - n * 1000 > R.row) later(() => { const e = $("duNext"); if (live() && e) { e.textContent = Tf("Sigue en {n}", "Next in {n}", { n }); e.classList.remove("hidden"); } }, total - n * 1000);
    later(go, total);
  }
  /* el dato de la tira: las primeras frases del dato del lugar hasta unas 130 letras, sin cortar ninguna a medias (ni en una abreviatura: «a. C.», «EE. UU.») */
  const shortFact = t => { const parts = String(t || "").split(/(?<=[a-záéíóúñ)\]»”"]{3}[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«“"(])/); let out = ""; for (const p of parts) { if (out && out.length + p.length > 130) break; out += (out ? " " : "") + p; } return out.trim(); };
  /* la tira de papel de abajo: la bandera, el nombre y el dato del lugar */
  function factShow(q, label, fl) {
    const F = $("duFact"), isC = q.t === "c", sub = isC || q.clue ? "" : A.tx(q.sub) || "", pid = q.cid[q.cid.length - 1];
    const fact = shortFact(A.tx(q.fact) || (A.factOf ? A.factOf({ cid: [pid] }) : ""));
    F.innerHTML = `<div class="gx-paper${fl.length ? "" : " nf"}">${fl.length ? `<img class="fg" src="assets/flags/p/${A.mediaKey(fl[0])}.webp" alt="" draggable="false">` : ""}<div><b>${esc(label)}${sub ? " · " + esc(sub) : ""}</b>${fact ? `<span>${esc(fact)}</span>` : ""}</div><span class="tag hidden" id="duNext"></span></div>`;
    F.classList.remove("hidden"); factFit();
  }
  /* una medida al salir la tira (y al cambiar la ventana), nunca por fotograma */
  function factFit() {
    const F = $("duFact"), t = $("duTools"); if (!F || !t || F.classList.contains("hidden")) return; F.style.translate = "";
    const dk = parseFloat(document.body.style.getPropertyValue("--dk")) || 1, need = t.getBoundingClientRect().right + 10 - F.getBoundingClientRect().left;
    if (need > 0) F.style.translate = (need / dk).toFixed(1) + "px 0";
  }
  /* las fichas cruzan del que paga al que cobra (curva continua, solo transform) */
  function fly(from, to) {
    const a = document.querySelector(`#duHud [data-src="${from}"]`), b = document.querySelector(`#duHud [data-src="${to}"]`), app = $("app"); if (!a || !b || !a.animate || C().S.reduce) { A.sfx.chip(0.5); return; }
    const ar = app.getBoundingClientRect(), dk = parseFloat(document.body.style.getPropertyValue("--dk")) || 1, ctr = e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2 - ar.left, r.top + r.height / 2 - ar.top]; };
    const [x0, y0] = ctr(a), [x1, y1] = ctr(b), R = CFG.rev;
    for (let i = 0; i < R.flyN; i++) {
      const cv = fichaCv(from === "me" ? ME_FICHA : RV_FICHA, 32 * dk, 16), h = parseFloat(cv.style.width) / 2, jx = ((i % 3) - 1) * 10 * dk, jy = (i % 2) * 12 * dk; cv.className = "du-fly"; app.appendChild(cv);
      cv.animate([{ transform: `translate(${x0 + jx - h}px, ${y0 + jy - h}px)`, opacity: 1 }, { transform: `translate(${(x0 + x1) / 2 - h}px, ${Math.max(y0, y1) + 52 * dk + jy - h}px)`, opacity: 1, offset: 0.5 }, { transform: `translate(${x1 - h}px, ${y1 - h}px)`, opacity: 1 }],
        { duration: R.flyMs, delay: i * R.flyGap, easing: "cubic-bezier(.4, 0, .5, 1)", fill: "both" }).onfinish = () => { cv.remove(); A.sfx.chip(i / R.flyN); };
      setTimeout(() => cv.remove(), R.flyMs + i * R.flyGap + 400);
    }
  }

  /* ================================================================== 5 · EL VEREDICTO: titular, la cuenta ronda a ronda, las dos pilas sobre la tarima y las tarjetas nuevas */
  function finish() {
    const c = C(), S = c.S, map = c.map, o = st.over, tb = st.table, s = st, win = !!o.win, nt = st.net; st.phase = "end"; S.phase = "levelEnd"; timers.forEach(clearTimeout); timers = [];
    if (nt && veiled() && !S.settingsOpen) c.runMenu();                    // entre jugadores el menu no para nada: si estaba abierto, se cierra para ver el veredicto
    map.clearMarks(); map.setDecoys([]); map.animateTo(map.home(), 900); map.setPick(false); pinsSet([]);
    $("plate").classList.add("hidden"); $("pauseBtn").classList.add("hidden"); document.querySelectorAll(".du-fly").forEach(e => e.remove());
    for (const id of ["duHud", "duSeat", "duTools", "duFact"]) { const e = $(id); if (e) e.classList.add("hidden"); }
    const sum = (D.last = summary(st)), was = stats(), now = st.auto || nt ? was : statsAdd(win), pct = x => (x.d ? Math.round((100 * x.w) / x.d) : 0), fo = foe();
    if (nt && !nt.counted) { nt.counted = true; N.score[win ? "me" : "rv"]++; }   // el marcador de la sala (los amistosos no cuentan para tus duelos contra la banca)
    const sc = N.score, share = (w, t) => (t > 0 ? w / t : 0.5);
    A.sfx.stamp(); setTimeout(win ? A.sfx.victory : A.sfx.fail, 380);
    const lead = o.lost ? T("Has estado demasiado rato sin conexión.", "You were offline for too long.")
      : o.left ? (o.cut ? Tf("{name} ha perdido la conexión.", "{name} lost their connection.", { name: fo }) : Tf("{name} se ha levantado de la mesa.", "{name} left the table.", { name: fo }))
      : o.quit === "rv" ? Tf("{name} se ha rendido en la ronda {n}.", "{name} gave up in round {n}.", { name: fo, n: o.rounds })
      : o.quit ? Tf("Te has rendido en la ronda {n}.", "You gave up in round {n}.", { n: o.rounds })
      : o.ko ? (win ? Tf("{name} se ha quedado sin fichas en la ronda {n}.", "{name} ran out of chips in round {n}.", { name: fo, n: o.rounds }) : Tf("Te has quedado sin fichas en la ronda {n}.", "You ran out of chips in round {n}.", { n: o.rounds }))
      : o.rounds > CFG.rounds ? Tf("Empate al tope: se ha decidido en la ronda extra {n}.", "Tied at the cap: settled in extra round {n}.", { n: o.rounds }) : Tf("Tope de {n} rondas: gana quien tiene más fichas.", "{n}-round cap: whoever holds more chips wins.", { n: CFG.rounds });
    const sgn = v => (v > 0 ? "+" : v < 0 ? "−" : "") + A.fmt(Math.abs(v)), hpx = v => (v > 0 ? 14 + 7 * Math.round((v / (2 * CFG.stack)) * 26) : 0), me = Math.max(0, st.me), rv = Math.max(0, st.rv);
    const rows = st.log.map(r => `<div class="ln"><i>${pad2(r.k)}</i><span>${(n => (r.q.kind === "flag" ? Tf("Bandera de {n}", "Flag of {n}", { n }) : n))(esc(r.q.clue ? A.tx(r.q.answer) : A.tx(r.q.name)))}</span><i>×${fmtM(r.mult)}</i><b class="${r.pay > 0 ? "up" : r.pay < 0 ? "dn" : ""}">${sgn(r.pay)}</b></div>`).join("");
    /* tarjetas nuevas: una polaroid por lugar con tarjetas ganadas en este duelo (hasta seis), con su foto de la Enciclopedia */
    const places = st.log.filter(r => r.cards && r.cards.length).map(r => ({ id: r.q.cid[r.q.cid.length - 1], n: r.q.clue ? A.tx(r.q.answer) : A.tx(r.q.name) })), nCards = st.log.reduce((n, r) => n + ((r.cards && r.cards.length) || 0), 0);
    const pol = places.length ? `<div class="pol"><span class="gx-eyb">${T("Tarjetas nuevas", "New cards")} · ${nCards}</span><div class="rw">${places.slice(0, 6).map((p, i) => `<figure class="drop" style="--d:${(1.3 + i * 0.15).toFixed(2)}s" data-id="${esc(p.id)}"><span class="ph"></span><figcaption>${esc(p.n)}</figcaption></figure>`).join("")}</div></div>` : "";
    const pile = (cls, v) => `<div class="pile ${cls}${v ? "" : " zero"}" style="--h:${hpx(v)}px"></div>`;
    c.dialog(stage("du-fin", `<div class="tit"><span class="gx-eyb">${NAME()} · ${A.tx(tb.n)}</span><h2 class="gx-t-xl">${win ? T("Victoria", "Victory") : T("Derrota", "Defeat")}</h2><p class="gx-lead">${lead}</p>
        ${nt ? `<div class="liga rise" style="--d:.9s"><div class="gx-pnl">${A.icon(ME_CHIP)}<b>${T("Marcador de la sala", "Room score")}</b><div class="gx-bar"><i style="--s0:${share(sc.me - (win ? 1 : 0), sc.me + sc.rv - 1)};--s1:${share(sc.me, sc.me + sc.rv)}"></i></div>
          <p>${myName() || ME()} ${sc.me} · ${fo} ${sc.rv}. ${T("Amistoso: no cuenta para la liga.", "Friendly: doesn't count for the league.")}</p></div></div>`
        : `<div class="liga rise" style="--d:.9s"><div class="gx-pnl">${A.icon(ME_CHIP)}<b>${T("Contra la banca", "Against the house")}</b><div class="gx-bar"><i style="--s0:${pct(was) / 100};--s1:${pct(now) / 100}"></i></div>
          <p>${tally(now)} ${now.s > 1 ? Tf("Racha de {n} seguidas.", "{n} in a row.", { n: now.s }) : !win && was.s > 1 ? T("Racha cortada.", "Streak broken.") : ""}</p></div></div>`}${pol}</div>
      <div class="tk drop" style="--d:.15s"><div class="gx-paper"><span class="gx-eyb">${T("La cuenta", "The tally")}</span>${rows}<div class="gx-hr"></div>${row(T("Tu pila", "Your stack"), A.fmt(me))}</div></div>
      <div class="mesa"><div class="col"><b class="me">${A.fmt(me)}</b><span>${myName() || ME()}</span>${pile("me", me)}</div><div class="col"><b class="rv">${A.fmt(rv)}</b><span>${fo}</span>${pile("rv", rv)}</div><div class="dais"></div></div>
      <div class="seatw" id="duVdSeat"></div>
      <div class="gx-acts"><button type="button" class="gx-btn gho" id="duExit"><span>${nt ? T("Salir de la sala", "Leave the room") : T("Salir", "Exit")}</span>${A.gala.keyHint("Esc", "b")}</button>${nt ? primary("duRoom", T("Volver a la sala", "Back to the room")) : `<button type="button" class="gx-btn" id="duTables"><span>${T("Otra mesa", "Another table")}</span></button>${primary("duRematch", T("Revancha", "Rematch"))}`}</div>`), "tablewrap");
    document.querySelectorAll("#dlg .pol figure").forEach(f => { const id = f.dataset.id, k = A.mediaKey(id), im = new Image(); im.alt = ""; im.decoding = "async"; im.onload = () => f.querySelector(".ph").replaceWith(im); im.onerror = () => { if (!im.dataset.b) { im.dataset.b = 1; im.src = A.media(`assets/wiki/card/${k}.webp`); } }; im.src = A.media(`assets/wiki/th/${k}.webp`); });
    $("duExit").onclick = () => c.showHub("home");
    if (nt) $("duRoom").onclick = roomBack;
    else { $("duRematch").onclick = () => D.start({ table: tb.id, level: s.level, auto: s.auto }); $("duTables").onclick = () => { c.showHub("home"); D.open(); }; }
    seat($("duVdSeat"));
    if (nt) speak(line(o.lost ? "lost2" : o.left ? "left2" : o.quit === "rv" ? "quit2" : o.quit ? "quit" : win ? "win2" : "lose2"), win ? { gesture: "hat_tip" } : { face: "sly" });
    else speak(line(o.quit ? "quit" : win ? "win" : "lose"), win ? { gesture: "hat_tip" } : { face: "laugh" });
    if (A.coverMap) A.coverMap("duelo", true, () => !!document.querySelector("#dlg .du-wrap") && !$("layer").classList.contains("hidden"));
    if (st.auto && st.auto.done) st.auto.done(sum);
  }
  /* ================================================================== ENTRE JUGADORES · LA SALA PRIVADA (un amigo, con un codigo)
     El servidor (api/duelo.js) solo guarda la sala, el reloj de cada ronda y las dos respuestas. Un unico bucle de sondeo (netLoop) pregunta el
     estado cada poco y netView lo aplica. Todo se puede repetir sin efecto: si un mensaje se pierde, el siguiente sondeo lo reenvia (netBody).
     N = la sala en la que estas: code, role ("h" anfitrion / "g" invitado), R (el ultimo estado), n (el ultimo duelo empezado), okAt / cut (la
     ultima respuesta buena y si llevas mas de 4 s sin ninguna) y score (victorias de cada uno en esta sala). st.net = el duelo en curso: n, his (nombre del rival), want (la ronda
     que esperas), s (cuando empieza, hora del servidor), rdy / ack (el servidor ya tiene tu «listo» / tu respuesta) y off (el rival no da senal) */
  const N = { code: "", role: "", R: null, n: 0, tm: 0, okAt: 0, cut: false, fly: 0, q: 0, qa: 0, busy: false, keep: false, sig: "", said: "", gone: 0, had: false, score: { me: 0, rv: 0 } };
  const Rd = () => A.dueloRed, rawName = () => (A.profile && A.profile.get().name) || "";
  const hisSeat = v => (v ? (N.role === "h" ? v.g : v.h) : null);
  const inSala = () => !!document.querySelector("#dlg .du-wrap .lob"), inRoom = () => !!document.querySelector("#dlg .du-wrap .pv");
  const send = body => Rd().call({ code: N.code, ...body });
  /* manda y aplica la respuesta (netView). Las respuestas buenas que llegan desordenadas se descartan: manda la mas nueva */
  const sendV = body => { const q = ++N.q, code = N.code; return send(body).then(x => { if (N.code !== code) return; if (x && x.ok) { if (q < N.qa) return; N.qa = q; } netView(x, code); }); };
  /* la firma del duelo: version del juego, reglas y banco de preguntas. Solo se sientan juntos dos juegos que vayan a sacar el mismo duelo */
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  let SIG = ""; const sig = () => SIG || (SIG = "d1." + A.VERSION + "." + hash(JSON.stringify([CFG.stack, CFG.scale, CFG.rounds, CFG.mult, CFG.clock, CFG.lockRush, CFG.ladder, CFG.tables.map(t => [t.id, t.center])]) + pool().map(e => e.id + ":" + e.d + ":" + e.cont).join("|")));

  /* ---------------- abrir una sala o entrar en la de tu amigo (desde «Retar a un amigo») */
  async function roomNew() {
    if (N.busy) return; N.busy = true; A.sfx.ui(); salaMsg(T("Abriendo la sala…", "Opening the room…"));
    const v = await Rd().call({ a: "new", name: rawName(), ver: sig(), t: sel.table }); N.busy = false;
    if (!inSala()) { if (v.ok) Rd().call({ a: "bye", code: v.code }); return; }   // se fue mientras se abria
    if (!v.ok) { A.sfx.deny(); return salaMsg(whyTxt(v.why), true); }
    roomSet(v);
  }
  async function roomJoin(code) {
    code = String(code || "").toUpperCase(); if (N.busy) return;
    if (code.length !== 5) { A.sfx.deny(); return salaMsg(whyTxt("short"), true); }
    N.busy = true; A.sfx.ui(); salaMsg(T("Llamando a la puerta…", "Knocking on the door…"));
    const v = await Rd().call({ a: "join", code, name: rawName(), ver: sig() }); N.busy = false;
    if (!inSala()) { if (v.ok) Rd().call({ a: "bye", code }); return; }
    if (!v.ok) { A.sfx.deny(); return salaMsg(whyTxt(v.why), true); }
    roomSet(v);
  }
  function roomSet(v) { Object.assign(N, { code: v.code, role: v.role, R: v, n: v.n, okAt: performance.now(), cut: false, fly: 0, gone: 0, said: "", had: false, score: { me: 0, rv: 0 } }); A.sfx.depart(); roomOpen(); netLoop(); }
  function netBye() { const code = N.code; clearTimeout(N.tm); N.tm = 0; N.code = ""; N.R = null; N.busy = false; if (code) Rd().call({ a: "bye", code }); }
  addEventListener("pagehide", () => { if (N.code) Rd().bye({ a: "bye", code: N.code }); });   // al cerrar el juego: el asiento queda libre (o la sala, cerrada)

  /* ---------------- 6 · LA SALA PRIVADA: los dos asientos, la mesa (la elige el anfitrion) y «Repartir» */
  function roomOpen() {
    const c = C(), S = c.S; fitDk(); S.hub = "duelo";
    const tile = t => `<button type="button" class="ms" data-t="${t.id}">${A.icon(t.chip)}<span><b>${A.tx(t.n)}</b><i>${T("dificultad", "difficulty")} ${range(t)}</i></span></button>`;
    c.dialog(stage("pv", `<div class="hd"><button type="button" class="gx-btn sm" id="hubBack">${A.icon("u_back")}<span>${T("Salir de la sala", "Leave the room")}</span>${A.gala.keyHint("Esc", "b")}</button><h2 class="gx-t-l">${T("Sala privada", "Private room")}</h2><span class="gx-eyb">${T("Amistoso · no cuenta para la liga", "Friendly · doesn't count for the league")}</span></div>
      <div class="tbl gx-sh"><div class="gx-pnl"><div class="asi" id="duSwH"></div>
        <div class="opc"><span class="gx-eyb" id="duRoomEyb"></span><div class="mss" id="duMesas">${CFG.tables.map(tile).join("")}</div>
          <div class="regl"><span>${A.icon("chip_k")}<b>${A.fmt(CFG.stack)}</b> ${T("fichas cada uno", "chips each")}</span><span>${A.icon("boss_hat")}${T("Hasta", "Up to")} <b>${CFG.rounds}</b> ${T("rondas", "rounds")}</span><span>${A.icon("coin")}${T("Paga la <b>diferencia</b> por la ronda", "Pays the <b>difference</b> times the round")}</span></div>
          <p class="est" id="duRoomSt" role="status"></p></div>
        <div class="asi" id="duSwG"></div></div></div>
      <div class="ft"><div class="seatw" id="duSalaSeat"></div><div class="gx-acts">${primary("duDeal", T("Repartir", "Deal"))}</div></div>`), "tablewrap");
    $("hubBack").onclick = () => { A.sfx.ui(); netBye(); sel.door = "amigo"; D.open(); };
    $("duMesas").onclick = e => { const b = e.target.closest(".ms"), v = N.R; if (!b || N.role !== "h" || !v || v.st === "play" || b.dataset.t === v.t) return; A.sfx.card(); v.t = b.dataset.t; N.setT = { t: v.t, at: performance.now() }; roomPaint(); sendV({ a: "set", t: v.t }); };
    $("duDeal").onclick = () => { const v = N.R, g = v && v.g; if (N.role !== "h" || !g || !g.in || g.out || N.busy) return A.sfx.deny(); N.busy = true; sendV({ a: "deal" }).then(() => { N.busy = false; }); };
    seat($("duSalaSeat")); N.sig = ""; roomPaint();
    if (A.coverMap) A.coverMap("duelo", true, () => !!document.querySelector("#dlg .du-wrap") && !$("layer").classList.contains("hidden"));
  }
  /* al portapapeles (y, si el navegador no deja, a la manera antigua). Devuelve si se pudo */
  const copy = t => { const old = () => { try { const a = document.createElement("textarea"); a.value = t; a.style.cssText = "position:fixed;left:0;top:0;opacity:0"; document.body.appendChild(a); a.select(); const ok = document.execCommand("copy"); a.remove(); return !!ok; } catch (e) { return false; } };
    try { return navigator.clipboard.writeText(t).then(() => true, old); } catch (e) { return Promise.resolve(old()); } };
  /* pinta la sala con el ultimo estado; solo toca la pagina cuando algo ha cambiado */
  function roomPaint() {
    const v = N.R; if (!v || !inRoom()) return;
    const host = N.role === "h", g = v.g && !v.g.out ? v.g : null, cutoff = N.cut, role = r => (r === "h" ? T("Anfitrión", "Host") : T("Invitado", "Guest"));
    const say = !g ? (host ? "open" : "") : host ? "both" : "guest"; if (say && say !== N.said) { N.said = say; speak(line("r_" + say), { valid: inRoom }); }   // el crupier comenta cada cosa una vez (si esta hablando, espera su turno)
    const sg = JSON.stringify([v.code, v.t, v.st, N.role, N.score, cutoff, [v.h, g].map(s => s && [s.n, s.on, s.in])]); if (sg === N.sig) return; N.sig = sg;
    const card = (s, r) => { const mine = r === N.role, w = mine ? N.score.me : N.score.rv, played = N.score.me + N.score.rv > 0;
      return `<div class="gx-paper">${A.icon(mine ? ME_CHIP : RV_CHIP)}<h3 class="ink">${esc(s.n) || role(r)}</h3><span class="tag ${mine ? "me" : "rv"}">${role(r)}</span><span class="sub">${mine ? ME() : !s.on ? T("Sin señal", "No signal") : !s.in ? T("Mirando el veredicto", "Reading the verdict") : T("En la mesa", "At the table")}${played ? ` · ${T("Victorias", "Wins")}: ${w}` : ""}</span></div>`; };
    const H = $("duSwH"), G = $("duSwG"), fresh = !!g && !N.had; N.had = !!g;
    H.innerHTML = card(v.h, "h"); H.className = "asi occ";
    G.innerHTML = g ? card(g, "g") : `<div class="libre"><span>${T("Asiento libre", "Empty seat")}</span><b class="cod">${v.code}</b><span class="gx-acts"><button type="button" class="gx-btn sm" id="duCopy">${T("Copiar el código", "Copy the code")}</button></span><small>${T("Pásaselo a tu amigo: lo escribe en «Retar a un amigo».", "Send it to your friend: they type it under “Challenge a friend”.")}</small></div>`;
    G.className = "asi" + (g ? " occ" : "") + (fresh ? " fromR" : "");
    $("duRoomEyb").textContent = `${T("Sala", "Room")} ${v.code} · ${T("la mesa", "the table")}`;
    document.querySelectorAll("#duMesas .ms").forEach(x => { const on = x.dataset.t === v.t; x.classList.toggle("on", on); x.classList.toggle("ro", !host); x.setAttribute("aria-pressed", on); });
    const ok = host && g && g.in, b = $("duDeal"); b.classList.toggle("dis", !ok); b.setAttribute("aria-disabled", !ok);
    $("duRoomSt").textContent = cutoff ? T("Sin conexión. Reintentando…", "No connection. Retrying…")
      : host ? (!g ? T("Tú eliges la mesa. Cuando se siente tu amigo, repartes.", "You pick the table. Once your friend sits down, you deal.") : !g.in ? T("Tu amigo sigue mirando el veredicto.", "Your friend is still reading the verdict.") : T("Los dos en la mesa. Reparte cuando quieras.", "Both at the table. Deal whenever you like."))
      : !v.h.in ? T("El anfitrión sigue mirando el veredicto.", "The host is still reading the verdict.") : T("La mesa la elige el anfitrión. Empieza cuando reparta.", "The host picks the table. It starts when they deal.");
    const cp = $("duCopy"); if (cp) cp.onclick = () => { A.sfx.ui(); copy(v.code).then(ok => { cp.textContent = ok ? T("Copiado", "Copied") : T("Cópialo a mano", "Copy it by hand"); }); };
  }
  /* del veredicto a la sala (los dos siguen sentados; reparte otra vez el anfitrion) */
  function roomBack() {
    const c = C(); A.sfx.ui();
    if (!N.code) { c.showHub("home"); sel.door = "amigo"; sel.msg = whyTxt("closed"); return D.open(); }   // la sala ya no existe
    N.keep = true; c.showHub("home"); N.keep = false;
    const v = N.R, me = v && (N.role === "h" ? v.h : v.g); if (v) v.st = "lobby"; if (me) me.in = true;
    roomOpen(); sendV({ a: "back" }); netLoop();
  }

  /* ---------------- el bucle de sondeo: mas vivo con el reloj corriendo, mas lento en la sala y en el veredicto. Va con temporizador (no con
     fotogramas): con la ventana minimizada el duelo sigue y el otro no se queda esperando */
  function netLoop() {
    clearTimeout(N.tm); N.tm = 0; if (!N.code) return;
    N.tm = setTimeout(netKick, !st || !st.net ? 1500 : st.phase === "ask" || st.phase === "wait" ? 450 : st.phase === "end" ? 3000 : 800);
  }
  /* un latido: manda lo pendiente (o solo pregunta) y deja puesto el siguiente SIN esperar la respuesta: si la red se atasca el duelo no se queda
     parado (como mucho dos llamadas en el aire; `now`: lo tuyo no espera). Mas de 4 s sin respuesta = sin conexion: se avisa y se sigue intentando */
  function netKick(now) {
    clearTimeout(N.tm); N.tm = 0; const code = N.code; if (!code) return;
    const cut = performance.now() - N.okAt > 4000; if (cut !== N.cut) { N.cut = cut; netPaint(); }
    const body = N.fly < (now === true ? 4 : 2) && netBody(); if (N.code !== code) return;   // (netBody puede levantarse de la sala)
    if (body) { N.fly++; sendV(body).then(() => { if (N.code === code) N.fly--; }); }
    netLoop();
  }
  const netPaint = () => { if (st && st.net) D.hud(); else { N.sig = ""; roomPaint(); } };
  /* que decirle al servidor ahora: lo pendiente (mi «listo», mi respuesta) o, si no hay nada, solo preguntar */
  function netBody() {
    if (!st || !st.net) { if (!inRoom()) { if (++N.gone > 1) netBye(); return null; } N.gone = 0; return { a: "poll" }; }   // fuera de la sala por otro camino: se levanta
    const nt = st.net, cur = st.cur, b = { n: nt.n, k: Math.max(1, nt.want || st.k) };
    if (st.phase === "end") return { a: "poll", n: nt.n };
    if (nt.want > st.k) return nt.rdy ? { ...b, a: "poll" } : { ...b, a: "ready", secs: secsOf(nt.want), rush: CFG.lockRush, wait: Math.max(0, Math.round(nt.goAt - performance.now())) };
    if (st.phase === "ask" && cur && !nt.ack) { if (cur.meAns) return { ...b, a: "lock", lon: cur.meAns.lon, lat: cur.meAns.lat, t: cur.meAns.t }; if (cur.passed) return { ...b, a: "pass" }; }
    return { ...b, a: "poll" };
  }
  function netView(v, code) {
    if (!N.code || (code && code !== N.code)) return;                     // respuesta de una sala de la que ya te has ido
    if (!v || !v.ok) {
      const w = v && v.why;
      if (w === "none" || w === "out") {                                  // la sala ya no existe: la cerro el anfitrion o caduco
        clearTimeout(N.tm); N.tm = 0; N.code = ""; N.R = null;
        if (st && st.net) netOver({ win: true, left: true }); else if (inRoom()) { sel.door = "amigo"; sel.msg = whyTxt("closed"); D.open(); }
        return;
      }
      return;                                                             // sin red o el servidor no contesta: se sigue intentando (netKick avisa a los 4 s)
    }
    N.okAt = performance.now(); N.role = v.role; N.R = v; if (N.cut) { N.cut = false; netPaint(); }
    if (st && st.net) return duelView(v);
    if (!inRoom()) return;
    if (N.setT) { if (v.t === N.setT.t || N.role !== "h" || performance.now() - N.setT.at > 4000) N.setT = null; else v.t = N.setT.t; }   // la mesa recien elegida no parpadea si llega una respuesta de antes del cambio
    if (v.st === "play" && v.n > N.n && v.seed) { N.n = v.n; const o = hisSeat(v); return void D.start({ table: v.t, seed: v.seed, net: { n: v.n, his: (o && o.n) || "", want: 0, s: 0 } }); }   // el anfitrion ha repartido
    roomPaint();
  }

  /* ---------------- el duelo, visto desde el servidor */
  const ansOf = s => { if (!s || s === "0") return null; try { const a = JSON.parse(s); return a && Number.isFinite(a.lon) && Number.isFinite(a.lat) ? { lon: a.lon, lat: a.lat, t: +a.t || 0 } : null; } catch (e) { return null; } };
  const clockTo = e => { const S = C().S, t0 = Rd().perfAt(e) - S.limit * 1000; if (Math.abs(t0 - S.t0) > 150) S.t0 = t0; };   // el reloj de la placa acaba cuando dice el servidor (y salta a 5 s cuando fija el primero)
  function netOver(o) { if (!st || st.phase === "end") return; st.over = { ko: false, rounds: Math.max(1, st.k), ...o }; finish(); }
  /* «listo para la ronda k»: sale ya y se repite hasta que el servidor lo apunte; la pregunta empieza `wait` ms despues de que esten los dos */
  function netReady(k, wait) { const nt = st.net; nt.want = k; nt.s = 0; nt.rdy = false; nt.goAt = performance.now() + wait; netKick(true); }
  /* ya hay hora para la ronda que viene: la cuenta atras de la tira del dato y la pregunta, a su hora en los dos juegos */
  function netGo() {
    const nt = st.net, k = nt.want, left = Math.max(0, Rd().perfAt(nt.s) - performance.now());
    for (let n = 3; n >= 1; n--) if (left - n * 1000 > 0) later(() => { const e = $("duNext"); if (e && st.phase === "reveal" && nt.want === k) { e.textContent = Tf("Sigue en {n}", "Next in {n}", { n }); e.classList.remove("hidden"); } }, left - n * 1000);
    later(() => { if (nt.want === k && st.k === k - 1 && (st.phase === "reveal" || st.phase === "wait")) ask(); }, left);
  }
  function duelView(v) {
    const nt = st.net, o = hisSeat(v); if (st.phase === "end" || v.n !== nt.n) return;
    if (v.quit === "me") return netOver({ win: false, lost: true });      // el otro ha cobrado tu ausencia: demasiado rato sin conexion
    if (v.quit === "his") return netOver(v.gone ? { win: true, left: true, cut: true } : { win: true, quit: "rv" });
    if (!o || o.out) return netOver({ win: true, left: true });
    if (!o.on !== !!nt.off) { nt.off = !o.on; D.hud(); }
    if (o.ago < 5000) nt.claim = false; else if (o.ago > 20000 && !nt.claim) { nt.claim = true; sendV({ a: "claim", n: nt.n }); }   // 20 s sin dar senal: pierde por abandono
    const rd = v.rd; if (!rd) { if (v.st !== "play" && !st.over) netOver({ win: true, left: true }); return; }
    if (nt.want > st.k) { if (rd.k !== nt.want) return; nt.rdy = !!rd.rdy[0]; if (rd.s && !nt.s) { nt.s = rd.s; netGo(); } return; }   // esperando a que empiece la ronda que viene
    const cur = st.cur; if (rd.k !== st.k || st.phase !== "ask" || !cur) return;
    if (rd.e) clockTo(rd.e);
    if (rd.me != null) nt.ack = true;
    if (rd.his && rd.his.lk && !cur.rvLocked) { cur.rvLocked = true; cur.rvT = elapsed(); A.sfx.knock(); if (!cur.meAns) face("shock"); D.hud(); }   // «Ha fijado»: su etiqueta en rojo y el crupier con cara de susto
    if (rd.me != null && rd.his && rd.his.a !== undefined) resolve({ me: ansOf(rd.me), rv: ansOf(rd.his.a) });
  }

  /* Esc en el veredicto = Salir, y en la sala = Cerrar (asi el crupier se levanta antes de que cambie la pantalla) */
  addEventListener("keydown", e => { if (e.key !== "Escape" || C().S.settingsOpen || (A.teclado && A.teclado.on)) return; const b = st && st.phase === "end" ? $("duExit") : !st && document.querySelector("#dlg .du-wrap .lob, #dlg .du-wrap .pv") ? $("hubBack") : null; if (!b) return; e.stopImmediatePropagation(); e.preventDefault(); b.click(); }, true);

  /* salir del duelo (lo llama js/game.js al volver a la portada, y D.start antes de empezar otro) */
  D.leave = again => {
    const c = C(); timers.forEach(clearTimeout); timers = []; document.querySelectorAll(".du-fly").forEach(e => e.remove());
    if (st && st.spr) st.spr.destroy();
    if (!again) unseat(); else seat(null);
    for (const id of ["duHud", "duSeat", "duTools", "duFact", "duPins"]) { const e = $(id); if (e) e.remove(); }
    document.body.classList.remove("duelo-on", "duelo-lock"); if (A.codex && A.codex.toastAside) A.codex.toastAside();
    if (c) { c.map.setDecoys([]); c.S.duel = null; } st = null;
    if (N.code && !again && !N.keep) netBye();                              // salir al menu en un duelo entre jugadores = levantarse de la sala
  };

})(window.AIQ);
