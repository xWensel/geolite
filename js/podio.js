/*
 * Geolite - Clasificacion en la portada (v0.14.1; pantalla completa en Naipe de gala desde la v0.3.39). Un boton del menu principal abre un PODIO: se abre
 * siempre en la tabla de la Aventura, la principal. Dos filas de pestanas (v0.3.19): el modo (Aventura | Reto diario) y, debajo y colgando de el,
 * su periodo: la Aventura tiene Historico, Hoy y Ayer (solo expediciones de la Aventura) y el Reto diario Hoy y Ayer (suma de sus 3 intentos), js/rank.js.
 * Los 3 primeros suben al podio (oro, plata y bronce, con la corona del primero), la lista va de 5 en 5 con flechas (4.o-8.o, 9.o-13.o... hasta el
 * ultimo de la tabla) y, si no estas en la pagina, tu puesto al final (pulsarlo te lleva a tu pagina). Sonidos del resto del menu (roce de ficha al pasar, carta al abrir, clic al cambiar de pestana) y una ficha por escalon al subir el podio,
 * de mas grave (bronce) a mas aguda (oro); la tuya suena a moneda y se enciende con luces de marquesina.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id), P6 = s => A.pick6(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const TITLE = () => P6("Clasificación|Leaderboard|Classement|Placar|Rangliste|Classifica|Clasificación|排行榜|리더보드|ランキング|Рейтинг|Ranking");   // corto: cabe en la fila de la portada
  const L_TODAY = () => P6("Hoy|Today|Aujourd'hui|Hoje|Heute|Oggi||今天|오늘|今日|Сегодня|Dziś"), L_YDAY = () => P6("Ayer|Yesterday|Hier|Ontem|Gestern|Ieri||昨天|어제|昨日|Вчера|Wczoraj");
  const MODES = () => [["adv", "dealer_mini", A.T("Aventura", "Adventure")], ["daily", "dice", A.T("Reto diario", "Daily challenge")]].filter(m => m[0] !== "daily" || A.dailyOn !== false);   // el Reto diario, retirado por ahora (js/hub.js)
  const PERS = m => (m === "adv" ? [["all", P6("Histórico|All time|Historique|Histórico|Gesamt|Di sempre||历史|역대|歴代|За всё время|Wszech czasów")], ["today", L_TODAY()], ["yday", L_YDAY()]] : [["today", L_TODAY()], ["yday", L_YDAY()]]);
  /* Aventura: la de siempre y la mejor expedicion de hoy / ayer; Reto diario: la puntuacion global (suma de los 3 intentos) de hoy / ayer */
  const boardOf = (m, p) => (m === "daily" ? (p === "yday" ? A.rank.daily.yesterday() : A.rank.daily.board()) : p === "today" ? A.rank.day.board() : p === "yday" ? A.rank.day.yesterday() : "adv-all");
  const ROWS = 8, PER = 5;                                            // 3 en el podio + 5 en la lista (la misma peticion que la tabla del Reto diario); despues, paginas de 5
  let mode = "adv", per = "all", page = 0, pages = 1, first = null, seq = 0, sfxT = [], back = null, dealerWas = false;
  const tab = () => mode + ":" + per;
  const isOpen = () => !!$("podio");

  /* de donde sale la tabla: mundial (con los jugadores que hay) o solo este equipo (sin servidor). Tambien la usa el Reto diario (js/hub.js) */
  const src = res => (res.global ? `${A.icon("globe", "sm")}<span>${P6("Mundial|Worldwide|Mondial|Mundial|Weltweit|Mondiale||全球|전 세계|世界|Мировая|Światowy")}</span><em>${P6("Jugadores: {n}|Players: {n}|Joueurs : {n}|Jogadores: {n}|Spieler: {n}|Giocatori: {n}||玩家：{n}|플레이어: {n}|プレイヤー：{n}|Игроков: {n}|Graczy: {n}").replace("{n}", A.fmt(res.count))}</em>`
    : `<span>${P6("Solo este equipo|This device only|Cet appareil uniquement|Só este aparelho|Nur dieses Gerät|Solo questo dispositivo||仅限本设备|이 기기만|この端末のみ|Только это устройство|Tylko to urządzenie")}</span>`);

  /* ------------------------------------------------------------------ boton de la portada: la placa dorada del centro (bajo la carta de la Aventura).
     La cinta de neon es tu puesto MUNDIAL en la Aventura (sin servidor no se ensena: seria "#1 de 1"); no mueve nada al aparecer */
  const button = () => A.hub.plaque("plq-rank", "rankBtn", "m_rank", TITLE(), "", null,   // sin etiqueta: la clasificacion es de varios modos, el titulo es el protagonista
    `aria-haspopup="dialog" aria-expanded="false" ${A.ttAttr(TITLE(), A.tip6("El podio de la Aventura y las mejores puntuaciones de hoy y de ayer.|The Adventure podium, plus the best scores of today and yesterday.|Le podium de l'Aventure et les meilleurs scores d'aujourd'hui et d'hier.|O pódio da Aventura e as melhores pontuações de hoje e de ontem.|Das Podest des Abenteuers und die besten Punktzahlen von heute und gestern.|Il podio dell'Avventura e i migliori punteggi di oggi e di ieri.||冒险模式的领奖台，以及今天和昨天的最高分。|모험 시상대와 오늘·어제의 최고 점수.|アドベンチャーの表彰台と、今日と昨日のベストスコア。|Пьедестал Приключения и лучшие результаты за сегодня и вчера.|Podium Przygody oraz najlepsze wyniki z dziś i wczoraj."))}`,
    `<em class="plq-rib" id="rkMine"></em>`);
  /* cambio de pantalla (o la portada se vuelve a pintar): fuera el podio al instante, sin sonido y sin tocar al crupier (lo gobierna la pantalla nueva) */
  const reset = () => { seq++; sfxT.forEach(clearTimeout); sfxT = []; dealerWas = false; back = null; document.querySelectorAll(".pd-wrap").forEach(w => w.remove()); };
  let filled = false;
  const wire = () => {
    reset();
    if (!filled) { filled = true; A.rank.day.fill(); }               // Hoy / Ayer: tambien las partidas de esos dias jugadas antes de existir sus tablas
    const b = $("rankBtn"); if (!b) return;
    b.onclick = () => (isOpen() ? close() : open());
    const P = A.profile.get(); if (!(P.boards["adv-all"] || []).some(r => r.id === P.id)) return;   // sin puntuacion de Aventura no hay puesto que ensenar: ni se pregunta
    A.rank.topC("adv-all", ROWS, 300000).then(res => {
      const el = $("rkMine"); if (!el || !res || !res.global) return;
      const my = A.profile.get().id, i = (res.rows || []).findIndex(r => r.id === my), n = i >= 0 ? i + 1 : res.me && res.me.rank;
      if (n) { el.innerHTML = A.icon("globe") + "#" + A.fmt(n); el.classList.add("on"); }
    });
  };

  /* ------------------------------------------------------------------ el podio */
  /* v0.3.39 (Naipe de gala): los dos selectores del sistema, en la cabecera: el modo y su periodo */
  const tabsHtml = () => `<div class="gx-seg pd-modes${MODES().length > 1 ? "" : " hidden"}" role="tablist">${MODES().map(([id, ic, l]) => `<button type="button" role="tab" class="pd-mode${id === mode ? " on" : ""}" data-m="${id}" aria-selected="${id === mode}"><span class="pd-mi">${A.icon(ic)}</span><span>${l}</span></button>`).join("")}</div>
    <div class="gx-seg pd-tabs" role="tablist">${PERS(mode).map(([id, l]) => `<button type="button" role="tab" class="${id === per ? "on" : ""}" data-p="${id}" aria-selected="${id === per}">${l}</button>`).join("")}</div>`;
  function wireTabs() {
    const p = $("podio"); if (!p) return;
    p.querySelectorAll(".pd-mode").forEach(b => (b.onclick = () => {
      if (b.dataset.m === mode) return;
      mode = b.dataset.m; per = mode === "adv" ? "all" : "today"; A.sfx.chip(1); retab();
    }));
    p.querySelectorAll(".pd-tabs button").forEach(b => (b.onclick = () => {
      if (b.dataset.p === per) return;
      per = b.dataset.p; p.querySelectorAll(".pd-tabs button").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); });
      A.sfx.ui(); load();
    }));
  }
  /* al cambiar de modo, la fila de periodos se reparte con los suyos (la Aventura tiene Historico; el Reto diario, solo Hoy y Ayer) */
  function retab() {
    const t = $("pdTabs"); if (!t) return;
    t.innerHTML = tabsHtml(); wireTabs();
    const on = t.querySelector(".pd-mode.on"); if (on) on.focus({ preventScroll: true });
    load();
  }
  /* v0.3.39: pantalla completa (antes, un panel que salia de la placa): podio de fichas apiladas a la izquierda y la pizarra de papel a la derecha.
     Entra y sale con la fisica comun (js/gala.js). El crupier la sigue leyendo por sus clases (js/dealer.js podSay): .podio es la pizarra */
  function open() {
    const layer = $("layer"); if (!layer || isOpen() || !document.querySelector(".hh")) return;
    mode = "adv"; per = "all"; back = document.activeElement;
    const btn = $("rankBtn"); if (btn) btn.setAttribute("aria-expanded", "true");
    layer.insertAdjacentHTML("beforeend", `<div class="pd-wrap" id="pdWrap"><div class="gx-veil"></div>
      <section class="pd-screen gx-stage" id="podio" role="dialog" aria-modal="true" aria-labelledby="pdH" tabindex="-1">
        <header class="pd-head"><button type="button" class="gx-btn sm pd-x" id="pdX">${A.icon("u_back")}<span>${A.t("set.close")}</span>${A.gala.keyHint("Esc", "b")}</button>
          <h2 class="gx-t-l" id="pdH"><span class="pd-ic">${A.icon("m_rank")}</span>${TITLE()}</h2>
          <div class="pd-tabset" id="pdTabs">${tabsHtml()}</div></header>
        <div class="pd-body wait" id="pdBody">${body(null)}</div>
      </section></div>`);
    /* como con Ajustes: el crupier del inicio se aparta mientras miras la tabla y vuelve al cerrarla */
    if (A.dealer && A.dealer.homeTease) { dealerWas = !!A.dealer.onHome; if (dealerWas) A.dealer.homeTease(false); }
    $("pdX").onclick = () => close();
    wireTabs(); A.sfx.card();
    const w = $("pdWrap"); w._gx = A.gala.enter(w, { focus: w.querySelector(".pd-mode.on"), noRestore: true });
    load();
  }
  function close(silent) {
    seq++; sfxT.forEach(clearTimeout); sfxT = [];
    const w = $("pdWrap"); if (!w) return;
    ["pdWrap", "podio", "pdBody", "pdX"].forEach(id => { const el = $(id); if (el) el.removeAttribute("id"); });   // ya cerrado: se puede volver a abrir mientras se va
    if (w._gx) w._gx.close(() => w.remove()); else w.remove();
    const btn = $("rankBtn"); if (btn) btn.setAttribute("aria-expanded", "false");
    if (dealerWas && A.dealer && A.dealer.homeTease && document.querySelector(".hh")) A.dealer.homeTease(true); dealerWas = false;
    if (!silent) A.sfx.ui();
    const b = back; back = null; if (b && b !== document.body && b.isConnected && b.focus) b.focus({ preventScroll: true });
  }

  /* fecha de la tabla del dia ("jueves, 8 de octubre"): deja claro de que dia (y de que modo) es ese Hoy / Ayer */
  const dayOf = b => { const m = /(\d{4})(\d{2})(\d{2})$/.exec(b); if (!m) return ""; const L = (A.LANGS || []).find(l => l.code === A.lang); try { return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(L ? L.loc : A.lang, { weekday: "long", day: "numeric", month: "long" }); } catch (e) { return ""; } };
  const RANKS = () => P6("Puestos {a}–{b}|Ranks {a}–{b}|Places {a}–{b}|Posições {a}–{b}|Plätze {a}–{b}|Posizioni {a}–{b}||第 {a}–{b} 名|{a}–{b}위|{a}～{b}位|Места {a}–{b}|Miejsca {a}–{b}");
  const OF = () => P6("de {n}|of {n}|sur {n}|de {n}|von {n}|su {n}||共 {n} 人|/ {n}명|/ {n}人|из {n}|z {n}");
  const dots = r => (mode === "daily" ? `<span class="lb-tries">${[0, 1, 2].map(i => `<i class="${r.tries && i < r.tries.length ? "on" : ""}"></i>`).join("")}</span>` : "");
  const li = (r, n, i, my) => `<li class="${r.id === my ? "me" : ""}" style="--i:${i}"><span class="lb-n">${A.fmt(n)}</span><span class="lb-name">${esc(r.name || "—")}</span>${dots(r)}<b>${A.fmt(r.score)}</b></li>`;
  /* una pagina de la lista: siempre 5 filas (las que faltan, huecos), asi el panel nunca cambia de alto al pasar paginas */
  function listHtml(rows, from, res) {
    const my = A.profile.get().id; let s = "";
    for (let k = 0; k < PER; k++) { const n = from + k, r = rows && rows[k]; s += r ? li(r, n, k, my) : `<li class="free"><span class="lb-n">${A.fmt(n)}</span><span class="lb-name">${res ? "—" : "…"}</span></li>`; }
    return s;
  }
  const rk = (a, b) => RANKS().replace("{a}", A.fmt(a)).replace("{b}", A.fmt(b));
  const pagerHtml = () => {
    const a = 4 + page * PER, cnt = (first && (first.count || (first.rows || []).length)) || 0;
    return `<button type="button" class="gx-btn sm pd-pg prev" id="pdPrev" ${page > 0 ? "" : "disabled"} aria-label="${esc(rk(Math.max(4, a - PER), Math.max(8, a - 1)))}">${A.icon("u_next")}</button>
      <span class="pd-pgl"><b>${rk(a, a + PER - 1)}</b>${cnt > 3 ? `<em>${OF().replace("{n}", A.fmt(cnt))}</em>` : ""}</span>
      <button type="button" class="gx-btn sm pd-pg next" id="pdNext" ${page < pages - 1 ? "" : "disabled"} aria-label="${esc(rk(a + PER, a + 2 * PER - 1))}">${A.icon("u_next")}</button>`;
  };
  /* v0.3.43: al pasar pagina las flechas se quedan (antes se rehacian y el foco del mando o del teclado se perdia): solo cambian su estado y la etiqueta */
  function refreshPager() {
    const pv = $("pdPrev"), nx = $("pdNext"), pg = $("pdPager"); if (!pv || !nx || !pg) return;
    const a = 4 + page * PER, cnt = (first && (first.count || (first.rows || []).length)) || 0;
    pv.disabled = page <= 0; nx.disabled = page >= pages - 1;
    pv.setAttribute("aria-label", rk(Math.max(4, a - PER), Math.max(8, a - 1))); nx.setAttribute("aria-label", rk(a + PER, a + 2 * PER - 1));
    const l = pg.querySelector(".pd-pgl"); if (l) l.innerHTML = `<b>${rk(a, a + PER - 1)}</b>${cnt > 3 ? `<em>${OF().replace("{n}", A.fmt(cnt))}</em>` : ""}`;
    pg.classList.toggle("solo", pages < 2);
  }
  /* la pagina de al lado se pide ya: al pulsar la flecha llega al instante (A.rank.topC la guarda 30 s) y nunca se ven huecos con "…" */
  const prefetch = () => { const b = boardOf(mode, per); [page - 1, page + 1].forEach(q => { if (q > 0 && q < pages) A.rank.topC(b, PER, 30000, 3 + q * PER); }); };
  /* contenido: origen y fecha, podio (2.o, 1.o, 3.o), lista de 5 con sus flechas y el pie (tu puesto, lo que te falta para el podio o como entrar).
     res = null: esperando al servidor (mismas medidas, sin nadie: al llegar, los escalones suben desde el suelo) */
  function body(res) {
    const rows = (res && res.rows) || [], day = mode === "daily", my = A.profile.get().id, meI = rows.findIndex(r => r.id === my), b = boardOf(mode, per);
    /* cada puesto es una pila de fichas: su alto mide la puntuacion (la del primero, la mas alta); sin nadie, una ficha suelta */
    const top = rows[0] ? Math.max(1, rows[0].score) : 1, MEDAL = ["", "medal_gold", "medal_silver", "medal_bronze"];
    const col = n => {
      const r = rows[n - 1], me = !!r && r.id === my, h = r ? 28 + Math.round(196 * Math.min(1, r.score / top)) : 14;
      return `<div class="pd-col p${n}${r ? "" : " empty"}${me ? " me" : ""}" style="--h:${h - (h % 7)}px"><span class="pd-who">${n === 1 ? `<span class="pd-crown">${A.icon("crown")}</span>` : ""}<span class="pd-medal">${A.icon(MEDAL[n])}</span><b class="pd-name">${r ? esc(r.name || "—") : "—"}</b><span class="pd-score">${r ? A.fmt(r.score) : "&nbsp;"}</span>${r ? dots(r) : ""}</span>
        <span class="pd-step"><i class="pd-chips"></i>${me ? A.bulbs() : ""}<em>${n}</em></span></div>`;
    };
    /* pie: fuera de los 8 -> tu fila con tu puesto mundial (pulsarla lleva a tu pagina); dentro -> lo que te falta para el podio (o que ya estas); sin puntuacion -> como entrar */
    let foot = "";
    if (res) {
      if (meI < 0 && res.me) foot = `<ol class="lb pd-list pd-me${day ? " dy" : ""}" id="pdMe"><li class="lb-gap" aria-hidden="true">···</li>${li({ id: my, name: A.rank.name(), score: res.me.score, tries: day ? A.rank.daily.get(b).tries.filter(t => !t.live) : null }, res.me.rank, 0, my)}</ol>`;
      else if (meI < 0) foot = `<p class="pd-hint"><span>${per === "yday" ? P6("Ayer no jugaste|You didn't play yesterday|Tu n'as pas joué hier|Você não jogou ontem|Gestern hast du nicht gespielt|Ieri non hai giocato||你昨天没玩|어제는 플레이하지 않았어요|昨日はプレイしていない|Вчера игры не было|Wczoraj cię nie było")
        : P6("Todavía no estás aquí|You're not on the board yet|Tu n'es pas encore au classement|Você ainda não está no placar|Du stehst noch nicht in der Liste|Non sei ancora in classifica||你还没有上榜|아직 순위에 없어요|まだランクインしていない|Тебя пока нет в таблице|Jeszcze cię tu nie ma")}</span>${per === "yday" ? "" : `<button type="button" class="gx-btn pri sm" id="pdPlay"><span>${P6("Jugar|Play|Jouer|Jogar|Spielen|Gioca||开始游戏|플레이|プレイ|Играть|Graj")}</span></button>`}</p>`;
      else if (res.global && meI < 3) foot = `<p class="pd-hint top">${A.icon("u_star", "sm")}<span>${P6("¡Estás en el podio!|You're on the podium!|Tu es sur le podium !|Você está no pódio!|Du stehst auf dem Podest!|Sei sul podio!||你登上了领奖台！|시상대에 올랐어요!|表彰台に乗った！|Ты на пьедестале!|Jesteś na podium!")}</span></p>`;
      else if (res.global) foot = `<p class="pd-hint"><span>${P6("A {n} pts del podio|{n} pts from the podium|À {n} pts du podium|A {n} pts do pódio|{n} Pkt. bis zum Podest|A {n} punti dal podio||距领奖台还差 {n} 分|시상대까지 {n}점|表彰台まであと{n}点|До пьедестала {n} очк.|Do podium brakuje {n} pkt").replace("{n}", A.fmt(Math.max(1, rows[2].score - rows[meI].score + 1)))}</span></p>`;
    }
    const when = per === "all" ? "" : dayOf(b);
    return `<div class="pd-left gx-from-left"><p class="lb-src pd-src">${res ? src(res) : "<span>…</span>"}${when ? `<span class="pd-day">${esc(when)}</span>` : ""}</p>
        <div class="pd-stage">${col(2)}${col(1)}${col(3)}</div></div>
      <div class="podio pd-board gx-paper"><div class="pd-bh${day ? " dy" : ""}"><span>#</span><span>${P6("Jugador|Player|Joueur|Jogador|Spieler|Giocatore||玩家|플레이어|プレイヤー|Игрок|Gracz")}</span>${day ? `<span>${P6("Intentos|Attempts|Essais|Tentativas|Versuche|Tentativi||尝试|시도|挑戦|Попытки|Podejścia")}</span>` : ""}<span>${P6("Puntos|Points|Points|Pontos|Punkte|Punti||分数|점수|ポイント|Очки|Punkty")}</span></div>
        <ol class="lb pd-list${day ? " dy" : ""}" id="pdList">${listHtml(rows.slice(3, 3 + PER), 4, res)}</ol>
        <div class="pd-pager${res && pages > 1 ? "" : " solo"}" id="pdPager">${pagerHtml()}</div>
        <div class="pd-foot">${foot}</div></div>`;
  }
  async function load() {
    const el = $("pdBody"); if (!el) return;
    const n = ++seq, t = tab(); sfxT.forEach(clearTimeout); sfxT = [];
    page = 0; pages = 1; first = null;
    el.classList.add("wait"); el.innerHTML = body(null);
    const res = await A.rank.topC(boardOf(mode, per), ROWS);
    if (n !== seq || t !== tab() || !$("pdBody")) return;
    first = res; pages = Math.max(1, Math.ceil(((res.count || (res.rows || []).length) - 3) / PER));
    el.innerHTML = body(res); el.classList.remove("wait");
    const play = $("pdPlay"); if (play) play.onclick = () => A.hub.screen(mode === "daily" ? "daily" : "adventure");   // hub.screen quita el podio (reset)
    wirePager(); prefetch();
    /* los escalones aterrizan de bronce a oro: una ficha cada uno, cada vez mas aguda (el tuyo, moneda) */
    const rows = res.rows || [], my = A.profile.get().id;
    [[3, 430], [2, 530], [1, 630]].forEach(([p, ms], k) => { const r = rows[p - 1]; if (r) sfxT.push(setTimeout(() => { if (n === seq) (r.id === my ? A.sfx.coin(k) : A.sfx.chip(k)); }, ms)); });
  }
  function wirePager() {
    const pv = $("pdPrev"), nx = $("pdNext"), me = $("pdMe");
    if (pv) pv.onclick = () => goPage(page - 1);
    if (nx) nx.onclick = () => goPage(page + 1);
    /* tu fila del pie: te lleva a la pagina en la que estas */
    if (me && first && first.me && first.me.rank > 3) {
      const to = Math.floor((first.me.rank - 4) / PER);
      me.classList.toggle("jump", to !== page); me.onclick = () => goPage(to);
    }
  }
  /* pasar pagina: el podio se queda; la lista vieja sale hacia un lado y la nueva entra del otro, fluida (A.gala.turn). Si el servidor tarda, huecos
     con "…" mientras llega (con la pagina de al lado pedida de antemano, casi nunca) */
  async function goPage(p) {
    const list = $("pdList"); if (!list || !first || p < 0 || p >= pages || p === page) return;
    const dir = p > page ? 1 : -1, n = ++seq, t = tab(), from = 4 + p * PER, b = boardOf(mode, per); page = p;
    sfxT.forEach(clearTimeout); sfxT = []; A.sfx.chip(dir > 0 ? 2 : 0);
    refreshPager(); wirePager();
    const req = p === 0 ? Promise.resolve(first) : A.rank.topC(b, PER, 30000, 3 + p * PER);
    const quick = await Promise.race([req, new Promise(r => setTimeout(r, 120))]);
    if (n !== seq || t !== tab() || !$("pdList")) return;
    const rowsOf = got => (p === 0 ? (got.rows || []).slice(3, 3 + PER) : got.rows || []);
    A.gala.turn(list, quick ? listHtml(rowsOf(quick), from, quick) : listHtml(null, from, null), dir);
    if (!quick) { const got = await req; if (n !== seq || t !== tab() || !$("pdList")) return; list.innerHTML = listHtml(rowsOf(got), from, got); }
    prefetch();
  }

  /* teclado: Esc cierra; AvPag / RePag pasan de pagina; Intro y espacio no llegan al menu de debajo (Intro pulsaba "Continuar" de la partida guardada) */
  document.addEventListener("keydown", e => {
    if (!isOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === "PageDown" || e.key === "PageUp") { e.preventDefault(); e.stopPropagation(); goPage(page + (e.key === "PageDown" ? 1 : -1)); }
    else if (e.key === "Enter" || e.key === " ") e.stopPropagation();
  }, true);

  A.podio = { button, wire, open, close, reset, isOpen, src, dayOf };
})(window.AIQ);
