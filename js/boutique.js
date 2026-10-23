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
      gafas: "Pieza|Piece|Pièce|Peça|Extra|Pezzo||饰品|소품|小物|Аксессуар|Dodatek",
      cristal: "Pieza|Piece|Pièce|Peça|Extra|Pezzo||饰品|소품|小物|Аксессуар|Dodatek",
      chistera: "Chistera|Top hat|Haut-de-forme|Cartola|Zylinder|Cilindro||礼帽|실크해트|シルクハット|Цилиндр|Cylinder",
    },
    wear: "Ponértelo|Put it on|Le mettre|Vestir|Anziehen|Indossalo||穿上|착용하기|着る|Надеть|Załóż",
    off: "Quitártelo|Take it off|L'enlever|Tirar|Ausziehen|Toglilo||脱下|벗기|脱ぐ|Снять|Zdejmij",
    empty: "Aún no tienes ropa del vestuario. Cada nivel del Club te paga fichas de oro.|You don't have anything from the wardrobe yet. Every Club level pays you gold chips.|Tu n'as encore rien de la garde-robe. Chaque niveau du Club te paie en jetons d'or.|Você ainda não tem nada do guarda-roupa. Cada nível do Clube paga fichas de ouro.|Du hast noch nichts aus der Garderobe. Jede Club-Stufe zahlt dir Goldchips.|Non hai ancora niente del guardaroba. Ogni livello del Club ti paga in fiche d'oro.||你还没有衣橱里的衣服。俱乐部每升一级都付你金筹码。|아직 의상실 옷이 없어요. 클럽 레벨마다 골드 칩을 받아요.|衣装はまだ何もない。クラブのレベルが上がるたびに金のチップがもらえる。|Из гардероба пока ничего нет. Каждый уровень клуба платит золотыми фишками.|Nie masz jeszcze nic z garderoby. Każdy poziom klubu płaci złotymi żetonami.",
    prob: "Probador|Fitting room|Cabine d'essayage|Provador|Umkleide|Camerino||试衣间|피팅룸|試着室|Примерочная|Przymierzalnia",
  };
  const TRY_MS = 7000;
  /* v0.3.177: cuantas caben por pagina segun el alto del lienzo de diseno (a 1280x720 o 1920x1080 sobran menos filas que en la Deck 1280x800) */
  const short = () => { const k = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--k")) || 1; return innerHeight / k < 760; };
  const PERM = () => (short() ? 9 : 12), PERV = () => 8, PERP = () => (short() ? 6 : 9), PERC = () => 8;
  const ST = { sel: null, tab: "all", page: 0, armed: null, armT: 0, trying: null, tryT: 0, busy: false, next: null, cat: "mesas", vsel: null, vtab: "traje", vpage: 0, spr: null, psel: null, ptab: "ret", ppage: 0, ptry: null, csel: null, ctab: "carta", hsel: null, htick: 0, cpage: 0 };
  /* Bloque J: el vestidor (la tienda es tambien el vestuario) */
  const RX = {
    crup: "Crupier|Dealer|Croupier|Crupiê|Croupier|Croupier||荷官|딜러|ディーラー|Крупье|Krupier",
    worn: "Puesta: {x}|Wearing: {x}|En place : {x}|Em uso: {x}|Aktiv: {x}|In uso: {x}||使用中：{x}|사용 중: {x}|使用中：{x}|Сейчас: {x}|Teraz: {x}",
    tro: "De trofeo|Trophy|Trophée|Troféu|Trophäe|Trofeo||奖杯|트로피|トロフィー|Трофей|Trofeum",
    tierT: "Mesa de trofeo|Trophy table|Table trophée|Mesa de troféu|Trophäentisch|Tavolo trofeo||奖杯牌桌|트로피 테이블|トロフィーテーブル|Трофейный стол|Stół trofeum",
    ponerla: "Poner en el mapa|Put it on the map|La mettre sur la carte|Pôr no mapa|Auf die Karte legen|Mettila sulla mappa||放到地图上|지도에 놓기|マップに置く|Поставить на карту|Połóż na mapie",
    stamp: "Puesta|On|Posée|Em uso|Aktiv|In uso||已用|적용|使用中|Выбрано|Użyte",
  };
  const V = () => A.vestuario;
  const fi = (cls = "") => `<img class="bq-fi${cls ? " " + cls : ""}" src="assets/icons/ficha_oro.webp" alt="">`;
  const M = () => A.mesas;
  const list = () => {
    const all = M().list;
    return ST.tab === "t" ? all.filter(m => !m.shop) : ST.tab === "r" ? all.filter(m => m.shop === "r") : ST.tab === "l" ? all.filter(m => m.shop === "l") : ST.tab === "mine" ? all.filter(m => M().owned(m.id)) : all;
  };
  const priceHtml = (id, big) => {
    const p = M().price(id), f = M().full(id);
    return `<span class="bq-pr${big ? " big" : ""}">${p < f ? `<s>${A.fmt(f)}</s>` : ""}${fi()}<b>${A.fmt(p)}</b></span>`;
  };
  const state = id => (id === M().current() ? "on" : M().owned(id) ? "got" : "");
  const trofeo = id => !M().get(id).shop;                                  // las 6 que se ganan jugando

  function item(m) {
    const s = state(m.id), lk = trofeo(m.id) && !s;
    return `<button type="button" class="bq-it${m.id === ST.sel ? " sel" : ""}${s ? " " + s : ""}${m.shop === "l" ? " leg" : ""}${lk ? " lk" : ""}" data-id="${m.id}" aria-pressed="${m.id === ST.sel}">
      <span class="bq-th"><img src="assets/mesas/${m.id}.webp" alt="" width="640" height="360" decoding="async">${s === "on" ? `<em class="bq-own on">${esc(P6(RX.stamp))}</em>` : lk ? `<em class="bq-own lkt">${A.icon("lock")}<span>${esc(P6(RX.tro))}</span></em>` : ""}</span>
      <span class="bq-prow"><b class="bq-nm">${esc(M().name(m.id))}</b>${s || lk ? "" : priceHtml(m.id)}</span></button>`;
  }
  /* la oferta de la casa, al pie del indice (siempre a la vista): una mesa que aun no tienes, -30 %, hasta el lunes */
  function offerHtml() {
    const o = M().offer(); if (!o) return "";
    const got = M().owned(o.id);
    return `<button type="button" class="bq-offer${o.id === ST.sel && ST.cat === "mesas" ? " sel" : ""}" data-id="${o.id}"><span class="gx-eyb">${esc(P6(TX.offer))} · ${esc(P6(TX.till))}</span><img class="bq-oth" src="assets/mesas/${o.id}.webp" alt="">
      <span class="bq-otx"><b>${esc(M().name(o.id))}${got ? "" : `<i>−${Math.round(o.off * 100)} %</i>`}</b>${got ? `<em class="bq-own">${esc(P6(TX.bought))}</em>` : priceHtml(o.id)}</span></button>`;
  }
  function detHtml() {
    const id = ST.sel, s = state(id), have = A.club ? A.club.fichas() : 0, p = M().price(id);
    const leg = M().tier(id) === "l", tro = trofeo(id), got = M().owned(id);
    let act;
    if (s === "on") act = `<button type="button" class="gx-btn wide" id="bqUse" disabled><span>${esc(P6(TX.using))}</span></button>`;
    else if (s === "got") act = `<button type="button" class="gx-btn pri wide" id="bqUse"><span>${esc(P6(RX.ponerla))}</span></button>`;
    else if (tro) act = `<button type="button" class="gx-btn wide" disabled>${A.icon("lock")}<span>${esc(P6(CX.kHito))}</span></button>`;
    else if (have < p) act = `<button type="button" class="gx-btn wide bq-short" id="bqBuy" aria-disabled="true"><span>${esc(P6(TX.short).replace("{n}", A.fmt(p - have)))}</span>${fi("sm")}</button>`;
    else act = `<button type="button" class="gx-btn pri wide${ST.armed === id ? " armed" : ""}" id="bqBuy"><span>${esc(ST.armed === id ? P6(TX.sure) : P6(TX.buy))}</span><span class="bq-bp">${fi("sm")}${A.fmt(p)}</span></button>`;
    const tryBtn = tro && !got ? "" : `<button type="button" class="gx-btn gho wide" id="bqTry"><span>${esc(P6(TX.try))}</span></button>`;
    return `<span class="bq-dth${leg ? " leg" : ""}${tro && !got ? " lk" : ""}"><img src="assets/mesas/${id}.webp" alt="" width="640" height="360" decoding="async"></span>
      <span class="gx-eyb bq-tier">${esc(P6(tro ? RX.tierT : leg ? TX.tierL : TX.tierR))}</span>
      <h3 class="gx-t-m bq-dn">${esc(M().name(id))}</h3>
      <p class="bq-dd">${esc(tro && !got ? M().how(id) : M().desc(id))}</p>
      ${s || tro ? "" : `<div class="bq-dp">${priceHtml(id, true)}</div>`}
      <div class="bq-acts">${tryBtn}${act}</div>`;
  }
  function gridHtml() {
    const L = list(), per = PERM(), pages = Math.max(1, Math.ceil(L.length / per)); ST.page = Math.min(ST.page, pages - 1);
    const items = L.slice(ST.page * per, ST.page * per + per);
    const all = M().list, n = k => k === "all" ? all.length : k === "t" ? all.filter(m => !m.shop).length : k === "r" ? all.filter(m => m.shop === "r").length : k === "l" ? all.filter(m => m.shop === "l").length : all.filter(m => M().owned(m.id)).length;
    const tab = (k, tx) => `<button type="button" class="bq-tab${ST.tab === k ? " on" : ""}" data-tab="${k}" aria-pressed="${ST.tab === k}"><span>${esc(P6(tx))}</span><i>${n(k)}</i></button>`;
    return `<div class="bq-bar"><nav class="bq-tabs" id="bqTabs">${tab("all", TX.all)}${tab("t", RX.tro)}${tab("r", TX.rare)}${tab("l", TX.leg)}${tab("mine", TX.mine)}</nav>
      <div class="bq-pager"${pages > 1 ? "" : " hidden"}><button type="button" class="gx-btn sm gho" id="bqPrev"${ST.page ? "" : " disabled"} aria-label="‹">‹</button><span>${ST.page + 1} / ${pages}</span><button type="button" class="gx-btn sm gho" id="bqNext"${ST.page < pages - 1 ? "" : " disabled"} aria-label="›">›</button></div></div>
      <div class="bq-items" id="bqItems">${items.length ? items.map(item).join("") : `<p class="bq-empty">${esc(P6(TX.empty))}</p>`}</div>`;
  }
  /* el indice de la izquierda: las cuatro secciones, con su nombre siempre a la vista, lo que tienes y lo que llevas puesto */
  function stat(k) {
    if (k === "hoy") { const T = ES().today(); return [T.slots.filter(x => !ES().owned(x)).length, T.slots.length, P6(HX.change).replace("{t}", hms(T.until))]; }
    if (k === "mesas") return [M().count(), M().list.length, M().name(M().current())];
    if (k === "vest") { const it = V().items, w = it.find(i => i.slot === "traje" && V().wearing(i.id)); return [it.filter(i => V().owned(i.id)).length, it.length, w ? V().name(w.id) : ""]; }
    if (k === "punt") { let n = 0, t = 0; PU().SLOTS.forEach(s => PU().list(s).forEach(id => { t++; if (PU().owned(s, id)) n++; })); return [n, t, PU().name("ret", PU().current("ret"))]; }
    const l = SO().icons().filter(x => x.kind !== "logro").concat(SO().titles(), SO().marcos()); return [l.filter(x => x.owned).length, l.length, SO().iconName(SO().icon())];   // lo de la tienda y de la casa; los iconos de logro se ganan solos
  }

  /* ---------------------------------------------------------------- HOY: el escaparate del dia (js/escaparate.js). Seis piezas que aun no tienes,
     una de ellas en ganga; debajo, el lote de tres y el regalo de la casa. A la derecha, la pieza elegida con su precio de hoy, «Lo quiero» y
     el atajo a su seccion. Comprar aqui es la compra de su seccion (cobra el precio de hoy y te la pone) */
  const HX = {
    cHoy: "Hoy|Today|Aujourd'hui|Hoje|Heute|Oggi||今日|오늘|今日|Сегодня|Dziś",
    title: "Escaparate de hoy|Today's showcase|La vitrine du jour|Vitrine de hoje|Heutiges Schaufenster|La vetrina di oggi||今日橱窗|오늘의 진열장|今日のショーケース|Витрина дня|Witryna dnia",
    change: "Cambia en {t}|Changes in {t}|Change dans {t}|Muda em {t}|Wechselt in {t}|Cambia tra {t}||{t} 后更换|{t} 후 교체|{t}後に入れ替え|Сменится через {t}|Zmiana za {t}",
    ganga: "Ganga −{p} %|Bargain −{p} %|Affaire −{p} %|Pechincha −{p} %|Schnäppchen −{p} %|Affare −{p} %||特价 −{p}%|특가 −{p}%|お買い得 −{p}%|Выгода −{p} %|Okazja −{p}%",
    surprise: "Sorpresa|Surprise|Surprise|Surpresa|Überraschung|Sorpresa||惊喜|서프라이즈|サプライズ|Сюрприз|Niespodzianka",
    lote: "Lote de tres|Bundle of three|Lot de trois|Kit de três|Dreierpaket|Lotto da tre||三件套|3종 세트|3点セット|Набор из трёх|Zestaw trzech",
    loteD: "Las tres juntas, −25 %. Dura {n} días más.|All three together, −25 %. {n} more days.|Les trois ensemble, −25 %. Encore {n} jours.|As três juntas, −25 %. Mais {n} dias.|Alle drei zusammen, −25 %. Noch {n} Tage.|Tutti e tre insieme, −25 %. Ancora {n} giorni.||三件一起买 −25%。还剩 {n} 天。|셋 함께 −25%. {n}일 남았어요.|3点まとめて −25%。あと{n}日。|Все три вместе — −25 %. Ещё дней: {n}.|Wszystkie trzy razem −25%. Jeszcze dni: {n}.",
    loteLast: "Las tres juntas, −25 %. Último día.|All three together, −25 %. Last day.|Les trois ensemble, −25 %. Dernier jour.|As três juntas, −25 %. Último dia.|Alle drei zusammen, −25 %. Letzter Tag.|Tutti e tre insieme, −25 %. Ultimo giorno.||三件一起买 −25%。最后一天。|셋 함께 −25%. 마지막 날.|3点まとめて −25%。最終日。|Все три вместе — −25 %. Последний день.|Wszystkie trzy razem −25%. Ostatni dzień.",
    loteDone: "Ya tienes las tres. Mañana o pasado llega otro lote.|You already have all three. Another bundle arrives soon.|Tu as déjà les trois. Un autre lot arrive bientôt.|Você já tem as três. Logo chega outro kit.|Du hast schon alle drei. Bald kommt ein neues Paket.|Hai già tutti e tre. Presto arriva un altro lotto.||三件你都有了。很快会有新的套装。|이미 셋 다 있어요. 곧 새 세트가 와요.|3点とも持っている。もうすぐ次のセットが来る。|У тебя уже все три. Скоро будет новый набор.|Masz już wszystkie trzy. Wkrótce nowy zestaw.",
    gift: "Regalo de la casa|House gift|Cadeau de la maison|Presente da casa|Geschenk des Hauses|Regalo della casa||本店赠礼|하우스 선물|ハウスの贈り物|Подарок заведения|Prezent od kasyna",
    giftD: "Gratis cada día. Se guarda 3 días: si no vienes, te espera.|Free every day. It keeps for 3 days: if you don't come, it waits.|Gratuit chaque jour. Il se garde 3 jours : si tu ne viens pas, il t'attend.|Grátis todo dia. Fica guardado 3 dias: se você não vier, ele espera.|Jeden Tag gratis. Hält 3 Tage: Wenn du nicht kommst, wartet es.|Gratis ogni giorno. Si conserva 3 giorni: se non vieni, ti aspetta.||每天免费。保留 3 天：你没来，它会等你。|매일 무료. 3일 동안 보관돼요. 안 와도 기다려요.|毎日無料。3日間取っておける。来なくても待っている。|Каждый день бесплатно. Хранится 3 дня: не придёшь — подождёт.|Codziennie za darmo. Czeka 3 dni: jeśli nie przyjdziesz, poczeka.",
    claim: "Recoger|Collect|Récupérer|Pegar|Abholen|Ritira||领取|받기|受け取る|Забрать|Odbierz",
    claimed: "Recogido: vuelve mañana|Collected: come back tomorrow|Récupéré : reviens demain|Recebido: volte amanhã|Abgeholt: komm morgen wieder|Ritirato: torna domani||已领取：明天再来|받았어요: 내일 또 와요|受け取り済み：また明日|Получено: приходи завтра|Odebrane: wróć jutro",
    days: "{n} días guardados|{n} days saved up|{n} jours en réserve|{n} dias guardados|{n} Tage aufgespart|{n} giorni messi da parte||攒了 {n} 天|{n}일치 보관 중|{n}日分たまっている|Накоплено дней: {n}|Odłożone dni: {n}",
    bought: "Comprado|Bought|Acheté|Comprado|Gekauft|Comprato||已购买|구매함|購入済み|Куплено|Kupione",
    want: "Lo quiero|I want it|Je le veux|Quero|Will ich|Lo voglio||想要|갖고 싶어|欲しい|Хочу|Chcę",
    wanted: "En tu lista de deseos|On your wish list|Dans ta liste d'envies|Na sua lista de desejos|Auf deiner Wunschliste|Nella tua lista dei desideri||已在愿望单|위시리스트에 있음|欲しい物リスト入り|В списке желаний|Na liście życzeń",
    wantT: "Si sale en el escaparate, en el lote o en la oferta de la semana, la placa de La tienda de la portada te avisa con un punto.|If it shows up in the showcase, the bundle or the weekly offer, the boutique plaque on the main screen shows a dot.|S'il apparaît dans la vitrine, le lot ou l'offre de la semaine, la plaque de la boutique de l'écran d'accueil t'avertit d'un point.|Se aparecer na vitrine, no kit ou na oferta da semana, a placa da boutique na tela inicial avisa com um ponto.|Taucht es im Schaufenster, im Paket oder im Wochenangebot auf, zeigt die Boutique-Plakette auf dem Startbildschirm einen Punkt.|Se compare nella vetrina, nel lotto o nell'offerta della settimana, la targa della boutique nella schermata iniziale te lo segnala con un punto.||如果它出现在橱窗、套装或本周特价中，主界面的精品店牌子会亮起一个小点。|진열장, 세트, 이번 주 특가에 나오면 메인 화면의 부티크 명판에 점이 떠요.|ショーケースやセット、今週の特売に出たら、メイン画面のブティックの札に点がつく。|Если вещь появится на витрине, в наборе или в предложении недели, на табличке бутика на главном экране загорится точка.|Jeśli pojawi się w witrynie, zestawie lub ofercie tygodnia, tabliczka butiku na ekranie głównym pokaże kropkę.",
    goSec: "Verla en su sección|See it in its section|La voir dans sa section|Ver na seção|In ihrer Abteilung ansehen|Vedila nella sua sezione||在所属分类中查看|해당 코너에서 보기|売り場で見る|Открыть в разделе|Zobacz w dziale",
    todayD: "Hoy en el escaparate. A medianoche cambia, pero nada desaparece: sigue en su sección a su precio de siempre.|In today's showcase. It changes at midnight, but nothing disappears: it stays in its section at its usual price.|Dans la vitrine du jour. Elle change à minuit, mais rien ne disparaît : la pièce reste dans sa section à son prix habituel.|Na vitrine de hoje. Muda à meia-noite, mas nada some: continua na seção pelo preço de sempre.|Im heutigen Schaufenster. Um Mitternacht wechselt es, aber nichts verschwindet: Es bleibt in seiner Abteilung zum üblichen Preis.|Nella vetrina di oggi. Cambia a mezzanotte, ma niente sparisce: resta nella sua sezione al prezzo di sempre.||今日橱窗展品。午夜更换，但不会消失：它仍以原价留在所属分类里。|오늘의 진열장 상품. 자정에 바뀌지만 사라지진 않아요. 원래 코너에 원래 가격으로 남아요.|今日のショーケース。真夜中に入れ替わるが、消えはしない。いつもの値段で売り場に残る。|На витрине сегодня. В полночь витрина сменится, но ничего не пропадёт: вещь останется в своём разделе по обычной цене.|W dzisiejszej witrynie. O północy się zmienia, ale nic nie znika: zostaje w swoim dziale w zwykłej cenie.",
    k: { m: "Mesa|Table|Table|Mesa|Tisch|Tavolo||牌桌|테이블|テーブル|Стол|Stół", v: "Prenda del crupier|Dealer's outfit|Tenue du croupier|Roupa do crupiê|Croupier-Outfit|Abito del croupier||荷官服饰|딜러 의상|ディーラーの衣装|Одежда крупье|Strój krupiera", p: "Puntero|Pointer|Pointeur|Ponteiro|Zeiger|Puntatore||指针|포인터|ポインター|Указатель|Wskaźnik", i: "Icono|Icon|Icône|Ícone|Symbol|Icona||图标|아이콘|アイコン|Значок|Ikona", t: "Título|Title|Titre|Título|Titel|Titolo||称号|칭호|称号|Титул|Tytuł", k: "Marco|Frame|Cadre|Moldura|Rahmen|Cornice||边框|프레임|額縁|Рамка|Ramka" },
  };
  const ES = () => A.escaparate;
  const hms = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(x => String(x).padStart(2, "0")).join(":"); };
  const keyCat = k => ({ m: "mesas", v: "vest", p: "punt", i: "carta", t: "carta", k: "carta" })[ES().kindOf(k)];
  /* la miniatura de una pieza del escaparate: cada seccion con la suya (se pintan en hPaint, a escala entera) */
  function hThumb(k, big) {
    const [w, a, b] = k.split(":");
    if (w === "m") return `<span class="bq-hth m"><img src="assets/mesas/${a}.webp" alt="" decoding="async"></span>`;
    if (w === "v") return `<span class="bq-hth v"><img class="bq-hv" data-hv="${esc(a)}" alt=""></span>`;
    if (w === "p") return `<span class="bq-hth"><canvas data-hp="${esc(a + ":" + b)}"></canvas></span>`;
    if (w === "i") return `<span class="bq-hth"><canvas data-ci="${esc(a)}"></canvas></span>`;
    if (w === "t") return `<span class="bq-hth t"><span class="bq-tplate"><span>${esc(SO().titleName(a))}</span></span></span>`;
    return `<span class="bq-hth"><span class="bq-cbadge" data-cm="${esc(a)}"></span></span>`;
  }
  const hPrice = k => { const f = ES().full(k), p = ES().price(k); return `<span class="bq-pr">${p < f ? `<s>${A.fmt(f)}</s>` : ""}${fi()}<b>${A.fmt(p)}</b></span>`; };
  function hItem(k, i, T) {
    const own = ES().owned(k), g = T.ganga === k && !own;
    return `<button type="button" class="bq-it bq-hit${ST.hsel === k ? " sel" : ""}${own ? " got" : ""}" data-hk="${esc(k)}" aria-pressed="${ST.hsel === k}">
      ${g ? `<em class="bq-ganga">${esc(P6(HX.ganga).replace("{p}", Math.round(ES().GANGA * 100)))}</em>` : i === 5 ? `<em class="bq-sorp">${esc(P6(HX.surprise))}</em>` : ""}${ES().wished(k) && !own ? `<i class="bq-wdot">${A.icon("heart")}</i>` : ""}
      ${hThumb(k)}<span class="bq-hk">${esc(P6(HX.k[ES().kindOf(k)]))}</span><span class="bq-prow"><b class="bq-nm">${esc(ES().name(k))}</b>${own ? `<em class="bq-own">${esc(P6(HX.bought))}</em>` : hPrice(k)}</span></button>`;
  }
  function hGridHtml() {
    const T = ES().today(), lp = ES().lotePrice();
    const lote = `<button type="button" class="bq-it bq-hl${ST.hsel === "lote" ? " sel" : ""}${lp.left.length ? "" : " got"}" data-hk="lote"><span class="bq-hk">${esc(P6(HX.lote))}</span>
      <span class="bq-l3">${T.lote.map(k => `<span class="bq-l1${ES().owned(k) ? " got" : ""}">${hThumb(k)}</span>`).join("")}</span>
      <span class="bq-prow"><b class="bq-nm">${esc(lp.left.length ? P6(T.loteUntil > 1 ? HX.loteD : HX.loteLast).replace("{n}", T.loteUntil) : P6(HX.loteDone))}</b>${lp.left.length ? `<span class="bq-pr"><s>${A.fmt(lp.full)}</s>${fi()}<b>${A.fmt(lp.price)}</b></span>` : ""}</span></button>`;
    const gift = `<button type="button" class="bq-it bq-hg${ST.hsel === "regalo" ? " sel" : ""}${T.gift ? "" : " got"}" data-hk="regalo"><span class="bq-hk">${esc(P6(HX.gift))}</span>
      <span class="bq-gi"><img src="assets/icons/ficha_oro.webp" alt=""><b>${T.gift ? "+" + A.fmt(T.gift) : "✓"}</b></span>
      <span class="bq-nm">${esc(T.gift ? (T.giftDays > 1 ? P6(HX.days).replace("{n}", T.giftDays) : P6(HX.claim)) : P6(HX.claimed))}</span></button>`;
    return `<div class="bq-bar"><b class="gx-t-m bq-hh">${esc(P6(HX.title))}</b><span class="bq-clock">${esc(P6(HX.change).replace("{t}", hms(T.until)))}</span></div>
      <div class="bq-items hoy" id="bqItems">${T.slots.map((k, i) => hItem(k, i, T)).join("")}</div>
      <div class="bq-hrow">${lote}${gift}</div>`;
  }
  function hDetHtml() {
    const T = ES().today(), k = ST.hsel || T.slots[0], have = A.club ? A.club.fichas() : 0;
    if (k === "regalo") {
      return `<span class="bq-dth bq-cprev bq-hgift"><img src="assets/icons/ficha_oro.webp" alt=""></span><span class="gx-eyb bq-tier">${esc(P6(HX.gift))}</span>
        <h3 class="gx-t-m bq-dn">${T.gift ? "+" + A.fmt(T.gift) : esc(P6(HX.claimed))}</h3><p class="bq-dd">${esc(P6(HX.giftD))}</p>
        <div class="bq-acts">${T.gift ? `<button type="button" class="gx-btn pri wide" id="bqGift"><span>${esc(P6(HX.claim))}</span><span class="bq-bp">${fi("sm")}+${A.fmt(T.gift)}</span></button>` : `<button type="button" class="gx-btn wide" disabled><span>${esc(P6(HX.claimed))}</span></button>`}</div>`;
    }
    if (k === "lote") {
      const lp = ES().lotePrice();
      const act = !lp.left.length ? `<button type="button" class="gx-btn wide" disabled><span>${esc(P6(HX.bought))}</span></button>`
        : have < lp.price ? `<button type="button" class="gx-btn wide bq-short" id="bqHBuy" aria-disabled="true"><span>${esc(P6(TX.short).replace("{n}", A.fmt(lp.price - have)))}</span>${fi("sm")}</button>`
        : `<button type="button" class="gx-btn pri wide${ST.armed === "lote" ? " armed" : ""}" id="bqHBuy"><span>${esc(ST.armed === "lote" ? P6(TX.sure) : P6(TX.buy))}</span><span class="bq-bp">${fi("sm")}${A.fmt(lp.price)}</span></button>`;
      return `<span class="bq-dth bq-cprev bq-hlote">${T.lote.map(x => `<span class="bq-l1${ES().owned(x) ? " got" : ""}">${hThumb(x)}</span>`).join("")}</span><span class="gx-eyb bq-tier">${esc(P6(HX.lote))}</span>
        <ul class="bq-lul">${T.lote.map(x => `<li${ES().owned(x) ? ` class="got"` : ""}><span>${esc(ES().name(x))}</span><b>${ES().owned(x) ? esc(P6(HX.bought)) : A.fmt(ES().full(x))}</b></li>`).join("")}</ul>
        <p class="bq-dd">${esc(lp.left.length ? P6(T.loteUntil > 1 ? HX.loteD : HX.loteLast).replace("{n}", T.loteUntil) : P6(HX.loteDone))}</p><div class="bq-acts">${act}</div>`;
    }
    const own = ES().owned(k), p = ES().price(k);
    const act = own ? `<button type="button" class="gx-btn wide" disabled><span>${esc(P6(HX.bought))}</span></button>`
      : have < p ? `<button type="button" class="gx-btn wide bq-short" id="bqHBuy" aria-disabled="true"><span>${esc(P6(TX.short).replace("{n}", A.fmt(p - have)))}</span>${fi("sm")}</button>`
      : `<button type="button" class="gx-btn pri wide${ST.armed === k ? " armed" : ""}" id="bqHBuy"><span>${esc(ST.armed === k ? P6(TX.sure) : P6(TX.buy))}</span><span class="bq-bp">${p < ES().full(k) ? `<s>${A.fmt(ES().full(k))}</s>` : ""}${fi("sm")}${A.fmt(p)}</span></button>`;
    return `<span class="bq-dth bq-cprev bq-hprev">${hThumb(k, true)}</span>
      <span class="gx-eyb bq-tier">${esc(P6(HX.k[ES().kindOf(k)]))}${T.ganga === k && !own ? " · " + esc(P6(HX.ganga).replace("{p}", Math.round(ES().GANGA * 100))) : ""}</span>
      <h3 class="gx-t-m bq-dn">${esc(ES().name(k))}</h3><p class="bq-dd">${esc(P6(HX.todayD))}</p>
      <div class="bq-acts">${act}<button type="button" class="gx-btn gho wide" id="bqHGo"><span>${esc(P6(HX.goSec))}</span></button></div>`;
  }
  /* pintar las miniaturas: punteros, iconos y marcos (como en sus secciones) y las prendas (el retrato vestido, a escala entera) */
  function hPaint() {
    cPaint();
    const dp = window.devicePixelRatio || 1;
    document.querySelectorAll("#dlg canvas[data-hp]").forEach(cv => { const r = cv.getBoundingClientRect(), W = Math.max(16, Math.round(r.width * dp)), H = Math.max(12, Math.round(r.height * dp)); cv.width = W; cv.height = H; const [s, id] = cv.dataset.hp.split(":"); try { PU().thumb(cv, s, id, 0); } catch (e) { /* sin miniatura */ } });
    document.querySelectorAll("#dlg img[data-hv]").forEach(im => {
      if (!V()) return; im.src = V().thumb(V().with(im.dataset.hv), 1);
      const fit = () => { const box = im.parentElement, z = box.currentCSSZoom || 1, d = z * dp, rb = box.getBoundingClientRect(), k = Math.max(1, Math.floor(Math.min((rb.width / z) * d / im.naturalWidth, (rb.height / z) * d / im.naturalHeight) + 0.01)); im.style.width = (im.naturalWidth * k) / d + "px"; im.style.height = (im.naturalHeight * k) / d + "px"; };
      if (im.complete && im.naturalWidth) fit(); else im.onload = fit;
    });
  }
  function hTick() { clearInterval(ST.htick); ST.htick = setInterval(() => { const c = document.querySelector("#dlg .bq-clock"); if (!c) { clearInterval(ST.htick); return; } const T = ES().today(); c.textContent = P6(HX.change).replace("{t}", hms(T.until)); if (T.until < 1500) setTimeout(() => repaint(), 1600); }, 1000); }
  /* comprar del escaparate: dos pulsaciones, como en todas las secciones */
  function hBuy() {
    if (ST.busy) return; const k = ST.hsel; if (!k || k === "regalo") return;
    const have = A.club ? A.club.fichas() : 0, isLote = k === "lote", p = isLote ? ES().lotePrice().price : ES().price(k);
    if (have < p) { if (A.sfx && A.sfx.buzz) A.sfx.buzz(0); const b = $("bqHBuy"); if (b) { b.classList.remove("bq-no"); void b.offsetWidth; b.classList.add("bq-no"); } return; }
    if (ST.armed !== k) { ST.armed = k; ST.armT = Date.now(); if (A.sfx && A.sfx.ui) A.sfx.ui(); repaint("#bqHBuy"); setTimeout(() => { if (ST.armed === k && Date.now() - ST.armT >= 3900) { ST.armed = null; repaint(); } }, 4000); return; }
    ST.armed = null;
    if (!(isLote ? ES().buyLote() : ES().buy(k))) return;
    if (!isLote && ES().kindOf(k) === "m") { const id = k.split(":")[1]; M().seen([id]); M().use(id); }
    repaint();
    { const w0 = $("bqWal"); if (w0) w0.textContent = A.fmt(have); }
    if (A.casa && A.casa.premio) A.casa.premio(isLote ? 3 : 2); else if (A.sfx && A.sfx.jackpot) A.sfx.jackpot(isLote ? 3 : 2);
    if (A.sfx && A.sfx.stamp) setTimeout(() => A.sfx.stamp(), 120);
    if (A.haptic) A.haptic(isLote ? [30, 60, 40] : [24]);
    const wl = $("bqWal"), to = A.club.fichas(), n = 10;
    for (let i = 1; i <= n; i++) setTimeout(() => { if (wl && wl.isConnected) wl.textContent = A.fmt(Math.round(have + ((to - have) * i) / n)); if (i % 3 === 0 && A.sfx && A.sfx.coin) A.sfx.coin(); }, 160 + i * 55);
    const det = $("bqDet"); if (det) det.classList.add("bq-sold");
  }
  function hGift() {
    const have = A.club ? A.club.fichas() : 0, n = ES().claim(); if (!n) return;
    repaint();
    if (A.casa && A.casa.premio) A.casa.premio(n >= 40 ? 3 : 2); if (A.haptic) A.haptic([20, 30, 50]);
    const wl = $("bqWal"), to = A.club.fichas(), m = 12;
    for (let i = 1; i <= m; i++) setTimeout(() => { if (wl && wl.isConnected) wl.textContent = A.fmt(Math.round(have + ((to - have) * i) / m)); if (A.sfx && A.sfx.coin) A.sfx.coin(i); }, 120 + i * 60);
  }
  /* ir a la seccion de la pieza, con ella elegida */
  function hGo() {
    const k = ST.hsel; if (!k || k === "lote" || k === "regalo") return; const [w, a, b] = k.split(":");
    if (w === "m") { ST.sel = a; ST.tab = "all"; const L = list(), i = L.findIndex(m => m.id === a); ST.page = i >= 0 ? Math.floor(i / PERM()) : 0; }
    else if (w === "v") { ST.vsel = a; const it = V().get(a); ST.vtab = it.r === "l" ? "l" : it.r === "p" ? "pieza" : it.slot; const L = vOf(ST.vtab), i = L.findIndex(x => x.id === a); ST.vpage = i >= 0 ? Math.floor(i / PERV()) : 0; }
    else if (w === "p") { ST.psel = a + ":" + b; ST.ptab = a; const L = pOf(a), i = L.findIndex(x => x.join(":") === ST.psel); ST.ppage = i >= 0 ? Math.floor(i / PERP()) : 0; }
    else { ST.csel = (w === "k" ? "m" : w) + ":" + a; ST.ctab = w === "i" ? "obj" : w === "t" ? "tit" : "marco"; const L = cOf(ST.ctab), i = L.findIndex(x => x.k === ST.csel); ST.cpage = i >= 0 ? Math.floor(i / cPer()) : 0; }
    setCat(keyCat(k));
  }
  /* «Lo quiero»: el corazon, en la ficha de la derecha de cualquier seccion (solo lo que se compra y aun no tienes) */
  function wishKey() {
    if (ST.cat === "hoy") return ST.hsel && !/^(lote|regalo)$/.test(ST.hsel) ? ST.hsel : null;
    if (ST.cat === "mesas") return ST.sel && M().get(ST.sel).shop ? "m:" + ST.sel : null;
    if (ST.cat === "vest") { const it = ST.vsel && V().get(ST.vsel); return it && !it.casa && V().full(it.id) > 0 ? "v:" + it.id : null; }
    if (ST.cat === "punt") { const [s, id] = (ST.psel || "").split(":"); return id && id !== "casa" && PU().full(s, id) > 0 ? "p:" + s + ":" + id : null; }
    if (ST.cat === "carta") { const [w, id] = (ST.csel || "").split(":"); const k = w === "i" ? "i:" + id : w === "t" ? "t:" + id : w === "m" ? "k:" + id : null; return k && ES().full(k) > 0 ? k : null; }
    return null;
  }
  function addHeart() {
    if (!ES()) return; const acts = document.querySelector("#bqDet .bq-acts"), k = wishKey(); if (!acts || !k || ES().owned(k)) return;
    const on = ES().wished(k);
    acts.insertAdjacentHTML("beforeend", `<button type="button" class="gx-btn gho wide bq-heart${on ? " on" : ""}" id="bqWish" aria-pressed="${on}" ${A.ttAttr ? A.ttAttr(P6(HX.want), P6(HX.wantT)) : ""}>${A.icon("heart")}<span>${esc(P6(on ? HX.wanted : HX.want))}</span></button>`);
    $("bqWish").onclick = () => { const v = ES().wish(k); if (A.sfx && A.sfx.ui) A.sfx.ui(); const b = $("bqWish"); b.classList.toggle("on", v); b.setAttribute("aria-pressed", v); b.querySelector("span").textContent = P6(v ? HX.wanted : HX.want); };
  }
  const sections = () => (A.escaparate ? [["hoy", "coupon", HX.cHoy]] : []).concat([["mesas", "chip_g", VX.cMesas]], V() ? [["vest", "boss_hat", RX.crup]] : [], A.punteros ? [["punt", "crosshair", PX.cPunt]] : [], A.socio ? [["carta", "m_prof", CX.cCarta]] : []);
  const railHtml = () => `<nav class="bq-rail" id="bqRail" aria-label="${esc(P6(TX.title))}">${sections().map(([k, ic, t]) => { const [n, tot, w] = stat(k);
    return `<button type="button" class="bq-rx${ST.cat === k ? " on" : ""}" data-cat="${k}" aria-pressed="${ST.cat === k}"><span class="bq-rxi">${A.icon(ic)}</span><b>${esc(P6(t))}</b><em>${n} / ${tot}</em><i>${esc(k === "hoy" ? w : P6(RX.worn).replace("{x}", w))}</i></button>`; }).join("")}<span class="bq-rsp" data-dealer-niche></span>${offerHtml()}</nav>`;
  const catBody = () => ST.cat === "hoy" ? `<div id="bqGrid" class="bq-gw">${hGridHtml()}</div>` : ST.cat === "vest" ? `<div id="bqGrid" class="bq-gw">${vGridHtml()}</div>` : ST.cat === "punt" ? `<div id="bqGrid" class="bq-gw">${pGridHtml()}</div>` : ST.cat === "carta" ? `<div id="bqGrid" class="bq-gw">${cGridHtml()}</div>` : `<div id="bqGrid" class="bq-gw">${gridHtml()}</div>`;
  const catCls = () => (ST.cat === "hoy" ? " hoy" : ST.cat === "vest" ? " vest" : ST.cat === "punt" ? " punt" : ST.cat === "carta" ? " carta" : "");
  const detBody = () => (ST.cat === "hoy" ? hDetHtml() : ST.cat === "vest" ? vDetHtml() : ST.cat === "punt" ? pDetHtml() : ST.cat === "carta" ? cDetHtml() : detHtml());
  function html() {
    const have = A.club ? A.club.fichas() : 0, lv = A.club ? P6(A.club.tx.lv).replace("{n}", A.club.level()) : "";
    return `<div class="gx-veil bq-veil"></div><section class="bq-screen gx-stage" aria-labelledby="bqH" data-nosq>
      <div class="gx-grid bq-grid">
        <header class="bq-head"><button type="button" class="gx-btn sm" id="hubBack">${A.icon("u_back")}<span>${A.t("set.close")}</span>${A.gala.keyHint("Esc", "b")}</button>
          <h2 class="gx-t-l bq-h" id="bqH"><span class="bq-hic">${A.icon("purse")}</span><span><span class="gx-eyb">${esc(A.club ? P6(A.club.tx.club) : "")}${lv ? " · " + esc(lv) : ""}</span>${esc(P6(TX.title))}</span></h2>
          <span class="bq-wal" aria-label="${esc(A.club ? P6(A.club.tx.fichas) : "")}">${fi()}<b id="bqWal">${A.fmt(have)}</b></span>${A.hub.tools()}</header>
        <div class="bq-railw">${railHtml()}</div>
        <div class="gx-sh bq-left"><div class="gx-paper bq-cat${catCls()}" id="bqCat">${catBody()}</div></div>
        <div class="gx-sh bq-right"><div class="gx-paper bq-det${catCls()}" id="bqDet">${detBody()}</div></div>
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
    const L = vList(), per = PERV(), pages = Math.max(1, Math.ceil(L.length / per)); ST.vpage = Math.min(ST.vpage, pages - 1);
    const items = L.slice(ST.vpage * per, ST.vpage * per + per);
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
    if (ST.spr) { if (SV.face) ST.spr.set(SV.face, { quiet: true }); if (SV.talking) ST.spr.talk(true); }   // bloque D: el probador se rehace al elegir; si hablaba, sigue
    if (SV.halo) { const pb = document.querySelector("#dlg .bq-prob"); if (pb) pb.classList.add("halo"); }
  }
  const vPaint = () => { fitThumbs(); mountProb(); };

  /* ---------------------------------------------------------------- bloque D: EL CRUPIER ES EL MANIQUI DEL PROBADOR
     Se cambia delante de ti y comenta lo que te pruebas, lo que compras y lo que te quitas (sus frases shop*, js/dealer.js); al comprar, el
     desfile (js/trastadas.js) con su halo detras. Habla con su propia boca en su propio globo, encima del panel del probador (en la cabecera:
     sin tapar la rejilla, el probador ni los textos): nunca dos crupieres en pantalla. Una frase cada pocos segundos como mucho */
  const WARM = ["rojo", "granate", "rosa", "cobre"], COLD = ["verde", "esmeralda", "turquesa", "azul"], DARKC = ["negro", "granate", "esmeralda"];
  const SV = { at: 0, busy: false, pend: null, face: null, talking: false, halo: false, tries: [], nTry: 0, bought: false, said: {}, visits: 0, vest: false, last: 0, el: null, t1: 0, t2: 0, browse: 0 };
  const DL = () => A.dealer;
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  function sayEl() {
    if (SV.el && SV.el.isConnected) return SV.el;
    const b = document.createElement("div"); b.className = "bq-say"; b.setAttribute("role", "status"); b.innerHTML = `<p><span class="v"></span><span class="r"></span></p>`;
    document.body.appendChild(b); return (SV.el = b);
  }
  /* el globo, en el hueco de la cabecera entre el titulo y el monedero, pegado encima del panel del probador y con la cola hacia el */
  function sayPlace(b) {
    const det = $("bqDet"), prob = $("bqProb"), h = document.querySelector("#dlg .bq-h"), wal = document.querySelector("#dlg .bq-wal"); if (!det || !prob) return false;
    const D0 = det.getBoundingClientRect(), Pr = prob.getBoundingClientRect(), Wl = wal ? wal.getBoundingClientRect() : null;
    let ink = 0; if (h) { const rg = document.createRange(), tw = document.createTreeWalker(h, NodeFilter.SHOW_TEXT); for (let n; (n = tw.nextNode());) if (n.nodeValue.trim()) { rg.selectNodeContents(n); ink = Math.max(ink, rg.getBoundingClientRect().right); } }   // donde acaba la tinta del titulo (la caja ocupa toda la cabecera)
    const right = Math.round(Math.min(Pr.left + Pr.width * 0.6, Wl ? Wl.left - 12 : innerWidth - 16)), left = Math.round(ink ? ink + 18 : D0.left - 320);
    const w = Math.max(170, Math.min(440, right - left));
    b.style.maxWidth = w + "px"; b.style.left = "0px"; b.style.top = "0px";
    const bw = Math.min(w, b.offsetWidth), bh = b.offsetHeight;
    b.style.left = right - bw + "px"; b.style.top = Math.max(6, Math.round(D0.top - 16 - bh)) + "px";
    return true;
  }
  function sayHide() {
    const b = SV.el; if (b) b.classList.remove("on");
    clearTimeout(SV.t1); clearTimeout(SV.t2); SV.busy = false; SV.talking = false; if (ST.spr) ST.spr.talk(false);
    if (SV.face && ST.spr) ST.spr.set("sly", { quiet: true }); SV.face = null;
    if (SV.pend) { const p = SV.pend; SV.pend = null; setTimeout(() => vSay(p[0], p[1]), 250); }
  }
  /* dice una de sus frases (una o varias claves: una al azar de las que existan) con su cara y su gesto en el maniquí */
  function vSay(keys, o = {}) {
    const D = DL(); if (!D || !D.pick || ST.cat !== "vest" || !$("bqProb")) return false;
    const ks = (Array.isArray(keys) ? keys : [keys]).filter(k => k && D.has(k)); if (!ks.length) return false;
    if (SV.busy || Date.now() - SV.at < 3200) { if (o.prio) SV.pend = [ks, o]; return false; }
    const t = D.pick(rnd(ks), o.data); if (!t) return false;
    SV.busy = true; SV.at = Date.now(); SV.face = o.face || null;
    if (ST.spr) { if (o.face) ST.spr.set(o.face, { quiet: !!o.gest }); if (o.gest) ST.spr.play(o.gest); }
    const b = sayEl(), vis = b.querySelector(".v"), rest = b.querySelector(".r"), chars = [...t];
    vis.textContent = ""; rest.textContent = t + "​"; if (!sayPlace(b)) { SV.busy = false; return false; }
    void b.offsetWidth; b.classList.add("on"); SV.talking = true; if (ST.spr) ST.spr.talk(true);
    let i = 0;
    const step = () => {
      if (!b.isConnected || ST.cat !== "vest" || !$("bqProb")) return sayHide();
      if (i >= chars.length) { SV.talking = false; if (ST.spr) ST.spr.talk(false); SV.t2 = setTimeout(sayHide, 1700 + t.length * 26); return; }
      vis.textContent += chars[i]; rest.textContent = chars.slice(i + 1).join("") + "​";
      if (/\S/.test(chars[i])) { if (ST.spr) ST.spr.syl(); if (i % 2 === 0 && A.sfx && A.sfx.voice) A.sfx.voice("sly", i); }
      i++; SV.t1 = setTimeout(step, 34 + (/[.,!?…。，！？、]/.test(chars[i - 1]) ? 140 : 0));
    };
    step(); return true;
  }
  /* el desfile (trastada, js/trastadas.js): el pase de modelo con su halo detras y su frase de compra */
  function desfile(ctx) {
    if (!ST.spr || ST.cat !== "vest") return false;
    ST.spr.play("e_desfile"); SV.halo = true; const pb = document.querySelector("#dlg .bq-prob"); if (pb) pb.classList.add("halo");
    setTimeout(() => { SV.halo = false; const p2 = document.querySelector("#dlg .bq-prob"); if (p2) p2.classList.remove("halo"); }, 3200);
    if (ctx && ctx.key) setTimeout(() => vSay(ctx.key, { prio: true, face: "orgulloso" }), 500);
    return true;
  }
  const reg = () => { if (A.trastadas && A.trastadas.registra && !SV.reg) { A.trastadas.registra("desfile", desfile); SV.reg = 1; } };
  /* abres el vestuario: te recibe (la primera vez de la sesion siempre; luego, a veces) y, si te quedas mirando sin probar nada, te lo dice */
  function vOpen() {
    reg(); SV.vest = true; SV.visits++; SV.nTry = 0; SV.tries = []; SV.bought = false; SV.said = {}; SV.last = Date.now();
    clearTimeout(SV.browse); SV.browse = setTimeout(function br() { if (ST.cat !== "vest" || !$("bqProb")) return; if (Date.now() - SV.last >= 44000) { if (!SV.said.browse && vSay("shopBrowse", { face: "bored", gest: "e_reloj" })) SV.said.browse = 1; } else SV.browse = setTimeout(br, 5000); }, 45000);
    if (SV.visits > 1 && Math.random() < 0.5) { if (ST.spr) setTimeout(() => ST.spr && ST.spr.play("r_tienda"), 400); return; }
    const gold = V().worn().chistera === "dorada";
    setTimeout(() => vSay(gold && Math.random() < 0.6 ? "shopWearGoldHat" : "shopOpen", { gest: "r_tienda", face: "sly" }), 450);
  }
  /* te pruebas algo (lo eliges en la rejilla: el maniquí se lo pone; si ya era tuyo, te lo pones de verdad) */
  function vTried(id, put) {
    const it = V().get(id); if (!it) return; const now = Date.now(); SV.last = now; SV.nTry++;
    SV.tries = SV.tries.filter(t => now - t < 12000); SV.tries.push(now);
    if (ST.spr) ST.spr.play("r_prueba_ropa");
    const o = { face: rnd(["smug", "sly", "laugh", "tramando", "admirado"]) };
    if (SV.nTry === 6 && !SV.bought && !SV.said.noBuy && vSay("shopTryNoBuy", { face: "bored" })) { SV.said.noBuy = 1; return; }
    if (SV.tries.length >= 3 && !SV.said.many && vSay("shopTryMany", { face: "laugh" })) { SV.said.many = 1; return; }
    if (put) {                                                                     // te lo pones: lo que hace con lo demas
      const w = V().worn(), P = A.profile.get();
      if (w.traje === "oro" && !w.antifaz && w.pajarita === "oro" && vSay("shopAllGold", { face: "admirado" })) return;
      if (w.traje === "negro" && w.antifaz === "negro" && w.pajarita === "negro" && vSay("shopAllBlack", { face: "tramando" })) return;
      if (!w.traje && !w.antifaz && !w.pajarita && it.casa && vSay("shopHouse", { face: "aliviado" })) return;
      const tr = w.traje || "morado", pj = w.pajarita || "rojo", an = w.antifaz || "oro";
      const clash = (WARM.includes(tr) && COLD.includes(pj)) || (COLD.includes(tr) && WARM.includes(pj)) || (w.traje && w.antifaz && w.pajarita && new Set([tr, pj, an]).size === 3);
      const mix = [w.traje, w.antifaz, w.pajarita].filter(Boolean).length >= 2 && new Set([tr, pj, an]).size >= 2;
      if (mix && P.vest && !P.vest.mixSaid && vSay("shopFirstMix", { face: "smug" })) { P.vest.mixSaid = 1; A.profile.save(); return; }
      if (clash && Math.random() < 0.5 && vSay("shopClash", { face: "puzzled" })) return;
    }
    let keys;
    if (id === "chistera_dorada") keys = V().owned(id) ? ["shopTry_chistera_dorada"] : ["shopTry_chistera_dorada", "shopTryGoldHat"];
    else {
      const own = { antifaz_esmeralda: "shopTry_antifaz_verde", pajarita_azul: "shopTry_pajarita_turquesa" }[id] || "shopTry_" + id;
      if (DL() && DL().has(own)) keys = [own];
      else if (it.slot === "traje") keys = [...(WARM.includes(it.v) ? ["shopTryWarm"] : []), ...(COLD.includes(it.v) ? ["shopTryCold"] : []), ...(DARKC.includes(it.v) ? ["shopTryDark"] : [])];
      else if (it.slot === "antifaz") keys = ["shopTryMask"];
      else if (it.slot === "pajarita") keys = ["shopTryBow"];
      if (!keys || !keys.length) keys = ["shopTry"];
    }
    vSay(keys, o);
  }
  function vTookOff() {
    SV.last = Date.now(); const w = V().worn();
    if (!Object.values(w).some(Boolean) && vSay("shopHouse", { face: "aliviado" })) return;
    vSay(Math.random() < 0.5 ? "shopTakeOff" : "shopStore", { face: rnd(["sad", "innocent", "sly"]) });
  }
  function vBought(id) {
    SV.bought = true; SV.last = Date.now(); reg();
    const key = id === "chistera_dorada" ? "shopBuyGoldHat" : V().count() === 1 ? "shopFirstBuy" : "shopBuy";
    if (!(A.trastadas && A.trastadas.lanza && A.trastadas.lanza("desfile", { id, key }))) {   // el desfile, si toca (una vez cada poco); si no, la reaccion de compra
      if (ST.spr) ST.spr.play("r_compra"); vSay(key, { prio: true, face: "orgulloso" });
    }
  }
  function vBroke(id) {
    const have = A.club ? A.club.fichas() : 0, n = Math.max(1, V().price(id) - have);
    vSay(Math.random() < 0.5 ? "shopNoFundsN" : "shopNoFunds", { data: { n: A.fmt(n) }, face: "innocent", gest: "shrug" });
  }
  /* sales de la tienda sin comprar: te lo dice desde la portada */
  function vLeave() {
    clearTimeout(SV.browse); if (SV.el) { SV.el.remove(); SV.el = null; } clearTimeout(SV.t1); clearTimeout(SV.t2); SV.busy = false; SV.talking = false; SV.pend = null; SV.face = null; SV.halo = false;
    if (SV.vest && !SV.bought && Math.random() < 0.5) setTimeout(() => { const D = DL(); if (D && D.onHome && D.homeSay) { const t = D.pick("shopLeave"); if (t) D.homeSay(t, "sly"); } }, 1100);
    SV.vest = false;
  }

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
    const L = pOf(ST.ptab), per = PERP(), pages = Math.max(1, Math.ceil(L.length / per)); ST.ppage = Math.min(ST.ppage, pages - 1);
    const items = L.slice(ST.ppage * per, ST.ppage * per + per);
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

  /* ---------------------------------------------------------------- «Tu carta» (js/socio.js): el icono del centro y el titulo bajo tu nombre.
     Logros: la ilustracion de cada logro que tengas (las que no, en gris, para que sepas que existen); Objetos: los de la casa (gratis) y los de la
     tienda; Titulos: los que se ganan jugando y los de la tienda. A la derecha, TU carta con la pieza elegida puesta, para verla antes */
  const CX = {
    cCarta: "Tu carta|Your card|Ta carte|Sua carta|Deine Karte|La tua carta||你的会员卡|내 카드|きみのカード|Твоя карта|Twoja karta",
    tLogro: "Logros|Achievements|Succès|Conquistas|Erfolge|Obiettivi||成就|업적|実績|Достижения|Osiągnięcia",
    tObj: "Objetos|Objects|Objets|Objetos|Objekte|Oggetti||物件|오브제|アイテム|Предметы|Przedmioty",
    tTit: "Títulos|Titles|Titres|Títulos|Titel|Titoli||称号|칭호|称号|Титулы|Tytuły",
    tMarco: "Marcos|Frames|Cadres|Molduras|Rahmen|Cornici||边框|프레임|額縁|Рамки|Ramki",
    eMarco: "Marco|Frame|Cadre|Moldura|Rahmen|Cornice||边框|프레임|額縁|Рамка|Ramka",
    dMarco: "La moldura de tu carta y de tu chapa; el material sigue siendo el de tu categoría.|The moulding of your card and your badge; the material is still your rank's.|La moulure de ta carte et de ton badge ; la matière reste celle de ta catégorie.|A moldura da sua carta e do seu emblema; o material continua sendo o da sua categoria.|Die Zierleiste deiner Karte und deines Abzeichens; das Material bleibt das deiner Kategorie.|La cornice della tua carta e del tuo distintivo; il materiale resta quello della tua categoria.||你的会员卡和徽章的边框；材质仍随你的等级。|카드와 배지의 테두리예요. 재질은 지금 등급 그대로예요.|カードとバッジの額縁。素材はいまのランクのまま。|Рамка твоей карты и значка; материал остаётся от твоей категории.|Ozdobna ramka twojej karty i odznaki; materiał zostaje z twojej kategorii.",
    eIcon: "Icono|Icon|Icône|Ícone|Symbol|Icona||图标|아이콘|アイコン|Значок|Ikona",
    eTit: "Título|Title|Titre|Título|Titel|Titolo||称号|칭호|称号|Титул|Tytuł",
    kLogro: "De un logro|From an achievement|D'un succès|De uma conquista|Aus einem Erfolg|Da un obiettivo||来自成就|업적 보상|実績のごほうび|За достижение|Z osiągnięcia",
    kTienda: "De la tienda|From the boutique|De la boutique|Da boutique|Aus der Boutique|Dalla boutique||来自精品店|부티크|ブティック|Из бутика|Z butiku",
    kCat: "De tu categoría|From your rank|De ta catégorie|Da sua categoria|Von deinem Rang|Dalla tua categoria||来自你的身份|등급 보상|格のごほうび|За ступень|Z twojej rangi",
    kHito: "Se gana jugando|Earned by playing|S'obtient en jouant|Conquistado jogando|Wird erspielt|Si ottiene giocando||通过游戏获得|플레이로 획득|プレイで手に入る|Даётся за игру|Zdobywasz grając",
    dIcon: "El dibujo del centro de tu carta de socio.|The picture in the middle of your member card.|Le dessin au centre de ta carte de membre.|O desenho no centro da sua carta de sócio.|Das Bild in der Mitte deiner Mitgliedskarte.|Il disegno al centro della tua tessera socio.||你会员卡中央的图案。|회원 카드 가운데 그림이에요.|会員カードの真ん中の絵。|Рисунок в центре твоей клубной карты.|Rysunek na środku twojej karty członkowskiej.",
    dObj: "Un objeto de la casa para el centro de tu carta.|A house object for the middle of your card.|Un objet de la maison pour le centre de ta carte.|Um objeto da casa para o centro da sua carta.|Ein Objekt des Hauses für die Mitte deiner Karte.|Un oggetto della casa per il centro della tua carta.||本店的一件物品，放在你会员卡的中央。|카드 가운데에 놓을 하우스의 오브제예요.|カードの真ん中に飾るハウスのアイテム。|Предмет заведения для центра твоей карты.|Przedmiot kasyna na środek twojej karty.",
    dTit: "Va en una placa de cuero bajo tu nombre.|It goes on a leather plate under your name.|Il se place sur une plaque de cuir sous ton nom.|Fica numa placa de couro sob o seu nome.|Steht auf einem Lederschild unter deinem Namen.|Va su una targhetta di cuoio sotto il tuo nome.||刻在你名字下方的皮质铭牌上。|이름 아래 가죽 명판에 들어가요.|名前の下の革のプレートに入る。|Пишется на кожаной табличке под твоим именем.|Trafia na skórzaną tabliczkę pod twoim imieniem.",
    tCarta: "Cartas|Cards|Cartes|Cartas|Karten|Carte||卡牌|카드|カード|Карты|Karty",
    tFondo: "Fondos|Backgrounds|Fonds|Fundos|Hintergründe|Sfondi||底纹|배경|背景|Фоны|Tła",
    tMat: "Bordes|Borders|Bordures|Bordas|Ränder|Bordi||边框材质|테두리|縁取り|Окантовки|Obramowania",
    eCarta: "Carta|Card|Carte|Carta|Karte|Carta||卡牌|카드|カード|Карта|Karta",
    eFondo: "Fondo de la chapa|Badge background|Fond du badge|Fundo do emblema|Abzeichen-Hintergrund|Sfondo della spilla||徽章底纹|배지 배경|バッジの背景|Фон значка|Tło odznaki",
    eMat: "Borde|Border|Bordure|Borda|Rand|Bordo||边框材质|테두리|縁取り|Окантовка|Obramowanie",
    kNivel: "Del camino del socio|From the member's path|Du parcours du membre|Do caminho do sócio|Vom Weg des Mitglieds|Dal cammino del socio||来自会员之路|회원의 길 보상|会員の道のごほうび|С пути члена клуба|Ze ścieżki członka",
    dCarta: "Tu carta de socio: la llevas en la portada, en el Perfil y en la Clasificación. Sale una nueva con cada nivel.|Your member card: you show it on the main screen, in your Profile and on the Leaderboard. You get a new one every level.|Ta carte de membre : elle s'affiche sur l'écran d'accueil, dans ton Profil et au Classement. Une nouvelle à chaque niveau.|Sua carta de sócio: aparece na tela inicial, no Perfil e na Classificação. Ganha uma nova a cada nível.|Deine Mitgliedskarte: Du zeigst sie auf dem Startbildschirm, im Profil und in der Rangliste. Jede Stufe bringt eine neue.|La tua carta socio: la mostri nella schermata iniziale, nel Profilo e in Classifica. Ne arriva una nuova a ogni livello.||你的会员卡：显示在主界面、个人资料和排行榜上。每升一级都会得到一张新卡。|회원 카드예요. 메인 화면, 프로필, 순위표에 보여요. 레벨마다 새 카드가 나와요.|きみの会員カード。メイン画面、プロフィール、ランキングに出る。レベルが上がるたびに新しい一枚。|Твоя клубная карта: её видно на главном экране, в профиле и в таблице лидеров. Новая — с каждым уровнем.|Twoja karta członkowska: widać ją na ekranie głównym, w profilu i w rankingu. Nowa z każdym poziomem.",
    dFondo: "El fondo de tu chapa, detrás del icono. Cada carta que consigues trae el suyo.|The background of your badge, behind the icon. Every card you earn brings its own.|Le fond de ton badge, derrière l'icône. Chaque carte obtenue apporte le sien.|O fundo do seu emblema, atrás do ícone. Cada carta que você ganha traz o dela.|Der Hintergrund deines Abzeichens hinter dem Symbol. Jede Karte, die du bekommst, bringt ihren mit.|Lo sfondo della tua spilla, dietro l'icona. Ogni carta che ottieni porta il suo.||徽章图标后面的底纹。每得到一张卡就会多一种。|배지 아이콘 뒤의 배경이에요. 카드를 얻을 때마다 하나씩 생겨요.|バッジのアイコンの後ろの背景。カードを手に入れるたびにひとつ増える。|Фон значка за иконкой. Каждая новая карта приносит свой.|Tło odznaki za ikoną. Każda zdobyta karta przynosi swoje.",
    dMat: "El material del borde de tu carta y de tu chapa. Se gana uno al empezar cada serie de diez niveles.|The material of your card's and badge's border. You earn one when each series of ten levels begins.|La matière de la bordure de ta carte et de ton badge. Tu en gagnes une au début de chaque série de dix niveaux.|O material da borda da sua carta e do seu emblema. Você ganha um no começo de cada série de dez níveis.|Das Material des Rands deiner Karte und deines Abzeichens. Zu Beginn jeder Zehnerserie bekommst du eines.|Il materiale del bordo della tua carta e della tua spilla. Ne ottieni uno all'inizio di ogni serie di dieci livelli.||卡牌和徽章边框的材质。每开启一个十级系列就得到一种。|카드와 배지 테두리의 재질이에요. 10레벨 시리즈가 시작될 때마다 하나씩 얻어요.|カードとバッジの縁の素材。10レベルのシリーズが始まるたびにひとつ手に入る。|Материал окантовки карты и значка. Новый — в начале каждой серии из десяти уровней.|Materiał obramowania karty i odznaki. Nowy na początku każdej serii dziesięciu poziomów.",
    surprise: "Sorpresa|Surprise|Surprise|Surpresa|Überraschung|Sorpresa||惊喜|서프라이즈|お楽しみ|Сюрприз|Niespodzianka",
    locked: "Aún no es tuyo|Not yours yet|Pas encore à toi|Ainda não é seu|Noch nicht deins|Non è ancora tuo||尚未获得|아직 없어요|まだ持っていない|Пока не твоё|Jeszcze nie twoje",
  };
  const SO = () => A.socio;
  /* la lista de una pestana: [clave, ...]; clave = "i:<icono>" o "t:<titulo>" */
  /* v2: c = carta, f = fondo de chapa, b = material del borde (js/socio.js); las cartas que aun no tienes van boca abajo (sorpresa) */
  const lvTag = L => P6(A.club.tx.lvS).replace("{n}", L);
  const cCards = pre => SO().cartas().map(x => ({ k: pre + ":" + x.L, id: x.L, kind: "nivel", owned: x.owned, price: 0, name: x.owned ? x.name : P6(CX.surprise), how: P6(SO().tx.lockedCard).replace("{n}", x.L) }));
  const cMats = () => SO().mats().map(x => ({ k: "b:" + x.id, id: x.id, kind: "nivel", owned: x.owned, price: 0, name: x.name, how: P6(SO().tx.byLv).replace("{n}", x.lv) }));
  const cOf = t => t === "carta" ? cCards("c") : t === "fondo" ? cCards("f") : t === "mat" ? cMats() : t === "marco" ? SO().marcos().map(x => ({ k: "m:" + x.id, ...x })) : t === "tit" ? SO().titles().map(x => ({ k: "t:" + x.id, ...x })) : t === "obj" ? SO().icons("casa").concat(SO().icons("cat"), SO().icons("tienda")).map(x => ({ k: "i:" + x.id, ...x })) : SO().icons("logro").map(x => ({ k: "i:" + x.id, ...x }));
  const cFind = k => { const [w, id] = k.split(":"); if (w === "c" || w === "f") return cCards(w).find(x => x.id === +id) || null; if (w === "b") return cMats().find(x => x.id === +id) || null; const L = w === "m" ? SO().marcos() : w === "t" ? SO().titles() : SO().icons(); return L.find(x => x.id === id) || null; };
  const cState = k => { const [w, id] = k.split(":"), x = cFind(k); if (!x) return ""; return (w === "c" ? SO().carta() === +id : w === "f" ? SO().fondo() === +id : w === "b" ? SO().mat() === +id : w === "m" ? SO().marco() === id : w === "t" ? SO().title() === id : SO().icon() === id) ? "on" : x.owned ? "got" : ""; };
  function cItem(x) {
    const st = cState(x.k), w = x.k[0], tag = st === "on" ? `<em class="bq-own on">${esc(P6(VX.on))}</em>` : x.kind === "casa" ? `<em class="bq-own">${esc(P6(VX.casa))}</em>` : st ? `<em class="bq-own">${esc(P6(VX.mine))}</em>`
      : x.price ? `<span class="bq-pr">${fi()}<b>${A.fmt(x.price)}</b></span>` : `<em class="bq-own lk" aria-label="${esc(P6(CX.locked))}">${A.icon("lock")}</em>`;
    const th = w === "c" ? `<span class="bq-th bq-cth bq-ccard${x.owned ? "" : " lk"}"><canvas data-cc="${x.id}"${x.owned ? "" : " data-back=\"1\""}></canvas>${vivaTag(x)}</span>`
      : w === "f" ? `<span class="bq-th bq-cth bq-cfondo${x.owned ? "" : " lk"}"><canvas data-cf="${x.id}"${x.owned ? "" : " data-back=\"1\""}></canvas></span>`
      : w === "b" ? `<span class="bq-th bq-cth bq-cmk"><span class="bq-cbadge${x.owned ? "" : " lk"}" data-cb="${x.id}"></span></span>`
      : w === "t" ? `<span class="bq-th bq-cth bq-ttl${x.owned || x.kind === "tienda" ? "" : " off"}"><span class="bq-tplate"><span>${esc(x.name)}</span></span></span>`
      : w === "m" ? `<span class="bq-th bq-cth bq-cmk"><span class="bq-cbadge${x.owned || x.kind === "tienda" ? "" : " lk"}" data-cm="${esc(x.id)}"></span></span>`
      : `<span class="bq-th bq-cth"><canvas width="96" height="72" data-ci="${esc(x.id)}"${x.owned || (x.kind !== "logro" && x.kind !== "cat") ? "" : ` data-lk="${x.secret ? 2 : 1}"`}></canvas></span>`;
    const nm = w === "c" || w === "f" ? esc(lvTag(x.id)) : w === "t" ? esc(P6(x.kind === "tienda" ? CX.kTienda : CX.kHito)) : esc(x.name);
    return `<button type="button" class="bq-it bq-cit${x.k === ST.csel ? " sel" : ""}${st ? " " + st : ""}${w === "t" ? " bq-ttl" : ""}" data-ck="${esc(x.k)}" aria-pressed="${x.k === ST.csel}" aria-label="${esc(x.name)}">
      ${th}<span class="bq-prow"><b class="bq-nm">${nm}</b>${tag}</span></button>`;
  }
  const vivaTag = x => (x.owned && SO().vivaOf(x.id) ? `<em class="bq-viva">★</em>` : "");
  const cPer = () => (ST.ctab === "carta" || ST.ctab === "fondo" || ST.ctab === "mat" ? 10 : PERC());   // las cartas y los fondos, de serie en serie (10)
  function cGridHtml() {
    const L = cOf(ST.ctab), per = cPer(), pages = Math.max(1, Math.ceil(L.length / per)); ST.cpage = Math.min(ST.cpage, pages - 1);
    const items = L.slice(ST.cpage * per, ST.cpage * per + per);
    const cnt = k => { if (k === "carta" || k === "fondo") return ""; const l = cOf(k); return k === "obj" ? l.length : `${l.filter(x => x.owned).length}/${l.length}`; };
    const tab = (k, tx) => `<button type="button" class="bq-tab bq-ctab${ST.ctab === k ? " on" : ""}" data-ctab="${k}" aria-pressed="${ST.ctab === k}"><span>${esc(P6(tx))}</span><i>${cnt(k)}</i></button>`;
    return `<div class="bq-bar"><nav class="bq-tabs">${tab("carta", CX.tCarta)}${tab("fondo", CX.tFondo)}${tab("mat", CX.tMat)}${tab("logro", CX.tLogro)}${tab("obj", CX.tObj)}${tab("tit", CX.tTit)}${tab("marco", CX.tMarco)}</nav>
      <div class="bq-pager"${pages > 1 ? "" : " hidden"}><button type="button" class="gx-btn sm gho" id="bqCPrev"${ST.cpage ? "" : " disabled"} aria-label="‹">‹</button><span>${ST.cpage + 1} / ${pages}</span><button type="button" class="gx-btn sm gho" id="bqCNext"${ST.cpage < pages - 1 ? "" : " disabled"} aria-label="›">›</button></div></div>
      <div class="bq-items carta${per === 10 ? " ten" : ""}" id="bqItems">${items.map(cItem).join("")}</div>`;
  }
  function cDetHtml() {
    const k = ST.csel, x = cFind(k), w = k[0], st = cState(k), have = A.club ? A.club.fichas() : 0;
    if (!x) return "";
    let act;
    if (st === "on" && w === "t") act = `<button type="button" class="gx-btn gho wide" id="bqCOff"><span>${esc(P6(VX.off))}</span></button>`;
    else if (st === "on") act = `<button type="button" class="gx-btn wide" disabled><span>${esc(P6(VX.on))}</span></button>`;
    else if (st === "got") act = `<button type="button" class="gx-btn pri wide" id="bqCUse"><span>${esc(P6(VX.wear))}</span></button>`;
    else if (!x.price) act = `<button type="button" class="gx-btn wide" disabled>${A.icon("lock")}<span>${esc(P6(CX.locked))}</span></button>`;
    else if (have < x.price) act = `<button type="button" class="gx-btn wide bq-short" id="bqBuy" aria-disabled="true"><span>${esc(P6(TX.short).replace("{n}", A.fmt(x.price - have)))}</span>${fi("sm")}</button>`;
    else act = `<button type="button" class="gx-btn pri wide${ST.armed === k ? " armed" : ""}" id="bqBuy"><span>${esc(ST.armed === k ? P6(TX.sure) : P6(TX.buy))}</span><span class="bq-bp">${fi("sm")}${A.fmt(x.price)}</span></button>`;
    const kind = w === "c" || w === "f" || w === "b" ? CX.kNivel : w === "t" || w === "m" ? (x.kind === "tienda" ? CX.kTienda : x.kind === "casa" ? VX.casaL : CX.kHito) : x.kind === "logro" ? CX.kLogro : x.kind === "casa" ? VX.casaL : x.kind === "cat" ? CX.kCat : CX.kTienda;
    const desc = w === "c" ? CX.dCarta : w === "f" ? CX.dFondo : w === "b" ? CX.dMat : w === "m" ? CX.dMarco : w === "t" ? CX.dTit : x.kind === "logro" ? CX.dIcon : CX.dObj;
    return `<span class="bq-dth bq-cprev"><span id="bqCCard"></span></span>
      <span class="gx-eyb bq-tier">${esc(P6(w === "c" ? CX.eCarta : w === "f" ? CX.eFondo : w === "b" ? CX.eMat : w === "m" ? CX.eMarco : w === "t" ? CX.eTit : CX.eIcon))} · ${esc(P6(kind))}</span>
      <h3 class="gx-t-m bq-dn">${esc((w === "c" || w === "f") && x.owned ? SO().cardNo(x.id) : x.name)}${(w === "c" || w === "f") && x.owned ? `<span class="bq-ed">${esc(SO().matName(SO().sOf(x.id)) + " · " + SO().edName(x.id))}</span>` : ""}</h3>
      <p class="bq-dd">${esc(P6(desc))}${x.how && !x.owned ? `<br><b class="bq-how">${esc(x.how)}</b>` : ""}</p>
      <div class="bq-acts">${act}</div>`;
  }
  /* la carta de la ficha (tu carta con la pieza puesta) y las miniaturas, a escala entera en pixeles reales */
  function cPaint() {
    const host = $("bqCCard"), k = ST.csel;
    if (host && k && /^[fb]:/.test(k)) { const [w, id] = k.split(":"), x = cFind(k), o = { w: 128 }; if (w === "f") o.fondo = x && x.owned ? +id : 0; else o.mat = x && x.owned ? +id : undefined; host._sig = ""; host.innerHTML = ""; SO().badge(host, o); }
    else if (host && k && /^c:/.test(k) && !(cFind(k) || {}).owned) { host._sig = ""; host.innerHTML = `<canvas class="bq-backbig"></canvas>`; const cv = host.firstChild; SO().back(cv); intPaint(cv, 160); }
    else if (host && k) { const [w, id] = k.split(":"), x = cFind(k), o = { w: 160 }; if (w === "c") o.carta = +id; else if (w === "m") o.marco = id; else if (w === "t") o.title = id; else if (!(x && x.secret && !x.owned)) o.icon = id; host._sig = ""; SO().mount(host, o); }
    document.querySelectorAll("#dlg .bq-cbadge[data-cm]").forEach(el => { el._sig = ""; SO().badge(el, { w: 64, marco: el.dataset.cm }); });   // v0.3.174: cada marco, en tu chapa
    document.querySelectorAll("#dlg .bq-cbadge[data-cb]").forEach(el => { el._sig = ""; SO().badge(el, { w: 64, mat: +el.dataset.cb }); });   // v2: cada material, en tu chapa
    document.querySelectorAll("#dlg canvas[data-cc]").forEach(cv => { if (cv.dataset.back) SO().back(cv); else SO().art(cv, +cv.dataset.cc); fitCv(cv); });
    document.querySelectorAll("#dlg canvas[data-cf]").forEach(cv => { if (cv.dataset.back) SO().back(cv); else SO().winArt(cv, +cv.dataset.cf, 32, 32); fitCv(cv); });
    const dp = window.devicePixelRatio || 1;
    document.querySelectorAll("#dlg canvas[data-ci]").forEach(cv => { const r = cv.getBoundingClientRect(), W = Math.max(16, Math.round(r.width * dp)), H = Math.max(12, Math.round(r.height * dp)); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; } SO().thumb(cv, cv.dataset.ci, { locked: !!cv.dataset.lk, secret: cv.dataset.lk === "2", base: ST.ctab === "obj" ? 64 : 48 }); });
  }
  /* v2: un lienzo de pixel art en su hueco, al mayor entero de pixeles reales que quepa y centrado (nunca estirado) */
  function fitCv(cv) {
    const box = cv.parentElement; if (!box) return; const r = box.getBoundingClientRect(), dp = (box.currentCSSZoom || 1) * (window.devicePixelRatio || 1);
    const k = Math.max(1, Math.floor(Math.min((r.width / (box.currentCSSZoom || 1)) * dp / cv.width, (r.height / (box.currentCSSZoom || 1)) * dp / cv.height) + 0.01));
    cv.style.width = (cv.width * k) / dp + "px"; cv.style.height = (cv.height * k) / dp + "px";
  }
  function intPaint(cv, w) { const dp = window.devicePixelRatio || 1, k = Math.max(1, Math.floor((w * dp) / cv.width)); cv.style.width = (cv.width * k) / dp + "px"; cv.style.height = (cv.height * k) / dp + "px"; }
  /* comprar: como los punteros (dos pulsaciones, premio, monedero que baja) y queda puesto */
  function cBuy(k) {
    if (ST.busy || !k) return;
    const [w, id] = k.split(":"), x = cFind(k); if (!x || x.owned || !x.price) return;
    const have = A.club ? A.club.fichas() : 0, p = x.price;
    if (have < p) { if (A.sfx && A.sfx.buzz) A.sfx.buzz(0); const b = $("bqBuy"); if (b) { b.classList.remove("bq-no"); void b.offsetWidth; b.classList.add("bq-no"); } return; }
    if (ST.armed !== k) { ST.armed = k; ST.armT = Date.now(); if (A.sfx && A.sfx.ui) A.sfx.ui(); repaint("#bqBuy"); setTimeout(() => { if (ST.armed === k && Date.now() - ST.armT >= 3900) { ST.armed = null; repaint(); } }, 4000); return; }
    ST.armed = null;
    if (!(w === "m" ? SO().buyMarco(id) : w === "t" ? SO().buyTitle(id) : SO().buyIcon(id))) return;
    repaint();
    { const w0 = $("bqWal"); if (w0) w0.textContent = A.fmt(have); }
    if (A.casa && A.casa.premio) A.casa.premio(2); else if (A.sfx && A.sfx.jackpot) A.sfx.jackpot(2);
    if (A.sfx && A.sfx.stamp) setTimeout(() => A.sfx.stamp(), 120);
    if (A.haptic) A.haptic([24]);
    const wl = $("bqWal"), to = A.club.fichas(), n = 10;
    for (let i = 1; i <= n; i++) setTimeout(() => { if (wl && wl.isConnected) wl.textContent = A.fmt(Math.round(have + ((to - have) * i) / n)); if (i % 3 === 0 && A.sfx && A.sfx.coin) A.sfx.coin(); }, 160 + i * 55);
    const card = document.querySelector(`#dlg .bq-cit[data-ck="${k}"]`), det = $("bqDet");
    if (card) card.classList.add("bq-sold"); if (det) det.classList.add("bq-sold");
  }

  /* pintar solo lo que cambia (la rejilla, la ficha y la oferta), conservando el foco */
  function repaint(focusSel) {
    const g = $("bqGrid"), d = $("bqDet"); if (!g || !d) return;
    const fid = document.activeElement && document.activeElement.id, fdata = document.activeElement && document.activeElement.dataset;
    if (ST.cat === "hoy") { g.innerHTML = hGridHtml(); d.innerHTML = hDetHtml(); hPaint(); }
    else if (ST.cat === "vest") { g.innerHTML = vGridHtml(); d.innerHTML = vDetHtml(); vPaint(); }
    else if (ST.cat === "punt") { g.innerHTML = pGridHtml(); d.innerHTML = pDetHtml(); pStart(); }
    else if (ST.cat === "carta") { g.innerHTML = cGridHtml(); d.innerHTML = cDetHtml(); cPaint(); }
    else { g.innerHTML = gridHtml(); d.innerHTML = detHtml(); }
    const rl = $("bqRail"); if (rl) rl.outerHTML = railHtml();
    const w = $("bqWal"); if (w && A.club) w.textContent = A.fmt(A.club.fichas());
    wireInner();
    let f = null;
    if (focusSel) f = document.querySelector(focusSel);
    else if (fid) f = $(fid);
    else if (fdata && fdata.cat) f = document.querySelector(`#dlg .bq-rx[data-cat="${fdata.cat}"]`);
    else if (fdata && fdata.id) f = document.querySelector(`#dlg .bq-it[data-id="${fdata.id}"]`) || document.querySelector("#dlg .bq-offer");
    else if (fdata && fdata.tab) f = document.querySelector(`#dlg .bq-tab[data-tab="${fdata.tab}"]`);
    else if (fdata && fdata.vid) f = document.querySelector(`#dlg .bq-vit[data-vid="${fdata.vid}"]`);
    else if (fdata && fdata.vtab) f = document.querySelector(`#dlg .bq-vtab[data-vtab="${fdata.vtab}"]`);
    else if (fdata && fdata.pid) f = document.querySelector(`#dlg .bq-pit[data-pid="${fdata.pid}"]`);
    else if (fdata && fdata.ptab) f = document.querySelector(`#dlg .bq-ptab[data-ptab="${fdata.ptab}"]`);
    else if (fdata && fdata.ck) f = document.querySelector(`#dlg .bq-cit[data-ck="${fdata.ck}"]`);
    else if (fdata && fdata.hk) f = document.querySelector(`#dlg .bq-hit[data-hk="${fdata.hk}"], #dlg [data-hk="${fdata.hk}"]`);
    else if (fdata && fdata.ctab) f = document.querySelector(`#dlg .bq-ctab[data-ctab="${fdata.ctab}"]`);
    if (f && !f.disabled) f.focus({ preventScroll: true });
  }
  /* lo que ya es tuyo se pone con un clic: sello «Puesta», el mapa de detras cambia al momento */
  const stampOn = () => { if (A.sfx && A.sfx.stamp) A.sfx.stamp(); if (A.haptic) A.haptic([14]); const d = $("bqDet"); if (d) { d.classList.remove("bq-put"); void d.offsetWidth; d.classList.add("bq-put"); } };
  function pick(id, focus) {
    if (!id || ST.busy) return;
    if (ST.cat !== "mesas") { ST.cat = "mesas"; ST.tab = "all"; const L = list(), i = L.findIndex(m => m.id === id); ST.page = i >= 0 ? Math.floor(i / PERM()) : 0; ST.sel = id; ST.armed = null; setCat("mesas", true); return; }
    const was = ST.sel;
    if (id !== ST.sel) { ST.sel = id; ST.armed = null; if (A.sfx && A.sfx.card) A.sfx.card(); }
    const put = M().owned(id) && id !== M().current() && M().use(id);
    repaint(focus || `#dlg .bq-it[data-id="${id}"]`);
    if (put) stampOn();
  }
  function wireInner() {
    const sc = document.querySelector("#dlg .bq-screen"); if (!sc) return;
    sc.querySelectorAll("[data-hk]").forEach(b => { b.onclick = () => { const k = b.dataset.hk; if (ST.busy) return; if (k !== ST.hsel) { ST.hsel = k; ST.armed = null; if (A.sfx && A.sfx.card) A.sfx.card(); } repaint(`#dlg [data-hk="${k}"]`); }; });
    { const hb = $("bqHBuy"); if (hb) hb.onclick = hBuy; const hg = $("bqGift"); if (hg) hg.onclick = hGift; const hgo = $("bqHGo"); if (hgo) hgo.onclick = hGo; }
    sc.querySelectorAll(".bq-it:not(.bq-vit):not(.bq-pit):not(.bq-cit):not([data-hk]), .bq-offer").forEach(b => { b.onclick = () => pick(b.dataset.id, b.classList.contains("bq-offer") ? "#dlg .bq-offer" : null); });
    sc.querySelectorAll(".bq-rx").forEach(b => { b.onclick = () => setCat(b.dataset.cat); });
    sc.querySelectorAll(".bq-tab:not(.bq-vtab)").forEach(b => { b.onclick = () => { if (ST.tab === b.dataset.tab) return; ST.tab = b.dataset.tab; ST.page = 0; if (A.sfx && A.sfx.card) A.sfx.card(); repaint(`#dlg .bq-tab[data-tab="${ST.tab}"]`); }; });
    const pv = $("bqPrev"), nx = $("bqNext");
    if (pv) pv.onclick = () => { if (ST.page > 0) { ST.page--; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqPrev:not([disabled]), #bqNext"); } };
    if (nx) nx.onclick = () => { ST.page++; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqNext:not([disabled]), #bqPrev"); };
    const tr = $("bqTry"); if (tr) tr.onclick = () => tryOn(ST.sel);
    const us = $("bqUse"); if (us) us.onclick = () => { if (M().use(ST.sel)) { if (A.sfx && A.sfx.stamp) A.sfx.stamp(); if (A.haptic) A.haptic([14]); repaint("#bqTry"); } };
    const bu = $("bqBuy"); if (bu) bu.onclick = () => (ST.cat === "vest" ? vBuy(ST.vsel) : ST.cat === "punt" ? pBuy(ST.psel) : ST.cat === "carta" ? cBuy(ST.csel) : buy(ST.sel));
    sc.querySelectorAll(".bq-pit").forEach(b => { b.onclick = () => { const k = b.dataset.pid; if (ST.busy) return; if (k !== ST.psel) { ST.psel = k; ST.armed = null; if (A.sfx && A.sfx.card) A.sfx.card(); } const [ps, pid] = k.split(":"), put = PU().owned(ps, pid) && PU().current(ps) !== pid && PU().wear(ps, pid); repaint(`#dlg .bq-pit[data-pid="${k}"]`); if (put) stampOn(); }; });
    sc.querySelectorAll(".bq-ptab").forEach(b => { b.onclick = () => { if (ST.ptab === b.dataset.ptab) return; ST.ptab = b.dataset.ptab; ST.ppage = 0; const L = pOf(ST.ptab); if (L.length && !L.some(x => x.join(":") === ST.psel)) ST.psel = L[0].join(":"); if (A.sfx && A.sfx.card) A.sfx.card(); repaint(`#dlg .bq-ptab[data-ptab="${ST.ptab}"]`); }; });
    const pp = $("bqPPrev"), pn = $("bqPNext");
    if (pp) pp.onclick = () => { if (ST.ppage > 0) { ST.ppage--; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqPPrev:not([disabled]), #bqPNext"); } };
    if (pn) pn.onclick = () => { ST.ppage++; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqPNext:not([disabled]), #bqPPrev"); };
    const pu = $("bqPUse"); if (pu) pu.onclick = () => { const [s, id] = ST.psel.split(":"); if (!PU().wear(s, id)) return; if (A.sfx && A.sfx.stamp) A.sfx.stamp(); if (A.haptic) A.haptic([14]); repaint("#bqPTry"); };
    const ptb = $("bqPTry"); if (ptb) ptb.onclick = pTryOn;
    sc.querySelectorAll(".bq-vit").forEach(b => { b.onclick = () => { const id = b.dataset.vid; if (ST.busy) return; if (id !== ST.vsel) { ST.vsel = id; ST.armed = null; if (A.sfx && A.sfx.card) A.sfx.card(); } const put = V().owned(id) && !V().wearing(id) && V().wear(id); repaint(`#dlg .bq-vit[data-vid="${id}"]`); if (put) stampOn(); vTried(id, put); }; });
    sc.querySelectorAll(".bq-vtab").forEach(b => { b.onclick = () => { if (ST.vtab === b.dataset.vtab) return; ST.vtab = b.dataset.vtab; ST.vpage = 0; if (A.sfx && A.sfx.card) A.sfx.card(); repaint(`#dlg .bq-vtab[data-vtab="${ST.vtab}"]`); if (ST.vtab === "mine" && !SV.said.mine && vSay("shopMine", { face: "smug" })) SV.said.mine = 1; }; });
    const vp = $("bqVPrev"), vn = $("bqVNext");
    if (vp) vp.onclick = () => { if (ST.vpage > 0) { ST.vpage--; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqVPrev:not([disabled]), #bqVNext"); } };
    if (vn) vn.onclick = () => { ST.vpage++; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqVNext:not([disabled]), #bqVPrev"); };
    const we = $("bqWear"); if (we) we.onclick = () => { if (!V().wear(ST.vsel)) return; if (A.sfx && A.sfx.stamp) A.sfx.stamp(); if (A.haptic) A.haptic([14]); repaint("#bqOff"); vTried(ST.vsel, true); };
    const ofb = $("bqOff"); if (ofb) ofb.onclick = () => { V().takeOff(ST.vsel); if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqWear"); vTookOff(); };
    /* «Tu carta» */
    sc.querySelectorAll(".bq-cit").forEach(b => { b.onclick = () => { const k = b.dataset.ck; if (ST.busy) return; if (k !== ST.csel) { ST.csel = k; ST.armed = null; if (A.sfx && A.sfx.card) A.sfx.card(); } const [cw, cid] = k.split(":"), cx = cFind(k), put = cx && cx.owned && cState(k) !== "on" && (cw === "c" ? SO().setCarta(+cid) : cw === "f" ? SO().setFondo(+cid) : cw === "b" ? SO().setMat(+cid) : cw === "m" ? SO().setMarco(cid) : cw === "t" ? SO().setTitle(cid) : SO().setIcon(cid)); repaint(`#dlg .bq-cit[data-ck="${k}"]`); if (put) stampOn(); }; });
    sc.querySelectorAll(".bq-ctab").forEach(b => { b.onclick = () => { if (ST.ctab === b.dataset.ctab) return; ST.ctab = b.dataset.ctab; ST.cpage = 0; const L = cOf(ST.ctab); if (L.length && !L.some(x => x.k === ST.csel)) ST.csel = L[0].k; if (A.sfx && A.sfx.card) A.sfx.card(); repaint(`#dlg .bq-ctab[data-ctab="${ST.ctab}"]`); }; });
    const cp = $("bqCPrev"), cn = $("bqCNext");
    if (cp) cp.onclick = () => { if (ST.cpage > 0) { ST.cpage--; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqCPrev:not([disabled]), #bqCNext"); } };
    if (cn) cn.onclick = () => { ST.cpage++; if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqCNext:not([disabled]), #bqCPrev"); };
    const cu = $("bqCUse"); if (cu) cu.onclick = () => { const [w, id] = ST.csel.split(":"); if (!(w === "c" ? SO().setCarta(+id) : w === "f" ? SO().setFondo(+id) : w === "b" ? SO().setMat(+id) : w === "m" ? SO().setMarco(id) : w === "t" ? SO().setTitle(id) : SO().setIcon(id))) return; if (A.sfx && A.sfx.stamp) A.sfx.stamp(); if (A.haptic) A.haptic([14]); repaint(w === "t" ? "#bqCOff" : `#dlg .bq-cit[data-ck="${ST.csel}"]`); };
    const co = $("bqCOff"); if (co) co.onclick = () => { SO().setTitle(""); if (A.sfx && A.sfx.card) A.sfx.card(); repaint("#bqCUse"); };
    addHeart();
  }
  /* cambiar de seccion: solo cambian la izquierda y la derecha (la cabecera se queda); el vestuario espera a tener su atlas listo */
  function setCat(k, force) {
    if ((k === ST.cat && !force) || ST.busy || (k === "vest" && !V()) || (k === "punt" && !PU()) || (k === "carta" && !SO()) || (k === "hoy" && !ES())) return;
    const go = () => {
      if (!$("bqCat")) return;
      if (ST.trying) tryOff(true);
      ST.cat = k; ST.armed = null; if (A.sfx && A.sfx.card) A.sfx.card();
      if (k !== "vest") dropProb();
      const ca = $("bqCat"), d = $("bqDet");
      ca.classList.toggle("vest", k === "vest"); d.classList.toggle("vest", k === "vest"); ca.classList.toggle("punt", k === "punt"); d.classList.toggle("punt", k === "punt"); ca.classList.toggle("carta", k === "carta"); d.classList.toggle("carta", k === "carta"); ca.classList.toggle("hoy", k === "hoy"); d.classList.toggle("hoy", k === "hoy");
      if (k === "carta" && !ST.csel) { const L0 = SO().carta(); ST.ctab = "carta"; ST.csel = "c:" + L0; ST.cpage = Math.floor((L0 - 1) / 10); }
      if (k === "punt" && !ST.psel) ST.psel = (pOf("ret").find(([s, id]) => !PU().owned(s, id)) || ["ret", "casa"]).join(":");
      ca.innerHTML = catBody(); d.innerHTML = detBody();
      const rl = $("bqRail"); if (rl) rl.outerHTML = railHtml();
      wireInner(); if (k === "vest") vPaint(); if (k === "punt") pStart(); if (k === "carta") cPaint(); if (k === "hoy") { hPaint(); hTick(); }
      if (k === "vest") vOpen(); else { clearTimeout(SV.browse); if (SV.busy) sayHide(); }   // bloque D: el maniqui te recibe; fuera del vestuario, calla
      const f = document.querySelector(`#dlg .bq-rx[data-cat="${k}"]`); if (f) f.focus({ preventScroll: true });
    };
    if (k === "vest") { if (!ST.vsel) ST.vsel = (vOf(ST.vtab).find(i => !V().owned(i.id)) || vOf(ST.vtab)[0]).id; V().ready(go); } else go();
  }
  /* comprar ropa: como una mesa (dos pulsaciones, premio, monedero que baja), pero te quedas en la boutique: se la pone al momento y se luce */
  function vBuy(id) {
    if (ST.busy || !id || V().owned(id)) return;
    const have = A.club ? A.club.fichas() : 0, p = V().price(id);
    if (have < p) { if (A.sfx && A.sfx.buzz) A.sfx.buzz(0); const b = $("bqBuy"); if (b) { b.classList.remove("bq-no"); void b.offsetWidth; b.classList.add("bq-no"); } vBroke(id); return; }
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
    setTimeout(() => vBought(id), 260);                                  // bloque D: el desfile (o su reaccion de compra) y su frase
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
    M().seen([id]); M().use(id);                                          // queda puesta ya, sin salir de la tienda: el estreno con cartel es solo de las que se ganan jugando
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
    const shop = M().list;
    const o = M().offer();
    ST.sel = id && shop.some(m => m.id === id) ? id : ST.sel && shop.some(m => m.id === ST.sel) ? ST.sel : o ? o.id : (shop.find(m => m.shop && !M().owned(m.id)) || shop.find(m => !M().owned(m.id)) || shop[0]).id;
    ST.armed = null; ST.busy = false;
    if (id) { ST.tab = "all"; const L = list(), i = L.findIndex(m => m.id === id); ST.page = i >= 0 ? Math.floor(i / PERM()) : 0; }
    if (id || !V()) ST.cat = "mesas";                                   // desde Perfil > Mesas se abre en las mesas
    if (ST.cat === "vest" && !ST.vsel) ST.vsel = vOf(ST.vtab)[0].id;
    if (ST.cat === "punt" && (!PU() || !ST.psel)) { if (!PU()) ST.cat = "mesas"; else ST.psel = "ret:casa"; }
    if (ST.cat === "hoy") { if (!ES()) ST.cat = "mesas"; else { const T = ES().today(); if (!ST.hsel || (!T.slots.includes(ST.hsel) && !/^(lote|regalo)$/.test(ST.hsel))) ST.hsel = T.gift ? "regalo" : T.slots[0]; } }
    if (ST.cat === "carta") { if (!SO()) ST.cat = "mesas"; else { const L0 = SO().carta(); ST.ctab = "carta"; ST.csel = "c:" + L0; ST.cpage = Math.floor((L0 - 1) / 10); } }   // v2: se abre en tus cartas, en la serie de la que llevas
    const draw = () => {
      c.dialog(html(), "tablewrap");
      A.hub.wireTools(); $("hubBack").onclick = () => { if (A.sfx && A.sfx.ui) A.sfx.ui(); A.hub.screen("home"); };
      wireInner(); if (ST.cat === "vest") { vPaint(); vOpen(); } if (ST.cat === "punt") pStart(); if (ST.cat === "carta") cPaint(); if (ST.cat === "hoy") { hPaint(); hTick(); }
      setTimeout(() => { const f = ST.cat === "vest" ? document.querySelector(`#dlg .bq-vit[data-vid="${ST.vsel}"]`) : ST.cat === "punt" ? document.querySelector(`#dlg .bq-pit[data-pid="${ST.psel}"]`) : ST.cat === "carta" ? document.querySelector(`#dlg .bq-cit[data-ck="${ST.csel}"]`) : document.querySelector(`#dlg .bq-it[data-id="${ST.sel}"]`) || document.querySelector("#dlg .bq-offer") || $("bqTry"); if (f) f.focus({ preventScroll: true }); }, 80);
    };
    if ((ST.cat === "vest" || ST.cat === "hoy") && V()) V().ready(draw); else draw();
  }
  /* si se sale de la boutique a mitad de una prueba, el mapa vuelve a tu mesa */
  const leave = () => { if (ST.trying) tryOff(true); if (ST.ptry) pTryOff(true); ST.armed = null; vLeave(); dropProb(); };

  A.boutique = { open, leave, tally: () => { let n = 0, t = 0; ["mesas", "vest", "punt", "carta"].forEach(k => { if ((k === "vest" && !V()) || (k === "punt" && !PU()) || (k === "carta" && !SO())) return; const r = stat(k); n += r[0]; t += r[1]; }); return [n, t]; }, want: id => { ST.next = id; }, cat: k => { ST.cat = k; }, get trying() { return ST.trying; } };
})(window.AIQ);
