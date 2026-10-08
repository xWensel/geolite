/* Geolite - DON CRUPIER EN DIRECTO. La partida avisa de que esta abierta (api/vivo.js) y el autor, desde su mesa (mesa/), puede
   mirarla y hablar por el crupier: la frase sale en su bocadillo con el piloto rojo de EN DIRECTO (A.dealer.live, js/dealer.js).
   Latido cada 25 s (60 s con la ventana oculta) con el estado de la partida; si el autor la esta mirando, cada 2 s. Sin conexion no pasa nada.
   Se envia solo: nombre, idioma, plataforma, version y por donde vas (pantalla, ronda, lugar, puntos). sid aleatorio en cada arranque.
   El jugador lo apaga en Ajustes > Datos ("atlasiq.vivo" = "0"). */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id);
  const KEY = "atlasiq.vivo", SITE = "https://geolite-game.vercel.app";
  const sid = Array.from(crypto.getRandomValues(new Uint8Array(9)), b => (b % 36).toString(36)).join("") + Date.now().toString(36).slice(-4);
  const t0 = Date.now();
  const host = window.geoliteHost;
  /* la web llama a su propia API; el escritorio (servidor local en 127.0.0.1) a la de la web; en desarrollo, nada salvo que se pida (atlasiq.vivo.url) */
  const URL_ = (() => {
    try { const o = localStorage.getItem(KEY + ".url"); if (o) return o; } catch (e) { /* sin almacenamiento */ }
    if (host) return SITE + "/api/vivo";
    if (/^https:$/.test(location.protocol) && !/localhost|127\.0\.0\.1/.test(location.hostname)) return "/api/vivo";
    return null;
  })();
  const on = () => { try { return localStorage.getItem(KEY) !== "0"; } catch (e) { return true; } };
  const plat = () => host ? (host.device === "deck" ? "deck" : /linux/i.test(navigator.userAgent) ? "linux" : "win") + (host.demo ? "-demo" : "") : matchMedia("(pointer: coarse)").matches ? "movil" : "web";
  const es = v => (v && typeof v === "object" ? v.es || v.en || "" : v || "");

  /* por donde va: lo justo para que la mesa lo cuente ("Aventura · ronda 7 · buscando Ulan Bator") */
  function state() {
    const C = A.core, S = C && C.S, P = A.profile && A.profile.get(), o = { n: (P && P.name) || "", l: A.lang, p: plat(), v: A.VERSION, t0 };
    if (!S) return o;
    o.ph = S.phase;
    const q = S.qs && S.qs[S.qi];
    if (S.phase === "title") o.sc = "menu:" + (S.hub || "home");                  // en los menus (aunque la Aventura tenga una expedicion preparada)
    else if (S.run) {
      const r = S.run; o.md = r.board ? "reto" : "aventura"; o.a = r.act; o.r = r.act * 4 + r.round + 1; o.asc = r.asc; o.s = r.score; o.c = r.coins; o.h = r.lives; o.hm = r.maxLives;
      o.sc = S.phase === "shop" ? "campamento" : r.inf ? "infinito" : "partida";
      if (r.board && r.dailyTry) o.d = "intento " + r.dailyTry;
    } else if (S.camp) { o.md = "clasico"; o.sc = "partida"; o.r = S.level + 1; o.s = S.runTotal + (S.levelScore || 0); o.d = es(S.camp.name).slice(0, 12); }
    if (q && (S.phase === "asking" || S.phase === "reveal")) { o.q = es(q.clue ? q.answer : q.name); o.k = q.clue ? "clue" : q.kind || ""; }
    o.sk = S.streak || 0;
    return o;
  }

  let fast = false, last = "", sentAt = 0, timer = 0, dead = 0;
  const sched = ms => { clearTimeout(timer); timer = setTimeout(beat, ms); };
  async function beat() {
    if (!URL_ || !on()) return sched(30000);
    if (Date.now() < dead) return sched(dead - Date.now());
    const st = state(), js = JSON.stringify(st), body = { sid };
    if (!fast || js !== last || Date.now() - sentAt > 20000) { body.st = st; last = js; sentAt = Date.now(); }   // mientras te miran, el estado solo viaja si cambia
    try {
      const c = new AbortController(), k = setTimeout(() => c.abort(), 6000);
      const r = await fetch(URL_, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "text/plain" }, signal: c.signal }).finally(() => clearTimeout(k));
      if (r.status === 503 || r.status === 404) { dead = Date.now() + 300000; fast = false; return sched(30000); }   // la web sin la API: se vuelve a probar en 5 min
      const j = await r.json();
      if (j && j.ok) { fast = !!j.w; (j.m || []).forEach(m => m.k === "fx" ? fx(m.fx) : queue.push(m)); drain(); }   // las fichas caen al momento; las frases, en orden
    } catch (e) { fast = false; }
    sched(fast ? 2000 : document.hidden ? 60000 : 25000);
  }
  /* lo que llega se dice en orden: cada frase espera a que la anterior este escrita (A.dealer encola una sola) */
  const queue = []; let busyTill = 0, dt = 0;
  const MOOD = { laugh: "laugh", angry: "angry", furious: "angry", shock: "shock", dare: "boss" };
  function drain() {
    clearTimeout(dt); if (!queue.length) return;
    const wait = busyTill - Date.now(); if (wait > 0) { dt = setTimeout(drain, wait); return; }
    const m = queue.shift(), t = String(m.t || "").slice(0, 160); if (!t || !A.dealer || !A.dealer.live) return drain();
    A.dealer.live(t, { mood: MOOD[m.e] || "sly", face: m.e || undefined, gest: m.g || null });
    busyTill = Date.now() + [...t].length * 40 + 1600;
    if (queue.length) dt = setTimeout(drain, busyTill - Date.now());
  }
  /* las fichas de la mesa: los efectos de los retos (js/chfx.js) y el terremoto de los jackpots, con sus ajustes de siempre (temblor, destellos) */
  function fx(k) {
    if (k === "terremoto") { if (A.core && A.core.jpShake) A.core.jpShake(3); if (A.haptic) A.haptic([90, 40, 140, 40, 60]); if (A.sfx && A.sfx.thunder) A.sfx.thunder(); return; }
    if (A.chfx && A.chfx.live) A.chfx.live(k);
  }
  const bye = () => { if (!URL_) return; try { navigator.sendBeacon(URL_, JSON.stringify({ sid, bye: 1 })); } catch (e) { /* da igual: caduca en 75 s */ } };
  addEventListener("pagehide", bye);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !fast) sched(800); });   // vuelves a la ventana: latido enseguida

  /* Ajustes > Datos: el interruptor y lo que se envia */
  const TXT = {
    t: "Don Crupier en directo|The Dealer, live|Don Croupier en direct|Dom Crupiê ao vivo|Don Croupier live|Don Croupier in diretta|Don Crupier en vivo|荷官先生直播|딜러 나리 생방송|ドン・ディーラー生放送|Дон Крупье в эфире|Don Krupier na żywo",
    d: "A veces el autor del juego mira las partidas abiertas y habla por el crupier (verás «EN DIRECTO»). Solo se envían tu nombre, tu idioma y por dónde vas.|Now and then the game’s author watches open games and speaks through the Dealer (you’ll see “LIVE”). Only your name, language and progress are sent.|Parfois, l’auteur du jeu regarde les parties en cours et parle par la bouche du croupier (tu verras « EN DIRECT »). Seuls ton nom, ta langue et ta progression sont envoyés.|Às vezes o autor do jogo espia as partidas abertas e fala pelo crupiê (você verá “AO VIVO”). Só são enviados seu nome, seu idioma e onde você está.|Manchmal schaut der Entwickler bei laufenden Partien zu und spricht durch den Croupier (du siehst „LIVE“). Gesendet werden nur dein Name, deine Sprache und dein Spielstand.|A volte l’autore del gioco guarda le partite aperte e parla per bocca del croupier (vedrai «IN DIRETTA»). Si inviano solo il tuo nome, la tua lingua e a che punto sei.|A veces el autor del juego mira las partidas abiertas y habla por el crupier (verás «EN VIVO»). Solo se envían tu nombre, tu idioma y en qué parte vas.|游戏作者有时会观看正在进行的对局，并借荷官之口说话（你会看到“直播中”）。只发送你的名字、语言和游戏进度。|가끔 게임 제작자가 진행 중인 게임을 보며 딜러의 입을 빌려 말을 겁니다(“생방송” 표시). 이름, 언어, 진행 상황만 전송됩니다.|ときどきゲームの作者が遊んでいる様子を見て、ディーラーの口を借りて話しかけます（「生放送」と表示）。送られるのは名前、言語、進み具合だけです。|Иногда автор игры заглядывает в идущие партии и говорит устами крупье (вы увидите «В ЭФИРЕ»). Отправляются только ваше имя, язык и прогресс.|Czasem autor gry zagląda do trwających rozgrywek i mówi ustami krupiera (zobaczysz „NA ŻYWO”). Wysyłane są tylko twoje imię, język i postęp.",
  };
  function card() {
    const grid = document.querySelector('[data-pane="data"] .set-grid'); if (!grid || $("vivoCard")) return;
    const c = document.createElement("div"); c.className = "set-card"; c.id = "vivoCard";
    c.innerHTML = `<div class="row-sw"><div class="rs-t"><label></label><small></small></div><button class="sw" role="switch" aria-checked="true"><i></i></button></div>`;
    const cloud = $("cloudCard"); grid.insertBefore(c, cloud ? cloud.nextSibling : null);
    c.querySelector(".sw").addEventListener("click", () => {
      const v = !on(); try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) { /* sin almacenamiento */ }
      if (A.sfx && A.sfx.flip) A.sfx.flip(true); if (v) sched(300); else { clearTimeout(timer); fast = false; bye(); sched(30000); }
      sync();
    });
    sync();
  }
  function sync() {
    const c = $("vivoCard"); if (!c) return;
    c.querySelector("label").textContent = A.pick6(TXT.t); c.querySelector("small").textContent = A.pick6(TXT.d);
    const sw = c.querySelector(".sw"); sw.setAttribute("aria-checked", on()); sw.setAttribute("aria-label", A.pick6(TXT.t));
    c.classList.toggle("hidden", !URL_);
  }
  A.vivo = { sync, state, sid: () => sid };
  const boot = () => { card(); sched(4000); };                               // los textos se rehacen con Ajustes (js/game.js, syncSettings)
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", boot); else boot();
})(window.AIQ);
