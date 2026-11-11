/*
 * Geolite - TUTORIAL GUIADO (v0.14). El crupier te enseña la mesa la primera vez: un foco ilumina cada parte de la pantalla y una tarjeta
 * explica para que sirve. Se puede saltar en cualquier momento, se recuerda en el perfil (P.tour) y se reactiva en Ajustes > General.
 *   A.tour.maybe("q" | "camp")   lo llaman la Aventura (primera pregunta) y el Campamento (primera visita)
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id), C = () => A.core;
  const t6 = s => A.tip6(s);

  /* cada paso: sel = elemento que se ilumina (si no existe o esta oculto, se salta; una lista = dos focos a la vez: el primero lleva la tarjeta), txt = es|en|fr|pt|de|it|es-419|zh|ko|ja|ru|pl */
  const TOURS = {
    /* la primera pregunta la explica el en primera persona y en cuatro pasos (revision final: antes seis cajas neutras) */
    q: [
      { sel: "#plate", txt: "Este es el sitio que te pido. Debajo, su país. De nada.|This is the place I'm asking for. Below it, its country. You're welcome.|Voici le lieu que je te demande. En dessous, son pays. De rien.|Este é o lugar que eu peço. Embaixo, o país dele. De nada.|Das ist der Ort, den ich von dir will. Darunter sein Land. Gern geschehen.|Questo è il posto che ti chiedo. Sotto, il suo paese. Prego.||这就是我要你找的地方。下面是它所在的国家。不用谢。|제가 찾으라는 곳이 바로 여기예요. 아래엔 그 나라가 적혀 있고요. 천만에요.|これが私の出すお題。下にはその国。礼には及ばない。|Вот место, которое я загадал. Ниже — его страна. Не благодари.|Oto miejsce, o które pytam. Niżej jego kraj. Nie ma za co." },
      { sel: "#map", box: "center", txt: "Pincha en el mapa donde creas que está. Cuanto más cerca, más me cuesta la broma.|Click the map where you think it is. The closer you get, the more it costs me.|Clique sur la carte là où tu penses qu'il se trouve. Plus tu es près, plus ça me coûte cher.|Clique no mapa onde acha que ele fica. Quanto mais perto, mais caro me sai a brincadeira.|Klick auf die Karte, wo du ihn vermutest. Je näher du liegst, desto teurer wird der Spaß für mich.|Clicca sulla mappa dove pensi che sia. Più ti avvicini, più mi costa lo scherzo.|Haz clic en el mapa donde creas que está. Cuanto más cerca, más me cuesta la broma.|在地图上点你觉得它在的位置。你离得越近，我赔得越多。|있을 것 같은 곳을 지도에서 클릭하세요. 가까울수록 제 지갑이 얇아진답니다.|あると思う場所を地図でクリック。近いほど、こちらの懐が痛む。|Кликни на карте туда, где оно, по-твоему, находится. Чем ближе, тем дороже мне обходится эта шутка.|Kliknij na mapie tam, gdzie twoim zdaniem leży. Im bliżej, tym drożej mnie ten żart kosztuje." },
      { sel: [".clock", "#advBar .ab-top"], txt: "El reloj corre, y la prisa también se paga. Arriba, tus doblones y tus provisiones ♥: sin provisiones, se acabó la expedición.|The clock is ticking, and speed pays too. Up top, your doubloons and your provisions ♥: run out of provisions and the expedition is over.|Le chrono tourne, et la vitesse paie aussi. En haut, tes doublons et tes provisions ♥ : sans provisions, l'expédition est finie.|O relógio corre, e a pressa também paga. Lá em cima, seus dobrões e suas provisões ♥: sem provisões, acabou a expedição.|Die Uhr läuft, und Tempo zahlt sich auch aus. Oben: deine Dublonen und dein Proviant ♥. Ohne Proviant ist die Expedition vorbei.|L'orologio corre, e anche la fretta paga. In alto, i tuoi dobloni e le tue provviste ♥: senza provviste, la spedizione è finita.||时钟在走，答得快也有赏。上面是你的金币和补给 ♥：补给用完，远征就到此为止。|시계는 가고 있고, 빠른 답에도 값을 쳐 드려요. 위쪽엔 도블론과 식량 ♥: 식량이 떨어지면 원정은 끝이에요.|時計は進む。速さにも払おう。上にはダブロンと食料♥。食料が尽きれば遠征は終わりだ。|Часы тикают, и за скорость я тоже плачу. Наверху — твои дублоны и запасы ♥: кончатся запасы — экспедиции конец.|Zegar tyka, a za szybkość też płacę. U góry twoje dublony i zapasy ♥: bez zapasów koniec wyprawy." },
      { sel: ["#toolBar .tool", "#ledger"], txt: "Tus herramientas dan pistas y se recargan cada ronda. Y esa marca de ahí es lo mínimo que te exijo.|Your tools give clues and refill every round. And that mark over there is the least I expect from you.|Tes outils donnent des indices et se rechargent à chaque manche. Et cette marque, là, c'est le minimum que j'exige.|Suas ferramentas dão pistas e recarregam a cada rodada. E aquela marca ali é o mínimo que eu exijo.|Deine Werkzeuge geben Hinweise und laden sich jede Runde auf. Und die Marke dort ist das Mindeste, was ich verlange.|I tuoi strumenti danno indizi e si ricaricano a ogni round. E quella soglia lì è il minimo che pretendo.||你的工具会给线索，每回合补满。那边的目标分，是我对你的最低要求。|도구는 단서를 주고 매 라운드 다시 채워져요. 그리고 저기 저 목표 점수가 제가 요구하는 최소한이에요.|道具はヒントをくれて、毎ラウンド補充される。そしてあの目標スコアが、私の求める最低ラインだ。|Твои инструменты дают подсказки и пополняются каждый раунд. А вон та отметка — минимум, который я с тебя требую.|Twoje narzędzia dają podpowiedzi i odnawiają się co rundę. A tamten próg to minimum, którego wymagam." },
    ],
    camp: [
      { sel: ".table .offers", txt: "Entre rondas, el Campamento: gasta doblones en cartas. Lee bien lo que hace cada una: todas pueden servirte en algún momento de esta expedición. Las herramientas se recargan cada ronda.|Between rounds, the Camp: spend doubloons on cards. Read each one carefully: every card can help you at some point in this expedition. Tools refill every round.|Entre les manches, le Campement : dépense tes doublons en cartes. Lis bien ce que fait chacune : toutes peuvent te servir à un moment de cette expédition. Les outils se rechargent à chaque manche.|Entre rodadas, o Acampamento: gaste dobrões em cartas. Leia bem o que cada uma faz: todas podem te servir em algum momento desta expedição. As ferramentas recarregam a cada rodada.|Zwischen den Runden das Lager: gib Dublonen für Karten aus. Lies genau, was jede tut: Jede kann dir irgendwann auf dieser Expedition helfen. Werkzeuge laden sich jede Runde auf.|Tra un round e l'altro, l'Accampamento: spendi dobloni in carte. Leggi bene cosa fa ciascuna: tutte possono servirti prima o poi in questa spedizione. Gli strumenti si ricaricano a ogni round.||回合之间是营地：用金币购买卡牌。仔细读每张牌的作用：它们在本次远征中都可能派上用场。工具每回合补满。|라운드 사이엔 캠프: 도블론으로 카드를 사세요. 각 카드가 무엇을 하는지 잘 읽어 보세요. 모두 이번 원정 어딘가에서 쓸모가 있어요. 도구는 매 라운드 채워져요.|ラウンドの合間はキャンプ：ダブロンでカードを買おう。効果をよく読もう。どれもこの遠征のどこかで役に立つ。道具は毎ラウンド補充される。|Между раундами — Лагерь: трать дублоны на карты. Внимательно читай, что делает каждая: любая может пригодиться в этой экспедиции. Инструменты пополняются каждый раунд.|Między rundami jest Obóz: wydajesz dublony na karty. Czytaj uważnie, co robi każda: każda może się przydać w tej wyprawie. Narzędzia odnawiają się co rundę." },
      { sel: ".tb-next", txt: "Aquí ves los retos del crupier en la próxima ronda. Puedes sobornarlo para quitar uno o barajar para cambiarlos.|Here you see the dealer's challenges for the next round. Bribe him to remove one, or reshuffle to change them.|Ici, les défis du croupier pour la prochaine manche. Soudoie-le pour en retirer un, ou rebats les cartes pour les changer.|Aqui estão os desafios do crupiê na próxima rodada. Suborne-o para remover um ou embaralhe para trocá-los.|Hier siehst du die Herausforderungen des Croupiers für die nächste Runde. Bestich ihn, um eine zu streichen, oder mische neu.|Qui vedi le sfide del croupier nel prossimo round. Corrompilo per toglierne una o rimescola per cambiarle.||这里显示荷官下一回合的挑战。贿赂他来移除一个，或重新洗牌来更换。|여기서 다음 라운드의 딜러 도전을 볼 수 있어요. 매수해서 하나를 없애거나, 다시 섞어서 바꿀 수 있어요.|ここで次のラウンドのディーラーのチャレンジが見られる。買収して1つ消すか、シャッフルして変えよう。|Здесь видны испытания крупье на следующий раунд. Подкупи его, чтобы убрать одно, или перетасуй, чтобы сменить их.|Tu widzisz wyzwania krupiera na następną rundę. Przekup go, żeby usunąć jedno, albo przetasuj, żeby je zmienić." },
      { sel: ".tb-tray", txt: "Abajo, tus reliquias (5 huecos: puedes venderlas), herramientas y el botón para empezar la ronda cuando estés listo.|Below: your relics (5 slots, you can sell them), your tools, and the button to start the round when you're ready.|En bas : tes reliques (5 emplacements, tu peux les vendre), tes outils et le bouton pour lancer la manche.|Embaixo: suas relíquias (5 espaços, dá para vendê-las), ferramentas e o botão para começar a rodada quando estiver pronto.|Unten: deine Relikte (5 Plätze, verkaufbar), Werkzeuge und der Knopf, um die Runde zu starten, wenn du bereit bist.|In basso: le tue reliquie (5 posti, puoi venderle), gli strumenti e il pulsante per iniziare il round quando sei pronto.||下方：你的遗物（5 个栏位，可以出售）、你的工具，以及准备好后开始回合的按钮。|아래: 유물(5칸, 판매 가능), 도구, 그리고 준비되면 라운드를 시작하는 버튼.|下：レリック（5枠、売却可）、道具、そして準備ができたらラウンドを始めるボタン。|Внизу: твои реликвии (5 ячеек, их можно продать), инструменты и кнопка, чтобы начать раунд, когда захочешь.|Na dole: twoje relikty (5 miejsc, możesz je sprzedać), narzędzia i przycisk startu rundy, gdy zechcesz zacząć." },
    ],
  };

  /* textos del paso y del boton de saltar: es | en | fr | pt | de | it | es-419 | zh | ko | ja | ru | pl */
  const EB = "Tutorial · {n} de {m}|Tutorial · {n} of {m}|Tutoriel · {n} sur {m}|Tutorial · {n} de {m}|Tutorial · {n} von {m}|Tutorial · {n} di {m}||教程 · 第 {n}/{m} 步|튜토리얼 · {n}/{m}|チュートリアル · {n}/{m}|Обучение · {n} из {m}|Samouczek · {n} z {m}";
  const EBQ = "Don Crupier · {n} de {m}|The Dealer · {n} of {m}|Don Croupier · {n} sur {m}|Dom Crupiê · {n} de {m}|Don Croupier · {n} von {m}|Don Croupier · {n} di {m}||荷官先生 · 第 {n}/{m} 步|딜러 나리 · {n}/{m}|ドン・ディーラー · {n}/{m}|Дон Крупье · {n} из {m}|Don Krupier · {n} z {m}";
  const SKIP = "Saltar|Skip|Passer|Pular|Überspringen|Salta||跳过|건너뛰기|スキップ|Пропустить|Pomiń";

  let cur = null, froze = false;
  const P = () => A.profile.get();
  const dev = /skipboot/.test(location.search) && !/[?&]tour/.test(location.search);        // las pruebas automaticas no lo activan
  const enabled = () => !dev && (!C() || C().S.tour !== false);

  function freeze(on) {
    const S = C().S, map = C().map;
    if (on && S.phase === "asking" && !S.paused) { S.paused = true; S.pauseAt = performance.now(); map.setPick(false); froze = true; }
    else if (!on && froze) { froze = false; if (S.paused && S.phase === "asking") { S.pausedAcc += performance.now() - S.pauseAt; S.paused = false; map.setPick(true); } }
  }
  const sels = s => [].concat(s.sel);
  const visible = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && !el.closest(".hidden") && getComputedStyle(el).visibility !== "hidden"; };

  function ensure() {
    let el = $("tour"); if (el) return el;
    el = document.createElement("div"); el.id = "tour"; el.className = "tour hidden";
    el.innerHTML = `<i class="tour-dim"></i><i class="tour-hole"></i><i class="tour-hole b"></i><div class="tour-card"><div class="tour-paper gx-paper"><div class="tour-face"></div><div class="tour-body"><span class="tour-eb gx-eyb"></span><p class="tour-txt"></p></div>
      <div class="tour-nav gx-acts"><button type="button" class="tour-skip gx-btn sm gho"></button><button type="button" class="tour-next gx-btn sm pri" data-primary></button></div></div></div>`;
    $("app").appendChild(el);
    /* bloque D: el crupier entero, a su tamano (el mismo en todas las pantallas), junto al borde: abajo a la izquierda, o a la derecha si ahi esta
       lo que explica; señala lo que explica (antes, su cabeza dentro de la tarjeta) */
    const cr = document.createElement("div"); cr.className = "tour-cr"; cr.innerHTML = '<div class="tour-crf"></div>'; el.appendChild(cr);
    if (A.crupier) { face = A.crupier.mount(cr.firstElementChild, { fidget: false, casa: true }); face.follow(true); }
    return el;
  }
  let face = null, faceT = 0;
  /* mientras aparece cada explicacion mueve la boca un momento (el texto sale de golpe: se le ve hablar, sin maquina de escribir) */
  const mouth = n => { if (!face) return; clearInterval(faceT); face.talk(true); let k = 0; faceT = setInterval(() => { face.syl(); if (++k > n) { clearInterval(faceT); face.talk(false); } }, 70); };

  function place(step) {
    const el = $("tour"), holes = el.querySelectorAll(".tour-hole"), card = el.querySelector(".tour-card");
    const vw = innerWidth, vh = innerHeight;
    let rs;
    if (step.box === "center") { const w = Math.min(vw * 0.5, 520), h = Math.min(vh * 0.32, 240); rs = [{ left: (vw - w) / 2, top: vh * 0.46, width: w, height: h }]; }
    else rs = sels(step).map(sel => {
      const els = [...document.querySelectorAll(sel)].filter(visible), p = 8; if (!els.length) return null;   // varios elementos (cartas de herramienta): se ilumina el conjunto
      const bs = els.map(e => e.getBoundingClientRect()), l = Math.min(...bs.map(b => b.left)), t = Math.min(...bs.map(b => b.top)), rr = Math.max(...bs.map(b => b.right)), bb = Math.max(...bs.map(b => b.bottom));
      return { left: Math.round(l - p), top: Math.round(t - p), width: Math.round(rr - l + 2 * p), height: Math.round(bb - t + 2 * p) };
    }).filter(Boolean);
    const r = rs[0], r2 = rs[1] || { left: r.left + r.width / 2, top: r.top + r.height / 2, width: 0, height: 0 };   // sin segundo foco: uno de tamano cero (el recorte conserva su forma y se anima)
    holes[0].style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
    holes[1].style.cssText = `left:${r2.left}px;top:${r2.top}px;width:${r2.width}px;height:${r2.height}px;opacity:${rs[1] ? 1 : 0}`;
    /* la penumbra es una capa recortada con los focos como agujeros (antes, la sombra gigante del unico foco: no admitia dos) */
    const rp = q => { const a = Math.min(14, q.width / 2, q.height / 2), x = q.left, y = q.top, w = q.width, h = q.height; return `M${x + a} ${y}H${x + w - a}A${a} ${a} 0 0 1 ${x + w} ${y + a}V${y + h - a}A${a} ${a} 0 0 1 ${x + w - a} ${y + h}H${x + a}A${a} ${a} 0 0 1 ${x} ${y + h - a}V${y + a}A${a} ${a} 0 0 1 ${x + a} ${y}Z`; };
    el.querySelector(".tour-dim").style.clipPath = `path(evenodd, "M0 0H${vw}V${vh}H0Z${rp(r)}${rp(r2)}")`;
    const k = parseFloat(document.documentElement.style.getPropertyValue("--k")) || 1;          // la tarjeta crece con la pantalla como los menus (zoom): se mide en pixeles reales
    const cb = card.getBoundingClientRect(), cw = cb.width, ch = cb.height, gap = 14;
    let top = r.top + r.height + gap; if (top + ch > vh - 10) top = r.top - ch - gap; if (top < 10) top = Math.max(10, vh - ch - 12);
    let left = r.left + r.width / 2 - cw / 2; left = Math.max(10, Math.min(vw - cw - 10, left));
    if (vw <= 700) { left = 10; top = Math.min(top, vh - ch - 10); }
    card.style.cssText = `left:${left / k}px;top:${top / k}px`;
    /* el crupier: abajo a la izquierda; si ahi pisa lo que se explica o la tarjeta, al otro lado */
    const cr = el.querySelector(".tour-cr"); if (cr) {
      const f = A.crupier && A.crupier.kCss ? A.crupier.kCss() : 243, b = Math.max(84, vh * 0.13), y0 = vh - b - f, y1 = vh - b;
      const hits = (q, x0, x1) => q.left < x1 && q.left + q.width > x0 && q.top < y1 && q.top + q.height > y0;
      const cardR = { left, top, width: cw, height: ch }, L = [16, 16 + f], R = [vw - 16 - f, vw - 16];
      const any = (x0, x1) => rs.some(q => hits(q, x0, x1)) || hits(cardR, x0, x1), leftBad = any(L[0], L[1]), rightBad = any(R[0], R[1]);
      cr.classList.toggle("dcha", leftBad && !rightBad);
      cr.classList.toggle("fuera", leftBad && rightBad);                                   // ni a un lado ni al otro: ese paso no sale (no se encoge)
    }
  }

  function show(quiet) {
    const tour = cur; if (!tour) return; if (face) face.shown(true);
    while (tour.i < tour.steps.length) { const s = tour.steps[tour.i]; if (s.box === "center" || sels(s).some(sel => [...document.querySelectorAll(sel)].some(visible))) break; tour.i++; }
    if (tour.i >= tour.steps.length) return finish(true);
    const step = tour.steps[tour.i], el = ensure();
    el.classList.remove("hidden"); requestAnimationFrame(() => el.classList.add("on")); document.documentElement.classList.add("tour-on");
    el.querySelector(".tour-txt").textContent = t6(step.txt);
    el.querySelector(".tour-eb").textContent = t6(tour.id === "q" ? EBQ : EB).replace("{n}", tour.i + 1).replace("{m}", tour.steps.length);        // "Tutorial · 2 de 6"
    el.querySelector(".tour-skip").innerHTML = `<span>${t6(SKIP)}</span>${A.gala.keyHint("Esc", "b")}`;
    const last = tour.i >= tour.steps.length - 1, nx = el.querySelector(".tour-next");
    nx.innerHTML = `<span>${last ? t6("¡Entendido!|Got it!|Compris !|Entendi!|Verstanden!|Capito!||明白了！|알겠어요!|わかった！|Понятно!|Jasne!") : t6("Siguiente|Next|Suivant|Próximo|Weiter|Avanti||下一步|다음|次へ|Далее|Dalej")}</span>${A.gala.keyHint("Enter", "a")}`;
    place(step); if (!quiet && A.sfx.card) A.sfx.card();
    if (!quiet) { mouth(Math.min(28, Math.round(t6(step.txt).length / 3))); if (face) face.play(tour.i === 0 ? "e_invita" : "point"); }   // señala lo que explica
    /* al instante: los botones actuan al PULSAR (no al soltar), un clic en la penumbra tambien pasa de paso y Esc / Enter siguen valiendo */
    const next = () => { if (cur !== tour) return; tour.i++; show(); }, skip = () => { if (cur === tour) finish(false, true); };
    const quick = (b, f) => { b.onpointerdown = e => { if (e.button > 0) return; e.preventDefault(); e.stopPropagation(); b._pd = performance.now(); f(); }; b.onclick = e => { e.stopPropagation(); if (!b._pd || performance.now() - b._pd > 800) f(); b._pd = 0; }; };
    quick(nx, next); quick(el.querySelector(".tour-skip"), skip);
    el.onpointerdown = e => { if (e.target === el && e.button === 0) { e.preventDefault(); next(); } };
  }
  function finish(done, skipAll) {
    const tour = cur; cur = null; const el = $("tour"); if (el) { el.classList.remove("on"); setTimeout(() => el.classList.add("hidden"), 220); } if (face) face.shown(false);
    removeEventListener("resize", onResize); removeEventListener("keydown", onKey, true); freeze(false); document.documentElement.classList.remove("tour-on");
    if (tour) { P().tour = P().tour || {}; P().tour[tour.id] = 1; if (skipAll) { P().tour.q = P().tour.camp = 1; } A.profile.save(); }
    if (tour && skipAll && A.dealer && A.dealer.tourSkip) A.dealer.tourSkip();         // "¿Saltarte MI tutorial?"
  }
  const onResize = () => { if (cur) show(true); };                                   // recolocar sin repetir el sonido de carta en cada evento de resize
  const onKey = e => {
    if (!cur) return; if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(false, true); } else if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); cur.i++; show(); }
    else if (/^[pP1-4]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); e.stopPropagation(); }   // ni pausa (reanudaria el reloj bajo el tutorial) ni herramientas mientras el crupier explica
  };

  A.tour = {
    maybe(id) {
      if (cur || !enabled() || !TOURS[id]) return; const pt = P().tour || {}; if (pt[id]) return;
      cur = { id, steps: TOURS[id], i: 0 };
      addEventListener("resize", onResize); addEventListener("keydown", onKey, true);
      setTimeout(() => { if (!cur) return; freeze(true); show(); }, 600);          // deja que la pantalla termine de aparecer
    },
    reset() { P().tour = {}; A.profile.save(); },
    active: () => !!cur,
  };
})(window.AIQ);
