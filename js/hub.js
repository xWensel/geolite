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
    const c = C(), P = A.profile.get(), adv = P.adv, saved = A.adv.hasSave(), sm = saved && A.adv.summary(), cx = A.codexStats();
    /* carta del Reto diario: intento a medias, puntuacion global de hoy o los 3 intentos por estrenar */
    const today = A.rank.daily.board(), dst = A.rank.daily.get(today), dsv = A.adv.summary(true), dLive = dsv && dsv.board === today;
    const dMeta = dLive ? A.pick6("Intento {k}/3|Attempt {k}/3|Essai {k}/3|Tentativa {k}/3|Versuch {k}/3|Tentativo {k}/3||尝试 {k}/3|시도 {k}/3|挑戦 {k}/3|Попытка {k}/3|Podejście {k}/3").replace("{k}", dsv.dailyTry || 1)
      : dst.done ? `${A.fmt(dst.total)} · ${dst.done}/3`
      : A.pick6("Nuevo reto|New today|Nouveau défi|Novo desafio|Neu heute|Nuova sfida||新挑战|새 도전|新チャレンジ|Новый день|Nowe dziś");
    /* cada modo es una carta (sin indices de baraja: el marco y la ilustracion bastan); la descripcion solo sale al pasar el raton (ficha data-tt) */
    /* bombillas de marquesina de la Aventura: puntos redondos a lo largo de un rectangulo redondeado (pathLength fijo: siempre enteras y repartidas por igual,
       tambien en las esquinas). Capas: casquillo de tinta, cristal apagado y dos tandas encendidas que se turnan */
    const BULBS = `<svg class="mqb" aria-hidden="true">${["mqb-sk", "mqb-off", "mqb-a", "mqb-a mqb-c", "mqb-b", "mqb-b mqb-c"].map(k => `<rect class="${k}" pathLength="144"/>`).join("")}</svg>`;
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
        ${saved && sm ? `<div class="hh-resume"><span class="hr-ic">${A.icon("chip_r")}</span><span class="hr-t"><b>${T("Tienes una expedición guardada", "You have a saved expedition")}</b><i>${where(sm)} · ${sm.coins} ${T("doblones", "doubloons")} · ${A.fmt(sm.score)} ${T("pts", "pts")}</i></span><button class="btn-ink" id="homeCont" data-primary><span>${T("Continuar", "Continue")}</span><span class="ar">${A.icon("u_next", "sm")}</span></button><button class="btn-line" id="homeNew">${T("Nueva partida", "New run")}</button></div>` : ""}
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
    if ($("homeCont")) { $("homeCont").onclick = () => { A.sfx.depart(); enterRun(() => A.adv.resume(), true); }; $("homeNew").onclick = () => { A.sfx.card(); screen("adventure"); }; }
  }

  /* ------------------------------------------------------------------ marco comun de las sub-pantallas (a pantalla completa, sobre el mapa) */
  const scr = (title, inner, cls = "") => `<div class="scr ${cls}"><header class="scr-head"><button class="hub-back" id="hubBack">${A.icon("u_back", "sm")}${T("Menú", "Menu")}</button><h2>${title}</h2>${tools()}</header><div class="scr-body">${inner}</div></div>`;
  const startBtn = (id, big, small, primary) => `<button class="startbtn" id="${id}" ${primary ? "data-primary" : ""}><span class="sb-ic">${A.icon("chip_r")}</span><span class="sb-t"><b>${big}</b><i>${small}</i></span><span class="sb-ar">${A.icon("u_next", "sm")}</span></button>`;

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
    c.dialog(scr(T("Clásico", "Classic"), `
      <p class="mode-d">${A.t("mode." + mode + ".d")}</p>
      <div class="camps">${list}</div>
      <div class="camp-foot" id="campFoot">${foot()}</div>`, "s-camps"), "tablewrap");
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
    const sm = saved && A.adv.summary(), runInfo = sm ? `${where(sm)} · ${sm.coins} ${T("doblones", "doubloons")} · ${A.fmt(sm.score)} ${T("pts", "pts")}` : "";
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
        ${saved ? `<div class="resume"><span class="tag">${T("Partida guardada", "Saved run")}</span><b>${runInfo}</b><div><button class="btn-ink" id="contBtn" data-primary><span>${T("Continuar", "Continue")}</span><span class="ar">${A.icon("u_next", "sm")}</span></button><button class="btn-line danger" id="abandonBtn">${T("Descartar partida", "Discard run")}</button></div></div>` : ""}
        <h4 class="hub-sub">${T("Baraja inicial", "Starting deck")}</h4><div class="deckrow">${decks}</div>
        <h4 class="hub-sub">${T("Ruta de la expedición", "Expedition route")}</h4>${A.adv.road({ size: "plan" })}
      </section>
      <aside class="as-side">
        <h4 class="hub-sub">${T("Ascensión", "Ascension")}</h4><div class="stakes">${stakes}<span class="as-mult${advSel.asc ? "" : " off"}" ${A.ttAttr(T("Puntuación final", "Final score"), A.tip6("Al acabar la expedición, el total se multiplica según la Ascensión elegida. No cambia los objetivos de las rondas.|When the expedition ends, the total is multiplied by the chosen Ascension. It doesn't change the round targets.|À la fin de l'expédition, le total est multiplié selon l'Ascension choisie. Les objectifs des manches ne changent pas.|Ao fim da expedição, o total é multiplicado conforme a Ascensão escolhida. Os objetivos das rodadas não mudam.|Am Ende der Expedition wird die Summe mit dem gewählten Aufstieg multipliziert. Die Rundenziele ändern sich nicht.|Alla fine della spedizione il totale viene moltiplicato in base all'Ascensione scelta. Gli obiettivi dei round non cambiano.||远征结束时，总分会乘以所选进阶等级的倍率。不会改变各回合目标。|원정이 끝나면 선택한 어센션에 따라 총점에 배수가 곱해집니다. 라운드 목표는 그대로입니다.|遠征の終了時、合計スコアに選んだアセンションの倍率がかかります。ラウンドの目標は変わりません。|По окончании экспедиции итог умножается в зависимости от выбранного Восхождения. Цели раундов не меняются.|Po zakończeniu wyprawy suma jest mnożona przez wybrany poziom Wniebowstąpienia. Cele rund się nie zmieniają."))}>${A.pick6("Puntos|Score|Score|Pontos|Punkte|Punti||得分|점수|スコア|Очки|Wynik")} ×${A.adv.mulTxt(A.adv.ascMult(advSel.asc))}</span></div><p class="as-asc">${ascTxt}</p>
        <div class="adv-stats"><span>${T("Récord", "Best")} <b>${A.fmt(adv.bestScore)}</b></span><span>${T("Mejor ronda", "Best round")} <b>${adv.bestRound}</b></span><span>${T("Victorias", "Wins")} <b>${adv.wins}</b></span><span>${T("Expediciones", "Runs")} <b>${adv.runs}</b></span></div>
        <p class="as-relics">${A.icon("cards", "sm")}${A.RELIC_IDS.length} ${T("reliquias por descubrir", "relics to discover")}</p>
        ${startBtn("goBtn", T("Nueva expedición", "New expedition"), A.tx(D[advSel.deck].n) + " · " + T("Ascensión", "Ascension") + " " + advSel.asc, !saved)}
      </aside></div>`, "s-adv"), "tablewrap");
    wireTools(); $("hubBack").onclick = () => screen("home");
    document.querySelectorAll(".dcard").forEach(b => (b.onclick = () => { advSel.deck = b.dataset.deck; A.sfx.card(); adventure(); }));
    document.querySelectorAll(".stake").forEach(b => (b.onclick = () => { advSel.asc = +b.dataset.asc; A.sfx.ui(); adventure(); }));
    const confirm2 = (btn, msg, act, onArm) => { let armed = false, tm = 0; const html = btn.innerHTML; btn.addEventListener("click", e => { if (armed) { clearTimeout(tm); return act(); } e.stopImmediatePropagation(); armed = true; if (onArm) onArm(); btn.classList.add("armed"); (btn.querySelector("b") || btn).textContent = msg; A.sfx.deny(); tm = setTimeout(() => { armed = false; btn.classList.remove("armed"); btn.innerHTML = html; }, 4000); }, true); };
    const funeral = () => { if (A.dealer && A.dealer.funeral) A.dealer.funeral(A.adv.summary && A.adv.summary()); };   // el crupier le hace un funeral a tu expedicion guardada
    if (saved) {
      $("contBtn").onclick = () => { A.sfx.depart(); enterRun(() => A.adv.resume(), true); };
      $("abandonBtn").onclick = () => { A.adv.abandon(); A.sfx.deny(); adventure(); };
      confirm2($("abandonBtn"), T("¿Seguro? Pulsa otra vez", "Sure? Press again"), () => {}, funeral);
    }
    $("goBtn").onclick = () => { A.sfx.depart(); if (saved) A.adv.abandon(); enterRun(() => A.adv.begin({ deck: advSel.deck, asc: advSel.asc })); };
    if (saved) confirm2($("goBtn"), T("Esto borra tu partida guardada. Pulsa otra vez", "This deletes your saved run. Press again"), () => {}, funeral);
  }
  function enterRun(fn, resume) { const c = C(); c.S.ranked = null; c.prepareRun(resume); fn(); }   // resume: seguir una partida guardada no es una partida nueva (stats.plays, ver game.js prepareRun)

  /* ------------------------------------------------------------------ Reto diario: una expedicion al azar cada dia, la misma para todo el mundo.
     La MANO DEL DIA (baraja, ascension, regalo y ruta) sale de la semilla del dia; 3 intentos con lugares nuevos que suman la puntuacion global (A.rank.daily) */
  let board = "today", tickT = 0;
  const P6 = s => A.pick6(s);
  const locOf = () => (A.LANGS.find(l => l.code === A.lang) || A.LANGS[0]).loc;
  const hms = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(v => String(v).padStart(2, "0")).join(":"); };
  const actRound = where;
  function daily() {
    const c = C(), DY = A.rank.daily, day = DY.board();
    clearInterval(tickT);
    /* intentos a medias: el de otro dia se cierra con los puntos que llevaba; el de hoy sin partida guardada (se perdio) se cierra a cero */
    let sv = A.adv.summary(true);
    if (sv && sv.board !== day) { A.adv.abandon(true); sv = null; }
    let st = DY.get(day);
    if (st.live && !sv) { DY.finish(day, st.live, 0); st = DY.get(day); }
    const h = DY.hand(day), deck = A.ADV.DECKS[h.deck], gift = h.gift && A.RELICS[h.gift], next = st.tries.length + 1, locked = A.adv.deckLocked(h.deck), hist = DY.stats();
    const kit = (ico, lbl, val, tip) => `<div class="dr-k" ${tip}><span class="dr-ki">${ico}</span><span class="dr-kt"><i class="sq-fit">${lbl}</i><b class="sq-fit">${val}</b></span></div>`;
    const tries = [1, 2, 3].map(k => {
      const t = st.tries[k - 1], live = !!(t && t.live), cls = live ? "live" : t ? "done" : k === next && !st.live ? "next" : "free";
      const big = live ? A.fmt(sv ? sv.score : 0) : t ? A.fmt(t.s || 0) : "—";
      const small = live ? (sv ? actRound(sv) : "…") : t ? P6("Rondas: {r}|Rounds: {r}|Manches : {r}|Rodadas: {r}|Runden: {r}|Round: {r}||回合：{r}|라운드: {r}|ラウンド：{r}|Раунды: {r}|Rundy: {r}").replace("{r}", t.r || 0)
        : P6("Por jugar|To play|À jouer|Pendente|Offen|Da giocare||待进行|미플레이|未挑戦|Не сыграна|Do rozegrania");
      return `<div class="dr-try ${cls}"><span class="dr-tn">${P6("Intento|Attempt|Essai|Tentativa|Versuch|Tentativo||尝试|시도|挑戦|Попытка|Podejście")} ${k}</span><b>${big}</b><i>${small}</i></div>`;
    }).join("");
    const go = sv ? startBtn("dailyGo", P6("Continuar el intento {k}|Continue attempt {k}|Reprendre l'essai {k}|Continuar a tentativa {k}|Versuch {k} fortsetzen|Riprendi il tentativo {k}||继续第 {k} 次尝试|{k}번째 시도 계속하기|挑戦{k}回目を続ける|Продолжить попытку {k}|Kontynuuj podejście {k}").replace("{k}", sv.dailyTry || st.live), actRound(sv), true)
      : st.left > 0 ? startBtn("dailyGo", P6("Jugar el intento {k}|Play attempt {k}|Jouer l'essai {k}|Jogar a tentativa {k}|Versuch {k} spielen|Gioca il tentativo {k}||开始第 {k} 次尝试|{k}번째 시도 시작|挑戦{k}回目へ|Сыграть попытку {k}|Zagraj podejście {k}").replace("{k}", next), P6("Lugares y retos nuevos|New places, new challenges|Nouveaux lieux et défis|Novos lugares e desafios|Neue Orte, neue Herausforderungen|Nuovi luoghi e sfide||全新地点与挑战|새로운 장소와 도전|新しい場所とチャレンジ|Новые места и испытания|Nowe miejsca i wyzwania"), true)
      : `<div class="dr-done">${A.icon("u_star")}<span><b>${P6("¡Reto completado!|Challenge complete!|Défi terminé !|Desafio concluído!|Herausforderung geschafft!|Sfida completata!||挑战完成！|도전 완료!|チャレンジ達成！|Испытание пройдено!|Wyzwanie ukończone!")}</b><i>${P6("Mañana, otra mano|Tomorrow, a new hand|Demain, une nouvelle main|Amanhã, uma nova mão|Morgen ein neues Blatt|Domani, una nuova mano|Mañana, otra mano|明天，再发一手新牌|내일은 새로운 패|明日は新しい手札|Завтра новая раздача|Jutro nowe rozdanie")}</i></span></div>`;
    const clock = `<p class="dr-next" ${A.ttAttr(P6("Nuevo reto en|New challenge in|Nouveau défi dans|Novo desafio em|Neue Herausforderung in|Nuova sfida tra||新挑战倒计时|새 도전까지|次のチャレンジまで|Новое испытание через|Nowe wyzwanie za"), P6("El reto cambia a tu medianoche. Los intentos que no juegues hoy se pierden.|The challenge changes at your midnight. Attempts you don't play today are lost.|Le défi change à minuit, heure locale. Les essais non joués aujourd'hui sont perdus.|O desafio muda à sua meia-noite. As tentativas que você não jogar hoje se perdem.|Die Herausforderung wechselt um deine Mitternacht. Nicht gespielte Versuche verfallen.|La sfida cambia alla tua mezzanotte. I tentativi non giocati oggi vanno persi.||挑战在你当地的午夜更换。今天没用掉的尝试会作废。|도전은 현지 시간 자정에 바뀌어요. 오늘 하지 않은 시도는 사라져요.|デイリーチャレンジは現地時間の深夜0時に切り替わる。今日プレイしなかった挑戦は消える。|Испытание меняется в твою полночь. Несыгранные сегодня попытки сгорают.|Wyzwanie zmienia się o twojej północy. Niezagrane dziś podejścia przepadają."))}>${A.icon("hourglass", "sm")}<span>${P6("Nuevo reto en|Next one in|Prochain dans|Próximo em|Nächste in|Prossima tra||下次挑战|다음 도전까지|次のチャレンジまで|Новое через|Następne za")}</span><b id="drClock">${hms(DY.msToNext())}</b></p>`;
    const tabs = [["today", P6("Hoy|Today|Aujourd'hui|Hoje|Heute|Oggi||今天|오늘|今日|Сегодня|Dziś")], ["yday", P6("Ayer|Yesterday|Hier|Ontem|Gestern|Ieri||昨天|어제|昨日|Вчера|Wczoraj")], ["adv", T("Aventura", "Adventure")]];
    const seedTip = A.ttAttr(P6("Semilla del día|Daily seed|Graine du jour|Semente do dia|Seed des Tages|Seme del giorno||今日种子|오늘의 시드|今日のシード|Зерно дня|Ziarno dnia") + " · " + DY.code(day), P6("La mano de hoy sale al azar de esta semilla y todo el mundo juega con ella: la misma mano y, en cada intento, los mismos lugares, retos y cartas.|Today's hand is dealt at random from this seed and everyone plays with it: the same hand and, in each attempt, the same places, challenges and cards.|La main du jour est tirée au hasard de cette graine et tout le monde joue avec : la même main et, à chaque essai, les mêmes lieux, défis et cartes.|A mão de hoje é sorteada a partir desta semente e todo mundo joga com ela: a mesma mão e, em cada tentativa, os mesmos lugares, desafios e cartas.|Das heutige Blatt wird zufällig aus diesem Seed gezogen, und alle spielen damit: dasselbe Blatt und in jedem Versuch dieselben Orte, Herausforderungen und Karten.|La mano di oggi esce a caso da questo seme ed è uguale per tutti: la stessa mano e, a ogni tentativo, gli stessi luoghi, sfide e carte.||今日手牌由这个种子随机发出，所有人都用它：同一手牌，每次尝试的地点、挑战和卡牌也都相同。|오늘의 패는 이 시드로 무작위로 나오고 모두가 같이 써요. 같은 패, 그리고 시도마다 같은 장소·도전·카드.|今日の手札はこのシードからランダムに配られ、全員がそれで遊ぶ。同じ手札、そして各挑戦で同じ場所・チャレンジ・カード。|Раздача дня генерируется из этого зерна, и у всех она одна: та же раздача, а в каждой попытке — те же места, испытания и карты.|Dzisiejsze rozdanie jest losowane z tego ziarna i wszyscy nim grają: to samo rozdanie i w każdym podejściu te same miejsca, wyzwania i karty."));
    c.dialog(scr(T("Reto diario", "Daily challenge"), `<div class="dr">
      <section class="dr-main">
        <div class="dr-hand">
          <div class="dr-art">${A.pic("card_compete")}</div>
          <div class="dr-hb">
            <div class="dr-top"><span class="tag">${DY.date(day).toLocaleDateString(locOf(), { weekday: "long", day: "numeric", month: "long" })}</span><span class="dr-seed" ${seedTip}>${A.icon("dice", "sm")}<i>${P6("Semilla|Seed|Graine|Semente|Seed|Seme||种子|시드|シード|Зерно|Ziarno")}</i><b>${DY.code(day)}</b></span></div>
            <h3 class="dr-h">${P6("La mano de hoy|Today's hand|La main du jour|A mão de hoje|Das Blatt von heute|La mano di oggi||今日手牌|오늘의 패|今日の手札|Раздача дня|Dzisiejsze rozdanie")}</h3>
            <p class="dr-d">${P6("Sale al azar de la semilla del día y es la misma para todo el mundo.|Dealt at random from the day's seed, and the same for everyone.|Tirée au hasard de la graine du jour, et la même pour tout le monde.|É sorteada a partir da semente do dia e é a mesma para todo mundo.|Zufällig aus dem Seed des Tages gezogen und für alle gleich.|Esce a caso dal seme del giorno ed è la stessa per tutti.||由今日种子随机发出，所有人都一样。|오늘의 시드로 무작위로 나오며, 모두에게 똑같아요.|今日のシードからランダムに配られ、全員共通。|Выпадает случайно из зерна дня и одинакова для всех.|Losowane z ziarna dnia i takie samo dla wszystkich.")}</p>
            <div class="dr-kit">
              ${kit(A.icon(deck.ico), P6("Baraja|Deck|Paquet|Baralho|Deck|Mazzo||套牌|덱|デッキ|Колода|Talia"), A.tx(deck.n), A.ttAttr(A.tx(deck.n), A.tx(deck.d) + (locked ? "\n" + P6("Hoy la juegas aunque aún no la hayas desbloqueado.|You can play it today even if you haven't unlocked it yet.|Aujourd'hui, tu la joues même sans l'avoir débloquée.|Hoje você joga com ele mesmo sem tê-lo desbloqueado.|Heute spielst du es, auch wenn du es noch nicht freigeschaltet hast.|Oggi lo giochi anche se non l'hai ancora sbloccato.||即使尚未解锁，今天也能使用。|아직 잠금 해제하지 않았어도 오늘은 쓸 수 있어요.|まだ解放していなくても、今日は使える。|Сегодня она доступна, даже если ещё не открыта.|Dziś grasz nią, nawet jeśli nie masz jej jeszcze odblokowanej.") : "")))}
              ${kit(A.icon(STAKE_CHIP[h.asc]) + `<em>${h.asc}</em>`, T("Ascensión", "Ascension"), h.asc ? String(h.asc) : T("Estándar", "Standard"), A.ttAttr(T("Ascensión", "Ascension") + " " + h.asc, ascTexts()[h.asc]))}
              ${gift ? kit(A.icon(h.gift), P6("Regalo|Gift|Cadeau|Presente|Geschenk|Regalo||赠礼|선물|贈り物|Подарок|Prezent"), A.tx(gift.n), A.ttAttr(P6("Regalo del día|Gift of the day|Cadeau du jour|Presente do dia|Geschenk des Tages|Regalo del giorno||今日赠礼|오늘의 선물|今日の贈り物|Подарок дня|Prezent dnia") + ": " + A.tx(gift.n), A.tx(gift.d))) : ""}
            </div>
          </div>
          <div class="dr-rt"><h4 class="hub-sub">${P6("Ruta del día|Today's route|Route du jour|Rota do dia|Route des Tages|Percorso del giorno||今日路线|오늘의 경로|今日のルート|Маршрут дня|Trasa dnia")}</h4><div class="dr-road2">${A.adv.road({ size: "plan", route: h.route })}</div></div>
        </div>
        <div class="dr-play">
          <div class="dr-sum"><i>${P6("Puntuación global|Global score|Score global|Pontuação global|Gesamtpunktzahl|Punteggio globale||总分|총점|総合スコア|Общий счёт|Wynik łączny")}</i><b>${A.fmt(st.total)}</b><em>${P6("Suma de tus 3 intentos|Sum of your 3 attempts|Somme de tes 3 essais|Soma das suas 3 tentativas|Summe deiner 3 Versuche|Somma dei tuoi 3 tentativi||你 3 次尝试的总和|시도 3번의 합계|3回の挑戦の合計|Сумма трёх попыток|Suma twoich 3 podejść")}</em></div>
          <div class="dr-tries">${tries}</div>
          <div class="dr-go">${go}${clock}</div>
        </div>
      </section>
      <aside class="dr-board">
        <h4 class="hub-sub">${T("Clasificación", "Leaderboard")}</h4>
        <div class="dr-tabs">${tabs.map(([id, l]) => `<button type="button" class="sq-fit${id === board ? " on" : ""}" data-b="${id}">${l}</button>`).join("")}</div>
        <div class="lb" id="lb"><p class="lb-load">…</p></div>
        <div class="dr-stats"><span><b class="sq-fit">${A.fmt(hist.days)}</b><i>${P6("Días jugados|Days played|Jours joués|Dias jogados|Gespielte Tage|Giorni giocati||已玩天数|플레이한 날|プレイ日数|Дней сыграно|Dni gry")}</i></span><span><b class="sq-fit">${A.fmt(hist.streak)}</b><i>${P6("Días seguidos|Days in a row|Jours d'affilée|Dias seguidos|Tage in Folge|Giorni di fila||连续天数|연속 일수|連続日数|Дней подряд|Dni z rzędu")}</i></span><span><b class="sq-fit">${A.fmt(hist.best)}</b><i>${P6("Mejor día|Best day|Meilleur jour|Melhor dia|Bester Tag|Giorno migliore||最佳一天|최고의 날|ベストの日|Лучший день|Najlepszy dzień")}</i></span></div>
      </aside></div>`, "s-daily"), "tablewrap");
    wireTools(); $("hubBack").onclick = () => { clearInterval(tickT); screen("home"); };
    /* el nombre NO se cambia aqui: te lo pide el crupier al acabar tu primera partida y despues solo en Ajustes > General (js/nombre.js) */
    document.querySelectorAll(".dr-tabs button").forEach(b => (b.onclick = () => { board = b.dataset.b; document.querySelectorAll(".dr-tabs button").forEach(x => x.classList.toggle("on", x === b)); A.sfx.ui(); loadBoard(); }));
    if ($("dailyGo")) $("dailyGo").onclick = () => { A.sfx.depart(); clearInterval(tickT); enterRun(() => (sv ? A.adv.resume(true) : A.adv.beginDaily(day)), !!sv); };
    /* cuenta atras hasta tu medianoche; al cambiar de dia, la pantalla se reparte sola */
    tickT = setInterval(() => {
      const el = $("drClock"); if (!el) return clearInterval(tickT);
      if (DY.board() !== day) { clearInterval(tickT); if (C().S.phase === "title" && C().S.hub === "daily") daily(); return; }
      el.textContent = hms(DY.msToNext());
    }, 1000);
    loadBoard();
  }
  async function loadBoard() {
    const el = $("lb"); if (!el) return; const DY = A.rank.daily, P = A.profile.get(), my = P.id, tab = board;
    const b = tab === "yday" ? DY.yesterday() : tab === "adv" ? "adv-all" : DY.board(), isDay = b !== "adv-all";
    el.innerHTML = `<p class="lb-load">…</p>`;
    const res = await A.rank.topC(b, 8); if (tab !== board || !$("lb")) return;                    // 8 + tu puesto: cabe entero sin encoger la pantalla (la misma peticion que el podio de la portada)
    const rows = res.rows || [], inTop = rows.some(r => r.id === my);
    const dots = r => (isDay ? `<span class="lb-tries">${[0, 1, 2].map(i => `<i class="${r.tries && i < r.tries.length ? "on" : ""}"></i>`).join("")}</span>` : "");
    const li = (r, n) => `<li class="${r.id === my ? "me" : ""}"><span class="lb-n">${n <= 3 ? A.icon("medal_" + ["gold", "silver", "bronze"][n - 1], "sm") : A.fmt(n)}</span><span class="lb-name">${esc(r.name || "—")}</span>${dots(r)}<b>${A.fmt(r.score)}</b></li>`;
    const mine = res.global && res.me && !inTop ? `<li class="lb-gap" aria-hidden="true">···</li>` + li({ id: my, name: A.rank.name(), score: res.me.score, tries: isDay ? DY.get(b).tries.filter(t => !t.live) : null }, res.me.rank) : "";
    el.innerHTML = `<p class="lb-src">${A.podio.src(res)}</p>` + (rows.length ? `<ol class="${isDay ? "dy" : ""}">${rows.map((r, i) => li(r, i + 1)).join("")}${mine}</ol>` : `<p class="lb-empty">${T("Aún no hay puntuaciones. ¡Sé el primero!", "No scores yet. Be the first!")}</p>`);
  }

  /* ------------------------------------------------------------------ Perfil y logros */
  function profile() {
    const c = C(), P = A.profile.get(), s = P.stats, avg = s.questions - s.timeouts > 0 ? Math.round(s.km / (s.questions - s.timeouts)) : 0, st = A.codexStats();
    const CELL_TIP = {
      a_pin: A.tip6("Lugares que has respondido en total.|Places you've answered in total.|Lieux auxquels tu as répondu.|Lugares que você respondeu no total.|Orte, die du insgesamt beantwortet hast.|Luoghi a cui hai risposto in totale.|Lugares que respondiste en total.|你累计回答过的地点数。|지금까지 답한 장소의 총수.|これまでに答えた場所の合計。|Общее число отвеченных мест.|Łączna liczba twoich odpowiedzi."),
      a_target: A.tip6("Respuestas casi perfectas, clavadas sobre el lugar.|Near-perfect answers, right on the spot.|Réponses quasi parfaites, en plein sur le lieu.|Respostas quase perfeitas, bem em cima do lugar.|Fast perfekte Antworten, punktgenau am Ort.|Risposte quasi perfette, proprio sul luogo.||近乎完美的回答，正中目标。|거의 완벽한 답, 바로 그 자리.|ほぼ完璧な回答、まさにその場所。|Почти идеальные ответы — точно в цель.|Niemal idealne odpowiedzi, prosto w cel."),
      a_lens: A.tip6("Distancia media entre tu pin y el lugar real.|Average distance between your pin and the real place.|Distance moyenne entre ton épingle et le vrai lieu.|Distância média entre seu pino e o lugar real.|Durchschnittliche Entfernung zwischen deinem Pin und dem echten Ort.|Distanza media tra il tuo pin e il luogo reale.|Distancia promedio entre tu pin y el lugar real.|你的图钉与真实地点之间的平均距离。|핀과 실제 장소 사이의 평균 거리.|ピンと実際の場所との平均距離。|Среднее расстояние между твоей меткой и настоящим местом.|Średnia odległość między twoją pinezką a prawdziwym miejscem."),
      a_flame: A.tip6("Más aciertos seguidos que has logrado.|Longest run of correct answers in a row.|Plus longue série de bonnes réponses.|Maior sequência de acertos seguidos.|Längste Serie richtiger Antworten.|Serie più lunga di risposte giuste.|Más aciertos seguidos que lograste.|最长的连续答对纪录。|가장 긴 연속 정답 기록.|最長の連続正解記録。|Самая длинная серия правильных ответов подряд.|Najdłuższa seria dobrych odpowiedzi z rzędu."),
      m_codex: A.tip6("Tarjetas que has descubierto en la Enciclopedia: lugares, historia, personajes y curiosidades.|Cards you've discovered in the Encyclopedia: places, history, people and curiosities.|Cartes découvertes dans l'Encyclopédie : lieux, histoire, personnages et curiosités.|Cartas que você descobriu na Enciclopédia: lugares, história, personagens e curiosidades.|In der Enzyklopädie entdeckte Karten: Orte, Geschichte, Persönlichkeiten und Kuriositäten.|Carte scoperte nell'Enciclopedia: luoghi, storia, personaggi e curiosità.|Tarjetas que descubriste en la Enciclopedia: lugares, historia, personajes y curiosidades.|百科全书中已发现的卡片：地点、历史、人物和趣闻。|도감에서 발견한 카드: 장소, 역사, 인물, 흥미로운 사실.|図鑑で発見したカード：場所、歴史、人物、豆知識。|Карточки, открытые в энциклопедии: места, история, личности и любопытные факты.|Karty odkryte w Encyklopedii: miejsca, historia, postacie i ciekawostki."),   // cuenta todas las tarjetas, no solo lugares
      crown: A.tip6("Tu mejor puntuación en una expedición.|Your best score in an expedition.|Ton meilleur score en expédition.|Sua melhor pontuação em uma expedição.|Deine beste Punktzahl in einer Expedition.|Il tuo miglior punteggio in una spedizione.||你在一次远征中的最高分。|원정 한 번에서 거둔 최고 점수.|1回の遠征での最高スコア。|Твой лучший результат за экспедицию.|Twój najlepszy wynik w wyprawie."),
    };
    const cell = (l, v, ico) => `<div class="pf-cell" ${A.ttAttr(l, CELL_TIP[ico] || "")}>${A.icon(ico)}<span>${l}</span><b>${v}</b></div>`;
    /* Logros: la UNICA pantalla que se desplaza (game.js no la encoge: clase .scrolls). A todo el ancho, por tramos de dificultad,
       con la ilustracion de cada logro, su progreso ("37 / 100", como en Steam) o la fecha en que se consiguio */
    const ROMAN = ["I", "II", "III", "IV", "V", "✦"], prog = A.ach.progress(), got = a => !!P.ach[a.id];
    const LOC = { pt: "pt-BR", zh: "zh-CN" }[A.lang] || A.lang || "es";
    const day = ts => { try { return new Intl.DateTimeFormat(LOC, { day: "numeric", month: "short", year: "numeric" }).format(ts); } catch (e) { return new Date(ts).toLocaleDateString(); } };
    const pct = (n, d) => Math.round((100 * n) / Math.max(1, d));
    const card = a => {
      const g = got(a), hid = a.secret && !g, pr = !g && prog[a.id];
      const badge = hid ? `<span class="ic badge">${A.icon(A.ACH_FRAME[a.ev] || "blank_boss", "bd-base")}${A.icon("lock", "bd-in")}</span>` : A.badge(a.id);
      const foot = g ? `<span class="ac-f is-got">${A.icon("u_star", "sm")}<em>${day(P.ach[a.id])}</em></span>`
        : pr ? `<span class="ac-f"><span class="ac-pb"><s style="width:${pct(pr[0], pr[1])}%"></s></span><em>${A.fmt(pr[0])} / ${A.fmt(pr[1])}</em></span>` : "";
      return `<article class="ac${g ? " got" : ""}${hid ? " hid" : ""}"><span class="ac-b">${badge}</span><span class="ac-t"><b>${hid ? "???" : A.tx(a.name)}</b><i>${hid ? T("Logro secreto", "Secret achievement") : A.tx(a.desc)}</i></span>${foot}</article>`;
    };
    const tiers = A.ACH_TIERS.map((t, i) => { const list = A.ACH.filter(a => a.tier === i); return { t, i, list, n: list.filter(got).length }; }).filter(x => x.list.length);
    const total = A.ach.total(), done = A.ach.count();
    const jump = tiers.map(x => `<button class="ac-jump-b${x.n === x.list.length ? " full" : ""}" data-t="${x.i}" type="button"><span class="ac-rn">${ROMAN[x.i]}</span><span class="ac-jn"><b>${A.tx(x.t.n)}</b><em>${x.n}/${x.list.length}</em></span></button>`).join("");
    const sec = (x, cards) => `<section class="ac-sec" id="acSec${x.i}"><header class="ac-th"><span class="ac-rn">${ROMAN[x.i]}</span><span class="ac-tn"><b>${A.tx(x.t.n)}</b><i>${A.tx(x.t.t)}</i></span><span class="ac-tc"><b>${x.n}<i>/${x.list.length}</i></b><u><s style="width:${pct(x.n, x.list.length)}%"></s></u></span></header>
      <div class="ac-grid">${cards.join("")}</div></section>`;
    /* se pinta primero lo de arriba (estadisticas, resumen y el primer tramo; la pantalla aun esta entrando en fundido) y el resto llega por tandas de 12 logros, una por fotograma y ya
       ajustadas, por debajo de la vista: maquetar los 100 logros de golpe paraba el mapa de fondo unos fotogramas al abrir el Perfil */
    const FIRST = 1, CHUNK = 12, steps = [];
    tiers.slice(FIRST).forEach(x => { const cs = x.list.map(card); for (let j = 0; j < cs.length; j += CHUNK) steps.push({ x, cards: cs.slice(j, j + CHUNK), first: !j }); });
    c.dialog(scr(T("Perfil", "Profile"), `
      <div class="pf-grid">${cell(T("Preguntas", "Questions"), A.fmt(s.questions), "a_pin")}${cell(T("Dianas", "Bullseyes"), A.fmt(s.bulls), "a_target")}${cell(T("Error medio", "Avg. error"), A.fmtDist(avg), "a_lens")}${cell(T("Mejor racha", "Best streak"), s.bestStreak, "a_flame")}${cell(T("Enciclopedia", "Encyclopedia"), st.u + "/" + st.t, "m_codex")}${cell(T("Récord aventura", "Adventure best"), A.fmt(P.adv.bestScore), "crown")}</div>
      <section class="ac-sum"><span class="ac-sum-l"><span class="ac-k">${T("Logros", "Achievements")}</span><b>${done}<i>/${total}</i></b></span><span class="ac-bar"><s style="width:${pct(done, total)}%"></s></span><em class="ac-pct">${pct(done, total)}%</em><nav class="ac-jump">${jump}</nav></section>
      ${tiers.slice(0, FIRST).map(x => sec(x, x.list.map(card))).join("")}`, "s-prof scrolls"), "tablewrap");
    wireTools(); $("hubBack").onclick = () => screen("home");
    if (A.dealer && A.dealer.profile) A.dealer.profile();              // su libreta: lo que ha cambiado desde tu ultima visita, o una casilla que se da la vuelta
    document.querySelectorAll(".ac-jump-b").forEach(b => (b.onclick = () => { const el = $("acSec" + b.dataset.t); if (el) { A.sfx.card(); el.scrollIntoView({ behavior: "smooth", block: "start" }); } }));
    const body = document.querySelector("#dlg .s-prof .scr-body"); let k = 0;
    const more = () => {
      if (!body || !body.isConnected || k >= steps.length) return;
      const st = steps[k++];
      if (st.first) { body.insertAdjacentHTML("beforeend", sec(st.x, st.cards)); if (A.squeeze) A.squeeze(body.lastElementChild); }
      else { const g = $("acSec" + st.x.i).querySelector(".ac-grid"), n = g.children.length; g.insertAdjacentHTML("beforeend", st.cards.join("")); if (A.squeeze) A.squeeze([...g.children].slice(n)); }
      if (A.fitMark) A.fitMark();                                                     // lo anadido ya va ajustado: los repasos de A.fitK no rehacen el Perfil entero
      if (k < steps.length) requestAnimationFrame(more);
    };
    requestAnimationFrame(() => requestAnimationFrame(more));
  }

  function screen(id) {
    A.podio.reset();                                                  // el podio de la portada no se queda encima de otra pantalla
    C().S.hub = id;
    ({ home, classic: () => campaigns("classic"), adventure, daily, profile, patch: () => A.parche.open() }[id] || home)();
    C().refreshSkinBits && C().refreshSkinBits();
  }
  A.hub = { render: id => screen(id || "home"), screen, plaque, frame: scr, wireTools };
})(window.AIQ);
