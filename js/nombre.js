/*
 * Geolite - TU NOMBRE (v0.37). Al acabar tu primera partida sin nombre (Clasico, Aventura o Reto diario), la sala se apaga, el crupier se asoma
 * bajo un foco y te pregunta "¿Como quieres que te llame?": su tarjeta de socio, con hueco para 16 caracteres. Ese es tu nombre en la
 * clasificacion (A.rank.rename lo lleva a las tablas) y el crupier lo usa, muy de vez en cuando, para llamarte (js/dealer.js, "tu nombre").
 * Despues solo se cambia en Ajustes > General (el Reto diario no tiene casilla de nombre). Si prefieres no darlo, pregunta como mucho una vez por sesion:
 * vuelve a preguntar al acabar una partida en otra sesion, y tras 3 "Ahora no" ya no pregunta mas.
 *   A.nombre.maybeAsk({ won, after })  -> true si va a preguntar: el veredicto se ahorra la reaccion del crupier (la pregunta la tapa)
 *   A.nombre.set(nombre)                -> guarda, lo lleva a las tablas y se lo cuenta al crupier (promesa con el nombre ya limpio)
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id), C = () => A.core, P = () => A.profile.get();
  const MAX = A.profile.NAME_MAX || 16, clean = v => A.profile.clean(v), t6 = s => A.pick6(s);
  const dev = /skipboot/.test(location.search) && !/[?&]name\b/.test(location.search);       // las pruebas automaticas no lo activan (como el tutorial)

  /* textos: es | en | fr | pt | de | it | es-419 | zh | ko | ja | ru | pl */
  const TX = {
    q: "¿Cómo quieres que te llame?|What should I call you?|Comment veux-tu que je t'appelle ?|Como você quer que eu te chame?|Wie soll ich dich nennen?|Come vuoi che ti chiami?||你想让我怎么称呼你？|뭐라고 불러 줄까?|なんて呼べばいい？|Как мне тебя называть?|Jak mam cię nazywać?",
    card: "Tarjeta de socio|Member card|Carte de membre|Cartão de sócio|Mitgliedskarte|Tessera socio||会员卡|회원 카드|会員カード|Клубная карта|Karta członkowska",
    no: "N.º|No.|N°|Nº|Nr.|N.||No.|No.|No.|№|Nr",
    ph: "Tu nombre|Your name|Ton nom|Seu nome|Dein Name|Il tuo nome||你的名字|네 이름|君の名前|Твоё имя|Twoje imię",
    hint: "Así te llamará el crupier y así saldrás en la clasificación.|That's what the dealer will call you, and how you'll appear on the leaderboard.|C'est ainsi que le croupier t'appellera et que tu apparaîtras au classement.|É assim que o crupiê vai te chamar e como você vai aparecer no placar.|So nennt dich der Croupier, und so stehst du in der Rangliste.|Così ti chiamerà il croupier e così comparirai in classifica.|Así te va a llamar el crupier y así vas a salir en la clasificación.|荷官会这样称呼你，排行榜上也会显示这个名字。|딜러가 널 이렇게 부르고, 리더보드에도 이 이름으로 올라가.|ディーラーは君をこう呼び、ランキングにもこの名前で載る。|Так тебя будет звать крупье, и так ты будешь указан в таблице.|Tak będzie cię nazywać krupier i tak pojawisz się w rankingu.",
    ok: "¡Así me llamo!|That's my name!|C'est mon nom !|Esse é o meu nome!|So heiße ich!|Mi chiamo così!||就叫这个！|이 이름으로!|この名前で！|Так меня зовут!|Tak mam na imię!",
    skip: "Ahora no|Not now|Pas maintenant|Agora não|Jetzt nicht|Non ora||以后再说|나중에|今はいい|Не сейчас|Nie teraz",
    stamp: "¡Apuntado!|Signed!|C'est noté !|Registrado!|Eingetragen!|Registrato!|¡Anotado!|已登记！|등록 완료!|登録完了！|Записано!|Zapisano!",
    next: "Continuar|Continue|Continuer|Continuar|Weiter|Continua||继续|계속|続ける|Продолжить|Dalej",
    anon: "Anónimo|Anonymous|Anonyme|Anônimo|Anonym|Anonimo||匿名|익명|匿名|Аноним|Anonim",
    setH: "Tu nombre|Your name|Ton nom|Seu nome|Dein Name|Il tuo nome||你的名字|이름|名前|Твоё имя|Twoje imię",
    setD: "El crupier te llama así y es tu nombre en la clasificación. Hasta 16 caracteres.|The dealer calls you this, and it's your leaderboard name. Up to 16 characters.|Le croupier t'appelle ainsi, et c'est ton nom au classement. 16 caractères max.|O crupiê te chama assim, e é o seu nome no placar. Até 16 caracteres.|So nennt dich der Croupier, und so heißt du in der Rangliste. Bis zu 16 Zeichen.|Il croupier ti chiama così ed è il tuo nome in classifica. Fino a 16 caratteri.||荷官这样称呼你，这也是你在排行榜上的名字。最多 16 个字符。|딜러가 부르는 이름이자 리더보드 이름이야. 최대 16자.|ディーラーが呼ぶ名前で、ランキングの名前にもなる。最大16文字。|Так тебя зовёт крупье, и это твоё имя в таблице. До 16 символов.|Tak nazywa cię krupier i tak widnieje twoje imię w rankingu. Do 16 znaków.",
    saved: "Guardado|Saved|Enregistré|Salvo|Gespeichert|Salvato||已保存|저장됨|保存しました|Сохранено|Zapisano",
  };
  /* numero de socio: sale de tu id, siempre el mismo */
  const memberNo = () => t6(TX.no) + " " + (A.huevos && A.huevos.socioNo && A.huevos.socioNo() ? A.huevos.socioTxt() : String((A.rank && A.rank.hash ? A.rank.hash(P().id + ":socio") : 421) % 10000).padStart(4, "0"));   // tu numero real (api/socio.js); sin red, el de siempre

  /* ------------------------------------------------------------------ la escena */
  let root = null, st = null, asked = false, timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const clearAll = () => { timers.forEach(clearTimeout); timers = []; };
  const len = s => [...s].length;

  function build() {
    if (root && root.isConnected) return root;
    root = document.createElement("div"); root.id = "nm"; root.className = "nm hidden";
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-labelledby", "nmQ");
    const motes = Array.from({ length: 10 }, () => `<u style="--x:${(12 + Math.random() * 76).toFixed(1)}%;--y:${(40 + Math.random() * 55).toFixed(1)}%;--d:${(4.5 + Math.random() * 4).toFixed(2)}s;--w:${(-Math.random() * 8).toFixed(2)}s"></u>`).join("");
    root.innerHTML = `<i class="nm-dim"></i>
      <div class="nm-in">
        <h2 class="nm-sr" id="nmQ"></h2>
        <div class="nm-stage" id="nmStage"><i class="nm-beam">${motes}</i><i class="nm-pool"></i></div>
        <form class="nm-card" id="nmCard" autocomplete="off" novalidate>
          ${A.bulbs()}
          <div class="nm-paper gx-paper">
            <div class="nm-txt">
              <div class="nm-eyr"><span class="gx-eyb" id="nmTitle"></span><em class="gx-eyb" id="nmNo"></em></div>
              <p class="nm-q gx-t-m" id="nmQt" aria-hidden="true"></p>
              <p class="nm-hint gx-note" id="nmHint"></p>
              <output class="nm-n gx-eyb" id="nmN" aria-hidden="true"></output>
            </div>
            <div class="nm-acts gx-acts" id="nmActs">
              <button type="button" class="gx-btn gho nm-skip" id="nmSkip"><span id="nmSkipT"></span>${A.gala.keyHint("Esc", "b")}</button>
              <button type="submit" class="gx-btn pri nm-ok" id="nmOk" data-primary><span id="nmOkT"></span>${A.gala.keyHint("Enter", "a")}</button>
            </div>
            <button type="button" class="gx-btn pri nm-next" id="nmNext" tabindex="-1"><span id="nmNextT"></span>${A.gala.keyHint("Enter", "a")}</button>
          </div>
          <div class="nm-sc" id="nmSc"><div class="nm-scard" id="nmScard"></div>
            <div class="nm-field" id="nmField"><input id="nmIn" type="text" maxlength="${MAX}" spellcheck="false" autocomplete="off" autocapitalize="words" enterkeyhint="done" aria-label="" aria-describedby="nmHint"><b class="nm-stamp" id="nmStamp"></b></div>
          </div>
        </form>
      </div>`;
    $("app").appendChild(root);
    const inp = $("nmIn");
    inp.addEventListener("input", e => typed(e.isComposing));              // en movil (Gboard) se escribe "componiendo" la palabra entera: el contador sigue igual
    inp.addEventListener("compositionend", () => typed(false));
    $("nmCard").addEventListener("submit", e => { e.preventDefault(); confirm(); });
    $("nmSkip").onclick = skip; $("nmNext").onclick = early;
    /* fuera de la tarjeta: mientras pregunta, vuelve a la casilla; cuando ya ha contestado, cierra antes */
    root.addEventListener("pointerdown", e => { if (!st) return; if (st.phase === "done") { e.preventDefault(); early(); } else if (!e.target.closest(".nm-card button, #nmIn")) { e.preventDefault(); focusIn(); } });
    return root;
  }
  const focusIn = () => { const i = $("nmIn"); if (i && st && st.phase === "ask") try { i.focus({ preventScroll: true }); } catch (e) { i.focus(); } };
  /* ya contestado: un clic o Intro cierran antes de tiempo, pero no en el primer segundo (un doble clic no se come su respuesta) */
  const early = () => { if (st && st.phase === "done" && Date.now() - st.doneAt > 900) close(); };

  /* TU carta del socio (la de la portada: js/socio.js) con el hueco del nombre vacio: la casilla se escribe encima de su placa */
  function mountCard() {
    const host = $("nmScard"), sc = $("nmSc"), inp = $("nmIn"); if (!host || !A.socio) return;
    host._sig = ""; A.socio.mount(host, { w: 192 });
    host.onpointermove = null; host.onpointerleave = null;                  // sin inclinacion: la casilla va fija sobre la placa
    const place = () => {
      const n = host.querySelector(".sc-name"); if (!n || !n.isConnected) return;
      n.textContent = "";                                                    // el hueco queda vacio: lo que escribes lo pone la casilla
      let x = 0, y = 0, e = n; while (e && e !== sc) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
      const f = $("nmField"), cs = getComputedStyle(n); f.style.cssText = `left:${x}px;top:${y}px;width:${n.offsetWidth}px;height:${n.offsetHeight}px`;
      st && (st.fs = parseFloat(cs.fontSize) || 18); inp.style.fontSize = (st && st.fs || 18) + "px"; inp.style.lineHeight = n.offsetHeight + "px"; fitIn();
    };
    if (!host._nmWrapped) { const b = host._build; host._build = () => { b(); place(); }; host._nmWrapped = true; }
    place();
  }
  /* la letra baja de 1 en 1 hasta que el nombre cabe en la placa (nunca bajo 18 px) */
  function fitIn() {
    const inp = $("nmIn"); if (!inp) return; let fs = (st && st.fs) || 18; inp.style.fontSize = fs + "px";
    while (inp.scrollWidth > inp.clientWidth + 1 && fs > 18) { fs -= 1; inp.style.fontSize = fs + "px"; }
  }
  /* el contador de caracteres (rojo al llegar a 16) */
  function meter(n) { const o = $("nmN"); if (!o) return; o.textContent = n + "/" + MAX; o.classList.toggle("full", n >= MAX); $("nmCard").classList.toggle("empty", !n); }
  function typed(composing) {
    if (!st || st.phase !== "ask") return;
    const inp = $("nmIn"), raw = inp.value, v = clean(raw);
    if (v !== raw && !composing) { const at = Math.max(0, (inp.selectionStart || 0) - (raw.length - v.length)); inp.value = v; try { inp.setSelectionRange(at, at); } catch (e) { /* sin seleccion */ } }
    const n = len(composing ? v : inp.value), grew = n > st.len;               // mientras se compone no se toca la casilla (romperia el teclado): solo se cuenta
    if (n !== st.len) {
      A.sfx.key(grew ? n : -1);
      const f = $("nmField"); f.classList.remove("bump"); A.restyle(f); f.classList.add("bump");
    } else if (v !== raw && !composing) nope();                                            // un caracter que no vale (emoji, simbolo): no entra
    st.len = n; meter(n); fitIn();
  }
  function nope() { const d = $("nmField"); d.classList.remove("shake"); A.restyle(d); d.classList.add("shake"); A.sfx.key(-1); }

  function open(ctx) {
    build(); clearAll(); asked = true;
    st = { ctx, phase: "in", len: 0 };
    $("nmQ").textContent = $("nmQt").textContent = t6(TX.q); $("nmTitle").textContent = t6(TX.card); $("nmNo").textContent = memberNo();
    $("nmHint").textContent = t6(TX.hint); $("nmOkT").textContent = t6(TX.ok); $("nmSkipT").textContent = t6(TX.skip); $("nmStamp").textContent = t6(TX.stamp); $("nmNextT").textContent = t6(TX.next);
    const inp = $("nmIn"); inp.value = ""; inp.readOnly = false; inp.placeholder = t6(TX.ph); inp.setAttribute("aria-label", t6(TX.ph)); meter(0);
    root.className = "nm"; A.restyle(root); root.classList.add("on");  // la sala se apaga
    A.bulbFit($("nmCard")); mountCard();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // que un Espacio no pulse el boton del veredicto que queda detras
    A.dealer.hold(true); if (A.tt && A.tt.hide) A.tt.hide();
    A.music.muffle(true); A.sfx.spot();
    addEventListener("keydown", onKey, true);
    later(() => {                                                             // el foco se enciende y el crupier se asoma
      root.classList.add("spot"); A.dealer.dock($("nmStage"));
      A.dealer.say(A.dealer.pick("nameAsk"), { mood: "sly", hold: 0, force: true });
    }, 560);
    later(() => { root.classList.add("card-in"); A.sfx.card(); st.phase = "ask"; focusIn(); }, 1150);   // y te tiende su tarjeta
  }
  function confirm() {
    if (!st || st.phase !== "ask") return;
    const inp = $("nmIn"), v = clean(inp.value).trim();
    if (!v) { const f = $("nmField"); f.classList.remove("shake"); A.restyle(f); f.classList.add("shake"); A.sfx.deny(); focusIn(); return; }
    st.phase = "done"; st.doneAt = Date.now();
    const known = A.profile.knownName(v);                                     // antes de guardarlo: ¿ya se lo habias dicho alguna vez?
    inp.value = v; inp.readOnly = true; inp.blur(); meter(len(v));
    A.profile.setName(v); A.rank.rename(); A.dealer.noteName("named"); if (A.huevos && A.huevos.nombre) A.huevos.nombre(v);   // huevo: nombres con historia
    root.classList.add("signed"); A.sfx.sign(); burst();
    if (A.haptic) A.haptic([16, 40, 24]);                                    // respeta Ajustes > Vibracion
    later(() => A.dealer.say(A.dealer.pick(known ? "nameRecall" : "nameWelcome"), { mood: known ? "shock" : "sly", hold: 0, force: true, done: () => later(close, 900) }), 520);
    later(close, 14000);                                                      // red de seguridad
  }
  function skip() {
    if (!st || st.phase !== "ask") return;
    st.phase = "done"; st.doneAt = Date.now(); P().nameAsk = (P().nameAsk || 0) + 1; A.profile.save();
    const inp = $("nmIn"); inp.readOnly = true; inp.blur();
    root.classList.add("skipped"); A.sfx.card();
    A.dealer.say(A.dealer.pick(P().nameAsk >= 3 ? "nameSkipLast" : "nameSkip"), { mood: "angry", hold: 0, force: true, done: () => later(close, 700) });   // el tercero: no te lo vuelve a preguntar (y te pondra un mote)
    later(close, 12000);
  }
  function close() {
    if (!st || st.phase === "out") return;
    const ctx = st.ctx; st.phase = "out"; clearAll();
    removeEventListener("keydown", onKey, true);
    root.classList.add("out"); A.sfx.restore(); A.music.muffle(false);        // vuelve la luz
    setTimeout(() => {
      root.className = "nm hidden"; st = null;
      A.dealer.dock(null); A.dealer.release(); A.dealer.hold(false);
      const vd = $("vdDealer"); if (vd && A.dealer.on) A.dealer.anchor(vd);   // el crupier vuelve a su sitio en el veredicto
      if (ctx && ctx.after) setTimeout(ctx.after, 400);
    }, 520);
  }
  /* mientras esta abierto, el teclado es suyo (en captura, antes que nadie): nada de pausar, pantalla completa o pulsar el boton del veredicto
     que hay detras. La casilla y los botones de la tarjeta siguen funcionando (escribir, Intro envia el formulario, Tab salta entre ellos). */
  function onKey(e) {
    if (!st) return;
    e.stopPropagation();
    if (st.phase !== "ask" && st.phase !== "in") { if (!e.repeat && (e.key === "Enter" || e.key === "Escape" || e.key === " ")) { e.preventDefault(); early(); } return; }
    if (e.key === "Escape") { e.preventDefault(); skip(); return; }
    const inp = $("nmIn"), t = e.target;
    if (t === inp) {                                                          // ya hay 16: la tecla no entra y se nota
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing && len(inp.value) >= MAX && inp.selectionStart === inp.selectionEnd) nope();
      return;
    }
    if (e.key === "Tab" || (t && t.closest && t.closest(".nm-card button"))) return;
    if (e.key === "Enter") { e.preventDefault(); confirm(); } else if (e.key.length === 1) focusIn();
  }
  /* fichas de pixel que saltan del sello */
  function burst() {
    if (C() && C().S.reduce) return;
    const card = $("nmSc"), s = $("nmStamp"), cr = card.getBoundingClientRect(), sr = s.getBoundingClientRect(), k = cr.width / card.offsetWidth || 1;
    const b = document.createElement("i"); b.className = "nm-burst"; b.style.left = (sr.left + sr.width / 2 - cr.left) / k + "px"; b.style.top = (sr.top + sr.height / 2 - cr.top) / k + "px";
    b.innerHTML = Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2 + Math.random() * 0.35, d = 50 + Math.random() * 70; return `<i class="${["", "r", "w"][i % 3]}" style="--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d - 20).toFixed(0)}px;--r:${Math.round(Math.random() * 360)}deg"></i>`; }).join("");
    card.appendChild(b); setTimeout(() => b.remove(), 900);
  }

  /* ------------------------------------------------------------------ API */
  A.nombre = {
    open: () => !!st,
    /* al acabar una partida: si aun no tienes nombre (y no lo has rechazado 3 veces), pregunta en cuanto se asienta el veredicto.
       Si para entonces ya te has ido del veredicto, no pasa nada: preguntara al acabar la siguiente. */
    maybeAsk(ctx = {}) {
      if (dev || st || asked || P().name || (P().nameAsk || 0) >= 3) return false;
      const t0 = Date.now();
      const go = () => {
        if (st || P().name) return;
        const layer = $("layer"), vd = document.querySelector("#dlg.verdict .vd");
        if (!vd || !layer || layer.classList.contains("hidden")) return;
        const S = C() && C().S, busy = (A.tour && A.tour.active && A.tour.active()) || (S && S.settingsOpen) || !$("veil").classList.contains("hidden");
        if (busy) { if (Date.now() - t0 < 30000) setTimeout(go, 800); return; }
        open(ctx);
      };
      setTimeout(go, ctx.delay || 1500);
      return true;
    },
    /* Ajustes: guarda, lo lleva a las tablas y se lo cuenta al crupier (lo comenta la proxima vez que asome) */
    set(v) {
      const prev = P().name || "", name = clean(v).trim();
      if (name === prev) return Promise.resolve(name);
      const kind = !name ? "" : A.profile.knownName(name) && name.toLowerCase() !== prev.toLowerCase() ? "recall" : prev ? "renamed" : "welcome";
      A.profile.setName(name); if (kind && A.dealer.noteName) A.dealer.noteName(kind); if (name && A.huevos && A.huevos.nombre) A.huevos.nombre(name);   // huevo: nombres con historia
      return A.rank.rename().then(() => name, () => name);
    },
    /* Ajustes > General: la tarjeta "Tu nombre" (textos y valor; game.js la llama al abrir Ajustes y al cambiar de idioma) */
    sync() {
      const inp = $("setName"); if (!inp) return;
      $("setNameH").textContent = t6(TX.setH); $("setNameNote").textContent = t6(TX.setD); $("setNameNo").textContent = memberNo(); $("setNameOk").textContent = t6(TX.saved);
      inp.placeholder = t6(TX.anon); if (document.activeElement !== inp) inp.value = P().name || "";
    },
  };

  /* el campo de Ajustes: se limpia mientras escribes, se guarda al pulsar Intro o al salir de el; Esc deshace */
  (function wireSettings() {
    const inp = $("setName"); if (!inp) return; let okT = 0;
    inp.maxLength = MAX;
    inp.addEventListener("input", e => { if (e.isComposing) return; const v = clean(inp.value); if (v !== inp.value) inp.value = v; });
    inp.addEventListener("compositionend", () => { const v = clean(inp.value); if (v !== inp.value) inp.value = v; });
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); inp.blur(); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); inp.value = P().name || ""; inp.blur(); }
    });
    inp.addEventListener("change", () => {
      const before = P().name || "";
      A.nombre.set(inp.value); inp.value = P().name || "";
      if ((P().name || "") === before) return;
      const ok = $("setNameOk"); ok.classList.add("on"); A.sfx.buy(); clearTimeout(okT); okT = setTimeout(() => ok.classList.remove("on"), 1800);
    });
    A.nombre.sync();
  })();
})(window.AIQ);
