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
  const camTest = () => { try { return !host && !!localStorage.getItem(KEY + ".camtest"); } catch (e) { return false; } };   // pruebas de la camara en el navegador (el mapa hace de pantalla)
  const es = v => (v && typeof v === "object" ? v.es || v.en || "" : v || "");

  /* por donde va: lo justo para que la mesa lo cuente ("Aventura · ronda 7 · buscando Ulan Bator") */
  function state() {
    const C = A.core, S = C && C.S, P = A.profile && A.profile.get(), o = { n: (P && P.name) || "", l: A.lang, p: plat(), v: A.VERSION, t0, cam: (host && host.vivoCam) || camTest() ? 1 : 0 };   // cam: se le puede ver la pantalla (escritorio)
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
    if (A.chfx && A.chfx.liveState) { const L = A.chfx.liveState(); o.fx = [L.lluvia, L.tormenta, L.apagon, L.terremoto].map(b => (b ? 1 : 0)).join("") + L.cristal + L.huellas + L.ventana; }   // lo que la mesa tiene puesto (sus fichas)
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
      if (j && j.ok) { const was = fast; fast = !!j.w; if (!fast && pc) camOff(); if (was && !fast && A.chfx && A.chfx.liveReset) A.chfx.liveReset(); (j.m || []).forEach(m => m.k === "fx" ? fx(m.fx, m.v) : m.k === "cam" ? camOn() : m.k === "rtc" ? camAnswer(m.sdp) : m.k === "camoff" ? camOff() : queue.push(m)); drain(); }   // las fichas y la camara, al momento; las frases, en orden (si la mesa deja de mirar, se cuelga)   // la mesa se ha ido: sus efectos, fuera
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
    A.dealer.live(t, { mood: MOOD[m.e] || "sly", face: m.e || undefined, gest: m.g || null, sty: m.s || "" });
    busyTill = Date.now() + [...t].length * 40 + 1600;
    if (queue.length) dt = setTimeout(drain, busyTill - Date.now());
  }
  /* las fichas de la mesa: los efectos de los retos (js/chfx.js) y el terremoto de los jackpots, con sus ajustes de siempre (temblor, destellos) */
  function fx(k, v) { if (A.chfx && A.chfx.live) A.chfx.live(k, v); }   // rayo, interruptores (v true/false) y contadores (v = cuantos deben quedar)
  /* LA CAMARA DEL CRUPIER (solo escritorio): la mesa pide ver la partida y el juego le manda el video de SU ventana (captura de pestana de
     Electron: nada del escritorio ni de otras ventanas) de punto a punto (WebRTC; api/vivo.js y api/mesa.js solo cruzan la oferta y la respuesta).
     Mientras dura, arriba sale el piloto "TE ESTA MIRANDO" con el crupier. Por el mismo canal llega el guante: la mesa senala y da toquecitos en tu pantalla */
  const ICE = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  let pc = null, stream = null, dcn = null, camT = 0;
  const post = async body => { const c = new AbortController(), k = setTimeout(() => c.abort(), 8000); try { return await fetch(URL_, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "text/plain" }, signal: c.signal }); } finally { clearTimeout(k); } };
  const iceDone = (p, ms) => new Promise(res => { if (p.iceGatheringState === "complete") return res(); const t = setTimeout(res, ms); p.addEventListener("icegatheringstatechange", () => { if (p.iceGatheringState === "complete") { clearTimeout(t); res(); } }); });
  async function source() {
    if (host && host.vivoCam) { const id = await host.vivoCam(); if (!id) return null; return navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: id, maxWidth: 1600, maxHeight: 1000, maxFrameRate: 15 } } }); }
    if (camTest()) { const m = document.getElementById("map"); return m && m.captureStream ? m.captureStream(15) : null; }   // pruebas en el navegador: el mapa
    return null;
  }
  async function camOn() {
    if (!URL_ || !on()) return; camOff();
    try {
      stream = await source(); if (!stream) return;
      const p = pc = new RTCPeerConnection({ iceServers: ICE });
      stream.getTracks().forEach(t => p.addTrack(t, stream));
      dcn = p.createDataChannel("mesa"); dcn.onmessage = e => hand(e.data);
      p.onconnectionstatechange = () => {
        if (pc !== p) return; const st = p.connectionState;
        if (st === "connected") { clearTimeout(camT); pilot(true); }
        else if (st === "failed" || st === "closed") camOff();
        else if (st === "disconnected") { clearTimeout(camT); camT = setTimeout(() => { if (pc === p && p.connectionState !== "connected") camOff(); }, 6000); }
      };
      await p.setLocalDescription(await p.createOffer()); await iceDone(p, 3000);
      if (pc !== p) return;
      await post({ sid, rtc: { type: "offer", sdp: p.localDescription.sdp } });
      camT = setTimeout(() => { if (pc === p && p.connectionState !== "connected") camOff(); }, 45000);
    } catch (e) { camOff(); }
  }
  async function camAnswer(sdp) { if (!pc || typeof sdp !== "string") return; try { await pc.setRemoteDescription({ type: "answer", sdp }); } catch (e) { camOff(); } }
  function camOff() {
    clearTimeout(camT); try { if (dcn) dcn.close(); } catch (e) { /* ya cerrado */ } try { if (pc) pc.close(); } catch (e) { /* ya cerrado */ }
    if (stream) stream.getTracks().forEach(t => t.stop()); pc = dcn = stream = null; pilot(false); glove(null);
  }
  /* el piloto: el crupier mini, la luz roja y el aviso, en lo alto de la pantalla mientras te miran */
  const EYE = "TE ESTÁ MIRANDO|HE’S WATCHING YOU|IL TE REGARDE|ELE ESTÁ TE OLHANDO|ER SIEHT DICH|TI STA GUARDANDO|TE ESTÁ MIRANDO|他在看着你|지켜보고 있다|見ているぞ|ОН СМОТРИТ НА ТЕБЯ|PATRZY NA CIEBIE";
  function pilot(on_) {
    let el = $("vivoEye");
    if (!on_) { if (el) { el.classList.remove("on"); setTimeout(() => { if (!pc && el.isConnected) el.remove(); }, 400); } return; }
    if (!el) { el = document.createElement("div"); el.id = "vivoEye"; el.innerHTML = `<img src="assets/icons/dealer_mini.webp" alt=""><i></i><b></b>`; document.body.appendChild(el); }
    el.querySelector("b").textContent = A.pick6(EYE); requestAnimationFrame(() => el.classList.add("on"));
    if (A.sfx && A.sfx.spot) A.sfx.spot();
  }
  /* la mano del crupier (su derecha de dorso, sus pixeles: assets/icons/vivo_hand.webp, 25x37, y vivo_hand_tap.webp con la yema aplastada):
     se mueve por tu pantalla y da toquecitos en el cristal con la punta del indice (columna 8,5 del sprite) */
  let gEl = null, gHide = 0;
  function glove(m) {
    if (!m) { if (gEl) gEl.classList.remove("on"); return; }
    if (!gEl) { gEl = document.createElement("div"); gEl.id = "vivoGlove"; gEl.innerHTML = `<img src="assets/icons/vivo_hand.webp" alt=""><i class="vg-ring"></i>`; new Image().src = "assets/icons/vivo_hand_tap.webp"; document.body.appendChild(gEl); }
    const dpr = devicePixelRatio || 1, k = Math.max(2, Math.round(4 * dpr)) / dpr;          // escala entera de pixel de pantalla
    gEl.style.setProperty("--gw", (25 * k) + "px"); gEl.style.setProperty("--gh", (37 * k) + "px"); gEl.style.setProperty("--gx", (8.5 * k) + "px");
    const x = Math.max(0, Math.min(1, +m.x || 0)) * innerWidth, y = Math.max(0, Math.min(1, +m.y || 0)) * innerHeight;
    gEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`; gEl.classList.add("on");
    if (m.t === "tap") { gEl.classList.remove("tap"); void gEl.offsetWidth; gEl.classList.add("tap"); const im = gEl.firstChild; [[66, 1], [167, 0], [242, 1], [343, 0]].forEach(([t, on]) => setTimeout(() => { im.src = `assets/icons/vivo_hand${on ? "_tap" : ""}.webp`; }, t)); if (A.sfx && A.sfx.knock) { A.sfx.knock(); setTimeout(() => A.sfx.knock(), 170); } }
    clearTimeout(gHide); gHide = setTimeout(() => glove(null), m.t === "tap" ? 3500 : 5000);
  }
  function hand(data) { let m; try { m = JSON.parse(data); } catch (e) { return; } if (!m || !pc) return; if (m.t === "hide") glove(null); else if (m.t === "tap" || m.t === "move") glove(m); }

  const bye = () => { if (!URL_) return; try { navigator.sendBeacon(URL_, JSON.stringify({ sid, bye: 1 })); } catch (e) { /* da igual: caduca en 75 s */ } };
  addEventListener("pagehide", () => { camOff(); bye(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !fast) sched(800); });   // vuelves a la ventana: latido enseguida

  /* Ajustes > Datos: el interruptor y lo que se envia */
  const TXT = {
    t: "Don Crupier en directo|The Dealer, live|Don Croupier en direct|Dom Crupiê ao vivo|Don Croupier live|Don Croupier in diretta|Don Crupier en vivo|荷官先生直播|딜러 나리 생방송|ドン・ディーラー生放送|Дон Крупье в эфире|Don Krupier na żywo",
    d: "A veces el autor del juego mira las partidas abiertas: habla por el crupier (verás «EN DIRECTO»), lanza efectos y puede ver la ventana del juego mientras sale «TE ESTÁ MIRANDO». Solo se envían tu nombre, tu idioma y por dónde vas.|Now and then the game’s author watches open games: speaks through the Dealer (you’ll see “LIVE”), throws effects and can see the game window while “HE’S WATCHING YOU” is shown. Only your name, language and progress are sent.|Parfois, l’auteur du jeu regarde les parties en cours : il parle par la bouche du croupier (tu verras « EN DIRECT »), lance des effets et peut voir la fenêtre du jeu tant que « IL TE REGARDE » est affiché. Seuls ton nom, ta langue et ta progression sont envoyés.|Às vezes o autor do jogo espia as partidas abertas: fala pelo crupiê (você verá “AO VIVO”), lança efeitos e pode ver a janela do jogo enquanto aparece “ELE ESTÁ TE OLHANDO”. Só são enviados seu nome, seu idioma e onde você está.|Manchmal schaut der Entwickler bei laufenden Partien zu: Er spricht durch den Croupier (du siehst „LIVE“), wirft Effekte und kann das Spielfenster sehen, solange „ER SIEHT DICH“ angezeigt wird. Gesendet werden nur dein Name, deine Sprache und dein Spielstand.|A volte l’autore del gioco guarda le partite aperte: parla per bocca del croupier (vedrai «IN DIRETTA»), lancia effetti e può vedere la finestra del gioco finché compare «TI STA GUARDANDO». Si inviano solo il tuo nome, la tua lingua e a che punto sei.|A veces el autor del juego mira las partidas abiertas: habla por el crupier (verás «EN VIVO»), lanza efectos y puede ver la ventana del juego mientras sale «TE ESTÁ MIRANDO». Solo se envían tu nombre, tu idioma y en qué parte vas.|游戏作者有时会观看正在进行的对局：借荷官之口说话（你会看到“直播中”）、释放效果，并在显示“他在看着你”时看到游戏窗口。只发送你的名字、语言和游戏进度。|가끔 게임 제작자가 진행 중인 게임을 봅니다. 딜러의 입을 빌려 말하고(“생방송” 표시) 효과를 던지며, “지켜보고 있다”가 표시되는 동안 게임 창을 볼 수 있습니다. 이름, 언어, 진행 상황만 전송됩니다.|ときどきゲームの作者が遊んでいる様子を見ています。ディーラーの口を借りて話し（「生放送」と表示）、演出を投げ、「見ているぞ」と表示されている間はゲーム画面を見ることができます。送られるのは名前、言語、進み具合だけです。|Иногда автор игры заглядывает в идущие партии: говорит устами крупье (вы увидите «В ЭФИРЕ»), бросает эффекты и может видеть окно игры, пока горит «ОН СМОТРИТ НА ТЕБЯ». Отправляются только ваше имя, язык и прогресс.|Czasem autor gry zagląda do trwających rozgrywek: mówi ustami krupiera (zobaczysz „NA ŻYWO”), rzuca efekty i widzi okno gry, dopóki świeci „PATRZY NA CIEBIE”. Wysyłane są tylko twoje imię, język i postęp.",
  };
  function card() {
    const grid = document.querySelector('[data-pane="data"] .set-grid'); if (!grid || $("vivoCard")) return;
    const c = document.createElement("div"); c.className = "set-card"; c.id = "vivoCard";
    c.innerHTML = `<div class="row-sw"><div class="rs-t"><label></label><small></small></div><button class="sw" role="switch" aria-checked="true"><i></i></button></div>`;
    const cloud = $("cloudCard"); grid.insertBefore(c, cloud ? cloud.nextSibling : null);
    c.querySelector(".sw").addEventListener("click", () => {
      const v = !on(); try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) { /* sin almacenamiento */ }
      if (A.sfx && A.sfx.flip) A.sfx.flip(true); if (v) sched(300); else { clearTimeout(timer); fast = false; camOff(); bye(); sched(30000); }
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
