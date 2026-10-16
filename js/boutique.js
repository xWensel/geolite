/*
 * Geolite - LA BOUTIQUE del Club de la casa (v0.3.132, entrega 2 del Club): las mesas del mapa se compran con fichas de oro.
 * Se abre desde la portada (el boton de laton bajo la tarjeta de socio, js/club.js) y desde Perfil > Mesas (las de la boutique que aun no tienes).
 * Pantalla del hub (A.hub.screen("boutique")): Esc vuelve a la portada como cualquier otra.
 *   cabecera: volver, titulo, tus fichas de oro;   izquierda: la oferta de la casa (una mesa que aun no tienes, -30 %, hasta el lunes),
 *   filtros (todas, raras, legendarias, tuyas) y las mesas de 12 en 12;   derecha: la mesa elegida, «Probar en el mapa» y «Comprar».
 * Comprar va en dos pasos (el boton se arma en rojo y pide otra pulsacion) y paga con A.club.spend (js/skins.js A.mesas.buy).
 * Despues, premio de la casa (2 la rara, 3 la legendaria) y a la portada, donde la mesa nueva se ESTRENA y el crupier la presenta (js/mesas.js).
 * «Probar en el mapa» aparta la boutique y pone la mesa en el mapa de la portada unos segundos (o hasta que pulses algo).
 * Catalogo, precios y oferta: js/skins.js (A.mesas.shop/price/offer/buy). Miniaturas: assets/mesas/<id>.webp.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const C = () => A.core, $ = id => document.getElementById(id), P6 = s => A.pick6(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const TX = {
    title: "La boutique|The boutique|La boutique|A boutique|Die Boutique|La boutique||精品店|부티크|ブティック|Бутик|Butik",
    all: "Todas|All|Toutes|Todas|Alle|Tutte||全部|전체|すべて|Все|Wszystkie",
    rare: "Raras|Rare|Rares|Raras|Selten|Rare||稀有|레어|レア|Редкие|Rzadkie",
    leg: "Legendarias|Legendary|Légendaires|Lendárias|Legendär|Leggendarie||传说|전설|レジェンド|Легендарные|Legendarne",
    mine: "Tuyas|Yours|À toi|Suas|Deine|Tue||已拥有|보유|所持|Твои|Twoje",
    tierR: "Mesa rara · quieta|Rare table · still|Table rare · fixe|Mesa rara · parada|Seltener Tisch · ruhig|Tavolo raro · fermo||稀有牌桌 · 静态|레어 테이블 · 정지|レアテーブル · 静止|Редкий стол · неподвижный|Rzadki stół · nieruchomy",
    tierL: "Mesa legendaria · viva|Legendary table · alive|Table légendaire · vivante|Mesa lendária · viva|Legendärer Tisch · lebendig|Tavolo leggendario · vivo||传说牌桌 · 动态|전설 테이블 · 살아 있음|レジェンドテーブル · 動く|Легендарный стол · живой|Legendarny stół · żywy",
    buy: "Comprar|Buy|Acheter|Comprar|Kaufen|Compra||购买|구매|購入|Купить|Kup",
    sure: "¿Seguro? Pulsa otra vez|Sure? Press again|Sûr ? Appuie encore|Certeza? Aperte de novo|Sicher? Noch einmal|Sicuro? Premi ancora||确定吗？再按一次|정말요? 한 번 더|本当に？もう一度|Точно? Нажми ещё раз|Na pewno? Jeszcze raz",
    short: "Te faltan {n}|You need {n} more|Il t'en manque {n}|Faltam {n}|Dir fehlen {n}|Te ne mancano {n}||还差 {n}|{n}개 부족해요|あと{n}枚足りない|Не хватает {n}|Brakuje {n}",
    own: "Tuya|Yours|À toi|Sua|Deiner|Tuo||已拥有|보유 중|所持|Твой|Twój",
    use: "Usar en el mapa|Use on the map|Utiliser sur la carte|Usar no mapa|Auf der Karte nutzen|Usa sulla mappa||在地图上使用|지도에 사용|マップで使う|Поставить на карту|Użyj na mapie",
    using: "La llevas puesta|You're using it|Tu l'utilises|Você está usando|Liegt gerade auf|La stai usando||正在使用|사용 중|使用中|Уже на карте|W użyciu",
    try: "Probar en el mapa|Try it on the map|L'essayer sur la carte|Testar no mapa|Auf der Karte ansehen|Provala sulla mappa||在地图上试试|지도에서 미리 보기|マップで試す|Примерить на карте|Przymierz na mapie",
    trying: "Probando: {m}|Trying: {m}|Essai : {m}|Testando: {m}|Vorschau: {m}|Prova: {m}||试用：{m}|미리 보기: {m}|お試し中：{m}|Примерка: {m}|Przymiarka: {m}",
    tryBack: "Volver a la boutique|Back to the boutique|Retour à la boutique|Voltar à boutique|Zurück zur Boutique|Torna alla boutique||返回精品店|부티크로 돌아가기|ブティックに戻る|Назад в бутик|Wróć do butiku",
    offer: "Oferta de la casa|House offer|Offre de la maison|Oferta da casa|Angebot des Hauses|Offerta della casa||本店特价|하우스 특가|ハウスの特売|Предложение заведения|Oferta kasyna",
    till: "hasta el lunes|until Monday|jusqu'à lundi|até segunda|bis Montag|fino a lunedì||截至周一|월요일까지|月曜まで|до понедельника|do poniedziałku",
    bought: "Comprada esta semana|Bought this week|Achetée cette semaine|Comprada esta semana|Diese Woche gekauft|Comprato questa settimana||本周已购买|이번 주 구매 완료|今週購入済み|Куплено на этой неделе|Kupione w tym tygodniu",
    empty: "Aún no tienes ninguna de la boutique. Cada nivel del Club te paga fichas de oro.|You don't have any from the boutique yet. Every Club level pays you gold chips.|Tu n'en as encore aucune de la boutique. Chaque niveau du Club te paie en jetons d'or.|Você ainda não tem nenhuma da boutique. Cada nível do Clube paga fichas de ouro.|Du hast noch keinen aus der Boutique. Jede Club-Stufe zahlt dir Goldchips.|Non ne hai ancora nessuno della boutique. Ogni livello del Club ti paga in fiche d'oro.||你还没有精品店的牌桌。俱乐部每升一级都付你金筹码。|아직 부티크 테이블이 없어요. 클럽 레벨마다 골드 칩을 받아요.|ブティックのテーブルはまだない。クラブのレベルが上がるたびに金のチップがもらえる。|Из бутика пока ничего нет. Каждый уровень клуба платит золотыми фишками.|Nie masz jeszcze żadnego z butiku. Każdy poziom klubu płaci złotymi żetonami.",
  };
  const PER = 12, TRY_MS = 7000;
  const ST = { sel: null, tab: "all", page: 0, armed: null, armT: 0, trying: null, tryT: 0, busy: false, next: null };
  const fi = (cls = "") => `<img class="bq-fi${cls ? " " + cls : ""}" src="assets/icons/ficha_oro.webp" alt="">`;
  const M = () => A.mesas;
  const list = () => {
    const all = M().shop();
    return ST.tab === "r" ? all.filter(m => m.shop === "r") : ST.tab === "l" ? all.filter(m => m.shop === "l") : ST.tab === "mine" ? all.filter(m => M().owned(m.id)) : all;
  };
  const priceHtml = (id, big) => {
    const p = M().price(id), f = M().full(id);
    return `<span class="bq-pr${big ? " big" : ""}">${p < f ? `<s>${A.fmt(f)}</s>` : ""}${fi()}<b>${A.fmt(p)}</b></span>`;
  };
  const state = id => (id === M().current() ? "on" : M().owned(id) ? "got" : "");

  function item(m) {
    const s = state(m.id);
    return `<button type="button" class="bq-it${m.id === ST.sel ? " sel" : ""}${s ? " " + s : ""}${m.shop === "l" ? " leg" : ""}" data-id="${m.id}" aria-pressed="${m.id === ST.sel}">
      <span class="bq-th"><img src="assets/mesas/${m.id}.webp" alt="" width="640" height="360" decoding="async">${s === "on" ? `<em class="bq-own on">${esc(P6(TX.using))}</em>` : s ? `<em class="bq-own">${esc(P6(TX.own))}</em>` : `<span class="bq-pb">${priceHtml(m.id)}</span>`}</span>
      <b class="bq-nm">${esc(M().name(m.id))}</b></button>`;
  }
  function offerHtml() {
    const o = M().offer(); if (!o) return "";
    const got = M().owned(o.id);
    return `<button type="button" class="bq-offer${o.id === ST.sel ? " sel" : ""}" data-id="${o.id}"><img class="bq-oth" src="assets/mesas/${o.id}.webp" alt="">
      <span class="bq-otx"><span class="gx-eyb">${esc(P6(TX.offer))} · ${esc(P6(TX.till))}</span><b>${esc(M().name(o.id))}<i>−${Math.round(o.off * 100)} %</i></b></span>
      ${got ? `<em class="bq-own">${esc(P6(TX.bought))}</em>` : priceHtml(o.id, true)}</button>`;
  }
  function detHtml() {
    const id = ST.sel, s = state(id), have = A.club ? A.club.fichas() : 0, p = M().price(id);
    const leg = M().tier(id) === "l";
    let act;
    if (s === "on") act = `<button type="button" class="gx-btn wide" id="bqUse" disabled><span>${esc(P6(TX.using))}</span></button>`;
    else if (s === "got") act = `<button type="button" class="gx-btn pri wide" id="bqUse"><span>${esc(P6(TX.use))}</span></button>`;
    else if (have < p) act = `<button type="button" class="gx-btn wide bq-short" id="bqBuy" aria-disabled="true"><span>${esc(P6(TX.short).replace("{n}", A.fmt(p - have)))}</span>${fi("sm")}</button>`;
    else act = `<button type="button" class="gx-btn pri wide${ST.armed === id ? " armed" : ""}" id="bqBuy"><span>${esc(ST.armed === id ? P6(TX.sure) : P6(TX.buy))}</span><span class="bq-bp">${fi("sm")}${A.fmt(p)}</span></button>`;
    return `<span class="bq-dth${leg ? " leg" : ""}"><img src="assets/mesas/${id}.webp" alt="" width="640" height="360" decoding="async"></span>
      <span class="gx-eyb bq-tier">${esc(P6(leg ? TX.tierL : TX.tierR))}</span>
      <h3 class="gx-t-m bq-dn">${esc(M().name(id))}</h3>
      <p class="bq-dd">${esc(M().desc(id))}</p>
      ${s ? "" : `<div class="bq-dp">${priceHtml(id, true)}</div>`}
      <div class="bq-acts"><button type="button" class="gx-btn gho wide" id="bqTry"><span>${esc(P6(TX.try))}</span></button>${act}</div>`;
  }
  function gridHtml() {
    const L = list(), pages = Math.max(1, Math.ceil(L.length / PER)); ST.page = Math.min(ST.page, pages - 1);
    const items = L.slice(ST.page * PER, ST.page * PER + PER);
    const n = k => k === "all" ? M().shop().length : k === "r" ? M().shop().filter(m => m.shop === "r").length : k === "l" ? M().shop().filter(m => m.shop === "l").length : M().shop().filter(m => M().owned(m.id)).length;
    const tab = (k, tx) => `<button type="button" class="bq-tab${ST.tab === k ? " on" : ""}" data-tab="${k}" aria-pressed="${ST.tab === k}"><span>${esc(P6(tx))}</span><i>${n(k)}</i></button>`;
    return `<div class="bq-bar"><nav class="bq-tabs" id="bqTabs">${tab("all", TX.all)}${tab("r", TX.rare)}${tab("l", TX.leg)}${tab("mine", TX.mine)}</nav>
      <div class="bq-pager"${pages > 1 ? "" : " hidden"}><button type="button" class="gx-btn sm gho" id="bqPrev"${ST.page ? "" : " disabled"} aria-label="‹">‹</button><span>${ST.page + 1} / ${pages}</span><button type="button" class="gx-btn sm gho" id="bqNext"${ST.page < pages - 1 ? "" : " disabled"} aria-label="›">›</button></div></div>
      <div class="bq-items" id="bqItems">${items.length ? items.map(item).join("") : `<p class="bq-empty">${esc(P6(TX.empty))}</p>`}</div>`;
  }
  function html() {
    const have = A.club ? A.club.fichas() : 0, lv = A.club ? P6(A.club.tx.lv).replace("{n}", A.club.level()) : "";
    return `<div class="gx-veil bq-veil"></div><section class="bq-screen gx-stage" aria-labelledby="bqH" data-nosq>
      <div class="gx-grid bq-grid">
        <header class="bq-head"><button type="button" class="gx-btn sm" id="hubBack">${A.icon("u_back")}<span>${A.t("set.close")}</span>${A.gala.keyHint("Esc", "b")}</button>
          <h2 class="gx-t-l bq-h" id="bqH"><span class="bq-hic">${A.icon("purse")}</span><span><span class="gx-eyb">${esc(A.club ? P6(A.club.tx.club) : "")}${lv ? " · " + esc(lv) : ""}</span>${esc(P6(TX.title))}</span></h2>
          <span class="bq-wal" aria-label="${esc(A.club ? P6(A.club.tx.fichas) : "")}">${fi()}<b id="bqWal">${A.fmt(have)}</b></span>${A.hub.tools()}</header>
        <div class="gx-sh bq-left"><div class="gx-paper bq-cat">${offerHtml()}<div id="bqGrid" class="bq-gw">${gridHtml()}</div></div></div>
        <div class="gx-sh bq-right"><div class="gx-paper bq-det" id="bqDet">${detHtml()}</div></div>
      </div></section>`;
  }

  /* pintar solo lo que cambia (la rejilla, la ficha y la oferta), conservando el foco */
  function repaint(focusSel) {
    const g = $("bqGrid"), d = $("bqDet"); if (!g || !d) return;
    const fid = document.activeElement && document.activeElement.id, fdata = document.activeElement && document.activeElement.dataset;
    g.innerHTML = gridHtml(); d.innerHTML = detHtml();
    const of = document.querySelector("#dlg .bq-offer"); if (of) of.outerHTML = offerHtml();
    const w = $("bqWal"); if (w && A.club) w.textContent = A.fmt(A.club.fichas());
    wireInner();
    let f = null;
    if (focusSel) f = document.querySelector(focusSel);
    else if (fid) f = $(fid);
    else if (fdata && fdata.id) f = document.querySelector(`#dlg .bq-it[data-id="${fdata.id}"]`);
    else if (fdata && fdata.tab) f = document.querySelector(`#dlg .bq-tab[data-tab="${fdata.tab}"]`);
    if (f && !f.disabled) f.focus({ preventScroll: true });
  }
  function pick(id, focus) {
    if (!id || ST.busy) return;
    if (id !== ST.sel) { ST.sel = id; ST.armed = null; if (A.sfx && A.sfx.card) A.sfx.card(); }
    repaint(focus || `#dlg .bq-it[data-id="${id}"]`);
  }
  function wireInner() {
    const sc = document.querySelector("#dlg .bq-screen"); if (!sc) return;
    sc.querySelectorAll(".bq-it, .bq-offer").forEach(b => { b.onclick = () => pick(b.dataset.id, b.classList.contains("bq-offer") ? "#dlg .bq-offer" : null); });
    sc.querySelectorAll(".bq-tab").forEach(b => { b.onclick = () => { if (ST.tab === b.dataset.tab) return; ST.tab = b.dataset.tab; ST.page = 0; if (A.sfx && A.sfx.card) A.sfx.card(); repaint(`#dlg .bq-tab[data-tab="${ST.tab}"]`); }; });
    const pv = $("bqPrev"), nx = $("bqNext");
    if (pv) pv.onclick = () => { if (ST.page > 0) { ST.page--; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqPrev:not([disabled]), #bqNext"); } };
    if (nx) nx.onclick = () => { ST.page++; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqNext:not([disabled]), #bqPrev"); };
    const tr = $("bqTry"); if (tr) tr.onclick = () => tryOn(ST.sel);
    const us = $("bqUse"); if (us) us.onclick = () => { if (M().use(ST.sel)) { if (A.sfx && A.sfx.stamp) A.sfx.stamp(); if (A.haptic) A.haptic([14]); repaint("#bqTry"); } };
    const bu = $("bqBuy"); if (bu) bu.onclick = () => buy(ST.sel);
  }

  /* comprar: primero se arma (rojo, «¿Seguro?»); la segunda pulsacion paga. Si te faltan fichas, nada (zumbido) */
  function buy(id) {
    if (ST.busy || !id || M().owned(id)) return;
    const have = A.club ? A.club.fichas() : 0, p = M().price(id);
    if (have < p) { if (A.sfx && A.sfx.buzz) A.sfx.buzz(0); const b = $("bqBuy"); if (b) { b.classList.remove("bq-no"); void b.offsetWidth; b.classList.add("bq-no"); } return; }
    if (ST.armed !== id) { ST.armed = id; ST.armT = Date.now(); if (A.sfx && A.sfx.ui) A.sfx.ui(); repaint("#bqBuy"); setTimeout(() => { if (ST.armed === id && Date.now() - ST.armT >= 3900) { ST.armed = null; repaint(); } }, 4000); return; }
    ST.armed = null;
    const from = have;
    if (!M().buy(id)) return;
    ST.busy = true;
    repaint("#bqTry");                                                  // ya es tuya: la ficha y la rejilla lo dicen al momento
    { const w0 = $("bqWal"); if (w0) w0.textContent = A.fmt(from); }    // y el monedero baja moneda a moneda desde lo que tenias
    const leg = M().tier(id) === "l";
    const card = document.querySelector(`#dlg .bq-it[data-id="${id}"]`), det = $("bqDet");
    if (A.casa && A.casa.premio) A.casa.premio(leg ? 3 : 2); else if (A.sfx && A.sfx.jackpot) A.sfx.jackpot(leg ? 3 : 2);
    if (A.sfx && A.sfx.stamp) setTimeout(() => A.sfx.stamp(), 120);
    if (A.haptic) A.haptic(leg ? [30, 60, 40] : [24]);
    /* las fichas se van: el monedero cuenta hacia abajo, moneda a moneda */
    const w = $("bqWal"), to = A.club.fichas(), n = 10;
    for (let i = 1; i <= n; i++) setTimeout(() => { if (w && w.isConnected) w.textContent = A.fmt(Math.round(from + ((to - from) * i) / n)); if (i % 3 === 0 && A.sfx && A.sfx.coin) A.sfx.coin(); }, 160 + i * 55);
    if (card) card.classList.add("bq-sold");
    if (det) det.classList.add("bq-sold");
    /* a la portada: alli se estrena (js/mesas.js) */
    setTimeout(() => { ST.busy = false; if (C().S.hub === "boutique") A.hub.screen("home"); }, 2200);
  }

  /* «Probar en el mapa»: la boutique se aparta, la mesa se pone en el mapa de verdad y vuelve sola (o al pulsar cualquier cosa) */
  function tryOn(id) {
    if (!id || ST.trying || ST.busy) return;
    const map = C().map; if (!map || !map.setStyle || !A.MAPSTYLES[id]) return;
    ST.trying = id; if (A.sfx && A.sfx.card) A.sfx.card();
    map.setStyle(A.MAPSTYLES[id]); if (map.dirty !== undefined) map.dirty = map.fxDirty = true;
    document.body.classList.add("bq-try");
    const lab = document.createElement("div"); lab.className = "bq-tryl"; lab.id = "bqTryL";
    lab.innerHTML = `<div class="gx-paper"><b>${esc(P6(TX.trying).replace("{m}", M().name(id)))}</b><button type="button" class="gx-btn sm" id="bqTryBack"><span>${esc(P6(TX.tryBack))}</span>${A.gala.keyHint("Esc", "b")}</button></div>`;
    document.body.appendChild(lab);
    const back = $("bqTryBack"); back.onclick = () => tryOff(); setTimeout(() => back.focus({ preventScroll: true }), 60);
    ST.tryT = setTimeout(tryOff, TRY_MS);
  }
  function tryOff(quiet) {
    if (!ST.trying) return;
    clearTimeout(ST.tryT); const id = ST.trying; ST.trying = null;
    const map = C().map; if (map && map.setStyle) map.setStyle(M().style());
    document.body.classList.remove("bq-try");
    const l = $("bqTryL"); if (l) l.remove();
    if (!quiet) { if (A.sfx && A.sfx.card) A.sfx.card(); const f = $("bqTry"); if (f) f.focus({ preventScroll: true }); }
    return id;
  }
  /* Esc (y el boton B, que llega como Esc) durante la prueba: vuelve a la boutique, no a la portada */
  addEventListener("keydown", e => {
    if (!ST.trying) return;
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopImmediatePropagation(); tryOff(); }
  }, true);
  addEventListener("pointerdown", e => { if (ST.trying && !(e.target && e.target.closest && e.target.closest("#bqTryL"))) { e.stopImmediatePropagation(); tryOff(); } }, true);

  function open(id) {
    const c = C(); if (!c) return;
    id = id || ST.next; ST.next = null;
    if (ST.trying) tryOff(true);
    const shop = M().shop();
    const o = M().offer();
    ST.sel = id && shop.some(m => m.id === id) ? id : ST.sel && shop.some(m => m.id === ST.sel) ? ST.sel : o ? o.id : (shop.find(m => !M().owned(m.id)) || shop[0]).id;
    ST.armed = null; ST.busy = false;
    if (id) { ST.tab = "all"; const L = list(), i = L.findIndex(m => m.id === id); ST.page = i >= 0 ? Math.floor(i / PER) : 0; }
    c.dialog(html(), "tablewrap");
    A.hub.wireTools(); $("hubBack").onclick = () => { if (A.sfx && A.sfx.ui) A.sfx.ui(); A.hub.screen("home"); };
    wireInner();
    setTimeout(() => { const f = document.querySelector(`#dlg .bq-it[data-id="${ST.sel}"]`) || document.querySelector("#dlg .bq-offer") || $("bqTry"); if (f) f.focus({ preventScroll: true }); }, 80);
  }
  /* si se sale de la boutique a mitad de una prueba, el mapa vuelve a tu mesa */
  const leave = () => { if (ST.trying) tryOff(true); ST.armed = null; };

  A.boutique = { open, leave, want: id => { ST.next = id; }, get trying() { return ST.trying; } };
})(window.AIQ);
