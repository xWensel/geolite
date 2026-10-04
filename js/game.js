/* Geolite v0.6 - logica del juego, campañas y pantallas. */
(function (A) {
  const $ = id => document.getElementById(id);
  const KEY = "atlasiq.v2";

  /* ------------------------------------------------------------ estado y persistencia */
  const S = {
    mode: "classic", campId: null, camp: null, level: 0, qs: [], qi: 0, levelScore: 0, runTotal: 0, runMax: 0, completed: 0, streak: 0,
    phase: "title", limit: 10, t0: 0, pausedAcc: 0, pauseAt: 0, paused: false, lastTick: -1, tense: false, startLevel: 0, prog: {},
    quality: "auto", settingsOpen: false, lastTimeStr: "", intro: true, reduce: false, booting: true, skin: "casino",
    hub: "home", ranked: null, run: null, tool: null, hits: 0,
    cursor: true, tips: true, songToast: true, setTab: "general",
    panSens: 100, zoomSens: 100, units: "km", contrast: false, colorblind: "off", qSize: "n", shake: true, softFlash: false, flashSeen: false, uiScale: 100,
  };
  const prog = id => (S.prog[id] = S.prog[id] || { unlocked: 1, best: 0, bestIq: 0 });
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || "{}");
      A.lang = d.lang && A.STR[d.lang] ? d.lang : A.detectLang();
      S.intro = d.intro !== false; S.reduce = !!d.reduce; S.cursor = d.cursor !== false; S.tips = d.tips !== false; S.tour = d.tour !== false; S.songToast = d.songToast !== false; S.setTab = d.setTab || "general"; S.skin = "casino";
      A.audio.sfxOn = d.sfx !== false; A.audio.musicOn = d.music !== false;
      if (d.vol) Object.assign(A.audio.vol, d.vol);
      S.prog = d.prog || {}; S.mode = d.mode || "classic"; S.campId = d.campId || null; S.quality = d.quality || "auto";
      S.panSens = d.panSens || 100; S.zoomSens = d.zoomSens || 100; S.units = d.units === "mi" ? "mi" : "km";
      S.contrast = !!d.contrast; S.colorblind = ["protan", "deutan", "tritan"].includes(d.colorblind) ? d.colorblind : "off"; S.qSize = ["l", "xl"].includes(d.qSize) ? d.qSize : "n";
      S.shake = d.shake !== false; A.haptic.on = S.shake;
      S.softFlash = !!d.softFlash; S.flashSeen = !!d.flashSeen;
      S.uiScale = Number.isInteger(d.uiScale) && d.uiScale >= 50 && d.uiScale <= 300 ? d.uiScale : 100;
    } catch (e) { A.lang = A.detectLang(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ lang: A.lang, sfx: A.audio.sfxOn, music: A.audio.musicOn, vol: A.audio.vol, prog: S.prog, mode: S.mode, campId: S.campId, quality: S.quality, intro: S.intro, reduce: S.reduce, skin: S.skin, cursor: S.cursor, tips: S.tips, tour: S.tour, songToast: S.songToast, setTab: S.setTab, panSens: S.panSens, zoomSens: S.zoomSens, units: S.units, contrast: S.contrast, colorblind: S.colorblind, qSize: S.qSize, uiScale: S.uiScale, shake: S.shake, softFlash: S.softFlash, flashSeen: S.flashSeen })); } catch (e) { /* sin almacenamiento */ }
  }

  const lv = () => S.camp.levels[S.level];
  const q = () => S.qs[S.qi];
  const pad2 = n => String(n).padStart(2, "0");
  /* distancia mostrada al jugador: respeta S.units. Publica en A porque hub.js y adventure.js tambien muestran distancias. */
  A.fmtDist = km => {
    const mi = S.units === "mi", v = mi ? km / 1.609344 : km;
    return (v < 10 ? A.fmt1(v) : A.fmt(v)) + " " + (mi ? "mi" : "km");
  };
  const fmtKm = A.fmtDist;

  /* ------------------------------------------------------------ arranque */
  load(); A.wiki.loadShort(A.wlang());                                    // es-419 usa las notas de es (no hay es-419-s.json)
  const world = A.geo.buildWorld();
  { const col = $("leftCol"), pl = document.querySelector(".plate-sh"); if (col && pl) col.appendChild(pl); }        // columna izquierda: placa, marcador de partida y logros (el mapa queda libre)
  const map = A.createMap($("map"), world, onPick);
  /* pantallas opacas a pantalla completa (Ajustes, Enciclopedia): cuando terminan de entrar y tapan el mapa del todo, el mapa deja de dibujarse
     (no se ve: se ahorra la GPU y el hilo principal, que en equipos modestos se nota). Al cerrarse se destapa al instante */
  { const covers = new Map(), coverT = {}, sync = () => map.setHold && map.setHold(covers.size > 0);
    A.coverMap = (key, on, still) => { clearTimeout(coverT[key]); if (on) coverT[key] = setTimeout(() => { if (still && !still()) return; covers.set(key, still || (() => true)); sync(); }, 520); else { covers.delete(key); sync(); } };
    map.holdCheck = () => { for (const [k, f] of covers) if (!f()) covers.delete(k); if (!covers.size) sync(); return covers.size > 0; };   // red de seguridad: si la pantalla se fue por otro camino, el mapa vuelve solo
  }
  A.codex.init(world, map); A.pointer.init(map);
  map.quality = S.quality; map.resize(true); map.fxOn = !S.reduce; A.applySkin(S.skin, map);
  document.documentElement.classList.toggle("reduce-motion", S.reduce);
  applySens(); applyVisualFX(); applyQSize(); applyShake(); applyFlash();
  map.animateTo(map.home(), 0);
  A.cursor.set(S.cursor); A.tt.enable(S.tips);

  /* ------------------------------------------------------------ odometro mecanico */
  const DIGITS = [..."0123456789"].map(d => `<i>${d}</i>`).join("");
  function odoBuild(el, shape, oldDigits) {
    el.innerHTML = ""; el._cols = [];
    let di = 0;
    [...shape].forEach((ch, i) => {
      if (ch === "0") {
        const dg = document.createElement("span"); dg.className = "dg";
        const col = document.createElement("span"); col.className = "col"; col.style.setProperty("--i", el._cols.length); col.innerHTML = DIGITS;
        col.style.setProperty("--d", oldDigits ? oldDigits[di] || 0 : 0); dg.appendChild(col); el.appendChild(dg); el._cols.push(col); di++;
      } else { const sp = document.createElement("span"); sp.className = "sep"; sp.textContent = ch; el.appendChild(sp); }
    });
    el._shape = shape;
  }
  /* rueda las cifras hasta `value`. opts: ms, delay, tick (sonido de maquinita), instant */
  function odoSet(el, value, { ms = 1000, delay = 0, tick = false, instant = false } = {}) {
    const str = A.fmt(value), shape = str.replace(/\d/g, "0"), digits = (str.match(/\d/g) || []).map(Number);
    if (el._shape !== shape) {
      const prev = el._cols ? el._cols.map(c => +c.style.getPropertyValue("--d") || 0) : null;
      const aligned = prev ? Array(Math.max(0, digits.length - prev.length)).fill(0).concat(prev).slice(-digits.length) : null;
      /* las cifras nuevas parten de las de antes: basta con calcular su estilo (antes se maquetaba la pagina entera en cada contador que cambiaba de cifras) */
      el.style.setProperty("--t", "0s"); odoBuild(el, shape, aligned); el._cols.forEach(c => getComputedStyle(c).getPropertyValue("--t"));
    }
    el.style.setProperty("--t", instant ? "0s" : ms + "ms"); el.style.setProperty("--dl", instant ? "0ms" : delay + "ms");
    el._cols.forEach((c, i) => c.style.setProperty("--d", digits[i]));
    if (tick && !instant && value > 0) rollSound(ms, delay, el);
  }
  function rollSound(ms, delay, el) {
    const n = 12, live = () => el.isConnected && el.getClientRects().length > 0;   // si el ticket o el veredicto ya se han ido, la maquinita calla
    for (let i = 0; i < n; i++) setTimeout(() => { if (live()) A.sfx.count(i / (n - 1)); }, delay + (ms * 0.85 * i) / n);
    setTimeout(() => { if (live()) A.sfx.countEnd(); }, delay + ms * 0.9);
  }
  const odoNow = (el, v) => odoSet(el, v, { instant: true });

  /* ------------------------------------------------------------ utilidades de interfaz */
  function dialog(html, cls) {
    /* escritorio: el ticket de la respuesta sale del propio marcador (js/marcador.js); cualquier otra pantalla lo recoge al instante */
    if (cls === "side" && A.marcador.docked()) {
      $("layer").classList.add("hidden"); $("dlg").classList.remove("in"); document.body.classList.remove("vd-on");
      if (A.dealer && A.dealer.homeTease) A.dealer.homeTease(false);
      return A.marcador.show(html);
    }
    A.marcador.close(true);
    const d = $("dlg"); d.className = cls; d.innerHTML = html;
    document.body.classList.toggle("vd-on", cls === "verdict" || cls === "tablewrap"); document.body.classList.toggle("tk-on", cls === "side");
    if (A.dealer && A.dealer.homeTease) A.dealer.homeTease(cls === "home");   // el crupier asoma de vez en cuando SOLO en la pantalla de inicio
    $("layer").classList.remove("hidden");
    if (cls === "side") A.marcador.fitSheet();                               // v0.2.15: la hoja del ticket (ventana estrecha) cabe entera, sin desplazarse
    requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("in")));
    const b = d.querySelector("[data-primary]"); if (b) setTimeout(() => b.focus({ preventScroll: true }), 60);
  }
  function closeDialog() { A.marcador.close(); $("layer").classList.add("hidden"); $("dlg").classList.remove("in"); document.body.classList.remove("vd-on", "tk-on"); if (A.dealer && A.dealer.refit) A.dealer.refit(); }   // el ticket del marcador se arranca y cae
  /* control segmentado con indicador deslizante */
  function segSet(seg, value) {
    const btns = [...seg.querySelectorAll("button")], idx = Math.max(0, btns.findIndex(b => b.dataset.v === value));
    btns.forEach((b, i) => b.classList.toggle("on", i === idx)); seg.style.setProperty("--idx", idx);
  }
  const chrome = on => { for (const id of ["ledgerSh", "noteSh", "dockSh", "railSh"]) $(id).classList.toggle("hidden", !on); };

  /* ------------------------------------------------------------ HUD */
  function applyLang() {
    document.documentElement.lang = A.lang;
    document.querySelectorAll("[data-i]").forEach(el => (el.textContent = A.t(el.dataset.i))); if (S.settingsOpen) fitSetSoon();
    if (S.camp) updateHud();
    if (S.phase === "asking") setPrompt();
    syncSettings();
  }
  function levelTitle(L) { return A.tx(L.name) + (L.diff ? " · " + A.t("diff." + L.diff) : ""); }
  /* cash (solo al revelar): las cifras ruedan al compas del TOTAL del ticket y la barra arranca a la vez (el resto del cobro, en js/marcador.js) */
  function updateHud(cash) {
    const L = lv(), inf = S.run && A.adv.isInfinite && A.adv.isInfinite();
    $("lvlText").textContent = S.run ? A.adv.hudTitle() : A.t("lvl", { n: S.level + 1, m: S.camp.levels.length, name: levelTitle(L) });
    if (S.run) A.adv.refresh();
    odoSet($("scLevel"), S.levelScore, cash ? { ms: cash.ms, delay: cash.delay } : { ms: 900 });
    $("scTotal").textContent = A.fmt(S.runTotal + S.levelScore);
    { const dh = S.run && A.adv.duelHud ? A.adv.duelHud() : null, lb = $("scNeed").parentNode.firstElementChild;   // tanda 16: Duelo con la banca (la meta es su puntuacion, que sube con cada respuesta suya)
      if (dh) { lb.textContent = A.tx(A.chal.tl("ui_bank")); $("scNeed").textContent = A.fmt(dh.bank); $("scMark").style.right = (100 - dh.pct) + "%"; S.duelOn = true; }
      else { if (S.duelOn) { S.duelOn = false; lb.textContent = A.t("score.need"); $("scMark").style.right = ""; } $("scNeed").textContent = L.advance > 1 ? A.fmt(L.advance) : "—"; } }
    $("scBar").style.transition = cash ? `width ${cash.gauge}ms cubic-bezier(.2, .8, .2, 1) ${cash.delay}ms` : "";
    $("scBar").style.width = Math.min(100, (S.levelScore / Math.max(1, L.advance)) * 100) + "%";
    $("scBar").classList.toggle("done", L.advance > 1 && S.levelScore >= L.advance);
    $("scMark").style.display = L.advance > 1 ? "" : "none";
    const pips = $("pips"); pips.innerHTML = "";
    if (!inf) for (let i = 0; i < S.qs.length; i++) {
      const p = document.createElement("i");
      p.className = i < S.qi || (i === S.qi && S.phase === "reveal") ? "done" : i === S.qi && S.phase === "asking" ? "cur" : "";
      pips.appendChild(p);
    }
    $("askNo").textContent = inf ? A.t("ask.inf", { n: pad2(S.qi + 1) }) : A.t("ask.no", { n: pad2(Math.min(S.qi + 1, S.qs.length)), m: pad2(S.qs.length) });
  }
  function setPrompt() {
    const o = q(); if (!o) return;
    preFlags();                                                            // v0.2.15: la bandera del acierto, ya cargada para el mapa
    $("askKind").textContent = A.t("kind." + (o.clue ? "clue" : o.kind || lv().kind));
    if (o.clue && o.answer && !(o.sub && (o.sub.en || o.sub.es))) o.sub = A.blankObj(o.answer);        // descripcion: debajo, la casilla de cada letra
    const flagRound = (o.kind || lv().kind) === "flag" || !!(S.run && o.t === "c" && A.adv.isFlagRound && A.adv.isFlagRound());
    const portrait = !flagRound && !!o.img;
    $("askName").classList.toggle("ask-flag-wrap", flagRound);
    $("askName").classList.toggle("ask-person-wrap", portrait);
    if (flagRound && A.adv.renderFlag) { A.adv.renderFlag(o); }
    else if (portrait) {                                                   // Personajes: retrato (la foto empaquetada de su tarjeta) + nombre
      const el = $("askName"), img = document.createElement("img"), nm = document.createElement("b");
      img.className = "ask-portrait"; img.alt = ""; img.draggable = false;
      img.src = A.media(`assets/wiki/card/${A.mediaKey(o.cid[0])}.webp`);   // la foto ya va empaquetada (antes se pedia en vivo a Commons: nada de Wikipedia al jugar)
      img.onerror = () => img.remove();
      nm.textContent = A.tx(o.name); el.replaceChildren(img, nm);
      A.renderBlanks($("askSub"), A.tx(o.sub));
    }
    else { $("askName").textContent = A.tx(o.name); A.renderBlanks($("askSub"), A.tx(o.sub)); if (S.run && A.adv.decorate) A.adv.decorate(o); }
    $("plate").classList.toggle("clue", !!o.clue);
  }
  /* nota de campo al revelar (y al cambiar de idioma con el ticket abierto: antes ahi se perdia el dato de la Wikipedia y el de las pistas) */
  const factLine = o => (o.clue ? `${A.t("res.was")}: ${A.tx(o.answer)}${A.tx(o.fact) ? " — " + A.tx(o.fact) : ""}` : A.tx(o.fact) || A.factOf(o));
  function setTimer(left) {
    const f = Math.max(0, left / S.limit);
    $("timeFill").style.transform = `scaleX(${f})`;
    const str = Math.max(0, left).toFixed(1);
    if (str !== S.lastTimeStr) { S.lastTimeStr = str; $("timeTxt").textContent = A.fmt1(+str); $("plate").classList.toggle("hurry", f < 0.3 && left > 0); }
  }
  /* cinta de racha del marcador: aciertos seguidos y, en la Aventura y el Reto, su multiplicador de verdad ("Racha 3 · ×1,4"; hasta la 0.2.14
     decia "Racha ×3" y parecia un x3). En el Clasico la racha no multiplica: solo el numero */
  function setStreak() {
    const c = $("streakChip");
    if (S.streak >= 2) { c.innerHTML = `<span>${A.t("res.streak")} ${S.streak}</span>` + (S.run ? `<i> · </i><span>×${A.fmt1(1 + Math.min(1.5, 0.2 * (S.streak - 1)))}</span>` : ""); c.classList.remove("hidden", "pop"); A.restyle(c); c.classList.add("pop"); }   // en ventana estrecha, en dos lineas (css/marcador.css)
    else c.classList.add("hidden");
  }

  /* ------------------------------------------------------------ ajustes */
  function syncSettings() {
    for (const f of document.querySelectorAll(".fader[data-k]")) {
      const k = f.dataset.k, v = Math.round(A.audio.vol[k] * 100), inp = f.querySelector("input");
      inp.value = v; inp.style.setProperty("--p", v + "%"); f.querySelector("output").textContent = v;
      const sw = f.querySelector(".sw");
      if (sw) { const on = k === "music" ? A.audio.musicOn : A.audio.sfxOn; sw.setAttribute("aria-checked", on); f.classList.toggle("off", !on); }
    }
    for (const f of document.querySelectorAll(".fader[data-range]")) {
      const k = f.dataset.range, v = S[k === "pan" ? "panSens" : "zoomSens"], inp = f.querySelector("input");
      inp.value = v; inp.style.setProperty("--p", ((v - inp.min) / (inp.max - inp.min)) * 100 + "%"); f.querySelector("output").textContent = v + "%";
    }
    segSet(document.querySelector('[data-seg="gfx"]'), S.quality);
    segSet(document.querySelector('[data-seg="units"]'), S.units);
    segSet(document.querySelector('[data-seg="cb"]'), S.colorblind);
    segSet(document.querySelector('[data-seg="qsize"]'), S.qSize);
    refreshLangUIs(); if (A.syncWin) A.syncWin();
    const st = { motion: S.reduce, intro: S.intro, cursor: S.cursor, tips: S.tips, tour: S.tour, songs: S.songToast, contrast: S.contrast, shake: S.shake, flash: S.softFlash || flashForced() };
    for (const k in st) { const el = document.querySelector('.sw[data-sw="' + k + '"]'); if (el) el.setAttribute("aria-checked", !!st[k]); }
    { const rf = $("rowFlash"), lock = flashForced(); if (rf) { rf.classList.toggle("lock", lock); rf.querySelector(".sw").setAttribute("aria-disabled", lock); } }   // con "reducir movimiento" ya van suaves: encendido y quieto
    const sg = document.querySelector('.sw[data-sw="songs"]'); if (sg) sg.closest(".row-sw").classList.toggle("off", !A.audio.musicOn);
    $("rowCursor").classList.toggle("hidden", !A.cursor.available);
    setTab(S.setTab, true); if (A.jukebox) A.jukebox.sync();
    const rs = $("resetSet"); if (rs && !rs.classList.contains("armed")) rs.textContent = A.t("set.reset"); $("resetSetNote").textContent = A.t("set.reset.d");
    const ra = $("resetAll"); if (ra && !ra.classList.contains("armed")) ra.textContent = A.pick6("Borrar todos mis datos y empezar de cero|Delete all my data and start over|Effacer toutes mes données et repartir de zéro|Apagar todos os meus dados e começar do zero|Alle meine Daten löschen und neu anfangen|Cancella tutti i miei dati e ricomincia da zero|Borrar todos mis datos y empezar de cero|删除我的全部数据，从头开始|내 데이터를 모두 지우고 처음부터 시작|すべてのデータを消して最初から始める|Удалить все мои данные и начать заново|Usuń wszystkie moje dane i zacznij od nowa");   // antes "(desarrollo)": es un borrado completo para cualquier jugador, con doble confirmacion
    if ($("resetAllNote")) $("resetAllNote").textContent = A.pick6("Borra de este dispositivo tu partida guardada, perfil, logros, barajas y ascensiones, récords, Enciclopedia, tutorial y ajustes. No se puede deshacer.|Deletes your saved run, profile, achievements, decks and ascensions, records, Encyclopedia, tutorial and settings from this device. It can’t be undone.|Efface de cet appareil ta partie sauvegardée, ton profil, tes succès, paquets et ascensions, records, Encyclopédie, tutoriel et réglages. C’est irréversible.|Apaga deste dispositivo sua partida salva, perfil, conquistas, baralhos e ascensões, recordes, Enciclopédia, tutorial e configurações. Não dá para desfazer.|Löscht auf diesem Gerät deinen Spielstand, dein Profil, Erfolge, Decks und Aufstiege, Rekorde, Enzyklopädie, Tutorial und Einstellungen. Kann nicht rückgängig gemacht werden.|Cancella da questo dispositivo la partita salvata, il profilo, gli obiettivi, mazzi e ascensioni, record, Enciclopedia, tutorial e impostazioni. Non si può annullare.|Borra de este dispositivo tu partida guardada, perfil, logros, barajas y ascensiones, récords, Enciclopedia, tutorial y ajustes. No se puede deshacer.|删除此设备上的存档、档案、成就、牌组与飞升、纪录、百科全书、教程和设置。无法撤销。|이 기기에서 저장된 게임, 프로필, 업적, 덱과 어센션, 기록, 도감, 튜토리얼, 설정을 지웁니다. 되돌릴 수 없습니다.|この端末のセーブデータ、プロフィール、実績、デッキとアセンション、記録、図鑑、チュートリアル、設定を消去します。元に戻せません。|Удаляет с этого устройства сохранённую игру, профиль, достижения, колоды и восхождения, рекорды, энциклопедию, обучение и настройки. Отменить нельзя.|Usuwa z tego urządzenia zapisaną grę, profil, osiągnięcia, talie i wniebowstąpienia, rekordy, encyklopedię, samouczek i ustawienia. Tego nie da się cofnąć.");
    const rc = $("resetCodex"); if (rc && !rc.classList.contains("armed")) rc.textContent = A.T("Restablecer Enciclopedia", "Reset Encyclopedia");
    $("resetCodexNote").textContent = A.T("Borra todas las tarjetas desbloqueadas. Tu perfil, logros y récords no cambian.", "Deletes every unlocked card. Your profile, achievements and records stay.");
    if (A.nombre) A.nombre.sync();                                          // v0.37: "Tu nombre" (js/nombre.js)
  }
  /* creditos y licencias (credits.html, tools/build-credits.mjs): pagina aparte, en el navegador del sistema en Electron (main.js abre los http externos alli) */
  $("openCredits").onclick = () => { A.sfx.ui(); window.open("credits.html", "_blank", "noopener"); };
  /* restablecer la Enciclopedia: hay que pulsar dos veces (la primera arma el boton) */
  { const rc = $("resetCodex"); let tm = 0;
    rc.onclick = () => {
      if (!rc.classList.contains("armed")) { rc.classList.add("armed"); rc.textContent = A.T("¿Seguro? Pulsa otra vez para borrar", "Sure? Press again to delete"); A.sfx.ui(); clearTimeout(tm); tm = setTimeout(() => { rc.classList.remove("armed"); syncSettings(); }, 4000); return; }
      clearTimeout(tm); rc.classList.remove("armed"); A.codex.reset(); A.sfx.card(); rc.textContent = A.T("Enciclopedia restablecida", "Encyclopedia reset"); setTimeout(syncSettings, 2200);
    }; }
  /* reinicio total (desarrollo): pulsar dos veces; borra TODO lo que guarda el juego en este navegador y recarga */
  { const ra = $("resetAll"); let tm = 0;
    ra.onclick = () => {
      if (!ra.classList.contains("armed")) { ra.classList.add("armed"); ra.textContent = A.T("¿Seguro? Se borra TODO. Pulsa otra vez", "Sure? EVERYTHING is deleted. Press again"); A.sfx.deny(); clearTimeout(tm); tm = setTimeout(() => { ra.classList.remove("armed"); syncSettings(); }, 4500); return; }
      clearTimeout(tm); ra.disabled = true;
      const wipe = () => {
      try { A.adv.abandon && A.adv.abandon(); } catch (e) { /* sin partida */ }
      try { Object.keys(localStorage).filter(k => /^atlasiq\./.test(k)).forEach(k => localStorage.removeItem(k)); sessionStorage.clear(); } catch (e) { /* sin almacenamiento */ }
      try { indexedDB.deleteDatabase("atlasiq-codex"); } catch (e) { /* sin IndexedDB */ }
      try { navigator.serviceWorker && navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())); caches && caches.keys().then(ks => ks.forEach(k => caches.delete(k))); } catch (e) { /* sin SW */ }
      ra.textContent = A.T("Reiniciado. Recargando…", "Reset. Reloading…"); setTimeout(() => location.reload(), 500);
      };
      if (A.dealer && A.dealer.forget) A.dealer.forget(wipe); else wipe();       // el crupier se despide antes (y te olvida de verdad)
    }; }
  /* Ajustes no se escala con --k: si en una ventana pequena (1024x768 en ruso o japones) su panel no cabe, se encoge con zoom hasta que quepa
     (en escritorio nunca hay que desplazarse); en movil se desplaza como siempre */
  const fitSet = () => {
    const b = document.querySelector("#settings .set-body"), p = document.querySelector("#settings .set-panes"); if (!b || !p) return;
    b.style.zoom = ""; if (!S.settingsOpen || innerWidth < 900 || innerHeight < 520) return;
    let z = 1; for (let i = 0; i < 6 && p.scrollHeight > p.clientHeight + 2; i++) { z = Math.max(0.7, z * p.clientHeight / p.scrollHeight * 0.99); b.style.zoom = z.toFixed(3); if (z <= 0.7) break; }
  };
  const fitSetSoon = () => requestAnimationFrame(fitSet);
  addEventListener("resize", fitSetSoon);
  let setFocusBack = null;
  function openSettings(on) {
    if (on && S.phase === "asking" && !S.paused) togglePause();           // Ajustes tapa el mapa: la pregunta queda en pausa (antes el reloj seguia corriendo detras y se perdia)
    const was = S.settingsOpen; S.settingsOpen = on; const sh = $("setSh"), sv = $("setVeil");
    sh.classList.toggle("hidden", !on);
    if (sv) sv.classList.toggle("hidden", !on);
    $("setBtn").setAttribute("aria-expanded", on);
    if (A.dealer && A.dealer.homeTease) {
      if (on) { if (!was) S._dealerWasHome = A.dealer.onHome; A.dealer.homeTease(false); }
      else if (was && S._dealerWasHome) A.dealer.homeTease(true);            // solo al cerrar Ajustes de verdad (prepareRun y showTitle lo llaman cerrado: no reactiva al crupier del inicio al empezar partida)
    }
    if (on) { if (A.jukebox) A.jukebox.hide(); syncSettings(); A.sfx.ui(); const v = $("setVer"); if (v) v.textContent = A.VERSION; if (S.setTab === "data" && A.dealer && A.dealer.renderFile) A.dealer.renderFile($("dlFile")); fitSetSoon(); }
    if (on !== was) A.coverMap("settings", on, () => S.settingsOpen);
    /* foco (teclado y lectores de pantalla): al abrir va al panel y al cerrar vuelve a donde estaba (boton de ajustes, "Continuar" de la pausa...) */
    /* el foco del panel, justo despues de pintarlo: dado en el mismo instante obligaba a recalcular la pagina entera a medio abrir (tiron al abrir Ajustes) */
    if (on && !was) { setFocusBack = document.activeElement; const p = $("settings"); if (p) { p.tabIndex = -1; requestAnimationFrame(() => setTimeout(() => { if (S.settingsOpen) p.focus({ preventScroll: true }); }, 0)); } }
    else if (!on && was) { const b = setFocusBack; setFocusBack = null; if (b && b !== document.body && b.isConnected && b.focus) b.focus({ preventScroll: true }); }
  }
  let blipT = 0;
  for (const f of document.querySelectorAll(".fader[data-k]")) {
    const k = f.dataset.k, inp = f.querySelector("input");
    inp.addEventListener("input", () => {
      const v = +inp.value / 100; A.audio.unlock(); A.audio.setVol(k, v);
      inp.style.setProperty("--p", inp.value + "%"); f.querySelector("output").textContent = inp.value;
      const now = performance.now(); if (now - blipT > 90) { blipT = now; (k === "music" ? A.sfx.blip : A.sfx.blip)(v); }
    });
    inp.addEventListener("change", save);
    const sw = f.querySelector(".sw");
    if (sw) sw.addEventListener("click", () => { toggleSwitch(k); });
  }
  for (const f of document.querySelectorAll(".fader[data-range]")) {
    const k = f.dataset.range === "pan" ? "panSens" : "zoomSens", inp = f.querySelector("input");
    inp.addEventListener("input", () => {
      S[k] = +inp.value; applySens();
      inp.style.setProperty("--p", ((inp.value - inp.min) / (inp.max - inp.min)) * 100 + "%"); f.querySelector("output").textContent = inp.value + "%";
    });
    inp.addEventListener("change", save);
  }
  function toggleSwitch(k) {
    if (k === "music") { A.audio.setMusic(!A.audio.musicOn); if (A.audio.musicOn) A.audio.unlock(); else if (A.jukebox) A.jukebox.hide(); A.sfx.flip(A.audio.musicOn); }
    else { const willOn = !A.audio.sfxOn; if (!willOn) A.sfx.flip(false); A.audio.sfxOn = willOn; if (willOn) A.sfx.flip(true); }
    save(); syncSettings();
  }
  /* ---- idioma: cuadricula en ajustes, popover en el menu y chips en la entrada ---- */
  function langChips(host, onPick) {
    host.innerHTML = "";
    A.LANGS.forEach(L => {
      const b = document.createElement("button"); b.type = "button"; b.dataset.l = L.code; b.lang = L.code;
      b.innerHTML = `${A.icon("flag_" + L.code, "lang-flag")}<span>${L.name}</span>`;
      b.className = L.code === A.lang ? "on" : ""; b.onclick = e => { e.stopPropagation(); onPick(L.code); }; host.appendChild(b);
    });
  }
  function refreshLangUIs() { for (const id of ["gateLangs", "langGrid", "langPopGrid"]) { const h = $(id); if (h) [...h.children].forEach(b => b.classList.toggle("on", b.dataset.l === A.lang)); } }
  function setLang(code) {
    if (code === A.lang || !A.STR[code]) return;
    const old = A.lang; A.lang = code; save(); A.sfx.ui(); A.wiki.loadShort(A.wlang()); applyLang(); refreshLangUIs();
    if (S.phase === "title" && !S.booting) renderMenu();
    else if (S.phase === "reveal") { const o = q(); if (o) $("factText").textContent = factLine(o); }
    if (S.camp) updateHud();
    A.codex.refresh();
    if (A.dealer && A.dealer.noteLang) A.dealer.noteLang(old, code);          // Babel en directo: su proxima frase sale todavia en el idioma que dejas
  }
  langChips($("langGrid"), setLang); langChips($("langPopGrid"), code => { setLang(code); $("langPop").classList.add("hidden"); });
  function openLangPop(anchor) {
    const pop = $("langPop"); if (!pop.classList.contains("hidden")) { pop.classList.add("hidden"); return; }
    pop.classList.remove("hidden"); refreshLangUIs();
    const r = anchor.getBoundingClientRect(), w = pop.offsetWidth;
    pop.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.right - w)) + "px"; pop.style.top = r.bottom + 10 + "px";
  }
  document.addEventListener("pointerdown", e => { if (!e.target.closest("#langPop, #menuLang")) $("langPop").classList.add("hidden"); }, true);
  function applyMotion() { document.documentElement.classList.toggle("reduce-motion", S.reduce); map.fxOn = !S.reduce; }
  function applySens() { A.mapSens.pan = S.panSens / 100; A.mapSens.zoom = S.zoomSens / 100; }
  /* Vibracion = no: html.no-shake quita en CSS todos los temblores de pantalla (rachas, rabieta y golpes del crupier; ver uikit.css),
     jpShake no arranca y el movil no vibra. Los retos que tiemblan (Terremoto, letras...) son el propio reto y siguen */
  function applyShake() { document.documentElement.classList.toggle("no-shake", !S.shake); A.haptic.on = S.shake; }
  /* Destellos suaves (v0.52): html.soft-flash; js/chfx.js (A.softFlash) suma "reducir movimiento" del juego o del sistema, que tambien los suaviza */
  function applyFlash() { document.documentElement.classList.toggle("soft-flash", !!S.softFlash); }
  function flashForced() { return !!S.reduce || matchMedia("(prefers-reduced-motion: reduce)").matches; }
  /* daltonismo (filtro SVG, ver index.html #cbDefs) + alto contraste: se combinan en un solo filter CSS */
  function applyVisualFX() {
    const cb = S.colorblind !== "off" ? `url(#cbFix_${S.colorblind})` : "";
    const hc = S.contrast ? "contrast(1.18) saturate(1.15)" : "";
    document.body.style.filter = [cb, hc].filter(Boolean).join(" ");
    document.documentElement.classList.toggle("hi-contrast", S.contrast);
  }
  function applyQSize() { document.documentElement.style.setProperty("--ask-scale", S.qSize === "xl" ? 1.3 : S.qSize === "l" ? 1.15 : 1); }
  const TOG = {
    motion: () => { S.reduce = !S.reduce; applyMotion(); }, intro: () => { S.intro = !S.intro; },
    cursor: () => { S.cursor = !S.cursor; A.cursor.set(S.cursor); }, tips: () => { S.tips = !S.tips; A.tt.enable(S.tips); }, tour: () => { S.tour = !S.tour; if (S.tour && A.tour) A.tour.reset(); },
    songs: () => { S.songToast = !S.songToast; if (!S.songToast && A.jukebox) A.jukebox.hide(); },
    contrast: () => { S.contrast = !S.contrast; applyVisualFX(); },
    shake: () => { S.shake = !S.shake; applyShake(); if (S.shake) { jpShake(1); A.haptic([40]); } },   // al encenderla, un temblor flojo de muestra
    flash: () => { if (flashForced()) { A.sfx.deny(); return false; } S.softFlash = !S.softFlash; applyFlash(); },
  };
  for (const sw of document.querySelectorAll(".sw[data-sw]")) if (TOG[sw.dataset.sw]) sw.addEventListener("click", () => { if (TOG[sw.dataset.sw]() === false) return; A.sfx.flip(true); save(); syncSettings(); });
  /* pestanas de Ajustes */
  function setTab(t, silent) {
    S.setTab = t; segSet(document.querySelector('[data-seg="settab"]'), t);
    if (t === "data" && A.dealer && A.dealer.renderFile) A.dealer.renderFile($("dlFile"));   // su expediente
    document.querySelectorAll(".set-pane").forEach(p => p.classList.toggle("hidden", p.dataset.pane !== t));
    if (!silent) { save(); A.sfx.ui(); } fitSetSoon();
  }
  document.querySelector('[data-seg="settab"]').addEventListener("click", e => { const b = e.target.closest("button"); if (b && b.dataset.v !== S.setTab) { setTab(b.dataset.v); if (A.jukebox) A.jukebox.sync(); } });
  /* restablecer ajustes: doble pulsacion */
  { const rs = $("resetSet"); let tm = 0;
    rs.onclick = () => {
      if (!rs.classList.contains("armed")) { rs.classList.add("armed"); rs.textContent = A.t("set.reset.ask"); A.sfx.ui(); clearTimeout(tm); tm = setTimeout(() => { rs.classList.remove("armed"); syncSettings(); }, 4000); return; }
      clearTimeout(tm); rs.classList.remove("armed");
      A.audio.setVol("master", 0.85); A.audio.setVol("music", 0.7); A.audio.setVol("sfx", 0.9); A.audio.sfxOn = true; A.audio.setMusic(true); A.audio.unlock();
      S.quality = "auto"; map.setQuality("auto"); S.reduce = false; applyMotion(); S.intro = true; S.cursor = true; S.tips = true; S.tour = true; if (A.tour) A.tour.reset(); S.songToast = true; S.shake = true; applyShake(); S.softFlash = false; applyFlash(); A.cursor.set(true); A.tt.enable(true);
      S.panSens = 100; S.zoomSens = 100; applySens(); S.units = "km"; S.contrast = false; S.colorblind = "off"; applyVisualFX(); S.qSize = "n"; applyQSize(); S.uiScale = 100; setK(); dispatchEvent(new Event("resize"));
      save(); A.sfx.card(); syncSettings(); rs.textContent = A.t("set.reset.done"); setTimeout(syncSettings, 2200);
    }; }
  /* Pantalla (v0.2.27): Ventana / Pantalla completa y la escala de la interfaz en todos; en el cliente de escritorio (window.geoliteHost.screenInfo)
     ademas el tamano del area de juego en pixeles fisicos y el monitor. Filas "< valor >" que valen igual con raton, mando y tactil, sin desplegables */
  { const seg = document.querySelector('[data-seg="win"]'), host = window.geoliteHost, scr = !!(host && host.screenInfo);
    const cur = () => (host && host.windowMode ? host.windowMode() : document.fullscreenElement ? "full" : "window");
    const X = s => s[0] + " \u00d7 " + s[1], same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
    let info = null;
    /* una fila: valores, posicion del elegido, como se pinta y que hace al elegir otro (las flechas no dan la vuelta) */
    const row = (id, o) => {
      const el = $(id); if (!el) return; el.classList.toggle("hidden", !o); if (!o) return;
      const n = o.vals.length, i = Math.max(0, Math.min(n - 1, o.at)), off = !!o.off || n < 2, [lo, hi] = el.querySelectorAll(".stp-b");
      const v = el.querySelector(".stp-v"); el.classList.toggle("off", off); v.textContent = o.fmt(o.vals[i]); v.title = o.tip ? o.tip(o.vals[i]) : v.textContent; if (o.tip) el.title = v.title; el.querySelector(".stp-tag").textContent = o.tag ? o.tag(o.vals[i]) : "";
      lo.disabled = off || i <= 0; hi.disabled = off || i >= n - 1;
      el._step = d => { const j = i + d; if (off || j < 0 || j >= n) return; A.sfx.ui(); o.pick(o.vals[j]); };
    };
    /* tamano: las flechas recorren los tamanos que caben en este monitor, de menor a mayor; el automatico (el mayor que deja aire) es uno mas
       de la lista con su etiqueta AUTO, y elegirlo vuelve a "automatico". El que dejaste estirando el borde sale en su sitio como PERSONALIZADO */
    const sizeRow = I => {
      if (I.mode === "full") return { vals: [I.native], at: 0, off: true, fmt: X, tag: () => A.t("scr.native") };
      const vals = I.sizes.slice(), add = s => { if (!vals.some(x => same(x, s))) { const ar = s[0] * s[1]; let j = vals.findIndex(x => x[0] * x[1] > ar); vals.splice(j < 0 ? vals.length : j, 0, s); } };
      const mine = I.size && I.sizeOk ? I.size : null, custom = !!mine && !I.sizes.some(s => same(s, mine)) && !same(mine, I.auto);
      add(I.auto); if (mine) add(mine);
      return { vals, at: vals.findIndex(s => same(s, mine || I.auto)), fmt: X,
        tag: s => (custom && same(s, mine) ? A.t("scr.custom") : same(s, I.auto) ? A.t("scr.auto") : ""),
        pick: s => host.setScreen({ size: same(s, I.auto) ? null : s }) };
    };
    const monRow = I => I.displays.length < 2 ? null : { vals: I.displays, at: I.displays.findIndex(d => d.id === I.display),
      fmt: d => String(d.n), tip: d => A.t("scr.mon") + " " + d.n + " \u00b7 " + (d.label ? d.label + " \u00b7 " : "") + X([d.w, d.h]), pick: d => host.setScreen({ display: d.id }) };
    const scaleRow = () => {
      if (innerWidth < 900 || innerHeight < 520) return null;                               // movil: su propia maqueta, sin escala
      const r = kRange(), vals = []; for (let s = 50; s <= 300; s += 10) if (s === 100 || (s / 100 >= r.lo - 1e-3 && s / 100 <= r.hi + 1e-3)) vals.push(s);
      if (vals.length < 2) return null;                                                   // ventana de 1280x720 o menos: la interfaz ya esta a su tamano de diseno, no hay nada que elegir
      let at = 0; vals.forEach((s, i) => { if (Math.abs(s - S.uiScale) < Math.abs(vals[at] - S.uiScale)) at = i; });
      return { vals, at, fmt: s => s + " %", tag: s => s === 100 ? A.t("scr.auto") : "",
        pick: s => { S.uiScale = s; save(); setK(); dispatchEvent(new Event("resize")); sync(); } };
    };
    const sync = () => {
      segSet(seg, cur());
      if (scr && S.settingsOpen) { info = host.screenInfo(); row("scrSize", sizeRow(info)); row("scrMon", monRow(info)); }
      row("scrScale", scaleRow()); if (S.settingsOpen) fitSetSoon();
    };
    for (const id of ["scrSize", "scrMon", "scrScale"]) $(id).addEventListener("click", e => { const b = e.target.closest(".stp-b"); if (b && !b.disabled && $(id)._step) $(id)._step(+b.dataset.d); });
    seg.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return; const v = b.dataset.v; A.sfx.ui();
      if (v !== cur() && A.dealer && A.dealer.noteWindow) A.dealer.noteWindow(v);           // el crupier lo comenta al volver
      if (host && host.setWindowMode) host.setWindowMode(v);
      else if (v === "full" && !document.fullscreenElement) toggleFs(); else if (v === "window" && document.fullscreenElement) toggleFs();
      setTimeout(sync, 120);
    });
    document.addEventListener("fullscreenchange", sync);
    let syncT = 0; addEventListener("resize", () => { if (!S.settingsOpen) return; clearTimeout(syncT); syncT = setTimeout(sync, 160); });   // la escala posible depende del tamano de la ventana
    A.syncWin = sync;
    if (host && host.onScreenChange) host.onScreenChange(() => { if (S.settingsOpen) sync(); });
    if (host && host.onWindowModeChange) host.onWindowModeChange(() => { sync(); $("fsBtn").classList.toggle("on", cur() === "full"); }); }
  document.querySelector('[data-seg="gfx"]').addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || b.dataset.v === S.quality) return;
    S.quality = b.dataset.v; save(); A.sfx.ui(); map.setQuality(S.quality); syncSettings();
  });
  document.querySelector('[data-seg="units"]').addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || b.dataset.v === S.units) return;
    S.units = b.dataset.v; save(); A.sfx.ui(); syncSettings(); if (S.camp) updateHud();
  });
  document.querySelector('[data-seg="cb"]').addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || b.dataset.v === S.colorblind) return;
    S.colorblind = b.dataset.v; save(); A.sfx.ui(); applyVisualFX(); syncSettings();
  });
  document.querySelector('[data-seg="qsize"]').addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || b.dataset.v === S.qSize) return;
    S.qSize = b.dataset.v; save(); A.sfx.ui(); applyQSize(); syncSettings();
  });
  $("setBtn").onclick = () => openSettings(!S.settingsOpen);
  $("setClose").onclick = () => openSettings(false);
  document.addEventListener("pointerdown", e => { if (S.settingsOpen && !e.target.closest("#setSh, #setBtn, .menu-gear, #langPop")) openSettings(false); }, true);

  /* los tooltips (data-tt / data-tip / title) los pinta js/uikit.js */
  /* sonido suave al pasar por controles. Los 7 botones del menu principal (3 modos, Enciclopedia, Clasificacion, Perfil, Ajustes) tienen el suyo,
     solo con raton: en movil el toque ya suena al pulsar y no se montan dos sonidos */
  const MENU6 = ".hh .mcard, .hh .plq, .hh .menu-gear, #dlg > .menu-patch";                                   // .plq: las placas del pie (Enciclopedia, Clasificacion, Perfil)
  const menuK = el => (el.classList.contains("mcard") ? ["classic", "adventure", "daily"].indexOf(el.dataset.mode) : ({ codexBtn: 3, profBtn: 4, rankBtn: 6, patchBtn: 3 })[el.id] ?? 5);
  let lastHover = null, ptr = "mouse";
  document.addEventListener("pointerover", e => (ptr = e.pointerType), true);
  document.addEventListener("mouseover", e => {
    const el = e.target.closest && e.target.closest(MENU6 + ", .go, .camp, .btn-ink, .btn-line, .lv:not(:disabled), #dock button, #rail button, .seg button, .menu-gear, .cx-strip, .mode-card, .deck:not(:disabled), .asc:not(:disabled), .tool, .buy:not(:disabled), .hub-back, .inv-perk, .go2, .sup, .nr-buy, .pd-tabs button, .pd-x");
    if (el && el !== lastHover) { if (!el.matches(MENU6)) A.sfx.hover(); else if (ptr === "mouse") A.sfx.menuHover(menuK(el)); }
    lastHover = el;
  });

  /* ------------------------------------------------------------ movimiento de camara -> sonido */
  let zsT = 0;
  map.onMotion = (zv, pan) => { const now = performance.now(); if (now - zsT < 33) return; zsT = now; A.sfx.zoomVel(zv, pan); };

  /* ------------------------------------------------------------ carril de zoom */
  let zT = 0;
  map.onView = () => {
    const now = performance.now(); if (now - zT < 90) return; zT = now;
    const z = Math.log(Math.max(1, map.zoomLevel())) / Math.log(Math.max(2, map.maxS / map.minS));   // zoom maximo real de cada motor (GL x70, 2D x120): antes el indicador del mapa GL nunca llegaba arriba
    $("zoomFill").style.setProperty("--z", Math.round(Math.min(1, z) * 94) + "%");
  };

  /* ------------------------------------------------------------ menu principal */
  function showTitle(screen) {
    document.body.classList.add("title-on"); S.phase = "title"; S.camp = null; S.run = null; S.tool = null; S.ranked = null; A.adv.hideBars(); map.setStyle(A.MAPSTYLES[S.skin] || A.MAPSTYLES.casino); map.setPick(false); map.clearMarks(); map.setHome({ lat: 0, lon: 0, zoom: 1 });
    $("plate").classList.add("hidden"); $("pauseBtn").classList.add("hidden"); $("veil").classList.add("hidden"); $("intro").classList.add("hidden");
    chrome(false); $("factText").textContent = ""; A.music.mode(0); map.startDrift(); openSettings(false);
    renderMenu(screen);
  }
  function renderMenu(screen) { A.hub.screen(screen || S.hub || "home"); }
  /* altura ocupada por el pie de pagina: las cartas de herramienta se colocan justo encima */
  /* escala de la interfaz: en pantallas grandes todo el HUD y los menus crecen (k = 1 en 1280x720, hasta 1,85) para aprovechar el espacio */
  const uiK = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--k")) || 1;
  /* v0.2.27: Ajustes > Pantalla > Interfaz multiplica la k automatica. Nunca baja de 1 (el tamano de diseno: la letra no se hace ilegible) ni pasa
     de lo que cabe en la ventana (min(w/1280, h/720): mismas proporciones que a 1280x720, asi que nada se solapa ni hace falta desplazarse) */
  const kRange = (w = innerWidth, h = innerHeight) => { const geo = Math.min(w / 1280, h / 720), auto = Math.max(1, Math.min(1.85, geo)); return { auto, lo: 1 / auto, hi: Math.max(1, geo) / auto }; };
  const setK = () => { const w = innerWidth, h = innerHeight, r = kRange(w, h), k = (w < 900 || h < 520) ? 1 : Math.max(1, Math.min(r.auto * r.hi, r.auto * (S.uiScale || 100) / 100)); document.documentElement.style.setProperty("--k", k.toFixed(3)); };
  /* ajuste fino: si una pantalla escalada (inicio, campamento, veredicto...) no cabe en la ventana, se baja SU k hasta que quepa entera (nunca hay que desplazarse: esto es un juego de escritorio) */
  const FIT = ".hh, .scr, .table, .vd";
  /* huella de lo que decide el ajuste (pantalla, ventana, escala, fuentes y medidas): si no ha cambiado desde el ultimo, el resultado seria el mismo
     y se ahorra repetirlo (los repasos de seguridad, las imagenes que terminan de cargar sin mover nada y los contadores o frases que cambian
     dentro de la pantalla ya no la recalculan entera) */
  let dlgNew = 0, fitNew = -1, fitLast = "";
  const fitSig = (d, el) => {
    const b = el && el.querySelector(".scr-body"), box = el || d;
    return [innerWidth, innerHeight, document.documentElement.style.getPropertyValue("--k"), document.fonts ? document.fonts.status : "", d.clientWidth, d.clientHeight,
      box.scrollWidth, box.scrollHeight, box.getBoundingClientRect().height.toFixed(1), b ? b.scrollHeight + "/" + b.clientHeight : "",
      ...[...box.children].map(c => c.offsetTop + ":" + c.offsetHeight), ...[...box.querySelectorAll(".offer.pc")].map(c => c.scrollHeight)].join();
  };
  const fitK = () => {
    const d = $("dlg"), el = d && d.querySelector(":scope > " + FIT.split(", ").join(", :scope > ")); if (!d || !d.isConnected || !d.getClientRects().length) return;   // oculto (ya se cerro): nada que ajustar
    if (fitNew === dlgNew && fitSig(d, el) === fitLast) return;                 // pantalla nueva: ni se mide, se ajusta directamente (medir la huella costaba otro recalculo entero)
    fitRun(d, el); fitNew = dlgNew; fitLast = fitSig(d, el);
  };
  const fitRun = (d, el) => {
    if (!el) { if (A.squeeze) A.squeeze(d); return; }
    const base = uiK(); el.style.removeProperty("--k");
    if (el.classList.contains("scrolls")) { if (A.squeeze) A.squeeze(el); return; }                    // pantalla con desplazamiento (solo el Perfil): a tamano completo
    const over = () => {
      const b = el.querySelector(".scr-body");
      if (b) { const ch = b.clientHeight, sh = b.scrollHeight; return sh > ch + 2 ? ch / sh : 1; }      // en px, no en %: con un 1,5 % de margen quedaba una barra de desplazamiento de unos pocos px
      const ch = d.clientHeight, sh = el.getBoundingClientRect().height;                                 // sin .scr-body: el propio bloque (min-height:100%) puede salirse del dialogo, no de si mismo
      let r = sh > ch * 1.015 ? ch / sh : 1;
      if (innerWidth < 900 || innerHeight < 520) return r;                                               // movil: ahi si se desplaza (encoger lo dejaria ilegible)
      /* bloque de alto fijo (Campamento: height 100%): el contenido se sale por abajo. Se mide la maqueta (offsetTop/Height), no scrollHeight,
         que tambien cuenta las cartas mientras entran animadas desde abajo y encogia la pantalla sin motivo */
      const top0 = el.offsetTop, need = Math.max(0, ...[...el.children].map(c => (c.offsetParent === el ? c.offsetTop : c.offsetTop - top0) + c.offsetHeight)) + (parseFloat(getComputedStyle(el).paddingBottom) || 0);
      if (need > el.clientHeight + 1) r = Math.min(r, el.clientHeight / need);
      el.querySelectorAll(".offer.pc").forEach(c => { const room = c.parentElement.clientHeight; if (c.scrollHeight > c.clientHeight + 2 && c.offsetHeight >= room * 0.8) r = Math.min(r, Math.max(0.9, c.clientHeight / c.scrollHeight)); });   // cartas aplastadas por falta de sitio que recortan su boton
      return r;
    };
    let k = base;
    /* la misma pantalla (mismos textos, ventana, escala e idioma) ya se ajusto antes: se empieza en la k a la que llego. El resultado es el mismo,
       pero en una sola vuelta en vez de 2-4 (cada una recalcula la pantalla entera: el Clasico daba un tiron cada vez que se abria) */
    let h = 0; const tx = el.textContent; for (let i = 0; i < tx.length; i++) h = (h * 31 + tx.charCodeAt(i)) | 0;
    const ims = el.getElementsByTagName("img"); let ok = 0; for (const im of ims) if (im.complete) ok++;          // las imagenes que ya han llegado tambien cuentan
    const ck = [el.className, innerWidth, innerHeight, base, A.lang, document.fonts ? document.fonts.status : "", ims.length, ok, tx.length, h].join("|"), hint = kMemo.get(ck);
    if (hint && hint < base) { k = hint; el.style.setProperty("--k", k.toFixed(3)); }
    /* primero se quitan las lineas "de 3 letras" (A.squeeze), luego se mide */
    for (let i = 0; i < 8; i++) { if (A.squeeze) A.squeeze(el); const r = over(); if (r >= 1) break; k = Math.max(0.55, k * r * 0.985); el.style.setProperty("--k", k.toFixed(3)); if (k <= 0.55) break; }
    kMemo.delete(ck); kMemo.set(ck, k); if (kMemo.size > 60) kMemo.delete(kMemo.keys().next().value);
  };
  const kMemo = new Map();                                                     // solo en esta sesion: con otro CSS saldria otra k
  let fitT = 0; const fitSoon = () => { clearTimeout(fitT); fitT = setTimeout(() => { requestAnimationFrame(fitK); }, 60); };
  /* una pantalla que se completa poco a poco y ajusta ella misma lo que anade (el Perfil): lo que hay ahora cuenta como ya ajustado */
  A.fitMark = () => queueMicrotask(() => { const d = $("dlg"); if (!d || !d.isConnected) return; fitNew = dlgNew; fitLast = fitSig(d, d.querySelector(":scope > " + FIT.split(", ").join(", :scope > "))); });
  setK(); A.uiK = uiK; A.fitK = fitK;
  addEventListener("resize", () => { setK(); fitSoon(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSoon);
  /* pantalla nueva: se ajusta en el mismo fotograma en que se pinta por primera vez (sale ya ajustada, sin salto) y luego dos repasos por si algo llega tarde */
  if (window.MutationObserver && $("dlg")) { const d = $("dlg"); new MutationObserver(m => { if (m.some(x => x.addedNodes.length)) { dlgNew++; clearTimeout(fitT); requestAnimationFrame(fitK); setTimeout(fitK, 260); setTimeout(fitK, 700); } }).observe(d, { childList: true }); }
  /* las cartas (retratos, iconos) pueden tardar en cargar en la primera visita: si llegan tarde, el ajuste ya hecho se queda corto y el panel desborda.
     Un solo reajuste cuando termina la tanda (antes, uno por imagen: el Perfil trae 200 y el mapa de fondo iba a tirones) */
  let imgT = 0; if ($("dlg")) $("dlg").addEventListener("load", e => { if (e.target.tagName === "IMG") { clearTimeout(imgT); imgT = setTimeout(fitSoon, 240); } }, true);
  /* --note-top: lo que ocupa la nota de campo desde abajo; --plate-bottom (v0.2.15): donde acaba la placa. Entre las dos va la hoja del ticket en ventana estrecha */
  { let updQ = 0; const de = document.documentElement, last = {};
    /* una variable en la raiz recalcula los estilos de TODA la pagina: solo se escribe si cambia de verdad, y las de la ventana estrecha solo en ella
       (el marcador cambia de tamano en cada fotograma mientras se despliega el ticket: escribirlas siempre costaba fotogramas) */
    const set = (k, v) => { if (last[k] !== v) { last[k] = v; de.style.setProperty(k, v); } };
    const upd = () => {
      const r = $("note").getBoundingClientRect(); set("--note-top", (r.height ? Math.round(innerHeight - r.top) : 16) + "px");
      if (A.marcador.docked()) return;
      const p = $("plate").getBoundingClientRect(), lw = $("ledgerSh").getBoundingClientRect().width;
      set("--plate-bottom", (p.height ? Math.round(p.bottom) : 16) + "px"); if (lw) set("--ledger-w", Math.round(lw) + "px");   // la placa deja sitio al marcador
      A.marcador.fitSheet();
    };
    const soon = () => { if (!updQ) updQ = requestAnimationFrame(() => { updQ = 0; upd(); }); };   // fuera del aviso de cambio de tamano: lo que mueve (la placa, la hoja) no reentra en el mismo fotograma
    /* la nota siempre; la placa y el marcador solo en ventana estrecha (en escritorio el marcador cambia de tamano en cada fotograma al desplegar el ticket
       y se ajusta dentro de su propio aviso: vigilarlo ahi costaba fotogramas y el navegador avisaba de un bucle) */
    let ro = null, wide = null;
    const watch = () => { const d = A.marcador.docked(); if (!ro || d === wide) return; wide = d; for (const id of ["plate", "ledgerSh"]) d ? ro.unobserve($(id)) : ro.observe($(id)); };
    if (window.ResizeObserver) { ro = new ResizeObserver(soon); ro.observe($("note")); watch(); }
    addEventListener("resize", () => { watch(); upd(); }); }

  /* ------------------------------------------------------------ partida */
  function prepareRun(resume) { S.run = null; S.tool = null; openSettings(false); A.audio.unlock(); A.music.mode(1); if (!resume) { A.profile.get().stats.plays++; A.profile.save(); } }   // resume: seguir una partida guardada no suma partida (logro de 50 partidas)
  function newRun() {
    S.camp = A.CAMPAIGNS.find(c => c.id === S.campId);
    S.runTotal = 0; S.runMax = 0; S.completed = 0; S.clean = S.startLevel === 0; save(); prepareRun();   // clean: desde el nivel 1 y sin fallar ninguno (logro Sin red)
    map.setHome(S.camp.home);
    startLevel_(S.startLevel);
  }
  function startLevel_(idx) {
    if (!S.run && A.dealer && A.dealer.noteClassic) A.dealer.noteClassic();     // juegas al Clasico: al volver a la portada, el crupier lo comenta
    document.body.classList.remove("title-on"); S.level = idx; S.qs = lv().questions(); S.qi = 0; S.levelScore = 0; S.streak = 0; S.hits = 0; S.phase = "intro"; S.runMax0 = S.runMax;   // maximo acumulado al empezar el nivel (Reintentar vuelve a el)
    closeDialog(); $("plate").classList.add("hidden"); $("pauseBtn").classList.add("hidden"); $("streakChip").classList.add("hidden");
    chrome(true); $("factText").textContent = ""; odoNow($("scLevel"), 0); updateHud();
    showIntro(nextQuestion);
  }
  function showIntro(cb) {
    const L = lv(), el = $("intro");
    el.className = "";
    if (S.run) el.innerHTML = A.adv.introHtml(L); else
    el.innerHTML = `<div class="intro-in"><div class="intro-num">${pad2(S.level + 1)}</div><div class="intro-body">
      <span class="tag">${L.bonus ? A.t("intro.bonus") : A.t("kind." + L.kind)}</span><h2>${A.tx(L.name)}</h2>
      <p>${A.t("intro.q", { n: S.qs.length })} · ${A.t("intro.t", { s: L.secText || L.seconds })}${L.advance > 1 ? " · " + A.t("intro.goal", { a: A.fmt(L.advance) }) : ""}</p></div></div>`;
    A.sfx.intro(); map.animateTo(map.home(), 1100);
    const tok = (S.introTok = (S.introTok || 0) + 1);                 // si llega otra intro (reinicio, abandono, otra partida), los temporizadores de esta ya no hacen nada
    let done = false, ms = S.run ? (L.boss ? 4200 : 3300) : 2600, talking = false, timeUp = false;
    /* la intro no se cierra sola mientras el crupier habla: espera a su ultima frase y a su segundo de mas, aunque vaya con retraso
       (antes un tope de 11 s le cortaba a media frase). Un clic o una tecla la saltan igual. */
    if (S.run && A.adv.introReady) { const need = A.adv.introReady(L, () => { talking = false; if (timeUp) end(); }) || 0; talking = need > 0; ms = Math.max(ms, 1200 + need); }
    const end = () => { if (done || tok !== S.introTok) return; done = true; el.onclick = null; if (S.run && A.adv.introEnd) A.adv.introEnd(); el.classList.add("out"); setTimeout(() => { if (tok !== S.introTok) return; el.classList.add("hidden"); cb(); }, 430); };
    S.skipIntro = end; el.onclick = end; setTimeout(() => { timeUp = true; if (!talking) end(); }, ms); setTimeout(end, ms + 15000);   // red de seguridad: nunca se queda colgada
  }
  function nextQuestion() {
    S.phase = "asking"; S.paused = false; S.tense = false; S.limit = (!S.run && q() && q().tpq) || lv().seconds; S.t0 = performance.now(); S.pausedAcc = 0; S.lastTick = -1; S.lastTimeStr = "";
    map.clearMarks(); map.animateTo(map.home(), 800); map.setPick(true); A.music.mode(1);
    closeDialog(); setPrompt(); setTimer(S.limit);
    $("plate").classList.remove("hidden", "hurry"); $("pauseBtn").classList.remove("hidden"); $("factText").textContent = "";
    if (S.run) A.adv.onQuestion();
    updateHud();
    if (document.hidden && !S.paused) togglePause();                        // la intro acabo con la pestana oculta: la pregunta empieza en pausa
  }
  /* efectos del clic: pin que cae, ondas y chispas donde pulsas */
  let lastPtr = { x: innerWidth / 2, y: innerHeight / 2 };
  document.addEventListener("pointerdown", e => { lastPtr = { x: e.clientX, y: e.clientY }; }, true);
  function pingFx(x, y, kind) {
    if (S.reduce) return; const el = document.createElement("div"); el.className = "ping " + (kind || "");
    el.style.left = x + "px"; el.style.top = y + "px";
    let h = "<i></i><i></i><i></i>"; for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + Math.random() * 0.4, d = 34 + Math.random() * 46; h += `<u style="--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px;--r:${Math.random() * 360}deg"></u>`; }
    el.innerHTML = h; $("app").appendChild(el); setTimeout(() => el.remove(), 900);
  }
  /* la pantalla entera tiembla con cada jackpot de la Enciclopedia, de menos a mas: 1 flojo (<=300 km), 2 mas (<=150), 3 bastante mas (<=75).
     Nunca sale igual: cada temblor toma una direccion al azar (a mas de ~60 grados de la anterior), abre su propia elipse, gira hacia
     un lado u otro y rebota como un muelle que se apaga, con fuerza, ritmo y duracion un pelin distintos. Se apaga con Vibracion = no
     o con "reducir movimiento" */
  const SHAKE = [
    { a: 3, r: 0, ms: 300, k: 4, ease: "ease-out" },
    { a: 6.5, r: 0.15, ms: 420, k: 6, ease: "ease-out" },
    { a: 13, r: 0.45, ms: 640, k: 8, ease: "cubic-bezier(.36, .07, .19, .97)" },
  ];
  let jpAnim = null, jpAng = Math.random() * Math.PI * 2;
  function jpShake(n) {
    if (!S.shake || S.reduce || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const P = SHAKE[n - 1], rnd = (a, b) => a + Math.random() * (b - a);
    jpAng += rnd(1.1, 5.2);
    const k = P.k + (Math.random() < 0.5 ? 0 : 1), turn = Math.random() < 0.5 ? -1 : 1, oval = rnd(0.25, 0.55), frames = [{ transform: "none", offset: 0, easing: P.ease }];
    for (let i = 0; i < k; i++) {
      const f = Math.pow(1 - i / k, 1.35) * rnd(0.82, 1.12), s = i % 2 ? -1 : 1, along = s * P.a * f, side = P.a * f * oval * rnd(-1, 1);
      const x = along * Math.cos(jpAng) - side * Math.sin(jpAng), y = along * Math.sin(jpAng) + side * Math.cos(jpAng);
      frames.push({ transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${(s * turn * P.r * f).toFixed(3)}deg)`, offset: (i + 0.6 + rnd(-0.2, 0.2)) / (k + 0.6), easing: P.ease });
    }
    frames.push({ transform: "none", offset: 1 });
    if (jpAnim) jpAnim.cancel();
    jpAnim = document.documentElement.animate(frames, { duration: P.ms * rnd(0.92, 1.1) });
  }
  function coinFx(n) {
    if (S.reduce || !n) return; const to = $("abCoins") && $("abCoins").getBoundingClientRect(); if (!to) return;
    for (let k = 0; k < Math.min(n, 8); k++) setTimeout(() => {
      const c = document.createElement("div"); c.className = "coin-fly"; c.innerHTML = A.icon("coin"); c.style.left = lastPtr.x + "px"; c.style.top = lastPtr.y + "px";
      c.style.setProperty("--dx", to.left + to.width / 2 - lastPtr.x + "px"); c.style.setProperty("--dy", to.top + to.height / 2 - lastPtr.y + "px"); $("app").appendChild(c);
      setTimeout(() => { c.remove(); A.sfx.coin(k / 6); }, 720);
    }, 900 + k * 90);
  }
  function onPick(lon, lat) {
    if (S.phase !== "asking" || S.paused) return;
    if (performance.now() - S.t0 < 350) return;                             // doble clic en "Siguiente": el segundo clic caia en el mapa y respondia la pregunta nueva sin verla
    if (performance.now() - (S.probeAt || 0) < 600) return;                 // doble clic al lanzar una sonda (Windows admite hasta 500 ms entre clics): el segundo respondia la pregunta
    const ef = A.pointer && A.pointer.effective && A.pointer.effective(), at = ef ? { x: ef[0], y: ef[1] } : lastPtr;   // el destello sale donde cae el pin (con el cursor invertido, con retraso o con viento no es donde esta el raton)
    if (S.run && S.tool) { pingFx(at.x, at.y, "probe"); A.adv.probe(lon, lat); return; }
    if (S.run && !ef) ({ lon, lat } = A.adv.adjust(lon, lat));   // con puntero propio, el viento ya lo ha movido
    if (S.run && A.adv.reBall && A.adv.reBall(lon, lat)) { pingFx(at.x, at.y, "probe"); return; }   // Segunda bola: este clic no cuenta
    pingFx(at.x, at.y); A.sfx.tap(); A.sfx.pin(S.streak);
    reveal({ lon, lat }, Math.max(0, S.limit - (performance.now() - S.t0 - S.pausedAcc) / 1000));
  }
  /* pista de la Enciclopedia en el ticket: los umbrales de ESTA pregunta (x2 en mares, naturaleza y estrechos) y en millas si toca;
     la frase traducida trae 300/150/75 con su unidad (km, 公里, км) y aqui se sustituyen */
  const cxTip = o => {
    const lim = A.codexLimits && o.cid ? A.codexLimits({ id: o.cid[0], cids: o.cid }) : [300, 150, 75], mi = S.units === "mi";
    return A.T("Enciclopedia: a menos de 300 km desbloqueas el lugar, a menos de 150 km su historia y a menos de 75 km su dato clave.", "Encyclopedia: within 300 km you unlock the place, within 150 km its history and within 75 km its key fact.")
      .replace(/(?<!\d)(300|150|75)(\s*)(km|公里|км)/g, (m, n, sp, u) => { const v = lim[[300, 150, 75].indexOf(+n)]; return mi ? fmtKm(v) : A.fmt(v) + sp + u; });
  };
  const padForDialog = () => { return window.innerWidth > 900 ? { l: 60, r: 410, t: 170, b: 130 } : { l: 30, r: 30, t: 240, b: 410 }; };   // (mapa 2D de respaldo)

  /* ------------------------------------------------------------ revelado (v0.2.15): bandera del acierto, rumbo del fallo, tu chincheta y encuadre */
  /* banderas pixel de la respuesta (las 199 de la Enciclopedia, assets/flags/p): un pais, la suya; un lugar, la de su pais o sus dos paises
     (data/paises-lugares.js); en el Clasico, cuyos lugares no traen pais, la del pais donde cae el punto (no en mares, naturaleza ni estrechos).
     Mares y oceanos no llevan */
  const FLAG_ALIAS = { Ireland: "Republic of Ireland" };
  let NE_EN = null, EN_LOC = null;
  const neEn = ne => { if (!NE_EN) { NE_EN = {}; (A.PLACES || []).forEach(r => { if (r[1] === "country") NE_EN[r[0].slice(2)] = r[6].en; }); } return NE_EN[ne]; };
  const flagKey = en => (!en || !A.FLAGS ? null : A.FLAGS[en] ? en : A.FLAGS[FLAG_ALIAS[en]] ? FLAG_ALIAS[en] : null);
  const locCountry = en => { if (!EN_LOC) { EN_LOC = {}; Object.values(A.PCOUNTRY || {}).forEach(n => { if (n && n.en) EN_LOC[n.en] = n; }); } return EN_LOC[en] ? A.tx(EN_LOC[en]) : en; };
  function flagsOf(o) {
    if (!o) return [];
    if (!o._fl) {
      let list = o.cEn || [];
      if (!o.cEn && o.t === "c") list = [neEn(o.key)];
      else if (!o.cEn && o.lat != null && (o.kf || 1) === 1 && A.pointer.featureAt) { const f = A.pointer.featureAt(o.lon, o.lat); if (f) list = [neEn(f.name)]; }
      o._fl = [...new Set(list.map(flagKey).filter(Boolean))].slice(0, 2);
    }
    return o._fl;
  }
  const flagSrc = en => `assets/flags/p/${A.mediaKey(en)}.webp`;
  const FLAG_IMG = new Map();
  const flagImg = en => {
    let im = FLAG_IMG.get(en);
    if (!im) { im = new Image(); im.decoding = "async"; im.onload = () => { if (im.decode) im.decode().catch(() => {}); const go = () => { if (map.prepFlag) map.prepFlag(im); }; window.requestIdleCallback ? requestIdleCallback(go, { timeout: 400 }) : setTimeout(go, 50); }; im.src = flagSrc(en); FLAG_IMG.set(en, im); }   // la onda de la tela se prepara en un rato libre (js/map.js)
    return im;
  };
  let preUi = false;
  const preFlags = () => {
    try { flagsOf(q()).forEach(flagImg); } catch (e) { /* sin bandera */ }
    if (!preUi) { preUi = true; ["assets/icons/a_flame_s.webp", "assets/flags/p/_hueco.webp"].forEach(u => { const im = new Image(); im.src = u; if (im.decode) im.decode().catch(() => {}); }); }   // la llama y el hueco del ticket, decodificados antes del primer revelado
  };   // al empezar la pregunta: al revelar ya esta lista para el mapa
  /* rumbo de tu chincheta visto desde el objetivo (en un pais o una masa de agua f, desde su punto de borde mas cercano), en 8 sectores: 0 norte, 1 noreste, 2 este... */
  function dirOf(o, g, f) {
    let la0 = o.lat, lo0 = o.lon;
    if (f) {
      const cl = Math.cos((g.lat * Math.PI) / 180); let best = Infinity;
      for (const p of f.polys) for (const ring of p.rings) for (const [lo, la] of ring) { const dx = ((((lo - g.lon) % 360) + 540) % 360 - 180) * cl, dy = la - g.lat, d = dx * dx + dy * dy; if (d < best) { best = d; lo0 = lo; la0 = la; } }
    }
    const R = Math.PI / 180, dl = (g.lon - lo0) * R, y = Math.sin(dl) * Math.cos(g.lat * R), x = Math.cos(la0 * R) * Math.sin(g.lat * R) - Math.sin(la0 * R) * Math.cos(g.lat * R) * Math.cos(dl);
    return Math.round((((Math.atan2(y, x) / R) + 360) % 360) / 45) % 8;
  }
  /* lo que tapa el HUD en el lienzo del mapa al revelar (px): placa, mochila, herramientas, nota de campo, dock, el marcador con el ticket ya
     desplegado (aunque aun este bajando) y el crupier; si no ha salido, el hueco de su retrato, porque suele asomar a comentar la respuesta */
  function revealObs() {
    const cv = map.cv.getBoundingClientRect(), out = [];
    const add = (r, p = 12) => { if (r && r.width > 1 && r.height > 1) out.push([r.left - cv.left - p, r.top - cv.top - p, r.right - cv.left + p, r.bottom - cv.top + p]); };
    for (const id of ["plate", "advBar", "toolBar", "note", "dock"]) { const e = $(id); if (e && e.getClientRects().length) add(e.getBoundingClientRect()); }
    if (A.marcador.docked()) add(A.marcador.finalRect());
    else { const sr = A.marcador.sheetRect(); if (sr) add(sr); else out.push([0, cv.height - Math.min(cv.height * 0.62, 440), cv.width, cv.height]); }   // ventana estrecha: la hoja del ticket, donde de verdad esta
    const d = $("dealer"), sz = innerWidth > 720 ? 320 : 170;
    const n0 = out.length;                                                 // el crupier es un obstaculo blando (su globo se va solo): si no deja hueco, se ignora
    if (d && d.classList.contains("in") && d.getClientRects().length) add(d.getBoundingClientRect(), 6);
    else if (S.run && A.dealer && A.dealer.on) add({ left: cv.left + 16, top: cv.bottom - 112 - sz, right: cv.left + 16 + sz, bottom: cv.bottom - 112, width: sz, height: sz }, 0);
    if (out.length > n0) out[n0].push(1);
    return out;
  }
  /* racha rota: la caja roja suelta unas esquirlas de pixel al agrietarse */
  function shards() {
    if (S.reduce || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const m = document.querySelector(".tk-eq .m"), app = $("app"); if (!m || !app) return;
    const r = m.getBoundingClientRect(), ar = app.getBoundingClientRect(); if (!r.width) return;
    for (let i = 0; i < 7; i++) {
      const s = document.createElement("i"); s.className = "tk-shard" + (i % 3 ? "" : " d");
      s.style.left = Math.round(r.left - ar.left + r.width * (0.18 + Math.random() * 0.64)) + "px"; s.style.top = Math.round(r.top - ar.top + r.height * (0.25 + Math.random() * 0.5)) + "px"; app.appendChild(s);
      const dx = (Math.random() - 0.5) * 110, up = 10 + Math.random() * 18, dy = 40 + Math.random() * 60, rot = (Math.random() - 0.5) * 340;
      s.animate([{ transform: "translate(0, 0) rotate(0deg)", opacity: 1 }, { transform: `translate(${dx * 0.45}px, ${-up}px) rotate(${rot * 0.35}deg)`, opacity: 1, offset: 0.28 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 }], { duration: 640 + Math.random() * 220, easing: "cubic-bezier(.3, .6, .6, 1)", fill: "forwards" }).onfinish = () => s.remove();
      setTimeout(() => s.remove(), 1200);
    }
  }

  function reveal(guess, left) {
    S.phase = "reveal"; map.setPick(false); S.tense = false; A.music.mode(1); if (S.run) A.chal.reveal();
    const o = q(), L = lv(), af = A.waters && A.waters.of(o), isC = o.t === "c" || !!af, prevStreak = S.streak || 0;      // af: masa de agua (mar, oceano, lago): se acierta dentro, como un pais, y se dibuja su territorio
    let km = null, ans = null, span = [], labelAt = null;
    if (af) {
      span = [[af.bbox[0], af.bbox[1]], [af.bbox[2], af.bbox[3]]]; labelAt = [o.lon, o.lat];
      if (guess) km = A.geo.distToFeature(guess.lon, guess.lat, af);
    } else if (isC) {
      const f = world.byName[o.key];
      const big = f.polys.reduce((a, b) => ((b.bbox[2] - b.bbox[0]) * (b.bbox[3] - b.bbox[1]) > (a.bbox[2] - a.bbox[0]) * (a.bbox[3] - a.bbox[1]) ? b : a));
      span = [[big.bbox[0], big.bbox[1]], [big.bbox[2], big.bbox[3]]]; labelAt = [(big.bbox[0] + big.bbox[2]) / 2, (big.bbox[1] + big.bbox[3]) / 2];
      if (guess) km = A.geo.distToFeature(guess.lon, guess.lat, f);
    } else {
      ans = [o.lon, o.lat]; span = [ans];
      if (guess) km = A.geo.haversine(guess.lat, guess.lon, o.lat, o.lon);
    }
    let sc, chips, mult, total, adv = null;
    const lim = A.codexLimits && o.cid ? A.codexLimits({ id: o.cid[0], cids: o.cid }) : [300, 150, 75];   // 300/150/75 km (x2 en mares y naturaleza): anillos, jackpots, acierto y veredicto
    if (S.run) {                                                   // Aventura: reliquias, jefes y fichas x mult
      adv = A.adv.score(o, guess ? km : null, left, false); sc = adv.sc; S.streak = adv.streak; chips = adv.chips; mult = adv.mult * adv.xmult; total = adv.total;
      const lt = map.lastTap; map.lastTap = null;                                  // el crupier compara tu mano de verdad con el pin (solo lo comenta)
      adv.guess = guess || null;
      if (guess && lt && performance.now() - lt.at < 1500) { const d = ll => (isC ? A.geo.distToFeature(ll[0], ll[1], af || world.byName[o.key]) : A.geo.haversine(ll[1], ll[0], o.lat, o.lon)); try { adv.hand = { raw: d(lt.raw), plain: d(lt.plain) }; } catch (e) { adv.hand = null; } }
      A.adv.afterQuestion(adv); if (adv.bank && adv.bank.pt) span = span.concat([adv.bank.pt]);
    } else {
      sc = guess ? L.score(o, km, left) : { dist: 0, time: 0, distMax: 1, timeMax: 1 };
      S.streak = guess && km <= lim[0] ? S.streak + 1 : 0;
      /* el Clasico tiene su propia puntuacion (data/campaigns.js) */
      chips = sc.dist + sc.time;
      mult = 1;
      total = Math.round(chips * mult);
    }
    const ratio = sc.dist / sc.distMax;
    if (guess && ratio >= 0.75) S.hits++;
    S.levelScore += total; S.runMax += L.maxPerQ;
    A.profile.question({ km: guess ? km : null, inside: !!(guess && isC && !af && km === 0), area: !!(guess && af && km === 0), ratio, streak: S.streak, left, limit: S.limit, timeout: !guess });

    const tier = !guess ? 5 : isC && km === 0 ? 4 : km <= lim[2] ? 4 : km <= lim[1] ? 3 : km <= lim[0] ? 2 : km <= 2 * lim[0] ? 1 : 0;   // veredicto = los anillos: <=75 oro, <=150 plata, <=300 bronce
    const title = !guess ? A.t("res.timeout") : isC && km === 0 ? A.t("res.inside") : A.t(["res.t5", "res.t4", "res.t3", "res.t2", "res.t1"][tier]);
    const cxr = guess ? A.codexUnlock(o, km) : { added: [], level: 0 };
    /* Enciclopedia: 1, 2 o 3 jackpots segun el nivel, en cuanto el total termina de rodar. Con cada uno tiembla la pantalla (mas cuanto
       mas cerca) y vibra el movil, y las casillas del ticket se encienden al mismo ritmo. Si ya has pasado a la siguiente pregunta, no empiezan */
    const JP_AT = 1850, JP_MS = Math.round(A.audio.jpGap * 1000), jpTok = S.jpTok = (S.jpTok || 0) + 1, jpAt = i => JP_AT + i * JP_MS + "ms";
    const still = () => S.jpTok === jpTok && S.phase === "reveal";          // sigue en pantalla este ticket (si ya has pasado, sus sonidos no pisan la pregunta siguiente)
    /* v0.2.15: acierto = la misma regla que la racha (<= 300 km, el anillo exterior). Te llevas la bandera: en el mapa se iza en el sitio
       (FLAG_AT, con su corneta) y en el ticket va junto al nombre; si fallas, el mastil se queda vacio. T_SLAM: golpe de la caja de la racha */
    const hit = !!guess && (adv ? adv.hit : km <= lim[0]), fl = flagsOf(o), up = hit && fl.length > 0, FLAG_AT = 650, T_SLAM = 1300;
    const label = o.clue ? A.tx(o.answer) : A.tx(o.name);
    /* tu chincheta, por el camino corto: si cruza el antimeridiano (Fiyi y Samoa) se dibuja en la copia del mundo junto al objetivo */
    const refLon = ans ? ans[0] : labelAt ? labelAt[0] : null, gLon = guess ? (refLon == null ? guess.lon : guess.lon + 360 * Math.round((refLon - guess.lon) / 360)) : null;
    map.setMarks({
      guess: guess ? [gLon, guess.lat] : null, answer: ans, highlight: isC && !af ? o.key : null, area: af || null, label, labelAt,
      dist: guess && km > 0 ? fmtKm(km) : "", pop: total ? "+" + A.fmt(total) : null,
      flags: up ? fl.map(flagImg) : null,
      rings: guess && !isC ? { r: lim, n: cxr.level, at: [0, 1, 2].map(i => JP_AT + i * JP_MS) } : null,   // anillos 300/150/75 km: se encienden con los jackpots
    });
    if (adv && adv.bank && adv.bank.pt) { const bq = S.qi; map.setDecoys([{ lon: adv.bank.pt[0], lat: adv.bank.pt[1], bank: adv.bank.s, bankLabel: A.tx(A.chal.tl("ui_bank")).toUpperCase() + " +" + A.fmt(adv.bank.s), t0: performance.now() + 900, a: 1 }]); setTimeout(() => { if (S.phase === "reveal" && S.qi === bq && A.sfx.bankPin) A.sfx.bankPin(); }, 1500); }   // la chincheta de la banca cae despues de la tuya
    const fC = isC ? world.byName[o.key] : null;
    const fpts = (isC ? span.slice(0, 2).map(p => [p[0], p[1], fC && fC.ct]) : [[ans[0], ans[1]]]).concat(span.slice(isC ? 2 : 1).map(p => [p[0], p[1]]), guess ? [[gLon, guess.lat, map.pickCt]] : []);

    setTimeout(() => { if (still()) A.sfx.reveal(tier); }, 480);
    if (up) setTimeout(() => { if (still() && A.sfx.flag) A.sfx.flag(fl.length); }, FLAG_AT);
    if (cxr.level) setTimeout(() => {
      if (!still()) return;
      A.sfx.jackpot(cxr.level); A.haptic.jackpot(cxr.level);
      for (let k = 1; k <= cxr.level; k++) setTimeout(() => jpShake(k), (k - 1) * JP_MS);
    }, JP_AT);
    if (adv && adv.coins) coinFx(adv.coins);
    /* la caja de la racha (Aventura y Reto diario): "on" se enciende o sube de nivel, "broken" se agrieta (perdiste una racha de 2 o mas), "off" se queda
       apagada a x1. En el Clasico la racha no multiplica: solo cuenta (fila RACHA) */
    const eq = S.run ? (mult > 1 ? "on" : prevStreak >= 2 && !S.streak ? "broken" : "off") : null;
    const broke = eq === "broken" || (!S.run && prevStreak >= 2 && !S.streak);
    setTimeout(() => {
      if (!still()) { if (S.phase === "asking") setStreak(); return; }
      if (eq === "on" || (!S.run && S.streak >= 2)) { A.sfx.streak(S.streak); if (mult > 1 && !S.reduce && S.shake) { const ap = $("app"); ap.classList.remove("shake"); A.restyle(ap); ap.classList.add("shake"); } }
      else if (broke) { if (A.sfx.streakBreak) A.sfx.streakBreak(); if (eq) shards(); }
      setStreak();
    }, T_SLAM);

    const last = S.qi === S.qs.length - 1 || (S.run && A.adv.infDone && A.adv.infDone());
    const showKm = guess && !(isC && km === 0);
    /* cabecera: la bandera (o el mastil vacio), el veredicto y el lugar como en la placa de la pregunta (nombre y, en verde, su pais) */
    const cn = (o.cEn || []).map(locCountry).join(" · "), pName = o.clue ? A.tx(o.answer) : A.tx(o.name), pSub = isC ? "" : o.clue ? cn : A.tx(o.sub) || cn;   // en las pistas, o.sub son las casillas de la respuesta
    const flagSlot = fl.length ? `<div class="tk-flag${up ? " up" : ""}${fl.length > 1 ? " two" : ""}" style="--fh:${FLAG_AT}ms">${fl.map((en, i) => `<i style="--fi:${i}"><img class="p" src="${flagSrc(en)}" alt="" draggable="false">${up ? `<img class="c" src="${flagSrc(en)}" alt="" draggable="false">` : `<img class="h" src="assets/flags/p/_hueco.webp" alt="" draggable="false">`}</i>`).join("")}</div>` : "";
    /* rumbo del fallo ("Demasiado al oeste") y el pais donde cayo tu chincheta: en verde si es el bueno, en rojo si no */
    const dirTxt = showKm && km >= 10 ? A.t("res.dir").split("|")[dirOf(o, guess, af || (o.t === "c" && world.byName[o.key]))] || "" : "";
    const pinF = showKm && A.pointer.featureAt ? A.pointer.featureAt(guess.lon, guess.lat) : null;
    const pinCls = !pinF ? "sea" : fl.includes(flagKey(neEn(pinF.name))) ? "ok" : "bad";
    const pinTxt = showKm ? A.t("res.pin", { p: `<b>${pinF ? A.pointer.nameOf(pinF) : A.t("res.sea")}</b>` }) : "";
    /* la ecuacion: PUNTOS x RACHA. La caja roja muestra antes del golpe como venia la racha y despues como queda */
    let eqHtml = "";
    if (eq) {
      const step = adv && adv.streakStep != null ? adv.streakStep : 0.2, sm = n => 1 + (n >= 2 ? Math.min(1.5, step * (n - 1)) : 0), lvOf = n => (n >= 6 ? 3 : n >= 4 ? 2 : 1);
      const lb = n => (n >= 1 ? A.t("res.streak") + " " + n : A.t("res.nostreak")), fire = (k, lv) => `<i class="fire ${k}" data-lv="${lv}"><b></b><b></b><b></b></i>`;
      const from = prevStreak >= 2 && eq !== "off" ? { lit: 1, lb: lb(prevStreak), v: "×" + A.fmt1(sm(prevStreak)), lv: lvOf(prevStreak) } : { lit: 0, lb: lb(eq === "on" ? prevStreak : S.streak), v: "×1" };
      const to = eq === "on" ? { lit: 1, lb: lb(S.streak), v: "×" + A.fmt1(mult), lv: lvOf(S.streak) } : eq === "broken" ? { lit: 0, lb: A.t("res.broken"), v: "×1" } : from;
      const two = to !== from, lg = t => (String(t).length > 12 ? " lg" : ""), sw = (a, b) => (two ? `<em class="a${lg(a)}">${a}</em><em class="b${lg(b)}">${b}</em>` : `<em class="${lg(b)}">${b}</em>`);   // lg: etiqueta larga ("Sequência quebrada"): a dos lineas
      eqHtml = `<div class="tk-eq e-${eq}${from.lit ? " f-lit" : ""}${to.lit ? " t-lit" : ""}" style="--sl:${T_SLAM}ms">
        <div class="c"><span>${A.t("res.chips")}</span><b class="odo" id="eqChips"></b></div><i class="x">×</i>
        <div class="mw">${from.lit ? fire("f0", from.lv) : ""}${to.lit ? fire("f1", to.lv) : ""}<div class="m"><span>${sw(from.lb, to.lb)}</span><b>${sw(from.v, to.v)}</b>${eq === "broken" ? `<small>${A.t("res.was2", { m: A.fmt1(sm(prevStreak)) })}</small><i class="crk"></i>` : ""}</div></div>
      </div>`;
    }
    const srow = !S.run && (S.streak >= 2 || broke) ? `<div class="tk-srow${broke ? " off" : ""}" style="--i:2"><dt>${A.t("res.streak")}</dt><i></i><dd>${broke ? `<s>${prevStreak}</s> 0` : S.streak}</dd></div>` : "";
    const tkHtml = `<div class="sheet ticket tk2${up ? " tk-up" : ""}${eq ? " tk-eqon" : ""}">
      <div class="tk-band"><span>${S.run && A.adv.isInfinite && A.adv.isInfinite() ? A.t("ask.inf", { n: pad2(S.qi + 1) }) : A.t("ask.no", { n: pad2(S.qi + 1), m: pad2(S.qs.length) })}</span><span class="tag">${A.t("kind." + (o.clue ? "clue" : o.kind || L.kind))}</span></div>
      <div class="tk-head${fl.length ? "" : " nf"}">${flagSlot}<div class="tk-id"><div class="tk-title">${title}</div><div class="tk-place">${o.clue ? `<span>${A.t("res.was")}</span>` : ""}<b>${pName}</b>${pSub ? `<em>${pSub}</em>` : ""}</div></div></div>
      ${showKm ? `<div class="tk-km"><span class="odo" id="kmNum"></span><span>${S.units === "mi" ? "mi" : "km"}</span></div>` : ""}
      <div class="tk-from">${[dirTxt, guess ? A.t("res.clicked", { t: A.fmt1(S.limit - left) }) : ""].filter(Boolean).join(" · ")}</div>
      ${pinTxt ? `<div class="tk-pin ${pinCls}">${pinTxt}</div>` : ""}
      <div class="tk-perf"></div>
      <dl class="tk-rows">
        <div style="--i:0"><dt>${A.t("res.dist")}</dt><i></i><dd>+${A.fmt(sc.dist)}</dd></div>
        <div style="--i:1"><dt>${A.t("res.speed")}</dt><i></i><dd>+${A.fmt(sc.time)}</dd></div>
        ${srow}
      </dl>
      ${adv && adv.lines.length ? `<div class="tk-perks">${adv.lines.map(l => `<div><span>${A.icon(l[0])}</span><i>${l[1]}</i><b>${l[2]}</b></div>`).join("")}</div>` : ""}
      ${eqHtml}
      <div class="tk-total"><span>${A.t("res.total")}</span><span class="odo" id="totNum"></span></div>
      ${adv && adv.coins ? `<div class="tk-coins">${A.icon("coin", "cn")}+${adv.coins} ${adv.coins === 1 ? A.pick6("doblón|doubloon|doublon|dobrão|Dublone|doblone||枚金币|도블론|ダブロン|дублон|dublon") : A.T("doblones", "doubloons")}</div>` : ""}
      ${guess ? `<div class="tk-cx l${cxr.level}" data-tt="${A.t("codex.title")}
${cxTip(o)}"><span>${A.t("codex.title")}</span><i>${[0, 1, 2].map(i => `<u style="--jd:${jpAt(i)}"></u>`).join("")}</i><b style="--jd:${jpAt(Math.max(0, cxr.level - 1))}">${cxr.added.length ? "+" + cxr.added.length : cxr.level ? "" : "&gt;" + fmtKm(A.codexLimits && o.cid ? A.codexLimits({ id: o.cid[0], cids: o.cid })[0] : 300)}</b></div>` : ""}
      <button class="btn-ink" id="nextBtn" data-primary><span>${!last ? A.t("btn.next") : S.run ? A.pick6("Terminar ronda|Finish round|Terminer la manche|Concluir rodada|Runde beenden|Termina il round||结束本回合|라운드 종료|ラウンドを終了|Завершить раунд|Zakończ rundę") : A.t("btn.finish")}</span><span class="ar">${A.icon("u_next", "sm")}</span> <kbd>${A.icon("u_enter", "sm")}</kbd></button>
    </div>`;
    $("factText").textContent = factLine(o);
    $("plate").classList.remove("hurry");
    /* el cobro: los puntos del ticket suben al marcador al compas de su TOTAL (700 + 1100 ms); la barra llega en 450 ms y, si cruza la meta
       o un escalon de botin, lo celebra (js/marcador.js) */
    const cash = { from: S.levelScore - total, to: S.levelScore, total, delay: 700, ms: 1100, gauge: 450 };
    /* v0.2.15: el ticket se monta en el fotograma siguiente. La puntuacion, las marcas y los sonidos van en esta tarea y el ticket (maquetarlo es lo mas
       caro) en la otra: asi ninguna se come un fotograma entero (con la CPU a x4 el revelado era una sola tarea de ~50 ms) */
    requestAnimationFrame(() => {
      if (!still()) return;
      dialog(tkHtml, "side");
      if (showKm) { const kmEl = $("kmNum"); odoNow(kmEl, 0); requestAnimationFrame(() => odoSet(kmEl, Math.round(S.units === "mi" ? km / 1.609344 : km), { ms: 1100, delay: 560 })); }
      /* el total: con racha, primero cuenta los PUNTOS y, con el golpe de la caja roja, sube por el multiplicador (como en Balatro); sin ella, de una vez.
         Las cifras del marcador van aparte, al mismo compas de siempre (700 + 1100 ms) */
      const totEl = $("totNum"), eqC = $("eqChips"); odoNow(totEl, 0);
      if (eqC) { odoNow(eqC, 0); requestAnimationFrame(() => odoSet(eqC, chips, { ms: 560, delay: 700 })); }
      if (eq === "on") {
        requestAnimationFrame(() => odoSet(totEl, chips, { ms: 560, delay: 700, tick: chips > 0 }));
        setTimeout(() => { if (still() && totEl.isConnected) odoSet(totEl, total, { ms: 470, delay: 30, tick: true }); }, T_SLAM);
      } else requestAnimationFrame(() => odoSet(totEl, total, { ms: 1100, delay: 700, tick: total > 0 }));
      $("nextBtn").onclick = () => { last ? finishLevel() : (S.qi++, nextQuestion()); };
      updateHud(cash);
      A.marcador.cashIn({ ...cash, advance: L.advance, runTotal: S.runTotal, lootOn: !!(S.run && S.camp.mode === "adventure" && !(A.adv.isInfinite && A.adv.isInfinite())) });
      /* un fotograma despues: las muescas del ticket y el encuadre (tu chincheta y el objetivo en el hueco libre de verdad, con el ticket ya montado,
         la nota escrita y el crupier en su sitio) */
      requestAnimationFrame(() => {
        if (!still()) return;
        const sh = document.querySelector("#dlg .sheet"), pf = sh && sh.querySelector(".tk-perf"); if (pf) sh.style.setProperty("--n", pf.offsetTop + 1 + "px");
        if (map.frameReveal) map.frameReveal(fpts, revealObs(), { l: 70, r: 70, t: up ? 122 : 86, b: 34 }, 1100);
        else map.fitPoints(fpts.map(p => [p[0], p[1]]), padForDialog(), 1100);
      });
    });
  }

  /* ------------------------------------------------------------ veredictos */
  function verdict({ kind, level, tag, title, text, stats, stamp, stampSub, iq, tier, tierName, buttons, art, lines }) {
    const idc = iq != null ? `<div class="idcard">${tier != null ? A.icon("iq_" + tier) : `<img class="ic" src="assets/icons/logo_mark.png" alt="">`}<span>${A.t("iq.label")}</span><span class="odo" id="iqNum"></span><em>${tierName}</em></div>` : "";
    const chip = kind === "" ? "chip_r" : art === "chest" ? "chip_p" : kind === "win" ? "chip_b" : "chip_g";
    const medal = `<div class="v-medal ${kind}">
        <i class="v-medal-glow"></i>${art === "chest" ? `<i class="v-medal-crown">${A.icon("crown")}</i>` : ""}
        <i class="v-medal-chip">${A.icon(chip)}</i>
      </div>`;
    dialog(`<div class="vd">
      <div class="v-main">
        <span class="tag">${tag || A.t("v.level", { n: pad2(level) })}</span>
        <h2>${title}</h2><p>${text}</p>${lines && lines.length ? `<ul class="v-lines">${lines.map((l, i) => `<li${l[2] ? ' class="vl-perk' + (l[3] ? " vl-" + l[3] : "") + '"' : ""} style="animation-delay:${0.5 + i * 0.12}s"><span>${l[2] ? A.icon(l[2], "sm") : ""}${l[0]}</span><i></i><b>${l[1]}</b></li>`).join("")}</ul>` : ""}
        <div class="v-stats">${stats.map((s, i) => `<div><span>${s[0]}</span><span class="odo" id="vs${i}"></span></div>`).join("")}</div>
        <div class="v-actions">${buttons.map(b => `<button class="${b.cls}" id="${b.id}" ${b.primary ? "data-primary" : ""}><span>${b.label}</span>${b.arrow ? `<span class="ar">${A.icon("u_next", "sm")}</span>` : ""}</button>`).join("")}</div>
      </div>
      <div class="v-side">${medal}<div class="v-dealer" id="vdDealer"></div>${idc}</div>
    </div>`, "verdict");
    stats.forEach((s, i) => { const el = $("vs" + i); odoNow(el, 0); requestAnimationFrame(() => odoSet(el, s[1], { ms: 1300, delay: 700 + i * 120, tick: i === 0 && s[1] > 0 })); });
    if (iq != null) { const el = $("iqNum"); odoNow(el, 0); requestAnimationFrame(() => odoSet(el, iq, { ms: 1400, delay: 1000 })); }
    buttons.forEach(b => ($(b.id).onclick = b.onclick));
    if (A.dealer && A.dealer.on) A.dealer.anchor($("vdDealer"));                // el crupier habla dentro del veredicto, sin tapar botones
  }

  function finishLevel() {
    if (S.run) { map.clearMarks(); map.animateTo(map.home(), 900); map.setPick(false); $("plate").classList.add("hidden"); $("pauseBtn").classList.add("hidden"); $("factText").textContent = ""; $("streakChip").classList.add("hidden"); return A.adv.roundEnd(); }
    const levelPerfect = S.qs.length >= 5 && S.hits === S.qs.length;
    if (levelPerfect) { A.profile.get().stats.perfectRounds++; A.profile.save(); }
    A.ach.emit("level", { perfect: levelPerfect });
    const L = lv(), pass = S.levelScore >= L.advance, p = prog(S.camp.id); if (!pass) S.clean = false;
    map.clearMarks(); map.animateTo(map.home(), 900); map.setPick(false);
    $("plate").classList.add("hidden"); $("pauseBtn").classList.add("hidden"); $("factText").textContent = ""; $("streakChip").classList.add("hidden");
    S.phase = "levelEnd";
    if (pass) { S.runTotal += S.levelScore; S.completed++; p.unlocked = Math.max(p.unlocked, Math.min(S.camp.levels.length, S.level + 2)); }
    const shown = pass ? S.runTotal : S.runTotal + S.levelScore;
    const iq = A.computeIQ(shown / Math.max(1, S.runMax), S.completed, S.camp.levels.length);
    p.best = Math.max(p.best, shown); p.bestIq = Math.max(p.bestIq, iq); save();
    if (pass && S.level === S.camp.levels.length - 1) return endScreen(true, iq);
    if (pass) {
      A.sfx.stamp(); setTimeout(A.sfx.win, 380);
      verdict({
        kind: "ok", level: S.level + 1, title: A.t("v.ok"), text: `${A.tx(L.name)} — ${A.t("lc.p", { s: A.fmt(S.levelScore), a: A.fmt(L.advance) })}`,
        stats: [[A.t("v.points"), S.levelScore], [A.t("v.total"), S.runTotal], [A.t("v.iq"), iq]], stamp: A.t("stamp.ok"), stampSub: pad2(S.level + 1),
        buttons: [{ id: "nlBtn", cls: "btn-ink", label: A.t("btn.nextLevel"), arrow: true, primary: true, onclick: () => startLevel_(S.level + 1) }],
      });
    } else { A.sfx.stamp(); setTimeout(A.sfx.fail, 380); endScreen(false, iq); }
  }

  function endScreen(win, iq) {
    const L = lv(), tier = A.iqTier(iq), tierName = A.t("tier." + tier);
    const shown = win ? S.runTotal : S.runTotal + S.levelScore;
    if (S.camp.mode === "classic") {
      if (win) { A.profile.record("classic:" + S.camp.id + ":win", 1); const r = shown / Math.max(1, S.runMax); A.profile.medal(S.camp.id, r >= 0.85 ? "gold" : r >= 0.7 ? "silver" : "bronze"); A.ach.emit("classic", { win: true, clean: !!S.clean }); }
      if (S.ranked) A.rank.submit("classic-" + S.camp.id, { score: shown, extra: { win, lv: S.level + 1 } });
    }
    if (win) { A.sfx.stamp(); setTimeout(A.sfx.victory, 380); }
    const btns = [];
    if (!win) btns.push({ id: "retryBtn", cls: "btn-ink", label: A.t("btn.retry"), arrow: true, primary: true, onclick: () => { S.runMax = S.runMax0 || 0; startLevel_(S.level); } });   // el intento fallido deja de contar en el maximo: el IQ y la medalla miden la pasada buena (S.clean sigue en false: Sin red exige no fallar ninguno)
    btns.push({ id: "newBtn", cls: win ? "btn-ink" : "btn-line", label: A.t("btn.newGame"), primary: win, onclick: () => { S.startLevel = 0; showTitle(); } });
    btns.push({ id: "shareBtn", cls: "btn-line", label: A.t("share"), onclick: async () => {
      const text = A.t("share.text", { iq, tier: tierName, s: A.fmt(shown) }), url = A.shareUrl();
      try {
        if (navigator.share) await navigator.share({ title: "Geolite", text, url });
        else { await navigator.clipboard.writeText(text + " " + url); const sp = $("shareBtn").querySelector("span"); sp.textContent = A.t("share.copied"); setTimeout(() => (sp.textContent = A.t("share")), 1600); }
      } catch (e) { /* cancelado */ }
    } });
    btns.push({ id: "badgeBtn", cls: "btn-line", label: A.t("btn.badge"), onclick: async () => {
      const cv = await A.makeBadge(iq, tierName, `${A.tx(S.camp.title)} · ${A.fmt(shown)} ${A.t("pts")} · ${S.completed}/${S.camp.levels.length}`);
      const a = document.createElement("a"); a.download = `geolite-${iq}.png`; a.href = cv.toDataURL("image/png"); a.click();
    } });
    verdict({
      kind: win ? "win" : "", level: S.level + 1, title: win ? A.t("v.win") : A.t("v.no"),
      text: win ? A.t("win.p", { s: A.fmt(shown) }) : A.t("lf.p", { a: A.fmt(L.advance), s: A.fmt(S.levelScore) }),
      stats: win ? [[A.t("v.total"), shown]] : [[A.t("v.points"), S.levelScore], [A.t("v.goal"), L.advance]],
      stamp: win ? A.t("stamp.win") : A.t("stamp.no"), stampSub: win ? A.icon("u_star", "st") : pad2(S.level + 1), iq, tier, tierName, buttons: btns,
    });
    if (A.nombre) A.nombre.maybeAsk({ won: win });                          // v0.37: fin de tu primera partida sin nombre: el crupier te lo pregunta
  }

  /* ------------------------------------------------------------ pausa y reloj */
  /* menu de la partida (pausa): reanudar, guardar y salir, o empezar otra. Se abre desde el boton de pausa, con P/Esc o desde el Campamento */
  function closeVeil() { $("veil").classList.add("hidden"); $("veil").innerHTML = ""; }
  function veilMenu(onResume) {
    const adv = !!S.run || A.adv.active(), daily = adv && A.adv.isDaily(), v = $("veil"); v.classList.remove("hidden");
    /* intento del Reto diario: se guarda en su propia ranura y vuelve a su pantalla; no se "empieza otra", se termina aqui (cuenta lo que lleva) */
    const newLbl = daily ? A.pick6("Terminar el intento aquí|End the attempt here|Terminer l'essai ici|Encerrar a tentativa aqui|Versuch hier beenden|Chiudi qui il tentativo||在此结束本次尝试|여기서 도전 끝내기|ここで挑戦を終える|Закончить попытку здесь|Zakończ podejście tutaj") : A.T("Empezar una partida nueva", "Start a new run");
    v.innerHTML = `<div class="pv"><h2>${A.t("pause.h")}</h2>
      <p>${daily ? A.pick6("Tu intento se guarda solo. Puedes salir y continuarlo desde el Reto diario.|Your attempt saves itself. You can leave and pick it up again from the Daily challenge.|Ton essai s'enregistre tout seul. Tu peux partir et le reprendre depuis le Défi du jour.|Sua tentativa é salva sozinha. Você pode sair e continuá-la no Desafio diário.|Dein Versuch speichert sich selbst. Du kannst gehen und ihn in der Tagesherausforderung fortsetzen.|Il tuo tentativo si salva da solo. Puoi uscire e riprenderlo dalla Sfida giornaliera.||你的尝试会自动保存。可以离开，稍后在每日挑战中继续。|도전은 자동으로 저장됩니다. 나갔다가 일일 도전에서 이어서 할 수 있어요.|挑戦は自動で保存されます。抜けても、デイリーチャレンジから続きができます。|Попытка сохраняется сама. Можно выйти и продолжить её в Испытании дня.|Podejście zapisuje się samo. Możesz wyjść i dokończyć je w Wyzwaniu dnia.")
        : adv ? A.T("Tu expedición se guarda sola. Puedes salir y continuarla desde Aventura.", "Your expedition saves itself. You can leave and pick it up again from Adventure.") : A.t("pause.p")}</p>
      <div class="pv-btns"><button class="btn-ink" id="resBtn" data-primary><span>${A.t("btn.resume")}</span><span class="ar">${A.icon("u_next", "sm")}</span></button>
      ${adv ? `<button class="btn-line" id="saveExitBtn">${A.T("Guardar y salir al menú", "Save and exit to menu")}</button><button class="btn-line danger" id="newRunBtn">${newLbl}</button>`
            : `<button class="btn-line" id="exitBtn">${A.T("Salir al menú", "Exit to menu")}</button>`}</div></div>`;
    $("resBtn").onclick = onResume; $("resBtn").focus();
    const leave = to => { closeVeil(); if (adv) A.adv.leave(); S.paused = false; A.music.muffle(false); showTitle(to); };   // primero se guarda (con la pausa puesta): si no, el rato en el menu de pausa contaba como tiempo gastado y al volver la pregunta salia agotada
    if (adv) {
      const home = daily ? "daily" : "adventure";
      $("saveExitBtn").onclick = () => { A.sfx.ui(); leave(home); };
      let armed = false, tm = 0; const nb = $("newRunBtn");
      nb.onclick = () => {
        if (!armed) { armed = true; nb.classList.add("armed"); nb.textContent = daily ? A.pick6("¿Seguro? El intento se cierra con los puntos que llevas. Pulsa otra vez|Sure? The attempt closes with the points you have. Press again|Sûr ? L'essai se clôt avec tes points actuels. Appuie encore|Certeza? A tentativa fecha com os pontos que você tem. Aperte de novo|Sicher? Der Versuch endet mit deinen jetzigen Punkten. Nochmal drücken|Sicuro? Il tentativo si chiude con i punti che hai. Premi ancora|¿Seguro? El intento se cierra con los puntos que llevas. Presiona otra vez|确定吗？本次尝试将以当前分数结束。再按一次|정말요? 지금 점수로 도전이 끝나요. 한 번 더 누르세요|本当に？今の点数で挑戦が終わります。もう一度押して|Точно? Попытка закроется с нынешними очками. Нажми ещё раз|Na pewno? Podejście zamknie się z obecnymi punktami. Naciśnij jeszcze raz") : A.T("¿Seguro? Se pierde esta partida. Pulsa otra vez", "Sure? This run is lost. Press again"); A.sfx.deny(); tm = setTimeout(() => { armed = false; nb.classList.remove("armed"); nb.textContent = newLbl; }, 4000); return; }
        clearTimeout(tm); A.adv.abandon(); A.sfx.deny(); leave(home);
      };
    } else $("exitBtn").onclick = () => { A.sfx.ui(); leave(); };
  }
  function togglePause() {
    if (S.phase !== "asking") return;
    S.paused = !S.paused; A.sfx.pause(); A.music.muffle(S.paused);
    if (S.paused) { S.pauseAt = performance.now(); map.setPick(false); veilMenu(togglePause); }
    else { S.pausedAcc += performance.now() - S.pauseAt; map.setPick(true); closeVeil(); }
    if (S.run && A.dealer && A.dealer.notePause) A.dealer.notePause(S.paused);     // el crupier te espera en la pausa (js/dealer.js)
  }
  /* pestana oculta o ventana minimizada: la pregunta se pausa (antes el reloj seguia corriendo y al volver ya se habia agotado) */
  document.addEventListener("visibilitychange", () => { if (document.hidden && S.phase === "asking" && !S.paused) togglePause(); });
  function runMenu() {
    if (S.booting || !(S.run || S.camp || A.adv.active()) || S.phase === "title" || S.phase === "intro") return;
    if (S.phase === "asking") return togglePause();
    if (!$("veil").classList.contains("hidden")) return closeVeil();
    A.sfx.pause(); veilMenu(closeVeil);
  }
  (function clock() {
    if (S.phase === "asking" && !S.paused) {
      const left = S.limit - (performance.now() - S.t0 - S.pausedAcc) / 1000;
      setTimer(left);
      const c = Math.ceil(left);
      if (left > 0 && c <= 3 && c !== S.lastTick) { S.lastTick = c; A.sfx.tick(c); }
      if (left > 0 && left <= 3.2 && !S.tense) { S.tense = true; A.music.mode(2); }
      if (left <= 0) reveal(null, 0);
    }
    requestAnimationFrame(clock);
  })();

  /* ------------------------------------------------------------ controles */
  $("zoomIn").onclick = () => map.zoomBy(1.6);
  $("zoomOut").onclick = () => map.zoomBy(1 / 1.6);
  $("zoomHome").onclick = () => map.animateTo(S.camp ? map.home() : { ...map.home(), s: map.minS }, 600);
  $("pauseBtn").onclick = togglePause;
  function toggleFs() {
    const host = window.geoliteHost;
    const to = host && host.windowMode ? (host.windowMode() === "full" ? "window" : "full") : document.fullscreenElement ? "window" : "full";
    if (A.dealer && A.dealer.noteWindow) A.dealer.noteWindow(to);
    if (host && host.setWindowMode) { host.setWindowMode(to); return; }
    if (document.fullscreenElement) document.exitFullscreen();
    else (document.documentElement.requestFullscreen || (() => {})).call(document.documentElement);
  }
  $("fsBtn").onclick = toggleFs;
  document.addEventListener("fullscreenchange", () => $("fsBtn").classList.toggle("on", !!document.fullscreenElement));

  document.addEventListener("pointerdown", e => {
    A.audio.unlock(!S.booting);
    if (e.target.closest && e.target.closest(".go, .camp, .btn-ink, .btn-line, .lv, #dock button, #rail button, .seg button, .menu-gear, .hub-back, .asc, .tool")) A.sfx.ui();
    /* menu principal: pulsar el fondo (nada activable) tambien suena, para que cada toque se sienta reconocido */
    else if (S.phase === "title" && !(e.target.closest && e.target.closest("button, a, input, select, textarea, label, [role=button], .dl-face"))) A.sfx.felt();   // su cara suena a ficha (js/dealer.js)
  }, true);

  addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && e.target.tagName === "INPUT") { if (e.key === "Escape") openSettings(false); return; }
    A.audio.unlock(!S.booting);
    if (S.booting) return;
    const k = e.key.toLowerCase();
    if (k === "escape") { if (A.adv.busy && A.adv.busy()) return; if (S.settingsOpen) openSettings(false); else if (S.run && S.tool) A.adv.cancelTool(); else if (S.phase === "title" && S.hub !== "home") A.hub.screen("home"); else runMenu(); }   // busy: la legendaria del cofre se esta luciendo (~5 s); el menu no la tapa ni la deja temblando debajo
    else if (S.settingsOpen && !["f", "m", "n"].includes(k)) return;       // con Ajustes abierto solo valen sus atajos: Intro pulsaba el boton de la pantalla de debajo (p. ej. Jugar) y P reanudaba la pregunta tapada
    else if (S.run && S.phase === "asking" && /^[1-4]$/.test(k)) { if (!e.repeat) A.adv.toolKey(+k - 1); }   // mantener pulsada la tecla encendia y apagaba la herramienta sin parar
    else if (k === "f") toggleFs();
    else if (k === "c" && S.phase === "title") (A.codex.isOpen() ? A.codex.close() : A.codex.open());
    else if (k === "m") toggleSwitch("sfx");
    else if (k === "n") toggleSwitch("music");
    else if (k === "p") togglePause();
    else if (k === "+" || k === "=") map.zoomBy(1.6);
    else if (k === "-") map.zoomBy(1 / 1.6);
    else if (k === "0") $("zoomHome").click();
    else if (k === "enter" || (k === " " && document.activeElement === document.body)) {
      if (e.repeat) { e.preventDefault(); return; }                         // dejar Intro pulsado no se salta el veredicto ni la intro siguientes
      if (S.phase === "intro" && S.skipIntro) { e.preventDefault(); S.skipIntro(); return; }
      const b = document.querySelector("#veil:not(.hidden) [data-primary]") || document.querySelector("#layer:not(.hidden) [data-primary]") || A.marcador.primary();   // la pausa va encima de todo: antes Intro pulsaba el ticket o el veredicto de debajo
      if (b && document.activeElement !== b) { e.preventDefault(); b.click(); }
    }
  });

  /* ------------------------------------------------------------ entrada + intro del estudio */
  function requestFs() { if (window.geoliteHost) return; const el = document.documentElement; try { (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el); } catch (e) { /* denegado */ } }   // en Electron el modo (Ventana / Sin bordes / Pantalla completa) ya lo pone main.js: antes "Entrar" forzaba pantalla completa en cada arranque
  function playStudio(done) {
    const st = $("studio"); st.classList.remove("hidden"); $("stLogo").innerHTML = ""; A.buildLogo($("stLogo"), { animated: true }); $("stLogo").classList.remove("has-png");
    A.sfx.studio();
    let ended = false;
    const end = () => { if (ended) return; ended = true; st.classList.add("leave"); setTimeout(done, 540); };
    if (!A._holdStudio) setTimeout(end, S.reduce ? 1500 : 3500);   /* animacion obligatoria: no se puede saltar */
  }
  function finishBoot() {
    S.booting = false; const boot = $("boot"); boot.classList.add("out"); setTimeout(() => boot.classList.add("hidden"), 850);
    A.audio.unlock(true); showTitle();
  }
  /* aviso de fotosensibilidad (v0.52): una sola vez, la primera vez que se abre el juego, en la propia entrada (antes de cualquier reto) y con el ajuste
     Destellos suaves a mano. Tocar el interruptor no entra al juego; entrar lo da por leido */
  function gateWarn() {
    const w = $("gateWarn"); if (!w || S.flashSeen) return false;
    const sw = $("gwSw"), sync = () => { const on = S.softFlash || flashForced(); sw.setAttribute("aria-checked", on); sw.setAttribute("aria-disabled", flashForced()); };
    $("gwWhere").textContent = A.t("warn.where", { p: A.t("set.title") + " › " + A.t("set.tab.video") });
    if (A.iconize) A.iconize(w);
    if (!w.dataset.on) { w.dataset.on = "1";
      w.addEventListener("pointerdown", e => e.stopPropagation());               // leer o tocar el aviso no entra
      sw.addEventListener("click", e => { e.stopPropagation(); if (flashForced()) { A.sfx.deny(); return; } S.softFlash = !S.softFlash; applyFlash(); save(); sync(); A.sfx.flip(S.softFlash); }); }
    sync(); w.classList.remove("hidden"); $("gate").classList.add("warn");
    return true;
  }
  function runBoot() {
    const boot = $("boot"), gate = $("gate"); boot.classList.remove("hidden");
    let gateAt = 0; const warned = gateWarn();
    const showGate = () => { $("studio").classList.add("hidden"); gate.classList.remove("hidden"); gateAt = performance.now(); };
    let entered = false;
    const enter = () => {
      if (entered) return; entered = true; A.audio.unlock(false); requestFs();
      if (warned) { S.flashSeen = true; save(); }
      if (gateAt && A.dealer && A.dealer.noteGate) A.dealer.noteGate(performance.now() - gateAt);   // cuanto tardaste en entrar
      finishBoot();   // la entrada se funde con la portada junto con #boot (ocultarla antes dejaba un fogonazo negro hasta que la portada empezaba a aparecer)
    };
    gate.addEventListener("pointerdown", enter);
    addEventListener("keydown", function k(e) { if (entered) { removeEventListener("keydown", k); return; } if ((e.key === "Enter" || e.key === " ") && !(e.target && e.target.closest && e.target.closest("#gwSw"))) { e.preventDefault(); enter(); } });
    (A._debug = A._debug || {}).enterBoot = enter;
    if (S.intro) playStudio(showGate); else showGate();
  }

  A.core = { S, map, world, dialog, closeDialog, verdict, prog, save, toggleFs, openSettings, openLangPop, runMenu, refreshPrompt: () => { setPrompt(); }, updateHud, newRun, prepareRun, startLevel: startLevel_, showHub: showTitle, odoSet, jpShake };   // jpShake: el temblor de los jackpots (tambien la legendaria del cofre, js/adventure.js)

  applyLang(); syncSettings();
  const start = () => {
    { const sp = $("splash"); if (sp) { sp.classList.add("out"); setTimeout(() => sp.remove(), 500); } }   // pantalla de carga fuera en cualquier caso
    /* las fuentes pequenas que aun no se han usado (variantes latinas, cirilico, nombres de los idiomas) se cargan ya, durante el arranque: la primera vez
       que salian (Ajustes, Perfil...) se cargaban y se buscaban letras de repuesto en ese mismo fotograma (tiron). Las CJK grandes (~600 KB), solo si hacen falta */
    try { document.fonts.forEach(f => { if (f.status === "unloaded" && !/Fusion Pixel/i.test(f.family)) f.load().catch(() => {}); }); } catch (e) { /* sin FontFaceSet */ }
    /* y Ajustes (los 12 idiomas, cada uno con sus letras) se maqueta una vez, oculto, aun tapado por la carga: la primera apertura ya no da tiron */
    { const sh = $("setSh"); if (sh && !S.settingsOpen) { sh.style.visibility = "hidden"; sh.classList.remove("hidden"); void sh.offsetHeight; sh.classList.add("hidden"); sh.style.visibility = ""; } }
    if (/[?&]skipboot/.test(location.search)) { S.booting = false; showTitle(); } else runBoot();
  };
  if (document.fonts && document.fonts.load) Promise.race([Promise.all([document.fonts.load("400 20px 'Jersey 15'"), document.fonts.load("400 12px Silkscreen"), document.fonts.load("700 12px Silkscreen")]), new Promise(r => setTimeout(r, 1200))]).then(start, start);
  else start();

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});

  A._debug = Object.assign(A._debug || {}, { S, map, world, reveal, revealObs, startLevel_, showTitle, odoSet, setLang, finishBoot, playStudio, gateWarn });
})(window.AIQ);
