/*
 * Geolite - SALIR DEL JUEGO (v0.12). El boton de encendido de arriba a la izquierda de la portada (espejo del engranaje) o Esc en la portada:
 * la sala se apaga, el crupier se asoma bajo el foco y te tiende su tarjeta: "¿Seguro que quieres salir?". No te lo pone facil: la primera vez que
 * pulsas Salir te hace UNA trastada (apagon, rabieta a gritos con temblor, trile con los botones, sello de DENEGADO, suplica con luz triste, lluvia
 * de fichas o un falso apagado de la tele) y solo a la segunda se despide y apaga la pantalla como un televisor viejo. Sus frases son del guion
 * (js/dealer.js, "LA SALIDA") y rompen la cuarta pared con tus datos: partida guardada, la hora, lo que llevas jugado, si ya lo has intentado.
 * En Electron (Steam) cierra el juego; en el navegador intenta cerrar la pestana y, si no le dejan, el casino queda CERRADO con su neon.
 *   A.salir.button()  A.salir.wire()  -> la portada (js/hub.js)       A.salir.open()  A.salir.isOpen()
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id), C = () => A.core, D = () => A.dealer, t6 = s => A.pick6(s);
  const rand = a => a[Math.floor(Math.random() * a.length)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* textos: es | en | fr | pt | de | it | es-419 | zh | ko | ja | ru | pl */
  const TX = {
    tip: "Salir del juego|Quit game|Quitter le jeu|Sair do jogo|Spiel beenden|Esci dal gioco|Salir del juego|退出游戏|게임 종료|ゲームを終了|Выйти из игры|Wyjdź z gry",
    head: "Salida|Exit|Sortie|Saída|Ausgang|Uscita||出口|출구|出口|Выход|Wyjście",
    q: "¿Seguro que quieres salir?|Are you sure you want to quit?|Tu veux vraiment quitter ?|Tem certeza de que quer sair?|Willst du wirklich aufhören?|Vuoi davvero uscire?||确定要退出吗？|정말 나갈 거야?|本当にやめる？|Точно хочешь выйти?|Na pewno chcesz wyjść?",
    saved: "Tu progreso queda guardado.|Your progress is saved.|Ta progression est sauvegardée.|Seu progresso fica salvo.|Dein Fortschritt ist gespeichert.|I tuoi progressi restano salvati.||你的进度已保存。|진행 상황은 저장돼 있어.|進行状況はセーブされている。|Твой прогресс сохранён.|Twoje postępy są zapisane.",
    run: "Tu expedición te espera: {w}.|Your expedition will be waiting: {w}.|Ton expédition t'attendra : {w}.|Sua expedição vai te esperar: {w}.|Deine Expedition wartet auf dich: {w}.|La tua spedizione ti aspetta: {w}.||你的远征会等你回来：{w}。|네 원정은 그대로 기다릴 거야: {w}.|遠征は君を待ってる：{w}。|Твоя экспедиция подождёт: {w}.|Twoja wyprawa poczeka: {w}.",
    where: "Acto {a} · Ronda {r}|Act {a} · Round {r}|Acte {a} · Manche {r}|Ato {a} · Rodada {r}|Akt {a} · Runde {r}|Atto {a} · Round {r}||第{a}幕 · 第{r}回合|{a}막 · {r}라운드|第{a}幕・ラウンド{r}|Акт {a} · раунд {r}|Akt {a} · runda {r}",
    inf: "Modo infinito|Infinite mode|Mode infini|Modo infinito|Endlosmodus|Modalità infinita||无尽模式|무한 모드|エンドレスモード|Бесконечный режим|Tryb nieskończony",
    table: "{t} en la mesa|{t} at the table|{t} à table|{t} na mesa|{t} am Tisch|{t} al tavolo||已在牌桌 {t}|테이블에서 {t}|テーブルで{t}|{t} за столом|{t} przy stole",
    stay: "Me quedo|I'll stay|Je reste|Vou ficar|Ich bleibe|Resto||我留下|남을게|残る|Остаюсь|Zostaję",
    go: "Salir|Quit|Quitter|Sair|Beenden|Esci||退出|나가기|やめる|Выйти|Wyjdź",
    goSeason: "Salir (sin trucos)|Quit (no tricks)|Quitter (sans tours)|Sair (sem truques)|Beenden (ohne Tricks)|Esci (senza trucchi)||退出（不耍花招）|나가기 (속임수 없음)|やめる（トリックなし）|Выйти (без фокусов)|Wyjdź (bez sztuczek)",
    guilt: "Salir y dejarle solo|Quit and leave him all alone|Partir et le laisser seul|Sair e deixá-lo sozinho|Gehen und ihn allein lassen|Esci e lascialo solo|Salir y dejarlo solo|退出，丢下他一个人|혼자 두고 나가기|彼を独り残してやめる|Уйти и бросить его|Wyjdź i zostaw go samego",
    stamp: "Denegado|Denied|Refusé|Negado|Abgelehnt|Respinto||驳回|거부|却下|Отказано|Odrzucono",
    closed: "Cerrado|Closed|Fermé|Fechado|Geschlossen|Chiuso||打烊|영업 종료|閉店|Закрыто|Zamknięte",
    tab: "Ya puedes cerrar esta pestaña.|You can close this tab now.|Tu peux fermer cet onglet.|Você já pode fechar esta aba.|Du kannst diesen Tab jetzt schließen.|Ora puoi chiudere questa scheda.||现在可以关闭这个标签页了。|이제 이 탭을 닫아도 돼.|このタブはもう閉じていいよ。|Теперь можно закрыть вкладку.|Możesz już zamknąć tę kartę.",
    back: "Volver a la mesa|Back to the table|Retour à la table|Voltar à mesa|Zurück an den Tisch|Torna al tavolo||回到牌桌|테이블로 돌아가기|テーブルに戻る|Вернуться за стол|Wróć do stołu",
  };
  /* el globo del boton (data-tip="tip.quit") sale de A.t: se registra en la tabla de textos de cada idioma */
  (function () { const a = TX.tip.split("|"); (A.LANGS || []).forEach((L, i) => { if (A.STR && A.STR[L.code]) A.STR[L.code]["tip.quit"] = a[i] || a[1]; }); })();

  /* tiempo en la mesa de esta sesion (solo con la ventana a la vista, como el crupier): sale en la tarjeta y elige su frase */
  const T0 = Date.now(); let hidAcc = 0, hidAt = document.hidden ? T0 : 0;
  document.addEventListener("visibilitychange", () => { if (document.hidden) hidAt = Date.now(); else if (hidAt) { hidAcc += Date.now() - hidAt; hidAt = 0; } });
  const played = () => Date.now() - T0 - hidAcc - (hidAt ? Date.now() - hidAt : 0);
  const UNIT = { zh: ["小时", "分钟", "", ""], ja: ["時間", "分", "", ""], ko: ["시간", "분", "", " "], de: ["Std.", "Min.", " ", " "], ru: ["ч", "мин", " ", " "] };
  const dur = ms => {
    const m = Math.max(1, Math.round(ms / 60000)), h = Math.floor(m / 60), r = m % 60, u = UNIT[A.lang] || ["h", "min", " ", " "], p = [];
    if (h) p.push(h + u[2] + u[0]); if (r || !h) p.push(r + u[2] + u[1]); return p.join(u[3]);
  };
  const clock = () => { const d = new Date(); try { const L = (A.LANGS || []).find(l => l.code === A.lang); return d.toLocaleTimeString(L ? L.loc : undefined, { hour: "2-digit", minute: "2-digit" }); } catch (e) { return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"); } };
  const who = () => { const P = A.profile && A.profile.get(); return (P && P.name) || ""; };
  const reduced = () => { const S = C() && C().S; return !!(S && S.reduce); };
  const shakeOk = () => { const S = C() && C().S; return !(S && S.shake === false) && !reduced(); };

  /* las trastadas salen de una bolsa (guardada: tampoco se repiten entre sesiones) hasta agotarlas todas */
  const TROLLS = ["dark", "shout", "shell", "denied", "plead", "bribe", "fake"];
  const SK = "atlasiq.quit.v1";
  let store = null; try { store = JSON.parse(localStorage.getItem(SK) || "null"); } catch (e) { /* sin almacenamiento */ }
  store = Object.assign({ bag: [], pos: 0, quits: 0, stays: 0, opens: 0, last: "" }, store || {});   // stays/opens: la saga de la puerta; last: la trastada con la que te fuiste
  const saveStore = () => { try { localStorage.setItem(SK, JSON.stringify(store)); } catch (e) { /* sin almacenamiento */ } };
  let forced = null;                                                    // solo para pruebas de desarrollo (A.salir._troll)
  function nextTroll() {
    if (forced) { const k = forced; forced = null; return k; }
    if (!Array.isArray(store.bag) || store.bag.length !== TROLLS.length || store.pos >= store.bag.length) {
      const last = Array.isArray(store.bag) ? store.bag[store.bag.length - 1] : null, b = TROLLS.slice();
      for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
      if (b[0] === last) b.push(b.shift());
      store.bag = b; store.pos = 0;
    }
    const k = store.bag[store.pos++]; saveStore(); return TROLLS.includes(k) ? k : "dark";
  }

  /* ------------------------------------------------------------------ el boton (portada) */
  let hoverAt = 0;
  const button = () => `<button class="menu-gear menu-quit" id="quitBtn" type="button" aria-label="${esc(t6(TX.tip))}" data-tip="tip.quit" data-key="Esc">${A.icon("u_quit")}</button>`;
  function wire() {
    const b = $("quitBtn"); if (!b) return; const t0 = Date.now();
    b.onclick = () => open();
    /* el crupier ve tu cursor rondando la salida: asoma justo debajo (una vez cada rato, nunca nada mas llegar a la portada) */
    b.addEventListener("pointerenter", e => {
      const d = D(); if (e.pointerType !== "mouse" || st || !d || !d.homeSay || d.busy || Date.now() - t0 < 1500 || Date.now() - hoverAt < 150000 || Math.random() > 0.8) return;
      const t = d.pick("quitHover"); if (t && d.homeSay(t, rand(["shock", "angry", "sly"]), "home-tl")) { hoverAt = Date.now(); if (A.tt && A.tt.hide) A.tt.hide(); }   // habla el: fuera el globo de ayuda, que le pisaria
    });
  }
  /* en la portada, libre (sin Ajustes, Enciclopedia, Clasificacion, tutorial, pregunta del nombre ni pausa encima) */
  function free() {
    const c = C(), S = c && c.S; if (!S || S.booting || S.phase !== "title" || (S.hub || "home") !== "home" || S.settingsOpen) return false;
    if (!document.querySelector("#layer:not(.hidden) .hh")) return false;
    if ((A.codex && A.codex.isOpen && A.codex.isOpen()) || (A.podio && A.podio.isOpen && A.podio.isOpen()) || (A.nombre && A.nombre.open && A.nombre.open())) return false;
    if (A.tour && A.tour.active && A.tour.active()) return false;
    if (A.final && A.final.active()) return false;                                     // los creditos finales: alli Esc salta al final
    if (A.mesas && A.mesas.live) return false;                                         // el estreno de una mesa (js/mesas.js): alli Esc es "seguir con la de antes"
    const lp = $("langPop"), veil = $("veil"); return !(lp && !lp.classList.contains("hidden")) && !(veil && !veil.classList.contains("hidden"));
  }
  /* Esc en la portada: como en cualquier juego de PC, pregunta si quieres salir */
  addEventListener("keydown", e => {
    if (st || e.key !== "Escape" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (!free()) return;
    e.preventDefault(); e.stopPropagation(); open();
  }, true);

  /* ------------------------------------------------------------------ la escena */
  let root = null, st = null, timers = [], opens = 0, crtAnim = null, dotEl = null;
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const clearAll = () => { timers.forEach(clearTimeout); timers = []; };

  function build() {
    if (root && root.isConnected) return root;
    root = document.createElement("div"); root.id = "qx"; root.className = "qx hidden";
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-labelledby", "qxQ");
    const motes = Array.from({ length: 10 }, () => `<u style="--x:${(12 + Math.random() * 76).toFixed(1)}%;--y:${(40 + Math.random() * 55).toFixed(1)}%;--d:${(4.5 + Math.random() * 4).toFixed(2)}s;--w:${(-Math.random() * 8).toFixed(2)}s"></u>`).join("");
    root.innerHTML = `<i class="qx-dim"></i>
      <div class="qx-in">
        <div class="qx-stage" id="qxStage"><i class="qx-beam">${motes}</i><i class="qx-pool"></i></div>
        <div class="qx-card" id="qxCard">
          <i class="qx-bulbs"></i><i class="qx-bulbs b"></i>
          <header class="qx-top"><span class="qx-ic">${A.icon("u_quit")}</span><b id="qxHead"></b><em id="qxTime"></em></header>
          <h2 class="qx-q" id="qxQ"></h2>
          <p class="qx-sub" id="qxSub"></p>
          <div class="qx-acts" id="qxActs">
            <button type="button" class="btn-ink qx-stay" id="qxStay"><span id="qxStayT"></span></button>
            <button type="button" class="qx-go" id="qxGo"><span id="qxGoT"></span></button>
          </div>
          <b class="qx-stamp" id="qxStamp"></b>
        </div>
      </div>
      <i class="qx-rain" id="qxRain"></i>`;
    $("app").appendChild(root);
    $("qxStay").onclick = () => stay();
    $("qxGo").onclick = () => go();
    /* fuera de la tarjeta no pasa nada (ni se cierra por accidente): el foco vuelve a "Me quedo" */
    root.addEventListener("pointerdown", e => { if (st && !e.target.closest("button")) { e.preventDefault(); focusStay(); } });
    return root;
  }
  const focusStay = () => { const b = $("qxStay"); if (b && st && st.phase === "ask") try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } };

  /* el crupier habla de uno en uno y nunca se le corta: si aun esta diciendo algo, lo siguiente espera su turno (con su segundo de mas).
     o.start: lo que acompana a la frase (el efecto sale justo cuando empieza a decirla); o.shout: grita (globo rojo que tiembla) */
  function talk(line, mood, then, o = {}) {
    if (!st) return;
    if (!line) { if (o.start) o.start(); if (then) then(); return; }
    if (st.talking) { st.pend = [line, mood, then, o]; return; }
    st.talking = true; root.classList.toggle("shout", !!o.shout);
    if (o.start) o.start();
    D().say(line, { mood, hold: 0, force: true, done: () => {
      if (!st) return; st.talking = false;                                                // el globo sigue gritando hasta la siguiente frase
      const p = st.pend; st.pend = null; if (p) talk(...p); else if (then) then();
    } });
  }
  const pick = (k, d) => D().pick(k, d);

  /* lo que dice al abrir: con contexto cuando lo hay (partida guardada, madrugada, recien llegado, mucho rato, tu nombre), si no una de las generales;
     y si ya lo has intentado en esta sesion, "¿OTRA VEZ?" */
  function askLine() {
    if (opens > 1) return pick("quitAskAgain");
    if (store.quits >= 3 && Math.random() < 0.35) return pick("quitAskCount", { n: store.quits + 1 });                   // la saga de la puerta
    if (store.stays >= 3 && store.opens > 5 && Math.random() < 0.3) return pick("quitAskStays", { s: store.stays, n: store.opens - 1 });
    const sm = A.adv && A.adv.hasSave && A.adv.hasSave() && A.adv.summary && A.adv.summary(), h = new Date().getHours(), mins = played() / 60000, pool = [];
    if (sm && !sm.inf && sm.act <= 3) pool.push(["quitAskSave", { act: sm.act, round: sm.round }]);
    if (h >= 23 || h < 5) pool.push(["quitAskLate", { time: clock() }]);
    if (mins < 3) pool.push(["quitAskQuick"]); else if (mins > 45) pool.push(["quitAskLong"]);
    if (who()) pool.push(["quitAskName"]);
    if (pool.length && Math.random() < 0.65) { const [k, d] = rand(pool); return pick(k, d); }
    return pick("quitAsk");
  }
  function subLine() {
    const sm = A.adv && A.adv.hasSave && A.adv.hasSave() && A.adv.summary && A.adv.summary();
    if (!sm) return t6(TX.saved);
    const w = sm.inf ? t6(TX.inf) : sm.act <= 3 ? t6(TX.where).replace("{a}", sm.act).replace("{r}", sm.round) : "";
    return w ? t6(TX.run).replace("{w}", w) : t6(TX.saved);
  }

  function open() {
    if (st || !free() || !D()) return;
    build(); clearAll(); opens++; store.opens = (store.opens || 0) + 1; saveStore();
    st = { phase: "in", talking: false, pend: null, trolled: null, lock: false, undo: null, home: !!D().onHome };
    /* TEMPORADA DOS: ya te ha hecho las 7 trastadas; esta vez el boton lo dice y te deja ir a la primera */
    st.season = !forced && Array.isArray(store.bag) && store.bag.length === TROLLS.length && store.pos >= store.bag.length;
    $("qxHead").textContent = t6(TX.head); $("qxTime").textContent = t6(TX.table).replace("{t}", dur(played()));
    $("qxQ").textContent = t6(TX.q); $("qxSub").textContent = subLine();
    $("qxStayT").textContent = t6(TX.stay); $("qxGoT").textContent = t6(st.season ? TX.goSeason : TX.go); $("qxStamp").textContent = t6(TX.stamp);
    $("qxActs").classList.remove("swap");
    root.className = "qx"; A.restyle(root); root.classList.add("on");   // la sala se apaga
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (A.tt && A.tt.hide) A.tt.hide();
    if (st.home) D().homeTease(false);
    D().hold(true); A.music.muffle(true); A.sfx.spot();
    addEventListener("keydown", onKey, true);
    later(() => { root.classList.add("spot"); D().dock($("qxStage")); talk(askLine(), rand(["sly", "shock"])); }, 560);   // el foco se enciende y el crupier se asoma
    later(() => { root.classList.add("card-in"); A.sfx.card(); st.phase = "ask"; focusStay(); }, 1150);          // y te tiende la tarjeta
  }

  /* bloqueo mientras dura la trastada: Salir no responde (un "no" seco), Me quedo si */
  const lock = () => { st.lock = true; root.classList.add("busy"); $("qxGo").setAttribute("aria-disabled", "true"); };
  const unlock = () => { if (!st || st.phase !== "ask") return; st.lock = false; root.classList.remove("busy"); $("qxGo").removeAttribute("aria-disabled"); };
  const nope = () => { const g = $("qxGo"); g.classList.remove("nope"); A.restyle(g); g.classList.add("nope"); A.sfx.deny(); };

  function go() {
    if (!st || st.phase !== "ask") return;
    if (st.lock) return nope();
    if (!st.trolled && st.season) { st.trolled = "season"; return season(); }                              // temporada dos: sin trucos
    if (!st.trolled) { const k = nextTroll(); st.trolled = k; store.trolls = (store.trolls || 0) + 1; saveStore(); lock(); TROLL[k](pick(KEY[k])); return; }   // la primera vez: trastada
    bye();                                                                                                   // la segunda: se despide
  }

  /* ------------------------------------------------------------------ las trastadas */
  const KEY = { dark: "quitDark", shout: "quitShout", shell: "quitShell", denied: "quitDenied", plead: "quitPlead", bribe: "quitBribe", fake: "quitFake" };
  const both = n => { let k = n; return () => { if (--k === 0) unlock(); }; };   // la trastada acaba cuando acaban su frase Y su efecto
  const TROLL = {
    /* apagon: se va la luz de golpe y solo brilla "Me quedo"; vuelve a parpadeos */
    dark(line) {
      const ok = both(2); A.sfx.powerdown(); root.classList.add("dark"); A.haptic([40]); if (D().face) D().face("dark");   // se va la luz: solo sus ojos (v0.32)
      st.undo = () => { root.classList.remove("dark", "flick"); if (D().face) D().face("laugh"); };
      talk(line, "laugh", ok, { start: () => {
        later(() => { A.sfx.buzz(0); root.classList.add("flick"); }, 2300);
        later(() => A.sfx.buzz(2), 2480);
        later(() => { root.classList.remove("dark", "flick"); A.sfx.restore(); if (D().face) D().face("laugh"); ok(); }, 2760);   // vuelve la luz: se le ve la cara (v0.32)
      } });
    },
    /* rabieta: grita en mayusculas, retumba la sala, tiembla la pantalla (flojo, fuerte, mas fuerte) y la marquesina se pone roja */
    shout(line) {
      st.undo = () => root.classList.remove("rage");
      talk(line, "angry", () => { root.classList.remove("rage"); unlock(); }, { shout: true, start: () => {
        root.classList.add("rage"); A.sfx.boss(); shake(3); A.haptic([90, 60, 160]);
        later(() => shake(2), 820); later(() => shake(3), 1600);
      } });
    },
    /* trile: baraja los dos botones como cubiletes (un numero de pases al azar: acaban donde acaban) */
    shell(line) {
      const ok = both(2);
      talk(line, "laugh", ok, { start: () => shuffle(3 + Math.floor(Math.random() * 3), ok) });
    },
    /* sello: DENEGADO cae de golpe sobre la tarjeta */
    denied(line) {
      st.undo = () => root.classList.remove("stamped");
      talk(line, "laugh", () => { root.classList.add("unstamp"); later(() => root.classList.remove("stamped", "unstamp"), 380); unlock(); }, { start: () => {
        root.classList.add("stamped"); A.sfx.stamp(); shake(1); A.haptic([30, 40, 70]);
      } });
    },
    /* suplica: la luz se vuelve fria y triste, y Salir pasa a decir lo que de verdad haces */
    plead(line) {
      st.undo = () => root.classList.remove("sad");
      talk(line, "shock", unlock, { start: () => { root.classList.add("sad"); A.sfx.fail(); $("qxGoT").textContent = t6(TX.guilt); } });
    },
    /* soborno: llueven fichas (de adorno: no te da nada de verdad) */
    bribe(line) {
      talk(line, "sly", unlock, { start: rain });
    },
    /* falso apagado: la pantalla se apaga como una tele vieja… y vuelve, y se rie */
    fake(line) {
      A.haptic([60]); A.music.stop();
      st.undo = () => { if (crtAnim) crtOn(() => A.music.start()); };                     // Esc (Me quedo) a oscuras: la tele vuelve ya
      crtOff(() => { if (st && st.phase === "ask") later(() => crtOn(() => { A.music.start(); talk(line, "laugh", unlock); }), 950); });
    },
  };

  /* temblor de pantalla al azar (como los jackpots): 1 flojo, 2 fuerte, 3 rabieta. Respeta Vibracion = no y "reducir movimiento" */
  let shAnim = null, shAng = Math.random() * Math.PI * 2;
  const SHAKE = [null, { a: 4, r: 0.2, ms: 320, k: 5 }, { a: 9, r: 0.5, ms: 520, k: 7 }, { a: 15, r: 0.9, ms: 780, k: 10 }];
  function shake(n) {
    if (!shakeOk()) return;
    const P = SHAKE[n], rnd = (a, b) => a + Math.random() * (b - a); shAng += rnd(1.1, 5.2);
    const k = P.k + (Math.random() < 0.5 ? 0 : 1), turn = Math.random() < 0.5 ? -1 : 1, oval = rnd(0.25, 0.55), fr = [{ transform: "none", offset: 0 }];
    for (let i = 0; i < k; i++) {
      const f = Math.pow(1 - i / k, 1.35) * rnd(0.82, 1.12), s = i % 2 ? -1 : 1, al = s * P.a * f, sd = P.a * f * oval * rnd(-1, 1);
      fr.push({ transform: `translate3d(${(al * Math.cos(shAng) - sd * Math.sin(shAng)).toFixed(2)}px, ${(al * Math.sin(shAng) + sd * Math.cos(shAng)).toFixed(2)}px, 0) rotate(${(s * turn * P.r * f).toFixed(3)}deg)`, offset: (i + 0.6 + rnd(-0.2, 0.2)) / (k + 0.6) });
    }
    fr.push({ transform: "none", offset: 1 });
    if (shAnim) shAnim.cancel();
    shAnim = document.documentElement.animate(fr, { duration: P.ms * rnd(0.92, 1.1), easing: "ease-out" });
  }

  /* trile: cada pase cruza los botones en arco (uno por arriba, otro por abajo) */
  function shuffle(n, done) {
    const acts = $("qxActs"), a = $("qxStay"), b = $("qxGo"), card = $("qxCard");
    root.classList.add("shuffling"); let i = 0;
    const one = () => {
      if (!st) return;
      const k = card.getBoundingClientRect().width / card.offsetWidth || 1, ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      acts.classList.toggle("swap");
      const na = a.getBoundingClientRect(), nb = b.getBoundingClientRect(), up = i % 2 ? 1 : -1, ms = reduced() ? 1 : 260;
      const arc = (el, r0, r1, dy) => { const x = (r0.left - r1.left) / k, y = (r0.top - r1.top) / k; el.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: `translate(${x / 2}px, ${y / 2 + dy}px) scale(1.04)`, offset: 0.5 }, { transform: "none" }], { duration: ms, easing: "ease-in-out" }); };
      arc(a, ra, na, -26 * up); arc(b, rb, nb, 26 * up);
      A.sfx.card(); if (i % 2) A.sfx.chip(i);
      if (++i < n) later(one, ms + 70); else later(() => { root.classList.remove("shuffling"); done && done(); }, ms + 40);
    };
    one();
  }

  /* lluvia de fichas de pixel sobre la tarjeta */
  const CHIPS = ["chip_r", "chip_b", "chip_k", "chip_p", "chip_g", "coin"];
  function rain() {
    for (let i = 0; i < 7; i++) later(() => A.sfx.chip(i % 5), 90 + i * 115);
    later(() => A.sfx.coin(), 520);
    if (reduced()) return;
    const box = $("qxRain");
    box.innerHTML = Array.from({ length: 30 }, () => `<i style="--x:${(Math.random() * 100).toFixed(1)}%;--w:${(Math.random() * 900).toFixed(0)}ms;--t:${(1300 + Math.random() * 900).toFixed(0)}ms;--r:${Math.round(Math.random() * 720 - 360)}deg;--s:${(30 + Math.random() * 26).toFixed(0)}px">${A.icon(rand(CHIPS))}</i>`).join("");
    root.classList.remove("rain"); A.restyle(root); root.classList.add("rain");
    later(() => { root.classList.remove("rain"); box.innerHTML = ""; }, 3400);
  }

  /* ------------------------------------------------------------------ apagado de tele (CRT): la imagen se aplasta en una linea, luego en un punto */
  function ensureDot() { if (!dotEl || !dotEl.isConnected) { dotEl = document.createElement("i"); dotEl.id = "qxDot"; document.body.appendChild(dotEl); } return dotEl; }
  function crtOff(done) {
    const app = $("app"); document.documentElement.classList.add("qx-crt"); A.sfx.powerdown();
    const na = reduced()
      ? app.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, fill: "forwards" })
      : app.animate([
        { transform: "none", filter: "brightness(1)", offset: 0, easing: "cubic-bezier(.7, 0, .9, .45)" },
        { transform: "scale(1.02, .008)", filter: "brightness(2.8)", offset: 0.52, easing: "cubic-bezier(.5, 0, .9, .6)" },
        { transform: "scale(.004, .006)", filter: "brightness(4)", offset: 0.86 },
        { transform: "scale(0, 0)", filter: "brightness(0)", offset: 1 },
      ], { duration: 640, fill: "forwards" });
    if (crtAnim) crtAnim.cancel(); crtAnim = na;
    if (!reduced()) { const d = ensureDot(), w = Math.ceil(innerWidth / 10); d.getAnimations().forEach(x => x.cancel()); d.animate([   // la linea blanca de lado a lado que se recoge en un punto
      { opacity: 0, transform: "translate(-50%, -50%) scale(1, 1)", offset: 0 }, { opacity: 0, transform: `translate(-50%, -50%) scale(${w}, .5)`, offset: 0.3 },
      { opacity: 1, transform: `translate(-50%, -50%) scale(${w}, .5)`, offset: 0.5 }, { opacity: 1, transform: "translate(-50%, -50%) scale(1.4, 1.4)", offset: 0.62 },
      { opacity: 0, transform: "translate(-50%, -50%) scale(.3, .3)", offset: 1 },
    ], { duration: 1500, easing: "ease-out" }); }
    once(na, 700, done);
  }
  /* el final de la animacion (y, por si el navegador no la pinta, un temporizador de respaldo): lo que sigue nunca se queda colgado */
  function once(anim, ms, fn) { let ok = false; const go = () => { if (ok) return; ok = true; fn && fn(); }; anim.onfinish = go; setTimeout(go, ms); }
  function crtOn(done) {
    const app = $("app"), old = crtAnim;
    A.sfx.restore();
    const na = reduced()
      ? app.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360 })
      : app.animate([
        { transform: "scale(0, .006)", filter: "brightness(4)", offset: 0, easing: "cubic-bezier(.2, .6, .4, 1)" },
        { transform: "scale(1.02, .008)", filter: "brightness(3)", offset: 0.4, easing: "cubic-bezier(.2, .8, .3, 1.15)" },
        { transform: "none", filter: "brightness(1)", offset: 1 },
      ], { duration: 560 });
    crtAnim = null; if (old) old.cancel();                                 // la nueva ya tapa a la vieja: sin un fotograma de pantalla encendida entre medias
    once(na, 620, () => { document.documentElement.classList.remove("qx-crt"); done && done(); });
  }

  /* ------------------------------------------------------------------ te quedas / te vas */
  function stay() {
    if (!st || (st.phase !== "ask" && st.phase !== "in") || root.classList.contains("shuffling")) return;
    const trolled = !!st.trolled; st.phase = "stay"; clearAll(); store.stays = (store.stays || 0) + 1; saveStore();
    if (st.undo) st.undo(); root.classList.remove("busy", "rain", "flick"); $("qxRain").innerHTML = "";
    root.classList.add("stayed"); A.sfx.goal(); A.haptic([24, 40, 36]);             // la firma sol-do-re: quedarse suena a premio
    talk(pick(trolled ? "quitStayTroll" : "quitStay"), trolled ? "laugh" : "sly", () => later(close, 250));
    later(close, 14000);                                                                   // red de seguridad
  }
  /* se le han acabado las trastadas: lo confiesa y te abre la puerta (a partir de 20 salidas, la salida expres) */
  function season() {
    st.phase = "bye"; lock(); root.classList.add("leaving"); A.sfx.card();
    const out = () => { A.music.stop(); crtOff(quitNow); };
    if ((store.quits || 0) >= 20) return talk(pick("quitSeasonExpress"), "sly", out);
    talk(D().line("quitSeason", 0), "shock", () => talk(D().line("quitSeason", 1), "sly", out));
  }
  function bye() {
    st.phase = "bye"; lock(); root.classList.add("leaving"); A.sfx.card();
    const line = who() && Math.random() < 0.5 ? pick("quitByeName") : pick("quitBye");
    talk(line, rand(["sly", "shock"]), () => { A.music.stop(); crtOff(quitNow); });
  }
  function quitNow() {
    if (!st) return;
    st.phase = "gone"; store.quits = (store.quits || 0) + 1; store.last = st.trolled || "";
    if (st.trolled === "season") { store.bag = []; store.pos = 0; }                           // empieza otra temporada
    saveStore();
    if (D().noteQuit) D().noteQuit(true);                                                  // la proxima vez que abras el juego, te lo recuerda
    const h = window.geoliteHost;
    if (h && h.quit) h.quit(); else try { window.close(); } catch (e) { /* no se deja */ }
    setTimeout(() => { if (!window.closed && st && st.phase === "gone") closedScreen(); }, h && h.quit ? 1800 : 380);   // el navegador no deja cerrar una pestana que no abrio un script
  }
  function close() {
    if (!st || st.phase === "out") return;
    const home = st.home; st.phase = "out"; clearAll();
    removeEventListener("keydown", onKey, true);
    root.classList.add("out"); A.music.muffle(false);
    setTimeout(() => {
      root.className = "qx hidden"; st = null;
      const d = D(); d.dock(null); d.release(); d.hold(false);
      if (home && free()) d.homeTease(true);                                               // vuelve a asomar por la portada como siempre
      const b = $("quitBtn"); if (b && document.activeElement === document.body) try { b.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
    }, 520);
  }

  /* ------------------------------------------------------------------ navegador: el casino queda CERRADO */
  function closedScreen() {
    const c = document.createElement("div"); c.id = "qxc"; c.className = "qxc"; c.setAttribute("role", "dialog"); c.setAttribute("aria-modal", "true");
    c.innerHTML = `<div class="qxc-in"><div class="qxc-sign"><b class="qxc-neon">${esc(t6(TX.closed))}</b></div><div class="qxc-stage" id="qxcStage"></div>
      <p class="qxc-hint">${esc(t6(TX.tab))}</p><button type="button" class="btn-ink qxc-back" id="qxcBack">${esc(t6(TX.back))}</button></div>`;
    document.body.appendChild(c); A.restyle(c); c.classList.add("on");
    st.phase = "closed"; st.talking = false; st.pend = null;
    later(() => { A.sfx.buzz(0); c.classList.add("lit"); }, 500); later(() => A.sfx.buzz(1), 640); later(() => A.sfx.buzz(3), 900);   // el neon arranca a trompicones
    later(() => { if (!st || st.phase !== "closed") return; D().dock($("qxcStage")); talk(pick("quitWeb"), "sly", () => { c.classList.add("ready"); const b = $("qxcBack"); try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }); }, 1300);
    $("qxcBack").onclick = back;
  }
  function back() {
    if (!st || st.phase !== "closed" || !$("qxc").classList.contains("ready")) return;
    st.phase = "back"; clearAll(); if (D().noteQuit) D().noteQuit(false);
    const c = $("qxc"); c.classList.add("out"); setTimeout(() => c.remove(), 500);
    removeEventListener("keydown", onKey, true);
    const home = st.home; root.className = "qx hidden"; st = null;
    const d = D(); d.dock(null); d.release(); d.hold(false); A.music.muffle(false);
    later(() => crtOn(() => {
      A.music.start();
      if (home && free()) { d.homeTease(true); later(() => { const t = d.pick("quitBack"); if (t) d.homeSay(t, "laugh", "home-tl"); }, 450); }
    }), 380);
  }

  /* ------------------------------------------------------------------ teclado: mientras esta abierto es suyo (en captura, antes que nadie) */
  function onKey(e) {
    if (!st) return;
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (st.phase === "closed") { if (!e.repeat && (e.key === "Enter" || e.key === " " || e.key === "Escape")) { e.preventDefault(); back(); } return; }
    if (e.key === "Escape") { e.preventDefault(); if (!e.repeat) stay(); return; }
    if (st.phase !== "ask") { if (e.key === "Enter" || e.key === " " || e.key === "Tab") e.preventDefault(); return; }
    const btns = [...$("qxActs").querySelectorAll("button")].sort((x, y) => x.getBoundingClientRect().left - y.getBoundingClientRect().left), at = btns.indexOf(document.activeElement);
    if (e.key === "Tab" || e.key === "ArrowLeft" || e.key === "ArrowRight") {                 // el foco solo va de un boton al otro (en el orden en que se ven, tras el trile tambien)
      e.preventDefault(); const dir = e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey) ? -1 : 1;
      const nx = btns[at < 0 ? 0 : (at + dir + btns.length) % btns.length]; try { nx.focus({ preventScroll: true }); } catch (x) { nx.focus(); } return;
    }
    if ((e.key === "Enter" || e.key === " ") && at < 0) { e.preventDefault(); if (!e.repeat) stay(); }   // sin foco en ningun boton, Intro = Me quedo
    else if (e.repeat && (e.key === "Enter" || e.key === " ")) e.preventDefault();                       // dejarlo pulsado no se salta la trastada
  }

  A.salir = { tv: { off: crtOff, on: crtOn },                                            // la tele que se apaga, tambien para la jubilacion del crupier (js/dealer.js)
    button, wire, open, isOpen: () => !!st, stats: () => ({ quits: store.quits || 0, stays: store.stays || 0, opens: store.opens || 0, trolls: store.trolls || 0, last: store.last || "" }), _troll: k => { forced = TROLLS.includes(k) ? k : null; } };   // _troll: la proxima trastada (pruebas)
})(window.AIQ);
