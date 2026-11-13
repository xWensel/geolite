/* Geolite - DON CRUPIER EN DIRECTO. La partida avisa de que esta abierta (api/vivo.js) y el autor, desde su mesa (mesa/), puede
   mirarla y hablar por el crupier: la frase sale en su bocadillo con el piloto rojo de EN DIRECTO (A.dealer.live, js/dealer.js).
   Latido cada 25 s (60 s con la ventana oculta) con el estado de la partida; si el autor la esta mirando, cada 2 s. Sin conexion no pasa nada.
   Se envia solo: nombre, idioma, plataforma, version y por donde vas (pantalla, ronda, lugar, puntos). sid aleatorio en cada arranque.
   El jugador lo apaga en Ajustes > Datos ("atlasiq.vivo" = "0"). */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id);
  const KEY = "atlasiq.vivo", SITE = A.SITE;                                       // v0.3.235: la web publica vive en js/support.js
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
    if (A.chfx && A.chfx.liveState) { const L = A.chfx.liveState(); o.fx = [L.lluvia, L.tormenta, L.apagon, L.terremoto].map(b => (b ? 1 : 0)).join("") + L.cristal + L.huellas + L.ventana + (L.humo ? 1 : 0); }   // lo que la mesa tiene puesto (sus fichas): 4 interruptores, 3 contadores y el humo
    if (A.adv && A.adv.mesaState) o.ch = A.adv.mesaState();                        // los retos del juego que la mesa tiene puestos ("shaky:2,flip:1")
    if (ak) o.ak = ak; if (dk) o.dk = dk;
    try { const w = A.dealer && A.dealer.liveWait && A.dealer.liveWait(); if (w) o.lw = w; } catch (e) { /* nada */ }   // v0.4.70: lo que dice la mesa espera (tutorial, su nombre, la siesta...)                                           // v0.4.70: la ultima orden recibida y la ultima frase que ha empezado a decir (la mesa lo marca)
    if (shotOn) o.cam = 2;                                                          // con las fotos de respaldo en marcha
    return o;
  }

  let fast = false, open_ = false, last = "", sentAt = 0, timer = 0, dead = 0, fails = 0, ak = 0, dk = 0;
  /* lo que la mesa tenga puesto se va con ella: si deja de mirar, si el jugador apaga el directo o si se cae la conexion (ahora tapa toda la pantalla:
     nada puede quedarse pegado) */
  const fxOff = () => { if (A.chfx && A.chfx.liveOn && A.chfx.liveOn()) A.chfx.liveReset(); if (A.adv && A.adv.mesaOn && A.adv.mesaOn()) A.adv.mesaCh("*", 0); actOff(); shots(false); };
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
      if (j && j.ok) { const was = fast; fast = !!j.w; open_ = !!j.o; fails = 0; if (!fast && (pc || shotOn || asking)) camOff(); if (was && !fast) hushTill = Date.now() + 90000; if (!fast) fxOff();
        (j.m || []).forEach(m => { if (+m.q > ak) ak = +m.q; m.k === "fx" ? fx(m.fx, m.v) : m.k === "ch" ? chal(m.ch, m.v) : m.k === "act" ? act(m.a, m.v) : m.k === "gift" ? gift(m) : m.k === "cam" ? camOn() : m.k === "rtc" ? camAnswer(m.sdp) : m.k === "camoff" ? camOff() : m.k === "shot" ? shots(!!m.v) : m.k === "hand" ? glove(pc || shotOn ? m : null) : queue.push(m); }); drain();
        if (j.m && j.m.length && fast) { clearTimeout(timer); timer = setTimeout(beat, 400); return; } }   // v0.4.70: acaba de recibir algo: lo confirma enseguida   // las fichas y la camara, al momento; las frases, en orden (si la mesa deja de mirar, se cuelga)   // la mesa se ha ido: sus efectos, fuera
    } catch (e) { fast = false; if (++fails >= 2) fxOff(); }                  // dos latidos seguidos sin respuesta: sin conexion, fuera los efectos
    sched(fast ? 2000 : fails === 1 ? 5000 : open_ ? 4000 : document.hidden ? 60000 : 25000);   // v0.4.70: con la mesa abierta, cada 4 s (antes tardaba hasta 25 s en enterarse)
  }
  /* lo que llega se dice en orden: cada frase espera a que la anterior este escrita (A.dealer encola una sola) */
  const queue = []; let busyTill = 0, dt = 0, hushTill = 0;
  A.vivoQuiet = () => fast || Date.now() < hushTill;   // el autor esta en la mesa (y 90 s despues de su ultima frase): el crupier del juego se calla
  const MOOD = { laugh: "laugh", angry: "angry", furious: "angry", shock: "shock", dare: "boss" };
  /* v0.4.70: las marcas que se escriben en la mesa (el servidor quita < y >): !!grito!!, ~canto~, _susurro_ y *enfasis*, como las del juego (js/dealer.js) */
  const marks = t => t.replace(/!!([^!]+?)!!/g, "<g>$1</g>").replace(/~([^~]+?)~/g, "<c>$1</c>").replace(/(^|[\s¡¿(«"])_([^_]+?)_(?=$|[\s.,;:!?…)»"])/g, "$1<s>$2</s>").replace(/\*([^*]+?)\*/g, "<e>$1</e>");
  function drain() {
    clearTimeout(dt); if (!queue.length) return;
    const wait = busyTill - Date.now(); if (wait > 0) { dt = setTimeout(drain, wait); return; }
    const m = queue.shift(); let t = String(m.t || "").slice(0, 160); if (!t || !A.dealer || !A.dealer.live) return drain();
    if (m.li && A.dealer.nth) { const [k, i] = String(m.li).split("#"); try { const own = A.dealer.nth(k, +i); if (own && !/\{\w+\}/.test(own)) t = own; } catch (e) { /* su version no la tiene: la de la mesa */ } }   // v0.4.70: una frase del juego, la suya, en SU idioma
    else t = marks(t);
    const q = +m.q || 0;
    A.dealer.live(t, { mood: MOOD[m.e] || "sly", face: m.e || undefined, gest: m.g || null, sty: m.s || "", pos: m.p || "", started: () => { if (q > dk) { dk = q; if (fast) { clearTimeout(timer); timer = setTimeout(beat, 300); } } } });
    hushTill = Date.now() + 90000;
    busyTill = Date.now() + [...t].length * 40 + 1600;
    if (queue.length) dt = setTimeout(drain, busyTill - Date.now());
  }
  /* las fichas de la mesa: los efectos de los retos, el terremoto y el humo, por encima de todo el juego y en cualquier pantalla (js/chfx.js, el motor de
     la mesa), con los ajustes de siempre (temblor, destellos, movimiento) */
  function fx(k, v) { if (A.chfx && A.chfx.live) A.chfx.live(k, v); }
  /* los retos de la Aventura, a mano: A.adv.mesaCh (js/adventure.js) los monta en la pregunta en marcha y se quedan hasta quitarlos; "*" = todos */
  function chal(id, v) { if (A.adv && A.adv.mesaCh) A.adv.mesaCh(String(id || ""), +v || 0); }   // rayo, interruptores (v true/false) y contadores (v = cuantos deben quedar)
  /* EL REGALO DE LA CASA (api/mesa.js op "gift"): fichas de oro con un aviso en la pantalla, sea la que sea (la mesa manda). Cada orden lleva su id: si llega repetida, no se cobra dos veces */
  const GIFT = "El desarrollador te obsequia con {n} fichas de oro para que te puedas poner guapo.|The developer is gifting you {n} gold chips so you can look sharp.|Le développeur t'offre {n} jetons d'or pour que tu puisses te faire une beauté.|O desenvolvedor te presenteia com {n} fichas de ouro para você ficar elegante.|Der Entwickler schenkt dir {n} Goldchips, damit du dich schick machen kannst.|Lo sviluppatore ti regala {n} fiche d'oro per metterti in ghingheri.|El desarrollador te obsequia {n} fichas de oro para que te pongas elegante.|开发者送你 {n} 枚金筹码，好让你打扮得漂漂亮亮。|개발자가 멋지게 꾸미라고 골드 칩 {n}개를 선물해요.|開発者から、おめかし用に金のチップ{n}枚のプレゼント。|Разработчик дарит тебе золотые фишки: {n}. Самое время принарядиться.|Prezent od twórcy gry: złote żetony ({n}). Wystrój się!";
  const GIFT_T = "REGALO DE LA CASA|GIFT FROM THE HOUSE|CADEAU DE LA MAISON|PRESENTE DA CASA|GESCHENK DES HAUSES|REGALO DELLA CASA||本店赠礼|하우스의 선물|ハウスの贈り物|ПОДАРОК ЗАВЕДЕНИЯ|PREZENT OD KASYNA";
  const gifted = [];
  function gift(m) {
    const n = Math.round(+m.n), id = String(m.id || ""); if (!(n >= 1 && n <= 5000) || !A.club || !A.club.give) return;
    let seen = []; try { seen = JSON.parse(localStorage.getItem(KEY + ".gifts") || "[]"); } catch (e) { /* sin almacenamiento */ }
    if (id && (gifted.includes(id) || seen.includes(id))) return;
    gifted.push(id); try { localStorage.setItem(KEY + ".gifts", JSON.stringify(seen.concat(id).slice(-30))); } catch (e) { /* sin almacenamiento */ }
    A.club.give(n); if (A.sfx && A.sfx.coin) { A.sfx.coin(); setTimeout(() => A.sfx.coin(), 140); setTimeout(() => A.sfx.coin(), 280); }
    let el = $("vivoGift"); if (el) el.remove();
    el = document.createElement("div"); el.id = "vivoGift"; el.setAttribute("role", "status");
    el.innerHTML = `<img src="assets/icons/ficha_oro.webp" alt="" draggable="false"><span><b></b><i></i></span>`;
    el.querySelector("b").textContent = A.pick6(GIFT_T); el.querySelector("i").textContent = A.pick6(GIFT).replace("{n}", A.fmt ? A.fmt(n) : n);
    el.onclick = () => close(); document.body.appendChild(el); requestAnimationFrame(() => el.classList.add("on"));
    let t = setTimeout(close, 11000);
    function close() { clearTimeout(t); el.classList.remove("on"); setTimeout(() => el.remove(), 400); }
  }
  /* BLOQUE D: el crupier y Comodin a mano desde la mesa, al momento (api/mesa.js op "act"): gesto, cara, mirada, humor, Comodin, ropa en directo
     (sin comprar nada: A.vestuario.preview) y las trastadas. Cada funcion se comprueba antes de llamarla (una version vieja del juego no la tiene).
     Lo que la mesa deja puesto (ropa, mirada, humor) se va con ella, como las fichas: actOff */
  const mesaSet = { vest: false, gaze: false, humor: false, ptr: false, mesa: false, gato: false };
  function act(a, v) {
    const D = A.dealer;
    try {
      if (a === "gest") { if (D && D.gesture) D.gesture(String(v || ""), true); }   // la mesa del autor manda: puede incluso en plena pregunta
      else if (a === "face") { if (D && D.faceSet) D.faceSet(String(v || "")); }
      else if (a === "gaze") { if (D && D.gaze) { D.gaze(v === "duda" ? "duda" : v == null ? null : +v); mesaSet.gaze = v != null; } }
      else if (a === "humor") { if (D && D.humor) { D.humor(v || null); mesaSet.humor = !!v; } }
      else if (a === "cat") { if (!A.comodin || !A.comodin.act) return; if (!A.comodin.on() && D && D.catVisit && D.catVisit(40000)) setTimeout(() => A.comodin.act(String(v || "")), 2600); else A.comodin.act(String(v || "")); }   // bloque D: el gato ya no esta siempre: si no esta (en la portada), primero viene
      else if (a === "vest") { if (A.vestuario && A.vestuario.preview) { const o = v && typeof v === "object" ? v : null; A.vestuario.preview(o); mesaSet.vest = !!o; } }
      else if (a === "ptr") { if (A.punteros && A.punteros.mesa) { const o = v && typeof v === "object" ? v : null; A.punteros.mesa(o); mesaSet.ptr = !!o; } }   // v0.4.70: otro puntero, sin comprarlo
      else if (a === "mesa") { if (A.mesas && A.mesas.tryOn) { A.mesas.tryOn(v || null); mesaSet.mesa = !!v; } }                                 // v0.4.70: otra mesa del mapa
      else if (a === "gato") { const G = A.vestuario && A.vestuario.gato; if (G && A.comodin && A.comodin.dress) { if (v && typeof v === "object") { A.comodin.dress(G.look(Object.assign({ gpelo: null, gojos: null, gpaj: null, gpieza: null }, v))); mesaSet.gato = true; } else { G.apply(); mesaSet.gato = false; } } }   // v0.4.70: la ropa de Comodin
      else if (a === "huevo") huevo(String(v || ""));
      else if (a === "tras") { if (v === "creditos") { if (D && D.demoCredits) D.demoCredits(); } else if (A.trastadas && A.trastadas.run) A.trastadas.run(String(v || "")); }   // v0.3.235: "creditos" = los creditos de la Ascension V sin jubilar (solo desde la mesa; antes un boton temporal en Ajustes)
    } catch (e) { /* una accion que no sale no rompe el latido */ }
  }
  function actOff() {
    const D = A.dealer;
    try {
      if (mesaSet.vest && A.vestuario && A.vestuario.preview) A.vestuario.preview(null);
      if (mesaSet.gaze && D && D.gaze) D.gaze(null);
      if (mesaSet.humor && D && D.humor) D.humor(null);
      if (mesaSet.ptr && A.punteros && A.punteros.mesa) A.punteros.mesa(null);
      if (mesaSet.mesa && A.mesas && A.mesas.tryOn) A.mesas.tryOn(null);
      if (mesaSet.gato && A.vestuario && A.vestuario.gato) A.vestuario.gato.apply();
    } catch (e) { /* nada */ }
    mesaSet.vest = mesaSet.gaze = mesaSet.humor = mesaSet.ptr = mesaSet.mesa = mesaSet.gato = false;
  }
  /* v0.4.70: los huevos de la casa a mano: "Geolite se cae" (solo en la portada, js/huevos.js), las notas del tarareo y el baile de su cancion */
  function huevo(id) {
    const D = A.dealer;
    if (id === "cae") { if (A.huevos && A.huevos._cae) A.huevos._cae(); }
    else if (id === "hum") { if (D && D._hum) D._hum(); }
    else if (id === "baile" && D && D.gesture) ["snap", "twirl_moustache", "magic_pass", "fan_self", "hat_tip"].forEach((g, n) => setTimeout(() => D.gesture(g, true), n * 1150));
  }
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
    if (!URL_ || !on()) return; camOff(true);
    if (!(host && host.vivoCam) && !camTest()) return;
    if (!camOk) { const r = await ask(); if (r === "no") { post({ sid, rtc: { type: "deny" } }).catch(() => {}); return; } camOk = true; }
    try {
      if (!stream) stream = await source(); if (!stream) return;
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
  /* kept = el video se cae pero el permiso sigue (las fotos pueden seguir); sin kept (la mesa cuelga o el jugador corta) se acaba todo */
  function camOff(kept) {
    clearTimeout(camT); try { if (dcn) dcn.close(); } catch (e) { /* ya cerrado */ } try { if (pc) pc.close(); } catch (e) { /* ya cerrado */ }
    if (stream && !shotOn) stream.getTracks().forEach(t => t.stop()); pc = dcn = null; if (!shotOn) stream = null;
    if (!kept) { shots(false); askClose("no"); camOk = camAlways(); }
    if (!pc && !shotOn) { pilot(false); glove(null); }
  }
  /* EL PERMISO (v0.4.70): la primera vez en cada sesion el jugador decide (salvo «Cuando quiera», que se recuerda hasta que apaga el directo en Ajustes > Datos).
     Sin contestar en 30 s es que no. Mientras mira sale el piloto de siempre («TE ESTA MIRANDO»), sin botones: lo justo, voto del 10-nov */
  const CAMK = KEY + ".cam", camAlways = () => { try { return localStorage.getItem(CAMK) === "1"; } catch (e) { return false; } };
  let camOk = camAlways(), asking = null;
  const ASK = {
    t: "Don Crupier quiere ver tu partida|The Dealer wants to watch your game|Don Croupier veut regarder ta partie|Dom Crupiê quer ver sua partida|Don Croupier möchte deine Partie sehen|Don Croupier vuole guardare la tua partita||荷官先生想看看你的对局|딜러 나리가 지금 게임을 보고 싶어 해요|ドン・ディーラーがあなたのプレイを見たがっています|Дон Крупье хочет посмотреть твою партию|Don Krupier chce popatrzeć na twoją grę",
    d: "Solo verá la ventana del juego, nada más. Mientras mire saldrá arriba «TE ESTÁ MIRANDO». El directo se apaga en Ajustes > Datos.|He’ll only see the game window, nothing else. While he watches, “HE’S WATCHING YOU” stays at the top. You can turn live mode off in Settings > Data.|Il ne verra que la fenêtre du jeu, rien d'autre. Tant qu'il regarde, « IL TE REGARDE » reste affiché en haut. Le direct se coupe dans Réglages > Données.|Ele só vai ver a janela do jogo, mais nada. Enquanto ele olha, “ELE ESTÁ TE OLHANDO” fica no alto. O modo ao vivo se desliga em Configurações > Dados.|Er sieht nur das Spielfenster, sonst nichts. Solange er zuschaut, steht oben „ER SCHAUT ZU“. Den Live-Modus schaltest du unter Einstellungen > Daten aus.|Vedrà solo la finestra del gioco, nient'altro. Finché guarda, in alto resta «TI STA GUARDANDO». La diretta si spegne in Impostazioni > Dati.|Solo verá la ventana del juego, nada más. Mientras mire saldrá arriba «TE ESTÁ MIRANDO». La transmisión en vivo se apaga en Ajustes > Datos.|他只会看到游戏窗口，别的都看不到。他观看期间，顶部会一直显示“他在看着你”。可在设置 > 数据中关闭直播。|게임 창만 볼 수 있고 다른 건 못 봐요. 보는 동안 위쪽에 ‘지켜보고 있다’가 표시돼요. 생방송은 설정 > 데이터에서 끌 수 있어요.|見えるのはゲーム画面だけです。見ている間は上に「見られています」と表示されます。生放送は設定 > データでオフにできます。|Он увидит только окно игры, больше ничего. Пока он смотрит, вверху горит «ОН СМОТРИТ НА ТЕБЯ». Эфир выключается в разделе «Настройки > Данные».|Zobaczy tylko okno gry, nic więcej. Dopóki patrzy, na górze świeci „PATRZY NA CIEBIE”. Transmisję wyłączysz w Ustawieniach > Dane.",
    no: "Ahora no|Not now|Pas maintenant|Agora não|Jetzt nicht|Non ora||以后再说|지금은 안 돼요|今はダメ|Не сейчас|Nie teraz",
    si: "Déjale|Let him|D'accord|Deixa|Na gut|Va bene|Déjalo|让他看|보여 줄게요|いいよ|Пусть смотрит|Niech patrzy",
    al: "Cuando quiera|Anytime|Quand il veut|Sempre que quiser|Jederzeit|Quando vuole||随时都行|언제든 괜찮아요|いつでもどうぞ|Когда захочет|Kiedy zechce",
  };
  function ask() {
    askClose("no");
    return new Promise(res => {
      const el = document.createElement("div"); el.id = "vivoAsk"; el.setAttribute("role", "alertdialog"); el.setAttribute("aria-modal", "true");
      el.innerHTML = `<img src="${A.crupierArt ? A.crupierArt("dealer_mini", "assets/icons/dealer_mini.webp") : "assets/icons/dealer_mini.webp"}" data-cart="dealer_mini" data-cdef="assets/icons/dealer_mini.webp" alt="" draggable="false"><div class="va-t"><b></b><span></span><div class="va-b"><button type="button" data-r="no"></button><button type="button" data-r="si"></button><button type="button" data-r="al"></button></div></div>`;
      el.querySelector("b").textContent = A.pick6(ASK.t); el.querySelector("span").textContent = A.pick6(ASK.d);
      el.querySelectorAll("button").forEach(b => { b.textContent = A.pick6(ASK[b.dataset.r]); b.onclick = () => askClose(b.dataset.r); });
      const key = e => { if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); askClose("no"); } };
      addEventListener("keydown", key, true);
      document.body.appendChild(el); requestAnimationFrame(() => el.classList.add("on")); if (A.sfx && A.sfx.spot) A.sfx.spot();
      setTimeout(() => { const b = el.querySelector('[data-r="si"]'); if (b && b.focus) b.focus({ preventScroll: true }); }, 60);
      asking = { el, res, key, t: setTimeout(() => askClose("no"), 30000) };
    });
  }
  function askClose(r) {
    const a = asking; if (!a) return; asking = null; clearTimeout(a.t); removeEventListener("keydown", a.key, true);
    if (r === "al") { try { localStorage.setItem(CAMK, "1"); } catch (e) { /* sin almacenamiento */ } sync(); }
    if (A.sfx && A.sfx.toggle) A.sfx.toggle(r !== "no");
    a.el.classList.remove("on"); setTimeout(() => a.el.remove(), 400); a.res(r === "no" ? "no" : "si");
  }
  /* LAS FOTOS DE RESPALDO (v0.4.70): si el video de punto a punto no conecta (redes cerradas, sin TURN), la mesa las pide y el juego manda una foto
     pequena de SU ventana cada 1,5 s por el servidor de siempre (api/vivo.js, 10 s de vida). Solo con permiso; la mesa las renueva cada 15 s */
  let shotOn = false, shotT = 0, shotUntil = 0, shotV = null, shotBusy = false;
  async function shots(v) {
    if (!v) { if (!shotOn) return; shotOn = false; clearTimeout(shotT); if (shotV) { shotV.srcObject = null; shotV = null; } if (!pc && stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } if (!pc) { pilot(false); glove(null); } return; }
    shotUntil = Date.now() + 25000; if (shotOn || !camOk || !URL_ || !on()) return;
    if (host && host.vivoShot) { shotOn = true; pilot(true); shotTick(); return; }   // el escritorio hace la foto de su ventana (no hace falta el video)
    try {
      if (!stream) stream = await source(); if (!stream) return;
      shotV = document.createElement("video"); shotV.muted = true; shotV.playsInline = true; shotV.srcObject = stream; await shotV.play().catch(() => {});
      shotOn = true; pilot(true); shotTick();
    } catch (e) { shots(false); }
  }
  const shotCv = document.createElement("canvas");
  async function shotTick() {
    clearTimeout(shotT); if (!shotOn) return;
    if (Date.now() > shotUntil || !fast) return shots(false);   // la mesa ya no las pide (o ha dejado de mirar)
    if (!shotBusy && host && host.vivoShot) {
      shotBusy = true;
      try { const b = await host.vivoShot(); if (b && b.length < 399000) await post({ sid, shot: "data:image/jpeg;base64," + b }); } catch (e) { /* la siguiente */ }
      shotBusy = false;
    } else if (!shotBusy && shotV && shotV.videoWidth) {
      shotBusy = true;
      try {
        const w = Math.min(960, shotV.videoWidth), h = Math.round(w * shotV.videoHeight / shotV.videoWidth); shotCv.width = w; shotCv.height = h;
        const g = shotCv.getContext("2d"); g.drawImage(shotV, 0, 0, w, h);
        let img = shotCv.toDataURL("image/jpeg", 0.62); if (img.length > 380000) img = shotCv.toDataURL("image/jpeg", 0.4);
        if (img.length <= 400000) await post({ sid, shot: img });
      } catch (e) { /* la siguiente */ }
      shotBusy = false;
    }
    shotT = setTimeout(shotTick, 1500);
  }
  /* el piloto: el crupier mini, la luz roja y el aviso, en lo alto de la pantalla mientras te miran */
  const EYE = "TE ESTÁ MIRANDO|HE’S WATCHING YOU|IL TE REGARDE|ELE ESTÁ TE OLHANDO|ER SCHAUT ZU|TI STA GUARDANDO|TE ESTÁ MIRANDO|他在看着你|지켜보고 있다|見られています|ОН СМОТРИТ НА ТЕБЯ|PATRZY NA CIEBIE";
  function pilot(on_) {
    let el = $("vivoEye");
    if (!on_) { if (el) { el.classList.remove("on"); setTimeout(() => { if (!pc && !shotOn && el.isConnected) el.remove(); }, 400); } return; }
    if (!el) { el = document.createElement("div"); el.id = "vivoEye"; el.innerHTML = `<img src="${A.crupierArt ? A.crupierArt("dealer_mini", "assets/icons/dealer_mini.webp") : "assets/icons/dealer_mini.webp"}" data-cart="dealer_mini" data-cdef="assets/icons/dealer_mini.webp" alt=""><i></i><b></b>`; document.body.appendChild(el); }
    el.querySelector("b").textContent = A.pick6(EYE); requestAnimationFrame(() => el.classList.add("on"));
    if (A.sfx && A.sfx.spot) A.sfx.spot();
  }
  /* la mano del crupier (Pixel Lab, 64x64: el indice arriba, gemelos y menique estirado; vivo_hand_tap/back/bounce: aprieta, vuelve y rebota):
     se mueve por tu pantalla y da toquecitos con la punta del indice (columna 25,5, fila 4 del sprite) */
  let gEl = null, gHide = 0;
  function glove(m) {
    if (!m) { if (gEl) gEl.classList.remove("on"); return; }
    if (!gEl) { gEl = document.createElement("div"); gEl.id = "vivoGlove"; gEl.innerHTML = `<img src="assets/icons/vivo_hand.webp" alt=""><i class="vg-ring"></i>`; ["tap", "back", "bounce"].forEach(n => { new Image().src = `assets/icons/vivo_hand_${n}.webp`; }); document.body.appendChild(gEl); }
    const dpr = devicePixelRatio || 1, k = Math.max(2, Math.round(2.6 * dpr)) / dpr;        // escala entera de pixel de pantalla
    gEl.style.setProperty("--gw", (64 * k) + "px"); gEl.style.setProperty("--gh", (64 * k) + "px"); gEl.style.setProperty("--gx", (25.5 * k) + "px"); gEl.style.setProperty("--gy", (4 * k) + "px");
    const x = Math.max(0, Math.min(1, +m.x || 0)) * innerWidth, y = Math.max(0, Math.min(1, +m.y || 0)) * innerHeight;
    gEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`; gEl.classList.add("on");
    if (m.t === "tap") { gEl.classList.remove("tap"); void gEl.offsetWidth; gEl.classList.add("tap"); const im = gEl.firstChild; [[60, "_tap"], [120, "_back"], [170, ""], [230, "_tap"], [290, "_back"], [340, "_bounce"], [400, ""]].forEach(([t, f]) => setTimeout(() => { im.src = `assets/icons/vivo_hand${f}.webp`; }, t)); if (A.sfx && A.sfx.knock) { A.sfx.knock(); setTimeout(() => A.sfx.knock(), 170); } }   // dos toquecitos: aprieta, vuelve (y el ultimo rebota)
    clearTimeout(gHide); gHide = setTimeout(() => glove(null), m.t === "tap" ? 3500 : 5000);
  }
  /* CONTROLES INVERTIDOS FUERA DE LA PREGUNTA (reto "cmirror" puesto desde la mesa, js/adventure.js): en la pregunta ya lo hace el puntero del mapa
     (js/pointer.js); en menus, Campamento, casino o la revelacion no hay mapa que invierta nada, asi que aqui el raton real se esconde, se dibuja
     uno espejado y los clics van a donde esta el falso (pointer*, mouse*, click, contextmenu). Nivel 1: izquierda-derecha; 2: arriba-abajo; 3: los dos.
     El hover de CSS no puede seguir al falso (no es el raton de verdad); los controles de arrastrar (deslizadores) no funcionan mientras dura. */
  const INV = { lv: 0, x: innerWidth / 2, y: innerHeight / 2, el: null, shown: false, poll: 0 };
  const invRound = () => !!(A.chal && A.chal.state && A.chal.state.on && A.core && A.core.S && A.core.S.phase === "asking");   // preguntando: manda el puntero del mapa
  const invOn = () => INV.lv > 0 && !invRound();
  const invPos = (x, y) => [INV.lv !== 2 ? innerWidth - x : x, INV.lv >= 2 ? innerHeight - y : y];
  function invCursor() {
    if (INV.el) return INV.el;
    const rows = ["X...........", "XX..........", "XOX.........", "XOOX........", "XOOOX.......", "XOOOOX......", "XOOOOOX.....", "XOOOOOOX....", "XOOOOOOOX...", "XOOOOXXXXX..", "XOXXOX......", "XX.XOOX.....", "X..XOOX.....", "....XOOX....", "....XOOX....", ".....XX....."];
    const c = document.createElement("canvas"); c.width = 12; c.height = 16; const g = c.getContext("2d");
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ".") { g.fillStyle = ch === "X" ? "#0b1410" : "#fff8e6"; g.fillRect(x, y, 1, 1); } }));
    const el = INV.el = document.createElement("div"); el.id = "vivoCur"; el.setAttribute("aria-hidden", "true");
    el.style.backgroundImage = `url(${c.toDataURL()})`; document.body.appendChild(el);
    return el;
  }
  function invSync() {                                                // muestra o esconde el raton falso segun si toca (no en la pregunta)
    const on = invOn(), el = invCursor();
    if (on !== INV.shown) { INV.shown = on; document.documentElement.classList.toggle("vivo-inv", on); el.classList.toggle("on", on); }
    if (on) { const [x, y] = invPos(INV.x, INV.y); el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`; }
  }
  const invFire = (type, e, x, y, el) => {
    const P = /^pointer/.test(type), o = { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, screenX: e.screenX, screenY: e.screenY, button: e.button, buttons: e.buttons, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey, detail: e.detail };
    if (P) { o.pointerId = e.pointerId; o.pointerType = e.pointerType; o.isPrimary = true; }
    el.dispatchEvent(new (P ? PointerEvent : MouseEvent)(type, o));
  };
  ["pointermove", "mousemove", "pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "contextmenu", "auxclick"].forEach(type => addEventListener(type, e => {
    if (!e.isTrusted || !INV.lv) return;
    if (/move$/.test(type) && /^pointer/.test(type)) { INV.x = e.clientX; INV.y = e.clientY; invSync(); }
    if (!invOn()) return;
    e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault();
    const [x, y] = invPos(INV.x = e.clientX, INV.y = e.clientY), el = document.elementFromPoint(x, y); if (!el) return;
    invFire(type, e, x, y, el);
    if (type === "mousedown") { const f = el.closest("input,textarea,select,button,a[href],[tabindex]"); if (f && f.focus) f.focus({ preventScroll: true }); }
  }, true));
  function invert(lv) {
    INV.lv = lv > 0 ? Math.min(3, lv | 0) : 0; clearInterval(INV.poll);
    if (INV.lv) INV.poll = setInterval(invSync, 400); else { INV.shown = true; }
    invSync();
  }
  function hand(data) { let m; try { m = JSON.parse(data); } catch (e) { return; } if (!m || !pc) return; if (m.t === "hide") glove(null); else if (m.t === "tap" || m.t === "move") glove(m); }

  const bye = () => { if (!URL_) return; try { navigator.sendBeacon(URL_, JSON.stringify({ sid, bye: 1 })); } catch (e) { /* da igual: caduca en 75 s */ } };
  addEventListener("pagehide", () => { camOff(); bye(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !fast) sched(800); });   // vuelves a la ventana: latido enseguida

  /* Ajustes > Datos: el interruptor y lo que se envia */
  const TXT = {
    t: "Don Crupier en directo|The Dealer, live|Don Croupier en direct|Dom Crupiê ao vivo|Don Croupier live|Don Croupier in diretta|Don Crupier en vivo|荷官先生直播|딜러 나리 생방송|ドン・ディーラー生放送|Дон Крупье в эфире|Don Krupier na żywo",
    d: "A veces el autor del juego mira las partidas abiertas: habla por el crupier (verás «EN DIRECTO»), lanza efectos y, si le dejas, puede ver la ventana del juego mientras sale «TE ESTÁ MIRANDO». Solo se envían tu nombre, tu idioma y por dónde vas.|Now and then the game’s author watches open games: he speaks through the dealer (you’ll see “LIVE”), triggers effects and, if you let him, can see the game window while “HE’S WATCHING YOU” is shown. Only your name, language and progress are sent.|Parfois, l'auteur du jeu regarde les parties en cours : il parle par la bouche du croupier (tu verras « EN DIRECT »), lance des effets et, si tu le laisses, peut voir la fenêtre du jeu tant que « IL TE REGARDE » est affiché. Seuls ton nom, ta langue et ta progression sont envoyés.|Às vezes o autor do jogo espia as partidas abertas: fala pelo crupiê (você verá “AO VIVO”), lança efeitos e, se você deixar, pode ver a janela do jogo enquanto aparece “ELE ESTÁ TE OLHANDO”. Só são enviados seu nome, seu idioma e em que ponto do jogo você está.|Manchmal schaut der Entwickler bei laufenden Partien zu: Er spricht durch den Croupier (du siehst „LIVE“), löst Effekte aus und kann, wenn du es erlaubst, das Spielfenster sehen, solange „ER SCHAUT ZU“ angezeigt wird. Gesendet werden nur dein Name, deine Sprache und dein Fortschritt.|A volte l'autore del gioco guarda le partite aperte: parla per bocca del croupier (vedrai «IN DIRETTA»), lancia effetti e, se glielo permetti, può vedere la finestra del gioco finché compare «TI STA GUARDANDO». Si inviano solo il tuo nome, la tua lingua e a che punto sei.|A veces el autor del juego mira las partidas abiertas: habla por el crupier (verás «EN VIVO»), lanza efectos y, si lo dejas, puede ver la ventana del juego mientras sale «TE ESTÁ MIRANDO». Solo se envían tu nombre, tu idioma y en qué parte vas.|游戏作者有时会观看正在进行的对局：借荷官之口说话（你会看到“直播中”）、释放效果，并在你允许时、显示“他在看着你”期间看到游戏窗口。只发送你的名字、语言和游戏进度。|가끔 게임 제작자가 진행 중인 게임을 봐요. 딜러의 입을 빌려 말하고 (‘생방송’ 표시) 효과를 던지며, 허락하면 ‘지켜보고 있다’가 표시되는 동안 게임 창을 볼 수 있어요. 이름, 언어, 진행 상황만 전송돼요.|ときどきゲームの作者が遊んでいる様子を見ています。ディーラーの口を借りて話し（「生放送」と表示）、エフェクトを出し、許可すれば「見られています」と表示されている間はゲーム画面を見ることができます。送られるのは名前、言語、進み具合だけです。|Иногда автор игры заглядывает в идущие партии: говорит устами крупье (увидишь «В ЭФИРЕ»), запускает эффекты и, если разрешишь, может видеть окно игры, пока горит «ОН СМОТРИТ НА ТЕБЯ». Отправляются только твоё имя, язык и прогресс.|Czasem autor gry zagląda do trwających gier: mówi ustami krupiera (zobaczysz „NA ŻYWO”), rzuca efekty i, jeśli pozwolisz, widzi okno gry, dopóki świeci „PATRZY NA CIEBIE”. Wysyłane są tylko twoje imię, język i postęp.",
  };
  function card() {
    const grid = document.querySelector('[data-pane="data"] .set-grid'); if (!grid || $("vivoCard")) return;
    const c = document.createElement("div"); c.className = "set-card"; c.id = "vivoCard";
    c.innerHTML = `<div class="row-sw"><div class="rs-t"><label></label><small></small></div><button class="sw" role="switch" aria-checked="true"><i></i></button></div>`;
    const cloud = $("cloudCard"); grid.insertBefore(c, cloud ? cloud.nextSibling : null);
    c.querySelector(".sw").addEventListener("click", () => {
      const v = !on(); try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) { /* sin almacenamiento */ }
      if (A.sfx && A.sfx.toggle) A.sfx.toggle(true); if (v) sched(300); else { clearTimeout(timer); fast = false; try { localStorage.removeItem(CAMK); } catch (e) { /* sin almacenamiento */ } camOff(); camOk = false; fxOff(); bye(); sched(30000); }   // apagar el directo olvida tambien «Cuando quiera»
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
  A.vivo = { sync, state, invert, sid: () => sid, _ask: ask, _shots: shots };
  const boot = () => { card(); sched(4000); };                               // los textos se rehacen con Ajustes (js/game.js, syncSettings)
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", boot); else boot();
})(window.AIQ);
