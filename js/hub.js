/*
 * Geolite - pantalla principal (v0.6): elige modo (Clasico, Aventura, Reto diario), Enciclopedia y Perfil.
 * Se apoya en A.core (lo publica game.js).
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const T = A.T, $ = id => document.getElementById(id), C = () => A.core;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const BOOK = () => A.icon("m_codex");
  /* solo el engranaje en la esquina: idioma, pantalla completa y el resto viven en Ajustes */
  const tools = () => `<div class="menu-tools"><button class="menu-gear" id="menuGear" aria-label="${A.t("tip.set")}" data-tip="tip.set">${A.icon("u_set")}</button></div>`;
  const wireTools = () => { const c = C(); $("menuGear").onclick = () => c.openSettings(!c.S.settingsOpen); };
  const top = (back) => `<div class="menu-top">${back ? `<button class="hub-back" id="hubBack">${A.icon("u_back", "sm")}${T("Menú", "Menu")}</button>` : `<img class="menu-rose" src="assets/icons/logo_mark.png" alt="" draggable="false">`}${tools()}</div>`;
  const shell = (inner, back) => `<div class="menu-in hub">${top(back)}${inner}<p class="menu-foot">Geolite · v${A.VERSION}</p></div>`;
  /* donde va una partida guardada (A.adv.summary): tras el Acto III ya no hay rondas numeradas (antes decia "Acto 4 · Ronda 1") */
  const CONT_RUN = () => A.pick6("Continuar expedición|Continue expedition|Reprendre l'expédition|Continuar expedição|Expedition fortsetzen|Riprendi la spedizione||继续远征|원정 계속하기|遠征を再開|Продолжить экспедицию|Kontynuuj wyprawę");
  /* la linea pequena del boton de continuar (portada y Aventura): trozos cortos sin puntos entre ellos (la ronda como en la ruta, 1-12; la ficha de la
     Ascension; la moneda; los puntos). Si no caben en una linea saltan trozos enteros: nunca queda un "· A1" suelto */
  const runLine = sv => [sv.inf || sv.act > 3 ? where(sv) : `${T("Ronda", "Round")} ${(sv.act - 1) * 4 + sv.round}/12`,
    sv.asc ? A.icon(STAKE_CHIP[sv.asc], "sb-coin") + "A" + sv.asc : "", A.icon("coin", "sb-coin") + sv.coins, `${A.fmt(sv.score)} ${T("pts", "pts")}`].filter(Boolean).map(x => `<span>${x}</span>`).join("");
  const where = sv => (sv.inf ? T("Modo infinito", "Infinite mode") : sv.act > 3 ? T("Tres actos completados", "Three acts completed") : `${T("Acto", "Act")} ${sv.act} · ${T("Ronda", "Round")} ${sv.round}${sv.asc ? " · A" + sv.asc : ""}`);

  /* ------------------------------------------------------------------ pantalla principal */
  /* placa de casino del pie de la portada (Enciclopedia, Clasificacion, Perfil): icono, nombre y una etiqueta como la de las cartas;
     pct (0-100) pinta la barra de progreso de la etiqueta. js/podio.js la usa para la Clasificacion */
  const plaque = (cls, id, ico, title, tag, pct, attrs = "", extra = "") => `<button class="plq ${cls}" id="${id}" type="button" ${attrs}>${extra}<span class="plq-ic">${A.icon(ico)}</span>
    <span class="plq-t"><b class="sq-fit">${title}</b><i class="plq-tag${pct == null ? "" : " bar"}"${pct == null ? "" : ` style="--p:${Math.min(100, pct).toFixed(1)}%"`}><span class="sq-fit">${tag}</span></i></span></button>`;
  /* nombres de las cartas: como mucho dos lineas. Una palabra muy larga en una carta estrecha (el aleman "Tagesherausforderung") llegaba a tres;
     se reduce la letra poco a poco (hasta un 25 %) hasta que quepa en dos. Se mide en px propios de la carta: ni el zoom ni el giro cambian la cuenta */
  const lineCount = el => { const cs = getComputedStyle(el), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize); return Math.round(el.offsetHeight / lh); };   // alto sin transformaciones (las cartas entran girando)
  const fitNames = () => document.querySelectorAll(".hh .mc-name").forEach(el => {
    el.style.fontSize = ""; if (lineCount(el) <= 2) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    for (let k = 0.94; k >= 0.74 && lineCount(el) > 2; k -= 0.04) el.style.fontSize = (fs * k).toFixed(1) + "px";
  });
  addEventListener("resize", () => { if (document.querySelector(".hh")) fitNames(); });
  function home() {
    pday = null;                                                      // la practica de otro dia se acaba al volver a la portada
    const c = C(), P = A.profile.get(), adv = P.adv, saved = A.adv.hasSave(), sm = saved && A.adv.summary(), cx = A.codexStats();
    /* carta del Reto diario: intento a medias, puntuacion global de hoy o los 3 intentos por estrenar */
    const today = A.rank.daily.board(), dst = A.rank.daily.get(today), dsv = A.adv.summary(true), dLive = dsv && dsv.board === today;
    const dMeta = dLive ? A.pick6("Intento {k}/3|Attempt {k}/3|Essai {k}/3|Tentativa {k}/3|Versuch {k}/3|Tentativo {k}/3||尝试 {k}/3|시도 {k}/3|挑戦 {k}/3|Попытка {k}/3|Podejście {k}/3").replace("{k}", dsv.dailyTry || 1)
      : dst.done ? `${A.fmt(dst.total)} · ${dst.done}/3`
      : A.pick6("Nuevo reto|New today|Nouveau défi|Novo desafio|Neu heute|Nuova sfida||新挑战|새 도전|新チャレンジ|Новый день|Nowe dziś");
    /* cada modo es una carta (sin indices de baraja: el marco y la ilustracion bastan); la descripcion solo sale al pasar el raton (ficha data-tt) */
    const BULBS = A.bulbs();                                          // bombillas de marquesina de la Aventura (js/art.js)
    const mc = (id, rank, suit, art, title, desc, meta, badge) => `<button class="mcard${id === "adventure" ? " hero" : ""}" data-mode="${id}" data-suit="${suit === "s_pin" || suit === "s_compass" ? "red" : "blk"}" ${A.ttAttr(title, desc)} aria-description="${esc(desc)}">
      ${id === "adventure" ? BULBS : ""}${badge ? `<span class="mc-ribbon">${badge}</span>` : ""}<span class="mc-win">${A.pic(art)}</span><b class="mc-name">${title}</b><span class="mc-stat sq-fit">${meta}</span></button>`;
    c.dialog(`<div class="hh">
      <div class="hh-top">${A.salir ? A.salir.button() : ""}<img class="hh-logo" src="assets/logo.png" alt="Geolite" onerror="this.outerHTML='<h1>Geo<em>lite</em></h1>'">${tools()}</div>
      <p class="hh-tag">${A.t("title.tag")}</p>
      <div class="hh-cards">
        ${mc("classic", "K", "s_palm", "card_classic", T("Clásico", "Classic"), T("Regiones del mundo, banderas, pistas, sucesos y personajes, contra el reloj.", "Regions of the world, flags, clues, events and famous people, against the clock."), T("Directo al grano", "No frills"))}
        ${mc("adventure", "A", "s_peak", "card_adv", T("Aventura", "Adventure"), T("Roguelike: el crupier cambia las reglas. Mapa a oscuras, del revés, letras que tiemblan… y reliquias para vencerlo.", "Roguelike: the dealer changes the rules. Dark maps, upside-down worlds, shaky letters… and relics to beat him."), saved ? T("▶ Guardada", "▶ Saved") : adv.bestScore ? T("Récord ", "Best ") + A.fmt(adv.bestScore) : T("Nueva", "New"), T("Modo principal", "Main mode"))}
        ${mc("daily", "Q", "s_compass", "card_compete", T("Reto diario", "Daily challenge"), A.pick6("Una expedición al azar, la misma para todos. 3 intentos que suman.|A random expedition, the same for everyone. 3 attempts, one combined score.|Une expédition au hasard, la même pour tous. 3 essais cumulés.|Expedição aleatória, igual para todos. 3 tentativas que somam.|Zufällige Expedition, für alle gleich. 3 Versuche, eine Summe.|Spedizione a caso, uguale per tutti. 3 tentativi che si sommano.||随机远征，人人相同。3 次尝试，分数累加。|모두에게 똑같은 무작위 원정. 시도 3번의 점수를 합산.|全員共通のランダム遠征。3回の挑戦を合計。|Случайная экспедиция, одна на всех. 3 попытки, очки складываются.|Losowa wyprawa, ta sama dla wszystkich. 3 podejścia, wyniki się sumują."), dMeta)}
      </div>
      <div class="hh-bottom">
        ${saved && sm ? `<div class="hh-resume">${startBtn("homeCont", CONT_RUN(), runLine(sm), true)}</div>` : ""}
        <div class="hh-deck">
          ${plaque("plq-codex", "codexBtn", "m_codex", A.t("codex.title"), `${A.fmt(cx.u)} / ${A.fmt(cx.t)}`, (100 * cx.u) / Math.max(1, cx.t), A.ttAttr(A.t("codex.title"), A.tip6("Fichas de lugares, historia y datos clave: se descubren acertando cerca.|Cards for places, history and key facts: found by pinning close.|Cartes de lieux, d'histoire et de faits clés : on les découvre en visant juste.|Cartas de lugares, história e dados-chave: descobertas ao acertar perto.|Karten zu Orten, Geschichte und Kernfakten: entdeckt durch genaue Treffer.|Schede di luoghi, storia e dati chiave: si scoprono colpendo vicino.||地点、历史与关键信息的卡片：准确标出即可发现。|장소, 역사, 핵심 정보 카드: 가깝게 맞히면 발견됩니다.|場所・歴史・重要な事実のカード：近くに当てると見つかる。|Карточки мест, истории и ключевых фактов: открываются точными попаданиями.|Karty miejsc, historii i kluczowych faktów: odkrywasz je celnymi trafieniami.")))}
          ${A.podio.button()}
          ${plaque("plq-prof", "profBtn", "m_prof", T("Perfil", "Profile"), `${A.icon("u_star")}${A.fmt(A.ach.count())} / ${A.fmt(A.ach.total())}`, (100 * A.ach.count()) / Math.max(1, A.ach.total()), A.ttAttr(T("Perfil", "Profile"), A.tip6("Tus estadísticas y tus logros.|Your stats and achievements.|Tes statistiques et tes succès.|Suas estatísticas e conquistas.|Deine Statistiken und Erfolge.|Le tue statistiche e i tuoi obiettivi.||你的统计数据和成就。|내 통계와 업적.|あなたの記録と実績。|Твоя статистика и достижения.|Twoje statystyki i osiągnięcia.")))}
        </div>
      </div></div>
      <span class="hh-ver">Geolite · v${A.VERSION}</span>${A.parche ? A.parche.button() : ""}`, "home");               // fuera de .hh: no cuenta para la composicion ni para A.fitK
    wireTools(); A.podio.wire(); if (A.parche) A.parche.wire();                                      // Clasificacion: js/podio.js
    fitNames(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNames);
    if (A.salir) A.salir.wire();                                      // salir del juego: js/salir.js
    $("codexBtn").onclick = () => A.codex.open();                     // la Enciclopedia ya suena al abrirse
    if (A.dealer && A.dealer.watchCards) A.dealer.watchCards(document.querySelector(".hh"));   // si miras mucho el Clasico, apaga las luces de su carta
    $("profBtn").onclick = () => { A.sfx.card(); screen("profile"); };
    document.querySelectorAll(".mcard").forEach(b => (b.onclick = () => { A.sfx.card(); screen(b.dataset.mode); }));
    if ($("homeCont")) $("homeCont").onclick = () => { A.sfx.depart(); enterRun(() => A.adv.resume(), true); };   // para empezar otra: la carta de la Aventura
  }

  /* ------------------------------------------------------------------ marco comun de las sub-pantallas (a pantalla completa, sobre el mapa) */
  const scr = (title, inner, cls = "", foot = "") => `<div class="scr ${cls}"><header class="scr-head"><button class="hub-back" id="hubBack">${A.icon("u_back", "sm")}${T("Menú", "Menu")}</button><h2>${title}</h2>${tools()}</header><div class="scr-body">${inner}</div>${foot}</div>`;   // foot: barra fija bajo la lista que se desplaza (Clasico)
  const startBtn = (id, big, small, primary, cls = "") => `<button class="startbtn${cls ? " " + cls : ""}" id="${id}" ${primary ? "data-primary" : ""}><span class="sb-ic">${A.icon("chip_r")}</span><span class="sb-t"><b>${big}</b><i>${small}</i></span><span class="sb-ar">${A.icon("u_next", "sm")}</span></button>`;

  /* ------------------------------------------------------------------ Clasico: campanas */
  /* portada de cada campana: minicarta pixel art (un protagonista sobre el foco de su color), assets/gen/camp_<id>.webp */
  const campArt = x => `assets/gen/camp_${x.id.replace(/^c-/, "")}.webp`;
  function campaigns(mode) {
    const c = C(), S = c.S; S.mode = mode; const camps = A.CAMPAIGNS.filter(x => x.mode === mode);
    if (!camps.find(x => x.id === S.campId)) { S.campId = camps[0].id; S.startLevel = 0; }
    const cur = camps.find(x => x.id === S.campId), pr = c.prog(cur.id); S.startLevel = Math.min(S.startLevel, pr.unlocked - 1);
    const list = camps.map((x, i) => {
      const p = c.prog(x.id), ticks = x.levels.map((_, k) => `<i class="${p.best && k < p.unlocked ? "on" : ""}"></i>`).join(""), md = A.profile.get().medals[x.id];
      return `<button class="camp${x.id === S.campId ? " sel" : ""}" data-id="${x.id}" style="animation-delay:${i * 60}ms"><img class="camp-thumb" src="${campArt(x)}" alt="" aria-hidden="true" draggable="false" decoding="async">
        <span class="camp-body"><span class="camp-t">${A.tx(x.title)}${md ? ` ${A.icon("medal_" + md, "sm")}` : ""}</span><span class="camp-d">${A.tx(x.blurb)}</span>
        <span class="camp-m"><span class="camp-p">${ticks}</span><span>${p.best ? A.t("camp.best", { s: A.fmt(p.best) }) : A.t("camp.new")}</span></span></span></button>`;
    }).join("");
    /* el pie (niveles + boton) se repinta solo: al elegir campana o nivel NO se rehace la pantalla (las tarjetas reaparecian y las miniaturas parpadeaban) */
    const foot = () => {
      const cu = camps.find(x => x.id === S.campId), pu = c.prog(cu.id); let picker = "";
      if (pu.unlocked > 1) { for (let i = 0; i < cu.levels.length; i++) picker += `<button class="lv${i === S.startLevel ? " sel" : ""}" data-lv="${i}" ${i >= pu.unlocked ? "disabled" : ""}>${i + 1}</button>`; picker = `<div class="picker"><span>${A.t("title.from")}</span><div class="lrail">${picker}</div></div>`; }
      return picker + startBtn("goBtn", A.t("go.label"), A.t("go.sub", { n: S.startLevel + 1, name: A.tx(cu.title) }), true);
    };
    const wireFoot = () => {
      document.querySelectorAll(".lv").forEach(b => (b.onclick = () => { S.startLevel = +b.dataset.lv; document.querySelectorAll(".lv").forEach(x => x.classList.toggle("sel", x === b)); const sub = $("goBtn").querySelector("i"); if (sub) sub.innerHTML = A.t("go.sub", { n: S.startLevel + 1, name: A.tx(camps.find(x => x.id === S.campId).title) }); }));
      $("goBtn").onclick = () => { A.sfx.depart(); S.ranked = null; c.newRun(); };
    };
    /* v0.3.22: la lista se desplaza (.scrolls: A.fitK ya no la encoge, la letra queda a tamano real tambien en la Steam Deck) y el pie se queda fijo debajo.
       v0.3.35 (.rows): siempre filas enteras a la vista, nunca una tarjeta cortada (A.fitK, js/game.js) */
    c.dialog(scr(T("Clásico", "Classic"), `<div class="camps">${list}</div>`, "s-camps scrolls rows", `<div class="camp-foot" id="campFoot">${foot()}</div>`), "tablewrap");
    wireTools(); $("hubBack").onclick = () => screen("home");
    document.querySelectorAll(".camp").forEach(b => (b.onclick = () => {
      if (b.dataset.id === S.campId) return;
      S.campId = b.dataset.id; S.startLevel = 0; c.save();
      document.querySelectorAll(".camp").forEach(x => { x.classList.toggle("sel", x === b); x.style.animation = "none"; });
      $("campFoot").innerHTML = foot(); wireFoot();
    }));
    wireFoot();
  }

  /* ------------------------------------------------------------------ Aventura */
  let advSel = { deck: "explorer", asc: 0 };
  const DECK_CARD = { explorer: ["A", "s_compass"], historian: ["K", "s_peak"], navigator: ["Q", "s_palm"], blind: ["J", "s_pin"] };
  const STAKE_CHIP = ["blank_small", "blank_teal", "blank_gold", "blank_big", "blank_boss", "blank_boss"];
  /* tanda 17: cada Ascension tiene nombre y una linea (A.adv.ascInfo, js/adventure.js); ascTexts: texto plano de los globos, ascHtml: el parrafo de la seleccion */
  const ascTexts = () => [T("Estándar", "Standard")].concat([1, 2, 3, 4, 5].map(i => { const x = A.adv.ascInfo(i); return `«${x.n}»: ${x.d}${x.k ? " " + x.k : ""}`; }));
  const ascHtml = i => { if (!i) return T("Estándar", "Standard"); const x = A.adv.ascInfo(i); return `<b>«${x.n}»</b> ${x.d}${x.k ? `<span class="as-k">${x.k}</span>` : ""}`; };
  function adventure() {
    const c = C(), P = A.profile.get(), adv = P.adv, D = A.ADV.DECKS, saved = A.adv.hasSave(), TN = A.ADV.TOPIC_NAMES, R = A.RELICS;
    const sm = saved && A.adv.summary();
    const decks = Object.keys(D).map(id => {
      const d = D[id], locked = A.adv.deckLocked(id), ach = locked && A.ACH.find(a => a.id === d.unlock), [rk, su] = DECK_CARD[id];
      const lockTxt = T("Logro: ", "Achievement: ") + (ach ? A.tx(ach.name) + " · " : "") + A.pick6("Supera la Ascensión {n}.|Beat Ascension {n}.|Réussis l'Ascension {n}.|Vença a Ascensão {n}.|Schließe Aufstieg {n} ab.|Supera l'Ascensione {n}.||通过进阶 {n}。|어센션 {n} 클리어.|アセンション{n}をクリア。|Пройди Восхождение {n}.|Pokonaj Wniebowstąpienie {n}.").replace("{n}", (d.asc || 0) + (d.asc ? " «" + A.adv.ascInfo(d.asc).n + "»" : ""));   // el logro que la abre y la Ascension que pide (las barajas se ganan superando Ascensiones)
      const kit = [...d.tools.map(t => `<span class="kt" ${A.kitTip("tool", t)}>${A.icon(A.ADV.TOOLS[t].ico, "kit")}</span>`), ...d.perks.map(p => `<span class="kt" ${A.kitTip("perk", p)}>${A.icon(p, "kit")}</span>`)].join("");
      const stat = `<em><span class="dc-stat">${A.icon("coin", "dc-ic")}${d.coins}</span><span class="dc-stat">${A.icon("heart", "dc-ic")}${d.lives}</span></em>`;
      return `<button class="dcard${advSel.deck === id ? " sel" : ""}${locked ? " lock" : ""}" data-deck="${id}" ${locked ? "disabled" : ""} data-suit="${su === "s_pin" || su === "s_compass" ? "red" : "blk"}"><span class="dc-art felt">${A.icon(d.ico)}${locked ? `<i class="dc-lock">${A.icon("lock")}</i>` : ""}</span><b class="dc-n">${A.tx(d.n)}</b><span class="dc-d">${locked ? lockTxt : A.tx(d.d)}</span><span class="dc-kit">${locked ? "" : kit}${stat}</span></button>`;
    }).join("");
    const ASC_TXT = ascTexts();
    let stakes = ""; for (let i = 0; i <= 5; i++) stakes += `<button class="stake${advSel.asc === i ? " sel" : ""}" data-asc="${i}" ${i > adv.asc ? "disabled" : ""} ${A.ttAttr(T("Ascensión", "Ascension") + " " + i, i > adv.asc ? A.tip6("Bloqueada: supera la ascensión anterior para desbloquearla.|Locked: beat the previous ascension to unlock it.|Verrouillée : réussis l'Ascension précédente pour la débloquer.|Bloqueada: vença a ascensão anterior para desbloqueá-la.|Gesperrt: schließe die vorige Stufe ab, um sie freizuschalten.|Bloccata: supera l'ascensione precedente per sbloccarla.||已锁定：通过上一级进阶即可解锁。|잠김: 이전 어센션을 클리어하면 열립니다.|ロック中：前のアセンションをクリアすると解除。|Заблокировано: пройди предыдущее восхождение, чтобы открыть.|Zablokowane: pokonaj poprzednie wniebowstąpienie, żeby odblokować.") : ASC_TXT[i])}>${A.icon(STAKE_CHIP[i])}<b>${i}</b></button>`;
    const ascTxt = ascHtml(advSel.asc);
    c.dialog(scr(T("Aventura", "Adventure"), `<div class="adv-setup">
      <section class="as-main">
        <h4 class="hub-sub">${T("Baraja inicial", "Starting deck")}</h4><div class="deckrow">${decks}</div>
        <h4 class="hub-sub">${T("Ruta de la expedición", "Expedition route")}</h4>${A.adv.road({ size: "plan" })}
      </section>
      <aside class="as-side">
        <h4 class="hub-sub">${T("Ascensión", "Ascension")}</h4><div class="stakes">${stakes}<span class="as-mult${advSel.asc ? "" : " off"}" ${A.ttAttr(T("Puntuación final", "Final score"), A.tip6("Al acabar la expedición, el total se multiplica según la Ascensión elegida. No cambia los objetivos de las rondas.|When the expedition ends, the total is multiplied by the chosen Ascension. It doesn't change the round targets.|À la fin de l'expédition, le total est multiplié selon l'Ascension choisie. Les objectifs des manches ne changent pas.|Ao fim da expedição, o total é multiplicado conforme a Ascensão escolhida. Os objetivos das rodadas não mudam.|Am Ende der Expedition wird die Summe mit dem gewählten Aufstieg multipliziert. Die Rundenziele ändern sich nicht.|Alla fine della spedizione il totale viene moltiplicato in base all'Ascensione scelta. Gli obiettivi dei round non cambiano.||远征结束时，总分会乘以所选进阶等级的倍率。不会改变各回合目标。|원정이 끝나면 선택한 어센션에 따라 총점에 배수가 곱해집니다. 라운드 목표는 그대로입니다.|遠征の終了時、合計スコアに選んだアセンションの倍率がかかります。ラウンドの目標は変わりません。|По окончании экспедиции итог умножается в зависимости от выбранного Восхождения. Цели раундов не меняются.|Po zakończeniu wyprawy suma jest mnożona przez wybrany poziom Wniebowstąpienia. Cele rund się nie zmieniają."))}>${A.pick6("Puntos|Score|Score|Pontos|Punkte|Punti||得分|점수|スコア|Очки|Wynik")} ×${A.adv.mulTxt(A.adv.ascMult(advSel.asc))}</span></div><p class="as-asc">${ascTxt}</p>
        <div class="adv-stats"><span>${T("Récord", "Best")} <b>${A.fmt(adv.bestScore)}</b></span><span>${T("Mejor ronda", "Best round")} <b>${adv.bestRound}</b></span><span>${T("Victorias", "Wins")} <b>${adv.wins}</b></span><span>${T("Expediciones", "Runs")} <b>${adv.runs}</b></span></div>
        <p class="as-relics">${A.icon("cards", "sm")}${A.RELIC_IDS.length} ${T("reliquias por descubrir", "relics to discover")}</p>
        <div class="as-go">${sm ? startBtn("contBtn", CONT_RUN(), runLine(sm), true) : ""}${startBtn("goBtn", T("Nueva expedición", "New expedition"), `<span>${A.tx(D[advSel.deck].n)}</span><span>${A.icon(STAKE_CHIP[advSel.asc], "sb-coin")}${T("Ascensión", "Ascension")} ${advSel.asc}</span>`, !saved, saved ? "alt" : "")}</div>
      </aside></div>`, "s-adv"), "tablewrap");
    wireTools(); $("hubBack").onclick = () => screen("home");
    document.querySelectorAll(".dcard").forEach(b => (b.onclick = () => { advSel.deck = b.dataset.deck; A.sfx.card(); adventure(); }));
    document.querySelectorAll(".stake").forEach(b => (b.onclick = () => { advSel.asc = +b.dataset.asc; A.sfx.ui(); adventure(); }));
    const confirm2 = (btn, msg, act, onArm) => { let armed = false, tm = 0; const html = btn.innerHTML; btn.addEventListener("click", e => { if (armed) { clearTimeout(tm); return act(); } e.stopImmediatePropagation(); armed = true; if (onArm) onArm(); btn.classList.add("armed"); (btn.querySelector("b") || btn).textContent = msg; A.sfx.deny(); tm = setTimeout(() => { armed = false; btn.classList.remove("armed"); btn.innerHTML = html; }, 4000); }, true); };
    const funeral = () => { if (A.dealer && A.dealer.funeral) A.dealer.funeral(A.adv.summary && A.adv.summary()); };   // el crupier le hace un funeral a tu expedicion guardada
    if (saved) $("contBtn").onclick = () => { A.sfx.depart(); enterRun(() => A.adv.resume(), true); };   // descartarla = empezar otra (doble pulsacion y funeral del crupier)
    $("goBtn").onclick = () => { A.sfx.depart(); if (saved) A.adv.abandon(); enterRun(() => A.adv.begin({ deck: advSel.deck, asc: advSel.asc })); };
    if (saved) confirm2($("goBtn"), T("Esto borra tu partida guardada. Pulsa otra vez", "This deletes your saved run. Press again"), () => {}, funeral);
  }
  function enterRun(fn, resume) { const c = C(); c.S.ranked = null; c.prepareRun(resume); fn(); }   // resume: seguir una partida guardada no es una partida nueva (stats.plays, ver game.js prepareRun)

  /* ------------------------------------------------------------------ Reto diario: una expedicion al azar cada dia, la misma para todo el mundo.
     La MANO DEL DIA (baraja, ascension, regalo y ruta) sale de la semilla del dia; 3 intentos con lugares nuevos que suman la puntuacion global (A.rank.daily) */
  let board = "today", tickT = 0, pday = null, bpage = 0;           // pday: el dia pasado que estas practicando (v0.3.19, js/otrodia.js); bpage: pagina de la tabla
  const P6 = s => A.pick6(s);
  const locOf = () => (A.LANGS.find(l => l.code === A.lang) || A.LANGS[0]).loc;
  const hms = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(v => String(v).padStart(2, "0")).join(":"); };
  const actRound = where;
  /* v0.3.45: Naipe de gala, "la mano sobre la mesa" (mesa de diseño, paso 3). 12 columnas: la mesa de fieltro (1-8) con la mano del dia como tres
     naipes que dicen que hace cada carta, la ruta completa y los tres intentos como tres fichas que se gastan, con la puntuacion global y el boton;
     la pizarra de papel (9-12) con Hoy y Ayer, tus cifras y la cuenta atras. Fieltro opaco: el mapa de detras deja de dibujarse (A.coverMap) */
  const ATT_CHIP = ["blank_big", "blank_teal", "blank_boss"];          // la ficha de cada intento (1, 2 y 3)
  /* lo que se pinta (sin efectos: tambien lo usa el precalentamiento de la puerta, A.gala.warm) */
  function dyHtml(sv, st, prac, day) {
    const DY = A.rank.daily;
    const dShort = DY.date(day).toLocaleDateString(locOf(), { day: "numeric", month: "long" });
    const dLong = DY.date(day).toLocaleDateString(locOf(), { weekday: "long", day: "numeric", month: "long" });
    const h = DY.hand(day), deck = A.ADV.DECKS[h.deck], gift = h.gift && A.RELICS[h.gift], next = st.tries.length + 1, locked = A.adv.deckLocked(h.deck), hist = DY.stats();
    /* la mano: tres naipes de papel con su pieza, el nombre y LO QUE HACE (antes solo al pasar el raton) */
    const nk = (art, eyb, name, txt, tip = "") => `<div class="gx-paper dia-nk" ${tip || A.ttAttr(name, txt)}><span class="dia-art">${art}</span><span class="dia-nt"><span class="gx-eyb">${eyb}</span><b>${name}</b></span><i>${txt}</i></div>`;
    const ai = h.asc ? A.adv.ascInfo(h.asc) : null;
    const lockNote = locked ? " " + P6("Hoy la juegas aunque aún no la hayas desbloqueado.|You can play it today even if you haven't unlocked it yet.|Aujourd'hui, tu la joues même sans l'avoir débloquée.|Hoje você joga com ele mesmo sem tê-lo desbloqueado.|Heute spielst du es, auch wenn du es noch nicht freigeschaltet hast.|Oggi lo giochi anche se non l'hai ancora sbloccato.||即使尚未解锁，今天也能使用。|아직 잠금 해제하지 않았어도 오늘은 쓸 수 있어요.|まだ解放していなくても、今日は使える。|Сегодня она доступна, даже если ещё не открыта.|Dziś grasz nią, nawet jeśli nie masz jej jeszcze odblokowanej.") : "";
    const mano = nk(A.icon(deck.ico), P6("Baraja|Deck|Paquet|Baralho|Deck|Mazzo||套牌|덱|デッキ|Колода|Talia"), A.tx(deck.n), A.tx(deck.d) + lockNote)
      + nk(`<span class="dia-asc">${A.icon(STAKE_CHIP[h.asc])}${h.asc ? `<em>${h.asc}</em>` : ""}</span>`, T("Ascensión", "Ascension") + (h.asc ? " " + h.asc : ""), ai ? ai.n : T("Estándar", "Standard"),
        ai ? ai.d : P6("Sin reglas extra: la expedición de siempre.|No extra rules: the usual expedition.|Sans règles en plus : l'expédition habituelle.|Sem regras extras: a expedição de sempre.|Keine Zusatzregeln: die übliche Expedition.|Nessuna regola extra: la solita spedizione.||没有额外规则：一如往常的远征。|추가 규칙 없음: 평소와 같은 원정.|追加ルールなし：いつもの遠征。|Без дополнительных правил: обычная экспедиция.|Bez dodatkowych zasad: zwykła wyprawa."),
        ai && ai.k ? A.ttAttr(T("Ascensión", "Ascension") + " " + h.asc, ascTexts()[h.asc]) : "")
      + (gift ? nk(A.icon(h.gift), P6("Regalo|Gift|Cadeau|Presente|Geschenk|Regalo||赠礼|선물|贈り物|Подарок|Prezent"), A.tx(gift.n), A.tx(gift.d))
        : nk(A.icon("u_star"), P6("Regalo|Gift|Cadeau|Presente|Geschenk|Regalo||赠礼|선물|贈り物|Подарок|Prezent"), P6("Hoy, ninguno|None today|Aucun aujourd'hui|Nenhum hoje|Heute keins|Oggi nessuno||今天没有|오늘은 없음|今日はなし|Сегодня нет|Dziś brak"),
          P6("La casa no regala nada hoy: juegas con lo que trae la baraja.|The house gives nothing away today: you play with what the deck brings.|La maison n'offre rien aujourd'hui : tu joues avec ce qu'apporte le paquet.|A casa não dá nada hoje: você joga com o que o baralho traz.|Das Haus schenkt heute nichts: Du spielst mit dem, was das Deck mitbringt.|La casa oggi non regala nulla: giochi con quello che porta il mazzo.||今天赌场什么都不送：你只能用套牌自带的东西。|오늘은 하우스가 아무것도 주지 않아요. 덱에 든 것으로 플레이해요.|今日はハウスから贈り物なし。デッキの中身で戦う。|Сегодня заведение ничего не дарит: играешь тем, что даёт колода.|Kasyno nic dziś nie daje: grasz tym, co ma talia.")));
    /* los tres intentos: tres fichas que se gastan (jugado: su puntuacion; en juego: lo que llevas; el siguiente, encendido) */
    const ROUNDS = r => P6("{r} rondas|{r} rounds|{r} manches|{r} rodadas|{r} Runden|{r} round||{r} 回合|{r}라운드|{r}ラウンド|Раунды: {r}|Rundy: {r}").replace("{r}", r || 0);
    const TO_PLAY = P6("Por jugar|To play|À jouer|Pendente|Offen|Da giocare||待进行|미플레이|未挑戦|Не сыграна|Do rozegrania");
    const fichas = [1, 2, 3].map(k => {
      const t = st.tries[k - 1], live = !!(t && t.live), chip = `<span class="dia-chip">${A.icon(ATT_CHIP[k - 1])}<em>${k}</em></span>`;
      if (prac) return `<button type="button" class="dia-fi dr-try prac${t && !t.live ? " used" : ""}" data-k="${k}"${k === 1 ? " data-primary" : ""}>${chip}<b>${t && !t.live ? A.fmt(t.s || 0) : "—"}</b><i>${A.icon("u_next", "sm")}${P6("Practicar|Practice|S'entraîner|Treinar|Trainieren|Allenati||练习|연습|練習|Тренировать|Trenuj")}</i></button>`;
      const cls = live ? "live" : t ? "used" : k === next && !st.live ? "next" : "free";
      const big = live ? A.fmt(sv ? sv.score : 0) : t ? A.fmt(t.s || 0) : "—", small = live ? (sv ? actRound(sv) : "…") : t ? ROUNDS(t.r) : TO_PLAY;
      return `<div class="dia-fi ${cls}">${chip}<b>${big}</b><i>${small}</i></div>`;
    }).join("");
    const goLbl = prac ? P6("Practicar el intento {k}|Practice attempt {k}|S'entraîner à l'essai {k}|Treinar a tentativa {k}|Versuch {k} trainieren|Allenati sul tentativo {k}||练习第 {k} 次尝试|{k}번째 시도 연습|挑戦{k}回目を練習|Тренировать попытку {k}|Trenuj podejście {k}").replace("{k}", 1)
      : sv ? P6("Continuar el intento {k}|Continue attempt {k}|Reprendre l'essai {k}|Continuar a tentativa {k}|Versuch {k} fortsetzen|Riprendi il tentativo {k}||继续第 {k} 次尝试|{k}번째 시도 계속하기|挑戦{k}回目を続ける|Продолжить попытку {k}|Kontynuuj podejście {k}").replace("{k}", sv.dailyTry || st.live)
      : st.left > 0 ? P6("Jugar el intento {k}|Play attempt {k}|Jouer l'essai {k}|Jogar a tentativa {k}|Versuch {k} spielen|Gioca il tentativo {k}||开始第 {k} 次尝试|{k}번째 시도 시작|挑戦{k}回目へ|Сыграть попытку {k}|Zagraj podejście {k}").replace("{k}", next) : "";
    const goSub = prac ? P6("Mismos lugares que ese día|Same places as that day|Mêmes lieux que ce jour-là|Mesmos lugares daquele dia|Dieselben Orte wie an dem Tag|Stessi luoghi di quel giorno||与那天相同的地点|그날과 같은 장소|その日と同じ場所|Те же места, что в тот день|Te same miejsca co tego dnia")
      : sv ? actRound(sv) : P6("Lugares y retos nuevos|New places, new challenges|Nouveaux lieux et défis|Novos lugares e desafios|Neue Orte, neue Herausforderungen|Nuovi luoghi e sfide||全新地点与挑战|새로운 장소와 도전|新しい場所とチャレンジ|Новые места и испытания|Nowe miejsca i wyzwania");
    const go = prac ? `<span class="dia-sub">${P6("Pulsa una ficha para practicar ese intento.|Press a chip to practice that attempt.|Appuie sur un jeton pour t'entraîner sur cet essai.|Toque numa ficha para treinar essa tentativa.|Drück einen Chip, um diesen Versuch zu trainieren.|Premi una fiche per allenarti su quel tentativo.||点一枚筹码来练习那次尝试。|칩을 눌러 그 시도를 연습해요.|チップを押すとその挑戦を練習できる。|Нажми на фишку, чтобы потренировать эту попытку.|Naciśnij żeton, by potrenować to podejście.")}</span>`
      : goLbl ? `<button type="button" class="gx-btn pri" id="dailyGo" data-primary><span>${goLbl}</span>${A.gala.keyHint("Enter", "a")}</button><span class="dia-sub">${goSub}</span>`
      : `<div class="dia-done">${A.icon("u_star")}<span><b>${P6("¡Reto completado!|Challenge complete!|Défi terminé !|Desafio concluído!|Herausforderung geschafft!|Sfida completata!||挑战完成！|도전 완료!|チャレンジ達成！|Испытание пройдено!|Wyzwanie ukończone!")}</b><i>${P6("Mañana, otra mano|Tomorrow, a new hand|Demain, une nouvelle main|Amanhã, uma nova mão|Morgen ein neues Blatt|Domani, una nuova mano|Mañana, otra mano|明天，再发一手新牌|내일은 새로운 패|明日は新しい手札|Завтра новая раздача|Jutro nowe rozdanie")}</i></span></div>`;
    const sumLbl = prac ? P6("Tu puntuación ese día|Your score that day|Ton score ce jour-là|Sua pontuação naquele dia|Deine Punkte an dem Tag|Il tuo punteggio quel giorno||你那天的得分|그날의 점수|その日のスコア|Твой счёт в тот день|Twój wynik tego dnia") : P6("Puntuación global|Global score|Score global|Pontuação global|Gesamtpunktzahl|Punteggio globale||总分|총점|総合スコア|Общий счёт|Wynik łączny");
    const sumTip = prac ? P6("Práctica: no cuenta para la clasificación|Practice: doesn't count for the leaderboard|Entraînement : ne compte pas pour le classement|Treino: não conta para o placar|Training: zählt nicht für die Rangliste|Allenamento: non conta per la classifica||练习：不计入排行榜|연습: 리더보드 미반영|練習：ランキング対象外|Тренировка: в таблицу не идёт|Trening: nie liczy się do rankingu") : P6("Suma de tus 3 intentos|Sum of your 3 attempts|Somme de tes 3 essais|Soma das suas 3 tentativas|Summe deiner 3 Versuche|Somma dei tuoi 3 tentativi||你 3 次尝试的总和|시도 3번의 합계|3回の挑戦の合計|Сумма трёх попыток|Suma twoich 3 podejść");
    const sumVal = st.done ? A.fmt(st.total) : "—";                     // sin jugar, una raya (el "0" de la letra de cifras parecia un bloque)
    const clock = `<p class="dia-clock" ${A.ttAttr(P6("Nuevo reto en|New challenge in|Nouveau défi dans|Novo desafio em|Neue Herausforderung in|Nuova sfida tra||新挑战倒计时|새 도전까지|次のチャレンジまで|Новое испытание через|Nowe wyzwanie za"), P6("El reto cambia a tu medianoche. Los intentos que no juegues hoy se pierden.|The challenge changes at your midnight. Attempts you don't play today are lost.|Le défi change à minuit, heure locale. Les essais non joués aujourd'hui sont perdus.|O desafio muda à sua meia-noite. As tentativas que você não jogar hoje se perdem.|Die Herausforderung wechselt um deine Mitternacht. Nicht gespielte Versuche verfallen.|La sfida cambia alla tua mezzanotte. I tentativi non giocati oggi vanno persi.||挑战在你当地的午夜更换。今天没用掉的尝试会作废。|도전은 현지 시간 자정에 바뀌어요. 오늘 하지 않은 시도는 사라져요.|デイリーチャレンジは現地時間の深夜0時に切り替わる。今日プレイしなかった挑戦は消える。|Испытание меняется в твою полночь. Несыгранные сегодня попытки сгорают.|Wyzwanie zmienia się o twojej północy. Niezagrane dziś podejścia przepadają."))}>${A.icon("hourglass")}<span>${P6("Nuevo reto en|Next one in|Prochain dans|Próximo em|Nächste in|Prossima tra||下次挑战|다음 도전까지|次のチャレンジまで|Новое через|Następne za")}</span><b id="drClock">${hms(DY.msToNext())}</b></p>`;
    const backToday = `<button type="button" class="gx-btn sm dia-today" id="drToday">${A.icon("u_back")}<span>${P6("Volver a hoy|Back to today|Retour à aujourd'hui|Voltar para hoje|Zurück zu heute|Torna a oggi||回到今天|오늘로 돌아가기|今日に戻る|Вернуться к сегодня|Wróć do dziś")}</span></button>`;
    /* la tabla de aqui es solo del Reto diario (la Aventura esta en la Clasificacion de la portada); en la practica, la de ese dia */
    const tabs = prac ? [["prac", dShort]] : [["today", P6("Hoy|Today|Aujourd'hui|Hoje|Heute|Oggi||今天|오늘|今日|Сегодня|Dziś")], ["yday", P6("Ayer|Yesterday|Hier|Ontem|Gestern|Ieri||昨天|어제|昨日|Вчера|Wczoraj")]];
    const OTRO = P6("Otro día|Another day|Un autre jour|Outro dia|Anderer Tag|Altro giorno||其他日期|다른 날|別の日|Другой день|Inny dzień");
    const otherBtn = `<button type="button" class="gx-btn sm dia-other" id="drOther" ${A.ttAttr(OTRO, A.otroDia.SUB())}>${A.icon("almanac")}<span>${OTRO}</span></button>`;
    const seedTip = A.ttAttr(P6("Semilla del día|Daily seed|Graine du jour|Semente do dia|Seed des Tages|Seme del giorno||今日种子|오늘의 시드|今日のシード|Зерно дня|Ziarno dnia") + " · " + DY.code(day), P6("La mano de hoy sale al azar de esta semilla y todo el mundo juega con ella: la misma mano y, en cada intento, los mismos lugares, retos y cartas.|Today's hand is dealt at random from this seed and everyone plays with it: the same hand and, in each attempt, the same places, challenges and cards.|La main du jour est tirée au hasard de cette graine et tout le monde joue avec : la même main et, à chaque essai, les mêmes lieux, défis et cartes.|A mão de hoje é sorteada a partir desta semente e todo mundo joga com ela: a mesma mão e, em cada tentativa, os mesmos lugares, desafios e cartas.|Das heutige Blatt wird zufällig aus diesem Seed gezogen, und alle spielen damit: dasselbe Blatt und in jedem Versuch dieselben Orte, Herausforderungen und Karten.|La mano di oggi esce a caso da questo seme ed è uguale per tutti: la stessa mano e, a ogni tentativo, gli stessi luoghi, sfide e carte.||今日手牌由这个种子随机发出，所有人都用它：同一手牌，每次尝试的地点、挑战和卡牌也都相同。|오늘의 패는 이 시드로 무작위로 나오고 모두가 같이 써요. 같은 패, 그리고 시도마다 같은 장소·도전·카드.|今日の手札はこのシードからランダムに配られ、全員がそれで遊ぶ。同じ手札、そして各挑戦で同じ場所・チャレンジ・カード。|Раздача дня генерируется из этого зерна, и у всех она одна: та же раздача, а в каждой попытке — те же места, испытания и карты.|Dzisiejsze rozdanie jest losowane z tego ziarna i wszyscy nim grają: to samo rozdanie i w każdym podejściu te same miejsca, wyzwania i karty."));
    const stat = (l, v) => `<div class="gx-lead-row"><span>${l}</span><s></s><b>${v}</b></div>`;
    return `<div class="gx-veil"></div><section class="dia-screen gx-stage s-daily${prac ? " s-prac" : ""}" aria-labelledby="diaH" data-nosq>
      <div class="gx-grid dia-grid">
        <header class="dia-head"><button type="button" class="gx-btn sm" id="hubBack">${A.icon("u_back")}<span>${A.t("set.close")}</span>${A.gala.keyHint("Esc", "b")}</button>
          <h2 class="gx-t-l dia-h" id="diaH"><span class="dia-hic">${A.icon("dice")}</span>${T("Reto diario", "Daily challenge")}</h2>
          <span class="dia-meta"><span class="dia-seed" ${seedTip}>${A.icon("dice")}<b>${DY.code(day)}</b></span>${otherBtn}</span>${tools()}</header>
        <div class="gx-sh dia-left"><section class="gx-pnl dia-mesa">
          <div class="dia-mh"><h3 class="gx-t-m" ${A.ttAttr(prac ? P6("La mano del {d}|The hand of {d}|La main du {d}|A mão de {d}|Das Blatt vom {d}|La mano del {d}||{d} 的手牌|{d}의 패|{d}の手札|Раздача за {d}|Rozdanie z {d}").replace("{d}", dShort) : P6("La mano de hoy|Today's hand|La main du jour|A mão de hoje|Das Blatt von heute|La mano di oggi||今日手牌|오늘의 패|今日の手札|Раздача дня|Dzisiejsze rozdanie"), P6("Sale al azar de la semilla del día y es la misma para todo el mundo.|Dealt at random from the day's seed, and the same for everyone.|Tirée au hasard de la graine du jour, et la même pour tout le monde.|É sorteada a partir da semente do dia e é a mesma para todo mundo.|Zufällig aus dem Seed des Tages gezogen und für alle gleich.|Esce a caso dal seme del giorno ed è la stessa per tutti.||由今日种子随机发出，所有人都一样。|오늘의 시드로 무작위로 나오며, 모두에게 똑같아요.|今日のシードからランダムに配られ、全員共通。|Выпадает случайно из зерна дня и одинакова для всех.|Losowane z ziarna dnia i takie samo dla wszystkich."))}>${prac ? P6("La mano del {d}|The hand of {d}|La main du {d}|A mão de {d}|Das Blatt vom {d}|La mano del {d}||{d} 的手牌|{d}의 패|{d}の手札|Раздача за {d}|Rozdanie z {d}").replace("{d}", dShort) : P6("La mano de hoy|Today's hand|La main du jour|A mão de hoje|Das Blatt von heute|La mano di oggi||今日手牌|오늘의 패|今日の手札|Раздача дня|Dzisiejsze rozdanie")}</h3>${prac ? `<span class="dia-ptag">${P6("Práctica|Practice|Entraînement|Treino|Training|Allenamento||练习|연습|練習|Тренировка|Trening")}</span>` : `<span class="dia-date">${dLong}</span>`}</div>
          <div class="dia-mano">${mano}</div>
          <div class="dia-ruta">${A.adv.road({ size: "plan", route: h.route })}</div>
          <div class="dia-int"><div class="dia-fichas">${fichas}</div>
            <div class="dia-tot"><span class="dia-sum" ${A.ttAttr(sumLbl, sumTip)}><span>${sumLbl}</span><b>${prac && !st.done ? "—" : sumVal}</b></span><div class="dia-go">${go}</div></div></div>
        </section></div>
        <div class="gx-sh dia-right"><div class="gx-paper dia-board">
          <div class="gx-seg dr-tabs">${tabs.map(([id, l]) => `<button type="button" class="${id === board ? "on" : ""}" data-b="${id}">${l}</button>`).join("")}</div>
          <div class="lb" id="lb"><p class="lb-load">…</p></div>
          <div class="pd-pager dr-pager" id="drPager"></div>
          <div class="dia-stats">${stat(P6("Días jugados|Days played|Jours joués|Dias jogados|Gespielte Tage|Giorni giocati||已玩天数|플레이한 날|プレイ日数|Дней сыграно|Dni gry"), A.fmt(hist.days))}${stat(P6("Días seguidos|Days in a row|Jours d'affilée|Dias seguidos|Tage in Folge|Giorni di fila||连续天数|연속 일수|連続日数|Дней подряд|Dni z rzędu"), A.fmt(hist.streak))}${stat(P6("Mejor día|Best day|Meilleur jour|Melhor dia|Bester Tag|Giorno migliore||最佳一天|최고의 날|ベストの日|Лучший день|Najlepszy dzień"), hist.best ? A.fmt(hist.best) : "—")}</div>
          ${prac ? backToday : clock}
        </div></div>
      </div></section>`;
  }
  function daily() {
    const c = C(), DY = A.rank.daily, today = DY.board();
    clearInterval(tickT);
    /* intentos a medias: el de otro dia se cierra con los puntos que llevaba; el de hoy sin partida guardada (se perdio) se cierra a cero */
    let sv = A.adv.summary(true);
    if (sv && sv.board !== today) { A.adv.abandon(true); sv = null; }
    let st = DY.get(today);
    if (st.live && !sv) { DY.finish(today, st.live, 0); st = DY.get(today); }
    /* PRACTICA (v0.3.19): la mano de un dia pasado, elegido en el calendario de "Otro dia". Ensena lo que hiciste ese dia y cada intento se practica
       las veces que quieras (A.adv.beginPractice): sin clasificacion, logros ni records */
    if (pday && pday >= today) pday = null;
    const prac = pday, day = prac || today;
    if (prac) { sv = null; st = DY.get(prac); }
    if (prac) board = "prac"; else if (board !== "yday") board = "today";
    c.dialog(dyHtml(sv, st, prac, day), "tablewrap");
    wireTools(); $("hubBack").onclick = () => { clearInterval(tickT); pday = null; screen("home"); };
    /* un nombre de una sola palabra que no cabe en su naipe ("Исследователь"): la letra baja de punto en punto, nunca por debajo de los 18 px de la Deck */
    document.querySelectorAll(".dia-nt b").forEach(b => { for (let f = 22; f > 18 && b.scrollWidth > b.clientWidth + 1; ) b.style.fontSize = --f + "px"; });
    if (A.coverMap) A.coverMap("daily", true, () => !!document.querySelector("#dlg .dia-screen") && !$("layer").classList.contains("hidden"));   // fieltro opaco: el mapa de detras deja de dibujarse
    /* el nombre NO se cambia aqui: te lo pide el crupier al acabar tu primera partida y despues solo en Ajustes > General (js/nombre.js) */
    document.querySelectorAll(".dr-tabs button").forEach(b => (b.onclick = () => { if (b.dataset.b === board) return; board = b.dataset.b; document.querySelectorAll(".dr-tabs button").forEach(x => x.classList.toggle("on", x === b)); A.sfx.ui(); bpage = 0; loadBoard(); }));
    const practice = k => { A.sfx.depart(); clearInterval(tickT); enterRun(() => A.adv.beginPractice(prac, k)); };
    if ($("dailyGo")) $("dailyGo").onclick = prac ? () => practice(1) : () => { A.sfx.depart(); clearInterval(tickT); enterRun(() => (sv ? A.adv.resume(true) : A.adv.beginDaily(day)), !!sv); };
    document.querySelectorAll(".dr-try.prac").forEach(b => (b.onclick = () => practice(+b.dataset.k)));
    if ($("drToday")) $("drToday").onclick = () => { pday = null; A.sfx.card(); daily(); };
    /* "Otro dia": el calendario (js/otrodia.js). Elegir un dia pasado reparte su mano aqui mismo; elegir hoy vuelve al reto de verdad */
    $("drOther").onclick = () => A.otroDia.open({ sel: day, from: $("drOther"), pick: b => { pday = b >= DY.board() ? null : b; bpage = 0; A.sfx.card(); daily(); } });
    /* cuenta atras hasta tu medianoche; al cambiar de dia, la pantalla se reparte sola */
    if (!prac) tickT = setInterval(() => {
      const el = $("drClock"); if (!el) return clearInterval(tickT);
      if (DY.board() !== day) { clearInterval(tickT); if (C().S.phase === "title" && C().S.hub === "daily") daily(); return; }
      el.textContent = hms(DY.msToNext());
    }, 1000);
    loadBoard();
  }
  const BROWS = 8;                                                    // 8 por pagina + tu puesto: cabe entero sin encoger la pantalla (la primera, la misma peticion que el podio de la portada)
  let bseq = 0, bcount = 0;
  async function loadBoard(dir = 0) {
    const el = $("lb"); if (!el) return; const DY = A.rank.daily, P = A.profile.get(), my = P.id, tab = board, n = ++bseq, pg = bpage;
    const b = tab === "prac" && pday ? pday : tab === "yday" ? DY.yesterday() : DY.board();
    if (!dir) { bcount = 0; el.innerHTML = `<p class="lb-load">…</p>`; }
    else el.style.position = "relative";                               // A.gala.turn pone la copia de la lista vieja encima, en su sitio
    pager(dir ? bcount : 0);
    const res = await A.rank.topC(b, BROWS, 30000, pg * BROWS); if (n !== bseq || tab !== board || !$("lb")) return;
    const rows = res.rows || [], inPage = rows.some(r => r.id === my);
    const dots = r => `<span class="lb-tries">${[0, 1, 2].map(i => `<i class="${r.tries && i < r.tries.length ? "on" : ""}"></i>`).join("")}</span>`;
    const li = (r, k, i) => `<li class="${r.id === my ? "me" : ""}" style="--i:${i}"><span class="lb-n">${k <= 3 ? A.icon("medal_" + ["gold", "silver", "bronze"][k - 1], "sm") : A.fmt(k)}</span><span class="lb-name">${esc(r.name || "—")}</span>${dots(r)}<b>${A.fmt(r.score)}</b></li>`;
    const myPage = res.me ? Math.floor((res.me.rank - 1) / BROWS) : -1;
    const mine = res.me && !inPage ? `<li class="lb-gap" aria-hidden="true">···</li>` + li({ id: my, name: A.rank.name(), score: res.me.score, tries: DY.get(b).tries.filter(t => !t.live) }, res.me.rank, rows.length).replace("<li class=\"me\"", `<li class="me${myPage >= 0 && myPage !== pg ? " jump" : ""}" id="lbMe"`) : "";
    bcount = res.count || rows.length;
    const ol = el.querySelector("ol.dy"), items = rows.map((r, i) => li(r, pg * BROWS + i + 1, i)).join("") + mine;
    if (dir && ol && rows.length) A.gala.turn(ol, items, dir);          // v0.3.43: pasar pagina fluido (A.gala.turn), sin rehacer la tabla
    else el.innerHTML = `<p class="lb-src">${A.podio.src(res)}</p>` + (rows.length ? `<ol class="dy">${items}</ol>` : `<p class="lb-empty">${T("Aún no hay puntuaciones. ¡Sé el primero!", "No scores yet. Be the first!")}</p>`);
    [pg - 1, pg + 1].forEach(q => { if (q >= 0 && q * BROWS < bcount) A.rank.topC(b, BROWS, 30000, q * BROWS); });   // la pagina de al lado, pedida ya
    const me = $("lbMe"); if (me && me.classList.contains("jump")) me.onclick = () => goBoard(myPage - pg);   // tu fila de abajo te lleva a tu pagina
    pager(bcount);
  }
  /* flechas de la tabla: misma pieza que la Clasificacion de la portada (css/podio.css), de 8 en 8 */
  function pager(count) {
    const el = $("drPager"); if (!el) return;
    const pages = Math.max(1, Math.ceil(count / BROWS)), a = bpage * BROWS + 1, rk = (x, y) => P6("Puestos {a}–{b}|Ranks {a}–{b}|Places {a}–{b}|Posições {a}–{b}|Plätze {a}–{b}|Posizioni {a}–{b}||第 {a}–{b} 名|{a}–{b}위|{a}～{b}位|Места {a}–{b}|Miejsca {a}–{b}").replace("{a}", A.fmt(x)).replace("{b}", A.fmt(y));
    const pv = $("drPrev"), nx = $("drNext");
    if (pv && nx) {                                                   // v0.3.43: las flechas se quedan (el foco del mando y del teclado no se pierde)
      pv.disabled = bpage <= 0; nx.disabled = bpage >= pages - 1; pv.setAttribute("aria-label", rk(Math.max(1, a - BROWS), Math.max(BROWS, a - 1))); nx.setAttribute("aria-label", rk(a + BROWS, a + 2 * BROWS - 1));
      el.querySelector(".pd-pgl").innerHTML = `<b>${rk(a, a + BROWS - 1)}</b>${count > BROWS ? `<em>${P6("de {n}|of {n}|sur {n}|de {n}|von {n}|su {n}||共 {n} 人|/ {n}명|/ {n}人|из {n}|z {n}").replace("{n}", A.fmt(count))}</em>` : ""}`;
      el.classList.toggle("solo", pages < 2); return;
    }
    el.innerHTML = `<button type="button" class="gx-btn sm pd-pg prev" id="drPrev" ${bpage > 0 ? "" : "disabled"} aria-label="${esc(rk(Math.max(1, a - BROWS), Math.max(BROWS, a - 1)))}">${A.icon("u_next")}</button>
      <span class="pd-pgl"><b>${rk(a, a + BROWS - 1)}</b>${count > BROWS ? `<em>${P6("de {n}|of {n}|sur {n}|de {n}|von {n}|su {n}||共 {n} 人|/ {n}명|/ {n}人|из {n}|z {n}").replace("{n}", A.fmt(count))}</em>` : ""}</span>
      <button type="button" class="gx-btn sm pd-pg next" id="drNext" ${bpage < pages - 1 ? "" : "disabled"} aria-label="${esc(rk(a + BROWS, a + 2 * BROWS - 1))}">${A.icon("u_next")}</button>`;
    $("drPrev").onclick = () => goBoard(-1); $("drNext").onclick = () => goBoard(1);
    el.classList.toggle("solo", pages < 2);                            // una sola pagina: las flechas no salen (el hueco se queda)
  }
  function goBoard(d) {
    const pages = Math.max(1, Math.ceil(bcount / BROWS)), to = bpage + d;
    if (!d || to < 0 || to >= pages) return;
    bpage = to; A.sfx.chip(d > 0 ? 2 : 0); loadBoard(d > 0 ? 1 : -1);
  }

  /* ------------------------------------------------------------------ Perfil y logros
     v0.3.41: Naipe de gala, "libro de logros" (mesa de diseño, paso 3). 12 columnas: ficha de socio de papel con las cifras en columna y el indice
     (1-4); el libro (5-12), una pagina por tramo con UNA FILA POR LOGRO: su ficha (la insignia del juego, en gris si aun no la tienes), el nombre,
     COMO SE CONSIGUE y el progreso ("412 / 1.000", como en Steam) o la fecha. "A punto": los tres que tienes mas cerca. Los secretos no dicen
     como se consiguen: el crupier da una pista. Solo la lista de la pagina se desplaza (fila a fila) */
  const SECRET_HINT = {
    marathon: "Hay quien no se levanta de mi mesa en horas. Esos me caen bien.|Some people don't leave my table for hours. I like those.|Certains ne quittent pas ma table pendant des heures. Ceux-là, je les aime bien.|Tem gente que não sai da minha mesa por horas. Gosto desses.|Manche verlassen meinen Tisch stundenlang nicht. Die mag ich.|C'è chi non si alza dal mio tavolo per ore. Quelli mi piacciono.||有人在我桌前一坐就是好几个小时。我喜欢这种人。|몇 시간씩 내 테이블을 안 떠나는 사람도 있지. 그런 사람이 좋아.|何時間も私のテーブルを離れない客がいる。ああいう客は好きだ。|Некоторые часами не встают из-за моего стола. Такие мне нравятся.|Są tacy, co godzinami nie wstają od mojego stołu. Lubię ich.",
    night: "Mi mesa abre de noche. De madrugada, mejor.|My table opens at night. Past midnight, even better.|Ma table ouvre la nuit. Après minuit, c'est encore mieux.|Minha mesa abre à noite. De madrugada, melhor ainda.|Mein Tisch öffnet nachts. Nach Mitternacht noch besser.|Il mio tavolo apre di notte. Dopo mezzanotte, ancora meglio.||我的牌桌夜里开张。过了午夜更好。|내 테이블은 밤에 열려. 자정이 넘으면 더 좋고.|私のテーブルは夜に開く。真夜中を過ぎたら、なお良し。|Мой стол открывается ночью. После полуночи — ещё лучше.|Mój stół otwiera się nocą. Po północy jeszcze lepiej.",
    casino_cero: "En mi ruleta hay un color al que casi nadie apuesta.|There's a color on my wheel that almost nobody bets on.|Sur ma roulette, il y a une couleur sur laquelle presque personne ne mise.|Na minha roleta há uma cor em que quase ninguém aposta.|In meinem Roulette gibt es eine Farbe, auf die kaum jemand setzt.|Nella mia roulette c'è un colore su cui quasi nessuno punta.||我的轮盘上有一种几乎没人押的颜色。|내 룰렛엔 거의 아무도 걸지 않는 색이 하나 있지.|私のルーレットには、ほとんど誰も賭けない色がある。|На моей рулетке есть цвет, на который почти никто не ставит.|Na mojej ruletce jest kolor, na który prawie nikt nie stawia.",
    casino_canto: "Una moneda tiene tres caras. La tercera casi nadie la ha visto.|A coin has three sides. Hardly anyone has seen the third.|Une pièce a trois faces. La troisième, presque personne ne l'a vue.|Uma moeda tem três lados. O terceiro quase ninguém viu.|Eine Münze hat drei Seiten. Die dritte hat kaum jemand gesehen.|Una moneta ha tre facce. La terza non l'ha vista quasi nessuno.||硬币有三个面。第三面几乎没人见过。|동전엔 면이 세 개 있어. 세 번째는 거의 아무도 못 봤지.|コインには三つ目の面がある。それを見た者はほとんどいない。|У монеты три стороны. Третью почти никто не видел.|Moneta ma trzy strony. Trzeciej prawie nikt nie widział.",
    casino_espacial: "Mi globo sube más de lo que crees. Cobra cuando ya no veas el suelo.|My balloon goes higher than you think. Cash out when you can't see the ground.|Mon ballon monte plus haut que tu ne crois. Encaisse quand tu ne vois plus le sol.|Meu balão sobe mais do que você pensa. Saque quando não vir mais o chão.|Mein Ballon steigt höher, als du denkst. Kassier, wenn du den Boden nicht mehr siehst.|La mia mongolfiera sale più di quanto credi. Incassa quando non vedi più il suolo.||我的热气球比你想的飞得更高。看不见地面时再收手。|내 열기구는 생각보다 높이 올라가. 땅이 안 보일 때 챙겨.|私の気球は思ったより高く昇る。地面が見えなくなったら降りな。|Мой воздушный шар поднимается выше, чем ты думаешь. Забирай, когда земли уже не видно.|Mój balon leci wyżej, niż myślisz. Wypłać, gdy nie widać już ziemi.",
    antipodas: "Para este hay que fallar. Pero fallar a lo grande.|For this one you have to miss. But miss big.|Pour celui-là, il faut rater. Mais rater en grand.|Para este, é preciso errar. Mas errar feio.|Dafür musst du danebenliegen. Aber so richtig.|Per questo bisogna sbagliare. Ma in grande.||这个得答错。而且要错得离谱。|이건 틀려야 해. 그것도 아주 크게.|これは外さないと取れない。それも盛大に。|Для этого нужно промахнуться. Но с размахом.|Tu trzeba spudłować. Ale z rozmachem.",
    casino_falso: "Yo también sé hacer trampas. Algún día te colaré una.|I can cheat too. One day I'll slip one past you.|Moi aussi, je sais tricher. Un jour, je t'en passerai une.|Eu também sei trapacear. Um dia te passo uma.|Ich kann auch schummeln. Eines Tages jubel ich dir einen unter.|Anch'io so barare. Un giorno te ne rifilo uno.||我也会出千。总有一天会让你上当。|나도 속임수 쓸 줄 알아. 언젠가 한 번 속여 주지.|私だってイカサマはできる。いつか一杯食わせてやる。|Я тоже умею жульничать. Когда-нибудь подсуну тебе одно.|Ja też umiem oszukiwać. Kiedyś ci coś podrzucę.",
    adv_ascmax: "Si llegas a lo más alto de la Ascensión, me jubilo. Palabra de crupier.|Reach the top of the Ascension and I'll retire. Dealer's word.|Si tu atteins le sommet de l'Ascension, je prends ma retraite. Parole de croupier.|Se você chegar ao topo da Ascensão, eu me aposento. Palavra de crupiê.|Erreichst du den höchsten Aufstieg, setze ich mich zur Ruhe. Croupier-Ehrenwort.|Se arrivi in cima all'Ascensione, vado in pensione. Parola di croupier.||你要是打到最高进阶，我就退休。荷官说话算话。|어센션 꼭대기까지 오르면 은퇴하지. 딜러의 약속이야.|アセンションの頂点まで来たら、引退してやる。ディーラーの約束だ。|Дойдёшь до вершины Восхождения — уйду на пенсию. Слово крупье.|Dojdź na szczyt Wniebowstąpienia, a przejdę na emeryturę. Słowo krupiera.",
  };
  const NEAR = () => A.pick6("A punto|Almost there|Presque|Quase lá|Fast geschafft|Quasi fatto||即将达成|거의 다 왔어요|あと少し|Почти|Prawie");
  let pfPage = null;                                                    // pagina abierta del libro (se recuerda mientras dure la sesion)
  /* lo que se pinta (tambien para el precalentamiento de la puerta, A.gala.warm: la primera apertura perdia fotogramas) y la pagina del libro */
  function pfBuild() {
    const P = A.profile.get(), s = P.stats, avg = s.questions - s.timeouts > 0 ? Math.round(s.km / (s.questions - s.timeouts)) : 0, st = A.codexStats();
    const prog = A.ach.progress(), got = a => !!P.ach[a.id];
    const LOC = { pt: "pt-BR", zh: "zh-CN" }[A.lang] || A.lang || "es";
    const day = ts => { try { return new Intl.DateTimeFormat(LOC, { day: "numeric", month: "short", year: "numeric" }).format(ts); } catch (e) { return new Date(ts).toLocaleDateString(); } };
    const pct = (n, d) => Math.round((100 * n) / Math.max(1, d));
    /* las cifras, en columna como el ticket. data-ic: la casilla que el crupier da la vuelta con su libreta (js/dealer.js, flipCell) */
    const TIP = {
      a_pin: A.tip6("Lugares que has respondido en total.|Places you've answered in total.|Lieux auxquels tu as répondu.|Lugares que você respondeu no total.|Orte, die du insgesamt beantwortet hast.|Luoghi a cui hai risposto in totale.|Lugares que respondiste en total.|你累计回答过的地点数。|지금까지 답한 장소의 총수.|これまでに答えた場所の合計。|Общее число отвеченных мест.|Łączna liczba twoich odpowiedzi."),
      a_target: A.tip6("Respuestas casi perfectas, clavadas sobre el lugar.|Near-perfect answers, right on the spot.|Réponses quasi parfaites, en plein sur le lieu.|Respostas quase perfeitas, bem em cima do lugar.|Fast perfekte Antworten, punktgenau am Ort.|Risposte quasi perfette, proprio sul luogo.||近乎完美的回答，正中目标。|거의 완벽한 답, 바로 그 자리.|ほぼ完璧な回答、まさにその場所。|Почти идеальные ответы — точно в цель.|Niemal idealne odpowiedzi, prosto w cel."),
      a_lens: A.tip6("Distancia media entre tu pin y el lugar real.|Average distance between your pin and the real place.|Distance moyenne entre ton épingle et le vrai lieu.|Distância média entre seu pino e o lugar real.|Durchschnittliche Entfernung zwischen deinem Pin und dem echten Ort.|Distanza media tra il tuo pin e il luogo reale.|Distancia promedio entre tu pin y el lugar real.|你的图钉与真实地点之间的平均距离。|핀과 실제 장소 사이의 평균 거리.|ピンと実際の場所との平均距離。|Среднее расстояние между твоей меткой и настоящим местом.|Średnia odległość między twoją pinezką a prawdziwym miejscem."),
      a_flame: A.tip6("Más aciertos seguidos que has logrado.|Longest run of correct answers in a row.|Plus longue série de bonnes réponses.|Maior sequência de acertos seguidos.|Längste Serie richtiger Antworten.|Serie più lunga di risposte giuste.|Más aciertos seguidos que lograste.|最长的连续答对纪录。|가장 긴 연속 정답 기록.|最長の連続正解記録。|Самая длинная серия правильных ответов подряд.|Najdłuższa seria dobrych odpowiedzi z rzędu."),
      m_codex: A.tip6("Tarjetas que has descubierto en la Enciclopedia: lugares, historia, personajes y curiosidades.|Cards you've discovered in the Encyclopedia: places, history, people and curiosities.|Cartes découvertes dans l'Encyclopédie : lieux, histoire, personnages et curiosités.|Cartas que você descobriu na Enciclopédia: lugares, história, personagens e curiosidades.|In der Enzyklopädie entdeckte Karten: Orte, Geschichte, Persönlichkeiten und Kuriositäten.|Carte scoperte nell'Enciclopedia: luoghi, storia, personaggi e curiosità.|Tarjetas que descubriste en la Enciclopedia: lugares, historia, personajes y curiosidades.|百科全书中已发现的卡片：地点、历史、人物和趣闻。|도감에서 발견한 카드: 장소, 역사, 인물, 흥미로운 사실.|図鑑で発見したカード：場所、歴史、人物、豆知識。|Карточки, открытые в энциклопедии: места, история, личности и любопытные факты.|Karty odkryte w Encyklopedii: miejsca, historia, postacie i ciekawostki."),
      crown: A.tip6("Tu mejor puntuación en una expedición.|Your best score in an expedition.|Ton meilleur score en expédition.|Sua melhor pontuação em uma expedição.|Deine beste Punktzahl in einer Expedition.|Il tuo miglior punteggio in una spedizione.||你在一次远征中的最高分。|원정 한 번에서 거둔 최고 점수.|1回の遠征での最高スコア。|Твой лучший результат за экспедицию.|Twój najlepszy wynik w wyprawie."),
    };
    const stat = (ic, l, v) => `<div class="gx-lead-row pf-stat" data-ic="${ic}" ${A.ttAttr(l, TIP[ic] || "")}><span>${l}</span><s></s><b>${v}</b></div>`;
    const tiers = A.ACH_TIERS.map((t, i) => { const list = A.ACH.filter(a => a.tier === i); return { t, i, list, n: list.filter(got).length }; }).filter(x => x.list.length);
    /* A punto: los que ya has empezado y tienes mas cerca (por proporcion), nunca un secreto */
    const near = A.ACH.filter(a => !got(a) && !a.secret && prog[a.id] && prog[a.id][0] > 0 && prog[a.id][0] < prog[a.id][1])
      .sort((a, b) => prog[b.id][0] / prog[b.id][1] - prog[a.id][0] / prog[a.id][1]).slice(0, 3);
    const total = A.ach.total(), done = A.ach.count();
    if (pfPage == null || (pfPage !== "near" && !tiers.some(x => x.i === pfPage))) { const open = tiers.find(x => x.n < x.list.length); pfPage = open ? open.i : tiers[0].i; }
    const row = a => {
      const g = got(a), hid = a.secret && !g, pr = !g && prog[a.id];
      const badge = hid ? `<span class="ic badge">${A.icon(A.ACH_FRAME[a.ev] || "blank_boss", "bd-base")}${A.icon("lock", "bd-in")}</span>` : A.badge(a.id);
      const how = hid ? `${A.icon("dealer_mini", "pf-hint")}<span>${esc(A.pick6(SECRET_HINT[a.id] || "") || T("Logro secreto", "Secret achievement"))}</span>` : esc(A.tx(a.desc));
      const meta = g ? `<span class="pf-got">${A.icon("u_star")}<em>${day(P.ach[a.id])}</em></span>`
        : pr ? `<b>${A.fmt(pr[0])} / ${A.fmt(pr[1])}</b><span class="gx-bar"><i style="width:${pct(pr[0], pr[1])}%"></i></span>` : "";
      return `<li class="pf-row${g ? " got" : ""}${hid ? " hid" : ""}"><span class="pf-chip">${badge}</span><span class="pf-tx"><b>${hid ? "???" : esc(A.tx(a.name))}</b><i>${how}</i></span><span class="pf-mt">${meta}</span></li>`;
    };
    const book = () => {
      const x = pfPage === "near" ? null : tiers.find(t => t.i === pfPage), list = x ? x.list : near;
      const ic = x ? A.icon("tier_" + x.i) : A.icon("u_star"), sub = x ? A.tx(x.t.t) : A.pick6("Los que tienes más cerca|The ones you're closest to|Ceux qui sont tout près|Os que estão mais perto|Die du fast hast|Quelli più vicini||最接近达成的|가장 가까운 업적|もう少しの実績|Ближе всего|Najbliżej");
      const cnt = x ? `<span class="pf-bc"><b>${x.n}<i> / ${x.list.length}</i></b><span class="gx-bar"><i style="width:${pct(x.n, x.list.length)}%"></i></span></span>` : "";
      const rows = list.length ? list.map(row).join("") : `<li class="pf-empty">${A.pick6("Aquí saldrán los logros que tengas a punto de caer. Juega un poco y vuelve.|Achievements you're about to unlock show up here. Play a little and come back.|Les succès presque débloqués apparaîtront ici. Joue un peu et reviens.|Aqui aparecem as conquistas prestes a cair. Jogue um pouco e volte.|Hier erscheinen Erfolge, die du fast hast. Spiel ein bisschen und komm wieder.|Qui compariranno gli obiettivi quasi raggiunti. Gioca un po' e torna.||即将解锁的成就会显示在这里。玩一会儿再回来。|곧 달성할 업적이 여기에 나와요. 조금 플레이하고 다시 와요.|もうすぐ解除できる実績がここに出ます。少し遊んでから戻ってきて。|Здесь появятся почти полученные достижения. Поиграй немного и возвращайся.|Tu pojawią się osiągnięcia, które masz prawie zdobyte. Zagraj trochę i wróć.")}</li>`;
      return `<header class="pf-bh"><span class="pf-bic">${ic}</span><span class="pf-bt"><span class="gx-eyb">${sub}</span><h3 class="gx-t-m">${x ? A.tx(x.t.n) : NEAR()}</h3></span>${cnt}</header>
        <div class="gx-hr"></div><ol class="pf-rows" id="pfRows">${rows}</ol>`;
    };
    const ix = (p, ic, name, n, cls = "") => `<button type="button" class="pf-ix${pfPage === p ? " on" : ""}${cls}" data-p="${p}">${A.icon(ic)}<span>${name}</span><i>${n}</i></button>`;
    const nm = P.name || A.pick6("Anónimo|Anonymous|Anonyme|Anônimo|Anonym|Anonimo||匿名|익명|匿名|Аноним|Anonim");
    const since = P.created ? A.pick6("Socio desde el {d}|Member since {d}|Membre depuis le {d}|Sócio desde {d}|Mitglied seit {d}|Socio dal {d}||{d} 入会|{d} 가입|{d} 入会|С нами с {d}|Członek od {d}").replace("{d}", day(P.created)) : "";
    const html = `<div class="gx-veil"></div><section class="pf-screen gx-stage s-prof" aria-labelledby="pfH" data-nosq>
      <div class="gx-grid pf-grid12">
        <header class="pf-head"><button type="button" class="gx-btn sm" id="hubBack">${A.icon("u_back")}<span>${A.t("set.close")}</span>${A.gala.keyHint("Esc", "b")}</button>
          <h2 class="gx-t-l pf-h" id="pfH"><span class="pf-hic">${A.icon("m_prof")}</span>${T("Perfil", "Profile")}</h2>
          <span class="pf-sum"><span class="gx-eyb">${T("Logros", "Achievements")}</span><b>${A.fmt(done)}<i> / ${A.fmt(total)}</i></b><span class="gx-bar"><i style="width:${pct(done, total)}%"></i></span></span>${tools()}</header>
        <div class="pf-left">
          <div class="gx-paper pf-socio"><span class="gx-eyb">${A.pick6("Ficha de socio|Member card|Carte de membre|Ficha de sócio|Mitgliedskarte|Tessera del socio||会员卡|회원 카드|会員カード|Карта игрока|Karta członkowska")}</span>
            <b class="pf-name">${esc(nm)}</b>${since ? `<span class="pf-since">${since}</span>` : ""}<div class="gx-hr"></div>
            ${stat("a_pin", T("Preguntas", "Questions"), A.fmt(s.questions))}${stat("a_target", T("Dianas", "Bullseyes"), A.fmt(s.bulls))}${stat("a_lens", T("Error medio", "Avg. error"), A.fmtDist(avg))}
            ${stat("a_flame", T("Mejor racha", "Best streak"), A.fmt(s.bestStreak))}${stat("m_codex", T("Enciclopedia", "Encyclopedia"), A.fmt(st.u) + " / " + A.fmt(st.t))}${stat("crown", T("Récord aventura", "Adventure best"), A.fmt(P.adv.bestScore))}</div>
          <nav class="pf-idx" id="pfIdx" aria-label="${T("Logros", "Achievements")}">${ix("near", "u_star", NEAR(), near.length, " hot")}${tiers.map(x => ix(x.i, "tier_" + x.i, A.tx(x.t.n), `${x.n} / ${x.list.length}`, x.n === x.list.length ? " full" : "")).join("")}</nav>
        </div>
        <div class="gx-sh pf-right"><div class="gx-paper pf-book" id="pfBook">${book()}</div></div>
      </div></section>`;
    return { html, book };
  }
  function profile() {
    const v = pfBuild(); C().dialog(v.html, "tablewrap");
    wireTools(); $("hubBack").onclick = () => screen("home");
    $("pfIdx").onclick = e => {
      const b = e.target.closest(".pf-ix"); if (!b) return; const p = b.dataset.p === "near" ? "near" : +b.dataset.p; if (p === pfPage) return;
      pfPage = p; A.sfx.card(); document.querySelectorAll(".pf-ix").forEach(x => x.classList.toggle("on", x === b)); $("pfBook").innerHTML = v.book();
    };
    if (A.coverMap) A.coverMap("profile", true, () => !!document.querySelector("#dlg .pf-screen") && !$("layer").classList.contains("hidden"));   // fieltro opaco: el mapa de detras deja de dibujarse
    if (A.dealer && A.dealer.profile) A.dealer.profile();              // su libreta: lo que ha cambiado desde tu ultima visita, o una casilla que se da la vuelta
  }

  function screen(id) {
    A.podio.reset();                                                  // el podio de la portada no se queda encima de otra pantalla
    C().S.hub = id; if (A.coverMap) { if (id !== "profile") A.coverMap("profile", false); if (id !== "daily") A.coverMap("daily", false); }
    ({ home, classic: () => campaigns("classic"), adventure, daily, profile, patch: () => A.parche.open() }[id] || home)();
    C().refreshSkinBits && C().refreshSkinBits();
  }
  /* el Reto diario de hoy tal cual, sin cerrar nada (precalentamiento de la puerta): sin ids, es una copia */
  const dailyHtml = () => { const DY = A.rank.daily, today = DY.board(); let sv = A.adv.summary(true); if (sv && sv.board !== today) sv = null; return dyHtml(sv, DY.get(today), null, today).replace(/ (id|aria-labelledby)="[^"]*"/g, ""); };
  A.hub = { render: id => screen(id || "home"), screen, plaque, frame: scr, wireTools, dailyHtml, profileHtml: () => pfBuild().html.replace(/ (id|aria-labelledby)="[^"]*"/g, "") };   // sin ids: es la copia del precalentamiento
})(window.AIQ);
