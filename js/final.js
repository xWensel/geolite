/*
 * Geolite - LOS CREDITOS FINALES (v0.3.3). Ganas una expedicion en Ascension V y Don Crupier se jubila (js/dealer.js, retireRun): se despide
 * bajo el foco, chasquea los dedos y apaga la tele. Aqui empieza lo demas: una sala negra con cortinas rojas, el rodillo de creditos con el vals
 * de la BSO (pista 06), tu hoja de servicios con datos reales, el crupier otra vez bajo su foco con su placa de jubilado, el golpe del FIN y,
 * al pulsar, se cierran las cortinas y se apaga la sala. Despues dealer.js cierra el juego (escritorio) o vuelve a la portada (web).
 *
 *   A.final.play({ name, stats: [[etiqueta, valor], ...], date, finale(stage, next), done() })
 *     finale: coloca al crupier en `stage` (D.dock) y le hace hablar; next() cuando acabe. done: tras cerrar las cortinas (la sala ya negra).
 * Mantener pulsado (raton, espacio) = x5; Esc (B del mando) = saltar al final; al final, cualquier tecla o clic cierra.
 * Los textos son provisionales (los creditos se definiran mejor): solo lo legal (Wikipedia, Commons, remitir a Creditos y licencias) y el autor.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id), P6 = s => A.pick6(s), esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TRACK = 5;                                                     // 06-vals-real.mp3 (1:45): el rodillo cae en su ultima frase
  const ROLL_S = 80;                                                   // segundos de rodillo a velocidad normal

  /* ---------- textos (es|en|fr|pt|de|it|es-419|zh|ko|ja|ru|pl; vacio = el de al lado en espanol) */
  const TX = {
    by: "Un juego de|A game by|Un jeu de|Um jogo de|Ein Spiel von|Un gioco di||出品|제작|制作|Игра от|Gra studia",
    design: "Diseño, programación y arte|Design, code and art|Conception, programmation et graphismes|Design, programação e arte|Design, Programmierung und Grafik|Design, programmazione e grafica||设计、程序与美术|디자인, 프로그래밍, 아트|デザイン・プログラム・アート|Дизайн, программирование и графика|Projekt, programowanie i grafika",
    ost: "Banda sonora original|Original soundtrack|Bande originale|Trilha sonora original|Original-Soundtrack|Colonna sonora originale||原声音乐|오리지널 사운드트랙|オリジナルサウンドトラック|Оригинальный саундтрек|Oryginalna ścieżka dźwiękowa",
    cast: "Reparto|Cast|Distribution|Elenco|Besetzung|Cast||演员表|출연|キャスト|В ролях|Obsada",
    himself: "Él mismo|Himself|Lui-même|Ele mesmo|Er selbst|Se stesso||本色出演|본인|本人|Сам себя|We własnej osobie",
    who: "Quien lo jubiló|The one who retired him|Celui qui l'a mis à la retraite|Quem o aposentou|Wer ihn in Rente schickte|Chi l'ha mandato in pensione||让他退休的人|그를 은퇴시킨 사람|彼を引退させた人|Кто отправил его на пенсию|Kto wysłał go na emeryturę",
    you: "Tú|You|Toi|Você|Du|Tu||你|너|君|Ты|Ty",
    sheet: "Tu hoja de servicios|Your service record|Tes états de service|Sua folha de serviço|Deine Dienstakte|Il tuo stato di servizio||你的服务记录|너의 근무 기록|君の勤務記録|Твой послужной список|Twój przebieg służby",
    settle: "Liquidación final|Final settlement|Solde de tout compte|Acerto final|Schlussabrechnung|Liquidazione finale||最终结算|최종 정산|最終精算|Окончательный расчёт|Rozliczenie końcowe",
    retired: "Crupieres jubilados|Dealers retired|Croupiers mis à la retraite|Crupiês aposentados|Croupiers in Rente|Croupier in pensione||退休的荷官|은퇴시킨 딜러|引退させたディーラー|Крупье на пенсии|Krupierzy na emeryturze",
    stamp: "Jubilado|Retired|Retraité|Aposentado|In Rente|In pensione||已退休|은퇴|引退|На пенсии|Na emeryturze",
    thanksVisit: "Gracias por su visita · Vuelva pronto|Thank you for your visit · Come back soon|Merci de votre visite · À bientôt|Obrigado pela visita · Volte sempre|Danke für Ihren Besuch · Bis bald|Grazie della visita · Torni presto||感谢光临 · 欢迎再来|방문해 주셔서 감사합니다 · 또 오세요|ご来店ありがとうございました|Спасибо за визит · Приходите ещё|Dziękujemy za wizytę · Zapraszamy ponownie",
    wikiH: "Textos de la Enciclopedia|Encyclopedia texts|Textes de l'Encyclopédie|Textos da Enciclopédia|Texte der Enzyklopädie|Testi dell'Enciclopedia||百科全书文本|백과사전 글|百科事典のテキスト|Тексты энциклопедии|Teksty encyklopedii",
    wiki: "Wikipedia y sus editores|Wikipedia and its editors|Wikipédia et ses contributeurs|A Wikipédia e seus editores|Wikipedia und ihre Autoren|Wikipedia e i suoi autori||维基百科及其编者|위키백과와 편집자들|ウィキペディアとその編集者たち|Википедия и её авторы|Wikipedia i jej autorzy",
    lic: "Licencia CC BY-SA 4.0|License: CC BY-SA 4.0|Licence CC BY-SA 4.0|Licença CC BY-SA 4.0|Lizenz CC BY-SA 4.0|Licenza CC BY-SA 4.0||许可协议 CC BY-SA 4.0|라이선스 CC BY-SA 4.0|ライセンス CC BY-SA 4.0|Лицензия CC BY-SA 4.0|Licencja CC BY-SA 4.0",
    photosH: "Fotografías y banderas|Photos and flags|Photos et drapeaux|Fotos e bandeiras|Fotos und Flaggen|Foto e bandiere||照片与旗帜|사진과 깃발|写真と国旗|Фотографии и флаги|Zdjęcia i flagi",
    photos: "Los autores de Wikimedia Commons|The authors of Wikimedia Commons|Les auteurs de Wikimedia Commons|Os autores do Wikimedia Commons|Die Urheber auf Wikimedia Commons|Gli autori di Wikimedia Commons||维基共享资源的作者们|위키미디어 공용의 저작자들|ウィキメディア・コモンズの作者たち|Авторы Викисклада|Autorzy z Wikimedia Commons",
    photosS: "Cada foto, con su autor y su licencia, en «{c}» (Ajustes)|Every photo, with its author and license, in “{c}” (Settings)|Chaque photo, avec son auteur et sa licence, dans « {c} » (Réglages)|Cada foto, com autor e licença, em “{c}” (Configurações)|Jedes Foto mit Urheber und Lizenz unter „{c}“ (Einstellungen)|Ogni foto, con autore e licenza, in «{c}» (Impostazioni)||每张照片的作者与许可，见“{c}”（设置）|사진마다 저작자와 라이선스는 '{c}'(설정)에서|各写真の作者とライセンスは「{c}」（設定）に|Автор и лицензия каждого фото — в разделе «{c}» (Настройки)|Autor i licencja każdego zdjęcia: „{c}” (Ustawienia)",
    fontsH: "Tipografías|Fonts|Polices|Fontes|Schriften|Caratteri||字体|글꼴|フォント|Шрифты|Kroje pisma",
    fontsS: "Yellowtail, de Astigmatic, en el logo del estudio|Yellowtail by Astigmatic, in the studio logo|Yellowtail, d'Astigmatic, dans le logo du studio|Yellowtail, da Astigmatic, no logo do estúdio|Yellowtail von Astigmatic im Studiologo|Yellowtail di Astigmatic, nel logo dello studio||工作室标志使用 Astigmatic 的 Yellowtail|스튜디오 로고: Astigmatic의 Yellowtail|スタジオロゴは Astigmatic の Yellowtail|Yellowtail от Astigmatic — в логотипе студии|Yellowtail od Astigmatic w logo studia",
    mapH: "Mapa del mundo|World map|Carte du monde|Mapa-múndi|Weltkarte|Mappa del mondo||世界地图|세계 지도|世界地図|Карта мира|Mapa świata",
    mapA: "world-atlas, de Mike Bostock|world-atlas by Mike Bostock|world-atlas, de Mike Bostock|world-atlas, de Mike Bostock|world-atlas von Mike Bostock|world-atlas di Mike Bostock||world-atlas，Mike Bostock|world-atlas, Mike Bostock|world-atlas（Mike Bostock）|world-atlas, Майк Босток|world-atlas, Mike Bostock",
    deskH: "Versión de escritorio|Desktop version|Version de bureau|Versão para computador|Desktop-Version|Versione desktop||桌面版|데스크톱 버전|デスクトップ版|Версия для ПК|Wersja na komputery",
    desk: "Electron y Chromium|Electron and Chromium|Electron et Chromium|Electron e Chromium|Electron und Chromium|Electron e Chromium||Electron 与 Chromium|Electron 및 Chromium|Electron と Chromium|Electron и Chromium|Electron i Chromium",
    thanks: "Gracias por jugar|Thanks for playing|Merci d'avoir joué|Obrigado por jogar|Danke fürs Spielen|Grazie per aver giocato||感谢游玩|플레이해 줘서 고마워|遊んでくれてありがとう|Спасибо за игру|Dzięki za grę",
    thanksS: "A ti, que has llegado hasta el final.|To you, for making it all the way to the end.|À toi, qui as tenu jusqu'au bout.|A você, que chegou até o fim.|Für dich – du hast bis zum Ende durchgehalten.|A te, che hai resistito fino alla fine.|A ti, que llegaste hasta el final.|献给一路走到最后的你。|끝까지 와 준 너에게.|最後までたどり着いた君へ。|Тебе — за весь путь до самого конца.|Tobie — za całą drogę aż do końca.",
    dedic: "Dedicado a|Dedicated to|Dédié à|Dedicado a|Gewidmet|Dedicato a||谨献给|이 게임을 바칩니다|この作品を捧げる|Посвящается|Dedykuję",
    daughter: "mi hija|my daughter|ma fille|minha filha|meine Tochter|mia figlia||我的女儿|내 딸|娘|моей дочери|mojej córce",
    wife: "mi mujer|my wife|ma femme|minha esposa|meine Frau|mia moglie||我的妻子|내 아내|妻|моей жене|mojej żonie",
    special: "Dedicatoria especial|Special dedication|Dédicace spéciale|Dedicatória especial|Besondere Widmung|Dedica speciale||特别献给|특별한 헌사|特別な感謝を|Особая благодарность|Specjalna dedykacja",
    tester: "Mi incansable beta tester|My tireless beta tester|Mon infatigable bêta-testeur|Meu incansável beta tester|Mein unermüdlicher Betatester|Il mio instancabile beta tester||我那不知疲倦的测试员|지칠 줄 모르는 나의 베타 테스터|疲れ知らずのベータテスター|Моему неутомимому бета-тестеру|Mojemu niestrudzonemu beta testerowi",
    name: "Don Crupier|The Dealer|Don Croupier|Dom Crupiê|Don Croupier|Don Croupier||荷官先生|딜러 나리|ドン・ディーラー|Дон Крупье|Don Krupier",
    plate: "Jubilado el {d}|Retired on {d}|Retraité le {d}|Aposentado em {d}|In Rente seit dem {d}|In pensione · {d}||{d}退休|{d} 은퇴|{d} 引退|На пенсии с {d}|Na emeryturze od {d}",
    fin: "FIN|THE END|FIN|FIM|ENDE|FINE||剧终|끝|完|КОНЕЦ|KONIEC",
    hold: "Mantén|Hold|Maintiens|Segure|Halten|Tieni premuto||按住|길게|長押し|Держи|Przytrzymaj",
    fast: "acelerar|speed up|accélérer|acelerar|vorspulen|accelera||加速|빨리 감기|早送り|ускорить|przyspiesz",
    skip: "saltar|skip|passer|pular|überspringen|salta||跳过|건너뛰기|スキップ|пропустить|pomiń",
    close: "Pulsa para cerrar el casino|Press to close the casino|Appuie pour fermer le casino|Toque para fechar o cassino|Drücken, um das Casino zu schließen|Premi per chiudere il casinò||按任意键打烊|눌러서 카지노 문 닫기|押してカジノを閉める|Нажми, чтобы закрыть казино|Naciśnij, aby zamknąć kasyno",
  };

  /* ---------- la sala (se monta una vez, fuera de #app: #app esta apagado como una tele) */
  let root = null, st = null;
  function mount() {
    if (root) return root;
    root = document.createElement("div"); root.id = "fin"; root.className = "fin"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true");
    root.innerHTML = `<i class="fin-glow"></i><div class="fin-dust" id="finDust"></div>
      <div class="fin-view"><div class="fin-roll" id="finRoll"><div class="fin-roll-in" id="finRollIn"></div></div></div>
      <i class="fin-cur l"></i><i class="fin-cur r"></i>
      <div class="fin-end" id="finEnd"><div class="fin-end-in">
        <div class="qx-stage fin-stage" id="finStage"><i class="qx-beam" id="finBeam"></i><i class="qx-pool"></i></div>
        <div class="fin-plate"><b id="finPlateN"></b><span id="finPlateD"></span></div>
        <div class="fin-word" id="finWord"></div>
      </div></div>
      <i class="fin-scan"></i><i class="fin-vig"></i>
      <div class="fin-back" id="finBack"></div>
      <div class="fin-hint" id="finHint"></div>`;
    document.body.appendChild(root);
    const dust = $("finDust"), beam = $("finBeam");
    for (let i = 0; i < 26; i++) { const u = document.createElement("u"); u.style.cssText = `--x:${(Math.random() * 100).toFixed(1)}%;--d:${(14 + Math.random() * 16).toFixed(1)}s;--w:${(-Math.random() * 30).toFixed(1)}s;--dx:${(Math.random() * 60 - 30) | 0}px`; dust.appendChild(u); }
    for (let i = 0; i < 14; i++) { const u = document.createElement("u"); u.style.cssText = `--x:${(30 + Math.random() * 40).toFixed(1)}%;--y:${(40 + Math.random() * 55).toFixed(1)}%;--d:${(4 + Math.random() * 5).toFixed(1)}s;--w:${(-Math.random() * 8).toFixed(1)}s`; beam.appendChild(u); }
    root.addEventListener("pointerdown", e => { if (!st) return; e.preventDefault(); if (st.phase === "wait") return leave(); fast(true); });
    root.addEventListener("click", e => { if (st && st.phase === "wait") leave(); });              // el mando pulsa con un clic sintetico
    root.addEventListener("contextmenu", e => e.preventDefault());
    addEventListener("pointerup", () => fast(false)); addEventListener("blur", () => fast(false));
    addEventListener("keydown", e => {
      if (!st) return; e.preventDefault(); e.stopImmediatePropagation();                     // nada del juego (pausa, Ajustes, atajos) por debajo
      if (st.phase === "wait") { if (!e.repeat) leave(); return; }
      if (e.key === "Escape") skip(); else if ((e.key === " " || e.key === "Enter") && !e.repeat) fast(true);
    }, true);
    addEventListener("keyup", e => { if (st && (e.key === " " || e.key === "Enter")) { e.stopImmediatePropagation(); fast(false); } }, true);
    return root;
  }
  const later = (fn, ms) => { const s = st; if (s) s.T.push(setTimeout(() => { if (st === s) fn(); }, ms)); };

  /* ---------- el rodillo */
  function rollHTML(o) {
    const sec = (h, body, cls = "") => `<section class="${cls}"><i class="fin-pip"></i>${h ? `<h3>${P6(h)}</h3>` : ""}${body}</section>`;
    const n = t => `<p class="fin-n">${t}</p>`, s = t => `<p class="fin-s">${t}</p>`;
    const mug = A.crupier && A.crupier.still ? A.crupier.still("smug", 1) : "";
    const rows = (o.stats || []).map(([k, v]) => `<div class="fin-tk-r"><span>${esc(k)}</span><i></i><b>${esc(v)}</b></div>`).join("");
    let when = ""; try { when = new Date().toLocaleString(locale(), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { /* formato */ }
    return [
      `<section class="fin-open"><img class="fin-logo" src="assets/logo.png" alt="Geolite" draggable="false"><p class="fin-by">${P6(TX.by)}</p><div class="fin-cs" id="finCs"></div></section>`,
      sec(TX.design, n("Cousins Studios")),
      sec(TX.ost, n("Álvaro Cano")),
      sec(TX.cast, `<div class="fin-cast">
        <div class="fin-row"><span class="fin-mug">${mug ? `<img src="${mug}" alt="">` : ""}</span><b>${P6(TX.name)}</b><i></i><em>${P6(TX.himself)}</em></div>
        <div class="fin-row"><span class="fin-mug q">?</span><b>${P6(TX.who)}</b><i></i><em>${esc(o.name || P6(TX.you))}</em></div></div>`),
      sec(TX.sheet, `<div class="fin-tk">
        <div class="fin-tk-h"><b>Geolite · Casino</b>${P6(TX.settle)}<small>${esc(o.table || "")}${when ? " · " + esc(when) : ""}</small></div><hr>${rows}<hr>
        <div class="fin-tk-r red"><span>${P6(TX.retired)}</span><i></i><b>1</b></div>
        <span class="fin-tk-stamp">${P6(TX.stamp)}</span><p class="fin-tk-foot">${P6(TX.thanksVisit)}</p></div>`),
      sec(TX.wikiH, n(P6(TX.wiki)) + s(P6(TX.lic))),
      sec(TX.photosH, n(P6(TX.photos)) + s(esc(P6(TX.photosS).replace("{c}", A.t("set.credits"))))),
      sec(TX.fontsH, n("Silkscreen · Pixelify Sans") + n("Jersey 15 · Tiny5") + n("Fusion Pixel Font") + s(P6(TX.fontsS))),
      sec(TX.mapH, n(P6(TX.mapA)) + n("Natural Earth")),
      sec(TX.deskH, n(P6(TX.desk)) + n("steamworks.js") + s("Steamworks SDK © Valve Corporation")),
      sec("", n(P6(TX.thanks)) + s(P6(TX.thanksS)), "fin-thanks"),
      sec(TX.dedic, `<div class="fin-fam"><div><p class="fin-n">Alejandra</p>${s(P6(TX.daughter))}</div><div><p class="fin-n">Alicia</p>${s(P6(TX.wife))}</div></div>
        <p class="fin-cube" aria-label="A al cubo">A<sup>3</sup></p>`, "fin-ded"),
      sec(TX.special, n("Hugiitop") + s(P6(TX.tester)), "fin-ded fin-last"),
    ].join("");
  }
  function locale() { const L = (A.LANGS || []).find(l => l.code === A.lang); return L ? L.loc : undefined; }
  /* "Cousins" en oro y "studios" en perla, como en la intro del estudio (el mismo trazado de js/logo.js) */
  function csLogo(host) {
    if (!A.buildLogo || !A.CS_LETTERS) return;
    const svg = A.buildLogo(host, { className: "fin-csl" }), d = document.createElementNS(svg.namespaceURI, "defs");
    d.innerHTML = `<linearGradient id="finGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0c4"/><stop offset=".48" stop-color="#ffd98a"/><stop offset=".55" stop-color="#e2a24a"/><stop offset="1" stop-color="#b3741c"/></linearGradient>`;
    svg.prepend(d); const ps = svg.querySelectorAll("path");
    A.CS_LETTERS.forEach(([c], i) => { if (ps[i]) ps[i].setAttribute("fill", c === "small" ? "#ece9e3" : "url(#finGold)"); });
  }

  function play(o = {}) {
    mount(); if (st) stop();
    st = { o, T: [], phase: "roll", y: 0, end: 0, speed: 0, hold: 4.5, fast: false, raf: 0, last: 0 };
    root.className = "fin on"; root.style.opacity = ""; $("finEnd").className = "fin-end"; $("finBack").className = "fin-back"; $("finBack").textContent = P6(TX.close);
    $("finHint").className = "fin-hint"; $("finHint").innerHTML = `<span><kbd>${P6(TX.hold)}</kbd>${P6(TX.fast)}</span><span><kbd>Esc</kbd>${P6(TX.skip)}</span>`;
    $("finPlateN").textContent = P6(TX.name); $("finPlateD").textContent = P6(TX.plate).replace("{d}", o.date || "");
    $("finWord").textContent = P6(TX.fin);
    const ri = $("finRollIn"); ri.innerHTML = rollHTML(o); csLogo($("finCs")); $("finRoll").style.visibility = ""; $("finRoll").style.opacity = "";
    A.music.muffle(false); A.music.go(TRACK, true);
    reduced() ? root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 })
      : root.animate([{ transform: "scale(0, .006)", filter: "brightness(4)", easing: "cubic-bezier(.2, .6, .4, 1)" }, { transform: "scale(1.02, .008)", filter: "brightness(3)", offset: .4 }, { transform: "none", filter: "brightness(1)" }], { duration: 560 });
    if (A.sfx.restore) A.sfx.restore();
    later(() => { root.classList.add("open"); }, 500);
    later(startRoll, 120);
  }
  function startRoll() {
    const r = $("finRoll"), H = r.offsetHeight, dpr = window.devicePixelRatio || 1;   // se mide una vez (nunca por fotograma) y sin transformaciones: la sala aun se esta encendiendo como una tele
    st.end = null; st.speed = (H - innerHeight) / ROLL_S; st.last = performance.now(); st.rest = 6;
    /* donde se para: las dos dedicatorias centradas en pantalla. Se mide con la sala ya encendida (sin la escala de la tele) y con el zoom de la pantalla incluido */
    const stopAt = () => { const F = r.querySelector(".fin-ded"), L = r.querySelector(".fin-last"); if (!F || !L) return -H + innerHeight * 0.35;   // las dos dedicatorias juntas, centradas
      const a = F.getBoundingClientRect(), b = L.getBoundingClientRect(), pad = parseFloat(getComputedStyle(L).paddingBottom) * (b.height / (L.offsetHeight || 1));
      return st.y - ((a.top + b.bottom - pad) / 2 - innerHeight / 2); };
    const tick = now => {
      if (!st || st.phase !== "roll") return;
      const dt = Math.min(0.05, (now - st.last) / 1000), k = st.fast ? 5 : 1; st.last = now;
      if (st.hold > 0) st.hold -= dt * k; else { if (st.end == null) st.end = stopAt(); st.y = Math.max(st.end, st.y - st.speed * dt * k); }   // el logo se queda quieto un rato antes de que arranque
      r.style.transform = `translate3d(0, ${Math.round(st.y * dpr) / dpr}px, 0)`;   // a pixel entero: el texto pixelado no se emborrona al subir
      if (st.end != null && st.y <= st.end) { st.rest -= dt; if (st.rest <= 0) return finale(); }   // se queda quieta 6 s en las dedicatorias (acelerar no las acorta)
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
  }
  function fast(on) { if (!st) return; st.fast = !!on && st.phase === "roll"; $("finHint").classList.toggle("fast", st.fast); }
  function skip() { if (st && st.phase === "roll") finale(); }

  /* ---------- el final: el crupier bajo su foco, su placa, sus dos frases y el FIN */
  function finale() {
    cancelAnimationFrame(st.raf); st.phase = "end"; fast(false); $("finHint").classList.add("hide");
    const r = $("finRoll"), e = $("finEnd");
    root.classList.add("wide");                                         // las cortinas se abren del todo: sitio para su globo
    r.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" }).onfinish = () => { r.style.visibility = "hidden"; };
    later(() => { if (A.sfx.spot) A.sfx.spot(); e.classList.add("lit"); }, 500);
    later(() => e.classList.add("plated"), 1400);
    later(() => {
      const next = () => later(() => {
        e.classList.add("fin"); later(() => { if (A.sfx.stamp) A.sfx.stamp(); const x = e.querySelector(".fin-end-in"); x.classList.remove("shake"); void x.offsetWidth; x.classList.add("shake"); A.haptic && A.haptic([40]); }, 300);
        later(() => { st.phase = "wait"; $("finBack").classList.add("on"); }, 2200);
      }, 200);
      if (st.o.finale) st.o.finale($("finStage"), next); else next();
    }, 1700);
  }
  function leave() {                                                   // las cortinas se cierran y la sala se apaga
    if (!st || st.phase !== "wait") return; st.phase = "out"; $("finBack").className = "fin-back";
    root.classList.add("closing");
    later(() => {
      if (A.sfx.powerdown) A.sfx.powerdown(); A.music.stop();
      const a = reduced() ? root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, fill: "forwards" })
        : root.animate([{ transform: "none", filter: "brightness(1)" }, { transform: "scale(1.02, .008)", filter: "brightness(2.8)", offset: .52 }, { transform: "scale(0, 0)", filter: "brightness(0)" }], { duration: 640, fill: "forwards" });
      later(() => { const o = st.o; a.cancel(); root.style.opacity = "0"; stop(); if (o.done) o.done(); }, 900);
    }, 1400);
  }
  function stop() { if (!st) return; st.T.forEach(clearTimeout); cancelAnimationFrame(st.raf); st = null; root.className = "fin"; $("finRollIn").innerHTML = ""; }

  A.final = { play, active: () => !!st };
})(window.AIQ);
