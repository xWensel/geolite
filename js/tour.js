/*
 * Geolite - TUTORIAL GUIADO (v0.14). El crupier te enseña la mesa la primera vez: un foco ilumina cada parte de la pantalla y una tarjeta
 * explica para que sirve. Se puede saltar en cualquier momento, se recuerda en el perfil (P.tour) y se reactiva en Ajustes > General.
 *   A.tour.maybe("q" | "camp")   lo llaman la Aventura (primera pregunta) y el Campamento (primera visita)
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id), C = () => A.core;
  const t6 = s => A.tip6(s);

  /* cada paso: sel = elemento que se ilumina (si no existe o esta oculto, se salta), txt = es|en|fr|pt|de|it|es-419|zh|ko|ja|ru|pl */
  const TOURS = {
    q: [
      { sel: "#plate", txt: "Este es el lugar que buscas. Debajo del nombre ves su país (o su continente).|This is the place you're looking for. Under the name you see its country (or continent).|Voici le lieu à trouver. Sous le nom, tu vois son pays (ou son continent).|Este é o lugar que você procura. Abaixo do nome está o país (ou o continente).|Das ist der gesuchte Ort. Unter dem Namen siehst du sein Land (oder den Kontinent).|Questo è il luogo che cerchi. Sotto il nome vedi il suo paese (o continente).||这就是你要找的地点。名字下方显示它所在的国家（或大洲）。|이곳이 찾아야 할 장소예요. 이름 아래에 국가(또는 대륙)가 보여요.|これが探す場所。名前の下に国（または大陸）が表示される。|Вот место, которое ты ищешь. Под названием видна его страна (или континент).|Tego miejsca szukasz. Pod nazwą widzisz jego kraj (albo kontynent)." },
      { sel: "#map", box: "center", txt: "Haz clic en el mapa donde crees que está. Con la rueda o los botones + y − haces zoom. Cuanto más cerca, más puntos.|Click on the map where you think it is. Use the wheel or the + and − buttons to zoom. The closer you are, the more points.|Clique sur la carte où tu penses qu'il se trouve. Molette ou boutons + et − pour zoomer. Plus tu es proche, plus tu gagnes de points.|Clique no mapa onde acha que ele está. Use a roda ou os botões + e − para dar zoom. Quanto mais perto, mais pontos.|Klicke auf die Karte, wo du ihn vermutest. Mit dem Rad oder + und − zoomst du. Je näher, desto mehr Punkte.|Clicca sulla mappa dove pensi che sia. Con la rotella o i pulsanti + e − fai zoom. Più sei vicino, più punti ottieni.||在地图上点击你认为它所在的位置。用滚轮或 + 和 − 按钮缩放。越接近，得分越高。|있다고 생각하는 곳을 지도에서 클릭하세요. 휠이나 +, − 버튼으로 확대/축소할 수 있어요. 가까울수록 점수가 높아요.|あると思う場所を地図でクリック。ホイールか＋と−ボタンでズームできる。近いほど高得点。|Кликни на карте туда, где, по-твоему, это место. Колёсиком или кнопками + и − меняй масштаб. Чем ближе, тем больше очков.|Kliknij na mapie tam, gdzie twoim zdaniem leży. Kółkiem albo przyciskami + i − przybliżasz. Im bliżej, tym więcej punktów." },
      { sel: ".clock", txt: "El reloj corre: responder rápido también suma puntos.|The clock is ticking: answering fast also earns points.|Le chrono tourne : répondre vite rapporte aussi des points.|O relógio corre: responder rápido também dá pontos.|Die Uhr läuft: schnelle Antworten bringen auch Punkte.|L'orologio corre: anche rispondere in fretta dà punti.||时钟在走：答得快也能得分。|시계가 째깍거려요: 빨리 답해도 점수를 받아요.|時間は刻々と過ぎていく。素早く答えればポイントも上乗せ。|Часы тикают: быстрый ответ тоже приносит очки.|Zegar tyka: szybka odpowiedź też daje punkty." },
      { sel: "#advBar .ab-top", txt: "Doblones para comprar en el Campamento y provisiones ♥: si fallas una ronda pierdes una, y sin provisiones acaba la expedición.|Doubloons to spend at the Camp and provisions ♥: fail a round and you lose one; with none left, the expedition ends.|Des doublons pour acheter au Campement et des provisions ♥ : rater une manche en coûte une ; sans provisions, l'expédition s'arrête.|Dobrões para gastar no Acampamento e provisões ♥: falhar uma rodada custa uma; sem provisões, a expedição termina.|Dublonen zum Einkaufen im Lager und Proviant ♥: Eine verpatzte Runde kostet einen; ohne Proviant endet die Expedition.|Dobloni da spendere all'Accampamento e provviste ♥: fallire un round ne costa una; senza provviste la spedizione finisce.||金币可在营地消费，补给 ♥：一回合失败会失去一份；全部用完，远征就结束了。|캠프에서 쓸 도블론과 식량 ♥: 라운드에 실패하면 하나를 잃고, 모두 잃으면 원정이 끝나요.|キャンプで使うダブロンと食料♥：ラウンドに失敗すると1つ失い、なくなると遠征は終わり。|Дублоны для Лагеря и запасы ♥: провалишь раунд — потеряешь один; кончатся все — экспедиция окончена.|Dublony do wydania w Obozie i zapasy ♥: oblejesz rundę — tracisz jeden; gdy się skończą, wyprawa dobiega końca." },
            { sel: "#toolBar .tool", all: true, txt: "Tus herramientas: púlsalas (o su número) para usarlas. Dan pistas, como a cuántos km o hacia dónde está el lugar, y se recargan cada ronda.|Your tools: press them (or their number) to use them. They give clues, like how many km away or which way the place is, and refill every round.|Tes outils : appuie dessus (ou sur leur numéro). Ils donnent des indices, comme la distance en km ou la direction du lieu, et se rechargent à chaque manche.|Suas ferramentas: clique nelas (ou no número) para usá-las. Dão pistas, como a quantos km ou em que direção fica o lugar, e recarregam a cada rodada.|Deine Werkzeuge: Klicke sie an (oder drücke ihre Zahl). Sie geben Hinweise, etwa Entfernung in km oder Richtung des Ortes, und laden sich jede Runde auf.|I tuoi strumenti: premili (o premi il numero). Danno indizi, come la distanza in km o la direzione del luogo, e si ricaricano a ogni round.|Tus herramientas: presiónalas (o su número) para usarlas. Dan pistas, como a cuántos km o hacia dónde está el lugar, y se recargan cada ronda.|你的工具：点击它们（或按对应数字）即可使用。它们会提供线索，比如距离多少公里或地点在哪个方向，每回合都会补满。|도구: 누르거나 번호 키로 사용하세요. 몇 km 떨어졌는지, 어느 방향인지 같은 단서를 주고, 매 라운드 다시 채워져요.|道具：押すか番号キーで使う。何km離れているか、どの方向かなどのヒントをくれて、毎ラウンド補充される。|Твои инструменты: нажми на них (или на их цифру), чтобы использовать. Они дают подсказки — сколько км до места или в какой оно стороне — и пополняются каждый раунд.|Twoje narzędzia: naciśnij je (albo ich numer), żeby użyć. Podpowiadają np. ile km dzieli cię od miejsca albo w którą stronę leży, i odnawiają się co rundę." },
      { sel: "#ledger", txt: "Cada ronda pide una puntuación mínima. Llega a la marca para superarla.|Every round asks for a minimum score. Reach the mark to clear it.|Chaque manche exige un score minimum. Atteins la marque pour la réussir.|Cada rodada exige uma pontuação mínima. Chegue à marca para superá-la.|Jede Runde verlangt eine Mindestpunktzahl. Erreiche die Marke, um sie zu schaffen.|Ogni round richiede un punteggio minimo. Raggiungi la soglia per superarlo.||每回合都要求一个最低分数。达到就能通过。|매 라운드마다 최소 점수가 있어요. 목표에 도달하면 클리어예요.|各ラウンドには最低スコアがある。到達すればクリア。|Каждый раунд требует минимум очков. Достигни отметки, чтобы пройти.|Każda runda wymaga minimalnego wyniku. Osiągnij go, żeby ją zaliczyć." },
    ],
    camp: [
      { sel: ".table .offers", txt: "Entre rondas, el Campamento: gasta doblones en cartas. Lee bien lo que hace cada una: todas pueden servirte en algún momento de esta expedición. Las herramientas se recargan cada ronda.|Between rounds, the Camp: spend doubloons on cards. Read each one carefully: every card can help you at some point in this expedition. Tools refill every round.|Entre les manches, le Campement : dépense tes doublons en cartes. Lis bien ce que fait chacune : toutes peuvent te servir à un moment de cette expédition. Les outils se rechargent à chaque manche.|Entre rodadas, o Acampamento: gaste dobrões em cartas. Leia bem o que cada uma faz: todas podem te servir em algum momento desta expedição. As ferramentas recarregam a cada rodada.|Zwischen den Runden das Lager: gib Dublonen für Karten aus. Lies genau, was jede tut: Jede kann dir irgendwann auf dieser Expedition helfen. Werkzeuge laden sich jede Runde auf.|Tra un round e l'altro, l'Accampamento: spendi dobloni in carte. Leggi bene cosa fa ciascuna: tutte possono servirti prima o poi in questa spedizione. Gli strumenti si ricaricano a ogni round.||回合之间是营地：用金币购买卡牌。仔细读每张牌的作用：它们在本次远征中都可能派上用场。工具每回合补满。|라운드 사이엔 캠프: 도블론으로 카드를 사세요. 각 카드가 무엇을 하는지 잘 읽어 보세요. 모두 이번 원정 어딘가에서 쓸모가 있어요. 도구는 매 라운드 채워져요.|ラウンドの合間はキャンプ：ダブロンでカードを買おう。効果をよく読もう。どれもこの遠征のどこかで役に立つ。道具は毎ラウンド補充される。|Между раундами — Лагерь: трать дублоны на карты. Внимательно читай, что делает каждая: любая может пригодиться в этой экспедиции. Инструменты пополняются каждый раунд.|Między rundami jest Obóz: wydajesz dublony na karty. Czytaj uważnie, co robi każda: każda może się przydać w tej wyprawie. Narzędzia odnawiają się co rundę." },
      { sel: ".tb-next", txt: "Aquí ves los retos del crupier en la próxima ronda. Puedes sobornarlo para quitar uno o barajar para cambiarlos.|Here you see the dealer's challenges for the next round. Bribe him to remove one, or reshuffle to change them.|Ici, les défis du croupier pour la prochaine manche. Soudoie-le pour en retirer un, ou rebats les cartes pour les changer.|Aqui estão os desafios do crupiê na próxima rodada. Suborne-o para remover um ou embaralhe para trocá-los.|Hier siehst du die Herausforderungen des Croupiers für die nächste Runde. Bestich ihn, um eine zu streichen, oder mische neu.|Qui vedi le sfide del croupier nel prossimo round. Corrompilo per toglierne una o rimescola per cambiarle.||这里显示荷官下一回合的挑战。贿赂他来移除一个，或重新洗牌来更换。|여기서 다음 라운드의 딜러 도전을 볼 수 있어요. 매수해서 하나를 없애거나, 다시 섞어서 바꿀 수 있어요.|ここで次のラウンドのディーラーのチャレンジが見られる。買収して1つ消すか、シャッフルして変えよう。|Здесь видны испытания крупье на следующий раунд. Подкупи его, чтобы убрать одно, или перетасуй, чтобы сменить их.|Tu widzisz wyzwania krupiera na następną rundę. Przekup go, żeby usunąć jedno, albo przetasuj, żeby je zmienić." },
      { sel: ".tb-tray", txt: "Abajo, tus reliquias (5 huecos: puedes venderlas), herramientas y el botón para empezar la ronda cuando estés listo.|Below: your relics (5 slots, you can sell them), your tools, and the button to start the round when you're ready.|En bas : tes reliques (5 emplacements, tu peux les vendre), tes outils et le bouton pour lancer la manche.|Embaixo: suas relíquias (5 espaços, dá para vendê-las), ferramentas e o botão para começar a rodada quando estiver pronto.|Unten: deine Relikte (5 Plätze, verkaufbar), Werkzeuge und der Knopf, um die Runde zu starten, wenn du bereit bist.|In basso: le tue reliquie (5 posti, puoi venderle), gli strumenti e il pulsante per iniziare il round quando sei pronto.||下方：你的遗物（5 个栏位，可以出售）、你的工具，以及准备好后开始回合的按钮。|아래: 유물(5칸, 판매 가능), 도구, 그리고 준비되면 라운드를 시작하는 버튼.|下：レリック（5枠、売却可）、道具、そして準備ができたらラウンドを始めるボタン。|Внизу: твои реликвии (5 ячеек, их можно продать), инструменты и кнопка, чтобы начать раунд, когда захочешь.|Na dole: twoje relikty (5 miejsc, możesz je sprzedać), narzędzia i przycisk startu rundy, gdy zechcesz zacząć." },
    ],
  };

  let cur = null, froze = false;
  const P = () => A.profile.get();
  const dev = /skipboot/.test(location.search) && !/[?&]tour/.test(location.search);        // las pruebas automaticas no lo activan
  const enabled = () => !dev && (!C() || C().S.tour !== false);

  function freeze(on) {
    const S = C().S, map = C().map;
    if (on && S.phase === "asking" && !S.paused) { S.paused = true; S.pauseAt = performance.now(); map.setPick(false); froze = true; }
    else if (!on && froze) { froze = false; if (S.paused && S.phase === "asking") { S.pausedAcc += performance.now() - S.pauseAt; S.paused = false; map.setPick(true); } }
  }
  const visible = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && !el.closest(".hidden") && getComputedStyle(el).visibility !== "hidden"; };

  function ensure() {
    let el = $("tour"); if (el) return el;
    el = document.createElement("div"); el.id = "tour"; el.className = "tour hidden";
    el.innerHTML = `<i class="tour-hole"></i><div class="tour-card"><div class="tour-face"></div><div class="tour-body"><p class="tour-txt"></p><div class="tour-nav"><button type="button" class="tour-skip"></button><span class="tour-dots"></span><button type="button" class="tour-next btn-ink"></button></div></div></div>`;
    $("app").appendChild(el);
    if (A.crupier) face = A.crupier.mount(el.querySelector(".tour-face"), { mini: true, fidget: false });   // v0.32: el crupier de sus frases, la cabeza a escala entera
    return el;
  }
  let face = null, faceT = 0;
  /* mientras aparece cada explicacion mueve la boca un momento (el texto sale de golpe: se le ve hablar, sin maquina de escribir) */
  const mouth = n => { if (!face) return; clearInterval(faceT); face.talk(true); let k = 0; faceT = setInterval(() => { face.syl(); if (++k > n) { clearInterval(faceT); face.talk(false); } }, 70); };

  function place(step) {
    const el = $("tour"), hole = el.querySelector(".tour-hole"), card = el.querySelector(".tour-card");
    const vw = innerWidth, vh = innerHeight;
    let r;
    if (step.box === "center") { const w = Math.min(vw * 0.5, 520), h = Math.min(vh * 0.32, 240); r = { left: (vw - w) / 2, top: vh * 0.46, width: w, height: h }; }
    else {
      const els = [...document.querySelectorAll(step.sel)].filter(visible), p = 8;                    // varios elementos (cartas de herramienta): se ilumina el conjunto
      const bs = els.map(e => e.getBoundingClientRect()), l = Math.min(...bs.map(b => b.left)), t = Math.min(...bs.map(b => b.top)), rr = Math.max(...bs.map(b => b.right)), bb = Math.max(...bs.map(b => b.bottom));
      r = { left: l - p, top: t - p, width: rr - l + 2 * p, height: bb - t + 2 * p };
    }
    hole.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
    const cw = card.offsetWidth, ch = card.offsetHeight, gap = 14;
    let top = r.top + r.height + gap; if (top + ch > vh - 10) top = r.top - ch - gap; if (top < 10) top = Math.max(10, vh - ch - 12);
    let left = r.left + r.width / 2 - cw / 2; left = Math.max(10, Math.min(vw - cw - 10, left));
    if (vw <= 700) { left = 10; top = Math.min(top, vh - ch - 10); }
    card.style.cssText = `left:${left}px;top:${top}px`;
  }

  function show(quiet) {
    const tour = cur; if (!tour) return; if (face) face.shown(true);
    while (tour.i < tour.steps.length) { const s = tour.steps[tour.i]; if (s.box === "center" || [...document.querySelectorAll(s.sel)].some(visible)) break; tour.i++; }
    if (tour.i >= tour.steps.length) return finish(true);
    const step = tour.steps[tour.i], el = ensure();
    el.classList.remove("hidden"); requestAnimationFrame(() => el.classList.add("on"));
    el.querySelector(".tour-txt").textContent = t6(step.txt);
    el.querySelector(".tour-skip").textContent = t6("Saltar tutorial|Skip tutorial|Passer le tutoriel|Pular tutorial|Tutorial überspringen|Salta tutorial||跳过教程|튜토리얼 건너뛰기|チュートリアルをスキップ|Пропустить обучение|Pomiń samouczek");
    const last = tour.i >= tour.steps.length - 1, nx = el.querySelector(".tour-next");
    nx.innerHTML = `<span>${last ? t6("¡Entendido!|Got it!|Compris !|Entendi!|Verstanden!|Capito!||明白了！|알겠어요!|わかった！|Понятно!|Jasne!") : t6("Siguiente|Next|Suivant|Próximo|Weiter|Avanti||下一步|다음|次へ|Далее|Dalej")}</span>`;
    el.querySelector(".tour-dots").innerHTML = tour.steps.map((_, k) => `<i class="${k === tour.i ? "on" : ""}"></i>`).join("");
    place(step); if (!quiet && A.sfx.card) A.sfx.card();
    if (!quiet) mouth(Math.min(28, Math.round(t6(step.txt).length / 3)));
    nx.onclick = () => { tour.i++; show(); }; el.querySelector(".tour-skip").onclick = () => finish(false, true);
  }
  function finish(done, skipAll) {
    const tour = cur; cur = null; const el = $("tour"); if (el) { el.classList.remove("on"); setTimeout(() => el.classList.add("hidden"), 220); } if (face) face.shown(false);
    removeEventListener("resize", onResize); removeEventListener("keydown", onKey, true); freeze(false);
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
