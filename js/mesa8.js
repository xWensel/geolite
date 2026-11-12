/*
 * Geolite - MESA DE OCHO (prototipo, entrega 1: tu y siete bancas, sin red). Votado el 12-nov-2026 (maqueta «Mesa de ocho», B1-B11).
 *  - Ocho en la mesa. Cada ronda son 3 preguntas, las mismas para todos y a la vez; al acabar la ronda CAE el que menos puntos ha hecho en ella.
 *    Los puntos vuelven a cero en cada ronda. Con ocho son 7 rondas y 21 preguntas; la ultima ronda es la final, entre dos.
 *  - Puntos de cada pregunta: los del Duelo (solo precision, A.duelo.ptsOf). La dificultad sube sola: rondas 1-2 del saco de Bronce, 3-4 Plata,
 *    5-6 Oro y la final del saco del Crupier (todo el banco). Sin repetir lugar en toda la mesa.
 *  - Reloj: CFG.secs por pregunta; en cuanto ha fijado MEDIA MESA (de los que siguen en pie), al resto le quedan CFG.rush segundos.
 *  - Empate en el ultimo puesto: se salva quien tenga la mejor pregunta de la ronda; si siguen igual, quien tardo menos en fijar.
 *  - Los que caen se quedan mirando desde su asiento (o se van cuando quieran). Nada en juego: corona, contador de victorias y la experiencia del Club.
 * Vive dentro del Duelo de fichas (js/duelo.js): la cuarta puerta de su sala. Mientras se juega, C().S.duel es el estado de esta mesa (con m8 = true) y
 * A.duelo.hud / answer / pause / leave le pasan la llamada. De alli salen tambien el banco, la puntuacion, el rival simulado y las piezas de gala (A.duelo._).
 * Textos: es y en por ahora (el resto de idiomas llega con la entrega 3, cuando se quite la etiqueta «Prototipo»).
 * Guarda solo tus mesas jugadas y ganadas (localStorage "atlasiq.mesa8").
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const D = A.duelo; if (!D || !D._) return;
  const K = D._, T = K.T, Tf = K.Tf, esc = K.esc, $ = id => document.getElementById(id), C = () => A.core, pad2 = n => String(n).padStart(2, "0");

  /* ------------------------------------------------------------------ LAS CIFRAS (todas aqui) */
  const CFG = {
    seats: 8, minSeats: 3, perRound: 3,                 // de minSeats a seats en la mesa (dos es un duelo): se juega con los que se sienten, sin rellenar
    secs: 12, rush: 5,                                  // segundos por pregunta; lo que le queda al resto cuando ha fijado media mesa
    bots: [16, 24, 32, 40, 48, 56, 66],                 // cuanto sabe cada banca (la misma escala 1-100 del Duelo); se reparten por los asientos al azar
    revealSecs: 4.4, roundSecs: 6,                      // lo que dura el revelado de una pregunta y el cartel «cae el ultimo»
    rev: { me: 500, rv: 700, gap: 80, lines: 1100, fact: 1200, pts: 1700 },   // el revelado, en ms: tu ficha, las demas (una cada gap), las lineas, la tira del dato y los puntos
    chips: ["chip_o", "chip_p", "chip_r", "chip_b", "chip_g", "chip_k", "chip_t", "chip_w"],
  };
  const NAME6 = "Mesa de ocho|Table of eight";
  const NAME = () => T("Mesa de ocho", "Table of eight"), ME = () => T("Tú", "You");
  const ROM = ["I", "II", "III", "IV", "V", "VI", "VII"];
  const sacoName = sc => (sc == null ? A.tx(D.CFG.tables[3].n) : A.tx(D.CFG.tables[sc].n));

  /* ------------------------------------------------------------------ la mesa: estado, pregunta, cuentas y caida (lo usan igual la partida y la simulacion) */
  /* el saco de la ronda k de R (data/duelo-niveles.js: 0 Bronce, 1 Plata, 2 Oro, null = todo, el del Crupier): la final siempre es del Crupier y las
     demas se reparten de Bronce a Oro (con ocho: B B P P O O C; con cinco: B P O C; con tres: B C) */
  const sacoOf = (k, R) => (k >= R ? null : Math.min(2, Math.floor(((k - 1) * 3) / Math.max(1, R - 1))));
  const seatsOf = n => Math.max(CFG.minSeats, Math.min(CFG.seats, Math.round(+n) || CFG.seats));
  function mkState(o = {}) {
    const N = seatsOf(o.seats);
    const seed = String(o.seed || Math.random().toString(36).slice(2, 8)), rs = A.rng(seed + ":seats"), lv = CFG.bots.slice();
    for (let i = lv.length - 1; i > 0; i--) { const j = Math.floor(rs() * (i + 1)); [lv[i], lv[j]] = [lv[j], lv[i]]; }
    const pl = [{ i: 0, me: true, chip: CFG.chips[0], name: "", alive: true, out: 0, rp: 0, sp: 0, rq: [], rt: 0, up: 0 }];
    for (let i = 1; i < N; i++) pl.push({ i, me: false, chip: CFG.chips[i], name: `${T("Banca", "House")} ${ROM[i - 1]}`, lv: lv[i - 1], alive: true, out: 0, rp: 0, sp: 0, rq: [], rt: 0, up: 0 });
    return { m8: true, seed, pl, N, R: N - 1, k: 0, qi: 0, nq: 0, rq: A.rng(seed + ":q"), rb: A.rng(seed + ":bots"), ra: A.rng(seed + ":auto"), auto: o.auto || null,
      table: { saco: 0 }, used: new Set(), lastCont: null, lastCat: null, log: [], rounds: [], cur: null, over: null, phase: "", secs: 0, net: null };
  }
  const alive = st => st.pl.filter(p => p.alive);
  const bestQ = p => (p.rq.length ? Math.max(...p.rq) : 0);
  /* orden de la ronda: mas puntos; a igualdad, la mejor pregunta; luego, quien tardo menos; (y si aun asi, el asiento) */
  const cmp = (a, b) => b.rp - a.rp || bestQ(b) - bestQ(a) || a.rt - b.rt || a.i - b.i;
  const order = st => alive(st).sort(cmp).concat(st.pl.filter(p => !p.alive).sort((a, b) => b.out - a.out));
  function startRound(st) {
    st.k++; st.qi = 0; st.table = { saco: sacoOf(st.k, st.R) };
    alive(st).forEach(p => { p.rp = 0; p.sp = 0; p.rq = []; p.rt = 0; p.up = 0; });
  }
  function nextQ(st) {
    st.qi++; st.nq++; const e = K.drawQ(st), cur = (st.cur = { e, q: e.q, d: e.d, secs: CFG.secs, play: {}, lock: {}, ans: null, rushed: false });
    alive(st).forEach(p => { if (!p.me) { const b = D.botPlay(st.rb, e.q, e.d, p.lv); b.at = Math.min(b.t, CFG.secs - 0.4); cur.play[p.i] = b; } });
    return cur;
  }
  /* cuando fija cada uno de verdad: times = { asiento: segundos o null }. En cuanto ha fijado media mesa, al resto le quedan rush segundos */
  function lockTimes(times, n) {
    const ts = Object.values(times).filter(t => t != null).sort((a, b) => a - b), half = Math.ceil(n / 2), cap = ts.length >= half ? Math.min(CFG.secs, ts[half - 1] + CFG.rush) : CFG.secs, out = {};
    for (const i in times) out[i] = times[i] == null ? null : Math.min(times[i], cap);
    return out;
  }
  /* las cuentas de la pregunta: answers = { asiento: { lon, lat, t } o null }. Suma los puntos de la ronda a cada uno */
  function settleQ(st, answers) {
    const cur = st.cur, q = cur.q, rows = {};
    alive(st).forEach(p => { const a = answers[p.i], km = a ? D.kmOf(q, a.lon, a.lat) : null, pts = D.ptsOf(q, km);
      rows[p.i] = { km, pts, lon: a ? a.lon : null, lat: a ? a.lat : null, t: a ? a.t : null }; p.rp += pts; p.rq.push(pts); p.rt += a ? a.t : CFG.secs; p.up = pts; });
    const rd = { k: st.k, qi: st.qi, n: st.nq, id: cur.e.id, d: cur.d, q, rows }; st.log.push(rd); return rd;
  }
  /* fin de la ronda: cae el ultimo. Devuelve { k, saco, tabla (orden de la ronda), out (el que cae), margin (lo que le falto para salvarse) } */
  function endRound(st) {
    const tab = alive(st).sort(cmp), last = tab[tab.length - 1], prev = tab[tab.length - 2];
    const r = { k: st.k, saco: st.table.saco, tab: tab.map(p => ({ i: p.i, rp: p.rp, rq: p.rq.slice() })), out: last.i, margin: prev.rp - last.rp, qs: st.log.slice(-CFG.perRound).map(x => x.q) };
    last.alive = false; last.out = st.k; last.place = tab.length; st.rounds.push(r);
    if (tab.length === 2) { prev.place = 1; st.over = st.over || { win: prev.me, rounds: st.k, winner: prev.i }; }
    return r;
  }
  const M = A.mesa8 = { CFG, name: NAME };

  /* cientos de mesas con el banco, la puntuacion y las reglas del juego (sin interfaz ni esperas). la = cuanto sabe quien ocupa tu asiento.
     Devuelve con que frecuencia gana, en que puesto queda y cuanto dura (preguntando + revelados + carteles) */
  M.sim = (o = {}) => {
    const n = o.n || 300, la = o.la == null ? 50 : o.la, places = Array(CFG.seats + 1).fill(0), secsAll = []; let wins = 0, botWin = {};
    for (let g = 0; g < n; g++) {
      const st = mkState({ seed: (o.seed || "sim") + ":" + g, seats: o.seats }); let secs = 0;
      while (!st.over) {
        startRound(st);
        for (let j = 0; j < CFG.perRound; j++) {
          const cur = nextQ(st), al = alive(st), raw = {}, pos = {};
          al.forEach(p => { if (p.me) { const b = D.botPlay(st.ra, cur.q, cur.d, la); raw[0] = Math.min(b.t, CFG.secs - 0.4); pos[0] = b; } else { raw[p.i] = cur.play[p.i].at; pos[p.i] = cur.play[p.i]; } });
          const t = lockTimes(raw, al.length), ans = {}; al.forEach(p => (ans[p.i] = { lon: pos[p.i].lon, lat: pos[p.i].lat, t: t[p.i] }));
          settleQ(st, ans); secs += Math.max(...Object.values(t)) + CFG.revealSecs;
        }
        endRound(st); if (!st.over) secs += CFG.roundSecs;
      }
      const me = st.pl[0]; places[me.place]++; if (st.over.win) wins++; else botWin[st.pl[st.over.winner].lv] = (botWin[st.pl[st.over.winner].lv] || 0) + 1; secsAll.push(secs);
    }
    secsAll.sort((a, b) => a - b);
    return { n, la, win: Math.round((1000 * wins) / n) / 10, places: places.slice(1).map(x => Math.round((1000 * x) / n) / 10), botWin, secs: { p10: Math.round(secsAll[Math.floor(n * 0.1)]), p50: Math.round(secsAll[Math.floor(n * 0.5)]), p90: Math.round(secsAll[Math.floor(n * 0.9)]) } };
  };

  /* ================================================================== LA INTERFAZ */
  let st = null, raf = 0, timers = [];
  const later = (fn, ms) => { const s = st, id = setTimeout(() => { if (s && st === s) fn(); }, ms); timers.push(id); return id; };
  const dkOf = () => parseFloat(document.body.style.getPropertyValue("--dk")) || 1;
  const me = () => st.pl[0];
  const nameOf = p => (p.me ? K.myName() || T("Jugador", "Player") : esc(p.name)), rawName = p => (p.me ? (A.profile && A.profile.get().name) || T("Jugador", "Player") : p.name);
  /* una ficha al pixel real dentro de un panel escalado con --dk: cada pixel de arte ocupa un numero entero de pixeles de pantalla */
  function chipIn(id, css, base, zoomed = true) {
    const dk = zoomed ? dkOf() : 1, cv = K.fichaCv(id, css * dk, base); cv.style.width = cv.style.height = parseFloat(cv.style.width) / dk + "px"; cv.className = "m8-chip"; return cv;
  }
  const chips = (root, sel, css, base) => root.querySelectorAll(sel).forEach(e => { e.textContent = ""; e.appendChild(chipIn(e.dataset.chip, css, base)); });
  const chipSlot = (p, cls = "") => `<span class="m8-cs ${cls}" data-chip="${p.chip}"></span>`;

  const SKEY = "atlasiq.mesa8";
  const stats = () => { let o = {}; try { o = JSON.parse(localStorage.getItem(SKEY) || "{}") || {}; } catch (e) { /* sin almacenamiento */ } return { d: +o.d || 0, w: +o.w || 0 }; };
  const statsAdd = win => { const o = stats(); o.d++; if (win) o.w++; try { localStorage.setItem(SKEY, JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ } return o; };
  M.stats = stats;

  const LN = {
    sala: [["Muchas sillas y una sola corona. Yo solo reparto.", "Plenty of chairs and a single crown. I only deal."], ["Elige cuántos os sentáis. Alguien tendrá que caer primero.", "Pick how many sit down. Someone has to fall first."]],
    win: [["La mesa entera para ti. La corona te sienta bien.", "The whole table is yours. The crown suits you."], ["Toda la mesa caída. Tendré que dar explicaciones.", "The whole table down. I'll have some explaining to do."]],
    lose: [["La mesa se queda en casa. Siempre hay una silla.", "The table stays with the house. There's always a chair."], ["Caer no es perder. Bueno, sí. Pero se aprende.", "Falling isn't losing. Well, it is. But you learn."]],
    quit: [["¿Te levantas? La silla se queda caliente un rato.", "Getting up? The chair stays warm for a while."]],
  };
  const lnAt = {}, line = k => { const a = LN[k], i = (lnAt[k] = lnAt[k] == null ? Math.floor(Math.random() * a.length) : (lnAt[k] + 1) % a.length); return T(a[i][0], a[i][1]); };

  /* las reglas, en una linea (la sala del Duelo las ensena al elegir esta puerta, y la sala de ocho debajo de los asientos) */
  M.rules = n => `<span>${A.icon("boss_hat")}${n ? `<b>${n - 1}</b> ${n === 2 ? T("ronda", "round") : T("rondas", "rounds")}` : Tf("De <b>{a}</b> a <b>{b}</b> en la mesa", "<b>{a}</b> to <b>{b}</b> at the table", { a: CFG.minSeats, b: CFG.seats })}</span><span>${A.icon("chip_k")}<b>${CFG.perRound}</b> ${T("preguntas por ronda", "questions a round")}</span><span>${A.icon("coin")}${T("Cae <b>el último</b> de cada ronda", "<b>The last one</b> falls each round")}</span>`;
  /* la ilustracion de la puerta: las ocho fichas en dos filas */
  M.fan = el => { el.innerHTML = `<div class="m8-fan">${CFG.chips.map(c => `<span data-chip="${c}"></span>`).join("")}</div>`; chips(el, "[data-chip]", 32, 16); };

  /* ================================================================== 1 · LA SALA DE OCHO */
  M.open = again => {
    const c = C(), S = c.S; if (S.booting || S.phase !== "title") return;
    D.pool(); K.fitDk(); S.hub = "duelo";
    const s = stats(), N = (M.seats = seatsOf(M.seats)), pl = mkState({ seed: "sala", seats: N }).pl;
    const free = i => `<div class="m8-seat free rise" style="--d:${(0.08 + i * 0.05).toFixed(2)}s"><span>${T("Silla libre", "Empty chair")}</span></div>`;
    const seat = (p, i) => `<div class="m8-seat gx-sh rise" style="--d:${(0.08 + i * 0.05).toFixed(2)}s"><div class="gx-paper">${chipSlot(p)}<h3 class="ink">${nameOf(p)}</h3><span class="tag ${p.me ? "me" : ""}">${p.me ? ME() : T("La banca", "The house")}</span></div></div>`;
    c.dialog(K.stage("lob m8-lob", `<div class="hd"><button type="button" class="gx-btn sm" id="hubBack">${A.icon("u_back", "t24")}<span>${T("Volver", "Back")}</span>${A.gala.keyHint("Esc", "b")}</button><h2 class="gx-t-l">${NAME()}</h2><span class="gx-eyb">${T("Prototipo · práctica sin red", "Prototype · offline practice")}</span></div>
      <div class="m8-room"><div class="m8-seats8">${pl.map(seat).join("")}${Array.from({ length: CFG.seats - N }, (_, i) => free(N + i)).join("")}</div>
        <div class="regl"><span class="lvl"><span>${T("En la mesa", "At the table")}</span><span class="gx-acts"><button type="button" class="gx-btn sm" id="m8Dn" aria-label="${T("Una silla menos", "One chair fewer")}"${N <= CFG.minSeats ? " disabled" : ""}>−</button></span><b>${N}</b><span class="gx-acts"><button type="button" class="gx-btn sm" id="m8Up" aria-label="${T("Una silla más", "One more chair")}"${N >= CFG.seats ? " disabled" : ""}>+</button></span></span>${M.rules(N)}</div>
        <div class="regl"><span>${T("Mesas jugadas", "Tables played")} <b>${s.d}</b></span><span>${T("Coronas", "Crowns")} <b>${s.w}</b></span><span>${T("La dificultad sube sola: Bronce, Plata, Oro y, en la final, el Crupier", "Difficulty climbs by itself: Bronze, Silver, Gold and, in the final, the Dealer")}</span></div></div>
      <div class="ft"><div class="seatw" id="m8SalaSeat" data-tail="l" data-lines="2"></div><div class="gx-acts">${K.primary("m8Go", T("Repartir", "Deal"))}</div></div>`), "tablewrap");
    chips($("dlg"), ".m8-cs", 56, 28);
    $("hubBack").onclick = () => { A.sfx.ui(); D.open(); };
    $("m8Go").onclick = () => { A.sfx.depart(); M.start({ seats: M.seats }); };
    const step = d => () => { const n = seatsOf(M.seats + d); if (n === M.seats) return; M.seats = n; A.sfx.ui(); K.seat(null); M.open(true); const b = $(d < 0 ? "m8Dn" : "m8Up"); if (b && !b.disabled) b.focus(); };
    $("m8Dn").onclick = step(-1); $("m8Up").onclick = step(1);
    if (again) { K.seat($("m8SalaSeat")); if (A.coverMap) A.coverMap("duelo", true, () => !!document.querySelector("#dlg .du-wrap") && !$("layer").classList.contains("hidden")); return; }
    K.seat($("m8SalaSeat")); K.speak(line("sala"));
    if (A.coverMap) A.coverMap("duelo", true, () => !!document.querySelector("#dlg .du-wrap") && !$("layer").classList.contains("hidden"));
  };

  /* ================================================================== EMPEZAR: o = { seed, auto } (auto: { level, next, round, done }: tu asiento lo ocupa otra banca, para pruebas) */
  M.start = (o = {}) => {
    const c = C(), S = c.S; if (S.duel) D.leave(true); else K.seat(null);
    c.openSettings(false); A.audio.unlock(); D.pool(); K.fitDk();
    st = S.duel = mkState(o);
    S.run = null; S.tool = null; S.ranked = null; S.level = 0; S.qs = []; S.qi = 0; S.levelScore = 0; S.runTotal = 0; S.streak = 0; S.hits = 0; S.log = null;
    S.camp = { id: "mesa8", mode: "duel", title: A.L6(NAME6), home: { lat: 0, lon: 0, zoom: 1 }, levels: [{ kind: "city", seconds: CFG.secs, advance: 0, maxPerQ: 1000, name: A.L6(NAME6) }] };
    c.map.setHome(S.camp.home); c.map.clearMarks(); c.map.setDecoys([]); A.music.mode(1);
    if (!raf) raf = requestAnimationFrame(tick);
    sit(); return st.seed;
  };

  /* ================================================================== 2 · LA PARTIDA: la tira de ocho, la placa del juego y el mapa */
  function sit() {
    const c = C(), app = $("app"), add = (id, cls, html) => { let e = $(id); if (e) e.remove(); e = document.createElement("div"); e.id = id; e.className = cls; e.innerHTML = html; app.appendChild(e); return e; };
    c.closeDialog(); if (A.coverMap) A.coverMap("duelo", false);
    document.body.classList.remove("title-on"); document.body.classList.add("duelo-on", "mesa8-on");
    $("plate").classList.add("hidden"); $("pauseBtn").classList.add("hidden"); $("streakChip").classList.add("hidden"); $("factText").textContent = ""; c.chrome(true);
    add("m8Hud", "m8-hud du-st", `<div class="gx-pnl"><div class="m8-top"><span id="m8Rd"></span><span class="mid" id="m8Q"></span><span id="m8Sub"></span></div>
      <div class="m8-row" id="m8Row" style="--n:${st.N}">${st.pl.map(p => `<div class="m8-s${p.me ? " me" : ""}" data-i="${p.i}"><span class="m8o"></span>${chipSlot(p)}<span class="m8n">${nameOf(p)}</span><span class="m8p"></span><span class="m8x"></span></div>`).join("")}</div></div>`);
    chips($("m8Hud"), ".m8-cs", 40, 20);
    add("duTools", "du-tools du-st gx-acts", `<button type="button" class="gx-btn sm gho" id="duQuit"><span class="a">${T("Abandonar", "Leave")}</span><span class="b">${T("¿Seguro?", "Sure?")}</span></button>`);
    add("duFact", "du-fact du-st hidden", "");
    add("m8Pins", "du-pins du-st m8-pins", `<svg aria-hidden="true"><line class="me"></line></svg>`);
    K.unseat(); if (K.DL().hide) K.DL().hide();                              // a la mesa sin el crupier: la partida es sagrada
    { const b = $("duQuit"); let armed = 0;
      b.onclick = () => { if (!st || st.phase === "end") return; if (!armed) { armed = setTimeout(() => { armed = 0; b.classList.remove("armed"); }, 4000); b.classList.add("armed"); A.sfx.deny(); return; }
        clearTimeout(armed); A.sfx.deny(); quit(); }; }
    ask();
  }
  /* te levantas: si sigues en pie, caes ahi mismo (tu puesto = los que quedaban); si ya habias caido, solo dejas de mirar */
  function quit() { const m = me(); if (m.alive) { m.alive = false; m.out = Math.max(1, st.k); m.place = alive(st).length + 1; m.quit = true; } st.over = { win: false, rounds: Math.max(1, st.k), quit: true, winner: null }; finish(); }

  /* lo que pinta el juego en su marcador (js/game.js, updateHud -> A.duelo.hud): el numero de la pregunta en la placa y la tira de ocho */
  M.hud = () => {
    if (!st || !$("m8Hud")) return; const ord = st.pl.filter(p => p.alive).sort((a, b) => b.sp - a.sp || cmp(a, b)).concat(st.pl.filter(p => !p.alive).sort((a, b) => b.out - a.out));
    const cur = st.cur, askN = st.phase === "ask", nAl = alive(st).length, total = st.R * CFG.perRound, fin = nAl === 2;
    $("askNo").textContent = A.t("ask.no", { n: pad2(Math.max(1, st.nq)), m: pad2(total) });
    $("m8Rd").innerHTML = fin ? `${T("La final", "The final")} · <b>${sacoName(st.table.saco)}</b>` : `${T("Ronda", "Round")} <b>${Math.max(1, st.k)}</b> / ${st.R} · <b>${sacoName(st.table.saco)}</b>`;
    $("m8Q").textContent = `${T("Pregunta", "Question")} ${Math.max(1, st.qi)} / ${CFG.perRound}`;
    $("m8Sub").innerHTML = fin ? T("Quien gane se queda la mesa", "Winner takes the table") : `${T("Quedan", "Left")} <b>${nAl}</b> · ${T("cae el último", "the last one falls")}`;
    const scored = st.qi > 1 || st.phase === "reveal", locked = p => !!cur && cur.lock[p.i] != null;
    ord.forEach((p, n) => {
      const e = $("m8Row").children[p.i], last = p.alive && scored && n === nAl - 1;
      const cls = "m8-s" + (p.me ? " me" : "") + (!p.alive ? " out" : "") + (last ? " dz" : "") + (p.alive && askN ? (locked(p) ? " lk" : " th") : "");
      if (e.className !== cls) e.className = cls;
      const tx = `translateX(${n * 100}%)`; if (e.style.transform !== tx) e.style.transform = tx;
      const set = (s, v) => { const x = e.querySelector(s); if (x.textContent !== v) x.textContent = v; };
      set(".m8o", p.alive ? String(n + 1) : "");
      set(".m8p", p.alive ? A.fmt(p.sp) : T("Fuera", "Out"));
      set(".m8x", !p.alive ? "" : askN ? (locked(p) ? T("Fijada", "Locked") : "") : st.phase === "reveal" && st.ptsOn ? "+" + A.fmt(p.up) : "");
    });
    document.body.classList.toggle("duelo-lock", !!(askN && cur && cur.rushed && me().alive && !locked(me())));   // el reloj de la placa, en rojo
  };
  M.pause = () => ({ mode: `${NAME()} · ${T("Prototipo", "Prototype")}`, note: T("En la mesa de ocho el reloj no se detiene durante la pregunta.", "At the table of eight the clock doesn't stop during a question."),
    rows: K.row(T("Ronda", "Round"), `${Math.max(1, st.k)} / ${st.R}`) + K.row(T("Quedan en la mesa", "Left at the table"), alive(st).length) + (me().alive ? K.row(T("Tus puntos de la ronda", "Your points this round"), A.fmt(me().rp || 0)) : "") });

  /* ---------------- las fichas sobre el mapa: una por jugador, con su nombre y su distancia. Siguen la camara del mapa (map.lonLatToScreen, sin medir la
     pagina) y solo se escriben cuando cambian. Las etiquetas se apartan unas de otras al colocarse (una vez, no en cada fotograma) */
  function pinsClear() { const h = $("m8Pins"); if (!h) return; h.querySelectorAll(".pn").forEach(e => e.remove()); h.classList.remove("ln"); st.pins = { list: [], tgt: null, rect: null, sig: "" }; }
  function pinAdd(p, lon, lat, o = {}) {
    const host = $("m8Pins"), P = st.pins, dk = dkOf(), m = { p, lon, lat, ct: o.ct, line: !!o.line, tw: 0, dy: 0 };
    m.el = document.createElement("div"); m.el.className = "pn " + (p.me ? "me" : "rv"); m.el.innerHTML = `<div class="in${o.drop ? " drop" : ""}"><span class="tag ${p.me ? "me" : ""} hidden"></span></div>`;
    const pid = p.me && A.punteros ? A.punteros.current("pin") : "casa", pc = pid !== "casa" && A.punteros.pinCanvas(pid); let mk;
    if (pc) { mk = document.createElement("canvas"); mk.width = 16; mk.height = 24; mk.className = "pin"; mk.getContext("2d").drawImage(pc, 0, 0); const dp = window.devicePixelRatio || 1, kk = Math.max(2, Math.round(2 * dk * dp)); mk.style.width = (16 * kk) / dp + "px"; mk.style.height = (24 * kk) / dp + "px"; }
    m.el.firstElementChild.prepend(mk || K.fichaCv(p.chip, 24 * dk)); host.appendChild(m.el); P.list.push(m); P.sig = ""; return m;
  }
  function pinTag(m, txt) { const t = m.el.querySelector(".tag"); t.textContent = txt; t.classList.remove("hidden"); m.tw = t.offsetWidth + 6; st.pins.sig = ""; }
  function pinsTick() {
    const P = st.pins; if (!P || !P.list.length) return; const map = C().map;
    if (!P.rect) { const r = map.cv.getBoundingClientRect(), a = $("app").getBoundingClientRect(); P.rect = [r.left - a.left, r.top - a.top]; }
    const at = (lon, lat, ct) => { const q = map.lonLatToScreen(lon, lat, ct); return [Math.round(q[0] + P.rect[0]), Math.round(q[1] + P.rect[1])]; }, t = P.tgt ? at(P.tgt[0], P.tgt[1], P.tgt[2]) : null;
    let sig = t ? t.join() : ""; for (const m of P.list) { [m.x, m.y] = at(m.lon, m.lat, m.ct); sig += "|" + m.x + "," + m.y + "," + m.tw; }
    if (sig === P.sig) return; P.sig = sig;
    const W = innerWidth, dk = dkOf(), gap = 18 * dk, th = 24 * dk, placed = P.list.map(m => [m.x - 14 * dk, m.y - 14 * dk, m.x + 14 * dk, m.y + 14 * dk]), hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    for (const m of P.list.slice().sort((a, b) => (b.p.me ? 1 : 0) - (a.p.me ? 1 : 0) || a.y - b.y)) {   // tu etiqueta se coloca la primera: nunca se aparta
      let side = t ? (m.x <= t[0] ? "l" : "r") : "r"; if (side === "l" && m.x - gap - m.tw < 8) side = "r"; else if (side === "r" && m.x + gap + m.tw > W - 8) side = "l";
      let dy = 0; if (m.tw) { const box = d => (side === "l" ? [m.x - gap - m.tw, m.y - th / 2 + d, m.x - gap, m.y + th / 2 + d] : [m.x + gap, m.y - th / 2 + d, m.x + gap + m.tw, m.y + th / 2 + d]);
        const own = placed[P.list.indexOf(m)]; let ok = false; for (const d of [0, -1, 1, -2, 2, -3, 3, -4, 4]) { dy = d * th; const b = box(dy); if (!placed.some(q => q !== own && hit(b, q))) { ok = true; break; } } if (!ok) dy = 0; placed.push(box(dy)); }
      m.el.style.transform = `translate(${m.x}px, ${m.y}px)`; const cls = `pn ${m.p.me ? "me" : "rv"} ${side}`; if (m.el.className !== cls) m.el.className = cls;
      const tg = m.el.querySelector(".tag"), tr = `0 calc(-50% + ${dy}px)`; if (tg.style.translate !== tr) tg.style.translate = tr;
      if (m.p.me) { const ln = $("m8Pins").querySelector("line.me"); if (ln && t) { const on = m.line && Math.hypot(m.x - t[0], m.y - t[1]) > 16; ln.style.display = on ? "" : "none"; if (on) { ln.setAttribute("x1", m.x); ln.setAttribute("y1", m.y); ln.setAttribute("x2", t[0]); ln.setAttribute("y2", t[1]); } } }
    }
  }
  /* lo que tapa la mesa en el lienzo del mapa (para encuadrar el revelado en el hueco libre) */
  function obstacles() {
    const cv = C().map.cv.getBoundingClientRect(), dk = dkOf(), out = [];
    const add = (e, p = 12) => { if (!e || !e.getClientRects().length) return; const r = e.getBoundingClientRect(); if (r.width > 1 && r.height > 1) out.push([r.left - cv.left - p, r.top - cv.top - p, r.right - cv.left + p, r.bottom - cv.top + p]); };
    add($("plate")); add($("m8Hud")); add($("duTools")); add($("dock")); add($("rail"));
    const w = 592 * dk, h = 132 * dk; out.push([(cv.width - w) / 2 - 12, cv.height - 32 * dk - h - 12, (cv.width + w) / 2 + 12, cv.height]);
    return out;
  }

  /* ---------------- la pregunta: la misma para toda la mesa, con el reloj y la placa del juego */
  const elapsed = () => { const S = C().S; return ((S.paused ? S.pauseAt : performance.now()) - st.cur.t0 - S.pausedAcc) / 1000; };
  function ask() {
    const c = C(), S = c.S; if (st.qi === 0 || st.qi >= CFG.perRound) startRound(st);
    const cur = nextQ(st), m = me(); st.phase = "ask"; st.ptsOn = false;
    if (!st.t0) st.t0 = performance.now();
    S.qs.push(cur.q); S.qi = st.nq - 1; S.camp.levels[0].seconds = cur.secs; S.camp.levels[0].kind = cur.q.kind || "city";
    if (A.coverMap) A.coverMap("duelo", false);
    pinsClear(); $("duFact").classList.add("hidden"); for (const id of ["m8Hud", "duTools"]) $(id).classList.remove("hidden");
    $("duQuit").querySelector(".a").textContent = m.alive ? T("Abandonar", "Leave") : T("Dejar de mirar", "Stop watching");
    c.nextQuestion();                                                     // placa, reloj, mapa listo para el clic y M.hud()
    cur.t0 = performance.now();
    if (!m.alive) { c.map.setPick(false); document.body.classList.add("mesa8-watch"); }
    if (st.auto && m.alive) { cur.auto = D.botPlay(st.ra, cur.q, cur.d, st.auto.level == null ? 50 : st.auto.level); cur.autoAt = Math.min(cur.auto.t, cur.secs - 0.4); }
    M.hud();
  }
  /* alguien fija (t = segundos de la pregunta). Con media mesa fijada, al resto le quedan rush segundos: el reloj de la placa salta a ese tiempo */
  function lock(p, t) {
    const cur = st.cur, S = C().S; cur.lock[p.i] = t;
    const al = alive(st), n = al.filter(x => cur.lock[x.i] != null).length;
    if (n >= al.length) return resolve();
    if (!cur.rushed && n >= Math.ceil(al.length / 2)) {
      cur.rushed = true; const cap = t + CFG.rush; al.forEach(x => { if (!x.me && cur.lock[x.i] == null) cur.play[x.i].at = Math.min(cur.play[x.i].at, cap - 0.3 - 0.4 * Math.random()); });
      if (cur.auto) cur.autoAt = Math.min(cur.autoAt, cap - 0.3);
      const left = S.limit - (performance.now() - S.t0 - S.pausedAcc) / 1000; if (left > CFG.rush) S.t0 -= (left - CFG.rush) * 1000;
      if (me().alive && cur.lock[0] == null) A.sfx.knock();
    }
    M.hud();
  }
  /* tu respuesta (js/game.js, reveal -> A.duelo.answer): guess = { lon, lat }, o null si se acabo el tiempo */
  M.answer = guess => {
    const cur = st && st.cur, m = st && me(); if (!cur || st.phase !== "ask") return;
    if (!guess) return resolve();                                         // se acabo el reloj: quien no ha fijado se queda en blanco
    if (!m.alive || cur.lock[0] != null) return;
    cur.ans = { lon: guess.lon, lat: guess.lat }; C().map.setPick(false);
    pinAdd(m, guess.lon, guess.lat, { ct: C().map.pickCt, drop: true });
    lock(m, Math.max(0, elapsed()));
  };
  function tick() {
    raf = st ? requestAnimationFrame(tick) : 0; if (!st) return;
    const c = C(), S = c.S, cur = st.cur;
    if (st.pins) pinsTick();
    if (st.phase !== "ask" || !cur || !cur.t0 || S.phase !== "asking" || S.paused) return;
    const el = elapsed(), m = me();
    if (c.map.pickEnabled && (!m.alive || cur.lock[0] != null)) c.map.setPick(false);
    for (const p of st.pl) if (p.alive && !p.me && cur.lock[p.i] == null && el >= cur.play[p.i].at) { lock(p, el); if (st.phase !== "ask") return; }
    if (cur.auto && m.alive && cur.lock[0] == null && el >= cur.autoAt) c.map.onPick(cur.auto.lon, cur.auto.lat);
  }

  /* ================================================================== 3 · EL REVELADO: el mapa vuela al lugar, caen todas las fichas y la tira suma y se reordena */
  function resolve() {
    const c = C(), S = c.S, map = c.map, cur = st.cur, q = cur.q, R = CFG.rev, m = me(); if (st.phase !== "ask") return;
    const tEnd = elapsed(); st.secs += tEnd;
    st.phase = "reveal"; S.phase = "reveal"; S.tense = false; map.setPick(false); A.music.mode(1); $("plate").classList.remove("hurry"); document.body.classList.remove("duelo-lock");
    const ans = {}; alive(st).forEach(p => { if (p.me) ans[0] = cur.ans && cur.lock[0] != null ? { ...cur.ans, t: cur.lock[0] } : null; else { const b = cur.play[p.i]; ans[p.i] = { lon: b.lon, lat: b.lat, t: cur.lock[p.i] != null ? cur.lock[p.i] : Math.min(b.at, tEnd) }; } });
    const rd = settleQ(st, ans), mine = rd.rows[0], g = m.alive && ans[0], tok = st.nq, live = () => st && st.nq === tok && st.phase === "reveal";
    const real = !st.auto || st.auto.club;
    if (g && real && A.club) A.club.q(mine.pts / 1000);                    // el Club de la casa: experiencia por precision (se cobra en el veredicto)
    if (m.alive && real && A.clubRetos) {
      const lim = A.codexLimits ? A.codexLimits({ id: q.cid[0], cids: q.cid }) : [300], wa = !!(A.waters && A.waters.of(q)), ok = !!g && mine.km != null;
      A.clubRetos.q({ hit: ok && mine.km <= lim[0], bull: ok && mine.km <= 25, ratio: mine.pts / 1000, streak: 0, cont: cur.e && cur.e.cont, cap: q.kind === "capital", flag: q.kind === "flag", water: wa, ctry: q.t === "c" && !wa && q.kind !== "flag" });
    }
    const cx = g && !st.auto && A.codexUnlock ? A.codexUnlock(q, mine.km) : { added: [], level: 0 }; rd.cards = cx.added.length;   // la Enciclopedia, en silencio
    /* el objetivo, como en el revelado de siempre: el lugar con su bandera en el mastil, el pais resaltado o la masa de agua */
    const af = A.waters && A.waters.of(q), isC = q.t === "c" || !!af, fC = isC && !af ? c.world.byName[q.key] : null; let tg0 = null, span, labelAt = null;
    if (af) { span = [[af.bbox[0], af.bbox[1]], [af.bbox[2], af.bbox[3]]]; labelAt = [q.lon, q.lat]; }
    else if (isC) { const b = K.big(fC).bbox; span = [[b[0], b[1]], [b[2], b[3]]]; labelAt = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; }
    else { tg0 = [q.lon, q.lat]; span = [tg0]; }
    const tgt = tg0 || labelAt, near = lon => lon + 360 * Math.round((tgt[0] - lon) / 360);
    const label = q.clue ? A.tx(q.answer) : A.tx(q.name), kmTxt = s => (s.km > 0 ? A.fmtDist(s.km) : T("dentro", "inside")), fl = c.flagsOf(q);
    const lim = A.codexLimits && q.cid ? A.codexLimits({ id: q.cid[0], cids: q.cid }) : [300, 150, 75];
    map.setMarks({ guess: null, answer: tg0, highlight: fC ? q.key : null, area: af || null, label, labelAt, dist: "", pop: null, flags: fl.length ? fl.map(c.flagImg) : null,
      rings: tg0 && g ? { r: lim, n: cx.level, at: [0, 1, 2].map(i => R.me + 150 + i * 180) } : null });
    if (!st.pins) pinsClear();
    const myPin = st.pins.list.find(x => x.p.me); if (myPin) { myPin.lon = near(myPin.lon); myPin.line = mine.km > 0; }
    st.pins.tgt = [tgt[0], tgt[1], fC && fC.ct]; st.pins.sig = "";
    /* el encuadre: el lugar, tu ficha y las de quienes no se han ido al otro lado del mundo (las demas quedan fuera de plano) */
    const others = alive(st).filter(p => !p.me).map(p => ({ p, r: rd.rows[p.i] })).sort((a, b) => a.r.km - b.r.km), far = Math.max(1500, g ? mine.km * 1.5 : 0);
    const fpts = (isC ? span.map(p => [p[0], p[1], fC && fC.ct]) : [[tg0[0], tg0[1]]]).concat(g ? [[near(g.lon), g.lat, map.pickCt]] : [], others.filter(o => o.r.km <= far).map(o => [near(o.r.lon), o.r.lat]));
    requestAnimationFrame(() => { if (!live()) return; if (map.frameReveal) map.frameReveal(fpts, obstacles(), { l: 110, r: 110, t: 96, b: 44 }, 1100); else map.fitPoints(fpts.map(p => [p[0], p[1]]), undefined, 1100); });
    const tier = !g ? 5 : mine.km <= 75 ? 4 : mine.km <= 150 ? 3 : mine.km <= 300 ? 2 : mine.km <= 600 ? 1 : 0;
    later(() => { if (live()) A.sfx.reveal(m.alive ? tier : 1); }, 480);
    if (fl.length) later(() => { if (live() && A.sfx.flag) A.sfx.flag(fl.length); }, 650);
    later(() => { if (live() && myPin) pinTag(myPin, `${ME()} · ${kmTxt(mine)}`); }, R.me);
    others.forEach((o, i) => later(() => { if (!live()) return; const pm = pinAdd(o.p, near(o.r.lon), o.r.lat, { drop: true }); pinTag(pm, `${K.cut(o.p.name, 13)} · ${kmTxt(o.r)}`); if (i === 0 && A.sfx.bankPin) A.sfx.bankPin(); }, R.rv + i * R.gap));
    later(() => { if (live()) $("m8Pins").classList.add("ln"); }, R.lines);
    later(() => { if (live()) K.factShow(q, label, fl); }, R.fact);
    later(() => { if (!live()) return; st.ptsOn = true; alive(st).forEach(p => (p.sp = p.rp)); M.hud(); if (A.sfx.golpe) A.sfx.golpe(st.qi - 1); }, R.pts);
    const total = st.auto && st.auto.next != null ? st.auto.next : CFG.revealSecs * 1000, endR = st.qi >= CFG.perRound;
    const go = () => { if (!live()) return; if (K.veiled()) return later(go, 400); alive(st).forEach(p => (p.sp = p.rp)); if (endR) roundEnd(); else ask(); };
    for (let n = 3; n >= 1; n--) if (total - n * 1000 > R.fact) later(() => { const e = $("duNext"); if (live() && e) { e.textContent = endR ? Tf("La cuenta en {n}", "Tally in {n}", { n }) : Tf("Sigue en {n}", "Next in {n}", { n }); e.classList.remove("hidden"); } }, total - n * 1000);
    later(go, total);
  }

  /* ================================================================== 4 · CAE EL ULTIMO: la cuenta de la ronda y quien se va. Dura unos segundos y sigue sola */
  const qName = q => { const n = q.clue ? A.tx(q.answer) : A.tx(q.name); return q.kind === "flag" ? Tf("Bandera de {n}", "Flag of {n}", { n }) : n; };
  function roundEnd() {
    const c = C(), S = c.S, m = me(), wasIn = m.alive, r = endRound(st), out = st.pl[r.out], prev = st.pl[r.tab[r.tab.length - 2].i];
    if (st.over) return finish();                                         // era la final: directo al veredicto
    st.phase = "round"; S.phase = "intro"; c.map.clearMarks(); pinsClear(); c.map.animateTo(c.map.home(), 900);
    for (const id of ["m8Hud", "duTools", "duFact"]) $(id).classList.add("hidden"); $("plate").classList.add("hidden");
    const nLeft = alive(st).length, myPos = r.tab.findIndex(x => x.i === 0) + 1, meOut = out.me, next = sacoOf(st.k + 1, st.R);
    const tied = r.margin === 0, why = tied ? Tf("Empató a puntos con {name} y tenía peor su mejor pregunta.", "Tied on points with {name}, with a weaker best question.", { name: nameOf(prev) })
      : Tf("Se quedó a {n} puntos de {name}.", "Finished {n} points behind {name}.", { n: A.fmt(r.margin), name: nameOf(prev) });
    const whyMe = tied ? Tf("Empataste a puntos con {name} y su mejor pregunta fue mejor que la tuya.", "You tied on points with {name}, whose best question beat yours.", { name: nameOf(prev) })
      : Tf("Te quedaste a {n} puntos de {name}.", "You finished {n} points behind {name}.", { n: A.fmt(r.margin), name: nameOf(prev) });
    const rows = r.tab.map((x, n) => { const p = st.pl[x.i], dz = x.i === r.out;
      return `<tr class="${p.me ? "me" : ""}${dz ? " dz" : ""}"><td>${n + 1}</td><td><span>${chipSlot(p)}<em>${nameOf(p)}</em>${dz ? `<b class="tg">${T("Fuera", "Out")}</b>` : p.me ? `<b class="tg o">${ME()}</b>` : ""}</span></td>${x.rq.map(v => `<td>${A.fmt(v)}</td>`).join("")}<td>${A.fmt(x.rp)}</td></tr>`; }).join("");
    const secs = st.auto && st.auto.round != null ? st.auto.round / 1000 : CFG.roundSecs;
    c.dialog(K.stage("m8-rd", `<div class="m8-h fromL"><span class="gx-eyb">${NAME()} · ${Tf("ronda {k} de {n}", "round {k} of {n}", { k: r.k, n: st.R })}</span><h2 class="gx-t-l">${meOut ? T("Caes tú", "You fall") : Tf("Cae {name}", "{name} falls", { name: nameOf(out) })}</h2>
        <p>${meOut ? whyMe + " " + T("Puedes seguir mirando la partida desde tu asiento.", "You can keep watching from your seat.") : why}</p>
        <div class="rows">${K.row(T("Quedan en la mesa", "Left at the table"), nLeft)}${wasIn && !meOut ? K.row(T("Tu puesto en la ronda", "Your place this round"), `${myPos} / ${r.tab.length}`) : ""}${K.row(nLeft === 2 ? T("La final", "The final") : `${T("Ronda", "Round")} ${r.k + 1}`, sacoName(next))}</div></div>
      <div class="m8-tk gx-sh drop" style="--d:.1s"><div class="gx-paper"><span class="gx-eyb">${Tf("La ronda {k}", "Round {k}", { k: r.k })} · ${T("los puntos vuelven a cero en la siguiente", "points go back to zero next round")}</span>
        <table class="m8-tb n${r.tab.length}"><tr><th></th><th>${T("Jugador", "Player")}</th>${r.qs.map(q => `<th>${esc(qName(q))}</th>`).join("")}<th>${T("Ronda", "Round")}</th></tr>${rows}</table></div></div>
      <div class="m8-ft"><div class="m8-bar"><span id="m8Cnt"></span><u><s style="animation-duration:${secs}s"></s></u></div><div class="gx-acts">${meOut ? `<button type="button" class="gx-btn" id="m8Out"><span>${T("Salir", "Exit")}</span></button>` : ""}${K.primary("m8Next", meOut ? T("Seguir mirando", "Keep watching") : T("Siguiente ronda", "Next round"))}</div></div>`), "tablewrap");
    chips($("dlg"), ".m8-cs", 32, 16);
    A.sfx.stamp(); if (meOut) setTimeout(A.sfx.fail, 380);
    const sT = st; let done = false, left = Math.ceil(secs);
    const cnt = $("m8Cnt"), label = () => { if (cnt) cnt.textContent = Tf(nLeft === 2 ? "La final empieza en {n}" : "La ronda {k} empieza en {n}", nLeft === 2 ? "The final starts in {n}" : "Round {k} starts in {n}", { n: Math.max(1, left), k: r.k + 1 }); };
    const go = () => { if (done || st !== sT || st.phase !== "round") return; done = true; clearInterval(iv); S.skipIntro = null; ask(); };
    label(); const iv = setInterval(() => { if (st !== sT || done) return clearInterval(iv); left--; label(); }, 1000);
    $("m8Next").onclick = go; if ($("m8Out")) $("m8Out").onclick = () => { if (done) return; done = true; clearInterval(iv); quit(); };
    S.skipIntro = go; later(go, secs * 1000);
    if (A.coverMap) A.coverMap("duelo", true, () => !!document.querySelector("#dlg .du-wrap") && !$("layer").classList.contains("hidden"));
  }

  /* ================================================================== 5 · EL VEREDICTO: la mesa entera en el orden en que cayo, tus datos y la corona */
  function summary() {
    const m = me(), mineQ = st.log.filter(r => r.rows[0]), ans = mineQ.filter(r => r.rows[0].km != null), best = ans.slice().sort((a, b) => a.rows[0].km - b.rows[0].km)[0];
    const rWon = st.rounds.filter(r => r.tab[0].i === 0).length, rIn = st.rounds.filter(r => r.tab.some(x => x.i === 0)), close = rIn.filter(r => r.out !== 0).map(r => ({ k: r.k, d: r.tab.find(x => x.i === 0).rp - r.tab[r.tab.length - 1].rp })).sort((a, b) => a.d - b.d)[0];
    return { seed: st.seed, win: !!(st.over && st.over.win), place: m.place || 0, rounds: st.k, questions: st.nq, secs: Math.round(st.secs * 10) / 10, wall: st.t0 ? Math.round((performance.now() - st.t0) / 100) / 10 : null,
      bulls: ans.filter(r => r.rows[0].km <= 25).length, asked: mineQ.length, best: best ? { n: qName(best.q), km: best.rows[0].km } : null, roundsWon: rWon, roundsIn: rIn.length, close: close || null,
      cards: st.log.reduce((n, r) => n + (r.cards || 0), 0), order: st.pl.slice().sort((a, b) => (a.place || 0) - (b.place || 0)).map(p => ({ i: p.i, place: p.place || 0, out: p.out })), log: st.log.map(r => ({ k: r.k, qi: r.qi, id: r.id, d: r.d, pts: Object.fromEntries(Object.entries(r.rows).map(([i, x]) => [i, x.pts])) })) };
  }
  function finish() {
    const c = C(), S = c.S, map = c.map, o = st.over, m = me(), win = !!o.win, s = st; st.phase = "end"; S.phase = "levelEnd"; S.skipIntro = null; timers.forEach(clearTimeout); timers = [];
    map.clearMarks(); map.setDecoys([]); map.animateTo(map.home(), 900); map.setPick(false); pinsClear();
    $("plate").classList.add("hidden"); $("pauseBtn").classList.add("hidden"); for (const id of ["m8Hud", "duTools", "duFact"]) { const e = $(id); if (e) e.classList.add("hidden"); }
    document.body.classList.remove("duelo-lock", "mesa8-watch");
    const sum = (M.last = summary()), was = stats(), now = st.auto ? was : statsAdd(win), real = !st.auto || st.auto.club;
    const club = real && A.club && !(o.quit && sum.asked < CFG.perRound) ? (A.club.bonus(win ? A.club.bonusFor("duel") : 0), A.club.cash()) : null;
    const winner = o.winner != null ? st.pl[o.winner] : null, fin = st.rounds[st.rounds.length - 1], inFinal = !o.quit && fin && fin.tab.length === 2 && fin.tab.some(x => x.i === 0);
    A.sfx.stamp(); setTimeout(win ? A.sfx.victory : A.sfx.fail, 380);
    const lead = win ? Tf("Te quedas con la mesa. Ganaste la final a {name} por {n} puntos.", "The table is yours. You won the final against {name} by {n} points.", { name: nameOf(st.pl[fin.out]), n: A.fmt(fin.margin) })
      : m.quit ? Tf("Te levantaste en la ronda {k}, con {n} en la mesa.", "You got up in round {k}, with {n} at the table.", { k: m.out, n: m.place })
      : inFinal ? Tf("Caíste en la final, a {n} puntos de {name}.", "You fell in the final, {n} points behind {name}.", { n: A.fmt(fin.margin), name: nameOf(winner) })
      : Tf("Caíste en la ronda {k} de {n}.", "You fell in round {k} of {n}.", { k: m.out, n: st.R });
    const rw = (a, b) => K.row(a, b), stat = (sum.best ? rw(T("Tu mejor pregunta", "Your best question"), `${esc(K.cut(sum.best.n, 16))} · ${sum.best.km > 0 ? A.fmtDist(sum.best.km) : T("dentro", "inside")}`) : "") + rw(T("Dianas", "Bullseyes"), Tf("{a} de {b}", "{a} of {b}", { a: sum.bulls, b: sum.asked }))
      + rw(T("Rondas ganadas", "Rounds won"), Tf("{a} de {b}", "{a} of {b}", { a: sum.roundsWon, b: sum.roundsIn }));
    /* bajo la corona, en pequeno: lo cerca que estuviste de caer y las tarjetas de la Enciclopedia (el recibo del Club necesita el alto de la columna) */
    const extra = (sum.close ? `<span>${T("Más cerca de caer", "Closest to falling")}: ${Tf("ronda {k}, por {n}", "round {k}, by {n}", { k: sum.close.k, n: A.fmt(sum.close.d) })}</span>` : "") + (sum.cards ? `<span>${T("Tarjetas nuevas", "New cards")}: ${sum.cards}</span>` : "");
    const how = p => (p.place === 1 ? T("Se queda con la mesa", "Takes the table") : p.quit ? Tf("Se levantó en la ronda {k}", "Got up in round {k}", { k: p.out }) : !p.place ? T("Seguía en la mesa", "Still at the table") : p.out === st.R ? T("Cayó en la final", "Fell in the final") : Tf("Cayó en la ronda {k}", "Fell in round {k}", { k: p.out }));
    const ord = st.pl.slice().sort((a, b) => (a.place || 0) - (b.place || 0) || a.i - b.i), still = ord.filter(p => !p.place), ranked = ord.filter(p => p.place);
    const prow = (p, n) => `<tr class="${p.me ? "me" : ""}"><td>${n}</td><td><span>${chipSlot(p)}<em>${nameOf(p)}</em>${p.me ? `<b class="tg o">${ME()}</b>` : ""}</span></td><td>${how(p)}</td></tr>`;
    const list = still.map(p => prow(p, "·")).join("") + ranked.map(p => prow(p, p.place)).join("");
    const crown = winner || null;
    c.dialog(K.stage("du-fin m8-fin", `<div class="m8-h fromL"><span class="gx-eyb">${NAME()} · ${Tf("{n} preguntas", "{n} questions", { n: st.nq })}</span>
        <h2 class="gx-t-xl">${win ? T("Victoria", "Victory") : m.quit ? T("Te levantas", "You get up") : Tf("Puesto {a} de {b}", "Place {a} of {b}", { a: m.place, b: st.N })}</h2><p class="gx-lead">${lead}</p>
        <div class="rows">${stat}</div>${club ? `<div class="du-club rise" style="--d:1.05s"><div class="gx-paper">${A.club.strip(club)}</div></div>` : ""}</div>
      <div class="m8-tk gx-sh drop" style="--d:.15s"><div class="gx-paper"><span class="gx-eyb">${T("La mesa", "The table")}</span><table class="m8-tb pod">${list}</table></div></div>
      <div class="m8-win rise" style="--d:.5s">${crown ? `${A.icon("crown", "cr")}<span class="m8-cs big" data-chip="${crown.chip}"></span><b>${nameOf(crown)}</b>` : ""}<span>${T("Tus coronas", "Your crowns")}: ${now.w} · ${T("Mesas", "Tables")}: ${now.d}</span>${extra}</div>
      <div class="seatw" id="m8VdSeat" data-tail="r"></div>
      <div class="gx-acts"><button type="button" class="gx-btn gho" id="m8Exit"><span>${T("Salir", "Exit")}</span>${A.gala.keyHint("Esc", "b")}</button>${K.primary("m8Again", T("Otra mesa", "Another table"))}</div>`), "tablewrap");
    chips($("dlg"), ".m8-cs.big", 128, 32); chips($("dlg"), ".m8-tb .m8-cs", 32, 16);
    $("m8Exit").onclick = () => c.showHub("home");
    $("m8Again").onclick = () => M.start({ auto: s.auto, seats: s.N });
    K.seat($("m8VdSeat")); K.speak(line(m.quit ? "quit" : win ? "win" : "lose"), win ? { gesture: "hat_tip" } : { face: "sly" });
    if (club) A.club.play(club, document.querySelector("#dlg .du-club"), 1900);
    if (A.coverMap) A.coverMap("duelo", true, () => !!document.querySelector("#dlg .du-wrap") && !$("layer").classList.contains("hidden"));
    if (st.auto && st.auto.done) st.auto.done(sum);
  }

  /* salir de la mesa (js/game.js -> A.duelo.leave): recoge sus piezas */
  M.leave = again => {
    const c = C(); timers.forEach(clearTimeout); timers = [];
    if (!again) K.unseat(); else K.seat(null);
    for (const id of ["m8Hud", "duTools", "duFact", "m8Pins"]) { const e = $(id); if (e) e.remove(); }
    document.body.classList.remove("duelo-on", "duelo-lock", "mesa8-on", "mesa8-watch"); if (A.codex && A.codex.toastAside) A.codex.toastAside();
    if (c) { c.map.setDecoys([]); c.S.duel = null; c.S.skipIntro = null; } st = null;
  };
  addEventListener("resize", () => { if (!st) return; K.fitDk(); if (st.pins) { st.pins.rect = null; st.pins.sig = ""; } if ($("m8Hud")) chips($("m8Hud"), ".m8-cs", 40, 20); });
})(window.AIQ);
