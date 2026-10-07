/*
 * Geolite - Clasificacion en la portada (v0.14.1). Un boton del menu principal (al lado de la Enciclopedia) despliega un PODIO: se abre
 * siempre en la tabla de la Aventura, la principal, y en pestanas las mejores puntuaciones de hoy y de ayer (de la Aventura o del Reto diario, js/rank.js).
 * Los 3 primeros suben al podio (oro, plata y bronce, con la corona del primero), del 4.o al 8.o van en lista y, si no estas entre ellos, tu puesto
 * al final. Sonidos del resto del menu (roce de ficha al pasar, carta al abrir, clic al cambiar de pestana) y una ficha por escalon al subir el podio,
 * de mas grave (bronce) a mas aguda (oro); la tuya suena a moneda y se enciende con luces de marquesina.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id), P6 = s => A.pick6(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const TITLE = () => P6("Clasificación|Leaderboard|Classement|Placar|Rangliste|Classifica|Clasificación|排行榜|리더보드|ランキング|Рейтинг|Ranking");   // corto: cabe en la fila de la portada
  const TABS = () => [["adv", A.T("Aventura", "Adventure")], ["today", P6("Hoy|Today|Aujourd'hui|Hoje|Heute|Oggi||今天|오늘|今日|Сегодня|Dziś")], ["yday", P6("Ayer|Yesterday|Hier|Ontem|Gestern|Ieri||昨天|어제|昨日|Вчера|Wczoraj")]];
  const boardOf = t => (t === "today" ? A.rank.day.board() : t === "yday" ? A.rank.day.yesterday() : "adv-all");   // Hoy y Ayer: la mejor partida de cada uno, de la Aventura o del Reto diario
  const ROWS = 8;                                                     // 3 en el podio + 5 en la lista: la misma peticion que la tabla del Reto diario
  let tab = "adv", seq = 0, sfxT = [], back = null, dealerWas = false;
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
  function open() {
    const layer = $("layer"); if (!layer || isOpen() || !document.querySelector(".hh")) return;
    tab = "adv"; back = document.activeElement;
    const btn = $("rankBtn"); if (btn) btn.setAttribute("aria-expanded", "true");
    const close6 = A.t("codex.close");
    layer.insertAdjacentHTML("beforeend", `<div class="pd-wrap" id="pdWrap"><div class="pd-veil" id="pdVeil" role="button" aria-label="${esc(close6)}"></div>
      <section class="podio" id="podio" role="dialog" aria-modal="true" aria-labelledby="pdH" tabindex="-1">
        <header class="pd-head"><span class="pd-ic">${A.icon("m_rank")}</span><h3 id="pdH">${TITLE()}</h3><button type="button" class="pd-x" id="pdX" aria-label="${esc(close6)}">${A.icon("u_close")}</button></header>
        <div class="dr-tabs pd-tabs" role="tablist">${TABS().map(([id, l]) => `<button type="button" role="tab" class="sq-fit${id === tab ? " on" : ""}" data-b="${id}" aria-selected="${id === tab}">${l}</button>`).join("")}</div>
        <div class="pd-body wait" id="pdBody">${body(null)}</div>
      </section></div>`);
    /* como con Ajustes: el crupier del inicio se aparta mientras miras la tabla y vuelve al cerrarla */
    if (A.dealer && A.dealer.homeTease) { dealerWas = !!A.dealer.onHome; if (dealerWas) A.dealer.homeTease(false); }
    $("pdVeil").onclick = () => close(); $("pdX").onclick = () => close();
    document.querySelectorAll(".pd-tabs button").forEach(b => (b.onclick = () => {
      if (b.dataset.b === tab) return;
      tab = b.dataset.b; document.querySelectorAll(".pd-tabs button").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); });
      A.sfx.ui(); load();
    }));
    fit(); A.sfx.card();
    const p = $("podio"); p.focus({ preventScroll: true }); if (A.squeeze) A.squeeze(p.querySelector(".pd-tabs"));
    load();
  }
  /* se despliega desde el propio boton y, en escritorio, nunca se sale de la pantalla (si no cabe, se encoge entero: nada de barras) */
  function fit() {
    const p = $("podio"), w = $("pdWrap"); if (!p || !w) return;
    /* offsetHeight/offsetLeft van en px propios del panel (sin su zoom ni la animacion de entrada): x zoom = px de pantalla */
    const desk = innerWidth >= 900 && innerHeight >= 520, k = desk ? A.uiK() : 1;
    let z = k; p.style.zoom = z;
    if (desk) { const h = p.offsetHeight * z, room = innerHeight - 24; if (h > room) { z = +(k * room / h).toFixed(3); p.style.zoom = z; } }
    const btn = $("rankBtn"); if (!btn) return;
    const a = btn.getBoundingClientRect(), o = w.getBoundingClientRect();
    p.style.setProperty("--ox", Math.round((a.left + a.width / 2 - o.left) / z - p.offsetLeft) + "px");
    p.style.setProperty("--oy", Math.round((a.top - o.top) / z - p.offsetTop) + "px");
  }
  function close(silent) {
    seq++; sfxT.forEach(clearTimeout); sfxT = [];
    const w = $("pdWrap"); if (!w) return;
    ["pdWrap", "podio", "pdVeil", "pdBody", "pdX"].forEach(id => { const el = $(id); if (el) el.removeAttribute("id"); });   // ya cerrado: se puede volver a abrir mientras se va
    w.classList.add("out"); setTimeout(() => w.remove(), 220);
    const btn = $("rankBtn"); if (btn) btn.setAttribute("aria-expanded", "false");
    if (dealerWas && A.dealer && A.dealer.homeTease && document.querySelector(".hh")) A.dealer.homeTease(true); dealerWas = false;
    if (!silent) A.sfx.ui();
    const b = back; back = null; if (b && b !== document.body && b.isConnected && b.focus) b.focus({ preventScroll: true });
  }

  /* contenido: origen, podio (2.o, 1.o, 3.o), lista del 4.o al 8.o y el pie (tu puesto, lo que te falta para el podio o como entrar).
     rows = null: esperando al servidor (mismas medidas, sin nadie: al llegar, los escalones suben desde el suelo) */
  function body(res) {
    const rows = (res && res.rows) || [], day = false, my = A.profile.get().id, meI = rows.findIndex(r => r.id === my);
    const dots = r => (day ? `<span class="lb-tries">${[0, 1, 2].map(i => `<i class="${r.tries && i < r.tries.length ? "on" : ""}"></i>`).join("")}</span>` : "");
    const col = n => {
      const r = rows[n - 1], me = !!r && r.id === my;
      return `<div class="pd-col p${n}${r ? "" : " empty"}${me ? " me" : ""}"><span class="pd-who">${n === 1 ? `<span class="pd-crown">${A.icon("crown")}</span>` : ""}<b class="pd-name">${r ? esc(r.name || "—") : "—"}</b><span class="pd-score">${r ? A.fmt(r.score) : "&nbsp;"}</span>${r ? dots(r) : ""}</span>
        <span class="pd-step">${me ? '<i class="marq"></i>' : ""}<em>${n}</em></span></div>`;
    };
    const li = (r, n, i) => `<li class="${r.id === my ? "me" : ""}" style="--i:${i}"><span class="lb-n">${A.fmt(n)}</span><span class="lb-name">${esc(r.name || "—")}</span>${dots(r)}<b>${A.fmt(r.score)}</b></li>`;
    let list = ""; for (let n = 4; n <= ROWS; n++) list += rows[n - 1] ? li(rows[n - 1], n, n - 4) : `<li class="free"><span class="lb-n">${A.fmt(n)}</span><span class="lb-name">${res ? "—" : "…"}</span></li>`;
    /* pie: fuera de los 8 -> tu fila con tu puesto mundial; dentro -> lo que te falta para el podio (o que ya estas); sin puntuacion -> como entrar */
    let foot = "";
    if (res) {
      if (meI < 0 && res.global && res.me) foot = `<ol class="lb pd-list pd-me${day ? " dy" : ""}"><li class="lb-gap" aria-hidden="true">···</li>${li({ id: my, name: A.rank.name(), score: res.me.score, tries: day ? A.rank.daily.get(boardOf(tab)).tries.filter(t => !t.live) : null }, res.me.rank, 0)}</ol>`;
      else if (meI < 0) foot = `<p class="pd-hint"><span>${tab === "yday" ? P6("Ayer no jugaste|You didn't play yesterday|Tu n'as pas joué hier|Você não jogou ontem|Gestern hast du nicht gespielt|Ieri non hai giocato||你昨天没玩|어제는 플레이하지 않았어요|昨日はプレイしていない|Вчера игры не было|Wczoraj cię nie było")
        : P6("Todavía no estás aquí|You're not on the board yet|Tu n'es pas encore au classement|Você ainda não está no placar|Du stehst noch nicht in der Liste|Non sei ancora in classifica||你还没有上榜|아직 순위에 없어요|まだランクインしていない|Тебя пока нет в таблице|Jeszcze cię tu nie ma")}</span>${tab === "yday" ? "" : `<button type="button" class="btn-ink" id="pdPlay"><span>${P6("Jugar|Play|Jouer|Jogar|Spielen|Gioca||开始游戏|플레이|プレイ|Играть|Graj")}</span><span class="ar">${A.icon("u_next", "sm")}</span></button>`}</p>`;
      else if (res.global && meI < 3) foot = `<p class="pd-hint top">${A.icon("u_star", "sm")}<span>${P6("¡Estás en el podio!|You're on the podium!|Tu es sur le podium !|Você está no pódio!|Du stehst auf dem Podest!|Sei sul podio!||你登上了领奖台！|시상대에 올랐어요!|表彰台に乗った！|Ты на пьедестале!|Jesteś na podium!")}</span></p>`;
      else if (res.global) foot = `<p class="pd-hint"><span>${P6("A {n} pts del podio|{n} pts from the podium|À {n} pts du podium|A {n} pts do pódio|{n} Pkt. bis zum Podest|A {n} punti dal podio||距领奖台还差 {n} 分|시상대까지 {n}점|表彰台まであと{n}点|До пьедестала {n} очк.|Do podium brakuje {n} pkt").replace("{n}", A.fmt(Math.max(1, rows[2].score - rows[meI].score + 1)))}</span></p>`;
    }
    return `<p class="lb-src pd-src">${res ? src(res) : "<span>…</span>"}</p>
      <div class="pd-stage">${col(2)}${col(1)}${col(3)}</div>
      <ol class="lb pd-list${day ? " dy" : ""}">${list}</ol>
      <div class="pd-foot">${foot}</div>`;
  }
  async function load() {
    const el = $("pdBody"); if (!el) return;
    const n = ++seq, t = tab; sfxT.forEach(clearTimeout); sfxT = [];
    el.classList.add("wait"); el.innerHTML = body(null);
    const res = await A.rank.topC(boardOf(t), ROWS);
    if (n !== seq || t !== tab || !$("pdBody")) return;
    el.innerHTML = body(res); el.classList.remove("wait");
    const play = $("pdPlay"); if (play) play.onclick = () => A.hub.screen("adventure");   // hub.screen quita el podio (reset)
    /* los escalones aterrizan de bronce a oro: una ficha cada uno, cada vez mas aguda (el tuyo, moneda) */
    const rows = res.rows || [], my = A.profile.get().id;
    [[3, 430], [2, 530], [1, 630]].forEach(([p, ms], k) => { const r = rows[p - 1]; if (r) sfxT.push(setTimeout(() => { if (n === seq) (r.id === my ? A.sfx.coin(k) : A.sfx.chip(k)); }, ms)); });
    fit();
  }

  /* teclado: Esc cierra; Intro y espacio no llegan al menu de debajo (Intro pulsaba "Continuar" de la partida guardada) */
  document.addEventListener("keydown", e => {
    if (!isOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === "Enter" || e.key === " ") e.stopPropagation();
  }, true);
  addEventListener("resize", () => { if (isOpen()) fit(); });

  A.podio = { button, wire, open, close, reset, isOpen, src };
})(window.AIQ);
