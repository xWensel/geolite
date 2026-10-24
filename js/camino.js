/*
 * Geolite - EL CAMINO DEL SOCIO (maqueta «El camino del socio», 23-oct-2026): los 100 niveles del Club y lo que da cada uno, y la carta nueva
 * que sale del mazo al subir de nivel.
 *
 *   La pantalla (A.hub.screen("camino"), al pulsar tu carta en la portada): a la izquierda tu carta, tu sitio en la casa (la categoria, quien eres,
 *   tu sitio y como te llama el crupier), la barra de tu nivel, lo siguiente y «Vestir tu carta» (el vestidor, js/boutique.js). A la derecha el
 *   camino, de serie en serie (10 niveles por pagina, sin desplazar nada): cada nivel con su carta (las que aun no tienes, boca abajo: son
 *   sorpresa), sus fichas, su titulo (5, 15, 25…), su cofre (cada 10), el borde de una serie nueva (11, 21…) y la categoria que empieza en el.
 *   A.camino.reveal(niveles, { k })  la carta del ultimo nivel ganado sale del mazo boca abajo, se da la vuelta y se sella; debajo, lo que trae.
 *   k = 1, 2 o 3 (nivel normal, de titulo o de cofre): mas temblor cuanto mas alto. Se cierra sola o con cualquier clic o tecla.
 * Datos: js/club.js (rewardOf, payOf, chestOf, RANKS, RANKX) y js/socio.js (las cartas, su dorso y los bordes).
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id), P6 = s => A.pick6(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const TX = {
    title: "El camino del socio|The member's path|Le parcours du membre|O caminho do sócio|Der Weg des Mitglieds|Il cammino del socio||会员之路|회원의 길|会員の道|Путь члена клуба|Ścieżka członka",
    serie: "Serie {n} · {x}|Series {n} · {x}|Série {n} · {x}|Série {n} · {x}|Serie {n} · {x}|Serie {n} · {x}||第 {n} 系列 · {x}|{n}번째 시리즈 · {x}|シリーズ{n}・{x}|Серия {n} · {x}|Seria {n} · {x}",
    levels: "Niveles {a}-{b}|Levels {a}-{b}|Niveaux {a} à {b}|Níveis {a}-{b}|Stufen {a}-{b}|Livelli {a}-{b}||{a}-{b} 级|레벨 {a}-{b}|レベル{a}〜{b}|Уровни {a}–{b}|Poziomy {a}–{b}",
    you: "Tu sitio en la casa|Your place in the house|Ta place dans la maison|Seu lugar na casa|Dein Platz im Haus|Il tuo posto nella casa||你在赌场的位置|하우스에서의 네 자리|ハウスでのきみの居場所|Твоё место в заведении|Twoje miejsce w kasynie",
    sitio: "Sitio|Spot|Place|Lugar|Platz|Posto||位置|자리|居場所|Место|Miejsce",
    trato: "Te llama|Calls you|T'appelle|Te chama de|Nennt dich|Ti chiama||称呼你|부르는 말|呼び方|Зовёт тебя|Mówi do ciebie",
    nextRank: "Próxima categoría: {x}, en el nivel {n}|Next rank: {x}, at level {n}|Catégorie suivante : {x}, au niveau {n}|Próxima categoria: {x}, no nível {n}|Nächster Rang: {x}, auf Stufe {n}|Prossima categoria: {x}, al livello {n}||下一个身份：{x}，{n} 级|다음 등급: {x}, 레벨 {n}|次の格：{x}（レベル{n}）|Следующая ступень: {x}, на уровне {n}|Następna ranga: {x}, na poziomie {n}",
    top: "Lo más alto de la casa.|The very top of the house.|Le sommet de la maison.|O topo da casa.|Ganz oben im Haus.|Il vertice della casa.||赌场的最高处。|하우스의 정상이야.|ハウスの頂点。|Вершина заведения.|Szczyt kasyna.",
    dress: "Vestir tu carta|Dress your card|Habiller ta carte|Vestir sua carta|Karte gestalten|Vesti la tua carta||装扮你的卡|카드 꾸미기|カードを着替える|Оформить карту|Ubierz kartę",
    cofre: "Cofre {n}|Chest {n}|Coffre {n}|Baú {n}|Truhe {n}|Forziere {n}||宝箱 {n}|금고 {n}|宝箱 {n}|Сундук {n}|Skrzynia {n}",
    borde: "Borde {x}|{x} border|Bordure {x}|Borda {x}|Rand {x}|Bordo {x}||{x}边框|{x} 테두리|{x}の縁|Окантовка «{x}»|Obramowanie {x}",
    first: "Tu primera carta|Your first card|Ta première carte|Sua primeira carta|Deine erste Karte|La tua prima carta||你的第一张卡|첫 카드|最初のカード|Твоя первая карта|Twoja pierwsza karta",
    legend: "Pasado el 100: un cofre de la Leyenda cada {n} de experiencia.|Past 100: a Legend's chest every {n} XP.|Après 100 : un coffre de la Légende tous les {n} XP.|Depois do 100: um baú da Lenda a cada {n} de XP.|Ab Stufe 100: alle {n} EP eine Truhe der Legende.|Oltre il 100: un forziere della Leggenda ogni {n} PE.||满 100 级后：每 {n} 经验一个传奇宝箱。|100레벨 이후: 경험치 {n}마다 전설의 금고.|100を超えたら：経験値{n}ごとに伝説の宝箱。|После 100: сундук Легенды за каждые {n} опыта.|Po 100: skrzynia Legendy co {n} PD.",
    newCard: "¡Carta nueva!|New card!|Nouvelle carte !|Carta nova!|Neue Karte!|Carta nuova!||新卡牌！|새 카드!|新しいカード！|Новая карта!|Nowa karta!",
    more: "+{n} cartas|+{n} cards|+{n} cartes|+{n} cartas|+{n} Karten|+{n} carte||+{n} 张卡|카드 +{n}장|カード+{n}枚|+{n} карт|+{n} kart",
    fichas: "+{n} fichas|+{n} chips|+{n} jetons|+{n} fichas|+{n} Chips|+{n} fiche||+{n} 筹码|칩 +{n}|チップ+{n}|+{n} фишек|+{n} żetonów",
  };
  const S = () => A.socio, C = () => A.club;
  const reduce = () => document.documentElement.classList.contains("reduce-motion");
  const fi = cls => `<img class="ck-fi${cls ? " " + cls : ""}" src="assets/icons/ficha_oro.webp" alt="" draggable="false">`;

  /* lo que trae un nivel, en lineas cortas (el camino) o en fichas (la carta del mazo) */
  function bits(L) {
    const r = C().rewardOf(L), out = [];
    if (L > 1) out.push(["f", P6(TX.fichas).replace("{n}", A.fmt(r.f))]); else out.push(["", P6(TX.first)]);
    if (r.tit) out.push(["t", "«" + S().titleName(r.tit) + "»"]);
    if (r.chest) out.push(["c", P6(TX.cofre).replace("{n}", A.fmt(r.chest))]);
    if (r.mat >= 0) out.push(["b", P6(TX.borde).replace("{x}", S().matName(r.mat))]);
    if (r.rank > 0) out.push(["r", P6(C().RANKS[r.rank][0])]);
    return out;
  }
  /* un lienzo de pixel art a escala entera de pixeles reales, el mayor que quepa en su caja, centrado */
  const kOf = (cv, box) => { const z = box.currentCSSZoom || 1, dp = z * (window.devicePixelRatio || 1), r = box.getBoundingClientRect(); return { k: Math.max(1, Math.floor(Math.min((r.width / z) * dp / cv.width, (r.height / z) * dp / cv.height) + 0.01)), dp }; };
  function fitCv(cv, box, k0) { const { k, dp } = kOf(cv, box), kk = k0 || k; cv.style.width = (cv.width * kk) / dp + "px"; cv.style.height = (cv.height * kk) / dp + "px"; }
  /* todas las cartas del camino a la MISMA escala entera: la mayor que quepa en la caja mas pequena */
  function fitAll(root) { const cvs = [...root.querySelectorAll("canvas[data-n]")]; if (!cvs.length) return; const k = Math.min(...cvs.map(cv => kOf(cv, cv.parentElement).k)); cvs.forEach(cv => fitCv(cv, cv.parentElement, k)); }

  /* la insignia de una categoria (pieza aprobada de assets/icons, a su rejilla nativa) en un lienzo, a escala entera en su caja */
  function insFill(root) {
    (root || document).querySelectorAll("[data-ins]").forEach(box => {
      if (box.firstChild) return; const id = box.dataset.ins, im = new Image(), cv = document.createElement("canvas"); box.appendChild(cv);
      im.onload = () => { const n = Math.round(im.naturalWidth / 8); cv.width = n; cv.height = n; const x = cv.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, 0, 0, n, n); const km = +box.dataset.kmax || 0; fitCv(cv, box, km ? Math.min(km, kOf(cv, box).k) : 0); };   // data-kmax: en las listas, todas a la misma escala
      im.src = "assets/icons/" + id + ".webp";
    });
  }
  /* ---------------------------------------------------------------- la pantalla */
  const UI = { page: 0 };
  function node(L, lv) {
    const own = L <= lv, cur = L === lv, nx = L === lv + 1, r = C().rewardOf(L);
    const cls = "cm-n" + (own ? " got" : "") + (cur ? " cur" : "") + (nx ? " nx" : "") + (L % 10 === 0 ? " m10" : L % 5 === 0 ? " m5" : "");
    return `<div class="${cls}"><span class="cm-pill">${L}</span><span class="cm-art"><canvas data-n="${L}"${own ? "" : ` data-back="1"`}></canvas>${own && r.viva ? `<em class="cm-viva">★</em>` : ""}</span>
      <span class="cm-rw">${bits(L).map(([k, t]) => `<span class="cm-b ${k}">${k === "f" ? fi("sm") : ""}${esc(t)}</span>`).join("")}</span></div>`;
  }
  function roadHtml(lv) {
    const s = UI.page, a = s * 10 + 1, b = a + 9, SER = S().SERIES;
    const dots = SER.map((x, i) => `<button type="button" class="cm-sd${i === s ? " on" : ""}${(i * 10 + 1) <= lv ? " got" : ""}" data-s="${i}" aria-pressed="${i === s}" aria-label="${esc(P6(TX.serie).replace("{n}", i + 1).replace("{x}", P6(x.n)))}">${i + 1}</button>`).join("");
    const nodes = []; for (let L = a; L <= b; L++) nodes.push(node(L, lv));
    return `<div class="cm-bar"><button type="button" class="gx-btn sm gho" id="cmPrev"${s ? "" : " disabled"} aria-label="‹">‹</button>
        <div class="cm-tt"><span class="gx-eyb">${esc(P6(TX.serie).replace("{n}", s + 1).replace("{x}", P6(TX.levels).replace("{a}", a).replace("{b}", b)))}</span><b>${esc(P6(SER[s].n))}</b></div>
        <nav class="cm-sds">${dots}</nav>
        <button type="button" class="gx-btn sm gho" id="cmNext"${s < 9 ? "" : " disabled"} aria-label="›">›</button></div>
      <div class="cm-nodes">${nodes.join("")}</div>
      <p class="cm-ft">${esc(P6(TX.legend).replace("{n}", A.fmt(C().CFG.ley)))}</p>`;
  }
  function meHtml() {
    const now = C().now(), lv = now.lvl, t = C().tierNow(), [who, sitio, trato] = C().rankX(t), nr = C().RANKS[t + 1];
    const left = now.max ? P6(C().tx.max) : P6(C().tx.left).replace("{n}", A.fmt(now.need - now.into)).replace("{m}", lv + 1);
    return `<span class="cm-card" id="cmCard"></span>
      <div class="cm-who"><span class="gx-eyb">${esc(P6(TX.you))}</span><div class="cm-rk"><span class="cm-ins" data-ins="${C().insignia(t)}"></span><h3 class="gx-t-m">${esc(C().tierName(t))}</h3></div><p class="cm-wp">${esc(who)}</p></div>
      <dl class="cm-dl"><dt>${esc(P6(TX.sitio))}</dt><dd>${esc(sitio)}</dd><dt>${esc(P6(TX.trato))}</dt><dd>«${esc(trato)}»</dd></dl>
      <p class="cm-nr">${esc(nr ? P6(TX.nextRank).replace("{x}", P6(nr[0])).replace("{n}", nr[1]) : P6(TX.top))}</p>
      <div class="cm-prog"><div class="cm-pl"><b>${esc(P6(C().tx.lvS).replace("{n}", lv))}</b><span>${esc(left)}</span></div><span class="ck-bar"><i style="width:${Math.round((100 * now.into) / Math.max(1, now.need))}%"></i></span></div>
      <p class="cm-nx">${fi("sm")}<span>${esc(C().nextText(lv))}</span></p>
      <button type="button" class="gx-btn pri wide" id="cmDress"><span>${esc(P6(TX.dress))}</span></button>`;
  }
  function html() {
    const lv = C().level(), have = C().fichas();
    return `<div class="gx-veil bq-veil"></div><section class="cm-screen gx-stage" aria-labelledby="cmH" data-nosq>
      <div class="gx-grid cm-grid">
        <header class="bq-head"><button type="button" class="gx-btn sm" id="hubBack">${A.icon("u_back")}<span>${A.t("set.close")}</span>${A.gala.keyHint("Esc", "b")}</button>
          <h2 class="gx-t-l bq-h" id="cmH"><span><span class="gx-eyb">${esc(P6(C().tx.club))} · ${esc(P6(C().tx.lv).replace("{n}", lv))}</span>${esc(P6(TX.title))}</span></h2>
          <span class="bq-wal" aria-label="${esc(P6(C().tx.fichas))}">${fi("bq-fi")}<b>${A.fmt(have)}</b></span>${A.hub.tools()}</header>
        <div class="gx-sh cm-left"><div class="gx-paper cm-me">${meHtml()}</div></div>
        <div class="gx-sh cm-right"><div class="gx-paper cm-road" id="cmRoad">${roadHtml(lv)}</div></div>
      </div></section>`;
  }
  function paintRoad() {
    const lv = C().level();
    document.querySelectorAll("#cmRoad canvas[data-n]").forEach(cv => S().mini(cv, +cv.dataset.n, !!cv.dataset.back)); fitAll($("cmRoad"));   // la carta en pequeno (48 x 64), a escala entera
    document.querySelectorAll("#cmRoad .cm-sd").forEach(b => { b.onclick = () => { const s = +b.dataset.s; if (s === UI.page) return; UI.page = s; if (A.sfx && A.sfx.card) A.sfx.card(); road(`#cmRoad .cm-sd[data-s="${s}"]`); }; });
    const pv = $("cmPrev"), nx = $("cmNext");
    if (pv) pv.onclick = () => { if (UI.page > 0) { UI.page--; if (A.sfx && A.sfx.card) A.sfx.card(); road("#cmPrev:not([disabled]), #cmNext"); } };
    if (nx) nx.onclick = () => { if (UI.page < 9) { UI.page++; if (A.sfx && A.sfx.card) A.sfx.card(); road("#cmNext:not([disabled]), #cmPrev"); } };
    return lv;
  }
  function road(focusSel) { const el = $("cmRoad"); if (!el) return; el.innerHTML = roadHtml(C().level()); paintRoad(); if (focusSel) { const f = document.querySelector(focusSel); if (f) f.focus({ preventScroll: true }); } }
  function open() {
    const c = A.core; if (!c || !S() || !C()) return;
    const lv = C().level(); UI.page = Math.min(9, Math.floor(Math.min(99, lv) / 10));   // la serie de tu siguiente nivel
    c.dialog(html(), "tablewrap");
    A.hub.wireTools(); $("hubBack").onclick = () => { if (A.sfx && A.sfx.ui) A.sfx.ui(); A.hub.screen("home"); };
    S().mount($("cmCard"), { w: 192 }); insFill($("dlg"));
    $("cmDress").onclick = () => { if (A.sfx && A.sfx.card) A.sfx.card(); if (A.boutique) A.boutique.cat("carta"); A.hub.screen("boutique"); };
    paintRoad();
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => { const r = $("cmRoad"); if (!r) { ro.disconnect(); return; } fitAll(r); }); ro.observe($("cmRoad")); }
    setTimeout(() => { const f = document.querySelector("#cmRoad .cm-sd.on") || $("hubBack"); if (f) f.focus({ preventScroll: true }); }, 80);
  }

  /* ---------------------------------------------------------------- la carta del mazo: sale boca abajo, se da la vuelta y se sella */
  function reveal(levels, o = {}) {
    if (!levels || !levels.length || !S() || !C()) { if (o.done) o.done(); return; }
    const app = $("app") || document.body, L = levels[levels.length - 1], k = Math.max(1, Math.min(3, o.k || 1)), rm = reduce();
    const old = $("cmRv"); if (old) old.remove();
    const r = document.createElement("div"); r.id = "cmRv"; r.className = "cm-rv"; r.setAttribute("role", "status");
    const prev = levels.slice(-3, -1).map(() => `<canvas class="cm-rv-pv"></canvas>`).join("");
    const all = []; levels.forEach(l => bits(l).forEach(b => { if (b[0] !== "f" && b[0] !== "") all.push(b[0] === "r" ? [b[0], b[1], C().insignia(C().rewardOf(l).rank)] : b); }));   // la categoria nueva, con su insignia
    const fsum = levels.reduce((a, l) => a + C().payOf(l), 0);
    const chips = [["f", P6(TX.fichas).replace("{n}", A.fmt(fsum))]].concat(all);
    r.innerHTML = `<i class="cm-rv-dim"></i><div class="cm-rv-in">
      <span class="gx-eyb cm-rv-ey">${esc(P6(TX.newCard))}${levels.length > 1 ? " · " + esc(P6(TX.more).replace("{n}", levels.length)) : ""}</span>
      <div class="cm-rv-st">${prev}<div class="cm-rv-flip"><span class="cm-rv-f fr"><span id="cmRvCard"></span></span><span class="cm-rv-f bk"><canvas id="cmRvBack"></canvas></span></div>
        <b class="cm-rv-sl">${esc(P6(C().tx.lvS).replace("{n}", L))}</b></div>
      <div class="cm-rv-loot">${chips.map(([kk, t, ins]) => `<span class="cm-b ${kk}">${kk === "f" ? fi("sm") : ""}${ins ? `<span class="cm-ri" data-ins="${ins}"></span>` : ""}${esc(t)}</span>`).join("")}</div></div>`;
    app.appendChild(r); insFill(r);
    S().mount($("cmRvCard"), { w: 288, carta: L, mat: S().sOf(L), nobar: true });
    const host = $("cmRvCard"), bk = $("cmRvBack"); S().back(bk);
    const sizeBack = () => { bk.style.width = host.style.width; bk.style.height = parseFloat(host.style.width) * 128 / 96 + "px"; };
    sizeBack();
    r.querySelectorAll(".cm-rv-pv").forEach(cv => { S().back(cv); cv.style.width = host.style.width; cv.style.height = parseFloat(host.style.width) * 128 / 96 + "px"; });
    let done = false;
    const close = () => { if (done) return; done = true; r.classList.add("out"); document.removeEventListener("keydown", onKey, true); setTimeout(() => { r.remove(); if (o.done) o.done(); }, rm ? 0 : 320); };   // o.done: lo que esperaba a que se cerrara la carta (la frase del crupier)
    const onKey = e => { e.preventDefault(); e.stopPropagation(); close(); };
    r.addEventListener("pointerdown", close);
    setTimeout(() => document.addEventListener("keydown", onKey, true), 400);
    const T = (fn, ms) => setTimeout(() => { if (!done) fn(); }, rm ? Math.min(ms, 30) : ms);
    A.restyle ? A.restyle(r) : void r.offsetWidth;
    r.classList.add("on");
    T(() => { r.classList.add("in"); if (A.sfx && A.sfx.card) A.sfx.card(); }, 60);
    T(() => { r.classList.add("open"); if (A.sfx && A.sfx.card) A.sfx.card(); }, 620);
    T(() => {
      r.classList.add("seal"); if (A.sfx && A.sfx.stamp) A.sfx.stamp(); if (A.haptic) A.haptic([20, 30, 40 * k]);
      const st = r.querySelector(".cm-rv-st");
      if (st && !rm && !document.documentElement.classList.contains("no-shake")) { const amp = [3, 6, 10][k - 1], fr = []; for (let i = 0; i < 8; i++) fr.push({ transform: `translate(${((Math.random() * 2 - 1) * amp).toFixed(1)}px, ${((Math.random() * 2 - 1) * amp).toFixed(1)}px) rotate(${((Math.random() * 2 - 1) * amp * .2).toFixed(2)}deg)` }); fr.push({ transform: "none" }); st.animate(fr, { duration: 240 + 120 * k, easing: "ease-out" }); }
    }, 1080);
    r.querySelectorAll(".cm-rv-loot .cm-b").forEach((b, i) => T(() => { b.classList.add("on"); if (A.sfx && A.sfx.coin) A.sfx.coin(i); }, 1300 + i * 220));
    T(close, 3400 + chips.length * 220 + 400 * (k - 1));
  }

  A.camino = { open, reveal, bits, insFill, tx: TX };
})(window.AIQ);
