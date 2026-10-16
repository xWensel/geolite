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
    title: "La tienda|The boutique|La boutique|A boutique|Die Boutique|La boutique||精品店|부티크|ブティック|Бутик|Butik",
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
    tryBack: "Volver a la tienda|Back to the boutique|Retour à la boutique|Voltar à boutique|Zurück zur Boutique|Torna alla boutique||返回精品店|부티크로 돌아가기|ブティックに戻る|Назад в бутик|Wróć do butiku",
    offer: "Oferta de la casa|House offer|Offre de la maison|Oferta da casa|Angebot des Hauses|Offerta della casa||本店特价|하우스 특가|ハウスの特売|Предложение заведения|Oferta kasyna",
    till: "hasta el lunes|until Monday|jusqu'à lundi|até segunda|bis Montag|fino a lunedì||截至周一|월요일까지|月曜まで|до понедельника|do poniedziałku",
    bought: "Comprada esta semana|Bought this week|Achetée cette semaine|Comprada esta semana|Diese Woche gekauft|Comprato questa settimana||本周已购买|이번 주 구매 완료|今週購入済み|Куплено на этой неделе|Kupione w tym tygodniu",
    empty: "Aún no tienes ninguna de la tienda. Cada nivel del Club te paga fichas de oro.|You don't have any from the boutique yet. Every Club level pays you gold chips.|Tu n'en as encore aucune de la boutique. Chaque niveau du Club te paie en jetons d'or.|Você ainda não tem nenhuma da boutique. Cada nível do Clube paga fichas de ouro.|Du hast noch keinen aus der Boutique. Jede Club-Stufe zahlt dir Goldchips.|Non ne hai ancora nessuno della boutique. Ogni livello del Club ti paga in fiche d'oro.||你还没有精品店的牌桌。俱乐部每升一级都付你金筹码。|아직 부티크 테이블이 없어요. 클럽 레벨마다 골드 칩을 받아요.|ブティックのテーブルはまだない。クラブのレベルが上がるたびに金のチップがもらえる。|Из бутика пока ничего нет. Каждый уровень клуба платит золотыми фишками.|Nie masz jeszcze żadnego z butiku. Każdy poziom klubu płaci złotymi żetonami.",
  };
  /* v0.3.134: el vestuario del crupier (js/vestuario.js) */
  const VX = {
    cMesas: "Mesas|Tables|Tables|Mesas|Tische|Tavoli||牌桌|테이블|テーブル|Столы|Stoły",
    cVest: "Vestuario|Wardrobe|Garde-robe|Guarda-roupa|Garderobe|Guardaroba||衣橱|의상실|衣装|Гардероб|Garderoba",
    traje: "Trajes|Suits|Costumes|Ternos|Anzüge|Abiti||西装|정장|スーツ|Костюмы|Garnitury",
    pajarita: "Pajaritas|Bow ties|Nœuds papillon|Gravatas|Fliegen|Papillon||领结|나비넥타이|蝶ネクタイ|Бабочки|Muchy",
    piezas: "Piezas|Pieces|Pièces|Peças|Extras|Pezzi||饰品|소품|小物|Аксессуары|Dodatki",
    casa: "Básico|House|Maison|Básico|Basis|Base||本店原装|기본|定番|Базовый|Firmowe",                 // la etiqueta de la tarjeta (corta: cabe en la Deck)
    casaL: "De la casa|House style|De la maison|Da casa|Vom Haus|Della casa||本店原装|하우스 기본|店の定番|От заведения|Firmowe",
    antifaz: "Antifaces|Masks|Loups|Máscaras|Masken|Maschere||面具|가면|仮面|Маски|Maski",
    mine: "Tuyo|Yours|À toi|Seu|Deins|Tuo||已拥有|보유|所持|Твоё|Twoje",
    on: "Puesto|Wearing|Porté|Vestido|Aktiv|In uso||穿着|착용 중|着用中|Надето|Na nim",
    tierR: "Vestuario|Wardrobe|Garde-robe|Guarda-roupa|Garderobe|Guardaroba||服饰|의상|衣装|Одежда|Garderoba",
    tierL: "Vestuario legendario|Legendary wardrobe|Garde-robe légendaire|Guarda-roupa lendário|Legendäre Garderobe|Guardaroba leggendario||传说服饰|전설 의상|レジェンド衣装|Легендарная одежда|Legendarna garderoba",
    slot: {
      traje: "Traje|Suit|Costume|Terno|Anzug|Abito||西装|정장|スーツ|Костюм|Garnitur",
      pajarita: "Pajarita y cinta|Bow tie and band|Nœud papillon et ruban|Gravata e fita|Fliege und Hutband|Papillon e nastro||领结和帽带|나비넥타이와 띠|蝶ネクタイとリボン|Бабочка и лента|Mucha i wstążka",
      antifaz: "Antifaz|Mask|Loup|Máscara|Maske|Maschera||面具|가면|仮面|Маска|Maska",
      lunares: "Pieza|Piece|Pièce|Peça|Extra|Pezzo||饰品|소품|小物|Аксессуар|Dodatek",
      clavel: "Pieza|Piece|Pièce|Peça|Extra|Pezzo||饰品|소품|小物|Аксессуар|Dodatek",
      cadena: "Pieza|Piece|Pièce|Peça|Extra|Pezzo||饰品|소품|小物|Аксессуар|Dodatek",
      pluma: "Pieza|Piece|Pièce|Peça|Extra|Pezzo||饰品|소품|小物|Аксессуар|Dodatek",
      veneciano: "Pieza|Piece|Pièce|Peça|Extra|Pezzo||饰品|소품|小物|Аксессуар|Dodatek",
      chistera: "Chistera|Top hat|Haut-de-forme|Cartola|Zylinder|Cilindro||礼帽|실크해트|シルクハット|Цилиндр|Cylinder",
    },
    wear: "Ponértelo|Put it on|Le mettre|Vestir|Anziehen|Indossalo||穿上|착용하기|着る|Надеть|Załóż",
    off: "Quitártelo|Take it off|L'enlever|Tirar|Ausziehen|Toglilo||脱下|벗기|脱ぐ|Снять|Zdejmij",
    empty: "Aún no tienes ropa del vestuario. Cada nivel del Club te paga fichas de oro.|You don't have anything from the wardrobe yet. Every Club level pays you gold chips.|Tu n'as encore rien de la garde-robe. Chaque niveau du Club te paie en jetons d'or.|Você ainda não tem nada do guarda-roupa. Cada nível do Clube paga fichas de ouro.|Du hast noch nichts aus der Garderobe. Jede Club-Stufe zahlt dir Goldchips.|Non hai ancora niente del guardaroba. Ogni livello del Club ti paga in fiche d'oro.||你还没有衣橱里的衣服。俱乐部每升一级都付你金筹码。|아직 의상실 옷이 없어요. 클럽 레벨마다 골드 칩을 받아요.|衣装はまだ何もない。クラブのレベルが上がるたびに金のチップがもらえる。|Из гардероба пока ничего нет. Каждый уровень клуба платит золотыми фишками.|Nie masz jeszcze nic z garderoby. Każdy poziom klubu płaci złotymi żetonami.",
    prob: "Probador|Fitting room|Cabine d'essayage|Provador|Umkleide|Camerino||试衣间|피팅룸|試着室|Примерочная|Przymierzalnia",
  };
  const PER = 12, TRY_MS = 7000;
  const ST = { sel: null, tab: "all", page: 0, armed: null, armT: 0, trying: null, tryT: 0, busy: false, next: null, cat: "mesas", vsel: null, vtab: "traje", vpage: 0, spr: null, psel: null, ptab: "ret", ppage: 0, ptry: null };
  const V = () => A.vestuario;
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
  /* las dos secciones de la boutique, en la cabecera: Mesas y Vestuario */
  const catTabs = () => V() ? `<nav class="bq-cats" aria-label="${esc(P6(TX.title))}">${[["mesas", VX.cMesas, "chip_g"], ["vest", VX.cVest, "boss_hat"]].concat(A.punteros ? [["punt", PX.cPunt, "crosshair"]] : []).map(([k, t, ic]) =>
    `<button type="button" class="bq-cat-t${ST.cat === k ? " on" : ""}" data-cat="${k}" aria-pressed="${ST.cat === k}" title="${esc(P6(t))}" aria-label="${esc(P6(t))}">${A.icon(ic)}<span>${esc(P6(t))}</span></button>`).join("")}</nav>` : "";
  const catBody = () => ST.cat === "vest" ? `<div id="bqGrid" class="bq-gw">${vGridHtml()}</div>` : ST.cat === "punt" ? `<div id="bqGrid" class="bq-gw">${pGridHtml()}</div>` : `${offerHtml()}<div id="bqGrid" class="bq-gw">${gridHtml()}</div>`;
  function html() {
    const have = A.club ? A.club.fichas() : 0, lv = A.club ? P6(A.club.tx.lv).replace("{n}", A.club.level()) : "";
    return `<div class="gx-veil bq-veil"></div><section class="bq-screen gx-stage" aria-labelledby="bqH" data-nosq>
      <div class="gx-grid bq-grid">
        <header class="bq-head"><button type="button" class="gx-btn sm" id="hubBack">${A.icon("u_back")}<span>${A.t("set.close")}</span>${A.gala.keyHint("Esc", "b")}</button>
          <h2 class="gx-t-l bq-h" id="bqH"><span class="bq-hic">${A.icon("purse")}</span><span><span class="gx-eyb">${esc(A.club ? P6(A.club.tx.club) : "")}${lv ? " · " + esc(lv) : ""}</span>${esc(P6(TX.title))}</span></h2>
          ${catTabs()}<span class="bq-wal" aria-label="${esc(A.club ? P6(A.club.tx.fichas) : "")}">${fi()}<b id="bqWal">${A.fmt(have)}</b></span>${A.hub.tools()}</header>
        <div class="gx-sh bq-left"><div class="gx-paper bq-cat${ST.cat === "vest" ? " vest" : ST.cat === "punt" ? " punt" : ""}" id="bqCat">${catBody()}</div></div>
        <div class="gx-sh bq-right"><div class="gx-paper bq-det${ST.cat === "vest" ? " vest" : ST.cat === "punt" ? " punt" : ""}" id="bqDet">${ST.cat === "vest" ? vDetHtml() : ST.cat === "punt" ? pDetHtml() : detHtml()}</div></div>
      </div></section>`;
  }

  /* ---------------------------------------------------------------- el vestuario: las 12 piezas (6 x 2) y el probador a la derecha */
  /* las pestanas: un hueco cada una (los 12 colores de la carta, en su orden), las legendarias y lo tuyo; 12 por pagina */
  const vOf = t => { const all = V().items; return t === "l" ? all.filter(i => i.r === "l") : t === "pieza" ? all.filter(i => i.r === "p") : t === "mine" ? all.filter(i => !i.casa && V().owned(i.id)) : all.filter(i => i.slot === t && i.r !== "l"); };
  const vList = () => vOf(ST.vtab);
  const vState = id => V().wearing(id) ? "on" : V().owned(id) ? "got" : "";
  const vPrice = id => `<span class="bq-pr">${fi()}<b>${A.fmt(V().price(id))}</b></span>`;               // (en la ficha, el precio va en el boton de comprar)
  /* cada tarjeta: el crupier con lo que llevas puesto MAS esa prenda (todo se combina: se ve como quedaria) */
  function vItem(it) {
    const s = vState(it.id);
    return `<button type="button" class="bq-it bq-vit${it.id === ST.vsel ? " sel" : ""}${s ? " " + s : ""}${it.r === "l" ? " leg" : ""}" data-vid="${it.id}" aria-pressed="${it.id === ST.vsel}">
      <span class="bq-th bq-vth"><img src="${V().thumb(V().with(it.id), 1)}" alt="" width="96" height="112" decoding="async"></span>
      <b class="bq-nm">${esc(V().name(it.id))}</b>
      <span class="bq-vp">${s === "on" ? `<em class="bq-own on">${esc(P6(VX.on))}</em>` : it.casa ? `<em class="bq-own">${esc(P6(VX.casa))}</em>` : s ? `<em class="bq-own">${esc(P6(VX.mine))}</em>` : vPrice(it.id)}</span></button>`;
  }
  function vGridHtml() {
    const L = vList(), pages = Math.max(1, Math.ceil(L.length / PER)); ST.vpage = Math.min(ST.vpage, pages - 1);
    const items = L.slice(ST.vpage * PER, ST.vpage * PER + PER);
    const tab = (k, tx) => `<button type="button" class="bq-tab bq-vtab${ST.vtab === k ? " on" : ""}" data-vtab="${k}" aria-pressed="${ST.vtab === k}"><span>${esc(P6(tx))}</span><i>${vOf(k).length}</i></button>`;
    return `<div class="bq-bar"><nav class="bq-tabs">${tab("traje", VX.traje)}${tab("antifaz", VX.antifaz)}${tab("pajarita", VX.pajarita)}${tab("pieza", VX.piezas)}${tab("l", TX.leg)}${tab("mine", VX.mine)}</nav>
      <div class="bq-pager"${pages > 1 ? "" : " hidden"}><button type="button" class="gx-btn sm gho" id="bqVPrev"${ST.vpage ? "" : " disabled"} aria-label="‹">‹</button><span>${ST.vpage + 1} / ${pages}</span><button type="button" class="gx-btn sm gho" id="bqVNext"${ST.vpage < pages - 1 ? "" : " disabled"} aria-label="›">›</button></div></div>
      <div class="bq-items vest" id="bqItems">${items.length ? items.map(vItem).join("") : `<p class="bq-empty">${esc(P6(VX.empty))}</p>`}</div>`;
  }
  function vDetHtml() {
    const id = ST.vsel, it = V().get(id), s = vState(id), have = A.club ? A.club.fichas() : 0, p = V().price(id), leg = it.r === "l";
    let act;
    if (s === "on" && it.casa) act = `<button type="button" class="gx-btn wide" disabled><span>${esc(P6(VX.on))}</span></button>`;
    else if (s === "on") act = `<button type="button" class="gx-btn gho wide" id="bqOff"><span>${esc(P6(VX.off))}</span></button>`;
    else if (s === "got") act = `<button type="button" class="gx-btn pri wide" id="bqWear"><span>${esc(P6(VX.wear))}</span></button>`;
    else if (have < p) act = `<button type="button" class="gx-btn wide bq-short" id="bqBuy" aria-disabled="true"><span>${esc(P6(TX.short).replace("{n}", A.fmt(p - have)))}</span>${fi("sm")}</button>`;
    else act = `<button type="button" class="gx-btn pri wide${ST.armed === id ? " armed" : ""}" id="bqBuy"><span>${esc(ST.armed === id ? P6(TX.sure) : P6(TX.buy))}</span><span class="bq-bp">${fi("sm")}${A.fmt(p)}</span></button>`;
    return `<span class="bq-prob${leg ? " leg" : ""}"><span class="bq-probl">${esc(P6(VX.prob))}</span><span class="bq-probh" id="bqProb"></span></span>
      <span class="gx-eyb bq-tier">${esc(P6(leg ? VX.tierL : it.casa ? VX.casaL : VX.tierR))} · ${esc(P6(VX.slot[it.slot]))}</span>
      <h3 class="gx-t-m bq-dn">${esc(V().name(id))}</h3>
      <p class="bq-dd">${esc(V().desc(id))}</p>
      <div class="bq-acts">${act}</div>`;
  }
  /* las miniaturas, nitidas: el retrato a 1 pixel por pixel de arte y la caja lo amplia un numero ENTERO de veces en pixeles reales de pantalla
     (la figura centrada y de pie en el borde de abajo; lo que sobra arriba es el hueco de la chistera que salta) */
  function fitThumbs() {
    document.querySelectorAll("#dlg .bq-vth").forEach(b => {
      const im = b.querySelector("img"); if (!im) return;
      const z = b.currentCSSZoom || 1, dpr = window.devicePixelRatio || 1, per = 1 / (z * dpr), rw = b.clientWidth * z * dpr, rh = b.clientHeight * z * dpr;
      if (!rw) return;
      const k = Math.max(1, Math.floor(Math.min(rw / 72, rh / 84)));
      const st = im.style; st.width = 96 * k * per + "px"; st.height = 112 * k * per + "px";
      st.left = Math.round((rw - 96 * k) / 2 - 4.5 * k) * per + "px"; st.top = Math.round(rh - 112 * k + 6 * k) * per + "px";
    });
  }
  /* el probador: el crupier de verdad (respira, parpadea y hace sus gestos) con lo que llevas mas la pieza elegida */
  function dropProb() { if (ST.spr) { try { ST.spr.destroy(); } catch (e) {} ST.spr = null; } }
  function mountProb() {
    dropProb();
    const host = $("bqProb"); if (!host || !A.crupier || !V()) return;
    try { ST.spr = A.crupier.mount(host, { atlas: V().atlasFor(V().with(ST.vsel)), floor: true }); } catch (e) { ST.spr = null; }
  }
  const vPaint = () => { fitThumbs(); mountProb(); };

  /* ---------------------------------------------------------------- los punteros (js/punteros.js): reticulo, chincheta, linea y diana, por
     separado y combinables. Miniaturas animadas (un solo bucle, a ~16 fps, solo con la seccion abierta) y «Probar en el mapa» sobre el mapa de verdad */
  const PX = {
    cPunt: "Punteros|Pointers|Pointeurs|Ponteiros|Zeiger|Puntatori||指针|포인터|ポインター|Указатели|Wskaźniki",
    use: "Usar|Use|Utiliser|Usar|Verwenden|Usa||使用|사용|使う|Использовать|Użyj",
    hint: "Haz clic en el mapa: el lugar está en el centro|Click on the map: the place is in the centre|Clique sur la carte : le lieu est au centre|Clique no mapa: o lugar está no centro|Klick auf die Karte: Der Ort liegt in der Mitte|Fai clic sulla mappa: il luogo è al centro||点击地图：地点就在中央|지도를 클릭하세요. 장소는 가운데예요|マップをクリック。場所は真ん中|Нажми на карту: место в центре|Kliknij mapę: miejsce jest na środku",
    empty: "Aún no tienes punteros de la tienda. Cada nivel del Club te paga fichas de oro.|You don't have any pointers from the boutique yet. Every Club level pays you gold chips.|Tu n'as encore aucun pointeur de la boutique. Chaque niveau du Club te paie en jetons d'or.|Você ainda não tem ponteiros da boutique. Cada nível do Clube paga fichas de ouro.|Du hast noch keine Zeiger aus der Boutique. Jede Club-Stufe zahlt dir Goldchips.|Non hai ancora puntatori della boutique. Ogni livello del Club ti paga in fiche d'oro.||你还没有精品店的指针。俱乐部每升一级都会给你金筹码。|아직 부티크 포인터가 없어요. 클럽 레벨마다 골드 칩을 받아요.|まだブティックのポインターはない。クラブのレベルごとに金のチップがもらえる。|У тебя пока нет указателей из бутика. Каждый уровень клуба платит золотыми фишками.|Nie masz jeszcze wskaźników z butiku. Każdy poziom Klubu płaci złotymi żetonami.",
  };
  const PU = () => A.punteros;
  const pOf = t => t === "mine" ? PU().SLOTS.flatMap(s => PU().list(s).filter(id => id !== "casa" && PU().owned(s, id)).map(id => [s, id])) : PU().list(t).map(id => [t, id]);
  const pState = (s, id) => (PU().current(s) === id ? "on" : PU().owned(s, id) ? "got" : "");
  function pItem([s, id]) {
    const k = s + ":" + id, st = pState(s, id);
    return `<button type="button" class="bq-it bq-pit${k === ST.psel ? " sel" : ""}${st ? " " + st : ""}" data-pid="${k}" aria-pressed="${k === ST.psel}">
      <span class="bq-th bq-pth"><canvas width="160" height="100" data-pt="${k}"></canvas></span>
      <span class="bq-prow"><b class="bq-nm">${esc(PU().name(s, id))}</b>${st === "on" ? `<em class="bq-own on">${esc(P6(VX.on))}</em>` : id === "casa" ? `<em class="bq-own">${esc(P6(VX.casa))}</em>` : st ? `<em class="bq-own">${esc(P6(VX.mine))}</em>` : `<span class="bq-pr">${fi()}<b>${A.fmt(PU().price(s, id))}</b></span>`}</span></button>`;
  }
  function pGridHtml() {
    const L = pOf(ST.ptab), pages = Math.max(1, Math.ceil(L.length / PER)); ST.ppage = Math.min(ST.ppage, pages - 1);
    const items = L.slice(ST.ppage * PER, ST.ppage * PER + PER);
    const tab = (k, tx) => `<button type="button" class="bq-tab bq-ptab${ST.ptab === k ? " on" : ""}" data-ptab="${k}" aria-pressed="${ST.ptab === k}"><span>${esc(tx)}</span><i>${pOf(k).length}</i></button>`;
    return `<div class="bq-bar"><nav class="bq-tabs">${PU().SLOTS.map(s => tab(s, PU().slotPlural(s))).join("")}${tab("mine", P6(VX.mine))}</nav>
      <div class="bq-pager"${pages > 1 ? "" : " hidden"}><button type="button" class="gx-btn sm gho" id="bqPPrev"${ST.ppage ? "" : " disabled"} aria-label="‹">‹</button><span>${ST.ppage + 1} / ${pages}</span><button type="button" class="gx-btn sm gho" id="bqPNext"${ST.ppage < pages - 1 ? "" : " disabled"} aria-label="›">›</button></div></div>
      <div class="bq-items punt" id="bqItems">${items.length ? items.map(pItem).join("") : `<p class="bq-empty">${esc(P6(PX.empty))}</p>`}</div>`;
  }
  function pDetHtml() {
    const [s, id] = ST.psel.split(":"), st = pState(s, id), have = A.club ? A.club.fichas() : 0, p = PU().price(s, id);
    let act;
    if (st === "on") act = `<button type="button" class="gx-btn wide" disabled><span>${esc(P6(VX.on))}</span></button>`;
    else if (st === "got") act = `<button type="button" class="gx-btn pri wide" id="bqPUse"><span>${esc(P6(PX.use))}</span></button>`;
    else if (have < p) act = `<button type="button" class="gx-btn wide bq-short" id="bqBuy" aria-disabled="true"><span>${esc(P6(TX.short).replace("{n}", A.fmt(p - have)))}</span>${fi("sm")}</button>`;
    else act = `<button type="button" class="gx-btn pri wide${ST.armed === ST.psel ? " armed" : ""}" id="bqBuy"><span>${esc(ST.armed === ST.psel ? P6(TX.sure) : P6(TX.buy))}</span><span class="bq-bp">${fi("sm")}${A.fmt(p)}</span></button>`;
    return `<span class="bq-dth bq-pprev"><canvas width="320" height="200" id="bqPCv"></canvas></span>
      <span class="gx-eyb bq-tier">${esc(PU().slotName(s))}${id === "casa" ? " · " + esc(P6(VX.casaL)) : ""}</span>
      <h3 class="gx-t-m bq-dn">${esc(PU().name(s, id))}</h3>
      <p class="bq-dd">${esc(PU().slotDesc(s))}</p>
      <div class="bq-acts"><button type="button" class="gx-btn gho wide" id="bqPTry"><span>${esc(P6(TX.try))}</span></button>${act}</div>`;
  }
  let pRaf = 0, pLast = 0;
  /* el lienzo, del tamano que ocupa en pixeles reales de la pantalla (zoom de la portada incluido): asi el pixel art va a escala entera */
  function pFit(cv, ratio) {
    const r = cv.getBoundingClientRect(), dp = window.devicePixelRatio || 1, W = Math.max(16, Math.round(r.width * dp)), H = ratio ? Math.round(W * ratio) : Math.max(10, Math.round(r.height * dp));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cv._still = 0; }
  }
  function pAnim(now) {
    pRaf = 0; if (ST.cat !== "punt" || !document.querySelector("#dlg .bq-screen") || document.hidden) return;
    if (now - pLast > 60) {
      pLast = now; const t = now / 1000;
      document.querySelectorAll("#dlg canvas[data-pt]").forEach(cv => { pFit(cv); if (cv._still) return; const [s, id] = cv.dataset.pt.split(":"); PU().thumb(cv, s, id, t); if (s === "pin") cv._still = 1; });
      const big = $("bqPCv"); if (big && ST.psel) { pFit(big); const [s, id] = ST.psel.split(":"); if (!(s === "pin" && big._still === ST.psel)) { PU().thumb(big, s, id, t, true); if (s === "pin") big._still = ST.psel; } }
    }
    pRaf = requestAnimationFrame(pAnim);
  }
  const pStart = () => { if (!pRaf) pRaf = requestAnimationFrame(pAnim); };
  /* comprar un puntero: como la ropa (dos pulsaciones, premio, monedero que baja) y queda puesto */
  function pBuy(k) {
    if (ST.busy || !k) return;
    const [s, id] = k.split(":"); if (PU().owned(s, id)) return;
    const have = A.club ? A.club.fichas() : 0, p = PU().price(s, id);
    if (have < p) { if (A.sfx && A.sfx.buzz) A.sfx.buzz(0); const b = $("bqBuy"); if (b) { b.classList.remove("bq-no"); void b.offsetWidth; b.classList.add("bq-no"); } return; }
    if (ST.armed !== k) { ST.armed = k; ST.armT = Date.now(); if (A.sfx && A.sfx.ui) A.sfx.ui(); repaint("#bqBuy"); setTimeout(() => { if (ST.armed === k && Date.now() - ST.armT >= 3900) { ST.armed = null; repaint(); } }, 4000); return; }
    ST.armed = null;
    if (!PU().buy(s, id)) return;
    repaint("#bqPTry");
    { const w0 = $("bqWal"); if (w0) w0.textContent = A.fmt(have); }
    if (A.casa && A.casa.premio) A.casa.premio(2); else if (A.sfx && A.sfx.jackpot) A.sfx.jackpot(2);
    if (A.sfx && A.sfx.stamp) setTimeout(() => A.sfx.stamp(), 120);
    if (A.haptic) A.haptic([24]);
    const w = $("bqWal"), to = A.club.fichas(), n = 10;
    for (let i = 1; i <= n; i++) setTimeout(() => { if (w && w.isConnected) w.textContent = A.fmt(Math.round(have + ((to - have) * i) / n)); if (i % 3 === 0 && A.sfx && A.sfx.coin) A.sfx.coin(); }, 160 + i * 55);
    const card = document.querySelector(`#dlg .bq-pit[data-pid="${k}"]`), det = $("bqDet");
    if (card) card.classList.add("bq-sold"); if (det) det.classList.add("bq-sold");
  }
  /* «Probar en el mapa»: la tienda se aparta, el reticulo sale en el mapa de verdad y cada clic deja tu chincheta, la linea hasta el centro
     y, si lo clavas, la diana. Se vuelve con el boton o con Esc */
  function pTryOn() {
    if (ST.ptry || ST.busy || !ST.psel) return;
    const map = C().map; if (!map || !map.screenToLonLat || !map.setMarks) return;
    const [s, id] = ST.psel.split(":"); PU().tryOn(s, id);
    const drift = !!map.drift; if (map.stopDrift) map.stopDrift();   // el mapa de la portada va a la deriva: quieto, para que el lugar siga en el centro
    const tgt = map.screenToLonLat(map.W / 2, map.H / 2);
    ST.ptry = { onPick: map.onPick, pick: map.pickEnabled, drift };
    document.body.classList.add("bq-try"); map.clearMarks(); map.setPick(true);
    /* diana: lo que la partida llama «¡Diana!» (75 km) o, con el mapa lejos, a menos de 30 px del centro (si no, con el mundo entero a la vista
       seria imposible verla) */
    map.onPick = (lon, lat) => { const km = A.geo.haversine(lat, lon, tgt[1], tgt[0]), q = map.lonLatToScreen(lon, lat), px = Math.hypot(q[0] - map.W / 2, q[1] - map.H / 2); map.setMarks({ guess: [lon, lat], answer: tgt, dist: km >= 1 ? A.fmtDist(km) : "", bull: km <= 75 || px <= 30 }); if (A.sfx && A.sfx.pin) A.sfx.pin(); };
    if (A.sfx && A.sfx.card) A.sfx.card();
    const lab = document.createElement("div"); lab.className = "bq-tryl"; lab.id = "bqTryL";
    lab.innerHTML = `<div class="gx-paper"><span class="bq-tryt"><b>${esc(P6(TX.trying).replace("{m}", PU().name(s, id)))}</b><i>${esc(P6(PX.hint))}</i></span><button type="button" class="gx-btn sm" id="bqTryBack"><span>${esc(P6(TX.tryBack))}</span>${A.gala.keyHint("Esc", "b")}</button></div>`;
    document.body.appendChild(lab);
    $("bqTryBack").onclick = () => pTryOff();
  }
  function pTryOff(quiet) {
    if (!ST.ptry) return;
    const map = C().map, o = ST.ptry; ST.ptry = null;
    if (map) { map.onPick = o.onPick; map.setPick(o.pick); map.clearMarks(); if (o.drift && !map.drift && !map.anim) map.drift = { base: { ...map.view }, t0: performance.now() }; }
    PU().tryOff(); document.body.classList.remove("bq-try");
    const l = $("bqTryL"); if (l) l.remove();
    if (!quiet) { if (A.sfx && A.sfx.card) A.sfx.card(); const f = $("bqPTry"); if (f) f.focus({ preventScroll: true }); }
  }

  /* pintar solo lo que cambia (la rejilla, la ficha y la oferta), conservando el foco */
  function repaint(focusSel) {
    const g = $("bqGrid"), d = $("bqDet"); if (!g || !d) return;
    const fid = document.activeElement && document.activeElement.id, fdata = document.activeElement && document.activeElement.dataset;
    if (ST.cat === "vest") { g.innerHTML = vGridHtml(); d.innerHTML = vDetHtml(); vPaint(); }
    else if (ST.cat === "punt") { g.innerHTML = pGridHtml(); d.innerHTML = pDetHtml(); pStart(); }
    else { g.innerHTML = gridHtml(); d.innerHTML = detHtml(); const of = document.querySelector("#dlg .bq-offer"); if (of) of.outerHTML = offerHtml(); }
    const w = $("bqWal"); if (w && A.club) w.textContent = A.fmt(A.club.fichas());
    wireInner();
    let f = null;
    if (focusSel) f = document.querySelector(focusSel);
    else if (fid) f = $(fid);
    else if (fdata && fdata.id) f = document.querySelector(`#dlg .bq-it[data-id="${fdata.id}"]`);
    else if (fdata && fdata.tab) f = document.querySelector(`#dlg .bq-tab[data-tab="${fdata.tab}"]`);
    else if (fdata && fdata.vid) f = document.querySelector(`#dlg .bq-vit[data-vid="${fdata.vid}"]`);
    else if (fdata && fdata.vtab) f = document.querySelector(`#dlg .bq-vtab[data-vtab="${fdata.vtab}"]`);
    else if (fdata && fdata.pid) f = document.querySelector(`#dlg .bq-pit[data-pid="${fdata.pid}"]`);
    else if (fdata && fdata.ptab) f = document.querySelector(`#dlg .bq-ptab[data-ptab="${fdata.ptab}"]`);
    if (f && !f.disabled) f.focus({ preventScroll: true });
  }
  function pick(id, focus) {
    if (!id || ST.busy) return;
    if (id !== ST.sel) { ST.sel = id; ST.armed = null; if (A.sfx && A.sfx.card) A.sfx.card(); }
    repaint(focus || `#dlg .bq-it[data-id="${id}"]`);
  }
  function wireInner() {
    const sc = document.querySelector("#dlg .bq-screen"); if (!sc) return;
    sc.querySelectorAll(".bq-it:not(.bq-vit), .bq-offer").forEach(b => { b.onclick = () => pick(b.dataset.id, b.classList.contains("bq-offer") ? "#dlg .bq-offer" : null); });
    sc.querySelectorAll(".bq-tab:not(.bq-vtab)").forEach(b => { b.onclick = () => { if (ST.tab === b.dataset.tab) return; ST.tab = b.dataset.tab; ST.page = 0; if (A.sfx && A.sfx.card) A.sfx.card(); repaint(`#dlg .bq-tab[data-tab="${ST.tab}"]`); }; });
    const pv = $("bqPrev"), nx = $("bqNext");
    if (pv) pv.onclick = () => { if (ST.page > 0) { ST.page--; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqPrev:not([disabled]), #bqNext"); } };
    if (nx) nx.onclick = () => { ST.page++; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqNext:not([disabled]), #bqPrev"); };
    const tr = $("bqTry"); if (tr) tr.onclick = () => tryOn(ST.sel);
    const us = $("bqUse"); if (us) us.onclick = () => { if (M().use(ST.sel)) { if (A.sfx && A.sfx.stamp) A.sfx.stamp(); if (A.haptic) A.haptic([14]); repaint("#bqTry"); } };
    const bu = $("bqBuy"); if (bu) bu.onclick = () => (ST.cat === "vest" ? vBuy(ST.vsel) : ST.cat === "punt" ? pBuy(ST.psel) : buy(ST.sel));
    sc.querySelectorAll(".bq-pit").forEach(b => { b.onclick = () => { const k = b.dataset.pid; if (ST.busy) return; if (k !== ST.psel) { ST.psel = k; ST.armed = null; if (A.sfx && A.sfx.card) A.sfx.card(); } repaint(`#dlg .bq-pit[data-pid="${k}"]`); }; });
    sc.querySelectorAll(".bq-ptab").forEach(b => { b.onclick = () => { if (ST.ptab === b.dataset.ptab) return; ST.ptab = b.dataset.ptab; ST.ppage = 0; const L = pOf(ST.ptab); if (L.length && !L.some(x => x.join(":") === ST.psel)) ST.psel = L[0].join(":"); if (A.sfx && A.sfx.card) A.sfx.card(); repaint(`#dlg .bq-ptab[data-ptab="${ST.ptab}"]`); }; });
    const pp = $("bqPPrev"), pn = $("bqPNext");
    if (pp) pp.onclick = () => { if (ST.ppage > 0) { ST.ppage--; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqPPrev:not([disabled]), #bqPNext"); } };
    if (pn) pn.onclick = () => { ST.ppage++; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqPNext:not([disabled]), #bqPPrev"); };
    const pu = $("bqPUse"); if (pu) pu.onclick = () => { const [s, id] = ST.psel.split(":"); if (!PU().wear(s, id)) return; if (A.sfx && A.sfx.stamp) A.sfx.stamp(); if (A.haptic) A.haptic([14]); repaint("#bqPTry"); };
    const ptb = $("bqPTry"); if (ptb) ptb.onclick = pTryOn;
    sc.querySelectorAll(".bq-vit").forEach(b => { b.onclick = () => { const id = b.dataset.vid; if (ST.busy) return; if (id !== ST.vsel) { ST.vsel = id; ST.armed = null; if (A.sfx && A.sfx.card) A.sfx.card(); } repaint(`#dlg .bq-vit[data-vid="${id}"]`); }; });
    sc.querySelectorAll(".bq-vtab").forEach(b => { b.onclick = () => { if (ST.vtab === b.dataset.vtab) return; ST.vtab = b.dataset.vtab; ST.vpage = 0; if (A.sfx && A.sfx.card) A.sfx.card(); repaint(`#dlg .bq-vtab[data-vtab="${ST.vtab}"]`); }; });
    const vp = $("bqVPrev"), vn = $("bqVNext");
    if (vp) vp.onclick = () => { if (ST.vpage > 0) { ST.vpage--; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqVPrev:not([disabled]), #bqVNext"); } };
    if (vn) vn.onclick = () => { ST.vpage++; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqVNext:not([disabled]), #bqVPrev"); };
    const we = $("bqWear"); if (we) we.onclick = () => { if (!V().wear(ST.vsel)) return; if (A.sfx && A.sfx.stamp) A.sfx.stamp(); if (A.haptic) A.haptic([14]); repaint("#bqOff"); if (ST.spr) ST.spr.play("preen"); };
    const ofb = $("bqOff"); if (ofb) ofb.onclick = () => { V().takeOff(ST.vsel); if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqWear"); };
  }
  /* las pestañas de la cabecera caben siempre: si en un idioma no caben, primero se aprietan y despues las que no estan puestas se quedan en su
     icono (el nombre sigue en title y aria-label) */
  function fitCats() {
    const n = document.querySelector("#dlg .bq-cats"); if (!n) return;
    n.classList.remove("t1", "t2");
    for (const c of ["t1", "t2"]) { if (n.scrollWidth <= n.clientWidth + 1) break; n.classList.add(c); }
  }
  /* cambiar de seccion: solo cambian la izquierda y la derecha (la cabecera se queda); el vestuario espera a tener su atlas listo */
  function setCat(k) {
    if (k === ST.cat || ST.busy || (k === "vest" && !V()) || (k === "punt" && !PU())) return;
    const go = () => {
      if (!$("bqCat")) return;
      if (ST.trying) tryOff(true);
      ST.cat = k; ST.armed = null; if (A.sfx && A.sfx.card) A.sfx.card();
      if (k !== "vest") dropProb();
      document.querySelectorAll("#dlg .bq-cat-t").forEach(b => { const on = b.dataset.cat === k; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
      const ca = $("bqCat"), d = $("bqDet");
      ca.classList.toggle("vest", k === "vest"); d.classList.toggle("vest", k === "vest"); ca.classList.toggle("punt", k === "punt"); d.classList.toggle("punt", k === "punt");
      if (k === "punt" && !ST.psel) ST.psel = (pOf("ret").find(([s, id]) => !PU().owned(s, id)) || ["ret", "casa"]).join(":");
      ca.innerHTML = catBody(); d.innerHTML = k === "vest" ? vDetHtml() : k === "punt" ? pDetHtml() : detHtml();
      wireInner(); if (k === "vest") vPaint(); if (k === "punt") pStart();
      fitCats();
      const f = document.querySelector(`#dlg .bq-cat-t[data-cat="${k}"]`); if (f) f.focus({ preventScroll: true });
    };
    if (k === "vest") { if (!ST.vsel) ST.vsel = (vOf(ST.vtab).find(i => !V().owned(i.id)) || vOf(ST.vtab)[0]).id; V().ready(go); } else go();
  }
  /* comprar ropa: como una mesa (dos pulsaciones, premio, monedero que baja), pero te quedas en la boutique: se la pone al momento y se luce */
  function vBuy(id) {
    if (ST.busy || !id || V().owned(id)) return;
    const have = A.club ? A.club.fichas() : 0, p = V().price(id);
    if (have < p) { if (A.sfx && A.sfx.buzz) A.sfx.buzz(0); const b = $("bqBuy"); if (b) { b.classList.remove("bq-no"); void b.offsetWidth; b.classList.add("bq-no"); } return; }
    if (ST.armed !== id) { ST.armed = id; ST.armT = Date.now(); if (A.sfx && A.sfx.ui) A.sfx.ui(); repaint("#bqBuy"); setTimeout(() => { if (ST.armed === id && Date.now() - ST.armT >= 3900) { ST.armed = null; repaint(); } }, 4000); return; }
    ST.armed = null;
    if (!V().buy(id)) return;
    const leg = V().get(id).r === "l";
    repaint("#bqOff");
    { const w0 = $("bqWal"); if (w0) w0.textContent = A.fmt(have); }
    if (A.casa && A.casa.premio) A.casa.premio(leg ? 3 : 2); else if (A.sfx && A.sfx.jackpot) A.sfx.jackpot(leg ? 3 : 2);
    if (A.sfx && A.sfx.stamp) setTimeout(() => A.sfx.stamp(), 120);
    if (A.haptic) A.haptic(leg ? [30, 60, 40] : [24]);
    const w = $("bqWal"), to = A.club.fichas(), n = 10;
    for (let i = 1; i <= n; i++) setTimeout(() => { if (w && w.isConnected) w.textContent = A.fmt(Math.round(have + ((to - have) * i) / n)); if (i % 3 === 0 && A.sfx && A.sfx.coin) A.sfx.coin(); }, 160 + i * 55);
    const card = document.querySelector(`#dlg .bq-vit[data-vid="${id}"]`), det = $("bqDet");
    if (card) card.classList.add("bq-sold"); if (det) det.classList.add("bq-sold");
    setTimeout(() => { if (ST.spr) ST.spr.play("preen"); }, 260);
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
    if (ST.ptry && e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); pTryOff(); return; }
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
    if (id || !V()) ST.cat = "mesas";                                   // desde Perfil > Mesas se abre en las mesas
    if (ST.cat === "vest" && !ST.vsel) ST.vsel = vOf(ST.vtab)[0].id;
    if (ST.cat === "punt" && (!PU() || !ST.psel)) { if (!PU()) ST.cat = "mesas"; else ST.psel = "ret:casa"; }
    const draw = () => {
      c.dialog(html(), "tablewrap");
      A.hub.wireTools(); $("hubBack").onclick = () => { if (A.sfx && A.sfx.ui) A.sfx.ui(); A.hub.screen("home"); };
      document.querySelectorAll("#dlg .bq-cat-t").forEach(b => { b.onclick = () => setCat(b.dataset.cat); });
      wireInner(); if (ST.cat === "vest") vPaint(); if (ST.cat === "punt") pStart();
      fitCats(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCats);
      setTimeout(() => { const f = ST.cat === "vest" ? document.querySelector(`#dlg .bq-vit[data-vid="${ST.vsel}"]`) : ST.cat === "punt" ? document.querySelector(`#dlg .bq-pit[data-pid="${ST.psel}"]`) : document.querySelector(`#dlg .bq-it[data-id="${ST.sel}"]`) || document.querySelector("#dlg .bq-offer") || $("bqTry"); if (f) f.focus({ preventScroll: true }); }, 80);
    };
    if (ST.cat === "vest") V().ready(draw); else draw();
  }
  /* si se sale de la boutique a mitad de una prueba, el mapa vuelve a tu mesa */
  const leave = () => { if (ST.trying) tryOff(true); if (ST.ptry) pTryOff(true); ST.armed = null; dropProb(); };

  A.boutique = { open, leave, want: id => { ST.next = id; }, cat: k => { ST.cat = k; }, get trying() { return ST.trying; } };
})(window.AIQ);
